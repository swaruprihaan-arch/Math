import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  TALLY_CONVERT_ANIMATION_MS,
  TALLY_GROUP_SIZE,
  clampCount,
  convertDelay,
  countTallyStrokes,
  inkBounds,
  minStrokeLength,
  reconcileSelection,
  selectedCount,
  strokeLength,
  tallyGroups,
  type InkBounds,
  type Point,
} from '../../handwriting/tally';
import { TallyMarks } from './TallyMarks';
import '../../styles/tally.css';

/**
 * Tally-mark answer pad for whole-number answers.
 *
 * Two ways to answer, picked with two big brick toggles at the top:
 * - 👆 TAP: bundles of five slots (four upright marks + the diagonal fifth). Tapping a slot selects or deselects
 *   that mark; the answer is the number of selected marks. "+5" adds another bundle (up to `max`).
 * - ✍️ DRAW: a lined canvas (finger or Apple Pencil). Each drawn line is one mark. After a pause (1.5 s, or
 *   0.45 s right after a whole bundle of five) the messy ink shrinks and fades away while neat tally marks and the
 *   numeral appear in its place (like Scribble on iPad), then fly up into the running total. Further lines ADD to
 *   the total. ↶ undoes, 🧽 clears. Waiting ink is committed at once when the child presses anything outside the
 *   pad (e.g. Check), so the parent always has the full count before the click lands.
 *
 * The current count is always shown as a big numeral next to neat tally marks (plus a polite live region).
 *
 * Controlled-ish: the pad reports every real change with `onChange(count)` and follows `value` whenever the parent
 * changes it (e.g. cleared to 0 → every mark off and any unconverted ink dropped). For a new question pass a new
 * `resetKey` (e.g. `question.id`): that also drops waiting ink when the value happens to stay the same.
 */
export interface TallyPadProps {
  /** Current answer (whole number). When the parent changes it, the pad follows (0 → all marks off). */
  value: number;
  /**
   * Called with the new count after every tap toggle, drawn-ink conversion, undo, or clear that actually changes
   * the count (never for no-op changes, never while `disabled`).
   */
  onChange: (count: number) => void;
  /**
   * Answer locked: ignore all input. Turning it on drops any ink still waiting to be converted and re-syncs the
   * pad to `value` (so a lock that lands mid-drawing never changes the answer afterwards).
   */
  disabled?: boolean;
  /** Highest count allowed (and most tap slots). Default 100. */
  max?: number;
  /**
   * Changing this resets the pad for a new question: waiting ink and the conversion animation are dropped, the
   * tap slots go back to 4 bundles and the count follows `value`. The chosen mode (tap / draw) is kept.
   * Use `question.id` (or render `<TallyPad key={question.id} …>` instead).
   */
  resetKey?: string | number;
  /** Sound hook: called on every button press (mark toggle, +5, mode switch, undo, clear). */
  onTap?: () => void;
  /** Optional: speak the count. Called with the new total whenever `onChange` is called. */
  voiceCount?: (n: number) => void;
}

type Mode = 'tap' | 'draw';

/** Brick colour per bundle of five (same order as TallyMarks). Hex because SVG attributes can't read CSS vars. */
const GROUP_COLORS = ['#d01012', '#0057a6', '#00852b', '#7f3f98', '#fe8a18', '#36aebf'] as const;
const colorFor = (g: number): string => GROUP_COLORS[g % GROUP_COLORS.length] as string;

const START_SLOTS = 20;
const INK_FADE_MS = 600;
const LAND_MS = 500;
const DEFAULT_PAD_HEIGHT = 200;
/** A touch that has stayed (almost) still this long is a resting thumb / palm: a new finger may take over. */
const RESTING_MS = 250;
const CANVAS_LABEL = 'Draw tally marks here';

const emptySlots = (limit: number): readonly boolean[] => new Array<boolean>(Math.min(START_SLOTS, limit)).fill(false);

/** Tiny deterministic wobble so marks look hand-drawn. */
const wob = (i: number): number => (((i * 37) % 7) - 3) * 0.55;

