/**
 * Guided strategies (src/solutions/guided.ts): which number of a step the child fills in, and the three answer bricks.
 *  - unit tests on representative steps (text, nodes, fractions, money, things that must NOT become targets)
 *  - fairness: a blank never shows its own answer (in the rest of the clause, as "34 = 34", or as "8^2 = 8 × 8")
 *  - property test over many generated questions from every topic engine and grade skill: each target is exactly the
 *    number written in the step, the answer is not visible while choosing, and the bricks are 3 distinct values
 *    containing the target exactly once, deterministically.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { nodesToText } from '../../domain/answer/format';
import { allStrategies, P, step } from '../../domain/question/build';
import type { ArithmeticOperator, Difficulty, PromptNode, Question, SolutionStep } from '../../domain/question/types';
import { createSeededRandom } from '../../domain/random/random';
import { decimalPlaces, eq, fromDecimalString, isInteger, isNegative, isTerminating, isZero, normalizeRational, rat, type Rational } from '../../domain/rational/rational';
import { ALL_SKILLS } from '../../curriculum/registry';
import { defaultArithmeticSettings, generateArithmetic } from '../../engines/arithmetic/arithmeticEngine';
import { defaultDecimalSettings, generateDecimal } from '../../engines/decimals/decimalEngine';
import { defaultFractionSettings, generateFraction, type FractionOperation } from '../../engines/fractions/fractionEngine';
import { defaultOrderSettings, generateOrder } from '../../engines/orderOfOperations/orderEngine';
import { defaultWordProblemSettings, generateWordProblem } from '../../engines/wordProblems/wordProblemEngine';
import { blankedContent, findStepTarget, makeStepChoices, saltFor, targetNumberNode, visibleAfter, type StepTarget } from '../../solutions/guided';

const say = (text: string) => step([P.text(text)]);
const text = (nodes: readonly PromptNode[]) => nodesToText(nodes);

function target(s: SolutionStep): StepTarget {
  const t = findStepTarget(s);
  if (!t) throw new Error(`expected a target in: ${text(s.content)}`);
  return t;
}

/* ------------------------------------------------------------------ */
/* Detection                                                            */
/* ------------------------------------------------------------------ */

describe('findStepTarget — "= number" in text', () => {
  it('finds the result of a column step and splits the text around it', () => {
    const t = target(say('Ones: 7 + 8 = 15. Write 5, carry 1.'));
    expect(eq(t.value, rat(15))).toBe(true);
    expect(t.display).toBe('integer');
    expect(t.before).toEqual([P.text('Ones: 7 + 8 = ')]);
    expect(t.after).toEqual([P.text('. Write 5, carry 1.')]);
  });

  it('takes the LAST "= number" in the text', () => {
    const t = target(say('Top: 1×8 + 5×8 = 8 + 40 = 48. Bottom: 8×8 = 64.'));
    expect(eq(t.value, rat(64))).toBe(true);
    expect(text(t.before)).toBe('Top: 1×8 + 5×8 = 8 + 40 = 48. Bottom: 8×8 =');
  });

  it('reads thousands commas, negatives (− and -) and decimals', () => {
    expect(eq(target(say('So 12,345 + 6,789 = 19,134.')).value, rat(19134))).toBe(true);
    expect(eq(target(say('3 − 10 = −7.')).value, rat(-7))).toBe(true);
    expect(eq(target(say('3 - 10 = -7.')).value, rat(-7))).toBe(true);
    const d = target(say('Divide: 1948.2 ÷ 51 = 38.20.'));
    expect(eq(d.value, rat(191, 5))).toBe(true);
    expect(d.display).toBe('decimal');
    expect(d.places).toBe(2); // keeps the written trailing zero
    expect(d.after).toEqual([P.text('.')]);
  });

  it('may hide a number that has more text after it', () => {
    const t = target(say('8 × 7 = 56, so the answer is 8.'));
    expect(eq(t.value, rat(56))).toBe(true);
    expect(t.after).toEqual([P.text(', so the answer is 8.')]);
  });

  it('keeps emphasis on split text', () => {
    const t = target(step([P.strong('Total = 12 apples')]));
    expect(t.before).toEqual([P.strong('Total = ')]);
    expect(t.after).toEqual([P.strong(' apples')]);
  });
});

