import type { Cell, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import { createPayload } from '../../../voxel/src/validation.js';
import { transformCellPosition } from '../../../voxel/src/transforms.js';
import { SHIPPED_LABEL, normalizeChoices, openWaterEdges, partWithRims, previewAnlage } from './anlagen.js';
import type { Anlage, AnlageLibrary, AnlagePlacement, AnlagePlan, AnlagePreview, Footprint, SlotState } from './anlagen.js';
import { BASE_PHASES, affinity, baseFunctionById, checkRequirements } from './baseFunctions.js';
import type { BaseFunction, BaseFunctionId, BasePhase, Requirement } from './baseFunctions.js';
import { placementBounds } from '../core/connectors.js';
import { entranceOf, turnedSide, turnsToFace } from './entrance.js';
import type { Side } from './entrance.js';
import { newId } from '../core/hash.js';
import { addAssetVersion, createAsset } from '../catalog/library.js';
import { applyOperation, createProject } from '../core/project.js';
import type { Operation } from '../core/project.js';
import { SAMPLE_PROFILE } from '../core/samples.js';
import { addSection, checkSite, siteOf } from '../building/site.js';
import type { SitePlan } from '../building/site.js';
import { latestReleaseId } from '../versions/updateState.js';
import { DomainError } from '../core/types.js';
import type { Asset, AssetVersion, ConnectorLink, Instance, Project } from '../core/types.js';
import { stableHypot } from '../../../voxel/src/stableMath.js';

/**
 * Basisplaner (BASE-01): a whole survival base – storage hall, kitchen,
 * forge, enchanting tower, XP farm, fields, animal pens, harbour, traders –
 * planned as function zones around a plaza, connected by a routed path
 * network, with the shore on one side and build phases for the site.
 *
 *  1. Zones: every zone has one function (baseFunctions.ts), real catalog
 *     buildings (main building swappable, fields/piers countable) or a reserved
 *     plot (XP farm around a spawner found in game).
 *  2. Layout: the plaza in the middle; zones are placed one by one where the
 *     sum of "wants to be near" (storage–forge, kitchen–fields …) is best,
 *     central functions close to the plaza, mob farms away from it, farms
 *     towards the water, the harbour on the shore with its piers in the water.
 *     Doors are turned towards the plaza. Pure and deterministic.
 *  3. Paths: from every zone entrance a path is routed (A*, prefers existing
 *     paths so a trunk network forms, avoids buildings and water, few turns)
 *     to the plaza; the network becomes one own part with path blocks and
 *     lanterns on fence posts.
 *  4. Checks: requirements per zone on the real blocks (enchanting power,
 *     hydrated farmland, workstations …), voxel conflicts via the composer
 *     (previewAnlage), terrain fit via fitAnlageToTerrain.
 *  5. Adoption on button press only: project with instances, the path network
 *     part and one build section per phase.
 */

export type WaterSide = 'keine' | 'nord' | 'ost' | 'sued' | 'west';
export const WATER_SIDE_LABEL: Readonly<Record<WaterSide, string>> = { keine: 'kein Wasser', nord: 'Norden', ost: 'Osten', sued: 'Süden', west: 'Westen' };
export type PathStyle = 'dorf' | 'kies' | 'stein';
export const PATH_STYLE_LABEL: Readonly<Record<PathStyle, string>> = { dorf: 'Trampelpfad (Erdweg, Kies)', kies: 'Kiesweg', stein: 'Pflaster (Steinziegel)' };
export const RESERVE_ID = 'reserve';

export interface BaseTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly water: WaterSide;
  readonly zones: readonly BaseFunctionId[];
}

export const BASE_TEMPLATES: readonly BaseTemplate[] = [
  { id: 'kuestenbasis', name: 'Küstenbasis', water: 'sued',
    description: 'Eine Siedlung an der Küste: Dorfplatz mit Brunnen in der Mitte, Lager, Schmiede und Waffenkammer im Hinterland, Küche und Gemeinschaftshalle am Platz, Felder und Tierfarm zum Wasser hin, Hafen mit Stegen, Händler, Verzauberungsturm und eine abgelegene XP-Farm.',
    zones: ['platz', 'lager', 'waffenkammer', 'schmiede', 'verzauberung', 'xpfarm', 'kueche', 'halle', 'getreidefarm', 'tierfarm', 'hafen', 'handel'] },
  { id: 'starterbasis', name: 'Starterbasis', water: 'keine',
    description: 'Kompakter Anfang für die ersten Spieltage: Lagerfeuerplatz, Wohnhaus, Lager, Küche, ein Feld, Schmiede und Tierfarm.',
    zones: ['platz', 'wohnen', 'lager', 'kueche', 'getreidefarm', 'schmiede', 'tierfarm'] },
  { id: 'handelshafen', name: 'Handelshafen', water: 'ost',
    description: 'Hafen und Händlerviertel als Herz: Lager am Kai, Küche und Halle am Platz, Wohnhäuser und Felder im Hinterland.',
    zones: ['platz', 'hafen', 'lager', 'handel', 'kueche', 'halle', 'wohnen', 'getreidefarm', 'tierfarm'] },
];
export const baseTemplateById = (id: string) => BASE_TEMPLATES.find(t => t.id === id);

export interface BaseZoneChoice {
  /** Unique zone key, e.g. "lager" or "wohnen-2". */
  readonly key: string;
  readonly fn: BaseFunctionId;
  readonly off?: boolean;
  /** Main building: catalog/own asset id or RESERVE_ID for a reserved plot. */
  readonly main?: string;
  /** Count per member role (fields, piers). */
  readonly counts?: Readonly<Record<string, number>>;
  readonly name?: string;
}

export interface BaseChoices {
  readonly template?: string;
  /** Full zone list; default the template's zones. */
  readonly zones?: readonly BaseZoneChoice[];
  readonly water?: WaterSide;
  readonly pathWidth?: number;
  /** Free blocks between a building and the path (on both sides of every path). */
  readonly spacing?: number;
  readonly pathStyle?: PathStyle;
  readonly lights?: boolean;
  /** Turn entrances towards the plaza (default true). */
  readonly doors?: boolean;
}
export const PATH_WIDTH = { min: 1, max: 5, default: 3 } as const;
export const BASE_SPACING = { min: 1, max: 8, default: 2 } as const;
export const MAX_ZONES = 24;
const LAMP_DISTANCE = 10;

const fail = (message: string): never => { throw new DomainError('BASE', `Basis: ${message}`); };

export function defaultZones(template: BaseTemplate): BaseZoneChoice[] {
  const seen = new Map<string, number>();
  return template.zones.map(fn => { const n = (seen.get(fn) ?? 0) + 1; seen.set(fn, n); return { key: n > 1 ? `${fn}-${n}` : fn, fn }; });
}
/** Next free key for an added zone of a function. */
export function zoneKeyFor(zones: readonly BaseZoneChoice[], fn: BaseFunctionId): string {
  const keys = new Set(zones.map(z => z.key));
  if (!keys.has(fn)) return fn;
  for (let n = 2; ; n++) if (!keys.has(`${fn}-${n}`)) return `${fn}-${n}`;
}

