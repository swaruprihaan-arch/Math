import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { ALL_SKILLS } from '../../curriculum/registry';
import { GRADES, type GradeLevel } from '../../curriculum/types';
import { allStrategies, strategyTitle } from '../../domain/question/build';
import type { ArithmeticOperator, Question } from '../../domain/question/types';
import { createSeededRandom, type RandomSource } from '../../domain/random/random';
import { defaultArithmeticSettings, generateArithmetic, type ArithmeticSettings } from '../../engines/arithmetic/arithmeticEngine';
import { defaultDecimalSettings, generateDecimal } from '../../engines/decimals/decimalEngine';
import { defaultFractionSettings, generateFraction, type FractionOperation } from '../../engines/fractions/fractionEngine';
import { defaultOrderSettings, generateOrder } from '../../engines/orderOfOperations/orderEngine';
import type { PracticePlan } from '../../engines/plan/practicePlan';
import { defaultWordProblemSettings, generateWordProblem } from '../../engines/wordProblems/wordProblemEngine';
import { Segmented, Toggle } from '../common/Controls';

/* ------------------------------------------------------------------ */
/* Strategy catalog (built at runtime from the real generators)        */
/* ------------------------------------------------------------------ */

export interface StrategyChip {
  /** Strategy family id, e.g. "COLUMN_ADDITION" (what settings.strategies.hidden stores). */
  readonly id: string;
  /** Parent-facing name, e.g. "Column addition". */
  readonly title: string;
}

export interface StrategyGroup {
  readonly key: string;
  readonly label: string;
  readonly chips: readonly StrategyChip[];
}

export interface StrategyCatalog {
  readonly groups: readonly StrategyGroup[];
  /** Every distinct strategy id, in first-seen order. */
  readonly ids: readonly string[];
}

const LEVELS = ['EASY', 'MEDIUM', 'HARD'] as const;
const OPS: readonly ArithmeticOperator[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];
const OP_SYMBOL: Record<ArithmeticOperator, string> = { ADD: '+', SUBTRACT: '−', MULTIPLY: '×', DIVIDE: '÷' };
const FRACTION_OPS: readonly FractionOperation[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'SIMPLIFY', 'COMPARE', 'CONVERT'];
const FRACTION_OP_NAME: Record<FractionOperation, string> = { ADD: '+', SUBTRACT: '−', MULTIPLY: '×', DIVIDE: '÷', SIMPLIFY: 'simplify', COMPARE: 'compare', CONVERT: 'mixed numbers' };
/**
 * Samples per setting. Many strategies only appear for some numbers (e.g. "Groups first" in about 1 of 5 order-of-
 * operations problems), so every setting is sampled many times, and settings whose questions offer different
 * strategies get extra samples. Generation is cheap (a few µs per question) and the catalog is built in the
 * background while the parent area is open (see prewarmStrategyCatalog).
 */
const ENGINE_SEEDS = 24;
const SKILL_SEEDS = 16;
const EXTRA_SEEDS = 32;

const TOPIC_GROUPS: readonly { key: string; label: string }[] = [
  { key: 'whole', label: '➕ Whole numbers' },
  { key: 'fractions', label: '🍕 Fractions' },
  { key: 'decimals', label: '🔢 Decimals' },
  { key: 'order', label: '🧮 Order of operations' },
  { key: 'word', label: '📖 Word problems' },
];

export const gradeGroupKey = (g: GradeLevel) => `grade-${g}`;

/** One setting to sample: `config` names it (and seeds it), `key` is the group its strategies go to. */
interface CatalogConfig {
  readonly key: string;
  readonly config: string;
  readonly context: string;
  readonly make: (rng: RandomSource) => Question;
}

interface CatalogSample extends CatalogConfig {
  readonly seed: string;
}

const sample = (c: CatalogConfig, i: number): CatalogSample => ({ ...c, seed: `${c.config}|${i}` });

