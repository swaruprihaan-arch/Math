/**
 * Grade 3 practice skills (California CCSSM). Every question offers ≥ 2 strategies; prompts are kept very short.
 *
 * Standards NOT auto-generated (and why):
 *   - 3.MD.4  Making line plots from ruler measurements — students must measure real objects and draw the plot.
 *   - 3.MD.5  Concept of a unit square — conceptual; practiced through counting unit squares in g3.md.area (3.MD.6/3.MD.7).
 *   - 3.OA.1/3.OA.2 "describe a context" parts — open-ended writing; the computational parts are covered by word problems.
 */
import { A, COMPARE_CHOICES, P, prompt, SCHEMA, strategies, YES_NO_CHOICES } from '../../domain/question/build';
import type { PromptNode } from '../../domain/question/types';
import { rat } from '../../domain/rational/rational';
import { additionStrategies, divisionStrategies, multiAdditionStrategies, multiplicationStrategies, subtractionStrategies } from '../../solutions/strategies/wholeNumber';
import { compareSymbol, fixedChoices, makeChoices, pickItem, pickName, plural } from '../helpers';
import { defineSkill } from '../skill';
import type { Skill } from '../types';
import { addMinutes, formatClock, roundToPlace, tree } from './_g35Helpers';

const rf = (n: number, d: number): PromptNode => ({ t: 'rawfrac', numerator: BigInt(n), denominator: BigInt(d) });

/* -------------------------------- 3.OA -------------------------------- */

const multiplicationFacts = defineSkill({
  id: 'g3.oa.mult-facts',
  grade: '3',
  domain: 'OA',
  standards: ['3.OA.7'],
  title: 'Multiplication facts',
  generate(ctx) {
    const { rng } = ctx;
    const [lo, hi] = ctx.tier({ EASY: [1, 5], MEDIUM: [2, 9], HARD: [6, 10] });
    let a = rng.integer(lo, hi);
    let b = rng.integer(ctx.difficulty === 'EASY' ? 1 : lo, ctx.difficulty === 'EASY' ? 10 : hi);
    if (rng.bool()) [a, b] = [b, a];
    return ctx.question({
      prompt: prompt([P.num(a), P.op('×'), P.num(b), P.op('='), P.blank()]),
      operands: [
        { role: 'lhs', value: A.number(a) },
        { role: 'rhs', value: A.number(b) },
      ],
      operation: 'MULTIPLY',
      canonicalAnswer: A.number(a * b),
      answerSchema: SCHEMA.integer(),
      ...strategies(multiplicationStrategies(a, b)),
    });
  },
});

const divisionFacts = defineSkill({
  id: 'g3.oa.div-facts',
  grade: '3',
  domain: 'OA',
  standards: ['3.OA.7', '3.OA.6'],
  title: 'Division facts',
  generate(ctx) {
    const { rng } = ctx;
    const [lo, hi] = ctx.tier({ EASY: [2, 5], MEDIUM: [2, 9], HARD: [6, 10] });
    const divisor = rng.integer(lo, hi);
    const quotient = rng.integer(ctx.difficulty === 'EASY' ? 1 : 2, ctx.difficulty === 'EASY' ? 5 : 10);
    const dividend = divisor * quotient;
    return ctx.question({
      prompt: prompt([P.num(dividend), P.op('÷'), P.num(divisor), P.op('='), P.blank()]),
      operation: 'DIVIDE',
      canonicalAnswer: A.number(quotient),
      answerSchema: SCHEMA.integer(),
      ...strategies(divisionStrategies(dividend, divisor)),
    });
  },
});

const equalGroups = defineSkill({
  id: 'g3.oa.equal-groups',
  grade: '3',
  domain: 'OA',
  standards: ['3.OA.1', '3.OA.3'],
  title: 'Equal groups and arrays',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 5, MEDIUM: 8, HARD: 10 });
    const groups = rng.integer(2, max);
    const each = rng.integer(2, max);
    const item = pickItem(rng);
    const useArray = ctx.difficulty !== 'HARD' && rng.bool(0.6);
    const text = useArray
      ? `${groups} rows of ${each} ${item.plural}. How many in all?`
      : `${groups} bags with ${each} ${plural(each, item.singular, item.plural)} each. How many ${item.plural}?`;
    return ctx.question({
      prompt: prompt([P.text(text)], useArray ? { v: 'array', rows: groups, columns: each, emoji: item.emoji } : undefined),
      operation: 'MULTIPLY',
      canonicalAnswer: A.number(groups * each),
      answerSchema: SCHEMA.integer([item.plural, item.singular]),
      ...strategies(multiplicationStrategies(groups, each)),
    });
  },
});

const shareEqually = defineSkill({
  id: 'g3.oa.share-equally',
  grade: '3',
  domain: 'OA',
  standards: ['3.OA.2', '3.OA.3'],
  title: 'Sharing and grouping',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 5, MEDIUM: 9, HARD: 10 });
    const shares = rng.integer(2, max);
    const each = rng.integer(2, max);
    const total = shares * each;
    const item = pickItem(rng);
    const howManyGroups = rng.bool();
    const text = howManyGroups
      ? `${total} ${item.plural}, ${each} in each box. How many boxes?`
      : `${total} ${item.plural} shared by ${shares} friends. How many each?`;
    const divisor = howManyGroups ? each : shares;
    return ctx.question({
      prompt: prompt([P.text(text)]),
      operation: 'DIVIDE',
      canonicalAnswer: A.number(total / divisor),
      answerSchema: SCHEMA.integer(howManyGroups ? ['boxes', 'box'] : [item.plural, item.singular]),
      ...strategies(divisionStrategies(total, divisor)),
    });
  },
});

