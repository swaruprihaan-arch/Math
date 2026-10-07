/**
 * Grade 8 practice skills (California CCSSM).
 *
 * Standards NOT covered (and why):
 *  - 8.SP.2  Informally fitting a line to a scatter plot — requires drawing.
 * Partly covered:
 *  - 8.EE.6  The similar-triangles explanation is a proof; slope itself is practiced in g8.ee.slope.
 *  - 8.EE.8a Reading intersections from a graph needs a graph; systems are solved algebraically in g8.ee.systems.
 *  - 8.F.5   Sketching graphs needs drawing; increasing/decreasing from a table is in g8.f.increasing-decreasing.
 *  - 8.G.1/8.G.2/8.G.4  Hands-on verification with transparencies; concept checks are in g8.g.rigid-motions.
 */
import { A, P, prompt, SCHEMA } from '../../domain/question/build';
import type { PromptNode } from '../../domain/question/types';
import { add, cmp, div, gcd, isInteger, mul, pow, rat, sub, type Rational } from '../../domain/rational/rational';
import { fixedChoices, makeChoices } from '../helpers';
import { defineSkill } from '../skill';
import type { Skill } from '../types';
import {
  DEGREE_UNITS,
  PI_APPROX,
  cubicUnits,
  f,
  fdec,
  isPerfectSquare,
  isqrt,
  linText,
  nice,
  niceStyle,
  np,
  pairNodes,
  pairText,
  primeFactorText,
  termText,
  way,
  ways,
} from './_g68Helpers';

const YES_NO = fixedChoices(['Yes', 'No']);
const yesNo = (yes: boolean) => A.choice(yes ? 'yes' : 'no');
const COUNT_CHOICES = fixedChoices(['One solution', 'No solution', 'Infinitely many']);
const countAnswer = (k: 'one' | 'none' | 'many') => A.choice(k === 'one' ? 'one-solution' : k === 'none' ? 'no-solution' : 'infinitely-many');

/* ------------------------------------------------------------------ */
/* 8.NS                                                                 */
/* ------------------------------------------------------------------ */

interface NumberItem {
  node: PromptNode[];
  rational: boolean;
  fractionWhy: string;
  decimalWhy: string;
}

const rationalIrrational = defineSkill({
  id: 'g8.ns.rational-irrational',
  grade: '8',
  domain: 'NS',
  standards: ['8.NS.1'],
  title: 'Rational or irrational?',
  generate(ctx) {
    const { rng } = ctx;
    const kinds = ctx.tier({
      EASY: ['sqrtSquare', 'sqrtNon', 'fraction'],
      MEDIUM: ['sqrtSquare', 'sqrtNon', 'repeating', 'pi', 'terminating'],
      HARD: ['sqrtNon', 'repeating', 'pi', 'pattern', 'sqrtFraction', 'piMultiple'],
    }) as string[];
    const kind = rng.choose(kinds);
    let item: NumberItem;
    switch (kind) {
      case 'sqrtSquare': {
        const r = rng.integer(2, 15);
        item = { node: [P.root(r * r)], rational: true, fractionWhy: `√${r * r} = ${r} = ${r}/1.`, decimalWhy: `${r} is a whole number — its decimal ends.` };
        break;
      }
      case 'sqrtNon': {
        const n = ctx.retry(() => rng.integer(2, 99), (z) => !isPerfectSquare(z));
        item = { node: [P.root(n)], rational: false, fractionWhy: `${n} is not a perfect square, so √${n} is not a fraction.`, decimalWhy: `√${n} = ${(Math.sqrt(n)).toFixed(4)}… never ends or repeats.` };
        break;
      }
      case 'sqrtFraction': {
        const a = rng.integer(1, 6);
        const b = rng.integer(a + 1, 9);
        item = { node: [P.root([P.frac(rat(a * a, b * b))])], rational: true, fractionWhy: `√(${a * a}/${b * b}) = ${a}/${b}.`, decimalWhy: `${a}/${b} ends or repeats as a decimal.` };
        break;
      }
      case 'fraction': {
        const d = rng.integer(3, 12);
        const n = rng.integer(1, d - 1);
        item = { node: [P.frac(rat(-n, d))], rational: true, fractionWhy: 'It is already a fraction of integers.', decimalWhy: 'Its decimal ends or repeats.' };
        break;
      }
      case 'repeating': {
        const block = String(rng.integer(1, 98)).padStart(2, '0');
        item = { node: [P.text(`0.${block}${block}${block}…`)], rational: true, fractionWhy: `0.(${block}) = ${block}/99.`, decimalWhy: 'The digits repeat.' };
        break;
      }
      case 'terminating': {
        const v = rat(rng.integer(1, 999), 100);
        item = { node: [P.dec(v)], rational: true, fractionWhy: `${fdec(v)} = ${f(v)}.`, decimalWhy: 'The decimal ends.' };
        break;
      }
      case 'pattern': {
        item = { node: [P.text('0.101001000100001…')], rational: false, fractionWhy: 'No repeating block, so no fraction.', decimalWhy: 'It never ends and never repeats.' };
        break;
      }
      case 'piMultiple': {
        const k = rng.integer(2, 9);
        item = { node: [P.text(`${k}π`)], rational: false, fractionWhy: `π is irrational, so ${k}π is too.`, decimalWhy: `${k}π = ${(k * Math.PI).toFixed(4)}… never repeats.` };
        break;
      }
      default:
        item = { node: [P.text('π')], rational: false, fractionWhy: 'π cannot be written as a fraction.', decimalWhy: 'π = 3.14159… never ends or repeats.' };
    }
    const choices = fixedChoices(['Rational', 'Irrational']);
    const answer = A.choice(item.rational ? 'rational' : 'irrational');
    const label = item.rational ? 'Rational' : 'Irrational';
    return ctx.question({
      prompt: prompt([P.text('Rational or irrational? '), ...item.node]),
      operation: 'CLASSIFY_NUMBER',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(way('AS_A_FRACTION', 'Can it be a fraction?', answer, item.fractionWhy, `→ ${label}.`), way('LOOK_AT_THE_DECIMAL', 'Look at the decimal', answer, item.decimalWhy, `→ ${label}.`)),
    });
  },
});

const repeatingToFraction = defineSkill({
  id: 'g8.ns.repeating-to-fraction',
  grade: '8',
  domain: 'NS',
  standards: ['8.NS.1'],
  title: 'Repeating decimals to fractions',
  generate(ctx) {
    const { rng } = ctx;
    const schema = SCHEMA.fraction();
    const policy = { requireLowestTerms: true };
    if (ctx.difficulty === 'HARD') {
      // 0.a(b) = (10a + b − a) / 90
      const a = rng.integer(1, 8);
      const b = ctx.retry(() => rng.integer(1, 9), (z) => z !== a && z !== 0);
      const value = rat(10 * a + b - a, 90);
      const answer = A.number(value);
      return ctx.question({
        prompt: prompt([P.text(`Write as a fraction (simplest form): 0.${a}${b}${b}${b}…`), P.br(), P.text(`(only the ${b} repeats)`)]),
        operation: 'REPEATING_TO_FRACTION',
        canonicalAnswer: answer,
        answerSchema: schema,
        validationPolicy: policy,
        ...ways(
          way('ALGEBRA', 'Use 10x and 100x', answer, `x = 0.${a}${b}${b}…; 10x = ${a}.${b}${b}…; 100x = ${a}${b}.${b}${b}…`, `100x − 10x: 90x = ${10 * a + b - a}.`, `x = ${10 * a + b - a}/90 = ${f(value)}.`),
          way('SPLIT_THE_DECIMAL', 'Split it up', answer, `0.${a} + 0.0${b}${b}… = ${a}/10 + ${b}/90.`, `= ${9 * a}/90 + ${b}/90 = ${f(value)}.`),
        ),
      });
    }
    const digits = ctx.difficulty === 'EASY' ? 1 : 2;
    const block = ctx.retry(() => rng.integer(1, digits === 1 ? 8 : 98), (z) => (digits === 1 ? true : z % 11 !== 0));
    const blockText = digits === 1 ? String(block) : String(block).padStart(2, '0');
    const nines = digits === 1 ? 9 : 99;
    const value = rat(block, nines);
    const answer = A.number(value);
    const shift = digits === 1 ? 10 : 100;
    return ctx.question({
      prompt: prompt([P.text(`Write as a fraction (simplest form): 0.${blockText.repeat(digits === 1 ? 4 : 3)}…`)]),
      operation: 'REPEATING_TO_FRACTION',
      canonicalAnswer: answer,
      answerSchema: schema,
      validationPolicy: policy,
      ...ways(
        way('ALGEBRA', `Use ${shift}x`, answer, `x = 0.${blockText}${blockText}…; ${shift}x = ${blockText}.${blockText}…`, `${shift}x − x: ${nines}x = ${block}.`, `x = ${block}/${nines} = ${f(value)}.`),
        way('NINES_PATTERN', 'Repeating block over 9s', answer, `0.(${blockText}) = ${block}/${nines}.`, `Simplify: ${f(value)}.`),
      ),
    });
  },
});

