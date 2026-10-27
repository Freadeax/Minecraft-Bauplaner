import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readNbt, normalizeSchem, importSchemV3, parseBlockState, FormatError } from '../dist/formats/src/index.js';
import { countBlocks } from '../dist/voxel/src/index.js';
const raw=Buffer.from(readFileSync(new URL('../fixtures/schem/asymmetric.nbt.hex',import.meta.url),'utf8').replace(/\s/g,''),'hex');
const zipped=gzipSync(raw);
const ab=b=>Uint8Array.from(b).buffer;
const source=()=>readNbt(raw);
const schema=p=>p.tag.value.Schematic.value;

test('independent binary fixture: dimensions, offset, exact cells and known quantities',async()=>{
 const r=await importSchemV3(ab(zipped));
 assert.deepEqual(r.payload.bounds,{min:[0,0,0],maxExclusive:[3,2,2]});assert.deepEqual(r.offset,[-10,64,30]);assert.equal(r.dataVersion,3465);
 assert.equal(r.sourceSha256,createHash('sha256').update(zipped).digest('hex'));
 const c=countBlocks(r.payload);assert.equal(c.blocks,7);assert.equal(c.air,5);assert.equal(c.erase,0);
 assert.equal(c.states.find(x=>x.state.id==='minecraft:stone').count,4);
 assert.equal(c.states.find(x=>x.state.id==='example:machine').count,2);
 assert.deepEqual(r.payload.cells[2].position,[2,0,0]);assert.deepEqual(r.payload.cells[7].position,[1,1,0]);assert.deepEqual(r.payload.cells[11].position,[2,1,1]);
 assert.ok(r.payload.profileId.includes('3465'));assert.ok(r.payload.profileId.includes('unverified'));
});
test('BlockEntity, typed Longs, modified UTF, metadata and undisplayed fields preserved',()=>{
 const r=normalizeSchem(source());const be=r.payload.blockEntities[0];assert.deepEqual(be.position,[0,0,1]);
 assert.equal(be.data.value.Id.value,'minecraft:barrel');assert.equal(be.data.value.Extension.value,'preserve me');
 const d=be.data.value.Data.value;assert.equal(d.Seed.value,'9223372036854775807');assert.equal(d.Name.value,'Ä\0😀');
 assert.deepEqual(d.Bytes,{type:'byteArray',value:[-128,127]});assert.deepEqual(d.Ints.value,[-2147483648,2147483647]);
 assert.deepEqual(d.Longs.value,['-9223372036854775808','9223372036854775807']);
 assert.equal(schema(r.sourceNbt).Metadata.value.Date.value,'9223372036854775807');
 assert.equal(schema(r.sourceNbt).CustomField.value,'retained in source');
 assert.ok(r.warnings.some(x=>x.includes('Biom')));assert.ok(r.warnings.some(x=>x.includes('Entities')));assert.ok(r.warnings.some(x=>x.includes('Modblöcke')));assert.ok(r.warnings.some(x=>x.includes('Zusätzliche')));
});
test('valid sparse palette IDs, default namespace and canonical duplicate states',()=>{
 assert.deepEqual(parseBlockState('stone'),{id:'minecraft:stone',properties:Object.create(null)});
 const r=source();const s=schema(r);delete s.Offset;
 s.Blocks.value.Palette.value['stone']={type:'int',value:123};
 const result=normalizeSchem(r);assert.deepEqual(result.offset,[0,0,0]);assert.equal(result.payload.palette.length,4);
});
for(const [name,change,pattern] of [
 ['v2',s=>s.Version.value=2,/Version 3/],['missing DataVersion',s=>delete s.DataVersion,/DataVersion/],
 ['zero dimension',s=>s.Width.value=0,/Width/],['unsigned dimension limit',s=>s.Width.value=-1,/Width/],
 ['wrong dimension type',s=>s.Width.type='int',/Short/],['volume limit',s=>{s.Width.value=256;s.Height.value=256;},/Bauvolumen/],
 ['invalid offset',s=>s.Offset.value=[0,0],/drei/],['missing blocks',s=>delete s.Blocks,/Blocks/],
 ['duplicate palette IDs',s=>s.Blocks.value.Palette.value['minecraft:air'].value=7,/doppelte/],
 ['negative palette IDs',s=>s.Blocks.value.Palette.value['minecraft:air'].value=-1,/Negative/],
 ['undefined palette ID',s=>s.Blocks.value.Data.value[0]=99,/unbekannte Paletten/],
 ['short block data',s=>s.Blocks.value.Data.value.pop(),/enden/],
 ['trailing block data',s=>s.Blocks.value.Data.value.push(0),/Überzählige/],
 ['long varint',s=>s.Blocks.value.Data.value=[-128,-128,-128,-128,-128,0],/VarInt/],
 ['varint overflow',s=>s.Blocks.value.Data.value=[-1,-1,-1,-1,127],/VarInt/],
 ['out of bounds block entity',s=>s.Blocks.value.BlockEntities.value[0].value.Pos.value=[99,0,0],/außerhalb/],
 ['air block entity',s=>s.Blocks.value.BlockEntities.value[0].value.Pos.value=[1,0,0],/belegte/],
 ['missing entity Id',s=>delete s.Blocks.value.BlockEntities.value[0].value.Id,/Id fehlt/],
 ['malformed properties',s=>s.Blocks.value.Palette.value['minecraft:stone[a=b,a=c]']={type:'int',value:4},/Doppelte Property/],
])test(`schema rejects ${name}`,()=>{const r=source();change(schema(r));assert.throws(()=>normalizeSchem(r),pattern);});
test('NBT limits and truncation rejected before uncontrolled allocations',()=>{
 assert.throws(()=>readNbt(raw.subarray(0,raw.length-1)),/endet/);
 assert.throws(()=>readNbt(Buffer.concat([raw,Buffer.from([0])])),/Zusätzliche/);
 assert.throws(()=>readNbt(raw,{maxBytes:10}),/Größenlimit/);
 assert.throws(()=>readNbt(raw,{maxNodes:4}),/limit/);
 assert.throws(()=>readNbt(raw,{maxDepth:1}),/Tiefenlimit/);
 assert.throws(()=>readNbt(raw,{maxNodes:-1}),/Ungültiges/);
 // Independently specified minimal byte fixtures.
 assert.throws(()=>readNbt(Buffer.from('0a000007000178ffffffff00','hex')),/Negative/);
 assert.throws(()=>readNbt(Buffer.from('0a00000300017800000001030001780000000200','hex')),/Doppelter/);
 assert.throws(()=>readNbt(Buffer.from('0a000009000178000000000100','hex')),/Listentyp/);
 assert.throws(()=>readNbt(Buffer.from('0a0000080001780004f09f988000','hex')),/Modified/);
 assert.throws(()=>readNbt(Buffer.from('0a00000d00017800','hex')),/Typ/);
});
test('gzip is structural, bounded and corrupt streams fail',async()=>{
 await assert.rejects(importSchemV3(ab(raw)),/GZip/);
 await assert.rejects(importSchemV3(ab(zipped),{maxCompressedBytes:5}),/Größenlimit/);
 await assert.rejects(importSchemV3(ab(zipped),{maxUncompressedBytes:10}),/Größenlimit/);
 await assert.rejects(importSchemV3(ab(zipped.subarray(0,zipped.length-6))),/beschädigt/);
 const broken=Buffer.from(zipped);broken[broken.length-8]^=255;await assert.rejects(importSchemV3(ab(broken)),/beschädigt/);
 await assert.rejects(importSchemV3(ab(zipped),{maxDurationMs:-1}),/Limit/);
});
test('NBT budget also limits declared huge arrays and nonfinite floating data',()=>{
 assert.throws(()=>readNbt(Buffer.from('0a0000070001787fffffff00','hex')),/limit/);
 assert.throws(()=>readNbt(Buffer.from('0a0000050001787fc0000000','hex')),/Gleitkomma/);
 assert.throws(()=>readNbt(Buffer.from('0a000006000178800000000000000000','hex')),/Gleitkomma/);
});
test('rejected format never mutates an existing canonical plan',()=>{
 const existing=normalizeSchem(source()).payload;const before=JSON.stringify(existing);const bad=source();schema(bad).Version.value=1;
 assert.throws(()=>normalizeSchem(bad),FormatError);assert.equal(JSON.stringify(existing),before);
});
test('NBT deadline is enforced with an independent deterministic clock',t=>{
 let now=0;t.mock.method(performance,'now',()=>{now+=10;return now;});
 assert.throws(()=>readNbt(raw,{maxDurationMs:1}),/Zeitbudget/);
});
