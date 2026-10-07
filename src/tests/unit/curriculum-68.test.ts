/**
 * Focused tests for grade 6–8 skills: catalog completeness, coverage of standards, independent re-computation of
 * answers from the rendered prompt, form policies, multiple strategies, and the "few words" rule.
 */
import { describe, expect, it } from 'vitest';
import { canonicalInputString, nodesToText, promptToText } from '../../domain/answer/format';
import type { Question } from '../../domain/question/types';
import { createSeededRandom } from '../../domain/random/random';
import { rat } from '../../domain/rational/rational';
import { GRADE_6_SKILLS } from '../../curriculum/grades/grade6';
import { GRADE_7_SKILLS } from '../../curriculum/grades/grade7';
import { GRADE_8_SKILLS } from '../../curriculum/grades/grade8';
import { GRADE_6_STANDARDS } from '../../curriculum/standards/grade6';
import { GRADE_7_STANDARDS } from '../../curriculum/standards/grade7';
import { GRADE_8_STANDARDS } from '../../curriculum/standards/grade8';
import { standardParent, type Skill } from '../../curriculum/types';
import { gradeSubmission } from '../../validators/answerValidator';

const ALL_68 = [...GRADE_6_SKILLS, ...GRADE_7_SKILLS, ...GRADE_8_SKILLS];
const DIFFS = ['EASY', 'MEDIUM', 'HARD'] as const;

function skill(id: string): Skill {
  const s = ALL_68.find((k) => k.id === id);
  if (!s) throw new Error(`no skill ${id}`);
  return s;
}

function samples(id: string, n = 60): Question[] {
  const out: Question[] = [];
  for (const d of DIFFS) for (let i = 0; i < n; i++) out.push(skill(id).generate(createSeededRandom(`${id}|t|${d}|${i}`), d));
  return out;
}

/** Plain ASCII text of the prompt, e.g. "8792 / 49 = ?" */
const text = (q: Question) => promptToText(q.prompt, { ascii: true, group: false });

const num = (s: string) => Number(s.replace(/,/g, ''));

describe('grade 6–8 standards catalogs', () => {
  it('include every numbered standard', () => {
    const codes = (list: readonly { code: string }[]) => list.map((s) => s.code);
    const expected6 = [
      ...[1, 2, 3].map((n) => `6.RP.${n}`),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `6.NS.${n}`),
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `6.EE.${n}`),
      ...[1, 2, 3, 4].map((n) => `6.G.${n}`),
      ...[1, 2, 3, 4, 5].map((n) => `6.SP.${n}`),
    ];
    const expected7 = [
      ...[1, 2, 3].map((n) => `7.RP.${n}`),
      ...[1, 2, 3].map((n) => `7.NS.${n}`),
      ...[1, 2, 3, 4].map((n) => `7.EE.${n}`),
      ...[1, 2, 3, 4, 5, 6].map((n) => `7.G.${n}`),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `7.SP.${n}`),
    ];
    const expected8 = [
      ...[1, 2].map((n) => `8.NS.${n}`),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `8.EE.${n}`),
      ...[1, 2, 3, 4, 5].map((n) => `8.F.${n}`),
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `8.G.${n}`),
      ...[1, 2, 3, 4].map((n) => `8.SP.${n}`),
    ];
    expect(codes(GRADE_6_STANDARDS)).toEqual(expected6);
    expect(codes(GRADE_7_STANDARDS)).toEqual(expected7);
    expect(codes(GRADE_8_STANDARDS)).toEqual(expected8);
  });

  it('every standard is practiced by a skill except the documented ones', () => {
    const documentedGaps = new Set(['6.NS.5', '6.EE.6', '6.EE.8', '6.SP.2', '6.SP.4', '8.SP.2']);
    const covered = new Set(ALL_68.flatMap((s) => s.standards.map(standardParent)));
    const all = [...GRADE_6_STANDARDS, ...GRADE_7_STANDARDS, ...GRADE_8_STANDARDS].map((s) => s.code);
    const missing = all.filter((c) => !covered.has(c));
    expect(missing.sort()).toEqual([...documentedGaps].sort());
  });
});

