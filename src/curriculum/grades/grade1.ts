/**
 * Grade 1 practice skills (California CCSSM).
 * Few words on screen; every question has at least two ways to solve it.
 *
 * Standards NOT covered by auto-generated practice, and why:
 *   1.G.2   composing 2-D/3-D shapes into composite shapes — needs manipulatives or drawing.
 *   (1.NBT.1's "read and write numerals for objects" is practiced via counting sequences; 1.MD.2 uses a picture of units.)
 */
import { P } from '../../domain/question/build';
import type { PromptNode } from '../../domain/question/types';
import { additionStrategies, multiAdditionStrategies, subtractionStrategies } from '../../solutions/strategies/wholeNumber';
import { fixedChoices, makeChoices, plural } from '../helpers';
import { COMPARE_CHOICES } from '../../domain/question/build';
import { defineSkill } from '../skill';
import type { Skill } from '../types';
import {
  addHours,
  additionSubtractionStory,
  capitalize,
  choiceQ,
  clockWays,
  countingWays,
  hhmm,
  intQ,
  sequenceNodes,
  timeQ,
  way,
  withIntro,
  type StoryKind,
} from './_k2Helpers';

/** 1.OA.1 — Add/subtract word problems within 20, unknowns in all positions. */
const wordProblems = defineSkill({
  id: 'g1.oa.word-problems',
  grade: '1',
  domain: 'OA',
  standards: ['1.OA.1'],
  title: 'Story problems within 20',
  generate(ctx) {
    const kinds = ctx.tier<StoryKind[]>({
      EASY: ['ADD_TO_RESULT', 'TAKE_FROM_RESULT', 'PUT_TOGETHER_TOTAL'],
      MEDIUM: ['ADD_TO_RESULT', 'TAKE_FROM_RESULT', 'ADD_TO_CHANGE', 'COMPARE_DIFFERENCE'],
      HARD: ['ADD_TO_CHANGE', 'TAKE_FROM_CHANGE', 'COMPARE_DIFFERENCE', 'ADD_TO_START', 'COMPARE_BIGGER'],
    });
    const story = additionSubtractionStory(ctx, kinds, ctx.tier({ EASY: 10, MEDIUM: 20, HARD: 20 }));
    const { op, a, b } = story.compute;
    const trees = op === 'ADD' ? additionStrategies(a, b) : subtractionStrategies(a, b);
    return intQ(ctx, {
      nodes: [P.text(story.text)],
      answer: story.answer,
      operation: story.kind,
      ways: withIntro(trees, `Write it: ${story.equation}`),
    });
  },
});

const BEAD_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

/** 1.OA.2 — Add three whole numbers (sum ≤ 20). */
const addThree = defineSkill({
  id: 'g1.oa.add-three',
  grade: '1',
  domain: 'OA',
  standards: ['1.OA.2'],
  title: 'Add three numbers',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 10, MEDIUM: 15, HARD: 20 });
    const parts = ctx.retry(
      () => [rng.integer(1, 9), rng.integer(1, 9), rng.integer(1, 9)],
      (ps) => ps.reduce((s, x) => s + x, 0) <= max && ps.reduce((s, x) => s + x, 0) >= ctx.tier({ EASY: 4, MEDIUM: 8, HARD: 12 }),
    );
    const total = parts.reduce((s, x) => s + x, 0);
    const colors = rng.sample(BEAD_COLORS, 3);
    const [x, y, z] = parts as [number, number, number];
    const nodes: PromptNode[] =
      ctx.difficulty === 'EASY'
        ? [P.num(x), P.op('+'), P.num(y), P.op('+'), P.num(z), P.op('='), P.blank()]
        : [P.text(`${x} ${colors[0]}, ${y} ${colors[1]}, ${z} ${colors[2]} beads. How many beads?`)];
    return intQ(ctx, {
      nodes,
      answer: total,
      operation: 'ADD_THREE',
      ways: multiAdditionStrategies(parts),
    });
  },
});

