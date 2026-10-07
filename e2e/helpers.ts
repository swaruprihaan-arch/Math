import type { Page } from '@playwright/test';
import { canonicalInputString } from '../src/domain/answer/format';
import { createSeededRandom, deriveSeed } from '../src/domain/random/random';
import { generateFromPlan } from '../src/engines/plan/practicePlan';
import { sanitizeSettings, setLevel, type AppSettings } from '../src/state/settings';
export { setLevel };

const KEY = 'rihaan-math:v2:settings';

export function settingsWith(patch: (s: AppSettings) => AppSettings): AppSettings {
  return patch(sanitizeSettings(null));
}

/** Pre-load settings into localStorage before the app starts. BigInt-free, so plain JSON works. */
export async function useSettings(page: Page, settings: AppSettings) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('__seeded')) {
        localStorage.setItem(key, value);
        localStorage.setItem('rihaan-math:v2:family-mode', 'false');
        sessionStorage.setItem('__seeded', '1');
      }
    },
    [KEY, JSON.stringify(settings)] as const,
  );
}

/** Play without an account (family mode off), as most tests do. */
export async function noFamily(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__nofamily')) {
      localStorage.setItem('rihaan-math:v2:family-mode', 'false');
      sessionStorage.setItem('__nofamily', '1');
    }
  });
}

/** The exact answer a student would type for quiz question i (same seed → same question as the app). */
export function quizAnswer(settings: AppSettings, i: number): string {
  const q = generateFromPlan(settings.plan, createSeededRandom(deriveSeed(settings.session.quizCode, i)));
  return canonicalInputString(q);
}
