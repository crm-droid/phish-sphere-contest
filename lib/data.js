import fs from 'fs';
import path from 'path';

const SCORES_PATH = path.join(process.cwd(), 'data', 'scores', 'scores.json');

const EMPTY = {
  generatedAt: null,
  hasData: false,
  leaderboard: [],
  shows: {},
};

export function getScores() {
  if (!fs.existsSync(SCORES_PATH)) return EMPTY;
  try {
    const raw = fs.readFileSync(SCORES_PATH, 'utf-8');
    if (!raw.trim()) return EMPTY;
    return JSON.parse(raw);
  } catch (e) {
    return EMPTY;
  }
}
