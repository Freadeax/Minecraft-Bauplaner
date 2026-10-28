import { canonicalJson } from '../hash.js';
import { memberTransform } from '../ensembles.js';
import { applyOperation, createProject, newInstance } from '../project.js';
import { SAMPLE_PROFILE } from '../samples.js';
import type { Asset, AssetVersion, Project } from '../types.js';
import { normalizeParams, rollParams } from './params.js';
import type { ParamDef, ParamValues } from './params.js';
import { STYLE_OPTIONS, styleOf } from './styles.js';
import { WEATHER_PARAMS } from './types.js';
import type { Preset } from './types.js';

/**
 * Anlagen (B13): several generated parts arranged as a ready project – a
 * castle ring of towers and walls, a street of houses. Every part is an
 * ordinary generated asset (equal parameters ⇒ one shared asset); the plan
 * only lists generator parameters and placements, so the result is a normal
 * project with materials, guide and export.
 */
export interface CompoundPart {
  readonly key: string;
  readonly label: string;
  readonly generatorId: string;
  readonly values: Readonly<Record<string, unknown>>;
  /** x/z of the part's minimum corner after rotation. */
  readonly at: readonly [number, number];
  readonly turns: 0 | 1 | 2 | 3;
}
export interface Compound {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: number;
  readonly params: readonly ParamDef[];
  readonly presets: readonly Preset[];
  plan(values: ParamValues): { readonly parts: readonly CompoundPart[]; readonly notes: readonly string[] };
}

const num = (v: ParamValues, k: string) => v[k] as number;
const str = (v: ParamValues, k: string) => v[k] as string;

export const CASTLE_COMPOUND: Compound = {
  id: 'burganlage', name: 'Burganlage', version: 1,
  description: 'Vier Ecktürme, verbunden durch Wehrmauern mit Tor, optional mit Bergfried im Hof – als fertiges Projekt aus generierten Bauteilen.',
  params: [
    { key: 'hofBreite', label: 'Mauerlänge x', group: 'Maße', type: 'int', min: 6, max: 48, default: 16, unit: 'Blöcke' },
    { key: 'hofTiefe', label: 'Mauerlänge z', group: 'Maße', type: 'int', min: 6, max: 48, default: 16, unit: 'Blöcke' },
    { key: 'mauerHoehe', label: 'Mauerhöhe', group: 'Maße', type: 'int', min: 3, max: 12, default: 6, unit: 'Blöcke' },
    { key: 'staerke', label: 'Mauerstärke', group: 'Maße', type: 'int', min: 1, max: 4, default: 2, unit: 'Blöcke' },
    { key: 'turmForm', label: 'Ecktürme', group: 'Türme', type: 'choice', default: 'rund', options: [{ value: 'rund', label: 'Rund' }, { value: 'eckig', label: 'Eckig' }] },
    { key: 'turmRadius', label: 'Turmradius', group: 'Türme', type: 'int', min: 2, max: 6, default: 3, unit: 'Blöcke' },
    { key: 'turmDach', label: 'Turmabschluss', group: 'Türme', type: 'choice', default: 'kegel', options: [{ value: 'kegel', label: 'Kegeldach' }, { value: 'zinnen', label: 'Zinnen' }] },
    { key: 'stil', label: 'Stil', group: 'Stil & Material', type: 'choice', options: STYLE_OPTIONS, default: 'mittelalter' },
    ...WEATHER_PARAMS,
    { key: 'tor', label: 'Tor in der Nordmauer', group: 'Details', type: 'bool', default: true },
    { key: 'bergfried', label: 'Bergfried im Hof', group: 'Details', type: 'bool', default: true },
  ],
  presets: [
    { id: 'burg', label: 'Kleine Burg', values: { hofBreite: 16, hofTiefe: 16, mauerHoehe: 6, staerke: 2, turmRadius: 3 } },
    { id: 'festung', label: 'Große Festung', values: { hofBreite: 32, hofTiefe: 24, mauerHoehe: 9, staerke: 3, turmRadius: 5, turmDach: 'zinnen', verwitterung: 25 } },
    { id: 'palisade', label: 'Nordischer Hof', values: { hofBreite: 14, hofTiefe: 12, mauerHoehe: 4, staerke: 1, turmForm: 'eckig', turmRadius: 2, stil: 'nordisch', bergfried: false } },
    { id: 'wuestenfort', label: 'Wüstenfort', values: { hofBreite: 20, hofTiefe: 20, mauerHoehe: 7, staerke: 2, turmForm: 'eckig', turmRadius: 3, turmDach: 'zinnen', stil: 'wueste' } },
    { id: 'netherfeste', label: 'Netherfeste', values: { hofBreite: 18, hofTiefe: 18, mauerHoehe: 8, staerke: 2, turmRadius: 4, turmDach: 'zinnen', stil: 'nether', verwitterung: 20 } },
  ],
  plan(v) {
    const r = num(v, 'turmRadius'), D = 2 * r + 1, Lx = num(v, 'hofBreite'), Lz = num(v, 'hofTiefe'), h = num(v, 'mauerHoehe');
    const t = Math.min(num(v, 'staerke'), D - 2), notes: string[] = [];
    if (t < num(v, 'staerke')) notes.push(`Mauerstärke auf ${t} begrenzt (Turmseite).`);
    const shared = { stil: str(v, 'stil'), verwitterung: num(v, 'verwitterung'), variante: num(v, 'variante') };
    const tower = { ...shared, form: str(v, 'turmForm'), radius: r, hoehe: h + 5, geschoss: 4, dach: str(v, 'turmDach'), anschluesse: true, mauerStaerke: t, mauerHoehe: h + 1 };
    const wall = (laenge: number, tor = false) => ({ ...shared, laenge, hoehe: h, staerke: t, krone: 'zinnen', wehrgang: t >= 2, scharten: h >= 5, tor });
    // Walls sit centred on the tower axis; the crenels face outwards (turns: north 0, east 1, south 2, west 3).
    const off = r - Math.floor((t - 1) / 2), far = D + Lx, deep = D + Lz;
    const parts: CompoundPart[] = [
      { key: 't-nw', label: 'Turm Nordwest', generatorId: 'turm', values: tower, at: [0, 0], turns: 0 },
      { key: 't-no', label: 'Turm Nordost', generatorId: 'turm', values: tower, at: [far, 0], turns: 0 },
      { key: 't-sw', label: 'Turm Südwest', generatorId: 'turm', values: tower, at: [0, deep], turns: 0 },
      { key: 't-so', label: 'Turm Südost', generatorId: 'turm', values: tower, at: [far, deep], turns: 0 },
      { key: 'm-n', label: v.tor ? 'Tormauer Nord' : 'Mauer Nord', generatorId: 'mauer', values: wall(Lx, v.tor === true), at: [D, off], turns: 0 },
      { key: 'm-s', label: 'Mauer Süd', generatorId: 'mauer', values: wall(Lx), at: [D, deep + off], turns: 2 },
      { key: 'm-w', label: 'Mauer West', generatorId: 'mauer', values: wall(Lz), at: [off, D], turns: 3 },
      { key: 'm-o', label: 'Mauer Ost', generatorId: 'mauer', values: wall(Lz), at: [far + off, D], turns: 1 },
    ];
    if (v.bergfried) {
      const kr = Math.max(2, Math.min(4, Math.floor(Math.min(Lx, Lz) / 4))), kd = 2 * kr + 1;
      if (Math.min(Lx, Lz) - kd < 4) notes.push('Hof zu klein für einen Bergfried mit Abstand zu den Mauern.');
      else parts.push({ key: 'bergfried', label: 'Bergfried', generatorId: 'turm', values: { ...shared, form: 'eckig', radius: kr, hoehe: h + 12, geschoss: 5, dach: 'walm' },
        at: [D + Math.floor((Lx - kd) / 2), D + Math.floor((Lz - kd) / 2) + 2], turns: 0 });
    }
    notes.push(`Mauern und Türme teilen das Anschlussprofil wall_${t}x${h + 1}; weitere Mauern docken im Editor an.`);
    return { parts, notes };
  },
};

