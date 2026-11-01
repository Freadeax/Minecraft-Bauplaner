// Browser check of the block editor (EDIT-02) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4197, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

function watch(p) {
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}
/** Screen point of a grid cell relative to the canvas centre (cell size read from the canvas). */
async function cellPoint(p, dx, dz) {
  const c = p.locator('.layer-grid canvas'), box = await c.boundingBox();
  const size = Number(await c.getAttribute('data-cell-size'));
  const [cx, cz] = (await c.getAttribute('data-centre')).split(',').map(Number);
  const x = Math.floor(cx) + dx, z = Math.floor(cz) + dz;
  return [box.x + box.width / 2 + (x + 0.5 - cx) * size, box.y + box.height / 2 + (z + 0.5 - cz) * size];
}
async function dragCells(p, a, b) {
  const [x0, y0] = await cellPoint(p, ...a), [x1, y1] = await cellPoint(p, ...b);
  await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 6 }); await p.mouse.up();
}
const stats = p => p.locator('.editor-stats');

test('Werkstatt: neues Bauteil mit Quader, Treppenlinie, Rückgängig, Speichern und neuer Version', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();
  assert.match(await p.getByLabel('Blöcke suchen').getAttribute('placeholder'), /1\.2\d\d Blöcke/, 'alle Blöcke des Registers');

  // 7×7 walls, 3 high: 3 × 24 = 72 cells.
  await p.getByRole('radio', { name: /Quader/ }).click();
  await p.getByLabel('Höhe ab Ebene').fill('3');
  await p.locator('.editor-tools select').selectOption('walls');
  await dragCells(p, [-3, -3], [3, 3]);
  await p.waitForFunction(() => document.querySelector('.editor-stats')?.textContent?.includes('72 Zellen'));

  // Oak stairs facing south along the north wall on layer 3.
  await p.getByLabel('Blöcke suchen').fill('eiche treppe');
  await p.locator('.block-tile', { hasText: 'oak_stairs' }).first().click();
  await p.getByLabel('Pinsel-Zustand: facing').selectOption('south');
  for (let i = 0; i < 3; i++) await p.getByLabel('Ebene höher').click();
  await p.getByRole('radio', { name: /Linie/ }).click();
  await dragCells(p, [-3, -3], [3, -3]);
  await p.waitForFunction(() => document.querySelector('.editor-stats')?.textContent?.includes('79 Zellen'));

  // Undo/redo of the line is one step.
  await p.getByRole('button', { name: /Rückgängig/ }).first().click();
  await p.waitForFunction(() => document.querySelector('.editor-stats')?.textContent?.includes('72 Zellen'));
  await p.keyboard.press('Control+y');
  await p.waitForFunction(() => document.querySelector('.editor-stats')?.textContent?.includes('79 Zellen'));

  // Replace all stone with stone bricks keeps the count.
  await p.getByLabel('Blöcke suchen').fill('stone_bricks');
  await p.locator('.block-tile', { hasText: /^Ziegel · Stein/ }).first().click();
  await p.getByLabel('Zu ersetzender Block').selectOption('minecraft:stone');
  await p.getByRole('button', { name: '72 Zellen ersetzen' }).click();
  await p.locator('.editor-message', { hasText: 'Ersetzen: 72 Zellen' }).waitFor();

  await p.getByLabel('Name des neuen Bauteils').fill('Testhof');
  await p.getByRole('button', { name: 'Bauteil speichern' }).click();
  await p.locator('.notice.success', { hasText: 'Neues Bauteil „Testhof“ gespeichert' }).waitFor();
  await p.waitForURL(/#\/werkstatt\/av_/);
  await p.getByRole('heading', { name: 'Testhof' }).waitFor();
  assert.match(await stats(p).innerText(), /79 Zellen · Änderungen: \+0/);

  // Remove one stair with the eraser and save as version 2.0.
  await p.getByLabel('Ebene Y', { exact: true }).fill('3');
  await p.getByRole('radio', { name: /Abbauen/ }).click();
  const [x, y] = await cellPoint(p, 0, 0);
  // The grid is centred on the model: the north wall row is 3 cells up.
  await p.mouse.click(x, y - 3 * Number(await p.locator('.layer-grid canvas').getAttribute('data-cell-size')));
  await p.waitForFunction(() => document.querySelector('.editor-stats')?.textContent?.includes('78 Zellen'));
  await p.getByRole('button', { name: 'Als Version 2.0 speichern' }).click();
  await p.locator('.notice.success', { hasText: 'Version 2.0 von „Testhof“ gespeichert' }).waitFor();

  // The library knows both versions; the building page links back into the workshop.
  await p.goto(`${BASE}#/bibliothek?q=Testhof`);
  await p.locator('a', { hasText: 'Testhof' }).first().click();
  await p.getByRole('link', { name: /Blöcke bearbeiten/ }).click();
  await p.waitForURL(/#\/werkstatt\/av_/);
  await p.getByRole('heading', { name: 'Testhof' }).waitFor();
  assert.match(await stats(p).innerText(), /78 Zellen/);
  assert.deepEqual(errors, []);
  await p.close();
});

test('Projekt-Reiter „Blöcke“: abbauen und neu setzen, als neue Versionen speichern, ein Rückgängig-Schritt', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByRole('link', { name: 'Blöcke' }).click();
  await p.locator('.layer-grid canvas').waitFor();
  const cells0 = Number((await stats(p).innerText()).match(/^([\d.]+) Zellen/)[1].replace('.', ''));

  // Remove a row across the middle of the lowest layer.
  await p.getByRole('radio', { name: /Abbauen/ }).click();
  await p.locator('.grid-zoom button[aria-label="Modell einpassen"]').click();
  await dragCells(p, [-6, 0], [6, 0]);
  await p.waitForFunction(n => Number(document.querySelector('.editor-stats')?.textContent?.match(/^([\d.]+) Zellen/)?.[1].replace('.', '')) < n, cells0);
  // Place a glowstone far outside every instance.
  await p.getByLabel('Blöcke suchen').fill('glowstone');
  await p.locator('.block-tile', { hasText: 'glowstone' }).first().click();
  await p.getByLabel('Ebene Y', { exact: true }).fill('40');
  await p.mouse.click(...await cellPoint(p, 0, 0));
  await p.locator('.save-bar .muted', { hasText: /Bauteil\(e\) betroffen · 1 neue Zellen/ }).waitFor();
  await p.getByLabel('Name des neuen Bauteils').fill('Leuchtpunkt');
  await p.getByRole('button', { name: 'Im Projekt speichern' }).click();
  await p.locator('.notice.success', { hasText: /Gespeichert: \d+ neue Bauteilversion/ }).waitFor();
  assert.match(await stats(p).innerText(), /Änderungen: \+0 \/ −0 \/ ~0/, 'fresh draft on the saved project');

  // The editor tab shows the new module and undoes the whole save in one step.
  await p.getByRole('link', { name: 'Editor' }).click();
  await p.locator('.instance-list li', { hasText: 'Leuchtpunkt' }).first().waitFor();
  const undo = p.getByRole('button', { name: /Rückgängig/ });
  assert.equal(await undo.getAttribute('title'), 'Blöcke bearbeitet');
  await undo.click();
  await p.locator('.instance-list li', { hasText: 'Leuchtpunkt' }).first().waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  await context.close();
});

