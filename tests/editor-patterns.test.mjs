// EDIT-03: Muster-Pinsel, weitere Formen, Schablonen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, stateRuleFor } from '../dist/voxel/src/index.js';
import {
  createDraft, applyEdit, blockValue, boxEdit, cellAt, materializeDraft, draftEntries, sameSlot, copyBox, transformClipboard, pasteEdit,
  paintEdit, patternAt, cellNoise, replacePatternEdit, patternShares, validatePattern, PATTERN_PRESETS,
  archEdit, pyramidEdit, coneEdit, wallLineEdit,
  BUILTIN_STENCILS, clipboardFromPayload, draftFromClipboard, blockSchema, checkProperties,
} from '../dist/domain/src/index.js';

const P = 'mc-java-26.3';
const st = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const B = (id, properties) => blockValue(st(id, properties));
const ids = edit => edit.changes.map(c => c.value?.kind === 'block' ? c.value.state.id.slice(10) : c.value?.kind ?? 'null');
const tally = list => list.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {});
const schemaOf = id => stateRuleFor(id)?.schema;

test('cellNoise is deterministic, in [0,1) and roughly uniform', () => {
  assert.equal(cellNoise([3, -7, 12], 5), cellNoise([3, -7, 12], 5));
  assert.notEqual(cellNoise([3, -7, 12], 5), cellNoise([3, -7, 12], 6));
  let sum = 0, n = 0;
  for (let x = -20; x < 20; x++) for (let z = -20; z < 20; z++) { const v = cellNoise([x, 64, z], 1); assert.ok(v >= 0 && v < 1); sum += v; n++; }
  assert.ok(Math.abs(sum / n - 0.5) < 0.03, `mean ${sum / n}`);
});

test('mix pattern: weights give the expected shares, same seed ⇒ same result, keep drops cells', () => {
  const wall = boxEdit({ a: [0, 0, 0], b: [39, 9, 0] }, 'fill', B('stone')); // 400 cells
  const mix = { kind: 'mix', seed: 9, entries: [{ value: B('stone_bricks'), weight: 6 }, { value: B('mossy_stone_bricks'), weight: 2 }, { value: B('cracked_stone_bricks'), weight: 2 }] };
  const a = paintEdit(wall, mix), b = paintEdit(wall, mix);
  assert.deepEqual(a, b, 'deterministisch');
  assert.equal(a.changes.length, 400);
  const t = tally(ids(a));
  assert.ok(t.stone_bricks > 200 && t.stone_bricks < 280, JSON.stringify(t));
  assert.ok(t.mossy_stone_bricks > 50 && t.mossy_stone_bricks < 110, JSON.stringify(t));
  assert.notDeepEqual(paintEdit(wall, { ...mix, seed: 10 }), a, 'anderer Würfelwert, andere Verteilung');
  assert.match(a.label, /Mischung/);
  const sparse = paintEdit(wall, { kind: 'mix', seed: 1, entries: [{ value: B('mossy_stone_bricks'), weight: 1 }, { value: 'keep', weight: 3 }] });
  assert.ok(sparse.changes.length > 60 && sparse.changes.length < 140, `${sparse.changes.length}`);
  // Removals stay removals; only written values are painted.
  const clear = paintEdit(boxEdit({ a: [0, 0, 0], b: [2, 0, 0] }, 'fill', null), mix);
  assert.ok(clear.changes.every(c => c.value === null));
  assert.throws(() => validatePattern({ kind: 'mix', seed: 1, entries: [{ value: B('stone'), weight: 0 }] }), /Gewicht/);
  assert.throws(() => validatePattern({ kind: 'mix', seed: 1, entries: [] }), /mindestens/);
});

