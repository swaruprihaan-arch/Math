/**
 * Fraction engine (spec §120–§140). Exact Rational arithmetic; several operations may be enabled at once.
 */
import { A, buildQuestion, COMPARE_CHOICES, P, prompt, SCHEMA, solution, step, strategies, withRetries } from '../../domain/question/build';
import type { AnswerKind, Difficulty, PromptNode, Question, SettingsValidationResult, SolutionTree, ValidationPolicy } from '../../domain/question/types';
import type { RandomSource } from '../../domain/random/random';
import { abs, add, cmp, div, gcdNum, isInteger, isZero, lcm, mul, rat, sub, toMixed, type Rational } from '../../domain/rational/rational';
import {
  fractionAddSubStrategies,
  fractionDivideStrategies,
  fractionMultiplyStrategies,
  improperToMixedStrategies,
  mixedToImproperStrategies,
  simplifyFractionStrategies,
} from '../../solutions/strategies/fractions';

export type FractionOperation = 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE' | 'SIMPLIFY' | 'COMPARE' | 'CONVERT';
export type CommonDenominatorMode = 'SAME' | 'RELATED' | 'UNRELATED' | 'ANY';

export interface FractionSettings {
  difficulty: Difficulty;
  /** Spec §120 has a single `operation`; extended to a list so several can be practised together. */
  operations: FractionOperation[];
  inputForm: 'PROPER' | 'IMPROPER' | 'MIXED' | 'ANY';
  outputForm: 'IMPROPER' | 'MIXED' | 'EITHER';
  denominatorRange: { min: number; max: number };
  requireSimplifiedAnswer: boolean;
  allowNegativeResult: boolean;
  commonDenominatorMode: CommonDenominatorMode;
  /** Legacy "Strict mixed": the fractional part of a typed mixed number must be proper. */
  strictMixed: boolean;
  /** Legacy "Display": Auto / Always mixed / Never mixed. */
  displayMode: 'AUTO' | 'ALWAYS_MIXED' | 'NEVER_MIXED';
}

export const FRACTION_GENERATOR_ID = 'fractions';
export const FRACTION_GENERATOR_VERSION = '2.0.0';

export function defaultFractionSettings(): FractionSettings {
  return {
    difficulty: 'MEDIUM',
    operations: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'],
    inputForm: 'ANY',
    outputForm: 'EITHER',
    denominatorRange: { min: 2, max: 12 },
    requireSimplifiedAnswer: false,
    allowNegativeResult: false,
    commonDenominatorMode: 'ANY',
    strictMixed: true,
    displayMode: 'AUTO',
  };
}

interface Effective {
  den: { min: number; max: number };
  forms: ('PROPER' | 'IMPROPER' | 'MIXED')[];
  cdm: CommonDenominatorMode | 'SAME_OR_RELATED';
}

function effective(s: FractionSettings): Effective {
  const formsFor = (f: FractionSettings['inputForm']): Effective['forms'] => (f === 'ANY' ? ['PROPER', 'IMPROPER', 'MIXED'] : [f]);
  switch (s.difficulty) {
    case 'EASY':
      return { den: { min: 2, max: 10 }, forms: ['PROPER'], cdm: s.commonDenominatorMode === 'ANY' ? 'SAME_OR_RELATED' : s.commonDenominatorMode };
    case 'MEDIUM':
      return { den: { min: 2, max: 12 }, forms: s.inputForm === 'ANY' ? ['PROPER', 'PROPER', 'IMPROPER'] : formsFor(s.inputForm), cdm: s.commonDenominatorMode };
    case 'HARD':
      return { den: { min: 2, max: 20 }, forms: s.inputForm === 'ANY' ? ['PROPER', 'IMPROPER', 'MIXED'] : formsFor(s.inputForm), cdm: s.commonDenominatorMode };
    case 'CUSTOM':
      return { den: s.denominatorRange, forms: formsFor(s.inputForm), cdm: s.commonDenominatorMode };
  }
}

function pairsExist(range: { min: number; max: number }, mode: CommonDenominatorMode | 'SAME_OR_RELATED'): boolean {
  for (let a = range.min; a <= range.max; a++)
    for (let b = range.min; b <= range.max; b++) {
      if (denominatorsMatch(a, b, mode)) return true;
    }
  return false;
}

