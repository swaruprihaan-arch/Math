/**
 * Grade 2 practice skills (California CCSSM, including CA additions 2.NBT.2 skip-count by 2s, 2.NBT.7.1 estimation,
 * and 2.MD.7 time relationships). Few words on screen; every question has at least two ways to solve it.
 *
 * Standards NOT covered by auto-generated practice, and why:
 *   2.NBT.9  explaining why strategies work — open-ended explanation (every question shows strategies instead).
 *   2.MD.1   selecting and using rulers/meter sticks — needs physical measuring tools.
 *   2.MD.9   generating measurement data and drawing a line plot — needs physical measuring and drawing.
 */
import { A, COMPARE_CHOICES, P } from '../../domain/question/build';
import type { PromptNode } from '../../domain/question/types';
import { rat } from '../../domain/rational/rational';
import { additionStrategies, multiAdditionStrategies, subtractionStrategies } from '../../solutions/strategies/wholeNumber';
import { fixedChoices, makeChoices, pickItem, pickName, pickNames, plural } from '../helpers';
import { defineSkill } from '../skill';
import type { Skill } from '../types';
import {
  additionSubtractionStory,
  buildWays,
  capitalize,
  centsQ,
  choiceQ,
  clockWays,
  dollarText,
  dollarsQ,
  intQ,
  numberToWords,
  sequenceNodes,
  timeQ,
  way,
  withIntro,
  type StoryKind,
} from './_k2Helpers';

/** 2.OA.1 — One-step story problems within 100, unknowns in all positions. */
const wordProblems = defineSkill({
  id: 'g2.oa.word-problems',
  grade: '2',
  domain: 'OA',
  standards: ['2.OA.1'],
  title: 'Story problems within 100',
  generate(ctx) {
    const kinds = ctx.tier<StoryKind[]>({
      EASY: ['ADD_TO_RESULT', 'TAKE_FROM_RESULT', 'PUT_TOGETHER_TOTAL'],
      MEDIUM: ['ADD_TO_RESULT', 'TAKE_FROM_RESULT', 'ADD_TO_CHANGE', 'COMPARE_DIFFERENCE'],
      HARD: ['TAKE_FROM_CHANGE', 'ADD_TO_START', 'COMPARE_BIGGER', 'COMPARE_DIFFERENCE'],
    });
    const story = additionSubtractionStory(ctx, kinds, ctx.tier({ EASY: 50, MEDIUM: 100, HARD: 100 }), 20);
    const { op, a, b } = story.compute;
    return intQ(ctx, {
      nodes: [P.text(story.text)],
      answer: story.answer,
      operation: story.kind,
      ways: withIntro(op === 'ADD' ? additionStrategies(a, b) : subtractionStrategies(a, b), `Write it: ${story.equation}`),
    });
  },
});

/** 2.OA.1 — Two-step story problems within 100. */
const twoStep = defineSkill({
  id: 'g2.oa.two-step',
  grade: '2',
  domain: 'OA',
  standards: ['2.OA.1'],
  title: 'Two-step story problems',
  generate(ctx) {
    const { rng } = ctx;
    const item = pickItem(rng);
    const [n, m] = pickNames(rng, 2) as [string, string];
    if (ctx.difficulty === 'HARD') {
      const a = rng.integer(10, 40);
      const b = rng.integer(2, 20);
      const other = a + b;
      const total = a + other;
      return intQ(ctx, {
        nodes: [P.text(`${m} has ${a} ${item.plural}. ${n} has ${b} more. How many together?`)],
        answer: total,
        operation: 'TWO_STEP',
        ways: [
          way('FIND_FIRST', 'Find the missing amount first', `${n}: ${a} + ${b} = ${other}.`, `Together: ${a} + ${other} = ${total}.`),
          way('DOUBLE_THEN_ADD', 'Double, then add', `${a} + ${a} = ${2 * a}.`, `Add the ${b} extra: ${2 * a} + ${b} = ${total}.`),
        ],
      });
    }
    const max = ctx.tier({ EASY: 50, MEDIUM: 100, HARD: 100 });
    const a = rng.integer(5, Math.floor(max / 2));
    const b = rng.integer(2, Math.floor(max / 2) - 1);
    const c = rng.integer(1, a + b - 1);
    const answer = a + b - c;
    const net = b - c;
    return intQ(ctx, {
      nodes: [P.text(`${n} has ${a} ${item.plural}. Gets ${b} more. Gives away ${c}. How many now?`)],
      answer,
      operation: 'TWO_STEP',
      ways: [
        way('STEP_BY_STEP', 'One step at a time', `${a} + ${b} = ${a + b}.`, `${a + b} − ${c} = ${answer}.`),
        way(
          'NET_CHANGE',
          'Combine the changes',
          net >= 0 ? `Got ${b}, gave ${c}: that is ${net} more.` : `Got ${b}, gave ${c}: that is ${-net} fewer.`,
          net >= 0 ? `${a} + ${net} = ${answer}.` : `${a} − ${-net} = ${answer}.`,
        ),
      ],
    });
  },
});

/** 2.OA.2 — Fluently add and subtract within 20. */
const fluency20 = defineSkill({
  id: 'g2.oa.fluency-20',
  grade: '2',
  domain: 'OA',
  standards: ['2.OA.2'],
  title: 'Facts within 20',
  generate(ctx) {
    const { rng } = ctx;
    const a = rng.integer(2, 9);
    const b = rng.integer(2, 9);
    const s = a + b;
    if (ctx.difficulty === 'EASY') {
      return intQ(ctx, { nodes: [P.num(a), P.op('+'), P.num(b), P.op('='), P.blank()], answer: s, operation: 'ADD', ways: additionStrategies(a, b) });
    }
    if (ctx.difficulty === 'MEDIUM') {
      return intQ(ctx, { nodes: [P.num(s), P.op('−'), P.num(a), P.op('='), P.blank()], answer: b, operation: 'SUBTRACT', ways: subtractionStrategies(s, a) });
    }
    if (rng.bool()) {
      return intQ(ctx, { nodes: [P.blank(), P.op('+'), P.num(a), P.op('='), P.num(s)], answer: b, operation: 'ADDEND_UNKNOWN', ways: withIntro(subtractionStrategies(s, a), `Find ${s} − ${a}.`) });
    }
    return intQ(ctx, { nodes: [P.num(s), P.op('−'), P.blank(), P.op('='), P.num(b)], answer: a, operation: 'SUBTRAHEND_UNKNOWN', ways: withIntro(subtractionStrategies(s, b), `Find ${s} − ${b}.`) });
  },
});

