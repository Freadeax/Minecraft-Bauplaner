// LIB-06: Bibliotheksbeiträge – Paket, Prüfung, fester Katalogeintrag, Übernahme-Skript.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createAsset, addAssetVersion, sampleTowerPayload, createSampleLibrary, createBuildingLibrary, BUILDING_SPECS, buildingInfo, facetsOf, canonicalJson,
  createContribution, readContribution, contributionAsset, contributionIdFor, checkContributionMeta, createCommunityLibrary, COMMUNITY_ENTRIES,
  CONTRIBUTION_TAG, CONTRIBUTION_FORMAT, isContributionId, analyzeVersion, sha256Hex,
} from '../dist/domain/src/index.js';
import { planSeed } from '../dist/application/src/catalogSync.js';
import { parseEntryModule, entryModule } from '../scripts/library_intake.mjs';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const META = {
  id: 'beitrag_rathaus_am_see', name: 'Rathaus am See', description: 'Rathaus mit Uhrturm, gebaut auf unserem Server.',
  facets: { kategorie: ['oeffentlich'], stil: ['mittelalterlich'], biom: ['ebene'] }, tags: ['Rathaus', 'uhrturm'], tips: ['Uhrturm zuerst bauen.'],
  author: 'Philipp', source: 'eigener Entwurf, Survival-Server', license: 'frei-projekt', rightsConfirmed: true,
};

async function ownTower({ withEntities = false } = {}) {
  const base = sampleTowerPayload();
  const payload = withEntities ? {
    ...base,
    blockEntities: [{ position: [1, 3, 1], data: { type: 'compound', value: { id: { type: 'string', value: 'minecraft:chest' } } } }],
  } : base;
  const asset = createAsset({ name: 'Mein Turm', provenance: { author: 'Philipp', source: 'turm.litematic', license: 'ungeklärt' } });
  const r = await addAssetVersion(asset, { payload, label: '1.0', source: { format: 'litematic', fileName: 'turm.litematic', dataVersion: 4790 } });
  return r;
}

test('Kennung aus dem Namen: Umlaute, Sonderzeichen, Länge', () => {
  assert.equal(contributionIdFor('Rathaus am See'), 'beitrag_rathaus_am_see');
  assert.equal(contributionIdFor('Große Mühle (Süd) – v2!'), 'beitrag_grosse_muehle_sued_v2');
  assert.equal(contributionIdFor('Café Noël'), 'beitrag_cafe_noel');
  assert.equal(contributionIdFor('!!!'), 'beitrag_bauwerk');
  assert.ok(contributionIdFor('x'.repeat(200)).length <= 'beitrag_'.length + 48);
  assert.ok(isContributionId('beitrag_x') && !isContributionId('bld_fachwerkhaus'));
});

test('Angaben werden geprüft: Rechte, Lizenz, Kennung, Facetten', () => {
  const ok = checkContributionMeta(META);
  assert.deepEqual(ok.tags, ['rathaus', 'uhrturm']);
  assert.throws(() => checkContributionMeta({ ...META, rightsConfirmed: false }), /Bestätigung der Rechte/);
  assert.throws(() => checkContributionMeta({ ...META, license: 'alles-erlaubt' }), /Nutzungsrechte/);
  assert.throws(() => checkContributionMeta({ ...META, id: 'bld_rathaus' }), /Kennung/);
  assert.throws(() => checkContributionMeta({ ...META, id: 'beitrag_Rathaus' }), /Kennung/);
  assert.throws(() => checkContributionMeta({ ...META, author: '  ' }), /Autor fehlt/);
  assert.throws(() => checkContributionMeta({ ...META, facets: { farbe: ['rot'] } }), /Unbekannte Angabe/);
  // Facet and family prefixes cannot be smuggled in as plain tags.
  assert.deepEqual(checkContributionMeta({ ...META, tags: ['familie:starterhaus', 'kategorie:x', 'beitrag', 'ok'] }).tags, ['ok']);
});

