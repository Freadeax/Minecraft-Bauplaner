// Real-game check of the bridge (GAME-02, GAME-04). Used by scripts/test_bridge_ingame.sh around the
// Fabric client game test in mods/bauplaner-bridge/fabric-26.3/src/gametest and by scripts/test_bridge_paper.sh
// around a real Paper server:
//   prepare <dir>  website exports a plan; writes plan.schem plus setblocks.txt (plan cells relative to the
//                  origin, one block wrong and one missing; only the test harness places blocks)
//   verify <dir>   reads the scan.schem the mod recorded in the running game and compares it like the
//                  website's "Spielaufnahme importieren" does
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { readWorldScan } from '../dist/formats/src/index.js';
import { exportRevisionSchem } from '../dist/application/src/index.js';
import { addSection, appendEvents, applyOperation, createTeam, teamContextOf, teamEvent, teamLinkState, teamView, buildGuide, checkScan, createProject, createSampleLibrary, emptySite, freezeRevision, newInstance, resolveProject, scanTarget } from '../dist/domain/src/index.js';

const [mode, dir] = process.argv.slice(2);
if (!['prepare', 'verify'].includes(mode) || !dir) throw new Error('usage: bridge_gametest.mjs prepare|verify <dir>');
/** DataVersion of Minecraft 26.3 (version.json world_version of the client jar). */
const DATA_VERSION = 5023;

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (id, name, position) => newInstance({ assetVersionId: latest(id), name, transform: { position, quarterTurns: 0, mirrorX: false } });
// Deterministic project: same ids are not needed, the scan names its revision and plan hash.
const tower = at('sample_tower', 'Turm West', [0, 0, 0]), wall = at('sample_wall', 'Mauer', [4, 0, 1]);
const built = applyOperation(createProject({ name: 'Spieltest Brücke' }), { kind: 'batch', label: 't', operations: [tower, wall].map(instance => ({ kind: 'instance.add', instance })) }).project;
// Two build sections (Baustelle tab): the mod gets them in the plan file (0.7.0).
const base = { ...built, site: addSection(addSection(emptySite(), 'Turm', [{ instanceId: tower.id }]), 'Mauer', [{ instanceId: wall.id }]) };

