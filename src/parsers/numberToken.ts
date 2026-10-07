import { normalizeRational, type Rational } from '../domain/rational/rational';
import { NUMBER_PATTERN } from './normalize';

const FULL_NUMBER = new RegExp(`^(?:${NUMBER_PATTERN})$`);

/** Parse a signed integer/decimal token exactly ("1,234.50" → 123450/100). Returns null if the text is not a plain number. */
export function parseNumberToken(text: string): { value: Rational; decimalDigits: number; isInteger: boolean } | null {
  const t = text.trim();
  if (!FULL_NUMBER.test(t)) return null;
  const negative = t.startsWith('-');
  const body = t.replace(/^[+-]/, '').replace(/,/g, '');
  const [intPart, fracPartRaw] = body.split('.');
  const fracPart = fracPartRaw ?? '';
  const scale = 10n ** BigInt(fracPart.length);
  const magnitude = BigInt(intPart === '' || intPart === undefined ? '0' : intPart) * scale + (fracPart ? BigInt(fracPart) : 0n);
  return {
    value: normalizeRational(negative ? -magnitude : magnitude, scale),
    decimalDigits: fracPart.length,
    isInteger: fracPartRaw === undefined,
  };
}
