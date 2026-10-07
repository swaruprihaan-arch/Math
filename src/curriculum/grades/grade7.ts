/**
 * Grade 7 practice skills (California CCSSM).
 *
 * Standards NOT covered (and why):
 *  - 7.RP.2d Explaining what a point on a proportional graph means — a verbal interpretation (7.RP.2b covers (1, r)).
 *  - 7.NS.1a Describing situations where opposites make 0 — verbal; the arithmetic is in 7.NS.1 skills.
 *  - 7.SP.7b Building a probability model from observed data — needs a live experiment/simulation.
 *  - 7.SP.8c Designing a simulation — open-ended.
 */
import { A, P, prompt, SCHEMA } from '../../domain/question/build';
import type { PromptNode } from '../../domain/question/types';
import {
  absR,
  add,
  ceil,
  cmp,
  div,
  gcd,
  isInteger,
  isTerminating,
  mul,
  neg,
  rat,
  reciprocal,
  sub,
  toDecimalString,
  type Rational,
} from '../../domain/rational/rational';
import { fixedChoices, makeChoices } from '../helpers';
import { defineSkill } from '../skill';
import type { Skill } from '../types';
import {
  DEGREE_UNITS,
  PI_APPROX,
  cubicUnits,
  f,
  fdec,
  fmixed,
  fmoney,
  linNodes,
  linText,
  nice,
  niceNode,
  niceStyle,
  np,
  primeFactorText,
  ri,
  squareUnits,
  termText,
  way,
  ways,
} from './_g68Helpers';

const YES_NO = fixedChoices(['Yes', 'No']);
const yesNo = (yes: boolean) => A.choice(yes ? 'yes' : 'no');

/* ------------------------------------------------------------------ */
/* 7.RP                                                                 */
/* ------------------------------------------------------------------ */

const RATE_FRACTION_CONTEXTS = [
  { what: 'mi', per: 'h', q: 'Miles per hour?', verb: 'Walks' },
  { what: 'acre', per: 'h', q: 'Acres per hour?', verb: 'Mows' },
  { what: 'wall', per: 'h', q: 'Walls per hour?', verb: 'Paints' },
  { what: 'cup', per: 'batch', q: 'Cups per batch?', verb: 'Uses' },
] as const;

const unitRateFractions = defineSkill({
  id: 'g7.rp.unit-rate-fractions',
  grade: '7',
  domain: 'RP',
  standards: ['7.RP.1'],
  title: 'Unit rates with fractions',
  generate(ctx) {
    const { rng } = ctx;
    const c = rng.choose(RATE_FRACTION_CONTEXTS);
    const pick = (): Rational =>
      ctx.tier({
        EASY: rat(1, rng.choose([2, 3, 4, 5, 6, 8])),
        MEDIUM: (() => {
          const d = rng.integer(2, 8);
          return rat(rng.integer(1, d - 1), d);
        })(),
        HARD: add(rat(rng.integer(1, 3)), rat(rng.integer(1, 3), 4)),
      });
    const [amount, time] = ctx.retry(
      () => [pick(), pick()] as const,
      ([a, t]) => cmp(a, t) !== 0 && (ctx.difficulty !== 'EASY' || isInteger(div(a, t)) || isInteger(div(t, a))),
    );
    const rate = div(amount, time);
    const answer = A.number(rate);
    const per = c.per === 'batch' ? 'batch' : c.per;
    return ctx.question({
      prompt: prompt([P.text(`${c.verb} `), P.mixed(amount), P.text(` ${c.what} in `), P.mixed(time), P.text(` ${per}.`), P.br(), P.text(c.q)]),
      operation: 'UNIT_RATE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: 'mixed',
      ...ways(
        way('DIVIDE', 'Divide the fractions', answer, `Rate = ${f(amount)} ÷ ${f(time)}.`, `= ${f(amount)} × ${f(reciprocal(time))} = ${fmixed(rate)}.`),
        way('SCALE_TO_ONE', 'Scale to 1 unit', answer, `Multiply both amounts by ${f(reciprocal(time))}.`, `1 ${per} → ${fmixed(rate)} ${c.what}.`),
      ),
    });
  },
});

const proportionalOrNot = defineSkill({
  id: 'g7.rp.proportional-or-not',
  grade: '7',
  domain: 'RP',
  standards: ['7.RP.2a'],
  title: 'Proportional or not?',
  generate(ctx) {
    const { rng } = ctx;
    const k = ctx.tier({ EASY: rat(rng.integer(2, 9)), MEDIUM: rat(rng.integer(3, 19), 2), HARD: rat(rng.integer(1, 9), rng.choose([2, 3, 4])) });
    const kind = rng.choose(['yes', 'offset', 'bump'] as const);
    const step = ctx.difficulty === 'HARD' ? rng.integer(2, 3) : 1;
    const start = rng.integer(1, 3) * step;
    const xs = [0, 1, 2, 3].map((i) => start + i * step * (k.denominator === 1n ? 1 : Number(k.denominator)));
    const b = kind === 'offset' ? rng.integer(1, 6) : 0;
    const bumpRow = rng.integer(1, 3);
    const ys = xs.map((x, i) => add(mul(k, rat(x)), rat(b + (kind === 'bump' && i === bumpRow ? 1 : 0))));
    const proportional = kind === 'yes';
    const answer = yesNo(proportional);
    const ratios = xs.map((x, i) => f(div(ys[i] as Rational, rat(x))));
    const m = div(sub(ys[1] as Rational, ys[0] as Rational), rat((xs[1] as number) - (xs[0] as number)));
    const intercept = sub(ys[0] as Rational, mul(m, rat(xs[0] as number)));
    return ctx.question({
      prompt: prompt([P.text('Is y proportional to x?')], { v: 'table', headers: ['x', 'y'], rows: xs.map((x, i) => [String(x), nice(ys[i] as Rational)]) }),
      operation: 'PROPORTIONAL_TEST',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(YES_NO),
      ...ways(
        way('CHECK_RATIOS', 'Check y ÷ x', answer, `y ÷ x: ${ratios.join(', ')}.`, proportional ? 'All equal → Yes.' : 'Not all equal → No.'),
        way(
          'THROUGH_THE_ORIGIN',
          'Line through (0, 0)?',
          answer,
          `First two rows: rate ${f(m)}, so at x = 0, y = ${f(intercept)}.`,
          proportional ? 'Straight line through (0, 0) → Yes.' : kind === 'offset' ? 'Does not start at (0, 0) → No.' : 'Rate changes between rows → No.',
        ),
      ),
    });
  },
});

const constantOfProportionality = defineSkill({
  id: 'g7.rp.constant-of-proportionality',
  grade: '7',
  domain: 'RP',
  standards: ['7.RP.2b', '7.RP.2c'],
  title: 'Constant of proportionality',
  generate(ctx) {
    const { rng } = ctx;
    const form = rng.choose(['table', 'point', 'words'] as const);
    // Money contexts need a whole-cent unit price; other forms may use any fraction.
    const k =
      form === 'words'
        ? ctx.tier({ EASY: rat(rng.integer(1, 12)), MEDIUM: rat(rng.integer(5, 60), 4), HARD: rat(rng.integer(11, 999), 100) })
        : ctx.tier({ EASY: rat(rng.integer(2, 12)), MEDIUM: rat(rng.integer(5, 60), 4), HARD: rat(rng.integer(1, 11), rng.choose([3, 5, 6, 8])) });
    const x = form === 'words' ? rng.integer(2, 12) : Number(k.denominator) * rng.integer(2, ctx.tier({ EASY: 9, MEDIUM: 6, HARD: 4 }));
    const y = mul(k, rat(x));
    const answer = A.number(k);
    let nodes: PromptNode[];
    let visual;
    if (form === 'table') {
      const xs = [x, 2 * x, 3 * x];
      nodes = [P.text('Find k in y = kx.')];
      visual = { v: 'table' as const, headers: ['x', 'y'], rows: xs.map((xx) => [String(xx), nice(mul(k, rat(xx)))]) };
    } else if (form === 'point') {
      nodes = [P.text('A proportional line passes through '), P.op('('), P.num(x), P.op(','), niceNode(y), P.op(')'), P.text('. Find k.')];
    } else {
      const item = rng.choose(['cookies', 'stickers', 'apples', 'tickets']);
      nodes = [P.text(`${x} ${item} cost `), P.money(y), P.text('. Cost per item (k)?')];
    }
    return ctx.question({
      prompt: prompt(nodes, visual),
      operation: 'CONSTANT_OF_PROPORTIONALITY',
      canonicalAnswer: answer,
      answerSchema: form === 'words' ? SCHEMA.money() : SCHEMA.anyNumber(),
      answerDisplay: form === 'words' ? 'money' : niceStyle(k),
      ...ways(
        way('DIVIDE_Y_BY_X', 'k = y ÷ x', answer, `k = ${nice(y)} ÷ ${x}.`, `k = ${nice(k)}.`),
        way('SCALE_TO_ONE', 'Find y when x = 1', answer, `Divide both by ${x}: (${x}, ${nice(y)}) → (1, ${nice(k)}).`, `At x = 1, y = k = ${nice(k)}.`),
      ),
    });
  },
});

