/**
 * Grade 4 practice skills (California CCSSM). Every question offers ≥ 2 strategies; prompts are kept very short.
 *
 * Standards NOT auto-generated (and why):
 *   - 4.MD.6  Measuring angles with a protractor / sketching angles — needs a physical tool and drawing.
 *   - 4.G.1   Drawing points, lines, rays and perpendicular/parallel lines — drawing task; angle classification is covered.
 *   - 4.NF.1/4.NF.2 "explain/justify with visual models" parts — open-ended; the computational parts are covered.
 */
import { formatNumber } from '../../domain/answer/format';
import { A, COMPARE_CHOICES, P, prompt, SCHEMA, strategies, YES_NO_CHOICES } from '../../domain/question/build';
import type { PromptNode, SolutionTree } from '../../domain/question/types';
import { add, isPrime, lcmNum, mul, rat, sub, toMixed, toMixedString, type Rational } from '../../domain/rational/rational';
import { fractionMultiplyStrategies } from '../../solutions/strategies/fractions';
import { additionStrategies, divisionStrategies, multiplicationStrategies, subtractionStrategies } from '../../solutions/strategies/wholeNumber';
import { compareSymbol, fixedChoices, makeChoices, pickItem, pickName, plural } from '../helpers';
import { defineSkill } from '../skill';
import type { Skill } from '../types';
import { divisors, numberToWords, PLACE_NAMES, roundToPlace, tree, uniqueStrategies } from './_g35Helpers';

const rf = (n: number | bigint, d: number | bigint): PromptNode => ({ t: 'rawfrac', numerator: BigInt(n), denominator: BigInt(d) });
const fmt = (n: number): string => formatNumber(rat(n));
const money = (cents: number): string => formatNumber(rat(cents, 100), 'money');
const G4_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12];

/* -------------------------------- 4.OA -------------------------------- */

const multiplicativeComparison = defineSkill({
  id: 'g4.oa.times-as-many',
  grade: '4',
  domain: 'OA',
  standards: ['4.OA.1', '4.OA.2'],
  title: 'Times as many',
  generate(ctx) {
    const { rng } = ctx;
    const [first, second] = rng.sample(['Ana', 'Ben', 'Maya', 'Leo', 'Zara', 'Omar', 'Hana', 'Kai'], 2) as [string, string];
    const item = pickItem(rng);
    const small = rng.integer(2, ctx.tier({ EASY: 9, MEDIUM: 12, HARD: 25 }));
    const k = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 9, HARD: 9 }));
    const big = small * k;
    const kind = ctx.tier({ EASY: 'product', MEDIUM: rng.choose(['product', 'part']), HARD: rng.choose(['part', 'times']) });
    if (kind === 'product') {
      return ctx.question({
        prompt: prompt([P.text(`${first} has ${small} ${item.plural}. ${second} has ${k} times as many. How many does ${second} have?`)]),
        operation: 'MULTIPLY',
        canonicalAnswer: A.number(big),
        answerSchema: SCHEMA.integer([item.plural, item.singular]),
        ...strategies(multiplicationStrategies(k, small)),
      });
    }
    if (kind === 'part') {
      return ctx.question({
        prompt: prompt([P.text(`${second} has ${big} ${item.plural}. That is ${k} times as many as ${first}. How many does ${first} have?`)]),
        operation: 'DIVIDE',
        canonicalAnswer: A.number(small),
        answerSchema: SCHEMA.integer([item.plural, item.singular]),
        ...strategies(divisionStrategies(big, k)),
      });
    }
    return ctx.question({
      prompt: prompt([P.text(`${big} is how many times as many as ${small}?`)]),
      operation: 'DIVIDE',
      canonicalAnswer: A.number(k),
      answerSchema: SCHEMA.integer(['times']),
      ...strategies(divisionStrategies(big, small)),
    });
  },
});

const remainders = defineSkill({
  id: 'g4.oa.interpret-remainders',
  grade: '4',
  domain: 'OA',
  standards: ['4.OA.3'],
  title: 'What to do with the remainder',
  generate(ctx) {
    const { rng } = ctx;
    const c = rng.integer(3, ctx.tier({ EASY: 6, MEDIUM: 9, HARD: 30 }));
    const q = rng.integer(2, ctx.tier({ EASY: 9, MEDIUM: 20, HARD: 30 }));
    const r = rng.integer(1, c - 1);
    const n = q * c + r;
    const kind = rng.choose(['up', 'down', 'left'] as const);
    const text =
      kind === 'up'
        ? `${n} students. Each van holds ${c}. How many vans are needed?`
        : kind === 'down'
          ? `${n} eggs. ${c} fit in a carton. How many full cartons?`
          : `${n} cards shared equally by ${c} friends. How many are left over?`;
    const answer = kind === 'up' ? q + 1 : kind === 'down' ? q : r;
    const decide = kind === 'up' ? `${r} more need a van: ${q} + 1 = ${answer}.` : kind === 'down' ? `Only ${q} are full.` : `${r} left over.`;
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([P.text(text)]),
      operation: 'INTERPRET_REMAINDER',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('DIVIDE_DECIDE', 'Divide, then decide', [`${n} ÷ ${c} = ${q} R ${r}.`, decide], result),
        tree('MULTIPLY_CHECK', 'Multiply to check', [`${q} × ${c} = ${q * c}; ${q + 1} × ${c} = ${(q + 1) * c}.`, `${n} − ${q * c} = ${r}. ${decide}`], result),
      ]),
    });
  },
});

const multistep = defineSkill({
  id: 'g4.oa.multistep',
  grade: '4',
  domain: 'OA',
  standards: ['4.OA.3'],
  title: 'Multistep word problems',
  generate(ctx) {
    const { rng } = ctx;
    const name = pickName(rng);
    const t = rng.integer(0, 2);
    const big = ctx.difficulty !== 'EASY';
    let text: string;
    let lines: string[];
    let equation: string;
    let answer: number;
    if (t === 0) {
      const a = rng.integer(2, big ? 6 : 4);
      const p = rng.integer(5, big ? 25 : 12);
      const b = rng.integer(2, big ? 6 : 4);
      const q = rng.integer(3, big ? 15 : 9);
      answer = a * p + b * q;
      text = `${name} buys ${a} shirts at $${p} and ${b} hats at $${q}. Total cost?`;
      lines = [`${a} × ${p} = ${a * p}; ${b} × ${q} = ${b * q}.`, `${a * p} + ${b * q} = ${answer}.`];
      equation = `c = ${a} × ${p} + ${b} × ${q}`;
    } else if (t === 1) {
      const boxes = rng.integer(3, big ? 12 : 6);
      const per = rng.choose([6, 12, 18, 24]);
      const total = boxes * per;
      const sold = rng.integer(5, total - 1);
      answer = total - sold;
      text = `${boxes} boxes of ${per} eggs. ${sold} are sold. How many are left?`;
      lines = [`${boxes} × ${per} = ${total}.`, `${total} − ${sold} = ${answer}.`];
      equation = `e = ${boxes} × ${per} − ${sold}`;
    } else {
      const r1 = rng.integer(3, big ? 15 : 8);
      const s1 = rng.integer(5, big ? 30 : 12);
      const r2 = rng.integer(2, big ? 10 : 5);
      const s2 = rng.integer(5, big ? 30 : 12);
      answer = r1 * s1 + r2 * s2;
      text = `${r1} rows of ${s1} seats, plus ${r2} rows of ${s2} seats. Total seats?`;
      lines = [`${r1} × ${s1} = ${r1 * s1}; ${r2} × ${s2} = ${r2 * s2}.`, `${r1 * s1} + ${r2 * s2} = ${answer}.`];
      equation = `s = ${r1} × ${s1} + ${r2} × ${s2}`;
    }
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([P.text(text)]),
      operation: 'MULTISTEP',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(['dollars', '$']),
      ...strategies([
        tree('STEP_BY_STEP', 'One step at a time', lines, result),
        tree('EQUATION', 'Write an equation', [`${equation}.`, `${equation.split(' =')[0]} = ${answer}.`], result),
      ]),
    });
  },
});

