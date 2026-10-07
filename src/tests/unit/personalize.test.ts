import { describe, expect, it } from 'vitest';
import { BUILT_IN_CHEERS, fillName, firstStoryName, hashString, personalizeNodes, personalizeQuestion, pickCheer } from '../../components/QuestionCard/personalize';
import { findSkill, ALL_SKILLS } from '../../curriculum/registry';
import { formatQuestionAnswer, nodesToText, questionToSpeech } from '../../domain/answer/format';
import type { Difficulty, PromptNode, Question, SolutionTree } from '../../domain/question/types';
import { createSeededRandom } from '../../domain/random/random';
import { rat } from '../../domain/rational/rational';
import { defaultArithmeticSettings, generateArithmetic } from '../../engines/arithmetic/arithmeticEngine';
import { defaultWordProblemSettings, generateWordProblem } from '../../engines/wordProblems/wordProblemEngine';
import { parseAnswer } from '../../parsers/parseAnswer';

const text = (t: string): PromptNode => ({ t: 'text', text: t });
const num = (n: number): PromptNode => ({ t: 'num', value: rat(n) });

describe('personalizeNodes (nickname in word problems)', () => {
  it('replaces the first story name, everywhere it occurs', () => {
    const nodes = [text('Maya has '), num(5), text(' apples. Diego gives Maya '), num(3), text(' more. How many does Maya have?')];
    const out = personalizeNodes(nodes, 'Zed');
    expect(nodesToText(out)).toBe('Zed has 5 apples. Diego gives Zed 3 more. How many does Zed have?');
  });

  it('only touches that one name (other names stay)', () => {
    const out = personalizeNodes([text('Diego and Maya share stickers. Maya gets more than Diego.')], 'Zed');
    expect(nodesToText(out)).toBe('Zed and Maya share stickers. Maya gets more than Zed.');
  });

  it('the first name is found in reading order, across text nodes', () => {
    const nodes = [text('A box has '), num(12), text(' pens. Omar takes '), num(2), text(', then Lily takes 3.')];
    expect(firstStoryName(nodes)).toBe('Omar');
    expect(nodesToText(personalizeNodes(nodes, 'Zed'))).toBe('A box has 12 pens. Zed takes 2, then Lily takes 3.');
  });

  it('matches whole words only (Mayan is not Maya) and keeps possessives', () => {
    const out = personalizeNodes([text('The Mayan calendar belongs to Maya. It is Maya’s book.')], 'Zed');
    expect(nodesToText(out)).toBe('The Mayan calendar belongs to Zed. It is Zed’s book.');
  });

  it('no story name → unchanged', () => {
    const nodes = [num(7), { t: 'op', op: '+' } as PromptNode, num(5), { t: 'op', op: '=' } as PromptNode, { t: 'blank' } as PromptNode];
    expect(personalizeNodes(nodes, 'Zed')).toEqual(nodes);
    expect(personalizeNodes([text('A farmer has 12 cows.')], 'Zed')).toEqual([text('A farmer has 12 cows.')]);
  });

  it('empty nickname, or the child already in the story → unchanged', () => {
    const nodes = [text('Maya has 5 apples.')];
    expect(personalizeNodes(nodes, '   ')).toEqual(nodes);
    const already = [text('Rihaan and Maya have 5 apples.')];
    expect(personalizeNodes(already, 'Rihaan')).toEqual(already);
  });

  it('a "$" in the nickname is inserted literally', () => {
    expect(nodesToText(personalizeNodes([text('Maya has 5 apples.')], 'Mo$&')).startsWith('Mo$& has')).toBe(true);
  });

  it('does not mutate the input nodes', () => {
    const nodes = [text('Maya has 5 apples.')];
    personalizeNodes(nodes, 'Zed');
    expect(nodes[0]).toEqual(text('Maya has 5 apples.'));
  });

  it('personalizeQuestion keeps the same object when nothing changes', () => {
    const q = generateArithmetic(defaultArithmeticSettings(), createSeededRandom('p'));
    expect(personalizeQuestion(q, 'Zed')).toBe(q);
    const story: Question = { ...q, prompt: { nodes: [text('Ava has 2 cats.')] } };
    const out = personalizeQuestion(story, 'Zed');
    expect(out).not.toBe(story);
    expect(out.id).toBe(story.id);
    expect(nodesToText(out.prompt.nodes)).toBe('Zed has 2 cats.');
  });
});