/** 1.OA.3 — Properties of addition (commutative, associative). */
const properties = defineSkill({
  id: 'g1.oa.properties',
  grade: '1',
  domain: 'OA',
  standards: ['1.OA.3'],
  title: 'Turn-around facts and making ten',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'EASY') {
      const [a, b] = ctx.retry(
        () => [rng.integer(1, 9), rng.integer(1, 9)] as const,
        ([p, q]) => p !== q,
      );
      const s = a + b;
      return intQ(ctx, {
        nodes: [P.num(a), P.op('+'), P.num(b), P.op('='), P.num(s), P.br(), P.num(b), P.op('+'), P.num(a), P.op('='), P.blank()],
        answer: s,
        operation: 'COMMUTATIVE',
        ways: [way('TURN_AROUND', 'Turn-around fact', 'Same numbers, new order.', `The sum stays ${s}.`), ...additionStrategies(b, a)],
      });
    }
    if (ctx.difficulty === 'MEDIUM') {
      const [a, b] = ctx.retry(
        () => [rng.integer(1, 10), rng.integer(1, 10)] as const,
        ([p, q]) => p !== q,
      );
      return intQ(ctx, {
        nodes: [P.num(a), P.op('+'), P.blank(), P.op('='), P.num(b), P.op('+'), P.num(a)],
        answer: b,
        operation: 'COMMUTATIVE_UNKNOWN',
        ways: [
          way('TURN_AROUND', 'Turn-around fact', `Both sides have ${a}.`, `The other number must be ${b}.`),
          way('FIND_BOTH_SUMS', 'Find the sum', `${b} + ${a} = ${a + b}.`, `${a} + ? = ${a + b}, so ? = ${b}.`),
        ],
      });
    }
    // HARD: two of three addends make ten (associative property).
    const y = rng.integer(1, 9);
    const z = 10 - y;
    const x = rng.integer(1, 9);
    const order = rng.shuffle([x, y, z]);
    return intQ(ctx, {
      nodes: [P.num(order[0] as number), P.op('+'), P.num(order[1] as number), P.op('+'), P.num(order[2] as number), P.op('='), P.blank()],
      answer: x + 10,
      operation: 'ASSOCIATIVE',
      ways: multiAdditionStrategies(order),
    });
  },
});

/** 1.OA.4 — Subtraction as an unknown-addend problem. */
const unknownAddend = defineSkill({
  id: 'g1.oa.think-addition',
  grade: '1',
  domain: 'OA',
  standards: ['1.OA.4'],
  title: 'Subtract by thinking addition',
  generate(ctx) {
    const { rng } = ctx;
    const [a, b] = ctx.retry(
      () => {
        const big = rng.integer(ctx.tier({ EASY: 5, MEDIUM: 11, HARD: 11 }), ctx.tier({ EASY: 10, MEDIUM: 20, HARD: 18 }));
        return [big, rng.integer(ctx.tier({ EASY: 1, MEDIUM: 2, HARD: 6 }), Math.min(10, big - 1))] as const;
      },
      ([p, q]) => q < p && (ctx.difficulty !== 'HARD' || p % 10 < q),
    );
    return intQ(ctx, {
      nodes: [P.num(a), P.op('−'), P.num(b), P.op('='), P.blank(), P.br(), P.text('Think: '), P.num(b), P.op('+'), P.blank(), P.op('='), P.num(a)],
      answer: a - b,
      operation: 'SUBTRACT',
      ways: subtractionStrategies(a, b),
    });
  },
});

/** 1.OA.5 — Relate counting to addition and subtraction. */
const countOnBack = defineSkill({
  id: 'g1.oa.count-on-back',
  grade: '1',
  domain: 'OA',
  standards: ['1.OA.5'],
  title: 'Count on and count back',
  generate(ctx) {
    const { rng } = ctx;
    const back = ctx.difficulty === 'HARD' && rng.bool(0.6);
    const by = rng.integer(1, 3);
    if (back) {
      const start = rng.integer(5, 20);
      const list = Array.from({ length: by }, (_, i) => start - i - 1).join(', ');
      return intQ(ctx, {
        nodes: [P.text(`Count back ${by} from ${start}.`)],
        answer: start - by,
        operation: 'COUNT_BACK',
        ways: [
          way('COUNT_BACK', 'Count back', `Start at ${start}. Say: ${list}.`, `You stop at ${start - by}.`),
          way('SUBTRACT', 'Subtract', `Counting back ${by} is − ${by}.`, `${start} − ${by} = ${start - by}.`),
        ],
      });
    }
    const start = rng.integer(ctx.tier({ EASY: 1, MEDIUM: 5, HARD: 8 }), ctx.tier({ EASY: 8, MEDIUM: 17, HARD: 17 }));
    const list = Array.from({ length: by }, (_, i) => start + i + 1).join(', ');
    return intQ(ctx, {
      nodes: [P.text(`Count on ${by} from ${start}.`)],
      answer: start + by,
      operation: 'COUNT_ON',
      ways: [
        way('COUNT_ON', 'Count on', `Start at ${start}. Say: ${list}.`, `You stop at ${start + by}.`),
        way('ADD', 'Add', `Counting on ${by} is + ${by}.`, `${start} + ${by} = ${start + by}.`),
      ],
    });
  },
});