const estimateRoots = defineSkill({
  id: 'g8.ns.estimate-roots',
  grade: '8',
  domain: 'NS',
  standards: ['8.NS.2'],
  title: 'Estimate square roots',
  generate(ctx) {
    const { rng } = ctx;
    const n = ctx.retry(() => rng.integer(3, ctx.tier({ EASY: 50, MEDIUM: 150, HARD: 200 })), (z) => !isPerfectSquare(z));
    const a = Number(isqrt(BigInt(n)));
    const b = a + 1;
    if (ctx.difficulty !== 'HARD') {
      const correct = `${a} and ${b}`;
      const { choices, correctId } = makeChoices(rng, correct, [`${a - 1} and ${a}`, `${b} and ${b + 1}`, `${Math.floor(n / 2)} and ${Math.floor(n / 2) + 1}`].filter((l) => !l.startsWith('0 ') && !l.startsWith('-')));
      const answer = A.choice(correctId);
      const mid = a + 0.5;
      return ctx.question({
        prompt: prompt([P.root(n), P.text(' is between which two whole numbers?')]),
        operation: 'ESTIMATE_ROOT',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.choice(choices),
        ...ways(
          way('PERFECT_SQUARES', 'Nearby perfect squares', answer, `${a}² = ${a * a} and ${b}² = ${b * b}.`, `${a * a} < ${n} < ${b * b} → ${correct}.`),
          way('SQUARE_A_GUESS', 'Square a guess', answer, `${mid}² = ${mid * mid}, ${n < mid * mid ? 'more' : 'less'} than ${n}.`, `So √${n} is between ${a} and ${b}.`),
        ),
      });
    }
    // nearest tenth: m = floor(10√n); round up iff 100n > m² + m
    const m = Number(isqrt(BigInt(100 * n)));
    const tenths = 100 * n > m * m + m ? m + 1 : m;
    const label = (t: number) => (t / 10).toFixed(1);
    const correct = label(tenths);
    const { choices, correctId } = makeChoices(rng, correct, [label(tenths - 1), label(tenths + 1), label(tenths + 2), label(10 * a + 5)]);
    const answer = A.choice(correctId);
    const lo = m / 10;
    const hi = (m + 1) / 10;
    return ctx.question({
      prompt: prompt([P.root(n), P.text(' to the nearest tenth?')]),
      operation: 'ESTIMATE_ROOT_TENTH',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way('SQUARE_NEIGHBORS', 'Square the neighbors', answer, `${lo.toFixed(1)}² = ${(m * m) / 100}; ${hi.toFixed(1)}² = ${((m + 1) * (m + 1)) / 100}.`, `${n} is closer to ${tenths === m ? `${lo.toFixed(1)}²` : `${hi.toFixed(1)}²`} → ${correct}.`),
        way('TEST_THE_MIDPOINT', 'Test the halfway point', answer, `${((2 * m + 1) / 20).toFixed(2)}² = ${(((2 * m + 1) * (2 * m + 1)) / 400).toFixed(4)}.`, `${n} is ${tenths === m ? 'below' : 'above'} that → ${correct}.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 8.EE — radicals & exponents                                          */
/* ------------------------------------------------------------------ */

const exponentRules = defineSkill({
  id: 'g8.ee.exponent-rules',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.1'],
  title: 'Integer exponent rules',
  generate(ctx) {
    const { rng } = ctx;
    const base = rng.integer(2, ctx.tier({ EASY: 3, MEDIUM: 5, HARD: 5 }));
    const kind = rng.choose(ctx.tier({ EASY: ['product', 'quotient', 'zero'], MEDIUM: ['product', 'quotient', 'negative', 'power'], HARD: ['product', 'quotient', 'power', 'negative'] }) as string[]);
    const maxResult = base === 2 ? 6 : base === 3 ? 4 : 3;
    const [m, n] = ctx.retry(
      () => [rng.integer(ctx.difficulty === 'EASY' ? 1 : -5, 6), rng.integer(ctx.difficulty === 'EASY' ? 1 : -5, 6)] as const,
      ([p, q]) => {
        if (kind === 'zero') return p !== 0;
        const e = kind === 'product' ? p + q : kind === 'quotient' ? p - q : kind === 'power' ? p * q : -Math.abs(p);
        return Math.abs(e) <= maxResult && e !== 1 && (ctx.difficulty === 'EASY' ? e >= 0 : true) && p !== 0 && q !== 0 && (kind !== 'power' || Math.abs(q) <= 3);
      },
    );
    const b = rat(base);
    let nodes: PromptNode[];
    let e: number;
    let ruleText: string;
    let expandText: string;
    if (kind === 'product') {
      e = m + n;
      nodes = [P.pow(base, m), P.op('×'), P.pow(base, n)];
      ruleText = `Add exponents: ${base}^(${f(m)} + ${np(n)}) = ${base}^${f(e)}.`;
      expandText = `${Math.abs(m)} ${m > 0 ? 'factors' : 'divisions'} of ${base}, then ${Math.abs(n)} ${n > 0 ? 'more factors' : 'divisions'}: net ${f(e)}.`;
    } else if (kind === 'quotient') {
      e = m - n;
      nodes = [P.pow(base, m), P.op('÷'), P.pow(base, n)];
      ruleText = `Subtract exponents: ${base}^(${f(m)} − ${np(n)}) = ${base}^${f(e)}.`;
      expandText = `Cancel matching factors of ${base}: ${f(e)} left ${e < 0 ? 'in the denominator' : 'on top'}.`;
    } else if (kind === 'power') {
      e = m * n;
      nodes = [P.pow([P.op('('), ...[P.pow(base, m)], P.op(')')], n)];
      ruleText = `Multiply exponents: ${base}^(${f(m)} × ${np(n)}) = ${base}^${f(e)}.`;
      expandText = `${Math.abs(n)} copies of ${base}^${f(m)}${n < 0 ? ', then flip' : ''}: ${base}^${f(e)}.`;
    } else if (kind === 'zero') {
      e = 0;
      nodes = [P.pow(base * rng.integer(1, 9), 0)];
      ruleText = 'Any nonzero number to the 0 power is 1.';
      expandText = `Pattern: ÷ the base each step down to exponent 0 gives 1.`;
    } else {
      e = -Math.abs(m);
      nodes = [P.pow(base, e)];
      ruleText = `Negative exponent → reciprocal: 1/${base}^${-e}.`;
      expandText = `Count down: ${base}^1 = ${base}, ${base}^0 = 1, then keep dividing by ${base}.`;
    }
    const value = pow(b, e);
    const answer = A.number(value);
    return ctx.question({
      prompt: prompt([P.text('Evaluate:'), P.br(), ...nodes]),
      operation: `EXPONENT_${kind.toUpperCase()}`,
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: 'fraction',
      ...ways(way('EXPONENT_RULES', 'Exponent rules', answer, ruleText, `= ${f(value)}.`), way('EXPAND', 'Think it through', answer, expandText, `= ${f(value)}.`)),
    });
  },
});

const roots = defineSkill({
  id: 'g8.ee.roots',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.2'],
  title: 'Square & cube roots',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(ctx.tier({ EASY: ['sqrt', 'cbrt'], MEDIUM: ['sqrt', 'cbrt', 'xsq', 'xcube'], HARD: ['sqrtFrac', 'cbrtFrac', 'cbrtNeg', 'xsq'] }) as string[]);
    const max = ctx.tier({ EASY: 12, MEDIUM: 20, HARD: 25 });
    let nodes: PromptNode[];
    let value: Rational;
    let think: string;
    let factor: string;
    if (kind === 'sqrt' || kind === 'xsq') {
      const r = rng.integer(2, max);
      value = rat(r);
      nodes = kind === 'sqrt' ? [P.root(r * r), P.op('='), P.blank()] : [P.pow([P.v('x')], 2), P.op('='), P.num(r * r), P.text(', x > 0. Find x.')];
      think = `${r} × ${r} = ${r * r}.`;
      factor = `${r * r} = ${primeFactorText(r * r)}; split into 2 equal groups: ${primeFactorText(r) || r}.`;
    } else if (kind === 'cbrt' || kind === 'xcube' || kind === 'cbrtNeg') {
      const r = rng.integer(2, ctx.tier({ EASY: 5, MEDIUM: 10, HARD: 10 })) * (kind === 'cbrtNeg' ? -1 : 1);
      const cube = r * r * r;
      value = rat(r);
      nodes = kind === 'xcube' ? [P.pow([P.v('x')], 3), P.op('='), P.num(cube), P.text('. Find x.')] : [P.root(cube, 3), P.op('='), P.blank()];
      think = `${np(r)} × ${np(r)} × ${np(r)} = ${f(cube)}.`;
      factor = `${Math.abs(cube)} = ${primeFactorText(Math.abs(cube))}; 3 equal groups of ${primeFactorText(Math.abs(r))}${r < 0 ? ', negative' : ''}.`;
    } else {
      const a = rng.integer(1, 8);
      const b = ctx.retry(() => rng.integer(2, 10), (z) => gcd(BigInt(a), BigInt(z)) === 1n);
      const cube = kind === 'cbrtFrac';
      value = rat(a, b);
      const inside = cube ? rat(a * a * a, b * b * b) : rat(a * a, b * b);
      nodes = [P.root([P.frac(inside)], cube ? 3 : 2), P.op('='), P.blank()];
      think = cube ? `(${a}/${b})³ = ${a ** 3}/${b ** 3}.` : `(${a}/${b})² = ${a * a}/${b * b}.`;
      factor = `Root of top: ${a}; root of bottom: ${b}.`;
    }
    const answer = A.number(value);
    return ctx.question({
      prompt: prompt(nodes),
      operation: 'ROOT',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(value) === 'decimal' ? 'fraction' : niceStyle(value),
      ...ways(way('INVERSE_OPERATION', 'What times itself?', answer, think, `So the answer is ${f(value)}.`), way('PRIME_FACTORS', 'Prime factors', answer, factor, `= ${f(value)}.`)),
    });
  },
});

function sciValue(coef: Rational, exp: number): Rational {
  return mul(coef, pow(rat(10), exp));
}
function sciNodes(coef: Rational, exp: number): PromptNode[] {
  return [P.dec(coef), P.op('×'), P.pow(10, exp)];
}
function sciText(coef: Rational, exp: number): string {
  return `${fdec(coef)} × 10^${f(exp)}`;
}
function randomCoef(rng: { integer(a: number, b: number): number }, places: number): Rational {
  const scale = 10 ** places;
  return rat(rng.integer(scale, 10 * scale - 1), scale);
}
const SCI_POLICY = { requiredForms: ['SCIENTIFIC' as const], requireNormalizedScientific: true };

const scientificNotation = defineSkill({
  id: 'g8.ee.scientific-notation',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.3', '8.EE.4'],
  title: 'Scientific notation',
  generate(ctx) {
    const { rng } = ctx;
    const places = ctx.tier({ EASY: 0, MEDIUM: 1, HARD: 2 });
    const coef = randomCoef(rng, places);
    const small = ctx.difficulty !== 'EASY' && rng.bool();
    const exp = small ? -rng.integer(1, ctx.tier({ EASY: 3, MEDIUM: 5, HARD: 7 })) : rng.integer(2, ctx.tier({ EASY: 6, MEDIUM: 8, HARD: 10 }));
    const value = sciValue(coef, exp);
    const standard = fdec(value);
    const dir = exp > 0 ? 'right' : 'left';
    if (rng.bool()) {
      const answer = A.number(value);
      return ctx.question({
        prompt: prompt([P.text('Write in scientific notation:'), P.br(), P.dec(value)]),
        operation: 'TO_SCIENTIFIC',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.scientific(),
        validationPolicy: SCI_POLICY,
        ...ways(
          way('MOVE_THE_POINT', 'Move the decimal point', answer, `Move the point ${Math.abs(exp)} places ${exp > 0 ? 'left' : 'right'} to get ${fdec(coef)}.`, `${standard} = ${sciText(coef, exp)}.`),
          way('POWERS_OF_TEN', 'Factor out a power of 10', answer, `${standard} = ${fdec(coef)} × ${fdec(pow(rat(10), exp))}.`, `${fdec(pow(rat(10), exp))} = 10^${f(exp)}, so ${sciText(coef, exp)}.`),
        ),
      });
    }
    const answer = A.number(value);
    return ctx.question({
      prompt: prompt([P.text('Write in standard form:'), P.br(), ...sciNodes(coef, exp)]),
      operation: 'TO_STANDARD',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...ways(
        way('MOVE_THE_POINT', 'Move the decimal point', answer, `10^${f(exp)}: move the point ${Math.abs(exp)} places ${dir}.`, `= ${standard}.`),
        way('MULTIPLY_OUT', 'Multiply it out', answer, `10^${f(exp)} = ${fdec(pow(rat(10), exp))}.`, `${fdec(coef)} × ${fdec(pow(rat(10), exp))} = ${standard}.`),
      ),
    });
  },
});

const scientificOperations = defineSkill({
  id: 'g8.ee.scientific-operations',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.4'],
  title: 'Operate in scientific notation',
  generate(ctx) {
    const { rng } = ctx;
    const op = rng.choose(ctx.tier({ EASY: ['multiply'], MEDIUM: ['multiply', 'divide'], HARD: ['multiply', 'divide', 'add'] }) as ('multiply' | 'divide' | 'add')[]);
    const e1 = ctx.retry(() => rng.integer(-6, 9), (z) => op !== 'add' || z !== 0);
    let e1x = e1;
    const e2 = rng.integer(-6, 9);
    let c1: Rational;
    let c2: Rational;
    let result: Rational;
    let first: ReturnType<typeof way>;
    let second: ReturnType<typeof way>;
    let sym: '×' | '÷' | '+';
    const norm = (v: Rational) => {
      // normalize v to c × 10^e for the step text
      let e = 0;
      let c = v;
      for (let i = 0; i < 40 && cmp(c, rat(10)) >= 0; i++) {
        c = div(c, rat(10));
        e++;
      }
      for (let i = 0; i < 40 && cmp(c, rat(1)) < 0; i++) {
        c = mul(c, rat(10));
        e--;
      }
      return { c, e };
    };
    if (op === 'multiply') {
      c1 = randomCoef(rng, ctx.difficulty === 'EASY' ? 0 : 1);
      c2 = rat(rng.integer(2, 9));
      sym = '×';
      result = mul(sciValue(c1, e1), sciValue(c2, e2));
      const prod = mul(c1, c2);
      const n = norm(prod);
      const answer = A.number(result);
      first = way('GROUP_PARTS', 'Coefficients, then powers', answer, `${fdec(c1)} × ${fdec(c2)} = ${fdec(prod)}; 10^(${f(e1)} + ${np(e2)}) = 10^${f(e1 + e2)}.`, n.e ? `${fdec(prod)} = ${sciText(n.c, n.e)}, so ${sciText(n.c, e1 + e2 + n.e)}.` : `${sciText(prod, e1 + e2)}.`);
      second = way('FIX_AT_THE_END', 'Multiply, then normalize', answer, `${fdec(prod)} × 10^${f(e1 + e2)}.`, n.e ? `Coefficient too big: shift 1 place → ${sciText(n.c, e1 + e2 + n.e)}.` : `Already between 1 and 10: ${sciText(prod, e1 + e2)}.`);
    } else if (op === 'divide') {
      c2 = rat(rng.integer(2, 9));
      const raw = mul(c2, randomCoef(rng, 1));
      // keep the dividend's coefficient in [1, 10)
      const big = cmp(raw, rat(10)) >= 0;
      c1 = big ? div(raw, rat(10)) : raw;
      e1x = big ? e1 + 1 : e1;
      const q = div(c1, c2);
      sym = '÷';
      result = div(sciValue(c1, e1x), sciValue(c2, e2));
      const n = norm(q);
      const answer = A.number(result);
      first = way('GROUP_PARTS', 'Coefficients, then powers', answer, `${fdec(c1)} ÷ ${fdec(c2)} = ${fdec(q)}; 10^(${f(e1x)} − ${np(e2)}) = 10^${f(e1x - e2)}.`, n.e ? `${fdec(q)} = ${sciText(n.c, n.e)}, so ${sciText(n.c, e1x - e2 + n.e)}.` : `${sciText(q, e1x - e2)}.`);
      second = way('FIX_AT_THE_END', 'Divide, then normalize', answer, `${fdec(q)} × 10^${f(e1x - e2)}.`, n.e ? `Coefficient below 1: shift → ${sciText(n.c, e1x - e2 + n.e)}.` : `Already between 1 and 10: ${sciText(q, e1x - e2)}.`);
    } else {
      c1 = randomCoef(rng, 1);
      c2 = randomCoef(rng, 1);
      sym = '+';
      const sumC = add(c1, c2);
      result = sciValue(sumC, e1);
      const n = norm(sumC);
      const answer = A.number(result);
      first = way('SAME_POWER', 'Same power: add coefficients', answer, `${fdec(c1)} + ${fdec(c2)} = ${fdec(sumC)} (same 10^${f(e1)}).`, `${sciText(n.c, e1 + n.e)}.`);
      second = way('STANDARD_FORM', 'Use standard form', answer, `${fdec(sciValue(c1, e1))} + ${fdec(sciValue(c2, e1))} = ${fdec(result)}.`, `= ${sciText(n.c, e1 + n.e)}.`);
    }
    const ex2 = op === 'add' ? e1 : e2;
    return ctx.question({
      prompt: prompt([P.text('Answer in scientific notation:'), P.br(), P.op('('), ...sciNodes(c1, e1x), P.op(')'), P.op(sym), P.op('('), ...sciNodes(c2, ex2), P.op(')')]),
      operation: `SCIENTIFIC_${op.toUpperCase()}`,
      canonicalAnswer: A.number(result),
      answerSchema: SCHEMA.scientific(),
      validationPolicy: SCI_POLICY,
      ...ways(first, second),
    });
  },
});

const howManyTimes = defineSkill({
  id: 'g8.ee.how-many-times',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.3'],
  title: 'How many times as large?',
  generate(ctx) {
    const { rng } = ctx;
    const c2 = rng.integer(1, 4);
    const k = rng.integer(2, 9 / c2 >= 2 ? Math.floor(9 / c2) : 2);
    const c1 = c2 * k;
    const e2 = rng.integer(2, 9);
    const d = rng.integer(ctx.tier({ EASY: 0, MEDIUM: 1, HARD: 1 }), ctx.tier({ EASY: 2, MEDIUM: 3, HARD: 5 }));
    const e1 = e2 + d;
    const ans = k * 10 ** d;
    const answer = A.number(ans);
    return ctx.question({
      prompt: prompt([P.text('A ≈ '), P.num(c1), P.op('×'), P.pow(10, e1), P.br(), P.text('B ≈ '), P.num(c2), P.op('×'), P.pow(10, e2), P.br(), P.text('A is how many times B?')]),
      operation: 'COMPARE_MAGNITUDE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.integer(['times']),
      ...ways(
        way('DIVIDE_PARTS', 'Divide coefficients & powers', answer, `${c1} ÷ ${c2} = ${k}; 10^${e1} ÷ 10^${e2} = 10^${d}.`, `${k} × 10^${d} = ${f(ans)}.`),
        way('STANDARD_FORM', 'Use standard form', answer, `${f(c1 * 10 ** (e1 - e2))} × 10^${e2} vs ${c2} × 10^${e2}.`, `${f(c1 * 10 ** (e1 - e2))} ÷ ${c2} = ${f(ans)}.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 8.EE — lines & equations                                             */
/* ------------------------------------------------------------------ */

const slope = defineSkill({
  id: 'g8.ee.slope',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.6', '8.F.4'],
  title: 'Slope from two points',
  generate(ctx) {
    const { rng } = ctx;
    const [x1, y1, x2, y2] = ctx.retry(
      () => [rng.integer(-9, 9), rng.integer(-9, 9), rng.integer(-9, 9), rng.integer(-9, 9)] as const,
      ([a, b, c, d]) => {
        if (a === c) return false;
        const m = rat(d - b, c - a);
        if (ctx.difficulty === 'EASY') return isInteger(m) && m.numerator > 0n && a >= 0 && c >= 0;
        if (ctx.difficulty === 'MEDIUM') return isInteger(m) && m.numerator !== 0n;
        return !isInteger(m);
      },
    );
    const m = rat(y2 - y1, x2 - x1);
    const answer = A.number(m);
    return ctx.question({
      prompt: prompt([P.text('Slope through '), ...pairNodes(x1, y1), P.text(' and '), ...pairNodes(x2, y2)]),
      operation: 'SLOPE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: 'fraction',
      ...ways(
        way('RISE_OVER_RUN', 'Rise over run', answer, `Rise ${f(y2)} − ${np(y1)} = ${f(y2 - y1)}; run ${f(x2)} − ${np(x1)} = ${f(x2 - x1)}.`, `m = ${f(y2 - y1)} ÷ ${np(x2 - x1)} = ${f(m)}.`),
        way('OTHER_ORDER', 'Subtract the other way', answer, `(${f(y1)} − ${np(y2)}) ÷ (${f(x1)} − ${np(x2)}) = ${f(y1 - y2)} ÷ ${np(x1 - x2)}.`, `= ${f(m)} (same slope).`),
      ),
    });
  },
});

const compareRates = defineSkill({
  id: 'g8.ee.compare-rates',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.5'],
  title: 'Compare proportional relationships',
  generate(ctx) {
    const { rng } = ctx;
    const [ra, rb] = ctx.retry(() => [rng.integer(20, 75), rng.integer(20, 75)] as const, ([a, b]) => Math.abs(a - b) >= ctx.tier({ EASY: 10, MEDIUM: 4, HARD: 1 }));
    const t = rng.integer(2, 6);
    const dB = rb * t;
    const choices = fixedChoices(['Car A', 'Car B']);
    const faster = ra > rb ? 'car-a' : 'car-b';
    const answer = A.choice(faster);
    const winner = ra > rb ? 'Car A' : 'Car B';
    return ctx.question({
      prompt: prompt([P.text('Car A: '), P.v('d'), P.op('='), P.num(ra), P.v('t'), P.br(), P.text(`Car B: ${dB} miles in ${t} hours.`), P.br(), P.text('Which is faster?')]),
      operation: 'COMPARE_RATES',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way('UNIT_RATES', 'Compare unit rates', answer, `A: ${ra} mph. B: ${dB} ÷ ${t} = ${rb} mph.`, `${winner} is faster.`),
        way('SAME_TIME', 'Compare at the same time', answer, `In ${t} hours: A goes ${ra * t}, B goes ${dB}.`, `${winner} goes farther → faster.`),
      ),
    });
  },
});

const linearEquations = defineSkill({
  id: 'g8.ee.linear-equations',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.7b'],
  title: 'Variables on both sides',
  generate(ctx) {
    const { rng } = ctx;
    const v = rng.choose(['x', 'n', 'y', 'm'] as const);
    const x = ctx.tier({ EASY: rat(rng.integer(1, 10)), MEDIUM: rat(rng.integer(-10, 10)), HARD: rat(rng.integer(-15, 15), rng.choose([1, 2, 3, 4])) });
    const [a, c] = ctx.retry(() => [rng.integer(-9, 9), rng.integer(-9, 9)] as const, ([p, q]) => p !== q && p !== 0 && q !== 0 && (ctx.difficulty !== 'EASY' || (p > q && q > 0)));
    const k = ctx.difficulty === 'HARD' ? rng.integer(2, 5) : 1;
    const b = rng.integer(-12, 12);
    // HARD: k(a·x + b) = c·x + d ; else a·x + b = c·x + d
    const lhsCoef = k * a;
    const lhsConst = k * b;
    const d = sub(add(mul(rat(lhsCoef), x), rat(lhsConst)), mul(rat(c), x));
    const answer = A.number(x);
    const lhs: PromptNode[] =
      k === 1
        ? [P.text(linText(a, b, v))]
        : [P.num(k), P.op('('), P.text(linText(a, b, v)), P.op(')')];
    const rhsText = linText(c, d, v);
    const expanded = linText(lhsCoef, lhsConst, v);
    const left = lhsCoef - c;
    const right = c - lhsCoef;
    return ctx.question({
      prompt: prompt([P.text('Solve:'), P.br(), ...lhs, P.op('='), P.text(rhsText)]),
      operation: 'SOLVE_LINEAR',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(x),
      ...ways(
        way(
          'VARIABLES_LEFT',
          `Collect ${v}'s on the left`,
          answer,
          ...(k > 1 ? [`Distribute: ${expanded} = ${rhsText}.`] : []),
          `${c < 0 ? 'Add' : 'Subtract'} ${termText(Math.abs(c), v)}: ${linText(left, lhsConst, v)} = ${nice(d)}.`,
          `${termText(left, v)} = ${nice(sub(d, rat(lhsConst)))} → ${v} = ${nice(x)}.`,
        ),
        way(
          'VARIABLES_RIGHT',
          `Collect ${v}'s on the right`,
          answer,
          ...(k > 1 ? [`Distribute: ${expanded} = ${rhsText}.`] : []),
          `${lhsCoef < 0 ? 'Add' : 'Subtract'} ${termText(Math.abs(lhsCoef), v)}: ${f(lhsConst)} = ${linText(right, d, v)}.`,
          `${nice(sub(rat(lhsConst), d))} = ${termText(right, v)} → ${v} = ${nice(x)}.`,
        ),
      ),
    });
  },
});

const solutionCount = defineSkill({
  id: 'g8.ee.solution-count',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.7a'],
  title: 'One, none, or infinitely many?',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['one', 'none', 'many'] as const);
    const k = rng.integer(2, 6);
    const p = rng.integer(-9, 9);
    const q = rng.integer(-9, 9);
    const lhsCoef = k;
    const lhsConst = k * p + q;
    const c = kind === 'one' ? ctx.retry(() => rng.integer(1, 9), (z) => z !== k) : k;
    const dConst = kind === 'many' ? lhsConst : kind === 'none' ? lhsConst + rng.choose([-5, -3, -2, 2, 3, 5]) : rng.integer(-12, 12);
    const answer = countAnswer(kind);
    const lhsNodes: PromptNode[] = ctx.difficulty === 'EASY' ? [P.text(linText(lhsCoef, lhsConst, 'x'))] : [P.num(k), P.op('('), P.text(linText(1, p, 'x')), P.op(')'), ...(q === 0 ? [] : [P.op(q < 0 ? '−' : '+'), P.num(Math.abs(q))])];
    const verdict = kind === 'one' ? 'One solution' : kind === 'none' ? 'No solution' : 'Infinitely many';
    const after = kind === 'one' ? `${termText(lhsCoef - c, 'x')} = ${f(dConst - lhsConst)} → one value of x.` : kind === 'none' ? `0 = ${f(dConst - lhsConst)} is false → no solution.` : '0 = 0 is always true → infinitely many.';
    return ctx.question({
      prompt: prompt([P.text('How many solutions?'), P.br(), ...lhsNodes, P.op('='), P.text(linText(c, dConst, 'x'))]),
      operation: 'SOLUTION_COUNT',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(COUNT_CHOICES),
      ...ways(
        way('COMPARE_SIDES', 'Simplify and compare', answer, `Left: ${linText(lhsCoef, lhsConst, 'x')}. Right: ${linText(c, dConst, 'x')}.`, kind === 'one' ? 'Different x-coefficients → one solution.' : kind === 'none' ? 'Same x-terms, different numbers → none.' : 'Identical sides → infinitely many.'),
        way('SUBTRACT_X_TERMS', 'Subtract the x-terms', answer, `Subtract ${termText(c, 'x')} from both sides.`, after, `→ ${verdict}.`),
      ),
    });
  },
});

function twoVarNodes(a: number, b: number, c: number): PromptNode[] {
  const nodes: PromptNode[] = [];
  if (a !== 0) nodes.push(P.text(termText(a, 'x')));
  if (b !== 0) {
    if (nodes.length) nodes.push(P.op(b < 0 ? '−' : '+'), P.text(termText(Math.abs(b), 'y')));
    else nodes.push(P.text(termText(b, 'y')));
  }
  nodes.push(P.op('='), P.num(c));
  return nodes;
}

function eqText(a: number, b: number, c: number): string {
  const parts: string[] = [];
  if (a !== 0) parts.push(termText(a, 'x'));
  if (b !== 0) parts.push(parts.length ? `${b < 0 ? '−' : '+'} ${termText(Math.abs(b), 'y')}` : termText(b, 'y'));
  return `${parts.join(' ')} = ${f(c)}`;
}

const systems = defineSkill({
  id: 'g8.ee.systems',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.8b'],
  title: 'Solve a system of equations',
  generate(ctx) {
    const { rng } = ctx;
    const x = rng.integer(ctx.difficulty === 'EASY' ? 1 : -8, 9);
    const y = rng.integer(ctx.difficulty === 'EASY' ? 1 : -8, 9);
    const [a1, b1, a2, b2] = ctx.retry(
      () =>
        ctx.tier({
          EASY: [1, 1, 1, -1],
          MEDIUM: [rng.integer(-4, 4), 1, rng.integer(1, 5), rng.integer(-4, 4)],
          HARD: [rng.integer(-5, 5), rng.integer(-5, 5), rng.integer(-5, 5), rng.integer(-5, 5)],
        }) as [number, number, number, number],
      ([p, q, r, s]) => p * s - q * r !== 0 && q !== 0 && r !== 0 && (p !== 0 || s !== 0),
    );
    const c1 = a1 * x + b1 * y;
    const c2 = a2 * x + b2 * y;
    const answer = A.pair(x, y);
    // Elimination of y: multiply eq1 by b2 and eq2 by b1, subtract.
    const D = a1 * b2 - a2 * b1;
    const N = c1 * b2 - c2 * b1;
    // Substitution: solve eq1 for y (b1 ≠ 0): y = (c1 − a1 x)/b1
    const ySlope = rat(-a1, b1);
    const yInt = rat(c1, b1);
    return ctx.question({
      prompt: prompt([P.text('Solve the system:'), P.br(), ...twoVarNodes(a1, b1, c1), P.br(), ...twoVarNodes(a2, b2, c2)]),
      operation: 'SOLVE_SYSTEM',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.pair(),
      ...ways(
        way(
          'ELIMINATION',
          'Elimination',
          answer,
          ctx.difficulty === 'EASY' ? `Add the equations: 2x = ${c1 + c2}, so x = ${x}.` : `Eq 1 × ${np(b2)} minus Eq 2 × ${np(b1)}: ${f(D)}x = ${f(N)}.`,
          ...(ctx.difficulty === 'EASY' ? [] : [`x = ${f(N)} ÷ ${np(D)} = ${f(x)}.`]),
          `Put x = ${f(x)} into Eq 1: y = ${f(y)}. Answer ${pairText(x, y)}.`,
        ),
        way(
          'SUBSTITUTION',
          'Substitution',
          answer,
          `From Eq 1: y = ${linText(ySlope, yInt, 'x')}.`,
          `Put into Eq 2 and solve: x = ${f(x)}.`,
          `y = ${f(y)}. Answer ${pairText(x, y)}.`,
        ),
      ),
    });
  },
});

const systemCount = defineSkill({
  id: 'g8.ee.system-solution-count',
  grade: '8',
  domain: 'EE',
  standards: ['8.EE.8b'],
  title: 'How many solutions does a system have?',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['one', 'none', 'many'] as const);
    const [a, b] = ctx.retry(() => [rng.integer(1, 6), rng.integer(-6, 6)] as const, ([p, q]) => q !== 0 && gcd(BigInt(p), BigInt(Math.abs(q))) === 1n);
    const c = rng.integer(-12, 12);
    const k = ctx.difficulty === 'EASY' ? 1 : rng.integer(2, 4);
    let a2 = a * k;
    let b2 = b * k;
    let c2 = c * k;
    if (kind === 'none') c2 = c * k + rng.choose([-3, -2, -1, 1, 2, 3]) * k;
    if (kind === 'one') {
      [a2, b2] = ctx.retry(() => [rng.integer(1, 6), rng.integer(-6, 6)] as const, ([p, q]) => q !== 0 && a * q - b * p !== 0) as [number, number];
      c2 = rng.integer(-12, 12);
    }
    const answer = countAnswer(kind);
    const verdict = kind === 'one' ? 'One solution' : kind === 'none' ? 'No solution' : 'Infinitely many';
    return ctx.question({
      prompt: prompt([P.text('How many solutions?'), P.br(), ...twoVarNodes(a, b, c), P.br(), ...twoVarNodes(a2, b2, c2)]),
      operation: 'SYSTEM_COUNT',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(COUNT_CHOICES),
      ...ways(
        way(
          'COMPARE_SLOPES',
          'Compare the lines',
          answer,
          `Slopes: ${f(rat(-a, b))} and ${f(rat(-a2, b2))}; y-intercepts: ${f(rat(c, b))} and ${f(rat(c2, b2))}.`,
          kind === 'one' ? 'Different slopes → lines cross once.' : kind === 'none' ? 'Same slope, different intercepts → parallel.' : 'Same line.',
        ),
        way(
          'ELIMINATE',
          'Try to eliminate',
          answer,
          kind === 'one' ? 'Eliminating leaves one x value.' : `Eq 1 × ${k}: ${eqText(a2, b2, c * k)}.`,
          kind === 'one' ? `→ ${verdict}.` : kind === 'none' ? `Compare with Eq 2: ${f(c * k)} ≠ ${f(c2)} → ${verdict}.` : `Same as Eq 2 → ${verdict}.`,
        ),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 8.F                                                                  */
/* ------------------------------------------------------------------ */

const functionOrNot = defineSkill({
  id: 'g8.f.function-or-not',
  grade: '8',
  domain: 'F',
  standards: ['8.F.1'],
  title: 'Is it a function?',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(ctx.tier({ EASY: ['yes', 'no'], MEDIUM: ['yes', 'no'], HARD: ['yes', 'no', 'repeatSame'] }) as ('yes' | 'no' | 'repeatSame')[]);
    const xs = rng.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8], 5);
    const ys = xs.map(() => rng.integer(-9, 9));
    let rx: number | null = null;
    if (kind !== 'yes') {
      const i = rng.integer(1, 4);
      const j = rng.integer(0, i - 1);
      xs[i] = xs[j] as number;
      rx = xs[j] as number;
      ys[i] = kind === 'repeatSame' ? (ys[j] as number) : ctx.retry(() => rng.integer(-9, 9), (z) => z !== ys[j]);
    }
    const isFunction = kind !== 'no';
    const answer = yesNo(isFunction);
    const outs = rx === null ? [] : [...new Set(xs.map((x, i) => (x === rx ? ys[i] : null)).filter((z): z is number => z !== null))];
    return ctx.question({
      prompt: prompt([P.text('Is y a function of x?')], { v: 'table', headers: ['x', 'y'], rows: xs.map((x, i) => [f(x), f(ys[i] as number)]) }),
      operation: 'IS_FUNCTION',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(YES_NO),
      ...ways(
        way(
          'CHECK_INPUTS',
          'One output per input',
          answer,
          rx === null ? 'Every x appears once.' : `x = ${f(rx)} gives y = ${outs.map((o) => f(o)).join(' and ')}.`,
          isFunction ? 'Each x has one y → Yes.' : 'One x, two y values → No.',
        ),
        way('VERTICAL_LINE', 'Vertical line test', answer, rx === null ? 'Each vertical line hits at most 1 point.' : `The line x = ${f(rx)} hits ${outs.length} point${outs.length === 1 ? '' : 's'}.`, isFunction ? '→ Yes.' : '→ No.'),
      ),
    });
  },
});

const linearOrNonlinear = defineSkill({
  id: 'g8.f.linear-or-nonlinear',
  grade: '8',
  domain: 'F',
  standards: ['8.F.3'],
  title: 'Linear or nonlinear?',
  generate(ctx) {
    const { rng } = ctx;
    const m = rng.integer(2, 6);
    const b = rng.integer(-6, 6);
    const forms = [
      { nodes: [P.v('y'), P.op('='), P.text(linText(m, b, 'x'))], linear: true, fn: (x: number) => rat(m * x + b), form: `y = mx + b form` },
      { nodes: [P.v('y'), P.op('='), P.num(m), P.op('('), P.text(linText(1, b, 'x')), P.op(')')], linear: true, fn: (x: number) => rat(m * (x + b)), form: `Expands to ${linText(m, m * b, 'x')}` },
      { nodes: [P.v('y'), P.op('='), P.pow([P.v('x')], 2), P.op(b < 0 ? '−' : '+'), P.num(Math.abs(b))], linear: false, fn: (x: number) => rat(x * x + b), form: 'Has x² — not mx + b' },
      { nodes: [P.v('y'), P.op('='), P.pow(m, [P.v('x')])], linear: false, fn: (x: number) => pow(rat(m), x), form: 'x is an exponent — not mx + b' },
      { nodes: [P.v('y'), P.op('='), P.v('x'), P.op('('), P.text(linText(1, Math.abs(b) + 1, 'x')), P.op(')')], linear: false, fn: (x: number) => rat(x * (x + Math.abs(b) + 1)), form: 'x times x gives x² — not mx + b' },
    ];
    const item = rng.choose(ctx.difficulty === 'EASY' ? [forms[0], forms[2]] : forms) as (typeof forms)[number];
    const ys = [0, 1, 2].map((x) => item.fn(x));
    const d1 = sub(ys[1] as Rational, ys[0] as Rational);
    const d2 = sub(ys[2] as Rational, ys[1] as Rational);
    const choices = fixedChoices(['Linear', 'Nonlinear']);
    const answer = A.choice(item.linear ? 'linear' : 'nonlinear');
    const label = item.linear ? 'Linear' : 'Nonlinear';
    return ctx.question({
      prompt: prompt([P.text('Linear or nonlinear?'), P.br(), ...item.nodes]),
      operation: 'LINEAR_TEST',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way('CHECK_THE_FORM', 'Check the form', answer, `${item.form}.`, `→ ${label}.`),
        way('TABLE_OF_VALUES', 'Make a table', answer, `x = 0, 1, 2 → y = ${ys.map((y) => nice(y)).join(', ')}.`, `Changes ${nice(d1)} and ${nice(d2)}: ${cmp(d1, d2) === 0 ? 'constant' : 'not constant'} → ${label}.`),
      ),
    });
  },
});

const rateAndInitialValue = defineSkill({
  id: 'g8.f.rate-initial-value',
  grade: '8',
  domain: 'F',
  standards: ['8.F.4'],
  title: 'Rate of change & initial value',
  generate(ctx) {
    const { rng } = ctx;
    const askRate = rng.bool();
    const kind = rng.choose(ctx.tier({ EASY: ['words'], MEDIUM: ['words', 'points'], HARD: ['points', 'table'] }) as ('words' | 'points' | 'table')[]);
    const m = ctx.difficulty === 'HARD' ? rat(rng.integer(-12, 12), rng.choose([1, 2])) : rat(rng.integer(2, 30));
    const b = rat(rng.integer(ctx.difficulty === 'HARD' ? -20 : 5, 60));
    const value = askRate ? m : b;
    const answer = A.number(value);
    const what = askRate ? 'Rate of change' : 'Initial value';
    if (kind === 'words') {
      const gym = rng.choose([
        ['A gym charges', 'to join plus', 'per month'],
        ['A phone plan costs', 'to start plus', 'per month'],
        ['A taxi charges', 'plus', 'per mile'],
      ] as const);
      return ctx.question({
        prompt: prompt([P.text(`${gym[0]} $${nice(b)} ${gym[1]} $${nice(m)} ${gym[2]}.`), P.br(), P.text(`${what}?`)]),
        operation: askRate ? 'RATE_OF_CHANGE' : 'INITIAL_VALUE',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.anyNumber(['$', 'dollars']),
        ...ways(
          way('READ_THE_DESCRIPTION', 'Read the description', answer, `“${gym[2]}” amount = rate ${nice(m)}; starting amount = ${nice(b)}.`, `${what}: ${nice(value)}.`),
          way('MAKE_A_TABLE', 'Make a table', answer, `0 → ${nice(b)}, 1 → ${nice(add(b, m))}, 2 → ${nice(add(b, mul(m, rat(2))))}.`, `Starts at ${nice(b)}, goes up ${nice(m)} each time → ${nice(value)}.`),
        ),
      });
    }
    const [x1, x2] = ctx.retry(() => [rng.integer(1, 6), rng.integer(2, 10)] as const, ([p, q]) => q > p);
    const y1 = add(mul(m, rat(x1)), b);
    const y2 = add(mul(m, rat(x2)), b);
    const nodes: PromptNode[] = kind === 'points' ? [P.text('Line through '), ...pairNodes(x1, y1), P.text(' and '), ...pairNodes(x2, y2), P.br(), P.text(`${what}?`)] : [P.text(`${what}?`)];
    const visual = kind === 'table' ? { v: 'table' as const, headers: ['x', 'y'], rows: [x1, x2, x2 + 1].map((x) => [String(x), nice(add(mul(m, rat(x)), b))]) } : undefined;
    return ctx.question({
      prompt: prompt(nodes, visual),
      operation: askRate ? 'RATE_OF_CHANGE' : 'INITIAL_VALUE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(value),
      ...ways(
        way('SLOPE_THEN_INTERCEPT', 'Slope, then intercept', answer, `m = (${nice(y2)} − ${np(y1)}) ÷ (${x2} − ${x1}) = ${nice(m)}.`, ...(askRate ? [] : [`b = ${nice(y1)} − ${np(m)} × ${x1} = ${nice(b)}.`])),
        way('WORK_BACK_TO_ZERO', 'Work back to x = 0', answer, `Each +1 in x adds ${nice(m)} to y.`, askRate ? `Rate = ${nice(m)}.` : `From x = ${x1}, go back ${x1} steps: ${nice(y1)} − ${x1} × ${np(m)} = ${nice(b)}.`),
      ),
    });
  },
});

const compareFunctions = defineSkill({
  id: 'g8.f.compare-functions',
  grade: '8',
  domain: 'F',
  standards: ['8.F.2'],
  title: 'Compare two functions',
  generate(ctx) {
    const { rng } = ctx;
    const [ma, mb] = ctx.retry(
      () => [rng.integer(ctx.difficulty === 'HARD' ? -8 : 1, 9), rng.integer(ctx.difficulty === 'HARD' ? -8 : 1, 9)] as const,
      ([a, b]) => a !== b,
    );
    const ba = rng.integer(-5, 10);
    const bb = rng.integer(-5, 10);
    const xs = [0, 1, 2, 3];
    const choices = fixedChoices(['Function A', 'Function B']);
    const answer = A.choice(ma > mb ? 'function-a' : 'function-b');
    const winner = ma > mb ? 'Function A' : 'Function B';
    return ctx.question({
      prompt: prompt([P.text('A: see table. B: '), P.v('y'), P.op('='), P.text(linText(mb, bb, 'x')), P.br(), P.text('Greater rate of change?')], {
        v: 'table',
        headers: ['x', 'y (A)'],
        rows: xs.map((x) => [String(x), f(ma * x + ba)]),
      }),
      operation: 'COMPARE_FUNCTIONS',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way('FIND_EACH_RATE', 'Find each rate', answer, `A: y changes by ${f(ma)} per 1. B: slope ${f(mb)}.`, `${winner} is greater.`),
        way('SAME_INTERVAL', 'Compare over x = 0 to 3', answer, `A: ${f(ba)} → ${f(ma * 3 + ba)} (change ${f(3 * ma)}). B: ${f(bb)} → ${f(mb * 3 + bb)} (change ${f(3 * mb)}).`, `${winner} changes more.`),
      ),
    });
  },
});

const increasingDecreasing = defineSkill({
  id: 'g8.f.increasing-decreasing',
  grade: '8',
  domain: 'F',
  standards: ['8.F.5'],
  title: 'Increasing or decreasing?',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['Increasing', 'Decreasing', 'Constant'] as const);
    const start = rng.integer(-10, 20);
    const xs = [0, 1, 2, 3, 4];
    const linear = ctx.difficulty === 'EASY' || rng.bool();
    const step = (i: number) => (kind === 'Constant' ? 0 : (linear ? rng.integer(2, 6) : i + rng.integer(1, 3)) * (kind === 'Increasing' ? 1 : -1));
    const ys: number[] = [start];
    for (let i = 1; i < xs.length; i++) ys.push((ys[i - 1] as number) + step(i));
    const choices = fixedChoices(['Increasing', 'Decreasing', 'Constant']);
    const answer = A.choice(kind.toLowerCase());
    return ctx.question({
      prompt: prompt([P.text('As x increases, y is…')], { v: 'table', headers: ['x', 'y'], rows: xs.map((x, i) => [String(x), f(ys[i] as number)]) }),
      operation: 'FUNCTION_BEHAVIOR',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(
        way('LOOK_AT_CHANGES', 'Look at the changes', answer, `Changes: ${ys.slice(1).map((y, i) => f(y - (ys[i] as number))).join(', ')}.`, `All ${kind === 'Increasing' ? 'positive' : kind === 'Decreasing' ? 'negative' : 'zero'} → ${kind}.`),
        way('FIRST_AND_LAST', 'Picture the graph', answer, `Points go ${kind === 'Increasing' ? 'up' : kind === 'Decreasing' ? 'down' : 'flat'} from left to right.`, `→ ${kind}.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 8.G                                                                  */
/* ------------------------------------------------------------------ */

const transformations = defineSkill({
  id: 'g8.g.transformations',
  grade: '8',
  domain: 'G',
  standards: ['8.G.3'],
  title: 'Transformations on coordinates',
  generate(ctx) {
    const { rng } = ctx;
    const x = rng.integer(-8, 8);
    const y = ctx.retry(() => rng.integer(-8, 8), (z) => z !== 0 || x !== 0);
    const kind = rng.choose(ctx.tier({ EASY: ['translate', 'reflectX', 'reflectY'], MEDIUM: ['translate', 'rotate180', 'dilate', 'reflectY'], HARD: ['rotate90', 'rotate270', 'dilate', 'rotate180'] }) as string[]);
    let rx: Rational;
    let ry: Rational;
    let desc: string;
    let rule: string;
    let other: string;
    switch (kind) {
      case 'translate': {
        const a = rng.integer(-6, 6);
        const b = rng.integer(-6, 6);
        rx = rat(x + a);
        ry = rat(y + b);
        desc = `Translate ${Math.abs(a)} ${a < 0 ? 'left' : 'right'} and ${Math.abs(b)} ${b < 0 ? 'down' : 'up'}.`;
        rule = `(x ${a < 0 ? '−' : '+'} ${Math.abs(a)}, y ${b < 0 ? '−' : '+'} ${Math.abs(b)}).`;
        other = `Slide on the grid: x moves ${f(a)}, y moves ${f(b)}.`;
        break;
      }
      case 'reflectX':
        rx = rat(x);
        ry = rat(-y);
        desc = 'Reflect across the x-axis.';
        rule = '(x, y) → (x, −y).';
        other = `Same distance (${Math.abs(y)}) on the other side of the x-axis.`;
        break;
      case 'reflectY':
        rx = rat(-x);
        ry = rat(y);
        desc = 'Reflect across the y-axis.';
        rule = '(x, y) → (−x, y).';
        other = `Same distance (${Math.abs(x)}) on the other side of the y-axis.`;
        break;
      case 'rotate180':
        rx = rat(-x);
        ry = rat(-y);
        desc = 'Rotate 180° about the origin.';
        rule = '(x, y) → (−x, −y).';
        other = 'Two 90° turns: same as reflecting across both axes.';
        break;
      case 'rotate90':
        rx = rat(-y);
        ry = rat(x);
        desc = 'Rotate 90° counterclockwise about the origin.';
        rule = '(x, y) → (−y, x).';
        other = 'Swap x and y, then change the sign of the new x.';
        break;
      case 'rotate270':
        rx = rat(y);
        ry = rat(-x);
        desc = 'Rotate 90° clockwise about the origin.';
        rule = '(x, y) → (y, −x).';
        other = 'Swap x and y, then change the sign of the new y.';
        break;
      default: {
        const k = ctx.difficulty === 'HARD' ? rat(rng.choose([1, 3]), 2) : rat(rng.integer(2, 4));
        rx = mul(k, rat(x));
        ry = mul(k, rat(y));
        desc = `Dilate by a scale factor of ${nice(k)} about the origin.`;
        rule = `(x, y) → (${nice(k)}x, ${nice(k)}y).`;
        other = `Distances from the origin scale by ${nice(k)}.`;
      }
    }
    const answer = A.pair(rx, ry);
    return ctx.question({
      prompt: prompt([P.text('Point '), ...pairNodes(x, y), P.br(), P.text(`${desc} New point?`)]),
      operation: `TRANSFORM_${kind.toUpperCase()}`,
      canonicalAnswer: answer,
      answerSchema: SCHEMA.pair(),
      ...ways(way('COORDINATE_RULE', 'Coordinate rule', answer, rule, `${pairText(x, y)} → ${pairText(rx, ry)}.`), way('PICTURE_IT', 'Picture it', answer, other, `New point ${pairText(rx, ry)}.`)),
    });
  },
});

const RIGID = [
  { q: 'Which move can change a figure’s size?', correct: 'Dilation', wrong: ['Rotation', 'Reflection', 'Translation'], why: 'Rotations, reflections and translations keep size.' },
  { q: 'Which move keeps the figure congruent?', correct: 'Rotation', wrong: ['Dilation by 2', 'Dilation by 1/2', 'Stretching'], why: 'Rigid motions keep lengths and angles.' },
  { q: 'After a reflection, side lengths are…', correct: 'The same', wrong: ['Doubled', 'Halved', 'Changed'], why: 'Reflections are rigid motions.' },
  { q: 'After a dilation by 3, angle measures are…', correct: 'The same', wrong: ['3 times as big', '1/3 as big', 'Changed'], why: 'Dilations keep angles; only lengths scale.' },
  { q: 'Parallel lines after a translation are…', correct: 'Still parallel', wrong: ['Perpendicular', 'Crossing', 'Curved'], why: 'Rigid motions keep parallel lines parallel.' },
] as const;

const rigidMotions = defineSkill({
  id: 'g8.g.rigid-motions',
  grade: '8',
  domain: 'G',
  standards: ['8.G.1', '8.G.2', '8.G.4'],
  title: 'Congruence & similarity moves',
  generate(ctx) {
    const { rng } = ctx;
    const item = rng.choose(RIGID);
    const { choices, correctId } = makeChoices(rng, item.correct, [...item.wrong]);
    const answer = A.choice(correctId);
    return ctx.question({
      prompt: prompt([P.text(item.q)]),
      operation: 'RIGID_MOTIONS',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(choices),
      ...ways(way('RULE', 'Use the rule', answer, item.why, `→ ${item.correct}.`), way('TRY_IT', 'Try it with tracing paper', answer, 'Trace, then turn, flip or slide: the copy still matches.', `→ ${item.correct}.`)),
    });
  },
});

const similarFigures = defineSkill({
  id: 'g8.g.similar-figures',
  grade: '8',
  domain: 'G',
  standards: ['8.G.4'],
  title: 'Similar figures',
  generate(ctx) {
    const { rng } = ctx;
    const k = ctx.tier({ EASY: rat(rng.integer(2, 4)), MEDIUM: rat(rng.integer(3, 9), 2), HARD: rat(rng.integer(2, 7), rng.integer(2, 5)) });
    const [s1, s2] = ctx.retry(() => [Number(k.denominator) * rng.integer(1, 8), Number(k.denominator) * rng.integer(1, 8)] as const, ([p, q]) => p !== q);
    const t1 = mul(k, rat(s1));
    const t2 = mul(k, rat(s2));
    const answer = A.number(t2);
    return ctx.question({
      prompt: prompt([P.text(`Similar triangles: side ${s1} matches ${nice(t1)}. Side ${s2} matches ?`)]),
      operation: 'SIMILAR_SIDE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.anyNumber(),
      answerDisplay: niceStyle(t2),
      ...ways(
        way('SCALE_FACTOR', 'Scale factor', answer, `k = ${nice(t1)} ÷ ${s1} = ${nice(k)}.`, `${s2} × ${nice(k)} = ${nice(t2)}.`),
        way('PROPORTION', 'Proportion', answer, `${s1}/${nice(t1)} = ${s2}/x.`, `x = ${s2} × ${nice(t1)} ÷ ${s1} = ${nice(t2)}.`),
      ),
    });
  },
});

const angles = defineSkill({
  id: 'g8.g.angles',
  grade: '8',
  domain: 'G',
  standards: ['8.G.5'],
  title: 'Triangle & parallel-line angles',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(ctx.tier({ EASY: ['triangle', 'corresponding'], MEDIUM: ['triangle', 'exterior', 'alternate', 'sameSide'], HARD: ['exterior', 'sameSide', 'triangleAlgebra'] }) as string[]);
    const schema = SCHEMA.integer(DEGREE_UNITS);
    if (kind === 'triangle' || kind === 'exterior') {
      const [a, b] = ctx.retry(() => [rng.integer(20, 100), rng.integer(20, 100)] as const, ([p, q]) => p + q < 165);
      const third = 180 - a - b;
      const value = kind === 'triangle' ? third : a + b;
      const answer = A.number(value);
      return ctx.question({
        prompt: prompt([P.text(kind === 'triangle' ? `Triangle angles: ${a}°, ${b}°, ?` : `Triangle: interior angles ${a}° and ${b}°. Exterior angle at the third corner?`)]),
        operation: kind === 'triangle' ? 'TRIANGLE_ANGLE' : 'EXTERIOR_ANGLE',
        canonicalAnswer: answer,
        answerSchema: schema,
        ...ways(
          kind === 'triangle'
            ? way('ANGLE_SUM', 'Angles sum to 180°', answer, `180 − ${a} − ${b} = ${third}.`, `${third}°.`)
            : way('REMOTE_INTERIOR', 'Sum of the far angles', answer, `Exterior = ${a} + ${b}.`, `= ${value}°.`),
          kind === 'triangle'
            ? way('EXTERIOR_FIRST', 'Use an exterior angle', answer, `Exterior at the third corner = ${a} + ${b} = ${a + b}.`, `Third angle = 180 − ${a + b} = ${third}°.`)
            : way('THIRD_ANGLE_FIRST', 'Third angle first', answer, `Third angle: 180 − ${a} − ${b} = ${third}.`, `Exterior: 180 − ${third} = ${value}°.`),
        ),
      });
    }
    if (kind === 'triangleAlgebra') {
      const [p, q, c] = ctx.retry(() => [rng.integer(1, 4), rng.integer(1, 4), rng.integer(0, 40)] as const, ([pp, qq, cc]) => (180 - cc) % (pp + qq + 1) === 0 && (180 - cc) / (pp + qq + 1) >= 8);
      const x = (180 - c) / (p + q + 1);
      const answer = A.number(x);
      return ctx.question({
        prompt: prompt([P.text(`Triangle angles: x°, ${termText(p, 'x')}°, (${linText(q, c, 'x')})°. Find x.`)]),
        operation: 'TRIANGLE_ALGEBRA',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.integer(),
        ...ways(
          way('WRITE_AN_EQUATION', 'Write an equation', answer, `x + ${termText(p, 'x')} + ${linText(q, c, 'x')} = 180.`, `${termText(p + q + 1, 'x')} = ${180 - c} → x = ${x}.`),
          way('BAR_MODEL', 'Bar model', answer, `Remove ${c}: 180 − ${c} = ${180 - c}.`, `${p + q + 1} equal parts: ${180 - c} ÷ ${p + q + 1} = ${x}.`),
        ),
      });
    }
    const a = rng.integer(25, 155);
    const same = kind === 'corresponding' || kind === 'alternate';
    const value = same ? a : 180 - a;
    const answer = A.number(value);
    const names: Record<string, string> = { corresponding: 'corresponding', alternate: 'alternate interior', sameSide: 'same-side interior' };
    return ctx.question({
      prompt: prompt([P.text(`Parallel lines cut by a transversal. One angle is ${a}°. Its ${names[kind]} angle?`)]),
      operation: 'PARALLEL_LINES',
      canonicalAnswer: answer,
      answerSchema: schema,
      ...ways(
        way('ANGLE_RULE', 'Angle rule', answer, same ? `${names[kind]} angles are equal.` : 'Same-side interior angles add to 180°.', same ? `${a}°.` : `180 − ${a} = ${value}°.`),
        way('LINEAR_PAIR', 'Use a straight line', answer, `Its neighbor on the straight line: 180 − ${a} = ${180 - a}.`, same ? `That neighbor pairs with our angle's match: 180 − ${180 - a} = ${a}°.` : `That neighbor equals the same-side angle: ${value}°.`),
      ),
    });
  },
});

const TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
] as const;
const QUADRUPLES = [
  [1, 2, 2, 3],
  [2, 3, 6, 7],
  [1, 4, 8, 9],
  [4, 4, 7, 9],
  [2, 6, 9, 11],
  [6, 6, 7, 11],
] as const;

