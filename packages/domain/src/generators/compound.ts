import { canonicalJson } from '../hash.js';
import { memberTransform } from '../ensembles.js';
import { applyOperation, createProject, newInstance } from '../project.js';
import { SAMPLE_PROFILE } from '../samples.js';
import type { Asset, AssetVersion, Project } from '../types.js';
import { normalizeParams, rollParams } from './params.js';
import type { ParamDef, ParamValues } from './params.js';
import { STYLE_OPTIONS, styleOf } from './styles.js';
import { Args, defaultsOf } from './params.js';
import { WEATHER_PARAMS } from './types.js';
import type { Generator, Preset } from './types.js';
import { CHURCH_GENERATOR } from './church.js';
import { WELL_GENERATOR } from './well.js';
import { WINDMILL_GENERATOR } from './windmill.js';

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
  id: 'burganlage', name: 'Burganlage', version: 2,
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
    { key: 'torhaus', label: 'Torhaus statt Mauertor', group: 'Details', type: 'bool', default: false, when: { key: 'tor', values: [true] },
      hint: 'Ab Mauerlänge 13: Torbau mit Durchfahrt, Mauern links und rechts docken an.' },
    { key: 'bergfried', label: 'Bergfried im Hof', group: 'Details', type: 'bool', default: true },
  ],
  presets: [
    { id: 'burg', label: 'Kleine Burg', values: { hofBreite: 16, hofTiefe: 16, mauerHoehe: 6, staerke: 2, turmRadius: 3 } },
    { id: 'festung', label: 'Große Festung', values: { hofBreite: 32, hofTiefe: 24, mauerHoehe: 9, staerke: 3, turmRadius: 5, turmDach: 'zinnen', verwitterung: 25 } },
    { id: 'palisade', label: 'Nordischer Hof', values: { hofBreite: 14, hofTiefe: 12, mauerHoehe: 4, staerke: 1, turmForm: 'eckig', turmRadius: 2, stil: 'nordisch', bergfried: false } },
    { id: 'wuestenfort', label: 'Wüstenfort', values: { hofBreite: 20, hofTiefe: 20, mauerHoehe: 7, staerke: 2, turmForm: 'eckig', turmRadius: 3, turmDach: 'zinnen', stil: 'wueste' } },
    { id: 'torburg', label: 'Burg mit Torhaus', values: { hofBreite: 24, hofTiefe: 20, mauerHoehe: 7, staerke: 2, turmRadius: 3, turmDach: 'zinnen', torhaus: true, verwitterung: 15 } },
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
      { key: 'm-s', label: 'Mauer Süd', generatorId: 'mauer', values: wall(Lx), at: [D, deep + off], turns: 2 },
      { key: 'm-w', label: 'Mauer West', generatorId: 'mauer', values: wall(Lz), at: [off, D], turns: 3 },
      { key: 'm-o', label: 'Mauer Ost', generatorId: 'mauer', values: wall(Lz), at: [far + off, D], turns: 1 },
    ];
    // North side: a gatehouse between two walls, or one wall with or without gate.
    const Wg = Math.min(11, Lx - 6 - ((Lx - 6) % 2 === 0 ? 1 : 0));
    if (v.tor && v.torhaus && Wg >= 7) {
      const Tg = Math.min(9, D), gh = Math.max(3, Math.min(5, h - 2)), left = Math.floor((Lx - Wg) / 2), right = Lx - Wg - left;
      const gate = { ...shared, breite: Wg, tiefe: Tg, hoehe: h + 4, torbreite: 3, torhoehe: gh, abschluss: 'zinnen', wachstuben: true, anschluesse: true, mauerStaerke: t, mauerHoehe: h + 1 };
      parts.push({ key: 'm-n1', label: 'Mauer Nord (West)', generatorId: 'mauer', values: wall(left), at: [D, off], turns: 0 },
        { key: 'torhaus', label: 'Torhaus', generatorId: 'torhaus', values: gate, at: [D + left, r - (Tg - 1) / 2], turns: 0 },
        { key: 'm-n2', label: 'Mauer Nord (Ost)', generatorId: 'mauer', values: wall(right), at: [D + left + Wg, off], turns: 0 });
    } else {
      if (v.tor && v.torhaus) notes.push('Für ein Torhaus ist die Nordmauer zu kurz (mindestens 13): Tor in der Mauer.');
      parts.push({ key: 'm-n', label: v.tor ? 'Tormauer Nord' : 'Mauer Nord', generatorId: 'mauer', values: wall(Lx, v.tor === true), at: [D, off], turns: 0 });
    }
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
  id: 'haeuserzeile', name: 'Häuserzeile', version: 2,
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

