import { Plot, F, axis, barrel, bed, button, candle, chest, door, facing, furnace, grass, hipRoof, hopper, lantern, lava, noise, poweredRail, rail, slab, stairs, trapdoor } from '../plot.js';
import type { H, Props } from '../plot.js';
import { chair, hangingLamp, longTable, rug, sofa, table, wallBanner } from '../furnish.js';
import { WIKI, joint } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { innerRibs } from '../facade.js';

/**
 * Bergbau & Untergrund (Katalog v3): Minen, Schächte, Hallen und Höhlen.
 * Höhlen sind als Felsbrocken modelliert, deren Innenraum explizite Luft ist;
 * Gleise folgen dem Profil `gleis_3` des Gleis-Baukastens (Schiene auf Kiesbett,
 * Anschluss in Schienenhöhe), damit Minengang und Bahnhof an das Gleisnetz passen.
 */

const STEP: Readonly<Record<H, readonly [number, number]>> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
const CW: Readonly<Record<H, H>> = { north: 'east', east: 'south', south: 'west', west: 'north' };

/** Natural rock mix (stone with andesite, tuff, gravel and some ore) by deterministic noise. */
function rock(x: number, y: number, z: number): string {
  const n = noise(x, y, z);
  return n < 0.5 ? 'stone' : n < 0.64 ? 'andesite' : n < 0.76 ? 'tuff' : n < 0.86 ? 'cobblestone' : n < 0.92 ? 'diorite' : n < 0.96 ? 'coal_ore' : n < 0.985 ? 'iron_ore' : 'copper_ore';
}
const setRock = (p: Plot, x: number, y: number, z: number) => p.set(x, y, z, rock(x, y, z));

/** Solid core under the inner rings of a `hipRoof`, so every roof layer rests on the one below. */
function roofCore(p: Plot, x0: number, x1: number, z0: number, z1: number, y: number, id: string): void {
  for (let i = 1; x0 + i <= x1 - i && z0 + i <= z1 - i; i++) p.fill(x0 + i, y + i - 1, z0 + i, x1 - i, y + i - 1, z1 - i, id);
}

/** Double chest: the `left` half's partner sits clockwise of its facing (Java `ChestBlock.getConnectedDirection`). */
function doubleChest(p: Plot, x: number, y: number, z: number, f: H): void {
  const [dx, dz] = STEP[CW[f]];
  p.set(x, y, z, 'chest', chest(f, 'left'));
  p.set(x + dx, y, z + dz, 'chest', chest(f, 'right'));
}

/**
 * Cave in a rock body: ellipsoid shell (centre c, radii r) with an inner
 * hollow where the normalised distance is below `inner`. The floor layer
 * `floorY` inside the hollow gets `floor(x, z)`, everything above is air.
 */
function cavern(p: Plot, c: readonly [number, number, number], r: readonly [number, number, number], inner: number, floorY: number,
  floor: (x: number, z: number) => readonly [string, Props?], skip?: (x: number, y: number, z: number) => boolean): void {
  const [cx, cy, cz] = c, [rx, ry, rz] = r;
  for (let x = 0; x < p.size[0]; x++) for (let z = 0; z < p.size[2]; z++) for (let y = floorY; y <= cy + ry + 1; y++) {
    const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2, wobble = (noise(x, y, z) - 0.5) * 0.14;
    if (e > 1 + wobble || (skip && skip(x, y, z))) continue;
    if (e < inner + wobble / 2) {
      if (y === floorY) { const [id, props] = floor(x, z); p.set(x, y, z, id, props ?? {}); }
      else p.air(x, y, z);
    } else setRock(p, x, y, z);
  }
}

