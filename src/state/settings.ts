/**
 * Everything the parent can customise. Persisted per browser. The child's screen shows only the question,
 * strategies and the answer spot; all of these settings live behind the Parent passcode.
 */
import type { Difficulty } from '../domain/question/types';
import { defaultPlan, withDifficulty, type PracticePlan } from '../engines/plan/practicePlan';
import { load, save } from './persistence';

/** How the child answers: brick number pad, handwriting (Scribble-style), tally marks (tap or draw), or a keyboard. */
export type InputMode = 'KEYPAD' | 'WRITE' | 'TALLY' | 'TYPE';
/** How digit keys look: tally marks (with a small numeral), numeral + small tally, or plain numerals. */
export type KeypadStyle = 'TALLY' | 'BOTH' | 'NUMBERS';
/** Digit order on the keypad: phone (1-2-3 on top, easiest for children) or calculator (7-8-9 on top). */
export type KeypadLayout = 'PHONE' | 'CALCULATOR';
/** Can the child read? Not-yet readers get everything spoken and icon-only buttons. */
export type ReaderLevel = 'NOT_YET' | 'LEARNING' | 'READER';
export type Celebration = 'TOWER' | 'CONFETTI' | 'STARS' | 'NONE';
export type FontChoice = 'ROUNDED' | 'CLASSIC' | 'EASY_READ';
export type WriteSpeed = 'QUICK' | 'NORMAL' | 'SLOW';
export const WRITE_DELAY_MS: Record<WriteSpeed, number> = { QUICK: 450, NORMAL: 700, SLOW: 1200 };
export type Baseplate = 'GREEN' | 'BLUE' | 'GRAY' | 'TAN' | 'WHITE' | 'NIGHT';

export interface AppSettings {
  readonly version: 2;
  readonly level: Difficulty;
  readonly plan: PracticePlan;
  readonly session: {
    readonly mode: 'PRACTICE' | 'QUIZ';
    readonly quizLength: number;
    readonly timer: 'OFF' | 'AUTO' | 'CUSTOM';
    readonly timerMinutes: number;
    /** When the child may open "Ways to solve". */
    readonly strategies: 'AFTER_ANSWER' | 'ANYTIME';
    /** Practice tries per question before the solution is shown. Quizzes always allow one graded try. */
    readonly triesPerQuestion: number;
    /** Fixed quiz code for reproducible quizzes ('' = new code each quiz). */
    readonly quizCode: string;
  };
  readonly input: {
    readonly modes: readonly InputMode[];
    readonly defaultMode: InputMode;
    readonly keypadStyle: KeypadStyle;
    readonly keypadLayout: KeypadLayout;
    /** Show + − × ÷ buttons above the number pad so the child can pick one of the operations the parent chose. */
    readonly opButtons: boolean;
    /** How long handwriting waits after the last stroke before it turns into numbers. */
    readonly writeSpeed: WriteSpeed;
  };
  readonly look: {
    /** Index into THEMES (brick colour). */
    readonly theme: number;
    readonly baseplate: Baseplate;
    readonly studs: boolean;
    readonly fontScale: number;
    readonly font: FontChoice;
    readonly highContrast: boolean;
    readonly animations: boolean;
    readonly bigButtons: boolean;
    /** Show the MATH LAB brick logo on the child's screen (off = simplest screen). */
    readonly showLogo: boolean;
    /** Use the parent's own brick colour instead of a swatch. */
    readonly useCustomColor: boolean;
    readonly customColor: string;
    /** Clean, minimal kid screen: plain background, flat cards, fewer decorations. */
    readonly simple: boolean;
  };
  readonly fun: {
    readonly sounds: boolean;
    readonly volume: number;
    readonly celebration: Celebration;
    readonly readAloud: boolean;
    readonly autoRead: boolean;
    readonly voiceRate: number;
    readonly buddy: string;
    readonly showBuddy: boolean;
    readonly towerGoal: number;
    readonly showVisuals: boolean;
    readonly brickModels: boolean;
    /** Strategies become a game: the child fills each step by tapping the right brick. */
    readonly guidedSteps: boolean;
    /** Show 🔥 streaks for answers in a row. */
    readonly streaks: boolean;
    /** Pictures can be tapped to count them (1, 2, 3…). */
    readonly tapToCount: boolean;
    /** Parent's own cheer messages for correct answers ("{name}" becomes the nickname). Empty = built-in cheers. */
    readonly cheers: readonly string[];
    /** Show the brick tower on the child's screen. */
    readonly showTower: boolean;
    /** A brick flies to the tower after each correct answer. */
    readonly flyingBricks: boolean;
  };
  readonly child: {
    readonly name: string;
    readonly nickname: string;
    readonly reader: ReaderLevel;
    /** Put the child's nickname into word problems ("Rihaan has 12 stickers…"). */
    readonly nameInStories: boolean;
  };
  /** Strategy ids the parent turned off (by strategy family, e.g. "COLUMN_ADDITION"). */
  readonly strategies: {
    readonly hidden: readonly string[];
  };
  readonly autoLockMinutes: number;
}

