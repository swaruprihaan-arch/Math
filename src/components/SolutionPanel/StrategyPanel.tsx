import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { nodesToSpeech } from '../../domain/answer/format';
import { speak } from '../../ui/speech';
import { allStrategies, strategyTitle } from '../../domain/question/build';
import type { Question, SolutionStep } from '../../domain/question/types';
import { blankedContent, findStepTarget, saltFor } from '../../solutions/guided';
import { MathView } from '../QuestionCard/MathView';
import { BrickModel } from './BrickModel';
import { bringIntoView, GuidedStep, takeOverFocus, type GuidedSound } from './GuidedStep';
import '../../styles/guided.css';

const TAB_COLORS = ['yellow', 'azure', 'lime', 'orange', 'purple'];
const STEP_COLORS = ['#d01012', '#0057a6', '#00852b', '#fe8a18', '#7f3f98', '#36aebf'];
const BURST = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * A revealed step. With read-aloud on, the text itself is the button that reads it again. The button is named by its
 * content ("Hear step 2: Ones: 7 + 8 = 15 …"), so screen-reader users hear the step, not just "Hear step 2".
 */
function StepText({ step, number, speakable, voiceRate }: { step: SolutionStep; number: number; speakable: boolean; voiceRate: number }) {
  const math = <MathView nodes={step.content} size="small" />;
  if (!speakable) return <div className="step-body">{math}</div>;
  return (
    <button type="button" className="step-hear" onClick={() => speak(nodesToSpeech(step.content), voiceRate)}>
      <span className="sr-only">{`Hear step ${number}: `}</span>
      {math}
    </button>
  );
}

