/**
 * Focused tests for Kindergarten–Grade 2 skills: helper math, answer/visual consistency, CA additions,
 * the "few words" house style, and multiple strategies.
 */
import { describe, expect, it } from 'vitest';
import { GRADE_1_SKILLS } from '../../curriculum/grades/grade1';
import { GRADE_2_SKILLS } from '../../curriculum/grades/grade2';
import { GRADE_K_SKILLS } from '../../curriculum/grades/gradeK';
import { addHours, additionSubtractionStory, numberToWords, type StoryKind } from '../../curriculum/grades/_k2Helpers';
import { GRADE_1_STANDARDS } from '../../curriculum/standards/grade1';
import { GRADE_2_STANDARDS } from '../../curriculum/standards/grade2';
import { GRADE_K_STANDARDS } from '../../curriculum/standards/gradeK';
import type { SkillContext } from '../../curriculum/skill';
import type { Skill } from '../../curriculum/types';
import { nodesToText } from '../../domain/answer/format';
import type { Difficulty, Question } from '../../domain/question/types';
import { createSeededRandom } from '../../domain/random/random';
import { toNumber } from '../../domain/rational/rational';
import { gradeSubmission } from '../../validators/answerValidator';

const ALL_K2: readonly Skill[] = [...GRADE_K_SKILLS, ...GRADE_1_SKILLS, ...GRADE_2_SKILLS];
const DIFFS: readonly Exclude<Difficulty, 'CUSTOM'>[] = ['EASY', 'MEDIUM', 'HARD'];

function skill(id: string): Skill {
  const s = ALL_K2.find((x) => x.id === id);
  if (!s) throw new Error(`no skill ${id}`);
  return s;
}

function samples(id: string, difficulty: Exclude<Difficulty, 'CUSTOM'>, n = 60): Question[] {
  return Array.from({ length: n }, (_, i) => skill(id).generate(createSeededRandom(`${id}|${difficulty}|t${i}`), difficulty));
}

function numericAnswer(q: Question): number {
  if (q.canonicalAnswer.type !== 'NUMBER') throw new Error('not numeric');
  return toNumber(q.canonicalAnswer.value);
}

const EMOJI = /\p{Extended_Pictographic}/u;

describe('K–2 catalog', () => {
  it('has every numbered standard for K, 1 and 2', () => {
    expect(GRADE_K_STANDARDS).toHaveLength(22);
    expect(GRADE_1_STANDARDS).toHaveLength(21);
    expect(GRADE_2_STANDARDS).toHaveLength(27);
  });
  it('flags the California additions', () => {
    const ca = GRADE_2_STANDARDS.filter((s) => s.caAddition).map((s) => s.code);
    expect(ca.sort()).toEqual(['2.MD.7', '2.NBT.2', '2.NBT.7.1']);
    expect([...GRADE_K_STANDARDS, ...GRADE_1_STANDARDS].some((s) => s.caAddition)).toBe(false);
  });
  it('has 12+ skills per grade', () => {
    expect(GRADE_K_SKILLS.length).toBeGreaterThanOrEqual(12);
    expect(GRADE_1_SKILLS.length).toBeGreaterThanOrEqual(12);
    expect(GRADE_2_SKILLS.length).toBeGreaterThanOrEqual(12);
  });
});

describe('helpers', () => {
  it('numberToWords', () => {
    expect(numberToWords(0)).toBe('zero');
    expect(numberToWords(13)).toBe('thirteen');
    expect(numberToWords(45)).toBe('forty-five');
    expect(numberToWords(90)).toBe('ninety');
    expect(numberToWords(412)).toBe('four hundred twelve');
    expect(numberToWords(700)).toBe('seven hundred');
    expect(numberToWords(999)).toBe('nine hundred ninety-nine');
    expect(() => numberToWords(1000)).toThrow();
  });
  it('addHours wraps around the clock face', () => {
    expect(addHours(12, 1)).toBe(1);
    expect(addHours(11, 1)).toBe(12);
    expect(addHours(1, -1)).toBe(12);
    expect(addHours(5, 3)).toBe(8);
  });
  it('story problems: the computation always gives the answer, all numbers stay in range', () => {
    const kinds: StoryKind[] = ['ADD_TO_RESULT', 'TAKE_FROM_RESULT', 'PUT_TOGETHER_TOTAL', 'ADD_TO_CHANGE', 'TAKE_FROM_CHANGE', 'COMPARE_DIFFERENCE', 'ADD_TO_START', 'COMPARE_BIGGER'];
    for (let i = 0; i < 200; i++) {
      const ctx = {
        rng: createSeededRandom(`story-ctx${i}`),
        difficulty: 'MEDIUM' as const,
        tier: <T,>(v: { EASY: T; MEDIUM: T; HARD: T }) => v.MEDIUM,
        retry: <T,>(c: (a: number) => T) => c(0),
        question: () => {
          throw new Error('unused');
        },
      } as unknown as SkillContext;
      const story = additionSubtractionStory(ctx, kinds, 20);
      const { op, a, b } = story.compute;
      expect(op === 'ADD' ? a + b : a - b).toBe(story.answer);
      expect(story.answer).toBeGreaterThanOrEqual(1);
      expect(story.answer).toBeLessThanOrEqual(20);
      expect(story.text).not.toMatch(EMOJI);
    }
  });
});

