import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, validatePayload, VoxelValidationError, transformCellPosition, transformBoundaryPoint,
  transformBlockState, transformPayload, countBlocks, selectLayers, stateKey } from '../dist/voxel/src/index.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/voxel/asymmetric.json', import.meta.url)));
const expected = JSON.parse(readFileSync(new URL('../fixtures/voxel/expected.json', import.meta.url)));
const rotation = { position: expected.quarterTurn.position, quarterTurns: 1, mirrorX: false };
const identity = { position: [0,0,0], quarterTurns: 0, mirrorX: false };
const clone = () => structuredClone(fixture);
function invalid(edit, pattern, limits) {
  const data = clone(); edit(data);
  assert.throws(()=>createPayload(data,limits), pattern ?? VoxelValidationError);
}

test('validated snapshot is deeply immutable and isolated from caller', () => {
  const input = clone(), snapshot = createPayload(input);
  input.palette[0].id = 'example:changed';
  assert.equal(snapshot.palette[0].id, 'minecraft:stone');
  assert.ok(Object.isFrozen(snapshot.blockEntities[0].data.value));
  assert.throws(()=>{ snapshot.cells[0].position[0] = 99; }, TypeError);
});
test('hand-calculated block quantities preserve air and erase separately', () => {
  const r = countBlocks(createPayload(fixture));
  assert.equal(r.blocks,expected.blocks); assert.equal(r.air,expected.air); assert.equal(r.erase,expected.erase);
  assert.equal(r.states.find(x=>x.state.id==='minecraft:stone').count,expected.stone);
  assert.equal(r.states.length,6);
});
test('quarter turn matches every independently calculated cell and bounds', () => {
  const r = transformPayload(createPayload(fixture),rotation);
  assert.deepEqual(r.payload.cells.map(c=>c.position),expected.quarterTurn.cells);
  assert.deepEqual(r.payload.bounds,expected.quarterTurn.bounds);
  assert.deepEqual(r.payload.sourceOrigin,fixture.sourceOrigin);
  assert.deepEqual(r.payload.pivot,rotation.position);
  assert.deepEqual(fixture,clone());
});
test('boundary points and occupied cell minima have distinct rotation rules', () => {
  assert.deepEqual(transformBoundaryPoint([0,0,0],[0,0,0],{...identity,quarterTurns:1}),[0,0,0]);
  assert.deepEqual(transformCellPosition([0,0,0],[0,0,0],{...identity,quarterTurns:1}),[-1,0,0]);
  assert.deepEqual(transformCellPosition([-2,1,-1],[0,0,0],{...identity,mirrorX:true}),[1,1,-1]);
});
test('nonzero pivot follows subtract, mirror, rotate, translate order', () => {
  assert.deepEqual(transformCellPosition([3,4,5],[2,3,4],{position:[10,20,30],quarterTurns:1,mirrorX:true}),[8,21,28]);
});
test('four quarter turns restore complete semantic payload including NBT', () => {
  let p = createPayload(fixture);
  for (let i=0;i<4;i++) p=transformPayload(p,{...identity,quarterTurns:1}).payload;
  assert.deepEqual(p,fixture);
});
test('two mirrors restore geometry, connection directions and stair handedness', () => {
  let p = createPayload(fixture);
  for (let i=0;i<2;i++) p=transformPayload(p,{...identity,mirrorX:true}).payload;
  assert.deepEqual(p,fixture);
});
test('all eight mirror/rotation combinations retain quantities and valid bounds', () => {
  for (const mirrorX of [true,false]) for (const quarterTurns of [0,1,2,3]) {
    const r=transformPayload(createPayload(fixture),{...identity,mirrorX,quarterTurns});
    validatePayload(r.payload); assert.deepEqual(countBlocks(r.payload).blocks,expected.blocks);
    assert.equal(new Set(r.payload.cells.map(c=>c.position.join(','))).size,9);
  }
});
test('known orientations match concrete independent results', () => {
  const p=transformPayload(createPayload(fixture),rotation).payload;
  assert.equal(p.palette[1].properties.axis,'z');
  assert.equal(p.palette[2].properties.facing,'east');
  assert.equal(p.palette[2].properties.shape,'inner_left');
  assert.equal(p.palette[4].properties.facing,'north');
  assert.deepEqual(p.palette[6].properties,{north:'true',east:'true',south:'false',west:'false',waterlogged:'false'});
  const mirrored=transformPayload(createPayload(fixture),{...identity,mirrorX:true}).payload;
  assert.equal(mirrored.palette[2].properties.shape,'inner_right');
});
test('unknown state and NBT retain original data and block semantic approval', () => {
  const r=transformPayload(createPayload(fixture),rotation);
  assert.equal(r.semanticsResolved,false);
  assert.deepEqual(r.issues.map(i=>i.code),['UNRESOLVED_BLOCK_STATE','UNRESOLVED_BLOCK_ENTITY']);
  assert.deepEqual(r.payload.palette[3],fixture.palette[3]);
  assert.deepEqual(r.payload.blockEntities[0].data,fixture.blockEntities[0].data);
  assert.deepEqual(r.payload.blockEntities[0].position,[8,64,-20]);
  assert.equal(transformPayload(createPayload(fixture),identity).semanticsResolved,true);
});
test('translation also reports unresolved embedded NBT coordinates', () => {
  const r=transformPayload(createPayload(fixture),{...identity,position:[2,0,0]});
  assert.deepEqual(r.issues.map(i=>i.code),['UNRESOLVED_BLOCK_ENTITY']);
});
test('unexpected known-block properties and invalid values never get guessed', () => {
  for (const state of [
    {id:'minecraft:stone',properties:{custom:'north'}},
    {id:'minecraft:oak_log',properties:{axis:'unknown'}},
    {id:'example:machine',properties:{facing:'north'}},
  ]) assert.equal(transformBlockState(state,rotation).resolved,false);
});
test('layer selection is explicit and retains source unchanged', () => {
  const original=createPayload(fixture), r=selectLayers(original,'y',1,2), counts=countBlocks(r);
  assert.deepEqual(r.bounds,{min:[-2,1,-1],maxExclusive:[2,2,2]});
  assert.equal(counts.blocks,expected.layerY1.blocks); assert.equal(counts.air,1); assert.equal(counts.erase,1);
  assert.equal(r.blockEntities.length,0); assert.equal(original.cells.length,9);
  assert.equal(selectLayers(original,'x',-2,-1).cells.length,2);
  assert.equal(selectLayers(original,'z',-1,0).cells.length,2);
  for (const args of [['y',0.5,1],['y',1,1],['y',-1,1],['z',0,3]]) assert.throws(()=>selectLayers(original,...args));
});
test('canonical state key is independent of property order', () => {
  assert.equal(stateKey({id:'example:a',properties:{b:'2',a:'1'}}),stateKey({id:'example:a',properties:{a:'1',b:'2'}}));
});
test('typed NBT JSON roundtrip preserves int64 extrema and every supported type', () => {
  const p=clone();
  Object.assign(p.blockEntities[0].data.value,{
    low:{type:'long',value:'-9223372036854775808'}, byte:{type:'byte',value:-128}, short:{type:'short',value:32767},
    f:{type:'float',value:1.5}, d:{type:'double',value:1/3},
    bytes:{type:'byteArray',value:[-128,127]}, ints:{type:'intArray',value:[-2147483648,2147483647]},
    longs:{type:'longArray',value:['9223372036854775807','-9223372036854775808']},
    list:{type:'list',elementType:'int',value:[{type:'int',value:1}]},
    empty:{type:'list',elementType:'end',value:[]},
  });
  assert.deepEqual(createPayload(JSON.parse(JSON.stringify(createPayload(p)))),p);
});
for (const [name,edit,pattern] of [
  ['fractional cell',p=>p.cells[0].position[0]=0.5,/Ganzzahl/],
  ['exclusive maximum',p=>p.cells[0].position[0]=2,/außerhalb/],
  ['duplicate cell',p=>p.cells.push(p.cells[0]),/doppelte Zell/],
  ['invalid palette index',p=>p.cells[0].paletteIndex=99,/Ganzzahl/],
  ['missing field',p=>delete p.sourceOrigin,/Koordinaten/],
  ['unknown field',p=>p.entities=[],/unbekanntes Feld/],
  ['duplicate palette',p=>p.palette.push(p.palette[0]),/doppelter Zustand/],
  ['air as block',p=>p.cells[6].kind='block',/widersprechen/],
  ['block as air',p=>p.cells[0].kind='air',/widersprechen/],
  ['erase with state',p=>p.cells[7].paletteIndex=0,/unbekanntes Feld/],
  ['invalid namespace',p=>p.palette[0].id='stone',/Namespaced/],
  ['zero-sized bounds',p=>p.bounds.maxExclusive[1]=0,/positive Länge/],
  ['unknown schema version',p=>p.schemaVersion=2,/Version/],
  ['empty profile',p=>p.profileId='',/Profilkennung/],
  ['orphan BlockEntity',p=>p.blockEntities[0].position=[-1,1,1],/belegte Blockzelle/],
  ['duplicate BlockEntity',p=>p.blockEntities.push(p.blockEntities[0]),/belegte Blockzelle/],
  ['unsafe long number',p=>p.blockEntities[0].data.value.LootTableSeed.value=9223372036854775807,/Long-String/],
  ['long overflow',p=>p.blockEntities[0].data.value.LootTableSeed.value='9223372036854775808',/int64/],
  ['noncanonical long',p=>p.blockEntities[0].data.value.LootTableSeed.value='01',/Long-String/],
  ['heterogeneous list',p=>p.blockEntities[0].data.value.Items.value=[{type:'int',value:1}],/heterogene/],
  ['nonempty end list',p=>p.blockEntities[0].data.value.Items={type:'list',elementType:'end',value:[{type:'int',value:1}]},/leer sein/],
  ['byte overflow',p=>p.blockEntities[0].data.value.x={type:'byte',value:128},/Ganzzahl/],
  ['unknown NBT tag',p=>p.blockEntities[0].data.value.x={type:'end',value:0},/NBT-Typ/],
  ['NaN NBT',p=>p.blockEntities[0].data.value.x={type:'double',value:NaN},/endliche/],
  ['negative float zero',p=>p.blockEntities[0].data.value.x={type:'float',value:-0},/nicht verlustfrei/],
  ['float32 precision',p=>p.blockEntities[0].data.value.x={type:'float',value:0.1},/float32/],
]) test(`rejects ${name}`,()=>invalid(edit,pattern));
test('volume/cell/palette/string and NBT budgets are enforced', () => {
  assert.throws(()=>createPayload(fixture,{maxVolume:23}),/Volumenlimit/);
  assert.throws(()=>createPayload(fixture,{maxCells:8}),/Limit/);
  assert.throws(()=>createPayload(fixture,{maxPalette:6}),/Limit/);
  assert.throws(()=>createPayload(fixture,{maxStringLength:5}),/Limit/);
  assert.throws(()=>createPayload(fixture,{maxNbtNodes:2}),/Knotenlimit/);
  invalid(p=>p.blockEntities[0].data.value.deep={type:'compound',value:{a:{type:'int',value:1}}},/Tiefenlimit/,{maxNbtDepth:1});
  invalid(p=>p.blockEntities[0].data.value.array={type:'intArray',value:[1,2,3]},/Knotenlimit/,{maxNbtNodes:8});
});
test('oversized or invalid transformations fail instead of rounding', () => {
  assert.throws(()=>transformCellPosition([0,0,0],[0,0,0],{...identity,quarterTurns:4}));
  assert.throws(()=>transformCellPosition([2147483647,0,0],[0,0,0],{...identity,position:[1,0,0]}));
  assert.throws(()=>transformPayload(createPayload(fixture),{...identity,position:[0.5,0,0]}));
});
