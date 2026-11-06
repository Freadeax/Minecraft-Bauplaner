// Block 5 (06.11.2026): Werkstatt (EDIT-01/02/03/05/06) und Weltkarte (MAP-01/MAP-04) als iPad Pro 11 und
// iPhone 15 mit Fingerbedienung: Tippen, Ziehen mit einem Finger, Zwei-Finger-Zoom, Langdruck-Menü.
// Gedacht für WebKit (Safari-Engine): `npm run test:e2e:webkit -- tests/e2e/touch-devices.e2e.mjs`;
// läuft unverändert auch in Chromium (`npm run test:e2e`) und Firefox. Ersetzt kein echtes Gerät
// (GERAETEMATRIX.md): keine echte GPU, keine iOS-Gesten des Systems.
//
// Playwright kann nur tippen (`touchscreen.tap`). Ziehen, Langdruck und zwei Finger werden als
// Zeiger-Ereignisse mit pointerType "touch" ausgelöst – genau die Ereignisse, die Safari bei
// Fingerbedienung an die Seite gibt. Weil der Browser diese künstlichen Zeiger nicht kennt, nimmt
// setPointerCapture sie im Test still hin (siehe `tolerantCapture`).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const PORT = 4500, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;
const engine = (process.env.BAUPLANER_ENGINE || 'chromium').toLowerCase();

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

/** Device profile without the engine choice; Firefox knows no `isMobile`. */
function device(name) {
  const { defaultBrowserType: _engine, ...d } = devices[name];
  if (engine === 'firefox') delete d.isMobile;
  return d;
}
async function open(name) {
  const context = await browser.newContext(device(name));
  await context.addInitScript(() => {
    // Synthetic touch pointers are unknown to the browser; capture must not throw for them.
    for (const k of ['setPointerCapture', 'releasePointerCapture']) {
      const orig = Element.prototype[k];
      Element.prototype[k] = function (id) { try { return orig.call(this, id); } catch { /* synthetic pointer */ } };
    }
  });
  const p = await context.newPage();
  p.setDefaultTimeout(30_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|127\.0\.0\.1:\d+\/v1|CORS|Cross-Origin/.test(m.text())) errors.push(m.text()); });
  return { context, p, errors };
}
const noSideScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

