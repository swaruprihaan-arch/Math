import type { ParsedAnswer } from '../domain/question/types';
import { parseNumberToken } from './numberToken';

/** Accepts "4.75", ".5", "-0.25", "12." — anything with a decimal point. */
export function parseDecimal(raw: string, text: string): ParsedAnswer | null {
  if (!text.includes('.')) return null;
  const n = parseNumberToken(text);
  if (!n) return null;
  return { raw, normalized: text, value: { type: 'NUMBER', value: n.value }, form: { kind: 'DECIMAL', decimalDigits: n.decimalDigits } };
}