// ------------------------------------------------------------ Mineneingang mit Förderturm
function mineneingang() {
  const p = new Plot([15, 15, 16]);
  // hill rising to the north, flat yard to the south
  for (let x = 0; x < 15; x++) for (let z = 0; z < 16; z++) {
    const h = z <= 7 ? Math.round(11 - z * 1.4 + noise(x, 0, z) * 1.4 - Math.abs(x - 7) * 0.15) : 0;
    p.set(x, 0, z, 'stone');
    for (let y = 1; y <= h; y++) p.set(x, y, z, y === h ? 'grass_block' : y >= h - 2 ? 'dirt' : rock(x, y, z), y === h ? grass() : {});
    if (h <= 0) p.set(x, 0, z, noise(x, 1, z) < 0.25 ? 'coarse_dirt' : 'grass_block', noise(x, 1, z) < 0.25 ? {} : grass());
  }
  // approach cut and tunnel (inner x6..8, 3 high), timber frames every two blocks
  for (let z = 0; z <= 7; z++) { p.fill(6, 1, z, 8, 3, z, null); if (z >= 5) p.fill(5, 4, z, 9, 5, z, null); }
  for (let z = 5; z <= 7; z++) for (const x of [5, 9]) for (let y = 1; y <= 4; y++) if (y <= 2 || z === 5) p.set(x, y, z, 'cobblestone');
  for (const z of [0, 2, 4]) {
    for (const x of [5, 9]) p.fill(x, 1, z, x, 3, z, 'spruce_log', axis('y'));
    p.fill(5, 4, z, 9, 4, z, 'spruce_log', axis('x'));
  }
  for (let x = 4; x <= 10; x++) p.set(x, 5, 5, 'spruce_stairs', stairs('north'));
  p.set(7, 3, 4, 'lantern', lantern(true)); p.set(7, 3, 0, 'lantern', lantern(true));
  // track from deep inside the hill to the yard
  for (let z = 0; z < 16; z++) { p.set(7, 0, z, 'gravel'); p.set(7, 1, z, 'rail', rail('north_south')); }
  for (const z of [6, 7]) for (const x of [6, 8]) p.set(x, 0, z, 'gravel');
  // headframe (Förderturm) over the cage
  p.ring(9, 9, 13, 13, 5, 'spruce_planks'); p.ring(9, 9, 13, 13, 7, 'spruce_fence');
  p.fill(9, 9, 9, 13, 9, 13, 'spruce_slab', slab('top'));
  for (const [x, z] of [[9, 9], [13, 9], [9, 13], [13, 13]] as const) p.fill(x, 1, z, x, 10, z, 'spruce_log', axis('y'));
  p.air(11, 9, 11);
  for (const z of [9, 13]) p.fill(11, 10, z, 11, 11, z, 'spruce_log', axis('y'));
  p.fill(11, 12, 9, 11, 12, 13, 'dark_oak_log', axis('z'));
  const wheel: readonly [number, number][] = [[2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0], [-2, -1], [-1, -2], [0, -2], [1, -2], [2, -1]];
  for (const [dx, dy] of wheel) p.set(11 + dx, 12 + dy, 11, 'stripped_dark_oak_wood', axis('z'));
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) p.set(11 + dx, 12 + dy, 11, 'dark_oak_fence');
  p.fill(11, 4, 11, 11, 9, 11, 'iron_chain', { axis: 'y', waterlogged: F });
  // cage: iron bars on three sides, open towards the track
  for (let y = 1; y <= 2; y++) for (const [x, z] of [[10, 10], [11, 10], [12, 10], [12, 11], [10, 12], [11, 12], [12, 12]] as const) p.set(x, y, z, 'iron_bars');
  p.fill(10, 3, 10, 12, 3, 12, 'iron_trapdoor', trapdoor('north', 'bottom'));
  p.fill(10, 0, 10, 12, 0, 12, 'spruce_planks');
  for (let y = 1; y <= 9; y++) p.set(13, y, 12, 'ladder', { facing: 'north', waterlogged: F });
  // ore pile and storage at the yard
  p.set(10, 1, 15, 'barrel', barrel('up')); p.set(11, 1, 15, 'chest', chest('north')); p.set(12, 1, 15, 'barrel', barrel('up'));
  p.set(9, 1, 15, 'coal_block'); p.set(4, 1, 13, 'gravel'); p.set(4, 1, 12, 'cobblestone'); p.set(3, 1, 13, 'cobblestone'); p.set(4, 2, 13, 'gravel');
  p.fill(5, 1, 10, 5, 2, 10, 'spruce_fence'); p.set(5, 3, 10, 'lantern', lantern());
  return p.payload();
}

// ------------------------------------------------------------ Minenschacht-Gang
function minengang() {
  const p = new Plot([16, 6, 5]);
  for (let x = 0; x < 16; x++) {
    for (let z = 0; z < 5; z++) p.set(x, 0, z, z === 2 ? (x % 8 === 0 ? 'redstone_block' : 'gravel') : noise(x, 0, z) < 0.35 ? 'gravel' : 'cobblestone');
    for (let y = 1; y <= 4; y++) { setRock(p, x, y, 0); setRock(p, x, y, 4); }
    for (let z = 0; z < 5; z++) setRock(p, x, 5, z);
    p.fill(x, 1, 1, x, 4, 3, null);
    p.set(x, 1, 2, x % 8 === 0 ? 'powered_rail' : 'rail', x % 8 === 0 ? poweredRail('east_west', true) : rail('east_west'));
  }
  for (const x of [3, 7, 11, 15]) {
    for (const z of [1, 3]) p.fill(x, 1, z, x, 3, z, 'spruce_fence');
    p.fill(x, 4, 1, x, 4, 3, 'spruce_planks');
    if (x !== 15) p.set(x, 3, 2, 'lantern', lantern(true));
  }
  for (const [x, z] of [[4, 1], [10, 3], [14, 1]] as const) p.set(x, 4, z, 'cobweb');
  p.set(9, 1, 1, 'barrel', barrel('up')); p.set(9, 1, 3, 'cobblestone'); p.set(9, 2, 3, 'torch');
  return p.payload();
}

// ------------------------------------------------------------ Wendeltreppen-Schacht
/** Ring around the centre column, clockwise from north, with the direction a step climbs. */
const SPIRAL: readonly (readonly [number, number, H])[] = [
  [0, -1, 'east'], [1, -1, 'south'], [1, 0, 'south'], [1, 1, 'west'], [0, 1, 'west'], [-1, 1, 'north'], [-1, 0, 'north'], [-1, -1, 'east']];
