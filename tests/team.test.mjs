import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTeam, teamEvent, appendEvents, mergeTeam, teamView, checkTeam, checkTeamEvent, canTeam, authorize, laterThan, teamAssignments,
  encodeReportCode, decodeReportCode, buildTeamPackage, readTeamPackage, teamStatusText, describeEvent, teamPackageFileName, teamIntoProgram, checkProgram,
} from '../dist/domain/src/index.js';

const ctx = {
  sections: [{ id: 'sec_a', name: 'Fundament' }, { id: 'sec_b', name: 'Rohbau' }, { id: 'sec_c', name: 'Dach' }],
  builders: [{ id: 'bld_phil', name: 'Philipp' }, { id: 'bld_anna', name: 'Anna' }, { id: 'bld_ben', name: 'Ben' }],
};
let clock = Date.parse('2026-11-03T10:00:00Z');
const t = (min = 1) => new Date(clock += min * 60_000).toISOString();
const ev = (by, body, at = t()) => teamEvent(by, body, at);
const base = () => createTeam({ name: 'Burg am See', founder: 'bld_phil', teamId: 'team_test0001', at: '2026-11-03T09:00:00Z', server: 'server.lmnt-gaming.net' });
const section = (view, id) => view.sections.find(s => s.sectionId === id);
const member = (view, id) => view.members.find(m => m.id === id);

test('founder is Bauleitung, builders are Helfer, strangers are Gäste', () => {
  const v = teamView(base(), ctx);
  assert.equal(member(v, 'bld_phil').role, 'leitung');
  assert.equal(member(v, 'bld_anna').role, 'helfer');
  assert.ok(canTeam('helfer', 'section.claim'));
  assert.ok(!canTeam('helfer', 'section.verify'));
  assert.ok(!canTeam('gast', 'section.claim'));
  const team = appendEvents(base(), [ev('bld_fremd', { kind: 'section.claim', section: 'sec_a' }), ev('bld_fremd', { kind: 'note.add', noteId: 'n1', text: 'Schöner Bau!', tag: 'info' })]);
  const v2 = teamView(team, ctx);
  assert.equal(section(v2, 'sec_a').status, 'frei');
  assert.equal(v2.rejected.length, 1, 'stranger may not claim');
  assert.equal(v2.notes.length, 1, 'but may write a note');
});

test('section life cycle: claim, done, verify, rework; history and assignments', () => {
  const team = appendEvents(base(), [
    ev('bld_anna', { kind: 'section.claim', section: 'sec_a' }),
    ev('bld_anna', { kind: 'section.done', section: 'sec_a', note: 'Fertig bis Schicht 3' }),
    ev('bld_phil', { kind: 'section.verify', section: 'sec_a', ok: false, note: 'Ecke fehlt' }),
    ev('bld_anna', { kind: 'section.done', section: 'sec_a' }),
    ev('bld_phil', { kind: 'section.verify', section: 'sec_a', ok: true }),
    ev('bld_ben', { kind: 'section.claim', section: 'sec_b' }),
  ]);
  const v = teamView(team, ctx);
  assert.equal(section(v, 'sec_a').status, 'bestaetigt');
  assert.equal(section(v, 'sec_a').owner, 'bld_anna');
  assert.deepEqual(section(v, 'sec_a').history.map(h => h.text), ['übernommen', 'fertig gemeldet', 'Nacharbeit: Ecke fehlt', 'fertig gemeldet', 'bestätigt']);
  assert.equal(section(v, 'sec_b').status, 'vergeben');
  assert.equal(section(v, 'sec_c').status, 'frei');
  assert.equal(member(v, 'bld_anna').confirmedSections, 1);
  assert.deepEqual(teamAssignments(v), { sec_a: ['bld_anna'], sec_b: ['bld_ben'] });
  // a confirmed section can neither be claimed again nor released
  const after = teamView(appendEvents(team, [ev('bld_ben', { kind: 'section.claim', section: 'sec_a' }), ev('bld_anna', { kind: 'section.release', section: 'sec_a' })]), ctx);
  assert.equal(section(after, 'sec_a').status, 'bestaetigt');
  assert.equal(after.conflicts.length + after.rejected.length, 2);
});

