import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {cpus} from 'node:os';
import {performance} from 'node:perf_hooks';
import {computeProject,mergeBuildItems} from '../dist/application/src/projectComputation.js';
import {createProject,createSampleLibrary,newInstance,resolveProject,buildGuide,materialsForParts,materialsForResolution,siteOf,planSite,checkSections,reservationsFor,evaluateProgress} from '../dist/domain/src/index.js';
import {createPayload} from '../dist/voxel/src/index.js';
import {createProjectComputationClient} from '../apps/web/src/computation/client.ts';

const library=await createSampleLibrary(),versions=new Map(library.versions.map(v=>[v.id,v]));
const instance=newInstance({name:'Test',assetVersionId:library.versions[0].id,transform:{position:[0,0,0],quarterTurns:0,mirrorX:false}});
const project={...createProject({name:'Berechnung'}),profileId:library.versions[0].payload.profileId,instances:[instance]};
const input={project,versions};
const computed=computeProject(input);
function fakeFactory(){
  const workers=[];
  return {workers,factory:()=>{const worker={onmessage:null,onerror:null,onmessageerror:null,request:null,terminated:0,postMessage(request){this.request=request;},terminate(){this.terminated++;}};workers.push(worker);return worker;}};
}
function reply(worker,result=computed,patch={}){const {jobId,projectId,revision,basisRevisionId}=worker.request;worker.onmessage?.({data:{jobId,projectId,revision,basisRevisionId,type:'project-computed',result,...patch}});}

test('shared computation exactly reuses resolver, guide and scoped material rules including frozen basis',()=>{
  const before=structuredClone(input),result=computeProject(input),resolution=resolveProject(project,versions),guide=buildGuide(project,resolution);
  assert.deepEqual(result.resolution,resolution);assert.deepEqual(result.guide,guide);
  assert.deepEqual(result.materials,materialsForResolution(resolution));
  assert.deepEqual(result.stepMaterials,materialsForParts(resolution.world,guide.steps.map(s=>({id:s.id,positions:s.positions,conflicts:s.conflicts}))));
  assert.deepEqual(result.instanceMaterials.get(instance.id),materialsForResolution(resolution,{kind:'instance',instanceId:instance.id,name:instance.name}));
  const basis={id:'frozen',number:1,comment:'Test',createdAt:project.createdAt,instances:[],links:[]};
  const historical=computeProject({...input,basis});
  assert.equal(historical.resolution.world,null);assert.deepEqual(historical.guide,buildGuide(basis,historical.resolution));
  const site=siteOf(project),progress=evaluateProgress(guide,project.progress);
  assert.deepEqual(result.site,{progress,plan:planSite(site,guide,progress,resolution),issues:checkSections(site,project,guide),reservations:reservationsFor(project,versions,site,resolution)});
  const overlapping={...project,instances:[instance,{...instance,id:'second',name:'Second',transform:{...instance.transform,position:[1,0,0]}}]};
  const overlapResult=computeProject({project:overlapping,versions});
  for(const inst of overlapping.instances) assert.deepEqual(overlapResult.instanceMaterials.get(inst.id),materialsForResolution(overlapResult.resolution,{kind:'instance',instanceId:inst.id,name:inst.name}));
  assert.deepEqual(input,before);
});

test('worker client supersedes active work, ignores late callbacks and checks every result tag',async()=>{
  const {workers,factory}=fakeFactory(),client=createProjectComputationClient({workerFactory:factory,timeoutMs:1000});
  const first=client.run(input),rejected=assert.rejects(first,{name:'AbortError'}),late=workers[0].onmessage;
  const second=client.run({...input,project:{...project,revision:project.revision+1}});
  await rejected;assert.equal(workers[0].terminated,1);
  late({data:{...workers[0].request,type:'project-computed',result:computed}});
  reply(workers[1]);assert.deepEqual(await second,computed);assert.equal(workers[1].terminated,1);
  for(const patch of [{jobId:999},{projectId:'other'},{revision:999},{basisRevisionId:'other'}]){
    const pending=client.run(input);reply(workers.at(-1),computed,patch);await assert.rejects(pending,/Projektbasis/);assert.equal(workers.at(-1).terminated,1);
  }
  client.dispose();
});

