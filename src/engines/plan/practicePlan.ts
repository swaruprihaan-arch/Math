/**
 * The parent's practice plan: which math the child practises. Several topics and several operations can be
 * enabled together; each new question picks one enabled source (spec Topic "MIXED").
 */
import type { ArithmeticOperator, Difficulty, Question } from '../../domain/question/types';
import type { RandomSource } from '../../domain/random/random';
import { findSkill, SKILLS_BY_GRADE } from '../../curriculum/registry';
import type { GradeLevel } from '../../curriculum/types';
import { defaultArithmeticSettings, generateArithmetic, validateArithmeticSettings, type ArithmeticSettings } from '../arithmetic/arithmeticEngine';
import { defaultDecimalSettings, generateDecimal, validateDecimalSettings, type DecimalSettings } from '../decimals/decimalEngine';
import { defaultFractionSettings, generateFraction, validateFractionSettings, type FractionSettings } from '../fractions/fractionEngine';
import { defaultOrderSettings, generateOrder, validateOrderSettings, type OrderSettings } from '../orderOfOperations/orderEngine';
import { defaultWordProblemSettings, generateWordProblem, validateWordProblemSettings, type WordProblemSettings } from '../wordProblems/wordProblemEngine';

export type SourceId = 'arithmetic' | 'fractions' | 'decimals' | 'order' | 'wordProblems' | 'gradeLevel';

export interface GradeLevelSettings {
  grade: GradeLevel;
  /** Empty = every skill in the grade. */
  skillIds: string[];
  difficulty: Difficulty;
}

export interface PracticePlan {
  arithmetic: { enabled: boolean; settings: ArithmeticSettings };
  fractions: { enabled: boolean; settings: FractionSettings };
  decimals: { enabled: boolean; settings: DecimalSettings };
  order: { enabled: boolean; settings: OrderSettings };
  wordProblems: { enabled: boolean; settings: WordProblemSettings };
  gradeLevel: { enabled: boolean; settings: GradeLevelSettings };
}

export const SOURCE_LABELS: Record<SourceId, string> = {
  arithmetic: 'Whole numbers (+ − × ÷)',
  fractions: 'Fractions',
  decimals: 'Decimals',
  order: 'Order of Operations',
  wordProblems: 'Word Problems',
  gradeLevel: 'Grade Level Math (California)',
};

export function defaultPlan(): PracticePlan {
  return {
    arithmetic: { enabled: true, settings: defaultArithmeticSettings() },
    fractions: { enabled: false, settings: defaultFractionSettings() },
    decimals: { enabled: false, settings: defaultDecimalSettings() },
    order: { enabled: false, settings: defaultOrderSettings() },
    wordProblems: { enabled: false, settings: defaultWordProblemSettings() },
    gradeLevel: { enabled: false, settings: { grade: '3', skillIds: [], difficulty: 'MEDIUM' } },
  };
}

/** Apply one difficulty level to every source (the parent's main "Level" control). */
export function withDifficulty(plan: PracticePlan, difficulty: Difficulty): PracticePlan {
  const gl: Difficulty = difficulty === 'CUSTOM' ? 'MEDIUM' : difficulty;
  return {
    arithmetic: { ...plan.arithmetic, settings: { ...plan.arithmetic.settings, difficulty } },
    fractions: { ...plan.fractions, settings: { ...plan.fractions.settings, difficulty } },
    decimals: { ...plan.decimals, settings: { ...plan.decimals.settings, difficulty } },
    order: { ...plan.order, settings: { ...plan.order.settings, difficulty: gl } },
    wordProblems: { ...plan.wordProblems, settings: { ...plan.wordProblems.settings, difficulty: gl } },
    gradeLevel: { ...plan.gradeLevel, settings: { ...plan.gradeLevel.settings, difficulty: gl } },
  };
}

export function gradeSkills(settings: GradeLevelSettings) {
  const all = SKILLS_BY_GRADE[settings.grade];
  if (settings.skillIds.length === 0) return all;
  return settings.skillIds.map((id) => findSkill(id)).filter((s): s is NonNullable<typeof s> => !!s && s.grade === settings.grade);
}

export interface PlanValidation {
  valid: boolean;
  errors: string[];
}