const unknownNumber = defineSkill({
  id: 'g3.oa.unknown-number',
  grade: '3',
  domain: 'OA',
  standards: ['3.OA.4'],
  title: 'Find the unknown number',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 5, MEDIUM: 9, HARD: 10 });
    const a = rng.integer(2, max);
    const b = rng.integer(2, max);
    const c = a * b;
    const form = rng.integer(0, ctx.difficulty === 'EASY' ? 1 : 3);
    let nodes: PromptNode[];
    let answer: number;
    let fact: string;
    let skip: string;
    switch (form) {
      case 0:
        nodes = [P.num(a), P.op('×'), P.blank(), P.op('='), P.num(c)];
        answer = b;
        fact = `${c} ÷ ${a} = ${b}`;
        skip = `Count by ${a}s to ${c}: ${b} jumps.`;
        break;
      case 1:
        nodes = [P.blank(), P.op('×'), P.num(b), P.op('='), P.num(c)];
        answer = a;
        fact = `${c} ÷ ${b} = ${a}`;
        skip = `Count by ${b}s to ${c}: ${a} jumps.`;
        break;
      case 2:
        nodes = [P.num(c), P.op('÷'), P.blank(), P.op('='), P.num(a)];
        answer = b;
        fact = `${a} × ${b} = ${c}`;
        skip = `Count by ${a}s to ${c}: ${b} jumps.`;
        break;
      default:
        nodes = [P.blank(), P.op('÷'), P.num(b), P.op('='), P.num(a)];
        answer = c;
        fact = `${a} × ${b} = ${c}`;
        skip = `Count by ${b}s, ${a} times: ${c}.`;
        break;
    }
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt(nodes),
      operation: 'UNKNOWN_NUMBER',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('FACT_FAMILY', 'Fact family', [`Use the related fact: ${fact}.`, `Missing number: ${answer}.`], result),
        tree('SKIP_COUNT', 'Skip count', [skip, `Missing number: ${answer}.`], result),
      ]),
    });
  },
});

const properties = defineSkill({
  id: 'g3.oa.properties',
  grade: '3',
  domain: 'OA',
  standards: ['3.OA.5'],
  title: 'Use properties to multiply',
  generate(ctx) {
    const { rng } = ctx;
    const kind = ctx.tier({ EASY: rng.choose(['comm', 'comm', 'assoc']), MEDIUM: rng.choose(['dist', 'assoc', 'comm']), HARD: rng.choose(['dist', 'dist', 'assoc']) });
    if (kind === 'comm') {
      const a = rng.integer(2, 9);
      const b = rng.integer(2, 9);
      const c = a * b;
      const result = A.number(c);
      return ctx.question({
        prompt: prompt([P.text(`${a} × ${b} = ${c}, so`), P.br(), P.num(b), P.op('×'), P.num(a), P.op('='), P.blank()]),
        operation: 'COMMUTATIVE',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(),
        ...strategies([
          tree('SWITCH_ORDER', 'Switch the order', ['Order doesn’t change a product.', `${b} × ${a} = ${c}.`], result),
          tree('SKIP_COUNT', 'Skip count', [`Count by ${a}s, ${b} times.`, `You reach ${c}.`], result),
        ]),
      });
    }
    if (kind === 'assoc') {
      const a = rng.integer(2, 9);
      const b = rng.choose([2, 5]);
      const c = b === 2 ? 5 : 2;
      const bc = b * c;
      const result = A.number(bc);
      return ctx.question({
        prompt: prompt([P.num(a), P.op('×'), P.num(b), P.op('×'), P.num(c), P.op('='), P.num(a), P.op('×'), P.blank()]),
        operation: 'ASSOCIATIVE',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(),
        ...strategies([
          tree('GROUP_FIRST', 'Group the last two', [`Multiply ${b} × ${c} first: ${bc}.`, `So the blank is ${bc}.`], result),
          tree('WORK_BACKWARD', 'Work backward', [`${a} × ${b} × ${c} = ${a * bc}.`, `${a} × ? = ${a * bc}, so ? = ${bc}.`], result),
        ]),
      });
    }
    const a = rng.integer(ctx.difficulty === 'HARD' ? 6 : 3, 9);
    const b = rng.integer(6, ctx.difficulty === 'HARD' ? 12 : 9);
    const first = ctx.difficulty === 'HARD' ? rng.integer(2, b - 2) : 5;
    const second = b - first;
    const result = A.number(second);
    return ctx.question({
      prompt: prompt([
        P.num(a),
        P.op('×'),
        P.num(b),
        P.op('='),
        P.op('('),
        P.num(a),
        P.op('×'),
        P.num(first),
        P.op(')'),
        P.op('+'),
        P.op('('),
        P.num(a),
        P.op('×'),
        P.blank(),
        P.op(')'),
      ]),
      operation: 'DISTRIBUTIVE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('SPLIT_FACTOR', 'Split the factor', [`${b} = ${first} + ?`, `${b} − ${first} = ${second}.`], result),
        tree('PRODUCTS', 'Compare products', [`${a} × ${b} = ${a * b}; ${a} × ${first} = ${a * first}.`, `${a * b} − ${a * first} = ${a * second} = ${a} × ${second}.`], result),
      ]),
    });
  },
});

const twoStepWord = defineSkill({
  id: 'g3.oa.two-step-word',
  grade: '3',
  domain: 'OA',
  standards: ['3.OA.8'],
  title: 'Two-step word problems',
  generate(ctx) {
    const { rng } = ctx;
    const name = pickName(rng);
    const item = pickItem(rng);
    const big = ctx.difficulty === 'HARD';
    const template = rng.integer(0, 3);
    let text: string;
    let answer: number;
    let stepLines: string[];
    let equation: string;
    if (template === 0) {
      const packs = rng.integer(2, big ? 9 : 5);
      const per = rng.integer(3, big ? 10 : 6);
      const total = packs * per;
      const away = rng.integer(1, total - 1);
      answer = total - away;
      text = `${name} has ${packs} packs of ${per} ${item.plural} and gives away ${away}. How many are left?`;
      stepLines = [`${packs} × ${per} = ${total}`, `${total} − ${away} = ${answer}`];
      equation = `n = ${packs} × ${per} − ${away}`;
    } else if (template === 1) {
      const friends = rng.integer(2, big ? 9 : 5);
      const each = rng.integer(2, big ? 10 : 6);
      const total = friends * each;
      const first = rng.integer(1, total - 1);
      const more = total - first;
      answer = each;
      text = `${name} has ${first} ${item.plural}, gets ${more} more, then shares all with ${friends} friends equally. How many each?`;
      stepLines = [`${first} + ${more} = ${total}`, `${total} ÷ ${friends} = ${each}`];
      equation = `n = (${first} + ${more}) ÷ ${friends}`;
    } else if (template === 2) {
      const rows = rng.integer(3, big ? 10 : 6);
      const cols = rng.integer(3, big ? 10 : 6);
      const total = rows * cols;
      const empty = rng.integer(1, total - 1);
      answer = total - empty;
      text = `${rows} rows of ${cols} chairs. ${empty} are empty. How many are taken?`;
      stepLines = [`${rows} × ${cols} = ${total}`, `${total} − ${empty} = ${answer}`];
      equation = `n = ${rows} × ${cols} − ${empty}`;
    } else {
      const pages = rng.integer(3, big ? 12 : 8);
      const days = rng.integer(2, big ? 9 : 5);
      const extra = rng.integer(5, big ? 60 : 20);
      answer = pages * days + extra;
      text = `${name} reads ${pages} pages a day for ${days} days, then ${extra} more. Total pages?`;
      stepLines = [`${pages} × ${days} = ${pages * days}`, `${pages * days} + ${extra} = ${answer}`];
      equation = `n = ${pages} × ${days} + ${extra}`;
    }
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([P.text(text)]),
      operation: 'TWO_STEP',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('TWO_STEPS', 'One step at a time', [`Step 1: ${stepLines[0]}.`, `Step 2: ${stepLines[1]}.`], result),
        tree('EQUATION', 'Write an equation', [`${equation}.`, `n = ${answer}.`], result),
      ]),
    });
  },
});

