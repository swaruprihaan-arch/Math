/**
 * Local helpers for Kindergarten–Grade 2 skills (shared by gradeK.ts, grade1.ts, grade2.ts).
 * All randomness comes from the SkillContext's RandomSource.
 *
 * House style for K–2: very few words. Prompts ideally ≤ 8 words; let the visual and the math carry the meaning.
 * Every question offers at least two ways to solve it (short titled strategies, short steps).
 */
import { A, P, prompt, SCHEMA, solution, step, strategies } from '../../domain/question/build';
import type { AnswerSchema, AnswerValue, ChoiceOption, PromptNode, Question, SolutionStep, SolutionTree, Visual } from '../../domain/question/types';
import { rat } from '../../domain/rational/rational';
import { pickItem, pickNames, plural, type ItemNoun } from '../helpers';
import type { SkillContext } from '../skill';

export type StepSpec = string | PromptNode[];

/** A hand-written strategy: short title + 1–4 short steps. */
export interface Way {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly StepSpec[];
}

/** A strategy given either as a hand-written Way or a ready-made SolutionTree (from src/solutions/strategies). */
export type WayInput = Way | SolutionTree;

export function toSteps(specs: readonly StepSpec[], type = 'EXPLAIN'): SolutionStep[] {
  return specs.map((s) => step(typeof s === 'string' ? [P.text(s)] : s, type));
}

export function way(id: string, title: string, ...steps: StepSpec[]): Way {
  return { id, title, steps };
}

function isTree(w: WayInput): w is SolutionTree {
  return 'result' in w;
}

/** Turn ways into SolutionTrees with the given result; drop duplicate strategy ids (first wins). */
export function buildWays(ways: readonly WayInput[], result: AnswerValue): SolutionTree[] {
  const seen = new Set<string>();
  const trees: SolutionTree[] = [];
  for (const w of ways) {
    const tree = isTree(w) ? w : solution(w.id, toSteps(w.steps), result, w.title);
    if (seen.has(tree.strategy)) continue;
    seen.add(tree.strategy);
    trees.push(tree);
  }
  return trees;
}

/** Prepend a short step (e.g. the equation for a story) to every strategy tree. */
export function withIntro(trees: readonly SolutionTree[], intro: string): SolutionTree[] {
  return trees.map((t) => ({ ...t, steps: [step([P.text(intro)], 'SET_UP'), ...t.steps] }));
}

interface BaseOptions {
  nodes: PromptNode[];
  ways: readonly WayInput[];
  operation: string;
  visual?: Visual;
  standards?: string[];
}

function finish(ctx: SkillContext, o: BaseOptions, answer: AnswerValue, schema: AnswerSchema, extra: { answerDisplay?: 'money' } = {}): Question {
  return ctx.question({
    prompt: prompt(o.nodes, o.visual),
    operation: o.operation,
    canonicalAnswer: answer,
    answerSchema: schema,
    ...strategies(buildWays(o.ways, answer)),
    ...extra,
    standards: o.standards,
  });
}

/** Whole-number answer question. */
export function intQ(ctx: SkillContext, o: BaseOptions & { answer: number; units?: string[] }): Question {
  return finish(ctx, o, A.number(o.answer), SCHEMA.integer(o.units));
}

/** Multiple-choice question. */
export function choiceQ(ctx: SkillContext, o: BaseOptions & { choices: ChoiceOption[]; correctId: string; hint?: string }): Question {
  return finish(ctx, o, A.choice(o.correctId), SCHEMA.choice(o.choices, o.hint ?? 'Choose one.'));
}

/** Clock-time question (h:mm). A period makes a.m./p.m. required. */
export function timeQ(ctx: SkillContext, o: BaseOptions & { hour: number; minute: number; period?: 'AM' | 'PM' }): Question {
  return finish(ctx, o, A.time(o.hour, o.minute, o.period), SCHEMA.time(o.period !== undefined));
}

/** Cents answer (63 or 63¢). */
export function centsQ(ctx: SkillContext, o: BaseOptions & { cents: number }): Question {
  return finish(ctx, o, A.number(o.cents), SCHEMA.cents());
}

