/**
 * Personal touches for the child's screen. Pure helpers (no React, no DOM, no randomness):
 *  - put the child's nickname into word problems ("Maya has 12 stickers…" → "Rihaan has 12 stickers…"),
 *    consistently in the prompt, picture labels, answer choices and strategy steps,
 *  - pick a cheer deterministically and fill in "{name}".
 */
import { NAMES } from '../../curriculum/helpers';
import type { PromptNode, Question, SolutionTree, Visual } from '../../domain/question/types';

const NAME_SET: ReadonlySet<string> = new Set(NAMES);

/** Same idea of a "word" as the regex \b boundary (NAMES are plain ASCII letters). */
const WORD = /[A-Za-z0-9_]+/g;

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}_]/u.test(ch);
}

/** Index of the first whole-word `word` in `text` at or after `from` (no letter/digit right before or after); -1 if none. */
function wholeWordAt(text: string, word: string, from: number): number {
  for (let i = text.indexOf(word, from); i !== -1; i = text.indexOf(word, i + 1)) {
    if (!isWordChar(text[i - 1]) && !isWordChar(text[i + word.length])) return i;
  }
  return -1;
}

/** Does `word` occur in `text` as a whole word? (No look-behind: older iPad Safari.) */
function containsWholeWord(text: string, word: string): boolean {
  return word !== '' && wholeWordAt(text, word, 0) !== -1;
}

/** Replaces every whole-word `word` in `text` by `by`, literally (a "$" in `by` is never a pattern). Same string when nothing changes. */
function replaceWholeWord(text: string, word: string, by: string): string {
  let out = '';
  let from = 0;
  for (let i = wholeWordAt(text, word, 0); i !== -1; i = wholeWordAt(text, word, from)) {
    out += text.slice(from, i) + by;
    from = i + word.length;
  }
  return from === 0 ? text : out + text.slice(from);
}

/** Calls `visit` for every text string in reading order (including text nested in powers, roots, absolute values). */
function eachText(nodes: readonly PromptNode[], visit: (text: string) => boolean): boolean {
  for (const node of nodes) {
    switch (node.t) {
      case 'text':
        if (visit(node.text)) return true;
        break;
      case 'pow':
        if (eachText(node.base, visit) || eachText(node.exponent, visit)) return true;
        break;
      case 'root':
        if (eachText(node.radicand, visit)) return true;
        break;
      case 'abs':
        if (eachText(node.inner, visit)) return true;
        break;
      default:
        break;
    }
  }
  return false;
}

/** The first story name (from NAMES) that appears, as a whole word, in reading order. */
export function firstStoryName(nodes: readonly PromptNode[]): string | null {
  let found: string | null = null;
  eachText(nodes, (text) => {
    for (const m of text.matchAll(WORD)) {
      if (NAME_SET.has(m[0])) {
        found = m[0];
        return true;
      }
    }
    return false;
  });
  return found;
}

/* ------------------------------------------------------------------ */
/* Swapping text everywhere the child can see it                        */
/* ------------------------------------------------------------------ */

/** Text → text. Must return the SAME string when nothing changes (untouched objects are kept by identity). */
type Swap = (text: string) => string;

function swapList<T>(items: readonly T[], swapItem: (item: T) => T): readonly T[] {
  let changed = false;
  const out = items.map((item) => {
    const next = swapItem(item);
    if (next !== item) changed = true;
    return next;
  });
  return changed ? out : items;
}

function swapNodes(nodes: readonly PromptNode[], swap: Swap): readonly PromptNode[] {
  return swapList(nodes, (node): PromptNode => {
    switch (node.t) {
      case 'text': {
        const text = swap(node.text);
        return text === node.text ? node : { ...node, text };
      }
      case 'pow': {
        const base = swapNodes(node.base, swap);
        const exponent = swapNodes(node.exponent, swap);
        return base === node.base && exponent === node.exponent ? node : { ...node, base, exponent };
      }
      case 'root': {
        const radicand = swapNodes(node.radicand, swap);
        return radicand === node.radicand ? node : { ...node, radicand };
      }
      case 'abs': {
        const inner = swapNodes(node.inner, swap);
        return inner === node.inner ? node : { ...node, inner };
      }
      default:
        return node;
    }
  });
}

function swapOptional(text: string | undefined, swap: Swap): string | undefined {
  return text === undefined ? undefined : swap(text);
}

function swapTree(tree: SolutionTree, swap: Swap): SolutionTree {
  const steps = swapList(tree.steps, (step) => {
    const content = swapNodes(step.content, swap);
    return content === step.content ? step : { ...step, content };
  });
  const title = swapOptional(tree.title, swap);
  return steps === tree.steps && title === tree.title ? tree : { ...tree, steps, ...(title === undefined ? {} : { title }) };
}