const percentApplications = defineSkill({
  id: 'g7.rp.percent-applications',
  grade: '7',
  domain: 'RP',
  standards: ['7.RP.3'],
  title: 'Tax, tips, discounts & markups',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['tax', 'tip', 'discount', 'markup', 'commission'] as const);
    const [cents, bp] = ctx.retry(
      () => {
        const priceCents = ctx.tier({ EASY: 1000 * rng.integer(1, 20), MEDIUM: 100 * rng.integer(10, 200), HARD: 20 * rng.integer(50, 2500) });
        const basis = ctx.tier({ EASY: 100 * rng.choose([10, 20, 25, 50]), MEDIUM: 500 * rng.integer(1, 8), HARD: rng.choose([250, 500, 750, 825, 875, 1250, 1500, 1800, 2000]) });
        return [priceCents, basis] as const;
      },
      ([pc, b]) => (pc * b) % 10000 === 0,
    );
    const price = rat(cents, 100);
    const r = rat(bp, 10000);
    const pctText = `${fdec(mul(r, rat(100)))}%`;
    const amount = mul(price, r);
    const up = kind === 'tax' || kind === 'tip' || kind === 'markup';
    const total = up ? add(price, amount) : sub(price, amount);
    const askAmount = kind === 'commission' || (kind === 'tip' && ctx.difficulty === 'EASY');
    const result = askAmount ? amount : total;
    const answer = A.number(result);
    const text: Record<typeof kind, string> = {
      tax: `Price ${fmoney(price)}, tax ${pctText}. Total?`,
      tip: askAmount ? `Bill ${fmoney(price)}, tip ${pctText}. Tip amount?` : `Bill ${fmoney(price)}, tip ${pctText}. Total with tip?`,
      discount: `${fmoney(price)} item, ${pctText} off. Sale price?`,
      markup: `Store cost ${fmoney(price)}, markup ${pctText}. Selling price?`,
      commission: `Sales of ${fmoney(price)}, commission ${pctText}. Commission?`,
    };
    const mult = up ? add(rat(1), r) : sub(rat(1), r);
    const tenth = mul(price, rat(1, 10));
    return ctx.question({
      prompt: prompt([P.text(text[kind])]),
      operation: `PERCENT_${kind.toUpperCase()}`,
      canonicalAnswer: answer,
      answerSchema: SCHEMA.money(),
      answerDisplay: 'money',
      ...ways(
        askAmount
          ? way('PERCENT_AS_DECIMAL', 'Percent as a decimal', answer, `${pctText} = ${fdec(r)}.`, `${fdec(r)} × ${fmoney(price)} = ${fmoney(amount)}.`)
          : way('AMOUNT_THEN_ADJUST', 'Find the amount, then adjust', answer, `${pctText} of ${fmoney(price)} = ${fmoney(amount)}.`, `${fmoney(price)} ${up ? '+' : '−'} ${fmoney(amount)} = ${fmoney(total)}.`),
        askAmount
          ? way('TEN_PERCENT', 'Start from 10%', answer, `10% = ${fmoney(tenth)}.`, `${pctText} = ${fdec(mul(r, rat(10)))} × ${fmoney(tenth)} = ${fmoney(amount)}.`)
          : way('ONE_MULTIPLIER', 'One multiplier', answer, `${up ? '100% + ' : '100% − '}${pctText} = ${fdec(mult)}.`, `${fmoney(price)} × ${fdec(mult)} = ${fmoney(total)}.`),
      ),
    });
  },
});

const percentChange = defineSkill({
  id: 'g7.rp.percent-change',
  grade: '7',
  domain: 'RP',
  standards: ['7.RP.3'],
  title: 'Percent increase, decrease & error',
  generate(ctx) {
    const { rng } = ctx;
    const [o, p] = ctx.retry(
      () => [ri(rng, ctx.tier({ EASY: [2, 20] as const, MEDIUM: [4, 60] as const, HARD: [8, 150] as const })) * ctx.tier({ EASY: 10, MEDIUM: 5, HARD: 2 }), ctx.tier({ EASY: 10 * rng.integer(1, 9), MEDIUM: 5 * rng.integer(1, 18), HARD: rng.integer(1, 90) })] as const,
      ([oo, pp]) => (oo * pp) % 100 === 0,
    );
    const kind = rng.choose(ctx.tier({ EASY: ['increase', 'decrease'], MEDIUM: ['increase', 'decrease'], HARD: ['increase', 'decrease', 'error'] }) as ('increase' | 'decrease' | 'error')[]);
    const delta = (o * p) / 100;
    const up = kind === 'increase' || (kind === 'error' && rng.bool());
    const n = up ? o + delta : o - delta;
    const answer = A.number(rat(p, 100));
    const ratio = rat(n, o);
    const nodes: PromptNode[] =
      kind === 'error'
        ? [P.text(`Estimate ${n}, actual ${o}.`), P.br(), P.text('Percent error?')]
        : [P.text(`${o} → ${n}.`), P.br(), P.text(`Percent ${kind}?`)];
    return ctx.question({
      prompt: prompt(nodes),
      operation: `PERCENT_${kind.toUpperCase()}`,
      canonicalAnswer: answer,
      answerSchema: SCHEMA.percent(),
      ...ways(
        way('CHANGE_OVER_ORIGINAL', 'Change ÷ original', answer, `Change: |${n} − ${o}| = ${delta}.`, `${delta} ÷ ${o} = ${fdec(rat(p, 100))} = ${p}%.`),
        way('NEW_OVER_ORIGINAL', 'New ÷ original', answer, `${n} ÷ ${o} = ${fdec(ratio)} = ${fdec(mul(ratio, rat(100)))}%.`, `Difference from 100%: ${p}%.`),
      ),
    });
  },
});

