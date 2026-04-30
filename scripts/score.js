#!/usr/bin/env node
/**
 * Phish Sphere Contest — scoring engine.
 *
 * Reads:
 *   /data/predictions/weekend{N}_{model}.csv
 *
 * Fetches (live, in-memory only — never written to disk):
 *   https://api.phish.net/v5/setlists/showdate/YYYY-MM-DD.json
 *
 * Writes:
 *   /data/scores/scores.json
 *
 * The API key must be supplied via PHISH_NET_API_KEY — loaded from .env.local
 * locally, set as a Vercel environment variable in production.
 *
 * Scoring rules (from context.md):
 *   - 10 pts per correct song in the correct show
 *   - +2 pts for correct Set1/Set2 placement
 *   - +3 pts for correct set opener (Set1/Set2)
 *   - +3 pts for correct set closer (Set1/Set2)
 *   - +5 pts for correct Encore placement
 *   - Final score multiplied by (Confidence / 3)
 */

// Load .env.local when present (local dev). Silent no-op in production where
// the variable comes from Vercel's environment.
try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
} catch (_) {
  /* dotenv not installed; skip */
}

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PRED_DIR = path.join(DATA_DIR, 'predictions');
const SCORES_DIR = path.join(DATA_DIR, 'scores');

const API_KEY = process.env.PHISH_NET_API_KEY;
const API_BASE = 'https://api.phish.net/v5';

// Canonical roster — mirrors lib/shows.js MODELS. Prediction CSVs using a
// model name not in this list will be skipped (with a warning).
const CANONICAL_MODELS = new Set([
  'claude',
  'chatgpt',
  'gemini',
  'perplexity',
  'grok',
  'mistral',
]);

// Weekend 3 bonus rules (from context.md):
//   - Perfect Night: 5–7 correct songs in a single Weekend 3 show = +50 pts
//   - Elite Night:   8+  correct songs in a single Weekend 3 show = +100 pts
//   - Awarded once per model, for that model's single best Weekend 3 show.
//   - Elite replaces Perfect (not stacked). Flat bonus, no confidence multiplier.
const WEEKEND_3_SHOW_NUMBERS = new Set([7, 8, 9]);

// ---------- CSV parsing ----------

function parseCSV(content) {
  if (!content) return [];
  // Some pasted CSVs come in with spaces (or no breaks at all) where newlines
  // should be. Detect row boundaries by finding whitespace that precedes the
  // start of a known row shape:
  //   Predictions: {Weekend},{Show},YYYY-MM-DD,...
  //   Actuals:     {Show},YYYY-MM-DD,...
  const normalized = content.replace(
    /\s+(?=\d+,(?:\d+,)?\d{4}-\d{2}-\d{2})/g,
    '\n'
  );
  const lines = normalized
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] !== undefined ? values[i] : '').trim();
    });
    return obj;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function readCsvFile(filePath) {
  try {
    return parseCSV(fs.readFileSync(filePath, 'utf-8'));
  } catch (_) {
    return [];
  }
}

// ---------- File discovery ----------

function getPredictionFiles() {
  if (!fs.existsSync(PRED_DIR)) return [];
  const all = fs
    .readdirSync(PRED_DIR)
    .filter((f) => /^weekend\d+_.+\.csv$/i.test(f))
    .map((f) => {
      const m = f.match(/^weekend(\d+)_(.+)\.csv$/i);
      return {
        file: f,
        path: path.join(PRED_DIR, f),
        weekend: parseInt(m[1], 10),
        model: m[2],
      };
    });
  const accepted = [];
  for (const pf of all) {
    if (CANONICAL_MODELS.has(pf.model)) {
      accepted.push(pf);
    } else {
      console.warn(
        `  ⚠ Skipping ${pf.file} — model "${pf.model}" is not in the canonical roster ` +
          `(${[...CANONICAL_MODELS].join(', ')})`
      );
    }
  }
  return accepted;
}

// ---------- phish.net API ----------

async function fetchSetlist(dateStr) {
  if (!API_KEY) return { status: 'no_key', data: null };
  const url =
    `${API_BASE}/setlists/showdate/${encodeURIComponent(dateStr)}.json` +
    `?apikey=${encodeURIComponent(API_KEY)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠ phish.net ${res.status} for ${dateStr}`);
      return { status: 'http_error', data: null };
    }
    const json = await res.json();
    if (json.error) {
      console.warn(`  ⚠ phish.net error for ${dateStr}: ${json.error_message || 'unknown'}`);
      return { status: 'api_error', data: null };
    }
    const rows = Array.isArray(json.data) ? json.data : [];
    if (rows.length === 0) return { status: 'no_show', data: null };
    return { status: 'ok', data: rows };
  } catch (e) {
    console.warn(`  ⚠ fetch failed for ${dateStr}: ${e.message}`);
    return { status: 'fetch_error', data: null };
  }
}