/** 2.OA.3 — Odd or even; even numbers as doubles. */
const oddEven = defineSkill({
  id: 'g2.oa.odd-even',
  grade: '2',
  domain: 'OA',
  standards: ['2.OA.3'],
  title: 'Odd and even',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD' && rng.bool(0.6)) {
      const half = rng.integer(2, 10);
      const n = 2 * half;
      return intQ(ctx, {
        nodes: [P.num(n), P.op('='), P.blank(), P.op('+'), P.blank(), P.br(), P.text('Same number in both boxes.')],
        answer: half,
        operation: 'EVEN_AS_DOUBLE',
        ways: [
          way('SPLIT_EQUALLY', 'Split into 2 equal groups', `Share ${n} into 2 equal groups.`, `Each group has ${half}.`),
          way('DOUBLES_FACT', 'Doubles fact', `${half} + ${half} = ${n}.`),
        ],
      });
    }
    const n = ctx.difficulty === 'EASY' ? rng.integer(2, 10) : rng.integer(1, 20);
    const odd = n % 2 === 1;
    const item = pickItem(rng);
    const pairs = Math.floor(n / 2);
    return choiceQ(ctx, {
      nodes: ctx.difficulty === 'EASY' ? [P.text('Odd or even?')] : [P.text('Is '), P.num(n), P.text(' odd or even?')],
      ...(ctx.difficulty === 'EASY' ? { visual: { v: 'objects' as const, groups: [{ emoji: item.emoji, count: n, label: plural(n, item.singular, item.plural) }] } } : {}),
      choices: fixedChoices(['Odd', 'Even']),
      correctId: odd ? 'odd' : 'even',
      operation: 'ODD_EVEN',
      ways: [
        way('MAKE_PAIRS', 'Make pairs', `${n} makes ${pairs} pair${pairs === 1 ? '' : 's'}${odd ? ' and 1 left over' : ''}.`, odd ? 'One left over: odd.' : 'None left over: even.'),
        way('ONES_DIGIT', 'Look at the ones digit', `${n} ends in ${n % 10}.`, odd ? 'Ends in 1, 3, 5, 7, 9: odd.' : 'Ends in 0, 2, 4, 6, 8: even.'),
      ],
    });
  },
});

const ARRAY_EMOJIS = ['⭐', '🍎', '🌼', '🟦', '🍪'];

/** 2.OA.4 — Total in a rectangular array (≤ 5 × 5) using repeated addition. */
const arrays = defineSkill({
  id: 'g2.oa.arrays',
  grade: '2',
  domain: 'OA',
  standards: ['2.OA.4'],
  title: 'Arrays',
  generate(ctx) {
    const { rng } = ctx;
    const hi = ctx.tier({ EASY: 3, MEDIUM: 5, HARD: 5 });
    const rows = rng.integer(2, hi);
    const cols = rng.integer(2, hi);
    const total = rows * cols;
    const sumText = Array.from({ length: rows }, () => cols).join(' + ');
    const skip = Array.from({ length: rows }, (_, i) => (i + 1) * cols).join(', ');
    const ways = [
      way('ADD_ROWS', 'Add the rows', `Each row has ${cols}.`, `${sumText} = ${total}.`),
      way('SKIP_COUNT', 'Skip count', `Count by ${cols}s: ${skip}.`),
    ];
    if (ctx.difficulty === 'HARD') {
      return intQ(ctx, { nodes: [P.text(`${rows} rows of ${cols}. How many in all?`)], answer: total, operation: 'ARRAY_TOTAL', ways });
    }
    return intQ(ctx, {
      nodes: [P.text('How many in all?')],
      visual: { v: 'array', rows, columns: cols, emoji: rng.choose(ARRAY_EMOJIS) },
      answer: total,
      operation: 'ARRAY_TOTAL',
      ways,
    });
  },
});

const PLACE = ['ones', 'tens', 'hundreds'] as const;

/** 2.NBT.1 — Hundreds, tens, and ones. */
const placeValue = defineSkill({
  id: 'g2.nbt.place-value',
  grade: '2',
  domain: 'NBT',
  standards: ['2.NBT.1'],
  title: 'Hundreds, tens, and ones',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD') {
      if (rng.bool(0.4)) {
        const askTens = rng.bool();
        const h = rng.integer(1, 9);
        return intQ(ctx, {
          nodes: [P.text(askTens ? 'How many tens make 100?' : `How many hundreds in ${h * 100}?`)],
          answer: askTens ? 10 : h,
          operation: askTens ? 'TENS_IN_HUNDRED' : 'HUNDREDS',
          standards: [askTens ? '2.NBT.1a' : '2.NBT.1b'],
          ways: askTens
            ? [way('SKIP_COUNT', 'Count by 10s', '10, 20, 30, … 100.', 'That is 10 tens.'), way('BUNDLE', 'Bundle', 'A hundred is a bundle of 10 tens.')]
            : [way('READ_DIGIT', 'Read the hundreds digit', `${h * 100} has ${h} in the hundreds place.`), way('COUNT_HUNDREDS', 'Count by 100s', `${Array.from({ length: h }, (_, i) => (i + 1) * 100).join(', ')}.`, `That is ${h} hundreds.`)],
        });
      }
      const h = rng.integer(1, 9);
      const t = rng.bool(0.5) ? 0 : rng.integer(1, 9);
      const o = t === 0 ? rng.integer(1, 9) : rng.bool(0.4) ? 0 : rng.integer(1, 9);
      const n = h * 100 + t * 10 + o;
      return intQ(ctx, {
        nodes: [P.text(`${h} hundreds, ${t} tens, ${o} ones = ?`)],
        answer: n,
        operation: 'COMPOSE',
        ways: [
          way('EXPANDED', 'Add the parts', `${h * 100} + ${t * 10} + ${o} = ${n}.`),
          way('PLACE_CHART', 'Place value chart', `Hundreds ${h}, tens ${t}, ones ${o}.`, `Write the digits: ${n}.`),
        ],
      });
    }
    const n = ctx.retry(
      () => rng.integer(101, 999),
      (v) => new Set(String(v)).size === 3 && !String(v).includes('0'),
    );
    const digits = String(n).split('').map(Number) as [number, number, number];
    const place = rng.integer(0, 2); // 0 ones, 1 tens, 2 hundreds
    const digit = digits[2 - place] as number;
    if (ctx.difficulty === 'EASY') {
      return intQ(ctx, {
        nodes: [P.text(`How many ${PLACE[place]} in `), P.num(n), P.text('?')],
        answer: digit,
        operation: 'READ_PLACE',
        ways: [
          way('READ_DIGIT', 'Read the digit', `In ${n}, the ${PLACE[place]} digit is ${digit}.`),
          way('EXPANDED', 'Expanded form', `${n} = ${digits[0] * 100} + ${digits[1] * 10} + ${digits[2]}.`, `So ${digit} ${PLACE[place]}.`),
        ],
      });
    }
    const value = digit * 10 ** place;
    return intQ(ctx, {
      nodes: [P.text(`What is the ${digit} worth in `), P.num(n), P.text('?')],
      answer: value,
      operation: 'DIGIT_VALUE',
      ways: [
        way('PLACE_NAME', 'Name the place', `The ${digit} is in the ${PLACE[place]} place.`, `${digit} ${PLACE[place]} = ${value}.`),
        way('EXPANDED', 'Expanded form', `${n} = ${digits[0] * 100} + ${digits[1] * 10} + ${digits[2]}.`, `The ${digit} part is ${value}.`),
      ],
    });
  },
});

