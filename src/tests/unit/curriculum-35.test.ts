import { describe, expect, it } from 'vitest';
import { canonicalInputString, promptToText } from '../../domain/answer/format';
import type { Question } from '../../domain/question/types';
import { createSeededRandom } from '../../domain/random/random';
import { findSkill, SKILLS_BY_GRADE, STANDARDS_BY_GRADE } from '../../curriculum/registry';
import { standardParent, type GradeLevel } from '../../curriculum/types';
import { addMinutes, numberToWords, roundToPlace, uniqueStrategies } from '../../curriculum/grades/_g35Helpers';
import { gradeSubmission } from '../../validators/answerValidator';

const GRADES: GradeLevel[] = ['3', '4', '5'];

/** Standards intentionally not auto-generated (documented at the top of each grade file). */
const NOT_GENERATED = new Set(['3.MD.4', '3.MD.5', '4.MD.6', '5.MD.3']);

function generate(id: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD', seed: string | number): Question {
  const skill = findSkill(id);
  if (!skill) throw new Error(`missing skill ${id}`);
  return skill.generate(createSeededRandom(`${id}|${seed}`), difficulty);
}

function find(id: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD', predicate: (q: Question) => boolean): Question {
  for (let i = 0; i < 400; i++) {
    const q = generate(id, difficulty, i);
    if (predicate(q)) return q;
  }
  throw new Error(`no ${id} question matched`);
}

describe('grade 3–5 standards catalog', () => {
  it('has one entry per numbered standard', () => {
    expect(STANDARDS_BY_GRADE['3']).toHaveLength(25);
    expect(STANDARDS_BY_GRADE['4']).toHaveLength(28);
    expect(STANDARDS_BY_GRADE['5']).toHaveLength(27);
  });

  it('marks the California additions', () => {
    const ca = GRADES.flatMap((g) => STANDARDS_BY_GRADE[g].filter((s) => s.caAddition).map((s) => s.code));
    expect(ca.sort()).toEqual(['4.G.2', '4.NF.7', '5.OA.2.1']);
  });

  it('every standard is practiced by at least one skill (except documented exclusions)', () => {
    for (const g of GRADES) {
      const covered = new Set(SKILLS_BY_GRADE[g].flatMap((s) => s.standards.map(standardParent)));
      // Per-question standards may narrow to sub-parts; include those too.
      for (const skill of SKILLS_BY_GRADE[g]) {
        for (const d of ['EASY', 'MEDIUM', 'HARD'] as const) {
          for (let i = 0; i < 15; i++) skill.generate(createSeededRandom(`${skill.id}|cov|${d}|${i}`), d).standards.forEach((c) => covered.add(standardParent(c)));
        }
      }
      const missing = STANDARDS_BY_GRADE[g].map((s) => s.code).filter((c) => !covered.has(c) && !NOT_GENERATED.has(c));
      expect(missing, `grade ${g}`).toEqual([]);
    }
  });

  it('has a healthy number of skills per grade', () => {
    for (const g of GRADES) expect(SKILLS_BY_GRADE[g].length).toBeGreaterThanOrEqual(20);
  });
});

describe('grade 3–5 questions are short and offer several strategies', () => {
  it('prompts stay brief and every strategy has a student-facing title', () => {
    for (const g of GRADES) {
      for (const skill of SKILLS_BY_GRADE[g]) {
        for (const d of ['EASY', 'MEDIUM', 'HARD'] as const) {
          for (let i = 0; i < 10; i++) {
            const q = skill.generate(createSeededRandom(`${skill.id}|brief|${d}|${i}`), d);
            const words = promptToText(q.prompt)
              .replace(/\[[^\]]*\]/g, '')
              .split(/\s+/)
              .filter((w) => /[a-z]/i.test(w));
            expect(words.length, `${skill.id}: ${promptToText(q.prompt)}`).toBeLessThanOrEqual(22);
            const trees = [q.solution, ...q.alternativeSolutions];
            expect(trees.length).toBeGreaterThanOrEqual(2);
            for (const t of trees) expect(t.title, `${skill.id} ${t.strategy}`).toBeTruthy();
          }
        }
      }
    }
  });
});