const pythagorean = defineSkill({
  id: 'g8.g.pythagorean',
  grade: '8',
  domain: 'G',
  standards: ['8.G.7'],
  title: 'Pythagorean theorem',
  generate(ctx) {
    const { rng } = ctx;
    const unit = rng.choose(['cm', 'm', 'in', 'ft'] as const);
    if (ctx.difficulty === 'HARD' && rng.bool()) {
      const [a, b, c, d] = rng.choose(QUADRUPLES);
      const k = rng.integer(1, 3);
      const [l, w, h, diag] = [a * k, b * k, c * k, d * k];
      const floor2 = l * l + w * w;
      const answer = A.number(diag);
      return ctx.question({
        prompt: prompt([P.text(`Box ${l} × ${w} × ${h} ${unit}. Longest inside diagonal?`)]),
        operation: 'PYTHAGOREAN_3D',
        canonicalAnswer: answer,
        answerSchema: SCHEMA.decimal([unit]),
        ...ways(
          way('TWO_STEPS', 'Floor diagonal, then up', answer, `Floor diagonal² = ${l}² + ${w}² = ${floor2}.`, `d² = ${floor2} + ${h}² = ${diag * diag}, d = ${diag}.`),
          way('ONE_FORMULA', 'd² = l² + w² + h²', answer, `${l * l} + ${w * w} + ${h * h} = ${diag * diag}.`, `d = √${diag * diag} = ${diag} ${unit}.`),
        ),
      });
    }
    const triple = rng.choose(ctx.difficulty === 'EASY' ? TRIPLES.slice(0, 2) : TRIPLES);
    const k = rng.integer(1, ctx.tier({ EASY: 3, MEDIUM: 3, HARD: 4 }));
    const [a, b, c] = triple.map((z) => z * k) as [number, number, number];
    const findLeg = ctx.difficulty !== 'EASY' && rng.bool();
    const value = findLeg ? b : c;
    const answer = A.number(value);
    const base = `${triple[0]}-${triple[1]}-${triple[2]}`;
    return ctx.question({
      prompt: prompt([P.text(findLeg ? `Right triangle: leg ${a} ${unit}, hypotenuse ${c} ${unit}. Other leg?` : `Right triangle: legs ${a} and ${b} ${unit}. Hypotenuse?`)]),
      operation: findLeg ? 'PYTHAGOREAN_LEG' : 'PYTHAGOREAN_HYPOTENUSE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal([unit]),
      ...ways(
        findLeg
          ? way('A2_B2_C2', 'a² + b² = c²', answer, `b² = ${c}² − ${a}² = ${c * c - a * a}.`, `b = √${b * b} = ${b} ${unit}.`)
          : way('A2_B2_C2', 'a² + b² = c²', answer, `c² = ${a}² + ${b}² = ${a * a + b * b}.`, `c = √${c * c} = ${c} ${unit}.`),
        way('KNOWN_TRIPLE', 'Spot a triple', answer, k === 1 ? `This is the ${base} triple.` : `${base} × ${k} = ${a}-${b}-${c}.`, `So the missing side is ${value} ${unit}.`),
      ),
    });
  },
});

