// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../../app/AppContext';
import type { Session } from '../../app/useSession';
import { ParentView } from '../../components/parent/ParentView';
import { AnswersSection, ChildSection, FunSection, LookSection, SessionSection } from '../../components/parent/Sections';
import { formatSeconds, planSummary, StartSection, STOP_QUIZ_QUESTION, todayStats } from '../../components/parent/StartSection';
import { buildStrategyCatalog, gradeGroupKey, StrategiesSection } from '../../components/parent/StrategiesSection';
import { ALL_SKILLS } from '../../curriculum/registry';
import { allStrategies } from '../../domain/question/build';
import type { ArithmeticOperator, Question } from '../../domain/question/types';
import { createSeededRandom, type RandomSource } from '../../domain/random/random';
import { defaultArithmeticSettings, generateArithmetic, type ArithmeticSettings } from '../../engines/arithmetic/arithmeticEngine';
import { defaultDecimalSettings, generateDecimal } from '../../engines/decimals/decimalEngine';
import { defaultFractionSettings, generateFraction, type FractionOperation } from '../../engines/fractions/fractionEngine';
import { defaultOrderSettings, generateOrder } from '../../engines/orderOfOperations/orderEngine';
import { defaultPlan } from '../../engines/plan/practicePlan';
import { defaultWordProblemSettings, generateWordProblem } from '../../engines/wordProblems/wordProblemEngine';
import { emptyProgress, type AttemptLog, type ProgressStore } from '../../state/progress';
import { defaultSettings, type AppSettings } from '../../state/settings';

/** Captures the latest settings from context so tests can assert on what was stored. */
const seen: { settings: AppSettings | null } = { settings: null };
function Probe() {
  const { settings } = useApp();
  seen.settings = settings;
  return null;
}
const stored = (): AppSettings => {
  if (!seen.settings) throw new Error('Probe did not render');
  return seen.settings;
};

function Unlock() {
  const { unlockParent } = useApp();
  useEffect(() => unlockParent(), [unlockParent]);
  return null;
}

function renderWith(ui: ReactNode, settings: AppSettings = defaultSettings(), progress: ProgressStore = emptyProgress()) {
  return render(
    <AppProvider initialSettings={settings} initialProgress={progress}>
      <Probe />
      {ui}
    </AppProvider>,
  );
}

function stubSession(overrides: Partial<{ status: 'IDLE' | 'IN_PROGRESS' | 'COMPLETE'; answered: number; length: number }> = {}) {
  const resetQuiz = vi.fn();
  const session = { resetQuiz, quiz: { status: overrides.status ?? 'IDLE', answered: overrides.answered ?? 0, length: overrides.length ?? 0 } } as unknown as Session;
  return { session, resetQuiz };
}

const log = (at: number, correct: boolean): AttemptLog => ({ at, topic: 'ARITHMETIC', questionText: '2 + 2', yourText: correct ? '4' : '5', correctText: '4', correct, standards: [] });

beforeEach(() => {
  globalThis.location.hash = '#/parent';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  seen.settings = null;
  try {
    globalThis.localStorage.clear();
  } catch {
    /* storage is optional */
  }
});

