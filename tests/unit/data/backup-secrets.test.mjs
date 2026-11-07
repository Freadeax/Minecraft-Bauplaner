// BACKUP-03 (docs/architecture/team/TEAM_ACCESS.md): backups without Team-Raum keys, the sealed „Team-Zugang“,
// the change of the admin key in the room and the new confirmation of the room's past for the server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, MemoryStore } from '../../../services/team-room/src/core.js';
import {
  createBackup, serializeBackup, readBackup, planRestore, buildRestore, createSampleLibrary, createProject, applyOperation, emptySite, siteOf,
  createTeam, teamEvent, goLive, appendLocal, nextBatch, confirm, ingest, deriveSignKey, signEvent, canonicalJson, sha256Hex,
  hasTeamAccess, withoutTeamAccess, teamAccessOf, sealTeamAccess, openTeamAccess, peekTeamAccess, restoreTeamAccess, retrustAfterRekey, numberPage,
  recordFingerprint, receiptForBackup, compareWithBackups, emptyLedger, addReceipt, BACKUP_FORMAT,
} from '../../../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const source = projects => ({ projects, assets: lib.assets, versions, getOriginal: async () => null });
const URL_ = 'https://bauplaner-team.example.workers.dev';
let clock = Date.parse('2026-11-07T19:00:00Z');
const t = () => new Date(clock += 60_000).toISOString();

async function liveProject(name = 'Burgmauer') {
  const room = new RoomCore(new MemoryStore());
  const team = createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_sec02', at: '2026-11-07T18:00:00Z' });
  const keys = await room.create({ room: 'r_sec02a', teamId: team.teamId, name: team.name });
  const live = goLive({ ...team, self: 'bld_phil' }, { url: URL_, room: keys.room, key: keys.memberKey, adminKey: keys.adminKey, serverKey: keys.serverKey }, 'dev_lead01');
  const p = applyOperation(createProject({ name }), { kind: 'site.set', site: { ...emptySite(), team: live }, label: 'Team' }).project;
  return { project: { ...p, revision: 2 }, keys, room };
}
const secretsOf = keys => [keys.memberKey, keys.adminKey, keys.serverKey];

test('project and full backups hold no member, admin or server key; the team log itself stays', async () => {
  const { project, keys } = await liveProject();
  assert.equal(hasTeamAccess(project), true);
  for (const scope of ['project', 'all']) {
    const text = serializeBackup(await createBackup(source([project]), scope, [project.id]));
    for (const k of secretsOf(keys)) assert.equal(text.includes(k), false, `${scope}: key ${k.slice(0, 4)}… must not be in the file`);
    assert.doesNotMatch(text, /"adminKey"|"serverKey"|"live"/, `${scope}: no live block`);
    const back = await readBackup(text);
    assert.equal(back.projects[0].site.team.teamId, 'team_sec02', 'team log kept');
    assert.equal(back.projects[0].site.team.self, 'bld_phil', 'own identity kept');
    assert.equal(back.projects[0].site.team.live, undefined);
    assert.deepEqual(back.teamAccessIn, []);
  }
});

test('restoring a key-free backup over the live project: same content, replace keeps the local access', async () => {
  const { project } = await liveProject();
  const backup = await readBackup(serializeBackup(await createBackup(source([project]), 'project', [project.id])));
  const target = { projects: [project], assets: lib.assets, versionIds: new Set(versions.keys()), originalHashes: new Set() };
  assert.equal(planRestore(backup, target).projects[0].status, 'same', 'missing keys are no difference');
  const changed = { ...project, name: 'Burgmauer neu', revision: 5 };
  const plan = planRestore(backup, { ...target, projects: [changed] });
  assert.equal(plan.projects[0].status, 'differs');
  const write = buildRestore(plan, { [project.id]: 'replace' });
  assert.deepEqual(write.projects[0].project.site.team.live, project.site.team.live, 'working room connection not thrown away');
  assert.equal(write.projects[0].baseRevision, 5);
});

test('an older backup with keys is still read, and the restore warns about it', async () => {
  const { project } = await liveProject('Alte Burg');
  // Build a file the way the app wrote it before BACKUP-03: projects with their live block, hash over that content.
  const file = await createBackup(source([project]), 'project', [project.id]);
  const content = { projects: [project], assets: file.assets, versions: file.versions, originals: file.originals };
  const old = { ...file, projects: [project], contentSha256: await sha256Hex(canonicalJson(content)) };
  assert.equal(old.format, BACKUP_FORMAT);
  const back = await readBackup(JSON.stringify(old));
  assert.deepEqual(back.teamAccessIn, ['Alte Burg']);
  const write = buildRestore(planRestore(back, { projects: [], assets: [], versionIds: new Set(), originalHashes: new Set() }));
  assert.ok(write.summary.some(s => /Zugangsschlüssel eines Team-Raums \(„Alte Burg“\).*Verwaltungsschlüssel wechseln/.test(s)), write.summary.join('\n'));
});