test('double claim: earlier wins, later is a visible conflict; assignment by Baumeister overrides', () => {
  const at = t();
  const anna = ev('bld_anna', { kind: 'section.claim', section: 'sec_c' }, at);
  const ben = ev('bld_ben', { kind: 'section.claim', section: 'sec_c' }, t());
  const v = teamView(appendEvents(base(), [ben, anna]), ctx);
  assert.equal(section(v, 'sec_c').owner, 'bld_anna');
  assert.match(v.conflicts[0].text, /Ben wollte „Dach“ übernehmen.*Anna/);
  // Ben as Baumeister may reassign
  const v2 = teamView(appendEvents(base(), [anna, ev('bld_phil', { kind: 'member.role', member: 'bld_ben', role: 'meister' }), ev('bld_ben', { kind: 'section.assign', section: 'sec_c', member: 'bld_ben' })]), ctx);
  assert.equal(section(v2, 'sec_c').owner, 'bld_ben');
  assert.match(v2.conflicts.at(-1).text, /umgewiesen/);
  // a Helfer may not release someone else's section
  const v3 = teamView(appendEvents(base(), [anna, ev('bld_ben', { kind: 'section.release', section: 'sec_c' })]), ctx);
  assert.equal(section(v3, 'sec_c').owner, 'bld_anna');
  assert.match(v3.rejected[0].reason, /Nur Anna/);
});

test('roles: only Bauleitung changes roles, at least one Bauleitung stays, rights are checked at event time', () => {
  const team = appendEvents(base(), [
    ev('bld_anna', { kind: 'member.role', member: 'bld_anna', role: 'leitung' }), // rejected: helper
    ev('bld_phil', { kind: 'member.role', member: 'bld_phil', role: 'helfer' }), // rejected: last leader
    ev('bld_phil', { kind: 'member.role', member: 'bld_anna', role: 'meister' }),
    ev('bld_anna', { kind: 'section.verify', section: 'sec_b', ok: true }), // rejected: section free
    ev('bld_ben', { kind: 'section.claim', section: 'sec_b' }),
    ev('bld_anna', { kind: 'section.verify', section: 'sec_b', ok: false }),
  ]);
  const v = teamView(team, ctx);
  assert.equal(member(v, 'bld_anna').role, 'meister');
  assert.equal(member(v, 'bld_phil').role, 'leitung');
  assert.equal(v.rejected.length, 3);
  assert.equal(section(v, 'sec_b').status, 'nacharbeit');
  // a verify written before the role was granted stays without effect even after the grant
  const early = ev('bld_ben', { kind: 'section.verify', section: 'sec_b', ok: true });
  const v2 = teamView(appendEvents(team, [early, ev('bld_phil', { kind: 'member.role', member: 'bld_ben', role: 'meister' })]), ctx);
  assert.equal(section(v2, 'sec_b').status, 'nacharbeit');
});

test('join, player names and mentions', () => {
  const team = appendEvents(base(), [
    ev('bld_carla', { kind: 'member.join', member: 'bld_carla', name: 'Carla', player: 'CarlaBaut' }),
    ev('bld_carla', { kind: 'section.claim', section: 'sec_c' }), // Gast after joining herself? joined members are Helfer
    ev('bld_anna', { kind: 'member.player', member: 'bld_anna', player: 'Anna_MC' }),
    ev('bld_anna', { kind: 'member.player', member: 'bld_ben', player: 'BenX' }), // rejected
    ev('bld_ben', { kind: 'note.add', noteId: 'n1', text: 'Frage an @Anna_MC und @Carla: Fensterbreite?', tag: 'frage', section: 'sec_b', pos: [10, 64, -3] }),
  ]);
  const v = teamView(team, ctx);
  const carla = member(v, 'bld_carla');
  assert.equal(carla.name, 'Carla'); assert.equal(carla.player, 'CarlaBaut'); assert.equal(carla.inProgram, false); assert.equal(carla.role, 'helfer');
  assert.equal(section(v, 'sec_c').owner, 'bld_carla');
  assert.equal(member(v, 'bld_anna').player, 'Anna_MC');
  assert.equal(member(v, 'bld_ben').player, undefined);
  assert.deepEqual([...v.notes[0].mentions].sort(), ['bld_anna', 'bld_carla']);
  assert.throws(() => checkTeamEvent({ ...ev('x', { kind: 'member.player', member: 'x', player: 'ab' }), player: 'a b' }), /Spielername/);
});

