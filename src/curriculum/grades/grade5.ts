/**
 * Grade 5 practice skills (California CCSSM). Every question offers ≥ 2 strategies; prompts are kept very short.
 *
 * Standards NOT auto-generated (and why):
 *   - 5.MD.3  Concept of a unit cube — conceptual; practiced through counting unit cubes in g5.md.volume (5.MD.4/5.MD.5a).
 *   - 5.G.1   Defining the coordinate system (axes, origin) — conceptual; locating/moving points is covered by g5.g.coordinates.
 *   - 5.OA.3  Graphing the ordered pairs — drawing task; generating/relating the two patterns is covered.
 */
import { formatNumber } from '../../domain/answer/format';
import { A, COMPARE_CHOICES, P, prompt, SCHEMA, strategies } from '../../domain/question/build';
import type { PromptNode, SolutionTree } from '../../domain/question/types';
import { add, div, floor, isPrime, mul, primeFactors, rat, roundToPlaces, sub, sum, toMixed, toMixedString, type Rational } from '../../domain/rational/rational';
import { decimalAddSubStrategies, decimalDivideStrategies, decimalMultiplyStrategies } from '../../solutions/strategies/decimals';
import { fractionAddSubStrategies, fractionDivideStrategies, fractionMultiplyStrategies } from '../../solutions/strategies/fractions';
import { divisionStrategies, multiplicationStrategies } from '../../solutions/strategies/wholeNumber';
import { compareSymbol, fixedChoices, makeChoices, pickName } from '../helpers';
import { defineSkill } from '../skill';
import type { Skill } from '../types';
import { tree, uniqueStrategies } from './_g35Helpers';

const dec = (v: Rational, places?: number): string => formatNumber(v, 'decimal', places);
const fmt = (n: number): string => formatNumber(rat(n));
const fracText = (v: Rational): string => toMixedString(v);
const rf = (n: number | bigint, d: number | bigint): PromptNode => ({ t: 'rawfrac', numerator: BigInt(n), denominator: BigInt(d) });
const PLACE_WORDS = ['ones', 'tenths', 'hundredths', 'thousandths'];

/* -------------------------------- 5.OA -------------------------------- */

interface ExprPlan {
  nodes: PromptNode[];
  value: number;
  insideOut: string[];
  distribute: string[];
}

/** 5.OA.1 — Evaluate expressions with parentheses, brackets and braces. */
const evaluateGrouping = defineSkill({
  id: 'g5.oa.evaluate-expressions',
  grade: '5',
  domain: 'OA',
  standards: ['5.OA.1'],
  title: 'Parentheses, brackets, braces',
  generate(ctx) {
    const { rng } = ctx;
    const n = (x: number) => P.num(x);
    const o = P.op;
    const plan = ctx.retry(
      (): ExprPlan => {
        const t = ctx.tier({ EASY: rng.integer(0, 1), MEDIUM: rng.integer(2, 3), HARD: rng.integer(3, 4) });
        const a = rng.integer(2, 9);
        const b = rng.integer(2, 9);
        const c = rng.integer(2, 9);
        const d = rng.integer(1, 20);
        const e = rng.integer(2, 5);
        if (t === 0) {
          const v = a * (b + c) - d;
          return {
            nodes: [n(a), o('×'), o('('), n(b), o('+'), n(c), o(')'), o('−'), n(d)],
            value: v,
            insideOut: [`( ) first: ${b} + ${c} = ${b + c}.`, `${a} × ${b + c} = ${a * (b + c)}.`, `${a * (b + c)} − ${d} = ${v}.`],
            distribute: [`${a} × ${b} + ${a} × ${c} = ${a * b} + ${a * c}.`, `${a * b + a * c} − ${d} = ${v}.`],
          };
        }
        if (t === 1) {
          const big = Math.max(c, d % 10 + 1);
          const small = Math.min(c, d % 10 + 1);
          const v = (a + b) * (big - small);
          return {
            nodes: [o('('), n(a), o('+'), n(b), o(')'), o('×'), o('('), n(big), o('−'), n(small), o(')')],
            value: v,
            insideOut: [`${a} + ${b} = ${a + b}; ${big} − ${small} = ${big - small}.`, `${a + b} × ${big - small} = ${v}.`],
            distribute: [`${a + b} × ${big} − ${a + b} × ${small} = ${(a + b) * big} − ${(a + b) * small}.`, `= ${v}.`],
          };
        }
        if (t === 2) {
          const v = (a + b) * c - d;
          return {
            nodes: [o('['), o('('), n(a), o('+'), n(b), o(')'), o('×'), n(c), o(']'), o('−'), n(d)],
            value: v,
            insideOut: [`( ): ${a} + ${b} = ${a + b}.`, `[ ]: ${a + b} × ${c} = ${(a + b) * c}.`, `${(a + b) * c} − ${d} = ${v}.`],
            distribute: [`${a} × ${c} + ${b} × ${c} = ${a * c} + ${b * c}.`, `${a * c + b * c} − ${d} = ${v}.`],
          };
        }
        if (t === 3) {
          const v = (a * b + c) * e;
          return {
            nodes: [o('['), o('('), n(a), o('×'), n(b), o(')'), o('+'), n(c), o(']'), o('×'), n(e)],
            value: v,
            insideOut: [`( ): ${a} × ${b} = ${a * b}.`, `[ ]: ${a * b} + ${c} = ${a * b + c}.`, `${a * b + c} × ${e} = ${v}.`],
            distribute: [`${a * b} × ${e} + ${c} × ${e} = ${a * b * e} + ${c * e}.`, `= ${v}.`],
          };
        }
        const v = 2 * (a * (b + c) - d);
        return {
          nodes: [n(2), o('×'), o('{'), o('['), n(a), o('×'), o('('), n(b), o('+'), n(c), o(')'), o(']'), o('−'), n(d), o('}')],
          value: v,
          insideOut: [`( ): ${b + c}. [ ]: ${a} × ${b + c} = ${a * (b + c)}.`, `{ }: ${a * (b + c)} − ${d} = ${a * (b + c) - d}.`, `2 × ${a * (b + c) - d} = ${v}.`],
          distribute: [`Double each part: 2 × ${a * (b + c)} − 2 × ${d}.`, `${2 * a * (b + c)} − ${2 * d} = ${v}.`],
        };
      },
      (p) => p.value > 0,
    );
    const result = A.number(plan.value);
    return ctx.question({
      prompt: prompt([...plan.nodes, P.op('='), P.blank()]),
      operation: 'EVALUATE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([tree('INSIDE_OUT', 'Innermost first', plan.insideOut, result), tree('DISTRIBUTE', 'Distribute', plan.distribute, result)]),
    });
  },
});