test('Paket: Rundreise erhält Blockdaten, Blockinhalte, Anschlüsse und Herkunft genau', async () => {
  const { asset, version } = await ownTower({ withEntities: true });
  const file = await createContribution(asset, version, { meta: META, preview: PNG });
  assert.equal(file.format, CONTRIBUTION_FORMAT);
  assert.ok(file.version.packedCells?.base64, 'Zellen gepackt');
  assert.equal(file.origin.versionId, version.id);
  const parsed = JSON.parse(JSON.stringify(file));
  const c = await readContribution(parsed);
  assert.equal(c.payloadHash, version.payloadHash);
  assert.equal(canonicalJson(c.payload), canonicalJson(version.payload));
  assert.deepEqual(c.source, { fileName: 'turm.litematic', dataVersion: 4790 });
  assert.equal(c.preview, PNG);
  const shipped = await contributionAsset(c);
  assert.equal(shipped.asset.id, META.id);
  assert.equal(shipped.asset.demo, true);
  assert.equal(shipped.version.label, '1.0');
  assert.equal(shipped.version.source.format, 'demo');
  assert.equal(shipped.version.payloadHash, version.payloadHash, 'Geometrie unverändert (kein Baustil-Nachbearbeiten)');
  assert.ok(shipped.asset.tags.includes(CONTRIBUTION_TAG));
  assert.deepEqual(facetsOf(shipped.asset).kategorie, ['oeffentlich']);
  assert.equal(shipped.asset.provenance.author, 'Philipp');
  assert.match(shipped.asset.provenance.source, /^Bibliotheksbeitrag: /);
  assert.equal(analyzeVersion(shipped.version).dataVersion, 4790);
  // Same package → same content-addressed version id (stable across app starts).
  assert.equal((await contributionAsset(await readContribution(parsed))).version.id, shipped.version.id);
});

test('Paket: Veränderungen und fremde Dateien werden abgelehnt', async () => {
  const { asset, version } = await ownTower();
  const file = JSON.parse(JSON.stringify(await createContribution(asset, version, { meta: META })));
  await assert.rejects(readContribution({ ...file, meta: { ...file.meta, author: 'Jemand anders' } }), /Prüfsumme/);
  await assert.rejects(readContribution({ ...file, format: 'x' }), /Keine Beitragsdatei/);
  await assert.rejects(readContribution({ ...file, formatVersion: 2 }), /nicht unterstützt/);
  await assert.rejects(readContribution([]), /JSON-Objekt/);
  // Consistent checksum but other geometry: the recorded payload hash catches it.
  const bytes = Buffer.from(file.version.packedCells.base64, 'base64'); bytes[bytes.length - 1] ^= 1;
  const forged = { ...file, version: { ...file.version, packedCells: { ...file.version.packedCells, base64: bytes.toString('base64') } } };
  const { checksum: _c, ...body } = forged;
  await assert.rejects(readContribution({ ...body, checksum: await sha256Hex(canonicalJson(body)) }), /Blockdaten/);
});

test('Paket: nur eigene Bauteile, Rechte bestätigt, gültiges Vorschaubild', async () => {
  const { asset, version } = await ownTower();
  await assert.rejects(createContribution({ ...asset, demo: true }, version, { meta: META }), /schon fester Teil/);
  await assert.rejects(createContribution(asset, version, { meta: { ...META, rightsConfirmed: false } }), /Rechte/);
  await assert.rejects(createContribution(asset, { ...version, source: { ...version.source, localTo: 'p1' } }, { meta: META }), /lokale Änderung/);
  await assert.rejects(createContribution(asset, version, { meta: META, preview: 'data:text/html;base64,PGI+' }), /Vorschaubild/);
});

test('Fester Katalog: Beiträge werden ausgeliefert, ein kaputter stoppt den Start nicht', async () => {
  const { asset, version } = await ownTower();
  const good = JSON.parse(JSON.stringify(await createContribution(asset, version, { meta: META })));
  const other = JSON.parse(JSON.stringify(await createContribution(asset, version, { meta: { ...META, id: 'beitrag_zweiter', name: 'Zweiter' } })));
  const entries = [
    { id: META.id, name: META.name, author: 'Philipp', addedAt: '2026-11-03', checksum: good.checksum, tips: META.tips, load: async () => ({ default: good }) },
    { id: 'beitrag_kaputt', name: 'Kaputt', author: 'x', addedAt: '2026-11-03', checksum: '', tips: [], load: async () => ({ default: { ...good, checksum: 'nein' } }) },
    { id: 'beitrag_falsch', name: 'Falsch', author: 'x', addedAt: '2026-11-03', checksum: '', tips: [], load: async () => ({ default: other }) },
  ];
  const lib = await createCommunityLibrary(entries);
  assert.deepEqual(lib.assets.map(a => a.id), [META.id]);
  assert.deepEqual(lib.failed.map(f => f.id), ['beitrag_kaputt', 'beitrag_falsch']);
  assert.match(lib.failed[1].reason, /passt nicht zum Register/);

  // Seeding: new contribution is added like a shipped design; a later new geometry arrives as version 2.0 (UPDATE-01).
  const first = await planSeed(new Map(), async () => new Map(), [lib]);
  assert.deepEqual(first.assets.map(a => a.id), [META.id]);
  const stored = new Map(first.assets.map(a => [a.id, { ...a, revision: 1 }]));
  const storedVersions = new Map(first.versions.map(v => [v.id, v]));
  assert.equal((await planSeed(stored, async () => storedVersions, [lib])).assets.length, 0, 'unverändert → nichts zu schreiben');
  const p = sampleTowerPayload();
  const v2 = await addAssetVersion(asset, { payload: { ...p, cells: p.cells.slice(2) }, label: '2.0', source: { format: 'editor' } });
  const newer = JSON.parse(JSON.stringify(await createContribution(v2.asset, v2.version, { meta: META })));
  const lib2 = await createCommunityLibrary([{ ...entries[0], load: async () => ({ default: newer }) }]);
  const plan = await planSeed(stored, async () => storedVersions, [lib2]);
  assert.equal(plan.versions.length, 1);
  assert.equal(plan.versions[0].label, '2.0');
  assert.equal(plan.assets[0].versionIds.length, 2, 'alte Version bleibt');
});

