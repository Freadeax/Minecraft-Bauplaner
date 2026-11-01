import { Plot, axis, facing, barrel, chest, door, furnace, gableRoof, gableRoofX, hipRoof, ladder, lampPost, lantern, palmTree, rod, slab, stairs, trapdoor, water, chain, candle, F, T } from '../plot.js';
import type { H, Props } from '../plot.js';
import { pot, bell, cocoa, hangingLamp, table, wallBanner } from '../furnish.js';
import { PATH_PROFILE, WIKI, joint } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/**
 * Küste & Hafen (Katalog v3): Bauten am und im Wasser – Bootshaus, Werft,
 * Seebrücke, Strandbar, Rettungsturm, Fischmarkt, Boje, Hafenspeicher und
 * ein Glastunnel unter Wasser. y 0 ist jeweils der Meeresgrund bzw. Strand.
 */

const pane = { east: F, north: F, south: F, waterlogged: F, west: F };
const water3 = { level: '3' };
const scaffold = (distance: number): Props => ({ bottom: distance > 0 ? T : F, distance: String(distance), waterlogged: F });

/** Copies the roof surface (stairs and slabs) of row z = `from` to row z = `to`: a gable overhang. */
function overhangZ(p: Plot, from: number, to: number, x0: number, x1: number, y0: number, y1: number): void {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const s = p.get(x, y, from);
    if (s && /_(stairs|slab)$/.test(s.id)) p.set(x, y, to, s.id.slice(10), s.properties);
  }
}
/** Same along x. */
function overhangX(p: Plot, from: number, to: number, z0: number, z1: number, y0: number, y1: number): void {
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) {
    const s = p.get(from, y, z);
    if (s && /_(stairs|slab)$/.test(s.id)) p.set(to, y, z, s.id.slice(10), s.properties);
  }
}
/** Sunshade: fence pole, wool canopy with a carpet on top and wall banners hanging on all four sides. */
function sunshade(p: Plot, x: number, z: number, color: string): void {
  p.fill(x, 1, z, x, 3, z, 'bamboo_fence');
  p.set(x, 4, z, `${color}_wool`); p.set(x, 5, z, `${color}_carpet`);
  for (const [dx, dz, f] of [[1, 0, 'east'], [-1, 0, 'west'], [0, 1, 'south'], [0, -1, 'north']] as const) p.set(x + dx, 4, z + dz, `${color}_wall_banner`, wallBanner(f));
}
/** Beach lounger: stair head rest plus slab, head towards `head`. */
function lounger(p: Plot, x: number, z: number, head: H, wood = 'birch'): void {
  const [dx, dz] = head === 'north' ? [0, 1] : head === 'south' ? [0, -1] : head === 'east' ? [-1, 0] : [1, 0];
  p.set(x, 1, z, `${wood}_stairs`, stairs(head)); p.set(x + dx, 1, z + dz, `${wood}_slab`, slab());
}

// ------------------------------------------------------------ Bootshaus
function bootshaus() {
  const p = new Plot([13, 13, 16]);
  p.fill(1, 0, 0, 11, 0, 15, 'stone_bricks'); p.fill(4, 0, 3, 8, 0, 15, 'sand');
  p.fill(1, 1, 0, 11, 1, 15, 'spruce_planks'); p.fill(4, 1, 3, 8, 1, 15, 'water', water());
  for (let z = 3; z <= 15; z++) for (const x of [3, 9]) p.set(x, 1, z, 'stripped_spruce_log', axis('z'));
  p.room(1, 1, 11, 14, 2, 5, 'spruce_planks');
  for (let x = 2; x <= 10; x++) for (const z of [1, 14]) p.set(x, 5, z, 'stripped_spruce_log', axis('x'));
  for (let z = 2; z <= 13; z++) for (const x of [1, 11]) p.set(x, 5, z, 'stripped_spruce_log', axis('z'));
  for (const z of [1, 5, 10, 14]) for (const x of [1, 11]) p.fill(x, 2, z, x, 5, z, 'spruce_log', axis('y'));
  // boat gate to the water (south) and land door (north)
  p.fill(4, 2, 14, 8, 4, 14, null);
  for (const x of [3, 9]) p.fill(x, 2, 14, x, 4, 14, 'spruce_log', axis('y'));
  door(p, 6, 2, 1, 'spruce', 'south');
  for (const z of [3, 7, 12]) for (const x of [1, 11]) p.set(x, 3, z, 'glass_pane', pane);
  gableRoof(p, 0, 12, 1, 14, 6, 'dark_oak_stairs', 'spruce_planks', 'dark_oak_slab');
  overhangZ(p, 1, 0, 0, 12, 6, 12); overhangZ(p, 14, 15, 0, 12, 6, 12);
  p.set(6, 8, 1, 'glass_pane', pane); p.set(6, 8, 14, 'glass_pane', pane);
  // tie beams with lamps over the walkways
  for (const z of [5, 10]) { p.fill(1, 6, z, 11, 6, z, 'stripped_spruce_log', axis('x')); p.set(2, 5, z, 'lantern', lantern(true)); p.set(10, 5, z, 'lantern', lantern(true)); }
  // mooring posts along the basin
  for (const z of [7, 12]) for (const x of [3, 9]) p.set(x, 2, z, 'spruce_fence');
  // storage and work place
  p.set(2, 2, 2, 'barrel', barrel('up')); p.set(10, 2, 2, 'crafting_table');
  p.set(2, 2, 9, 'loom', { facing: 'east' }); p.set(10, 2, 8, 'chest', chest('west'));
  p.set(2, 2, 13, 'chest', chest('east')); p.set(10, 2, 13, 'barrel', barrel('west')); p.set(10, 3, 13, 'barrel', barrel('up'));
  // porch lights and slip lights
  for (const x of [3, 9]) { p.set(x, 2, 0, 'spruce_fence'); p.set(x, 3, 0, 'lantern', lantern()); }
  for (const x of [1, 11]) { p.set(x, 2, 15, 'spruce_fence'); p.set(x, 3, 15, 'lantern', lantern()); }
  return p.payload();
}