test('gradient pattern: stops follow the axis over the edit extent, reverse and radial', () => {
  const stops = [B('cobblestone'), B('stone_bricks'), B('stone'), B('smooth_stone')];
  const tower = boxEdit({ a: [0, 10, 0], b: [0, 17, 0] }, 'fill', B('dirt')); // 8 cells y 10..17
  const g = paintEdit(tower, { kind: 'gradient', axis: 'y', blend: 0, seed: 1, stops });
  const byY = Object.fromEntries(g.changes.map(c => [c.position[1], c.value.state.id.slice(10)]));
  assert.deepEqual([byY[10], byY[11], byY[12], byY[13], byY[14], byY[15], byY[16], byY[17]],
    ['cobblestone', 'cobblestone', 'stone_bricks', 'stone_bricks', 'stone', 'stone', 'smooth_stone', 'smooth_stone']);
  const r = paintEdit(tower, { kind: 'gradient', axis: 'y', blend: 0, seed: 1, stops, reverse: true });
  assert.equal(r.changes.find(c => c.position[1] === 10).value.state.id, 'minecraft:smooth_stone');
  // Blend dithers only near borders: the lowest and highest layers stay pure.
  const wide = boxEdit({ a: [0, 0, 0], b: [15, 15, 0] }, 'fill', B('dirt'));
  const d = paintEdit(wide, { kind: 'gradient', axis: 'y', blend: 0.8, seed: 3, stops });
  assert.ok(d.changes.filter(c => c.position[1] === 0).every(c => c.value.state.id === 'minecraft:cobblestone'));
  assert.ok(d.changes.filter(c => c.position[1] === 15).every(c => c.value.state.id === 'minecraft:smooth_stone'));
  assert.ok(new Set(d.changes.filter(c => c.position[1] === 4).map(c => c.value.state.id)).size >= 2, 'Übergang gemischt');
  const radial = paintEdit(boxEdit({ a: [-4, 0, -4], b: [4, 0, 4] }, 'fill', B('dirt')), { kind: 'gradient', axis: 'radial', blend: 0, seed: 1, stops: [B('gold_block'), B('stone')] });
  assert.equal(radial.changes.find(c => c.position[0] === 0 && c.position[2] === 0).value.state.id, 'minecraft:gold_block');
  assert.equal(radial.changes.find(c => c.position[0] === 4 && c.position[2] === 4).value.state.id, 'minecraft:stone');
});

test('checker and stripes patterns', () => {
  const floor = boxEdit({ a: [0, 0, 0], b: [3, 0, 3] }, 'fill', B('dirt'));
  const c = paintEdit(floor, { kind: 'checker', size: 1, entries: [B('white_concrete'), B('black_concrete')] });
  assert.deepEqual(tally(ids(c)), { white_concrete: 8, black_concrete: 8 });
  assert.equal(patternAt({ kind: 'checker', size: 2, entries: ['keep', B('stone')] }, [-1, 0, 0], null).state.id, 'minecraft:stone', 'negative Koordinaten');
  const s = paintEdit(floor, { kind: 'stripes', axis: 'x', width: 2, entries: [B('oak_planks'), B('spruce_planks')] });
  assert.ok(s.changes.every(ch => ch.value.state.id === (ch.position[0] < 2 ? 'minecraft:oak_planks' : 'minecraft:spruce_planks')));
});

test('replace with pattern keeps orientation and only touches matching cells', () => {
  let d = createDraft(null, P);
  d = applyEdit(d, boxEdit({ a: [0, 0, 0], b: [9, 0, 9] }, 'fill', B('stone_bricks'))).draft;
  d = applyEdit(d, { label: 't', changes: [{ position: [0, 1, 0], value: B('stone_brick_stairs', { facing: 'east', half: 'top', shape: 'straight', waterlogged: 'false' }) }] }).draft;
  const weather = PATTERN_PRESETS.find(p => p.id === 'verwittern').pattern;
  const e = replacePatternEdit(d, { from: { id: 'minecraft:stone_bricks' } }, weather, schemaOf);
  assert.ok(e.changes.length > 10 && e.changes.length < 50, `${e.changes.length}`);
  assert.ok(e.changes.every(c => c.position[1] === 0 && c.value.state.id === 'minecraft:mossy_stone_bricks'));
  const stairs = replacePatternEdit(d, { from: { id: 'minecraft:stone_brick_stairs' } }, { kind: 'mix', seed: 1, entries: [{ value: B('mossy_stone_brick_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' }), weight: 1 }] }, schemaOf);
  assert.deepEqual(stairs.changes[0].value.state.properties, { facing: 'east', half: 'top', shape: 'straight', waterlogged: 'false' });
  const shares = patternShares(e);
  assert.equal(shares[0].count, e.changes.length);
});

test('presets use existing blocks with valid states', () => {
  for (const p of PATTERN_PRESETS) {
    validatePattern(p.pattern);
    const list = p.pattern.kind === 'mix' ? p.pattern.entries.map(e => e.value) : p.pattern.kind === 'gradient' ? p.pattern.stops : p.pattern.entries;
    for (const v of list) if (v !== 'keep' && v?.kind === 'block') {
      assert.ok(blockSchema(v.state.id), `${p.id}: ${v.state.id} im Register`);
      assert.deepEqual(checkProperties(v.state), [], `${p.id}: ${v.state.id}`);
    }
  }
});

