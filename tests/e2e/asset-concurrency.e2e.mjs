// Real IndexedDB regression against the source adapter, including v1 -> v2 upgrade.
// Uses Vite's source server so the tested adapter is imported directly without a product debug API.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const PORT=4234,BASE=`http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server,browser;
before(async()=>{
  server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'ignore'});
  for(let i=0;i<50;i++){try{if((await fetch(BASE)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch();
});
after(async()=>{await browser?.close();server?.kill();});
async function setup(){
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.route(BASE,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>IndexedDB adapter regression</title>'}));
  await page.goto(BASE);
  await page.evaluate(async url=>{window.adapter=await import(url);},`${BASE}src/app/idbRepository.ts`);
  return {context,page};
}
const asset={schemaVersion:1,id:'migration_asset',name:'Legacy',description:'v1 bleibt erhalten',tags:['eigene'],provenance:{author:'Test',source:'synthetisch',license:'eigener Test'},archived:false,demo:false,versionIds:['legacy_version'],createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'};

test('v1 upgrade preserves records and originals, closes old client and enforces CAS across actual connections',async()=>{
  const {context,page}=await setup();
  const result=await page.evaluate(async asset=>{
    const {openIdbRepository,IdbRepository,DB_NAME,DB_VERSION}=window.adapter;
    const old=await new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{for(const [name,keyPath] of [['projects','id'],['assets','id'],['versions','id'],['originals','sha256'],['meta','key']])request.result.createObjectStore(name,{keyPath});};
      request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);
    });
    await new Promise((resolve,reject)=>{
      const tx=old.transaction(['assets','versions','originals'],'readwrite');
      tx.objectStore('assets').put(asset);
      tx.objectStore('assets').put({...asset,id:'stored_revision_asset',revision:7});
      tx.objectStore('versions').put({schemaVersion:1,id:'legacy_version',payloadHash:'unchanged',assetId:asset.id});
      tx.objectStore('originals').put({sha256:'original',fileName:'x.bin',mediaType:'application/octet-stream',size:3,createdAt:asset.createdAt,blob:new Blob([new Uint8Array([1,2,3])])});
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
    });
    const oldClient=new IdbRepository(old);
    const a=await openIdbRepository(),b=await openIdbRepository();
    let closed='';try{await oldClient.listAssets();}catch(e){closed=e.message;}
    const left=(await a.listAssets()).find(a=>a.id===asset.id),right=(await b.listAssets()).find(a=>a.id===asset.id);
    const preservedRevision=(await a.listAssets()).find(a=>a.id==='stored_revision_asset').revision;
    const results=await Promise.allSettled([a.saveAsset({...left,name:'Gewinner'}),b.applyBatch({assets:[{...right,name:'Verlierer'}],versions:[{schemaVersion:1,id:'orphan',payloadHash:'orphan'}],originals:[{sha256:'orphan-original',fileName:'lost.bin',mediaType:'application/octet-stream',size:1,createdAt:asset.createdAt,bytes:new Uint8Array([9])}]})]);
    const winner=(await a.listAssets())[0],versions=await a.listVersions();
    const bytes=Array.from((await a.getOriginal('original')).bytes);
    const error=results[1].reason;
    return {DB_VERSION,preservedRevision,closed,migrated:left,winner,versionIds:versions.map(v=>v.id),bytes,orphan:await a.getOriginal('orphan-original'),conflict:{name:error?.name,assetId:error?.assetId,stored:error?.stored,base:error?.base},statuses:results.map(r=>r.status)};
  },asset);
  assert.equal(result.DB_VERSION,3);assert.equal(result.preservedRevision,7);assert.match(result.closed,/neu laden/);
  assert.deepEqual(result.migrated,{...asset,revision:1});
  assert.deepEqual(result.statuses,['fulfilled','rejected']);
  assert.deepEqual(result.conflict,{name:'AssetRevisionConflictError',assetId:asset.id,stored:2,base:1});
  assert.equal(result.winner.name,'Gewinner');assert.equal(result.winner.revision,2);
  assert.deepEqual(result.versionIds,['legacy_version']);assert.deepEqual(result.bytes,[1,2,3]);assert.equal(result.orphan,null);
  await context.close();
});

test('invalid legacy revision aborts the whole upgrade and leaves v1 data unchanged',async()=>{
  const {context,page}=await setup();
  const result=await page.evaluate(async asset=>{
    const {openIdbRepository,DB_NAME}=window.adapter;
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{for(const [name,keyPath] of [['projects','id'],['assets','id'],['versions','id'],['originals','sha256'],['meta','key']])request.result.createObjectStore(name,{keyPath});};
      request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);
    });
    const malformed={...asset,revision:-1};
    await new Promise((resolve,reject)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({...asset,id:'a_valid'});tx.objectStore('assets').put(malformed);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
    db.close();let errorName='';try{await openIdbRepository();}catch(error){errorName=error.name;}
    const old=await new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const preserved=await new Promise((resolve,reject)=>{const request=old.transaction('assets').objectStore('assets').get(asset.id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const all=await new Promise((resolve,reject)=>{const request=old.transaction('assets').objectStore('assets').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const version=old.version;old.close();return {errorName,preserved,all,version};
  },asset);
  assert.equal(result.errorName,'StorageMigrationError');assert.equal(result.version,1);assert.deepEqual(result.preserved,{...asset,revision:-1});assert.deepEqual(result.all.find(a=>a.id==='a_valid'),{...asset,id:'a_valid'},'earlier cursor changes were rolled back too');
  await context.close();
});

test('v2 -> v3 upgrade (LIB-02/03) adds collection/template stores, keeps assets and enforces collection CAS across connections',async()=>{
  const {context,page}=await setup();
  const result=await page.evaluate(async asset=>{
    const {openIdbRepository,DB_NAME}=window.adapter;
    const old=await new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,2);
      request.onupgradeneeded=()=>{for(const [name,keyPath] of [['projects','id'],['assets','id'],['versions','id'],['originals','sha256'],['meta','key']])request.result.createObjectStore(name,{keyPath});};
      request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);
    });
    await new Promise((resolve,reject)=>{const tx=old.transaction(['assets'],'readwrite');tx.objectStore('assets').put({...asset,revision:4});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
    old.close();
    const a=await openIdbRepository(),b=await openIdbRepository();
    const before=await a.listCollections();
    const t='2026-11-01T00:00:00.000Z';
    const col={schemaVersion:1,id:'col_test',revision:0,name:'Sammlung',description:'',category:'',parentId:null,items:[],archived:false,createdAt:t,updatedAt:t};
    await a.applyBatch({collections:[col]});
    const [stored]=await b.listCollections();
    const results=await Promise.allSettled([a.applyBatch({collections:[{...stored,name:'Gewinner'}]}),b.applyBatch({collections:[{...stored,name:'Verlierer'}],assets:[{...asset,revision:4,name:'darf nicht'}]})]);
    let bad='';try{await a.applyBatch({collections:[{...col,id:'col_bad',items:'kaputt'}]});}catch(e){bad=e.message;}
    return {before,assetRevision:(await a.listAssets())[0].revision,assetName:(await a.listAssets())[0].name,after:(await a.listCollections()).map(c=>[c.name,c.revision]),statuses:results.map(r=>r.status),error:results[1].reason?.name,bad};
  },asset);
  assert.deepEqual(result.before,[]);
  assert.equal(result.assetRevision,4);assert.equal(result.assetName,'Legacy');
  assert.deepEqual(result.statuses,['fulfilled','rejected']);assert.equal(result.error,'LibraryRecordConflictError');
  assert.deepEqual(result.after,[['Gewinner',2]]);
  assert.match(result.bad,/Eintragsliste/);
  await context.close();
});