test('backup reminder: the moving read position of the room is no change of the project', async () => {
  const { project } = await liveProject();
  const file = await createBackup(source([project]), 'project', [project.id]);
  const moved = { ...project, site: { ...project.site, team: { ...project.site.team, live: { ...project.site.team.live, cursor: '42' } } } };
  assert.equal(await recordFingerprint(moved), await recordFingerprint(withoutTeamAccess(project)));
  const ledger = addReceipt(emptyLedger(), await receiptForBackup(file, 'download', 'x.json'));
  const status = await compareWithBackups(ledger, { projects: [moved], assets: [], collections: [], templates: [] });
  assert.equal(status.lines.find(l => l.id === project.id).state, 'current');
});

test('Team-Zugang: sealed with a password, header readable, wrong password and changes refused, restore goes live again', async () => {
  const { project, keys } = await liveProject();
  const access = teamAccessOf(project);
  const text = await sealTeamAccess(access, 'Burgmauer-2026!', 100_000);
  for (const k of secretsOf(keys)) assert.equal(text.includes(k), false, 'keys only encrypted');
  assert.deepEqual({ ...peekTeamAccess(text), createdAt: '' }, { teamId: 'team_sec02', teamName: 'Burg', createdAt: '' });
  const opened = await openTeamAccess(text, 'Burgmauer-2026!');
  assert.equal(opened.adminKey, keys.adminKey); assert.equal(opened.serverKey, keys.serverKey); assert.equal(opened.key, keys.memberKey);
  await assert.rejects(() => openTeamAccess(text, 'falsches-passwort'), /Passwort falsch oder Datei verändert/);
  const raw = JSON.parse(text);
  await assert.rejects(() => openTeamAccess(JSON.stringify({ ...raw, teamId: 'team_other' }), 'Burgmauer-2026!'), /Passwort falsch oder Datei verändert/, 'team id is bound into the seal');
  await assert.rejects(() => openTeamAccess(JSON.stringify({ ...raw, kdf: { ...raw.kdf, iterations: 10 } }), 'Burgmauer-2026!'), /Rundenzahl/);
  await assert.rejects(() => sealTeamAccess(access, 'kurz'), /mindestens 10 Zeichen/);
  await assert.rejects(() => openTeamAccess('{"format":"x"}', 'egal-egal-egal'), /keine Team-Zugang-Datei/);
  // After a restore from a key-free backup the project is offline; the access file brings it back into the room.
  const offline = withoutTeamAccess(project).site.team;
  const back = restoreTeamAccess(offline, opened, 'dev_new001');
  assert.equal(back.live.room, 'r_sec02a'); assert.equal(back.live.adminKey, keys.adminKey); assert.equal(back.live.cursor, '');
  assert.deepEqual(back.live.pending, offline.events.map(e => e.id), 'own log offered again (room answers known)');
  assert.throws(() => restoreTeamAccess({ ...offline, teamId: 'team_other' }, opened, 'dev_new001'), /gehört zum Team/);
});

test('room: the admin key can be changed; the old one is refused, member and server keys stay', async () => {
  const room = new RoomCore(new MemoryStore());
  const keys = await room.create({ room: 'r_sec02b', teamId: 'team_sec02', name: 'Burg' });
  const { adminKey } = await room.rotate('admin');
  assert.ok(adminKey && adminKey !== keys.adminKey);
  await assert.rejects(() => room.auth(keys.adminKey, 'admin'), /passt nicht/);
  await assert.rejects(() => room.auth(keys.adminKey), /passt nicht/, 'old admin key is no key at all');
  assert.equal(await room.auth(adminKey, 'admin'), 'admin');
  assert.equal(await room.auth(keys.memberKey), 'member');
  assert.equal(await room.auth(keys.serverKey, 'server'), 'server');
});