/** 1.OA.6 — Add and subtract within 20 (fluency within 10). */
const addSub20 = defineSkill({
  id: 'g1.oa.add-sub-20',
  grade: '1',
  domain: 'OA',
  standards: ['1.OA.6'],
  title: 'Add and subtract within 20',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'EASY') {
      const total = rng.integer(2, 10);
      const a = rng.integer(1, total - 1);
      if (rng.bool()) {
        return intQ(ctx, { nodes: [P.num(a), P.op('+'), P.num(total - a), P.op('='), P.blank()], answer: total, operation: 'ADD', ways: additionStrategies(a, total - a) });
      }
      return intQ(ctx, { nodes: [P.num(total), P.op('−'), P.num(a), P.op('='), P.blank()], answer: total - a, operation: 'SUBTRACT', ways: subtractionStrategies(total, a) });
    }
    if (ctx.difficulty === 'MEDIUM') {
      const [a, b] = ctx.retry(
        () => [rng.integer(2, 9), rng.integer(2, 9)] as const,
        ([p, q]) => p + q > 10,
      );
      return intQ(ctx, { nodes: [P.num(a), P.op('+'), P.num(b), P.op('='), P.blank()], answer: a + b, operation: 'ADD', ways: additionStrategies(a, b) });
    }
    const [a, b] = ctx.retry(
      () => [rng.integer(11, 18), rng.integer(2, 9)] as const,
      ([p, q]) => p % 10 < q && p - q <= 9,
    );
    return intQ(ctx, { nodes: [P.num(a), P.op('−'), P.num(b), P.op('='), P.blank()], answer: a - b, operation: 'SUBTRACT', ways: subtractionStrategies(a, b) });
  },
});

type Side = { nodes: PromptNode[]; value: number; text: string };

function sum(a: number, b: number): Side {
  return { nodes: [P.num(a), P.op('+'), P.num(b)], value: a + b, text: `${a} + ${b}` };
}
function diff(a: number, b: number): Side {
  return { nodes: [P.num(a), P.op('−'), P.num(b)], value: a - b, text: `${a} − ${b}` };
}
function single(a: number): Side {
  return { nodes: [P.num(a)], value: a, text: `${a}` };
}

/** 1.OA.7 — Meaning of the equal sign: true or false equations. */
const trueFalse = defineSkill({
  id: 'g1.oa.true-or-false',
  grade: '1',
  domain: 'OA',
  standards: ['1.OA.7'],
  title: 'True or false equations',
  generate(ctx) {
    const { rng } = ctx;
    const makeTrue = rng.bool();
    const max = ctx.tier({ EASY: 10, MEDIUM: 15, HARD: 20 });
    const form = ctx.tier({ EASY: rng.choose(['SAME', 'DIFF']), MEDIUM: rng.choose(['DIFF', 'TURN']), HARD: rng.choose(['TURN', 'SUMS', 'SUMS']) });
    let left: Side;
    let right: Side;
    const off = rng.bool() ? 1 : -1;
    switch (form) {
      case 'SAME': {
        const a = rng.integer(2, max);
        left = single(a);
        right = single(makeTrue ? a : a + off);
        break;
      }
      case 'DIFF': {
        const b = rng.integer(2, max);
        const c = rng.integer(1, b - 1);
        left = single(makeTrue ? b - c : b - c + (b - c > 1 ? off : 1));
        right = diff(b, c);
        break;
      }
      case 'TURN': {
        const a = rng.integer(1, Math.floor(max / 2));
        const b = rng.integer(1, Math.floor(max / 2));
        left = sum(a, b);
        right = makeTrue ? sum(b, a) : sum(b, a + 1);
        break;
      }
      default: {
        // a + b = c + d
        const total = rng.integer(6, max);
        const a = rng.integer(1, total - 1);
        const c = ctx.retry(
          () => rng.integer(1, total - 1),
          (v) => v !== a,
        );
        left = sum(a, total - a);
        right = makeTrue ? sum(c, total - c) : sum(c, total - c + 1);
        break;
      }
    }
    const isTrue = left.value === right.value;
    return choiceQ(ctx, {
      nodes: [P.text('True or false?'), P.br(), ...left.nodes, P.op('='), ...right.nodes],
      choices: fixedChoices(['True', 'False']),
      correctId: isTrue ? 'true' : 'false',
      operation: 'EQUAL_SIGN',
      ways: [
        way('EACH_SIDE', 'Work out each side', `Left: ${left.text} = ${left.value}.`, `Right: ${right.text} = ${right.value}.`, isTrue ? 'Same, so true.' : 'Not the same, so false.'),
        way('BALANCE', 'Think of a balance', '= means both sides are the same amount.', isTrue ? `Both are ${left.value}: it balances. True.` : `${left.value} and ${right.value} do not balance. False.`),
      ],
    });
  },
});