test('Register im Repository: alle Beiträge lesbar, Kennungen eindeutig, keine Kollision mit mitgelieferten Gebäuden', async () => {
  const lib = await createCommunityLibrary();
  assert.deepEqual(lib.failed, []);
  assert.equal(lib.assets.length, COMMUNITY_ENTRIES.length);
  const shipped = new Set([...BUILDING_SPECS.map(s => s.id), ...(await createSampleLibrary()).assets.map(a => a.id)]);
  const ids = COMMUNITY_ENTRIES.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) { assert.ok(!shipped.has(id), id); assert.ok(isContributionId(id)); }
  for (const e of COMMUNITY_ENTRIES) assert.deepEqual(buildingInfo(e.id)?.tips, [...e.tips]);
  // Code-built designs never use the contribution prefix.
  assert.ok((await createBuildingLibrary()).assets.every(a => !isContributionId(a.id)));
});

test('Übernahme-Skript: add, Doppelte, ersetzen, check, remove in einem Testordner', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'beitrag-'));
  try {
    mkdirSync(path.join(root, 'packages/domain/src/community'), { recursive: true });
    writeFileSync(path.join(root, 'packages/domain/src/community/registry.ts'), 'export const COMMUNITY_ENTRIES = [\n];\n');
    const { asset, version } = await ownTower();
    const pkg = path.join(root, 'rathaus.bauplaner-beitrag.json');
    writeFileSync(pkg, JSON.stringify(await createContribution(asset, version, { meta: META, preview: PNG })));
    const run = (...args) => execFileSync(process.execPath, ['scripts/library_intake.mjs', ...args, '--root', root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.match(run('add', pkg, '--trocken'), /Trockenlauf/);
    assert.ok(!existsSync(path.join(root, 'packages/domain/src/community/entries', `${META.id}.ts`)));
    assert.match(run('add', pkg), /Aufgenommen/);
    const entryFile = path.join(root, 'packages/domain/src/community/entries', `${META.id}.ts`);
    const parsed = parseEntryModule(readFileSync(entryFile, 'utf8'));
    assert.equal(parsed.file.checksum, JSON.parse(readFileSync(pkg, 'utf8')).checksum);
    assert.equal(entryModule(parsed.file, parsed.addedAt), readFileSync(entryFile, 'utf8'));
    const registry = readFileSync(path.join(root, 'packages/domain/src/community/registry.ts'), 'utf8');
    assert.match(registry, new RegExp(`id: "${META.id}"`));
    assert.match(registry, /load: \(\) => import\('\.\/entries\/beitrag_rathaus_am_see\.js'\)/);
    assert.ok(existsSync(path.join(root, 'docs/library/beitraege', `${META.id}.png`)));
    assert.match(readFileSync(path.join(root, 'docs/library/BEITRAEGE.md'), 'utf8'), /Rathaus am See/);
    assert.match(run('check'), /in Ordnung: 1/);
    assert.throws(() => run('add', pkg), /schon aufgenommen/);
    assert.match(run('add', pkg, '--ersetzen'), /Ersetzt/);
    // A second contribution lives next to the first.
    const clash = path.join(root, 'clash.json');
    writeFileSync(clash, JSON.stringify(await createContribution(asset, version, { meta: { ...META, id: 'beitrag_x' } })));
    assert.match(run('add', clash), /beitrag_x/);
    assert.match(run('list'), /beitrag_rathaus_am_see\t\d{4}-\d{2}-\d{2}\tRathaus am See\tPhilipp/);
    assert.match(run('remove', META.id), /Entfernt/);
    assert.match(run('check'), /in Ordnung: 1/);
    assert.ok(!existsSync(path.join(root, 'docs/library/beitraege', `${META.id}.png`)));
    // Register out of sync with the entry files is reported.
    writeFileSync(path.join(root, 'packages/domain/src/community/registry.ts'), 'export const COMMUNITY_ENTRIES = [\n];\n');
    assert.throws(() => run('check'), /passt nicht/);
    // Tampered file is refused before anything is written.
    const bad = JSON.parse(readFileSync(pkg, 'utf8')); bad.meta.name = 'Anders';
    writeFileSync(pkg, JSON.stringify(bad));
    assert.throws(() => run('add', pkg, '--ersetzen'), /Prüfsumme/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
