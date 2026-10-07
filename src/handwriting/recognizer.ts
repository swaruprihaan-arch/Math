/**
 * Handwriting → text for answers. Pure TypeScript (no DOM), so it is unit-testable.
 *
 * Pipeline:
 *   strokes → group into characters (horizontal overlap) → symbol heuristics ('.', '-', '/', ':')
 *   → rasterize each digit MNIST-style (20×20 box, centre of mass at 14,14 in 28×28) → MLP (98.5% on MNIST test).
 */
import { MODEL } from './model';

export interface Point {
  readonly x: number;
  readonly y: number;
}
export type Stroke = readonly Point[];

export interface CharacterGuess {
  readonly char: string;
  /** probability of the chosen character (symbols from heuristics get 0.9) */
  readonly confidence: number;
  /** second-best digit, if any */
  readonly alternative?: string;
}

export interface RecognitionResult {
  readonly text: string;
  readonly characters: readonly CharacterGuess[];
}

export interface RecognizeOptions {
  /** Characters allowed besides digits, e.g. "./-:" ; default allows all four. */
  readonly symbols?: string;
}

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */

interface Weights {
  w1: Float32Array;
  b1: Float32Array;
  w2: Float32Array;
  b2: Float32Array;
}

let weights: Weights | null = null;

function decodeBase64(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node fallback (tests)
  const B = (globalThis as unknown as { Buffer: { from(s: string, enc: string): Uint8Array } }).Buffer;
  return new Uint8Array(B.from(b64, 'base64'));
}

function loadWeights(): Weights {
  if (weights) return weights;
  const i8 = (b64: string, scale: number) => {
    const raw = decodeBase64(b64);
    const ints = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    return Float32Array.from(ints, (v) => v * scale);
  };
  const f32 = (b64: string) => {
    const raw = decodeBase64(b64);
    const copy = new Uint8Array(raw.byteLength);
    copy.set(raw);
    return new Float32Array(copy.buffer);
  };
  weights = { w1: i8(MODEL.w1, MODEL.w1Scale), b1: f32(MODEL.b1), w2: i8(MODEL.w2, MODEL.w2Scale), b2: f32(MODEL.b2) };
  return weights;
}

/** Softmax probabilities for a 28×28 image (values 0..1, row-major). */
export function classifyDigit(image: Float32Array): Float32Array {
  const { w1, b1, w2, b2 } = loadWeights();
  const H = MODEL.hidden;
  const h = new Float32Array(H);
  for (let j = 0; j < H; j++) h[j] = b1[j] as number;
  for (let i = 0; i < MODEL.input; i++) {
    const xi = image[i] as number;
    if (xi === 0) continue;
    const row = i * H;
    for (let j = 0; j < H; j++) h[j] = (h[j] as number) + xi * (w1[row + j] as number);
  }
  for (let j = 0; j < H; j++) if ((h[j] as number) < 0) h[j] = 0;
  const out = new Float32Array(MODEL.output);
  let max = -Infinity;
  for (let k = 0; k < MODEL.output; k++) {
    let z = b2[k] as number;
    for (let j = 0; j < H; j++) z += (h[j] as number) * (w2[j * MODEL.output + k] as number);
    out[k] = z;
    if (z > max) max = z;
  }
  let sum = 0;
  for (let k = 0; k < MODEL.output; k++) {
    out[k] = Math.exp((out[k] as number) - max);
    sum += out[k] as number;
  }
  for (let k = 0; k < MODEL.output; k++) out[k] = (out[k] as number) / sum;
  return out;
}

/* ------------------------------------------------------------------ */
/* Geometry                                                             */
/* ------------------------------------------------------------------ */

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boxOf(strokes: readonly Stroke[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes)
    for (const p of s) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  return { minX, minY, maxX, maxY };
}

function pathLength(s: Stroke): number {
  let len = 0;
  for (let i = 1; i < s.length; i++) len += Math.hypot((s[i] as Point).x - (s[i - 1] as Point).x, (s[i] as Point).y - (s[i - 1] as Point).y);
  return len;
}

/** Group strokes into characters: strokes whose horizontal extents overlap belong to the same character. */
export function segment(strokes: readonly Stroke[]): Stroke[][] {
  const items = strokes.filter((s) => s.length > 0).map((s) => ({ s, b: boxOf([s]) }));
  items.sort((a, b) => a.b.minX - b.b.minX);
  const groups: { strokes: Stroke[]; b: Box }[] = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last) {
      const overlap = Math.min(last.b.maxX, it.b.maxX) - Math.max(last.b.minX, it.b.minX);
      const narrower = Math.max(1, Math.min(last.b.maxX - last.b.minX, it.b.maxX - it.b.minX));
      if (overlap > -2 && overlap >= narrower * 0.25 - 2) {
        last.strokes.push(it.s);
        last.b = boxOf(last.strokes);
        continue;
      }
    }
    groups.push({ strokes: [it.s], b: it.b });
  }
  return groups.map((g) => g.strokes);
}

