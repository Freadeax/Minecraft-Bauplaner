// Wegenetz als Landschaftsweg (TERRAIN-03-S08): ganze Netze aus Wegfeldern folgen dem Gelände, Treppen nur in Laufrichtung, Brücken und Dämme, Kaimauern.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_WATER, PATH_DECK, PATH_DECK_RAIL, PATH_DIRS, PATH_STAIR, SURFACE_STYLES, createSurvey, designFromSurvey, fortifyShore, layPathCells, pathPieceCells, risingDirs,
} from '../../../dist/domain/src/index.js';
import { completeState } from '../../../dist/voxel/src/index.js';

function surveyOf(area, h, water = () => false) {
  const n = area.width * area.length;
  const ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n), sb = new Uint16Array(n);
  for (let z = 0; z < area.length; z++) for (let x = 0; x < area.width; x++) {
    const i = x + z * area.width, wx = area.minX + x, wz = area.minZ + z, g = h(wx, wz);
    ground[i] = g; gb[i] = 1;
    if (water(wx, wz)) { surface[i] = g + 2; sb[i] = 2; } else { surface[i] = g; sb[i] = 1; }
  }
  return createSurvey({ ...area, ground, surface, groundBlock: gb, surfaceBlock: sb, ids: ['?', 'minecraft:grass_block', 'minecraft:water'] },
    { dimension: 'minecraft:overworld', readAt: '2026-11-06T09:00:00.000Z' });
}
const flat = { kind: 'flat', y: 0 };
const idx = (d, x, z) => (x - d.minX) + (z - d.minZ) * d.width;
/** Walking surface: deck one above the water, otherwise the ground. */
const walk = (d, x, z) => { const i = idx(d, x, z); return d.path[i] >= PATH_DECK ? d.water[i] + 1 : d.height[i]; };
function rect(x0, z0, x1, z1) { const out = []; for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) out.push([x, z]); return out; }
/** Largest height difference between neighbouring path columns. */
function maxStep(d, cells) {
  const set = new Set(cells.map(c => c.join(','))); let m = 0;
  for (const [x, z] of cells) for (const [dx, dz] of PATH_DIRS) if (set.has(`${x + dx},${z + dz}`)) m = Math.max(m, Math.abs(walk(d, x, z) - walk(d, x + dx, z + dz)));
  return m;
}

test('a network on a slope: at most one block between any two path columns, stairs only in walking direction and valid', () => {
  // Rises 1 per 2 blocks to the east, and 1 per 3 blocks to the south (side slope across the main road).
  const s = surveyOf({ minX: 0, minZ: 0, width: 60, length: 30 }, (x, z) => 60 + Math.floor(x / 2) + Math.floor(z / 3));
  const d = designFromSurvey(s, flat);
  const road = rect(0, 12, 60, 15), branch = rect(40, 0, 43, 12), cells = [...road, ...branch];
  const r = layPathCells(d, cells, { style: 'steinweg', steps: 'stairs' });
  assert.equal(r.columns, cells.length); assert.equal(r.unknown, 0);
  assert.ok(maxStep(d, cells) <= 1, 'no cliff anywhere in the network, also at the junction');
  assert.ok(r.stairs > 20, `stairs ${r.stairs}`);
  const set = new Set(cells.map(c => c.join(',')));
  for (const [x, z] of cells) {
    const i = idx(d, x, z), code = d.path[i];
    assert.ok(code >= 1, 'every column is path');
    if (code < PATH_STAIR || code >= PATH_DECK) continue;
    const dir = code - PATH_STAIR, [dx, dz] = PATH_DIRS[dir];
    assert.ok(risingDirs(d, x - d.minX, z - d.minZ).includes(dir), 'stair rises towards a higher path column');
    assert.ok(set.has(`${x - dx},${z - dz}`), 'the downhill side is path as well (no stair facing sideways off the edge)');
  }
  for (const c of pathPieceCells(d)) assert.ok(completeState(c.state), `valid state ${c.state.id}`);
  // Path style painted, terrain beside the network untouched.
  assert.ok(SURFACE_STYLES.find(st => st.id === 'steinweg').top.some(([id]) => d.ids[d.top[idx(d, 10, 13)]] === id));
  assert.equal(d.height[idx(d, 10, 20)], 60 + 5 + 6);
});

test('branches at different heights meet without a step of more than one block', () => {
  // A ridge: the main road runs along the crest (high), the branch climbs from a valley.
  const s = surveyOf({ minX: -20, minZ: -20, width: 40, length: 40 }, (x, z) => 70 - Math.abs(z) * 2);
  const d = designFromSurvey(s, flat);
  const cells = [...rect(-20, -1, 20, 2), ...rect(-1, 2, 2, 20)];
  const r = layPathCells(d, cells, { style: 'pfad', steps: 'slabs' });
  assert.ok(maxStep(d, cells) <= 1);
  assert.ok(r.slabs > 0 && r.stairs === 0);
  assert.ok(r.cut + r.fill > 0);
});

test('over water: bridge deck one above the water with railings at open sides, water and bed unchanged; or a causeway', () => {
  const water = (x) => x >= 20 && x < 26;
  const s = surveyOf({ minX: 0, minZ: 0, width: 46, length: 10 }, x => water(x) ? 58 : 61, water);
  const cells = rect(0, 4, 46, 7);
  const d = designFromSurvey(s, flat);
  const r = layPathCells(d, cells, { style: 'kiesweg', steps: 'stairs', water: 'bridge' });
  assert.equal(r.bridge, 18); assert.equal(r.causeway, 0);
  for (let x = 20; x < 26; x++) for (let z = 4; z < 7; z++) {
    const i = idx(d, x, z);
    assert.ok(d.path[i] === PATH_DECK || d.path[i] === PATH_DECK_RAIL);
    assert.equal(d.water[i], 60); assert.equal(d.height[i], 58, 'bed stays');
    assert.equal(d.path[i] === PATH_DECK_RAIL, z !== 5, 'railings on both open sides, middle lane free');
  }
  assert.ok(maxStep(d, cells) <= 1, 'banks lead onto the deck');
  const rails = pathPieceCells(d).filter(c => /fence|wall/.test(c.id));
  assert.equal(rails.length, r.rails);
  const e = designFromSurvey(s, flat);
  const c = layPathCells(e, cells, { style: 'kiesweg', water: 'causeway' });
  assert.equal(c.causeway, 18); assert.equal(c.bridge, 0);
  for (let x = 20; x < 26; x++) { assert.equal(e.water[idx(e, x, 5)], NO_WATER); assert.ok(e.height[idx(e, x, 5)] >= 60); }
});

test('unknown and outside columns are skipped; a non-path style is refused; fortifyShore sets quay walls only at water edges', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 10, length: 10 }, () => 64, (x) => x >= 6);
  const d = designFromSurvey(s, flat);
  const r = layPathCells(d, [[-1, 0], [0, 0], [1, 0], [50, 50]], { style: 'pfad' });
  assert.equal(r.unknown, 2); assert.equal(r.columns, 2);
  assert.throws(() => layPathCells(d, [[0, 0]], { style: 'wiese' }), /kein Wegbelag/);
  const cols = []; for (let z = 0; z < 10; z++) for (let x = 3; x < 6; x++) cols.push(idx(d, x, z));
  const n = fortifyShore(d, cols);
  assert.equal(n, 10, 'one quay column per row at x 5');
  assert.equal(d.ids[d.top[idx(d, 5, 3)]], 'minecraft:stone_bricks');
  assert.equal(d.ids[d.top[idx(d, 4, 3)]], 'minecraft:grass_block');
});