describe('findStepTarget — number nodes after "="', () => {
  it('uses the last number node directly after an = operator', () => {
    const t = target(step([P.text('Add the fraction parts: '), P.frac(rat(1, 4)), P.op('+'), P.frac(rat(1, 2)), P.op('='), P.frac(rat(3, 4))]));
    expect(eq(t.value, rat(3, 4))).toBe(true);
    expect(t.display).toBe('fraction');
    expect(t.before).toHaveLength(5);
    expect(t.after).toEqual([]);
  });

  it('later nodes may follow; mixed numbers keep their style', () => {
    const t = target(step([P.text('So '), P.frac(rat(5, 2)), P.op('='), P.mixed(rat(5, 2)), P.text('.')]));
    expect(eq(t.value, rat(5, 2))).toBe(true);
    expect(t.style).toBe('mixed');
    expect(t.after).toEqual([P.text('.')]);
  });

  it('a number node after "=" wins over "= number" inside text', () => {
    const t = target(step([P.text('First 2 + 2 = 4, then '), P.num(4), P.op('×'), P.num(3), P.op('='), P.num(12)]));
    expect(eq(t.value, rat(12))).toBe(true);
  });

  it('a number node after text ending in "=" counts', () => {
    const t = target(step([P.text('13 ÷ 4 = '), P.frac(rat(13, 4))]));
    expect(eq(t.value, rat(13, 4))).toBe(true);
    expect(t.before).toEqual([P.text('13 ÷ 4 = ')]);
  });

  it('raw fractions count only in lowest terms (an unreduced 6/8 would look different rebuilt)', () => {
    const lowest = target(step([P.text('Add the numerators: '), { t: 'rawfrac', numerator: 2n, denominator: 8n }, P.op('+'), { t: 'rawfrac', numerator: 3n, denominator: 8n }, P.op('='), { t: 'rawfrac', numerator: 5n, denominator: 8n }]));
    expect(eq(lowest.value, rat(5, 8))).toBe(true);
    expect(findStepTarget(step([P.text('Multiply top and bottom by 2: '), P.frac(rat(3, 4)), P.op('='), { t: 'rawfrac', numerator: 6n, denominator: 8n }]))).toBeNull();
  });

  it('percent: bricks use the exact percent, whatever places the step used', () => {
    const t = target(step([P.text('So '), P.num(rat(3, 4)), P.op('='), { t: 'num', value: rat(3, 4), style: 'percent', places: 0 }]));
    expect(t.style).toBe('percent');
    expect(t.places).toBeUndefined();
    expect(text([targetNumberNode(t, t.value)])).toBe('75%');
    expect(makeStepChoices(t, 1)).toHaveLength(3);
    // 12.5% written with 0 places shows "13%": that is not the exact number, so it is not hidden.
    expect(findStepTarget(step([P.text('Rate'), P.op('='), { t: 'num', value: rat(1, 8), style: 'percent', places: 0 }]))).toBeNull();
  });

  it('money keeps two places and its $ style', () => {
    const t = target(step([P.text('Add what was raised: '), P.money(rat(1250, 100)), P.op('+'), P.money(rat(30)), P.op('='), P.money(rat(4250, 100))]));
    expect(t.display).toBe('decimal');
    expect(t.style).toBe('money');
    expect(t.places).toBe(2);
    expect(text([targetNumberNode(t, t.value)])).toBe('$42.50');
  });
});