const patterns = defineSkill({
  id: 'g3.oa.patterns',
  grade: '3',
  domain: 'OA',
  standards: ['3.OA.9'],
  title: 'Number patterns',
  generate(ctx) {
    const { rng } = ctx;
    const kind = ctx.tier({ EASY: 'next', MEDIUM: rng.choose(['next', 'missing', 'parity']), HARD: rng.choose(['missing', 'parity', 'next']) });
    if (kind === 'parity') {
      const a = rng.integer(2, 9);
      const b = rng.integer(2, 9);
      const even = (a * b) % 2 === 0;
      const result = A.choice(even ? 'even' : 'odd');
      return ctx.question({
        prompt: prompt([P.text('Even or odd?'), P.br(), P.num(a), P.op('×'), P.num(b)]),
        operation: 'PARITY',
        canonicalAnswer: result,
        answerSchema: SCHEMA.choice(fixedChoices(['Even', 'Odd'])),
        ...strategies([
          tree('PARITY_RULE', 'Even/odd rule', [a % 2 === 0 || b % 2 === 0 ? 'An even factor makes the product even.' : 'Odd × odd is odd.', even ? 'Even.' : 'Odd.'], result),
          tree('MULTIPLY_CHECK', 'Multiply and check', [`${a} × ${b} = ${a * b}.`, `Ones digit ${(a * b) % 10}: ${even ? 'even' : 'odd'}.`], result),
        ]),
      });
    }
    const k = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 10, HARD: 25 }));
    const start = rng.integer(0, ctx.tier({ EASY: 10, MEDIUM: 30, HARD: 100 }));
    const terms = Array.from({ length: 5 }, (_, i) => start + k * i);
    const missingIndex = kind === 'missing' ? rng.integer(1, 3) : 4;
    const answer = terms[missingIndex] as number;
    const nodes: PromptNode[] = [];
    terms.forEach((t, i) => {
      if (i > 0) nodes.push(P.op(','));
      nodes.push(i === missingIndex ? P.blank() : P.num(t));
    });
    const result = A.number(answer);
    const before = terms[missingIndex - 1] as number;
    const after = terms[missingIndex + 1];
    return ctx.question({
      prompt: prompt(nodes),
      operation: 'PATTERN',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('ADD_RULE', 'Find the rule', [`Rule: add ${k}.`, `${before} + ${k} = ${answer}.`], result),
        after !== undefined
          ? tree('WORK_BACK', 'Work backward', [`Rule: add ${k}.`, `${after} − ${k} = ${answer}.`], result)
          : tree('FROM_START', 'Jump from the start', [`${missingIndex} jumps of ${k} = ${missingIndex * k}.`, `${start} + ${missingIndex * k} = ${answer}.`], result),
      ]),
    });
  },
});

/* -------------------------------- 3.NBT ------------------------------- */

const rounding = defineSkill({
  id: 'g3.nbt.round',
  grade: '3',
  domain: 'NBT',
  standards: ['3.NBT.1'],
  title: 'Round to 10 or 100',
  generate(ctx) {
    const { rng } = ctx;
    const place = ctx.difficulty === 'EASY' ? 10 : rng.choose([10, 100]);
    const halfway = ctx.difficulty === 'HARD' && rng.bool(0.3);
    const value =
      ctx.difficulty === 'EASY'
        ? rng.integer(11, 99)
        : halfway
          ? place === 10
            ? rng.integer(10, 99) * 10 + 5
            : rng.integer(1, 9) * 100 + 50
          : rng.integer(101, 999);
    const answer = roundToPlace(value, place);
    const lower = Math.floor(value / place) * place;
    const upper = lower + place;
    const digit = place === 10 ? value % 10 : Math.floor((value % 100) / 10);
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([P.text(`Round ${value} to the nearest ${place === 10 ? 'ten' : 'hundred'}.`)]),
      operation: 'ROUND',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('NEXT_DIGIT', 'Look at the next digit', [`${place === 10 ? 'Ones' : 'Tens'} digit: ${digit}.`, `${digit >= 5 ? '5 or more: round up' : 'Less than 5: round down'} → ${answer}.`], result),
        tree('NUMBER_LINE', 'Number line', [`${value} is between ${lower} and ${upper}.`, value - lower === upper - value ? `Halfway rounds up → ${answer}.` : `Closer to ${answer}.`], result),
      ]),
    });
  },
});

const addSubtract1000 = defineSkill({
  id: 'g3.nbt.add-sub-1000',
  grade: '3',
  domain: 'NBT',
  standards: ['3.NBT.2'],
  title: 'Add and subtract within 1000',
  generate(ctx) {
    const { rng } = ctx;
    const add = rng.bool();
    const [aLo, aHi, bLo, bHi] = ctx.tier({ EASY: [10, 99, 10, 99], MEDIUM: [100, 899, 10, 99], HARD: [100, 899, 100, 899] });
    const [a, b] = ctx.retry(
      () => [rng.integer(aLo, aHi), rng.integer(bLo, bHi)] as const,
      ([x, y]) => x !== y && (add ? x + y <= 1000 : true) && (ctx.difficulty !== 'HARD' || (add ? (x % 10) + (y % 10) >= 10 : Math.max(x, y) % 10 < Math.min(x, y) % 10)),
    );
    const [top, bottom] = !add && a < b ? [b, a] : [a, b];
    const answer = add ? top + bottom : top - bottom;
    return ctx.question({
      prompt: prompt([P.num(top), P.op(add ? '+' : '−'), P.num(bottom), P.op('='), P.blank()]),
      operation: add ? 'ADD' : 'SUBTRACT',
      canonicalAnswer: A.number(answer),
      answerSchema: SCHEMA.integer(),
      ...strategies(add ? additionStrategies(top, bottom) : subtractionStrategies(top, bottom)),
    });
  },
});

