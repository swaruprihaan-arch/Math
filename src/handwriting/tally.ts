/**
 * Tally-mark answer logic. Pure TypeScript (no React, no DOM) so it is unit-testable.
 *
 * - countTallyStrokes: every drawn line is ONE tally mark (the diagonal "5th" stroke too); dots and tiny
 *   scribbles are ignored, and a wiggly line still counts once.
 * - tallyGroups: split a count into bundles of five plus loose ones.
 * - convertDelay: how long the pad waits after the last stroke before turning ink into marks.
 * - reconcileSelection: keeps the tap-mode slot selection in step with a count set from outside.
 */

export type Point = { x: number; y: number };

/** Marks per bundle (four strokes crossed by a fifth). */
export const TALLY_GROUP_SIZE = 5;

/** A stroke shorter than this fraction of the pad height is a dot / accidental touch, not a mark. */
export const MIN_STROKE_FRACTION = 0.12;

/** Absolute floor (CSS px) for the minimum stroke length, used when the pad height is unknown or tiny. */
export const MIN_STROKE_PX = 4;

/**
 * Quiet time after the last stroke before drawn ink is converted into neat tally marks. Generous on purpose:
 * young children pause while counting (especially before the crossing fifth stroke) and should be able to
 * finish a bundle before their marks turn into the total.
 */
export const TALLY_CONVERT_DELAY_MS = 1500;

/** Shorter quiet time right after a whole bundle (5, 10, 15 … marks) is waiting: the child just finished one. */
export const TALLY_BUNDLE_CONVERT_DELAY_MS = 450;

/** Length of the ink → neat marks conversion animation. */
export const TALLY_CONVERT_ANIMATION_MS = 1100;

const finitePoint = (p: Point): boolean => Number.isFinite(p.x) && Number.isFinite(p.y);

/** Total path length of a stroke (sum of segment lengths). Non-finite points are skipped. */
export function strokeLength(stroke: readonly Point[]): number {
  let total = 0;
  let prev: Point | null = null;
  for (const p of stroke) {
    if (!finitePoint(p)) continue;
    if (prev) total += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return total;
}

export interface InkBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Bounding box of all finite points, or null when there are none. */
export function inkBounds(strokes: readonly (readonly Point[])[]): InkBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    for (const p of s) {
      if (!finitePoint(p)) continue;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

/** Minimum path length (px) for a stroke to count as a mark on a pad of this height. */
export function minStrokeLength(padHeight: number): number {
  const h = Number.isFinite(padHeight) && padHeight > 0 ? padHeight : 0;
  return Math.max(MIN_STROKE_PX, h * MIN_STROKE_FRACTION);
}

/**
 * Does this single stroke count as one tally mark?
 * It must be long enough (path length ≥ 12% of the pad height) AND reach far enough
 * (its bounding box must span ≥ 75% of that length) so a tight little scribble with lots of ink is ignored.
 */
export function isTallyStroke(stroke: readonly Point[], padHeight: number): boolean {
  const minLen = minStrokeLength(padHeight);
  if (strokeLength(stroke) < minLen) return false;
  const box = inkBounds([stroke]);
  if (!box) return false;
  const span = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  return span >= minLen * 0.75;
}

/** Number of tally marks drawn: one per real stroke (straight, diagonal or wiggly); dots and tiny scribbles are ignored. */
export function countTallyStrokes(strokes: readonly (readonly Point[])[], padHeight: number): number {
  let n = 0;
  for (const s of strokes) if (isTallyStroke(s, padHeight)) n++;
  return n;
}

/** Whole, non-negative count (non-finite → 0). */
function wholeCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

/** How long to wait before converting `pendingMarks` drawn marks: short after a full bundle, generous otherwise. */
export function convertDelay(pendingMarks: number): number {
  const n = wholeCount(pendingMarks);
  return n > 0 && n % TALLY_GROUP_SIZE === 0 ? TALLY_BUNDLE_CONVERT_DELAY_MS : TALLY_CONVERT_DELAY_MS;
}

/** Split a count into bundles of five and loose ones: 13 → { fives: 2, ones: 3 }. */
export function tallyGroups(count: number): { fives: number; ones: number } {
  const n = wholeCount(count);
  return { fives: Math.floor(n / TALLY_GROUP_SIZE), ones: n % TALLY_GROUP_SIZE };
}

/** Clamp a count to a whole number in [0, max]. */
export function clampCount(count: number, max: number): number {
  return Math.min(wholeCount(count), wholeCount(max));
}

/** How many slots are switched on. */
export function selectedCount(selected: readonly boolean[]): number {
  let n = 0;
  for (const on of selected) if (on) n++;
  return n;
}

/** Round up to a whole number of bundles of five. */
export function roundUpToGroup(n: number): number {
  return Math.ceil(wholeCount(n) / TALLY_GROUP_SIZE) * TALLY_GROUP_SIZE;
}

/**
 * Keep the tap-mode slot selection consistent with `count` (clamped to [0, max]):
 * - if the number of selected slots already equals the count, the SAME array is returned (the child's own
 *   choice of which marks are on is kept; only trimmed when it has more than `max` slots);
 * - count 0 → every slot off;
 * - otherwise the first `count` slots are on, adding bundles of five (up to `max` slots) when needed.
 * The result never has more than `max` slots.
 */
export function reconcileSelection(selected: readonly boolean[], count: number, max: number): readonly boolean[] {
  const limit = wholeCount(max);
  const v = clampCount(count, limit);
  const base = selected.length > limit ? selected.slice(0, limit) : selected;
  if (selectedCount(base) === v) return base;
  const length = Math.min(limit, Math.max(base.length, roundUpToGroup(v)));
  if (v === 0) return new Array<boolean>(length).fill(false);
  return Array.from({ length }, (_, i) => i < v);
}
