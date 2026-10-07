// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GUIDED_DONE_DELAY_MS } from '../../components/SolutionPanel/GuidedStep';
import { StrategyPanel } from '../../components/SolutionPanel/StrategyPanel';
import { A, buildQuestion, P, prompt, SCHEMA, solution, step } from '../../domain/question/build';
import { rat } from '../../domain/rational/rational';
import type { Question } from '../../domain/question/types';
import { createSeededRandom } from '../../domain/random/random';
import { speak } from '../../ui/speech';

vi.mock('../../ui/speech', () => ({ speak: vi.fn(), canSpeak: () => true, stopSpeaking: vi.fn() }));

const say = (text: string) => step([P.text(text)]);

function makeQuestion(): Question {
  return buildQuestion(
    {
      topic: 'ARITHMETIC',
      subtype: 'ADD',
      difficulty: 'MEDIUM',
      prompt: prompt([P.num(47), P.op('+'), P.num(38), P.op('='), P.blank()]),
      operation: 'ADD',
      canonicalAnswer: A.number(85),
      answerSchema: SCHEMA.integer(),
      solution: solution('COLUMN_ADDITION', [say('Line up the places. Add from the ones.'), say('Ones: 7 + 8 = 15. Write 5, carry 1.'), say('So 47 + 38 = 85.')], A.number(85), 'Column addition'),
      alternativeSolutions: [solution('MAKE_NEXT_TEN', [say('47 + 3 = 50.'), say('50 + 35 = 85.')], A.number(85), 'Make the next ten')],
      generatorId: 'test',
      generatorVersion: '1',
    },
    createSeededRandom('strategy-panel'),
  );
}

/** A fraction step to check how answer bricks are named. */
function makeFractionQuestion(): Question {
  return buildQuestion(
    {
      topic: 'FRACTIONS',
      subtype: 'ADD',
      difficulty: 'EASY',
      prompt: prompt([P.frac(rat(1, 4)), P.op('+'), P.frac(rat(1, 2)), P.op('='), P.blank()]),
      operation: 'ADD',
      canonicalAnswer: A.number(rat(3, 4)),
      answerSchema: SCHEMA.integer(),
      solution: solution('COMMON_DENOMINATOR', [step([P.text('Add: '), P.frac(rat(1, 4)), P.op('+'), P.frac(rat(2, 4)), P.op('='), P.frac(rat(3, 4))])], A.number(rat(3, 4)), 'Common denominator'),
      generatorId: 'test',
      generatorVersion: '1',
    },
    createSeededRandom('strategy-panel-fraction'),
  );
}

type PanelProps = Partial<Parameters<typeof StrategyPanel>[0]>;

function renderPanel(props: PanelProps = {}) {
  const onSound = vi.fn();
  const utils = render(<StrategyPanel question={makeQuestion()} showModels={false} onClose={() => undefined} rainbow={false} onSound={onSound} {...props} />);
  return { ...utils, onSound };
}

const answerButtons = () => screen.queryAllByRole('button', { name: /^Answer / });
const visible = (pattern: RegExp) => screen.queryAllByText(pattern).length > 0;
const finishDelay = () =>
  act(() => {
    vi.advanceTimersByTime(GUIDED_DONE_DELAY_MS + 20);
  });
/** The game's screen-reader live region (always in the DOM). */
const liveRegion = (container: HTMLElement) => container.querySelector('p[aria-live="polite"]') as HTMLElement;
const liveText = (container: HTMLElement) => (liveRegion(container).textContent ?? '').replace(/\u00a0/g, '').trim();
const banner = () => document.querySelector('.guided-done') as HTMLElement | null;

