import test from 'node:test';
import assert from 'node:assert/strict';
import { AssetRevisionConflictError, MemoryRepository, nextAssetRevision } from '../../../dist/application/src/index.js';
import { createAsset, createProject, createSampleLibrary } from '../../../dist/domain/src/index.js';

const newAsset = () => createAsset({name:'CAS-Test',provenance:{author:'Test',source:'synthetisch',license:'eigener Test'}});
const find = async (repo,id) => (await repo.listAssets()).find(a=>a.id===id);

test('asset CAS: simultaneous metadata writes have one winner and actionable conflict fields', async () => {
  const repo=new MemoryRepository(), asset=newAsset();
  await repo.saveAsset(asset);
  const a=await find(repo,asset.id), b=await find(repo,asset.id);
  assert.equal(a.revision,1);
  const results=await Promise.allSettled([repo.saveAsset({...a,name:'Gewinner'}),repo.saveAsset({...b,tags:['stale']})]);
  assert.equal(results[0].status,'fulfilled');
  const error=results[1].reason;
  assert.ok(error instanceof AssetRevisionConflictError);
  assert.deepEqual([error.assetId,error.stored,error.base],[asset.id,2,1]);
  assert.match(error.message,/Bibliothek neu laden/);
  assert.equal((await find(repo,asset.id)).name,'Gewinner');
  assert.deepEqual((await find(repo,asset.id)).tags,[]);
  assert.equal((await find(repo,asset.id)).revision,2);
});

test('new-version append races reject the stale batch without leaving an orphan version', async () => {
  const repo=new MemoryRepository(),asset=newAsset();
  await repo.saveAsset(asset);
  const a=await find(repo,asset.id),b=await find(repo,asset.id);
  const lib=await createSampleLibrary(), [v1,v2]=lib.versions;
  await repo.applyBatch({assets:[{...a,versionIds:[v1.id]}],versions:[v1]});
  await assert.rejects(repo.applyBatch({assets:[{...b,versionIds:[v2.id]}],versions:[v2]}),AssetRevisionConflictError);
  assert.deepEqual((await find(repo,asset.id)).versionIds,[v1.id]);
  assert.deepEqual((await repo.listVersions()).map(v=>v.id),[v1.id]);
});

test('failed asset or project CAS rolls back assets, versions, original bytes and projects together', async () => {
  const repo=new MemoryRepository(),asset=newAsset(),project=createProject({name:'CAS-Projekt'});
  await repo.saveAsset(asset);
  const current=await find(repo,asset.id), lib=await createSampleLibrary(),version=lib.versions[0];
  const original={sha256:'rollback-test',fileName:'test.bin',mediaType:'application/octet-stream',size:2,createdAt:new Date().toISOString(),bytes:new Uint8Array([1,2])};
  await assert.rejects(repo.applyBatch({assets:[asset],versions:[version],originals:[original],projects:[{project,baseRevision:0}]}),AssetRevisionConflictError);
  assert.equal(await repo.getProject(project.id),null);
  assert.equal(await repo.getOriginal(original.sha256),null);
  assert.equal((await repo.listVersions()).length,0);
  const saved=await repo.saveProject(project,0);
  await assert.rejects(repo.applyBatch({assets:[{...current,name:'nicht speichern'}],versions:[version],originals:[original],projects:[{project:saved,baseRevision:0}]}),/zwischenzeitlich/);
  assert.deepEqual(await find(repo,asset.id),current);
  assert.equal(await repo.getOriginal(original.sha256),null);
  assert.equal((await repo.listVersions()).length,0);
  assert.equal((await repo.getProject(project.id)).revision,1);
});

test('duplicate IDs, nonexistent nonzero bases, invalid revisions and overflow reject atomically', async () => {
  const repo=new MemoryRepository(),asset=newAsset();
  await assert.rejects(repo.applyBatch({assets:[asset,{...asset,name:'Duplikat'}]}),/doppelt/);
  assert.equal((await repo.listAssets()).length,0);
  await assert.rejects(repo.saveAsset({...asset,revision:1}),AssetRevisionConflictError);
  for(const revision of [null,-1,.5,NaN,Infinity,'0',Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1]) {
    await assert.rejects(repo.saveAsset({...asset,revision}),/revision/i);
  }
  assert.throws(()=>nextAssetRevision({...asset,revision:0},{...asset,revision:-1}),/Assetrevision/);
  const legacy={...asset};delete legacy.revision;
  await repo.saveAsset(legacy);
  assert.equal((await find(repo,asset.id)).revision,1);
  assert.equal(legacy.revision,undefined);
});

test('memory writes and reads copy mutable data so external aliases cannot bypass asset CAS', async () => {
  const repo=new MemoryRepository(),asset=structuredClone(newAsset());
  const pending=repo.saveAsset(asset);
  asset.name='Änderung nach Aufruf';asset.tags.push('untracked');asset.revision=100;
  await pending;
  const first=await find(repo,asset.id);
  assert.equal(first.name,'CAS-Test');assert.deepEqual(first.tags,[]);assert.equal(first.revision,1);
  first.name='Änderung am Lesewert';first.tags.push('untracked');first.revision=0;
  const second=await find(repo,asset.id);
  assert.equal(second.name,'CAS-Test');assert.deepEqual(second.tags,[]);assert.equal(second.revision,1);
  await assert.rejects(repo.saveAsset(first),AssetRevisionConflictError);
});

test('duplicate version, project and original rows reject before any related store is changed', async () => {
  const repo=new MemoryRepository(),asset=newAsset(),lib=await createSampleLibrary(),version=lib.versions[0],project=createProject({name:'Doppeltes Projekt'});
  const original={sha256:'duplicate',fileName:'x.bin',mediaType:'application/octet-stream',size:1,createdAt:asset.createdAt,bytes:new Uint8Array([1])};
  const batches=[
    {assets:[asset],versions:[version,{...version,payloadHash:'conflicting-hash'}]},
    {assets:[asset],versions:[version],projects:[{project,baseRevision:0},{project:{...project,name:'Doppelgänger'},baseRevision:0}]},
    {assets:[asset],versions:[version],projects:[{project,baseRevision:0}],originals:[original,{...original,bytes:new Uint8Array([2])}]},
  ];
  for(const batch of batches) {
    await assert.rejects(repo.applyBatch(batch),/doppelt/);
    assert.equal((await repo.listAssets()).length,0);
    assert.equal((await repo.listVersions()).length,0);
    assert.equal((await repo.listProjects()).length,0);
    assert.equal((await repo.listOriginalHashes()).length,0);
  }
});

test('both adapters share full asset-field validation rather than storing a later library crash', async () => {
  const repo=new MemoryRepository(),asset=newAsset();
  await assert.rejects(repo.saveAsset({...asset,provenance:null}),/Herkunft/);
  await assert.rejects(repo.saveAsset({...asset,tags:'not-an-array'}),/Liste/);
  assert.equal((await repo.listAssets()).length,0);
});
