import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useApp } from '../../app/AppContext';
import { THEMES } from '../../app/theme';
import type { Session } from '../../app/useSession';
import { formatQuestionAnswer, nodesToSpeech, questionToSpeech } from '../../domain/answer/format';
import { loadPasscode } from '../../state/security';
import { readingSupport, WRITE_DELAY_MS } from '../../state/settings';
import { formatClock, remainingMs, timerSeverity } from '../../state/timerMachine';
import { play } from '../../ui/sound';
import { canSpeak, speak } from '../../ui/speech';
import { AnswerArea } from '../AnswerInput/AnswerArea';
import { MathView } from '../QuestionCard/MathView';
import { fillName, personalizeQuestion, pickCheer } from '../QuestionCard/personalize';
import { VisualView, type CountHandler } from '../QuestionCard/VisualView';
import { StrategyPanel } from '../SolutionPanel/StrategyPanel';
import { Buddy, type BuddyReaction } from './Buddy';
import { Celebration } from './Celebration';
import { Logo } from './Logo';
import { QuizDone } from './QuizDone';
import { FlyingBricks, restartAnimation, TowerMini, towerBrickColor, towerSlot, useFlyingBricks } from './Tower';
import '../../styles/kidfun.css';

/**
 * The child's screen: only the question and a spot for the answer (plus 💡 Ways after answering).
 * Everything else (what math, timer, quiz length, colours, reports…) lives behind the Parent passcode.
 * Lots to tap: the question (hear it again), pictures (count them), the buddy, the tower.
 */
/** How long the 🔊 badge shows after a tap on the question (matches the kf-hear-badge animation). */
const HEARD_MS = 1300;

const OP_SYMBOLS = { ADD: '+', SUBTRACT: '−', MULTIPLY: '×', DIVIDE: '÷' } as const;
const OP_NAMES = { ADD: 'Adding', SUBTRACT: 'Taking away', MULTIPLY: 'Times', DIVIDE: 'Sharing (divide)' } as const;

