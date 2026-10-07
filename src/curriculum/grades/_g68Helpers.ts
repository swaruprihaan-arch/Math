/**
 * Local helpers for grade 6–8 skills: number formatting for step text, multi-strategy solution builders,
 * linear-expression rendering, and small integer utilities. Pure functions — all randomness comes from callers.
 */
import { formatAnswerValue, formatNumber } from '../../domain/answer/format';
import { A, P, solution, step, strategies, toRational } from '../../domain/question/build';
import type { AnswerValue, NumberStyle, PromptNode, SolutionStep, SolutionTree } from '../../domain/question/types';
import type { RandomSource } from '../../domain/random/random';
import {
  abs,
  div,
  gcd,
  isInteger,
  isTerminating,
  lcm,
  normalizeRational,
  rat,
  reciprocal,
  type Rational,
} from '../../domain/rational/rational';
import { multiplySolution } from '../../solutions/fractionSolutions';

export type Num = Rational | number | bigint;

/* ------------------------------------------------------------------ */
/* Formatting for step text                                             */
/* ------------------------------------------------------------------ */

/** Display text for a number: integers plain, others as fractions (unless a style is given). */
export function f(v: Num, style: NumberStyle = 'auto'): string {
  return formatNumber(toRational(v), style);
}

/** Integers plain, terminating values as decimals, otherwise fractions. */
export function nice(v: Num): string {
  return formatNumber(toRational(v), niceStyle(toRational(v)));
}

export function niceStyle(v: Rational): NumberStyle {
  if (isInteger(v)) return 'auto';
  return isTerminating(v) ? 'decimal' : 'fraction';
}

/** Like `nice` but negative values are wrapped in parentheses: (−3). */
export function np(v: Num): string {
  const r = toRational(v);
  const text = nice(r);
  return r.numerator < 0n ? `(${text})` : text;
}

export const fdec = (v: Num): string => f(v, 'decimal');
export const fmoney = (v: Num): string => f(v, 'money');
export const fmixed = (v: Num): string => f(v, 'mixed');

/** Number node that shows decimals as decimals and other non-integers as fractions. */
export function niceNode(v: Num, parenNegative = false): PromptNode {
  const r = toRational(v);
  const style = niceStyle(r);
  return parenNegative ? P.numP(r, style === 'auto' ? undefined : style) : P.num(r, style === 'auto' ? undefined : style);
}

/* ------------------------------------------------------------------ */
/* Multi-strategy solutions                                             */
/* ------------------------------------------------------------------ */

export type StepInput = string | PromptNode[];

export function s(content: StepInput, type = 'EXPLAIN', data?: Record<string, unknown>): SolutionStep {
  return step(typeof content === 'string' ? [P.text(content)] : content, type, data);
}

/** One way to solve: strategy id, student-facing title, the result, and the steps. */
export function way(strategy: string, title: string, result: AnswerValue, ...steps: StepInput[]): SolutionTree {
  return solution(
    strategy,
    steps.map((x) => s(x)),
    result,
    title,
  );
}

/** Spread into ctx.question({...}) — first tree is the primary solution, the rest are alternatives. */
export function ways(...trees: SolutionTree[]): { solution: SolutionTree; alternativeSolutions: SolutionTree[] } {
  return strategies(trees);
}

/* ------------------------------------------------------------------ */
/* Linear expressions & pairs                                           */
/* ------------------------------------------------------------------ */

/** Render coefficient·variable + constant as prompt nodes, e.g. 3x − 4, −x + 2, (1/2)x. */
export function linNodes(coefficient: Num, constant: Num, variable: string): PromptNode[] {
  const c = toRational(coefficient);
  const k = toRational(constant);
  const nodes: PromptNode[] = [];
  if (c.numerator !== 0n) {
    const mag = normalizeRational(abs(c.numerator), c.denominator);
    if (c.numerator < 0n) nodes.push(P.text('−'));
    if (!(isInteger(mag) && mag.numerator === 1n)) nodes.push(niceNode(mag));
    nodes.push(P.v(variable));
  }
  if (k.numerator !== 0n || nodes.length === 0) {
    const mag = normalizeRational(abs(k.numerator), k.denominator);
    if (nodes.length === 0) {
      nodes.push(niceNode(k));
    } else {
      nodes.push(P.op(k.numerator < 0n ? '−' : '+'), niceNode(mag));
    }
  }
  return nodes;
}

export function linText(coefficient: Num, constant: Num, variable: string): string {
  return formatAnswerValue(A.linear(variable, coefficient, constant));
}

