import type { BlockState, VoxelPayload } from '../../../voxel/src/types.js';
import { completeState } from '../../../voxel/src/blocklogic/facts.js';
import { transformBlockState, transformVector } from '../../../voxel/src/states.js';
import { payloadCells, keyPos } from '../editor/draft.js';
import { SURVEY_UNKNOWN } from './terrainSurvey.js';
import type { TerrainSurvey } from './terrainSurvey.js';
import { NO_WATER, SURFACE_STYLES, columnHash, designMatchesBase, designedSurvey, heightLimits, slopeAt } from './terrainDesign.js';
import type { DesignCell, TerrainDesign } from './terrainDesign.js';
import { EMPTY_SCATTER, MAX_SCATTER_ITEMS, MAX_SCATTER_LAYERS, checkScatterLayer, cloneScatter } from './terrainScatterPlan.js';
import type { ScatterItem, ScatterLayer, ScatterPartRef, ScatterPlan } from './terrainScatterPlan.js';
import { DomainError } from '../core/types.js';

/**
 * Streu-Ebene (TERRAIN-02-S06): Natur-Bauteile – trees, bushes, rocks,
 * flowers, grass, reeds or the user's own Schablonen from the Werkstatt – are
 * spread over a Geländegestaltung by surface style (like a biome), slope,
 * height, distance to water and density. Like WorldPainter's object layers,
 * but deterministic: the same layer, seed and terrain always give the same
 * items (hash per grid cell, no Math.random). Items are stored in the design
 * (anchor column, turn, variant), can be added and removed by hand and follow
 * the planned ground: their Y is taken from the terrain whenever blocks are
 * made, and items that no longer fit (water, path, building, cliff) are left
 * out and counted.
 *
 * The cells go into the same Bauteil as the terrain (designPayload `extra`),
 * so material, building steps, Schem/Litematic export and the mod see them.
 */

export type ScatterNeed = 'tree' | 'plant' | 'sand' | 'dry' | 'reed' | 'mushroom' | 'any';
export const SCATTER_NEED_LABEL: Readonly<Record<ScatterNeed, string>> = {
  tree: 'Erde, Gras, Moos oder Schnee', plant: 'Gras, Erde oder Moos', sand: 'Sand', dry: 'Sand, Erde oder Terrakotta', reed: 'Erde oder Sand direkt am Wasser', mushroom: 'Podsol oder Myzel', any: 'jeder Boden',
};
export type ScatterGroup = 'baum' | 'busch' | 'fels' | 'pflanze';
export const SCATTER_GROUP_LABEL: Readonly<Record<ScatterGroup, string>> = { baum: 'Bäume', busch: 'Büsche', fels: 'Felsen und Steine', pflanze: 'Pflanzen' };

/** One block of a part, relative to the anchor: dy 0 is the first block above the ground. */
export interface PartCell { readonly dx: number; readonly dy: number; readonly dz: number; readonly state: BlockState; /** May replace ground (rocks sit in the ground). */ readonly embed?: boolean }

export interface ScatterPart {
  readonly ref: ScatterPartRef;
  readonly label: string;
  readonly group: ScatterGroup;
  readonly needs: ScatterNeed;
  readonly variants: number;
  readonly hint: string;
  cells(variant: number): readonly PartCell[];
}

const fail = (message: string): never => { throw new DomainError('TERRAIN_DESIGN', `Streu-Ebene: ${message}`); };
const ns = (id: string) => id.includes(':') ? id : `minecraft:${id}`;
const st = (id: string, props: Record<string, string> = {}): BlockState => completeState({ id: ns(id), properties: props }) ?? { id: ns(id), properties: props };

// ------------------------------------------------------------------ built-in parts

const leaves = (wood: string) => st(`${wood}_leaves`, { persistent: 'true', distance: '1' });
const log = (wood: string) => st(`${wood}_log`, { axis: 'y' });
/** Small hash of a cell inside a part (corner rounding, block mix) – fixed per variant. */
const cellHash = (x: number, y: number, z: number, v: number) => columnHash(x * 31 + y, z * 17 - y, 4049 + v);

