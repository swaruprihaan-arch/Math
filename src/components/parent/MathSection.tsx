import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { SKILLS_BY_GRADE } from '../../curriculum/registry';
import { GRADE_LABELS } from '../../curriculum/types';
import type { ArithmeticOperator, Difficulty } from '../../domain/question/types';
import { createSeededRandom, generateSeedString } from '../../domain/random/random';
import type { FractionOperation } from '../../engines/fractions/fractionEngine';
import type { OrderOperator } from '../../engines/orderOfOperations/orderEngine';
import { generateFromPlan, validatePlan, type PracticePlan } from '../../engines/plan/practicePlan';
import { setLevel } from '../../state/settings';
import { MultiChips, NumberField, Segmented, Setting, Toggle } from '../common/Controls';
import { MathView } from '../QuestionCard/MathView';
import { VisualView } from '../QuestionCard/VisualView';

const OPS: { value: ArithmeticOperator; label: string }[] = [
  { value: 'ADD', label: 'Addition +' },
  { value: 'SUBTRACT', label: 'Subtraction −' },
  { value: 'MULTIPLY', label: 'Multiplication ×' },
  { value: 'DIVIDE', label: 'Division ÷' },
];

const FRACTION_OPS: { value: FractionOperation; label: string }[] = [
  { value: 'ADD', label: 'Addition' },
  { value: 'SUBTRACT', label: 'Subtraction' },
  { value: 'MULTIPLY', label: 'Multiplication' },
  { value: 'DIVIDE', label: 'Division' },
  { value: 'CONVERT', label: 'Mixed & Improper' },
  { value: 'SIMPLIFY', label: 'Simplify' },
  { value: 'COMPARE', label: 'Compare' },
];

const ORDER_OPS: { value: OrderOperator; label: string }[] = [
  { value: '+', label: '+' },
  { value: '-', label: '−' },
  { value: '*', label: '×' },
  { value: '/', label: '÷' },
  { value: '^', label: 'exponents' },
];

