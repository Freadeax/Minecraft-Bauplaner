// Checked storage chests (COOP-05, docs/architecture/LAGERKISTEN.md): the planner fold must follow the
// plugin (StoreIndex.java) rule by rule – expected content, deviations until a seal, bookings per member.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTeam, teamEvent, appendEvents, teamView, checkTeamEvent, canTeam, eventLabel } from '../dist/domain/src/index.js';

const ctx = { sections: [{ id: 'sec_a', name: 'Fundament' }], builders: [{ id: 'bld_phil', name: 'Philipp' }, { id: 'bld_anna', name: 'Anna' }, { id: 'bld_ben', name: 'Ben' }] };
let clock = Date.parse('2026-11-03T10:00:00Z');
const t = () => new Date(clock += 60_000).toISOString();
const ev = (by, body) => teamEvent(by, body, t());
const srv = (by, body) => teamEvent(by, body, t(), 'server');
const base = () => createTeam({ name: 'Lager', founder: 'bld_phil', teamId: 'team_lager01', at: '2026-11-03T09:00:00Z' });
const sha = 'a'.repeat(64);
const store = v => v.stores.find(s => s.id === 'c1');

test('mark, configure, count, book, deviate, seal', () => {
  const team = appendEvents(base(), [
    ev('bld_phil', { kind: 'member.role', member: 'bld_ben', role: 'meister' }),
    ev('bld_ben', { kind: 'store.chest', chest: 'c1', name: 'Stein Nord', pos: [10, 64, -3], dimension: 'minecraft:overworld' }),
    ev('bld_ben', { kind: 'store.config', chest: 'c1', section: 'sec_a', purpose: 'eingang', pos2: [11, 64, -3] }),
    srv('bld_ben', { kind: 'store.count', chest: 'c1', items: [{ item: 'minecraft:stone', count: 64 }] }),
    srv('bld_phil', { kind: 'store.check', chest: 'c1', status: 'geprueft', sha256: sha }),
    srv('bld_anna', { kind: 'store.move', chest: 'c1', in: [{ item: 'minecraft:stone', count: 10 }], out: [{ item: 'minecraft:stone', count: 2 }], via: 'spieler' }),
    srv('bld_anna', { kind: 'store.count', chest: 'c1', items: [{ item: 'minecraft:stone', count: 72 }] }),
    srv('bld_phil', { kind: 'store.move', chest: 'c1', in: [{ item: 'minecraft:iron_ingot', count: 3 }], via: 'trichter' }),
    srv('bld_phil', { kind: 'store.check', chest: 'c1', status: 'abweichend', sha256: sha, diff: [{ item: 'minecraft:dirt', delta: 5 }] }),
    srv('bld_phil', { kind: 'store.check', chest: 'c1', status: 'geprueft', sha256: sha }),
  ]);
  const v = teamView(team, ctx);
  assert.equal(v.rejected.length, 0, JSON.stringify(v.rejected.map(r => r.reason)));
  const c = store(v);
  assert.equal(c.section, 'sec_a'); assert.equal(c.purpose, 'eingang'); assert.deepEqual(c.pos2, [11, 64, -3]);
  assert.equal(c.status, 'abweichend', 'a deviation stays until a seal');
  assert.deepEqual(c.deviation, { 'minecraft:dirt': 5 });
  assert.deepEqual(c.movedIn, { bld_anna: { 'minecraft:stone': 10 } });
  assert.deepEqual(c.movedOut, { bld_anna: { 'minecraft:stone': 2 } });
  assert.deepEqual(c.hopperIn, { 'minecraft:iron_ingot': 3 });
  // store.move is attribution only: stored/taken still come from the count differences (COOP-04).
  assert.deepEqual(v.members.find(m => m.id === 'bld_anna').stored, { 'minecraft:stone': 8 });
  const sealed = teamView(appendEvents(team, [ev('bld_ben', { kind: 'store.seal', chest: 'c1', sha256: sha, note: 'aufgeräumt' })]), ctx);
  assert.equal(store(sealed).status, 'geprueft'); assert.deepEqual(store(sealed).deviation, {}); assert.equal(store(sealed).sealedBy, 'bld_ben');
});

test('rights and origin: Helfer may not seal or configure, moves and checks only from the server', () => {
  const team = appendEvents(base(), [
    ev('bld_phil', { kind: 'store.chest', chest: 'c1', name: 'Lager', pos: [0, 0, 0], dimension: 'minecraft:overworld' }),
    ev('bld_anna', { kind: 'store.seal', chest: 'c1', sha256: sha }),
    ev('bld_anna', { kind: 'store.config', chest: 'c1', protection: 'offen' }),
    ev('bld_anna', { kind: 'store.move', chest: 'c1', in: [{ item: 'minecraft:stone', count: 1 }], via: 'spieler' }),
    ev('bld_phil', { kind: 'store.check', chest: 'c1', status: 'geprueft' }),
    srv('bld_phil', { kind: 'store.check', chest: 'c9', status: 'fehlt' }),
  ]);
  const v = teamView(team, ctx);
  assert.equal(v.rejected.length, 5);
  assert.equal(store(v).status, 'ungeprueft');
  assert.ok(canTeam('meister', 'store.seal') && !canTeam('helfer', 'store.seal'));
});

