/**
 * Quiz state machine: a finite, ordered set of questions with explicit completion (spec §000 QUIZ).
 *   IDLE —START→ IN_PROGRESS —(last answer | time up | stop)→ COMPLETE
 * Question i of a quiz is generated from deriveSeed(seed, i), so a quiz can be reproduced from its code.
 */
export interface ReportRow {
  readonly index: number;
  readonly questionText: string;
  readonly yourText: string;
  readonly correctText: string;
  readonly isCorrect: boolean;
  readonly standards: readonly string[];
  readonly topic: string;
}

export interface QuizState {
  readonly status: 'IDLE' | 'IN_PROGRESS' | 'COMPLETE';
  readonly seed: string;
  readonly length: number;
  /** Index of the question being shown (0-based). */
  readonly index: number;
  readonly answered: number;
  readonly correct: number;
  readonly rows: readonly ReportRow[];
  readonly startedAt: number;
  readonly finishedAt: number | null;
  readonly endedBy: 'COMPLETE' | 'TIME_UP' | 'STOPPED' | null;
}

export const INITIAL_QUIZ: QuizState = {
  status: 'IDLE',
  seed: '',
  length: 0,
  index: 0,
  answered: 0,
  correct: 0,
  rows: [],
  startedAt: 0,
  finishedAt: null,
  endedBy: null,
};

export type QuizAction =
  | { type: 'START'; length: number; seed: string; now: number }
  | { type: 'RECORD'; row: Omit<ReportRow, 'index'> }
  | { type: 'ADVANCE'; now: number }
  | { type: 'FINISH'; reason: 'TIME_UP' | 'STOPPED'; now: number }
  | { type: 'RESET' };

export function clampQuizLength(n: number): number {
  return Math.max(1, Math.min(200, Math.round(Number.isFinite(n) ? n : 10)));
}

export function quizReducer(q: QuizState, a: QuizAction): QuizState {
  switch (a.type) {
    case 'START':
      return { ...INITIAL_QUIZ, status: 'IN_PROGRESS', length: clampQuizLength(a.length), seed: a.seed, startedAt: a.now };
    case 'RECORD': {
      if (q.status !== 'IN_PROGRESS' || q.rows.some((r) => r.index === q.index)) return q; // one graded attempt per question
      const row: ReportRow = { ...a.row, index: q.index };
      return { ...q, rows: [...q.rows, row], answered: q.answered + 1, correct: q.correct + (row.isCorrect ? 1 : 0) };
    }
    case 'ADVANCE': {
      if (q.status !== 'IN_PROGRESS') return q;
      if (q.answered >= q.length) return { ...q, status: 'COMPLETE', finishedAt: a.now, endedBy: 'COMPLETE' };
      return { ...q, index: q.index + 1 };
    }
    case 'FINISH':
      if (q.status !== 'IN_PROGRESS') return q;
      return { ...q, status: 'COMPLETE', finishedAt: a.now, endedBy: a.reason };
    case 'RESET':
      return INITIAL_QUIZ;
  }
}

export function scorePercent(q: QuizState): number {
  return q.length === 0 ? 0 : Math.round((q.correct / q.length) * 100);
}
