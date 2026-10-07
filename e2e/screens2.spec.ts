import { expect, test } from '@playwright/test';
import { quizAnswer, setLevel, settingsWith, useSettings } from './helpers';

const OUT = process.env.SHOT_DIR;
test.skip(!OUT, 'screenshots only when SHOT_DIR is set');

test('kid default', async ({ page }, info) => {
  await useSettings(page, settingsWith((s) => setLevel(s, 'EASY')));
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await page.screenshot({ path: `${OUT}/${info.project.name}-kid.png` });
});

test('kid tally + write', async ({ page }, info) => {
  await useSettings(page, settingsWith((s) => ({ ...setLevel(s, 'EASY'), input: { ...s.input, modes: ['TALLY', 'WRITE', 'KEYPAD'], defaultMode: 'TALLY' } })));
  await page.goto('./');
  for (const n of [1, 2, 3, 4, 5, 6, 7]) await page.getByRole('button', { name: `Tally mark ${n}`, exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${info.project.name}-tally.png`, fullPage: true });
  await page.getByRole('button', { name: 'Draw tally marks' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${info.project.name}-tally-draw.png`, fullPage: true });
  await page.getByRole('button', { name: 'Write it' }).click();
  await page.screenshot({ path: `${OUT}/${info.project.name}-write.png`, fullPage: true });
});

test('kid guided strategy game', async ({ page }, info) => {
  const s = settingsWith((x) => ({ ...x, session: { ...x.session, mode: 'QUIZ', quizLength: 3, quizCode: '5150' }, input: { ...x.input, modes: ['TYPE', 'KEYPAD'], defaultMode: 'TYPE' } }));
  await useSettings(page, s);
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Your answer' }).fill(quizAnswer(s, 0));
  await page.getByRole('button', { name: '✓ Check' }).click();
  await page.getByRole('button', { name: '💡 Ways' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${info.project.name}-guided.png`, fullPage: true });
});

test('parent start + strategies', async ({ page }, info) => {
  await page.goto('./#/parent');
  await page.getByRole('textbox', { name: 'Passcode', exact: true }).fill('2468');
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.getByRole('textbox', { name: 'Confirm passcode' }).fill('2468');
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.screenshot({ path: `${OUT}/${info.project.name}-parent-start.png`, fullPage: true });
  await page.getByRole('tab', { name: /Strategies/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${info.project.name}-parent-strategies.png`, fullPage: true });
  await page.getByRole('tab', { name: /Fun/ }).click();
  await page.screenshot({ path: `${OUT}/${info.project.name}-parent-fun.png`, fullPage: true });
});
