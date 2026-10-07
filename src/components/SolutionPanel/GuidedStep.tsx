import { useEffect, useMemo, useRef, useState } from 'react';
import { nodesToSpeech } from '../../domain/answer/format';
import { eq, type Rational } from '../../domain/rational/rational';
import { blankedContent, makeStepChoices, targetNumberNode, visibleAfter, type StepTarget } from '../../solutions/guided';
import { MathView } from '../QuestionCard/MathView';

export type GuidedSound = 'snap' | 'wrong' | 'tap' | 'correct' | 'celebrate';

/** How long the filled-in box shows before the next step appears. */
export const GUIDED_DONE_DELAY_MS = 450;

const CHOICE_COLORS = ['yellow', 'azure', 'orange'] as const;

/** Motion is skipped when the parent turned animations off or the device asks for less motion. */
function prefersStillness(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.body.classList.contains('no-anim')) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scroll something that just appeared into view, only as far as needed (new steps push the game down the page). */
export function bringIntoView(el: Element | null): void {
  if (!el || typeof el.scrollIntoView !== 'function') return;
  el.scrollIntoView({ block: 'nearest', behavior: prefersStillness() ? 'auto' : 'smooth' });
}

/**
 * Give keyboard focus to `el` when the control that had it just went away (focus fell back to <body>), so keyboard,
 * switch and VoiceOver users stay in the game. Never takes focus from anything else.
 */
export function takeOverFocus(el: HTMLElement | null): void {
  if (!el || typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active && active !== document.body) return;
  el.focus({ preventScroll: true });
}

export interface GuidedStepProps {
  target: StepTarget;
  /** Varies the order of the answer bricks between steps (deterministic). */
  salt: number;
  /** 1-based step number, for labels. */
  stepNumber: number;
  /** Called once, a moment after the right brick is tapped. */
  onDone: () => void;
  onSound?: (effect: GuidedSound) => void;
  /** When given, the step text becomes a button that reads the step aloud. */
  onHear?: () => void;
  /** Short messages for screen readers ("Try again", "Correct!"), shown in the panel's live region. */
  onAnnounce?: (text: string) => void;
  /** The step appeared because of something the child did: scroll it into view and keep keyboard focus in the game. */
  reveal?: boolean;
}

/** One solution step played as a game: the number is hidden in a box and the child taps the right brick. */
export function GuidedStep({ target, salt, stepNumber, onDone, onSound, onHear, onAnnounce, reveal = false }: GuidedStepProps) {
  const choices = useMemo(() => makeStepChoices(target, salt), [target, salt]);
  const [wrong, setWrong] = useState<readonly number[]>([]);
  const [solved, setSolved] = useState(false);
  const doneRef = useRef(onDone);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  // A new step is pushed below the ones already solved: bring it on screen and keep focus in the game.
  useEffect(() => {
    if (!reveal) return;
    bringIntoView(rootRef.current);
    takeOverFocus(firstChoiceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (index: number) => {
    const value = choices[index];
    if (solved || !value || wrong.includes(index)) return;
    if (eq(value, target.value)) {
      setSolved(true);
      onAnnounce?.('Correct!');
      onSound?.('snap');
      timer.current = setTimeout(() => {
        timer.current = null;
        doneRef.current();
      }, GUIDED_DONE_DELAY_MS);
    } else {
      setWrong((w) => [...w, index]);
      // Alternate the text so a second "try again" is announced too.
      onAnnounce?.(wrong.length % 2 === 0 ? 'Try again' : 'Try again!');
      onSound?.('wrong');
    }
  };

  const after = visibleAfter(target, solved);
  const spoken = nodesToSpeech(solved ? [...target.before, targetNumberNode(target, target.value), ...after] : blankedContent(target));
  const line = (
    <>
      <MathView nodes={target.before} size="small" label="" />
      <span className={`guided-box${solved ? ' filled' : ''}`} aria-hidden="true">
        {solved ? <MathView nodes={[targetNumberNode(target, target.value)]} size="small" label="" /> : <span className="guided-q">?</span>}
      </span>
      <MathView nodes={after} size="small" label="" />
    </>
  );

  return (
    <div ref={rootRef} className={`guided${solved ? ' solved' : ''}`}>
      {onHear ? (
        <button type="button" className="guided-line step-hear" onClick={onHear}>
          <span className="sr-only">{`Hear step ${stepNumber}: `}</span>
          {line}
          <span className="sr-only">{spoken}</span>
        </button>
      ) : (
        <div className="guided-line">
          <span className="sr-only">{`Step ${stepNumber}: `}</span>
          {line}
          <span className="sr-only">{spoken}</span>
        </div>
      )}
      <div className="guided-choices" role="group" aria-label={`Pick the missing number for step ${stepNumber}`}>
        {choices.map((value: Rational, i) => {
          const isWrong = wrong.includes(i);
          const isRight = solved && eq(value, target.value);
          return (
            <button
              key={`${value.numerator}/${value.denominator}`}
              ref={i === 0 ? firstChoiceRef : undefined}
              type="button"
              className={`brick big guided-choice ${CHOICE_COLORS[i % CHOICE_COLORS.length]}${isWrong ? ' is-wrong' : ''}${isRight ? ' is-right' : ''}`}
              // Spoken the same way as the step ("3 over 4", "negative 7"), not "3/4".
              aria-label={`Answer ${nodesToSpeech([targetNumberNode(target, value)])}`}
              // aria-disabled (not disabled) so a used brick keeps keyboard focus instead of dropping it to <body>.
              aria-disabled={isWrong || solved ? true : undefined}
              onClick={() => pick(i)}
            >
              <MathView nodes={[targetNumberNode(target, value)]} size="small" label="" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
