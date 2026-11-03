// STAB-01-S02: echter Renderingfehler im Browser und Wiederaufnahme. Der Baustein einer
// Seite (Systemcheck) ist nicht ladbar, wie bei einem offenen Tab nach einer neuen
// Veröffentlichung. Erwartet: einmaliges Neuladen (lazyPage), danach die Fehlergrenze
// statt einer leeren App; die Projektzentrale und gespeicherte Projekte bleiben nutzbar,
// und nach „Seite neu laden“ mit erreichbarem Baustein läuft die Seite wieder.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { waitForStart, openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4323, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

test('Renderingfehler: Fehlergrenze statt leerer App, Projekte bleiben, Wiederaufnahme nach Neuladen', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(20_000);
  const loads = [];
  p.on('load', () => loads.push(p.url()));

  // Der Baustein des Systemchecks ist von Anfang an nicht erreichbar (alter Stand nach einer
  // Veröffentlichung). Von Anfang an, weil das Vorladen im Leerlauf ihn sonst vorher holt.
  const block = route => route.abort('failed');
  await p.route(/\/assets\/SystemView-[^/]+\.js$/, block);

  // Ein Projekt anlegen, das den Fehler überstehen muss.
  await p.goto(`${BASE}#/`);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const projectUrl = p.url();
  await p.goto(`${BASE}#/`);
  await waitForStart(p);

  const before = loads.length;
  await p.evaluate(() => { location.hash = '#/system'; });

  // lazyPage lädt einmal neu, scheitert erneut, dann greift die Fehlergrenze.
  const alert = p.getByRole('alert').filter({ hasText: 'Diese Seite ist auf einen Fehler gestoßen.' });
  await alert.waitFor({ timeout: 60_000 });
  assert.equal(loads.length - before, 1, 'genau ein automatisches Neuladen, keine Schleife');
  assert.match(await alert.innerText(), /Deine gespeicherten Projekte und Bauteile sind nicht betroffen/);
  for (const name of ['Erneut versuchen', 'Seite neu laden', 'Fehlerbericht kopieren']) assert.equal(await alert.getByRole('button', { name }).count(), 1, name);
  assert.ok((await p.locator('.crash-message').innerText()).length > 0, 'Fehlermeldung wird angezeigt');
  // Die App-Hülle bleibt bedienbar (keine weiße Seite).
  assert.ok(await p.locator('nav').first().isVisible(), 'Navigation bleibt sichtbar');

  // Wiederaufnahme ohne Neuladen: Projektzentrale und das Projekt funktionieren weiter.
  await alert.getByRole('link', { name: 'Zur Projektzentrale' }).click();
  await waitForStart(p);
  assert.equal(await p.getByRole('alert').filter({ hasText: 'Diese Seite ist auf einen Fehler gestoßen.' }).count(), 0);
  await p.goto(projectUrl);
  await p.waitForURL(/#\/projekt\//);
  assert.equal(await p.getByRole('alert').filter({ hasText: 'Diese Seite ist auf einen Fehler gestoßen.' }).count(), 0, 'Projekt öffnet ohne Fehler');

  // Baustein wieder erreichbar: „Seite neu laden“ auf dem Systemcheck stellt die Seite her.
  await p.evaluate(() => { location.hash = '#/system'; });
  const again = p.getByRole('alert').filter({ hasText: 'Diese Seite ist auf einen Fehler gestoßen.' });
  await again.waitFor({ timeout: 60_000 });
  await p.unroute(/\/assets\/SystemView-[^/]+\.js$/, block);
  await again.getByRole('button', { name: 'Seite neu laden' }).click();
  await p.getByRole('heading', { name: 'Läuft alles sauber?' }).waitFor({ timeout: 60_000 });
  assert.equal(await p.getByRole('alert').filter({ hasText: 'Diese Seite ist auf einen Fehler gestoßen.' }).count(), 0);
  await context.close();
});