function treppenschacht() {
  const p = new Plot([9, 24, 9]);
  const c = 4, top = 17;
  p.disc(c, c, 0, 3, 'deepslate_tiles');
  p.tube(c, c, 3, 1, top - 1, 'deepslate_bricks');
  for (let y = 2; y < top; y += 4) for (const [x, z] of [[c + 3, c], [c - 3, c], [c, c + 3], [c, c - 3]] as const) if (!(y <= 2 && z === c + 3)) p.set(x, y, z, 'glowstone');
  p.fill(c, 1, c, c, top - 1, c, 'polished_deepslate');
  for (let i = 0; i < top - 1; i++) {
    const [dx, dz, f] = SPIRAL[i % 8]!;
    p.set(c + dx, i + 1, c + dz, 'deepslate_tile_stairs', stairs(f));
    if (dx === 0 || dz === 0) p.set(c + 2 * dx, i + 1, c + 2 * dz, 'deepslate_tile_stairs', stairs(f));
    else p.set(c + dx, i, c + dz, 'deepslate_tiles');
  }
  // bottom exit to the south
  p.fill(c, 1, c + 3, c, 2, c + 3, null);
  // top room: floor with the stair well open, last step flush with the floor
  p.fill(1, top, 1, 7, top, 7, 'polished_deepslate');
  for (const k of [5, 6, 7]) { const [dx, dz] = SPIRAL[k]!; p.air(c + dx, top, c + dz); if (dx === 0 || dz === 0) p.air(c + 2 * dx, top, c + 2 * dz); }
  p.set(c, top, c - 1, 'deepslate_tile_stairs', stairs('east')); p.set(c, top, c - 2, 'deepslate_tile_stairs', stairs('east'));
  p.room(1, 1, 7, 7, top + 1, top + 3, 'deepslate_bricks');
  for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]] as const) p.fill(x, top + 1, z, x, top + 3, z, 'chiseled_deepslate');
  p.fill(c, top + 1, 7, c, top + 2, 7, null); door(p, c, top + 1, 7, 'spruce', 'north');
  hipRoof(p, 0, 8, 0, 8, top + 4, 'deepslate_tile_stairs', 'deepslate_tile_slab');
  roofCore(p, 0, 8, 0, 8, top + 4, 'deepslate_tiles');
  hangingLamp(p, 5, top + 4, 5, 0);
  p.set(6, top + 1, 2, 'barrel', barrel('up')); p.set(6, top + 1, 3, 'chest', chest('west'));
  return p.payload();
}

// ------------------------------------------------------------ Zwergenhalle
function zwergenhalle() {
  const p = new Plot([15, 10, 13]);
  for (let x = 0; x < 15; x++) for (let z = 0; z < 13; z++) p.set(x, 0, z, (x + z) % 2 ? 'deepslate_tiles' : 'polished_deepslate');
  p.room(0, 0, 14, 12, 1, 6, 'deepslate_bricks');
  p.fill(0, 7, 0, 14, 7, 12, 'deepslate_tiles');
  // vaulted edge: upside-down stairs against the walls
  for (let x = 1; x <= 13; x++) { p.set(x, 6, 1, 'deepslate_brick_stairs', stairs('north', 'top')); p.set(x, 6, 11, 'deepslate_brick_stairs', stairs('south', 'top')); }
  for (let z = 2; z <= 10; z++) { p.set(1, 6, z, 'deepslate_brick_stairs', stairs('west', 'top')); p.set(13, 6, z, 'deepslate_brick_stairs', stairs('east', 'top')); }
  // four pillars with gold bands and stair capitals
  for (const [x, z] of [[3, 4], [11, 4], [3, 8], [11, 8]] as const) {
    p.set(x, 1, z, 'chiseled_deepslate'); p.fill(x, 2, z, x, 5, z, 'polished_deepslate'); p.set(x, 3, z, 'gold_block'); p.set(x, 6, z, 'chiseled_deepslate');
    for (const f of ['north', 'east', 'south', 'west'] as const) { const [dx, dz] = STEP[f]; p.set(x + dx, 6, z + dz, 'deepslate_brick_stairs', stairs(f === 'north' ? 'south' : f === 'south' ? 'north' : f === 'east' ? 'west' : 'east', 'top')); }
  }
  // forge: lava hearth behind bars, two blast furnaces, hood and chimney
  p.fill(6, 0, 1, 8, 0, 1, 'lava', lava()); p.fill(6, 1, 1, 8, 2, 1, null);
  p.fill(6, 1, 2, 8, 1, 2, 'iron_bars');
  p.set(5, 1, 1, 'blast_furnace', furnace('south', true)); p.set(9, 1, 1, 'blast_furnace', furnace('south', true));
  p.fill(5, 2, 1, 5, 2, 1, 'deepslate_bricks'); p.fill(9, 2, 1, 9, 2, 1, 'deepslate_bricks');
  for (let x = 5; x <= 9; x++) p.set(x, 3, 2, 'deepslate_brick_stairs', stairs('north', 'top'));
  p.fill(5, 3, 1, 9, 6, 1, 'deepslate_bricks'); p.fill(6, 4, 2, 8, 6, 2, 'deepslate_bricks');
  p.fill(6, 8, 1, 8, 9, 1, 'deepslate_bricks'); p.set(7, 9, 1, 'deepslate_brick_wall');
  // smithing corner
  p.set(4, 1, 2, 'anvil', facing('east')); p.set(10, 1, 1, 'smithing_table'); p.set(11, 1, 1, 'grindstone', { face: 'floor', facing: 'south' });
  p.set(12, 1, 1, 'cauldron'); p.set(2, 1, 1, 'barrel', barrel('up')); p.set(1, 1, 1, 'crafting_table');
  for (const x of [3, 11]) p.set(x, 4, 1, 'red_wall_banner', wallBanner('south'));
  // feast table with stools
  longTable(p, 5, 8, 9, 8, 1, 'spruce_slab');
  for (let x = 5; x <= 9; x++) { chair(p, x, 1, 7, 'spruce', 'north'); chair(p, x, 1, 9, 'spruce', 'south'); }
  p.set(5, 2, 8, 'candle', candle(3, true)); p.set(9, 2, 8, 'candle', candle(3, true)); p.set(7, 2, 8, 'barrel', barrel('up'));
  // ale barrels and chests
  for (let z = 6; z <= 10; z++) { p.set(13, 1, z, 'barrel', barrel('west')); if (z % 2 === 0) p.set(13, 2, z, 'barrel', barrel('west')); }
  doubleChest(p, 1, 1, 6, 'east'); doubleChest(p, 1, 1, 9, 'east');
  p.set(1, 1, 8, 'barrel', barrel('east')); p.set(1, 2, 8, 'lantern', lantern());
  // entrance arch to the south
  p.fill(6, 1, 12, 8, 3, 12, null);
  for (const x of [5, 9]) p.fill(x, 1, 12, x, 4, 12, 'chiseled_deepslate');
  p.fill(6, 4, 12, 8, 4, 12, 'polished_deepslate');
  for (const [x, z] of [[5, 5], [9, 5], [7, 10]] as const) hangingLamp(p, x, 7, z, 2);
  // wall ribs under the vault stairs: polished pilasters on chiseled feet
  innerRibs(p, 0, 0, 14, 12, 1, 5, 'polished_deepslate', 3, 'chiseled_deepslate');
  return p.payload();
}

