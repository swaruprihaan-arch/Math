/**
 * Grade 6 practice skills (California CCSSM).
 *
 * Standards NOT covered (and why):
 *  - 6.NS.5  Explaining the meaning of 0 in context — a written explanation, not a gradable value (6.NS.6–7 cover signed numbers).
 *  - 6.EE.2b Naming parts of an expression (term, factor, coefficient) — vocabulary; better taught than auto-graded.
 *  - 6.EE.6  Writing expressions for a situation — free-form expressions are not uniquely gradable.
 *  - 6.EE.8  Graphing inequality solutions on a number line — requires drawing.
 *  - 6.SP.2  Describing a distribution's shape in words — conceptual (6.SP.3/6.SP.5 skills practice the measures).
 *  - 6.SP.4  Drawing dot plots, histograms and box plots — requires drawing.
 */
import { A, COMPARE_CHOICES, P, prompt, SCHEMA } from '../../domain/question/build';
import type { PromptNode } from '../../domain/question/types';
import { add, absR, div, gcd, lcm, mul, rat, sub, type Rational } from '../../domain/rational/rational';
import { decimalAddSubStrategies, decimalDivideStrategies, decimalMultiplyStrategies } from '../../solutions/strategies/decimals';
import { fractionDivideStrategies } from '../../solutions/strategies/fractions';
import { divisionStrategies } from '../../solutions/strategies/wholeNumber';
import { compareSymbol, fixedChoices, makeChoices } from '../helpers';
import { defineSkill } from '../skill';
import type { Skill } from '../types';
import {
  f,
  factorsOf,
  fdec,
  fmixed,
  fmoney,
  linNodes,
  linText,
  nice,
  niceNode,
  niceStyle,
  np,
  pairNodes,
  pairText,
  primeFactorText,
  ri,
  squareUnits,
  termText,
  way,
  ways,
} from './_g68Helpers';

const VARS = ['x', 'n', 'y', 'a', 'm'] as const;

/* ------------------------------------------------------------------ */
/* 6.RP — Ratios and proportional relationships                         */
/* ------------------------------------------------------------------ */

const RATIO_CONTEXTS = [
  { a: 'girls', b: 'boys', whole: 'students' },
  { a: 'red marbles', b: 'blue marbles', whole: 'marbles' },
  { a: 'cats', b: 'dogs', whole: 'pets' },
  { a: 'tulips', b: 'roses', whole: 'flowers' },
  { a: 'apples', b: 'oranges', whole: 'fruits' },
  { a: 'wins', b: 'losses', whole: 'games' },
] as const;

const ratioLanguage = defineSkill({
  id: 'g6.rp.ratio-language',
  grade: '6',
  domain: 'RP',
  standards: ['6.RP.1'],
  title: 'Write a ratio',
  generate(ctx) {
    const { rng } = ctx;
    const c = rng.choose(RATIO_CONTEXTS);
    const [lo, hi] = ctx.tier({ EASY: [2, 9], MEDIUM: [3, 24], HARD: [6, 40] });
    const [x, y] = ctx.retry(
      () => [rng.integer(lo, hi), rng.integer(lo, hi)] as const,
      ([p, q]) => p !== q,
    );
    const kind = rng.choose(ctx.tier({ EASY: ['ab', 'ba'], MEDIUM: ['ab', 'ba', 'aw'], HARD: ['aw', 'wb', 'ba'] }) as string[]);
    const total = x + y;
    const [first, second, l1, l2] =
      kind === 'ab' ? [x, y, c.a, c.b] : kind === 'ba' ? [y, x, c.b, c.a] : kind === 'aw' ? [x, total, c.a, `all ${c.whole}`] : [total, y, `all ${c.whole}`, c.b];
    const g = gcd(BigInt(first), BigInt(second));
    const p1 = BigInt(first) / g;
    const p2 = BigInt(second) / g;
    const answer = A.ratio(p1, p2);
    const totalStep = kind === 'aw' || kind === 'wb' ? [`All ${c.whole}: ${x} + ${y} = ${total}.`] : [];
    return ctx.question({
      prompt: prompt([P.text(`${x} ${c.a}, ${y} ${c.b}.`), P.br(), P.text(`Ratio of ${l1} to ${l2}?`)]),
      operation: 'RATIO',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.ratio(),
      ...ways(
        way(
          'DIVIDE_BY_GCF',
          'Divide by the GCF',
          answer,
          ...totalStep,
          `${l1} : ${l2} = ${first}:${second}.`,
          g > 1n ? `Divide both by ${g}: ${p1}:${p2}.` : `No common factor, so ${p1}:${p2}.`,
        ),
        way(
          'AS_A_FRACTION',
          'Write it as a fraction',
          answer,
          ...totalStep,
          `Write ${first}/${second}.`,
          g > 1n ? `Simplify: ${first}/${second} = ${p1}/${p2}, so ${p1}:${p2}.` : `${first}/${second} is simplest, so ${p1}:${p2}.`,
        ),
      ),
    });
  },
});

const RATE_ITEMS = ['notebooks', 'pens', 'granola bars', 'tickets', 'water bottles', 'muffins'] as const;
const RATE_CONTEXTS = [
  { things: 'lawns', thing: 'lawn', time: 'hours', one: 'hour' },
  { things: 'pages', thing: 'page', time: 'minutes', one: 'minute' },
  { things: 'laps', thing: 'lap', time: 'minutes', one: 'minute' },
  { things: 'boxes', thing: 'box', time: 'minutes', one: 'minute' },
  { things: 'bracelets', thing: 'bracelet', time: 'hours', one: 'hour' },
] as const;

const unitRate = defineSkill({
  id: 'g6.rp.unit-rate',
  grade: '6',
  domain: 'RP',
  standards: ['6.RP.2', '6.RP.3b'],
  title: 'Unit rates & unit prices',
  generate(ctx) {
    const { rng } = ctx;
    const variant = rng.choose(['price', 'speed', 'rate'] as const);
    if (variant === 'price') {
      const n = ri(rng, ctx.tier({ EASY: [2, 6] as const, MEDIUM: [3, 12] as const, HARD: [4, 24] as const }));
      const cents = ctx.tier({ EASY: 100 * rng.integer(1, 9), MEDIUM: 25 * rng.integer(4, 40), HARD: 5 * rng.integer(10, 200) });
      const unit = rat(cents, 100);
      const total = rat(cents * n, 100);
      const item = rng.choose(RATE_ITEMS);
      const answer = A.number(unit);
      const second =
        cents % 100 === 0
          ? way('MULTIPLICATION_FACT', 'Think multiplication', answer, `${n} × ? = ${fmoney(total)}.`, `${n} × ${fmoney(unit)} = ${fmoney(total)}.`)
          : cents < 100
            ? way('USE_CENTS', 'Use cents', answer, `${fmoney(total)} = ${cents * n} cents.`, `${cents * n} ÷ ${n} = ${cents} cents = ${fmoney(unit)}.`)
            : way(
                'BREAK_APART',
                'Break apart the total',
                answer,
                `${fmoney(total)} = ${fmoney(rat(Math.floor(cents / 100) * 100 * n, 100))} + ${fmoney(rat((cents % 100) * n, 100))}.`,
                `Divide each part by ${n}: ${fmoney(rat(Math.floor(cents / 100), 1))} + ${fmoney(rat(cents % 100, 100))} = ${fmoney(unit)}.`,
              );
      return ctx.question({
        prompt: prompt([P.text(`${n} ${item} cost `), P.money(total), P.text('.'), P.br(), P.text('Cost of 1?')]),
        operation: 'UNIT_PRICE',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.money(),
        answerDisplay: 'money',
        standards: ['6.RP.2', '6.RP.3b'],
        ...ways(way('DIVIDE', 'Divide total by items', answer, `Unit price = total ÷ items.`, `${fmoney(total)} ÷ ${n} = ${fmoney(unit)}.`), second),
      });
    }
    if (variant === 'speed') {
      const speed = ctx.tier({ EASY: rat(5 * rng.integer(4, 14)), MEDIUM: rat(rng.integer(12, 75)), HARD: rat(rng.integer(25, 151), 2) });
      const t = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 8, HARD: 8 }));
      const d = mul(speed, rat(t));
      const who = rng.choose(['A train', 'A car', 'A bus', 'A cyclist']);
      const answer = A.number(speed);
      return ctx.question({
        prompt: prompt([P.text(`${who} goes `), niceNode(d), P.text(` miles in ${t} hours.`), P.br(), P.text('Miles per hour?')]),
        operation: 'UNIT_RATE',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.decimal(['miles per hour', 'mph', 'miles/hour', 'mi/h']),
        answerDisplay: 'decimal',
        standards: ['6.RP.3b'],
        ...ways(
          way('DIVIDE', 'Distance ÷ time', answer, `Speed = miles ÷ hours.`, `${nice(d)} ÷ ${t} = ${nice(speed)} mph.`),
          way('DOUBLE_NUMBER_LINE', 'Double number line', answer, `${t} hours ↔ ${nice(d)} miles.`, `Split into ${t} equal jumps: 1 hour ↔ ${nice(speed)} miles.`),
        ),
      });
    }
    const c = rng.choose(RATE_CONTEXTS);
    // base: a things in b time units; target is a multiple (or, on HARD, a non-multiple) of the base.
    let a: number;
    let b: number;
    let k: Rational;
    if (ctx.difficulty === 'HARD') {
      // a and b share a factor r; the target is a non-multiple of b, so a unit rate (or fractional scale) is needed.
      const r = rng.integer(2, 3);
      a = r * rng.integer(1, 5);
      b = r * rng.integer(1, 5);
      k = rat(ctx.retry(() => rng.integer(2, 12), (z) => z % r !== 0), r);
    } else {
      const max = ctx.difficulty === 'EASY' ? 6 : 9;
      a = rng.integer(2, max);
      b = rng.integer(2, max);
      k = rat(rng.integer(2, ctx.difficulty === 'EASY' ? 5 : 9));
    }
    const askThings = rng.bool();
    const target = mul(rat(askThings ? b : a), k);
    const ans = mul(rat(askThings ? a : b), k);
    const answer = A.number(ans);
    const known = askThings ? b : a;
    const other = askThings ? a : b;
    const unit = rat(other, known);
    return ctx.question({
      prompt: prompt([
        P.text(`${a} ${c.things} take ${b} ${c.time}.`),
        P.br(),
        P.text(askThings ? `How many ${c.things} in ${nice(target)} ${c.time}?` : `How many ${c.time} for ${nice(target)} ${c.things}?`),
      ]),
      operation: 'RATE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber([askThings ? c.things : c.time]),
      standards: ['6.RP.3b'],
      ...ways(
        way(
          'UNIT_RATE',
          'Find the unit rate',
          answer,
          `${other} ÷ ${known} = ${f(unit)} ${askThings ? c.things : c.time} per ${askThings ? c.one : c.thing}.`,
          `${nice(target)} × ${f(unit)} = ${nice(ans)}.`,
        ),
        way('SCALE_FACTOR', 'Scale factor', answer, `${nice(target)} ÷ ${known} = ${f(k)}.`, `${other} × ${f(k)} = ${nice(ans)}.`),
      ),
    });
  },
});

const TABLE_HEADERS = [
  ['Cups of flour', 'Cups of water'],
  ['Hours', 'Dollars earned'],
  ['Laps', 'Minutes'],
  ['Tickets', 'Cost ($)'],
  ['Scoops of mix', 'Cups of juice'],
] as const;