/** 1.OA.8 — Unknown number in any position. */
const unknownAnyPosition = defineSkill({
  id: 'g1.oa.find-the-unknown',
  grade: '1',
  domain: 'OA',
  standards: ['1.OA.8'],
  title: 'Find the missing number',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 10, MEDIUM: 20, HARD: 20 });
    const c = rng.integer(3, max);
    const a = rng.integer(1, c - 1);
    const b = c - a;
    const form = ctx.tier({
      EASY: rng.choose(['A_PLUS_X', 'A_PLUS_B']),
      MEDIUM: rng.choose(['A_PLUS_X', 'X_PLUS_B', 'C_MINUS_X']),
      HARD: rng.choose(['X_MINUS_B', 'C_EQ_X_MINUS', 'C_MINUS_X', 'X_PLUS_B']),
    });
    switch (form) {
      case 'A_PLUS_B':
        return intQ(ctx, { nodes: [P.num(a), P.op('+'), P.num(b), P.op('='), P.blank()], answer: c, operation: 'RESULT_UNKNOWN', ways: additionStrategies(a, b) });
      case 'A_PLUS_X':
        return intQ(ctx, { nodes: [P.num(a), P.op('+'), P.blank(), P.op('='), P.num(c)], answer: b, operation: 'ADDEND_UNKNOWN', ways: withIntro(subtractionStrategies(c, a), `Find ${c} − ${a}.`) });
      case 'X_PLUS_B':
        return intQ(ctx, { nodes: [P.blank(), P.op('+'), P.num(b), P.op('='), P.num(c)], answer: a, operation: 'ADDEND_UNKNOWN', ways: withIntro(subtractionStrategies(c, b), `Find ${c} − ${b}.`) });
      case 'C_MINUS_X':
        return intQ(ctx, { nodes: [P.num(c), P.op('−'), P.blank(), P.op('='), P.num(a)], answer: b, operation: 'SUBTRAHEND_UNKNOWN', ways: withIntro(subtractionStrategies(c, a), `Find ${c} − ${a}.`) });
      case 'X_MINUS_B':
        // ? − b = a  →  ? = a + b
        return intQ(ctx, { nodes: [P.blank(), P.op('−'), P.num(b), P.op('='), P.num(a)], answer: c, operation: 'START_UNKNOWN', ways: withIntro(additionStrategies(a, b), `Think: ${a} + ${b} = ?`) });
      default:
        // a = ? − b
        return intQ(ctx, { nodes: [P.num(a), P.op('='), P.blank(), P.op('−'), P.num(b)], answer: c, operation: 'START_UNKNOWN', ways: withIntro(additionStrategies(a, b), `Think: ${a} + ${b} = ?`) });
    }
  },
});

/** 1.NBT.1 — Count to 120 starting at any number. */
const countTo120 = defineSkill({
  id: 'g1.nbt.count-to-120',
  grade: '1',
  domain: 'NBT',
  standards: ['1.NBT.1'],
  title: 'Count to 120',
  generate(ctx) {
    const { rng } = ctx;
    const [lo, hi] = ctx.tier<[number, number]>({ EASY: [20, 46], MEDIUM: [47, 96], HARD: [95, 116] });
    const start = rng.integer(lo, hi);
    const seq = [start, start + 1, start + 2, start + 3];
    const missing = ctx.difficulty === 'EASY' ? 3 : rng.integer(0, 3);
    const answer = seq[missing] as number;
    return intQ(ctx, {
      nodes: [P.text('What number is missing?'), P.br(), ...sequenceNodes(seq, missing)],
      answer,
      operation: 'COUNT_SEQUENCE',
      ways: [
        way('COUNT_BY_ONES', 'Count by ones', `Say it: ${seq.join(', ')}.`),
        missing === 0
          ? way('ONE_LESS', 'One less', `${seq[1]} − 1 = ${answer}.`)
          : way('ONE_MORE', 'One more', `${answer - 1} + 1 = ${answer}.`),
      ],
    });
  },
});

/** 1.NBT.2 — Two digits are tens and ones. */
const tensOnes = defineSkill({
  id: 'g1.nbt.tens-and-ones',
  grade: '1',
  domain: 'NBT',
  standards: ['1.NBT.2'],
  title: 'Tens and ones',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'EASY') {
      const ones = rng.integer(1, 9);
      return intQ(ctx, {
        nodes: [P.num(10 + ones), P.op('='), P.text('1 ten and '), P.blank(), P.text(' ones')],
        answer: ones,
        operation: 'TEEN_ONES',
        standards: ['1.NBT.2b'],
        ways: [
          way('ONES_DIGIT', 'Look at the ones digit', `The ones digit of ${10 + ones} is ${ones}.`),
          way('COUNT_UP', 'Count up from 10', `10 → ${10 + ones} is ${ones} more.`),
        ],
      });
    }
    const tens = rng.integer(ctx.difficulty === 'HARD' ? 1 : 2, 9);
    const ones = ctx.difficulty === 'HARD' && rng.bool(0.3) ? 0 : rng.integer(0, 9);
    const n = tens * 10 + ones;
    const tensList = Array.from({ length: tens }, (_, i) => (i + 1) * 10).join(', ');
    if (ctx.difficulty === 'HARD') {
      return intQ(ctx, {
        nodes: [P.text(`${tens} tens and ${ones} ones = ?`)],
        answer: n,
        operation: 'COMPOSE',
        ways: [
          way('PLACE_VALUE', 'Place value', `${tens} tens = ${tens * 10}.`, `${tens * 10} + ${ones} = ${n}.`),
          way('COUNT_BY_TENS', 'Count by tens', `Count tens: ${tensList}.`, ones ? `Then ${ones} more: ${n}.` : `No ones: ${n}.`),
        ],
      });
    }
    const askTens = rng.bool();
    return intQ(ctx, {
      nodes: [P.text(`How many ${askTens ? 'tens' : 'ones'} in `), P.num(n), P.text('?')],
      answer: askTens ? tens : ones,
      operation: askTens ? 'COUNT_TENS' : 'COUNT_ONES',
      ways: [
        way('READ_DIGITS', 'Read the digits', `${n}: ${tens} is the tens digit, ${ones} is the ones digit.`),
        way('BREAK_APART', 'Break it apart', `${n} = ${tens * 10} + ${ones}.`, askTens ? `${tens * 10} is ${tens} tens.` : `${ones} ones are left.`),
      ],
    });
  },
});

