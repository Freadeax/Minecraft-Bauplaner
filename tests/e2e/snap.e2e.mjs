// Browser check of connectors, snap and region-as-asset (B5) against the built
// Pages artifact. Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4183, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function page() {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors };
}

test('Editor: Anschlüsse verbinden, gelöste Verbindung erkennen, wieder andocken, Bauteil anfügen, Undo', async () => {
  const { p, errors } = await page();
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  const panel = p.locator('.snap-panel');
  await panel.getByText('4 aufeinanderliegende Anschlüsse ohne Verbindung').waitFor();
  for (let i = 0; i < 4; i++) await panel.getByRole('button', { name: 'Nächste verbinden' }).click();
  await panel.getByText('VERBINDUNGEN (4)').waitFor();
  assert.equal(await panel.locator('.link-list .badge.ok').count(), 4);
  assert.equal(await panel.getByRole('button', { name: 'Nächste verbinden' }).count(), 0);

  await p.getByRole('button', { name: /Mauer 1/ }).click();
  await p.getByRole('button', { name: 'X minus 1' }).click();
  await panel.getByText('Anschlüsse liegen nicht mehr aufeinander').first().waitFor();
  assert.equal(await panel.locator('.link-list li.broken').count(), 2);
  const first = panel.getByRole('list', { name: 'Snap-Vorschläge' }).locator('button').first();
  assert.match(await first.innerText(), /konfliktfrei/);
  assert.match(await first.innerText(), /Pivot 4 \/ 0 \/ 1 · 2 Anschlüsse/);
  await first.click();
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  assert.equal(await panel.locator('.link-list li.broken').count(), 0);
  assert.equal(await panel.locator('.link-list .badge.ok').count(), 4);

  await p.getByRole('button', { name: /Turm Ost/ }).click();
  await panel.getByText('Bauteil an Anschluss anfügen').click();
  await panel.getByLabel('Bauteil zum Anfügen').selectOption({ label: 'Mauersegment' });
  const attach = panel.getByRole('list', { name: 'Anfüge-Vorschläge' }).locator('button').first();
  assert.match(await attach.innerText(), /konfliktfrei/);
  await attach.click();
  assert.equal(await p.locator('.editor-tree .instance-list li').count(), 6);
  await panel.getByText('VERBINDUNGEN (5)').waitFor();
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  await p.getByRole('button', { name: /Rückgängig/ }).click();
  assert.equal(await p.locator('.editor-tree .instance-list li').count(), 5);
  await panel.getByText('VERBINDUNGEN (4)').waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});

test('Editor: Instanz im 3D-Bild ziehen, rastet am Anschluss ein, ein Undo-Schritt; Esc bricht ab', async () => {
  const { p, errors } = await page();
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByRole('button', { name: /Mauer 1/ }).click();
  await p.getByRole('button', { name: 'X plus 1' }).click();
  await p.getByLabel('X-Koordinate').and(p.locator('[value="5"]')).waitFor();
  await p.getByRole('button', { name: 'Ziehen' }).click();
  await p.getByRole('button', { name: 'Draufsicht (Norden oben)' }).click();
  await p.getByRole('button', { name: 'Auswahl fokussieren' }).click();
  const host = p.locator('.editor .canvas-host');
  await host.locator('canvas').waitFor();
  const box = await host.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await p.mouse.move(cx, cy);
  await p.locator('.viewer-hud b').waitFor();

  // Escape cancels a running grab: nothing changes.
  await p.mouse.down();
  await p.mouse.move(cx - 40, cy, { steps: 4 });
  await p.keyboard.press('Escape');
  await p.mouse.up();
  assert.equal(await host.getAttribute('data-ghost'), '');
  assert.equal(await p.getByLabel('X-Koordinate').inputValue(), '5');

  await p.mouse.move(cx, cy);
  await p.mouse.down();
  let tone = '';
  for (let dx = 8; dx <= 400 && !tone.endsWith('|snap'); dx += 8) {
    await p.mouse.move(cx - dx, cy);
    tone = await host.getAttribute('data-ghost') ?? '';
  }
  assert.match(tone, /^4,0,1\|snap$/, `Vorschau rastet an Turm West ein: ${tone}`);
  assert.match(await p.locator('.drag-hint').innerText(), /Rastet ein: west → Turm West · east/);
  await p.mouse.up();
  await p.getByLabel('X-Koordinate').and(p.locator('[value="4"]')).waitFor();
  assert.equal(await host.getAttribute('data-ghost'), '');
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  await p.locator('.snap-panel').getByText('VERBINDUNGEN (2)').waitFor();
  await p.getByRole('button', { name: /Rückgängig/ }).click();
  await p.getByLabel('X-Koordinate').and(p.locator('[value="5"]')).waitFor();
  await p.locator('.snap-panel').getByText('VERBINDUNGEN (0)').waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});

test('Bibliothek: Bereich als Bauteil speichern und Anschlüsse als neue Version anlegen', async () => {
  const { p, errors } = await page();
  await p.goto(`${BASE}#/bibliothek`);
  await p.getByRole('link', { name: /^Eckturm/ }).first().click();
  assert.match(await p.locator('.connector-editor').innerText(), /schreibgeschützt/);
  await p.getByText('Bereich als Bauteil speichern').click();
  const yTo = p.getByLabel('Y bis');
  await yTo.fill('2'); await yTo.press('Enter');
  await p.getByText(/4 × 3 × 4 · 40 Blöcke im Bereich/).waitFor();
  await p.getByLabel('Bezeichnung').fill('Turmsockel');
  await p.getByRole('button', { name: 'Ausschnitt speichern' }).click();
  await p.getByText('Bereich als neues Bauteil „Turmsockel“ gespeichert.', { exact: false }).waitFor();
  await p.getByRole('heading', { name: 'Turmsockel' }).waitFor();
  const inspector = p.locator('.building-detail');
  assert.match(await inspector.innerText(), /Turmsockel/);
  assert.match(await inspector.innerText(), /crop/);
  assert.match(await inspector.innerText(), /frei für dieses Projekt/, 'provenance inherited');

  await p.getByRole('button', { name: '＋ Anschluss' }).click();
  await p.getByLabel('Anschluss 1 Typ').fill('wall_joint');
  await p.getByLabel('Anschluss 1 Profil').fill('wall_2x5');
  const x = p.getByLabel('Anschluss 1 X');
  await x.fill('3'); await x.press('Enter');
  await p.getByText(/liegt nicht auf der Fläche/).waitFor();
  assert.ok(await p.getByRole('button', { name: 'Als neue Version speichern' }).isDisabled());
  await x.fill('4'); await x.press('Enter');
  await p.getByRole('button', { name: 'Als neue Version speichern' }).click();
  await p.getByText('Anschlüsse als Version 2.0 von „Turmsockel“ gespeichert.', { exact: false }).waitFor();
  assert.match(await inspector.innerText(), /Anschlüsse\s*east/);
  assert.deepEqual(errors, []);
  await p.close();
});