// ------------------------------------------------------------ Werft mit Trockendock
function werft() {
  const p = new Plot([24, 10, 13]);
  const quay = (x0: number, z0: number, x1: number, z1: number) => { p.fill(x0, 0, z0, x1, 2, z1, 'cobblestone'); p.fill(x0, 3, z0, x1, 3, z1, 'stone_bricks'); };
  quay(0, 0, 3, 12); quay(4, 0, 23, 1); quay(4, 11, 23, 12);
  // dry dock: floor, stepped side walls, explicit air
  p.fill(4, 0, 2, 20, 0, 10, 'stone_bricks'); p.fill(4, 1, 2, 20, 3, 10, null);
  for (let x = 4; x <= 20; x++) { p.set(x, 1, 2, 'stone_brick_stairs', stairs('north')); p.set(x, 1, 10, 'stone_brick_stairs', stairs('south')); }
  // dock gate and the sea behind it
  p.fill(21, 0, 2, 21, 0, 10, 'stone_bricks'); p.fill(21, 1, 2, 21, 3, 10, 'spruce_planks');
  for (const z of [2, 6, 10]) p.fill(21, 1, z, 21, 3, z, 'spruce_log', axis('y'));
  p.fill(21, 4, 2, 21, 4, 10, 'spruce_slab', slab());
  p.fill(22, 0, 2, 23, 0, 10, 'sand'); p.fill(22, 1, 2, 23, 3, 10, 'water', water());
  // half finished hull: planked bow, open ribs aft
  const rows = [1, 2, 3, 3, 3];
  for (let x = 6; x <= 18; x++) {
    const hw = x === 6 ? 1 : x === 7 ? 2 : 3, planked = x <= 12, rib = !planked && x % 2 === 1;
    for (let y = 2; y <= 6; y++) {
      const r = Math.min(hw, rows[y - 2]!);
      if (y === 2) { if (planked || rib) p.fill(x, 2, 6 - r, x, 2, 6 + r, 'dark_oak_planks'); continue; }
      if (y > 3 && x === 6) continue;
      if (planked) { p.set(x, y, 6 - r, 'dark_oak_planks'); p.set(x, y, 6 + r, 'dark_oak_planks'); if (x === 6) p.fill(x, y, 6 - r, x, y, 6 + r, 'dark_oak_planks'); }
      else if (rib) { p.set(x, y, 6 - r, 'spruce_fence'); p.set(x, y, 6 + r, 'spruce_fence'); }
    }
    p.set(x, 2, 6, 'dark_oak_log', axis('x'));
  }
  p.set(5, 3, 6, 'dark_oak_stairs', stairs('east')); p.set(5, 4, 6, 'dark_oak_fence');
  for (const x of [8, 11]) p.fill(x, 6, 4, x, 6, 8, 'stripped_dark_oak_log', axis('z'));
  // keel blocks and shores
  for (const x of [7, 10, 13, 16]) p.set(x, 1, 6, 'spruce_planks');
  for (const x of [8, 11, 15]) { p.fill(x, 1, 3, x, 3, 3, 'spruce_fence'); p.fill(x, 1, 9, x, 3, 9, 'spruce_fence'); }
  // scaffolding at the bow and a ladder down into the dock
  for (const z of [4, 8]) p.fill(4, 1, z, 4, 6, z, 'scaffolding', scaffold(0));
  for (const z of [5, 6, 7]) p.set(4, 6, z, 'scaffolding', scaffold(Math.min(z - 4, 8 - z)));
  p.fill(4, 1, 6, 4, 3, 6, 'ladder', ladder('east'));
  // workshop shed on the west quay
  p.fill(0, 4, 1, 0, 6, 11, 'spruce_planks'); p.fill(1, 4, 1, 2, 6, 1, 'spruce_planks'); p.fill(1, 4, 11, 2, 6, 11, 'spruce_planks');
  for (const z of [1, 6, 11]) p.fill(3, 4, z, 3, 6, z, 'spruce_log', axis('y'));
  p.fill(0, 7, 0, 4, 7, 12, 'spruce_slab', slab()); p.fill(0, 7, 1, 1, 7, 11, 'spruce_planks'); p.fill(0, 8, 1, 0, 8, 11, 'spruce_slab', slab());
  p.set(1, 4, 2, 'crafting_table'); p.set(1, 4, 3, 'smithing_table'); p.set(1, 4, 5, 'chest', chest('east'));
  p.set(1, 4, 7, 'barrel', barrel('east')); p.set(1, 5, 7, 'barrel', barrel('up'));
  p.set(1, 4, 9, 'grindstone', { face: 'floor', facing: 'east' }); p.set(2, 4, 10, 'anvil', facing('north'));
  p.fill(1, 4, 8, 2, 4, 8, 'stripped_spruce_log', axis('x'));
  p.set(2, 6, 4, 'lantern', lantern(true)); p.set(2, 6, 8, 'lantern', lantern(true));
  // timber stock and planks on the south rim
  p.fill(8, 4, 12, 14, 4, 12, 'stripped_spruce_log', axis('x')); p.fill(9, 5, 12, 13, 5, 12, 'stripped_spruce_log', axis('x'));
  p.fill(16, 4, 11, 17, 4, 12, 'spruce_planks'); p.fill(16, 5, 11, 17, 5, 12, 'spruce_slab', slab());
  // lamps and bollards
  for (const x of [7, 13, 19]) lampPost(p, x, 4, 0, 'spruce_fence', 2);
  lampPost(p, 5, 4, 12, 'spruce_fence', 2); lampPost(p, 19, 4, 12, 'spruce_fence', 2);
  for (const z of [1, 11]) p.set(23, 4, z, 'stone_brick_wall');
  return p.payload();
}

