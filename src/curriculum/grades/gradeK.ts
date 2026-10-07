/**
 * Kindergarten practice skills (California CCSSM).
 * Few words on screen; every question has at least two ways to solve it.
 *
 * Standards NOT covered by auto-generated practice, and why:
 *   K.CC.4a  one-to-one tagging while counting aloud — a physical/oral behavior (counting results are practiced in K.CC.5).
 *   K.OA.1   representing with fingers, claps, acting out — not gradable on screen (story problems practice K.OA.2).
 *   K.MD.1   describing measurable attributes in words — open-ended description, no single correct answer.
 *   K.G.1    describing relative positions (above/below/behind) — needs a picture scene the app cannot draw.
 *   K.G.5    building shapes from sticks and clay — hands-on construction.
 *   K.G.6    composing shapes from smaller shapes — needs manipulatives/drawing.
 */
import { P } from '../../domain/question/build';
import { additionStrategies, subtractionStrategies } from '../../solutions/strategies/wholeNumber';
import { COUNTABLE_ITEMS, fixedChoices, makeChoices, pickItem, pickName, pickNames, plural } from '../helpers';
import { defineSkill } from '../skill';
import type { Skill } from '../types';
import { capitalize, choiceQ, countingWays, intQ, sequenceNodes, way, withIntro } from './_k2Helpers';

/** K.CC.2 — Count forward beginning from a given number. */
const countOn = defineSkill({
  id: 'gk.cc.count-on',
  grade: 'K',
  domain: 'CC',
  standards: ['K.CC.2'],
  title: 'Count forward',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 20, MEDIUM: 50, HARD: 100 });
    const start = rng.integer(ctx.tier({ EASY: 1, MEDIUM: 10, HARD: 20 }), max - 3);
    const seq = [start, start + 1, start + 2, start + 3];
    const missing = ctx.difficulty === 'HARD' ? rng.integer(1, 3) : 3;
    const answer = seq[missing] as number;
    return intQ(ctx, {
      nodes: [P.text('What number is missing?'), P.br(), ...sequenceNodes(seq, missing)],
      answer,
      operation: 'COUNT_ON',
      ways: [
        way('SAY_IN_ORDER', 'Count out loud', `Say the numbers in order from ${start}.`, `${answer - 1}, then ${answer}.`),
        way('ONE_MORE', 'One more each time', 'Each number is 1 more.', `${answer - 1} + 1 = ${answer}.`),
      ],
    });
  },
});

/** K.CC.1 — Count to 100 by ones and by tens. */
const countByTens = defineSkill({
  id: 'gk.cc.count-by-tens',
  grade: 'K',
  domain: 'CC',
  standards: ['K.CC.1'],
  title: 'Count by tens and ones to 100',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      // Count by ones across a new ten: 68, 69, ?, 71
      const decade = rng.integer(2, 9) * 10;
      const seq = [decade - 2, decade - 1, decade, decade + 1];
      const missing = rng.integer(1, 2);
      const answer = seq[missing] as number;
      return intQ(ctx, {
        nodes: [P.text('Count by ones. What is missing?'), P.br(), ...sequenceNodes(seq, missing)],
        answer,
        operation: 'COUNT_BY_ONES',
        ways: [
          way('ONE_MORE', 'One more each time', 'Each number is 1 more.', `${answer - 1} + 1 = ${answer}.`),
          way('NEW_TEN', 'Watch the tens', `After ${decade - 1} comes a new ten: ${decade}.`, `So the missing number is ${answer}.`),
        ],
      });
    }
    const start = rng.integer(1, ctx.tier({ EASY: 3, MEDIUM: 6, HARD: 7 })) * 10;
    const seq = [start, start + 10, start + 20, start + 30];
    const missing = ctx.difficulty === 'EASY' ? 3 : ctx.difficulty === 'MEDIUM' ? rng.integer(2, 3) : rng.integer(1, 3);
    const answer = seq[missing] as number;
    return intQ(ctx, {
      nodes: [P.text('Count by tens. What is missing?'), P.br(), ...sequenceNodes(seq, missing)],
      answer,
      operation: 'COUNT_BY_TENS',
      ways: [
        way('SKIP_COUNT_TENS', 'Skip count by 10', `Say: ${seq.join(', ')}.`),
        way('TENS_DIGIT', 'Watch the tens digit', 'The tens digit goes up by 1.', `${answer / 10 - 1} tens, then ${answer / 10} tens = ${answer}.`),
      ],
    });
  },
});