// ------------------------------------------------------------ Höhlenbasis
function hoehlenbasis() {
  const p = new Plot([15, 8, 13]);
  cavern(p, [7, 1, 6], [7.4, 5, 6.4], 0.62, 0, (x, z) => (x + z) % 3 === 0 ? ['stripped_spruce_wood', axis('x')] : ['spruce_planks']);
  // front: porch cut and a timber facade with door and windows
  for (let z = 11; z <= 12; z++) { p.fill(4, 1, z, 10, 4, z, null); for (let x = 4; x <= 10; x++) p.set(x, 0, z, noise(x, 0, z) < 0.5 ? 'moss_block' : 'coarse_dirt'); }
  p.fill(4, 1, 10, 10, 4, 10, 'spruce_planks');
  for (const x of [4, 10]) p.fill(x, 1, 10, x, 4, 10, 'spruce_log', axis('y'));
  p.fill(5, 4, 10, 9, 4, 10, 'spruce_log', axis('x'));
  for (let x = 3; x <= 11; x++) p.set(x, 5, 11, 'spruce_stairs', stairs('north'));
  p.fill(3, 5, 10, 11, 5, 10, 'spruce_planks');
  p.fill(7, 1, 10, 7, 2, 10, null); door(p, 7, 1, 10, 'spruce', 'north');
  for (const x of [5, 9]) p.set(x, 2, 10, 'glass_pane');
  for (const x of [4, 10]) { p.set(x, 1, 11, 'barrel', barrel('up')); }
  p.set(10, 2, 11, 'lantern', lantern());
  // furnishing
  bed(p, 3, 1, 6, 'brown', 'north'); p.set(4, 1, 5, 'barrel', barrel('up')); p.set(4, 2, 5, 'lantern', lantern());
  doubleChest(p, 6, 1, 3, 'south'); p.set(4, 1, 3, 'barrel', barrel('south'));
  p.set(8, 1, 3, 'crafting_table'); p.set(9, 1, 3, 'furnace', furnace('south', true)); p.set(10, 1, 3, 'smoker', furnace('south'));
  table(p, 7, 1, 6, 'spruce'); chair(p, 6, 1, 6, 'spruce', 'west'); chair(p, 8, 1, 6, 'spruce', 'east');
  rug(p, 6, 7, 8, 8, 1, 'brown', 'orange');
  p.set(11, 1, 6, 'barrel', barrel('up')); p.set(11, 1, 7, 'composter'); p.set(11, 1, 8, 'potted_azalea_bush');
  p.set(5, 1, 8, 'stonecutter', facing('east'));
  p.set(7, 5, 6, 'stone'); p.set(7, 4, 6, 'iron_chain', { axis: 'y', waterlogged: F }); p.set(7, 3, 6, 'lantern', lantern(true));
  p.set(4, 5, 4, 'glowstone'); p.set(10, 5, 4, 'glowstone');
  return p.payload();
}

