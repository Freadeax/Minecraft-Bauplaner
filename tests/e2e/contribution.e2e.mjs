// LIB-06 in a real browser: an imported .litematic becomes a contribution package on its building sheet
// („In Bibliothek einreichen“); the downloaded file passes the same check as the intake script.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readContribution } from '../../dist/domain/src/index.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4263, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

const readStore = (p, store) => p.evaluate(store => new Promise((resolve, reject) => {
  const r = indexedDB.open('minecraft-bauplaner');
  r.onsuccess = () => { const db = r.result, q = db.transaction(store).objectStore(store).getAll(); q.onsuccess = () => { db.close(); resolve(q.result); }; q.onerror = () => reject(q.error); };
  r.onerror = () => reject(r.error);
}), store);

async function importRathaus(p) {
  await p.goto(`${BASE}#/bibliothek`);
  const raw = Buffer.from(readFileSync(new URL('../../fixtures/litematic/realworld.nbt.hex', import.meta.url), 'utf8').replace(/\s/g, ''), 'hex');
  await p.locator('input[type=file]').setInputFiles({ name: 'rathaus.litematic', mimeType: 'application/octet-stream', buffer: raw });
  await p.getByText('DATEI GEPRÜFT').waitFor();
  await p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
  await p.getByText('„rathaus“ als Bauteil gespeichert.').waitFor();
  const asset = (await readStore(p, 'assets')).find(a => a.name === 'rathaus' && !a.demo);
  assert.ok(asset, 'eigenes Bauteil gespeichert');
  return asset;
}

for (const [label, viewport] of [['Desktop', { width: 1400, height: 1000 }], ['Handy', { width: 390, height: 844 }]]) {
  test(`Einreichen (${label}): Paket aus dem Gebäudeblatt, geprüft wie bei der Übernahme`, async () => {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const p = await context.newPage();
    p.setDefaultTimeout(20_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const asset = await importRathaus(p);
    await p.goto(`${BASE}#/bibliothek/gebaeude/${encodeURIComponent(asset.id)}`);
    await p.locator('.building-detail').waitFor();
    // Shipped designs have no submit button; own parts do.
    await p.getByRole('button', { name: '⇪ In Bibliothek einreichen' }).click();
    const panel = p.getByRole('region', { name: 'In Bibliothek einreichen' });
    await panel.getByRole('button', { name: '⇪ Beitrag vorbereiten …' }).click();
    const form = panel.locator('form.contribute-form');
    assert.equal(await form.getByLabel('Kennung (dauerhaft, nur a–z, 0–9, _)').inputValue(), 'beitrag_rathaus');
    await form.getByLabel('Name', { exact: true }).fill('Rathaus mit Schild');
    assert.equal(await form.getByLabel('Kennung (dauerhaft, nur a–z, 0–9, _)').inputValue(), 'beitrag_rathaus_mit_schild', 'Kennung folgt dem Namen');
    await form.getByLabel('Autor oder Erbauer').fill('Philipp');
    await form.getByLabel('Bautipps (einer je Zeile, freiwillig)').fill('Schild zuletzt setzen.\nRahmen mit Item füllen.');

    // Without the rights confirmation the browser does not submit.
    await form.getByRole('button', { name: '↓ Beitragspaket erstellen' }).click();
    assert.equal(await panel.locator('.contribute-result').count(), 0);

    await form.getByRole('checkbox', { name: /selbst gebaut oder habe die Erlaubnis/ }).check();
    const [download] = await Promise.all([p.waitForEvent('download'), form.getByRole('button', { name: '↓ Beitragspaket erstellen' }).click()]);
    assert.equal(download.suggestedFilename(), 'beitrag_rathaus_mit_schild.bauplaner-beitrag.json');
    const file = JSON.parse(readFileSync(await download.path(), 'utf8'));
    const checked = await readContribution(file);
    assert.equal(checked.meta.name, 'Rathaus mit Schild');
    assert.equal(checked.meta.author, 'Philipp');
    assert.deepEqual(checked.meta.tips, ['Schild zuletzt setzen.', 'Rahmen mit Item füllen.']);
    assert.equal(checked.payload.cells.filter(c => c.kind === 'block').length, 18);
    assert.equal(checked.source.dataVersion, 4556);
    assert.ok((checked.payload.entities ?? []).length >= 2, 'Rahmen und Gemälde bleiben im Paket');
    assert.equal(checked.payload.blockEntities.length >= 1, true, 'Schildinhalt bleibt im Paket');
    assert.match(checked.preview ?? '', /^data:image\/png;base64,/);
    assert.equal(file.origin.assetId, asset.id);

    const result = panel.locator('.contribute-result');
    assert.match(await result.innerText(), /Paket „beitrag_rathaus_mit_schild\.bauplaner-beitrag\.json“ heruntergeladen/);
    const href = await result.getByRole('link', { name: /Formular „Bibliotheksbeitrag“ auf GitHub öffnen/ }).getAttribute('href');
    const url = new URL(href);
    assert.equal(url.origin + url.pathname, 'https://github.com/Freadeax/Minecraft-Bauplaner/issues/new');
    assert.equal(url.searchParams.get('template'), 'bibliotheksbeitrag.yml');
    assert.equal(url.searchParams.get('kennung'), 'beitrag_rathaus_mit_schild');
    assert.equal(url.searchParams.get('autor'), 'Philipp');
    assert.ok(href.length < 8000);

    // Author is remembered for the next contribution.
    assert.equal(await p.evaluate(() => localStorage.getItem('bauplaner.beitrag.autor')), 'Philipp');
    assert.equal(await result.getByText('Ohne GitHub-Konto').isVisible(), true, 'Anleitung auch auf dem Handy sichtbar');
    // Nothing sticks out sideways on a phone.
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('Mitgelieferte Gebäude bieten kein Einreichen an', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(20_000);
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_leuchtturm`);
  await p.locator('.building-detail').waitFor();
  assert.equal(await p.getByRole('button', { name: '⇪ In Bibliothek einreichen' }).count(), 0);
  assert.equal(await p.getByRole('region', { name: 'In Bibliothek einreichen' }).count(), 0);
  await context.close();
});
