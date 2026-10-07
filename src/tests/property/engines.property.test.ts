/**
 * Every topic engine, across difficulties and operation mixes, over many seeds:
 *  - produces valid self-consistent questions with ≥ 2 strategies (validateQuestion)
 *  - honours its constraints (non-negative subtraction, exact division, ranges)
 *  - is reproducible from its seed
 */
import { describe, expect, it } from 'vitest';
import { canonicalInputString, promptToText } from '../../domain/answer/format';
import type { ArithmeticOperator, Difficulty, Question } from '../../domain/question/types';
import { createSeededRandom } from '../../domain/random/random';
import { isInteger, isTerminating, sign } from '../../domain/rational/rational';
import { defaultArithmeticSettings, generateArithmetic, type ArithmeticSettings } from '../../engines/arithmetic/arithmeticEngine';
import { defaultDecimalSettings, generateDecimal } from '../../engines/decimals/decimalEngine';
import { defaultFractionSettings, generateFraction, type FractionOperation } from '../../engines/fractions/fractionEngine';
import { defaultOrderSettings, generateOrder } from '../../engines/orderOfOperations/orderEngine';
import { defaultPlan, generateFromPlan, validatePlan, withDifficulty } from '../../engines/plan/practicePlan';
import { defaultWordProblemSettings, generateWordProblem } from '../../engines/wordProblems/wordProblemEngine';
import { validateQuestion } from '../../validators/questionValidator';

const SEEDS = 60;
const LEVELS: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const OPS: ArithmeticOperator[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];

function expectValid(q: Question, seed: string) {
  expect(validateQuestion(q), `${seed}: ${promptToText(q.prompt)}`).toEqual([]);
}

describe('arithmetic engine', () => {
  for (const difficulty of LEVELS)
    for (const op of OPS) {
      it(`${difficulty} ${op}`, () => {
        for (let i = 0; i < SEEDS; i++) {
          const seed = `ar|${difficulty}|${op}|${i}`;
          const q = generateArithmetic({ ...defaultArithmeticSettings(), difficulty, enabledOperations: [op] }, createSeededRandom(seed));
          expectValid(q, seed);
          expect(q.operation).toBe(op);
          if (q.canonicalAnswer.type === 'NUMBER') {
            expect(sign(q.canonicalAnswer.value) >= 0, 'non-negative result').toBe(true);
            expect(isInteger(q.canonicalAnswer.value), 'whole-number result').toBe(true);
          }
          if (op === 'DIVIDE') expect(q.operands[1]?.value).not.toEqual({ type: 'NUMBER', value: { numerator: 0n, denominator: 1n } });
        }
      });
    }

  it('mixes several operations when several are enabled', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) seen.add(generateArithmetic({ ...defaultArithmeticSettings(), enabledOperations: ['ADD', 'MULTIPLY', 'DIVIDE'] }, createSeededRandom(`mix${i}`)).operation);
    expect([...seen].sort()).toEqual(['ADD', 'DIVIDE', 'MULTIPLY']);
  });

  it('subtraction reorders operands instead of going negative (spec: 4 − 17 → 17 − 4)', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateArithmetic({ ...defaultArithmeticSettings(), enabledOperations: ['SUBTRACT'] }, createSeededRandom(`sub${i}`));
      const [a, b] = q.operands.map((o) => (o.value.type === 'NUMBER' ? Number(o.value.value.numerator) : NaN));
      expect(a as number).toBeGreaterThanOrEqual(b as number);
    }
  });

  it('custom: multi-operand subtraction stays non-negative; remainder division; negatives', () => {
    const custom: ArithmeticSettings = {
      ...defaultArithmeticSettings(),
      difficulty: 'CUSTOM',
      operandRange: { min: 0, max: 200 },
      secondOperandRange: { min: 0, max: 30 },
      operandCount: 3,
      enabledOperations: ['SUBTRACT', 'ADD', 'MULTIPLY'],
    };
    for (let i = 0; i < 100; i++) {
      const seed = `cu${i}`;
      const q = generateArithmetic(custom, createSeededRandom(seed));
      expectValid(q, seed);
      if (q.canonicalAnswer.type === 'NUMBER') expect(sign(q.canonicalAnswer.value) >= 0).toBe(true);
    }
    for (let i = 0; i < 60; i++) {
      const seed = `rem${i}`;
      expectValid(generateArithmetic({ ...defaultArithmeticSettings(), enabledOperations: ['DIVIDE'], divisionMode: 'REMAINDER' }, createSeededRandom(seed)), seed);
      expectValid(generateArithmetic({ ...defaultArithmeticSettings(), enabledOperations: ['DIVIDE'], divisionMode: 'DECIMAL', difficulty: 'CUSTOM', operandRange: { min: 1, max: 50 }, secondOperandRange: { min: 2, max: 10 } }, createSeededRandom(seed)), seed);
      expectValid(
        generateArithmetic(
          { ...defaultArithmeticSettings(), difficulty: 'CUSTOM', enabledOperations: OPS, allowNegativeOperands: true, allowNegativeResults: true, operandRange: { min: -20, max: 20 }, secondOperandRange: { min: -12, max: 12 } },
          createSeededRandom(seed),
        ),
        seed,
      );
    }
  });
});

