/**
 * Multiple strategies for fraction problems. All take exact Rationals and return >= 2 SolutionTrees.
 */
import { A, P, solution, step } from '../../domain/question/build';
import type { SolutionStep, SolutionTree } from '../../domain/question/types';
import { abs, add, div, gcd, isInteger, mul, normalizeRational, rat, sub, toMixed, type Rational } from '../../domain/rational/rational';
import {
  addSubtractSolution,
  divideSolution,
  improperToMixedSolution,
  mixedToImproperSolution,
  multiplySolution,
  rawFraction,
  simplifySteps,
  toMixedStep,
} from '../fractionSolutions';

function withTitle(tree: SolutionTree, title: string): SolutionTree {
  return { ...tree, title };
}

function crossMultiply(a: Rational, b: Rational, op: 'ADD' | 'SUBTRACT'): SolutionTree {
  const n1 = a.numerator * b.denominator;
  const n2 = b.numerator * a.denominator;
  const d = a.denominator * b.denominator;
  const n = op === 'ADD' ? n1 + n2 : n1 - n2;
  const symbol = op === 'ADD' ? '+' : '−';
  const steps: SolutionStep[] = [
    step([P.text('Use a/b ' + symbol + ' c/d = (a×d ' + symbol + ' b×c) / (b×d).')], 'FORMULA'),
    step(
      [P.text(`Top: ${a.numerator}×${b.denominator} ${symbol} ${b.numerator}×${a.denominator} = ${n1} ${symbol} ${n2} = ${n}. Bottom: ${a.denominator}×${b.denominator} = ${d}.`)],
      'CROSS_MULTIPLY',
      { numerator: n, denominator: d },
    ),
    step([P.text('So the answer is '), ...rawFraction(n, d)], 'RESULT_UNSIMPLIFIED'),
    ...simplifySteps(n, d).steps,
  ];
  const result = op === 'ADD' ? add(a, b) : sub(a, b);
  const mixed = toMixedStep(result);
  if (mixed) steps.push(mixed);
  return solution('CROSS_MULTIPLY', steps, A.number(result), 'Cross-multiply');
}

function wholesAndParts(a: Rational, b: Rational): SolutionTree | null {
  // Only for adding two positive values where at least one is a mixed number.
  if (a.numerator <= 0n || b.numerator <= 0n) return null;
  const ma = toMixed(a);
  const mb = toMixed(b);
  if (ma.whole === 0n && mb.whole === 0n) return null;
  const fa = rat(ma.numerator, ma.denominator);
  const fb = rat(mb.numerator, mb.denominator);
  const wholes = ma.whole + mb.whole;
  const parts = add(fa, fb);
  const total = add(a, b);
  const steps: SolutionStep[] = [
    step([P.text(`Add the whole numbers: ${ma.whole} + ${mb.whole} = ${wholes}.`)], 'WHOLES'),
    step([P.text('Add the fraction parts: '), P.frac(fa), P.op('+'), P.frac(fb), P.op('='), P.frac(parts)], 'PARTS'),
    step([P.text(`Put them together: ${wholes} + `), P.frac(parts), P.op('='), P.mixed(total)], 'COMBINE'),
  ];
  return solution('WHOLES_AND_PARTS', steps, A.number(total), 'Wholes and parts');
}

/** a ± b */
export function fractionAddSubStrategies(a: Rational, b: Rational, op: 'ADD' | 'SUBTRACT'): SolutionTree[] {
  const trees = [withTitle(addSubtractSolution(a, b, op), 'Common denominator'), crossMultiply(a, b, op)];
  if (op === 'ADD') {
    const wp = wholesAndParts(a, b);
    if (wp) trees.push(wp);
  }
  return trees;
}

function multiplyAcrossFirst(a: Rational, b: Rational): SolutionTree {
  const n = a.numerator * b.numerator;
  const d = a.denominator * b.denominator;
  const result = mul(a, b);
  const steps: SolutionStep[] = [
    step([P.text('Multiply the tops and the bottoms: '), P.frac(a), P.op('×'), P.frac(b), P.op('='), ...rawFraction(n, d)], 'MULTIPLY', { numerator: n, denominator: d }),
    ...simplifySteps(n, d).steps,
  ];
  const mixed = toMixedStep(result);
  if (mixed) steps.push(mixed);
  return solution('MULTIPLY_ACROSS', steps, A.number(result), 'Multiply across');
}

