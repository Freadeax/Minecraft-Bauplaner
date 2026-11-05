import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planScanRoutes, scanRouteSummary } from '../../../dist/domain/src/index.js';

const base = { projectId: 'prj_burg', mod: null, room: { connected: false, games: 0 }, server: { paired: false } };

test('FALLBACK-01: Reihenfolge Client zuerst – eigenes Spiel, Team-Raum, Server', () => {
  const all = planScanRoutes({ ...base, mod: { paired: true }, room: { connected: true, games: 2 }, server: { paired: true } });
  assert.deepEqual(all.map(r => r.id), ['mod', 'room', 'server']);
  assert.ok(all.every(r => r.available));
});

test('FALLBACK-01: jeder nicht mögliche Weg nennt den Grund', () => {
  const none = planScanRoutes(base);
  assert.ok(none.every(r => !r.available && r.why));
  assert.match(none[0].why, /nicht mit dem Planer verbunden/);
  assert.match(none[1].why, /Team live/);
  assert.match(none[2].why, /freiwillig/);
  const noGame = planScanRoutes({ ...base, room: { connected: true, games: 0 } });
  assert.match(noGame[1].why, /kein Spiel/);
});

test('FALLBACK-01: Mod nach hello – zu alt, anderer Plan, kein Plan, passender Plan', () => {
  const at = mod => planScanRoutes({ ...base, mod })[0];
  assert.match(at({ paired: true, features: ['marks2'] }).why, /zu alt/);
  assert.match(at({ paired: true, features: ['scan'], hologramProjectId: 'prj_andere' }).why, /anderer Plan/);
  assert.match(at({ paired: true, features: ['scan'], hologramProjectId: null }).why, /kein Plan/);
  assert.equal(at({ paired: true, features: ['scan'], hologramProjectId: 'prj_burg' }).available, true);
  // Before the hello nothing is known yet: try it.
  assert.equal(at({ paired: true }).available, true);
});

test('FALLBACK-01: Zusammenfassung nennt den Weg und was vorher nicht ging', () => {
  assert.match(scanRouteSummary('room', [{ id: 'mod', why: 'Minecraft läuft nicht' }]), /über Spiele im Team-Raum .*Vorher versucht: dein Spiel auf diesem PC: Minecraft läuft nicht/);
  assert.match(scanRouteSummary(null, [{ id: 'server', why: 'offline' }]), /Kein Weg hat geklappt.*importieren/);
});