function denominatorsMatch(a: number, b: number, mode: CommonDenominatorMode | 'SAME_OR_RELATED'): boolean {
  const related = a !== b && (a % b === 0 || b % a === 0);
  switch (mode) {
    case 'SAME':
      return a === b;
    case 'RELATED':
      return related;
    case 'UNRELATED':
      return a !== b && !related;
    case 'SAME_OR_RELATED':
      return a === b || related;
    case 'ANY':
      return true;
  }
}

export function validateFractionSettings(s: FractionSettings): SettingsValidationResult {
  const errors: string[] = [];
  if (s.operations.length === 0) errors.push('Pick at least one fraction operation.');
  const e = effective(s);
  if (!Number.isInteger(e.den.min) || !Number.isInteger(e.den.max) || e.den.min < 2 || e.den.max > 100 || e.den.min > e.den.max) {
    errors.push('Denominators must be whole numbers from 2 to 100, smallest first.');
  } else if ((s.operations.includes('ADD') || s.operations.includes('SUBTRACT')) && !pairsExist(e.den, e.cdm)) {
    errors.push('No two denominators in that range fit the chosen common-denominator mode.');
  }
  return { valid: errors.length === 0, errors };
}

/** Numerators coprime to d in [lo, hi], so the fraction really has denominator d (2/4 would become 1/2). */
function coprimeNumerator(rng: RandomSource, d: number, lo: number, hi: number): number {
  const options: number[] = [];
  for (let n = lo; n <= hi; n++) if (gcdNum(n, d) === 1) options.push(n);
  return options.length > 0 ? rng.choose(options) : lo;
}

function makeFraction(rng: RandomSource, d: number, form: 'PROPER' | 'IMPROPER' | 'MIXED'): Rational {
  switch (form) {
    case 'PROPER':
      return rat(coprimeNumerator(rng, d, 1, d - 1), d);
    case 'IMPROPER':
      return rat(coprimeNumerator(rng, d, d + 1, 3 * d), d);
    case 'MIXED':
      return rat(rng.integer(1, 4) * d + coprimeNumerator(rng, d, 1, d - 1), d);
  }
}

function showValue(v: Rational, display: FractionSettings['displayMode']): PromptNode {
  if (isInteger(v)) return P.num(v);
  if (display === 'NEVER_MIXED') return P.frac(v);
  return abs(v.numerator) > v.denominator ? P.mixed(v) : P.frac(v);
}

function answerPolicy(s: FractionSettings, result: Rational): ValidationPolicy {
  let requiredForms: AnswerKind[] | undefined;
  if (!isInteger(result)) {
    if (s.outputForm === 'MIXED' && abs(result.numerator) > result.denominator) requiredForms = ['MIXED_NUMBER'];
    if (s.outputForm === 'IMPROPER') requiredForms = ['RATIONAL'];
  }
  return {
    ...(requiredForms ? { requiredForms } : {}),
    requireLowestTerms: s.requireSimplifiedAnswer,
    strictMixed: s.strictMixed,
  };
}

const OP_SYMBOL = { ADD: '+', SUBTRACT: '−', MULTIPLY: '×', DIVIDE: '÷' } as const;

