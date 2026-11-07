// Block B (07.11.2026): automatische Abnahme von WERK-09 im Browser. In der Werkstatt entsteht ein Bauteil mit Mauer,
// Truhe (Gegenstände auf festen Plätzen und Name), Schild (beide Seiten, Farbe) und Gemälde; ein Teil wird gestapelt,
// extrudiert und das Ganze gedreht, dann gespeichert, in ein Projekt übernommen und als .litematic und .schem
// exportiert. Beide Dateien werden mit dem Leser der App wieder eingelesen: Truhe, Schild, Gemälde und jede Zelle müssen
// genau so drin stehen. Dass das Spiel solche Dateien richtig aufstellt (auch ein verzaubertes Schwert in einer benannten
// Truhe), weist `scripts/mod/test_exports_ingame.sh` im echten Minecraft 26.3 nach. Run after `npm run build`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { waitForStart, REFUSED, WEBKIT_NOISE } from './start.mjs';
import { importStructure } from '../../dist/formats/src/index.js';
import { blockEntityContent, blockEntityTile, entityKind, entityFacing } from '../../dist/voxel/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ENGINE = chromium.name();
const PORT = 4395, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const dir = mkdtempSync(join(tmpdir(), 'werk09-'));
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

async function gridGeometry(p) {
  const canvas = p.locator('.layer-grid canvas');
  await canvas.evaluate(c => { const b = c.getBoundingClientRect(); if (b.top < 0 || b.bottom > window.innerHeight) c.scrollIntoView({ block: 'center' }); });
  let last = '';
  for (let i = 0; i < 50; i++) {
    const g = await canvas.evaluate(c => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => {
      const b = c.getBoundingClientRect();
      done({ x: b.x, y: b.y, width: b.width, height: b.height, size: Number(c.dataset.cellSize), centre: c.dataset.centre });
    }))));
    const key = JSON.stringify(g);
    if (key === last) return { ...g, centre: g.centre.split(',').map(Number) };
    last = key;
  }
  throw new Error('Ebenenraster kommt nicht zur Ruhe');
}
let origin = null; // grid cell of (0, 0), fixed at the start so later re-centring does not move the targets
async function cellPoint(p, dx, dz) {
  const g = await gridGeometry(p), [cx, cz] = g.centre;
  origin ??= [Math.floor(cx), Math.floor(cz)];
  const x = origin[0] + dx, z = origin[1] + dz;
  return [g.x + g.width / 2 + (x + 0.5 - cx) * g.size, g.y + g.height / 2 + (z + 0.5 - cz) * g.size];
}
async function dragCells(p, a, b) {
  const [ax, ay] = await cellPoint(p, ...a), [bx, by] = await cellPoint(p, ...b);
  await p.mouse.move(ax, ay); await p.mouse.down(); await p.mouse.move(bx, by, { steps: 6 }); await p.mouse.up();
}
const cellCount = p => p.locator('.editor-stats').evaluate(e => Number(e.textContent.split(' Zellen')[0].replace(/\./g, '')));
const waitCells = (p, n) => p.waitForFunction(n => document.querySelector('.editor-stats')?.textContent?.startsWith(`${n.toLocaleString('de-DE')} Zellen`), n)
  .catch(async e => { throw new Error(`${n} Zellen erwartet, Stand: ${await p.locator('.editor-stats').innerText()} · ${await p.locator('.editor-message').innerText().catch(() => '')} · Auswahl ${await p.locator('[data-testid="mask-size"]').innerText().catch(() => '–')}`, { cause: e }); });

/** What counts in an exported file: cells by block, chest, sign, entities. */
function summary(payload) {
  const blocks = {};
  for (const c of payload.cells) { if (c.kind !== 'block') continue; const id = payload.palette[c.paletteIndex].id; blocks[id] = (blocks[id] ?? 0) + 1; }
  const contents = payload.blockEntities.map(be => ({ ...blockEntityContent(be.data), tile: blockEntityTile(be.data) }));
  const chest = contents.find(c => c.id === 'minecraft:chest');
  const sign = contents.find(c => c.sign);
  const color = side => sign?.tile[side]?.value?.color?.value ?? 'black';
  return {
    blocks,
    chest: chest && { name: chest.name, items: chest.items.map(x => `${x.slot}:${String(x.id).replace('minecraft:', '')}×${x.count}`).sort() },
    sign: sign && { front: sign.sign.front.filter(Boolean), back: sign.sign.back.filter(Boolean), colors: [color('front_text'), color('back_text')] },
    entities: payload.entities.map(e => `${entityKind(e)}:${entityFacing(e)}`).sort(),
  };
}