describe('findStepTarget — jumps and counting lists', () => {
  it('number-line jump "→ 13"', () => {
    const t = target(say('Jump forward 3: 10 → 13.'));
    expect(eq(t.value, rat(13))).toBe(true);
    expect(t.before).toEqual([P.text('Jump forward 3: 10 → ')]);
  });
  it('last number of a counting list (three or more numbers)', () => {
    const t = target(say('Count on 3 more: 11, 12, 13.'));
    expect(eq(t.value, rat(13))).toBe(true);
    expect(t.before).toEqual([P.text('Count on 3 more: 11, 12, ')]);
    expect(eq(target(say('Skip count by 8, 3 times: 8, 16, 24.')).value, rat(24))).toBe(true);
    expect(eq(target(say('Count back 7: 9, 8, 7, 6, 5, 4, 3.')).value, rat(3))).toBe(true);
    expect(findStepTarget(say('Pairs: 3, 4.'))).toBeNull();
  });
  it.each([
    'Not divisible by 2, 3, 5 or 7.', // not a counting list
    'Faces: 10, 10, 15, 15, 6, 6.',
    'Order: 2, 4, 9, 10, 12.',
    'y ÷ x: 6, 6, 6, 6.', // no step at all
    'Skip count by 6 until you reach 48: 6, 12, 18, 24, 30, 36, 42, 48.', // 48 is already printed in the sentence
    '174 is closer to 13.2² → 13.2.', // same for a jump
    'Starts at 29, goes up 12 each time → 29.',
  ])('lists and jumps that are not counting games: %s', (sentence) => {
    expect(findStepTarget(say(sentence))).toBeNull();
  });
});

describe('findStepTarget — no target', () => {
  it.each([
    'Line up the places. Add from the ones.',
    'Think: 5 + ? = 12.', // the step already has an unknown
    'Ask: what times 7 makes 56?  ? × 7 = 56.',
    'So the answer = 3/4.', // a fraction written in text
    'It is = 1 1/2 cups.', // a mixed number written in text
    'The time = 3:05.',
    'Area = 3² + 1.',
    'Simplify: = 6x − 12.',
    'x <= 5 and y >= 2.',
    'Count back 3 from 15.',
    'seven thousand → 7,___; then 772.', // a written blank is already an unknown
  ])('%s', (sentence) => {
    expect(findStepTarget(say(sentence))).toBeNull();
  });
  it('a blank node means the step already asks something', () => {
    expect(findStepTarget(step([P.money(rat(5)), P.op('+'), P.blank(), P.op('='), P.money(rat(9))]))).toBeNull();
  });
  it('empty steps', () => {
    expect(findStepTarget(step([]))).toBeNull();
  });
});

