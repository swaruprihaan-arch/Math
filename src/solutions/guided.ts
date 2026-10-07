/**
 * Guided strategy steps (Layer A — no React, no DOM).
 *
 * A solution step such as "Ones: 7 + 8 = 15. Write 5, carry 1." becomes a tiny game: the child sees
 * "Ones: 7 + 8 = [ ? ]. Write 5, carry 1." and taps the right brick out of three. This module finds the number to
 * hide (the step's "target") and builds the three answer bricks. Everything is exact (Rationals) and deterministic.
 */
import { nodesToText } from '../domain/answer/format';
import type { NumberStyle, PromptNode, SolutionStep } from '../domain/question/types';
import {
  abs,
  add,
  decimalPlaces,
  div,
  eq,
  fromDecimalString,
  gcd,
  isInteger,
  isNegative,
  isTerminating,
  isZero,
  mul,
  normalizeRational,
  rat,
  sub,
  type Rational,
} from '../domain/rational/rational';

export type StepDisplay = 'integer' | 'decimal' | 'fraction';

export type StepTarget = {
  /** Step content before the hidden number. */
  before: PromptNode[];
  /** The hidden number (exact). */
  value: Rational;
  /** How the number (and every answer brick) is written. */
  display: StepDisplay;
  /** Step content after the hidden number. */
  after: PromptNode[];
  /** The original number's exact presentation style when it is more specific than `display` ('mixed', 'money', 'percent'). */
  style?: NumberStyle;
  /** Fixed decimal places of the original number (keeps trailing zeros such as 4.50). */
  places?: number;
};

/* ------------------------------------------------------------------ */
/* Detection                                                            */
/* ------------------------------------------------------------------ */

interface Found {
  value: Rational;
  display: StepDisplay;
  style?: NumberStyle;
  places?: number;
}

/** How a candidate was found: a result after "=", a number-line jump "→ N", or the end of a counting list. */
type CandidateKind = 'equals' | 'jump' | 'list';

interface Candidate {
  before: PromptNode[];
  found: Found;
  after: PromptNode[];
  kind: CandidateKind;
}

/** A number node that can be hidden and rebuilt exactly as it was written, or null. */
function nodeTarget(node: PromptNode): Found | null {
  if (node.t === 'rawfrac') {
    // Unreduced fractions (e.g. 9/12) would render differently once normalized, so only lowest-terms ones qualify.
    if (node.denominator <= 1n || gcd(node.numerator, node.denominator) !== 1n || node.numerator === 0n) return null;
    return { value: normalizeRational(node.numerator, node.denominator), display: 'fraction', style: 'fraction' };
  }
  if (node.t !== 'num') return null;
  const { value, style } = node;
  switch (style) {
    case 'decimal':
    case 'money': {
      if (!isTerminating(value)) return null;
      const places = style === 'money' ? 2 : node.places;
      if (places !== undefined && decimalPlaces(value) > places) return null; // shown rounded: not the exact number
      return { value, display: 'decimal', style, ...(places !== undefined ? { places } : {}) };
    }
    case 'percent': {
      // `places` of a percent counts digits of the percent (25.5%), not of the value (0.255): bricks use the exact percent.
      if (!isTerminating(value)) return null;
      if (node.places !== undefined && decimalPlaces(value) > node.places + 2) return null;
      return { value, display: 'decimal', style };
    }
    case 'integer':
      return isInteger(value) ? { value, display: 'integer' } : { value, display: 'fraction' };
    case 'mixed':
      return isInteger(value) ? { value, display: 'integer' } : { value, display: 'fraction', style: 'mixed' };
    case 'fraction':
    case 'auto':
    default:
      return { value, display: isInteger(value) ? 'integer' : 'fraction' };
  }
}

function precededByEquals(nodes: readonly PromptNode[], index: number): boolean {
  const prev = nodes[index - 1];
  if (!prev) return false;
  if (prev.t === 'op') return prev.op === '=';
  if (prev.t === 'text') return /(^|[^<>!=≤≥])=$/.test(prev.text.trimEnd());
  return false;
}