test('all terminal paths clean up and allow retry; disposed client never creates another worker',async()=>{
  const {workers,factory}=fakeFactory(),client=createProjectComputationClient({workerFactory:factory,timeoutMs:10});
  let pending=client.run(input);await assert.rejects(pending,{name:'TimeoutError'});assert.equal(workers[0].terminated,1);
  const controller=new AbortController();pending=client.run(input,controller.signal);controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(workers[1].onmessage,null);
  pending=client.run(input);workers.at(-1).onerror({message:'crashed'});await assert.rejects(pending,/crashed/);
  pending=client.run(input);workers.at(-1).onmessageerror({});await assert.rejects(pending,/übertragen/);
  pending=client.run(input);reply(workers.at(-1),{});await assert.rejects(pending,/unvollständiges/);
  pending=client.run(input);reply(workers.at(-1),computed,{type:'project-computation-error',error:'Fachfehler'});await assert.rejects(pending,/Fachfehler/);
  pending=client.run(input);client.dispose();await assert.rejects(pending,{name:'AbortError'});
  const count=workers.length;await assert.rejects(client.run(input),/geschlossen/);assert.equal(workers.length,count);
  for(const worker of workers)assert.equal(worker.terminated,1);
});

test('aborted signal, unavailable worker and postMessage failure do not run synchronous computation',async()=>{
  const controller=new AbortController();controller.abort();let calls=0;
  const unavailable=createProjectComputationClient({workerFactory:()=>{calls++;throw new Error('nicht verfügbar');}});
  await assert.rejects(unavailable.run(input,controller.signal),{name:'AbortError'});assert.equal(calls,0);
  await assert.rejects(unavailable.run(input),/nicht verfügbar/);assert.equal(calls,1);
  const {workers,factory}=fakeFactory();const client=createProjectComputationClient({workerFactory:()=>{const w=factory();w.postMessage=()=>{throw new Error('clone failed');};return w;}});
  await assert.rejects(client.run(input),/clone failed/);assert.equal(workers[0].terminated,1);
  client.dispose();unavailable.dispose();
});

test('explicit cancel and an abort raised during worker creation settle without posting work',async()=>{
  const {workers,factory}=fakeFactory(),client=createProjectComputationClient({workerFactory:factory});
  const pending=client.run(input);client.cancel();await assert.rejects(pending,{name:'AbortError'});assert.equal(workers[0].terminated,1);
  const controller=new AbortController();
  const aborted=createProjectComputationClient({workerFactory:()=>{const worker=factory();controller.abort();return worker;}});
  await assert.rejects(aborted.run(input,controller.signal),{name:'AbortError'});assert.equal(workers[1].request,null);assert.equal(workers[1].terminated,1);
  assert.throws(()=>createProjectComputationClient({timeoutMs:0}),/Timeout/);
  client.dispose();aborted.dispose();
});

test('only referenced versions cross worker boundary and one successful run removes abort listener',async()=>{
  const {workers,factory}=fakeFactory(),client=createProjectComputationClient({workerFactory:factory});
  const controller=new AbortController(),pending=client.run(input,controller.signal);
  assert.deepEqual([...workers[0].request.input.versions.keys()],[instance.assetVersionId]);
  reply(workers[0]);await pending;controller.abort();assert.equal(workers[0].terminated,1);
  client.dispose();
});

