/**
 * Order of operations engine. Expressions are ASTs evaluated exactly (no eval / Function).
 * Division is generated inversely so every intermediate value is a whole number.
 */
import { formatNumber } from '../../domain/answer/format';
import { E, evaluate, exprToText, intermediateValues, reduceFully, toNodes, topLevelTerms, usesOperator, type BinOp, type Expr } from '../../domain/expression/expression';
import { A, buildQuestion, P, prompt, SCHEMA, solution, step, strategies, withRetries } from '../../domain/question/build';
import type { Difficulty, PromptNode, Question, SettingsValidationResult, SolutionStep, SolutionTree } from '../../domain/question/types';
import type { RandomSource } from '../../domain/random/random';
import { absR, isInteger, toNumber } from '../../domain/rational/rational';

export type OrderOperator = '+' | '-' | '*' | '/' | '^';

export interface OrderSettings {
  difficulty: Difficulty;
  /** Operations that may appear (pick several). */
  operators: OrderOperator[];
  allowNegativeResults: boolean;
}

export const ORDER_GENERATOR_ID = 'order-of-operations';
export const ORDER_GENERATOR_VERSION = '2.0.0';

export function defaultOrderSettings(): OrderSettings {
  return { difficulty: 'MEDIUM', operators: ['+', '-', '*', '/', '^'], allowNegativeResults: false };
}

export function validateOrderSettings(s: OrderSettings): SettingsValidationResult {
  const errors: string[] = [];
  if (s.operators.length < 2) errors.push('Pick at least two operations so order matters.');
  return { valid: errors.length === 0, errors };
}

type Tier = 1 | 2 | 3;
interface Pattern {
  tier: Tier;
  ops: OrderOperator[];
  build(rng: RandomSource, big: number): Expr;
}

const n = E.n;
const g = (e: Expr, b: '()' | '[]' | '{}' = '()') => E.group(e, b);

