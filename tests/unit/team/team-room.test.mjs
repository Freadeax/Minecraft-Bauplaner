// Team live (COOP-07): room core of services/team-room and the sync core of the planner together –
// two browsers and a server go live through one room without any file (docs/architecture/team/TEAM_LIVE.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, MemoryStore, RoomError, checkEventShape, LIMITS, checkControl, ControlRelay, CONTROL, cleanPresence, cleanPos } from '../../../services/team-room/src/core.js';
import {
  createTeam, teamEvent, teamView, goLive, joinLive, appendLocal, nextBatch, confirm, ingest, roomStatus, inviteLink, serverLink, readInvite, shareable, checkLive, retryDelay, buildTeamPackage,
} from '../../../dist/domain/src/index.js';

const ctx = { sections: [{ id: 'sec_a', name: 'Fundament' }, { id: 'sec_b', name: 'Rohbau' }], builders: [] };
let clock = Date.parse('2026-11-03T20:00:00Z');
const t = () => new Date(clock += 60_000).toISOString();

/** Runs one sync round of a client against a room core: send outbox, read feed. */
function sync(room, team) {
  let batch;
  while ((batch = nextBatch(team))) {
    const answer = room.append(batch, team.live.adminKey ? 'admin' : 'member'); // the Bauleitung writes with its admin key
    team = confirm(team, answer).team;
  }
  let feed;
  do { feed = room.since(team.live.cursor); team = ingest(team, feed).team; } while (feed.more);
  return team;
}

test('room: create, keys, form check, idempotent batches, feed with cursor and reset', async () => {
  const room = new RoomCore(new MemoryStore());
  await assert.rejects(() => room.auth('x'), RoomError);
  const keys = await room.create({ room: 'r_test01', teamId: 'team_1', name: 'Burg' });
  assert.equal(await room.auth(keys.memberKey), 'member');
  assert.equal(await room.auth(keys.adminKey, 'admin'), 'admin');
  await assert.rejects(() => room.auth(keys.memberKey, 'admin'), /Bauleitung/);
  await assert.rejects(() => room.auth('falsch'), /passt nicht/);
  const e1 = teamEvent('bld_a', { kind: 'section.claim', section: 'sec_a' }, t());
  const a1 = room.append({ batch: 'b1', events: [e1, { id: 'x', at: 'nie', by: 'a', kind: 'note.add', origin: 'planer' }] });
  assert.deepEqual(a1.accepted, [e1.id]); assert.equal(a1.rejected[0].reason, 'Ereigniszeit ungültig');
  assert.deepEqual(room.append({ batch: 'b1', events: [] }).accepted, [e1.id], 'repeated batch = same answer');
  const a2 = room.append({ batch: 'b2', events: [e1, { ...e1, section: 'sec_b' }] });
  assert.deepEqual(a2.known, [e1.id]); assert.match(a2.rejected[0].reason, /anderem Inhalt/);
  assert.deepEqual(room.since('').events.map(e => e.id), [e1.id]);
  assert.equal(room.since('1').events.length, 0);
  assert.equal(room.since('99').reset, true, 'unknown cursor → reset, from the start');
  assert.match(checkEventShape({ ...e1, text: 'x'.repeat(5000) }), /4 KB/);
  const { memberKey } = await room.rotate();
  await assert.rejects(() => room.auth(keys.memberKey), /passt nicht/);
  assert.equal(await room.auth(memberKey), 'member');
});