// ------------------------------------------------------------ Seebrücke mit Pavillon
function seebruecke() {
  const p = new Plot([11, 14, 31]);
  // stone ramp from the shore (z 0, y 0) up to the deck (y 3)
  for (let z = 0; z <= 3; z++) {
    if (z > 0) p.fill(4, 0, z, 7, z - 1, z, 'cobblestone');
    for (let x = 4; x <= 7; x++) p.set(x, z, z, z === 0 ? 'stone_bricks' : 'stone_brick_stairs', z === 0 ? {} : stairs('south'));
    for (const x of [3, 8]) { p.fill(x, 0, z, x, z, z, 'stone_bricks'); p.set(x, z + 1, z, 'stone_brick_wall'); }
  }
  // pier deck z 4–19
  for (let z = 4; z <= 19; z++) {
    p.fill(4, 3, z, 7, 3, z, 'spruce_planks');
    for (const x of [3, 8]) { p.set(x, 3, z, 'stripped_spruce_log', axis('z')); p.set(x, 4, z, 'spruce_fence'); }
  }
  for (const z of [6, 10, 14, 18]) { for (const x of [3, 8]) p.fill(x, 0, z, x, 2, z, 'stripped_spruce_log', axis('y')); p.fill(4, 2, z, 7, 2, z, 'stripped_spruce_log', axis('x')); }
  for (const z of [8, 16]) for (const x of [3, 8]) { p.set(x, 5, z, 'spruce_fence'); p.set(x, 6, z, 'lantern', lantern()); }
  for (const z of [11, 12]) { p.set(4, 4, z, 'spruce_stairs', stairs('west')); p.set(7, 4, z, 'spruce_stairs', stairs('east')); }
  // platform z 20–30
  p.fill(0, 3, 20, 10, 3, 30, 'spruce_planks');
  for (let x = 0; x <= 10; x++) { p.set(x, 3, 30, 'stripped_spruce_log', axis('x')); if (x < 4 || x > 7) p.set(x, 3, 20, 'stripped_spruce_log', axis('x')); }
  for (let z = 21; z <= 29; z++) for (const x of [0, 10]) p.set(x, 3, z, 'stripped_spruce_log', axis('z'));
  p.ring(0, 20, 10, 30, 4, 'spruce_fence'); p.fill(4, 4, 20, 7, 4, 20, null);
  for (const x of [0, 5, 10]) for (const z of [20, 25, 30]) p.fill(x, 0, z, x, 2, z, 'stripped_spruce_log', axis('y'));
  for (const [x, z] of [[0, 20], [10, 20], [0, 30], [10, 30]] as const) p.set(x, 5, z, 'lantern', lantern());
  // pavilion: posts, brackets, beam ring, hip roof with finial
  const posts: readonly [number, number][] = [[2, 22], [8, 22], [2, 28], [8, 28], [2, 25], [8, 25], [5, 28]];
  for (const [x, z] of posts) p.fill(x, 4, z, x, 6, z, 'stripped_spruce_log', axis('y'));
  p.ring(2, 22, 8, 28, 7, 'spruce_planks');
  for (const z of [22, 28]) { p.set(3, 6, z, 'spruce_stairs', stairs('west', 'top')); p.set(7, 6, z, 'spruce_stairs', stairs('east', 'top')); }
  for (const x of [2, 8]) { p.set(x, 6, 23, 'spruce_stairs', stairs('north', 'top')); p.set(x, 6, 24, 'spruce_stairs', stairs('south', 'top')); p.set(x, 6, 26, 'spruce_stairs', stairs('north', 'top')); p.set(x, 6, 27, 'spruce_stairs', stairs('south', 'top')); }
  hipRoof(p, 1, 9, 21, 29, 8, 'dark_oak_stairs', 'dark_oak_planks', false);
  p.set(5, 13, 25, 'lightning_rod', rod('up'));
  // seating round a table, lamp from the roof
  for (const x of [3, 4, 6, 7]) p.set(x, 4, 27, 'spruce_stairs', stairs('south'));
  for (const z of [24, 26]) { p.set(3, 4, z, 'spruce_stairs', stairs('west')); p.set(7, 4, z, 'spruce_stairs', stairs('east')); }
  table(p, 5, 4, 25, 'spruce'); hangingLamp(p, 5, 12, 25, 4);
  return p.payload();
}