function motionAllowed(): boolean {
  if (typeof document !== 'undefined' && document.body?.classList.contains('no-anim')) return false;
  try {
    return !(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  } catch {
    return true;
  }
}

/** Drawing box of the canvas in CSS px (content box, excluding the dashed border). */
function measure(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    left: rect.left + (canvas.clientLeft || 0),
    top: rect.top + (canvas.clientTop || 0),
    width: canvas.clientWidth || rect.width,
    height: canvas.clientHeight || rect.height,
  };
}

type Timer = ReturnType<typeof setTimeout>;
const stop = (t: { current: Timer | null }) => {
  if (t.current) clearTimeout(t.current);
  t.current = null;
};

/** Neat marks split into bundles of five so long counts wrap onto several lines. Decorative. */
function NeatTally({ count, height, animate }: { count: number; height: number; animate?: boolean }) {
  const { fives, ones } = tallyGroups(count);
  return (
    <span className="tp-neat" aria-hidden="true">
      {Array.from({ length: fives }, (_, g) => (
        <TallyMarks key={g} count={TALLY_GROUP_SIZE} height={height} color={colorFor(g)} animate={animate} />
      ))}
      {ones > 0 && <TallyMarks key={fives} count={ones} height={height} color={colorFor(fives)} animate={animate} />}
    </span>
  );
}

/**
 * One upright mark, drawn as a brick-like stick: an empty OUTLINE until it is tapped, then FILLED with the bundle's
 * colour (tap again to empty it). A tiny tilt keeps it looking hand-drawn.
 */
function UprightGlyph({ index }: { index: number }) {
  const tilt = wob(index) * 0.9;
  return (
    <svg viewBox="0 0 24 80" aria-hidden="true" focusable="false">
      <rect className="tp-stick" x="6" y="7" width="12" height="66" rx="6" transform={`rotate(${tilt} 12 40)`} />
    </svg>
  );
}

/**
 * The fifth slot: a diagonal stick, outlined until tapped, then filled. When the whole bundle is complete the long
 * filled diagonal across all five takes its place.
 */
function DiagonalGlyph() {
  return (
    <svg viewBox="0 0 32 80" aria-hidden="true" focusable="false">
      <rect className="tp-stick" x="10" y="9" width="12" height="62" rx="6" transform="rotate(32 16 40)" />
    </svg>
  );
}

interface Converting {
  id: number;
  /** Count shown in the summary until the neat marks "land" there. */
  from: number;
  total: number;
  /** Vertical centre of the converted ink (CSS px from the top of the canvas element). */
  y: number;
}

