/**
 * Every grade-level skill, at every difficulty, over many seeds, must produce a valid, self-consistent question:
 *   - frozen, renderable, with solution steps whose result equals the canonical answer
 *   - typing the canonical answer is graded CORRECT
 *   - tagged with real CA CCSSM codes for the skill's grade
 *   - reproducible from its seed
 */
import { describe, expect, it } from 'vitest';
import { canonicalInputString, promptToText } from '../../domain/answer/format';
import { createSeededRandom } from '../../domain/random/random';
import { ALL_SKILLS, ALL_STANDARDS, findStandard, STANDARDS_BY_GRADE } from '../../curriculum/registry';
import { GRADE_DOMAINS, GRADES, isStandardCode } from '../../curriculum/types';
import { validateQuestion } from '../../validators/questionValidator';

const SEEDS = Number(process.env.SKILL_SEEDS ?? 30);
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

describe('standards catalog', () => {
  it('codes are valid, unique and match their grade/domain', () => {
    const seen = new Set<string>();
    for (const s of ALL_STANDARDS) {
      expect(isStandardCode(s.code), s.code).toBe(true);
      expect(seen.has(s.code), `duplicate ${s.code}`).toBe(false);
      seen.add(s.code);
      expect(s.code.startsWith(`${s.grade}.${s.domain}.`), s.code).toBe(true);
      expect(GRADE_DOMAINS[s.grade]).toContain(s.domain);
      expect(s.text.length, s.code).toBeGreaterThan(10);
    }
  });
});

describe('grade-level skills', () => {
  it('skill ids are unique', () => {
    const ids = ALL_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const skill of ALL_SKILLS) {
    describe(`${skill.id} (${skill.standards.join(', ')})`, () => {
      it('has valid metadata', () => {
        expect(GRADES).toContain(skill.grade);
        expect(GRADE_DOMAINS[skill.grade]).toContain(skill.domain);
        expect(skill.standards.length).toBeGreaterThan(0);
        for (const code of skill.standards) {
          expect(isStandardCode(code), code).toBe(true);
          expect(code.startsWith(`${skill.grade}.`), code).toBe(true);
          if (STANDARDS_BY_GRADE[skill.grade].length > 0) expect(findStandard(code), `missing catalog entry for ${code}`).toBeDefined();
        }
      });

      it('generates valid, self-consistent questions at every difficulty', () => {
        for (const difficulty of DIFFICULTIES) {
          for (let i = 0; i < SEEDS; i++) {
            const seed = `${skill.id}|${difficulty}|${i}`;
            const q = skill.generate(createSeededRandom(seed), difficulty);
            const issues = validateQuestion(q);
            expect(issues, `${seed}: ${promptToText(q.prompt)}`).toEqual([]);
            expect(q.topic).toBe('GRADE_LEVEL');
            expect(q.standards.length).toBeGreaterThan(0);
            for (const code of q.standards) expect(code.startsWith(`${skill.grade}.`)).toBe(true);
          }
        }
      });

      it('is reproducible from its seed', () => {
        const a = skill.generate(createSeededRandom(`${skill.id}|repro`), 'MEDIUM');
        const b = skill.generate(createSeededRandom(`${skill.id}|repro`), 'MEDIUM');
        expect(promptToText(a.prompt)).toBe(promptToText(b.prompt));
        expect(canonicalInputString(a)).toBe(canonicalInputString(b));
        expect(a.id).toBe(b.id);
      });
    });
  }
});