const timesTens = defineSkill({
  id: 'g3.nbt.times-multiples-of-10',
  grade: '3',
  domain: 'NBT',
  standards: ['3.NBT.3'],
  title: 'Multiply by multiples of 10',
  generate(ctx) {
    const { rng } = ctx;
    const a = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 9, HARD: 9 }));
    const tens = rng.integer(ctx.difficulty === 'HARD' ? 5 : 1, 9);
    const m = tens * 10;
    const answer = a * m;
    const [x, y] = rng.bool() ? [a, m] : [m, a];
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([P.num(x), P.op('×'), P.num(y), P.op('='), P.blank()]),
      operation: 'MULTIPLY',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('COUNT_TENS', 'Count tens', [`${m} = ${tens} tens.`, `${a} × ${tens} tens = ${a * tens} tens = ${answer}.`], result),
        tree('TIMES_TEN', 'Fact, then × 10', [`${a} × ${tens} = ${a * tens}.`, `${a * tens} × 10 = ${answer}.`], result),
      ]),
    });
  },
});

/* -------------------------------- 3.NF -------------------------------- */

const GRADE3_DENOMINATORS = [2, 3, 4, 6, 8];

const fractionModel = defineSkill({
  id: 'g3.nf.fraction-of-shape',
  grade: '3',
  domain: 'NF',
  standards: ['3.NF.1', '3.G.2'],
  title: 'What fraction is shaded?',
  generate(ctx) {
    const { rng } = ctx;
    const parts = rng.choose(ctx.difficulty === 'EASY' ? [2, 3, 4] : GRADE3_DENOMINATORS);
    const shaded = ctx.difficulty === 'EASY' ? 1 : rng.integer(1, parts - 1);
    const result = A.number(rat(shaded, parts));
    return ctx.question({
      prompt: prompt([P.text('What fraction is shaded?')], { v: 'fractionBar', parts, shaded }),
      operation: 'IDENTIFY_FRACTION',
      canonicalAnswer: result,
      answerSchema: SCHEMA.fraction(),
      ...strategies([
        tree('COUNT_PARTS', 'Count the parts', [`${parts} equal parts; ${shaded} shaded.`, [P.text('Shaded: '), rf(shaded, parts)]], result),
        tree('UNIT_FRACTIONS', 'Unit fractions', [`Each part is 1/${parts}.`, [P.text(`${shaded} × 1/${parts} = `), rf(shaded, parts)]], result),
      ]),
      standards: shaded === 1 ? ['3.NF.1', '3.G.2'] : ['3.NF.1'],
    });
  },
});

const numberLine = defineSkill({
  id: 'g3.nf.number-line',
  grade: '3',
  domain: 'NF',
  standards: ['3.NF.2'],
  title: 'Fractions on a number line',
  generate(ctx) {
    const { rng } = ctx;
    const b = rng.choose(GRADE3_DENOMINATORS);
    const maxWhole = ctx.difficulty === 'HARD' ? 2 : 1;
    const a = ctx.retry(
      () => (ctx.difficulty === 'EASY' ? 1 : rng.integer(1, maxWhole * b - 1)),
      (v) => v % b !== 0,
    );
    const result = A.number(rat(a, b));
    const nextWhole = Math.ceil(a / b);
    const back = nextWhole * b - a;
    return ctx.question({
      prompt: prompt([P.text('What fraction is at A?')], {
        v: 'numberLine',
        min: rat(0),
        max: rat(maxWhole),
        intervals: maxWhole * b,
        points: [{ at: rat(a, b), label: 'A' }],
        labelEnds: true,
      }),
      operation: 'LOCATE_FRACTION',
      canonicalAnswer: result,
      answerSchema: SCHEMA.fraction(),
      ...strategies([
        tree('COUNT_JUMPS', 'Count jumps from 0', [`Each jump is 1/${b}.`, [P.text(`${a} ${plural(a, 'jump', 'jumps')} → `), rf(a, b)]], result),
        tree('FROM_WHOLE', 'Count back from a whole', [`${nextWhole} = ${nextWhole * b}/${b}. A is ${back} ${plural(back, 'jump', 'jumps')} back.`, [P.text(`${nextWhole * b}/${b} − ${back}/${b} = `), rf(a, b)]], result),
      ]),
      standards: a === 1 ? ['3.NF.2a'] : ['3.NF.2b'],
    });
  },
});

const EQUIVALENT_BASES: readonly [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
];

const equivalentFractions = defineSkill({
  id: 'g3.nf.equivalent-fractions',
  grade: '3',
  domain: 'NF',
  standards: ['3.NF.3b'],
  title: 'Equivalent fractions',
  generate(ctx) {
    const { rng } = ctx;
    const [n, d, k] = ctx.retry(
      () => {
        const [bn, bd] = rng.choose(EQUIVALENT_BASES);
        return [bn, bd, rng.integer(2, 4)] as const;
      },
      ([, bd, factor]) => GRADE3_DENOMINATORS.includes(bd * factor),
    );
    const missingDenominator = ctx.difficulty === 'HARD' && rng.bool();
    const answer = missingDenominator ? d * k : n * k;
    const right: PromptNode[] = missingDenominator ? [P.text(`${n * k}/`), P.blank()] : [P.blank(), P.text(`/${d * k}`)];
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([P.frac(rat(n, d)), P.op('='), ...right]),
      operation: 'EQUIVALENT_FRACTION',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('SCALE', 'Multiply top and bottom', [`${missingDenominator ? `${n} × ${k} = ${n * k}` : `${d} × ${k} = ${d * k}`}, so use × ${k}.`, `${missingDenominator ? d : n} × ${k} = ${answer}.`], result),
        tree('SPLIT_PARTS', 'Split each part', [`Cut each 1/${d} into ${k} pieces.`, missingDenominator ? `${d} parts become ${answer}.` : `${n} ${plural(n, 'part', 'parts')} become ${answer}.`], result),
      ]),
    });
  },
});

