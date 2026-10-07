import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../../domain/random/random';
import { defaultPlan, focusPlan, generateFromPlan, planOperations, type PracticePlan } from '../../engines/plan/practicePlan';
import { defaultSettings, sanitizeSettings } from '../../state/settings';

function fourOps(): PracticePlan {
  const p = defaultPlan();
  return { ...p, arithmetic: { ...p.arithmetic, settings: { ...p.arithmetic.settings, enabledOperations: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'] } } };
}

describe('operation buttons (planOperations / focusPlan)', () => {
  it('lists only the operations the parent turned on, in + − × ÷ order', () => {
    expect(planOperations(defaultPlan())).toEqual(['ADD']);
    const p = fourOps();
    const two = { ...p, arithmetic: { ...p.arithmetic, settings: { ...p.arithmetic.settings, enabledOperations: ['DIVIDE' as const, 'ADD' as const] } } };
    expect(planOperations(two)).toEqual(['ADD', 'DIVIDE']);
  });

  it('ignores operations of sources that are switched off', () => {
    const p = defaultPlan();
    expect(planOperations({ ...p, decimals: { ...p.decimals, enabled: false } })).toEqual(['ADD']);
    expect(planOperations({ ...p, decimals: { ...p.decimals, enabled: true } })).toEqual(['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE']);
  });

  it('focusing on × only makes multiplication questions', () => {
    const plan = focusPlan(fourOps(), 'MULTIPLY');
    for (let i = 0; i < 40; i++) {
      const q = generateFromPlan(plan, createSeededRandom(`f${i}`));
      expect(q.subtype).toMatch(/^MULTIPLY/);
    }
  });

  it('null, or an operation that is not turned on, keeps the parent plan', () => {
    const p = defaultPlan();
    expect(focusPlan(p, null)).toBe(p);
    expect(focusPlan(p, 'DIVIDE')).toBe(p);
  });

  it('switches off sources without that operation (grade level, order of operations)', () => {
    const p = fourOps();
    const withGrade = { ...p, gradeLevel: { ...p.gradeLevel, enabled: true }, order: { ...p.order, enabled: true } };
    const f = focusPlan(withGrade, 'ADD');
    expect(f.gradeLevel.enabled).toBe(false);
    expect(f.order.enabled).toBe(false);
    expect(f.arithmetic.settings.enabledOperations).toEqual(['ADD']);
  });
});

describe('new parent settings', () => {
  it('have defaults and repair bad stored values', () => {
    const d = defaultSettings();
    expect(d.input.opButtons).toBe(true);
    expect(d.input.writeSpeed).toBe('NORMAL');
    expect(d.look.simple).toBe(true);
    const s = sanitizeSettings({ input: { writeSpeed: 'WARP', opButtons: false }, look: { simple: false } });
    expect(s.input.writeSpeed).toBe('NORMAL');
    expect(s.input.opButtons).toBe(false);
    expect(s.look.simple).toBe(false);
  });
});