function roundTree(wood: string, trunk: number, v: number, wide: boolean): PartCell[] {
  const out: PartCell[] = [], seen = new Set<string>();
  const put = (dx: number, dy: number, dz: number, s: BlockState) => { const k = `${dx},${dy},${dz}`; if (!seen.has(k)) { seen.add(k); out.push({ dx, dy, dz, state: s }); } };
  for (let y = 0; y < trunk; y++) put(0, y, 0, log(wood));
  const lf = leaves(wood);
  for (let y = trunk - 2; y <= trunk + 1; y++) {
    const r = y >= trunk ? 1 : wide ? 2 : 1;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dz === 0 && y < trunk) continue;
      const corner = Math.abs(dx) === r && Math.abs(dz) === r;
      if (corner && (y === trunk + 1 || cellHash(dx, y, dz, v) < 0.6)) continue;
      put(dx, y, dz, lf);
    }
  }
  return out;
}
function spruce(trunk: number, v: number): PartCell[] {
  const out: PartCell[] = [], lf = leaves('spruce');
  for (let y = 0; y < trunk; y++) out.push({ dx: 0, dy: y, dz: 0, state: log('spruce') });
  // Rings from the top down: 0,1,1,2,1,2,… – a cone with ruffled edges.
  for (let k = 0, y = trunk; y >= 2; k++, y--) {
    const r = k === 0 ? 0 : k < 3 ? 1 : (k % 2 === 1 ? 2 : 1) + (k >= 6 && v > 0 && k % 2 === 1 ? 1 : 0);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dz === 0 && y < trunk) continue;
      if (r >= 2 && Math.abs(dx) === r && Math.abs(dz) === r) continue;
      if (r >= 2 && Math.abs(dx) + Math.abs(dz) > r + 1 && cellHash(dx, y, dz, v) < 0.5) continue;
      out.push({ dx, dy: y, dz, state: lf });
    }
  }
  out.push({ dx: 0, dy: trunk + 1, dz: 0, state: lf });
  return out;
}
function bush(v: number): PartCell[] {
  const lf = leaves('oak'), out: PartCell[] = [{ dx: 0, dy: 0, dz: 0, state: log('oak') }];
  const r = v === 0 ? 0 : 1;
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (dx || dz) { if (Math.abs(dx) + Math.abs(dz) === 2 && cellHash(dx, 0, dz, v) < 0.5) continue; out.push({ dx, dy: 0, dz, state: lf }); }
  }
  out.push({ dx: 0, dy: 1, dz: 0, state: lf });
  if (v === 2) { out.push({ dx: 1, dy: 1, dz: 0, state: lf }); out.push({ dx: 0, dy: 1, dz: 1, state: lf }); }
  return out;
}
const ROCK_MIX = ['stone', 'andesite', 'cobblestone', 'mossy_cobblestone', 'stone', 'tuff'];
function boulder(v: number): PartCell[] {
  // Ellipsoid sitting one block deep in the ground; size grows with the variant.
  const rx = 1 + (v >> 1) * 0.6 + 0.4, ry = 0.9 + (v >> 1) * 0.5, rz = 1 + (v & 1) * 0.6 + 0.3;
  const out: PartCell[] = [];
  const R = Math.ceil(Math.max(rx, rz));
  for (let dy = -1; dy <= Math.ceil(ry); dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const e = (dx / rx) ** 2 + ((dy + 0.3) / (ry + 0.6)) ** 2 + (dz / rz) ** 2;
    if (e > 1 + (cellHash(dx, dy, dz, v) - 0.5) * 0.35) continue;
    const h = cellHash(dz, dx, dy, v + 9);
    out.push({ dx, dy, dz, state: st(ROCK_MIX[Math.floor(h * ROCK_MIX.length)]!), embed: dy <= 0 });
  }
  return out;
}
function pebbles(v: number): PartCell[] {
  const a = st(v % 2 ? 'mossy_cobblestone' : 'cobblestone'), b = st('andesite');
  if (v === 0) return [{ dx: 0, dy: 0, dz: 0, state: a }];
  if (v === 1) return [{ dx: 0, dy: 0, dz: 0, state: a }, { dx: 1, dy: 0, dz: 0, state: b }];
  return [{ dx: 0, dy: 0, dz: 0, state: a }, { dx: 1, dy: 0, dz: 0, state: b }, { dx: 0, dy: 1, dz: 0, state: st('cobblestone') }];
}
const FLOWERS = ['dandelion', 'poppy', 'cornflower', 'oxeye_daisy', 'azure_bluet', 'allium', 'red_tulip', 'orange_tulip', 'lily_of_the_valley'];
const doublePlant = (id: string): PartCell[] => [{ dx: 0, dy: 0, dz: 0, state: st(id, { half: 'lower' }) }, { dx: 0, dy: 1, dz: 0, state: st(id, { half: 'upper' }) }];
const column = (id: string, n: number): PartCell[] => Array.from({ length: n }, (_, y) => ({ dx: 0, dy: y, dz: 0, state: st(id, { age: '0' }) }));

const builtin = (id: string, label: string, group: ScatterGroup, needs: ScatterNeed, variants: number, hint: string, cells: (v: number) => PartCell[]): ScatterPart =>
  ({ ref: { kind: 'builtin', id }, label, group, needs, variants, hint, cells });