const wholeNumbersAsFractions = defineSkill({
  id: 'g3.nf.whole-numbers-as-fractions',
  grade: '3',
  domain: 'NF',
  standards: ['3.NF.3c'],
  title: 'Whole numbers as fractions',
  generate(ctx) {
    const { rng } = ctx;
    const kind = ctx.tier({ EASY: rng.choose(['same', 'over1']), MEDIUM: rng.choose(['same', 'over1', 'write']), HARD: rng.choose(['multiple', 'write', 'multiple']) });
    let nodes: PromptNode[];
    let answer: number;
    let divideLine: string;
    let countLine: string;
    if (kind === 'same') {
      const b = rng.choose(GRADE3_DENOMINATORS);
      nodes = [rf(b, b), P.op('='), P.blank()];
      answer = 1;
      divideLine = `${b} ÷ ${b} = 1.`;
      countLine = `${b} of ${b} parts = 1 whole.`;
    } else if (kind === 'over1') {
      const n = rng.integer(2, 9);
      nodes = [rf(n, 1), P.op('='), P.blank()];
      answer = n;
      divideLine = `${n} ÷ 1 = ${n}.`;
      countLine = `Each whole is 1 part; ${n} parts = ${n} wholes.`;
    } else if (kind === 'write') {
      const n = rng.integer(2, 9);
      nodes = [P.num(n), P.op('='), P.blank(), P.text('/1')];
      answer = n;
      divideLine = `? ÷ 1 = ${n}, so ? = ${n}.`;
      countLine = `${n} wholes, 1 part each = ${n} parts.`;
    } else {
      const b = rng.choose([2, 3, 4]);
      const w = rng.integer(2, 4);
      nodes = [rf(w * b, b), P.op('='), P.blank()];
      answer = w;
      divideLine = `${w * b} ÷ ${b} = ${w}.`;
      countLine = `Every ${b} parts make 1 whole: ${w} wholes.`;
    }
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt(nodes),
      operation: 'WHOLE_AS_FRACTION',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([tree('DIVIDE', 'Divide top by bottom', [divideLine, `Answer: ${answer}.`], result), tree('COUNT_WHOLES', 'Count wholes', [countLine, `Answer: ${answer}.`], result)]),
    });
  },
});

const compareFractions = defineSkill({
  id: 'g3.nf.compare-fractions',
  grade: '3',
  domain: 'NF',
  standards: ['3.NF.3d'],
  title: 'Compare fractions',
  generate(ctx) {
    const { rng } = ctx;
    const sameDenominator = ctx.difficulty === 'EASY' ? true : rng.bool();
    let n1: number;
    let d1: number;
    let n2: number;
    let d2: number;
    if (sameDenominator) {
      d1 = d2 = rng.choose(GRADE3_DENOMINATORS.filter((x) => x >= 3));
      n1 = rng.integer(1, d1 - 1);
      n2 = rng.bool(0.1) ? n1 : rng.integer(1, d1 - 1);
    } else {
      n1 = n2 = rng.integer(1, ctx.difficulty === 'HARD' ? 3 : 1);
      [d1, d2] = rng.sample(GRADE3_DENOMINATORS.filter((x) => x > n1), 2) as [number, number];
    }
    const a = rat(n1, d1);
    const b = rat(n2, d2);
    const symbol = compareSymbol(a, b);
    const rule =
      symbol === '='
        ? 'Same parts, same count: equal.'
        : sameDenominator
          ? 'Same size parts: more parts is bigger.'
          : 'Same number of parts: smaller denominator, bigger parts.';
    const result = A.choice(symbol);
    const cd = d1 === d2 ? d1 : d1 * d2;
    const an = (n1 * cd) / d1;
    const bn = (n2 * cd) / d2;
    return ctx.question({
      prompt: prompt([rf(n1, d1), P.blank('○'), rf(n2, d2)]),
      operation: 'COMPARE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(COMPARE_CHOICES),
      ...strategies([
        tree('REASON', 'Reason about size', [rule, [rf(n1, d1), P.op(symbol), rf(n2, d2)]], result),
        tree('COMMON_DENOMINATOR', 'Same denominator', [d1 === d2 ? `Both are already over ${cd}.` : `Write both over ${cd}: ${an}/${cd} and ${bn}/${cd}.`, `${an} ${symbol} ${bn}, so ${symbol}.`], result),
      ]),
    });
  },
});

/* -------------------------------- 3.MD -------------------------------- */

const tellTime = defineSkill({
  id: 'g3.md.tell-time',
  grade: '3',
  domain: 'MD',
  standards: ['3.MD.1'],
  title: 'Tell time to the minute',
  generate(ctx) {
    const { rng } = ctx;
    const hour = rng.integer(1, 12);
    const minute = ctx.difficulty === 'EASY' ? rng.integer(0, 11) * 5 : rng.integer(0, 59);
    const result = A.time(hour, minute);
    const fives = Math.floor(minute / 5);
    const ones = minute % 5;
    return ctx.question({
      prompt: prompt([P.text('What time is it?')], { v: 'clock', hour, minute }),
      operation: 'READ_CLOCK',
      canonicalAnswer: result,
      answerSchema: SCHEMA.time(),
      ...strategies([
        tree('READ_HANDS', 'Hour hand, then minute hand', [`Hour hand: ${minute === 0 ? 'on' : 'past'} ${hour}.`, `Minute hand: ${minute} minutes → ${formatClock(hour, minute)}.`], result),
        tree('COUNT_BY_FIVES', 'Count by 5s', [`${fives} ${plural(fives, 'jump', 'jumps')} of 5${ones ? ` + ${ones}` : ''} = ${minute} minutes.`, `${formatClock(hour, minute)}.`], result),
      ]),
    });
  },
});