export const STREET_COMPOUND: Compound = {
  id: 'haeuserzeile', name: 'Häuserzeile', version: 1,
  description: 'Eine Straße aus unterschiedlichen Häusern eines Stils: Breite, Tiefe, Geschosse, Dach und Details je Haus aus der Variante gewürfelt, Fronten in einer Flucht.',
  params: [
    { key: 'anzahl', label: 'Häuser', group: 'Maße', type: 'int', min: 2, max: 10, default: 5 },
    { key: 'abstand', label: 'Abstand', group: 'Maße', type: 'int', min: 0, max: 6, default: 2, unit: 'Blöcke', hint: '0 = Reihenhäuser Wand an Wand (ohne Dachüberstand).' },
    { key: 'maxGeschosse', label: 'Höchstens Geschosse', group: 'Maße', type: 'int', min: 1, max: 4, default: 3 },
    { key: 'stil', label: 'Stil', group: 'Stil & Material', type: 'choice', options: STYLE_OPTIONS, default: 'fachwerk' },
    ...WEATHER_PARAMS,
  ],
  presets: [
    { id: 'altstadt', label: 'Fachwerk-Altstadt', values: { anzahl: 6, abstand: 0, maxGeschosse: 3, stil: 'fachwerk' } },
    { id: 'fischerdorf', label: 'Nordisches Fischerdorf', values: { anzahl: 5, abstand: 3, maxGeschosse: 1, stil: 'nordisch' } },
    { id: 'oase', label: 'Wüstenoase', values: { anzahl: 4, abstand: 2, maxGeschosse: 2, stil: 'wueste', verwitterung: 15 } },
    { id: 'siedlung', label: 'Moderne Siedlung', values: { anzahl: 4, abstand: 4, maxGeschosse: 2, stil: 'modern' } },
    { id: 'kirschdorf', label: 'Kirschblütendorf', values: { anzahl: 5, abstand: 2, maxGeschosse: 1, stil: 'fernost', variante: 7 } },
  ],
  plan(v) {
    const parts: CompoundPart[] = [], gap = num(v, 'abstand'), maxF = num(v, 'maxGeschosse'), style = styleOf(str(v, 'stil'));
    let x = 0;
    for (let i = 0; i < num(v, 'anzahl'); i++) {
      const roll = rollParams(HOUSE_ROLL, num(v, 'variante') * 977 + i * 131);
      const breite = roll.breite as number, ov = gap === 0 ? 0 : Math.min(1, Math.floor(gap / 2));
      const values = { ...roll, stil: style.key, verwitterung: num(v, 'verwitterung'), variante: num(v, 'variante') + i, geschosse: Math.min(maxF, roll.geschosse as number),
        ueberstand: ov, dach: style.flat ? 'flach' : roll.dach, vordach: false, einrichtung: true };
      parts.push({ key: `haus-${i + 1}`, label: `Haus ${i + 1}`, generatorId: 'haus', values, at: [x, 0], turns: 0 });
      x += breite + 2 * ov + gap;
    }
    return { parts, notes: gap === 0 ? ['Reihenhäuser ohne Abstand: Dachüberstand ist abgeschaltet, damit sich die Häuser nicht überschneiden.'] : [] };
  },
};

