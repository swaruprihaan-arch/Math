// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../app/AppContext';
import { useSession, type Session } from '../../app/useSession';
import { Keypad } from '../../components/AnswerInput/Keypad';
import { KidView } from '../../components/kid/KidView';
import { canonicalInputString, formatQuestionAnswer, nodesToText, questionToSpeech } from '../../domain/answer/format';
import { firstStoryName, personalizeQuestion } from '../../components/QuestionCard/personalize';
import type { PracticePlan } from '../../engines/plan/practicePlan';
import { defaultSettings, type AppSettings } from '../../state/settings';
import { BUBBLE_MS, Buddy, type BuddyReaction } from '../../components/kid/Buddy';
import { QuizDone } from '../../components/kid/QuizDone';
import { FlyingBricks, TowerMini, towerBrickColor, towerSlot, useFlyingBricks } from '../../components/kid/Tower';
import { INITIAL_QUIZ, type QuizState } from '../../state/quizMachine';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function keyNames(): string[] {
  const group = screen.getByRole('group', { name: 'Number keys' });
  return within(group)
    .getAllByRole('button')
    .map((b) => b.getAttribute('aria-label') ?? '');
}

describe('Keypad layout', () => {
  it('PHONE: 1 2 3 on top, then 4 5 6, then 7 8 9, wide 0', () => {
    render(<Keypad extra={[]} onKey={() => undefined} onEnter={() => undefined} keypadStyle="NUMBERS" hasInput={false} layout="PHONE" />);
    expect(keyNames()).toEqual(['1', '2', '3', 'Delete', '4', '5', '6', 'Clear', '7', '8', '9', 'Check answer', '0']);
  });

  it('CALCULATOR: 7 8 9 on top, then 4 5 6, then 1 2 3, wide 0', () => {
    render(<Keypad extra={[]} onKey={() => undefined} onEnter={() => undefined} keypadStyle="NUMBERS" hasInput={false} layout="CALCULATOR" />);
    expect(keyNames()).toEqual(['7', '8', '9', 'Delete', '4', '5', '6', 'Clear', '1', '2', '3', 'Check answer', '0']);
  });

  it('keys still send digits and ✓ still checks', () => {
    const onKey = vi.fn();
    const onEnter = vi.fn();
    render(<Keypad extra={[]} onKey={onKey} onEnter={onEnter} keypadStyle="TALLY" hasInput layout="PHONE" />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(onKey.mock.calls.map((c) => c[0])).toEqual(['1', 'BACKSPACE']);
    expect(onEnter).toHaveBeenCalledTimes(1);
  });
});

describe('Buddy', () => {
  it('tap → speech bubble with a cheer, cycling in order, hidden after ~2.5 s', () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const { container } = render(<Buddy emoji="🦄" onTap={onTap} />);
    expect(container.querySelector('.buddy-bubble')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Buddy' }));
    expect(container.querySelector('.buddy-bubble')?.textContent).toBe('You can do it!');
    expect(onTap).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Buddy' }));
    expect(container.querySelector('.buddy-bubble')?.textContent).toBe('Let’s go!');
    act(() => {
      vi.advanceTimersByTime(BUBBLE_MS + 50);
    });
    expect(container.querySelector('.buddy-bubble')).toBeNull();
  });

  it('uses the parent’s cheers; not-yet readers see an emoji-only bubble', () => {
    const { container, unmount } = render(<Buddy emoji="🦄" cheers={['Go Rihaan!']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buddy' }));
    expect(container.querySelector('.buddy-bubble')?.textContent).toBe('Go Rihaan!');
    unmount();
    const icon = render(<Buddy emoji="🦄" iconOnly />);
    fireEvent.click(screen.getByRole('button', { name: 'Buddy' }));
    const bubble = icon.container.querySelector('.buddy-bubble');
    expect(bubble?.textContent).toBe('🙌');
    expect(bubble?.querySelector('.bubble-text')).toBeNull();
  });

  it('reacts to answers: 🎉 + cheer when right, 💪 Try again! when not', () => {
    function Harness() {
      const [reaction, setReaction] = useState<BuddyReaction | null>(null);
      return (
        <>
          <Buddy emoji="🤖" reaction={reaction} />
          <button type="button" onClick={() => setReaction({ key: 'q#1', kind: 'incorrect', text: 'Try again!' })}>
            wrong
          </button>
          <button type="button" onClick={() => setReaction({ key: 'q#2', kind: 'correct', text: 'Great job!' })}>
            right
          </button>
        </>
      );
    }
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'wrong' }));
    expect(container.querySelector('.buddy-bubble')?.textContent).toBe('💪Try again!');
    fireEvent.click(screen.getByRole('button', { name: 'right' }));
    const bubble = container.querySelector('.buddy-bubble');
    expect(bubble?.querySelector('.bubble-icon')?.textContent).toBe('🎉');
    expect(bubble?.querySelector('.bubble-text')?.textContent).toBe('Great job!');
    expect(container.querySelector('.buddy-face.mood-happy')).not.toBeNull();
  });

  it('does not replay a reaction that was already there when it appeared', () => {
    const { container } = render(<Buddy emoji="🤖" reaction={{ key: 'old', kind: 'correct', text: 'Yay' }} />);
    expect(container.querySelector('.buddy-bubble')).toBeNull();
  });
});

