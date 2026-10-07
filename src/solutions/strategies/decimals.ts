/**
 * Multiple strategies for decimal arithmetic (exact; values are Rationals with terminating expansions).
 */
import { A, P, solution, step } from '../../domain/question/build';
import type { SolutionTree } from '../../domain/question/types';
import { add, decimalPlaces, div, isTerminating, mul, rat, sub, toDecimalString, type Rational } from '../../domain/rational/rational';

function dec(v: Rational, places?: number): string {
  const s = isTerminating(v) ? (places !== undefined ? toDecimalString(v, places) : toDecimalString(v)) : toDecimalString(v, 3);
  return s.replace(/^-/, '−');
}

function scaled(v: Rational, places: number): bigint {
  return (v.numerator * 10n ** BigInt(places)) / v.denominator;
}

/** a ± b */
export function decimalAddSubStrategies(a: Rational, b: Rational, op: 'ADD' | 'SUBTRACT'): SolutionTree[] {
  const symbol = op === 'ADD' ? '+' : '−';
  const result = op === 'ADD' ? add(a, b) : sub(a, b);
  const places = Math.max(decimalPlaces(a), decimalPlaces(b), 1);
  const unitName = places === 1 ? 'tenths' : places === 2 ? 'hundredths' : places === 3 ? 'thousandths' : `10^-${places} units`;
  const sa = scaled(a, places);
  const sb = scaled(b, places);
  const sr = op === 'ADD' ? sa + sb : sa - sb;
  return [
    solution(
      'LINE_UP_DECIMALS',
      [
        step([P.text(`Line up the decimal points. Write ${dec(a, places)} ${symbol} ${dec(b, places)} (add zeros so both have ${places} decimal places).`)], 'ALIGN'),
        step([P.text(`${op === 'ADD' ? 'Add' : 'Subtract'} like whole numbers, keeping the point in place: ${dec(result, places)}.`)], 'COMPUTE'),
      ],
      A.number(result),
      'Line up the points',
    ),
    solution(
      'THINK_IN_UNITS',
      [
        step([P.text(`Count in ${unitName}: ${dec(a)} = ${sa} ${unitName}, ${dec(b)} = ${sb} ${unitName}.`)], 'SCALE', { places }),
        step([P.text(`${sa} ${symbol} ${sb} = ${sr} ${unitName}.`)], 'COMPUTE'),
        step([P.text(`${sr} ${unitName} = ${dec(result)}.`)], 'RESULT'),
      ],
      A.number(result),
      `Think in ${unitName}`,
    ),
  ];
}

/** a × b */
export function decimalMultiplyStrategies(a: Rational, b: Rational): SolutionTree[] {
  const result = mul(a, b);
  const pa = decimalPlaces(a);
  const pb = decimalPlaces(b);
  const ia = scaled(a, pa);
  const ib = scaled(b, pb);
  return [
    solution(
      'COUNT_DECIMAL_PLACES',
      [
        step([P.text(`Ignore the points: ${ia} × ${ib} = ${ia * ib}.`)], 'WHOLE_PRODUCT'),
        step([P.text(`Count decimal places: ${pa} + ${pb} = ${pa + pb}. Move the point ${pa + pb} place${pa + pb === 1 ? '' : 's'} left: ${dec(result, pa + pb)}.`)], 'PLACE_POINT'),
      ],
      A.number(result),
      'Multiply, then place the point',
    ),
    solution(
      'USE_FRACTIONS',
      [
        step([P.text(`Write as fractions: ${ia}/${10 ** pa} × ${ib}/${10 ** pb}.`)], 'AS_FRACTIONS'),
        step([P.text(`= ${ia * ib}/${10 ** (pa + pb)} = ${dec(result)}.`)], 'RESULT'),
      ],
      A.number(result),
      'Use fractions',
    ),
  ];
}

/** a ÷ b (b ≠ 0); the quotient should be terminating for a clean decimal answer. */
export function decimalDivideStrategies(a: Rational, b: Rational): SolutionTree[] {
  const result = div(a, b);
  const pb = decimalPlaces(b);
  const shift = 10n ** BigInt(pb);
  const newA = mul(a, rat(shift));
  const newB = mul(b, rat(shift));
  return [
    solution(
      'MAKE_DIVISOR_WHOLE',
      pb === 0
        ? [step([P.text(`The divisor ${dec(b)} is already whole. Divide: ${dec(a)} ÷ ${dec(b)} = ${dec(result)}.`)], 'DIVIDE')]
        : [
            step([P.text(`Move both points ${pb} place${pb === 1 ? '' : 's'} right: ${dec(a)} ÷ ${dec(b)} = ${dec(newA)} ÷ ${dec(newB)}.`)], 'SHIFT', { shift: pb }),
            step([P.text(`Divide: ${dec(newA)} ÷ ${dec(newB)} = ${dec(result)}.`)], 'DIVIDE'),
          ],
      A.number(result),
      'Make the divisor whole',
    ),
    solution(
      'CHECK_WITH_MULTIPLICATION',
      [
        step([P.text(`Think: ? × ${dec(b)} = ${dec(a)}.`)], 'THINK_MULTIPLICATION'),
        step([P.text(`${dec(result)} × ${dec(b)} = ${dec(mul(result, b))}, so the answer is ${dec(result)}.`)], 'RESULT'),
      ],
      A.number(result),
      'Think multiplication',
    ),
  ];
}