/** 5.OA.2 — Write and interpret numerical expressions. */
const interpretExpressions = defineSkill({
  id: 'g5.oa.write-expressions',
  grade: '5',
  domain: 'OA',
  standards: ['5.OA.2'],
  title: 'Write and read expressions',
  generate(ctx) {
    const { rng } = ctx;
    const a = rng.integer(2, 12);
    const b = rng.integer(2, 12);
    const k = rng.integer(2, 9);
    if (ctx.difficulty === 'EASY' || rng.bool()) {
      const ops = rng.choose([
        { words: `add ${a} and ${b}, then multiply by ${k}`, right: `${k} × (${a} + ${b})`, wrong: [`${k} × ${a} + ${b}`, `${a} + ${b} × ${k}`, `(${k} + ${a}) × ${b}`] },
        { words: `subtract ${b} from ${a + b + 5}, then divide by ${k}`, right: `(${a + b + 5} − ${b}) ÷ ${k}`, wrong: [`${a + b + 5} − ${b} ÷ ${k}`, `${b} − ${a + b + 5} ÷ ${k}`, `(${b} − ${a + b + 5}) ÷ ${k}`] },
        { words: `multiply ${a} by ${b}, then add ${k}`, right: `${a} × ${b} + ${k}`, wrong: [`${a} × (${b} + ${k})`, `(${a} + ${k}) × ${b}`, `${a} + ${b} × ${k}`] },
      ] as const);
      const { choices, correctId } = makeChoices(rng, ops.right, ops.wrong);
      const result = A.choice(correctId);
      return ctx.question({
        prompt: prompt([P.text(`Which means “${ops.words}”?`)]),
        operation: 'WRITE_EXPRESSION',
        canonicalAnswer: result,
        answerSchema: SCHEMA.choice(choices),
        ...strategies([
          tree('TRANSLATE', 'Translate in order', ['Do the first action first; use ( ) if needed.', ops.right], result),
          tree('CHECK_CHOICES', 'Check each choice', ['Read each choice aloud in order.', `Only ${ops.right} matches.`], result),
        ]),
      });
    }
    const x = rng.integer(1000, 30000);
    const y = rng.integer(100, 999);
    const result = A.number(k);
    return ctx.question({
      prompt: prompt([P.num(k), P.op('×'), P.op('('), P.num(x), P.op('+'), P.num(y), P.op(')'), P.text(' is how many times as large as '), P.num(x), P.op('+'), P.num(y), P.text('?')]),
      operation: 'INTERPRET_EXPRESSION',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(['times']),
      ...strategies([
        tree('READ_STRUCTURE', 'Read the structure', [`It is ${k} groups of (${fmt(x)} + ${y}).`, `${k} times as large.`], result),
        tree('NAME_THE_SUM', 'Name the sum', [`Call the sum S: ${k} × S.`, `${k} × S is ${k} times S.`], result),
      ]),
    });
  },
});

function factorTree(n: number): string[] {
  const lines: string[] = [];
  let frontier = [n];
  for (let guard = 0; guard < 6 && frontier.some((x) => !isPrime(x)); guard++) {
    const next: number[] = [];
    const splits: string[] = [];
    for (const x of frontier) {
      if (isPrime(x)) {
        next.push(x);
        continue;
      }
      let a = Math.floor(Math.sqrt(x));
      while (x % a !== 0) a--;
      splits.push(`${x} = ${a} × ${x / a}`);
      next.push(a, x / a);
    }
    lines.push(`${splits.join('; ')}.`);
    frontier = next;
  }
  return lines;
}

/** 5.OA.2.1 (California addition) — Express a whole number 2–50 as a product of its prime factors. */
const primeFactorization = defineSkill({
  id: 'g5.oa.prime-factorization',
  grade: '5',
  domain: 'OA',
  standards: ['5.OA.2.1'],
  title: 'Prime factorization (2–50)',
  generate(ctx) {
    const { rng } = ctx;
    const n = ctx.retry(
      () => rng.integer(ctx.tier({ EASY: 4, MEDIUM: 12, HARD: 24 }), 50),
      (v) => !isPrime(v) && primeFactors(v).length >= ctx.tier({ EASY: 2, MEDIUM: 2, HARD: 3 }),
    );
    const factors = primeFactors(n);
    const product = factors.join(' × ');
    const divisions: string[] = [];
    let remaining = n;
    for (const p of factors) {
      divisions.push(`${remaining} ÷ ${p} = ${remaining / p}`);
      remaining /= p;
    }
    const result = A.number(n);
    const treeLines = factorTree(n).slice(0, 3);
    return ctx.question({
      prompt: prompt([P.text(`Write ${n} as a product of primes.`)]),
      operation: 'PRIME_FACTORIZATION',
      canonicalAnswer: result,
      answerSchema: SCHEMA.factorization(),
      validationPolicy: { requirePrimeFactors: true },
      ...strategies([
        tree('FACTOR_TREE', 'Factor tree', [...treeLines, `${n} = ${product}.`], result),
        tree('DIVIDE_BY_PRIMES', 'Divide by primes', [`${divisions.join(', ')}.`, `${n} = ${product}.`], result),
      ]),
    });
  },
});

const twoPatterns = defineSkill({
  id: 'g5.oa.two-patterns',
  grade: '5',
  domain: 'OA',
  standards: ['5.OA.3'],
  title: 'Two patterns',
  generate(ctx) {
    const { rng } = ctx;
    const a = rng.integer(2, ctx.tier({ EASY: 4, MEDIUM: 6, HARD: 9 }));
    const m = rng.integer(2, ctx.tier({ EASY: 2, MEDIUM: 3, HARD: 4 }));
    const b = a * m;
    const termIndex = rng.integer(4, 7);
    const A_terms = Array.from({ length: 5 }, (_, i) => a * i);
    const B_terms = Array.from({ length: 5 }, (_, i) => b * i);
    const askRelation = ctx.difficulty !== 'EASY' && rng.bool();
    const head = [P.text(`A: start 0, add ${a} → ${A_terms.join(', ')}`), P.br(), P.text(`B: start 0, add ${b} → ${B_terms.join(', ')}`), P.br()];
    if (askRelation) {
      const result = A.number(m);
      return ctx.question({
        prompt: prompt([...head, P.text('Each B term is how many times the A term?')]),
        operation: 'PATTERN_RELATION',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(['times']),
        ...strategies([
          tree('DIVIDE_TERMS', 'Divide matching terms', [`${B_terms[2]} ÷ ${A_terms[2]} = ${m}.`, `${m} times.`], result),
          tree('COMPARE_RULES', 'Compare the rules', [`Add ${b} vs add ${a}: ${b} = ${m} × ${a}.`, `${m} times.`], result),
        ]),
      });
    }
    const answer = b * (termIndex - 1);
    const result = A.number(answer);
    return ctx.question({
      prompt: prompt([...head, P.text(`Term ${termIndex} of B?`)]),
      operation: 'PATTERN_TERM',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(),
      ...strategies([
        tree('KEEP_ADDING', 'Keep adding', [`${Array.from({ length: termIndex }, (_, i) => b * i).join(', ')}.`, `Term ${termIndex}: ${answer}.`], result),
        tree('USE_PATTERN_A', 'Use pattern A', [`A term ${termIndex} = ${a * (termIndex - 1)}.`, `${m} × ${a * (termIndex - 1)} = ${answer}.`], result),
      ]),
    });
  },
});