/** Picture labels that can carry a story name (object groups, table cells, number-line points, shape labels). */
function swapVisual(visual: Visual, swap: Swap): Visual {
  switch (visual.v) {
    case 'objects': {
      const groups = swapList(visual.groups, (g) => {
        const label = swapOptional(g.label, swap);
        return label === g.label ? g : { ...g, label };
      });
      return groups === visual.groups ? visual : { ...visual, groups };
    }
    case 'table': {
      const headers = swapList(visual.headers, swap);
      const rows = swapList(visual.rows, (row) => swapList(row, swap));
      return headers === visual.headers && rows === visual.rows ? visual : { ...visual, headers, rows };
    }
    case 'numberLine': {
      const points = swapList(visual.points, (p) => {
        const label = swap(p.label);
        return label === p.label ? p : { ...p, label };
      });
      return points === visual.points ? visual : { ...visual, points };
    }
    case 'shape': {
      const label = swapOptional(visual.label, swap);
      return label === visual.label ? visual : { ...visual, label };
    }
    default:
      return visual;
  }
}

/** Applies `swap` to every child-visible text: prompt, picture labels, answer-choice labels, strategy titles and steps. */
function swapQuestion(question: Question, swap: Swap): Question {
  const nodes = swapNodes(question.prompt.nodes, swap);
  const visual = question.prompt.visual ? swapVisual(question.prompt.visual, swap) : undefined;
  const prompt = nodes === question.prompt.nodes && visual === question.prompt.visual ? question.prompt : { ...question.prompt, nodes, ...(visual ? { visual } : {}) };
  const oldChoices = question.answerSchema.choices;
  const choices = oldChoices
    ? swapList(oldChoices, (c) => {
        const label = swap(c.label);
        return label === c.label ? c : { ...c, label };
      })
    : undefined;
  const answerSchema = choices === oldChoices ? question.answerSchema : { ...question.answerSchema, choices };
  const solution = swapTree(question.solution, swap);
  const alternativeSolutions = swapList(question.alternativeSolutions, (t) => swapTree(t, swap));
  if (prompt === question.prompt && answerSchema === question.answerSchema && solution === question.solution && alternativeSolutions === question.alternativeSolutions) {
    return question;
  }
  return { ...question, prompt, answerSchema, solution, alternativeSolutions };
}

/** Is `word` (as a whole word) anywhere the child can see it in this question? */
function questionMentions(question: Question, word: string): boolean {
  let found = false;
  swapQuestion(question, (text) => {
    if (!found && containsWholeWord(text, word)) found = true;
    return text;
  });
  return found;
}

/**
 * The swap that puts the nickname in place of the prompt's FIRST story name, or null when nothing should change:
 * no story name, an empty nickname, or the child already in the story (`alreadyThere`).
 */
function nameSwap(nodes: readonly PromptNode[], nickname: string, alreadyThere: (nick: string) => boolean): Swap | null {
  const nick = nickname.trim();
  if (!nick || alreadyThere(nick)) return null;
  const name = firstStoryName(nodes);
  if (!name) return null;
  return (text) => replaceWholeWord(text, name, nick);
}

/**
 * Puts the child's nickname into a word problem's prompt: the FIRST story name (from NAMES) found in the prompt is
 * replaced, everywhere it occurs, by the nickname. Other names are untouched. No-op when there is no story name, the
 * nickname is empty, or the nickname is already in the story. Prompt only: for a question use personalizeQuestion,
 * which keeps the answer choices and strategy steps in step with the prompt.
 */
export function personalizeNodes(nodes: readonly PromptNode[], nickname: string): PromptNode[] {
  const swap = nameSwap(nodes, nickname, (nick) => eachText(nodes, (text) => containsWholeWord(text, nick)));
  return [...(swap ? swapNodes(nodes, swap) : nodes)];
}

/**
 * The same question with the nickname in its story (the same object when nothing changes). The swap is consistent:
 * the prompt, picture labels, answer-choice labels and the strategies' steps all use the nickname, so a story name
 * that is itself an answer ("Noah: 12 blocks tall. Zara: 10 blocks tall. Which is taller?") still matches a choice
 * button. Grading uses the choice id and the canonical value (never a label), so it is unaffected; show and speak
 * the answer from the personalised question (formatQuestionAnswer / questionToSpeech).
 */
export function personalizeQuestion(question: Question, nickname: string): Question {
  const swap = nameSwap(question.prompt.nodes, nickname, (nick) => questionMentions(question, nick));
  return swap ? swapQuestion(question, swap) : question;
}

/* ------------------------------------------------------------------ */
/* Cheers                                                               */
/* ------------------------------------------------------------------ */

/** Built-in buddy cheers (used when the parent has not written any). */
export const BUILT_IN_CHEERS: readonly string[] = ['You can do it!', 'Let’s go!', 'High five!', 'You’re a star!', 'Keep building!', 'Super brain!'];

/** Replaces every "{name}" (any letter case) with the nickname ("friend" when no nickname is set). */
export function fillName(text: string, nickname: string): string {
  const nick = nickname.trim() || 'friend';
  return text.replace(/\{name\}/gi, () => nick);
}

/** Small, stable string hash (FNV-1a, 32-bit) for deterministic choices. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Picks a cheer from the list deterministically from `seed` (same seed → same cheer); null for an empty list. */
export function pickCheer(cheers: readonly string[], seed: string, nickname: string): string | null {
  if (cheers.length === 0) return null;
  const cheer = cheers[hashString(seed) % cheers.length] ?? cheers[0] ?? '';
  return fillName(cheer, nickname);
}