let nextId = 100;
/** Fires a touch pointer sequence on whatever element lies under the first point. */
async function touch(p, steps) {
  await p.evaluate(steps => {
    const first = steps[0];
    const target = document.elementFromPoint(first.x, first.y);
    if (!target) throw new Error(`nichts unter ${first.x},${first.y}`);
    return (async () => {
      for (const s of steps) {
        if (s.wait) { await new Promise(r => setTimeout(r, s.wait)); continue; }
        const init = { bubbles: true, cancelable: true, composed: true, pointerId: s.id, pointerType: 'touch', isPrimary: !!s.primary, clientX: s.x, clientY: s.y, button: s.type === 'pointermove' ? -1 : 0, buttons: s.type === 'pointerup' ? 0 : 1, width: 10, height: 10, pressure: s.type === 'pointerup' ? 0 : 0.5 };
        target.dispatchEvent(new PointerEvent(s.type, init));
        await new Promise(r => requestAnimationFrame(() => r()));
      }
    })();
  }, steps);
}
function drag(a, b, n = 6) {
  const id = nextId++, steps = [{ type: 'pointerdown', id, primary: true, ...a }];
  for (let i = 1; i <= n; i++) steps.push({ type: 'pointermove', id, primary: true, x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
  steps.push({ type: 'pointerup', id, primary: true, ...b });
  return steps;
}
function longPress(a, ms = 800) {
  const id = nextId++;
  return [{ type: 'pointerdown', id, primary: true, ...a }, { wait: ms }, { type: 'pointerup', id, primary: true, ...a }];
}
/** Two fingers move apart from the centre: zoom in. */
function pinch(c, from = 30, to = 90, n = 6) {
  const a = nextId++, b = nextId++;
  const steps = [{ type: 'pointerdown', id: a, primary: true, x: c.x - from, y: c.y }, { type: 'pointerdown', id: b, x: c.x + from, y: c.y }];
  for (let i = 1; i <= n; i++) { const d = from + (to - from) * i / n; steps.push({ type: 'pointermove', id: a, primary: true, x: c.x - d, y: c.y }, { type: 'pointermove', id: b, x: c.x + d, y: c.y }); }
  steps.push({ type: 'pointerup', id: b, x: c.x + to, y: c.y }, { type: 'pointerup', id: a, primary: true, x: c.x - to, y: c.y });
  return steps;
}

// ---------- Werkstatt ----------

async function gridCell(p, dx, dz) {
  const canvas = p.locator('.layer-grid canvas');
  await canvas.evaluate(c => { const b = c.getBoundingClientRect(); if (b.top < 60 || b.bottom > window.innerHeight - 70) c.scrollIntoView({ block: 'center' }); });
  let last = '';
  for (let i = 0; i < 50; i++) {
    const g = await canvas.evaluate(c => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => {
      const b = c.getBoundingClientRect();
      done({ x: b.x, y: b.y, width: b.width, height: b.height, size: Number(c.dataset.cellSize), centre: c.dataset.centre });
    }))));
    const key = JSON.stringify(g);
    if (key === last) {
      const [cx, cz] = g.centre.split(',').map(Number), x = Math.floor(cx) + dx, z = Math.floor(cz) + dz;
      return { x: g.x + g.width / 2 + (x + 0.5 - cx) * g.size, y: g.y + g.height / 2 + (z + 0.5 - cz) * g.size };
    }
    last = key;
  }
  throw new Error('Ebenenraster kommt nicht zur Ruhe');
}
const cellsText = n => `${n.toLocaleString('de-DE')} Zellen`;
const waitCells = (p, n) => p.waitForFunction(t => document.querySelector('.editor-stats')?.textContent?.startsWith(t), cellsText(n));
const cells = p => p.locator('.editor-stats').evaluate(e => Number(e.textContent.split(' Zellen')[0].replace(/\./g, '')));
async function scene(p, blocks) {
  const host = p.locator(`.editor-3d .canvas-host[data-blocks="${blocks}"][data-mesh="ready"]`);
  await host.waitFor();
  await host.evaluate(h => { const b = h.getBoundingClientRect(); if (b.top < 60 || b.bottom > window.innerHeight - 70) h.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(250); // camera damping
  return await host.locator('canvas').boundingBox();
}

async function workshop(name) {
  const { context, p, errors } = await open(name);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();
  assert.ok(await noSideScroll(p), `${name}: kein waagrechtes Scrollen in der Werkstatt`);

  // Ein Finger im Ebenenraster: Tippen setzt, Ziehen mit dem Quader füllt.
  await p.touchscreen.tap(...Object.values(await gridCell(p, 0, 0)));
  await waitCells(p, 1);
  await p.getByRole('radio', { name: /Quader/ }).tap();
  const a = await gridCell(p, 2, 0), b = await gridCell(p, 4, 2);
  await touch(p, drag(a, b));
  await waitCells(p, 10);

  // Im 3D bauen: ein Finger auf die Oberseite setzt einen Block darüber.
  await p.getByRole('radio', { name: /Setzen/ }).first().tap();
  await p.locator('.editor-3d').getByRole('button', { name: 'Draufsicht (Norden oben)', exact: true }).tap();
  let box = await scene(p, 10);
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const before3d = await cells(p);
  await touch(p, drag(centre, centre, 1));
  await p.waitForFunction(n => !document.querySelector('.editor-stats')?.textContent?.startsWith(n), cellsText(before3d));
  const placed = await cells(p);
  assert.equal(placed, before3d + 1, 'ein Finger im 3D-Bild setzt genau einen Block');

  // Zwei Finger zoomen nur, sie bauen nichts.
  box = await scene(p, placed);
  await touch(p, pinch({ x: box.x + box.width / 2, y: box.y + box.height / 2 }));
  await p.waitForTimeout(300);
  assert.equal(await cells(p), placed, 'Zwei-Finger-Zoom setzt keinen Block');

  // Rückgängig per Finger.
  await p.getByRole('button', { name: /Rückgängig/ }).first().tap();
  await waitCells(p, before3d);
  assert.ok(await noSideScroll(p), `${name}: nach dem Bauen kein waagrechtes Scrollen`);
  assert.deepEqual(errors, []);
  await context.close();
}

test('iPad Pro 11: Werkstatt mit dem Finger (Raster, Quader, 3D setzen, Zwei-Finger-Zoom, Rückgängig)', () => workshop('iPad Pro 11'));
test('iPhone 15: Werkstatt mit dem Finger (Raster, Quader, 3D setzen, Zwei-Finger-Zoom, Rückgängig)', () => workshop('iPhone 15'));

// ---------- Weltkarte ----------

const ready = p => p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 30_000 });
async function mapAt(p, x, z) {
  const canvas = p.locator('.overview-canvas');
  await canvas.evaluate(c => { const b = c.getBoundingClientRect(); if (b.top < 60 || b.bottom > window.innerHeight - 70) c.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(100);
  const box = await canvas.boundingBox();
  const scale = Number(await canvas.getAttribute('data-scale'));
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  return { x: box.x + box.width / 2 + (x + 0.5 - cx) * scale, y: box.y + box.height / 2 + (z + 0.5 - cz) * scale };
}
const names = async p => (await p.locator('.builder-objects .plan-row b').allInnerTexts()).map(t => t.trim());

async function worldmap(name) {
  const { context, p, errors } = await open(name);
  await p.goto(`${BASE}#/`);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.goto(`${BASE}#/karte`);
  await ready(p);
  // MAP-01: Projekt per Finger platzieren, Lage bleibt nach dem Neuladen.
  await p.getByRole('button', { name: 'Platzieren' }).first().tap();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
  await ready(p);
  assert.ok(await noSideScroll(p), `${name}: kein waagrechtes Scrollen auf der Karte`);
  const canvas = p.locator('.overview-canvas');
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  const tools = p.getByRole('group', { name: 'Planungswerkzeug' });

  // Bauplatz mit einem Finger aufziehen.
  await tools.getByRole('button', { name: 'Bauplatz' }).tap();
  const a = await mapAt(p, cx - 8, cz + 8), b = await mapAt(p, cx - 3, cz + 11);
  await touch(p, drag(a, b));
  await p.locator('.plan-editor').getByRole('heading', { name: 'Bauplatz: Bauplatz 1' }).waitFor();

  // Punkt per Tippen.
  await tools.getByRole('button', { name: 'Punkt' }).tap();
  const dot = await mapAt(p, cx + 6, cz + 9);
  await p.touchscreen.tap(dot.x, dot.y);
  await p.waitForFunction(() => document.querySelectorAll('.builder-objects .plan-row b').length === 2);
  await p.getByRole('toolbar', { name: 'Auswahl' }).getByText('1 Eintrag gewählt').waitFor();

  // Zwei Finger zoomen die Karte, ohne etwas zu zeichnen oder zu verschieben.
  await tools.getByRole('button', { name: 'Auswählen' }).tap();
  const scale0 = Number(await canvas.getAttribute('data-scale'));
  const mid = await mapAt(p, cx, cz);
  await touch(p, pinch(mid));
  await p.waitForFunction(s => Number(document.querySelector('.overview-canvas')?.getAttribute('data-scale')) > s * 1.5, scale0);
  const scale1 = Number(await canvas.getAttribute('data-scale'));
  await touch(p, pinch(await mapAt(p, cx, cz), 90, 30));
  await p.waitForFunction(s => Number(document.querySelector('.overview-canvas')?.getAttribute('data-scale')) < s / 1.5, scale1);
  assert.equal((await names(p)).length, 2, 'Zoomen legt nichts an und verschiebt nichts');

  // Langdruck auf den Punkt öffnet das Kontextmenü wie ein Rechtsklick; daraus sperren, dann löschen versuchen.
  const menu = p.getByRole('menu');
  await touch(p, longPress(await mapAt(p, cx + 6, cz + 9)));
  await menu.waitFor();
  await menu.getByRole('menuitem', { name: /Sperren/ }).tap();
  await p.locator('.builder-objects .plan-row', { hasText: '🔒' }).waitFor();
  await touch(p, longPress(await mapAt(p, cx + 6, cz + 9)));
  await menu.waitFor();
  await menu.getByRole('menuitem', { name: /Entsperren/ }).tap();
  await touch(p, longPress(await mapAt(p, cx + 6, cz + 9)));
  await menu.getByRole('menuitem', { name: /Löschen/ }).tap();
  await p.waitForFunction(() => document.querySelectorAll('.builder-objects .plan-row b').length === 1);
  assert.deepEqual(await names(p), ['Bauplatz 1']);

  // Langdruck auf freie Fläche: Menü mit „Punkt hier setzen“.
  await touch(p, longPress(await mapAt(p, cx + 10, cz - 10)));
  await menu.getByRole('menuitem', { name: 'Punkt hier setzen' }).tap();
  await p.waitForFunction(() => document.querySelectorAll('.builder-objects .plan-row b').length === 2);

  // Rückgängig per Finger, dann bleibt nach dem Neuladen alles erhalten.
  await p.getByRole('button', { name: 'Karte: Schritt zurück' }).tap();
  await p.waitForFunction(() => document.querySelectorAll('.builder-objects .plan-row b').length === 1);
  await p.waitForTimeout(500);
  await p.reload();
  await ready(p);
  assert.deepEqual(await names(p), ['Bauplatz 1']);
  assert.ok(await noSideScroll(p));
  assert.deepEqual(errors, []);
  await context.close();
}

test('iPad Pro 11: Weltkarte mit dem Finger (platzieren, Bauplatz ziehen, Punkt tippen, Zoom, Langdruck-Menü, Sperren, Rückgängig)', () => worldmap('iPad Pro 11'));
test('iPhone 15: Weltkarte mit dem Finger (platzieren, Bauplatz ziehen, Punkt tippen, Zoom, Langdruck-Menü, Sperren, Rückgängig)', () => worldmap('iPhone 15'));