/** 2.NBT.2 (CA) — Count within 1000; skip-count by 2s, 5s, 10s, and 100s. */
const skipCount = defineSkill({
  id: 'g2.nbt.skip-count',
  grade: '2',
  domain: 'NBT',
  standards: ['2.NBT.2'],
  title: 'Skip count by 2s, 5s, 10s, 100s',
  generate(ctx) {
    const { rng } = ctx;
    const by = rng.choose(ctx.tier({ EASY: [2, 5, 10], MEDIUM: [2, 5, 10, 100], HARD: [2, 5, 10, 100] }));
    const limit = by === 100 ? 999 : ctx.tier({ EASY: 60, MEDIUM: 500, HARD: 990 });
    const maxStartUnits = Math.floor((limit - 3 * by) / by);
    const start = ctx.difficulty === 'HARD' ? rng.integer(1, limit - 3 * by) : rng.integer(0, Math.max(0, maxStartUnits)) * by;
    const seq = [start, start + by, start + 2 * by, start + 3 * by];
    const missing = ctx.difficulty === 'EASY' ? 3 : rng.integer(0, 3);
    const answer = seq[missing] as number;
    return intQ(ctx, {
      nodes: [P.text(`Skip count by ${by}s. What is missing?`), P.br(), ...sequenceNodes(seq, missing)],
      answer,
      operation: 'SKIP_COUNT',
      ways: [
        way('SAY_IT', `Count by ${by}s`, `Say: ${seq.join(', ')}.`),
        missing === 0
          ? way('SUBTRACT_STEP', `Take away ${by}`, `${seq[1]} − ${by} = ${answer}.`)
          : way('ADD_STEP', `Add ${by}`, `${answer - by} + ${by} = ${answer}.`),
      ],
    });
  },
});

/** 2.NBT.3 — Read and write numbers: numerals, number names, expanded form. */
const readWrite = defineSkill({
  id: 'g2.nbt.read-write-numbers',
  grade: '2',
  domain: 'NBT',
  standards: ['2.NBT.3'],
  title: 'Number names and expanded form',
  generate(ctx) {
    const { rng } = ctx;
    const h = rng.integer(1, 9);
    const t = ctx.difficulty === 'HARD' && rng.bool(0.5) ? 0 : rng.integer(0, 9);
    const o = rng.integer(ctx.difficulty === 'HARD' && t === 0 ? 1 : 0, 9);
    const n = h * 100 + t * 10 + o;
    const parts = [h * 100, t * 10, o].filter((x) => x > 0);
    const ways = [
      way('PLACE_VALUE', 'Place value', `${h} hundreds, ${t} tens, ${o} ones.`, `That is ${n}.`),
      way('ADD_PARTS', 'Add the parts', `${parts.join(' + ')} = ${n}.`),
    ];
    if (ctx.difficulty === 'MEDIUM') {
      return intQ(ctx, {
        nodes: [P.text(`Write as a number: ${numberToWords(n)}`)],
        answer: n,
        operation: 'FROM_WORDS',
        ways: [
          way('HEAR_THE_PARTS', 'Listen for the parts', `"${numberToWords(h)} hundred" → ${h * 100}.`, n % 100 ? `"${numberToWords(n % 100)}" → ${n % 100}. Total ${n}.` : `Nothing more: ${n}.`),
          ways[0] as (typeof ways)[number],
        ],
      });
    }
    const ordered = ctx.difficulty === 'HARD' ? rng.shuffle(parts) : parts;
    const nodes: PromptNode[] = [];
    ordered.forEach((p, i) => {
      if (i > 0) nodes.push(P.op('+'));
      nodes.push(P.num(p));
    });
    nodes.push(P.op('='), P.blank());
    return intQ(ctx, { nodes, answer: n, operation: 'FROM_EXPANDED', ways });
  },
});

/** 2.NBT.4 — Compare three-digit numbers with >, =, <. */
const compareThreeDigit = defineSkill({
  id: 'g2.nbt.compare',
  grade: '2',
  domain: 'NBT',
  standards: ['2.NBT.4'],
  title: 'Compare three-digit numbers',
  generate(ctx) {
    const { rng } = ctx;
    const [a, b] = ctx.retry(
      () => {
        const p = rng.integer(100, 999);
        if (ctx.difficulty === 'HARD' && rng.bool(0.15)) return [p, p] as const;
        return [p, rng.integer(100, 999)] as const;
      },
      ([p, q]) => {
        const sameH = Math.floor(p / 100) === Math.floor(q / 100);
        const sameT = Math.floor(p / 10) === Math.floor(q / 10);
        if (ctx.difficulty === 'EASY') return !sameH;
        if (ctx.difficulty === 'MEDIUM') return sameH && !sameT;
        return p === q || sameT;
      },
    );
    const sym = a > b ? '>' : a < b ? '<' : '=';
    const place = Math.floor(a / 100) !== Math.floor(b / 100) ? 2 : Math.floor(a / 10) !== Math.floor(b / 10) ? 1 : 0;
    const da = Math.floor(a / 10 ** place) % 10;
    const db = Math.floor(b / 10 ** place) % 10;
    return choiceQ(ctx, {
      nodes: [P.num(a), P.blank(), P.num(b)],
      choices: COMPARE_CHOICES,
      correctId: sym,
      operation: 'COMPARE',
      ways: [
        way('BIGGEST_PLACE_FIRST', 'Biggest place first', a === b ? 'Every digit is the same.' : `First different place: ${PLACE[place]} (${da} vs ${db}).`, `So ${a} ${sym} ${b}.`),
        way('NUMBER_LINE', 'Number line', a === b ? 'Same spot on the line.' : `${Math.max(a, b)} is farther right.`, `So ${a} ${sym} ${b}.`),
      ],
    });
  },
});

/** 2.NBT.5 — Fluently add and subtract within 100. */
const addSub100 = defineSkill({
  id: 'g2.nbt.add-sub-100',
  grade: '2',
  domain: 'NBT',
  standards: ['2.NBT.5'],
  title: 'Add and subtract within 100',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD') {
      const [a, b] = ctx.retry(
        () => [rng.integer(30, 99), rng.integer(11, 89)] as const,
        ([p, q]) => q < p && p % 10 < q % 10,
      );
      return intQ(ctx, { nodes: [P.num(a), P.op('−'), P.num(b), P.op('='), P.blank()], answer: a - b, operation: 'SUBTRACT', ways: subtractionStrategies(a, b) });
    }
    const regroup = ctx.difficulty === 'MEDIUM';
    const [a, b] = ctx.retry(
      () => [rng.integer(11, 79), rng.integer(11, 79)] as const,
      ([p, q]) => p + q <= 99 && ((p % 10) + (q % 10) >= 10) === regroup,
    );
    return intQ(ctx, { nodes: [P.num(a), P.op('+'), P.num(b), P.op('='), P.blank()], answer: a + b, operation: 'ADD', ways: additionStrategies(a, b) });
  },
});

