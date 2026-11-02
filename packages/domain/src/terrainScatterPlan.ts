import { DomainError } from './types.js';

/**
 * Streu-Ebene (TERRAIN-02-S06), data part: the layers (which Natur-Bauteil,
 * where and how dense) and the placed items of a Geländegestaltung. The plan
 * lives in the header of the design file (BPTDES01), so it is saved, backed up
 * and undone together with the terrain. Placement and blocks: terrainScatter.ts.
 */

export const MAX_SCATTER_LAYERS = 32;
export const MAX_SCATTER_ITEMS = 50_000;

/** A built-in Natur-Bauteil, or a Schablone (EDIT-03/EDIT-04) from the library. */
export type ScatterPartRef =
  | { readonly kind: 'builtin'; readonly id: string }
  | { readonly kind: 'stencil'; readonly assetId: string; readonly versionId: string; readonly label: string };

export interface ScatterLayer {
  readonly id: string;
  readonly label: string;
  readonly part: ScatterPartRef;
  readonly enabled: boolean;
  /** Items per 1 000 columns (before the rules thin them out). */
  readonly density: number;
  /** Smallest distance between two items of the layer (columns, 1–32). */
  readonly spacing: number;
  /** Surface styles (SURFACE_STYLES ids) the layer grows on; empty = every surface. */
  readonly styles: readonly string[];
  readonly minSlope: number | null;
  readonly maxSlope: number | null;
  readonly minY: number | null;
  readonly maxY: number | null;
  /** Only within this many columns of water (reeds, shore plants); null = anywhere. */
  readonly shore: number | null;
  /** Columns kept free around planned buildings (0–16). */
  readonly buildingGap: number;
  /** Seed: the same seed gives the same placement. */
  readonly seed: number;
}

/** One placed item: anchor column, quarter turns and the variant of the part. Y follows the planned ground. */
export interface ScatterItem {
  readonly layer: string;
  readonly x: number;
  readonly z: number;
  readonly rot: 0 | 1 | 2 | 3;
  readonly variant: number;
  /** Set by hand (kept when the layer is scattered again). */
  readonly manual?: true;
}

export interface ScatterPlan {
  readonly layers: readonly ScatterLayer[];
  readonly items: readonly ScatterItem[];
}

export const EMPTY_SCATTER: ScatterPlan = { layers: [], items: [] };

const fail = (message: string): never => { throw new DomainError('TERRAIN_DESIGN', `Streu-Ebene: ${message}`); };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const optInt = (v: unknown, min: number, max: number) => v === null || isInt(v, min, max);
const LAYER_ID = /^[a-z0-9-]{1,32}$/;
const PART_ID = /^[a-z0-9-]{1,40}$/;
const UUIDISH = /^[A-Za-z0-9_.:-]{1,120}$/;
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\x00-\x1f]/.test(v);

function checkPart(raw: unknown): ScatterPartRef {
  if (!isObj(raw)) return fail('Bauteil fehlt');
  if (raw.kind === 'builtin' && typeof raw.id === 'string' && PART_ID.test(raw.id)) return { kind: 'builtin', id: raw.id };
  if (raw.kind === 'stencil' && typeof raw.assetId === 'string' && UUIDISH.test(raw.assetId) && typeof raw.versionId === 'string' && UUIDISH.test(raw.versionId) && text(raw.label, 120))
    return { kind: 'stencil', assetId: raw.assetId, versionId: raw.versionId, label: raw.label as string };
  return fail('ungültiges Bauteil');
}

export function checkScatterLayer(raw: unknown): ScatterLayer {
  if (!isObj(raw)) return fail('Ebene ist kein Objekt');
  if (typeof raw.id !== 'string' || !LAYER_ID.test(raw.id)) fail('ungültige Ebenen-ID');
  if (!text(raw.label, 80)) fail('ungültiger Name');
  const part = checkPart(raw.part);
  if (typeof raw.enabled !== 'boolean') fail('„aktiv“ fehlt');
  if (typeof raw.density !== 'number' || !Number.isFinite(raw.density) || raw.density < 0 || raw.density > 1000) fail('Dichte muss zwischen 0 und 1000 liegen');
  if (!isInt(raw.spacing, 1, 32)) fail('Abstand muss zwischen 1 und 32 liegen');
  if (!Array.isArray(raw.styles) || raw.styles.length > 32 || !raw.styles.every(s => typeof s === 'string' && PART_ID.test(s))) fail('ungültige Stilliste');
  if (!optInt(raw.minSlope, 0, 64) || !optInt(raw.maxSlope, 0, 64)) fail('ungültige Hangangabe');
  if (!optInt(raw.minY, -2048, 2047) || !optInt(raw.maxY, -2048, 2047)) fail('ungültige Höhenangabe');
  if (!optInt(raw.shore, 1, 16)) fail('ungültiger Uferabstand');
  if (!isInt(raw.buildingGap, 0, 16)) fail('ungültiger Abstand zu Bauten');
  if (!isInt(raw.seed, 0, 0x7fffffff)) fail('ungültiger Startwert');
  return { id: raw.id as string, label: raw.label as string, part, enabled: raw.enabled as boolean, density: raw.density as number, spacing: raw.spacing as number,
    styles: [...raw.styles as string[]], minSlope: raw.minSlope as number | null, maxSlope: raw.maxSlope as number | null, minY: raw.minY as number | null,
    maxY: raw.maxY as number | null, shore: raw.shore as number | null, buildingGap: raw.buildingGap as number, seed: raw.seed as number };
}

/** Validates a stored plan (file header). Throws a DomainError on anything unexpected. */
export function checkScatterPlan(raw: unknown): ScatterPlan {
  if (!isObj(raw)) return fail('kein Objekt');
  if (!Array.isArray(raw.layers) || raw.layers.length > MAX_SCATTER_LAYERS) fail(`höchstens ${MAX_SCATTER_LAYERS} Ebenen`);
  const layers = (raw.layers as unknown[]).map(checkScatterLayer);
  const ids = new Set(layers.map(l => l.id));
  if (ids.size !== layers.length) fail('doppelte Ebenen-ID');
  if (!Array.isArray(raw.items) || raw.items.length > MAX_SCATTER_ITEMS) fail(`höchstens ${MAX_SCATTER_ITEMS.toLocaleString('de-DE')} Teile`);
  const items = (raw.items as unknown[]).map((it): ScatterItem => {
    if (!isObj(it) || typeof it.layer !== 'string' || !ids.has(it.layer)) return fail('Teil ohne bekannte Ebene');
    if (!isInt(it.x, -30_000_000, 30_000_000) || !isInt(it.z, -30_000_000, 30_000_000) || !isInt(it.rot, 0, 3) || !isInt(it.variant, 0, 255)) fail('ungültiges Teil');
    if (it.manual !== undefined && it.manual !== true) fail('ungültige Kennung „von Hand“');
    return { layer: it.layer, x: it.x as number, z: it.z as number, rot: it.rot as 0 | 1 | 2 | 3, variant: it.variant as number, ...(it.manual === true && { manual: true as const }) };
  });
  return { layers, items };
}

export const cloneScatter = (p: ScatterPlan): ScatterPlan => ({ layers: p.layers.map(l => ({ ...l, styles: [...l.styles] })), items: p.items.map(i => ({ ...i })) });
