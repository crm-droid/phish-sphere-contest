import Link from 'next/link';

const SHOW_DATES = [
  '2026-04-16', '2026-04-17', '2026-04-18',
  '2026-04-23', '2026-04-24', '2026-04-25',
  '2026-04-30', '2026-05-01', '2026-05-02',
];

const API_BASE = 'https://api.phish.net/v5';

async function fetchSetlist(date, apiKey) {
  const url = `${API_BASE}/setlists/showdate/${date}.json?apikey=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.error) return null;
    const rows = Array.isArray(json.data) ? json.data : [];
    return rows.length > 0 ? rows : null;
  } catch (_) {
    return null;
  }
}

async function loadSongs() {
  const apiKey = process.env.PHISH_NET_API_KEY;
  if (!apiKey) {
    return { showsCompleted: 0, totalShows: SHOW_DATES.length, songs: [], error: 'no_key' };
  }

  let showsCompleted = 0;
  const counts = new Map();

  // Sequential — phish.net 403s on bursty parallel requests.
  for (const date of SHOW_DATES) {
    const rows = await fetchSetlist(date, apiKey);
    if (!rows) continue; // future shows, missing data, transient errors

    showsCompleted++;

    // Dedup within a single show — phish.net's API returns "Fuego" twice for
    // one of the Sphere shows. Count each title at most once per show.
    const seenInShow = new Set();
    for (const r of rows) {
      const title = (r.song || '').trim();
      if (!title || seenInShow.has(title)) continue;
      seenInShow.add(title);
      counts.set(title, (counts.get(title) || 0) + 1);
    }
  }

  const songs = [...counts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  return { showsCompleted, totalShows: SHOW_DATES.length, songs };
}

export const metadata = {
  title: 'Song List — LLM Phish Sphere Prediction Contest',
};

// Captured at module load — i.e. build time during static generation.
const BUILD_DATE = new Date();

export default async function SphereSongsPage() {
  const { showsCompleted, totalShows, songs, error } = await loadSongs();

  return (
    <div>
      <div className="muted" style={{ fontSize: 13 }}>
        <Link href="/">← Leaderboard</Link>
      </div>

      <h1>Phish Sphere 2026 — Complete Song List</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Shows completed: {showsCompleted} of {totalShows}
        {' · '}
        Unique songs performed: {songs.length}
      </p>

      {error === 'no_key' ? (
        <div className="empty" style={{ marginTop: 24 }}>
          phish.net API key not configured for this build. Song list unavailable.
        </div>
      ) : songs.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          No completed shows yet — check back after the first show.
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '24px 0 0',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {songs.map((s) => (
            <li
              key={s.title}
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                fontSize: 14,
              }}
            >
              <strong>{s.title}</strong>
              <span className="muted">
                {' '}— played {s.count} {s.count === 1 ? 'time' : 'times'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="muted" style={{ marginTop: 24, fontSize: 13 }}>
        Song data sourced from{' '}
        <a href="https://phish.net" target="_blank" rel="noopener noreferrer">
          phish.net
        </a>
        . Note: phish.net does not include &ldquo;Dark Puddle&rdquo; like Live Phish does.
      </p>
      <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        Last updated:{' '}
        {BUILD_DATE.toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/New_York',
        })}{' '}
        ET
      </p>
    </div>
  );
}