/** 2.NBT.6 — Add up to four two-digit numbers. */
const addUpToFour = defineSkill({
  id: 'g2.nbt.add-four-numbers',
  grade: '2',
  domain: 'NBT',
  standards: ['2.NBT.6'],
  title: 'Add up to four two-digit numbers',
  generate(ctx) {
    const { rng } = ctx;
    const count = ctx.tier({ EASY: 2, MEDIUM: 3, HARD: 4 });
    const addends = Array.from({ length: count }, () => rng.integer(10, 49));
    const nodes: PromptNode[] = [];
    addends.forEach((x, i) => {
      if (i > 0) nodes.push(P.op('+'));
      nodes.push(P.num(x));
    });
    nodes.push(P.op('='), P.blank());
    return intQ(ctx, {
      nodes,
      answer: addends.reduce((s, x) => s + x, 0),
      operation: 'ADD_MANY',
      ways: count === 2 ? additionStrategies(addends[0] as number, addends[1] as number) : multiAdditionStrategies(addends),
    });
  },
});

/** 2.NBT.7 — Add and subtract within 1000. */
const addSub1000 = defineSkill({
  id: 'g2.nbt.add-sub-1000',
  grade: '2',
  domain: 'NBT',
  standards: ['2.NBT.7'],
  title: 'Add and subtract within 1000',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD') {
      const [a, b] = ctx.retry(
        () => [rng.integer(300, 999), rng.integer(101, 899)] as const,
        ([p, q]) => q < p && (p % 10 < q % 10 || Math.floor(p / 10) % 10 < Math.floor(q / 10) % 10),
      );
      return intQ(ctx, { nodes: [P.num(a), P.op('−'), P.num(b), P.op('='), P.blank()], answer: a - b, operation: 'SUBTRACT', ways: subtractionStrategies(a, b) });
    }
    const regroup = ctx.difficulty === 'MEDIUM';
    const [a, b] = ctx.retry(
      () => [rng.integer(100, 799), rng.integer(100, 799)] as const,
      ([p, q]) => {
        const carries = (p % 10) + (q % 10) >= 10 || (Math.floor(p / 10) % 10) + (Math.floor(q / 10) % 10) >= 10;
        return p + q <= 999 && carries === regroup;
      },
    );
    return intQ(ctx, { nodes: [P.num(a), P.op('+'), P.num(b), P.op('='), P.blank()], answer: a + b, operation: 'ADD', ways: additionStrategies(a, b) });
  },
});

function roundTo(n: number, unit: number): number {
  return Math.round(n / unit) * unit;
}

/** 2.NBT.7.1 (CA) — Use estimation strategies to make reasonable estimates. */
const estimate = defineSkill({
  id: 'g2.nbt.estimate',
  grade: '2',
  domain: 'NBT',
  standards: ['2.NBT.7.1'],
  title: 'Estimate sums and differences',
  generate(ctx) {
    const { rng } = ctx;
    const unit = ctx.difficulty === 'HARD' ? 100 : 10;
    const subtract = ctx.difficulty === 'MEDIUM';
    // Avoid halfway digits (5 ones / 5 tens) so "nearest" is never ambiguous.
    const ok = (n: number) => Math.floor((n % unit) / (unit / 10)) !== 5 && n % unit !== 0;
    const [a, b] = ctx.retry(
      () => (unit === 100 ? [rng.integer(110, 690), rng.integer(110, 690)] : [rng.integer(11, 89), rng.integer(11, 89)]) as [number, number],
      ([p, q]) => ok(p) && ok(q) && (subtract ? roundTo(p, unit) > roundTo(q, unit) && p > q : roundTo(p, unit) + roundTo(q, unit) <= (unit === 100 ? 1400 : 180)),
    );
    const ra = roundTo(a, unit);
    const rb = roundTo(b, unit);
    const est = subtract ? ra - rb : ra + rb;
    const sym = subtract ? '−' : '+';
    const distractors = [est - unit, est + unit, est + 2 * unit].filter((x) => x >= 0).map(String);
    const { choices, correctId } = makeChoices(rng, String(est), distractors, 4);
    const unitName = unit === 100 ? 'hundred' : 'ten';
    const between = (n: number) => `${n} is between ${Math.floor(n / unit) * unit} and ${Math.floor(n / unit) * unit + unit}; closer to ${roundTo(n, unit)}.`;
    return choiceQ(ctx, {
      nodes: [P.text(`Round to the nearest ${unitName}. Estimate:`), P.br(), P.num(a), P.op(sym), P.num(b)],
      choices,
      correctId,
      operation: subtract ? 'ESTIMATE_DIFFERENCE' : 'ESTIMATE_SUM',
      ways: [
        way('ROUND_THEN_COMPUTE', `Round to the nearest ${unitName}`, `${a} → ${ra}. ${b} → ${rb}.`, `${ra} ${sym} ${rb} = ${est}.`),
        way('NUMBER_LINE', 'Number line', between(a), between(b), `${ra} ${sym} ${rb} = ${est}.`),
      ],
    });
  },
});

/** 2.NBT.8 — Mentally add or subtract 10 or 100 (100–900). */
const mental10100 = defineSkill({
  id: 'g2.nbt.mental-10-100',
  grade: '2',
  domain: 'NBT',
  standards: ['2.NBT.8'],
  title: '10 or 100 more or less',
  generate(ctx) {
    const { rng } = ctx;
    const step = ctx.tier({ EASY: 10, MEDIUM: 100, HARD: rng.choose([10, 100]) });
    const more = ctx.difficulty === 'EASY' ? true : rng.bool();
    const n = ctx.retry(
      () => rng.integer(100, 900),
      (v) => (more ? v + step <= 999 : v - step >= 0) && (ctx.difficulty !== 'HARD' || (step === 10 ? (more ? v % 100 >= 90 : v % 100 < 10) : true)),
    );
    const answer = more ? n + step : n - step;
    const placeName = step === 10 ? 'tens' : 'hundreds';
    return intQ(ctx, {
      nodes: [P.text(`${step} ${more ? 'more' : 'less'} than `), P.num(n), P.text('?')],
      answer,
      operation: more ? 'ADD' : 'SUBTRACT',
      ways: [
        way('CHANGE_PLACE', `Change the ${placeName}`, `${more ? 'Add' : 'Take'} 1 in the ${placeName} place.`, `${n} → ${answer}.`),
        way('JUMP', `Jump by ${step}`, `${n} ${more ? '+' : '−'} ${step} = ${answer}.`),
      ],
    });
  },
});

const ESTIMATE_OBJECTS: readonly { thing: string; good: string; bad: readonly string[]; like: string }[] = [
  { thing: 'a door', good: '2 meters', bad: ['2 centimeters', '20 meters', '2 inches'], like: 'A door is taller than a grown-up.' },
  { thing: 'a new pencil', good: '18 centimeters', bad: ['18 meters', '1 centimeter', '18 feet'], like: 'A pencil fits in your hand.' },
  { thing: 'a paper clip', good: '3 centimeters', bad: ['3 meters', '30 centimeters', '3 feet'], like: 'A paper clip is tiny.' },
  { thing: 'a school bus', good: '12 meters', bad: ['12 centimeters', '12 inches', '1 meter'], like: 'A bus is longer than a classroom wall.' },
  { thing: 'a crayon', good: '4 inches', bad: ['4 feet', '40 inches', '4 meters'], like: 'A crayon is shorter than your hand is long.' },
  { thing: 'a classroom', good: '10 meters', bad: ['10 centimeters', '10 inches', '1 meter'], like: 'Many big steps cross a classroom.' },
  { thing: 'a fork', good: '7 inches', bad: ['7 feet', '70 inches', '7 meters'], like: 'A fork fits on a plate.' },
  { thing: 'your thumb', good: '2 inches', bad: ['2 feet', '20 inches', '2 meters'], like: 'A thumb is small.' },
];

