import { Plot, axis, chain, chest, crop, door, gate, grass, lampPost, lantern, leaves, noise, roundTree, sapling, slab, stairs, tallPlant, trapdoor, water, F, T } from '../plot.js';
import type { H, Props } from '../plot.js';
import { pot, sofa, table } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { stableAtan2, stableCos, stableSin } from '../../../../voxel/src/stableMath.js';

/**
 * Garten & Park (Katalog v3): Pergola, Beete, Bogengänge, Labyrinth, Schuppen,
 * Teich, Kräuterspirale, Steingarten, Spielplatz und Formschnitt. Alles
 * deterministisch; organische Ränder kommen aus noise().
 */

type Face = H | 'up';
const STEP: Readonly<Record<H, readonly [number, number]>> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
const SIDES: readonly H[] = ['north', 'east', 'south', 'west'];
/** Vine state; each face names the side the supporting block is on. */
const vine = (...faces: Face[]): Props => ({ east: faces.includes('east') ? T : F, north: faces.includes('north') ? T : F, south: faces.includes('south') ? T : F, up: faces.includes('up') ? T : F, west: faces.includes('west') ? T : F });

/** Grass on every still empty ground cell. */
function lawn(p: Plot, x0: number, z0: number, x1: number, z1: number, y = 0): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (!p.has(x, y, z)) p.set(x, y, z, 'grass_block', grass());
}
/** Flower tub: a dirt block framed by four open trapdoors, plant on top. */
function planter(p: Plot, x: number, y: number, z: number, wood: string, plant: string, tall = false): void {
  p.set(x, y, z, 'dirt');
  for (const f of SIDES) { const [dx, dz] = STEP[f]; p.set(x + dx, y, z + dz, `${wood}_trapdoor`, trapdoor(f, 'bottom', true)); }
  tall ? tallPlant(p, x, y + 1, z, plant) : p.set(x, y + 1, z, plant);
}
/** Stone lantern of the far-eastern garden: wall post, lantern, slab hat. */
function stoneLantern(p: Plot, x: number, y: number, z: number): void {
  p.set(x, y, z, 'andesite_wall'); p.set(x, y + 1, z, 'lantern', lantern()); p.set(x, y + 2, z, 'smooth_stone_slab', slab());
}

function pergola() {
  const p = new Plot([9, 6, 6]);
  p.fill(1, 0, 1, 7, 0, 4, 'polished_andesite');
  lawn(p, 0, 0, 8, 5);
  for (const x of [1, 4, 7]) for (const z of [1, 4]) p.fill(x, 1, z, x, 3, z, 'stripped_oak_log', axis('y'));
  for (const z of [1, 4]) p.fill(0, 4, z, 8, 4, z, 'oak_log', axis('x'));
  for (const x of [0, 2, 4, 6, 8]) p.fill(x, 5, 0, x, 5, 5, 'stripped_oak_log', axis('z'));
  for (const x of [2, 3, 5, 6]) p.set(x, 1, 1, 'oak_leaves', leaves());
  sofa(p, 2, 1, 2, 'oak', 'north', 5);
  table(p, 4, 1, 3, 'oak');
  p.set(4, 4, 3, 'iron_chain', chain()); p.set(4, 3, 3, 'lantern', lantern(true));
  // vines hang from the rafters and climb the posts
  for (const x of [0, 2, 4, 6, 8]) for (const z of [0, 2, 3, 5]) if (!p.has(x, 4, z) && noise(x, 4, z) > 0.3) p.set(x, 4, z, 'vine', vine('up'));
  for (const [x, z, f] of [[0, 1, 'east'], [8, 4, 'west'], [1, 5, 'north'], [7, 0, 'south'], [4, 5, 'north']] as const)
    for (let y = 1; y <= 3; y++) if (y > 1 || noise(x, y, z) > 0.4) p.set(x, y, z, 'vine', vine(f));
  tallPlant(p, 2, 1, 5, 'rose_bush'); tallPlant(p, 6, 1, 5, 'peony');
  p.set(0, 1, 4, 'potted_red_tulip'); p.set(8, 1, 1, 'potted_azure_bluet');
  return p.payload();
}

