/**
 * Hand-drawn style tally marks: groups of five (four strokes crossed by a fifth), then single strokes.
 * Purely visual — callers provide the accessible number.
 */
const GROUP_COLORS = ['#d01012', '#0057a6', '#00852b', '#7f3f98', '#fe8a18', '#36aebf'];

export interface TallyProps {
  count: number;
  /** Stroke height in px. */
  height?: number;
  /** Single colour for every stroke; default draws each bundle of five in a different brick colour. */
  color?: string;
  /** Animate strokes as if drawn with a marker (newest strokes only, via key changes). */
  animate?: boolean;
  className?: string;
}

export function TallyMarks({ count, height = 26, color, animate = false, className }: TallyProps) {
  const n = Math.max(0, Math.floor(count));
  const sp = height * 0.3; // gap between strokes
  const sw = Math.max(2.5, height * 0.12); // stroke width
  const groupGap = sp * 1.5;
  const groups = Math.floor(n / 5);
  const rest = n % 5;
  const groupWidth = 3 * sp;
  const width = Math.max(1, groups * (groupWidth + groupGap) + (rest > 0 ? (rest - 1) * sp : 0)) + sw * 2 + (groups > 0 ? sp * 0.6 : 0);
  const top = sw;
  const bottom = height + sw;
  const strokes: { d: string; color: string; key: string }[] = [];
  let x = sw + (groups > 0 ? sp * 0.3 : 0);
  // tiny deterministic wobble so the marks look hand-drawn
  const wob = (i: number) => (((i * 37) % 7) - 3) * (height / 110);
  for (let g = 0; g < groups; g++) {
    const c = color ?? (GROUP_COLORS[g % GROUP_COLORS.length] as string);
    for (let i = 0; i < 4; i++) {
      const sx = x + i * sp;
      strokes.push({ d: `M${sx + wob(g * 5 + i)} ${top + wob(i + 1)} L${sx - wob(g * 5 + i)} ${bottom}`, color: c, key: `g${g}s${i}` });
    }
    strokes.push({ d: `M${x - sp * 0.5} ${bottom - height * 0.12} L${x + 3 * sp + sp * 0.5} ${top + height * 0.12}`, color: c, key: `g${g}x` });
    x += groupWidth + groupGap;
  }
  for (let i = 0; i < rest; i++) {
    const sx = x + i * sp;
    strokes.push({ d: `M${sx + wob(groups * 5 + i)} ${top + wob(i)} L${sx - wob(i + 2)} ${bottom}`, color: color ?? '#1f2937', key: `r${groups}-${i}` });
  }
  return (
    <svg className={`tally${className ? ` ${className}` : ''}`} width={width} height={height + sw * 2} viewBox={`0 0 ${width} ${height + sw * 2}`} aria-hidden="true" focusable="false">
      {strokes.map((s) => (
        <path key={s.key} d={s.d} stroke={s.color} strokeWidth={sw} strokeLinecap="round" fill="none" pathLength={1} className={animate ? 'tally-stroke draw' : 'tally-stroke'} />
      ))}
    </svg>
  );
}

/** Small icon (a bundle of five) used for the "tap to count" keypad mode button. */
export function TallyIcon({ size = 28 }: { size?: number }) {
  return <TallyMarks count={5} height={size * 0.8} color="#ffffff" />;
}
