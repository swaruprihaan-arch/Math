/**
 * Structured fraction solutions (spec §140). Steps carry Rationals in `data` (not display strings) and
 * renderable PromptNodes in `content`.
 *
 * Teaching path ≠ engine path: the engine computes a/b + c/d = (ad + bc)/bd, but the solution uses the LEAST common
 * denominator, e.g. 1/4 + 3/8 → 2/8 + 3/8 = 5/8. Tests assert the solution result equals the canonical answer.
 */
import { A, P, step } from '../domain/question/build';
import type { AnswerValue, PromptNode, SolutionStep, SolutionTree } from '../domain/question/types';
import {
  abs,
  add,
  div,
  gcd,
  isInteger,
  lcm,
  mul,
  normalizeRational,
  rat,
  reciprocal,
  sub,
  toMixed,
  type Rational,
} from '../domain/rational/rational';

/** Unreduced fraction for display inside steps (e.g. 9/12 before simplifying). */
export function rawFraction(numerator: bigint, denominator: bigint): PromptNode[] {
  return [{ t: 'rawfrac', numerator, denominator }];
}

function fracNode(value: Rational): PromptNode {
  return P.frac(value);
}

export function simplifySteps(numerator: bigint, denominator: bigint): { steps: SolutionStep[]; result: Rational } {
  const result = normalizeRational(numerator, denominator);
  const g = gcd(numerator, denominator);
  if (g <= 1n) {
    return { steps: [step([P.text('The fraction is already in simplest form.')], 'SIMPLIFY', { gcd: 1n, result })], result };
  }
  return {
    steps: [
      step(
        [P.text(`Simplify: the greatest common factor of ${abs(numerator)} and ${denominator} is ${g}. Divide both by ${g}: `), ...rawFraction(numerator, denominator), P.op('='), fracNode(result)],
        'SIMPLIFY',
        { gcd: g, result },
      ),
    ],
    result,
  };
}

export function toMixedStep(value: Rational): SolutionStep | null {
  if (isInteger(value) || abs(value.numerator) < value.denominator) return null;
  const m = toMixed(value);
  return step(
    [
      P.text(`As a mixed number: ${abs(value.numerator)} ÷ ${value.denominator} = ${m.whole} remainder ${m.numerator}, so `),
      fracNode(value),
      P.op('='),
      P.mixed(value),
    ],
    'TO_MIXED',
    { whole: m.whole, numerator: m.numerator, denominator: m.denominator, sign: m.sign },
  );
}

/** a ± b with least common denominator. */
export function addSubtractSolution(a: Rational, b: Rational, operation: 'ADD' | 'SUBTRACT', includeMixed = true): SolutionTree {
  const symbol = operation === 'ADD' ? '+' : '−';
  const L = lcm(a.denominator, b.denominator);
  const aScaled = a.numerator * (L / a.denominator);
  const bScaled = b.numerator * (L / b.denominator);
  const rawNumerator = operation === 'ADD' ? aScaled + bScaled : aScaled - bScaled;
  const steps: SolutionStep[] = [];

  if (a.denominator === b.denominator) {
    steps.push(step([P.text(`The denominators are already the same (${L}).`)], 'COMMON_DENOMINATOR', { denominator: L }));
  } else {
    steps.push(
      step([P.text(`Find the least common denominator: LCM(${a.denominator}, ${b.denominator}) = ${L}.`)], 'LCM', {
        values: [a.denominator, b.denominator],
        result: L,
      }),
    );
    for (const [value, scaled] of [
      [a, aScaled],
      [b, bScaled],
    ] as const) {
      if (value.denominator !== L) {
        const factor = L / value.denominator;
        steps.push(
          step(
            [P.text(`Multiply top and bottom by ${factor}: `), fracNode(value), P.op('='), ...rawFraction(scaled, L)],
            'EQUIVALENT_FRACTION',
            { from: value, to: { numerator: scaled, denominator: L }, factor },
          ),
        );
      }
    }
  }
  steps.push(
    step(
      [
        P.text(`${operation === 'ADD' ? 'Add' : 'Subtract'} the numerators: `),
        ...rawFraction(aScaled, L),
        P.op(symbol),
        ...rawFraction(bScaled, L),
        P.op('='),
        ...rawFraction(rawNumerator, L),
      ],
      operation === 'ADD' ? 'ADD_NUMERATORS' : 'SUBTRACT_NUMERATORS',
      { numerator: rawNumerator, denominator: L },
    ),
  );
  const simplified = simplifySteps(rawNumerator, L);
  steps.push(...simplified.steps);
  const result = operation === 'ADD' ? add(a, b) : sub(a, b);
  if (includeMixed) {
    const mixed = toMixedStep(result);
    if (mixed) steps.push(mixed);
  }
  return { strategy: 'COMMON_DENOMINATOR', steps, result: A.number(result) };
}

