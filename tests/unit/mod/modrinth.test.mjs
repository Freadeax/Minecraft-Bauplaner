import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changelogFor, checkConfig, compareVersions, loadConfig, wantedVersions } from '../../../scripts/mod/modrinth_publish.mjs';

test('Modrinth-Daten: project.json, Bilder, Änderungsliste und Dateien passen', () => {
  assert.deepEqual(checkConfig(loadConfig()), []);
});

test('Modrinth-Daten: kein KI-Werkzeug im Text, in Bildtiteln oder Änderungslisten', () => {
  const cfg = loadConfig();
  assert.ok(checkConfig({ ...cfg, body: cfg.body + ' Made with Claude.' }).some(p => p.includes('KI-Werkzeug')));
  assert.ok(checkConfig({ ...cfg, changelog: cfg.changelog.replace('## 0.10.0 – 2026-11-03\n', '## 0.10.0 – 2026-11-03\n\n- by Claude Code\n') }).some(p => p.includes('KI-Werkzeug')));
});

test('Modrinth-Versionen: je Loader eine eindeutige Nummer mit Änderungsliste, Fabric braucht die Fabric API', () => {
  const versions = wantedVersions(loadConfig());
  const numbers = versions.map(v => v.version_number);
  assert.equal(new Set(numbers).size, numbers.length);
  for (const v of versions) assert.ok(v.changelog && v.changelog.length > 20, v.version_number);
  const fabric = versions.find(v => v.loaders.includes('fabric'));
  assert.ok(fabric.dependencies.some(d => d.project_id === 'P7dR8mSH' && d.dependency_type === 'required'));
  const paper = versions.find(v => v.loaders.includes('paper'));
  assert.ok(paper.game_versions.length > 1, 'Paper-Plugin gilt für mehrere Minecraft-Versionen');
  assert.ok(!versions.some(v => v.loaders.includes('forge')), 'ungeprüftes Forge wird nicht veröffentlicht');
});

test('Modrinth-Hilfen: Versionsvergleich und Abschnitt der Änderungsliste', () => {
  assert.ok(compareVersions('0.10.0', '0.9.0') > 0);
  assert.equal(compareVersions('0.10.0', '0.10.0'), 0);
  const log = '# X\n\n## 0.10.0 – 2026-11-03\n\n- neu\n\n## 0.9.0\n\n- alt\n';
  assert.equal(changelogFor(log, '0.10.0'), '- neu');
  assert.equal(changelogFor(log, '0.9.0'), '- alt');
  assert.equal(changelogFor(log, '0.1.0'), null);
  assert.equal(changelogFor('## 0.10.0\n- a\n', '0.1.0'), null);
});

test('Modrinth-Offenlegungen: Team-Raum nur mit Zustimmung, lokale Verbindung beschrieben', () => {
  const cfg = loadConfig();
  const byType = Object.fromEntries((cfg.project.disclosures ?? []).map(d => [d.type, d]));
  assert.equal(byType.ai_content, undefined, 'KI-Angabe pflegt das Skript nicht (Philipp 05.11.2026)');
  assert.equal(byType.telemetry?.consent, 'opt_in');
  assert.ok(byType.system_interactions?.interactions.some(i => i.includes('127.0.0.1')));
  const broken = structuredClone(cfg.project); broken.disclosures = [{ type: 'telemetry', consent: 'maybe', data_collected: [] }];
  assert.ok(checkConfig({ ...cfg, project: broken }).some(p => p.includes('telemetry')));
});
