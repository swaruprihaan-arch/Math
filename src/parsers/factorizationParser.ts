import { isPrime } from '../domain/rational/rational';
import type { ParsedAnswer } from '../domain/question/types';
import { superscriptsToCaret } from './normalize';

const FACTOR = /^(\d+)(?:\s*\^\s*(\d+))?$/;

/** "2 × 2 × 2 × 3", "2*2*2*3", "2x2x2x3", "2^3 × 3", "2³ · 3". */
export function parseFactorization(raw: string, text: string): ParsedAnswer | null {
  const t = superscriptsToCaret(text);
  const tokens = t.split(/\s*(?:×|x|X|\*|·|⋅)\s*/);
  if (tokens.length === 0) return null;
  let product = 1n;
  let allPrime = true;
  for (const token of tokens) {
    const m = FACTOR.exec(token.trim());
    if (!m) return null;
    const base = Number(m[1]);
    const exp = m[2] !== undefined ? Number(m[2]) : 1;
    if (!Number.isSafeInteger(base) || exp < 1 || exp > 64) return null;
    if (!isPrime(base)) allPrime = false;
    product *= BigInt(base) ** BigInt(exp);
  }
  return {
    raw,
    normalized: tokens.join(' x '),
    value: { type: 'NUMBER', value: { numerator: product, denominator: 1n } },
    form: { kind: 'FACTORIZATION', allPrimeFactors: allPrime },
  };
}