/* ------------------------------------------------------------------ */
/* Rasterization (MNIST style)                                          */
/* ------------------------------------------------------------------ */

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function render(strokes: readonly Stroke[], map: (p: Point) => Point, radius: number): Float32Array {
  const img = new Float32Array(784);
  const segs: [number, number, number, number][] = [];
  for (const s of strokes) {
    if (s.length === 1) {
      const p = map(s[0] as Point);
      segs.push([p.x, p.y, p.x, p.y]);
    }
    for (let i = 1; i < s.length; i++) {
      const a = map(s[i - 1] as Point);
      const b = map(s[i] as Point);
      segs.push([a.x, a.y, b.x, b.y]);
    }
  }
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      let d = Infinity;
      const cx = x + 0.5;
      const cy = y + 0.5;
      for (const [ax, ay, bx, by] of segs) {
        const dd = distToSegment(cx, cy, ax, ay, bx, by);
        if (dd < d) d = dd;
        if (d === 0) break;
      }
      const v = 1 - (d - radius);
      img[y * 28 + x] = v >= 1 ? 1 : v <= 0 ? 0 : v;
    }
  }
  return img;
}

/** Convert one character's strokes into a 28×28 MNIST-like image. */
export function rasterize(strokes: readonly Stroke[]): Float32Array {
  const b = boxOf(strokes);
  const w = Math.max(b.maxX - b.minX, 1);
  const h = Math.max(b.maxY - b.minY, 1);
  const scale = 20 / Math.max(w, h);
  const cx0 = (b.minX + b.maxX) / 2;
  const cy0 = (b.minY + b.maxY) / 2;
  const first = render(strokes, (p) => ({ x: (p.x - cx0) * scale + 14, y: (p.y - cy0) * scale + 14 }), 1.0);
  // shift so the centre of mass lands at (14, 14)
  let mass = 0;
  let mx = 0;
  let my = 0;
  for (let y = 0; y < 28; y++)
    for (let x = 0; x < 28; x++) {
      const v = first[y * 28 + x] as number;
      mass += v;
      mx += v * (x + 0.5);
      my += v * (y + 0.5);
    }
  if (mass === 0) return first;
  const sx = 14 - mx / mass;
  const sy = 14 - my / mass;
  return render(strokes, (p) => ({ x: (p.x - cx0) * scale + 14 + sx, y: (p.y - cy0) * scale + 14 + sy }), 1.0);
}

/* ------------------------------------------------------------------ */
/* Symbol heuristics                                                     */
/* ------------------------------------------------------------------ */

function symbolFor(group: readonly Stroke[], lineHeight: number, symbols: string): string | null {
  const b = boxOf(group);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const small = Math.max(w, h) < lineHeight * 0.22;
  if (group.length === 2 && symbols.includes(':')) {
    const boxes = group.map((s) => boxOf([s]));
    const tiny = boxes.every((bb) => Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY) < lineHeight * 0.25);
    const stacked = Math.abs((boxes[0] as Box).minY - (boxes[1] as Box).minY) > lineHeight * 0.25;
    if (tiny && stacked) return ':';
  }
  if (small && symbols.includes('.')) return '.';
  if (group.length === 1) {
    const s = group[0] as Stroke;
    const len = pathLength(s);
    const straight = len < Math.hypot(w, h) * 1.25 + 2;
    if (straight && symbols.includes('-') && h < w * 0.35 && w > lineHeight * 0.18) return '-';
    if (straight && symbols.includes('/') && w > h * 0.45 && h > lineHeight * 0.4) {
      const firstP = s[0] as Point;
      const lastP = s[s.length - 1] as Point;
      // "/" goes up to the right (bottom-left ↔ top-right)
      const rising = (lastP.x - firstP.x) * (lastP.y - firstP.y) < 0;
      if (rising) return '/';
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export function recognize(strokes: readonly Stroke[], options: RecognizeOptions = {}): RecognitionResult {
  const symbols = options.symbols ?? './-:';
  const groups = segment(strokes);
  if (groups.length === 0) return { text: '', characters: [] };
  const all = boxOf(groups.flat());
  const digitHeights = groups.map((g) => {
    const b = boxOf(g);
    return b.maxY - b.minY;
  });
  const lineHeight = Math.max(all.maxY - all.minY, ...digitHeights, 1);
  const characters: CharacterGuess[] = [];
  for (const g of groups) {
    const sym = symbolFor(g, lineHeight, symbols);
    if (sym) {
      characters.push({ char: sym, confidence: 0.9 });
      continue;
    }
    const probs = classifyDigit(rasterize(g));
    let best = 0;
    let second = 1;
    for (let k = 0; k < 10; k++) {
      if ((probs[k] as number) > (probs[best] as number)) {
        second = best;
        best = k;
      } else if (k !== best && (probs[k] as number) > (probs[second] as number)) {
        second = k;
      }
    }
    characters.push({ char: String(best), confidence: probs[best] as number, alternative: String(second) });
  }
  return { text: characters.map((c) => c.char).join(''), characters };
}