/** K.CC.5, K.CC.3, K.CC.4b — Count to tell how many (up to 20). */
const countObjects = defineSkill({
  id: 'gk.cc.count-objects',
  grade: 'K',
  domain: 'CC',
  standards: ['K.CC.5', 'K.CC.3', 'K.CC.4b'],
  title: 'Count how many',
  generate(ctx) {
    const { rng } = ctx;
    const item = pickItem(rng);
    const [lo, hi] = ctx.tier<[number, number]>({ EASY: [1, 5], MEDIUM: [4, 10], HARD: [11, 20] });
    const n = rng.integer(lo, hi);
    return intQ(ctx, {
      nodes: [P.text('How many?')],
      visual: { v: 'objects', groups: [{ emoji: item.emoji, count: n, label: plural(n, item.singular, item.plural) }] },
      answer: n,
      operation: 'COUNT',
      ways: countingWays(n, item.singular),
    });
  },
});

/** K.CC.4c — Each successive number is one larger. */
const oneMore = defineSkill({
  id: 'gk.cc.one-more',
  grade: 'K',
  domain: 'CC',
  standards: ['K.CC.4c'],
  title: 'One more',
  generate(ctx) {
    const { rng } = ctx;
    const ways = (n: number) => [
      way('NEXT_NUMBER', 'Say the next number', `Count: ${n}, ${n + 1}.`, `One more is ${n + 1}.`),
      way('ADD_ONE', 'Add 1', `${n} + 1 = ${n + 1}.`),
    ];
    if (ctx.difficulty === 'EASY') {
      const item = pickItem(rng);
      const n = rng.integer(2, 9);
      return intQ(ctx, {
        nodes: [P.text('1 more comes. How many now?')],
        visual: { v: 'objects', groups: [{ emoji: item.emoji, count: n, label: plural(n, item.singular, item.plural) }] },
        answer: n + 1,
        operation: 'ONE_MORE',
        ways: ways(n),
      });
    }
    const n = ctx.difficulty === 'MEDIUM' ? rng.integer(5, 14) : rng.integer(10, 19);
    return intQ(ctx, {
      nodes: [P.text('What is 1 more than '), P.num(n), P.text('?')],
      answer: n + 1,
      operation: 'ONE_MORE',
      ways: ways(n),
    });
  },
});

/** K.CC.6 — Is one group greater than, less than, or equal to another? */
const compareGroups = defineSkill({
  id: 'gk.cc.compare-groups',
  grade: 'K',
  domain: 'CC',
  standards: ['K.CC.6'],
  title: 'Which group has more?',
  generate(ctx) {
    const { rng } = ctx;
    const [a, b] = rng.sample(COUNTABLE_ITEMS, 2) as [(typeof COUNTABLE_ITEMS)[number], (typeof COUNTABLE_ITEMS)[number]];
    const max = ctx.tier({ EASY: 6, MEDIUM: 10, HARD: 10 });
    const [x, y] = ctx.retry(
      () => [rng.integer(1, max), rng.integer(1, max)] as const,
      ([p, q]) => (ctx.difficulty === 'EASY' ? Math.abs(p - q) >= 3 : ctx.difficulty === 'MEDIUM' ? p !== q || rng.bool(0.25) : Math.abs(p - q) <= 1),
    );
    const choices = [
      { id: 'first', label: `More ${a.plural}` },
      { id: 'second', label: `More ${b.plural}` },
      { id: 'same', label: 'Same' },
    ];
    const correctId = x > y ? 'first' : x < y ? 'second' : 'same';
    const more = x > y ? a.plural : b.plural;
    return choiceQ(ctx, {
      nodes: [P.text('Which group has more?')],
      visual: {
        v: 'objects',
        groups: [
          { emoji: a.emoji, count: x, label: plural(x, a.singular, a.plural) },
          { emoji: b.emoji, count: y, label: plural(y, b.singular, b.plural) },
        ],
      },
      choices,
      correctId,
      operation: 'COMPARE_GROUPS',
      ways: [
        way('COUNT_EACH', 'Count each group', `${capitalize(a.plural)}: ${x}. ${capitalize(b.plural)}: ${y}.`, x === y ? 'Same number.' : `${Math.max(x, y)} is more than ${Math.min(x, y)}.`),
        way(
          'MATCH',
          'Match one to one',
          `Pair each ${a.singular} with a ${b.singular}.`,
          x === y ? 'None left over: same.' : `Extra ${more} are left over.`,
        ),
      ],
    });
  },
});