describe('specific grading behaviour', () => {
  it('5.OA.2.1 prime factorization: composite factors are a form hint, not a wrong answer', () => {
    const q = find('g5.oa.prime-factorization', 'MEDIUM', (x) => x.canonicalAnswer.type === 'NUMBER' && Number(x.canonicalAnswer.value.numerator) % 4 === 0);
    const n = Number((q.canonicalAnswer as { value: { numerator: bigint } }).value.numerator);
    expect(gradeSubmission(canonicalInputString(q), q).status).toBe('CORRECT');
    const composite = gradeSubmission(`4 x ${n / 4}`, q);
    expect(composite.status).toBe('INVALID_INPUT');
    expect(composite.formMismatch).toBe(true);
    expect(gradeSubmission(`2 x ${n}`, q).status).toBe('INCORRECT');
  });

  it('5.NF.1 asks for simplest form: an equal but unsimplified answer is a form hint', () => {
    const q = find('g5.nf.add-sub-unlike', 'EASY', (x) => x.canonicalAnswer.type === 'NUMBER' && x.canonicalAnswer.value.denominator > 1n && x.canonicalAnswer.value.numerator < x.canonicalAnswer.value.denominator);
    const v = (q.canonicalAnswer as { value: { numerator: bigint; denominator: bigint } }).value;
    const r = gradeSubmission(`${v.numerator * 2n}/${v.denominator * 2n}`, q);
    expect(r.status).toBe('INVALID_INPUT');
    expect(r.formMismatch).toBe(true);
    expect(gradeSubmission(`${v.numerator}/${v.denominator}`, q).status).toBe('CORRECT');
  });

  it('4.NBT.6 division with remainders is graded on quotient AND remainder', () => {
    const q = generate('g4.nbt.divide-with-remainders', 'MEDIUM', 'qr');
    expect(q.canonicalAnswer.type).toBe('QR');
    const qr = q.canonicalAnswer as { quotient: bigint; remainder: bigint };
    expect(qr.remainder > 0n).toBe(true);
    expect(gradeSubmission(`${qr.quotient} R ${qr.remainder}`, q).status).toBe('CORRECT');
    expect(gradeSubmission(`${qr.quotient}r${qr.remainder}`, q).status).toBe('CORRECT');
    expect(gradeSubmission(`${qr.quotient}`, q).status).toBe('INCORRECT');
  });

  it('3.NF.3d compare shows fractions exactly as generated (never reduced)', () => {
    for (let i = 0; i < 60; i++) {
      const q = generate('g3.nf.compare-fractions', 'MEDIUM', i);
      const fracs = q.prompt.nodes.filter((n) => n.t === 'rawfrac') as { numerator: bigint; denominator: bigint }[];
      expect(fracs).toHaveLength(2);
      const [a, b] = fracs as [{ numerator: bigint; denominator: bigint }, { numerator: bigint; denominator: bigint }];
      expect(a.numerator === b.numerator || a.denominator === b.denominator).toBe(true);
    }
  });

  it('decimal answers accept trailing zeros (value, not text)', () => {
    const q = find('g5.nbt.round-decimals', 'EASY', (x) => x.canonicalAnswer.type === 'NUMBER' && x.canonicalAnswer.value.denominator === 10n);
    const text = canonicalInputString(q);
    expect(gradeSubmission(`${text}0`, q).status).toBe('CORRECT');
  });

  it('time answers ignore a.m./p.m. when not required', () => {
    const q = generate('g3.md.tell-time', 'MEDIUM', 't');
    const t = q.canonicalAnswer as { hour: number; minute: number };
    expect(gradeSubmission(`${t.hour}:${String(t.minute).padStart(2, '0')}`, q).status).toBe('CORRECT');
    expect(gradeSubmission(`${t.hour}:${String(t.minute).padStart(2, '0')} pm`, q).status).toBe('CORRECT');
  });
});

describe('grade 3–5 helpers', () => {
  it('roundToPlace rounds half up', () => {
    expect(roundToPlace(345, 10)).toBe(350);
    expect(roundToPlace(344, 10)).toBe(340);
    expect(roundToPlace(950, 100)).toBe(1000);
    expect(roundToPlace(870484, 10000)).toBe(870000);
  });
  it('numberToWords', () => {
    expect(numberToWords(43025)).toBe('forty-three thousand, twenty-five');
    expect(numberToWords(80875)).toBe('eighty thousand, eight hundred seventy-five');
    expect(numberToWords(7)).toBe('seven');
  });
  it('addMinutes wraps around 12', () => {
    expect(addMinutes(11, 50, 25)).toEqual({ hour: 12, minute: 15 });
    expect(addMinutes(12, 50, 20)).toEqual({ hour: 1, minute: 10 });
    expect(addMinutes(3, 21, 60)).toEqual({ hour: 4, minute: 21 });
  });
  it('uniqueStrategies renames repeated ids', () => {
    const t = { strategy: 'X', steps: [], result: { type: 'CHOICE', id: 'a' } } as const;
    expect(uniqueStrategies([t, t, t]).map((x) => x.strategy)).toEqual(['X', 'X_2', 'X_3']);
  });
});