export interface NormalizedBaseChoices {
  readonly template: BaseTemplate;
  readonly zones: readonly BaseZoneChoice[];
  readonly water: WaterSide;
  readonly pathWidth: number;
  readonly spacing: number;
  readonly pathStyle: PathStyle;
  readonly lights: boolean;
  readonly doors: boolean;
}

export function normalizeBaseChoices(raw: BaseChoices = {}): NormalizedBaseChoices {
  const template = baseTemplateById(raw.template ?? BASE_TEMPLATES[0]!.id) ?? fail(`Vorlage ${raw.template} gibt es nicht`);
  const zones = raw.zones ?? defaultZones(template);
  if (zones.length > MAX_ZONES) fail(`höchstens ${MAX_ZONES} Zonen`);
  const keys = new Set<string>();
  for (const z of zones) {
    if (!/^[a-z0-9-]{1,40}$/.test(z.key) || keys.has(z.key)) fail(`Zonenschlüssel ${z.key} ungültig oder doppelt`);
    keys.add(z.key);
    const fn = baseFunctionById(z.fn) ?? fail(`Funktion ${z.fn} gibt es nicht`);
    for (const [role, n] of Object.entries(z.counts ?? {})) {
      const member = fn.members.find(m => m.role === role) ?? fail(`${fn.name}: Teil ${role} gibt es nicht`);
      if (!Number.isInteger(n) || n < 0 || n > (member.maxCount ?? 1)) fail(`${fn.name}: ${role} 0–${member.maxCount ?? 1}`);
    }
  }
  const water = raw.water ?? template.water;
  if (!(water in WATER_SIDE_LABEL)) fail(`Wasserseite ${water} unbekannt`);
  const int = (v: number | undefined, r: { min: number; max: number; default: number }, label: string) => {
    const n = v ?? r.default; if (!Number.isInteger(n) || n < r.min || n > r.max) fail(`${label} ${r.min}–${r.max}`); return n;
  };
  const pathStyle = raw.pathStyle ?? 'dorf';
  if (!(pathStyle in PATH_STYLE_LABEL)) fail(`Wegstil ${pathStyle} unbekannt`);
  return { template, zones, water, pathWidth: int(raw.pathWidth, PATH_WIDTH, 'Wegbreite'), spacing: int(raw.spacing, BASE_SPACING, 'Abstand'), pathStyle, lights: raw.lights !== false, doors: raw.doors !== false };
}

// ---------------------------------------------------------------------------
// Geometry helpers

type Turns = 0 | 1 | 2 | 3;
const ORIGIN = { position: [0, 0, 0] as Vec3, quarterTurns: 0 as Turns, mirrorX: false };
const footOf = (v: AssetVersion, turns: Turns, x = 0, z = 0): Footprint => {
  const b = placementBounds(v, { ...ORIGIN, quarterTurns: turns });
  return { x0: x, z0: z, x1: x + b.maxExclusive[0] - b.min[0], z1: z + b.maxExclusive[2] - b.min[2] };
};
function at(version: AssetVersion, turns: Turns, x: number, z: number) {
  const b = placementBounds(version, { ...ORIGIN, quarterTurns: turns });
  return { position: [x - b.min[0], -b.min[1], z - b.min[2]] as Vec3, quarterTurns: turns, mirrorX: false };
}
const union = (fs: readonly Footprint[]): Footprint | null => fs.length
  ? { x0: Math.min(...fs.map(f => f.x0)), z0: Math.min(...fs.map(f => f.z0)), x1: Math.max(...fs.map(f => f.x1)), z1: Math.max(...fs.map(f => f.z1)) } : null;
const shiftF = (f: Footprint, dx: number, dz: number): Footprint => ({ x0: f.x0 + dx, z0: f.z0 + dz, x1: f.x1 + dx, z1: f.z1 + dz });
const centre = (f: Footprint): [number, number] => [(f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2];
const gapOf = (a: Footprint, b: Footprint) => Math.max(b.x0 - a.x1, a.x0 - b.x1, b.z0 - a.z1, a.z0 - b.z1);
const dist = (a: readonly number[], b: readonly number[]) => stableHypot(a[0]! - b[0]!, a[1]! - b[1]!);
/** Quarter turns of the whole layout so that the canonical water side (+z, south) ends up on `water`. */
const LAYOUT_TURNS: Readonly<Record<WaterSide, Turns>> = { keine: 0, sued: 0, west: 1, nord: 2, ost: 3 };
/** One quarter turn of a cell (same convention as the transform kernel: (x, z) → (−z−1, x)). */
const rotCell = (x: number, z: number, k: Turns): [number, number] => { let a = x, b = z; for (let i = 0; i < k; i++) [a, b] = [-b - 1, a]; return [a, b]; };
const rotRect = (f: Footprint, k: Turns): Footprint => { let r = f; for (let i = 0; i < k; i++) r = { x0: -r.z1, z0: r.x0, x1: -r.z0, z1: r.x1 }; return r; };
const SIDE_STEP: Readonly<Record<Side, readonly [number, number]>> = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };

// ---------------------------------------------------------------------------
// Zones

export interface BaseMemberPlan {
  /** Placement key: `<zone>.<role>.<n>`. */
  readonly key: string;
  readonly role: string;
  readonly assetId: string;
  readonly version: AssetVersion | null;
  readonly turns: Turns;
  readonly water: boolean;
  /** Final footprint (null when the version is missing). */
  readonly footprint: Footprint | null;
  readonly turnSource: 'door' | 'curated';
}
export interface BaseZonePlan {
  readonly key: string;
  readonly fn: BaseFunction;
  readonly name: string;
  readonly phase: BasePhase;
  readonly enabled: boolean;
  readonly reserved: boolean;
  /** Final footprint of the whole zone (members or reserved plot). */
  readonly rect: Footprint | null;
  readonly members: readonly BaseMemberPlan[];
  /** Cell in front of the entrance where the path starts. */
  readonly access: readonly [number, number] | null;
  /** Path from this zone reaches the plaza. */
  readonly routed: boolean;
  /** Harbour piers reach into the water (null: no water side or not a harbour). */
  readonly atWater: boolean | null;
  readonly requirements: readonly Requirement[];
  readonly problems: readonly string[];
}

interface Unit { readonly zone: number; w: number; d: number; /** Depth of the land rows (piers start below). */ land: number; parts: { member: number; dx: number; dz: number }[] }

function versionOf(lib: AnlageLibrary, assets: ReadonlyMap<string, Asset>, assetId: string): AssetVersion | null {
  const asset = assets.get(assetId);
  if (!asset) return null;
  for (const id of asset.versionIds) { const v = lib.versions.get(id); if (v?.label === SHIPPED_LABEL && v.source.format === 'demo') return v; }
  return lib.versions.get(latestReleaseId(asset, lib.versions) ?? '') ?? null;
}

// ---------------------------------------------------------------------------
// Layout