/* ------------------------------------------------------------------ */
describe('🏠 StartSection', () => {
  it('Start quiz switches to QUIZ, resets the session and opens the kid screen', () => {
    const { session, resetQuiz } = stubSession();
    renderWith(<StartSection session={session} />);
    expect(screen.getByText('Now: Practice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '📝 Start quiz' }));
    expect(stored().session.mode).toBe('QUIZ');
    expect(resetQuiz).toHaveBeenCalledTimes(1);
    expect(globalThis.location.hash).toBe('#/');
    expect(screen.getByText('Now: Quiz')).toBeInTheDocument();
  });

  it('Start practice switches back to PRACTICE', () => {
    const { session, resetQuiz } = stubSession();
    const s = defaultSettings();
    renderWith(<StartSection session={session} />, { ...s, session: { ...s.session, mode: 'QUIZ' } });
    expect(screen.getByText('Now: Quiz')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '▶ Start practice' }));
    expect(stored().session.mode).toBe('PRACTICE');
    expect(resetQuiz).toHaveBeenCalledTimes(1);
    expect(globalThis.location.hash).toBe('#/');
  });

  it('works without a session (no crash) and edits quiz length and timer', () => {
    renderWith(<StartSection />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Questions' }), { target: { value: '25' } });
    expect(stored().session.quizLength).toBe(25);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Questions' }), { target: { value: '999' } });
    expect(stored().session.quizLength).toBe(200);
    const timer = screen.getByRole('group', { name: 'Quiz timer' });
    fireEvent.click(within(timer).getByRole('button', { name: /Recommended/ }));
    expect(stored().session.timer).toBe('AUTO');
    fireEvent.click(within(timer).getByRole('button', { name: 'Custom' }));
    expect(stored().session.timer).toBe('CUSTOM');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minutes' }), { target: { value: '12' } });
    expect(stored().session.timerMinutes).toBe(12);
    fireEvent.click(screen.getByRole('button', { name: '📝 Start quiz' }));
    expect(stored().session.mode).toBe('QUIZ');
  });

  it('quiz number: 4–7 digits are stored, a partial number blocks the start, empty means new each time', () => {
    const { session, resetQuiz } = stubSession();
    renderWith(<StartSection session={session} />);
    const code = screen.getByRole('textbox', { name: /Quiz number/ });
    fireEvent.change(code, { target: { value: '12a' } });
    expect((code as HTMLInputElement).value).toBe('12');
    fireEvent.click(screen.getByRole('button', { name: '📝 Start quiz' }));
    expect(resetQuiz).not.toHaveBeenCalled();
    expect(stored().session.mode).toBe('PRACTICE');
    expect(screen.getByRole('alert')).toHaveTextContent('4 to 7 digits');
    fireEvent.change(code, { target: { value: '48213' } });
    expect(stored().session.quizCode).toBe('48213');
    fireEvent.click(screen.getByRole('button', { name: 'Clear quiz number' }));
    expect(stored().session.quizCode).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'New quiz number' }));
    expect(stored().session.quizCode).toMatch(/^\d{4}$/);
  });

  it('summary shows the math that is on, the level, reading level and today’s answers', () => {
    const s = defaultSettings();
    const plan = defaultPlan();
    const settings: AppSettings = {
      ...s,
      child: { ...s.child, reader: 'NOT_YET' },
      plan: {
        ...plan,
        arithmetic: { ...plan.arithmetic, settings: { ...plan.arithmetic.settings, enabledOperations: ['ADD', 'MULTIPLY'] } },
        fractions: { ...plan.fractions, enabled: true },
        gradeLevel: { ...plan.gradeLevel, enabled: true, settings: { ...plan.gradeLevel.settings, grade: '2', skillIds: [] } },
      },
    };
    const now = Date.now();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const progress: ProgressStore = { ...emptyProgress(), recent: [log(now, true), log(now - 1, false), log(now - 2, true), log(yesterday.getTime(), false)] };
    renderWith(<StartSection />, settings, progress);
    const summary = screen.getByRole('region', { name: /At a glance/ });
    expect(summary).toHaveTextContent('Whole numbers: + ×');
    expect(summary).toHaveTextContent('Fractions');
    expect(summary).toHaveTextContent(/Grade 2: all \d+ skills/);
    expect(summary).toHaveTextContent('Standard');
    expect(summary).toHaveTextContent('Not reading yet');
    expect(summary).toHaveTextContent('3 answered · 67% right');
  });

  it('helpers: todayStats ignores earlier days; formatSeconds; planSummary', () => {
    const now = new Date(2026, 9, 6, 15, 30).getTime();
    const early = new Date(2026, 9, 6, 0, 0, 1).getTime();
    const lastNight = new Date(2026, 9, 5, 23, 59).getTime();
    expect(todayStats([log(now, true), log(early, false), log(lastNight, true)], now)).toEqual({ answered: 2, correct: 1, accuracy: 50 });
    expect(todayStats([], now).accuracy).toBeNull();
    expect(formatSeconds(305)).toBe('5:05');
    expect(planSummary(defaultPlan())).toEqual(['➕ Whole numbers: +']);
  });

  it('shows a running quiz', () => {
    const { session } = stubSession({ status: 'IN_PROGRESS', answered: 3, length: 10 });
    renderWith(<StartSection session={session} />);
    expect(screen.getByText(/A quiz is running: 3 of 10 answered/)).toBeInTheDocument();
  });

  it('a running quiz: ▶ Continue quiz keeps it; the start buttons ask before throwing it away', () => {
    const { session, resetQuiz } = stubSession({ status: 'IN_PROGRESS', answered: 3, length: 10 });
    const s = defaultSettings();
    renderWith(<StartSection session={session} />, { ...s, session: { ...s.session, mode: 'QUIZ' } });
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

    fireEvent.click(screen.getByRole('button', { name: '▶ Start practice' }));
    expect(confirm).toHaveBeenCalledWith(STOP_QUIZ_QUESTION);
    expect(resetQuiz).not.toHaveBeenCalled();
    expect(stored().session.mode).toBe('QUIZ');
    expect(globalThis.location.hash).toBe('#/parent');

    fireEvent.click(screen.getByRole('button', { name: '📝 Start quiz' }));
    expect(resetQuiz).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '▶ Continue quiz' }));
    expect(resetQuiz).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(globalThis.location.hash).toBe('#/');

    globalThis.location.hash = '#/parent';
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: '▶ Start practice' }));
    expect(resetQuiz).toHaveBeenCalledTimes(1);
    expect(stored().session.mode).toBe('PRACTICE');
    expect(globalThis.location.hash).toBe('#/');
  });

  it('no running quiz: no Continue button and no question asked', () => {
    const { session, resetQuiz } = stubSession({ status: 'COMPLETE', answered: 10, length: 10 });
    renderWith(<StartSection session={session} />);
    const confirm = vi.spyOn(globalThis, 'confirm');
    expect(screen.queryByRole('button', { name: '▶ Continue quiz' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '📝 Start quiz' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(resetQuiz).toHaveBeenCalledTimes(1);
  });

  it('Clear quiz number stays focusable (aria-disabled) when the field is empty', () => {
    renderWith(<StartSection />);
    const clear = screen.getByRole('button', { name: 'Clear quiz number' });
    expect(clear).toHaveAttribute('aria-disabled', 'true');
    expect(clear).not.toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: /Quiz number/ }), { target: { value: '4821' } });
    expect(clear).toHaveAttribute('aria-disabled', 'false');
    clear.focus();
    fireEvent.click(clear);
    expect(stored().session.quizCode).toBe('');
    expect(document.activeElement).toBe(clear);
  });
});

