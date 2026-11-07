// SIZE-01-S05: a real big build for the automatic acceptance of DATEI-05, WERK-07, MOD-11 and LIVE-02.
// „Großstadt“: every catalogue building up to 30 blocks high, several times, packed in streets on a
// stone/dirt/grass ground plate – real block states, block entities (chests, signs, banners), stairs, doors.
//   node scripts/size/big_build.mjs <dir> [--ground <layers>] [--side <blocks>]
// writes <dir>/grossstadt.litematic, <dir>/grossstadt.json (blocks, box, palette, sha256) and
// <dir>/zu-gross.litematic (4.2 million blocks – the planner must refuse it with a clear message).
// Default (2 ground layers, 600 × 600) ≈ 1.5 million blocks in an 11.5 million cell box; `--ground 8`
// ≈ 3.7 million blocks, near the 4 million limit. Needs `npm run build:core`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { buildLitematic, writeLitematic, writeNbt } from '../../dist/formats/src/index.js';
import { createBuildingLibrary } from '../../dist/domain/src/index.js';
import { adoptPayload } from '../../dist/voxel/src/index.js';

/** DataVersion of Minecraft 26.3. */
export const DATA_VERSION = 5023;
const MAX_HEIGHT = 30, STREET = 3;

/**
 * Builds the city as a voxel payload. Deterministic: same options, same blocks.
 * @returns {{ payload: import('../../dist/voxel/src/index.js').VoxelPayload, buildings: number, copies: number }}
 */
export async function buildCity({ side = 600, ground = 2 } = {}) {
  const lib = await createBuildingLibrary();
  const sources = lib.versions.map(v => v.payload).filter(p => p.bounds.maxExclusive[1] - p.bounds.min[1] <= MAX_HEIGHT)
    .sort((a, b) => (b.bounds.maxExclusive[2] - b.bounds.min[2]) - (a.bounds.maxExclusive[2] - a.bounds.min[2]));
  const palette = [], index = new Map();
  const pal = state => {
    const key = state.id + JSON.stringify(Object.entries(state.properties).sort());
    let i = index.get(key);
    if (i === undefined) { i = palette.length; palette.push(state); index.set(key, i); }
    return i;
  };
  const grass = pal({ id: 'minecraft:grass_block', properties: { snowy: 'false' } }), dirt = pal({ id: 'minecraft:dirt', properties: {} });
  const stone = pal({ id: 'minecraft:stone', properties: {} }), street = pal({ id: 'minecraft:stone_bricks', properties: {} });
  // Shelf packing: rows along x, a street between buildings and rows; the top layer of the ground is grass or street.
  const top = new Uint8Array(side * side); // 0 grass, 1 street
  const cells = [], blockEntities = [];
  let x = STREET, z = STREET, rowDepth = 0, placed = 0, copies = 0;
  outer: for (;;) {
    copies++;
    for (const p of sources) {
      const w = p.bounds.maxExclusive[0] - p.bounds.min[0], l = p.bounds.maxExclusive[2] - p.bounds.min[2];
      if (x + w + STREET > side) { x = STREET; z += rowDepth + STREET; rowDepth = 0; }
      if (z + l + STREET > side) break outer;
      const ox = x - p.bounds.min[0], oy = ground - p.bounds.min[1], oz = z - p.bounds.min[2];
      const local = p.palette.map(pal);
      for (const c of p.cells) {
        if (c.kind !== 'block') continue;
        cells.push({ position: [c.position[0] + ox, c.position[1] + oy, c.position[2] + oz], kind: 'block', paletteIndex: local[c.paletteIndex] });
      }
      for (const be of p.blockEntities) blockEntities.push({ ...be, position: [be.position[0] + ox, be.position[1] + oy, be.position[2] + oz] });
      placed++;
      x += w + STREET;
      rowDepth = Math.max(rowDepth, l);
    }
  }
  // Streets: every column not under a building lot gets stone bricks on top where a building row has its street.
  for (let zz = 0; zz < side; zz++) for (let xx = 0; xx < side; xx++) if (xx % 50 < STREET || zz % 50 < STREET) top[zz * side + xx] = 1;
  const occupied = new Set();
  for (const c of cells) if (c.position[1] === ground) occupied.add(c.position[2] * side + c.position[0]);
  for (let y = 0; y < ground; y++) for (let zz = 0; zz < side; zz++) for (let xx = 0; xx < side; xx++) {
    const k = zz * side + xx;
    const id = y === ground - 1 ? (top[k] && !occupied.has(k) ? street : grass) : y === 0 && ground > 2 ? stone : dirt;
    cells.push({ position: [xx, y, zz], kind: 'block', paletteIndex: id });
  }
  let maxY = ground;
  for (const c of cells) if (c.position[1] + 1 > maxY) maxY = c.position[1] + 1;
  const payload = adoptPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [0, 0, 0], maxExclusive: [side, maxY, side] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette, cells, blockEntities }, { maxCells: 8_000_000 });
  return { payload, buildings: placed, copies };
}