/** K.CC.7 — Compare two numbers between 1 and 10. */
const compareNumbers = defineSkill({
  id: 'gk.cc.compare-numbers',
  grade: 'K',
  domain: 'CC',
  standards: ['K.CC.7'],
  title: 'Compare numbers to 10',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 5, MEDIUM: 10, HARD: 10 });
    const [a, b] = ctx.retry(
      () => [rng.integer(1, max), rng.integer(1, max)] as const,
      ([p, q]) => (ctx.difficulty === 'HARD' ? Math.abs(p - q) <= 1 : ctx.difficulty === 'EASY' ? p !== q : true),
    );
    const choices = fixedChoices(['greater than', 'less than', 'equal to']);
    const word = a > b ? 'greater than' : a < b ? 'less than' : 'equal to';
    return choiceQ(ctx, {
      nodes: [P.num(a), P.text(' is '), P.blank(), P.text(' '), P.num(b)],
      choices,
      correctId: word.replace(/ /g, '-'),
      operation: 'COMPARE_NUMBERS',
      ways: [
        way('COUNT_ORDER', 'Counting order', a === b ? 'They are the same number.' : `When counting, ${Math.min(a, b)} comes first.`, `${a} is ${word} ${b}.`),
        way('NUMBER_LINE', 'Number line', a === b ? 'Same spot on the line.' : `${Math.max(a, b)} is farther right.`, `${a} is ${word} ${b}.`),
      ],
    });
  },
});

/** K.OA.2 — Addition stories within 10. */
const addWithin10 = defineSkill({
  id: 'gk.oa.add-within-10',
  grade: 'K',
  domain: 'OA',
  standards: ['K.OA.2', 'K.OA.1'],
  title: 'Add within 10',
  generate(ctx) {
    const { rng } = ctx;
    const item = pickItem(rng);
    const name = pickName(rng);
    const total = rng.integer(ctx.tier({ EASY: 2, MEDIUM: 4, HARD: 6 }), ctx.tier({ EASY: 5, MEDIUM: 10, HARD: 10 }));
    const a = rng.integer(1, total - 1);
    const b = total - a;
    const showPicture = ctx.difficulty !== 'HARD';
    return intQ(ctx, {
      nodes: [P.text(`${name} has ${a} ${plural(a, item.singular, item.plural)}. ${b} more come. How many now?`)],
      ...(showPicture
        ? {
            visual: {
              v: 'objects' as const,
              groups: [
                { emoji: item.emoji, count: a, label: plural(a, item.singular, item.plural) },
                { emoji: item.emoji, count: b, label: `more ${plural(b, item.singular, item.plural)}` },
              ],
            },
          }
        : {}),
      answer: total,
      operation: 'ADD',
      ways: withIntro(additionStrategies(a, b), `${a} + ${b} = ?`),
    });
  },
});

