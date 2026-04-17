# LLM Phish Sphere Prediction Contest

A website that tracks 6 AI language models competing to predict Phish setlists for the 9-show Las Vegas Sphere residency (April–May 2026).

Built with Next.js. Prediction CSVs live under `/data/predictions`. Actual setlists are fetched live from the **phish.net API** at scoring time and are never written to disk or republished on the site.

---

## For the non-developer: running this locally

### One-time setup (first time only)

1. Install **Node.js 18 or newer** from <https://nodejs.org>.
2. Open Terminal and `cd` into the `phish-sphere-contest` folder (the one containing this README).
3. Install dependencies:
   ```
   npm install
   ```
4. **Get a phish.net API key:** create a free account at <https://phish.net>, then go to Account → API and generate a key.
5. **Create your key file.** In the project folder, copy the example:
   ```
   cp .env.local.example .env.local
   ```
   Open `.env.local` in a text editor and replace the placeholder with your real key. `.env.local` is gitignored — your key never goes to GitHub.

### Every time you want to see the site locally

```
npm run dev
```

Open <http://localhost:3000>. Press `Ctrl+C` to stop.

---

## Weekly workflow (what you actually do every weekend)

### 1. Collect predictions (before each weekend)

Send the standard prompt to all 6 models and save each model's CSV output into `/data/predictions/` using the naming pattern:

```
weekend1_claude.csv
weekend1_chatgpt.csv
weekend1_gemini.csv
weekend1_perplexity.csv
weekend1_grok.csv
weekend1_mistral.csv
```

(Then `weekend2_*.csv` before weekend 2, `weekend3_*.csv` before weekend 3.)

**Filename rule:** `weekend{1|2|3}_{model}.csv`. `{model}` must be one of: `claude`, `chatgpt`, `gemini`, `perplexity`, `grok`, `mistral`. The scoring script skips (and warns about) any file that uses a different model name.

**Columns (with a header row):**

```
Weekend_Number,Show_Number,Show_Date,Song_Title,Confidence,Set_Placement
```

- `Show_Date` must be in `YYYY-MM-DD` format
- `Confidence` is 1–5
- `Set_Placement` is `Set1`, `Set2`, `Encore`, or blank

### 2. Score after each show

**After each show ends**, run:

```
npm run score
```

That one command:
1. Reads every CSV in `/data/predictions/`
2. Collects the unique show dates
3. Calls `https://api.phish.net/v5/setlists/showdate/YYYY-MM-DD.json` for each (using your API key)
4. Scores every prediction in memory
5. Writes `/data/scores/scores.json`

The phish.net response is held only in memory during the run — it is never written to disk.

If you run before a show has happened, the script still succeeds; shows without a published setlist simply remain "Not scored yet."

### 3. Push to GitHub

Commit `scores.json` (plus any new CSVs) and push. Vercel redeploys automatically.

```
git add data/ && git commit -m "Score through Show N" && git push
```

---

## Scoring rules

- **10 pts** per correct song in the correct show
- **+2 pts** correct Set1/Set2 placement
- **+3 pts** correct Set1/Set2 opener
- **+3 pts** correct Set1/Set2 closer
- **+5 pts** correct Encore placement
- Final score **× (Confidence / 3)** (Confidence 5 = 1.67×, Confidence 1 = 0.33×)

Full explanation is on the site's About page.

---

## Folder layout

```
/app                  # Next.js pages (leaderboard, shows, weekends, about)
/lib                  # Helpers + model/show constants
/scripts
  score.js            # The scoring engine (calls phish.net live)
/data
  /predictions        # Your prediction CSVs
  /scores
    scores.json       # Auto-generated — do not edit by hand
/public               # Static assets
.env.local            # Your phish.net API key (gitignored)
.env.local.example    # Template
```

**Note:** There is no `/data/actuals` folder. Actual setlist data is fetched live from phish.net at scoring time and never stored.

---

## Empty state

The site works with zero data. Each page shows a placeholder until `scores.json` has content.

---

## Commands cheat sheet

| Command | What it does |
|---|---|
| `npm install` | First-time dependency install |
| `npm run dev` | Local site on <http://localhost:3000> |
| `npm run score` | Fetch setlists from phish.net and recompute `scores.json` |
| `npm run build` | Production build (used by Vercel) |
| `npm run start` | Serve production build locally |

---

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. At <https://vercel.com>, "Import Project" and point it at the repo. Default Next.js settings work.
3. **Important:** In Vercel → Project Settings → Environment Variables, add:
   - Name: `PHISH_NET_API_KEY`
   - Value: (your key)
   - Scope: Production + Preview + Development
4. Push new CSVs + new `scores.json` whenever you re-score. Vercel redeploys automatically.
