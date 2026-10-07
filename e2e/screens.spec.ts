import { expect, test } from '@playwright/test';
import { quizAnswer, settingsWith, useSettings } from './helpers';

const OUT = process.env.SHOT_DIR;
test.skip(!OUT, 'screenshots only when SHOT_DIR is set');

async function unlock(page: import('@playwright/test').Page) {
  await page.goto('./#/parent');
  await page.getByRole('textbox', { name: 'Passcode', exact: true }).fill('2468');
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.getByRole('textbox', { name: 'Confirm passcode' }).fill('2468');
  await page.getByRole('button', { name: 'Enter' }).click();
}

test('kid: answered + strategies', async ({ page }, info) => {
  const s = settingsWith((x) => ({ ...x, session: { ...x.session, mode: 'QUIZ', quizLength: 2, quizCode: '5150' }, input: { modes: ['KEYPAD', 'WRITE', 'TYPE'], defaultMode: 'TYPE', keypadStyle: 'TALLY', keypadLayout: 'PHONE', opButtons: true, writeSpeed: 'NORMAL' } }));
  await useSettings(page, s);
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Your answer' }).fill(quizAnswer(s, 0));
  await page.getByRole('button', { name: '✓ Check' }).click();
  await page.getByRole('button', { name: '💡 Ways' }).click();
  await page.getByRole('button', { name: 'Show all steps' }).click().catch(() => undefined);
  await page.screenshot({ path: `${OUT}/${info.project.name}-strategies.png`, fullPage: true });
  await page.getByRole('tab').last().click();
  await page.screenshot({ path: `${OUT}/${info.project.name}-bricks-model.png`, fullPage: true });
});

test('kid: fractions', async ({ page }, info) => {
  await useSettings(page, settingsWith((x) => ({ ...x, plan: { ...x.plan, arithmetic: { ...x.plan.arithmetic, enabled: false }, fractions: { ...x.plan.fractions, enabled: true } } })));
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await page.screenshot({ path: `${OUT}/${info.project.name}-fractions.png`, fullPage: true });
});

for (const grade of ['1', '2', '3', '5', '8'] as const) {
  test(`kid: grade ${grade}`, async ({ page }, info) => {
    await useSettings(page, settingsWith((x) => ({ ...x, plan: { ...x.plan, arithmetic: { ...x.plan.arithmetic, enabled: false }, gradeLevel: { enabled: true, settings: { grade, skillIds: [], difficulty: 'MEDIUM' } } } })));
    await page.goto('./');
    for (let i = 0; i < 2; i++) {
      await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
      await page.screenshot({ path: `${OUT}/${info.project.name}-grade${grade}-${i}.png`, fullPage: false });
      // skip ahead by answering anything 3 times (reveals answer, then next)
      for (let t = 0; t < 3; t++) {
        const choice = page.getByRole('group', { name: 'Answer choices' });
        if (await choice.isVisible().catch(() => false)) {
          await choice.getByRole('button').first().click();
        } else {
          await page.getByRole('button', { name: '7' }).first().click();
          await page.getByRole('button', { name: '✓ Check' }).click();
        }
        if (await page.getByRole('button', { name: 'Next ➜' }).isVisible().catch(() => false)) break;
      }
      await page.getByRole('button', { name: 'Next ➜' }).click().catch(() => undefined);
    }
  });
}

test('parent sections', async ({ page }, info) => {
  await unlock(page);
  for (const name of ['🧮 Math', '⏱ Session', '🎨 Look', '🎉 Fun', '📈 Progress', '🖨 Worksheets']) {
    await page.getByRole('tab', { name }).click();
    await page.screenshot({ path: `${OUT}/${info.project.name}-parent-${name.replace(/[^A-Za-z]/g, '')}.png`, fullPage: true });
  }
});

test('quiz done + night theme', async ({ page }, info) => {
  const s = settingsWith((x) => ({ ...x, look: { ...x.look, baseplate: 'NIGHT', theme: 2 }, session: { ...x.session, mode: 'QUIZ', quizLength: 1, quizCode: '2468' }, input: { modes: ['TYPE'], defaultMode: 'TYPE', keypadStyle: 'TALLY', keypadLayout: 'PHONE', opButtons: true, writeSpeed: 'NORMAL' } }));
  await useSettings(page, s);
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await page.screenshot({ path: `${OUT}/${info.project.name}-night.png`, fullPage: true });
  await page.getByRole('textbox', { name: 'Your answer' }).fill(quizAnswer(s, 0));
  await page.getByRole('button', { name: '✓ Check' }).click();
  await page.getByRole('button', { name: 'Next ➜' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${info.project.name}-quizdone.png`, fullPage: true });
});

test('parent grade level tab + filled answer', async ({ page }, info) => {
  await unlock(page);
  await page.getByRole('tab', { name: '🎓 Grade Level Math' }).click();
  await page.getByRole('group', { name: 'Grade' }).getByRole('button', { name: 'Grade 4' }).click();
  await page.screenshot({ path: `${OUT}/${info.project.name}-parent-grade.png`, fullPage: true });
});
