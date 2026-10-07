import type { ParsedAnswer } from '../domain/question/types';

const QR = /^(\d+)\s*(?:r|rem|remainder)\.?\s*(\d+)$/i;
const PLAIN = /^(\d+)$/;

/** "8 R 3", "8r3", "8 remainder 3"; a plain "8" means remainder 0. */
export function parseQuotientRemainder(raw: string, text: string): ParsedAnswer | null {
  const m = QR.exec(text) ?? PLAIN.exec(text);
  if (!m) return null;
  const quotient = BigInt(m[1] as string);
  const remainder = m[2] !== undefined ? BigInt(m[2]) : 0n;
  return {
    raw,
    normalized: remainder === 0n ? `${quotient}` : `${quotient} R ${remainder}`,
    value: { type: 'QR', quotient, remainder },
    form: { kind: 'QUOTIENT_REMAINDER' },
  };
}
