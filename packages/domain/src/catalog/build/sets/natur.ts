import { Plot, axis, grass, lava, leaves, noise, palmTree, pickle, snow, tallPlant, water, F, T } from '../plot.js';
import type { H, Props } from '../plot.js';
import { bamboo, kelp } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { stableCos, stableHypot, stableSin } from '../../../../../voxel/src/stableMath.js';

/**
 * Naturwunder (Katalog v3): Wasserfall, Felsbogen, Vulkan, Eisberg, Oase,
 * Trauerweide, Riesenfichte, Bambushain, Basaltsäulen, Felsnadeln, Mangrove
 * und Korallenriff. Formen aus Formeln und noise(), ohne Zufallszahlen.
 */

const STEP: Readonly<Record<H, readonly [number, number]>> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
const SIDES: readonly H[] = ['north', 'east', 'south', 'west'];
const OPP: Readonly<Record<H, H>> = { north: 'south', south: 'north', east: 'west', west: 'east' };
const vine = (...faces: (H | 'up')[]): Props => ({ east: faces.includes('east') ? T : F, north: faces.includes('north') ? T : F, south: faces.includes('south') ? T : F, up: faces.includes('up') ? T : F, west: faces.includes('west') ? T : F });
const is = (p: Plot, x: number, y: number, z: number, id: string) => p.get(x, y, z)?.id === `minecraft:${id}`;
/** Highest set y of a column (or -1). */
function topOf(p: Plot, x: number, z: number, maxY: number): number {
  for (let y = maxY; y >= 0; y--) if (p.get(x, y, z)) return y;
  return -1;
}
/** Replaces every block of `from` inside a box using `pick`. */
function recolor(p: Plot, size: readonly [number, number, number], from: string, pick: (x: number, y: number, z: number) => string): void {
  for (let x = 0; x < size[0]; x++) for (let y = 0; y < size[1]; y++) for (let z = 0; z < size[2]; z++)
    if (is(p, x, y, z, from)) { const id = pick(x, y, z); if (id !== from) p.set(x, y, z, id, id === 'basalt' || id === 'polished_basalt' ? axis('y') : {}); }
}

function wasserfall() {
  const W = 13, D = 11, p = new Plot([W, 16, D]);
  const fall = (x: number) => x === 5 || x === 6;
  const pool = (x: number, z: number) => ((x - 5.5) / 3.6) ** 2 + ((z - 7) / 2.6) ** 2 < 1;
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    if (pool(x, z)) { p.set(x, 0, z, 'water', water()); continue; }
    p.set(x, 0, z, 'grass_block', grass());
  }
  const faceOf = (x: number) => fall(x) ? 4 : 3 + (noise(x, 0, 0) > 0.5 ? 1 : 0);
  const rockTop = (x: number, z: number) => Math.round(11 + 1.6 * stableSin(x * 0.6) + noise(x, 1, z) * 1.5 - (z === faceOf(x) ? 1 + noise(x, 2, z) * 2 : 0));
  // the brook runs in a level channel cut below both banks
  let channel = 99;
  for (let z = 0; z <= 4; z++) for (const x of [4, 7]) channel = Math.min(channel, rockTop(x, z) - 1);
  for (let x = 0; x < W; x++) {
    const face = faceOf(x);
    for (let z = 0; z <= face; z++) {
      const top = fall(x) ? channel : rockTop(x, z);
      for (let y = 1; y <= top; y++) {
        const n = noise(x, y, z);
        p.set(x, y, z, z === face && n > 0.6 ? 'mossy_cobblestone' : n > 0.82 ? 'andesite' : n < 0.08 ? 'gravel' : 'stone');
      }
      if (fall(x)) p.set(x, top, z, 'water', water());
      else { p.set(x, top, z, 'grass_block', grass()); if (noise(x, top + 1, z) > 0.75) p.set(x, top + 1, z, 'fern'); }
    }
    if (fall(x)) { const t = topOf(p, x, face, 16); for (let y = 1; y <= t; y++) p.set(x, y, face + 1, 'water', water()); }
    else if (noise(x, 5, face) > 0.4) {
      const t = topOf(p, x, face, 16), len = 2 + Math.floor(noise(x, 6, face) * 4);
      for (let y = t - 1; y >= Math.max(2, t - len); y--) p.set(x, y, face + 1, 'vine', vine('north'));
    }
  }
  // rocks around the pool, plants on the shore
  for (const [x, z] of [[1, 6], [9, 9], [10, 5]] as const) p.blob(x, 1, z, 0.9, 0.6, 0.9, 'mossy_cobblestone', {}, false, (_x, y) => y >= 1);
  for (let x = 0; x < W; x++) for (let z = 5; z < D; z++) {
    if (!is(p, x, 0, z, 'grass_block') || p.has(x, 1, z)) continue;
    const n = noise(x, 1, z);
    if (n > 0.85) tallPlant(p, x, 1, z, 'large_fern'); else if (n > 0.7) p.set(x, 1, z, 'fern'); else if (n > 0.6) p.set(x, 1, z, 'blue_orchid');
  }
  p.set(3, 1, 8, 'lily_pad'); p.set(7, 1, 8, 'lily_pad');
  return p.payload();
}

