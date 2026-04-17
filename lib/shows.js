export const SHOWS = [
  { number: 1, date: '2026-04-16', day: 'Thu', weekend: 1 },
  { number: 2, date: '2026-04-17', day: 'Fri', weekend: 1 },
  { number: 3, date: '2026-04-18', day: 'Sat', weekend: 1 },
  { number: 4, date: '2026-04-24', day: 'Thu', weekend: 2 },
  { number: 5, date: '2026-04-25', day: 'Fri', weekend: 2 },
  { number: 6, date: '2026-04-26', day: 'Sat', weekend: 2 },
  { number: 7, date: '2026-04-30', day: 'Thu', weekend: 3 },
  { number: 8, date: '2026-05-01', day: 'Fri', weekend: 3 },
  { number: 9, date: '2026-05-02', day: 'Sat', weekend: 3 },
];

export const WEEKENDS = [1, 2, 3];

// Canonical competing models. Filenames in /data/predictions must use one of
// these short names (e.g. weekend1_claude.csv). Any CSV using a name not in
// this list will be ignored by the scoring script.
export const MODELS = [
  { id: 'claude', label: 'Claude (Anthropic)' },
  { id: 'chatgpt', label: 'ChatGPT (OpenAI)' },
  { id: 'gemini', label: 'Gemini (Google)' },
  { id: 'perplexity', label: 'Perplexity AI' },
  { id: 'grok', label: 'Grok (xAI)' },
  { id: 'metaai', label: 'Meta AI (Llama)' },
];

export const MODEL_IDS = MODELS.map((m) => m.id);

export function getShow(n) {
  return SHOWS.find((s) => s.number === Number(n));
}

export function getShowsForWeekend(w) {
  return SHOWS.filter((s) => s.weekend === Number(w));
}
