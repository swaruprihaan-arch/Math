/**
 * Word problems (legacy "Word Problems" tab, rebuilt with exact answers and multiple strategies).
 * Short, 1–2 sentence stories. Answers accept a fraction, mixed number or decimal.
 */
import { A, buildQuestion, P, prompt, SCHEMA, solution, step, strategies } from '../../domain/question/build';
import type { ArithmeticOperator, Difficulty, PromptNode, Question, SettingsValidationResult, SolutionTree, ValidationPolicy } from '../../domain/question/types';
import type { RandomSource } from '../../domain/random/random';
import { add, isTerminating, mul, rat, sub, toMixed, type Rational } from '../../domain/rational/rational';
import { NAMES } from '../../curriculum/helpers';
import { decimalMultiplyStrategies } from '../../solutions/strategies/decimals';
import { fractionAddSubStrategies, fractionMultiplyStrategies } from '../../solutions/strategies/fractions';
import { additionStrategies, divisionStrategies, multiplicationStrategies, subtractionStrategies } from '../../solutions/strategies/wholeNumber';

export interface WordProblemSettings {
  difficulty: Difficulty;
  operations: ArithmeticOperator[];
}

export const WORD_GENERATOR_ID = 'word-problems';
export const WORD_GENERATOR_VERSION = '2.0.0';

