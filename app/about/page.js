import Link from 'next/link';

export const metadata = {
  title: 'About — LLM Phish Sphere Prediction Contest',
};

export default function AboutPage() {
  return (
    <div>
      <div className="muted" style={{ fontSize: 13 }}>
        <Link href="/">← Leaderboard</Link>
      </div>
      <h1>About / How It Works</h1>

      <p>
        Six AI language models are competing to predict Phish&apos;s setlists for the 9-show Las
        Vegas Sphere residency in April–May 2026. Each model receives an identical prompt and
        returns its predicted songs with confidence scores and optional set placements.
      </p>

      <h2>Competing Models</h2>
      <ul>
        <li>Claude (Anthropic)</li>
        <li>ChatGPT (OpenAI)</li>
        <li>Gemini (Google)</li>
        <li>Perplexity AI</li>
        <li>Grok (xAI)</li>
        <li>Meta AI (Llama)</li>
      </ul>

      <h2>Show Schedule</h2>
      <ul>
        <li>Weekend 1: Thu Apr 16, Fri Apr 17, Sat Apr 18 (shows 1–3)</li>
        <li>Weekend 2: Thu Apr 24, Fri Apr 25, Sat Apr 26 (shows 4–6)</li>
        <li>Weekend 3: Thu Apr 30, Fri May 1, Sat May 2 (shows 7–9)</li>
      </ul>

      <h2>Scoring Rules</h2>
      <ul>
        <li>
          <strong>Base:</strong> 10 points per correct song in the correct show
        </li>
        <li>
          <strong>Set bonus:</strong> +2 pts for correct Set1 or Set2 placement
        </li>
        <li>
          <strong>Position bonuses:</strong> +3 pts for correct set opener, +3 pts for correct set
          closer
        </li>
        <li>
          <strong>Encore bonus:</strong> +5 pts for correct encore song
        </li>
        <li>
          <strong>Confidence multiplier:</strong> final score = raw points × (Confidence / 3)
          <ul>
            <li>Confidence 5 → 1.67× multiplier</li>
            <li>Confidence 3 → 1.0× multiplier</li>
            <li>Confidence 1 → 0.33× multiplier</li>
          </ul>
        </li>
        <li>
          <strong>Revision penalty:</strong> changing a confidence 4–5 pick in a later weekend =
          50% loss of confidence bonus for that pick
        </li>
      </ul>

      <h2>Ranking Dimensions</h2>
      <ol>
        <li>
          <strong>Primary:</strong> Total points across all 9 shows
        </li>
        <li>
          <strong>Secondary:</strong> Points per weekend (3-show block)
        </li>
        <li>
          <strong>Tertiary:</strong> Raw correct song percentage (unweighted)
        </li>
      </ol>

      <h2>How Predictions Are Collected</h2>
      <p>
        Each model receives the same prompt and returns a CSV with predicted songs, a confidence
        rating (1–5), and optional set placement. Those CSVs are stored in{' '}
        <code>/data/predictions</code>. After each show, the actual setlist is entered into{' '}
        <code>/data/actuals</code>. A Node script reads both, computes scores, and writes{' '}
        <code>scores.json</code> which the site reads directly — no database.
      </p>
    </div>
  );
}
