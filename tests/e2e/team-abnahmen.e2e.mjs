// Block B (07.11.2026): automatische Abnahme von TEAMBAU-30, TEAMBAU-31 und KARTE-10 mit mehreren Browsern gegen den
// echten Team-Raum unter `wrangler dev` (services/team-room: Durable Objects TeamRoom und RoomVault mit SQLite, kein
// Nachbau). Die automatischen Sicherungen laufen mit `--var BACKUP_DELAY_MS/BACKUP_EVERY_MS` nach Sekunden statt nach
// einer Viertelstunde – derselbe Alarm wie im Dienst, nur schneller. Läuft in Chromium, Firefox und WebKit
// (`node scripts/checks/e2e_engine.mjs webkit tests/e2e/team-abnahmen.e2e.mjs`). Was nur echte Geräte zeigen, steht in
// apps/web/src/testing/autochecks.ts unter „remaining“. Run after `npm run build`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject, REFUSED, WEBKIT_NOISE } from './start.mjs';
import { startTeamRoomDev } from './teamRoomDev.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ENGINE = chromium.name();
const PORT = 4393, ROOM_PORT = 8795, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, room;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  room = await startTeamRoomDev(ROOM_PORT, { vars: { BACKUP_DELAY_MS: 20000, BACKUP_EVERY_MS: 4000 } });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); await room?.close(); server?.kill(); });

async function device(viewport, opts = {}) {
  const context = await browser.newContext({ viewport, ...opts });
  const p = await context.newPage();
  p.setDefaultTimeout(25_000);
  const errors = [], answers = [];
  p.on('pageerror', e => { if (!WEBKIT_NOISE.test(e.message)) errors.push(e.message); });
  p.on('console', m => { if (m.type() === 'error' && !REFUSED.test(m.text()) && !/clipboard|Failed to load resource|WebSocket|ERR_INTERNET_DISCONNECTED|net::|NetworkError|Load failed|status of 40[49]/i.test(m.text())) errors.push(m.text()); });
  p.on('dialog', d => void (d.type() === 'confirm' ? d.accept() : d.type() === 'alert' ? d.dismiss() : d.accept(answers.shift() ?? '')));
  return { p, context, errors, answers };
}
const nav = (p, name) => p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name, exact: true }).click();
const area = (p, name) => p.getByRole('navigation', { name: 'Teambereiche' }).getByRole('button', { name }).click();
const liveBlock = p => p.getByRole('region', { name: 'Team live' });
const section = (p, name) => p.getByRole('region', { name: 'Abschnitte' }).locator('.team-sections > li').filter({ has: p.locator('strong', { hasText: new RegExp(`^${name}`) }) });