test('validation of the new kinds; a missing chest and its removal', () => {
  assert.throws(() => checkTeamEvent({ id: 'x', at: t(), by: 'b', origin: 'server', kind: 'store.check', chest: 'c', status: 'kaputt' }), /Prüfstatus/);
  assert.throws(() => checkTeamEvent({ id: 'x', at: t(), by: 'b', origin: 'server', kind: 'store.config', chest: 'c', protection: 'tresor' }), /Schutzstufe/);
  assert.throws(() => checkTeamEvent({ id: 'x', at: t(), by: 'b', origin: 'server', kind: 'store.move', chest: 'c', via: 'zauber' }), /Weg/);
  assert.throws(() => checkTeamEvent({ id: 'x', at: t(), by: 'b', origin: 'server', kind: 'store.seal', chest: 'c', sha256: 'kurz' }), /Prüfsumme/);
  checkTeamEvent({ id: 'x', at: t(), by: 'b', origin: 'server', kind: 'store.config', chest: 'c', section: '', pos2: null });
  const team = appendEvents(base(), [
    ev('bld_phil', { kind: 'store.chest', chest: 'c1', name: 'Fass', pos: [1, 2, 3], dimension: 'minecraft:overworld' }),
    srv('bld_phil', { kind: 'store.check', chest: 'c1', status: 'fehlt' }),
  ]);
  assert.equal(store(teamView(team, ctx)).status, 'fehlt');
  const gone = appendEvents(team, [ev('bld_phil', { kind: 'store.chest', chest: 'c1', name: 'Fass', pos: [1, 2, 3], dimension: 'minecraft:overworld', remove: true })]);
  assert.equal(teamView(gone, ctx).stores.length, 0);
  assert.equal(eventLabel({ kind: 'store.seal', chest: 'c1', sha256: sha }), 'Lager gesiegelt');
});

test('yield store: purpose ertrag, farm link, store.yield only from the server, per period and in total (COOP-08)', () => {
  const team = appendEvents(base(), [
    ev('bld_phil', { kind: 'store.chest', chest: 'c1', name: 'Kürbistruhe', pos: [10, 64, -3], dimension: 'minecraft:overworld' }),
    ev('bld_phil', { kind: 'store.config', chest: 'c1', purpose: 'ertrag', farm: 'farm_k' }),
    srv('bld_phil', { kind: 'store.yield', chest: 'c1', farm: 'farm_k', items: [{ item: 'minecraft:pumpkin', count: 30 }], from: '2026-11-03T10:00:00.000Z', until: '2026-11-03T10:30:00.000Z', minutes: 30 }),
    srv('bld_phil', { kind: 'store.yield', chest: 'c1', items: [{ item: 'minecraft:pumpkin', count: 12 }], from: '2026-11-03T10:30:00.000Z', until: '2026-11-03T11:00:00.000Z', minutes: 12 }),
    ev('bld_phil', { kind: 'store.yield', chest: 'c1', items: [{ item: 'minecraft:pumpkin', count: 999 }], from: '2026-11-03T11:00:00.000Z', until: '2026-11-03T11:30:00.000Z', minutes: 30 }),
    srv('bld_phil', { kind: 'store.yield', chest: 'nope', items: [], from: '2026-11-03T11:00:00.000Z', until: '2026-11-03T11:30:00.000Z', minutes: 30 }),
  ]);
  const v = teamView(team, ctx);
  assert.equal(v.rejected.length, 2, 'planner-written yield and unknown chest are rejected');
  const c = store(v);
  assert.equal(c.purpose, 'ertrag'); assert.equal(c.farm, 'farm_k');
  assert.deepEqual(c.yieldIn, { 'minecraft:pumpkin': 42 }); assert.equal(c.yieldMinutes, 42);
  assert.deepEqual(v.yields.map(y => [y.farm, y.items['minecraft:pumpkin'], y.minutes, y.chestName]), [['farm_k', 30, 30, 'Kürbistruhe'], ['farm_k', 12, 12, 'Kürbistruhe']], 'farm of the store when the event names none');
  const unlinked = teamView(appendEvents(team, [ev('bld_phil', { kind: 'store.config', chest: 'c1', farm: '' })]), ctx);
  assert.equal(store(unlinked).farm, undefined);
  assert.throws(() => checkTeamEvent({ ...srv('bld_phil', { kind: 'store.yield', chest: 'c1', items: [], from: 'x', until: 'y', minutes: 1 }) }));
  assert.throws(() => checkTeamEvent({ ...srv('bld_phil', { kind: 'store.yield', chest: 'c1', items: [], from: '2026-11-03T10:00:00.000Z', until: '2026-11-03T10:30:00.000Z', minutes: -1 }) }));
  assert.match(eventLabel(team.events[2]), /Ertrag gemessen \(30 Items in 30 min\)/);
});