// ------------------------------------------------------------ Strandbar
function strandbar() {
  const p = new Plot([17, 9, 13]);
  p.fill(0, 0, 0, 16, 0, 12, 'sand'); p.fill(1, 0, 1, 7, 0, 5, 'bamboo_planks');
  // bamboo hut with serving counter to the south and side door
  p.room(1, 1, 7, 5, 1, 3, 'bamboo_block', axis('y'));
  p.fill(2, 1, 5, 6, 1, 5, 'bamboo_planks'); p.fill(2, 2, 5, 6, 3, 5, null);
  p.fill(2, 3, 5, 6, 3, 5, 'bamboo_trapdoor', trapdoor('south', 'top'));
  door(p, 7, 1, 3, 'bamboo', 'west');
  hipRoof(p, 0, 8, 0, 6, 4, 'jungle_stairs', 'jungle_slab'); hangingLamp(p, 4, 7, 3, 1);
  // back bar: smoker, cauldron, barrels, brewing stand, pots
  p.set(2, 1, 2, 'smoker', furnace('south', true)); p.set(3, 1, 2, 'cauldron'); p.set(4, 1, 2, 'barrel', barrel('south'));
  p.set(5, 1, 2, 'bamboo_slab', slab('top')); p.set(5, 2, 2, 'brewing_stand', { has_bottle_0: T, has_bottle_1: F, has_bottle_2: T });
  p.set(6, 1, 2, 'barrel', barrel('south')); p.set(4, 2, 2, 'decorated_pot', pot()); p.set(6, 2, 2, 'potted_cactus');
  p.set(3, 2, 5, 'candle', candle(2, true)); p.set(5, 2, 5, 'flower_pot');
  // bar stools
  for (const x of [2, 4, 6]) p.set(x, 1, 6, 'bamboo_fence');
  // palm with coconuts (cocoa)
  palmTree(p, 3, 1, 9, 6);
  p.set(4, 5, 8, 'cocoa', cocoa('south')); p.set(5, 5, 9, 'cocoa', cocoa('west'));
  // three sunshades with loungers and towels
  sunshade(p, 11, 3, 'red'); lounger(p, 10, 2, 'north'); lounger(p, 12, 2, 'north');
  sunshade(p, 14, 8, 'yellow'); lounger(p, 13, 7, 'north'); lounger(p, 15, 7, 'north');
  sunshade(p, 10, 10, 'light_blue'); p.fill(9, 1, 9, 9, 1, 10, 'light_blue_carpet'); p.fill(11, 1, 9, 11, 1, 10, 'white_carpet');
  p.fill(15, 1, 1, 15, 1, 2, 'orange_carpet');
  // tiki torches and a small sand castle
  for (const [x, z] of [[8, 1], [8, 7], [16, 12], [16, 4]] as const) { p.fill(x, 1, z, x, 2, z, 'bamboo_fence'); p.set(x, 3, z, 'torch'); }
  p.set(13, 1, 11, 'sandstone'); p.set(13, 2, 11, 'sandstone_wall'); p.set(12, 1, 11, 'sandstone_slab', slab()); p.set(14, 1, 11, 'sandstone_stairs', stairs('west'));
  return p.payload();
}