function felsbogen() {
  const W = 15, D = 7, p = new Plot([W, 14, D]);
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) p.set(x, 0, z, noise(x, 0, z) > 0.75 ? 'gravel' : 'grass_block', noise(x, 0, z) > 0.75 ? {} : grass());
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI, cx = 7 - 5.4 * stableCos(a), cy = 1 + 8.6 * stableSin(a), r = 1.2 + (1 - stableSin(a)) * 0.9;
    p.blob(cx, cy, 3, r, r * 0.9, r, 'stone', {}, false, (x, y, z) => y >= 1 && noise(x, y, z) > 0.07);
  }
  recolor(p, [W, 14, D], 'stone', (x, y, z) => { const b = (y + Math.floor(noise(x, 0, z) * 2)) % 5; return b === 0 ? 'granite' : b === 3 ? 'andesite' : noise(x, y, z) > 0.88 ? 'cobblestone' : 'stone'; });
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    const t = topOf(p, x, z, 13);
    if (t >= 6 && noise(x, t, z) > 0.3) { p.set(x, t, z, 'grass_block', grass()); if (noise(x, t + 1, z) > 0.6) p.set(x, t + 1, z, 'short_grass'); }
    else if (t >= 6 && noise(x, t, z) > 0.15) p.set(x, t + 1, z, 'moss_carpet');
    // vines under the arch
    if (x >= 5 && x <= 9) { let y = 1; while (y < 13 && !p.has(x, y, z)) y++; if (y < 13 && y > 3 && noise(x, y, z) > 0.4) p.set(x, y - 1, z, 'vine', vine('up')); }
  }
  for (const [x, z] of [[0, 1], [14, 5], [2, 6]] as const) p.blob(x, 1, z, 0.8, 0.5, 0.8, 'mossy_cobblestone', {}, false, (_x, y) => y >= 1);
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (is(p, x, 0, z, 'grass_block') && !p.has(x, 1, z) && noise(x, 1, z) > 0.8) p.set(x, 1, z, 'short_grass');
  return p.payload();
}

