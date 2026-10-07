/**
 * parseAnswer(rawInput, answerSchema) → ParseResult   (spec §010, §060 PARSING state)
 *
 * The parser is policy-free: it only decides whether the text is a readable answer of an accepted kind,
 * and records facts about the written form (lowest terms, proper mixed part, …) for the validator.
 */
import type { AnswerKind, AnswerSchema, ParsedAnswer, ParseResult } from '../domain/question/types';
import { parseDecimal } from './decimalParser';
import { parseLinearExpression } from './expressionParser';
import { parseFactorization } from './factorizationParser';
import { parseFraction } from './fractionParser';
import { parseInteger } from './integerParser';
import { parseMixedNumber } from './mixedNumberParser';
import { normalizeInput, stripUnits } from './normalize';
import { parsePair } from './pairParser';
import { parsePercentage } from './percentageParser';
import { parseQuotientRemainder } from './quotientRemainderParser';
import { parseRatio } from './ratioParser';
import { parseScientific } from './scientificParser';
import { parseTime } from './timeParser';

function fail(reason: Exclude<ParseResult, { ok: true }>['reason'], message: string): ParseResult {
  return { ok: false, reason, message };
}

function ok(answer: ParsedAnswer): ParseResult {
  return { ok: true, answer };
}

/** Priority order: more specific syntaxes first. */
const ORDER: AnswerKind[] = [
  'CHOICE',
  'QUOTIENT_REMAINDER',
  'TIME',
  'ORDERED_PAIR',
  'SCIENTIFIC',
  'FACTORIZATION',
  'EXPRESSION',
  'RATIO',
  'PERCENTAGE',
  'MIXED_NUMBER',
  'RATIONAL',
  'DECIMAL',
  'INTEGER',
];

export function parseAnswer(rawInput: string, schema: AnswerSchema): ParseResult {
  const raw = rawInput;
  const normalized = normalizeInput(rawInput);
  if (normalized === '') return fail('EMPTY', 'Type an answer first.');

  const accepts = new Set(schema.accepts);

  if (accepts.has('CHOICE')) {
    const choice = schema.choices?.find((c) => c.id === normalized || c.label.toLowerCase() === normalized.toLowerCase());
    if (choice) return ok({ raw, normalized: choice.id, value: { type: 'CHOICE', id: choice.id }, form: { kind: 'CHOICE' } });
    return fail('NOT_ALLOWED', 'Choose one of the answers.');
  }

  const text = stripUnits(normalized, schema.units);
  if (text === '') return fail('EMPTY', 'Type an answer first.');

  for (const kind of ORDER) {
    if (!accepts.has(kind)) continue;
    switch (kind) {
      case 'QUOTIENT_REMAINDER': {
        const r = parseQuotientRemainder(raw, text);
        if (r) return ok(r);
        break;
      }
      case 'TIME': {
        const r = parseTime(raw, text);
        if (r) return ok(r);
        break;
      }
      case 'ORDERED_PAIR': {
        const r = parsePair(raw, text);
        if (r) return ok(r);
        break;
      }
      case 'SCIENTIFIC': {
        const r = parseScientific(raw, text);
        if (r) return ok(r);
        break;
      }
      case 'FACTORIZATION': {
        const r = parseFactorization(raw, text);
        if (r) return ok(r);
        break;
      }
      case 'EXPRESSION': {
        const r = parseLinearExpression(raw, text, schema.variable ?? 'x');
        if (r && 'error' in r) return fail('SYNTAX', 'Write the expression without parentheses, for example 6x - 12.');
        if (r) return ok(r);
        break;
      }
      case 'RATIO': {
        const r = parseRatio(raw, text, !accepts.has('RATIONAL'));
        if (r) return ok(r);
        break;
      }
      case 'PERCENTAGE': {
        const r = parsePercentage(raw, text, schema.percentContext === true);
        if (r) return ok(r);
        break;
      }
      case 'MIXED_NUMBER': {
        const r = parseMixedNumber(raw, text);
        if (r && 'error' in r) return fail('ZERO_DENOMINATOR', 'A denominator can’t be 0.');
        if (r) return ok(r);
        break;
      }
      case 'RATIONAL': {
        const r = parseFraction(raw, text);
        if (r && 'error' in r) return fail('ZERO_DENOMINATOR', 'A denominator can’t be 0.');
        if (r) return ok(r);
        break;
      }
      case 'DECIMAL': {
        const r = parseDecimal(raw, text);
        if (r) return ok(r);
        break;
      }
      case 'INTEGER': {
        const r = parseInteger(raw, text);
        if (r) return ok(r);
        break;
      }
      default:
        break;
    }
  }

  // Helpful messages for common near-misses.
  if (!accepts.has('DECIMAL') && /^[+-]?\d*\.\d+$/.test(text) && !schema.percentContext) {
    return fail('NOT_ALLOWED', `Decimals aren’t used here. ${schema.hint}`);
  }
  if (!accepts.has('RATIONAL') && !accepts.has('MIXED_NUMBER') && /\//.test(text) && !accepts.has('RATIO')) {
    return fail('NOT_ALLOWED', `Fractions aren’t used here. ${schema.hint}`);
  }
  return fail('SYNTAX', `That isn’t an answer I can read. ${schema.hint}`);
}