export function multiplySolution(a: Rational, b: Rational, includeMixed = true): SolutionTree {
  const steps: SolutionStep[] = [];
  const g1 = gcd(a.numerator, b.denominator);
  const g2 = gcd(b.numerator, a.denominator);
  if (g1 > 1n || g2 > 1n) {
    steps.push(
      step(
        [P.text(`Cross-cancel common factors: gcd(${abs(a.numerator)}, ${b.denominator}) = ${g1}, gcd(${abs(b.numerator)}, ${a.denominator}) = ${g2}.`)],
        'CROSS_CANCEL',
        { gcd1: g1, gcd2: g2 },
      ),
    );
  }
  // Denominators are positive, so both gcds are >= 1.
  const n = (a.numerator / g1) * (b.numerator / g2);
  const d = (a.denominator / g2) * (b.denominator / g1);
  steps.push(
    step(
      [P.text('Multiply numerators and multiply denominators: '), fracNode(a), P.op('×'), fracNode(b), P.op('='), ...rawFraction(n, d)],
      'MULTIPLY',
      { numerator: n, denominator: d },
    ),
  );
  steps.push(...simplifySteps(n, d).steps);
  const result = mul(a, b);
  if (includeMixed) {
    const mixed = toMixedStep(result);
    if (mixed) steps.push(mixed);
  }
  return { strategy: 'MULTIPLY_ACROSS', steps, result: A.number(result) };
}

export function divideSolution(a: Rational, b: Rational, includeMixed = true): SolutionTree {
  const flipped = reciprocal(b);
  const first = step(
    [P.text('Dividing by a fraction is the same as multiplying by its reciprocal: '), fracNode(a), P.op('÷'), fracNode(b), P.op('='), fracNode(a), P.op('×'), fracNode(flipped)],
    'RECIPROCAL',
    { divisor: b, reciprocal: flipped },
  );
  const rest = multiplySolution(a, flipped, includeMixed);
  return { strategy: 'MULTIPLY_BY_RECIPROCAL', steps: [first, ...rest.steps], result: A.number(div(a, b)) };
}

export function improperToMixedSolution(value: Rational): SolutionTree {
  const m = toMixed(value);
  return {
    strategy: 'DIVIDE_NUMERATOR_BY_DENOMINATOR',
    steps: [
      step([P.text(`Divide: ${abs(value.numerator)} ÷ ${value.denominator} = ${m.whole} remainder ${m.numerator}.`)], 'DIVIDE', {
        quotient: m.whole,
        remainder: m.numerator,
      }),
      step([P.text(`The quotient ${m.whole} is the whole number; the remainder goes over the denominator: `), P.mixed(value)], 'TO_MIXED', {
        whole: m.whole,
        numerator: m.numerator,
        denominator: m.denominator,
      }),
    ],
    result: A.number(value),
  };
}

export function mixedToImproperSolution(value: Rational): SolutionTree {
  const m = toMixed(value);
  const product = m.whole * m.denominator;
  return {
    strategy: 'WHOLE_TIMES_DENOMINATOR_PLUS_NUMERATOR',
    steps: [
      step([P.text(`Multiply the whole number by the denominator: ${m.whole} × ${m.denominator} = ${product}.`)], 'MULTIPLY', { product }),
      step([P.text(`Add the numerator: ${product} + ${m.numerator} = ${product + m.numerator}.`)], 'ADD', { sum: product + m.numerator }),
      step([P.text('Keep the same denominator: '), P.frac(value)], 'RESULT', { result: value }),
    ],
    result: A.number(value),
  };
}

/** Convenience: wrap a single answer into a one-step tree. */
export function simpleSolution(strategy: string, steps: SolutionStep[], result: AnswerValue): SolutionTree {
  return { strategy, steps, result };
}

export { rat };