// ------------------------------------------------------------ Rettungsschwimmerturm
function rettungsturm() {
  const p = new Plot([9, 16, 13]);
  p.fill(0, 0, 0, 8, 0, 12, 'sand');
  for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]] as const) p.fill(x, 1, z, x, 4, z, 'stripped_birch_log', axis('y'));
  for (const z of [1, 7]) p.fill(2, 4, z, 6, 4, z, 'birch_fence');
  for (const x of [1, 7]) p.fill(x, 4, 2, x, 4, 6, 'birch_fence');
  p.fill(1, 5, 1, 7, 5, 7, 'birch_planks');
  // lookout hut: red base band, white walls, window band
  p.room(2, 2, 6, 6, 6, 8, 'white_concrete'); p.ring(2, 2, 6, 6, 6, 'red_concrete');
  for (let i = 3; i <= 5; i++) { p.set(i, 7, 2, 'glass_pane', pane); p.set(2, 7, i, 'glass_pane', pane); p.set(6, 7, i, 'glass_pane', pane); if (i !== 4) p.set(i, 7, 6, 'glass_pane', pane); }
  door(p, 4, 6, 6, 'birch', 'north');
  hipRoof(p, 1, 7, 1, 7, 9, 'mangrove_stairs', 'mangrove_planks', false);
  p.fill(4, 13, 4, 4, 14, 4, 'birch_fence'); p.set(4, 15, 4, 'red_banner', { rotation: '4' });
  // railing round the platform with the ramp opening
  p.ring(1, 1, 7, 7, 6, 'birch_fence'); for (let x = 3; x <= 5; x++) p.clear(x, 6, 7);
  // ramp to the beach
  for (let z = 8; z <= 12; z++) {
    const y = 13 - z;
    for (let x = 3; x <= 5; x++) p.set(x, y, z, 'birch_stairs', stairs('north'));
    for (const x of [3, 5]) if (y > 1) p.fill(x, 1, z, x, y - 1, z, 'birch_fence');
    for (const x of [2, 6]) p.set(x, y + 1, z, 'birch_fence');
  }
  // inside: chair facing the sea, rescue chest, bell on a barrel, lantern
  p.set(4, 6, 4, 'birch_stairs', stairs('south'));
  p.set(3, 6, 3, 'chest', chest('east')); p.set(3, 7, 3, 'lantern', lantern());
  p.set(5, 6, 3, 'barrel', barrel('up')); p.set(5, 7, 3, 'bell', bell('west', 'floor'));
  // rescue board leaning on a stilt, life ring colours
  p.set(0, 1, 7, 'orange_wall_banner', wallBanner('west')); p.set(8, 1, 1, 'red_wall_banner', wallBanner('east'));
  return p.payload();
}

// ------------------------------------------------------------ Fischmarkt-Halle
function fischmarkt() {
  const p = new Plot([15, 14, 13]);
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 12; z++) p.set(x, 0, z, (x + z) % 2 ? 'smooth_stone' : 'polished_andesite');
  const cols: readonly [number, number][] = [[1, 1], [7, 1], [13, 1], [1, 11], [7, 11], [13, 11], [1, 6], [13, 6]];
  for (const [x, z] of cols) { p.fill(x, 1, z, x, 3, z, 'stone_bricks'); p.set(x, 4, z, 'chiseled_stone_bricks'); }
  for (let x = 1; x <= 13; x++) for (const z of [1, 11]) if (!cols.some(([cx, cz]) => cx === x && cz === z)) p.set(x, 5, z, 'stripped_spruce_log', axis('x'));
  for (const [x, z] of cols) p.set(x, 5, z, 'spruce_planks');
  for (let z = 2; z <= 10; z++) for (const x of [1, 7, 13]) if (z !== 6 || x === 7) p.set(x, 5, z, 'stripped_spruce_log', axis('z'));
  for (const x of [1, 13]) p.set(x, 5, 6, 'spruce_planks');
  // arch brackets beside the columns
  for (const z of [1, 11]) for (const x of [1, 7, 13]) { if (x > 1) p.set(x - 1, 4, z, 'stone_brick_stairs', stairs('east', 'top')); if (x < 13) p.set(x + 1, 4, z, 'stone_brick_stairs', stairs('west', 'top')); }
  gableRoofX(p, 1, 13, 0, 12, 6, 'spruce_stairs', 'spruce_planks', 'spruce_slab');
  overhangX(p, 1, 0, 0, 12, 6, 12); overhangX(p, 13, 14, 0, 12, 6, 12);
  for (const x of [1, 13]) { p.set(x, 8, 5, 'glass_pane', pane); p.set(x, 8, 6, 'glass_pane', pane); p.set(x, 8, 7, 'glass_pane', pane); }
  p.fill(2, 6, 6, 12, 6, 6, 'stripped_spruce_log', axis('x'));
  for (const x of [4, 10]) p.set(x, 5, 6, 'lantern', lantern(true));
  // four stalls: back shelf, seller aisle, ice counter, canopy on posts
  for (const a of [3, 9]) for (const side of ['n', 's'] as const) {
    const back = side === 'n' ? 2 : 10, front = side === 'n' ? 4 : 8, toAisle: H = side === 'n' ? 'south' : 'north';
    p.set(a, 1, back, 'barrel', barrel(toAisle)); p.set(a + 1, 1, back, 'water_cauldron', water3);
    p.set(a + 2, 1, back, 'barrel', barrel('up')); p.set(a + 2, 2, back, 'barrel', barrel(toAisle));
    p.set(a, 2, back, 'sea_pickle', { pickles: '3', waterlogged: F });
    p.fill(a, 1, front, a + 2, 1, front, 'packed_ice');
    p.set(a + 1, 2, front, 'heavy_weighted_pressure_plate', { power: '0' });
    for (const x of [a, a + 2]) p.fill(x, 2, front, x, 3, front, 'spruce_fence');
    const color = (a === 3) === (side === 'n') ? 'light_blue' : 'lime';
    const mid = side === 'n' ? 3 : 9;
    for (let x = a; x <= a + 2; x++) for (const z of [mid, front]) { p.set(x, 4, z, 'spruce_slab', slab()); p.set(x, 5, z, x === a + 1 ? 'white_carpet' : `${color}_carpet`); }
  }
  // market bell: villagers gather here
  p.set(7, 1, 6, 'bell', bell('east', 'floor'));
  p.set(0, 1, 3, 'barrel', barrel('up')); p.set(0, 1, 9, 'dried_kelp_block'); p.set(0, 2, 9, 'barrel', barrel('up'));
  return p.payload();
}

