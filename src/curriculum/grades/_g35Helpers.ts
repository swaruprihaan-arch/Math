/**
 * Local helpers for grade 3–5 skills. Pure functions; no randomness of their own.
 */
import type { AnswerValue, PromptNode, SolutionTree } from '../../domain/question/types';
import { P, solution, step } from '../../domain/question/build';

/** Round a non-negative integer to the nearest multiple of `place` (half up, as taught in school). */
export function roundToPlace(n: number, place: number): number {
  return Math.floor((n + place / 2) / place) * place;
}

export const PLACE_NAMES: Record<number, string> = {
  10: 'ten',
  100: 'hundred',
  1000: 'thousand',
  10000: 'ten thousand',
  100000: 'hundred thousand',
};

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function below1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) parts.push(`${ONES[h]} hundred`);
  if (rest > 0) {
    if (rest < 20) parts.push(ONES[rest] as string);
    else {
      const t = Math.floor(rest / 10);
      const o = rest % 10;
      parts.push(o === 0 ? (TENS[t] as string) : `${TENS[t]}-${ONES[o]}`);
    }
  }
  return parts.join(' ');
}

/** Number name for 0 ≤ n < 1,000,000, e.g. 43025 → "forty-three thousand, twenty-five". */
export function numberToWords(n: number): string {
  if (n === 0) return 'zero';
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (thousands > 0) parts.push(`${below1000(thousands)} thousand`);
  if (rest > 0) parts.push(below1000(rest));
  return parts.join(', ');
}

/** Add minutes to a 12-hour clock time (no a.m./p.m.). */
export function addMinutes(hour: number, minute: number, delta: number): { hour: number; minute: number } {
  const total = ((((hour % 12) * 60 + minute + delta) % 720) + 720) % 720;
  const h = Math.floor(total / 60);
  return { hour: h === 0 ? 12 : h, minute: total % 60 };
}

export function formatClock(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

/** "a × b" as prompt nodes. */
export function product(a: number, b: number): PromptNode[] {
  return [P.num(a), P.op('×'), P.num(b)];
}

/** Divisors of n (ascending). */
export function divisors(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}

/** Build a titled strategy from short lines (strings become text steps); the last line is the RESULT step. */
export function tree(strategy: string, title: string, lines: readonly (string | PromptNode[])[], result: AnswerValue): SolutionTree {
  return solution(
    strategy,
    lines.map((line, i) => step(typeof line === 'string' ? [P.text(line)] : line, i === lines.length - 1 ? 'RESULT' : 'EXPLAIN')),
    result,
    title,
  );
}

/** Make strategy ids unique (works around shared builders that can repeat an id). */
export function uniqueStrategies(trees: readonly SolutionTree[]): SolutionTree[] {
  const seen = new Map<string, number>();
  return trees.map((t) => {
    const n = (seen.get(t.strategy) ?? 0) + 1;
    seen.set(t.strategy, n);
    return n === 1 ? t : { ...t, strategy: `${t.strategy}_${n}` };
  });
}
