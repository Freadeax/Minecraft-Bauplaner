import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readServerInfo, readServerClaim, readServerStatus, nextSeq, controlBody, signControl, controlMessage, settingsProblem, SERVER_WAY_TEXT,
} from '../../../dist/domain/src/index.js';

// LINK-01: same vector as LinkCoreTest.signatureMatchesTheWebsite in the Paper plugin.
test('signature matches the plugin (HMAC-SHA-256, base64url)', async () => {
  const sig = await signControl('abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', 'own_test', 1730682000000, '{"server":"srv_test01","op":"status"}');
  assert.equal(sig, 'Z4xxwD4_0cRGwTx6-G-LN_A1h2PzwaSBK_LsXLMOxYo');
});

test('control body names the server and the operation; seq always grows', async () => {
  assert.equal(controlBody('srv_test01', 'status'), '{"server":"srv_test01","op":"status"}');
  assert.equal(JSON.parse(controlBody('srv_test01', 'config', { set: { 'team.schutz': 'sperren' }, op: 'forget', server: 'srv_other' })).server, 'srv_test01', 'fields cannot override server/op');
  assert.throws(() => controlBody('srv_test01', 'befehl'));
  const pairing = { serverId: 'srv_test01', name: 'LMNT', owner: 'own_test', key: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', seq: 5000, at: '' };
  assert.equal(nextSeq(pairing, 1000), 5001);
  assert.equal(nextSeq(pairing, 9000), 9000);
  const { message, pairing: next } = await controlMessage(pairing, 'status', {}, 1730682000000);
  assert.equal(message.sig, 'Z4xxwD4_0cRGwTx6-G-LN_A1h2PzwaSBK_LsXLMOxYo');
  assert.equal(next.seq, 1730682000000);
});

test('readers accept the mod and plugin answers and reject broken ones', () => {
  const info = readServerInfo({ link: 'live', linkText: 'live mit dem Server', allowed: true,
    server: { serverId: 'srv_abcdefgh', name: 'LMNT', paired: false, canClaim: true, plugin: '0.12.0', minecraft: '26.3', protocol: 1 } });
  assert.equal(info.way, 'live');
  assert.equal(info.server.canClaim, true);
  assert.equal(readServerInfo({ link: 'ask', allowed: false }).server, null);
  assert.equal(readServerInfo({ link: 'quatsch' }).way, 'none');
  assert.ok(SERVER_WAY_TEXT.ask.includes('Teambau erlauben'));
  const claim = readServerClaim({ serverId: 'srv_abcdefgh', name: 'LMNT', paired: true, owner: 'own_abcdef', key: 'k'.repeat(43) }, new Date('2026-11-04T02:00:00Z'));
  assert.deepEqual(claim, { serverId: 'srv_abcdefgh', name: 'LMNT', owner: 'own_abcdef', key: 'k'.repeat(43), seq: 0, at: '2026-11-04T02:00:00.000Z' });
  assert.throws(() => readServerClaim({ serverId: 'srv_abcdefgh', name: 'x', owner: 'own_abcdef', key: 'kurz' }));
  assert.throws(() => readServerClaim({ serverId: 'kaputt', name: 'x', owner: 'own_abcdef', key: 'k'.repeat(43) }));
  const status = readServerStatus({ serverId: 'srv_abcdefgh', name: 'LMNT', plugin: '0.12.0', minecraft: '26.3', owners: [{ id: 'own_abcdef', name: 'Planer', seq: 3 }],
    settings: { 'team.schutz': 'hinweis', 'team.nachweis': true, 'max-chunks': 4096, bad: {} },
    schema: [{ key: 'team.schutz', kind: 'choice', label: 'Bauen in fremden Abschnitten', choices: ['hinweis', 'sperren', 'aus'] }, { key: 'max-chunks', kind: 'int', label: 'Chunks', min: 0, max: 65536 }, { key: 'x', kind: 'farbe', label: 'nein' }],
    teams: [{ teamId: 'team_a', name: 'Burg', events: 12, sections: 4 }], rooms: ['Burg: live'], plans: ['burg.schem'], worlds: ['minecraft:overworld'], online: 2 });
  assert.equal(status.schema.length, 2);
  assert.equal(status.settings.bad, undefined);
  assert.equal(status.teams[0].sections, 4);
  assert.equal(settingsProblem(status.schema, { 'team.schutz': 'sperren', 'max-chunks': 10 }), null);
  assert.match(settingsProblem(status.schema, { 'team.schutz': 'weg' }), /hinweis/);
  assert.match(settingsProblem(status.schema, { 'max-chunks': 70000 }), /bis 65536/);
  assert.match(settingsProblem(status.schema, { 'team.kanal': false }), /Unbekannte/);
});

test('another device: invite link carries owner key and team room in the fragment, is checked when read', async () => {
  const { deviceInviteLink, readDeviceInvite, readServerRoom } = await import('../../../dist/domain/src/index.js');
  const room = { url: 'https://bauplaner-team.example.workers.dev/', room: 'r_abcdef123456', key: 'memberkey_0123456789abcdef' };
  const link = deviceInviteLink('https://freadeax.github.io/Minecraft-Bauplaner/#/mod', { serverId: 'srv_test01', name: 'LMNT „Burg“', owner: 'own_ipad01', key: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', room });
  assert.match(link, /^https:\/\/freadeax\.github\.io\/Minecraft-Bauplaner\/#\/mod\?geraet=[A-Za-z0-9_-]+$/);
  const p = readDeviceInvite(link, new Date('2026-11-04T10:00:00Z'));
  assert.deepEqual(p, { serverId: 'srv_test01', name: 'LMNT „Burg“', owner: 'own_ipad01', key: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', seq: 0, at: '2026-11-04T10:00:00.000Z', room: { ...room, url: 'https://bauplaner-team.example.workers.dev' } });
  assert.equal(readDeviceInvite(link.slice(link.indexOf('?') + 1)).owner, 'own_ipad01', 'reads the search part too');
  assert.equal(readDeviceInvite(deviceInviteLink('https://x/', { serverId: 'srv_test01', name: 'A', owner: 'own_ipad01', key: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG' })).room, undefined);
  assert.throws(() => readDeviceInvite('https://x/#/mod?geraet=%%%'), /beschädigt/);
  assert.throws(() => readDeviceInvite('https://x/#/mod'), /fehlt/);
  assert.equal(readServerRoom({ ...room, room: 'kein_raum' }), null);
  assert.equal(readServerRoom({ ...room, url: 'javascript:alert(1)' }), null);
});