const primeComposite = defineSkill({
  id: 'g4.oa.prime-or-composite',
  grade: '4',
  domain: 'OA',
  standards: ['4.OA.4'],
  title: 'Prime or composite?',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 30, MEDIUM: 60, HARD: 100 });
    const wantPrime = rng.bool();
    const n = ctx.retry(
      () => rng.integer(2, max),
      (v) => isPrime(v) === wantPrime,
    );
    const choices = fixedChoices(['Prime', 'Composite']);
    const result = A.choice(isPrime(n) ? 'prime' : 'composite');
    const smallest = divisors(n).find((d) => d > 1 && d < n);
    return ctx.question({
      prompt: prompt([P.text(`Is ${n} prime or composite?`)]),
      operation: 'CLASSIFY_NUMBER',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(choices),
      ...strategies([
        tree('FACTOR_PAIRS', 'Look for factor pairs', [smallest ? `${n} = ${smallest} × ${n / smallest}.` : `Only 1 × ${n} works.`, smallest ? 'More than 2 factors: composite.' : 'Exactly 2 factors: prime.'], result),
        tree('DIVISIBILITY', 'Divisibility tests', [
          smallest ? `${n} ÷ ${smallest} = ${n / smallest}, no remainder.` : [2, 3, 5, 7].includes(n) ? `${n} is a small prime.` : `Not divisible by 2, 3, 5 or 7.`,
          smallest ? 'Composite.' : 'Prime.',
        ], result),
      ]),
    });
  },
});

const factorsMultiples = defineSkill({
  id: 'g4.oa.factors-and-multiples',
  grade: '4',
  domain: 'OA',
  standards: ['4.OA.4'],
  title: 'Factors and multiples',
  generate(ctx) {
    const { rng } = ctx;
    const kind = ctx.tier({ EASY: 'multiple', MEDIUM: rng.choose(['multiple', 'factor']), HARD: rng.choose(['factor', 'count']) });
    if (kind === 'multiple') {
      const d = rng.integer(2, 9);
      const yes = rng.bool();
      const n = ctx.retry(
        () => rng.integer(10, 100),
        (v) => (v % d === 0) === yes,
      );
      const q = Math.floor(n / d);
      const r = n % d;
      const result = A.choice(yes ? 'yes' : 'no');
      return ctx.question({
        prompt: prompt([P.text(`Is ${n} a multiple of ${d}?`)]),
        operation: 'IS_MULTIPLE',
        canonicalAnswer: result,
        answerSchema: SCHEMA.choice(YES_NO_CHOICES),
        ...strategies([
          tree('DIVIDE', 'Divide', [`${n} ÷ ${d} = ${q}${r ? ` R ${r}` : ''}.`, r ? 'Remainder: No.' : 'No remainder: Yes.'], result),
          tree('SKIP_COUNT', 'Skip count', [`${d} × ${q} = ${q * d}${r ? `, ${d} × ${q + 1} = ${(q + 1) * d}` : ''}.`, r ? `${n} is skipped: No.` : `${n} is reached: Yes.`], result),
        ]),
      });
    }
    const n = ctx.retry(
      () => rng.integer(12, 100),
      (v) => divisors(v).length >= 4,
    );
    const ds = divisors(n);
    if (kind === 'factor') {
      const correct = rng.choose(ds.filter((d) => d > 1 && d < n));
      const others = Array.from({ length: 12 }, (_, i) => i + 2).filter((x) => n % x !== 0 && x !== correct);
      const { choices, correctId } = makeChoices(rng, String(correct), others.map(String));
      const result = A.choice(correctId);
      return ctx.question({
        prompt: prompt([P.text(`Which is a factor of ${n}?`)]),
        operation: 'FIND_FACTOR',
        canonicalAnswer: result,
        answerSchema: SCHEMA.choice(choices),
        ...strategies([
          tree('DIVIDE_EACH', 'Divide by each choice', [`${n} ÷ ${correct} = ${n / correct}, no remainder.`, `${correct} is a factor.`], result),
          tree('FACTOR_PAIRS', 'List factor pairs', [`${n} = ${ds.filter((d) => d * d <= n).map((d) => `${d} × ${n / d}`).join(', ')}.`, `${correct} is in the list.`], result),
        ]),
      });
    }
    const pairs = ds.filter((d) => d * d <= n).map((d) => `${d} × ${n / d}`);
    const result = A.number(ds.length);
    return ctx.question({
      prompt: prompt([P.text(`How many factors does ${n} have?`)]),
      operation: 'COUNT_FACTORS',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(['factors']),
      ...strategies([
        tree('FACTOR_PAIRS', 'Factor pairs', [`${pairs.join(', ')}.`, `Factors: ${ds.join(', ')} → ${ds.length}.`], result),
        tree('TEST_EACH', 'Test 1, 2, 3, …', [`Divides evenly: ${ds.join(', ')}.`, `Count: ${ds.length}.`], result),
      ]),
    });
  },
});

const patterns = defineSkill({
  id: 'g4.oa.patterns',
  grade: '4',
  domain: 'OA',
  standards: ['4.OA.5'],
  title: 'Patterns from a rule',
  generate(ctx) {
    const { rng } = ctx;
    const multiply = ctx.difficulty === 'HARD' && rng.bool();
    const start = rng.integer(1, multiply ? 5 : 20);
    const k = multiply ? rng.choose([2, 3]) : rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 12, HARD: 25 }));
    const position = rng.integer(5, multiply ? 5 : ctx.tier({ EASY: 6, MEDIUM: 8, HARD: 10 }));
    const terms = Array.from({ length: position }, (_, i) => (multiply ? start * k ** i : start + k * i));
    const answer = terms[position - 1] as number;
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([P.text(`Rule: ${multiply ? 'multiply by' : 'add'} ${k}. Start at ${start}. What is term ${position}?`)]),
      operation: 'PATTERN',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('LIST_TERMS', 'List the terms', [`${terms.join(', ')}.`, `Term ${position}: ${answer}.`], result),
        multiply
          ? tree('POWER_JUMP', 'Multiply all at once', [`${position - 1} times × ${k} = × ${k ** (position - 1)}.`, `${start} × ${k ** (position - 1)} = ${answer}.`], result)
          : tree('JUMP', 'Jump from the start', [`${position - 1} jumps of ${k} = ${(position - 1) * k}.`, `${start} + ${(position - 1) * k} = ${answer}.`], result),
      ]),
    });
  },
});

/* -------------------------------- 4.NBT ------------------------------- */

const placeValue = defineSkill({
  id: 'g4.nbt.place-value',
  grade: '4',
  domain: 'NBT',
  standards: ['4.NBT.1'],
  title: 'Place value: ten times as much',
  generate(ctx) {
    const { rng } = ctx;
    const kind = ctx.tier({ EASY: 'value', MEDIUM: rng.choose(['value', 'times']), HARD: rng.choose(['times', 'divide']) });
    if (kind === 'value') {
      const digits = ctx.tier({ EASY: 4, MEDIUM: 5, HARD: 6 });
      const place = rng.integer(1, digits - 1);
      const n = ctx.retry(
        () => rng.integer(10 ** (digits - 1), 10 ** digits - 1),
        (v) => Math.floor(v / 10 ** place) % 10 !== 0,
      );
      const digit = Math.floor(n / 10 ** place) % 10;
      const value = digit * 10 ** place;
      const result = A.number(value);
      return ctx.question({
        prompt: prompt([P.text(`Value of the ${ordinalPlace(place)} digit in ${fmt(n)}?`)]),
        operation: 'DIGIT_VALUE',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(),
        ...strategies([
          tree('NAME_PLACE', 'Name the place', [`The ${digit} is in the ${PLACE_NAMES[10 ** place]}s place.`, `${digit} × ${fmt(10 ** place)} = ${fmt(value)}.`], result),
          tree('EXPANDED', 'Expanded form', [`${fmt(n)} = ${expanded(n)}.`, `The ${digit} part is ${fmt(value)}.`], result),
        ]),
      });
    }
    const d = rng.integer(1, 9);
    const place = rng.integer(1, ctx.difficulty === 'HARD' ? 4 : 3);
    const big = d * 10 ** (place + 1);
    const small = d * 10 ** place;
    const result = A.number(10);
    if (kind === 'times') {
      return ctx.question({
        prompt: prompt([P.text(`The ${d} in ${fmt(big)} is how many times the ${d} in ${fmt(small)}?`)]),
        operation: 'PLACE_VALUE_RELATION',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(['times']),
        ...strategies([
          tree('ONE_PLACE_LEFT', 'One place left', [`The ${d} moved one place left.`, 'One place left = 10 times.'], result),
          tree('DIVIDE_VALUES', 'Divide the values', [`${fmt(big)} ÷ ${fmt(small)} = 10.`, '10 times.'], result),
        ]),
      });
    }
    return ctx.question({
      prompt: prompt([P.num(big), P.op('÷'), P.num(small), P.op('='), P.blank()]),
      operation: 'DIVIDE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('PLACE_VALUE', 'Place value', [`${fmt(big)} is ${d} ${PLACE_NAMES[10 ** (place + 1)]}s; ${fmt(small)} is ${d} ${PLACE_NAMES[10 ** place]}s.`, 'A place is 10 times the place to its right: 10.'], result),
        tree('THINK_MULTIPLY', 'Think multiplication', [`${fmt(small)} × ? = ${fmt(big)}.`, `${fmt(small)} × 10 = ${fmt(big)}.`], result),
      ]),
    });
  },
});

