// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TallyPad } from '../../components/AnswerInput/TallyPad';
import { TALLY_BUNDLE_CONVERT_DELAY_MS, TALLY_CONVERT_ANIMATION_MS, TALLY_CONVERT_DELAY_MS } from '../../handwriting/tally';

interface HarnessProps {
  initial?: number;
  max?: number;
  disabled?: boolean;
  onChange?: (n: number) => void;
  onTap?: () => void;
  voiceCount?: (n: number) => void;
}

/** Parent that stores the answer like AnswerArea would, plus buttons to change it from outside. */
function Harness({ initial = 0, max, disabled, onChange, onTap, voiceCount }: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TallyPad
        value={value}
        max={max}
        disabled={disabled}
        onTap={onTap}
        voiceCount={voiceCount}
        onChange={(n) => {
          onChange?.(n);
          setValue(n);
        }}
      />
      <button type="button" onClick={() => setValue(0)}>
        parent clear
      </button>
      <button type="button" onClick={() => setValue(7)}>
        parent seven
      </button>
      <output data-testid="value">{value}</output>
    </>
  );
}

const mark = (n: number) => screen.getByRole('button', { name: `Tally mark ${n}` });
const marks = () => screen.queryAllByRole('button', { name: /^Tally mark \d+$/ });
const pressedCount = () => marks().filter((b) => b.getAttribute('aria-pressed') === 'true').length;
/** The big numeral the child sees. */
const shownNumber = (container: HTMLElement) => container.querySelector('.tp-number')?.textContent;
/** What a screen reader hears (polite live region). */
const spokenNumber = (container: HTMLElement) => container.querySelector('[aria-live="polite"]')?.textContent;

beforeEach(() => {
  // jsdom has no canvas backend: give the pad a measurable drawing box and no 2D context.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ x: 0, y: 0, left: 0, top: 0, width: 300, height: 200, right: 300, bottom: 200, toJSON: () => ({}) }) as DOMRect,
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TallyPad – tap mode', () => {
  it('starts in tap mode with 4 bundles of five marks, all off', () => {
    const { container } = render(<Harness />);
    expect(screen.getByRole('button', { name: 'Tap tally marks' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Draw tally marks' })).toHaveAttribute('aria-pressed', 'false');
    expect(marks()).toHaveLength(20);
    expect(pressedCount()).toBe(0);
    expect(shownNumber(container)).toBe('0');
  });

  it('tapping marks selects and deselects them and reports the count', () => {
    const onChange = vi.fn();
    const onTap = vi.fn();
    const voice = vi.fn();
    const { container } = render(<Harness onChange={onChange} onTap={onTap} voiceCount={voice} />);
    fireEvent.click(mark(1));
    expect(mark(1)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(mark(2));
    expect(mark(2)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(mark(2)); // deselect
    expect(mark(2)).toHaveAttribute('aria-pressed', 'false');
    expect(mark(1)).toHaveAttribute('aria-pressed', 'true');
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1, 2, 1]);
    expect(onTap).toHaveBeenCalledTimes(3);
    expect(voice).toHaveBeenLastCalledWith(1);
    expect(shownNumber(container)).toBe('1');
  });

  it('works even if the parent does not echo the value back', () => {
    const onChange = vi.fn();
    render(<TallyPad value={0} onChange={onChange} />);
    fireEvent.click(mark(3));
    fireEvent.click(mark(5)); // the diagonal fifth mark counts as one
    fireEvent.click(mark(3));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1, 2, 1]);
    expect(mark(5)).toHaveAttribute('aria-pressed', 'true');
    expect(mark(3)).toHaveAttribute('aria-pressed', 'false');
  });

  it('"+5" adds another bundle of five, up to max', () => {
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Add 5 more marks' }));
    expect(marks()).toHaveLength(25);
    fireEvent.click(mark(25));
    expect(screen.getByTestId('value').textContent).toBe('1');
    unmount();

    render(<Harness max={22} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add 5 more marks' }));
    expect(marks()).toHaveLength(22);
    expect(screen.queryByRole('button', { name: 'Add 5 more marks' })).toBeNull();
  });

  it('follows the parent: value 0 clears every mark, another value selects the first N', () => {
    const { container } = render(<Harness />);
    fireEvent.click(mark(2));
    fireEvent.click(mark(4));
    fireEvent.click(mark(9));
    expect(pressedCount()).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'parent clear' }));
    expect(pressedCount()).toBe(0);
    expect(shownNumber(container)).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'parent seven' }));
    expect(pressedCount()).toBe(7);
    for (let i = 1; i <= 7; i++) expect(mark(i)).toHaveAttribute('aria-pressed', 'true');
    expect(mark(8)).toHaveAttribute('aria-pressed', 'false');
    expect(shownNumber(container)).toBe('7');
  });

  it('shows enough marks for a large starting value', () => {
    render(<Harness initial={23} />);
    expect(marks()).toHaveLength(25);
    expect(pressedCount()).toBe(23);
  });

  it('disabled: every button is disabled and taps do nothing', () => {
    const onChange = vi.fn();
    render(<Harness disabled onChange={onChange} />);
    expect(mark(1)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Draw tally marks' })).toBeDisabled();
    fireEvent.click(mark(1));
    expect(onChange).not.toHaveBeenCalled();
  });
});

