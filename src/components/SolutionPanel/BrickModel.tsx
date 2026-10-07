import type { CSSProperties, JSX } from 'react';
import type { Question } from '../../domain/question/types';
import { absR, isInteger, toNumber, type Rational } from '../../domain/rational/rational';
import { CountBar, CountButton, CountFractionBricks, countColumns, FractionBricks, useTapCounter, type CountHandler, type CountTone, type TapCounter } from '../QuestionCard/VisualView';
import '../../styles/counting.css';

const COLORS = ['#d01012', '#0057a6', '#00852b', '#f8c300', '#fe8a18', '#7f3f98'];

function Stud({ color }: { color: string }) {
  return <span className="stud" style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', background: color, boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.25), 0 2px 0 rgba(0,0,0,.2)' }} />;
}

const hundredStyle = (color: string): CSSProperties => ({ width: 70, height: 70, borderRadius: 6, background: color, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 1, padding: 3, boxShadow: 'inset 0 -4px 0 rgba(0,0,0,.25)' });
const tenStyle = (color: string): CSSProperties => ({ width: 16, height: 70, borderRadius: 4, background: color, display: 'grid', gridTemplateRows: 'repeat(10, 1fr)', gap: 1, padding: 2, boxShadow: 'inset -3px 0 0 rgba(0,0,0,.25)' });
const BLOCK_DOT: CSSProperties = { borderRadius: '50%', background: 'rgba(255,255,255,.35)' };

function places(n: number) {
  return { hundreds: Math.floor(n / 100), tens: Math.floor((n % 100) / 10), ones: n % 10 };
}