/** Built-in Natur-Bauteile. Leaves are persistent (they do not decay when the trunk is cut). */
export const BUILTIN_SCATTER_PARTS: readonly ScatterPart[] = [
  builtin('eiche', 'Eiche', 'baum', 'tree', 3, 'Stamm 4–6, runde Krone 5 × 5', v => roundTree('oak', 4 + v, v, true)),
  builtin('birke', 'Birke', 'baum', 'tree', 3, 'Stamm 5–7, schmale Krone', v => roundTree('birch', 5 + v, v, v !== 0)),
  builtin('fichte', 'Fichte', 'baum', 'tree', 4, 'Kegel, 8–11 hoch', v => spruce(6 + v, v)),
  builtin('kirsche', 'Kirschbaum', 'baum', 'tree', 2, 'Stamm 4–5, runde rosa Krone', v => roundTree('cherry', 4 + v, v + 3, true)),
  builtin('busch', 'Busch', 'busch', 'tree', 3, 'Laub um einen Stammblock, 1–3 breit', bush),
  builtin('fels', 'Felsbrocken', 'fels', 'any', 6, 'Stein, Andesit, Bruchstein, im Boden verankert', boulder),
  builtin('steine', 'Steine', 'fels', 'any', 3, '1–3 Bruchsteine', pebbles),
  builtin('blumen', 'Blumen', 'pflanze', 'plant', FLOWERS.length, 'eine Blume je Stelle, Sorte gemischt', v => [{ dx: 0, dy: 0, dz: 0, state: st(FLOWERS[v % FLOWERS.length]!) }]),
  builtin('gras', 'Gras', 'pflanze', 'plant', 4, 'kurzes und hohes Gras', v => v === 3 ? doublePlant('tall_grass') : [{ dx: 0, dy: 0, dz: 0, state: st('short_grass') }]),
  builtin('farn', 'Farn', 'pflanze', 'plant', 3, 'Farn und großer Farn', v => v === 2 ? doublePlant('large_fern') : [{ dx: 0, dy: 0, dz: 0, state: st('fern') }]),
  builtin('pilze', 'Pilze', 'pflanze', 'mushroom', 2, 'brauner und roter Pilz', v => [{ dx: 0, dy: 0, dz: 0, state: st(v ? 'red_mushroom' : 'brown_mushroom') }]),
  builtin('kaktus', 'Kaktus', 'pflanze', 'sand', 3, '1–3 hoch, braucht freie Seiten', v => column('cactus', 1 + v)),
  builtin('toter-busch', 'Toter Busch', 'pflanze', 'dry', 1, 'für Wüste und Steppe', () => [{ dx: 0, dy: 0, dz: 0, state: st('dead_bush') }]),
  builtin('schilf', 'Zuckerrohr', 'pflanze', 'reed', 3, '1–3 hoch, nur direkt am Wasser', v => column('sugar_cane', 1 + v)),
];
export const builtinScatterPart = (id: string): ScatterPart | undefined => BUILTIN_SCATTER_PARTS.find(p => p.ref.kind === 'builtin' && p.ref.id === id);

/**
 * A Schablone or any Bauteil as a scatter part: the bottom layer stands on the
 * ground, the anchor is the middle of its footprint. Air cells are not placed.
 */
export function stencilScatterPart(ref: Extract<ScatterPartRef, { kind: 'stencil' }>, payload: VoxelPayload): ScatterPart {
  const { min, maxExclusive } = payload.bounds;
  const cx = min[0] + Math.floor((maxExclusive[0] - min[0]) / 2), cz = min[2] + Math.floor((maxExclusive[2] - min[2]) / 2);
  const cells: PartCell[] = [];
  for (const [k, value] of payloadCells(payload)) {
    if (value.kind !== 'block') continue;
    const p = keyPos(k);
    cells.push({ dx: p[0] - cx, dy: p[1] - min[1], dz: p[2] - cz, state: value.state });
  }
  if (!cells.length) fail(`„${ref.label}“ enthält keine Blöcke`);
  if (cells.length > 4096) fail(`„${ref.label}“ ist mit ${cells.length} Blöcken zu groß zum Streuen (höchstens 4 096)`);
  return { ref, label: ref.label, group: 'baum', needs: 'any', variants: 1, hint: 'eigene Schablone', cells: () => cells };
}

export type ScatterPartResolver = (ref: ScatterPartRef) => ScatterPart | undefined;
export const builtinResolver: ScatterPartResolver = ref => ref.kind === 'builtin' ? builtinScatterPart(ref.id) : undefined;

// ------------------------------------------------------------------ layers and presets

export type ScatterLayerInput = Partial<Omit<ScatterLayer, 'id' | 'part'>> & { readonly part: ScatterPartRef };

/** A new layer with sensible defaults for its part. */
export function newScatterLayer(plan: ScatterPlan, input: ScatterLayerInput, resolve: ScatterPartResolver = builtinResolver): ScatterLayer {
  if (plan.layers.length >= MAX_SCATTER_LAYERS) fail(`höchstens ${MAX_SCATTER_LAYERS} Ebenen`);
  const part = resolve(input.part);
  let n = plan.layers.length + 1;
  while (plan.layers.some(l => l.id === `e${n}`)) n++;
  const big = part?.group === 'baum' || part?.group === 'fels';
  return checkScatterLayer({
    label: part?.label ?? (input.part.kind === 'stencil' ? input.part.label : input.part.id), enabled: true,
    density: big ? 8 : 40, spacing: big ? 5 : 1, styles: [], minSlope: null, maxSlope: part?.group === 'fels' ? null : 2, minY: null, maxY: null,
    shore: part?.needs === 'reed' ? 1 : null, buildingGap: big ? 3 : 1, seed: (n * 7919) % 100_000,
    ...input, id: `e${n}`,
  });
}

