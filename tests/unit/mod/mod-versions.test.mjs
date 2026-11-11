import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// GAME-11-S02: Der 26.4-Adapter (fabric-26.4) nimmt die 26.3-Quellen und passt sie mit den Regeln aus
// compat-26.4.gradle an. Gradle bricht ab, wenn eine Regel nicht greift; dieser Test findet das schon in
// `npm test`, also auch dann, wenn jemand nur die 26.3-Quellen ändert und den 26.4-Build nicht startet.
const MOD = 'mods/bauplaner-bridge';
const ROOTS = { main: [`${MOD}/fabric-26.3/src/main/java`, `${MOD}/hologram-26.3/src/main/java`], gametest: [`${MOD}/fabric-26.3/src/gametest/java`] };
const PKG = 'io/github/freadeax/bauplaner/bridge/';

/** Regeln aus der Groovy-Datei: [file: '…', (set: '…',)? find: /…/, to: '…'] (Slashy-Strings, \/ ist ein /). */
function readRules() {
  const text = readFileSync(`${MOD}/fabric-26.4/compat-26.4.gradle`, 'utf8');
  const re = /\[file: '([^']+)',(?:\s*set: '(\w+)',)?\s*find: \/((?:\\\/|[^/])+)\/,\s*to: '((?:\\'|[^'])*)'\]/g;
  return [...text.matchAll(re)].map(m => ({ file: m[1], set: m[2] ?? 'main', find: m[3].replaceAll('\\/', '/'), to: m[4] }));
}

function source(rule) {
  for (const root of ROOTS[rule.set]) {
    const path = `${root}/${PKG}${rule.file}`;
    if (existsSync(path)) return readFileSync(path, 'utf8');
  }
  return null;
}

test('jede 26.4-Regel greift in der 26.3-Quelle', () => {
  const rules = readRules();
  const declared = (readFileSync(`${MOD}/fabric-26.4/compat-26.4.gradle`, 'utf8').match(/\[file: '/g) ?? []).length;
  assert.equal(rules.length, declared, 'jede Regel lesbar (Format [file: …, find: /…/, to: …])');
  assert.ok(rules.length >= 8);
  for (const rule of rules) {
    const text = source(rule);
    assert.ok(text, `${rule.file}: Datei fehlt`);
    assert.ok(new RegExp(rule.find).test(text), `${rule.file}: ${rule.find} greift nicht mehr – Regel in compat-26.4.gradle nachziehen`);
  }
});

test('26.4 ist ein eigener Schalter und ändert 26.3 nicht', () => {
  const settings = readFileSync(`${MOD}/settings.gradle`, 'utf8');
  assert.match(settings, /gradleProperty\('withFabric264'\)\.isPresent\(\)\) \{\s*include 'fabric-26.4'/);
  const props = Object.fromEntries(readFileSync(`${MOD}/fabric-26.3/gradle.properties`, 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => l.split('=')));
  assert.equal(props.minecraft_version, '26.3');
  const next = readFileSync(`${MOD}/fabric-26.4/gradle.properties`, 'utf8');
  assert.match(next, /^minecraft_version=26\.4/m);
  // Snapshot: fabric.mod.json verlangt "~26.4-", damit auch Vorabversionen von 26.4 passen.
  assert.match(next, /^minecraft_dependency=26\.4-$/m);
});

test('26.4 nur als Vorschau mit Versionswahl, 26.3 bleibt Hauptversion (GAME-11-S03)', () => {
  const { releases } = JSON.parse(readFileSync('apps/web/src/views/mod/releases.json', 'utf8'));
  const props = Object.fromEntries(readFileSync(`${MOD}/fabric-26.4/gradle.properties`, 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => l.split('=')));
  for (const r of releases.filter(r => r.file.includes('-26.4-'))) {
    // Solange es nur Snapshots gibt, nennt jede 26.4-Datei ihren Snapshot (Vorschau, auf Modrinth alpha).
    assert.match(r.minecraft, /^26\.4(-(snapshot|pre|rc)-\d+)?$/, r.file);
    assert.ok(/-(snapshot|pre|rc)-/.test(r.minecraft) || !/-(snapshot|pre|rc)-/.test(props.minecraft_version), `${r.file}: 26.4 ist noch nicht erschienen`);
    assert.equal(r.loader, 'fabric');
  }
  const newest = releases.filter(r => r.file.includes('-26.4-')).map(r => r.minecraft).sort().at(-1);
  if (newest) assert.equal(newest, props.minecraft_version, 'die angebotene 26.4-Vorschau ist der Snapshot, gegen den fabric-26.4 baut');
  assert.ok(releases.some(r => r.minecraft === '26.3' && r.loader === 'fabric'), '26.3 bleibt angeboten');
});