function hochbeete() {
  const p = new Plot([15, 4, 11]);
  p.fill(6, 0, 0, 8, 0, 9, 'dirt_path');
  for (const x0 of [1, 9]) {
    for (let x = x0; x <= x0 + 4; x++) for (let z = 1; z <= 8; z++) {
      const edgeX = x === x0 || x === x0 + 4, edgeZ = z === 1 || z === 8;
      if (edgeX && edgeZ) p.set(x, 1, z, 'stripped_spruce_log', axis('y'));
      else if (edgeX) p.set(x, 1, z, 'stripped_spruce_log', axis('z'));
      else if (edgeZ) p.set(x, 1, z, 'stripped_spruce_log', axis('x'));
      else { p.set(x, 0, z, 'dirt'); p.set(x, 1, z, 'farmland', { moisture: '7' }); }
    }
    p.set(x0 + 2, 1, 4, 'water', water()); p.set(x0 + 2, 2, 4, 'lily_pad');
  }
  const plant = (x0: number, z0: number, z1: number, id: string, age: number) => {
    for (let x = x0; x <= x0 + 2; x++) for (let z = z0; z <= z1; z++) if (p.get(x, 1, z)?.id === 'minecraft:farmland') p.set(x, 2, z, id, crop(age));
  };
  plant(2, 2, 4, 'carrots', 7); plant(2, 5, 7, 'potatoes', 7); plant(10, 2, 4, 'wheat', 7); plant(10, 5, 7, 'beetroots', 3);
  lawn(p, 0, 0, 14, 10);
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 10; z++) if ((x === 0 || x === 14 || z === 0 || z === 10) && !(z === 10 && x === 7)) p.set(x, 1, z, 'oak_fence');
  p.set(7, 1, 10, 'oak_fence_gate', gate('south'));
  // scarecrow on the path
  p.set(7, 1, 1, 'oak_fence'); p.set(7, 2, 1, 'hay_block', axis('y')); p.set(7, 3, 1, 'carved_pumpkin', { facing: 'south' });
  p.set(6, 2, 1, 'oak_fence'); p.set(8, 2, 1, 'oak_fence');
  p.set(1, 1, 9, 'composter'); p.set(2, 1, 9, 'barrel', { facing: 'up', open: F }); p.set(13, 1, 9, 'water_cauldron', { level: '3' });
  p.set(12, 1, 9, 'potted_fern');
  return p.payload();
}

function rosenbogen() {
  const p = new Plot([7, 7, 13]);
  p.fill(2, 0, 0, 4, 0, 11, 'gravel'); for (let z = 0; z <= 11; z += 2) p.set(3, 0, z, 'stone_bricks');
  lawn(p, 0, 0, 6, 12);
  for (const z of [1, 5, 9]) {
    p.fill(1, 1, z, 1, 3, z, 'spruce_fence'); p.fill(5, 1, z, 5, 3, z, 'spruce_fence');
    for (let x = 1; x <= 5; x++) p.set(x, 4, z, noise(x, 4, z) > 0.45 ? 'flowering_azalea_leaves' : 'oak_leaves', leaves());
    for (let x = 2; x <= 4; x++) p.set(x, 5, z, noise(x, 5, z) > 0.35 ? 'flowering_azalea_leaves' : 'oak_leaves', leaves());
    p.set(3, 4, z, 'stripped_oak_log', axis('x')); p.set(3, 3, z, 'lantern', lantern(true)); // Laub trägt keine Laterne
    tallPlant(p, 0, 1, z, 'rose_bush'); tallPlant(p, 6, 1, z, 'rose_bush');
    for (const x of [1, 5]) p.set(x, 1, z + 2, 'oak_leaves', leaves());
  }
  for (let z = 0; z <= 11; z++) for (const x of [1, 5]) if (!p.has(x, 1, z) && z % 2 === 0) p.set(x, 1, z, noise(x, 1, z) > 0.5 ? 'lily_of_the_valley' : 'red_tulip');
  sofa(p, 4, 1, 12, 'spruce', 'south', 3);
  return p.payload();
}