describe('fraction engine', () => {
  const ops: FractionOperation[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'SIMPLIFY', 'COMPARE', 'CONVERT'];
  for (const difficulty of LEVELS)
    for (const op of ops) {
      it(`${difficulty} ${op}`, () => {
        for (let i = 0; i < SEEDS; i++) {
          const seed = `fr|${difficulty}|${op}|${i}`;
          const q = generateFraction({ ...defaultFractionSettings(), difficulty, operations: [op] }, createSeededRandom(seed));
          expectValid(q, seed);
          if (op === 'SUBTRACT' && q.canonicalAnswer.type === 'NUMBER') expect(sign(q.canonicalAnswer.value)).toBe(1);
        }
      });
    }
  it('honours output form, simplest form and common-denominator modes', () => {
    for (const outputForm of ['IMPROPER', 'MIXED', 'EITHER'] as const)
      for (const commonDenominatorMode of ['SAME', 'RELATED', 'UNRELATED', 'ANY'] as const)
        for (let i = 0; i < 15; i++) {
          const seed = `fr-${outputForm}-${commonDenominatorMode}-${i}`;
          const q = generateFraction(
            { ...defaultFractionSettings(), difficulty: 'CUSTOM', outputForm, commonDenominatorMode, requireSimplifiedAnswer: true, operations: ['ADD', 'SUBTRACT'], inputForm: 'ANY', denominatorRange: { min: 2, max: 12 } },
            createSeededRandom(seed),
          );
          expectValid(q, seed);
          const [l, r] = q.operands.map((o) => (o.value.type === 'NUMBER' ? o.value.value.denominator : 0n));
          if (commonDenominatorMode === 'SAME') expect(l).toBe(r);
          if (commonDenominatorMode === 'RELATED') expect(l !== r && ((l as bigint) % (r as bigint) === 0n || (r as bigint) % (l as bigint) === 0n)).toBe(true);
        }
  });
});

describe('decimal engine', () => {
  for (const difficulty of LEVELS)
    for (const op of OPS) {
      it(`${difficulty} ${op} — exact, terminating answers`, () => {
        for (let i = 0; i < SEEDS; i++) {
          const seed = `de|${difficulty}|${op}|${i}`;
          const q = generateDecimal({ ...defaultDecimalSettings(), difficulty, operations: [op] }, createSeededRandom(seed));
          expectValid(q, seed);
          if (q.canonicalAnswer.type === 'NUMBER') {
            expect(isTerminating(q.canonicalAnswer.value)).toBe(true);
            expect(sign(q.canonicalAnswer.value) >= 0).toBe(true);
          }
        }
      });
    }
});

describe('order of operations engine', () => {
  for (const difficulty of LEVELS)
    it(`${difficulty} — whole-number results, valid strategies`, () => {
      for (let i = 0; i < SEEDS; i++) {
        const seed = `oo|${difficulty}|${i}`;
        const q = generateOrder({ ...defaultOrderSettings(), difficulty }, createSeededRandom(seed));
        expectValid(q, seed);
        if (q.canonicalAnswer.type === 'NUMBER') expect(isInteger(q.canonicalAnswer.value)).toBe(true);
      }
    });
  it('only uses the operations that were picked', () => {
    for (let i = 0; i < 80; i++) {
      const q = generateOrder({ ...defaultOrderSettings(), operators: ['+', '*'] }, createSeededRandom(`oo-pm-${i}`));
      const text = promptToText(q.prompt);
      expect(text).not.toMatch(/[−÷^]/);
    }
  });
});

describe('word problems', () => {
  for (const difficulty of LEVELS)
    it(`${difficulty}`, () => {
      for (let i = 0; i < SEEDS * 2; i++) {
        const seed = `wp|${difficulty}|${i}`;
        const q = generateWordProblem({ ...defaultWordProblemSettings(), difficulty }, createSeededRandom(seed));
        expectValid(q, seed);
        if (q.canonicalAnswer.type === 'NUMBER') expect(sign(q.canonicalAnswer.value)).toBe(1);
      }
    });
});

describe('practice plan', () => {
  it('mixes every enabled source and is reproducible', () => {
    const plan = withDifficulty(
      {
        ...defaultPlan(),
        fractions: { ...defaultPlan().fractions, enabled: true },
        decimals: { ...defaultPlan().decimals, enabled: true },
        order: { ...defaultPlan().order, enabled: true },
        wordProblems: { ...defaultPlan().wordProblems, enabled: true },
      },
      'MEDIUM',
    );
    expect(validatePlan(plan).valid).toBe(true);
    const topics = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const q = generateFromPlan(plan, createSeededRandom(`plan${i}`));
      topics.add(q.topic);
      expectValid(q, `plan${i}`);
    }
    expect(topics.size).toBe(5);
    const a = generateFromPlan(plan, createSeededRandom('repro'));
    const b = generateFromPlan(plan, createSeededRandom('repro'));
    expect(canonicalInputString(a)).toBe(canonicalInputString(b));
    expect(promptToText(a.prompt)).toBe(promptToText(b.prompt));
  });
  it('rejects an empty plan', () => {
    const p = defaultPlan();
    expect(validatePlan({ ...p, arithmetic: { ...p.arithmetic, enabled: false } }).valid).toBe(false);
  });
});