export interface BaseLayout {
  readonly choices: NormalizedBaseChoices;
  readonly zones: readonly BaseZonePlan[];
  /** Building placements (without the path network). */
  readonly placements: readonly AnlagePlacement[];
  /** Path cells (x, z) of the network, sorted. */
  readonly paths: readonly (readonly [number, number])[];
  readonly lamps: readonly (readonly [number, number])[];
  /** Water: everything beyond this line on the water side (final coordinates), null without water. */
  readonly water: { readonly side: Exclude<WaterSide, 'keine'>; readonly line: number } | null;
  readonly plaza: Footprint;
  readonly extent: Footprint | null;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Plans the layout of a base: zones, building placements, path network and
 * water line. Pure and deterministic; nothing is stored.
 */
export function layoutBase(library: AnlageLibrary, raw: BaseChoices = {}): BaseLayout {
  const choices = normalizeBaseChoices(raw);
  const assets = new Map(library.assets.map(a => [a.id, a]));
  const blockers: string[] = [], warnings: string[] = [];
  const water = choices.water !== 'keine';
  const clearance = choices.pathWidth + 2 * choices.spacing;

  // Zone members with versions (turns decided per pass).
  interface ZoneState {
    key: string; fn: BaseFunction; name: string; enabled: boolean; reserved: boolean; problems: string[];
    members: { key: string; role: string; assetId: string; version: AssetVersion | null; water: boolean; turns: Turns; turnSource: 'door' | 'curated' }[];
  }
  const zones: ZoneState[] = choices.zones.map(z => {
    const fn = baseFunctionById(z.fn)!;
    const problems: string[] = [];
    let enabled = !z.off;
    if (fn.coast === 'muss' && !water && enabled) { enabled = false; problems.push(`${fn.name} braucht eine Wasserseite – Zone ausgelassen.`); }
    const main = z.main ?? fn.members[0]?.assetId ?? RESERVE_ID;
    const reserved = main === RESERVE_ID;
    const members: ZoneState['members'] = [];
    fn.members.forEach((m, i) => {
      const count = i === 0 ? (reserved ? 0 : 1) : (z.counts?.[m.role] ?? m.count ?? 1);
      const n0 = i === 0 ? 1 : count;
      for (let n = 1; n <= n0 && (i > 0 || !reserved); n++) {
        const assetId = i === 0 ? main : m.assetId;
        const version = versionOf(library, assets, assetId);
        if (!version && enabled) problems.push(`${m.role}: Bauteil ${assetId} fehlt`);
        members.push({ key: `${z.key}.${m.role.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${n}`, role: count > 1 || n > 1 ? `${m.role} ${n}` : m.role, assetId, version, water: !!m.water, turns: 0, turnSource: 'curated' });
      }
    });
    if (!fn.members.length && !reserved) {
      const version = versionOf(library, assets, main);
      if (!version && enabled) problems.push(`Bauteil ${main} fehlt`);
      members.push({ key: `${z.key}.haupt.1`, role: fn.name, assetId: main, version, water: false, turns: 0, turnSource: 'curated' });
    }
    // The first count of the main member follows `counts` too (fields).
    if (!reserved && fn.members[0]?.maxCount && fn.members[0].maxCount > 1) {
      const n = z.counts?.[fn.members[0].role] ?? fn.members[0].count ?? 1;
      const base = members[0]!;
      members.splice(0, 1, ...Array.from({ length: n }, (_, i) => ({ ...base, key: `${base.key.replace(/\.1$/, '')}.${i + 1}`, role: n > 1 ? `${fn.members[0]!.role} ${i + 1}` : fn.members[0]!.role })));
    }
    for (const p of problems) if (enabled && !p.includes('Wasserseite')) blockers.push(`${z.name ?? fn.name}: ${p}`);
    return { key: z.key, fn, name: z.name?.trim() || fn.name, enabled, reserved, problems, members };
  });
  // Unique zone names (two "Wohnhaus" → "Wohnhaus 2").
  const nameCount = new Map<string, number>();
  for (const z of zones) { const n = (nameCount.get(z.name) ?? 0) + 1; nameCount.set(z.name, n); if (n > 1) z.name = `${z.name} ${n}`; }

  const plazaIndex = zones.findIndex(z => z.enabled && z.fn.id === 'platz');

  /** Packs a zone: land members in rows, water members (piers) in one row on the +z side. */
  const pack = (z: ZoneState): Unit | null => {
    const gap = z.fn.gap ?? 2, rowWidth = z.fn.rowWidth ?? 48;
    if (z.reserved) { const [w, d] = z.fn.reserve ?? [15, 15]; return { zone: zones.indexOf(z), w, d, land: d, parts: [] }; }
    const parts: Unit['parts'] = [];
    let x = 0, zz = 0, rowDepth = 0, maxX = 0;
    const row = (list: number[]) => {
      for (const i of list) {
        const m = z.members[i]!; if (!m.version) continue;
        const f = footOf(m.version, m.turns);
        const w = f.x1 - f.x0, d = f.z1 - f.z0;
        if (x > 0 && x + w > rowWidth) { zz += rowDepth + gap; x = 0; rowDepth = 0; }
        parts.push({ member: i, dx: x, dz: zz });
        x += w + gap; rowDepth = Math.max(rowDepth, d); maxX = Math.max(maxX, x - gap);
      }
    };
    const land = z.members.map((m, i) => m.water ? -1 : i).filter(i => i >= 0), wet = z.members.map((m, i) => m.water ? i : -1).filter(i => i >= 0);
    row(land);
    const landDepth = land.length ? zz + rowDepth : 0;
    if (wet.length) { zz += rowDepth + (land.length ? 1 : 0); x = 0; rowDepth = 0; row(wet); }
    if (!parts.length) return null;
    const depth = Math.max(...parts.map(p => { const m = z.members[p.member]!; const f = footOf(m.version!, m.turns); return p.dz + f.z1 - f.z0; }));
    return { zone: zones.indexOf(z), w: maxX, d: depth, land: wet.length ? landDepth : depth, parts };
  };

  /** Greedy placement of all zone units in the canonical frame (water at +z). */
  const place = (): Map<number, Footprint> => {
    const units = new Map<number, Unit>();
    zones.forEach((z, i) => { if (z.enabled) { const u = pack(z); if (u) units.set(i, u); } });
    const rects = new Map<number, Footprint>();
    const plazaRect: Footprint = plazaIndex >= 0 && units.has(plazaIndex)
      ? (() => { const u = units.get(plazaIndex)!; const x0 = -Math.floor(u.w / 2), z0 = -Math.floor(u.d / 2); return { x0, z0, x1: x0 + u.w, z1: z0 + u.d }; })()
      : { x0: -2, z0: -2, x1: 3, z1: 3 };
    if (plazaIndex >= 0 && units.has(plazaIndex)) rects.set(plazaIndex, plazaRect);
    const anchors: Footprint[] = [plazaRect];
    const plazaC = centre(plazaRect);
    const fits = (f: Footprint) => gapOf(plazaRect, f) >= clearance && [...rects.values()].every(r => gapOf(r, f) >= clearance);
    const score = (i: number, f: Footprint): number => {
      const z = zones[i]!, c = centre(f);
      let s = 0;
      for (const [j, r] of rects) s += affinity(z.fn.id, zones[j]!.fn.id) * dist(c, centre(r)) * 1.0;
      s += z.fn.central * dist(c, plazaC) * 0.8;
      if (z.fn.apart) s -= dist(c, plazaC) * 1.5;
      // Water at +z: farms pull towards it, everything else stays on the plaza's land side.
      if (water && !z.fn.coast) s += 0.8 * Math.max(0, f.z1 - plazaRect.z1);
      const box = union([...rects.values(), plazaRect, f])!;
      s += 0.25 * ((box.x1 - box.x0) + (box.z1 - box.z0));
      return s;
    };
    const remaining = [...units.keys()].filter(i => i !== plazaIndex);
    // With water, harbour and farms form the shore row (harbour first), everything else the hinterland.
    const coastal = remaining.filter(i => water && !!zones[i]!.fn.coast).sort((a, b) => (zones[a]!.fn.coast === 'muss' ? 0 : 1) - (zones[b]!.fn.coast === 'muss' ? 0 : 1) || a - b);
    let land = remaining.filter(i => !coastal.includes(i));
    while (land.length) {
      // Next: the zone most tied to what is placed (affinity), central ones first.
      land.sort((a, b) => {
        const pull = (i: number) => zones[i]!.fn.central * 2 + [...rects.keys()].reduce((n, j) => n + Math.max(0, affinity(zones[i]!.fn.id, zones[j]!.fn.id)), 0) - (zones[i]!.fn.apart ? 3 : 0);
        return pull(b) - pull(a) || a - b;
      });
      const i = land.shift()!, u = units.get(i)!;
      let best: Footprint | null = null, bestScore = Infinity;
      for (const p of [plazaRect, ...rects.values(), ...anchors]) {
        const options: Footprint[] = [];
        const along = (from: number, to: number) => { const out = new Set<number>(); for (let v = from; v <= to; v += 3) out.add(v); out.add(to); return [...out]; };
        for (const x of along(p.x0 - u.w + 1, p.x1 - 1)) { options.push({ x0: x, z0: p.z0 - clearance - u.d, x1: x + u.w, z1: p.z0 - clearance }); options.push({ x0: x, z0: p.z1 + clearance, x1: x + u.w, z1: p.z1 + clearance + u.d }); }
        for (const z of along(p.z0 - u.d + 1, p.z1 - 1)) { options.push({ x0: p.x0 - clearance - u.w, z0: z, x1: p.x0 - clearance, z1: z + u.d }); options.push({ x0: p.x1 + clearance, z0: z, x1: p.x1 + clearance + u.w, z1: z + u.d }); }
        for (const f of options) {
          if (!fits(f)) continue;
          const s = score(i, f);
          if (s < bestScore - 1e-9) { bestScore = s; best = f; }
        }
      }
      if (!best) { warnings.push(`${zones[i]!.name}: kein Platz gefunden`); continue; }
      rects.set(i, best);
    }
    // Shore row: coastal zones along the water side, their land parts ending on one shoreline; piers reach beyond it.
    if (coastal.length) {
      const all = union([...rects.values(), plazaRect])!;
      const shoreEnd = all.z1 + clearance + Math.max(...coastal.map(i => units.get(i)!.land));
      shore = shoreEnd;
      for (const i of coastal) {
        const u = units.get(i)!;
        let best: Footprint | null = null, bestScore = Infinity;
        const placedNow = union([...rects.values(), plazaRect])!;
        for (let x = placedNow.x0 - u.w - clearance; x <= placedNow.x1 + clearance; x += 2) {
          const f = { x0: x, z0: shoreEnd - u.land, x1: x + u.w, z1: shoreEnd - u.land + u.d };
          if (!fits(f)) continue;
          const s = score(i, f);
          if (s < bestScore - 1e-9) { bestScore = s; best = f; }
        }
        if (best) rects.set(i, best); else warnings.push(`${zones[i]!.name}: kein Platz am Ufer gefunden`);
      }
    }
    if (!rects.has(plazaIndex) && plazaIndex >= 0) rects.set(plazaIndex, plazaRect);
    placedUnits = units;
    plazaFoot = plazaRect;
    return rects;
  };
  let placedUnits = new Map<number, Unit>();
  let plazaFoot: Footprint = { x0: -2, z0: -2, x1: 3, z1: 3 };
  let shore: number | null = null;

  // Pass 1: positions; pass 2: doors face the plaza, then place again with the turned footprints.
  let rects = place();
  if (choices.doors) {
    shore = null;
    for (const [i, r] of rects) {
      if (i === plazaIndex) continue;
      const z = zones[i]!, c = centre(r), p = centre(plazaFoot);
      const dx = p[0] - c[0], dz = p[1] - c[1];
      const want: Side = Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'west' : 'east') : (dz < 0 ? 'north' : 'south');
      for (const m of z.members) {
        if (!m.version || m.water) continue;
        const t = turnsToFace(entranceOf(m.version.payload), want);
        if (t !== null) { m.turns = t; m.turnSource = 'door'; }
      }
    }
    rects = place();
  }