/** 1.NBT.3 — Compare two two-digit numbers with >, =, <. */
const compareTwoDigit = defineSkill({
  id: 'g1.nbt.compare',
  grade: '1',
  domain: 'NBT',
  standards: ['1.NBT.3'],
  title: 'Compare two-digit numbers',
  generate(ctx) {
    const { rng } = ctx;
    const [a, b] = ctx.retry(
      () => {
        if (ctx.difficulty === 'HARD' && rng.bool(0.5)) {
          const t = rng.integer(1, 9);
          const o = rng.integer(1, 9);
          return [t * 10 + o, o * 10 + t] as const;
        }
        return [rng.integer(10, 99), rng.integer(10, 99)] as const;
      },
      ([p, q]) => {
        const sameTens = Math.floor(p / 10) === Math.floor(q / 10);
        if (ctx.difficulty === 'EASY') return !sameTens;
        if (ctx.difficulty === 'MEDIUM') return sameTens && p !== q;
        return true;
      },
    );
    const sym = a > b ? '>' : a < b ? '<' : '=';
    const ta = Math.floor(a / 10);
    const tb = Math.floor(b / 10);
    return choiceQ(ctx, {
      nodes: [P.num(a), P.blank(), P.num(b)],
      choices: COMPARE_CHOICES,
      correctId: sym,
      operation: 'COMPARE',
      ways: [
        way(
          'TENS_FIRST',
          'Tens first',
          ta !== tb ? `Tens: ${ta} vs ${tb}.` : `Same tens. Ones: ${a % 10} vs ${b % 10}.`,
          `So ${a} ${sym} ${b}.`,
        ),
        way('NUMBER_LINE', 'Number line', a === b ? 'Same spot on the line.' : `${Math.max(a, b)} is farther right.`, `So ${a} ${sym} ${b}.`),
      ],
    });
  },
});

/** 1.NBT.4 — Add within 100 (two-digit + one-digit, two-digit + tens). */
const addWithin100 = defineSkill({
  id: 'g1.nbt.add-within-100',
  grade: '1',
  domain: 'NBT',
  standards: ['1.NBT.4'],
  title: 'Add within 100',
  generate(ctx) {
    const { rng } = ctx;
    const [a, b] = ctx.retry(
      () => {
        const a0 = rng.integer(11, 89);
        const b0 = ctx.difficulty === 'EASY' ? rng.integer(1, 8) * 10 : rng.integer(1, 9);
        return [a0, b0] as const;
      },
      ([p, q]) => {
        if (p + q > 99) return false;
        if (ctx.difficulty === 'MEDIUM') return (p % 10) + q < 10;
        if (ctx.difficulty === 'HARD') return (p % 10) + q >= 10;
        return true;
      },
    );
    return intQ(ctx, {
      nodes: [P.num(a), P.op('+'), P.num(b), P.op('='), P.blank()],
      answer: a + b,
      operation: 'ADD',
      ways: additionStrategies(a, b),
    });
  },
});

/** 1.NBT.5 — Mentally find 10 more or 10 less. */
const tenMoreLess = defineSkill({
  id: 'g1.nbt.ten-more-less',
  grade: '1',
  domain: 'NBT',
  standards: ['1.NBT.5'],
  title: '10 more and 10 less',
  generate(ctx) {
    const { rng } = ctx;
    const more = ctx.tier({ EASY: true, MEDIUM: false, HARD: rng.bool() });
    const n = more ? rng.integer(10, 89) : rng.integer(ctx.difficulty === 'HARD' ? 10 : 20, 99);
    const answer = more ? n + 10 : n - 10;
    const t = Math.floor(n / 10);
    return intQ(ctx, {
      nodes: [P.text(`10 ${more ? 'more' : 'less'} than `), P.num(n), P.text('?')],
      answer,
      operation: more ? 'TEN_MORE' : 'TEN_LESS',
      ways: [
        way('TENS_DIGIT', 'Change the tens digit', `${n} has ${t} tens.`, `${more ? 'Add' : 'Take'} 1 ten: ${more ? t + 1 : t - 1} tens → ${answer}.`),
        way('HUNDRED_CHART', 'Hundred chart', `On a hundred chart, move one row ${more ? 'down' : 'up'}.`, `${n} → ${answer}.`),
      ],
    });
  },
});

