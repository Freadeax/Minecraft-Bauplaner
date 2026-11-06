import type { Cell, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import { createPayload } from '../../../voxel/src/validation.js';
import { ANLAGEN, SHIPPED_LABEL, normalizeChoices, planAnlage, previewAnlage } from '../base/anlagen.js';
import type { Anlage, AnlageLibrary, AnlagePlacement, AnlagePlan, AnlagePreview, Footprint, SlotState } from '../base/anlagen.js';
import { BUILD_THEMES } from './buildThemes.js';
import { placementBounds } from '../core/connectors.js';
import { ENSEMBLES } from './ensembles.js';
import { entranceOf, facesSide, turnsToFace } from '../base/entrance.js';
import type { Side } from '../base/entrance.js';
import { newId } from '../core/hash.js';
import { addAssetVersion, createAsset } from './library.js';
import { applyOperation, createProject } from '../core/project.js';
import type { Operation } from '../core/project.js';
import { SAMPLE_PROFILE } from '../core/samples.js';
import { addSection, checkSite, siteOf } from '../building/site.js';
import type { SitePlan } from '../building/site.js';
import { latestReleaseId } from '../versions/updateState.js';
import { DomainError } from '../core/types.js';
import type { Asset, AssetVersion, ConnectorLink, Instance, Project } from '../core/types.js';

/**
 * Großprojekte (GROSS-01): the library's size class above Anlagen. A Großprojekt
 * is a curated town plan – quarters (Quartiere) on a coarse grid, a street
 * network between them, and build phases that become construction-site
 * sections. Quarters hold catalogue buildings, shipped ensembles or whole
 * Anlagen; nothing is invented or duplicated, every slot pins a version label.
 *
 * `planGrossprojekt` is pure and deterministic (layout from the real rotated
 * footprints), `buildGrossprojektPlan` adds the generated street network as an
 * own part and returns a plan the Anlagen preview understands (real voxel
 * conflicts via the composer). Projects are created or changed only by
 * `createGrossprojektProject` / `grossprojektIntoProject`.
 */

export const GROSSPROJEKT_SCHEMA_VERSION = 1;
export const MIN_STREET_WIDTH = 2;
export const MAX_STREET_WIDTH = 9;
export const MAX_GP_SPACING = 12;
/** Default maximum width of one quarter row before it wraps. */
export const DEFAULT_QUARTER_ROW = 48;
/** Distance between lamp posts along a street. */
export const LAMP_STEP = 12;

export type QuartierKind = 'bauten' | 'platz' | 'gruen' | 'frei';
export const QUARTIER_KIND_LABEL: Readonly<Record<QuartierKind, string>> = { bauten: 'Bauquartier', platz: 'Platz', gruen: 'Grünfläche', frei: 'Freigehaltener Bauplatz' };

export type StreetStyle = 'dorf' | 'kies' | 'stein' | 'asphalt';
export const STREET_STYLE_LABEL: Readonly<Record<StreetStyle, string>> = {
  dorf: 'Trampelpfad (Erdweg, Kies)', kies: 'Kiesweg', stein: 'Pflaster (Steinziegel)', asphalt: 'Asphalt mit Gehweg (Beton, Andesit)',
};

export type GrossprojektUnit =
  | { readonly kind: 'slot'; readonly key: string; readonly assetId: string; readonly pin?: string; readonly turns?: 0 | 1 | 2 | 3; readonly role?: string }
  | { readonly kind: 'ensemble'; readonly key: string; readonly ensembleId: string }
  | { readonly kind: 'anlage'; readonly key: string; readonly anlageId: string };

export interface Quartier {
  readonly id: string;
  readonly name: string;
  /** One sentence: what this quarter does in the town. */
  readonly purpose: string;
  readonly kind: QuartierKind;
  /** Grid cell [column, row]; streets run between columns and between rows. */
  readonly cell: readonly [number, number];
  /** Cells covered [columns, rows]; default [1, 1]. Streets inside a spanning quarter are left out. */
  readonly span?: readonly [number, number];
  readonly units: readonly GrossprojektUnit[];
  /** Gap inside the quarter; default the project spacing (0 for row houses). */
  readonly gap?: number;
  readonly rowWidth?: number;
  /** Kept free (w × d blocks) – a reserved plot; nothing is placed there. */
  readonly reserve?: readonly [number, number];
}

export interface GrossprojektPhase {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly quartiere: readonly string[];
}

export interface GrossprojektStreets {
  readonly style: StreetStyle;
  /** Lane width in blocks (2–9). */
  readonly width: number;
  readonly lamps: boolean;
  /** Also a ring road around the whole plan. */
  readonly ring?: boolean;
}

export interface Grossprojekt {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Bauwelt (BUILD_THEMES id) the project belongs to, if any. */
  readonly themeId?: string;
  readonly tags: readonly string[];
  readonly streets: GrossprojektStreets | null;
  /** Curated gap between buildings and to the streets, in blocks. */
  readonly spacing: number;
  readonly quartiere: readonly Quartier[];
  /** Build order; every enabled quarter must appear in exactly one phase. */
  readonly phasen: readonly GrossprojektPhase[];
  /** Own Großprojekt from a collection (GROSS-01-S08): slots may hold own parts, not only catalogue buildings. */
  readonly own?: boolean;
}

export type ProjectScale = 'siedlung' | 'quartier' | 'stadtteil' | 'stadt';
export const SCALE_LABEL: Readonly<Record<ProjectScale, string>> = { siedlung: 'Siedlung (bis 14 Gebäude)', quartier: 'Quartier (15–34 Gebäude)', stadtteil: 'Stadtteil (35–69 Gebäude)', stadt: 'Stadt (ab 70 Gebäude)' };
export function scaleOf(buildings: number): ProjectScale {
  return buildings < 15 ? 'siedlung' : buildings < 35 ? 'quartier' : buildings < 70 ? 'stadtteil' : 'stadt';
}

const fail = (message: string): never => { throw new DomainError('GROSSPROJEKT', `Großprojekt: ${message}`); };

// ---------------------------------------------------------------------------
// Choices

export interface GrossprojektChoices {
  /** Quarter ids left out. */
  readonly off?: readonly string[];
  /** Slot key → other asset id (uses that asset's latest version). */
  readonly swaps?: Readonly<Record<string, string>>;
  /** Slot key → quarter turns (replaces the curated value and the door rule). */
  readonly turns?: Readonly<Record<string, 0 | 1 | 2 | 3>>;
  readonly spacing?: number;
  /** Build the street network (default true when the project has streets). */
  readonly streets?: boolean;
  readonly streetWidth?: number;
  readonly streetStyle?: StreetStyle;
  readonly lamps?: boolean;
  /** Turn single buildings so their entrance faces the nearest street (default true). */
  readonly doors?: boolean;
}

export interface NormalizedGpChoices {
  readonly off: readonly string[];
  readonly swaps: Readonly<Record<string, string>>;
  readonly turns: Readonly<Record<string, 0 | 1 | 2 | 3>>;
  readonly spacing: number;
  readonly streets: boolean;
  readonly streetWidth: number;
  readonly streetStyle: StreetStyle;
  readonly lamps: boolean;
  readonly doors: boolean;
}

export function normalizeGpChoices(gp: Grossprojekt, raw: GrossprojektChoices = {}): NormalizedGpChoices {
  const quarters = new Set(gp.quartiere.map(q => q.id));
  const slotKeys = new Set(gp.quartiere.flatMap(q => q.units.filter(u => u.kind === 'slot').map(u => u.key)));
  const off = [...new Set(raw.off ?? [])];
  for (const id of off) if (!quarters.has(id)) fail(`Quartier ${id} gibt es nicht`);
  const swaps: Record<string, string> = {}, turns: Record<string, 0 | 1 | 2 | 3> = {};
  for (const [k, v] of Object.entries(raw.swaps ?? {})) { if (!slotKeys.has(k)) fail(`Platz ${k} gibt es nicht`); if (typeof v !== 'string' || !v) fail(`Platz ${k}: Bauteil fehlt`); swaps[k] = v; }
  for (const [k, v] of Object.entries(raw.turns ?? {})) { if (!slotKeys.has(k)) fail(`Platz ${k} gibt es nicht`); if (![0, 1, 2, 3].includes(v)) fail(`Platz ${k}: Drehung 0–3`); turns[k] = v; }
  const spacing = raw.spacing ?? gp.spacing;
  if (!Number.isInteger(spacing) || spacing < 0 || spacing > MAX_GP_SPACING) fail(`Abstand muss 0–${MAX_GP_SPACING} Blöcke sein`);
  const streetWidth = raw.streetWidth ?? gp.streets?.width ?? 4;
  if (!Number.isInteger(streetWidth) || streetWidth < MIN_STREET_WIDTH || streetWidth > MAX_STREET_WIDTH) fail(`Straßenbreite muss ${MIN_STREET_WIDTH}–${MAX_STREET_WIDTH} Blöcke sein`);
  const streetStyle = raw.streetStyle ?? gp.streets?.style ?? 'stein';
  if (!(streetStyle in STREET_STYLE_LABEL)) fail(`Straßenstil ${streetStyle} unbekannt`);
  return { off, swaps, turns, spacing, streets: gp.streets !== null && raw.streets !== false, streetWidth, streetStyle, lamps: raw.lamps ?? gp.streets?.lamps ?? true, doors: raw.doors !== false };
}

// ---------------------------------------------------------------------------
// Validation of curated data

/** Structural check of a Großprojekt (ids, grid, phases, units); throws on the first problem. */
export function validateGrossprojekt(gp: Grossprojekt): void {
  if (!/^gp_[a-z0-9_]+$/.test(gp.id)) fail(`${gp.id}: id muss gp_<slug> sein`);
  if (!gp.name.trim() || !gp.description.trim()) fail(`${gp.id}: Name und Beschreibung fehlen`);
  if (gp.themeId && !BUILD_THEMES.some(t => t.id === gp.themeId)) fail(`${gp.id}: Bauwelt ${gp.themeId} gibt es nicht`);
  if (!Number.isInteger(gp.spacing) || gp.spacing < 0 || gp.spacing > MAX_GP_SPACING) fail(`${gp.id}: Abstand 0–${MAX_GP_SPACING}`);
  if (gp.streets && (!Number.isInteger(gp.streets.width) || gp.streets.width < MIN_STREET_WIDTH || gp.streets.width > MAX_STREET_WIDTH)) fail(`${gp.id}: Straßenbreite ${MIN_STREET_WIDTH}–${MAX_STREET_WIDTH}`);
  if (!gp.quartiere.length) fail(`${gp.id}: keine Quartiere`);
  const ids = new Set<string>(), keys = new Set<string>();
  const covered = new Map<string, string>();
  for (const q of gp.quartiere) {
    if (ids.has(q.id)) fail(`${gp.id}: Quartier ${q.id} doppelt`); ids.add(q.id);
    if (!q.name.trim() || !q.purpose.trim()) fail(`${gp.id}/${q.id}: Name und Zweck fehlen`);
    const [c, r] = q.cell, [sc, sr] = q.span ?? [1, 1];
    if (![c, r].every(n => Number.isInteger(n) && n >= 0 && n < 16) || ![sc, sr].every(n => Number.isInteger(n) && n >= 1 && n <= 8)) fail(`${gp.id}/${q.id}: Rasterzelle ungültig`);
    for (let x = c; x < c + sc; x++) for (let z = r; z < r + sr; z++) {
      const other = covered.get(`${x},${z}`);
      if (other) fail(`${gp.id}: Quartiere ${other} und ${q.id} überlagern sich in Zelle ${x},${z}`);
      covered.set(`${x},${z}`, q.id);
    }
    if (q.kind === 'frei' && !q.reserve) fail(`${gp.id}/${q.id}: freier Bauplatz braucht reserve`);
    if (q.reserve && !q.reserve.every(n => Number.isInteger(n) && n >= 1 && n <= 128)) fail(`${gp.id}/${q.id}: reserve 1–128`);
    if (q.kind !== 'frei' && !q.units.length) fail(`${gp.id}/${q.id}: keine Einheiten`);
    for (const u of q.units) {
      if (keys.has(u.key)) fail(`${gp.id}: Schlüssel ${u.key} doppelt`); keys.add(u.key);
      if (u.kind === 'slot' && !gp.own && !u.assetId.startsWith('bld_')) fail(`${gp.id}/${u.key}: Bauteil-Id muss bld_… sein`);
      if (u.kind === 'ensemble' && !ENSEMBLES.some(e => e.id === u.ensembleId)) fail(`${gp.id}/${u.key}: Ensemble ${u.ensembleId} gibt es nicht`);
      if (u.kind === 'anlage' && !ANLAGEN.some(a => a.id === u.anlageId)) fail(`${gp.id}/${u.key}: Anlage ${u.anlageId} gibt es nicht`);
    }
  }
  if (!gp.phasen.length) fail(`${gp.id}: keine Phasen`);
  const inPhase = new Map<string, string>();
  for (const ph of gp.phasen) {
    if (!ph.name.trim()) fail(`${gp.id}/${ph.id}: Phasenname fehlt`);
    for (const q of ph.quartiere) {
      if (!ids.has(q)) fail(`${gp.id}/${ph.id}: Quartier ${q} gibt es nicht`);
      if (inPhase.has(q)) fail(`${gp.id}: Quartier ${q} in zwei Phasen`);
      inPhase.set(q, ph.id);
    }
  }
  for (const q of gp.quartiere) if (!inPhase.has(q.id)) fail(`${gp.id}: Quartier ${q.id} in keiner Phase`);
}

// ---------------------------------------------------------------------------
// Library lookup (same rules as Anlagen: pinned label, swap = latest)

function lookup(lib: AnlageLibrary) {
  const assets = new Map(lib.assets.map(a => [a.id, a]));
  const versionOf = (asset: Asset, label: string | null): AssetVersion | undefined => {
    if (label === null) return lib.versions.get(latestReleaseId(asset, lib.versions) ?? '');
    for (const id of asset.versionIds) { const v = lib.versions.get(id); if (v?.label === label) return v; }
    return undefined;
  };
  return { assets, versionOf };
}

function slotState(lib: ReturnType<typeof lookup>, base: { key: string; districtId: string; ensembleId?: string; assetId: string; pin: string; role: string; turns: 0 | 1 | 2 | 3 }, swap: string | undefined): SlotState {
  const assetId = swap ?? base.assetId;
  const asset = lib.assets.get(assetId);
  const common = { key: base.key, districtId: base.districtId, ...(base.ensembleId && { ensembleId: base.ensembleId }), assetId, curatedAssetId: base.assetId, swapped: !!swap && swap !== base.assetId, role: base.role, turns: base.turns,
    turnSource: 'curated' as const, entrance: null, facesPath: null };
  if (!asset) return { ...common, status: 'missing-asset', version: null, pin: base.pin };
  const version = swap && swap !== base.assetId ? lib.versionOf(asset, null) : lib.versionOf(asset, base.pin);
  if (!version) return { ...common, status: 'missing-version', version: null, pin: base.pin };
  const latest = lib.versionOf(asset, null);
  return { ...common, status: asset.archived ? 'archived' : 'ok', version, pin: version.label, ...(latest && latest.id !== version.id && { newer: latest.label }) };
}

// ---------------------------------------------------------------------------
// Layout

const ORIGIN = { position: [0, 0, 0] as Vec3, quarterTurns: 0 as 0 | 1 | 2 | 3, mirrorX: false };
const turned = (t: 0 | 1 | 2 | 3) => ({ ...ORIGIN, quarterTurns: t });
const footOf = (version: AssetVersion, t: typeof ORIGIN): Footprint => {
  const b = placementBounds(version, t);
  return { x0: b.min[0], z0: b.min[2], x1: b.maxExclusive[0], z1: b.maxExclusive[2] };
};
function at(version: AssetVersion, turns: 0 | 1 | 2 | 3, x: number, z: number): typeof ORIGIN {
  const b = placementBounds(version, turned(turns));
  return { position: [x - b.min[0], -b.min[1], z - b.min[2]], quarterTurns: turns, mirrorX: false };
}
const union = (fs: readonly Footprint[]): Footprint | null => fs.length
  ? { x0: Math.min(...fs.map(f => f.x0)), z0: Math.min(...fs.map(f => f.z0)), x1: Math.max(...fs.map(f => f.x1)), z1: Math.max(...fs.map(f => f.z1)) } : null;

/** A unit: one slot, an ensemble or an Anlage as a block with relative parts. */
interface Unit {
  readonly w: number; readonly d: number;
  readonly parts: readonly { slot: SlotState; dx: number; dz: number; dy?: number; kind: 'building' | 'path'; name?: string }[];
}

export interface QuartierLayout {
  readonly id: string;
  readonly name: string;
  readonly kind: QuartierKind;
  readonly enabled: boolean;
  readonly cell: readonly [number, number];
  readonly span: readonly [number, number];
  /** Grid region of the quarter (cells plus inner lanes), null when disabled. */
  readonly region: Footprint | null;
  /** Union of placed footprints (or the reserved plot), null when nothing is placed. */
  readonly footprint: Footprint | null;
  readonly placements: number;
  readonly reserved: boolean;
  /** Street side the buildings face ('south' = street below the quarter). */
  readonly faces: Side | null;
}

export interface StreetLayout {
  /** Lane cells (x, z) of the street network. */
  readonly cells: readonly (readonly [number, number])[];
  readonly lamps: readonly (readonly [number, number])[];
  readonly width: number;
  readonly style: StreetStyle;
  /** Lane rectangles (for the site plan). */
  readonly lanes: readonly Footprint[];
}

export interface GrossprojektLayout {
  readonly gp: Grossprojekt;
  readonly choices: NormalizedGpChoices;
  readonly slots: readonly SlotState[];
  readonly placements: readonly AnlagePlacement[];
  readonly quartiere: readonly QuartierLayout[];
  readonly streets: StreetLayout | null;
  readonly extent: Footprint | null;
  readonly blockers: readonly string[];
  readonly columns: number;
  readonly rows: number;
}

const rect = (x0: number, z0: number, x1: number, z1: number): Footprint => ({ x0, z0, x1, z1 });

/**
 * Lays a Großprojekt out: resolves pins and swaps, packs every quarter into
 * rows, sizes the grid columns/rows from the real footprints, positions the
 * quarters and rasterises the street lanes between them. Pure and deterministic.
 */
export function planGrossprojekt(gp: Grossprojekt, library: AnlageLibrary, rawChoices: GrossprojektChoices = {}): GrossprojektLayout {
  validateGrossprojekt(gp);
  const choices = normalizeGpChoices(gp, rawChoices);
  const lib = lookup(library);
  const blockers: string[] = [];
  const slots: SlotState[] = [];
  const nameCount = new Map<string, number>();
  const nameFor = (base: string) => { const n = (nameCount.get(base) ?? 0) + 1; nameCount.set(base, n); return n > 1 ? `${base} ${n}` : base; };
  const streetsOn = choices.streets && gp.streets !== null;
  const sw = streetsOn ? choices.streetWidth : 0;
  const lane = streetsOn ? sw + 2 * choices.spacing : 2 * choices.spacing; // between two cells
  const ring = streetsOn && !!gp.streets?.ring;

  // 1. Units per quarter (also for disabled quarters, so the UI can list their slots).
  interface Packed { readonly q: Quartier; readonly enabled: boolean; readonly units: Unit[]; readonly states: SlotState[]; w: number; d: number; faces: Side | null }
  const packed: Packed[] = [];
  const columns = Math.max(...gp.quartiere.map(q => q.cell[0] + (q.span?.[0] ?? 1)));
  const rows = Math.max(...gp.quartiere.map(q => q.cell[1] + (q.span?.[1] ?? 1)));
  for (const q of gp.quartiere) {
    const enabled = !choices.off.includes(q.id);
    const units: Unit[] = [], states: SlotState[] = [];
    const [, row] = q.cell, spanRows = q.span?.[1] ?? 1;
    // Facing: a street below the quarter (next row or ring) is preferred, else a street above.
    const below = streetsOn && (row + spanRows < rows || ring), above = streetsOn && (row > 0 || ring);
    const faces: Side | null = below ? 'south' : above ? 'north' : null;
    for (const u of q.units) {
      if (u.kind === 'slot') {
        const manual = choices.turns[u.key];
        let slot = slotState(lib, { key: u.key, districtId: q.id, assetId: u.assetId, pin: u.pin ?? SHIPPED_LABEL, role: u.role ?? (library.assets.find(a => a.id === u.assetId)?.name ?? u.assetId), turns: manual ?? u.turns ?? 0 }, choices.swaps[u.key]);
        if (slot.version) {
          const entrance = entranceOf(slot.version.payload);
          const auto = choices.doors && manual === undefined && faces ? turnsToFace(entrance, faces) : null;
          const turns = auto ?? slot.turns;
          slot = { ...slot, turns, entrance, turnSource: manual !== undefined ? 'manual' : auto !== null ? 'door' : 'curated', facesPath: faces ? facesSide(entrance, turns, faces) : null };
          const b = footOf(slot.version!, turned(turns));
          units.push({ w: b.x1 - b.x0, d: b.z1 - b.z0, parts: [{ slot, dx: 0, dz: 0, kind: 'building' }] });
        }
        states.push(slot);
      } else if (u.kind === 'ensemble') {
        const ensemble = ENSEMBLES.find(e => e.id === u.ensembleId)!;
        const parts: { slot: SlotState; dx: number; dz: number; dy?: number; kind: 'building' }[] = [];
        ensemble.members.forEach((m, i) => {
          const slot = slotState(lib, { key: `${u.key}.${i + 1}`, districtId: q.id, ensembleId: ensemble.id, assetId: m.assetId, pin: SHIPPED_LABEL, role: library.assets.find(a => a.id === m.assetId)?.name ?? m.assetId, turns: m.turns ?? 0 }, undefined);
          states.push(slot);
          parts.push({ slot, dx: m.at[0], dz: m.at[1], ...(m.y && { dy: m.y }), kind: 'building' });
        });
        const ok = parts.filter(p => p.slot.version);
        const f = union(ok.map(p => { const b = footOf(p.slot.version!, turned(p.slot.turns)); return rect(p.dx, p.dz, p.dx + b.x1 - b.x0, p.dz + b.z1 - b.z0); }));
        if (f) units.push({ w: f.x1 - f.x0, d: f.z1 - f.z0, parts: ok.map(p => ({ ...p, dx: p.dx - f.x0, dz: p.dz - f.z0 })) });
      } else {
        const anlage = ANLAGEN.find(a => a.id === u.anlageId)!;
        const plan = planAnlage(anlage, library, { spacing: Math.min(anlage.spacing, MAX_GP_SPACING) });
        const tag = `anlage:${anlage.id}`;
        for (const st of plan.slots) states.push({ ...st, key: `${u.key}.${st.key}`, districtId: q.id, ensembleId: tag });
        blockers.push(...plan.blockers.map(b => `${q.name}: ${anlage.name} – ${b}`));
        const ext = plan.extent;
        if (ext) units.push({ w: ext.x1 - ext.x0, d: ext.z1 - ext.z0, parts: plan.placements.map(p => ({
          slot: { ...(plan.slots.find(s => s.key === p.key) ?? { key: p.key, districtId: q.id, assetId: p.version.assetId, curatedAssetId: p.version.assetId, swapped: false, role: p.name, status: 'ok' as const, pin: p.version.label, turnSource: 'curated' as const, entrance: null, facesPath: null }),
            key: `${u.key}.${p.key}`, districtId: q.id, ensembleId: tag, version: p.version, turns: p.transform.quarterTurns },
          dx: p.footprint.x0 - ext.x0, dz: p.footprint.z0 - ext.z0, kind: p.kind, name: `${anlage.name}: ${p.name}` })) });
      }
    }
    slots.push(...states);
    if (enabled) for (const st of states) if (!st.version) blockers.push(`${q.name}: ${st.role} – ${st.status === 'missing-asset' ? `Bauteil ${st.assetId} fehlt` : `Version ${st.pin} von ${st.assetId} fehlt`}`);
    // Pack rows to get the quarter size.
    const gap = Math.min(q.gap ?? choices.spacing, choices.spacing), rowWidth = q.rowWidth ?? DEFAULT_QUARTER_ROW;
    let x = 0, rowDepth = 0, depth = 0, width = 0;
    for (const unit of units) {
      if (x > 0 && x + unit.w > rowWidth) { depth += rowDepth + gap; x = 0; rowDepth = 0; }
      x += unit.w + gap; rowDepth = Math.max(rowDepth, unit.d); width = Math.max(width, x - gap);
    }
    depth += rowDepth;
    const w = Math.max(width, q.reserve?.[0] ?? 0), d = Math.max(depth, q.reserve?.[1] ?? 0);
    packed.push({ q, enabled, units, states, w, d, faces });
  }

  // 2. Grid sizes from the enabled quarters (single-cell first, spanning quarters widen their last cell).
  const colW = new Array<number>(columns).fill(0), rowD = new Array<number>(rows).fill(0);
  const spanning = packed.filter(p => p.enabled).sort((a, b) => ((a.q.span?.[0] ?? 1) * (a.q.span?.[1] ?? 1)) - ((b.q.span?.[0] ?? 1) * (b.q.span?.[1] ?? 1)));
  for (const p of spanning) {
    const [c, r] = p.q.cell, [sc, sr] = p.q.span ?? [1, 1];
    const haveW = colW.slice(c, c + sc).reduce((a, b) => a + b, 0) + (sc - 1) * lane;
    if (haveW < p.w) colW[c + sc - 1]! += p.w - haveW;
    const haveD = rowD.slice(r, r + sr).reduce((a, b) => a + b, 0) + (sr - 1) * lane;
    if (haveD < p.d) rowD[r + sr - 1]! += p.d - haveD;
  }
  const colX: number[] = [], rowZ: number[] = [];
  const edge = ring ? sw + choices.spacing : 0;
  for (let c = 0, x = edge; c < columns; c++) { colX.push(x); x += colW[c]! + lane; }
  for (let r = 0, z = edge; r < rows; r++) { rowZ.push(z); z += rowD[r]! + lane; }
  const totalW = edge + colW.reduce((a, b) => a + b, 0) + (columns - 1) * lane + edge;
  const totalD = edge + rowD.reduce((a, b) => a + b, 0) + (rows - 1) * lane + edge;

  // 3. Place quarters: content aligned to the facing street; rows grow away from it.
  const placements: AnlagePlacement[] = [];
  const quartiere: QuartierLayout[] = [];
  const regions: Footprint[] = [];
  for (const p of packed) {
    const [c, r] = p.q.cell, [sc, sr] = p.q.span ?? [1, 1];
    if (!p.enabled) { quartiere.push({ id: p.q.id, name: p.q.name, kind: p.q.kind, enabled: false, cell: p.q.cell, span: [sc, sr], region: null, footprint: null, placements: 0, reserved: false, faces: null }); continue; }
    const region = rect(colX[c]!, rowZ[r]!, colX[c + sc - 1]! + colW[c + sc - 1]!, rowZ[r + sr - 1]! + rowD[r + sr - 1]!);
    regions.push(region);
    const gap = Math.min(p.q.gap ?? choices.spacing, choices.spacing), rowWidth = p.q.rowWidth ?? DEFAULT_QUARTER_ROW;
    // Horizontal centring inside the region; vertical: pressed to the street the quarter faces.
    const x0 = region.x0 + Math.floor((region.x1 - region.x0 - p.w) / 2);
    const own: AnlagePlacement[] = [];
    let x = x0, rowDepth = 0, rowOffset = 0;
    const rowsOut: { units: Unit[]; depth: number; offset: number }[] = [];
    let cur: Unit[] = [];
    for (const unit of p.units) {
      if (x > x0 && x + unit.w > x0 + rowWidth) { rowsOut.push({ units: cur, depth: rowDepth, offset: rowOffset }); rowOffset += rowDepth + gap; cur = []; x = x0; rowDepth = 0; }
      cur.push(unit); x += unit.w + gap; rowDepth = Math.max(rowDepth, unit.d);
    }
    if (cur.length) rowsOut.push({ units: cur, depth: rowDepth, offset: rowOffset });
    for (const row of rowsOut) {
      // faces south: first row at the south edge; faces north (or none): first row at the north edge.
      const z = p.faces === 'south' ? region.z1 - row.offset - row.depth : region.z0 + row.offset;
      let ux = x0;
      for (const unit of row.units) {
        // Units in a row share the row's far edge: bottom-aligned when facing south, top-aligned otherwise.
        const uz = p.faces === 'south' ? z + row.depth - unit.d : z;
        for (const part of unit.parts) {
          const v = part.slot.version!, t = at(v, part.slot.turns, ux + part.dx, uz + part.dz);
          if (part.dy) t.position = [t.position[0], t.position[1] + part.dy, t.position[2]];
          own.push({ key: part.slot.key, districtId: p.q.id, ...(part.slot.ensembleId && { ensembleId: part.slot.ensembleId }), kind: part.kind, name: nameFor(part.name ?? part.slot.role), version: v, transform: t, footprint: footOf(v, t) });
        }
        ux += unit.w + gap;
      }
    }
    placements.push(...own);
    const reserved = p.q.kind === 'frei' || (!!p.q.reserve && !own.length);
    quartiere.push({ id: p.q.id, name: p.q.name, kind: p.q.kind, enabled: true, cell: p.q.cell, span: [sc, sr], region,
      footprint: own.length ? union(own.map(o => o.footprint)) : reserved ? rect(region.x0, region.z0, region.x0 + (p.q.reserve?.[0] ?? 0), region.z0 + (p.q.reserve?.[1] ?? 0)) : null,
      placements: own.length, reserved, faces: p.faces });
  }

  // 4. Streets: lanes between columns/rows (and a ring); lane segments inside spanning quarters are left out.
  let streets: StreetLayout | null = null;
  if (streetsOn && gp.streets) {
    const enabledPacked = packed.filter(p => p.enabled);
    const blocked = regions.filter((_, i) => { const sp = enabledPacked[i]!.q.span ?? [1, 1]; return sp[0] > 1 || sp[1] > 1; });
    /** Cuts the intervals [b0, b1) of blockers that cross the lane's other axis out of [from, to). */
    const cut = (from: number, to: number, crosses: (b: Footprint) => boolean, lo: (b: Footprint) => number, hi: (b: Footprint) => number): [number, number][] => {
      let pieces: [number, number][] = [[from, to]];
      for (const b of blocked) {
        if (!crosses(b)) continue;
        pieces = pieces.flatMap(([a, c]) => { const out: [number, number][] = []; if (lo(b) > a) out.push([a, Math.min(c, lo(b))]); if (hi(b) < c) out.push([Math.max(a, hi(b)), c]); return out.filter(([x, y]) => y > x); });
      }
      return pieces;
    };
    const lanes: Footprint[] = [];
    for (let c = 0; c < columns - 1; c++) {
      const x = colX[c]! + colW[c]! + choices.spacing;
      for (const [z0, z1] of cut(0, totalD, b => b.x0 < x + sw && x < b.x1, b => b.z0, b => b.z1)) lanes.push(rect(x, z0, x + sw, z1));
    }
    for (let r = 0; r < rows - 1; r++) {
      const z = rowZ[r]! + rowD[r]! + choices.spacing;
      for (const [x0, x1] of cut(0, totalW, b => b.z0 < z + sw && z < b.z1, b => b.x0, b => b.x1)) lanes.push(rect(x0, z, x1, z + sw));
    }
    if (ring) { lanes.push(rect(0, 0, sw, totalD), rect(totalW - sw, 0, totalW, totalD), rect(0, 0, totalW, sw), rect(0, totalD - sw, totalW, totalD)); }
    const cells: [number, number][] = [];
    const seen = new Set<string>();
    for (const l of lanes) for (let x = l.x0; x < l.x1; x++) for (let z = l.z0; z < l.z1; z++) {
      const k = `${x},${z}`;
      if (seen.has(k)) continue;
      seen.add(k); cells.push([x, z]);
    }
    const laneCells = seen;
    const lamps: [number, number][] = [];
    if (choices.lamps) {
      const taken = (x: number, z: number) => laneCells.has(`${x},${z}`) || placements.some(p => x >= p.footprint.x0 && x < p.footprint.x1 && z >= p.footprint.z0 && z < p.footprint.z1) || quartiere.some(q => q.reserved && q.footprint && x >= q.footprint.x0 && x < q.footprint.x1 && z >= q.footprint.z0 && z < q.footprint.z1);
      for (const l of lanes) {
        const vertical = l.z1 - l.z0 > l.x1 - l.x0;
        const len = vertical ? l.z1 - l.z0 : l.x1 - l.x0;
        for (let i = LAMP_STEP / 2; i < len; i += LAMP_STEP) {
          const [x, z] = vertical ? [l.x0 - 1, l.z0 + i] : [l.x0 + i, l.z0 - 1];
          if (x < 0 || z < 0 || x >= totalW || z >= totalD || taken(x, z) || lamps.some(([lx, lz]) => Math.abs(lx - x) + Math.abs(lz - z) < 4)) continue;
          lamps.push([x, z]);
        }
      }
    }
    streets = { cells, lamps, width: sw, style: choices.streetStyle, lanes };
  }

  const all = [...placements.map(p => p.footprint), ...quartiere.flatMap(q => q.footprint ? [q.footprint] : []), ...(streets?.lanes ?? [])];
  return { gp, choices, slots, placements, quartiere, streets, extent: union(all), blockers, columns, rows };
}

// ---------------------------------------------------------------------------
// Street network payload (own part, like the base planner's path network)

const STREET_MIX: Readonly<Record<StreetStyle, { readonly middle: readonly string[]; readonly edge: readonly string[] }>> = {
  dorf: { middle: ['dirt_path'], edge: ['gravel', 'coarse_dirt', 'dirt_path', 'cobblestone'] },
  kies: { middle: ['gravel', 'gravel', 'gravel', 'andesite'], edge: ['cobblestone', 'mossy_cobblestone', 'gravel', 'andesite'] },
  stein: { middle: ['stone_bricks', 'stone_bricks', 'cracked_stone_bricks', 'mossy_stone_bricks'], edge: ['polished_andesite', 'cobblestone', 'stone_bricks', 'andesite'] },
  asphalt: { middle: ['gray_concrete', 'gray_concrete', 'gray_concrete', 'light_gray_concrete'], edge: ['smooth_stone', 'smooth_stone', 'polished_andesite'] },
};
const mix = (list: readonly string[], x: number, z: number) => {
  let h = (x * 73856093) ^ (z * 19349663); h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16;
  return list[Math.abs(h) % list.length]!;
};

export function streetPayload(streets: StreetLayout): { payload: VoxelPayload; origin: readonly [number, number] } | null {
  if (!streets.cells.length) return null;
  const all = [...streets.cells, ...streets.lamps];
  const x0 = Math.min(...all.map(c => c[0])), z0 = Math.min(...all.map(c => c[1]));
  const x1 = Math.max(...all.map(c => c[0])) + 1, z1 = Math.max(...all.map(c => c[1])) + 1;
  const palette: { id: string; properties: Record<string, string> }[] = [];
  const pal = new Map<string, number>();
  const ix = (id: string, properties: Record<string, string> = {}) => {
    const key = `${id}${JSON.stringify(properties)}`;
    let n = pal.get(key); if (n === undefined) { n = palette.length; pal.set(key, n); palette.push({ id: `minecraft:${id}`, properties }); } return n;
  };
  const set = new Set(streets.cells.map(([x, z]) => `${x},${z}`));
  const style = STREET_MIX[streets.style];
  const out: Cell[] = [];
  for (const [x, z] of streets.cells) {
    const edge = !set.has(`${x + 1},${z}`) || !set.has(`${x - 1},${z}`) || !set.has(`${x},${z + 1}`) || !set.has(`${x},${z - 1}`);
    out.push({ position: [x - x0, 0, z - z0], kind: 'block', paletteIndex: ix(mix(edge && streets.width > 2 ? style.edge : style.middle, x, z)) });
  }
  const post = streets.style === 'asphalt' ? ['polished_andesite', 'iron_bars', 'lantern'] as const : ['mossy_cobblestone', 'spruce_fence', 'lantern'] as const;
  for (const [x, z] of streets.lamps) {
    out.push({ position: [x - x0, 0, z - z0], kind: 'block', paletteIndex: ix(post[0]) });
    out.push({ position: [x - x0, 1, z - z0], kind: 'block', paletteIndex: ix(post[1], { east: 'false', north: 'false', south: 'false', waterlogged: 'false', west: 'false' }) });
    out.push({ position: [x - x0, 2, z - z0], kind: 'block', paletteIndex: ix(post[2], { hanging: 'false', waterlogged: 'false' }) });
  }
  const payload = createPayload({ schemaVersion: 1, profileId: SAMPLE_PROFILE, bounds: { min: [0, 0, 0], maxExclusive: [x1 - x0, streets.lamps.length ? 3 : 1, z1 - z0] },
    pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells: out, blockEntities: [] });
  return { payload, origin: [x0, z0] };
}

// ---------------------------------------------------------------------------
// Plan for the Anlagen preview

export interface GrossprojektPlan extends AnlagePlan {
  readonly layout: GrossprojektLayout;
  /** Own part for the street network (stored on adoption, before the project). */
  readonly network: { readonly asset: Asset; readonly version: AssetVersion } | null;
}

/** Synthetic Anlage: one district per quarter (names and inner gaps for the spacing check). */
function anlageOf(layout: GrossprojektLayout): Anlage {
  return { id: layout.gp.id, themeId: layout.gp.themeId ?? '', name: layout.gp.name, description: layout.gp.description, path: null, spacing: layout.choices.spacing,
    districts: layout.gp.quartiere.map(q => ({ id: q.id, name: q.name, purpose: q.purpose, side: 'nord' as const, slots: [], gap: Math.min(q.gap ?? layout.choices.spacing, layout.choices.spacing) })) };
}

/** Builds the street network part (async: version hash) and returns a plan the Anlagen preview understands. */
export async function buildGrossprojektPlan(layout: GrossprojektLayout, input: { name?: string } = {}): Promise<GrossprojektPlan> {
  const anlage = anlageOf(layout);
  const choices = normalizeChoices(anlage, { spacing: anlage.spacing, path: false, doors: false, off: layout.choices.off });
  const placements: AnlagePlacement[] = [...layout.placements];
  let network: GrossprojektPlan['network'] = null;
  const net = layout.streets ? streetPayload(layout.streets) : null;
  if (net && layout.streets) {
    const asset = createAsset({ name: `Straßennetz: ${input.name?.trim() || layout.gp.name}`.slice(0, 120), tags: ['strassennetz', 'grossprojekt', 'infrastruktur'],
      description: `Straßen (${STREET_STYLE_LABEL[layout.streets.style]}, ${layout.streets.width} Blöcke breit) und ${layout.streets.lamps.length} Laternen zwischen den Quartieren von „${layout.gp.name}“.`,
      provenance: { author: 'Minecraft-Bauplaner', source: 'Großprojekt (eigener Entwurf)', license: 'frei für dieses Projekt' } });
    network = await addAssetVersion(asset, { payload: net.payload, label: '1.0', source: { format: 'base-plan' } });
    const t = { position: [net.origin[0], 0, net.origin[1]] as Vec3, quarterTurns: 0 as const, mirrorX: false };
    placements.push({ key: 'strassen', districtId: null, kind: 'path', name: 'Straßennetz', version: network.version, transform: t, area: true,
      footprint: rect(net.origin[0], net.origin[1], net.origin[0] + net.payload.bounds.maxExclusive[0], net.origin[1] + net.payload.bounds.maxExclusive[2]) });
  }
  return {
    anlage, choices, slots: layout.slots, placements, layout, network,
    districts: layout.quartiere.map(q => ({ id: q.id, name: q.name, side: 'nord' as const, enabled: q.enabled, footprint: q.footprint, placements: q.placements })),
    lane: 0, extent: layout.extent, blockers: layout.blockers,
  };
}

export function previewGrossprojekt(plan: GrossprojektPlan, input: Parameters<typeof previewAnlage>[1] = {}): AnlagePreview {
  const versions = new Map(input.versions ?? []);
  if (plan.network) versions.set(plan.network.version.id, plan.network.version);
  return previewAnlage(plan, { ...input, versions });
}

// ---------------------------------------------------------------------------
// Adoption

interface SectionDraft { name: string; note: string; instanceIds: string[] }

/** Sections by phase: streets first, then every phase with its quarters (purposes and reserved plots in the note). */
export function grossprojektSections(plan: GrossprojektPlan, ids: ReadonlyMap<string, string>, byKey: ReadonlyMap<string, string>): SectionDraft[] {
  const out: SectionDraft[] = [];
  const of = (key: string) => { const id = byKey.get(key); return id ? ids.get(id) ?? id : null; };
  const net = of('strassen');
  if (net) out.push({ name: 'Straßen & Plätze', note: 'Zuerst: Das Straßennetz gibt allen Quartieren die Lage vor.', instanceIds: [net] });
  const layoutOf = new Map(plan.layout.quartiere.map(q => [q.id, q]));
  plan.layout.gp.phasen.forEach((phase, i) => {
    const quarters = phase.quartiere.map(id => plan.layout.gp.quartiere.find(q => q.id === id)!).filter(q => layoutOf.get(q.id)?.enabled);
    const instanceIds = quarters.flatMap(q => plan.placements.filter(p => p.districtId === q.id).map(p => of(p.key))).filter((x): x is string => !!x);
    const reserved = quarters.filter(q => layoutOf.get(q.id)?.reserved).map(q => { const f = layoutOf.get(q.id)!.footprint; return `${q.name}: Bauplatz ${f ? `${f.x1 - f.x0} × ${f.z1 - f.z0}` : ''} freihalten`; });
    if (!instanceIds.length && !reserved.length) return;
    out.push({ name: `Phase ${i + 1}: ${phase.name}`, note: [phase.note, ...quarters.map(q => `${q.name}: ${q.purpose}`), ...reserved].join(' · ').slice(0, 500), instanceIds });
  });
  return out;
}

function siteWith(site: SitePlan, sections: readonly SectionDraft[]): SitePlan {
  let next = site;
  for (const sec of sections) {
    if (!sec.instanceIds.length) continue;
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
const keyIndex = (plan: GrossprojektPlan, preview: AnlagePreview) => new Map(plan.placements.map((p, i) => [p.key, preview.draft.instances[i]!.id]));

function assertAdoptable(plan: GrossprojektPlan, preview: AnlagePreview, acceptConflicts: boolean): void {
  if (plan.blockers.length) fail(`nicht übernehmbar – ${plan.blockers.join('; ')}`);
  if (!preview.draft.instances.length) fail('kein Quartier ausgewählt');
  if (preview.conflicts.length && !acceptConflicts) fail(`${preview.conflicts.length} Voxelkonflikt(e); Übernahme nur nach ausdrücklicher Bestätigung`);
}

/** New project from a preview. The network asset/version (plan.network) must be stored first. */
export function createGrossprojektProject(plan: GrossprojektPlan, preview: AnlagePreview, input: { name?: string; profileId?: string; acceptConflicts?: boolean } = {}): Project {
  assertAdoptable(plan, preview, input.acceptConflicts ?? false);
  const { gp } = plan.layout;
  const off = plan.layout.choices.off.length ? ` Ohne: ${gp.quartiere.filter(q => plan.layout.choices.off.includes(q.id)).map(q => q.name).join(', ')}.` : '';
  let project = createProject({ name: (input.name?.trim() || gp.name).slice(0, 120), profileId: input.profileId ?? SAMPLE_PROFILE,
    description: `Aus dem Großprojekt „${gp.name}“ angelegt (${plan.layout.gp.phasen.length} Bauphasen, Abstand ${plan.layout.choices.spacing}${plan.layout.streets ? `, Straßen ${plan.layout.streets.width} Blöcke` : ''}).${off} ${gp.description}`.slice(0, 2000) });
  const f = fresh(preview);
  const operations: Operation[] = [
    ...f.instances.map(instance => ({ kind: 'instance.add' as const, instance })),
    ...f.links.map(link => ({ kind: 'link.add' as const, link })),
    { kind: 'site.set', site: siteWith(siteOf(project), grossprojektSections(plan, f.ids, keyIndex(plan, preview))), label: 'Bauphasen des Großprojekts' },
  ];
  project = applyOperation(project, { kind: 'batch', label: `Großprojekt „${gp.name}“ übernommen`, operations }).project;
  return project;
}

/** One undoable operation adding the previewed Großprojekt to an existing project (sections appended). */
export function grossprojektIntoProject(plan: GrossprojektPlan, preview: AnlagePreview, base: Project, input: { acceptConflicts?: boolean } = {}): Operation {
  assertAdoptable(plan, preview, input.acceptConflicts ?? false);
  if (preview.baseFingerprint !== JSON.stringify([base.instances, base.links, base.site ?? null]) || preview.project.id !== base.id)
    fail('Das Projekt wurde seit der Vorschau geändert; bitte Vorschau neu berechnen');
  const f = fresh(preview);
  return { kind: 'batch', label: `Großprojekt „${plan.layout.gp.name}“ eingefügt`, operations: [
    ...f.instances.map(instance => ({ kind: 'instance.add' as const, instance })),
    ...f.links.map(link => ({ kind: 'link.add' as const, link })),
    { kind: 'site.set', site: siteWith(siteOf(base), grossprojektSections(plan, f.ids, keyIndex(plan, preview))), label: 'Bauphasen des Großprojekts' },
  ] };
}

// ---------------------------------------------------------------------------
// Summary (catalogue card)

export interface GrossprojektSummary {
  readonly id: string;
  readonly buildings: number;
  readonly quarters: number;
  readonly phases: number;
  readonly scale: ProjectScale;
  readonly extent: Footprint | null;
  readonly area: number;
  readonly blockers: number;
}

/** Numbers of the default layout (no choices), for cards and sorting. */
export function summarizeGrossprojekt(gp: Grossprojekt, library: AnlageLibrary): GrossprojektSummary {
  const layout = planGrossprojekt(gp, library);
  const buildings = layout.placements.filter(p => p.kind === 'building').length;
  const e = layout.extent;
  return { id: gp.id, buildings, quarters: gp.quartiere.length, phases: gp.phasen.length, scale: scaleOf(buildings), extent: e, area: e ? (e.x1 - e.x0) * (e.z1 - e.z0) : 0, blockers: layout.blockers.length };
}

export const themeOfGrossprojekt = (gp: Pick<Grossprojekt, 'themeId'>) => BUILD_THEMES.find(t => t.id === gp.themeId);
/** Asset ids a Großprojekt needs (slots, ensembles, embedded Anlagen), for the building sheet's "used in" list. */
export function grossprojektAssetIds(gp: Grossprojekt): string[] {
  const out = new Set<string>();
  for (const q of gp.quartiere) for (const u of q.units) {
    if (u.kind === 'slot') out.add(u.assetId);
    else if (u.kind === 'ensemble') for (const m of ENSEMBLES.find(e => e.id === u.ensembleId)?.members ?? []) out.add(m.assetId);
    else for (const d of ANLAGEN.find(a => a.id === u.anlageId)?.districts ?? []) { for (const s of d.slots) out.add(s.assetId); for (const m of ENSEMBLES.find(e => e.id === d.ensemble)?.members ?? []) out.add(m.assetId); }
  }
  return [...out];
}
