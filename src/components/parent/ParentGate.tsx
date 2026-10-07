import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import {
  createPasscode,
  isValidPasscode,
  loadLockout,
  loadPasscode,
  lockoutAfterFailure,
  saveLockout,
  savePasscode,
  verifyPasscode,
  type PasscodeRecord,
} from '../../state/security';

function PinPad({ value, onChange, onEnter, maxLength = 8, label }: { value: string; onChange: (v: string) => void; onEnter: () => void; maxLength?: number; label: string }) {
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

type Stage = 'enter' | 'create' | 'confirm';

export function ParentGate() {
  const { unlockParent } = useApp();
  const [record, setRecord] = useState<PasscodeRecord | null>(() => loadPasscode());
  const [stage, setStage] = useState<Stage>(record ? 'enter' : 'create');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
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

  const finishCreate = async (code: string) => {
    setBusy(true);
    const created = await createPasscode(code);
    savePasscode(created.record);
    setRecord(created.record);
    setBusy(false);
    unlockParent();
  };

  const submit = async () => {
    if (busy) return;
    setMessage('');
    if (stage === 'create') {
      if (!isValidPasscode(pin)) return setMessage('Use 4 to 8 digits.');
      setFirstPin(pin);
      setPin('');
      setStage('confirm');
      return;
    }
    if (stage === 'confirm') {
      if (pin !== firstPin) {
        setPin('');
        setFirstPin('');
        setStage('create');
        return setMessage('Those did not match. Try again.');
      }
      await finishCreate(pin);
      setPin('');
      return;
    }
    if (stage === 'enter' && record) {
      if (lockedFor > 0) return;
      setBusy(true);
      const ok = await verifyPasscode(pin, record);
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
    }
  };

  return (
    <section className="tile studded gate" aria-label="Grown-ups only">
      <h2>🔒 Grown-ups only</h2>
      <p>
        {stage === 'create' && 'Make a passcode (4–8 digits) so only grown-ups can change the math.'}
        {stage === 'confirm' && 'Type the same passcode again.'}
        {stage === 'enter' && 'Enter the passcode.'}
      </p>
      {lockedFor > 0 && stage === 'enter' ? <p className="notice">Too many tries. Wait {lockedFor} s.</p> : null}
      <PinPad value={pin} onChange={setPin} onEnter={() => void submit()} label={stage === 'confirm' ? 'Confirm passcode' : 'Passcode'} />
      {stage === 'enter' ? (
        <button type="button" className="brick small ghost" onClick={() => setShowForgot((v) => !v)} aria-expanded={showForgot}>
          Forgot passcode?
        </button>
      ) : null}
      {showForgot && stage === 'enter' ? (
        <p className="notice">
          To start over, clear this website’s data in your browser settings. That also resets the settings and progress.
        </p>
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