/* -------------------------------- 5.NBT ------------------------------- */

const placeValue = defineSkill({
  id: 'g5.nbt.place-value',
  grade: '5',
  domain: 'NBT',
  standards: ['5.NBT.1'],
  title: 'Place value with decimals',
  generate(ctx) {
    const { rng } = ctx;
    const relation = ctx.difficulty !== 'EASY' && rng.bool();
    if (relation) {
      const d = rng.integer(1, 9);
      const gap = ctx.difficulty === 'HARD' ? rng.integer(1, 2) : 1;
      const left = rng.integer(-1, 1);
      // Digit d at place 10^left and at 10^(left-gap); other digits random non-equal.
      const digits = new Map<number, number>();
      digits.set(left, d);
      digits.set(left - gap, d);
      for (let p = 1; p >= -3; p--) if (!digits.has(p)) digits.set(p, (d + rng.integer(1, 8)) % 10);
      let num = rat(0);
      for (const [p, digit] of digits) num = add(num, mul(rat(digit), p >= 0 ? rat(10 ** p) : rat(1, 10 ** -p)));
      const times = 10 ** gap;
      const result = A.number(times);
      const placeName = (p: number) => (p >= 0 ? ['ones', 'tens'][p] : PLACE_WORDS[-p]) as string;
      return ctx.question({
        prompt: prompt([P.text(`In ${dec(num, 3)}, the ${d} in the ${placeName(left)} place is how many times the ${d} in the ${placeName(left - gap)} place?`)]),
        operation: 'PLACE_VALUE_RELATION',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(['times']),
        ...strategies([
          tree('COUNT_PLACES', 'Count places', [`${gap} ${gap === 1 ? 'place' : 'places'} to the left.`, `Each place is × 10 → ${times}.`], result),
          tree('DIVIDE_VALUES', 'Divide the values', [`${dec(mul(rat(d), left >= 0 ? rat(10 ** left) : rat(1, 10 ** -left)))} ÷ ${dec(mul(rat(d), rat(1, 10 ** (gap - left))))}`, `= ${times}.`], result),
        ]),
      });
    }
    const places = ctx.tier({ EASY: 2, MEDIUM: 3, HARD: 3 });
    const pos = rng.integer(1, places);
    const scale = 10 ** places;
    const raw = ctx.retry(
      () => rng.integer(scale, ctx.tier({ EASY: 10, MEDIUM: 100, HARD: 100 }) * scale - 1),
      (v) => Math.floor(v / 10 ** (places - pos)) % 10 !== 0,
    );
    const num = rat(raw, scale);
    const digit = Math.floor(raw / 10 ** (places - pos)) % 10;
    const value = rat(digit, 10 ** pos);
    const result = A.number(value);
    return ctx.question({
      prompt: prompt([P.text(`Value of the ${PLACE_WORDS[pos]} digit in ${dec(num, places)}?`)]),
      operation: 'DIGIT_VALUE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...strategies([
        tree('NAME_PLACE', 'Name the place', [`${digit} ${PLACE_WORDS[pos]}.`, `= ${dec(value)}.`], result),
        tree('AS_FRACTION', 'Use a fraction', [[P.num(digit), P.op('×'), rf(1, 10 ** pos), P.op('='), rf(digit, 10 ** pos)], `= ${dec(value)}.`], result),
      ]),
    });
  },
});

const powersOfTen = defineSkill({
  id: 'g5.nbt.powers-of-ten',
  grade: '5',
  domain: 'NBT',
  standards: ['5.NBT.2'],
  title: 'Multiply and divide by powers of 10',
  generate(ctx) {
    const { rng } = ctx;
    const k = rng.integer(1, ctx.tier({ EASY: 1, MEDIUM: 2, HARD: 3 }));
    const multiplyOp = rng.bool();
    const base = rng.bool() ? rat(rng.integer(11, 999), 100) : rat(rng.integer(2, 999));
    const power = rat(10 ** k);
    const value = multiplyOp ? mul(base, power) : div(base, power);
    const result = A.number(value);
    const factorNode: PromptNode = ctx.difficulty === 'EASY' ? P.num(10 ** k) : P.pow(10, k);
    const chain = [base];
    for (let i = 0; i < k; i++) chain.push(multiplyOp ? mul(chain[i] as Rational, rat(10)) : div(chain[i] as Rational, rat(10)));
    return ctx.question({
      prompt: prompt([P.dec(base), P.op(multiplyOp ? '×' : '÷'), factorNode, P.op('='), P.blank()]),
      operation: multiplyOp ? 'MULTIPLY_POWER_OF_TEN' : 'DIVIDE_POWER_OF_TEN',
      canonicalAnswer: result,
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...strategies([
        tree('MOVE_POINT', 'Move the decimal point', [`10^${k} has ${k} ${k === 1 ? 'zero' : 'zeros'}: move ${k} ${k === 1 ? 'place' : 'places'} ${multiplyOp ? 'right' : 'left'}.`, `${dec(value)}.`], result),
        tree('REPEAT_TENS', `${multiplyOp ? 'Multiply' : 'Divide'} by 10, ${k} ${k === 1 ? 'time' : 'times'}`, [chain.map((c) => dec(c)).join(' → '), `${dec(value)}.`], result),
      ]),
    });
  },
});

const expandedDecimals = defineSkill({
  id: 'g5.nbt.expanded-decimals',
  grade: '5',
  domain: 'NBT',
  standards: ['5.NBT.3a'],
  title: 'Decimals in expanded form',
  generate(ctx) {
    const { rng } = ctx;
    const placeValues = ctx.tier({ EASY: [1, -1, -2], MEDIUM: [10, 1, -1, -2, -3], HARD: [100, 10, 1, -1, -2, -3] });
    const parts: { digit: number; place: number }[] = [];
    for (const p of placeValues) {
      const digit = ctx.difficulty === 'HARD' && rng.bool(0.25) ? 0 : rng.integer(1, 9);
      if (digit) parts.push({ digit, place: p });
    }
    if (parts.length < 2) parts.push({ digit: rng.integer(1, 9), place: -1 }, { digit: rng.integer(1, 9), place: -2 });
    const unique = new Map(parts.map((p) => [p.place, p]));
    const list = [...unique.values()].sort((x, y) => y.place - x.place);
    const termValue = (p: { digit: number; place: number }) => (p.place > 0 ? rat(p.digit * p.place) : p.place === 1 ? rat(p.digit) : mul(rat(p.digit), rat(1, 10 ** -p.place)));
    const value = sum(list.map((p) => (p.place === 1 ? rat(p.digit) : termValue(p))));
    const nodes: PromptNode[] = [];
    list.forEach((p, i) => {
      if (i > 0) nodes.push(P.op('+'));
      nodes.push(P.num(p.digit), P.op('×'));
      nodes.push(p.place >= 1 ? P.num(p.place) : rf(1, 10 ** -p.place));
    });
    const result = A.number(value);
    return ctx.question({
      prompt: prompt([...nodes, P.op('='), P.blank()]),
      operation: 'EXPANDED_TO_STANDARD',
      canonicalAnswer: result,
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...strategies([
        tree('ADD_PARTS', 'Add the parts', [list.map((p) => dec(p.place === 1 ? rat(p.digit) : termValue(p))).join(' + '), `= ${dec(value)}.`], result),
        tree('PLACE_CHART', 'Place value chart', [list.map((p) => `${p.digit} in the ${p.place >= 1 ? (p.place === 1 ? 'ones' : p.place === 10 ? 'tens' : 'hundreds') : PLACE_WORDS[-p.place]}`).join(', ') + '.', `Fill zeros elsewhere: ${dec(value)}.`], result),
      ]),
    });
  },
});