/** Dollar answer ($2.75). */
export function dollarsQ(ctx: SkillContext, o: BaseOptions & { cents: number }): Question {
  return finish(ctx, o, A.number(rat(o.cents, 100)), SCHEMA.money(), { answerDisplay: 'money' });
}

/** "$2.75" text for prompts/steps (PDF-safe). */
export function dollarText(cents: number): string {
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A sequence like "5, 6, ?, 8" as prompt nodes. */
export function sequenceNodes(seq: readonly number[], missing: number): PromptNode[] {
  const nodes: PromptNode[] = [];
  seq.forEach((n, i) => {
    if (i > 0) nodes.push(P.text(', '));
    nodes.push(i === missing ? P.blank() : P.num(n));
  });
  return nodes;
}

/** Two short ways to count n objects: one by one, and in groups (5s, or 2s for small n). */
export function countingWays(n: number, noun: string): Way[] {
  const oneByOne = way('COUNT_ONE_BY_ONE', 'Count one by one', `Touch each ${noun} and count.`, `The last number is ${n}.`);
  if (n >= 5) {
    const fives = Math.floor(n / 5);
    const rest = n - fives * 5;
    const fiveList = Array.from({ length: fives }, (_, i) => (i + 1) * 5).join(', ');
    const restList = Array.from({ length: rest }, (_, i) => fives * 5 + i + 1).join(', ');
    return [
      oneByOne,
      way('COUNT_BY_FIVES', 'Count by 5s', `Circle groups of 5: ${fiveList}.`, rest > 0 ? `Count on the rest: ${restList}.` : `That is all of them: ${n}.`),
    ];
  }
  const twos = Math.floor(n / 2);
  const rest = n % 2;
  if (twos === 0) return [oneByOne, way('SEE_IT', 'See it at a glance', `There is just ${n}.`, `So the answer is ${n}.`)];
  const twoList = Array.from({ length: twos }, (_, i) => (i + 1) * 2).join(', ');
  return [oneByOne, way('COUNT_BY_TWOS', 'Count by 2s', `Count pairs: ${twoList}.`, rest ? `1 more makes ${n}.` : `That is ${n}.`)];
}

/* ------------------------------------------------------------------ */
/* Number names (2.NBT.3)                                               */
/* ------------------------------------------------------------------ */

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0–999 in words: 412 → "four hundred twelve", 45 → "forty-five". */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new RangeError(`numberToWords supports 0–999, got ${n}`);
  if (n < 20) return ONES[n] as string;
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)] as string;
    return n % 10 === 0 ? t : `${t}-${ONES[n % 10]}`;
  }
  const h = `${ONES[Math.floor(n / 100)]} hundred`;
  return n % 100 === 0 ? h : `${h} ${numberToWords(n % 100)}`;
}

/* ------------------------------------------------------------------ */
/* Addition / subtraction story problems (1.OA.1, 2.OA.1)               */
/* Situation types from the CA CCSSM Glossary, Table 1. Short wording.  */
/* ------------------------------------------------------------------ */

export type StoryKind =
  | 'ADD_TO_RESULT'
  | 'TAKE_FROM_RESULT'
  | 'PUT_TOGETHER_TOTAL'
  | 'ADD_TO_CHANGE'
  | 'TAKE_FROM_CHANGE'
  | 'COMPARE_DIFFERENCE'
  | 'ADD_TO_START'
  | 'COMPARE_BIGGER';

export interface Story {
  readonly kind: StoryKind;
  readonly text: string;
  readonly answer: number;
  /** Equation with a box for the unknown, e.g. "5 + ? = 8". */
  readonly equation: string;
  /** The computation that finds the answer: a + b or a − b. */
  readonly compute: { readonly op: 'ADD' | 'SUBTRACT'; readonly a: number; readonly b: number };
  readonly item: ItemNoun;
}

