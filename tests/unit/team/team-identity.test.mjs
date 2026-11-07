// TEAM-SEC-01 (docs/architecture/team/TEAM_IDENTITY.md): the Team-Raum takes the author from the key, not from the
// event. Regression for the reproduced attack of the check on 07.11.2026: with the shared invitation a member wrote an
// unsigned member.role in the name of the Bauleitung, the room took it and every planner showed the member as Baumeister.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, MemoryStore, NEED as ROOM_NEED } from '../../../services/team-room/src/core.js';
import { createTeam, teamEvent, teamView, TEAM_NEED } from '../../../dist/domain/src/index.js';

const ctx = { sections: [{ id: 'sec_a', name: 'Fundament' }], builders: [] };
let clock = Date.parse('2026-11-07T19:00:00Z');
const t = () => new Date(clock += 60_000).toISOString();
const ev = (by, body) => teamEvent(by, body, t());

async function room({ founder = 'bld_phil', legacy = false } = {}) {
  const core = new RoomCore(new MemoryStore());
  const keys = await core.create({ room: 'r_ident01', teamId: 'team_i', name: 'Burg', ...(!legacy && { founder }) });
  return { core, keys };
}

test('room and planner check the same minimum role per kind', () => {
  assert.deepEqual({ ...ROOM_NEED }, { ...TEAM_NEED });
});