function vulkan() {
  const S = 17, c = 8, p = new Plot([S, 13, S]);
  const H = 11, top = new Map<string, number>();
  for (let y = 0; y <= H; y++) {
    const r = 8.2 - y * 0.58;
    for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
      const d = stableHypot(x - c, z - c) + (noise(x, y, z) - 0.5) * 1.2;
      if (d > r) continue;
      const craterR = y >= 8 ? 1.6 + (y - 8) * 0.6 : -1;
      if (y >= 9 && d < craterR) continue;
      if (y < 7 && d < r - 2.2 && y > 0) continue; // hollow core, invisible
      const n = noise(x, y * 3, z);
      if (y === 8 && d < craterR) p.set(x, y, z, 'lava', lava());
      else { const id = y >= 8 && n > 0.6 ? 'magma_block' : n > 0.75 ? 'basalt' : n > 0.55 ? 'tuff' : n > 0.08 ? 'blackstone' : 'magma_block'; p.set(x, y, z, id, id === 'basalt' ? axis('y') : {}); }
      const k = `${x},${z}`; top.set(k, Math.max(top.get(k) ?? -1, y));
    }
  }
  // close the crater lake so the lava cannot run out sideways
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) if (is(p, x, 8, z, 'lava'))
    for (const f of SIDES) { const [dx, dz] = STEP[f]; if (!p.has(x + dx, 8, z + dz)) p.set(x + dx, 8, z + dz, 'blackstone'); }
  // lava flow down the south flank, framed by obsidian where it cooled
  for (let z = c + 2; z < S; z++) {
    const t = top.get(`${c},${z}`); if (t === undefined || t < 1) continue;
    p.set(c, t, z, 'lava', lava());
    for (const dx of [-1, 1]) { const tt = top.get(`${c + dx},${z}`); if (tt !== undefined && tt >= 1) p.set(c + dx, tt, z, noise(c + dx, tt, z) > 0.5 ? 'obsidian' : 'magma_block'); }
  }
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) if (!p.has(x, 0, z)) p.set(x, 0, z, noise(x, 0, z) > 0.6 ? 'coarse_dirt' : 'gravel');
  return p.payload();
}

function eisberg() {
  const S = 13, p = new Plot([S, 16, S]);
  const keep = (x: number, y: number, z: number) => noise(x, y, z) > 0.1;
  p.blob(6, 2, 6, 4.5, 2.6, 4, 'packed_ice', {}, false, keep);
  p.blob(5, 7, 5, 1.8, 4.5, 1.6, 'packed_ice', {}, false, keep);
  p.blob(8, 6, 7, 1.4, 3.2, 1.4, 'packed_ice', {}, false, keep);
  p.blob(4, 11, 5, 0.9, 2.6, 0.9, 'packed_ice', {}, false, keep);
  recolor(p, [S, 16, S], 'packed_ice', (x, y, z) => noise(x, y + 40, z) > 0.82 ? 'blue_ice' : y <= 1 && noise(x, y, z) > 0.6 ? 'ice' : 'packed_ice');
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const t = topOf(p, x, z, 15);
    if (t >= 3 && noise(x, 50, z) > 0.35) { p.set(x, t, z, 'snow_block'); if (noise(x, 51, z) > 0.5) p.set(x, t + 1, z, 'snow', snow(1 + Math.floor(noise(x, 52, z) * 3))); }
    for (let y = 0; y <= 1; y++) if (!p.has(x, y, z)) p.set(x, y, z, 'water', water());
  }
  return p.payload();
}

function oase() {
  const W = 15, D = 13, p = new Plot([W, 10, D]);
  const d = (x: number, z: number) => ((x - 7) / 3.8) ** 2 + ((z - 6.5) / 2.8) ** 2 + (noise(x, 0, z) - 0.5) * 0.25;
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    const v = d(x, z);
    p.set(x, 0, z, v < 1 ? 'water' : v < 1.9 ? 'grass_block' : 'sand', v < 1 ? water() : v < 1.9 ? grass() : {});
  }
  palmTree(p, 2, 1, 3, 6); palmTree(p, 10, 1, 9, 7); palmTree(p, 9, 1, 3, 5);
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    if (p.has(x, 1, z)) continue;
    const g = p.get(x, 0, z)?.id, n = noise(x, 1, z);
    const shore = SIDES.some(f => { const [dx, dz] = STEP[f]; return is(p, x + dx, 0, z + dz, 'water'); });
    if (g === 'minecraft:grass_block') {
      if (shore && n > 0.6) { p.set(x, 1, z, 'sugar_cane', { age: '0' }); p.set(x, 2, z, 'sugar_cane', { age: '0' }); }
      else if (n > 0.75) tallPlant(p, x, 1, z, 'large_fern'); else if (n > 0.5) p.set(x, 1, z, 'fern'); else if (n > 0.4) p.set(x, 1, z, 'short_grass');
    } else if (g === 'minecraft:sand' && n > 0.9) p.set(x, 1, z, 'dead_bush');
  }
  for (const [x, z, h] of [[13, 12, 3], [0, 11, 2], [14, 0, 2]] as const) {
    if (SIDES.some(f => { const [dx, dz] = STEP[f]; return p.has(x + dx, 1, z + dz); })) continue;
    p.fill(x, 1, z, x, h, z, 'cactus', { age: '0' });
  }
  p.set(6, 1, 6, 'lily_pad');
  return p.payload();
}