  // Water line (canonical: everything with z ≥ line is water).
  let line: number | null = null;
  if (water) {
    const landFeet: Footprint[] = [];
    for (const [i, r] of rects) {
      const u = placedUnits.get(i); if (!u) { landFeet.push(r); continue; }
      const z = zones[i]!;
      if (!u.parts.length) { landFeet.push(r); continue; }
      for (const p of u.parts) { const m = z.members[p.member]!; if (!m.water) landFeet.push(shiftF(footOf(m.version!, m.turns), r.x0 + p.dx, r.z0 + p.dz)); }
    }
    // One block of beach behind the deepest land building, then water.
    line = Math.max(union(landFeet)?.z1 ?? 0, shore ?? -Infinity) + 1;
  }

  // Member footprints (canonical).
  const memberFeet = new Map<string, Footprint>();
  for (const [i, r] of rects) {
    const u = placedUnits.get(i); if (!u) continue;
    for (const p of u.parts) { const m = zones[i]!.members[p.member]!; memberFeet.set(m.key, shiftF(footOf(m.version!, m.turns), r.x0 + p.dx, r.z0 + p.dz)); }
  }

  // ---------------------------------------------------------------- path network (canonical)
  let pathCells: [number, number][] = [];
  const pathSet = new Set<number>();
  const lampList: [number, number][] = [];
  const access = new Map<number, [number, number]>();
  const routed = new Set<number>();
  const allFeet = [...memberFeet.values(), ...[...rects].filter(([i]) => zones[i]!.reserved).map(([, r]) => r)];
  const bbox = union([...rects.values(), plazaFoot]);
  if (bbox) {
    const pad = clearance + 4;
    const gx0 = bbox.x0 - pad, gz0 = bbox.z0 - pad, GW = bbox.x1 - bbox.x0 + 2 * pad, GL = bbox.z1 - bbox.z0 + 2 * pad;
    const idx = (x: number, z: number) => (x - gx0) + (z - gz0) * GW;
    const inside = (x: number, z: number) => x >= gx0 && z >= gz0 && x < gx0 + GW && z < gz0 + GL;
    const blocked = new Uint8Array(GW * GL), near = new Uint8Array(GW * GL), target = new Uint8Array(GW * GL);
    for (const f of allFeet) for (let x = f.x0; x < f.x1; x++) for (let z = f.z0; z < f.z1; z++) if (inside(x, z)) blocked[idx(x, z)] = 1;
    if (line !== null) for (let z = Math.max(line, gz0); z < gz0 + GL; z++) for (let x = gx0; x < gx0 + GW; x++) blocked[idx(x, z)] = 1;
    for (let x = gx0; x < gx0 + GW; x++) for (let z = gz0; z < gz0 + GL; z++) {
      if (blocked[idx(x, z)]) continue;
      for (let dx = -choices.spacing; dx <= choices.spacing && !near[idx(x, z)]; dx++) for (let dz = -choices.spacing; dz <= choices.spacing; dz++) {
        if (inside(x + dx, z + dz) && blocked[idx(x + dx, z + dz)]) { near[idx(x, z)] = 1; break; }
      }
    }
    // Targets: the ring around the plaza (or the virtual crossing).
    const ring = { x0: plazaFoot.x0 - 1, z0: plazaFoot.z0 - 1, x1: plazaFoot.x1 + 1, z1: plazaFoot.z1 + 1 };
    for (let x = ring.x0; x < ring.x1; x++) for (let z = ring.z0; z < ring.z1; z++) {
      const edge = x === ring.x0 || z === ring.z0 || x === ring.x1 - 1 || z === ring.z1 - 1;
      if (inside(x, z) && (edge || plazaIndex < 0) && !blocked[idx(x, z)]) target[idx(x, z)] = 1;
    }
    const half0 = Math.floor((choices.pathWidth - 1) / 2), half1 = choices.pathWidth - 1 - half0;
    const paint = (x: number, z: number, along: 'x' | 'z') => {
      for (let o = -half0; o <= half1; o++) {
        const px = along === 'x' ? x : x + o, pz = along === 'x' ? z + o : z;
        if (inside(px, pz) && !blocked[idx(px, pz)]) pathSet.add(idx(px, pz));
      }
    };
    // A path ring around the plaza: every side can be reached, routes end on it.
    if (plazaIndex >= 0) for (let x = plazaFoot.x0 - choices.pathWidth; x < plazaFoot.x1 + choices.pathWidth; x++) for (let z = plazaFoot.z0 - choices.pathWidth; z < plazaFoot.z1 + choices.pathWidth; z++) {
      if (x >= plazaFoot.x0 && x < plazaFoot.x1 && z >= plazaFoot.z0 && z < plazaFoot.z1) continue;
      if (inside(x, z) && !blocked[idx(x, z)]) pathSet.add(idx(x, z));
    }
    // Order: zones near the plaza first, so later paths join their trunk.
    const order = [...rects.keys()].filter(i => i !== plazaIndex).sort((a, b) => dist(centre(rects.get(a)!), centre(plazaFoot)) - dist(centre(rects.get(b)!), centre(plazaFoot)) || a - b);
    for (const i of order) {
      const z = zones[i]!, r = rects.get(i)!;
      // Start: in front of the main building's door, otherwise the zone edge facing the plaza.
      let start: [number, number] | null = null, startSide: Side | null = null;
      const main = z.members.find(m => !m.water && m.version);
      if (main && !z.reserved) {
        const e = entranceOf(main.version!.payload), f = memberFeet.get(main.key)!;
        if (e) {
          const t = at(main.version!, main.turns, f.x0, f.z0);
          const door = transformCellPosition(e.door, main.version!.payload.pivot, t);
          const side = turnedSide(e.sides[0]!, main.turns), [sx, sz] = SIDE_STEP[side];
          let x = door[0], zz = door[2];
          for (let k = 0; k < 64 && inside(x, zz) && blocked[idx(x, zz)]; k++) { x += sx; zz += sz; }
          if (inside(x, zz) && !blocked[idx(x, zz)]) { start = [x, zz]; startSide = side; }
        }
      }
      if (!start) {
        const p = centre(plazaFoot), c = centre(r), dx = p[0] - c[0], dz = p[1] - c[1];
        const side: Side = Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'west' : 'east') : (dz < 0 ? 'north' : 'south');
        const mid: [number, number] = side === 'north' ? [Math.floor((r.x0 + r.x1) / 2), r.z0 - 1] : side === 'south' ? [Math.floor((r.x0 + r.x1) / 2), r.z1]
          : side === 'west' ? [r.x0 - 1, Math.floor((r.z0 + r.z1) / 2)] : [r.x1, Math.floor((r.z0 + r.z1) / 2)];
        if (inside(...mid) && !blocked[idx(...mid)]) { start = mid; startSide = side; }
      }
      if (!start) { warnings.push(`${z.name}: kein Zugang für den Weg gefunden`); continue; }
      access.set(i, start);
      const route = astar(start, startSide!, { GW, GL, gx0, gz0, blocked, near, target, path: pathSet, plaza: centre(plazaFoot) });
      if (!route) { warnings.push(`${z.name}: kein Weg zum Platz gefunden`); continue; }
      routed.add(i);
      for (let k = 0; k < route.length; k++) {
        const [x, zz] = route[k]!, prev = route[k - 1] ?? route[k + 1] ?? route[k]!;
        paint(x, zz, prev[1] === zz ? 'x' : 'z');
      }
    }
    // Lanterns on fence posts beside the paths, at least LAMP_DISTANCE apart.
    if (choices.lights) {
      const cand: [number, number][] = [];
      for (const k of [...pathSet].sort((a, b) => a - b)) {
        const x = (k % GW) + gx0, z = Math.floor(k / GW) + gz0;
        for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
          const nx = x + dx, nz = z + dz;
          if (!inside(nx, nz)) continue;
          const n = idx(nx, nz);
          if (!blocked[n] && !pathSet.has(n) && !target[n]) cand.push([nx, nz]);
        }
      }
      for (const c of cand) if (lampList.every(l => Math.max(Math.abs(l[0] - c[0]), Math.abs(l[1] - c[1])) >= LAMP_DISTANCE)
        && allFeet.every(f => gapOf(f, { x0: c[0], z0: c[1], x1: c[0] + 1, z1: c[1] + 1 }) >= 1)) lampList.push(c);
    }
    // Back to coordinates.
    const cells = [...pathSet].map(k => [(k % GW) + gx0, Math.floor(k / GW) + gz0] as [number, number]);
    pathSet.clear();
    pathCells = cells;
  }

  // ---------------------------------------------------------------- final frame (rotate to the water side)
  const k = LAYOUT_TURNS[choices.water];
  const placements: AnlagePlacement[] = [];
  const zonePlans: BaseZonePlan[] = zones.map((z, i) => {
    const rect = rects.get(i) ?? null;
    const members: BaseMemberPlan[] = z.members.map(m => {
      const f = memberFeet.get(m.key);
      if (!f || !m.version || !z.enabled) return { key: m.key, role: m.role, assetId: m.assetId, version: m.version, turns: m.turns, water: m.water, footprint: null, turnSource: m.turnSource };
      const rf = rotRect(f, k), turns = ((m.turns + k) % 4) as Turns;
      const t = at(m.version, turns, rf.x0, rf.z0);
      placements.push({ key: m.key, districtId: z.key, kind: 'building', name: z.members.length > 1 ? `${z.name}: ${m.role}` : z.name, version: m.version, transform: t, footprint: rf, ...(m.water && { inWater: true }) });
      return { key: m.key, role: m.role, assetId: m.assetId, version: m.version, turns, water: m.water, footprint: rf, turnSource: m.turnSource };
    });
    const a = access.get(i);
    const pierFeet = z.members.filter(m => m.water).map(m => memberFeet.get(m.key)).filter((f): f is Footprint => !!f);
    const atWater = z.fn.id !== 'hafen' ? null : !water ? false : line !== null && pierFeet.length > 0 && pierFeet.every(f => f.z1 > line!);
    const payloads = z.enabled ? members.filter(m => m.version).map(m => m.version!.payload) : [];
    return {
      key: z.key, fn: z.fn, name: z.name, phase: z.fn.phase, enabled: z.enabled && (!!rect), reserved: z.reserved,
      rect: rect && z.enabled ? rotRect(rect, k) : null, members,
      access: a ? rotCell(a[0], a[1], k) : null, routed: routed.has(i) || i === plazaIndex, atWater,
      requirements: z.enabled ? checkRequirements(z.fn.id, { payloads, atWater, reserved: z.reserved }) : [], problems: z.problems,
    };
  });
  const paths = pathCells.map(([x, z]) => rotCell(x, z, k)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lamps = lampList.map(([x, z]) => rotCell(x, z, k)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const z of zonePlans) if (z.enabled && z.fn.id !== 'platz' && !z.routed) warnings.push(`${z.name}: nicht ans Wegenetz angeschlossen`);
  const extent = union([...placements.map(p => p.footprint), ...zonePlans.filter(z => z.rect).map(z => z.rect!),
    ...(paths.length ? [{ x0: Math.min(...paths.map(p => p[0])), z0: Math.min(...paths.map(p => p[1])), x1: Math.max(...paths.map(p => p[0])) + 1, z1: Math.max(...paths.map(p => p[1])) + 1 }] : [])]);
  const waterInfo = water && line !== null ? { side: choices.water as Exclude<WaterSide, 'keine'>, line: finalLine(line, k) } : null;
  return { choices, zones: zonePlans, placements, paths, lamps, water: waterInfo, plaza: rotRect(plazaFoot, k), extent, blockers: [...new Set(blockers)], warnings: [...new Set(warnings)] };
}
/** Water line in the final frame: for south/east the first water coordinate, for north/west the last land… expressed as the first water coordinate on that axis. */
function finalLine(line: number, k: Turns): number {
  // Canonical: water at z ≥ line. After k turns (x, z) → (−z−1, x) per turn.
  if (k === 0) return line;          // south: z ≥ line
  if (k === 1) return -line - 1;     // west: x ≤ −line−1
  if (k === 2) return -line - 1;     // north: z ≤ −line−1
  return line;                       // east: x ≥ line
}
/** True when a cell (final coordinates) is water according to the layout. */
export function isWaterCell(water: BaseLayout['water'], x: number, z: number): boolean {
  if (!water) return false;
  switch (water.side) {
    case 'sued': return z >= water.line;
    case 'nord': return z <= water.line;
    case 'west': return x <= water.line;
    case 'ost': return x >= water.line;
  }
}