const simpleInterest = defineSkill({
  id: 'g7.rp.simple-interest',
  grade: '7',
  domain: 'RP',
  standards: ['7.RP.3'],
  title: 'Simple interest',
  generate(ctx) {
    const { rng } = ctx;
    const principal = ctx.tier({ EASY: 100 * rng.integer(1, 10), MEDIUM: 50 * rng.integer(4, 100), HARD: 50 * rng.integer(10, 200) });
    const rate = ctx.tier({ EASY: rat(rng.integer(2, 10)), MEDIUM: rat(rng.integer(2, 24), 2), HARD: rat(rng.integer(2, 24), 2) });
    const t = rng.integer(1, ctx.tier({ EASY: 5, MEDIUM: 6, HARD: 10 }));
    const perYear = mul(rat(principal), div(rate, rat(100)));
    const interest = mul(perYear, rat(t));
    const askTotal = ctx.difficulty === 'HARD' && rng.bool();
    const result = askTotal ? add(rat(principal), interest) : interest;
    const answer = A.number(result);
    return ctx.question({
      prompt: prompt([P.text(`${fmoney(principal)} at ${fdec(rate)}% simple interest for ${t} year${t === 1 ? '' : 's'}.`), P.br(), P.text(askTotal ? 'Total balance?' : 'Interest earned?')]),
      operation: 'SIMPLE_INTEREST',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.money(),
      answerDisplay: 'money',
      ...ways(
        way('FORMULA', 'I = P × r × t', answer, `I = ${fmoney(principal)} × ${fdec(div(rate, rat(100)))} × ${t} = ${fmoney(interest)}.`, ...(askTotal ? [`Total: ${fmoney(principal)} + ${fmoney(interest)} = ${fmoney(result)}.`] : [])),
        way('ONE_YEAR_FIRST', 'One year first', answer, `1 year: ${fdec(rate)}% of ${fmoney(principal)} = ${fmoney(perYear)}.`, `${t} years: ${t} × ${fmoney(perYear)} = ${fmoney(interest)}.`, ...(askTotal ? [`Add ${fmoney(principal)}: ${fmoney(result)}.`] : [])),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 7.NS                                                                 */
/* ------------------------------------------------------------------ */

function pickSigned(ctx: { difficulty: string }, rng: { integer(a: number, b: number): number; choose<T>(items: readonly T[]): T; bool(p?: number): boolean }): Rational {
  if (ctx.difficulty === 'EASY') return rat(rng.integer(1, 20) * (rng.bool() ? 1 : -1));
  if (ctx.difficulty === 'MEDIUM') return rat(rng.integer(1, 200) * (rng.bool() ? 1 : -1), 10);
  const d = rng.choose([2, 3, 4, 5, 6, 8]);
  return rat(rng.integer(1, 3 * d) * (rng.bool() ? 1 : -1), d);
}

function signedNode(v: Rational, hard: boolean): PromptNode {
  return hard && !isInteger(v) ? P.numP(v, 'fraction') : niceNode(v, true);
}

const addSubtractRationals = defineSkill({
  id: 'g7.ns.add-subtract-rationals',
  grade: '7',
  domain: 'NS',
  standards: ['7.NS.1'],
  title: 'Add & subtract signed numbers',
  generate(ctx) {
    const { rng } = ctx;
    const [a, b] = ctx.retry(
      () => [pickSigned(ctx, rng), pickSigned(ctx, rng)] as const,
      ([x, y]) => x.numerator < 0n || y.numerator < 0n,
    );
    const subtract = rng.bool();
    const addend = subtract ? neg(b) : b;
    const result = add(a, addend);
    const answer = A.number(result);
    const hard = ctx.difficulty === 'HARD';
    const show = (v: Rational) => (hard ? f(v) : nice(v));
    const sameSign = (a.numerator < 0n) === (addend.numerator < 0n);
    const [big, small] = cmp(absR(a), absR(addend)) >= 0 ? [a, addend] : [addend, a];
    return ctx.question({
      prompt: prompt([signedNode(a, hard), P.op(subtract ? '−' : '+'), signedNode(b, hard), P.op('='), P.blank()]),
      operation: subtract ? 'SUBTRACT' : 'ADD',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(result),
      ...ways(
        way(
          'SIGN_RULES',
          'Sign rules',
          answer,
          ...(subtract ? [`Subtracting = adding the opposite: ${show(a)} + ${hard ? `(${show(addend)})` : np(addend)}.`] : []),
          sameSign
            ? `Same signs: add sizes ${show(absR(a))} + ${show(absR(addend))}, keep the sign.`
            : `Different signs: ${show(absR(big))} − ${show(absR(small))}; take the sign of ${show(big)}.`,
          `= ${show(result)}.`,
        ),
        way(
          'NUMBER_LINE',
          'Number line',
          answer,
          `Start at ${show(a)}.`,
          `Move ${show(absR(addend))} ${addend.numerator < 0n ? 'left' : 'right'}.`,
          `Land on ${show(result)}.`,
        ),
      ),
    });
  },
});

const multiplyDivideRationals = defineSkill({
  id: 'g7.ns.multiply-divide-rationals',
  grade: '7',
  domain: 'NS',
  standards: ['7.NS.2a', '7.NS.2b', '7.NS.2c'],
  title: 'Multiply & divide signed numbers',
  generate(ctx) {
    const { rng } = ctx;
    const hard = ctx.difficulty === 'HARD';
    const sgn = () => (rng.bool() ? 1 : -1);
    const factor = (): Rational =>
      ctx.tier({
        EASY: rat(sgn() * rng.integer(1, 12)),
        MEDIUM: rng.bool() ? rat(sgn() * rng.integer(1, 99), 10) : rat(sgn() * rng.integer(2, 12)),
        HARD: rat(sgn() * rng.integer(1, 9), rng.choose([2, 3, 4, 5])),
      });
    const divide = rng.bool();
    const [x, y] = ctx.retry(
      () => [factor(), ctx.difficulty === 'MEDIUM' ? rat(sgn() * rng.integer(2, 9)) : factor()] as const,
      ([p, q]) => (p.numerator < 0n || q.numerator < 0n) && q.numerator !== 0n,
    );
    // For division, show (x·y) ÷ y so integer/decimal quotients stay exact.
    const a = divide ? mul(x, y) : x;
    const b = y;
    const result = divide ? x : mul(x, y);
    const answer = A.number(result);
    const negatives = [a, b].filter((v) => v.numerator < 0n).length;
    const show = (v: Rational) => (hard ? f(v) : nice(v));
    const sizeA = absR(a);
    const sizeB = absR(b);
    const sizeR = absR(result);
    const sym = divide ? '÷' : '×';
    return ctx.question({
      prompt: prompt([signedNode(a, hard), P.op(sym), signedNode(b, hard), P.op('='), P.blank()]),
      operation: divide ? 'DIVIDE' : 'MULTIPLY',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(result),
      ...ways(
        way('SIGN_RULE', 'Sign rule', answer, negatives === 1 ? 'Signs differ → negative.' : 'Signs match → positive.', `${show(sizeA)} ${sym} ${show(sizeB)} = ${show(sizeR)}, so ${show(result)}.`),
        divide
          ? way('THINK_MULTIPLICATION', 'Think multiplication', answer, `? × ${paren(show, b)} = ${show(a)}.`, `${paren(show, result)} × ${paren(show, b)} = ${show(a)}, so ${show(result)}.`)
          : way('COUNT_NEGATIVES', 'Count the negatives', answer, `${negatives} negative sign${negatives === 1 ? '' : 's'} → ${negatives % 2 ? 'negative' : 'positive'}.`, `Size: ${show(sizeR)}. Answer: ${show(result)}.`),
      ),
    });
  },
});

const TERMINATING_DENS: { EASY: number[]; MEDIUM: number[]; HARD: number[] } = { EASY: [2, 4, 5, 10], MEDIUM: [4, 8, 20, 25], HARD: [8, 16, 40, 32] };

const fractionToDecimal = defineSkill({
  id: 'g7.ns.fraction-to-decimal',
  grade: '7',
  domain: 'NS',
  standards: ['7.NS.2d'],
  title: 'Fractions to decimals',
  generate(ctx) {
    const { rng } = ctx;
    const d = rng.choose(ctx.tier(TERMINATING_DENS));
    const n = ctx.retry(
      () => rng.integer(1, ctx.difficulty === 'HARD' ? 3 * d : d - 1),
      (z) => z % d !== 0 && gcd(BigInt(z), BigInt(d)) === 1n,
    );
    const negative = ctx.difficulty === 'HARD' && rng.bool(0.4);
    const value = rat(negative ? -n : n, d);
    const answer = A.number(value);
    let tenPower = 10;
    while (tenPower % d !== 0 && tenPower < 100000) tenPower *= 10;
    const m = tenPower / d;
    return ctx.question({
      prompt: prompt([P.text('Write as a decimal: '), P.frac(value)]),
      operation: 'FRACTION_TO_DECIMAL',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...ways(
        way('LONG_DIVISION', 'Divide top by bottom', answer, `${n} ÷ ${d} (add zeros after the point).`, `= ${fdec(value)}.`),
        way('POWER_OF_TEN', 'Make a power of 10', answer, `× ${m}/${m}: ${n}/${d} = ${n * m}/${tenPower}.`, `${n * m}/${tenPower} = ${fdec(value)}.`),
      ),
    });
  },
});

function truncatedDigits(v: Rational, digits: number): string {
  const scale = 10n ** BigInt(digits);
  const scaled = (v.numerator * scale) / v.denominator;
  const intPart = scaled / scale;
  return `${intPart}.${(scaled % scale).toString().padStart(digits, '0')}`;
}

const terminatingOrRepeating = defineSkill({
  id: 'g7.ns.terminating-or-repeating',
  grade: '7',
  domain: 'NS',
  standards: ['7.NS.2d'],
  title: 'Terminating or repeating?',
  generate(ctx) {
    const { rng } = ctx;
    const dens = ctx.tier({ EASY: [2, 3, 4, 5, 6, 9, 10], MEDIUM: [3, 6, 7, 8, 9, 11, 12, 16, 20], HARD: [12, 15, 24, 25, 30, 35, 40, 48, 80] });
    const [n, d] = ctx.retry(
      () => {
        const den = rng.choose(dens);
        return [rng.integer(1, den - 1), den] as const;
      },
      ([nn, dd]) => ctx.difficulty !== 'EASY' || gcd(BigInt(nn), BigInt(dd)) === 1n,
    );
    const v = rat(n, d);
    const terminates = isTerminating(v);
    const choices = fixedChoices(['Terminates', 'Repeats']);
    const answer = A.choice(terminates ? 'terminates' : 'repeats');
    const reduced = `${v.numerator}/${v.denominator}`;
    return ctx.question({
      prompt: prompt([P.text('As a decimal, does this terminate or repeat? '), { t: 'rawfrac', numerator: BigInt(n), denominator: BigInt(d) }]),
      operation: 'DECIMAL_TYPE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way(
          'FACTOR_DENOMINATOR',
          'Factor the denominator',
          answer,
          `Simplest form: ${reduced}; ${v.denominator} = ${primeFactorText(Number(v.denominator))}.`,
          terminates ? 'Only 2s and 5s → terminates.' : 'Another prime → repeats.',
        ),
        way('LONG_DIVISION', 'Divide it out', answer, `${n} ÷ ${d} = ${truncatedDigits(v, 6)}…`, terminates ? `It stops: ${toDecimalString(v)}.` : 'The digits repeat forever.'),
      ),
    });
  },
});

const rationalWordProblems = defineSkill({
  id: 'g7.ns.rational-word-problems',
  grade: '7',
  domain: 'NS',
  standards: ['7.NS.3'],
  title: 'Signed-number word problems',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['temperature', 'diver', 'bank', 'difference'] as const);
    const hard = ctx.difficulty === 'HARD';
    if (kind === 'difference') {
      const [hi, lo] = ctx.retry(() => [rng.integer(-15, 20), rng.integer(-30, 5)] as const, ([h, l]) => h > l && l < 0);
      const d = hi - lo;
      const answer = A.number(d);
      return ctx.question({
        prompt: prompt([P.text(`High ${f(hi)}°F, low ${f(lo)}°F.`), P.br(), P.text('Difference in degrees?')]),
        operation: 'DIFFERENCE',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(['°F', '°', 'degrees']),
        ...ways(
          way('SUBTRACT', 'Subtract', answer, `${f(hi)} − ${np(lo)} = ${f(hi)} + ${f(-lo)}.`, `= ${d}°F.`),
          way('DISTANCE_ON_NUMBER_LINE', 'Distance on a number line', answer, `From ${f(lo)} up to 0: ${-lo}${hi >= 0 ? `; 0 up to ${hi}: ${hi}` : ''}.`, `Total ${d}°F.`),
        ),
      });
    }
    const start = kind === 'bank' ? rat(-rng.integer(5, 80) * (hard ? 1 : 1), 1) : rat(kind === 'diver' ? -rng.integer(5, 60) : rng.integer(-12, 15));
    const changeMag = hard ? rat(rng.integer(15, 400), 4) : rat(rng.integer(3, 40));
    const down = kind === 'diver' ? rng.bool(0.6) : kind === 'temperature' ? rng.bool() : false;
    const change = down ? neg(changeMag) : changeMag;
    const result = add(start, change);
    const answer = A.number(result);
    const money = kind === 'bank';
    const show = (v: Rational) => (money ? fmoney(v) : nice(v));
    const text =
      kind === 'temperature'
        ? `It is ${nice(start)}°F. It ${down ? 'drops' : 'rises'} ${nice(changeMag)}°F. New temperature?`
        : kind === 'diver'
          ? `A diver is at ${nice(start)} ft. She ${down ? 'descends' : 'rises'} ${nice(changeMag)} ft. New depth?`
          : `Balance ${fmoney(start)}. Deposit ${fmoney(changeMag)}. New balance?`;
    return ctx.question({
      prompt: prompt([P.text(text)]),
      operation: 'SIGNED_CHANGE',
      canonicalAnswer: answer,
      answerSchema: money ? SCHEMA.money() : SCHEMA.anyNumber(kind === 'temperature' ? ['°F', '°', 'degrees'] : ['ft', 'feet']),
      answerDisplay: money ? 'money' : niceStyle(result),
      ...ways(
        way('WRITE_AN_EXPRESSION', 'Write an expression', answer, `${show(start)} ${down ? '−' : '+'} ${show(changeMag)}.`, `= ${show(result)}.`),
        way('NUMBER_LINE', 'Number line', answer, `Start at ${show(start)}; move ${show(changeMag)} ${down ? 'down' : 'up'}.`, `Land on ${show(result)}.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 7.EE                                                                 */
/* ------------------------------------------------------------------ */

const VARS = ['x', 'n', 'y', 'a', 'b'] as const;

const linearExpressions = defineSkill({
  id: 'g7.ee.linear-expressions',
  grade: '7',
  domain: 'EE',
  standards: ['7.EE.1'],
  title: 'Expand, combine & factor',
  generate(ctx) {
    const { rng } = ctx;
    const v = rng.choose(VARS);
    const kind = rng.choose(ctx.tier({ EASY: ['expand', 'combine'], MEDIUM: ['expand', 'subtract', 'factor'], HARD: ['expand', 'subtract', 'combine', 'factor'] }) as ('expand' | 'combine' | 'subtract' | 'factor')[]);
    const schema = SCHEMA.expression(v);
    const policy = { requireCombinedLikeTerms: true };
    if (kind === 'factor') {
      const g = rng.integer(2, 9);
      const [p, q] = ctx.retry(() => [rng.integer(1, 9), rng.integer(1, 12) * (rng.bool() ? 1 : -1)] as const, ([pp, qq]) => gcd(BigInt(pp), BigInt(Math.abs(qq))) === 1n);
      const askG = rng.bool();
      const answer = A.number(askG ? g : p);
      return ctx.question({
        prompt: prompt([P.text('Fill the box:'), P.br(), ...linNodes(g * p, g * q, v), P.op('='), askG ? P.blank() : P.num(g), P.op('('), ...(askG ? linNodes(p, q, v) : [P.blank(), P.v(v), P.op(q < 0 ? '−' : '+'), P.num(Math.abs(q))]), P.op(')')]),
        operation: 'FACTOR',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(),
        ...ways(
          way('GCF', 'Use the GCF', answer, `GCF of ${g * p} and ${Math.abs(g * q)} is ${g}.`, `${termText(g * p, v)} ÷ ${g} = ${termText(p, v)}; ${f(g * q)} ÷ ${g} = ${f(q)}.`),
          way('CHECK_BY_DISTRIBUTING', 'Distribute to check', answer, `${g}(${linText(p, q, v)}) = ${linText(g * p, g * q, v)}.`, `So the box is ${askG ? g : p}.`),
        ),
      });
    }
    if (kind === 'expand') {
      const a = ctx.tier({ EASY: rat(rng.integer(2, 6)), MEDIUM: rat(-rng.integer(2, 9)), HARD: rng.bool() ? rat(rng.integer(1, 3), rng.choose([2, 3, 4])) : rat(-rng.integer(2, 9), 2) });
      const den = Number(a.denominator);
      const b = rat(den * rng.integer(1, 4));
      const c = rat(den * rng.integer(1, 6) * (rng.bool() ? 1 : -1));
      const coef = mul(a, b);
      const constant = mul(a, c);
      const answer = A.linear(v, coef, constant);
      const aNode: PromptNode[] = isInteger(a) ? [P.num(a)] : [P.op('('), P.frac(a), P.op(')')];
      return ctx.question({
        prompt: prompt([P.text('Expand:'), P.br(), ...aNode, P.op('('), ...linNodes(b, c, v), P.op(')')]),
        operation: 'EXPAND',
        canonicalAnswer: answer,
        answerSchema: schema,
        validationPolicy: policy,
        ...ways(
          way('DISTRIBUTE', 'Distribute', answer, `${np(a)} × ${termText(b, v)} = ${termText(coef, v)}; ${np(a)} × ${np(c)} = ${nice(constant)}.`, `${linText(coef, constant, v)}.`),
          way('AREA_MODEL', 'Area model', answer, `Box: ${nice(a)} by ${termText(b, v)} and ${nice(c)}.`, `Areas ${termText(coef, v)} and ${nice(constant)} → ${linText(coef, constant, v)}.`),
        ),
      });
    }
    if (kind === 'subtract') {
      const [p, q, r, s] = [rng.integer(3, 12), rng.integer(-9, 9), rng.integer(1, 9), rng.integer(-9, 9)];
      const coef = p - r;
      const constant = q - s;
      const answer = A.linear(v, coef, constant);
      return ctx.question({
        prompt: prompt([P.text('Simplify:'), P.br(), P.op('('), ...linNodes(p, q, v), P.op(')'), P.op('−'), P.op('('), ...linNodes(r, s, v), P.op(')')]),
        operation: 'SUBTRACT_EXPRESSIONS',
        canonicalAnswer: answer,
        answerSchema: schema,
        validationPolicy: policy,
        ...ways(
          way('DISTRIBUTE_THE_MINUS', 'Distribute the minus', answer, `−(${linText(r, s, v)}) = ${linText(-r, -s, v)}.`, `${termText(p, v)} ${r >= 0 ? '−' : '+'} ${termText(Math.abs(r), v)} and ${f(q)} ${s >= 0 ? '−' : '+'} ${Math.abs(s)}: ${linText(coef, constant, v)}.`),
          way('ADD_THE_OPPOSITE', 'Add the opposite', answer, `(${linText(p, q, v)}) + (${linText(-r, -s, v)}).`, `Combine: ${linText(coef, constant, v)}.`),
        ),
      });
    }
    // combine with decimals / fractions
    const dec = ctx.difficulty === 'HARD';
    const t1 = dec ? rat(rng.integer(1, 30), 10) : rat(rng.integer(1, 9));
    const t2 = dec ? rat(-rng.integer(1, 30), 10) : rat(rng.integer(1, 9));
    const k1 = rat(rng.integer(1, 12));
    const k2 = rat(rng.integer(1, 12) * (rng.bool() ? 1 : -1));
    const coef = add(t1, t2);
    const constant = add(k1, k2);
    const answer = A.linear(v, coef, constant);
    return ctx.question({
      prompt: prompt([P.text('Simplify:'), P.br(), ...linNodes(t1, k1, v), P.op(t2.numerator < 0n ? '−' : '+'), ...linNodes(absR(t2), k2, v)]),
      operation: 'COMBINE_LIKE_TERMS',
      canonicalAnswer: answer,
      answerSchema: schema,
      validationPolicy: policy,
      ...ways(
        way('COMBINE_LIKE_TERMS', 'Combine like terms', answer, `${v}: ${nice(t1)} + ${np(t2)} = ${nice(coef)}. Numbers: ${nice(k1)} + ${np(k2)} = ${nice(constant)}.`, `${linText(coef, constant, v)}.`),
        way('REARRANGE', 'Group like terms', answer, `(${termText(t1, v)} ${t2.numerator < 0n ? '−' : '+'} ${termText(absR(t2), v)}) + (${nice(k1)} ${k2.numerator < 0n ? '−' : '+'} ${nice(absR(k2))}).`, `${linText(coef, constant, v)}.`),
      ),
    });
  },
});

const percentExpressions = defineSkill({
  id: 'g7.ee.percent-expressions',
  grade: '7',
  domain: 'EE',
  standards: ['7.EE.2'],
  title: 'Rewrite percent changes',
  generate(ctx) {
    const { rng } = ctx;
    const v = rng.choose(['a', 'p', 'x'] as const);
    const pct = ctx.tier({ EASY: 10 * rng.integer(1, 5), MEDIUM: 5 * rng.integer(1, 12), HARD: rng.integer(1, 40) });
    const up = rng.bool();
    const r = rat(pct, 100);
    const mult = up ? add(rat(1), r) : sub(rat(1), r);
    const answer = A.linear(v, mult, 0);
    return ctx.question({
      prompt: prompt([P.text('Write as one term:'), P.br(), P.v(v), P.op(up ? '+' : '−'), P.dec(r), P.v(v)]),
      operation: 'REWRITE_PERCENT',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.expression(v),
      validationPolicy: { requireCombinedLikeTerms: true },
      ...ways(
        way('FACTOR_OUT', 'Factor out the variable', answer, `${v} = 1${v}, so (1 ${up ? '+' : '−'} ${fdec(r)})${v}.`, `= ${fdec(mult)}${v}.`),
        way('PERCENT_THINKING', 'Think in percents', answer, `${up ? 'Increase' : 'Decrease'} by ${pct}%: 100% ${up ? '+' : '−'} ${pct}% = ${pct * (up ? 1 : -1) + 100}%.`, `${pct * (up ? 1 : -1) + 100}% = ${fdec(mult)} → ${fdec(mult)}${v}.`),
      ),
    });
  },
});

const multiStepProblems = defineSkill({
  id: 'g7.ee.multi-step-problems',
  grade: '7',
  domain: 'EE',
  standards: ['7.EE.3'],
  title: 'Multi-step word problems',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['raise', 'board', 'center'] as const);
    if (kind === 'raise') {
      const [wage, pct] = ctx.retry(
        () => [rat(ctx.tier({ EASY: 2 * rng.integer(5, 20), MEDIUM: rng.integer(12, 40), HARD: rng.integer(24, 90) }) * (ctx.difficulty === 'HARD' ? 1 : 1), ctx.difficulty === 'HARD' ? 2 : 1), ctx.tier({ EASY: 10, MEDIUM: 5 * rng.integer(1, 4), HARD: rng.choose([2, 4, 5, 8, 12, 15]) })] as const,
        ([w, p]) => isInteger(mul(mul(w, rat(p)), rat(1))) || mul(w, rat(p, 100)).denominator <= 100n,
      );
      const raise = mul(wage, rat(pct, 100));
      const result = add(wage, raise);
      const answer = A.number(result);
      return ctx.question({
        prompt: prompt([P.text(`${fmoney(wage)}/hour, then a ${pct}% raise. New wage?`)]),
        operation: 'RAISE',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.money(),
        answerDisplay: 'money',
        ...ways(
          way('FIND_RAISE_THEN_ADD', 'Find the raise, then add', answer, `${pct}% of ${fmoney(wage)} = ${fmoney(raise)}.`, `${fmoney(wage)} + ${fmoney(raise)} = ${fmoney(result)}.`),
          way('ONE_MULTIPLIER', 'One multiplier', answer, `100% + ${pct}% = ${fdec(rat(100 + pct, 100))}.`, `${fmoney(wage)} × ${fdec(rat(100 + pct, 100))} = ${fmoney(result)}.`),
        ),
      });
    }
    const quarter = () => rat(4 * rng.integer(ctx.tier({ EASY: 3, MEDIUM: 5, HARD: 10 }), ctx.tier({ EASY: 12, MEDIUM: 20, HARD: 40 })) + rng.integer(1, 3), 4);
    const [whole, piece] = ctx.retry(() => [quarter(), quarter()] as const, ([w, p]) => cmp(w, mul(p, rat(3, 2))) > 0);
    if (kind === 'board') {
      const left = sub(whole, piece);
      const answer = A.number(left);
      return ctx.question({
        prompt: prompt([P.text('Cut '), P.mixed(piece), P.text(' in from a '), P.mixed(whole), P.text(' in board. Length left?')]),
        operation: 'SUBTRACT_MIXED',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.anyNumber(['in', 'inches']),
        answerDisplay: 'mixed',
        ...ways(
          way('IMPROPER_FRACTIONS', 'Use improper fractions', answer, `${f(whole)} − ${f(piece)} = ${f(left)}.`, `= ${fmixed(left)} in.`),
          way('DECIMALS', 'Use decimals', answer, `${fdec(whole)} − ${fdec(piece)} = ${fdec(left)}.`, `= ${fmixed(left)} in.`),
        ),
      });
    }
    const gap = div(sub(whole, piece), rat(2));
    const answer = A.number(gap);
    return ctx.question({
      prompt: prompt([P.text('Center a '), P.mixed(piece), P.text(' in bar on a '), P.mixed(whole), P.text(' in door. Gap on each side?')]),
      operation: 'CENTER',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(['in', 'inches']),
      answerDisplay: 'mixed',
      ...ways(
        way('SUBTRACT_THEN_HALVE', 'Subtract, then halve', answer, `${fmixed(whole)} − ${fmixed(piece)} = ${fmixed(sub(whole, piece))}.`, `Half: ${fmixed(gap)} in.`),
        way('HALVE_THEN_SUBTRACT', 'Halve, then subtract', answer, `Half door ${fmixed(div(whole, rat(2)))}; half bar ${fmixed(div(piece, rat(2)))}.`, `${fmixed(div(whole, rat(2)))} − ${fmixed(div(piece, rat(2)))} = ${fmixed(gap)} in.`),
      ),
    });
  },
});

const twoStepEquations = defineSkill({
  id: 'g7.ee.two-step-equations',
  grade: '7',
  domain: 'EE',
  standards: ['7.EE.4a'],
  title: 'Two-step equations',
  generate(ctx) {
    const { rng } = ctx;
    const v = rng.choose(VARS);
    if (ctx.difficulty === 'MEDIUM' && rng.bool(0.3)) {
      const len = rng.integer(4, 30);
      const wid = rng.integer(2, 30);
      const per = 2 * (len + wid);
      const answer = A.number(wid);
      return ctx.question({
        prompt: prompt([P.text(`Rectangle: perimeter ${per} cm, length ${len} cm. Width?`)]),
        operation: 'PERIMETER_EQUATION',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(['cm']),
        ...ways(
          way('EQUATION', 'Write an equation', answer, `2(${len}) + 2w = ${per} → 2w = ${per - 2 * len}.`, `w = ${wid} cm.`),
          way('HALF_THE_PERIMETER', 'Half the perimeter', answer, `Length + width = ${per} ÷ 2 = ${per / 2}.`, `${per / 2} − ${len} = ${wid} cm.`),
        ),
      });
    }
    const form = rng.choose(['px+q', 'p(x+q)'] as const);
    const x = ctx.tier({ EASY: rat(rng.integer(1, 12)), MEDIUM: rat(rng.integer(-12, 12)), HARD: rng.bool() ? rat(rng.integer(-20, 20), 2) : rat(rng.integer(-12, 12)) });
    const p = ctx.tier({ EASY: rat(rng.integer(2, 9)), MEDIUM: rat(rng.integer(2, 9) * (rng.bool() ? 1 : -1)), HARD: rng.bool() ? rat(rng.integer(1, 5), rng.choose([2, 3, 4])) : rat(-rng.integer(2, 9)) });
    const q = rat(rng.integer(1, 15) * (ctx.difficulty === 'EASY' || rng.bool() ? 1 : -1));
    const r = form === 'px+q' ? add(mul(p, x), q) : mul(p, add(x, q));
    const answer = A.number(x);
    const pNode: PromptNode[] = isInteger(p) ? (p.numerator === -1n ? [P.text('−')] : [P.num(p)]) : [P.frac(p)];
    const lhs: PromptNode[] =
      form === 'px+q' ? [...pNode, P.v(v), P.op(q.numerator < 0n ? '−' : '+'), P.num(absR(q))] : [...pNode, P.op('('), P.v(v), P.op(q.numerator < 0n ? '−' : '+'), P.num(absR(q)), P.op(')')];
    return ctx.question({
      prompt: prompt([P.text('Solve:'), P.br(), ...lhs, P.op('='), niceNode(r)]),
      operation: form === 'px+q' ? 'SOLVE_TWO_STEP' : 'SOLVE_DISTRIBUTIVE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(x),
      ...(form === 'px+q'
        ? ways(
            way('UNDO_OPERATIONS', 'Undo the operations', answer, `${q.numerator < 0n ? 'Add' : 'Subtract'} ${nice(absR(q))}: ${nice(p)}${v} = ${nice(sub(r, q))}.`, `Divide by ${nice(p)}: ${v} = ${nice(x)}.`),
            way('BAR_MODEL', 'Bar model', answer, `${nice(r)} is ${nice(p)} equal parts ${q.numerator < 0n ? 'minus' : 'plus'} ${nice(absR(q))}.`, `One part: (${nice(r)} ${q.numerator < 0n ? '+' : '−'} ${nice(absR(q))}) ÷ ${np(p)} = ${nice(x)}.`),
          )
        : ways(
            way('DIVIDE_FIRST', 'Divide first', answer, `Divide by ${nice(p)}: ${v} ${q.numerator < 0n ? '−' : '+'} ${nice(absR(q))} = ${nice(div(r, p))}.`, `${v} = ${nice(x)}.`),
            way('DISTRIBUTE_FIRST', 'Distribute first', answer, `${nice(p)}${v} ${mul(p, q).numerator < 0n ? '−' : '+'} ${nice(absR(mul(p, q)))} = ${nice(r)}.`, `${nice(p)}${v} = ${nice(sub(r, mul(p, q)))}, so ${v} = ${nice(x)}.`),
          )),
    });
  },
});

const inequalities = defineSkill({
  id: 'g7.ee.inequalities',
  grade: '7',
  domain: 'EE',
  standards: ['7.EE.4b'],
  title: 'Two-step inequalities',
  generate(ctx) {
    const { rng } = ctx;
    if (ctx.difficulty !== 'HARD' && rng.bool(0.35)) {
      const base = 10 * rng.integer(2, 10);
      const per = rng.integer(2, 9);
      const goal = base + rng.integer(10, 120);
      const n = Number(ceil(rat(goal - base, per)));
      const answer = A.number(n);
      return ctx.question({
        prompt: prompt([P.text(`Pay: $${base} plus $${per} per sale. Goal: at least $${goal}.`), P.br(), P.text('Fewest sales?')]),
        operation: 'INEQUALITY_WORD',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(['sales']),
        ...ways(
          way('SOLVE_INEQUALITY', 'Solve the inequality', answer, `${base} + ${per}s ≥ ${goal} → s ≥ ${f(rat(goal - base, per))}.`, `Smallest whole number: ${n}.`),
          way('TRY_VALUES', 'Try values', answer, `${n - 1} sales: $${base + per * (n - 1)} (too little).`, `${n} sales: $${base + per * n} ✓.`),
        ),
      });
    }
    const v = rng.choose(VARS);
    const k = rng.integer(-10, 12);
    const p = ctx.difficulty === 'HARD' && rng.bool(0.6) ? -rng.integer(2, 9) : rng.integer(2, 9);
    const q = rng.integer(-15, 15);
    const r = p * k + q;
    const sym = rng.choose(['>', '<'] as const);
    const flip = p < 0;
    const outSym = flip ? (sym === '>' ? '<' : '>') : sym;
    const other = outSym === '>' ? '<' : '>';
    const correct = `${v} ${outSym} ${f(k)}`;
    const wrongBoundary = Number.isInteger((r + q) / p) && (r + q) / p !== k ? (r + q) / p : k + (k >= 0 ? 2 : -2);
    const { choices, correctId } = makeChoices(rng, correct, [`${v} ${other} ${f(k)}`, `${v} ${outSym} ${f(wrongBoundary)}`, `${v} ${other} ${f(wrongBoundary)}`]);
    const answer = A.choice(correctId);
    const test = k + (outSym === '>' ? 1 : -1);
    return ctx.question({
      prompt: prompt([P.text('Solve:'), P.br(), P.num(p), P.v(v), P.op(q < 0 ? '−' : '+'), P.num(Math.abs(q)), P.op(sym), P.num(r)]),
      operation: 'SOLVE_INEQUALITY',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way(
          'INVERSE_OPERATIONS',
          'Inverse operations',
          answer,
          `${q < 0 ? 'Add' : 'Subtract'} ${Math.abs(q)}: ${f(p)}${v} ${sym} ${f(r - q)}.`,
          `Divide by ${f(p)}${flip ? ' (negative → flip the sign)' : ''}: ${correct}.`,
        ),
        way('TEST_A_VALUE', 'Solve the equation, then test', answer, `${f(p)}${v} ${q < 0 ? '−' : '+'} ${Math.abs(q)} = ${f(r)} gives ${v} = ${f(k)}.`, `Test ${v} = ${f(test)}: ${f(p * test + q)} ${sym} ${f(r)} ✓ → ${correct}.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 7.G                                                                  */
/* ------------------------------------------------------------------ */

const scaleDrawings = defineSkill({
  id: 'g7.g.scale-drawings',
  grade: '7',
  domain: 'G',
  standards: ['7.G.1'],
  title: 'Scale drawings',
  generate(ctx) {
    const { rng } = ctx;
    const k = rng.integer(2, ctx.tier({ EASY: 10, MEDIUM: 20, HARD: 25 }));
    const kind = rng.choose(ctx.tier({ EASY: ['actual'], MEDIUM: ['actual', 'drawing'], HARD: ['drawing', 'area'] }) as ('actual' | 'drawing' | 'area')[]);
    const scaleText = `Scale: 1 cm = ${k} m.`;
    if (kind === 'area') {
      const w = rng.integer(2, 9);
      const h = rng.integer(2, 9);
      const area = w * k * h * k;
      const answer = A.number(area);
      return ctx.question({
        prompt: prompt([P.text(`${scaleText} A room is ${w} cm by ${h} cm on the plan.`), P.br(), P.text('Actual area in m²?')]),
        operation: 'SCALE_AREA',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(squareUnits('m')),
        ...ways(
          way('ACTUAL_SIDES_FIRST', 'Actual sides first', answer, `${w * k} m by ${h * k} m.`, `${w * k} × ${h * k} = ${area} m².`),
          way('SCALE_THE_AREA', 'Scale the area', answer, `Plan area ${w * h} cm²; each cm² = ${k}² = ${k * k} m².`, `${w * h} × ${k * k} = ${area} m².`),
        ),
      });
    }
    const drawing = ctx.difficulty === 'EASY' ? rat(rng.integer(2, 12)) : rat(rng.integer(5, 150), 10);
    const actual = mul(drawing, rat(k));
    const toActual = kind === 'actual';
    const answer = A.number(toActual ? actual : drawing);
    return ctx.question({
      prompt: prompt([P.text(scaleText), P.br(), P.text(toActual ? `Plan length ${nice(drawing)} cm. Actual length in m?` : `Actual length ${nice(actual)} m. Plan length in cm?`)]),
      operation: toActual ? 'SCALE_TO_ACTUAL' : 'SCALE_TO_DRAWING',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal(toActual ? ['m', 'meters'] : ['cm', 'centimeters']),
      answerDisplay: 'decimal',
      ...ways(
        toActual
          ? way('MULTIPLY_BY_SCALE', 'Multiply by the scale', answer, `Each cm is ${k} m.`, `${nice(drawing)} × ${k} = ${nice(actual)} m.`)
          : way('DIVIDE_BY_SCALE', 'Divide by the scale', answer, `Each ${k} m is 1 cm.`, `${nice(actual)} ÷ ${k} = ${nice(drawing)} cm.`),
        way('RATIO_TABLE', 'Ratio table', answer, `cm : m = 1 : ${k}.`, toActual ? `${nice(drawing)} : ${nice(actual)}.` : `${nice(drawing)} : ${nice(actual)} (÷ ${k}).`),
      ),
    });
  },
});

const triangleConditions = defineSkill({
  id: 'g7.g.triangle-conditions',
  grade: '7',
  domain: 'G',
  standards: ['7.G.2'],
  title: 'Can these make a triangle?',
  generate(ctx) {
    const { rng } = ctx;
    const useAngles = ctx.difficulty === 'EASY' || (ctx.difficulty === 'HARD' && rng.bool());
    if (useAngles) {
      const good = rng.bool();
      const [a, b] = ctx.retry(() => [rng.integer(15, 120), rng.integer(15, 120)] as const, ([x, y]) => x + y < 170);
      const c = good ? 180 - a - b : 180 - a - b + rng.choose([-20, -10, 10, 20]);
      const ok = a + b + c === 180;
      const answer = yesNo(ok);
      return ctx.question({
        prompt: prompt([P.text(`Angles ${a}°, ${b}°, ${c}°. A triangle?`)]),
        operation: 'TRIANGLE_ANGLES',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.choice(YES_NO),
        ...ways(
          way('ANGLE_SUM', 'Angle sum', answer, `${a} + ${b} + ${c} = ${a + b + c}.`, ok ? 'Exactly 180° → Yes.' : 'Not 180° → No.'),
          way('THIRD_ANGLE', 'Find the needed third angle', answer, `Needed: 180 − ${a} − ${b} = ${180 - a - b}°.`, ok ? `Given ${c}° matches → Yes.` : `Given ${c}° does not match → No.`),
        ),
      });
    }
    const [a, b] = ctx.retry(() => [rng.integer(2, 15), rng.integer(2, 15)] as const, ([x, y]) => x <= y);
    const kind = rng.choose(ctx.difficulty === 'HARD' ? (['ok', 'equal', 'long'] as const) : (['ok', 'long'] as const));
    const c = kind === 'ok' ? rng.integer(b, a + b - 1) : kind === 'equal' ? a + b : a + b + rng.integer(1, 6);
    const ok = a + b > c;
    const answer = yesNo(ok);
    const sides = rng.shuffle([a, b, c]);
    return ctx.question({
      prompt: prompt([P.text(`Sides ${sides.join(', ')} cm. A triangle?`)]),
      operation: 'TRIANGLE_SIDES',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(YES_NO),
      ...ways(
        way('TRIANGLE_INEQUALITY', 'Two short sides vs. longest', answer, `${a} + ${b} = ${a + b}; longest ${c}.`, ok ? `${a + b} > ${c} → Yes.` : `${a + b} is not more than ${c} → No.`),
        way('TRY_TO_BUILD', 'Try to build it', answer, `Lay ${c} cm flat; can ${a} and ${b} meet above it?`, ok ? 'They reach and meet → Yes.' : 'Too short (or flat) → No.'),
      ),
    });
  },
});

const CROSS_SECTIONS = [
  { solid: 'rectangular prism', cut: 'parallel to its base', shape: 'Rectangle', why: 'Same shape as the base.', real: 'Slicing a block of cheese flat.' },
  { solid: 'rectangular prism', cut: 'straight down, parallel to a side', shape: 'Rectangle', why: 'Same shape as a side face.', real: 'Slicing a loaf of bread.' },
  { solid: 'cube', cut: 'parallel to a face', shape: 'Square', why: 'Matches a square face.', real: 'Cutting a sugar cube flat.' },
  { solid: 'square pyramid', cut: 'parallel to its base', shape: 'Square', why: 'A smaller copy of the base.', real: 'Cutting the top off a pyramid.' },
  { solid: 'square pyramid', cut: 'straight down through the top point', shape: 'Triangle', why: 'It shows the triangle side profile.', real: 'Like a tent seen from the front.' },
  { solid: 'cylinder', cut: 'parallel to its base', shape: 'Circle', why: 'Same shape as the base.', real: 'Slicing a carrot into coins.' },
  { solid: 'cylinder', cut: 'straight down through the center', shape: 'Rectangle', why: 'Height by diameter.', real: 'Cutting a can in half lengthwise.' },
  { solid: 'cone', cut: 'parallel to its base', shape: 'Circle', why: 'A smaller copy of the base.', real: 'Cutting the tip off an ice-cream cone.' },
  { solid: 'cone', cut: 'straight down through the tip', shape: 'Triangle', why: 'It shows the side profile.', real: 'A party hat seen from the side.' },
] as const;

const crossSections = defineSkill({
  id: 'g7.g.cross-sections',
  grade: '7',
  domain: 'G',
  standards: ['7.G.3'],
  title: 'Cross sections',
  generate(ctx) {
    const { rng } = ctx;
    const pool = ctx.difficulty === 'EASY' ? CROSS_SECTIONS.filter((c) => c.cut.startsWith('parallel')) : CROSS_SECTIONS;
    const c = rng.choose(pool);
    const choices = fixedChoices(['Rectangle', 'Square', 'Triangle', 'Circle']);
    const answer = A.choice(c.shape.toLowerCase());
    return ctx.question({
      prompt: prompt([P.text(`A ${c.solid} is sliced ${c.cut}. Shape of the slice?`)]),
      operation: 'CROSS_SECTION',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(way('MATCH_THE_FACE', 'Match the face', answer, c.why, `→ ${c.shape}.`), way('REAL_OBJECT', 'Picture a real object', answer, c.real, `The cut face is a ${c.shape.toLowerCase()}.`)),
    });
  },
});

const circles = defineSkill({
  id: 'g7.g.circles',
  grade: '7',
  domain: 'G',
  standards: ['7.G.4'],
  title: 'Circumference & area of circles',
  generate(ctx) {
    const { rng } = ctx;
    const unit = rng.choose(['cm', 'm', 'in', 'ft'] as const);
    const kind = rng.choose(ctx.tier({ EASY: ['circumference'], MEDIUM: ['circumference', 'area'], HARD: ['area', 'diameterFromC'] }) as ('circumference' | 'area' | 'diameterFromC')[]);
    const r = rng.integer(1, ctx.tier({ EASY: 10, MEDIUM: 12, HARD: 20 }));
    const d = 2 * r;
    const C = mul(PI_APPROX, rat(d));
    const pi = 'π ≈ 3.14';
    if (kind === 'diameterFromC') {
      const answer = A.number(d);
      return ctx.question({
        prompt: prompt([P.text(`Circumference ${fdec(C)} ${unit} (${pi}). Diameter?`)]),
        operation: 'DIAMETER_FROM_CIRCUMFERENCE',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.decimal([unit]),
        ...ways(
          way('DIVIDE_BY_PI', 'd = C ÷ π', answer, `${fdec(C)} ÷ 3.14 = ${d}.`, `d = ${d} ${unit}.`),
          way('RADIUS_THEN_DOUBLE', 'Find r, then double', answer, `r = ${fdec(C)} ÷ 6.28 = ${r}.`, `d = 2 × ${r} = ${d} ${unit}.`),
        ),
      });
    }
    const givenDiameter = rng.bool();
    const given = givenDiameter ? `diameter ${d} ${unit}` : `radius ${r} ${unit}`;
    if (kind === 'circumference') {
      const answer = A.number(C);
      return ctx.question({
        prompt: prompt([P.text(`Circle: ${given} (${pi}). Circumference?`)]),
        operation: 'CIRCUMFERENCE',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.decimal([unit]),
        answerDisplay: 'decimal',
        ...ways(
          way('PI_TIMES_DIAMETER', 'C = πd', answer, `${givenDiameter ? '' : `d = 2 × ${r} = ${d}. `}C = 3.14 × ${d}.`, `= ${fdec(C)} ${unit}.`),
          way('TWO_PI_R', 'C = 2πr', answer, `${givenDiameter ? `r = ${d} ÷ 2 = ${r}. ` : ''}C = 2 × 3.14 × ${r}.`, `= ${fdec(C)} ${unit}.`),
        ),
      });
    }
    const area = mul(PI_APPROX, rat(r * r));
    const answer = A.number(area);
    return ctx.question({
      prompt: prompt([P.text(`Circle: ${given} (${pi}). Area?`)]),
      operation: 'CIRCLE_AREA',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal(squareUnits(unit)),
      answerDisplay: 'decimal',
      ...ways(
        way('PI_R_SQUARED', 'A = πr²', answer, `${givenDiameter ? `r = ${d} ÷ 2 = ${r}. ` : ''}A = 3.14 × ${r}² = 3.14 × ${r * r}.`, `= ${fdec(area)} ${unit}².`),
        way('HALF_C_TIMES_R', 'A = ½C × r', answer, `C = 3.14 × ${d} = ${fdec(C)}; half is ${fdec(div(C, rat(2)))}.`, `${fdec(div(C, rat(2)))} × ${r} = ${fdec(area)} ${unit}².`),
      ),
    });
  },
});

const angleRelationships = defineSkill({
  id: 'g7.g.angle-relationships',
  grade: '7',
  domain: 'G',
  standards: ['7.G.5'],
  title: 'Angle relationships',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(ctx.tier({ EASY: ['supplementary', 'complementary'], MEDIUM: ['supplementary', 'complementary', 'vertical'], HARD: ['algebraSupp', 'algebraComp', 'vertical'] }) as string[]);
    const schema = SCHEMA.integer(DEGREE_UNITS);
    if (kind === 'algebraSupp' || kind === 'algebraComp') {
      const total = kind === 'algebraSupp' ? 180 : 90;
      const [m1, m2, c] = ctx.retry(() => [rng.integer(1, 5), rng.integer(1, 5), rng.integer(0, 30)] as const, ([a, b, cc]) => (total - cc) % (a + b) === 0 && (total - cc) / (a + b) >= 3);
      const x = (total - c) / (m1 + m2);
      const answer = A.number(x);
      const word = kind === 'algebraSupp' ? 'Supplementary' : 'Complementary';
      return ctx.question({
        prompt: prompt([P.text(`${word} angles: `), ...linNodes(m1, 0, 'x'), P.text('° and '), ...linNodes(m2, c, 'x'), P.text('°. Find x.')]),
        operation: 'ANGLE_EQUATION',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(),
        ...ways(
          way('WRITE_AN_EQUATION', 'Write an equation', answer, `${termText(m1, 'x')} + ${linText(m2, c, 'x')} = ${total}.`, `${termText(m1 + m2, 'x')} = ${total - c} → x = ${x}.`),
          way('BAR_MODEL', 'Bar model', answer, `Take out the ${c}: ${total} − ${c} = ${total - c}.`, `${m1 + m2} equal parts: ${total - c} ÷ ${m1 + m2} = ${x}.`),
        ),
      });
    }
    const a = rng.integer(kind === 'complementary' ? 5 : 15, kind === 'complementary' ? 85 : 165);
    const total = kind === 'complementary' ? 90 : 180;
    const value = kind === 'vertical' ? a : total - a;
    const answer = A.number(value);
    const text =
      kind === 'vertical'
        ? `Two lines cross. One angle is ${a}°. The vertical (opposite) angle?`
        : `Angles ${kind === 'complementary' ? 'add to 90°' : 'add to 180°'}. One is ${a}°. The other?`;
    return ctx.question({
      prompt: prompt([P.text(text)]),
      operation: `ANGLE_${kind.toUpperCase()}`,
      canonicalAnswer: answer,
      answerSchema: schema,
      ...ways(
        kind === 'vertical'
          ? way('VERTICAL_ANGLES_EQUAL', 'Vertical angles are equal', answer, 'Opposite angles at a crossing are equal.', `${a}°.`)
          : way('SUBTRACT_FROM_TOTAL', `Subtract from ${total}`, answer, `${total} − ${a} = ${value}.`, `${value}°.`),
        kind === 'vertical'
          ? way('LINEAR_PAIRS', 'Use straight lines', answer, `Neighbor: 180 − ${a} = ${180 - a}.`, `Opposite: 180 − ${180 - a} = ${a}°.`)
          : way('WRITE_AN_EQUATION', 'Write an equation', answer, `x + ${a} = ${total}.`, `x = ${value}°.`),
      ),
    });
  },
});

const areaVolumeSurface = defineSkill({
  id: 'g7.g.area-volume-surface',
  grade: '7',
  domain: 'G',
  standards: ['7.G.6'],
  title: 'Composite area & prism volume',
  generate(ctx) {
    const { rng } = ctx;
    const unit = rng.choose(['cm', 'm', 'in', 'ft'] as const);
    if (rng.bool()) {
      // House shape: rectangle w×h with a triangle roof (base w, height t).
      const w = 2 * rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 8, HARD: 12 }));
      const h = rng.integer(2, ctx.tier({ EASY: 8, MEDIUM: 12, HARD: 20 }));
      const t = rng.integer(2, ctx.tier({ EASY: 6, MEDIUM: 10, HARD: 15 }));
      const rect = w * h;
      const tri = (w * t) / 2;
      const area = rect + tri;
      const answer = A.number(area);
      return ctx.question({
        prompt: prompt([P.text(`House shape: ${w} × ${h} ${unit} rectangle with a triangle roof (height ${t} ${unit}). Area?`)], {
          v: 'shape',
          shape: 'pentagon',
          label: `house shape, width ${w}, wall height ${h}, roof height ${t}`,
        }),
        operation: 'COMPOSITE_AREA',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(squareUnits(unit)),
        ...ways(
          way('ADD_THE_PARTS', 'Add the parts', answer, `Rectangle ${w} × ${h} = ${rect}; roof ½ × ${w} × ${t} = ${tri}.`, `${rect} + ${tri} = ${area} ${unit}².`),
          way('SUBTRACT_CORNERS', 'Big box minus corners', answer, `Box ${w} × ${h + t} = ${w * (h + t)}.`, `Minus 2 corners (${(w / 2) * t / 2} each): ${area} ${unit}².`),
        ),
      });
    }
    const b = rng.integer(2, ctx.tier({ EASY: 8, MEDIUM: 12, HARD: 16 }));
    const hh = rng.integer(2, ctx.tier({ EASY: 8, MEDIUM: 12, HARD: 16 }));
    const len = rng.integer(3, ctx.tier({ EASY: 10, MEDIUM: 15, HARD: 25 }));
    const base = rat(b * hh, 2);
    const vol = mul(base, rat(len));
    const answer = A.number(vol);
    return ctx.question({
      prompt: prompt([P.text(`Triangular prism: triangle base ${b} ${unit}, height ${hh} ${unit}; length ${len} ${unit}. Volume?`)]),
      operation: 'PRISM_VOLUME',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal(cubicUnits(unit)),
      answerDisplay: niceStyle(vol),
      ...ways(
        way('BASE_TIMES_LENGTH', 'V = Bh', answer, `B = ½ × ${b} × ${hh} = ${nice(base)}.`, `${nice(base)} × ${len} = ${nice(vol)} ${unit}³.`),
        way('HALF_A_BOX', 'Half of a box', answer, `Box: ${b} × ${hh} × ${len} = ${b * hh * len}.`, `Half: ${nice(vol)} ${unit}³.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 7.SP                                                                 */
/* ------------------------------------------------------------------ */

const SAMPLES = [
  {
    population: 'all students at a school',
    good: '60 students picked at random from the school list',
    bad: ['60 students on the soccer team', 'The first 60 students at the gym', '60 students from one classroom'],
  },
  {
    population: 'all voters in a town',
    good: '200 voters picked at random from the voter list',
    bad: ['200 people at one coffee shop', '200 members of one club', 'The mayor’s 200 neighbors'],
  },
  {
    population: 'all fans at a stadium',
    good: '100 fans picked from random seat numbers',
    bad: ['100 fans in the front row section', '100 fans in line for food', '100 fans wearing team hats'],
  },
] as const;

const sampling = defineSkill({
  id: 'g7.sp.random-samples',
  grade: '7',
  domain: 'SP',
  standards: ['7.SP.1'],
  title: 'Representative samples',
  generate(ctx) {
    const { rng } = ctx;
    const s = rng.choose(SAMPLES);
    const { choices, correctId } = makeChoices(rng, s.good, [...s.bad]);
    const answer = A.choice(correctId);
    return ctx.question({
      prompt: prompt([P.text(`Best sample of ${s.population}?`)]),
      operation: 'REPRESENTATIVE_SAMPLE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way('EQUAL_CHANCE', 'Equal chance for everyone', answer, 'Every member should have an equal chance.', 'Only random picking does that.'),
        way('SPOT_THE_BIAS', 'Spot the bias', answer, 'The others favor one group.', 'So choose the random sample.'),
      ),
    });
  },
});

const sampleInference = defineSkill({
  id: 'g7.sp.sample-inference',
  grade: '7',
  domain: 'SP',
  standards: ['7.SP.2'],
  title: 'Predict from a sample',
  generate(ctx) {
    const { rng } = ctx;
    const n = rng.choose(ctx.tier({ EASY: [10, 20, 50], MEDIUM: [20, 25, 40, 50], HARD: [40, 50, 80, 100, 200] }));
    const [fav, total] = ctx.retry(
      () => [rng.integer(1, n - 1), n * rng.integer(ctx.tier({ EASY: 2, MEDIUM: 4, HARD: 3 }), ctx.tier({ EASY: 10, MEDIUM: 30, HARD: 50 })) + (ctx.difficulty === 'HARD' ? rng.choose([0, n / 2, n / 4]) : 0)] as const,
      ([fv, tt]) => Number.isInteger(tt) && (fv * tt) % n === 0,
    );
    const pred = (fav * total) / n;
    const pct = rat(fav * 100, n);
    const thing = rng.choose(['prefer pizza', 'walk to school', 'play an instrument', 'have a pet']);
    const answer = A.number(pred);
    return ctx.question({
      prompt: prompt([P.text(`Random sample: ${fav} of ${n} students ${thing}.`), P.br(), P.text(`Predict for ${total} students.`)]),
      operation: 'SAMPLE_PREDICTION',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.integer(['students']),
      ...ways(
        way('PROPORTION', 'Proportion', answer, `${fav}/${n} = x/${total}.`, `x = ${fav} × ${total} ÷ ${n} = ${pred}.`),
        way('PERCENT_FIRST', 'Percent first', answer, `${fav}/${n} = ${nice(pct)}%.`, `${nice(pct)}% of ${total} = ${pred}.`),
      ),
    });
  },
});

const comparePopulations = defineSkill({
  id: 'g7.sp.compare-populations',
  grade: '7',
  domain: 'SP',
  standards: ['7.SP.3', '7.SP.4'],
  title: 'Compare two groups',
  generate(ctx) {
    const { rng } = ctx;
    const mad = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 8, HARD: 10 }));
    const steps = ctx.tier({ EASY: rat(rng.integer(2, 4)), MEDIUM: rat(rng.integer(2, 5)), HARD: rat(rng.integer(3, 9), 2) });
    const diff = mul(rat(mad), steps);
    const meanA = rng.integer(20, 160);
    const meanB = add(rat(meanA), diff);
    const ctxt = rng.choose([
      { what: 'Heights', unit: 'cm', a: 'Team A', b: 'Team B' },
      { what: 'Test scores', unit: 'points', a: 'Class A', b: 'Class B' },
      { what: 'Jump distances', unit: 'in', a: 'Group A', b: 'Group B' },
    ]);
    const answer = A.number(steps);
    return ctx.question({
      prompt: prompt([P.text(`${ctxt.what}: ${ctxt.a} mean ${meanA}, ${ctxt.b} mean ${nice(meanB)} ${ctxt.unit}. Both MADs = ${mad}.`), P.br(), P.text('The difference is how many MADs?')]),
      operation: 'DIFFERENCE_IN_MADS',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(['MADs', 'MAD']),
      answerDisplay: niceStyle(steps),
      ...ways(
        way('DIVIDE_BY_MAD', 'Divide by the MAD', answer, `Difference: ${nice(meanB)} − ${meanA} = ${nice(diff)}.`, `${nice(diff)} ÷ ${mad} = ${nice(steps)}.`),
        way('COUNT_MAD_STEPS', 'Count MAD steps', answer, `Count up from ${meanA} by ${mad} to ${nice(meanB)}.`, `That is ${nice(steps)} steps.`),
      ),
    });
  },
});

const LIKELIHOOD = fixedChoices(['Impossible', 'Unlikely', 'Equally likely', 'Likely', 'Certain']);

const likelihood = defineSkill({
  id: 'g7.sp.likelihood',
  grade: '7',
  domain: 'SP',
  standards: ['7.SP.5'],
  title: 'How likely is it?',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['impossible', 'unlikely', 'equal', 'likely', 'certain'] as const);
    const p =
      kind === 'impossible' ? rat(0) : kind === 'certain' ? rat(1) : kind === 'equal' ? rat(1, 2) : kind === 'unlikely' ? rat(rng.integer(1, 25), 100) : rat(rng.integer(75, 99), 100);
    const form = rng.choose(ctx.tier({ EASY: ['fraction'], MEDIUM: ['fraction', 'decimal'], HARD: ['decimal', 'percent'] }) as string[]);
    const node: PromptNode = form === 'fraction' ? P.frac(p) : form === 'decimal' ? P.dec(p) : P.num(p, 'percent');
    const label = { impossible: 'Impossible', unlikely: 'Unlikely', equal: 'Equally likely', likely: 'Likely', certain: 'Certain' }[kind];
    const answer = A.choice(label.toLowerCase().replace(/\s+/g, '-'));
    return ctx.question({
      prompt: prompt([P.text('Probability = '), node, P.text('. How likely?')]),
      operation: 'LIKELIHOOD',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(LIKELIHOOD),
      ...ways(
        way('BENCHMARKS', 'Compare to 0, ½ and 1', answer, '0 impossible · ½ equally likely · 1 certain.', `${f(p, form === 'percent' ? 'percent' : form === 'decimal' ? 'decimal' : 'fraction')} → ${label}.`),
        way('OUT_OF_100', 'Think out of 100', answer, `About ${nice(mul(p, rat(100)))} times in 100 tries.`, `→ ${label}.`),
      ),
    });
  },
});

const predictFrequency = defineSkill({
  id: 'g7.sp.predict-frequency',
  grade: '7',
  domain: 'SP',
  standards: ['7.SP.6'],
  title: 'Predict how often',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['die', 'spinner', 'coin'] as const);
    let fav: number;
    let total: number;
    let text: string;
    if (kind === 'die') {
      const faces = rng.sample([1, 2, 3, 4, 5, 6], rng.integer(1, ctx.difficulty === 'EASY' ? 2 : 4)).sort();
      fav = faces.length;
      total = 6;
      text = `A number cube is rolled {N} times. About how many rolls of ${listOr(faces)}?`;
    } else if (kind === 'spinner') {
      total = rng.choose([4, 5, 8, 10]);
      fav = rng.integer(1, total - 1);
      text = `A spinner has ${total} equal parts; ${fav} ${fav === 1 ? 'is' : 'are'} red. Spun {N} times. About how many reds?`;
    } else {
      total = 2;
      fav = 1;
      text = 'A coin is flipped {N} times. About how many heads?';
    }
    const N = total * rng.integer(ctx.tier({ EASY: 5, MEDIUM: 10, HARD: 20 }), ctx.tier({ EASY: 20, MEDIUM: 60, HARD: 200 }));
    const ans = (fav * N) / total;
    const p = rat(fav, total);
    const answer = A.number(ans);
    return ctx.question({
      prompt: prompt([P.text(text.replace('{N}', String(N)))]),
      operation: 'PREDICT_FREQUENCY',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.integer(),
      ...ways(
        way('MULTIPLY_PROBABILITY', 'Probability × trials', answer, `P = ${f(p)}.`, `${f(p)} × ${N} = ${ans}.`),
        way('PROPORTION', 'Proportion', answer, `${fav} out of ${total} → x out of ${N}.`, `${N} ÷ ${total} = ${N / total}; × ${fav} = ${ans}.`),
      ),
    });
  },
});

const COLORS = ['red', 'blue', 'green', 'yellow'] as const;

function listOr(items: readonly (number | string)[]): string {
  if (items.length <= 1) return String(items[0] ?? '');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

function paren(show: (v: Rational) => string, v: Rational): string {
  return v.numerator < 0n ? `(${show(v)})` : show(v);
}

const simpleProbability = defineSkill({
  id: 'g7.sp.simple-probability',
  grade: '7',
  domain: 'SP',
  standards: ['7.SP.7a'],
  title: 'Probability of an event',
  generate(ctx) {
    const { rng } = ctx;
    const colors = rng.sample(COLORS, ctx.tier({ EASY: 2, MEDIUM: 3, HARD: 4 }));
    const counts = colors.map(() => rng.integer(1, ctx.tier({ EASY: 6, MEDIUM: 9, HARD: 12 })));
    const total = counts.reduce((p, q) => p + q, 0);
    const i = rng.integer(0, colors.length - 1);
    const not = ctx.difficulty === 'HARD' && rng.bool();
    const fav = not ? total - (counts[i] as number) : (counts[i] as number);
    const p = rat(fav, total);
    const answer = A.number(p);
    const color = colors[i] as string;
    const event = not ? `not ${color}` : color;
    return ctx.question({
      prompt: prompt([P.text(`Bag: ${colors.map((c, j) => `${counts[j]} ${c}`).join(', ')}. Pick one.`), P.br(), P.text(`P(${event})?`)]),
      operation: 'PROBABILITY',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.probability(),
      answerDisplay: 'fraction',
      ...ways(
        way('FAVORABLE_OVER_TOTAL', 'Favorable ÷ total', answer, `${event}: ${fav}; total: ${total}.`, `P = ${fav}/${total}${gcd(BigInt(fav), BigInt(total)) > 1n ? ` = ${f(p)}` : ''}.`),
        way(
          'COMPLEMENT',
          'Use the complement',
          answer,
          `P(${not ? color : `not ${color}`}) = ${total - fav}/${total}.`,
          `P(${event}) = 1 − ${total - fav}/${total} = ${f(p)}.`,
        ),
      ),
    });
  },
});

const compoundProbability = defineSkill({
  id: 'g7.sp.compound-probability',
  grade: '7',
  domain: 'SP',
  standards: ['7.SP.8a', '7.SP.8b'],
  title: 'Compound events',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(ctx.tier({ EASY: ['coinDie', 'twoCoins'], MEDIUM: ['coinDie', 'spinner', 'bothEven'], HARD: ['sum', 'spinner', 'coinDie'] }) as string[]);
    let n1: number;
    let n2: number;
    let f1: number;
    let f2: number;
    let text: string;
    if (kind === 'coinDie') {
      const faces = rng.sample([1, 2, 3, 4, 5, 6], rng.integer(1, 3)).sort();
      [n1, n2, f1, f2] = [2, 6, 1, faces.length];
      text = `Flip a coin and roll a number cube. P(heads and a ${listOr(faces)})?`;
    } else if (kind === 'twoCoins') {
      [n1, n2, f1, f2] = [2, 2, 1, 1];
      text = 'Flip two coins. P(both heads)?';
    } else if (kind === 'bothEven') {
      [n1, n2, f1, f2] = [6, 6, 3, 3];
      text = 'Roll two number cubes. P(both even)?';
    } else if (kind === 'spinner') {
      const parts = rng.choose([3, 4, 5]);
      const red = rng.integer(1, parts - 1);
      [n1, n2, f1, f2] = [parts, parts, red, red];
      text = `A spinner has ${parts} equal parts; ${red} ${red === 1 ? 'is' : 'are'} red. Spin twice. P(red both times)?`;
    } else {
      // two dice sum
      const s = rng.integer(3, 11);
      const pairs: string[] = [];
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === s) pairs.push(`(${a},${b})`);
      const p = rat(pairs.length, 36);
      const answer = A.number(p);
      return ctx.question({
        prompt: prompt([P.text(`Roll two number cubes. P(sum = ${s})?`)]),
        operation: 'COMPOUND_PROBABILITY',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.probability(),
        answerDisplay: 'fraction',
        ...ways(
          way('LIST_OUTCOMES', 'List the pairs', answer, `Pairs: ${pairs.join(' ')}.`, `${pairs.length}/36 = ${f(p)}.`),
          way('TABLE', '6 × 6 table', answer, `36 outcomes; the diagonal for sum ${s} has ${pairs.length} cells.`, `P = ${f(p)}.`),
        ),
      });
    }
    const p = mul(rat(f1, n1), rat(f2, n2));
    const answer = A.number(p);
    return ctx.question({
      prompt: prompt([P.text(text)]),
      operation: 'COMPOUND_PROBABILITY',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.probability(),
      answerDisplay: 'fraction',
      ...ways(
        way('MULTIPLY', 'Multiply the probabilities', answer, `${f(rat(f1, n1))} × ${f(rat(f2, n2))}.`, `= ${f(p)}.`),
        way('COUNT_OUTCOMES', 'Count outcomes', answer, `${n1} × ${n2} = ${n1 * n2} outcomes; ${f1 * f2} work.`, `${f1 * f2}/${n1 * n2} = ${f(p)}.`),
      ),
    });
  },
});

export const GRADE_7_SKILLS: readonly Skill[] = [
  unitRateFractions,
  proportionalOrNot,
  constantOfProportionality,
  percentApplications,
  percentChange,
  simpleInterest,
  addSubtractRationals,
  multiplyDivideRationals,
  fractionToDecimal,
  terminatingOrRepeating,
  rationalWordProblems,
  linearExpressions,
  percentExpressions,
  multiStepProblems,
  twoStepEquations,
  inequalities,
  scaleDrawings,
  triangleConditions,
  crossSections,
  circles,
  angleRelationships,
  areaVolumeSurface,
  sampling,
  sampleInference,
  comparePopulations,
  likelihood,
  predictFrequency,
  simpleProbability,
  compoundProbability,
];
