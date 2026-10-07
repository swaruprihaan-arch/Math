import { useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react';
import type { Point, Stroke } from '../../handwriting/recognizer';
import '../../styles/scribble.css';

/* ------------------------------------------------------------------ */
/* Timing + labels (exported so tests and callers can rely on them)     */
/* ------------------------------------------------------------------ */

/** Live mode: pause after a stroke before the pad re-recognises everything (ms). */
export const LIVE_DELAY_MS = 350;
/** Scribble mode: pause after the last stroke before ink turns into text (ms). A new stroke restarts the wait. */
export const SCRIBBLE_DELAY_MS = 700;
/** Scribble mode: ink fades/blurs/shrinks while the typed text fades in (ms). `onConvert` fires when this ends. */
export const SCRIBBLE_MORPH_MS = 360;
/** Scribble mode: the typed text glides up toward the answer box and fades (ms); then the overlay is removed. */
export const SCRIBBLE_GLIDE_MS = 420;
/**
 * Palm rejection: finger touches are ignored while an Apple Pencil was used on any pad within this long (ms).
 * After that, fingers work again (a sibling without the Pencil, or the Pencil ran flat).
 */
export const PENCIL_IDLE_MS = 30_000;
/** How long the "✏️ Pencil mode" hint stays up after a finger stroke was ignored (ms). */
export const PENCIL_HINT_MS = 2500;

export const UNDO_LINE_LABEL = 'Undo last line';
export const UNDO_CONVERT_LABEL = 'Undo last written number';
export const CLEAR_WRITING_LABEL = 'Clear writing';
export const PENCIL_HINT_TEXT = '✏️ Pencil mode';

/** Imperative handle (pass `ref`). */
export interface HandwritingPadHandle {
  /**
   * Hand over everything that is still on its way RIGHT NOW (synchronously): finished ink is recognised and
   * conversions that are mid-animation are committed (the glide still plays). Live mode: reports the text now.
   * Call it before submitting. No-op when nothing is pending, while disabled, or before the recognizer has loaded.
   * The pad already does this by itself when the child taps a button/link outside the pad (e.g. ✓ Check).
   */
  flush(): void;
}

export interface HandwritingPadProps {
  /**
   * LIVE mode (used when `onConvert` is not given): called with the recognised text of everything on the pad
   * ~350 ms after each stroke, right after "↶", and with '' after "🧽".
   */
  onText?: (text: string) => void;
  /**
   * SCRIBBLE mode (turned on by passing this): after the child pauses (`SCRIBBLE_DELAY_MS`) the ink is recognised,
   * morphs into typed text, glides up and is handed over here exactly once per conversion. The pad then clears, so
   * the parent should APPEND `text` to the answer. Not called when nothing was recognised (the ink stays), for
   * accidental taps / specks (they are wiped), or while `disabled`. Pieces handed over together (flush, unmount)
   * arrive as ONE call. Still append from the latest answer (ref / functional update), not a render-time copy.
   */
  onConvert?: (text: string) => void;
  /**
   * SCRIBBLE mode: "↶" with no ink on the pad (and no conversion mid-animation, which "↶" simply cancels) calls this
   * so the parent can remove the last converted text. Receives the text of that conversion ('' if the pad does not
   * know it); a `() => void` handler is fine.
   */
  onUndoConvert?: (lastText: string) => void;
  /**
   * SCRIBBLE mode: may "↶" undo a conversion when the pad is empty? Defaults to "this pad converted something since
   * the last reset that was not undone yet". Pass it when the parent knows better (e.g. the answer was edited).
   */
  canUndoConvert?: boolean;
  /**
   * SCRIBBLE mode: element the typed text should glide into (e.g. the answer box). Default: straight up, out of
   * the top of the pad.
   */
  glideTarget?: () => Element | null | undefined;
  /**
   * Fires (only on change) when the pad starts / stops holding input the parent has not received yet: ink on the
   * pad or a conversion mid-animation (scribble), a stroke in progress, or a pending live recognition. Use it to
   * disable ✓ or show "finishing…". Always ends with `false` (also on unmount and while disabled).
   */
  onPendingChange?: (pending: boolean) => void;
  /** Extra symbols allowed besides digits, e.g. "./-". */
  symbols: string;
  /** Changing this clears the pad (e.g. new question or new target box). Unfinished conversions are dropped. */
  resetKey: string;
  /**
   * Blocks writing and conversion. Turning it on drops conversions that are mid-animation (no `onConvert`) and
   * freezes any ink; turning it off again converts that ink after the usual pause.
   */
  disabled?: boolean;
  /** Accessible name of the writing surface. */
  label: string;
  /** SCRIBBLE mode: pause before ink turns into text (ms). Default `SCRIBBLE_DELAY_MS`. */
  delayMs?: number;
  /** Optional imperative handle: `flush()`. */
  ref?: Ref<HandwritingPadHandle>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

type RecognizeFn = (strokes: readonly Stroke[], options: { symbols: string }) => { text: string };
type Timeout = ReturnType<typeof setTimeout>;

let recognizerPromise: Promise<RecognizeFn> | null = null;
/** Recognition runs locally; the model is code-split and loaded once. */
function loadRecognizer(): Promise<RecognizeFn> {
  recognizerPromise ??= import('../../handwriting/recognizer').then(
    (m) => m.recognize,
    (err: unknown) => {
      recognizerPromise = null; // let a later attempt retry (e.g. flaky network for the chunk)
      throw err;
    },
  );
  return recognizerPromise;
}

/**
 * Apple Pencil memory, shared by every pad and kept across remounts (switching Keypad ↔ Write must not forget that
 * the child writes with the Pencil, or a resting palm would draw again).
 */
const pencil = { lastUsed: Number.NEGATIVE_INFINITY };
const notePencil = () => {
  pencil.lastUsed = Date.now();
};
const pencilRecent = () => Date.now() - pencil.lastUsed < PENCIL_IDLE_MS;
/** Forget that an Apple Pencil was used, so fingers can write straight away (tests; another child takes over). */
export function resetPencilMemory(): void {
  pencil.lastUsed = Number.NEGATIVE_INFINITY;
}

/** body.no-anim (parent setting) or the OS "reduce motion" switch → skip the animation. */
function motionOff(): boolean {
  if (typeof document !== 'undefined' && document.body?.classList.contains('no-anim')) return true;
  try {
    return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const inkWidth = (padHeight: number) => Math.max(6, padHeight / 26);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

function pathOf(s: readonly Point[]): string {
  const [first, ...rest] = s;
  if (!first) return '';
  if (rest.length === 0) return `M${r1(first.x)} ${r1(first.y)}l0.1 0.1`;
  return `M${r1(first.x)} ${r1(first.y)}` + rest.map((p) => `L${r1(p.x)} ${r1(p.y)}`).join('');
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boxOf(strokes: readonly (readonly Point[])[]): Box | null {
  let b: Box | null = null;
  for (const s of strokes)
    for (const p of s) {
      if (!b) b = { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
      else {
        b.minX = Math.min(b.minX, p.x);
        b.maxX = Math.max(b.maxX, p.x);
        b.minY = Math.min(b.minY, p.y);
        b.maxY = Math.max(b.maxY, p.y);
      }
    }
  return b;
}

const sizeOf = (b: Box | null) => (b ? Math.max(b.maxX - b.minX, b.maxY - b.minY) : 0);

/**
 * Accidental taps, palm specks and stray dots are not writing (the recognizer would turn every mark into a digit).
 * All-tiny ink is wiped unless "." is allowed (a lone decimal point); tiny marks far from the real ink are dropped.
 */
function dropAccidentalInk(batch: Point[][], padHeight: number, symbols: string): Point[][] {
  const tiny = Math.max(16, padHeight * 0.1);
  if (sizeOf(boxOf(batch)) < tiny) return symbols.includes('.') ? batch : [];
  const big = batch.filter((s) => sizeOf(boxOf([s])) >= tiny);
  const u = boxOf(big);
  if (!u || big.length === batch.length) return batch; // e.g. ":" — two small dots, nothing to compare with
  const reach = Math.max(u.maxY - u.minY, tiny);
  return batch.filter((s) => {
    const b = boxOf([s]);
    if (!b || sizeOf(b) >= tiny) return true;
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    return cx >= u.minX - reach && cx <= u.maxX + reach && cy >= u.minY - reach / 2 && cy <= u.maxY + reach / 2;
  });
}

/** Taps here hand pending writing over first (✓ Check, mode switch, navigation …). Plain areas do not: palms. */
const INTERACTIVE =
  'button, a[href], input, select, textarea, label, summary, [role="button"], [role="link"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], [role="menuitem"], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

interface Flight {
  id: number;
  text: string;
  paths: string[];
  /** canvas border (the overlay sits on the canvas content box) */
  ox: number;
  oy: number;
  /** ink centre, in content-box px */
  cx: number;
  cy: number;
  fontSize: number;
  lineWidth: number;
  color: string;
  dx: number;
  dy: number;
  /** final scale of the gliding text (matches the answer box's font size when known) */
  scale: number;
  /** true once the text was handed to the parent (committed) */
  gliding: boolean;
}

interface FlightMeta {
  text: string;
  cx: number;
  cy: number;
  fontSize: number;
  commit: Timeout | null;
  end: Timeout;
  committed: boolean;
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

/**
 * Finger / Apple Pencil / mouse writing pad. Recognition runs locally (no network).
 *
 * - LIVE mode (`onText`): reports the recognised text after every stroke.
 * - SCRIBBLE mode (`onConvert`): like iPadOS Scribble — pause (or tap a button outside the pad), and the handwriting
 *   turns into typed text that glides up into the answer; the pad clears for the next part.
 *
 * Palm rejection: while an Apple Pencil (`pointerType 'pen'`) is in use, touches are ignored; a palm that landed
 * first is dropped as soon as the Pencil touches down. One pointer draws at a time.
 */
export function HandwritingPad({ onText, onConvert, onUndoConvert, canUndoConvert, glideTarget, onPendingChange, symbols, resetKey, disabled, label, delayMs, ref }: HandwritingPadProps) {
  const scribble = typeof onConvert === 'function';
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const strokes = useRef<Point[][]>([]);
  const current = useRef<Point[] | null>(null);
  const timer = useRef<Timeout | null>(null);
  const [count, setCount] = useState(0);
  const active = useRef<{ id: number; type: string } | null>(null);
  /** Rejected touches (palm / finger while the Pencil is in use) → did the Pencil touch down meanwhile? */
  const rejected = useRef(new Map<number, boolean>());
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<Timeout | null>(null);
  const recognizeRef = useRef<RecognizeFn | null>(null);
  const alive = useRef(true);
  const pendingRef = useRef(false);

  // Scribble state
  const [flights, setFlights] = useState<Flight[]>([]);
  const flightMeta = useRef(new Map<number, FlightMeta>());
  const flightSeq = useRef(0);
  const history = useRef<string[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [announcement, setAnnouncement] = useState<{ n: number; text: string } | null>(null);

  // Latest props for timer / document callbacks (no stale closures). Declared first so it runs before other effects.
  const latest = useRef({ onText, onConvert, onPendingChange, symbols, disabled, glideTarget, delayMs });
  useEffect(() => {
    latest.current = { onText, onConvert, onPendingChange, symbols, disabled, glideTarget, delayMs };
  });

  const announce = useCallback((text: string) => setAnnouncement((a) => ({ n: (a?.n ?? 0) + 1, text })), []);

  const cancelTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /** Tell the parent (on change) whether input is still on its way. */
  const syncPending = useCallback(() => {
    const { disabled: off, onConvert: conv, onPendingChange: report } = latest.current;
    let pending = false;
    if (!off) {
      if (current.current) pending = true;
      else if (conv) pending = strokes.current.length > 0 || [...flightMeta.current.values()].some((m) => !m.committed);
      else pending = timer.current !== null;
    }
    if (pending === pendingRef.current) return;
    pendingRef.current = pending;
    report?.(pending);
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = globalThis.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // Draw in the content box (inside the dashed border) so the ink sits exactly under the finger / Pencil.
    const w = canvas.clientWidth || rect.width;
    const h = canvas.clientHeight || rect.height;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = inkWidth(h);
    ctx.strokeStyle = getComputedStyle(canvas).color || '#111827';
    for (const s of [...strokes.current, ...(current.current ? [current.current] : [])]) {
      if (s.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(s[0]!.x, s[0]!.y);
      for (const p of s) ctx.lineTo(p.x, p.y);
      if (s.length === 1) ctx.lineTo(s[0]!.x + 0.1, s[0]!.y + 0.1);
      ctx.stroke();
    }
  }, []);

  /* ---------- LIVE mode ---------- */

  const runLive = useCallback(() => {
    const go = (recognize: RecognizeFn) => latest.current.onText?.(recognize(strokes.current, { symbols: latest.current.symbols }).text);
    if (recognizeRef.current) return go(recognizeRef.current);
    loadRecognizer().then(
      (r) => {
        recognizeRef.current = r;
        if (alive.current) go(r);
      },
      () => undefined,
    );
  }, []);

  /* ---------- SCRIBBLE mode ---------- */

  /** Text is handed to the parent: exactly once per conversion. */
  const commit = useCallback(
    (text: string) => {
      history.current.push(text);
      setHistoryCount(history.current.length);
      announce(`Wrote ${text}`);
      latest.current.onConvert?.(text);
    },
    [announce],
  );

  const removeFlight = useCallback((id: number) => {
    const meta = flightMeta.current.get(id);
    if (meta) {
      if (meta.commit) clearTimeout(meta.commit);
      clearTimeout(meta.end);
      flightMeta.current.delete(id);
    }
    setFlights((fs) => fs.filter((f) => f.id !== id));
  }, []);

  /** Cancel conversions that have not reached the parent yet (newest only, or all). Returns how many. */
  const dropUncommitted = useCallback(
    (onlyNewest = false) => {
      const ids = [...flightMeta.current].filter(([, m]) => !m.committed).map(([id]) => id);
      const drop = onlyNewest ? ids.slice(-1) : ids;
      for (const id of drop) removeFlight(id);
      return drop.length;
    },
    [removeFlight],
  );

  /**
   * The morph is over (or was cut short by flush): mark the conversion committed and glide its text toward the
   * answer. Returns the text for the caller to `commit` (null when there is nothing to hand over).
   */
  const startGlide = useCallback(
    (id: number, restartEnd: boolean): string | null => {
      const meta = flightMeta.current.get(id);
      if (!meta || meta.committed) return null;
      if (latest.current.disabled) {
        removeFlight(id); // locked meanwhile: the text must not land
        return null;
      }
      if (meta.commit) clearTimeout(meta.commit);
      meta.commit = null;
      meta.committed = true;
      if (restartEnd) {
        clearTimeout(meta.end);
        meta.end = setTimeout(() => removeFlight(id), SCRIBBLE_GLIDE_MS);
      }
      // Glide toward the answer box when the parent told us where it is.
      let dx = 0;
      let dy: number | null = null;
      let scale: number | null = null;
      const target = latest.current.glideTarget?.();
      const stage = stageRef.current;
      if (target && stage) {
        const t = target.getBoundingClientRect();
        const s = stage.getBoundingClientRect();
        const ox = canvasRef.current?.clientLeft ?? 0;
        const oy = canvasRef.current?.clientTop ?? 0;
        if (t.width || t.height) {
          dx = t.left + t.width / 2 - (s.left + ox + meta.cx);
          dy = t.top + t.height / 2 - (s.top + oy + meta.cy);
          const targetFont = Number.parseFloat(getComputedStyle(target).fontSize);
          if (targetFont > 0) scale = clamp(targetFont / meta.fontSize, 0.15, 1);
        }
      }
      setFlights((fs) => fs.map((f) => (f.id === id ? { ...f, gliding: true, dx, dy: dy ?? f.dy, scale: scale ?? f.scale } : f)));
      return meta.text;
    },
    [removeFlight],
  );

  /**
   * Recognise the finished ink now and start its morph (or commit straight away when motion is off).
   * `immediate` (flush): skip the morph, start the glide at once and RETURN the text for the caller to commit.
   */
  const convertNow = useCallback(
    (recognize: RecognizeFn, immediate = false): string | null => {
      const batch = strokes.current;
      if (batch.length === 0) return null;
      const syms = latest.current.symbols;
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      const w = canvas?.clientWidth || rect?.width || 0;
      const h = canvas?.clientHeight || rect?.height || 0;
      const kept = dropAccidentalInk(batch, h, syms);
      const text = kept.length > 0 ? recognize(kept, { symbols: syms }).text : '';
      if (kept.length > 0 && !text) {
        announce('Could not read that. Try again.');
        return null; // nothing readable: keep the ink so the child can fix it
      }

      // The ink leaves the canvas now (into the animated overlay), so the child can keep writing straight away.
      const color = (canvas && getComputedStyle(canvas).color) || '#111827';
      strokes.current = [];
      setCount(0);
      redraw();

      if (!text) {
        syncPending(); // only an accidental tap / speck: wiped
        return null;
      }
      if (motionOff()) {
        if (immediate) return text;
        commit(text);
        syncPending();
        return null;
      }

      const box = boxOf(kept) ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      const lineWidth = inkWidth(h);
      let fontSize = clamp((box.maxY - box.minY + lineWidth) * 1.1, 32, Math.max(32, h ? h * 0.8 : 160));
      // Keep the typed text inside the pad (rough width estimate for a rounded font) — phones are narrow.
      if (w > 0) fontSize = Math.min(fontSize, Math.max(32, (w * 0.9) / (0.66 * text.length)));
      fontSize = Math.round(fontSize);
      const halfText = fontSize * 0.33 * text.length;
      let cx = (box.minX + box.maxX) / 2;
      if (w > 0) cx = w > 2 * halfText ? clamp(cx, halfText, w - halfText) : w / 2;
      const cy = (box.minY + box.maxY) / 2;

      const id = ++flightSeq.current;
      setFlights((fs) => [
        ...fs,
        { id, text, paths: kept.map(pathOf), ox: canvas?.clientLeft ?? 0, oy: canvas?.clientTop ?? 0, cx, cy, fontSize, lineWidth, color, dx: 0, dy: -(cy + fontSize / 2 + 24), scale: 0.5, gliding: false },
      ]);
      flightMeta.current.set(id, {
        text,
        cx,
        cy,
        fontSize,
        committed: false,
        commit: immediate
          ? null
          : setTimeout(() => {
              const done = startGlide(id, false);
              if (done !== null) commit(done);
              syncPending();
            }, SCRIBBLE_MORPH_MS),
        end: setTimeout(() => removeFlight(id), SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS),
      });
      if (immediate) return startGlide(id, true);
      syncPending();
      return null;
    },
    [announce, commit, redraw, removeFlight, startGlide, syncPending],
  );

  const convert = useCallback(async () => {
    timer.current = null;
    const recognize = recognizeRef.current ?? (await loadRecognizer().catch(() => null));
    if (!recognize || !alive.current) return;
    recognizeRef.current = recognize;
    // The child started writing again while the model loaded: the next pause converts everything together.
    if (timer.current || active.current !== null) return;
    if (latest.current.disabled) return;
    convertNow(recognize);
  }, [convertNow]);

  const schedule = useCallback(() => {
    cancelTimer();
    if (latest.current.onConvert) {
      if (strokes.current.length > 0) timer.current = setTimeout(() => void convert(), latest.current.delayMs ?? SCRIBBLE_DELAY_MS);
    } else {
      timer.current = setTimeout(() => {
        timer.current = null;
        runLive();
        syncPending();
      }, LIVE_DELAY_MS);
    }
  }, [cancelTimer, convert, runLive, syncPending]);

  /** See `HandwritingPadHandle.flush`. */
  const flush = useCallback(() => {
    if (latest.current.disabled) return;
    if (!latest.current.onConvert) {
      if (timer.current === null) return; // live text is already up to date
      cancelTimer();
      runLive();
      syncPending();
      return;
    }
    // Oldest first. ONE onConvert call: a parent appending to a stale `raw` twice in one tick would lose text.
    const texts: string[] = [];
    for (const id of [...flightMeta.current.keys()]) {
      const t = startGlide(id, true);
      if (t !== null) texts.push(t);
    }
    if (strokes.current.length > 0 && recognizeRef.current) {
      cancelTimer();
      const t = convertNow(recognizeRef.current, true);
      if (t) texts.push(t);
    }
    if (texts.length > 0) commit(texts.join(''));
    syncPending();
  }, [cancelTimer, commit, convertNow, runLive, startGlide, syncPending]);

  useImperativeHandle(ref, () => ({ flush }), [flush]);

  /* ---------- lifecycle ---------- */

  useEffect(() => {
    alive.current = true;
    loadRecognizer().then(
      (r) => {
        if (alive.current) recognizeRef.current = r;
      },
      () => undefined,
    );
    const meta = flightMeta.current;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = null;
      // Text the child already saw being typed must not vanish (e.g. a quick switch to the keypad).
      const unsent: string[] = [];
      for (const m of meta.values()) {
        if (m.commit) clearTimeout(m.commit);
        clearTimeout(m.end);
        if (!m.committed) unsent.push(m.text);
      }
      meta.clear();
      if (unsent.length > 0 && !latest.current.disabled) latest.current.onConvert?.(unsent.join(''));
      if (pendingRef.current) {
        pendingRef.current = false;
        latest.current.onPendingChange?.(false);
      }
    };
  }, []);

  // Tapping a button / link outside the pad (✓ Check, Keypad, …) hands pending writing over first, like iPadOS
  // Scribble. pointerdown comes before click, and React renders the parent's update in between.
  useEffect(() => {
    const outside = (target: EventTarget | null) => {
      const wrap = wrapRef.current;
      return !!wrap && target instanceof Element && !wrap.contains(target);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (pendingRef.current && outside(e.target) && (e.target as Element).closest(INTERACTIVE)) flush();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (pendingRef.current && (e.key === 'Enter' || e.key === ' ') && outside(e.target)) flush();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [flush]);

  /* ---------- clearing ---------- */

  const clear = useCallback(() => {
    cancelTimer();
    strokes.current = [];
    current.current = null;
    setCount(0);
    redraw();
  }, [cancelTimer, redraw]);

  useEffect(() => {
    clear();
    active.current = null;
    rejected.current.clear();
    // A new question / box: unfinished conversions must not land in it; finished ones may finish gliding.
    dropUncommitted();
    history.current = [];
    setHistoryCount(0);
    syncPending();
  }, [resetKey, clear, dropUncommitted, syncPending]);

  useEffect(() => {
    if (disabled) {
      // Locked: nothing may land any more. Ink stays visible (frozen) and converts if the pad is enabled again.
      cancelTimer();
      if (current.current || active.current) {
        current.current = null;
        active.current = null;
        redraw();
      }
      dropUncommitted();
    } else if (strokes.current.length > 0) {
      schedule();
    }
    syncPending();
  }, [disabled, cancelTimer, dropUncommitted, redraw, schedule, syncPending]);

  useEffect(() => {
    const onResize = () => redraw();
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, [redraw]);

  const posOf = (canvas: HTMLCanvasElement, clientX: number, clientY: number): Point => {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left - canvas.clientLeft, y: clientY - rect.top - canvas.clientTop };
  };

  const showHint = () => {
    setHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      hintTimer.current = null;
      setHint(false);
    }, PENCIL_HINT_MS);
  };

  const hideHint = () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = null;
    setHint(false);
  };

  /* ---------- tools ---------- */

  const inFlight = scribble && flights.some((f) => !f.gliding);
  const canUndoCommitted = scribble && typeof onUndoConvert === 'function' && (canUndoConvert ?? historyCount > 0);
  const undoTargetsText = scribble && count === 0 && (inFlight || typeof onUndoConvert === 'function');

  const undo = () => {
    if (strokes.current.length > 0) {
      strokes.current.pop();
      setCount(strokes.current.length);
      redraw();
      if (scribble) schedule();
      else {
        cancelTimer();
        runLive();
      }
      syncPending();
      return;
    }
    // A number still turning into text: cancel it (it never reaches the parent).
    if (scribble && dropUncommitted(true) > 0) {
      syncPending();
      return;
    }
    if (canUndoCommitted) {
      const last = history.current.pop() ?? '';
      setHistoryCount(history.current.length);
      announce(last ? `Removed ${last}` : 'Removed the last number');
      onUndoConvert?.(last);
    }
  };

  return (
    <div className={scribble ? 'hw-wrap hw-scribble' : 'hw-wrap'} ref={wrapRef}>
      <div className="hw-stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className="hw-canvas"
          aria-label={label}
          role="img"
          onPointerDown={(e) => {
            if (disabled) return;
            const isPen = e.pointerType === 'pen';
            if (isPen) {
              notePencil();
              for (const id of rejected.current.keys()) rejected.current.set(id, true);
              hideHint();
            } else if (e.pointerType === 'touch' && pencilRecent()) {
              rejected.current.set(e.pointerId, false); // palm rejection
              return;
            }
            if (active.current) {
              if (!(isPen && active.current.type === 'touch')) return; // one pointer draws at a time
              // The palm landed before the Pencil: drop the palm's stroke and let the Pencil take over.
              try {
                e.currentTarget.releasePointerCapture?.(active.current.id);
              } catch {
                /* pointer already gone */
              }
              current.current = null;
            }
            active.current = { id: e.pointerId, type: e.pointerType };
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch {
              /* pointer already gone */
            }
            current.current = [posOf(e.currentTarget, e.clientX, e.clientY)];
            cancelTimer();
            redraw();
            syncPending();
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'pen') notePencil();
            if (!current.current || e.pointerId !== active.current?.id) return;
            // Apple Pencil reports up to 240 Hz; coalesced events keep fast strokes smooth where supported.
            const native = e.nativeEvent as PointerEvent;
            const batch = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
            if (batch.length > 0) for (const ev of batch) current.current.push(posOf(e.currentTarget, ev.clientX, ev.clientY));
            else current.current.push(posOf(e.currentTarget, e.clientX, e.clientY));
            redraw();
          }}
          onPointerUp={(e) => {
            if (e.pointerType === 'pen') notePencil();
            if (rejected.current.has(e.pointerId)) {
              const penMeanwhile = rejected.current.get(e.pointerId);
              rejected.current.delete(e.pointerId);
              // A finger stroke with no Pencil around: say why nothing was drawn.
              if (!penMeanwhile && !active.current && !disabled) showHint();
              return;
            }
            if (e.pointerId !== active.current?.id) return;
            active.current = null;
            if (!current.current) return;
            strokes.current.push(current.current);
            current.current = null;
            setCount(strokes.current.length);
            redraw();
            schedule();
            syncPending();
          }}
          onPointerCancel={(e) => {
            rejected.current.delete(e.pointerId);
            // Only the drawing pointer can cancel the stroke (a rejected palm touch must not erase the Pencil line).
            if (e.pointerId !== active.current?.id) return;
            active.current = null;
            current.current = null;
            redraw();
            // pointerdown paused the wait for the earlier strokes: restart it (both modes).
            if (strokes.current.length > 0) schedule();
            syncPending();
          }}
        />
        {flights.map((f) => (
          <div
            key={f.id}
            className="scribble-layer"
            aria-hidden="true"
            style={
              {
                left: f.ox,
                top: f.oy,
                right: f.ox,
                bottom: f.oy,
                '--scribble-ink': f.color,
                '--scribble-morph': `${SCRIBBLE_MORPH_MS}ms`,
                '--scribble-glide': `${SCRIBBLE_GLIDE_MS}ms`,
              } as CSSProperties
            }
          >
            {f.gliding ? null : (
              <svg className="scribble-ink" style={{ transformOrigin: `${f.cx}px ${f.cy}px` }} focusable="false">
                {f.paths.map((d, i) => (
                  <path key={i} d={d} strokeWidth={f.lineWidth} />
                ))}
              </svg>
            )}
            <span
              className={f.gliding ? 'scribble-text is-gliding' : 'scribble-text'}
              style={{ left: f.cx, top: f.cy, fontSize: f.fontSize, '--scribble-dx': `${f.dx}px`, '--scribble-dy': `${f.dy}px`, '--scribble-scale': f.scale } as CSSProperties}
            >
              <span className="scribble-shine">{f.text}</span>
            </span>
          </div>
        ))}
        {hint ? (
          <p className="hw-pencil-hint" aria-hidden="true">
            {PENCIL_HINT_TEXT}
          </p>
        ) : null}
      </div>
      {scribble ? (
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement ? <span key={announcement.n}>{announcement.text}</span> : null}
        </p>
      ) : null}
      <div className="hw-tools">
        <button type="button" className="brick small ghost" disabled={disabled || (count === 0 && !inFlight && !canUndoCommitted)} onClick={undo} aria-label={undoTargetsText ? UNDO_CONVERT_LABEL : UNDO_LINE_LABEL}>
          ↶
        </button>
        <button
          type="button"
          className="brick small ghost"
          disabled={disabled || (count === 0 && !inFlight)}
          onClick={() => {
            clear();
            dropUncommitted();
            if (!scribble) onText?.('');
            syncPending();
          }}
          aria-label={CLEAR_WRITING_LABEL}
        >
          🧽
        </button>
      </div>
    </div>
  );
}