const compareDecimals = defineSkill({
  id: 'g5.nbt.compare-decimals',
  grade: '5',
  domain: 'NBT',
  standards: ['5.NBT.3b'],
  title: 'Compare decimals to thousandths',
  generate(ctx) {
    const { rng } = ctx;
    const places = ctx.tier({ EASY: 2, MEDIUM: 3, HARD: 3 });
    const scale = 10 ** places;
    const whole = rng.integer(0, ctx.tier({ EASY: 9, MEDIUM: 20, HARD: 99 }));
    const aRaw = whole * scale + rng.integer(0, scale - 1);
    // b uses fewer digits sometimes (e.g. 0.4 vs 0.375) to target the "longer is larger" misconception.
    const bRaw = rng.bool(0.15) ? aRaw : whole * scale + (rng.bool() ? rng.integer(1, 9) * (scale / 10) : rng.integer(0, scale - 1));
    const a = rat(aRaw, scale);
    const b = rat(bRaw, scale);
    const symbol = compareSymbol(a, b);
    const result = A.choice(symbol);
    return ctx.question({
      prompt: prompt([P.dec(a), P.blank('○'), P.dec(b)]),
      operation: 'COMPARE',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(COMPARE_CHOICES),
      ...strategies([
        tree('ADD_ZEROS', 'Add zeros, then compare', [`${dec(a, places)} vs ${dec(b, places)}.`, `${aRaw % scale} ${symbol} ${bRaw % scale} ${PLACE_WORDS[places]} → ${symbol}.`], result),
        tree('LEFT_TO_RIGHT', 'Left to right', ['Compare digits place by place from the left.', `First difference decides: ${symbol}.`], result),
      ]),
    });
  },
});

const roundDecimals = defineSkill({
  id: 'g5.nbt.round-decimals',
  grade: '5',
  domain: 'NBT',
  standards: ['5.NBT.4'],
  title: 'Round decimals',
  generate(ctx) {
    const { rng } = ctx;
    const x = rat(rng.integer(1001, ctx.tier({ EASY: 9999, MEDIUM: 99999, HARD: 99999 })), 1000);
    const p = rng.integer(0, 2);
    const value = roundToPlaces(x, p);
    const unit = rat(1, 10 ** p);
    const lower = mul(rat(floor(mul(x, rat(10 ** p)))), unit);
    const upper = add(lower, unit);
    const half = add(lower, div(unit, rat(2)));
    const nextDigit = Number(floor(mul(x, rat(10 ** (p + 1))))) % 10;
    const placeName = ['whole number', 'tenth', 'hundredth'][p] as string;
    const result = A.number(value);
    return ctx.question({
      prompt: prompt([P.text(`Round ${dec(x, 3)} to the nearest ${placeName}.`)]),
      operation: 'ROUND',
      canonicalAnswer: result,
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...strategies([
        tree('NEXT_DIGIT', 'Look at the next digit', [`Next digit: ${nextDigit}.`, `${nextDigit >= 5 ? 'Round up' : 'Round down'} → ${dec(value, p)}.`], result),
        tree('NUMBER_LINE', 'Number line', [`Between ${dec(lower, p)} and ${dec(upper, p)}; halfway ${dec(half)}.`, `Closer to ${dec(value, p)}.`], result),
      ]),
    });
  },
});