/** Footprint (x, z) of a generator's output for the given values. */
function footprint(g: Generator, raw: Readonly<Record<string, unknown>>): readonly [number, number] {
  const { values } = normalizeParams(g.params, { ...defaultsOf(g.params), ...raw });
  const size = g.build(new Args(values), values).payload.bounds.maxExclusive;
  return [size[0], size[2]];
}

export const VILLAGE_COMPOUND: Compound = {
  id: 'dorfplatz', name: 'Dorfplatz', version: 2,
  description: 'Dorfmitte als fertiges Projekt: Kirche an der Nordseite mit Portal zum Platz, Brunnen in der Mitte, Häuserzeile gegenüber und Windmühle am Rand.',
  params: [
    { key: 'platzBreite', label: 'Platzbreite (x)', group: 'Maße', type: 'int', min: 12, max: 40, default: 20, unit: 'Blöcke' },
    { key: 'platzTiefe', label: 'Platztiefe (z)', group: 'Maße', type: 'int', min: 8, max: 30, default: 14, unit: 'Blöcke' },
    { key: 'haeuser', label: 'Häuser an der Südseite', group: 'Gebäude', type: 'int', min: 0, max: 8, default: 4 },
    { key: 'maxGeschosse', label: 'Höchstens Geschosse', group: 'Gebäude', type: 'int', min: 1, max: 3, default: 2 },
    { key: 'kirche', label: 'Kirche', group: 'Gebäude', type: 'choice', default: 'dorfkirche', options: [
      { value: 'dorfkirche', label: 'Dorfkirche mit Turm' }, { value: 'kapelle', label: 'Kapelle mit Dachreiter' }, { value: 'basilika', label: 'Basilika' }, { value: 'keine', label: 'Keine Kirche' }] },
    { key: 'brunnen', label: 'Brunnen', group: 'Gebäude', type: 'choice', default: 'springbrunnen', options: [
      { value: 'springbrunnen', label: 'Springbrunnen' }, { value: 'ziehbrunnen', label: 'Ziehbrunnen' }, { value: 'keiner', label: 'Kein Brunnen' }] },
    { key: 'muehle', label: 'Windmühle am Rand', group: 'Gebäude', type: 'bool', default: true },
    { key: 'stil', label: 'Stil', group: 'Stil & Material', type: 'choice', options: STYLE_OPTIONS, default: 'fachwerk' },
    ...WEATHER_PARAMS,
  ],
  presets: [
    { id: 'dorf', label: 'Kleines Dorf', values: { platzBreite: 18, platzTiefe: 12, haeuser: 3, maxGeschosse: 2, kirche: 'kapelle', brunnen: 'ziehbrunnen', stil: 'fachwerk' } },
    { id: 'marktflecken', label: 'Marktflecken', values: { platzBreite: 28, platzTiefe: 18, haeuser: 6, maxGeschosse: 3, kirche: 'dorfkirche', brunnen: 'springbrunnen', stil: 'fachwerk' } },
    { id: 'bergdorf', label: 'Nordisches Bergdorf', values: { platzBreite: 16, platzTiefe: 12, haeuser: 4, maxGeschosse: 1, kirche: 'kapelle', brunnen: 'ziehbrunnen', stil: 'nordisch' } },
    { id: 'domplatz', label: 'Domplatz', values: { platzBreite: 32, platzTiefe: 22, haeuser: 6, maxGeschosse: 3, kirche: 'basilika', brunnen: 'springbrunnen', muehle: false, stil: 'mittelalter', verwitterung: 15 } },
    { id: 'oasenplatz', label: 'Oasenplatz', values: { platzBreite: 20, platzTiefe: 14, haeuser: 4, maxGeschosse: 2, kirche: 'keine', brunnen: 'ziehbrunnen', muehle: true, stil: 'wueste' } },
  ],
  plan(v) {
    const parts: CompoundPart[] = [], notes: string[] = [], style = styleOf(str(v, 'stil'));
    const shared = { stil: style.key, verwitterung: num(v, 'verwitterung'), variante: num(v, 'variante') };
    const Px = num(v, 'platzBreite'), Pz = num(v, 'platzTiefe');
    // North row: church (portal to the square) and the mill beside it.
    const churchPreset = CHURCH_GENERATOR.presets.find(p => p.id === str(v, 'kirche'));
    const church = churchPreset ? { ...churchPreset.values, ...shared } : null;
    const [cxs, czs] = church ? footprint(CHURCH_GENERATOR, church) : [0, 0];
    const mill = v.muehle ? { ...WINDMILL_GENERATOR.presets.find(p => p.id === 'dorfmuehle')!.values, ...shared, stil: style.key === 'modern' ? 'fachwerk' : style.key } : null;
    const [mxs, mzs] = mill ? footprint(WINDMILL_GENERATOR, mill) : [0, 0];
    // South row: rolled houses facing the square.
    const houses: { values: Record<string, unknown>; w: number }[] = [];
    for (let i = 0; i < num(v, 'haeuser'); i++) {
      const roll = rollParams(HOUSE_ROLL, num(v, 'variante') * 613 + i * 151);
      const values = { ...roll, ...shared, variante: num(v, 'variante') + i, geschosse: Math.min(num(v, 'maxGeschosse'), roll.geschosse as number),
        ueberstand: 1, dach: style.flat ? 'flach' : roll.dach, vordach: false, einrichtung: true };
      houses.push({ values, w: (roll.breite as number) + 2 });
    }
    const gap = 2, rowW = houses.reduce((n, h) => n + h.w, 0) + gap * Math.max(0, houses.length - 1);
    const width = Math.max(Px, rowW, cxs + (mill ? 2 * (3 + mxs) : 0));
    const zSquare = Math.max(czs, mzs) + 1, zSouth = zSquare + Pz + 1, mid = Math.floor(width / 2);
    if (church) parts.push({ key: 'kirche', label: 'Kirche', generatorId: 'kirche', values: church, at: [mid - Math.floor(cxs / 2), Math.max(czs, mzs) - czs], turns: 2 });
    if (mill) {
      const mx = church ? mid - Math.floor(cxs / 2) + cxs + 3 : width - mxs;
      parts.push({ key: 'muehle', label: 'Windmühle', generatorId: 'windmuehle', values: mill, at: [mx, 0], turns: 0 });
    }
    const wellKind = str(v, 'brunnen');
    if (wellKind !== 'keiner') {
      const radius = Math.max(1, Math.min(4, Math.floor(Math.min(Px, Pz) / 6))), well = { ...shared, form: wellKind, radius, schalen: 2, dach: true, platz: 1, laternen: true };
      const [wxs, wzs] = footprint(WELL_GENERATOR, well);
      if (wxs > Px || wzs > Pz) notes.push('Platz zu klein für den Brunnen.');
      else parts.push({ key: 'brunnen', label: 'Brunnen', generatorId: 'brunnen', values: well, at: [mid - Math.floor(wxs / 2), zSquare + Math.floor((Pz - wzs) / 2)], turns: 0 });
    }
    let x = mid - Math.floor(rowW / 2);
    houses.forEach((h, i) => { parts.push({ key: `haus-${i + 1}`, label: `Haus ${i + 1}`, generatorId: 'haus', values: h.values, at: [x, zSouth], turns: 0 }); x += h.w + gap; });
    notes.push(`Platz ${Px} × ${Pz}: Kirchenportal und Haustüren zeigen zum Platz; der Platz selbst bleibt frei für Wege und Märkte.`);
    return { parts, notes };
  },
};

export const COMPOUNDS: readonly Compound[] = [CASTLE_COMPOUND, STREET_COMPOUND, VILLAGE_COMPOUND];
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
