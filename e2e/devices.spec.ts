import { expect, test } from '@playwright/test';
import { settingsWith, useSettings, noFamily } from './helpers';

test.beforeEach(async ({ page }) => {
  await noFamily(page);
});

const WIDE = new Set(['ipad-landscape', 'desktop', 'mac-safari']);

test('wide screens (iPad landscape, Mac): question and answer pad sit side by side', async ({ page }, info) => {
  test.skip(!WIDE.has(info.project.name), 'side-by-side layout is for wide landscape screens');
  await page.goto('./');
  const q = await page.getByRole('region', { name: 'Question' }).boundingBox();
  const a = await page.getByRole('region', { name: 'Your answer' }).boundingBox();
  expect(q && a).toBeTruthy();
  expect(a!.x).toBeGreaterThan(q!.x + q!.width - 4);
  // The check key is reachable without scrolling on an iPad in landscape.
  if (info.project.name === 'ipad-landscape') {
    const check = await page.getByRole('button', { name: 'Check answer' }).boundingBox();
    expect(check!.y + check!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 2);
  }
});

test('every screen size: no sideways scrolling and big touch targets', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const keys = page.getByRole('group', { name: 'Number keys' }).getByRole('button');
  const count = await keys.count();
  for (let i = 0; i < count; i++) {
    const box = await keys.nth(i).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
});

test('simple kid screen: no logo or speaker button by default, tally keys in phone order', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Math Lab home' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Read the question aloud' })).toHaveCount(0);
  const keys = page.getByRole('group', { name: 'Number keys' });
  const labels = await keys.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(labels.slice(0, 3)).toEqual(['1', '2', '3']);
  expect(await keys.getByRole('button', { name: '7' }).locator('svg.tally').count()).toBe(1);
});

test('taps on the keypad build the answer (touch devices)', async ({ page }, info) => {
  await useSettings(page, settingsWith((s) => ({ ...s, input: { ...s.input, modes: ['KEYPAD'], defaultMode: 'KEYPAD' } })));
  await page.goto('./');
  const keys = page.getByRole('group', { name: 'Number keys' });
  const tap = async (name: string) => (info.project.use.hasTouch ? keys.getByRole('button', { name, exact: true }).tap() : keys.getByRole('button', { name, exact: true }).click());
  await tap('4');
  await tap('2');
  await expect(page.getByRole('status', { name: 'Your answer: 42' })).toBeVisible();
});

test('a child who cannot read yet gets picture-only buttons', async ({ page }) => {
  await useSettings(page, settingsWith((s) => ({ ...s, child: { ...s.child, reader: 'NOT_YET' }, input: { ...s.input, modes: ['TYPE'], defaultMode: 'TYPE' } })));
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Your answer' }).fill('999999');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.locator('.feedback.icon-only')).toBeVisible();
  await expect(page.getByRole('button', { name: '💡 Ways' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ways to solve' })).toBeVisible();
});

test('parents start a quiz from the Start tab and the child lands straight in it', async ({ page }) => {
  await page.goto('./#/parent');
  await expect(page.getByRole('tab', { name: /Start/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: /Start quiz/ }).click();
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await expect(page.locator('.progress-bricks')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start$/ })).toHaveCount(0);
});

test('worksheet number is a simple 4–7 digit number', async ({ page }) => {
  await page.goto('./#/parent');
  await page.getByRole('tab', { name: /Worksheets/ }).click();
  const field = page.getByRole('textbox', { name: 'Worksheet number' });
  await expect(field).toHaveValue(/^\d{4}$/);
  await field.fill('12ab345');
  await expect(field).toHaveValue('12345');
});