interface Grid { GW: number; GL: number; gx0: number; gz0: number; blocked: Uint8Array; near: Uint8Array; target: Uint8Array; path: Set<number>; plaza: readonly [number, number] }
const DIRS: readonly (readonly [number, number])[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const DIR_OF: Readonly<Record<Side, number>> = { east: 0, south: 1, west: 2, north: 3 };

/** A* from a start cell to the plaza ring or any existing path cell. Prefers existing paths and straight lines, keeps a margin to buildings. */
function astar(start: readonly [number, number], side: Side, g: Grid): [number, number][] | null {
  const N = g.GW * g.GL;
  const sIdx = (start[0] - g.gx0) + (start[1] - g.gz0) * g.GW;
  if (g.target[sIdx] || g.path.has(sIdx)) return [[start[0], start[1]]];
  const cost = new Float64Array(N * 4).fill(Infinity), from = new Int32Array(N * 4).fill(-1);
  const heap: [number, number][] = [];
  const push = (f: number, s: number) => { heap.push([f, s]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p]![0] <= heap[i]![0]) break; [heap[p], heap[i]] = [heap[i]!, heap[p]!]; i = p; } };
  const pop = (): [number, number] => {
    const top = heap[0]!, last = heap.pop()!;
    if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l; if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i]!, heap[m]!]; i = m; } }
    return top;
  };
  const h = (i: number) => { const x = (i % g.GW) + g.gx0, z = Math.floor(i / g.GW) + g.gz0; return 0.3 * (Math.abs(x - g.plaza[0]) + Math.abs(z - g.plaza[1])); };
  const s0 = sIdx * 4 + DIR_OF[side];
  cost[s0] = 0; push(h(sIdx), s0);
  let found = -1, expanded = 0;
  while (heap.length && expanded < 400_000) {
    const [, s] = pop();
    const i = s >> 2, d = s & 3;
    if (g.target[i] || (g.path.has(i) && i !== sIdx)) { found = s; break; }
    expanded++;
    const x = i % g.GW, z = (i - x) / g.GW;
    for (let nd = 0; nd < 4; nd++) {
      if (nd === ((d + 2) & 3)) continue;
      const nx = x + DIRS[nd]![0], nz = z + DIRS[nd]![1];
      if (nx < 0 || nz < 0 || nx >= g.GW || nz >= g.GL) continue;
      const n = nx + nz * g.GW;
      if (g.blocked[n]) continue;
      const step = (g.path.has(n) ? 0.3 : 1) + (g.near[n] ? 2 : 0) + (nd !== d ? 1.5 : 0);
      const ns = n * 4 + nd, c = cost[s]! + step;
      if (c < cost[ns]!) { cost[ns] = c; from[ns] = s; push(c + h(n), ns); }
    }
  }
  if (found < 0) return null;
  const out: [number, number][] = [];
  for (let s = found; s >= 0; s = from[s]!) { const i = s >> 2; out.push([(i % g.GW) + g.gx0, Math.floor(i / g.GW) + g.gz0]); }
  return out.reverse();
}

