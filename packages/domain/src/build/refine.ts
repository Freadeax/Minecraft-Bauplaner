import { adoptPayload, stateKey } from '../../../voxel/src/validation.js';
import type { BlockState, Cell, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import type { BuildingFacets } from '../catalog.js';
import type { BuildingSpec } from './spec.js';
import { pick } from './style.js';
import type { Mix } from './style.js';

/**
 * Veredelung (LIB-05): a deterministic finishing pass over a finished
 * building, applying the rules of docs/architecture/BAUSTIL.md that work
 * without knowing the design:
 *
 * 1. Weathering mix – outside faces of uniform masonry get their mossy and
 *    cracked variants (more near the ground), stairs/slabs/walls their mossy
 *    forms. Inside faces stay as designed.
 * 2. Window dressing – single-width outside windows in a solid wall get open
 *    trapdoor shutters beside them and an upside-down stair sill below, where
 *    those cells are free and inside the building's bounds.
 *
 * It never changes the bounds, never removes blocks and never touches a cell
 * the design reserved as explicit air. Same payload + seed ⇒ same result.
 */

export interface RefineOptions {
  /** Seed of the material mix, e.g. derived from the asset id. */
  readonly seed: number;
  readonly weather: boolean;
  readonly windows: boolean;
}

const MASONRY: Readonly<Record<string, Mix>> = {
  stone_bricks: [['stone_bricks', 10], ['mossy_stone_bricks', 2], ['cracked_stone_bricks', 2]],
  cobblestone: [['cobblestone', 8], ['mossy_cobblestone', 3]],
  deepslate_bricks: [['deepslate_bricks', 8], ['cracked_deepslate_bricks', 2]],
  deepslate_tiles: [['deepslate_tiles', 8], ['cracked_deepslate_tiles', 1]],
  polished_blackstone_bricks: [['polished_blackstone_bricks', 8], ['cracked_polished_blackstone_bricks', 2]],
  nether_bricks: [['nether_bricks', 8], ['cracked_nether_bricks', 2]],
};
/** Shaped forms with a mossy twin (same properties). */
const SHAPED: Readonly<Record<string, string>> = {
  stone_brick_stairs: 'mossy_stone_brick_stairs', stone_brick_slab: 'mossy_stone_brick_slab', stone_brick_wall: 'mossy_stone_brick_wall',
  cobblestone_stairs: 'mossy_cobblestone_stairs', cobblestone_slab: 'mossy_cobblestone_slab', cobblestone_wall: 'mossy_cobblestone_wall',
};

const WOODS = ['dark_oak', 'spruce', 'oak', 'birch', 'jungle', 'acacia', 'mangrove', 'cherry', 'pale_oak', 'crimson', 'warped', 'bamboo'] as const;
const H4 = [['north', 0, -1], ['south', 0, 1], ['west', -1, 0], ['east', 1, 0]] as const;
const OPP: Readonly<Record<string, string>> = { north: 'south', south: 'north', west: 'east', east: 'west' };

/** Which passes suit a catalogue building, from its facets. */
export function refineOptionsFor(id: string, facets: BuildingFacets): RefineOptions | null {
  const kat = facets.kategorie ?? [], k = new Set(kat), stil = new Set(facets.stil ?? []);
  const skip = ['landschaft', 'statue', 'redstone', 'fahrzeug', 'farm'];
  if (kat.every(c => skip.includes(c))) return null;
  const modern = ['modern', 'futuristisch', 'technisch', 'end', 'industriell'].some(s => stil.has(s));
  const homely = ['wohnhaus', 'handel', 'handwerk', 'landwirtschaft', 'oeffentlich', 'magie', 'garten'].some(c => k.has(c));
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (Math.imul(seed, 31) + id.charCodeAt(i)) | 0;
  return { seed, weather: !modern, windows: homely && !modern && !stil.has('nether') && !stil.has('wuestenstil') };
}

const isFullish = (id: string): boolean =>
  /(_planks|_log|_wood|_bricks|_concrete|_terracotta|_wool|stone|cobblestone|sandstone|_tiles|deepslate|blackstone|quartz_block|calcite|_pillar|tuff|andesite|diorite|granite|mud|_block)$/.test(id)
  && !/(_slab|_stairs|_pane|_wall|_button|_pressure_plate|glass|leaves|_fence|_gate)$/.test(id);

export function refinePayload(payload: VoxelPayload, o: RefineOptions): VoxelPayload {
  const [sx, sy, sz] = payload.bounds.maxExclusive, [mx, my, mz] = payload.bounds.min;
  // Cells and the exterior flood live on a padded index grid (one cell around x/z, one above): string keys made
  // the catalogue start slow for large buildings (STAB/PERF, 03.11.2026). Cells outside the grid count as empty.
  const DX = sx - mx + 2, DY = sy - my + 1, DZ = sz - mz + 2;
  const key = (x: number, y: number, z: number): number => {
    const i = x - mx + 1, j = y - my, k = z - mz + 1;
    return i < 0 || j < 0 || k < 0 || i >= DX || j >= DY || k >= DZ ? -1 : (i * DY + j) * DZ + k;
  };
  const cells = new Map<number, { position: Vec3; air: boolean; state: BlockState }>();
  const erased: Cell[] = [];
  for (const c of payload.cells) {
    if (c.kind === 'erase') { erased.push(c); continue; }
    cells.set(key(...c.position), { position: c.position, air: c.kind === 'air', state: payload.palette[c.paletteIndex]! });
  }
  const inside = (x: number, y: number, z: number) => x >= mx && y >= my && z >= mz && x < sx && y < sy && z < sz;
  const name = (x: number, y: number, z: number) => { const k = key(x, y, z); const c = k < 0 ? undefined : cells.get(k); return c && !c.air ? c.state.id.slice(10) : null; };

  // Exterior air: flood from a one-cell shell around the bounds through cells without a block.
  const outside = new Uint8Array(DX * DY * DZ);
  const queue: number[] = [mx - 1, my, mz - 1];
  outside[key(mx - 1, my, mz - 1)] = 1;
  const STEPS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
  while (queue.length) {
    const z = queue.pop()!, y = queue.pop()!, x = queue.pop()!;
    for (const [dx, dy, dz] of STEPS) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx < mx - 1 || ny < my || nz < mz - 1 || nx > sx || ny > sy || nz > sz) continue;
      const k = key(nx, ny, nz);
      if (outside[k] || name(nx, ny, nz)) continue;
      outside[k] = 1; queue.push(nx, ny, nz);
    }
  }
  const out = (x: number, y: number, z: number) => { const k = key(x, y, z); return k >= 0 && outside[k] === 1; };
  const exposed = (x: number, y: number, z: number) => H4.some(([, dx, dz]) => out(x + dx, y, z + dz)) || out(x, y + 1, z);
  const set = (x: number, y: number, z: number, id: string, properties: Record<string, string>) =>
    cells.set(key(x, y, z), { position: [x, y, z], air: false, state: { id: `minecraft:${id}`, properties } });

  if (o.weather) for (const c of [...cells.values()]) {
    if (c.air) continue;
    const id = c.state.id.slice(10), [x, y, z] = c.position;
    if (!exposed(x, y, z)) continue;
    const mix = MASONRY[id];
    // More moss and cracks close to the ground.
    if (mix) { const n = pick(y - my <= 2 ? [...mix, ...mix.slice(1)] : mix, x, y, z, o.seed); if (n !== id) set(x, y, z, n, { ...c.state.properties }); continue; }
    const twin = SHAPED[id];
    if (twin && pick([[id, 4], [twin, 1]], x, y, z, o.seed) === twin) set(x, y, z, twin, { ...c.state.properties });
  }

  if (o.windows) {
    // Wood of the building: the most used wood family (planks, logs, stairs …).
    const count = new Map<string, number>();
    for (const c of cells.values()) if (!c.air) { const w = WOODS.find(w => c.state.id.includes(`${w}_`)); if (w) count.set(w, (count.get(w) ?? 0) + 1); }
    const main = [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'spruce';
    const shutter = main === 'bamboo' ? 'spruce' : main;
    const trim = ['oak', 'birch', 'cherry', 'jungle', 'pale_oak', 'bamboo'].includes(main) ? 'spruce' : main === 'dark_oak' ? 'spruce' : 'dark_oak';
    const done = new Set<number>();
    for (const c of [...cells.values()]) {
      if (c.air || !c.state.id.endsWith('glass_pane')) continue;
      const [x, y, z] = c.position;
      if (done.has(key(x, y, z)) || name(x, y - 1, z)?.endsWith('glass_pane')) continue;
      // Window column from its bottom pane.
      let top = y;
      while (name(x, top + 1, z)?.endsWith('glass_pane')) top++;
      for (let yy = y; yy <= top; yy++) done.add(key(x, yy, z));
      for (const [face, dx, dz] of H4) {
        if (!out(x + dx, y, z + dz)) continue;
        // Wall plane runs across the face; both wall neighbours must be solid and not glass (single-width window).
        const ax = dz !== 0 ? 1 : 0, az = dx !== 0 ? 1 : 0;
        const left = name(x - ax, y, z - az), right = name(x + ax, y, z + az);
        if (!left || !right || !isFullish(left) || !isFullish(right)) continue;
        const free = (px: number, py: number, pz: number) => inside(px, py, pz) && !cells.has(key(px, py, pz)) && out(px, py, pz);
        for (let yy = y; yy <= top; yy++) for (const s of [-1, 1]) {
          const px = x + s * ax + dx, pz = z + s * az + dz;
          if (free(px, yy, pz) && isFullish(name(x + s * ax, yy, z + s * az) ?? 'air'))
            set(px, yy, pz, `${shutter}_trapdoor`, { facing: face, half: yy === y ? 'bottom' : 'top', open: 'true', powered: 'false', waterlogged: 'false' });
        }
        const below = name(x, y - 1, z);
        if (below && isFullish(below) && free(x + dx, y - 1, z + dz))
          set(x + dx, y - 1, z + dz, `${trim}_stairs`, { facing: OPP[face]!, half: 'top', shape: 'straight', waterlogged: 'false' });
        break;
      }
    }
  }

  const palette: BlockState[] = [{ id: 'minecraft:air', properties: {} }], index = new Map<string, number>([[stateKey(palette[0]!), 0]]);
  const list: Cell[] = [];
  const sorted = [...cells.values()].sort((a, b) => a.position[1] - b.position[1] || a.position[2] - b.position[2] || a.position[0] - b.position[0]);
  for (const c of sorted) {
    if (c.air) { list.push({ position: c.position, kind: 'air', paletteIndex: 0 }); continue; }
    const k = stateKey(c.state);
    if (!index.has(k)) { index.set(k, palette.length); palette.push(c.state); }
    list.push({ position: c.position, kind: 'block', paletteIndex: index.get(k)! });
  }
  // Fresh arrays built here: sealed in place instead of copied (catalogue start).
  return adoptPayload({ ...payload, palette, cells: [...list, ...erased] });
}

/** A catalogue spec whose payload passes the finishing pass (material variants are derived from the refined base). */
export function refinedSpec(spec: BuildingSpec): BuildingSpec {
  const o = refineOptionsFor(spec.id, spec.facets);
  return o ? { ...spec, payload: () => refinePayload(spec.payload(), o) } : spec;
}
