import { expect, test } from '@playwright/test';

/** Family mode is ON by default: the site opens on Sign in / Sign up. */
test('family: sign up, sign out, wrong name refused, child signs in, family code moves to another device', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Welcome to Math Lab/ })).toBeVisible();

  // Sign up (no accounts yet → Sign up is shown first).
  await page.getByLabel('Grown-up 1').fill('Mom');
  await page.getByLabel('Child 1').fill('Ava');
  await page.getByLabel('New family passcode', { exact: true }).fill('24680');
  await page.getByLabel('New family passcode again').fill('24680');
  await page.getByRole('button', { name: 'Create account' }).click();
  // The grown-up who signed up lands in the grown-ups area, working on Ava's settings.
  await expect(page.getByRole('heading', { name: 'Grown-ups' })).toBeVisible();
  await expect(page.locator('.child-badge')).toHaveText(/Ava/);

  // Copy the family code.
  await page.getByRole('tab', { name: '👪 Family' }).click();
  await page.getByRole('button', { name: /Copy family code/ }).click();
  const code = await page.getByLabel('Family code').inputValue();
  expect(code.length).toBeGreaterThan(50);

  // Sign out → welcome; a name that is not on the account is refused.
  page.on('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: /Sign out/ }).click();
  await expect(page.getByRole('heading', { name: /Welcome to Math Lab/ })).toBeVisible();
  await page.getByLabel('Your name').fill('Stranger');
  await page.getByLabel('Family passcode', { exact: true }).fill('24680');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(page.getByRole('alert')).toContainText('do not match');

  // The child signs in and plays; the grown-ups area still needs the passcode.
  await page.getByLabel('Your name').fill('ava');
  await page.getByLabel('Family passcode', { exact: true }).fill('24680');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await page.getByRole('link', { name: /Grown-ups area/ }).click();
  await expect(page.getByRole('region', { name: 'Grown-ups only' })).toBeVisible();

  // "Another device": a fresh browser context, add the family with the code, sign in.
  const other = await context.browser()!.newContext();
  const page2 = await other.newPage();
  await page2.goto(page.url().replace(/#.*$/, ''));
  await page2.getByRole('tab', { name: 'Add from another device' }).click();
  await page2.getByLabel('Family code').fill(code);
  await page2.getByRole('button', { name: 'Add family' }).click();
  await expect(page2.getByRole('status')).toContainText('Family added');
  await page2.getByLabel('Your name').fill('Mom');
  await page2.getByLabel('Family passcode', { exact: true }).fill('24680');
  await page2.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(page2.getByRole('heading', { name: 'Grown-ups' }).or(page2.getByRole('region', { name: 'Question' }))).toBeVisible();
  await other.close();
});
