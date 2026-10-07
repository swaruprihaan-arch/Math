/**
 * Helpers for building immutable Questions (spec §040) plus a tiny DSL for structured prompts and common answer schemas.
 * Every generator (topic engines and grade-level skills) should use these so all questions share one shape.
 */
import type { RandomSource } from '../random/random';
import { rat, type Rational } from '../rational/rational';
import type {
  AnswerKind,
  AnswerSchema,
  AnswerValue,
  ChoiceOption,
  Difficulty,
  GenerationMetadata,
  NumberStyle,
  Operand,
  OperatorSymbol,
  PromptNode,
  Question,
  SolutionStep,
  SolutionTree,
  StructuredPrompt,
  Topic,
  ValidationPolicy,
  Visual,
} from './types';
import { QuestionGenerationError } from './types';

/* ------------------------------------------------------------------ */
/* Immutability                                                         */
/* ------------------------------------------------------------------ */

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

export interface QuestionInput {
  topic: Topic;
  subtype: string;
  difficulty: Difficulty;
  prompt: StructuredPrompt;
  operands?: Operand[];
  operation: string;
  canonicalAnswer: AnswerValue;
  acceptableRepresentations?: AnswerKind[];
  answerSchema: AnswerSchema;
  validationPolicy?: ValidationPolicy;
  solution: SolutionTree;
  /** Additional strategies (multiple ways to solve). */
  alternativeSolutions?: SolutionTree[];
  generatorId: string;
  generatorVersion: string;
  constraints?: Record<string, unknown>;
  retryCount?: number;
  standards?: string[];
  answerDisplay?: NumberStyle;
}

/** Assemble and deep-freeze a Question. The id is drawn from the RandomSource so seeded runs are reproducible. */
export function buildQuestion(input: QuestionInput, rng: RandomSource): Question {
  const metadata: GenerationMetadata = {
    generatorId: input.generatorId,
    generatorVersion: input.generatorVersion,
    seed: rng.seed,
    constraints: input.constraints ?? {},
    retryCount: input.retryCount ?? 0,
  };
  const question: Question = {
    id: `${input.generatorId}:${rng.token()}`,
    version: 1,
    topic: input.topic,
    subtype: input.subtype,
    difficulty: input.difficulty,
    prompt: input.prompt,
    operands: input.operands ?? [],
    operation: input.operation,
    canonicalAnswer: input.canonicalAnswer,
    acceptableRepresentations: input.acceptableRepresentations ?? input.answerSchema.accepts.slice(),
    answerSchema: input.answerSchema,
    validationPolicy: input.validationPolicy ?? {},
    solution: input.solution,
    alternativeSolutions: input.alternativeSolutions ?? [],
    generationMetadata: metadata,
    standards: input.standards ?? [],
    ...(input.answerDisplay ? { answerDisplay: input.answerDisplay } : {}),
    createdAt: Date.now(),
  };
  return deepFreeze(question);
}

/* ------------------------------------------------------------------ */
/* Bounded retries (spec §080) — `while (true)` is forbidden.           */
/* ------------------------------------------------------------------ */

export const MAX_GENERATION_ATTEMPTS = 200;

/**
 * Call `candidate` until `accept` returns true, at most `maxAttempts` times.
 * Returns the accepted value and the number of rejected candidates.
 */
export function withRetries<T>(
  context: { topic: Topic; generatorId: string; settings: unknown },
  candidate: (attempt: number) => T,
  accept: (value: T) => boolean,
  maxAttempts = MAX_GENERATION_ATTEMPTS,
): { value: T; retryCount: number } {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const value = candidate(attempt);
    if (accept(value)) return { value, retryCount: attempt };
  }
  throw new QuestionGenerationError({ ...context, attempts: maxAttempts });
}

/* ------------------------------------------------------------------ */
/* Prompt DSL                                                           */
/* ------------------------------------------------------------------ */

type Num = Rational | number | bigint;
export const toRational = (n: Num): Rational => (typeof n === 'object' ? n : rat(n));