describe('the rest of a step waits until it is solved (it would give the answer away)', () => {
  it('"Ones: 0 + 2 = 2. Write 2." shows only "Ones: 0 + 2 = ? ." while choosing', () => {
    const t = target(say('Ones: 0 + 2 = 2. Write 2.'));
    expect(visibleAfter(t, false)).toEqual([P.text('.')]);
    expect(visibleAfter(t, true)).toEqual([P.text('. Write 2.')]);
    expect(blankedContent(t)).toEqual([P.text('Ones: 0 + 2 = '), P.blank(), P.text('.')]);
  });
  it('a decimal point is not a sentence end; a unit stays visible', () => {
    const t = target(say('Speed = 12 km per 1.5 h. Done.'));
    expect(eq(t.value, rat(12))).toBe(true);
    expect(visibleAfter(t, false)).toEqual([P.text(' km per 1.5 h.')]);
    const d = target(say('Total = 4.25 m. Write it.'));
    expect(eq(d.value, fromDecimalString('4.25'))).toBe(true);
    expect(visibleAfter(d, false)).toEqual([P.text(' m.')]);
  });
  it('the shown part stops at a comma, "so", an arrow, another "=" or an = node', () => {
    expect(visibleAfter(target(say('12 × 8 = 96, so 96.')), false)).toEqual([P.text(',')]);
    expect(visibleAfter(target(say('1 + 1 + 1 = 3 so 3x.')), false)).toEqual([]);
    expect(visibleAfter(target(say('y: 0 + 4 = 4 → (8, 4).')), false)).toEqual([]);
    expect(visibleAfter(target(say('√121 = 11 = 11/1.')), false)).toEqual([]);
    const nodes = target(step([P.num(3), P.op('×'), P.num(4), P.op('='), P.num(12), P.op('='), P.num(12)]));
    expect(nodes.before).toHaveLength(4); // 3 × 4 = [?]: the second 12 repeats the first ("12 = 12" is not a question)
    expect(visibleAfter(nodes, false)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Fairness: the blank never shows its own answer                      */
/* ------------------------------------------------------------------ */

/** Text of nodes without trimming (nodesToText trims its result). */
const raw = (nodes: readonly PromptNode[]) => nodes.map((n) => (n.t === 'text' ? n.text : text([n]))).join('');
/** The step as the child sees it while choosing, with the box as [?]. */
const asShown = (t: StepTarget) => `${raw(t.before)}[?]${raw(visibleAfter(t, false))}`;

describe('fairness — the answer is not on screen while the child is choosing', () => {
  it.each([
    // [step, hidden number, what the child sees]
    ['Count the pieces: 88 + 1 = 89, so 89/11', 89, 'Count the pieces: 88 + 1 = [?],'],
    ['79 − 72 = 7 is left over, so the answer is 9 R 7.', 7, '79 − 72 = [?] is left over,'],
    ['348 − 345 = 3 is left over, so the answer is 69 R 3.', 3, '348 − 345 = [?] is left over,'],
    ['12 × 8 = 96, so 96.', 96, '12 × 8 = [?],'],
    ['6 × 5 = 30, so −30.', 30, '6 × 5 = [?],'],
    ['1 + 1 + 1 = 5, so 5a.', 5, '1 + 1 + 1 = [?],'],
    ['y: 14 + 4 = 18 → (8, 18).', 18, 'y: 14 + 4 = [?]'],
    ['11 × 12 = 132, so the answer is 132.', 132, '11 × 12 = [?],'],
    ['17 ÷ 5 = 3 R 2.', 3, '17 ÷ 5 = [?] R 2.'], // the remainder is a different number: a fine question
  ])('%s', (sentence, value, shown) => {
    const t = target(say(sentence));
    expect(eq(t.value, rat(value))).toBe(true);
    expect(asShown(t)).toBe(shown);
  });

  it('the fraction after ", so" (COUNT_THE_PARTS) waits too', () => {
    const t = target(step([P.text('Count the pieces: 88 + 1 = 89, so '), P.frac(rat(89, 11))]));
    expect(eq(t.value, rat(89))).toBe(true);
    expect(visibleAfter(t, false)).toEqual([P.text(',')]);
  });

  it.each([
    'Compare the tops: 34 = 34.', // the same number on both sides
    'Split: 20 = 20, 6 = 6.',
    'Add them: 120 = 120.',
    'So 498 = 498.',
    '8^2 = 8 × 8.', // the number only starts an expression
    '4 = 2 × 2.',
    'n = 3 × 3 − 7.',
    '30 + 25 = 5 × (6 + 5).',
    '15 ÷ 4 = 3 R 3.', // the answer would be printed right next to the box
    'The line x = 2 hits 2 points.',
  ])('no fair blank: %s', (sentence) => {
    expect(findStepTarget(say(sentence))).toBeNull();
  });

  it('an equation the sentence already wrote out is not asked again ("y = 9 → y = 9")', () => {
    const t = target(say('y = 9 → y = 9.'));
    expect(text(t.before)).toBe('y =');
    expect(visibleAfter(t, false)).toEqual([]);
  });

  it('number nodes: an expression after "=" or the same number again is skipped; a new form is a fair question', () => {
    expect(findStepTarget(step([P.num(4), P.op('='), P.num(2), P.op('×'), P.num(2)]))).toBeNull();
    expect(findStepTarget(step([P.text('So '), P.num(7), P.op('='), P.num(7)]))).toBeNull();
    expect(findStepTarget(step([P.text('Simplify: '), P.num(5), P.op('='), P.num(5), { t: 'var', name: 'x' }]))).toBeNull();
    // 5/2 = 2 1/2 asks for the mixed number: a different written form, so it stays.
    expect(target(step([P.text('So '), P.frac(rat(5, 2)), P.op('='), P.mixed(rat(5, 2))])).style).toBe('mixed');
  });

  it('operands that happen to equal the result are fine ("7 × 1 = 7")', () => {
    expect(eq(target(say('7 × 1 = 7.')).value, rat(7))).toBe(true);
    expect(eq(target(say('Ones: 0 + 5 = 5.')).value, rat(5))).toBe(true);
  });
});

describe('order-of-operations steps keep the second line hidden until solved', () => {
  const s = step([P.text('Multiply: 3 × 4 = 12'), P.br(), P.num(5), P.op('+'), P.num(12)]);
  it('target is the product; the rewritten line waits', () => {
    const t = target(s);
    expect(eq(t.value, rat(12))).toBe(true);
    expect(visibleAfter(t, false)).toEqual([]);
    expect(visibleAfter(t, true)).toEqual([P.br(), P.num(5), P.op('+'), P.num(12)]);
    expect(blankedContent(t)).toEqual([P.text('Multiply: 3 × 4 = '), P.blank()]);
  });
});

/* ------------------------------------------------------------------ */
/* Answer bricks                                                        */
/* ------------------------------------------------------------------ */

function expectGoodChoices(t: StepTarget, salt: number, context = '') {
  const choices = makeStepChoices(t, salt);
  expect(choices, context).toHaveLength(3);
  expect(choices.filter((c) => eq(c, t.value)), `${context}: target exactly once`).toHaveLength(1);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(eq(choices[i] as Rational, choices[j] as Rational), `${context}: distinct`).toBe(false);
  if (!isNegative(t.value)) for (const c of choices) expect(isNegative(c), `${context}: never negative`).toBe(false);
  for (const c of choices) {
    if (t.display === 'integer') expect(isInteger(c), context).toBe(true);
    if (t.display === 'fraction') expect(!isInteger(c) && !isZero(c), context).toBe(true);
    if (t.display === 'decimal') {
      expect(isTerminating(c), context).toBe(true);
      if (t.places !== undefined) expect(decimalPlaces(c) <= t.places, `${context}: no rounding`).toBe(true);
    }
  }
  const again = makeStepChoices(t, salt);
  expect(again.every((c, i) => eq(c, choices[i] as Rational)), `${context}: deterministic`).toBe(true);
  return choices;
}

const int = (n: number): StepTarget => ({ before: [], value: rat(n), display: 'integer', after: [] });

describe('makeStepChoices', () => {
  it('integers: 3 distinct, kid-plausible (±1, ±10, swapped digits, place slips)', () => {
    const choices = expectGoodChoices(int(85), 1);
    const plausible = [84, 86, 75, 95, 58, 850].map((n) => rat(n));
    for (const c of choices) if (!eq(c, rat(85))) expect(plausible.some((p) => eq(p, c))).toBe(true);
  });

  it('small numbers stay small and never negative', () => {
    for (const n of [0, 1, 2, 3, 9]) {
      const choices = expectGoodChoices(int(n), 7);
      for (const c of choices) expect(Number(c.numerator)).toBeLessThanOrEqual(n + 10);
    }
  });

  it('negative answers may have negative distractors', () => {
    expectGoodChoices(int(-7), 3);
  });

  it('decimals: same precision or a moved point', () => {
    const t: StepTarget = { before: [], value: fromDecimalString('4.75'), display: 'decimal', after: [] };
    const choices = expectGoodChoices(t, 2);
    const plausible = ['4.74', '4.76', '4.65', '4.85', '47.5', '0.475', '5.75', '3.75'].map(fromDecimalString);
    for (const c of choices) if (!eq(c, t.value)) expect(plausible.some((p) => eq(p, c))).toBe(true);
  });

  it('money never needs rounding', () => {
    for (const cents of [1, 5, 99, 100, 4250, 123456]) {
      expectGoodChoices({ before: [], value: rat(cents, 100), display: 'decimal', style: 'money', places: 2, after: [] }, cents);
    }
  });

  it('fractions: numerator/denominator slips and upside down, never whole numbers', () => {
    const t: StepTarget = { before: [], value: rat(3, 4), display: 'fraction', after: [] };
    const choices = expectGoodChoices(t, 5);
    const plausible = [rat(1, 1), rat(1, 2), rat(3, 5), rat(3, 3), rat(4, 3), rat(4, 5)];
    for (const c of choices) if (!eq(c, t.value)) expect(plausible.some((p) => eq(p, c))).toBe(true);
    expectGoodChoices({ before: [], value: rat(13, 4), display: 'fraction', style: 'mixed', after: [] }, 9);
    expectGoodChoices({ before: [], value: rat(1, 2), display: 'fraction', after: [] }, 0);
    expectGoodChoices({ before: [], value: rat(-2, 3), display: 'fraction', after: [] }, 4);
  });

  it('the position of the right brick depends on the salt (not always first)', () => {
    const positions = new Set<number>();
    for (let salt = 0; salt < 30; salt++) positions.add(makeStepChoices(int(85), salt).findIndex((c) => eq(c, rat(85))));
    expect(positions.size).toBe(3);
  });

  it('saltFor is deterministic and spreads', () => {
    expect(saltFor('q:1', 'COLUMN_ADDITION', 2)).toBe(saltFor('q:1', 'COLUMN_ADDITION', 2));
    expect(saltFor('q:1', 'COLUMN_ADDITION', 2)).not.toBe(saltFor('q:1', 'COLUMN_ADDITION', 3));
  });

  it('property: any integer, decimal or fraction target gets 3 good bricks', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: 100000 }), fc.integer({ min: 0, max: 3 }), fc.integer({ min: 1, max: 40 }), fc.integer(), (n, places, d, salt) => {
        expectGoodChoices(int(n), salt);
        const dec = rat(n, 10 ** places);
        expectGoodChoices({ before: [], value: dec, display: 'decimal', places, after: [] }, salt);
        expectGoodChoices({ before: [], value: dec, display: 'decimal', after: [] }, salt);
        const f = normalizeRational(BigInt(n), BigInt(d));
        if (!isInteger(f)) expectGoodChoices({ before: [], value: f, display: 'fraction', after: [] }, salt);
      }),
      { numRuns: 300 },
    );
  });
});

