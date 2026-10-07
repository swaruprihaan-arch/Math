/**
 * Centralized randomness (spec §070). Generators MUST receive a RandomSource and MUST NOT use the global (unseeded) Math RNG.
 * A seeded source makes quizzes, worksheets and test failures exactly reproducible.
 */

export interface RandomSource {
  /** Uniform float in [0, 1). */
  nextFloat(): number;
  /** Uniform integer in [minInclusive, maxInclusive]. */
  integer(minInclusive: number, maxInclusive: number): number;
  choose<T>(items: readonly T[]): T;
  /** Returns a new shuffled array; the input is not modified. */
  shuffle<T>(items: readonly T[]): T[];
  /** true with probability p (default 0.5). */
  bool(p?: number): boolean;
  /** Pick k distinct items (k <= items.length). */
  sample<T>(items: readonly T[], k: number): T[];
  /** Short deterministic token drawn from this stream (used for question ids). */
  token(): string;
  readonly seed: string;
}

/** cyrb128 string hash → four 32-bit seeds. */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** sfc32 PRNG returning uint32 values. */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return t >>> 0;
  };
}

const TWO_32 = 4294967296;
/** Bound for rejection sampling; after this many rejections we accept a (negligibly) biased draw rather than loop forever. */
const MAX_REJECTIONS = 64;

export class RandomRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RandomRangeError';
  }
}

export function createSeededRandom(seed: string | number): RandomSource {
  const seedText = String(seed);
  const [a, b, c, d] = cyrb128(seedText);
  const nextU32 = sfc32(a, b, c, d);
  // Warm up the generator so similar seeds diverge.
  for (let i = 0; i < 15; i++) nextU32();

  const source: RandomSource = {
    seed: seedText,
    nextFloat() {
      return nextU32() / TWO_32;
    },
    integer(minInclusive: number, maxInclusive: number) {
      if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxInclusive)) {
        throw new RandomRangeError(`integer() bounds must be safe integers (got ${minInclusive}, ${maxInclusive})`);
      }
      if (minInclusive > maxInclusive) {
        throw new RandomRangeError(`integer() min ${minInclusive} > max ${maxInclusive}`);
      }
      const range = maxInclusive - minInclusive + 1;
      if (range > TWO_32) {
        // Combine two draws for very wide ranges.
        const value = Math.floor(source.nextFloat() * range);
        return minInclusive + Math.min(value, range - 1);
      }
      const limit = Math.floor(TWO_32 / range) * range;
      let draw = nextU32();
      for (let i = 0; i < MAX_REJECTIONS && draw >= limit; i++) draw = nextU32();
      return minInclusive + (draw % range);
    },
    choose<T>(items: readonly T[]): T {
      if (items.length === 0) throw new RandomRangeError('choose() called with an empty list');
      return items[source.integer(0, items.length - 1)] as T;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = source.integer(0, i);
        const tmp = copy[i] as T;
        copy[i] = copy[j] as T;
        copy[j] = tmp;
      }
      return copy;
    },
    bool(p = 0.5) {
      return source.nextFloat() < p;
    },
    sample<T>(items: readonly T[], k: number): T[] {
      if (k > items.length) throw new RandomRangeError(`sample() k=${k} exceeds ${items.length} items`);
      return source.shuffle(items).slice(0, k);
    },
    token() {
      return (nextU32().toString(36) + nextU32().toString(36)).slice(0, 10);
    },
  };
  return source;
}

/** Derive an independent, reproducible stream for item i of a seeded set (e.g. question 7 of a worksheet). */
export function deriveSeed(seed: string, label: string | number): string {
  return `${seed}#${label}`;
}

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Create a fresh human-friendly seed such as "RIHAAN-7F3K-Q9PX".
 * This is the ONLY place where non-reproducible entropy enters the system; everything downstream is seeded.
 */
export function generateSeedString(prefix = 'RIHAAN'): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let body = '';
  bytes.forEach((b, i) => {
    body += SEED_ALPHABET[b % SEED_ALPHABET.length];
    if (i === 3) body += '-';
  });
  return `${prefix}-${body}`;
}

/** Simple numeric code (4–7 digits) for worksheets and quizzes, e.g. "4821". Uses real entropy (not seeded). */
export function generateNumericCode(digits = 4): string {
  const n = Math.max(4, Math.min(7, Math.round(digits)));
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b, i) => (i === 0 ? 1 + (b % 9) : b % 10)).join('');
}

/** A worksheet / quiz code is 4 to 7 digits. */
export function isValidNumericCode(code: string): boolean {
  return /^\d{4,7}$/.test(code);
}
