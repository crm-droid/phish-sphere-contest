#!/usr/bin/env node
/**
 * Phish Sphere Contest — scoring engine.
 *
 * Reads:
 *   /data/predictions/weekend{N}_{model}.csv
 *   /data/actuals/show{N}_actual.csv
 *
 * Writes:
 *   /data/scores/scores.json
 *
 * Scoring rules (from context.md):
 *   - 10 pts per correct song in the correct show
 *   - +2 pts for correct Set_Placement (Set1/Set2)
 *   - +3 pts for correct set opener
 *   - +3 pts for correct set closer
 *   - +5 pts for correct encore song
 *   - Score multiplied by (Confidence / 3)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PRED_DIR = path.join(DATA_DIR, 'predictions');
const ACTUAL_DIR = path.join(DATA_DIR, 'actuals');
const SCORES_DIR = path.join(DATA_DIR, 'scores');

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

// ---------- CSV parsing ----------

function parseCSV(content) {
  if (!content) return [];
  // Some pasted CSVs come in with spaces (or no breaks at all) where newlines
  // should be — the whole file ends up on one line. Detect row boundaries by
  // finding whitespace that precedes the start of a known row shape:
  //   Predictions: {Weekend},{Show},YYYY-MM-DD,...
  //   Actuals:     {Show},YYYY-MM-DD,...
  // i.e. whitespace before `\d+,(\d+,)?YYYY-MM-DD`.
  const normalized = content.replace(
    /\s+(?=\d+,(?:\d+,)?\d{4}-\d{2}-\d{2})/g,
    '\n'
  );
  // Handle \r\n, \n, and \r line endings.
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
  // Minimal CSV splitter that respects double-quoted fields.
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
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseCSV(content);
  } catch (e) {
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

function getActualsByShow() {
  const out = {};
  if (!fs.existsSync(ACTUAL_DIR)) return out;
  const files = fs
    .readdirSync(ACTUAL_DIR)
    .filter((f) => /^show\d+_actual\.csv$/i.test(f));
  for (const f of files) {
    const m = f.match(/^show(\d+)_actual\.csv$/i);
    const showNum = parseInt(m[1], 10);
    const rows = readCsvFile(path.join(ACTUAL_DIR, f));
    if (rows.length > 0) out[showNum] = rows;
  }
  return out;
}

// ---------- Indexing & scoring ----------

function normalizeTitle(s) {
  return (s || '').toLowerCase().trim();
}

function buildActualIndex(actualsByShow) {
  const index = {};
  for (const [showNumStr, rows] of Object.entries(actualsByShow)) {
    const showNum = parseInt(showNumStr, 10);
    const songs = {};
    const openers = { Set1: null, Set2: null };
    const closers = { Set1: null, Set2: null };
    let encoreSong = null;
    let showDate = '';
    for (const r of rows) {
      const title = normalizeTitle(r.Song_Title);
      if (!title) continue;
      if (r.Show_Date) showDate = r.Show_Date;
      songs[title] = {
        set: r.Set_Placement || '',
        position: r.Position || '',
        originalTitle: r.Song_Title,
      };
      if (r.Position === 'Opener' && (r.Set_Placement === 'Set1' || r.Set_Placement === 'Set2')) {
        openers[r.Set_Placement] = title;
      }
      if (r.Position === 'Closer' && (r.Set_Placement === 'Set1' || r.Set_Placement === 'Set2')) {
        closers[r.Set_Placement] = title;
      }
      if (r.Set_Placement === 'Encore' || r.Position === 'Encore') {
        encoreSong = title;
      }
    }
    index[showNum] = { songs, openers, closers, encoreSong, showDate };
  }
  return index;
}

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

  let base = 10;
  const bonuses = { set: 0, opener: 0, closer: 0, encore: 0 };
  const actualSong = actual.songs[title];

  if (pred.Set_Placement && actualSong.set && pred.Set_Placement === actualSong.set) {
    bonuses.set = 2;
  }
  if (pred.Set_Placement === 'Set1' || pred.Set_Placement === 'Set2') {
    if (actual.openers[pred.Set_Placement] === title) bonuses.opener = 3;
    if (actual.closers[pred.Set_Placement] === title) bonuses.closer = 3;
  }
  if (pred.Set_Placement === 'Encore' && actual.encoreSong === title) {
    bonuses.encore = 5;
  }
  const basePoints = base + bonuses.set + bonuses.opener + bonuses.closer + bonuses.encore;
  const points = basePoints * multiplier;
  return { correct: true, basePoints, points, confidence, multiplier, bonuses };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ---------- Main ----------

function main() {
  const predFiles = getPredictionFiles();
  const actualsByShow = getActualsByShow();
  const actualIndex = buildActualIndex(actualsByShow);

  const models = {};

  for (const pf of predFiles) {
    if (!models[pf.model]) {
      models[pf.model] = {
        model: pf.model,
        totalPoints: 0,
        correctCount: 0,
        totalPredictions: 0,
        byWeekend: {},
        byShow: {},
      };
    }
    const m = models[pf.model];
    const rows = readCsvFile(pf.path);
    for (const row of rows) {
      const showNum = parseInt(row.Show_Number, 10);
      if (!Number.isFinite(showNum)) continue;
      const actual = actualIndex[showNum];
      const scored = scorePrediction(row, actual);
      const hasActual = !!actual;

      m.totalPredictions++;
      if (scored.correct) m.correctCount++;
      m.totalPoints += scored.points;

      const wk = pf.weekend;
      if (!m.byWeekend[wk]) m.byWeekend[wk] = { points: 0, correct: 0, total: 0 };
      m.byWeekend[wk].points += scored.points;
      m.byWeekend[wk].total++;
      if (scored.correct) m.byWeekend[wk].correct++;

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
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const shows = {};
  for (const [showNumStr, data] of Object.entries(actualIndex)) {
    const showNum = parseInt(showNumStr, 10);
    shows[showNum] = {
      showNumber: showNum,
      showDate: data.showDate,
      actualSongs: Object.values(data.songs).map((v) => ({
        title: v.originalTitle,
        set: v.set,
        position: v.position,
      })),
    };
  }

  const output = {
    generatedAt: new Date().toISOString(),
    hasData: leaderboard.length > 0 || Object.keys(shows).length > 0,
    leaderboard,
    shows,
  };

  if (!fs.existsSync(SCORES_DIR)) fs.mkdirSync(SCORES_DIR, { recursive: true });
  const outPath = path.join(SCORES_DIR, 'scores.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(
    `Scoring complete — ${leaderboard.length} model(s), ${Object.keys(shows).length} show(s) with actuals.`
  );
  console.log(`Wrote ${outPath}`);
}

main();