function ordinalPlace(place: number): string {
  return ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'hundred-thousands'][place] as string;
}

function expanded(n: number): string {
  const parts: string[] = [];
  const s = String(n);
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    if (d !== 0) parts.push(fmt(d * 10 ** (s.length - 1 - i)));
  }
  return parts.join(' + ');
}

const readWrite = defineSkill({
  id: 'g4.nbt.read-write-numbers',
  grade: '4',
  domain: 'NBT',
  standards: ['4.NBT.2'],
  title: 'Expanded form and number names',
  generate(ctx) {
    const { rng } = ctx;
    const digits = ctx.tier({ EASY: 4, MEDIUM: 5, HARD: 6 });
    const n = ctx.retry(
      () => rng.integer(10 ** (digits - 1), 10 ** digits - 1),
      (v) => String(v).includes('0') || ctx.difficulty === 'EASY',
    );
    const words = rng.bool();
    const result = A.number(n);
    const places = String(n)
      .split('')
      .map((d, i, arr) => `${d} ${d === '1' ? (['one', 'ten', 'hundred', 'thousand', 'ten-thousand', 'hundred-thousand'][arr.length - 1 - i] as string) : ordinalPlace(arr.length - 1 - i)}`);
    return ctx.question({
      prompt: prompt([P.text(words ? `Write as a number: ${numberToWords(n)}` : `Write as a number: ${expanded(n)}`)]),
      operation: 'STANDARD_FORM',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('PLACE_CHART', 'Place value chart', [`${places.join(', ')}.`, `${fmt(n)}.`], result),
        tree(words ? 'SPLIT_AT_THOUSAND' : 'ADD_PARTS', words ? 'Split at “thousand”' : 'Add the parts', words ? [`${numberToWords(Math.floor(n / 1000))} thousand → ${Math.floor(n / 1000)},___; then ${n % 1000}.`, `${fmt(n)}.`] : [`${expanded(n)}`, `= ${fmt(n)}.`], result),
      ]),
    });
  },
});

const compareWhole = defineSkill({
  id: 'g4.nbt.compare-numbers',
  grade: '4',
  domain: 'NBT',
  standards: ['4.NBT.2'],
  title: 'Compare multi-digit numbers',
  generate(ctx) {
    const { rng } = ctx;
    const digits = ctx.tier({ EASY: 4, MEDIUM: 5, HARD: 6 });
    const a = rng.integer(10 ** (digits - 1), 10 ** digits - 1);
    let b = a;
    if (!rng.bool(0.1)) {
      b = ctx.retry(
        () => {
          const place = rng.integer(0, digits - 1);
          const delta = rng.integer(1, 9) * 10 ** place * (rng.bool() ? 1 : -1);
          return a + delta;
        },
        (v) => v !== a && v >= 10 ** (digits - 1) && v < 10 ** digits,
      );
    }
    const symbol = compareSymbol(rat(a), rat(b));
    const sa = String(a);
    const sb = String(b);
    const idx = [...sa].findIndex((c, i) => c !== sb[i]);
    const placeName = idx >= 0 ? ordinalPlace(digits - 1 - idx) : '';
    const result = A.choice(symbol);
    return ctx.question({
      prompt: prompt([P.num(a), P.blank('○'), P.num(b)]),
      operation: 'COMPARE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(COMPARE_CHOICES),
      ...strategies([
        tree('PLACE_BY_PLACE', 'Compare place by place', [idx < 0 ? 'Every digit matches.' : `First different place: ${placeName} (${sa[idx]} vs ${sb[idx]}).`, `${fmt(a)} ${symbol} ${fmt(b)}.`], result),
        tree('SUBTRACT', 'Find the difference', [a === b ? `${fmt(a)} − ${fmt(b)} = 0.` : `${fmt(Math.max(a, b))} − ${fmt(Math.min(a, b))} = ${fmt(Math.abs(a - b))}.`, a === b ? 'Equal.' : `${fmt(Math.max(a, b))} is bigger: ${symbol}.`], result),
      ]),
    });
  },
});

const roundAny = defineSkill({
  id: 'g4.nbt.round',
  grade: '4',
  domain: 'NBT',
  standards: ['4.NBT.3'],
  title: 'Round to any place',
  generate(ctx) {
    const { rng } = ctx;
    const digits = ctx.tier({ EASY: 4, MEDIUM: 5, HARD: 6 });
    const place = 10 ** rng.integer(ctx.difficulty === 'EASY' ? 1 : 2, digits - 1);
    const n = ctx.retry(
      () => rng.integer(10 ** (digits - 1), 10 ** digits - 1),
      (v) => v % place !== 0,
    );
    const answer = roundToPlace(n, place);
    const lower = Math.floor(n / place) * place;
    const upper = lower + place;
    const next = Math.floor((n % place) / (place / 10));
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([P.text(`Round ${fmt(n)} to the nearest ${PLACE_NAMES[place]}.`)]),
      operation: 'ROUND',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('NEXT_DIGIT', 'Look at the next digit', [`Digit to the right: ${next}.`, `${next >= 5 ? 'Round up' : 'Round down'} → ${fmt(answer)}.`], result),
        tree('NUMBER_LINE', 'Number line', [`Between ${fmt(lower)} and ${fmt(upper)}; halfway is ${fmt(lower + place / 2)}.`, `Closer to ${fmt(answer)}${n - lower === upper - n ? ' (halfway rounds up)' : ''}.`], result),
      ]),
    });
  },
});

const addSub = defineSkill({
  id: 'g4.nbt.add-sub',
  grade: '4',
  domain: 'NBT',
  standards: ['4.NBT.4'],
  title: 'Add and subtract big numbers',
  generate(ctx) {
    const { rng } = ctx;
    const digits = ctx.tier({ EASY: 4, MEDIUM: 5, HARD: 6 });
    const isAdd = rng.bool();
    const [a, b] = ctx.retry(
      () => [rng.integer(10 ** (digits - 1), 10 ** digits - 1), rng.integer(10 ** (digits - 2), 10 ** digits - 1)] as const,
      ([x, y]) => x !== y && (!isAdd || x + y <= 1_000_000),
    );
    const [top, bottom] = !isAdd && a < b ? [b, a] : [a, b];
    return ctx.question({
      prompt: prompt([P.num(top), P.op(isAdd ? '+' : '−'), P.num(bottom), P.op('='), P.blank()]),
      operation: isAdd ? 'ADD' : 'SUBTRACT',
      canonicalAnswer: A.number(isAdd ? top + bottom : top - bottom),
      answerSchema: SCHEMA.integer(),
      ...strategies(isAdd ? additionStrategies(top, bottom) : subtractionStrategies(top, bottom)),
    });
  },
});

const multiplyMultiDigit = defineSkill({
  id: 'g4.nbt.multiply',
  grade: '4',
  domain: 'NBT',
  standards: ['4.NBT.5'],
  title: 'Multiply multi-digit numbers',
  generate(ctx) {
    const { rng } = ctx;
    const [a, b] = ctx.tier({
      EASY: [rng.integer(12, 99), rng.integer(2, 9)],
      MEDIUM: [rng.integer(100, 9999), rng.integer(2, 9)],
      HARD: [rng.integer(11, 99), rng.integer(11, 99)],
    });
    return ctx.question({
      prompt: prompt([P.num(a), P.op('×'), P.num(b), P.op('='), P.blank()]),
      operation: 'MULTIPLY',
      canonicalAnswer: A.number(a * b),
      answerSchema: SCHEMA.integer(),
      ...strategies(multiplicationStrategies(a, b)),
    });
  },
});