const ratioTable = defineSkill({
  id: 'g6.rp.ratio-table',
  grade: '6',
  domain: 'RP',
  standards: ['6.RP.3a'],
  title: 'Ratio tables',
  generate(ctx) {
    const { rng } = ctx;
    const [u, v] = ctx.retry(
      () => [rng.integer(1, ctx.tier({ EASY: 5, MEDIUM: 9, HARD: 9 })), rng.integer(1, ctx.tier({ EASY: 5, MEDIUM: 9, HARD: 9 }))] as const,
      ([p, q]) => p !== q && gcd(BigInt(p), BigInt(q)) === 1n,
    );
    const rows = ctx.tier({ EASY: 3, MEDIUM: 4, HARD: 3 });
    const multipliers: number[] = ctx.retry(
      () => {
        if (ctx.difficulty === 'EASY') return [1, ...rng.sample([2, 3, 4, 5], rows - 1).sort((p, q) => p - q)];
        if (ctx.difficulty === 'MEDIUM') return rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rows).sort((p, q) => p - q);
        return rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], rows).sort((p, q) => p - q);
      },
      (ms) => (ctx.difficulty === 'HARD' ? ms.slice(1).some((m) => m % (ms[0] as number) !== 0) : true),
    );
    const m1 = multipliers[0] as number;
    const candidates = multipliers.map((m, i) => ({ m, i })).filter(({ m, i }) => i > 0 && (ctx.difficulty !== 'HARD' || m % m1 !== 0));
    const target = rng.choose(candidates);
    const missingCol = ctx.difficulty === 'EASY' ? 1 : rng.integer(0, 1);
    const headers = rng.choose(TABLE_HEADERS);
    const tableRows = multipliers.map((m, i) => {
      const cells = [String(m * u), String(m * v)];
      if (i === target.i) cells[missingCol] = '?';
      return cells;
    });
    const ans = target.m * (missingCol === 1 ? v : u);
    const known = target.m * (missingCol === 1 ? u : v);
    const refKnown = m1 * (missingCol === 1 ? u : v);
    const refOther = m1 * (missingCol === 1 ? v : u);
    const answer = A.number(ans);
    return ctx.question({
      prompt: prompt([P.text('Find the missing value.')], { v: 'table', headers: [...headers], rows: tableRows }),
      operation: 'RATIO_TABLE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.integer(),
      ...ways(
        way('UNIT_RATE', 'Unit rate', answer, `Row ${refKnown} → ${refOther}: rate ${f(rat(refOther, refKnown))} per 1.`, `${known} × ${f(rat(refOther, refKnown))} = ${ans}.`),
        way('SCALE_FACTOR', 'Scale factor', answer, `${known} ÷ ${refKnown} = ${f(rat(known, refKnown))}.`, `${refOther} × ${f(rat(known, refKnown))} = ${ans}.`),
      ),
    });
  },
});

const percentOf = defineSkill({
  id: 'g6.rp.percent-of',
  grade: '6',
  domain: 'RP',
  standards: ['6.RP.3c'],
  title: 'Percent of a number',
  generate(ctx) {
    const { rng } = ctx;
    const [p, q] = ctx.retry(
      () => {
        const pct = ctx.tier({ EASY: rng.choose([10, 20, 25, 50, 75]), MEDIUM: 5 * rng.integer(1, 19), HARD: rng.integer(1, 150) });
        const qty = ri(rng, ctx.tier({ EASY: [8, 100] as const, MEDIUM: [20, 400] as const, HARD: [10, 500] as const }));
        return [pct, qty] as const;
      },
      ([pct, qty]) => ctx.difficulty === 'HARD' || (pct * qty) % 100 === 0,
    );
    const ans = rat(p * q, 100);
    const answer = A.number(ans);
    const second =
      p % 10 === 0
        ? way('TEN_PERCENT', 'Find 10% first', answer, `10% of ${q} = ${nice(rat(q, 10))}.`, `${p}% = ${p / 10} × ${nice(rat(q, 10))} = ${nice(ans)}.`)
        : way('ONE_PERCENT', 'Find 1% first', answer, `1% of ${q} = ${nice(rat(q, 100))}.`, `${p}% = ${p} × ${nice(rat(q, 100))} = ${nice(ans)}.`);
    return ctx.question({
      prompt: prompt([P.text(`${p}% of ${q} = `), P.blank()]),
      operation: 'PERCENT_OF',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...ways(way('PERCENT_AS_DECIMAL', 'Percent as a decimal', answer, `${p}% = ${fdec(rat(p, 100))}.`, `${fdec(rat(p, 100))} × ${q} = ${nice(ans)}.`), second),
    });
  },
});

const percentWhole = defineSkill({
  id: 'g6.rp.percent-whole',
  grade: '6',
  domain: 'RP',
  standards: ['6.RP.3c'],
  title: 'Find the whole or the percent',
  generate(ctx) {
    const { rng } = ctx;
    const [p, w] = ctx.retry(
      () => {
        const pct = ctx.tier({ EASY: rng.choose([10, 20, 25, 50]), MEDIUM: 5 * rng.integer(1, 19), HARD: rng.choose([rng.integer(2, 99), rng.integer(101, 180)]) });
        const whole = ri(rng, ctx.tier({ EASY: [10, 200] as const, MEDIUM: [20, 400] as const, HARD: [20, 500] as const }));
        return [pct, whole] as const;
      },
      ([pct, whole]) => (pct * whole) % 100 === 0,
    );
    const part = (p * w) / 100;
    if (rng.bool()) {
      const answer = A.number(w);
      return ctx.question({
        prompt: prompt([P.text(`${part} is ${p}% of what number?`)]),
        operation: 'PERCENT_FIND_WHOLE',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.decimal(),
        ...ways(
          way('EQUATION', 'Write an equation', answer, `${fdec(rat(p, 100))} × n = ${part}.`, `n = ${part} ÷ ${fdec(rat(p, 100))} = ${w}.`),
          way('ONE_PERCENT', 'Find 1% first', answer, `1% = ${part} ÷ ${p} = ${nice(rat(w, 100))}.`, `100% = ${nice(rat(w, 100))} × 100 = ${w}.`),
        ),
      });
    }
    const answer = A.number(rat(p, 100));
    return ctx.question({
      prompt: prompt([P.text(`${part} is what percent of ${w}?`)]),
      operation: 'PERCENT_FIND_RATE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.percent(),
      ...ways(
        way('FRACTION_TO_PERCENT', 'Fraction to percent', answer, `${part}/${w} = ${f(rat(part, w))}.`, `${f(rat(part, w))} = ${p}/100 = ${p}%.`),
        way('PROPORTION', 'Proportion', answer, `${part}/${w} = p/100.`, `p = ${part} × 100 ÷ ${w} = ${p}.`),
      ),
    });
  },
});

const CONVERSIONS = [
  { big: 'foot', bigs: 'feet', bigAbbr: 'ft', smalls: 'inches', smallAbbr: 'in', factor: 12, metric: false },
  { big: 'yard', bigs: 'yards', bigAbbr: 'yd', smalls: 'feet', smallAbbr: 'ft', factor: 3, metric: false },
  { big: 'pound', bigs: 'pounds', bigAbbr: 'lb', smalls: 'ounces', smallAbbr: 'oz', factor: 16, metric: false },
  { big: 'gallon', bigs: 'gallons', bigAbbr: 'gal', smalls: 'quarts', smallAbbr: 'qt', factor: 4, metric: false },
  { big: 'hour', bigs: 'hours', bigAbbr: 'h', smalls: 'minutes', smallAbbr: 'min', factor: 60, metric: false },
  { big: 'day', bigs: 'days', bigAbbr: 'd', smalls: 'hours', smallAbbr: 'h', factor: 24, metric: false },
  { big: 'meter', bigs: 'meters', bigAbbr: 'm', smalls: 'centimeters', smallAbbr: 'cm', factor: 100, metric: true },
  { big: 'kilometer', bigs: 'kilometers', bigAbbr: 'km', smalls: 'meters', smallAbbr: 'm', factor: 1000, metric: true },
  { big: 'kilogram', bigs: 'kilograms', bigAbbr: 'kg', smalls: 'grams', smallAbbr: 'g', factor: 1000, metric: true },
  { big: 'liter', bigs: 'liters', bigAbbr: 'L', smalls: 'milliliters', smallAbbr: 'mL', factor: 1000, metric: true },
] as const;