test('contributions, gather claims and notes', () => {
  const team = appendEvents(base(), [
    ev('bld_anna', { kind: 'contribution', section: 'sec_a', blocks: 320, items: [{ item: 'minecraft:stone', count: 640 }] }),
    ev('bld_ben', { kind: 'contribution', items: [{ item: 'minecraft:stone', count: 64 }, { item: 'minecraft:oak_log', count: 32 }] }),
    ev('bld_ben', { kind: 'gather.claim', item: 'minecraft:oak_log', count: 128 }),
    ev('bld_anna', { kind: 'gather.claim', item: 'minecraft:stone', count: 500 }),
    ev('bld_anna', { kind: 'gather.claim', item: 'minecraft:stone', count: 0 }),
    ev('bld_anna', { kind: 'note.add', noteId: 'n2', text: 'Glas fehlt', tag: 'material' }),
    ev('bld_ben', { kind: 'note.resolve', noteId: 'n2' }), // rejected: foreign note, Helfer
    ev('bld_anna', { kind: 'note.resolve', noteId: 'n2', text: 'erledigt' }),
  ]);
  const v = teamView(team, ctx);
  assert.deepEqual(v.delivered, { 'minecraft:stone': 704, 'minecraft:oak_log': 32 });
  assert.equal(member(v, 'bld_anna').blocks, 320);
  assert.deepEqual(v.gather.map(g => [g.member, g.item, g.count]), [['bld_ben', 'minecraft:oak_log', 128]]);
  assert.equal(v.notes[0].resolved.by, 'bld_anna');
  assert.equal(v.rejected.length, 1);
  assert.throws(() => checkTeamEvent({ id: 'x', at: t(), by: 'a', origin: 'planer', kind: 'contribution' }), /ohne Inhalt/);
});

