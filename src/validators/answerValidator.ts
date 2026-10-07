/**
 * Grade one submission: PARSING → (INVALID_INPUT | VALIDATING → CORRECT | INCORRECT)   (spec §060)
 */
import type { ParsedAnswer, Question } from '../domain/question/types';
import { parseAnswer } from '../parsers/parseAnswer';
import { evaluateEquivalence } from './equivalence';

export type GradeStatus = 'INVALID_INPUT' | 'CORRECT' | 'INCORRECT';

export interface GradeResult {
  readonly status: GradeStatus;
  readonly parsed: ParsedAnswer | null;
  /** Explanation for INVALID_INPUT (syntax problem or a form requirement). */
  readonly message: string;
  /** True when the value was right but the written form was not accepted. */
  readonly formMismatch: boolean;
}

export function gradeSubmission(rawInput: string, question: Question): GradeResult {
  const parse = parseAnswer(rawInput, question.answerSchema);
  if (!parse.ok) {
    return { status: 'INVALID_INPUT', parsed: null, message: parse.message, formMismatch: false };
  }
  const parsed = parse.answer;
  const policy = question.validationPolicy;
  if (policy.strictMixed && parsed.form.kind === 'MIXED_NUMBER' && parsed.form.properMixedPart === false) {
    return {
      status: 'INVALID_INPUT',
      parsed,
      message: 'Strict mixed: the fraction part of a mixed number must be proper (numerator < denominator).',
      formMismatch: false,
    };
  }
  if (question.answerSchema.requirePeriod && parsed.value.type === 'TIME' && !parsed.value.period) {
    return { status: 'INVALID_INPUT', parsed, message: 'Include a.m. or p.m., for example 3:05 PM.', formMismatch: false };
  }
  const verdict = evaluateEquivalence(parsed, question.canonicalAnswer, policy);
  switch (verdict.verdict) {
    case 'EQUIVALENT':
      return { status: 'CORRECT', parsed, message: '', formMismatch: false };
    case 'NON_EQUIVALENT':
      return { status: 'INCORRECT', parsed, message: '', formMismatch: false };
    case 'FORM_MISMATCH':
      return { status: 'INVALID_INPUT', parsed, message: verdict.message, formMismatch: true };
  }
}
