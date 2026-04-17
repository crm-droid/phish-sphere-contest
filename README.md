# LLM Phish Sphere Prediction Contest

A website that tracks 6 AI language models competing to predict Phish setlists for the 9-show Las Vegas Sphere residency (April–May 2026).

Built with Next.js. Data lives in flat CSV files under `/data`. A Node script reads those CSVs and produces `scores.json`, which the website renders.

---

## For the non-developer: running this locally

### One-time setup (first time only)

1. Install **Node.js 18 or newer** from <https://nodejs.org>.
2. Open Terminal.
3. `cd` into this folder (the one containing this README).
4. Run:
   ```
   npm install
   ```
   This downloads dependencies into `node_modules/`. It can take a minute.

### Every time you want to see the site locally

```
npm run dev
```

Then open <http://localhost:3000> in your browser. The site updates as you edit files.

Press `Ctrl+C` in the Terminal to stop the dev server.

---

## Adding data files

All data is plain text CSV. You can edit it in Excel, Google Sheets, or a text editor — just make sure you save as CSV.

### 1. Add model predictions

Drop prediction CSVs into `/data/predictions/` using this naming pattern:

```
weekend1_claude.csv
weekend1_chatgpt.csv
weekend2_claude.csv
...
```

**Filename format:** `weekend{1|2|3}_{modelname}.csv`

**Columns (with a header row):**

```
Weekend_Number,Show_Number,Show_Date,Song_Title,Confidence,Set_Placement
```

- `Confidence` is 1–5
- `Set_Placement` is one of `Set1`, `Set2`, `Encore`, or blank

### 2. Add actual setlists (after each show)

Drop actual-setlist CSVs into `/data/actuals/`:

```
show1_actual.csv
show2_actual.csv
...
show9_actual.csv
```

**Columns:**

```
Show_Number,Show_Date,Song_Title,Set_Placement,Position
```

- `Set_Placement` is `Set1`, `Set2`, or `Encore`
- `Position` is `Opener`, `Closer`, `Encore`, or blank for mid-set songs

### 3. Run the scoring script

```
npm run score
```

This reads every CSV in `/data/predictions` and `/data/actuals`, calculates scores, and writes `/data/scores/scores.json`. The website reads from that file.

Run this command every time you add or edit CSV files.

---

## Scoring rules

See the About page on the site, or:

- **10 pts** per correct song in the correct show
- **+2 pts** correct Set1/Set2 placement
- **+3 pts** correct set opener
- **+3 pts** correct set closer
- **+5 pts** correct encore song
- Final score **× (Confidence / 3)** (so Confidence 5 = 1.67×, Confidence 1 = 0.33×)

---

## Folder layout

```
/app                  # Next.js pages (leaderboard, shows, weekends, about)
/lib                  # Helpers to read data for the site
/scripts
  score.js            # The scoring engine
/data
  /predictions        # Your prediction CSVs go here
  /actuals            # Your actual-setlist CSVs go here
  /scores
    scores.json       # Auto-generated — do not edit by hand
/public               # Static assets
```

---

## Empty state

The site works even with no data files present. Each page shows an "add your CSVs" message until `scores.json` has content.

---

## Deploying to Vercel (later)

1. Push this folder to a GitHub repo.
2. At <https://vercel.com>, "Import Project" and point it at the repo.
3. Default Next.js settings work out of the box.
4. After any new CSV + score run locally, commit and push — Vercel redeploys automatically.

---

## Commands cheat sheet

| Command | What it does |
|---|---|
| `npm install` | First-time dependency install |
| `npm run dev` | Start the local website on <http://localhost:3000> |
| `npm run score` | Recompute `scores.json` from all CSVs |
| `npm run build` | Production build (used by Vercel) |
| `npm run start` | Serve the production build locally |