// Translate phish.net API row into our canonical set label. The v5 API uses
// "1", "2", "3" for sets and "e"/"encore" for encores. Defensive against case.
function setFromApi(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s === '1') return 'Set1';
  if (s === '2') return 'Set2';
  if (s === '3') return 'Set3';
  if (s === 'e' || s === 'encore' || s === 'e1') return 'Encore';
  if (s === 'e2') return 'Encore'; // second encore still counts as encore for scoring
  return '';
}

function normalizeTitle(s) {
  return (s || '').toLowerCase().trim();
}

// Build an in-memory index from a phish.net setlist response. NEVER persisted.
function buildActualIndex(apiRows) {
  // { [normalizedTitle]: { set } }
  const songs = {};
  // Lookup maps for opener/closer of Set1/Set2.
  const bySet = {};
  const encoreTitles = new Set();

  for (const r of apiRows) {
    const title = normalizeTitle(r.song);
    if (!title) continue;
    const set = setFromApi(r.set);
    const pos = parseInt(r.position, 10);
    songs[title] = { set };
    if (!bySet[set]) bySet[set] = [];
    bySet[set].push({ title, position: Number.isFinite(pos) ? pos : 0 });
    if (set === 'Encore') encoreTitles.add(title);
  }

  const openers = { Set1: null, Set2: null };
  const closers = { Set1: null, Set2: null };
  for (const sp of ['Set1', 'Set2']) {
    const entries = bySet[sp];
    if (!entries || entries.length === 0) continue;
    entries.sort((a, b) => a.position - b.position);
    openers[sp] = entries[0].title;
    closers[sp] = entries[entries.length - 1].title;
  }

  return { songs, openers, closers, encoreTitles };
}

// ---------- Scoring ----------

