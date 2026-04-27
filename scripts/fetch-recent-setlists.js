#!/usr/bin/env node
/**
 * Pulls every PHISH setlist from 2025-06-01 through today
 * — i.e. the period after Claude's May 2025 knowledge cutoff —
 * so the unplayed-songs analysis can be grounded in real play counts.
 *
 * v3: uses /setlists/showyear (which we know returns data) and applies a
 *     strict Phish filter on each setlist row. Detects the artist field name
 *     at runtime so it works whether phish.net returns artist_id, artistid,
 *     artist, or something else. Prints the field names found so we can
 *     verify in the run output.
 *
 * Writes data/recent_setlists.json with:
 *   - shows[]              one row per show with date + ordered songs
 *   - songPlayCounts{}     song -> total Phish shows in window where it appeared
 *   - songsAlphabetized[]  unique songs in window
 *   - songsByFrequency[]   songs sorted by play count desc
 *
 * Usage:  node scripts/fetch-recent-setlists.js
 */

try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
} catch (_) {}

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.PHISH_NET_API_KEY;
const API_BASE = 'https://api.phish.net/v5';

const WINDOW_START = '2025-06-01';
const YEARS = [2025, 2026];
const PHISH_ARTIST_ID = '1';
const PHISH_ARTIST_NAME = 'phish';

function setLabel(s) {
  s = String(s || '').toLowerCase().trim();
  if (s === '1') return 'Set 1';
  if (s === '2') return 'Set 2';
  if (s === '3') return 'Set 3';
  if (s === 'e' || s === 'encore' || s === 'e1') return 'Encore';
  if (s === 'e2') return 'Encore 2';
  return s;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const json = await res.json();
  if (json.error) throw new Error(`API error: ${json.error_message || 'unknown'} for ${url}`);
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchYear(year) {
  const url = `${API_BASE}/setlists/showyear/${year}.json?apikey=${encodeURIComponent(API_KEY)}`;
  return getJson(url);
}

// True iff the row is a Phish performance. Defensive across field name
// variations: artist_id (number or string), artistid, artist, artist_name.
function isPhishRow(r) {
  const aidRaw =
    r.artist_id !== undefined ? r.artist_id :
    r.artistid  !== undefined ? r.artistid  :
    null;
  if (aidRaw !== null && aidRaw !== '') {
    return String(aidRaw) === PHISH_ARTIST_ID;
  }
  const nameRaw = r.artist || r.artist_name || r.artistName || '';
  if (nameRaw) {
    return String(nameRaw).trim().toLowerCase() === PHISH_ARTIST_NAME;
  }
  // No artist info at all — be conservative and exclude.
  return false;
}

(async () => {
  if (!API_KEY) {
    console.error('PHISH_NET_API_KEY not set. Add it to .env.local first.');
    process.exit(1);
  }

  // Pull all rows for each year.
  const allRows = [];
  let printedShape = false;
  for (const year of YEARS) {
    process.stdout.write(`Fetching ${year}... `);
    const rows = await fetchYear(year);
    console.log(`${rows.length} rows`);
    if (!printedShape && rows.length > 0) {
      console.log(`  first row keys: ${Object.keys(rows[0]).join(', ')}`);
      console.log(`  first row sample:`, JSON.stringify(rows[0]).slice(0, 400));
      printedShape = true;
    }
    allRows.push(...rows);
  }

  // Filter: Phish only, in window.
  const phishRows = allRows.filter((r) => {
    const date = String(r.showdate || '');
    if (!date || date < WINDOW_START) return false;
    return isPhishRow(r);
  });
  console.log(`\nKept ${phishRows.length} Phish rows in window (out of ${allRows.length} total).`);

  if (phishRows.length === 0) {
    console.error('No Phish rows matched. Inspect the "first row keys" output above and tell Claude what fields are present.');
    process.exit(2);
  }

  // Group by show date.
  const byDate = new Map();
  for (const r of phishRows) {
    const date = r.showdate;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(r);
  }

  const shows = [];
  const songPlayCounts = {};
  const dates = [...byDate.keys()].sort();

  for (const date of dates) {
    const rows = byDate.get(date).slice().sort((a, b) => {
      const sa = String(a.set || '');
      const sb = String(b.set || '');
      if (sa !== sb) return sa.localeCompare(sb);
      return parseInt(a.position || 0) - parseInt(b.position || 0);
    });
    const songs = rows
      .map((r) => ({
        song: (r.song || '').trim(),
        set: setLabel(r.set),
        position: parseInt(r.position || 0),
      }))
      .filter((s) => s.song);

    const uniqueInShow = new Set(songs.map((x) => x.song));
    for (const title of uniqueInShow) {
      songPlayCounts[title] = (songPlayCounts[title] || 0) + 1;
    }
    shows.push({ date, songs });
  }

  const songsAlphabetized = Object.keys(songPlayCounts).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  const songsByFrequency = Object.entries(songPlayCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([song, plays]) => ({ song, plays }));

  const out = {
    fetchedAt: new Date().toISOString(),
    windowStart: WINDOW_START,
    artistFilter: 'Phish only',
    showCount: shows.length,
    uniqueSongCount: songsAlphabetized.length,
    songPlayCounts,
    songsAlphabetized,
    songsByFrequency,
    shows,
  };

  const outPath = path.join(__dirname, '..', 'data', 'recent_setlists.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`\n${shows.length} Phish shows in window (since ${WINDOW_START}).`);
  console.log(`${songsAlphabetized.length} unique Phish songs.`);
  console.log(`Wrote ${outPath}`);
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
