// Browser checks for block B6 (viewer and controls) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`. Local Playwright/Chromium, no GitHub Actions.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const PORT = 4181, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function open(path, options = { viewport: { width: 1400, height: 1000 } }) {
  const context = await browser.newContext(options);
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(BASE + path);
  return { p, errors, close: () => context.close() };
}
const host = p => p.locator('.canvas-host');
const data = p => host(p).evaluate(e => ({ ...e.dataset }));
const camera = async p => (await data(p)).camera.split(',').map(Number);
async function ready(p, faces) {
  await p.waitForFunction(n => { const d = document.querySelector('.canvas-host')?.dataset; return d?.faces && d.camera && (n === undefined || d.faces === String(n)); }, faces);
}
const moved = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('Betrachter: WebGL mit Flächen-Culling, Ansichten, Ortho, Freiflug', async () => {
  const { p, errors, close } = await open('#/betrachter');
  await ready(p, 1118);
  const d = await data(p);
  assert.equal(d.mode, 'orbit'); assert.equal(d.blocks, '425'); assert.equal(d.view, 'iso');
  await p.getByRole('button', { name: 'Draufsicht (Norden oben)' }).click();
  await p.waitForFunction(() => document.querySelector('.canvas-host').dataset.view === 'top');
  const top = await camera(p);
  // Above the centre of the demo bounds (x −7…8, z −5…10).
  assert.ok(Math.abs(top[0] - 0.5) < 0.2 && Math.abs(top[2] - 2.5) < 0.2 && top[1] > 30, `top camera ${top}`);
  await p.getByRole('button', { name: 'Ansicht von Norden' }).click();
  await p.waitForTimeout(100);
  const north = await camera(p);
  assert.ok(north[2] < -20 && Math.abs(north[0] - 0.5) < 0.2, `north camera ${north}`);
  await p.getByRole('button', { name: 'Parallelprojektion' }).click();
  assert.equal((await data(p)).projection, 'orthographic');
  await p.getByRole('button', { name: 'Parallelprojektion' }).click();
  // Free flight with the keyboard: W flies towards the view direction (south from the north side).
  await p.getByRole('button', { name: 'Freier Flug' }).click();
  assert.equal((await data(p)).mode, 'flight');
  await p.getByText('WASD bewegen', { exact: false }).waitFor();
  const before = await camera(p);
  await p.keyboard.down('KeyW'); await p.waitForTimeout(600); await p.keyboard.up('KeyW');
  await p.waitForTimeout(100);
  const after = await camera(p);
  assert.ok(after[2] - before[2] > 2 && Math.abs(after[1] - before[1]) < 0.01, `W: ${before} → ${after}`);
  await p.keyboard.down('Space'); await p.waitForTimeout(400); await p.keyboard.up('Space');
  await p.waitForTimeout(100);
  assert.ok((await camera(p))[1] > after[1] + 1, 'Space climbs');
  await p.keyboard.press('Escape');
  assert.equal((await data(p)).mode, 'orbit');
  // Shortcuts on the focused scene.
  await host(p).focus(); await p.keyboard.press('2');
  assert.equal((await data(p)).view, 'top');
  // Picking still works after all camera changes.
  const box = await host(p).boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await p.getByText('BLOCKAUSWAHL').waitFor();
  assert.deepEqual(errors, []);
  await close();
});

