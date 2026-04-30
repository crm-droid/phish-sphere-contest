import Link from 'next/link';
import { getScores, allShowsScored } from '@/lib/data';
import { SHOWS, WEEKENDS, MODELS } from '@/lib/shows';
import WinnerPodiumModal from '@/components/WinnerPodiumModal';

export default function LeaderboardPage() {
  const scores = getScores();
  const scored = scores.leaderboard || [];
  const byId = Object.fromEntries(scored.map((m) => [m.model, m]));
  const showWinnerModal = allShowsScored(scores);

  // Always render the canonical roster of 6, merging in any scored data.
  const rows = MODELS.map((m) => {
    const s = byId[m.id];
    return {
      model: m.id,
      label: m.label,
      totalPoints: s?.totalPoints ?? 0,
      correctCount: s?.correctCount ?? 0,
      totalPredictions: s?.totalPredictions ?? 0,
      correctPercent: s?.correctPercent ?? 0,
      byWeekend: s?.byWeekend ?? {},
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div>
      {showWinnerModal && (
        <WinnerPodiumModal
          leaderboard={scores.leaderboard}
          generatedAt={scores.generatedAt}
        />
      )}
      <h1>Overall Leaderboard</h1>
      <p className="muted">
        6 AI language models competing to predict Phish&apos;s 9-show Las Vegas Sphere residency
        (April–May 2026). Ranked by total points across all shows.
      </p>

      <div className="link-row">
        {WEEKENDS.map((w) => (
          <Link key={w} href={`/weekends/${w}`}>
            Weekend {w}
          </Link>
        ))}
        {SHOWS.map((s) => (
          <Link key={s.number} href={`/shows/${s.number}`}>
            Show {s.number}
          </Link>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Model</th>
            <th>Total Points</th>
            <th>Correct</th>
            <th>Accuracy</th>
            <th>W1</th>
            <th>W2</th>
            <th>W3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr key={m.model}>
              <td className="rank">#{i + 1}</td>
              <td>
                <strong>{m.label}</strong>
              </td>
              <td>{m.totalPoints.toFixed(2)}</td>
              <td>
                {m.correctCount} / {m.totalPredictions}
              </td>
              <td>{m.correctPercent.toFixed(1)}%</td>
              <td>{m.byWeekend?.['1']?.points?.toFixed(2) || '—'}</td>
              <td>{m.byWeekend?.['2']?.points?.toFixed(2) || '—'}</td>
              <td>{m.byWeekend?.['3']?.points?.toFixed(2) || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {scored.length === 0 && (
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          No predictions scored yet. Add CSVs to <code>/data/predictions</code> and{' '}
          <code>/data/actuals</code>, then run <code>npm run score</code>.
        </p>
      )}

      {scores.generatedAt && (
        <p className="muted" style={{ marginTop: 20, fontSize: 12 }}>
          Last scored: {new Date(scores.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