function labyrinth() {
  const N = 15, p = new Plot([N, 5, N]);
  const open = new Set<string>(), key = (x: number, z: number) => `${x},${z}`;
  const seen = new Set<string>([key(0, 0)]), stack: [number, number][] = [[0, 0]];
  open.add(key(1, 1));
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1]!;
    const next = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
      .map(([dx, dz]) => [cx + dx, cz + dz, dx, dz] as const)
      .filter(([nx, nz]) => nx >= 0 && nz >= 0 && nx < 7 && nz < 7 && !seen.has(key(nx, nz)))
      .sort((a, b) => noise(a[0] * 7 + cx, 3, a[1] * 5 + cz) - noise(b[0] * 7 + cx, 3, b[1] * 5 + cz));
    if (!next.length) { stack.pop(); continue; }
    const [nx, nz, dx, dz] = next[0]!;
    seen.add(key(nx, nz)); stack.push([nx, nz]);
    open.add(key(1 + 2 * cx + dx, 1 + 2 * cz + dz)); open.add(key(1 + 2 * nx, 1 + 2 * nz));
  }
  for (let x = 6; x <= 8; x++) for (let z = 6; z <= 8; z++) open.add(key(x, z));
  open.add(key(7, 14)); open.add(key(7, 0));
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
    const plaza = x >= 6 && x <= 8 && z >= 6 && z <= 8;
    p.set(x, 0, z, plaza ? 'stone_bricks' : 'grass_block', plaza ? {} : grass());
    if (open.has(key(x, z))) continue;
    for (let y = 1; y <= 3; y++) p.set(x, y, z, y === 3 && noise(x, y, z) > 0.82 ? 'flowering_azalea_leaves' : 'oak_leaves', leaves());
  }
  lampPost(p, 7, 1, 7, 'stone_brick_wall', 1);
  for (const [x, z, f] of [[6, 6, 'south'], [8, 8, 'north']] as const) p.set(x, 1, z, 'spruce_stairs', stairs(f));
  return p.payload();
}

function geraeteschuppen() {
  const p = new Plot([7, 7, 7]);
  p.ring(1, 1, 5, 4, 0, 'cobblestone'); p.fill(2, 0, 2, 4, 0, 3, 'spruce_planks');
  p.fill(2, 0, 5, 4, 0, 6, 'gravel');
  lawn(p, 0, 0, 6, 6);
  p.room(1, 1, 5, 4, 1, 3, 'spruce_planks');
  for (const x of [1, 5]) for (const z of [1, 4]) p.fill(x, 1, z, x, 3, z, 'stripped_spruce_log', axis('y'));
  door(p, 3, 1, 4, 'spruce', 'north');
  for (const [x, z] of [[5, 2], [5, 3], [1, 3]] as const) p.set(x, 2, z, 'glass_pane');
  gableRoofXOverhang(p);
  p.set(2, 1, 2, 'chest', chest('south')); p.set(3, 1, 2, 'grindstone', { face: 'floor', facing: 'south' }); p.set(4, 1, 2, 'barrel', { facing: 'up', open: F });
  p.set(4, 1, 3, 'composter');
  for (const x of [2, 3, 4]) p.set(x, 3, 2, 'spruce_trapdoor', trapdoor('south', 'top'));
  p.set(2, 4, 2, 'flower_pot'); p.set(4, 4, 2, 'potted_oak_sapling');
  p.set(3, 5, 3, 'iron_chain', chain()); p.set(3, 4, 3, 'lantern', lantern(true));
  p.set(1, 1, 5, 'cauldron'); p.set(5, 1, 5, 'composter'); p.set(0, 1, 2, 'hay_block', axis('y'));
  p.set(6, 1, 1, 'flowering_azalea'); p.set(0, 1, 4, 'azalea');
  return p.payload();
}
/** Shed roof: ridge along x, stairs overhang one block to the front and back. */
function gableRoofXOverhang(p: Plot): void {
  const rows: readonly [number, number, number][] = [[0, 5, 4], [1, 4, 5], [2, 3, 6]];
  for (const [l, r, y] of rows) for (let x = 0; x <= 6; x++) { p.set(x, y, l, 'spruce_stairs', stairs('south')); p.set(x, y, r, 'spruce_stairs', stairs('north')); }
  for (const x of [1, 5]) { p.fill(x, 4, 1, x, 4, 4, 'spruce_planks'); p.fill(x, 5, 2, x, 5, 3, 'spruce_planks'); }
  for (let x = 2; x <= 4; x++) { p.set(x, 4, 1, 'spruce_planks'); p.set(x, 4, 4, 'spruce_planks'); p.fill(x, 4, 2, x, 5, 3, null); }
}

