/**
 * Countdown timer state machine. Time is computed from timestamps (not by counting ticks), so it stays correct
 * when the browser throttles background tabs.
 *   IDLE —START→ RUNNING ⇄ PAUSED ; RUNNING —(time runs out)→ EXPIRED ; any —RESET→ IDLE
 */
export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'EXPIRED';

export interface TimerState {
  readonly status: TimerStatus;
  readonly totalMs: number;
  /** Remaining time at `since` (when running) or now (when paused/idle). */
  readonly remainingMs: number;
  readonly since: number | null;
}

export const INITIAL_TIMER: TimerState = { status: 'IDLE', totalMs: 0, remainingMs: 0, since: null };

export function remainingMs(t: TimerState, now: number): number {
  if (t.status === 'RUNNING' && t.since !== null) return Math.max(0, t.remainingMs - (now - t.since));
  return t.remainingMs;
}

export type TimerAction =
  | { type: 'START'; totalMs: number; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'RESET' };

export function timerReducer(t: TimerState, a: TimerAction): TimerState {
  switch (a.type) {
    case 'START':
      if (a.totalMs <= 0) return INITIAL_TIMER;
      return { status: 'RUNNING', totalMs: a.totalMs, remainingMs: a.totalMs, since: a.now };
    case 'PAUSE':
      if (t.status !== 'RUNNING') return t;
      return { ...t, status: 'PAUSED', remainingMs: remainingMs(t, a.now), since: null };
    case 'RESUME':
      if (t.status !== 'PAUSED') return t;
      return { ...t, status: 'RUNNING', since: a.now };
    case 'TICK': {
      if (t.status !== 'RUNNING') return t;
      const left = remainingMs(t, a.now);
      return left <= 0 ? { ...t, status: 'EXPIRED', remainingMs: 0, since: null } : t;
    }
    case 'RESET':
      return INITIAL_TIMER;
  }
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Severity colours like the legacy site: warn at ≤ 35% left, bad at ≤ 15%. */
export function timerSeverity(t: TimerState, now: number): 'ok' | 'warn' | 'bad' {
  if (t.totalMs <= 0) return 'ok';
  const f = remainingMs(t, now) / t.totalMs;
  return f <= 0.15 ? 'bad' : f <= 0.35 ? 'warn' : 'ok';
}