/** 1.NBT.6 — Subtract multiples of 10 (10–90). */
const subtractTens = defineSkill({
  id: 'g1.nbt.subtract-tens',
  grade: '1',
  domain: 'NBT',
  standards: ['1.NBT.6'],
  title: 'Subtract tens',
  generate(ctx) {
    const { rng } = ctx;
    const top = ctx.tier({ EASY: 5, MEDIUM: 9, HARD: 9 });
    const a = rng.integer(2, top);
    const b = rng.integer(1, ctx.difficulty === 'HARD' ? a : a - 1);
    const ways = [
      way('THINK_TENS', 'Think in tens', `${a} tens − ${b} tens = ${a - b} tens.`, `${a - b} tens = ${(a - b) * 10}.`),
      way('COUNT_BACK_TENS', 'Count back by 10s', `Start at ${a * 10}. Count back ${b} tens.`, `You land on ${(a - b) * 10}.`),
    ];
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      return intQ(ctx, {
        nodes: [P.num(a * 10), P.op('−'), P.blank(), P.op('='), P.num((a - b) * 10)],
        answer: b * 10,
        operation: 'SUBTRAHEND_UNKNOWN',
        ways: [
          way('THINK_TENS', 'Think in tens', `${a} tens − ? tens = ${a - b} tens.`, `? = ${b} tens = ${b * 10}.`),
          way('COUNT_UP_TENS', 'Count up by 10s', `From ${(a - b) * 10} count up to ${a * 10} by tens.`, `That is ${b * 10}.`),
        ],
      });
    }
    return intQ(ctx, {
      nodes: [P.num(a * 10), P.op('−'), P.num(b * 10), P.op('='), P.blank()],
      answer: (a - b) * 10,
      operation: 'SUBTRACT_TENS',
      ways,
    });
  },
});

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];

/** 1.MD.1 — Order three objects by length; compare indirectly. */
const orderLengths = defineSkill({
  id: 'g1.md.order-lengths',
  grade: '1',
  domain: 'MD',
  standards: ['1.MD.1'],
  title: 'Longest and shortest',
  generate(ctx) {
    const { rng } = ctx;
    const [L, M, S] = rng.sample(COLORS, 3) as [string, string, string]; // longest → shortest
    const askLongest = ctx.difficulty === 'EASY' ? true : ctx.difficulty === 'MEDIUM' ? false : rng.bool();
    const facts =
      ctx.difficulty === 'HARD'
        ? rng.shuffle([`${capitalize(S)} is shorter than ${M}.`, `${capitalize(M)} is shorter than ${L}.`])
        : [`${capitalize(L)} is longer than ${M}.`, `${capitalize(M)} is longer than ${S}.`];
    const correct = capitalize(askLongest ? L : S);
    const { choices, correctId } = makeChoices(rng, correct, [L, M, S].map(capitalize), 3);
    return choiceQ(ctx, {
      nodes: [P.text(facts[0] as string), P.br(), P.text(facts[1] as string), P.br(), P.text(`Which is ${askLongest ? 'longest' : 'shortest'}?`)],
      choices,
      correctId,
      operation: askLongest ? 'LONGEST' : 'SHORTEST',
      ways: [
        way('PUT_IN_ORDER', 'Put them in order', `Longest to shortest: ${L}, ${M}, ${S}.`, `${correct} is ${askLongest ? 'longest' : 'shortest'}.`),
        way('USE_THE_MIDDLE', 'Use the middle one', `${capitalize(M)} is in the middle.`, `${capitalize(askLongest ? L : S)} is ${askLongest ? 'longer' : 'shorter'} than ${M}.`),
      ],
    });
  },
});

/** 1.MD.2 — Length as a whole number of same-size units. */
const measureUnits = defineSkill({
  id: 'g1.md.measure-with-units',
  grade: '1',
  domain: 'MD',
  standards: ['1.MD.2'],
  title: 'Measure with paper clips',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD') {
      const [long, short] = ctx.retry(
        () => [rng.integer(5, 15), rng.integer(2, 12)] as const,
        ([p, q]) => p > q,
      );
      return intQ(ctx, {
        nodes: [P.text(`Book: ${long} clips. Crayon: ${short} clips.`), P.br(), P.text('How many clips longer is the book?')],
        answer: long - short,
        operation: 'LENGTH_DIFFERENCE',
        ways: subtractionStrategies(long, short),
      });
    }
    const n = rng.integer(ctx.tier({ EASY: 2, MEDIUM: 5, HARD: 5 }), ctx.tier({ EASY: 6, MEDIUM: 12, HARD: 12 }));
    return intQ(ctx, {
      nodes: [P.text('The pencil is this many clips long. How many clips?')],
      visual: { v: 'objects', groups: [{ emoji: '📎', count: n, label: plural(n, 'paper clip', 'paper clips') }] },
      answer: n,
      operation: 'MEASURE',
      ways: countingWays(n, 'clip'),
    });
  },
});

