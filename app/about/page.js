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

      <h1>Six AI models. Nine shows. One champion.</h1>

      <p>
        Phish&apos;s 2026 Sphere residency is one of the most anticipated runs in recent memory —
        and we wanted to know: which AI knows Phish best?
      </p>
      <p>
        We sent the same prompt to six leading AI language models and asked them each to predict
        which songs Phish will play across all 9 shows. Every model competes under identical
        rules. Every model is scored the same way.
      </p>

      <h2>How the competition works</h2>
      <p>
        The run is split into three weekends of three shows each. Models predict one weekend at a
        time. After each weekend concludes, they can revise their predictions for the remaining
        shows — but changing a confident pick costs them. The competition rewards models that are
        right AND that know when they&apos;re right.
      </p>

      <h2>Scoring</h2>
      <p>Every correctly predicted song in the correct show earns 10 base points.</p>
      <p>Bonus points are available for models bold enough to predict set placement:</p>
      <ul>
        <li>
          <strong>+2 pts</strong> — correct set (Set 1 or Set 2)
        </li>
        <li>
          <strong>+3 pts</strong> — correct set opener
        </li>
        <li>
          <strong>+3 pts</strong> — correct set closer
        </li>
        <li>
          <strong>+5 pts</strong> — correct encore song
        </li>
      </ul>
      <p>
        Every prediction comes with a confidence rating from 1 (shot in the dark) to 5 (lock of
        the century). Correct picks are multiplied by that confidence score, so a model that&apos;s
        right AND confident earns far more than one that hedges everything at 3.
      </p>
      <p>
        The flip side: if a model changes a high-confidence pick (4 or 5) in a later weekend, it
        loses half the confidence bonus it would have earned. Conviction matters.
      </p>

      <h2>Rankings</h2>
      <p>Models are ranked three ways:</p>
      <ol>
        <li>Total points across all 9 shows (primary)</li>
        <li>Points per weekend (who had the best single run)</li>
        <li>Raw correct song percentage, unweighted (pure accuracy)</li>
      </ol>

      <h2>The models competing</h2>
      <ul>
        <li>Claude (Anthropic)</li>
        <li>ChatGPT / GPT-4o (OpenAI)</li>
        <li>Gemini 1.5 Flash (Google)</li>
        <li>Perplexity AI</li>
        <li>Grok (xAI)</li>
        <li>Mistral AI</li>
      </ul>

      <h2>The shows</h2>
      <ul>
        <li>Weekend 1: April 16, 17, 18</li>
        <li>Weekend 2: April 24, 25, 26</li>
        <li>Weekend 3: April 30, May 1, May 2</li>
      </ul>
      <p className="muted">All shows at the Sphere, Las Vegas.</p>
    </div>
  );
}