export const BUDDIES = ['🤖', '🦖', '🐱', '🚀', '🦄', '🐶', '🐼', '🦊', '🐸', '🐙'] as const;

export function defaultSettings(): AppSettings {
  return {
    version: 2,
    level: 'MEDIUM',
    plan: defaultPlan(),
    session: { mode: 'PRACTICE', quizLength: 10, timer: 'OFF', timerMinutes: 5, strategies: 'AFTER_ANSWER', triesPerQuestion: 3, quizCode: '' },
    input: { modes: ['KEYPAD', 'WRITE', 'TALLY'], defaultMode: 'KEYPAD', keypadStyle: 'BOTH', keypadLayout: 'PHONE', opButtons: true, writeSpeed: 'NORMAL' },
    look: { theme: 17, baseplate: 'GREEN', studs: true, fontScale: 1, font: 'ROUNDED', highContrast: false, animations: true, bigButtons: false, showLogo: false, useCustomColor: false, customColor: '#ff7a00', simple: true },
    fun: {
      sounds: true,
      volume: 0.6,
      celebration: 'TOWER',
      readAloud: true,
      autoRead: false,
      voiceRate: 0.95,
      buddy: '🤖',
      showBuddy: true,
      towerGoal: 10,
      showVisuals: true,
      brickModels: true,
      guidedSteps: true,
      streaks: true,
      tapToCount: true,
      cheers: [],
      showTower: true,
      flyingBricks: true,
    },
    child: { name: 'Rihaan Swarup', nickname: 'Rihaan', reader: 'READER', nameInStories: true },
    strategies: { hidden: [] },
    autoLockMinutes: 10,
  };
}

const KEY = 'settings';

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

