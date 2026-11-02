// LIB-02/LIB-03 in a real browser: own collections (folders, categories, catalogue filter, version pin)
// and own templates (from ensemble/project/generator, edit history, restore, project takeover, backup).
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4247, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

/** Reads one IndexedDB store of the app directly (independent of the UI under test). */
const readStore = (p, store) => p.evaluate(store => new Promise((resolve, reject) => {
  const r = indexedDB.open('minecraft-bauplaner');
  r.onsuccess = () => { const db = r.result, q = db.transaction(store).objectStore(store).getAll(); q.onsuccess = () => { db.close(); resolve(q.result); }; q.onerror = () => reject(q.error); };
  r.onerror = () => reject(r.error);
}), store);
const status = p => p.locator('.notice[role=status]').last();

test('Sammlungen: Ordner mit Kategorie und Unterordner, Gebäude aufnehmen, Version festhalten, Notiz, Katalogfilter, Neuladen', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await p.goto(`${BASE}#/bibliothek/sammlungen`);
  await p.getByRole('heading', { name: 'Noch keine eigenen Sammlungen' }).waitFor();
  const form = p.getByRole('form', { name: 'Neue Sammlung' });
  await form.getByLabel('Name').fill('Survival-Basis');
  await form.getByLabel('Kategorie').fill('Survival');
  await form.getByRole('button', { name: 'Anlegen' }).click();
  await p.getByRole('heading', { name: 'Survival-Basis' }).waitFor();
  assert.match(await p.locator('.col-aside').innerText(), /SURVIVAL[\s\S]*Survival-Basis/i);
  await p.getByText('Diese Sammlung ist leer.').waitFor();

  // Sub folder of the open collection.
  await form.getByLabel('Name').fill('Farmen');
  await form.getByLabel(/als Unterordner von „Survival-Basis“/).check();
  await form.getByRole('button', { name: 'Anlegen' }).click();
  await p.getByRole('navigation', { name: 'Pfad' }).getByRole('link', { name: 'Survival-Basis' }).waitFor();
  const stored = await readStore(p, 'collections');
  const basis = stored.find(c => c.name === 'Survival-Basis'), farmen = stored.find(c => c.name === 'Farmen');
  assert.equal(farmen.parentId, basis.id); assert.equal(basis.category, 'Survival'); assert.equal(basis.revision, 1);

  // A building joins the collection from its detail page.
  await p.goto(`${BASE}#/bibliothek?q=Leuchtturm`);
  await p.locator('.catalog-results .bcard-open').first().click();
  await p.locator('.building-detail').waitFor();
  const name = (await p.locator('.detail-title').innerText()).trim();
  await p.locator('.collection-picker summary').click();
  await p.getByRole('list', { name: 'Sammlungen' }).getByRole('checkbox', { name: 'Survival-Basis' }).click();
  await status(p).filter({ hasText: `„${name}“ zu „Survival-Basis“ hinzugefügt.` }).waitFor();
  assert.match(await p.locator('.collection-picker summary').innerText(), /In Sammlung \(1\)/);

  // Collection page: preview, version pin, note, order.
  await p.goto(`${BASE}#/bibliothek/sammlungen/${encodeURIComponent(basis.id)}`);
  const item = p.locator('.col-item').first();
  await item.getByRole('link', { name }).waitFor();
  await item.locator('img[src^="data:image/png"]').waitFor();
  const pin = item.getByLabel(`Version für ${name}`);
  const options = await pin.locator('option').allInnerTexts();
  assert.equal(options[0], 'immer neueste'); assert.match(options[1], /^festhalten: v/);
  await pin.selectOption({ index: 1 });
  await status(p).filter({ hasText: 'Version festgehalten.' }).waitFor();
  await item.getByLabel('Notiz').fill('Am Hafen bauen');
  await item.getByRole('button', { name: 'Speichern' }).click();
  await status(p).filter({ hasText: 'Notiz gespeichert.' }).waitFor();
  const [saved] = (await readStore(p, 'collections')).filter(c => c.id === basis.id);
  assert.equal(saved.items.length, 1); assert.equal(saved.items[0].note, 'Am Hafen bauen'); assert.match(saved.items[0].versionId, /^av_/);

  // Catalogue filter shows exactly the collection's building; reload keeps everything.
  await p.getByRole('link', { name: 'Im Katalog filtern →' }).click();
  await p.locator('.catalog-results .bcard-open').first().waitFor();
  assert.equal(Number((await p.locator('.result-count b').innerText()).replace(/\D/g, '')), 1);
  assert.match(p.url(), /sammlung=col_/);
  await p.reload();
  await p.getByRole('button', { name: /Sammlungsfilter Survival-Basis entfernen/ }).waitFor();
  await p.locator('.catalog-results .bcard-open').first().waitFor();
  assert.equal(Number((await p.locator('.result-count b').innerText()).replace(/\D/g, '')), 1);
  await p.getByRole('button', { name: /Sammlungsfilter Survival-Basis entfernen/ }).click();
  assert.ok(Number((await p.locator('.result-count b').innerText()).replace(/\D/g, '')) > 100);

  // Deleting the parent keeps the sub folder (moves up) and the building.
  await p.goto(`${BASE}#/bibliothek/sammlungen/${encodeURIComponent(basis.id)}`);
  await p.locator('.col-edit summary').click();
  await p.getByRole('button', { name: 'Löschen …' }).click();
  await p.getByRole('button', { name: 'Endgültig löschen' }).click();
  await status(p).filter({ hasText: /gelöscht; 1 Unterordner eine Ebene nach oben/ }).waitFor();
  const after = await readStore(p, 'collections');
  assert.deepEqual(after.map(c => [c.name, c.parentId]), [['Farmen', null]]);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Vorlagen: eigenes Ensemble, Bearbeiten mit Verlauf, Wiederherstellen, Projekt bleibt unverändert, Generatorvorlage, Sicherung', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const p = await context.newPage();
  p.setDefaultTimeout(20_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await p.goto(`${BASE}#/bibliothek/vorlagen`);
  await p.getByRole('heading', { name: 'Noch keine eigenen Vorlagen' }).waitFor();
  await p.goto(`${BASE}#/bibliothek/ensembles/ens_burg`);
  await p.getByRole('button', { name: 'Als eigene Vorlage speichern' }).click();
  await p.getByRole('link', { name: 'Zur Vorlage →' }).click();
  await p.getByRole('heading', { name: 'Burg (eigene Vorlage)' }).waitFor();
  assert.match(await p.locator('.panel-kicker').first().innerText(), /ENSEMBLEVORLAGE · STAND 1/);
  await p.locator('canvas').first().waitFor();
  assert.equal(await p.getByRole('region', { name: 'Bauteile der Vorlage' }).locator('li').count(), 7);
  const [template] = await readStore(p, 'templates');
  assert.ok(template.body.members.every(m => m.assetVersionId.startsWith('av_')));

  // Project takeover copies the template.
  await p.getByRole('button', { name: 'Als Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);
  const projectId = decodeURIComponent(p.url().split('#/projekt/')[1].split('/')[0]);
  const projectBefore = (await readStore(p, 'projects')).find(x => x.id === projectId);
  assert.equal(projectBefore.instances.length, 7);
  assert.match(projectBefore.description, /Aus Vorlage „Burg \(eigene Vorlage\)“ \(Stand 1\)/);

  // Edit: rename and drop a member → Stand 2/3, history keeps earlier states.
  await p.goto(`${BASE}#/bibliothek/vorlagen/${encodeURIComponent(template.id)}`);
  const edit = p.getByRole('region', { name: 'Vorlage bearbeiten' });
  await edit.getByLabel('Name').fill('Meine Burg');
  await edit.getByRole('button', { name: 'Speichern' }).click();
  await p.getByRole('heading', { name: 'Meine Burg' }).waitFor();
  await p.getByRole('region', { name: 'Bauteile der Vorlage' }).getByRole('button', { name: 'entfernen' }).first().click();
  await status(p).filter({ hasText: 'Bauteil aus der Vorlage entfernt' }).waitFor();
  assert.equal(await p.getByRole('region', { name: 'Bauteile der Vorlage' }).locator('li').count(), 6);
  const history = p.getByRole('region', { name: 'Verlauf' });
  assert.equal(await history.locator('li').count(), 2);
  await history.locator('li').filter({ hasText: 'Stand 1' }).getByRole('button', { name: 'Wiederherstellen' }).click();
  await p.getByRole('heading', { name: 'Burg (eigene Vorlage)' }).waitFor();
  assert.match(await p.locator('.panel-kicker').first().innerText(), /STAND 4/);
  assert.equal(await p.getByRole('region', { name: 'Bauteile der Vorlage' }).locator('li').count(), 7);
  const projectAfter = (await readStore(p, 'projects')).find(x => x.id === projectId);
  assert.deepEqual(projectAfter, projectBefore, 'template edits do not change the project created from it');

  // Generator template: save, reopen via chip, update.
  await p.goto(`${BASE}#/bibliothek/generatoren/turm~wachturm`);
  const box = p.getByRole('group', { name: 'Eigene Vorlage' });
  await box.getByLabel('Name der Generatorvorlage').fill('Mein Wachturm');
  await box.getByRole('button', { name: 'Als neue Vorlage speichern' }).click();
  await p.waitForURL(/generatoren\/turm!tpl_/);
  await box.getByText('Geöffnet aus').waitFor();
  assert.equal(await box.getByRole('button', { name: 'Vorlage „Mein Wachturm“ aktualisieren' }).isDisabled(), true);
  await p.goto(`${BASE}#/bibliothek/generatoren`);
  await p.getByRole('link', { name: '★ Mein Wachturm' }).click();
  await p.waitForURL(/generatoren\/turm!tpl_/);
  const gen = (await readStore(p, 'templates')).find(t => t.name === 'Mein Wachturm');
  assert.equal(gen.body.kind, 'generator'); assert.equal(gen.body.source.id, 'turm'); assert.equal(gen.body.source.params.hoehe, 10);

  // Template into a collection, then a full backup carries both (format 2).
  await p.goto(`${BASE}#/bibliothek/vorlagen/${encodeURIComponent(gen.id)}`);
  await p.locator('.collection-picker summary').click();
  await p.getByLabel('Name der neuen Sammlung').fill('Türme');
  await p.locator('.picker-new').getByRole('button', { name: 'Anlegen' }).click();
  await status(p).filter({ hasText: 'Sammlung „Türme“ angelegt' }).waitFor();
  await p.goto(`${BASE}#/`);
  const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Alles sichern' }).click()]);
  const file = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(file.formatVersion, 3); assert.equal(file.baseFormatVersion, 2); // packed container (STORE-03) around format 2
  assert.deepEqual(file.collections.map(c => c.name), ['Türme']);
  assert.deepEqual(file.templates.map(t => t.name).sort(), ['Burg (eigene Vorlage)', 'Mein Wachturm']);
  assert.match(await status(p).innerText(), /1 Sammlung\(en\), 2 Vorlage\(n\)/);

  // Restore into a fresh browser profile.
  const fresh = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const q = await fresh.newPage();
  await q.goto(`${BASE}#/`);
  await q.locator('.file-button input[type=file]').setInputFiles(await download.path());
  await q.getByRole('button', { name: /Wiederherstellen/ }).first().click();
  await q.locator('.notice[role=status]').filter({ hasText: 'Wiederhergestellt' }).waitFor();
  assert.deepEqual((await readStore(q, 'templates')).map(t => t.name).sort(), ['Burg (eigene Vorlage)', 'Mein Wachturm']);
  await q.goto(`${BASE}#/bibliothek/sammlungen`);
  await q.getByRole('link', { name: /Türme/ }).first().waitFor();
  await fresh.close();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Sammlungen und Vorlagen auf dem Telefon (390 px): kein horizontales Scrollen, Bedienung erreichbar', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  await p.goto(`${BASE}#/bibliothek/sammlungen`);
  const form = p.getByRole('form', { name: 'Neue Sammlung' });
  await form.getByLabel('Name').fill('Mobil');
  await form.getByRole('button', { name: 'Anlegen' }).click();
  await p.getByRole('heading', { name: 'Mobil' }).waitFor();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal scroll on collections');
  await p.goto(`${BASE}#/bibliothek/vorlagen`);
  await p.getByRole('heading', { name: 'Noch keine eigenen Vorlagen' }).waitFor();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal scroll on templates');
  await context.close();
});