const multiplyWhole = defineSkill({
  id: 'g5.nbt.multiply',
  grade: '5',
  domain: 'NBT',
  standards: ['5.NBT.5'],
  title: 'Multiply multi-digit numbers',
  generate(ctx) {
    const { rng } = ctx;
    const [a, b] = ctx.tier({
      EASY: [rng.integer(100, 999), rng.integer(11, 99)],
      MEDIUM: [rng.integer(1000, 9999), rng.integer(11, 99)],
      HARD: [rng.integer(1000, 9999), rng.integer(100, 999)],
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

const divideTwoDigit = defineSkill({
  id: 'g5.nbt.divide',
  grade: '5',
  domain: 'NBT',
  standards: ['5.NBT.6'],
  title: 'Divide by 2-digit numbers',
  generate(ctx) {
    const { rng } = ctx;
    const divisor = rng.integer(11, ctx.tier({ EASY: 25, MEDIUM: 60, HARD: 99 }));
    const q = rng.integer(ctx.tier({ EASY: 5, MEDIUM: 12, HARD: 20 }), Math.floor(9999 / divisor));
    const dividend = divisor * q;
    return ctx.question({
      prompt: prompt([P.num(dividend), P.op('÷'), P.num(divisor), P.op('='), P.blank()]),
      operation: 'DIVIDE',
      canonicalAnswer: A.number(q),
      answerSchema: SCHEMA.integer(),
      ...strategies(divisionStrategies(dividend, divisor)),
    });
  },
});

const decimalOperations = defineSkill({
  id: 'g5.nbt.decimal-operations',
  grade: '5',
  domain: 'NBT',
  standards: ['5.NBT.7'],
  title: 'Decimal operations',
  generate(ctx) {
    const { rng } = ctx;
    const op = ctx.tier({ EASY: rng.choose(['ADD', 'SUBTRACT']), MEDIUM: rng.choose(['ADD', 'SUBTRACT', 'MULTIPLY']), HARD: rng.choose(['MULTIPLY', 'DIVIDE', 'ADD', 'SUBTRACT']) });
    const tenths = (lo: number, hi: number) => rat(ctx.retry(() => rng.integer(lo, hi), (v) => v % 10 !== 0), 10);
    const hundredths = (lo: number, hi: number) => rat(ctx.retry(() => rng.integer(lo, hi), (v) => v % 10 !== 0), 100);
    let a: Rational;
    let b: Rational;
    let trees: SolutionTree[];
    let value: Rational;
    if (op === 'ADD' || op === 'SUBTRACT') {
      const make = ctx.difficulty === 'EASY' ? () => tenths(11, 199) : () => hundredths(101, 9999);
      const x = make();
      const y = ctx.retry(make, (v) => compareSymbol(v, x) !== '=');
      [a, b] = op === 'SUBTRACT' && compareSymbol(x, y) === '<' ? [y, x] : [x, y];
      value = op === 'ADD' ? add(a, b) : sub(a, b);
      trees = decimalAddSubStrategies(a, b, op);
    } else if (op === 'MULTIPLY') {
      a = ctx.difficulty === 'HARD' ? tenths(11, 99) : tenths(11, 199);
      b = ctx.difficulty === 'HARD' ? tenths(2, 99) : rat(rng.integer(2, 9));
      value = mul(a, b);
      trees = decimalMultiplyStrategies(a, b);
    } else {
      b = rng.bool() ? rat(rng.integer(2, 9)) : tenths(2, 9);
      const quotient = tenths(11, 99);
      a = mul(b, quotient);
      value = quotient;
      trees = decimalDivideStrategies(a, b);
    }
    const symbol = op === 'ADD' ? '+' : op === 'SUBTRACT' ? '−' : op === 'MULTIPLY' ? '×' : '÷';
    return ctx.question({
      prompt: prompt([P.dec(a), P.op(symbol), P.dec(b), P.op('='), P.blank()]),
      operation: op,
      canonicalAnswer: A.number(value),
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...strategies(uniqueStrategies(trees)),
    });
  },
});

/* -------------------------------- 5.NF -------------------------------- */

/** 5.NF.1 — Add and subtract fractions with unlike denominators (including mixed numbers). */
const addSubtractUnlike = defineSkill({
  id: 'g5.nf.add-sub-unlike',
  grade: '5',
  domain: 'NF',
  standards: ['5.NF.1'],
  title: 'Add & subtract unlike fractions',
  generate(ctx) {
    const { rng } = ctx;
    const maxDen = ctx.tier({ EASY: 8, MEDIUM: 12, HARD: 15 });
    const operation = rng.bool() ? 'ADD' : 'SUBTRACT';
    const [a, b] = ctx.retry(
      () => {
        const d1 = rng.integer(2, maxDen);
        const d2 = rng.integer(2, maxDen);
        const wholeA = ctx.difficulty === 'HARD' ? rng.integer(0, 3) : 0;
        const x = rat(wholeA * d1 + rng.integer(1, d1 - 1), d1);
        const y = rat(rng.integer(1, d2 - 1), d2);
        return operation === 'SUBTRACT' && compareSymbol(x, y) === '<' ? ([y, x] as const) : ([x, y] as const);
      },
      ([x, y]) => x.denominator !== y.denominator && !(operation === 'SUBTRACT' && compareSymbol(x, y) === '='),
    );
    const value = operation === 'ADD' ? add(a, b) : sub(a, b);
    return ctx.question({
      prompt: prompt([P.mixed(a), P.op(operation === 'ADD' ? '+' : '−'), P.frac(b), P.op('='), P.blank(), P.text(' (simplest form)')]),
      operands: [
        { role: 'lhs', value: A.number(a) },
        { role: 'rhs', value: A.number(b) },
      ],
      operation,
      canonicalAnswer: A.number(value),
      answerSchema: SCHEMA.fraction(),
      validationPolicy: { requireLowestTerms: true, strictMixed: true },
      answerDisplay: 'mixed',
      ...strategies(uniqueStrategies(fractionAddSubStrategies(a, b, operation))),
    });
  },
});

const DENS = [2, 3, 4, 5, 6, 8, 10, 12];

const fractionWordProblems = defineSkill({
  id: 'g5.nf.word-problems-add-sub',
  grade: '5',
  domain: 'NF',
  standards: ['5.NF.2'],
  title: 'Fraction word problems (+ and −)',
  generate(ctx) {
    const { rng } = ctx;
    const name = pickName(rng);
    const operation = rng.bool() ? 'ADD' : 'SUBTRACT';
    const pool = ctx.tier({ EASY: [2, 3, 4, 6, 8], MEDIUM: DENS, HARD: DENS });
    const [a, b] = ctx.retry(
      () => {
        const d1 = rng.choose(pool);
        const d2 = rng.choose(pool);
        const x = rat((ctx.difficulty === 'HARD' ? rng.integer(1, 2) * d1 : 0) + rng.integer(1, d1 - 1), d1);
        const y = rat(rng.integer(1, d2 - 1), d2);
        return [x, y] as const;
      },
      ([x, y]) => x.denominator !== y.denominator && (operation === 'ADD' || compareSymbol(x, y) === '>'),
    );
    const value = operation === 'ADD' ? add(a, b) : sub(a, b);
    const nodes: PromptNode[] =
      operation === 'ADD'
        ? [P.text(`${name} runs `), P.mixed(a), P.text(' mi, then '), P.frac(b), P.text(' mi. Total miles?')]
        : [P.text(`${name} has `), P.mixed(a), P.text(' cup of flour and uses '), P.frac(b), P.text(' cup. How much is left?')];
    return ctx.question({
      prompt: prompt(nodes),
      operation,
      canonicalAnswer: A.number(value),
      answerSchema: SCHEMA.fraction(),
      answerDisplay: 'mixed',
      ...strategies(uniqueStrategies(fractionAddSubStrategies(a, b, operation))),
    });
  },
});

const fractionAsDivision = defineSkill({
  id: 'g5.nf.fraction-as-division',
  grade: '5',
  domain: 'NF',
  standards: ['5.NF.3'],
  title: 'Fractions as division',
  generate(ctx) {
    const { rng } = ctx;
    const people = rng.integer(2, ctx.tier({ EASY: 6, MEDIUM: 9, HARD: 12 }));
    const items = ctx.retry(
      () => rng.integer(1, ctx.tier({ EASY: people - 1, MEDIUM: 2 * people, HARD: 60 })),
      (v) => v % people !== 0 && v >= 1,
    );
    const value = rat(items, people);
    const result = A.number(value);
    const thing = rng.choose(['pizzas', 'pounds of rice', 'yards of ribbon', 'liters of juice']);
    const simple = fracText(value) === `${items}/${people}`;
    const trees: SolutionTree[] = [
      tree('FRACTION_IS_DIVISION', 'Fraction bar = divide', [`${items} ÷ ${people} = ${items}/${people}.`, simple ? `Each gets ${items}/${people}.` : `= ${fracText(value)} each.`], result),
      tree('SHARE_EACH_WHOLE', 'Share each whole', [`Each whole gives everyone 1/${people}.`, `${items} × 1/${people} = ${items}/${people}${simple ? '' : ` = ${fracText(value)}`}.`], result),
    ];
    if (items > people) {
      const m = toMixed(value);
      trees.push(tree('DIVIDE_REMAINDER', 'Divide with remainder', [`${items} ÷ ${people} = ${Math.floor(items / people)} R ${items % people}.`, `Share the ${items % people} left: ${m.whole} ${items % people}/${people}${m.denominator !== BigInt(people) ? ` = ${fracText(value)}` : ''}.`], result));
    }
    return ctx.question({
      prompt: prompt([P.text(`${items} ${thing} shared equally by ${people}. How much each?`)]),
      operation: 'FRACTION_AS_DIVISION',
      canonicalAnswer: result,
      answerSchema: SCHEMA.fraction(),
      answerDisplay: 'mixed',
      ...strategies(trees),
    });
  },
});

const multiplyFractions = defineSkill({
  id: 'g5.nf.multiply-fractions',
  grade: '5',
  domain: 'NF',
  standards: ['5.NF.4'],
  title: 'Multiply fractions',
  generate(ctx) {
    const { rng } = ctx;
    const pick = () => {
      const d = rng.choose(DENS);
      return rat(rng.integer(1, d - 1), d);
    };
    let a = pick();
    const b = pick();
    let std = ['5.NF.4a'];
    if (ctx.difficulty === 'EASY') a = rat(rng.integer(2, 12));
    if (ctx.difficulty === 'HARD') {
      a = add(rat(rng.integer(1, 3)), a);
      std = ['5.NF.6'];
    }
    const value = mul(a, b);
    return ctx.question({
      prompt: prompt([ctx.difficulty === 'HARD' ? P.mixed(a) : P.frac(a), P.op('×'), P.frac(b), P.op('='), P.blank(), P.text(' (simplest form)')]),
      operation: 'MULTIPLY',
      canonicalAnswer: A.number(value),
      answerSchema: SCHEMA.fraction(),
      validationPolicy: { requireLowestTerms: true, strictMixed: true },
      answerDisplay: 'mixed',
      standards: std,
      ...strategies(uniqueStrategies(fractionMultiplyStrategies(a, b))),
    });
  },
});

const fractionalArea = defineSkill({
  id: 'g5.nf.area-fractional-sides',
  grade: '5',
  domain: 'NF',
  standards: ['5.NF.4b'],
  title: 'Area with fraction side lengths',
  generate(ctx) {
    const { rng } = ctx;
    const side = () => {
      const d = rng.choose([2, 3, 4, 5, 6, 8]);
      const whole = ctx.difficulty === 'HARD' ? rng.integer(1, 3) : 0;
      return rat(whole * d + rng.integer(1, d - 1), d);
    };
    const l = ctx.difficulty === 'EASY' ? rat(rng.integer(2, 6)) : side();
    const w = side();
    const value = mul(l, w);
    return ctx.question({
      prompt: prompt([P.text('Area of a rectangle '), P.mixed(l), P.text(' m by '), P.mixed(w), P.text(' m?')]),
      operation: 'AREA',
      canonicalAnswer: A.number(value),
      answerSchema: { ...SCHEMA.fraction(), units: ['square meters', 'sq m', 'm²', 'm^2', 'm2'] },
      answerDisplay: 'mixed',
      ...strategies(uniqueStrategies(fractionMultiplyStrategies(l, w))),
    });
  },
});

const scaling = defineSkill({
  id: 'g5.nf.scaling',
  grade: '5',
  domain: 'NF',
  standards: ['5.NF.5'],
  title: 'Multiplying as resizing',
  generate(ctx) {
    const { rng } = ctx;
    const N = rng.integer(4, 30);
    const kind = rng.choose(['less', 'more', ...(ctx.difficulty === 'EASY' ? [] : ['equal'])] as const);
    const d = rng.integer(2, 9);
    const f = kind === 'less' ? rat(rng.integer(1, d - 1), d) : kind === 'equal' ? { numerator: BigInt(d), denominator: BigInt(d) } : rat(d + rng.integer(1, d), d);
    const fValue = rat(f.numerator, f.denominator);
    const labels = [`More than ${N}`, `Less than ${N}`, `Equal to ${N}`];
    const choices = labels.map((label, i) => ({ id: ['more', 'less', 'equal'][i] as string, label }));
    const result = A.choice(kind);
    const product = mul(fValue, rat(N));
    return ctx.question({
      prompt: prompt([P.text('Without multiplying: '), rf(f.numerator, f.denominator), P.op('×'), P.num(N), P.text(` is …`)]),
      operation: 'SCALING',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(choices),
      ...strategies([
        tree('COMPARE_TO_ONE', 'Compare the fraction to 1', [`${f.numerator}/${f.denominator} is ${kind === 'less' ? 'less than' : kind === 'more' ? 'more than' : 'equal to'} 1.`, `So the product is ${kind === 'equal' ? 'equal to' : `${kind} than`} ${N}.`], result),
        tree('COMPUTE_CHECK', 'Compute to check', [`${f.numerator}/${f.denominator} × ${N} = ${fracText(product)}.`, `${fracText(product)} ${compareSymbol(product, rat(N))} ${N}.`], result),
      ]),
    });
  },
});

const divideUnitFractions = defineSkill({
  id: 'g5.nf.divide-unit-fractions',
  grade: '5',
  domain: 'NF',
  standards: ['5.NF.7'],
  title: 'Divide with unit fractions',
  generate(ctx) {
    const { rng } = ctx;
    const b = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 9, HARD: 10 }));
    const n = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 8, HARD: 9 }));
    const unitFirst = rng.bool();
    const word = ctx.difficulty === 'HARD' && rng.bool();
    const a = unitFirst ? rat(1, b) : rat(n);
    const c = unitFirst ? rat(n) : rat(1, b);
    const value = div(a, c);
    let nodes: PromptNode[];
    if (word) {
      nodes = unitFirst
        ? [P.text(`${n} people share `), P.frac(a), P.text(' lb of chocolate equally. Pounds each?')]
        : [P.text(`How many `), P.frac(c), P.text(`-cup servings are in ${n} cups?`)];
    } else {
      nodes = [unitFirst ? P.frac(a) : P.num(n), P.op('÷'), unitFirst ? P.num(n) : P.frac(c), P.op('='), P.blank()];
    }
    return ctx.question({
      prompt: prompt(nodes),
      operation: 'DIVIDE',
      canonicalAnswer: A.number(value),
      answerSchema: SCHEMA.fraction(),
      standards: word ? ['5.NF.7c'] : unitFirst ? ['5.NF.7a'] : ['5.NF.7b'],
      ...strategies(uniqueStrategies(fractionDivideStrategies(a, c))),
    });
  },
});

