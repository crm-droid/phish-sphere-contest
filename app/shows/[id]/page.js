import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getScores } from '@/lib/data';
import { SHOWS, MODELS, getShow } from '@/lib/shows';

export function generateStaticParams() {
  return SHOWS.map((s) => ({ id: String(s.number) }));
}

export default function ShowPage({ params }) {
  const show = getShow(params.id);
  if (!show) notFound();

  const scores = getScores();
  const showMeta = scores.shows?.[show.number];
  const phishNetUrl = showMeta?.phishNetUrl || `https://phish.net/setlists/?d=${show.date}`;
  const scored = !!showMeta?.scored;

  // Pull this show's per-model breakdown from the leaderboard.
  const byId = Object.fromEntries((scores.leaderboard || []).map((m) => [m.model, m]));
  const modelRows = MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    data: byId[m.id]?.byShow?.[show.number],
  }))
    .filter((r) => r.data) // hide models with no predictions for this show
    .sort((a, b) => (b.data.points || 0) - (a.data.points || 0));

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

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className={`pill ${scored ? 'correct' : ''}`}>
            {scored ? 'Scored' : 'Not scored yet'}
          </span>
          <a href={phishNetUrl} target="_blank" rel="noopener noreferrer">
            View Setlist on phish.net →
          </a>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          Actual setlists are sourced from phish.net at scoring time and are not republished
          here. Click the link above for the full setlist.
        </p>
      </div>

      <h2>Model Predictions</h2>
      {modelRows.length === 0 ? (
        <div className="empty">
          <p>No model predictions have been entered for Show {show.number} yet.</p>
        </div>
      ) : (
        <div className="grid">
          {modelRows.map((r) => (
            <div key={r.id} className="card">
              <h3 style={{ marginTop: 0 }}>{r.label}</h3>
              <p className="muted" style={{ fontSize: 13 }}>
                {scored ? (
                  <>
                    {r.data.correct} / {r.data.total} correct • {r.data.points.toFixed(2)} pts
                  </>
                ) : (
                  <>{r.data.total} predictions • awaiting scoring</>
                )}
              </p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {(r.data.predictions || []).map((p, i) => {
                  const isCorrect = !!p.correct;
                  return (
                    <li key={i} style={{ marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: isCorrect ? 'var(--correct)' : 'var(--miss)' }}>
                        {scored ? (isCorrect ? '✓' : '·') : '·'}
                      </span>{' '}
                      {p.song}{' '}
                      <span className="pill">
                        C{p.confidence}
                        {p.set ? ` • ${p.set}` : ''}
                      </span>{' '}
                      {scored && isCorrect && (
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
