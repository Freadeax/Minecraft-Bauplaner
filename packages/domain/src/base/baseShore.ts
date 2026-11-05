import type { Vec3 } from '../../../voxel/src/types.js';
import type { Footprint } from './anlagen.js';
import { WATER_SIDE_LABEL } from './base.js';
import type { BaseLayout, WaterSide } from './base.js';
import { columnAt } from '../world/terrainSurvey.js';
import type { TerrainSurvey } from '../world/terrainSurvey.js';
import { DomainError } from '../core/types.js';

/**
 * Basisplaner auf Gelände (TERRAIN-03-S06): reads the real coastline from the
 * terrain survey of the target project and compares it with the planned shore
 * of a base layout. Pure; nothing is changed or stored.
 *
 *  - Wasserseite: for every side, rows across the base are searched outwards
 *    (up to SHORE_SEARCH blocks) for open water (at least SHORE_WIDE wide).
 *    The side where most rows reach open water is suggested; no water at all
 *    suggests „kein Wasser“; creeks, ponds and peninsulas suggest nothing.
 *  - Uferlinie: per row across the base (for a south shore: per x) the first
 *    water column seen from the plaza towards the water side. Their median is
 *    the real shore; the difference to the planned line is a shift along the
 *    water axis that puts the planned shore onto the real one.
 *  - Lage: building columns that would stand in real water and pier columns
 *    that would end up on real land, with the shift applied or not.
 *
 * Coordinates: a plan cell (x, z) lies at world (origin + offset + x, origin + offset + z),
 * the same rule as previewAnlage/fitAnlageToTerrain.
 */

/** Water this many columns wide (along the search) counts as open water; less is a creek or a pond edge. */
export const SHORE_WIDE = 8;
/** Share of rows reaching open water from which a side counts as coast. */
export const SHORE_COAST_SHARE = 0.5;
/** Below this share of rows with any water on every side the base is called inland. */
export const SHORE_INLAND_SHARE = 0.1;
/** Farthest search for water beyond the base (blocks). */
export const SHORE_SEARCH = 64;
/** Largest shift that is suggested; beyond it the base belongs somewhere else. */
export const SHORE_MAX_SHIFT = 48;

type Side = Exclude<WaterSide, 'keine'>;
const SIDES: readonly Side[] = ['nord', 'ost', 'sued', 'west'];

export interface ShoreSide {
  readonly side: Side;
  /** Rows across the base whose search beyond the edge met known terrain. */
  readonly rows: number;
  /** Rows reaching open water (at least SHORE_WIDE columns) within SHORE_SEARCH. */
  readonly open: number;
  /** Rows meeting only narrow water (creek, pond edge). */
  readonly narrow: number;
  /** open / rows; 0 without rows. */
  readonly share: number;
  /** Median distance from the base edge to the open water (0 = right at the edge); null without open water. */
  readonly distance: number | null;
}

export interface ShoreFit {
  readonly sides: readonly ShoreSide[];
  /** Suggested water side; null when the survey is unclear (mixed or too little known). */
  readonly suggested: WaterSide | null;
  readonly reason: string;
  /** Planned shore of the layout in world coordinates on the water axis; null without water side. */
  readonly plannedLine: number | null;
  /** Median of the real shore on the same axis; null when no shore was found. */
  readonly realLine: number | null;
  /** Rows across the base in which a shore was found / searched. */
  readonly rows: { readonly found: number; readonly searched: number };
  /** Plan shift (x, z) that puts the planned shore onto the real one; [0, 0] when none is needed or possible. */
  readonly shift: readonly [number, number];
  /** Building columns on real water and pier columns on real land at the current offset. */
  readonly now: ShoreClash;
  /** The same after `shift`. */
  readonly shifted: ShoreClash;
  readonly notes: readonly string[];
}

export interface ShoreClash {
  /** Footprint columns of land buildings standing on real water. */
  readonly wet: number;
  /** Footprint columns of piers standing on real land. */
  readonly dry: number;
  /** Footprint columns with known terrain. */
  readonly known: number;
}

export interface ShoreInput {
  readonly survey: TerrainSurvey;
  /** World origin of the target project. */
  readonly origin: Vec3;
  /** Offset of the base inside the project (x, z). */
  readonly offset?: readonly [number, number];
}