export function StrategyPanel({
  question,
  showModels,
  onClose,
  rainbow,
  speakSteps = false,
  autoSpeak = false,
  voiceRate = 0.95,
  iconOnly = false,
  guided = false,
  hiddenStrategies = [],
  onSound,
}: {
  question: Question;
  showModels: boolean;
  onClose: () => void;
  rainbow: boolean;
  speakSteps?: boolean;
  autoSpeak?: boolean;
  voiceRate?: number;
  iconOnly?: boolean;
  /** Guided mode: the child fills each step by tapping the right brick. */
  guided?: boolean;
  /** Strategy ids the parent turned off. If every strategy is hidden, all are shown. */
  hiddenStrategies?: readonly string[];
  /** Sound hook for interactions. */
  onSound?: (effect: GuidedSound) => void;
}) {
  const everyTree = allStrategies(question);
  const visibleTrees = everyTree.filter((t) => !hiddenStrategies.includes(t.strategy));
  const trees = visibleTrees.length > 0 ? visibleTrees : everyTree;
  const model = showModels ? <BrickModel question={question} /> : null;
  const tabs = [...trees.map((t, i) => ({ key: t.strategy, title: `${i + 1} · ${strategyTitle(t)}` })), ...(model ? [{ key: '__bricks', title: '🧱 Bricks' }] : [])];
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(1);
  /** Guided mode only: ⏩ was pressed, so every step is shown without the game. */
  const [showAll, setShowAll] = useState(false);
  /** Guided mode only: the last step of this strategy is done. */
  const [finished, setFinished] = useState(false);
  /** The child has done something in this panel (so new steps may scroll into view and take over keyboard focus). */
  const [engaged, setEngaged] = useState(false);
  /** Guided mode: the one screen-reader live region of the game (it stays in the DOM so every update is announced). */
  const [live, setLive] = useState('');
  const nextRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const anotherRef = useRef<HTMLButtonElement>(null);

  /** Set the live text; the same message twice gets an invisible change so it is announced again. */
  const announce = (text: string) => setLive((prev) => (prev === text ? `${text}\u00a0` : text));

  const openTab = (i: number, byChild = true) => {
    setActive(i);
    setShown(1);
    setShowAll(false);
    setFinished(false);
    setEngaged(byChild);
    setLive('');
  };

  useEffect(() => {
    openTab(0, false);
  }, [question.id]);

  const activeTab = Math.min(active, Math.max(0, tabs.length - 1));
  const tree = tabs[activeTab]?.key === '__bricks' ? undefined : trees[activeTab];
  const steps = useMemo(() => tree?.steps ?? [], [tree]);
  const targets = useMemo(() => steps.map((s) => findStepTarget(s)), [steps]);
  const playing = guided && !showAll;
  const current = shown - 1;
  const currentTarget = playing && !finished ? (targets[current] ?? null) : null;

  // Children who can't read yet hear each new step as it appears (in the game, with the hidden number as "what").
  useEffect(() => {
    if (!autoSpeak) return;
    const stepNow = steps[shown - 1];
    if (!stepNow) return;
    speak(nodesToSpeech(currentTarget ? blankedContent(currentTarget) : stepNow.content), voiceRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, active, autoSpeak, question.id]);

  /** Next step, or the end of the strategy (🎉). */
  const advance = (fromTap: boolean) => {
    setEngaged(true);
    if (shown < steps.length) {
      if (fromTap) onSound?.('tap');
      const next = steps[shown];
      const nextTarget = targets[shown];
      if (next) announce(`Step ${shown + 1}: ${nodesToSpeech(nextTarget ? blankedContent(nextTarget) : next.content)}`);
      setShown(shown + 1);
    } else {
      setFinished(true);
      announce('You did it!');
      onSound?.('celebrate');
      if (autoSpeak) speak('You did it!', voiceRate);
    }
  };

  // ▶ moves down as steps are added, and the 🎉 banner appears at the bottom: keep them on screen, and give keyboard
  // focus to them when the control that had it (a brick of the solved step, or ▶ itself) went away.
  useEffect(() => {
    if (!engaged || !playing) return;
    if (finished) {
      bringIntoView(doneRef.current);
      takeOverFocus(anotherRef.current ?? doneRef.current);
    } else if (!currentTarget) {
      bringIntoView(nextRef.current);
      takeOverFocus(nextRef.current);
    }
  }, [engaged, playing, finished, shown, currentTarget, tree]);

  const showEverything = () => {
    setShown(steps.length);
    setShowAll(true);
  };

  const hasAnotherWay = trees.length > 1;
  const anotherWay = (
    <button
      ref={anotherRef}
      type="button"
      className={`brick blue${playing ? ' big' : ''}`}
      onClick={() => openTab(playing ? (activeTab + 1) % trees.length : activeTab + 1)}
      {...(iconOnly ? { 'aria-label': 'Another way' } : {})}
    >
      {iconOnly ? (playing ? '🔄' : '🔄 ➜') : 'Another way ➜'}
    </button>
  );

  return (
    <section className="tile studded" aria-label="Ways to solve">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>💡 Ways to solve</h2>
        <button type="button" className="brick small ghost strategy-close" onClick={onClose} aria-label="Close ways to solve">
          ✕
        </button>
      </div>
      <div className="strategy-tabs" role="tablist" aria-label="Strategies">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === i}
            className={`brick small ${rainbow ? TAB_COLORS[i % TAB_COLORS.length] : i === activeTab ? '' : 'ghost'}`}
            onClick={() => openTab(i)}
          >
            {t.title}
          </button>
        ))}
      </div>
      {tabs[activeTab]?.key === '__bricks' ? (
        model
      ) : (
        <>
          <ol className={`steps${playing ? ' guided-steps' : ''}`} {...(playing ? {} : { 'aria-live': 'polite' as const })}>
            {steps.slice(0, shown).map((s, i) => {
              const stud = (
                <span className="stud-num" style={{ background: STEP_COLORS[i % STEP_COLORS.length] }} aria-hidden="true">
                  {i + 1}
                </span>
              );
              const target = targets[i];
              if (playing && !finished && i === current && target) {
                return (
                  <li key={`${question.id}|${tree?.strategy}|${i}`} className="step guided-current">
                    {stud}
                    <GuidedStep
                      target={target}
                      salt={saltFor(question.id, tree?.strategy ?? '', i)}
                      stepNumber={i + 1}
                      onDone={() => advance(false)}
                      onSound={onSound}
                      onAnnounce={announce}
                      reveal={engaged}
                      {...(speakSteps ? { onHear: () => speak(nodesToSpeech(blankedContent(target)), voiceRate) } : {})}
                    />
                  </li>
                );
              }
              return (
                <li key={`${question.id}|${tree?.strategy}|${i}`} className={`step${playing && !finished && i === current ? ' guided-current' : ''}`}>
                  {stud}
                  <StepText step={s} number={i + 1} speakable={speakSteps} voiceRate={voiceRate} />
                </li>
              );
            })}
          </ol>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {playing ? live : ''}
          </p>
          {playing ? (
            finished ? (
              <div ref={doneRef} className="guided-done" tabIndex={-1}>
                <span className="guided-burst" aria-hidden="true">
                  {BURST.map((n) => (
                    <i key={n} style={{ '--i': n } as CSSProperties} />
                  ))}
                </span>
                <span className="guided-party" aria-hidden="true">
                  🎉
                </span>
                <span className={iconOnly ? 'sr-only' : 'guided-done-text'}>You did it!</span>
                {hasAnotherWay ? anotherWay : null}
              </div>
            ) : steps.length > 0 ? (
              <div className={`guided-controls${currentTarget ? ' with-game' : ''}`}>
                <div className="guided-main">
                  {currentTarget ? null : (
                    <button ref={nextRef} type="button" className="brick big green guided-next" onClick={() => advance(true)} aria-label="Next step">
                      ▶
                    </button>
                  )}
                </div>
                <button type="button" className="brick small ghost guided-skip" onClick={showEverything} aria-label="Show all steps">
                  ⏩
                </button>
              </div>
            ) : null
          ) : (
            <div className="step-controls">
              {shown < steps.length ? (
                <>
                  <button type="button" className="brick green" onClick={() => setShown((n) => n + 1)} aria-label="Next step">
                    {iconOnly ? '▶' : '▶ Next step'}
                  </button>
                  <button type="button" className="brick small ghost steps-skip" onClick={showEverything} aria-label="Show all steps">
                    ⏩
                  </button>
                </>
              ) : hasAnotherWay && activeTab < trees.length - 1 ? (
                anotherWay
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  );
}
