import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import type { Question } from '../../domain/question/types';
import type { InputMode, KeypadLayout, KeypadStyle } from '../../state/settings';
import { speak } from '../../ui/speech';
import { HandwritingPad } from './HandwritingPad';
import { TallyPad } from './TallyPad';
import { Keypad } from './Keypad';
import { extraKeys, symbolsForHandwriting } from './keys';
import { EMPTY_PARTS, partsToRaw, rawToParts, type FractionParts } from './fractionText';
import { TallyIcon, TallyMarks } from './TallyMarks';

type Target = 'whole' | 'numerator' | 'denominator';

const MODE_INFO: Record<InputMode, { label: string; color: string }> = {
  KEYPAD: { label: 'Number pad', color: 'blue' },
  WRITE: { label: 'Write it', color: 'orange' },
  TALLY: { label: 'Tally marks', color: 'green' },
  TYPE: { label: 'Type it', color: 'purple' },
};

/** Little 3×3 brick keypad icon for the number-pad mode button. */
function KeypadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={1 + c * 8.5} y={1 + r * 8.5} width="7" height="7" rx="2" fill="#ffffff" />))}
    </svg>
  );
}

/** Tally marks only make sense for whole-number answers that are not too big. */
function tallyFits(question: Question): boolean {
  const s = question.answerSchema;
  if (s.widget !== 'TEXT' || !s.accepts.includes('INTEGER')) return false;
  if (s.accepts.some((k) => k !== 'INTEGER' && k !== 'DECIMAL')) return false;
  const a = question.canonicalAnswer;
  return a.type === 'NUMBER' && a.value.denominator === 1n && a.value.numerator >= 0n && a.value.numerator <= 100n;
}

const CHOICE_WORDS: Record<string, string> = { '<': 'less than', '>': 'greater than', '=': 'equal to', '≤': 'less than or equal to', '≥': 'greater than or equal to' };

interface Props {
  question: Question;
  raw: string;
  onChange: (raw: string) => void;
  onSubmit: (raw?: string) => void;
  locked: boolean;
  status: 'UNANSWERED' | 'INVALID_INPUT' | 'CORRECT' | 'INCORRECT';
  modes: readonly InputMode[];
  defaultMode: InputMode;
  keypadStyle: KeypadStyle;
  keypadLayout?: KeypadLayout;
  /** Handwriting: pause before ink becomes numbers (ms). */
  writeDelayMs?: number;
  /** Shown above the input (e.g. the + − × ÷ buttons), only with the number pad. */
  keypadTop?: ReactNode;
  /** Kept for compatibility: choices are now read with the question, so these are not used here. */
  speakButtons?: boolean;
  voiceRate?: number;
  onTap?: () => void;
  onModeChange?: (mode: InputMode) => void;
}

/** Is focus somewhere that already handles typing? */
function typingTarget(): boolean {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
}