const divideRemainder = defineSkill({
  id: 'g4.nbt.divide-with-remainders',
  grade: '4',
  domain: 'NBT',
  standards: ['4.NBT.6'],
  title: 'Divide with remainders',
  generate(ctx) {
    const { rng } = ctx;
    const divisor = rng.integer(ctx.difficulty === 'EASY' ? 2 : 3, 9);
    const q = ctx.tier({ EASY: rng.integer(3, 12), MEDIUM: rng.integer(12, 99), HARD: rng.integer(100, 999) });
    const r = rng.integer(1, divisor - 1);
    const dividend = divisor * q + r;
    return ctx.question({
      prompt: prompt([P.num(dividend), P.op('÷'), P.num(divisor), P.op('='), P.blank()]),
      operation: 'DIVIDE',
      canonicalAnswer: A.qr(q, r),
      answerSchema: SCHEMA.quotientRemainder(),
      ...strategies(divisionStrategies(dividend, divisor)),
    });
  },
});

/* -------------------------------- 4.NF -------------------------------- */

const equivalentFractions = defineSkill({
  id: 'g4.nf.equivalent-fractions',
  grade: '4',
  domain: 'NF',
  standards: ['4.NF.1'],
  title: 'Equivalent fractions',
  generate(ctx) {
    const { rng } = ctx;
    const [n, d, k] = ctx.retry(
      () => {
        const den = rng.choose([2, 3, 4, 5, 6]);
        return [rng.integer(1, den - 1), den, rng.integer(2, 5)] as const;
      },
      ([num, den, f]) => [4, 6, 8, 10, 12].includes(den * f) && rat(num, den).denominator === BigInt(den),
    );
    const reverse = ctx.difficulty === 'HARD' && rng.bool();
    const answer = n * (reverse ? 1 : k);
    const result = A.number(answer);
    if (reverse) {
      return ctx.question({
        prompt: prompt([rf(n * k, d * k), P.op('='), P.blank(), P.text(`/${d}`)]),
        operation: 'EQUIVALENT_FRACTION',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(),
        ...strategies([
          tree('DIVIDE_BOTH', 'Divide top and bottom', [`${d * k} ÷ ${k} = ${d}, so ÷ ${k}.`, `${n * k} ÷ ${k} = ${n}.`], result),
          tree('GROUP_PARTS', 'Group the parts', [`Put every ${k} pieces together.`, `${n * k} pieces → ${n} ${plural(n, 'group', 'groups')}.`], result),
        ]),
      });
    }
    return ctx.question({
      prompt: prompt([P.frac(rat(n, d)), P.op('='), P.blank(), P.text(`/${d * k}`)]),
      operation: 'EQUIVALENT_FRACTION',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('MULTIPLY_BOTH', 'Multiply top and bottom', [`${d} × ${k} = ${d * k}, so × ${k}.`, `${n} × ${k} = ${answer}.`], result),
        tree('SPLIT_PARTS', 'Split each part', [`Cut each 1/${d} into ${k} pieces.`, `${n} ${plural(n, 'part', 'parts')} → ${answer} pieces.`], result),
      ]),
    });
  },
});

const compareFractions = defineSkill({
  id: 'g4.nf.compare-fractions',
  grade: '4',
  domain: 'NF',
  standards: ['4.NF.2'],
  title: 'Compare fractions',
  generate(ctx) {
    const { rng } = ctx;
    const pool = ctx.tier({ EASY: [2, 3, 4, 6, 8], MEDIUM: G4_DENOMINATORS, HARD: G4_DENOMINATORS });
    const equal = rng.bool(0.15);
    const [a, b] = ctx.retry(
      () => {
        const d1 = rng.choose(pool);
        const x = rat(rng.integer(1, d1 - 1), d1);
        if (equal) {
          const k = rng.integer(2, 4);
          return [x, { numerator: x.numerator * BigInt(k), denominator: x.denominator * BigInt(k) }] as const;
        }
        const d2 = rng.choose(pool);
        return [x, rat(rng.integer(1, d2 - 1), d2)] as const;
      },
      ([x, y]) => x.numerator !== y.numerator && x.denominator !== y.denominator && (equal ? true : compareSymbol(x, rat(y.numerator, y.denominator)) !== '=') && Number(y.denominator) <= 12,
    );
    const bv = rat(b.numerator, b.denominator);
    const symbol = compareSymbol(a, bv);
    const L = lcmNum(Number(a.denominator), Number(b.denominator));
    const an = (Number(a.numerator) * L) / Number(a.denominator);
    const bn = (Number(b.numerator) * L) / Number(b.denominator);
    const c1 = Number(a.numerator) * Number(b.denominator);
    const c2 = Number(b.numerator) * Number(a.denominator);
    const result = A.choice(symbol);
    const trees: SolutionTree[] = [
      tree('COMMON_DENOMINATOR', 'Common denominator', [[P.text(`Over ${L}: `), rf(an, L), P.text(' and '), rf(bn, L)], `${an} ${symbol} ${bn}, so ${symbol}.`], result),
      tree('CROSS_MULTIPLY', 'Cross-multiply', [`${a.numerator} × ${b.denominator} = ${c1}; ${b.numerator} × ${a.denominator} = ${c2}.`, `${c1} ${symbol} ${c2}, so ${symbol}.`], result),
    ];
    const half = rat(1, 2);
    const sa = compareSymbol(a, half);
    const sb = compareSymbol(bv, half);
    if (sa !== sb && sa !== '=' && sb !== '=') {
      trees.push(tree('BENCHMARK_HALF', 'Compare to 1/2', [`${a.numerator}/${a.denominator} is ${sa === '<' ? 'less' : 'more'} than 1/2; ${b.numerator}/${b.denominator} is ${sb === '<' ? 'less' : 'more'}.`, `So ${symbol}.`], result));
    }
    return ctx.question({
      prompt: prompt([rf(a.numerator, a.denominator), P.blank('○'), rf(b.numerator, b.denominator)]),
      operation: 'COMPARE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(COMPARE_CHOICES),
      ...strategies(trees),
    });
  },
});

function likeDenominatorTrees(a: Rational, b: Rational, op: 'ADD' | 'SUBTRACT'): SolutionTree[] {
  const d = Number(a.denominator);
  const sym = op === 'ADD' ? '+' : '−';
  const value = op === 'ADD' ? add(a, b) : sub(a, b);
  const result = A.number(value);
  const ma = toMixed(a);
  const mb = toMixed(b);
  const ia = Number(a.numerator);
  const ib = Number(b.numerator);
  const raw = op === 'ADD' ? ia + ib : ia - ib;
  const finalText = toMixedString(value);
  if (ma.whole === 0n && mb.whole === 0n) {
    return [
      tree('ADD_NUMERATORS', op === 'ADD' ? 'Add the tops' : 'Subtract the tops', [`${ia} ${sym} ${ib} = ${raw}; keep ${d}.`, [rf(raw, d), P.text(raw >= d && raw % d !== 0 ? ` = ${finalText}` : raw % d === 0 ? ` = ${raw / d}` : '')]], result),
      tree('UNIT_FRACTIONS', 'Count unit fractions', [`${ia} ${plural(ia, 'piece', 'pieces')} ${sym} ${ib} ${plural(ib, 'piece', 'pieces')} of 1/${d}.`, [P.text(`${raw} pieces = `), rf(raw, d)]], result),
    ];
  }
  // Mixed numbers.
  const wa = Number(ma.whole);
  const wb = Number(mb.whole);
  const na = Number(ma.numerator);
  const nb = Number(mb.numerator);
  let wholesLines: string[];
  if (op === 'ADD') {
    const parts = na + nb;
    wholesLines = [`Wholes: ${wa} + ${wb} = ${wa + wb}. Parts: ${na}/${d} + ${nb}/${d} = ${parts}/${d}.`, `${wa + wb} + ${parts}/${d} = ${finalText}.`];
  } else if (na >= nb) {
    wholesLines = [`Wholes: ${wa} − ${wb} = ${wa - wb}. Parts: ${na}/${d} − ${nb}/${d} = ${na - nb}/${d}.`, `= ${finalText}.`];
  } else {
    wholesLines = [`Trade 1 whole: ${wa} ${na}/${d} = ${wa - 1} ${na + d}/${d}.`, `${wa - 1} − ${wb} = ${wa - 1 - wb}; ${na + d}/${d} − ${nb}/${d} = ${na + d - nb}/${d} → ${finalText}.`];
  }
  return [
    tree('WHOLES_AND_PARTS', 'Wholes and parts', wholesLines, result),
    tree('IMPROPER_FIRST', 'Use improper fractions', [`${ia}/${d} ${sym} ${ib}/${d} = ${raw}/${d}.`, `${raw}/${d} = ${finalText}.`], result),
  ];
}

