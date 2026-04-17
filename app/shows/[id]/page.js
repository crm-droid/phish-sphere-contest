import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getScores } from '@/lib/data';
import { SHOWS, getShow } from '@/lib/shows';

export function generateStaticParams() {
  return SHOWS.map((s) => ({ id: String(s.number) }));
}

export default function ShowPage({ params }) {
  const show = getShow(params.id);
  if (!show) notFound();

  const scores = getScores();
  const actualShow = scores.shows?.[show.number];
  const actualSongs = actualShow?.actualSongs || [];
  const actualTitles = new Set(
    actualSongs.map((s) => (s.title || '').toLowerCase().trim())
  );

  // Per-model predictions for this show
  const modelRows = (scores.leaderboard || [])
    .map((m) => ({
      model: m.model,
      data: m.byShow?.[show.number],
    }))
    .filter((r) => r.data)
    .sort((a, b) => b.data.points - a.data.points);

  return (
    <div>
      <div className="muted" style={{ fontSize: 13 }}>
        <Link href="/">← Leaderboard</Link>
      </div>
      <h1>
        Show {show.number} — {show.day} {show.date}
      </h1>
      <p className="muted">Weekend {show.weekend} • Las Vegas Sphere</p>

      <div className="link-row">
        {SHOWS.map((s) => (
          <Link key={s.number} href={`/shows/${s.number}`}>
            Show {s.number}
          </Link>
        ))}
      </div>

      <h2>Actual Setlist</h2>
      {actualSongs.length === 0 ? (
        <div className="empty">
          <p>No actual setlist entered yet for Show {show.number}.</p>
          <p className="muted">
            Add <code>show{show.number}_actual.csv</code> to <code>/data/actuals</code> and run{' '}
            <code>npm run score</code>.
          </p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Song</th>
              <th>Set</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {actualSongs.map((s, i) => (
              <tr key={i}>
                <td>{s.title}</td>
                <td>{s.set || '—'}</td>
                <td>{s.position || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Model Predictions</h2>
      {modelRows.length === 0 ? (
        <div className="empty">
          <p>No predictions found for Show {show.number}.</p>
        </div>
      ) : (
        <div className="grid">
          {modelRows.map((r) => (
            <div key={r.model} className="card">
              <h3 style={{ marginTop: 0 }}>{r.model}</h3>
              <p className="muted" style={{ fontSize: 13 }}>
                {r.data.correct} / {r.data.total} correct • {r.data.points.toFixed(2)} pts
              </p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {(r.data.predictions || []).map((p, i) => {
                  const isCorrect = p.correct;
                  return (
                    <li key={i} style={{ marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: isCorrect ? 'var(--correct)' : 'var(--miss)' }}>
                        {isCorrect ? '✓' : '·'}
                      </span>{' '}
                      {p.song}{' '}
                      <span className="pill">
                        C{p.confidence}
                        {p.set ? ` • ${p.set}` : ''}
                      </span>{' '}
                      {isCorrect && (
                        <span className="pill correct">+{p.points.toFixed(1)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