function trauerweide() {
  const S = 13, p = new Plot([S, 13, S]);
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const pond = ((x - 10) / 2.3) ** 2 + ((z - 10) / 2) ** 2 < 1;
    p.set(x, 0, z, pond ? 'water' : 'grass_block', pond ? water() : grass());
  }
  p.blob(6, 8, 6, 4.6, 2.2, 4.6, 'oak_leaves', leaves(), false, (x, y, z) => y >= 7 && noise(x, y, z) > 0.1);
  p.fill(6, 1, 6, 6, 8, 6, 'oak_log', axis('y'));
  for (const f of SIDES) {
    const [dx, dz] = STEP[f];
    p.set(6 + dx, 1, 6 + dz, 'oak_log', axis('y'));
    p.set(6 + dx, 6, 6 + dz, 'oak_log', axis(dx ? 'x' : 'z')); p.set(6 + 2 * dx, 7, 6 + 2 * dz, 'oak_log', axis(dx ? 'x' : 'z'));
  }
  // hanging curtains of vines along the lower crown edge
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) for (let y = 7; y <= 8; y++) {
    if (!is(p, x, y, z, 'oak_leaves') || p.has(x, y - 1, z)) continue;
    for (const f of SIDES) {
      const [dx, dz] = STEP[f], nx = x + dx, nz = z + dz;
      if (!p.inside(nx, y, nz) || p.has(nx, y, nz) || p.has(nx, y - 1, nz) || noise(nx, y, nz) < 0.25) continue;
      const len = 2 + Math.floor(noise(nx, 20, nz) * 5);
      for (let yy = y; yy >= Math.max(1, y - len); yy--) { if (p.has(nx, yy, nz)) break; p.set(nx, yy, nz, 'vine', vine(OPP[f])); }
    }
  }
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) if (is(p, x, 0, z, 'grass_block') && !p.has(x, 1, z) && noise(x, 1, z) > 0.78) p.set(x, 1, z, noise(x, 2, z) > 0.5 ? 'fern' : 'short_grass');
  p.set(10, 1, 10, 'lily_pad');
  return p.payload();
}

function riesenfichte() {
  const S = 13, p = new Plot([S, 30, S]);
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const n = noise(x, 0, z);
    p.set(x, 0, z, n > 0.72 ? 'coarse_dirt' : n > 0.45 ? 'grass_block' : 'podzol', n > 0.72 ? {} : grass());
  }
  const TOP = 25;
  for (let y = 7; y <= TOP; y++) {
    const base = ((TOP + 1 - y) / (TOP - 6)) * 5.4, r = (y % 3 === 0) ? base : base * 0.55;
    if (r >= 0.6) p.disc(6.5, 6.5, y, r, 'spruce_leaves', leaves());
  }
  p.fill(6, TOP + 1, 6, 7, TOP + 1, 7, 'spruce_leaves', leaves()); p.set(6, TOP + 2, 6, 'spruce_leaves', leaves()); p.set(6, TOP + 3, 6, 'spruce_leaves', leaves());
  p.fill(6, 1, 6, 7, TOP - 1, 7, 'spruce_log', axis('y'));
  for (const [x, z, h] of [[5, 6, 2], [8, 7, 1], [6, 5, 1], [7, 8, 2], [5, 7, 1], [8, 6, 2]] as const) p.fill(x, 1, z, x, h, z, 'spruce_log', axis('y'));
  for (const [x, z] of [[1, 2], [11, 10], [2, 10]] as const) p.blob(x, 1, z, 1, 0.7, 0.9, 'mossy_cobblestone', {}, false, (_x, y) => y >= 1);
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    if (p.has(x, 1, z) || is(p, x, 0, z, 'coarse_dirt')) continue;
    const n = noise(x, 1, z);
    if (n > 0.86) tallPlant(p, x, 1, z, 'large_fern'); else if (n > 0.7) p.set(x, 1, z, 'fern'); else if (n > 0.66) p.set(x, 1, z, 'brown_mushroom');
  }
  return p.payload();
}

