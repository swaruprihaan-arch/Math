import type React from 'react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../app/AppContext';
import { accentColor, BASEPLATES, inkOn, THEMES } from '../../app/theme';
import { recommendedSeconds } from '../../app/timing';
import { findStandard } from '../../curriculum/registry';
import { generateNumericCode, isValidNumericCode } from '../../domain/random/random';
import { buildAnswerKey, buildWorksheet } from '../../pdf/worksheetBuilder';
import { downloadQuizReport } from '../../pdf/reportPdf';
import { accuracy, emptyProgress } from '../../state/progress';
import { BUDDIES, defaultSettings, type Baseplate, type Celebration, type FontChoice, type InputMode, type KeypadLayout, type KeypadStyle, type ReaderLevel, type WriteSpeed } from '../../state/settings';
import { createPasscode, isValidPasscode, loadPasscode, MAX_PASSCODE_DIGITS, savePasscode, verifyPasscode } from '../../state/security';
import { canSpeak, speak } from '../../ui/speech';
import { MultiChips, NumberField, Segmented, Setting, Toggle } from '../common/Controls';
import { MathView } from '../QuestionCard/MathView';
import { fillName } from '../QuestionCard/personalize';
import { TallyMarks } from '../AnswerInput/TallyMarks';
import { VisualView } from '../QuestionCard/VisualView';

/* ------------------------------------------------------------------ */
export function SessionSection({ onGoStart }: { onGoStart?: () => void } = {}) {
  const { settings, updateSettings } = useApp();
  const s = settings.session;
  const set = (patch: Partial<typeof s>) => updateSettings((x) => ({ ...x, session: { ...x.session, ...patch } }));
  const recommended = recommendedSeconds(settings.plan, settings.level, s.quizLength);
  return (
    <>
      <p className="start-pointer">
        <span>
          To start practice or a quiz, use <strong>🏠 Start</strong>.
        </span>
        {onGoStart ? (
          <button type="button" className="brick small green" onClick={onGoStart}>
            🏠 Go to Start
          </button>
        ) : null}
      </p>
      <div className="section-grid">
        <Setting label="Mode" help="Practice keeps going. A quiz has a set number of questions, one try each, and a PDF report.">
          <Segmented
            label="Mode"
            value={s.mode}
            options={[
              { value: 'PRACTICE', label: '♾️ Practice' },
              { value: 'QUIZ', label: '📝 Quiz' },
            ]}
            onChange={(mode) => set({ mode })}
          />
        </Setting>
        <Setting label="Questions in a quiz" help="1 to 200 (also used for the recommended timer).">
          <NumberField label="Questions" value={s.quizLength} min={1} max={200} onChange={(quizLength) => set({ quizLength })} />
        </Setting>
        <Setting label="Timer" help={`Recommended for ${s.quizLength} questions: ${Math.floor(recommended / 60)}:${String(recommended % 60).padStart(2, '0')}. When time runs out the quiz ends.`}>
          <Segmented
            label="Timer"
            value={s.timer}
            options={[
              { value: 'OFF', label: 'Off' },
              { value: 'AUTO', label: 'Recommended' },
              { value: 'CUSTOM', label: 'Custom' },
            ]}
            onChange={(timer) => set({ timer })}
          />
          {s.timer === 'CUSTOM' ? <NumberField label="Minutes" value={s.timerMinutes} min={1} max={180} onChange={(timerMinutes) => set({ timerMinutes })} /> : null}
        </Setting>
        <Setting label="Ways to solve (strategies)" help="When your child may open the step-by-step strategies.">
          <Segmented
            label="Strategies"
            value={s.strategies}
            options={[
              { value: 'AFTER_ANSWER', label: 'After answering' },
              { value: 'ANYTIME', label: 'Anytime (as hints)' },
            ]}
            onChange={(strategies) => set({ strategies })}
          />
        </Setting>
        <Setting label="Tries per question (practice)" help="After the last wrong try the answer and strategies are shown. Quizzes always allow one try.">
          <Segmented label="Tries" value={s.triesPerQuestion} options={[1, 2, 3, 5].map((n) => ({ value: n, label: String(n) }))} onChange={(triesPerQuestion) => set({ triesPerQuestion })} />
        </Setting>
        <Setting label="Quiz code" help="A 4–7 digit number. The same number gives the exact same quiz again. Leave empty for new questions every time.">
          <div className="row">
            <input
              className="field code-field"
              value={s.quizCode}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={7}
              onChange={(e) => set({ quizCode: e.target.value.replace(/\D/g, '').slice(0, 7) })}
              aria-label="Quiz code"
              placeholder="new each time"
            />
            <button type="button" className="brick small ghost" onClick={() => set({ quizCode: generateNumericCode(4) })} aria-label="New quiz code">
              🎲
            </button>
            <button type="button" className="brick small ghost" onClick={() => set({ quizCode: '' })}>
              ✗
            </button>
          </div>
        </Setting>
      </div>
    </>
  );
}