test('regression: a member cannot make itself Baumeister in the name of the Bauleitung', async () => {
  for (const legacy of [false, true]) {
    const { core, keys } = await room({ legacy });
    // Legacy room (from before TEAM-SEC-01): the founder is known from the header the Bauleitung uploaded.
    if (legacy) core.setHeader({ teamId: 'team_i', founder: 'bld_phil' });
    const forged = ev('bld_phil', { kind: 'member.role', member: 'bld_mallory', role: 'meister' });
    // 1. with the shared invitation
    const viaInvite = core.append({ batch: `b_inv_${legacy}`, events: [forged] }, await core.session(keys.memberKey));
    assert.deepEqual(viaInvite.accepted, [], `legacy=${legacy}`);
    assert.match(viaInvite.rejected[0].reason, legacy ? /Bauleitung nur mit ihrem Schlüssel/ : /persönlichem Schlüssel/);
    // 2. with an own key of the member
    const own = await core.join({ member: 'bld_mallory', label: 'Browser' });
    const s = await core.session(own.key);
    assert.deepEqual(s, { role: 'person', member: 'bld_mallory', keyId: own.keyId });
    const viaOwn = core.append({ batch: `b_own_${legacy}`, events: [forged] }, s);
    assert.match(viaOwn.rejected[0].reason, /Absender passt nicht/);
    // 3. in its own name: the role table says helper
    const self = core.append({ batch: `b_self_${legacy}`, events: [ev('bld_mallory', { kind: 'member.role', member: 'bld_mallory', role: 'meister' })] }, s);
    assert.match(self.rejected[0].reason, /helfer und darf member.role nicht/);
    // Nothing reached the log, so no planner can fold it.
    assert.equal(core.since('').events.length, 0);
    const team = { ...createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_i', at: '2026-11-07T18:00:00Z' }), events: core.since('').events };
    assert.equal(teamView(team, ctx).members.find(m => m.id === 'bld_mallory')?.role ?? 'gast', 'gast');
  }
});

test('own keys: join, author from the session, role from the room, devices, revoke', async () => {
  const { core, keys } = await room();
  assert.equal(core.info().identity.founder, 'bld_phil');
  assert.equal(core.info().identity.strict, true);
  await assert.rejects(() => core.join({ member: 'bld_phil' }), /Verwaltungsschlüssel/);
  const anna = await core.join({ member: 'bld_anna', label: 'iPad' });
  assert.equal(anna.role, 'helfer'); assert.equal(anna.pending, false);
  await assert.rejects(() => core.join({ member: 'bld_anna' }), /schon einen Schlüssel/);
  const sa = await core.session(anna.key);
  const admin = await core.session(keys.adminKey);
  assert.equal(admin.member, 'bld_phil');

  // Anna claims as helper; the Bauleitung (admin key) makes her Baumeister; now she may verify.
  const claim = ev('bld_anna', { kind: 'section.claim', section: 'sec_a' });
  assert.deepEqual(core.append({ batch: 'a1', events: [claim] }, sa).accepted, [claim.id]);
  const verify = ev('bld_anna', { kind: 'section.verify', section: 'sec_a', ok: true });
  assert.match(core.append({ batch: 'a2', events: [verify] }, sa).rejected[0].reason, /darf section.verify nicht/);
  const promote = ev('bld_phil', { kind: 'member.role', member: 'bld_anna', role: 'meister' });
  assert.deepEqual(core.append({ batch: 'l1', events: [promote] }, admin).accepted, [promote.id]);
  assert.equal(core.roleOf('bld_anna'), 'meister');
  assert.deepEqual(core.append({ batch: 'a3', events: [verify] }, sa).accepted, [verify.id]);

  // Shared invitation in a strict room: read and join only.
  const note = ev('bld_gast', { kind: 'note.add', noteId: 'n1', text: 'Hallo', tag: 'info' });
  assert.match(core.append({ batch: 'g1', events: [note] }, await core.session(keys.memberKey)).rejected[0].reason, /nur Ereignisse mit persönlichem Schlüssel/);

  // A second device of Anna (her mod), listed for her and for the Bauleitung; revoking it locks it out.
  const mod = await core.addKey(sa, { label: 'Mod' });
  assert.equal(mod.member, 'bld_anna');
  assert.equal(core.listKeys(sa).length, 2);
  assert.equal(core.listKeys(admin).length, 2);
  const ben = await core.join({ member: 'bld_ben' });
  assert.equal(core.listKeys(sa).length, 2, 'others see only their own keys');
  assert.equal(core.listKeys(admin).length, 3);
  assert.ok(core.listKeys(admin).every(k => !('hash' in k)), 'no hashes leave the room');
  await assert.rejects(async () => core.revokeKey(await core.session(ben.key), mod.keyId), /nur die Bauleitung/);
  assert.equal(core.revokeKey(admin, mod.keyId).member, 'bld_anna');
  await assert.rejects(() => core.session(mod.key), /passt nicht/);
  // The Bauleitung's own mod: a device key for the founder from the admin key.
  const leadMod = await core.addKey(admin, { label: 'Mod der Bauleitung' });
  const sl = await core.session(leadMod.key);
  assert.equal(sl.member, 'bld_phil');
  const trust = ev('bld_phil', { kind: 'team.protect', mode: 'sperren', free: 'team' });
  assert.deepEqual(core.append({ batch: 'm1', events: [trust] }, sl).accepted, [trust.id], 'the founder\'s device key acts as Bauleitung');
  // Feed carries the arrival number of every event (for the planner's and mod's check).
  const feed = core.since('');
  assert.equal(feed.seqs.length, feed.events.length);
  assert.deepEqual(feed.seqs, feed.events.map((_, i) => String(i + 1)));
});

test('upgrade of an old room: founder, roles from the Bauleitung, take-over of a Baumeister id needs confirmation', async () => {
  const { core, keys } = await room({ legacy: true });
  const invite = await core.session(keys.memberKey);
  const admin = await core.session(keys.adminKey);
  assert.equal(admin.member, undefined);
  // Before the upgrade: the invitation still writes helper steps (old mods), never leader kinds.
  const claim = ev('bld_ben', { kind: 'section.claim', section: 'sec_a' });
  assert.deepEqual(core.append({ batch: 'o1', events: [claim] }, invite).accepted, [claim.id]);
  assert.match(core.append({ batch: 'o2', events: [ev('bld_ben', { kind: 'team.protect', mode: 'aus', free: 'alle' })] }, invite).rejected[0].reason, /nur mit persönlichem Schlüssel/);
  assert.equal(core.info().identity.founder, null);

  const id = core.setIdentity({ founder: 'bld_phil', roles: { bld_ben: 'meister', bld_anna: 'helfer', bld_phil: 'gast' }, leaderKey: 'A'.repeat(43) });
  assert.deepEqual(id, { founder: 'bld_phil', strict: false, checkedFrom: '2', leaderKey: 'A'.repeat(43) });
  assert.equal(core.roleOf('bld_phil'), 'leitung', 'the founder cannot be demoted by the role list');
  assert.throws(() => core.setIdentity({ founder: 'bld_x' }), /anderen Gründer/);
  assert.equal((await core.session(keys.adminKey)).member, 'bld_phil');

  // Ben's id is Baumeister: with the invitation, nobody may write in his name any more…
  assert.match(core.append({ batch: 'o3', events: [ev('bld_ben', { kind: 'section.verify', section: 'sec_a', ok: true })] }, invite).rejected[0].reason, /Baumeister und Bauleitung/);
  // …and whoever takes over the id first is only a helper until the Bauleitung confirms.
  const ben = await core.join({ member: 'bld_ben', label: 'PC' });
  assert.equal(ben.pending, true); assert.equal(ben.role, 'meister');
  const sb = await core.session(ben.key);
  const verify = ev('bld_ben', { kind: 'section.verify', section: 'sec_a', ok: true });
  assert.match(core.append({ batch: 'b1', events: [verify] }, sb).rejected[0].reason, /noch nicht von der Bauleitung bestätigt/);
  assert.throws(() => core.approve(sb, 'bld_ben'), /nur die Bauleitung/);
  core.approve(admin, 'bld_ben');
  assert.deepEqual(core.append({ batch: 'b2', events: [verify] }, sb).accepted, [verify.id]);
  // Helpers still write with the invitation until the Bauleitung switches to strict.
  const note = ev('bld_anna', { kind: 'note.add', noteId: 'n1', text: 'alt', tag: 'info' });
  assert.deepEqual(core.append({ batch: 'o4', events: [note] }, invite).accepted, [note.id]);
  core.setIdentity({ strict: true });
  assert.match(core.append({ batch: 'o5', events: [ev('bld_anna', { kind: 'note.add', noteId: 'n2', text: 'x', tag: 'info' })] }, invite).rejected[0].reason, /persönlichem Schlüssel/);
});

test('backups keep own keys; a restore of an existing room keeps today\'s keys and roles', async () => {
  const { core, keys } = await room();
  const anna = await core.join({ member: 'bld_anna' });
  const snap = await core.snapshot();
  assert.ok(snap.head.members.bld_anna);
  const revoked = core.revokeKey(await core.session(keys.adminKey), anna.keyId);
  assert.equal(revoked.member, 'bld_anna');
  core.restore(snap, { keepKeys: true });
  await assert.rejects(() => core.session(anna.key), /passt nicht/, 'a revoked key does not come back with an old backup');
  const fresh = new RoomCore(new MemoryStore());
  fresh.restore(snap);
  assert.equal((await fresh.session(anna.key)).member, 'bld_anna', 'a deleted room comes back with its keys');
  assert.equal(fresh.info().identity.founder, 'bld_phil');
});

// ---------------------------------------------------------------- Ed25519 und Prüfung im Planer
import {
  deriveLeaderSeed, leaderPublicKey, signLeaderEvent, verifyLeaderEvent, signLeaderBatch, screenFeed, ingest, joinLive, goLive, upgradeTrust, deriveSignKey, signEvent, verifyEvent, serverLink,
} from '../../../dist/domain/src/index.js';

// Same vector as EventSigTest (mod core) and EventTrustTest (plugin).
const ADMIN = 'adminKeyForTests_0123456789abcdefXYZ';
const NOTE = { id: 'tev_vec1', at: '2026-11-06T20:00:00.000Z', by: 'b_founder', origin: 'planer', kind: 'note.add', noteId: 'n1', text: 'Grüße "Lea"\nZeile\t2 ✓ 😀', tag: 'info', pos: [12, -3, 70000] };
const PROTECT = { id: 'tev_vec2', at: '2026-11-06T20:00:01.000Z', by: 'b_founder', origin: 'planer', kind: 'team.protect', mode: 'sperren', free: 'team' };
const ED_VECTOR = {
  seed: '-0s3Mq0ZUv6MYfmUtM4j7IqQ0KSpT5KmGwPaLNUfRXU', pub: 'LMHlystvLr428DYuRWGy9_baXTCFXRveAK3GVrwvaaQ',
  protect: 'swCnedyunj6mA2WM_9boTh4NXDenK3VSiEe1Sx-10VeFe95djdeF44O1J5ON9jCjHssMTU6v7CWl3fapKTVWCA',
  note: 'ZB2YND2NZ_CMlqze-h3oEnwnQEWxgV0pg7kyjw4D3OVhio_iMRv7XV-caAVnIwD94cU9gSHW0X8oYUIkf852DQ',
};

test('Ed25519 key of the Bauleitung: vector shared with Java, only the public key can check', async () => {
  const seed = await deriveLeaderSeed(ADMIN);
  assert.equal(seed, ED_VECTOR.seed);
  assert.equal(await leaderPublicKey(seed), ED_VECTOR.pub);
  const p = await signLeaderEvent(seed, 'team_vec', PROTECT);
  assert.equal(p.sig, ED_VECTOR.protect);
  assert.equal((await signLeaderEvent(seed, 'team_vec', NOTE)).sig, ED_VECTOR.note);
  assert.equal(await verifyLeaderEvent(ED_VECTOR.pub, 'team_vec', p), true);
  assert.equal(await verifyLeaderEvent(ED_VECTOR.pub, 'team_other', p), false, 'other team');
  assert.equal(await verifyLeaderEvent(ED_VECTOR.pub, 'team_vec', { ...p, mode: 'aus' }), false, 'changed');
  assert.equal(await verifyLeaderEvent(await leaderPublicKey(await deriveLeaderSeed('other_admin_key_0123456789abcdef')), 'team_vec', p), false, 'other key');
  // The public key is no HMAC key: using it as one gives nothing that verifies.
  const forged = await signEvent(ED_VECTOR.pub, 'team_vec', PROTECT);
  assert.equal(await verifyLeaderEvent(ED_VECTOR.pub, 'team_vec', forged), false);
  const [a, b] = await signLeaderBatch(seed, { teamId: 'team_vec', founder: 'b_founder' }, [PROTECT, { ...NOTE, by: 'b_lea' }]);
  assert.equal(a.sig.length, 86); assert.equal(b.sig, undefined, 'others are not vouched for');
  assert.match(serverLink('https://x.example/#/a', { url: 'https://r.example', room: 'r_abcdef' }, 'serverKey_0123456789', undefined, ED_VECTOR.pub), /&p=LMHl/);
  assert.doesNotMatch(serverLink('https://x.example/#/a', { url: 'https://r.example', room: 'r_abcdef' }, 'serverKey_0123456789', undefined, ED_VECTOR.pub), /&l=/);
});

test('planner applies only verified changes: forged leader steps from before the check stay out of the fold', async () => {
  const founder = 'b_founder';
  const base = { ...createTeam({ name: 'Burg', founder, teamId: 'team_vec', at: '2026-11-07T18:00:00Z' }), self: 'b_anna' };
  const forged = { ...teamEvent(founder, { kind: 'member.role', member: 'b_mallory', role: 'meister' }, '2026-11-07T18:10:00.000Z') };
  const join = teamEvent('b_mallory', { kind: 'member.join', member: 'b_mallory', name: 'Mallory' }, '2026-11-07T18:09:00.000Z');
  let anna = joinLive(base, { url: 'https://r.example', room: 'r_abcdef', key: 'inviteKey_0123456789ab' }, 'dev_anna01');
  anna = { ...anna, live: { ...anna.live, identity: { founder, strict: true, checkedFrom: '10', leaderKey: ED_VECTOR.pub } } };
  const feed = { events: [join, forged], seqs: ['3', '4'], cursor: '4' };
  const sc = await screenFeed(anna, feed);
  assert.deepEqual(sc.hold, { [forged.id]: '4' }, 'arrived before the room checked authors, unsigned, not confirmed');
  const r = ingest(anna, feed, undefined, sc);
  anna = r.team;
  assert.ok(!r.added.some(e => e.id === forged.id), 'no news for a held step');
  assert.equal(teamView(anna, ctx).members.find(m => m.id === 'b_mallory').role, 'helfer', 'not Baumeister');
  // A step after checkedFrom: the room checked who wrote it.
  const real = teamEvent(founder, { kind: 'member.role', member: 'b_mallory', role: 'gast' }, '2026-11-07T18:20:00.000Z');
  assert.deepEqual((await screenFeed(anna, { events: [real], seqs: ['12'], cursor: '12' })).hold, {});
  // A signed team.trust of the Bauleitung that vouches up to 4 releases it – unless it excepts it.
  const seed = ED_VECTOR.seed;
  const trustAll = await signLeaderEvent(seed, 'team_vec', teamEvent(founder, { kind: 'team.trust', upTo: '9' }, '2026-11-07T18:30:00.000Z'));
  assert.deepEqual((await screenFeed(anna, { events: [trustAll], seqs: ['11'], cursor: '11' })).release, [forged.id]);
  const trustBut = await signLeaderEvent(seed, 'team_vec', teamEvent(founder, { kind: 'team.trust', upTo: '9', except: [forged.id] }, '2026-11-07T18:30:00.000Z'));
  assert.deepEqual((await screenFeed(anna, { events: [trustBut], seqs: ['11'], cursor: '11' })).release, []);
  // An unsigned (forged) trust releases nothing.
  const fakeTrust = teamEvent(founder, { kind: 'team.trust', upTo: '9' }, '2026-11-07T18:31:00.000Z');
  assert.deepEqual((await screenFeed(anna, { events: [fakeTrust], seqs: ['5'], cursor: '5' })).hold, { [fakeTrust.id]: '5' });
  // Even an old local log holding the forged step folds without it once a signed trust excepts it.
  const old = { ...base, events: [join, forged, trustBut] };
  assert.equal(teamView(old, ctx).members.find(m => m.id === 'b_mallory').role, 'helfer');
});

test('upgrade confirmation: founder steps without the old signature after the last confirmation are excepted', async () => {
  const founder = 'b_founder', team = { teamId: 'team_vec', founder };
  const key = await deriveSignKey(ADMIN);
  const oldTrust = await signEvent(key, 'team_vec', teamEvent(founder, { kind: 'team.trust', upTo: '2' }, '2026-11-06T20:00:00.000Z'));
  const legacy = teamEvent(founder, { kind: 'note.add', noteId: 'n0', text: 'vor GAME-06', tag: 'info' }, '2026-11-01T20:00:00.000Z');
  const signedRole = await signEvent(key, 'team_vec', teamEvent(founder, { kind: 'member.role', member: 'b_ben', role: 'meister' }, '2026-11-06T21:00:00.000Z'));
  const forged = teamEvent(founder, { kind: 'member.role', member: 'b_mallory', role: 'meister' }, '2026-11-07T10:00:00.000Z');
  const anna = teamEvent('b_anna', { kind: 'section.claim', section: 's1' }, '2026-11-07T11:00:00.000Z');
  const rows = [legacy, oldTrust, signedRole, forged, anna].map((event, i) => ({ event, seq: String(i + 1) }));
  assert.deepEqual(await upgradeTrust(team, rows, key, verifyEvent), { upTo: '5', except: [forged.id] });
  // Without an earlier confirmation everything unsigned is history from before signatures; only broken signatures go.
  const broken = { ...signedRole, role: 'leitung' };
  assert.deepEqual(await upgradeTrust(team, [legacy, broken, anna].map((event, i) => ({ event, seq: String(i + 1) })), key, verifyEvent), { upTo: '3', except: [broken.id] });
});

test('the Bauleitung goes live with the admin key as author; members exchange the invitation for an own key', async () => {
  const core = new RoomCore(new MemoryStore());
  let lead = createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_live9', at: '2026-11-07T19:00:00Z' });
  lead = { ...lead, events: [teamEvent('bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'Start' }, t())] };
  const keys = await core.create({ room: 'r_live09', teamId: lead.teamId, name: lead.name, founder: lead.founder });
  lead = goLive(lead, { url: 'https://r.example', room: keys.room, key: keys.memberKey, adminKey: keys.adminKey }, 'dev_lead01');
  const leadSession = await core.session(lead.live.adminKey);
  assert.deepEqual(core.append({ batch: 'up1', events: lead.events }, leadSession).accepted.length, 1);
  const anna = await core.join({ member: 'bld_anna', label: 'Planer' });
  // With her own key the room knows her; her mod gets another device key; nobody uses the invitation to write any more.
  const sa = await core.session(anna.key);
  const step = teamEvent('bld_anna', { kind: 'section.claim', section: 'sec_a' }, t());
  assert.deepEqual(core.append({ batch: 'an1', events: [step] }, sa).accepted, [step.id]);
  assert.equal(core.info().identity.checkedFrom, '1');
});