function repeatedAdditionFraction(whole: bigint, f: Rational): SolutionTree | null {
  if (whole < 2n || whole > 6n || f.numerator <= 0n) return null;
  const terms: ReturnType<typeof P.frac>[] = [];
  for (let i = 0n; i < whole; i++) {
    if (i > 0n) terms.push(P.op('+'));
    terms.push(P.frac(f));
  }
  const result = mul(rat(whole), f);
  return solution(
    'REPEATED_ADDITION',
    [
      step([P.text(`${whole} groups of `), P.frac(f), P.text(': '), ...terms], 'GROUPS'),
      step([P.text(`Add the tops: ${whole} × ${f.numerator} = ${whole * f.numerator}, keep the bottom ${f.denominator}: `), ...rawFraction(whole * f.numerator, f.denominator), P.op('='), P.mixed(result)], 'RESULT'),
    ],
    A.number(result),
    'Equal groups',
  );
}

function areaModel(a: Rational, b: Rational): SolutionTree | null {
  if (a.numerator <= 0n || b.numerator <= 0n || abs(a.numerator) >= a.denominator || abs(b.numerator) >= b.denominator) return null;
  const boxes = a.denominator * b.denominator;
  const shaded = a.numerator * b.numerator;
  return solution(
    'AREA_MODEL',
    [
      step([P.text(`Draw a square. Cut one side into ${a.denominator} parts and the other into ${b.denominator}: ${boxes} small boxes.`)], 'GRID', { boxes }),
      step([P.text(`Shade ${a.numerator} × ${b.numerator} = ${shaded} boxes where the parts overlap.`)], 'SHADE', { shaded }),
      step([P.text('So the answer is '), ...rawFraction(shaded, boxes), P.op('='), P.frac(mul(a, b))], 'RESULT'),
    ],
    A.number(mul(a, b)),
    'Area model',
  );
}

/** a × b */
export function fractionMultiplyStrategies(a: Rational, b: Rational): SolutionTree[] {
  const g1 = gcd(a.numerator, b.denominator);
  const g2 = gcd(b.numerator, a.denominator);
  const trees: SolutionTree[] = [];
  if (g1 > 1n || g2 > 1n) {
    trees.push({ ...multiplySolution(a, b), strategy: 'SIMPLIFY_FIRST', title: 'Simplify first' });
  }
  trees.push(multiplyAcrossFirst(a, b));
  const groups = isInteger(a) ? repeatedAdditionFraction(a.numerator, b) : isInteger(b) ? repeatedAdditionFraction(b.numerator, a) : null;
  if (groups) trees.push(groups);
  const area = areaModel(a, b);
  if (area) trees.push(area);
  if (trees.length < 2) {
    // e.g. 7 × 9/4 with nothing to cancel: show the "of" meaning as a second path.
    const whole = isInteger(a) ? a : isInteger(b) ? b : null;
    const frac = whole === a ? b : a;
    const result = mul(a, b);
    trees.push(
      solution(
        'UNIT_FRACTION_FIRST',
        whole
          ? [
              step([P.text(`Find 1/${frac.denominator} of ${whole.numerator}: `), ...rawFraction(whole.numerator, frac.denominator), P.text('.')], 'UNIT'),
              step([P.text(`Take ${frac.numerator} of those: ${frac.numerator} × `), ...rawFraction(whole.numerator, frac.denominator), P.op('='), P.mixed(result)], 'SCALE'),
            ]
          : [
              step([P.text('Multiply by the top, then divide by the bottom: '), P.frac(a), P.text(` × ${b.numerator} = `), P.frac(mul(a, rat(b.numerator)))], 'TIMES_TOP'),
              step([P.text(`Divide by ${b.denominator}: `), P.frac(result)], 'DIVIDE_BOTTOM'),
            ],
        A.number(result),
        'Top first, then bottom',
      ),
    );
  }
  return trees;
}

