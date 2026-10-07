import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Session } from '../../app/useSession';
import { useApp } from '../../app/AppContext';
import '../../styles/parent-extra.css';
import { GradeLevelSection } from './GradeLevelSection';
import { MathSection } from './MathSection';
import { ParentGate } from './ParentGate';
import { AnswersSection, ChildSection, FunSection, LockSection, LookSection, ProgressSection, SessionSection, WorksheetSection } from './Sections';
import { StartSection } from './StartSection';
import { prewarmStrategyCatalog, StrategiesSection } from './StrategiesSection';

const TABS = [
  { id: 'start', label: '🏠 Start', color: 'green' },
  { id: 'math', label: '🧮 Math', color: 'red' },
  { id: 'grade', label: '🎓 Grade Level Math', color: 'yellow' },
  { id: 'session', label: '⏱ Session', color: 'blue' },
  { id: 'answers', label: '✍️ Answers', color: 'lime' },
  { id: 'strategies', label: '🧩 Strategies', color: 'purple' },
  { id: 'look', label: '🎨 Look', color: 'azure' },
  { id: 'fun', label: '🎉 Fun', color: 'orange' },
  { id: 'progress', label: '📈 Progress', color: 'red' },
  { id: 'worksheets', label: '🖨 Worksheets', color: 'blue' },
  { id: 'child', label: '🧒 Child', color: 'lime' },
  { id: 'lock', label: '🔒 Passcode', color: 'white' },
] as const;

export type ParentTab = (typeof TABS)[number]['id'];

export function ParentView({ session }: { session?: Session }) {
  const { parentUnlocked } = useApp();
  const [tab, setTab] = useState<ParentTab>('start');
  const tabRefs = useRef<Partial<Record<ParentTab, HTMLButtonElement | null>>>({});
  const panelRef = useRef<HTMLElement | null>(null);
  /** Counts jumps from links inside a panel ("🧮 Change", "🏠 Go to Start"): each one focuses the new panel. */
  const [jumps, setJumps] = useState(0);

  // The 🧩 Strategies list is built from thousands of sample questions: do it in small background slices while the
  // parent is on another tab, so that tab opens instantly.
  useEffect(() => (parentUnlocked ? prewarmStrategyCatalog() : undefined), [parentUnlocked]);

  // The panel is re-created for each tab (key), so the link that was tapped is gone: move focus to the new panel
  // (not <body>) and bring its top into view, so keyboard, VoiceOver and phone users land at the start of it.
  useEffect(() => {
    const el = panelRef.current;
    if (jumps === 0 || !el) return;
    el.focus({ preventScroll: true });
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'start' });
  }, [jumps]);

  if (!parentUnlocked) {
    return (
      <div className="app">
        <ParentGate />
      </div>
    );
  }
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  const open = (id: ParentTab, focus = false) => {
    setTab(id);
    if (focus) tabRefs.current[id]?.focus();
  };
  /** Opens a tab from a link inside the current panel. */
  const jump = (id: ParentTab) => {
    setTab(id);
    setJumps((n) => n + 1);
  };

  // Arrow keys move between tabs (WAI-ARIA tabs pattern); tapping works the same as before.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (index === last ? 0 : index + 1) : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (index === 0 ? last : index - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    const target = TABS[next];
    if (next < 0 || !target) return;
    e.preventDefault();
    open(target.id, true);
  };

  const panel = (id: ParentTab): ReactNode => {
    switch (id) {
      case 'start':
        return <StartSection session={session} onNavigate={jump} />;
      case 'math':
        return <MathSection />;
      case 'grade':
        return <GradeLevelSection />;
      case 'session':
        return <SessionSection onGoStart={() => jump('start')} />;
      case 'answers':
        return <AnswersSection />;
      case 'strategies':
        return <StrategiesSection />;
      case 'look':
        return <LookSection />;
      case 'fun':
        return <FunSection onOpenChild={() => jump('child')} />;
      case 'progress':
        return <ProgressSection />;
      case 'worksheets':
        return <WorksheetSection />;
      case 'child':
        return <ChildSection />;
      case 'lock':
        return <LockSection />;
    }
  };

  return (
    <div className="app parent-view">
      <div className="parent-head">
        <h1>Grown-ups</h1>
        <span className="spacer" />
        <a href="#/" className="brick green">
          ▶ Back to math
        </a>
      </div>
      <nav className="parent-nav" role="tablist" aria-label="Settings sections">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            id={`parent-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="parent-panel"
            tabIndex={tab === t.id ? 0 : -1}
            className={`brick small ${t.color}`}
            onClick={() => open(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <section id="parent-panel" ref={panelRef} tabIndex={-1} className="tile studded" role="tabpanel" aria-labelledby={`parent-tab-${current.id}`} key={current.id}>
        {panel(current.id)}
      </section>
    </div>
  );
}