// ---------------------------------------------------------------------------
// Path network as a part

const PATH_MIX: Readonly<Record<PathStyle, { readonly middle: readonly string[]; readonly edge: readonly string[] }>> = {
  dorf: { middle: ['dirt_path'], edge: ['gravel', 'coarse_dirt', 'dirt_path', 'cobblestone'] },
  kies: { middle: ['gravel', 'gravel', 'gravel', 'andesite'], edge: ['cobblestone', 'mossy_cobblestone', 'gravel', 'andesite'] },
  stein: { middle: ['stone_bricks', 'stone_bricks', 'cracked_stone_bricks', 'mossy_stone_bricks'], edge: ['polished_andesite', 'cobblestone', 'stone_bricks', 'andesite'] },
};
const mix = (list: readonly string[], x: number, z: number) => {
  let h = (x * 73856093) ^ (z * 19349663); h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16;
  return list[Math.abs(h) % list.length]!;
};

/**
 * Payload of the path network: path blocks on the ground layer (y = 0, like
 * the shipped path modules), lanterns on fence posts beside the paths.
 * Returns null without paths.
 */
export function pathNetworkPayload(layout: Pick<BaseLayout, 'paths' | 'lamps' | 'choices'>): { payload: VoxelPayload; origin: readonly [number, number] } | null {
  if (!layout.paths.length) return null;
  const cells = [...layout.paths, ...layout.lamps];
  const x0 = Math.min(...cells.map(c => c[0])), z0 = Math.min(...cells.map(c => c[1]));
  const x1 = Math.max(...cells.map(c => c[0])) + 1, z1 = Math.max(...cells.map(c => c[1])) + 1;
  const palette: { id: string; properties: Record<string, string> }[] = [];
  const pal = new Map<string, number>();
  const ix = (id: string, properties: Record<string, string> = {}) => {
    const key = `${id}${JSON.stringify(properties)}`;
    let n = pal.get(key); if (n === undefined) { n = palette.length; pal.set(key, n); palette.push({ id: `minecraft:${id}`, properties }); } return n;
  };
  const set = new Set(layout.paths.map(([x, z]) => `${x},${z}`));
  const style = PATH_MIX[layout.choices.pathStyle];
  const out: Cell[] = [];
  for (const [x, z] of layout.paths) {
    const edge = !set.has(`${x + 1},${z}`) || !set.has(`${x - 1},${z}`) || !set.has(`${x},${z + 1}`) || !set.has(`${x},${z - 1}`);
    out.push({ position: [x - x0, 0, z - z0], kind: 'block', paletteIndex: ix(mix(edge && layout.choices.pathWidth > 1 ? style.edge : style.middle, x, z)) });
  }
  for (const [x, z] of layout.lamps) {
    out.push({ position: [x - x0, 0, z - z0], kind: 'block', paletteIndex: ix('mossy_cobblestone') });
    out.push({ position: [x - x0, 1, z - z0], kind: 'block', paletteIndex: ix('spruce_fence', { east: 'false', north: 'false', south: 'false', waterlogged: 'false', west: 'false' }) });
    out.push({ position: [x - x0, 2, z - z0], kind: 'block', paletteIndex: ix('lantern', { hanging: 'false', waterlogged: 'false' }) });
  }
  const payload = createPayload({ schemaVersion: 1, profileId: SAMPLE_PROFILE, bounds: { min: [0, 0, 0], maxExclusive: [x1 - x0, layout.lamps.length ? 3 : 1, z1 - z0] },
    pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells: out, blockEntities: [] });
  return { payload, origin: [x0, z0] };
}