/** Steps that already contain an unknown ("Think: 5 + ? = 12", "seven thousand → 7,___") stay as they are. */
function hasUnknown(nodes: readonly PromptNode[]): boolean {
  return nodes.some((n) => n.t === 'blank' || (n.t === 'text' && (n.text.includes('?') || /_{2,}/.test(n.text))));
}

/** A number written in text: integer (optional thousands commas), decimal, negative with "-" or "−". */
const NUMBER = String.raw`(?<sign>[-−]?)(?<int>\d{1,3}(?:,\d{3})+|\d+)(?:\.(?<frac>\d+))?`;
const LIST_ITEM = String.raw`[-−]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?, `;
/** Any number in text, for reading the items of a counting list. */
const ANY_NUMBER = /[-−]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g;

/**
 * Text patterns that end with the number to hide, in priority order:
 *   "… = 15"            (the result of a calculation)
 *   "10 → 13"           (a jump on a number line)
 *   "11, 12, 13"        (the last number of a counting list: at least three numbers that go up or down by the same step)
 */
const TEXT_PATTERNS: readonly { kind: CandidateKind; pattern: RegExp }[] = [
  { kind: 'equals', pattern: new RegExp(String.raw`=\s*${NUMBER}`, 'g') },
  { kind: 'jump', pattern: new RegExp(String.raw`→\s*${NUMBER}`, 'g') },
  { kind: 'list', pattern: new RegExp(String.raw`(?:${LIST_ITEM}){2,}${NUMBER}`, 'g') },
];

/** Text right after a matched number that means the match is only part of a bigger number (3/4, 1 1/2, 3:05, 3², 6x …). */
const NOT_A_WHOLE_NUMBER = /^(?:\d|[.,]\d|[\/:^²³¹⁰⁴-⁹]|[A-Za-z]|\s+\d+\s*\/\s*\d)/;
/** Characters that may not come right before a match ("<=", "≠", or the middle of a number). */
const BAD_PREFIX = /[<>!=≤≥\d.,]/;

interface TextHit {
  start: number;
  end: number;
  found: Found;
}

function parseNumber(text: string): Rational {
  return fromDecimalString(text.replace(/−/g, '-').replace(/,/g, ''));
}

/** "6, 12, 18, 24" or "9, 8, 7": the numbers change by the same non-zero step (a counting or skip-counting list). */
function isCountingList(listText: string): boolean {
  const items = (listText.match(ANY_NUMBER) ?? []).map(parseNumber);
  if (items.length < 3) return false;
  const stepSize = sub(items[1] as Rational, items[0] as Rational);
  if (isZero(stepSize)) return false;
  for (let i = 2; i < items.length; i++) if (!eq(sub(items[i] as Rational, items[i - 1] as Rational), stepSize)) return false;
  return true;
}

/** Every number the pattern ends with, in reading order. */
function numberHits(text: string, pattern: RegExp, kind: CandidateKind): TextHit[] {
  const hits: TextHit[] = [];
  pattern.lastIndex = 0;
  for (let m = pattern.exec(text); m !== null; m = pattern.exec(text)) {
    if (m[0].length === 0) {
      pattern.lastIndex++;
      continue;
    }
    const prefix = text.charAt(m.index - 1);
    if (prefix && BAD_PREFIX.test(prefix)) continue;
    const end = m.index + m[0].length;
    if (NOT_A_WHOLE_NUMBER.test(text.slice(end))) continue;
    if (kind === 'list' && !isCountingList(m[0])) continue;
    const sign = m.groups?.sign ?? '';
    const int = m.groups?.int ?? '';
    const frac = m.groups?.frac;
    if (!int) continue;
    const value = fromDecimalString(`${sign ? '-' : ''}${int.replace(/,/g, '')}${frac !== undefined ? `.${frac}` : ''}`);
    const start = end - sign.length - int.length - (frac !== undefined ? frac.length + 1 : 0);
    hits.push({
      start,
      end,
      found: frac !== undefined ? { value, display: 'decimal', style: 'decimal', places: frac.length } : { value, display: 'integer' },
    });
  }
  return hits;
}

