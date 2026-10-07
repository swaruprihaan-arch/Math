import type { ReactNode } from 'react';

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: readonly { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MultiChips<T extends string>({ values, options, onChange, label, min = 1 }: { values: readonly T[]; options: readonly { value: T; label: ReactNode }[]; onChange: (v: T[]) => void; label: string; min?: number }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (on && values.length <= min) return;
              onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value]);
            }}
          >
            {on ? '✓ ' : ''}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function NumberField({ value, onChange, min, max, label, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string; step?: number }) {
  return (
    <label className="row" style={{ gap: 6 }}>
      <span>{label}</span>
      <input
        className="field"
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
      />
    </label>
  );
}

export function Setting({ label, help, children }: { label: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="setting">
      <div className="label">{label}</div>
      {children}
      {help ? <div className="help">{help}</div> : null}
    </div>
  );
}