export interface ScatterPreset { readonly id: string; readonly label: string; readonly hint: string; readonly layers: readonly ScatterLayerInput[] }
const B = (id: string): ScatterPartRef => ({ kind: 'builtin', id });
/** Ready mixes like biomes; each adds its layers to the plan. */
export const SCATTER_PRESETS: readonly ScatterPreset[] = [
  { id: 'mischwald', label: 'Mischwald', hint: 'Eichen, Birken, Büsche und Farn auf Waldboden, Wiese und Moos', layers: [
    { part: B('eiche'), density: 14, spacing: 5, styles: ['wald', 'wiese', 'moos'], maxSlope: 2 },
    { part: B('birke'), density: 6, spacing: 5, styles: ['wald', 'wiese', 'moos'], maxSlope: 2 },
    { part: B('busch'), density: 10, spacing: 3, styles: ['wald', 'wiese', 'moos'], maxSlope: 2 },
    { part: B('farn'), density: 40, spacing: 1, styles: ['wald', 'moos'], maxSlope: 2 }] },
  { id: 'nadelwald', label: 'Nadelwald', hint: 'Fichten, Farn und Steine, auch auf Schnee', layers: [
    { part: B('fichte'), density: 18, spacing: 4, styles: ['wald', 'moos', 'wiese', 'schnee'], maxSlope: 3 },
    { part: B('farn'), density: 30, spacing: 1, styles: ['wald', 'moos'], maxSlope: 2 },
    { part: B('steine'), density: 4, spacing: 3, styles: ['wald', 'geroell'] }] },
  { id: 'wiese', label: 'Blumenwiese', hint: 'Gras und Blumen, vereinzelt eine Eiche', layers: [
    { part: B('gras'), density: 160, spacing: 1, styles: ['wiese'], maxSlope: 2 },
    { part: B('blumen'), density: 50, spacing: 1, styles: ['wiese'], maxSlope: 2 },
    { part: B('eiche'), density: 1.5, spacing: 12, styles: ['wiese'], maxSlope: 1 }] },
  { id: 'felsen', label: 'Felsen und Geröll', hint: 'Felsbrocken und Steine auf Fels, Geröll und an Hängen', layers: [
    { part: B('fels'), density: 6, spacing: 6, styles: ['fels', 'geroell'], maxSlope: null },
    { part: B('steine'), density: 12, spacing: 3, styles: ['fels', 'geroell', 'wiese'], minSlope: 1, maxSlope: null }] },
  { id: 'wueste', label: 'Wüste', hint: 'Kakteen und tote Büsche auf Sand', layers: [
    { part: B('kaktus'), density: 6, spacing: 4, styles: ['wueste', 'strand'], maxSlope: 1 },
    { part: B('toter-busch'), density: 8, spacing: 3, styles: ['wueste'], maxSlope: 2 }] },
  { id: 'ufer', label: 'Ufer', hint: 'Zuckerrohr direkt am Wasser, Gras dahinter', layers: [
    { part: B('schilf'), density: 250, spacing: 1, shore: 1 },
    { part: B('gras'), density: 120, spacing: 1, shore: 3, maxSlope: 2 }] },
  { id: 'kirschhain', label: 'Kirschhain', hint: 'Kirschbäume und Blumen auf Wiese', layers: [
    { part: B('kirsche'), density: 8, spacing: 6, styles: ['wiese', 'moos'], maxSlope: 2 },
    { part: B('blumen'), density: 40, spacing: 1, styles: ['wiese'], maxSlope: 2 }] },
  { id: 'pilze', label: 'Pilze im Wald', hint: 'Pilze auf dem Podsol im Waldboden (bei Tageslicht halten sie nur auf Podsol und Myzel)', layers: [
    { part: B('pilze'), density: 15, spacing: 2, styles: ['wald'], maxSlope: 2 }] },
];

/** Adds a preset's layers to the plan (returns the new plan and the new layer ids). */
export function addScatterPreset(plan: ScatterPlan, presetId: string): { plan: ScatterPlan; layers: string[] } {
  const preset = SCATTER_PRESETS.find(p => p.id === presetId) ?? fail(`unbekannte Mischung ${presetId}`);
  let next = plan;
  const ids: string[] = [];
  for (const input of preset.layers) {
    const layer = newScatterLayer(next, input);
    next = { ...next, layers: [...next.layers, layer] };
    ids.push(layer.id);
  }
  return { plan: next, layers: ids };
}

// ------------------------------------------------------------------ fitting

