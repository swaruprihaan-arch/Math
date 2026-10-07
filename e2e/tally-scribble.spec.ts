import { expect, test, type Page } from '@playwright/test';
import { setLevel, settingsWith, useSettings, noFamily } from './helpers';

test.beforeEach(async ({ page }) => {
  await noFamily(page);
});

async function draw(page: Page, canvasLabel: string, strokes: [number, number][][]) {
  const canvas = page.getByRole('img', { name: canvasLabel });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  for (const stroke of strokes) {
    const [first, ...rest] = stroke;
    await page.mouse.move(box.x + first![0] * box.width, box.y + first![1] * box.height);
    await page.mouse.down();
    for (const [x, y] of rest) await page.mouse.move(box.x + x * box.width, box.y + y * box.height, { steps: 6 });
    await page.mouse.up();
  }
}

test('tally marks: tap to select and deselect', async ({ page }) => {
  // Easy level keeps answers small (tally marks are offered for whole-number answers up to 100).
  await useSettings(page, settingsWith((s) => ({ ...setLevel(s, 'EASY'), input: { ...s.input, modes: ['TALLY', 'KEYPAD'], defaultMode: 'TALLY' } })));
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await page.getByRole('button', { name: 'Tally mark 1', exact: true }).click();
  await page.getByRole('button', { name: 'Tally mark 2', exact: true }).click();
  await page.getByRole('button', { name: 'Tally mark 3', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Your answer: 3' })).toBeVisible();
  await page.getByRole('button', { name: 'Tally mark 2', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Your answer: 2' })).toBeVisible();
});

test('tally marks: draw them and they turn into a number', async ({ page }) => {
  await useSettings(page, settingsWith((s) => ({ ...setLevel(s, 'EASY'), input: { ...s.input, modes: ['TALLY'], defaultMode: 'TALLY' } })));
  await page.goto('./');
  await page.getByRole('button', { name: 'Draw tally marks' }).click();
  const lines: [number, number][][] = [0.2, 0.28, 0.36, 0.44].map((x) => [
    [x, 0.15],
    [x, 0.85],
  ]);
  await draw(page, 'Draw tally marks here', lines);
  await expect(page.getByRole('status', { name: 'Your answer: 4' })).toBeVisible({ timeout: 5000 });
});

test('handwriting turns into typed text (Scribble-style) and adds to the answer', async ({ page }) => {
  await useSettings(page, settingsWith((s) => ({ ...s, input: { ...s.input, modes: ['WRITE', 'KEYPAD'], defaultMode: 'WRITE' } })));
  await page.goto('./');
  // A "7": top bar then a diagonal down-left.
  await draw(page, 'Write your answer here', [
    [
      [0.42, 0.18],
      [0.58, 0.18],
      [0.47, 0.85],
    ],
  ]);
  await expect(page.getByRole('status', { name: 'Your answer: 7' })).toBeVisible({ timeout: 5000 });
  // Writing again appends ("1" → "71").
  await draw(page, 'Write your answer here', [
    [
      [0.5, 0.15],
      [0.5, 0.85],
    ],
  ]);
  await expect(page.getByRole('status', { name: /Your answer: 7[17]/ })).toBeVisible({ timeout: 5000 });
});
