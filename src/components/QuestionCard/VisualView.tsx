import { useMemo, useRef, useState, type CSSProperties, type JSX, type ReactNode } from 'react';
import { COUNTABLE_ITEMS } from '../../curriculum/helpers';
import { formatNumber, visualToText } from '../../domain/answer/format';
import type { Visual } from '../../domain/question/types';
import { sub, toNumber } from '../../domain/rational/rational';
import '../../styles/counting.css';

const BRICK = ['#d01012', '#f8c300', '#0057a6', '#00852b', '#fe8a18', '#7f3f98', '#36aebf', '#a5ca18'];

function Clock({ hour, minute }: { hour: number; minute: number }) {
  const minuteAngle = (minute / 60) * 360;
  const hourAngle = ((hour % 12) / 12) * 360 + (minute / 60) * 30;
  const hand = (angle: number, length: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x2: 100 + length * Math.cos(rad), y2: 100 + length * Math.sin(rad) };
  };
  return (
    <svg viewBox="0 0 200 200" width="220" height="220" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="#fff" stroke="#1f2937" strokeWidth="8" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#f8c300" strokeWidth="4" />
      {Array.from({ length: 60 }, (_, i) => {
        const a = ((i * 6 - 90) * Math.PI) / 180;
        const long = i % 5 === 0;
        return <line key={i} x1={100 + (long ? 70 : 75) * Math.cos(a)} y1={100 + (long ? 70 : 75) * Math.sin(a)} x2={100 + 80 * Math.cos(a)} y2={100 + 80 * Math.sin(a)} stroke="#1f2937" strokeWidth={long ? 3 : 1} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const a = ((n * 30 - 90) * Math.PI) / 180;
        return (
          <text key={n} x={100 + 56 * Math.cos(a)} y={100 + 56 * Math.sin(a) + 7} textAnchor="middle" fontSize="20" fontWeight="700" fontFamily="Fredoka, sans-serif" fill="#1f2937">
            {n}
          </text>
        );
      })}
      <line x1="100" y1="100" {...hand(hourAngle, 42)} stroke="#d01012" strokeWidth="9" strokeLinecap="round" />
      <line x1="100" y1="100" {...hand(minuteAngle, 68)} stroke="#0057a6" strokeWidth="6" strokeLinecap="round" />
      <circle cx="100" cy="100" r="8" fill="#1f2937" />
    </svg>
  );
}

/** Geometry of FractionBricks (shared with the tap-to-count overlay so buttons sit exactly on the bricks). */
function fractionLayout(parts: number, bars: number, width: number) {
  const h = 46;
  const gap = 18;
  const partW = (width - 8) / parts;
  return {
    h,
    totalH: bars * (h + gap) + 6,
    partW,
    xOf: (i: number) => 4 + i * partW,
    yOf: (b: number) => 12 + b * (h + gap),
  };
}

/**
 * A fraction bar drawn as bricks with studs; shaded parts are coloured bricks.
 * `stretch` (tap-to-count only): fill the box's width but keep the full height, so narrow screens squeeze the
 * bricks sideways instead of shrinking the tap targets in both directions.
 */