export function AnswerArea({ question, raw, onChange, onSubmit, locked, status, modes: allowedModes, defaultMode, keypadStyle, keypadLayout = 'PHONE', writeDelayMs, keypadTop, speakButtons = false, voiceRate = 0.95, onTap, onModeChange }: Props) {
  // Tally mode is offered only for whole-number answers up to 100.
  const tallyOk = tallyFits(question);
  const modes = useMemo(() => {
    const m = allowedModes.filter((x) => x !== 'TALLY' || tallyOk);
    return m.length > 0 ? m : (['KEYPAD'] as InputMode[]);
  }, [allowedModes, tallyOk]);
  const [mode, setMode] = useState<InputMode>(defaultMode);
  const rowRef = useRef<HTMLDivElement | null>(null);
  // Latest answer for appending Scribble conversions (callbacks can fire after a re-render).
  const rawRef = useRef(raw);
  rawRef.current = raw;
  const [target, setTarget] = useState<Target>('numerator');
  const textRef = useRef<HTMLInputElement | null>(null);
  const widget = question.answerSchema.widget;
  const fraction = widget === 'FRACTION';
  const extra = useMemo(() => extraKeys(question, fraction), [question, fraction]);
  const parts = fraction ? rawToParts(raw) : EMPTY_PARTS;

  useEffect(() => {
    setTarget('numerator');
  }, [question.id]);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  useEffect(() => {
    if (!modes.includes(mode)) setMode(modes.includes(defaultMode) ? defaultMode : (modes[0] ?? 'KEYPAD'));
  }, [modes, mode, defaultMode]);

  useEffect(() => {
    if (mode === 'TYPE' && !fraction && widget === 'TEXT') textRef.current?.focus();
  }, [mode, question.id, fraction, widget]);

  const stateClass = status === 'CORRECT' ? 'state-correct' : status === 'INCORRECT' ? 'state-incorrect' : status === 'INVALID_INPUT' ? 'state-invalid' : '';

  const setParts = useCallback((p: FractionParts) => onChange(partsToRaw(p)), [onChange]);

  const applyKey = useCallback(
    (value: string) => {
      if (locked) return;
      onTap?.();
      if (fraction) {
        if (value === 'CLEAR') return setParts(EMPTY_PARTS);
        if (value === '-') return setParts({ ...parts, negative: !parts.negative });
        const current = parts[target];
        if (value === 'BACKSPACE') return setParts({ ...parts, [target]: current.slice(0, -1) });
        if (/^\d$/.test(value) && current.length < 6) return setParts({ ...parts, [target]: current + value });
        return;
      }
      if (value === 'CLEAR') return onChange('');
      if (value === 'BACKSPACE') {
        const trimmed = raw.replace(/( x 10\^| x | R | \+ | AM| PM)$/, '');
        return onChange(trimmed.length < raw.length ? trimmed : raw.slice(0, -1));
      }
      if (value === '-' && raw === '') return onChange('-');
      if (raw.length < 24) onChange(raw + value);
    },
    [locked, onTap, fraction, parts, target, raw, onChange, setParts],
  );

  // A real keyboard (Mac, iPad keyboard) can type straight into the brick keypad / writing modes.
  useEffect(() => {
    if (mode === 'TYPE' || widget === 'CHOICE') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingTarget()) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        applyKey(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        applyKey('BACKSPACE');
      } else if (e.key === 'Escape') {
        applyKey('CLEAR');
      } else if (fraction && (e.key === '/' || e.key === 'ArrowDown')) {
        e.preventDefault();
        setTarget('denominator');
      } else if (fraction && e.key === 'ArrowUp') {
        e.preventDefault();
        setTarget('numerator');
      } else if (fraction && (e.key === ' ' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        setTarget(e.key === ' ' && target === 'whole' ? 'numerator' : 'whole');
      } else if (fraction && e.key === 'ArrowRight') {
        e.preventDefault();
        setTarget('numerator');
      } else if (fraction && e.key === '-') {
        applyKey('-');
      } else if (!fraction) {
        const k = extra.find((x) => x.value.trim() === e.key || x.value === e.key || (e.key.toLowerCase() === 'r' && x.label === 'R'));
        if (k) {
          e.preventDefault();
          applyKey(k.value);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, widget, fraction, applyKey, extra, target]);

  if (widget === 'CHOICE') {
    const choices = question.answerSchema.choices ?? [];
    const colors = ['red', 'blue', 'green', 'orange', 'purple', 'azure'];
    return (
      <div>
        {/* Choices are read aloud together with the question (questionToSpeech), so there is no separate 🔊 here. */}
        <div className="choices" role="group" aria-label="Answer choices">
          {choices.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`brick big ${colors[i % colors.length]}`}
              aria-pressed={raw === c.id}
              aria-label={CHOICE_WORDS[c.label] ? `${c.label} (${CHOICE_WORDS[c.label]})` : c.label}
              disabled={locked}
              onClick={() => {
                onChange(c.id);
                onSubmit(c.id);
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const modeSwitch =
    modes.length > 1 && !locked ? (
      <div className="mode-switch" role="group" aria-label="How to answer">
        {modes.map((m) => (
          <button key={m} type="button" className={`brick mode-btn ${MODE_INFO[m].color}`} aria-pressed={mode === m} onClick={() => setMode(m)} title={MODE_INFO[m].label} aria-label={MODE_INFO[m].label}>
            {m === 'KEYPAD' ? <KeypadIcon /> : m === 'TALLY' ? <TallyIcon /> : <span className="icon">{m === 'WRITE' ? '✍️' : '⌨️'}</span>}
          </button>
        ))}
      </div>
    ) : null;

  const symbols = symbolsForHandwriting(question);

  let display: JSX.Element;
  if (fraction) {
    const box = (t: Target, label: string, cls = '') =>
      mode === 'TYPE' ? (
        <input
          className={`fbox ${cls}`}
          inputMode="numeric"
          aria-label={label}
          value={parts[t]}
          disabled={locked}
          onFocus={() => setTarget(t)}
          onChange={(e) => setParts({ ...parts, [t]: e.target.value.replace(/[^\d]/g, '').slice(0, 6) })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
            if (e.key === '-') {
              e.preventDefault();
              setParts({ ...parts, negative: !parts.negative });
            }
          }}
        />
      ) : (
        <button type="button" className={`fbox ${cls}`} aria-pressed={target === t} aria-label={`${label}: ${parts[t] || 'empty'}`} onClick={() => setTarget(t)} disabled={locked}>
          {parts[t] || ' '}
        </button>
      );
    display = (
      <div className={`answer-box fraction ${stateClass}`} style={{ flexWrap: 'wrap', gap: 12 }} aria-live="polite">
        <div className="fraction-boxes">
          {parts.negative ? <span style={{ fontSize: '2rem' }}>−</span> : null}
          <div className="stack">
            <span className="fbox-label">whole</span>
            {box('whole', 'Whole number', 'whole')}
          </div>
          <div className="stack">
            {box('numerator', 'Numerator (top)')}
            <span className="bar" aria-hidden="true" />
            {box('denominator', 'Denominator (bottom)')}
          </div>
        </div>
      </div>
    );
  } else if (mode === 'TYPE') {
    display = (
      <input
        ref={textRef}
        className={`answer-box ${stateClass}`}
        value={raw}
        disabled={locked}
        aria-label="Your answer"
        inputMode={question.answerSchema.accepts.some((k) => ['EXPRESSION', 'TIME', 'ORDERED_PAIR', 'SCIENTIFIC', 'FACTORIZATION', 'QUOTIENT_REMAINDER', 'RATIO'].includes(k)) ? 'text' : 'decimal'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
      />
    );
  } else {
    display = (
      <div className={`answer-box ${raw ? '' : 'placeholder'} ${stateClass}`} role="status" aria-live="polite" aria-label={`Your answer: ${raw || 'empty'}`}>
        {raw ? (
          <span className="digit-tiles" aria-hidden="true">
            {[...raw.replace(/-/g, '−')].map((ch, i) => (
              <span key={`${i}-${ch}`} className={`digit-tile${ch === ' ' ? ' space' : ''}`}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </span>
        ) : (
          '?'
        )}
        {!locked && (mode === 'KEYPAD' || mode === 'WRITE') ? <span className="caret" aria-hidden="true" /> : null}
      </div>
    );
  }

  // Live tally strip: shows how many the typed whole number means (1–30).
  const typedWhole = !fraction && /^\d{1,2}$/.test(raw) ? Number(raw) : 0;
  const showTally = keypadStyle !== 'NUMBERS' && typedWhole > 0 && typedWhole <= 30;

  const writeTargetLabel = fraction ? (target === 'whole' ? 'Write the whole number' : target === 'numerator' ? 'Write the top number' : 'Write the bottom number') : 'Write your answer here';

  return (
    <div className="answer-area">
      <div className="answer-row" ref={rowRef}>
        {display}
      </div>
      <div className="tally-strip" aria-hidden="true">
        {showTally ? <TallyMarks key={typedWhole} count={typedWhole} height={30} animate /> : null}
      </div>
      {modeSwitch}
      {mode === 'KEYPAD' ? keypadTop : null}
      {mode === 'KEYPAD' ? <Keypad extra={extra} onKey={applyKey} onEnter={() => onSubmit()} disabled={locked} keypadStyle={keypadStyle} layout={keypadLayout} hasInput={raw.trim() !== ''} /> : null}
      {mode === 'TALLY' && tallyOk ? (
        <TallyPad
          value={/^\d+$/.test(raw) ? Number(raw) : 0}
          onChange={(n) => onChange(n > 0 ? String(n) : '')}
          disabled={locked}
          resetKey={question.id}
          onTap={onTap}
          voiceCount={speakButtons ? (n) => speak(String(n), voiceRate) : undefined}
        />
      ) : null}
      {mode === 'WRITE' ? (
        <>
          <HandwritingPad
            label={writeTargetLabel}
            delayMs={writeDelayMs}
            symbols={fraction ? (target === 'numerator' || target === 'whole' ? (symbols.includes('-') ? '-' : '') : '') : symbols}
            resetKey={`${question.id}-${fraction ? target : 'text'}`}
            disabled={locked}
            glideTarget={() => rowRef.current}
            onConvert={(text) => {
              // Scribble-style: each conversion is ADDED to the answer.
              const latest = rawRef.current;
              if (fraction) {
                const p = rawToParts(latest);
                const digits = text.replace(/[^\d]/g, '');
                onChange(partsToRaw({ ...p, [target]: (p[target] + digits).slice(0, 6), negative: text.startsWith('-') ? true : p.negative }));
              } else {
                onChange((latest + text).slice(0, 24));
              }
            }}
            onUndoConvert={(lastText) => {
              const latest = rawRef.current;
              if (fraction) {
                const p = rawToParts(latest);
                const digits = lastText.replace(/[^\d]/g, '');
                const cur = p[target];
                onChange(partsToRaw({ ...p, [target]: digits && cur.endsWith(digits) ? cur.slice(0, -digits.length) : cur.slice(0, -1) }));
              } else {
                onChange(lastText && latest.endsWith(lastText) ? latest.slice(0, -lastText.length) : latest.slice(0, -1));
              }
            }}
          />
          {fraction ? (
            <p className="hw-hint" aria-hidden="true">
              {target === 'whole' ? '✍️ whole' : target === 'numerator' ? '✍️ ⬆ top' : '✍️ ⬇ bottom'}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