export function KidView({ session }: { session: Session }) {
  const { settings } = useApp();
  const { q, quiz, timer, now, startQuiz } = session;
  const { fun, child } = settings;
  const rainbow = !!THEMES[settings.look.theme]?.rainbow;
  const reading = readingSupport(settings);
  const question = q.question;
  const answered = q.submissionStatus === 'CORRECT' || q.submissionStatus === 'INCORRECT' || q.locked;
  const canShowWays = settings.session.strategies === 'ANYTIME' || answered;
  const quizMode = settings.session.mode === 'QUIZ';
  const quizRunning = quiz.status === 'IN_PROGRESS';
  const timeUp = timer.status === 'EXPIRED';
  const hasPasscode = useRef(loadPasscode() !== null);
  const [inputMode, setInputMode] = useState(settings.input.defaultMode);
  const speechOn = canSpeak();
  const canHear = speechOn && (reading.speakButtons || fun.readAloud);
  const nickname = child.nickname;
  const voiceRate = fun.voiceRate;

  const sfx = useCallback((effect: Parameters<typeof play>[0], scale = 1) => {
    if (fun.sounds) play(effect, fun.volume * scale);
  }, [fun.sounds, fun.volume]);

  // The question as shown (and spoken): the child's nickname goes into word problems when the parent wants it.
  const shown = useMemo(() => (question && child.nameInStories ? personalizeQuestion(question, nickname) : question), [question, child.nameInStories, nickname]);

  // Cheers: the parent's own cheers (with {name} filled in) replace the built-in praise.
  const tapCheers = useMemo(() => fun.cheers.map((c) => fillName(c, nickname)), [fun.cheers, nickname]);
  const cheerKey = question && q.feedback?.kind === 'correct' ? `${question.id}#${q.attemptCount}` : null;
  const cheer = cheerKey ? pickCheer(fun.cheers, cheerKey, nickname) : null;
  const feedbackText = q.feedback ? (cheer ?? q.feedback.message) : '';

  // The built-in praise is spoken by the session; say the parent's cheer instead (speaking cancels the earlier line).
  const spokenCheer = useRef(cheerKey);
  useEffect(() => {
    if (!cheerKey || cheerKey === spokenCheer.current) return;
    spokenCheer.current = cheerKey;
    if (cheer && reading.speakFeedback && speechOn) speak(cheer, voiceRate);
  }, [cheerKey, cheer, reading.speakFeedback, speechOn, voiceRate]);

  // Quiz mode starts by itself: no "Start" screen. (Guarded so React StrictMode does not start two quizzes;
  // retried when the settings change if the plan could not make a question.)
  const autoStarted = useRef<typeof startQuiz | null>(null);
  useEffect(() => {
    if (!quizMode || quiz.status !== 'IDLE') {
      autoStarted.current = null;
      return;
    }
    if (autoStarted.current === startQuiz) return;
    autoStarted.current = startQuiz;
    startQuiz();
  }, [quizMode, quiz.status, startQuiz]);

  // Enter = check, or next when done.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'TEXTAREA' || el.tagName === 'A' || el.getAttribute('role') === 'button')) return;
      if (q.locked) session.next();
      else session.submit();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [q.locked, session]);

  // A brick flies from the answer box to the tower after each right answer. It lands on the tower brick that just lit
  // up (same colour). With a goal above 10 the mini tower shows fewer bricks than answers, so when no new brick lights
  // up the flying brick goes into the 🏗️ crane instead (the colour of the brick being built).
  const answerRef = useRef<HTMLElement | null>(null);
  const goalRef = useRef<HTMLSpanElement | null>(null);
  const built = session.towerCount === 0 ? fun.towerGoal : session.towerCount; // 0 right after a finished tower
  const slot = towerSlot(built, fun.towerGoal);
  const landsOnBrick = slot >= 0 && slot !== towerSlot(built - 1, fun.towerGoal);
  const { flights, done: flightDone } = useFlyingBricks(session.celebration, {
    enabled: fun.flyingBricks,
    color: towerBrickColor(landsOnBrick ? slot : slot + 1),
    source: () => answerRef.current?.querySelector('.answer-box') ?? answerRef.current,
    target: () => goalRef.current?.querySelector(landsOnBrick ? '.tower-brick.newest' : '.tower-crane') ?? goalRef.current,
  });

  // Tap the question to hear it again. The 🔊 badge shows for a moment (a class, not only a keyframe, so it also
  // shows with animations off). Classes are set on the element directly so a re-render never cuts the bounce short.
  const hearRef = useRef<HTMLDivElement | null>(null);
  const heardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (heardTimer.current) clearTimeout(heardTimer.current);
    },
    [],
  );
  const hearQuestion = () => {
    if (!shown) return;
    speak(questionToSpeech(shown), voiceRate);
    const el = hearRef.current;
    restartAnimation(el, 'kf-hear');
    el?.classList.add('heard');
    if (heardTimer.current) clearTimeout(heardTimer.current);
    heardTimer.current = setTimeout(() => el?.classList.remove('heard'), HEARD_MS);
  };
  // A tap must not leave focus on the question (Safari focuses a tabindex element on tap): otherwise Enter would replay
  // the question instead of checking the answer. Keyboard users can still Tab to it and press Enter or Space.
  const onHearMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => e.preventDefault();
  const onHearClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.detail > 0) e.currentTarget.blur(); // a pointer click (a keyboard "click" has detail 0)
    hearQuestion();
  };
  const onHearKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    hearQuestion();
  };

  const onCount = useCallback<CountHandler>(
    (n, spoken) => {
      sfx('tap');
      if (reading.speakButtons && speechOn) speak(spoken || String(n), voiceRate); // "25 cents", not just "25"
    },
    [sfx, reading.speakButtons, speechOn, voiceRate],
  );

  const tapTower = () => {
    sfx('snap');
    if (reading.speakButtons && speechOn) {
      const n = session.towerCount;
      const left = Math.max(0, fun.towerGoal - n);
      speak(`${n} ${n === 1 ? 'brick' : 'bricks'}. ${left} more!`, voiceRate);
    }
  };

  const reaction = useMemo<BuddyReaction | null>(() => {
    if (!question || (q.submissionStatus !== 'CORRECT' && q.submissionStatus !== 'INCORRECT')) return null;
    const right = q.submissionStatus === 'CORRECT';
    return { key: `${question.id}#${q.attemptCount}`, kind: right ? 'correct' : 'incorrect', text: right ? feedbackText : q.locked ? 'Nice try!' : 'Try again!' };
  }, [question, q.submissionStatus, q.attemptCount, q.locked, feedbackText]);

  const buddy = fun.showBuddy ? (
    <Buddy
      emoji={fun.buddy}
      cheers={tapCheers}
      iconOnly={reading.iconOnly}
      speakCheers={speechOn && (reading.speakFeedback || fun.readAloud)}
      voiceRate={voiceRate}
      reaction={reaction}
      onTap={() => sfx('tap', 0.8)}
    />
  ) : null;

  // + − × ÷ buttons on the number pad: one for each operation the grown-up picked (practice only).
  const opBar =
    settings.input.opButtons && !quizMode && !quizRunning && session.operations.length > 1 ? (
      <div className="op-bar" role="group" aria-label="Pick the math">
        <button type="button" className={`op-btn op-all${session.focusOp === null ? ' on' : ''}`} aria-pressed={session.focusOp === null} aria-label="Mix of everything" title="Mix" onClick={() => { sfx('snap'); session.setFocusOp(null); }}>
          🎲
        </button>
        {session.operations.map((op) => (
          <button key={op} type="button" className={`op-btn op-${op.toLowerCase()}${session.focusOp === op ? ' on' : ''}`} aria-pressed={session.focusOp === op} aria-label={OP_NAMES[op]} title={OP_NAMES[op]} onClick={() => { sfx('snap'); session.setFocusOp(op); }}>
            {OP_SYMBOLS[op]}
          </button>
        ))}
      </div>
    ) : null;

  const showStreak = fun.streaks && session.streak >= 3;

  const header = (
    <header className={`kid-top${fun.flyingBricks ? ' fly-on' : ''}`}>
      {settings.look.showLogo ? <Logo /> : null}
      <span className="spacer" />
      {timer.status !== 'IDLE' ? (
        <span className={`pill ${timerSeverity(timer, now)}`} role="timer" aria-label={`Time left ${formatClock(remainingMs(timer, now))}`}>
          ⏱ {formatClock(remainingMs(timer, now))}
          {timer.status === 'RUNNING' || timer.status === 'PAUSED' ? (
            <button
              type="button"
              className="brick ghost kid-pause"
              onClick={timer.status === 'RUNNING' ? session.pauseTimer : session.resumeTimer}
              aria-label={timer.status === 'RUNNING' ? 'Pause timer' : 'Resume timer'}
            >
              {timer.status === 'RUNNING' ? '⏸' : '▶'}
            </button>
          ) : null}
        </span>
      ) : null}
      <span ref={goalRef} className="kid-top-goal">
        {quizRunning ? (
          <span className="progress-bricks" aria-label={`Question ${quiz.index + 1} of ${quiz.length}`} role="img">
            {Array.from({ length: Math.min(quiz.length, 40) }, (_, i) => {
              const row = quiz.rows.find((r) => r.index === i);
              return <span key={i} className={row ? (row.isCorrect ? 'done-right' : 'done-wrong') : i === quiz.index ? 'current' : ''} />;
            })}
          </span>
        ) : fun.showTower ? (
          <TowerMini count={session.towerCount} goal={fun.towerGoal} onTap={tapTower} />
        ) : null}
      </span>
      {showStreak ? (
        <span key={session.streak} className="pill streak-pill" role="img" aria-label={`${session.streak} in a row`}>
          <span className="flame" aria-hidden="true">
            🔥
          </span>
          <span aria-hidden="true">{session.streak}</span>
        </span>
      ) : null}
      <a href="#/parent" className="brick white icon-brick kid-lock" aria-label="Grown-ups area (locked)" title="Grown-ups">
        🔒
      </a>
    </header>
  );

  const fly = <FlyingBricks flights={flights} onDone={flightDone} />;

  if (quizMode && quiz.status === 'IDLE') {
    // Starting by itself (see the effect above); only an error can keep us here.
    return (
      <div className="app kid-screen">
        {header}
        {session.error ? (
          <div className="tile notice" role="alert">
            {session.error}
          </div>
        ) : null}
      </div>
    );
  }

  if (quiz.status === 'COMPLETE') {
    return (
      <div className="app kid-screen">
        {header}
        <QuizDone
          quiz={quiz}
          onAgain={quizMode ? session.startQuiz : session.resetQuiz}
          buddy={fun.showBuddy ? <Buddy emoji={fun.buddy} cheers={tapCheers} iconOnly={reading.iconOnly} speakCheers={speechOn && (reading.speakFeedback || fun.readAloud)} voiceRate={voiceRate} onTap={() => sfx('tap', 0.8)} party /> : null}
        />
        <Celebration event={session.celebration} style={fun.celebration} />
      </div>
    );
  }

  if (timeUp && !quizRunning) {
    return (
      <div className="app kid-screen">
        {header}
        <section className="tile studded done-screen" aria-label="Time is up">
          <div className="score">⏰</div>
          <TowerMini count={session.towerCount} goal={fun.towerGoal} />
          <div>
            <button type="button" className="brick big green" onClick={session.restartPractice} autoFocus aria-label="Play again">
              ▶
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Answers are shown from the personalised question, so a story name that is the answer matches what the child read.
  const fill = q.submissionStatus === 'CORRECT' && shown && shown.answerSchema.widget !== 'CHOICE' ? formatQuestionAnswer(shown) : undefined;

  return (
    <div className="app kid-screen">
      {header}
      {!hasPasscode.current ? <p className="welcome-hint">👋 Grown-ups: tap 🔒 to choose the math.</p> : null}
      {session.error ? (
        <div className="tile notice" role="alert">
          {session.error}
        </div>
      ) : null}
      {question && shown ? (
        <div className={`kid-grid${q.solutionVisibility === 'VISIBLE' ? ' with-ways' : ''}`}>
          <section className={`tile studded question-tile${buddy ? ' has-buddy' : ' no-buddy'}`} aria-label="Question" style={{ gridArea: 'q' }}>
            {buddy ? <div className="kid-buddy-spot">{buddy}</div> : null}
            {/* resetKey: a new question with the same picture starts counting from zero. */}
            {shown.prompt.visual && fun.showVisuals ? <VisualView visual={shown.prompt.visual} interactive={fun.tapToCount} onCount={onCount} resetKey={question.id} /> : null}
            {canHear ? (
              <>
                <span className="sr-only">{nodesToSpeech(shown.prompt.nodes)}</span>
                <div
                  ref={hearRef}
                  role="button"
                  tabIndex={0}
                  className="hear-math"
                  aria-label="Hear the question again"
                  onMouseDown={onHearMouseDown}
                  onClick={onHearClick}
                  onKeyDown={onHearKey}
                >
                  <MathView nodes={shown.prompt.nodes} fillBlank={fill} label="" />
                </div>
              </>
            ) : (
              <MathView nodes={shown.prompt.nodes} fillBlank={fill} />
            )}
          </section>

          <section ref={answerRef} className="tile answer-tile" aria-label="Your answer" style={{ gridArea: 'a' }}>
            <AnswerArea
              question={shown}
              raw={q.rawInput}
              onChange={session.setInput}
              onSubmit={session.submit}
              locked={q.locked || timeUp}
              status={q.submissionStatus}
              modes={settings.input.modes}
              defaultMode={settings.input.defaultMode}
              keypadStyle={settings.input.keypadStyle}
              keypadLayout={settings.input.keypadLayout}
              writeDelayMs={WRITE_DELAY_MS[settings.input.writeSpeed]}
              keypadTop={opBar}
              onTap={() => sfx('tap', 0.6)}
              onModeChange={setInputMode}
            />
            <div className={`feedback ${q.feedback?.kind ?? ''}${reading.iconOnly ? ' icon-only' : ''}`} role="status" aria-live="assertive">
              {q.feedback ? (
                <span className="pop" key={`${q.attemptCount}-${q.invalidCount}`}>
                  <span aria-hidden={!reading.iconOnly}>{q.feedback.kind === 'correct' ? '✅' : q.feedback.kind === 'incorrect' ? '❌' : '✏️'}</span>
                  {reading.iconOnly ? <span className="sr-only">{feedbackText}</span> : <> {feedbackText}</>}
                </span>
              ) : null}
            </div>
            {q.locked && q.submissionStatus === 'INCORRECT' ? (
              <div className="correct-answer">
                <span aria-hidden="true">✔</span>
                <strong>{formatQuestionAnswer(shown)}</strong>
              </div>
            ) : null}
            <div className="actions">
              {!q.locked && question.answerSchema.widget !== 'CHOICE' && inputMode !== 'KEYPAD' ? (
                <button type="button" className="brick big green" onClick={() => session.submit()} disabled={timeUp} aria-label={reading.iconOnly ? 'Check answer' : undefined}>
                  ✓{reading.iconOnly ? '' : ' Check'}
                </button>
              ) : null}
              {canShowWays ? (
                <button
                  type="button"
                  className="brick big yellow"
                  onClick={q.solutionVisibility === 'VISIBLE' ? session.hideSolution : session.showSolution}
                  aria-expanded={q.solutionVisibility === 'VISIBLE'}
                  aria-label={reading.iconOnly ? 'Ways to solve' : undefined}
                >
                  💡{reading.iconOnly ? '' : ' Ways'}
                </button>
              ) : null}
              {answered && (q.locked || !quizRunning) ? (
                <button type="button" className="brick big blue" onClick={session.next} autoFocus={q.locked} aria-label={reading.iconOnly ? 'Next question' : undefined}>
                  {reading.iconOnly ? '➜' : 'Next ➜'}
                </button>
              ) : null}
            </div>
          </section>

          {q.solutionVisibility === 'VISIBLE' ? (
            <div style={{ gridArea: 's' }}>
              <StrategyPanel
                question={shown}
                showModels={fun.brickModels}
                onClose={session.hideSolution}
                rainbow={rainbow}
                speakSteps={reading.speakButtons && speechOn}
                autoSpeak={reading.speakFeedback && speechOn}
                voiceRate={voiceRate}
                iconOnly={reading.iconOnly}
                guided={fun.guidedSteps}
                hiddenStrategies={settings.strategies.hidden}
                onSound={(e) => sfx(e)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {fly}
      <Celebration event={session.celebration} style={fun.celebration} />
    </div>
  );
}