/**
 * Too big on purpose: a 530 × 15 × 530 stone slab, 4.2 million blocks. The planner's own writer refuses models over
 * 4 million cells, so a one-block file of that box is written and its block array filled afterwards (2 bits per
 * entry, every entry = stone) – exactly what a real Litematica file of that slab contains.
 */
function tooBig() {
  const [W, H, L] = [530, 15, 530];
  const payload = adoptPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [0, 0, 0], maxExclusive: [W, H, L] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [{ id: 'minecraft:stone', properties: {} }], cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }], blockEntities: [] });
  const { nbt, report } = buildLitematic(payload, { dataVersion: DATA_VERSION, anchor: 'min-corner', unselected: 'air', regionName: 'Zu gross' });
  if (report.bitsPerEntry !== 2) throw new Error(`unerwartete Bits je Eintrag: ${report.bitsPerEntry}`);
  const region = nbt.tag.value.Regions.value['Zu gross'].value;
  const longs = Math.ceil(W * H * L * 2 / 64), full = (0x5555555555555555n).toString(), rest = W * H * L * 2 % 64;
  region.BlockStates.value = Array.from({ length: longs }, (_, i) => i === longs - 1 && rest ? ((1n << BigInt(rest)) - 1n & 0x5555555555555555n).toString() : full);
  nbt.tag.value.Metadata.value.TotalBlocks.value = W * H * L;
  return gzipSync(writeNbt(nbt));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args[0];
  if (!dir) throw new Error('usage: big_build.mjs <dir> [--ground <layers>] [--side <blocks>]');
  const opt = name => { const i = args.indexOf(`--${name}`); return i > 0 ? Number(args[i + 1]) : undefined; };
  mkdirSync(dir, { recursive: true });
  const t0 = performance.now();
  const { payload, buildings, copies } = await buildCity({ side: opt('side'), ground: opt('ground') });
  const size = [0, 1, 2].map(i => payload.bounds.maxExclusive[i] - payload.bounds.min[i]);
  const out = await writeLitematic(payload, { dataVersion: DATA_VERSION, anchor: 'min-corner', unselected: 'air', regionName: 'Grossstadt', metadata: { name: 'Grossstadt', author: 'Bauplaner-Prüfung', date: 0 } });
  writeFileSync(join(dir, 'grossstadt.litematic'), out.bytes);
  const meta = { blocks: payload.cells.length, box: size, volume: size[0] * size[1] * size[2], palette: payload.palette.length, blockEntities: payload.blockEntities.length,
    buildings, copies, bytes: out.bytes.length, sha256: createHash('sha256').update(out.bytes).digest('hex') };
  writeFileSync(join(dir, 'grossstadt.json'), JSON.stringify(meta, null, 1));
  writeFileSync(join(dir, 'zu-gross.litematic'), tooBig());
  console.log(`Großstadt: ${meta.blocks.toLocaleString('de-DE')} Blöcke, Box ${size.join(' × ')} = ${meta.volume.toLocaleString('de-DE')} Zellen, ${buildings} Gebäude, ${(meta.bytes / 1e6).toFixed(1)} MB, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}