test('live without files: Bauleitung goes live, helper joins by link, server writes, all see the same state; offline work catches up', async () => {
  const room = new RoomCore(new MemoryStore());
  let lead = createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_live1', at: '2026-11-03T19:00:00Z' });
  lead = appendLocal(lead, [teamEvent('bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'Start' }, t())]);
  const keys = await room.create({ room: 'r_live01', teamId: lead.teamId, name: lead.name });
  lead = goLive(lead, { url: 'https://bauplaner-team.example.workers.dev/', room: keys.room, key: keys.memberKey, adminKey: keys.adminKey, serverKey: keys.serverKey }, 'dev_lead01');
  assert.equal(lead.live.pending.length, 1, 'whole log goes up once');
  lead = sync(room, lead);
  assert.equal(lead.live.pending.length, 0);

  // Invitation link carries everything; packages never carry the key.
  const link = inviteLink('https://freadeax.github.io/Minecraft-Bauplaner/#/projekt/x/team', lead.live);
  assert.match(link, /^https:\/\/freadeax\.github\.io\/Minecraft-Bauplaner\/#\/team\/beitreten\?/);
  const inv = readInvite(link);
  assert.deepEqual(inv, { url: 'https://bauplaner-team.example.workers.dev', room: keys.room, key: keys.memberKey, kind: 'member' });
  assert.equal(readInvite(serverLink('https://x.example/#/a', lead.live, keys.serverKey)).kind, 'server');
  const pkg = await buildTeamPackage(lead, { member: 'bld_phil', name: 'Philipp' });
  assert.ok(!('live' in pkg.team) && !JSON.stringify(pkg).includes(keys.memberKey), 'no key in a package');
  assert.ok(!('live' in shareable(lead)));

  let anna = joinLive(createTeam({ name: 'Burg', founder: 'bld_phil', teamId: lead.teamId, at: lead.createdAt }), inv, 'dev_anna01');
  anna = sync(room, anna);
  assert.equal(teamView(anna, ctx).release.revisionNumber, 1, 'helper sees the release without any file');
  anna = appendLocal(anna, [teamEvent('bld_anna', { kind: 'member.join', member: 'bld_anna', name: 'Anna', player: 'Anna_MC' }, t()),
    teamEvent('bld_anna', { kind: 'section.claim', section: 'sec_a' }, t())]);
  assert.equal(nextBatch(anna).events.length, 2, 'one step = one batch');
  assert.equal(roomStatus(anna, true).state, 'waiting');
  anna = sync(room, anna);
  assert.equal(roomStatus(anna, true).state, 'live');

  // Server (plugin uplink) writes a measurement.
  const tally = teamEvent('bld_anna', { kind: 'build.tally', section: 'sec_a', placed: 64, broken: 0, from: t(), until: t() }, t(), 'server');
  assert.match(room.append({ batch: 'fake1', events: [tally] }, 'member').rejected[0].reason, /Nur der Server/, 'helpers cannot fake server measurements');
  assert.equal(await room.auth(keys.serverKey), 'server');
  await assert.rejects(() => room.auth(keys.serverKey, 'admin'), RoomError);
  room.append({ batch: 'srv1', events: [tally] }, 'server');

  // Lead was offline and took the same section later; also a note. Both sides converge.
  lead = appendLocal(lead, [teamEvent('bld_phil', { kind: 'section.claim', section: 'sec_a' }, t()), teamEvent('bld_phil', { kind: 'note.add', noteId: 'n1', text: 'Tor 3 breit', tag: 'info' }, t())]);
  assert.equal(roomStatus(lead, false).state, 'offline'); assert.equal(roomStatus(lead, false).pending, 2);
  lead = sync(room, lead); anna = sync(room, anna);
  const vl = teamView(lead, ctx), va = teamView(anna, ctx);
  assert.equal(vl.sections.find(s => s.sectionId === 'sec_a').owner, 'bld_anna');
  assert.deepEqual(va.sections, vl.sections);
  assert.equal(va.notes.length, 1);
  assert.equal(vl.members.find(m => m.id === 'bld_anna').placed, 64, 'server measurement live in the planner');
  assert.equal(vl.conflicts.length, 0, 'TEAM-02: the late claim was made without seeing Anna\'s – the room refused it as stale');
  assert.ok(!lead.events.some(e => e.kind === 'section.claim' && e.by === 'bld_phil'), 'stale step left the local log');
  assert.equal(lead.events.length, anna.events.length);
});

test('lost answer: resending the same batch books nothing twice; big logs page through', async () => {
  const room = new RoomCore(new MemoryStore());
  const keys = await room.create({ room: 'r_page01', teamId: 'team_p', name: 'P' });
  let team = goLive(createTeam({ name: 'P', founder: 'bld_a', teamId: 'team_p' }), { url: 'https://x.example', room: keys.room, key: keys.memberKey }, 'dev_aaaa01');
  const many = Array.from({ length: 450 }, (_, i) => teamEvent('bld_a', { kind: 'note.add', noteId: `n${i}`, text: `Notiz ${i}`, tag: 'info' }, t()));
  team = appendLocal(team, many);
  const b = nextBatch(team);
  assert.equal(b.events.length, LIMITS.batch);
  room.append(b); // answer lost
  const again = room.append(b);
  assert.equal(again.accepted.length, LIMITS.batch);
  team = sync(room, team);
  assert.equal(room.store.count(), 450);
  let reader = joinLive(createTeam({ name: 'P', founder: 'bld_a', teamId: 'team_p' }), { url: 'https://x.example', room: keys.room, key: keys.memberKey }, 'dev_bbbb01');
  reader = sync(room, reader);
  assert.equal(reader.events.length, 450);
  assert.equal(retryDelay(0), 5000); assert.equal(retryDelay(10), 60000);
  assert.throws(() => checkLive({ ...reader.live, url: 'http://server.example' }), /https/);
});

test('room: control messages for the server (LINK-05) – form check, relay with answer, timeout, limit', async () => {
  const ok = { owner: 'own_abcd1234', seq: 1730682000000, body: '{"server":"srv_test01","op":"status"}', sig: 'Z4xxwD4_0cRGwTx6-G-LN_A1h2PzwaSBK_LsXLMOxYo' };
  assert.deepEqual(checkControl({ ...ok, extra: 1 }), ok, 'only the four fields go on');
  for (const [k, v] of [['owner', 'x'], ['seq', 0], ['seq', 1.5], ['body', ''], ['sig', 'kurz']]) assert.throws(() => checkControl({ ...ok, [k]: v }), e => e instanceof RoomError && e.status === 400, k);
  assert.throws(() => checkControl({ ...ok, body: 'x'.repeat(CONTROL.bytes + 1) }), e => e.status === 413);

  const relay = new ControlRelay(200);
  const sent = [];
  const pending = relay.ask(f => sent.push(f), ok);
  assert.equal(sent.length, 1); assert.equal(sent[0].type, 'control'); assert.equal(sent[0].body, ok.body);
  assert.equal(relay.answer('unbekannt', {}), false);
  assert.equal(relay.answer(sent[0].id, { ok: true, text: 'Status' }), true);
  assert.deepEqual(await pending, { ok: true, text: 'Status' });
  assert.equal(relay.answer(sent[0].id, {}), false, 'an answer counts once');
  await assert.rejects(relay.ask(() => {}, ok), e => e.status === 504);
  await assert.rejects(relay.ask(() => { throw new Error('zu'); }, ok), /zu/);
  const many = Array.from({ length: CONTROL.pending }, () => relay.ask(() => {}, ok).catch(() => {}));
  assert.throws(() => relay.ask(() => {}, ok), e => e.status === 429);
  await Promise.all(many);
});

test('room: without a server file (LINK-07) – player positions in the presence, recordings from the mods', async () => {
  const p = cleanPresence({ member: 'mem_tom', device: 'Minecraft', where: 'spiel', player: 'TomBaut', pos: { x: 10.6, y: 64, z: -3.2, dim: 'minecraft:overworld', yaw: -90 } });
  assert.deepEqual({ ...p.pos, at: undefined }, { x: 11, y: 64, z: -3, dim: 'minecraft:overworld', yaw: 270, at: undefined });
  assert.equal(p.player, 'TomBaut');
  assert.equal(cleanPresence({ member: 'mem_lea', where: 'planer', pos: { x: 1, y: 2, z: 3 } }).pos, undefined, 'Position nur aus dem Spiel');
  assert.equal(cleanPos({ x: 1e9, y: 0, z: 0 }), null);
  assert.equal(cleanPos({ x: 1, y: 2, z: 3, dim: 'böse' }).dim, 'minecraft:overworld');
  assert.equal(cleanPresence({ where: 'spiel', player: 'kein name!' }).player, undefined);
  assert.equal(cleanPresence({ member: 'mem_x', where: 'server' }, undefined, 'member').where, 'planer', 'nur der Serverschlüssel erscheint als Server');
  assert.equal(cleanPresence({ member: 'server', where: 'planer' }, undefined, 'server').where, 'server');
  assert.equal(cleanPresence({ member: 'mem_x', where: 'spiel' }, undefined, 'admin').where, 'spiel');

  const core = new RoomCore(new MemoryStore());
  await core.create({ room: 'r_scans01', teamId: 'team_a', name: 'A' });
  const gz = n => { const b = new Uint8Array(n); b[0] = 0x1f; b[1] = 0x8b; return b.buffer; };
  const meta = await core.putScan('scan_000001', gz(1000), { file: 'burg_r3 (1).schem', projectId: 'prj_1', revision: '3', by: 'mem_tom' });
  assert.equal(meta.file, 'burg_r3-1-.schem'); assert.equal(meta.revision, 3); assert.equal(meta.projectId, 'prj_1'); assert.equal(meta.bytes, 1000);
  assert.equal(core.getScan('scan_000001').byteLength, 1000);
  await assert.rejects(core.putScan('scan_000002', new Uint8Array([1, 2, 3]).buffer, {}), e => e.code === 'aufnahme-format');
  await assert.rejects(core.putScan('../x', gz(10), {}), e => e.code === 'aufnahme-id');
  await assert.rejects(core.putScan('scan_000003', gz(LIMITS.scanBytes + 1), {}), e => e.code === 'aufnahme-groesse');
  for (let i = 0; i < LIMITS.scansKept + 2; i++) await core.putScan(`scan_more${String(i).padStart(3, '0')}`, gz(10), {});
  assert.equal(core.scans().length, LIMITS.scansKept, 'die neuesten bleiben');
  assert.equal(core.scans()[0].id, `scan_more${String(LIMITS.scansKept + 1).padStart(3, '0')}`, 'neueste zuerst');
  assert.throws(() => core.getScan('scan_000001'), e => e.code === 'aufnahme-fehlt', 'älteste verdrängt');
});

// LINK-11: the Bauleitung's planner puts the header again only when what the plugin needs changes.
test('headerFingerprint ignores createdAt, members and plan, follows sections and place', async () => {
  const { headerFingerprint } = await import('../../../dist/domain/src/index.js');
  const base = { teamId: 'team_a', name: 'Burg', projectName: 'Burg', dimension: 'minecraft:overworld', createdAt: '2026-11-06T10:00:00.000Z', members: [],
    sections: [{ id: 's1', name: 'Fundament', boxes: [[0, 64, 0, 4, 64, 4]] }] };
  const same = headerFingerprint(base);
  assert.equal(headerFingerprint({ ...base, createdAt: '2026-11-06T11:00:00.000Z', members: [{ id: 'm', name: 'Anna', role: 'helfer' }], plan: { sha: 'x' } }), same);
  assert.notEqual(headerFingerprint({ ...base, sections: [{ id: 's1', name: 'Fundament', boxes: [[10, 64, 0, 14, 64, 4]] }] }), same, 'moved on the world map');
  assert.notEqual(headerFingerprint({ ...base, sections: [...base.sections, { id: 's2', name: 'Dach', boxes: [] }] }), same, 'new section');
  assert.notEqual(headerFingerprint({ ...base, need: [['minecraft:stone', 3]] }), same);
});

test('WORLD-SHARE-01: shared documents – revisions, If-Match, server reads only, cheap polling, size', async () => {
  const room = new RoomCore(new MemoryStore());
  await room.create({ room: 'r_docs01', teamId: 'team_docs', name: 'Welt' });
  assert.deepEqual(room.info().docs, {});
  assert.throws(() => room.getDoc('weltplan'), /noch niemand/);
  await assert.rejects(() => room.putDoc('geheim', '{}'), /Unbekanntes Dokument/);
  await assert.rejects(() => room.putDoc('weltplan', '[1]'), /JSON-Objekt/);
  await assert.rejects(() => room.putDoc('weltplan', '{"a":1}', {}, 'server'), /nur/);
  const m1 = await room.putDoc('weltplan', '{"schema":1,"items":[]}', { by: 'bld_a' });
  assert.equal(m1.rev, 1); assert.equal(m1.by, 'bld_a');
  const full = JSON.parse(room.getDoc('weltplan'));
  assert.equal(full.rev, 1); assert.deepEqual(full.doc, { schema: 1, items: [] });
  assert.deepEqual(JSON.parse(room.getDoc('weltplan', '1')), { name: 'weltplan', rev: 1, unchanged: true });
  await assert.rejects(() => room.putDoc('weltplan', '{"schema":1}', { ifMatch: '0' }), e => e.status === 409);
  const m2 = await room.putDoc('weltplan', '{"schema":1,"x":2}', { ifMatch: '1', by: 'bld_b' });
  assert.equal(m2.rev, 2);
  assert.deepEqual(room.info().docs, { weltplan: 2 });
  await assert.rejects(() => room.putDoc('karten', `{"a":"${'x'.repeat(LIMITS.docBytes)}"}`), /4 MB/);
  // Bigger than one chunk: stored in pieces, read back whole.
  const big = JSON.stringify({ items: 'y'.repeat(LIMITS.planChunk + 10) });
  await room.putDoc('karten', big);
  assert.equal(JSON.parse(room.getDoc('karten')).doc.items.length, LIMITS.planChunk + 10);
  assert.deepEqual(room.docs().map(d => d.name), ['weltplan', 'karten']);
});
