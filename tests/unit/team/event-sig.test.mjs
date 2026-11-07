import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveSignKey, signEvent, verifyEvent, signBatch, canonicalEvent, createTeam, appendEvents, teamEvent, teamView, mergeTeam, checkTeamEvent, serverLink,
} from '../../../dist/domain/src/index.js';

// GAME-06: same vector as EventSigTest (mod core) and EventTrustTest (Paper plugin).
const ADMIN = 'adminKeyForTests_0123456789abcdefXYZ';
const NOTE = { id: 'tev_vec1', at: '2026-11-06T20:00:00.000Z', by: 'b_founder', origin: 'planer', kind: 'note.add', noteId: 'n1', text: 'Grüße "Lea"\nZeile\t2 ✓ 😀', tag: 'info', pos: [12, -3, 70000] };
const PROTECT = { id: 'tev_vec2', at: '2026-11-06T20:00:01.000Z', by: 'b_founder', origin: 'planer', kind: 'team.protect', mode: 'sperren', free: 'team' };

test('signing key and signatures match the Java side', async () => {
  const key = await deriveSignKey(ADMIN);
  assert.equal(key, 'P3ZsF8QJD_CcMeXC544qh4RJFOiwYUxgDc4kJHN6BSA');
  assert.equal(canonicalEvent(NOTE), '{"at":"2026-11-06T20:00:00.000Z","by":"b_founder","id":"tev_vec1","kind":"note.add","noteId":"n1","origin":"planer","pos":[12,-3,70000],"tag":"info","text":"Grüße \\"Lea\\"\\nZeile\\t2 ✓ 😀"}');
  assert.equal((await signEvent(key, 'team_vec', NOTE)).sig, 'uJdu-WGDe5BtEiw7UzdcBYFNBAoWl_yT8t6dwlDjnC4');
  assert.equal((await signEvent(key, 'team_vec', PROTECT)).sig, 'wbupC3LIHBLvjVxV5wCXMcyZrkiO_MgRvvZFxTr5wSY');
});

test('a signature only fits its team, its content and its key', async () => {
  const key = await deriveSignKey(ADMIN);
  const signed = await signEvent(key, 'team_vec', PROTECT);
  assert.equal(await verifyEvent(key, 'team_vec', signed), true);
  assert.equal(await verifyEvent(key, 'team_other', signed), false, 'other team');
  assert.equal(await verifyEvent(key, 'team_vec', { ...signed, mode: 'aus' }), false, 'changed content');
  assert.equal(await verifyEvent(key, 'team_vec', { ...signed, id: 'tev_copy' }), false, 'reused under a new id');
  assert.equal(await verifyEvent(await deriveSignKey('someOtherAdminKey_0123456789abcdef'), 'team_vec', signed), false, 'other key');
  assert.equal(await verifyEvent(key, 'team_vec', PROTECT), false, 'unsigned');
  // Deterministic: signing again (a resend) gives the same text, so the room answers "known".
  assert.deepEqual(await signEvent(key, 'team_vec', signed), signed);
  // Keys with undefined are left out like JSON.stringify does.
  assert.equal((await signEvent(key, 'team_vec', { ...PROTECT, note: undefined })).sig, signed.sig);
});

test('the founder signs only own events; others pass unchanged', async () => {
  const key = await deriveSignKey(ADMIN);
  const team = { teamId: 'team_vec', founder: 'b_founder' };
  const mine = teamEvent('b_founder', { kind: 'member.role', member: 'b_lea', role: 'meister' }, '2026-11-06T20:00:02.000Z');
  const lea = teamEvent('b_lea', { kind: 'section.claim', section: 's1' }, '2026-11-06T20:00:03.000Z');
  const [a, b] = await signBatch(key, team, [mine, lea]);
  assert.match(a.sig, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(b.sig, undefined);
  assert.deepEqual(await signBatch(undefined, team, [mine]), [mine], 'without key nothing changes');
});

test('team.protect and team.trust: Bauleitung only, folded into the view', () => {
  const ctx = { sections: [{ id: 's1', name: 'Turm' }], builders: [{ id: 'b_founder', name: 'Philipp' }, { id: 'b_lea', name: 'Lea' }] };
  let team = createTeam({ teamId: 'team_vec', name: 'Burg', founder: 'b_founder', now: '2026-11-06T19:00:00.000Z' });
  team = appendEvents(team, [teamEvent('b_lea', { kind: 'member.join', member: 'b_lea', name: 'Lea' }, '2026-11-06T19:10:00.000Z')]);
  team = appendEvents(team, [teamEvent('b_lea', { kind: 'team.protect', mode: 'aus' }, '2026-11-06T19:20:00.000Z')]);
  let v = teamView(team, ctx);
  assert.equal(v.protect, null, 'a helper cannot switch the protection off');
  assert.equal(v.rejected.length, 1);
  team = appendEvents(team, [teamEvent('b_founder', { kind: 'team.protect', mode: 'sperren', free: 'team' }, '2026-11-06T19:30:00.000Z'),
    teamEvent('b_founder', { kind: 'team.trust', upTo: '41' }, '2026-11-06T19:31:00.000Z')]);
  v = teamView(team, ctx);
  assert.equal(v.protect.mode, 'sperren');
  assert.equal(v.protect.free, 'team');
  assert.throws(() => checkTeamEvent({ ...PROTECT, mode: 'halb' }));
  assert.throws(() => checkTeamEvent({ ...PROTECT, kind: 'team.trust', upTo: '-1' }));
});

test('the signed copy from the room is the same event, whatever the merge order', async () => {
  const key = await deriveSignKey(ADMIN);
  const base = createTeam({ teamId: 'team_vec', name: 'Burg', founder: 'b_founder', now: '2026-11-06T19:00:00.000Z' });
  const e = teamEvent('b_founder', { kind: 'team.protect', mode: 'hinweis' }, '2026-11-06T19:30:00.000Z');
  const local = appendEvents(base, [e]), room = { ...base, events: [...base.events, await signEvent(key, 'team_vec', e)] };
  const a = mergeTeam(local, room), b = mergeTeam(room, local);
  assert.equal(a.clashes.length, 0); assert.equal(b.clashes.length, 0);
  assert.equal(a.team.events.find(x => x.id === e.id).sig, b.team.events.find(x => x.id === e.id).sig);
  assert.ok(a.team.events.find(x => x.id === e.id).sig, 'the signed copy is kept');
});

test('server link carries the signing key as l, never the admin key', async () => {
  const key = await deriveSignKey(ADMIN);
  const link = serverLink('https://freadeax.github.io/Minecraft-Bauplaner/', { url: 'https://room.example', room: 'r_abcdef' }, 'serverKey_0123456789abcdef', key);
  const q = new URLSearchParams(link.slice(link.indexOf('?') + 1));
  assert.equal(q.get('l'), key);
  assert.ok(!link.includes(ADMIN));
  assert.equal(new URLSearchParams(serverLink('https://x/', { url: 'https://room.example', room: 'r_abcdef' }, 'serverKey_0123456789abcdef').split('?')[1]).get('l'), null);
});