describe('K–2 house style: few words, ≥ 2 strategies, PDF-safe text', () => {
  for (const s of ALL_K2) {
    it(s.id, () => {
      for (const d of DIFFS) {
        for (const q of samples(s.id, d, 25)) {
          const text = nodesToText(q.prompt.nodes);
          const words = text.split(/\s+/).filter(Boolean).length;
          expect(words, text).toBeLessThanOrEqual(13);
          expect(text, 'emoji belongs only in visuals').not.toMatch(EMOJI);
          const trees = [q.solution, ...q.alternativeSolutions];
          expect(trees.length).toBeGreaterThanOrEqual(2);
          for (const t of trees) {
            expect(t.title, `${s.id} strategy ${t.strategy} needs a title`).toBeTruthy();
            expect(t.steps.length).toBeGreaterThanOrEqual(1);
            expect(t.steps.length).toBeLessThanOrEqual(8);
            for (const st of t.steps) expect(nodesToText(st.content)).not.toMatch(EMOJI);
          }
          for (const c of q.answerSchema.choices ?? []) {
            expect(c.label).not.toMatch(EMOJI);
            expect(c.label.split(/\s+/).length).toBeLessThanOrEqual(4);
          }
        }
      }
    });
  }
});

describe('answers match what the picture shows', () => {
  it('count objects: answer = number of objects', () => {
    for (const d of DIFFS) {
      for (const q of samples('gk.cc.count-objects', d)) {
        const v = q.prompt.visual;
        expect(v?.v).toBe('objects');
        if (v?.v === 'objects') expect(numericAnswer(q)).toBe(v.groups[0]?.count);
      }
    }
  });
  it('count objects: difficulty changes the numbers (K.CC.5 up to 20)', () => {
    expect(Math.max(...samples('gk.cc.count-objects', 'EASY').map(numericAnswer))).toBeLessThanOrEqual(5);
    expect(Math.min(...samples('gk.cc.count-objects', 'HARD').map(numericAnswer))).toBeGreaterThanOrEqual(11);
    expect(Math.max(...samples('gk.cc.count-objects', 'HARD').map(numericAnswer))).toBeLessThanOrEqual(20);
  });
  it('coins: answer = value of the coins shown', () => {
    const value = { penny: 1, nickel: 5, dime: 10, quarter: 25, dollar: 100 } as const;
    for (const d of DIFFS) {
      for (const q of samples('g2.md.money', d)) {
        const v = q.prompt.visual;
        if (v?.v !== 'coins') continue;
        const cents = v.coins.reduce((s, c) => s + value[c], 0);
        const answer = numericAnswer(q);
        expect(d === 'HARD' ? Math.round(answer * 100) : answer).toBe(cents);
      }
    }
  });
  it('arrays: answer = rows × columns', () => {
    for (const q of samples('g2.oa.arrays', 'MEDIUM')) {
      const v = q.prompt.visual;
      if (v?.v === 'array') expect(numericAnswer(q)).toBe(v.rows * v.columns);
    }
  });
  it('number line: answer is the labeled point', () => {
    for (const d of ['EASY', 'MEDIUM'] as const) {
      for (const q of samples('g2.md.number-line', d)) {
        const v = q.prompt.visual;
        if (v?.v === 'numberLine') expect(numericAnswer(q)).toBe(toNumber(v.points[0]!.at));
      }
    }
  });
  it('clock: answer = the time the clock shows', () => {
    for (const id of ['g1.md.tell-time', 'g2.md.tell-time']) {
      for (const q of samples(id, 'MEDIUM')) {
        const v = q.prompt.visual;
        if (v?.v === 'clock' && q.canonicalAnswer.type === 'TIME') {
          expect(q.canonicalAnswer.hour).toBe(v.hour);
          expect(q.canonicalAnswer.minute).toBe(v.minute);
        }
      }
    }
    for (const q of samples('g2.md.tell-time', 'MEDIUM')) {
      if (q.canonicalAnswer.type === 'TIME') expect(q.canonicalAnswer.minute % 5).toBe(0);
    }
  });
  it('odd/even matches the number', () => {
    for (const q of samples('g2.oa.odd-even', 'MEDIUM')) {
      const n = Number(nodesToText(q.prompt.nodes).match(/\d+/)?.[0]);
      if (q.canonicalAnswer.type === 'CHOICE') expect(q.canonicalAnswer.id).toBe(n % 2 ? 'odd' : 'even');
    }
  });
});