const pythagoreanConverse = defineSkill({
  id: 'g8.g.pythagorean-converse',
  grade: '8',
  domain: 'G',
  standards: ['8.G.6'],
  title: 'Is it a right triangle?',
  generate(ctx) {
    const { rng } = ctx;
    const triple = rng.choose(TRIPLES);
    const k = rng.integer(1, 3);
    const right = rng.bool();
    let [a, b, c] = triple.map((z) => z * k) as [number, number, number];
    if (!right) c += rng.choose([-1, 1, 2]);
    const isRight = a * a + b * b === c * c;
    const answer = yesNo(isRight);
    const g = Number(gcd(gcd(BigInt(a), BigInt(b)), BigInt(c)));
    return ctx.question({
      prompt: prompt([P.text(`Sides ${a}, ${b}, ${c}. Right triangle?`)]),
      operation: 'PYTHAGOREAN_CONVERSE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(YES_NO),
      ...ways(
        way('CHECK_SQUARES', 'Check a² + b² = c²', answer, `${a}² + ${b}² = ${a * a + b * b}; ${c}² = ${c * c}.`, isRight ? 'Equal → Yes.' : 'Not equal → No.'),
        way(
          'COMPARE_TO_A_TRIPLE',
          'Compare to a known triple',
          answer,
          g > 1 ? `Divide by ${g}: ${a / g}, ${b / g}, ${c / g}.` : 'Known triples: 3-4-5, 5-12-13, 8-15-17, 7-24-25…',
          isRight ? `${a / g}-${b / g}-${c / g} is a triple → Yes.` : `${a / g}-${b / g}-${c / g} is not a triple → No.`,
        ),
      ),
    });
  },
});