export function TallyPad({ value, onChange, disabled = false, max = 100, resetKey, onTap, voiceCount }: TallyPadProps) {
  const limit = Math.max(1, Number.isFinite(max) ? Math.floor(max) : 100);
  const external = clampCount(value, limit);

  const [mode, setMode] = useState<Mode>('tap');
  const [countState, setCount] = useState(external);
  const [seenValue, setSeenValue] = useState(external);
  const [selected, setSelected] = useState<readonly boolean[]>(() => emptySlots(limit));
  const [pending, setPending] = useState({ strokes: 0, marks: 0 });
  const [converting, setConverting] = useState<Converting | null>(null);
  const [landing, setLanding] = useState(false);

  // Parent changed the answer → follow it (state adjusted during render, React's "derive from props" pattern).
  // While locked the parent's value is the truth: anything the pad counted locally is discarded.
  if (seenValue !== external) {
    setSeenValue(external);
    if (external !== countState) {
      setCount(external);
      if (converting) setConverting(null);
    }
  } else if (disabled && countState !== external) {
    setCount(external);
  }
  const count = Math.min(countState, limit);
  // Tap slots always agree with the count: a matching selection is kept, otherwise the first N are on.
  const slots = useMemo(() => reconcileSelection(selected, count, limit), [selected, count, limit]);

  // Latest props for timers and native listeners (layout effect: updated before any timer can fire).
  const onChangeRef = useRef(onChange);
  const voiceRef = useRef(voiceCount);
  const onTapRef = useRef(onTap);
  const limitRef = useRef(limit);
  const disabledRef = useRef(disabled);
  const externalRef = useRef(external);
  const countRef = useRef(count);
  const lastSent = useRef(external);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    voiceRef.current = voiceCount;
    onTapRef.current = onTap;
    limitRef.current = limit;
    disabledRef.current = disabled;
    externalRef.current = external;
  });
  useLayoutEffect(() => {
    countRef.current = count;
  }, [count]);

  /** Commit a new total: local state + onChange + optional voice. No-op changes are not reported. */
  const report = useCallback((n: number) => {
    const c = clampCount(n, limitRef.current);
    if (c === countRef.current) return;
    countRef.current = c;
    lastSent.current = c;
    setCount(c);
    onChangeRef.current(c);
    voiceRef.current?.(c);
  }, []);

  const tap = () => onTapRef.current?.();
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------------ TAP mode ------------------------------ */

  /** Slot to focus after "+5" disappeared (it was the focused button). */
  const focusSlot = useRef<number | null>(null);

  const toggle = (i: number) => {
    if (disabled) return;
    const next = slots.map((on, k) => (k === i ? !on : on));
    setSelected(next);
    tap();
    report(selectedCount(next));
  };

  const addGroup = () => {
    if (disabled || slots.length >= limit) return;
    const extra = Math.min(TALLY_GROUP_SIZE, limit - slots.length);
    if (slots.length + extra >= limit) focusSlot.current = slots.length; // "+5" is about to vanish
    setSelected([...slots, ...new Array<boolean>(extra).fill(false)]);
    tap();
  };

  useEffect(() => {
    const i = focusSlot.current;
    if (i === null) return;
    focusSlot.current = null;
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-slot="${i}"]`)?.focus();
  });

  /* ------------------------------ DRAW mode ----------------------------- */

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ghostRef = useRef<HTMLCanvasElement | null>(null);
  const strokes = useRef<Point[][]>([]);
  const current = useRef<Point[] | null>(null);
  // Apple Pencil: once a pen is used, ignore touches (palm rejection); draw with one pointer at a time.
  const penSeen = useRef(false);
  const activePointer = useRef<number | null>(null);
  const activeType = useRef<string | null>(null);
  const activeSince = useRef(0);
  const convertTimer = useRef<Timer | null>(null);
  const overlayTimer = useRef<Timer | null>(null);
  const fadeTimer = useRef<Timer | null>(null);
  const landTimer = useRef<Timer | null>(null);
  const seq = useRef(0);
  const convertingId = useRef<number | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = globalThis.devicePixelRatio || 1;
    const box = measure(canvas);
    const w = Math.round(box.width * dpr);
    const h = Math.round(box.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(6, box.height / 26);
    ctx.strokeStyle = getComputedStyle(canvas).color || '#1f2937';
    for (const s of [...strokes.current, ...(current.current ? [current.current] : [])]) {
      const first = s[0];
      if (!first) continue;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (const p of s) ctx.lineTo(p.x, p.y);
      if (s.length === 1) ctx.lineTo(first.x + 0.1, first.y + 0.1);
      ctx.stroke();
    }
  }, []);

  const padHeight = useCallback(() => {
    const canvas = canvasRef.current;
    return (canvas ? measure(canvas).height : 0) || DEFAULT_PAD_HEIGHT;
  }, []);

  const updatePending = useCallback(() => {
    setPending({ strokes: strokes.current.length, marks: countTallyStrokes(strokes.current, padHeight()) });
  }, [padHeight]);

  /** Forget the pointer that is drawing right now (and its unfinished stroke). */
  const releaseActive = useCallback(() => {
    activePointer.current = null;
    activeType.current = null;
    current.current = null;
  }, []);

  /** Forget unconverted ink (clear, lock, reset, and when the parent changes the answer itself). */
  const dropPending = useCallback(() => {
    stop(convertTimer);
    strokes.current = [];
    releaseActive();
    setPending({ strokes: 0, marks: 0 });
    redraw();
  }, [redraw, releaseActive]);

  /** Stop the ink → marks animation (and the "land" pop that would follow it). */
  const cancelOverlay = useCallback(() => {
    stop(overlayTimer);
    convertingId.current = null;
    setConverting(null);
  }, []);

  /** Wipe the fading copy of the ink straight away. */
  const clearGhost = useCallback(() => {
    stop(fadeTimer);
    const ghost = ghostRef.current;
    if (!ghost) return;
    ghost.classList.remove('fading');
    ghost.getContext('2d')?.clearRect(0, 0, ghost.width, ghost.height);
  }, []);

  /** Copy the ink onto the overlay canvas and let it shrink + fade away toward its centre. */
  const fadeInk = (canvas: HTMLCanvasElement, bounds: InkBounds | null) => {
    const ghost = ghostRef.current;
    const gctx = ghost?.getContext('2d');
    if (!ghost || !gctx) return;
    ghost.width = canvas.width;
    ghost.height = canvas.height;
    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.clearRect(0, 0, ghost.width, ghost.height);
    gctx.drawImage(canvas, 0, 0);
    if (bounds) ghost.style.transformOrigin = `${(bounds.minX + bounds.maxX) / 2}px ${(bounds.minY + bounds.maxY) / 2}px`;
    ghost.classList.remove('fading');
    void ghost.offsetWidth; // restart the CSS animation
    ghost.classList.add('fading');
    stop(fadeTimer);
    fadeTimer.current = setTimeout(() => {
      ghost.classList.remove('fading');
      gctx.clearRect(0, 0, ghost.width, ghost.height);
    }, INK_FADE_MS);
  };

  /** Turn the unconverted strokes into marks added to the total (with the Scribble-style animation if allowed). */
  const convert = (animate: boolean) => {
    stop(convertTimer);
    const list = strokes.current;
    if (list.length === 0) return;
    if (disabledRef.current) {
      dropPending(); // the answer is locked: ink that arrives too late never changes it
      return;
    }
    const canvas = canvasRef.current;
    const h = padHeight();
    const added = countTallyStrokes(list, h);
    const from = countRef.current;
    const total = clampCount(from + added, limitRef.current);
    const bounds = inkBounds(list);
    const motion = animate && motionAllowed();
    if (motion && canvas) fadeInk(canvas, bounds);
    strokes.current = [];
    setPending({ strokes: 0, marks: 0 });
    redraw();
    if (total === from) return; // only dots / scribbles, or already at max: the ink just disappears
    report(total);
    if (!motion) return;
    const id = ++seq.current;
    convertingId.current = id;
    const mid = bounds ? (bounds.minY + bounds.maxY) / 2 : h / 2;
    const y = Math.min(Math.max(mid, Math.min(40, h / 2)), Math.max(h - 40, h / 2));
    setConverting({ id, from, total, y: y + (canvas?.clientTop || 0) });
    stop(overlayTimer);
    overlayTimer.current = setTimeout(() => {
      overlayTimer.current = null;
      if (convertingId.current !== id) return;
      convertingId.current = null;
      setConverting((c) => (c && c.id === id ? null : c));
      setLanding(true);
      stop(landTimer);
      landTimer.current = setTimeout(() => setLanding(false), LAND_MS);
    }, TALLY_CONVERT_ANIMATION_MS);
  };
  const convertRef = useRef(convert);
  useLayoutEffect(() => {
    convertRef.current = convert;
  });

  const scheduleConvert = () => {
    stop(convertTimer);
    const delay = convertDelay(countTallyStrokes(strokes.current, padHeight()));
    convertTimer.current = setTimeout(() => convertRef.current(true), delay);
  };

  // The parent changed the answer itself (cleared, typed elsewhere): drop unconverted ink and the animation.
  useEffect(() => {
    if (external === lastSent.current) return;
    lastSent.current = external;
    dropPending();
    cancelOverlay();
  }, [external, dropPending, cancelOverlay]);

  // Locked (Check pressed, time up): ink still waiting must never reach the answer; follow the parent's value.
  useLayoutEffect(() => {
    if (!disabled) return;
    dropPending();
    cancelOverlay();
    clearGhost();
    lastSent.current = externalRef.current;
  }, [disabled, dropPending, cancelOverlay, clearGhost]);

  // New question: start clean (mode is a preference and is kept).
  const resetSeen = useRef(resetKey);
  useLayoutEffect(() => {
    if (resetSeen.current === resetKey) return;
    resetSeen.current = resetKey;
    dropPending();
    cancelOverlay();
    clearGhost();
    stop(landTimer);
    setLanding(false);
    setSelected(emptySlots(limitRef.current));
    setCount(externalRef.current);
    countRef.current = externalRef.current;
    lastSent.current = externalRef.current;
  }, [resetKey, dropPending, cancelOverlay, clearGhost]);

  // Waiting ink is committed as soon as the child presses anything outside the pad (e.g. Check), so the parent
  // receives the full count before that button's click runs.
  const hasInk = pending.strokes > 0;
  useEffect(() => {
    if (!hasInk || mode !== 'draw' || disabled) return;
    const onOutside = (ev: Event) => {
      const root = rootRef.current;
      const target = ev.target;
      if (root && target instanceof Node && root.contains(target)) return;
      convertRef.current(true);
    };
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onOutside, true);
    return () => {
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onOutside, true);
    };
  }, [hasInk, mode, disabled]);

  useEffect(() => {
    if (mode !== 'draw') return;
    redraw();
    // The canvas is going away: a finger still on it can never send its pointerup to us.
    return releaseActive;
  }, [mode, redraw, releaseActive]);

  useEffect(() => {
    const onResize = () => redraw();
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, [redraw]);

  useEffect(
    () => () => {
      stop(convertTimer);
      stop(overlayTimer);
      stop(fadeTimer);
      stop(landTimer);
    },
    [],
  );

  const pointsOf = (e: ReactPointerEvent<HTMLCanvasElement>): Point[] => {
    const box = measure(e.currentTarget);
    const native = e.nativeEvent;
    let events: { clientX: number; clientY: number }[] = [];
    try {
      events = native.getCoalescedEvents?.() ?? [];
    } catch {
      events = [];
    }
    if (events.length === 0) events = [e];
    return events.map((p) => ({ x: p.clientX - box.left, y: p.clientY - box.top }));
  };

  /**
   * May this new pointer take the canvas from the one already drawing? Only from a touch:
   * - the Apple Pencil always beats a palm that landed first;
   * - another finger beats a resting thumb / palm (has not moved a mark's length for RESTING_MS).
   */
  const canTakeOver = (e: ReactPointerEvent<HTMLCanvasElement>): boolean => {
    if (activeType.current !== 'touch') return false;
    if (e.pointerType === 'pen') return true;
    if (e.pointerType !== 'touch') return false;
    const stroke = current.current;
    const still = !stroke || strokeLength(stroke) < minStrokeLength(padHeight());
    return still && Date.now() - activeSince.current >= RESTING_MS;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    if (e.pointerType === 'pen') penSeen.current = true;
    if (penSeen.current && e.pointerType === 'touch') return;
    if (activePointer.current !== null) {
      if (!canTakeOver(e)) return;
      const old = activePointer.current;
      releaseActive(); // the palm / thumb's stroke never becomes a mark
      try {
        e.currentTarget.releasePointerCapture?.(old);
      } catch {
        /* it may already be gone */
      }
    }
    activePointer.current = e.pointerId;
    activeType.current = e.pointerType;
    activeSince.current = Date.now();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* capture is optional */
    }
    const box = measure(e.currentTarget);
    current.current = [{ x: e.clientX - box.left, y: e.clientY - box.top }];
    stop(convertTimer);
    redraw();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!current.current || e.pointerId !== activePointer.current) return;
    current.current.push(...pointsOf(e));
    redraw();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointer.current) return;
    const stroke = current.current;
    releaseActive();
    if (!stroke) return;
    strokes.current.push(stroke);
    updatePending();
    redraw();
    scheduleConvert();
  };

  /** pointercancel / lostpointercapture: the stroke is abandoned, the canvas is free again. */
  const onPointerCancel = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointer.current) return;
    releaseActive();
    redraw();
    if (strokes.current.length > 0) scheduleConvert();
  };

  const undo = () => {
    if (disabled) return;
    tap();
    if (strokes.current.length > 0) {
      strokes.current.pop();
      updatePending();
      redraw();
      if (strokes.current.length > 0) scheduleConvert();
      else stop(convertTimer);
      return;
    }
    if (countRef.current > 0) {
      cancelOverlay();
      report(countRef.current - 1);
    }
  };

  const clearAll = () => {
    if (disabled) return;
    tap();
    dropPending();
    cancelOverlay();
    report(0);
  };

  const chooseMode = (next: Mode) => {
    if (disabled || next === mode) return;
    tap();
    if (mode === 'draw') {
      releaseActive(); // a finger still on the canvas must not keep it busy after it unmounts
      convert(false); // keep any marks drawn but not yet converted
      cancelOverlay();
    }
    setMode(next);
  };

  /* -------------------------------- view -------------------------------- */

  const shown = converting ? converting.from : count;
  const groups: number[][] = [];
  for (let s = 0; s < slots.length; s += TALLY_GROUP_SIZE) {
    groups.push(Array.from({ length: Math.min(TALLY_GROUP_SIZE, slots.length - s) }, (_, k) => s + k));
  }

  return (
    <div ref={rootRef} className={`tally-pad${disabled ? ' is-disabled' : ''}`}>
      <div className="tp-modes" role="group" aria-label="How to make tally marks">
        <button
          type="button"
          className="brick big azure pressable tp-mode"
          aria-pressed={mode === 'tap'}
          aria-label="Tap tally marks"
          disabled={disabled}
          onClick={() => chooseMode('tap')}
        >
          👆
        </button>
        <button
          type="button"
          className="brick big lime pressable tp-mode"
          aria-pressed={mode === 'draw'}
          aria-label="Draw tally marks"
          disabled={disabled}
          onClick={() => chooseMode('draw')}
        >
          ✍️
        </button>
      </div>

      <div className={`tp-summary${landing ? ' land' : ''}${converting ? ' waiting' : ''}`}>
        <NeatTally count={shown} height={shown > 30 ? 24 : 30} animate />
        <span className="tp-number" aria-hidden="true">
          {shown}
        </span>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {count}
        </span>
      </div>

      {mode === 'tap' ? (
        <div className="tp-tap">
          <div className="tp-groups" role="group" aria-label="Tally marks: tap to count">
            {groups.map((idxs, g) => {
              const full = idxs.length === TALLY_GROUP_SIZE;
              const complete = full && idxs.every((i) => slots[i] === true);
              return (
                <div key={g} className={`tp-group${complete ? ' complete' : ''}`} style={{ '--tp-c': colorFor(g) } as CSSProperties}>
                  {idxs.map((i, k) => {
                    const isFifth = full && k === TALLY_GROUP_SIZE - 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`tp-slot${isFifth ? ' five' : ''}`}
                        data-slot={i}
                        aria-pressed={slots[i] === true}
                        aria-label={`Tally mark ${i + 1}`}
                        disabled={disabled}
                        onClick={() => toggle(i)}
                      >
                        {isFifth ? <DiagonalGlyph /> : <UprightGlyph index={i} />}
                      </button>
                    );
                  })}
                  {full && (
                    <svg className={`tp-diag${complete ? ' on' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                      {/* outlined + filled stick: dark edge underneath, colour on top */}
                      <path className="tp-diag-edge" d={`M3 86 Q${50 + wob(g)} ${56 + wob(g + 2)} 97 14`} />
                      <path className="tp-diag-fill" d={`M3 86 Q${50 + wob(g)} ${56 + wob(g + 2)} 97 14`} />
                    </svg>
                  )}
                </div>
              );
            })}
            {slots.length < limit && (
              <button type="button" className="brick orange tp-more" aria-label="Add 5 more marks" disabled={disabled} onClick={addGroup}>
                +5
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="tp-draw">
          <div className="tp-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="tp-canvas"
              role="img"
              aria-label={CANVAS_LABEL}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onLostPointerCapture={onPointerCancel}
            />
            <canvas ref={ghostRef} className="tp-ink-ghost" aria-hidden="true" />
            {pending.marks > 0 && (
              <span className="tp-pending" aria-hidden="true">
                +{pending.marks}
              </span>
            )}
            {converting && (
              <div key={converting.id} className="tp-convert" style={{ top: converting.y }} aria-hidden="true" data-testid="tally-convert">
                <NeatTally count={converting.total} height={converting.total > 20 ? 26 : converting.total > 10 ? 34 : 42} animate />
                <span className="tp-convert-num">{converting.total}</span>
              </div>
            )}
          </div>
          <p className="tp-hint">Draw one line for each mark</p>
          <div className="tp-tools">
            <button
              type="button"
              className="brick ghost tp-tool"
              aria-label="Undo last mark"
              disabled={disabled || (pending.strokes === 0 && count === 0)}
              onClick={undo}
            >
              ↶
            </button>
            <button
              type="button"
              className="brick ghost tp-tool"
              aria-label="Clear tally marks"
              disabled={disabled || (pending.strokes === 0 && count === 0)}
              onClick={clearAll}
            >
              🧽
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
