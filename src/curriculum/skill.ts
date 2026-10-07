/**
 * defineSkill — the contract every grade-level skill implements (spec §080 generator contract, specialised).
 */
import { buildQuestion, withRetries, type QuestionInput } from '../domain/question/build';
import type { Difficulty, Question } from '../domain/question/types';
import type { RandomSource } from '../domain/random/random';
import type { DomainCode, GradeLevel, Skill } from './types';

export type Tiered<T> = { EASY: T; MEDIUM: T; HARD: T };

export interface SkillContext {
  readonly rng: RandomSource;
  /** EASY | MEDIUM | HARD (CUSTOM is treated as MEDIUM for grade-level skills). */
  readonly difficulty: Exclude<Difficulty, 'CUSTOM'>;
  /** Pick a value by difficulty. */
  tier<T>(values: Tiered<T>): T;
  /** Bounded retry (never `while (true)`); throws QuestionGenerationError after the limit. */
  retry<T>(candidate: (attempt: number) => T, accept: (value: T) => boolean, maxAttempts?: number): T;
  /** Build the frozen Question; topic/difficulty/generator/standards are filled in automatically. */
  question(input: SkillQuestionInput): Question;
}

export type SkillQuestionInput = Omit<QuestionInput, 'topic' | 'difficulty' | 'generatorId' | 'generatorVersion' | 'standards' | 'subtype' | 'retryCount'> & {
  subtype?: string;
  /** Override the skill's standards for this particular question (e.g. one sub-part). */
  standards?: string[];
};

export interface SkillDefinition {
  id: string;
  grade: GradeLevel;
  domain: DomainCode;
  standards: string[];
  title: string;
  version?: string;
  generate(ctx: SkillContext): Question;
}

export function defineSkill(def: SkillDefinition): Skill {
  const version = def.version ?? '1';
  return Object.freeze({
    id: def.id,
    grade: def.grade,
    domain: def.domain,
    standards: Object.freeze(def.standards.slice()),
    title: def.title,
    version,
    generate(rng: RandomSource, difficulty: Difficulty): Question {
      const level = difficulty === 'CUSTOM' ? 'MEDIUM' : difficulty;
      let retryCount = 0;
      const ctx: SkillContext = {
        rng,
        difficulty: level,
        tier: (values) => values[level],
        retry: (candidate, accept, maxAttempts) => {
          const r = withRetries({ topic: 'GRADE_LEVEL', generatorId: def.id, settings: { difficulty: level } }, candidate, accept, maxAttempts);
          retryCount += r.retryCount;
          return r.value;
        },
        question: (input) =>
          buildQuestion(
            {
              ...input,
              topic: 'GRADE_LEVEL',
              subtype: input.subtype ?? def.id,
              difficulty: level,
              generatorId: def.id,
              generatorVersion: version,
              standards: input.standards ?? def.standards,
              retryCount,
              constraints: { grade: def.grade, ...(input.constraints ?? {}) },
            },
            rng,
          ),
      };
      return def.generate(ctx);
    },
  });
}
