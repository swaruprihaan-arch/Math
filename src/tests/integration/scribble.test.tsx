// @vitest-environment jsdom
import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../handwriting/recognizer', () => ({
  recognize: vi.fn(() => ({ text: '42', characters: [] })),
}));

import { recognize } from '../../handwriting/recognizer';
import {
  CLEAR_WRITING_LABEL,
  HandwritingPad,
  type HandwritingPadHandle,
  LIVE_DELAY_MS,
  PENCIL_HINT_MS,
  PENCIL_HINT_TEXT,
  PENCIL_IDLE_MS,
  resetPencilMemory,
  SCRIBBLE_DELAY_MS,
  SCRIBBLE_GLIDE_MS,
  SCRIBBLE_MORPH_MS,
  UNDO_CONVERT_LABEL,
  UNDO_LINE_LABEL,
} from '../../components/AnswerInput/HandwritingPad';

const LABEL = 'Write your answer here';
const recognizeMock = vi.mocked(recognize);

/* jsdom has no canvas: a stub 2D context is enough for drawing calls. */
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const stubContext = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000',
};
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => stubContext) as unknown as HTMLCanvasElement['getContext'];
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

beforeEach(() => {
  vi.useFakeTimers();
  resetPencilMemory();
  recognizeMock.mockReset();
  recognizeMock.mockImplementation(() => ({ text: '42', characters: [] }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.className = '';
});

/** Let the code-split recognizer finish loading (the pad imports it dynamically). */
async function settle() {
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

type Kind = 'pen' | 'touch' | 'mouse';
function stroke(canvas: HTMLElement, points: [number, number][], pointerType: Kind = 'pen', pointerId = 1) {
  const [first, ...rest] = points;
  fireEvent.pointerDown(canvas, { pointerId, pointerType, clientX: first![0], clientY: first![1], button: 0, isPrimary: true });
  for (const [x, y] of rest) fireEvent.pointerMove(canvas, { pointerId, pointerType, clientX: x, clientY: y });
  fireEvent.pointerUp(canvas, { pointerId, pointerType, clientX: rest.at(-1)?.[0] ?? first![0], clientY: rest.at(-1)?.[1] ?? first![1] });
}

const FOUR: [number, number][] = [
  [40, 20],
  [20, 90],
  [70, 90],
];
const TWO: [number, number][] = [
  [100, 30],
  [140, 30],
  [100, 110],
  [150, 110],
];

async function renderScribble(extra: Partial<Parameters<typeof HandwritingPad>[0]> = {}) {
  const onConvert = vi.fn();
  const utils = render(<HandwritingPad label={LABEL} symbols="" resetKey="q1" onConvert={onConvert} {...extra} />);
  await settle();
  return { ...utils, onConvert, canvas: screen.getByRole('img', { name: LABEL }) };
}

describe('HandwritingPad — Scribble mode (handwriting turns into text)', () => {
  it('waits for the pause, morphs the ink into text, then hands the text over exactly once and clears', async () => {
    const { canvas, onConvert, container } = await renderScribble();
    stroke(canvas, FOUR);
    stroke(canvas, TWO);

    advance(SCRIBBLE_DELAY_MS - 10);
    expect(recognizeMock).not.toHaveBeenCalled();
    expect(container.querySelector('.scribble-text')).toBeNull();

    advance(20);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock.mock.calls[0]![0]).toHaveLength(2);
    // The typed text appears where the ink was, in an aria-hidden overlay; the ink ghost animates out.
    const layer = container.querySelector('.scribble-layer');
    expect(layer).not.toBeNull();
    expect(layer!.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.scribble-text')!.textContent).toBe('42');
    expect(container.querySelectorAll('.scribble-ink path')).toHaveLength(2);
    expect(onConvert).not.toHaveBeenCalled();
    // The ink already left the canvas: the pad is ready for more writing (🧽 / ↶ would cancel the conversion).
    expect(container.querySelector('.hw-canvas')).not.toBeNull();
    expect(screen.getByRole('button', { name: UNDO_CONVERT_LABEL })).toBeEnabled();

    advance(SCRIBBLE_MORPH_MS);
    expect(onConvert).toHaveBeenCalledTimes(1);
    expect(onConvert).toHaveBeenCalledWith('42');
    expect(container.querySelector('.scribble-text.is-gliding')).not.toBeNull();
    expect(container.querySelector('.scribble-ink')).toBeNull();
    expect(screen.getByText('Wrote 42')).toBeInTheDocument();

    advance(SCRIBBLE_GLIDE_MS + 10);
    expect(container.querySelector('.scribble-layer')).toBeNull();
    advance(5000);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('sizes the text to the ink height and positions it at the ink centre', async () => {
    const { canvas, container } = await renderScribble();
    stroke(canvas, [
      [50, 20],
      [50, 120],
    ]);
    advance(SCRIBBLE_DELAY_MS + 1);
    const text = container.querySelector<HTMLElement>('.scribble-text')!;
    expect(text.style.left).toBe('50px');
    expect(text.style.top).toBe('70px');
    const size = Number.parseFloat(text.style.fontSize);
    expect(size).toBeGreaterThanOrEqual(100);
    expect(size).toBeLessThanOrEqual(160);
  });

  it('a new stroke during the pause restarts the wait and everything converts together', async () => {
    const { canvas, onConvert } = await renderScribble();
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS - 100);
    stroke(canvas, TWO);
    advance(200);
    expect(recognizeMock).not.toHaveBeenCalled();
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock.mock.calls[0]![0]).toHaveLength(2);
    expect(onConvert).toHaveBeenCalledWith('42');
  });

  it('keeps the ink when nothing is recognised', async () => {
    recognizeMock.mockImplementation(() => ({ text: '', characters: [] }));
    const { canvas, onConvert, container } = await renderScribble();
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    expect(onConvert).not.toHaveBeenCalled();
    expect(container.querySelector('.scribble-layer')).toBeNull();
    expect(screen.getByRole('button', { name: CLEAR_WRITING_LABEL })).toBeEnabled();
    expect(screen.getByRole('button', { name: UNDO_LINE_LABEL })).toBeEnabled();
  });

  it('palm rejection: after the Apple Pencil is used, touches are ignored (and do not restart the wait)', async () => {
    const { canvas, onConvert } = await renderScribble();
    stroke(canvas, FOUR, 'pen', 1);
    advance(SCRIBBLE_DELAY_MS - 100);
    stroke(canvas, TWO, 'touch', 7); // resting palm
    fireEvent.pointerCancel(canvas, { pointerId: 7, pointerType: 'touch' });
    advance(110);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock.mock.calls[0]![0]).toHaveLength(1);
    advance(SCRIBBLE_MORPH_MS);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('a palm touch during a Pencil stroke does not cut the stroke; one pointer draws at a time', async () => {
    const { canvas } = await renderScribble();
    stroke(canvas, [[0, 0], [1, 1]], 'pen', 1); // the Pencil has been used
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS);
    recognizeMock.mockClear();

    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: 'pen', clientX: 10, clientY: 10 });
    fireEvent.pointerDown(canvas, { pointerId: 9, pointerType: 'touch', clientX: 200, clientY: 150 });
    fireEvent.pointerCancel(canvas, { pointerId: 9, pointerType: 'touch' });
    fireEvent.pointerDown(canvas, { pointerId: 3, pointerType: 'mouse', clientX: 50, clientY: 50 }); // second pointer: ignored
    fireEvent.pointerMove(canvas, { pointerId: 3, pointerType: 'mouse', clientX: 60, clientY: 60 });
    fireEvent.pointerMove(canvas, { pointerId: 2, pointerType: 'pen', clientX: 10, clientY: 80 });
    fireEvent.pointerUp(canvas, { pointerId: 3, pointerType: 'mouse' });
    fireEvent.pointerUp(canvas, { pointerId: 2, pointerType: 'pen', clientX: 10, clientY: 80 });
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    const strokes = recognizeMock.mock.calls[0]![0];
    expect(strokes).toHaveLength(1);
    expect(strokes[0]).toEqual([
      { x: 10, y: 10 },
      { x: 10, y: 80 },
    ]);
  });

  it('fingers can write when no Pencil was used', async () => {
    const { canvas, onConvert } = await renderScribble();
    stroke(canvas, FOUR, 'touch', 4);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(onConvert).toHaveBeenCalledWith('42');
  });

  it('↶ undoes the last line before conversion, then undoes the last conversion via onUndoConvert', async () => {
    const onUndoConvert = vi.fn();
    const { canvas, onConvert } = await renderScribble({ onUndoConvert });
    const undo = () => screen.getByRole('button', { name: /^Undo last/ });
    expect(undo()).toBeDisabled(); // nothing to undo yet
    stroke(canvas, FOUR);
    stroke(canvas, TWO);
    expect(undo()).toHaveAccessibleName(UNDO_LINE_LABEL);
    fireEvent.click(undo());
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(recognizeMock.mock.calls[0]![0]).toHaveLength(1);
    expect(onConvert).toHaveBeenCalledTimes(1);
    expect(onUndoConvert).not.toHaveBeenCalled();

    expect(undo()).toHaveAccessibleName(UNDO_CONVERT_LABEL);
    expect(undo()).toBeEnabled();
    fireEvent.click(undo());
    expect(onUndoConvert).toHaveBeenCalledTimes(1);
    expect(onUndoConvert).toHaveBeenCalledWith('42');
    expect(undo()).toBeDisabled();
  });

  it('🧽 clears the ink without converting', async () => {
    const { canvas, onConvert } = await renderScribble();
    stroke(canvas, FOUR);
    fireEvent.click(screen.getByRole('button', { name: CLEAR_WRITING_LABEL }));
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS);
    expect(recognizeMock).not.toHaveBeenCalled();
    expect(onConvert).not.toHaveBeenCalled();
  });

  it('a new question (resetKey) drops an unfinished conversion', async () => {
    const { canvas, onConvert, rerender, container } = await renderScribble();
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(container.querySelector('.scribble-text')).not.toBeNull();
    rerender(<HandwritingPad label={LABEL} symbols="" resetKey="q2" onConvert={onConvert} />);
    advance(SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS);
    expect(onConvert).not.toHaveBeenCalled();
    expect(container.querySelector('.scribble-layer')).toBeNull();
  });

  it('body.no-anim skips the animation: the text is handed over right after the pause', async () => {
    document.body.classList.add('no-anim');
    const { canvas, onConvert, container } = await renderScribble();
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(onConvert).toHaveBeenCalledTimes(1);
    expect(onConvert).toHaveBeenCalledWith('42');
    expect(container.querySelector('.scribble-layer')).toBeNull();
    expect(screen.getByText('Wrote 42')).toBeInTheDocument();
  });

  it('prefers-reduced-motion skips the animation too', async () => {
    const original = globalThis.matchMedia;
    globalThis.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q })) as unknown as typeof globalThis.matchMedia;
    try {
      const { canvas, onConvert, container } = await renderScribble();
      stroke(canvas, FOUR);
      advance(SCRIBBLE_DELAY_MS + 1);
      expect(onConvert).toHaveBeenCalledTimes(1);
      expect(container.querySelector('.scribble-layer')).toBeNull();
    } finally {
      globalThis.matchMedia = original;
    }
  });

  it('does not convert while disabled; the frozen ink converts once enabled again', async () => {
    const { canvas, onConvert, rerender } = await renderScribble();
    stroke(canvas, FOUR);
    rerender(<HandwritingPad label={LABEL} symbols="" resetKey="q1" onConvert={onConvert} disabled />);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(onConvert).not.toHaveBeenCalled();
    stroke(canvas, TWO); // ignored while disabled
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(recognizeMock).not.toHaveBeenCalled();
    rerender(<HandwritingPad label={LABEL} symbols="" resetKey="q1" onConvert={onConvert} />);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock.mock.calls[0]![0]).toHaveLength(1);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('disabling the pad mid-morph drops the conversion (no onConvert, no announcement)', async () => {
    const { canvas, onConvert, rerender, container } = await renderScribble();
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(container.querySelector('.scribble-text')).not.toBeNull();
    rerender(<HandwritingPad label={LABEL} symbols="" resetKey="q1" onConvert={onConvert} disabled />);
    advance(SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS + 10);
    expect(onConvert).not.toHaveBeenCalled();
    expect(container.querySelector('.scribble-layer')).toBeNull();
    expect(screen.queryByText(/^Wrote/)).toBeNull();
  });

  it('passes the allowed symbols to the recognizer', async () => {
    const { canvas } = await renderScribble({ symbols: './' });
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(recognizeMock.mock.calls[0]![1]).toEqual({ symbols: './' });
  });
});