export function generateFraction(settings: FractionSettings, rng: RandomSource): Question {
  const check = validateFractionSettings(settings);
  if (!check.valid) throw new Error(`Invalid fraction settings: ${check.errors.join(' ')}`);
  const e = effective(settings);
  const operation = rng.choose(settings.operations);
  const context = { topic: 'FRACTIONS' as const, generatorId: FRACTION_GENERATOR_ID, settings };
  const base = {
    topic: 'FRACTIONS' as const,
    difficulty: settings.difficulty,
    generatorId: FRACTION_GENERATOR_ID,
    generatorVersion: FRACTION_GENERATOR_VERSION,
  };

  switch (operation) {
    case 'ADD':
    case 'SUBTRACT':
    case 'MULTIPLY':
    case 'DIVIDE': {
      const { value, retryCount } = withRetries(
        context,
        () => {
          const d1 = rng.integer(e.den.min, e.den.max);
          const d2 = rng.integer(e.den.min, e.den.max);
          let a = makeFraction(rng, d1, rng.choose(e.forms));
          let b = makeFraction(rng, d2, rng.choose(e.forms));
          // Sometimes practise whole × fraction (4.NF.4) and unit-fraction division (5.NF.7).
          if (operation === 'MULTIPLY' && settings.difficulty !== 'HARD' && rng.bool(0.25)) a = rat(rng.integer(2, 9));
          if (operation === 'DIVIDE' && settings.difficulty === 'EASY') {
            if (rng.bool()) {
              a = rat(1, d1);
              b = rat(rng.integer(2, 9));
            } else {
              a = rat(rng.integer(2, 9));
              b = rat(1, d2);
            }
          }
          if (operation === 'SUBTRACT' && !settings.allowNegativeResult && cmp(a, b) < 0) [a, b] = [b, a];
          return { a, b, d1, d2 };
        },
        ({ a, b, d1, d2 }) => {
          if (operation === 'DIVIDE' && isZero(b)) return false;
          if ((operation === 'ADD' || operation === 'SUBTRACT') && !denominatorsMatch(d1, d2, e.cdm)) return false;
          if (operation === 'SUBTRACT' && cmp(a, b) === 0) return false;
          return true;
        },
      );
      const { a, b } = value;
      const result = operation === 'ADD' ? add(a, b) : operation === 'SUBTRACT' ? sub(a, b) : operation === 'MULTIPLY' ? mul(a, b) : div(a, b);
      const trees: SolutionTree[] =
        operation === 'ADD' || operation === 'SUBTRACT' ? fractionAddSubStrategies(a, b, operation) : operation === 'MULTIPLY' ? fractionMultiplyStrategies(a, b) : fractionDivideStrategies(a, b);
      const standards =
        operation === 'ADD' || operation === 'SUBTRACT'
          ? a.denominator === b.denominator
            ? ['4.NF.3']
            : ['5.NF.1']
          : operation === 'MULTIPLY'
            ? isInteger(a) || isInteger(b)
              ? ['4.NF.4']
              : ['5.NF.4']
            : (a.numerator === 1n && isInteger(b)) || (isInteger(a) && b.numerator === 1n)
              ? ['5.NF.7']
              : ['6.NS.1'];
      return buildQuestion(
        {
          ...base,
          subtype: operation,
          prompt: prompt([showValue(a, settings.displayMode), P.op(OP_SYMBOL[operation]), showValue(b, settings.displayMode), P.op('='), P.blank()]),
          operands: [
            { role: 'lhs', value: A.number(a) },
            { role: 'rhs', value: A.number(b) },
          ],
          operation,
          canonicalAnswer: A.number(result),
          answerSchema: SCHEMA.fraction(),
          validationPolicy: answerPolicy(settings, result),
          ...strategies(trees),
          answerDisplay: settings.outputForm === 'IMPROPER' || settings.displayMode === 'NEVER_MIXED' ? 'fraction' : 'mixed',
          constraints: { den: e.den, forms: e.forms, commonDenominatorMode: e.cdm },
          retryCount,
          standards,
        },
        rng,
      );
    }
    case 'SIMPLIFY': {
      const { value, retryCount } = withRetries(
        context,
        () => {
          const q = rng.integer(Math.max(2, e.den.min), Math.max(2, Math.min(e.den.max, 12)));
          const p = e.forms.includes('PROPER') && (e.forms.length === 1 || rng.bool(0.7)) ? rng.integer(1, q - 1) : rng.integer(q + 1, 2 * q);
          const k = rng.integer(2, settings.difficulty === 'HARD' ? 9 : settings.difficulty === 'MEDIUM' ? 6 : 4);
          return { p, q, k };
        },
        ({ p, q }) => gcdNum(p, q) === 1 && p % q !== 0,
      );
      const n = BigInt(value.p * value.k);
      const d = BigInt(value.q * value.k);
      const answer = rat(value.p, value.q);
      return buildQuestion(
        {
          ...base,
          subtype: 'SIMPLIFY',
          prompt: prompt([P.text('Simplify'), P.br(), { t: 'rawfrac', numerator: n, denominator: d }, P.op('='), P.blank()]),
          operands: [{ role: 'fraction', value: A.number(answer) }],
          operation: 'SIMPLIFY',
          canonicalAnswer: A.number(answer),
          answerSchema: SCHEMA.fraction(),
          validationPolicy: { requireLowestTerms: true, requiredForms: ['RATIONAL', 'MIXED_NUMBER'], strictMixed: settings.strictMixed },
          ...strategies(simplifyFractionStrategies(n, d)),
          answerDisplay: 'fraction',
          retryCount,
          standards: ['4.NF.1'],
        },
        rng,
      );
    }
    case 'COMPARE': {
      const { value, retryCount } = withRetries(
        context,
        () => {
          const d1 = rng.integer(e.den.min, e.den.max);
          const a = makeFraction(rng, d1, rng.choose(e.forms));
          if (rng.bool(0.15)) {
            const k = rng.integer(2, 4);
            return { a, b: a, bn: a.numerator * BigInt(k), bd: a.denominator * BigInt(k) };
          }
          const d2 = rng.integer(e.den.min, e.den.max);
          const b = makeFraction(rng, d2, rng.choose(e.forms));
          return { a, b, bn: b.numerator, bd: b.denominator };
        },
        (v) => v.a.denominator !== v.bd || v.a.numerator !== v.bn,
      );
      const { a, bn, bd } = value;
      const b = rat(bn, bd);
      const c = cmp(a, b);
      const symbol = c < 0 ? '<' : c > 0 ? '>' : '=';
      const L = lcm(a.denominator, bd);
      const an = a.numerator * (L / a.denominator);
      const bnn = bn * (L / bd);
      const trees = [
        solution(
          'COMMON_DENOMINATOR',
          [
            step([P.text(`Use the common denominator ${L}: `), { t: 'rawfrac', numerator: an, denominator: L }, P.text(' and '), { t: 'rawfrac', numerator: bnn, denominator: L }], 'COMMON_DENOMINATOR'),
            step([P.text(`Compare the tops: ${an} ${symbol} ${bnn}.`)], 'COMPARE'),
          ],
          A.choice(symbol),
          'Common denominator',
        ),
        solution(
          'CROSS_MULTIPLY',
          [
            step([P.text(`Cross-multiply: ${a.numerator} × ${bd} = ${a.numerator * bd} and ${bn} × ${a.denominator} = ${bn * a.denominator}.`)], 'CROSS'),
            step([P.text(`${a.numerator * bd} ${symbol} ${bn * a.denominator}, so the first fraction is ${symbol === '<' ? 'smaller' : symbol === '>' ? 'bigger' : 'equal'}.`)], 'COMPARE'),
          ],
          A.choice(symbol),
          'Cross-multiply',
        ),
      ];
      return buildQuestion(
        {
          ...base,
          subtype: 'COMPARE',
          prompt: prompt([showValue(a, settings.displayMode), P.blank('?'), { t: 'rawfrac', numerator: bn, denominator: bd }]),
          operands: [
            { role: 'lhs', value: A.number(a) },
            { role: 'rhs', value: A.number(b) },
          ],
          operation: 'COMPARE',
          canonicalAnswer: A.choice(symbol),
          answerSchema: SCHEMA.choice(COMPARE_CHOICES),
          ...strategies(trees),
          retryCount,
          standards: a.denominator === bd || a.numerator === bn ? ['3.NF.3d'] : ['4.NF.2'],
        },
        rng,
      );
    }
    case 'CONVERT': {
      const d = rng.integer(Math.max(2, e.den.min), e.den.max);
      const toMixedTarget = rng.bool();
      const whole = rng.integer(1, settings.difficulty === 'EASY' ? 4 : 9);
      const value = rat(whole * d + rng.integer(1, d - 1), d);
      const m = toMixed(value);
      return buildQuestion(
        {
          ...base,
          subtype: toMixedTarget ? 'TO_MIXED' : 'TO_IMPROPER',
          prompt: toMixedTarget
            ? prompt([P.text('Mixed number'), P.br(), P.frac(value), P.op('='), P.blank()])
            : prompt([P.text('Improper fraction'), P.br(), P.mixed(value), P.op('='), P.blank()]),
          operands: [{ role: 'value', value: A.number(value) }],
          operation: 'CONVERT',
          canonicalAnswer: A.number(value),
          answerSchema: SCHEMA.fraction(),
          validationPolicy: { requiredForms: [toMixedTarget ? 'MIXED_NUMBER' : 'RATIONAL'], strictMixed: true },
          ...strategies(toMixedTarget ? improperToMixedStrategies(value) : mixedToImproperStrategies(value)),
          answerDisplay: toMixedTarget ? 'mixed' : 'fraction',
          constraints: { whole: Number(m.whole) },
          standards: ['4.NF.3'],
        },
        rng,
      );
    }
  }
}