function commonDenominatorDivide(a: Rational, b: Rational): SolutionTree {
  const d = a.denominator * b.denominator / gcd(a.denominator, b.denominator);
  const na = a.numerator * (d / a.denominator);
  const nb = b.numerator * (d / b.denominator);
  const result = div(a, b);
  const steps: SolutionStep[] = [
    step([P.text('Give both fractions the same denominator: '), ...rawFraction(na, d), P.op('÷'), ...rawFraction(nb, d)], 'COMMON_DENOMINATOR', { denominator: d }),
    step([P.text(`Same-size pieces, so divide the tops: ${na} ÷ ${nb} = `), ...rawFraction(na, nb)], 'DIVIDE_NUMERATORS'),
    ...simplifySteps(na, nb).steps,
  ];
  const mixed = toMixedStep(result);
  if (mixed) steps.push(mixed);
  return solution('COMMON_DENOMINATOR_DIVIDE', steps, A.number(result), 'Common denominators');
}

/** a ÷ b (b ≠ 0) */
export function fractionDivideStrategies(a: Rational, b: Rational): SolutionTree[] {
  return [withTitle(divideSolution(a, b), 'Keep, change, flip'), commonDenominatorDivide(a, b)];
}

function stepByStepSimplify(n: bigint, d: bigint): SolutionTree {
  const steps: SolutionStep[] = [];
  let x = abs(n);
  let y = d;
  const sign = n < 0n ? -1n : 1n;
  const primes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n];
  for (let guard = 0; guard < 30; guard++) {
    const p = primes.find((q) => x % q === 0n && y % q === 0n);
    if (!p) break;
    steps.push(step([P.text(`Both divide by ${p}: `), ...rawFraction(sign * x, y), P.op('='), ...rawFraction((sign * x) / p, y / p)], 'DIVIDE_COMMON_FACTOR', { factor: p }));
    x /= p;
    y /= p;
  }
  if (steps.length === 0) steps.push(step([P.text('No number except 1 divides both, so it is already simplest.')], 'ALREADY_SIMPLEST'));
  steps.push(step([P.text('No more common factors: '), P.frac(normalizeRational(n, d))], 'RESULT'));
  return solution('SMALL_FACTORS', steps, A.number(normalizeRational(n, d)), 'Divide by small factors');
}

/** Simplify n/d. */
export function simplifyFractionStrategies(n: bigint, d: bigint): SolutionTree[] {
  const value = normalizeRational(n, d);
  const gcf = simplifySteps(n, d);
  return [solution('DIVIDE_BY_GCF', gcf.steps, A.number(value), 'Divide by the GCF'), stepByStepSimplify(n, d)];
}

function takeOutWholes(value: Rational): SolutionTree {
  const m = toMixed(value);
  const d = value.denominator;
  return solution(
    'TAKE_OUT_WHOLES',
    [
      step([P.text(`Every ${d} pieces make 1 whole (${d}/${d} = 1).`)], 'WHOLE_SIZE'),
      step([P.text(`${abs(value.numerator)} pieces = ${m.whole} groups of ${d} with ${m.numerator} left over.`)], 'GROUP'),
      step([P.text('So '), P.frac(value), P.op('='), P.mixed(value)], 'RESULT'),
    ],
    A.number(value),
    'Take out wholes',
  );
}

export function improperToMixedStrategies(value: Rational): SolutionTree[] {
  return [withTitle(improperToMixedSolution(value), 'Divide'), takeOutWholes(value)];
}

function countTheParts(value: Rational): SolutionTree {
  const m = toMixed(value);
  const pieces = Array.from({ length: Number(m.whole) }, () => `${m.denominator}/${m.denominator}`);
  return solution(
    'COUNT_THE_PARTS',
    [
      step([P.text(`Each whole is ${m.denominator}/${m.denominator}: ${pieces.join(' + ')}${m.numerator ? ` + ${m.numerator}/${m.denominator}` : ''}.`)], 'WHOLES_AS_FRACTIONS'),
      step([P.text(`Count the pieces: ${m.whole * m.denominator} + ${m.numerator} = ${abs(value.numerator)}, so `), P.frac(value)], 'RESULT'),
    ],
    A.number(value),
    'Count the pieces',
  );
}

export function mixedToImproperStrategies(value: Rational): SolutionTree[] {
  return [withTitle(mixedToImproperSolution(value), 'Multiply and add'), countTheParts(value)];
}
