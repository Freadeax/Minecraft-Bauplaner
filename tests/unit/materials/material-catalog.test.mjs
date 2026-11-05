import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBlockId, countMaterials, materialShortage } from '../../../apps/web/src/materials/materialCatalog.mjs';
test('accepts namespaced vanilla and mod block IDs',()=>{assert.equal(normalizeBlockId('minecraft:oak_planks'),'minecraft:oak_planks');assert.equal(normalizeBlockId('example_mod:blocks/custom'),'example_mod:blocks/custom');});
test('rejects unsafe block IDs',()=>{for(const id of ['Oak','../x','minecraft:',null]) assert.throws(()=>normalizeBlockId(id));});
test('aggregates duplicate IDs deterministically',()=>{assert.deepEqual(countMaterials([{id:'minecraft:stone',count:2},{id:'minecraft:dirt',count:1},{id:'minecraft:stone',count:3}]),[{id:'minecraft:dirt',count:1},{id:'minecraft:stone',count:5}]);});
test('rejects negative, fractional and overflowing counts',()=>{for(const count of [-1,1.5,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>countMaterials([{id:'minecraft:stone',count}]));assert.throws(()=>countMaterials([{id:'minecraft:stone',count:Number.MAX_SAFE_INTEGER},{id:'minecraft:stone',count:1}]));});
test('computes shortage without inventing recipes',()=>{assert.deepEqual(materialShortage([{id:'minecraft:stone',count:12}],[{id:'minecraft:stone',count:4}]),[{id:'minecraft:stone',required:12,available:4,missing:8}]);});