describe('Tower and flying bricks', () => {
  it('a tappable tower is a button with the brick count', () => {
    const onTap = vi.fn();
    render(<TowerMini count={3} goal={10} onTap={onTap} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tower: 3 of 10 bricks' }));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('towerSlot: the newest lit mini-tower brick, shared by the tower and the flying brick', () => {
    expect([0, 1, 2, 3, 10].map((n) => towerSlot(n, 10))).toEqual([-1, 0, 1, 2, 9]);
    // A goal above 10: 10 bricks fill in proportion, so some answers light no new brick.
    expect([1, 2, 3, 4, 19, 20].map((n) => towerSlot(n, 20))).toEqual([0, 0, 1, 1, 9, 9]);
    expect(towerSlot(3, 3)).toBe(2);
    expect(towerSlot(5, 0)).toBe(-1);
    const { container } = render(<TowerMini count={3} goal={20} />);
    const bricks = Array.from(container.querySelectorAll<HTMLElement>('.tower-brick'));
    expect(bricks).toHaveLength(10);
    expect(bricks.filter((b) => !b.classList.contains('empty'))).toHaveLength(2);
    const newest = container.querySelector<HTMLElement>('.tower-brick.newest');
    expect(newest).toBe(bricks[towerSlot(3, 20)]);
    const probe = document.createElement('span');
    probe.style.background = towerBrickColor(1);
    expect(newest?.style.background).toBe(probe.style.background);
    expect(container.querySelector('.tower-crane')).not.toBeNull();
  });

  it('a new correct celebration launches one brick; it is cleaned up after its flight', () => {
    vi.useFakeTimers();
    function Harness({ event, enabled = true }: { event: { id: number; kind: 'correct' | 'tower' | 'quiz' } | null; enabled?: boolean }) {
      const { flights, done } = useFlyingBricks(event, { enabled, color: '#d01012', source: () => null, target: () => null });
      return <FlyingBricks flights={flights} onDone={done} />;
    }
    const { container, rerender } = render(<Harness event={{ id: 1, kind: 'correct' }} />);
    expect(container.querySelectorAll('.fly-brick')).toHaveLength(0); // the event that was already there does not fly
    rerender(<Harness event={{ id: 2, kind: 'correct' }} />);
    expect(container.querySelectorAll('.fly-brick')).toHaveLength(1);
    // (animationend removes it in a browser; the fallback timer covers browsers/jsdom without it)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.querySelectorAll('.fly-brick')).toHaveLength(0);
    rerender(<Harness event={{ id: 3, kind: 'quiz' }} />);
    expect(container.querySelectorAll('.fly-brick')).toHaveLength(0);
    rerender(<Harness event={{ id: 4, kind: 'correct' }} enabled={false} />);
    expect(container.querySelectorAll('.fly-brick')).toHaveLength(0);
  });
});

describe('QuizDone', () => {
  it('shows the score, score bricks, and a big ▶ Play again', () => {
    const row = (index: number, isCorrect: boolean) => ({ index, questionText: '', yourText: '', correctText: '', isCorrect, standards: [], topic: 'ARITHMETIC' });
    const quiz: QuizState = { ...INITIAL_QUIZ, status: 'COMPLETE', length: 3, answered: 3, correct: 2, rows: [row(0, true), row(1, false), row(2, true)], endedBy: 'COMPLETE' };
    const onAgain = vi.fn();
    const { container } = render(<QuizDone quiz={quiz} onAgain={onAgain} buddy={null} />);
    const region = screen.getByRole('region', { name: 'Quiz finished' });
    expect(region.querySelectorAll('.score')).toHaveLength(1);
    expect(region.querySelector('.score')?.textContent).toMatch(/2\s*\/\s*3/);
    expect(container.querySelectorAll('.qd-brick.right')).toHaveLength(2);
    expect(container.querySelectorAll('.qd-brick.wrong')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(onAgain).toHaveBeenCalledTimes(1);
  });

  it('▶ gets focus (without scrolling) and tells a screen reader the score', () => {
    const row = (index: number, isCorrect: boolean) => ({ index, questionText: '', yourText: '', correctText: '', isCorrect, standards: [], topic: 'ARITHMETIC' });
    const quiz: QuizState = { ...INITIAL_QUIZ, status: 'COMPLETE', length: 3, answered: 2, correct: 2, rows: [row(0, true), row(1, true)], endedBy: 'TIME_UP' };
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const { container } = render(<QuizDone quiz={quiz} onAgain={() => undefined} />);
    const again = screen.getByRole('button', { name: 'Play again' });
    expect(document.activeElement).toBe(again);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockRestore();
    expect(again).toHaveAccessibleDescription('Time’s up! You got 2 out of 3 right. 1 of 3 stars.');
    expect(container.querySelector('.qd-timeup')?.textContent).toContain('Time’s up!');
  });
});

/* ------------------------------------------------------------------ */
/* The whole kid screen                                                 */
/* ------------------------------------------------------------------ */

function kidSettings(patch: (s: AppSettings) => AppSettings = (s) => s): AppSettings {
  const d = defaultSettings();
  return patch({ ...d, input: { ...d.input, modes: ['TYPE', 'KEYPAD'], defaultMode: 'TYPE' } });
}

function renderKid(settings: AppSettings) {
  const ref: { current: Session | null } = { current: null };
  function Screen() {
    const session = useSession();
    ref.current = session;
    return <KidView session={session} />;
  }
  const utils = render(
    <AppProvider initialSettings={settings}>
      <Screen />
    </AppProvider>,
  );
  return { ...utils, session: () => ref.current as Session };
}

function answerCorrectly(session: () => Session) {
  const q = session().q.question;
  if (!q) throw new Error('no question');
  fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), { target: { value: canonicalInputString(q) } });
  fireEvent.click(screen.getByRole('button', { name: '✓ Check' }));
}