export function FractionBricks({
  parts,
  shaded,
  bars = 1,
  color = '#d01012',
  width = 420,
  stretch = false,
}: {
  parts: number;
  shaded: number;
  bars?: number;
  color?: string;
  width?: number;
  stretch?: boolean;
}) {
  const { h, totalH, partW, xOf, yOf } = fractionLayout(parts, bars, width);
  let remaining = shaded;
  return (
    <svg
      viewBox={`0 0 ${width} ${totalH}`}
      width={width}
      height={totalH}
      style={stretch ? { display: 'block', width: '100%', height: totalH } : { maxWidth: '100%' }}
      preserveAspectRatio={stretch ? 'none' : undefined}
      aria-hidden="true"
    >
      {Array.from({ length: bars }, (_, b) => {
        const y = yOf(b);
        return Array.from({ length: parts }, (_, i) => {
          const filled = remaining > 0;
          if (filled) remaining--;
          const fill = filled ? color : '#e5e7eb';
          const x = xOf(i);
          const studs = Math.max(1, Math.min(4, Math.floor(partW / 26)));
          return (
            <g key={`${b}-${i}`}>
              {Array.from({ length: studs }, (_, s) => (
                <rect key={s} x={x + ((s + 0.5) * partW) / studs - 7} y={y - 7} width="14" height="8" rx="3" fill={fill} stroke="rgba(0,0,0,.25)" />
              ))}
              <rect x={x + 1.5} y={y} width={partW - 3} height={h} rx="6" fill={fill} stroke="rgba(0,0,0,.35)" strokeWidth="2" />
              <rect x={x + 1.5} y={y + h - 8} width={partW - 3} height="8" rx="4" fill="rgba(0,0,0,.15)" />
            </g>
          );
        });
      })}
    </svg>
  );
}