function bambushain() {
  const S = 11, p = new Plot([S, 16, S]);
  const pathX = (z: number) => Math.round(5 + 2 * stableSin(z * 0.55));
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const onPath = Math.abs(x - pathX(z)) <= 0;
    p.set(x, 0, z, onPath ? 'coarse_dirt' : noise(x, 0, z) > 0.5 ? 'podzol' : 'grass_block', onPath ? {} : grass());
    if (onPath || Math.abs(x - pathX(z)) === 1) continue;
    if (noise(x, 3, z) > 0.5) {
      const h = 6 + Math.floor(noise(x, 4, z) * 8);
      for (let y = 1; y <= h; y++) p.set(x, y, z, 'bamboo', bamboo(y >= h - 1 ? 'large' : y === h - 2 ? 'small' : 'none'));
    } else if (noise(x, 5, z) > 0.75) p.set(x, 1, z, 'fern');
  }
  for (let z = 0; z < S; z++) for (const s of [-1, 1]) { const x = pathX(z) + s; if (p.inside(x, 1, z) && !p.has(x, 1, z) && noise(x, 6, z) > 0.6) tallPlant(p, x, 1, z, 'large_fern'); }
  p.blob(9, 1, 1, 0.8, 0.5, 0.8, 'mossy_cobblestone', {}, false, (_x, y) => y >= 1);
  return p.payload();
}

function basaltfeld() {
  const W = 13, D = 11, p = new Plot([W, 10, D]);
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    const cz = Math.floor(z / 2), cx = Math.floor((x + (cz % 2)) / 2);
    const lift = Math.max(0, 1 - stableHypot(x - 4, z - 3) / 8);
    const h = Math.round(lift * 6 + noise(cx, 0, cz) * 2.4 - (z >= 8 ? 1.5 : 0));
    for (let y = 0; y <= Math.max(0, h); y++) p.set(x, y, z, y === h ? (noise(cx, 1, cz) > 0.5 ? 'polished_basalt' : 'smooth_basalt') : 'basalt', y === h && noise(cx, 1, cz) <= 0.5 ? {} : axis('y'));
    if (h < 2 && z >= 6) for (let y = Math.max(0, h) + 1; y <= 2; y++) p.set(x, y, z, 'water', water());
  }
  return p.payload();
}

function felsnadeln() {
  const S = 13, p = new Plot([S, 15, S]);
  const bands = ['terracotta', 'orange_terracotta', 'yellow_terracotta', 'white_terracotta', 'orange_terracotta', 'red_terracotta', 'brown_terracotta', 'light_gray_terracotta', 'orange_terracotta'];
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) p.set(x, 0, z, noise(x, 0, z) > 0.8 ? 'coarse_dirt' : 'red_sand');
  for (const [cx, cz, h, r0] of [[3, 3, 9, 2], [9, 4, 12, 2.4], [6, 10, 7, 1.6]] as const) {
    p.blob(cx, 1, cz, r0 + 1, 1, r0 + 1, 'red_sand', {}, false, (x, y, z) => y === 1 && noise(x, y, z) > 0.3);
    for (let y = 1; y <= h; y++) {
      const r = r0 * (1 - 0.4 * (y / h)) + (y === h ? 0.8 : 0);
      for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
        if (stableHypot(x - cx, z - cz) > r + (noise(x, y, z) - 0.5) * 0.8) continue;
        p.set(x, y, z, y === h ? 'red_sandstone' : bands[Math.floor((y + (noise(x, 0, z) > 0.85 ? 1 : 0)) / 1.5) % bands.length]!);
      }
    }
  }
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    if (p.has(x, 1, z) || !is(p, x, 0, z, 'red_sand')) continue;
    if (noise(x, 1, z) > 0.88) p.set(x, 1, z, 'dead_bush');
  }
  for (const [x, z, h] of [[11, 11, 3], [1, 8, 2]] as const) if (!SIDES.some(f => { const [dx, dz] = STEP[f]; return p.has(x + dx, 1, z + dz); })) { p.set(x, 0, z, 'red_sand'); p.fill(x, 1, z, x, h, z, 'cactus', { age: '0' }); }
  return p.payload();
}

