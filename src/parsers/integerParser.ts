import type { ParsedAnswer } from '../domain/question/types';
import { parseNumberToken } from './numberToken';

export function parseInteger(raw: string, text: string): ParsedAnswer | null {
  const n = parseNumberToken(text);
  if (!n || !n.isInteger) return null;
  return { raw, normalized: text, value: { type: 'NUMBER', value: n.value }, form: { kind: 'INTEGER' } };
}