const scrollIntoView = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(speak).mockClear();
  scrollIntoView.mockClear();
  // jsdom has no layout, so no scrollIntoView; record the calls instead.
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('StrategyPanel — guided game', () => {
  it('a step without a number shows one big ▶; a step with a number is played with three bricks', () => {
    const { onSound } = renderPanel({ guided: true });
    expect(answerButtons()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Show all steps' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(onSound).toHaveBeenCalledWith('tap');
    expect(answerButtons()).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Answer 15' })).toBeEnabled();
    // While a step is being played there is no ▶.
    expect(screen.queryByRole('button', { name: 'Next step' })).toBeNull();
  });

  it('a wrong brick wobbles and is greyed out (but keeps focus); the right brick fills the box and reveals the next step', () => {
    const { onSound, container } = renderPanel({ guided: true });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    const right = screen.getByRole('button', { name: 'Answer 15' });
    const wrong = answerButtons().find((b) => b !== right) as HTMLElement;

    wrong.focus();
    fireEvent.click(wrong);
    expect(wrong).toHaveAttribute('aria-disabled', 'true');
    expect(wrong).not.toBeDisabled(); // a disabled button would drop keyboard focus to <body>
    expect(document.activeElement).toBe(wrong);
    expect(wrong.className).toContain('is-wrong');
    expect(onSound).toHaveBeenCalledWith('wrong');
    expect(liveText(container)).toBe('Try again');
    fireEvent.click(wrong); // a used brick does nothing
    expect(onSound).toHaveBeenCalledTimes(2); // 'tap' for ▶ and one 'wrong'
    expect(right).not.toHaveAttribute('aria-disabled');
    expect(visible(/So 47 \+ 38/)).toBe(false);
    expect(visible(/Write 5, carry 1/)).toBe(false);

    fireEvent.click(right);
    expect(onSound).toHaveBeenCalledWith('snap');
    expect(liveText(container)).toBe('Correct!');
    expect(visible(/So 47 \+ 38/)).toBe(false); // the next step waits a moment

    finishDelay();
    expect(visible(/So 47 \+ 38/)).toBe(true);
    expect(screen.getByRole('button', { name: 'Answer 85' })).toBeInTheDocument();
    // The solved step now reads in full.
    expect(visible(/Ones: 7 \+ 8 = 15\. Write 5, carry 1\./)).toBe(true);
    // The new step is announced with its number hidden.
    expect(liveText(container)).toBe('Step 3: So 47 + 38 = what.');
  });

  it('finishing a strategy celebrates and offers another way', () => {
    const { onSound } = renderPanel({ guided: true });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Answer 15' }));
    finishDelay();
    fireEvent.click(screen.getByRole('button', { name: 'Answer 85' }));
    finishDelay();
    expect(onSound).toHaveBeenCalledWith('celebrate');
    expect(banner()).toHaveTextContent('You did it!');
    expect(screen.queryByRole('button', { name: 'Show all steps' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Another way ➜' }));
    expect(screen.getByRole('tab', { name: /Make the next ten/ })).toHaveAttribute('aria-selected', 'true');
    expect(banner()).toBeNull();
    expect(screen.getByRole('button', { name: 'Answer 50' })).toBeInTheDocument();
  });

  it('icon-only: the banner is just 🎉 and the button is 🔄', () => {
    renderPanel({ guided: true, iconOnly: true });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Answer 15' }));
    finishDelay();
    fireEvent.click(screen.getByRole('button', { name: 'Answer 85' }));
    finishDelay();
    expect(screen.getByText('You did it!', { selector: '.guided-done span' }).className).toBe('sr-only');
    expect(screen.getByText('🎉')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Another way' })).toHaveTextContent('🔄');
  });

  it('⏩ shows every step without the game', () => {
    renderPanel({ guided: true });
    fireEvent.click(screen.getByRole('button', { name: 'Show all steps' }));
    expect(answerButtons()).toHaveLength(0);
    expect(visible(/Ones: 7 \+ 8 = 15/)).toBe(true);
    expect(visible(/So 47 \+ 38 = 85/)).toBe(true);
    expect(banner()).toBeNull();
    expect(screen.getByRole('button', { name: 'Another way ➜' })).toBeInTheDocument();
  });

  it('auto read-aloud hides the number being guessed ("what")', () => {
    renderPanel({ guided: true, autoSpeak: true });
    expect(vi.mocked(speak)).toHaveBeenLastCalledWith('Line up the places. Add from the ones.', 0.95);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    const spoken = vi.mocked(speak).mock.lastCall?.[0] ?? '';
    expect(spoken).toContain('what');
    expect(spoken).not.toContain('15');
  });
});

describe('StrategyPanel — reveal mode (guided off)', () => {
  it('shows "Next step" and reveals steps one by one, no game bricks', () => {
    renderPanel({ guided: false });
    expect(answerButtons()).toHaveLength(0);
    expect(visible(/Ones: 7 \+ 8/)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(visible(/Ones: 7 \+ 8 = 15/)).toBe(true);
    expect(answerButtons()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Show all steps' }));
    expect(visible(/So 47 \+ 38 = 85/)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Next step' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Another way ➜' })).toBeInTheDocument();
  });

  it('tapping a step reads it again; there are no separate 🔊 buttons', () => {
    renderPanel({ guided: false, speakSteps: true });
    expect(screen.queryByRole('button', { name: /aloud/ })).toBeNull();
    // The button is named by the step itself, so screen-reader users hear what it says.
    const hear = screen.getByRole('button', { name: /^Hear step 1/ });
    expect(hear).toHaveAccessibleName('Hear step 1: Line up the places. Add from the ones.');
    fireEvent.click(hear);
    expect(vi.mocked(speak)).toHaveBeenLastCalledWith('Line up the places. Add from the ones.', 0.95);
  });

  it('without read-aloud the step text is not a button', () => {
    renderPanel({ guided: false, speakSteps: false });
    expect(screen.queryByRole('button', { name: /Hear step/ })).toBeNull();
  });

  it('in the game, "Hear step" reads the step with the hidden number as "what"', () => {
    renderPanel({ guided: true, speakSteps: true });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    const hear = screen.getByRole('button', { name: /^Hear step 2/ });
    // Screen readers get the step too, with the number still hidden.
    expect(hear).toHaveAccessibleName('Hear step 2: Ones: 7 + 8 = what.');
    fireEvent.click(hear);
    const spoken = vi.mocked(speak).mock.lastCall?.[0] ?? '';
    // The rest of the sentence ("Write 5, carry 1.") would give the answer away, so it waits until solved.
    expect(spoken).toBe('Ones: 7 + 8 = what.');
  });

  it('strategies hidden by a parent are not offered (unless all are hidden)', () => {
    renderPanel({ hiddenStrategies: ['COLUMN_ADDITION'] });
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['1 · Make the next ten']);
    cleanup();
    renderPanel({ hiddenStrategies: ['COLUMN_ADDITION', 'MAKE_NEXT_TEN'] });
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});

describe('StrategyPanel — guided game: focus, scrolling and screen readers', () => {
  it('focus moves along with the game instead of falling back to the page', () => {
    renderPanel({ guided: true });
    const next = screen.getByRole('button', { name: 'Next step' });
    next.focus();
    fireEvent.click(next);
    // ▶ is gone: the first answer brick of the new step takes focus.
    expect(document.activeElement).toBe(answerButtons()[0]);

    const right = screen.getByRole('button', { name: 'Answer 15' });
    right.focus();
    fireEvent.click(right);
    expect(right).toHaveAttribute('aria-disabled', 'true');
    expect(document.activeElement).toBe(right); // still focused while the box fills
    finishDelay();
    expect(document.activeElement).toBe(answerButtons()[0]);
    expect(screen.getByRole('button', { name: 'Answer 85' })).toBeInTheDocument();

    const last = screen.getByRole('button', { name: 'Answer 85' });
    last.focus();
    fireEvent.click(last);
    finishDelay();
    // Finished: focus lands on "Another way".
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Another way ➜' }));
  });

  it('never steals focus from another control, and not on the first render', () => {
    renderPanel({ guided: true });
    expect(document.activeElement).toBe(document.body); // first render: nothing moves
    const skip = screen.getByRole('button', { name: 'Show all steps' });
    skip.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(document.activeElement).toBe(skip);
  });

  it('new steps, ▶ and the 🎉 banner are scrolled into view after a tap (not when the panel first opens)', () => {
    renderPanel({ guided: true });
    expect(scrollIntoView).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelector('.guided-current .guided'));
    expect(scrollIntoView.mock.calls[0]?.[0]).toMatchObject({ block: 'nearest' });

    fireEvent.click(screen.getByRole('button', { name: 'Answer 15' }));
    finishDelay();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Answer 85' }));
    finishDelay();
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(banner());
  });

  it('no smooth scrolling when animations are off', () => {
    document.body.classList.add('no-anim');
    try {
      renderPanel({ guided: true });
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
      expect(scrollIntoView.mock.calls[0]?.[0]).toMatchObject({ behavior: 'auto' });
    } finally {
      document.body.classList.remove('no-anim');
    }
  });

  it('one live region stays in the DOM and announces each step and the end; the banner is not a status', () => {
    const { container } = renderPanel({ guided: true });
    const region = liveRegion(container);
    expect(region).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(liveRegion(container)).toBe(region);
    expect(liveText(container)).toBe('Step 2: Ones: 7 + 8 = what.');
    fireEvent.click(screen.getByRole('button', { name: 'Answer 15' }));
    finishDelay();
    fireEvent.click(screen.getByRole('button', { name: 'Answer 85' }));
    finishDelay();
    expect(liveRegion(container)).toBe(region);
    expect(liveText(container)).toBe('You did it!');
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('a repeated message is still a change for the live region', () => {
    const { container } = renderPanel({ guided: true });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    const right = screen.getByRole('button', { name: 'Answer 15' });
    const [first, second] = answerButtons().filter((b) => b !== right) as [HTMLElement, HTMLElement];
    fireEvent.click(first);
    const once = liveRegion(container).textContent;
    fireEvent.click(second);
    expect(liveRegion(container).textContent).not.toBe(once);
  });

  it('answer bricks are named the way the step is spoken ("3 over 4", not "3/4")', () => {
    render(<StrategyPanel question={makeFractionQuestion()} showModels={false} onClose={() => undefined} rainbow={false} guided />);
    expect(screen.getByRole('button', { name: 'Answer 3 over 4' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Answer 3/4' })).toBeNull();
  });
});

describe('guided styles', () => {
  const css = readFileSync('src/styles/guided.css', 'utf8');
  const rule = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    return start === -1 ? '' : css.slice(start, css.indexOf('}', start));
  };

  it('the played step and the 🎉 banner use theme colours, so they stay readable on the Night baseplate', () => {
    for (const selector of ['.steps .step.guided-current', '.guided-done']) {
      const body = rule(selector);
      expect(body, selector).toContain('color: var(--ink)');
      expect(body, selector).toMatch(/color-mix\(in srgb, var\(--b-yellow\) \d+%, var\(--tile(-2)?\)\)/);
    }
    // The "?" box has fixed dark-on-light colours instead of the theme accent mix.
    expect(rule('.guided-box')).not.toMatch(/var\(--accent/);
  });

  it('small controls are still 48px touch targets', () => {
    expect(css).toMatch(/\.strategy-close\.brick,\s*\.guided-skip\.brick,\s*\.steps-skip\.brick \{\s*min-width: 48px;\s*min-height: 48px;/);
    expect(rule('.step-hear')).toContain('min-height: 48px');
  });
});