test('arch shapes: round arch band, wall with opening, pointed arch, posts and depth', () => {
  // Span 7 (x 0..6), rise 4, thickness 1.
  const round = archEdit([0, 0, 0], [6, 0, 0], B('stone'), { style: 'round', rise: 4, thickness: 1, depth: 1, legs: 0, wall: false });
  const cells = new Set(round.changes.map(c => c.position.join(',')));
  assert.ok(cells.has('0,0,0') && cells.has('6,0,0'), 'Kämpfer');
  assert.ok(cells.has('3,3,0'), 'Scheitel');
  assert.ok(!cells.has('3,2,0') && !cells.has('3,1,0'), 'Scheitel nur oben');
  assert.ok(!cells.has('3,0,0') && !cells.has('3,2,0'), 'Öffnung frei');
  assert.ok(round.changes.every(c => c.position[2] === 0 && c.position[1] >= 0 && c.position[1] < 4));
  // Symmetric about the span centre.
  for (const c of round.changes) assert.ok(cells.has(`${6 - c.position[0]},${c.position[1]},0`), `symmetrisch ${c.position}`);
  const wall = archEdit([0, 0, 0], [6, 0, 0], B('stone'), { style: 'round', rise: 4, thickness: 1, depth: 1, legs: 0, wall: true });
  assert.ok(wall.changes.length > round.changes.length);
  // Wall = rectangle 7×4 minus the opening; band ⊂ wall.
  const wallSet = new Set(wall.changes.map(c => c.position.join(',')));
  for (const k of cells) assert.ok(wallSet.has(k));
  assert.ok(!wall.changes.some(c => c.position[0] === 3 && c.position[1] === 0), 'Durchgang bleibt frei');
  // Posts: legs 2 shift the curve up; posts are 1 thick at both sides.
  const legs = archEdit([0, 0, 0], [6, 0, 0], B('stone'), { style: 'round', rise: 4, thickness: 1, depth: 3, legs: 2, wall: false });
  assert.ok(legs.changes.some(c => c.position[1] === 5), 'höher');
  assert.deepEqual([...new Set(legs.changes.filter(c => c.position[1] === 0).map(c => c.position[0]))].sort(), [0, 6]);
  assert.deepEqual([...new Set(legs.changes.map(c => c.position[2]))].sort(), [0, 1, 2], 'Tiefe nach +Z');
  const pointed = archEdit([0, 0, 0], [8, 0, 0], B('stone'), { style: 'pointed', rise: 6, thickness: 1, depth: 1, legs: 0, wall: false });
  const top = Math.max(...pointed.changes.map(c => c.position[1]));
  assert.equal(top, 5);
  assert.deepEqual(pointed.changes.filter(c => c.position[1] === top).map(c => c.position[0]).sort(), [3, 4, 5], 'Spitze in der Mitte');
  // Face-connected band: every band cell above the base has a band neighbour below or beside it (no diagonal-only steps).
  const pset = new Set(pointed.changes.map(c => `${c.position[0]},${c.position[1]}`));
  for (const c of pointed.changes) { const [x, y] = c.position; if (y > 0) assert.ok(pset.has(`${x},${y - 1}`) || pset.has(`${x - 1},${y}`) || pset.has(`${x + 1},${y}`), `verbunden ${x},${y}`); }
  // Along Z: the arch stands in the Y/Z plane at the X of the first corner.
  const z = archEdit([5, 2, 0], [5, 2, 6], B('stone'), { style: 'segment', rise: 2, thickness: 1, depth: 1, legs: 1, wall: false });
  assert.ok(z.changes.every(c => c.position[0] === 5 && c.position[1] >= 2));
  assert.throws(() => archEdit([0, 0, 0], [1, 0, 0], B('stone'), { style: 'round', rise: 2, thickness: 1, depth: 1, legs: 0, wall: false }), /mindestens 3/);
});