export function defaultWordProblemSettings(): WordProblemSettings {
  return { difficulty: 'MEDIUM', operations: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'] };
}

export function validateWordProblemSettings(s: WordProblemSettings): SettingsValidationResult {
  return s.operations.length === 0 ? { valid: false, errors: ['Pick at least one operation for word problems.'] } : { valid: true, errors: [] };
}

interface Story {
  nodes: PromptNode[];
  answer: Rational;
  trees: SolutionTree[];
  units?: string[];
  money?: boolean;
  standards: string[];
}

interface Template {
  id: string;
  ops: ArithmeticOperator[];
  make(rng: RandomSource, level: 0 | 1 | 2): Story;
}

const T = P.text;
const dollars = (cents: number) => rat(cents, 100);
const decimalOf = (units: number, places: number) => rat(units, 10 ** places);

const TEMPLATES: Template[] = [
  {
    id: 'jog',
    ops: ['ADD'],
    make(rng, level) {
      const name = rng.choose(NAMES);
      const maxD = [6, 9, 12][level] as number;
      const a = rat(rng.integer(1, 5), rng.integer(2, maxD));
      const b = rat(rng.integer(1, 5), rng.integer(2, maxD));
      return {
        nodes: [T(`${name} jogs `), P.mixed(a), T(' mile in the morning and '), P.mixed(b), T(' mile at night. Total miles?')],
        answer: add(a, b),
        trees: fractionAddSubStrategies(a, b, 'ADD'),
        units: ['miles', 'mile', 'mi'],
        standards: ['5.NF.2'],
      };
    },
  },
  {
    id: 'recipe',
    ops: ['MULTIPLY'],
    make(rng, level) {
      const per = rat(rng.integer(1, 3), rng.integer(2, [4, 6, 8][level] as number));
      const batches = rng.integer(2, [4, 6, 9][level] as number);
      return {
        nodes: [T('A recipe uses '), P.mixed(per), T(` cup of sugar. How much for ${batches} batches?`)],
        answer: mul(per, rat(batches)),
        trees: fractionMultiplyStrategies(rat(batches), per),
        units: ['cups', 'cup'],
        standards: ['4.NF.4'],
      };
    },
  },
  {
    id: 'juice',
    ops: ['MULTIPLY'],
    make(rng, level) {
      const bottle = decimalOf(rng.integer(10, 50), 1);
      const count = rng.integer(3, [6, 9, 12][level] as number);
      return {
        nodes: [T('A bottle holds '), P.dec(bottle), T(` L. How many liters in ${count} bottles?`)],
        answer: mul(bottle, rat(count)),
        trees: decimalMultiplyStrategies(bottle, rat(count)),
        units: ['liters', 'litres', 'l'],
        standards: ['5.NBT.7'],
      };
    },
  },
  {
    id: 'class-money',
    ops: ['ADD', 'SUBTRACT'],
    make(rng, level) {
      const scale = [1000, 5000, 10000][level] as number;
      const d1 = rng.integer(500, scale);
      const d2 = rng.integer(500, scale);
      const cost = rng.integer(100, d1 + d2 - 100); // never more than was raised (legacy bug fix)
      const a = dollars(d1);
      const b = dollars(d2);
      const c = dollars(cost);
      const left = sub(add(a, b), c);
      const total = add(a, b);
      return {
        nodes: [T('The class raised '), P.money(a), T(' and '), P.money(b), T(', then spent '), P.money(c), T('. How much is left?')],
        answer: left,
        money: true,
        trees: [
          solution('ADD_THEN_SUBTRACT', [step([T('Add what was raised: '), P.money(a), P.op('+'), P.money(b), P.op('='), P.money(total)]), step([T('Take away the cost: '), P.money(total), P.op('−'), P.money(c), P.op('='), P.money(left)])], A.number(left), 'Add, then subtract'),
          (() => {
            const [big, small] = d1 >= d2 ? [a, b] : [b, a];
            if (cost <= Math.max(d1, d2)) {
              return solution(
                'SUBTRACT_FIRST',
                [step([T('Spend from the bigger amount: '), P.money(big), P.op('−'), P.money(c), P.op('='), P.money(sub(big, c))]), step([T('Add the other amount: '), P.money(sub(big, c)), P.op('+'), P.money(small), P.op('='), P.money(left)])],
                A.number(left),
                'Subtract first',
              );
            }
            return solution(
              'COUNT_UP',
              [step([T('Total raised: '), P.money(total), T('.')]), step([T('Count up from the cost: '), P.money(c), P.op('+'), P.blank(), P.op('='), P.money(total), T(', so '), P.money(left), T(' is left.')])],
              A.number(left),
              'Count up from the cost',
            );
          })(),
        ],
        standards: ['4.MD.2', '5.NBT.7'],
      };
    },
  },
  {
    id: 'cookies',
    ops: ['DIVIDE'],
    make(rng, level) {
      const friends = rng.integer(3, [5, 8, 12][level] as number);
      const cookies = rng.integer(friends + 1, [24, 48, 99][level] as number);
      const each = rat(cookies, friends);
      const m = toMixed(each);
      return {
        nodes: [T(`${cookies} cookies are shared equally by ${friends} friends. How many cookies each?`)],
        answer: each,
        units: ['cookies', 'cookie'],
        trees: [
          solution('DIVISION_AS_FRACTION', [step([T(`${cookies} ÷ ${friends} = `), P.frac(each), ...(m.numerator !== 0n && m.whole > 0n ? [P.op('='), P.mixed(each)] : [])])], A.number(each), 'Division is a fraction'),
          solution(
            'SHARE_WHOLES_FIRST',
            [
              step([T(`Give out whole cookies: ${friends} × ${m.whole} = ${Number(m.whole) * friends}, so each gets ${m.whole}.`)]),
              step(m.numerator === 0n ? [T('No cookies are left over.')] : [T(`${m.numerator} left over, split ${friends} ways: each gets `), P.frac(rat(m.numerator, m.denominator)), T(' more.')]),
              step([T('Each friend gets '), P.mixed(each), T('.')]),
            ],
            A.number(each),
            'Share wholes first',
          ),
        ],
        standards: ['5.NF.3'],
      };
    },
  },
  {
    id: 'rectangle',
    ops: ['MULTIPLY'],
    make(rng, level) {
      const L = decimalOf(rng.integer(10, [60, 120, 200][level] as number), 1);
      const W = decimalOf(rng.integer(10, [40, 80, 200][level] as number), 1);
      return {
        nodes: [T('A rectangle is '), P.dec(L), T(' m by '), P.dec(W), T(' m. Area in m²?')],
        answer: mul(L, W),
        trees: decimalMultiplyStrategies(L, W),
        units: ['m²', 'm2', 'square meters', 'sq m', 'm^2'],
        standards: ['5.NBT.7', '6.G.1'],
      };
    },
  },
  {
    id: 'stickers',
    ops: ['SUBTRACT'],
    make(rng, level) {
      const name = rng.choose(NAMES);
      const had = rng.integer([12, 40, 200][level] as number, [20, 99, 999][level] as number);
      const gave = rng.integer(2, had - 1);
      return {
        nodes: [T(`${name} had ${had} stickers and gave away ${gave}. How many are left?`)],
        answer: rat(had - gave),
        trees: subtractionStrategies(had, gave),
        units: ['stickers', 'sticker'],
        standards: [had <= 20 ? '1.OA.1' : had <= 100 ? '2.OA.1' : '3.NBT.2'],
      };
    },
  },
  {
    id: 'chairs',
    ops: ['MULTIPLY'],
    make(rng, level) {
      const rows = rng.integer(2, [5, 9, 25][level] as number);
      const per = rng.integer(2, [5, 12, 30][level] as number);
      return {
        nodes: [T(`There are ${rows} rows with ${per} chairs in each row. How many chairs?`)],
        answer: rat(rows * per),
        trees: multiplicationStrategies(rows, per),
        units: ['chairs', 'chair'],
        standards: [rows <= 10 && per <= 10 ? '3.OA.3' : '4.NBT.5'],
      };
    },
  },
  {
    id: 'books',
    ops: ['ADD'],
    make(rng, level) {
      const has = rng.integer([5, 20, 100][level] as number, [10, 80, 900][level] as number);
      const more = rng.integer([1, 5, 50][level] as number, [9, 60, 800][level] as number);
      return {
        nodes: [T(`A library has ${has} books and gets ${more} more. How many books now?`)],
        answer: rat(has + more),
        trees: additionStrategies(has, more),
        units: ['books', 'book'],
        standards: [has + more <= 20 ? '1.OA.1' : has + more <= 100 ? '2.OA.1' : '3.NBT.2'],
      };
    },
  },
  {
    id: 'marbles',
    ops: ['DIVIDE'],
    make(rng, level) {
      const bags = rng.integer(2, [5, 9, 12][level] as number);
      const each = rng.integer(2, [5, 10, 25][level] as number);
      return {
        nodes: [T(`${bags * each} marbles go equally into ${bags} bags. How many in each bag?`)],
        answer: rat(each),
        trees: divisionStrategies(bags * each, bags),
        units: ['marbles', 'marble'],
        standards: ['3.OA.3'],
      };
    },
  },
  {
    id: 'ribbon',
    ops: ['SUBTRACT'],
    make(rng, level) {
      const d = rng.choose([2, 4, 8, ...(level > 0 ? [3, 6] : [])]);
      const total = rat(rng.integer(2, 5) * d + rng.integer(1, d - 1), d);
      const cut = rat(rng.integer(1, Number(toMixed(total).whole) * d - 1), d);
      return {
        nodes: [T('A ribbon is '), P.mixed(total), T(' ft long. You cut off '), P.mixed(cut), T(' ft. How much is left?')],
        answer: sub(total, cut),
        trees: fractionAddSubStrategies(total, cut, 'SUBTRACT'),
        units: ['ft', 'feet', 'foot'],
        standards: ['4.NF.3'],
      };
    },
  },
  {
    id: 'pizza',
    ops: ['MULTIPLY'],
    make(rng, level) {
      const name = rng.choose(NAMES);
      const left = rat(rng.integer(1, 3), rng.choose([2, 3, 4]));
      const eats = rat(1, rng.integer(2, [3, 4, 6][level] as number));
      return {
        nodes: [P.frac(left), T(` of a pizza is left. ${name} eats `), P.frac(eats), T(' of it. What part of the whole pizza is that?')],
        answer: mul(eats, left),
        trees: fractionMultiplyStrategies(eats, left),
        standards: ['5.NF.6'],
      };
    },
  },
];

/** Templates that fit the chosen operations (every op of a template must be enabled). */
export function templatesFor(ops: ArithmeticOperator[]): Template[] {
  const allowed = new Set(ops);
  const fit = TEMPLATES.filter((t) => t.ops.every((o) => allowed.has(o)));
  return fit.length > 0 ? fit : TEMPLATES.filter((t) => t.ops.some((o) => allowed.has(o)));
}

export function generateWordProblem(settings: WordProblemSettings, rng: RandomSource): Question {
  const check = validateWordProblemSettings(settings);
  if (!check.valid) throw new Error(check.errors.join(' '));
  const level = settings.difficulty === 'EASY' ? 0 : settings.difficulty === 'HARD' ? 2 : 1;
  const template = rng.choose(templatesFor(settings.operations));
  const story = template.make(rng, level);
  const policy: ValidationPolicy = story.money ? { decimalTolerancePlaces: 2 } : isTerminating(story.answer) ? {} : { decimalTolerancePlaces: 3 };
  const units = story.units;
  return buildQuestion(
    {
      topic: 'WORD_PROBLEMS',
      subtype: template.id,
      difficulty: settings.difficulty,
      prompt: prompt(story.nodes),
      operation: template.ops.join('+'),
      canonicalAnswer: A.number(story.answer),
      answerSchema: story.money ? SCHEMA.money() : SCHEMA.anyNumber(units),
      validationPolicy: policy,
      ...strategies(story.trees),
      answerDisplay: story.money ? 'money' : isTerminating(story.answer) && story.answer.denominator !== 1n && template.id !== 'cookies' && template.id !== 'jog' && template.id !== 'recipe' && template.id !== 'ribbon' && template.id !== 'pizza' ? 'decimal' : 'mixed',
      generatorId: WORD_GENERATOR_ID,
      generatorVersion: WORD_GENERATOR_VERSION,
      constraints: { template: template.id, level },
      standards: story.standards,
    },
    rng,
  );
}