describe('grading behavior for K–2 answer formats', () => {
  it('a.m./p.m. is required when the question asks for it (2.MD.7)', () => {
    const q = samples('g2.md.tell-time', 'HARD').find((x) => x.canonicalAnswer.type === 'TIME' && x.canonicalAnswer.period);
    expect(q).toBeDefined();
    if (!q || q.canonicalAnswer.type !== 'TIME' || !q.canonicalAnswer.period) return;
    const { hour, minute, period } = q.canonicalAnswer;
    const t = `${hour}:${String(minute).padStart(2, '0')}`;
    expect(gradeSubmission(t, q).status).toBe('INVALID_INPUT');
    expect(gradeSubmission(`${t} ${period}`, q).status).toBe('CORRECT');
    expect(gradeSubmission(`${t} ${period === 'AM' ? 'PM' : 'AM'}`, q).status).toBe('INCORRECT');
  });
  it('cents accept a ¢ sign; dollars accept a $ sign', () => {
    const cents = samples('g2.md.money', 'MEDIUM')[0] as Question;
    expect(gradeSubmission(`${numericAnswer(cents)}¢`, cents).status).toBe('CORRECT');
    const dollars = samples('g2.md.money', 'HARD').find((q) => q.answerDisplay === 'money') as Question;
    expect(gradeSubmission(`$${numericAnswer(dollars).toFixed(2)}`, dollars).status).toBe('CORRECT');
  });
  it('length answers accept units', () => {
    const q = samples('g2.md.how-much-longer', 'EASY')[0] as Question;
    const unit = q.answerSchema.units?.[1] ?? '';
    expect(gradeSubmission(`${numericAnswer(q)} ${unit}`, q).status).toBe('CORRECT');
  });
  it('words are not numbers: "twelve-ish" is invalid input, not a wrong answer', () => {
    const q = samples('g1.oa.add-sub-20', 'EASY')[0] as Question;
    expect(gradeSubmission('twelve-ish', q).status).toBe('INVALID_INPUT');
  });
});

describe('California additions are practiced', () => {
  it('2.NBT.2 includes skip-counting by 2s', () => {
    const texts = samples('g2.nbt.skip-count', 'EASY', 120).map((q) => nodesToText(q.prompt.nodes));
    expect(texts.some((t) => t.startsWith('Skip count by 2s'))).toBe(true);
  });
  it('2.NBT.7.1 estimates use rounding to the nearest ten/hundred, never halfway digits', () => {
    for (const d of DIFFS) {
      for (const q of samples('g2.nbt.estimate', d)) {
        const [a, b] = (nodesToText(q.prompt.nodes).match(/\d+/g) ?? []).slice(-2).map(Number) as [number, number];
        const unit = d === 'HARD' ? 100 : 10;
        expect(Math.floor((a % unit) / (unit / 10))).not.toBe(5);
        expect(Math.floor((b % unit) / (unit / 10))).not.toBe(5);
        const est = d === 'MEDIUM' ? Math.round(a / unit) * unit - Math.round(b / unit) * unit : Math.round(a / unit) * unit + Math.round(b / unit) * unit;
        const correct = q.answerSchema.choices?.find((c) => q.canonicalAnswer.type === 'CHOICE' && c.id === q.canonicalAnswer.id);
        expect(Number(correct?.label)).toBe(est);
      }
    }
  });
  it('2.MD.7 time relationships', () => {
    const answers = new Set(samples('g2.md.time-facts', 'EASY', 100).map(numericAnswer));
    for (const fact of [60, 7, 24, 12]) expect(answers.has(fact)).toBe(true);
  });
});