const stateString = s => s.id + (Object.keys(s.properties).length ? `[${Object.entries(s.properties).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}=${v}`).join(',')}]` : '');

if (mode === 'prepare') {
  const { project, revision } = freezeRevision(base, 'Spieltest');
  const plan = await exportRevisionSchem(project, revision.id, versions, { dataVersion: DATA_VERSION, anchor: 'min-corner', unselected: 'air' });
  const resolution = resolveProject({ ...project, instances: revision.instances }, versions);
  const blocks = resolution.world.cells.filter(c => c.kind === 'block');
  const wrong = blocks[0], missing = blocks[blocks.length - 1];
  const commands = [];
  for (const cell of blocks) {
    if (cell === missing) continue;
    const state = cell === wrong ? 'minecraft:diamond_block' : stateString(resolution.world.palette[cell.paletteIndex]);
    commands.push(`${cell.position.join(' ')} ${state}`);
  }
  writeFileSync(join(dir, 'plan.schem'), plan.bytes);
  writeFileSync(join(dir, 'setblocks.txt'), commands.join('\n') + '\n');
  // COOP-03: the team view the planner sends to the mod ("Ich bin" = the tester; Turm already taken by them, Mauer free).
  const ctx = teamContextOf(project.site);
  let team = createTeam({ name: 'Spieltest-Team', founder: 'bld_test', teamId: 'team_gametest01', at: '2026-11-03T09:00:00Z' });
  team = { ...appendEvents(team, [teamEvent('bld_test', { kind: 'section.claim', section: project.site.sections[0].id }, '2026-11-03T09:01:00Z')]), self: 'bld_test' };
  writeFileSync(join(dir, 'team.json'), JSON.stringify(teamLinkState(team, teamView(team, ctx), ctx, { dimension: 'minecraft:overworld' })));
  writeFileSync(join(dir, 'state.json'), JSON.stringify({ project, revisionId: revision.id, planSha256: plan.sha256, wrong: wrong.position, missing: missing.position, missingState: stateString(resolution.world.palette[missing.paletteIndex]) }));
  console.log(`Spieltest vorbereitet: ${blocks.length} Blöcke, Abweichungen bei ${wrong.position.join('/')} (Diamant) und ${missing.position.join('/')} (fehlt).`);
} else {
  const expected = JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8'));
  const project = expected.project;
  const revision = project.revisions.find(r => r.id === expected.revisionId);
  const resolution = resolveProject({ ...project, instances: revision.instances }, versions);
  const guide = buildGuide(project, resolution);
  const bytes = readFileSync(join(dir, 'scan.schem'));
  const scan = await readWorldScan(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.equal(scan.meta.revisionId, revision.id);
  assert.equal(scan.meta.planSha256, expected.planSha256);
  // The game test writes the anchor it chose on the ground; the mod must have recorded that block.
  assert.deepEqual(scan.meta.worldAnchor, readFileSync(join(dir, 'anchor.txt'), 'utf8').trim().split(' ').map(Number));
  const target = scanTarget(project, scan);
  const check = checkScan(guide, resolution.world, scan, target.projectMin, target.notes);
  const devs = [...check.deviations.values()];
  assert.equal(check.totals.unknown, 0, 'alle Zellen lagen in geladenen Chunks');
  assert.equal(check.totals.wrong, 1, JSON.stringify(devs.slice(0, 5)));
  assert.equal(check.totals.missing, 1, JSON.stringify(devs.slice(0, 5)));
  assert.equal(check.totals.ok, check.totals.cells - 2, JSON.stringify(devs.slice(0, 5)));
  const byVerdict = Object.fromEntries(devs.map(d => [d.verdict, d]));
  assert.deepEqual(byVerdict.wrong.position, expected.wrong);
  assert.equal(byVerdict.wrong.actual, 'minecraft:diamond_block');
  assert.deepEqual(byVerdict.missing.position, expected.missing);
  hologram(join(dir, 'game.log'), check.totals.cells);
  await live(join(dir, 'live.json'), scan.meta.loader ?? 'fabric', { project, guide, resolution, expected }, join(dir, 'game.log'));
  console.log(`Spieltest bestanden: Minecraft ${scan.meta.gameVersion ?? '26.3'} (${scan.meta.loader ?? '?'}), ${check.totals.cells} Zellen aus ${scan.meta.source === 'server' ? 'der echten Serverwelt' : 'dem echten Client'} gelesen, ${check.totals.ok} korrekt, 1 falscher Block und 1 fehlender Block an den erwarteten Stellen erkannt.`);
}

/**
 * Mod 2.0 hologram (Fabric and NeoForge, skipped when the log has no hologram lines, e.g. the Paper server test):
 * live progress after placing, after building the missing block, turned and turned back; placement saved.
 */
function hologram(logFile, cells) {
  let log;
  try { log = readFileSync(logFile, 'utf8'); } catch { return; }
  const progress = [...log.matchAll(/\[Bauplaner\] .*?: (\d+) % · richtig (\d+) · fehlt (\d+) · falsch (\d+) · Zustand (\d+) · nicht geladen (\d+)/g)]
    .map(m => m.slice(1).map(Number));
  if (progress.length === 0) return;
  assert.equal(progress.length, 4, 'vier Fortschrittszeilen');
  const [placed, built, turned, back] = progress;
  const planned = placed[1] + placed[2] + placed[3] + placed[4] + placed[5];
  assert.deepEqual(placed.slice(2), [1, 1, 0, 0], 'nach dem Platzieren: 1 fehlt, 1 falsch');
  assert.deepEqual(built.slice(2), [0, 1, 0, 0], 'fehlender Block gesetzt: Live-Abgleich erkennt ihn');
  assert.equal(built[1], placed[1] + 1);
  assert.ok(turned[1] < built[1], 'gedreht passt der Plan nicht mehr');
  assert.deepEqual(back.slice(1), built.slice(1), 'zurückgedreht wieder wie vorher');
  assert.ok(planned > 0 && planned <= cells);
  assert.match(log, /\[Bauplaner\] Nächster Fehler bei -?\d+ -?\d+ -?\d+: erwartet /);
  // GAME-07 stage 6 (Mod 0.13.0): packing list and scaffold hints answer in the chat.
  assert.match(log, /\[Bauplaner\] Packliste[^:]*: (\d+ Blöcke holen = \d+ Stapel|nichts offen)/, 'Packliste');
  assert.match(log, /\[Bauplaner\] Gerüst(: kein offener Block| nötig: \d+ Blöcke ohne Nachbarn)/, 'Gerüst-Hinweise');
  assert.match(log, /\[Bauplaner\] Markiert: Lager „Testlager“ bei -?\d+ -?\d+ -?\d+\. Die Weltkarte/, 'Markieren für die Weltkarte (Protokoll 3)');
  assert.match(log, /\[Bauplaner\] Markierung 1 gelöscht\./, 'wartende Markierung löschen');
  assert.match(readFileSync(join(dir, 'platzierung.properties'), 'utf8'), /\.plan=spieltest\.schem/);
  // Stage 2: material list (only the diamond block is still wrong → one cobblestone open), layer mode.
  const material = [...log.matchAll(/\[Bauplaner\] Material offen: (\d+) Blöcke in (\d+) Sorten\./g)].map(m => [Number(m[1]), Number(m[2])]);
  assert.equal(material.length, 2, 'zwei Materiallisten');
  assert.deepEqual(material[0], [1, 1], 'nur der falsche Block ist offen');
  assert.match(log, /\[Bauplaner\] +1 × minecraft:cobblestone \(von \d+\)/);
  assert.ok(material[1][0] > 1, 'abgerissene Mauer erscheint in der Materialliste');
  const finder = [...log.matchAll(/\[Bauplaner\] (Nächster Fehler bei -?\d+ (-?\d+) -?\d+|Keine Fehler in geladenen Chunks)/g)].map(m => m[2] ?? 'keiner');
  const anchorY = Number(readFileSync(join(dir, 'anchor.txt'), 'utf8').trim().split(' ')[1]);
  assert.deepEqual(finder.slice(-2), [String(anchorY), 'keiner'], 'Fehlerfinder bleibt in der gewählten Ebene');
  // Stage 5 (0.7.0): build sections from the plan file, chosen in the game; X-ray switch.
  const sectionList = log.match(/\[Bauplaner\] Bauabschnitte \((\d+)\), aktiv: (\d+)\./);
  assert.ok(sectionList, 'Abschnittsliste im Chat');
  assert.deepEqual([Number(sectionList[1]), Number(sectionList[2])], [2, 2], 'zwei Abschnitte, Mauer gewählt');
  const towerOpen = Number(log.match(/\[Bauplaner\] +1\. Turm: \d+ % · (\d+) offen/)?.[1] ?? -1);
  const wallOpen = Number(log.match(/\[Bauplaner\] ▶ 2\. Mauer: \d+ % · (\d+) offen/)?.[1] ?? -1);
  assert.ok(towerOpen >= 1, 'Turm: der falsche Block ist offen');
  assert.ok(wallOpen > 1, 'Mauer: die abgerissenen Blöcke sind offen');
  assert.match(log, /\[Bauplaner\] Abschnitt 2\/2: „Mauer“ – \d+ % · \d+ offen/);
  assert.match(log, /\[Bauplaner\] Röntgensicht an/);
  assert.match(log, /\[Bauplaner\] Alle Bauabschnitte\./);
  // Test phase (QA-04): /bauplaner diagnose writes a readable report with the facts testers need.
  assert.match(log, /\[Bauplaner\] Diagnose gespeichert: bauplaner\/diagnose\/diagnose-[^ ]+\.txt/);
  const diagnose = readFileSync(join(dir, 'diagnose.txt'), 'utf8');
  for (const needle of ['Version', 'Loader', 'Minecraft', 'Konflikte gesamt', 'Plan eingeblendet: ja', 'Planblöcke', 'Fortschritt', 'Abgefangene Fehler seit Start: 0', 'Website-Verbindung']) {
    assert.ok(diagnose.includes(needle), `Diagnosebericht nennt „${needle}“`);
  }
  // Stage 3: placement helper (the client test throws if a block was placed or broken against the rules).
  assert.equal(readFileSync(join(dir, 'platzierhilfe.txt'), 'utf8').trim(), 'Fail Fail', 'beide falschen Klicks abgewiesen');
  assert.match(log, /\[Platzierhilfe\] Richtigen Block genommen: .+ – nochmal klicken/);
  assert.match(log, /\[Platzierhilfe\] Nicht gesetzt – Auf den Block darunter klicken/);
  assert.match(log, /\[Platzierhilfe\] Geschützt: richtig gesetzter Planblock/);
  console.log(`Hologramm bestanden: ${planned} Planblöcke, Fortschritt ${placed[0]} % → ${built[0]} % nach dem Setzen des fehlenden Blocks, Drehen, Speichern, Materialliste (${material[1][0]} offen nach Teilabriss), Ebenenmodus, Bauabschnitte (Turm ${towerOpen} offen, Mauer ${wallOpen} offen), Röntgensicht und Platzierhilfe (falscher Block, liegender Stamm, Abbauschutz) geprüft.`);
}

/**
 * MAP-03 website link (Fabric and NeoForge, skipped without live.json): the answers the website gets over
 * 127.0.0.1, read with the website's own strict readers (liveLink.ts).
 */
async function live(file, loader, plan, logFile) {
  let raw;
  try { raw = JSON.parse(readFileSync(file, 'utf8')); } catch { return; }
  const { readLiveHello, readLiveStatus, readLiveChunks, readLivePlayers, chunkColumns } = await import('../dist/domain/src/index.js');
  assert.equal(raw.hello.status, 200);
  const hello = readLiveHello(raw.hello.body);
  assert.equal(hello.mod.loader, loader, 'Loader wie in der Aufnahme');
  assert.equal(hello.pairing, true, 'Kopplung nach /bauplaner verbinden offen');
  assert.equal(raw.foreign.status, 403, 'fremde Website abgewiesen');
  assert.equal(raw.unpaired.status, 401, 'ohne Kopplung kein Status');
  assert.equal(raw.pair.status, 200);
  assert.equal(raw.status.status, 200);
  const status = readLiveStatus(raw.status.body);
  assert.ok(status.player, 'Spieler im Status');
  assert.equal(status.player.dimension, 'minecraft:overworld');
  assert.ok(status.hologram, 'Hologramm im Status');
  assert.equal(status.hologram.planFile, 'spieltest.schem');
  assert.ok(status.hologram.total > 0 && status.hologram.counts.ok > 0);
  const chunks = readLiveChunks(raw.chunks.body);
  assert.equal(chunks.chunks.length, 1, 'der Chunk am Bauplatz ist geladen');
  assert.deepEqual(chunks.missing, [[4000, 4000]], 'ferner Chunk als nicht geladen gemeldet');
  const columns = chunkColumns(chunks)[0].columns.filter(Boolean);
  assert.ok(columns.length >= 200, `Oberfläche gelesen (${columns.length} Spalten)`);
  // LINK-03 pairing by click (the J menu button clicked with the mouse in the real game).
  if (raw.ask) {
    const { readServerInfo } = await import('../dist/domain/src/index.js');
    assert.equal(raw.ask.status, 200); assert.equal(raw.ask.body.state, 'waiting');
    assert.equal(raw.askWaiting.body.state, 'waiting', 'vor dem Klick wartet die Anfrage');
    assert.equal(raw.askGranted.body.state, 'ok', 'nach „Planer zulassen“ zugelassen');
    assert.match(raw.askGranted.body.token, /^[A-Za-z0-9_-]{20,}$/);
    assert.notEqual(raw.askAgain.body.state, 'ok', 'der Schlüssel kommt nur einmal');
    assert.equal(raw.server.status, 200, 'neuer Schlüssel gilt');
    assert.equal(readServerInfo(raw.server.body).way, 'none', 'Einzelspieler: kein Server');
    assert.equal(raw.promptLeft, false, 'Frage nach dem Klick verschwunden');
  }
  // LINK-07: the mod talks to the team room itself (no server, no plugin) – live, own claim arrives in the room.
  if (raw.roomSet) {
    assert.equal(raw.roomSet.status, 200, JSON.stringify(raw.roomSet.body));
    assert.equal(raw.roomLive.body.status, 'live', JSON.stringify(raw.roomLive.body));
    assert.equal(raw.roomLive.body.sections, 2);
    assert.equal(raw.roomLive.body.me, 'mem_tom');
    assert.ok(!('key' in raw.roomLive.body), 'Schlüssel nie in der Antwort');
    assert.equal(raw.roomAfter.body.waiting, 0, `Meldung vom Raum bestätigt: ${JSON.stringify(raw.roomAfter.body)}`);
    assert.equal(raw.roomAfter.body.sectionStates.find(x => x.id === 'sec_mauer')?.owner, 'mem_tom', 'im Spiel als eigener Abschnitt sichtbar');
    const room = JSON.parse(readFileSync(join(dir, 'room.json'), 'utf8'));
    const events = await (await fetch(`${room.url}/v1/rooms/${room.room}/events?after=`, { headers: { Authorization: `Bearer ${room.adminKey}` } })).json();
    assert.ok(events.events.some(e => e.kind === 'section.claim' && e.by === 'mem_tom' && e.section === 'sec_mauer'), JSON.stringify(events.events));
  }
  assert.equal(raw.marks.status, 200);
  assert.equal(raw.marks.body.marks, 4, 'Punkt, Bauplatz, Zone und Gefahr-Punkt angenommen');
  // Protocol 2 (GAME-08): hello announces it, players route answers, layers are listed in the chat.
  assert.equal(hello.protocol, 2, 'Protokoll 2');
  for (const f of ['scan', 'marks2', 'players', 'bigplans']) assert.ok(hello.features.includes(f), `Fähigkeit ${f}`);
  assert.equal(raw.players.status, 200, JSON.stringify(raw.players.body));
  const players = readLivePlayers(raw.players.body);
  assert.equal(players.dimension, 'minecraft:overworld');
  assert.deepEqual(players.players, [], 'im Einzelspieler ohne Mitspieler, eigener Spieler fehlt');
  const log = readFileSync(logFile, 'utf8');
  assert.match(log, /\[Bauplaner\] Weltplan-Ebenen \(1\)\./);
  assert.match(log, /\[Bauplaner\] +● Phase 2: 2/);
  assert.equal(raw.plan.status, 200, JSON.stringify(raw.plan.body));
  const after = readLiveStatus(raw.after.body);
  // COOP-03 Teambau: team view in, claim in the game, claim back to the planner as an event of "Ich bin".
  if (raw.teamPost) {
    const { readLiveTeam, teamContextOf, mergeTeam, createTeam, teamView } = await import('../dist/domain/src/index.js');
    assert.ok(hello.features.includes('team'), 'Fähigkeit team');
    assert.equal(raw.teamPost.status, 200, JSON.stringify(raw.teamPost.body));
    assert.equal(raw.teamPost.body.sections, 2);
    assert.equal(raw.teamPost.body.inPlan, 2, 'beide Teamabschnitte über SectionIds im Plan erkannt');
    assert.equal(raw.team.status, 200, JSON.stringify(raw.team.body));
    const team = readLiveTeam(raw.team.body);
    assert.equal(team.way, 'none', 'Einzelspieler: kein Server');
    const sections = plan.project.site.sections;
    assert.deepEqual(team.outbox.map(e => [e.kind, e.section, e.by, e.origin]), [['section.claim', sections[1].id, 'bld_test', 'planer']], 'Übernahme aus dem Spiel im Ausgang');
    assert.match(team.outbox[0].id, /^tev_m/);
    const base = createTeam({ name: 'Spieltest-Team', founder: 'bld_test', teamId: 'team_gametest01', at: '2026-11-03T09:00:00Z' });
    const merged = mergeTeam(base, { ...base, events: team.outbox }).team;
    assert.equal(teamView(merged, teamContextOf(plan.project.site)).sections.find(s => s.sectionId === sections[1].id).owner, 'bld_test');
    assert.equal(raw.teamPull.status, 409, 'ohne Server-Plugin kein Abholen');
    assert.match(String(raw.teamPull.body.error ?? raw.teamPull.body), /keinem Server/, 'Einzelspieler: kein Server zum Abholen');
    const log = readFileSync(logFile, 'utf8');
    assert.match(log, /\[Bauplaner\] Hologramm zeigt nur deine Abschnitte \(2\)/, 'eigene Abschnitte eingeblendet');
  }
  // GAME-10 command page (J menu): real clicks, the typed command and its answer, greyed-out server buttons without plugin.
  let page;
  try { page = JSON.parse(readFileSync(join(dir, 'befehle.json'), 'utf8')); } catch { page = null; }
  if (page) {
    const sentIndex = page.replies.indexOf('› /bauplaner team');
    assert.ok(sentIndex >= 0, `Übersicht per Klick gesendet: ${JSON.stringify(page.replies)}`);
    assert.ok(page.replies.slice(sentIndex + 1).some(r => /^Verbindung: /.test(r)), "Antwort der Übersicht auf der Seite");
    const zeigen = page.replies.indexOf('› /bauplaner team zeigen 2');
    assert.ok(zeigen > sentIndex, 'Eingabe 2 übernommen und gesendet');
    assert.ok(page.replies.length > zeigen + 1, 'Antwort auf „zeigen 2“');
    assert.equal(page.serverButtonActive, false, 'ohne Plugin sind Server-Knöpfe ausgegraut');
    assert.equal(page.clientButtonActive, true);
    const twice = page.replies.findIndex((r, i) => i > 0 && r === page.replies[i - 1] && !r.startsWith('›'));
    assert.equal(twice, -1, `keine Antwortzeile doppelt: ${page.replies[twice]}`);
  }
  assert.equal(after.hologram.planFile, 'website-plan.schem');
  const anchor = readFileSync(join(dir, 'anchor.txt'), 'utf8').trim().split(' ').map(Number);
  assert.deepEqual([after.hologram.placement.x, after.hologram.placement.y, after.hologram.placement.z], [anchor[0] + 20, anchor[1], anchor[2]], 'Plan an der von der Website gesendeten Stelle');
  assert.equal(after.marks, 4);
  // 0.7.0: build sections in the status, chosen from the website (POST /v1/section).
  assert.deepEqual(status.hologram.sections.map(s => s.name), ['Turm', 'Mauer'], 'Abschnitte aus der Plandatei im Status');
  assert.equal(status.hologram.sections.reduce((n, s) => n + s.total, 0), status.hologram.total, 'jeder Block gehört zu einem Abschnitt');
  assert.equal(raw.section.status, 200, JSON.stringify(raw.section.body));
  assert.equal(after.hologram.section, 2, 'Website hat Abschnitt 2 gewählt');
  // MAP-05 Baustand over the link: compared exactly like the recording made with /bauplaner scan.
  let baustand = '';
  if (raw.scan) {
    assert.ok(hello.features.includes('scan'), 'Mod meldet die Fähigkeit „scan“');
    assert.equal(raw.back.status, 200, JSON.stringify(raw.back.body));
    assert.equal(raw.scan.status, 200, JSON.stringify(raw.scan.body));
    assert.match(raw.scan.file, /^[a-z0-9-]+_r\d+_\d{8}-\d{6}\.schem$/, 'Dateiname im Kopf X-Bauplaner-File');
    assert.equal(raw.scan.expose, 'X-Bauplaner-File', 'Dateiname für die Website freigegeben');
    const read = async name => { const b = readFileSync(join(dir, name)); return readWorldScan(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
    const s1 = await read('live-scan.schem');
    assert.deepEqual(s1.meta.worldAnchor, anchor, 'WorldAnchor = Lage des Hologramms');
    const t1 = scanTarget(plan.project, s1);
    const c1 = checkScan(plan.guide, plan.resolution.world, s1, t1.projectMin, t1.notes);
    const d1 = Object.fromEntries([...c1.deviations.values()].map(d => [d.verdict, d]));
    assert.equal(c1.totals.unknown, 0);
    // The hologram test tore part of the building down again: the Baustand must match the mod's own live count.
    assert.equal(c1.totals.wrong, 1); assert.deepEqual(d1.wrong.position, plan.expected.wrong);
    assert.equal(c1.totals.blocksOk, status.hologram.counts.ok, 'Baustand = Live-Zählung der Mod');
    assert.equal(c1.totals.missing, status.hologram.counts.missing);
    assert.equal(raw.turned.status, 200);
    assert.equal(raw.scanTurned.status, 200, JSON.stringify(raw.scanTurned.body));
    const s2 = await read('live-scan-gedreht.schem');
    const t2 = scanTarget(plan.project, s2);
    const c2 = checkScan(plan.guide, plan.resolution.world, s2, t2.projectMin, t2.notes);
    assert.deepEqual(s2.size, s1.size, 'gedrehter Baustand in Plankoordinaten (gleiche Box)');
    assert.equal(c2.totals.unknown, 0);
    assert.equal(c2.totals.blocksOk, 0, 'auf leerem Boden ist nichts gebaut');
    baustand = `, Baustand über die Verbindung (${c1.totals.blocksOk} richtig, 1 falsch, ${c1.totals.missing} fehlen wie die Live-Zählung; gedreht ${c2.totals.missing} fehlen)`;
  }
  console.log(`Website-Verbindung bestanden: Kopplung, Status (Spieler, Hologramm ${status.hologram.counts.ok}/${status.hologram.total}, Abschnitte ${status.hologram.sections.map(s => `${s.name} ${s.ok}/${s.total}`).join(', ')}), Gelände (${columns.length} Spalten), 2 Markierungen, ein direkt gesendeter Plan und Abschnittswahl${baustand}.`);
}