test('Leistung: 27³ Blöcke (19 683) als sichtbare Hülle, Messwerte protokolliert', async () => {
  const { p, errors, close } = await open('#/betrachter');
  const cells = [];
  for (let x = 0; x < 27; x++) for (let y = 0; y < 27; y++) for (let z = 0; z < 27; z++) cells.push({ position: [x, y, z], kind: 'block', paletteIndex: (x + y + z) % 3 });
  const json = JSON.stringify({ schemaVersion: 1, profileId: 'test:perf', bounds: { min: [0, 0, 0], maxExclusive: [27, 27, 27] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [{ id: 'minecraft:stone', properties: {} }, { id: 'minecraft:dirt', properties: {} }, { id: 'minecraft:sand', properties: {} }], cells, blockEntities: [] });
  await ready(p);
  await p.locator('input[type=file]').setInputFiles({ name: 'wuerfel.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await ready(p, 6 * 27 * 27);
  const d = await data(p);
  assert.equal(d.blocks, '19683');
  // Frame time while orbiting: 60 rendered frames.
  const ms = await p.evaluate(async () => {
    const el = document.querySelector('.canvas-host canvas'), r = el.getBoundingClientRect();
    const t0 = performance.now(); let frames = 0;
    await new Promise(done => { const step = () => { frames++; el.dispatchEvent(new PointerEvent('pointermove', { clientX: r.x + 200 + frames, clientY: r.y + 200, pointerType: 'mouse', bubbles: true })); if (frames < 60) requestAnimationFrame(step); else done(); }; requestAnimationFrame(step); });
    return (performance.now() - t0) / frames;
  });
  console.log(`# Browser 27³: ${d.faces} Flächen (statt ${6 * 19683}), Meshaufbau ${d.buildMs} ms, ${ms.toFixed(1)} ms je Frame mit Hover-Picking (Software-WebGL)`);
  assert.ok(Number(d.buildMs) < 3000, `mesh build ${d.buildMs} ms`);
  assert.deepEqual(errors, []);
  await close();
});

test('Editor: Block wählen zeigt Welt- und Lokalkoordinate, Schichtmodi, Fokus', async () => {
  const { p, errors, close } = await open('');
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await ready(p);
  const all = Number((await data(p)).faces);
  const box = await host(p).boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const info = p.locator('.block-info');
  await info.waitFor();
  const text = await info.innerText();
  const world = text.match(/Welt\s+X (-?\d+) · Y (-?\d+) · Z (-?\d+)/), local = text.match(/Lokal\s+X (-?\d+) · Y (-?\d+) · Z (-?\d+) in (.+)/);
  assert.ok(world && local, text);
  // The owning instance is selected and its pivot transform explains world − local (all sample instances are unrotated).
  const name = local[4].trim();
  assert.equal(await p.locator('.instance-list [aria-pressed=true] strong').innerText(), name);
  const pivot = await Promise.all(['X', 'Y', 'Z'].map(a => p.getByLabel(`${a}-Koordinate`).inputValue()));
  assert.deepEqual([1, 2, 3].map(i => Number(world[i]) - Number(local[i])), pivot.map(Number));
  // Focus frames the selected instance: the camera moves closer.
  const far = await camera(p);
  await p.getByRole('button', { name: 'Auswahl fokussieren' }).click();
  await p.waitForTimeout(150);
  assert.ok(moved(far, await camera(p)) > 1, 'focus moves the camera');
  // Layer modes: single layer and range.
  await p.getByRole('button', { name: 'Einzeln' }).click();
  await p.waitForFunction(n => Number(document.querySelector('.canvas-host').dataset.faces) < n, all);
  const single = Number((await data(p)).faces);
  await p.getByLabel('Y-Schicht').fill('0');
  await p.waitForFunction(n => Number(document.querySelector('.canvas-host').dataset.faces) !== n, single);
  await p.getByRole('button', { name: 'Bereich' }).click();
  await p.getByLabel('Y-Schicht von').fill('1');
  await p.getByLabel('Y-Schicht bis').fill('3');
  await p.waitForFunction(() => /von 1/.test(document.querySelector('.layer-control').textContent));
  const range = Number((await data(p)).faces);
  assert.ok(range > 0 && range < all, `range ${range} of ${all}`);
  await p.getByRole('button', { name: 'Alles' }).click();
  await ready(p, all);
  assert.deepEqual(errors, []);
  await close();
});

test('Touch: Tippen wählt, Flugsteuerung per Bildschirmtasten', async () => {
  const { p, errors, close } = await open('#/betrachter', { ...devices['Pixel 7'] });
  await ready(p, 1118);
  await host(p).scrollIntoViewIfNeeded();
  const box = await host(p).boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await p.getByText('BLOCKAUSWAHL').waitFor();
  await p.getByRole('button', { name: 'Freier Flug' }).tap();
  const pad = p.getByRole('group', { name: 'Flugsteuerung' });
  await pad.waitFor();
  const before = await camera(p);
  const forward = await pad.getByRole('button', { name: 'Vorwärts' }).boundingBox();
  const cdp = await p.context().newCDPSession(p);
  const point = { x: forward.x + forward.width / 2, y: forward.y + forward.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await p.waitForTimeout(500);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(100);
  const after = await camera(p);
  assert.ok(moved(before, after) > 1, `pad moves camera ${before} → ${after}`);
  const still = await camera(p); await p.waitForTimeout(200);
  assert.deepEqual(await camera(p), still, 'releasing stops the flight');
  await pad.getByRole('button', { name: /Flug beenden/ }).tap();
  assert.equal((await data(p)).mode, 'orbit');
  assert.deepEqual(errors, []);
  await close();
});

test('Ohne WebGL: Software-Ansicht mit Ansichten, Culling und Auswahl', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : original.call(this, type, ...rest); };
  });
  const p = await context.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${BASE}#/betrachter`);
  await p.getByText('Isometrische Ersatzansicht', { exact: false }).first().waitFor();
  assert.equal((await data(p)).mode, 'software');
  assert.equal(await p.getByRole('button', { name: 'Freier Flug' }).count(), 0, 'no flight without WebGL');
  await p.waitForFunction(() => Number(document.querySelector('.canvas-host canvas')?.dataset.faces) > 0);
  const iso = Number(await p.locator('.canvas-host canvas').getAttribute('data-faces'));
  assert.ok(iso < 425 * 3, `culled software faces ${iso}`);
  await p.getByRole('button', { name: 'Draufsicht (Norden oben)' }).click();
  await p.waitForTimeout(100);
  const top = Number(await p.locator('.canvas-host canvas').getAttribute('data-faces'));
  assert.ok(top > 0 && top < iso, `top view draws only top faces (${top} < ${iso})`);
  const box = await host(p).boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await p.getByText('BLOCKAUSWAHL').waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