/** 2.MD.3 — Estimate lengths in inches, feet, centimeters, meters. */
const estimateLength = defineSkill({
  id: 'g2.md.estimate-length',
  grade: '2',
  domain: 'MD',
  standards: ['2.MD.3'],
  title: 'Estimate lengths',
  generate(ctx) {
    const { rng } = ctx;
    const obj = rng.choose(ESTIMATE_OBJECTS);
    const { choices, correctId } = makeChoices(rng, obj.good, obj.bad, ctx.tier({ EASY: 2, MEDIUM: 3, HARD: 4 }));
    return choiceQ(ctx, {
      nodes: [P.text(`About how long is ${obj.thing}?`)],
      choices,
      correctId,
      operation: 'ESTIMATE_LENGTH',
      ways: [
        way('COMPARE_TO_KNOWN', 'Compare to things you know', obj.like, `About ${obj.good}.`),
        way('KNOW_THE_UNITS', 'Picture the units', '1 cm: a fingertip. 1 inch: a paper clip. 1 m: a big step.', `Only ${obj.good} makes sense.`),
      ],
    });
  },
});

const UNIT_PAIRS: readonly { big: string; small: string; per: number }[] = [
  { big: 'feet', small: 'inches', per: 12 },
  { big: 'meters', small: 'centimeters', per: 100 },
];

/** 2.MD.2 — The size of the unit changes the measurement. */
const unitSize = defineSkill({
  id: 'g2.md.unit-size',
  grade: '2',
  domain: 'MD',
  standards: ['2.MD.2'],
  title: 'Bigger units, smaller numbers',
  generate(ctx) {
    const { rng } = ctx;
    const pair = rng.choose(UNIT_PAIRS);
    const toSmall = ctx.difficulty === 'EASY' ? true : rng.bool();
    const thing = rng.choose(['rug', 'table', 'rope', 'hallway', 'board']);
    const n = toSmall ? rng.integer(2, 9) : pair.per * rng.integer(2, 5);
    const from = toSmall ? pair.big : pair.small;
    const to = toSmall ? pair.small : pair.big;
    const choices = [
      { id: 'more', label: `More than ${n}` },
      { id: 'fewer', label: `Fewer than ${n}` },
      { id: 'same', label: `Exactly ${n}` },
    ];
    return choiceQ(ctx, {
      nodes: [P.text(`${capitalize(thing)}: ${n} ${from}. In ${to}, the number is:`)],
      choices,
      correctId: toSmall ? 'more' : 'fewer',
      operation: 'UNIT_SIZE',
      ways: [
        way('UNIT_RULE', 'Unit size rule', toSmall ? `${capitalize(to)} are smaller than ${from}.` : `${capitalize(to)} are bigger than ${from}.`, toSmall ? 'Smaller units: you need more.' : 'Bigger units: you need fewer.'),
        way('PICTURE_IT', 'Picture it', `1 ${pair.big.replace(/s$/, '').replace('feet', 'foot')} = ${pair.per} ${pair.small}.`, toSmall ? `So the number of ${to} is more than ${n}.` : `So the number of ${to} is fewer than ${n}.`),
      ],
    });
  },
});

const LENGTH_UNITS: readonly { name: string; units: string[] }[] = [
  { name: 'cm', units: ['cm', 'centimeters', 'centimeter'] },
  { name: 'inches', units: ['in', 'inches', 'inch'] },
];

/** 2.MD.4 — How much longer is one object than another? */
const lengthDifference = defineSkill({
  id: 'g2.md.how-much-longer',
  grade: '2',
  domain: 'MD',
  standards: ['2.MD.4'],
  title: 'How much longer?',
  generate(ctx) {
    const { rng } = ctx;
    const unit = rng.choose(LENGTH_UNITS);
    const max = ctx.tier({ EASY: 20, MEDIUM: 50, HARD: 99 });
    const [a, b] = ctx.retry(
      () => [rng.integer(5, max), rng.integer(2, max)] as const,
      ([p, q]) => p > q,
    );
    const [t1, t2] = rng.sample(['Pencil', 'Crayon', 'Ribbon', 'Stick', 'Rope', 'Book'], 2) as [string, string];
    return intQ(ctx, {
      nodes: [P.text(`${t1}: ${a} ${unit.name}. ${t2}: ${b} ${unit.name}. How much longer is the ${t1.toLowerCase()}?`)],
      answer: a - b,
      units: unit.units,
      operation: 'LENGTH_DIFFERENCE',
      ways: withIntro(subtractionStrategies(a, b), `${a} − ${b} = ?`),
    });
  },
});

/** 2.MD.5 — Length word problems within 100. */
const lengthStories = defineSkill({
  id: 'g2.md.length-stories',
  grade: '2',
  domain: 'MD',
  standards: ['2.MD.5'],
  title: 'Length story problems',
  generate(ctx) {
    const { rng } = ctx;
    const unit = rng.choose(LENGTH_UNITS);
    const max = ctx.tier({ EASY: 40, MEDIUM: 99, HARD: 99 });
    const kind = ctx.tier({ EASY: rng.choose(['JOIN', 'CUT']), MEDIUM: rng.choose(['JOIN', 'CUT', 'LEFT']), HARD: rng.choose(['LEFT', 'START']) });
    const total = rng.integer(20, max);
    const part = rng.integer(5, total - 5);
    const rest = total - part;
    const u = unit.name;
    switch (kind) {
      case 'JOIN':
        return intQ(ctx, {
          nodes: [P.text(`Two ribbons: ${part} ${u} and ${rest} ${u}, end to end. Total length?`)],
          answer: total,
          units: unit.units,
          operation: 'JOIN_LENGTHS',
          ways: withIntro(additionStrategies(part, rest), `${part} + ${rest} = ?`),
        });
      case 'CUT':
        return intQ(ctx, {
          nodes: [P.text(`A ${total} ${u} rope. Cut off ${part} ${u}. How long now?`)],
          answer: rest,
          units: unit.units,
          operation: 'CUT_LENGTH',
          ways: withIntro(subtractionStrategies(total, part), `${total} − ${part} = ?`),
        });
      case 'LEFT':
        return intQ(ctx, {
          nodes: [P.text(`A path is ${total} ${u}. ${pickName(rng)} walked ${part} ${u}. How far is left?`)],
          answer: rest,
          units: unit.units,
          operation: 'DISTANCE_LEFT',
          ways: withIntro(subtractionStrategies(total, part), `${part} + ? = ${total}`),
        });
      default:
        return intQ(ctx, {
          nodes: [P.text(`A plant grew ${part} ${u}. Now ${total} ${u} tall. Height before?`)],
          answer: rest,
          units: unit.units,
          operation: 'START_UNKNOWN',
          ways: withIntro(subtractionStrategies(total, part), `? + ${part} = ${total}`),
        });
    }
  },
});