/** Parameter ranges diced per house of a street (subset of the house generator). */
const HOUSE_ROLL: readonly ParamDef[] = [
  { key: 'breite', label: 'Breite', group: '', type: 'int', min: 5, max: 9, default: 7 },
  { key: 'tiefe', label: 'Tiefe', group: '', type: 'int', min: 6, max: 9, default: 7 },
  { key: 'geschosse', label: 'Geschosse', group: '', type: 'int', min: 1, max: 4, default: 2 },
  { key: 'geschoss', label: 'Geschosshöhe', group: '', type: 'int', min: 3, max: 5, default: 4 },
  { key: 'dach', label: 'Dach', group: '', type: 'choice', default: 'sattel', options: [{ value: 'sattel', label: '' }, { value: 'walm', label: '' }] },
  { key: 'first', label: 'First', group: '', type: 'choice', default: 'x', options: [{ value: 'x', label: '' }, { value: 'z', label: '' }] },
  { key: 'neigung', label: 'Neigung', group: '', type: 'choice', default: 'steil', options: [{ value: 'steil', label: '' }, { value: 'flach', label: '' }] },
  { key: 'fensterabstand', label: 'Fenster', group: '', type: 'int', min: 2, max: 3, default: 2 },
  { key: 'schornstein', label: 'Schornstein', group: '', type: 'bool', default: true },
];

export const COMPOUNDS: readonly Compound[] = [CASTLE_COMPOUND, STREET_COMPOUND];
export function compoundById(id: string): Compound | undefined { return COMPOUNDS.find(c => c.id === id); }

export interface CompoundBuild {
  readonly project: Project;
  /** New generated assets (one per distinct parameter set). */
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  readonly values: ParamValues;
  readonly notes: readonly string[];
}

/**
 * Builds all parts and a new project with one instance per part. Equal parts
 * share one asset. `makeAsset` is the generator's asset factory (injected to
 * keep this module free of a cycle with generators/index.ts).
 */
export async function buildCompound(id: string, raw: Readonly<Record<string, unknown>>,
  makeAsset: (generatorId: string, values: Readonly<Record<string, unknown>>, name: string) => Promise<{ asset: Asset; version: AssetVersion }>): Promise<CompoundBuild> {
  const compound = compoundById(id);
  if (!compound) throw new Error(`Anlage „${id}“ unbekannt`);
  const { values } = normalizeParams(compound.params, raw);
  const { parts, notes } = compound.plan(values);
  const made = new Map<string, { asset: Asset; version: AssetVersion }>();
  let project = createProject({ name: compound.name, description: `${compound.description} Erzeugt mit „${compound.name}“ v${compound.version}.`, profileId: SAMPLE_PROFILE });
  for (const part of parts) {
    const key = `${part.generatorId}|${canonicalJson(part.values)}`;
    let r = made.get(key);
    if (!r) { r = await makeAsset(part.generatorId, part.values, `${compound.name}: ${part.label}`); made.set(key, r); }
    const transform = memberTransform({ assetId: r.asset.id, at: part.at, turns: part.turns }, r.version);
    project = applyOperation(project, { kind: 'instance.add', instance: newInstance({ assetVersionId: r.version.id, name: part.label, transform }) }).project;
  }
  return { project, assets: [...made.values()].map(m => m.asset), versions: [...made.values()].map(m => m.version), values, notes };
}
