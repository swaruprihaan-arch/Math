import { useRef } from 'react';
import type { KeypadLayout, KeypadStyle } from '../../state/settings';
import type { KeyDef } from './keys';
import { TallyMarks } from './TallyMarks';

const DIGIT_COLORS = ['red', 'yellow', 'blue', 'green', 'orange', 'purple', 'azure', 'lime', 'red', 'blue'];

/** Restart a short "boing" animation on the pressed key (works for quick taps where :active is too brief to see). */
function boing(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove('boing');
  void el.offsetWidth; // reflow so the animation can restart
  el.classList.add('boing');
}

function KeyFace({ digit, style }: { digit: number; style: KeypadStyle }) {
  if (style === 'NUMBERS' || digit === 0) return <span className="key-numeral">{digit}</span>;
  if (style === 'BOTH') {
    return (
      <span className="key-both">
        <span className="key-numeral">{digit}</span>
        <TallyMarks count={digit} height={14} color="currentColor" />
      </span>
    );
  }
  return (
    <span className="key-tally">
      <TallyMarks count={digit} height={26} color="currentColor" />
      <span className="key-badge">{digit}</span>
    </span>
  );
}

/** Digit rows, top to bottom. Phone: 1-2-3 on top (easiest for children). Calculator: 7-8-9 on top. */
export const KEYPAD_ROWS: Record<KeypadLayout, readonly (readonly [number, number, number])[]> = {
  PHONE: [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ],
  CALCULATOR: [
    [7, 8, 9],
    [4, 5, 6],
    [1, 2, 3],
  ],
};

/**
 * Brick keypad: three rows of digits (phone or calculator order), a wide 0, and a side column with ⌫, 🧽 and a tall ✓
 * to check. Digit keys can show tally marks so children see "how many" each number means. Extra keys (., /, :, −, …)
 * sit underneath.
 */
export function Keypad({
  extra,
  onKey,
  onEnter,
  disabled,
  keypadStyle,
  hasInput,
  layout = 'PHONE',
}: {
  extra: KeyDef[];
  onKey: (value: string) => void;
  onEnter: () => void;
  disabled?: boolean;
  keypadStyle: KeypadStyle;
  hasInput: boolean;
  layout?: KeypadLayout;
}) {
  const rows = KEYPAD_ROWS[layout] ?? KEYPAD_ROWS.PHONE;
  const ref = useRef<HTMLDivElement | null>(null);
  const press = (e: React.MouseEvent<HTMLButtonElement>, value: string) => {
    boing(e.currentTarget);
    onKey(value);
  };
  const digit = (d: number, className = '') => (
    <button key={d} type="button" className={`brick key ${DIGIT_COLORS[d]} ${className}`} onClick={(e) => press(e, String(d))} disabled={disabled} aria-label={String(d)}>
      <KeyFace digit={d} style={keypadStyle} />
    </button>
  );
  return (
    <div ref={ref}>
      <div className={`keypad style-${keypadStyle.toLowerCase()} layout-${layout.toLowerCase()}`} role="group" aria-label="Number keys">
        {rows[0]?.map((d) => digit(d))}
        <button type="button" className="brick key ghost" onClick={(e) => press(e, 'BACKSPACE')} disabled={disabled} aria-label="Delete">
          ⌫
        </button>
        {rows[1]?.map((d) => digit(d))}
        <button type="button" className="brick key ghost" onClick={(e) => press(e, 'CLEAR')} disabled={disabled} aria-label="Clear">
          🧽
        </button>
        {rows[2]?.map((d) => digit(d))}
        <button type="button" className={`brick key green enter${hasInput && !disabled ? ' ready' : ''}`} onClick={onEnter} disabled={disabled} aria-label="Check answer">
          ✓
        </button>
        {digit(0, 'zero')}
      </div>
      {extra.length ? (
        <div className="keypad-extra" role="group" aria-label="Symbol keys">
          {extra.map((k) => (
            <button key={k.label} type="button" className="brick key white" onClick={(e) => press(e, k.value)} disabled={disabled} aria-label={k.aria}>
              {k.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