type Pt = [number, number];
function drawStroke(canvas: HTMLElement, pts: Pt[], pointerType = 'touch', pointerId = 1) {
  const [first, ...rest] = pts;
  if (!first) return;
  fireEvent.pointerDown(canvas, { pointerId, pointerType, clientX: first[0], clientY: first[1] });
  for (const [x, y] of rest) fireEvent.pointerMove(canvas, { pointerId, pointerType, clientX: x, clientY: y });
  const last = rest[rest.length - 1] ?? first;
  fireEvent.pointerUp(canvas, { pointerId, pointerType, clientX: last[0], clientY: last[1] });
}
const upright = (x: number): Pt[] => [
  [x, 30],
  [x + 1, 80],
  [x, 130],
  [x + 2, 170],
];

describe('TallyPad – draw mode', () => {
  it('switching to draw mode shows the labelled drawing canvas and tools', () => {
    const onTap = vi.fn();
    render(<Harness onTap={onTap} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw tally marks' }));
    expect(screen.getByRole('button', { name: 'Draw tally marks' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tap tally marks' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: 'Draw tally marks here' })).toBeInTheDocument();
    expect(marks()).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Undo last mark' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear tally marks' })).toBeDisabled();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('drawn lines become marks after a pause (dots ignored), with the convert animation, and further lines add on', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const voice = vi.fn();
    const { container } = render(<Harness onChange={onChange} voiceCount={voice} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw tally marks' }));
    const canvas = screen.getByRole('img', { name: 'Draw tally marks here' });

    drawStroke(canvas, upright(40));
    drawStroke(canvas, upright(70));
    drawStroke(canvas, [[150, 100]]); // a dot
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS - 50));
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(60));
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(voice).toHaveBeenLastCalledWith(2);
    expect(screen.getByTestId('tally-convert')).toHaveTextContent('2');

    act(() => vi.advanceTimersByTime(TALLY_CONVERT_ANIMATION_MS));
    expect(screen.queryByTestId('tally-convert')).toBeNull();
    expect(shownNumber(container)).toBe('2');

    // a diagonal adds one more to the running total
    drawStroke(canvas, [
      [20, 160],
      [80, 110],
      [140, 50],
    ]);
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS + TALLY_CONVERT_ANIMATION_MS));
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(shownNumber(container)).toBe('3');
  });

  it('undo removes an unconverted line first, otherwise takes one off the total; clear empties it', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<Harness initial={4} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw tally marks' }));
    const canvas = screen.getByRole('img', { name: 'Draw tally marks here' });
    const undo = screen.getByRole('button', { name: 'Undo last mark' });

    drawStroke(canvas, upright(40));
    fireEvent.click(undo); // removes the unconverted line
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS * 2));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(undo); // nothing pending → total 4 → 3
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(shownNumber(container)).toBe('3');

    fireEvent.click(screen.getByRole('button', { name: 'Clear tally marks' }));
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(shownNumber(container)).toBe('0');
    expect(screen.getByRole('button', { name: 'Clear tally marks' })).toBeDisabled();
  });

  it('palm rejection: after the Apple Pencil is used, finger touches do not draw', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw tally marks' }));
    const canvas = screen.getByRole('img', { name: 'Draw tally marks here' });
    drawStroke(canvas, upright(40), 'pen', 7);
    drawStroke(canvas, upright(90), 'touch', 8); // resting palm
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('switching back to tap mode keeps unconverted marks and shows them as selected slots', () => {
    const onChange = vi.fn();
    render(<Harness initial={2} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw tally marks' }));
    const canvas = screen.getByRole('img', { name: 'Draw tally marks here' });
    drawStroke(canvas, upright(40));
    fireEvent.click(screen.getByRole('button', { name: 'Tap tally marks' }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(pressedCount()).toBe(3);
  });
});

const drawMode = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Draw tally marks' }));
  return screen.getByRole('img', { name: 'Draw tally marks here' });
};
const diagonal: Pt[] = [
  [20, 160],
  [80, 110],
  [140, 50],
];

/** Parent shaped like questionMachine: INPUT is ignored while locked; "Next question" clears and unlocks. */
function LockingParent({ onChange, useResetKey = true }: { onChange?: (n: number) => void; useResetKey?: boolean }) {
  const [raw, setRaw] = useState(0);
  const [locked, setLocked] = useState(false);
  const [qid, setQid] = useState(1);
  const [checked, setChecked] = useState<number | null>(null);
  return (
    <>
      <TallyPad
        value={raw}
        disabled={locked}
        resetKey={useResetKey ? qid : undefined}
        onChange={(n) => {
          onChange?.(n);
          if (!locked) setRaw(n);
        }}
      />
      <button
        type="button"
        onClick={() => {
          setChecked(raw);
          setLocked(true);
        }}
      >
        Check
      </button>
      <button
        type="button"
        onClick={() => {
          setRaw(0);
          setLocked(false);
          setQid((q) => q + 1);
        }}
      >
        Next question
      </button>
      <output data-testid="raw">{raw}</output>
      <output data-testid="checked">{checked ?? ''}</output>
    </>
  );
}

describe('TallyPad – locking, resets and commits', () => {
  it('a lock while ink is waiting (time up) drops the ink: no late onChange, the pad keeps matching the answer', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<LockingParent onChange={onChange} />);
    const canvas = drawMode();
    drawStroke(canvas, upright(40));
    drawStroke(canvas, upright(70));
    fireEvent.click(screen.getByRole('button', { name: 'Check' })); // no pointerdown: like time running out
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS * 3));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('checked').textContent).toBe('0');
    expect(shownNumber(container)).toBe('0');
    expect(container.querySelector('.tally-pad')).toHaveClass('is-disabled');

    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tap tally marks' }));
    expect(pressedCount()).toBe(0);
    fireEvent.click(mark(1));
    expect(screen.getByTestId('raw').textContent).toBe('1');
  });

  it('a lock that lands while a tap-mode count was ignored re-syncs the pad to the parent value', () => {
    // A parent that never accepts input (always locked after the first render) keeps the pad on its value.
    function Stubborn() {
      const [locked, setLocked] = useState(false);
      return (
        <>
          <TallyPad value={0} disabled={locked} onChange={() => undefined} />
          <button type="button" onClick={() => setLocked(true)}>
            lock
          </button>
        </>
      );
    }
    const { container } = render(<Stubborn />);
    fireEvent.click(mark(1));
    fireEvent.click(mark(2));
    expect(shownNumber(container)).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'lock' }));
    expect(shownNumber(container)).toBe('0');
    expect(pressedCount()).toBe(0);
  });

  it('pressing Check while ink is waiting commits it first, so Check sees the full count', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<LockingParent onChange={onChange} />);
    const canvas = drawMode();
    drawStroke(canvas, upright(40));
    drawStroke(canvas, upright(70));
    drawStroke(canvas, upright(100));
    act(() => vi.advanceTimersByTime(300));
    const check = screen.getByRole('button', { name: 'Check' });
    fireEvent.pointerDown(check, { pointerId: 4, pointerType: 'touch' });
    fireEvent.click(check);
    expect(screen.getByTestId('checked').textContent).toBe('3');
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS * 3));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([3]);
  });

  it('presses inside the pad do not commit early (undo still removes the waiting line)', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const canvas = drawMode();
    drawStroke(canvas, upright(40));
    const undo = screen.getByRole('button', { name: 'Undo last mark' });
    fireEvent.pointerDown(undo, { pointerId: 4, pointerType: 'touch' });
    fireEvent.click(undo);
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS * 2));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a new resetKey drops waiting ink even when the value stays 0, and resets the tap slots', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<LockingParent onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add 5 more marks' }));
    expect(marks()).toHaveLength(25);
    const canvas = drawMode();
    drawStroke(canvas, upright(40));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' })); // raw 0 → 0, new resetKey
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS * 3));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Draw tally marks' })).toHaveAttribute('aria-pressed', 'true'); // mode kept
    fireEvent.click(screen.getByRole('button', { name: 'Tap tally marks' }));
    expect(marks()).toHaveLength(20);
  });

  it('the parent setting a new value drops waiting ink (no later onChange)', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const canvas = drawMode();
    drawStroke(canvas, upright(40));
    fireEvent.click(screen.getByRole('button', { name: 'parent seven' }));
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS * 3));
    expect(onChange).not.toHaveBeenCalled();
    expect(shownNumber(container)).toBe('7');
  });

  it('a parent change during the conversion animation cancels it without a late "land" pop', () => {
    vi.useFakeTimers();
    const { container } = render(<Harness />);
    const canvas = drawMode();
    drawStroke(canvas, upright(40));
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS));
    expect(screen.getByTestId('tally-convert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'parent seven' }));
    expect(screen.queryByTestId('tally-convert')).toBeNull();
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_ANIMATION_MS + 50));
    expect(container.querySelector('.tp-summary')).not.toHaveClass('land');
  });

  it('unmounting with ink waiting never calls onChange', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { unmount } = render(<Harness onChange={onChange} />);
    drawStroke(drawMode(), upright(40));
    unmount();
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS * 3));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('TallyPad – pointers', () => {
  it('switching mode while a finger is still on the canvas does not leave draw mode dead', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const canvas = drawMode();
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'touch', clientX: 50, clientY: 50 });
    fireEvent.click(screen.getByRole('button', { name: 'Tap tally marks' }));
    const canvas2 = drawMode();
    drawStroke(canvas2, upright(40), 'touch', 2);
    drawStroke(canvas2, upright(80), 'touch', 3);
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([2]);
  });

  it('a lost pointer capture frees the canvas', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const canvas = drawMode();
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'touch', clientX: 50, clientY: 50 });
    fireEvent.lostPointerCapture(canvas, { pointerId: 1, pointerType: 'touch' });
    drawStroke(canvas, upright(40), 'touch', 2);
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('palm down before the Apple Pencil: the Pencil takes over and the palm never counts', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const canvas = drawMode();
    fireEvent.pointerDown(canvas, { pointerId: 5, pointerType: 'touch', clientX: 250, clientY: 60 });
    drawStroke(canvas, upright(40), 'pen', 9);
    drawStroke(canvas, upright(80), 'pen', 9);
    // the palm drifts a long way and lifts
    fireEvent.pointerMove(canvas, { pointerId: 5, pointerType: 'touch', clientX: 250, clientY: 120 });
    fireEvent.pointerMove(canvas, { pointerId: 5, pointerType: 'touch', clientX: 250, clientY: 180 });
    fireEvent.pointerUp(canvas, { pointerId: 5, pointerType: 'touch', clientX: 250, clientY: 180 });
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([2]);
  });

  it('palm down before the Pencil and staying still: the Pencil line still counts', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const canvas = drawMode();
    fireEvent.pointerDown(canvas, { pointerId: 5, pointerType: 'touch', clientX: 250, clientY: 60 });
    drawStroke(canvas, upright(40), 'pen', 9);
    fireEvent.pointerUp(canvas, { pointerId: 5, pointerType: 'touch', clientX: 250, clientY: 60 });
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1]);
  });

  it('a resting thumb hands the canvas to the drawing finger', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const canvas = drawMode();
    fireEvent.pointerDown(canvas, { pointerId: 5, pointerType: 'touch', clientX: 280, clientY: 190 });
    act(() => vi.advanceTimersByTime(300));
    drawStroke(canvas, upright(40), 'touch', 6);
    drawStroke(canvas, upright(70), 'touch', 7);
    drawStroke(canvas, upright(100), 'touch', 8);
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([3]);
  });

  it('a second touch does not steal the canvas from a finger that is drawing', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const canvas = drawMode();
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'touch', clientX: 40, clientY: 30 });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'touch', clientX: 41, clientY: 100 });
    act(() => vi.advanceTimersByTime(300));
    drawStroke(canvas, upright(150), 'touch', 2); // ignored
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'touch', clientX: 42, clientY: 170 });
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: 'touch', clientX: 42, clientY: 170 });
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1]);
  });
});

