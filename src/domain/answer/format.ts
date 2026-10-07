/**
 * Text formatting of values (DISPLAY strings). Correctness never depends on these strings (spec §010);
 * they are used for reports, PDFs, aria labels and for tests that "type" the canonical answer.
 */
import {
  abs,
  isInteger,
  isTerminating,
  mul,
  rat,
  toDecimalString,
  toMixed,
  type Rational,
} from '../rational/rational';
import type { AnswerKind, AnswerValue, NumberStyle, PromptNode, Question, StructuredPrompt, Visual } from '../question/types';

export const MINUS = '−';

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function withSign(negative: boolean, body: string, minus: string): string {
  return negative ? `${minus}${body}` : body;
}

/** Format an exact decimal string with thousands grouping on the integer part. */
function groupDecimal(text: string): string {
  const [i, f] = text.split('.');
  const grouped = (i ?? '').length > 4 ? groupThousands(i ?? '') : (i ?? '');
  return f !== undefined ? `${grouped}.${f}` : grouped;
}

export interface FormatOptions {
  /** Use ASCII hyphen-minus instead of U+2212 (for typeable strings and PDFs). */
  ascii?: boolean;
  /** Group thousands with commas (default true). */
  group?: boolean;
}

/** Format a rational as text in the requested style. */
export function formatNumber(value: Rational, style: NumberStyle = 'auto', places?: number, options: FormatOptions = {}): string {
  const minus = options.ascii ? '-' : MINUS;
  const group = options.group !== false;
  const negative = value.numerator < 0n;
  const magnitude = rat(abs(value.numerator), value.denominator);

  switch (style) {
    case 'money': {
      const body = toDecimalString(magnitude, 2);
      return withSign(negative, `$${group ? groupDecimal(body) : body}`, minus);
    }
    case 'percent': {
      const pct = mul(magnitude, rat(100));
      const body = places !== undefined ? toDecimalString(pct, places) : isTerminating(pct) ? toDecimalString(pct) : toDecimalString(pct, 2);
      return withSign(negative, `${body}%`, minus);
    }
    case 'decimal': {
      const body = places !== undefined ? toDecimalString(magnitude, places) : isTerminating(magnitude) ? toDecimalString(magnitude) : toDecimalString(magnitude, 3);
      return withSign(negative, group ? groupDecimal(body) : body, minus);
    }
    case 'fraction':
      if (isInteger(magnitude)) return withSign(negative, magnitude.numerator.toString(), minus);
      return withSign(negative, `${magnitude.numerator}/${magnitude.denominator}`, minus);
    case 'mixed': {
      const m = toMixed(magnitude);
      if (m.numerator === 0n) return withSign(negative, m.whole.toString(), minus);
      if (m.whole === 0n) return withSign(negative, `${m.numerator}/${m.denominator}`, minus);
      return withSign(negative, `${m.whole} ${m.numerator}/${m.denominator}`, minus);
    }
    case 'integer':
    case 'auto':
    default: {
      if (isInteger(magnitude)) {
        const digits = magnitude.numerator.toString();
        return withSign(negative, group && digits.length > 4 ? groupThousands(digits) : digits, minus);
      }
      if (places !== undefined) return withSign(negative, toDecimalString(magnitude, places), minus);
      return withSign(negative, `${magnitude.numerator}/${magnitude.denominator}`, minus);
    }
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Human-readable text for an answer value. */
export function formatAnswerValue(value: AnswerValue, style: NumberStyle = 'auto', options: FormatOptions = {}, choiceLabel?: (id: string) => string): string {
  const minus = options.ascii ? '-' : MINUS;
  switch (value.type) {
    case 'NUMBER':
      return formatNumber(value.value, style, undefined, options);
    case 'RATIO':
      return `${formatNumber(value.first, 'auto', undefined, options)}:${formatNumber(value.second, 'auto', undefined, options)}`;
    case 'CHOICE':
      return choiceLabel ? choiceLabel(value.id) : value.id;
    case 'TIME':
      return `${value.hour}:${pad2(value.minute)}${value.period ? ` ${value.period === 'AM' ? 'a.m.' : 'p.m.'}` : ''}`;
    case 'PAIR':
      return `(${formatNumber(value.x, 'auto', undefined, options)}, ${formatNumber(value.y, 'auto', undefined, options)})`;
    case 'QR':
      return value.remainder === 0n ? value.quotient.toString() : `${value.quotient} R ${value.remainder}`;
    case 'LINEAR': {
      const parts: string[] = [];
      const c = value.coefficient;
      if (c.numerator !== 0n) {
        const coefMag = rat(abs(c.numerator), c.denominator);
        const coefText = isInteger(coefMag) && coefMag.numerator === 1n ? '' : formatNumber(coefMag, isTerminating(coefMag) ? 'decimal' : 'fraction', undefined, options);
        parts.push(`${c.numerator < 0n ? minus : ''}${coefText}${value.variable}`);
      }
      const k = value.constant;
      if (k.numerator !== 0n || parts.length === 0) {
        const kMag = rat(abs(k.numerator), k.denominator);
        const kText = formatNumber(kMag, isTerminating(kMag) ? 'decimal' : 'fraction', undefined, options);
        if (parts.length === 0) parts.push(`${k.numerator < 0n ? minus : ''}${kText}`);
        else parts.push(`${k.numerator < 0n ? minus : '+'} ${kText}`);
      }
      return parts.join(' ');
    }
  }
}

/** The correct answer of a question as display text. */
export function formatQuestionAnswer(question: Question, options: FormatOptions = {}): string {
  const value = question.canonicalAnswer;
  if (value.type === 'CHOICE') {
    const option = question.answerSchema.choices?.find((c) => c.id === value.id);
    return option ? option.label : value.id;
  }
  if (value.type === 'NUMBER') {
    if (question.answerSchema.percentContext) return formatNumber(value.value, 'percent', undefined, options);
    if (question.answerSchema.accepts.includes('FACTORIZATION')) return formatFactorization(value.value, options);
    if (question.validationPolicy.requiredForms?.includes('SCIENTIFIC')) return formatScientific(value.value, options);
    const style = question.answerDisplay ?? defaultStyleFor(question);
    let text = formatNumber(value.value, style, undefined, options);
    const unit = pickUnit(question.answerSchema.units, value.value);
    if (unit && style !== 'money') text = `${text} ${unit}`;
    return text;
  }
  return formatAnswerValue(value, 'auto', options);
}

/** Choose a unit word that agrees with the value ("1 kilogram", "3 kilograms"). */
function pickUnit(units: readonly string[] | undefined, value: Rational): string | undefined {
  const words = (units ?? []).filter((u) => /^[a-z²³°]/i.test(u) && u.length > 1);
  if (words.length === 0) return undefined;
  const one = value.numerator === value.denominator;
  if (one) {
    const singular = words.find((w) => !/s$/i.test(w)) ;
    return singular ?? words[0];
  }
  const plural = words.find((w) => /s$/i.test(w) || /[²³]|^(cm|mm|km|kg|mg|ml|ft|in|yd|mi|lb|oz)$/i.test(w));
  return plural ?? words[0];
}

function defaultStyleFor(question: Question): NumberStyle {
  const req = question.validationPolicy.requiredForms;
  if (req?.includes('MIXED_NUMBER')) return 'mixed';
  if (req?.includes('DECIMAL')) return 'decimal';
  if (question.canonicalAnswer.type === 'NUMBER' && !isInteger(question.canonicalAnswer.value) && isTerminating(question.canonicalAnswer.value) && question.answerSchema.accepts.includes('DECIMAL') && !question.answerSchema.accepts.includes('RATIONAL')) {
    return 'decimal';
  }
  return 'auto';
}

export function formatFactorization(value: Rational, options: FormatOptions = {}): string {
  const times = options.ascii ? ' x ' : ' × ';
  let n = abs(value.numerator);
  const factors: string[] = [];
  for (let p = 2n; p * p <= n; p++) {
    while (n % p === 0n) {
      factors.push(p.toString());
      n /= p;
    }
  }
  if (n > 1n) factors.push(n.toString());
  return factors.join(times);
}

export function formatScientific(value: Rational, options: FormatOptions = {}): string {
  const minus = options.ascii ? '-' : MINUS;
  const times = options.ascii ? ' x ' : ' × ';
  if (value.numerator === 0n) return `0${times}10^0`;
  const negative = value.numerator < 0n;
  let mag = rat(abs(value.numerator), value.denominator);
  let exponent = 0;
  const ten = rat(10);
  // Normalize to 1 <= mag < 10 using exact comparisons.
  for (let i = 0; i < 400 && (mag.numerator >= 10n * mag.denominator); i++) {
    mag = rat(mag.numerator, mag.denominator * 10n);
    exponent++;
  }
  for (let i = 0; i < 400 && mag.numerator < mag.denominator; i++) {
    mag = mul(mag, ten);
    exponent--;
  }
  const coef = isTerminating(mag) ? toDecimalString(mag) : toDecimalString(mag, 3);
  return `${negative ? minus : ''}${coef}${times}10^${exponent < 0 ? minus : ''}${Math.abs(exponent)}`;
}

/**
 * A string a student could type that is graded CORRECT for this question.
 * Used by tests (every generated question must accept its own canonical answer) and by worksheet answer keys.
 */
export function canonicalInputString(question: Question): string {
  const value = question.canonicalAnswer;
  const schema = question.answerSchema;
  const policy = question.validationPolicy;
  const ascii = { ascii: true, group: false } as const;
  switch (value.type) {
    case 'CHOICE':
      return value.id;
    case 'TIME':
      return `${value.hour}:${pad2(value.minute)}${value.period ? ` ${value.period}` : ''}`;
    case 'QR':
      return value.remainder === 0n ? value.quotient.toString() : `${value.quotient} R ${value.remainder}`;
    case 'PAIR':
      return `(${inputNumber(value.x)}, ${inputNumber(value.y)})`;
    case 'RATIO':
      return `${inputNumber(value.first)}:${inputNumber(value.second)}`;
    case 'LINEAR':
      return formatAnswerValue(value, 'auto', ascii).replace(/\s+/g, '');
    case 'NUMBER': {
      const v = value.value;
      const accepts = schema.accepts;
      const required: readonly AnswerKind[] = policy.requiredForms ?? accepts;
      if (accepts.includes('FACTORIZATION')) return formatFactorization(v, ascii);
      if (required.includes('SCIENTIFIC') && policy.requireNormalizedScientific !== false && !required.includes('DECIMAL') && !required.includes('INTEGER')) {
        return formatScientific(v, ascii);
      }
      if (schema.percentContext) return `${toDecimalString(mul(v, rat(100)))}%`;
      if (isInteger(v) && (required.includes('INTEGER') || (!required.includes('RATIONAL') && !required.includes('MIXED_NUMBER')))) {
        return v.numerator.toString();
      }
      if (required.includes('MIXED_NUMBER') && !isInteger(v)) {
        const m = toMixed(v);
        if (m.whole > 0n) return `${m.sign < 0 ? '-' : ''}${m.whole} ${m.numerator}/${m.denominator}`;
      }
      if (required.includes('RATIONAL')) return formatNumber(v, 'fraction', undefined, ascii);
      if (required.includes('MIXED_NUMBER')) return formatNumber(v, 'mixed', undefined, ascii);
      if (required.includes('DECIMAL') && isTerminating(v)) return toDecimalString(v);
      if (required.includes('PERCENTAGE')) return `${toDecimalString(mul(v, rat(100)))}%`;
      if (required.includes('SCIENTIFIC')) return formatScientific(v, ascii);
      if (isInteger(v)) return v.numerator.toString();
      return isTerminating(v) ? toDecimalString(v) : formatNumber(v, 'fraction', undefined, ascii);
    }
  }
}

function inputNumber(v: Rational): string {
  if (isInteger(v)) return v.numerator.toString();
  return isTerminating(v) ? toDecimalString(v) : formatNumber(v, 'fraction', undefined, { ascii: true });
}

/* ------------------------------------------------------------------ */
/* Prompt → plain text (for PDF, aria labels, worksheets)              */
/* ------------------------------------------------------------------ */

export function nodesToText(nodes: readonly PromptNode[], options: FormatOptions = {}): string {
  let out = '';
  for (const node of nodes) {
    switch (node.t) {
      case 'text':
        out += options.ascii ? node.text.replace(/−/g, '-').replace(/×/g, 'x').replace(/÷/g, '/') : node.text;
        break;
      case 'num': {
        const text = formatNumber(node.value, node.style ?? 'auto', node.places, options);
        out += node.parenNegative && node.value.numerator < 0n ? `(${text})` : text;
        break;
      }
      case 'rawfrac': {
        const negative = (node.numerator < 0n) !== (node.denominator < 0n);
        const n = node.numerator < 0n ? -node.numerator : node.numerator;
        const d = node.denominator < 0n ? -node.denominator : node.denominator;
        out += `${negative ? (options.ascii ? '-' : MINUS) : ''}${n}/${d}`;
        break;
      }
      case 'op':
        out += ['(', '[', '{'].includes(node.op) ? ` ${node.op}` : [')', ']', '}', ','].includes(node.op) ? `${node.op} ` : ` ${opText(node.op, options)} `;
        break;
      case 'pow':
        out += `${wrapIfNeeded(nodesToText(node.base, options))}^${nodesToText(node.exponent, options)}`;
        break;
      case 'root':
        out += `${node.index === 3 ? (options.ascii ? 'cbrt' : '∛') : options.ascii ? 'sqrt' : '√'}(${nodesToText(node.radicand, options)})`;
        break;
      case 'abs':
        out += `|${nodesToText(node.inner, options)}|`;
        break;
      case 'var':
        out += node.name;
        break;
      case 'blank':
        out += node.label ? ` ${node.label} ` : ' ? ';
        break;
      case 'br':
        out += '\n';
        break;
    }
  }
  return out
    .replace(/[ \t]+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n')
    .trim();
}

function opText(op: string, options: FormatOptions): string {
  if (!options.ascii) return op;
  switch (op) {
    case '−':
      return '-';
    case '×':
      return 'x';
    case '÷':
      return '/';
    case '≤':
      return '<=';
    case '≥':
      return '>=';
    case '≠':
      return '!=';
    case '·':
      return '*';
    default:
      return op;
  }
}

function wrapIfNeeded(text: string): string {
  return /^[\w.]+$/.test(text) ? text : `(${text})`;
}

function minuteHandText(minute: number): string {
  if (minute % 5 === 0) return `points to the ${minute === 0 ? 12 : minute / 5}`;
  const lo = Math.floor(minute / 5);
  return `is between the ${lo === 0 ? 12 : lo} and the ${lo + 1}`;
}

export function visualToText(visual: Visual, options: FormatOptions = {}): string {
  switch (visual.v) {
    case 'clock':
      return `[An analog clock: the short hour hand is ${visual.minute === 0 ? 'on' : 'just past'} the ${visual.hour}; the long minute hand ${minuteHandText(visual.minute)}.]`;
    case 'objects':
      // Counts are deliberately omitted: "How many?" questions would otherwise reveal their answer.
      return `[Picture: ${visual.groups.map((g) => g.label ?? 'objects').join(' and ')}]`;
    case 'array':
      return `[An array: ${visual.rows} ${visual.rows === 1 ? 'row' : 'rows'} of ${visual.columns}]`;
    case 'fractionBar':
      return `[${visual.bars && visual.bars > 1 ? `${visual.bars} bars, each` : 'A bar'} split into ${visual.parts} equal parts; ${visual.shaded} part${visual.shaded === 1 ? '' : 's'} shaded]`;
    case 'numberLine': {
      const labels = visual.points.map((p) => p.label).join(', ');
      return `[A number line from ${formatNumber(visual.min, 'auto', undefined, options)} to ${formatNumber(visual.max, 'auto', undefined, options)} divided into ${visual.intervals} equal parts${labels ? `; point${visual.points.length > 1 ? 's' : ''} ${labels} marked` : ''}]`;
    }
    case 'coins': {
      const counts = new Map<string, number>();
      for (const c of visual.coins) counts.set(c, (counts.get(c) ?? 0) + 1);
      const names: Record<string, [string, string]> = {
        penny: ['penny', 'pennies'],
        nickel: ['nickel', 'nickels'],
        dime: ['dime', 'dimes'],
        quarter: ['quarter', 'quarters'],
        dollar: ['dollar bill', 'dollar bills'],
      };
      return `[${[...counts.entries()].map(([k, n]) => `${n} ${names[k]?.[n === 1 ? 0 : 1] ?? k}`).join(', ')}]`;
    }
    case 'table':
      return `[Table — ${visual.headers.join(' | ')}; ${visual.rows.map((r) => r.join(' | ')).join('; ')}]`;
    case 'shape':
      return `[A ${visual.shape}${visual.label ? ` (${visual.label})` : ''}]`;
  }
}

export function promptToText(p: StructuredPrompt, options: FormatOptions = {}): string {
  const body = nodesToText(p.nodes, options);
  return p.visual ? `${body} ${visualToText(p.visual, options)}` : body;
}

/** Strip characters the built-in PDF fonts cannot draw (they only cover Latin-1). */
export function toPdfSafeText(text: string): string {
  return text
    .replace(/[−–—]/g, '-')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/√/g, 'sqrt')
    .replace(/∛/g, 'cbrt')
    .replace(/π/g, 'pi')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/✓/g, 'Yes')
    .replace(/✗/g, 'No')
    .replace(/[²]/g, '^2')
    .replace(/[³]/g, '^3')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/gu, '');
}

