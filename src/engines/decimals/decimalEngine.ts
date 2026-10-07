/**
 * Decimal engine. All answers are exact (the legacy site rounded floating-point results; that is no longer needed
 * because division is generated inversely so every quotient terminates).
 */
import { A, buildQuestion, P, prompt, SCHEMA, strategies, withRetries } from '../../domain/question/build';
import type { ArithmeticOperator, Difficulty, Question, SettingsValidationResult } from '../../domain/question/types';
import type { RandomSource } from '../../domain/random/random';
import { add, cmp, div, isZero, mul, rat, sub, type Rational } from '../../domain/rational/rational';
import { decimalAddSubStrategies, decimalDivideStrategies, decimalMultiplyStrategies } from '../../solutions/strategies/decimals';

export interface DecimalSettings {
  difficulty: Difficulty;
  operations: ArithmeticOperator[];
  /** CUSTOM only */
  places: number;
  /** CUSTOM only: largest first number */
  maxValue: number;
  allowNegativeResults: boolean;
}

export const DECIMAL_GENERATOR_ID = 'decimals';
export const DECIMAL_GENERATOR_VERSION = '2.0.0';

export function defaultDecimalSettings(): DecimalSettings {
  return { difficulty: 'MEDIUM', operations: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'], places: 2, maxValue: 100, allowNegativeResults: false };
}

interface Config {
  places: number;
  max: number;
  mulSecondPlaces: number;
  mulSecondMax: number;
  divisorPlaces: number;
  divisorMax: number;
  quotientPlaces: number;
  quotientMax: number;
}

/** Legacy ranges: Easy 1 place 0–10, Standard 2 places 0–100, Hard 3 places 0–200. */
function config(s: DecimalSettings): Config {
  switch (s.difficulty) {
    case 'EASY':
      return { places: 1, max: 10, mulSecondPlaces: 0, mulSecondMax: 9, divisorPlaces: 0, divisorMax: 9, quotientPlaces: 1, quotientMax: 10 };
    case 'MEDIUM':
      return { places: 2, max: 100, mulSecondPlaces: 1, mulSecondMax: 9, divisorPlaces: 1, divisorMax: 9, quotientPlaces: 1, quotientMax: 50 };
    case 'HARD':
      return { places: 3, max: 200, mulSecondPlaces: 2, mulSecondMax: 9, divisorPlaces: 2, divisorMax: 9, quotientPlaces: 2, quotientMax: 99 };
    case 'CUSTOM':
      return {
        places: s.places,
        max: s.maxValue,
        mulSecondPlaces: Math.min(s.places, 2),
        mulSecondMax: 9,
        divisorPlaces: Math.min(s.places, 2),
        divisorMax: 9,
        quotientPlaces: Math.min(s.places, 2),
        quotientMax: Math.max(2, Math.min(s.maxValue, 999)),
      };
  }
}

export function validateDecimalSettings(s: DecimalSettings): SettingsValidationResult {
  const errors: string[] = [];
  if (s.operations.length === 0) errors.push('Pick at least one decimal operation.');
  if (s.difficulty === 'CUSTOM') {
    if (!Number.isInteger(s.places) || s.places < 1 || s.places > 4) errors.push('Decimal places must be 1 to 4.');
    if (!Number.isInteger(s.maxValue) || s.maxValue < 1 || s.maxValue > 100000) errors.push('Largest number must be 1 to 100,000.');
  }
  return { valid: errors.length === 0, errors };
}

/** Random decimal with exactly `places` decimal digits in (0, max]. */
function randomDecimal(rng: RandomSource, places: number, max: number, minUnits = 1): Rational {
  const scale = 10 ** places;
  return rat(rng.integer(minUnits, Math.max(minUnits, max * scale)), scale);
}

const SYMBOL = { ADD: '+', SUBTRACT: '−', MULTIPLY: '×', DIVIDE: '÷' } as const;

export function generateDecimal(settings: DecimalSettings, rng: RandomSource): Question {
  const check = validateDecimalSettings(settings);
  if (!check.valid) throw new Error(`Invalid decimal settings: ${check.errors.join(' ')}`);
  const c = config(settings);
  const op = rng.choose(settings.operations);
  const context = { topic: 'DECIMALS' as const, generatorId: DECIMAL_GENERATOR_ID, settings };
  let a: Rational;
  let b: Rational;
  let result: Rational;
  let retryCount = 0;

  switch (op) {
    case 'ADD':
    case 'SUBTRACT': {
      const r = withRetries(
        context,
        () => {
          let x = randomDecimal(rng, c.places, c.max);
          let y = randomDecimal(rng, rng.bool(0.3) ? Math.max(1, c.places - 1) : c.places, c.max);
          if (op === 'SUBTRACT' && !settings.allowNegativeResults && cmp(x, y) < 0) [x, y] = [y, x];
          return { x, y };
        },
        ({ x, y }) => op === 'ADD' || cmp(x, y) !== 0,
      );
      a = r.value.x;
      b = r.value.y;
      retryCount = r.retryCount;
      result = op === 'ADD' ? add(a, b) : sub(a, b);
      break;
    }
    case 'MULTIPLY': {
      a = randomDecimal(rng, Math.min(c.places, 2), Math.min(c.max, settings.difficulty === 'HARD' ? 200 : 20));
      b = c.mulSecondPlaces === 0 ? rat(rng.integer(2, c.mulSecondMax)) : randomDecimal(rng, c.mulSecondPlaces, c.mulSecondMax, 2);
      result = mul(a, b);
      break;
    }
    case 'DIVIDE': {
      // Inverse generation: divisor and quotient first, dividend = divisor × quotient → exact, terminating answer.
      const r = withRetries(
        context,
        () => {
          const divisor = c.divisorPlaces === 0 ? rat(rng.integer(2, c.divisorMax)) : randomDecimal(rng, c.divisorPlaces, c.divisorMax, 2);
          const quotient = randomDecimal(rng, c.quotientPlaces, c.quotientMax);
          return { divisor, quotient };
        },
        ({ divisor }) => !isZero(divisor),
      );
      retryCount = r.retryCount;
      b = r.value.divisor;
      result = r.value.quotient;
      a = mul(b, result);
      break;
    }
  }
  const trees = op === 'ADD' || op === 'SUBTRACT' ? decimalAddSubStrategies(a, b, op) : op === 'MULTIPLY' ? decimalMultiplyStrategies(a, b) : decimalDivideStrategies(a, b);
  if (op === 'DIVIDE' && cmp(div(a, b), result) !== 0) throw new Error('decimal division generation mismatch');
  return buildQuestion(
    {
      topic: 'DECIMALS',
      subtype: op,
      difficulty: settings.difficulty,
      prompt: prompt([P.dec(a), P.op(SYMBOL[op]), P.dec(b), P.op('='), P.blank()]),
      operands: [
        { role: 'lhs', value: A.number(a) },
        { role: 'rhs', value: A.number(b) },
      ],
      operation: op,
      canonicalAnswer: A.number(result),
      answerSchema: SCHEMA.decimal(),
      ...strategies(trees),
      answerDisplay: 'decimal',
      generatorId: DECIMAL_GENERATOR_ID,
      generatorVersion: DECIMAL_GENERATOR_VERSION,
      constraints: { ...c },
      retryCount,
      standards: c.places <= 2 ? ['5.NBT.7'] : ['6.NS.3'],
    },
    rng,
  );
}
