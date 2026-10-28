// Still image projection, layer index and library URL state (B12). The web
// modules are plain TypeScript without runtime imports, loaded via Node's type stripping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHOTS, shotGeometry, shotFileName } from '../apps/web/src/thumbnail/views.ts';
import { layerIndex, firstBuiltLayer, layerCounts, facingArrow, shapeOf } from '../apps/web/src/schem/layers.ts';
import { encodeLibraryState, decodeLibraryState } from '../apps/web/src/views/library/urlState.ts';

const b = (x, y, z, color = '#808080') => ({ x, y, z, color });

test('isometric corners: a single cube shows three faces, never mirrored', () => {
  for (const view of ['so', 'sw', 'nw', 'no']) {
    const g = shotGeometry([b(0, 0, 0)], view);
    assert.equal(g.faces.length, 3, view);
    assert.deepEqual(g.faces.map(f => f.shade), [0, 0.22, 0.38]);
  }
  // Two blocks in a row along x: from the south-east the east block shows its east face, the west
  // block loses its east face to the neighbour. From the north-west it is the other way round.
  const row = [b(0, 0, 0, '#ff0000'), b(1, 0, 0, '#0000ff')];
  const count = (g, c) => g.faces.filter(f => f.color === c).length;
  const so = shotGeometry(row, 'so'), nw = shotGeometry(row, 'nw'), sw = shotGeometry(row, 'sw');
  assert.deepEqual([count(so, '#ff0000'), count(so, '#0000ff')], [2, 3]);
  assert.deepEqual([count(nw, '#ff0000'), count(nw, '#0000ff')], [3, 2]);
  assert.deepEqual([count(sw, '#ff0000'), count(sw, '#0000ff')], [3, 2], 'south-west sees the west face of the west block');
});

test('top view and façades: nearest block wins, deeper ones are darker, north is up', () => {
  const blocks = [b(0, 0, 0, '#111111'), b(0, 2, 0, '#222222'), b(1, 0, 1, '#333333')];
  const top = shotGeometry(blocks, 'oben');
  assert.equal(top.faces.length, 2, 'one square per column');
  const col = top.faces.find(f => f.points[0] === 0 && f.points[1] === 0);
  assert.equal(col.color, '#222222', 'highest block of the column');
  assert.equal(col.shade, 0);
  assert.ok(top.faces.find(f => f.color === '#333333').shade > 0, 'lower block shaded');
  // North (−z) is up: z=1 lies below z=0 on screen.
  assert.ok(top.faces.find(f => f.color === '#333333').points[1] > col.points[1]);
  const south = shotGeometry(blocks, 'sued');
  assert.equal(south.faces.length, 3, 'x/y cells of the south façade');
  const front = south.faces.find(f => f.points[0] === 0 && f.points[1] === 0);
  assert.equal(front.color, '#111111');
  // East façade: x=1 is the nearest; the west façade sees x=0 first.
  assert.equal(shotGeometry([b(0, 0, 0, '#aaaaaa'), b(1, 0, 0, '#bbbbbb')], 'ost').faces[0].color, '#bbbbbb');
  assert.equal(shotGeometry([b(0, 0, 0, '#aaaaaa'), b(1, 0, 0, '#bbbbbb')], 'west').faces[0].color, '#aaaaaa');
  assert.equal(SHOTS.length, 9);
});

test('cutaway keeps only layers up to Y; file names are ASCII', () => {
  const tower = [0, 1, 2, 3].map(y => b(0, y, 0));
  assert.equal(shotGeometry(tower, 'sued', 1).faces.length, 2);
  assert.equal(shotGeometry(tower, 'so', 1).faces.length, 2 * 2 + 1);
  assert.equal(shotFileName('Großes Baumhaus (Fichte)', 'nw', 3), 'grosses-baumhaus-fichte-nw-schnitt-y3.png');
  assert.equal(shotFileName('', 'so'), 'bauwerk-so.png');
});

test('layer index: bounds layers, first built layer, counts and plan glyphs', () => {
  const palette = [{ id: 'minecraft:air' }, { id: 'minecraft:stone' }, { id: 'minecraft:oak_stairs' }];
  const cells = [{ position: [0, 1, 0], kind: 'block', paletteIndex: 1 }, { position: [1, 1, 0], kind: 'block', paletteIndex: 1 },
    { position: [0, 2, 1], kind: 'block', paletteIndex: 2 }, { position: [1, 2, 1], kind: 'air', paletteIndex: 0 }, { position: [1, 3, 1], kind: 'erase' }];
  const idx = layerIndex({ bounds: { min: [0, 0, 0], maxExclusive: [2, 4, 2] }, palette, cells });
  assert.deepEqual(idx.ys, [0, 1, 2, 3]);
  assert.equal(firstBuiltLayer(idx), 1);
  assert.deepEqual(layerCounts(idx, 1, palette), [{ id: 'minecraft:stone', count: 2 }]);
  assert.equal(idx.byY.get(2).length, 1, 'air and erase are not drawn');
  assert.deepEqual(facingArrow({ facing: 'north' }), [0, -1]);
  assert.equal(facingArrow({ facing: 'up' }), null);
  assert.equal(shapeOf('minecraft:oak_slab', { type: 'top' }), 'half-top');
  assert.equal(shapeOf('minecraft:oak_stairs', {}), 'stairs');
});

test('library URL state: round trip, defaults omitted, junk dropped', () => {
  const keys = ['kategorie', 'stil', 'biom', 'funktion'], opts = { sorts: ['name', 'blocks'], stages: ['start', 'frueh'] };
  const state = { query: 'turm', filters: { facets: { kategorie: ['befestigung'], stil: ['nordisch', 'rustikal'] }, tags: ['aussicht'], difficultyMax: 3,
    stageMax: 'frueh', plot: { width: 12, depth: 9, height: 20, allowRotation: false }, vanillaOnly: true }, sort: 'blocks', descending: true, collapse: false, layout: 'liste', onlyFavorites: true };
  const q = encodeLibraryState(state, keys);
  assert.deepEqual(decodeLibraryState(q, keys, opts), state);
  assert.equal(encodeLibraryState({ query: '', filters: {}, descending: false, collapse: true, layout: 'raster', onlyFavorites: false }, keys), '');
  const junk = decodeLibraryState('?schwierigkeit=9&phase=mond&platz=3x&sortierung=quatsch&herkunft=fremd&q=a', keys, opts);
  assert.deepEqual(junk, { query: 'a', filters: {}, descending: false, collapse: true, layout: 'raster', onlyFavorites: false });
});
