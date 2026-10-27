// Browser check of the Schem export tab (B2) against the built Pages artifact.
// The downloaded file is verified by the independent Python reader.
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4181, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const dir = mkdtempSync(join(tmpdir(), 'schem-e2e-'));
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

function verify(file) {
  const r = spawnSync('python3', ['-I', 'scripts/verify_schem.py', file], { encoding: 'utf8' });
  return { status: r.status, summary: JSON.parse(r.stdout) };
}

async function download(p, click, name) {
  const [d] = await Promise.all([p.waitForEvent('download'), click()]);
  const file = join(dir, name);
  await d.saveAs(file);
  return { name: d.suggestedFilename(), file };
}

test('Export: Revision einfrieren, Datei prüfen, Sperre bei Konflikt, alte Revision reproduzierbar', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByRole('link', { name: 'Export' }).click();
  await p.getByText('✓ Exportbereit').waitFor();
  await p.getByText('Noch keine Revision.').waitFor();
  const submit = p.getByRole('button', { name: 'Revision einfrieren und .schem exportieren' });
  assert.equal(await submit.isDisabled(), true, 'no DataVersion known for the sample profile → must be chosen');
  await p.getByLabel('DataVersion (Zielversion)').fill('3955');
  await p.getByLabel('Kommentar zur Revision').fill('Erste Abnahme');

  const first = await download(p, () => submit.click(), 'first.schem');
  assert.match(first.name, /-rev1\.schem$/);
  await p.getByText('DATEI ERZEUGT').waitFor();
  const report = await p.locator('.export-report').innerText();
  assert.match(report, /Revision 1/); assert.match(report, /3955/);
  const hash1 = (await p.locator('.export-report .hash').innerText()).trim();
  const v = verify(first.file);
  assert.equal(v.status, 0, JSON.stringify(v.summary));
  assert.equal(v.summary.dataVersion, 3955);
  const sha = (await import('node:crypto')).createHash('sha256').update(readFileSync(first.file)).digest('hex');
  assert.equal(sha, hash1, 'reported hash is the hash of the downloaded file');
  await p.locator('.export-revisions li', { hasText: 'Revision 1' }).getByText('aktueller Stand').waitFor();
  await p.getByRole('button', { name: 'Revision 1 als .schem exportieren' }).waitFor();

  // Conflict in the editor locks the export of the current state.
  await p.getByRole('link', { name: 'Editor' }).click();
  await p.getByRole('button', { name: /Mauer 1/ }).click();
  await p.getByRole('button', { name: 'X minus 1' }).click();
  await p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
  await p.getByRole('link', { name: 'Export' }).click();
  await p.getByText('🔒 Export gesperrt').waitFor();
  assert.match(await p.locator('.export-status').innerText(), /ungeklärte Voxelkonflikte/);
  await p.getByLabel('DataVersion (Zielversion)').fill('3955');
  assert.equal(await p.getByRole('button', { name: 'Revision einfrieren und .schem exportieren' }).isDisabled(), true);

  // The frozen revision 1 stays exportable and byte-identical.
  const again = await download(p, () => p.getByRole('button', { name: 'Revision 1 exportieren' }).click(), 'again.schem');
  assert.deepEqual(readFileSync(again.file), readFileSync(first.file));
  assert.deepEqual(errors, []);
  await p.close();
});