// ------------------------------------------------------------ Glocken- und Leuchtboje
function leuchtboje() {
  const p = new Plot([7, 15, 7]);
  p.set(3, 0, 3, 'anvil', facing('north'));
  p.fill(3, 1, 3, 3, 3, 3, 'chain', chain());
  p.set(3, 4, 3, 'red_concrete');
  p.disc(3, 3, 5, 1, 'red_concrete'); p.disc(3, 3, 6, 2, 'red_concrete'); p.disc(3, 3, 7, 2, 'white_concrete'); p.disc(3, 3, 8, 1, 'white_concrete');
  p.ring(2, 2, 4, 4, 9, 'iron_bars'); p.ring(2, 2, 4, 4, 10, 'iron_bars');
  p.set(3, 9, 3, 'sea_lantern'); p.set(3, 10, 3, 'bell', bell('north', 'ceiling'));
  p.fill(2, 11, 2, 4, 11, 4, 'smooth_stone_slab', slab());
  p.set(3, 11, 3, 'red_concrete'); p.set(3, 12, 3, 'iron_bars'); p.set(3, 13, 3, 'red_concrete'); p.set(3, 14, 3, 'lightning_rod', rod('up'));
  return p.payload();
}

// ------------------------------------------------------------ Hafenspeicher mit Flaschenzug
function hafenspeicher() {
  const p = new Plot([11, 20, 16]);
  p.fill(0, 0, 0, 10, 0, 2, 'stone_bricks');
  p.fill(1, 0, 3, 9, 0, 13, 'stone_bricks'); p.fill(2, 0, 4, 8, 0, 12, 'spruce_planks');
  p.room(1, 3, 9, 13, 1, 12, 'bricks');
  p.ring(1, 3, 9, 13, 5, 'stone_bricks'); p.ring(1, 3, 9, 13, 9, 'stone_bricks');
  p.fill(2, 5, 4, 8, 5, 12, 'spruce_planks'); p.fill(2, 9, 4, 8, 9, 12, 'spruce_planks');
  for (const [x, z] of [[1, 3], [9, 3], [1, 13], [9, 13]] as const) p.fill(x, 1, z, x, 12, z, 'stone_bricks');
  // front: door, windows, stacked loading doors with shutters
  door(p, 5, 1, 3, 'spruce', 'south');
  for (const x of [3, 7]) { p.set(x, 2, 3, 'glass_pane', pane); p.set(x, 3, 3, 'glass_pane', pane); p.set(x, 7, 3, 'glass_pane', pane); p.set(x, 11, 3, 'glass_pane', pane); p.set(x, 7, 13, 'glass_pane', pane); p.set(x, 11, 13, 'glass_pane', pane); }
  for (const z of [6, 10]) for (const x of [1, 9]) { p.set(x, 2, z, 'glass_pane', pane); p.set(x, 7, z, 'glass_pane', pane); p.set(x, 11, z, 'glass_pane', pane); }
  for (const y0 of [6, 10]) {
    p.fill(5, y0, 3, 5, y0 + 1, 3, null);
    for (const x of [4, 6]) p.fill(x, y0, 2, x, y0 + 1, 2, 'spruce_trapdoor', trapdoor('north', 'bottom', true));
    p.set(5, y0, 4, 'spruce_fence_gate', { facing: 'south', in_wall: F, open: F, powered: F });
  }
  // roof with front and back overhang, hoist beam with chain and load
  gableRoof(p, 0, 10, 3, 13, 13, 'dark_oak_stairs', 'bricks', 'dark_oak_slab');
  overhangZ(p, 3, 2, 0, 10, 13, 18); overhangZ(p, 13, 14, 0, 10, 13, 18);
  p.set(5, 14, 3, 'glass_pane', pane);
  p.fill(5, 16, 1, 5, 16, 2, 'stripped_spruce_log', axis('z')); p.set(5, 17, 2, 'dark_oak_planks'); p.set(5, 17, 1, 'dark_oak_slab', slab());
  p.fill(5, 9, 1, 5, 15, 1, 'chain', chain()); p.set(5, 8, 1, 'barrel', barrel('up'));
  p.fill(4, 16, 4, 6, 16, 4, 'stripped_spruce_log', axis('x'));
  // ladder through all floors
  p.fill(8, 1, 12, 8, 10, 12, 'ladder', ladder('west'));
  // goods: barrels, chests, hay, sacks of wool
  for (const z of [5, 7, 9, 11]) { p.set(2, 1, z, 'barrel', barrel('east')); p.set(2, 2, z, 'barrel', barrel('up')); }
  p.set(2, 1, 6, 'chest', chest('east')); p.set(2, 1, 10, 'chest', chest('east'));
  p.fill(6, 1, 11, 7, 2, 12, 'hay_block', axis('y')); p.set(7, 1, 5, 'lectern', { facing: 'west', has_book: F, powered: F }); p.set(7, 1, 4, 'crafting_table');
  for (const z of [6, 8, 10]) { p.set(2, 6, z, 'brown_wool'); p.set(3, 6, z, 'white_wool'); p.set(7, 6, z, 'barrel', barrel('west')); }
  for (const z of [6, 8, 10]) { p.set(2, 10, z, 'hay_block', axis('x')); p.set(7, 10, z, 'chest', chest('west')); }
  for (const y of [4, 8]) { p.set(4, y, 8, 'lantern', lantern(true)); p.set(6, y, 8, 'lantern', lantern(true)); }
  p.set(3, 11, 8, 'lantern', lantern()); p.set(3, 10, 8, 'barrel', barrel('up'));
  // quay: bollards and waiting goods
  for (const x of [1, 9]) p.set(x, 1, 0, 'stone_brick_wall');
  p.set(2, 1, 1, 'barrel', barrel('up')); p.set(3, 1, 1, 'barrel', barrel('north')); p.set(8, 1, 1, 'hay_block', axis('y'));
  return p.payload();
}