const fail = (message: string): never => { throw new DomainError('ANLAGE', `Basis auf Gelände: ${message}`); };

/** 1 = water, 0 = land, null = unknown, outside the survey or lava (neither shore nor building ground). */
function waterAt(s: TerrainSurvey, x: number, z: number): 0 | 1 | null {
  const c = columnAt(s, x, z);
  if (!c) return null;
  if (!c.fluid) return 0;
  return c.surfaceId === 'minecraft:lava' ? null : 1;
}

/** Moves one step towards the water on the water axis. */
const outward = (side: Side): readonly [number, number] => side === 'nord' ? [0, -1] : side === 'sued' ? [0, 1] : side === 'west' ? [-1, 0] : [1, 0];
const onAxis = (side: Side, x: number, z: number): number => side === 'nord' || side === 'sued' ? z : x;

/** Scans from (x, z) towards the water: steps to the first water and the width of that water run. */
function scan(survey: TerrainSurvey, side: Side, x: number, z: number): { known: boolean; at: number | null; width: number } {
  const [dx, dz] = outward(side);
  let known = false;
  for (let i = 0; i < SHORE_SEARCH; i++, x += dx, z += dz) {
    const w = waterAt(survey, x, z);
    if (w === null) continue;
    known = true;
    if (w === 0) continue;
    let width = 0;
    // Water running out of the survey counts as open: its far bank is unknown.
    for (let w2 = waterAt(survey, x, z); width < SHORE_WIDE && w2 !== 0; w2 = waterAt(survey, x, z)) {
      if (w2 === null) { width = SHORE_WIDE; break; }
      width++; x += dx; z += dz;
    }
    return { known, at: i, width };
  }
  return { known, at: null, width: 0 };
}

/** Per side of a world rectangle: rows across it that reach open or narrow water within SHORE_SEARCH beyond the edge. */
export function shoreSides(survey: TerrainSurvey, area: Footprint): ShoreSide[] {
  return SIDES.map(side => {
    const alongX = side === 'nord' || side === 'sued';
    const lo = alongX ? area.x0 : area.z0, hi = alongX ? area.x1 : area.z1;
    let rows = 0, open = 0, narrow = 0;
    const distances: number[] = [];
    for (let r = lo; r < hi; r++) {
      const x = alongX ? r : side === 'west' ? area.x0 - 1 : area.x1;
      const z = alongX ? (side === 'nord' ? area.z0 - 1 : area.z1) : r;
      const hit = scan(survey, side, x, z);
      if (!hit.known) continue;
      rows++;
      if (hit.at === null) continue;
      if (hit.width >= SHORE_WIDE) { open++; distances.push(hit.at); } else narrow++;
    }
    distances.sort((a, b) => a - b);
    return { side, rows, open, narrow, share: rows ? open / rows : 0, distance: distances.length ? distances[Math.floor(distances.length / 2)]! : null };
  });
}

/** Suggestion from the sides: the side where most rows reach open water, inland, or null when unclear. */
export function suggestWaterSide(sides: readonly ShoreSide[]): { side: WaterSide | null; reason: string } {
  const usable = sides.filter(s => s.rows >= 4);
  if (!usable.length) return { side: null, reason: 'Die Geländeaufnahme reicht nicht um die Basis herum; Wasserseite bitte selbst wählen.' };
  const pct = (s: ShoreSide) => `${Math.round(s.share * 100)} %`;
  const where = (s: ShoreSide) => s.distance ? `${s.distance} Blöcke hinter der Basis` : 'direkt an der Basis';
  const sorted = [...usable].sort((a, b) => b.share - a.share || (a.distance ?? 0) - (b.distance ?? 0) || SIDES.indexOf(a.side) - SIDES.indexOf(b.side));
  const best = sorted[0]!, second = sorted[1];
  if (best.share >= SHORE_COAST_SHARE) {
    if (second && second.share >= SHORE_COAST_SHARE)
      return { side: null, reason: `Offenes Wasser auf mehreren Seiten (${WATER_SIDE_LABEL[best.side]} ${pct(best)}, ${WATER_SIDE_LABEL[second.side]} ${pct(second)} der Reihen): Halbinsel oder Bucht, Wasserseite bitte selbst wählen.` };
    return { side: best.side, reason: `Küste im ${WATER_SIDE_LABEL[best.side]}: ${pct(best)} der Reihen treffen auf offenes Wasser, im Mittel ${where(best)}.` };
  }
  const wet = usable.map(s => ({ s, any: (s.open + s.narrow) / s.rows })).sort((a, b) => b.any - a.any)[0]!;
  if (wet.any < SHORE_INLAND_SHARE) return { side: 'keine', reason: `Kein Wasser bis ${SHORE_SEARCH} Blöcke um die Basis.` };
  if (wet.s.narrow > wet.s.open) return { side: null, reason: `Im ${WATER_SIDE_LABEL[wet.s.side]} nur schmales Wasser (Bach oder Teich), keine Küste; Wasserseite bitte selbst wählen.` };
  return { side: null, reason: `Nur stellenweise offenes Wasser (höchstens ${pct(best)} der Reihen im ${WATER_SIDE_LABEL[best.side]}); Wasserseite bitte selbst wählen.` };
}