function seerosenteich() {
  const p = new Plot([15, 5, 11]);
  const d = (x: number, z: number) => ((x - 7) / 6.2) ** 2 + ((z - 4.6) / 4.2) ** 2 + (noise(x, 0, z) - 0.5) * 0.22;
  const deck = (x: number, z: number) => x >= 6 && x <= 8 && z >= 5;
  for (let x = 0; x < 15; x++) for (let z = 0; z < 11; z++) {
    const v = d(x, z);
    p.set(x, 0, z, v < 0.45 ? 'clay' : v < 1 ? 'sand' : 'dirt');
    p.set(x, 1, z, v < 0.45 ? 'water' : v < 1 ? 'gravel' : 'dirt', v < 0.45 ? water() : {});
    if (v < 1) p.set(x, 2, z, 'water', water()); else p.set(x, 2, z, 'grass_block', grass());
  }
  // jetty from the south shore into the pond
  for (let x = 6; x <= 8; x++) for (let z = 5; z <= 10; z++) p.set(x, 2, z, 'spruce_planks');
  for (const [x, z] of [[6, 5], [8, 5], [6, 8], [8, 8]] as const) { p.fill(x, 0, z, x, 2, z, 'spruce_log', axis('y')); p.set(x, 3, z, 'spruce_fence'); }
  p.set(6, 4, 5, 'lantern', lantern()); p.set(8, 4, 5, 'lantern', lantern());
  p.set(7, 3, 9, 'spruce_stairs', stairs('south'));
  for (let x = 0; x < 15; x++) for (let z = 0; z < 11; z++) {
    if (deck(x, z)) continue;
    const id = p.get(x, 2, z)?.id, n = noise(x, 3, z);
    if (id === 'minecraft:water' && n > 0.7) p.set(x, 3, z, 'lily_pad');
    if (id !== 'minecraft:grass_block') continue;
    const shore = SIDES.some(f => { const [dx, dz] = STEP[f]; return p.get(x + dx, 2, z + dz)?.id === 'minecraft:water'; });
    if (shore && n > 0.72) { p.set(x, 3, z, 'sugar_cane', { age: '0' }); p.set(x, 4, z, 'sugar_cane', { age: '0' }); }
    else if (shore && n > 0.45) p.set(x, 3, z, 'blue_orchid');
    else if (!shore && n > 0.8) tallPlant(p, x, 3, z, 'tall_grass');
    else if (!shore && n > 0.68) p.set(x, 3, z, 'fern');
  }
  return p.payload();
}

function kraeuterspirale() {
  const p = new Plot([11, 7, 9]);
  const cx = 4, cz = 4, R = 3.4;
  const inside = (x: number, z: number) => (x - cx) ** 2 + (z - cz) ** 2 <= R * R;
  const height = (x: number, z: number) => {
    if (x === cx && z === cz) return 4;
    const a = (stableAtan2(z - cz, x - cx) + 2 * Math.PI) % (2 * Math.PI);
    return 1 + Math.min(3, Math.floor((a / (2 * Math.PI)) * 4));
  };
  const herbs = ['fern', 'cornflower', 'oxeye_daisy', 'allium'];
  for (let x = 0; x < 11; x++) for (let z = 0; z < 9; z++) {
    if (x >= 8 && x <= 9 && z >= 3 && z <= 5) { p.set(x, 0, z, 'water', water()); continue; }
    p.set(x, 0, z, 'grass_block', grass());
    if (!inside(x, z)) continue;
    const h = height(x, z), outer = (x - cx) ** 2 + (z - cz) ** 2 > 2.5 * 2.5;
    const edge = SIDES.some(f => { const [dx, dz] = STEP[f]; return inside(x + dx, z + dz) && height(x + dx, z + dz) < h; });
    const stone = outer || edge;
    for (let y = 1; y <= h; y++) p.set(x, y, z, stone ? (noise(x, y, z) > 0.55 ? 'mossy_cobblestone' : 'cobblestone') : y === h ? (h === 4 ? 'coarse_dirt' : 'grass_block') : 'dirt', !stone && y === h && h < 4 ? grass() : {});
    if (!stone && noise(x, 9, z) > 0.2) p.set(x, h + 1, z, herbs[h - 1]!);
  }
  p.set(7, 1, 2, 'lily_of_the_valley'); p.set(10, 1, 6, 'sweet_berry_bush', { age: '3' });
  p.set(8, 1, 6, 'potted_fern');
  return p.payload();
}