const SOIL = new Set(['grass_block', 'dirt', 'coarse_dirt', 'podzol', 'rooted_dirt', 'mycelium', 'moss_block', 'mud', 'muddy_mangrove_roots', 'pale_moss_block'].map(ns));
const TREE_SOIL = new Set([...SOIL, 'minecraft:snow_block']);
const SAND = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:suspicious_sand']);
const DRY = new Set([...SAND, 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:terracotta', 'minecraft:mud', 'minecraft:packed_mud']);
const REED_SOIL = new Set([...SOIL, ...SAND]);
// Spielprüfstand: a mushroom in daylight only holds on the blocks of #mushroom_grow_block.
const MUSHROOM_SOIL = new Set(['minecraft:podzol', 'minecraft:mycelium', 'minecraft:crimson_nylium', 'minecraft:warped_nylium']);
const SOLID_EXCLUDED = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:ice']);

export function groundFits(needs: ScatterNeed, top: string): boolean {
  switch (needs) {
    case 'tree': return TREE_SOIL.has(top);
    case 'plant': return SOIL.has(top);
    case 'sand': return SAND.has(top);
    case 'dry': return DRY.has(top) || top.endsWith('_terracotta');
    case 'reed': return REED_SOIL.has(top);
    case 'mushroom': return MUSHROOM_SOIL.has(top);
    case 'any': return !SOLID_EXCLUDED.has(top);
  }
}

/** Why an item does not fit (for the note in the UI). */
export type ScatterMiss = 'outside' | 'unknown' | 'water' | 'path' | 'building' | 'ground' | 'slope' | 'height' | 'style' | 'shore' | 'blocked' | 'overlap' | 'part';
export const SCATTER_MISS_LABEL: Readonly<Record<ScatterMiss, string>> = {
  outside: 'außerhalb der Gestaltung', unknown: 'unbekanntes Gelände', water: 'im Wasser', path: 'auf dem Weg', building: 'zu nah an einem Bau', ground: 'falscher Boden',
  slope: 'Hang passt nicht', height: 'Höhe passt nicht', style: 'anderer Oberflächenstil', shore: 'nicht am Wasser', blocked: 'Gelände oder Bestand im Weg', overlap: 'überschneidet ein anderes Teil', part: 'Bauteil fehlt',
};

export interface ScatterContext {
  readonly base: TerrainSurvey;
  readonly resolve?: ScatterPartResolver;
  /** World columns of planned buildings (kept free with each layer's gap). */
  readonly buildingColumns?: readonly (readonly [number, number])[];
  /** Planned building cells (world): a part never overlaps one. */
  readonly occupied?: (x: number, y: number, z: number) => boolean;
}

interface Prepared {
  readonly d: TerrainDesign;
  readonly base: TerrainSurvey;
  readonly resolve: ScatterPartResolver;
  readonly occupied?: (x: number, y: number, z: number) => boolean;
  /** Chebyshev distance to the nearest building column (capped at 17). */
  readonly buildingDist: Uint8Array;
  /** Highest Y a part must stay above (planned ground, water, kept vegetation of the base). */
  readonly keepTop: Int16Array;
  readonly topIds: readonly string[];
  readonly styleOfTop: ReadonlyMap<string, ReadonlySet<string>>;
  readonly limits: [number, number];
  /** Distance to the nearest water column (capped at 17). */
  waterDist: Uint8Array | null;
  /** Cells of parts per (part key, variant, rot). */
  readonly shapes: Map<string, readonly PartCell[]>;
}

function prepare(d: TerrainDesign, ctx: ScatterContext): Prepared {
  if (!designMatchesBase(d, ctx.base)) fail('Gestaltung und Grundlage haben verschiedene Bereiche');
  const n = d.width * d.length, base = ctx.base;
  const buildingDist = new Uint8Array(n).fill(17);
  let frontier: number[] = [];
  for (const [x, z] of ctx.buildingColumns ?? []) {
    const gx = x - d.minX, gz = z - d.minZ;
    if (gx < 0 || gz < 0 || gx >= d.width || gz >= d.length) continue;
    const i = gx + gz * d.width;
    if (buildingDist[i] !== 0) { buildingDist[i] = 0; frontier.push(i); }
  }
  for (let step = 1; step <= 16 && frontier.length; step++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % d.width, z = (i - x) / d.width;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
        const j = nx + nz * d.width;
        if (buildingDist[j]! <= step) continue;
        buildingDist[j] = step; next.push(j);
      }
    }
    frontier = next;
  }
  // What stays above the planned ground: water, and on columns the design leaves alone the measured
  // surface (existing trees). Changed columns are cleared up to the old surface by designPayload.
  const keepTop = new Int16Array(n).fill(SURVEY_UNKNOWN);
  for (let i = 0; i < n; i++) {
    const h = d.height[i]!;
    if (h === SURVEY_UNKNOWN) continue;
    let top = d.water[i] !== NO_WATER ? Math.max(h, d.water[i]!) : h;
    if (base.surface[i] !== SURVEY_UNKNOWN && base.groundBlock[i]) {
      const g = base.ground[i]!, sTop = base.ids[base.surfaceBlock[i]!] ?? '';
      const baseWater = sTop === 'minecraft:water' && base.surface[i]! > g ? base.surface[i]! : NO_WATER;
      const heightChanged = h !== g, waterChanged = d.water[i] !== baseWater;
      if (!heightChanged && !waterChanged) top = Math.max(top, base.surface[i]!);
    }
    keepTop[i] = top;
  }
  const styleOfTop = new Map<string, Set<string>>();
  for (const s of SURFACE_STYLES) for (const [id] of s.top) { let set = styleOfTop.get(id); if (!set) styleOfTop.set(id, set = new Set()); set.add(s.id); }
  return { d, base, resolve: ctx.resolve ?? builtinResolver, ...(ctx.occupied && { occupied: ctx.occupied }), buildingDist, keepTop, topIds: d.ids, styleOfTop,
    limits: heightLimits(d.dimension), waterDist: null, shapes: new Map() };
}

function waterDistance(p: Prepared): Uint8Array {
  if (p.waterDist) return p.waterDist;
  const d = p.d, n = d.width * d.length, dist = new Uint8Array(n).fill(17);
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) if (d.water[i] !== NO_WATER && d.height[i] !== SURVEY_UNKNOWN) { dist[i] = 0; frontier.push(i); }
  for (let step = 1; step <= 16 && frontier.length; step++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % d.width, z = (i - x) / d.width;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
        const j = nx + nz * d.width;
        if (dist[j]! <= step) continue;
        dist[j] = step; next.push(j);
      }
    }
    frontier = next;
  }
  return p.waterDist = dist;
}

