/**
 * Session controller: wires the pure state machines (question / quiz / timer) to the plan, progress and effects.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { formatQuestionAnswer, promptToText, questionToSpeech } from '../domain/answer/format';
import { personalizeQuestion } from '../components/QuestionCard/personalize';
import type { Question } from '../domain/question/types';
import { createSeededRandom, deriveSeed, generateNumericCode, generateSeedString, isValidNumericCode } from '../domain/random/random';
import { focusPlan, generateFromPlan, planOperations, validatePlan } from '../engines/plan/practicePlan';
import type { ArithmeticOperator } from '../domain/question/types';
import { recordAttempt, recordInvalid, recordQuiz, recordStreak } from '../state/progress';
import { INITIAL_QUESTION_STATE, questionReducer } from '../state/questionMachine';
import { INITIAL_QUIZ, quizReducer } from '../state/quizMachine';
import { INITIAL_TIMER, timerReducer } from '../state/timerMachine';
import { readingSupport } from '../state/settings';
import { play } from '../ui/sound';
import { speak } from '../ui/speech';
import { useApp } from './AppContext';
import { timerTotalMs } from './timing';

export type CelebrationEvent = { id: number; kind: 'correct' | 'tower' | 'quiz' } | null;

export function useSession() {
  const { settings, updateProgress } = useApp();
  const [q, dispatchQ] = useReducer(questionReducer, INITIAL_QUESTION_STATE);
  const [quiz, dispatchQuiz] = useReducer(quizReducer, INITIAL_QUIZ);
  const [timer, dispatchTimer] = useReducer(timerReducer, INITIAL_TIMER);
  const [now, setNow] = useState(() => Date.now());
  const [streak, setStreak] = useState(0);
  const [towerCount, setTowerCount] = useState(0);
  const [celebration, setCelebration] = useState<CelebrationEvent>(null);
  const [error, setError] = useState<string | null>(null);
  const practiceSeed = useRef(generateSeedString('PRACTICE'));
  const practiceCounter = useRef(0);
  // The child can focus practice on one of the operations the parent picked (+ − × ÷ buttons); null = all of them.
  const operations = useMemo(() => planOperations(settings.plan), [settings.plan]);
  const [focusOp, setFocusOp] = useState<ArithmeticOperator | null>(null);
  const activeOp = focusOp && operations.includes(focusOp) ? focusOp : null;
  const plan = useMemo(() => focusPlan(settings.plan, activeOp), [settings.plan, activeOp]);
  const planKey = useMemo(() => JSON.stringify(plan), [plan]);
  const isQuizMode = settings.session.mode === 'QUIZ';
  const sound = useCallback((e: Parameters<typeof play>[0]) => settings.fun.sounds && play(e, settings.fun.volume), [settings.fun.sounds, settings.fun.volume]);

  const makeQuestion = useCallback(
    (seed: string): Question | null => {
      const check = validatePlan(plan);
      if (!check.valid) {
        setError(check.errors.join(' '));
        return null;
      }
      try {
        setError(null);
        return generateFromPlan(plan, createSeededRandom(seed));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not make a question.');
        return null;
      }
    },
    [plan],
  );

  const nextPractice = useCallback(() => {
    practiceCounter.current += 1;
    const question = makeQuestion(deriveSeed(practiceSeed.current, practiceCounter.current));
    if (question) dispatchQ({ type: 'GENERATE', question });
  }, [makeQuestion]);

  // New plan → new practice question (quizzes keep running with their own seed).
  useEffect(() => {
    if (quiz.status !== 'IN_PROGRESS' && !isQuizMode) nextPractice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey, isQuizMode]);

  // Timer ticking.
  useEffect(() => {
    if (timer.status !== 'RUNNING') return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatchTimer({ type: 'TICK', now: t });
    }, 250);
    return () => clearInterval(id);
  }, [timer.status]);

  // Time up ends a running quiz (legacy behaviour).
  useEffect(() => {
    if (timer.status === 'EXPIRED' && quiz.status === 'IN_PROGRESS') dispatchQuiz({ type: 'FINISH', reason: 'TIME_UP', now: Date.now() });
  }, [timer.status, quiz.status]);

  // Save finished quizzes.
  const savedQuiz = useRef<number>(0);
  useEffect(() => {
    if (quiz.status === 'COMPLETE' && quiz.finishedAt && savedQuiz.current !== quiz.startedAt) {
      savedQuiz.current = quiz.startedAt;
      dispatchTimer({ type: 'PAUSE', now: Date.now() });
      updateProgress((p) =>
        recordQuiz(p, {
          id: `${quiz.seed}@${quiz.startedAt}`,
          seed: quiz.seed,
          startedAt: quiz.startedAt,
          finishedAt: quiz.finishedAt ?? Date.now(),
          total: quiz.length,
          correct: quiz.correct,
          endedBy: quiz.endedBy ?? 'COMPLETE',
          rows: quiz.rows,
        }),
      );
      sound('celebrate');
      setCelebration({ id: Date.now(), kind: 'quiz' });
    }
  }, [quiz, updateProgress, sound]);

  // Auto read-aloud (always on for children who can't read yet).
  const reading = readingSupport(settings);
  // Reads the answer choices too, and the child's nickname when it is shown in the story (same text as on screen).
  // The nickname is read from this render on purpose (not a dependency), so editing it in the Parent area does not re-read.
  useEffect(() => {
    if (q.question && reading.autoRead) {
      const shown = settings.child.nameInStories ? personalizeQuestion(q.question, settings.child.nickname) : q.question;
      speak(questionToSpeech(shown), settings.fun.voiceRate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.question, reading.autoRead, settings.fun.voiceRate]);

  const startQuiz = useCallback(() => {
    const typed = settings.session.quizCode.trim();
    const seed = isValidNumericCode(typed) ? typed : generateNumericCode(4);
    const question = makeQuestion(deriveSeed(seed, 0));
    if (!question) return;
    dispatchQuiz({ type: 'START', length: settings.session.quizLength, seed, now: Date.now() });
    dispatchQ({ type: 'GENERATE', question });
    setTowerCount(0);
    setStreak(0);
    const total = timerTotalMs(settings);
    if (total > 0) dispatchTimer({ type: 'START', totalMs: total, now: Date.now() });
    else dispatchTimer({ type: 'RESET' });
    sound('snap');
  }, [makeQuestion, settings, sound]);

  const startPracticeTimer = useCallback(() => {
    const total = timerTotalMs(settings);
    if (total > 0) dispatchTimer({ type: 'START', totalMs: total, now: Date.now() });
  }, [settings]);

  // Practice timer starts with the first question when enabled.
  useEffect(() => {
    if (!isQuizMode && settings.session.timer !== 'OFF' && timer.status === 'IDLE' && q.question) startPracticeTimer();
    if (settings.session.timer === 'OFF' && timer.status !== 'IDLE') dispatchTimer({ type: 'RESET' });
  }, [isQuizMode, settings.session.timer, timer.status, q.question, startPracticeTimer]);

  const setInput = useCallback((raw: string) => dispatchQ({ type: 'INPUT', raw }), []);

  const submit = useCallback(
    (rawOverride?: string) => {
      if (!q.question || q.locked) return;
      if (timer.status === 'EXPIRED') return;
      const question = q.question;
      const state = rawOverride !== undefined ? questionReducer(q, { type: 'INPUT', raw: rawOverride }) : q;
      const maxAttempts = quiz.status === 'IN_PROGRESS' ? 1 : settings.session.triesPerQuestion;
      const after = questionReducer(state, { type: 'SUBMIT', maxAttempts });
      if (rawOverride !== undefined) dispatchQ({ type: 'INPUT', raw: rawOverride });
      dispatchQ({ type: 'SUBMIT', maxAttempts });
      if (reading.speakFeedback && after.feedback) speak(after.feedback.message, settings.fun.voiceRate);
      if (after.submissionStatus === 'INVALID_INPUT') {
        updateProgress(recordInvalid);
        sound('tap');
        return;
      }
      const correct = after.submissionStatus === 'CORRECT';
      const questionText = promptToText(question.prompt);
      const correctText = formatQuestionAnswer(question);
      updateProgress((p) => {
        let next = recordAttempt(
          p,
          {
            at: Date.now(),
            topic: question.topic === 'GRADE_LEVEL' ? `GRADE_LEVEL:${question.generationMetadata.generatorId}` : question.topic,
            questionText,
            yourText: state.rawInput,
            correctText,
            correct,
            standards: question.standards,
          },
          state.attemptCount === 0,
        );
        if (correct) next = recordStreak(next, streak + 1);
        return next;
      });
      if (quiz.status === 'IN_PROGRESS') {
        dispatchQuiz({ type: 'RECORD', row: { questionText, yourText: state.rawInput, correctText, isCorrect: correct, standards: question.standards, topic: question.topic } });
      }
      if (correct) {
        sound('correct');
        setStreak((s) => s + 1);
        const nextTower = towerCount + 1;
        if (nextTower >= settings.fun.towerGoal) {
          setTowerCount(0);
          setCelebration({ id: Date.now(), kind: 'tower' });
          sound('celebrate');
        } else {
          setTowerCount(nextTower);
          setCelebration({ id: Date.now(), kind: 'correct' });
        }
      } else {
        sound('wrong');
        setStreak(0);
      }
    },
    [q, quiz.status, settings.session.triesPerQuestion, settings.fun.towerGoal, settings.fun.voiceRate, reading.speakFeedback, streak, towerCount, timer.status, updateProgress, sound],
  );

  const next = useCallback(() => {
    if (quiz.status === 'IN_PROGRESS') {
      if (!q.locked) return;
      if (quiz.answered >= quiz.length) {
        dispatchQuiz({ type: 'ADVANCE', now: Date.now() });
        return;
      }
      const question = makeQuestion(deriveSeed(quiz.seed, quiz.index + 1));
      dispatchQuiz({ type: 'ADVANCE', now: Date.now() });
      if (question) dispatchQ({ type: 'GENERATE', question });
      sound('snap');
      return;
    }
    nextPractice();
    sound('snap');
  }, [quiz, q.locked, makeQuestion, nextPractice, sound]);

  const showSolution = useCallback(() => dispatchQ({ type: 'SHOW_SOLUTION', anytime: settings.session.strategies === 'ANYTIME' }), [settings.session.strategies]);
  const hideSolution = useCallback(() => dispatchQ({ type: 'HIDE_SOLUTION' }), []);

  const stopQuiz = useCallback(() => dispatchQuiz({ type: 'FINISH', reason: 'STOPPED', now: Date.now() }), []);
  const resetQuiz = useCallback(() => {
    dispatchQuiz({ type: 'RESET' });
    dispatchTimer({ type: 'RESET' });
    if (!isQuizMode) nextPractice();
  }, [isQuizMode, nextPractice]);

  const pauseTimer = useCallback(() => dispatchTimer({ type: 'PAUSE', now: Date.now() }), []);
  const resumeTimer = useCallback(() => dispatchTimer({ type: 'RESUME', now: Date.now() }), []);
  const restartPractice = useCallback(() => {
    dispatchTimer({ type: 'RESET' });
    setTowerCount(0);
    setStreak(0);
    nextPractice();
  }, [nextPractice]);

  return {
    operations,
    focusOp: activeOp,
    setFocusOp,
    q,
    quiz,
    timer,
    now,
    streak,
    towerCount,
    celebration,
    error,
    isQuizMode,
    setInput,
    submit,
    next,
    showSolution,
    hideSolution,
    startQuiz,
    stopQuiz,
    resetQuiz,
    pauseTimer,
    resumeTimer,
    restartPractice,
  };
}

export type Session = ReturnType<typeof useSession>;