const distancePoints = defineSkill({
  id: 'g8.g.distance-between-points',
  grade: '8',
  domain: 'G',
  standards: ['8.G.8'],
  title: 'Distance between two points',
  generate(ctx) {
    const { rng } = ctx;
    const triple = rng.choose(ctx.difficulty === 'EASY' ? TRIPLES.slice(0, 1) : TRIPLES.slice(0, 3));
    const k = ctx.difficulty === 'HARD' ? rng.integer(1, 2) : 1;
    const [dx0, dy0, d0] = triple.map((z) => z * k) as [number, number, number];
    const swap = rng.bool();
    const dx = (swap ? dy0 : dx0) * (rng.bool() ? 1 : -1);
    const dy = (swap ? dx0 : dy0) * (rng.bool() ? 1 : -1);
    const x1 = rng.integer(-6, 6);
    const y1 = rng.integer(-6, 6);
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const answer = A.number(d0);
    return ctx.question({
      prompt: prompt([P.text('Distance from '), ...pairNodes(x1, y1), P.text(' to '), ...pairNodes(x2, y2)]),
      operation: 'DISTANCE',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal(['units', 'unit']),
      ...ways(
        way('DISTANCE_FORMULA', 'Distance formula', answer, `d² = (${f(x2)} − ${np(x1)})² + (${f(y2)} − ${np(y1)})² = ${dx * dx} + ${dy * dy}.`, `d = √${d0 * d0} = ${d0}.`),
        way('RIGHT_TRIANGLE', 'Draw a right triangle', answer, `Legs: across ${Math.abs(dx)}, up/down ${Math.abs(dy)}.`, `Hypotenuse of ${Math.abs(dx)}-${Math.abs(dy)}-? is ${d0}.`),
      ),
    });
  },
});

