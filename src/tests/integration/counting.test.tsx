// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VisualView } from '../../components/QuestionCard/VisualView';
import { BrickModel } from '../../components/SolutionPanel/BrickModel';
import type { Question, Visual } from '../../domain/question/types';
import { rat, type Rational } from '../../domain/rational/rational';

afterEach(cleanup);

const APPLES: Visual = { v: 'objects', groups: [{ emoji: '🍎', count: 3, label: 'apples' }] };

/** Badge numbers in DOM order ('' for things not counted yet). */
function badges(container: HTMLElement): string[] {
  return [...container.querySelectorAll('button.count-item')].map((b) => b.querySelector('.count-badge')?.textContent ?? '');
}

function liveText(container: HTMLElement): string {
  return container.querySelector('[aria-live="polite"]')?.textContent ?? '';
}

/** Short exact pin for long SVG markup (any change to the printed picture changes it). */
function digest(markup: string): string {
  return createHash('sha256').update(markup).digest('hex').slice(0, 16);
}

/** The static brick-model stud, exactly as worksheets print it. */
const STUD = (color: string) =>
  `<span class="stud" style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${color};box-shadow:inset 0 -3px 0 rgba(0,0,0,.25), 0 2px 0 rgba(0,0,0,.2)"></span>`;
const RED = '#d01012';
const BLUE = '#0057a6';

function question(topic: string, operation: string, a: Rational, b: Rational): Question {
  return {
    id: `${topic}-${operation}-${a.numerator}/${a.denominator}-${b.numerator}/${b.denominator}`,
    topic,
    operation,
    operands: [
      { role: 'a', value: { type: 'NUMBER', value: a } },
      { role: 'b', value: { type: 'NUMBER', value: b } },
    ],
  } as unknown as Question;
}

