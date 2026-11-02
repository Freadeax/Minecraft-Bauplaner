import { OPPOSITE, slab, stairs, trapdoor, F } from './plot.js';
import type { H, Plot } from './plot.js';
import { CW, STEP, pick, put, putFree } from './style.js';
import type { Mix, Rect } from './style.js';
import { wallBanner } from './furnish.js';

/**
 * Fassadenbaukasten für Stadt-, Küsten- und Epochenbauten (LIB-05 Runde 2).
 * Works on a finished shell: it reads the outer wall plane of a rectangle,
 * finds window and door columns and adds relief in front of it – pilasters
 * between the openings, cornices on the floor lines, sills, sunshades, a
 * crowning cornice, a plinth and a door canopy – only into free cells, so the
 * design and its interior stay as drawn. Same input ⇒ same building.
 */

export interface FacadeLook {
  /** Pilaster block (full block, pillar or log). */
  readonly pilaster: string;
  /** Stairs for cornices and sills (placed upside down). */
  readonly band: string;
  /** Slab for sunshades and corner pieces of cornices. */
  readonly bandSlab: string;
  /** Stairs for the plinth skirt (bottom half). */
  readonly plinth?: string;
  /** Pavement around the building on the ground layer. */
  readonly pave?: Mix;
}

export interface FacadeOpts {
  /** Outer wall ring of the shell. */
  readonly at: Rect;
  /** First and last wall row of the façade. */
  readonly y0: number;
  readonly y1: number;
  /** Layers with a projecting cornice (usually the floor slabs). */
  readonly bands?: readonly number[];
  /** Layer of the crowning cornice (roof edge); null for none. */
  readonly crown?: number | null;
  readonly sides?: readonly H[];
  readonly pilasters?: 'rhythm' | 'corners' | 'none';
  readonly sills?: boolean;
  readonly hoods?: boolean;
  readonly plinth?: boolean;
  readonly canopy?: boolean;
  /** Ground layer for the pavement (default y0 − 1). */
  readonly ground?: number;
  readonly seed?: number;
}

const isOpening = (id: string | undefined): boolean => !!id && /(glass|_door$|iron_bars|_trapdoor$)/.test(id) && !/(_pane_|tinted)/.test(id);
const idAt = (p: Plot, x: number, y: number, z: number): string | undefined => { const s = p.get(x, y, z); return s && s.id !== 'minecraft:air' ? s.id.slice(10) : undefined; };

interface Side { out: H; cells: [number, number][] }
function sidesOf(r: Rect, which: readonly H[]): Side[] {
  const all: Side[] = [];
  const xs = (z: number) => Array.from({ length: r.x1 - r.x0 + 1 }, (_, i) => [r.x0 + i, z] as [number, number]);
  const zs = (x: number) => Array.from({ length: r.z1 - r.z0 + 1 }, (_, i) => [x, r.z0 + i] as [number, number]);
  for (const out of which) all.push({ out, cells: out === 'north' ? xs(r.z0) : out === 'south' ? xs(r.z1) : out === 'west' ? zs(r.x0) : zs(r.x1) });
  return all;
}

