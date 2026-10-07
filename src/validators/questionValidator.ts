/**
 * Integrity checks for generated questions. Used by property tests over every generator and grade-level skill,
 * and available at runtime in development.
 */
import { canonicalInputString, promptToText } from '../domain/answer/format';
import type { AnswerValue, Question } from '../domain/question/types';
import { eq } from '../domain/rational/rational';
import { gradeSubmission } from './answerValidator';

export function answerValuesEqual(a: AnswerValue, b: AnswerValue): boolean {
  switch (a.type) {
    case 'NUMBER':
      return b.type === 'NUMBER' && eq(a.value, b.value);
    case 'RATIO':
      return b.type === 'RATIO' && eq(a.first, b.first) && eq(a.second, b.second);
    case 'CHOICE':
      return b.type === 'CHOICE' && a.id === b.id;
    case 'TIME':
      return b.type === 'TIME' && a.hour === b.hour && a.minute === b.minute && a.period === b.period;
    case 'PAIR':
      return b.type === 'PAIR' && eq(a.x, b.x) && eq(a.y, b.y);
    case 'QR':
      return b.type === 'QR' && a.quotient === b.quotient && a.remainder === b.remainder;
    case 'LINEAR':
      return b.type === 'LINEAR' && a.variable === b.variable && eq(a.coefficient, b.coefficient) && eq(a.constant, b.constant);
  }
}

/** Every question must show at least this many solution strategies. */
export const MIN_STRATEGIES = 2;

export interface QuestionIssue {
  readonly questionId: string;
  readonly problem: string;
}

export function validateQuestion(question: Question): QuestionIssue[] {
  const issues: QuestionIssue[] = [];
  const add = (problem: string) => issues.push({ questionId: question.id, problem });

  if (!Object.isFrozen(question)) add('question is not frozen');
  if (question.prompt.nodes.length === 0) add('empty prompt');
  const text = promptToText(question.prompt);
  if (!text || text.length < 2) add('prompt renders to empty text');
  if (/NaN|undefined|\[object Object\]|Infinity/.test(text)) add(`prompt text looks broken: ${text}`);
  if (!answerValuesEqual(question.solution.result, question.canonicalAnswer)) add('solution.result does not equal canonicalAnswer');
  if (question.solution.steps.length === 0) add('solution has no steps');
  const trees = [question.solution, ...question.alternativeSolutions];
  if (trees.length < MIN_STRATEGIES) add(`only ${trees.length} strategy; every question needs at least ${MIN_STRATEGIES} ways to solve it`);
  const ids = trees.map((t) => t.strategy);
  if (new Set(ids).size !== ids.length) add(`duplicate strategy ids: ${ids.join(', ')}`);
  for (const tree of question.alternativeSolutions) {
    if (tree.steps.length === 0) add(`strategy ${tree.strategy} has no steps`);
    if (!answerValuesEqual(tree.result, question.canonicalAnswer)) add(`strategy ${tree.strategy} result does not equal canonicalAnswer`);
  }
  if (question.answerSchema.accepts.length === 0) add('answer schema accepts nothing');
  if (question.answerSchema.widget === 'CHOICE') {
    const choices = question.answerSchema.choices ?? [];
    if (choices.length < 2) add('choice question needs at least two choices');
    if (new Set(choices.map((c) => c.id)).size !== choices.length) add('duplicate choice ids');
    if (new Set(choices.map((c) => c.label)).size !== choices.length) add('duplicate choice labels');
    if (question.canonicalAnswer.type !== 'CHOICE' || !choices.some((c) => c.id === (question.canonicalAnswer as { id: string }).id)) {
      add('canonical choice is not among the options');
    }
  }
  const typed = canonicalInputString(question);
  const grade = gradeSubmission(typed, question);
  if (grade.status !== 'CORRECT') add(`typing the canonical answer "${typed}" is graded ${grade.status}${grade.message ? ` (${grade.message})` : ''}`);
  return issues;
}
