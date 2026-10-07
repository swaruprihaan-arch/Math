import { useEffect, useRef, useState } from 'react';

/** How long a finger, Pencil or mouse has to stay on a button before its name shows (ms). */
export const HINT_DELAY_MS = 5000;
const HINT_SHOW_MS = 2500;

const TARGET = 'button, a[href], [role="button"], [role="tab"], .pill';

/** The friendly name of a control: its accessible label (e.g. "Tally marks"), title, or visible text. */
export function friendlyName(el: Element): string {
  const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('data-hint') || (el as HTMLElement).innerText || '';
  return label.replace(/\s+/g, ' ').trim().slice(0, 60);
}

/**
 * Shows a button's friendly name ("Tally marks", "Reset", "Check answer"…) after it has been held or hovered for
 * `HINT_DELAY_MS`. One global listener, so every button on every screen gets it.
 */
export function HoldHint() {
  const [hint, setHint] = useState<{ text: string; x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<Element | null>(null);

  useEffect(() => {
    const clear = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      current.current = null;
    };
    const start = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target.closest(TARGET) : null;
      if (el === current.current) return;
      clear();
      if (!el) return;
      const text = friendlyName(el);
      if (!text) return;
      current.current = el;
      timer.current = setTimeout(() => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect();
        setHint({ text, x: r.left + r.width / 2, y: r.top });
        if (hide.current) clearTimeout(hide.current);
        hide.current = setTimeout(() => setHint(null), HINT_SHOW_MS);
      }, HINT_DELAY_MS);
    };
    const leave = (e: PointerEvent) => {
      const to = e.relatedTarget instanceof Element ? e.relatedTarget.closest(TARGET) : null;
      if (to !== current.current) {
        clear();
        setHint(null);
      }
    };
    const end = () => {
      clear();
    };
    document.addEventListener('pointerover', start, true);
    document.addEventListener('pointerdown', start, true);
    document.addEventListener('pointerout', leave, true);
    document.addEventListener('pointercancel', end, true);
    document.addEventListener('scroll', () => setHint(null), true);
    return () => {
      document.removeEventListener('pointerover', start, true);
      document.removeEventListener('pointerdown', start, true);
      document.removeEventListener('pointerout', leave, true);
      document.removeEventListener('pointercancel', end, true);
      clear();
      if (hide.current) clearTimeout(hide.current);
    };
  }, []);

  if (!hint) return null;
  return (
    <div className="hold-hint" role="tooltip" style={{ left: hint.x, top: hint.y }}>
      {hint.text}
    </div>
  );
}
