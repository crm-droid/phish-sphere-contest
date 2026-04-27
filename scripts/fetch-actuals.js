#!/usr/bin/env node
/**
 * One-shot fetch of authoritative setlists from phish.net for Sphere 2026
 * Shows 1–5. Writes data/actuals_shows_1_5.json so it can be read back.
 *
 * This is a deliberate, scoped exception to the project's "actuals are never
 * written to disk" rule — used only as a workspace handoff so the assistant
 * can build the not-yet-played-songs analysis off authoritative data.
 *
 * Usage:  node scripts/fetch-actuals.js
 */

try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
} catch (_) {}

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.PHISH_NET_API_KEY;
const DATES = [
  { show: 1, date: '2026-04-16' },
  { show: 2, date: '2026-04-17' },
  { show: 3, date: '2026-04-18' },
  { show: 4, date: '2026-04-23' },
  { show: 5, date: '2026-04-24' },
];

function setLabel(s) {
  s = String(s || '').toLowerCase().trim();
  if (s === '1') return 'Set 1';
  if (s === '2') return 'Set 2';
  if (s === '3') return 'Set 3';
  if (s === 'e' || s === 'encore' || s === 'e1') return 'Encore';
  if (s === 'e2') return 'Encore 2';
  return s;
}

async function fetchOne(date) {
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
  const out = { fetchedAt: new Date().toISOString(), shows: [], allSongsAlphabetized: [] };
  const allSongs = new Set();

  for (const { show, date } of DATES) {
    const rows = await fetchOne(date);
    rows.sort((a, b) => {
      const sa = String(a.set || '');
      const sb = String(b.set || '');
      if (sa !== sb) return sa.localeCompare(sb);
      return parseInt(a.position || 0) - parseInt(b.position || 0);
    });
    const songs = rows.map((r) => ({
      song: (r.song || '').trim(),
      set: setLabel(r.set),
      position: parseInt(r.position || 0),
    }));
    songs.forEach((s) => { if (s.song) allSongs.add(s.song); });
    out.shows.push({ show, date, songs });
    console.log(`Show ${show} (${date}): ${songs.length} songs`);
  }

  out.allSongsAlphabetized = [...allSongs].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'actuals_shows_1_5.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`Total unique songs across Shows 1–5: ${out.allSongsAlphabetized.length}`);
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