/** Whole-number settings parents can pick in 🧮 Math that bring their own strategies (3–4 numbers, negatives, ÷ modes). */
function wholeVariants(op: ArithmeticOperator, difficulty: (typeof LEVELS)[number]): { name: string; settings: ArithmeticSettings }[] {
  const base: ArithmeticSettings = { ...defaultArithmeticSettings(), difficulty, enabledOperations: [op] };
  const out = [
    { name: 'two', settings: base },
    { name: 'negative', settings: { ...base, allowNegativeOperands: true, allowNegativeResults: true } },
  ];
  if (op === 'DIVIDE') {
    out.push({ name: 'remainder', settings: { ...base, divisionMode: 'REMAINDER' } }, { name: 'decimal', settings: { ...base, divisionMode: 'DECIMAL' } });
  } else {
    out.push({ name: 'three', settings: { ...base, operandCount: 3 } });
  }
  return out;
}

/** Custom ranges below zero (🧮 Math → Custom) give signed problems such as −7 + 4 + (−2). */
function customSignedSettings(op: ArithmeticOperator, operandCount: number): ArithmeticSettings {
  return { ...defaultArithmeticSettings(), difficulty: 'CUSTOM', enabledOperations: [op], operandCount, operandRange: { min: -12, max: 12 }, secondOperandRange: { min: -12, max: 12 }, allowNegativeOperands: true, allowNegativeResults: true };
}

function engineConfigs(): CatalogConfig[] {
  const out: CatalogConfig[] = [];
  for (const difficulty of LEVELS) {
    for (const op of OPS) {
      for (const v of wholeVariants(op, difficulty)) out.push({ key: 'whole', config: `whole|${v.name}|${difficulty}|${op}`, context: OP_SYMBOL[op], make: (rng) => generateArithmetic(v.settings, rng) });
    }
    for (const op of FRACTION_OPS) out.push({ key: 'fractions', config: `fractions|${difficulty}|${op}`, context: FRACTION_OP_NAME[op], make: (rng) => generateFraction({ ...defaultFractionSettings(), difficulty, operations: [op] }, rng) });
    for (const op of OPS) out.push({ key: 'decimals', config: `decimals|${difficulty}|${op}`, context: OP_SYMBOL[op], make: (rng) => generateDecimal({ ...defaultDecimalSettings(), difficulty, operations: [op] }, rng) });
    out.push({ key: 'order', config: `order|${difficulty}`, context: 'order', make: (rng) => generateOrder({ ...defaultOrderSettings(), difficulty }, rng) });
    for (const op of OPS) out.push({ key: 'word', config: `word|${difficulty}|${op}`, context: OP_SYMBOL[op], make: (rng) => generateWordProblem({ ...defaultWordProblemSettings(), difficulty, operations: [op] }, rng) });
  }
  for (const op of ['ADD', 'SUBTRACT', 'MULTIPLY'] as const) {
    for (const count of [2, 3]) out.push({ key: 'whole', config: `whole|custom-signed-${count}|${op}`, context: OP_SYMBOL[op], make: (rng) => generateArithmetic(customSignedSettings(op, count), rng) });
  }
  return out;
}

/**
 * Every sample the catalog is built from, in a fixed order (so the catalog is the same on every device). Seeds are the
 * outer loop, so the strategies children meet most often are found first and come first in each group. The last pass
 * adds samples for the settings whose questions did not all offer the same strategies (`isVaried`).
 */
function* catalogSamples(isVaried: (config: string) => boolean): Generator<CatalogSample> {
  const engines = engineConfigs();
  for (let i = 0; i < ENGINE_SEEDS; i++) for (const c of engines) yield sample(c, i);
  // Grade-level skills: Standard level first (so its names win), then Easy and Hard add the strategies only they use.
  const skills: CatalogConfig[] = [];
  for (const difficulty of ['MEDIUM', 'EASY', 'HARD'] as const) {
    const level = ALL_SKILLS.map((skill): CatalogConfig => ({ key: gradeGroupKey(skill.grade), config: `${skill.id}|${difficulty}`, context: skill.title, make: (rng) => skill.generate(rng, difficulty) }));
    for (let i = 0; i < SKILL_SEEDS; i++) for (const c of level) yield sample(c, i);
    skills.push(...level);
  }
  for (const [configs, first] of [
    [engines, ENGINE_SEEDS],
    [skills, SKILL_SEEDS],
  ] as const) {
    for (const c of configs) {
      if (!isVaried(c.config)) continue;
      for (let i = first; i < first + EXTRA_SEEDS; i++) yield sample(c, i);
    }
  }
}