/* ------------------------------------------------------------------ */
/* Prompt → speech (read-aloud for young children)                     */
/* ------------------------------------------------------------------ */

const OP_WORDS: Record<string, string> = {
  '+': 'plus',
  '−': 'minus',
  '×': 'times',
  '÷': 'divided by',
  '=': 'equals',
  '<': 'is less than',
  '>': 'is greater than',
  '≤': 'is less than or equal to',
  '≥': 'is greater than or equal to',
  '≠': 'is not equal to',
  ':': 'to',
  '%': 'percent',
  '·': 'times',
};

function numberWords(value: Rational, style: NumberStyle | undefined): string {
  const negative = value.numerator < 0n;
  const mag = rat(abs(value.numerator), value.denominator);
  const prefix = negative ? 'negative ' : '';
  if (style === 'money') return `${prefix}${toDecimalString(mag, 2).replace(/^(\d+)\.(\d\d)$/, (_m, d, c) => `${d} dollars and ${Number(c)} cents`)}`;
  if (style === 'percent') return `${prefix}${toDecimalString(mul(mag, rat(100)))} percent`;
  if (isInteger(mag)) return `${prefix}${mag.numerator}`;
  if (style === 'decimal' || (style === undefined && isTerminating(mag) && mag.denominator % 10n === 0n)) {
    return `${prefix}${(isTerminating(mag) ? toDecimalString(mag) : toDecimalString(mag, 3)).replace('.', ' point ')}`;
  }
  const m = toMixed(mag);
  if (style !== 'fraction' && m.whole > 0n) return `${prefix}${m.whole} and ${m.numerator} over ${m.denominator}`;
  return `${prefix}${mag.numerator} over ${mag.denominator}`;
}