/** Bauleitung „Philipp“ founds a team on the sample project with three sections and switches it live; others join by link. */
async function foundTeam(a) {
  await a.p.goto(BASE);
  await openSampleProject(a.p);
  await a.p.waitForURL(/#\/projekt\//);
  await nav(a.p, 'Baustelle');
  await a.p.getByRole('region', { name: 'Baustelle' }).getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
  await a.p.locator('.site-section').nth(2).waitFor();
  await nav(a.p, 'Team');
  await a.p.getByPlaceholder('Dein Name').fill('Philipp');
  await a.p.getByRole('button', { name: 'Team gründen' }).click();
  await a.p.locator('.team-me').getByText('Bauleitung', { exact: true }).waitFor();
  a.answers.push('Erster Stand');
  await a.p.getByRole('button', { name: 'Aktuellen Plan freigeben' }).click();
  await a.p.getByText('Planstand 1 gilt').waitFor();
  await liveBlock(a.p).getByLabel('Adresse des Team-Raums').fill(room.url);
  await liveBlock(a.p).getByRole('button', { name: 'Live schalten' }).click();
  await liveBlock(a.p).locator('[data-state=live]').waitFor();
  return liveBlock(a.p).getByLabel('Einladungslink').inputValue();
}
async function join(x, link, name) {
  await x.p.goto(link);
  await x.p.getByRole('heading', { name: /Team „.+“ beitreten/ }).waitFor();
  await x.p.getByRole('button', { name: 'Beitreten und Plan laden' }).click();
  await x.p.waitForURL(/\/team$/);
  await liveBlock(x.p).locator('[data-state=live]').waitFor();
  await x.p.getByPlaceholder('Ich bin neu: Name').fill(name);
  await x.p.getByRole('button', { name: 'Beitreten' }).click();
  await x.p.locator('.team-me strong', { hasText: name }).waitFor();
}
/** Days of a section in the Zeitplan (from the bar's title „Name: Tag a–b …“). */
async function scheduleDays(p, name) {
  await area(p, 'Planung');
  const bar = p.getByRole('region', { name: 'Zeitplan' }).locator('.team-gbar').filter({ hasText: new RegExp(`^${name}`) }).first();
  await bar.waitFor();
  const title = await bar.getAttribute('title');
  console.log(`# Zeitplan ${name}: ${title}`);
  const [, s, e] = title.match(/Tag ([\d.]+(?:,\d+)?)–([\d.]+(?:,\d+)?)/);
  const num = t => Number(t.replace(/\./g, '').replace(',', '.'));
  await area(p, 'Bauen');
  return { days: num(e) - num(s), title };
}

// ───────────── TEAMBAU-30 ─────────────
test('TEAMBAU-30: Mitbauer an einem Abschnitt, gleichzeitige Zuweisung als „Überholt“, Sammelauftrag verteilen, Buchung korrigieren und stornieren (drei Browser, echter Team-Raum)', async () => {
  const A = await device({ width: 1400, height: 1000 });
  const B = await device({ width: 820, height: 1180 }, { hasTouch: true });
  const C = await device({ width: 390, height: 844 }, { hasTouch: true });
  const link = await foundTeam(A);
  await join(B, link, 'Anna');
  await join(C, link, 'Ben');
  const [a, b, c] = [A.p, B.p, C.p];
  await a.getByRole('region', { name: 'Mitglieder' }).getByText('Ben').first().waitFor();
  // Anna wird Baumeisterin (darf Mitbauer festlegen); Ben bleibt Helfer.
  await a.getByRole('combobox', { name: 'Rolle von Anna' }).selectOption('meister');
  await b.locator('.team-me').getByText('Baumeister', { exact: true }).waitFor();
  const before = await scheduleDays(a, 'Fundament');

  // Bauleitung: Anna + Ben an „Fundament“; im zweiten Browser fast gleichzeitig Anna: nur Philipp.
  const openCrew = async (x, names) => {
    const s = section(x, 'Fundament');
    await s.getByRole('button', { name: 'Mitbauer …' }).click();
    const ed = s.getByRole('group', { name: /Mitbauer für/ });
    for (const n of names) await ed.getByLabel(n).check();
    return ed.getByRole('button', { name: 'Speichern' }).elementHandle();
  };
  const saveA = await openCrew(a, ['Anna', 'Ben']), saveB = await openCrew(b, ['Philipp']);
  await Promise.all([saveA.evaluate(e => e.click()), saveB.evaluate(e => e.click())]);
  // Der spätere der beiden wird nicht still übernommen: oben „Überholt …“ mit „Trotzdem so übernehmen“.
  const issue = x => x.locator('.team-issues li.bad').filter({ hasText: /Überholt: .*Fundament.* geändert/ });
  for (const x of [a, b, c]) { await x.locator('.team-issues').evaluate(d => { d.open = true; }).catch(() => {}); await issue(x).first().waitFor(); }
  const text = await issue(a).first().innerText();
  const aLost = /von Anna geändert/.test(text);
  console.log(`# TEAMBAU-30 ${ENGINE}: gleichzeitig – ${aLost ? 'Philipp' : 'Anna'} war später: ${text.split('\n')[0]}`);
  const loser = aLost ? a : b, other = aLost ? b : a;
  await issue(loser).getByRole('button', { name: 'Trotzdem so übernehmen' }).waitFor();
  assert.equal(await issue(c).getByRole('button', { name: 'Trotzdem so übernehmen' }).count(), 0, 'der Helfer darf das nicht');
  if (aLost) await issue(a).getByRole('button', { name: 'Trotzdem so übernehmen' }).click();
  else await issue(b).getByRole('button', { name: 'Gesehen (ausblenden)' }).click();
  void other;
  // Abschnitt zeigt Verantwortliche + Mitbauer bei allen; beide haben ihn unter „Meine Aufgaben“.
  for (const x of [a, b, c]) {
    await section(x, 'Fundament').locator('.team-owner', { hasText: 'Anna' }).waitFor();
    await section(x, 'Fundament').getByLabel('Mitbauer').filter({ hasText: 'Ben' }).waitFor();
  }
  await b.getByRole('region', { name: 'Meine Aufgaben' }).getByText(/Fundament/).first().waitFor();
  await c.getByRole('region', { name: 'Meine Aufgaben' }).getByText('Mitbauer · verantwortlich Anna').waitFor();
  // „Aussteigen“ und „Mitbauen“ gehen ohne Bauleitung (Ben ist Helfer).
  await c.getByRole('region', { name: 'Meine Aufgaben' }).getByRole('button', { name: 'Aussteigen' }).click();
  await assert.rejects(section(a, 'Fundament').getByLabel('Mitbauer').filter({ hasText: 'Ben' }).waitFor({ state: 'detached', timeout: 15_000 }).then(() => { throw new Error('weg'); }), /weg/);
  await section(c, 'Fundament').getByRole('button', { name: 'Mitbauen' }).click();
  await section(a, 'Fundament').getByLabel('Mitbauer').filter({ hasText: 'Ben' }).waitFor();
  // Im Zeitplan geht der Abschnitt mit Mitbauer schneller.
  const after = await scheduleDays(a, 'Fundament');
  assert.match(after.title, /mit Ben/);
  assert.ok(after.days < before.days, `Fundament mit Mitbauer schneller (${before.days} → ${after.days} Tage)`);

  // Sammelauftrag auf zwei verteilen: jeder sieht seinen Anteil.
  const gather = a.getByRole('region', { name: 'Beiträge und Sammeln' });
  await gather.getByText('Sammelauftrag auf mehrere verteilen').click();
  await gather.getByLabel('Item zum Verteilen').fill('oak_log');
  await gather.getByLabel('Gesamtmenge').fill('101');
  await gather.locator('.team-split').getByLabel('Anna', { exact: true }).check();
  await gather.locator('.team-split').getByLabel('Ben', { exact: true }).check();
  await gather.getByLabel('Anteil Ben').fill('60');
  await gather.getByRole('button', { name: 'An 2 verteilen' }).click();
  for (const x of [a, b, c]) await x.getByRole('region', { name: 'Beiträge und Sammeln' }).getByText('Anna 51 · Ben 60 · verteilt von Philipp').waitFor();
  await b.getByRole('region', { name: 'Meine Aufgaben' }).getByText('von Philipp zugeteilt').waitFor();
  await c.getByRole('region', { name: 'Meine Aufgaben' }).getByText('von Philipp zugeteilt').waitFor();
  await c.getByRole('region', { name: 'Meine Aufgaben' }).getByText(/60 × oak_log|oak_log.*60/).first().waitFor();

  // Ben meldet eine Lieferung, korrigiert sie (V2) und storniert sie; Lieferungen rechnen bei der Bauleitung neu.
  const gc = c.getByRole('region', { name: 'Beiträge und Sammeln' });
  await gc.getByLabel('Geliefert: Item').fill('stone');
  await gc.getByLabel('Menge').first().fill('64');
  await gc.getByRole('button', { name: 'Beitrag melden' }).click();
  await gather.getByText('64 × stone').waitFor();
  C.answers.push('32 stone', 'verzählt');
  await gc.locator('.team-bookings').getByRole('button', { name: 'Korrigieren' }).click();
  await gc.locator('.team-bookings').getByText(/V2 korrigiert: verzählt/).waitFor();
  await gather.getByText('32 × stone').waitFor();
  await gc.locator('.team-bookings').getByRole('button', { name: 'Stornieren' }).click();
  await gc.locator('.team-bookings').getByText('storniert', { exact: true }).waitFor();
  await gather.getByText('32 × stone').waitFor({ state: 'detached' });
  // Rechte: der Helfer sieht keine Mitbauer-Auswahl.
  assert.equal(await c.getByRole('region', { name: 'Abschnitte' }).getByRole('button', { name: 'Mitbauer …' }).count(), 0);
  for (const x of [A, B, C]) assert.deepEqual(x.errors, []);
  for (const x of [A, B, C]) await x.context.close();
});

// ───────────── TEAMBAU-31 ─────────────
test('TEAMBAU-31: Team-Raum sichern, Notiz des Mitspielers nach dem Wiederherstellen wieder bei allen, löschen und mit altem Link zurückholen, automatische Sicherungen (zwei Browser)', async () => {
  const A = await device({ width: 1400, height: 1000 }, { acceptDownloads: true });
  const B = await device({ width: 820, height: 1180 }, { hasTouch: true, acceptDownloads: true });
  const downloads = [];
  for (const x of [A, B]) x.p.on('download', d => downloads.push(d.suggestedFilename()));
  const link = await foundTeam(A);
  await join(B, link, 'Anna');
  const [a, b] = [A.p, B.p];
  const panel = liveBlock(a).getByTestId('team-backup');
  await panel.locator('summary').first().click();
  // Zustand: Dienst erreichbar, Schritte, letzte Sicherung, Aufbewahrung.
  await panel.getByTestId('backup-service').filter({ hasText: /^erreichbar$/ }).waitFor();
  await panel.getByText(/Schritte/).first().waitFor();
  const status = await panel.innerText();
  assert.match(status, /Schritte/);
  assert.match(status, /aufbewahrt|Aufbewahrung|Tage/);
  // „Jetzt sichern“ geht höchstens einmal je Minute (auch nach einer automatischen Sicherung); die automatische kommt hier erst nach 20 s.
  await panel.getByRole('button', { name: 'Jetzt sichern' }).click();
  await a.getByText(/Team-Raum gesichert \(\d+ Schritte/).first().waitFor();
  await panel.getByRole('list', { name: 'Sicherungen' }).getByText('von Hand').waitFor();

  // Mitspielerin schreibt danach eine Notiz; Bauleitung stellt die Sicherung wieder her.
  const notes = x => x.getByRole('region', { name: 'Notizen am Bau' });
  await notes(b).getByPlaceholder(/Notiz/).fill('Nach der Sicherung geschrieben');
  await notes(b).getByRole('button', { name: 'Schreiben' }).click();
  await notes(a).getByText('Nach der Sicherung geschrieben').waitFor();
  await panel.getByRole('list', { name: 'Sicherungen' }).locator('li').filter({ hasText: 'von Hand' }).getByRole('button', { name: 'Wiederherstellen' }).click();
  await a.getByText(/Team-Raum wiederhergestellt/).first().waitFor();
  // Die Planer reichen die Notiz selbst nach: nach Sekunden wieder bei allen und im Raum.
  for (const x of [a, b]) await liveBlock(x).locator('[data-state=live]').waitFor({ timeout: 30_000 });
  for (const x of [a, b]) await notes(x).getByText('Nach der Sicherung geschrieben').waitFor({ timeout: 30_000 });
  const ids = new URLSearchParams(link.split('?')[1]);
  let inRoom = false;
  for (let i = 0; i < 60 && !inRoom; i++) {
    const page = await (await fetch(`${room.url}/v1/rooms/${ids.get('id')}/events?after=`, { headers: { Authorization: `Bearer ${ids.get('k')}` } })).json();
    inRoom = page.events?.some(e => e.kind === 'note.add' && e.text === 'Nach der Sicherung geschrieben');
    if (!inRoom) await a.waitForTimeout(500);
  }
  assert.ok(inRoom, 'die Notiz steht nach der Wiederherstellung wieder im Team-Raum');
  await panel.getByRole('button', { name: 'Aktualisieren' }).click();
  await panel.getByRole('list', { name: 'Sicherungen' }).getByText('vor einer Wiederherstellung').waitFor();

  // Raum löschen: die Mitspielerin sieht die Meldung; „vor dem Löschen“ zurückholen, ihr alter Link gilt wieder.
  await panel.locator('details.team-emergency > summary').click();
  await panel.getByRole('button', { name: 'Team-Raum löschen' }).click();
  await a.getByText(/Team-Raum gelöscht\. Zurückholen geht bis/).first().waitFor();
  await liveBlock(b).getByText(/Der Team-Raum wurde gelöscht/).first().waitFor({ timeout: 30_000 });
  await panel.getByRole('list', { name: 'Sicherungen' }).locator('li').filter({ hasText: 'vor dem Löschen' }).getByRole('button', { name: 'Wiederherstellen' }).click();
  await a.getByText(/Die Einladungslinks von damals gelten wieder/).first().waitFor();
  await liveBlock(a).locator('[data-state=live]').waitFor({ timeout: 15_000 }); // reconnects at once, not after a minute
  await b.reload();
  await liveBlock(b).locator('[data-state=live]').waitFor({ timeout: 30_000 });
  await notes(b).getByText('Nach der Sicherung geschrieben').waitFor();
  const fresh = await device({ width: 390, height: 844 }, { hasTouch: true });
  await fresh.p.goto(link);
  await fresh.p.getByRole('heading', { name: /Team „.+“ beitreten/ }).waitFor();
  await fresh.context.close();

  // „Am nächsten Tag“: die automatische Sicherung (derselbe Alarm, hier nach Sekunden) steht in der Liste.
  await notes(b).getByPlaceholder(/Notiz/).fill('Später am Tag');
  await notes(b).getByRole('button', { name: 'Schreiben' }).click();
  await notes(a).getByText('Später am Tag').waitFor();
  const autos = panel.getByRole('list', { name: 'Sicherungen' }).getByText('automatisch');
  for (let i = 0; i < 70 && !(await autos.count()); i++) { await a.waitForTimeout(1000); await panel.getByRole('button', { name: 'Aktualisieren' }).click(); }
  assert.ok(await autos.count() >= 1, 'automatische Sicherung in der Liste');
  assert.deepEqual(downloads, [], 'keine Datei wird heruntergeladen');
  for (const x of [A, B]) assert.deepEqual(x.errors, []);
  for (const x of [A, B]) await x.context.close();
});

// ───────────── KARTE-10 ─────────────
test('KARTE-10: Weltplan im Team auf zwei Geräten ohne Datei – Einträge, Sperre, gleichzeitiges Umbenennen, Server-Webkarte', async () => {
  const A = await device({ width: 1400, height: 1000 });
  const B = await device({ width: 820, height: 1180 }, { hasTouch: true });
  const link = await foundTeam(A);
  await join(B, link, 'Anna');
  const [a, b] = [A.p, B.p];
  const openMap = async x => {
    await x.goto(`${BASE}#/karte`);
    await x.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 60_000 });
    await x.getByRole('region', { name: 'Weltplan im Team' }).getByText(/live über den Team-Raum/).waitFor({ timeout: 30_000 });
  };
  await openMap(a); await openMap(b);
  const share = x => x.getByRole('region', { name: 'Weltplan im Team' });
  const canvasAt = async (x, wx, wz) => {
    const canvas = x.locator('.overview-canvas');
    await canvas.evaluate(el => el.scrollIntoView({ block: 'center' }));
    const box = await canvas.boundingBox(), scale = Number(await canvas.getAttribute('data-scale'));
    const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
    return { x: box.x + box.width / 2 + (wx + 0.5 - cx) * scale, y: box.y + box.height / 2 + (wz + 0.5 - cz) * scale, cx, cz };
  };
  const rows = x => x.locator('.builder-objects .plan-row b');
  const rowNames = async x => (await rows(x).evaluateAll(els => els.map(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()))).sort();
  const sync = async x => share(x).getByRole('button', { name: 'Jetzt abgleichen' }).click();

  // PC: Bauplatz anlegen und sperren. iPad: Punkt setzen.
  const tools = x => x.getByRole('group', { name: 'Planungswerkzeug' });
  const { cx, cz } = await canvasAt(a, 0, 0);
  await tools(a).getByRole('button', { name: 'Bauplatz' }).click();
  const s1 = await canvasAt(a, cx - 10, cz - 6), s2 = await canvasAt(a, cx - 2, cz + 2);
  await a.mouse.move(s1.x, s1.y); await a.mouse.down(); await a.mouse.move(s2.x, s2.y, { steps: 6 }); await a.mouse.up();
  const editorA = a.locator('.plan-editor');
  await editorA.getByRole('heading', { name: 'Bauplatz: Bauplatz 1' }).waitFor();
  await a.getByRole('toolbar', { name: 'Auswahl' }).getByRole('button', { name: '🔒 Sperren' }).click();
  await a.locator('.builder-objects .plan-row').filter({ hasText: 'Bauplatz 1' }).locator('.plan-lock').waitFor();
  await tools(b).getByRole('button', { name: 'Punkt' }).tap();
  const q = await canvasAt(b, cx + 6, cz + 6);
  await b.touchscreen.tap(q.x, q.y);
  await b.locator('.plan-editor').getByRole('heading', { name: /: Punkt 1$/ }).waitFor();
  // Nach wenigen Sekunden hat jedes Gerät die Einträge des anderen; die Sperre gilt auch auf dem iPad.
  const t0 = Date.now();
  await a.waitForFunction(() => [...document.querySelectorAll('.builder-objects .plan-row b')].some(b => /Punkt 1/.test(b.textContent ?? '')), null, { timeout: 30_000 });
  await b.waitForFunction(() => [...document.querySelectorAll('.builder-objects .plan-row b')].some(b => /Bauplatz 1/.test(b.textContent ?? '')), null, { timeout: 30_000 });
  const seconds = Math.round((Date.now() - t0) / 1000);
  await sync(a);
  await share(a).getByText(/zuletzt von (Philipp|Anna) ·/).waitFor({ timeout: 30_000 }); // Name statt Kennung bld_…
  assert.deepEqual(await rowNames(a), await rowNames(b));
  const lockedB = b.locator('.builder-objects .plan-row').filter({ hasText: 'Bauplatz 1' });
  await lockedB.locator('.plan-lock').waitFor({ timeout: 30_000 });
  assert.equal(await b.getByRole('button', { name: /„Bauplatz 1“ löschen/ }).isDisabled(), true, 'Sperre gilt auch auf dem iPad');

  // Gleichzeitig denselben Eintrag umbenennen: der zuerst gespeicherte Name gilt, mit Hinweis.
  const rename = async (x, name) => {
    await x.locator('.builder-objects .plan-row').filter({ hasText: 'Punkt 1' }).locator('b').first().click();
    const field = x.locator('.plan-editor').getByLabel('Name', { exact: true });
    await field.fill(name);
    return field;
  };
  // Gleichzeitig heißt: das iPad hat den Stand des PCs noch nicht, als es speichert (kurz ohne Netz, wie im Funkloch).
  const fa = await rename(a, 'Treffpunkt PC'), fb = await rename(b, 'Treffpunkt iPad');
  await B.context.setOffline(true);
  await fa.press('Enter');
  await sync(a);
  await share(a).getByText(/live über den Team-Raum · Stand \d+ · zuletzt von Philipp/).waitFor({ timeout: 30_000 });
  await fb.press('Enter');
  await B.context.setOffline(false);
  await sync(b);
  await share(b).getByText(/gleichzeitig geändert, der Stand im Team gilt/).waitFor({ timeout: 30_000 });
  await sync(a);
  await a.waitForFunction(() => [...document.querySelectorAll('.builder-objects .plan-row b')].some(b => /Treffpunkt PC/.test(b.textContent ?? '')));
  await b.waitForFunction(() => [...document.querySelectorAll('.builder-objects .plan-row b')].some(b => /Treffpunkt PC/.test(b.textContent ?? '')), null, { timeout: 30_000 });
  assert.ok(!(await rowNames(b)).some(n => /iPad/.test(n)), 'der später gespeicherte Name gilt nicht');

  // Am PC eine Server-Webkarte speichern: sie erscheint auch auf dem iPad.
  const liveMap = x => x.locator('details.live-panel');
  await liveMap(a).locator('> summary').click();
  await liveMap(a).getByLabel('Link aus eurer Server-Karte').fill('https://karte.lmnt-gaming.net/#world:120:64:-40:200:0:0:0:0:perspective');
  await liveMap(a).getByRole('button', { name: 'Übernehmen' }).click();
  await liveMap(a).locator('> summary').getByText(/karte\.lmnt-gaming\.net.*verknüpft/).waitFor();
  await liveMap(a).getByRole('button', { name: 'Aktuelle Karte speichern' }).click();
  await liveMap(a).getByRole('region', { name: 'Gespeicherte Karten' }).locator('li').first().waitFor();
  await sync(a);
  await sync(b);
  await liveMap(b).locator('> summary').getByText(/karte\.lmnt-gaming\.net.*verknüpft/).waitFor({ timeout: 30_000 });
  await liveMap(b).locator('> summary').click();
  await liveMap(b).getByRole('region', { name: 'Gespeicherte Karten' }).locator('li').first().waitFor({ timeout: 30_000 });
  console.log(`# KARTE-10 ${ENGINE}: Einträge nach ${seconds} s auf beiden Geräten, Konflikt mit Hinweis, Webkarte geteilt`);
  for (const x of [A, B]) assert.deepEqual(x.errors, []);
  for (const x of [A, B]) await x.context.close();
});
