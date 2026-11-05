/**
 * Parametervertrag der Generatoren (B13). A generator declares its parameters;
 * user input is normalised against that declaration before anything is built:
 * integers are clamped to their range and step, unknown choices fall back to
 * the default, unknown keys are dropped. Every correction is reported, never
 * applied silently, and the normalised values are what gets stored with the
 * generated version, so the same values always rebuild the same geometry.
 */
export type ParamValue = number | string | boolean;
export type ParamValues = Readonly<Record<string, ParamValue>>;

interface ParamBase {
  readonly key: string;
  readonly label: string;
  readonly hint?: string;
  /** Form group heading (Maße, Stil, Details …). */
  readonly group: string;
  /** Shown only when another parameter has one of the given values. */
  readonly when?: { readonly key: string; readonly values: readonly ParamValue[] };
}
export interface IntParam extends ParamBase {
  readonly type: 'int';
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly default: number;
  readonly unit?: string;
}
export interface ChoiceParam extends ParamBase {
  readonly type: 'choice';
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly default: string;
}
export interface BoolParam extends ParamBase {
  readonly type: 'bool';
  readonly default: boolean;
}
export type ParamDef = IntParam | ChoiceParam | BoolParam;

export interface ParamIssue { readonly key: string; readonly message: string }
export interface Normalized { readonly values: ParamValues; readonly issues: readonly ParamIssue[] }

export function defaultsOf(defs: readonly ParamDef[]): ParamValues {
  return Object.fromEntries(defs.map(d => [d.key, d.default]));
}

/** Clamps and fills `raw` against the declaration; keys come out in declaration order. */
export function normalizeParams(defs: readonly ParamDef[], raw: Readonly<Record<string, unknown>> = {}): Normalized {
  const values: Record<string, ParamValue> = {}, issues: ParamIssue[] = [];
  const known = new Set(defs.map(d => d.key));
  for (const key of Object.keys(raw)) if (!known.has(key)) issues.push({ key, message: `Unbekannter Parameter „${key}“ ignoriert` });
  for (const d of defs) {
    const v = raw[d.key];
    if (v === undefined) { values[d.key] = d.default; continue; }
    if (d.type === 'int') {
      const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
      if (!Number.isFinite(n)) { values[d.key] = d.default; issues.push({ key: d.key, message: `${d.label}: keine Zahl, Standard ${d.default} verwendet` }); continue; }
      const step = d.step ?? 1;
      let c = d.min + Math.round((Math.min(d.max, Math.max(d.min, n)) - d.min) / step) * step;
      if (c > d.max) c -= step;
      if (c !== n) issues.push({ key: d.key, message: `${d.label}: ${n} auf ${c} angepasst (${d.min}–${d.max}${step > 1 ? `, Schritt ${step}` : ''})` });
      values[d.key] = c;
    } else if (d.type === 'choice') {
      const s = String(v);
      if (d.options.some(o => o.value === s)) values[d.key] = s;
      else { values[d.key] = d.default; issues.push({ key: d.key, message: `${d.label}: „${s}“ unbekannt, „${d.default}“ verwendet` }); }
    } else {
      const b = v === true || v === 'true' || v === 1 || v === '1' ? true : v === false || v === 'false' || v === 0 || v === '0' ? false : null;
      if (b === null) { values[d.key] = d.default; issues.push({ key: d.key, message: `${d.label}: ja/nein erwartet` }); }
      else values[d.key] = b;
    }
  }
  return { values: Object.freeze(values), issues };
}

/** Typed read access for generator code; the values are already normalised. */
export class Args {
  constructor(private readonly values: ParamValues) {}
  int(key: string): number { const v = this.values[key]; if (typeof v !== 'number') throw new Error(`Parameter ${key}: Zahl erwartet`); return v; }
  str(key: string): string { const v = this.values[key]; if (typeof v !== 'string') throw new Error(`Parameter ${key}: Auswahl erwartet`); return v; }
  bool(key: string): boolean { const v = this.values[key]; if (typeof v !== 'boolean') throw new Error(`Parameter ${key}: ja/nein erwartet`); return v; }
}

/** Short German summary like "Höhe 14 · Radius 4 · Mittelalter". */
export function describeParams(defs: readonly ParamDef[], values: ParamValues, keys?: readonly string[]): string {
  return defs.filter(d => !keys || keys.includes(d.key)).filter(d => visible(d, values)).map(d => {
    const v = values[d.key];
    if (d.type === 'int') return `${d.label} ${v}${d.unit ? ` ${d.unit}` : ''}`;
    if (d.type === 'choice') return d.options.find(o => o.value === v)?.label ?? String(v);
    return v ? d.label : '';
  }).filter(Boolean).join(' · ');
}

export const visible = (d: ParamDef, values: ParamValues): boolean => !d.when || d.when.values.includes(values[d.when.key]!);

/**
 * Deterministic "Würfeln": a parameter set picked from `seed` (mulberry32).
 * Fixed keys keep their current value (e.g. the style the user chose).
 */
export function rollParams(defs: readonly ParamDef[], seed: number, keep: ParamValues = {}): ParamValues {
  let a = seed >>> 0;
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const raw: Record<string, ParamValue> = {};
  for (const d of defs) {
    const r = rnd();
    if (d.key in keep) { raw[d.key] = keep[d.key]!; continue; }
    if (d.type === 'int') { const step = d.step ?? 1, n = Math.floor((d.max - d.min) / step) + 1; raw[d.key] = d.min + Math.floor(r * n) * step; }
    else if (d.type === 'choice') raw[d.key] = d.options[Math.floor(r * d.options.length)]!.value;
    else raw[d.key] = r < 0.5;
  }
  return normalizeParams(defs, raw).values;
}