describe('HandwritingPad — live mode (unchanged)', () => {
  it('calls onText after each stroke settles, after undo, and with "" after clear; no overlay', async () => {
    recognizeMock.mockImplementation((strokes) => ({ text: '7'.repeat(strokes.length), characters: [] }));
    const onText = vi.fn();
    const { container } = render(<HandwritingPad label={LABEL} symbols="" resetKey="q1" onText={onText} />);
    await settle();
    const canvas = screen.getByRole('img', { name: LABEL });
    stroke(canvas, FOUR);
    advance(LIVE_DELAY_MS + 1);
    expect(onText).toHaveBeenLastCalledWith('7');
    stroke(canvas, TWO);
    advance(LIVE_DELAY_MS + 1);
    expect(onText).toHaveBeenLastCalledWith('77');
    expect(container.querySelector('.scribble-layer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: UNDO_LINE_LABEL }));
    expect(onText).toHaveBeenLastCalledWith('7');
    fireEvent.click(screen.getByRole('button', { name: CLEAR_WRITING_LABEL }));
    expect(onText).toHaveBeenLastCalledWith('');
    advance(SCRIBBLE_DELAY_MS * 3);
    expect(container.querySelector('.scribble-layer')).toBeNull();
    expect(screen.queryByText(/^Wrote/)).toBeNull();
  });

  it('live mode keeps palm rejection', async () => {
    const onText = vi.fn();
    render(<HandwritingPad label={LABEL} symbols="" resetKey="q1" onText={onText} />);
    await settle();
    const canvas = screen.getByRole('img', { name: LABEL });
    stroke(canvas, FOUR, 'pen', 1);
    stroke(canvas, TWO, 'touch', 5);
    advance(LIVE_DELAY_MS + 1);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock.mock.calls[0]![0]).toHaveLength(1);
  });

  it('a cancelled stroke (iOS system gesture) does not swallow the previous stroke\'s onText', async () => {
    const onText = vi.fn();
    render(<HandwritingPad label={LABEL} symbols="" resetKey="q1" onText={onText} />);
    await settle();
    const canvas = screen.getByRole('img', { name: LABEL });
    stroke(canvas, FOUR, 'touch', 1);
    advance(100);
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: 'touch', clientX: 5, clientY: 5 });
    fireEvent.pointerCancel(canvas, { pointerId: 2, pointerType: 'touch' });
    advance(LIVE_DELAY_MS + 1);
    expect(onText).toHaveBeenCalledTimes(1);
    expect(recognizeMock.mock.calls[0]![0]).toHaveLength(1);
  });

  it('tapping a button outside the pad reports the live text immediately', async () => {
    const onText = vi.fn();
    render(
      <>
        <HandwritingPad label={LABEL} symbols="" resetKey="q1" onText={onText} />
        <button type="button">Check</button>
      </>,
    );
    await settle();
    stroke(screen.getByRole('img', { name: LABEL }), FOUR);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Check' }));
    expect(onText).toHaveBeenCalledTimes(1);
    advance(LIVE_DELAY_MS * 3);
    expect(onText).toHaveBeenCalledTimes(1);
  });
});