/** Generate a one-step story whose numbers (and answer) stay within [1, max]. */
export function additionSubtractionStory(ctx: SkillContext, kinds: readonly StoryKind[], max: number, minTotal = 3): Story {
  const { rng } = ctx;
  const kind = rng.choose(kinds);
  const item = pickItem(rng);
  const [n, m] = pickNames(rng, 2) as [string, string];
  const things = (k: number) => `${k} ${plural(k, item.singular, item.plural)}`;
  // Total c with parts a + b = c, all >= 1.
  const c = rng.integer(Math.min(minTotal, max), max);
  const a = rng.integer(1, c - 1);
  const b = c - a;
  const P_ = item.plural;
  switch (kind) {
    case 'ADD_TO_RESULT':
      return { kind, item, text: `${n} has ${things(a)}. ${b} more come. How many now?`, answer: c, equation: `${a} + ${b} = ?`, compute: { op: 'ADD', a, b } };
    case 'TAKE_FROM_RESULT':
      return { kind, item, text: `${n} has ${things(c)}. ${n} gives away ${b}. How many left?`, answer: a, equation: `${c} − ${b} = ?`, compute: { op: 'SUBTRACT', a: c, b } };
    case 'PUT_TOGETHER_TOTAL':
      return { kind, item, text: `${n} has ${things(a)}. ${m} has ${b}. How many in all?`, answer: c, equation: `${a} + ${b} = ?`, compute: { op: 'ADD', a, b } };
    case 'ADD_TO_CHANGE':
      return { kind, item, text: `${n} has ${things(a)}. Gets some more. Now ${c}. How many more?`, answer: b, equation: `${a} + ? = ${c}`, compute: { op: 'SUBTRACT', a: c, b: a } };
    case 'TAKE_FROM_CHANGE':
      return { kind, item, text: `${n} had ${things(c)}. Gave some away. Now ${a}. How many given?`, answer: b, equation: `${c} − ? = ${a}`, compute: { op: 'SUBTRACT', a: c, b: a } };
    case 'COMPARE_DIFFERENCE':
      return { kind, item, text: `${n} has ${things(c)}. ${m} has ${a}. How many more does ${n} have?`, answer: b, equation: `${a} + ? = ${c}`, compute: { op: 'SUBTRACT', a: c, b: a } };
    case 'ADD_TO_START':
      return { kind, item, text: `${n} had some ${P_}. Got ${b} more. Now ${c}. How many first?`, answer: a, equation: `? + ${b} = ${c}`, compute: { op: 'SUBTRACT', a: c, b } };
    case 'COMPARE_BIGGER':
      return { kind, item, text: `${m} has ${things(a)}. ${n} has ${b} more. How many does ${n} have?`, answer: c, equation: `${a} + ${b} = ?`, compute: { op: 'ADD', a, b } };
  }
}

/* ------------------------------------------------------------------ */
/* Clock helpers                                                        */
/* ------------------------------------------------------------------ */

export function hhmm(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

/** Two ways to read an analog clock. */
export function clockWays(hour: number, minute: number): Way[] {
  const t = hhmm(hour, minute);
  const hourStep = minute === 0 ? `Short hand on ${hour}: hour is ${hour}.` : `Short hand just past ${hour}: hour is ${hour}.`;
  const minuteStep = minute === 0 ? 'Long hand on 12: 0 minutes.' : `Long hand on ${minute / 5}: count by 5s to ${minute}.`;
  const named =
    minute === 0
      ? `Long hand on 12 means "o'clock": ${hour} o'clock.`
      : minute === 30
        ? `Long hand on 6 means "half past": half past ${hour}.`
        : minute === 15
          ? `Long hand on 3 means "quarter past" ${hour}.`
          : minute === 45
            ? `Long hand on 9 means 15 minutes before ${addHours(hour, 1)}.`
            : `Long hand is ${minute} minutes past the hour.`;
  return [
    way('HOUR_HAND_FIRST', 'Hour hand first', hourStep, minuteStep, `Time: ${t}.`),
    way('NAME_THE_TIME', 'Say it in words', named, `Write it as ${t}.`),
  ];
}

export function addHours(hour: number, add: number): number {
  return ((((hour - 1 + add) % 12) + 12) % 12) + 1;
}