const PHONE_ROWS = ['123', '456', '789'] as const;
const CALCULATOR_ROWS = ['789', '456', '123'] as const;

/** Tiny picture of the digit order, so the choice is obvious at a glance. */
function KeypadPreview({ layout }: { layout: KeypadLayout }) {
  const rows = layout === 'PHONE' ? PHONE_ROWS : CALCULATOR_ROWS;
  return (
    <span className="keypad-preview" aria-hidden="true">
      {rows.map((r) => (
        <span key={r} className="keypad-preview-row">
          {r.split('').map((d) => (
            <span key={d} className="keypad-preview-key">
              {d}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
export function AnswersSection() {
  const { settings, updateSettings } = useApp();
  const options: { value: InputMode; label: React.ReactNode }[] = [
    { value: 'KEYPAD', label: '🔢 Number pad' },
    { value: 'WRITE', label: '✍️ Handwriting' },
    {
      value: 'TALLY',
      label: (
        <span className="row" style={{ gap: 6 }}>
          <TallyMarks count={5} height={14} color="currentColor" /> Tally marks (tap or draw)
        </span>
      ),
    },
    { value: 'TYPE', label: '⌨️ Keyboard' },
  ];
  return (
    <div className="section-grid">
      <Setting label="Ways to answer" help="Handwriting turns your child's writing into numbers right on this device (no internet needed).">
        <MultiChips label="Ways to answer" values={settings.input.modes} options={options} onChange={(modes) => updateSettings((s) => ({ ...s, input: { ...s.input, modes, defaultMode: modes.includes(s.input.defaultMode) ? s.input.defaultMode : (modes[0] as InputMode) } }))} />
      </Setting>
      <Setting label="Number pad keys" help="Tally marks show how many each number means — great for younger children.">
        <Segmented
          label="Keypad style"
          value={settings.input.keypadStyle}
          options={[
            {
              value: 'TALLY' as KeypadStyle,
              label: (
                <span className="row" style={{ gap: 6 }}>
                  <TallyMarks count={5} height={14} color="currentColor" /> Tally marks
                </span>
              ),
            },
            { value: 'BOTH' as KeypadStyle, label: '7 + tally' },
            { value: 'NUMBERS' as KeypadStyle, label: '123 Numbers' },
          ]}
          onChange={(keypadStyle) => updateSettings((s) => ({ ...s, input: { ...s.input, keypadStyle } }))}
        />
      </Setting>
      <Setting label="Keypad order" help="Phone order is the easiest for most children. Calculator order matches a calculator or a computer’s number keys.">
        <Segmented
          label="Keypad order"
          value={settings.input.keypadLayout}
          options={[
            {
              value: 'PHONE' as KeypadLayout,
              label: (
                <span className="keypad-choice">
                  <KeypadPreview layout="PHONE" />
                  <span>
                    Phone <small>(1-2-3 on top)</small>
                  </span>
                </span>
              ),
            },
            {
              value: 'CALCULATOR' as KeypadLayout,
              label: (
                <span className="keypad-choice">
                  <KeypadPreview layout="CALCULATOR" />
                  <span>
                    Calculator <small>(7-8-9 on top)</small>
                  </span>
                </span>
              ),
            },
          ]}
          onChange={(keypadLayout) => updateSettings((s) => ({ ...s, input: { ...s.input, keypadLayout } }))}
        />
      </Setting>
      <Setting label="Start with">
        <Segmented label="Default answer mode" value={settings.input.defaultMode} options={options.filter((o) => settings.input.modes.includes(o.value))} onChange={(defaultMode) => updateSettings((s) => ({ ...s, input: { ...s.input, defaultMode } }))} />
      </Setting>
      <Setting label="Operation buttons" help="Shows a button above the number pad for each operation you turned on in 🧮 Math (+ − × ÷) and 🎲 for a mix. Your child taps one to practise just that. Needs two or more operations; hidden in quizzes.">
        <Toggle checked={settings.input.opButtons} onChange={(opButtons) => updateSettings((s) => ({ ...s, input: { ...s.input, opButtons } }))} label="Show + − × ÷ buttons on the number pad" />
      </Setting>
      <Setting label="Handwriting speed" help="How long the writing pad waits after your child lifts the pencil or finger before the writing turns into numbers. Slow gives more time for numbers with several strokes.">
        <Segmented
          label="Handwriting speed"
          value={settings.input.writeSpeed}
          options={[
            { value: 'QUICK' as WriteSpeed, label: '🐇 Quick' },
            { value: 'NORMAL' as WriteSpeed, label: '🙂 Normal' },
            { value: 'SLOW' as WriteSpeed, label: '🐢 Slow' },
          ]}
          onChange={(writeSpeed) => updateSettings((s) => ({ ...s, input: { ...s.input, writeSpeed } }))}
        />
      </Setting>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function LookSection() {
  const { settings, updateSettings } = useApp();
  const look = settings.look;
  const set = (patch: Partial<typeof look>) => updateSettings((s) => ({ ...s, look: { ...s.look, ...patch } }));
  return (
    <div className="section-grid">
      <Setting label="Brick colour" help={look.useCustomColor ? 'Your own colour is on. Tap a swatch to go back to these colours.' : '“Multi” builds with rainbow bricks.'}>
        <div className={`swatches${look.useCustomColor ? ' swatches-muted' : ''}`} role="group" aria-label="Brick colour">
          {THEMES.map((t, i) => {
            const selected = !look.useCustomColor && look.theme === i;
            return (
              <button
                key={t.name}
                type="button"
                className="swatch"
                aria-label={t.name}
                title={t.name}
                aria-pressed={selected}
                onClick={() => set({ theme: i, useCustomColor: false })}
                style={{ background: t.rainbow ? 'linear-gradient(90deg,#d01012,#f8c300,#00852b,#0057a6,#7f3f98)' : t.color, outline: t.name === 'White' && !selected ? '2px solid #d1d5db' : undefined }}
              />
            );
          })}
        </div>
      </Setting>
      <Setting label="Your own colour" help="Any colour you like for the bricks. Text colour is picked automatically so it stays easy to read.">
        <Toggle checked={look.useCustomColor} onChange={(useCustomColor) => set({ useCustomColor })} label="Use my own colour" />
        <label className="color-pick">
          <input type="color" value={look.customColor} onChange={(e) => set({ customColor: e.target.value, useCustomColor: true })} aria-label="Pick a colour" />
          <span>Pick a colour</span>
          <span className="color-pick-sample" style={{ background: look.customColor, color: inkOn(look.customColor) }} aria-hidden="true">
            {look.customColor.toUpperCase()}
          </span>
        </label>
      </Setting>
      <Setting label="Kid screen" help="Simple look: a calm plain background and clean flat cards, so the math stands out. Turn it off for the full brick look with studs.">
        <Toggle checked={look.simple} onChange={(simple) => set({ simple })} label="✨ Simple, clean look" />
        <Toggle checked={look.showLogo} onChange={(showLogo) => set({ showLogo })} label="Show the MATH LAB logo" />
      </Setting>
      <Setting label="Baseplate (background)">
        <Segmented label="Baseplate" value={look.baseplate} options={(Object.keys(BASEPLATES) as Baseplate[]).map((b) => ({ value: b, label: BASEPLATES[b].label }))} onChange={(baseplate) => set({ baseplate })} />
        <Toggle checked={look.studs} onChange={(studs) => set({ studs })} label="Show studs" />
      </Setting>
      <Setting label="Text size">
        <Segmented
          label="Text size"
          value={look.fontScale}
          options={[
            { value: 0.9, label: 'S' },
            { value: 1, label: 'M' },
            { value: 1.15, label: 'L' },
            { value: 1.3, label: 'XL' },
          ]}
          onChange={(fontScale) => set({ fontScale })}
        />
      </Setting>
      <Setting label="Font" help="Easy-read uses Atkinson Hyperlegible, designed for low vision readers.">
        <Segmented
          label="Font"
          value={look.font}
          options={[
            { value: 'ROUNDED' as FontChoice, label: 'Rounded' },
            { value: 'CLASSIC' as FontChoice, label: 'Classic' },
            { value: 'EASY_READ' as FontChoice, label: 'Easy-read' },
          ]}
          onChange={(font) => set({ font })}
        />
      </Setting>
      <Setting label="Comfort">
        <Toggle checked={look.highContrast} onChange={(highContrast) => set({ highContrast })} label="High contrast" />
        <Toggle checked={look.animations} onChange={(animations) => set({ animations })} label="Animations" />
        <Toggle checked={look.bigButtons} onChange={(bigButtons) => set({ bigButtons })} label="Extra-big buttons" />
      </Setting>
    </div>
  );
}

/* ------------------------------------------------------------------ */
const MAX_CHEERS = 20;
const MAX_CHEER_LENGTH = 60;

/** One cheer per line: trimmed, empty lines dropped, at most 20 cheers of 60 characters. */
function parseCheers(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .slice(0, MAX_CHEERS)
    .map((line) => line.slice(0, MAX_CHEER_LENGTH).trim());
}

const READER_SHORT: Record<ReaderLevel, string> = { NOT_YET: 'Not yet', LEARNING: 'A little', READER: 'Yes' };

/** A switch that is shown but cannot be changed here (Controls' Toggle has no disabled state). */
function LockedToggle({ checked, label, describedBy }: { checked: boolean; label: string; describedBy: string }) {
  return (
    <label className="toggle toggle-locked">
      <input type="checkbox" checked={checked} disabled readOnly aria-describedby={describedBy} />
      <span className="track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function FunSection({ onOpenChild }: { onOpenChild?: () => void } = {}) {
  const { settings, updateSettings } = useApp();
  const fun = settings.fun;
  const nickname = settings.child.nickname;
  const reader = settings.child.reader;
  /** Children who cannot read yet always hear questions (readingSupport ignores the two read-aloud switches). */
  const alwaysRead = reader !== 'READER';
  const set = (patch: Partial<typeof fun>) => updateSettings((s) => ({ ...s, fun: { ...s.fun, ...patch } }));
  const [cheerText, setCheerText] = useState(() => fun.cheers.join('\n'));
  const typedLines = cheerText.split(/\r?\n/).filter((line) => line.trim() !== '');
  const tooMany = typedLines.length > MAX_CHEERS;
  const tooLong = typedLines.some((line) => line.trim().length > MAX_CHEER_LENGTH);
  const preview = fun.cheers[0] ? fillName(fun.cheers[0], nickname) : null;
  return (
    <div className="section-grid">
      <Setting label="Brick buddy" help="A little friend in the corner of the kid screen. Pick ✗ None for the simplest screen.">
        <div className="row buddy-picker" role="group" aria-label="Choose buddy">
          <button type="button" className="brick small white buddy-none" aria-pressed={!fun.showBuddy} onClick={() => set({ showBuddy: false })}>
            ✗ None
          </button>
          {BUDDIES.map((b) => (
            <button key={b} type="button" className="brick small white buddy-choice" aria-pressed={fun.showBuddy && fun.buddy === b} onClick={() => set({ showBuddy: true, buddy: b })} aria-label={`Buddy ${b}`}>
              {b}
            </button>
          ))}
        </div>
      </Setting>
      <Setting label="On the kid screen" help="Streaks count right answers in a row. Flying bricks zoom into the tower after each right answer.">
        <Toggle checked={fun.streaks} onChange={(streaks) => set({ streaks })} label="🔥 Streaks" />
        <Toggle checked={fun.showTower} onChange={(showTower) => set({ showTower })} label="🏗️ Brick tower on screen" />
        <Toggle checked={fun.flyingBricks} onChange={(flyingBricks) => set({ flyingBricks })} label="🧱 Flying bricks" />
      </Setting>
      <Setting label="Sounds">
        <Toggle checked={fun.sounds} onChange={(sounds) => set({ sounds })} label="Brick sounds" />
        <label className="row">
          Volume
          <input type="range" min={0} max={1} step={0.1} value={fun.volume} onChange={(e) => set({ volume: Number(e.target.value) })} aria-label="Volume" />
        </label>
      </Setting>
      <Setting label="Celebrations" help="Every correct answer adds a brick to the tower.">
        <Segmented
          label="Celebration"
          value={fun.celebration}
          options={[
            { value: 'TOWER' as Celebration, label: '🏗️ Brick rain' },
            { value: 'STARS' as Celebration, label: '⭐ Stars' },
            { value: 'NONE' as Celebration, label: 'Off' },
          ]}
          onChange={(celebration) => set({ celebration })}
        />
        <NumberField label="Bricks per tower" value={fun.towerGoal} min={3} max={50} onChange={(towerGoal) => set({ towerGoal })} />
      </Setting>
      <div className="setting cheers-setting">
        <label className="label" htmlFor="cheers-text">
          📣 Cheers <span className="cheers-sub">(one per line)</span>
        </label>
        <textarea
          id="cheers-text"
          className="field cheers-field"
          rows={5}
          value={cheerText}
          placeholder={'Great job, {name}!\nBrick-tastic!\nYou did it!'}
          aria-describedby="cheers-hint"
          onChange={(e) => {
            setCheerText(e.target.value);
            const cheers = parseCheers(e.target.value);
            set({ cheers });
          }}
        />
        <div id="cheers-hint" className="help">
          Use <code>{'{name}'}</code> for your child&apos;s nickname. Up to {MAX_CHEERS} cheers, {MAX_CHEER_LENGTH} letters each. Leave empty for the built-in cheers.
          {/* Part of the box's description, and announced when it appears. */}
          <span className="cheers-warn start-warn" role="status">
            {[tooMany ? `Only the first ${MAX_CHEERS} cheers are used.` : '', tooLong ? `Long lines are cut at ${MAX_CHEER_LENGTH} letters.` : ''].filter(Boolean).join(' ')}
          </span>
        </div>
        {/* No live region here: the preview sits right under the box and would be re-announced on every key press. */}
        <div className="cheer-preview">
          {preview ? (
            <>
              <span className="help">Preview:</span>
              <span className="cheer-bubble">
                <span aria-hidden="true">🎉 </span>
                {preview}
              </span>
            </>
          ) : (
            <span className="help">Built-in cheers like “Awesome!” are used.</span>
          )}
          {preview ? (
            <button type="button" className="brick small ghost" onClick={() => speak(preview, fun.voiceRate)} disabled={!canSpeak()}>
              ▶ Hear it
            </button>
          ) : null}
          {/* Always there (aria-disabled when unused), so focus is not lost when it clears the cheers. */}
          <button
            type="button"
            className="brick small ghost"
            aria-disabled={fun.cheers.length === 0 && cheerText === ''}
            onClick={() => {
              setCheerText('');
              set({ cheers: [] });
            }}
          >
            ↺ Built-in cheers
          </button>
        </div>
      </div>
      <Setting label="Read aloud" help={canSpeak() ? 'Uses the voice built into this device. There is no 🔊 button on the kid screen: your child taps the question to hear it.' : 'This browser has no voice support.'}>
        {alwaysRead ? (
          <>
            <LockedToggle checked label="Read aloud (tap the question to hear it again)" describedBy="read-aloud-locked" />
            <LockedToggle checked label="Read every question automatically" describedBy="read-aloud-locked" />
            <div id="read-aloud-locked" className="read-locked">
              <span>
                Always on because <strong>🧒 Child → Can your child read?</strong> is set to <strong>{READER_SHORT[reader]}</strong>.
              </span>
              {onOpenChild ? (
                <button type="button" className="brick small ghost" onClick={onOpenChild}>
                  🧒 Change
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <Toggle checked={fun.readAloud} onChange={(readAloud) => set({ readAloud })} label="Read aloud (tap the question to hear it again)" />
            <Toggle checked={fun.autoRead} onChange={(autoRead) => set({ autoRead })} label="Read every question automatically" />
          </>
        )}
        <label className="row">
          Speed
          <input type="range" min={0.6} max={1.3} step={0.05} value={fun.voiceRate} onChange={(e) => set({ voiceRate: Number(e.target.value) })} aria-label="Voice speed" />
          <button type="button" className="brick small ghost" onClick={() => speak('7 plus 5 equals what?', fun.voiceRate)}>
            ▶ Test
          </button>
        </label>
      </Setting>
      <Setting label="Learning helpers">
        <Toggle checked={fun.showVisuals} onChange={(showVisuals) => set({ showVisuals })} label="Pictures (clocks, coins, bricks…)" />
        <Toggle checked={fun.tapToCount} onChange={(tapToCount) => set({ tapToCount })} label="👆 Tap pictures to count" />
        <Toggle checked={fun.brickModels} onChange={(brickModels) => set({ brickModels })} label="🧱 Brick models in Ways to solve" />
      </Setting>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function ChildSection() {
  const { settings, updateSettings } = useApp();
  const nick = settings.child.nickname.trim();
  return (
    <div className="section-grid">
      <Setting
        label="Can your child read?"
        help={
          settings.child.reader === 'NOT_YET'
            ? 'Every question, answer choice, hint and strategy step is read aloud. Buttons show pictures only.'
            : settings.child.reader === 'LEARNING'
              ? 'Questions and strategy steps are read aloud automatically. Short words stay on buttons.'
              : 'Your child reads the screen. With read-aloud on (🎉 Fun), tapping the question reads it again.'
        }
      >
        <Segmented
          label="Can your child read?"
          value={settings.child.reader}
          options={[
            { value: 'NOT_YET' as ReaderLevel, label: '🔊 Not yet' },
            { value: 'LEARNING' as ReaderLevel, label: '🌱 A little' },
            { value: 'READER' as ReaderLevel, label: '📖 Yes' },
          ]}
          onChange={(reader) => updateSettings((s) => ({ ...s, child: { ...s.child, reader } }))}
        />
      </Setting>
      <Setting label="Name on reports">
        <input className="field" value={settings.child.name} maxLength={40} onChange={(e) => updateSettings((s) => ({ ...s, child: { ...s.child, name: e.target.value } }))} aria-label="Name on reports" />
      </Setting>
      <Setting label="Nickname" help="Used in cheers and word problems.">
        <input className="field" value={settings.child.nickname} maxLength={20} onChange={(e) => updateSettings((s) => ({ ...s, child: { ...s.child, nickname: e.target.value } }))} aria-label="Nickname" />
      </Setting>
      <Setting label="Stories" help={`Word problems star ${nick || 'your child'}: “${nick || 'Sam'} has 12 stickers…”`}>
        <Toggle
          checked={settings.child.nameInStories}
          onChange={(nameInStories) => updateSettings((s) => ({ ...s, child: { ...s.child, nameInStories } }))}
          label={`Use ${nick ? `${nick}’s` : 'your child’s'} name in word problems`}
        />
      </Setting>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function ProgressSection() {
  const { settings, progress, updateProgress } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const t = progress.totals;
  const firstTry = t.questions ? Math.round((t.firstTryCorrect / t.questions) * 100) : null;
  const standards = Object.entries(progress.byStandard).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  const topics = Object.entries(progress.byTopic).sort((a, b) => b[1].attempted - a[1].attempted);
  const meter = (pct: number | null) => (
    <div className="meter" aria-hidden="true">
      <span style={{ width: `${pct ?? 0}%`, background: pct === null ? 'transparent' : pct >= 80 ? 'var(--good)' : pct >= 60 ? '#f8c300' : 'var(--bad)' }} />
    </div>
  );
  return (
    <div>
      <div className="stat-tiles">
        {[
          ['Questions', t.questions],
          ['Answers checked', t.attempted],
          ['Accuracy', t.attempted ? `${Math.round((t.correct / t.attempted) * 100)}%` : '—'],
          ['Right first try', firstTry === null ? '—' : `${firstTry}%`],
          ['Best streak', progress.bestStreak],
          ['Bricks earned', progress.bricks],
          ['Typos (not counted)', t.invalid],
        ].map(([name, value]) => (
          <div key={String(name)} className="stat">
            <div className="value">{value}</div>
            <div className="name">{name}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 18 }}>📝 Quizzes</h3>
      {progress.quizzes.length === 0 ? <p className="help">No quizzes yet. Turn on Quiz mode in Session.</p> : null}
      <div className="table-scroll">
        <table className="report-table">
          <tbody>
            {progress.quizzes.map((qz) => (
              <tr key={qz.id}>
                <td>{new Date(qz.finishedAt).toLocaleString()}</td>
                <td>
                  <strong>
                    {qz.correct}/{qz.total}
                  </strong>{' '}
                  {qz.endedBy === 'TIME_UP' ? '⏰' : ''}
                </td>
                <td>
                  <button type="button" className="brick small ghost" onClick={() => setOpen(open === qz.id ? null : qz.id)} aria-expanded={open === qz.id}>
                    👀 Details
                  </button>{' '}
                  <button type="button" className="brick small" onClick={() => void downloadQuizReport(qz, settings.child.name, accentColor(settings)).catch(() => alert('Could not make the PDF.'))}>
                    📄 PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open
        ? (() => {
            const qz = progress.quizzes.find((x) => x.id === open);
            if (!qz) return null;
            return (
              <div className="table-scroll">
                <table className="report-table" aria-label="Quiz details">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Question</th>
                      <th>Answer</th>
                      <th>Correct</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {qz.rows.map((r) => (
                      <tr key={r.index}>
                        <td>{r.index + 1}</td>
                        <td>{r.questionText}</td>
                        <td>{r.yourText}</td>
                        <td>{r.correctText}</td>
                        <td>{r.isCorrect ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        : null}

      <h3 style={{ marginTop: 18 }}>🧩 By topic</h3>
      <div className="table-scroll">
        <table className="report-table">
          <tbody>
            {topics.map(([k, v]) => (
              <tr key={k}>
                <td>{k.replace('GRADE_LEVEL:', '🎓 ').replace(/_/g, ' ').toLowerCase()}</td>
                <td>
                  {v.correct}/{v.attempted}
                </td>
                <td style={{ width: '40%' }}>{meter(accuracy(v))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 18 }}>🎓 By California standard</h3>
      {standards.length === 0 ? <p className="help">Standards appear here as your child practises.</p> : null}
      <div className="table-scroll">
        <table className="report-table">
          <thead>
            <tr>
              <th>Standard</th>
              <th>What it means</th>
              <th>Right</th>
              <th>Mastery</th>
            </tr>
          </thead>
          <tbody>
            {standards.map(([code, v]) => (
              <tr key={code}>
                <td>
                  <strong>{code}</strong>
                </td>
                <td className="help">{findStandard(code)?.text.slice(0, 140) ?? ''}</td>
                <td>
                  {v.correct}/{v.attempted}
                </td>
                <td style={{ minWidth: 100 }}>{meter(accuracy(v))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <button
          type="button"
          className="brick small red"
          onClick={() => {
            if (globalThis.confirm('Erase all progress and quiz history on this device?')) updateProgress(() => emptyProgress());
          }}
        >
          🗑 Reset progress
        </button>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function WorksheetSection() {
  const { settings, updateSettings } = useApp();
  // Worksheets have as many questions as a quiz (Session → Questions in a quiz); changing it here changes both.
  const count = settings.session.quizLength;
  const setCount = (quizLength: number) => updateSettings((s) => ({ ...s, session: { ...s.session, quizLength } }));
  const [code, setCode] = useState(() => generateNumericCode(4));
  const [codeInput, setCodeInput] = useState(code);
  const [withKey, setWithKey] = useState(true);
  const ws = useMemo(() => {
    try {
      return buildWorksheet(settings.plan, code, count);
    } catch {
      return null;
    }
  }, [settings.plan, code, count]);
  const key = ws ? buildAnswerKey(ws) : [];
  const printArea = ws
    ? createPortal(
        <div className="print-area">
          <div className="ws-page">
            <h1>Math Lab Worksheet</h1>
            <div className="ws-meta">
              <span>Name: ____________________</span>
              <span>Date: __________</span>
              <span>Worksheet #{ws.code}</span>
            </div>
            <div className="ws-grid">
              {ws.questions.map((q, i) => (
                <div key={q.id} className="ws-item">
                  <span className="n">{i + 1}.</span>
                  <div>
                    {q.prompt.visual ? <VisualView visual={q.prompt.visual} /> : null}
                    <MathView nodes={q.prompt.nodes} size="small" />
                    {q.answerSchema.choices ? <div>{q.answerSchema.choices.map((c) => `☐ ${c.label}`).join('    ')}</div> : <div className="ws-answer-line" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {withKey ? (
            <div className="ws-page ws-key">
              <h1>Answer Key</h1>
              <div className="ws-meta">
                <span>Worksheet #{ws.code}</span>
              </div>
              <div className="ws-grid">
                {key.map((k) => (
                  <div key={k.index} className="ws-item">
                    <span className="n">{k.index}.</span>
                    <span>
                      <strong>{k.answer}</strong> — {k.strategy}
                      {k.standards.length ? ` (${k.standards.join(', ')})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>,
        document.body,
      )
    : null;
  return (
    <div>
      <div className="section-grid">
        <Setting label="Questions" help="Same number of questions as a quiz (⏱ Session). Changing it here changes the quiz too. Uses the math chosen in the Math section.">
          <NumberField label="How many" value={count} min={1} max={200} onChange={setCount} />
        </Setting>
        <Setting label="Worksheet number" help={isValidNumericCode(codeInput) ? 'The same number prints the same worksheet.' : 'Use 4 to 7 digits.'}>
          <div className="row">
            <input
              className="field code-field"
              value={codeInput}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={7}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 7);
                setCodeInput(digits);
                if (isValidNumericCode(digits)) setCode(digits);
              }}
              aria-label="Worksheet number"
              aria-invalid={!isValidNumericCode(codeInput)}
            />
            <button
              type="button"
              className="brick small ghost"
              onClick={() => {
                const next = generateNumericCode(4);
                setCode(next);
                setCodeInput(next);
              }}
              aria-label="New worksheet number"
            >
              🎲
            </button>
          </div>
        </Setting>
        <Setting label="Answer key">
          <Toggle checked={withKey} onChange={setWithKey} label="Print answer key page" />
        </Setting>
      </div>
      <p>
        <button type="button" className="brick green" disabled={!ws} onClick={() => globalThis.print()}>
          🖨 Print / Save as PDF
        </button>
      </p>
      {ws ? (
        <div className="tile" aria-label="Worksheet preview">
          <h3>Preview</h3>
          <ol>
            {ws.questions.slice(0, 6).map((q) => (
              <li key={q.id}>
                <MathView nodes={q.prompt.nodes} size="small" />
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="notice">Turn on some math first.</p>
      )}
      {printArea}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function LockSection() {
  const { settings, updateSettings, lockParent } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [message, setMessage] = useState('');
  return (
    <div className="section-grid">
      <Setting label="Lock now">
        <button type="button" className="brick red" onClick={() => lockParent()}>
          🔒 Lock
        </button>
      </Setting>
      <Setting label="Auto-lock" help="The grown-ups area locks itself after this many idle minutes.">
        <NumberField label="Minutes" value={settings.autoLockMinutes} min={1} max={120} onChange={(autoLockMinutes) => updateSettings((s) => ({ ...s, autoLockMinutes }))} />
      </Setting>
      <Setting label="Change passcode">
        <input className="field" type="password" inputMode="numeric" placeholder="Current" value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, '').slice(0, MAX_PASSCODE_DIGITS))} aria-label="Current passcode" />
        <input className="field" type="password" inputMode="numeric" placeholder="New (4+ digits, numbers only)" value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, '').slice(0, MAX_PASSCODE_DIGITS))} aria-label="New passcode" />
        <button
          type="button"
          className="brick small"
          onClick={async () => {
            const rec = loadPasscode();
            if (!rec || !(await verifyPasscode(current, rec))) return setMessage('Current passcode is wrong.');
            if (!isValidPasscode(next)) return setMessage('Use 4 or more digits (numbers only).');
            const created = await createPasscode(next);
            savePasscode(created.record);
            setMessage('Passcode changed.');
            setCurrent('');
            setNext('');
          }}
        >
          Save
        </button>
        {message ? <span role="status">{message}</span> : null}
      </Setting>
      <Setting label="Start over" help="Puts every setting back to the original. Progress is kept.">
        <button
          type="button"
          className="brick small ghost"
          onClick={() => {
            if (globalThis.confirm('Reset all settings?')) updateSettings(() => defaultSettings());
          }}
        >
          ↺ Reset settings
        </button>
      </Setting>
      <Setting label="About">
        <span className="help">
          The passcode is stored only as a salted hash in this browser. It keeps little hands out, but anyone who clears this browser’s data for the site resets it (along with settings and progress). There is no recovery code, so write the passcode down somewhere safe.
        </span>
      </Setting>
    </div>
  );
}