test('after the change the new confirmation reaches up to the first event the server had refused, never further', async () => {
  const room = new RoomCore(new MemoryStore());
  const team = createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_sec02c', at: '2026-11-07T18:00:00Z' });
  const keys = await room.create({ room: 'r_sec02c', teamId: team.teamId, name: team.name });
  const oldSign = await deriveSignKey(keys.adminKey);
  const put = async (e, sign = false) => { room.append({ batch: `b_${e.id}`, events: [sign ? await signEvent(oldSign, team.teamId, e) : e] }); };
  // Past before signatures, then the signed confirmation (team.trust up to 2), a signed role change, a member note.
  await put(teamEvent('bld_anna', { kind: 'member.join', member: 'bld_anna', name: 'Anna' }, t()));
  await put(teamEvent('bld_phil', { kind: 'note.add', noteId: 'n1', text: 'Start', tag: 'info' }, t()));
  await put(teamEvent('bld_phil', { kind: 'team.trust', upTo: '2' }, t()), true);
  await put(teamEvent('bld_phil', { kind: 'member.role', member: 'bld_anna', role: 'meister' }, t()), true);
  await put(teamEvent('bld_anna', { kind: 'note.add', noteId: 'n2', text: 'Fertig', tag: 'info' }, t()));
  const read = () => { const f = room.since('', 500); return numberPage(f.events, f.cursor); };
  let plan = await retrustAfterRekey(read(), team, oldSign);
  assert.deepEqual(plan, { upTo: 5, oldUpTo: 2, lostSigned: 0 }, 'nothing refused: the whole past');
  // A forgery: a member writes a role change in the Bauleitung's name without signature (seq 6), later a good note.
  await put(teamEvent('bld_phil', { kind: 'member.role', member: 'bld_anna', role: 'leitung' }, t()));
  await put(teamEvent('bld_anna', { kind: 'note.add', noteId: 'n3', text: 'Weiter', tag: 'info' }, t()));
  await put(teamEvent('bld_phil', { kind: 'team.protect', mode: 'sperren' }, t()), true);
  plan = await retrustAfterRekey(read(), team, oldSign);
  assert.equal(plan.upTo, 5, 'stops before the forgery');
  assert.equal(plan.firstRefused.seq, 6);
  assert.match(plan.firstRefused.reason, /im Namen der Bauleitung/);
  assert.equal(plan.lostSigned, 1, 'the later signed protection must be set again');
  // A room without any old confirmation: the server did not filter yet, the whole past counts.
  const fresh = await retrustAfterRekey(read().filter(x => x.event.kind !== 'team.trust'), team, oldSign);
  assert.equal(fresh.oldUpTo, -1); assert.equal(fresh.upTo, 8);
});

test('player name rule: a second name for a bound member after the confirmation stops the new confirmation', async () => {
  const team = { teamId: 'team_sec02d', founder: 'bld_phil' };
  const sign = await deriveSignKey('A'.repeat(43));
  const trust = await signEvent(sign, team.teamId, teamEvent('bld_phil', { kind: 'team.trust', upTo: '1' }, t()));
  const events = [
    { seq: 1, event: teamEvent('bld_anna', { kind: 'member.player', member: 'bld_anna', player: 'AnnaMC' }, t()) },
    { seq: 2, event: trust },
    { seq: 3, event: teamEvent('bld_ben', { kind: 'member.player', member: 'bld_ben', player: 'BenMC' }, t()) },
    { seq: 4, event: teamEvent('bld_ben', { kind: 'member.player', member: 'bld_anna', player: 'BenMC' }, t()) },
  ];
  const plan = await retrustAfterRekey(events, team, sign);
  assert.equal(plan.upTo, 3); assert.equal(plan.firstRefused.seq, 4);
});

test('a live project round trip through backup and Team-Zugang ends in the same room with the same rights', async () => {
  const { project, keys, room } = await liveProject();
  let lead = siteOf(project).team;
  lead = appendLocal(lead, [teamEvent('bld_phil', { kind: 'note.add', noteId: 'n9', text: 'Hallo', tag: 'info' }, t())]);
  let batch; while ((batch = nextBatch(lead))) lead = confirm(lead, room.append(batch)).team;
  const sealed = await sealTeamAccess(teamAccessOf({ name: project.name, site: { ...project.site, team: lead } }), 'zehn-zeichen!', 100_000);
  const restored = (await readBackup(serializeBackup(await createBackup(source([{ ...project, site: { ...project.site, team: lead } }]), 'project', [project.id])))).projects[0];
  assert.equal(restored.site.team.live, undefined);
  let again = restoreTeamAccess(restored.site.team, await openTeamAccess(sealed, 'zehn-zeichen!'), 'dev_new002');
  while ((batch = nextBatch(again))) { const a = room.append(batch); assert.equal(a.added?.length ?? 0, 0, 'room already knows everything'); again = confirm(again, a).team; }
  again = ingest(again, room.since(again.live.cursor)).team;
  assert.equal(await room.auth(again.live.adminKey, 'admin'), 'admin');
  assert.equal(again.events.length, lead.events.length);
  assert.ok(keys.adminKey);
});