/* ------------------------------------------------------------------ */
describe('🧩 StrategiesSection', () => {
  it('catalog: built from every engine and grade, deterministic, at least 20 strategies', () => {
    const t0 = performance.now();
    const catalog = buildStrategyCatalog();
    const ms = performance.now() - t0;
    expect(catalog.ids.length).toBeGreaterThanOrEqual(20);
    expect(new Set(catalog.ids).size).toBe(catalog.ids.length);
    const labels = catalog.groups.map((g) => g.label.replace(/^\S+\s/, ''));
    expect(labels).toEqual(['Whole numbers', 'Fractions', 'Decimals', 'Order of operations', 'Word problems', 'Grade K', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8']);
    for (const g of catalog.groups) {
      expect(g.chips.length, g.label).toBeGreaterThan(0);
      expect(new Set(g.chips.map((c) => c.title)).size, `${g.label}: every chip has its own name`).toBe(g.chips.length);
      for (const c of g.chips) {
        expect(c.title.trim(), c.id).not.toBe('');
        expect(catalog.ids).toContain(c.id);
      }
    }
    expect(buildStrategyCatalog()).toEqual(catalog);
    expect(ms).toBeLessThan(3000); // generous bound for slow CI; typically 100–200 ms (and built in the background in the app)
  });

  it('catalog: lists every strategy children really meet (independent wider sweep, incl. settings parents can change)', () => {
    const catalog = buildStrategyCatalog();
    const chipsIn = (key: string) => new Set(catalog.groups.find((g) => g.key === key)?.chips.map((c) => c.id) ?? []);
    const groupIds = new Map(catalog.groups.map((g) => [g.key, chipsIn(g.key)]));
    /** group → strategy id → [hits, where] in a sweep that uses other seeds than the catalog. */
    const hits = new Map<string, Map<string, { n: number; where: string }>>();
    const sweep = (key: string, where: string, n: number, make: (rng: RandomSource) => Question) => {
      const group = hits.get(key) ?? new Map<string, { n: number; where: string }>();
      hits.set(key, group);
      for (let i = 0; i < n; i++) {
        let q: Question;
        try {
          q = make(createSeededRandom(`catalog-coverage|${where}|${i}`));
        } catch {
          continue;
        }
        for (const id of new Set(allStrategies(q).map((t) => t.strategy))) {
          const h = group.get(id) ?? { n: 0, where };
          h.n += 1;
          group.set(id, h);
        }
      }
    };
    const LEVELS = ['EASY', 'MEDIUM', 'HARD'] as const;
    const OPS: ArithmeticOperator[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];
    const FOPS: FractionOperation[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'SIMPLIFY', 'COMPARE', 'CONVERT'];
    for (const d of LEVELS) {
      for (const op of OPS) {
        const base: ArithmeticSettings = { ...defaultArithmeticSettings(), difficulty: d, enabledOperations: [op] };
        const variants: [string, ArithmeticSettings][] = [
          ['two', base],
          ['three', { ...base, operandCount: 3 }],
          ['four', { ...base, operandCount: 4 }],
          ['negative', { ...base, allowNegativeOperands: true, allowNegativeResults: true }],
          ['remainder', { ...base, divisionMode: 'REMAINDER' }],
          ['decimal', { ...base, divisionMode: 'DECIMAL' }],
        ];
        for (const [name, settings] of variants) sweep('whole', `whole ${name} ${d} ${op}`, 40, (r) => generateArithmetic(settings, r));
        sweep('decimals', `decimals ${d} ${op}`, 40, (r) => generateDecimal({ ...defaultDecimalSettings(), difficulty: d, operations: [op] }, r));
        sweep('word', `word ${d} ${op}`, 40, (r) => generateWordProblem({ ...defaultWordProblemSettings(), difficulty: d, operations: [op] }, r));
      }
      for (const op of FOPS) sweep('fractions', `fractions ${d} ${op}`, 40, (r) => generateFraction({ ...defaultFractionSettings(), difficulty: d, operations: [op] }, r));
      sweep('order', `order ${d}`, 120, (r) => generateOrder({ ...defaultOrderSettings(), difficulty: d }, r));
      for (const skill of ALL_SKILLS) sweep(gradeGroupKey(skill.grade), `${skill.id} ${d}`, 30, (r) => skill.generate(r, d));
    }
    for (const op of ['ADD', 'SUBTRACT', 'MULTIPLY'] as const) {
      const custom: ArithmeticSettings = { ...defaultArithmeticSettings(), difficulty: 'CUSTOM', enabledOperations: [op], operandCount: 3, operandRange: { min: -15, max: 15 }, secondOperandRange: { min: -10, max: 10 }, allowNegativeOperands: true, allowNegativeResults: true };
      sweep('whole', `whole custom signed ${op}`, 60, (r) => generateArithmetic(custom, r));
    }

    // Strategies seen at least twice (not one-offs) must have a chip in their group, so a parent can turn them off.
    const missing: string[] = [];
    for (const [key, group] of hits) {
      for (const [id, h] of group) if (h.n >= 2 && !groupIds.get(key)?.has(id)) missing.push(`${key}: ${id} (${h.n}× in ${h.where})`);
    }
    expect(missing).toEqual([]);
    // The ones reviewers found missing before.
    expect([...chipsIn('order')]).toEqual(expect.arrayContaining(['ONE_STEP_AT_A_TIME', 'TERM_BY_TERM', 'GROUPS_FIRST', 'DISTRIBUTIVE']));
    expect([...chipsIn('whole')]).toEqual(expect.arrayContaining(['ADD_WHAT_YOU_TAKE_AWAY', 'FRIENDLY_PAIR', 'GROUP_SIGNS', 'MAKE_DIVISOR_WHOLE']));
    expect(catalog.ids).toEqual(expect.arrayContaining(['PARITY_RULE', 'ONE_LESS', 'SPLIT_EQUALLY', 'DOUBLES_FACT', 'ABSOLUTE_VALUE', 'LIST_OUTCOMES', 'COUNTER_EXAMPLE', 'CHECK_FORWARD']));
  });

  it('catalog: built in background slices when the parent area opens; cancel stops it', async () => {
    vi.resetModules();
    const fresh = await import('../../components/parent/StrategiesSection');
    vi.useFakeTimers();
    try {
      const cancel = fresh.prewarmStrategyCatalog(0);
      cancel();
      vi.runAllTimers();
      expect(fresh.isStrategyCatalogReady()).toBe(false);
      fresh.prewarmStrategyCatalog(0);
      vi.runAllTimers();
      expect(fresh.isStrategyCatalogReady()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('toggling a strategy chip stores its id in settings.strategies.hidden; Show all resets', () => {
    renderWith(<StrategiesSection />);
    const status = screen.getByRole('status');
    const [, shown, total] = /(\d+) of (\d+) shown/.exec(status.textContent ?? '') ?? [];
    expect(Number(total)).toBeGreaterThanOrEqual(20);
    expect(shown).toBe(total);

    const whole = screen.getByRole('group', { name: '➕ Whole numbers' });
    const chip = within(whole).getAllByRole('button')[0] as HTMLElement;
    const id = chip.getAttribute('data-strategy');
    expect(id).toBeTruthy();
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(stored().strategies.hidden).toEqual([id]);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(status).toHaveTextContent(`${Number(total) - 1} of ${total} shown`);

    fireEvent.click(chip);
    expect(stored().strategies.hidden).toEqual([]);
    fireEvent.click(chip);
    const showAll = screen.getByRole('button', { name: '✓ Show all' });
    expect(showAll).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(showAll);
    expect(stored().strategies.hidden).toEqual([]);
    expect(showAll).toHaveAttribute('aria-disabled', 'true'); // still focusable, so keyboard focus is not lost
    expect(showAll).not.toBeDisabled();
  });

  it('✓ Turn all on puts focus on the group heading (the button itself goes away)', () => {
    renderWith(<StrategiesSection />);
    const whole = screen.getByRole('group', { name: '➕ Whole numbers' });
    fireEvent.click(within(whole).getAllByRole('button')[0] as HTMLElement);
    const turnOn = screen.getByRole('button', { name: '✓ Turn all on' });
    turnOn.focus();
    fireEvent.click(turnOn);
    expect(stored().strategies.hidden).toEqual([]);
    expect(screen.queryByRole('button', { name: '✓ Turn all on' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Whole numbers/ }));
  });

  it('groups open and close; search finds strategies in every group', () => {
    renderWith(<StrategiesSection />);
    const head = screen.getByRole('button', { name: /Grade 3/ });
    expect(head).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: '🎓 Grade 3' })).toBeNull();
    fireEvent.click(head);
    expect(head).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: '🎓 Grade 3' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a strategy' }), { target: { value: 'column addition' } });
    const chips = document.querySelectorAll('[data-strategy="COLUMN_ADDITION"]');
    expect(chips.length).toBeGreaterThan(1); // the same strategy is listed under Whole numbers and several grades
    fireEvent.click(chips[1] as HTMLElement);
    expect(stored().strategies.hidden).toEqual(['COLUMN_ADDITION']);
    document.querySelectorAll('[data-strategy="COLUMN_ADDITION"]').forEach((c) => expect(c).toHaveAttribute('aria-pressed', 'false'));

    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a strategy' }), { target: { value: 'zzzz-nothing' } });
    expect(screen.getByText(/No strategy matches/)).toBeInTheDocument();
  });

  it('strategy game toggle sets fun.guidedSteps', () => {
    renderWith(<StrategiesSection />);
    const game = screen.getByRole('checkbox', { name: /Strategy game/ });
    expect(game).toBeChecked();
    fireEvent.click(game);
    expect(stored().fun.guidedSteps).toBe(false);
    expect(screen.getByText(/If every strategy for a problem is turned off, all of them are shown\./)).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
describe('🎉 FunSection', () => {
  it('cheers textarea stores one trimmed cheer per line and previews the nickname', () => {
    renderWith(<FunSection />);
    const box = screen.getByRole('textbox', { name: /Cheers/ });
    fireEvent.change(box, { target: { value: '  Yay {name}!  \n\n Super \n' } });
    expect(stored().fun.cheers).toEqual(['Yay {name}!', 'Super']);
    expect((box as HTMLTextAreaElement).value).toBe('  Yay {name}!  \n\n Super \n'); // what the parent typed stays while editing
    expect(screen.getByText('Yay Rihaan!')).toBeInTheDocument();

    const many = Array.from({ length: 25 }, (_, i) => `Cheer ${i + 1} ${'!'.repeat(i === 0 ? 80 : 1)}`).join('\n');
    fireEvent.change(box, { target: { value: many } });
    const cheers = stored().fun.cheers;
    expect(cheers).toHaveLength(20);
    expect(cheers.every((c) => c.length <= 60)).toBe(true);
    expect(screen.getByText(/Only the first 20 cheers are used/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '↺ Built-in cheers' }));
    expect(stored().fun.cheers).toEqual([]);
    expect((box as HTMLTextAreaElement).value).toBe('');
  });

  it('cheer preview fills {Name} in any letter case, like the kid screen; the warning describes the box', () => {
    renderWith(<FunSection />);
    const box = screen.getByRole('textbox', { name: /Cheers/ });
    fireEvent.change(box, { target: { value: 'Go {Name}! {NAME} rocks' } });
    expect(screen.getByText('Go Rihaan! Rihaan rocks')).toBeInTheDocument();
    expect(document.querySelector('.cheer-preview')).not.toHaveAttribute('aria-live');
    const hint = document.getElementById(box.getAttribute('aria-describedby') ?? '') as HTMLElement;
    expect(within(hint).getByRole('status')).toHaveTextContent('');
    fireEvent.change(box, { target: { value: 'x'.repeat(70) } });
    expect(within(hint).getByRole('status')).toHaveTextContent('Long lines are cut at 60 letters.');
  });

  it('↺ Built-in cheers stays focusable after use (aria-disabled)', () => {
    renderWith(<FunSection />);
    const reset = screen.getByRole('button', { name: '↺ Built-in cheers' });
    expect(reset).toHaveAttribute('aria-disabled', 'true');
    fireEvent.change(screen.getByRole('textbox', { name: /Cheers/ }), { target: { value: 'Yay' } });
    expect(reset).toHaveAttribute('aria-disabled', 'false');
    reset.focus();
    fireEvent.click(reset);
    expect(stored().fun.cheers).toEqual([]);
    expect(document.activeElement).toBe(reset);
    expect(reset).toHaveAttribute('aria-disabled', 'true');
  });

  it('read aloud is locked on (and says why) while 🧒 Child is set to Not yet / A little', () => {
    const s = defaultSettings();
    const openChild = vi.fn();
    for (const reader of ['NOT_YET', 'LEARNING'] as const) {
      renderWith(<FunSection onOpenChild={openChild} />, { ...s, child: { ...s.child, reader }, fun: { ...s.fun, readAloud: false, autoRead: false } });
      for (const name of [/^Read aloud/, /Read every question automatically/]) {
        const box = screen.getByRole('checkbox', { name });
        expect(box).toBeChecked();
        expect(box).toBeDisabled();
        expect(box).toHaveAccessibleDescription(/Always on because/);
      }
      expect(screen.getByText(reader === 'NOT_YET' ? 'Not yet' : 'A little')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '🧒 Change' }));
      cleanup();
    }
    expect(openChild).toHaveBeenCalledTimes(2);
  });

  it('buddy: ✗ None hides the buddy; picking an emoji shows it', () => {
    renderWith(<FunSection />);
    expect(screen.queryByRole('checkbox', { name: 'Show buddy' })).toBeNull();
    const picker = screen.getByRole('group', { name: 'Choose buddy' });
    const none = within(picker).getByRole('button', { name: '✗ None' });
    expect(within(picker).getAllByRole('button')[0]).toBe(none);
    fireEvent.click(none);
    expect(stored().fun.showBuddy).toBe(false);
    expect(none).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(picker).getByRole('button', { name: 'Buddy 🦄' }));
    expect(stored().fun.showBuddy).toBe(true);
    expect(stored().fun.buddy).toBe('🦄');
    expect(none).toHaveAttribute('aria-pressed', 'false');
  });

  it('kid-screen toggles and the renamed read-aloud toggle', () => {
    renderWith(<FunSection />);
    const cases: [RegExp, (s: AppSettings) => boolean][] = [
      [/Streaks/, (s) => s.fun.streaks],
      [/Tap pictures to count/, (s) => s.fun.tapToCount],
      [/Brick tower on screen/, (s) => s.fun.showTower],
      [/Flying bricks/, (s) => s.fun.flyingBricks],
      [/^Read aloud \(tap the question to hear it again\)$/, (s) => s.fun.readAloud],
    ];
    for (const [name, read] of cases) {
      const before = read(stored());
      fireEvent.click(screen.getByRole('checkbox', { name }));
      expect(read(stored()), String(name)).toBe(!before);
    }
    expect(screen.queryByText('🔊 button')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
describe('other sections', () => {
  it('Answers: keypad order', () => {
    renderWith(<AnswersSection />);
    const group = screen.getByRole('group', { name: 'Keypad order' });
    fireEvent.click(within(group).getByRole('button', { name: /Calculator/ }));
    expect(stored().input.keypadLayout).toBe('CALCULATOR');
    fireEvent.click(within(group).getByRole('button', { name: /Phone/ }));
    expect(stored().input.keypadLayout).toBe('PHONE');
  });

  it('Look: own colour and logo', () => {
    renderWith(<LookSection />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use my own colour' }));
    expect(stored().look.useCustomColor).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Teal' }));
    expect(stored().look.useCustomColor).toBe(false);
    expect(stored().look.theme).toBe(0);
    fireEvent.input(screen.getByLabelText('Pick a colour'), { target: { value: '#123abc' } });
    expect(stored().look.customColor).toBe('#123abc');
    expect(stored().look.useCustomColor).toBe(true);
    const logo = screen.getByRole('checkbox', { name: 'Show the MATH LAB logo' });
    fireEvent.click(logo);
    expect(stored().look.showLogo).toBe(!defaultSettings().look.showLogo);
  });

  it('Child: name in word problems uses the nickname', () => {
    renderWith(<ChildSection />);
    const toggle = screen.getByRole('checkbox', { name: 'Use Rihaan’s name in word problems' });
    fireEvent.click(toggle);
    expect(stored().child.nameInStories).toBe(false);
  });

  it('Session points to Start', () => {
    const go = vi.fn();
    renderWith(<SessionSection onGoStart={go} />);
    fireEvent.click(screen.getByRole('button', { name: '🏠 Go to Start' }));
    expect(go).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
describe('ParentView', () => {
  it('tabs: Start first and selected; order; switching panels; arrow keys', () => {
    const { session } = stubSession();
    renderWith(
      <>
        <Unlock />
        <ParentView session={session} />
      </>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['🏠 Start', '🧮 Math', '🎓 Grade Level Math', '⏱ Session', '✍️ Answers', '🧩 Strategies', '🎨 Look', '🎉 Fun', '📈 Progress', '🖨 Worksheets', '🧒 Child', '🔒 Passcode']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: '🏠 Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📝 Start quiz' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '🎓 Grade Level Math' }));
    expect(screen.getByRole('tabpanel', { name: '🎓 Grade Level Math' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('tab', { name: '🎓 Grade Level Math' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: '⏱ Session' })).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: '⏱ Session' }));
    fireEvent.click(screen.getByRole('button', { name: '🏠 Go to Start' }));
    expect(screen.getByRole('tab', { name: '🏠 Start' })).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(screen.getByRole('tabpanel', { name: '🏠 Start' })); // not <body>

    fireEvent.click(screen.getByRole('button', { name: '🧮 Change' }));
    expect(screen.getByRole('tab', { name: '🧮 Math' })).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(screen.getByRole('tabpanel', { name: '🧮 Math' }));

    fireEvent.click(screen.getByRole('tab', { name: '🧩 Strategies' }));
    expect(screen.getByRole('checkbox', { name: /Strategy game/ })).toBeInTheDocument();

  });

  it('🎉 Fun → 🧒 Change opens the Child tab and focuses it', () => {
    const s = defaultSettings();
    renderWith(
      <>
        <Unlock />
        <ParentView />
      </>,
      { ...s, child: { ...s.child, reader: 'NOT_YET' } },
    );
    fireEvent.click(screen.getByRole('tab', { name: '🎉 Fun' }));
    fireEvent.click(screen.getByRole('button', { name: '🧒 Change' }));
    expect(screen.getByRole('tab', { name: '🧒 Child' })).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(screen.getByRole('tabpanel', { name: '🧒 Child' }));
  });

  it('is locked until the passcode is entered', () => {
    renderWith(<ParentView />);
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});
