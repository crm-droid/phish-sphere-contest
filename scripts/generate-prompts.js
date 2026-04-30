#!/usr/bin/env node
/**
 * Phish Sphere Contest — Weekend 3 prompt generator.
 *
 * Does everything in one run:
 *   1. Fetches actual setlists for all 6 completed shows (Weekends 1 + 2)
 *      live from phish.net (held in memory).
 *   2. Reads each model's Weekend 2 prediction CSV.
 *   3. Reads /data/scores/scores.json for standings.
 *   4. Writes one personalized prompt per model to /prompts/weekend3_{model}.md.
 *   5. Writes /prompts/standings.md with the standings + Weekend 1+2 actuals.
 *
 * Setlist data stays in /prompts (local / gitignored territory) — it is never
 * published on the live site.
 */

try {
  require('dotenv').config({
    path: require('path').join(__dirname, '..', '.env.local'),
  });
} catch (_) {
  /* dotenv not installed; skip */
}

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PRED_DIR = path.join(ROOT, 'data', 'predictions');
const SCORES_PATH = path.join(ROOT, 'data', 'scores', 'scores.json');
const PROMPTS_DIR = path.join(ROOT, 'prompts');

const API_KEY = process.env.PHISH_NET_API_KEY;
const API_BASE = 'https://api.phish.net/v5';

const WEEKEND_1_DATES = [
  { date: '2026-04-16', showNumber: 1, label: 'Show 1 - April 16' },
  { date: '2026-04-17', showNumber: 2, label: 'Show 2 - April 17' },
  { date: '2026-04-18', showNumber: 3, label: 'Show 3 - April 18' },
];

const WEEKEND_2_DATES = [
  { date: '2026-04-23', showNumber: 4, label: 'Show 4 - April 23' },
  { date: '2026-04-24', showNumber: 5, label: 'Show 5 - April 24' },
  { date: '2026-04-25', showNumber: 6, label: 'Show 6 - April 25' },
];

const WEEKEND_3_DATES = [
  { date: '2026-04-30', showNumber: 7, label: 'Show 7 - April 30' },
  { date: '2026-05-01', showNumber: 8, label: 'Show 8 - May 1' },
  { date: '2026-05-02', showNumber: 9, label: 'Show 9 - May 2' },
];

const COMPLETED_SHOWS = [...WEEKEND_1_DATES, ...WEEKEND_2_DATES];

const WEEKEND_2_SHOW_META = {
  4: 'Show 4 - April 23',
  5: 'Show 5 - April 24',
  6: 'Show 6 - April 25',
};

const MODEL_DISPLAY_NAMES = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  grok: 'Grok',
  mistral: 'Mistral',
};

// ---------- CSV parsing (same shape as scripts/score.js) ----------

function parseCSV(content) {
  if (!content) return [];
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

// ---------- phish.net API ----------

function setLabelFromApi(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s === '1') return 'Set 1';
  if (s === '2') return 'Set 2';
  if (s === '3') return 'Set 3';
  if (s === 'e' || s === 'e1' || s === 'encore') return 'Encore';
  if (s === 'e2') return 'Encore 2';
  return 'Other';
}

const SET_ORDER = ['Set 1', 'Set 2', 'Set 3', 'Encore', 'Encore 2', 'Other'];

