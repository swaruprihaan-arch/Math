import type { PracticePlan, SourceId } from '../engines/plan/practicePlan';
import { enabledSourceIds } from '../engines/plan/practicePlan';
import type { AppSettings } from '../state/settings';

/** Legacy per-question recommended seconds (Easy / Standard / Hard), plus grade-level practice. */
const PER_QUESTION: Record<SourceId, [number, number, number]> = {
  arithmetic: [20, 30, 40],
  fractions: [45, 60, 80],
  decimals: [30, 45, 60],
  order: [40, 55, 75],
  wordProblems: [55, 75, 95],
  gradeLevel: [45, 60, 90],
};

export function recommendedSeconds(plan: PracticePlan, level: AppSettings['level'], questions: number): number {
  const idx = level === 'EASY' ? 0 : level === 'HARD' ? 2 : 1;
  const sources = enabledSourceIds(plan);
  if (sources.length === 0) return 30 * questions;
  const avg = sources.reduce((s, id) => s + PER_QUESTION[id][idx], 0) / sources.length;
  return Math.round(avg * questions);
}

export function timerTotalMs(settings: AppSettings): number {
  if (settings.session.timer === 'OFF') return 0;
  if (settings.session.timer === 'CUSTOM') return Math.round(settings.session.timerMinutes * 60_000);
  return recommendedSeconds(settings.plan, settings.level, settings.session.quizLength) * 1000;
}