describe('VisualView tap to count', () => {
  it('objects: each tap adds a numbered badge in tap order and calls onCount(1, 2, 3)', () => {
    const onCount = vi.fn();
    const { container } = render(<VisualView visual={APPLES} interactive onCount={onCount} />);
    const apples = screen.getAllByRole('button', { name: 'Count this apple' });
    expect(apples).toHaveLength(3);

    fireEvent.click(apples[2]!);
    expect(badges(container)).toEqual(['', '', '1']);
    fireEvent.click(apples[0]!);
    expect(badges(container)).toEqual(['2', '', '1']);
    fireEvent.click(apples[1]!);
    expect(badges(container)).toEqual(['2', '3', '1']);

    expect(onCount.mock.calls).toEqual([
      [1, '1'],
      [2, '2'],
      [3, '3'],
    ]);
    // counted things keep their noun and are marked aria-disabled (still focusable); uncounted ones are not
    expect(screen.getByRole('button', { name: 'Counted apple, 3' })).toBe(apples[1]);
    expect(apples[1]).toHaveAttribute('aria-disabled', 'true');
    expect(liveText(container)).toBe('3');
    // badges are decorative; the button name carries the number
    for (const badge of container.querySelectorAll('.count-badge')) expect(badge).toHaveAttribute('aria-hidden', 'true');
  });

  it('objects: tapping something already counted does nothing', () => {
    const onCount = vi.fn();
    const { container } = render(<VisualView visual={APPLES} interactive onCount={onCount} />);
    const first = screen.getAllByRole('button', { name: 'Count this apple' })[0]!;
    fireEvent.click(first);
    fireEvent.click(first);
    fireEvent.click(first);
    expect(onCount.mock.calls).toEqual([[1, '1']]);
    expect(badges(container)).toEqual(['1', '', '']);
    expect(screen.getAllByRole('button', { name: 'Count this apple' })[0]).not.toHaveAttribute('aria-disabled');
  });

  it('shows no number before the child counts, then the ↺ brick resets the count', () => {
    const onCount = vi.fn();
    const { container } = render(<VisualView visual={APPLES} interactive onCount={onCount} />);
    // no total (or any number) leaks before counting; the 👆 hint is shown instead of the reset brick
    expect(container.textContent).not.toMatch(/\d/);
    expect(screen.queryByRole('button', { name: 'Count again' })).toBeNull();
    expect(container.querySelector('.count-hint')).not.toBeNull();

    for (const apple of screen.getAllByRole('button', { name: 'Count this apple' }).slice(0, 2)) fireEvent.click(apple);
    expect(container.querySelector('.count-total')?.textContent).toContain('2');
    fireEvent.click(screen.getByRole('button', { name: 'Count again' }));

    expect(badges(container)).toEqual(['', '', '']);
    expect(screen.getAllByRole('button', { name: 'Count this apple' })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Count again' })).toBeNull();
    expect(container.textContent).not.toMatch(/\d/);
    expect(liveText(container)).toBe('');

    fireEvent.click(screen.getAllByRole('button', { name: 'Count this apple' })[1]!);
    expect(badges(container)).toEqual(['', '1', '']);
    expect(onCount.mock.calls).toEqual([
      [1, '1'],
      [2, '2'],
      [1, '1'],
    ]);
  });

  it('reset by keyboard keeps focus in the picture', () => {
    render(<VisualView visual={APPLES} interactive />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Count this apple' })[0]!);
    const reset = screen.getByRole('button', { name: 'Count again' });
    reset.focus();
    fireEvent.click(reset);
    expect(document.activeElement).toBe(screen.getAllByRole('button', { name: 'Count this apple' })[0]);
  });

  it('groups of the same thing are counted together; different things are counted separately', () => {
    const together = vi.fn();
    const same = render(
      <VisualView
        visual={{ v: 'objects', groups: [{ emoji: '🍎', count: 2, label: 'apples' }, { emoji: '🍎', count: 3, label: 'more apples' }] }}
        interactive
        onCount={together}
      />,
    );
    const apples = within(same.container).getAllByRole('button', { name: 'Count this apple' });
    fireEvent.click(apples[0]!);
    fireEvent.click(apples[4]!);
    expect(together.mock.calls).toEqual([
      [1, '1'],
      [2, '2'],
    ]);
    same.unmount();

    const apart = vi.fn();
    const { container } = render(
      <VisualView
        visual={{ v: 'objects', groups: [{ emoji: '🍎', count: 2, label: 'apples' }, { emoji: '⭐', count: 3, label: 'stars' }] }}
        interactive
        onCount={apart}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Count this apple' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Count this star' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Count this star' })[0]!);
    // the spoken form carries the pile's noun, so "1" and "1" are not confusing
    expect(apart.mock.calls).toEqual([
      [1, '1 apple'],
      [1, '1 star'],
      [2, '2 stars'],
    ]);
    expect(badges(container)).toEqual(['1', '', '1', '2', '']);
    expect(liveText(container)).toBe('2 stars');
    expect([...container.querySelectorAll('.count-total')].map((t) => t.textContent)).toEqual(['🍎1', '⭐2']);
  });

  it('array: every cell is a button to count', () => {
    const onCount = vi.fn();
    render(<VisualView visual={{ v: 'array', rows: 2, columns: 3, emoji: '🟦' }} interactive onCount={onCount} />);
    const squares = screen.getAllByRole('button', { name: 'Count this square' });
    expect(squares).toHaveLength(6);
    for (const s of squares) fireEvent.click(s);
    expect(onCount).toHaveBeenLastCalledWith(6, '6');
  });

  it('coins: each tapped coin shows its own value; nothing adds them up (that is the question)', () => {
    const onCount = vi.fn();
    const { container } = render(<VisualView visual={{ v: 'coins', coins: ['quarter', 'dime', 'nickel', 'penny', 'dollar'] }} interactive onCount={onCount} />);

    fireEvent.click(screen.getByRole('button', { name: 'Count this quarter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Count this dime' }));
    const dime = screen.getByRole('button', { name: 'Counted dime, 10 cents' });
    expect(dime).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(dime); // already counted: ignored
    fireEvent.click(screen.getByRole('button', { name: 'Count this nickel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Count this penny' }));
    fireEvent.click(screen.getByRole('button', { name: 'Count this dollar' }));

    expect(badges(container)).toEqual(['25¢', '10¢', '5¢', '1¢', '$1.00']);
    expect(onCount.mock.calls).toEqual([
      [25, '25 cents'],
      [10, '10 cents'],
      [5, '5 cents'],
      [1, '1 cent'],
      [100, '1 dollar'],
    ]);
    expect(liveText(container)).toBe('1 dollar');
    // no running total anywhere: the total (141¢) never appears
    expect(container.querySelector('.count-total')).toBeNull();
    expect(container.textContent).not.toMatch(/41|1\.41|141/);
    expect(screen.getByRole('button', { name: 'Count again' })).toBeInTheDocument();
  });

  it('fraction bar: only shaded parts count', () => {
    const onCount = vi.fn();
    const { container } = render(<VisualView visual={{ v: 'fractionBar', parts: 4, shaded: 3 }} interactive onCount={onCount} />);
    const parts = screen.getAllByRole('button', { name: 'Count this part' });
    expect(parts).toHaveLength(3);
    fireEvent.click(parts[1]!);
    fireEvent.click(parts[0]!);
    expect(onCount.mock.calls).toEqual([
      [1, '1'],
      [2, '2'],
    ]);
    expect(badges(container)).toEqual(['2', '1', '']);
  });

  it('fraction bar with many parts is drawn wide enough to tap each part, keeping its height', () => {
    const { container } = render(<VisualView visual={{ v: 'fractionBar', parts: 10, shaded: 3 }} interactive />);
    const box = container.querySelector<HTMLElement>('.count-fraction')!;
    expect(box.style.width).toBe(`${10 * 52 + 8}px`);
    const svg = box.querySelector('svg')!;
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
    expect(svg.style.height).toBe('70px');
    // a few parts: the usual 420px drawing
    cleanup();
    const few = render(<VisualView visual={{ v: 'fractionBar', parts: 4, shaded: 3 }} interactive />);
    expect(few.container.querySelector<HTMLElement>('.count-fraction')!.style.width).toBe('420px');
  });

  it('count starts over for a new question or a new picture, but not on a re-render of the same one', () => {
    const { container, rerender } = render(<VisualView visual={APPLES} interactive resetKey="q1" />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Count this apple' })[0]!);
    expect(badges(container)).toEqual(['1', '', '']);

    // same question, same picture as a new object (e.g. parent re-render): count is kept
    rerender(<VisualView visual={{ v: 'objects', groups: [{ emoji: '🍎', count: 3, label: 'apples' }] }} interactive resetKey="q1" />);
    expect(badges(container)).toEqual(['1', '', '']);

    // next question with an identical picture: fresh count, no leftover badges, total or ↺
    rerender(<VisualView visual={{ v: 'objects', groups: [{ emoji: '🍎', count: 3, label: 'apples' }] }} interactive resetKey="q2" />);
    expect(badges(container)).toEqual(['', '', '']);
    expect(container.querySelector('.count-total')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Count again' })).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: 'Count this apple' })[2]!);
    rerender(<VisualView visual={{ v: 'objects', groups: [{ emoji: '🍎', count: 4, label: 'apples' }] }} interactive resetKey="q2" />);
    expect(badges(container)).toEqual(['', '', '', '']);
    expect(screen.queryByRole('button', { name: 'Count again' })).toBeNull();
  });

  it('non-interactive pictures render exactly as before, with no buttons', () => {
    const visuals: Visual[] = [
      APPLES,
      { v: 'array', rows: 3, columns: 4, emoji: '🟦' },
      { v: 'coins', coins: ['quarter', 'penny'] },
      { v: 'fractionBar', parts: 4, shaded: 3 },
      { v: 'clock', hour: 3, minute: 30 },
      { v: 'shape', shape: 'hexagon' },
    ];
    for (const visual of visuals) {
      const { container, unmount } = render(<VisualView visual={visual} />);
      expect(container.querySelectorAll('button')).toHaveLength(0);
      expect(container.querySelector('.counting')).toBeNull();
      unmount();
    }
    expect(renderToStaticMarkup(<VisualView visual={APPLES} />)).toBe(
      '<figure class="visual" style="margin:0"><div class="objects" aria-hidden="true"><div class="object-group" style="grid-template-columns:repeat(3, 1fr)"><span>🍎</span><span>🍎</span><span>🍎</span></div></div><figcaption class="sr-only">[Picture: apples]</figcaption></figure>',
    );
    expect(renderToStaticMarkup(<VisualView visual={{ v: 'array', rows: 3, columns: 4, emoji: '🟦' }} />)).toBe(
      `<figure class="visual" style="margin:0"><div class="array-grid" style="grid-template-columns:repeat(4, 1fr)" aria-hidden="true">${'<span>🟦</span>'.repeat(12)}</div><figcaption class="sr-only">[An array: 3 rows of 4]</figcaption></figure>`,
    );
    const coin = (r: number, fill: string, label: string) =>
      `<svg viewBox="0 0 54 54" width="54" height="54"><circle cx="27" cy="27" r="${r}" fill="${fill}" stroke="#555" stroke-width="2"></circle><text x="27" y="32" text-anchor="middle" font-size="13" font-weight="800" fill="#222">${label}</text></svg>`;
    expect(renderToStaticMarkup(<VisualView visual={{ v: 'coins', coins: ['quarter', 'dime', 'nickel', 'penny', 'dollar'] }} />)).toBe(
      '<figure class="visual" style="margin:0"><div class="coins" aria-hidden="true">' +
        coin(24, '#cfd3d6', '25¢') +
        coin(17, '#d6d9dc', '10¢') +
        coin(21, '#c0c4c8', '5¢') +
        coin(19, '#c9773a', '1¢') +
        '<svg viewBox="0 0 110 54" width="110" height="54"><rect x="2" y="2" width="106" height="50" rx="6" fill="#cfe8c6" stroke="#2f6b2f" stroke-width="3"></rect><circle cx="55" cy="27" r="14" fill="#9fd08f" stroke="#2f6b2f" stroke-width="2"></circle><text x="55" y="33" text-anchor="middle" font-size="16" font-weight="800" fill="#1f4d1f">$1</text></svg>' +
        '</div><figcaption class="sr-only">[1 quarter, 1 dime, 1 nickel, 1 penny, 1 dollar bill]</figcaption></figure>',
    );
    // Fraction bars: long SVG, pinned by digest plus its readable frame.
    const bar = renderToStaticMarkup(<VisualView visual={{ v: 'fractionBar', parts: 4, shaded: 3 }} />);
    expect(bar.startsWith('<figure class="visual" style="margin:0"><svg viewBox="0 0 420 70" width="420" height="70" style="max-width:100%" aria-hidden="true"><g>')).toBe(true);
    expect(bar.endsWith('</g></svg><figcaption class="sr-only">[A bar split into 4 equal parts; 3 parts shaded]</figcaption></figure>')).toBe(true);
    expect(bar).not.toContain('preserveAspectRatio');
    expect([bar.length, digest(bar)]).toEqual([2339, '6a8980f7cc621189']);
    const bars = renderToStaticMarkup(<VisualView visual={{ v: 'fractionBar', parts: 3, shaded: 4, bars: 2 }} />);
    expect(bars.startsWith('<figure class="visual" style="margin:0"><svg viewBox="0 0 420 134" width="420" height="134" style="max-width:100%" aria-hidden="true">')).toBe(true);
    expect([bars.length, digest(bars)]).toEqual([4334, '6efdf557baf4ff02']);
  });

  it('pictures that cannot be counted ignore interactive', () => {
    for (const visual of [{ v: 'clock', hour: 3, minute: 30 }, { v: 'fractionBar', parts: 6, shaded: 0 }] as Visual[]) {
      expect(renderToStaticMarkup(<VisualView visual={visual} interactive />)).toBe(renderToStaticMarkup(<VisualView visual={visual} />));
    }
  });
});

describe('BrickModel tap to count', () => {
  it('adding studs: every stud counts, onCount(1, 2)', () => {
    const onCount = vi.fn();
    const { container } = render(<BrickModel question={question('ARITHMETIC', 'ADD', rat(3), rat(2))} interactive onCount={onCount} />);
    const studs = screen.getAllByRole('button', { name: 'Count this stud' });
    expect(studs).toHaveLength(5);
    fireEvent.click(studs[4]!);
    fireEvent.click(studs[0]!);
    fireEvent.click(studs[0]!);
    expect(onCount.mock.calls).toEqual([
      [1, '1'],
      [2, '2'],
    ]);
    expect(badges(container)).toEqual(['2', '', '', '', '1']);
  });

  it('taking away: only the studs that are left can be counted', () => {
    render(<BrickModel question={question('ARITHMETIC', 'SUBTRACT', rat(7), rat(3))} interactive />);
    expect(screen.getAllByRole('button', { name: 'Count this stud' })).toHaveLength(4);
  });

  it('multiplication array and division groups are tappable', () => {
    const times = render(<BrickModel question={question('ARITHMETIC', 'MULTIPLY', rat(3), rat(4))} interactive />);
    expect(within(times.container).getAllByRole('button', { name: 'Count this stud' })).toHaveLength(12);
    times.unmount();
    render(<BrickModel question={question('ARITHMETIC', 'DIVIDE', rat(12), rat(3))} interactive />);
    expect(screen.getAllByRole('button', { name: 'Count this stud' })).toHaveLength(12);
  });

  it('base-ten: a ten counts 10 and a one counts 1, with a running total', () => {
    const onCount = vi.fn();
    const { container } = render(<BrickModel question={question('ARITHMETIC', 'ADD', rat(23), rat(14))} interactive onCount={onCount} />);
    const tens = screen.getAllByRole('button', { name: 'Count this ten' });
    const ones = screen.getAllByRole('button', { name: 'Count this one' });
    expect(tens).toHaveLength(3);
    expect(ones).toHaveLength(7);
    fireEvent.click(tens[0]!);
    fireEvent.click(tens[2]!);
    fireEvent.click(ones[0]!);
    fireEvent.click(ones[0]!);
    expect(onCount.mock.calls).toEqual([
      [10, '10'],
      [20, '20'],
      [21, '21'],
    ]);
    expect(container.querySelector('.count-total')?.textContent).toBe('21');
    expect(screen.getByRole('button', { name: 'Counted one, 21' })).toBe(ones[0]);
  });

  it('base-ten take-away counts each number on its own', () => {
    const onCount = vi.fn();
    const { container } = render(<BrickModel question={question('ARITHMETIC', 'SUBTRACT', rat(45), rat(23))} interactive onCount={onCount} />);
    const tens = screen.getAllByRole('button', { name: 'Count this ten' });
    fireEvent.click(tens[0]!); // a ten of 45
    fireEvent.click(tens[4]!); // a ten of 23
    expect(onCount.mock.calls).toEqual([
      [10, '10'],
      [10, '10'],
    ]);
    expect(container.querySelectorAll('.count-total')).toHaveLength(2);
  });

  it('fraction bricks: shaded parts count', () => {
    const onCount = vi.fn();
    render(<BrickModel question={question('FRACTIONS', 'ADD', rat(1, 5), rat(2, 5))} interactive onCount={onCount} />);
    const parts = screen.getAllByRole('button', { name: 'Count this part' });
    expect(parts).toHaveLength(3);
    for (const p of parts) fireEvent.click(p);
    expect(onCount).toHaveBeenLastCalledWith(3, '3');
  });

  it('fraction bricks with many parts are widened for fingers (static drawing stays 320 wide)', () => {
    const q = question('FRACTIONS', 'ADD', rat(1, 12), rat(5, 12));
    const { container } = render(<BrickModel question={q} interactive />);
    const boxes = [...container.querySelectorAll<HTMLElement>('.count-fraction')];
    expect(boxes.map((b) => b.style.width)).toEqual([`${12 * 52 + 8}px`, `${12 * 52 + 8}px`]);
    expect(screen.getAllByRole('button', { name: 'Count this part' })).toHaveLength(6);
    expect(renderToStaticMarkup(<BrickModel question={q} />)).toContain('<svg viewBox="0 0 320 70" width="320" height="70" style="max-width:100%" aria-hidden="true">');
    // a few parts: unchanged 320
    cleanup();
    const few = render(<BrickModel question={question('FRACTIONS', 'ADD', rat(1, 5), rat(2, 5))} interactive />);
    expect([...few.container.querySelectorAll<HTMLElement>('.count-fraction')].map((b) => b.style.width)).toEqual(['320px', '320px']);
  });

  it('nothing to count (5 − 5, 0 + 0, 0 ÷ 3): the plain picture, with no 👆 hint', () => {
    for (const q of [question('ARITHMETIC', 'SUBTRACT', rat(5), rat(5)), question('ARITHMETIC', 'ADD', rat(0), rat(0)), question('ARITHMETIC', 'DIVIDE', rat(0), rat(3))]) {
      const markup = renderToStaticMarkup(<BrickModel question={q} interactive />);
      expect(markup).toBe(renderToStaticMarkup(<BrickModel question={q} />));
      expect(markup).not.toContain('count-hint');
      expect(markup).not.toContain('<button');
    }
    // one stud left is still worth counting
    render(<BrickModel question={question('ARITHMETIC', 'SUBTRACT', rat(5), rat(4))} interactive />);
    expect(screen.getAllByRole('button', { name: 'Count this stud' })).toHaveLength(1);
  });

  it('a new question starts a fresh count; non-interactive models have no buttons', () => {
    const { container, rerender } = render(<BrickModel question={question('ARITHMETIC', 'ADD', rat(3), rat(2))} interactive />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Count this stud' })[0]!);
    rerender(<BrickModel question={question('ARITHMETIC', 'ADD', rat(4), rat(2))} interactive />);
    expect(badges(container)).toEqual(['', '', '', '', '', '']);

    for (const q of [question('ARITHMETIC', 'ADD', rat(3), rat(2)), question('ARITHMETIC', 'ADD', rat(23), rat(14)), question('FRACTIONS', 'ADD', rat(1, 5), rat(2, 5))]) {
      expect(renderToStaticMarkup(<BrickModel question={q} />)).not.toContain('<button');
    }
  });

  it('non-interactive brick models render exactly as before (worksheets and print)', () => {
    const model = (q: Question) => renderToStaticMarkup(<BrickModel question={q} />);
    const row = (studs: string) => `<div style="display:flex;gap:5px;flex-wrap:wrap;max-width:300px">${studs}</div>`;
    const kept = (color: string, opacity: string) => `<span style="opacity:${opacity}">${STUD(color)}</span>`;

    expect(model(question('ARITHMETIC', 'ADD', rat(3), rat(2)))).toBe(
      `<div class="model" aria-label="3 studs and 2 studs"><div style="display:grid;gap:10px">${row(kept(RED, '1').repeat(3))}${row(STUD(BLUE).repeat(2))}</div></div>`,
    );
    expect(model(question('ARITHMETIC', 'SUBTRACT', rat(5), rat(2)))).toBe(
      `<div class="model" aria-label="5 studs take away 2 studs"><div style="display:grid;gap:10px">${row(kept(RED, '1').repeat(3) + kept(RED, '0.25').repeat(2))}</div></div>`,
    );
    expect(model(question('ARITHMETIC', 'MULTIPLY', rat(2), rat(3)))).toBe(
      `<div class="model" aria-label="2 rows of 3 studs"><div style="display:grid;grid-template-columns:repeat(3, 22px);gap:5px">${STUD(RED).repeat(3)}${STUD(BLUE).repeat(3)}</div></div>`,
    );
    const group = (color: string) => `<div style="display:grid;grid-template-columns:repeat(3, 22px);gap:4px;padding:8px;border-radius:10px;background:var(--tile-2)">${STUD(color).repeat(3)}</div>`;
    expect(model(question('ARITHMETIC', 'DIVIDE', rat(6), rat(2)))).toBe(
      `<div class="model" aria-label="6 studs shared into 2 groups"><div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">${group(RED)}${group(BLUE)}</div></div>`,
    );

    const dot = '<span style="border-radius:50%;background:rgba(255,255,255,.35)"></span>';
    const ten = (c: string) =>
      `<div title="ten" style="width:16px;height:70px;border-radius:4px;background:${c};display:grid;grid-template-rows:repeat(10, 1fr);gap:1px;padding:2px;box-shadow:inset -3px 0 0 rgba(0,0,0,.25)">${dot.repeat(10)}</div>`;
    const one = (c: string) => `<span title="one" style="width:16px;height:16px;border-radius:4px;background:${c};box-shadow:inset 0 -2px 0 rgba(0,0,0,.25)"></span>`;
    const number = (tens: number, ones: number, c: string) =>
      `<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;justify-content:center">${ten(c).repeat(tens)}<div style="display:grid;grid-template-columns:repeat(5, 16px);gap:3px">${one(c).repeat(ones)}</div></div>`;
    expect(model(question('ARITHMETIC', 'ADD', rat(23), rat(14)))).toBe(
      `<div class="model" style="flex-direction:column;align-items:center;gap:12px" aria-label="Base-ten bricks">${number(2, 3, RED)}<strong style="font-size:1.6rem">+</strong>${number(1, 4, BLUE)}</div>`,
    );
    const hundreds = model(question('ARITHMETIC', 'SUBTRACT', rat(112), rat(21)));
    expect(hundreds).toContain(`<div title="hundred" style="width:70px;height:70px;border-radius:6px;background:${RED};display:grid;grid-template-columns:repeat(10, 1fr);gap:1px;padding:3px;box-shadow:inset 0 -4px 0 rgba(0,0,0,.25)">${dot.repeat(100)}</div>`);
    expect(hundreds).toContain('<strong style="font-size:1.6rem">−</strong>');

    const fractions = model(question('FRACTIONS', 'ADD', rat(1, 3), rat(2, 3)));
    expect(fractions.startsWith('<div class="model" style="flex-direction:column;align-items:center" aria-label="Fraction bricks"><svg viewBox="0 0 320 70" width="320" height="70" style="max-width:100%" aria-hidden="true">')).toBe(true);
    expect(fractions.split('<svg ').length - 1).toBe(2);
    expect([fractions.length, digest(fractions)]).toEqual([3835, 'b1e41c493b07ad75']);
  });
});