function mangrove() {
  const S = 13, p = new Plot([S, 15, S]);
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const d = stableHypot(x - 6, z - 6), wet = d > 3 && noise(x, 0, z) > 0.55;
    p.set(x, 0, z, wet ? 'water' : d < 2.5 ? 'muddy_mangrove_roots' : 'mud', wet ? water() : d < 2.5 ? axis('y') : {});
  }
  // raised trunk on prop roots
  p.fill(6, 1, 6, 6, 3, 6, 'mangrove_roots');
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) {
    const reach = dx && dz ? 2 : 3;
    for (let i = 1; i <= reach; i++) p.set(6 + dx * i, Math.max(1, 4 - i), 6 + dz * i, 'mangrove_roots');
    p.set(6 + dx * reach, 1, 6 + dz * reach, 'mangrove_roots');
  }
  p.blob(6, 11, 6, 4, 1.8, 4, 'mangrove_leaves', leaves(), false, (x, y, z) => noise(x, y, z) > 0.1);
  p.blob(3, 10, 8, 2.2, 1.2, 2.2, 'mangrove_leaves', leaves(), false, (x, y, z) => noise(x, y, z) > 0.15);
  p.fill(6, 4, 6, 6, 11, 6, 'mangrove_log', axis('y'));
  p.set(5, 9, 7, 'mangrove_log', axis('x')); p.set(4, 10, 8, 'mangrove_log', axis('y'));
  p.set(7, 10, 6, 'mangrove_log', axis('x')); p.set(8, 10, 5, 'mangrove_log', axis('z'));
  // vines and moss
  for (const [x, z, f] of [[5, 6, 'east'], [7, 6, 'west']] as const) for (let y = 5; y <= 8; y++) if (noise(x, y, z) > 0.35) p.set(x, y, z, 'vine', vine(f));
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    if (p.has(x, 1, z)) continue;
    const g = p.get(x, 0, z)?.id, n = noise(x, 1, z);
    if (g === 'minecraft:water' && n > 0.7) p.set(x, 1, z, 'lily_pad');
    else if (g === 'minecraft:mud' && n > 0.75) p.set(x, 1, z, 'moss_carpet');
  }
  return p.payload();
}