/** Real shore per row across the base: first water column from the plaza outwards, world coordinate on the water axis. */
function realShore(survey: TerrainSurvey, side: Side, area: Footprint, from: readonly [number, number]): { line: number | null; found: number; searched: number } {
  const [dx, dz] = outward(side);
  const alongX = side === 'nord' || side === 'sued';
  const lo = alongX ? area.x0 : area.z0, hi = alongX ? area.x1 : area.z1;
  const end = side === 'nord' ? area.z0 - SHORE_SEARCH : side === 'sued' ? area.z1 + SHORE_SEARCH : side === 'west' ? area.x0 - SHORE_SEARCH : area.x1 + SHORE_SEARCH;
  const hits: number[] = [];
  let searched = 0;
  for (let r = lo; r < hi; r++) {
    let x = alongX ? r : from[0], z = alongX ? from[1] : r;
    searched++;
    for (;;) {
      const w = waterAt(survey, x, z);
      if (w === 1) { hits.push(onAxis(side, x, z)); break; }
      if (onAxis(side, x, z) === end) break;
      x += dx; z += dz;
    }
  }
  if (!hits.length) return { line: null, found: 0, searched };
  hits.sort((a, b) => a - b);
  return { line: hits[Math.floor(hits.length / 2)]!, found: hits.length, searched };
}

/** Building columns on water and pier columns on land for a given plan shift. */
function clash(layout: BaseLayout, survey: TerrainSurvey, base: readonly [number, number]): ShoreClash {
  let wet = 0, dry = 0, known = 0;
  for (const z of layout.zones) for (const m of z.members) {
    const f = m.footprint;
    if (!f) continue;
    for (let pz = f.z0; pz < f.z1; pz++) for (let px = f.x0; px < f.x1; px++) {
      const w = waterAt(survey, px + base[0], pz + base[1]);
      if (w === null) continue;
      known++;
      if (m.water && w === 0) dry++;
      if (!m.water && w === 1) wet++;
    }
  }
  return { wet, dry, known };
}

/**
 * Compares a base layout with the real terrain: suggested water side, real
 * shoreline against the planned one, and the shift that lays the planned shore
 * onto the real coast.
 */
