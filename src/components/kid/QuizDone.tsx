import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import type { QuizState } from '../../state/quizMachine';
import { scorePercent } from '../../state/quizMachine';
import { BigTower } from './Tower';
import '../../styles/kidfun.css';

/**
 * End of a quiz: bouncing stars, the score as bricks (green = right), a tower built from the right answers,
 * and one big ▶ to play again. Few words — the bricks tell the story.
 * Fits one iPad screen: on wide screens the tower stands beside the score; on phones ▶ comes before the tower.
 */
export function QuizDone({ quiz, onAgain, buddy = null }: { quiz: QuizState; onAgain: () => void; buddy?: ReactNode }) {
  const pct = scorePercent(quiz);
  const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
  const perfect = quiz.length > 0 && quiz.correct === quiz.length;
  const shown = Math.min(quiz.length, 40);
  const summaryId = useId();
  const againRef = useRef<HTMLButtonElement | null>(null);

  // Focus ▶ without scrolling, so the stars and the score stay in view (autoFocus would scroll down to the button).
  useEffect(() => {
    againRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="tile studded done-screen quiz-done" aria-label="Quiz finished">
      <div className="qd-main">
        {buddy ? <div className="qd-buddy">{buddy}</div> : null}
        <div className="qd-stars" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`qd-star${i < stars ? ' on' : ' off'}`} style={{ ['--d' as string]: `${0.15 + i * 0.25}s` } as CSSProperties}>
              ⭐
            </span>
          ))}
        </div>
        {perfect ? (
          <div className="qd-trophy" aria-hidden="true">
            🏆
          </div>
        ) : null}
        <div className="score" aria-hidden="true">
          {quiz.correct} / {quiz.length}
        </div>
        <div className="qd-score-bricks" aria-hidden="true">
          {Array.from({ length: shown }, (_, i) => {
            const row = quiz.rows.find((r) => r.index === i);
            const cls = row ? (row.isCorrect ? 'right' : 'wrong') : 'skipped';
            return <span key={i} className={`qd-brick ${cls}`} style={{ ['--d' as string]: `${0.1 + i * 0.07}s` } as CSSProperties} />;
          })}
        </div>
        {quiz.endedBy === 'TIME_UP' ? (
          <p className="feedback invalid qd-timeup" aria-hidden="true">
            <span>⏰</span> Time’s up!
          </p>
        ) : null}
        {/* What a screen reader says when focus lands on ▶ (the pictures above are hidden from it). */}
        <p id={summaryId} className="sr-only">
          {quiz.endedBy === 'TIME_UP' ? 'Time’s up! ' : ''}
          {`You got ${quiz.correct} out of ${quiz.length} right. ${stars} of 3 stars.`}
        </p>
      </div>
      <div className="qd-tower">
        <BigTower bricks={quiz.correct} />
      </div>
      <div className="qd-actions">
        <button ref={againRef} type="button" className="brick big green qd-again" onClick={onAgain} aria-label="Play again" aria-describedby={summaryId}>
          ▶
        </button>
      </div>
    </section>
  );
}