const VARIED = '\u0000varied';

/** Collects strategies sample by sample, so the work can be split into small slices that keep the screen responsive. */
class CatalogBuilder {
  /** Per group: strategy id → its names, and where it was seen (operation or skill), for telling look-alikes apart. */
  private readonly groups = new Map<string, { label: string; titles: Map<string, string[]>; contexts: Map<string, string[]> }>();
  private readonly ids: string[] = [];
  private readonly seen = new Set<string>();
  /** Per setting: the strategies its first question offered, or VARIED once a question offered different ones. */
  private readonly signatures = new Map<string, string>();
  private readonly samples = catalogSamples((config) => this.signatures.get(config) === VARIED);
  private result: StrategyCatalog | null = null;

  constructor() {
    for (const t of TOPIC_GROUPS) this.groups.set(t.key, { label: t.label, titles: new Map(), contexts: new Map() });
    for (const g of GRADES) this.groups.set(gradeGroupKey(g), { label: `🎓 Grade ${g}`, titles: new Map(), contexts: new Map() });
  }

  get done(): boolean {
    return this.result !== null;
  }

  /** Works until `deadline` (a performance.now() time) or until the catalog is complete; true when it is complete. */
  work(deadline = Number.POSITIVE_INFINITY): boolean {
    while (this.result === null) {
      const next = this.samples.next();
      if (next.done) {
        this.result = this.finish();
        break;
      }
      this.collect(next.value);
      if (deadline !== Number.POSITIVE_INFINITY && performance.now() >= deadline) break;
    }
    return this.result !== null;
  }

  catalog(): StrategyCatalog {
    this.work();
    return this.result as StrategyCatalog;
  }

  private collect({ key, config, seed, context, make }: CatalogSample): void {
    const group = this.groups.get(key);
    if (!group) return;
    let question: Question;
    try {
      question = make(createSeededRandom(`strategy-catalog|${seed}`));
    } catch {
      return; // one broken generator (or a setting it rejects) must not break the parent screen
    }
    const trees = allStrategies(question);
    const signature = trees.map((t) => t.strategy).join(',');
    const before = this.signatures.get(config);
    if (before === undefined) this.signatures.set(config, signature);
    else if (before !== signature) this.signatures.set(config, VARIED);
    for (const tree of trees) {
      const title = strategyTitle(tree);
      const titles = group.titles.get(tree.strategy);
      if (!titles) group.titles.set(tree.strategy, [title]);
      else if (!titles.includes(title)) titles.push(title);
      const contexts = group.contexts.get(tree.strategy);
      if (!contexts) group.contexts.set(tree.strategy, [context]);
      else if (!contexts.includes(context)) contexts.push(context);
      if (!this.seen.has(tree.strategy)) {
        this.seen.add(tree.strategy);
        this.ids.push(tree.strategy);
      }
    }
  }

  private finish(): StrategyCatalog {
    const result: StrategyGroup[] = [];
    for (const [key, g] of this.groups) {
      if (g.titles.size === 0) continue;
      const chips = [...g.titles].map(([id, titles]) => ({ id, title: titles.slice(0, 2).join(' / ') }));
      const words = (id: string) => id.toLowerCase().replace(/_/g, ' ');
      const clash = (list: readonly StrategyChip[], chip: StrategyChip) => list.filter((c) => c.title === chip.title).length > 1;
      // Two different strategies with the same name in one group (e.g. "Skip count" for × and for ÷): say where each is used.
      const named = chips.map((chip) => {
        if (!clash(chips, chip)) return chip;
        const where = (g.contexts.get(chip.id) ?? []).slice(0, 2).join(', ');
        return { id: chip.id, title: where ? `${chip.title} (${where})` : `${chip.title} (${words(chip.id)})` };
      });
      // Still the same (both used in the same place): name the odd one out by its id, e.g. "Think multiplication (check with multiplication)".
      const unique = named.map((chip, i) => {
        const plain = chips[i]?.title ?? chip.title;
        return !clash(named, chip) || plain.toLowerCase() === words(chip.id) ? chip : { id: chip.id, title: `${plain} (${words(chip.id)})` };
      });
      result.push({ key, label: g.label, chips: unique });
    }
    return { groups: result, ids: [...this.ids] };
  }
}

