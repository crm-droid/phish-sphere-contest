#!/usr/bin/env node
/**
 * Lists every unique song played across the completed Phish Sphere 2026 shows,
 * sorted alphabetically with a play count for each.
 *
 * Usage:  node scripts/list-sphere-songs.js
 */

try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
} catch (_) {}

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.PHISH_NET_API_KEY;
const OUT_PATH = path.join(__dirname, '..', 'data', 'sphere-songs.txt');

const COMPLETED_SHOWS = [
  '2026-04-16',
  '2026-04-17',
  '2026-04-18',
  '2026-04-23',
  '2026-04-24',
  '2026-04-25',
  '2026-04-30',
  '2026-05-01',
];
const TOTAL_SHOWS = 9;

async function fetchSetlist(date) {
  const url = `https://api.phish.net/v5/setlists/showdate/${date}.json?apikey=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${date}`);
  const json = await res.json();
  if (json.error) throw new Error(`API error for ${date}: ${json.error_message || 'unknown'}`);
  return Array.isArray(json.data) ? json.data : [];
}

(async () => {
  if (!API_KEY) {
    console.error('PHISH_NET_API_KEY not set. Add it to .env.local first.');
    process.exit(1);
  }

  const counts = new Map();

  for (const date of COMPLETED_SHOWS) {
    const rows = await fetchSetlist(date);
    for (const r of rows) {
      const title = (r.song || '').trim();
      if (!title) continue;
      counts.set(title, (counts.get(title) || 0) + 1);
    }
  }

  const sorted = [...counts.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  const lines = [];
  lines.push(`Phish Sphere 2026 — All Songs Played (Alphabetical)`);
  lines.push(`Shows completed: ${COMPLETED_SHOWS.length} of ${TOTAL_SHOWS}`);
  lines.push(`Unique songs: ${sorted.length}`);
  lines.push('');
  for (const title of sorted) {
    const n = counts.get(title);
    lines.push(`${title} — ${n} play${n === 1 ? '' : 's'}`);
  }

  const output = lines.join('\n') + '\n';
  process.stdout.write(output);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, output);
  console.log(`\nWrote ${path.relative(path.join(__dirname, '..'), OUT_PATH)}`);
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