// ---------------------------------------------------------------------------
// Plan (AnlagePlan compatible, so preview, terrain fit and 3D export work as for Anlagen)

export interface BasePlan extends AnlagePlan {
  readonly layout: BaseLayout;
  /** Own part for the path network (stored on adoption, before the project). */
  readonly network: { readonly asset: Asset; readonly version: AssetVersion } | null;
}

/** Synthetic Anlage of a base: one district per zone (for spacing checks and names). */
function anlageOf(layout: BaseLayout): Anlage {
  return { id: `basis_${layout.choices.template.id}`, themeId: '', name: layout.choices.template.name, description: layout.choices.template.description, path: null, spacing: Math.min(12, layout.choices.spacing),
    districts: layout.zones.map(z => ({ id: z.key, name: z.name, purpose: z.fn.purpose, side: 'nord' as const, slots: [], gap: Math.min(z.fn.gap ?? 2, layout.choices.spacing) })) };
}

/** Builds the path network part (async: version hash) and returns a plan the Anlagen preview understands. */
export async function buildBasePlan(layout: BaseLayout, input: { name?: string } = {}): Promise<BasePlan> {
  const anlage = anlageOf(layout);
  const choices = normalizeChoices(anlage, { spacing: anlage.spacing, path: false, doors: false });
  const placements: AnlagePlacement[] = [...layout.placements];
  let network: BasePlan['network'] = null;
  const slots: SlotState[] = layout.zones.flatMap(z => z.members.map((m): SlotState => ({
    key: m.key, districtId: z.key, assetId: m.assetId, curatedAssetId: z.fn.members.find(x => m.role.startsWith(x.role))?.assetId ?? m.assetId, swapped: false, role: m.role, turns: m.turns,
    status: m.version ? 'ok' : 'missing-asset', version: m.version, pin: m.version?.label ?? SHIPPED_LABEL, turnSource: m.turnSource === 'door' ? 'door' : 'curated', entrance: null, facesPath: null })));
  const plan = {
    anlage, choices, slots, layout,
    districts: layout.zones.map(z => ({ id: z.key, name: z.name, side: 'nord' as const, enabled: z.enabled, footprint: z.rect, placements: z.members.filter(m => m.footprint).length })),
    lane: 0, extent: layout.extent, blockers: layout.blockers,
  };
  // Open water edges of the buildings (Spielprüfstand) get a rim in the network part.
  const rims = placements.length ? openWaterEdges(previewAnlage({ ...plan, placements }).resolution) : [];
  const net = partWithRims(pathNetworkPayload(layout), rims);
  if (net) {
    const paths = layout.paths.length > 0;
    const asset = createAsset({ name: `${paths ? 'Wegenetz' : 'Wasserkanten'}: ${input.name?.trim() || layout.choices.template.name}`.slice(0, 120), tags: ['wegenetz', 'basisplaner', 'infrastruktur'],
      description: `${paths ? `Wege (${PATH_STYLE_LABEL[layout.choices.pathStyle]}, ${layout.choices.pathWidth} Blöcke breit) und ${layout.lamps.length} Laternen, vom Basisplaner zwischen allen Zonen und dem Platz verlegt` : 'Keine Wege'}${rims.length ? `; ${rims.length} Randsteine an offenen Wasserkanten` : ''}.`,
      provenance: { author: 'LMNT — Build Studio', source: 'Basisplaner (eigener Entwurf)', license: 'frei für dieses Projekt' } });
    network = await addAssetVersion(asset, { payload: net.payload, label: '1.0', source: { format: 'base-plan' } });
    const t = { position: net.position, quarterTurns: 0 as Turns, mirrorX: false };
    placements.push({ key: 'wegenetz', districtId: null, kind: 'path', name: paths ? 'Wegenetz' : 'Wasserkanten', version: network.version, transform: t, area: true,
      footprint: { x0: net.position[0], z0: net.position[2], x1: net.position[0] + net.payload.bounds.maxExclusive[0], z1: net.position[2] + net.payload.bounds.maxExclusive[2] } });
  }
  return { ...plan, placements, network };
}