function vogeltraenke() {
  const p = new Plot([9, 4, 9]);
  p.fill(4, 0, 0, 4, 0, 7, 'stone_bricks'); p.fill(0, 0, 4, 8, 0, 4, 'stone_bricks');
  for (const [x, z] of [[3, 3], [5, 3], [3, 5], [5, 5]] as const) p.set(x, 0, z, 'mossy_stone_bricks');
  lawn(p, 0, 0, 8, 8);
  p.set(4, 1, 4, 'chiseled_stone_bricks'); p.set(4, 2, 4, 'water_cauldron', { level: '3' });
  for (const [x, z, f] of [[3, 4, 'east'], [5, 4, 'west'], [4, 3, 'south'], [4, 5, 'north']] as const) p.set(x, 1, z, 'stone_brick_stairs', stairs(f));
  planter(p, 1, 1, 1, 'spruce', 'peony', true); planter(p, 7, 1, 1, 'spruce', 'rose_bush', true);
  planter(p, 1, 1, 7, 'spruce', 'lilac', true); planter(p, 7, 1, 7, 'spruce', 'allium');
  sofa(p, 3, 1, 0, 'spruce', 'north', 3); sofa(p, 5, 1, 8, 'spruce', 'south', 3);
  for (const [x, z] of [[0, 3], [8, 5]] as const) lampPost(p, x, 1, z, 'spruce_fence', 2);
  return p.payload();
}

function steingarten() {
  const p = new Plot([11, 6, 9]);
  for (let s = 0; s <= 10; s++) { const z = Math.round(7 - s * 0.6); p.set(s, 0, z, 'polished_andesite'); }
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 8; z++) if (!p.has(x, 0, z)) p.set(x, 0, z, noise(x, 0, z) > 0.7 ? 'gravel' : noise(x, 0, z) > 0.55 ? 'coarse_dirt' : 'grass_block', noise(x, 0, z) > 0.55 ? {} : grass());
  const keep = (x: number, y: number, z: number) => y >= 1 && noise(x, y, z) > 0.1 && p.get(x, 0, z)?.id !== 'minecraft:polished_andesite';
  p.blob(3, 1, 2, 2.2, 1.6, 1.6, 'stone', {}, false, keep);
  p.blob(7, 1, 2, 1.8, 2.2, 1.4, 'andesite', {}, false, keep);
  p.blob(8, 1, 6, 1.4, 1, 1.2, 'tuff', {}, false, keep);
  p.blob(2, 1, 6, 1.2, 0.8, 1.1, 'stone', {}, false, keep);
  p.blob(5, 3, 2, 1, 1, 1, 'calcite', {}, false, keep);
  // moss and plant pockets on the rock tops
  const alpine = ['azure_bluet', 'lily_of_the_valley', 'cornflower', 'fern', 'allium'];
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 8; z++) {
    let top = 0; for (let y = 1; y <= 5; y++) if (p.has(x, y, z)) top = y;
    const n = noise(x, 7, z);
    if (top > 0) {
      if (n > 0.55) { p.set(x, top, z, 'moss_block'); p.set(x, top + 1, z, n > 0.75 ? alpine[Math.floor(n * 50) % alpine.length]! : 'moss_carpet'); }
    } else if (p.get(x, 0, z)?.id === 'minecraft:grass_block' && n > 0.62) p.set(x, 1, z, alpine[Math.floor(n * 30) % alpine.length]!);
    else if (p.get(x, 0, z)?.id === 'minecraft:coarse_dirt' && n > 0.5) p.set(x, 1, z, 'dead_bush');
  }
  for (const [x, z] of [[0, 0], [10, 8]] as const) { p.set(x, 0, z, 'grass_block', grass()); p.set(x, 1, z, 'spruce_sapling', sapling()); }
  return p.payload();
}