export function facade(p: Plot, l: FacadeLook, o: FacadeOpts): void {
  const which = o.sides ?? ['north', 'east', 'south', 'west'];
  const seed = o.seed ?? 0, ground = o.ground ?? o.y0 - 1;
  const sides = sidesOf(o.at, which);
  const top = (o.crown ?? o.y1 + 1) - 1;
  for (const { out, cells } of sides) {
    const [ox, oz] = STEP[out], inward = OPPOSITE[out];
    const opening = cells.map(([x, z]) => { for (let y = o.y0; y <= o.y1; y++) if (isOpening(idAt(p, x, y, z))) return true; return false; });
    const door = cells.map(([x, z]) => /_door$/.test(idAt(p, x, o.y0, z) ?? '') && !/trapdoor/.test(idAt(p, x, o.y0, z) ?? ''));
    const freeColumn = (x: number, z: number) => { for (let y = o.y0; y <= top; y++) if (p.has(x + ox, y, z + oz) || !p.inside(x + ox, y, z + oz)) return false; return true; };
    // Pilasters
    if (o.pilasters !== 'none') cells.forEach(([x, z], u) => {
      const corner = u === 0 || u === cells.length - 1;
      const between = !opening[u] && ((u > 0 && opening[u - 1]) || (u < cells.length - 1 && opening[u + 1]));
      if (!(corner || (o.pilasters !== 'corners' && between))) return;
      if (!freeColumn(x, z)) return;
      for (let y = o.y0; y <= top; y++) put(p, x + ox, y, z + oz, l.pilaster);
      if (corner) {
        const [ax, az] = STEP[CW[out]], s = u === 0 ? -1 : 1, dx = x + ox + ax * s, dz = z + oz + az * s;
        const cornerOther = which.includes(u === 0 ? OPPOSITE[CW[out]] : CW[out]);
        if (cornerOther) for (let y = o.y0; y <= top; y++) putFree(p, dx, y, dz, l.pilaster);
      }
    });
    // Sills and sunshades per window run
    cells.forEach(([x, z], u) => {
      if (!opening[u] || door[u]) return;
      for (let y = o.y0; y <= o.y1; y++) {
        if (!isOpening(idAt(p, x, y, z)) || isOpening(idAt(p, x, y - 1, z))) continue;
        let yt = y; while (isOpening(idAt(p, x, yt + 1, z))) yt++;
        if (o.sills !== false && y - 1 >= o.y0) putFree(p, x + ox, y - 1, z + oz, l.band, stairs(inward, 'top'));
        if (o.hoods && yt + 1 <= o.y1 + 1) putFree(p, x + ox, yt + 1, z + oz, l.bandSlab, slab('top'));
        y = yt;
      }
    });
    // Plinth
    if (o.plinth && l.plinth) cells.forEach(([x, z], u) => { if (!opening[u] || !isOpening(idAt(p, x, o.y0, z))) putFree(p, x + ox, o.y0, z + oz, l.plinth!, stairs(inward)); });
    // Door canopy
    if (o.canopy) cells.forEach(([x, z], u) => {
      if (!door[u]) return;
      const [ax, az] = STEP[CW[out]], y = o.y0 + 2;
      for (const s of [-1, 0, 1]) for (const d of [1, 2]) putFree(p, x + ax * s + ox * d, y, z + az * s + oz * d, l.bandSlab, slab('top'));
    });
    // Cornices on the floor lines and the crown
    const lines = [...(o.bands ?? []), ...(o.crown != null ? [o.crown] : [])];
    for (const y of lines) {
      cells.forEach(([x, z]) => putFree(p, x + ox, y, z + oz, l.band, stairs(inward, 'top')));
      const [ax, az] = STEP[CW[out]];
      for (const s of [-1, 1]) {
        const [cx, cz] = s < 0 ? cells[0]! : cells[cells.length - 1]!;
        putFree(p, cx + ox + ax * s, y, cz + oz + az * s, l.bandSlab, slab('top'));
      }
    }
  }
  // Pavement ring
  if (l.pave) {
    const r = o.at;
    for (let x = r.x0 - 2; x <= r.x1 + 2; x++) for (let z = r.z0 - 2; z <= r.z1 + 2; z++) {
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) continue;
      if (p.inside(x, ground, z) && !p.has(x, ground, z)) put(p, x, ground, z, pick(l.pave, x, ground, z, seed));
    }
  }
}

/**
 * Awning from slabs (holds carpets on top) with a striped edge of wall banners:
 * a top-slab roof `d` deep, striped carpets on it, banners on the outer edge.
 */
export function shopAwning(p: Plot, x: number, y: number, z: number, out: H, w: number, colors: readonly [string, string], slabId: string, d = 2): void {
  const [ox, oz] = STEP[out], [ax, az] = STEP[CW[out]];
  for (let i = 0; i < w; i++) {
    const c = colors[i % 2]!;
    for (let k = 1; k <= d; k++) {
      const cx = x + ax * i + ox * k, cz = z + az * i + oz * k;
      if (putFree(p, cx, y, cz, slabId, slab('top'))) putFree(p, cx, y + 1, cz, `${c}_carpet`);
    }
    const ex = x + ax * i + ox * d, ez = z + az * i + oz * d;
    if (p.get(ex, y, ez)?.id === `minecraft:${slabId}`) putFree(p, ex + ox, y, ez + oz, `${c}_wall_banner`, wallBanner(out));
  }
}

/** Balcony slab `w` wide and `d` deep in front of a side, with a rail (`rail` = glass_pane, iron_bars or a wall/fence id). */
export function balcony(p: Plot, x: number, y: number, z: number, out: H, w: number, d: number, floor: string, rail: string): void {
  const [ox, oz] = STEP[out], [ax, az] = STEP[CW[out]];
  for (let i = -1; i <= w; i++) for (let k = 1; k <= d; k++) {
    const cx = x + ax * i + ox * k, cz = z + az * i + oz * k;
    if (i === -1 || i === w) { putFree(p, cx, y, cz, floor, slab('top')); putFree(p, cx, y + 1, cz, rail); continue; }
    putFree(p, cx, y, cz, floor, slab('top'));
    if (k === d) putFree(p, cx, y + 1, cz, rail);
  }
}

/**
 * Roof equipment for flat roofs on the free cells of a rectangle at layer y:
 * air conditioning units, vent pipes, a skylight frame and solar panels,
 * spread by a position hash. Never touches set cells.
 */
