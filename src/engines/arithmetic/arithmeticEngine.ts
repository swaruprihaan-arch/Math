/**
 * Whole-number arithmetic engine (spec §090) — Addition, Subtraction, Multiplication, Division.
 * Several operations can be enabled at once ("pick multiple operations"); each question uses one of them.
 */
import { A, buildQuestion, P, prompt, SCHEMA, solution, step, strategies, withRetries } from '../../domain/question/build';
import type { ArithmeticOperator, Difficulty, PromptNode, Question, SettingsValidationResult, SolutionTree } from '../../domain/question/types';
import type { RandomSource } from '../../domain/random/random';
import { rat } from '../../domain/rational/rational';
import { decimalDivideStrategies } from '../../solutions/strategies/decimals';
import { additionStrategies, divisionStrategies, multiAdditionStrategies, multiplicationStrategies, subtractionStrategies } from '../../solutions/strategies/wholeNumber';

export interface Range {
  min: number;
  max: number;
}

export interface ArithmeticSettings {
  difficulty: Difficulty;
  enabledOperations: ArithmeticOperator[];
  operandCount: number;
  /** First number (for ÷: the answer/quotient). */
  operandRange: Range;
  /** Second number (multiplier, subtrahend, divisor). Extension of the spec so × and ÷ can constrain each operand. */
  secondOperandRange?: Range;
  allowNegativeOperands: boolean;
  allowNegativeResults: boolean;
  divisionMode: 'EXACT_INTEGER' | 'REMAINDER' | 'DECIMAL';
  maxResultMagnitude?: number;
}

export const GENERATOR_ID = 'arithmetic';
export const GENERATOR_VERSION = '2.0.0';

interface OpPreset {
  first: Range;
  second: Range;
}

/** Difficulty changes the generator's constraints (spec §090), per operation. */
export const ARITHMETIC_PRESETS: Record<Exclude<Difficulty, 'CUSTOM'>, Record<ArithmeticOperator, OpPreset>> = {
  EASY: {
    ADD: { first: { min: 0, max: 10 }, second: { min: 0, max: 10 } },
    SUBTRACT: { first: { min: 0, max: 20 }, second: { min: 0, max: 10 } },
    MULTIPLY: { first: { min: 1, max: 10 }, second: { min: 1, max: 10 } },
    DIVIDE: { first: { min: 1, max: 10 }, second: { min: 2, max: 10 } },
  },
  MEDIUM: {
    ADD: { first: { min: 10, max: 100 }, second: { min: 1, max: 100 } },
    SUBTRACT: { first: { min: 10, max: 100 }, second: { min: 1, max: 100 } },
    MULTIPLY: { first: { min: 2, max: 99 }, second: { min: 2, max: 12 } },
    DIVIDE: { first: { min: 2, max: 99 }, second: { min: 2, max: 12 } },
  },
  HARD: {
    ADD: { first: { min: 100, max: 9999 }, second: { min: 10, max: 9999 } },
    SUBTRACT: { first: { min: 100, max: 9999 }, second: { min: 10, max: 9999 } },
    MULTIPLY: { first: { min: 10, max: 999 }, second: { min: 2, max: 99 } },
    DIVIDE: { first: { min: 10, max: 999 }, second: { min: 11, max: 99 } },
  },
};

export function defaultArithmeticSettings(): ArithmeticSettings {
  return {
    difficulty: 'MEDIUM',
    enabledOperations: ['ADD'],
    operandCount: 2,
    operandRange: { min: 1, max: 100 },
    secondOperandRange: { min: 1, max: 12 },
    allowNegativeOperands: false,
    allowNegativeResults: false,
    divisionMode: 'EXACT_INTEGER',
  };
}

function rangesFor(settings: ArithmeticSettings, op: ArithmeticOperator): OpPreset {
  if (settings.difficulty === 'CUSTOM') {
    return { first: settings.operandRange, second: settings.secondOperandRange ?? settings.operandRange };
  }
  return ARITHMETIC_PRESETS[settings.difficulty][op];
}

