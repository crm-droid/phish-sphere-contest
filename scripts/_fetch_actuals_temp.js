require('dotenv').config({ path: '/sessions/fervent-sweet-archimedes/mnt/phish-sphere-contest/.env.local' });

const API_KEY = process.env.PHISH_NET_API_KEY;
const dates = ['2026-04-16','2026-04-17','2026-04-18','2026-04-23','2026-04-24'];

function setLabel(s) {
  s = String(s||'').toLowerCase().trim();
  if (s === '1') return 'Set 1';
  if (s === '2') return 'Set 2';
  if (s === '3') return 'Set 3';
  if (s === 'e' || s === 'encore' || s === 'e1') return 'Encore';
  if (s === 'e2') return 'Encore 2';
  return s;
}

(async () => {
  const allSongs = new Set();
  const showResults = {};
  for (const date of dates) {
    const url = `https://api.phish.net/v5/setlists/showdate/${date}.json?apikey=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const rows = (json.data || []).slice().sort((a,b) => {
      const sa = String(a.set||''), sb = String(b.set||'');
      if (sa !== sb) return sa.localeCompare(sb);
      return parseInt(a.position||0) - parseInt(b.position||0);
    });
    showResults[date] = rows.map(r => ({ song: r.song, set: setLabel(r.set), pos: parseInt(r.position||0) }));
    rows.forEach(r => { if (r.song) allSongs.add(r.song.trim()); });
  }
  console.log('=== PER-SHOW SETLISTS ===');
  for (const d of dates) {
    console.log(`\n--- ${d} ---`);
    let curSet = null;
    for (const r of showResults[d]) {
      if (r.set !== curSet) { console.log(`\n  ${r.set}:`); curSet = r.set; }
      console.log(`    ${r.pos}. ${r.song}`);
    }
  }
  console.log('\n=== ALPHABETIZED UNIQUE SONGS PLAYED (Shows 1-5) ===');
  const sorted = [...allSongs].sort((a,b) => a.localeCompare(b, undefined, {sensitivity:'base'}));
  console.log(`Total unique songs: ${sorted.length}\n`);
  sorted.forEach(s => console.log(s));
})();