// ------------------------------------------------------------ Amethyst-Grotte
function amethystgrotte() {
  const p = new Plot([15, 13, 15]);
  const c = [7, 5, 7] as const;
  const layer = (x: number, y: number, z: number) => Math.sqrt((x - c[0]) ** 2 + ((y - c[1]) * 1.1) ** 2 + (z - c[2]) ** 2) + (noise(x, y, z) - 0.5) * 0.6;
  for (let x = 0; x < 15; x++) for (let y = 0; y < 13; y++) for (let z = 0; z < 15; z++) {
    const d = layer(x, y, z);
    if (d > 7.2) continue;
    if (d > 6.2) p.set(x, y, z, 'smooth_basalt');
    else if (d > 5.2) p.set(x, y, z, 'calcite');
    else if (d > 4.3 || y <= 2) p.set(x, y, z, 'amethyst_block');
    else p.air(x, y, z);
  }
  // wide mouth to the south with a calcite path
  for (let z = 10; z < 15; z++) for (let x = 5; x <= 9; x++) for (let y = 3; y <= 6; y++) if (!(y === 6 && (x === 5 || x === 9))) p.air(x, y, z);
  for (let z = 9; z <= 12; z++) for (let x = 6; x <= 8; x++) p.set(x, 2, z, 'calcite');
  for (let z = 10; z <= 12; z++) for (const x of [5, 9]) p.set(x, 2, z, 'smooth_basalt');
  // crystals grow from amethyst blocks into the hollow
  const dirs: readonly [number, number, number, string][] = [[0, -1, 0, 'up'], [0, 1, 0, 'down'], [1, 0, 0, 'west'], [-1, 0, 0, 'east'], [0, 0, 1, 'north'], [0, 0, -1, 'south']];
  for (let x = 1; x < 14; x++) for (let y = 3; y < 12; y++) for (let z = 1; z < 10; z++) {
    if (!p.has(x, y, z) || p.get(x, y, z) || (x >= 6 && x <= 8 && y === 3)) continue;
    const n = noise(x, y * 7, z);
    if (n < 0.62) continue;
    const hit = dirs.find(([dx, dy, dz]) => p.get(x + dx, y + dy, z + dz)?.id === 'minecraft:amethyst_block');
    if (hit) p.set(x, y, z, 'amethyst_cluster', { facing: hit[3], waterlogged: F });
  }
  p.set(7, 3, 4, 'calcite'); p.set(7, 4, 4, 'amethyst_cluster', { facing: 'up', waterlogged: F });
  return p.payload();
}

// ------------------------------------------------------------ Erzgießerei
function erzgiesserei() {
  const p = new Plot([13, 12, 10]);
  p.fill(0, 0, 0, 12, 0, 9, 'polished_andesite');
  p.room(0, 0, 12, 9, 1, 6, 'stone_bricks');
  for (const x of [0, 4, 8, 12]) for (const z of [0, 9]) p.fill(x, 1, z, x, 6, z, 'polished_deepslate');
  p.fill(0, 7, 0, 12, 7, 9, 'deepslate_tiles');
  // furnace line: ore chest → hopper → blast furnace → hopper → collector chest in the floor
  p.fill(1, 1, 1, 11, 4, 1, 'bricks');
  for (const x of [2, 4, 6, 8, 10]) {
    p.set(x, 0, 1, 'chest', chest('south')); p.set(x, 1, 1, 'hopper', hopper('down'));
    p.set(x, 2, 1, 'blast_furnace', furnace('south', true)); p.set(x, 3, 1, 'hopper', hopper('down'));
    p.set(x, 4, 1, 'chest', chest('south')); p.air(x, 5, 1);
  }
  for (let x = 1; x <= 11; x++) if (x % 2) p.set(x, 5, 1, 'brick_slab', slab());
  for (const x of [2, 6, 10]) { p.fill(x, 7, 1, x, 9, 1, 'bricks'); p.set(x, 10, 1, 'campfire', { facing: 'south', lit: 'true', signal_fire: F, waterlogged: F }); }
  // casting basin with lava, fenced with bars
  p.fill(5, 0, 5, 7, 0, 6, 'lava', lava());
  p.ring(4, 4, 8, 7, 1, 'iron_bars');
  p.set(9, 1, 5, 'cauldron'); p.set(3, 1, 6, 'anvil', facing('north'));
  // metal stock and workbench
  p.set(11, 1, 7, 'iron_block'); p.set(11, 2, 7, 'iron_block'); p.set(11, 1, 8, 'copper_block'); p.set(10, 1, 8, 'gold_block');
  p.set(1, 1, 8, 'crafting_table'); p.set(1, 1, 7, 'smithing_table'); p.set(1, 1, 6, 'barrel', barrel('east')); p.set(1, 2, 6, 'barrel', barrel('east'));
  p.set(11, 1, 4, 'coal_block'); p.set(11, 1, 3, 'coal_block'); p.set(11, 2, 3, 'coal_block');
  p.fill(6, 1, 9, 6, 2, 9, null); door(p, 6, 1, 9, 'spruce', 'north');
  for (const x of [3, 9]) hangingLamp(p, x, 7, 3, 1);
  hangingLamp(p, 6, 7, 8, 1);
  // inner ribs in line with the outer posts, a crown of upside-down stairs over the side walls
  innerRibs(p, 0, 0, 12, 9, 1, 6, 'polished_deepslate', 4, 'chiseled_stone_bricks');
  for (let z = 2; z <= 7; z++) for (const [x, f] of [[1, 'west'], [11, 'east']] as const) if (!p.get(x, 6, z)) p.set(x, 6, z, 'stone_brick_stairs', stairs(f, 'top'));
  return p.payload();
}

