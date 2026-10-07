import { gcd, normalizeRational } from '../domain/rational/rational';
import type { ParsedAnswer } from '../domain/question/types';

const FRACTION = /^([+-]?)\s*(\d+)\s*\/\s*([+-]?)\s*(\d+)$/;

export type FractionParse = ParsedAnswer | { error: 'ZERO_DENOMINATOR' } | null;

/** "a/b" with optional signs. */
export function parseFraction(raw: string, text: string): FractionParse {
  const m = FRACTION.exec(text);
  if (!m) return null;
  const n = BigInt(m[2] as string);
  const d = BigInt(m[4] as string);
  if (d === 0n) return { error: 'ZERO_DENOMINATOR' };
  const negative = (m[1] === '-') !== (m[3] === '-');
  return {
    raw,
    normalized: `${negative ? '-' : ''}${n}/${d}`,
    value: { type: 'NUMBER', value: normalizeRational(negative ? -n : n, d) },
    form: { kind: 'RATIONAL', lowestTerms: gcd(n, d) === 1n },
  };
}
