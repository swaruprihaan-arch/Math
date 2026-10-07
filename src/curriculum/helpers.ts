/**
 * Shared helpers for grade-level skills. Pure functions of a RandomSource — no Math.random.
 */
import type { ChoiceOption } from '../domain/question/types';
import type { RandomSource } from '../domain/random/random';
import { cmp, rat, type Rational } from '../domain/rational/rational';

export const NAMES: readonly string[] = [
  'Rihaan', 'Maya', 'Diego', 'Aisha', 'Ethan', 'Sofia', 'Kenji', 'Priya', 'Lucas', 'Amara',
  'Noah', 'Lena', 'Mateo', 'Zara', 'Omar', 'Chloe', 'Arjun', 'Nia', 'Leo', 'Hana',
  'Ava', 'Kai', 'Isabella', 'Samir', 'Grace', 'Malik', 'Elena', 'Ravi', 'Lily', 'Jamal',
];

export interface ItemNoun {
  readonly emoji: string;
  readonly singular: string;
  readonly plural: string;
}

export const COUNTABLE_ITEMS: readonly ItemNoun[] = [
  { emoji: '🍎', singular: 'apple', plural: 'apples' },
  { emoji: '⭐', singular: 'star', plural: 'stars' },
  { emoji: '🐟', singular: 'fish', plural: 'fish' },
  { emoji: '🌸', singular: 'flower', plural: 'flowers' },
  { emoji: '🚗', singular: 'car', plural: 'cars' },
  { emoji: '🎈', singular: 'balloon', plural: 'balloons' },
  { emoji: '🐞', singular: 'ladybug', plural: 'ladybugs' },
  { emoji: '🍪', singular: 'cookie', plural: 'cookies' },
  { emoji: '⚽', singular: 'ball', plural: 'balls' },
  { emoji: '🦆', singular: 'duck', plural: 'ducks' },
  { emoji: '🍓', singular: 'strawberry', plural: 'strawberries' },
  { emoji: '✏️', singular: 'pencil', plural: 'pencils' },
];

export function pickName(rng: RandomSource): string {
  return rng.choose(NAMES);
}

export function pickNames(rng: RandomSource, k: number): string[] {
  return rng.sample(NAMES, k);
}

export function pickItem(rng: RandomSource): ItemNoun {
  return rng.choose(COUNTABLE_ITEMS);
}

export function plural(n: number | bigint, singular: string, pluralForm = `${singular}s`): string {
  return BigInt(n) === 1n ? singular : pluralForm;
}

/** Comparison symbol id for a ? b, matching COMPARE_CHOICES ids. */
export function compareSymbol(a: Rational, b: Rational): '<' | '=' | '>' {
  const c = cmp(a, b);
  return c < 0 ? '<' : c > 0 ? '>' : '=';
}

/**
 * Build shuffled multiple-choice options from the correct label and distractor labels.
 * Duplicates of the correct label are dropped. Ids are "c0".."cN" in shuffled order.
 */
export function makeChoices(rng: RandomSource, correctLabel: string, distractors: readonly string[], maxOptions = 4): { choices: ChoiceOption[]; correctId: string } {
  const unique: string[] = [];
  for (const d of distractors) {
    if (d !== correctLabel && !unique.includes(d)) unique.push(d);
  }
  const picked = rng.shuffle(unique).slice(0, Math.max(1, maxOptions - 1));
  const labels = rng.shuffle([correctLabel, ...picked]);
  const choices = labels.map((label, i) => ({ id: `c${i}`, label }));
  const correctId = choices.find((c) => c.label === correctLabel)?.id as string;
  return { choices, correctId };
}

/** Fixed (unshuffled) choices whose ids are the labels themselves, e.g. Yes/No, Prime/Composite. */
export function fixedChoices(labels: readonly string[]): ChoiceOption[] {
  return labels.map((label) => ({ id: label.toLowerCase().replace(/\s+/g, '-'), label }));
}

export function randomProperFraction(rng: RandomSource, minDen: number, maxDen: number): Rational {
  const d = rng.integer(minDen, maxDen);
  const n = rng.integer(1, d - 1);
  return rat(n, d);
}

/** Integer in [min, max] that is not zero. */
export function nonZeroInteger(rng: RandomSource, min: number, max: number): number {
  const v = rng.integer(min, max - (min <= 0 && max >= 0 ? 1 : 0));
  return min <= 0 && max >= 0 && v >= 0 ? v + 1 : v;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
