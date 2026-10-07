import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { add, div, eq, gcd, mul, neg, normalizeRational, rat, sub, toMixed, fromMixed, toDecimalString, isTerminating, fromDecimalString, type Rational } from '../../domain/rational/rational';
import { parseAnswer } from '../../parsers/parseAnswer';
import { SCHEMA } from '../../domain/question/build';
import { formatNumber } from '../../domain/answer/format';

const bigInt = fc.bigInt({ min: -(10n ** 12n), max: 10n ** 12n });
const nonZero = bigInt.filter((n) => n !== 0n);
const rational: fc.Arbitrary<Rational> = fc.tuple(bigInt, nonZero).map(([n, d]) => normalizeRational(n, d));
const nonZeroRational = rational.filter((r) => r.numerator !== 0n);

describe('rational invariants (property)', () => {
  it('normalization: positive denominator, reduced, idempotent', () => {
    fc.assert(
      fc.property(bigInt, nonZero, (n, d) => {
        const r = normalizeRational(n, d);
        expect(r.denominator > 0n).toBe(true);
        expect(gcd(r.numerator, r.denominator) === 1n || r.numerator === 0n).toBe(true);
        expect(normalizeRational(r.numerator, r.denominator)).toEqual(r);
      }),
    );
  });
  it('field laws', () => {
    fc.assert(
      fc.property(rational, rational, rational, (a, b, c) => {
        expect(eq(add(a, b), add(b, a))).toBe(true);
        expect(eq(add(add(a, b), c), add(a, add(b, c)))).toBe(true);
        expect(eq(mul(a, add(b, c)), add(mul(a, b), mul(a, c)))).toBe(true);
        expect(eq(add(sub(a, b), b), a)).toBe(true);
        expect(eq(add(a, neg(a)), rat(0))).toBe(true);
      }),
    );
  });
  it('division inverts multiplication', () => {
    fc.assert(
      fc.property(rational, nonZeroRational, (a, b) => {
        expect(eq(mul(div(a, b), b), a)).toBe(true);
      }),
    );
  });
  it('mixed-number round trip', () => {
    fc.assert(
      fc.property(rational, (a) => {
        const m = toMixed(a);
        const back = fromMixed(m.sign < 0 ? -1 : 1, m.whole, m.numerator, m.denominator);
        expect(eq(back, a)).toBe(true);
      }),
    );
  });
  it('terminating decimals round-trip through text exactly', () => {
    fc.assert(
      fc.property(rational.filter(isTerminating), (a) => {
        expect(eq(fromDecimalString(toDecimalString(a)), a)).toBe(true);
      }),
    );
  });
  it('parse(format(x)) = x for fractions and mixed numbers', () => {
    fc.assert(
      fc.property(rational, fc.constantFrom('fraction', 'mixed') as fc.Arbitrary<'fraction' | 'mixed'>, (a, style) => {
        const text = formatNumber(a, style, undefined, { ascii: true, group: false });
        const parsed = parseAnswer(text, SCHEMA.fraction());
        expect(parsed.ok).toBe(true);
        if (parsed.ok && parsed.answer.value.type === 'NUMBER') expect(eq(parsed.answer.value.value, a)).toBe(true);
      }),
    );
  });
});