// ------------------------------------------------------------ Unterwasser-Glastunnel
function glastunnel() {
  const L = 12, p = new Plot([L, 6, 6]);
  for (let x = 0; x < L; x++) {
    const rib = x === 0 || x === L - 1 || x === 4 || x === 7, wall = rib ? 'dark_prismarine' : 'glass';
    p.set(x, 0, 0, 'prismarine_bricks'); p.set(x, 0, 5, 'prismarine_bricks');
    for (let z = 1; z <= 4; z++) p.set(x, 0, z, z === 1 || z === 4 ? 'dark_prismarine' : x % 4 === 2 ? 'sea_lantern' : 'prismarine_bricks');
    p.fill(x, 1, 0, x, 3, 0, wall); p.fill(x, 1, 5, x, 3, 5, wall); p.fill(x, 4, 1, x, 4, 4, wall);
    if (rib) { p.set(x, 4, 0, 'dark_prismarine_stairs', stairs('south')); p.set(x, 4, 5, 'dark_prismarine_stairs', stairs('north')); }
    if (x === 4 || x === 7) for (const z of [2, 3]) p.set(x, 4, z, 'sea_lantern');
    p.fill(x, 1, 1, x, 3, 4, null);
  }
  return p.payload();
}

const W = (id: string, pos: [number, number, number], n: [number, number, number]) => joint(id, pos, n, 'path_joint', PATH_PROFILE);