/** K.OA.2 — Take-away stories within 10. */
const subtractWithin10 = defineSkill({
  id: 'gk.oa.subtract-within-10',
  grade: 'K',
  domain: 'OA',
  standards: ['K.OA.2', 'K.OA.1'],
  title: 'Take away within 10',
  generate(ctx) {
    const { rng } = ctx;
    const item = pickItem(rng);
    const name = pickName(rng);
    const start = rng.integer(ctx.tier({ EASY: 2, MEDIUM: 4, HARD: 5 }), ctx.tier({ EASY: 5, MEDIUM: 10, HARD: 10 }));
    const away = ctx.difficulty === 'HARD' ? rng.integer(1, start) : rng.integer(1, start - 1);
    return intQ(ctx, {
      nodes: [P.text(`${name} has ${start} ${plural(start, item.singular, item.plural)}. ${away} go away. How many left?`)],
      ...(ctx.difficulty === 'HARD' ? {} : { visual: { v: 'objects' as const, groups: [{ emoji: item.emoji, count: start, label: plural(start, item.singular, item.plural) }] } }),
      answer: start - away,
      operation: 'SUBTRACT',
      ways: withIntro(subtractionStrategies(start, away), `${start} − ${away} = ?`),
    });
  },
});

/** K.OA.3 — Decompose numbers up to 10 into pairs. */
const decompose = defineSkill({
  id: 'gk.oa.decompose',
  grade: 'K',
  domain: 'OA',
  standards: ['K.OA.3'],
  title: 'Break apart numbers',
  generate(ctx) {
    const { rng } = ctx;
    const n = rng.integer(ctx.tier({ EASY: 2, MEDIUM: 4, HARD: 6 }), ctx.tier({ EASY: 5, MEDIUM: 8, HARD: 10 }));
    const part = rng.integer(1, n - 1);
    const answer = n - part;
    const blankFirst = ctx.difficulty === 'HARD' && rng.bool();
    const counts = Array.from({ length: answer }, (_, i) => part + i + 1).join(', ');
    return intQ(ctx, {
      nodes: blankFirst ? [P.num(n), P.op('='), P.blank(), P.op('+'), P.num(part)] : [P.num(n), P.op('='), P.num(part), P.op('+'), P.blank()],
      answer,
      operation: 'DECOMPOSE',
      ways: [
        way('COUNT_UP', 'Count up', `Start at ${part}. Count to ${n}: ${counts}.`, `That is ${answer} more.`),
        way('TAKE_AWAY', 'Take away', `${n} − ${part} = ${answer}.`),
      ],
    });
  },
});

/** K.OA.4 — Find the number that makes 10. */
const makeTen = defineSkill({
  id: 'gk.oa.make-ten',
  grade: 'K',
  domain: 'OA',
  standards: ['K.OA.4'],
  title: 'Make 10',
  generate(ctx) {
    const { rng } = ctx;
    const a = rng.integer(ctx.tier({ EASY: 5, MEDIUM: 1, HARD: 1 }), 9);
    const answer = 10 - a;
    const blankFirst = ctx.difficulty === 'HARD' && rng.bool();
    const item = pickItem(rng);
    const counts = Array.from({ length: answer }, (_, i) => a + i + 1).join(', ');
    return intQ(ctx, {
      nodes: blankFirst ? [P.blank(), P.op('+'), P.num(a), P.op('='), P.num(10)] : [P.num(a), P.op('+'), P.blank(), P.op('='), P.num(10)],
      ...(ctx.difficulty === 'EASY' ? { visual: { v: 'objects' as const, groups: [{ emoji: item.emoji, count: a, label: plural(a, item.singular, item.plural) }] } } : {}),
      answer,
      operation: 'MAKE_TEN',
      ways: [
        way('COUNT_TO_TEN', 'Count up to 10', `Start at ${a}: ${counts}.`, `That is ${answer} more.`),
        way('TEN_FRAME', 'Ten frame', `A ten frame has 10 boxes.`, `${a} are full, ${answer} are empty.`),
      ],
    });
  },
});