/* -------------------------------- 5.MD -------------------------------- */

const METRIC = [
  { big: 'm', small: 'cm', f: 100 },
  { big: 'km', small: 'm', f: 1000 },
  { big: 'cm', small: 'mm', f: 10 },
  { big: 'kg', small: 'g', f: 1000 },
  { big: 'L', small: 'mL', f: 1000 },
] as const;
const CUSTOMARY = [
  { big: 'ft', small: 'in', f: 12 },
  { big: 'yd', small: 'ft', f: 3 },
  { big: 'lb', small: 'oz', f: 16 },
  { big: 'gal', small: 'qt', f: 4 },
  { big: 'hr', small: 'min', f: 60 },
] as const;

const convertMeasurements = defineSkill({
  id: 'g5.md.convert-units',
  grade: '5',
  domain: 'MD',
  standards: ['5.MD.1'],
  title: 'Convert measurement units',
  generate(ctx) {
    const { rng } = ctx;
    const metric = ctx.difficulty === 'EASY' || rng.bool(0.6);
    if (ctx.difficulty === 'HARD' && rng.bool(0.4)) {
      const meters = rng.integer(2, 9);
      const pieces = rng.choose([2, 4, 5, 8, 10, 20, 25]);
      const each = rat(meters * 100, pieces);
      const result = A.number(each);
      return ctx.question({
        prompt: prompt([P.text(`A ${meters} m ribbon is cut into ${pieces} equal pieces. Length of each in cm?`)]),
        operation: 'CONVERT_MULTISTEP',
        canonicalAnswer: result,
        answerSchema: SCHEMA.anyNumber(['centimeters', 'cm']),
        answerDisplay: 'decimal',
        ...strategies([
          tree('CONVERT_FIRST', 'Convert, then divide', [`${meters} m = ${meters * 100} cm.`, `${meters * 100} ÷ ${pieces} = ${dec(each)} cm.`], result),
          tree('DIVIDE_FIRST', 'Divide, then convert', [`${meters} ÷ ${pieces} = ${dec(rat(meters, pieces))} m.`, `${dec(rat(meters, pieces))} × 100 = ${dec(each)} cm.`], result),
        ]),
      });
    }
    const c = metric ? rng.choose(METRIC) : rng.choose(CUSTOMARY);
    const toSmall = rng.bool();
    let given: Rational;
    let value: Rational;
    if (toSmall) {
      given = metric ? rat(rng.integer(11, 99), 10) : rat(rng.integer(2, 9) * 2 + 1, 2);
      value = mul(given, rat(c.f));
    } else {
      const steps = metric ? rng.integer(1, 99) * (c.f / 10 >= 1 ? c.f / 10 : 1) : rng.integer(1, 12) * (c.f % 4 === 0 ? c.f / 4 : c.f % 2 === 0 ? c.f / 2 : c.f);
      given = rat(steps);
      value = div(given, rat(c.f));
    }
    const from = toSmall ? c.big : c.small;
    const to = toSmall ? c.small : c.big;
    const result = A.number(value);
    const shift = String(c.f).length - 1;
    const shiftWords = metric ? `${shift} ${shift === 1 ? 'place' : 'places'} ${toSmall ? 'right' : 'left'}` : '';
    return ctx.question({
      prompt: prompt([P.text(`${dec(given)} ${from} = ? ${to}`)]),
      operation: 'CONVERT',
      canonicalAnswer: result,
      answerSchema: SCHEMA.anyNumber([to]),
      answerDisplay: 'decimal',
      ...strategies([
        tree(toSmall ? 'MULTIPLY' : 'DIVIDE', toSmall ? 'Multiply' : 'Divide', [`1 ${c.big} = ${c.f} ${c.small}.`, `${dec(given)} ${toSmall ? '×' : '÷'} ${c.f} = ${dec(value)} ${to}.`], result),
        metric
          ? tree('MOVE_POINT', 'Move the decimal point', [`× or ÷ ${c.f}: move ${shiftWords}.`, `${dec(value)} ${to}.`], result)
          : tree('USE_FRACTION', 'Use a fraction', [toSmall ? `${fracText(given)} × ${c.f}` : `${dec(given)} ${c.small} = ${dec(given)}/${c.f} ${c.big}.`, `= ${fracText(value)} = ${dec(value)} ${to}.`], result),
      ]),
    });
  },
});

