import { add, rat, ZERO, type Rational } from '../domain/rational/rational';
import type { ParsedAnswer } from '../domain/question/types';
import { parseFraction } from './fractionParser';
import { parseNumberToken } from './numberToken';

export type ExpressionParse = ParsedAnswer | { error: 'PARENTHESES' } | null;

function coefficientOf(text: string): Rational | null {
  if (text === '' || text === '+') return rat(1);
  if (text === '-') return rat(-1);
  const n = parseNumberToken(text);
  if (n) return n.value;
  const f = parseFraction(text, text);
  return f && 'value' in f && f.value.type === 'NUMBER' ? f.value.value : null;
}

/**
 * Linear expression in one variable: "6x - 12", "-12 + 6x", "x", "3*x + 2 - x" (like terms not combined).
 * Parentheses are rejected with a dedicated error so the student can be told to expand.
 */
export function parseLinearExpression(raw: string, text: string, variable: string): ExpressionParse {
  if (/[()[\]]/.test(text)) return { error: 'PARENTHESES' };
  const v = variable.toLowerCase();
  const compact = text.toLowerCase().replace(/\s+/g, '').replace(/[*·⋅×]/g, '');
  if (compact === '' || /[+-]$/.test(compact)) return null;
  const terms = compact.match(/[+-]?[^+-]+/g);
  if (!terms) return null;
  let coefficient = ZERO;
  let constant = ZERO;
  let variableTerms = 0;
  let constantTerms = 0;
  for (const term of terms) {
    if (term.endsWith(v)) {
      const coefText = term.slice(0, -v.length);
      // allow "x/2" style? keep simple: coefficient must precede variable
      const c = coefficientOf(coefText);
      if (!c) return null;
      coefficient = add(coefficient, c);
      variableTerms++;
    } else if (term.includes(v) && /\/\d+$/.test(term)) {
      // "x/2" or "3x/4"
      const [num, den] = term.split('/');
      const c = coefficientOf((num ?? '').slice(0, -v.length));
      const d = parseNumberToken(den ?? '');
      if (!c || !d || d.value.numerator === 0n) return null;
      coefficient = add(coefficient, rat(c.numerator, c.denominator * d.value.numerator));
      variableTerms++;
    } else {
      if (/[a-z]/.test(term)) return null;
      const c = coefficientOf(term);
      if (!c) return null;
      constant = add(constant, c);
      constantTerms++;
    }
  }
  return {
    raw,
    normalized: compact,
    value: { type: 'LINEAR', variable, coefficient, constant },
    form: { kind: 'EXPRESSION', likeTermsCombined: variableTerms <= 1 && constantTerms <= 1 },
  };
}
