import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { PinPad } from '../parent/ParentGate';

type Action = 'PASSCODE' | 'PROGRESS';

/**
 * ↺ on the kid screen: reset the passcode or the progress. When a passcode is set it must be typed first, so a child
 * cannot wipe anything by accident.
 */
export function ResetMenu() {
  const { hasPasscode, resetPasscode, resetProgress, checkPasscode, familyMode } = useApp();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');

  const close = () => {
    setOpen(false);
    setAction(null);
    setPin('');
    setMessage('');
  };

  const run = (a: Action) => {
    if (a === 'PASSCODE') resetPasscode();
    else resetProgress();
    setAction(null);
    setPin('');
    setMessage(a === 'PASSCODE' ? 'Passcode removed. Make a new one in 🔒 Grown-ups → Passcode.' : 'Progress reset.');
  };

  const choose = (a: Action) => {
    setMessage('');
    if (a === 'PASSCODE' && !hasPasscode) return setMessage('There is no passcode to reset.');
    if (!hasPasscode) {
      if (globalThis.confirm('Erase all progress and quiz history on this device?')) run(a);
      return;
    }
    setAction(a);
  };

  const confirmPin = async () => {
    if (!action) return;
    if (!(await checkPasscode(pin))) {
      setPin('');
      return setMessage('Wrong passcode.');
    }
    run(action);
  };

  return (
    <>
      <button type="button" className="brick white icon-brick kid-reset" aria-label="Reset" title="Reset" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        ↺
      </button>
      {open ? (
        <div className="reset-backdrop" role="presentation" onClick={close}>
          <section className="tile reset-menu" role="dialog" aria-modal="true" aria-label="Reset" onClick={(e) => e.stopPropagation()}>
            <h2>↺ Reset</h2>
            {action ? (
              <>
                <p>{action === 'PASSCODE' ? 'Type the passcode to remove it.' : 'Type the passcode to erase all progress.'}</p>
                <PinPad value={pin} onChange={setPin} onEnter={() => void confirmPin()} label="Passcode" />
              </>
            ) : (
              <div className="reset-choices">
                <button type="button" className="brick red" onClick={() => choose('PASSCODE')} disabled={!hasPasscode || familyMode} title={familyMode ? 'Family accounts change the passcode in Grown-ups → Passcode' : undefined}>
                  🔑 Reset passcode
                </button>
                <button type="button" className="brick red" onClick={() => choose('PROGRESS')}>
                  🗑 Reset progress
                </button>
              </div>
            )}
            {message ? (
              <p className="reset-message" role="status">
                {message}
              </p>
            ) : null}
            <button type="button" className="brick small ghost" onClick={close}>
              Close
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