/** K.OA.5 — Fluently add and subtract within 5. */
const fluencyWithin5 = defineSkill({
  id: 'gk.oa.fluency-within-5',
  grade: 'K',
  domain: 'OA',
  standards: ['K.OA.5'],
  title: 'Add and subtract within 5',
  generate(ctx) {
    const { rng } = ctx;
    const subtract = ctx.difficulty === 'EASY' ? false : rng.bool();
    const minPart = ctx.difficulty === 'HARD' ? 0 : 1;
    const total = rng.integer(ctx.difficulty === 'HARD' ? 1 : 2, 5);
    const a = rng.integer(minPart, total - minPart);
    const b = total - a;
    if (subtract) {
      return intQ(ctx, {
        nodes: [P.num(total), P.op('−'), P.num(a), P.op('='), P.blank()],
        answer: b,
        operation: 'SUBTRACT',
        ways: subtractionStrategies(total, a),
      });
    }
    return intQ(ctx, {
      nodes: [P.num(a), P.op('+'), P.num(b), P.op('='), P.blank()],
      answer: total,
      operation: 'ADD',
      ways: additionStrategies(a, b),
    });
  },
});

/** K.NBT.1 — Teen numbers are ten ones and some more ones. */
const teenNumbers = defineSkill({
  id: 'gk.nbt.teen-numbers',
  grade: 'K',
  domain: 'NBT',
  standards: ['K.NBT.1'],
  title: 'Teen numbers: 10 and some more',
  generate(ctx) {
    const { rng } = ctx;
    const ones = rng.integer(1, 9);
    const teen = 10 + ones;
    const counts = Array.from({ length: ones }, (_, i) => 11 + i).join(', ');
    const composeWays = [
      way('TEN_AND_ONES', 'Ten and ones', `1 ten and ${ones} ones.`, `That makes ${teen}.`),
      way('COUNT_ON_FROM_TEN', 'Count on from 10', `Start at 10: ${counts}.`),
    ];
    if (ctx.difficulty === 'EASY') {
      return intQ(ctx, {
        nodes: [P.num(10), P.op('+'), P.num(ones), P.op('='), P.blank()],
        answer: teen,
        operation: 'COMPOSE_TEEN',
        ways: composeWays,
      });
    }
    if (ctx.difficulty === 'MEDIUM' || rng.bool()) {
      return intQ(ctx, {
        nodes: [P.num(teen), P.op('='), P.num(10), P.op('+'), P.blank()],
        answer: ones,
        operation: 'DECOMPOSE_TEEN',
        ways: [
          way('ONES_DIGIT', 'Look at the ones', `${teen} has ${ones} ones after the ten.`),
          way('COUNT_UP', 'Count up from 10', `10 → ${counts}.`, `That is ${ones} more.`),
        ],
      });
    }
    return intQ(ctx, {
      nodes: [P.text(`1 ten and ${ones} ones make?`)],
      answer: teen,
      operation: 'COMPOSE_TEEN',
      ways: composeWays,
    });
  },
});

const LENGTH_THINGS = ['pencil', 'crayon', 'ribbon', 'string', 'train', 'brush', 'straw', 'rope'];

