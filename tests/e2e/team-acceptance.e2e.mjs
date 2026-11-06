// Automatische Abnahme „Team live mit zwei Geräten“ (Block 4c, 06.11.2026): drei Browser – Bauleitung am Rechner,
// Helferin am Handy, Helfer am Tablet – gegen den echten Team-Raum unter `wrangler dev` (services/team-room, Durable
// Object mit SQLite, kein Nachbau). Dazu ein Mod-Client, wie mod-core RoomClient spricht, und das Server-Plugin mit
// dem Serverschlüssel. Deckt TEAMBAU-01, -03, -05, -21, -24, -25, -27, -28 und -29 ab (COOP-01/06/07/09/10/11,
// TEAM-02); was weiter nur im echten Spiel geht, steht in apps/web/src/testing/autochecks.ts unter „remaining“.
// Run after `npm run build`: `node --test tests/e2e/team-acceptance.e2e.mjs` (lädt wrangler über npx beim ersten Lauf).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';
import { startTeamRoomDev, modClient } from './teamRoomDev.mjs';
import { teamEvent } from '../../dist/domain/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4321, ROOM_PORT = 8791, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, room;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  room = await startTeamRoomDev(ROOM_PORT);
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); await room?.close(); server?.kill(); });

/** Per device: `cut` drops every WebSocket message both ways without closing – a closed laptop lid, not Wi-Fi off. */
async function device(viewport, opts = {}) {
  const context = await browser.newContext({ viewport, ...opts });
  const link = { cut: false };
  await context.routeWebSocket(/\/v1\/rooms\/[^/]+\/live$/, ws => {
    const srv = ws.connectToServer();
    ws.onMessage(m => { if (!link.cut) srv.send(m); });
    srv.onMessage(m => { if (!link.cut) ws.send(m); });
  });
  const p = await context.newPage();
  p.setDefaultTimeout(20_000);
  const errors = [], answers = [];
  p.on('pageerror', e => errors.push(e.message));
  // Offline phases make the browser log failed fetches and socket errors; those are expected.
  p.on('console', m => { if (m.type() === 'error' && !/clipboard|Failed to load resource|WebSocket|ERR_INTERNET_DISCONNECTED|net::/i.test(m.text())) errors.push(m.text()); });
  p.on('dialog', d => void d.accept(answers.shift() ?? ''));
  return { p, context, errors, answers, link };
}
const nav = (p, name) => p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name }).click();
const area = (p, name) => p.getByRole('navigation', { name: 'Teambereiche' }).getByRole('button', { name }).click();
const section = (p, name) => p.getByRole('region', { name: 'Abschnitte' }).locator('.team-sections > li').filter({ has: p.locator('strong', { hasText: new RegExp(`^${name}`) }) });
const liveBlock = p => p.getByRole('region', { name: 'Team live' });
const ownerOf = async (p, name) => (await section(p, name).locator('.team-owner').allInnerTexts()).join(',').trim();
const eventCount = async p => Number((await p.locator('.team-head small').first().innerText()).match(/([\d.]+) Ereignisse/)[1].replace(/\./g, ''));
/** All events in the room, page by page. */
async function roomEvents(id, key) {
  let all = [], cursor = '', page;
  do { page = await (await fetch(`${room.url}/v1/rooms/${id}/events?after=${cursor}`, { headers: { Authorization: `Bearer ${key}` } })).json(); all = all.concat(page.events); cursor = page.cursor; } while (page.more);
  return all;
}
const post = async (id, key, batch, events) => (await fetch(`${room.url}/v1/rooms/${id}/events`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ batch, events }) })).json();
/** Waits until all pages hold the same number of events as the room. */
async function sameLog(pages, id, key) {
  let counts, total;
  for (let i = 0; i < 60; i++) {
    total = (await roomEvents(id, key)).length;
    counts = await Promise.all(pages.map(eventCount));
    if (counts.every(c => c === total)) return total;
    await new Promise(r => setTimeout(r, 250));
  }
  assert.fail(`Protokoll ungleich: Raum ${total}, Browser ${counts.join('/')}`);
}

