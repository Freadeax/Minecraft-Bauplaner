import { visible } from '../../../../../packages/domain/src/index.js';
import type { ParamDef, ParamValue, ParamValues } from '../../../../../packages/domain/src/index.js';

/**
 * Parameter form of a generator (B13): one control per declared parameter,
 * grouped as declared. Integers get a slider plus a number field, choices a
 * select (segmented buttons for up to three options), booleans a checkbox.
 * Parameters whose `when` condition is not met are hidden, not dropped.
 */
export function GeneratorForm({ params: all, values, onChange }: {
  params: readonly ParamDef[];
  values: ParamValues;
  onChange(key: string, value: ParamValue): void;
}) {
  const groups = [...new Set(all.map(p => p.group))];
  return <div className="gen-form">{groups.map(g => {
    const params = all.filter(p => p.group === g && visible(p, values));
    if (!params.length) return null;
    return <fieldset key={g} className="gen-group"><legend>{g}</legend>{params.map(p => <Field key={p.key} def={p} value={values[p.key]!} onChange={v => onChange(p.key, v)} />)}</fieldset>;
  })}</div>;
}

function Field({ def, value, onChange }: { def: ParamDef; value: ParamValue; onChange(v: ParamValue): void }) {
  const id = `gen-${def.key}`;
  const hint = def.hint ? <small className="gen-hint">{def.hint}</small> : null;
  if (def.type === 'bool') return <label className="check gen-field"><input type="checkbox" checked={value === true} onChange={e => onChange(e.target.checked)} /> {def.label}{hint}</label>;
  if (def.type === 'choice') {
    if (def.options.length <= 3) return <div className="gen-field"><span className="gen-label" id={`${id}-l`}>{def.label}</span>
      <div className="seg" role="group" aria-labelledby={`${id}-l`}>{def.options.map(o => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>{hint}</div>;
    return <label className="gen-field"><span className="gen-label">{def.label}</span>
      <select value={String(value)} aria-label={def.label} onChange={e => onChange(e.target.value)}>{def.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{hint}</label>;
  }
  const n = Number(value);
  return <div className="gen-field gen-int">
    <label htmlFor={id} className="gen-label">{def.label} <b>{n}{def.unit ? ` ${def.unit}` : ''}</b></label>
    <div className="gen-int-row">
      <input id={id} type="range" min={def.min} max={def.max} step={def.step ?? 1} value={n} aria-label={def.label} onChange={e => onChange(Number(e.target.value))} />
      <input type="number" min={def.min} max={def.max} step={def.step ?? 1} value={n} aria-label={`${def.label} (Zahl)`}
        onChange={e => { if (e.target.value !== '') onChange(Number(e.target.value)); }} />
    </div>{hint}</div>;
}
