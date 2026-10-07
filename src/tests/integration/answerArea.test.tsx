// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnswerArea } from '../../components/AnswerInput/AnswerArea';
import { rawToParts, partsToRaw } from '../../components/AnswerInput/fractionText';
import { createSeededRandom } from '../../domain/random/random';
import { defaultArithmeticSettings, generateArithmetic } from '../../engines/arithmetic/arithmeticEngine';
import { defaultFractionSettings, generateFraction } from '../../engines/fractions/fractionEngine';

function Harness({ fraction, onSubmit }: { fraction: boolean; onSubmit: (raw?: string) => void }) {
  const question = fraction
    ? generateFraction({ ...defaultFractionSettings(), operations: ['ADD'] }, createSeededRandom('frac'))
    : generateArithmetic(defaultArithmeticSettings(), createSeededRandom('whole'));
  const [raw, setRaw] = useState('');
  return (
    <>
      <AnswerArea question={question} raw={raw} onChange={setRaw} onSubmit={onSubmit} locked={false} status="UNANSWERED" modes={['KEYPAD', 'TYPE']} defaultMode="KEYPAD" keypadStyle="TALLY" speakButtons={false} voiceRate={1} />
      <output data-testid="raw">{raw}</output>
    </>
  );
}

afterEach(cleanup);

describe('AnswerArea', () => {
  it('keypad builds the raw answer, ⌫ deletes, ✓ submits', () => {
    const submit = vi.fn();
    render(<Harness fraction={false} onSubmit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByTestId('raw').textContent).toBe('47');
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(submit).toHaveBeenCalled();
  });
  it('fraction boxes: tap a box, then digits fill it; raw keeps the space in mixed numbers', () => {
    render(<Harness fraction onSubmit={() => undefined} />);
    const keys = within(screen.getByRole('group', { name: 'Number keys' }));
    fireEvent.click(screen.getByRole('button', { name: /Whole number/ }));
    fireEvent.click(keys.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /Numerator/ }));
    fireEvent.click(keys.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: /Denominator/ }));
    fireEvent.click(keys.getByRole('button', { name: '1' }));
    fireEvent.click(keys.getByRole('button', { name: '2' }));
    expect(screen.getByTestId('raw').textContent).toBe('1 5/12');
  });
  it('tally keypad keeps numeric labels for screen readers and shows a live tally strip', () => {
    const { container } = render(<Harness fraction={false} onSubmit={() => undefined} />);
    const keys = within(screen.getByRole('group', { name: 'Number keys' }));
    expect(keys.getByRole('button', { name: '7' }).querySelector('svg.tally')).not.toBeNull();
    fireEvent.click(keys.getByRole('button', { name: '7' }));
    expect(container.querySelectorAll('.tally-strip svg .tally-stroke')).toHaveLength(7); // a bundle of five (4 + diagonal) and 2 singles
    expect(screen.getByRole('button', { name: 'Number pad' })).toBeInTheDocument();
  });

  it('a real keyboard types into the keypad (Mac / iPad keyboard)', () => {
    render(<Harness fraction={false} onSubmit={() => undefined} />);
    fireEvent.keyDown(document, { key: '1' });
    fireEvent.keyDown(document, { key: '2' });
    fireEvent.keyDown(document, { key: 'Backspace' });
    fireEvent.keyDown(document, { key: '5' });
    expect(screen.getByTestId('raw').textContent).toBe('15');
  });

  it('fraction text round trip', () => {
    for (const raw of ['3/4', '1 5/12', '-2 1/3', '7']) expect(partsToRaw(rawToParts(raw))).toBe(raw);
  });
});

describe('AnswerArea: all three ways to answer are always there', () => {
  function Three({ fraction, locked = false }: { fraction: boolean; locked?: boolean }) {
    const question = fraction
      ? generateFraction({ ...defaultFractionSettings(), operations: ['ADD'] }, createSeededRandom('frac3'))
      : generateArithmetic({ ...defaultArithmeticSettings(), enabledOperations: ['MULTIPLY'], operandRange: { min: 20, max: 99 }, secondOperandRange: { min: 20, max: 99 } }, createSeededRandom('big'));
    const [raw, setRaw] = useState('');
    return (
      <>
        <AnswerArea question={question} raw={raw} onChange={setRaw} onSubmit={() => undefined} locked={locked} status="UNANSWERED" modes={['KEYPAD', 'WRITE', 'TALLY']} defaultMode="KEYPAD" keypadStyle="TALLY" />
        <output data-testid="raw">{raw}</output>
      </>
    );
  }

  it('keypad, handwriting and tally buttons show for answers over 100', () => {
    render(<Three fraction={false} />);
    expect(screen.getByRole('button', { name: 'Number pad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write it' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tally marks' })).toBeInTheDocument();
  });

  it('keypad, handwriting and tally buttons show for fractions, and tally fills the selected box', () => {
    render(<Three fraction />);
    fireEvent.click(screen.getByRole('button', { name: 'Tally marks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tally mark 1' }));
    expect(rawToParts(screen.getByTestId('raw').textContent ?? '').numerator).toBe('1');
  });

  it('the buttons stay on screen (disabled) after the answer is locked', () => {
    render(<Three fraction={false} locked />);
    expect(screen.getByRole('button', { name: 'Tally marks' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Write it' })).toBeDisabled();
  });
});
