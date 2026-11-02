// Browser check of MODEL-01 (3D file export) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkClosed, readStl } from '../../dist/formats/src/index.js';
import { readZip } from '../../apps/web/src/blockmodels/zip.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4271, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

async function page(viewport = { width: 1400, height: 1000 }) {
  const p = await (await browser.newContext({ viewport, acceptDownloads: true })).newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  return { p, errors };
}
const bytesOf = async download => new Uint8Array(await readFile(await download.path()));
/** STL triangle soup → mesh for the closed check. */
function stlMesh(stl) {
  const { positions, triangles } = readStl(stl);
  return { name: 'stl', unit: 'millimeter', up: 'z', materials: [], groups: [{ material: 0, positions, normals: null, uvs: null, colors: null, indices: Uint32Array.from({ length: triangles * 3 }, (_, i) => i) }] };
}

test('Bauteil: Reiter Modelldatei exportiert GLB, wasserdichtes STL und 3MF mit Farben', async () => {
  const { p, errors } = await page();
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_villa`);
  const tabs = p.getByRole('tablist', { name: 'Ansicht' });
  await tabs.getByRole('tab', { name: 'Modelldatei' }).click();
  assert.match(p.url(), /gebaeude\/bld_villa\/modell$/);
  const panel = p.getByRole('region', { name: '3D-Datei' });
  await panel.waitFor();

  // GLB (view model, default).
  const [glb] = await Promise.all([p.waitForEvent('download'), panel.getByRole('button', { name: /glTF-Binär exportieren/ }).click()]);
  assert.match(glb.suggestedFilename(), /\.glb$/);
  const g = await bytesOf(glb);
  const dv = new DataView(g.buffer);
  assert.equal(dv.getUint32(0, true), 0x46546c67, 'glTF magic');
  assert.equal(dv.getUint32(8, true), g.length);
  const json = JSON.parse(new TextDecoder().decode(g.subarray(20, 20 + dv.getUint32(12, true))));
  assert.ok(json.meshes[0].primitives.length > 0);
  await p.getByRole('region', { name: '3D-Exportbericht' }).waitFor();

  // STL: print shell, watertight.
  await panel.getByText('STL (.stl)').click();
  assert.equal(await panel.getAttribute('data-kind'), 'print');
  await panel.getByRole('button', { name: 'auf 100 mm' }).click();
  const [stl] = await Promise.all([p.waitForEvent('download'), panel.getByRole('button', { name: /STL exportieren/ }).click()]);
  assert.match(stl.suggestedFilename(), /\.stl$/);
  const s = await bytesOf(stl);
  const report = p.getByRole('region', { name: '3D-Exportbericht' });
  await report.getByText('✓ wasserdicht und mannigfaltig').waitFor();
  assert.equal(await report.getAttribute('data-closed'), 'true');
  const check = checkClosed(stlMesh(s));
  assert.equal(check.closed, true, JSON.stringify(check));
  assert.ok(check.volume > 0);
  const { positions } = readStl(s);
  let maxX = 0, maxY = 0, maxZ = 0;
  for (let i = 0; i < positions.length; i += 3) { maxX = Math.max(maxX, positions[i]); maxY = Math.max(maxY, positions[i + 1]); maxZ = Math.max(maxZ, positions[i + 2]); }
  assert.ok(Math.abs(Math.max(maxX, maxY, maxZ) - 100) < 0.5, `longest side ≈ 100 mm (${maxX}, ${maxY}, ${maxZ})`);

  // 3MF with at most 4 colours, hollowed.
  await panel.getByText('3MF (.3mf)').click();
  await panel.getByRole('combobox', { name: 'Farben' }).selectOption('4');
  await panel.getByRole('checkbox', { name: /Aushöhlen/ }).check();
  const [mf] = await Promise.all([p.waitForEvent('download'), panel.getByRole('button', { name: /3MF exportieren/ }).click()]);
  const files = await readZip(await bytesOf(mf), () => true);
  const model = new TextDecoder().decode(files.get('3D/3dmodel.model'));
  assert.match(model, /unit="millimeter"/);
  const bases = (model.match(/<base /g) ?? []).length;
  assert.ok(bases >= 1);
  assert.ok(new Set([...model.matchAll(/p1="(\d+)"/g)].map(m => m[1])).size <= 4, 'at most four colours used');
  await report.getByText(/ausgehöhlt/).waitFor();
  assert.deepEqual(errors, []);
});

test('Betrachter und Anlage bieten den 3D-Export; OBJ kommt als ZIP mit MTL', async () => {
  const { p, errors } = await page({ width: 390, height: 844 });
  await p.goto(`${BASE}#/betrachter`);
  const plans = p.getByRole('region', { name: 'Bilder und Bauplan' });
  await plans.getByRole('tab', { name: 'Modelldatei' }).click();
  const panel = plans.getByRole('region', { name: '3D-Datei' });
  await panel.getByText('OBJ + MTL (.zip)').click();
  const [obj] = await Promise.all([p.waitForEvent('download'), panel.getByRole('button', { name: /OBJ \+ MTL exportieren/ }).click()]);
  assert.match(obj.suggestedFilename(), /_obj\.zip$/);
  const files = await readZip(await bytesOf(obj), () => true);
  const names = [...files.keys()];
  const objName = names.find(n => n.endsWith('.obj')), mtlName = names.find(n => n.endsWith('.mtl'));
  assert.ok(objName && mtlName, names.join(', '));
  const text = new TextDecoder().decode(files.get(objName));
  assert.match(text, new RegExp(`^mtllib ${mtlName.replace('.', '\\.')}$`, 'm'));
  assert.ok(text.split('\n').filter(l => l.startsWith('f ')).length > 10);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'no horizontal scroll on the phone');

  await p.goto(`${BASE}#/bibliothek/anlagen/anl_landleben`);
  const details = p.locator('details.anlage-model3d');
  await details.locator('summary').click();
  await details.getByRole('region', { name: '3D-Datei' }).waitFor();
  assert.deepEqual(errors, []);
});
