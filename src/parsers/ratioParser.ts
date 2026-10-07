import { gcd, isInteger, type Rational } from '../domain/rational/rational';
import type { ParsedAnswer } from '../domain/question/types';
import { parseNumberToken } from './numberToken';

const RATIO = /^(.+?)\s*(?::|\bto\b)\s*(.+)$/i;
const SLASH = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/;

function lowest(a: Rational, b: Rational): boolean {
  if (!isInteger(a) || !isInteger(b)) return false;
  return gcd(a.numerator, b.numerator) === 1n;
}

/** "3:5", "3 : 5", "3 to 5"; when allowSlash, "3/5" is read as the ratio 3:5. */
export function parseRatio(raw: string, text: string, allowSlash: boolean): ParsedAnswer | null {
  const m = RATIO.exec(text) ?? (allowSlash ? SLASH.exec(text) : null);
  if (!m) return null;
  const a = parseNumberToken(m[1] as string);
  const b = parseNumberToken(m[2] as string);
  if (!a || !b) return null;
  return {
    raw,
    normalized: `${m[1]}:${m[2]}`,
    value: { type: 'RATIO', first: a.value, second: b.value },
    form: { kind: 'RATIO', lowestTerms: lowest(a.value, b.value) },
  };
}