describe('HandwritingPad — Apple Pencil palm rejection', () => {
  it('a palm that lands before the Pencil is dropped; the Pencil line is what gets converted', async () => {
    const { canvas, onConvert } = await renderScribble();
    fireEvent.pointerDown(canvas, { pointerId: 9, pointerType: 'touch', clientX: 200, clientY: 150 });
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: 'pen', clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { pointerId: 2, pointerType: 'pen', clientX: 10, clientY: 80 });
    fireEvent.pointerMove(canvas, { pointerId: 9, pointerType: 'touch', clientX: 205, clientY: 155 });
    fireEvent.pointerUp(canvas, { pointerId: 2, pointerType: 'pen', clientX: 10, clientY: 80 });
    fireEvent.pointerUp(canvas, { pointerId: 9, pointerType: 'touch', clientX: 205, clientY: 155 });
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock.mock.calls[0]![0]).toEqual([
      [
        { x: 10, y: 10 },
        { x: 10, y: 80 },
      ],
    ]);
    advance(SCRIBBLE_MORPH_MS);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('the Pencil is remembered across remounts (Keypad ↔ Write), so a resting palm still cannot draw', async () => {
    const first = await renderScribble();
    stroke(first.canvas, FOUR, 'pen', 1);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS);
    first.unmount();
    recognizeMock.mockClear();
    const second = await renderScribble();
    stroke(second.canvas, TWO, 'touch', 7);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(recognizeMock).not.toHaveBeenCalled();
    expect(second.onConvert).not.toHaveBeenCalled();
  });

  it('an ignored finger stroke shows a short "Pencil mode" hint; fingers work again after the Pencil rests', async () => {
    const { canvas, onConvert, container } = await renderScribble();
    stroke(canvas, FOUR, 'pen', 1);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS);
    expect(onConvert).toHaveBeenCalledTimes(1);

    stroke(canvas, TWO, 'touch', 5);
    expect(container.querySelector('.hw-pencil-hint')!.textContent).toBe(PENCIL_HINT_TEXT);
    advance(PENCIL_HINT_MS + 1);
    expect(container.querySelector('.hw-pencil-hint')).toBeNull();
    advance(SCRIBBLE_DELAY_MS);
    expect(onConvert).toHaveBeenCalledTimes(1);

    advance(PENCIL_IDLE_MS);
    stroke(canvas, TWO, 'touch', 6);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(onConvert).toHaveBeenCalledTimes(2);
  });

  it('no hint for a palm resting while the Pencil writes', async () => {
    const { canvas, container } = await renderScribble();
    stroke(canvas, FOUR, 'pen', 1);
    fireEvent.pointerDown(canvas, { pointerId: 9, pointerType: 'touch', clientX: 200, clientY: 150 });
    stroke(canvas, TWO, 'pen', 2);
    fireEvent.pointerUp(canvas, { pointerId: 9, pointerType: 'touch', clientX: 200, clientY: 150 });
    expect(container.querySelector('.hw-pencil-hint')).toBeNull();
  });
});