const partKey = (ref: ScatterPartRef) => ref.kind === 'builtin' ? `b:${ref.id}` : `s:${ref.versionId}`;
const TURNS = [0, 1, 2, 3].map(q => ({ position: [0, 0, 0] as [number, number, number], quarterTurns: q as 0 | 1 | 2 | 3, mirrorX: false }));

function shapeOf(p: Prepared, part: ScatterPart, variant: number, rot: 0 | 1 | 2 | 3): readonly PartCell[] {
  const v = part.variants > 0 ? variant % part.variants : 0;
  const key = `${partKey(part.ref)}|${v}|${rot}`;
  let cells = p.shapes.get(key);
  if (!cells) {
    const t = TURNS[rot]!;
    cells = part.cells(v).map(c => {
      const [dx, , dz] = transformVector([c.dx, 0, c.dz], t);
      const r = transformBlockState(c.state, t);
      return { ...c, dx, dz, state: r.state };
    });
    p.shapes.set(key, cells);
  }
  return cells;
}

/** Sugar cane needs water right next to the block it stands on. */
function waterBeside(d: TerrainDesign, gx: number, gz: number, h: number): boolean {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = gx + dx, nz = gz + dz;
    if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
    const j = nx + nz * d.width;
    if (d.water[j] !== NO_WATER && d.water[j]! >= h && d.height[j]! < h) return true;
  }
  return false;
}

/** Checks the rules of a layer at an anchor column (style, slope, height, shore); manual items skip these. */
function layerRulesMiss(p: Prepared, layer: ScatterLayer, gx: number, gz: number): ScatterMiss | null {
  const d = p.d, i = gx + gz * d.width, h = d.height[i]!;
  if (layer.styles.length) {
    const styles = p.styleOfTop.get(p.topIds[d.top[i]!]!);
    if (!styles || !layer.styles.some(s => styles.has(s))) return 'style';
  }
  if (layer.minY !== null && h < layer.minY) return 'height';
  if (layer.maxY !== null && h > layer.maxY) return 'height';
  if (layer.minSlope !== null || layer.maxSlope !== null) {
    const s = slopeAt(d, gx, gz);
    if (layer.minSlope !== null && s < layer.minSlope) return 'slope';
    if (layer.maxSlope !== null && s > layer.maxSlope) return 'slope';
  }
  if (layer.shore !== null && waterDistance(p)[i]! > layer.shore) return 'shore';
  return null;
}

/**
 * Whether a part fits at an anchor; returns its world cells or the reason.
 * `taken` holds cells of items placed before (no overlap).
 */
function fit(p: Prepared, layer: ScatterLayer, item: Pick<ScatterItem, 'x' | 'z' | 'rot' | 'variant'>, taken: ReadonlySet<string>, rules: boolean): DesignCell[] | ScatterMiss {
  const d = p.d, gx = item.x - d.minX, gz = item.z - d.minZ;
  if (gx < 0 || gz < 0 || gx >= d.width || gz >= d.length) return 'outside';
  const i = gx + gz * d.width, h = d.height[i]!;
  if (h === SURVEY_UNKNOWN) return 'unknown';
  if (d.water[i] !== NO_WATER) return 'water';
  if (d.path[i]) return 'path';
  if (p.buildingDist[i]! <= layer.buildingGap) return 'building';
  const part = p.resolve(layer.part);
  if (!part) return 'part';
  if (!groundFits(part.needs, p.topIds[d.top[i]!]!)) return 'ground';
  if (part.needs === 'reed' && !waterBeside(d, gx, gz, h)) return 'shore';
  if (rules) { const miss = layerRulesMiss(p, layer, gx, gz); if (miss) return miss; }
  const y0 = h + 1, out: DesignCell[] = [];
  for (const c of shapeOf(p, part, item.variant, item.rot)) {
    const x = item.x + c.dx, z = item.z + c.dz, y = y0 + c.dy;
    const cx = gx + c.dx, cz = gz + c.dz;
    if (cx < 0 || cz < 0 || cx >= d.width || cz >= d.length) return 'outside';
    const j = cx + cz * d.width, hj = d.height[j]!;
    if (hj === SURVEY_UNKNOWN) return 'unknown';
    if (y < p.limits[0] || y > p.limits[1]) return 'height';
    const inGround = y <= hj;
    if (inGround ? !c.embed : y <= p.keepTop[j]!) return 'blocked';
    if (p.buildingDist[j] === 0 || p.occupied?.(x, y, z)) return 'building';
    if (taken.has(`${x},${y},${z}`)) return 'overlap';
    out.push({ x, y, z, id: c.state.id, state: c.state });
  }
  // Cactus: nothing solid beside any of its blocks.
  if (part.needs === 'sand') for (const c of out) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (taken.has(`${c.x + dx},${c.y},${c.z + dz}`)) return 'overlap';
    const nx = c.x + dx - d.minX, nz = c.z + dz - d.minZ;
    if (nx >= 0 && nz >= 0 && nx < d.width && nz < d.length && d.height[nx + nz * d.width]! >= c.y) return 'blocked';
  }
  return out;
}

// ------------------------------------------------------------------ scatter

