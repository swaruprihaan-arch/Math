import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BRICK_COLORS } from '../../app/theme';
import '../../styles/kidfun.css';

/** Colour of the n-th tower brick (0-based); the same order everywhere so a flying brick matches the brick it becomes. */
export function towerBrickColor(index: number): string {
  const n = BRICK_COLORS.length;
  return BRICK_COLORS[((index % n) + n) % n] as string;
}

/** Most bricks the mini tower shows (a bigger goal fills them in proportion). */
export const TOWER_MINI_MAX = 10;

/**
 * Which mini-tower brick is the newest lit one for `count` of `goal` bricks (0-based; -1 = none lit). The mini tower
 * and the flying brick both use it, so a flying brick has the colour of the brick it lands on.
 */
export function towerSlot(count: number, goal: number): number {
  if (!(goal > 0) || !(count > 0)) return -1;
  const shown = Math.min(goal, TOWER_MINI_MAX);
  return Math.min(shown, Math.round((Math.min(count, goal) / goal) * shown)) - 1;
}

/** Restart a one-shot CSS animation class (works for quick repeated taps). */
export function restartAnimation(el: HTMLElement | null, className: string) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth; // reflow so the animation can start again
  el.classList.add(className);
}

/**
 * Bricks earned toward the next finished tower. With `onTap` it is a button: tapping makes it wiggle
 * (the caller can play a sound or say how many bricks are left).
 */
export function TowerMini({ count, goal, onTap }: { count: number; goal: number; onTap?: () => void }) {
  const rowRef = useRef<HTMLSpanElement | null>(null);
  const shown = Math.min(goal, TOWER_MINI_MAX);
  const filled = towerSlot(count, goal) + 1;
  const label = `Tower: ${count} of ${goal} bricks`;
  const bricks = (
    <span ref={rowRef} className="tower-row" aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={`tower-brick${i < filled ? '' : ' empty'}${i === filled - 1 ? ' newest' : ''}`} style={{ width: 12, height: 18, background: towerBrickColor(i) }} />
      ))}
    </span>
  );
  if (!onTap) {
    return (
      <div className="pill tower-pill" role="img" aria-label={label} title={`${count} / ${goal}`}>
        {bricks}
        <span className="tower-crane" aria-hidden="true">🏗️</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="pill tower-pill"
      aria-label={label}
      title={`${count} / ${goal}`}
      onClick={() => {
        restartAnimation(rowRef.current, 'kf-wiggle');
        onTap();
      }}
    >
      {bricks}
      <span className="tower-crane" aria-hidden="true">🏗️</span>
    </button>
  );
}

/** A tall tower built from `bricks` bricks, dropping in one by one, with a flag on top. */
export function BigTower({ bricks }: { bricks: number }) {
  const n = Math.min(bricks, 20);
  return (
    <div className="big-tower kf-big-tower" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="tower-brick" style={{ background: towerBrickColor(i), animationDelay: `${0.3 + i * 0.12}s` }} />
      ))}
      {n > 0 ? (
        <span className="tower-flag" style={{ animationDelay: `${0.3 + n * 0.12}s` }}>
          🚩
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Flying bricks: after a correct answer a brick flies to the tower.   */
/* ------------------------------------------------------------------ */

export interface Flight {
  readonly id: number;
  readonly color: string;
  /** Start (viewport px, centre of the brick). */
  readonly x: number;
  readonly y: number;
  /** Distance to travel (px). */
  readonly dx: number;
  readonly dy: number;
}

function motionAllowed(): boolean {
  if (typeof document !== 'undefined' && document.body?.classList.contains('no-anim')) return false;
  try {
    return !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/**
 * Launches a brick whenever `event` changes to a new id (and `enabled`). The brick starts at the centre of `source()`
 * and flies to the centre of `target()` (or the top-right corner). Returns the flights to render with <FlyingBricks>.
 */
export function useFlyingBricks(
  event: { readonly id: number; readonly kind: string } | null,
  options: { enabled: boolean; color: string; source: () => Element | null; target: () => Element | null },
): { flights: readonly Flight[]; done: (id: number) => void } {
  const [flights, setFlights] = useState<Flight[]>([]);
  // Only NEW events fly (not the last celebration from before this screen appeared).
  const seen = useRef<number | null>(event?.id ?? null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const opts = useRef(options);
  opts.current = options;

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!event || event.id === seen.current) return;
    seen.current = event.id;
    const { enabled, color, source, target } = opts.current;
    if (!enabled || (event.kind !== 'correct' && event.kind !== 'tower') || !motionAllowed()) return;
    const vw = globalThis.innerWidth || 0;
    const vh = globalThis.innerHeight || 0;
    const from = source()?.getBoundingClientRect();
    const to = target()?.getBoundingClientRect();
    const x = from && from.width > 0 ? from.left + from.width / 2 : vw / 2;
    const y = from && from.height > 0 ? from.top + from.height / 2 : vh / 2;
    const tx = to && to.width > 0 ? to.left + to.width / 2 : vw - 48;
    const ty = to && to.height > 0 ? to.top + to.height / 2 : 28;
    const id = event.id;
    setFlights((fs) => [...fs.slice(-3), { id, color, x, y, dx: tx - x, dy: ty - y }]);
    // Fallback clean-up in case animationend never fires.
    timers.current.push(setTimeout(() => setFlights((fs) => fs.filter((f) => f.id !== id)), 1800));
  }, [event]);

  const done = (id: number) => setFlights((fs) => fs.filter((f) => f.id !== id));
  return { flights, done };
}

export function FlyingBricks({ flights, onDone }: { flights: readonly Flight[]; onDone: (id: number) => void }) {
  if (flights.length === 0) return null;
  return (
    <div className="fly-layer" aria-hidden="true">
      {flights.map((f) => (
        <span
          key={f.id}
          className="fly-brick"
          style={{ left: f.x, top: f.y, ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px` } as CSSProperties}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) onDone(f.id);
          }}
        >
          <span className="fly-brick-body" style={{ background: f.color }} />
        </span>
      ))}
    </div>
  );
}
