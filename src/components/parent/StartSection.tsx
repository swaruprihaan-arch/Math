import { useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { recommendedSeconds } from '../../app/timing';
import type { Session } from '../../app/useSession';
import { SKILLS_BY_GRADE } from '../../curriculum/registry';
import { GRADE_LABELS } from '../../curriculum/types';
import type { ArithmeticOperator, Difficulty } from '../../domain/question/types';
import { generateNumericCode, isValidNumericCode } from '../../domain/random/random';
import type { FractionOperation } from '../../engines/fractions/fractionEngine';
import type { OrderOperator } from '../../engines/orderOfOperations/orderEngine';
import { gradeSkills, type PracticePlan } from '../../engines/plan/practicePlan';
import type { AttemptLog } from '../../state/progress';
import type { ReaderLevel } from '../../state/settings';
import { NumberField, Segmented } from '../common/Controls';

/** The parent tabs StartSection can jump to ("Change" links in the summary). */
export type StartTarget = 'math' | 'grade' | 'session' | 'child' | 'progress';

const OP_SYMBOL: Record<ArithmeticOperator, string> = { ADD: '+', SUBTRACT: '−', MULTIPLY: '×', DIVIDE: '÷' };
const FRACTION_OP: Record<FractionOperation, string> = {
  ADD: '+',
  SUBTRACT: '−',
  MULTIPLY: '×',
  DIVIDE: '÷',
  SIMPLIFY: 'simplify',
  COMPARE: 'compare',
  CONVERT: 'mixed ↔ improper',
};
const ORDER_OP: Record<OrderOperator, string> = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': 'powers' };
const LEVEL_NAME: Record<Difficulty, string> = { EASY: 'Easy', MEDIUM: 'Standard', HARD: 'Hard', CUSTOM: 'Custom' };
const READER_NAME: Record<ReaderLevel, string> = {
  NOT_YET: '🔊 Not reading yet — everything is read aloud',
  LEARNING: '🌱 Reads a little — questions are read aloud',
  READER: '📖 Reads on their own',
};

export const STOP_QUIZ_QUESTION = 'Stop the quiz in progress? Answers so far will be lost.';

/** "4:05" */
export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const list = (items: readonly string[], sep: string) => (items.length ? items.join(sep) : 'nothing picked yet');

/** One line per kind of math that is turned on, e.g. "➕ Whole numbers: + −". */
export function planSummary(plan: PracticePlan): string[] {
  const lines: string[] = [];
  if (plan.arithmetic.enabled) lines.push(`➕ Whole numbers: ${list(plan.arithmetic.settings.enabledOperations.map((o) => OP_SYMBOL[o]), ' ')}`);
  if (plan.fractions.enabled) lines.push(`🍕 Fractions: ${list(plan.fractions.settings.operations.map((o) => FRACTION_OP[o]), ', ')}`);
  if (plan.decimals.enabled) lines.push(`🔢 Decimals: ${list(plan.decimals.settings.operations.map((o) => OP_SYMBOL[o]), ' ')}`);
  if (plan.order.enabled) lines.push(`🧮 Order of operations: ${list(plan.order.settings.operators.map((o) => ORDER_OP[o]), ' ')}`);
  if (plan.wordProblems.enabled) lines.push(`📖 Word problems: ${list(plan.wordProblems.settings.operations.map((o) => OP_SYMBOL[o]), ' ')}`);
  if (plan.gradeLevel.enabled) {
    const gl = plan.gradeLevel.settings;
    const chosen = gradeSkills(gl).length;
    const all = SKILLS_BY_GRADE[gl.grade].length;
    lines.push(`🎓 ${GRADE_LABELS[gl.grade]}: ${gl.skillIds.length === 0 || chosen === all ? `all ${all} skills` : `${chosen} of ${all} skills`}`);
  }
  return lines;
}

/** Answers checked today (local time) and the share that were right. */
export function todayStats(recent: readonly AttemptLog[], now: number): { answered: number; correct: number; accuracy: number | null } {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const start = midnight.getTime();
  let answered = 0;
  let correct = 0;
  for (const r of recent) {
    if (r.at >= start) {
      answered += 1;
      if (r.correct) correct += 1;
    }
  }
  return { answered, correct, accuracy: answered ? Math.round((correct / answered) * 100) : null };
}

/**
 * 🏠 Start — the parent picks Practice or Quiz here and sends the child to the kid screen.
 */
export function StartSection({ session, onNavigate }: { session?: Session; onNavigate?: (target: StartTarget) => void }) {
  const { settings, updateSettings, progress } = useApp();
  const s = settings.session;
  const [codeInput, setCodeInput] = useState(s.quizCode);
  const [codeError, setCodeError] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const setSession = (patch: Partial<typeof s>) => updateSettings((x) => ({ ...x, session: { ...x.session, ...patch } }));
  const recommended = recommendedSeconds(settings.plan, settings.level, s.quizLength);
  const codeOk = codeInput === '' || isValidNumericCode(codeInput);
  const quizRunning = session?.quiz.status === 'IN_PROGRESS';
  const isQuiz = s.mode === 'QUIZ';
  const math = planSummary(settings.plan);
  const today = todayStats(progress.recent, Date.now());
  const timerText = s.timer === 'OFF' ? 'Off' : s.timer === 'AUTO' ? `Recommended (${formatSeconds(recommended)})` : `${s.timerMinutes} min`;

  /** Starts fresh. A quiz in progress is only thrown away after the parent says so (answers so far are not saved). */
  const go = (mode: 'PRACTICE' | 'QUIZ') => {
    if (quizRunning && !globalThis.confirm(STOP_QUIZ_QUESTION)) return;
    updateSettings((x) => ({ ...x, session: { ...x.session, mode } }));
    session?.resetQuiz();
    globalThis.location.hash = '#/';
  };

  /** Back to the running quiz, exactly where the child left it. */
  const continueQuiz = () => {
    if (s.mode !== 'QUIZ') setSession({ mode: 'QUIZ' });
    globalThis.location.hash = '#/';
  };

  const onCode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 7);
    setCodeInput(digits);
    if (digits === '' || isValidNumericCode(digits)) {
      setCodeError(false);
      setSession({ quizCode: digits });
    }
  };

  const startQuiz = () => {
    if (!codeOk) {
      setCodeError(true);
      codeRef.current?.focus();
      return;
    }
    go('QUIZ');
  };

  const changeLink = (target: StartTarget, label: string) =>
    onNavigate ? (
      <button type="button" className="brick small ghost start-change" onClick={() => onNavigate(target)}>
        {label}
      </button>
    ) : null;

  return (
    <div className="start-section">
      <div className="start-now">
        <span className={`now-badge ${isQuiz ? 'quiz' : 'practice'}`} role="status">
          {isQuiz ? 'Now: Quiz' : 'Now: Practice'}
        </span>
        {quizRunning && session ? (
          <span className="pill">
            📝 A quiz is running: {session.quiz.answered} of {session.quiz.length} answered
          </span>
        ) : null}
        <span className="help">Pick how your child plays, then tap a big button. The kid screen opens right away.</span>
      </div>

      {quizRunning ? (
        <div className="start-continue">
          <button type="button" className="brick big blue start-go" onClick={continueQuiz}>
            ▶ Continue quiz
          </button>
          <span className="help">Goes back to the quiz with every answer kept. The buttons below start over.</span>
        </div>
      ) : null}

      <div className="start-cards">
        <section className={`start-card practice${!isQuiz ? ' active' : ''}`} aria-labelledby="start-practice-title">
          <div className="start-card-head">
            <span className="start-emoji" aria-hidden="true">
              ♾️
            </span>
            <h3 id="start-practice-title">Practice</h3>
            {!isQuiz ? <span className="start-on">✓ On</span> : null}
          </div>
          <p className="start-blurb">Endless questions at your child’s own pace, with 💡 ways to solve to learn from.</p>
          <ul className="start-facts">
            <li>
              🔁 {s.triesPerQuestion} {s.triesPerQuestion === 1 ? 'try' : 'tries'} per question
            </li>
            <li>💡 Ways to solve: {s.strategies === 'ANYTIME' ? 'anytime, as hints' : 'after answering'}</li>
            {s.timer !== 'OFF' ? <li>⏱ Timer: {timerText} (same timer as the quiz)</li> : null}
          </ul>
          <button type="button" className="brick big green start-go" onClick={() => go('PRACTICE')}>
            ▶ Start practice
          </button>
        </section>

        <section className={`start-card quiz${isQuiz ? ' active' : ''}`} aria-labelledby="start-quiz-title">
          <div className="start-card-head">
            <span className="start-emoji" aria-hidden="true">
              📝
            </span>
            <h3 id="start-quiz-title">Quiz</h3>
            {isQuiz ? <span className="start-on">✓ On</span> : null}
          </div>
          <p className="start-blurb">A set number of questions, one try each, and a PDF report in 📈 Progress.</p>

          <div className="start-field">
            <NumberField label="Questions" value={s.quizLength} min={1} max={200} onChange={(quizLength) => setSession({ quizLength })} />
          </div>

          <div className="start-field">
            <span className="start-field-label" aria-hidden="true">
              ⏱ Timer
            </span>
            <Segmented
              label="Quiz timer"
              value={s.timer}
              options={[
                { value: 'OFF', label: 'Off' },
                { value: 'AUTO', label: `Recommended ${formatSeconds(recommended)}` },
                { value: 'CUSTOM', label: 'Custom' },
              ]}
              onChange={(timer) => setSession({ timer })}
            />
            {s.timer === 'CUSTOM' ? <NumberField label="Minutes" value={s.timerMinutes} min={1} max={180} onChange={(timerMinutes) => setSession({ timerMinutes })} /> : null}
            <span className="help">
              Recommended for {s.quizLength} {s.quizLength === 1 ? 'question' : 'questions'}: {formatSeconds(recommended)}. When time runs out the quiz ends.
            </span>
          </div>

          <div className="start-field">
            <label className="start-field-label" htmlFor="start-quiz-code">
              🔢 Quiz number
            </label>
            <div className="row start-code-row">
              <input
                id="start-quiz-code"
                ref={codeRef}
                className="field code-field start-code"
                value={codeInput}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={7}
                autoComplete="off"
                placeholder="new each time"
                aria-invalid={!codeOk}
                aria-describedby="start-quiz-code-help"
                onChange={(e) => onCode(e.target.value)}
              />
              <button type="button" className="brick small ghost" onClick={() => onCode(generateNumericCode(4))} aria-label="New quiz number">
                🎲
              </button>
              {/* Stays enabled (aria-disabled only), so focus is not lost when it empties the field. */}
              <button type="button" className="brick small ghost" onClick={() => onCode('')} aria-label="Clear quiz number" aria-disabled={codeInput === ''}>
                ✗
              </button>
            </div>
            <span id="start-quiz-code-help" className={codeOk ? 'help' : 'help start-warn'}>
              {codeOk ? (codeInput ? `Quiz #${codeInput} gives the exact same questions every time.` : 'Empty = new questions every time. Use 4 to 7 digits to repeat a quiz.') : 'Use 4 to 7 digits, or leave it empty.'}
            </span>
          </div>

          {codeError && !codeOk ? (
            <p className="start-alert" role="alert">
              Fix the quiz number first: use 4 to 7 digits, or leave it empty.
            </p>
          ) : null}
          <button type="button" className="brick big blue start-go" onClick={startQuiz}>
            📝 Start quiz
          </button>
        </section>
      </div>

      <section className="start-summary" aria-labelledby="start-summary-title">
        <h3 id="start-summary-title">📋 At a glance</h3>
        <dl className="start-glance">
          <div>
            <dt>Math</dt>
            <dd>
              {math.length ? (
                <ul className="start-math">
                  {math.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : (
                <span className="start-warn">No math is turned on yet.</span>
              )}
              {changeLink('math', '🧮 Change')}
            </dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>{LEVEL_NAME[settings.level]}</dd>
          </div>
          <div>
            <dt>Reading</dt>
            <dd>
              {READER_NAME[settings.child.reader]}
              {changeLink('child', '🧒 Change')}
            </dd>
          </div>
          <div>
            <dt>Today</dt>
            <dd>
              {today.answered === 0 ? (
                'No answers yet today.'
              ) : (
                <>
                  <strong>{today.answered}</strong> answered · <strong>{today.accuracy}%</strong> right
                </>
              )}
              {changeLink('progress', '📈 Progress')}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
