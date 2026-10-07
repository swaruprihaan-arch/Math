import { fromMixed, gcd } from '../domain/rational/rational';
import type { ParsedAnswer } from '../domain/question/types';

/** "w n/d" — the sign applies to the whole mixed number: "-2 1/3" = -(2 + 1/3) = -7/3. */
const MIXED = /^([+-]?)\s*(\d+)\s+(?:and\s+)?(\d+)\s*\/\s*(\d+)$/i;

export type MixedParse = ParsedAnswer | { error: 'ZERO_DENOMINATOR' } | null;

export function parseMixedNumber(raw: string, text: string): MixedParse {
  const m = MIXED.exec(text);
  if (!m) return null;
  const whole = BigInt(m[2] as string);
  const n = BigInt(m[3] as string);
  const d = BigInt(m[4] as string);
  if (d === 0n) return { error: 'ZERO_DENOMINATOR' };
  const negative = m[1] === '-';
  return {
    raw,
    normalized: `${negative ? '-' : ''}${whole} ${n}/${d}`,
    value: { type: 'NUMBER', value: fromMixed(negative ? -1 : 1, whole, n, d) },
    form: { kind: 'MIXED_NUMBER', properMixedPart: n < d, lowestTerms: n === 0n || gcd(n, d) === 1n },
  };
}
