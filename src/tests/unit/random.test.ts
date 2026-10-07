import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createSeededRandom, generateSeedString } from '../../domain/random/random';

describe('RandomSource (spec §070)', () => {
  it('same seed ⇒ same sequence', () => {
    const a = createSeededRandom('RIHAAN-QUIZ-2026-001');
    const b = createSeededRandom('RIHAAN-QUIZ-2026-001');
    const seqA = Array.from({ length: 50 }, () => a.integer(1, 1000));
    const seqB = Array.from({ length: 50 }, () => b.integer(1, 1000));
    expect(seqA).toEqual(seqB);
  });
  it('different seeds diverge', () => {
    const a = createSeededRandom('seed-1');
    const b = createSeededRandom('seed-2');
    expect(Array.from({ length: 20 }, () => a.nextFloat())).not.toEqual(Array.from({ length: 20 }, () => b.nextFloat()));
  });
  it('integer() stays within inclusive bounds', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: 0, max: 1000 }), (seed, min, width) => {
        const r = createSeededRandom(seed);
        for (let i = 0; i < 20; i++) {
          const v = r.integer(min, min + width);
          expect(v).toBeGreaterThanOrEqual(min);
          expect(v).toBeLessThanOrEqual(min + width);
          expect(Number.isInteger(v)).toBe(true);
        }
      }),
    );
  });
  it('rejects inverted ranges and empty choices', () => {
    const r = createSeededRandom('x');
    expect(() => r.integer(5, 1)).toThrow();
    expect(() => r.choose([])).toThrow();
  });
  it('shuffle returns a permutation without mutating the input', () => {
    const r = createSeededRandom('x');
    const input = [1, 2, 3, 4, 5, 6];
    const out = r.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
  });
  it('covers the whole range roughly uniformly', () => {
    const r = createSeededRandom('uniform');
    const counts = new Array(6).fill(0);
    for (let i = 0; i < 6000; i++) counts[r.integer(0, 5)]++;
    for (const c of counts) expect(c).toBeGreaterThan(850);
  });
  it('generates readable seeds', () => {
    expect(generateSeedString()).toMatch(/^RIHAAN-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
});

describe('numeric worksheet / quiz codes', () => {
  it('are 4–7 digit numbers with no leading zero', async () => {
    const { generateNumericCode, isValidNumericCode } = await import('../../domain/random/random');
    for (let i = 0; i < 200; i++) {
      const c = generateNumericCode(4);
      expect(c).toMatch(/^[1-9]\d{3}$/);
      expect(isValidNumericCode(c)).toBe(true);
    }
    expect(generateNumericCode(7)).toMatch(/^[1-9]\d{6}$/);
    expect(isValidNumericCode('123')).toBe(false);
    expect(isValidNumericCode('12345678')).toBe(false);
    expect(isValidNumericCode('WS-ABCD')).toBe(false);
  });
});