function NumberLine({ visual }: { visual: Extract<Visual, { v: 'numberLine' }> }) {
  const w = 460;
  const left = 30;
  const right = w - 30;
  const span = toNumber(sub(visual.max, visual.min));
  const xOf = (v: number) => left + ((v - toNumber(visual.min)) / span) * (right - left);
  return (
    <svg viewBox={`0 0 ${w} 110`} width={w} height="110" style={{ maxWidth: '100%' }} aria-hidden="true">
      <line x1={left - 14} y1="60" x2={right + 14} y2="60" stroke="#1f2937" strokeWidth="4" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f2937" />
        </marker>
      </defs>
      {Array.from({ length: visual.intervals + 1 }, (_, i) => {
        const x = left + (i / visual.intervals) * (right - left);
        return <line key={i} x1={x} y1="48" x2={x} y2="72" stroke="#1f2937" strokeWidth={i === 0 || i === visual.intervals ? 4 : 3} />;
      })}
      {visual.labelEnds !== false ? (
        <>
          <text x={left} y="98" textAnchor="middle" fontSize="20" fontWeight="700" fontFamily="Fredoka, sans-serif">
            {formatNumber(visual.min)}
          </text>
          <text x={right} y="98" textAnchor="middle" fontSize="20" fontWeight="700" fontFamily="Fredoka, sans-serif">
            {formatNumber(visual.max)}
          </text>
        </>
      ) : null}
      {visual.points.map((p, i) => (
        <g key={i}>
          <circle cx={xOf(toNumber(p.at))} cy="60" r="10" fill={BRICK[i % BRICK.length]} stroke="#1f2937" strokeWidth="2" />
          <text x={xOf(toNumber(p.at))} y="32" textAnchor="middle" fontSize="20" fontWeight="800" fontFamily="Fredoka, sans-serif">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const COIN: Record<string, { r: number; fill: string; label: string }> = {
  penny: { r: 19, fill: '#c9773a', label: '1¢' },
  nickel: { r: 21, fill: '#c0c4c8', label: '5¢' },
  dime: { r: 17, fill: '#d6d9dc', label: '10¢' },
  quarter: { r: 24, fill: '#cfd3d6', label: '25¢' },
};

function CoinPicture({ coin: c }: { coin: string }) {
  return c === 'dollar' ? (
    <svg viewBox="0 0 110 54" width="110" height="54">
      <rect x="2" y="2" width="106" height="50" rx="6" fill="#cfe8c6" stroke="#2f6b2f" strokeWidth="3" />
      <circle cx="55" cy="27" r="14" fill="#9fd08f" stroke="#2f6b2f" strokeWidth="2" />
      <text x="55" y="33" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1f4d1f">
        $1
      </text>
    </svg>
  ) : (
    <svg viewBox="0 0 54 54" width="54" height="54">
      <circle cx="27" cy="27" r={COIN[c]?.r ?? 20} fill={COIN[c]?.fill ?? '#ccc'} stroke="#555" strokeWidth="2" />
      <text x="27" y="32" textAnchor="middle" fontSize="13" fontWeight="800" fill="#222">
        {COIN[c]?.label}
      </text>
    </svg>
  );
}

function Coins({ coins }: { coins: readonly string[] }) {
  return (
    <div className="coins" aria-hidden="true">
      {coins.map((c, i) => (
        <CoinPicture key={i} coin={c} />
      ))}
    </div>
  );
}

function Shape({ shape }: { shape: string }) {
  const stroke = { stroke: '#1f2937', strokeWidth: 5, strokeLinejoin: 'round' as const };
  const poly = (n: number, rot = -90) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((rot + (360 / n) * i) * Math.PI) / 180;
      return `${100 + 70 * Math.cos(a)},${100 + 70 * Math.sin(a)}`;
    }).join(' ');
  const body: Record<string, JSX.Element> = {
    triangle: <polygon points={poly(3)} fill="#f8c300" {...stroke} />,
    square: <rect x="35" y="35" width="130" height="130" fill="#36aebf" {...stroke} />,
    rectangle: <rect x="20" y="55" width="160" height="90" fill="#00852b" {...stroke} />,
    pentagon: <polygon points={poly(5)} fill="#fe8a18" {...stroke} />,
    hexagon: <polygon points={poly(6, 0)} fill="#f8c300" {...stroke} />,
    octagon: <polygon points={poly(8, 22.5)} fill="#d01012" {...stroke} />,
    circle: <circle cx="100" cy="100" r="72" fill="#0057a6" {...stroke} />,
    trapezoid: <polygon points="55,50 145,50 185,150 15,150" fill="#7f3f98" {...stroke} />,
    rhombus: <polygon points="100,20 170,100 100,180 30,100" fill="#a5ca18" {...stroke} />,
    parallelogram: <polygon points="60,50 185,50 140,150 15,150" fill="#fe8a18" {...stroke} />,
    quadrilateral: <polygon points="40,60 160,35 175,150 30,135" fill="#36aebf" {...stroke} />,
    cube: (
      <g {...stroke}>
        <polygon points="40,70 120,70 120,160 40,160" fill="#d01012" />
        <polygon points="40,70 80,35 160,35 120,70" fill="#f05a5c" />
        <polygon points="120,70 160,35 160,125 120,160" fill="#9a0b0d" />
      </g>
    ),
    'rectangular-prism': (
      <g {...stroke}>
        <polygon points="20,85 140,85 140,160 20,160" fill="#0057a6" />
        <polygon points="20,85 60,50 180,50 140,85" fill="#3d82c6" />
        <polygon points="140,85 180,50 180,125 140,160" fill="#003f78" />
      </g>
    ),
    cylinder: (
      <g {...stroke}>
        <path d="M45,50 L45,150 A55,18 0 0 0 155,150 L155,50" fill="#00852b" />
        <ellipse cx="100" cy="50" rx="55" ry="18" fill="#2fa555" />
      </g>
    ),
    cone: (
      <g {...stroke}>
        <path d="M100,25 L40,150 A60,18 0 0 0 160,150 Z" fill="#fe8a18" />
        <path d="M40,150 A60,18 0 0 1 160,150" fill="none" strokeDasharray="8 8" />
      </g>
    ),
    sphere: (
      <g {...stroke}>
        <circle cx="100" cy="100" r="72" fill="#7f3f98" />
        <ellipse cx="100" cy="100" rx="72" ry="20" fill="none" strokeDasharray="8 8" />
        <circle cx="75" cy="72" r="14" fill="rgba(255,255,255,.35)" stroke="none" />
      </g>
    ),
  };
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" aria-hidden="true">
      {body[shape] ?? body.square}
    </svg>
  );
}

/** After each tap: the number just shown on the thing's badge, and the same number in words ("3", "2 stars", "25 cents"). */
export type CountHandler = (count: number, spoken: string) => void;

export interface VisualViewProps {
  visual: Visual;
  /** Let the child tap objects / studs to count them. */
  interactive?: boolean;
  /** Called after each tap (for sounds / speech). Speak `spoken`, not `count`: it carries the unit ("25 cents"). */
  onCount?: CountHandler;
  /**
   * Identity of the question the picture belongs to (e.g. the question id). The count starts over whenever it
   * changes, even when the next question shows an identical picture.
   */
  resetKey?: string | number;
}

export function VisualView({ visual, interactive = false, onCount, resetKey }: VisualViewProps) {
  if (interactive && isCountable(visual) && countableItems(visual) > 0) {
    // Keyed on the question and the picture's content: a new question or a new picture always starts a fresh count.
    return <CountingVisual key={`${resetKey ?? ''}|${visualKey(visual)}`} visual={visual} onCount={onCount} />;
  }
  let content: JSX.Element;
  switch (visual.v) {
    case 'clock':
      content = <Clock hour={visual.hour} minute={visual.minute} />;
      break;
    case 'objects':
      content = (
        <div className="objects" aria-hidden="true">
          {visual.groups.map((g, gi) => (
            <div key={gi} className="object-group" style={{ gridTemplateColumns: `repeat(${Math.min(5, Math.max(1, g.count))}, 1fr)` }}>
              {Array.from({ length: g.count }, (_, i) => (
                <span key={i}>{g.emoji}</span>
              ))}
            </div>
          ))}
        </div>
      );
      break;
    case 'array':
      content = (
        <div className="array-grid" style={{ gridTemplateColumns: `repeat(${visual.columns}, 1fr)` }} aria-hidden="true">
          {Array.from({ length: visual.rows * visual.columns }, (_, i) => (
            <span key={i}>{visual.emoji}</span>
          ))}
        </div>
      );
      break;
    case 'fractionBar':
      content = <FractionBricks parts={visual.parts} shaded={visual.shaded} bars={visual.bars ?? 1} />;
      break;
    case 'numberLine':
      content = <NumberLine visual={visual} />;
      break;
    case 'coins':
      content = <Coins coins={visual.coins} />;
      break;
    case 'table':
      content = (
        <table className="data-table">
          <thead>
            <tr>
              {visual.headers.map((h, i) => (
                <th key={i} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      break;
    case 'shape':
      content = <Shape shape={visual.shape} />;
      break;
  }
  return (
    <figure className="visual" style={{ margin: 0 }}>
      {content}
      {visual.v !== 'table' ? <figcaption className="sr-only">{visualToText(visual)}</figcaption> : null}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Tap to count                                                         */
/* The child taps each thing once; it gets a numbered stud badge.       */
/* Nothing shows a total the child has not counted (no answer leaks):   */
/* coins only mark each coin with its own value; the child adds them.   */
/* ------------------------------------------------------------------ */

/** One counted thing: which pile it belongs to (e.g. 🍎 vs ⭐) and what it is worth (1, or a coin's cents). */
export interface CountEntry {
  readonly id: string;
  readonly kind: string;
  readonly value: number;
}

export interface TapCounter {
  /** Counted things, in tap order. */
  readonly entries: readonly CountEntry[];
  /** Running total for each kind, in the order the kinds were first tapped. */
  readonly totals: readonly { readonly kind: string; readonly value: number }[];
  /** Badges show each thing's own value and no running total is shown (adding up is the child's job). */
  readonly ownValues: boolean;
  /**
   * The number on a counted thing's badge: its kind's running total right after it was tapped
   * (or its own value with `ownValues`); 0 = not counted.
   */
  badge(id: string): number;
  /** Count a thing once; tapping it again does nothing. */
  tap(id: string, kind?: string, value?: number): void;
  /** Start counting again. */
  reset(): void;
  /** Visible text for a number, e.g. "7" or "35¢". */
  format(n: number): string;
  /** Words for a number, e.g. "7", "35 cents", "3 apples". */
  speak(n: number, kind: string): string;
  /** What the polite live region says right now. */
  readonly announcement: string;
}

export interface TapCounterOptions {
  /** Called with the number just shown on the tapped thing's badge, and that number in words. */
  onCount?: CountHandler | undefined;
  format?: (n: number) => string;
  speak?: (n: number, kind: string) => string;
  /**
   * Each badge shows the thing's own value and nothing adds them up. For coins: "How many cents?" asks the child
   * to add the coins, so a running total would do the question for them.
   */
  ownValues?: boolean;
}

export function useTapCounter({ onCount, format = String, speak, ownValues = false }: TapCounterOptions = {}): TapCounter {
  const [entries, setEntries] = useState<readonly CountEntry[]>([]);
  const [announcement, setAnnouncement] = useState('');
  // Updated synchronously inside the tap handler, so very fast double taps never count a thing twice.
  const latest = useRef<readonly CountEntry[]>([]);
  const say = speak ?? ((n: number) => format(n));
  const { badges, totals } = useMemo(() => {
    const running = new Map<string, number>();
    const byId = new Map<string, number>();
    for (const e of entries) {
      const t = (running.get(e.kind) ?? 0) + e.value;
      running.set(e.kind, t);
      byId.set(e.id, ownValues ? e.value : t);
    }
    return { badges: byId, totals: [...running].map(([kind, value]) => ({ kind, value })) };
  }, [entries, ownValues]);
  return {
    entries,
    totals,
    ownValues,
    badge: (id) => badges.get(id) ?? 0,
    tap(id, kind = '', value = 1) {
      const current = latest.current;
      if (current.some((e) => e.id === id)) return;
      const next = [...current, { id, kind, value }];
      latest.current = next;
      setEntries(next);
      const shown = ownValues ? value : next.reduce((sum, e) => (e.kind === kind ? sum + e.value : sum), 0);
      const words = say(shown, kind);
      setAnnouncement(words);
      onCount?.(shown, words);
    },
    reset() {
      latest.current = [];
      setEntries([]);
      setAnnouncement('');
    },
    format,
    speak: say,
    announcement,
  };
}

/** Sets the column count used by the tap-to-count grids (columns shrink on narrow screens). */
export function countColumns(n: number): CSSProperties {
  return { ['--cols' as string]: Math.max(1, n) } as CSSProperties;
}

export interface CountButtonProps {
  counter: TapCounter;
  id: string;
  kind?: string;
  value?: number;
  /** What the thing is called, for screen readers: "Count this apple". */
  noun: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * One tappable thing. Badges are decorative; the button's name says "Count this apple" / "Counted apple, 3".
 * A counted thing stays focusable but is marked aria-disabled (tapping it again does nothing).
 */
export function CountButton({ counter, id, kind = '', value = 1, noun, className, style, children }: CountButtonProps) {
  const n = counter.badge(id);
  return (
    <button
      type="button"
      className={`count-item${className ? ` ${className}` : ''}${n ? ' counted' : ''}`}
      style={style}
      aria-label={n ? `Counted ${noun}, ${counter.speak(n, kind)}` : `Count this ${noun}`}
      aria-disabled={n ? true : undefined}
      onClick={() => counter.tap(id, kind, value)}
    >
      <span className="count-face" aria-hidden="true">
        {children}
      </span>
      {n ? (
        <span className="count-badge" aria-hidden="true">
          {counter.format(n)}
        </span>
      ) : null}
    </button>
  );
}

export type CountTone = 'yellow' | 'azure' | 'lime' | 'orange' | 'red' | 'blue' | 'green' | 'purple';

/**
 * Under the picture: a 👆 hint until the first tap, then the child's own running count(s) and a ↺ reset brick.
 * Also holds the polite live region that says each new number.
 */
export function CountBar({ counter, kindLabel, toneOf }: { counter: TapCounter; kindLabel?: ((kind: string) => ReactNode) | undefined; toneOf?: (kind: string) => CountTone }) {
  const resetRef = useRef<HTMLButtonElement>(null);
  const started = counter.entries.length > 0;
  const reset = () => {
    // The reset brick disappears; keep keyboard / switch users in the picture.
    const button = resetRef.current;
    const first = button && document.activeElement === button ? button.closest('[data-counting]')?.querySelector<HTMLButtonElement>('button.count-item') : null;
    counter.reset();
    first?.focus();
  };
  return (
    <div className="count-bar">
      {started ? (
        <>
          {(counter.ownValues ? [] : counter.totals).map((t) => (
            // keyed on the value so the stud pops every time the number grows
            <span key={`${t.kind}|${t.value}`} className={`count-total tone-${toneOf?.(t.kind) ?? 'yellow'}`} aria-hidden="true">
              {kindLabel ? <span className="count-total-kind">{kindLabel(t.kind)}</span> : null}
              {counter.format(t.value)}
            </span>
          ))}
          <button ref={resetRef} type="button" className="brick white count-reset" aria-label="Count again" onClick={reset}>
            ↺
          </button>
        </>
      ) : (
        <span className="count-hint" aria-hidden="true">
          👆
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {counter.announcement}
      </span>
    </div>
  );
}

/** Narrowest a fraction part is drawn when there is room (the drawing is widened for many parts, never narrowed). */
const MIN_PART_W = 52;

/** FractionBricks with a tappable button laid exactly over each shaded part. */
export function CountFractionBricks({
  counter,
  parts,
  shaded,
  bars = 1,
  color,
  width = 420,
  kind = '',
  idPrefix = '',
}: {
  counter: TapCounter;
  parts: number;
  shaded: number;
  bars?: number;
  color?: string;
  width?: number;
  kind?: string;
  idPrefix?: string;
}) {
  // Wide enough for a finger on every part; on a narrow screen the drawing squeezes sideways but keeps its height.
  const w = Math.max(width, parts * MIN_PART_W + 8);
  const { h, totalH, partW, xOf, yOf } = fractionLayout(parts, bars, w);
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    <div className="count-fraction" style={{ width: w }}>
      <FractionBricks parts={parts} shaded={shaded} bars={bars} color={color} width={w} stretch />
      {Array.from({ length: Math.max(0, Math.min(shaded, parts * bars)) }, (_, k) => {
        const b = Math.floor(k / parts);
        const i = k % parts;
        return (
          <CountButton
            key={k}
            counter={counter}
            id={`${idPrefix}${k}`}
            kind={kind}
            noun="part"
            className="count-part"
            // covers the brick and its studs
            style={{ left: pct(xOf(i), w), top: pct(yOf(b) - 9, totalH), width: pct(partW, w), height: pct(h + 9, totalH) }}
          />
        );
      })}
    </div>
  );
}

type CountableVisual = Extract<Visual, { v: 'objects' | 'array' | 'coins' | 'fractionBar' }>;

function isCountable(visual: Visual): visual is CountableVisual {
  return visual.v === 'objects' || visual.v === 'array' || visual.v === 'coins' || visual.v === 'fractionBar';
}

function countableItems(visual: CountableVisual): number {
  switch (visual.v) {
    case 'objects':
      return visual.groups.reduce((sum, g) => sum + Math.max(0, g.count), 0);
    case 'array':
      return Math.max(0, visual.rows) * Math.max(0, visual.columns);
    case 'coins':
      return visual.coins.length;
    case 'fractionBar':
      return Math.max(0, Math.min(visual.shaded, visual.parts * (visual.bars ?? 1)));
  }
}

/** Stable identity of a picture's content (new object, same picture = same key). */
function visualKey(visual: Visual): string {
  return JSON.stringify(visual, (_k, x: unknown) => (typeof x === 'bigint' ? `${x}n` : x));
}

const COIN_CENTS: Readonly<Record<'penny' | 'nickel' | 'dime' | 'quarter' | 'dollar', number>> = { penny: 1, nickel: 5, dime: 10, quarter: 25, dollar: 100 };

/** "35¢" under a dollar, "$1.10" from a dollar up. */
export function formatCents(cents: number): string {
  return cents < 100 ? `${cents}¢` : `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

function centsToWords(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const rest = cents % 100;
  const words: string[] = [];
  if (dollars > 0) words.push(`${dollars} ${dollars === 1 ? 'dollar' : 'dollars'}`);
  if (rest > 0 || dollars === 0) words.push(`${rest} ${rest === 1 ? 'cent' : 'cents'}`);
  return words.join(' and ');
}

const EXTRA_NOUNS: Readonly<Record<string, readonly [string, string]>> = {
  '🟦': ['square', 'squares'],
  '🌼': ['flower', 'flowers'],
  '📎': ['paper clip', 'paper clips'],
};

function nounsFor(emoji: string): readonly [string, string] {
  const item = COUNTABLE_ITEMS.find((it) => it.emoji === emoji);
  return item ? [item.singular, item.plural] : (EXTRA_NOUNS[emoji] ?? ['one', 'ones']);
}

/** Second colour of each pile's running-count stud (piles of different things are counted separately). */
const PILE_TONES: readonly CountTone[] = ['yellow', 'azure', 'lime', 'orange'];

function CountingVisual({ visual, onCount }: { visual: CountableVisual; onCount?: CountHandler | undefined }) {
  const money = visual.v === 'coins';
  // Different emoji = different piles, counted on their own ("Which group has more?");
  // groups of the same emoji are counted together ("3 apples and 4 more").
  const kinds = visual.v === 'objects' ? [...new Set(visual.groups.filter((g) => g.count > 0).map((g) => g.emoji))] : visual.v === 'array' ? [visual.emoji] : [];
  const several = kinds.length > 1;
  const counter = useTapCounter({
    onCount,
    // Coins: each badge shows that coin's value; adding them up stays the child's job.
    ownValues: money,
    format: money ? formatCents : String,
    speak: money ? centsToWords : (n, kind) => (several ? `${n} ${nounsFor(kind)[n === 1 ? 0 : 1]}` : String(n)),
  });
  let picture: JSX.Element;
  switch (visual.v) {
    case 'objects':
      picture = (
        <div className="objects">
          {visual.groups.map((g, gi) => {
            const noun = nounsFor(g.emoji)[0];
            return (
              <div key={gi} className="object-group count-grid" style={countColumns(Math.min(5, Math.max(1, g.count)))}>
                {Array.from({ length: Math.max(0, g.count) }, (_, i) => (
                  <CountButton key={i} counter={counter} id={`${gi}.${i}`} kind={g.emoji} noun={noun} className="count-thing">
                    {g.emoji}
                  </CountButton>
                ))}
              </div>
            );
          })}
        </div>
      );
      break;
    case 'array': {
      const noun = nounsFor(visual.emoji)[0];
      picture = (
        <div className="array-grid count-grid" style={countColumns(visual.columns)}>
          {Array.from({ length: visual.rows * visual.columns }, (_, i) => (
            <CountButton key={i} counter={counter} id={String(i)} kind={visual.emoji} noun={noun} className="count-thing">
              {visual.emoji}
            </CountButton>
          ))}
        </div>
      );
      break;
    }
    case 'coins':
      picture = (
        <div className="coins">
          {visual.coins.map((c, i) => (
            <CountButton key={i} counter={counter} id={String(i)} value={COIN_CENTS[c] ?? 0} noun={c} className={`count-coin${c === 'dollar' ? ' bill' : ''}`}>
              <CoinPicture coin={c} />
            </CountButton>
          ))}
        </div>
      );
      break;
    case 'fractionBar':
      picture = <CountFractionBricks counter={counter} parts={visual.parts} shaded={visual.shaded} bars={visual.bars ?? 1} />;
      break;
  }
  return (
    <figure className="visual counting" style={{ margin: 0 }} data-counting="">
      <div className="count-stage" role="group" aria-label="Tap to count">
        {picture}
      </div>
      <CountBar counter={counter} kindLabel={kinds.length > 0 ? (kind) => kind : undefined} toneOf={(kind) => PILE_TONES[Math.max(0, kinds.indexOf(kind)) % PILE_TONES.length] ?? 'yellow'} />
      <figcaption className="sr-only">{visualToText(visual)}</figcaption>
    </figure>
  );
}
