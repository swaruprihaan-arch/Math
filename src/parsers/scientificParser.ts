import { absR, cmp, mul, pow, rat } from '../domain/rational/rational';
import type { ParsedAnswer } from '../domain/question/types';
import { superscriptsToCaret } from './normalize';
import { parseNumberToken } from './numberToken';

const SCI_TIMES = /^(.+?)\s*(?:×|x|X|\*|·|⋅)\s*10\s*(?:\^|\*\*)\s*\(?\s*([+-]?\d+)\s*\)?$/;
const SCI_E = /^([+-]?(?:\d+\.?\d*|\.\d+))[eE]([+-]?\d+)$/;

/** "4.5 × 10^6", "4.5 x 10⁶", "4.5*10**6", "4.5e6". Value is exact. */
export function parseScientific(raw: string, text: string): ParsedAnswer | null {
  const t = superscriptsToCaret(text);
  const m = SCI_TIMES.exec(t) ?? SCI_E.exec(t);
  if (!m) return null;
  const coef = parseNumberToken(m[1] as string);
  if (!coef) return null;
  const exponent = Number(m[2]);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 400) return null;
  const value = mul(coef.value, pow(rat(10), exponent));
  const magnitude = absR(coef.value);
  const normalizedScientific = cmp(magnitude, rat(1)) >= 0 && cmp(magnitude, rat(10)) < 0;
  return {
    raw,
    normalized: `${m[1]} x 10^${exponent}`,
    value: { type: 'NUMBER', value },
    form: { kind: 'SCIENTIFIC', normalizedScientific },
  };
}