/** 1.MD.3 — Tell time in hours and half-hours. */
const tellTime = defineSkill({
  id: 'g1.md.tell-time',
  grade: '1',
  domain: 'MD',
  standards: ['1.MD.3'],
  title: 'Tell time to the hour and half hour',
  generate(ctx) {
    const { rng } = ctx;
    const hour = rng.integer(1, 12);
    const minute = ctx.difficulty === 'EASY' ? 0 : rng.choose([0, 30]);
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      const later = addHours(hour, 1);
      return timeQ(ctx, {
        nodes: [P.text('What time is 1 hour later?')],
        visual: { v: 'clock', hour, minute },
        hour: later,
        minute,
        operation: 'ONE_HOUR_LATER',
        ways: [
          way('READ_THEN_ADD', 'Read, then add 1 hour', `The clock shows ${hhmm(hour, minute)}.`, `1 hour later: ${hhmm(later, minute)}.`),
          way('MOVE_HOUR_HAND', 'Move the hour hand', `Move the short hand from ${hour} to ${later}.`, `Minutes stay the same: ${hhmm(later, minute)}.`),
        ],
      });
    }
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

const FRUITS = ['Apples', 'Bananas', 'Grapes', 'Oranges', 'Pears', 'Peaches'];

/** 1.MD.4 — Interpret data with up to three categories. */
const readData = defineSkill({
  id: 'g1.md.data',
  grade: '1',
  domain: 'MD',
  standards: ['1.MD.4'],
  title: 'Read a data table',
  generate(ctx) {
    const { rng } = ctx;
    const cats = rng.sample(FRUITS, 3);
    const counts = ctx.retry(
      () => cats.map(() => rng.integer(1, 10)),
      (cs) => new Set(cs).size === cs.length,
    );
    const visual = { v: 'table' as const, headers: ['Fruit', 'Votes'], rows: cats.map((c, i) => [c, String(counts[i])]) };
    const kind = ctx.tier({ EASY: 'TOTAL_TWO', MEDIUM: 'TOTAL_ALL', HARD: 'HOW_MANY_MORE' });
    if (kind === 'TOTAL_TWO') {
      const [i, j] = rng.sample([0, 1, 2], 2) as [number, number];
      const a = counts[i] as number;
      const b = counts[j] as number;
      return intQ(ctx, {
        nodes: [P.text(`${cats[i]} and ${(cats[j] as string).toLowerCase()}: how many votes?`)],
        visual,
        answer: a + b,
        operation: 'PUT_TOGETHER',
        ways: withIntro(additionStrategies(a, b), `Read: ${a} and ${b}.`),
      });
    }
    if (kind === 'TOTAL_ALL') {
      return intQ(ctx, {
        nodes: [P.text('How many votes in all?')],
        visual,
        answer: counts.reduce((s, x) => s + x, 0),
        operation: 'TOTAL',
        ways: multiAdditionStrategies(counts),
      });
    }
    const [i, j] = ctx.retry(
      () => rng.sample([0, 1, 2], 2) as [number, number],
      ([p, q]) => (counts[p] as number) > (counts[q] as number),
    );
    const a = counts[i] as number;
    const b = counts[j] as number;
    return intQ(ctx, {
      nodes: [P.text(`How many more chose ${(cats[i] as string).toLowerCase()} than ${(cats[j] as string).toLowerCase()}?`)],
      visual,
      answer: a - b,
      operation: 'COMPARE',
      ways: withIntro(subtractionStrategies(a, b), `Read: ${a} and ${b}.`),
    });
  },
});

const SHAPE_RULES: readonly { name: 'triangle' | 'square' | 'rectangle' | 'hexagon' | 'circle'; musts: [string, string, string] }[] = [
  { name: 'triangle', musts: ['3 straight sides', '3 corners', 'Closed shape'] },
  { name: 'square', musts: ['4 equal sides', '4 square corners', 'Closed shape'] },
  { name: 'rectangle', musts: ['4 square corners', '4 straight sides', 'Closed shape'] },
  { name: 'hexagon', musts: ['6 straight sides', '6 corners', 'Closed shape'] },
  { name: 'circle', musts: ['No corners', 'Round', 'Closed shape'] },
];
/** Attributes that do NOT define a shape (1.G.1). */
const NOT_EVERY = ['Red color', 'Big size', 'Points up', 'Blue color', 'Tiny size'];
const DOES_NOT_MATTER: readonly { label: string; what: string }[] = [
  { label: 'Its color', what: 'color' },
  { label: 'Its size', what: 'size' },
  { label: 'Which way it turns', what: 'direction' },
];

/** 1.G.1 — Defining vs non-defining attributes. */
const definingAttributes = defineSkill({
  id: 'g1.g.defining-attributes',
  grade: '1',
  domain: 'G',
  standards: ['1.G.1'],
  title: 'What makes a shape a shape?',
  generate(ctx) {
    const { rng } = ctx;
    const pool = ctx.difficulty === 'EASY' ? SHAPE_RULES.filter((s) => s.name === 'triangle' || s.name === 'circle') : SHAPE_RULES;
    const shape = rng.choose(pool);
    const rule = shape.musts[0];
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      const wrong = rng.choose(DOES_NOT_MATTER);
      const { choices, correctId } = makeChoices(rng, wrong.label, shape.musts, 4);
      return choiceQ(ctx, {
        nodes: [P.text(`What does NOT matter for a ${shape.name}?`)],
        choices,
        correctId,
        operation: 'NON_DEFINING',
        ways: [
          way('CHANGE_IT', 'Change it and check', `Change its ${wrong.what}.`, `Still a ${shape.name}! So it does not matter.`),
          way('DEFINING_PARTS', 'Know the rules', `A ${shape.name}: ${shape.musts.map((m) => m.toLowerCase()).join(', ')}.`, `${wrong.label} is not a rule.`),
        ],
      });
    }
    const { choices, correctId } = makeChoices(rng, rule, NOT_EVERY, ctx.tier({ EASY: 3, MEDIUM: 4, HARD: 4 }));
    return choiceQ(ctx, {
      nodes: [P.text(`Every ${shape.name} has:`)],
      visual: { v: 'shape', shape: shape.name },
      choices,
      correctId,
      operation: 'DEFINING',
      ways: [
        way('CHANGE_IT', 'Change it and check', `A blue or tiny ${shape.name} is still a ${shape.name}.`, 'Color and size do not matter.'),
        way('DEFINING_PARTS', 'Know the rules', `Every ${shape.name}: ${rule.toLowerCase()}.`),
      ],
    });
  },
});

/** 1.G.3 — Halves and fourths (quarters). */
const halvesFourths = defineSkill({
  id: 'g1.g.halves-and-fourths',
  grade: '1',
  domain: 'G',
  standards: ['1.G.3'],
  title: 'Halves and fourths',
  generate(ctx) {
    const { rng } = ctx;
    const parts = rng.choose([2, 4]);
    const name = parts === 2 ? 'half' : 'fourth';
    if (ctx.difficulty === 'EASY') {
      const correct = parts === 2 ? 'One half' : 'One fourth';
      const { choices, correctId } = makeChoices(rng, correct, ['One half', 'One fourth', 'The whole'], 3);
      return choiceQ(ctx, {
        nodes: [P.text('What part is shaded?')],
        visual: { v: 'fractionBar', parts, shaded: 1 },
        choices,
        correctId,
        operation: 'NAME_SHARE',
        ways: [
          way('COUNT_PARTS', 'Count equal parts', `${parts} equal parts. 1 is shaded.`, `${correct}.`),
          way('FOLD_IT', 'Fold it', `Fold ${parts === 2 ? 'once' : 'twice'} to make ${parts} equal parts.`, `Each part is one ${name}.`),
        ],
      });
    }
    if (ctx.difficulty === 'MEDIUM') {
      return intQ(ctx, {
        nodes: [P.text(`How many ${name}s make 1 whole?`)],
        visual: { v: 'fractionBar', parts, shaded: 0 },
        answer: parts,
        operation: 'SHARES_IN_WHOLE',
        ways: [
          way('COUNT_PARTS', 'Count the parts', `The whole has ${parts} equal parts.`, `${parts} ${name}s make 1 whole.`),
          way('NAME_MEANS', 'What the name means', parts === 2 ? '"Half" means 2 equal parts.' : '"Fourth" means 4 equal parts.', `So ${parts}.`),
        ],
      });
    }
    const correct = 'One half';
    const { choices, correctId } = makeChoices(rng, correct, ['One half', 'One fourth'], 2);
    return choiceQ(ctx, {
      nodes: [P.text('Same pizza. Which share is bigger?')],
      choices,
      correctId,
      operation: 'COMPARE_SHARES',
      ways: [
        way('MORE_PARTS_SMALLER', 'More parts, smaller parts', 'Fourths: 4 parts. Halves: 2 parts.', 'Fewer parts are bigger: one half.'),
        way('FOLD_IT', 'Fold it', 'Fold a half in half again.', 'That makes fourths, so a half is bigger.'),
      ],
    });
  },
});

export const GRADE_1_SKILLS: readonly Skill[] = [
  wordProblems,
  addThree,
  properties,
  unknownAddend,
  countOnBack,
  addSub20,
  trueFalse,
  unknownAnyPosition,
  countTo120,
  tensOnes,
  compareTwoDigit,
  addWithin100,
  tenMoreLess,
  subtractTens,
  orderLengths,
  measureUnits,
  tellTime,
  readData,
  definingAttributes,
  halvesFourths,
];