/** "a·x" as text with 1/−1 coefficients simplified: "3x", "x", "−x", "1/2x". */
export function termText(coefficient: Num, variable: string): string {
  const c = toRational(coefficient);
  if (c.numerator === c.denominator) return variable;
  if (c.numerator === -c.denominator) return `−${variable}`;
  return `${nice(c)}${variable}`;
}

export function pairNodes(x: Num, y: Num): PromptNode[] {
  return [P.op('('), niceNode(x), P.op(','), niceNode(y), P.op(')')];
}

export function pairText(x: Num, y: Num): string {
  return `(${nice(x)}, ${nice(y)})`;
}

/* ------------------------------------------------------------------ */
/* Integer utilities                                                    */
/* ------------------------------------------------------------------ */

export function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('isqrt of negative');
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  while (x * x > n) x--;
  while ((x + 1n) * (x + 1n) <= n) x++;
  return x;
}

export function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;
  const r = isqrt(BigInt(n));
  return r * r === BigInt(n);
}

export function icbrt(n: number): number {
  const sign = n < 0 ? -1 : 1;
  const m = Math.abs(n);
  let r = Math.round(Math.cbrt(m));
  while (r * r * r > m) r--;
  while ((r + 1) * (r + 1) * (r + 1) <= m) r++;
  return sign * r;
}

export function isPerfectCube(n: number): boolean {
  const r = icbrt(n);
  return r * r * r === n;
}

export function factorsOf(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}

export function primeFactorText(n: number): string {
  const out: number[] = [];
  let x = n;
  for (let p = 2; p * p <= x; p++) {
    while (x % p === 0) {
      out.push(p);
      x /= p;
    }
  }
  if (x > 1) out.push(x);
  return out.length > 0 ? out.join(' × ') : String(n);
}

/** π used in grade 7–8 problems: exactly 3.14 = 314/100. */
export const PI_APPROX: Rational = rat(314, 100);

export const DEGREE_UNITS = ['°', 'degrees', 'degree', 'deg'];

export function squareUnits(unit: string): string[] {
  return [`${unit}²`, `square ${unit}`, `sq ${unit}`, `${unit}^2`, `${unit}2`, 'square units', 'sq units', 'units²'];
}

export function cubicUnits(unit: string): string[] {
  return [`${unit}³`, `cubic ${unit}`, `cu ${unit}`, `${unit}^3`, `${unit}3`, 'cubic units', 'units³'];
}

/** rng.integer over a [min, max] tuple (handy with ctx.tier). */
export function ri(rng: RandomSource, range: readonly [number, number]): number {
  return rng.integer(range[0], range[1]);
}

/** Random non-zero integer in [-max, -min] ∪ [min, max]. */
export function signedInt(rng: RandomSource, minAbs: number, maxAbs: number): number {
  const m = rng.integer(minAbs, maxAbs);
  return rng.bool() ? m : -m;
}

/* ------------------------------------------------------------------ */
/* Fraction division — second strategy (common denominators)            */
/* ------------------------------------------------------------------ */

/** a ÷ b by rewriting both with a common denominator and dividing the numerators. */
export function commonDenominatorDivision(a: Rational, b: Rational): SolutionTree {
  const L = lcm(a.denominator, b.denominator);
  const an = a.numerator * (L / a.denominator);
  const bn = b.numerator * (L / b.denominator);
  const result = div(a, b);
  const g = gcd(an, bn);
  const steps: StepInput[] = [
    [P.text(`Rewrite both numbers with the common denominator ${L}: `), { t: 'rawfrac', numerator: an, denominator: L }, P.op('÷'), { t: 'rawfrac', numerator: bn, denominator: L }],
    `When the denominators match, divide the numerators: ${an} ÷ ${bn}.`,
    g > 1n
      ? [P.text(`${an} ÷ ${bn} = `), { t: 'rawfrac', numerator: an, denominator: bn }, P.text(` = `), P.mixed(result)]
      : [P.text(`${an} ÷ ${bn} = `), P.mixed(result)],
  ];
  return way('COMMON_DENOMINATOR_DIVISION', 'Common denominators', A.number(result), ...steps);
}

/** a ÷ b by multiplying by the reciprocal (reuses the shared multiply steps). */
export function reciprocalDivision(a: Rational, b: Rational): SolutionTree {
  const flipped = reciprocal(b);
  const rest = multiplySolution(a, flipped, true);
  return {
    strategy: 'MULTIPLY_BY_RECIPROCAL',
    title: 'Multiply by the reciprocal',
    steps: [
      s(
        [P.text('Dividing by a number is the same as multiplying by its reciprocal: '), P.mixed(a), P.op('÷'), P.mixed(b), P.op('='), P.mixed(a), P.op('×'), P.frac(flipped)],
        'RECIPROCAL',
      ),
      ...rest.steps,
    ],
    result: A.number(div(a, b)),
  };
}
