// PERF-06 Offline-Speicher: sw.js wird aus der Vorlage mit einem Manifest der Programmdateien gebaut.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { offlineAsset, serviceWorkerSource } from '../../../scripts/pages/build_service_worker.mjs';
import { isPagesArtifact } from '../../../scripts/pages/prepare_main_pages.mjs';

const manifestOf = source => JSON.parse(/const MANIFEST = (\{.*\});/.exec(source)[1]);

test('Offline-Speicher: Programmdateien ja, Katalogdatei und Fremdes nein', () => {
  assert.ok(offlineAsset('index-EH_0cKef.js'));
  assert.ok(offlineAsset('index-DdESbV98.css'));
  assert.ok(!offlineAsset('catalog-e94567cf5861ef1a9b5c71e9848fb10e.json'));
  assert.ok(!offlineAsset('notes.txt'));
  assert.ok(isPagesArtifact('sw.js'), 'publisher accepts sw.js');
});

test('Offline-Speicher: Manifest, Version folgt dem Inhalt, Notbremse', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sw-'));
  try {
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'assets', 'b-1.js'), 'b');
    writeFileSync(path.join(dir, 'assets', 'a-1.css'), 'a');
    writeFileSync(path.join(dir, 'assets', 'catalog-00000000000000000000000000000000.json'), '{}');
    const first = await serviceWorkerSource(dir);
    const m = manifestOf(first.source);
    assert.deepEqual(m.assets, ['assets/a-1.css', 'assets/b-1.js']);
    assert.equal(m.off, false);
    assert.ok(!first.source.includes('__SW_MANIFEST__;'), 'slot replaced');
    assert.equal((await serviceWorkerSource(dir)).source, first.source, 'same build, same sw.js');
    writeFileSync(path.join(dir, 'assets', 'b-1.js'), 'b2');
    assert.notEqual(manifestOf((await serviceWorkerSource(dir)).source).version, m.version, 'content change, new version');
    assert.equal(manifestOf((await serviceWorkerSource(dir, { off: true })).source).off, true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
