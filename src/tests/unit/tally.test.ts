import { describe, expect, it } from 'vitest';
import {
  TALLY_BUNDLE_CONVERT_DELAY_MS,
  TALLY_CONVERT_DELAY_MS,
  clampCount,
  convertDelay,
  countTallyStrokes,
  inkBounds,
  isTallyStroke,
  reconcileSelection,
  selectedCount,
  strokeLength,
  tallyGroups,
  type Point,
} from '../../handwriting/tally';

const H = 200; // pad height → minimum mark length 24px

/** Straight line from (x1,y1) to (x2,y2) sampled every ~4px, like pointer events. */
function line(x1: number, y1: number, x2: number, y2: number): Point[] {
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4));
  return Array.from({ length: steps + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }));
}

const upright = (x: number) => line(x, 30, x + 2, 170);

describe('countTallyStrokes', () => {
  it('counts each straight upright stroke as one mark', () => {
    expect(countTallyStrokes([upright(20)], H)).toBe(1);
    expect(countTallyStrokes([upright(20), upright(40), upright(60), upright(80)], H)).toBe(4);
  });

  it('counts a diagonal "fifth" stroke as one mark, so a full bundle is five', () => {
    const diagonal = line(10, 160, 100, 40);
    expect(countTallyStrokes([diagonal], H)).toBe(1);
    expect(countTallyStrokes([upright(20), upright(40), upright(60), upright(80), diagonal], H)).toBe(5);
  });

  it('ignores dots and tiny taps', () => {
    const dot: Point[] = [{ x: 50, y: 50 }];
    const tap: Point[] = [
      { x: 50, y: 50 },
      { x: 52, y: 51 },
    ];
    const short = line(50, 50, 50, 60); // 10px < 12% of 200
    expect(countTallyStrokes([dot, tap, short], H)).toBe(0);
    expect(countTallyStrokes([dot, upright(20), tap, upright(40)], H)).toBe(2);
    expect(countTallyStrokes([[]], H)).toBe(0);
  });

  it('ignores a tight little scribble even when it has lots of ink', () => {
    const scribble: Point[] = [];
    for (let i = 0; i < 40; i++) scribble.push({ x: 50 + (i % 2 === 0 ? 0 : 8), y: 50 + (i % 4 < 2 ? 0 : 8) });
    expect(strokeLength(scribble)).toBeGreaterThan(24);
    expect(isTallyStroke(scribble, H)).toBe(false);
  });

  it('counts a wiggly line only once', () => {
    const wiggly: Point[] = Array.from({ length: 36 }, (_, i) => ({ x: 40 + (i % 2 === 0 ? -6 : 6), y: 30 + i * 4 }));
    expect(countTallyStrokes([wiggly], H)).toBe(1);
  });

  it('scales the minimum length with the pad height', () => {
    const s = line(10, 10, 10, 40); // 30px
    expect(countTallyStrokes([s], 200)).toBe(1); // needs 24px
    expect(countTallyStrokes([s], 400)).toBe(0); // needs 48px
  });

  it('copes with odd pad heights and non-finite points', () => {
    expect(countTallyStrokes([upright(20)], 0)).toBe(1);
    expect(countTallyStrokes([upright(20)], Number.NaN)).toBe(1);
    expect(countTallyStrokes([[{ x: Number.NaN, y: 0 }, { x: 1, y: Number.POSITIVE_INFINITY }]], H)).toBe(0);
  });
});

describe('tallyGroups', () => {
  it('splits a count into bundles of five and ones', () => {
    expect(tallyGroups(0)).toEqual({ fives: 0, ones: 0 });
    expect(tallyGroups(4)).toEqual({ fives: 0, ones: 4 });
    expect(tallyGroups(5)).toEqual({ fives: 1, ones: 0 });
    expect(tallyGroups(13)).toEqual({ fives: 2, ones: 3 });
    expect(tallyGroups(100)).toEqual({ fives: 20, ones: 0 });
  });
  it('treats negatives, fractions and non-numbers safely', () => {
    expect(tallyGroups(-3)).toEqual({ fives: 0, ones: 0 });
    expect(tallyGroups(7.9)).toEqual({ fives: 1, ones: 2 });
    expect(tallyGroups(Number.NaN)).toEqual({ fives: 0, ones: 0 });
  });
});

describe('helpers', () => {
  it('clampCount keeps whole numbers within [0, max]', () => {
    expect(clampCount(12, 10)).toBe(10);
    expect(clampCount(-1, 10)).toBe(0);
    expect(clampCount(3.7, 10)).toBe(3);
  });
  it('inkBounds finds the box around all strokes', () => {
    expect(inkBounds([])).toBeNull();
    expect(inkBounds([line(10, 20, 30, 40), [{ x: 5, y: 50 }]])).toEqual({ minX: 5, minY: 20, maxX: 30, maxY: 50 });
  });
});

describe('reconcileSelection', () => {
  const off = (n: number) => new Array<boolean>(n).fill(false);

  it('keeps the same selection when the count already matches', () => {
    const sel = off(20).map((_, i) => i === 2 || i === 7);
    expect(reconcileSelection(sel, 2, 100)).toBe(sel);
  });
  it('count 0 switches every slot off and keeps the number of slots', () => {
    const sel = off(25).map((_, i) => i < 9);
    const next = reconcileSelection(sel, 0, 100);
    expect(next).toHaveLength(25);
    expect(selectedCount(next)).toBe(0);
  });
  it('a different count selects the first N slots in order', () => {
    const sel = off(20).map((_, i) => i === 10);
    const next = reconcileSelection(sel, 3, 100);
    expect(next.slice(0, 4)).toEqual([true, true, true, false]);
    expect(selectedCount(next)).toBe(3);
  });
  it('adds bundles of five when the count needs more slots, capped at max', () => {
    expect(reconcileSelection(off(20), 23, 100)).toHaveLength(25);
    expect(selectedCount(reconcileSelection(off(20), 23, 100))).toBe(23);
    const capped = reconcileSelection(off(20), 50, 22);
    expect(capped).toHaveLength(22);
    expect(selectedCount(capped)).toBe(22);
  });
});

describe('convertDelay', () => {
  it('is generous for an unfinished bundle and short right after a whole bundle', () => {
    expect(convertDelay(0)).toBe(TALLY_CONVERT_DELAY_MS);
    expect(convertDelay(1)).toBe(TALLY_CONVERT_DELAY_MS);
    expect(convertDelay(4)).toBe(TALLY_CONVERT_DELAY_MS);
    expect(convertDelay(5)).toBe(TALLY_BUNDLE_CONVERT_DELAY_MS);
    expect(convertDelay(10)).toBe(TALLY_BUNDLE_CONVERT_DELAY_MS);
    expect(convertDelay(11)).toBe(TALLY_CONVERT_DELAY_MS);
    expect(convertDelay(Number.NaN)).toBe(TALLY_CONVERT_DELAY_MS);
    expect(TALLY_BUNDLE_CONVERT_DELAY_MS).toBeLessThan(TALLY_CONVERT_DELAY_MS);
  });
});