const PATTERNS: Pattern[] = [
  { tier: 1, ops: ['+', '*'], build: (r, m) => E.add(n(r.integer(1, m)), E.mul(n(r.integer(2, 9)), n(r.integer(2, 9)))) },
  { tier: 1, ops: ['+', '*'], build: (r, m) => E.mul(g(E.add(n(r.integer(1, m)), n(r.integer(1, m)))), n(r.integer(2, 9))) },
  { tier: 1, ops: ['*', '-'], build: (r, m) => E.sub(E.mul(n(r.integer(2, 9)), n(r.integer(2, 9))), n(r.integer(1, m))) },
  { tier: 1, ops: ['-', '*'], build: (r) => E.sub(n(r.integer(30, 99)), E.mul(n(r.integer(2, 9)), n(r.integer(2, 9)))) },
  { tier: 1, ops: ['-', '*'], build: (r) => E.mul(g(E.sub(n(r.integer(10, 20)), n(r.integer(1, 9)))), n(r.integer(2, 9))) },
  {
    tier: 1,
    ops: ['+', '/'],
    build: (r, m) => {
      const d = r.integer(2, 9);
      return E.add(n(r.integer(1, m)), E.div(n(d * r.integer(1, 9)), n(d)));
    },
  },
  {
    tier: 1,
    ops: ['+', '/'],
    build: (r) => {
      const d = r.integer(2, 9);
      const total = d * r.integer(2, 9);
      const x = r.integer(1, total - 1);
      return E.div(g(E.add(n(x), n(total - x))), n(d));
    },
  },
  { tier: 1, ops: ['-', '+'], build: (r, m) => E.add(E.sub(n(r.integer(m, 3 * m)), n(r.integer(1, m))), n(r.integer(1, m))) },
  { tier: 1, ops: ['^', '+'], build: (r, m) => E.add(E.pow(n(r.integer(2, 9)), 2), n(r.integer(1, m))) },
  {
    tier: 1,
    ops: ['*', '/'],
    build: (r) => {
      const c = r.integer(2, 9);
      return E.div(E.mul(n(c * r.integer(1, 6)), n(r.integer(2, 9))), n(c));
    },
  },
  { tier: 2, ops: ['*', '+'], build: (r) => E.add(E.mul(n(r.integer(2, 12)), n(r.integer(2, 12))), E.mul(n(r.integer(2, 12)), n(r.integer(2, 12)))) },
  { tier: 2, ops: ['+', '*', '-'], build: (r, m) => E.sub(E.add(n(r.integer(1, m)), E.mul(n(r.integer(2, 12)), n(r.integer(2, 12)))), n(r.integer(1, m))) },
  { tier: 2, ops: ['*', '-', '+'], build: (r, m) => E.add(E.mul(n(r.integer(2, 9)), g(E.sub(n(r.integer(10, 20)), n(r.integer(1, 9))))), n(r.integer(1, m))) },
  // Legacy patterns (Math Lab): (a + b) × c − e², c + (a × b) ÷ d − e, (c − a) + (D ÷ d) + e²
  { tier: 2, ops: ['+', '*', '-', '^'], build: (r) => E.sub(E.mul(g(E.add(n(r.integer(2, 9)), n(r.integer(2, 9)))), n(r.integer(3, 12))), E.pow(n(r.integer(2, 9)), 2)) },
  {
    tier: 2,
    ops: ['+', '*', '/', '-'],
    build: (r) => {
      const d = r.integer(2, 9);
      return E.sub(E.add(n(r.integer(3, 12)), E.div(g(E.mul(n(d * r.integer(1, 4)), n(r.integer(2, 9)))), n(d))), n(r.integer(3, 12)));
    },
  },
  {
    tier: 2,
    ops: ['-', '+', '/', '^'],
    build: (r) => {
      const d = r.integer(2, 9);
      return E.add(E.add(g(E.sub(n(r.integer(10, 12)), n(r.integer(2, 9)))), g(E.div(n(d * r.integer(2, 10)), n(d)))), E.pow(n(r.integer(2, 9)), 2));
    },
  },
  { tier: 2, ops: ['^', '*', '+'], build: (r, m) => E.add(E.mul(E.pow(n(r.integer(2, 5)), 2), n(r.integer(2, 9))), n(r.integer(1, m))) },
  {
    tier: 2,
    ops: ['^', '-', '/'],
    build: (r) => {
      const c = r.integer(2, 9);
      return E.sub(E.pow(n(r.integer(5, 12)), 2), E.div(n(c * r.integer(1, 9)), n(c)));
    },
  },
  {
    tier: 3,
    ops: ['+', '*', '-', '/'],
    build: (r) => {
      // [ (a + b) × c − d ] ÷ e + f, with the bracket a multiple of e
      const e = r.integer(2, 9);
      const a = r.integer(2, 15);
      const b = r.integer(2, 15);
      const c = r.integer(2, 9);
      const inner = (a + b) * c;
      const d = inner % e === 0 ? e * r.integer(0, Math.min(5, Math.floor(inner / e) - 1)) : inner % e;
      return E.add(E.div(g(E.sub(E.mul(g(E.add(n(a), n(b))), n(c)), n(d)), '[]'), n(e)), n(r.integer(1, 30)));
    },
  },
  { tier: 3, ops: ['+', '*', '-'], build: (r) => E.sub(g(E.add(n(r.integer(10, 50)), g(E.mul(n(r.integer(2, 9)), g(E.sub(n(r.integer(10, 20)), n(r.integer(1, 9))))), '[]')), '{}'), n(r.integer(1, 20))) },
  { tier: 3, ops: ['^', '-', '+', '*'], build: (r) => E.sub(E.pow(n(r.integer(3, 6)), 3), E.mul(g(E.add(n(r.integer(2, 12)), n(r.integer(2, 12)))), n(r.integer(2, 9)))) },
  {
    tier: 3,
    ops: ['^', '*', '-', '+', '/'],
    build: (r) => {
      const d = r.integer(2, 9);
      return E.add(E.mul(E.pow(n(2), r.integer(2, 5)), g(E.sub(n(r.integer(10, 30)), n(r.integer(1, 9))))), E.div(n(d * r.integer(2, 12)), n(d)));
    },
  },
];