function spielplatz() {
  const p = new Plot([17, 9, 11]);
  // sandbox with log frame
  for (let x = 1; x <= 5; x++) for (let z = 6; z <= 9; z++) {
    const ex = x === 1 || x === 5, ez = z === 6 || z === 9;
    p.set(x, 0, z, ex && ez ? 'stripped_oak_log' : ex ? 'stripped_oak_log' : ez ? 'stripped_oak_log' : 'sand', ex && ez ? axis('y') : ex ? axis('z') : ez ? axis('x') : {});
  }
  p.set(3, 1, 7, 'sand'); p.set(2, 1, 8, 'decorated_pot', pot());
  for (let x = 2; x <= 6; x++) p.set(x, 0, 2, 'coarse_dirt');
  lawn(p, 0, 0, 16, 10);
  // swing: two posts, beam, two seats on chains
  p.fill(1, 1, 2, 1, 4, 2, 'spruce_log', axis('y')); p.fill(7, 1, 2, 7, 4, 2, 'spruce_log', axis('y'));
  p.fill(1, 5, 2, 7, 5, 2, 'spruce_log', axis('x'));
  for (const x of [3, 5]) { p.fill(x, 2, 2, x, 4, 2, 'iron_chain', chain()); p.set(x, 1, 2, 'spruce_slab', slab('top')); }
  // slide tower with ladder, railing, roof and a stair slide
  for (const [x, z] of [[9, 1], [11, 1], [9, 3], [11, 3]] as const) p.fill(x, 1, z, x, 5, z, 'oak_fence');
  p.fill(9, 1, 2, 9, 2, 2, 'oak_planks');
  p.fill(9, 3, 1, 11, 3, 3, 'oak_planks');
  for (const [x, z] of [[10, 1], [10, 3]] as const) p.set(x, 4, z, 'oak_fence');
  for (let y = 1; y <= 3; y++) p.set(8, y, 2, 'ladder', { facing: 'west', waterlogged: F });
  for (let i = 0; i < 3; i++) p.set(12 + i, 3 - i, 2, 'waxed_cut_copper_stairs', stairs('west'));
  p.set(15, 0, 2, 'sand');
  hipRoofSmall(p);
  // seesaw
  p.set(11, 1, 7, 'spruce_fence'); p.fill(9, 2, 7, 13, 2, 7, 'spruce_slab', slab());
  // fence with gate, bench, shade tree
  for (let x = 0; x <= 16; x++) for (let z = 0; z <= 10; z++) if ((x === 0 || x === 16 || z === 0 || z === 10) && !(z === 10 && x === 8)) p.set(x, 1, z, 'oak_fence');
  p.set(8, 1, 10, 'oak_fence_gate', gate('south'));
  sofa(p, 14, 1, 9, 'oak', 'south', 3);
  roundTree(p, 14, 1, 6, 'oak', 5, 2);
  return p.payload();
}
function hipRoofSmall(p: Plot): void {
  for (let i = 0; i < 2; i++) {
    const y = 6 + i, a = 8 + i, b = 12 - i, c = 0 + i, d = 4 - i;
    for (let x = a; x <= b; x++) { p.set(x, y, c, 'red_nether_brick_stairs', stairs('south')); p.set(x, y, d, 'red_nether_brick_stairs', stairs('north')); }
    for (let z = c + 1; z < d; z++) { p.set(a, y, z, 'red_nether_brick_stairs', stairs('east')); p.set(b, y, z, 'red_nether_brick_stairs', stairs('west')); }
  }
  p.set(10, 8, 2, 'red_nether_brick_slab', slab());
  p.fill(9, 6, 1, 11, 6, 3, 'red_nether_bricks'); p.set(10, 7, 2, 'red_nether_bricks');
}

function kirschbogengang() {
  const p = new Plot([9, 10, 15]);
  p.fill(3, 0, 0, 5, 0, 14, 'gravel'); for (let z = 0; z <= 14; z += 2) p.set(4, 0, z, 'smooth_stone');
  lawn(p, 0, 0, 8, 14);
  for (const z of [2, 7, 12]) for (const [x, dir] of [[1, 1], [7, -1]] as const) {
    p.blob(x + dir * 1.2, 6.5, z, 2.4, 1.4, 2.2, 'cherry_leaves', leaves(), false, (bx, by, bz) => noise(bx, by, bz) > 0.1);
  }
  for (const z of [2, 7, 12]) for (const [x, dir] of [[1, 1], [7, -1]] as const) {
    p.fill(x, 1, z, x, 4, z, 'cherry_log', axis('y'));
    p.set(x + dir, 5, z, 'cherry_log', axis('x')); p.set(x + 2 * dir, 6, z, 'cherry_log', axis('y'));
  }
  for (const [x, z] of [[1, 0], [7, 0], [1, 14], [7, 14]] as const) stoneLantern(p, x, 1, z);
  for (let x = 0; x <= 8; x++) for (let z = 0; z <= 14; z++) {
    if (p.has(x, 1, z) || p.get(x, 0, z)?.id !== 'minecraft:grass_block') continue;
    const n = noise(x, 1, z);
    if (n > 0.45) p.set(x, 1, z, Math.floor(n * 40) % 3 === 0 ? 'allium' : 'pink_tulip');
  }
  sofa(p, 0, 1, 9, 'cherry', 'west', 2); sofa(p, 8, 1, 6, 'cherry', 'east', 2);
  return p.payload();
}

