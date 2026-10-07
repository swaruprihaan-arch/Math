/**
 * Question lifecycle state machine (spec §050 PracticeState, §060 QUESTION_STATE).
 *
 *   NO_QUESTION —GENERATE→ QUESTION_READY —USER_TYPES→ ANSWER_DIRTY —SUBMIT→ PARSING
 *     PARSING: INVALID → INVALID_INPUT (not an attempt) | VALID → VALIDATING → CORRECT | INCORRECT
 *   CORRECT:   SHOW_SOLUTION | NEXT
 *   INCORRECT: RETRY (typing) | SHOW_SOLUTION | NEXT
 *   INVALID_INPUT: EDIT (typing)
 *
 * PARSING/VALIDATING are synchronous and never stored. "Locked" means no more attempts are allowed
 * (answered correctly, out of retries, or a quiz question that was graded).
 */
import type { ParsedAnswer, Question } from '../domain/question/types';
import { gradeSubmission } from '../validators/answerValidator';

export type SubmissionStatus = 'UNANSWERED' | 'INVALID_INPUT' | 'CORRECT' | 'INCORRECT';
export type QuestionPhase = 'NO_QUESTION' | 'QUESTION_READY' | 'ANSWER_DIRTY' | 'INVALID_INPUT' | 'CORRECT' | 'INCORRECT';

export interface Feedback {
  readonly kind: 'invalid' | 'correct' | 'incorrect';
  readonly message: string;
  readonly formHint: boolean;
}

export interface QuestionState {
  readonly question: Question | null;
  readonly rawInput: string;
  readonly parsedInput: ParsedAnswer | null;
  readonly submissionStatus: SubmissionStatus;
  /** Mathematically evaluable attempts on this question (invalid input does not count). */
  readonly attemptCount: number;
  readonly invalidCount: number;
  readonly feedback: Feedback | null;
  readonly solutionVisibility: 'HIDDEN' | 'VISIBLE';
  readonly locked: boolean;
  readonly firstAttemptCorrect: boolean | null;
  /** Raw text of every evaluable attempt, in order. */
  readonly attempts: readonly { raw: string; correct: boolean }[];
}

export const INITIAL_QUESTION_STATE: QuestionState = {
  question: null,
  rawInput: '',
  parsedInput: null,
  submissionStatus: 'UNANSWERED',
  attemptCount: 0,
  invalidCount: 0,
  feedback: null,
  solutionVisibility: 'HIDDEN',
  locked: false,
  firstAttemptCorrect: null,
  attempts: [],
};

export type QuestionAction =
  | { type: 'GENERATE'; question: Question }
  | { type: 'INPUT'; raw: string }
  | { type: 'SUBMIT'; maxAttempts: number }
  | { type: 'SHOW_SOLUTION'; anytime: boolean }
  | { type: 'HIDE_SOLUTION' }
  | { type: 'CLEAR' };

export function phaseOf(s: QuestionState): QuestionPhase {
  if (!s.question) return 'NO_QUESTION';
  if (s.submissionStatus === 'CORRECT') return 'CORRECT';
  if (s.submissionStatus === 'INCORRECT') return 'INCORRECT';
  if (s.submissionStatus === 'INVALID_INPUT') return 'INVALID_INPUT';
  return s.rawInput.trim() === '' ? 'QUESTION_READY' : 'ANSWER_DIRTY';
}

const PRAISE = ['Great job!', 'You got it!', 'Awesome!', 'Brick-tastic!', 'Nice work!', 'Super!'];

export function questionReducer(state: QuestionState, action: QuestionAction): QuestionState {
  switch (action.type) {
    case 'GENERATE':
      return { ...INITIAL_QUESTION_STATE, question: action.question };
    case 'INPUT': {
      if (!state.question || state.locked) return state;
      // From INCORRECT this is RETRY, from INVALID_INPUT it is EDIT; both lead to ANSWER_DIRTY.
      return { ...state, rawInput: action.raw, parsedInput: null, submissionStatus: 'UNANSWERED', feedback: null };
    }
    case 'CLEAR':
      if (!state.question || state.locked) return state;
      return { ...state, rawInput: '', parsedInput: null, submissionStatus: 'UNANSWERED', feedback: null };
    case 'SUBMIT': {
      if (!state.question || state.locked) return state;
      const result = gradeSubmission(state.rawInput, state.question);
      if (result.status === 'INVALID_INPUT') {
        return {
          ...state,
          parsedInput: result.parsed,
          submissionStatus: 'INVALID_INPUT',
          invalidCount: state.invalidCount + 1,
          feedback: { kind: 'invalid', message: result.message, formHint: result.formMismatch },
        };
      }
      const correct = result.status === 'CORRECT';
      const attemptCount = state.attemptCount + 1;
      const outOfTries = !correct && attemptCount >= action.maxAttempts;
      return {
        ...state,
        parsedInput: result.parsed,
        submissionStatus: result.status,
        attemptCount,
        firstAttemptCorrect: state.firstAttemptCorrect ?? correct,
        attempts: [...state.attempts, { raw: state.rawInput, correct }],
        locked: correct || outOfTries,
        feedback: correct
          ? { kind: 'correct', message: PRAISE[(attemptCount + state.rawInput.length) % PRAISE.length] as string, formHint: false }
          : { kind: 'incorrect', message: outOfTries ? 'Here is how to solve it.' : 'Try again!', formHint: false },
        solutionVisibility: outOfTries ? 'VISIBLE' : state.solutionVisibility,
      };
    }
    case 'SHOW_SOLUTION': {
      if (!state.question) return state;
      const answered = state.submissionStatus === 'CORRECT' || state.submissionStatus === 'INCORRECT' || state.locked;
      if (!answered && !action.anytime) return state;
      return { ...state, solutionVisibility: 'VISIBLE' };
    }
    case 'HIDE_SOLUTION':
      return { ...state, solutionVisibility: 'HIDDEN' };
  }
}