/** K.MD.2 — Compare two objects by length or height. */
const compareLength = defineSkill({
  id: 'gk.md.compare-length',
  grade: 'K',
  domain: 'MD',
  standards: ['K.MD.2'],
  title: 'Longer or shorter?',
  generate(ctx) {
    const { rng } = ctx;
    const minGap = ctx.tier({ EASY: 4, MEDIUM: 2, HARD: 1 });
    const [x, y] = ctx.retry(
      () => [rng.integer(2, 15), rng.integer(2, 15)] as const,
      ([p, q]) => Math.abs(p - q) >= minGap && (ctx.difficulty !== 'HARD' || Math.abs(p - q) <= 2),
    );
    const askBig = rng.bool();
    const heights = ctx.difficulty === 'HARD' && rng.bool();
    const [t1, t2] = heights ? (pickNames(rng, 2) as [string, string]) : (rng.sample(LENGTH_THINGS, 2).map(capitalize) as [string, string]);
    const unit = heights ? 'blocks tall' : 'cubes';
    const word = heights ? (askBig ? 'taller' : 'shorter') : askBig ? 'longer' : 'shorter';
    const correct = askBig ? (x > y ? t1 : t2) : x < y ? t1 : t2;
    const { choices, correctId } = makeChoices(rng, correct, [t1, t2], 2);
    return choiceQ(ctx, {
      nodes: [P.text(`${t1}: ${x} ${unit}. ${t2}: ${y} ${unit}.`), P.br(), P.text(`Which is ${word}?`)],
      choices,
      correctId,
      operation: heights ? 'COMPARE_HEIGHT' : 'COMPARE_LENGTH',
      ways: [
        way('COMPARE_NUMBERS', 'Compare the numbers', `${Math.max(x, y)} is more than ${Math.min(x, y)}.`, `So ${correct} is ${word}.`),
        way('LINE_UP', 'Line them up', 'Line up the ends side by side.', `${correct} is ${word}.`),
      ],
    });
  },
});

/** K.MD.3 — Classify objects and count in each category (counts up to 10). */
const classifyCount = defineSkill({
  id: 'gk.md.classify-count',
  grade: 'K',
  domain: 'MD',
  standards: ['K.MD.3'],
  title: 'Sort and count',
  generate(ctx) {
    const { rng } = ctx;
    const items = rng.sample(COUNTABLE_ITEMS, 3);
    const counts = ctx.retry(
      () => items.map(() => rng.integer(1, ctx.tier({ EASY: 5, MEDIUM: 8, HARD: 10 }))),
      (cs) => new Set(cs).size === cs.length,
    );
    const visual = {
      v: 'objects' as const,
      groups: items.map((it, i) => ({ emoji: it.emoji, count: counts[i] as number, label: plural(counts[i] as number, it.singular, it.plural) })),
    };
    if (ctx.difficulty === 'EASY') {
      const k = rng.integer(0, 2);
      const it = items[k] as (typeof items)[number];
      return intQ(ctx, {
        nodes: [P.text(`How many ${it.plural}?`)],
        visual,
        answer: counts[k] as number,
        operation: 'COUNT_CATEGORY',
        ways: countingWays(counts[k] as number, it.singular),
      });
    }
    const most = ctx.difficulty === 'MEDIUM' || rng.bool();
    const target = most ? Math.max(...counts) : Math.min(...counts);
    const k = counts.indexOf(target);
    const labels = items.map((it) => capitalize(it.plural));
    const correct = labels[k] as string;
    const { choices, correctId } = makeChoices(rng, correct, labels, 3);
    const sorted = items.map((it, i) => ({ name: capitalize(it.plural), n: counts[i] as number })).sort((p, q) => (most ? q.n - p.n : p.n - q.n));
    return choiceQ(ctx, {
      nodes: [P.text(`Which group has the ${most ? 'most' : 'fewest'}?`)],
      visual,
      choices,
      correctId,
      operation: most ? 'MOST' : 'FEWEST',
      ways: [
        way('COUNT_EACH', 'Count each group', items.map((it, i) => `${capitalize(it.plural)}: ${counts[i]}`).join('. ') + '.', `${correct} has the ${most ? 'most' : 'fewest'}.`),
        way('ORDER', 'Put in order', `${most ? 'Most' : 'Fewest'} first: ${sorted.map((s) => s.name).join(', ')}.`),
      ],
    });
  },
});

interface FlatShape {
  name: string;
  visual: 'triangle' | 'square' | 'rectangle' | 'hexagon' | 'circle';
  sides: number;
}

const K_FLAT_SHAPES: readonly FlatShape[] = [
  { name: 'triangle', visual: 'triangle', sides: 3 },
  { name: 'square', visual: 'square', sides: 4 },
  { name: 'rectangle', visual: 'rectangle', sides: 4 },
  { name: 'hexagon', visual: 'hexagon', sides: 6 },
  { name: 'circle', visual: 'circle', sides: 0 },
];