export function previewBase(plan: BasePlan, input: Parameters<typeof previewAnlage>[1] = {}): AnlagePreview {
  const versions = new Map(input.versions ?? []);
  if (plan.network) versions.set(plan.network.version.id, plan.network.version);
  return previewAnlage(plan, { ...input, versions });
}

// ---------------------------------------------------------------------------
// Adoption

/** Build sections by phase: path network and plaza first, then each phase's zones. */
function baseSections(plan: BasePlan, ids: ReadonlyMap<string, string>, byKey: ReadonlyMap<string, string>): { name: string; note: string; instanceIds: string[] }[] {
  const out: { name: string; note: string; instanceIds: string[] }[] = [];
  const of = (key: string) => { const id = byKey.get(key); return id ? ids.get(id) ?? id : null; };
  const net = of('wegenetz');
  const plazaKeys = plan.layout.zones.filter(z => z.enabled && z.fn.id === 'platz').flatMap(z => z.members.filter(m => m.footprint).map(m => m.key));
  const first = [net, ...plazaKeys.map(of)].filter((x): x is string => !!x);
  if (first.length) out.push({ name: 'Wege & Platz', note: 'Zuerst: Wegenetz und Platz geben allen Zonen die Lage vor.', instanceIds: first });
  for (const phase of [1, 2, 3, 4] as const) {
    const zones = plan.layout.zones.filter(z => z.enabled && z.phase === phase && z.fn.id !== 'platz');
    const instanceIds = zones.flatMap(z => z.members.filter(m => m.footprint).map(m => of(m.key))).filter((x): x is string => !!x);
    if (!instanceIds.length) continue;
    const open = zones.flatMap(z => z.requirements.filter(r => r.status === 'warn').map(r => `${z.name}: ${r.label} (${r.value})`));
    const reserved = zones.filter(z => z.reserved).map(z => `${z.name}: Bauplatz ${z.rect ? `${z.rect.x1 - z.rect.x0} × ${z.rect.z1 - z.rect.z0}` : ''} freihalten`);
    out.push({ name: `Phase ${phase}: ${BASE_PHASES[phase].name}`, note: [BASE_PHASES[phase].note, ...open, ...reserved].join(' · ').slice(0, 500), instanceIds });
  }
  return out;
}

function siteWith(site: SitePlan, sections: ReturnType<typeof baseSections>): SitePlan {
  let next = site;
  for (const sec of sections) {
    next = addSection(next, sec.name.slice(0, 80), sec.instanceIds.map(instanceId => ({ instanceId })));
    const added = next.sections.at(-1)!;
    next = { ...next, sections: next.sections.map(x => x === added ? { ...x, note: sec.note.slice(0, 500) } : x) };
  }
  return checkSite(next);
}

function fresh(preview: AnlagePreview): { instances: Instance[]; links: ConnectorLink[]; ids: Map<string, string> } {
  const ids = new Map(preview.draft.instances.map(i => [i.id, newId('inst')]));
  return { ids,
    instances: preview.draft.instances.map(i => ({ ...i, id: ids.get(i.id)!, transform: structuredClone(i.transform) })),
    links: preview.draft.links.map(l => ({ id: newId('link'), a: { ...l.a, instanceId: ids.get(l.a.instanceId)! }, b: { ...l.b, instanceId: ids.get(l.b.instanceId)! } })) };
}
const keyIndex = (plan: BasePlan, preview: AnlagePreview) => new Map(plan.placements.map((p, i) => [p.key, preview.draft.instances[i]!.id]));

function assertAdoptable(plan: BasePlan, preview: AnlagePreview, acceptConflicts: boolean): void {
  if (plan.blockers.length) fail(`nicht übernehmbar – ${plan.blockers.join('; ')}`);
  if (!preview.draft.instances.length) fail('keine Zone ausgewählt');
  if (preview.conflicts.length && !acceptConflicts) fail(`${preview.conflicts.length} Voxelkonflikt(e); Übernahme nur nach ausdrücklicher Bestätigung`);
}

/** New project from a base preview. The network asset/version (plan.network) must be stored first. */
export function createBaseProject(plan: BasePlan, preview: AnlagePreview, input: { name?: string; profileId?: string; acceptConflicts?: boolean } = {}): Project {
  assertAdoptable(plan, preview, input.acceptConflicts ?? false);
  const zones = plan.layout.zones.filter(z => z.enabled);
  let project = createProject({ name: (input.name?.trim() || plan.layout.choices.template.name).slice(0, 120), profileId: input.profileId ?? SAMPLE_PROFILE,
    description: `Mit dem Basisplaner angelegt: ${zones.map(z => z.name).join(', ')}. Wasserseite: ${WATER_SIDE_LABEL[plan.layout.choices.water]}, Wege ${plan.layout.choices.pathWidth} Blöcke breit.`.slice(0, 2000) });
  const f = fresh(preview);
  const operations: Operation[] = [
    ...f.instances.map(instance => ({ kind: 'instance.add' as const, instance })),
    ...f.links.map(link => ({ kind: 'link.add' as const, link })),
    { kind: 'site.set', site: siteWith(siteOf(project), baseSections(plan, f.ids, keyIndex(plan, preview))), label: 'Bauphasen der Basis' },
  ];
  project = applyOperation(project, { kind: 'batch', label: `Basis „${project.name}“ geplant`, operations }).project;
  return project;
}

/** One undoable operation adding the previewed base to an existing project (sections appended). */
export function baseIntoProject(plan: BasePlan, preview: AnlagePreview, base: Project, input: { acceptConflicts?: boolean } = {}): Operation {
  assertAdoptable(plan, preview, input.acceptConflicts ?? false);
  if (preview.baseFingerprint !== JSON.stringify([base.instances, base.links, base.site ?? null]) || preview.project.id !== base.id)
    fail('Das Projekt wurde seit der Vorschau geändert; bitte Vorschau neu berechnen');
  const f = fresh(preview);
  return { kind: 'batch', label: `Basis „${plan.layout.choices.template.name}“ eingefügt`, operations: [
    ...f.instances.map(instance => ({ kind: 'instance.add' as const, instance })),
    ...f.links.map(link => ({ kind: 'link.add' as const, link })),
    { kind: 'site.set', site: siteWith(siteOf(base), baseSections(plan, f.ids, keyIndex(plan, preview))), label: 'Bauphasen der Basis' },
  ] };
}

/** Candidates for the main building of a zone: the function's alternatives that exist in the library. */
export function mainCandidates(fn: BaseFunction, assets: readonly Pick<Asset, 'id' | 'name' | 'archived'>[]): { assetId: string; name: string }[] {
  const byId = new Map(assets.map(a => [a.id, a]));
  const ids = [...new Set([fn.members[0]?.assetId, ...fn.alternatives].filter((x): x is string => !!x))];
  return ids.map(id => byId.get(id)).filter((a): a is NonNullable<typeof a> => !!a && !a.archived).map(a => ({ assetId: a.id, name: a.name }));
}

