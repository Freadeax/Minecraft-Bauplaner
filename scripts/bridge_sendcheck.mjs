// Planner → mod check of "Senden" (Weltkarte, POST /v1/plan): the plan is exported with the same settings
// as the website (LIVE_PLAN_EXPORT), read with the mod's own PlanModel and compared block by block with the
// planner's world – small turned and mirrored parts and every Großprojekt. Found the structure_void bug of
// 2026-11-03 (the mod took the whole empty box as blocks). Run via scripts/test_bridge.sh.
// Optional: node scripts/bridge_sendcheck.mjs <classpath> <extra .litematic> checks a big real file too.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { importLitematic } from '../dist/formats/src/index.js';
import { prepareRevisionExport } from '../dist/application/src/index.js';
import {
  GROSSPROJEKTE, LIVE_PLAN_EXPORT, addAssetVersion, applyOperation, buildGrossprojektPlan, createAsset, createBuildingLibrary, createGrossprojektProject,
  createProject, createSampleLibrary, newInstance, planGrossprojekt, previewGrossprojekt, resolveProject,
} from '../dist/domain/src/index.js';

const [classpath, extra] = process.argv.slice(2);
const dir = mkdtempSync(join(tmpdir(), 'sendcheck-'));
const norm = s => { const m = /^([^[]+)(?:\[(.*)\])?$/.exec(s); const p = m[2] ? m[2].split(',').sort() : []; return p.length ? `${m[1]}[${p.join(',')}]` : m[1]; };
const text = st => norm(Object.keys(st.properties).length ? `${st.id}[${Object.entries(st.properties).map(([k, v]) => `${k}=${v}`).join(',')}]` : st.id);

async function check(label, project, versions) {
  const { project: frozen, output } = await prepareRevisionExport(project, versions, { ...LIVE_PLAN_EXPORT, dataVersion: 5023 });
  const file = join(dir, `${label}.schem`), dump = join(dir, `${label}.txt`);
  writeFileSync(file, output.bytes);
  const run = spawnSync('java', ['-Xmx3g', '-cp', classpath, 'io.github.freadeax.bauplaner.mod.DumpPlan', file, dump], { encoding: 'utf8' });
  assert.equal(run.status, 0, `${label}: ${run.stderr}`);
  const mod = new Map();
  for (const line of readFileSync(dump, 'utf8').split('\n')) if (line) { const [x, y, z, s] = line.split(' '); mod.set(`${x},${y},${z}`, norm(s)); }
  const world = resolveProject(frozen, versions).world;
  let blocks = 0;
  for (const c of world.cells) {
    if (c.kind !== 'block') continue;
    blocks++;
    const k = c.position.join(',');
    assert.equal(mod.get(k), text(world.palette[c.paletteIndex]), `${label}: Block bei ${k}`);
  }
  assert.equal(mod.size, blocks, `${label}: die Mod zeigt genau die Planblöcke (keine Leerzellen als Blöcke)`);
  return `${label} ${blocks}`;
}

const done = [];
const sample = await createSampleLibrary();
const sv = new Map(sample.versions.map(v => [v.id, v]));
const ids = [...new Set(sample.versions.map(v => v.assetId))];
const latest = id => sample.versions.find(v => v.assetId === id).id;
const parts = [];
ids.forEach((id, i) => { for (let t = 0; t < 4; t++) for (const m of [false, true]) parts.push(newInstance({ assetVersionId: latest(id), name: `${id} ${t} ${m}`, transform: { position: [i * 40 + t * 9, (t % 2) * 3 - 2, (m ? 20 : 0) - 7], quarterTurns: t, mirrorX: m } })); });
const turned = applyOperation(createProject({ name: 'Gedreht und gespiegelt' }), { kind: 'batch', label: 't', operations: parts.map(instance => ({ kind: 'instance.add', instance })) }).project;
done.push(await check('gedreht', turned, sv));

const buildings = await createBuildingLibrary();
const bv = new Map(buildings.versions.map(v => [v.id, v]));
for (const gp of GROSSPROJEKTE) {
  const plan = await buildGrossprojektPlan(planGrossprojekt(gp, { assets: buildings.assets, versions: bv }, {}));
  const project = createGrossprojektProject(plan, previewGrossprojekt(plan));
  const v = new Map(bv); v.set(plan.network.version.id, plan.network.version);
  done.push(await check(gp.id, project, v));
}

if (extra) {
  const b = readFileSync(extra);
  const r = await importLitematic(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const { version } = await addAssetVersion(createAsset({ name: 'gross', tags: [], provenance: { author: 'x', source: 'x', license: 'x' } }), { payload: r.payload, source: { kind: 'import', format: 'litematic' } });
  const v = new Map([[version.id, version]]);
  for (const t of [0, 1]) done.push(await check(`datei-${t}`, { ...createProject({ name: 'Datei' }), instances: [newInstance({ assetVersionId: version.id, name: 'd', transform: { position: [5, -3, 7], quarterTurns: t, mirrorX: false } })] }, v));
}
console.log(`Sendeprüfung bestanden: ${done.join(', ')} Blöcke – die Mod liest jeden Block wie geplant, keine Leerzellen als Blöcke.`);