test('merging disjoint step reports recomputes shared stack boundaries and preserves assumptions without mutation',()=>{
  const source={state:{id:'minecraft:stone',properties:{}},key:'minecraft:stone',cells:40,items:40,rule:'direct',confidence:'catalog'};
  const line={itemId:'minecraft:stone',count:40,stackSize:64,fullStacks:0,remainder:40,slots:1,packable:true,confidence:'catalog',sources:[source]};
  const unresolved={state:{id:'mod:block',properties:{}},key:'mod:block',count:2,reason:'mod-namespace',message:'Modblock'};
  const a={items:[line],unresolved:[unresolved],conflicts:1,totals:{items:40,slots:1,shulkerBoxes:1,unpackableSlots:0}};
  const b={...a,items:[{...line,confidence:'assumed',sources:[{...source,confidence:'assumed'}]}]};
  const before=structuredClone([a,b]),merged=mergeBuildItems([a,b]);
  assert.deepEqual([merged.items[0].count,merged.items[0].fullStacks,merged.items[0].remainder,merged.totals.slots],[80,1,16,2]);
  assert.equal(merged.items[0].confidence,'assumed');assert.equal(merged.items[0].sources[0].items,80);assert.equal(merged.unresolved[0].count,4);assert.equal(merged.conflicts,2);
  assert.deepEqual([a,b],before);assert.deepEqual(mergeBuildItems([]),{items:[],unresolved:[],conflicts:0,totals:{items:0,slots:0,shulkerBoxes:0,unpackableSlots:0}});
  assert.throws(()=>mergeBuildItems([a,{...a,items:[{...line,stackSize:16}]}]),/Stapelregeln/);
});

test('real Node worker structured-clone results match main calculation while event loop stays serviceable',async t=>{
  const side=35,palette=[{id:'minecraft:stone',properties:{}}],cells=[];
  for(let y=0;y<side;y++)for(let z=0;z<side;z++)for(let x=0;x<side;x++)cells.push({kind:'block',position:[x,y,z],paletteIndex:0});
  const payload=createPayload({schemaVersion:1,profileId:project.profileId,bounds:{min:[0,0,0],maxExclusive:[side,side,side]},pivot:[0,0,0],sourceOrigin:[0,0,0],palette,cells,blockEntities:[]});
  const version={...library.versions[0],id:'synthetic-perf',payload},large={project:{...project,instances:[{...instance,assetVersionId:version.id}]},versions:new Map([[version.id,version]])};
  const mainStart=performance.now(),expected=computeProject(large),mainMs=performance.now()-mainStart;
  const url=new URL('../dist/application/src/projectComputation.js',import.meta.url).href;
  const worker=new Worker(`const {parentPort}=require('node:worker_threads');parentPort.on('message',async input=>{try{const {computeProject}=await import(${JSON.stringify(url)});parentPort.postMessage({result:computeProject(input)});}catch(error){parentPort.postMessage({error:error.message});}});`,{eval:true});
  let ticks=0,maxDelay=0,last=performance.now();const timer=setInterval(()=>{const now=performance.now();maxDelay=Math.max(maxDelay,now-last);last=now;ticks++;},5);
  const start=performance.now();
  try{
    const actual=await new Promise((resolve,reject)=>{worker.once('error',reject);worker.once('message',m=>m.error?reject(new Error(m.error)):resolve(m.result));worker.postMessage(large);});
    const totalMs=performance.now()-start;
    assert.deepEqual(actual,expected);assert.ok(actual.resolution.owners instanceof Map);assert.ok(actual.guide.byId instanceof Map);assert.ok(actual.stepMaterials instanceof Map);assert.ok(ticks>0,'main event loop serviced heartbeat while worker computed');
    t.diagnostic(JSON.stringify({runtime:process.version,cpu:cpus()[0]?.model,cells:cells.length,mainMs:Math.round(mainMs),workerTotalMs:Math.round(totalMs),heartbeatTicks:ticks,maxHeartbeatDelayMs:Math.round(maxDelay),scope:'Node worker_threads only; not browser performance'}));
  }finally{clearInterval(timer);await worker.terminate();}
});