test('pyramid, hip roof, cone and wall line have hand-counted sizes', () => {
  // 5×5 pyramid: 25 + 9 + 1.
  assert.equal(pyramidEdit([0, 0, 0], [4, 0, 4], B('stone')).changes.length, 35);
  // Hollow: 16 ring + 8 ring + 1 top = 25; the inner 3×3 of layer 0 is covered by layer 1, the 1×1 of layer 1 by layer 2.
  assert.equal(pyramidEdit([0, 0, 0], [4, 0, 4], B('stone'), { hollow: true }).changes.length, 25);
  // 7×3 hip roof: 21 + 5 (5×1 ridge).
  const hip = pyramidEdit([0, 0, 0], [6, 0, 2], B('stone'));
  assert.equal(hip.changes.length, 26);
  assert.equal(Math.max(...hip.changes.map(c => c.position[1])), 1);
  assert.equal(pyramidEdit([0, 0, 0], [8, 0, 8], B('stone'), { maxHeight: 2 }).changes.length, 81 + 49);
  // Cone r=2, h=3: radii 2.5, 1.67, 0.83 → 21 + 9 + 1.
  assert.equal(coneEdit([0, 0, 0], 2, 3, B('stone')).changes.length, 31);
  const hollowCone = coneEdit([0, 0, 0], 4, 6, B('stone'), { hollow: true });
  assert.ok(hollowCone.changes.length < coneEdit([0, 0, 0], 4, 6, B('stone')).changes.length);
  assert.ok(hollowCone.changes.some(c => c.position[1] === 5), 'Spitze');
  // Wall line: diagonal 0..4 is 5 cells, 3 high, 2 thick → 30.
  assert.equal(wallLineEdit([0, 0, 0], [4, 0, 4], 3, B('stone'), { thickness: 2 }).changes.length, 30);
  assert.equal(wallLineEdit([0, 0, 0], [6, 0, 0], 1, B('stone')).label, 'Linie');
});

test('built-in stencils are valid and survive rotation; payload ⇄ clipboard ⇄ draft', () => {
  for (const s of BUILTIN_STENCILS) {
    assert.ok(s.clip.cells.length > 0, s.id);
    for (const c of s.clip.cells) {
      assert.ok(c.offset.every((n, i) => n >= 0 && n < s.clip.size[i]), `${s.id} im Rahmen`);
      if (c.value.kind === 'block') { assert.ok(blockSchema(c.value.state.id), `${s.id}: ${c.value.state.id}`); assert.deepEqual(checkProperties(c.value.state), [], `${s.id}: ${c.value.state.id}`); }
    }
    let clip = s.clip;
    for (let i = 0; i < 4; i++) clip = transformClipboard(clip, { quarterTurns: 1, mirrorX: false }).clip;
    assert.deepEqual(new Set(clip.cells.map(c => JSON.stringify(c))), new Set(s.clip.cells.map(c => JSON.stringify(c))), `${s.id}: vier Drehungen = Identität`);
  }
  const door = BUILTIN_STENCILS.find(s => s.id === 'tuer').clip;
  const turned = transformClipboard(door, { quarterTurns: 1, mirrorX: false }).clip;
  assert.equal(turned.cells.find(c => c.value.kind === 'block' && c.value.state.id === 'minecraft:oak_door').value.state.properties.facing, 'east');
  // Stencil → draft → payload → clipboard gives the same cells.
  const draft = draftFromClipboard(BUILTIN_STENCILS.find(s => s.id === 'zinnen').clip, P);
  const payload = materializeDraft(draft);
  const back = clipboardFromPayload(payload);
  assert.deepEqual(back.size, [6, 2, 1]);
  assert.equal(back.cells.filter(c => c.value.kind === 'air').length, 3, 'Scharten als explizite Luft');
  let target = createDraft(null, P);
  target = applyEdit(target, pasteEdit(back, [10, 0, 10])).draft;
  assert.ok(sameSlot(cellAt(target, [10, 1, 10]), B('stone_bricks')));
  assert.equal(draftEntries(target).size, 12);
  // Payload with offset bounds is normalised to its minimum corner.
  const p2 = createPayload({ schemaVersion: 1, profileId: P, bounds: { min: [5, 5, 5], maxExclusive: [7, 6, 6] }, pivot: [5, 5, 5], sourceOrigin: [0, 0, 0],
    palette: [st('stone')], cells: [{ position: [6, 5, 5], kind: 'block', paletteIndex: 0 }], blockEntities: [] });
  assert.deepEqual(clipboardFromPayload(p2), { size: [2, 1, 1], cells: [{ offset: [1, 0, 0], value: B('stone') }] });
  void copyBox;
});
