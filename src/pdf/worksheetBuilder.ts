/**
 * Worksheets + answer keys. Seeded, so a worksheet code always recreates the same questions.
 */
import { formatQuestionAnswer } from '../domain/answer/format';
import { strategyTitle } from '../domain/question/build';
import type { Question } from '../domain/question/types';
import { createSeededRandom, deriveSeed } from '../domain/random/random';
import { generateFromPlan, type PracticePlan } from '../engines/plan/practicePlan';

export interface Worksheet {
  readonly code: string;
  readonly questions: readonly Question[];
}

export function buildWorksheet(plan: PracticePlan, code: string, count: number): Worksheet {
  const n = Math.max(1, Math.min(60, Math.round(count)));
  const questions = Array.from({ length: n }, (_, i) => generateFromPlan(plan, createSeededRandom(deriveSeed(`WS:${code}`, i))));
  return { code, questions };
}

export interface AnswerKeyRow {
  readonly index: number;
  readonly answer: string;
  readonly strategy: string;
  readonly standards: readonly string[];
}

export function buildAnswerKey(ws: Worksheet): AnswerKeyRow[] {
  return ws.questions.map((q, i) => ({ index: i + 1, answer: formatQuestionAnswer(q), strategy: strategyTitle(q.solution), standards: q.standards }));
}