const addSubtractLike = defineSkill({
  id: 'g4.nf.add-sub-like-denominators',
  grade: '4',
  domain: 'NF',
  standards: ['4.NF.3'],
  title: 'Add & subtract fractions (same denominator)',
  generate(ctx) {
    const { rng } = ctx;
    const d = rng.choose([3, 4, 5, 6, 8, 10, 12]);
    const op = ctx.difficulty === 'EASY' ? 'ADD' : rng.choose(['ADD', 'SUBTRACT'] as const);
    const [a, b] = ctx.retry(
      () => {
        if (ctx.difficulty === 'HARD') {
          return [rat(rng.integer(1, 5) * d + rng.integer(1, d - 1), d), rat(rng.integer(1, 4) * d + rng.integer(1, d - 1), d)] as const;
        }
        return [rat(rng.integer(1, d - 1), d), rat(rng.integer(1, d - 1), d)] as const;
      },
      ([x, y]) => x.denominator === BigInt(d) && y.denominator === BigInt(d) && (op === 'ADD' ? ctx.difficulty !== 'EASY' || compareSymbol(add(x, y), rat(1)) !== '>' : compareSymbol(x, y) === '>'),
    );
    const value = op === 'ADD' ? add(a, b) : sub(a, b);
    const term = (x: Rational): PromptNode => (ctx.difficulty === 'HARD' ? P.mixed(x) : P.frac(x));
    return ctx.question({
      prompt: prompt([term(a), P.op(op === 'ADD' ? '+' : '−'), term(b), P.op('='), P.blank()]),
      operation: op,
      canonicalAnswer: A.number(value),
      answerSchema: SCHEMA.fraction(),
      ...strategies(likeDenominatorTrees(a, b, op)),
      standards: ctx.difficulty === 'HARD' ? ['4.NF.3c'] : ['4.NF.3a'],
      answerDisplay: 'mixed',
    });
  },
});

const decompose = defineSkill({
  id: 'g4.nf.decompose-fractions',
  grade: '4',
  domain: 'NF',
  standards: ['4.NF.3b'],
  title: 'Break apart a fraction',
  generate(ctx) {
    const { rng } = ctx;
    const d = rng.choose([4, 5, 6, 8, 10, 12]);
    const n = rng.integer(3, d - 1);
    const first = rng.integer(1, n - 2);
    const second = rng.integer(1, n - first - 1);
    const answer = n - first - second;
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([rf(n, d), P.op('='), rf(first, d), P.op('+'), rf(second, d), P.op('+'), P.blank(), P.text(`/${d}`)]),
      operation: 'DECOMPOSE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('SUBTRACT_TOPS', 'Subtract the tops', [`${first} + ${second} = ${first + second}.`, `${n} − ${first + second} = ${answer}.`], result),
        tree('COUNT_UP', 'Count up', [`Count up from ${first + second} to ${n}.`, `${answer} more.`], result),
      ]),
    });
  },
});

const fractionTimesWhole = defineSkill({
  id: 'g4.nf.fraction-times-whole',
  grade: '4',
  domain: 'NF',
  standards: ['4.NF.4'],
  title: 'Multiply a fraction by a whole number',
  generate(ctx) {
    const { rng } = ctx;
    const d = rng.choose(G4_DENOMINATORS);
    const f = ctx.difficulty === 'EASY' ? rat(1, d) : rat(rng.integer(1, d - 1), d);
    const n = rng.integer(2, ctx.tier({ EASY: 6, MEDIUM: 6, HARD: 9 }));
    const value = mul(rat(n), f);
    const word = ctx.difficulty === 'HARD' && rng.bool();
    const nodes: PromptNode[] = word
      ? [P.text(`${n} people each eat `), P.frac(f), P.text(' lb of rice. Total pounds?')]
      : [P.num(n), P.op('×'), P.frac(f), P.op('='), P.blank()];
    return ctx.question({
      prompt: prompt(nodes),
      operation: 'MULTIPLY',
      canonicalAnswer: A.number(value),
      answerSchema: SCHEMA.fraction(),
      ...strategies(uniqueStrategies(fractionMultiplyStrategies(rat(n), f))),
      standards: word ? ['4.NF.4c'] : ctx.difficulty === 'EASY' ? ['4.NF.4a'] : ['4.NF.4b'],
      answerDisplay: 'mixed',
    });
  },
});

const tenthsHundredths = defineSkill({
  id: 'g4.nf.tenths-and-hundredths',
  grade: '4',
  domain: 'NF',
  standards: ['4.NF.5'],
  title: 'Tenths and hundredths',
  generate(ctx) {
    const { rng } = ctx;
    const t = rng.integer(1, 9);
    if (ctx.difficulty === 'EASY') {
      const result = A.number(t * 10);
      return ctx.question({
        prompt: prompt([rf(t, 10), P.op('='), P.blank(), P.text('/100')]),
        operation: 'TENTHS_TO_HUNDREDTHS',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(),
        ...strategies([
          tree('MULTIPLY_BOTH', 'Multiply by 10', [`10 × 10 = 100, so × 10.`, `${t} × 10 = ${t * 10}.`], result),
          tree('DECIMALS', 'Think decimals', [`${t}/10 = 0.${t} = 0.${t}0.`, `0.${t}0 = ${t * 10}/100.`], result),
        ]),
      });
    }
    const h = ctx.difficulty === 'HARD' ? rng.integer(11, 99) : rng.integer(1, 9);
    const total = t * 10 + h;
    const result = A.number(total);
    const d2 = (v: number) => formatNumber(rat(v, 100), 'decimal', 2);
    return ctx.question({
      prompt: prompt([rf(t, 10), P.op('+'), rf(h, 100), P.op('='), P.blank(), P.text('/100')]),
      operation: 'ADD_TENTHS_HUNDREDTHS',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('CONVERT_TENTHS', 'Tenths to hundredths', [`${t}/10 = ${t * 10}/100.`, `${t * 10} + ${h} = ${total}.`], result),
        tree('DECIMALS', 'Use decimals', [`0.${t} + ${d2(h)} = ${d2(total)}.`, `${d2(total)} = ${total}/100.`], result),
      ]),
    });
  },
});

const decimalNotation = defineSkill({
  id: 'g4.nf.decimal-notation',
  grade: '4',
  domain: 'NF',
  standards: ['4.NF.6'],
  title: 'Fractions as decimals',
  generate(ctx) {
    const { rng } = ctx;
    const hundredths = ctx.difficulty !== 'EASY' && rng.bool(0.7);
    const n = hundredths ? rng.integer(1, 99) : rng.integer(1, 9);
    const d = hundredths ? 100 : 10;
    const value = rat(n, d);
    const toDecimal = ctx.difficulty === 'HARD' ? rng.bool() : true;
    const decText = hundredths ? `0.${String(n).padStart(2, '0')}` : `0.${n}`;
    const words = `${numberToWords(n)} ${hundredths ? plural(n, 'hundredth', 'hundredths') : plural(n, 'tenth', 'tenths')}`;
    if (toDecimal) {
      const result = A.number(value);
      return ctx.question({
        prompt: prompt([P.text('As a decimal: '), rf(n, d)]),
        operation: 'FRACTION_TO_DECIMAL',
        canonicalAnswer: result,
        answerSchema: SCHEMA.decimal(),
        validationPolicy: { requiredForms: ['DECIMAL'] },
        answerDisplay: 'decimal',
        ...strategies([
          tree('PLACE_VALUE', 'Place value', [hundredths ? `${Math.floor(n / 10)} ${plural(Math.floor(n / 10), 'tenth', 'tenths')}, ${n % 10} ${plural(n % 10, 'hundredth', 'hundredths')}.` : `${n} ${plural(n, 'tenth', 'tenths')}.`, decText], result),
          tree('SAY_IT', 'Say it aloud', [`“${words}”`, decText], result),
        ]),
      });
    }
    const result = A.number(n);
    return ctx.question({
      prompt: prompt([P.text(`${decText} =`), P.blank(), P.text(`/${d}`)]),
      operation: 'DECIMAL_TO_FRACTION',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('PLACE_VALUE', 'Place value', [`Last digit is in the ${hundredths ? 'hundredths' : 'tenths'} place.`, `${decText} = ${n}/${d}.`], result),
        tree('SAY_IT', 'Say it aloud', [`“${words}”`, `${n}/${d}.`], result),
      ]),
    });
  },
});