const elapsedTime = defineSkill({
  id: 'g3.md.elapsed-time',
  grade: '3',
  domain: 'MD',
  standards: ['3.MD.1'],
  title: 'Elapsed time',
  generate(ctx) {
    const { rng } = ctx;
    const activity = rng.choose(['Practice', 'A movie', 'A lesson', 'A show', 'Art class']);
    const hour = rng.integer(1, 11);
    const kind = ctx.tier({ EASY: 'end', MEDIUM: rng.choose(['end', 'duration']), HARD: rng.choose(['end', 'duration', 'start']) });
    const [startMinute, duration] = ctx.retry(
      () => {
        const sm = ctx.difficulty === 'EASY' ? rng.integer(0, 6) * 5 : rng.integer(0, 59);
        const dur = ctx.tier({ EASY: rng.integer(2, 6) * 5, MEDIUM: rng.integer(12, 55), HARD: rng.integer(25, 95) });
        return [sm, dur] as const;
      },
      ([sm, dur]) => ctx.difficulty !== 'EASY' || sm + dur < 60,
    );
    const end = addMinutes(hour, startMinute, duration);
    const startText = formatClock(hour, startMinute);
    const endText = formatClock(end.hour, end.minute);
    const toHour = 60 - startMinute;
    const crosses = startMinute > 0 && startMinute + duration >= 60;
    const nextHour = addMinutes(hour, 0, 60).hour;
    const jumpLine = crosses ? `${startText} → ${nextHour}:00 is ${toHour} min; then ${duration - toHour} min more.` : `${startText} + ${duration} min.`;
    const sumMinutes = startMinute + duration;
    const tradeLine = sumMinutes >= 60 ? `${startMinute} + ${duration} = ${sumMinutes} min = ${Math.floor(sumMinutes / 60)} h ${sumMinutes % 60} min.` : `${startMinute} + ${duration} = ${sumMinutes} min.`;
    if (kind === 'duration') {
      const result = A.number(duration);
      return ctx.question({
        prompt: prompt([P.text(`${activity}: ${startText} to ${endText}. How many minutes?`)]),
        operation: 'ELAPSED_MINUTES',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(['minutes', 'minute', 'min']),
        ...strategies([
          tree('JUMP_TO_HOUR', 'Jump to the hour', [crosses ? `${startText} → ${nextHour}:00: ${toHour} min.` : `${startText} → ${endText}.`, crosses ? `${nextHour}:00 → ${endText}: ${duration - toHour} min. Total ${duration}.` : `${end.minute - startMinute} min.`], result),
          tree('SUBTRACT_TIMES', 'Minutes after the hour', [`Minutes after ${hour}:00: start ${startMinute}, end ${sumMinutes}.`, `${sumMinutes} − ${startMinute} = ${duration} min.`], result),
        ]),
      });
    }
    if (kind === 'start') {
      const result = A.time(hour, startMinute);
      return ctx.question({
        prompt: prompt([P.text(`${activity} lasts ${duration} min and ends at ${endText}. Start time?`)]),
        operation: 'START_TIME',
        canonicalAnswer: result,
        answerSchema: SCHEMA.time(),
        ...strategies([
          tree('COUNT_BACK', 'Count back', [`${endText} − ${duration} min.`, `Starts at ${startText}.`], result),
          tree('CHECK_FORWARD', 'Guess and check', [`Try ${startText}: ${jumpLine}`, `It ends at ${endText}, so ${startText}.`], result),
        ]),
      });
    }
    const result = A.time(end.hour, end.minute);
    return ctx.question({
      prompt: prompt([P.text(`${activity} starts at ${startText} and lasts ${duration} min. End time?`)]),
      operation: 'END_TIME',
      canonicalAnswer: result,
      answerSchema: SCHEMA.time(),
      ...strategies([
        tree('JUMP_TO_HOUR', 'Number line jumps', [jumpLine, `Ends at ${endText}.`], result),
        tree('ADD_MINUTES', 'Add the minutes', [tradeLine, `Ends at ${endText}.`], result),
      ]),
    });
  },
});

const massVolume = defineSkill({
  id: 'g3.md.mass-and-volume',
  grade: '3',
  domain: 'MD',
  standards: ['3.MD.2'],
  title: 'Mass and liquid volume',
  generate(ctx) {
    const { rng } = ctx;
    const op = rng.choose(ctx.difficulty === 'EASY' ? ['add', 'sub'] : ['add', 'sub', 'mul', 'div']);
    const unit = rng.choose([
      { name: 'grams', short: 'g', thing: 'clay' },
      { name: 'kilograms', short: 'kg', thing: 'flour' },
      { name: 'liters', short: 'L', thing: 'water' },
    ] as const);
    const units = [unit.name, unit.name.slice(0, -1), unit.short];
    const u = unit.short;
    const max = ctx.tier({ EASY: 20, MEDIUM: 100, HARD: 500 });
    let text: string;
    let answer: number;
    let trees;
    if (op === 'add') {
      const a = rng.integer(2, max / 2);
      const b = rng.integer(2, max / 2);
      answer = a + b;
      text = `${a} ${u} of ${unit.thing} and ${b} ${u} more. Total?`;
      trees = additionStrategies(a, b);
    } else if (op === 'sub') {
      const a = rng.integer(10, max);
      const b = rng.integer(1, a - 2);
      answer = a - b;
      text = `${a} ${u} of ${unit.thing}. ${b} ${u} used. How much is left?`;
      trees = subtractionStrategies(a, b);
    } else if (op === 'mul') {
      const each = rng.integer(2, 10);
      const n = rng.integer(2, 9);
      answer = each * n;
      text = `${n} bags, ${each} ${u} of ${unit.thing} each. Total?`;
      trees = multiplicationStrategies(n, each);
    } else {
      const n = rng.integer(2, 9);
      const each = rng.integer(2, 10);
      const total = n * each;
      answer = each;
      text = `${total} ${u} of ${unit.thing} split equally into ${n} bags. How much in each?`;
      trees = divisionStrategies(total, n);
    }
    return ctx.question({
      prompt: prompt([P.text(text)]),
      operation: op.toUpperCase(),
      canonicalAnswer: A.number(answer),
      answerSchema: SCHEMA.integer(units),
      ...strategies(trees),
    });
  },
});