function formschnitt() {
  const p = new Plot([16, 8, 9]);
  p.fill(0, 0, 7, 15, 0, 8, 'gravel');
  lawn(p, 0, 0, 15, 6);
  for (let x = 0; x <= 15; x++) p.set(x, 1, 0, 'oak_leaves', leaves());
  const L = 'oak_leaves', A = 'azalea_leaves';
  // rabbit: body, head, two ears, a flowering tail
  p.blob(3, 2, 4, 1.2, 1.2, 1.4, L, leaves(), false, (_x, y) => y >= 1);
  p.blob(3, 4, 2, 0.9, 0.9, 0.9, L, leaves());
  for (const x of [2, 4]) p.fill(x, 5, 2, x, 6, 2, L, leaves());
  p.set(3, 2, 6, 'flowering_azalea_leaves', leaves());
  // swan: low body, curved neck, head with beak, raised wings
  p.blob(8, 1, 4, 1.2, 0.6, 1.8, A, leaves(), false, (_x, y) => y >= 1);
  p.fill(8, 2, 2, 8, 4, 2, A, leaves()); p.set(8, 5, 2, A, leaves()); p.set(8, 5, 1, A, leaves());
  p.set(8, 4, 1, 'flowering_azalea_leaves', leaves());
  for (const x of [7, 9]) p.fill(x, 2, 4, x, 2, 6, A, leaves());
  p.set(7, 3, 5, A, leaves()); p.set(9, 3, 5, A, leaves());
  // spiral cone: shrinking discs, a groove winds up around it
  for (let y = 1; y <= 6; y++) {
    const r = Math.max(0, 2.2 - (y - 1) * 0.4), a = y * 1.6;
    p.disc(13, 4, y, r, L, leaves());
    if (r >= 1) p.clear(Math.round(13 + stableCos(a) * r), y, Math.round(4 + stableSin(a) * r));
  }
  p.set(13, 7, 4, L, leaves());
  for (const x of [5, 11]) lampPost(p, x, 1, 7, 'spruce_fence', 2);
  return p.payload();
}

const G = (stil: string[], biom: string[], funktion: string[]) => ({ kategorie: ['garten'], stil, biom, funktion });

