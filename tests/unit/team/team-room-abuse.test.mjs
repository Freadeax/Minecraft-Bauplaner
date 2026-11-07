// P1 Härtung (07.11.2026, docs/architecture/team/TEAM_LIVE.md §15): abuse protection of the Team-Raum – body sizes
// enforced while reading, Herkunft of browsers, token buckets, creation windows. The live probe is
// scripts/team/team_room_abuse_smoke.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ABUSE, Buckets, clientAddress, countCreation, originAllowed, readBytes, readJson } from '../../../services/team-room/src/guard.js';
import { RoomError } from '../../../services/team-room/src/core.js';

const streamed = (parts, headers = {}) => new Request('https://room/x', { method: 'POST', headers, duplex: 'half',
  body: new ReadableStream({ pull(c) { const p = parts.shift(); if (p) c.enqueue(p); else c.close(); } }) });

test('bodies: Content-Length over the limit is refused unread, a stream stops at the first byte over it', async () => {
  await assert.rejects(readBytes(new Request('https://room/x', { method: 'POST', body: 'x'.repeat(100) }), 50), e => e instanceof RoomError && e.status === 413);
  let pulled = 0;
  const parts = Array.from({ length: 50 }, () => new Uint8Array(1000));
  const req = new Request('https://room/x', { method: 'POST', duplex: 'half', body: new ReadableStream({ pull(c) { pulled++; const p = parts.shift(); if (p) c.enqueue(p); else c.close(); } }) });
  await assert.rejects(readBytes(req, 2500), /größer als/);
  assert.ok(pulled <= 4, `nur bis zur Grenze gelesen (${pulled} Teile)`);
  assert.equal((await readBytes(streamed([new Uint8Array(10), new Uint8Array(5)]), 15)).length, 15);
  assert.deepEqual(await readJson(new Request('https://room/x', { method: 'POST', body: '' }), 10, { empty: true }), {});
  await assert.rejects(readJson(new Request('https://room/x', { method: 'POST', body: '{kaputt' }), 100), SyntaxError);
  assert.ok(ABUSE.body.events >= 200 * 4096, 'ein voller Stapel passt');
});

test('origin: planner pages and local ports yes, foreign pages and look-alikes no, apps without Origin yes', () => {
  for (const o of ['https://freadeax.github.io', 'https://bauplaner.pages.dev', 'http://127.0.0.1:4389', 'http://localhost:5173', '']) assert.ok(originAllowed(o), o);
  for (const o of ['https://boese.example', 'https://freadeax.github.io.boese.example', 'http://localhost.boese.example', 'http://localhost:abc', 'null', 'https://bauplaner.pages.dev.evil'])
    assert.equal(originAllowed(o), false, o);
  assert.ok(originAllowed('https://mein-planer.example', 'https://mein-planer.example, https://zwei.example'));
});

test('addresses: IPv4 as is, IPv6 by /64', () => {
  const r = ip => new Request('https://x', { headers: { 'CF-Connecting-IP': ip } });
  assert.equal(clientAddress(r('203.0.113.7')), '203.0.113.7');
  assert.equal(clientAddress(r('2001:db8:1:2:aaaa::1')), '2001:db8:1:2::/64');
  assert.equal(clientAddress(r('2001:DB8:1:2:bbbb::9')), '2001:db8:1:2::/64');
  assert.equal(clientAddress(new Request('https://x')), 'unbekannt');
});

test('buckets: burst, refill, separate keys, bounded memory', () => {
  const b = new Buckets({ burst: 3, perSecond: 1 }, 10);
  const t = 1_000_000;
  assert.deepEqual([b.take('a', t), b.take('a', t), b.take('a', t), b.take('a', t)], [true, true, true, false]);
  assert.ok(b.take('b', t), 'anderer Schlüssel eigener Eimer');
  assert.equal(b.retryAfter('a'), 1);
  assert.ok(b.take('a', t + 1000), 'nach einer Sekunde wieder ein Platz');
  assert.equal(b.take('a', t + 1000), false);
  for (let i = 0; i < 50; i++) b.take(`k${i}`, t + 2000);
  assert.ok(b.map.size <= 10);
});

test('room creation: per hour and per day, then a new window', () => {
  const limits = { perHour: 2, perDay: 3 };
  const h = 3_600_000, t0 = Date.parse('2026-11-07T10:00:00Z');
  let s, r;
  r = countCreation(s, t0, limits); assert.ok(r.ok); s = r.state;
  r = countCreation(s, t0 + 1, limits); assert.ok(r.ok); s = r.state;
  r = countCreation(s, t0 + 2, limits); assert.equal(r.ok, false); assert.ok(r.retryAfter > 3000 && r.retryAfter <= 3600);
  r = countCreation(r.state, t0 + h, limits); assert.ok(r.ok, 'neue Stunde'); s = r.state;
  r = countCreation(s, t0 + 2 * h, limits); assert.equal(r.ok, false, 'Tagesgrenze'); assert.ok(r.retryAfter > 3600);
  r = countCreation(r.state, t0 + 24 * h, limits); assert.ok(r.ok, 'neuer Tag');
});

test('worker: every route reads its body with a limit, retention counts only authorized use, create is internal', () => {
  const src = readFileSync(new URL('../../../services/team-room/src/index.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /request\.(json|text|arrayBuffer)\(\)/, 'kein ungebremstes Lesen');
  assert.doesNotMatch(src, /if \(this\.core\.created\) await this\.activity\(\)/, 'keine Verlängerung ohne Schlüssel');
  assert.match(src, /parts\[3\] === 'create'/);
  assert.match(src, /sweepUnauthed/);
  const toml = readFileSync(new URL('../../../services/team-room/wrangler.toml', import.meta.url), 'utf8');
  assert.match(toml, /class_name = "RoomGate"/); assert.match(toml, /tag = "v3"/);
});