test('WERK-09: Werkstatt-Bauteil mit Truhe, Schild und Gemälde stapeln, extrudieren, drehen, speichern und als .litematic/.schem exportieren – alles bleibt erhalten', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const p = await context.newPage();
  p.setDefaultTimeout(25_000);
  const errors = [];
  p.on('pageerror', e => { if (!WEBKIT_NOISE.test(e.message)) errors.push(e.message); });
  p.on('console', m => { if (m.type() === 'error' && !REFUSED.test(m.text()) && !WEBKIT_NOISE.test(m.text()) && !/Failed to load resource|clipboard/i.test(m.text())) errors.push(m.text()); });
  p.on('dialog', d => void d.accept());

  // Zielprojekt für den Export.
  await p.goto(BASE);
  await waitForStart(p);
  await p.locator('#projekt-name').fill('Werkstatt-Abnahme');
  await p.getByRole('button', { name: '＋ Leeres Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);

  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();
  // Mauer 4 lang, 2 hoch (Linie mit Mauerhöhe).
  await p.getByRole('radio', { name: /Linie/ }).click();
  await p.getByLabel('Mauerhöhe').fill('2');
  await dragCells(p, [-2, 0], [1, 0]);
  await waitCells(p, 8);
  // Truhe und Schild davor.
  await p.getByRole('radio', { name: /Setzen/ }).click();
  await p.getByLabel('Blöcke suchen').fill('chest');
  await p.locator('.block-tile', { hasText: /chest$/ }).first().click();
  const chestAt = await cellPoint(p, 0, 2);
  await p.mouse.click(...chestAt);
  await waitCells(p, 9);
  await p.getByLabel('Blöcke suchen').fill('oak_sign');
  await p.locator('.block-tile', { hasText: 'oak_sign' }).first().click();
  const signAt = await cellPoint(p, -2, 2);
  await p.mouse.click(...signAt);
  await waitCells(p, 10);

  // Truhe: Fackeln auf Platz 0, Brot auf Platz 4, Name.
  await p.getByRole('radio', { name: /Prüfen/ }).click();
  await p.mouse.click(...await cellPoint(p, 0, 2));
  const editor = p.getByTestId('content-editor');
  await p.locator('[data-testid=content-editor][data-kind=container]').waitFor();
  await editor.getByRole('button', { name: '＋ Gegenstand' }).click();
  await editor.getByLabel('Gegenstand').fill('torch');
  await editor.getByLabel('Anzahl').fill('16');
  await editor.getByRole('button', { name: '＋ Gegenstand' }).click();
  await editor.getByLabel('Gegenstand').nth(1).fill('bread');
  await editor.getByLabel('Anzahl').nth(1).fill('5');
  const slot = editor.getByLabel('Platz', { exact: true }).nth(1);
  if (await slot.evaluate(e => e.tagName) === 'SELECT') await slot.selectOption('4'); else await slot.fill('4');
  await editor.getByLabel('Name des Behälters').fill('Vorrat');
  await editor.getByRole('button', { name: 'Inhalt übernehmen' }).click();
  await p.locator('.editor-message', { hasText: 'Inhalt Truhe' }).waitFor();
  // Schild: beide Seiten, rote Schrift.
  await p.mouse.click(...await cellPoint(p, -2, 2));
  await p.locator('[data-testid=content-editor][data-kind=sign]').waitFor();
  await editor.getByLabel('Vorderseite Zeile 1').fill('Taverne');
  await editor.getByLabel('Vorderseite Zeile 2').fill('zum Creeper');
  await editor.getByLabel('Rückseite Zeile 1').fill('Geöffnet');
  await editor.getByLabel('Textfarbe').selectOption('red');
  await editor.getByRole('button', { name: 'Text übernehmen' }).click();
  await p.locator('.editor-message', { hasText: 'Schildtext' }).waitFor();
  // Gemälde an die Südseite der Mauer.
  await p.mouse.click(...await cellPoint(p, -1, 0));
  const panel = p.getByTestId('entity-panel');
  await panel.getByRole('button', { name: /^Anbringen an/ }).waitFor();
  await panel.getByRole('button', { name: 'Gemälde', exact: true }).click();
  await panel.getByLabel('Motiv').selectOption('kebab');
  await panel.getByTestId('entity-place').click();
  await p.locator('.editor-message', { hasText: 'Gemälde an' }).waitFor();

  // Mauer per Zauberstab wählen und einmal nach oben stapeln.
  await p.keyboard.press('w');
  await p.mouse.click(...await cellPoint(p, 1, 0));
  await p.locator('[data-testid="mask-size"]', { hasText: '8' }).waitFor();
  const sel = p.getByRole('region', { name: 'Auswahl' });
  await sel.getByLabel('Stapelrichtung').selectOption('up');
  await sel.getByLabel('Anzahl der Kopien').fill('1');
  await sel.getByTestId('stack').click();
  await waitCells(p, 18);
  // Oben steht jetzt die Kopie: die Nordseite der Mauer um 1 extrudieren (Mauer wird zwei dick).
  await sel.getByLabel('Seite zum Extrudieren').selectOption('north');
  await sel.getByLabel('Weite in Blöcken').fill('1');
  await sel.getByTestId('extrude-out').click();
  await waitCells(p, 26);
  // Ganzes Modell wählen und 90° drehen: alle Zellen, Truhe, Schild und Gemälde gehen mit.
  await p.keyboard.press('Escape');
  await p.locator('.layer-grid canvas').hover();
  await p.keyboard.press('Control+a');
  await p.getByRole('button', { name: 'Drehen 90°' }).click();
  await p.locator('.editor-message').filter({ hasNotText: /Ohne Drehregel/ }).first().waitFor();
  assert.equal(await cellCount(p), 26);

  await p.getByLabel('Name des neuen Bauteils').fill('Taverne Werk09');
  await p.getByRole('button', { name: 'Bauteil speichern' }).click();
  await p.getByRole('link', { name: 'Zum Steckbrief' }).click();
  const furnishing = p.getByTestId('furnishing-summary');
  await furnishing.waitFor();
  assert.match(await furnishing.innerText(), /1 Behälter mit Inhalt · 1 beschriftete Schilder/);

  // In das Projekt und exportieren (DataVersion 5023 = Minecraft 26.3).
  const target = p.locator('.building-detail select').filter({ has: p.locator('option', { hasText: 'Werkstatt-Abnahme' }) }).first();
  if (await target.count()) await target.selectOption({ label: 'Werkstatt-Abnahme' });
  await p.getByRole('button', { name: '＋ Ins Projekt übernehmen' }).click();
  await p.getByText(/„Taverne Werk09“ in „Werkstatt-Abnahme“ eingefügt/).waitFor();
  await p.getByRole('link', { name: 'Zum Editor →' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByRole('link', { name: 'Export' }).click();
  await p.getByText('✓ Exportbereit').waitFor();
  const files = {};
  for (const [format, button] of [['litematic', 'Revision einfrieren und .litematic exportieren'], ['schem', /\.schem exportieren$/]]) {
    await p.getByLabel('Dateiformat').selectOption(format);
    const dv = p.getByLabel('DataVersion (Zielversion)');
    if (!(await dv.inputValue())) await dv.fill('5023');
    const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: button }).first().click()]);
    files[format] = join(dir, d.suggestedFilename());
    await d.saveAs(files[format]);
    await p.getByText('DATEI ERZEUGT').first().waitFor();
  }

  const back = {};
  for (const [format, file] of Object.entries(files)) {
    const buf = readFileSync(file);
    back[format] = summary((await importStructure(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))).result.payload);
  }
  console.log(`# WERK-09 ${ENGINE}: ${JSON.stringify(back.litematic)}`);
  for (const [format, s] of Object.entries(back)) {
    assert.equal(Object.values(s.blocks).reduce((a, n) => a + n, 0), 26, `${format}: jede Zelle`);
    assert.equal(s.blocks['minecraft:chest'], 1); assert.equal(s.blocks['minecraft:oak_sign'], 1);
    assert.deepEqual(s.chest, { name: 'Vorrat', items: ['0:torch×16', '4:bread×5'] }, `${format}: Truhe mit Plätzen und Namen`);
    assert.deepEqual(s.sign, { front: ['Taverne', 'zum Creeper'], back: ['Geöffnet'], colors: [s.sign.colors[0], s.sign.colors[1]] });
    assert.ok(s.sign.colors.includes('red'), `${format}: farbige Schrift`);
    assert.equal(s.entities.length, 1); assert.match(s.entities[0], /^painting:/);
    // Gedreht: das Gemälde hing nach Süden, nach 90° im Uhrzeigersinn hängt es nach Westen.
    assert.equal(s.entities[0], 'painting:west', `${format}: Gemälde dreht mit`);
  }
  assert.deepEqual(back.schem, back.litematic, 'beide Formate tragen dasselbe');
  assert.deepEqual(errors, []);
  await context.close();
});
