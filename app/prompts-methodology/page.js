import fs from 'fs';
import path from 'path';
import Link from 'next/link';

export const metadata = {
  title: 'Prompts & Methodology — LLM Phish Sphere Prediction Contest',
};

const WEEKEND_1_PROMPT = `You are competing against other LLMs to predict the song selections for Phish's 9‑show Sphere residency (Las Vegas, 2026). Your goal is to earn the highest overall score across all 9 shows.
Show dates:

Weekend 1: Thu Apr 16, Fri Apr 17, Sat Apr 18
Weekend 2: Thu Apr 24, Fri Apr 25, Sat Apr 26
Weekend 3: Thu Apr 30, Fri May 1, Sat May 2

Every model follows the same rules and is scored the same way.
Contest structure

9 shows across 3 weekends of 3 shows each
You are currently predicting Weekend 1 only (3 shows)
After each weekend, you may revise predictions for future shows based on what actually happened
Your Weekend 1 predictions are locked once the first show begins

What to predict

Predict song selections for each of the 3 shows
Each song must be a real Phish song from their catalog
Do not predict segues, transitions, or jam length
Optionally, you may predict set placement (Set1, Set2, Encore) for bonus points

Confidence scale (required)

1 = very unlikely, 3 = about 50/50, 5 = highly confident

Scoring

Base score: 10 points per correct song in the correct show
Bonus: +2 pts for correct set placement (Set1 or Set2), +3 pts for correct set opener, +3 pts for correct set closer, +5 pts for correct encore song
Confidence multiplier: score × (Confidence / 3)

Confidence 5 = 1.67× multiplier
Confidence 3 = 1.0× multiplier
Confidence 1 = 0.33× multiplier


Revision penalty: changing a 4 or 5 confidence pick in a future weekend loses 50% of its potential confidence bonus
Secondary ranking: weekend-by-weekend accuracy per 3-show block

Required CSV output format
Columns: Weekend_Number, Show_Number, Show_Date, Song_Title, Confidence, Set_Placement

Set_Placement is optional — use Set1, Set2, or Encore, or leave blank
List all songs sorted by Show_Number, then your order within the show
Output only the CSV block, no other text
Predict between 20 and 30 total songs across the 3 shows (7-10 per show)

Example:
Weekend_Number,Show_Number,Show_Date,Song_Title,Confidence,Set_Placement
1,1,2026-04-16,Possum,5,Set1
1,1,2026-04-16,Chalk Dust Torture,4,
1,2,2026-04-17,Reba,3,Set2
1,3,2026-04-18,Good Times Bad Times,4,Encore
Start with the CSV header line, then rows only. No markdown, no commentary.`;

const WEEKEND_2_TEMPLATE = `You are competing against other LLMs to predict Phish setlists for their 9-show Las Vegas Sphere residency (2026). You are now predicting Weekend 2 (shows 4-6).
Use your extended thinking / reasoning mode for this task. Take time to reason carefully before producing output.
Show dates:

Weekend 2: Thu Apr 24, Fri Apr 25, Sat Apr 26 (shows 4, 5, 6)
Weekend 3: Thu Apr 30, Fri May 1, Sat May 2 (shows 7, 8, 9)

Current competition standings after Weekend 1:
[INSERT OVERALL STANDINGS HERE]

Critical context — weight this carefully:

This is the Sphere in Las Vegas, not a standard Phish show. Sets tend to be longer, jams tend to peak harder, and song choices favor material that works with immersive visuals.
Phish has been actively touring in 2024-2026. Make sure you are aware of and consider their recent setlists from this period — including their 2024 Sphere run — as part of your analysis. If you have the ability to search the web or access recent data, use it.
Consider historical patterns from Phish residencies and multi-night runs when deciding which songs to predict. Think carefully about how Phish has approached song selection across consecutive nights in the past.

What was actually played in Weekend 1:
[INSERT WEEKEND 1 ACTUALS HERE]

Your Weekend 1 predictions:
[INSERT THIS MODEL'S WEEKEND 1 PREDICTIONS HERE]

Your Weekend 1 score: [INSERT THIS MODEL'S SCORE] pts

Rules:

Predict songs for Weekend 2 only (shows 4, 5, 6) right now
Each song must be a real Phish song
Predict between 20 and 30 total songs across the 3 shows (7-10 per show)
Assign confidence 1-5 to every prediction
Optionally predict set placement (Set1, Set2, Encore) for bonus points
High confidence picks (4-5) you are changing from Weekend 1 will be penalized

Scoring reminder:

10 pts per correct song in correct show
+2 pts correct set placement, +3 pts correct opener/closer, +5 pts correct encore
Score multiplied by (Confidence / 3)
Revision penalty: changing a 4-5 confidence pick = 50% confidence bonus lost

Required CSV output format:
Weekend_Number,Show_Number,Show_Date,Song_Title,Confidence,Set_Placement

Weekend_Number = 2
Show_Number = 4, 5, or 6
Set_Placement = Set1, Set2, Encore, or blank
Output only the CSV block, no other text, no markdown

Start with the CSV header line then rows only.`;

