// PERF-06-S02: Upload-Ordner für Cloudflare Pages = dasselbe Pages-Artefakt unter Minecraft-Bauplaner/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HEADERS, REDIRECTS, stage } from '../../../scripts/pages/publish_cloudflare.mjs';

test('Cloudflare Pages: Artefakt und Mod-Downloads unter dem Projektpfad, Weiterleitung, Cache-Regeln', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'cf-root-'));
  let out;
  try {
    mkdirSync(path.join(root, 'dist-web', 'assets'), { recursive: true });
    mkdirSync(path.join(root, 'downloads', 'mod'), { recursive: true });
    writeFileSync(path.join(root, 'dist-web', 'deployment.json'), '{}');
    writeFileSync(path.join(root, 'dist-web', 'sw.js'), '');
    writeFileSync(path.join(root, 'dist-web', 'assets', 'a-1.js'), 'a');
    writeFileSync(path.join(root, 'downloads', 'mod', 'x.jar'), 'jar');
    out = stage(root);
    for (const f of ['Minecraft-Bauplaner/deployment.json', 'Minecraft-Bauplaner/sw.js', 'Minecraft-Bauplaner/assets/a-1.js', 'Minecraft-Bauplaner/downloads/mod/x.jar', '_headers', '_redirects'])
      assert.ok(existsSync(path.join(out, f)), f);
    assert.equal(readFileSync(path.join(out, '_redirects'), 'utf8'), REDIRECTS);
    assert.match(HEADERS, /\/Minecraft-Bauplaner\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
    assert.match(HEADERS, /\/Minecraft-Bauplaner\/sw\.js\n {2}Cache-Control: no-cache/);
    assert.match(REDIRECTS, /^\/ \/Minecraft-Bauplaner\/ 302$/m);
    rmSync(path.join(root, 'dist-web', 'sw.js'));
    assert.throws(() => stage(root), /dist-web unvollständig/);
  } finally { rmSync(root, { recursive: true, force: true }); if (out) rmSync(out, { recursive: true, force: true }); }
});

test('RELEASE-01: jede Antwort trägt den Browser-Schutz, die Meta-Richtlinie passt zu GitHub Pages', async () => {
  const { SECURITY_HEADERS, CSP_META, CSP } = await import('../../../scripts/pages/security_headers.mjs');
  const all = HEADERS.split('\n/*\n')[1];
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) assert.ok(all.includes(`  ${k}: ${v}\n`), k);
  for (const d of ["frame-ancestors 'none'", "object-src 'none'", "script-src 'self';"]) assert.ok(CSP.includes(d), d);
  assert.equal(SECURITY_HEADERS['Content-Security-Policy-Report-Only'], undefined, 'volle CSP durchgesetzt (Philipp 10.11.)');
  assert.match(SECURITY_HEADERS['Strict-Transport-Security'], /max-age=31536000/);
  assert.match(SECURITY_HEADERS['Permissions-Policy'], /camera=\(\).*geolocation=\(\).*microphone=\(\)/);
  // The default team room must be a permitted connection target, or the team mode breaks once enforced.
  const room = /DEFAULT_ROOM_URL = '([^']+)'/.exec(readFileSync('apps/web/src/views/project/team/roomAddress.ts', 'utf8'))[1];
  // Nur der Projekt-Raum und lokale Testräume: kein https:/wss: als Ganzes.
  assert.doesNotMatch(CSP, /connect-src[^;]* (https|wss):( |;)/);
  assert.ok(CSP.includes(room) && CSP.includes(room.replace('https:', 'wss:')), room);
  const html = readFileSync('apps/web/index.html', 'utf8');
  assert.ok(html.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP_META}">`), 'Meta-CSP in apps/web/index.html');
});

test('RELEASE-01: der Planer lässt nur den Projekt-Raum und lokale Testräume zu (wie connect-src)', async () => {
  const { roomUrlAllowed, DEFAULT_ROOM_URL, ROOM_URL_REFUSED } = await import('../../../apps/web/src/views/project/team/roomAddress.ts');
  const { CONNECT_SRC } = await import('../../../scripts/pages/security_headers.mjs');
  for (const ok of [DEFAULT_ROOM_URL, `${DEFAULT_ROOM_URL}/`, 'http://127.0.0.1:8787', 'http://localhost:8787', 'http://127.0.0.1']) assert.ok(roomUrlAllowed(ok), ok);
  for (const no of ['https://mein-raum.example.workers.dev', 'https://bauplaner-team.team-room.workers.dev.evil.example', 'http://bauplaner-team.team-room.workers.dev', 'https://127.0.0.1:8787', 'http://192.168.1.5:8787', ''])
    assert.equal(roomUrlAllowed(no), false, no);
  assert.ok(CONNECT_SRC.includes(DEFAULT_ROOM_URL) && CONNECT_SRC.includes('http://127.0.0.1:*') && CONNECT_SRC.includes('http://localhost:*'));
  assert.match(ROOM_URL_REFUSED, /nur mit dem Team-Raum/);
});