/* ------------------------------------------------------------------ */
/* Property: every generated question                                   */
/* ------------------------------------------------------------------ */

/** Rebuild the number exactly as it is written in the original step, from the target's before/after split. */
function writtenNumber(original: SolutionStep, t: StepTarget): Rational {
  const content = original.content;
  // Node case: [...before, numberNode, ...after] with the very same node objects around it.
  if (content.length === t.before.length + 1 + t.after.length && t.before.every((n, i) => n === content[i]) && t.after.every((n, i) => n === content[t.before.length + 1 + i])) {
    const node = content[t.before.length] as PromptNode;
    if (node.t === 'num') return node.value;
    if (node.t === 'rawfrac') return normalizeRational(node.numerator, node.denominator);
    throw new Error(`hidden node is not a number: ${node.t}`);
  }
  // Text case: one text node was split into before-text | number | after-text.
  let i = 0;
  while (i < content.length && content[i] === t.before[i]) i++;
  const split = content[i];
  if (!split || split.t !== 'text') throw new Error('expected a split text node');
  const tail = content.slice(i + 1);
  const beforeText = t.before.length > i ? (t.before[i] as PromptNode) : null;
  const afterText = t.after.length > tail.length ? (t.after[0] as PromptNode) : null;
  expect(t.before.length).toBe(i + (beforeText ? 1 : 0));
  expect(t.after.slice(t.after.length - tail.length).every((n, k) => n === tail[k])).toBe(true);
  const pre = beforeText && beforeText.t === 'text' ? beforeText.text : '';
  const post = afterText && afterText.t === 'text' ? afterText.text : '';
  expect(split.text.startsWith(pre) && split.text.endsWith(post)).toBe(true);
  const middle = split.text.slice(pre.length, split.text.length - post.length);
  expect(middle).toMatch(/^[-−]?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/);
  return fromDecimalString(middle.replace('−', '-').replace(/,/g, ''));
}