export const GARTEN_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_garten_pergola', name: 'Rankenpergola', payload: pergola, tags: ['pergola', 'ranken', 'sitzplatz'],
    description: 'Pergola aus Eichenpfosten und Sparren mit herabhängenden Ranken, Sitzbank vor einer Hecke, Tisch und Hängelaterne.',
    facets: G(['klassisch', 'rustikal'], ['ueberall'], ['erholung', 'deko']),
    tips: ['Ranken unter Sparren platzieren: sie halten sich an der Unterseite des Blocks darüber fest.'], inspiration: [WIKI('Vines', 'Ranken')] },
  { id: 'bld_garten_hochbeete', name: 'Hochbeet-Gemüsegarten', payload: hochbeete, tags: ['gemüse', 'hochbeet', 'vogelscheuche'],
    description: 'Zwei Hochbeete mit Karotten, Kartoffeln, Weizen und Roter Bete um je eine Wasserquelle, Vogelscheuche, Komposter und Zaun mit Tor.',
    facets: G(['rustikal'], ['ebene', 'ueberall'], ['landwirtschaft', 'kochen']),
    gaps: ['minecraft:water'], assumed: ['minecraft:cauldron', 'minecraft:dirt'],
    tips: ['Eine Wasserquelle bewässert Ackerboden bis zu vier Blöcke weit.', 'Die Seerose verhindert, dass man ins Wasserloch tritt.'], inspiration: [WIKI('Farmland', 'Ackerboden')] },
  { id: 'bld_garten_rosenbogen', name: 'Rosenbogengang', payload: rosenbogen, tags: ['bogen', 'rosen', 'weg'],
    description: 'Kiesweg unter drei Laubbögen mit blühender Azalee, Rosenstöcken an den Pfosten, Hängelaternen und einer Bank am Ende.',
    facets: G(['klassisch'], ['ebene', 'ueberall'], ['verbindung', 'deko']) },
  { id: 'bld_garten_labyrinth', name: 'Heckenlabyrinth', payload: labyrinth, tags: ['labyrinth', 'hecke', 'rätsel'],
    description: 'Drei Blöcke hohes Heckenlabyrinth (15×15) mit Eingang im Süden, Ausgang im Norden und einem Laternenplatz in der Mitte.',
    facets: G(['klassisch'], ['ebene', 'ueberall'], ['erholung', 'unterhaltung']),
    tips: ['Drei Blöcke hohe Hecken verdecken die Sicht – bei zwei Blöcken schaut man im Spiel darüber.'] },
  { id: 'bld_garten_geraeteschuppen', name: 'Geräteschuppen', payload: geraeteschuppen, tags: ['schuppen', 'werkzeug', 'klein'],
    description: 'Kleiner Fichtenholzschuppen mit Satteldach, Kiste, Schleifstein, Fass, Wandregal und Komposter, davor Kessel und Kiesweg.',
    facets: G(['rustikal'], ['ueberall'], ['lagern', 'handwerk']) },
  { id: 'bld_garten_seerosenteich', name: 'Seerosenteich mit Steg', payload: seerosenteich, tags: ['teich', 'steg', 'seerosen'],
    description: 'Zwei Blöcke tiefer Teich mit Ton- und Kiesgrund, Holzsteg mit Laternen und Sitzstufe, Seerosen, Orchideen und Zuckerrohr am Ufer.',
    facets: G(['rustikal', 'klassisch'], ['ebene', 'wald', 'sumpf'], ['erholung', 'wasserquelle']),
    gaps: ['minecraft:water'] },
  { id: 'bld_garten_kraeuterspirale', name: 'Kräuterspirale', payload: kraeuterspirale, tags: ['kräuter', 'spirale', 'beet'],
    description: 'Spiralförmig ansteigendes Kräuterbeet in Bruchsteinfassung, oben trocken, unten feucht, mit kleinem Wasserbecken am Fuß.',
    facets: G(['rustikal'], ['ebene', 'ueberall'], ['landwirtschaft', 'deko']),
    gaps: ['minecraft:water'] },
  { id: 'bld_garten_vogeltraenke', name: 'Vogeltränke mit Blumenkübeln', payload: vogeltraenke, tags: ['tränke', 'kübel', 'platz'],
    description: 'Kleiner Gartenplatz mit Wasserkessel auf Steinsockel, vier Blumenkübeln aus Falltüren, zwei Bänken und Laternenpfählen.',
    facets: G(['klassisch'], ['ueberall'], ['deko', 'erholung']),
    assumed: ['minecraft:cauldron'],
    tips: ['Blumenkübel: Erdblock mit vier offenen Falltüren ringsum, die Pflanze kommt obendrauf.'] },
  { id: 'bld_garten_steingarten', name: 'Steingarten', payload: steingarten, tags: ['steine', 'alpin', 'moos'],
    description: 'Felsgruppen aus Stein, Andesit, Tuff und Kalzit mit Moospolstern, Bergblumen, Kies, Zwergfichten und Trittplattenweg.',
    facets: G(['rustikal'], ['gebirge', 'ueberall'], ['deko']) },
  { id: 'bld_garten_spielplatz', name: 'Spielplatz', payload: spielplatz, tags: ['kinder', 'rutsche', 'schaukel'],
    description: 'Eingezäunter Spielplatz mit Sandkasten, Doppelschaukel an Ketten, Rutschturm mit Leiter und Dach, Wippe, Bank und Schattenbaum.',
    facets: G(['modern', 'klassisch'], ['ueberall'], ['erholung', 'unterhaltung']),
    tips: ['Gewachste Kupfertreppen bleiben orange – ungewachstes Kupfer oxidiert mit der Zeit grün.'] },
  { id: 'bld_garten_kirschbogengang', name: 'Kirschblüten-Bogengang', payload: kirschbogengang, tags: ['kirschblüte', 'allee', 'japanisch'],
    description: 'Zwei Reihen Kirschbäume, deren Kronen sich über einem Kiesweg mit Trittsteinen schließen, Blütenteppich, Steinlaternen und Bänke.',
    facets: G(['fernoestlich'], ['kirschhain', 'ueberall'], ['verbindung', 'deko']),
    inspiration: [WIKI('Pink_Petals', 'Rosa Blütenblätter')] },
  { id: 'bld_garten_formschnitt', name: 'Formschnitt-Hecken', payload: formschnitt, tags: ['formschnitt', 'figuren', 'hecke'],
    description: 'Drei Heckenfiguren aus Laub – Hase, Schwan und Spiralkegel – vor einer niedrigen Hecke, mit Kiesweg und Laternen.',
    facets: G(['klassisch', 'fantasy'], ['ueberall'], ['deko']),
    tips: ['Laub ist dauerhaft gesetzt; von Hand platzierte Blätter zerfallen im Spiel nicht.'] },
];
