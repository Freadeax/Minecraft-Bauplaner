// SPLIT-01-S05: a real base for the „Herauslösen“ acceptance, built in the running game (Fabric client game test,
// scripts/size/test_grossbau_ingame.sh). There is no base file from Philipp yet, so the test builds one into a real
// Minecraft world – catalogue houses, a smithy, two wheat fields, a pen, a path network, a cellar under a house,
// a bunker under the meadow and a bridge from house to house over a stream – and records it with the mod
// (GET /v1/box, every block of the loaded chunks, natural terrain and trees around included).
//   commands()           – game commands relative to the anchor (ground block = 0/0/0), bottom-up
//   expected             – what „Gebäude herauslösen“ must find
//   recordBox()          – box (relative, max exclusive) the mod records
//   toLitematic(box)     – the recorded GET /v1/box answer as .litematic, as Litematica would save it
import { createBuildingLibrary } from '../../dist/domain/src/index.js';
import { writeLitematic } from '../../dist/formats/src/index.js';
import { adoptPayload } from '../../dist/voxel/src/index.js';

export const AREA = { width: 80, length: 64 };
/** Margin of untouched world around the base in the recording. */
export const MARGIN = 10;
const FILL_MAX = 32_768;

export const HOUSES = [
  { id: 'bld_starterhaus_oak', at: [6, 6], name: 'Haus Nord' },
  { id: 'bld_schmiede', at: [6, 42], name: 'Schmiede' },
  { id: 'bld_werkstatt_bibliothekar', at: [52, 6], name: 'Bibliothek' },
];

/** What the split must find in the recording (checked by grossbau_verify.mjs and the browser test). */
export const expected = {
  houses: 3,
  fields: 2,
  pens: 1,
  bridge: { connects: 2 },
  underground: 1,
  cellarUnder: 'Haus Nord',
};

/** `fill` commands in slices the game accepts (32 768 blocks per command). */
function fill(out, x0, y0, z0, x1, y1, z1, state) {
  const w = x1 - x0 + 1, l = z1 - z0 + 1;
  const layers = Math.max(1, Math.floor(FILL_MAX / (w * l)));
  if (layers >= 1 && w * l <= FILL_MAX) {
    for (let y = y0; y <= y1; y += layers) out.push(`fill ${x0} ${y} ${z0} ${x1} ${Math.min(y1, y + layers - 1)} ${z1} ${state}`);
  } else for (let x = x0; x <= x1; x += 16) fill(out, x, y0, z0, Math.min(x1, x + 15), y1, z1, state);
}
const stateText = s => s.id + (Object.keys(s.properties).length ? `[${Object.entries(s.properties).map(([k, v]) => `${k}=${v}`).join(',')}]` : '');
/** Hollow box: walls/floor/ceiling of `state`, air inside. */
function room(out, x0, y0, z0, x1, y1, z1, state) {
  fill(out, x0, y0, z0, x1, y1, z1, state);
  fill(out, x0 + 1, y0 + 1, z0 + 1, x1 - 1, y1 - 1, z1 - 1, 'minecraft:air');
}