test('Mehrfachauswahl im Editor: Gruppe bilden, als Ganzes drehen, ein Rückgängig-Schritt', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  const checks = p.locator('.instance-list .group-check');
  await checks.nth(0).check();
  await checks.nth(1).check();
  const panel = p.locator('.group-panel');
  await panel.getByText('GRUPPE · 2 INSTANZEN').waitFor();
  const hull = () => panel.locator('p', { hasText: 'Hülle' }).innerText();
  const before = await hull();
  await panel.getByRole('button', { name: '↻ 90°' }).click();
  await p.waitForFunction(b => ![...document.querySelectorAll('.group-panel p')].some(e => e.textContent?.trim() === b.trim()), before);
  const undo = p.getByRole('button', { name: /Rückgängig/ });
  assert.match(await undo.getAttribute('title'), /2 Instanzen gedreht/);
  await undo.click();
  assert.equal(await hull(), before, 'ein Schritt stellt beide Instanzen wieder her');
  // Group move by 2 blocks along X shifts the hull exactly.
  await panel.getByLabel('Schrittweite in Blöcken').fill('2');
  await panel.getByRole('button', { name: 'Gruppe X+' }).click();
  const [x0] = before.match(/X (-?\d+)/).slice(1).map(Number);
  await p.waitForFunction(x => document.querySelector('.group-panel')?.textContent?.includes(`Hülle X ${x}…`), x0 + 2);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Werkstatt auf dem Handy (390 px): kein waagrechtes Scrollen, Setzen per Tippen', async () => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.locator('.layer-grid canvas').waitFor();
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'kein waagrechtes Scrollen');
  await p.locator('.layer-grid canvas').scrollIntoViewIfNeeded();
  await p.mouse.click(...await cellPoint(p, 0, 0));
  await p.waitForFunction(() => document.querySelector('.editor-stats')?.textContent?.startsWith('1 Zellen'));
  assert.deepEqual(errors, []);
  await p.close();
});