/**
 * Generate sample questions from every engine (with the settings parents can change) and every grade-level skill, and
 * collect the strategies they offer, grouped by topic and grade. Seeded, so the result is the same on every device.
 */
export function buildStrategyCatalog(): StrategyCatalog {
  return new CatalogBuilder().catalog();
}

/** The catalog never changes while the app runs, so it is built once (in the background when possible) and reused. */
let sharedBuilder: CatalogBuilder | null = null;
const catalogBuilder = () => (sharedBuilder ??= new CatalogBuilder());

function strategyCatalog(): StrategyCatalog {
  return catalogBuilder().catalog();
}

/** True once the shared catalog is complete (the 🧩 Strategies tab then opens without any work). */
export function isStrategyCatalogReady(): boolean {
  return sharedBuilder?.done ?? false;
}

/** Work slice and pause (ms) for the background build: short slices, so taps never wait on it. */
const SLICE_MS = 12;
const PAUSE_MS = 16;

/**
 * Builds the strategy catalog in small background slices (call when the parent area opens), so the 🧩 Strategies tab
 * opens instantly. Returns a cancel function. If the tab opens first, the rest is finished right away.
 */
export function prewarmStrategyCatalog(startDelayMs = 400): () => void {
  const builder = catalogBuilder();
  if (builder.done) return () => undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = () => {
    timer = builder.work(performance.now() + SLICE_MS) ? undefined : setTimeout(tick, PAUSE_MS);
  };
  timer = setTimeout(tick, startDelayMs);
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
}

/** Groups that match the math the child practises start open. */
function defaultOpenGroups(plan: PracticePlan): Set<string> {
  const open = new Set<string>();
  if (plan.arithmetic.enabled) open.add('whole');
  if (plan.fractions.enabled) open.add('fractions');
  if (plan.decimals.enabled) open.add('decimals');
  if (plan.order.enabled) open.add('order');
  if (plan.wordProblems.enabled) open.add('word');
  if (plan.gradeLevel.enabled) open.add(gradeGroupKey(plan.gradeLevel.settings.grade));
  return open;
}

const normalize = (text: string) => text.toLowerCase().replace(/_/g, ' ');

/* ------------------------------------------------------------------ */
/* 🧩 Strategies tab                                                     */
/* ------------------------------------------------------------------ */