function BaseTen({ n, color }: { n: number; color: string }) {
  const { hundreds, tens, ones } = places(n);
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
      {Array.from({ length: hundreds }, (_, i) => (
        <div key={`h${i}`} title="hundred" style={hundredStyle(color)}>
          {Array.from({ length: 100 }, (_, j) => (
            <span key={j} style={BLOCK_DOT} />
          ))}
        </div>
      ))}
      {Array.from({ length: tens }, (_, i) => (
        <div key={`t${i}`} title="ten" style={tenStyle(color)}>
          {Array.from({ length: 10 }, (_, j) => (
            <span key={j} style={BLOCK_DOT} />
          ))}
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 16px)', gap: 3 }}>
        {Array.from({ length: ones }, (_, i) => (
          <span key={`o${i}`} title="one" style={{ width: 16, height: 16, borderRadius: 4, background: color, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.25)' }} />
        ))}
      </div>
    </div>
  );
}

function num(q: Question, i: number): Rational | null {
  const v = q.operands[i]?.value;
  return v && v.type === 'NUMBER' ? v.value : null;
}

/** Which brick picture fits the problem (pure: decided from the numbers only). */
type ModelSpec =
  | { readonly kind: 'studs'; readonly op: 'ADD' | 'SUBTRACT'; readonly x: number; readonly y: number }
  | { readonly kind: 'baseTen'; readonly op: 'ADD' | 'SUBTRACT'; readonly x: number; readonly y: number }
  | { readonly kind: 'array'; readonly x: number; readonly y: number }
  | { readonly kind: 'groups'; readonly x: number; readonly y: number }
  | { readonly kind: 'fractions'; readonly op: string; readonly bars: readonly { readonly r: Rational; readonly color: string }[] };

function modelSpec(question: Question): ModelSpec | null {
  const a = num(question, 0);
  const b = num(question, 1);
  if (!a || !b || question.operands.length !== 2) return null;
  const op = question.operation;
  const whole = isInteger(a) && isInteger(b) && a.numerator >= 0n && b.numerator >= 0n;

  if (whole && question.topic !== 'FRACTIONS' && question.topic !== 'DECIMALS') {
    const x = Number(a.numerator);
    const y = Number(b.numerator);
    if ((op === 'ADD' || op === 'SUBTRACT') && Math.max(x, y) <= 20) return { kind: 'studs', op, x, y };
    if ((op === 'ADD' || op === 'SUBTRACT') && Math.max(x, y) <= 999) return { kind: 'baseTen', op, x, y };
    if (op === 'MULTIPLY' && x <= 12 && y <= 12 && x > 0 && y > 0) return { kind: 'array', x, y };
    if (op === 'DIVIDE' && y > 0 && y <= 12 && x <= 144 && x % y === 0) return { kind: 'groups', x, y };
  }

  if (question.topic === 'FRACTIONS' || (question.topic === 'WORD_PROBLEMS' && !isInteger(a))) {
    const ok = (r: Rational) => !isInteger(r) && r.denominator <= 12n && toNumber(absR(r)) <= 3 && r.numerator > 0n;
    if (ok(a) && (ok(b) || isInteger(b))) {
      return { kind: 'fractions', op, bars: [{ r: a, color: COLORS[0]! }, ...(!isInteger(b) ? [{ r: b, color: COLORS[1]! }] : [])] };
    }
  }
  return null;
}

function fractionBarsOf(r: Rational) {
  return { parts: Number(r.denominator), shaded: Number(r.numerator), bars: Math.max(1, Math.ceil(toNumber(r))) };
}

/** How many things the child can tap in the model (0 for e.g. 5 − 5 or 0 + 0: then the static picture is shown). */
function countable(spec: ModelSpec): number {
  const blocks = (n: number) => {
    const { hundreds, tens, ones } = places(n);
    return hundreds + tens + ones;
  };
  switch (spec.kind) {
    case 'studs':
      return spec.op === 'ADD' ? spec.x + spec.y : Math.max(0, spec.x - spec.y);
    case 'baseTen':
      return blocks(spec.x) + blocks(spec.y);
    case 'array':
      return spec.x * spec.y;
    case 'groups':
      return spec.x;
    case 'fractions':
      return spec.bars.reduce((sum, bar) => {
        const { parts, shaded, bars } = fractionBarsOf(bar.r);
        return sum + Math.max(0, Math.min(shaded, parts * bars));
      }, 0);
  }
}

function modelLabel(spec: ModelSpec): string {
  switch (spec.kind) {
    case 'studs':
      return `${spec.x} studs ${spec.op === 'ADD' ? 'and' : 'take away'} ${spec.y} studs`;
    case 'baseTen':
      return 'Base-ten bricks';
    case 'array':
      return `${spec.x} rows of ${spec.y} studs`;
    case 'groups':
      return `${spec.x} studs shared into ${spec.y} groups`;
    case 'fractions':
      return 'Fraction bricks';
  }
}

/** The picture exactly as it has always been drawn (worksheets, print, non-interactive panels). */
function StaticModel({ spec }: { spec: ModelSpec }) {
  switch (spec.kind) {
    case 'studs': {
      const { op, x, y } = spec;
      return (
        <div className="model" aria-label={modelLabel(spec)}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 300 }}>
              {Array.from({ length: x }, (_, i) => (
                <span key={i} style={{ opacity: op === 'SUBTRACT' && i >= x - y ? 0.25 : 1 }}>
                  <Stud color={i < 10 ? COLORS[0]! : COLORS[3]!} />
                </span>
              ))}
            </div>
            {op === 'ADD' ? (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 300 }}>
                {Array.from({ length: y }, (_, i) => (
                  <Stud key={i} color={COLORS[1]!} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    case 'baseTen':
      return (
        <div className="model" style={{ flexDirection: 'column', alignItems: 'center', gap: 12 }} aria-label={modelLabel(spec)}>
          <BaseTen n={spec.x} color={COLORS[0]!} />
          <strong style={{ fontSize: '1.6rem' }}>{spec.op === 'ADD' ? '+' : '−'}</strong>
          <BaseTen n={spec.y} color={COLORS[1]!} />
        </div>
      );
    case 'array': {
      const { x, y } = spec;
      return (
        <div className="model" aria-label={modelLabel(spec)}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${y}, 22px)`, gap: 5 }}>
            {Array.from({ length: x * y }, (_, i) => (
              <Stud key={i} color={COLORS[Math.floor(i / y) % COLORS.length]!} />
            ))}
          </div>
        </div>
      );
    }
    case 'groups': {
      const groups = spec.y;
      const each = spec.x / spec.y;
      return (
        <div className="model" aria-label={modelLabel(spec)}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Array.from({ length: groups }, (_, g) => (
              <div key={g} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 22px)', gap: 4, padding: 8, borderRadius: 10, background: 'var(--tile-2)' }}>
                {Array.from({ length: each }, (_, i) => (
                  <Stud key={i} color={COLORS[g % COLORS.length]!} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'fractions':
      return (
        <div className="model" style={{ flexDirection: 'column', alignItems: 'center' }} aria-label={modelLabel(spec)}>
          {spec.bars.map((bar, i) => (
            <FractionBricks key={i} {...fractionBarsOf(bar.r)} color={bar.color} width={320} />
          ))}
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Tap to count                                                         */
/* ------------------------------------------------------------------ */

function TapStud({ counter, id, color, kind = '' }: { counter: TapCounter; id: string; color: string; kind?: string }) {
  return (
    <CountButton counter={counter} id={id} kind={kind} noun="stud" className="count-stud">
      <span className="count-dot" style={{ background: color }} />
    </CountButton>
  );
}

/** Base-ten blocks to tap: a hundred counts 100, a ten rod 10, a one 1; badges show the running total (10, 20, 21…). */
function TapBaseTen({ counter, n, color, kind, prefix }: { counter: TapCounter; n: number; color: string; kind: string; prefix: string }) {
  const { hundreds, tens, ones } = places(n);
  return (
    <div className="count-blocks">
      {Array.from({ length: hundreds }, (_, i) => (
        <CountButton key={`h${i}`} counter={counter} id={`${prefix}h${i}`} kind={kind} value={100} noun="hundred" className="count-block hundred">
          <span style={hundredStyle(color)}>
            {Array.from({ length: 100 }, (_, j) => (
              <span key={j} style={BLOCK_DOT} />
            ))}
          </span>
        </CountButton>
      ))}
      {Array.from({ length: tens }, (_, i) => (
        <CountButton key={`t${i}`} counter={counter} id={`${prefix}t${i}`} kind={kind} value={10} noun="ten" className="count-block ten">
          <span style={tenStyle(color)}>
            {Array.from({ length: 10 }, (_, j) => (
              <span key={j} style={BLOCK_DOT} />
            ))}
          </span>
        </CountButton>
      ))}
      {ones > 0 ? (
        <div className="count-ones">
          {Array.from({ length: ones }, (_, i) => (
            <CountButton key={`o${i}`} counter={counter} id={`${prefix}o${i}`} kind={kind} value={1} noun="one" className="count-block one">
              <span className="count-unit" style={{ background: color }} />
            </CountButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CountingModel({ spec, onCount }: { spec: ModelSpec; onCount?: CountHandler | undefined }) {
  const counter = useTapCounter({ onCount });
  // Adding: one count for everything ("count all"). Taking away and the rest: each number is counted on its own.
  const split = (spec.kind === 'baseTen' || spec.kind === 'fractions') && spec.op !== 'ADD';
  const kindA = split ? 'a' : '';
  const kindB = split ? 'b' : '';
  const toneOf = (kind: string): CountTone => (kind === 'a' ? 'red' : kind === 'b' ? 'blue' : 'yellow');

  let picture: JSX.Element;
  switch (spec.kind) {
    case 'studs': {
      const { op, x, y } = spec;
      picture = (
        <div className="count-studs">
          <div className="count-row">
            {Array.from({ length: x }, (_, i) => {
              const color = i < 10 ? COLORS[0]! : COLORS[3]!;
              // Studs that are taken away stay faded and are not counted.
              return op === 'SUBTRACT' && i >= x - y ? (
                <span key={i} className="count-slot taken" aria-hidden="true">
                  <span className="count-dot" style={{ background: color }} />
                </span>
              ) : (
                <TapStud key={i} counter={counter} id={`a${i}`} color={color} />
              );
            })}
          </div>
          {op === 'ADD' && y > 0 ? (
            <div className="count-row">
              {Array.from({ length: y }, (_, i) => (
                <TapStud key={i} counter={counter} id={`b${i}`} color={COLORS[1]!} />
              ))}
            </div>
          ) : null}
        </div>
      );
      break;
    }
    case 'baseTen':
      picture = (
        <div className="count-baseten">
          <TapBaseTen counter={counter} n={spec.x} color={COLORS[0]!} kind={kindA} prefix="a" />
          <strong className="count-op">{spec.op === 'ADD' ? '+' : '−'}</strong>
          <TapBaseTen counter={counter} n={spec.y} color={COLORS[1]!} kind={kindB} prefix="b" />
        </div>
      );
      break;
    case 'array': {
      const { x, y } = spec;
      picture = (
        <div className="count-grid count-studgrid" style={countColumns(y)}>
          {Array.from({ length: x * y }, (_, i) => (
            <TapStud key={i} counter={counter} id={String(i)} color={COLORS[Math.floor(i / y) % COLORS.length]!} />
          ))}
        </div>
      );
      break;
    }
    case 'groups': {
      const groups = spec.y;
      const each = spec.x / spec.y;
      const cols = Math.max(1, Math.min(each, each > 9 ? 5 : 3));
      picture = (
        <div className="count-groups">
          {Array.from({ length: groups }, (_, g) => (
            <div key={g} className="count-group" style={countColumns(cols)}>
              {Array.from({ length: each }, (_, i) => (
                <TapStud key={i} counter={counter} id={`${g}.${i}`} color={COLORS[g % COLORS.length]!} />
              ))}
            </div>
          ))}
        </div>
      );
      break;
    }
    case 'fractions':
      picture = (
        <div className="count-fractions">
          {spec.bars.map((bar, i) => (
            <CountFractionBricks key={i} counter={counter} {...fractionBarsOf(bar.r)} color={bar.color} width={320} kind={i === 0 ? kindA : kindB} idPrefix={`${i}.`} />
          ))}
        </div>
      );
      break;
  }
  return (
    <div className="model counting" role="group" aria-label={modelLabel(spec)} data-counting="">
      <div className="count-stage">{picture}</div>
      <CountBar counter={counter} toneOf={toneOf} />
    </div>
  );
}

function specKey(spec: ModelSpec): string {
  return JSON.stringify(spec, (_k, x: unknown) => (typeof x === 'bigint' ? `${x}n` : x));
}

/**
 * Hands-on brick picture of the problem, when one makes sense. Returns null otherwise.
 * `onCount(count, spoken)`: speak `spoken`.
 */
export function BrickModel({ question, interactive = false, onCount }: { question: Question; interactive?: boolean; onCount?: CountHandler }) {
  const spec = modelSpec(question);
  if (!spec) return null;
  // Keyed on the problem: a new question always starts a fresh count. Nothing to tap: the plain picture.
  if (interactive && countable(spec) > 0) return <CountingModel key={`${question.id}|${specKey(spec)}`} spec={spec} onCount={onCount} />;
  return <StaticModel spec={spec} />;
}