/** 2.MD.6 — Whole numbers as lengths on a number line; sums and differences. */
const numberLine = defineSkill({
  id: 'g2.md.number-line',
  grade: '2',
  domain: 'MD',
  standards: ['2.MD.6'],
  title: 'Number lines',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      const start = rng.integer(10, 70);
      const jump = rng.integer(2, 99 - start);
      const forward = rng.bool();
      const from = forward ? start : start + jump;
      const answer = forward ? start + jump : start;
      return intQ(ctx, {
        nodes: [P.text(`Start at ${from}. Jump ${jump} ${forward ? 'right' : 'left'}. Where?`)],
        answer,
        operation: forward ? 'JUMP_RIGHT' : 'JUMP_LEFT',
        ways: forward ? additionStrategies(from, jump) : subtractionStrategies(from, jump),
      });
    }
    const [max, intervals, stepSize] = ctx.tier<[number, number, number]>({ EASY: [10, 10, 1], MEDIUM: [20, 20, 1], HARD: [100, 10, 10] });
    const k = rng.integer(1, intervals - 1);
    const at = k * stepSize;
    const back = intervals - k;
    return intQ(ctx, {
      nodes: [P.text('What number is at A?')],
      visual: { v: 'numberLine', min: rat(0), max: rat(max), intervals, points: [{ at: rat(at), label: 'A' }], labelEnds: true },
      answer: at,
      operation: 'READ_NUMBER_LINE',
      ways: [
        way('COUNT_FROM_ZERO', 'Count from 0', `Each tick is ${stepSize}.`, `Count ${k} tick${k === 1 ? '' : 's'} from 0: ${at}.`),
        way('COUNT_BACK_FROM_END', `Count back from ${max}`, `A is ${back} tick${back === 1 ? '' : 's'} before ${max}.`, `${max} − ${back * stepSize} = ${at}.`),
      ],
    });
  },
});

const MORNING = ['eats breakfast', 'walks to school', 'wakes up'];
const EVENING = ['eats dinner', 'reads a bedtime story', 'plays after school'];

/** 2.MD.7 (CA) — Tell time to the nearest five minutes, using a.m. and p.m. */
const tellTime5 = defineSkill({
  id: 'g2.md.tell-time',
  grade: '2',
  domain: 'MD',
  standards: ['2.MD.7'],
  title: 'Tell time to 5 minutes',
  generate(ctx) {
    const { rng } = ctx;
    const minute = ctx.difficulty === 'EASY' ? rng.choose([0, 15, 30, 45]) : rng.integer(0, 11) * 5;
    if (ctx.difficulty === 'HARD') {
      const morning = rng.bool();
      const activity = rng.choose(morning ? MORNING : EVENING);
      const hour = morning ? rng.integer(6, 8) : activity === 'plays after school' ? rng.integer(3, 5) : rng.integer(6, 8);
      const period = morning ? 'AM' : 'PM';
      const trees = buildWays(clockWays(hour, minute), A.time(hour, minute, period));
      return timeQ(ctx, {
        nodes: [P.text(`${pickName(rng)} ${activity}. What time? Add a.m. or p.m.`)],
        visual: { v: 'clock', hour, minute },
        hour,
        minute,
        period,
        operation: 'READ_CLOCK_AM_PM',
        ways: withIntro(trees, morning ? 'Morning time is a.m.' : 'Afternoon and evening time is p.m.'),
      });
    }
    const hour = rng.integer(1, 12);
    return timeQ(ctx, {
      nodes: [P.text('What time is it?')],
      visual: { v: 'clock', hour, minute },
      hour,
      minute,
      operation: 'READ_CLOCK',
      ways: clockWays(hour, minute),
    });
  },
});

interface TimeFact {
  q: string;
  answer: number;
  know: string;
  other: [string, string];
}

const TIME_FACTS: Record<'EASY' | 'MEDIUM', readonly TimeFact[]> = {
  EASY: [
    { q: 'Minutes in 1 hour?', answer: 60, know: '1 hour = 60 minutes.', other: ['Clock', 'The long hand goes around once: 12 × 5 = 60.'] },
    { q: 'Days in 1 week?', answer: 7, know: '1 week = 7 days.', other: ['Name them', 'Sun, Mon, Tue, Wed, Thu, Fri, Sat: 7.'] },
    { q: 'Hours in 1 day?', answer: 24, know: '1 day = 24 hours.', other: ['Clock twice', 'The hour hand goes around twice: 12 + 12 = 24.'] },
    { q: 'Months in 1 year?', answer: 12, know: '1 year = 12 months.', other: ['Name them', 'January to December: 12.'] },
  ],
  MEDIUM: [
    { q: 'Weeks in 1 year?', answer: 52, know: '1 year = 52 weeks.', other: ['Calendar', 'A calendar has about 52 rows of weeks.'] },
    { q: 'Minutes in half an hour?', answer: 30, know: 'Half of 60 is 30.', other: ['Clock', 'The long hand goes from 12 to 6: 6 × 5 = 30.'] },
    { q: 'Days in July?', answer: 31, know: 'July has 31 days.', other: ['Knuckles', 'July is on a knuckle: 31 days.'] },
    { q: 'Days in April?', answer: 30, know: 'April has 30 days.', other: ['Rhyme', '"30 days has September, April, June, and November."'] },
    { q: 'Days in October?', answer: 31, know: 'October has 31 days.', other: ['Knuckles', 'October is on a knuckle: 31 days.'] },
    { q: 'Days in June?', answer: 30, know: 'June has 30 days.', other: ['Rhyme', '"30 days has September, April, June, and November."'] },
  ],
};

/** 2.MD.7 (CA) — Know relationships of time. */
const timeFacts = defineSkill({
  id: 'g2.md.time-facts',
  grade: '2',
  domain: 'MD',
  standards: ['2.MD.7'],
  title: 'Minutes, days, weeks, months',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD') {
      const facts = [
        { unit: 'weeks', per: 7, to: 'days' },
        { unit: 'hours', per: 60, to: 'minutes' },
        { unit: 'days', per: 24, to: 'hours' },
        { unit: 'years', per: 12, to: 'months' },
      ] as const;
      const f = rng.choose(facts);
      const k = rng.integer(2, f.per === 60 ? 3 : 4);
      const answer = k * f.per;
      return intQ(ctx, {
        nodes: [P.text(`${capitalize(f.to)} in ${k} ${f.unit}?`)],
        answer,
        operation: 'TIME_CONVERSION',
        ways: [
          way('ADD_REPEATED', 'Add it again', `1 ${f.unit.replace(/s$/, '')} = ${f.per} ${f.to}.`, `${Array.from({ length: k }, () => f.per).join(' + ')} = ${answer}.`),
          way('SKIP_COUNT', `Count by ${f.per}s`, `${Array.from({ length: k }, (_, i) => (i + 1) * f.per).join(', ')}.`),
        ],
      });
    }
    const fact = rng.choose(TIME_FACTS[ctx.difficulty]);
    return intQ(ctx, {
      nodes: [P.text(fact.q)],
      answer: fact.answer,
      operation: 'TIME_FACT',
      ways: [way('KNOW_IT', 'Know the fact', fact.know), way('CHECK_IT', fact.other[0], fact.other[1])],
    });
  },
});