export interface ScatterRun {
  readonly plan: ScatterPlan;
  /** Items placed by this run per layer. */
  readonly placed: ReadonlyMap<string, number>;
  /** Candidates thinned out, by reason. */
  readonly missed: ReadonlyMap<ScatterMiss, number>;
}

/**
 * Scatters the given layers anew (all enabled layers when `layerIds` is
 * omitted): their generated items are replaced, manual items and other layers
 * stay. Candidates come from a jittered grid with cell size = spacing, so the
 * items keep their distance; each grid cell holds one with probability
 * density·spacing²/1000. Deterministic for the same terrain, layer and seed.
 */
export function scatterLayers(d: TerrainDesign, ctx: ScatterContext, layerIds?: readonly string[]): ScatterRun {
  const plan = d.scatter ?? EMPTY_SCATTER;
  const target = new Set(layerIds ?? plan.layers.filter(l => l.enabled).map(l => l.id));
  const p = prepare(d, ctx);
  const kept = plan.items.filter(it => !target.has(it.layer) || it.manual);
  const taken = new Set<string>();
  // Items that stay claim their cells first (in stored order).
  const layerById = new Map(plan.layers.map(l => [l.id, l] as const));
  for (const it of kept) {
    const layer = layerById.get(it.layer);
    if (!layer) continue;
    const cells = fit(p, layer, it, taken, false);
    if (Array.isArray(cells)) for (const c of cells) taken.add(`${c.x},${c.y},${c.z}`);
  }
  const items: ScatterItem[] = [...kept], placed = new Map<string, number>(), missed = new Map<ScatterMiss, number>();
  for (const layer of plan.layers) {
    if (!target.has(layer.id) || !layer.enabled || layer.density <= 0) continue;
    const part = p.resolve(layer.part);
    if (!part) { missed.set('part', (missed.get('part') ?? 0) + 1); continue; }
    const g = layer.spacing, chance = Math.min(1, layer.density / 1000 * g * g);
    const anchors = new Map<string, [number, number][]>();
    const near = (x: number, z: number) => {
      const kx = Math.floor(x / g), kz = Math.floor(z / g);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++)
        for (const [ax, az] of anchors.get(`${kx + dx},${kz + dz}`) ?? []) if (Math.max(Math.abs(ax - x), Math.abs(az - z)) < g) return true;
      return false;
    };
    for (const it of kept) if (it.layer === layer.id) { const k = `${Math.floor(it.x / g)},${Math.floor(it.z / g)}`; anchors.set(k, [...anchors.get(k) ?? [], [it.x, it.z]]); }
    let count = 0;
    const gx0 = Math.floor(d.minX / g), gx1 = Math.floor((d.minX + d.width - 1) / g), gz0 = Math.floor(d.minZ / g), gz1 = Math.floor((d.minZ + d.length - 1) / g);
    for (let kz = gz0; kz <= gz1; kz++) for (let kx = gx0; kx <= gx1; kx++) {
      const seed = layer.seed * 4 + 1;
      if (columnHash(kx, kz, seed) >= chance) continue;
      const x = kx * g + Math.floor(columnHash(kx, kz, seed + 1) * g), z = kz * g + Math.floor(columnHash(kx, kz, seed + 2) * g);
      if (x < d.minX || z < d.minZ || x >= d.minX + d.width || z >= d.minZ + d.length) continue;
      if (g > 1 && near(x, z)) { missed.set('overlap', (missed.get('overlap') ?? 0) + 1); continue; }
      const variant = Math.floor(columnHash(x, z, seed + 3) * Math.max(1, part.variants)), rot = Math.floor(columnHash(x, z, seed + 4) * 4) as 0 | 1 | 2 | 3;
      const cells = fit(p, layer, { x, z, rot, variant }, taken, true);
      if (!Array.isArray(cells)) { missed.set(cells, (missed.get(cells) ?? 0) + 1); continue; }
      if (items.length >= MAX_SCATTER_ITEMS) fail(`mehr als ${MAX_SCATTER_ITEMS.toLocaleString('de-DE')} Teile. Bitte Dichte verringern.`);
      for (const c of cells) taken.add(`${c.x},${c.y},${c.z}`);
      items.push({ layer: layer.id, x, z, rot, variant });
      const k = `${Math.floor(x / g)},${Math.floor(z / g)}`; anchors.set(k, [...anchors.get(k) ?? [], [x, z]]);
      count++;
    }
    placed.set(layer.id, count);
  }
  const next: ScatterPlan = { layers: plan.layers, items };
  d.scatter = next;
  d.updatedAt = new Date().toISOString();
  return { plan: next, placed, missed };
}

/** Removes the generated (and with `manual` also the hand-set) items of a layer. */
export function clearScatterLayer(d: TerrainDesign, layerId: string, manual = true): number {
  const plan = d.scatter ?? EMPTY_SCATTER, before = plan.items.length;
  d.scatter = { layers: plan.layers, items: plan.items.filter(it => it.layer !== layerId || (!manual && it.manual)) };
  if (d.scatter.items.length !== before) d.updatedAt = new Date().toISOString();
  return before - d.scatter.items.length;
}