const unitConversion = defineSkill({
  id: 'g6.rp.unit-conversion',
  grade: '6',
  domain: 'RP',
  standards: ['6.RP.3d'],
  title: 'Convert units',
  generate(ctx) {
    const { rng } = ctx;
    const c = rng.choose(CONVERSIONS);
    const toSmall = ctx.difficulty === 'EASY' ? true : rng.bool();
    let amount: Rational;
    if (toSmall) {
      amount = ctx.tier({
        EASY: rat(rng.integer(2, 9)),
        MEDIUM: c.metric ? rat(rng.integer(11, 99), 10) : rat(2 * rng.integer(2, 9) + 1, 2),
        HARD: c.metric ? rat(rng.integer(101, 999), 100) : rat(4 * rng.integer(1, 9) + rng.choose([1, 3]), 4),
      });
    } else {
      // small → big: whole result on MEDIUM, fractional/decimal result on HARD
      let bigAmount: Rational;
      if (ctx.difficulty !== 'HARD') bigAmount = rat(rng.integer(2, 9));
      else if (c.metric) bigAmount = rat(rng.integer(101, 999), 100);
      else {
        // fractional result whose denominator divides the factor, so the starting amount is whole
        const den = rng.choose([2, 3, 4, 5, 6, 8].filter((d) => c.factor % d === 0));
        bigAmount = rat(den * rng.integer(1, 6) + rng.integer(1, den - 1), den);
      }
      amount = mul(bigAmount, rat(c.factor));
    }
    const ans = toSmall ? mul(amount, rat(c.factor)) : div(amount, rat(c.factor));
    const fromUnit = toSmall ? c.bigAbbr : c.smallAbbr;
    const toUnit = toSmall ? c.smallAbbr : c.bigAbbr;
    const toWord = toSmall ? c.smalls : c.bigs;
    const amountNode = c.metric ? niceNode(amount) : P.mixed(amount);
    const show = (v: Rational) => (c.metric ? nice(v) : fmixed(v));
    const answer = A.number(ans);
    return ctx.question({
      prompt: prompt([amountNode, P.text(` ${fromUnit} = `), P.blank(), P.text(` ${toUnit}`)]),
      operation: 'CONVERT_UNITS',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber([toWord, toUnit]),
      answerDisplay: c.metric ? niceStyle(ans) : 'mixed',
      ...ways(
        way(
          'CONVERSION_FACTOR',
          toSmall ? 'Multiply by the factor' : 'Divide by the factor',
          answer,
          `1 ${c.bigAbbr} = ${c.factor} ${c.smallAbbr}.`,
          toSmall ? `${show(amount)} × ${c.factor} = ${show(ans)} ${toUnit}.` : `${show(amount)} ÷ ${c.factor} = ${show(ans)} ${toUnit}.`,
        ),
        way(
          'RATIO_TABLE',
          'Ratio table',
          answer,
          `${c.bigAbbr} : ${c.smallAbbr} = 1 : ${c.factor}.`,
          toSmall ? `${show(amount)} : ${show(ans)} (both × ${show(amount)}).` : `${show(ans)} : ${show(amount)} (both × ${show(ans)}).`,
        ),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 6.NS — The number system                                             */
/* ------------------------------------------------------------------ */

const divideFractions = defineSkill({
  id: 'g6.ns.divide-fractions',
  grade: '6',
  domain: 'NS',
  standards: ['6.NS.1'],
  title: 'Divide fractions',
  generate(ctx) {
    const { rng } = ctx;
    const maxDen = ctx.tier({ EASY: 6, MEDIUM: 10, HARD: 12 });
    const frac = (minNum = 1) => {
      const d = rng.integer(2, maxDen);
      return rat(rng.integer(minNum, d - 1), d);
    };
    const word = ctx.difficulty !== 'EASY' && rng.bool(0.4);
    if (word) {
      const kind = rng.choose(['servings', 'share', 'width'] as const);
      const [a, b] = ctx.retry(
        (): [Rational, Rational] => (kind === 'share' ? [frac(), rat(rng.integer(2, 6))] : [ctx.difficulty === 'HARD' ? add(rat(rng.integer(1, 3)), frac()) : frac(), frac()]),
        ([p, q]) => p.denominator !== q.denominator || p.numerator !== q.numerator,
      );
      const result = div(a, b);
      const text: PromptNode[] =
        kind === 'servings'
          ? [P.text('How many '), P.frac(b), P.text('-cup servings are in '), P.mixed(a), P.text(' cups?')]
          : kind === 'share'
            ? [P.text(`${nice(b)} friends share `), P.mixed(a), P.text(' lb of trail mix. Pounds each?')]
            : [P.text('A garden has area '), P.mixed(a), P.text(' sq yd and length '), P.frac(b), P.text(' yd. Width?')];
      return ctx.question({
        prompt: prompt(text),
        operation: 'DIVIDE',
        canonicalAnswer: A.number(result),
        answerSchema: SCHEMA.fraction(),
        validationPolicy: { strictMixed: true },
        answerDisplay: 'mixed',
        ...ways(...fractionDivideStrategies(a, b)),
      });
    }
    const [a, b] = ctx.retry(
      () =>
        ctx.tier({
          EASY: [frac(), rat(1, rng.integer(2, maxDen))] as const,
          MEDIUM: [frac(), frac()] as const,
          HARD: rng.bool() ? ([add(rat(rng.integer(1, 3)), frac()), frac()] as const) : ([frac(), add(rat(rng.integer(1, 2)), frac())] as const),
        }),
      ([p, q]) => !(p.numerator === q.numerator && p.denominator === q.denominator),
    );
    const result = div(a, b);
    return ctx.question({
      prompt: prompt([P.text('Simplest form:'), P.br(), P.mixed(a), P.op('÷'), P.mixed(b), P.op('='), P.blank()]),
      operation: 'DIVIDE',
      operands: [
        { role: 'dividend', value: A.number(a) },
        { role: 'divisor', value: A.number(b) },
      ],
      canonicalAnswer: A.number(result),
      answerSchema: SCHEMA.fraction(),
      validationPolicy: { requireLowestTerms: true, strictMixed: true },
      answerDisplay: 'mixed',
      ...ways(...fractionDivideStrategies(a, b)),
    });
  },
});

const longDivision = defineSkill({
  id: 'g6.ns.long-division',
  grade: '6',
  domain: 'NS',
  standards: ['6.NS.2'],
  title: 'Divide multi-digit numbers',
  generate(ctx) {
    const { rng } = ctx;
    const divisor = ri(rng, ctx.tier({ EASY: [3, 9] as const, MEDIUM: [11, 49] as const, HARD: [12, 99] as const }));
    const quotient = ri(rng, ctx.tier({ EASY: [101, 999] as const, MEDIUM: [21, 300] as const, HARD: [51, 999] as const }));
    const remainder = ctx.difficulty === 'HARD' && rng.bool(0.7) ? rng.integer(1, divisor - 1) : 0;
    const dividend = divisor * quotient + remainder;
    const answer = remainder === 0 ? A.number(quotient) : A.qr(quotient, remainder);
    return ctx.question({
      prompt: prompt([P.num(dividend), P.op('÷'), P.num(divisor), P.op('='), P.blank()]),
      operation: 'DIVIDE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.quotientRemainder(),
      ...ways(...divisionStrategies(dividend, divisor)),
    });
  },
});

const decimalOperations = defineSkill({
  id: 'g6.ns.decimal-operations',
  grade: '6',
  domain: 'NS',
  standards: ['6.NS.3'],
  title: 'Add, subtract, multiply & divide decimals',
  generate(ctx) {
    const { rng } = ctx;
    const op = rng.choose(['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'] as const);
    const places = ctx.tier({ EASY: 1, MEDIUM: 2, HARD: 3 });
    const maxWhole = ctx.tier({ EASY: 20, MEDIUM: 100, HARD: 1000 });
    const decimal = (p: number, maxW: number, min = 1) => rat(rng.integer(min, maxW * 10 ** p), 10 ** p);
    let a: Rational;
    let b: Rational;
    let symbol: '+' | '−' | '×' | '÷';
    let result: Rational;
    let trees;
    if (op === 'ADD' || op === 'SUBTRACT') {
      a = decimal(places, maxWhole);
      b = decimal(rng.integer(1, places), maxWhole);
      if (op === 'SUBTRACT' && compareSymbol(a, b) === '<') [a, b] = [b, a];
      symbol = op === 'ADD' ? '+' : '−';
      result = op === 'ADD' ? add(a, b) : sub(a, b);
      trees = decimalAddSubStrategies(a, b, op);
    } else if (op === 'MULTIPLY') {
      a = ctx.tier({ EASY: decimal(1, 20), MEDIUM: decimal(2, 50), HARD: decimal(2, 100) });
      b = ctx.tier({ EASY: rat(rng.integer(2, 9)), MEDIUM: rat(rng.integer(2, 99), 10), HARD: rat(rng.integer(11, 999), 100) });
      symbol = '×';
      result = mul(a, b);
      trees = decimalMultiplyStrategies(a, b);
    } else {
      b = ctx.tier({ EASY: rat(rng.integer(2, 9)), MEDIUM: rat(rng.integer(2, 99), 10), HARD: rat(rng.integer(11, 999), 100) });
      const q = ctx.tier({ EASY: rat(rng.integer(11, 199), 10), MEDIUM: rat(rng.integer(11, 999), 100), HARD: rat(rng.integer(101, 9999), 100) });
      a = mul(b, q);
      symbol = '÷';
      result = q;
      trees = decimalDivideStrategies(a, b);
    }
    const answer = A.number(result);
    return ctx.question({
      prompt: prompt([P.dec(a), P.op(symbol), P.dec(b), P.op('='), P.blank()]),
      operation: op,
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...ways(...trees),
    });
  },
});

function sharedPrimes(a: number, b: number): number[] {
  const pa = primeFactorText(a).split(' × ').map(Number);
  const pb = primeFactorText(b).split(' × ').map(Number);
  const out: number[] = [];
  const rest = pb.slice();
  for (const p of pa) {
    const i = rest.indexOf(p);
    if (i >= 0) {
      out.push(p);
      rest.splice(i, 1);
    }
  }
  return out;
}

function unionPrimes(a: number, b: number): number[] {
  const pa = primeFactorText(a).split(' × ').map(Number);
  const pb = primeFactorText(b).split(' × ').map(Number);
  const rest = pb.slice();
  const out = pa.slice();
  for (const p of pa) {
    const i = rest.indexOf(p);
    if (i >= 0) rest.splice(i, 1);
  }
  return [...out, ...rest].sort((x, y) => x - y);
}

const gcfLcm = defineSkill({
  id: 'g6.ns.gcf-lcm',
  grade: '6',
  domain: 'NS',
  standards: ['6.NS.4'],
  title: 'GCF and LCM',
  generate(ctx) {
    const { rng } = ctx;
    if (rng.bool()) {
      const max = ctx.tier({ EASY: 30, MEDIUM: 60, HARD: 100 });
      const [a, b] = ctx.retry(
        () => [rng.integer(4, max), rng.integer(4, max)] as const,
        ([p, q]) => p !== q && gcd(BigInt(p), BigInt(q)) >= 2n,
      );
      const g = Number(gcd(BigInt(a), BigInt(b)));
      const shared = sharedPrimes(a, b);
      const answer = A.number(g);
      return ctx.question({
        prompt: prompt([P.text(`GCF of ${a} and ${b}?`)]),
        operation: 'GCF',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(),
        ...ways(
          way('LIST_FACTORS', 'List the factors', answer, `${a}: ${factorsOf(a).join(', ')}.`, `${b}: ${factorsOf(b).join(', ')}.`, `Greatest in both: ${g}.`),
          way('PRIME_FACTORS', 'Prime factors', answer, `${a} = ${primeFactorText(a)}; ${b} = ${primeFactorText(b)}.`, `Shared primes: ${shared.join(' × ')} = ${g}.`),
        ),
      });
    }
    const max = ctx.tier({ EASY: 6, MEDIUM: 10, HARD: 12 });
    const [a, b] = ctx.retry(
      () => [rng.integer(2, max), rng.integer(2, max)] as const,
      ([p, q]) => p !== q && (ctx.difficulty === 'EASY' || (p % q !== 0 && q % p !== 0)),
    );
    const L = Number(lcm(BigInt(a), BigInt(b)));
    const multiples = (n: number) => Array.from({ length: L / n }, (_, i) => n * (i + 1)).join(', ');
    const answer = A.number(L);
    return ctx.question({
      prompt: prompt([P.text(`LCM of ${a} and ${b}?`)]),
      operation: 'LCM',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.integer(),
      ...ways(
        way('LIST_MULTIPLES', 'List multiples', answer, `${a}: ${multiples(a)}.`, `${b}: ${multiples(b)}.`, `First in both: ${L}.`),
        way('PRIME_FACTORS', 'Prime factors', answer, `${a} = ${primeFactorText(a)}; ${b} = ${primeFactorText(b)}.`, `Use each prime the most times it appears: ${unionPrimes(a, b).join(' × ')} = ${L}.`),
      ),
    });
  },
});

const distributiveGcf = defineSkill({
  id: 'g6.ns.distributive-gcf',
  grade: '6',
  domain: 'NS',
  standards: ['6.NS.4'],
  title: 'Factor a sum with the GCF',
  generate(ctx) {
    const { rng } = ctx;
    const [g, m, n] = ctx.retry(
      () => [rng.integer(2, ctx.tier({ EASY: 6, MEDIUM: 9, HARD: 12 })), rng.integer(1, 12), rng.integer(1, 12)] as const,
      ([gg, mm, nn]) => mm !== nn && gcd(BigInt(mm), BigInt(nn)) === 1n && gg * mm <= 100 && gg * nn <= 100,
    );
    const a = g * m;
    const b = g * n;
    const ask = rng.choose(ctx.tier({ EASY: ['g'], MEDIUM: ['g', 'm'], HARD: ['m', 'n'] }) as ('g' | 'm' | 'n')[]);
    const box = (key: 'g' | 'm' | 'n', value: number) => (ask === key ? P.blank() : P.num(value));
    const ans = ask === 'g' ? g : ask === 'm' ? m : n;
    const answer = A.number(ans);
    const back =
      ask === 'g'
        ? way('WORK_BACKWARDS', 'Work backwards', answer, `? × ${m} = ${a}, so ? = ${a} ÷ ${m} = ${g}.`, `Check: ${g} × ${n} = ${b}.`)
        : way(
            'WORK_BACKWARDS',
            'Work backwards',
            answer,
            `${g} × ? = ${ask === 'm' ? a : b}, so ? = ${ask === 'm' ? a : b} ÷ ${g} = ${ans}.`,
            `Check: ${g} × (${m} + ${n}) = ${a} + ${b}.`,
          );
    return ctx.question({
      prompt: prompt([P.text('Fill the box (use the GCF).'), P.br(), P.num(a), P.op('+'), P.num(b), P.op('='), box('g', g), P.op('×'), P.op('('), box('m', m), P.op('+'), box('n', n), P.op(')')]),
      operation: 'DISTRIBUTIVE_FACTOR',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.integer(),
      ...ways(way('GCF_FIRST', 'Find the GCF first', answer, `GCF(${a}, ${b}) = ${g}.`, `${a} ÷ ${g} = ${m}; ${b} ÷ ${g} = ${n}.`, `${a} + ${b} = ${g} × (${m} + ${n}).`), back),
    });
  },
});

const oppositesAbsolute = defineSkill({
  id: 'g6.ns.opposites-absolute-value',
  grade: '6',
  domain: 'NS',
  standards: ['6.NS.6a', '6.NS.7c'],
  title: 'Opposites & absolute value',
  generate(ctx) {
    const { rng } = ctx;
    const mag = ctx.tier({
      EASY: rat(rng.integer(1, 20)),
      MEDIUM: rng.bool() ? rat(rng.integer(1, 100)) : rat(rng.integer(1, 199), 10),
      HARD: rng.bool() ? rat(rng.integer(1, 999), 100) : rat(rng.integer(1, 11), rng.choose([2, 3, 4, 5])),
    });
    const n = rng.bool(0.7) ? mul(mag, rat(-1)) : mag;
    const variant = rng.choose(['opposite', 'double', 'abs', 'debt'] as const);
    if (variant === 'debt') {
      const debt = rat(ri(rng, ctx.tier({ EASY: [5, 50] as const, MEDIUM: [10, 500] as const, HARD: [100, 2000] as const })));
      const answer = A.number(debt);
      return ctx.question({
        prompt: prompt([P.text('Account balance: '), P.money(mul(debt, rat(-1))), P.text('.'), P.br(), P.text('How many dollars are owed?')]),
        operation: 'ABSOLUTE_VALUE',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.money(),
        answerDisplay: 'money',
        standards: ['6.NS.7c'],
        ...ways(
          way('ABSOLUTE_VALUE', 'Absolute value', answer, `Debt size = |−${nice(debt)}|.`, `|−${nice(debt)}| = ${nice(debt)} dollars.`),
          way('NUMBER_LINE', 'Distance from 0', answer, `−${nice(debt)} is ${nice(debt)} units below 0.`, `So ${nice(debt)} dollars are owed.`),
        ),
      });
    }
    const negN = mul(n, rat(-1));
    const value = variant === 'abs' ? absR(n) : negN;
    const answer = A.number(value);
    const nodes: PromptNode[] =
      variant === 'opposite'
        ? [P.text('Opposite of '), niceNode(n), P.text('?')]
        : variant === 'double'
          ? [P.text('−('), niceNode(n), P.text(') = '), P.blank()]
          : [P.abs([niceNode(n)]), P.op('='), P.blank()];
    const inner = n;
    const trees =
      variant === 'abs'
        ? [
            way('DISTANCE_FROM_ZERO', 'Distance from 0', answer, `${nice(n)} is ${nice(absR(n))} units from 0.`, `|${nice(n)}| = ${nice(absR(n))}.`),
            way('DROP_THE_SIGN', 'Rule', answer, `Absolute value is never negative.`, `|${nice(n)}| = ${nice(absR(n))}.`),
          ]
        : [
            way('NUMBER_LINE', 'Number line', answer, `${nice(inner)} is ${nice(absR(inner))} units ${inner.numerator < 0n ? 'left' : 'right'} of 0.`, `Same distance, other side: ${nice(value)}.`),
            way('CHANGE_THE_SIGN', 'Change the sign', answer, variant === 'double' ? `−(${nice(n)}) means the opposite of ${nice(n)}.` : `Opposite: change the sign.`, `${nice(value)}.`),
          ];
    return ctx.question({
      prompt: prompt(nodes),
      operation: variant === 'abs' ? 'ABSOLUTE_VALUE' : 'OPPOSITE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(value),
      standards: variant === 'abs' ? ['6.NS.7c'] : ['6.NS.6a'],
      ...ways(...trees),
    });
  },
});

const compareRationals = defineSkill({
  id: 'g6.ns.compare-rationals',
  grade: '6',
  domain: 'NS',
  standards: ['6.NS.7a', '6.NS.7b'],
  title: 'Compare positive & negative numbers',
  generate(ctx) {
    const { rng } = ctx;
    const pick = (): { v: Rational; node: PromptNode } => {
      if (ctx.difficulty === 'EASY') {
        const v = rat(rng.integer(-20, 20));
        return { v, node: P.num(v) };
      }
      if (ctx.difficulty === 'MEDIUM') {
        const v = rat(rng.integer(-100, 100), 10);
        return { v, node: niceNode(v) };
      }
      const d = rng.choose([2, 4, 5]);
      const v = rat(rng.integer(-3 * d, 3 * d), d);
      return rng.bool() ? { v, node: P.frac(v) } : { v, node: P.dec(v) };
    };
    const [x, y] = ctx.retry(
      () => {
        const first = pick();
        if (ctx.difficulty === 'HARD' && rng.bool(0.2)) return [first, { v: first.v, node: P.dec(first.v) }] as const;
        return [first, pick()] as const;
      },
      ([p, q]) => (p.v.numerator < 0n || q.v.numerator < 0n) && (ctx.difficulty === 'HARD' || compareSymbol(p.v, q.v) !== '='),
    );
    const symbol = compareSymbol(x.v, y.v);
    const answer = A.choice(symbol);
    const both = x.v.numerator < 0n && y.v.numerator < 0n;
    const ruleStep =
      symbol === '='
        ? `${nice(x.v)} and ${nice(y.v)} are the same number.`
        : both
          ? `Both negative: closer to 0 is greater.`
          : `Positive (or 0) beats negative.`;
    return ctx.question({
      prompt: prompt([P.text('Compare.'), P.br(), x.node, P.blank('○'), y.node]),
      operation: 'COMPARE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(COMPARE_CHOICES),
      ...ways(
        way(
          'NUMBER_LINE',
          'Number line',
          answer,
          symbol === '=' ? `Same point on the number line.` : `${nice(x.v)} is ${symbol === '<' ? 'left' : 'right'} of ${nice(y.v)}.`,
          `So ${nice(x.v)} ${symbol} ${nice(y.v)}.`,
        ),
        way('SIGNS_AND_SIZE', 'Signs and size', answer, ruleStep, `So ${nice(x.v)} ${symbol} ${nice(y.v)}.`),
      ),
    });
  },
});

const QUADRANTS = fixedChoices(['Quadrant I', 'Quadrant II', 'Quadrant III', 'Quadrant IV']);

const coordinatePlane = defineSkill({
  id: 'g6.ns.coordinate-plane',
  grade: '6',
  domain: 'NS',
  standards: ['6.NS.6b', '6.NS.6c'],
  title: 'Quadrants & reflections',
  generate(ctx) {
    const { rng } = ctx;
    const max = ctx.tier({ EASY: 9, MEDIUM: 12, HARD: 20 });
    const x = rng.bool() ? rng.integer(1, max) : -rng.integer(1, max);
    const y = rng.bool() ? rng.integer(1, max) : -rng.integer(1, max);
    if (ctx.difficulty === 'EASY' || rng.bool(0.4)) {
      const q = x > 0 ? (y > 0 ? 0 : 3) : y > 0 ? 1 : 2;
      const choice = QUADRANTS[q] as { id: string; label: string };
      const answer = A.choice(choice.id);
      return ctx.question({
        prompt: prompt([P.text('Which quadrant? '), ...pairNodes(x, y)]),
        operation: 'QUADRANT',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.choice(QUADRANTS),
        standards: ['6.NS.6b'],
        ...ways(
          way('SIGNS', 'Look at the signs', answer, `Signs: (${x > 0 ? '+' : '−'}, ${y > 0 ? '+' : '−'}).`, `I (+,+), II (−,+), III (−,−), IV (+,−) → ${choice.label}.`),
          way('MOVE_FROM_ORIGIN', 'Move from the origin', answer, `Go ${Math.abs(x)} ${x > 0 ? 'right' : 'left'}, ${Math.abs(y)} ${y > 0 ? 'up' : 'down'}.`, `That region is ${choice.label}.`),
        ),
      });
    }
    const axis = rng.choose(ctx.tier({ EASY: ['x'], MEDIUM: ['x', 'y'], HARD: ['x', 'y', 'both'] }) as ('x' | 'y' | 'both')[]);
    const rx = axis === 'x' ? x : -x;
    const ry = axis === 'y' ? y : -y;
    const answer = A.pair(rx, ry);
    const axisText = axis === 'both' ? 'both axes' : `the ${axis}-axis`;
    return ctx.question({
      prompt: prompt([P.text('Reflect '), ...pairNodes(x, y), P.text(` across ${axisText}.`)]),
      operation: 'REFLECT',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.pair(),
      standards: ['6.NS.6b'],
      ...ways(
        way(
          'SIGN_RULE',
          'Sign rule',
          answer,
          axis === 'x' ? 'Across the x-axis: y changes sign.' : axis === 'y' ? 'Across the y-axis: x changes sign.' : 'Across both axes: both signs change.',
          `${pairText(x, y)} → ${pairText(rx, ry)}.`,
        ),
        way(
          'COUNT_DISTANCE',
          'Count the distance',
          answer,
          axis === 'y' ? `${Math.abs(x)} units from the y-axis → go to the other side.` : `${Math.abs(y)} units from the x-axis → go to the other side.`,
          axis === 'both' ? `Then flip across the y-axis too: ${pairText(rx, ry)}.` : `New point: ${pairText(rx, ry)}.`,
        ),
      ),
    });
  },
});

const coordinateDistance = defineSkill({
  id: 'g6.ns.coordinate-distance',
  grade: '6',
  domain: 'NS',
  standards: ['6.NS.8', '6.G.3'],
  title: 'Distance on the coordinate plane',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      const [x1, x2, y1, y2] = ctx.retry(
        () => [rng.integer(-12, 12), rng.integer(-12, 12), rng.integer(-12, 12), rng.integer(-12, 12)] as const,
        ([a, b, c, d]) => a < b && c < d,
      );
      const w = x2 - x1;
      const h = y2 - y1;
      const per = 2 * (w + h);
      const answer = A.number(per);
      return ctx.question({
        prompt: prompt([P.text('Rectangle corners: '), ...pairNodes(x1, y1), P.text(', '), ...pairNodes(x2, y1), P.text(', '), ...pairNodes(x2, y2), P.text(', '), ...pairNodes(x1, y2), P.text('.'), P.br(), P.text('Perimeter?')]),
        operation: 'PERIMETER',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(['units', 'unit']),
        standards: ['6.G.3'],
        ...ways(
          way('ADD_ALL_SIDES', 'Add all four sides', answer, `Width |${f(x2)} − ${np(x1)}| = ${w}; height |${f(y2)} − ${np(y1)}| = ${h}.`, `${w} + ${h} + ${w} + ${h} = ${per}.`),
          way('TWICE_LENGTH_PLUS_WIDTH', '2 × (l + w)', answer, `Width ${w}, height ${h}.`, `2 × (${w} + ${h}) = ${per}.`),
        ),
      });
    }
    const shareX = rng.bool();
    const s = rng.integer(-9, 9);
    const [p, q] = ctx.retry(
      () => (ctx.difficulty === 'EASY' ? [rng.integer(1, 10), rng.integer(1, 10)] : [rng.integer(-12, 12), rng.integer(-12, 12)]) as [number, number],
      ([a, b]) => a !== b,
    );
    const d = Math.abs(p - q);
    const answer = A.number(d);
    const P1 = shareX ? [s, p] : [p, s];
    const P2 = shareX ? [s, q] : [q, s];
    const sameSide = Math.sign(p) === Math.sign(q) || p === 0 || q === 0;
    const [big, small] = Math.abs(p) >= Math.abs(q) ? [p, q] : [q, p];
    return ctx.question({
      prompt: prompt([P.text('Distance from '), ...pairNodes(P1[0] as number, P1[1] as number), P.text(' to '), ...pairNodes(P2[0] as number, P2[1] as number)]),
      operation: 'DISTANCE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.integer(['units', 'unit']),
      standards: ['6.NS.8'],
      ...ways(
        way(
          'ABSOLUTE_VALUES',
          'Use absolute values',
          answer,
          `Same ${shareX ? 'x' : 'y'}; compare ${f(p)} and ${f(q)}.`,
          sameSide ? `Same side of 0: ${Math.abs(big)} − ${Math.abs(small)} = ${d}.` : `Opposite sides of 0: ${Math.abs(p)} + ${Math.abs(q)} = ${d}.`,
        ),
        way('SUBTRACT_COORDINATES', 'Subtract coordinates', answer, `|${f(p)} − ${np(q)}| = |${f(p - q)}|.`, `Distance = ${d}.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 6.EE — Expressions and equations                                     */
/* ------------------------------------------------------------------ */

const exponents = defineSkill({
  id: 'g6.ee.exponents',
  grade: '6',
  domain: 'EE',
  standards: ['6.EE.1'],
  title: 'Whole-number exponents',
  generate(ctx) {
    const { rng } = ctx;
    const variant = rng.choose(ctx.tier({ EASY: ['power'], MEDIUM: ['power', 'expression'], HARD: ['fraction', 'expression'] }) as ('power' | 'expression' | 'fraction')[]);
    const powerPick = (): [Rational, number] =>
      ctx.difficulty === 'EASY'
        ? (() => {
            const b = rng.integer(2, 10);
            return [rat(b), b <= 5 && rng.bool() ? 3 : 2];
          })()
        : rng.choose<[Rational, number]>([
            [rat(2), rng.integer(4, 8)],
            [rat(3), rng.integer(3, 5)],
            [rat(4), rng.integer(3, 4)],
            [rat(5), rng.integer(3, 4)],
            [rat(10), rng.integer(3, 6)],
          ]);
    const powText = (b: Rational, e: number) => (b.denominator === 1n ? `${nice(b)}^${e}` : `(${nice(b)})^${e}`);
    const expand = (b: Rational, e: number) => Array.from({ length: e }, () => np(b)).join(' × ');
    const ladder = (b: Rational, e: number) => {
      const out: string[] = [];
      let v = rat(1);
      for (let i = 1; i <= e; i++) {
        v = mul(v, b);
        out.push(nice(v));
      }
      return out.join(', ');
    };
    if (variant === 'expression') {
      const [b1, e1] = powerPick();
      const [b2, e2] = ctx.retry(powerPick, ([b]) => b.numerator !== b1.numerator);
      const v1 = mulPow(b1, e1);
      const v2 = mulPow(b2, e2);
      const plus = rng.bool() || compareSymbol(v1, v2) === '<';
      const result = plus ? add(v1, v2) : sub(v1, v2);
      const answer = A.number(result);
      return ctx.question({
        prompt: prompt([P.pow(b1, e1), P.op(plus ? '+' : '−'), P.pow(b2, e2), P.op('='), P.blank()]),
        operation: 'EVALUATE_POWERS',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.anyNumber(),
        ...ways(
          way('POWERS_FIRST', 'Powers first', answer, `${powText(b1, e1)} = ${nice(v1)}; ${powText(b2, e2)} = ${nice(v2)}.`, `${nice(v1)} ${plus ? '+' : '−'} ${nice(v2)} = ${nice(result)}.`),
          way('EXPAND', 'Write as products', answer, `(${expand(b1, e1)}) ${plus ? '+' : '−'} (${expand(b2, e2)}).`, `${nice(v1)} ${plus ? '+' : '−'} ${nice(v2)} = ${nice(result)}.`),
        ),
      });
    }
    const [b, e] =
      variant === 'fraction'
        ? rng.bool()
          ? ([rat(rng.integer(1, 4), rng.integer(5, 6)), rng.integer(2, 3)] as [Rational, number])
          : ([rat(rng.integer(1, 9), 10), 2] as [Rational, number])
        : powerPick();
    const value = mulPow(b, e);
    const answer = A.number(value);
    const baseNode = b.denominator === 1n ? b : [b.denominator === 10n ? P.dec(b) : P.frac(b)];
    return ctx.question({
      prompt: prompt([P.text('Evaluate: '), P.pow(baseNode, e)]),
      operation: 'POWER',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(value),
      ...ways(
        way('REPEATED_MULTIPLICATION', 'Repeated multiplication', answer, `${powText(b, e)} = ${expand(b, e)}.`, `= ${nice(value)}.`),
        way('BUILD_UP', 'Build up the powers', answer, `Multiply by ${nice(b)} each time.`, `${ladder(b, e)}.`),
      ),
    });
  },
});

function mulPow(b: Rational, e: number): Rational {
  let v = rat(1);
  for (let i = 0; i < e; i++) v = mul(v, b);
  return v;
}

const evaluateExpressions = defineSkill({
  id: 'g6.ee.evaluate-expressions',
  grade: '6',
  domain: 'EE',
  standards: ['6.EE.2c'],
  title: 'Evaluate expressions',
  generate(ctx) {
    const { rng } = ctx;
    const v = rng.choose(VARS);
    const template = rng.choose(
      ctx.tier({ EASY: ['ax+b', 'ax-b'], MEDIUM: ['x2+b', 'a(x+b)', 'ax2-b'], HARD: ['cube', 'faces', 'ax+b-frac'] }) as string[],
    );
    if (template === 'cube' || template === 'faces') {
      const sVal = rng.choose([rat(1, 2), rat(2, 3), rat(3, 2), rat(5, 2), rat(3, 4)]);
      const sq = mul(sVal, sVal);
      const value = template === 'cube' ? mul(sq, sVal) : mul(rat(6), sq);
      const answer = A.number(value);
      const nodes: PromptNode[] =
        template === 'cube'
          ? [P.text('Cube volume '), P.v('V'), P.op('='), P.pow([P.v('s')], 3), P.text('. Find V when '), P.v('s'), P.op('='), P.frac(sVal), P.text('.')]
          : [P.text('Cube surface area '), P.v('A'), P.op('='), P.num(6), P.pow([P.v('s')], 2), P.text('. Find A when '), P.v('s'), P.op('='), P.frac(sVal), P.text('.')];
      return ctx.question({
        prompt: prompt(nodes),
        operation: 'EVALUATE_FORMULA',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.anyNumber(),
        answerDisplay: 'fraction',
        ...ways(
          template === 'cube'
            ? way('SUBSTITUTE', 'Substitute', answer, `V = (${f(sVal)})³.`, `= ${f(sVal)} × ${f(sVal)} × ${f(sVal)} = ${f(value)}.`)
            : way('SUBSTITUTE', 'Substitute', answer, `A = 6 × (${f(sVal)})².`, `= 6 × ${f(sq)} = ${f(value)}.`),
          template === 'cube'
            ? way('TWO_STEPS', 'Square, then multiply again', answer, `s × s = ${f(sq)}.`, `${f(sq)} × ${f(sVal)} = ${f(value)}.`)
            : way('ONE_FACE', 'One face, then six', answer, `One face: ${f(sVal)} × ${f(sVal)} = ${f(sq)}.`, `6 faces: 6 × ${f(sq)} = ${f(value)}.`),
        ),
      });
    }
    const a = rng.integer(2, ctx.tier({ EASY: 9, MEDIUM: 9, HARD: 12 }));
    const b = rng.integer(1, ctx.tier({ EASY: 20, MEDIUM: 20, HARD: 30 }));
    const xVal: Rational = template === 'ax+b-frac' ? rat(rng.integer(1, 7), rng.choose([2, 3, 4])) : rat(rng.integer(ctx.difficulty === 'EASY' ? 1 : 2, ctx.tier({ EASY: 9, MEDIUM: 10, HARD: 10 })));
    let nodes: PromptNode[];
    let value: Rational;
    let first: ReturnType<typeof way>;
    let second: ReturnType<typeof way>;
    const X = nice(xVal);
    if (template === 'ax+b' || template === 'ax+b-frac' || template === 'ax-b') {
      const minus = template === 'ax-b';
      const ax = mul(rat(a), xVal);
      const bb = minus ? rat(Math.min(b, Number(ax.numerator / ax.denominator))) : rat(b);
      value = minus ? sub(ax, bb) : add(ax, bb);
      nodes = [P.num(a), P.v(v), P.op(minus ? '−' : '+'), P.num(bb)];
      const answer = A.number(value);
      first = way('SUBSTITUTE', 'Substitute', answer, `${a} × ${X} ${minus ? '−' : '+'} ${nice(bb)}.`, `${nice(ax)} ${minus ? '−' : '+'} ${nice(bb)} = ${nice(value)}.`);
      second = way('TERM_BY_TERM', 'Term by term', answer, `${a}${v} = ${nice(ax)}.`, `Then ${minus ? 'subtract' : 'add'} ${nice(bb)}: ${nice(value)}.`);
    } else if (template === 'x2+b' || template === 'ax2-b') {
      const sq = mul(xVal, xVal);
      const coef = template === 'x2+b' ? 1 : a;
      const term = mul(rat(coef), sq);
      const minus = template === 'ax2-b';
      const bb = minus ? rat(Math.min(b, Number(term.numerator))) : rat(b);
      value = minus ? sub(term, bb) : add(term, bb);
      nodes = [...(coef === 1 ? [] : [P.num(coef)]), P.pow([P.v(v)], 2), P.op(minus ? '−' : '+'), P.num(bb)];
      const answer = A.number(value);
      first = way('ORDER_OF_OPERATIONS', 'Order of operations', answer, `Exponent first: ${X}² = ${nice(sq)}.`, `${coef === 1 ? '' : `${coef} × ${nice(sq)} = ${nice(term)}; `}${nice(term)} ${minus ? '−' : '+'} ${nice(bb)} = ${nice(value)}.`);
      second = way('EXPAND_SQUARE', 'Write the square out', answer, `${coef === 1 ? '' : `${coef} × `}${X} × ${X} = ${nice(term)}.`, `${nice(term)} ${minus ? '−' : '+'} ${nice(bb)} = ${nice(value)}.`);
    } else {
      const inside = add(xVal, rat(b));
      value = mul(rat(a), inside);
      nodes = [P.num(a), P.op('('), P.v(v), P.op('+'), P.num(b), P.op(')')];
      const answer = A.number(value);
      first = way('PARENTHESES_FIRST', 'Parentheses first', answer, `${X} + ${b} = ${nice(inside)}.`, `${a} × ${nice(inside)} = ${nice(value)}.`);
      second = way('DISTRIBUTE_FIRST', 'Distribute first', answer, `${a}${v} + ${a * b}.`, `${a} × ${X} + ${a * b} = ${nice(value)}.`);
    }
    return ctx.question({
      prompt: prompt([P.text('Evaluate when '), P.v(v), P.op('='), niceNode(xVal), P.text(':'), P.br(), ...nodes]),
      operation: 'EVALUATE',
      canonicalAnswer: A.number(value),
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(value),
      ...ways(first, second),
    });
  },
});

const equivalentExpressions = defineSkill({
  id: 'g6.ee.equivalent-expressions',
  grade: '6',
  domain: 'EE',
  standards: ['6.EE.3', '6.EE.4'],
  title: 'Equivalent expressions',
  generate(ctx) {
    const { rng } = ctx;
    const v = rng.choose(VARS);
    const schema = SCHEMA.expression(v);
    const policy = { requireCombinedLikeTerms: true };
    if (rng.bool()) {
      // Expand a(bx ± c) (HARD adds a like term outside).
      const a = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 9, HARD: 9 }));
      const b = ctx.difficulty === 'EASY' ? 1 : rng.integer(1, 6);
      const c = rng.integer(1, 9);
      const minus = ctx.difficulty !== 'EASY' && rng.bool();
      const extra = ctx.difficulty === 'HARD' ? rng.integer(1, 6) : 0;
      const coef = a * b + extra;
      const constant = minus ? -a * c : a * c;
      const answer = A.linear(v, coef, constant);
      const constFirst = ctx.difficulty === 'EASY' && rng.bool();
      const inside: PromptNode[] = constFirst ? [P.num(c), P.op('+'), P.v(v)] : [...linNodes(b, minus ? -c : c, v)];
      const nodes: PromptNode[] = [P.num(a), P.op('('), ...inside, P.op(')'), ...(extra ? [P.op('+'), ...linNodes(extra, 0, v)] : [])];
      const partA = termText(a * b, v);
      const partB = `${a * c}`;
      return ctx.question({
        prompt: prompt([P.text('Expand and simplify:'), P.br(), ...nodes]),
        operation: 'EXPAND',
        canonicalAnswer: answer,
        answerSchema: schema,
        validationPolicy: policy,
        standards: ['6.EE.3'],
        ...ways(
          way(
            'DISTRIBUTIVE_PROPERTY',
            'Distribute',
            answer,
            `${a} × ${termText(b, v)} = ${partA}; ${a} × ${minus ? `(−${c})` : c} = ${minus ? '−' : ''}${partB}.`,
            ...(extra ? [`Add ${termText(extra, v)}: ${termText(coef, v)}.`] : []),
            `${linText(coef, constant, v)}.`,
          ),
          way(
            'AREA_MODEL',
            'Area model',
            answer,
            `Rectangle ${a} by (${linText(b, minus ? -c : c, v)}).`,
            `Parts: ${partA} and ${minus ? '−' : ''}${partB}.`,
            `${extra ? `Plus ${termText(extra, v)}: ` : ''}${linText(coef, constant, v)}.`,
          ),
        ),
      });
    }
    // Combine like terms.
    if (ctx.difficulty === 'EASY') {
      const count = rng.integer(2, 5);
      const answer = A.linear(v, count, 0);
      const nodes: PromptNode[] = [];
      for (let i = 0; i < count; i++) nodes.push(...(i ? [P.op('+')] : []), P.v(v));
      return ctx.question({
        prompt: prompt([P.text('Simplify:'), P.br(), ...nodes]),
        operation: 'COMBINE_LIKE_TERMS',
        canonicalAnswer: answer,
        answerSchema: schema,
        validationPolicy: policy,
        standards: ['6.EE.3', '6.EE.4'],
        ...ways(
          way('COUNT_THE_TERMS', 'Count the terms', answer, `There are ${count} ${v}'s.`, `${termText(count, v)}.`),
          way('COEFFICIENTS', 'Add coefficients', answer, `Each ${v} is 1${v}.`, `${Array(count).fill('1').join(' + ')} = ${count}, so ${termText(count, v)}.`),
        ),
      });
    }
    const p = rng.integer(2, 9);
    const q = rng.integer(1, 15);
    const r = rng.integer(1, 9);
    const s = rng.integer(1, 15);
    const hard = ctx.difficulty === 'HARD';
    const k = hard ? rng.integer(2, 5) : 0;
    const d = hard ? rng.integer(1, 6) : 0;
    // MEDIUM: p v + q + r v − s ; HARD: p v − q + k(v + d)
    const coef = hard ? p + k : p + r;
    const constant = hard ? -q + k * d : q - s;
    const answer = A.linear(v, coef, constant);
    const nodes: PromptNode[] = hard
      ? [...linNodes(p, -q, v), P.op('+'), P.num(k), P.op('('), ...linNodes(1, d, v), P.op(')')]
      : [...linNodes(p, q, v), P.op('+'), ...linNodes(r, -s, v)];
    return ctx.question({
      prompt: prompt([P.text('Simplify:'), P.br(), ...nodes]),
      operation: 'COMBINE_LIKE_TERMS',
      canonicalAnswer: answer,
      answerSchema: schema,
      validationPolicy: policy,
      standards: ['6.EE.3', '6.EE.4'],
      ...ways(
        way(
          'COMBINE_LIKE_TERMS',
          'Combine like terms',
          answer,
          ...(hard ? [`${k}(${linText(1, d, v)}) = ${linText(k, k * d, v)}.`] : []),
          `${v}-terms: ${p} + ${hard ? k : r} = ${coef}. Numbers: ${hard ? `−${q} + ${k * d}` : `${q} − ${s}`} = ${f(constant)}.`,
          `${linText(coef, constant, v)}.`,
        ),
        way(
          'REARRANGE',
          'Group like terms',
          answer,
          hard ? `(${termText(p, v)} + ${termText(k, v)}) + (−${q} + ${k * d}).` : `(${termText(p, v)} + ${termText(r, v)}) + (${q} − ${s}).`,
          `${linText(coef, constant, v)}.`,
        ),
      ),
    });
  },
});

const oneStepEquations = defineSkill({
  id: 'g6.ee.one-step-equations',
  grade: '6',
  domain: 'EE',
  standards: ['6.EE.7'],
  title: 'One-step equations',
  generate(ctx) {
    const { rng } = ctx;
    const v = rng.choose(VARS);
    const kind = rng.choose(['add', 'mul'] as const);
    let p: Rational;
    let x: Rational;
    if (ctx.difficulty === 'EASY') {
      p = kind === 'add' ? rat(rng.integer(2, 20)) : rat(rng.integer(2, 12));
      x = rat(rng.integer(1, kind === 'add' ? 30 : 12));
    } else if (ctx.difficulty === 'MEDIUM') {
      p = kind === 'add' ? rat(rng.integer(5, 200), 10) : rat(rng.integer(2, 9));
      x = rat(rng.integer(5, 150), 10);
    } else {
      p = ctx.retry(
        () => rat(rng.integer(1, 7), rng.choose([2, 3, 4, 5, 6])),
        (z) => z.denominator !== 1n,
      );
      x = kind === 'add' ? rat(rng.integer(1, 11), rng.choose([2, 3, 4, 6, 8])) : rat(rng.integer(2, 12));
    }
    const q = kind === 'add' ? add(x, p) : mul(p, x);
    const answer = A.number(x);
    const pNode = ctx.difficulty === 'HARD' ? P.frac(p) : niceNode(p);
    const qNode = ctx.difficulty === 'HARD' ? P.mixed(q) : niceNode(q);
    const lhs: PromptNode[] = kind === 'add' ? [P.v(v), P.op('+'), pNode] : [pNode, P.v(v)];
    const show = (r: Rational) => (ctx.difficulty === 'HARD' ? f(r) : nice(r));
    return ctx.question({
      prompt: prompt([P.text('Solve:'), P.br(), ...lhs, P.op('='), qNode]),
      operation: kind === 'add' ? 'SOLVE_ADD' : 'SOLVE_MULTIPLY',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(x),
      ...ways(
        kind === 'add'
          ? way('INVERSE_OPERATION', 'Undo the addition', answer, `Subtract ${show(p)} from both sides.`, `${v} = ${show(q)} − ${show(p)} = ${show(x)}.`)
          : way(
              'INVERSE_OPERATION',
              'Undo the multiplication',
              answer,
              p.denominator === 1n ? `Divide both sides by ${show(p)}.` : `Multiply both sides by ${f(rat(p.denominator, p.numerator))}.`,
              `${v} = ${show(q)} ÷ ${show(p)} = ${show(x)}.`,
            ),
        kind === 'add'
          ? way('FACT_FAMILY', 'Related fact', answer, `? + ${show(p)} = ${show(q)} means ${show(q)} − ${show(p)}.`, `${v} = ${show(x)}. Check: ${show(x)} + ${show(p)} = ${show(q)}.`)
          : way('FACT_FAMILY', 'Related fact', answer, `${show(p)} × ? = ${show(q)} means ${show(q)} ÷ ${show(p)}.`, `${v} = ${show(x)}. Check: ${show(p)} × ${show(x)} = ${show(q)}.`),
      ),
    });
  },
});

const substitution = defineSkill({
  id: 'g6.ee.substitution',
  grade: '6',
  domain: 'EE',
  standards: ['6.EE.5'],
  title: 'Which value makes it true?',
  generate(ctx) {
    const { rng } = ctx;
    const v = rng.choose(VARS);
    const a = rng.integer(2, 9);
    const b = rng.integer(1, 20);
    const inequality = ctx.difficulty !== 'EASY' && rng.bool(ctx.difficulty === 'HARD' ? 0.7 : 0.4);
    if (!inequality) {
      const sol = rng.integer(2, 12);
      const c = a * sol + b;
      const distract = [sol + 1, sol - 1, sol + 2, c - b, Math.round((c + b) / a)].filter((z) => z > 0 && z !== sol);
      const { choices, correctId } = makeChoices(rng, `${sol}`, distract.map(String));
      const answer = A.choice(correctId);
      const shown = choices.map((ch) => Number(ch.label));
      return ctx.question({
        prompt: prompt([P.text(`Which ${v} makes it true?`), P.br(), P.num(a), P.v(v), P.op('+'), P.num(b), P.op('='), P.num(c)]),
        operation: 'SUBSTITUTION',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.choice(choices),
        ...ways(
          way('SUBSTITUTE_EACH', 'Try each value', answer, ...shown.map((z) => `${v} = ${z}: ${a * z + b}${a * z + b === c ? ' ✓' : ''}`)),
          way('SOLVE_THEN_MATCH', 'Solve first', answer, `${a}${v} = ${c} − ${b} = ${c - b}.`, `${v} = ${c - b} ÷ ${a} = ${sol}.`),
        ),
      });
    }
    const greater = rng.bool();
    const k = rng.integer(greater ? 2 : 5, 12);
    const c = a * k + b;
    const correct = greater ? k + rng.integer(1, 3) : k - rng.integer(1, 3);
    const distract = greater ? [k, k - 1, k - 2] : [k, k + 1, k + 2];
    const { choices, correctId } = makeChoices(rng, `${correct}`, distract.filter((z) => z >= 0).map(String));
    const answer = A.choice(correctId);
    const sym = greater ? '>' : '<';
    const shown = choices.map((ch) => Number(ch.label));
    return ctx.question({
      prompt: prompt([P.text(`Which ${v} makes it true?`), P.br(), P.num(a), P.v(v), P.op('+'), P.num(b), P.op(sym), P.num(c)]),
      operation: 'SUBSTITUTION',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way('SUBSTITUTE_EACH', 'Try each value', answer, ...shown.map((z) => `${v} = ${z}: ${a * z + b} ${a * z + b > c ? '>' : a * z + b < c ? '<' : '='} ${c}`)),
        way('SOLVE_THEN_MATCH', 'Solve first', answer, `${a}${v} ${sym} ${c - b}, so ${v} ${sym} ${k}.`, `Only ${correct} works.`),
      ),
    });
  },
});

const tableEquation = defineSkill({
  id: 'g6.ee.table-equation',
  grade: '6',
  domain: 'EE',
  standards: ['6.EE.9'],
  title: 'Equation from a table',
  generate(ctx) {
    const { rng } = ctx;
    const m = rng.integer(2, 9);
    const c = ctx.difficulty === 'EASY' ? (rng.bool() ? 0 : -1) : rng.integer(1, 9);
    // c === -1 marks the additive rule y = x + m on EASY
    const additive = c === -1;
    const rule = (x: number) => (additive ? x + m : m * x + c);
    const start = rng.integer(0, 3);
    const xs = ctx.difficulty === 'HARD' ? rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8], 4).sort((p, q) => p - q) : [start, start + 1, start + 2, start + 3];
    const rows = xs.map((x) => [String(x), String(rule(x))]);
    const label = (mm: number, cc: number) => `y = ${linText(mm, cc, 'x')}`;
    const correctLabel = additive ? label(1, m) : label(m, c);
    const candidates: [number, number][] = additive
      ? [
          [m, 0],
          [1, m + 1],
          [m + 1, 0],
          [2, m - 1],
        ]
      : [
          [1, rule(xs[0] as number) - (xs[0] as number)],
          [m + 1, c],
          [m, c + 1],
          [m - 1, c + 1],
          [c, m],
        ];
    const fits = ([mm, cc]: [number, number]) => xs.every((x) => mm * x + cc === rule(x));
    const distract = candidates.filter((cand) => !fits(cand) && cand[0] !== 0).map(([mm, cc]) => label(mm, cc));
    const { choices, correctId } = makeChoices(rng, correctLabel, distract);
    const answer = A.choice(correctId);
    const x0 = xs[0] as number;
    const x1 = xs[1] as number;
    return ctx.question({
      prompt: prompt([P.text('Which equation fits the table?')], { v: 'table', headers: ['x', 'y'], rows }),
      operation: 'TABLE_EQUATION',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way(
          'FIND_THE_RULE',
          'Find the rule',
          answer,
          additive ? `y is always ${m} more than x.` : `y grows by ${m} for each 1 in x.`,
          additive ? `${correctLabel}.` : `At x = ${x0}: ${m} × ${x0} = ${m * x0}; ${rule(x0)} − ${m * x0} = ${c}. So ${correctLabel}.`,
        ),
        way('TEST_EACH', 'Test the choices', answer, `Plug in x = ${x1}: y should be ${rule(x1)}.`, `Only ${correctLabel} works for every row.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 6.G — Geometry                                                       */
/* ------------------------------------------------------------------ */

const UNITS = [
  { abbr: 'cm', name: 'centimeters' },
  { abbr: 'm', name: 'meters' },
  { abbr: 'in', name: 'inches' },
  { abbr: 'ft', name: 'feet' },
] as const;

const areaPolygons = defineSkill({
  id: 'g6.g.area-polygons',
  grade: '6',
  domain: 'G',
  standards: ['6.G.1'],
  title: 'Area of triangles & quadrilaterals',
  generate(ctx) {
    const { rng } = ctx;
    const unit = rng.choose(UNITS);
    const shape = rng.choose(ctx.tier({ EASY: ['triangle', 'parallelogram'], MEDIUM: ['triangle', 'parallelogram', 'trapezoid'], HARD: ['triangle', 'trapezoid'] }) as ('triangle' | 'parallelogram' | 'trapezoid')[]);
    const dim = (): Rational => (ctx.difficulty === 'HARD' ? rat(rng.integer(4, 40), 2) : rat(rng.integer(2, ctx.tier({ EASY: 12, MEDIUM: 20, HARD: 20 }))));
    const half = rat(1, 2);
    const schema = SCHEMA.anyNumber([...squareUnits(unit.abbr), `square ${unit.name}`]);
    if (shape === 'trapezoid') {
      const [b1, b2] = ctx.retry(() => [dim(), dim()] as const, ([p, q]) => compareSymbol(p, q) !== '=');
      const h = dim();
      const area = mul(mul(half, add(b1, b2)), h);
      const answer = A.number(area);
      return ctx.question({
        prompt: prompt([P.text(`Trapezoid: bases ${nice(b1)} and ${nice(b2)} ${unit.abbr}, height ${nice(h)} ${unit.abbr}.`), P.br(), P.text(`Area in ${unit.abbr}²?`)], {
          v: 'shape',
          shape: 'trapezoid',
          label: `bases ${nice(b1)} and ${nice(b2)}, height ${nice(h)}`,
        }),
        operation: 'AREA',
        canonicalAnswer: answer,
        answerSchema: schema,
        answerDisplay: niceStyle(area),
        ...ways(
          way('FORMULA', 'A = ½(b₁ + b₂)h', answer, `½ × (${nice(b1)} + ${nice(b2)}) × ${nice(h)}.`, `½ × ${nice(add(b1, b2))} × ${nice(h)} = ${nice(area)}.`),
          way(
            'SPLIT_INTO_TRIANGLES',
            'Split into 2 triangles',
            answer,
            `½ × ${nice(b1)} × ${nice(h)} = ${nice(mul(mul(half, b1), h))}.`,
            `½ × ${nice(b2)} × ${nice(h)} = ${nice(mul(mul(half, b2), h))}. Sum: ${nice(area)}.`,
          ),
        ),
      });
    }
    const [b, h] = ctx.retry(
      () => [dim(), dim()] as const,
      ([p, q]) => shape !== 'triangle' || ctx.difficulty === 'HARD' || mul(p, q).numerator % 2n === 0n,
    );
    const rect = mul(b, h);
    const area = shape === 'triangle' ? mul(half, rect) : rect;
    const answer = A.number(area);
    const name = shape === 'triangle' ? 'Triangle' : 'Parallelogram';
    return ctx.question({
      prompt: prompt([P.text(`${name}: base ${nice(b)} ${unit.abbr}, height ${nice(h)} ${unit.abbr}.`), P.br(), P.text(`Area in ${unit.abbr}²?`)], {
        v: 'shape',
        shape: shape === 'triangle' ? 'triangle' : 'parallelogram',
        label: `base ${nice(b)}, height ${nice(h)}`,
      }),
      operation: 'AREA',
      canonicalAnswer: answer,
      answerSchema: schema,
      answerDisplay: niceStyle(area),
      ...ways(
        shape === 'triangle'
          ? way('FORMULA', 'A = ½bh', answer, `½ × ${nice(b)} × ${nice(h)}.`, `= ${nice(area)} ${unit.abbr}².`)
          : way('FORMULA', 'A = bh', answer, `${nice(b)} × ${nice(h)}.`, `= ${nice(area)} ${unit.abbr}².`),
        shape === 'triangle'
          ? way('HALF_A_RECTANGLE', 'Half a rectangle', answer, `Rectangle: ${nice(b)} × ${nice(h)} = ${nice(rect)}.`, `Triangle is half: ${nice(area)}.`)
          : way('MOVE_TO_RECTANGLE', 'Make a rectangle', answer, `Move the end triangle to the other side.`, `Rectangle ${nice(b)} × ${nice(h)} = ${nice(area)}.`),
      ),
    });
  },
});

const volumeFractional = defineSkill({
  id: 'g6.g.volume-fractional-edges',
  grade: '6',
  domain: 'G',
  standards: ['6.G.2'],
  title: 'Volume with fraction edges',
  generate(ctx) {
    const { rng } = ctx;
    const whole = () => rat(rng.integer(1, 6));
    const fracEdge = () =>
      ctx.difficulty === 'HARD' ? add(rat(rng.integer(1, 4)), rat(rng.integer(1, 3), rng.choose([2, 4]))) : rat(2 * rng.integer(0, 3) + 1, 2);
    const count = ctx.tier({ EASY: 1, MEDIUM: 2, HARD: 3 });
    const edges = ctx.retry(
      () => rng.shuffle([fracEdge(), count >= 2 ? fracEdge() : whole(), count >= 3 ? fracEdge() : whole()]),
      (es) => es.some((e) => e.denominator !== 1n),
    );
    const [l, w, h] = edges as [Rational, Rational, Rational];
    const volume = mul(mul(l, w), h);
    const k = Number(lcm(lcm(l.denominator, w.denominator), h.denominator));
    const counts = edges.map((e) => Number((e.numerator * BigInt(k)) / e.denominator));
    const cubes = counts.reduce((p, q) => p * q, 1);
    const unit = rng.choose(['in', 'cm', 'ft'] as const);
    const answer = A.number(volume);
    return ctx.question({
      prompt: prompt([P.text('Box: '), P.mixed(l), P.text(' × '), P.mixed(w), P.text(' × '), P.mixed(h), P.text(` ${unit}.`), P.br(), P.text(`Volume in ${unit}³?`)]),
      operation: 'VOLUME',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.fraction(),
      validationPolicy: { strictMixed: true },
      answerDisplay: 'mixed',
      ...ways(
        way('MULTIPLY_EDGES', 'V = l × w × h', answer, `${f(l)} × ${f(w)} × ${f(h)}.`, `= ${fmixed(volume)} ${unit}³.`),
        way(
          'UNIT_CUBES',
          'Count small cubes',
          answer,
          `Use cubes with edge 1/${k} ${unit}: ${counts.join(' × ')} = ${cubes} cubes.`,
          `Each is 1/${k ** 3} ${unit}³: ${cubes}/${k ** 3} = ${fmixed(volume)}.`,
        ),
      ),
    });
  },
});

const surfaceArea = defineSkill({
  id: 'g6.g.surface-area',
  grade: '6',
  domain: 'G',
  standards: ['6.G.4'],
  title: 'Surface area with nets',
  generate(ctx) {
    const { rng } = ctx;
    const unit = rng.choose(UNITS);
    const kind = rng.choose(ctx.tier({ EASY: ['prism', 'cube'], MEDIUM: ['prism', 'cube'], HARD: ['prism', 'pyramid'] }) as ('prism' | 'cube' | 'pyramid')[]);
    const max = ctx.tier({ EASY: 6, MEDIUM: 12, HARD: 20 });
    const schema = SCHEMA.integer(squareUnits(unit.abbr));
    if (kind === 'cube') {
      const s = rng.integer(2, max);
      const face = s * s;
      const sa = 6 * face;
      const answer = A.number(sa);
      return ctx.question({
        prompt: prompt([P.text(`Cube with edge ${s} ${unit.abbr}.`), P.br(), P.text(`Surface area in ${unit.abbr}²?`)]),
        operation: 'SURFACE_AREA',
        canonicalAnswer: answer,
        answerSchema: schema,
        ...ways(
          way('FORMULA', 'SA = 6s²', answer, `6 × ${s}² = 6 × ${face}.`, `= ${sa}.`),
          way('NET', 'Use the net', answer, `Net: 6 squares, each ${s} × ${s} = ${face}.`, `${Array(6).fill(face).join(' + ')} = ${sa}.`),
        ),
      });
    }
    if (kind === 'pyramid') {
      const s = rng.integer(2, 12);
      const slant = rng.integer(3, 15);
      const tri = (s * slant) / 2;
      const sa = s * s + 2 * s * slant;
      const answer = A.number(sa);
      return ctx.question({
        prompt: prompt([P.text(`Square pyramid: base edge ${s} ${unit.abbr}, triangle height ${slant} ${unit.abbr}.`), P.br(), P.text(`Surface area in ${unit.abbr}²?`)]),
        operation: 'SURFACE_AREA',
        canonicalAnswer: answer,
        answerSchema: schema,
        ...ways(
          way('FORMULA', 'Base + 4 triangles', answer, `${s}² + 4 × ½ × ${s} × ${slant}.`, `${s * s} + ${4 * tri} = ${sa}.`),
          way('NET', 'Use the net', answer, `Net: 1 square (${s * s}) + 4 triangles (${nice(rat(s * slant, 2))} each).`, `${s * s} + ${[1, 2, 3, 4].map(() => nice(rat(s * slant, 2))).join(' + ')} = ${sa}.`),
        ),
      });
    }
    const [l, w, h] = ctx.retry(
      () => [rng.integer(2, max), rng.integer(2, max), rng.integer(2, max)] as const,
      ([p, q, r]) => p !== q && q !== r && p !== r,
    );
    const lw = l * w;
    const lh = l * h;
    const wh = w * h;
    const sa = 2 * (lw + lh + wh);
    const answer = A.number(sa);
    return ctx.question({
      prompt: prompt([P.text(`Prism: ${l} × ${w} × ${h} ${unit.abbr}.`), P.br(), P.text(`Surface area in ${unit.abbr}²?`)]),
      operation: 'SURFACE_AREA',
      canonicalAnswer: answer,
      answerSchema: schema,
      ...ways(
        way('FORMULA', 'SA = 2(lw + lh + wh)', answer, `2 × (${lw} + ${lh} + ${wh}).`, `2 × ${lw + lh + wh} = ${sa}.`),
        way('NET', 'Use the net', answer, `Faces: ${lw}, ${lw}, ${lh}, ${lh}, ${wh}, ${wh}.`, `Add them: ${sa}.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 6.SP — Statistics                                                    */
/* ------------------------------------------------------------------ */

const DATA_CONTEXTS = ['Quiz scores', 'Minutes reading', 'Points scored', 'Pets per family', 'Hours of sleep', 'Push-ups'] as const;

const centerSpread = defineSkill({
  id: 'g6.sp.center-spread',
  grade: '6',
  domain: 'SP',
  standards: ['6.SP.5c', '6.SP.3'],
  title: 'Mean, median, mode, range & MAD',
  generate(ctx) {
    const { rng } = ctx;
    const measure = rng.choose(ctx.tier({ EASY: ['mean', 'median', 'mode', 'range'], MEDIUM: ['mean', 'median', 'range', 'mode'], HARD: ['mad', 'median', 'mean'] }) as ('mean' | 'median' | 'mode' | 'range' | 'mad')[]);
    const n = ctx.difficulty === 'EASY' ? 5 : rng.integer(ctx.tier({ EASY: 5, MEDIUM: 6, HARD: 6 }), ctx.tier({ EASY: 5, MEDIUM: 8, HARD: 9 }));
    const maxV = ctx.tier({ EASY: 20, MEDIUM: 50, HARD: 100 });
    const values: number[] = ctx.retry(
      () => {
        if (measure === 'mode') {
          const distinct = rng.sample(Array.from({ length: maxV }, (_, i) => i + 1), n - 1);
          return rng.shuffle([...distinct, distinct[0] as number]);
        }
        const vs = Array.from({ length: n - 1 }, () => rng.integer(1, maxV));
        const total = vs.reduce((p, q) => p + q, 0);
        let last = rng.integer(1, maxV);
        if (measure === 'mean' || measure === 'mad') last += (n - ((total + last) % n)) % n;
        return rng.shuffle([...vs, last]);
      },
      (vs) => vs.every((x) => x >= 1 && x <= maxV) && new Set(vs).size > 2 && (measure !== 'mad' || vs.some((x) => x !== vs[0])),
    );
    const sorted = values.slice().sort((p, q) => p - q);
    const total = values.reduce((p, q) => p + q, 0);
    const label = rng.choose(DATA_CONTEXTS);
    const names: Record<string, string> = { mean: 'Mean', median: 'Median', mode: 'Mode', range: 'Range', mad: 'Mean absolute deviation (MAD)' };
    const head = prompt([P.text(`${label}: ${values.join(', ')}`), P.br(), P.text(`${names[measure]}?`)]);
    const base = { prompt: head, operation: measure.toUpperCase(), answerSchema: SCHEMA.anyNumber() };
    if (measure === 'mean') {
      const mean = rat(total, n);
      const answer = A.number(mean);
      const guess = sorted[Math.floor(n / 2)] as number;
      const devs = values.map((x) => x - guess);
      const devSum = devs.reduce((p, q) => p + q, 0);
      return ctx.question({
        ...base,
        canonicalAnswer: answer,
        answerDisplay: niceStyle(mean),
        ...ways(
          way('ADD_AND_DIVIDE', 'Add, then divide', answer, `Sum = ${total}.`, `${total} ÷ ${n} = ${nice(mean)}.`),
          way('BALANCE_POINT', 'Balance from a guess', answer, `Guess ${guess}. Differences add to ${f(devSum)}.`, `${guess} + ${np(devSum)} ÷ ${n} = ${nice(mean)}.`),
        ),
      });
    }
    if (measure === 'median') {
      const mid = n % 2 === 1 ? rat(sorted[(n - 1) / 2] as number) : rat((sorted[n / 2 - 1] as number) + (sorted[n / 2] as number), 2);
      const answer = A.number(mid);
      const middle = n % 2 === 1 ? `${sorted[(n - 1) / 2]}` : `${sorted[n / 2 - 1]} and ${sorted[n / 2]}`;
      return ctx.question({
        ...base,
        canonicalAnswer: answer,
        answerDisplay: niceStyle(mid),
        ...ways(
          way('ORDER_AND_FIND_MIDDLE', 'Order, find the middle', answer, `Order: ${sorted.join(', ')}.`, n % 2 === 1 ? `Middle: ${nice(mid)}.` : `Middle two: ${middle}; halfway is ${nice(mid)}.`),
          way('CROSS_OFF_ENDS', 'Cross off the ends', answer, `Cross off highest & lowest in pairs.`, n % 2 === 1 ? `Left: ${middle}.` : `Left: ${middle} → ${nice(mid)}.`),
        ),
      });
    }
    if (measure === 'mode') {
      const counts = new Map<number, number>();
      for (const x of values) counts.set(x, (counts.get(x) ?? 0) + 1);
      const mode = [...counts.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] as number;
      const answer = A.number(mode);
      return ctx.question({
        ...base,
        canonicalAnswer: answer,
        ...ways(
          way('COUNT_EACH_VALUE', 'Count each value', answer, `${mode} appears ${counts.get(mode)} times; the rest once.`, `Mode = ${mode}.`),
          way('ORDER_AND_LOOK', 'Order and look for repeats', answer, `Order: ${sorted.join(', ')}.`, `Repeated value: ${mode}.`),
        ),
      });
    }
    if (measure === 'range') {
      const range = (sorted[n - 1] as number) - (sorted[0] as number);
      const answer = A.number(range);
      return ctx.question({
        ...base,
        canonicalAnswer: answer,
        ...ways(
          way('MAX_MINUS_MIN', 'Greatest − least', answer, `Greatest ${sorted[n - 1]}, least ${sorted[0]}.`, `${sorted[n - 1]} − ${sorted[0]} = ${range}.`),
          way('ORDER_FIRST', 'Order first', answer, `Order: ${sorted.join(', ')}.`, `Last − first = ${range}.`),
        ),
      });
    }
    const mean = total / n;
    const dists = values.map((x) => Math.abs(x - mean));
    const distSum = dists.reduce((p, q) => p + q, 0);
    const mad = rat(distSum, n);
    const above = values.filter((x) => x > mean).reduce((p, q) => p + (q - mean), 0);
    const answer = A.number(mad);
    return ctx.question({
      ...base,
      canonicalAnswer: answer,
      answerDisplay: niceStyle(mad),
      ...ways(
        way('DISTANCES_FROM_MEAN', 'Distances from the mean', answer, `Mean = ${total} ÷ ${n} = ${mean}.`, `Distances: ${dists.join(', ')} (sum ${distSum}).`, `MAD = ${distSum} ÷ ${n} = ${nice(mad)}.`),
        way('ABOVE_EQUALS_BELOW', 'Above balances below', answer, `Mean = ${mean}. Distance above the mean: ${above}.`, `Below balances above, so total = ${2 * above}.`, `MAD = ${2 * above} ÷ ${n} = ${nice(mad)}.`),
      ),
    });
  },
});

const STATISTICAL = [
  'How many hours do students in my class sleep?',
  'How tall are the players on the team?',
  'How many pets do families on my street have?',
  'How long do students spend on homework?',
  'How many books did each classmate read?',
  'What do apples cost at different stores?',
] as const;
const NOT_STATISTICAL = [
  'How tall is the school building?',
  'How many days are in April?',
  'What is my teacher’s name?',
  'How many pets do I have?',
  'How old am I?',
  'How many legs does a spider have?',
] as const;

const statisticalQuestions = defineSkill({
  id: 'g6.sp.statistical-questions',
  grade: '6',
  domain: 'SP',
  standards: ['6.SP.1'],
  title: 'Statistical questions',
  generate(ctx) {
    const { rng } = ctx;
    const askNot = ctx.difficulty === 'HARD' && rng.bool(0.6);
    const correct = askNot ? rng.choose(NOT_STATISTICAL) : rng.choose(STATISTICAL);
    const distract = askNot ? rng.sample(STATISTICAL, 3) : rng.sample(NOT_STATISTICAL, 3);
    const { choices, correctId } = makeChoices(rng, correct, distract);
    const answer = A.choice(correctId);
    return ctx.question({
      prompt: prompt([P.text(askNot ? 'Which is NOT a statistical question?' : 'Which is a statistical question?')]),
      operation: 'STATISTICAL_QUESTION',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way('LOOK_FOR_VARIABILITY', 'Look for variety', answer, 'Statistical questions expect many different answers.', `${askNot ? 'One fixed answer' : 'Many answers'}: “${correct}”`),
        way('IMAGINE_THE_DATA', 'Imagine the data', answer, 'Imagine collecting answers.', askNot ? 'This one gives just one value.' : 'This one gives a spread of values.'),
      ),
    });
  },
});

export const GRADE_6_SKILLS: readonly Skill[] = [
  ratioLanguage,
  unitRate,
  ratioTable,
  percentOf,
  percentWhole,
  unitConversion,
  divideFractions,
  longDivision,
  decimalOperations,
  gcfLcm,
  distributiveGcf,
  oppositesAbsolute,
  compareRationals,
  coordinatePlane,
  coordinateDistance,
  exponents,
  evaluateExpressions,
  equivalentExpressions,
  oneStepEquations,
  substitution,
  tableEquation,
  areaPolygons,
  volumeFractional,
  surfaceArea,
  centerSpread,
  statisticalQuestions,
];

// Exposed for unit tests.
export const __test = { sharedPrimes, unionPrimes, mulPow };