export function validateArithmeticSettings(settings: ArithmeticSettings): SettingsValidationResult {
  const errors: string[] = [];
  if (settings.enabledOperations.length === 0) errors.push('Pick at least one operation.');
  if (!Number.isInteger(settings.operandCount) || settings.operandCount < 2 || settings.operandCount > 4) errors.push('Use 2 to 4 numbers.');
  for (const op of settings.enabledOperations) {
    const { first, second } = rangesFor(settings, op);
    for (const r of [first, second]) {
      if (!Number.isSafeInteger(r.min) || !Number.isSafeInteger(r.max)) errors.push('Ranges must be whole numbers.');
      else if (r.min > r.max) errors.push(`Range ${r.min}–${r.max}: the smallest number is bigger than the largest.`);
      else if (Math.max(Math.abs(r.min), Math.abs(r.max)) > 1_000_000) errors.push('Numbers above 1,000,000 are not supported.');
    }
    if (!settings.allowNegativeOperands && (first.min < 0 || second.min < 0)) errors.push('Negative numbers are turned off but a range starts below 0.');
    if (op === 'DIVIDE') {
      const nonZeroDivisor = second.max !== 0 || second.min !== 0;
      if (!nonZeroDivisor) errors.push('The divisor range must include a number other than 0.');
      if (settings.divisionMode === 'REMAINDER' && second.max < 2) errors.push('Remainder division needs divisors of at least 2.');
      if (settings.divisionMode === 'DECIMAL' && decimalFriendlyDivisors(second).length === 0) errors.push('Decimal division needs a divisor like 2, 4, 5, 8 or 10 in the range.');
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

function decimalFriendlyDivisors(r: Range): number[] {
  const out: number[] = [];
  for (let d = Math.max(2, r.min); d <= Math.min(r.max, 1000); d++) {
    let x = d;
    while (x % 2 === 0) x /= 2;
    while (x % 5 === 0) x /= 5;
    if (x === 1) out.push(d);
  }
  return out;
}

function pickIn(rng: RandomSource, r: Range, allowNegative: boolean): number {
  const min = allowNegative ? r.min : Math.max(0, r.min);
  return rng.integer(min, Math.max(min, r.max));
}

function pickNonZero(rng: RandomSource, r: Range, allowNegative: boolean): number {
  const min = allowNegative ? r.min : Math.max(1, r.min);
  const max = Math.max(min, r.max);
  const v = rng.integer(min, max);
  if (v !== 0) return v;
  return max > 0 ? 1 : -1;
}

const SYMBOL: Record<ArithmeticOperator, '+' | '−' | '×' | '÷'> = { ADD: '+', SUBTRACT: '−', MULTIPLY: '×', DIVIDE: '÷' };

function standardsFor(op: ArithmeticOperator, operands: number[], result: number): string[] {
  const max = Math.max(...operands.map(Math.abs), Math.abs(result));
  if (operands.some((x) => x < 0) || result < 0) return op === 'ADD' || op === 'SUBTRACT' ? ['7.NS.1'] : ['7.NS.2'];
  switch (op) {
    case 'ADD':
    case 'SUBTRACT':
      if (max <= 10) return ['K.OA.5'];
      if (max <= 20) return ['1.OA.6', '2.OA.2'];
      if (max <= 100) return ['2.NBT.5'];
      if (max <= 1000) return ['2.NBT.7', '3.NBT.2'];
      return ['4.NBT.4'];
    case 'MULTIPLY':
      if (Math.max(...operands) <= 10) return ['3.OA.7'];
      if (Math.min(...operands) <= 9) return ['3.NBT.3', '4.NBT.5'];
      return ['4.NBT.5', '5.NBT.5'];
    case 'DIVIDE':
      if (result <= 10 && Math.max(...operands) <= 100) return ['3.OA.7'];
      if ((operands[1] ?? 0) <= 9) return ['4.NBT.6'];
      return ['5.NBT.6', '6.NS.2'];
  }
}

function equationNodes(operands: number[], symbol: '+' | '−' | '×' | '÷'): PromptNode[] {
  const nodes: PromptNode[] = [];
  operands.forEach((x, i) => {
    if (i > 0) nodes.push(P.op(symbol));
    nodes.push(i === 0 ? P.num(x) : P.numP(x));
  });
  nodes.push(P.op('='), P.blank());
  return nodes;
}

function multiSubtractStrategies(operands: number[]): SolutionTree[] {
  const [first, ...rest] = operands as [number, ...number[]];
  const result = rest.reduce((acc, x) => acc - x, first);
  const sumRest = rest.reduce((a, b) => a + b, 0);
  const leftToRight = [] as ReturnType<typeof step>[];
  let running = first;
  for (const x of rest) {
    leftToRight.push(step([P.text(`${running} − ${x} = ${running - x}.`)], 'SUBTRACT'));
    running -= x;
  }
  return [
    solution('LEFT_TO_RIGHT', leftToRight, A.number(result), 'One at a time'),
    solution(
      'ADD_WHAT_YOU_TAKE_AWAY',
      [step([P.text(`Add up everything you take away: ${rest.join(' + ')} = ${sumRest}.`)], 'ADD'), step([P.text(`${first} − ${sumRest} = ${result}.`)], 'SUBTRACT')],
      A.number(result),
      'Take away all at once',
    ),
  ];
}

function signedSumStrategies(operands: number[]): SolutionTree[] {
  const result = operands.reduce((a, b) => a + b, 0);
  const steps = [] as ReturnType<typeof step>[];
  let running = operands[0] as number;
  for (const x of operands.slice(1)) {
    steps.push(step([P.text(`${running} + (${x}) = ${running + x}.`)], 'ADD'));
    running += x;
  }
  const pos = operands.filter((x) => x > 0).reduce((a, b) => a + b, 0);
  const negSum = operands.filter((x) => x < 0).reduce((a, b) => a + b, 0);
  return [
    solution('LEFT_TO_RIGHT', steps, A.number(result), 'One at a time'),
    solution(
      'GROUP_SIGNS',
      [step([P.text(`Positives: ${pos}. Negatives: ${negSum}.`)], 'GROUP'), step([P.text(`${pos} + (${negSum}) = ${result}.`)], 'COMBINE')],
      A.number(result),
      'Group positives and negatives',
    ),
  ];
}

function multiMultiplyStrategies(operands: number[]): SolutionTree[] {
  const result = operands.reduce((a, b) => a * b, 1);
  const leftToRight = [] as ReturnType<typeof step>[];
  let running = operands[0] as number;
  for (const x of operands.slice(1)) {
    leftToRight.push(step([P.text(`${running} × ${x} = ${running * x}.`)], 'MULTIPLY'));
    running *= x;
  }
  // friendly pair: product ending in 0 or the two smallest
  let best: [number, number] = [0, 1];
  for (let i = 0; i < operands.length; i++)
    for (let j = i + 1; j < operands.length; j++) {
      if (((operands[i] as number) * (operands[j] as number)) % 10 === 0) best = [i, j];
    }
  const [i, j] = best;
  const pairProduct = (operands[i] as number) * (operands[j] as number);
  const others = operands.filter((_, k) => k !== i && k !== j);
  return [
    solution('LEFT_TO_RIGHT', leftToRight, A.number(result), 'One at a time'),
    solution(
      'FRIENDLY_PAIR',
      [
        step([P.text(`You can multiply in any order. Start with ${operands[i]} × ${operands[j]} = ${pairProduct}.`)], 'PAIR'),
        step([P.text(`${pairProduct}${others.map((o) => ` × ${o}`).join('')} = ${result}.`)], 'MULTIPLY'),
      ],
      A.number(result),
      'Find a friendly pair',
    ),
  ];
}

export function generateArithmetic(settings: ArithmeticSettings, rng: RandomSource): Question {
  const check = validateArithmeticSettings(settings);
  if (!check.valid) throw new Error(`Invalid arithmetic settings: ${check.errors.join(' ')}`);
  const op = rng.choose(settings.enabledOperations);
  const { first, second } = rangesFor(settings, op);
  const neg = settings.allowNegativeOperands;
  const count = op === 'DIVIDE' ? 2 : settings.operandCount;
  const context = { topic: 'ARITHMETIC' as const, generatorId: GENERATOR_ID, settings };
  const okResult = (r: number) => (settings.allowNegativeResults || r >= 0) && (settings.maxResultMagnitude === undefined || Math.abs(r) <= settings.maxResultMagnitude);

  if (op === 'DIVIDE') {
    if (settings.divisionMode === 'DECIMAL') {
      const divisors = decimalFriendlyDivisors(second);
      const { value, retryCount } = withRetries(
        context,
        () => {
          const d = rng.choose(divisors);
          const dividend = pickIn(rng, { min: Math.max(1, first.min), max: Math.max(first.max * 2, 10) }, false);
          return { d, dividend };
        },
        ({ d, dividend }) => dividend % d !== 0,
      );
      const exact = rat(value.dividend, value.d);
      const trees = decimalDivideStrategies(rat(value.dividend), rat(value.d));
      return buildQuestion(
        {
          topic: 'ARITHMETIC',
          subtype: 'DIVIDE_DECIMAL',
          difficulty: settings.difficulty,
          prompt: prompt(equationNodes([value.dividend, value.d], '÷')),
          operands: [
            { role: 'dividend', value: A.number(value.dividend) },
            { role: 'divisor', value: A.number(value.d) },
          ],
          operation: 'DIVIDE',
          canonicalAnswer: A.number(exact),
          answerSchema: SCHEMA.decimal(),
          ...strategies(trees),
          answerDisplay: 'decimal',
          generatorId: GENERATOR_ID,
          generatorVersion: GENERATOR_VERSION,
          constraints: { ...first, divisionMode: 'DECIMAL' },
          retryCount,
          standards: ['5.NBT.7', '6.NS.3'],
        },
        rng,
      );
    }
    // Inverse generation (spec §090): divisor and quotient first, dividend = divisor × quotient (+ remainder).
    const { value, retryCount } = withRetries(
      context,
      () => {
        const divisor = pickNonZero(rng, second, neg);
        const quotient = pickIn(rng, first, neg);
        const remainder = settings.divisionMode === 'REMAINDER' ? rng.integer(rng.bool(0.85) ? 1 : 0, Math.abs(divisor) - 1) : 0;
        return { divisor, quotient, remainder, dividend: divisor * quotient + remainder };
      },
      (v) => okResult(v.quotient) && v.divisor !== 0 && (settings.divisionMode !== 'REMAINDER' || (v.divisor > 0 && v.quotient >= 0)),
    );
    const { divisor, quotient, remainder, dividend } = value;
    const withRemainder = settings.divisionMode === 'REMAINDER';
    // In remainder mode the answer is always "q R r" (r may be 0), so every strategy reports that value.
    const trees = divisionStrategies(dividend, divisor).map((t) => (withRemainder ? { ...t, result: A.qr(quotient, remainder) } : t));
    return buildQuestion(
      {
        topic: 'ARITHMETIC',
        subtype: withRemainder ? 'DIVIDE_REMAINDER' : 'DIVIDE',
        difficulty: settings.difficulty,
        prompt: prompt(equationNodes([dividend, divisor], '÷')),
        operands: [
          { role: 'dividend', value: A.number(dividend) },
          { role: 'divisor', value: A.number(divisor) },
        ],
        operation: 'DIVIDE',
        canonicalAnswer: withRemainder ? A.qr(quotient, remainder) : A.number(quotient),
        answerSchema: withRemainder ? SCHEMA.quotientRemainder() : SCHEMA.integer(),
        ...strategies(trees),
        generatorId: GENERATOR_ID,
        generatorVersion: GENERATOR_VERSION,
        constraints: { first, second, divisionMode: settings.divisionMode },
        retryCount,
        standards: standardsFor('DIVIDE', [dividend, divisor], quotient),
      },
      rng,
    );
  }

  const { value: operands, retryCount } = withRetries(
    context,
    () => {
      if (op === 'SUBTRACT' && !settings.allowNegativeResults && count > 2) {
        // Constructive: subtrahends first, then a first number big enough (a ≥ b + c + …).
        const rest = Array.from({ length: count - 1 }, () => pickIn(rng, second, neg));
        const need = rest.reduce((s, x) => s + x, 0);
        const lo = Math.max(first.min, need);
        const a = lo <= first.max ? rng.integer(lo, first.max) : need;
        return [a, ...rest];
      }
      const xs = [pickIn(rng, first, neg), ...Array.from({ length: count - 1 }, () => pickIn(rng, second, neg))];
      // Non-negative subtraction: reorder operands (spec: 4 − 17 becomes 17 − 4).
      if (op === 'SUBTRACT' && !settings.allowNegativeResults && count === 2 && (xs[0] as number) < (xs[1] as number)) xs.reverse();
      return xs;
    },
    (xs) => {
      const r = op === 'ADD' ? xs.reduce((a, b) => a + b, 0) : op === 'SUBTRACT' ? xs.slice(1).reduce((a, b) => a - b, xs[0] as number) : xs.reduce((a, b) => a * b, 1);
      return okResult(r) && Number.isSafeInteger(r);
    },
  );
  const result = op === 'ADD' ? operands.reduce((a, b) => a + b, 0) : op === 'SUBTRACT' ? operands.slice(1).reduce((a, b) => a - b, operands[0] as number) : operands.reduce((a, b) => a * b, 1);
  let trees: SolutionTree[];
  if (operands.length === 2) {
    const [a, b] = operands as [number, number];
    trees = op === 'ADD' ? additionStrategies(a, b) : op === 'SUBTRACT' ? subtractionStrategies(a, b) : multiplicationStrategies(a, b);
  } else {
    trees = op === 'ADD' ? (operands.some((x) => x < 0) ? signedSumStrategies(operands) : multiAdditionStrategies(operands)) : op === 'SUBTRACT' ? multiSubtractStrategies(operands) : multiMultiplyStrategies(operands);
  }
  return buildQuestion(
    {
      topic: 'ARITHMETIC',
      subtype: op,
      difficulty: settings.difficulty,
      prompt: prompt(equationNodes(operands, SYMBOL[op])),
      operands: operands.map((x, i) => ({ role: `operand${i + 1}`, value: A.number(x) })),
      operation: op,
      canonicalAnswer: A.number(result),
      answerSchema: SCHEMA.integer(),
      ...strategies(trees),
      generatorId: GENERATOR_ID,
      generatorVersion: GENERATOR_VERSION,
      constraints: { first, second, operandCount: count, allowNegativeResults: settings.allowNegativeResults },
      retryCount,
      standards: standardsFor(op, operands, result),
    },
    rng,
  );
}