function chainPattern(op: OrderOperator): Pattern {
  return {
    tier: 1,
    ops: [op],
    build: (r, m) => {
      if (op === '^') return E.pow(n(r.integer(2, 9)), 2);
      if (op === '/') {
        const c = r.integer(2, 5);
        const b = r.integer(2, 5);
        return E.div(E.div(n(b * c * r.integer(1, 5)), n(b)), n(c));
      }
      const mk = (): Expr => n(op === '*' ? r.integer(2, 9) : r.integer(1, m));
      const bin = op === '+' ? E.add : op === '-' ? E.sub : E.mul;
      return bin(bin(op === '-' ? n(r.integer(2 * m, 4 * m)) : mk(), mk()), mk());
    },
  };
}

function patternsFor(s: OrderSettings): Pattern[] {
  const allowed = new Set(s.operators);
  const tier: Tier = s.difficulty === 'EASY' ? 1 : s.difficulty === 'HARD' ? 3 : 2;
  const fits = PATTERNS.filter((p) => p.ops.every((o) => allowed.has(o)));
  const exact = fits.filter((p) => p.tier === tier);
  if (exact.length > 0) return exact;
  const near = fits.filter((p) => Math.abs(p.tier - tier) === 1);
  if (near.length > 0) return near;
  if (fits.length > 0) return fits;
  return s.operators.map(chainPattern);
}

function opUsed(e: Expr, o: OrderOperator): boolean {
  return usesOperator(e, o === '^' ? '^' : (o as BinOp));
}

/* ------------------------------------------------------------------ */
/* Strategies                                                           */
/* ------------------------------------------------------------------ */

const LABEL: Record<string, string> = {
  EXPONENT: 'Exponent',
  MULTIPLY: 'Multiply',
  DIVIDE: 'Divide',
  ADD: 'Add',
  SUBTRACT: 'Subtract',
};

function pemdasStrategy(expr: Expr): SolutionTree {
  const steps: SolutionStep[] = [step([P.text('Order: ( ) → exponents → × ÷ → + −')], 'ORDER_RULE')];
  for (const r of reduceFully(expr)) {
    const label = r.insideGroup ? `Inside ( ): ${r.text}` : `${LABEL[r.kind] ?? r.kind}: ${r.text}`;
    const after: PromptNode[] = r.after.k === 'num' ? [P.strong(formatNumber(r.after.v))] : toNodes(r.after);
    steps.push(step([P.text(label), P.br(), ...after], r.kind, { value: r.value }));
  }
  return solution('ONE_STEP_AT_A_TIME', steps, A.number(evaluate(expr)), 'One step at a time');
}

function termByTerm(expr: Expr): SolutionTree | null {
  const terms = topLevelTerms(expr);
  if (terms.length < 2) return null;
  const steps: SolutionStep[] = [step([P.text(`Split at + and − into ${terms.length} parts.`)], 'SPLIT')];
  terms.forEach((t, i) => {
    const v = evaluate(t.term);
    if (t.term.k !== 'num') steps.push(step([P.text(`Part ${i + 1}: ${exprToText(t.term)} = ${formatNumber(v)}`)], 'TERM', { value: v }));
  });
  const combined = terms.map((t, i) => `${i === 0 ? (t.sign === '-' ? '−' : '') : t.sign === '-' ? ' − ' : ' + '}${formatNumber(evaluate(t.term))}`).join('');
  steps.push(step([P.text(`Combine left to right: ${combined} = ${formatNumber(evaluate(expr))}`)], 'COMBINE'));
  return solution('TERM_BY_TERM', steps, A.number(evaluate(expr)), 'Part by part');
}