const linePlotShare = defineSkill({
  id: 'g5.md.line-plot',
  grade: '5',
  domain: 'MD',
  standards: ['5.MD.2'],
  title: 'Line plots with fractions',
  generate(ctx) {
    const { rng } = ctx;
    const d = rng.choose([2, 4, 8]);
    const values = rng.sample(Array.from({ length: d }, (_, i) => i + 1), Math.min(3, d)).sort((x, y) => x - y);
    const counts = values.map(() => rng.integer(1, 3));
    const beakers = counts.reduce((s, c) => s + c, 0);
    const total = sum(values.map((v, i) => rat(v * (counts[i] as number), d)));
    const share = ctx.difficulty !== 'EASY';
    const value = share ? div(total, rat(beakers)) : total;
    const result = A.number(value);
    const label = (v: number) => toMixedString(rat(v, d));
    const listing = values.map((v, i) => `${counts[i]} × ${label(v)}`).join(' + ');
    return ctx.question({
      prompt: prompt([P.text(share ? 'Liters in beakers. Pour it all equally into every beaker. Liters each?' : 'Liters in beakers. Total liters?')], {
        v: 'table',
        headers: ['Liters', 'Beakers (X)'],
        rows: values.map((v, i) => [label(v), 'X'.repeat(counts[i] as number)]),
      }),
      operation: share ? 'LINE_PLOT_EQUAL_SHARE' : 'LINE_PLOT_TOTAL',
      canonicalAnswer: result,
      answerSchema: SCHEMA.fraction(),
      answerDisplay: 'mixed',
      ...strategies([
        tree('MULTIPLY_COUNTS', 'Value × count', [`${listing} = ${fracText(total)}.`, share ? `${fracText(total)} ÷ ${beakers} = ${fracText(value)}.` : `Total: ${fracText(total)}.`], result),
        tree('COUNT_PIECES', `Count 1/${d} pieces`, [`Total = ${Number(mul(total, rat(d)).numerator)} pieces of 1/${d}.`, share ? `${Number(mul(total, rat(d)).numerator)}/${d} ÷ ${beakers} = ${fracText(value)}.` : `= ${fracText(total)}.`], result),
      ]),
    });
  },
});

const volume = defineSkill({
  id: 'g5.md.volume',
  grade: '5',
  domain: 'MD',
  standards: ['5.MD.5'],
  title: 'Volume of rectangular prisms',
  generate(ctx) {
    const { rng } = ctx;
    const units = ['cm³', 'cubic cm', 'cubic centimeters', 'cm^3', 'cm3', 'cubic units', 'cubes'];
    if (ctx.difficulty === 'HARD' && rng.bool(0.6)) {
      const L = rng.integer(5, 10);
      const W = rng.integer(2, 6);
      const H = rng.integer(4, 8);
      const a = rng.integer(1, L - 2);
      const b = rng.integer(1, H - 2);
      const answer = L * W * H - a * W * b;
      const result = A.number(answer);
      return ctx.question({
        prompt: prompt([P.text(`Box ${L} × ${W} × ${H} cm with a ${a} × ${W} × ${b} cm block cut out. Volume?`)]),
        operation: 'COMPOSITE_VOLUME',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(units),
        standards: ['5.MD.5c'],
        ...strategies([
          tree('SUBTRACT_BLOCK', 'Subtract the block', [`${L} × ${W} × ${H} = ${L * W * H}; ${a} × ${W} × ${b} = ${a * W * b}.`, `${L * W * H} − ${a * W * b} = ${answer} cm³.`], result),
          tree('ADD_TWO_PRISMS', 'Add two prisms', [`${L - a} × ${W} × ${H} = ${(L - a) * W * H}; ${a} × ${W} × ${H - b} = ${a * W * (H - b)}.`, `${(L - a) * W * H} + ${a * W * (H - b)} = ${answer} cm³.`], result),
        ]),
      });
    }
    const l = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 12, HARD: 20 }));
    const w = rng.integer(2, ctx.tier({ EASY: 4, MEDIUM: 10, HARD: 15 }));
    const h = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 10, HARD: 12 }));
    const answer = l * w * h;
    const result = A.number(answer);
    const cubes = ctx.difficulty === 'EASY';
    return ctx.question({
      prompt: prompt([P.text(cubes ? `Unit cubes: ${l} long, ${w} wide, ${h} tall. How many cubes?` : `Box: ${l} cm × ${w} cm × ${h} cm. Volume?`)]),
      operation: 'VOLUME',
      canonicalAnswer: result,
      answerSchema: SCHEMA.integer(cubes ? ['cubes', 'cube', 'cubic units'] : units),
      standards: cubes ? ['5.MD.4', '5.MD.5a'] : ['5.MD.5b'],
      ...strategies([
        tree('L_W_H', 'V = l × w × h', [`${l} × ${w} × ${h}`, `= ${answer}${cubes ? ' cubes' : ' cm³'}.`], result),
        tree('LAYERS', 'Base layer × height', [`One layer: ${l} × ${w} = ${l * w}.`, `${h} layers: ${l * w} × ${h} = ${answer}.`], result),
      ]),
    });
  },
});