/** Merge stored settings over defaults so new fields get defaults and bad values are repaired. */
export function sanitizeSettings(raw: unknown): AppSettings {
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<AppSettings>;
  const plan = (r.plan ?? d.plan) as PracticePlan;
  const merged: AppSettings = {
    ...d,
    level: (['EASY', 'MEDIUM', 'HARD', 'CUSTOM'] as const).includes(r.level as Difficulty) ? (r.level as Difficulty) : d.level,
    plan: {
      arithmetic: { ...d.plan.arithmetic, ...plan.arithmetic, settings: { ...d.plan.arithmetic.settings, ...plan.arithmetic?.settings } },
      fractions: { ...d.plan.fractions, ...plan.fractions, settings: { ...d.plan.fractions.settings, ...plan.fractions?.settings } },
      decimals: { ...d.plan.decimals, ...plan.decimals, settings: { ...d.plan.decimals.settings, ...plan.decimals?.settings } },
      order: { ...d.plan.order, ...plan.order, settings: { ...d.plan.order.settings, ...plan.order?.settings } },
      wordProblems: { ...d.plan.wordProblems, ...plan.wordProblems, settings: { ...d.plan.wordProblems.settings, ...plan.wordProblems?.settings } },
      gradeLevel: { ...d.plan.gradeLevel, ...plan.gradeLevel, settings: { ...d.plan.gradeLevel.settings, ...plan.gradeLevel?.settings } },
    },
    session: { ...d.session, ...r.session },
    input: { ...d.input, ...r.input },
    look: { ...d.look, ...r.look },
    fun: { ...d.fun, ...r.fun },
    child: { ...d.child, ...r.child },
    strategies: { hidden: Array.isArray(r.strategies?.hidden) ? r.strategies.hidden.filter((x): x is string => typeof x === 'string').slice(0, 300) : [] },
    autoLockMinutes: clampNumber(r.autoLockMinutes, 1, 120, d.autoLockMinutes),
  };
  const modes = merged.input.modes.filter((m): m is InputMode => m === 'KEYPAD' || m === 'WRITE' || m === 'TALLY' || m === 'TYPE');
  return {
    ...merged,
    session: {
      ...merged.session,
      quizLength: Math.round(clampNumber(merged.session.quizLength, 1, 200, 10)),
      timerMinutes: clampNumber(merged.session.timerMinutes, 1, 180, 5),
      triesPerQuestion: Math.round(clampNumber(merged.session.triesPerQuestion, 1, 10, 3)),
      // Quiz codes are simple 4–7 digit numbers; anything else (older letter codes) means "new quiz each time".
      quizCode: typeof merged.session.quizCode === 'string' && /^\d{4,7}$/.test(merged.session.quizCode) ? merged.session.quizCode : '',
    },
    input: {
      modes: modes.length ? modes : ['KEYPAD'],
      defaultMode: modes.includes(merged.input.defaultMode) ? merged.input.defaultMode : (modes[0] ?? 'KEYPAD'),
      keypadStyle: (['TALLY', 'BOTH', 'NUMBERS'] as const).includes(merged.input.keypadStyle) ? merged.input.keypadStyle : 'TALLY',
      keypadLayout: merged.input.keypadLayout === 'CALCULATOR' ? 'CALCULATOR' : 'PHONE',
      opButtons: merged.input.opButtons !== false,
      writeSpeed: (['QUICK', 'NORMAL', 'SLOW'] as const).includes(merged.input.writeSpeed) ? merged.input.writeSpeed : 'NORMAL',
    },
    child: { ...merged.child, reader: (['NOT_YET', 'LEARNING', 'READER'] as const).includes(merged.child.reader) ? merged.child.reader : 'READER' },
    look: {
      ...merged.look,
      theme: Math.round(clampNumber(merged.look.theme, 0, 18, 17)),
      fontScale: clampNumber(merged.look.fontScale, 0.85, 1.6, 1),
      customColor: typeof merged.look.customColor === 'string' && /^#[0-9a-f]{6}$/i.test(merged.look.customColor) ? merged.look.customColor : d.look.customColor,
      useCustomColor: merged.look.useCustomColor === true,
      showLogo: merged.look.showLogo === true,
      simple: merged.look.simple !== false,
    },
    fun: {
      ...merged.fun,
      volume: clampNumber(merged.fun.volume, 0, 1, 0.6),
      voiceRate: clampNumber(merged.fun.voiceRate, 0.5, 1.5, 0.95),
      towerGoal: Math.round(clampNumber(merged.fun.towerGoal, 3, 50, 10)),
      cheers: Array.isArray(merged.fun.cheers) ? merged.fun.cheers.filter((c): c is string => typeof c === 'string' && c.trim() !== '').map((c) => c.slice(0, 60)).slice(0, 20) : [],
    },
  };
}

export function loadSettings(): AppSettings {
  return sanitizeSettings(load(KEY));
}

export function saveSettings(s: AppSettings): void {
  save(KEY, s);
}

/** Reading support derived from the parent's "Can your child read?" choice. */
export interface ReadingSupport {
  /** Read every question aloud automatically. */
  autoRead: boolean;
  /** Always show 🔊 buttons (questions, steps, choices). */
  speakButtons: boolean;
  /** Buttons show icons only (no words). */
  iconOnly: boolean;
  /** Speak feedback ("Great job!") and strategy steps when they appear. */
  speakFeedback: boolean;
}

export function readingSupport(s: AppSettings): ReadingSupport {
  switch (s.child.reader) {
    case 'NOT_YET':
      return { autoRead: true, speakButtons: true, iconOnly: true, speakFeedback: true };
    case 'LEARNING':
      return { autoRead: true, speakButtons: true, iconOnly: false, speakFeedback: true };
    default:
      return { autoRead: s.fun.readAloud && s.fun.autoRead, speakButtons: s.fun.readAloud, iconOnly: false, speakFeedback: false };
  }
}

export function setLevel(s: AppSettings, level: Difficulty): AppSettings {
  return { ...s, level, plan: withDifficulty(s.plan, level) };
}