export const P = {
  text: (text: string, emphasis?: 'strong' | 'em'): PromptNode => (emphasis ? { t: 'text', text, emphasis } : { t: 'text', text }),
  strong: (text: string): PromptNode => ({ t: 'text', text, emphasis: 'strong' }),
  num: (value: Num, style?: NumberStyle, places?: number): PromptNode => ({
    t: 'num',
    value: toRational(value),
    ...(style ? { style } : {}),
    ...(places !== undefined ? { places } : {}),
  }),
  /** Number that gets parentheses when negative, e.g. 5 − (−3). */
  numP: (value: Num, style?: NumberStyle, places?: number): PromptNode => ({
    t: 'num',
    value: toRational(value),
    parenNegative: true,
    ...(style ? { style } : {}),
    ...(places !== undefined ? { places } : {}),
  }),
  frac: (value: Num): PromptNode => ({ t: 'num', value: toRational(value), style: 'fraction' }),
  mixed: (value: Num): PromptNode => ({ t: 'num', value: toRational(value), style: 'mixed' }),
  dec: (value: Num, places?: number): PromptNode => ({ t: 'num', value: toRational(value), style: 'decimal', ...(places !== undefined ? { places } : {}) }),
  money: (value: Num): PromptNode => ({ t: 'num', value: toRational(value), style: 'money' }),
  op: (op: OperatorSymbol): PromptNode => ({ t: 'op', op }),
  pow: (base: Num | PromptNode[], exponent: Num | PromptNode[]): PromptNode => ({
    t: 'pow',
    base: Array.isArray(base) ? base : [{ t: 'num', value: toRational(base) }],
    exponent: Array.isArray(exponent) ? exponent : [{ t: 'num', value: toRational(exponent) }],
  }),
  root: (radicand: Num | PromptNode[], index: 2 | 3 = 2): PromptNode => ({
    t: 'root',
    index,
    radicand: Array.isArray(radicand) ? radicand : [{ t: 'num', value: toRational(radicand) }],
  }),
  abs: (inner: Num | PromptNode[]): PromptNode => ({ t: 'abs', inner: Array.isArray(inner) ? inner : [{ t: 'num', value: toRational(inner) }] }),
  v: (name: string): PromptNode => ({ t: 'var', name }),
  blank: (label?: string): PromptNode => (label ? { t: 'blank', label } : { t: 'blank' }),
  br: (): PromptNode => ({ t: 'br' }),
};

export function prompt(nodes: PromptNode[], visual?: Visual): StructuredPrompt {
  return visual ? { nodes, visual } : { nodes };
}

/* ------------------------------------------------------------------ */
/* Answer values                                                        */
/* ------------------------------------------------------------------ */

export const A = {
  number: (value: Num): AnswerValue => ({ type: 'NUMBER', value: toRational(value) }),
  ratio: (first: Num, second: Num): AnswerValue => ({ type: 'RATIO', first: toRational(first), second: toRational(second) }),
  choice: (id: string): AnswerValue => ({ type: 'CHOICE', id }),
  time: (hour: number, minute: number, period?: 'AM' | 'PM'): AnswerValue => (period ? { type: 'TIME', hour, minute, period } : { type: 'TIME', hour, minute }),
  pair: (x: Num, y: Num): AnswerValue => ({ type: 'PAIR', x: toRational(x), y: toRational(y) }),
  qr: (quotient: number | bigint, remainder: number | bigint): AnswerValue => ({ type: 'QR', quotient: BigInt(quotient), remainder: BigInt(remainder) }),
  linear: (variable: string, coefficient: Num, constant: Num): AnswerValue => ({
    type: 'LINEAR',
    variable,
    coefficient: toRational(coefficient),
    constant: toRational(constant),
  }),
};

/* ------------------------------------------------------------------ */
/* Solutions                                                            */
/* ------------------------------------------------------------------ */

export function step(content: PromptNode[], type = 'EXPLAIN', data?: Record<string, unknown>): SolutionStep {
  return data ? { type, content, data } : { type, content };
}

export function solution(strategy: string, steps: SolutionStep[], result: AnswerValue, title?: string): SolutionTree {
  return title ? { strategy, title, steps, result } : { strategy, steps, result };
}

/** Split a list of strategies into the primary solution + alternatives for QuestionInput. */
export function strategies(trees: SolutionTree[]): { solution: SolutionTree; alternativeSolutions: SolutionTree[] } {
  const [first, ...rest] = trees;
  if (!first) throw new Error('strategies() needs at least one SolutionTree');
  return { solution: first, alternativeSolutions: rest };
}

