import { describe, expect, it } from 'vitest';
import { SCHEMA } from '../../domain/question/build';
import { rat, fromDecimalString } from '../../domain/rational/rational';
import { parseAnswer } from '../../parsers/parseAnswer';
import { normalizeInput } from '../../parsers/normalize';

function value(raw: string, schema = SCHEMA.anyNumber()) {
  const r = parseAnswer(raw, schema);
  if (!r.ok) throw new Error(`parse failed: ${raw}: ${r.message}`);
  return r.answer;
}

describe('normalizeInput', () => {
  it('collapses but never removes whitespace (1 5/12 must not become 15/12)', () => {
    expect(normalizeInput('  1   5/12 ')).toBe('1 5/12');
  });
  it('maps unicode minus signs to hyphen-minus', () => {
    expect(normalizeInput('−3')).toBe('-3');
  });
});

describe('parseAnswer', () => {
  it('reads 17/12, 34/24 and 1 5/12 as the same value', () => {
    const a = value('17/12', SCHEMA.fraction());
    const b = value('34/24', SCHEMA.fraction());
    const c = value('1 5/12', SCHEMA.fraction());
    for (const p of [a, b, c]) expect(p.value).toEqual({ type: 'NUMBER', value: rat(17, 12) });
    expect(b.form.lowestTerms).toBe(false);
    expect(c.form.kind).toBe('MIXED_NUMBER');
  });
  it('"1 5/12" and "15/12" are different values', () => {
    expect(value('15/12', SCHEMA.fraction()).value).toEqual({ type: 'NUMBER', value: rat(5, 4) });
  });
  it('applies the sign of a mixed number to the whole thing', () => {
    expect(value('-2 1/3', SCHEMA.fraction()).value).toEqual({ type: 'NUMBER', value: rat(-7, 3) });
  });
  it('rejects zero denominators as invalid input', () => {
    const r = parseAnswer('3/0', SCHEMA.fraction());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('ZERO_DENOMINATOR');
  });
  it('"twelve-ish" is a syntax error, not a wrong answer', () => {
    const r = parseAnswer('twelve-ish', SCHEMA.integer());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('SYNTAX');
  });
  it('empty input is reported as EMPTY', () => {
    const r = parseAnswer('   ', SCHEMA.integer());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('EMPTY');
  });
  it('parses decimals exactly', () => {
    expect(value('0.1').value).toEqual({ type: 'NUMBER', value: fromDecimalString('0.1') });
    expect(value('1,234.5').value).toEqual({ type: 'NUMBER', value: fromDecimalString('1234.5') });
  });
  it('strips units and currency symbols', () => {
    expect(value('$3.25', SCHEMA.money()).value).toEqual({ type: 'NUMBER', value: fromDecimalString('3.25') });
    expect(value('63¢', SCHEMA.cents()).value).toEqual({ type: 'NUMBER', value: rat(63) });
    expect(value('12 cm', SCHEMA.anyNumber(['cm'])).value).toEqual({ type: 'NUMBER', value: rat(12) });
  });
  it('percent context: bare 25 means 25%', () => {
    expect(value('25', SCHEMA.percent()).value).toEqual({ type: 'NUMBER', value: rat(1, 4) });
    expect(value('12.5%', SCHEMA.percent()).value).toEqual({ type: 'NUMBER', value: rat(1, 8) });
  });
  it('probability answers accept fraction, decimal and percent', () => {
    for (const t of ['1/4', '0.25', '25%']) expect(value(t, SCHEMA.probability()).value).toEqual({ type: 'NUMBER', value: rat(1, 4) });
  });
  it('ratios', () => {
    expect(value('3:5', SCHEMA.ratio()).value).toEqual({ type: 'RATIO', first: rat(3), second: rat(5) });
    expect(value('3 to 5', SCHEMA.ratio()).value).toEqual({ type: 'RATIO', first: rat(3), second: rat(5) });
  });
  it('times', () => {
    expect(value('3:05', SCHEMA.time()).value).toEqual({ type: 'TIME', hour: 3, minute: 5 });
    expect(value('3:05 pm', SCHEMA.time(true)).value).toEqual({ type: 'TIME', hour: 3, minute: 5, period: 'PM' });
    expect(value('15:05', SCHEMA.time(true)).value).toEqual({ type: 'TIME', hour: 3, minute: 5, period: 'PM' });
  });
  it('ordered pairs', () => {
    expect(value('(3, -2)', SCHEMA.pair()).value).toEqual({ type: 'PAIR', x: rat(3), y: rat(-2) });
    expect(value('3,−2', SCHEMA.pair()).value).toEqual({ type: 'PAIR', x: rat(3), y: rat(-2) });
  });
  it('quotient with remainder', () => {
    expect(value('8 R 3', SCHEMA.quotientRemainder()).value).toEqual({ type: 'QR', quotient: 8n, remainder: 3n });
    expect(value('8r3', SCHEMA.quotientRemainder()).value).toEqual({ type: 'QR', quotient: 8n, remainder: 3n });
    expect(value('8', SCHEMA.quotientRemainder()).value).toEqual({ type: 'QR', quotient: 8n, remainder: 0n });
  });
  it('scientific notation', () => {
    for (const t of ['4.5 x 10^4', '4.5 × 10⁴', '4.5*10^4', '4.5e4']) {
      const p = value(t, SCHEMA.scientific());
      expect(p.value).toEqual({ type: 'NUMBER', value: rat(45000) });
      expect(p.form.normalizedScientific).toBe(true);
    }
    expect(value('45 x 10^3', SCHEMA.scientific()).form.normalizedScientific).toBe(false);
    expect(value('3 x 10^-2', SCHEMA.scientific()).value).toEqual({ type: 'NUMBER', value: rat(3, 100) });
  });
  it('prime factorizations', () => {
    for (const t of ['2 x 2 x 2 x 3', '2*2*2*3', '2^3 × 3', '2³ · 3']) {
      const p = value(t, SCHEMA.factorization());
      expect(p.value).toEqual({ type: 'NUMBER', value: rat(24) });
      expect(p.form.allPrimeFactors).toBe(true);
    }
    expect(value('4 x 6', SCHEMA.factorization()).form.allPrimeFactors).toBe(false);
  });
  it('linear expressions', () => {
    expect(value('6x - 12', SCHEMA.expression()).value).toEqual({ type: 'LINEAR', variable: 'x', coefficient: rat(6), constant: rat(-12) });
    expect(value('-12+6x', SCHEMA.expression()).value).toEqual({ type: 'LINEAR', variable: 'x', coefficient: rat(6), constant: rat(-12) });
    expect(value('x', SCHEMA.expression()).value).toEqual({ type: 'LINEAR', variable: 'x', coefficient: rat(1), constant: rat(0) });
    expect(value('2x + 4x', SCHEMA.expression()).form.likeTermsCombined).toBe(false);
    expect(parseAnswer('3(2x - 4)', SCHEMA.expression()).ok).toBe(false);
  });
  it('choices', () => {
    const schema = SCHEMA.choice([{ id: '<', label: '<' }, { id: '>', label: '>' }]);
    expect(value('<', schema).value).toEqual({ type: 'CHOICE', id: '<' });
    expect(parseAnswer('?', schema).ok).toBe(false);
  });
});
