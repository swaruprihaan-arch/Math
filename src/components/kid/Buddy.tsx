import { useEffect, useRef, useState } from 'react';
import { canSpeak, speak } from '../../ui/speech';
import { BUILT_IN_CHEERS } from '../QuestionCard/personalize';
import '../../styles/kidfun.css';

/** An answer result the buddy reacts to. A new `key` means a new reaction. */
export interface BuddyReaction {
  readonly key: string;
  readonly kind: 'correct' | 'incorrect';
  /** Words under the 🎉 / 💪 (hidden for children who cannot read yet). */
  readonly text: string;
}

export interface BuddyProps {
  emoji: string;
  /** Cheers for taps (already personalised). Empty = built-in cheers. */
  cheers?: readonly string[];
  /** Not-yet readers see an emoji-only bubble. */
  iconOnly?: boolean;
  /** Say the tap cheer out loud (when speech is available). */
  speakCheers?: boolean;
  voiceRate?: number;
  reaction?: BuddyReaction | null;
  /** Called on each tap (e.g. a little sound). */
  onTap?: () => void;
  /** Keep bouncing (e.g. on the quiz-finished screen). */
  party?: boolean;
  className?: string;
}

/** Emoji-only bubbles for children who cannot read yet (cycled in order). */
export const ICON_CHEERS: readonly string[] = ['🙌', '👍', '⭐', '🎈', '🌈', '🚀'];

/** How long a speech bubble stays up. */
export const BUBBLE_MS = 2500;

type Mood = 'tap' | 'happy' | 'try';

interface Bubble {
  readonly n: number;
  readonly mood: Mood;
  readonly icon: string;
  readonly text: string;
}

/**
 * The child's corner buddy (optional; parents switch it on or off). Tap it: it jumps and cheers in a speech bubble.
 * It also reacts to answers: a happy jump with 🎉 when right, a 💪 "Try again!" when not. Bubbles hide after ~2.5 s.
 */
export function Buddy({ emoji, cheers = [], iconOnly = false, speakCheers = false, voiceRate = 0.95, reaction = null, onTap, party = false, className = '' }: BuddyProps) {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [live, setLive] = useState('');
  const taps = useRef(0);
  const count = useRef(0);
  // Only NEW reactions show a bubble (not one that was already there when the buddy appeared).
  const seenReaction = useRef<string | null>(reaction?.key ?? null);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), BUBBLE_MS);
    return () => clearTimeout(t);
  }, [bubble]);

  useEffect(() => {
    if (!reaction || reaction.key === seenReaction.current) return;
    seenReaction.current = reaction.key;
    count.current += 1;
    setBubble({
      n: count.current,
      mood: reaction.kind === 'correct' ? 'happy' : 'try',
      icon: reaction.kind === 'correct' ? '🎉' : '💪',
      text: iconOnly ? '' : reaction.text,
    });
  }, [reaction, iconOnly]);

  const tap = () => {
    const i = taps.current;
    taps.current += 1;
    count.current += 1;
    const list = cheers.length > 0 ? cheers : BUILT_IN_CHEERS;
    const text = list[i % list.length] ?? '';
    const icon = ICON_CHEERS[i % ICON_CHEERS.length] ?? '🙌';
    setBubble({ n: count.current, mood: 'tap', icon: iconOnly ? icon : '', text: iconOnly ? '' : text });
    setLive(text);
    onTap?.();
    if (speakCheers && canSpeak()) speak(text, voiceRate);
  };

  const mood = bubble?.mood ?? (party ? 'party' : '');
  return (
    <div className={`buddy-wrap${className ? ` ${className}` : ''}`}>
      <button type="button" className="buddy-btn" aria-label="Buddy" onClick={tap}>
        <span key={bubble?.n ?? 0} className={`buddy buddy-face${mood ? ` mood-${mood}` : ''}`} aria-hidden="true">
          {emoji}
        </span>
      </button>
      {bubble ? (
        <div key={bubble.n} className={`buddy-bubble mood-${bubble.mood}${bubble.text ? '' : ' icon-only'}`} aria-hidden="true">
          {bubble.icon ? <span className="bubble-icon">{bubble.icon}</span> : null}
          {bubble.text ? <span className="bubble-text">{bubble.text}</span> : null}
        </div>
      ) : null}
      {/* Tap cheers are announced politely; answer reactions are already announced by the feedback line. */}
      <span className="sr-only" aria-live="polite">
        {live}
      </span>
    </div>
  );
}
