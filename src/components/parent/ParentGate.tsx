import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { loadLockout, lockoutAfterFailure, MAX_PASSCODE_DIGITS, saveLockout } from '../../state/security';

export function PinPad({ value, onChange, onEnter, maxLength = MAX_PASSCODE_DIGITS, label }: { value: string; onChange: (v: string) => void; onEnter: () => void; maxLength?: number; label: string }) {
  return (
    <div>
      <div className="pin-dots" aria-label={`${value.length} digits entered`} role="status">
        {Array.from({ length: Math.max(4, value.length) }, (_, i) => (
          <span key={i} className={i < value.length ? 'filled' : ''} />
        ))}
      </div>
      <input
        className="field"
        style={{ width: '100%', textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.4rem' }}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, maxLength))}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        autoFocus
      />
      <div className="keypad" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 300 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} type="button" className="brick white" onClick={() => value.length < maxLength && onChange(value + d)} aria-label={String(d)}>
            {d}
          </button>
        ))}
        <button type="button" className="brick ghost" onClick={() => onChange(value.slice(0, -1))} aria-label="Delete">
          ⌫
        </button>
        <button type="button" className="brick white" onClick={() => value.length < maxLength && onChange(value + '0')} aria-label="0">
          0
        </button>
        <button type="button" className="brick green" onClick={onEnter} aria-label="Enter">
          ✓
        </button>
      </div>
    </div>
  );
}

/**
 * Sign-in for the grown-ups area. Only shown when a family passcode exists (by default there is none and the area is
 * open; the passcode is made in 🔒 Passcode). "Forgot passcode?" can remove it after a confirmation.
 */
export function ParentGate() {
  const { unlockParent, resetPasscode, checkPasscode, familyMode, signIn } = useApp();
  const [pin, setPin] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockout, setLockout] = useState(loadLockout);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (lockout.lockedUntil <= now) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockout.lockedUntil, now]);

  const lockedFor = Math.max(0, Math.ceil((lockout.lockedUntil - now) / 1000));

  const submit = async () => {
    if (busy) return;
    setMessage('');
    if (lockedFor > 0) return;
    setBusy(true);
    const ok = await checkPasscode(pin);
    setBusy(false);
    setPin('');
    if (ok) {
      saveLockout({ failures: 0, lockedUntil: 0 });
      setLockout({ failures: 0, lockedUntil: 0 });
      unlockParent();
    } else {
      const next = lockoutAfterFailure(lockout, Date.now());
      saveLockout(next);
      setLockout(next);
      setNow(Date.now());
      setMessage('Wrong passcode.');
    }
  };


  return (
    <section className="tile studded gate" aria-label="Grown-ups only">
      <h2>🔒 Grown-ups only</h2>
      <p>{familyMode ? `Hi ${signIn?.name ?? ''}! A grown-up enters the family passcode to open this area.` : 'Enter the passcode to sign in.'}</p>
      {lockedFor > 0 ? <p className="notice">Too many tries. Wait {lockedFor} s.</p> : null}
      <PinPad value={pin} onChange={setPin} onEnter={() => void submit()} label="Passcode" />
      {!familyMode ? (
        <button type="button" className="brick small ghost" onClick={() => setShowForgot((v) => !v)} aria-expanded={showForgot}>
          Forgot passcode?
        </button>
      ) : null}
      {showForgot && !familyMode ? (
        <div className="notice">
          <p>Reset the passcode to open the grown-ups area again. Settings and progress are kept. You can make a new passcode in 🔒 Passcode.</p>
          <button
            type="button"
            className="brick small red"
            onClick={() => {
              if (globalThis.confirm('Remove the passcode? The grown-ups area will be open until you set a new one.')) resetPasscode();
            }}
          >
            ↺ Reset passcode
          </button>
        </div>
      ) : null}
      {message ? (
        <p className="feedback incorrect" role="alert">
          {message}
        </p>
      ) : null}
      <p>
        <a href="#/" className="brick small ghost">
          ← Back to math
        </a>
      </p>
    </section>
  );
}