/** K.G.4 — Count sides and corners (vertices) of shapes. */
const shapeSides = defineSkill({
  id: 'gk.g.sides-and-corners',
  grade: 'K',
  domain: 'G',
  standards: ['K.G.4'],
  title: 'Sides and corners',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      const [big, small] = ctx.retry(
        () => rng.sample(K_FLAT_SHAPES.filter((s) => s.sides > 0), 2) as [FlatShape, FlatShape],
        ([p, q]) => p.sides > q.sides,
      );
      const d = big.sides - small.sides;
      return intQ(ctx, {
        nodes: [P.text(`A ${big.name} has how many more sides than a ${small.name}?`)],
        answer: d,
        operation: 'COMPARE_SIDES',
        ways: [
          way('SUBTRACT', 'Subtract', `${capitalize(big.name)}: ${big.sides}. ${capitalize(small.name)}: ${small.sides}.`, `${big.sides} − ${small.sides} = ${d}.`),
          way('COUNT_UP', 'Count up', `From ${small.sides} count up to ${big.sides}.`, `That is ${d} more.`),
        ],
      });
    }
    const pool = ctx.tier({
      EASY: K_FLAT_SHAPES.filter((s) => s.name === 'triangle' || s.name === 'square'),
      MEDIUM: K_FLAT_SHAPES.filter((s) => s.name !== 'circle'),
      HARD: K_FLAT_SHAPES,
    });
    const shape = rng.choose(pool);
    const askSides = ctx.difficulty === 'EASY' ? true : rng.bool();
    const part = askSides ? 'sides' : 'corners';
    const list = Array.from({ length: shape.sides }, (_, i) => i + 1).join(', ');
    return intQ(ctx, {
      nodes: [P.text(`How many ${part}?`)],
      visual: { v: 'shape', shape: shape.visual },
      answer: shape.sides,
      operation: askSides ? 'COUNT_SIDES' : 'COUNT_CORNERS',
      ways:
        shape.sides === 0
          ? [way('LOOK', 'Look closely', 'A circle is round all the way around.', `No straight ${part}: 0.`), way('KNOW_SHAPE', 'Know the shape', `Circles have no ${part}.`)]
          : [way('TRACE_AND_COUNT', 'Trace and count', `Touch each ${askSides ? 'side' : 'corner'}: ${list}.`), way('KNOW_SHAPE', 'Know the shape', `Every ${shape.name} has ${shape.sides} ${part}.`)],
    });
  },
});

const FLAT_NAMES = ['circle', 'square', 'triangle', 'rectangle', 'hexagon'];
const SOLID_NAMES = ['cube', 'cone', 'cylinder', 'sphere'];
const THINGS: readonly { thing: string; solid: boolean; like: string }[] = [
  { thing: 'a ball', solid: true, like: 'sphere' },
  { thing: 'a soup can', solid: true, like: 'cylinder' },
  { thing: 'an ice cream cone', solid: true, like: 'cone' },
  { thing: 'a toy block', solid: true, like: 'cube' },
  { thing: 'a square drawn on paper', solid: false, like: 'square' },
  { thing: 'a circle drawn on paper', solid: false, like: 'circle' },
];

/** K.G.3 — Flat (two-dimensional) or solid (three-dimensional)? */
const flatOrSolid = defineSkill({
  id: 'gk.g.flat-or-solid',
  grade: 'K',
  domain: 'G',
  standards: ['K.G.3'],
  title: 'Flat or solid?',
  generate(ctx) {
    const { rng } = ctx;
    let subject: string;
    let solid: boolean;
    let like: string;
    if (ctx.difficulty === 'HARD' && rng.bool(0.6)) {
      const t = rng.choose(THINGS);
      subject = t.thing;
      solid = t.solid;
      like = t.like;
    } else {
      const pool = ctx.difficulty === 'EASY' ? ['circle', 'square', 'triangle', 'cube', 'sphere'] : [...FLAT_NAMES, ...SOLID_NAMES];
      like = rng.choose(pool);
      solid = SOLID_NAMES.includes(like);
      subject = `a ${like}`;
    }
    return choiceQ(ctx, {
      nodes: [P.text(`${capitalize(subject)}: flat or solid?`)],
      choices: fixedChoices(['Flat', 'Solid']),
      correctId: solid ? 'solid' : 'flat',
      operation: 'CLASSIFY_DIMENSION',
      ways: [
        way('HOLD_IT', 'Can you hold it?', solid ? 'It takes up space. You can hold it.' : 'It lies flat on paper.', solid ? 'So it is solid.' : 'So it is flat.'),
        way('NAME_THE_SHAPE', 'Name the shape', `It is a ${like}.`, solid ? `A ${like} is a solid shape.` : `A ${like} is a flat shape.`),
      ],
    });
  },
});