/** Replaces or adds a layer (settings change; items stay until scattered again). */
export function putScatterLayer(d: TerrainDesign, layer: ScatterLayer): void {
  const plan = d.scatter ?? EMPTY_SCATTER, checked = checkScatterLayer(layer);
  const exists = plan.layers.some(l => l.id === checked.id);
  if (!exists && plan.layers.length >= MAX_SCATTER_LAYERS) fail(`höchstens ${MAX_SCATTER_LAYERS} Ebenen`);
  d.scatter = { layers: exists ? plan.layers.map(l => l.id === checked.id ? checked : l) : [...plan.layers, checked], items: plan.items };
  d.updatedAt = new Date().toISOString();
}

/** Removes a layer and its items. */
export function removeScatterLayer(d: TerrainDesign, layerId: string): void {
  const plan = d.scatter ?? EMPTY_SCATTER;
  d.scatter = { layers: plan.layers.filter(l => l.id !== layerId), items: plan.items.filter(it => it.layer !== layerId) };
  d.updatedAt = new Date().toISOString();
}

/** Sets an item by hand at a column (turn and variant from the column hash). Returns the reason when it does not fit. */
export function addScatterItem(d: TerrainDesign, ctx: ScatterContext, layerId: string, x: number, z: number): ScatterMiss | null {
  const plan = d.scatter ?? EMPTY_SCATTER, layer = plan.layers.find(l => l.id === layerId) ?? fail('unbekannte Ebene');
  if (plan.items.length >= MAX_SCATTER_ITEMS) fail(`höchstens ${MAX_SCATTER_ITEMS.toLocaleString('de-DE')} Teile`);
  const p = prepare(d, ctx), part = p.resolve(layer.part);
  if (!part) return 'part';
  const taken = new Set<string>();
  for (const c of collect(p, plan).cells) taken.add(`${c.x},${c.y},${c.z}`);
  const item: ScatterItem = { layer: layerId, x, z, rot: Math.floor(columnHash(x, z, layer.seed + 77) * 4) as 0 | 1 | 2 | 3,
    variant: Math.floor(columnHash(x, z, layer.seed + 78) * Math.max(1, part.variants)), manual: true };
  const cells = fit(p, layer, item, taken, false);
  if (!Array.isArray(cells)) return cells;
  d.scatter = { layers: plan.layers, items: [...plan.items, item] };
  d.updatedAt = new Date().toISOString();
  return null;
}

/** Removes the items whose anchor lies within `radius` columns of (x, z) (all layers or one). Returns the number removed. */
export function removeScatterItems(d: TerrainDesign, x: number, z: number, radius: number, layerId?: string): number {
  const plan = d.scatter ?? EMPTY_SCATTER, r = Math.max(0, radius) + 0.5;
  const items = plan.items.filter(it => (layerId && it.layer !== layerId) || Math.hypot(it.x - x, it.z - z) > r);
  const removed = plan.items.length - items.length;
  if (removed) { d.scatter = { layers: plan.layers, items }; d.updatedAt = new Date().toISOString(); }
  return removed;
}

// ------------------------------------------------------------------ blocks

export interface ScatterCells {
  readonly cells: readonly DesignCell[];
  /** Items that fit on the planned terrain now. */
  readonly placed: number;
  /** Items that no longer fit (terrain changed since scattering), by reason. */
  readonly dropped: ReadonlyMap<ScatterMiss, number>;
  readonly perLayer: ReadonlyMap<string, number>;
  /** Blocks to place (not air), most first. */
  readonly materials: readonly { readonly id: string; readonly count: number }[];
}

function collect(p: Prepared, plan: ScatterPlan): ScatterCells {
  const layerById = new Map(plan.layers.map(l => [l.id, l] as const));
  const taken = new Set<string>(), cells: DesignCell[] = [], dropped = new Map<ScatterMiss, number>(), perLayer = new Map<string, number>();
  let placed = 0;
  for (const it of plan.items) {
    const layer = layerById.get(it.layer);
    if (!layer || !layer.enabled) continue;
    const r = fit(p, layer, it, taken, false);
    if (!Array.isArray(r)) { dropped.set(r, (dropped.get(r) ?? 0) + 1); continue; }
    for (const c of r) { taken.add(`${c.x},${c.y},${c.z}`); cells.push(c); }
    placed++; perLayer.set(it.layer, (perLayer.get(it.layer) ?? 0) + 1);
  }
  const counts = new Map<string, number>();
  for (const c of cells) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  return { cells, placed, dropped, perLayer, materials: [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)) };
}

/**
 * The blocks of all stored items on the current planned terrain (disabled
 * layers are left out). Pass `cells` as `extra` to designPayload so terrain
 * and scatter form one Bauteil.
 */
export function scatterCells(d: TerrainDesign, ctx: ScatterContext): ScatterCells {
  return collect(prepare(d, ctx), d.scatter ?? EMPTY_SCATTER);
}

/** The planned terrain as a survey including built-in scatter parts (trees and rocks raise the surface on the world map). */
export function plannedSurvey(base: TerrainSurvey, d: TerrainDesign, resolve: ScatterPartResolver = builtinResolver): TerrainSurvey {
  if (!d.scatter?.items.length) return designedSurvey(base, d);
  return designedSurvey(base, d, scatterCells(d, { base, resolve }).cells);
}

export { cloneScatter };
