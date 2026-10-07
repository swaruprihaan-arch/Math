import { describe, expect, it } from 'vitest';
import { A, buildQuestion, P, prompt, SCHEMA, solution, step } from '../../domain/question/build';
import { createSeededRandom } from '../../domain/random/random';
import { defaultArithmeticSettings, generateArithmetic } from '../../engines/arithmetic/arithmeticEngine';
import { canonicalInputString } from '../../domain/answer/format';
import { emptyProgress, recordAttempt, recordInvalid } from '../../state/progress';
import { INITIAL_QUESTION_STATE, phaseOf, questionReducer, type QuestionState } from '../../state/questionMachine';
import { INITIAL_QUIZ, quizReducer } from '../../state/quizMachine';
import { createPasscode, isValidPasscode, lockoutAfterFailure, verifyPasscode } from '../../state/security';
import { defaultSettings, sanitizeSettings } from '../../state/settings';
import { formatClock, INITIAL_TIMER, remainingMs, timerReducer } from '../../state/timerMachine';
import { deserialize, serialize } from '../../state/persistence';

const q48 = buildQuestion(
  {
    topic: 'ARITHMETIC',
    subtype: 'MULTIPLY',
    difficulty: 'EASY',
    prompt: prompt([P.num(12), P.op('×'), P.num(4), P.op('='), P.blank()]),
    operation: 'MULTIPLY',
    canonicalAnswer: A.number(48),
    answerSchema: SCHEMA.integer(),
    solution: solution('S', [step([P.text('12 × 4 = 48')])], A.number(48)),
    alternativeSolutions: [solution('T', [step([P.text('4 groups of 12')])], A.number(48))],
    generatorId: 't',
    generatorVersion: '1',
  },
  createSeededRandom('q48'),
);

function run(state: QuestionState, ...actions: Parameters<typeof questionReducer>[1][]): QuestionState {
  return actions.reduce(questionReducer, state);
}

describe('question lifecycle (spec §060)', () => {
  it('NO_QUESTION → QUESTION_READY → ANSWER_DIRTY', () => {
    expect(phaseOf(INITIAL_QUESTION_STATE)).toBe('NO_QUESTION');
    const s1 = run(INITIAL_QUESTION_STATE, { type: 'GENERATE', question: q48 });
    expect(phaseOf(s1)).toBe('QUESTION_READY');
    expect(phaseOf(run(s1, { type: 'INPUT', raw: '4' }))).toBe('ANSWER_DIRTY');
  });
  it('INVALID_INPUT is not an attempt and not incorrect ("twelve-ish")', () => {
    const s = run(INITIAL_QUESTION_STATE, { type: 'GENERATE', question: q48 }, { type: 'INPUT', raw: 'twelve-ish' }, { type: 'SUBMIT', maxAttempts: 3 });
    expect(phaseOf(s)).toBe('INVALID_INPUT');
    expect(s.attemptCount).toBe(0);
    expect(s.invalidCount).toBe(1);
    expect(s.locked).toBe(false);
    expect(phaseOf(run(s, { type: 'INPUT', raw: '48' }))).toBe('ANSWER_DIRTY');
  });
  it('INCORRECT → RETRY → CORRECT, first-try flag recorded', () => {
    const wrong = run(INITIAL_QUESTION_STATE, { type: 'GENERATE', question: q48 }, { type: 'INPUT', raw: '47' }, { type: 'SUBMIT', maxAttempts: 3 });
    expect(phaseOf(wrong)).toBe('INCORRECT');
    expect(wrong.locked).toBe(false);
    const right = run(wrong, { type: 'INPUT', raw: '48' }, { type: 'SUBMIT', maxAttempts: 3 });
    expect(phaseOf(right)).toBe('CORRECT');
    expect(right.attemptCount).toBe(2);
    expect(right.firstAttemptCorrect).toBe(false);
    expect(right.locked).toBe(true);
    // CORRECT has no RETRY: input is ignored once locked
    expect(run(right, { type: 'INPUT', raw: '1' }).rawInput).toBe('48');
  });
  it('running out of tries locks the question and shows the solution', () => {
    const s = run(INITIAL_QUESTION_STATE, { type: 'GENERATE', question: q48 }, { type: 'INPUT', raw: '1' }, { type: 'SUBMIT', maxAttempts: 1 });
    expect(s.locked).toBe(true);
    expect(s.solutionVisibility).toBe('VISIBLE');
  });
  it('SHOW_SOLUTION only after an evaluable answer unless "anytime"', () => {
    const ready = run(INITIAL_QUESTION_STATE, { type: 'GENERATE', question: q48 });
    expect(run(ready, { type: 'SHOW_SOLUTION', anytime: false }).solutionVisibility).toBe('HIDDEN');
    expect(run(ready, { type: 'SHOW_SOLUTION', anytime: true }).solutionVisibility).toBe('VISIBLE');
    const answered = run(ready, { type: 'INPUT', raw: '3' }, { type: 'SUBMIT', maxAttempts: 3 });
    expect(run(answered, { type: 'SHOW_SOLUTION', anytime: false }).solutionVisibility).toBe('VISIBLE');
  });
  it('questions are immutable', () => {
    expect(Object.isFrozen(q48)).toBe(true);
    expect(() => {
      (q48 as unknown as { canonicalAnswer: unknown }).canonicalAnswer = A.number(1);
    }).toThrow();
  });
});

