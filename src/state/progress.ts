/**
 * Progress & statistics (the "performance-feedback" part of the app). Invalid input never counts as an attempt.
 */
import type { ReportRow } from './quizMachine';
import { load, save } from './persistence';

export interface Tally {
  attempted: number;
  correct: number;
}

export interface QuizReport {
  readonly id: string;
  readonly seed: string;
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly total: number;
  readonly correct: number;
  readonly endedBy: 'COMPLETE' | 'TIME_UP' | 'STOPPED';
  readonly rows: readonly ReportRow[];
}

export interface AttemptLog {
  readonly at: number;
  readonly topic: string;
  readonly questionText: string;
  readonly yourText: string;
  readonly correctText: string;
  readonly correct: boolean;
  readonly standards: readonly string[];
}

export interface ProgressStore {
  readonly version: 1;
  readonly totals: { attempted: number; correct: number; invalid: number; questions: number; firstTryCorrect: number };
  readonly byTopic: Readonly<Record<string, Tally>>;
  readonly byStandard: Readonly<Record<string, Tally>>;
  readonly bricks: number;
  readonly bestStreak: number;
  readonly quizzes: readonly QuizReport[];
  readonly recent: readonly AttemptLog[];
}

export function emptyProgress(): ProgressStore {
  return { version: 1, totals: { attempted: 0, correct: 0, invalid: 0, questions: 0, firstTryCorrect: 0 }, byTopic: {}, byStandard: {}, bricks: 0, bestStreak: 0, quizzes: [], recent: [] };
}

const KEY = 'progress';
const MAX_RECENT = 300;
const MAX_QUIZZES = 60;

function bump(map: Readonly<Record<string, Tally>>, key: string, correct: boolean): Record<string, Tally> {
  const t = map[key] ?? { attempted: 0, correct: 0 };
  return { ...map, [key]: { attempted: t.attempted + 1, correct: t.correct + (correct ? 1 : 0) } };
}

export function recordAttempt(p: ProgressStore, log: AttemptLog, isFirstAttempt: boolean): ProgressStore {
  let byStandard = p.byStandard;
  for (const s of log.standards) byStandard = bump(byStandard, s, log.correct);
  return {
    ...p,
    totals: {
      ...p.totals,
      attempted: p.totals.attempted + 1,
      correct: p.totals.correct + (log.correct ? 1 : 0),
      questions: p.totals.questions + (isFirstAttempt ? 1 : 0),
      firstTryCorrect: p.totals.firstTryCorrect + (isFirstAttempt && log.correct ? 1 : 0),
    },
    byTopic: bump(p.byTopic, log.topic, log.correct),
    byStandard,
    bricks: p.bricks + (log.correct ? 1 : 0),
    recent: [log, ...p.recent].slice(0, MAX_RECENT),
  };
}

export function recordInvalid(p: ProgressStore): ProgressStore {
  return { ...p, totals: { ...p.totals, invalid: p.totals.invalid + 1 } };
}

export function recordStreak(p: ProgressStore, streak: number): ProgressStore {
  return streak > p.bestStreak ? { ...p, bestStreak: streak } : p;
}

export function recordQuiz(p: ProgressStore, report: QuizReport): ProgressStore {
  return { ...p, quizzes: [report, ...p.quizzes].slice(0, MAX_QUIZZES) };
}

export function accuracy(t: Tally | undefined): number | null {
  return t && t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : null;
}

export function loadProgress(): ProgressStore {
  const raw = load<ProgressStore>(KEY);
  return raw && raw.version === 1 ? { ...emptyProgress(), ...raw } : emptyProgress();
}

export function saveProgress(p: ProgressStore): void {
  save(KEY, p);
}
