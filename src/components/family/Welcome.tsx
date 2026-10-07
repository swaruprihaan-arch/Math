import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { createAccount, loadAccounts, MAX_CHILDREN, MAX_PARENTS, signInWith, validateSignUp } from '../../state/accounts';
import { isValidPasscode, MAX_PASSCODE_DIGITS } from '../../state/security';

const digits = (v: string) => v.replace(/\D/g, '').slice(0, MAX_PASSCODE_DIGITS);

/** A list of name boxes with + / ✕ (grown-ups or children). */
function NameList({ label, names, onChange, max, placeholder }: { label: string; names: string[]; onChange: (n: string[]) => void; max: number; placeholder: string }) {
  return (
    <fieldset className="name-list">
      <legend>{label}</legend>
      {names.map((n, i) => (
        <div key={i} className="name-row">
          <input
            className="field"
            value={n}
            maxLength={30}
            placeholder={placeholder}
            aria-label={`${label} ${i + 1}`}
            autoComplete="off"
            onChange={(e) => onChange(names.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {names.length > 1 ? (
            <button type="button" className="brick small ghost" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} title="Remove" onClick={() => onChange(names.filter((_, j) => j !== i))}>
              ✕
            </button>
          ) : null}
        </div>
      ))}
      {names.length < max ? (
        <button type="button" className="brick small ghost" onClick={() => onChange([...names, ''])}>
          ＋ Add another
        </button>
      ) : null}
    </fieldset>
  );
}

/**
 * Family mode welcome screen: Sign in (a name on the account + the family passcode) or Sign up (grown-ups' names,
 * children's names and a new passcode).
 */
export function Welcome() {
  const { completeSignIn, setFamilyMode } = useApp();
  const [tab, setTab] = useState<'in' | 'up'>(() => (loadAccounts().length === 0 ? 'up' : 'in'));
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [parents, setParents] = useState<string[]>(['']);
  const [kids, setKids] = useState<string[]>(['']);
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const doSignIn = async () => {
    if (busy) return;
    setMessage('');
    if (!name.trim()) return setMessage('Type your name.');
    if (!pin) return setMessage('Type the family passcode.');
    setBusy(true);
    const result = await signInWith(name, pin);
    setBusy(false);
    setPin('');
    if (!result) return setMessage('That name and passcode do not match an account on this device.');
    completeSignIn(result);
  };

  const doSignUp = async () => {
    if (busy) return;
    setMessage('');
    const problem = validateSignUp({ parents, children: kids, passcode: newPin });
    if (problem) return setMessage(problem);
    if (!isValidPasscode(newPin)) return setMessage('The passcode needs 4 or more digits (numbers only).');
    if (newPin !== newPin2) return setMessage('The two passcodes do not match.');
    setBusy(true);
    try {
      const account = await createAccount({ parents, children: kids, passcode: newPin });
      const first = account.parents[0] as string;
      completeSignIn({ account, signIn: { accountId: account.id, role: 'PARENT', name: first } });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app welcome-screen">
      <section className="tile welcome-card" aria-label="Welcome">
        <h1>👋 Welcome to Math Lab</h1>
        <div className="segmented welcome-tabs" role="tablist" aria-label="Sign in or sign up">
          <button type="button" role="tab" aria-selected={tab === 'in'} aria-pressed={tab === 'in'} onClick={() => (setTab('in'), setMessage(''))}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={tab === 'up'} aria-pressed={tab === 'up'} onClick={() => (setTab('up'), setMessage(''))}>
            Sign up
          </button>
        </div>

        {tab === 'in' ? (
          <form
            className="welcome-form"
            onSubmit={(e) => {
              e.preventDefault();
              void doSignIn();
            }}
          >
            <label className="welcome-field">
              <span>Your name (grown-up or child)</span>
              <input className="field" value={name} maxLength={30} autoComplete="off" onChange={(e) => setName(e.target.value)} aria-label="Your name" />
            </label>
            <label className="welcome-field">
              <span>Family passcode</span>
              <input className="field" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(digits(e.target.value))} aria-label="Family passcode" />
            </label>
            <button type="submit" className="brick big green" disabled={busy}>
              Sign in
            </button>
          </form>
        ) : (
          <form
            className="welcome-form"
            onSubmit={(e) => {
              e.preventDefault();
              void doSignUp();
            }}
          >
            <NameList label="Grown-up" names={parents} onChange={setParents} max={MAX_PARENTS} placeholder="e.g. Mom, Dad, Grandma" />
            <NameList label="Child" names={kids} onChange={setKids} max={MAX_CHILDREN} placeholder="Child’s name" />
            <label className="welcome-field">
              <span>Make a family passcode (4+ digits, numbers only)</span>
              <input className="field" type="password" inputMode="numeric" autoComplete="off" value={newPin} onChange={(e) => setNewPin(digits(e.target.value))} aria-label="New family passcode" />
            </label>
            <label className="welcome-field">
              <span>Type it again</span>
              <input className="field" type="password" inputMode="numeric" autoComplete="off" value={newPin2} onChange={(e) => setNewPin2(digits(e.target.value))} aria-label="New family passcode again" />
            </label>
            <button type="submit" className="brick big green" disabled={busy}>
              Create account
            </button>
          </form>
        )}

        {message ? (
          <p className="feedback incorrect" role="alert">
            {message}
          </p>
        ) : null}
        <p className="welcome-note">Accounts are saved only on this device. Grown-ups sign in to change settings; children sign in to play with their own settings.</p>
        <button
          type="button"
          className="brick small ghost"
          onClick={() => {
            if (globalThis.confirm('Turn off family mode? Math Lab goes back to one shared player on this device. Family accounts stay saved.')) setFamilyMode(false);
          }}
        >
          Use without an account
        </button>
      </section>
    </div>
  );
}