function scorePrediction(pred, actual) {
  const title = normalizeTitle(pred.Song_Title);
  const confidenceRaw = parseFloat(pred.Confidence);
  const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : 0;
  const multiplier = confidence / 3;

  if (!actual || !actual.songs[title]) {
    return {
      correct: false,
      basePoints: 0,
      points: 0,
      confidence,
      multiplier,
      bonuses: { set: 0, opener: 0, closer: 0, encore: 0 },
    };
  }

  const actualSet = actual.songs[title].set;
  const base = 10;
  const bonuses = { set: 0, opener: 0, closer: 0, encore: 0 };

  const predSet = pred.Set_Placement || '';

  // +2 for correct Set1/Set2 placement
  if ((predSet === 'Set1' || predSet === 'Set2') && predSet === actualSet) {
    bonuses.set = 2;
  }
  // +3 opener / +3 closer (Set1/Set2 only)
  if (predSet === 'Set1' || predSet === 'Set2') {
    if (actual.openers[predSet] === title) bonuses.opener = 3;
    if (actual.closers[predSet] === title) bonuses.closer = 3;
  }
  // +5 for correct Encore placement
  if (predSet === 'Encore' && actual.encoreTitles.has(title)) {
    bonuses.encore = 5;
  }

  const basePoints = base + bonuses.set + bonuses.opener + bonuses.closer + bonuses.encore;
  const points = basePoints * multiplier;
  return { correct: true, basePoints, points, confidence, multiplier, bonuses };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Compute the Weekend 3 Perfect/Elite Night bonus for one model.
// Returns { type, points, showNumber, correct } or null when no bonus applies.
function computeWeekend3Bonus(byShow) {
  let bestShow = null;
  let bestCorrect = 0;
  for (const [showKey, info] of Object.entries(byShow)) {
    const showNum = parseInt(showKey, 10);
    if (!WEEKEND_3_SHOW_NUMBERS.has(showNum)) continue;
    if (info.correct > bestCorrect) {
      bestCorrect = info.correct;
      bestShow = showNum;
    }
  }
  if (bestCorrect >= 8) {
    return { type: 'elite', points: 100, showNumber: bestShow, correct: bestCorrect };
  }
  if (bestCorrect >= 5) {
    return { type: 'perfect', points: 50, showNumber: bestShow, correct: bestCorrect };
  }
  return null;
}

// ---------- Main ----------

async function main() {
  if (!API_KEY) {
    console.warn(
      '  ⚠ PHISH_NET_API_KEY is not set. Scoring will run but all shows will ' +
        'be treated as unscored. For local dev, copy .env.local.example to ' +
        '.env.local and add your key.'
    );
  }

  const predFiles = getPredictionFiles();

  // First pass: read every prediction file into memory, collect unique dates.
  const predRows = []; // { weekend, model, row }
  const dateToShowMeta = new Map(); // date → { showNumber, weekend }
  for (const pf of predFiles) {
    const rows = readCsvFile(pf.path);
    for (const row of rows) {
      const date = row.Show_Date;
      const showNum = parseInt(row.Show_Number, 10);
      if (!date || !Number.isFinite(showNum)) continue;
      if (!dateToShowMeta.has(date)) {
        dateToShowMeta.set(date, { showNumber: showNum, weekend: pf.weekend });
      }
      predRows.push({ weekend: pf.weekend, model: pf.model, row });
    }
  }

  // Second pass: fetch setlists in parallel (small # of shows, API is fine with it).
  const uniqueDates = [...dateToShowMeta.keys()];
  if (uniqueDates.length > 0) {
    console.log(`Fetching ${uniqueDates.length} setlist(s) from phish.net...`);
  }
  const actualByShow = {}; // showNumber → index
  const statusByShow = {}; // showNumber → 'ok' | 'no_key' | 'no_show' | ...
  await Promise.all(
    uniqueDates.map(async (date) => {
      const meta = dateToShowMeta.get(date);
      const { status, data } = await fetchSetlist(date);
      statusByShow[meta.showNumber] = status;
      if (status === 'ok' && data) {
        actualByShow[meta.showNumber] = buildActualIndex(data);
      }
    })
  );

  // Third pass: score every prediction.
  const models = {};
  for (const { weekend, model, row } of predRows) {
    if (!models[model]) {
      models[model] = {
        model,
        totalPoints: 0,
        correctCount: 0,
        totalPredictions: 0,
        byWeekend: {},
        byShow: {},
      };
    }
    const m = models[model];
    const showNum = parseInt(row.Show_Number, 10);
    const actual = actualByShow[showNum];
    const scored = scorePrediction(row, actual);
    const hasActual = !!actual;

    m.totalPredictions++;
    if (scored.correct) m.correctCount++;
    m.totalPoints += scored.points;

    if (!m.byWeekend[weekend]) m.byWeekend[weekend] = { points: 0, correct: 0, total: 0 };
    m.byWeekend[weekend].points += scored.points;
    m.byWeekend[weekend].total++;
    if (scored.correct) m.byWeekend[weekend].correct++;

    if (!m.byShow[showNum]) {
      m.byShow[showNum] = { points: 0, correct: 0, total: 0, predictions: [] };
    }
    m.byShow[showNum].points += scored.points;
    m.byShow[showNum].total++;
    if (scored.correct) m.byShow[showNum].correct++;
    m.byShow[showNum].predictions.push({
      song: row.Song_Title,
      confidence: scored.confidence,
      set: row.Set_Placement || '',
      correct: scored.correct,
      points: round2(scored.points),
      basePoints: scored.basePoints,
      bonuses: scored.bonuses,
      hasActual,
    });
  }

  // Apply Weekend 3 Perfect Night / Elite Night bonus once per model, for the
  // single best Weekend 3 show. Flat bonus, no confidence multiplier.
  const bonusesAwarded = [];
  for (const m of Object.values(models)) {
    const bonus = computeWeekend3Bonus(m.byShow);
    m.weekend3Bonus = bonus;
    if (bonus) {
      m.totalPoints += bonus.points;
      if (!m.byWeekend[3]) m.byWeekend[3] = { points: 0, correct: 0, total: 0 };
      m.byWeekend[3].points += bonus.points;
      bonusesAwarded.push({ model: m.model, ...bonus });
    }
  }

  const leaderboard = Object.values(models)
    .map((m) => ({
      model: m.model,
      totalPoints: round2(m.totalPoints),
      correctCount: m.correctCount,
      totalPredictions: m.totalPredictions,
      correctPercent:
        m.totalPredictions === 0
          ? 0
          : round2((m.correctCount / m.totalPredictions) * 100),
      byWeekend: Object.fromEntries(
        Object.entries(m.byWeekend).map(([k, v]) => [
          k,
          { points: round2(v.points), correct: v.correct, total: v.total },
        ])
      ),
      byShow: Object.fromEntries(
        Object.entries(m.byShow).map(([k, v]) => [
          k,
          {
            points: round2(v.points),
            correct: v.correct,
            total: v.total,
            predictions: v.predictions,
          },
        ])
      ),
      weekend3Bonus: m.weekend3Bonus,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // Per-show metadata — date, phish.net link, scored flag. NO song titles.
  const shows = {};
  for (const [date, meta] of dateToShowMeta.entries()) {
    shows[meta.showNumber] = {
      showNumber: meta.showNumber,
      showDate: date,
      weekend: meta.weekend,
      phishNetUrl: `https://phish.net/setlists/?d=${date}`,
      scored: !!actualByShow[meta.showNumber],
      fetchStatus: statusByShow[meta.showNumber] || (API_KEY ? 'no_show' : 'no_key'),
    };
  }

  const output = {
    generatedAt: new Date().toISOString(),
    leaderboard,
    shows,
    hasData: leaderboard.length > 0,
  };

  if (!fs.existsSync(SCORES_DIR)) fs.mkdirSync(SCORES_DIR, { recursive: true });
  const outPath = path.join(SCORES_DIR, 'scores.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const scoredCount = Object.values(shows).filter((s) => s.scored).length;
  console.log(
    `Scoring complete — ${leaderboard.length} model(s), ${scoredCount}/${uniqueDates.length} show(s) scored.`
  );
  if (bonusesAwarded.length > 0) {
    console.log('Weekend 3 bonuses:');
    for (const b of bonusesAwarded) {
      const tag = b.type === 'elite' ? 'Elite Night (+100)' : 'Perfect Night (+50)';
      console.log(`  • ${b.model} — ${tag} on Show ${b.showNumber} (${b.correct} correct)`);
    }
  }
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error('Scoring failed:', e);
  process.exit(1);
});