describe('TallyPad – conversion timing and reporting', () => {
  it('waits generously between strokes but converts quickly right after a whole bundle of five', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const canvas = drawMode();
    for (const x of [40, 70, 100, 130]) drawStroke(canvas, upright(x));
    act(() => vi.advanceTimersByTime(TALLY_BUNDLE_CONVERT_DELAY_MS + 50));
    expect(onChange).not.toHaveBeenCalled(); // four marks: the child may still cross them
    drawStroke(canvas, diagonal);
    act(() => vi.advanceTimersByTime(TALLY_BUNDLE_CONVERT_DELAY_MS + 10));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([5]);
  });

  it('during the conversion the live region already has the new total and the old numeral steps back', () => {
    vi.useFakeTimers();
    const { container } = render(<Harness />);
    const canvas = drawMode();
    drawStroke(canvas, upright(40));
    drawStroke(canvas, upright(70));
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS));
    expect(spokenNumber(container)).toBe('2');
    expect(shownNumber(container)).toBe('0');
    expect(container.querySelector('.tp-summary')).toHaveClass('waiting');
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_ANIMATION_MS));
    expect(shownNumber(container)).toBe('2');
    expect(container.querySelector('.tp-summary')).not.toHaveClass('waiting');
  });

  it('no-op changes are not reported: clearing only ink at 0, or drawing at max', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const voice = vi.fn();
    const { unmount } = render(<Harness onChange={onChange} voiceCount={voice} />);
    drawStroke(drawMode(), upright(40));
    fireEvent.click(screen.getByRole('button', { name: 'Clear tally marks' }));
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS * 2));
    expect(onChange).not.toHaveBeenCalled();
    expect(voice).not.toHaveBeenCalled();
    unmount();

    render(<Harness initial={3} max={3} onChange={onChange} voiceCount={voice} />);
    drawStroke(drawMode(), upright(40));
    act(() => vi.advanceTimersByTime(TALLY_CONVERT_DELAY_MS + TALLY_CONVERT_ANIMATION_MS));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('tally-convert')).toBeNull();
  });

  it('speaks the count after undo and clear', () => {
    const voice = vi.fn();
    render(<Harness initial={4} voiceCount={voice} />);
    drawMode();
    fireEvent.click(screen.getByRole('button', { name: 'Undo last mark' }));
    expect(voice).toHaveBeenLastCalledWith(3);
    fireEvent.click(screen.getByRole('button', { name: 'Clear tally marks' }));
    expect(voice).toHaveBeenLastCalledWith(0);
    expect(voice).toHaveBeenCalledTimes(2);
  });
});

describe('TallyPad – tap details', () => {
  it('the bold bundle diagonal only appears once all five marks are on', () => {
    const { container } = render(<Harness />);
    fireEvent.click(mark(5));
    expect(container.querySelectorAll('.tp-diag.on')).toHaveLength(0);
    expect(container.querySelector('.tp-group')).not.toHaveClass('complete');
    for (const n of [1, 2, 3, 4]) fireEvent.click(mark(n));
    expect(container.querySelectorAll('.tp-diag.on')).toHaveLength(1);
    expect(container.querySelector('.tp-group')).toHaveClass('complete');
  });

  it('"+5" reaching max moves keyboard focus to the first new mark', () => {
    render(<Harness max={25} />);
    const more = screen.getByRole('button', { name: 'Add 5 more marks' });
    more.focus();
    fireEvent.click(more);
    expect(screen.queryByRole('button', { name: 'Add 5 more marks' })).toBeNull();
    expect(document.activeElement).toBe(mark(21));
  });
});