export function validatePlan(plan: PracticePlan): PlanValidation {
  const errors: string[] = [];
  const enabled = enabledSourceIds(plan);
  if (enabled.length === 0) errors.push('Turn on at least one kind of math.');
  if (plan.arithmetic.enabled) errors.push(...validateArithmeticSettings(plan.arithmetic.settings).errors);
  if (plan.fractions.enabled) errors.push(...validateFractionSettings(plan.fractions.settings).errors);
  if (plan.decimals.enabled) errors.push(...validateDecimalSettings(plan.decimals.settings).errors);
  if (plan.order.enabled) errors.push(...validateOrderSettings(plan.order.settings).errors);
  if (plan.wordProblems.enabled) errors.push(...validateWordProblemSettings(plan.wordProblems.settings).errors);
  if (plan.gradeLevel.enabled && gradeSkills(plan.gradeLevel.settings).length === 0) errors.push('Pick at least one grade-level skill.');
  return { valid: errors.length === 0, errors };
}

const ARITH_OPS: readonly ArithmeticOperator[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];

/** The + − × ÷ operations the parent turned on (across whole numbers, decimals, fractions and word problems), in order. */
export function planOperations(plan: PracticePlan): ArithmeticOperator[] {
  const on = new Set<string>();
  if (plan.arithmetic.enabled) plan.arithmetic.settings.enabledOperations.forEach((o) => on.add(o));
  if (plan.decimals.enabled) plan.decimals.settings.operations.forEach((o) => on.add(o));
  if (plan.fractions.enabled) plan.fractions.settings.operations.forEach((o) => on.add(o));
  if (plan.wordProblems.enabled) plan.wordProblems.settings.operations.forEach((o) => on.add(o));
  return ARITH_OPS.filter((o) => on.has(o));
}

/**
 * The plan narrowed to one operation (the child tapped + − × or ÷). Sources without that operation are switched off;
 * if nothing is left (or op is null) the parent's plan is returned unchanged.
 */
export function focusPlan(plan: PracticePlan, op: ArithmeticOperator | null): PracticePlan {
  if (!op || !planOperations(plan).includes(op)) return plan;
  const has = (ops: readonly string[]) => ops.includes(op);
  const focused: PracticePlan = {
    arithmetic: has(plan.arithmetic.settings.enabledOperations) ? { ...plan.arithmetic, settings: { ...plan.arithmetic.settings, enabledOperations: [op] } } : { ...plan.arithmetic, enabled: false },
    decimals: has(plan.decimals.settings.operations) ? { ...plan.decimals, settings: { ...plan.decimals.settings, operations: [op] } } : { ...plan.decimals, enabled: false },
    fractions: has(plan.fractions.settings.operations) ? { ...plan.fractions, settings: { ...plan.fractions.settings, operations: [op] } } : { ...plan.fractions, enabled: false },
    wordProblems: has(plan.wordProblems.settings.operations) ? { ...plan.wordProblems, settings: { ...plan.wordProblems.settings, operations: [op] } } : { ...plan.wordProblems, enabled: false },
    order: { ...plan.order, enabled: false },
    gradeLevel: { ...plan.gradeLevel, enabled: false },
  };
  return enabledSourceIds(focused).length > 0 && validatePlan(focused).valid ? focused : plan;
}

export function enabledSourceIds(plan: PracticePlan): SourceId[] {
  return (Object.keys(plan) as SourceId[]).filter((k) => plan[k].enabled);
}

/** Generate the next question from the plan. */
export function generateFromPlan(plan: PracticePlan, rng: RandomSource): Question {
  const sources = enabledSourceIds(plan);
  if (sources.length === 0) throw new Error('No math is turned on in the practice plan.');
  const source = rng.choose(sources);
  return generateFromSource(plan, source, rng);
}

export function generateFromSource(plan: PracticePlan, source: SourceId, rng: RandomSource): Question {
  switch (source) {
    case 'arithmetic':
      return generateArithmetic(plan.arithmetic.settings, rng);
    case 'fractions':
      return generateFraction(plan.fractions.settings, rng);
    case 'decimals':
      return generateDecimal(plan.decimals.settings, rng);
    case 'order':
      return generateOrder(plan.order.settings, rng);
    case 'wordProblems':
      return generateWordProblem(plan.wordProblems.settings, rng);
    case 'gradeLevel': {
      const skill = rng.choose(gradeSkills(plan.gradeLevel.settings));
      return skill.generate(rng, plan.gradeLevel.settings.difficulty);
    }
  }
}