export function StrategiesSection() {
  const { settings, updateSettings } = useApp();
  const catalog = useMemo(strategyCatalog, []); // usually ready: ParentView builds it in the background
  const hidden = useMemo(() => new Set(settings.strategies.hidden), [settings.strategies.hidden]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => {
    const initial = defaultOpenGroups(settings.plan);
    if (initial.size === 0 && catalog.groups[0]) initial.add(catalog.groups[0].key);
    return initial;
  });

  const setHidden = (fn: (h: Set<string>) => void) =>
    updateSettings((s) => {
      const next = new Set(s.strategies.hidden);
      fn(next);
      return { ...s, strategies: { ...s.strategies, hidden: [...next] } };
    });
  const toggle = (id: string) => setHidden((h) => (h.has(id) ? h.delete(id) : h.add(id)));
  const headId = (key: string) => `strat-head-${key}`;
  /** Turns a whole group back on; the button then goes away, so focus moves to the group's heading button. */
  const showGroup = (group: StrategyGroup) => {
    setHidden((h) => group.chips.forEach((c) => h.delete(c.id)));
    document.getElementById(headId(group.key))?.focus();
  };
  const toggleOpen = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const q = normalize(query.trim());
  const visibleGroups = q
    ? catalog.groups.map((g) => ({ ...g, chips: g.chips.filter((c) => normalize(c.title).includes(q) || normalize(c.id).includes(q)) })).filter((g) => g.chips.length > 0)
    : catalog.groups;
  const hiddenCount = catalog.ids.filter((id) => hidden.has(id)).length;
  const fun = settings.fun;

  return (
    <div className="strat-section">
      <div className="section-grid">
        <div className="setting strat-game">
          <div className="label">How 💡 Ways works</div>
          <Toggle checked={fun.guidedSteps} onChange={(guidedSteps) => updateSettings((s) => ({ ...s, fun: { ...s.fun, guidedSteps } }))} label="🎮 Strategy game — your child taps the right brick to finish each step" />
          <Toggle checked={fun.brickModels} onChange={(brickModels) => updateSettings((s) => ({ ...s, fun: { ...s.fun, brickModels } }))} label="🧱 Brick models in the steps" />
          <div className="help">Every strategy uses the numbers from your child’s own problem.</div>
        </div>
        <div className="setting">
          <div className="label">When can your child open 💡 Ways?</div>
          <Segmented
            label="When strategies appear"
            value={settings.session.strategies}
            options={[
              { value: 'AFTER_ANSWER', label: 'After answering' },
              { value: 'ANYTIME', label: 'Anytime (as hints)' },
            ]}
            onChange={(strategies) => updateSettings((s) => ({ ...s, session: { ...s.session, strategies } }))}
          />
        </div>
      </div>

      <div className="strat-toolbar">
        <div className="strat-intro">
          <h3>Which ways to solve can your child see?</h3>
          <p className="help">
            Tap a brick to turn a strategy off or on. If every strategy for a problem is turned off, all of them are shown. Some strategies are used in several places — turning one off hides it everywhere.
          </p>
        </div>
        <div className="row strat-controls">
          <input className="field strat-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a strategy" aria-label="Find a strategy" autoComplete="off" />
          <span className="pill" role="status">
            {catalog.ids.length - hiddenCount} of {catalog.ids.length} shown
          </span>
          {/* aria-disabled (not disabled), so keyboard and VoiceOver focus stays on it after it is used. */}
          <button type="button" className="brick small green" onClick={() => setHidden((h) => h.clear())} aria-disabled={settings.strategies.hidden.length === 0}>
            ✓ Show all
          </button>
        </div>
      </div>

      {q && visibleGroups.length === 0 ? <p className="notice">No strategy matches “{query.trim()}”.</p> : null}

      <div className="strat-groups">
        {visibleGroups.map((group) => {
          const isOpen = q !== '' || open.has(group.key);
          const off = group.chips.filter((c) => hidden.has(c.id)).length;
          const panelId = `strat-group-${group.key}`;
          return (
            <section key={group.key} className={`strat-group${isOpen ? ' open' : ''}`}>
              <h4 className="strat-group-title">
                <button type="button" id={headId(group.key)} className="strat-group-head" aria-expanded={isOpen} aria-controls={panelId} onClick={() => (q === '' ? toggleOpen(group.key) : undefined)} aria-disabled={q !== ''}>
                  <span className="strat-chevron" aria-hidden="true">
                    {isOpen ? '▾' : '▸'}
                  </span>
                  <span className="strat-group-name">{group.label}</span>
                  <span className={`strat-count${off ? ' some-off' : ''}`}>
                    {group.chips.length - off}/{group.chips.length} on
                  </span>
                </button>
              </h4>
              {isOpen ? (
                <div id={panelId} className="strat-panel">
                  <div className="strat-chips" role="group" aria-label={group.label}>
                    {group.chips.map((chip) => {
                      const on = !hidden.has(chip.id);
                      return (
                        <button key={chip.id} type="button" className={`strat-chip${on ? ' on' : ' off'}`} aria-pressed={on} data-strategy={chip.id} onClick={() => toggle(chip.id)}>
                          <span className="strat-mark" aria-hidden="true">
                            {on ? '✓' : '✗'}
                          </span>
                          <span>{chip.title}</span>
                        </button>
                      );
                    })}
                  </div>
                  {off ? (
                    <button type="button" className="brick small ghost" onClick={() => showGroup(group)}>
                      ✓ Turn all on
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