const volumeSolids = defineSkill({
  id: 'g8.g.volume-cylinder-cone-sphere',
  grade: '8',
  domain: 'G',
  standards: ['8.G.9'],
  title: 'Volume of cylinders, cones & spheres',
  generate(ctx) {
    const { rng } = ctx;
    const unit = rng.choose(['cm', 'm', 'in', 'ft'] as const);
    const kind = rng.choose(ctx.tier({ EASY: ['cylinder'], MEDIUM: ['cylinder', 'cone'], HARD: ['cone', 'sphere', 'cylinder'] }) as ('cylinder' | 'cone' | 'sphere')[]);
    const pi = '(π ≈ 3.14)';
    const schema = SCHEMA.decimal(cubicUnits(unit));
    if (kind === 'sphere') {
      const r = 3 * rng.integer(1, 3);
      const vol = mul(mul(rat(4, 3), PI_APPROX), rat(r ** 3));
      const cyl = mul(mul(PI_APPROX, rat(r * r)), rat(2 * r));
      const answer = A.number(vol);
      return ctx.question({
        prompt: prompt([P.text(`Sphere, radius ${r} ${unit} ${pi}. Volume?`)]),
        operation: 'SPHERE_VOLUME',
        canonicalAnswer: answer,
        answerSchema: schema,
        answerDisplay: 'decimal',
        ...ways(
          way('FORMULA', 'V = 4/3 πr³', answer, `4/3 × 3.14 × ${r}³ = 4/3 × 3.14 × ${r ** 3}.`, `= ${fdec(vol)} ${unit}³.`),
          way('TWO_THIRDS_OF_A_CYLINDER', '⅔ of a cylinder', answer, `Cylinder r = ${r}, h = ${2 * r}: 3.14 × ${r * r} × ${2 * r} = ${fdec(cyl)}.`, `⅔ × ${fdec(cyl)} = ${fdec(vol)} ${unit}³.`),
        ),
      });
    }
    const [r, h] = ctx.retry(
      () => [rng.integer(1, ctx.tier({ EASY: 6, MEDIUM: 10, HARD: 12 })), rng.integer(2, ctx.tier({ EASY: 10, MEDIUM: 15, HARD: 20 }))] as const,
      ([rr, hh]) => kind !== 'cone' || (rr * rr * hh) % 3 === 0,
    );
    const base = mul(PI_APPROX, rat(r * r));
    const cylinder = mul(base, rat(h));
    const vol = kind === 'cone' ? div(cylinder, rat(3)) : cylinder;
    const answer = A.number(vol);
    return ctx.question({
      prompt: prompt([P.text(`${kind === 'cone' ? 'Cone' : 'Cylinder'}: radius ${r} ${unit}, height ${h} ${unit} ${pi}. Volume?`)]),
      operation: kind === 'cone' ? 'CONE_VOLUME' : 'CYLINDER_VOLUME',
      canonicalAnswer: answer,
      answerSchema: schema,
      answerDisplay: 'decimal',
      ...ways(
        kind === 'cone'
          ? way('FORMULA', 'V = ⅓πr²h', answer, `⅓ × 3.14 × ${r * r} × ${h}.`, `= ${fdec(vol)} ${unit}³.`)
          : way('FORMULA', 'V = πr²h', answer, `3.14 × ${r}² × ${h} = 3.14 × ${r * r} × ${h}.`, `= ${fdec(vol)} ${unit}³.`),
        kind === 'cone'
          ? way('THIRD_OF_A_CYLINDER', '⅓ of a cylinder', answer, `Same-size cylinder: ${fdec(cylinder)}.`, `÷ 3 = ${fdec(vol)} ${unit}³.`)
          : way('BASE_AREA_FIRST', 'Base area × height', answer, `Base: 3.14 × ${r * r} = ${fdec(base)}.`, `${fdec(base)} × ${h} = ${fdec(vol)} ${unit}³.`),
      ),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 8.SP                                                                 */
/* ------------------------------------------------------------------ */

const ASSOCIATION = fixedChoices(['Positive', 'Negative', 'No association']);

const scatterAssociation = defineSkill({
  id: 'g8.sp.scatter-association',
  grade: '8',
  domain: 'SP',
  standards: ['8.SP.1'],
  title: 'Association in bivariate data',
  generate(ctx) {
    const { rng } = ctx;
    const kind = rng.choose(['positive', 'negative', 'none'] as const);
    const xs = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 6).sort((a, b) => a - b);
    const ys: number[] = ctx.retry(
      () => {
        if (kind === 'none') {
          const firstHalf = [rng.integer(5, 30), rng.integer(5, 30), rng.integer(5, 30)];
          return [...firstHalf, ...rng.shuffle(firstHalf)];
        }
        const m = rng.integer(2, 4) * (kind === 'positive' ? 1 : -1);
        const b = kind === 'positive' ? rng.integer(0, 10) : rng.integer(45, 60);
        return xs.map((x) => m * x + b + rng.integer(-1, 1));
      },
      (vs) => {
        if (kind !== 'none') return true;
        // |r| <= 0.3 using exact arithmetic: cov² <= 0.09 · varX · varY
        const n = vs.length;
        const mx = xs.reduce((p, q) => p + q, 0) / n;
        const my = vs.reduce((p, q) => p + q, 0) / n;
        const cov = xs.reduce((s, x, i) => s + (x - mx) * ((vs[i] as number) - my), 0);
        const vx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
        const vy = vs.reduce((s, y) => s + (y - my) ** 2, 0);
        return vy > 0 && cov * cov <= 0.09 * vx * vy;
      },
    );
    const label = kind === 'positive' ? 'Positive' : kind === 'negative' ? 'Negative' : 'No association';
    const answer = A.choice(label.toLowerCase().replace(/\s+/g, '-'));
    const m1 = rat(ys.slice(0, 3).reduce((p, q) => p + q, 0), 3);
    const m2 = rat(ys.slice(3).reduce((p, q) => p + q, 0), 3);
    const ctxt = rng.choose([
      ['Hours studied', 'Score'],
      ['Temperature (°F)', 'Drinks sold'],
      ['Age (years)', 'Height (in)'],
    ] as const);
    return ctx.question({
      prompt: prompt([P.text('What kind of association?')], { v: 'table', headers: [...ctxt], rows: xs.map((x, i) => [String(x), String(ys[i])]) }),
      operation: 'ASSOCIATION',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.choice(ASSOCIATION),
      ...ways(
        way('LOOK_AT_THE_TREND', 'Follow the trend', answer, kind === 'none' ? 'As x grows, y goes up and down with no pattern.' : `As x grows, y tends to ${kind === 'positive' ? 'grow' : 'shrink'}.`, `→ ${label}.`),
        way('COMPARE_HALVES', 'Compare the halves', answer, `Mean y, smaller x: ${nice(m1)}; larger x: ${nice(m2)}.`, `${cmp(m2, m1) > 0 ? 'Higher' : cmp(m2, m1) < 0 ? 'Lower' : 'Same'} → ${label}.`),
      ),
    });
  },
});

const linearModel = defineSkill({
  id: 'g8.sp.linear-model',
  grade: '8',
  domain: 'SP',
  standards: ['8.SP.3'],
  title: 'Use a linear model',
  generate(ctx) {
    const { rng } = ctx;
    const m = ctx.tier({ EASY: rat(rng.integer(2, 9)), MEDIUM: rat(rng.integer(3, 25), 2), HARD: rat(rng.integer(-30, 30), 10) });
    const b = rat(rng.integer(5, 60));
    const x = rng.integer(2, 12);
    const y = add(mul(m, rat(x)), b);
    const ctxt = rng.choose([
      ['hours of sunlight', 'plant height (cm)'],
      ['hours studied', 'test score'],
      ['weeks', 'savings ($)'],
    ] as const);
    const askSlope = ctx.difficulty !== 'EASY' && rng.bool(0.3);
    const value = askSlope ? m : y;
    const answer = A.number(value);
    return ctx.question({
      prompt: prompt([P.text(`Model: y = ${linText(m, b, 'x')} (x = ${ctxt[0]}, y = ${ctxt[1]}).`), P.br(), P.text(askSlope ? 'How much does y change per 1 unit of x?' : `Predict y when x = ${x}.`)]),
      operation: askSlope ? 'MODEL_SLOPE' : 'MODEL_PREDICT',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.decimal(),
      answerDisplay: 'decimal',
      ...ways(
        askSlope
          ? way('READ_THE_SLOPE', 'Read the slope', answer, `In y = mx + b, m = ${nice(m)}.`, `y changes by ${nice(m)} per unit.`)
          : way('SUBSTITUTE', 'Substitute', answer, `y = ${np(m)} × ${x} + ${nice(b)}.`, `= ${nice(mul(m, rat(x)))} + ${nice(b)} = ${nice(y)}.`),
        askSlope
          ? way('COMPARE_TWO_POINTS', 'Compare two x values', answer, `x = 0 → ${nice(b)}; x = 1 → ${nice(add(m, b))}.`, `Change: ${nice(m)}.`)
          : way('START_AND_STEP', 'Start, then step', answer, `Start at ${nice(b)} (x = 0).`, `${x} steps of ${nice(m)}: ${nice(b)} + ${np(mul(m, rat(x)))} = ${nice(y)}.`),
      ),
    });
  },
});

const twoWayTable = defineSkill({
  id: 'g8.sp.two-way-table',
  grade: '8',
  domain: 'SP',
  standards: ['8.SP.4'],
  title: 'Two-way tables',
  generate(ctx) {
    const { rng } = ctx;
    const [a, b, c, d] = [rng.integer(3, 30), rng.integer(3, 30), rng.integer(3, 30), rng.integer(3, 30)];
    const ctxt = rng.choose([
      { row: 'Curfew', col: 'Chores' },
      { row: 'Plays sports', col: 'Plays music' },
      { row: 'Has a pet', col: 'Has a sibling' },
    ]);
    const askRow = rng.bool();
    // P(col = yes | row = yes) or P(row = yes | col = yes)
    const fav = a;
    const total = askRow ? a + b : a + c;
    const p = rat(fav, total);
    const answer = A.number(p);
    const given = askRow ? ctxt.row : ctxt.col;
    const target = askRow ? ctxt.col : ctxt.row;
    const other = askRow ? b : c;
    return ctx.question({
      prompt: prompt([P.text(`Of students with “${given}: Yes”, what fraction have “${target}: Yes”?`)], {
        v: 'table',
        headers: [`${ctxt.row} \\ ${ctxt.col}`, 'Yes', 'No'],
        rows: [
          ['Yes', String(a), String(b)],
          ['No', String(c), String(d)],
        ],
      }),
      operation: 'RELATIVE_FREQUENCY',
      canonicalAnswer: answer,
      answerSchema: SCHEMA.probability(),
      answerDisplay: 'fraction',
      ...ways(
        way('USE_THE_TOTAL', 'Part ÷ total', answer, `${given} Yes total: ${fav} + ${other} = ${total}.`, `${fav}/${total}${gcd(BigInt(fav), BigInt(total)) > 1n ? ` = ${f(p)}` : ''}.`),
        way('COMPLEMENT', 'Use the complement', answer, `${target} No: ${other}/${total}.`, `1 − ${other}/${total} = ${f(p)}.`),
      ),
    });
  },
});

export const GRADE_8_SKILLS: readonly Skill[] = [
  rationalIrrational,
  repeatingToFraction,
  estimateRoots,
  exponentRules,
  roots,
  scientificNotation,
  scientificOperations,
  howManyTimes,
  slope,
  compareRates,
  linearEquations,
  solutionCount,
  systems,
  systemCount,
  functionOrNot,
  linearOrNonlinear,
  rateAndInitialValue,
  compareFunctions,
  increasingDecreasing,
  transformations,
  rigidMotions,
  similarFigures,
  angles,
  pythagorean,
  pythagoreanConverse,
  distancePoints,
  volumeSolids,
  scatterAssociation,
  linearModel,
  twoWayTable,
];