export function fitBaseShore(layout: BaseLayout, input: ShoreInput): ShoreFit {
  const { survey, origin } = input;
  const offset = input.offset ?? [0, 0];
  if (!offset.every(Number.isInteger) || !origin.every(Number.isInteger)) fail('Versatz und Ursprung müssen ganzzahlig sein');
  const base: [number, number] = [origin[0] + offset[0], origin[2] + offset[1]];
  const empty: ShoreClash = { wet: 0, dry: 0, known: 0 };
  const extent = layout.extent;
  if (!extent) return { sides: [], suggested: null, reason: 'Die Basis ist leer.', plannedLine: null, realLine: null, rows: { found: 0, searched: 0 }, shift: [0, 0], now: empty, shifted: empty, notes: [] };
  const area: Footprint = { x0: extent.x0 + base[0], x1: extent.x1 + base[0], z0: extent.z0 + base[1], z1: extent.z1 + base[1] };
  // The water band of a coastal layout lies inside the extent (piers reach out); look at the land part only.
  const land = layout.water ? landPart(area, layout.water.side, layout.water.line + (layout.water.side === 'nord' || layout.water.side === 'sued' ? base[1] : base[0])) : area;
  const sides = shoreSides(survey, land);
  const { side: suggested, reason } = suggestWaterSide(sides);
  const notes: string[] = [];
  const now = clash(layout, survey, base);
  if (!layout.water) {
    if (suggested && suggested !== 'keine') notes.push(`Die Geländeaufnahme zeigt Wasser im ${WATER_SIDE_LABEL[suggested]}; mit dieser Wasserseite kommen Hafen und Felder ans Ufer.`);
    if (now.wet) notes.push(`${now.wet} Grundrissspalten von Gebäuden stehen im echten Wasser.`);
    return { sides, suggested, reason, plannedLine: null, realLine: null, rows: { found: 0, searched: 0 }, shift: [0, 0], now, shifted: now, notes };
  }
  const side = layout.water.side;
  const axisBase = side === 'nord' || side === 'sued' ? base[1] : base[0];
  const plannedLine = layout.water.line + axisBase;
  const plaza = layout.plaza;
  const from: [number, number] = [Math.floor((plaza.x0 + plaza.x1) / 2) + base[0], Math.floor((plaza.z0 + plaza.z1) / 2) + base[1]];
  const shore = realShore(survey, side, area, from);
  let shift: [number, number] = [0, 0];
  if (shore.line !== null) {
    const d = shore.line - plannedLine;
    if (Math.abs(d) > SHORE_MAX_SHIFT) notes.push(`Das echte Ufer liegt ${Math.abs(d)} Blöcke ${towards(side, d)} der geplanten Uferlinie; so weit wird nicht verschoben. Basis an anderer Stelle der Weltkarte planen.`);
    else if (d !== 0) shift = side === 'nord' || side === 'sued' ? [0, d] : [d, 0];
  } else notes.push(`Im ${WATER_SIDE_LABEL[side]} wurde bis ${SHORE_SEARCH} Blöcke hinter der Basis kein Wasser gefunden.`);
  if (suggested && suggested !== side) notes.push(suggested === 'keine' ? 'Laut Geländeaufnahme liegt neben der Basis kein Wasser.' : `Laut Geländeaufnahme liegt das Wasser eher im ${WATER_SIDE_LABEL[suggested]}.`);
  const shifted = shift[0] || shift[1] ? clash(layout, survey, [base[0] + shift[0], base[1] + shift[1]]) : now;
  if (shore.found && shore.found < shore.searched) notes.push(`Ufer nur in ${shore.found} von ${shore.searched} Reihen gefunden (Rest außerhalb der Aufnahme oder ohne Wasser).`);
  if (shifted.wet) notes.push(`${shifted.wet} Grundrissspalten von Gebäuden stünden im Wasser: krumme Küste, dort aufschütten oder Gebäude tauschen.`);
  if (shifted.dry) notes.push(`${shifted.dry} Stegspalten stünden an Land: dort ausheben oder den Steg kürzen.`);
  return { sides, suggested, reason, plannedLine, realLine: shore.line, rows: { found: shore.found, searched: shore.searched }, shift, now, shifted, notes };
}

/** The part of a rectangle on the land side of a water line (world coordinates). */
function landPart(r: Footprint, side: Side, line: number): Footprint {
  switch (side) {
    case 'sued': return { ...r, z1: Math.max(r.z0 + 1, Math.min(r.z1, line)) };
    case 'nord': return { ...r, z0: Math.min(r.z1 - 1, Math.max(r.z0, line + 1)) };
    case 'ost': return { ...r, x1: Math.max(r.x0 + 1, Math.min(r.x1, line)) };
    case 'west': return { ...r, x0: Math.min(r.x1 - 1, Math.max(r.x0, line + 1)) };
  }
}

/** „seewärts“/„landeinwärts“ of a difference along the water axis. */
function towards(side: Side, d: number): string {
  const out = side === 'sued' || side === 'ost' ? d > 0 : d < 0;
  return out ? 'seewärts' : 'landeinwärts';
}
