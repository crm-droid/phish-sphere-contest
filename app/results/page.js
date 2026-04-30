import { getScores, allShowsScored } from '@/lib/data';
import PodiumContent from '@/components/PodiumContent';

export const metadata = {
  title: 'Results — LLM Phish Sphere Prediction Contest',
};

export default function ResultsPage() {
  const scores = getScores();
  const ready = allShowsScored(scores);

  if (!ready) {
    return (
      <div>
        <h1>Final Results</h1>
        <div className="empty" style={{ marginTop: 24 }}>
          Results will be posted after the final show on May 2.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Final Results</h1>
      <PodiumContent
        leaderboard={scores.leaderboard}
        generatedAt={scores.generatedAt}
      />
    </div>
  );
}
