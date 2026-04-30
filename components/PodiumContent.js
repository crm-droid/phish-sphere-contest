import { MODELS } from '@/lib/shows';

const LABELS = Object.fromEntries(MODELS.map((m) => [m.id, m.label]));

function buildFinalRows(leaderboard) {
  const byId = Object.fromEntries((leaderboard || []).map((m) => [m.model, m]));
  return MODELS.map((m) => {
    const s = byId[m.id];
    return {
      model: m.id,
      label: m.label,
      totalPoints: s?.totalPoints ?? 0,
      correctCount: s?.correctCount ?? 0,
      totalPredictions: s?.totalPredictions ?? 0,
      correctPercent: s?.correctPercent ?? 0,
      weekend3Bonus: s?.weekend3Bonus ?? null,
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);
}

const PODIUM_ORDER = [1, 0, 2]; // visual order: 2nd, 1st, 3rd

export default function PodiumContent({ leaderboard, generatedAt }) {
  const rows = buildFinalRows(leaderboard);
  const top3 = rows.slice(0, 3);

  return (
    <div className="podium-wrap">
      <p className="podium-message">
        The results are in. After 9 shows, 270+ songs, and one unforgettable
        Sphere run — we have a winner.
      </p>

      <div className="podium" role="list" aria-label="Top three">
        {PODIUM_ORDER.map((idx) => {
          const m = top3[idx];
          if (!m) return null;
          const place = idx + 1;
          return (
            <div
              key={m.model}
              role="listitem"
              className={`podium-step podium-step-${place}`}
            >
              <div className="podium-rank">{place}</div>
              <div className="podium-name">{m.label}</div>
              <div className="podium-score">{m.totalPoints.toFixed(2)}</div>
              <div className="podium-meta">
                {m.correctCount}/{m.totalPredictions} correct ·{' '}
                {m.correctPercent.toFixed(1)}%
              </div>
              {m.weekend3Bonus && (
                <div className="podium-bonus">
                  {m.weekend3Bonus.type === 'elite'
                    ? 'Elite Night +100'
                    : 'Perfect Night +50'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="podium-final-h">Final Standings</h2>
      <table className="podium-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Model</th>
            <th>Total</th>
            <th>Correct</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr key={m.model} className={i < 3 ? `final-row final-row-${i + 1}` : ''}>
              <td className="rank">#{i + 1}</td>
              <td>
                <strong>{LABELS[m.model] || m.label}</strong>
              </td>
              <td>{m.totalPoints.toFixed(2)}</td>
              <td>
                {m.correctCount} / {m.totalPredictions}
              </td>
              <td>{m.correctPercent.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {generatedAt && (
        <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
          Final scoring: {new Date(generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
