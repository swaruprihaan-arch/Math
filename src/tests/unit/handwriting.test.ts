import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../../domain/random/random';
import { recognize, segment, type Point, type Stroke } from '../../handwriting/recognizer';

/** Synthetic pen strokes for digits in a 100×140 box (how a child might draw them). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, n = 24): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  });
}
function line(...pts: [number, number][]): Point[] {
  const out: Point[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1] as [number, number];
    const [bx, by] = pts[i] as [number, number];
    for (let k = 0; k < 10; k++) out.push({ x: ax + ((bx - ax) * k) / 10, y: ay + ((by - ay) * k) / 10 });
  }
  const [lx, ly] = pts[pts.length - 1] as [number, number];
  out.push({ x: lx, y: ly });
  return out;
}
export const DIGITS: Record<string, Stroke[]> = {
  '0': [arc(50, 70, 32, 58, -90, 270, 40)],
  '1': [line([40, 28], [55, 10], [55, 130])],
  '2': [[...arc(50, 42, 32, 30, 200, 360, 16), ...line([82, 42], [18, 130], [88, 130])]],
  '3': [[...arc(48, 40, 32, 30, 210, 450, 20), ...arc(48, 100, 36, 30, 270, 510, 20)]],
  '4': [line([58, 10], [14, 92], [92, 92]), line([66, 40], [66, 132])],
  '5': [line([82, 12], [28, 12], [24, 64]), [...arc(50, 94, 34, 36, 230, 450, 22)]],
  '6': [[...arc(56, 60, 34, 56, 280, 170, 14), ...arc(50, 100, 30, 30, 180, 540, 28)]],
  '7': [line([14, 12], [88, 12], [40, 132])],
  '8': [[...arc(50, 38, 26, 28, 90, 450, 26), ...arc(50, 100, 32, 32, -90, 270, 26)]],
  '9': [[...arc(50, 42, 30, 30, 0, 360, 26), ...line([80, 42], [72, 132])]],
};

function transform(strokes: Stroke[], seed: string, offsetX = 0): Stroke[] {
  const rng = createSeededRandom(seed);
  const angle = ((rng.nextFloat() - 0.5) * 14 * Math.PI) / 180;
  const scale = 0.8 + rng.nextFloat() * 0.5;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return strokes.map((st) =>
    st.map((p) => {
      const x = (p.x - 50) * scale;
      const y = (p.y - 70) * scale;
      return { x: x * c - y * s + 50 + offsetX + (rng.nextFloat() - 0.5) * 3, y: x * s + y * c + 70 + (rng.nextFloat() - 0.5) * 3 };
    }),
  );
}

describe('handwriting recognizer', () => {
  it('reads each clean digit', () => {
    for (const [digit, strokes] of Object.entries(DIGITS)) {
      expect(recognize(strokes).text, `digit ${digit}`).toBe(digit);
    }
  });

  it('is robust to wobble, size and slant (≥ 90% of 200 distorted samples)', () => {
    let ok = 0;
    let total = 0;
    const misses: string[] = [];
    for (const [digit, strokes] of Object.entries(DIGITS)) {
      for (let i = 0; i < 20; i++) {
        total++;
        const got = recognize(transform(strokes, `${digit}-${i}`)).text;
        if (got === digit) ok++;
        else misses.push(`${digit}→${got}`);
      }
    }
    expect(ok / total, misses.join(' ')).toBeGreaterThanOrEqual(0.9);
  });

  it('segments multi-digit numbers left to right', () => {
    const strokes = [...transform(DIGITS['4'] as Stroke[], 'a', 0), ...transform(DIGITS['7'] as Stroke[], 'b', 140), ...transform(DIGITS['2'] as Stroke[], 'c', 280)];
    expect(segment(strokes)).toHaveLength(3);
    expect(recognize(strokes).text).toBe('472');
  });

  it('recognizes a decimal point and a minus sign', () => {
    const dot: Stroke = [{ x: 150, y: 128 }, { x: 152, y: 130 }, { x: 151, y: 131 }];
    const strokes = [...DIGITS['3'] as Stroke[], dot, ...transform(DIGITS['5'] as Stroke[], 'd', 220)];
    expect(recognize(strokes).text).toBe('3.5');
    const minus: Stroke = line([-120, 70], [-60, 70]);
    expect(recognize([minus, ...(DIGITS['8'] as Stroke[])]).text).toBe('-8');
  });

  it('returns empty text for no strokes', () => {
    expect(recognize([]).text).toBe('');
  });
});
