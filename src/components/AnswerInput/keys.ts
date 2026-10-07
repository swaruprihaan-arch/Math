import type { Question } from '../../domain/question/types';

export interface KeyDef {
  /** What the key inserts (or a command). */
  readonly value: string;
  readonly label: string;
  readonly aria: string;
  readonly wide?: boolean;
}

const has = (q: Question, k: string) => q.answerSchema.accepts.includes(k as never);

function negativesPossible(q: Question): boolean {
  const a = q.canonicalAnswer;
  if (a.type === 'NUMBER' && a.value.numerator < 0n) return true;
  if (a.type === 'PAIR' || a.type === 'LINEAR') return true;
  if (q.operands.some((o) => o.value.type === 'NUMBER' && o.value.value.numerator < 0n)) return true;
  return q.standards.some((s) => /^(6\.NS|7\.|8\.)/.test(s));
}

/** Extra keys (beyond 0–9) this question needs. */
export function extraKeys(q: Question, fractionWidget: boolean): KeyDef[] {
  const keys: KeyDef[] = [];
  if (!fractionWidget) {
    if (has(q, 'DECIMAL') || q.answerSchema.units?.includes('$')) keys.push({ value: '.', label: '.', aria: 'point' });
    if (has(q, 'RATIONAL') || has(q, 'MIXED_NUMBER')) {
      keys.push({ value: '/', label: '/', aria: 'fraction bar' });
      if (has(q, 'MIXED_NUMBER')) keys.push({ value: ' ', label: '␣', aria: 'space' });
    }
    if (has(q, 'RATIO') || has(q, 'TIME')) keys.push({ value: ':', label: ':', aria: 'colon' });
    if (has(q, 'PERCENTAGE')) keys.push({ value: '%', label: '%', aria: 'percent' });
    if (has(q, 'QUOTIENT_REMAINDER')) keys.push({ value: ' R ', label: 'R', aria: 'remainder' });
    if (has(q, 'ORDERED_PAIR')) keys.push({ value: '(', label: '(', aria: 'open parenthesis' }, { value: ',', label: ',', aria: 'comma' }, { value: ')', label: ')', aria: 'close parenthesis' });
    if (has(q, 'SCIENTIFIC')) keys.push({ value: ' x 10^', label: '×10ⁿ', aria: 'times ten to the power', wide: true });
    if (has(q, 'FACTORIZATION')) keys.push({ value: ' x ', label: '×', aria: 'times' }, { value: '^', label: '^', aria: 'to the power' });
    if (has(q, 'EXPRESSION')) {
      const v = q.answerSchema.variable ?? 'x';
      keys.push({ value: v, label: v, aria: `variable ${v}` }, { value: ' + ', label: '+', aria: 'plus' });
    }
    if (has(q, 'TIME') && q.answerSchema.requirePeriod) keys.push({ value: ' AM', label: 'AM', aria: 'a m' }, { value: ' PM', label: 'PM', aria: 'p m' });
  }
  if (negativesPossible(q)) keys.push({ value: '-', label: '−', aria: 'minus' });
  return keys;
}

export function symbolsForHandwriting(q: Question): string {
  let s = '';
  if (has(q, 'DECIMAL') || q.answerSchema.units?.includes('$')) s += '.';
  if (negativesPossible(q)) s += '-';
  if (has(q, 'RATIONAL') && q.answerSchema.widget !== 'FRACTION') s += '/';
  if (has(q, 'TIME') || has(q, 'RATIO')) s += ':';
  return s;
}