type TextNode = Extract<PromptNode, { t: 'text' }>;

function textNode(source: TextNode, text: string): PromptNode {
  return source.emphasis ? { t: 'text', text, emphasis: source.emphasis } : { t: 'text', text };
}

function withFound(before: PromptNode[], found: Found, after: PromptNode[]): StepTarget {
  return {
    before,
    value: found.value,
    display: found.display,
    after,
    ...(found.style !== undefined && found.style !== found.display ? { style: found.style } : {}),
    ...(found.places !== undefined ? { places: found.places } : {}),
  };
}

/** Every number that could be hidden, best first (the rules (a)–(c) of findStepTarget, each from the end of the step). */
function candidates(nodes: readonly PromptNode[]): Candidate[] {
  const list: Candidate[] = [];
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (!precededByEquals(nodes, i)) continue;
    const found = nodeTarget(nodes[i] as PromptNode);
    if (found) list.push({ before: nodes.slice(0, i), found, after: nodes.slice(i + 1), kind: 'equals' });
  }
  for (const { kind, pattern } of TEXT_PATTERNS) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i] as PromptNode;
      if (node.t !== 'text') continue;
      const hits = numberHits(node.text, pattern, kind);
      for (let h = hits.length - 1; h >= 0; h--) {
        const hit = hits[h] as TextHit;
        const beforeText = node.text.slice(0, hit.start);
        const afterText = node.text.slice(hit.end);
        list.push({
          before: [...nodes.slice(0, i), ...(beforeText ? [textNode(node, beforeText)] : [])],
          found: hit.found,
          after: [...(afterText ? [textNode(node, afterText)] : []), ...nodes.slice(i + 1)],
          kind,
        });
      }
    }
  }
  return list;
}

/* ---- fairness: a blank must have one clear answer that is not already on screen ---- */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The ways the hidden number may be written in text: as drawn, without its sign or $, with or without thousands commas. */
function writtenForms(target: StepTarget): string[] {
  const label = nodesToText([targetNumberNode(target, target.value)]);
  const bare = label.replace(/^[-−]/, '').replace(/^\$/, '');
  const digits = bare.replace(/,/g, '');
  const [whole = '', rest] = digits.split('.');
  const grouped = `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${rest !== undefined ? `.${rest}` : ''}`;
  return [...new Set([label, bare, digits, grouped].filter((f) => f.length > 0))];
}

/** Is one of `forms` written in `text` as a whole number (not inside 123, 1.25 or 3/4)? No look-behind: older iPad Safari lacks it. */
function mentions(text: string, forms: readonly string[]): boolean {
  return forms.some((form) => new RegExp(String.raw`(^|[^\d.,/])${escapeRegExp(form)}(?![\d/]|[.,]\d)`).test(text));
}