// ------------------------------------------------------------ Pilzhöhle
const MUSH = { down: 'true', east: 'true', north: 'true', south: 'true', up: 'true', west: 'true' };
function pilzhoehle() {
  const p = new Plot([17, 11, 15]);
  cavern(p, [8, 1, 7], [8.4, 8, 7.4], 0.7, 0, (x, z) => noise(x, 2, z) < 0.18 ? ['podzol', grass()] : ['mycelium', grass()], (_x, y, z) => y >= 1 && z >= 11);
  // small red giant mushroom: dome cap
  p.fill(5, 1, 6, 5, 3, 6, 'mushroom_stem', MUSH);
  for (let x = 4; x <= 6; x++) for (let z = 5; z <= 7; z++) p.set(x, 5, z, 'red_mushroom_block', MUSH);
  p.set(5, 4, 6, 'mushroom_stem', MUSH);
  for (let x = 3; x <= 7; x++) for (let z = 4; z <= 8; z++) if (!((x === 3 || x === 7) && (z === 4 || z === 8))) {
    if (x === 3 || x === 7 || z === 4 || z === 8) p.set(x, 3, z, 'red_mushroom_block', MUSH);
    if (x !== 5 || z !== 6) p.set(x, 4, z, 'red_mushroom_block', MUSH);
  }
  for (let x = 4; x <= 6; x++) for (let z = 5; z <= 7; z++) if (x !== 5 || z !== 6) p.air(x, 3, z);
  // small brown giant mushroom: flat cap
  p.fill(11, 1, 8, 11, 4, 8, 'mushroom_stem', MUSH);
  for (let x = 9; x <= 13; x++) for (let z = 6; z <= 10; z++) if (Math.abs(x - 11) + Math.abs(z - 8) <= 3) p.set(x, 5, z, 'brown_mushroom_block', MUSH);
  // small mushrooms on the mycelium
  for (let x = 1; x < 16; x++) for (let z = 1; z < 14; z++) {
    if (p.get(x, 0, z)?.id !== 'minecraft:mycelium' || p.get(x, 1, z)) continue;
    const n = noise(x, 3, z);
    if (n > 0.8) p.set(x, 1, z, n > 0.9 ? 'red_mushroom' : 'brown_mushroom');
  }
  p.set(8, 9, 7, 'stone'); hangingLamp(p, 8, 9, 7, 2);
  p.set(14, 1, 9, 'cobblestone'); p.set(14, 2, 9, 'lantern', lantern());
  return p.payload();
}

// ------------------------------------------------------------ Untergrund-Bahnhof
function untergrundBahnhof() {
  const p = new Plot([16, 8, 11]);
  p.fill(0, 0, 0, 15, 0, 10, 'stone_bricks');
  for (const z of [0, 10]) { p.fill(0, 1, z, 15, 5, z, 'stone_bricks'); for (const x of [0, 5, 10, 15]) p.fill(x, 1, z, x, 5, z, 'chiseled_stone_bricks'); }
  p.fill(0, 6, 0, 15, 6, 10, 'stone_bricks');
  for (let x = 0; x < 16; x++) {
    p.fill(x, 1, 1, x, 5, 9, null);
    p.set(x, 5, 1, 'stone_brick_stairs', stairs('north', 'top')); p.set(x, 5, 9, 'stone_brick_stairs', stairs('south', 'top'));
    for (const z of [1, 9]) {
      const brake = x === 7;
      p.set(x, 0, z, brake ? 'stone_bricks' : 'gravel');
      p.set(x, 1, z, brake ? 'powered_rail' : 'rail', brake ? poweredRail('east_west', false) : rail('east_west'));
    }
    for (let z = 2; z <= 8; z++) p.set(x, 1, z, z === 2 || z === 8 ? 'smooth_stone' : 'polished_andesite');
  }
  // start buttons next to the brake rails
  p.set(7, 2, 2, 'stone_button', button('north', 'floor')); p.set(7, 2, 8, 'stone_button', button('south', 'floor'));
  // pillars along the platform axis and hanging lamps
  for (const x of [2, 7, 12]) { p.set(x, 2, 5, 'chiseled_stone_bricks'); p.fill(x, 3, 5, x, 5, 5, 'stone_bricks'); p.set(x, 5, 4, 'stone_brick_stairs', stairs('south', 'top')); p.set(x, 5, 6, 'stone_brick_stairs', stairs('north', 'top')); }
  for (const x of [4, 10]) hangingLamp(p, x, 6, 5, 1);
  // benches back to back, timetable barrels
  for (const x of [5, 10]) { sofa(p, x, 2, 4, 'spruce', 'south', 2); sofa(p, x - 1, 2, 6, 'spruce', 'north', 2); }
  p.set(14, 2, 5, 'barrel', barrel('up')); p.set(1, 2, 5, 'barrel', barrel('up'));
  for (const x of [1, 14]) p.set(x, 3, 5, 'lantern', lantern());
  return p.payload();
}

