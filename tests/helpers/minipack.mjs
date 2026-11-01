// Synthetic texture source for tests: a tiny ZIP with own blockstates, models
// and generated PNGs in the client-jar layout. Contains no Mojang files.
import { crc32, deflateRawSync, deflateSync } from 'node:zlib';

/** ZIP with stored (method 0) or deflated (method 8) entries. */
export function makeZip(entries, { deflate = true } = {}) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const raw = typeof content === 'string' ? Buffer.from(content) : Buffer.from(content);
    const body = deflate ? deflateRawSync(raw) : raw, nameBytes = Buffer.from(name), crc = crc32(raw);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(deflate ? 8 : 0, 8);
    head.writeUInt32LE(crc, 14); head.writeUInt32LE(body.length, 18); head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(nameBytes.length, 26);
    local.push(head, nameBytes, body);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(deflate ? 8 : 0, 10);
    dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(body.length, 20); dir.writeUInt32LE(raw.length, 24); dir.writeUInt16LE(nameBytes.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBytes);
    offset += head.length + nameBytes.length + body.length;
  }
  const dirBytes = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dirBytes.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, dirBytes, end]));
}

/** 16×16 RGBA PNG in one colour (alpha 0–255). */
export function png([r, g, b, a = 255]) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(16, 0); ihdr.writeUInt32BE(16, 4); ihdr[8] = 8; ihdr[9] = 6;
  const rows = Buffer.alloc(16 * 65);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) rows.set([r, g, b, a], y * 65 + 1 + x * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

const json = v => JSON.stringify(v);
/** Files of the mini pack by path: a cube block, a slab with variants, a multipart post and an unused texture. */
export function miniPackFiles() {
  const A = 'assets/minecraft/';
  return [
    [A + 'blockstates/stone.json', json({ variants: { '': { model: 'minecraft:block/stone' } } })],
    [A + 'blockstates/oak_slab.json', json({ variants: {
      'type=bottom': { model: 'block/oak_slab' }, 'type=top': { model: 'block/oak_slab_top' }, 'type=double': { model: 'block/oak_planks' } } })],
    [A + 'blockstates/oak_fence.json', json({ multipart: [
      { apply: { model: 'block/oak_fence_post' } },
      { when: { north: 'true' }, apply: { model: 'block/oak_fence_side', uvlock: true } },
      { when: { OR: [{ east: 'true' }, { west: 'true' }] }, apply: { model: 'block/oak_fence_side', y: 90, uvlock: true } }] })],
    [A + 'models/block/cube_all.json', json({ parent: 'block/cube', textures: { particle: '#all', down: '#all', up: '#all', north: '#all', east: '#all', south: '#all', west: '#all' } })],
    [A + 'models/block/cube.json', json({ elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces: Object.fromEntries(
      ['down', 'up', 'north', 'south', 'west', 'east'].map(f => [f, { texture: `#${f}`, cullface: f }])) }] })],
    [A + 'models/block/stone.json', json({ parent: 'minecraft:block/cube_all', textures: { all: 'minecraft:block/stone' } })],
    [A + 'models/block/oak_planks.json', json({ parent: 'block/cube_all', textures: { all: 'block/oak_planks' } })],
    [A + 'models/block/slab.json', json({ elements: [{ from: [0, 0, 0], to: [16, 8, 16], faces: {
      down: { uv: [0, 0, 16, 16], texture: '#bottom', cullface: 'down' }, up: { uv: [0, 0, 16, 16], texture: '#top' },
      north: { uv: [0, 8, 16, 16], texture: '#side', cullface: 'north' }, south: { uv: [0, 8, 16, 16], texture: '#side', cullface: 'south' },
      west: { uv: [0, 8, 16, 16], texture: '#side', cullface: 'west' }, east: { uv: [0, 8, 16, 16], texture: '#side', cullface: 'east' } } }] })],
    [A + 'models/block/oak_slab.json', json({ parent: 'block/slab', textures: { bottom: 'block/oak_planks', top: 'block/oak_planks', side: 'block/oak_planks' } })],
    [A + 'models/block/oak_slab_top.json', json({ parent: 'block/slab', textures: { bottom: 'block/oak_planks', top: 'block/oak_planks', side: 'block/oak_planks' },
      elements: [{ from: [0, 8, 0], to: [16, 16, 16], faces: { up: { texture: '#top', cullface: 'up' }, down: { texture: '#bottom' } } }] })],
    [A + 'models/block/oak_fence_post.json', json({ textures: { texture: 'block/oak_planks' }, elements: [{ from: [6, 0, 6], to: [10, 16, 10], faces: {
      down: { texture: '#texture', cullface: 'down' }, up: { texture: '#texture', cullface: 'up' }, north: { texture: '#texture' }, south: { texture: '#texture' },
      west: { texture: '#texture' }, east: { texture: '#texture' } } }] })],
    [A + 'models/block/oak_fence_side.json', json({ textures: { texture: 'block/oak_planks' }, elements: [{ from: [7, 12, 0], to: [9, 15, 9], faces: {
      up: { texture: '#texture' }, down: { texture: '#texture' }, north: { texture: '#texture', cullface: 'north' }, west: { texture: '#texture' }, east: { texture: '#texture' } } }] })],
    [A + 'models/item/stone.json', json({ parent: 'block/stone' })],
    [A + 'textures/block/stone.png', png([128, 128, 128])],
    [A + 'textures/block/oak_planks.png', png([160, 130, 80])],
    [A + 'textures/block/unused.png', png([255, 0, 0])],
  ];
}
export const miniPackZip = () => makeZip(miniPackFiles());