/* -------------------------------- 5.G --------------------------------- */

const coordinates = defineSkill({
  id: 'g5.g.coordinates',
  grade: '5',
  domain: 'G',
  standards: ['5.G.1', '5.G.2'],
  title: 'Coordinate plane',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 6, MEDIUM: 10, HARD: 15 });
    const x = rng.integer(0, max);
    const y = rng.integer(0, max);
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      const sameX = rng.bool();
      const other = ctx.retry(() => rng.integer(0, max), (v) => v !== (sameX ? y : x));
      const distance = Math.abs(other - (sameX ? y : x));
      const p2 = sameX ? [x, other] : [other, y];
      const result = A.number(distance);
      return ctx.question({
        prompt: prompt([P.text(`Distance from (${x}, ${y}) to (${p2[0]}, ${p2[1]})?`)]),
        operation: 'DISTANCE',
        canonicalAnswer: result,
        answerSchema: SCHEMA.integer(['units', 'unit']),
        standards: ['5.G.2'],
        ...strategies([
          tree('SUBTRACT', 'Subtract coordinates', [`The ${sameX ? 'x' : 'y'} values match; use ${sameX ? 'y' : 'x'}.`, `|${sameX ? other : other} − ${sameX ? y : x}| = ${distance}.`], result),
          tree('COUNT_UNITS', 'Count the units', [`Count ${sameX ? 'up/down' : 'across'} from ${sameX ? y : x} to ${other}.`, `${distance} units.`], result),
        ]),
      });
    }
    const right = rng.integer(-Math.min(x, 4), 5);
    const up = rng.integer(-Math.min(y, 4), 5);
    const nx = x + right;
    const ny = y + up;
    const result = A.pair(nx, ny);
    const dir = (n: number, pos: string, neg: string) => `${Math.abs(n)} ${n >= 0 ? pos : neg}`;
    return ctx.question({
      prompt: prompt([P.text(`Start at (${x}, ${y}). Move ${dir(right, 'right', 'left')}, ${dir(up, 'up', 'down')}. Where are you?`)]),
      operation: 'TRANSLATE_POINT',
      canonicalAnswer: result,
      answerSchema: SCHEMA.pair(),
      ...strategies([
        tree('X_THEN_Y', 'Move x, then y', [`x: ${x} ${right >= 0 ? '+' : '−'} ${Math.abs(right)} = ${nx}.`, `y: ${y} ${up >= 0 ? '+' : '−'} ${Math.abs(up)} = ${ny} → (${nx}, ${ny}).`], result),
        tree('ADD_PAIRS', 'Add the moves', [`(${x}, ${y}) + (${right}, ${up}).`, `= (${nx}, ${ny}).`], result),
      ]),
    });
  },
});

const HIERARCHY = [
  { s: 'All squares are rectangles.', t: true, rule: 'Squares have 4 right angles.', ex: 'Any square works as a rectangle.' },
  { s: 'All rectangles are squares.', t: false, rule: 'Rectangles need not have equal sides.', ex: 'A 2 × 5 rectangle is not a square.' },
  { s: 'All squares are rhombuses.', t: true, rule: 'Squares have 4 equal sides.', ex: 'Any square has 4 equal sides.' },
  { s: 'All rhombuses are squares.', t: false, rule: 'Rhombuses need not have right angles.', ex: 'A slanted rhombus is not a square.' },
  { s: 'All rectangles are parallelograms.', t: true, rule: 'Rectangles have 2 pairs of parallel sides.', ex: 'Opposite sides of any rectangle are parallel.' },
  { s: 'All parallelograms are rectangles.', t: false, rule: 'Parallelograms need not have right angles.', ex: 'A slanted parallelogram has no right angles.' },
  { s: 'All rhombuses are parallelograms.', t: true, rule: 'Rhombuses have 2 pairs of parallel sides.', ex: 'Opposite sides of a rhombus are parallel.' },
  { s: 'All parallelograms have 4 equal sides.', t: false, rule: 'Only rhombuses must.', ex: 'A 3 × 6 rectangle is a parallelogram with unequal sides.' },
] as const;

const shapeHierarchy = defineSkill({
  id: 'g5.g.shape-hierarchy',
  grade: '5',
  domain: 'G',
  standards: ['5.G.3', '5.G.4'],
  title: 'Shape families',
  generate(ctx) {
    const { rng } = ctx;
    const pool = ctx.difficulty === 'EASY' ? HIERARCHY.slice(0, 4) : HIERARCHY.slice();
    const item = rng.choose(pool);
    const result = A.choice(item.t ? 'true' : 'false');
    return ctx.question({
      prompt: prompt([P.text(`True or false? ${item.s}`)]),
      operation: 'HIERARCHY',
      canonicalAnswer: result,
      answerSchema: SCHEMA.choice(fixedChoices(['True', 'False'])),
      ...strategies([
        tree('USE_HIERARCHY', 'Use the family tree', [item.rule, item.t ? 'True.' : 'False.'], result),
        tree('TEST_EXAMPLE', 'Test an example', [item.ex, item.t ? 'True.' : 'False.'], result),
      ]),
    });
  },
});

export const GRADE_5_SKILLS: readonly Skill[] = [
  evaluateGrouping,
  interpretExpressions,
  primeFactorization,
  twoPatterns,
  placeValue,
  powersOfTen,
  expandedDecimals,
  compareDecimals,
  roundDecimals,
  multiplyWhole,
  divideTwoDigit,
  decimalOperations,
  addSubtractUnlike,
  fractionWordProblems,
  fractionAsDivision,
  multiplyFractions,
  fractionalArea,
  scaling,
  divideUnitFractions,
  convertMeasurements,
  linePlotShare,
  volume,
  coordinates,
  shapeHierarchy,
];
