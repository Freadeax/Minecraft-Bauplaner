// SPLIT-01-S05: Herauslösen erkennt unterirdische Räume, Keller und Brücken zwischen Gebäuden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSplit, extractParts } from '../dist/domain/src/index.js';
import { createPayload } from '../dist/voxel/src/index.js';

const PAL = ['minecraft:grass_block', 'minecraft:dirt', 'minecraft:stone_bricks', 'minecraft:oak_planks', 'minecraft:oak_fence', 'minecraft:water', 'minecraft:chest', 'minecraft:stone'];
const P = Object.fromEntries(PAL.map((id, i) => [id.slice(10), i]));

/** A grass field 60 × 30 (grass at y 0, dirt down to −8) plus the given blocks; `air` positions are cut out of the ground. */
function world(blocks, air = []) {
  const m = new Map();
  for (let x = 0; x < 60; x++) for (let z = 0; z < 30; z++) {
    m.set(`${x},0,${z}`, P.grass_block);
    for (let y = -8; y < 0; y++) m.set(`${x},${y},${z}`, P.dirt);
  }
  for (const k of air) m.delete(k);
  for (const [k, v] of blocks) m.set(k, v);
  const cells = [...m].map(([k, v]) => ({ position: k.split(',').map(Number), kind: 'block', paletteIndex: v }));
  return createPayload({ schemaVersion: 1, profileId: 'p', bounds: { min: [0, -8, 0], maxExclusive: [60, 12, 30] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: PAL.map(id => ({ id, properties: {} })), cells, blockEntities: [] });
}
/** Hollow box of `id` (walls, floor, ceiling) from (x0,y0,z0) to (x1,y1,z1) inclusive. */
function box(out, air, x0, y0, z0, x1, y1, z1, id) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const k = `${x},${y},${z}`;
    if (x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1) out.push([k, id]);
    else air.push(k);
  }
}
/** House on the grass: plank walls y 1–5, roof y 6. */
function house(out, air, x0, z0, x1, z1) { box(out, air, x0, 1, z0, x1, 6, z1, P.oak_planks); }

test('Brücke zwischen zwei Häusern wird ein eigener Teil und verbindet beide', () => {
  const b = [], air = [];
  house(b, air, 2, 2, 8, 8); house(b, air, 24, 2, 30, 8);
  // Deck from x 9 to 23 at y 4 (gap y 1–3 below), railings on both sides.
  for (let x = 9; x <= 23; x++) for (let z = 4; z <= 6; z++) { b.push([`${x},4,${z}`, P.oak_planks]); if (z !== 5) b.push([`${x},5,${z}`, P.oak_fence]); }
  const a = analyzeSplit(world(b, air));
  const houses = a.parts.filter(p => p.kind === 'building' && !p.role);
  const bridge = a.parts.find(p => p.role === 'bridge');
  assert.equal(houses.length, 2, 'die Brücke legt die Häuser nicht zusammen');
  assert.ok(bridge, 'Brücke erkannt');
  assert.equal(bridge.name, 'Brücke');
  assert.deepEqual([...bridge.connects].sort(), houses.map(h => h.id).sort());
  assert.match(bridge.reason, /verbindet/);
  assert.equal(bridge.box.min[0], 9);
  assert.equal(bridge.box.maxExclusive[0], 24);
  const ex = extractParts(world(b, air), a, [bridge.id]);
  assert.equal(ex.payload.cells.filter(c => c.kind === 'block').length, 15 * 3 + 15 * 2);
});

test('Steg über Wasser ohne Gebäude an den Enden ist ebenfalls eine Brücke; Dachüberstand nicht', () => {
  const b = [], air = [];
  for (let x = 10; x <= 40; x++) for (let z = 14; z <= 18; z++) { air.push(`${x},0,${z}`); b.push([`${x},0,${z}`, P.water]); }
  for (let x = 14; x <= 36; x++) for (let z = 15; z <= 17; z++) b.push([`${x},2,${z}`, P.oak_planks]);
  // A house with a wide roof overhang on all sides (eaves at y 6, one block out).
  house(b, air, 44, 2, 52, 10);
  for (let x = 43; x <= 53; x++) for (const z of [1, 11]) b.push([`${x},6,${z}`, P.oak_planks]);
  for (let z = 1; z <= 11; z++) for (const x of [43, 53]) b.push([`${x},6,${z}`, P.oak_planks]);
  const a = analyzeSplit(world(b, air));
  const bridges = a.parts.filter(p => p.role === 'bridge');
  assert.equal(bridges.length, 1);
  assert.equal(bridges[0].connects, undefined);
  assert.match(bridges[0].reason, /Steg/);
  const h = a.parts.find(p => p.kind === 'building' && !p.role);
  assert.equal(h.box.min[0], 43, 'Traufe gehört zum Haus');
  assert.equal(h.box.maxExclusive[2], 12);
});

test('unterirdischer Raum wird erkannt und nicht mit dem Haus darüber oder daneben vermischt', () => {
  const b = [], air = [];
  house(b, air, 2, 2, 8, 8);
  // A bunker far from the house: stone bricks y −7 to −2, grass stays on top, a chest inside.
  box(b, air, 30, -7, 10, 38, -2, 18, P.stone_bricks);
  b.push(['34,-6,14', P.chest]);
  const a = analyzeSplit(world(b, air));
  const room = a.parts.find(p => p.role === 'underground');
  assert.ok(room, 'Raum unter dem Gelände erkannt');
  assert.equal(room.name, 'Unterirdischer Raum');
  assert.equal(room.height, 6);
  assert.equal(room.box.min[1], -7);
  assert.ok(room.below >= room.blocks * 0.9);
  assert.match(room.reason, /unter dem Gelände/);
  const houseParts = a.parts.filter(p => p.kind === 'building' && !p.role);
  assert.equal(houseParts.length, 1);
  assert.equal(houseParts[0].box.min[1], 1, 'das Haus beginnt auf dem Gras');
  // Extracting the room without ground keeps only the room.
  const ex = extractParts(world(b, air), a, [room.id]);
  assert.ok(!ex.payload.palette.some(s => s.id === 'minecraft:grass_block' || s.id === 'minecraft:dirt'));
});

test('Keller unter einem Haus gehört zum Haus (auch wenn er etwas über den Grundriss hinausreicht)', () => {
  const b = [], air = [];
  house(b, air, 10, 10, 16, 16);
  box(b, air, 9, -6, 9, 17, -2, 17, P.stone_bricks);
  const a = analyzeSplit(world(b, air));
  const buildings = a.parts.filter(p => p.kind === 'building');
  assert.equal(buildings.length, 1);
  assert.equal(buildings[0].role, undefined);
  assert.equal(buildings[0].box.min[1], -6);
  assert.match(buildings[0].reason, /mit Keller/);
  assert.ok(buildings[0].below > 100);
});
