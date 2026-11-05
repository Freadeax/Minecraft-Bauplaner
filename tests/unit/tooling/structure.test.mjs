// Ordnerkarte docs/STRUKTUR.md (STRUCT-01): neue Dateien landen im Fachordner, nicht wieder flach.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

const flat = dir => readdirSync(dir, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name);
const hint = 'Fachordner laut docs/STRUKTUR.md wählen';

test('structure: tests, scripts, domain and architecture docs have no new flat files', () => {
  assert.deepEqual(flat('tests').filter(f => f.endsWith('.mjs')), [], `Einheitstests gehören nach tests/unit/<bereich>/ (${hint})`);
  assert.deepEqual(flat('scripts'), ['publish_pages.sh'], `Skripte gehören nach scripts/<bereich>/ (${hint})`);
  assert.deepEqual(flat('packages/domain/src'), ['index.ts'], `Kernmodule gehören nach packages/domain/src/<bereich>/ (${hint})`);
  assert.deepEqual(flat('docs/architecture'), [], `Fachdokumente gehören nach docs/architecture/<bereich>/ (${hint})`);
});