const scaledGraph = defineSkill({
  id: 'g3.md.scaled-graph',
  grade: '3',
  domain: 'MD',
  standards: ['3.MD.3'],
  title: 'Read a picture graph',
  generate(ctx) {
    const { rng } = ctx;
    const scale = ctx.tier({ EASY: 2, MEDIUM: rng.choose([2, 5]), HARD: rng.choose([5, 10]) });
    const categories = rng.sample(['Apples', 'Bananas', 'Grapes', 'Oranges', 'Pears', 'Mangoes'], 4);
    const counts = rng.sample([1, 2, 3, 4, 5, 6, 7, 8], 4);
    const [i, j] = rng.sample([0, 1, 2, 3], 2) as [number, number];
    const [hi, lo] = (counts[i] as number) > (counts[j] as number) ? [i, j] : [j, i];
    const kind = ctx.difficulty === 'EASY' ? 'more' : rng.choose(['more', 'total']);
    const hc = counts[hi] as number;
    const lc = counts[lo] as number;
    const hiVotes = hc * scale;
    const loVotes = lc * scale;
    const answer = kind === 'more' ? hiVotes - loVotes : hiVotes + loVotes;
    const result = A.number(answer);
    const sym = kind === 'more' ? '−' : '+';
    const squares = kind === 'more' ? hc - lc : hc + lc;
    return ctx.question({
      prompt: prompt([P.text(kind === 'more' ? `How many more chose ${categories[hi]} than ${categories[lo]}?` : `How many chose ${categories[hi]} or ${categories[lo]}?`)], {
        v: 'table',
        headers: ['Fruit', `Votes (■ = ${scale})`],
        rows: categories.map((c, k) => [c, '■'.repeat(counts[k] as number)]),
      }),
      operation: kind === 'more' ? 'COMPARE_DATA' : 'COMBINE_DATA',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(['votes', 'vote', 'students', 'student']),
      ...strategies([
        tree('SCALE_EACH', 'Find each total', [`${hc} × ${scale} = ${hiVotes}; ${lc} × ${scale} = ${loVotes}.`, `${hiVotes} ${sym} ${loVotes} = ${answer}.`], result),
        tree('SQUARES_FIRST', 'Squares first', [`${hc} ${sym} ${lc} = ${squares} ${plural(squares, 'square', 'squares')}.`, `${squares} × ${scale} = ${answer}.`], result),
      ]),
    });
  },
});

const area = defineSkill({
  id: 'g3.md.area',
  grade: '3',
  domain: 'MD',
  standards: ['3.MD.7'],
  title: 'Area of rectangles',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'EASY') {
      const rows = rng.integer(2, 6);
      const cols = rng.integer(2, 7);
      const answer = rows * cols;
      const result = A.number(answer);
      return ctx.question({
        prompt: prompt([P.text('Each square = 1 square unit. Area?')], { v: 'array', rows, columns: cols, emoji: '🟦' }),
        operation: 'AREA_COUNT',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(['square units', 'square unit', 'sq units', 'units']),
        ...strategies([
          tree('MULTIPLY_SIDES', 'Rows × columns', [`${rows} rows × ${cols} columns.`, `${rows} × ${cols} = ${answer} square units.`], result),
          tree('COUNT_ROWS', 'Add the rows', [`Each row has ${cols} squares.`, `${Array(rows).fill(cols).join(' + ')} = ${answer}.`], result),
        ]),
        standards: ['3.MD.6', '3.MD.7a'],
      });
    }
    const unit = rng.choose([
      { plural: 'feet', short: 'ft' },
      { plural: 'meters', short: 'm' },
      { plural: 'centimeters', short: 'cm' },
      { plural: 'inches', short: 'in' },
    ] as const);
    const units = [`square ${unit.plural}`, `sq ${unit.short}`, `${unit.short}²`, `${unit.short}^2`, `${unit.short}2`];
    const u = unit.short;
    if (ctx.difficulty === 'MEDIUM') {
      const l = rng.integer(3, 10);
      const w = rng.integer(2, 9);
      const answer = l * w;
      const result = A.number(answer);
      return ctx.question({
        prompt: prompt([P.text(`Area of a ${l} ${u} by ${w} ${u} rectangle?`)], { v: 'shape', shape: 'rectangle', label: `${l} ${u} by ${w} ${u}` }),
        operation: 'AREA_MULTIPLY',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(units),
        ...strategies([
          tree('LENGTH_TIMES_WIDTH', 'Length × width', [`${l} × ${w} = ${answer}.`, `${answer} sq ${u}.`], result),
          tree('ROWS_OF_SQUARES', 'Rows of unit squares', [`${w} rows of ${l} squares.`, `${l} × ${w} = ${answer} sq ${u}.`], result),
        ]),
        standards: ['3.MD.7b'],
      });
    }
    // HARD: L-shape = big rectangle with a corner cut out (area is additive).
    const L = rng.integer(5, 10);
    const W = rng.integer(4, 9);
    const a = rng.integer(1, L - 2);
    const b = rng.integer(1, W - 2);
    const answer = L * W - a * b;
    const result = A.number(answer);
    const left = (L - a) * W;
    const right = a * (W - b);
    return ctx.question({
      prompt: prompt([P.text(`${L} ${u} × ${W} ${u} rectangle with a ${a} ${u} × ${b} ${u} corner cut out. Area?`)]),
      operation: 'AREA_ADDITIVE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(units),
      ...strategies([
        tree('SUBTRACT_CORNER', 'Subtract the corner', [`${L} × ${W} = ${L * W}; ${a} × ${b} = ${a * b}.`, `${L * W} − ${a * b} = ${answer} sq ${u}.`], result),
        tree('SPLIT_RECTANGLES', 'Split into 2 rectangles', [`${L - a} × ${W} = ${left}; ${a} × ${W - b} = ${right}.`, `${left} + ${right} = ${answer} sq ${u}.`], result),
      ]),
      standards: ['3.MD.7d'],
    });
  },
});

