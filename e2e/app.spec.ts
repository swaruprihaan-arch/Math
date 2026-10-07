import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { quizAnswer, settingsWith, useSettings } from './helpers';

const quizSettings = settingsWith((s) => ({
  ...s,
  session: { ...s.session, mode: 'QUIZ', quizLength: 3, quizCode: '4821', strategies: 'AFTER_ANSWER' },
  input: { modes: ['KEYPAD', 'WRITE', 'TYPE'], defaultMode: 'TYPE', keypadStyle: 'TALLY', keypadLayout: 'PHONE', opButtons: true, writeSpeed: 'NORMAL' },
}));

test('loads under the /rihaan-math/ sub-path with the brick kid screen', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/Math Lab/);
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your answer' })).toBeVisible();
  // Kid side shows no settings — those live behind the passcode.
  await expect(page.getByText('Level')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Grown-ups area/ })).toBeVisible();
});

test('quiz: correct answers, strategies, score screen (answers computed from the same seed)', async ({ page }) => {
  await useSettings(page, quizSettings);
  await page.goto('./');
  // Quiz mode starts by itself — the child only sees questions.
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  for (let i = 0; i < 3; i++) {
    const answer = quizAnswer(quizSettings, i);
    const choice = page.getByRole('group', { name: 'Answer choices' });
    if (await choice.isVisible().catch(() => false)) {
      await choice.locator(`button`).filter({ hasText: new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();
    } else if (await page.getByLabel('Numerator (top)').isVisible().catch(() => false)) {
      const m = /^(-?)(?:(\d+) )?(\d+)\/(\d+)$/.exec(answer) ?? /^(-?)(\d+)$/.exec(answer);
      if (m && m[4]) {
        if (m[2]) await page.getByLabel('Whole number').fill(m[2]);
        await page.getByLabel('Numerator (top)').fill(m[3] ?? '');
        await page.getByLabel('Denominator (bottom)').fill(m[4]);
      } else if (m) await page.getByLabel('Whole number').fill(m[2] ?? '');
      await page.getByRole('button', { name: '✓ Check' }).click();
    } else {
      await page.getByRole('textbox', { name: 'Your answer' }).fill(answer);
      await page.getByRole('button', { name: '✓ Check' }).click();
    }
    await expect(page.locator('.feedback.correct')).toBeVisible();
    if (i === 0) {
      await page.getByRole('button', { name: '💡 Ways' }).click();
      const ways = page.getByRole('region', { name: 'Ways to solve' });
      await expect(ways).toBeVisible();
      const tabs = ways.getByRole('tab');
      expect(await tabs.count()).toBeGreaterThanOrEqual(2);
      await tabs.nth(1).click();
      await expect(ways.locator('.step').first()).toBeVisible();
    }
    await page.getByRole('button', { name: 'Next ➜' }).click();
  }
  await expect(page.getByRole('region', { name: 'Quiz finished' })).toBeVisible();
  await expect(page.locator('.score')).toHaveText(/3\s*\/\s*3/);
});

test('invalid input is a hint, not a wrong answer', async ({ page }) => {
  await useSettings(page, settingsWith((s) => ({ ...s, input: { modes: ['TYPE'], defaultMode: 'TYPE', keypadStyle: 'TALLY', keypadLayout: 'PHONE', opButtons: true, writeSpeed: 'NORMAL' } })));
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Your answer' }).fill('twelve-ish');
  await page.getByRole('button', { name: '✓ Check' }).click();
  await expect(page.locator('.feedback.invalid')).toBeVisible();
  await expect(page.locator('.feedback.incorrect')).toHaveCount(0);
});

test('parent area: passcode create, lock, wrong code, unlock, choose math', async ({ page }) => {
  await page.goto('./#/parent');
  const gate = page.getByRole('region', { name: 'Grown-ups only' });
  await expect(gate).toBeVisible();
  await page.getByRole('textbox', { name: 'Passcode', exact: true }).fill('2468');
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.getByRole('textbox', { name: 'Confirm passcode' }).fill('2468');
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page.getByRole('heading', { name: 'Grown-ups' })).toBeVisible();

  // The Parent area opens on 🏠 Start; choose the math in 🧮 Math. Turn on fractions only.
  await page.getByRole('tab', { name: '🧮 Math' }).click();
  await page.locator('.topic-card', { hasText: 'Whole numbers' }).locator('.toggle').click();
  await page.locator('.topic-card', { hasText: 'Fractions' }).locator('.toggle').first().click();
  await page.getByRole('link', { name: /Back to math/ }).click();
  await expect(page.getByLabel(/Numerator \(top\)/)).toBeVisible();

  // Leaving the parent area locks it again; wrong code is refused.
  await page.getByRole('link', { name: /Grown-ups area/ }).click();
  await page.getByRole('textbox', { name: 'Passcode', exact: true }).fill('1111');
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page.getByRole('alert')).toContainText('Wrong passcode');
  await page.getByRole('textbox', { name: 'Passcode', exact: true }).fill('2468');
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page.getByRole('heading', { name: 'Grown-ups' })).toBeVisible();
});

test('grade level math: California K–8 skills are selectable', async ({ page }) => {
  await useSettings(page, settingsWith((s) => ({ ...s, plan: { ...s.plan, arithmetic: { ...s.plan.arithmetic, enabled: false }, gradeLevel: { enabled: true, settings: { grade: '5', skillIds: [], difficulty: 'MEDIUM' } } } })));
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await page.goto('./#/parent');
  await page.getByRole('textbox', { name: 'Passcode', exact: true }).fill('1357');
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.getByRole('textbox', { name: 'Confirm passcode' }).fill('1357');
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.getByRole('tab', { name: '🎓 Grade Level Math' }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('Grade 5');
  await expect(panel.getByText('5.OA.2.1')).toBeVisible();
  for (const g of ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8']) {
    await panel.getByRole('group', { name: 'Grade' }).getByRole('button', { name: g, exact: true }).click();
    expect(await panel.locator('.skill-item').count()).toBeGreaterThan(10);
  }
  // Grade-level-only is already on in this test, so the panel says so instead of offering the button.
  await expect(panel.getByText('Your child is practising Grade 8')).toBeVisible();
  await page.getByRole('link', { name: /Back to math/ }).click();
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
});

test('no horizontal scrolling on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('accessibility: no serious axe violations on kid and parent screens', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  const kid = await new AxeBuilder({ page }).analyze();
  const serious = kid.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  await page.goto('./#/parent');
  await expect(page.getByRole('region', { name: 'Grown-ups only' })).toBeVisible();
  const gate = await new AxeBuilder({ page }).analyze();
  expect(gate.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});