// ------------------------------------------------------------ Bergbau-Lager
function bergbauLager() {
  const p = new Plot([13, 7, 9]);
  p.fill(0, 0, 0, 12, 0, 8, 'spruce_planks');
  p.room(0, 0, 12, 8, 1, 4, 'cobbled_deepslate');
  for (const x of [0, 4, 8, 12]) for (const z of [0, 8]) p.fill(x, 1, z, x, 4, z, 'spruce_log', axis('y'));
  p.fill(0, 5, 0, 12, 5, 8, 'spruce_planks');
  for (const x of [4, 8]) p.fill(x, 5, 0, x, 5, 8, 'spruce_log', axis('z'));
  // chest wall: five double chests, three high
  for (let y = 1; y <= 3; y++) for (const x of [2, 4, 6, 8, 10]) doubleChest(p, x, y, 1, 'south');
  // shelf of barrels and ore blocks on the west wall
  for (let z = 3; z <= 6; z++) { p.set(1, 1, z, 'barrel', barrel('east')); p.set(1, 2, z, 'barrel', barrel('east')); p.set(1, 3, z, 'spruce_trapdoor', trapdoor('east', 'bottom', false)); }
  // minecart unloader: rail from the east wall onto a hopper that fills the floor chest
  p.fill(12, 1, 6, 12, 2, 6, null);
  for (let x = 8; x <= 12; x++) p.set(x, 1, 6, 'rail', rail('east_west'));
  for (let x = 9; x <= 12; x++) p.set(x, 0, 6, 'gravel');
  p.set(8, 0, 6, 'hopper', hopper('west')); p.set(7, 0, 6, 'chest', chest('east'));
  p.set(7, 1, 5, 'spruce_fence'); p.set(7, 2, 5, 'lantern', lantern());
  // workstations
  p.set(11, 1, 3, 'crafting_table'); p.set(11, 1, 4, 'furnace', furnace('west')); p.set(11, 1, 2, 'stonecutter', facing('west'));
  p.set(10, 1, 4, 'blast_furnace', furnace('north'));
  table(p, 5, 1, 5, 'spruce'); chair(p, 4, 1, 5, 'spruce', 'west');
  // front with door and barred windows
  p.fill(6, 1, 8, 6, 2, 8, null); door(p, 6, 1, 8, 'spruce', 'north');
  for (const x of [2, 3, 9, 10]) p.fill(x, 2, 8, x, 3, 8, 'iron_bars');
  for (const x of [3, 9]) hangingLamp(p, x, 5, 4, 0);
  // timber ribs under the ceiling beams, with knee braces against the planks
  innerRibs(p, 0, 0, 12, 8, 1, 4, 'spruce_log', 4, null, axis('y'));
  for (const x of [4, 8]) for (const [z, f] of [[1, 'north'], [7, 'south']] as const) for (const dx of [-1, 1]) if (!p.get(x + dx, 4, z)) p.set(x + dx, 4, z, 'spruce_stairs', stairs(f, 'top'));
  return p.payload();
}

const RAIL_JOINT = 'rail_joint', GLEIS = 'gleis_3';