describe('cheers', () => {
  it('fillName fills every {name}', () => {
    expect(fillName('Go {name}! {NAME} rocks!', 'Rihaan')).toBe('Go Rihaan! Rihaan rocks!');
    expect(fillName('Great job, {name}!', '')).toBe('Great job, friend!');
  });

  it('pickCheer is deterministic and null for an empty list', () => {
    const cheers = ['Yay {name}!', 'Wow!', 'Brick by brick!'];
    const a = pickCheer(cheers, 'q1#1', 'Rihaan');
    expect(a).toBe(pickCheer(cheers, 'q1#1', 'Rihaan'));
    expect(cheers.map((c) => fillName(c, 'Rihaan'))).toContain(a);
    expect(pickCheer([], 'q1#1', 'Rihaan')).toBeNull();
    const seen = new Set(Array.from({ length: 30 }, (_, i) => pickCheer(cheers, `q${i}#1`, 'R')));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('hashString is stable', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
    expect(BUILT_IN_CHEERS.length).toBeGreaterThan(2);
  });
});

/* ------------------------------------------------------------------ */
/* Whole questions: the swap is consistent everywhere the child looks   */
/* ------------------------------------------------------------------ */

const treeText = (t: SolutionTree) => t.steps.map((st) => nodesToText(st.content)).join(' | ');

/** Every text the child can see: prompt, choice labels, strategy steps. */
function visibleTexts(q: Question): string[] {
  return [nodesToText(q.prompt.nodes), ...(q.answerSchema.choices ?? []).map((c) => c.label), treeText(q.solution), ...q.alternativeSolutions.map(treeText)];
}

const hasWord = (text: string, word: string) => new RegExp(`(^|[^A-Za-z0-9_])${word}([^A-Za-z0-9_]|$)`).test(text);

/** A "which is taller?" question whose answer choices are the story names (like gk.md.compare-length HARD). */
function namesAsChoices(): Question {
  const base = generateArithmetic(defaultArithmeticSettings(), createSeededRandom('names'));
  const steps = (strategy: string, line: string): SolutionTree => ({ strategy, steps: [{ type: 'EXPLAIN', content: [text(line)] }], result: { type: 'CHOICE', id: 'c1' } });
  return {
    ...base,
    prompt: { nodes: [text('Noah: 12 blocks tall. Zara: 10 blocks tall.'), { t: 'br' }, text('Which is taller?')] },
    canonicalAnswer: { type: 'CHOICE', id: 'c1' },
    acceptableRepresentations: ['CHOICE'],
    answerSchema: { accepts: ['CHOICE'], widget: 'CHOICE', hint: '', choices: [{ id: 'c0', label: 'Zara' }, { id: 'c1', label: 'Noah' }] },
    solution: steps('COMPARE_NUMBERS', 'So Noah is taller.'),
    alternativeSolutions: [steps('LINE_UP', 'Noah is taller.')],
  };
}

describe('personalizeQuestion (prompt, choices and steps stay in step)', () => {
  it('a story name that is an answer choice is swapped in the choice too (same ids, same answer)', () => {
    const q = namesAsChoices();
    const out = personalizeQuestion(q, 'Zed');
    expect(nodesToText(out.prompt.nodes)).toContain('Zed: 12 blocks tall. Zara: 10 blocks tall.');
    expect(out.answerSchema.choices).toEqual([
      { id: 'c0', label: 'Zara' },
      { id: 'c1', label: 'Zed' },
    ]);
    expect(formatQuestionAnswer(out)).toBe('Zed');
    expect(questionToSpeech(out)).toContain('Choose: Zara, or Zed');
    expect(treeText(out.solution)).toBe('So Zed is taller.');
    expect(treeText(out.alternativeSolutions[0] as SolutionTree)).toBe('Zed is taller.');
    // Grading is untouched: same canonical answer and choice ids; the original question is not mutated.
    expect(out.canonicalAnswer).toEqual(q.canonicalAnswer);
    expect(q.answerSchema.choices?.[1]?.label).toBe('Noah');
    const tapped = parseAnswer('c1', out.answerSchema);
    expect(tapped.ok && tapped.answer.value).toEqual({ type: 'CHOICE', id: 'c1' });
  });

  it('nickname already anywhere in the question (even only in a choice) → unchanged', () => {
    const q = namesAsChoices();
    expect(personalizeQuestion(q, 'Zara')).toBe(q);
    const onlyInChoice: Question = { ...q, answerSchema: { ...q.answerSchema, choices: [{ id: 'c0', label: 'Kai' }, { id: 'c1', label: 'Noah' }] } };
    expect(personalizeQuestion(onlyInChoice, 'Kai')).toBe(onlyInChoice);
  });

  it('picture labels follow the swap too; untouched parts are kept by identity', () => {
    const q = namesAsChoices();
    const withTable: Question = { ...q, prompt: { ...q.prompt, visual: { v: 'table', headers: ['Name', 'Blocks'], rows: [['Noah', '12'], ['Zara', '10']] } } };
    const out = personalizeQuestion(withTable, 'Zed');
    expect(out.prompt.visual).toEqual({ v: 'table', headers: ['Name', 'Blocks'], rows: [['Zed', '12'], ['Zara', '10']] });
    const visual = out.prompt.visual;
    const original = withTable.prompt.visual;
    if (visual?.v !== 'table' || original?.v !== 'table') throw new Error('table expected');
    expect(visual.headers).toBe(original.headers);
    expect(visual.rows[1]).toBe(original.rows[1]);
  });

  it('the real compare-length skill (HARD, names as answers): the right answer is always a choice the child can see', () => {
    const skill = findSkill('gk.md.compare-length');
    if (!skill) throw new Error('missing skill');
    let checked = 0;
    for (let i = 0; i < 60; i++) {
      const q = skill.generate(createSeededRandom(`cl|${i}`), 'HARD');
      const name = firstStoryName(q.prompt.nodes);
      if (!name || !(q.answerSchema.choices ?? []).some((c) => c.label === name)) continue;
      checked++;
      const out = personalizeQuestion(q, 'Zed');
      const prompt = nodesToText(out.prompt.nodes);
      const labels = (out.answerSchema.choices ?? []).map((c) => c.label);
      expect(labels).toContain('Zed');
      expect(labels.every((l) => hasWord(prompt, l))).toBe(true);
      expect(hasWord(prompt, formatQuestionAnswer(out))).toBe(true);
      expect(visibleTexts(out).some((t) => hasWord(t, name))).toBe(false);
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('every skill and the word-problem engine: the swapped-out name is gone from everything the child sees', () => {
    const diffs: readonly Exclude<Difficulty, 'CUSTOM'>[] = ['EASY', 'MEDIUM', 'HARD'];
    const questions: Question[] = [];
    for (const skill of ALL_SKILLS) for (const d of diffs) for (let i = 0; i < 4; i++) questions.push(skill.generate(createSeededRandom(`${skill.id}|${d}|${i}`), d));
    for (let i = 0; i < 60; i++) questions.push(generateWordProblem(defaultWordProblemSettings(), createSeededRandom(`wp${i}`)));
    let swapped = 0;
    for (const q of questions) {
      const name = firstStoryName(q.prompt.nodes);
      const out = personalizeQuestion(q, 'Zed');
      if (!name || out === q) continue;
      swapped++;
      expect(hasWord(nodesToText(out.prompt.nodes), 'Zed')).toBe(true);
      const leftover = visibleTexts(out).find((t) => hasWord(t, name));
      expect(leftover, `${q.subtype}: "${name}" left in "${leftover}"`).toBeUndefined();
      expect(out.canonicalAnswer).toEqual(q.canonicalAnswer);
      expect((out.answerSchema.choices ?? []).map((c) => c.id)).toEqual((q.answerSchema.choices ?? []).map((c) => c.id));
    }
    expect(swapped).toBeGreaterThan(50);
  });
});