interface Tally {
  steps: number;
  targets: number;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The hidden number must not be readable while the child chooses, and must be a whole answer (not "8 = [8] × 1"). */
function expectFair(t: StepTarget, context: string) {
  const label = text([targetNumberNode(t, t.value)]);
  const bare = label.replace(/^[-−$]+/, '');
  const shown = text(visibleAfter(t, false));
  for (const form of new Set([label, bare, bare.replace(/,/g, '')])) {
    expect(new RegExp(`(^|[^\\d.,/])${escapeRe(form)}(?![\\d/]|[.,]\\d)`).test(shown), `${context}: "${form}" is visible in "${shown}"`).toBe(false);
  }
  const lineBreak = t.after.findIndex((n) => n.t === 'br');
  const rest = raw(lineBreak === -1 ? t.after : t.after.slice(0, lineBreak));
  expect(/^\s*[+\-−×÷·*/^]/.test(rest), `${context}: the number only starts an expression`).toBe(false);
  const left = text(t.before).replace(/\s*[=→]\s*$/, '').split(/[.;!?:,](?=\s)|[→=<>≤≥≠]|\b(?:so|then)\b/i).pop()?.trim();
  expect(left === label || left === bare, `${context}: "${left} = ${label}" says the same number twice`).toBe(false);
}

function checkQuestion(q: Question, tally: Tally) {
  for (const tree of allStrategies(q)) {
    tree.steps.forEach((s, i) => {
      tally.steps++;
      const t = findStepTarget(s);
      if (!t) return;
      tally.targets++;
      const context = `${q.id} ${tree.strategy} step ${i + 1}: ${text(s.content)}`;
      expect(eq(writtenNumber(s, t), t.value), context).toBe(true);
      expectFair(t, context);
      expectGoodChoices(t, saltFor(q.id, tree.strategy, i), context);
      expect(findStepTarget(s), `${context}: detection is deterministic`).toEqual(t);
    });
  }
}

const LEVELS: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const OPS: ArithmeticOperator[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];
const FRACTION_OPS: FractionOperation[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'SIMPLIFY', 'COMPARE', 'CONVERT'];

type Maker = { name: string; make: (seed: string) => Question };

const MAKERS: Maker[] = [
  ...LEVELS.flatMap((difficulty) =>
    OPS.map((op) => ({ name: `arithmetic ${difficulty} ${op}`, make: (seed: string) => generateArithmetic({ ...defaultArithmeticSettings(), difficulty, enabledOperations: [op] }, createSeededRandom(seed)) })),
  ),
  {
    name: 'arithmetic custom negatives',
    make: (seed) =>
      generateArithmetic(
        { ...defaultArithmeticSettings(), difficulty: 'CUSTOM', enabledOperations: OPS, allowNegativeOperands: true, allowNegativeResults: true, operandRange: { min: -20, max: 20 }, secondOperandRange: { min: -12, max: 12 } },
        createSeededRandom(seed),
      ),
  },
  { name: 'arithmetic 3 operands', make: (seed) => generateArithmetic({ ...defaultArithmeticSettings(), difficulty: 'CUSTOM', operandCount: 3, operandRange: { min: 0, max: 200 }, secondOperandRange: { min: 0, max: 30 }, enabledOperations: ['ADD', 'SUBTRACT', 'MULTIPLY'] }, createSeededRandom(seed)) },
  { name: 'arithmetic remainder division', make: (seed) => generateArithmetic({ ...defaultArithmeticSettings(), enabledOperations: ['DIVIDE'], divisionMode: 'REMAINDER' }, createSeededRandom(seed)) },
  {
    name: 'arithmetic decimal division',
    make: (seed) => generateArithmetic({ ...defaultArithmeticSettings(), enabledOperations: ['DIVIDE'], divisionMode: 'DECIMAL', difficulty: 'CUSTOM', operandRange: { min: 1, max: 50 }, secondOperandRange: { min: 2, max: 10 } }, createSeededRandom(seed)),
  },
  ...LEVELS.flatMap((difficulty) => FRACTION_OPS.map((op) => ({ name: `fractions ${difficulty} ${op}`, make: (seed: string) => generateFraction({ ...defaultFractionSettings(), difficulty, operations: [op] }, createSeededRandom(seed)) }))),
  ...LEVELS.flatMap((difficulty) => OPS.map((op) => ({ name: `decimals ${difficulty} ${op}`, make: (seed: string) => generateDecimal({ ...defaultDecimalSettings(), difficulty, operations: [op] }, createSeededRandom(seed)) }))),
  ...LEVELS.map((difficulty) => ({ name: `order of operations ${difficulty}`, make: (seed: string) => generateOrder({ ...defaultOrderSettings(), difficulty }, createSeededRandom(seed)) })),
  ...LEVELS.flatMap((difficulty) => OPS.map((op) => ({ name: `word problems ${difficulty} ${op}`, make: (seed: string) => generateWordProblem({ ...defaultWordProblemSettings(), difficulty, operations: [op] }, createSeededRandom(seed)) }))),
];

describe('property: targets in every engine are the written number; bricks are good', () => {
  for (const maker of MAKERS) {
    it(maker.name, () => {
      const tally: Tally = { steps: 0, targets: 0 };
      for (let i = 0; i < 25; i++) checkQuestion(maker.make(`guided|${maker.name}|${i}`), tally);
      expect(tally.steps).toBeGreaterThan(0);
      // Fraction comparison strategies are all "compare" sentences, so they may legitimately have no number to fill.
      if (!/COMPARE/.test(maker.name)) expect(tally.targets, `${maker.name}: some steps are playable`).toBeGreaterThan(0);
    });
  }

  it('random seeds across all engines (fast-check)', () => {
    const tally: Tally = { steps: 0, targets: 0 };
    fc.assert(
      fc.property(fc.constantFrom(...MAKERS), fc.string({ minLength: 1, maxLength: 12 }), (maker, seed) => {
        checkQuestion(maker.make(seed), tally);
      }),
      { numRuns: 400 },
    );
    // The game should have plenty to play: most strategies have numbers to fill in.
    expect(tally.targets / tally.steps).toBeGreaterThan(0.4);
  });

  it('grade-level skills: detection holds and the answer is never visible while choosing', () => {
    const tally: Tally = { steps: 0, targets: 0 };
    for (const skill of ALL_SKILLS) for (const difficulty of LEVELS) for (let i = 0; i < 4; i++) checkQuestion(skill.generate(createSeededRandom(`guided|${skill.id}|${difficulty}|${i}`), difficulty), tally);
    expect(tally.targets).toBeGreaterThan(0);
  });
});
