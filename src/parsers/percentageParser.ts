import { div, rat } from '../domain/rational/rational';
import type { ParsedAnswer } from '../domain/question/types';
import { parseNumberToken } from './numberToken';

const PERCENT = /^(.+?)\s*(?:%|percent)$/i;

/** "35%", "12.5 percent"; with percentContext a bare number also counts as a percent. Value is the fraction (35% → 7/20). */
export function parsePercentage(raw: string, text: string, percentContext: boolean): ParsedAnswer | null {
  const m = PERCENT.exec(text);
  const body = m ? (m[1] as string) : percentContext ? text : null;
  if (body === null) return null;
  const n = parseNumberToken(body);
  if (!n) return null;
  return {
    raw,
    normalized: `${body}%`,
    value: { type: 'NUMBER', value: div(n.value, rat(100)) },
    form: { kind: 'PERCENTAGE', decimalDigits: n.decimalDigits },
  };
}