export const KUESTE_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_kueste_bootshaus', name: 'Bootshaus', payload: bootshaus, tags: ['boot', 'einfahrt', 'steg'],
    description: 'Holzbootshaus über einem Wasserbecken mit Toreinfahrt zur See, Laufstegen, Festmachpfählen, Webstuhl für Netze und Lagerfässern.',
    facets: { kategorie: ['infrastruktur'], stil: ['kuestenstil', 'rustikal'], biom: ['kueste', 'sumpf'], funktion: ['lagern', 'transport'] },
    gaps: ['minecraft:water'],
    tips: ['Das Becken auf Meereshöhe setzen: die Einfahrt im Süden muss ans offene Wasser grenzen.', 'Boote lassen sich im Becken abstellen und bleiben dort liegen.'],
    inspiration: [WIKI('Boat', 'Boot')] },
  { id: 'bld_kueste_werft', name: 'Werft mit Trockendock', payload: werft, tags: ['schiffbau', 'dock', 'rumpf'],
    description: 'Gemauertes Trockendock mit Stufenwänden, halb beplanktem Schiffsrumpf auf Kielblöcken, Gerüst, Docktor zur See und Werkschuppen mit Amboss.',
    facets: { kategorie: ['handwerk'], stil: ['kuestenstil', 'mittelalterlich'], biom: ['kueste'], funktion: ['handwerk', 'transport'] },
    gaps: ['minecraft:water'],
    tips: ['Das Docktor ist eine Plankenwand: entfernen, und das Dock läuft voll.', 'Gerüst lässt sich von oben schnell wieder abbauen – ideal für den unfertigen Rumpf.'],
    inspiration: [WIKI('Scaffolding', 'Gerüst')] },
  { id: 'bld_kueste_seebruecke', name: 'Seebrücke mit Pavillon', payload: seebruecke, tags: ['pier', 'pavillon', 'promenade'],
    description: 'Lange Seebrücke auf Pfählen mit Steinrampe zum Ufer, Laternen und Bänken, am Ende eine Plattform mit Walmdach-Pavillon, Sitzrunde und Hängelampe.',
    facets: { kategorie: ['infrastruktur'], stil: ['kuestenstil', 'klassisch'], biom: ['kueste', 'ozean'], funktion: ['verbindung', 'aussicht', 'erholung'] },
    connectors: [W('land', [6, 0, 0], [0, 0, -1])],
    tips: ['Passt am Landende an den Wege-Baukasten (weg_4).', 'y 0 ist der Meeresgrund: bei 3 Blöcken Wassertiefe liegt das Deck knapp über dem Wasser.'] },
  { id: 'bld_kueste_strandbar', name: 'Strandbar', payload: strandbar, tags: ['strand', 'sonnenschirm', 'bar'],
    description: 'Bambus-Strandbar mit Theke, Barhockern, Räucherofen und Braustand, dazu eine Palme mit Kakao, drei Sonnenschirme aus Wolle und Bannern, Liegen und Fackeln.',
    facets: { kategorie: ['handel'], stil: ['kuestenstil', 'tropisch'], biom: ['kueste', 'dschungel'], funktion: ['erholung', 'kochen', 'unterhaltung'] },
    tips: ['Sonnenschirm: Wolle auf den Zaun, dann die Wandbanner an alle vier Seiten der Wolle hängen.', 'Kakao wächst nur an Tropenholzstämmen.'],
    inspiration: [WIKI('Banner', 'Banner')] },
  { id: 'bld_kueste_rettungsturm', name: 'Rettungsschwimmerturm', payload: rettungsturm, tags: ['strand', 'ausguck', 'stelzen'],
    description: 'Rot-weißer Ausguck auf Birkenstelzen mit Rampe, umlaufendem Geländer, Fensterband, Rettungstruhe, Glocke und Flagge auf dem Walmdach.',
    facets: { kategorie: ['oeffentlich'], stil: ['kuestenstil', 'modern'], biom: ['kueste'], funktion: ['aussicht'] } },
  { id: 'bld_kueste_fischmarkt', name: 'Fischmarkt-Halle', payload: fischmarkt, tags: ['markt', 'halle', 'fisch'],
    description: 'Offene Markthalle mit Steinsäulen und Satteldach, vier Ständen mit Eistheke, Waage, Fässern und Wasserkessel, gestreiften Vordächern und Marktglocke.',
    facets: { kategorie: ['handel'], stil: ['kuestenstil', 'klassisch'], biom: ['kueste'], funktion: ['handel', 'handelsplatz', 'versammlung'] },
    assumed: ['minecraft:cauldron'],
    tips: ['Fässer sind der Arbeitsblock des Fischers – Dorfbewohner werden hier zu Fischern.', 'Die Glocke ist Treffpunkt der Dorfbewohner.'],
    inspiration: [WIKI('Fisherman', 'Fischer'), WIKI('Bell', 'Glocke')] },
  { id: 'bld_kueste_leuchtboje', name: 'Glocken- und Leuchtboje', payload: leuchtboje, tags: ['boje', 'seezeichen', 'licht'],
    description: 'Rot-weiße Seezeichen-Boje an Kette und Ankerstein, mit Gitterkorb, Seelaterne, Glocke und Toppzeichen mit Blitzableiter.',
    facets: { kategorie: ['infrastruktur'], stil: ['kuestenstil'], biom: ['ozean', 'kueste'], funktion: ['orientierung', 'beleuchtung'] },
    tips: ['Die weiße Wollbinde (y 7) sitzt auf der Wasserlinie; die Kette reicht bis zum Grund.'] },
  { id: 'bld_kueste_hafenspeicher', name: 'Hafenspeicher', payload: hafenspeicher, tags: ['speicher', 'flaschenzug', 'kai'],
    description: 'Dreigeschossiger Ziegelspeicher mit übereinanderliegenden Ladeluken samt Klappläden, Flaschenzug-Balken mit Kette und Fass, Leiter durch alle Böden und Kai mit Pollern.',
    facets: { kategorie: ['handel'], stil: ['kuestenstil', 'klassisch'], biom: ['kueste'], funktion: ['lagern', 'handel'] },
    tips: ['Die Ladeluken liegen genau unter dem Balken: Waren am Seil fahren direkt in jedes Geschoss.'] },
  { id: 'bld_kueste_glastunnel', name: 'Unterwasser-Glastunnel', payload: glastunnel, tags: ['tunnel', 'glas', 'unterwasser'],
    description: 'Gerades Tunnelmodul aus Glas mit Prismarin-Rippen, Seelaternen in Boden und Decke und luftgefülltem Gang, an beiden Enden anschließbar.',
    facets: { kategorie: ['infrastruktur'], stil: ['modern', 'kuestenstil'], biom: ['ozean'], funktion: ['verbindung'] },
    connectors: [W('west', [0, 0, 3], [-1, 0, 0]), W('east', [12, 0, 3], [1, 0, 0])],
    tips: ['Unter Wasser zuerst die Glashülle setzen, dann das Wasser innen mit Schwämmen oder Sand entfernen.', 'Der Gang ist 4 breit und 3 hoch – passt an den Wege-Baukasten (weg_4).'],
    inspiration: [WIKI('Sponge', 'Schwamm')] },
];