function distributive(expr: Expr): SolutionTree | null {
  if (expr.k !== 'bin' || expr.op !== '*') return null;
  const [groupSide, other] = expr.l.k === 'group' ? [expr.l, expr.r] : expr.r.k === 'group' ? [expr.r, expr.l] : [null, null];
  if (!groupSide || groupSide.k !== 'group' || !other || other.k !== 'num') return null;
  const inner = groupSide.e;
  if (inner.k !== 'bin' || (inner.op !== '+' && inner.op !== '-') || inner.l.k !== 'num' || inner.r.k !== 'num') return null;
  const k = other.v;
  const p1 = evaluate(E.mul(inner.l, other));
  const p2 = evaluate(E.mul(inner.r, other));
  const sym = inner.op === '+' ? '+' : '−';
  return solution(
    'DISTRIBUTIVE',
    [
      step([P.text(`Share the ${formatNumber(k)} with each number in the ( ).`)], 'DISTRIBUTE'),
      step([P.text(`${formatNumber(inner.l.v)} × ${formatNumber(k)} ${sym} ${formatNumber(inner.r.v)} × ${formatNumber(k)} = ${formatNumber(p1)} ${sym} ${formatNumber(p2)}`)], 'PRODUCTS'),
      step([P.text(`= ${formatNumber(evaluate(expr))}`)], 'RESULT'),
    ],
    A.number(evaluate(expr)),
    'Distributive property',
  );
}

function groupsFirst(expr: Expr): SolutionTree {
  const steps: SolutionStep[] = [];
  const replaceGroups = (e: Expr): Expr => {
    switch (e.k) {
      case 'group': {
        const v = evaluate(e.e);
        steps.push(step([P.text(`${exprToText(e)} = ${formatNumber(v)}`)], 'GROUP', { value: v }));
        return n(v);
      }
      case 'pow':
        return { ...e, base: replaceGroups(e.base) };
      case 'bin':
        return { ...e, l: replaceGroups(e.l), r: replaceGroups(e.r) };
      default:
        return e;
    }
  };
  const flat = replaceGroups(expr);
  if (steps.length === 0) steps.push(step([P.text('No groups — start with exponents, then × and ÷.')], 'NO_GROUPS'));
  steps.push(step([P.text('Now: '), ...toNodes(flat)], 'REWRITE'));
  steps.push(step([P.text(`Work it out: ${formatNumber(evaluate(expr))}`)], 'RESULT'));
  return solution('GROUPS_FIRST', steps, A.number(evaluate(expr)), 'Groups first');
}

/* ------------------------------------------------------------------ */

export function generateOrder(settings: OrderSettings, rng: RandomSource): Question {
  const check = validateOrderSettings(settings);
  if (!check.valid) throw new Error(`Invalid order-of-operations settings: ${check.errors.join(' ')}`);
  const candidates = patternsFor(settings);
  const big = settings.difficulty === 'EASY' ? 9 : settings.difficulty === 'MEDIUM' ? 15 : 30;
  const limit = settings.difficulty === 'HARD' ? 5000 : 500;
  const { value: expr, retryCount } = withRetries(
    { topic: 'ORDER_OF_OPERATIONS', generatorId: ORDER_GENERATOR_ID, settings },
    () => rng.choose(candidates).build(rng, big),
    (e) => {
      try {
        const values = intermediateValues(e);
        const allowNegative = settings.allowNegativeResults || settings.difficulty === 'HARD';
        return values.every((v) => isInteger(v) && toNumber(absR(v)) <= limit && (allowNegative || v.numerator >= 0n));
      } catch {
        return false;
      }
    },
  );
  const value = evaluate(expr);
  const trees = [pemdasStrategy(expr), termByTerm(expr) ?? distributive(expr) ?? groupsFirst(expr)];
  const hasExponent = opUsed(expr, '^');
  return buildQuestion(
    {
      topic: 'ORDER_OF_OPERATIONS',
      subtype: settings.difficulty,
      difficulty: settings.difficulty,
      prompt: prompt([...toNodes(expr), P.op('='), P.blank()]),
      operands: [],
      operation: 'EVALUATE',
      canonicalAnswer: A.number(value),
      answerSchema: SCHEMA.integer(),
      ...strategies(trees),
      generatorId: ORDER_GENERATOR_ID,
      generatorVersion: ORDER_GENERATOR_VERSION,
      constraints: { operators: settings.operators, text: exprToText(expr) },
      retryCount,
      standards: hasExponent ? ['6.EE.1', '6.EE.2c'] : ['5.OA.1'],
    },
    rng,
  );
}