const compareDecimals = defineSkill({
  id: 'g4.nf.compare-decimals',
  grade: '4',
  domain: 'NF',
  standards: ['4.NF.7'],
  title: 'Compare decimals',
  generate(ctx) {
    const { rng } = ctx;
    const whole = ctx.difficulty === 'EASY' ? 0 : rng.integer(0, 9);
    const x = whole * 100 + rng.integer(1, 99);
    const y = rng.bool(0.1) ? x : whole * 100 + (rng.bool() ? rng.integer(1, 9) * 10 : rng.integer(1, 99));
    const a = rat(x, 100);
    const b = rat(y, 100);
    const symbol = compareSymbol(a, b);
    const result = A.choice(symbol);
    const pad = (v: number) => `${Math.floor(v / 100)}.${String(v % 100).padStart(2, '0')}`;
    return ctx.question({
      prompt: prompt([P.dec(a), P.blank('○'), P.dec(b)]),
      operation: 'COMPARE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(COMPARE_CHOICES),
      ...strategies([
        tree('ADD_ZERO', 'Add a zero, then compare', [`${pad(x)} and ${pad(y)}.`, `${x % 100} ${symbol} ${y % 100} hundredths → ${symbol}.`], result),
        tree('FRACTIONS', 'As hundredths', [[rf(x, 100), P.text(' and '), rf(y, 100)], `${x} ${symbol} ${y} → ${symbol}.`], result),
      ]),
    });
  },
});

/* -------------------------------- 4.MD -------------------------------- */

const CONVERSIONS = [
  { big: 'km', small: 'm', long: 'meters', f: 1000 },
  { big: 'm', small: 'cm', long: 'centimeters', f: 100 },
  { big: 'kg', small: 'g', long: 'grams', f: 1000 },
  { big: 'L', small: 'mL', long: 'milliliters', f: 1000 },
  { big: 'lb', small: 'oz', long: 'ounces', f: 16 },
  { big: 'ft', small: 'in', long: 'inches', f: 12 },
  { big: 'yd', small: 'ft', long: 'feet', f: 3 },
  { big: 'hr', small: 'min', long: 'minutes', f: 60 },
  { big: 'min', small: 'sec', long: 'seconds', f: 60 },
] as const;

const convertUnits = defineSkill({
  id: 'g4.md.convert-units',
  grade: '4',
  domain: 'MD',
  standards: ['4.MD.1'],
  title: 'Convert to a smaller unit',
  generate(ctx) {
    const { rng } = ctx;
    const c = rng.choose(CONVERSIONS);
    const n = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 10, HARD: 9 }));
    const extra = ctx.difficulty === 'HARD' ? rng.integer(1, c.f - 1) : 0;
    const answer = n * c.f + extra;
    const result = A.number(answer);
    const table = Array.from({ length: Math.min(n, 5) }, (_, i) => `${i + 1} → ${fmt((i + 1) * c.f)}`).join(', ');
    return ctx.question({
      prompt: prompt([P.text(extra ? `${n} ${c.big} ${extra} ${c.small} = ? ${c.small}` : `${n} ${c.big} = ? ${c.small}`)]),
      operation: 'CONVERT',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer([c.long, c.small]),
      ...strategies([
        tree('MULTIPLY_FACTOR', 'Multiply', [`1 ${c.big} = ${fmt(c.f)} ${c.small}.`, extra ? `${n} × ${fmt(c.f)} + ${extra} = ${fmt(answer)}.` : `${n} × ${fmt(c.f)} = ${fmt(answer)}.`], result),
        tree('TABLE', 'Conversion table', [`${table}${n > 5 ? ', …' : ''}.`, extra ? `${n} → ${fmt(n * c.f)}; + ${extra} = ${fmt(answer)}.` : `${n} → ${fmt(answer)}.`], result),
      ]),
    });
  },
});

const measurementWord = defineSkill({
  id: 'g4.md.measurement-word-problems',
  grade: '4',
  domain: 'MD',
  standards: ['4.MD.2'],
  title: 'Measurement word problems',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['rope', 'money', 'time', 'liquid'] as const);
    if (kind === 'money') {
      const a = rng.integer(ctx.difficulty === 'EASY' ? 1 : 2, 6) * 100 + rng.integer(0, 3) * 25;
      const b = rng.integer(1, 4) * 100 + rng.integer(0, 3) * 25;
      const paid = Math.ceil((a + b + 1) / 500) * 500;
      const change = paid - a - b;
      const result = A.number(rat(change, 100));
      return ctx.question({
        prompt: prompt([P.text(`Items cost ${money(a)} and ${money(b)}. Pay ${money(paid)}. Change?`)]),
        operation: 'MONEY',
        canonicalAnswer: result,
        answerSchema: SCHEMA.money(),
        answerDisplay: 'money',
        ...strategies([
          tree('ADD_THEN_SUBTRACT', 'Add, then subtract', [`${money(a)} + ${money(b)} = ${money(a + b)}.`, `${money(paid)} − ${money(a + b)} = ${money(change)}.`], result),
          tree('COUNT_UP', 'Count up', [`From ${money(a + b)} up to ${money(paid)}.`, `That is ${money(change)}.`], result),
        ]),
      });
    }
    if (kind === 'time') {
      const h = rng.integer(1, 2);
      const m1 = rng.integer(5, 55);
      const m2 = rng.integer(10, ctx.difficulty === 'HARD' ? 95 : 55);
      const answer = h * 60 + m1 + m2;
      const result = A.number(answer);
      return ctx.question({
        prompt: prompt([P.text(`Practice: ${h} hr ${m1} min, then ${m2} min more. Total minutes?`)]),
        operation: 'TIME',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(['minutes', 'min']),
        ...strategies([
          tree('CONVERT_FIRST', 'Convert hours first', [`${h} hr = ${h * 60} min.`, `${h * 60} + ${m1} + ${m2} = ${answer}.`], result),
          tree('ADD_THEN_CONVERT', 'Add minutes first', [`${m1} + ${m2} = ${m1 + m2} min.`, `${h * 60} + ${m1 + m2} = ${answer}.`], result),
        ]),
      });
    }
    const isRope = kind === 'rope';
    const bigUnits = rng.integer(2, ctx.difficulty === 'EASY' ? 3 : 6);
    const total = bigUnits * (isRope ? 100 : 1000);
    const used = isRope ? rng.integer(1, total / 5 - 1) * 5 : rng.integer(1, total / 50 - 1) * 50;
    const answer = total - used;
    const result = A.number(answer);
    const text = isRope ? `A rope is ${bigUnits} m. Cut off ${used} cm. How many cm are left?` : `A jug has ${bigUnits} L. Pour out ${fmt(used)} mL. How many mL are left?`;
    const smallU = isRope ? 'cm' : 'mL';
    return ctx.question({
      prompt: prompt([P.text(text)]),
      operation: 'CONVERT_SUBTRACT',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(isRope ? ['centimeters', 'cm'] : ['milliliters', 'mL', 'ml']),
      ...strategies([
        tree('CONVERT_SUBTRACT', 'Convert, then subtract', [`${bigUnits} ${isRope ? 'm' : 'L'} = ${fmt(total)} ${smallU}.`, `${fmt(total)} − ${fmt(used)} = ${fmt(answer)} ${smallU}.`], result),
        tree('COUNT_UP', 'Count up', [`From ${fmt(used)} up to ${fmt(total)}.`, `${fmt(answer)} ${smallU}.`], result),
      ]),
    });
  },
});

