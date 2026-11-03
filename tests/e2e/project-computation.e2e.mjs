// PERF-01: real project worker lifecycle; delay only script delivery, never fabricate computation results.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4199, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;
before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });
const state = (page, expected) => page.locator(`.project-page[data-computation-state="${expected}"]`).waitFor();
async function openSample(page) {
  page.setDefaultTimeout(15_000);
  await page.goto(BASE);
  await openSampleProject(page);
  await page.waitForURL(/#\/projekt\//);
}

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`worker: cancel, retry and rapid edits retain only newest geometry (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
    const page = await context.newPage();
    const workers = [], starts = [], errors = [];
    page.on('request', request => { if (/project\.worker-/.test(request.url())) starts.push(request.url()); });
    page.on('worker', worker => { if (/project\.worker-/.test(worker.url())) workers.push(worker.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/project.worker-*.js', async route => {
      await new Promise(resolve => setTimeout(resolve, 600));
      try { await route.continue(); } catch { /* termination may cancel this script request */ }
    });
    try {
      await openSample(page);
      await state(page, 'pending');
      await page.getByRole('button', { name: 'Berechnung abbrechen', exact: true }).click();
      await state(page, 'cancelled');
      await page.getByRole('button', { name: 'Neu berechnen', exact: true }).click();
      await state(page, 'ready');
      await page.locator('.instance-list button', { hasText: 'Turm West' }).click();
      await page.getByRole('button', { name: 'Y plus 1', exact: true }).click();
      await state(page, 'pending');
      await page.getByRole('button', { name: 'Y plus 1', exact: true }).click();
      assert.equal(await page.getByRole('textbox', { name: 'Y-Koordinate', exact: true }).inputValue(), '2');
      await page.getByRole('link', { name: 'Bauen', exact: true }).click();
      assert.equal(await page.locator('.build-step').count(), 0, 'old guide is hidden while a new computation is pending');
      await state(page, 'ready');
      await page.locator('.step-item', { hasText: 'Turm West' }).first().click();
      assert.match(await page.locator('.build-step h2').innerText(), /Turm West · Y 2/);
      await page.getByRole('link', { name: 'Material', exact: true }).click();
      await page.getByRole('region', { name: 'Materialbedarf' }).waitFor();
      await page.locator('.materials-stats').waitFor();
      // A worker terminated before its script loads has a request but emits no initialized-worker event.
      assert.ok(starts.length >= 3, `actual worker script starts including cancellation: ${starts.length}`);
      assert.ok(workers.length >= 2, `initialized workers for retry and final geometry: ${workers.length}`);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

test('worker failure is visible and a retry runs the actual computation', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  let failNext = true;
  await context.route('**/project.worker-*.js', async route => {
    if (failNext) { failNext = false; await route.abort('failed'); }
    else await route.continue();
  });
  try {
    await openSample(page);
    await state(page, 'error');
    const status = page.getByLabel('Projektberechnung');
    assert.ok((await status.innerText()).length > 10, 'understandable failure message is shown');
    await page.getByRole('button', { name: 'Neu berechnen', exact: true }).click();
    await state(page, 'ready');
    await page.getByRole('link', { name: 'Bauen', exact: true }).click();
    await page.locator('.build-step').waitFor();
  } finally { await context.close(); }
});

test('historical build basis retains frozen geometry after current project is moved', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await openSample(page);
    await state(page, 'ready');
    await page.getByRole('link', { name: 'Export', exact: true }).click();
    await page.getByLabel('DataVersion (Zielversion)').fill('3955');
    await page.getByLabel('Kommentar zur Revision').fill('Worker-Referenz');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Revision einfrieren und .schem exportieren' }).click(),
    ]);
    assert.match(download.suggestedFilename(), /-rev1\.schem$/);
    await state(page, 'ready');
    await page.getByRole('link', { name: 'Editor', exact: true }).click();
    await page.locator('.instance-list button', { hasText: 'Turm West' }).click();
    await page.getByRole('button', { name: 'Y plus 1', exact: true }).click();
    await state(page, 'ready');
    await page.getByRole('link', { name: 'Bauen', exact: true }).click();
    await page.locator('.step-item', { hasText: 'Turm West' }).first().click();
    assert.match(await page.locator('.build-step h2').innerText(), /Turm West · Y 1/);
    await page.locator('.build-basis select').selectOption({ label: 'Revision 1 – Worker-Referenz' });
    await page.locator('.build-step').waitFor();
    await page.locator('.step-item', { hasText: 'Turm West' }).first().click();
    assert.match(await page.locator('.build-step h2').innerText(), /Turm West · Y 0/);
    await page.locator('.build-basis select').selectOption('working');
    await page.locator('.build-step').waitFor();
    await page.locator('.step-item', { hasText: 'Turm West' }).first().click();
    assert.match(await page.locator('.build-step h2').innerText(), /Turm West · Y 1/);
  } finally { await context.close(); }
});