describe('answers re-computed independently from the prompt', () => {
  it('long division: dividend = divisor × q + r', () => {
    for (const q of samples('g6.ns.long-division')) {
      const m = /^([\d,]+) \/ (\d+) = \?$/.exec(text(q));
      expect(m, text(q)).not.toBeNull();
      const [dividend, divisor] = [num(m![1] as string), num(m![2] as string)];
      const expected = Math.floor(dividend / divisor);
      const remainder = dividend % divisor;
      expect(canonicalInputString(q)).toBe(remainder ? `${expected} R ${remainder}` : String(expected));
    }
  });

  it('percent of a number', () => {
    for (const q of samples('g6.rp.percent-of')) {
      const m = /^(\d+)% of (\d+) = \?$/.exec(text(q));
      expect(m, text(q)).not.toBeNull();
      expect(q.canonicalAnswer).toEqual({ type: 'NUMBER', value: rat(num(m![1] as string) * num(m![2] as string), 100) });
    }
  });

  it('Pythagorean hypotenuse satisfies a² + b² = c²', () => {
    for (const q of samples('g8.g.pythagorean')) {
      const t = text(q);
      const legs = /legs (\d+) and (\d+)/.exec(t);
      if (!legs) continue;
      const [a, b] = [num(legs[1] as string), num(legs[2] as string)];
      const c = num(canonicalInputString(q));
      expect(a * a + b * b, t).toBe(c * c);
    }
  });

  it('circle circumference uses π = 3.14', () => {
    for (const q of samples('g7.g.circles')) {
      const t = text(q);
      const m = /diameter (\d+) \w+ \(pi ≈ 3\.14\)\. Circumference\?/.exec(t.replace('π', 'pi'));
      if (!m) continue;
      expect(num(canonicalInputString(q))).toBeCloseTo(3.14 * num(m[1] as string), 9);
    }
  });

  it('repeating decimals: block / 99…9', () => {
    for (const q of samples('g8.ns.repeating-to-fraction').filter((x) => x.difficulty !== 'HARD')) {
      const m = /0\.(\d+)…/.exec(text(q));
      const digits = m![1] as string;
      const block = q.difficulty === 'EASY' ? digits.slice(0, 1) : digits.slice(0, 2);
      const nines = q.difficulty === 'EASY' ? 9 : 99;
      expect(q.canonicalAnswer).toEqual({ type: 'NUMBER', value: rat(num(block), nines) });
    }
  });

  it('systems: the answer satisfies both equations shown', () => {
    for (const q of samples('g8.ee.systems')) {
      const lines = text(q).split('\n').slice(1);
      expect(lines.length).toBe(2);
      const [x, y] = canonicalInputString(q).replace(/[()]/g, '').split(',').map((s) => Number(s.trim())) as [number, number];
      for (const line of lines) {
        const [lhs, rhs] = line.replace(/\s+/g, '').replace(/−/g, '-').split('=') as [string, string];
        let total = 0;
        for (const term of lhs.replace(/-/g, '+-').split('+').filter(Boolean)) {
          const m = /^(-?\d*)([xy])$/.exec(term);
          expect(m, line).not.toBeNull();
          const coef = m![1] === '' ? 1 : m![1] === '-' ? -1 : Number(m![1]);
          total += coef * (m![2] === 'x' ? x : y);
        }
        expect(total, line).toBe(Number(rhs));
      }
    }
  });
});