const areaPerimeterFormulas = defineSkill({
  id: 'g4.md.area-perimeter-formulas',
  grade: '4',
  domain: 'MD',
  standards: ['4.MD.3'],
  title: 'Area and perimeter formulas',
  generate(ctx) {
    const { rng } = ctx;
    const L = rng.integer(4, ctx.tier({ EASY: 10, MEDIUM: 15, HARD: 30 }));
    const W = rng.integer(2, ctx.tier({ EASY: 9, MEDIUM: 12, HARD: 25 }));
    const kind = ctx.tier({ EASY: rng.choose(['area', 'perimeter']), MEDIUM: rng.choose(['width-from-area', 'perimeter']), HARD: rng.choose(['width-from-area', 'width-from-perimeter']) });
    const unitList = ['feet', 'ft'];
    if (kind === 'area' || kind === 'perimeter') {
      const isArea = kind === 'area';
      const answer = isArea ? L * W : 2 * (L + W);
      const result = A.number(answer);
      return ctx.question({
        prompt: prompt([P.text(`${isArea ? 'Area' : 'Perimeter'} of a ${L} ft × ${W} ft rectangle?`)], { v: 'shape', shape: 'rectangle', label: `${L} ft by ${W} ft` }),
        operation: isArea ? 'AREA' : 'PERIMETER',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(isArea ? ['square feet', 'sq ft', 'ft²', 'ft^2', 'ft2'] : unitList),
        ...strategies(
          isArea
            ? [
                tree('FORMULA', 'A = l × w', [`${L} × ${W}`, `= ${answer} sq ft.`], result),
                tree('SPLIT', 'Split a side', [`${L} × ${W} = ${L} × ${W - Math.floor(W / 2)} + ${L} × ${Math.floor(W / 2)}.`, `${L * (W - Math.floor(W / 2))} + ${L * Math.floor(W / 2)} = ${answer} sq ft.`], result),
              ]
            : [
                tree('FORMULA', 'P = 2 × (l + w)', [`${L} + ${W} = ${L + W}.`, `2 × ${L + W} = ${answer} ft.`], result),
                tree('ADD_SIDES', 'Add all 4 sides', [`${L} + ${W} + ${L} + ${W}`, `= ${answer} ft.`], result),
              ],
        ),
      });
    }
    if (kind === 'width-from-area') {
      const area = L * W;
      const result = A.number(W);
      return ctx.question({
        prompt: prompt([P.text(`A rectangle has area ${area} sq ft and length ${L} ft. Width?`)]),
        operation: 'UNKNOWN_SIDE_AREA',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(unitList),
        ...strategies([
          tree('DIVIDE', 'Divide', [`w = ${area} ÷ ${L}.`, `w = ${W} ft.`], result),
          tree('THINK_MULTIPLY', 'Think multiplication', [`${L} × ? = ${area}.`, `${L} × ${W} = ${area}, so ${W} ft.`], result),
        ]),
      });
    }
    const per = 2 * (L + W);
    const result = A.number(W);
    return ctx.question({
      prompt: prompt([P.text(`A rectangle has perimeter ${per} ft and length ${L} ft. Width?`)]),
      operation: 'UNKNOWN_SIDE_PERIMETER',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(unitList),
      ...strategies([
        tree('HALF_FIRST', 'Halve, then subtract', [`Half the perimeter: ${per} ÷ 2 = ${L + W}.`, `${L + W} − ${L} = ${W} ft.`], result),
        tree('SUBTRACT_FIRST', 'Subtract, then halve', [`${per} − ${L} − ${L} = ${2 * W}.`, `${2 * W} ÷ 2 = ${W} ft.`], result),
      ]),
    });
  },
});

const linePlot = defineSkill({
  id: 'g4.md.line-plot-fractions',
  grade: '4',
  domain: 'MD',
  standards: ['4.MD.4'],
  title: 'Line plots with fractions',
  generate(ctx) {
    const { rng } = ctx;
    const d = ctx.difficulty === 'EASY' ? 4 : 8;
    const values = rng.sample(Array.from({ length: d * 2 - 1 }, (_, i) => i + 1), 4).sort((x, y) => x - y);
    const counts = values.map(() => rng.integer(1, 4));
    const lo = values[0] as number;
    const hi = values[values.length - 1] as number;
    const diff = hi - lo;
    const value = rat(diff, d);
    const result = A.number(value);
    const label = (n: number) => toMixedString(rat(n, d));
    return ctx.question({
      prompt: prompt([P.text('Insect lengths (inches). Longest − shortest?')], {
        v: 'table',
        headers: ['Length (in)', 'Insects (X)'],
        rows: values.map((v, i) => [label(v), 'X'.repeat(counts[i] as number)]),
      }),
      operation: 'LINE_PLOT_DIFFERENCE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.fraction(),
      answerDisplay: 'mixed',
      ...strategies([
        tree('SUBTRACT_FRACTIONS', 'Subtract', [`${label(hi)} − ${label(lo)} = ${hi}/${d} − ${lo}/${d}.`, [rf(diff, d), P.text(` = ${toMixedString(value)}`)]], result),
        tree('COUNT_JUMPS', 'Count jumps of 1/' + d, [`From ${label(lo)} to ${label(hi)}: ${diff} jumps of 1/${d}.`, [rf(diff, d), P.text(` = ${toMixedString(value)}`)]], result),
      ]),
    });
  },
});

const angles = defineSkill({
  id: 'g4.md.angles',
  grade: '4',
  domain: 'MD',
  standards: ['4.MD.7'],
  title: 'Angle measures add up',
  generate(ctx) {
    const { rng } = ctx;
    const kind = ctx.tier({ EASY: rng.choose(['turn', 'whole']), MEDIUM: rng.choose(['whole', 'part', 'turn']), HARD: rng.choose(['part', 'whole']) });
    const deg = ['°', 'degrees', 'degree'];
    if (kind === 'turn') {
      const [n, d] = rng.choose([
        [1, 4],
        [1, 2],
        [3, 4],
        [1, 3],
        [1, 6],
        [1, 8],
        [1, 12],
        [2, 3],
      ] as const);
      const answer = (360 / d) * n;
      const result = A.number(answer);
      return ctx.question({
        prompt: prompt([P.text('How many degrees is a '), P.frac(rat(n, d)), P.text(' turn?')]),
        operation: 'TURN_TO_DEGREES',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(deg),
        standards: ['4.MD.5'],
        ...strategies([
          tree('FRACTION_OF_360', 'Fraction of 360°', [`A full turn is 360°. 360 ÷ ${d} = ${360 / d}.`, `${n} × ${360 / d} = ${answer}°.`], result),
          tree('BENCHMARKS', 'Use a right angle', [`A 1/4 turn is 90°.`, d === 4 || d === 2 ? `${n}/${d} turn = ${(n * 4) / d} × 90 = ${answer}°.` : `${n}/${d} of 360 = ${answer}° (${answer < 90 ? 'less' : 'more'} than 90°).`], result),
        ]),
      });
    }
    const step = ctx.difficulty === 'EASY' ? 5 : 1;
    const a = rng.integer(10 / step, 85 / step) * step;
    const b = rng.integer(10 / step, 85 / step) * step;
    const whole = a + b;
    if (kind === 'whole') {
      const result = A.number(whole);
      return ctx.question({
        prompt: prompt([P.text(`∠ABC is split into ${a}° and ${b}°. ∠ABC = ?`)]),
        operation: 'ADD_ANGLES',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(deg),
        ...strategies([
          tree('ADD_PARTS', 'Add the parts', [`${a} + ${b}`, `= ${whole}°.`], result),
          tree('TENS_ONES', 'Tens, then ones', [`${a - (a % 10)} + ${b - (b % 10)} = ${a - (a % 10) + b - (b % 10)}; ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}.`, `${whole}°.`], result),
        ]),
      });
    }
    const result = A.number(b);
    return ctx.question({
      prompt: prompt([P.text(`∠ABC = ${whole}°. One part is ${a}°. The other part?`)]),
      operation: 'SUBTRACT_ANGLES',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(deg),
      ...strategies([
        tree('SUBTRACT', 'Subtract', [`${whole} − ${a}`, `= ${b}°.`], result),
        tree('COUNT_UP', 'Count up', [`From ${a} up to ${whole}.`, `${b}°.`], result),
      ]),
    });
  },
});

/* -------------------------------- 4.G --------------------------------- */

const angleTypes = defineSkill({
  id: 'g4.g.angle-types',
  grade: '4',
  domain: 'G',
  standards: ['4.G.1'],
  title: 'Acute, right, or obtuse?',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['acute', 'right', 'obtuse', ...(ctx.difficulty === 'EASY' ? [] : ['straight'])]);
    const m = kind === 'acute' ? rng.integer(5, 85) : kind === 'right' ? 90 : kind === 'obtuse' ? rng.integer(95, 175) : 180;
    const choices = fixedChoices(['Acute', 'Right', 'Obtuse', 'Straight']);
    const result = A.choice(kind);
    const name = kind.charAt(0).toUpperCase() + kind.slice(1);
    return ctx.question({
      prompt: prompt([P.text(`An angle is ${m}°. What type?`)]),
      operation: 'CLASSIFY_ANGLE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(choices),
      ...strategies([
        tree('COMPARE_90', 'Compare to 90°', [m < 90 ? `${m}° < 90°.` : m === 90 ? 'Exactly 90°.' : m === 180 ? 'Exactly 180°.' : `90° < ${m}° < 180°.`, `${name}.`], result),
        tree('DEFINITIONS', 'Use the definitions', ['Acute < 90°, right = 90°, obtuse 90°–180°, straight = 180°.', `${name}.`], result),
      ]),
    });
  },
});

