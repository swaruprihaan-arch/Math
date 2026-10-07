import { describe, expect, it } from 'vitest';
import { A, buildQuestion, P, prompt, SCHEMA, solution, step } from '../../domain/question/build';
import type { AnswerSchema, AnswerValue, ValidationPolicy } from '../../domain/question/types';
import { createSeededRandom } from '../../domain/random/random';
import { rat } from '../../domain/rational/rational';
import { gradeSubmission } from '../../validators/answerValidator';

function q(answer: AnswerValue, schema: AnswerSchema, policy: ValidationPolicy = {}) {
  return buildQuestion(
    {
      topic: 'FRACTIONS',
      subtype: 'test',
      difficulty: 'MEDIUM',
      prompt: prompt([P.text('test')]),
      operation: 'TEST',
      canonicalAnswer: answer,
      answerSchema: schema,
      validationPolicy: policy,
      solution: solution('TEST', [step([P.text('x')])], answer),
      generatorId: 'test',
      generatorVersion: '1',
    },
    createSeededRandom('t'),
  );
}

describe('gradeSubmission (spec §060)', () => {
  const fractionQ = q(A.number(rat(17, 12)), SCHEMA.fraction());
  it('accepts every representation of 17/12 by value', () => {
    for (const t of ['17/12', '34/24', '1 5/12']) expect(gradeSubmission(t, fractionQ).status).toBe('CORRECT');
  });
  it('wrong value is INCORRECT', () => {
    expect(gradeSubmission('15/12', fractionQ).status).toBe('INCORRECT');
  });
  it('unreadable input is INVALID_INPUT, never INCORRECT', () => {
    expect(gradeSubmission('twelve-ish', q(A.number(48), SCHEMA.integer())).status).toBe('INVALID_INPUT');
  });
  it('lowest-terms policy turns an equal but unsimplified answer into a form hint', () => {
    const strict = q(A.number(rat(3, 4)), SCHEMA.fraction(), { requireLowestTerms: true });
    const r = gradeSubmission('6/8', strict);
    expect(r.status).toBe('INVALID_INPUT');
    expect(r.formMismatch).toBe(true);
    expect(gradeSubmission('3/4', strict).status).toBe('CORRECT');
  });
  it('strict mixed rejects an improper fractional part as invalid input', () => {
    const strict = q(A.number(rat(11, 4)), SCHEMA.fraction(), { strictMixed: true });
    expect(gradeSubmission('1 7/4', strict).status).toBe('INVALID_INPUT');
    expect(gradeSubmission('2 3/4', strict).status).toBe('CORRECT');
    const loose = q(A.number(rat(11, 4)), SCHEMA.fraction(), { strictMixed: false });
    expect(gradeSubmission('1 7/4', loose).status).toBe('CORRECT');
  });
  it('required form: converting to a mixed number', () => {
    const toMixed = q(A.number(rat(13, 5)), SCHEMA.fraction(), { requiredForms: ['MIXED_NUMBER'] });
    expect(gradeSubmission('13/5', toMixed).status).toBe('INVALID_INPUT');
    expect(gradeSubmission('2 3/5', toMixed).status).toBe('CORRECT');
  });
  it('decimal tolerance is computed exactly', () => {
    const word = q(A.number(rat(10, 21)), SCHEMA.anyNumber(), { decimalTolerancePlaces: 3 });
    expect(gradeSubmission('0.476', word).status).toBe('CORRECT');
    expect(gradeSubmission('0.48', word).status).toBe('INCORRECT');
    expect(gradeSubmission('10/21', word).status).toBe('CORRECT');
  });
  it('equivalent ratios are accepted', () => {
    const ratio = q(A.ratio(3, 5), SCHEMA.ratio());
    expect(gradeSubmission('6:10', ratio).status).toBe('CORRECT');
    expect(gradeSubmission('5:3', ratio).status).toBe('INCORRECT');
  });
  it('scientific notation must be normalized when required', () => {
    const sci = q(A.number(45000), SCHEMA.scientific(), { requiredForms: ['SCIENTIFIC'], requireNormalizedScientific: true });
    expect(gradeSubmission('4.5 x 10^4', sci).status).toBe('CORRECT');
    expect(gradeSubmission('45 x 10^3', sci).status).toBe('INVALID_INPUT');
    expect(gradeSubmission('45000', sci).status).toBe('INVALID_INPUT');
    expect(gradeSubmission('4.5 x 10^3', sci).status).toBe('INCORRECT');
  });
  it('prime factorization must use primes', () => {
    const pf = q(A.number(24), SCHEMA.factorization(), { requirePrimeFactors: true });
    expect(gradeSubmission('2 x 2 x 2 x 3', pf).status).toBe('CORRECT');
    expect(gradeSubmission('4 x 6', pf).status).toBe('INVALID_INPUT');
    expect(gradeSubmission('2 x 3 x 5', pf).status).toBe('INCORRECT');
  });
  it('times require a.m./p.m. only when asked', () => {
    const t = q(A.time(3, 5, 'PM'), SCHEMA.time(true));
    expect(gradeSubmission('3:05', t).status).toBe('INVALID_INPUT');
    expect(gradeSubmission('3:05 pm', t).status).toBe('CORRECT');
    expect(gradeSubmission('3:05 am', t).status).toBe('INCORRECT');
  });
});