type Coin = 'penny' | 'nickel' | 'dime' | 'quarter' | 'dollar';
const COIN_VALUE: Record<Coin, number> = { dollar: 100, quarter: 25, dime: 10, nickel: 5, penny: 1 };
const COIN_NAMES: Record<Coin, [string, string]> = {
  dollar: ['dollar', 'dollars'],
  quarter: ['quarter', 'quarters'],
  dime: ['dime', 'dimes'],
  nickel: ['nickel', 'nickels'],
  penny: ['penny', 'pennies'],
};

function coinWays(counts: [Coin, number][], total: number, asDollars: boolean): ReturnType<typeof way>[] {
  const nonzero = counts.filter(([, n]) => n > 0);
  const fmt = (c: number) => (asDollars ? dollarText(c) : `${c}¢`);
  const checkpoints: string[] = [];
  let acc = 0;
  for (const [coin, n] of nonzero) {
    acc += n * COIN_VALUE[coin];
    checkpoints.push(fmt(acc));
  }
  const groups = nonzero.map(([coin, n]) => `${n} ${COIN_NAMES[coin][n === 1 ? 0 : 1]} = ${fmt(n * COIN_VALUE[coin])}`);
  return [
    way('BIGGEST_FIRST', 'Count on from the biggest', 'Start with the biggest coins.', `Count on: ${checkpoints.join(', ')}.`),
    way('GROUP_AND_ADD', 'Group, then add', `${groups.join('. ')}.`, `Total: ${fmt(total)}.`),
  ];
}

/** 2.MD.8 — Money word problems with dollars, quarters, dimes, nickels, pennies. */
const money = defineSkill({
  id: 'g2.md.money',
  grade: '2',
  domain: 'MD',
  standards: ['2.MD.8'],
  title: 'Count money',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD' && rng.bool(0.4)) {
      const have = rng.integer(30, 99);
      const spend = rng.integer(10, have - 5);
      return centsQ(ctx, {
        nodes: [P.text(`You have ${have}¢. You spend ${spend}¢. How many cents left?`)],
        cents: have - spend,
        operation: 'SPEND',
        ways: withIntro(subtractionStrategies(have, spend), `${have} − ${spend} = ?`),
      });
    }
    const kinds: Coin[] = ctx.tier<Coin[]>({ EASY: ['dime', 'nickel', 'penny'], MEDIUM: ['quarter', 'dime', 'nickel', 'penny'], HARD: ['dollar', 'quarter', 'dime', 'nickel', 'penny'] });
    const limit = ctx.tier({ EASY: 50, MEDIUM: 99, HARD: 500 });
    const counts = ctx.retry(
      () => kinds.map((k) => [k, rng.integer(k === 'dollar' ? 1 : 0, k === 'dollar' ? 3 : 4)] as [Coin, number]),
      (cs) => {
        const t = cs.reduce((s, [k, n]) => s + COIN_VALUE[k] * n, 0);
        return t > 0 && t <= limit && cs.filter(([, n]) => n > 0).length >= 2;
      },
    );
    const total = counts.reduce((s, [k, n]) => s + COIN_VALUE[k] * n, 0);
    const coins: Coin[] = counts.flatMap(([k, n]) => Array.from({ length: n }, () => k));
    const visual = { v: 'coins' as const, coins };
    if (ctx.difficulty === 'HARD') {
      return dollarsQ(ctx, {
        nodes: [P.text('How much money? Use $.')],
        visual,
        cents: total,
        operation: 'COUNT_MONEY_DOLLARS',
        ways: coinWays(counts, total, true),
      });
    }
    return centsQ(ctx, {
      nodes: [P.text('How many cents?')],
      visual,
      cents: total,
      operation: 'COUNT_COINS',
      ways: coinWays(counts, total, false),
    });
  },
});

const PETS = ['Dogs', 'Cats', 'Fish', 'Birds', 'Bunnies', 'Turtles'];

/** 2.MD.10 — Solve put-together, take-apart, and compare problems from a bar graph. */
const barGraph = defineSkill({
  id: 'g2.md.bar-graph',
  grade: '2',
  domain: 'MD',
  standards: ['2.MD.10'],
  title: 'Read a graph',
  generate(ctx) {
    const { rng } = ctx;
    const cats = rng.sample(PETS, 4);
    const counts = ctx.retry(
      () => cats.map(() => rng.integer(1, 15)),
      (cs) => new Set(cs).size === cs.length,
    );
    const visual = { v: 'table' as const, headers: ['Favorite pet', 'Students'], rows: cats.map((c, i) => [c, String(counts[i])]) };
    const kind = ctx.tier({ EASY: 'PUT_TOGETHER', MEDIUM: 'HOW_MANY_MORE', HARD: rng.choose(['TOTAL', 'HOW_MANY_FEWER']) });
    const [i, j] = ctx.retry(
      () => rng.sample([0, 1, 2, 3], 2) as [number, number],
      ([p, q]) => (counts[p] as number) > (counts[q] as number),
    );
    const a = counts[i] as number;
    const b = counts[j] as number;
    const ci = (cats[i] as string).toLowerCase();
    const cj = (cats[j] as string).toLowerCase();
    switch (kind) {
      case 'PUT_TOGETHER':
        return intQ(ctx, { nodes: [P.text(`${capitalize(ci)} and ${cj}: how many students?`)], visual, answer: a + b, operation: 'PUT_TOGETHER', ways: withIntro(additionStrategies(a, b), `Read: ${a} and ${b}.`) });
      case 'HOW_MANY_MORE':
        return intQ(ctx, { nodes: [P.text(`How many more chose ${ci} than ${cj}?`)], visual, answer: a - b, operation: 'COMPARE', ways: withIntro(subtractionStrategies(a, b), `Read: ${a} and ${b}.`) });
      case 'HOW_MANY_FEWER':
        return intQ(ctx, { nodes: [P.text(`How many fewer chose ${cj} than ${ci}?`)], visual, answer: a - b, operation: 'COMPARE', ways: withIntro(subtractionStrategies(a, b), `Read: ${a} and ${b}.`) });
      default:
        return intQ(ctx, { nodes: [P.text('How many students in all?')], visual, answer: counts.reduce((s, x) => s + x, 0), operation: 'TOTAL', ways: multiAdditionStrategies(counts) });
    }
  },
});

const POLYGONS: readonly { name: string; sides: number; visual: 'triangle' | 'rectangle' | 'pentagon' | 'hexagon'; prefix: string }[] = [
  { name: 'Triangle', sides: 3, visual: 'triangle', prefix: 'Tri- means 3.' },
  { name: 'Quadrilateral', sides: 4, visual: 'rectangle', prefix: 'Quad- means 4.' },
  { name: 'Pentagon', sides: 5, visual: 'pentagon', prefix: 'Penta- means 5.' },
  { name: 'Hexagon', sides: 6, visual: 'hexagon', prefix: 'Hexa- means 6.' },
];

