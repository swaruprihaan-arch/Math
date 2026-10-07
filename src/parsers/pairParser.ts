import type { Rational } from '../domain/rational/rational';
import type { ParsedAnswer } from '../domain/question/types';
import { parseFraction } from './fractionParser';
import { parseNumberToken } from './numberToken';

const PAIR = /^\(?\s*([^,;()]+?)\s*[,;]\s*([^,;()]+?)\s*\)?$/;

function coordinate(text: string): Rational | null {
  const n = parseNumberToken(text);
  if (n) return n.value;
  const f = parseFraction(text, text);
  return f && 'value' in f && f.value.type === 'NUMBER' ? f.value.value : null;
}

/** "(3, -2)", "3,-2", "(1/2; 4)". */
export function parsePair(raw: string, text: string): ParsedAnswer | null {
  const m = PAIR.exec(text);
  if (!m) return null;
  const x = coordinate(m[1] as string);
  const y = coordinate(m[2] as string);
  if (!x || !y) return null;
  return { raw, normalized: `(${m[1]}, ${m[2]})`, value: { type: 'PAIR', x, y }, form: { kind: 'ORDERED_PAIR' } };
}
