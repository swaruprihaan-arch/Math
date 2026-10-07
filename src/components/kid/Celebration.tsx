import { useEffect, useState } from 'react';
import type { CelebrationEvent } from '../../app/useSession';
import { BRICK_COLORS } from '../../app/theme';
import type { Celebration as Style } from '../../state/settings';

/** Brick confetti / star bursts. Purely decorative (aria-hidden); respects animation settings via CSS. */
export function Celebration({ event, style }: { event: CelebrationEvent; style: Style }) {
  const [active, setActive] = useState<CelebrationEvent>(null);
  useEffect(() => {
    if (!event || event.kind === 'correct' || style === 'NONE') return;
    setActive(event);
    const t = setTimeout(() => setActive(null), 1800);
    return () => clearTimeout(t);
  }, [event, style]);
  if (!active) return null;
  const n = 36;
  return (
    <div className="celebrate-layer" aria-hidden="true">
      {style === 'STARS'
        ? Array.from({ length: 18 }, (_, i) => {
            const angle = (i / 18) * Math.PI * 2;
            return (
              <span key={i} className="star-burst" style={{ left: '50%', top: '40%', ['--dx' as string]: `${Math.cos(angle) * 40}vw`, ['--dy' as string]: `${Math.sin(angle) * 40}vh` }}>
                ⭐
              </span>
            );
          })
        : Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className="confetti-brick"
              style={{ left: `${(i * 97) % 100}%`, background: BRICK_COLORS[i % BRICK_COLORS.length], animationDelay: `${(i % 9) * 0.07}s`, width: 16 + (i % 3) * 8 }}
            />
          ))}
    </div>
  );
}