test('merge is commutative, idempotent and keeps every event; unknown kinds survive', () => {
  const root = appendEvents(base(), [ev('bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'Erster Stand' })]);
  const anna = appendEvents(root, [ev('bld_anna', { kind: 'section.claim', section: 'sec_a' }), ev('bld_anna', { kind: 'section.done', section: 'sec_a' })]);
  const future = { id: 'tev_future', at: t(), by: 'bld_ben', origin: 'planer', kind: 'section.vote', weight: 3 };
  const ben = appendEvents(root, [ev('bld_ben', { kind: 'section.claim', section: 'sec_a' }), ev('bld_ben', { kind: 'section.claim', section: 'sec_b' }), future]);
  const ab = mergeTeam(anna, ben), ba = mergeTeam(ben, anna);
  assert.deepEqual(ab.team.events.map(e => e.id), ba.team.events.map(e => e.id));
  assert.equal(ab.added.length, 3); assert.equal(ab.known, 1);
  const again = mergeTeam(ab.team, ben);
  assert.equal(again.added.length, 0);
  assert.deepEqual(again.team.events, ab.team.events);
  const v1 = teamView(ab.team, ctx), v2 = teamView(ba.team, ctx);
  assert.deepEqual(v1.sections, v2.sections);
  assert.equal(section(v1, 'sec_a').owner, 'bld_anna', 'Anna claimed first');
  assert.equal(section(v1, 'sec_b').owner, 'bld_ben');
  assert.equal(v1.unknownKinds, 1);
  assert.equal(v1.release.revisionNumber, 1);
  checkTeam(ab.team);
  // three-way: a third copy merged in any order gives the same log
  const carl = appendEvents(root, [ev('bld_phil', { kind: 'section.assign', section: 'sec_c', member: 'bld_anna' })]);
  const x = mergeTeam(mergeTeam(anna, carl).team, ben).team, y = mergeTeam(mergeTeam(ben, anna).team, carl).team;
  assert.deepEqual(x.events, y.events);
  // other team is refused, same id with other content is reported
  assert.throws(() => mergeTeam(anna, { ...ben, teamId: 'team_other' }), /anderen Team/);
  const tampered = { ...ben, events: ben.events.map(e => e.kind === 'section.claim' && e.section === 'sec_b' ? { ...e, section: 'sec_c' } : e) };
  const m = mergeTeam(ab.team, tampered);
  assert.equal(m.clashes.length, 1);
  assert.equal(teamView(m.team, ctx).sections.find(s => s.sectionId === 'sec_b').owner, 'bld_ben');
});

test('orphan sections stay visible; local self is not merged; validation rejects disorder and duplicates', () => {
  const team = appendEvents({ ...base(), self: 'bld_anna' }, [ev('bld_anna', { kind: 'section.claim', section: 'sec_gone' })]);
  const v = teamView(team, ctx);
  assert.equal(section(v, 'sec_gone').orphan, true);
  const merged = mergeTeam(team, { ...base(), self: 'bld_ben' }).team;
  assert.equal(merged.self, 'bld_anna');
  const [e] = team.events;
  assert.throws(() => checkTeam({ ...team, events: [e, e] }), /doppelt/);
  const a = ev('bld_anna', { kind: 'section.claim', section: 'sec_a' }, '2026-11-03T12:00:00.000Z'), b = ev('bld_anna', { kind: 'section.done', section: 'sec_a' }, '2026-11-03T11:00:00.000Z');
  assert.throws(() => checkTeam({ ...team, events: [a, b] }), /nicht geordnet/);
  assert.throws(() => checkTeam({ ...team, schemaVersion: 2 }), /Schemaversion/);
  assert.equal(laterThan({ ...team, events: [a] }, '2026-11-03T11:59:00.000Z'), '2026-11-03T12:00:00.001Z');
});

test('authorize mirrors the fold', () => {
  const team = appendEvents(base(), [ev('bld_anna', { kind: 'section.claim', section: 'sec_a' })]);
  assert.equal(authorize(team, ctx, 'bld_ben', { kind: 'section.claim', section: 'sec_a' }).ok, false);
  assert.equal(authorize(team, ctx, 'bld_ben', { kind: 'section.claim', section: 'sec_b' }).ok, true);
  assert.equal(authorize(team, ctx, 'bld_ben', { kind: 'plan.release', revisionId: 'r', revisionNumber: 2, summary: '' }).ok, false);
  assert.equal(authorize(team, ctx, 'bld_phil', { kind: 'section.verify', section: 'sec_a', ok: true }).ok, true);
});

test('report code round trip, tamper and team checks', async () => {
  const team = base();
  const events = [ev('bld_anna', { kind: 'section.done', section: 'sec_a', note: 'Ümläute & „Zeichen“' }), ev('bld_anna', { kind: 'contribution', blocks: 12 })];
  const code = await encodeReportCode(team, events);
  assert.match(code, /^BPT1:test0001:[A-Za-z0-9_-]+:[a-f0-9]{8}$/);
  const back = await decodeReportCode(`  ${code.slice(0, 40)}\n${code.slice(40)} `);
  assert.equal(back.teamId, team.teamId);
  assert.deepEqual(back.events, events);
  const broken = code.replace(/:(.)([^:]*):([a-f0-9]{8})$/, (_, c, rest, chk) => `:${c === 'A' ? 'B' : 'A'}${rest}:${chk}`);
  await assert.rejects(decodeReportCode(broken), /Prüfsumme/);
  await assert.rejects(decodeReportCode('hallo'), /kein Meldecode/);
  const merged = mergeTeam(team, { ...team, events: back.events });
  assert.equal(merged.added.length, 2);
});

test('team package round trip without self, tamper detection', async () => {
  const team = appendEvents({ ...base(), self: 'bld_phil' }, [ev('bld_phil', { kind: 'section.assign', section: 'sec_a', member: 'bld_anna' })]);
  const pkg = await buildTeamPackage(team, { member: 'bld_phil', name: 'Philipp' }, '{"format":"minecraft-bauplaner-backup"}');
  assert.equal('self' in pkg.team, false);
  const read = await readTeamPackage(JSON.stringify(pkg));
  assert.deepEqual(read.team.events, team.events);
  assert.equal(read.backup, pkg.backup);
  const evil = JSON.parse(JSON.stringify(pkg)); evil.team.events[0].member = 'bld_ben';
  await assert.rejects(readTeamPackage(JSON.stringify(evil)), /Prüfsumme/);
  await assert.rejects(readTeamPackage('{"format":"x"}'), /kein Teampaket/);
  await assert.rejects(readTeamPackage(JSON.stringify({ ...pkg, formatVersion: 9 })), /neueren/);
  await assert.rejects(readTeamPackage('{"form'), /kein gültiges JSON/);
  assert.match(teamPackageFileName(team, new Date('2026-11-03T12:00:00Z')), /^Burg-am-See-2026-11-03\.bauteam\.json$/);
});

test('status text and descriptions', () => {
  const team = appendEvents(base(), [
    ev('bld_anna', { kind: 'member.player', member: 'bld_anna', player: 'Anna_MC' }),
    ev('bld_anna', { kind: 'section.claim', section: 'sec_a' }),
    ev('bld_ben', { kind: 'gather.claim', item: 'minecraft:glass', count: 64 }),
    ev('bld_ben', { kind: 'note.add', noteId: 'n', text: 'Wo kommt die Treppe hin?', tag: 'frage' }),
    ev('bld_phil', { kind: 'plan.release', revisionId: 'r1', revisionNumber: 3, summary: 'mit Turm' }),
  ]);
  const v = teamView(team, ctx);
  const txt = teamStatusText({ projectName: 'Burg', team, view: v, ctx, progressBySection: new Map([['sec_a', 0.42]]), date: new Date('2026-11-03T12:00:00Z') });
  assert.match(txt, /Planstand 3 gilt \(mit Turm\)/);
  assert.match(txt, /1\. Fundament – in Arbeit · Anna \(Anna_MC\) · 42 %/);
  assert.match(txt, /2 Abschnitte frei/);
  assert.match(txt, /Ben: 64 × glass/);
  assert.match(txt, /Frage: Wo kommt die Treppe hin\?/);
  assert.equal(describeEvent(team.events[1], ctx), 'Anna: Abschnitt übernommen „Fundament“');
});

// ---------------------------------------------------------------- COOP-04: Baunachweis und Lagerkisten
const srv = (by, body, at = t()) => teamEvent(by, body, at, 'server');
const tally = (by, section, placed, broken = 0, blocks) => srv(by, { kind: 'build.tally', section, placed, broken, ...(blocks && { blocks }), from: '2026-11-03T10:00:00Z', until: '2026-11-03T10:05:00Z' });

test('Baunachweis: only from the server, summed per member and section, switched off hides all numbers', () => {
  let team = appendEvents(base(), [
    tally('bld_anna', 'sec_a', 300, 12, [{ item: 'minecraft:stone_bricks', count: 280 }, { item: 'minecraft:oak_planks', count: 20 }]),
    tally('bld_ben', 'sec_a', 50),
    tally('bld_anna', 'sec_b', 40, 0, [{ item: 'minecraft:stone_bricks', count: 40 }]),
    ev('bld_ben', { kind: 'build.tally', section: 'sec_b', placed: 9999, broken: 0, from: '2026-11-03T10:00:00Z', until: '2026-11-03T10:05:00Z' }),
  ]);
  let v = teamView(team, ctx);
  assert.equal(member(v, 'bld_anna').placed, 340); assert.equal(member(v, 'bld_anna').broken, 12);
  assert.equal(member(v, 'bld_ben').placed, 50, 'a tally typed into a planner does not count');
  assert.match(v.rejected[0].reason, /nur vom Server-Plugin/);
  assert.equal(section(v, 'sec_a').placed, 350); assert.deepEqual(section(v, 'sec_a').builders, { bld_anna: 300, bld_ben: 50 });
  assert.deepEqual(v.placedBlocks, { 'minecraft:stone_bricks': 320, 'minecraft:oak_planks': 20 });
  assert.deepEqual(v.tallySpan, { from: '2026-11-03T10:00:00Z', until: '2026-11-03T10:05:00Z' });
  // Ben switches it off: also earlier numbers disappear; Philipp cannot switch it for Ben.
  team = appendEvents(team, [ev('bld_phil', { kind: 'member.tally', member: 'bld_anna', on: false }), ev('bld_ben', { kind: 'member.tally', member: 'bld_ben', on: false })]);
  v = teamView(team, ctx);
  assert.equal(member(v, 'bld_ben').placed, 0); assert.equal(member(v, 'bld_ben').tally, false);
  assert.equal(member(v, 'bld_anna').tally, true);
  assert.deepEqual(section(v, 'sec_a').builders, { bld_anna: 300 });
  assert.ok(v.rejected.some(r => /nur für sich selbst/.test(r.reason)));
  // And on again.
  v = teamView(appendEvents(team, [ev('bld_ben', { kind: 'member.tally', member: 'bld_ben', on: true })]), ctx);
  assert.equal(member(v, 'bld_ben').placed, 50);
});

test('Lagerkisten: Baumeister registers, counts give stock, differences are booked without double counting', () => {
  const chest = { kind: 'store.chest', chest: 'lager1', name: 'Hauptlager', pos: [1000, -60, 1010], dimension: 'minecraft:overworld' };
  const count = (by, items, more) => srv(by, { kind: 'store.count', chest: 'lager1', items, ...(more && { more }) });
  let team = appendEvents(base(), [
    ev('bld_anna', { ...chest, chest: 'lager_x' }), // Helfer may not register
    ev('bld_phil', chest),
    count('bld_anna', [{ item: 'minecraft:stone', count: 64 }]), // first count: initial stock, no booking
    count('bld_anna', [{ item: 'minecraft:stone', count: 192 }, { item: 'minecraft:oak_log', count: 10 }]),
    count('bld_ben', [{ item: 'minecraft:stone', count: 128 }, { item: 'minecraft:oak_log', count: 10 }]),
    ev('bld_ben', { kind: 'store.count', chest: 'lager1', items: [] }),
  ]);
  let v = teamView(team, ctx);
  assert.equal(v.stores.length, 1);
  assert.deepEqual(v.stock, { 'minecraft:stone': 128, 'minecraft:oak_log': 10 });
  assert.deepEqual(member(v, 'bld_anna').stored, { 'minecraft:stone': 128, 'minecraft:oak_log': 10 });
  assert.deepEqual(member(v, 'bld_ben').taken, { 'minecraft:stone': 64 });
  assert.equal(v.rejected.length, 2, 'Helfer registration and planner count rejected');
  // Merging the same log twice books nothing twice.
  const again = mergeTeam(team, team).team;
  assert.deepEqual(teamView(again, ctx).members.find(m => m.id === 'bld_anna').stored, member(v, 'bld_anna').stored);
  // A cut list is stock but never a booking; removed chests vanish from the stock.
  team = appendEvents(team, [count('bld_ben', [{ item: 'minecraft:stone', count: 1 }], true), count('bld_ben', [{ item: 'minecraft:stone', count: 500 }])]);
  v = teamView(team, ctx);
  assert.equal(v.stores[0].partial, false); assert.deepEqual(member(v, 'bld_ben').stored, {});
  v = teamView(appendEvents(team, [ev('bld_phil', { ...chest, remove: true }), count('bld_anna', [])]), ctx);
  assert.deepEqual(v.stock, {}); assert.match(v.rejected.at(-1).reason, /Lagerkiste unbekannt/);
  assert.throws(() => checkTeamEvent({ ...srv('bld_anna', { kind: 'store.count', chest: 'lager1', items: [] }), items: [{ item: 'minecraft:stone', count: 1 }, { item: 'minecraft:stone', count: 2 }] }), /doppelt/);
});

test('Projektplanung (PROJ-01): Minecraft-Namen der Bauleute gelten im Team, Team wird in die Planung übernommen', () => {
  const builders = [{ id: 'bld_phil', name: 'Philipp', player: 'Freadeax' }, { id: 'bld_anna', name: 'Anna' }, { id: 'bld_ben', name: 'Ben' }];
  const team = appendEvents(base(), [
    ev('mc_carla', { kind: 'member.join', member: 'mc_carla', name: 'Carla', player: 'Carla_MC' }),
    ev('bld_anna', { kind: 'member.player', member: 'bld_anna', player: 'Anna_MC' }),
    ev('bld_anna', { kind: 'section.claim', section: 'sec_a' }),
    ev('mc_carla', { kind: 'section.claim', section: 'sec_b' }),
    ev('bld_ben', { kind: 'section.claim', section: 'sec_c' }), ev('bld_ben', { kind: 'section.release', section: 'sec_c' }),
  ]);
  const view = teamView(team, { ...ctx, builders });
  assert.equal(member(view, 'bld_phil').player, 'Freadeax', 'Minecraft-Name aus der Planung');
  const program = { schemaVersion: 1, builders, milestones: [], dependencies: [], assignments: { sec_c: ['bld_phil'], sec_x: ['bld_ben'] } };
  const r = teamIntoProgram(program, view);
  assert.equal(r.added, 1); assert.equal(r.linked, 1);
  assert.deepEqual(r.builders.find(b => b.id === 'mc_carla'), { id: 'mc_carla', name: 'Carla', player: 'Carla_MC' });
  assert.equal(r.builders.find(b => b.id === 'bld_anna').player, 'Anna_MC');
  assert.deepEqual(r.assignments, { sec_a: ['bld_anna'], sec_b: ['mc_carla'], sec_x: ['bld_ben'] }, 'freigegebener Abschnitt verliert die Zuweisung, unberührte bleiben');
  checkProgram({ ...program, builders: r.builders, assignments: r.assignments });
  assert.throws(() => checkProgram({ ...program, builders: [{ id: 'b', name: 'X', player: 'kein name!' }], assignments: {} }), /Minecraft-Name/);
  assert.equal(teamIntoProgram({ builders: r.builders, assignments: r.assignments }, view).assigned, 0, 'zweites Übernehmen ändert nichts');
});
