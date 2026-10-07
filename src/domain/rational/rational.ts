/**
 * Exact rational arithmetic (spec §100, §110).
 *
 * Invariants of every Rational produced by this module:
 *   - denominator > 0
 *   - the sign lives on the numerator
 *   - gcd(|numerator|, denominator) === 1
 *   - zero is 0/1
 * Because every value is normalized, two Rationals are equal iff their fields are equal.
 * Never compare Rationals with `===` on the objects themselves; use `eq`.
 */

export interface Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export class RationalError extends Error {
  constructor(public readonly code: 'RATIONAL_DENOMINATOR_ZERO' | 'RATIONAL_DIVISION_BY_ZERO' | 'RATIONAL_NOT_INTEGER_INPUT' | 'RATIONAL_ZERO_TO_NEGATIVE_POWER' | 'RATIONAL_NOT_TERMINATING') {
    super(code);
    this.name = 'RationalError';
  }
}

/** Math.abs throws on bigint, so we need our own. */
export function abs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

export function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

export function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return abs(a * b) / gcd(a, b);
}

export function normalizeRational(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) {
    throw new RationalError('RATIONAL_DENOMINATOR_ZERO');
  }
  if (numerator === 0n) {
    return Object.freeze({ numerator: 0n, denominator: 1n });
  }
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = gcd(numerator, denominator);
  return Object.freeze({ numerator: numerator / divisor, denominator: denominator / divisor });
}

function toBig(x: bigint | number): bigint {
  if (typeof x === 'bigint') return x;
  if (!Number.isSafeInteger(x)) throw new RationalError('RATIONAL_NOT_INTEGER_INPUT');
  return BigInt(x);
}

/** Construct a normalized Rational from integers (numbers must be safe integers). */
export function rat(numerator: bigint | number, denominator: bigint | number = 1n): Rational {
  return normalizeRational(toBig(numerator), toBig(denominator));
}

export const ZERO: Rational = rat(0);
export const ONE: Rational = rat(1);