describe('HandwritingPad — Scribble edge cases', () => {
  it('↶ during the morph cancels the number being typed, not the previous one', async () => {
    const onUndoConvert = vi.fn();
    recognizeMock.mockImplementation(() => ({ text: '1', characters: [] }));
    const { canvas, onConvert, container } = await renderScribble({ onUndoConvert });
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS);
    expect(onConvert).toHaveBeenLastCalledWith('1');

    recognizeMock.mockImplementation(() => ({ text: '7', characters: [] })); // misread
    stroke(canvas, TWO);
    advance(SCRIBBLE_DELAY_MS + 1); // '7' is morphing in
    const undo = screen.getByRole('button', { name: UNDO_CONVERT_LABEL });
    expect(undo).toBeEnabled();
    fireEvent.pointerDown(undo); // a tap on the pad's own tools must not flush the conversion
    fireEvent.click(undo);
    expect(onUndoConvert).not.toHaveBeenCalled();
    expect(container.querySelector('.scribble-layer')).toBeNull();
    advance(SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS + 10);
    expect(onConvert.mock.calls).toEqual([['1']]);

    // The next ↶ undoes the earlier, committed '1'.
    fireEvent.click(screen.getByRole('button', { name: UNDO_CONVERT_LABEL }));
    expect(onUndoConvert).toHaveBeenCalledWith('1');
    expect(screen.getByText('Removed 1')).toBeInTheDocument();
    expect(screen.queryByText('Wrote 1')).toBeNull();
  });

  it('a first number can be cancelled mid-morph with ↶ or 🧽 (even without onUndoConvert)', async () => {
    const { canvas, onConvert } = await renderScribble();
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(screen.getByRole('button', { name: CLEAR_WRITING_LABEL })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: CLEAR_WRITING_LABEL }));
    stroke(canvas, TWO);
    advance(SCRIBBLE_DELAY_MS + 1);
    fireEvent.click(screen.getByRole('button', { name: UNDO_CONVERT_LABEL }));
    advance(SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS + 10);
    expect(onConvert).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: CLEAR_WRITING_LABEL })).toBeDisabled();
    expect(screen.getByRole('button', { name: UNDO_LINE_LABEL })).toBeDisabled();
  });

  it('tapping ✓ (a button outside the pad) during the pause converts the ink before the click', async () => {
    const onConvert = vi.fn();
    const onCheck = vi.fn();
    const { container } = render(
      <>
        <HandwritingPad label={LABEL} symbols="" resetKey="q1" onConvert={onConvert} />
        <button type="button" onClick={onCheck}>
          Check
        </button>
        <p>plain text</p>
      </>,
    );
    await settle();
    stroke(screen.getByRole('img', { name: LABEL }), FOUR);
    advance(300);
    fireEvent.pointerDown(screen.getByText('plain text')); // a palm on plain content does nothing
    expect(onConvert).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Check' }));
    expect(onConvert).toHaveBeenCalledTimes(1);
    expect(onConvert).toHaveBeenCalledWith('42');
    expect(container.querySelector('.scribble-text.is-gliding')).not.toBeNull(); // the glide still plays
    advance(SCRIBBLE_GLIDE_MS + 10);
    expect(container.querySelector('.scribble-layer')).toBeNull();
    advance(5000);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('tapping ✓ mid-morph commits the in-flight text at once (exactly once)', async () => {
    const onConvert = vi.fn();
    render(
      <>
        <HandwritingPad label={LABEL} symbols="" resetKey="q1" onConvert={onConvert} />
        <button type="button">Check</button>
      </>,
    );
    await settle();
    stroke(screen.getByRole('img', { name: LABEL }), FOUR);
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(onConvert).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Check' }), { key: 'Enter' });
    expect(onConvert).toHaveBeenCalledTimes(1);
    advance(5000);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('ref.flush() hands everything over synchronously, in order, as one onConvert; onPendingChange tracks it', async () => {
    const ref = createRef<HandwritingPadHandle>();
    const onPendingChange = vi.fn();
    const onUndoConvert = vi.fn();
    recognizeMock.mockImplementationOnce(() => ({ text: '4', characters: [] })).mockImplementationOnce(() => ({ text: '2', characters: [] }));
    const { canvas, onConvert, container } = await renderScribble({ ref, onPendingChange, onUndoConvert });
    expect(onPendingChange).not.toHaveBeenCalled();
    stroke(canvas, FOUR);
    expect(onPendingChange).toHaveBeenLastCalledWith(true);
    advance(SCRIBBLE_DELAY_MS + 1); // '4' morphing
    stroke(canvas, TWO); // '2' still ink
    act(() => ref.current!.flush());
    expect(onConvert.mock.calls).toEqual([['42']]);
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
    expect(container.querySelectorAll('.scribble-text.is-gliding')).toHaveLength(2);
    advance(5000);
    expect(onConvert).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.scribble-layer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: UNDO_CONVERT_LABEL }));
    expect(onUndoConvert).toHaveBeenCalledWith('42');
  });

  it('ref.flush() with motion off commits straight away (no overlay)', async () => {
    document.body.classList.add('no-anim');
    const ref = createRef<HandwritingPadHandle>();
    const { canvas, onConvert, container } = await renderScribble({ ref });
    stroke(canvas, FOUR);
    act(() => ref.current!.flush());
    expect(onConvert.mock.calls).toEqual([['42']]);
    expect(container.querySelector('.scribble-layer')).toBeNull();
    advance(5000);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('unmounting mid-morph still delivers the text the child saw, and leaves no timers', async () => {
    const onPendingChange = vi.fn();
    const { canvas, onConvert, unmount } = await renderScribble({ onPendingChange });
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(onConvert).not.toHaveBeenCalled();
    unmount();
    expect(onConvert).toHaveBeenCalledTimes(1);
    expect(onConvert).toHaveBeenCalledWith('42');
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
    expect(vi.getTimerCount()).toBe(0);
    advance(5000);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('glides toward glideTarget and scales to its font size', async () => {
    const target = document.createElement('div');
    target.style.fontSize = '24px';
    document.body.appendChild(target);
    target.getBoundingClientRect = () => ({ left: 300, top: -200, width: 100, height: 40, right: 400, bottom: -160, x: 300, y: -200, toJSON: () => ({}) });
    try {
      const { canvas, container } = await renderScribble({ glideTarget: () => target });
      const stage = container.querySelector<HTMLElement>('.hw-stage')!;
      stage.getBoundingClientRect = () => ({ left: 10, top: 100, width: 400, height: 200, right: 410, bottom: 300, x: 10, y: 100, toJSON: () => ({}) });
      stroke(canvas, [
        [50, 20],
        [50, 120],
      ]);
      advance(SCRIBBLE_DELAY_MS + 1);
      const text = container.querySelector<HTMLElement>('.scribble-text')!;
      const fontSize = Number.parseFloat(text.style.fontSize);
      advance(SCRIBBLE_MORPH_MS);
      const gliding = container.querySelector<HTMLElement>('.scribble-text.is-gliding')!;
      // target centre (350, -180) − (stage origin + ink centre (50, 70))
      expect(gliding.style.getPropertyValue('--scribble-dx')).toBe('290px');
      expect(gliding.style.getPropertyValue('--scribble-dy')).toBe('-350px');
      expect(Number.parseFloat(gliding.style.getPropertyValue('--scribble-scale'))).toBeCloseTo(24 / fontSize, 5);
    } finally {
      target.remove();
    }
  });

  it('keeps the typed text inside a narrow (phone) pad', async () => {
    recognizeMock.mockImplementation(() => ({ text: '100', characters: [] }));
    const { canvas, container } = await renderScribble();
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 190 });
    stroke(canvas, [
      [20, 20],
      [20, 170],
      [60, 20],
      [60, 170],
    ]);
    advance(SCRIBBLE_DELAY_MS + 1);
    const text = container.querySelector<HTMLElement>('.scribble-text')!;
    const fontSize = Number.parseFloat(text.style.fontSize);
    const half = fontSize * 0.33 * 3;
    const left = Number.parseFloat(text.style.left);
    expect(2 * half).toBeLessThanOrEqual(300);
    expect(left - half).toBeGreaterThanOrEqual(0);
    expect(left + half).toBeLessThanOrEqual(300);
  });

  it('announces when the writing could not be read', async () => {
    recognizeMock.mockImplementation(() => ({ text: '', characters: [] }));
    const { canvas } = await renderScribble();
    stroke(canvas, FOUR);
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(screen.getByText('Could not read that. Try again.')).toBeInTheDocument();
  });
});

describe('HandwritingPad — accidental marks (real recognizer)', () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import('../../handwriting/recognizer')>('../../handwriting/recognizer');
    recognizeMock.mockImplementation(actual.recognize);
  });

  it('a single tap is wiped, not turned into a digit', async () => {
    const { canvas, onConvert } = await renderScribble();
    stroke(canvas, [[120, 80]], 'touch', 3);
    expect(screen.getByRole('button', { name: CLEAR_WRITING_LABEL })).toBeEnabled();
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS);
    expect(onConvert).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: CLEAR_WRITING_LABEL })).toBeDisabled();
  });

  it('a small palm smudge is wiped', async () => {
    const { canvas, onConvert } = await renderScribble();
    stroke(
      canvas,
      [
        [200, 150],
        [206, 153],
        [203, 158],
      ],
      'touch',
      3,
    );
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS + SCRIBBLE_GLIDE_MS);
    expect(onConvert).not.toHaveBeenCalled();
  });

  it('a real digit still converts', async () => {
    const { canvas, onConvert } = await renderScribble();
    stroke(canvas, [
      [60, 20],
      [60, 60],
      [60, 120],
    ]);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('a stray tap far from the digits is ignored; a lone dot is kept when "." is allowed', async () => {
    recognizeMock.mockImplementation(() => ({ text: '42', characters: [] }));
    const { canvas, onConvert, unmount } = await renderScribble();
    stroke(canvas, FOUR);
    stroke(canvas, [[400, 10]]);
    advance(SCRIBBLE_DELAY_MS + SCRIBBLE_MORPH_MS);
    expect(recognizeMock.mock.calls[0]![0]).toHaveLength(1);
    expect(onConvert).toHaveBeenCalledTimes(1);
    unmount();

    recognizeMock.mockClear();
    const dotted = await renderScribble({ symbols: '.' });
    stroke(dotted.canvas, [[120, 80]]);
    advance(SCRIBBLE_DELAY_MS + 1);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
  });
});
