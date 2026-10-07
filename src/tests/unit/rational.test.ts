import { describe, expect, it } from 'vitest';
import {
  add, cmp, decimalPlaces, div, eq, floor, fromDecimalString, fromMixed, gcd, isTerminating, lcm, mul, normalizeRational,
  pow, rat, RationalError, roundToPlaces, sub, toDecimalString, toMixed, toMixedString,
} from '../../domain/rational/rational';

describe('normalizeRational (spec §100)', () => {
  it('moves the sign to the numerator and reduces: 6/-8 → -3/4', () => {
    expect(normalizeRational(6n, -8n)).toEqual({ numerator: -3n, denominator: 4n });
  });
  it('normalizes zero to 0/1', () => {
    expect(normalizeRational(0n, 999n)).toEqual({ numerator: 0n, denominator: 1n });
    expect(normalizeRational(0n, -5n)).toEqual({ numerator: 0n, denominator: 1n });
  });
  it('rejects a zero denominator', () => {
    expect(() => normalizeRational(1n, 0n)).toThrowError('RATIONAL_DENOMINATOR_ZERO');
  });
  it('returns frozen values', () => {
    expect(Object.isFrozen(rat(3, 4))).toBe(true);
  });
  it('rejects non-integer number inputs instead of silently truncating', () => {
    expect(() => rat(1.5)).toThrow(RationalError);
  });
});

describe('rational operations (spec §110)', () => {
  it('3/4 + 2/3 = 17/12', () => expect(add(rat(3, 4), rat(2, 3))).toEqual(rat(17, 12)));
  it('subtracts', () => expect(sub(rat(1, 2), rat(3, 4))).toEqual(rat(-1, 4)));
  it('multiplies', () => expect(mul(rat(2, 3), rat(9, 4))).toEqual(rat(3, 2)));
  it('divides', () => expect(div(rat(1, 3), rat(4))).toEqual(rat(1, 12)));
  it('division by zero is rejected explicitly', () => {
    expect(() => div(rat(1, 2), rat(0))).toThrowError('RATIONAL_DIVISION_BY_ZERO');
  });
  it('compares exactly', () => {
    expect(cmp(rat(1, 3), rat(333, 1000))).toBe(1);
    expect(eq(rat(2, 4), rat(1, 2))).toBe(true);
  });
  it('integer powers including negative exponents', () => {
    expect(pow(rat(2), -3)).toEqual(rat(1, 8));
    expect(pow(rat(-2, 3), 3)).toEqual(rat(-8, 27));
  });
  it('gcd/lcm work on bigint (Math.abs would throw)', () => {
    expect(gcd(-12n, 18n)).toBe(6n);
    expect(lcm(4n, 6n)).toBe(12n);
  });
  it('floor rounds toward negative infinity', () => {
    expect(floor(rat(-7, 3))).toBe(-3n);
    expect(floor(rat(7, 3))).toBe(2n);
  });
});

describe('mixed numbers (spec §130)', () => {
  it('2 3/5 = 13/5', () => expect(fromMixed(1, 2n, 3n, 5n)).toEqual(rat(13, 5)));
  it('-2 1/3 = -(2 + 1/3) = -7/3 (canonical interpretation)', () => {
    expect(fromMixed(-1, 2n, 1n, 3n)).toEqual(rat(-7, 3));
  });
  it('-7/3 converts back to -2 1/3 (truncation toward zero, not floor)', () => {
    expect(toMixed(rat(-7, 3))).toEqual({ sign: -1, whole: 2n, numerator: 1n, denominator: 3n });
    expect(toMixedString(rat(-7, 3))).toBe('-2 1/3');
  });
  it('17/12 is 1 5/12', () => expect(toMixedString(rat(17, 12))).toBe('1 5/12'));
});

describe('decimals', () => {
  it('detects terminating expansions', () => {
    expect(isTerminating(rat(3, 8))).toBe(true);
    expect(isTerminating(rat(1, 3))).toBe(false);
    expect(decimalPlaces(rat(3, 8))).toBe(3);
  });
  it('formats exact decimals', () => {
    expect(toDecimalString(rat(3, 8))).toBe('0.375');
    expect(toDecimalString(rat(-1, 4))).toBe('-0.25');
    expect(toDecimalString(fromDecimalString('1234.50'))).toBe('1234.5');
  });
  it('rounds half away from zero', () => {
    expect(toDecimalString(rat(10, 3), 2)).toBe('3.33');
    expect(toDecimalString(fromDecimalString('2.345'), 2)).toBe('2.35');
    expect(toDecimalString(fromDecimalString('-2.345'), 2)).toBe('-2.35');
    expect(roundToPlaces(rat(1, 3), 0)).toEqual(rat(0));
  });
  it('0.1 + 0.2 is exactly 0.3', () => {
    expect(add(fromDecimalString('0.1'), fromDecimalString('0.2'))).toEqual(fromDecimalString('0.3'));
  });
  it('refuses to print a non-terminating value exactly', () => {
    expect(() => toDecimalString(rat(1, 3))).toThrow(RationalError);
  });
});
