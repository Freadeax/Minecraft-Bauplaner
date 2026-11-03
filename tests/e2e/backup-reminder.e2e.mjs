// Browser check of BACKUP-02: Sicherungsstand (reminder, receipts, verify) and Abschnittsstände (freeze, drift, restore, copy).
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4251, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const watch = page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
};

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Sicherungsstand: Erinnerung, Protokoll, Prüfen, Projektkopf (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const p = await context.newPage();
    p.setDefaultTimeout(10_000);
    const errors = watch(p);
    await p.goto(BASE);
    const status = p.getByRole('region', { name: 'Sicherungsstand' });
    await status.getByText('Noch nichts zu sichern.').waitFor();
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    await p.locator('.backup-chip[data-backup-state=never]').waitFor();
    await p.goto(BASE);

    // Never backed up → due banner; the texts do not claim any copy outside the browser.
    const banner = p.getByRole('region', { name: 'Sicherungserinnerung' });
    await banner.getByText(/Noch nie gesichert/).waitFor();
    assert.match(await banner.innerText(), /kann er nicht prüfen/);
    await status.locator('tr.cov-never', { hasText: 'Burgmauer (Beispiel)' }).waitFor();

    // Back up everything → receipt, current state, banner gone.
    const [download] = await Promise.all([p.waitForEvent('download'), banner.getByRole('button', { name: 'Gesamtsicherung herunterladen' }).click()]);
    await p.getByText(/Sicherungsdatei erzeugt und zum Herunterladen übergeben/).waitFor();
    await status.getByText('Alles seit der letzten Sicherung unverändert.').waitFor();
    assert.equal(await banner.count(), 0);
    const path = await download.path();
    const text = await readFile(path, 'utf8');

    // Verify the file: checksum ok, nothing restored, receipt in history.
    await status.getByLabel('Sicherungsdatei prüfen').setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.from(text) });
    await status.getByText(/ist lesbar und unversehrt \(Prüfsumme stimmt\)/).waitFor();
    await status.getByText(/Zuletzt wieder eingelesen und Prüfsumme bestätigt/).waitFor();
    await status.locator('summary', { hasText: 'Verlauf (2)' }).waitFor();
    // A damaged copy is rejected.
    const broken = text.replace('"Burgmauer (Beispiel)"', '"Burgmauer (manipuliert)"');
    await status.getByLabel('Sicherungsdatei prüfen').setInputFiles({ name: 'kaputt.json', mimeType: 'application/json', buffer: Buffer.from(broken) });
    await status.getByText(/Prüfung fehlgeschlagen/).waitFor();
    await status.locator('summary', { hasText: 'Verlauf (2)' }).waitFor();

    // Change the project → header chip and Projektzentrale show it; receipts survive a reload.
    await p.getByRole('link', { name: 'Burgmauer (Beispiel)' }).first().click();
    await p.locator('.backup-chip[data-backup-state=current]').waitFor();
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await p.getByRole('button', { name: /Je Bauteil ein Abschnitt/ }).click();
    await p.locator('.backup-chip[data-backup-state=changed]').waitFor();
    await p.waitForTimeout(400);
    await p.goto(BASE);
    await p.reload();
    await status.locator('tr.cov-changed', { hasText: 'Burgmauer (Beispiel)' }).waitFor();
    await status.getByText(/1 Änderung seit der letzten Sicherung/).waitFor();
    await status.getByRole('button', { name: 'Sichern' }).first().click();
    await status.getByText('Alles seit der letzten Sicherung unverändert.').waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('Abschnittsstände: einfrieren, Abweichung sichtbar, zurücksetzen, als Projekt öffnen', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errors = watch(p);
  p.on('dialog', d => void d.accept());
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const projectUrl = p.url().replace(/\/[a-z]+$/, '');
  await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
  const site = p.getByRole('region', { name: 'Baustelle' });
  await site.getByRole('button', { name: /Je Bauteil ein Abschnitt/ }).click();
  const first = site.locator('.site-section').first();
  await first.getByText('Turm West').waitFor();

  // Freeze the first section.
  await first.getByRole('button', { name: 'Turm West einfrieren' }).click();
  await first.getByLabel('Bezeichnung des Stands').fill('vor dem Umbau');
  await first.getByRole('button', { name: 'Stand einfrieren' }).click();
  await first.locator('.snap-badge[data-snapshot-state=same]', { hasText: 'Stand 1 · unverändert' }).waitFor();
  const archive = site.getByRole('region', { name: 'Abschnittsstände' });
  await archive.getByText('„vor dem Umbau“').waitFor();

  // Change the membership: the editor of a frozen section warns first, the drift is shown afterwards.
  await first.getByRole('button', { name: 'Bearbeiten' }).click();
  await first.getByRole('note').getByText(/als Stand 1 eingefroren/).waitFor();
  await first.getByRole('checkbox', { name: 'Mauer 1' }).check();
  await first.getByRole('button', { name: 'Übernehmen' }).click();
  await first.locator('.snap-badge[data-snapshot-state=changed]').waitFor();
  const item = archive.locator('.snap-item').first();
  await item.getByText(/Bauteile oder Schichtbereiche des Abschnitts geändert/).waitFor();
  await item.getByText(/Bauschritte? neu im Abschnitt/).waitFor();

  // Persisted across reload, restore with preview, then undo-able.
  await p.waitForTimeout(400);
  await p.reload();
  await archive.locator('.snap-item.changed').waitFor();
  await item.getByRole('button', { name: 'Auf diesen Stand zurücksetzen …' }).click();
  const preview = item.getByRole('group', { name: 'Zurücksetzen prüfen' });
  await preview.getByText('Vorschau – noch nichts geändert').waitFor();
  await preview.getByText(/Abschnittsdefinition .* auf Stand 1/).waitFor();
  await preview.getByRole('button', { name: 'Zurücksetzen (rückgängig machbar)' }).click();
  await first.locator('.snap-badge[data-snapshot-state=same]').waitFor();

  // Remove the section: the stand stays findable and can bring the section back.
  await first.getByRole('button', { name: 'Turm West entfernen' }).click();
  await archive.getByText('Abschnitt entfernt').waitFor();
  await archive.getByLabel('Abschnittsstände durchsuchen').fill('umbau');
  await archive.locator('.snap-item.removed').waitFor();
  await archive.locator('.snap-item').first().getByRole('button', { name: 'Auf diesen Stand zurücksetzen …' }).click();
  await archive.getByText(/„Turm West“ an Position 1 wieder anlegen/).waitFor();
  await archive.getByRole('button', { name: 'Zurücksetzen (rückgängig machbar)' }).click();
  await site.locator('.site-section').first().locator('.snap-badge[data-snapshot-state=same]').waitFor();

  // Separate project from the stand.
  await archive.locator('.snap-item').first().getByRole('button', { name: 'Als eigenes Projekt öffnen' }).click();
  await p.waitForURL(url => url.href !== `${projectUrl}/baustelle` && /\/baustelle$/.test(url.href));
  await p.getByRole('heading', { level: 1, name: /Turm West Stand 1/ }).waitFor();
  await p.getByRole('region', { name: 'Baustelle' }).locator('.site-section').first().getByText('Turm West').waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