const QUAD_FACTS = [
  { name: 'Square', clue: '4 equal sides and 4 right angles', why: 'Equal sides + right angles = square.' },
  { name: 'Rectangle', clue: '4 right angles; sides not all equal', why: 'Right angles but unequal sides = rectangle.' },
  { name: 'Rhombus', clue: '4 equal sides; no right angles', why: 'Equal sides, no right angles = rhombus.' },
  { name: 'Parallelogram', clue: '2 pairs of parallel sides; no right angles; sides not all equal', why: 'Two parallel pairs only = parallelogram.' },
  { name: 'Trapezoid', clue: 'exactly 1 pair of parallel sides', why: 'Exactly one parallel pair = trapezoid.' },
] as const;

const classifyShapes = defineSkill({
  id: 'g4.g.classify-shapes',
  grade: '4',
  domain: 'G',
  standards: ['4.G.2'],
  title: 'Classify triangles and quadrilaterals',
  generate(ctx) {
    const { rng } = ctx;
    const kind = ctx.tier({ EASY: 'angles', MEDIUM: rng.choose(['angles', 'sides']), HARD: rng.choose(['sides', 'quad', 'angles']) });
    if (kind === 'angles') {
      const type = rng.choose(['right', 'acute', 'obtuse'] as const);
      const [x, y] = ctx.retry(
        () => {
          if (type === 'right') {
            const p = rng.integer(15, 75);
            return [90, p] as const;
          }
          if (type === 'obtuse') {
            const big = rng.integer(95, 150);
            return [big, rng.integer(10, 180 - big - 10)] as const;
          }
          return [rng.integer(50, 85), rng.integer(50, 85)] as const;
        },
        ([p, q]) => 180 - p - q > 0 && (type !== 'acute' || 180 - p - q < 90),
      );
      const angs = rng.shuffle([x, y, 180 - x - y]);
      const largest = Math.max(...angs);
      const result = A.choice(type);
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      return ctx.question({
        prompt: prompt([P.text(`A triangle has angles ${angs.join('°, ')}°. What kind?`)]),
        operation: 'CLASSIFY_TRIANGLE',
        canonicalAnswer: result,
        answerSchema: SCHEMA.choice(fixedChoices(['Acute', 'Right', 'Obtuse'])),
        ...strategies([
          tree('LARGEST_ANGLE', 'Look at the largest angle', [`Largest angle: ${largest}°.`, `${largest < 90 ? '< 90°' : largest === 90 ? '= 90°' : '> 90°'} → ${label}.`], result),
          tree('CHECK_EACH', 'Check each angle', [angs.map((g) => `${g}° ${g < 90 ? 'acute' : g === 90 ? 'right' : 'obtuse'}`).join(', ') + '.', `${label} triangle.`], result),
        ]),
      });
    }
    if (kind === 'sides') {
      const type = rng.choose(['equilateral', 'isosceles', 'scalene'] as const);
      const sides = ctx.retry(
        () => {
          const s = rng.integer(3, 12);
          if (type === 'equilateral') return [s, s, s];
          if (type === 'isosceles') return [s, s, rng.integer(2, 2 * s - 1)];
          return [s, rng.integer(3, 12), rng.integer(3, 12)];
        },
        (v) => {
          const [p, q, r] = v as [number, number, number];
          const distinct = new Set(v).size;
          const valid = p + q > r && p + r > q && q + r > p;
          return valid && (type === 'equilateral' ? distinct === 1 : type === 'isosceles' ? distinct === 2 : distinct === 3);
        },
      );
      const shown = rng.shuffle(sides);
      const equalCount = 4 - new Set(sides).size;
      const result = A.choice(type);
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      return ctx.question({
        prompt: prompt([P.text(`Triangle sides: ${shown.join(', ')} cm. What kind?`)]),
        operation: 'CLASSIFY_TRIANGLE_SIDES',
        canonicalAnswer: result,
        answerSchema: SCHEMA.choice(fixedChoices(['Equilateral', 'Isosceles', 'Scalene'])),
        ...strategies([
          tree('COUNT_EQUAL', 'Count equal sides', [type === 'scalene' ? 'No sides are equal.' : type === 'equilateral' ? 'All 3 sides are equal.' : 'Exactly 2 sides are equal.', `${label}.`], result),
          tree('NAME_MEANING', 'Word meanings', ['Equi = all equal, isos = two equal, scalene = none.', `${equalCount === 3 ? 'All' : equalCount === 2 ? 'Two' : 'None'} equal → ${label}.`], result),
        ]),
      });
    }
    const pick = rng.choose(QUAD_FACTS);
    const { choices, correctId } = makeChoices(
      rng,
      pick.name,
      QUAD_FACTS.map((q) => q.name),
    );
    const result = A.choice(correctId);
    return ctx.question({
      prompt: prompt([P.text(`A quadrilateral has ${pick.clue}. What is it?`)]),
      operation: 'CLASSIFY_QUADRILATERAL',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(choices),
      ...strategies([
        tree('MATCH_DEFINITION', 'Match the definition', [pick.why, `${pick.name}.`], result),
        tree('ELIMINATE', 'Cross out the others', ['Check each choice against the clues.', `Only ${pick.name.toLowerCase()} fits.`], result),
      ]),
    });
  },
});

const SYMMETRY = [
  { name: 'square', visual: 'square', lines: 4, regular: true, fold: 'Fold edge to edge (2) and corner to corner (2).' },
  { name: 'rectangle', visual: 'rectangle', lines: 2, regular: false, fold: 'Fold long edges together and short edges together.' },
  { name: 'equilateral triangle', visual: 'triangle', lines: 3, regular: true, fold: 'Fold from each corner to the middle of the opposite side.' },
  { name: 'rhombus', visual: 'rhombus', lines: 2, regular: false, fold: 'Fold along each diagonal.' },
  { name: 'regular pentagon', visual: 'pentagon', lines: 5, regular: true, fold: 'Fold from each corner to the opposite side.' },
  { name: 'regular hexagon', visual: 'hexagon', lines: 6, regular: true, fold: '3 folds corner to corner, 3 side to side.' },
  { name: 'regular octagon', visual: 'octagon', lines: 8, regular: true, fold: '4 folds corner to corner, 4 side to side.' },
  { name: 'parallelogram (not a rectangle or rhombus)', visual: 'parallelogram', lines: 0, regular: false, fold: 'No fold makes the halves match.' },
  { name: 'isosceles trapezoid', visual: 'trapezoid', lines: 1, regular: false, fold: 'Only the fold through the middle of both parallel sides works.' },
] as const;

const symmetry = defineSkill({
  id: 'g4.g.lines-of-symmetry',
  grade: '4',
  domain: 'G',
  standards: ['4.G.3'],
  title: 'Lines of symmetry',
  generate(ctx) {
    const { rng } = ctx;
    const pool = ctx.tier({ EASY: SYMMETRY.slice(0, 3), MEDIUM: SYMMETRY.slice(0, 6), HARD: SYMMETRY.slice() });
    const s = rng.choose(pool);
    const result = A.number(s.lines);
    return ctx.question({
      prompt: prompt([P.text(`Lines of symmetry in this ${s.name}?`)], { v: 'shape', shape: s.visual }),
      operation: 'COUNT_SYMMETRY',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(['lines', 'line']),
      ...strategies([
        tree('FOLD_TEST', 'Fold test', [s.fold, `${s.lines} ${plural(s.lines, 'line', 'lines')}.`], result),
        s.regular
          ? tree('REGULAR_RULE', 'Regular shape rule', ['A regular shape has as many lines as sides.', `${s.lines} sides → ${s.lines} lines.`], result)
          : tree('MATCH_PARTS', 'Match the parts', [s.lines === 0 ? 'No line splits it into mirror halves.' : `Count the lines that give mirror halves.`, `${s.lines} ${plural(s.lines, 'line', 'lines')}.`], result),
      ]),
    });
  },
});

export const GRADE_4_SKILLS: readonly Skill[] = [
  multiplicativeComparison,
  remainders,
  multistep,
  primeComposite,
  factorsMultiples,
  patterns,
  placeValue,
  readWrite,
  compareWhole,
  roundAny,
  addSub,
  multiplyMultiDigit,
  divideRemainder,
  equivalentFractions,
  compareFractions,
  addSubtractLike,
  decompose,
  fractionTimesWhole,
  tenthsHundredths,
  decimalNotation,
  compareDecimals,
  convertUnits,
  measurementWord,
  areaPerimeterFormulas,
  linePlot,
  angles,
  angleTypes,
  classifyShapes,
  symmetry,
];
