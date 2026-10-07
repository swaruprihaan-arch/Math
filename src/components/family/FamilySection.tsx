import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { exportAccount, MAX_CHILDREN, MAX_PARENTS } from '../../state/accounts';
import { Setting, Toggle } from '../common/Controls';

/**
 * 👪 Family tab: turn family mode on/off; with an account, edit the grown-ups and children, pick who is playing,
 * sign out, or delete the account. Every child has their own settings (all other tabs change the child playing now).
 */
export function FamilySection() {
  const { familyMode, setFamilyMode, account, activeChild, switchChild, addChild, removeChild, renameChild, setParents, signOut, removeAccount, signIn } = useApp();
  const [newChild, setNewChild] = useState('');
  const [newParent, setNewParent] = useState('');
  const [copied, setCopied] = useState('');
  const [copyNote, setCopyNote] = useState('');

  if (!familyMode || !account) {
    return (
      <div className="section-grid">
        <Setting
          label="Family mode"
          help="Each child gets their own profile with their own settings and progress. When Math Lab opens, everyone signs in with their name and the family passcode; new families sign up with the grown-ups’ and children’s names."
        >
          <Toggle
            checked={familyMode}
            onChange={(on) => {
              if (on && !globalThis.confirm('Turn on family mode? You will sign up (or sign in) with your family’s names and a family passcode next.')) return;
              setFamilyMode(on);
            }}
            label="👪 Turn on family mode"
          />
        </Setting>
      </div>
    );
  }

  return (
    <div className="section-grid">
      <Setting label="Signed in" help="Signing out shows the Sign in / Sign up screen.">
        <p className="family-who">
          {signIn?.role === 'PARENT' ? '🧑' : '🧒'} {signIn?.name}
        </p>
        <button type="button" className="brick small ghost" onClick={signOut}>
          ⏻ Sign out
        </button>
      </Setting>

      <Setting label="Who is playing?" help="Every other tab (Math, Answers, Look, Progress…) changes the settings of the child picked here.">
        <div className="child-picker" role="group" aria-label="Who is playing">
          {account.children.map((c) => (
            <button key={c.id} type="button" className={`brick ${c.id === activeChild?.id ? 'green' : 'ghost'}`} aria-pressed={c.id === activeChild?.id} onClick={() => switchChild(c.id)}>
              🧒 {c.name}
            </button>
          ))}
        </div>
      </Setting>

      <Setting label="Children" help="Renaming keeps the child’s settings and progress. Removing a child deletes their profile.">
        {account.children.map((c) => (
          <div key={c.id} className="name-row">
            <input className="field" defaultValue={c.name} maxLength={30} aria-label={`Child name ${c.name}`} onBlur={(e) => renameChild(c.id, e.target.value)} />
            <button
              type="button"
              className="brick small ghost"
              disabled={account.children.length <= 1}
              aria-label={`Remove ${c.name}`}
              title={`Remove ${c.name}`}
              onClick={() => {
                if (globalThis.confirm(`Remove ${c.name}? Their settings and progress will be deleted.`)) removeChild(c.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
        {account.children.length < MAX_CHILDREN ? (
          <form
            className="name-row"
            onSubmit={(e) => {
              e.preventDefault();
              addChild(newChild);
              setNewChild('');
            }}
          >
            <input className="field" value={newChild} maxLength={30} placeholder="New child’s name" aria-label="New child’s name" onChange={(e) => setNewChild(e.target.value)} />
            <button type="submit" className="brick small green" disabled={!newChild.trim()}>
              ＋ Add child
            </button>
          </form>
        ) : null}
      </Setting>

      <Setting label="Grown-ups" help="These names (and the children’s) can sign in with the family passcode.">
        {account.parents.map((p, i) => (
          <div key={`${p}-${i}`} className="name-row">
            <input className="field" defaultValue={p} maxLength={30} aria-label={`Grown-up name ${p}`} onBlur={(e) => setParents(account.parents.map((x, j) => (j === i ? e.target.value : x)))} />
            <button
              type="button"
              className="brick small ghost"
              disabled={account.parents.length <= 1}
              aria-label={`Remove ${p}`}
              title={`Remove ${p}`}
              onClick={() => setParents(account.parents.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        {account.parents.length < MAX_PARENTS ? (
          <form
            className="name-row"
            onSubmit={(e) => {
              e.preventDefault();
              setParents([...account.parents, newParent]);
              setNewParent('');
            }}
          >
            <input className="field" value={newParent} maxLength={30} placeholder="New grown-up’s name" aria-label="New grown-up’s name" onChange={(e) => setNewParent(e.target.value)} />
            <button type="submit" className="brick small green" disabled={!newParent.trim()}>
              ＋ Add grown-up
            </button>
          </form>
        ) : null}
      </Setting>

      <Setting
        label="Use on another device"
        help="Copy the family code here, then on the other iPad, iPhone, Mac or Chromebook open Math Lab → Add from another device → paste it. Names, passcode, settings and progress come along. Copy it again after big changes to bring them over too."
      >
        <button
          type="button"
          className="brick small blue"
          onClick={async () => {
            const code = exportAccount(account);
            setCopied(code);
            setCopyNote('');
            try {
              await navigator.clipboard.writeText(code);
              setCopyNote('Copied! Paste it on the other device.');
            } catch {
              setCopyNote('Select the code below and copy it.');
            }
          }}
        >
          📋 Copy family code
        </button>
        {copyNote ? <span role="status">{copyNote}</span> : null}
        {copied ? <textarea className="field family-code" readOnly value={copied} rows={4} aria-label="Family code" onFocus={(e) => e.currentTarget.select()} /> : null}
      </Setting>

      <Setting label="Family mode" help="Turning it off goes back to one shared player. The family account stays saved for next time.">
        <Toggle checked onChange={(on) => !on && globalThis.confirm('Turn off family mode?') && setFamilyMode(false)} label="👪 Family mode is on" />
        <button
          type="button"
          className="brick small red"
          onClick={() => {
            if (globalThis.confirm('Delete this family account? Every child’s settings and progress will be erased.')) removeAccount(account.id);
          }}
        >
          🗑 Delete family account
        </button>
      </Setting>
    </div>
  );
}