describe('quiz machine', () => {
  it('one graded attempt per question, completes after the last', () => {
    let q = quizReducer(INITIAL_QUIZ, { type: 'START', length: 2, seed: 'S', now: 0 });
    const row = { questionText: 'x', yourText: '1', correctText: '1', isCorrect: true, standards: [], topic: 'ARITHMETIC' };
    q = quizReducer(q, { type: 'RECORD', row });
    q = quizReducer(q, { type: 'RECORD', row: { ...row, isCorrect: false } }); // ignored: same question
    expect(q.answered).toBe(1);
    expect(q.correct).toBe(1);
    q = quizReducer(q, { type: 'ADVANCE', now: 1 });
    q = quizReducer(q, { type: 'RECORD', row: { ...row, isCorrect: false } });
    q = quizReducer(q, { type: 'ADVANCE', now: 2 });
    expect(q.status).toBe('COMPLETE');
    expect(q.endedBy).toBe('COMPLETE');
    expect(q.correct).toBe(1);
  });
  it('clamps length like the legacy site (1–200) and can end on time-up', () => {
    expect(quizReducer(INITIAL_QUIZ, { type: 'START', length: 999, seed: 'S', now: 0 }).length).toBe(200);
    const q = quizReducer(quizReducer(INITIAL_QUIZ, { type: 'START', length: 5, seed: 'S', now: 0 }), { type: 'FINISH', reason: 'TIME_UP', now: 9 });
    expect(q.endedBy).toBe('TIME_UP');
  });
});

describe('timer machine', () => {
  it('counts from timestamps, pauses, resumes and expires', () => {
    let t = timerReducer(INITIAL_TIMER, { type: 'START', totalMs: 10_000, now: 1000 });
    expect(remainingMs(t, 4000)).toBe(7000);
    t = timerReducer(t, { type: 'PAUSE', now: 4000 });
    expect(remainingMs(t, 99_000)).toBe(7000);
    t = timerReducer(t, { type: 'RESUME', now: 100_000 });
    t = timerReducer(t, { type: 'TICK', now: 106_000 });
    expect(t.status).toBe('RUNNING');
    t = timerReducer(t, { type: 'TICK', now: 107_500 });
    expect(t.status).toBe('EXPIRED');
    expect(formatClock(65_000)).toBe('01:05');
  });
});

describe('statistics', () => {
  it('invalid input never counts as attempted or incorrect', () => {
    let p = recordInvalid(emptyProgress());
    expect(p.totals.attempted).toBe(0);
    p = recordAttempt(p, { at: 0, topic: 'ARITHMETIC', questionText: '', yourText: '', correctText: '', correct: false, standards: ['3.OA.7'] }, true);
    expect(p.totals.attempted).toBe(1);
    expect(p.byStandard['3.OA.7']).toEqual({ attempted: 1, correct: 0 });
  });
});

describe('settings & persistence', () => {
  it('repairs bad stored values and keeps defaults for new fields', () => {
    const s = sanitizeSettings({ session: { quizLength: 9999 }, look: { theme: 99, fontScale: 9 }, input: { modes: ['NOPE'] } });
    expect(s.session.quizLength).toBe(200);
    expect(s.look.theme).toBe(18);
    expect(s.input.modes).toEqual(['KEYPAD']);
    expect(s.child.name).toBe(defaultSettings().child.name);
  });
  it('serializes bigint safely (JSON.stringify alone throws)', () => {
    const q = generateArithmetic(defaultArithmeticSettings(), createSeededRandom('ser'));
    const back = deserialize<typeof q>(serialize(q));
    expect(back.canonicalAnswer).toEqual(q.canonicalAnswer);
    expect(canonicalInputString(back)).toBe(canonicalInputString(q));
  });
});

describe('parent passcode', () => {
  it('validates, hashes and verifies (no recovery code)', async () => {
    expect(isValidPasscode('12')).toBe(false);
    expect(isValidPasscode('1234')).toBe(true);
    expect(isValidPasscode('12ab')).toBe(false);
    const created = await createPasscode('2468');
    const record = created.record;
    expect(Object.keys(created)).toEqual(['record']);
    expect(record).not.toHaveProperty('recoveryHash');
    expect(record.hash).not.toContain('2468');
    expect(await verifyPasscode('2468', record)).toBe(true);
    expect(await verifyPasscode('2469', record)).toBe(false);
  });
  it('locks out after repeated failures with growing waits', () => {
    let s = { failures: 0, lockedUntil: 0 };
    for (let i = 0; i < 4; i++) s = lockoutAfterFailure(s, 1000);
    expect(s.lockedUntil).toBe(0);
    s = lockoutAfterFailure(s, 1000);
    expect(s.lockedUntil).toBe(31_000);
    s = lockoutAfterFailure(s, 1000);
    expect(s.lockedUntil).toBe(61_000);
  });
});