const perimeter = defineSkill({
  id: 'g3.md.perimeter',
  grade: '3',
  domain: 'MD',
  standards: ['3.MD.8'],
  title: 'Perimeter',
  generate(ctx) {
    const { rng } = ctx;
    const cmUnits = ['centimeters', 'centimeter', 'cm'];
    if (ctx.difficulty === 'EASY') {
      const l = rng.integer(2, 12);
      const w = rng.integer(2, 10);
      const answer = 2 * (l + w);
      const result = A.number(answer);
      return ctx.question({
        prompt: prompt([P.text(`Perimeter of a ${l} cm by ${w} cm rectangle?`)], { v: 'shape', shape: 'rectangle', label: `${l} cm by ${w} cm` }),
        operation: 'PERIMETER',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(cmUnits),
        ...strategies([
          tree('ADD_SIDES', 'Add all 4 sides', [`${l} + ${w} + ${l} + ${w}`, `= ${answer} cm.`], result),
          tree('DOUBLE', 'Double length + width', [`${l} + ${w} = ${l + w}.`, `2 × ${l + w} = ${answer} cm.`], result),
        ]),
      });
    }
    const sidesCount = rng.choose([3, 4, 5, 6]);
    const shapeName = sidesCount === 3 ? 'triangle' : sidesCount === 4 ? 'quadrilateral' : sidesCount === 5 ? 'pentagon' : 'hexagon';
    const sides = Array.from({ length: sidesCount }, () => rng.integer(2, ctx.difficulty === 'HARD' ? 25 : 12));
    const total = sides.reduce((s, x) => s + x, 0);
    if (ctx.difficulty === 'MEDIUM') {
      return ctx.question({
        prompt: prompt([P.text(`Sides: ${sides.join(', ')} cm. Perimeter?`)]),
        operation: 'PERIMETER',
        canonicalAnswer: A.number(total),
        answerSchema: SCHEMA.integer(cmUnits),
        ...strategies(multiAdditionStrategies(sides)),
      });
    }
    const missing = sides[sidesCount - 1] as number;
    const known = sides.slice(0, -1);
    const knownSum = total - missing;
    const result = A.number(missing);
    const peel: string[] = [];
    let left = total;
    for (const s of known) left -= s;
    peel.push(`${total} − ${known.join(' − ')} = ${left}.`);
    return ctx.question({
      prompt: prompt([P.text(`A ${shapeName} has perimeter ${total} cm. Sides: ${known.join(', ')} cm, and ?. Find ?.`)]),
      operation: 'UNKNOWN_SIDE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(cmUnits),
      ...strategies([
        tree('ADD_THEN_SUBTRACT', 'Add, then subtract', [`Known sides: ${known.join(' + ')} = ${knownSum}.`, `${total} − ${knownSum} = ${missing} cm.`], result),
        tree('SUBTRACT_EACH', 'Subtract each side', [peel[0] as string, `Missing side: ${missing} cm.`], result),
      ]),
    });
  },
});

/* -------------------------------- 3.G --------------------------------- */

const QUADS = ['square', 'rectangle', 'rhombus', 'trapezoid'] as const;
const NON_QUADS = ['triangle', 'pentagon', 'hexagon'] as const;
const SIDES: Record<string, number> = { square: 4, rectangle: 4, rhombus: 4, trapezoid: 4, triangle: 3, pentagon: 5, hexagon: 6 };

const quadrilaterals = defineSkill({
  id: 'g3.g.quadrilaterals',
  grade: '3',
  domain: 'G',
  standards: ['3.G.1'],
  title: 'Quadrilaterals',
  generate(ctx) {
    const { rng } = ctx;
    const kind = ctx.tier({ EASY: 'is-quad', MEDIUM: rng.choose(['is-quad', 'not-quad']), HARD: rng.choose(['not-quad', 'shared']) });
    if (kind === 'is-quad') {
      const shape = rng.choose([...QUADS, ...NON_QUADS]);
      const yes = (QUADS as readonly string[]).includes(shape);
      const result = A.choice(yes ? 'yes' : 'no');
      return ctx.question({
        prompt: prompt([P.text(`Is a ${shape} a quadrilateral?`)], { v: 'shape', shape }),
        operation: 'CLASSIFY',
        canonicalAnswer: result,
        answerSchema: SCHEMA.choice(YES_NO_CHOICES),
        ...strategies([
          tree('COUNT_SIDES', 'Count the sides', [`A ${shape} has ${SIDES[shape]} sides.`, `Quadrilateral = 4 sides → ${yes ? 'Yes' : 'No'}.`], result),
          tree('KNOWN_FAMILY', 'Know the family', ['Squares, rectangles, rhombuses, trapezoids are quadrilaterals.', yes ? 'Yes.' : 'No.'], result),
        ]),
      });
    }
    if (kind === 'not-quad') {
      const odd = rng.choose(NON_QUADS);
      const { choices, correctId } = makeChoices(rng, odd, QUADS);
      const result = A.choice(correctId);
      return ctx.question({
        prompt: prompt([P.text('Which is NOT a quadrilateral?')]),
        operation: 'CLASSIFY',
        canonicalAnswer: result,
        answerSchema: SCHEMA.choice(choices),
        ...strategies([
          tree('COUNT_SIDES', 'Count the sides', [`A ${odd} has ${SIDES[odd]} sides.`, `Not 4 sides → ${odd}.`], result),
          tree('ELIMINATE', 'Cross out 4-sided shapes', ['The others all have 4 sides.', `Left: ${odd}.`], result),
        ]),
      });
    }
    const options = [
      { pair: ['rectangle', 'rhombus'], correct: '4 sides', wrong: ['4 right angles', '4 equal sides', '3 sides'], rule: 'Both are quadrilaterals: 4 sides.', counter: 'A rhombus may lack right angles.' },
      { pair: ['square', 'rectangle'], correct: '4 right angles', wrong: ['4 equal sides', '3 sides', '5 sides'], rule: 'A square is a rectangle: 4 right angles.', counter: 'A long rectangle has unequal sides.' },
      { pair: ['square', 'rhombus'], correct: '4 equal sides', wrong: ['4 right angles', '3 sides', '5 sides'], rule: 'A square is a rhombus: 4 equal sides.', counter: 'A slanted rhombus has no right angles.' },
    ] as const;
    const pick = rng.choose(options);
    const { choices, correctId } = makeChoices(rng, `${pick.correct}`, pick.wrong);
    const result = A.choice(correctId);
    return ctx.question({
      prompt: prompt([P.text(`What do EVERY ${pick.pair[0]} and EVERY ${pick.pair[1]} have?`)]),
      operation: 'SHARED_ATTRIBUTE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(choices),
      ...strategies([
        tree('DEFINITIONS', 'Use definitions', [pick.rule, `${pick.correct}.`], result),
        tree('COUNTER_EXAMPLE', 'Test examples', [pick.counter, `Only “${pick.correct}” always works.`], result),
      ]),
    });
  },
});

export const GRADE_3_SKILLS: readonly Skill[] = [
  multiplicationFacts,
  divisionFacts,
  equalGroups,
  shareEqually,
  unknownNumber,
  properties,
  twoStepWord,
  patterns,
  rounding,
  addSubtract1000,
  timesTens,
  fractionModel,
  numberLine,
  equivalentFractions,
  wholeNumbersAsFractions,
  compareFractions,
  tellTime,
  elapsedTime,
  massVolume,
  scaledGraph,
  area,
  perimeter,
  quadrilaterals,
];