describe('KidView', () => {
  it('simple screen: question, answer spot, tower, lock — no logo and no yellow 🔊 button', () => {
    renderKid(kidSettings());
    expect(screen.getByRole('region', { name: 'Question' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your answer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Grown-ups area (locked)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tower: 0 of 10 bricks/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Math Lab home' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Read the question aloud' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Buddy' })).not.toBeNull();
  });

  it('logo, tower and buddy follow the parent settings', () => {
    renderKid(kidSettings((s) => ({ ...s, look: { ...s.look, showLogo: true }, fun: { ...s.fun, showTower: false, showBuddy: false } })));
    expect(screen.getByRole('link', { name: 'Math Lab home' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tower:/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Buddy' })).toBeNull();
  });

  it('tapping the question reads it again (when speech is available)', () => {
    const spoken: string[] = [];
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string;
      rate = 1;
      pitch = 1;
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    });
    vi.stubGlobal('speechSynthesis', { cancel: () => undefined, getVoices: () => [], speak: (u: { text: string }) => spoken.push(u.text) });
    const { session } = renderKid(kidSettings());
    const question = screen.getByRole('region', { name: 'Question' });
    const hear = within(question).getByRole('button', { name: 'Hear the question again' });
    fireEvent.click(hear);
    const q = session().q.question;
    expect(q).not.toBeNull();
    expect(spoken.at(-1)).toBe(questionToSpeech(q as NonNullable<typeof q>));
    fireEvent.keyDown(hear, { key: 'Enter' });
    expect(spoken).toHaveLength(2);
  });

  it('quiz mode starts by itself (no Start screen)', () => {
    renderKid(kidSettings((s) => ({ ...s, session: { ...s.session, mode: 'QUIZ', quizLength: 3 } })));
    expect(screen.queryByRole('button', { name: /Start/ })).toBeNull();
    expect(screen.getByRole('img', { name: 'Question 1 of 3' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question' })).toBeInTheDocument();
  });

  it('keypad order comes from the settings', () => {
    renderKid(kidSettings((s) => ({ ...s, input: { ...s.input, modes: ['KEYPAD'], defaultMode: 'KEYPAD', keypadLayout: 'CALCULATOR' } })));
    expect(keyNames().slice(0, 3)).toEqual(['7', '8', '9']);
  });

  it('parent cheers replace the praise, and 3 right in a row shows a 🔥 streak', () => {
    const { session } = renderKid(kidSettings((s) => ({ ...s, fun: { ...s.fun, cheers: ['Yay {name}!'] }, child: { ...s.child, nickname: 'Rihaan' } })));
    for (let i = 0; i < 3; i++) {
      answerCorrectly(session);
      expect(document.querySelector('.feedback.correct')?.textContent).toContain('Yay Rihaan!');
      if (i < 2) {
        expect(screen.queryByRole('img', { name: /in a row/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Next ➜' }));
      }
    }
    expect(screen.getByRole('img', { name: '3 in a row' })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: '💡 Ways' })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Review fixes: fresh counts, focus after a tap, consistent nicknames   */
/* ------------------------------------------------------------------ */

function stubSpeech(): string[] {
  const spoken: string[] = [];
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    rate = 1;
    pitch = 1;
    voice: unknown = null;
    constructor(text: string) {
      this.text = text;
    }
  });
  vi.stubGlobal('speechSynthesis', { cancel: () => undefined, getVoices: () => [], speak: (u: { text: string }) => spoken.push(u.text) });
  return spoken;
}

function gradePlan(s: AppSettings, grade: PracticePlan['gradeLevel']['settings']['grade'], skillId: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD'): PracticePlan {
  return { ...s.plan, arithmetic: { ...s.plan.arithmetic, enabled: false }, gradeLevel: { enabled: true, settings: { grade, skillIds: [skillId], difficulty } } };
}

const visualId = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => (typeof x === 'bigint' ? x.toString() : x));

describe('KidView review fixes', () => {
  it('a new question with the same picture starts counting from zero', () => {
    const { session } = renderKid(kidSettings((s) => ({ ...s, plan: gradePlan(s, '1', 'g1.md.measure-with-units', 'EASY'), fun: { ...s.fun, tapToCount: true, showVisuals: true } })));
    const counted = () => screen.queryAllByRole('button', { name: /^Counted/ }).length;
    let found = false;
    // Count one thing, go on; repeat until the next question shows exactly the same picture.
    for (let i = 0; i < 200 && !found; i++) {
      const before = session().q.question;
      if (!before?.prompt.visual) throw new Error('expected a picture');
      fireEvent.click(within(screen.getByRole('region', { name: 'Question' })).getAllByRole('button', { name: /^Count this/ })[0] as HTMLElement);
      expect(counted()).toBe(1);
      act(() => session().next());
      const after = session().q.question;
      found = !!after && after.id !== before.id && visualId(after.prompt.visual) === visualId(before.prompt.visual);
    }
    expect(found).toBe(true);
    expect(counted()).toBe(0);
    expect(screen.queryByRole('button', { name: 'Count again' })).toBeNull();
  });

  it('after tapping the question, Enter still checks the answer (the tap does not keep focus)', () => {
    const spoken = stubSpeech();
    const { session } = renderKid(kidSettings((s) => ({ ...s, input: { ...s.input, modes: ['KEYPAD'], defaultMode: 'KEYPAD' } })));
    const hear = within(screen.getByRole('region', { name: 'Question' })).getByRole('button', { name: 'Hear the question again' });
    // Safari focuses a tabindex element on tap: the mousedown default is prevented, and a pointer click blurs it.
    expect(fireEvent.mouseDown(hear)).toBe(false);
    hear.focus();
    fireEvent.click(hear, { detail: 1 });
    expect(document.activeElement).not.toBe(hear);
    expect(spoken).toHaveLength(1);
    const q = session().q.question;
    if (!q) throw new Error('no question');
    act(() => session().setInput(canonicalInputString(q)));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Enter' });
    expect(session().q.submissionStatus).toBe('CORRECT');
    expect(spoken).toHaveLength(1); // Enter did not replay the question
  });

  it('the 🔊 badge shows for a moment after a tap (a class, so it also shows with animations off)', () => {
    stubSpeech();
    renderKid(kidSettings());
    const hear = within(screen.getByRole('region', { name: 'Question' })).getByRole('button', { name: 'Hear the question again' });
    vi.useFakeTimers();
    fireEvent.click(hear, { detail: 1 });
    expect(hear).toHaveClass('heard');
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(hear).not.toHaveClass('heard');
  });

  it('header buttons are full-size bricks (no small pause / lock)', () => {
    renderKid(kidSettings((s) => ({ ...s, session: { ...s.session, timer: 'CUSTOM', timerMinutes: 5 } })));
    const lock = screen.getByRole('link', { name: 'Grown-ups area (locked)' });
    expect(lock).not.toHaveClass('small');
    const pause = screen.getByRole('button', { name: 'Pause timer' });
    expect(pause).toHaveClass('brick', 'kid-pause');
    expect(pause).not.toHaveClass('small');
    expect(pause.getAttribute('style')).toBeNull(); // sized by CSS, so big buttons still applies
  });

  it('nickname in a story whose names are the answers: the choices, the answer and the speech use it too', () => {
    stubSpeech();
    const { session } = renderKid(
      kidSettings((s) => ({ ...s, plan: gradePlan(s, 'K', 'gk.md.compare-length', 'HARD'), child: { ...s.child, nickname: 'Zed', nameInStories: true } })),
    );
    let q = session().q.question;
    const namesAreChoices = (x: typeof q) => !!x && (x.answerSchema.choices ?? []).some((c) => c.label === firstStoryName(x.prompt.nodes));
    for (let i = 0; i < 200 && !namesAreChoices(q); i++) {
      act(() => session().next());
      q = session().q.question;
    }
    if (!q || !namesAreChoices(q)) throw new Error('no story with names as choices');
    const shown = personalizeQuestion(q, 'Zed');
    const region = screen.getByRole('region', { name: 'Question' });
    expect(region.textContent).toContain('Zed');
    const buttons = within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button');
    const labels = buttons.map((b) => b.textContent ?? '');
    expect(labels).toContain('Zed');
    expect(labels).toEqual((shown.answerSchema.choices ?? []).map((c) => c.label));
    for (const label of labels) expect(nodesToText(shown.prompt.nodes)).toContain(label);
    // The right answer is on screen, and tapping it is graded right.
    const right = formatQuestionAnswer(shown);
    fireEvent.click(screen.getByRole('button', { name: right }));
    expect(session().q.submissionStatus).toBe('CORRECT');
  });
});