const CONTINUING_OPS: ReadonlySet<string> = new Set(['+', '−', '×', '÷', '·', '(', '[', '{']);
/** Text that continues a calculation right after the number: "8 × 8", "20 + 20", "5(6 + 5)". */
const CONTINUES_TEXT = /^(?:\s*[+\-−×÷·*/^]|\()/;

/** "4 = [2] × 2": the number is only the first part of a longer expression, not the result. */
function continuesExpression(after: readonly PromptNode[]): boolean {
  for (const node of after) {
    if (node.t === 'text') {
      if (node.text.trim() === '') continue;
      return CONTINUES_TEXT.test(node.text);
    }
    if (node.t === 'op') return CONTINUING_OPS.has(node.op);
    return node.t === 'num' || node.t === 'rawfrac' || node.t === 'pow' || node.t === 'root' || node.t === 'abs' || node.t === 'var';
  }
  return false;
}

/** Where the clause holding the left-hand side starts ("Compare the tops: 34", "So 498", "Split: 20 = 20, 6"). */
const CLAUSE_BREAK = /[.;!?:,](?=\s)|[→=<>≤≥≠]|\b(?:so|then)\b/gi;

/** The left-hand side of the hidden number's "=" or "→", as text (only the clause the blank is in). */
function leftSide(target: StepTarget): string {
  const text = nodesToText(target.before).replace(/\s*[=→]\s*$/, '');
  let start = 0;
  CLAUSE_BREAK.lastIndex = 0;
  for (let m = CLAUSE_BREAK.exec(text); m !== null; m = CLAUSE_BREAK.exec(text)) start = m.index + m[0].length;
  return text.slice(start).trim();
}

/** The text of the current sentence before the blank (spaces collapsed). */
function sentenceBefore(target: StepTarget): string {
  const text = nodesToText(target.before).replace(/[ \t]+/g, ' ');
  let start = 0;
  const end = /[.;!?](?=\s)|\n/g;
  for (let m = end.exec(text); m !== null; m = end.exec(text)) start = m.index + m[0].length;
  return text.slice(start);
}

/**
 * A candidate is fair when the child can work the number out and it is not already on screen:
 *  - it is a whole result, not the start of an expression ("8^2 = 8 × 8", "n = 3 × 3 − 7");
 *  - it is not the same number repeated ("Compare the tops: 34 = 34", "So 498 = 498"), nor an equation the same
 *    sentence already wrote out ("y = 9 → y = 9");
 *  - it does not appear in the part of the step still shown while choosing ("= 132, so the answer is 132");
 *  - for jumps and lists, it is not printed earlier in the same sentence ("Skip count … until you reach 48: …, 42, 48").
 * Operands that happen to equal the result ("7 × 1 = 7") are fine: the child still works it out.
 */
function isFair(target: StepTarget, kind: CandidateKind): boolean {
  if (continuesExpression(target.after)) return false;
  const forms = writtenForms(target);
  const left = leftSide(target);
  if (forms.includes(left)) return false;
  if (mentions(nodesToText(visibleAfter(target, false)), forms)) return false;
  const sentence = sentenceBefore(target);
  if (kind !== 'equals' && mentions(sentence, forms)) return false;
  if (kind === 'equals' && left && mentions(sentence, forms.map((f) => `${left} = ${f}`))) return false;
  return true;
}

/**
 * The number a child fills in for this step, or null when the step has nothing fair to fill in (e.g. "Line up the places.").
 *  (a) the LAST number node directly after "=" (an `=` operator node, or text ending in "="); later nodes may follow.
 *      Unreduced raw fractions (9/12) do not count: they would look different once rebuilt from an exact value.
 *  (b) otherwise the last "= <number>" inside the text; the text is split around the number.
 *  (c) otherwise, the same for a number-line jump "→ <number>", then for the last number of a counting list "11, 12, 13".
 * Each rule tries its numbers from the end of the step backwards and skips unfair ones (see `isFair`).
 * Steps that already contain an unknown ("Think: 5 + ? = 12") have no target.
 */
export function findStepTarget(step: SolutionStep): StepTarget | null {
  const nodes = step.content;
  if (nodes.length === 0 || hasUnknown(nodes)) return null;
  for (const c of candidates(nodes)) {
    const target = withFound(c.before, c.found, c.after);
    if (isFair(target, c.kind)) return target;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Rendering helpers (still pure: they only build PromptNodes)          */
/* ------------------------------------------------------------------ */

/** The number node used to draw the hidden value or an answer brick, in the same style as the original. */
export function targetNumberNode(target: StepTarget, value: Rational): PromptNode {
  return {
    t: 'num',
    value,
    style: target.style ?? target.display,
    ...(target.places !== undefined ? { places: target.places } : {}),
  };
}

/** Punctuation that ends the shown clause and stays with it ("." / ";" / "!" / "?" / ":" / "," before a space or the end — not 4.75 or 1,000). */
const CLAUSE_END_KEPT = /[.;!?:,](?=\s|$)/;
/** Words and signs that start the next part of a step, which waits ("→ (8, 4)", "= 9 × 9", ", so 96", "so 5a"). */
const CLAUSE_END_HIDDEN = /→|[=<>≤≥≠]|\b(?:so|then)\b/i;
const STOP_OPS: ReadonlySet<string> = new Set(['=', '<', '>', '≤', '≥', '≠', ':', ',']);

/**
 * The part of `after` shown while the child is still choosing. The rest of a step often gives the answer away
 * ("Ones: 0 + 2 = 2. Write 2.", "40 ÷ 5 = 8, so −8.", "y: 0 + 4 = 4 → (8, 4)", "Multiply: 3 × 4 = 12 ⏎ 5 + 12"), so only
 * the rest of the blank's own clause shows (e.g. a unit: "= [?] cm."); everything after a sentence end, a comma, an
 * arrow, another "=", "so"/"then" or a line break waits until the step is solved.
 */
export function visibleAfter(target: StepTarget, solved: boolean): PromptNode[] {
  if (solved) return target.after;
  const shown: PromptNode[] = [];
  for (const node of target.after) {
    if (node.t === 'br') break;
    if (node.t === 'op' && STOP_OPS.has(node.op)) break;
    if (node.t === 'text') {
      const kept = CLAUSE_END_KEPT.exec(node.text);
      const hidden = CLAUSE_END_HIDDEN.exec(node.text);
      if (kept || hidden) {
        const cut = kept && (!hidden || kept.index < hidden.index) ? kept.index + 1 : (hidden as RegExpExecArray).index;
        const text = node.text.slice(0, cut);
        if (text.trim()) shown.push(textNode(node, text));
        break;
      }
    }
    shown.push(node);
  }
  return shown;
}

/** The step with the hidden number replaced by a blank (for read-aloud: "... equals what"). */
export function blankedContent(target: StepTarget): PromptNode[] {
  return [...target.before, { t: 'blank' }, ...visibleAfter(target, false)];
}

/* ------------------------------------------------------------------ */
/* Answer bricks                                                        */
/* ------------------------------------------------------------------ */

/** Small deterministic 32-bit hash (FNV-1a) used for salts and choice order. Never Math.random. */
export function saltFor(...parts: readonly (string | number | bigint)[]): number {
  const text = parts.map(String).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const TEN = rat(10);

function swapLastTwoDigits(v: Rational): Rational | null {
  const digits = abs(v.numerator).toString();
  if (digits.length < 2) return null;
  const a = digits.charAt(digits.length - 2);
  const b = digits.charAt(digits.length - 1);
  if (a === b) return null;
  const swapped = BigInt(`${digits.slice(0, -2)}${b}${a}`);
  return rat(isNegative(v) ? -swapped : swapped);
}

function integerPools(v: Rational): { near: Rational[]; far: Rational[] } {
  const one = rat(1);
  const size = abs(v.numerator);
  const near = [add(v, one), sub(v, one)];
  if (size < 10n) return { near, far: [add(v, rat(2)), sub(v, rat(2)), add(v, TEN)] };
  const far: Rational[] = [add(v, TEN), sub(v, TEN)];
  const swapped = swapLastTwoDigits(v);
  if (swapped) far.push(swapped);
  // Place-value slips (a zero too many / too few) only make sense once numbers have hundreds.
  if (size >= 100n && size < 100000n) far.push(mul(v, TEN));
  if (size >= 100n && v.numerator % 10n === 0n) far.push(div(v, TEN));
  return { near, far };
}

function precisionOf(target: StepTarget): number {
  if (target.places !== undefined) return target.places;
  return isTerminating(target.value) ? Math.max(1, decimalPlaces(target.value)) : 3;
}

function decimalPools(target: StepTarget): { near: Rational[]; far: Rational[] } {
  const v = target.value;
  const p = precisionOf(target);
  const unit = rat(1n, 10n ** BigInt(p));
  const near = [add(v, unit), sub(v, unit)];
  const far: Rational[] = [];
  if (p >= 2) far.push(add(v, mul(unit, TEN)), sub(v, mul(unit, TEN)));
  far.push(mul(v, TEN), div(v, TEN), add(v, rat(1)), sub(v, rat(1)));
  return { near, far };
}

function fractionPools(target: StepTarget): { near: Rational[]; far: Rational[] } {
  const v = target.value;
  const n = v.numerator;
  const d = v.denominator;
  const near: Rational[] = [normalizeRational(n + 1n, d), normalizeRational(n - 1n, d), normalizeRational(n, d + 1n)];
  if (d - 1n >= 1n) near.push(normalizeRational(n, d - 1n));
  const far: Rational[] = [];
  if (n !== 0n) far.push(normalizeRational(d, n)); // upside down
  if (target.style === 'mixed' || abs(n) > d) far.push(add(v, rat(1)), sub(v, rat(1)));
  far.push(normalizeRational(n + 1n, d + 1n));
  return { near, far };
}

/** Can this value be drawn as an answer brick next to the target without looking odd or rounding? */
function fitsDisplay(target: StepTarget, c: Rational): boolean {
  switch (target.display) {
    case 'integer':
      return isInteger(c);
    case 'decimal':
      if (!isTerminating(c)) return false;
      return target.places === undefined || decimalPlaces(c) <= target.places;
    case 'fraction':
      return !isInteger(c) && !isZero(c);
  }
}

/** Step size for the last-resort fallback (v + k·step), which always yields new distinct values. */
function fallbackStep(target: StepTarget): Rational {
  if (target.display === 'integer') return rat(1);
  if (target.display === 'decimal') return rat(1n, 10n ** BigInt(precisionOf(target)));
  return rat(1n, target.value.denominator);
}

/**
 * Exactly three distinct answer bricks, one of them the target value. Distractors are kid-plausible slips:
 *   integers  → ±1, ±10, last two digits swapped, ×10 / ÷10 (small numbers: ±1, ±2, +10)
 *   decimals  → ± one unit of the shown precision, ±0.1, ±1, decimal point moved (×10 / ÷10)
 *   fractions → numerator ±1, denominator ±1, upside down, ±1 whole for mixed numbers
 * Never negative when the target is ≥ 0. The order is derived from the value and the salt (deterministic).
 */
export function makeStepChoices(target: StepTarget, salt: number): Rational[] {
  const v = target.value;
  const h = saltFor(v.numerator, v.denominator, salt);
  const ok = (c: Rational) => !eq(c, v) && (isNegative(v) || !isNegative(c)) && fitsDisplay(target, c);
  const pools = target.display === 'integer' ? integerPools(v) : target.display === 'decimal' ? decimalPools(target) : fractionPools(target);
  const near = pools.near.filter(ok);
  const far = pools.far.filter(ok);

  const picked: Rational[] = [];
  const has = (c: Rational) => picked.some((p) => eq(p, c));
  const takeFrom = (list: readonly Rational[], offset: number) => {
    for (let k = 0; k < list.length; k++) {
      const c = list[(offset + k) % list.length] as Rational;
      if (!has(c)) {
        picked.push(c);
        return;
      }
    }
  };
  takeFrom(near, h % Math.max(1, near.length));
  takeFrom(far, (h >>> 8) % Math.max(1, far.length));
  for (const c of [...near, ...far]) if (picked.length < 2 && !has(c)) picked.push(c);
  const step = fallbackStep(target);
  for (let k = 2; picked.length < 2 && k < 64; k++) {
    const c = add(v, mul(step, rat(k)));
    if (ok(c) && !has(c)) picked.push(c);
  }
  // Last resort (never needed for engine content): whole steps up keep the form and are always new and non-negative.
  for (let k = 1; picked.length < 2 && k < 8; k++) {
    const c = add(v, rat(k));
    if (!has(c)) picked.push(c);
  }

  const choices = picked.slice(0, 2);
  choices.splice((h >>> 16) % 3, 0, v);
  return choices;
}
