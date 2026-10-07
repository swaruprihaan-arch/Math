// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { addChild, createAccount, deleteAccount, loadAccounts, loadChildSettings, saveChildSettings, signInWith, validateSignUp } from '../../state/accounts';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('family accounts', () => {
  it('sign up needs a grown-up, a child and unique names', () => {
    expect(validateSignUp({ parents: [''], children: ['Ava'], passcode: '1234' })).toMatch(/grown-up/);
    expect(validateSignUp({ parents: ['Mom'], children: [' '], passcode: '1234' })).toMatch(/child/);
    expect(validateSignUp({ parents: ['Sam'], children: ['sam'], passcode: '1234' })).toMatch(/once/);
    expect(validateSignUp({ parents: ['Mom'], children: ['Ava'], passcode: '1234' })).toBeNull();
  });

  it('sign in only works with a name on the account AND the right passcode', async () => {
    await createAccount({ parents: ['Mom', 'Dad'], children: ['Ava', 'Leo'], passcode: '24680' });
    expect(await signInWith('Stranger', '24680')).toBeNull();
    expect(await signInWith('Mom', '11111')).toBeNull();
    const parent = await signInWith('  dad ', '24680');
    expect(parent?.signIn.role).toBe('PARENT');
    expect(parent?.signIn.name).toBe('Dad');
    const child = await signInWith('Leo', '24680');
    expect(child?.signIn.role).toBe('CHILD');
    expect(child?.account.children.find((c) => c.id === child.account.activeChildId)?.name).toBe('Leo');
  });

  it('every child has their own settings', async () => {
    const a = await createAccount({ parents: ['Mom'], children: ['Ava', 'Leo'], passcode: '1234' });
    const [ava, leo] = a.children;
    const s = loadChildSettings(ava!.id);
    saveChildSettings(ava!.id, { ...s, session: { ...s.session, quizLength: 25 } });
    expect(loadChildSettings(ava!.id).session.quizLength).toBe(25);
    expect(loadChildSettings(leo!.id).session.quizLength).toBe(10);
    expect(loadChildSettings(leo!.id).child.nickname).toBe('Leo');
  });

  it('two families on one device stay separate; deleting one keeps the other', async () => {
    const a = await createAccount({ parents: ['Mom'], children: ['Ava'], passcode: '1111' });
    await createAccount({ parents: ['Uncle Bo'], children: ['Kai'], passcode: '2222' });
    expect(await signInWith('Kai', '1111')).toBeNull();
    expect(await signInWith('Kai', '2222')).not.toBeNull();
    deleteAccount(a.id);
    expect(loadAccounts().map((x) => x.parents[0])).toEqual(['Uncle Bo']);
  });

  it('adding a child refuses duplicate names', async () => {
    const a = await createAccount({ parents: ['Mom'], children: ['Ava'], passcode: '1234' });
    expect(addChild(a, 'ava').children).toHaveLength(1);
    expect(addChild(a, 'Zoe').children.map((c) => c.name)).toEqual(['Ava', 'Zoe']);
  });
});
