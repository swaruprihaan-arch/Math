/**
 * Grade Level Math — California Common Core State Standards for Mathematics (CA CCSSM), K–8.
 * Adopted by the California State Board of Education Aug 2, 2010; modified Jan 16, 2013. Instruction is organized by the
 * Mathematics Framework for California Public Schools (adopted July 12, 2023).
 */
import type { Difficulty, Question } from '../domain/question/types';
import type { RandomSource } from '../domain/random/random';

export type GradeLevel = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

export const GRADES: readonly GradeLevel[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];

export type DomainCode = 'CC' | 'OA' | 'NBT' | 'NF' | 'MD' | 'G' | 'RP' | 'NS' | 'EE' | 'F' | 'SP';

export const DOMAIN_NAMES: Record<DomainCode, string> = {
  CC: 'Counting and Cardinality',
  OA: 'Operations and Algebraic Thinking',
  NBT: 'Number and Operations in Base Ten',
  NF: 'Number and Operations—Fractions',
  MD: 'Measurement and Data',
  G: 'Geometry',
  RP: 'Ratios and Proportional Relationships',
  NS: 'The Number System',
  EE: 'Expressions and Equations',
  F: 'Functions',
  SP: 'Statistics and Probability',
};

export const GRADE_DOMAINS: Record<GradeLevel, readonly DomainCode[]> = {
  K: ['CC', 'OA', 'NBT', 'MD', 'G'],
  '1': ['OA', 'NBT', 'MD', 'G'],
  '2': ['OA', 'NBT', 'MD', 'G'],
  '3': ['OA', 'NBT', 'NF', 'MD', 'G'],
  '4': ['OA', 'NBT', 'NF', 'MD', 'G'],
  '5': ['OA', 'NBT', 'NF', 'MD', 'G'],
  '6': ['RP', 'NS', 'EE', 'G', 'SP'],
  '7': ['RP', 'NS', 'EE', 'G', 'SP'],
  '8': ['NS', 'EE', 'F', 'G', 'SP'],
};

export const GRADE_LABELS: Record<GradeLevel, string> = {
  K: 'Kindergarten',
  '1': 'Grade 1',
  '2': 'Grade 2',
  '3': 'Grade 3',
  '4': 'Grade 4',
  '5': 'Grade 5',
  '6': 'Grade 6',
  '7': 'Grade 7',
  '8': 'Grade 8',
};

/** One content standard from the official CA CCSSM text. */
export interface StandardInfo {
  /** e.g. "5.NF.1", "5.OA.2.1" (California addition), "K.CC.4" */
  readonly code: string;
  readonly grade: GradeLevel;
  readonly domain: DomainCode;
  /** Cluster heading, e.g. "Use equivalent fractions as a strategy to add and subtract fractions." */
  readonly cluster: string;
  /** Official standard text (sub-parts a, b, c… may be abbreviated). */
  readonly text: string;
  /** True for standards marked "CA" (California additions to the Common Core). */
  readonly caAddition?: boolean;
}

/** A practice skill that generates questions for one or more standards. */
export interface Skill {
  /** Stable id, e.g. "g5.nf.add-unlike-denominators". */
  readonly id: string;
  readonly grade: GradeLevel;
  readonly domain: DomainCode;
  /** Standard codes practiced; may reference lettered parts like "4.NF.3c". */
  readonly standards: readonly string[];
  /** Short, student-friendly title. */
  readonly title: string;
  readonly version: string;
  generate(rng: RandomSource, difficulty: Difficulty): Question;
}

const CODE_PATTERN = /^(K|[1-8])\.(CC|OA|NBT|NF|MD|G|RP|NS|EE|F|SP)\.(\d+(?:\.\d+)?)([a-e])?$/;

export function isStandardCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** "4.NF.3c" → "4.NF.3"; "5.OA.2.1" → "5.OA.2.1". */
export function standardParent(code: string): string {
  const m = CODE_PATTERN.exec(code);
  if (!m) return code;
  return `${m[1]}.${m[2]}.${m[3]}`;
}