export const UNTERGRUND_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_untergrund_mineneingang', name: 'Mineneingang mit Förderturm', payload: mineneingang, tags: ['mine', 'förderturm', 'hang'],
    description: 'Holzverbauter Stolleneingang im Hang mit Gleis bis in den Hof, daneben ein Förderturm mit Seilrad, Kette und Förderkorb.',
    facets: { kategorie: ['unterwelt'], stil: ['rustikal', 'industriell'], biom: ['gebirge', 'hoehle'], funktion: ['bergbau', 'transport'] },
    tips: ['Den Stollen auf Höhe Y = -59 weitergraben: dort liegen die meisten Diamanten.'], inspiration: [WIKI('Ore', 'Erze')] },
  { id: 'bld_untergrund_minengang', name: 'Minenschacht-Gang', payload: minengang, tags: ['stollen', 'schiene', 'kettenbar'],
    description: '16 Blöcke Stollen mit Holzstützen alle vier Blöcke, hängenden Laternen und Gleis im Raster des Gleis-Baukastens.',
    facets: { kategorie: ['unterwelt'], stil: ['rustikal'], biom: ['hoehle'], funktion: ['bergbau', 'transport', 'verbindung'] },
    connectors: [joint('west', [0, 1, 2], [-1, 0, 0], RAIL_JOINT, GLEIS), joint('east', [16, 1, 2], [1, 0, 0], RAIL_JOINT, GLEIS)],
    tips: ['Antriebsschiene alle 8 Blöcke auf einem Redstone-Block – passt nahtlos an das gerade Gleis.', 'Lichtlevel über 0 halten, damit im Stollen keine Monster spawnen.'],
    inspiration: [WIKI('Mineshaft', 'Mineshaft')] },
  { id: 'bld_untergrund_treppenschacht', name: 'Wendeltreppen-Schacht', payload: treppenschacht, tags: ['wendeltreppe', 'schacht', 'tiefschiefer'],
    description: 'Runder Tiefschieferschacht mit zweibreiter Wendeltreppe um eine Mittelsäule, 16 Stufen hinab, mit Torhaus und Leuchtsteinen in der Wand.',
    facets: { kategorie: ['unterwelt'], stil: ['zwergisch', 'mittelalterlich'], biom: ['hoehle', 'gebirge'], funktion: ['verbindung', 'bergbau'] },
    tips: ['Mehrere Module übereinander setzen: jede volle Umdrehung gewinnt 8 Blöcke Tiefe.'] },
  { id: 'bld_untergrund_zwergenhalle', name: 'Zwergenhalle', payload: zwergenhalle, tags: ['halle', 'schmiede', 'festtafel'],
    description: 'Gewölbte Tiefschieferhalle mit Goldband-Säulen, Lava-Esse zwischen zwei Hochöfen, Amboss, Festtafel mit Hockern und Bierfässern.',
    facets: { kategorie: ['unterwelt'], stil: ['zwergisch', 'fantasy'], biom: ['hoehle', 'gebirge'], funktion: ['versammlung', 'handwerk', 'schmelzen'] },
    gaps: ['minecraft:lava'], tips: ['Lava hinter Eisengittern leuchtet, ohne dass Gegenstände hineinfallen.'] },
  { id: 'bld_untergrund_hoehlenbasis', name: 'Höhlenbasis', payload: hoehlenbasis, tags: ['höhle', 'versteck', 'starter'],
    description: 'Ausgebaute Felshöhle hinter einer Holzfront mit Bett, Doppeltruhe, Werkbank, Ofen, Räucherofen, Tisch und Hängelaterne.',
    facets: { kategorie: ['basis'], stil: ['rustikal'], biom: ['hoehle', 'gebirge'], funktion: ['wohnen', 'lagern', 'einrichtung'] },
    tips: ['Eine Höhle in einer Felswand ist die schnellste sichere erste Nacht: nur die Front schließen.'] },
  { id: 'bld_untergrund_amethystgrotte', name: 'Amethyst-Grotte', payload: amethystgrotte, tags: ['amethyst', 'geode', 'kristall'],
    description: 'Begehbare Geode mit Schalen aus glattem Basalt, Kalzit und Amethyst, Kristallen an Boden, Wand und Decke und einem Kalzitweg hinein.',
    facets: { kategorie: ['landschaft'], stil: ['fantasy'], biom: ['hoehle'], funktion: ['deko'] },
    tips: ['Kristalle wachsen nur auf knospendem Amethyst, der sich nicht abbauen lässt – diese Grotte ist reine Deko.'],
    inspiration: [WIKI('Amethyst_Geode', 'Amethystgeode')] },
  { id: 'bld_untergrund_erzgiesserei', name: 'Erzgießerei', payload: erzgiesserei, tags: ['hochofen', 'trichter', 'gießerei'],
    description: 'Ziegelhalle mit fünf Hochöfen, die per Trichter aus Erztruhen gespeist werden und in Bodentruhen ausgeben, dazu Lava-Gießbecken und Metalllager.',
    facets: { kategorie: ['unterwelt'], stil: ['industriell', 'zwergisch'], biom: ['hoehle'], funktion: ['schmelzen', 'bergbau'] },
    gaps: ['minecraft:lava'], tips: ['Hochöfen schmelzen Erz doppelt so schnell wie Öfen, aber nur Erze und Metall.'],
    inspiration: [WIKI('Blast_Furnace', 'Hochofen')] },
  { id: 'bld_untergrund_pilzhoehle', name: 'Pilzhöhle', payload: pilzhoehle, tags: ['myzel', 'riesenpilz', 'höhle'],
    description: 'Offene Höhle mit Myzel- und Podsolboden, je einem kleinen roten und braunen Riesenpilz und verstreuten Pilzen.',
    facets: { kategorie: ['landschaft'], stil: ['fantasy'], biom: ['hoehle', 'pilzinsel'], funktion: ['deko', 'landwirtschaft'] },
    tips: ['Pilze wachsen auf Myzel und Podsol bei jedem Licht, sonst nur im Dunkeln.'], inspiration: [WIKI('Mycelium', 'Myzel')] },
  { id: 'bld_untergrund_bahnhof', name: 'Untergrund-Bahnhof', payload: untergrundBahnhof, tags: ['bahnhof', 'gewölbe', 'lore'],
    description: 'Gewölbte Station mit zwei Gleisen, Mittelbahnsteig, Säulen, Bänken, Hängelaternen und Bremsschienen mit Startknopf.',
    facets: { kategorie: ['infrastruktur'], stil: ['industriell', 'klassisch'], biom: ['hoehle'], funktion: ['transport', 'versammlung'] },
    connectors: [joint('west_nord', [0, 1, 1], [-1, 0, 0], RAIL_JOINT, GLEIS), joint('ost_nord', [16, 1, 1], [1, 0, 0], RAIL_JOINT, GLEIS),
      joint('west_sued', [0, 1, 9], [-1, 0, 0], RAIL_JOINT, GLEIS), joint('ost_sued', [16, 1, 9], [1, 0, 0], RAIL_JOINT, GLEIS)],
    tips: ['Eine ungespeiste Antriebsschiene bremst die Lore; der Knopf daneben schickt sie wieder los.'], inspiration: [WIKI('Powered_Rail', 'Antriebsschiene')] },
  { id: 'bld_untergrund_lager', name: 'Bergbau-Lager', payload: bergbauLager, tags: ['truhenwand', 'lager', 'entlader'],
    description: 'Lagerraum mit Wand aus 15 Doppeltruhen, Fassregal, Werkplätzen und einer Gleiseinfahrt, deren Trichter Loren in eine Bodentruhe entlädt.',
    facets: { kategorie: ['unterwelt'], stil: ['rustikal', 'zwergisch'], biom: ['hoehle'], funktion: ['lagern', 'bergbau'] },
    connectors: [joint('ost', [13, 1, 6], [1, 0, 0], RAIL_JOINT, GLEIS)],
    tips: ['Eine Trichterlore über einem Trichter wird automatisch geleert.'], inspiration: [WIKI('Minecart_with_Hopper', 'Trichterlore')] },
];