function korallenriff() {
  const W = 11, D = 9, TOPY = 6, p = new Plot([W, TOPY + 1, D]);
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) p.set(x, 0, z, noise(x, 0, z) > 0.8 ? 'gravel' : 'sand');
  const kinds = ['brain', 'tube', 'bubble', 'fire', 'horn'];
  const clusters: [number, number, number, number, number, number][] = [[3, 1, 3, 1.8, 1.4, 1.6], [7, 1, 5, 1.6, 2.2, 1.4], [5, 1, 7, 1.2, 0.8, 1.2], [9, 1, 2, 1, 1.2, 1]];
  clusters.forEach(([x, y, z, rx, ry, rz], i) => p.blob(x, y, z, rx, ry, rz, `${kinds[i]}_coral_block`, {}, false, (bx, by, bz) => by >= 1 && noise(bx, by, bz) > 0.12));
  p.fill(1, 1, 7, 1, 2, 7, 'horn_coral_block');
  // coral, fans and sea pickles on top, kelp and seagrass on the sand
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    const t = topOf(p, x, z, TOPY), n = noise(x, 9, z);
    if (t >= 1) {
      const kind = p.get(x, t, z)!.id.slice(10).replace('_coral_block', '');
      if (t < TOPY && n > 0.7) p.set(x, t + 1, z, 'sea_pickle', pickle(1 + Math.floor(n * 13) % 4));
      else if (t < TOPY && n > 0.35) p.set(x, t + 1, z, n > 0.55 ? `${kind}_coral_fan` : `${kind}_coral`);
    } else if (n > 0.82) {
      const h = 3 + Math.floor(noise(x, 10, z) * 3);
      for (let y = 1; y < h; y++) p.set(x, y, z, 'kelp_plant');
      p.set(x, h, z, 'kelp', kelp(20));
    } else if (n > 0.5) p.set(x, 1, z, 'seagrass');
  }
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) for (let y = 1; y <= TOPY; y++) if (!p.has(x, y, z)) p.set(x, y, z, 'water', water());
  return p.payload();
}

const N = (stil: string[], biom: string[], funktion: string[] = ['deko']) => ({ kategorie: ['landschaft'], stil, biom, funktion });