/** 2.G.1 — Shapes by number of angles/faces; triangles, quadrilaterals, pentagons, hexagons, cubes. */
const shapes = defineSkill({
  id: 'g2.g.shapes',
  grade: '2',
  domain: 'G',
  standards: ['2.G.1'],
  title: 'Sides, angles, and faces',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD') {
      const parts = [
        { what: 'faces', n: 6, see: 'Top, bottom, front, back, left, right.' },
        { what: 'edges', n: 12, see: '4 on top, 4 on the bottom, 4 standing up.' },
        { what: 'corners', n: 8, see: '4 on top and 4 on the bottom.' },
      ] as const;
      const p = rng.choose(parts);
      return intQ(ctx, {
        nodes: [P.text(`How many ${p.what} does a cube have?`)],
        answer: p.n,
        operation: 'CUBE_PARTS',
        ways: [
          way('COUNT_IN_PARTS', 'Count in parts', p.see, `Total: ${p.n}.`),
          way('PICTURE_A_BOX', 'Picture a box', `Hold a box or die and count its ${p.what}.`, `A cube has ${p.n} ${p.what}.`),
        ],
      });
    }
    const shape = rng.choose(POLYGONS);
    if (ctx.difficulty === 'EASY') {
      const what = rng.choose(['sides', 'angles']);
      return intQ(ctx, {
        nodes: [P.text(`How many ${what}?`)],
        visual: { v: 'shape', shape: shape.visual },
        answer: shape.sides,
        operation: 'COUNT_PARTS',
        ways: [
          way('COUNT', 'Count them', `Touch each ${what === 'sides' ? 'side' : 'corner'} once and count.`, `${shape.sides} ${what}.`),
          way('SIDES_EQUAL_ANGLES', 'Sides = angles', `A polygon has as many angles as sides.`, `${shape.sides} ${what}.`),
        ],
      });
    }
    const { choices, correctId } = makeChoices(rng, shape.name, POLYGONS.map((s) => s.name), 4);
    return choiceQ(ctx, {
      nodes: [P.text(`${shape.sides} sides, ${shape.sides} angles. What shape?`)],
      choices,
      correctId,
      operation: 'NAME_POLYGON',
      ways: [
        way('WORD_PARTS', 'Use the name', shape.prefix, `So it is a ${shape.name.toLowerCase()}.`),
        way('DRAW_IT', 'Draw it', `Draw ${shape.sides} straight sides that close up.`, `That is a ${shape.name.toLowerCase()}.`),
      ],
    });
  },
});

/** 2.G.2 — Partition a rectangle into rows and columns of same-size squares. */
const partitionRectangle = defineSkill({
  id: 'g2.g.rows-and-columns',
  grade: '2',
  domain: 'G',
  standards: ['2.G.2'],
  title: 'Squares in a rectangle',
  generate(ctx) {
    const { rng } = ctx;
    const hi = ctx.tier({ EASY: 3, MEDIUM: 5, HARD: 6 });
    const rows = rng.integer(2, hi);
    const cols = rng.integer(2, hi);
    const total = rows * cols;
    const ways = [
      way('ROWS', 'Add the rows', `${rows} rows of ${cols}.`, `${Array.from({ length: rows }, () => cols).join(' + ')} = ${total}.`),
      way('COLUMNS', 'Add the columns', `${cols} columns of ${rows}.`, `${Array.from({ length: cols }, () => rows).join(' + ')} = ${total}.`),
    ];
    if (ctx.difficulty === 'HARD') {
      return intQ(ctx, { nodes: [P.text(`${rows} rows, ${cols} columns of squares. How many squares?`)], answer: total, operation: 'COUNT_SQUARES', ways });
    }
    return intQ(ctx, { nodes: [P.text('How many squares?')], visual: { v: 'array', rows, columns: cols, emoji: '🟦' }, answer: total, operation: 'COUNT_SQUARES', ways });
  },
});

const SHARE_NAMES: Record<number, { one: string; many: string }> = {
  2: { one: 'One half', many: 'halves' },
  3: { one: 'One third', many: 'thirds' },
  4: { one: 'One fourth', many: 'fourths' },
};

/** 2.G.3 — Halves, thirds, fourths; equal shares need not have the same shape. */
const equalShares = defineSkill({
  id: 'g2.g.equal-shares',
  grade: '2',
  domain: 'G',
  standards: ['2.G.3'],
  title: 'Halves, thirds, fourths',
  generate(ctx) {
    const { rng } = ctx;
    const parts = rng.choose([2, 3, 4]);
    const names = SHARE_NAMES[parts] as { one: string; many: string };
    if (ctx.difficulty === 'EASY') {
      const { choices, correctId } = makeChoices(rng, names.one, Object.values(SHARE_NAMES).map((s) => s.one), 3);
      return choiceQ(ctx, {
        nodes: [P.text('What part is shaded?')],
        visual: { v: 'fractionBar', parts, shaded: 1 },
        choices,
        correctId,
        operation: 'NAME_SHARE',
        ways: [
          way('COUNT_PARTS', 'Count equal parts', `${parts} equal parts. 1 shaded.`, `${names.one}.`),
          way('NAME_RULE', 'Match the name', `2 parts: halves. 3: thirds. 4: fourths.`, `So ${names.one.toLowerCase()}.`),
        ],
      });
    }
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      return choiceQ(ctx, {
        nodes: [P.text('Same square cut 2 ways into 4 equal parts. Same size?')],
        choices: fixedChoices(['Yes', 'No']),
        correctId: 'yes',
        operation: 'EQUAL_SHARES_DIFFERENT_SHAPES',
        ways: [
          way('EQUAL_SHARES', 'Equal shares of the same whole', 'Each whole is cut into 4 equal parts.', 'Every fourth is 1 of 4 equal parts: same size.'),
          way('CUT_AND_MOVE', 'Cut and move', 'Cut a strip and rearrange it.', 'It covers the same area as a small square. Yes.'),
        ],
      });
    }
    return intQ(ctx, {
      nodes: [P.text(`How many ${names.many} make 1 whole?`)],
      visual: { v: 'fractionBar', parts, shaded: 0 },
      answer: parts,
      operation: 'SHARES_IN_WHOLE',
      ways: [
        way('COUNT_PARTS', 'Count the parts', `The whole has ${parts} equal parts.`, `${parts} ${names.many} = 1 whole.`),
        way('NAME_MEANS', 'What the name means', `"${capitalize(names.many)}" means ${parts} equal parts.`, `So ${parts}.`),
      ],
    });
  },
});

export const GRADE_2_SKILLS: readonly Skill[] = [
  wordProblems,
  twoStep,
  fluency20,
  oddEven,
  arrays,
  placeValue,
  skipCount,
  readWrite,
  compareThreeDigit,
  addSub100,
  addUpToFour,
  addSub1000,
  estimate,
  mental10100,
  estimateLength,
  unitSize,
  lengthDifference,
  lengthStories,
  numberLine,
  tellTime5,
  timeFacts,
  money,
  barGraph,
  shapes,
  partitionRectangle,
  equalShares,
];
