// names on the snake leaderboard. anyone can type one, so it's checked here, in the
// browser for quick feedback and again in the worker (worker/live-stats.mjs) before
// it's stored. the word filter is the obscenity package, which sees through letter
// swaps (sh1t) and stretched letters (fuuuck) without blocking normal words that
// happen to contain a bad one (assassin, scunthorpe)
import { DataSet, RegExpMatcher, englishDataset, englishRecommendedTransformers, pattern } from 'obscenity';

export const maxNameLength = 12;

// its english list, plus a couple of names it doesn't cover
const words = new DataSet()
  .addAll(englishDataset)
  .addPhrase(phrase => phrase.addPattern(pattern`nazi`))
  .addPhrase(phrase => phrase.addPattern(pattern`hitler`));
const matcher = new RegExpMatcher({ ...words.build(), ...englishRecommendedTransformers });

const tidy = input => String(input ?? '').trim().replace(/\s+/g, ' ');

// why a name can't be used, or '' if it's fine. an empty name is fine: it's anonymous
export function nameProblem(input) {
  const name = tidy(input);
  if (!name) return '';
  if (name.length > maxNameLength) return `Keep it to ${maxNameLength} characters.`;
  if (!/^[A-Za-z0-9 _.-]+$/.test(name)) return 'Letters, numbers, spaces, dots, dashes and underscores only.';
  if (matcher.hasMatch(name)) return 'Pick a friendlier name.';
  return '';
}

// the name to store, or '' when it's blank or not allowed
export function cleanName(input) {
  const name = tidy(input);
  return name && !nameProblem(name) ? name : '';
}