export function roofKit(p: Plot, r: Rect, y: number, seed = 0, kinds: readonly ('klima' | 'luefter' | 'solar' | 'tank')[] = ['klima', 'luefter', 'solar']): void {
  const free = (x: number, z: number, w: number, d: number) => {
    for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) if (p.has(x + i, y, z + k) || !p.inside(x + i, y, z + k) || !p.has(x + i, y - 1, z + k)) return false;
    return true;
  };
  const spots: [number, number][] = [];
  for (let x = r.x0 + 1; x <= r.x1 - 2; x += 3) for (let z = r.z0 + 1; z <= r.z1 - 2; z += 3) spots.push([x, z]);
  let k = 0;
  for (const [x, z] of spots) {
    const kind = kinds[(k++ + seed) % kinds.length]!;
    if (kind === 'klima' && free(x, z, 2, 1)) {
      put(p, x, y, z, 'smooth_stone'); put(p, x + 1, y, z, 'iron_block');
      put(p, x, y + 1, z, 'smooth_stone_slab', slab()); put(p, x + 1, y + 1, z, 'iron_trapdoor', trapdoor('north', 'bottom'));
    } else if (kind === 'luefter' && free(x, z, 1, 1)) {
      put(p, x, y, z, 'polished_andesite'); put(p, x, y + 1, z, 'iron_bars'); put(p, x, y + 2, z, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
    } else if (kind === 'solar' && free(x, z, 2, 2)) {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) put(p, x + i, y, z + j, 'daylight_detector', { inverted: F, power: '0' });
    } else if (kind === 'tank' && free(x, z, 2, 2)) {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { put(p, x + i, y, z + j, 'spruce_fence'); put(p, x + i, y + 1, z + j, 'barrel', { facing: 'up', open: F }); put(p, x + i, y + 2, z + j, 'spruce_slab', slab()); }
    }
  }
}

/**
 * Projecting battlement (Maschikulis): a ring of upside-down stairs one block
 * outside the wall at layer y, a parapet ring on them at y + 1 and crenels on
 * every second cell at y + 2. Only free cells are written.
 */
export function machicolations(p: Plot, r: Rect, y: number, stairsId: string, wall: Mix, slabId: string, seed = 0): void {
  for (let x = r.x0 - 1; x <= r.x1 + 1; x++) for (let z = r.z0 - 1; z <= r.z1 + 1; z++) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) continue;
    const corner = (x < r.x0 || x > r.x1) && (z < r.z0 || z > r.z1);
    const side: H = z < r.z0 ? 'north' : z > r.z1 ? 'south' : x < r.x0 ? 'west' : 'east';
    if (corner) putFree(p, x, y, z, slabId, slab('top'));
    else putFree(p, x, y, z, stairsId, stairs(OPPOSITE[side], 'top'));
    putFree(p, x, y + 1, z, pick(wall, x, y + 1, z, seed));
    if ((x + z) % 2 === 0) putFree(p, x, y + 2, z, pick(wall, x, y + 2, z, seed));
  }
}

/**
 * Buttress (Strebepfeiler) in front of a wall cell: a pier `h` high, capped by
 * a stair sloping away from the wall, and a lower, wider foot with its own
 * sloping cap at half height.
 */
export function buttress(p: Plot, x: number, z: number, out: H, y0: number, h: number, block: Mix, stairsId: string, seed = 0): void {
  const [ox, oz] = STEP[out], inward = OPPOSITE[out];
  for (let y = y0; y < y0 + h; y++) putFree(p, x + ox, y, z + oz, pick(block, x + ox, y, z + oz, seed));
  putFree(p, x + ox, y0 + h, z + oz, stairsId, stairs(inward));
  const foot = Math.max(1, Math.floor(h / 2));
  for (let y = y0; y < y0 + foot; y++) putFree(p, x + 2 * ox, y, z + 2 * oz, pick(block, x + 2 * ox, y, z + 2 * oz, seed));
  putFree(p, x + 2 * ox, y0 + foot, z + 2 * oz, stairsId, stairs(inward));
}

/** Buttresses along the sides of a rectangle every `every` cells (corners skipped). */
export function buttresses(p: Plot, r: Rect, sides: readonly H[], every: number, y0: number, h: number, block: Mix, stairsId: string, seed = 0, skip?: (x: number, z: number) => boolean): void {
  for (const out of sides) {
    const horiz = out === 'north' || out === 'south';
    const a0 = horiz ? r.x0 : r.z0, a1 = horiz ? r.x1 : r.z1;
    for (let a = a0 + every; a <= a1 - 1; a += every) {
      const x = horiz ? a : out === 'west' ? r.x0 : r.x1, z = horiz ? (out === 'north' ? r.z0 : r.z1) : a;
      if (skip?.(x, z)) continue;
      buttress(p, x, z, out, y0, h, block, stairsId, seed);
    }
  }
}