function readClaudeWeekend2Prompt() {
  try {
    const p = path.join(process.cwd(), 'prompts', 'weekend2_claude.md');
    return fs.readFileSync(p, 'utf-8').trim();
  } catch (_) {
    return null;
  }
}

function PromptBlock({ children }) {
  return (
    <pre
      style={{
        background: 'var(--panel-2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 20,
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily:
          '"SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        color: 'var(--text)',
        overflowX: 'auto',
      }}
    >
      {children}
    </pre>
  );
}

export default function PromptsMethodologyPage() {
  const claudeWeekend2 = readClaudeWeekend2Prompt();

  return (
    <div>
      <div className="muted" style={{ fontSize: 13 }}>
        <Link href="/">← Leaderboard</Link>
      </div>

      <h1>Prompts &amp; Methodology</h1>
      <p className="muted">
        The exact prompts sent to each model, plus the reasoning behind how they evolved from
        Weekend 1 to Weekend 2.
      </p>

      <div className="link-row">
        <a href="#weekend-1">Weekend 1 Prompt</a>
        <a href="#weekend-2">Weekend 2 Prompt</a>
      </div>

      <section id="weekend-1" style={{ scrollMarginTop: 16 }}>
        <h2>Weekend 1 Prompt</h2>
        <p>
          All six models received the same prompt with no personalization. This is the baseline —
          identical rules, identical information, identical scoring. No context from prior
          conversations, no standings, no prior predictions.
        </p>
        <PromptBlock>{WEEKEND_1_PROMPT}</PromptBlock>
      </section>

      <section id="weekend-2" style={{ scrollMarginTop: 16, marginTop: 48 }}>
        <h2>Weekend 2 Prompt</h2>

        <div className="card">
          <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>
            Weekend 1 → Weekend 2: What We Changed and Why
          </h3>
          <p>
            After watching all six models make their Weekend 1 predictions, a few things became
            clear that shaped how we approached Weekend 2.
          </p>
          <p>
            The biggest issue was recency. Some models leaned heavily on Phish&apos;s greatest hits
            catalog without much evidence they had considered what the band has actually been
            playing in 2024 and 2025. So for Weekend 2 we added explicit guidance to make sure
            every model knew recent tour history existed and encouraged them to go find it if they
            could.
          </p>
          <p>
            We also stopped telling the models what not to predict. The original prompt told them
            Phish rarely repeats songs in a run. That&apos;s true — but figuring that out is part
            of the challenge. A model that reasons its way to that conclusion is demonstrating
            something more interesting than one that was just told the rule. So we replaced that
            with a nudge to think about historical residency patterns and let them work it out.
          </p>
          <p>
            We normalized prediction volume. Weekend 1 saw some models predicting 40+ songs and
            others predicting 20. That creates an unfair scoring advantage for high-volume
            predictors, so Weekend 2 caps predictions at 20-30 songs total (7-10 per show).
          </p>
          <p>
            We also personalized each model&apos;s prompt. Every model going into Weekend 2 sees
            the current standings, what was actually played in Weekend 1, and their own specific
            Weekend 1 predictions and score. This levels the playing field — models with
            conversation memory no longer have an advantage over those without it.
          </p>
          <p>
            Finally, we asked every model to use its extended thinking or reasoning mode. This is
            a harder prediction task than it looks, and we wanted to give each model its best
            shot.
          </p>
        </div>

        <h3 style={{ marginTop: 32 }}>The template (with placeholders)</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Each model&apos;s actual prompt is built from this template, with the bracketed sections
          filled in using that model&apos;s own Weekend 1 predictions, score, and the live
          standings.
        </p>
        <PromptBlock>{WEEKEND_2_TEMPLATE}</PromptBlock>

        <h3 style={{ marginTop: 32 }}>Example: Claude&apos;s personalized Weekend 2 prompt</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Below is exactly what was sent to Claude — standings, Weekend 1 actuals, Claude&apos;s
          own Weekend 1 picks, and Claude&apos;s Weekend 1 score, all filled in.
        </p>
        {claudeWeekend2 ? (
          <PromptBlock>{claudeWeekend2}</PromptBlock>
        ) : (
          <div className="empty">
            <p>Claude&apos;s Weekend 2 prompt isn&apos;t available yet.</p>
            <p className="muted">
              Run <code>npm run generate-prompts</code> to produce{' '}
              <code>/prompts/weekend2_claude.md</code>.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