export function nodesToSpeech(nodes: readonly PromptNode[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    switch (node.t) {
      case 'text':
        parts.push(node.text);
        break;
      case 'num':
        parts.push(numberWords(node.value, node.style));
        break;
      case 'rawfrac':
        parts.push(`${node.numerator < 0n ? 'negative ' : ''}${node.numerator < 0n ? -node.numerator : node.numerator} over ${node.denominator}`);
        break;
      case 'op':
        if (['(', ')', '[', ']', '{', '}', ','].includes(node.op)) break;
        parts.push(OP_WORDS[node.op] ?? node.op);
        break;
      case 'pow': {
        const exp = nodesToText(node.exponent);
        parts.push(`${nodesToSpeech(node.base)} ${exp === '2' ? 'squared' : exp === '3' ? 'cubed' : `to the power of ${exp}`}`);
        break;
      }
      case 'root':
        parts.push(`the ${node.index === 3 ? 'cube' : 'square'} root of ${nodesToSpeech(node.radicand)}`);
        break;
      case 'abs':
        parts.push(`the absolute value of ${nodesToSpeech(node.inner)}`);
        break;
      case 'var':
        parts.push(node.name);
        break;
      case 'blank':
        parts.push('what');
        break;
      case 'br':
        parts.push('.');
        break;
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').replace(/ \./g, '.').trim();
}

export function promptToSpeech(p: StructuredPrompt): string {
  return nodesToSpeech(p.nodes);
}

const CHOICE_SPEECH: Record<string, string> = {
  '<': 'less than',
  '>': 'greater than',
  '=': 'equal to',
  '≤': 'less than or equal to',
  '≥': 'greater than or equal to',
  '≠': 'not equal to',
};

/** What read-aloud says for a whole question: the prompt, then any answer choices ("Choose: less than, or greater than"). */
export function questionToSpeech(question: Question): string {
  const base = promptToSpeech(question.prompt);
  const choices = question.answerSchema.choices;
  if (!choices || choices.length === 0) return base;
  return `${base}. Choose: ${choices.map((c) => CHOICE_SPEECH[c.label] ?? c.label).join(', or ')}.`;
}