export const NATUR_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_natur_wasserfall', name: 'Wasserfall an Felswand', payload: wasserfall, tags: ['wasserfall', 'fels', 'becken'],
    description: 'Bemooste Felswand mit Bachrinne oben, zwei Blöcke breitem Wasserfall, Ranken an der Wand und einem Becken mit Seerosen und Farnen.',
    facets: N(['rustikal', 'fantasy'], ['gebirge', 'wald', 'dschungel'], ['deko', 'wasserquelle']), gaps: ['minecraft:water'],
    tips: ['Im Spiel genügt oben eine Quellreihe – das fallende Wasser entsteht von selbst.'] },
  { id: 'bld_natur_felsbogen', name: 'Felsbogen', payload: felsbogen, tags: ['bogen', 'fels', 'gestein'],
    description: 'Natürlicher Steinbogen mit Granit- und Andesitschichten, begrüntem Scheitel, Moos, hängenden Ranken und Geröll an den Füßen.',
    facets: N(['rustikal', 'fantasy'], ['gebirge', 'ebene', 'kueste']) },
  { id: 'bld_natur_vulkan', name: 'Kleiner Vulkan', payload: vulkan, tags: ['vulkan', 'lava', 'krater'],
    description: 'Kegel aus Schwarzstein, Basalt, Tuff und Magma mit Lavasee im Krater und einem Lavastrom, der an der Südflanke herabläuft.',
    facets: N(['fantasy'], ['gebirge', 'ueberall']), gaps: ['minecraft:lava'],
    tips: ['Lava setzt brennbare Blöcke in der Nähe in Brand – Holz und Laub fernhalten.'], inspiration: [WIKI('Lava', 'Lava')] },
  { id: 'bld_natur_eisberg', name: 'Eisberg', payload: eisberg, tags: ['eis', 'meer', 'spitzen'],
    description: 'Eisberg aus Packeis mit blauen Eisadern, mehreren Spitzen und Schneekappen, im zwei Blöcke tiefen Wasser.',
    facets: N(['nordisch', 'fantasy'], ['schnee', 'ozean']), gaps: ['minecraft:water'],
    tips: ['Packeis und blaues Eis schmelzen nicht – normales Eis neben Licht schon.'], inspiration: [WIKI('Blue_Ice', 'Blaues Eis')] },
  { id: 'bld_natur_oase', name: 'Wüstenoase', payload: oase, tags: ['oase', 'palmen', 'wüste'],
    description: 'Wasserloch mitten im Sand mit Grasrand, drei Palmen, Zuckerrohr, Farnen, Kakteen und toten Büschen.',
    facets: N(['tropisch', 'wuestenstil'], ['wueste']), gaps: ['minecraft:water'],
    tips: ['Kakteen dürfen keine Blöcke direkt neben sich haben, sonst brechen sie ab.'] },
  { id: 'bld_natur_trauerweide', name: 'Trauerweide', payload: trauerweide, tags: ['baum', 'ranken', 'teich'],
    description: 'Breite Eiche mit flacher Schirmkrone, aus der dichte Rankenvorhänge bis fast zum Boden hängen, daneben ein kleiner Teich.',
    facets: N(['rustikal', 'fantasy'], ['sumpf', 'ebene', 'wald']), gaps: ['minecraft:water'],
    tips: ['Ranken wachsen nur nach unten weiter, wenn sie an einer Seite haften – deshalb hängen sie hier am Kronenrand.'], inspiration: [WIKI('Vines', 'Ranken')] },
  { id: 'bld_natur_riesenfichte', name: 'Riesenfichte', payload: riesenfichte, tags: ['baum', 'riesig', 'taiga'],
    description: 'Fast 30 Blöcke hohe Fichte mit 2×2-Stamm, Wurzelansätzen, gestuften Zweigringen, Podsolboden, Farnen und bemoosten Steinen.',
    facets: N(['nordisch', 'rustikal'], ['taiga']), inspiration: [WIKI('Spruce', 'Fichte')],
    tips: ['Vier Fichtensetzlinge im Quadrat wachsen im Spiel zu einer Riesenfichte heran.'] },
  { id: 'bld_natur_bambushain', name: 'Bambushain', payload: bambushain, tags: ['bambus', 'hain', 'pfad'],
    description: 'Dichter Bambuswald mit unterschiedlich hohen Halmen samt Blattkronen, einem gewundenen Pfad, Farnen und einem moosigen Stein.',
    facets: N(['fernoestlich', 'tropisch'], ['dschungel', 'kirschhain']), inspiration: [WIKI('Bamboo', 'Bambus')] },
  { id: 'bld_natur_basaltfeld', name: 'Basaltsäulenfeld', payload: basaltfeld, tags: ['basalt', 'säulen', 'küste'],
    description: 'Gestaffelte Basaltsäulen in versetzten Zweiergruppen mit polierten und glatten Köpfen, die zum Wasser hin abfallen.',
    facets: N(['fantasy'], ['kueste', 'gebirge', 'nether']), gaps: ['minecraft:water'] },
  { id: 'bld_natur_felsnadeln', name: 'Tafelberg-Felsnadeln', payload: felsnadeln, tags: ['terrakotta', 'schichten', 'tafelberg'],
    description: 'Drei Felsnadeln aus gebänderter Terrakotta mit Rotsandstein-Kappen auf rotem Sand, dazu Kakteen und tote Büsche.',
    facets: N(['wuestenstil'], ['badlands']), inspiration: [WIKI('Badlands', 'Tafelberge')] },
  { id: 'bld_natur_mangrove', name: 'Mangrovenbaum mit Luftwurzeln', payload: mangrove, tags: ['mangrove', 'wurzeln', 'sumpf'],
    description: 'Mangrove auf einem Gewirr aus Luftwurzeln über Schlamm und Wasserlöchern, mit breiter Krone, Ranken, Seerosen und Moos.',
    facets: N(['tropisch', 'rustikal'], ['sumpf']), gaps: ['minecraft:water'], inspiration: [WIKI('Mangrove_Swamp', 'Mangrovensumpf')] },
  { id: 'bld_natur_korallenriff', name: 'Korallenriff-Stück', payload: korallenriff, tags: ['koralle', 'unterwasser', 'riff'],
    description: 'Riffstück aus fünf Korallenarten mit Fächern, Seegurken, Seetang und Seegras auf Sandgrund, komplett unter Wasser.',
    facets: N(['tropisch', 'fantasy'], ['ozean']), gaps: ['minecraft:water'],
    tips: ['Korallen sterben außerhalb von Wasser – zuerst das Becken fluten, dann setzen, oder mit Behutsamkeit abbauen.'], inspiration: [WIKI('Coral_Reef', 'Korallenriff')] },
];