const RIDDLES: readonly { name: string; clue: string; solid: boolean; key: string }[] = [
  { name: 'Triangle', clue: 'Flat. 3 sides, 3 corners.', solid: false, key: '3 sides' },
  { name: 'Square', clue: 'Flat. 4 equal sides.', solid: false, key: '4 equal sides' },
  { name: 'Rectangle', clue: 'Flat. 4 sides: 2 long, 2 short.', solid: false, key: '2 long and 2 short sides' },
  { name: 'Circle', clue: 'Flat and round. No corners.', solid: false, key: 'round, no corners' },
  { name: 'Hexagon', clue: 'Flat. 6 sides, 6 corners.', solid: false, key: '6 sides' },
  { name: 'Cube', clue: 'Solid. 6 square faces.', solid: true, key: 'square faces' },
  { name: 'Sphere', clue: 'Solid. Round like a ball.', solid: true, key: 'round like a ball' },
  { name: 'Cylinder', clue: 'Solid. Circles on top and bottom.', solid: true, key: 'two circle faces' },
  { name: 'Cone', clue: 'Solid. 1 circle and a point.', solid: true, key: 'a circle and a point' },
];

/** K.G.2, K.G.4 — Name a shape from its attributes. */
const shapeRiddle = defineSkill({
  id: 'gk.g.shape-riddles',
  grade: 'K',
  domain: 'G',
  standards: ['K.G.2', 'K.G.4'],
  title: 'Shape riddles',
  generate(ctx) {
    const { rng } = ctx;
    const pool = ctx.tier({
      EASY: RIDDLES.filter((r) => ['Triangle', 'Circle', 'Square'].includes(r.name)),
      MEDIUM: RIDDLES.filter((r) => !r.solid),
      HARD: RIDDLES.filter((r) => r.solid),
    });
    const riddle = rng.choose(pool);
    const family = pool.length >= 3 ? pool.map((r) => r.name) : RIDDLES.filter((r) => r.solid === riddle.solid).map((r) => r.name);
    const { choices, correctId } = makeChoices(rng, riddle.name, family, ctx.tier({ EASY: 3, MEDIUM: 4, HARD: 4 }));
    const others = choices.filter((c) => c.id !== correctId).map((c) => c.label.toLowerCase());
    return choiceQ(ctx, {
      nodes: [P.text(riddle.clue), P.br(), P.text('What shape?')],
      choices,
      correctId,
      operation: 'NAME_SHAPE',
      ways: [
        way('KEY_CLUE', 'Find the key clue', `Key clue: ${riddle.key}.`, `That is a ${riddle.name.toLowerCase()}.`),
        way('RULE_OUT', 'Rule out the others', `Not a ${others.join(', not a ')}.`, `It must be a ${riddle.name.toLowerCase()}.`),
      ],
    });
  },
});

export const GRADE_K_SKILLS: readonly Skill[] = [
  countOn,
  countByTens,
  countObjects,
  oneMore,
  compareGroups,
  compareNumbers,
  addWithin10,
  subtractWithin10,
  decompose,
  makeTen,
  fluencyWithin5,
  teenNumbers,
  compareLength,
  classifyCount,
  shapeSides,
  flatOrSolid,
  shapeRiddle,
];