const LEVELS: { value: Difficulty; label: string }[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Standard' },
  { value: 'HARD', label: 'Hard' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function TopicCard({ title, on, onToggle, children }: { title: string; on: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className={`topic-card${on ? ' on' : ''}`}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{title}</h3>
        <Toggle checked={on} onChange={onToggle} label={<span className="sr-only">{title} on</span>} />
      </div>
      {on ? children : null}
    </div>
  );
}

export function MathSection() {
  const { settings, updateSettings } = useApp();
  const plan = settings.plan;
  const [sampleSeed, setSampleSeed] = useState(() => generateSeedString('SAMPLE'));

  const setPlan = (fn: (p: PracticePlan) => PracticePlan) => updateSettings((s) => ({ ...s, plan: fn(s.plan) }));
  const validation = validatePlan(plan);

  const sample = useMemo(() => {
    if (!validation.valid) return null;
    try {
      return generateFromPlan(plan, createSeededRandom(sampleSeed));
    } catch {
      return null;
    }
  }, [plan, sampleSeed, validation.valid]);

  const custom = settings.level === 'CUSTOM';
  const a = plan.arithmetic.settings;
  const f = plan.fractions.settings;
  const d = plan.decimals.settings;
  const gl = plan.gradeLevel.settings;
  const gradeSkills = SKILLS_BY_GRADE[gl.grade];
  const selected = new Set(gl.skillIds.length ? gl.skillIds : gradeSkills.map((s) => s.id));

  return (
    <div>
      <div className="section-grid">
        <Setting label="Level" help="Changes how big and tricky the numbers are for every kind of math.">
          <Segmented value={settings.level} options={LEVELS} onChange={(level) => updateSettings((s) => setLevel(s, level))} label="Level" />
        </Setting>
        <Setting label="Sample question" help="A preview of what your child will see.">
          {sample ? (
            <div style={{ background: 'var(--tile)', borderRadius: 12, padding: 10 }}>
              {sample.prompt.visual ? <VisualView visual={sample.prompt.visual} /> : null}
              <MathView nodes={sample.prompt.nodes} size="small" />
            </div>
          ) : (
            <span className="help">—</span>
          )}
          <button type="button" className="brick small ghost" onClick={() => setSampleSeed(generateSeedString('SAMPLE'))}>
            🔄 Another
          </button>
        </Setting>
      </div>

      {!validation.valid ? (
        <ul className="error-list" role="alert">
          {validation.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="section-grid" style={{ marginTop: 14 }}>
        <TopicCard title="➕ Whole numbers" on={plan.arithmetic.enabled} onToggle={(v) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, enabled: v } }))}>
          <MultiChips label="Operations" values={a.enabledOperations} options={OPS} onChange={(ops) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, settings: { ...a, enabledOperations: ops } } }))} />
          <Setting label="Division answers">
            <Segmented
              label="Division answers"
              value={a.divisionMode}
              options={[
                { value: 'EXACT_INTEGER', label: 'Whole' },
                { value: 'REMAINDER', label: 'Remainders' },
                { value: 'DECIMAL', label: 'Decimals' },
              ]}
              onChange={(divisionMode) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, settings: { ...a, divisionMode } } }))}
            />
          </Setting>
          {custom ? (
            <Setting label="Custom numbers" help="For ÷ the first range is the answer and the second is the number you divide by.">
              <div className="row">
                <NumberField label="1st from" value={a.operandRange.min} min={-100000} max={100000} onChange={(v) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, settings: { ...a, operandRange: { ...a.operandRange, min: v } } } }))} />
                <NumberField label="to" value={a.operandRange.max} min={-100000} max={100000} onChange={(v) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, settings: { ...a, operandRange: { ...a.operandRange, max: v } } } }))} />
              </div>
              <div className="row">
                <NumberField label="2nd from" value={a.secondOperandRange?.min ?? 1} min={-100000} max={100000} onChange={(v) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, settings: { ...a, secondOperandRange: { min: v, max: a.secondOperandRange?.max ?? 12 } } } }))} />
                <NumberField label="to" value={a.secondOperandRange?.max ?? 12} min={-100000} max={100000} onChange={(v) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, settings: { ...a, secondOperandRange: { min: a.secondOperandRange?.min ?? 1, max: v } } } }))} />
              </div>
              <NumberField label="Numbers in a problem" value={a.operandCount} min={2} max={4} onChange={(v) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, settings: { ...a, operandCount: v } } }))} />
              <Toggle checked={a.allowNegativeOperands} onChange={(v) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, settings: { ...a, allowNegativeOperands: v } } }))} label="Negative numbers" />
              <Toggle checked={a.allowNegativeResults} onChange={(v) => setPlan((p) => ({ ...p, arithmetic: { ...p.arithmetic, settings: { ...a, allowNegativeResults: v } } }))} label="Negative answers" />
            </Setting>
          ) : null}
        </TopicCard>

        <TopicCard title="🍕 Fractions" on={plan.fractions.enabled} onToggle={(v) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, enabled: v } }))}>
          <MultiChips label="Fraction operations" values={f.operations} options={FRACTION_OPS} onChange={(operations) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, operations } } }))} />
          <Setting label="Display">
            <Segmented
              label="Display"
              value={f.displayMode}
              options={[
                { value: 'AUTO', label: 'Auto' },
                { value: 'ALWAYS_MIXED', label: 'Always mixed' },
                { value: 'NEVER_MIXED', label: 'Never mixed' },
              ]}
              onChange={(displayMode) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, displayMode } } }))}
            />
          </Setting>
          <Setting label="Answer form">
            <Segmented
              label="Answer form"
              value={f.outputForm}
              options={[
                { value: 'EITHER', label: 'Either' },
                { value: 'IMPROPER', label: 'Improper' },
                { value: 'MIXED', label: 'Mixed' },
              ]}
              onChange={(outputForm) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, outputForm } } }))}
            />
          </Setting>
          <Setting label="Denominators for + and −">
            <Segmented
              label="Denominators"
              value={f.commonDenominatorMode}
              options={[
                { value: 'ANY', label: 'Any' },
                { value: 'SAME', label: 'Same' },
                { value: 'RELATED', label: 'Related' },
                { value: 'UNRELATED', label: 'Unrelated' },
              ]}
              onChange={(commonDenominatorMode) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, commonDenominatorMode } } }))}
            />
          </Setting>
          <Toggle checked={f.strictMixed} onChange={(v) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, strictMixed: v } } }))} label="Strict mixed (fraction part must be proper)" />
          <Toggle checked={f.requireSimplifiedAnswer} onChange={(v) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, requireSimplifiedAnswer: v } } }))} label="Answers in simplest form" />
          <Toggle checked={f.allowNegativeResult} onChange={(v) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, allowNegativeResult: v } } }))} label="Negative answers" />
          {custom ? (
            <Setting label="Custom fractions">
              <div className="row">
                <NumberField label="Denominators from" value={f.denominatorRange.min} min={2} max={100} onChange={(v) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, denominatorRange: { ...f.denominatorRange, min: v } } } }))} />
                <NumberField label="to" value={f.denominatorRange.max} min={2} max={100} onChange={(v) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, denominatorRange: { ...f.denominatorRange, max: v } } } }))} />
              </div>
              <Segmented
                label="Fractions in problems"
                value={f.inputForm}
                options={[
                  { value: 'ANY', label: 'Any' },
                  { value: 'PROPER', label: 'Proper' },
                  { value: 'IMPROPER', label: 'Improper' },
                  { value: 'MIXED', label: 'Mixed' },
                ]}
                onChange={(inputForm) => setPlan((p) => ({ ...p, fractions: { ...p.fractions, settings: { ...f, inputForm } } }))}
              />
            </Setting>
          ) : null}
        </TopicCard>

        <TopicCard title="🔢 Decimals" on={plan.decimals.enabled} onToggle={(v) => setPlan((p) => ({ ...p, decimals: { ...p.decimals, enabled: v } }))}>
          <MultiChips label="Decimal operations" values={d.operations} options={OPS} onChange={(operations) => setPlan((p) => ({ ...p, decimals: { ...p.decimals, settings: { ...d, operations } } }))} />
          {custom ? (
            <div className="row">
              <NumberField label="Decimal places" value={d.places} min={1} max={4} onChange={(v) => setPlan((p) => ({ ...p, decimals: { ...p.decimals, settings: { ...d, places: v } } }))} />
              <NumberField label="Biggest number" value={d.maxValue} min={1} max={100000} onChange={(v) => setPlan((p) => ({ ...p, decimals: { ...p.decimals, settings: { ...d, maxValue: v } } }))} />
            </div>
          ) : null}
        </TopicCard>

        <TopicCard title="🧮 Order of Operations" on={plan.order.enabled} onToggle={(v) => setPlan((p) => ({ ...p, order: { ...p.order, enabled: v } }))}>
          <MultiChips label="Operations to use" min={2} values={plan.order.settings.operators} options={ORDER_OPS} onChange={(operators) => setPlan((p) => ({ ...p, order: { ...p.order, settings: { ...p.order.settings, operators } } }))} />
          <Toggle checked={plan.order.settings.allowNegativeResults} onChange={(v) => setPlan((p) => ({ ...p, order: { ...p.order, settings: { ...p.order.settings, allowNegativeResults: v } } }))} label="Negative answers" />
        </TopicCard>

        <TopicCard title="📖 Word Problems" on={plan.wordProblems.enabled} onToggle={(v) => setPlan((p) => ({ ...p, wordProblems: { ...p.wordProblems, enabled: v } }))}>
          <MultiChips label="Story operations" values={plan.wordProblems.settings.operations} options={OPS} onChange={(operations) => setPlan((p) => ({ ...p, wordProblems: { ...p.wordProblems, settings: { ...p.wordProblems.settings, operations } } }))} />
        </TopicCard>
      </div>

      <div style={{ marginTop: 14 }}>
        <TopicCard title="🎓 Grade Level Math (California K–8)" on={plan.gradeLevel.enabled} onToggle={(v) => setPlan((p) => ({ ...p, gradeLevel: { ...p.gradeLevel, enabled: v } }))}>
          <span className="help">
            {GRADE_LABELS[gl.grade]} · {selected.size} skills. Choose the grade and skills in the 🎓 Grade Level tab.
          </span>
        </TopicCard>
      </div>
    </div>
  );
}