export function add(a: Rational, b: Rational): Rational {
  return normalizeRational(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
}

export function sub(a: Rational, b: Rational): Rational {
  return normalizeRational(a.numerator * b.denominator - b.numerator * a.denominator, a.denominator * b.denominator);
}

export function mul(a: Rational, b: Rational): Rational {
  return normalizeRational(a.numerator * b.numerator, a.denominator * b.denominator);
}

export function div(a: Rational, b: Rational): Rational {
  if (b.numerator === 0n) throw new RationalError('RATIONAL_DIVISION_BY_ZERO');
  return normalizeRational(a.numerator * b.denominator, a.denominator * b.numerator);
}

export function neg(a: Rational): Rational {
  return normalizeRational(-a.numerator, a.denominator);
}

export function absR(a: Rational): Rational {
  return normalizeRational(abs(a.numerator), a.denominator);
}

export function reciprocal(a: Rational): Rational {
  return div(ONE, a);
}

export function cmp(a: Rational, b: Rational): -1 | 0 | 1 {
  const left = a.numerator * b.denominator;
  const right = b.numerator * a.denominator;
  return left < right ? -1 : left > right ? 1 : 0;
}

export function eq(a: Rational, b: Rational): boolean {
  return a.numerator === b.numerator && a.denominator === b.denominator;
}

export const lt = (a: Rational, b: Rational) => cmp(a, b) < 0;
export const lte = (a: Rational, b: Rational) => cmp(a, b) <= 0;
export const gt = (a: Rational, b: Rational) => cmp(a, b) > 0;
export const gte = (a: Rational, b: Rational) => cmp(a, b) >= 0;
export const isZero = (a: Rational) => a.numerator === 0n;
export const isNegative = (a: Rational) => a.numerator < 0n;
export const isInteger = (a: Rational) => a.denominator === 1n;
export const sign = (a: Rational): -1 | 0 | 1 => (a.numerator < 0n ? -1 : a.numerator > 0n ? 1 : 0);

export function min(a: Rational, b: Rational): Rational {
  return lte(a, b) ? a : b;
}
export function max(a: Rational, b: Rational): Rational {
  return gte(a, b) ? a : b;
}

/** Integer power; negative exponents produce reciprocals. */
export function pow(a: Rational, exponent: number | bigint): Rational {
  const e = toBig(exponent);
  if (e === 0n) return ONE;
  if (e < 0n) {
    if (a.numerator === 0n) throw new RationalError('RATIONAL_ZERO_TO_NEGATIVE_POWER');
    return reciprocal(pow(a, -e));
  }
  return normalizeRational(a.numerator ** e, a.denominator ** e);
}

/** Truncate toward zero (BigInt division semantics). */
export function trunc(a: Rational): bigint {
  return a.numerator / a.denominator;
}

export function floor(a: Rational): bigint {
  const q = a.numerator / a.denominator;
  return a.numerator < 0n && q * a.denominator !== a.numerator ? q - 1n : q;
}

export function ceil(a: Rational): bigint {
  const q = a.numerator / a.denominator;
  return a.numerator > 0n && q * a.denominator !== a.numerator ? q + 1n : q;
}

/** Sum of a list. */
export function sum(values: readonly Rational[]): Rational {
  return values.reduce((acc, v) => add(acc, v), ZERO);
}

/* ------------------------------------------------------------------ */
/* Mixed numbers (spec §130)                                           */
/* Canonical interpretation: −2 1/3 = −(2 + 1/3) = −7/3.               */
/* The sign applies to the WHOLE mixed number, never only to the whole */
/* part. Conversion uses truncation toward zero, which matches this.   */
/* ------------------------------------------------------------------ */

export interface MixedParts {
  readonly sign: -1 | 0 | 1;
  /** magnitude of the whole part, >= 0 */
  readonly whole: bigint;
  /** magnitude of the fractional numerator, 0 <= numerator < denominator */
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export function toMixed(a: Rational): MixedParts {
  const s = sign(a);
  const n = abs(a.numerator);
  return Object.freeze({ sign: s, whole: n / a.denominator, numerator: n % a.denominator, denominator: a.denominator });
}

/** −(whole + numerator/denominator) when sign is −1. Parts must be non-negative. */
export function fromMixed(signValue: -1 | 1, whole: bigint, numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) throw new RationalError('RATIONAL_DENOMINATOR_ZERO');
  const magnitude = normalizeRational(abs(whole) * abs(denominator) + abs(numerator), abs(denominator));
  return signValue < 0 ? neg(magnitude) : magnitude;
}

/* ------------------------------------------------------------------ */
/* Decimal helpers                                                      */
/* ------------------------------------------------------------------ */

/** A rational has a terminating decimal expansion iff its reduced denominator has no prime factors other than 2 and 5. */
export function isTerminating(a: Rational): boolean {
  let d = a.denominator;
  while (d % 2n === 0n) d /= 2n;
  while (d % 5n === 0n) d /= 5n;
  return d === 1n;
}

/** Number of decimal places in the exact expansion of a terminating rational. */
export function decimalPlaces(a: Rational): number {
  if (!isTerminating(a)) throw new RationalError('RATIONAL_NOT_TERMINATING');
  let places = 0;
  let d = a.denominator;
  let twos = 0;
  let fives = 0;
  while (d % 2n === 0n) {
    d /= 2n;
    twos++;
  }
  while (d % 5n === 0n) {
    d /= 5n;
    fives++;
  }
  places = Math.max(twos, fives);
  return places;
}

/** Round half away from zero to the given number of decimal places (school rounding). */
export function roundToPlaces(a: Rational, places: number): Rational {
  const scale = 10n ** BigInt(places);
  const scaledNum = abs(a.numerator) * scale;
  const q = scaledNum / a.denominator;
  const r = scaledNum % a.denominator;
  const rounded = r * 2n >= a.denominator ? q + 1n : q;
  return normalizeRational(a.numerator < 0n ? -rounded : rounded, scale);
}

/**
 * Exact decimal string. If `places` is given, the value is rounded (half away from zero) and padded to exactly that many places.
 * Without `places`, the value must be terminating and the minimal exact expansion is returned.
 */
export function toDecimalString(a: Rational, places?: number): string {
  let value = a;
  let digits: number;
  if (places === undefined) {
    digits = decimalPlaces(a);
  } else {
    value = roundToPlaces(a, places);
    digits = places;
  }
  const scale = 10n ** BigInt(digits);
  const scaled = (abs(value.numerator) * scale) / value.denominator;
  const negative = value.numerator < 0n;
  const intPart = scaled / scale;
  const fracPart = scaled % scale;
  const body = digits === 0 ? intPart.toString() : `${intPart}.${fracPart.toString().padStart(digits, '0')}`;
  return negative ? `-${body}` : body;
}

/** Parse an exact decimal literal like "-12.035" or ".5". Throws on anything else. Generators use this for readable constants. */
export function fromDecimalString(text: string): Rational {
  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text.trim());
  if (!m || (m[2] === '' && (m[3] === undefined || m[3] === ''))) throw new Error(`Not a decimal literal: ${text}`);
  const intDigits = m[2] || '0';
  const fracDigits = m[3] ?? '';
  const scale = 10n ** BigInt(fracDigits.length);
  const magnitude = BigInt(intDigits) * scale + (fracDigits ? BigInt(fracDigits) : 0n);
  return normalizeRational(m[1] === '-' ? -magnitude : magnitude, scale);
}

/** For display/statistics only — never for equality. */
export function toNumber(a: Rational): number {
  return Number(a.numerator) / Number(a.denominator);
}

export function toFractionString(a: Rational): string {
  return a.denominator === 1n ? a.numerator.toString() : `${a.numerator}/${a.denominator}`;
}

export function toMixedString(a: Rational): string {
  const m = toMixed(a);
  if (m.numerator === 0n) return (m.sign < 0 ? '-' : '') + m.whole.toString();
  if (m.whole === 0n) return (m.sign < 0 ? '-' : '') + `${m.numerator}/${m.denominator}`;
  return (m.sign < 0 ? '-' : '') + `${m.whole} ${m.numerator}/${m.denominator}`;
}

/** Integer helpers frequently needed by generators. */
export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

export function primeFactors(n: number): number[] {
  const factors: number[] = [];
  let x = Math.abs(n);
  for (let p = 2; p * p <= x; p++) {
    while (x % p === 0) {
      factors.push(p);
      x /= p;
    }
  }
  if (x > 1) factors.push(x);
  return factors;
}

export function gcdNum(a: number, b: number): number {
  return Number(gcd(BigInt(a), BigInt(b)));
}

export function lcmNum(a: number, b: number): number {
  return Number(lcm(BigInt(a), BigInt(b)));
}
