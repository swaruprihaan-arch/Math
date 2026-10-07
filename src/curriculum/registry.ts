import { GRADE_1_SKILLS } from './grades/grade1';
import { GRADE_2_SKILLS } from './grades/grade2';
import { GRADE_3_SKILLS } from './grades/grade3';
import { GRADE_4_SKILLS } from './grades/grade4';
import { GRADE_5_SKILLS } from './grades/grade5';
import { GRADE_6_SKILLS } from './grades/grade6';
import { GRADE_7_SKILLS } from './grades/grade7';
import { GRADE_8_SKILLS } from './grades/grade8';
import { GRADE_K_SKILLS } from './grades/gradeK';
import { GRADE_1_STANDARDS } from './standards/grade1';
import { GRADE_2_STANDARDS } from './standards/grade2';
import { GRADE_3_STANDARDS } from './standards/grade3';
import { GRADE_4_STANDARDS } from './standards/grade4';
import { GRADE_5_STANDARDS } from './standards/grade5';
import { GRADE_6_STANDARDS } from './standards/grade6';
import { GRADE_7_STANDARDS } from './standards/grade7';
import { GRADE_8_STANDARDS } from './standards/grade8';
import { GRADE_K_STANDARDS } from './standards/gradeK';
import { standardParent, type DomainCode, type GradeLevel, type Skill, type StandardInfo } from './types';

export const SKILLS_BY_GRADE: Record<GradeLevel, readonly Skill[]> = {
  K: GRADE_K_SKILLS,
  '1': GRADE_1_SKILLS,
  '2': GRADE_2_SKILLS,
  '3': GRADE_3_SKILLS,
  '4': GRADE_4_SKILLS,
  '5': GRADE_5_SKILLS,
  '6': GRADE_6_SKILLS,
  '7': GRADE_7_SKILLS,
  '8': GRADE_8_SKILLS,
};

export const STANDARDS_BY_GRADE: Record<GradeLevel, readonly StandardInfo[]> = {
  K: GRADE_K_STANDARDS,
  '1': GRADE_1_STANDARDS,
  '2': GRADE_2_STANDARDS,
  '3': GRADE_3_STANDARDS,
  '4': GRADE_4_STANDARDS,
  '5': GRADE_5_STANDARDS,
  '6': GRADE_6_STANDARDS,
  '7': GRADE_7_STANDARDS,
  '8': GRADE_8_STANDARDS,
};

export const ALL_SKILLS: readonly Skill[] = Object.values(SKILLS_BY_GRADE).flat();
export const ALL_STANDARDS: readonly StandardInfo[] = Object.values(STANDARDS_BY_GRADE).flat();

const STANDARD_INDEX = new Map(ALL_STANDARDS.map((s) => [s.code, s]));
const SKILL_INDEX = new Map(ALL_SKILLS.map((s) => [s.id, s]));

export function findStandard(code: string): StandardInfo | undefined {
  return STANDARD_INDEX.get(code) ?? STANDARD_INDEX.get(standardParent(code));
}

export function findSkill(id: string): Skill | undefined {
  return SKILL_INDEX.get(id);
}

export function skillsFor(grade: GradeLevel, domain?: DomainCode | 'ALL'): readonly Skill[] {
  const skills = SKILLS_BY_GRADE[grade];
  return !domain || domain === 'ALL' ? skills : skills.filter((s) => s.domain === domain);
}