/** "COMMON_DENOMINATOR" → "Common denominator" */
export function strategyTitle(tree: SolutionTree): string {
  if (tree.title) return tree.title;
  const words = tree.strategy.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function allStrategies(question: { solution: SolutionTree; alternativeSolutions: readonly SolutionTree[] }): SolutionTree[] {
  return [question.solution, ...question.alternativeSolutions];
}

/* ------------------------------------------------------------------ */
/* Common answer schemas                                                */
/* ------------------------------------------------------------------ */

export const SCHEMA = {
  integer: (units?: string[]): AnswerSchema => ({
    accepts: ['INTEGER'],
    widget: 'TEXT',
    hint: 'Type a whole number.',
    ...(units ? { units } : {}),
  }),
  /** Integers or decimals (e.g. 4.75). */
  decimal: (units?: string[]): AnswerSchema => ({
    accepts: ['INTEGER', 'DECIMAL'],
    widget: 'TEXT',
    hint: 'Type a number, for example 4.75.',
    ...(units ? { units } : {}),
  }),
  money: (): AnswerSchema => ({
    accepts: ['INTEGER', 'DECIMAL'],
    widget: 'TEXT',
    hint: 'Type a dollar amount, for example 3.25 or $3.25.',
    units: ['$', 'dollars', 'dollar'],
  }),
  cents: (): AnswerSchema => ({
    accepts: ['INTEGER'],
    widget: 'TEXT',
    hint: 'Type the number of cents, for example 63.',
    units: ['¢', 'c', 'cents', 'cent'],
  }),
  /** Fraction / mixed / whole number entry using the fraction boxes. */
  fraction: (): AnswerSchema => ({
    accepts: ['INTEGER', 'RATIONAL', 'MIXED_NUMBER'],
    widget: 'FRACTION',
    hint: 'Fill in a fraction (numerator over denominator). Add a whole number for a mixed number.',
  }),
  /** Any exact number: whole, decimal, fraction or mixed number, typed in one box. */
  anyNumber: (units?: string[]): AnswerSchema => ({
    accepts: ['INTEGER', 'DECIMAL', 'RATIONAL', 'MIXED_NUMBER'],
    widget: 'TEXT',
    hint: 'Type a number: whole (12), decimal (2.5), fraction (3/4) or mixed number (1 1/2).',
    ...(units ? { units } : {}),
  }),
  /** Probability-style answers: fraction, decimal or percent. */
  probability: (): AnswerSchema => ({
    accepts: ['INTEGER', 'DECIMAL', 'RATIONAL', 'PERCENTAGE'],
    widget: 'TEXT',
    hint: 'Type a fraction (1/4), a decimal (0.25) or a percent (25%).',
  }),
  percent: (): AnswerSchema => ({
    accepts: ['PERCENTAGE', 'INTEGER', 'DECIMAL'],
    widget: 'TEXT',
    hint: 'Type a percent, for example 35 or 35%.',
    percentContext: true,
  }),
  ratio: (): AnswerSchema => ({
    accepts: ['RATIO'],
    widget: 'TEXT',
    hint: 'Type a ratio like 3:5 (or 3 to 5).',
  }),
  time: (requirePeriod = false): AnswerSchema => ({
    accepts: ['TIME'],
    widget: 'TEXT',
    hint: requirePeriod ? 'Type a time like 3:05 PM.' : 'Type a time like 3:05.',
    requirePeriod,
  }),
  pair: (): AnswerSchema => ({
    accepts: ['ORDERED_PAIR'],
    widget: 'TEXT',
    hint: 'Type an ordered pair like (3, -2).',
  }),
  quotientRemainder: (): AnswerSchema => ({
    accepts: ['QUOTIENT_REMAINDER'],
    widget: 'TEXT',
    hint: 'Type the quotient and remainder like 8 R 3 (just 8 if there is no remainder).',
  }),
  scientific: (): AnswerSchema => ({
    accepts: ['SCIENTIFIC', 'INTEGER', 'DECIMAL'],
    widget: 'TEXT',
    hint: 'Type scientific notation like 4.5 x 10^6 (or 4.5e6).',
  }),
  factorization: (): AnswerSchema => ({
    accepts: ['FACTORIZATION'],
    widget: 'TEXT',
    hint: 'Type a product of primes like 2 x 2 x 3 (or 2^2 x 3).',
  }),
  expression: (variable = 'x'): AnswerSchema => ({
    accepts: ['EXPRESSION'],
    widget: 'TEXT',
    hint: `Type an expression like 6${variable} - 12.`,
    variable,
  }),
  choice: (choices: ChoiceOption[], hint = 'Choose one answer.'): AnswerSchema => ({
    accepts: ['CHOICE'],
    widget: 'CHOICE',
    hint,
    choices,
  }),
};

/** Standard comparison choices used by many skills. */
export const COMPARE_CHOICES: ChoiceOption[] = [
  { id: '<', label: '<' },
  { id: '=', label: '=' },
  { id: '>', label: '>' },
];

export const YES_NO_CHOICES: ChoiceOption[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
];
