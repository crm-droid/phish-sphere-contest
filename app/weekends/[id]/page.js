import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getScores } from '@/lib/data';
import { WEEKENDS, getShowsForWeekend } from '@/lib/shows';

export function generateStaticParams() {
  return WEEKENDS.map((w) => ({ id: String(w) }));
}

export default function WeekendPage({ params }) {
  const weekend = Number(params.id);
  if (!WEEKENDS.includes(weekend)) notFound();

  const scores = getScores();
  const shows = getShowsForWeekend(weekend);

  const weekendRanking = (scores.leaderboard || [])
    .map((m) => ({
      model: m.model,
      data: m.byWeekend?.[String(weekend)],
    }))
    .filter((r) => r.data)
    .sort((a, b) => b.data.points - a.data.points);

  const winner = weekendRanking[0];

  return (
    <div>
      <div className="muted" style={{ fontSize: 13 }}>
        <Link href="/">← Leaderboard</Link>
      </div>
      <h1>Weekend {weekend}</h1>
      <p className="muted">
        Shows {shows.map((s) => s.number).join(', ')} •{' '}
        {shows.map((s) => `${s.day} ${s.date}`).join(' • ')}
      </p>

      <div className="link-row">
        {WEEKENDS.map((w) => (
          <Link key={w} href={`/weekends/${w}`}>
            Weekend {w}
          </Link>
        ))}
      </div>

      <h2>Weekend Standings</h2>
      {weekendRanking.length === 0 ? (
        <div className="empty">
          <p>No weekend {weekend} results yet.</p>
          <p className="muted">
            Predictions must be in <code>/data/predictions/weekend{weekend}_*.csv</code> and scored
            against actual setlists.
          </p>
        </div>
      ) : (
        <>
          {winner && (
            <div className="card">
              <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                Weekend Winner
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                {winner.model}
              </div>
              <div className="muted">
                {winner.data.points.toFixed(2)} pts • {winner.data.correct}/{winner.data.total}{' '}
                correct
              </div>
            </div>
          )}
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Model</th>
                <th>Points</th>
                <th>Correct</th>
              </tr>
            </thead>
            <tbody>
              {weekendRanking.map((r, i) => (
                <tr key={r.model}>
                  <td className="rank">#{i + 1}</td>
                  <td>
                    <strong>{r.model}</strong>
                  </td>
                  <td>{r.data.points.toFixed(2)}</td>
                  <td>
                    {r.data.correct} / {r.data.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Shows in this weekend</h2>
      <div className="grid">
        {shows.map((s) => {
          const actual = scores.shows?.[s.number];
          const hasActual = actual && actual.actualSongs?.length > 0;
          return (
            <Link key={s.number} href={`/shows/${s.number}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {s.day} {s.date}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Show {s.number}</div>
                <div className="pill" style={{ marginTop: 8 }}>
                  {hasActual ? `${actual.actualSongs.length} songs` : 'No setlist yet'}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