/** Commands relative to the anchor; the game test adds the anchor to every coordinate. */
export async function commands() {
  const lib = await createBuildingLibrary();
  const out = [];
  const { width: W, length: L } = AREA;
  // Clear the site: air above, meadow on top, dirt below (what a player does before building a base).
  fill(out, 0, 1, 0, W - 1, 30, L - 1, 'minecraft:air');
  fill(out, 0, -4, 0, W - 1, -1, L - 1, 'minecraft:dirt');
  fill(out, 0, 0, 0, W - 1, 0, L - 1, 'minecraft:grass_block');
  // A stream across the site (z 28–33), two blocks deep.
  fill(out, 0, -2, 28, W - 1, 0, 33, 'minecraft:water');
  // Cellar under „Haus Nord“ (house 9 × 9 at 6/6), one block wider than the house, chest inside.
  room(out, 5, -6, 5, 15, -1, 15, 'minecraft:stone_bricks');
  out.push('setblock 10 -5 10 minecraft:chest[facing=north]');
  out.push('setblock 11 -5 7 minecraft:barrel[facing=up]');
  // Bunker under the meadow, away from every house.
  room(out, 60, -9, 18, 70, -3, 26, 'minecraft:deepslate_bricks');
  out.push('setblock 65 -8 22 minecraft:chest[facing=south]');
  out.push('setblock 64 -8 22 minecraft:crafting_table');
  // Houses from the catalogue, ground layer at y 0, bottom-up so every block has its support.
  for (const h of HOUSES) {
    const p = lib.versions.find(v => v.assetId === h.id).payload;
    const cells = p.cells.filter(c => c.kind === 'block').sort((a, b) => a.position[1] - b.position[1]);
    for (const c of cells) out.push(`setblock ${h.at[0] + c.position[0] - p.bounds.min[0]} ${c.position[1] - p.bounds.min[1]} ${h.at[1] + c.position[2] - p.bounds.min[2]} ${stateText(p.palette[c.paletteIndex])}`);
  }
  // Two wheat fields (9 × 9 farmland around a water block) with a fence.
  for (const [fx, fz] of [[28, 6], [28, 42]]) {
    fill(out, fx - 1, 1, fz - 1, fx + 9, 1, fz + 9, 'minecraft:oak_fence');
    fill(out, fx, 1, fz, fx + 8, 1, fz + 8, 'minecraft:air');
    fill(out, fx, 0, fz, fx + 8, 0, fz + 8, 'minecraft:farmland[moisture=7]');
    out.push(`setblock ${fx + 4} 0 ${fz + 4} minecraft:water`);
    for (let x = fx; x <= fx + 8; x++) for (let z = fz; z <= fz + 8; z++) if (!(x === fx + 4 && z === fz + 4)) out.push(`setblock ${x} 1 ${z} minecraft:wheat[age=7]`);
    out.push(`setblock ${fx + 4} 1 ${fz - 1} minecraft:oak_fence_gate[facing=north]`);
  }
  // A sheep pen (spruce fence 12 × 10, gate to the path).
  fill(out, 54, 1, 42, 65, 1, 51, 'minecraft:spruce_fence');
  fill(out, 55, 1, 43, 64, 1, 50, 'minecraft:air');
  out.push('setblock 59 1 42 minecraft:spruce_fence_gate[facing=north]');
  out.push('setblock 59 1 46 minecraft:hay_block');
  // Path network: north row z 17, south row z 39, a lane east of the fields (x 46) with its own small bridge over the stream.
  fill(out, 4, 0, 17, 70, 0, 18, 'minecraft:dirt_path');
  fill(out, 4, 0, 39, 70, 0, 40, 'minecraft:dirt_path');
  fill(out, 46, 0, 17, 47, 0, 27, 'minecraft:dirt_path');
  fill(out, 46, 0, 34, 47, 0, 40, 'minecraft:dirt_path');
  fill(out, 46, 1, 27, 47, 1, 34, 'minecraft:spruce_slab[type=bottom]');
  // Bridge from „Haus Nord“ (south wall z 14) to the smithy (north wall z 42) over the stream, deck at y 3, railings.
  fill(out, 9, 3, 15, 11, 3, 41, 'minecraft:spruce_planks');
  fill(out, 9, 4, 15, 9, 4, 41, 'minecraft:spruce_fence');
  fill(out, 11, 4, 15, 11, 4, 41, 'minecraft:spruce_fence');
  for (const z of [16, 26, 35]) fill(out, 9, 1, z, 9, 2, z, 'minecraft:spruce_log');
  // A few lanterns along the paths.
  for (const x of [20, 40, 66]) { out.push(`setblock ${x} 1 19 minecraft:oak_fence`); out.push(`setblock ${x} 2 19 minecraft:lantern`); }
  return out;
}

/** Recorded box relative to the anchor (max exclusive): the site plus a margin of untouched world. */
export function recordBox() {
  return { min: [-MARGIN, -12, -MARGIN], maxExclusive: [AREA.width + MARGIN, 24, AREA.length + MARGIN] };
}

/** The game's `GET /v1/box` answer (readLiveBox) as a .litematic, origin at the box's minimum. */
export async function toLitematic(box, name = 'Basis aus dem Spieltest') {
  const [W, H, L] = [0, 1, 2].map(i => box.maxExclusive[i] - box.min[i]);
  const parse = s => { const m = /^([^[]+)(?:\[(.*)\])?$/.exec(s); return { id: m[1], properties: Object.fromEntries((m[2] ? m[2].split(',') : []).map(kv => kv.split('='))) }; };
  const AIRS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
  const keep = box.palette.map(s => !AIRS.has(parse(s).id));
  const used = new Map(), palette = [], cells = [];
  for (let i = 0; i < box.data.length; i++) {
    const v = box.data[i];
    if (!keep[v]) continue;
    let pi = used.get(v);
    if (pi === undefined) { pi = palette.length; used.set(v, pi); palette.push(parse(box.palette[v])); }
    const x = i % W, z = Math.floor(i / W) % L, y = Math.floor(i / (W * L));
    cells.push({ position: [x, y, z], kind: 'block', paletteIndex: pi });
  }
  const payload = adoptPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [0, 0, 0], maxExclusive: [W, H, L] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
  const out = await writeLitematic(payload, { dataVersion: 5023, anchor: 'min-corner', unselected: 'air', regionName: 'Basis', metadata: { name, author: 'Bauplaner-Spieltest', date: 0 } });
  return { bytes: out.bytes, payload };
}