test('Team live mit drei Geräten gegen den echten Team-Raum: einladen, gleichzeitig übernehmen, offline, Mod, Server, verdichten', async () => {
  const A = await device({ width: 1400, height: 1000 });
  const B = await device({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  const C = await device({ width: 820, height: 1180 }, { hasTouch: true });
  const a = A.p, b = B.p, c = C.p;

  // ---- TEAMBAU-01: Bauleitung gründet das Team und gibt Planstand 1 frei.
  await a.goto(BASE);
  await openSampleProject(a);
  await a.waitForURL(/#\/projekt\//);
  await nav(a, 'Baustelle');
  await a.getByRole('region', { name: 'Baustelle' }).getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
  await a.locator('.site-section').nth(2).waitFor();
  await nav(a, 'Team');
  await a.getByPlaceholder('Dein Name').fill('Philipp');
  await a.getByLabel(/Minecraft-Name/).fill('Freadeax');
  await a.getByRole('button', { name: 'Team gründen' }).click();
  await a.locator('.team-me').getByText('Bauleitung', { exact: true }).waitFor();
  A.answers.push('Erster Stand');
  await a.getByRole('button', { name: 'Aktuellen Plan freigeben' }).click();
  await a.getByText('Planstand 1 gilt').waitFor();
  await nav(a, 'Export');
  await a.getByText(/Teamfreigabe: Erster Stand/).first().waitFor();
  await nav(a, 'Team');

  // ---- TEAMBAU-25: live schalten gegen den lokalen Raum, Einladungslink.
  await liveBlock(a).getByLabel('Adresse des Team-Raums').fill(room.url);
  await liveBlock(a).getByRole('button', { name: 'Live schalten' }).click();
  await liveBlock(a).locator('[data-state=live]').waitFor();
  const link = await liveBlock(a).getByLabel('Einladungslink').inputValue();
  const q = new URLSearchParams(link.split('?')[1]), roomId = q.get('id'), memberKey = q.get('k');
  assert.ok(roomId && memberKey, link);

  // Helferin Anna am Handy, Helfer Ben am Tablet: nur der Link, keine Datei.
  for (const [x, name] of [[b, 'Anna'], [c, 'Ben']]) {
    await x.goto(link);
    await x.getByRole('heading', { name: /Team „.+“ beitreten/ }).waitFor();
    await x.getByRole('button', { name: 'Beitreten und Plan laden' }).click();
    await x.waitForURL(/\/team$/);
    await x.getByText('Planstand 1 gilt').waitFor();
    await liveBlock(x).locator('[data-state=live]').waitFor();
    await x.getByPlaceholder('Ich bin neu: Name').fill(name);
    await x.getByRole('button', { name: 'Beitreten' }).click();
    await x.locator('.team-me').getByText('Helfer', { exact: true }).waitFor();
    assert.equal(await x.getByRole('region', { name: 'Abschnitte' }).locator('.team-sections > li').count(), 3, `${name} sieht alle Abschnitte`);
  }
  for (const n of ['Anna', 'Ben']) await liveBlock(a).getByRole('list', { name: 'Gerade da' }).getByText(n).first().waitFor();
  await liveBlock(b).getByRole('list', { name: 'Gerade da' }).getByText('Philipp').first().waitFor();
  await a.getByRole('region', { name: 'Mitglieder' }).getByText('Ben').first().waitFor();

  // ---- TEAMBAU-29 / TEAMBAU-03: Anna und Ben nehmen im selben Moment „Rohbau“.
  // Both buttons are found first and clicked in the same instant (a DOM click each, no waiting in between),
  // so neither device has seen the other's step yet.
  const takeB = await section(b, 'Rohbau').getByRole('button', { name: 'Übernehmen' }).elementHandle();
  const takeC = await section(c, 'Rohbau').getByRole('button', { name: 'Übernehmen' }).elementHandle();
  await Promise.all([takeB.evaluate(e => e.click()), takeC.evaluate(e => e.click())]);
  let owner = '';
  for (let i = 0; i < 80; i++) {
    const owners = await Promise.all([a, b, c].map(x => ownerOf(x, 'Rohbau')));
    if (owners.every(o => o && o === owners[0]) && !owners[0].includes(',')) { owner = owners[0]; break; }
    if (i % 10 === 9) console.log('# owners', JSON.stringify(owners));
    await a.waitForTimeout(250);
  }
  if (!owner) console.log('# room', JSON.stringify((await roomEvents(roomId, memberKey)).map(e => [e.kind, e.by, e.section])));
  assert.ok(owner === 'Anna' || owner === 'Ben', `ein Inhaber bei allen (${owner})`);
  const [winner, loser, loserName] = owner === 'Anna' ? [b, c, 'Ben'] : [c, b, 'Anna'];
  await loser.getByRole('region', { name: 'Neues im Team' }).getByText(new RegExp(`Nicht übernommen, weil ${owner} schneller war`)).waitFor();
  console.log(`# gleichzeitig: ${owner} bekam Rohbau, ${loserName} sah den Hinweis`);
  // Team-Rückgängig beim Gewinner: der Abschnitt ist bei allen wieder frei.
  const undo = winner.getByTestId('team-undo');
  await undo.locator('summary').click();
  await undo.locator('li', { hasText: /Rohbau/ }).getByRole('button', { name: 'Zurücknehmen' }).click();
  for (const x of [a, b, c]) await section(x, 'Rohbau').getByRole('button', { name: 'Übernehmen' }).waitFor();
  await sameLog([a, b, c], roomId, memberKey);

  const joined = await roomEvents(roomId, memberKey);
  const idOf = name => joined.find(e => e.kind === 'member.join' && e.name === name).member;
  const philipp = idOf('Philipp'), anna = idOf('Anna'), ben = idOf('Ben');
  const header = await (await fetch(`${room.url}/v1/rooms/${roomId}/header`, { headers: { Authorization: `Bearer ${memberKey}` } })).json();
  const sectionId = name => header.sections.find(s => s.name.startsWith(name)).id;

  // ---- TEAMBAU-03: Anna meldet Fundament fertig (Handy), Bauleitung bestätigt; Ben bekommt Nacharbeit.
  await section(b, 'Fundament').getByRole('button', { name: 'Übernehmen' }).click();
  await section(c, 'Rohbau').getByRole('button', { name: 'Übernehmen' }).click();
  B.answers.push('Fundament steht');
  await b.getByRole('region', { name: 'Meine Aufgaben' }).locator('li', { hasText: 'Fundament' }).getByRole('button', { name: 'Fertig melden' }).click();
  C.answers.push('');
  await c.getByRole('region', { name: 'Meine Aufgaben' }).locator('li', { hasText: 'Rohbau' }).getByRole('button', { name: 'Fertig melden' }).click();
  await section(a, 'Fundament').getByText('fertig gemeldet').waitFor();
  await section(a, 'Fundament').locator('.team-owner', { hasText: 'Anna' }).waitFor();
  await section(a, 'Rohbau').getByText('fertig gemeldet').waitFor();
  await section(a, 'Fundament').getByRole('button', { name: '✓ Bestätigen' }).click();
  A.answers.push('Ecke links fehlt');
  await section(a, 'Rohbau').getByRole('button', { name: 'Nacharbeit' }).click();
  await section(b, 'Fundament').getByText('bestätigt').waitFor();
  await section(c, 'Rohbau').getByText('Nacharbeit').first().waitFor();
  await area(a, 'Fortschritt');
  const board = a.getByRole('region', { name: 'Gesamtfortschritt' });
  await board.getByText('Anna').first().waitFor();
  await board.getByText('Ben').first().waitFor();
  await a.getByRole('region', { name: 'Achtung' }).waitFor();
  await area(a, 'Bauen');

  // ---- TEAMBAU-05: Beiträge, Sammelauftrag und Notiz mit @Name vom Handy, Statustext bei der Bauleitung.
  const contrib = b.getByRole('region', { name: 'Beiträge und Sammeln' });
  await contrib.getByLabel('Gebaute Blöcke').fill('320');
  await contrib.getByLabel('Geliefert: Item').fill('stone');
  await contrib.getByLabel('Menge').first().fill('128');
  await contrib.getByRole('button', { name: 'Beitrag melden' }).click();
  await contrib.getByPlaceholder('Ich sammle: Item').fill('oak_log');
  await contrib.getByPlaceholder('Menge').last().fill('64');
  await contrib.getByRole('button', { name: 'Übernehmen' }).click();
  const notesB = b.getByRole('region', { name: 'Notizen am Bau' });
  await notesB.getByPlaceholder(/Notiz/).fill('Wie breit wird das Tor, @Philipp?');
  await notesB.getByRole('button', { name: 'Schreiben' }).click();
  const contribA = a.getByRole('region', { name: 'Beiträge und Sammeln' });
  await contribA.getByText('128 × stone').waitFor();
  await contribA.getByRole('list').getByText('64 × oak_log').waitFor();
  await a.getByRole('region', { name: 'Mitglieder' }).getByText('320').first().waitFor();
  await a.getByRole('region', { name: 'Meine Aufgaben' }).getByText(/Wie breit wird das Tor/).waitFor();
  await a.locator('details.team-exchange').evaluate(d => { d.open = true; });
  await a.getByRole('button', { name: 'Statustext für Discord' }).click();
  const status = await a.locator('.team-shown textarea').inputValue();
  assert.match(status, /Fundament – bestätigt · Anna/);
  assert.match(status, /oak_log/);
  assert.match(status, /Wie breit wird das Tor/);

  // ---- TEAMBAU-21: Bauleitung teilt „Dach“ in zwei Pakete und verteilt sie; die Zuweisung erreicht beide Helfer.
  await area(a, 'Planung');
  const packages = a.getByRole('region', { name: 'Arbeitspakete' });
  await packages.getByRole('button', { name: /^Dach/ }).click();
  await packages.getByLabel('Anzahl Arbeitspakete').fill('2');
  await packages.getByRole('button', { name: 'In 2 Pakete teilen' }).click();
  await packages.getByRole('button', { name: /Dach.* · Teil 1\/2/ }).waitFor();
  await a.getByRole('alert').getByText(/Erst mit dem neuen Planstand kennen die anderen die Pakete/).waitFor();
  await a.getByRole('alert').getByRole('button', { name: 'OK' }).click();
  const assign = a.getByRole('region', { name: 'Zuteilung' });
  await assign.getByRole('button', { name: /Zuweisungen übernehmen/ }).click();
  await assign.getByText(/Keine freien Abschnitte/).waitFor();
  await a.getByRole('region', { name: 'Zeitplan' }).getByText(/Fertig in/).waitFor();
  await area(a, 'Bauen');
  // In a live team the split reaches the others with the next release – no package file.
  A.answers.push('Dach in zwei Paketen');
  await a.getByRole('button', { name: 'Aktuellen Plan freigeben' }).click();
  await a.getByText('Planstand 2 gilt').waitFor();
  for (const x of [b, c]) {
    await x.getByText('Planstand 2 gilt').waitFor();
    await liveBlock(x).getByRole('button', { name: 'Planstand übernehmen' }).click();
    await x.getByText(/Planstand 2 aus dem Team-Raum übernommen/).first().waitFor();
    await section(x, 'Dach und Abschluss · Teil 1/2').locator('.team-owner', { hasText: 'Anna' }).waitFor();
    await section(x, 'Dach und Abschluss · Teil 2/2').locator('.team-owner', { hasText: 'Philipp' }).waitFor();
    assert.equal(await x.getByText('entfernter Abschnitt').count(), 0, 'keine unbekannten Abschnitte nach dem neuen Planstand');
  }
  await b.getByRole('region', { name: 'Meine Aufgaben' }).getByText('Dach und Abschluss · Teil 1/2').waitFor();
  const rh = await (await fetch(`${room.url}/v1/rooms/${roomId}/header`, { headers: { Authorization: `Bearer ${memberKey}` } })).json();
  assert.equal(rh.sections.length, 4, 'Server-Plugin bekommt die Pakete als Abschnitte');


  // ---- TEAMBAU-24: Anna bietet ihr Paket Ben an (Handy → Tablet), Ben nimmt an, Ben trägt Abwesenheit ein.
  await area(b, 'Rechte & Übergabe');
  const handB = b.getByRole('region', { name: 'Übergabe' });
  B.answers.push('Schaffst du das?');
  await handB.getByRole('combobox', { name: /übergeben an/ }).first().selectOption({ label: 'Ben' });
  await handB.getByText('angeboten an Ben').waitFor();
  await section(a, 'Dach und Abschluss · Teil 1/2').locator('.team-owner', { hasText: 'Anna' }).waitFor();
  await area(c, 'Rechte & Übergabe');
  const handC = c.getByRole('region', { name: 'Übergabe' });
  await handC.getByText('Für dich angeboten').waitFor();
  await handC.getByRole('button', { name: 'Annehmen' }).click();
  await section(a, 'Dach und Abschluss · Teil 1/2').locator('.team-owner', { hasText: 'Ben' }).waitFor();
  const away = c.getByRole('region', { name: 'Abwesenheit' });
  await away.getByLabel('abwesend bis').fill('2099-12-31');
  await away.getByPlaceholder(/Grund/).fill('Urlaub');
  await away.getByRole('button', { name: 'Abwesend eintragen' }).click();
  await area(a, 'Fortschritt');
  await a.getByRole('region', { name: 'Achtung' }).getByText(/Ben ist abwesend bis 2099-12-31/).first().waitFor();
  await area(a, 'Rechte & Übergabe');
  await a.getByRole('region', { name: 'Bauleitung übergeben' }).waitFor();
  for (const x of [a, b, c]) await area(x, 'Bauen');

  // ---- TEAMBAU-25: Meldung, während die Bauleitung in einem anderen Reiter ist.
  await nav(a, 'Baustelle');
  await c.getByRole('region', { name: 'Notizen am Bau' }).getByPlaceholder(/Notiz/).fill('Gerüst steht am Turm');
  await c.getByRole('region', { name: 'Notizen am Bau' }).getByRole('button', { name: 'Schreiben' }).click();
  await a.getByRole('region', { name: 'Neues im Team' }).getByText(/Ben/).first().waitFor();
  await a.locator('.project-head [data-team-live=live]').waitFor();
  await nav(a, 'Team');

  // Anna offline (WLAN aus): Notiz schreiben, „offline · 1 warten“, wieder online – die Notiz kommt nach.
  await B.context.setOffline(true);
  await liveBlock(b).locator('[data-state=offline]').waitFor({ timeout: 5_000 });
  await b.getByRole('region', { name: 'Notizen am Bau' }).getByPlaceholder(/Notiz/).fill('Offline geschrieben');
  await b.getByRole('region', { name: 'Notizen am Bau' }).getByRole('button', { name: 'Schreiben' }).click();
  await liveBlock(b).getByText(/offline · 1 warten/).waitFor();
  await B.context.setOffline(false);
  await liveBlock(b).locator('[data-state=live]').waitFor({ timeout: 90_000 });
  await a.getByRole('region', { name: 'Notizen am Bau' }).getByText('Offline geschrieben').waitFor();
  await c.getByRole('region', { name: 'Notizen am Bau' }).getByText('Offline geschrieben').waitFor();
  // Nach dem Neuladen nichts doppelt.
  await b.reload();
  await liveBlock(b).locator('[data-state=live]').waitFor();
  await sameLog([a, b, c], roomId, memberKey);
  assert.equal(await b.getByRole('region', { name: 'Notizen am Bau' }).getByText('Offline geschrieben').count(), 1, 'Notiz einmal');


  // ---- TEAMBAU-27: Annas Mod im Spiel, Server ohne Plugin – Baustand und Kisteninhalt „laut Spiel … ungeprüft“.
  const fundament = sectionId('Fundament');
  const chest = teamEvent(philipp, { kind: 'store.chest', chest: 'kiste_team1', name: 'Teamkiste', pos: [10, 64, 20], dimension: 'minecraft:overworld' }, new Date().toISOString());
  assert.deepEqual((await post(roomId, memberKey, `b_${chest.id}`, [chest])).accepted, [chest.id], 'Bauleitung markiert die Teamkiste');
  const mod = await modClient(room.url, roomId, memberKey, { member: anna, player: 'Anna_MC', pos: { x: 12, y: 64, z: -3, dim: 'minecraft:overworld' } });
  await liveBlock(a).getByRole('list', { name: 'Gerade da' }).getByText(/Anna_MC/).first().waitFor();
  const seen = teamEvent(anna, { kind: 'section.seen', section: fundament, placed: 72, total: 100, missing: [{ item: 'minecraft:stone', count: 28 }] }, new Date().toISOString());
  const storeSeen = teamEvent(anna, { kind: 'store.seen', chest: 'kiste_team1', items: [{ item: 'minecraft:oak_log', count: 48 }, { item: 'minecraft:stone', count: 9 }] }, new Date(Date.now() + 5).toISOString());
  const answer = await mod.append(`b_${seen.id}`, [seen, storeSeen]);
  assert.deepEqual(answer.accepted, [seen.id, storeSeen.id], JSON.stringify(answer));
  // A server measurement with a member key is refused – the client numbers cannot pose as checked ones.
  const fake = teamEvent(anna, { kind: 'build.tally', section: fundament, placed: 500, broken: 0, from: seen.at, until: seen.at }, seen.at, 'server');
  assert.equal((await mod.append(`b_${fake.id}`, [fake])).rejected.length, 1);
  for (const x of [a, b]) {
    const proof = x.getByRole('region', { name: 'Baunachweis und Lager' });
    await proof.locator('[data-seen]', { hasText: /laut Spiel 72 % \(72 von 100\) · Anna, .*ungeprüft/ }).waitFor();
    await proof.locator('[data-seen]', { hasText: /fehlt: 28 stone/ }).waitFor();
    await proof.locator('[data-seen]', { hasText: /Laut Spiel \(Anna.*ungeprüft\): 48 oak_log, 9 stone/ }).waitFor();
    await proof.getByLabel('Bestand laut Spiel').getByText('48 × oak_log').waitFor();
    assert.equal(await proof.getByText('500').count(), 0, 'keine gefälschte Servermessung');
  }
  mod.close();

  // ---- TEAMBAU-28: Server-Plugin (Serverschlüssel) meldet Baunachweis, Lager und eine Ertragskiste über Tage;
  // die Bauleitung verdichtet, ein Mitspieler mit älterem Stand verbindet sich, nichts doppelt.
  await liveBlock(a).locator('details.team-emergency > summary').click();
  await liveBlock(a).getByRole('button', { name: 'Link für den Server' }).click();
  const serverKey = new URLSearchParams((await liveBlock(a).getByLabel('Link für den Server').inputValue()).split('?')[1]).get('s');
  const t0 = Date.now() - 6 * 86_400_000;
  let n = 0;
  const at = () => new Date(t0 + (n++) * 600_000).toISOString();
  const srv = (by, body) => teamEvent(by, body, at(), 'server');
  const history = [srv(philipp, { kind: 'store.chest', chest: 'farm_kaktus', name: 'Kakteenkiste', pos: [40, 64, 10], dimension: 'minecraft:overworld' }),
    teamEvent(philipp, { kind: 'store.config', chest: 'farm_kaktus', purpose: 'ertrag' }, at())];
  for (let i = 0; i < 60; i++) {
    history.push(srv(anna, { kind: 'build.tally', section: fundament, placed: 10, broken: 1, blocks: [{ item: 'minecraft:stone', count: 10 }], from: at(), until: at() }));
    history.push(srv(philipp, { kind: 'store.yield', chest: 'farm_kaktus', items: [{ item: 'minecraft:cactus', count: 50 }], from: at(), until: at(), minutes: 10 }));
  }
  const cfg = history.splice(1, 1);
  const sent = await post(roomId, serverKey, `b_hist${Date.now()}`, history);
  assert.equal(sent.accepted.length, history.length, JSON.stringify(sent.rejected ?? sent).slice(0, 400));
  // The yield chest purpose is the Bauleitung's step (member key).
  assert.equal((await post(roomId, memberKey, `b_cfg${Date.now()}`, cfg)).accepted.length, 1);
  const proofA = a.getByRole('region', { name: 'Baunachweis und Lager' });
  const book = proofA.getByRole('region', { name: 'Ertragsbuch' });
  await book.locator('tr[data-yield="farm_kaktus"]').getByText('300 cactus').waitFor();
  const annaRow = proofA.locator('.team-proof-members tr', { hasText: 'Anna' });
  await annaRow.getByText('600', { exact: true }).waitFor();
  await sameLog([a, b, c], roomId, memberKey);
  // Ben's tablet goes away (closed) before the compaction and comes back later with the older state.
  const benUrl = c.url();
  await c.close();
  const compact = a.locator('details.team-compact');
  await compact.locator('summary').click();
  await compact.getByLabel(/Alles älter als/).selectOption('3');
  await compact.getByRole('button', { name: 'Vorschau' }).click();
  await compact.getByRole('list', { name: 'Vorschau' }).getByText(/Messungen, ältere Zählungen/).waitFor();
  await compact.getByRole('button', { name: 'Jetzt verdichten' }).click();
  await compact.getByText(/Verdichtet: \d+ → \d+ Ereignisse/).waitFor();
  const after = await eventCount(a);
  assert.ok(after < 100, `verdichtet auf ${after} Ereignisse`);
  await book.locator('tr[data-yield="farm_kaktus"]').getByText('300 cactus').waitFor();
  await annaRow.getByText('600', { exact: true }).waitFor();
  // Anna (online) and Ben (older state, reconnecting) get the summary parts – and the same numbers, nothing doubled.
  const c2 = await C.context.newPage();
  c2.setDefaultTimeout(20_000);
  c2.on('pageerror', e => C.errors.push(e.message));
  await c2.goto(benUrl);
  for (const x of [b, c2]) {
    await liveBlock(x).locator('[data-state=live]').waitFor();
    const proof = x.getByRole('region', { name: 'Baunachweis und Lager' });
    await proof.getByRole('region', { name: 'Ertragsbuch' }).locator('tr[data-yield="farm_kaktus"]').getByText('300 cactus').waitFor();
    await proof.locator('.team-proof-members tr', { hasText: 'Anna' }).getByText('600', { exact: true }).waitFor();
  }
  for (let i = 0; i < 40 && (await eventCount(b) !== await eventCount(a) || await eventCount(c2) !== await eventCount(a)); i++) await a.waitForTimeout(250);
  assert.equal(await eventCount(b), await eventCount(a), 'Anna hat denselben verdichteten Stand');
  assert.equal(await eventCount(c2), await eventCount(a), 'Ben hat denselben verdichteten Stand');

  // ---- TEAMBAU-29: Bens Tablet „zugeklappt“ (Leitung tot ohne Abmeldung): dort einen Abschnitt abgeben; der Planer
  // merkt es am Herzschlag, verbindet sich ohne Neuladen neu und holt alles nach, nichts doppelt.
  C.link.cut = true;
  await c2.getByRole('region', { name: 'Meine Aufgaben' }).locator('li', { hasText: 'Teil 1/2' }).getByRole('button', { name: 'Abgeben' }).click();
  await a.getByRole('region', { name: 'Notizen am Bau' }).getByPlaceholder(/Notiz/).fill('Während Ben weg war');
  await a.getByRole('region', { name: 'Notizen am Bau' }).getByRole('button', { name: 'Schreiben' }).click();
  await liveBlock(c2).locator('[data-state=offline]').waitFor({ timeout: 100_000 });
  C.link.cut = false;
  await liveBlock(c2).locator('[data-state=live]').waitFor({ timeout: 90_000 });
  await section(a, 'Dach und Abschluss · Teil 1/2').getByRole('button', { name: 'Übernehmen' }).waitFor();
  await c2.getByRole('region', { name: 'Notizen am Bau' }).getByText('Während Ben weg war').waitFor();
  await a.waitForTimeout(500);
  assert.equal(await eventCount(c2), await eventCount(a), 'nach dem Wiederverbinden gleicher Stand');
  assert.equal(await c2.getByRole('region', { name: 'Notizen am Bau' }).getByText('Während Ben weg war').count(), 1);

  // ---- TEAMBAU-25: Einladung erneuern – der alte Link lässt niemanden mehr hinein.
  await liveBlock(a).getByRole('button', { name: 'Einladung erneuern' }).click();
  const fresh = await liveBlock(a).getByLabel('Einladungslink').inputValue();
  assert.notEqual(fresh, link);
  await liveBlock(b).getByText(/kennt diesen Schlüssel nicht mehr/).waitFor();
  const D = await device({ width: 1280, height: 800 });
  await D.p.goto(link);
  await D.p.getByRole('alert').first().waitFor();
  console.log('# alter Link:', await D.p.getByRole('alert').first().innerText());
  assert.equal(await D.p.getByRole('button', { name: 'Beitreten und Plan laden' }).isEnabled().catch(() => false), false, 'alter Link: kein Beitritt');
  await D.context.close();
  await b.goto(fresh);
  await b.getByRole('button', { name: 'Beitreten und Plan laden' }).click();
  await b.waitForURL(/\/team$/);
  await liveBlock(b).locator('[data-state=live]').waitFor();
  C.errors.splice(0); // the closed tab's late socket errors

  assert.deepEqual(A.errors, []); assert.deepEqual(B.errors, []); assert.deepEqual(C.errors, []);
  await A.context.close(); await B.context.close(); await C.context.close();
});