async function fetchSetlist(dateStr) {
  if (!API_KEY) return { status: 'no_key', rows: [] };
  const url =
    `${API_BASE}/setlists/showdate/${encodeURIComponent(dateStr)}.json` +
    `?apikey=${encodeURIComponent(API_KEY)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { status: `http_${res.status}`, rows: [] };
    }
    const json = await res.json();
    if (json.error) {
      return { status: 'api_error', rows: [] };
    }
    const rows = Array.isArray(json.data) ? json.data : [];
    if (rows.length === 0) return { status: 'no_show', rows: [] };
    return { status: 'ok', rows };
  } catch (e) {
    return { status: `fetch_error:${e.message}`, rows: [] };
  }
}

function formatActualShow(label, status, rows) {
  if (status !== 'ok') {
    return `${label}:\n(unavailable — ${status})`;
  }
  const bySet = {};
  for (const r of rows) {
    const setLabel = setLabelFromApi(r.set);
    if (!bySet[setLabel]) bySet[setLabel] = [];
    const pos = parseInt(r.position, 10);
    bySet[setLabel].push({
      song: (r.song || '').trim(),
      position: Number.isFinite(pos) ? pos : 0,
    });
  }
  const lines = [`${label}:`];
  for (const setName of SET_ORDER) {
    const entries = bySet[setName];
    if (!entries || entries.length === 0) continue;
    entries.sort((a, b) => a.position - b.position);
    const songs = entries.map((e) => e.song).filter(Boolean).join(', ');
    lines.push(`${setName}: ${songs}`);
  }
  return lines.join('\n');
}

// ---------- Predictions formatting ----------

function formatPredictions(rows, showMeta) {
  const byShow = new Map();
  for (const row of rows) {
    const showNum = parseInt(row.Show_Number, 10);
    if (!Number.isFinite(showNum)) continue;
    if (!byShow.has(showNum)) byShow.set(showNum, []);
    byShow.get(showNum).push(row);
  }
  const sections = [];
  const sortedShows = [...byShow.keys()].sort((a, b) => a - b);
  for (const showNum of sortedShows) {
    const header = showMeta[showNum] || `Show ${showNum}`;
    const lines = [`${header}:`];
    for (const p of byShow.get(showNum)) {
      const set = p.Set_Placement || '';
      lines.push(
        `${p.Song_Title} (Confidence: ${p.Confidence}, ${set})`
      );
    }
    sections.push(lines.join('\n'));
  }
  return sections.join('\n\n');
}

// ---------- Scores ----------

function readScores() {
  if (!fs.existsSync(SCORES_PATH)) {
    return { leaderboard: [], missing: true };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(SCORES_PATH, 'utf-8'));
    return { leaderboard: parsed.leaderboard || [], missing: false };
  } catch (e) {
    console.warn(`  ⚠ Could not parse scores.json: ${e.message}`);
    return { leaderboard: [], missing: true };
  }
}

function formatStandings(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    return 'Current Standings after Weekend 2:\n(standings unavailable — scores.json missing or empty)';
  }
  const lines = ['Current Standings after Weekend 2:'];
  leaderboard.forEach((entry, idx) => {
    const display = MODEL_DISPLAY_NAMES[entry.model] || entry.model;
    lines.push(`${idx + 1}. ${display} — ${entry.totalPoints} pts`);
  });
  return lines.join('\n');
}

function getWeekendScoreForModel(leaderboard, model, weekendKey) {
  const entry = leaderboard.find((e) => e.model === model);
  if (!entry) return null;
  const w = entry.byWeekend && entry.byWeekend[weekendKey];
  if (w && typeof w.points === 'number') return w.points;
  return null;
}

// ---------- Prompt template ----------

function buildPrompt({
  standingsText,
  actualsText,
  predictionsText,
  weekend1Score,
  weekend2Score,
  totalScore,
}) {
  const fmt = (v) => (v === null ? '[unavailable]' : `${v} pts`);
  return `You are competing against other LLMs to predict Phish setlists for their 9-show Las Vegas Sphere residency (2026). You are now predicting Weekend 3 (shows 7, 8, 9).
Use your extended thinking / reasoning mode for this task. Take time to reason carefully before producing output. But do not use your memory from my sessions, use only this prompt and your training data.
You are competing in a non-logged-in session. Use your extended thinking or reasoning mode if available.

Show dates:

Weekend 2: Thu Apr 23, Fri Apr 24, Sat Apr 25 (shows 4, 5, 6)
Weekend 3: Thu Apr 30, Fri May 1, Sat May 2 (shows 7, 8, 9)

Current competition standings after Weekend 2:
${standingsText}

Critical context — weight this carefully:

This is the Sphere in Las Vegas, not a standard Phish show. Sets tend to be longer, jams tend to peak harder, and song choices favor material that works with immersive visuals.
Phish has been actively touring in 2024-2026. Make sure you are aware of and consider their recent setlists from this period — including their 2024 Sphere run — as part of your analysis. If you have the ability to search the web or access recent data, use it.
Consider historical patterns from Phish residencies and multi-night runs when deciding which songs to predict. Think carefully about how Phish has approached song selection across consecutive nights in the past.

You are in the final weekend of the competition. This is your last chance to move up or defend your position. Weekend 3 bonus points are available and could flip the leaderboard:

Perfect Night bonus: get 5-7 songs correct in a single show = +50 pts (one time only, best show counts)
Elite Night bonus: get 8+ songs correct in a single show = +100 pts (one time only, replaces Perfect Night bonus)
These bonuses are awarded once per model for their single best show in Weekend 3.

What was actually played in Weekends 1 and 2:
${actualsText}

Your Weekend 2 predictions:
${predictionsText}

Your Weekend 1 score: ${fmt(weekend1Score)}
Your Weekend 2 score: ${fmt(weekend2Score)}
Your total score so far: ${fmt(totalScore)}

Rules:

Predict songs for Weekend 3 only (shows 7, 8, 9) right now
Each song must be a real Phish song
Predict between 20 and 30 total songs across the 3 shows (7-10 per show)
Assign confidence 1-5 to every prediction
Optionally predict set placement (Set1, Set2, Encore) for bonus points
High confidence picks (4-5) you are changing from a prior weekend will be penalized

Scoring reminder:

10 pts per correct song in correct show
+2 pts correct set placement, +3 pts correct opener/closer, +5 pts correct encore
Score multiplied by (Confidence / 3)
Revision penalty: changing a 4-5 confidence pick = 50% confidence bonus lost
Weekend 3 only: Perfect Night (+50) or Elite Night (+100) bonus per model, best show in Weekend 3

Required CSV output format:
Weekend_Number,Show_Number,Show_Date,Song_Title,Confidence,Set_Placement

Weekend_Number = 3
Show_Number = 7, 8, or 9
Set_Placement = Set1, Set2, Encore, or blank
Output only the CSV block, no other text, no markdown

Start with the CSV header line then rows only.
`;
}

// ---------- Main ----------

async function main() {
  if (!API_KEY) {
    console.warn(
      '  ⚠ PHISH_NET_API_KEY is not set. Setlist sections will be left with a placeholder. ' +
        'Copy .env.local.example to .env.local and add your key to populate the actuals.'
    );
  }

  // 1. Fetch actual setlists for all 6 completed shows.
  console.log('Fetching Weekend 1 + 2 setlists from phish.net...');
  const actualResults = await Promise.all(
    COMPLETED_SHOWS.map(async (d) => {
      const { status, rows } = await fetchSetlist(d.date);
      if (status !== 'ok') {
        console.warn(`  ⚠ ${d.date}: ${status}`);
      }
      return { ...d, status, rows };
    })
  );
  const actualsText = actualResults
    .map((r) => formatActualShow(r.label, r.status, r.rows))
    .join('\n\n');

  // 2. Read each model's Weekend 2 prediction CSV.
  if (!fs.existsSync(PRED_DIR)) {
    console.error(`Predictions directory not found: ${PRED_DIR}`);
    process.exit(1);
  }
  const predictionFiles = fs
    .readdirSync(PRED_DIR)
    .filter((f) => /^weekend2_.+\.csv$/i.test(f))
    .sort();
  if (predictionFiles.length === 0) {
    console.error(`No weekend2_*.csv files found in ${PRED_DIR}`);
    process.exit(1);
  }

  // 3. Read scores.
  const { leaderboard, missing } = readScores();
  if (missing) {
    console.warn(
      '  ⚠ /data/scores/scores.json is missing or unreadable. Standings and per-model scores will be placeholders.'
    );
  }
  const standingsText = formatStandings(leaderboard);

  // 4. Write per-model prompt files.
  if (!fs.existsSync(PROMPTS_DIR)) fs.mkdirSync(PROMPTS_DIR, { recursive: true });

  for (const file of predictionFiles) {
    const match = file.match(/^weekend2_(.+)\.csv$/i);
    if (!match) continue;
    const model = match[1].toLowerCase();
    const filePath = path.join(PRED_DIR, file);
    let rows;
    try {
      rows = parseCSV(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.warn(`  ⚠ Could not read ${file}: ${e.message}`);
      continue;
    }
    const predictionsText = formatPredictions(rows, WEEKEND_2_SHOW_META);
    const weekend1Score = getWeekendScoreForModel(leaderboard, model, '1');
    const weekend2Score = getWeekendScoreForModel(leaderboard, model, '2');
    const entry = leaderboard.find((e) => e.model === model);
    const totalScore = entry && typeof entry.totalPoints === 'number'
      ? entry.totalPoints
      : null;
    const prompt = buildPrompt({
      standingsText,
      actualsText,
      predictionsText,
      weekend1Score,
      weekend2Score,
      totalScore,
    });
    const outPath = path.join(PROMPTS_DIR, `weekend3_${model}.md`);
    fs.writeFileSync(outPath, prompt);
    console.log(`Wrote ${path.relative(ROOT, outPath)}`);
  }

  // 5. Standings reference file.
  const standingsDoc = `${standingsText}

Weekends 1 and 2 — actual setlists:
${actualsText}
`;
  const standingsOut = path.join(PROMPTS_DIR, 'standings.md');
  fs.writeFileSync(standingsOut, standingsDoc);
  console.log(`Wrote ${path.relative(ROOT, standingsOut)}`);
}

main().catch((e) => {
  console.error('generate-prompts failed:', e);
  process.exit(1);
});