describe('form policies', () => {
  it('fraction division requires simplest form (equal but unsimplified → hint, not wrong)', () => {
    const q = samples('g6.ns.divide-fractions').find((x) => x.validationPolicy.requireLowestTerms && x.canonicalAnswer.type === 'NUMBER' && x.canonicalAnswer.value.denominator > 1n);
    expect(q).toBeDefined();
    const v = (q!.canonicalAnswer as { value: { numerator: bigint; denominator: bigint } }).value;
    const unsimplified = `${v.numerator * 2n}/${v.denominator * 2n}`;
    const r = gradeSubmission(unsimplified, q!);
    expect(r.status).toBe('INVALID_INPUT');
    expect(r.formMismatch).toBe(true);
  });

  it('scientific notation must be normalized', () => {
    const q = samples('g8.ee.scientific-notation').find((x) => x.operation === 'TO_SCIENTIFIC');
    expect(q).toBeDefined();
    const typed = canonicalInputString(q!); // e.g. 4.5 x 10^4
    const m = /^(-?[\d.]+) x 10\^(-?\d+)$/.exec(typed);
    expect(m).not.toBeNull();
    const coef = Number(m![1]) * 10;
    const exp = Number(m![2]) - 1;
    expect(gradeSubmission(`${coef} x 10^${exp}`, q!).status).toBe('INVALID_INPUT');
    expect(gradeSubmission(typed, q!).status).toBe('CORRECT');
  });

  it('ratios accept equivalent forms', () => {
    const q = samples('g6.rp.ratio-language')[0] as Question;
    const [a, b] = canonicalInputString(q).split(':').map(Number) as [number, number];
    expect(gradeSubmission(`${3 * a}:${3 * b}`, q).status).toBe('CORRECT');
    expect(gradeSubmission(`${a} to ${b}`, q).status).toBe('CORRECT');
  });

  it('percent answers accept "25" and "25%"', () => {
    const q = samples('g6.rp.percent-whole').find((x) => x.answerSchema.percentContext);
    expect(q).toBeDefined();
    const typed = canonicalInputString(q!);
    expect(gradeSubmission(typed.replace('%', ''), q!).status).toBe('CORRECT');
    expect(gradeSubmission(typed, q!).status).toBe('CORRECT');
  });

  it('linear expressions must have like terms combined', () => {
    const q = samples('g6.ee.equivalent-expressions').find((x) => x.canonicalAnswer.type === 'LINEAR' && x.canonicalAnswer.coefficient.numerator > 1n);
    expect(q).toBeDefined();
    const ans = q!.canonicalAnswer as { variable: string; coefficient: { numerator: bigint }; constant: { numerator: bigint; denominator: bigint } };
    const c = ans.coefficient.numerator;
    const k = ans.constant.numerator;
    const split = `${c - 1n}${ans.variable} + 1${ans.variable}${k === 0n ? '' : k > 0n ? ` + ${k}` : ` - ${-k}`}`;
    const r = gradeSubmission(split, q!);
    expect(r.status).toBe('INVALID_INPUT');
    expect(r.formMismatch).toBe(true);
  });
});

describe('every grade 6–8 question offers several strategies and stays short', () => {
  /** Count real words only (tokens with letters) — numbers and symbols don't add reading load. */
  const wordCount = (s: string) => s.split(/\s+/).filter((w) => /[a-z]{2,}/i.test(w)).length;
  it('≥ 2 titled strategies with unique ids', () => {
    for (const s of ALL_68) {
      for (const q of [s.generate(createSeededRandom(`${s.id}|w`), 'MEDIUM'), s.generate(createSeededRandom(`${s.id}|w`), 'HARD')]) {
        const trees = [q.solution, ...q.alternativeSolutions];
        expect(trees.length, s.id).toBeGreaterThanOrEqual(2);
        expect(new Set(trees.map((t) => t.strategy)).size, s.id).toBe(trees.length);
        for (const t of trees) expect(t.title, `${s.id} ${t.strategy}`).toBeTruthy();
      }
    }
  });
  it('prompts are short (≤ 25 words) and local steps ≤ 14 words', () => {
    for (const s of ALL_68) {
      for (const d of DIFFS) {
        for (let i = 0; i < 10; i++) {
          const q = s.generate(createSeededRandom(`${s.id}|words|${d}|${i}`), d);
          const words = wordCount(nodesToText(q.prompt.nodes));
          expect(words, `${s.id}: ${nodesToText(q.prompt.nodes)}`).toBeLessThanOrEqual(25);
          for (const t of [q.solution, ...q.alternativeSolutions]) {
            // shared builders (long division, fraction & decimal strategies) are checked by their owner
            if (['LONG_DIVISION', 'PARTIAL_QUOTIENTS', 'THINK_MULTIPLICATION', 'SKIP_COUNT_DIVIDE', 'KEEP_CHANGE_FLIP', 'MULTIPLY_BY_RECIPROCAL', 'COMMON_DENOMINATOR_DIVIDE', 'LINE_UP_DECIMALS', 'THINK_IN_UNITS', 'COUNT_DECIMAL_PLACES', 'USE_FRACTIONS', 'MAKE_DIVISOR_WHOLE', 'CHECK_WITH_MULTIPLICATION'].includes(t.strategy)) continue;
            for (const st of t.steps) {
              const stepText = nodesToText(st.content);
              expect(wordCount(stepText), `${s.id} ${t.strategy}: ${stepText}`).toBeLessThanOrEqual(14);
            }
          }
        }
      }
    }
  });
});
