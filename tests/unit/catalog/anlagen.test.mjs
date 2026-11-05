import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANLAGEN, ENSEMBLES, SHIPPED_LABEL, addAssetVersion, anlageById, anlageForTheme, anlageIntoProject, applyOperation, besideOffset, buildCatalog, checkSite,
  createAnlageProject, createBuildingLibrary, createProject, normalizeChoices, pinnedVersionIdsOf, planAnlage, previewAnlage, resolveProject, swapCandidates, undo, execute, EMPTY_HISTORY,
} from '../../../dist/domain/src/index.js';
import { BUILD_THEMES } from '../../../dist/domain/src/catalog/buildThemes.js';

const buildings = await createBuildingLibrary();
const versions = new Map(buildings.versions.map(v => [v.id, v]));
const lib = { assets: buildings.assets, versions };
const { entries } = buildCatalog(buildings.assets, versions);
const assetIds = new Set(buildings.assets.map(a => a.id));

test('every Bauwelt has exactly one curated Anlage with real assets, pinned versions and existing ensembles', () => {
  assert.equal(ANLAGEN.length, BUILD_THEMES.length);
  assert.equal(new Set(ANLAGEN.map(a => a.id)).size, ANLAGEN.length);
  for (const theme of BUILD_THEMES) assert.ok(anlageForTheme(theme.id), `Anlage für ${theme.id}`);
  for (const a of ANLAGEN) {
    const keys = a.districts.flatMap(d => d.slots.map(s => s.key));
    assert.equal(new Set(keys).size, keys.length, `${a.id}: eindeutige Platzschlüssel`);
    assert.equal(new Set(a.districts.map(d => d.id)).size, a.districts.length);
    assert.ok(a.districts.length >= 3, `${a.id}: mindestens drei Bereiche`);
    for (const d of a.districts) {
      if (d.ensemble) assert.ok(ENSEMBLES.some(e => e.id === d.ensemble), `${a.id}/${d.id}: Ensemble ${d.ensemble}`);
      for (const s of d.slots) assert.ok(assetIds.has(s.assetId), `${a.id}/${s.key}: ${s.assetId}`);
    }
    const plan = planAnlage(a, lib);
    assert.deepEqual(plan.blockers, [], a.id);
    for (const slot of plan.slots) { assert.equal(slot.status, 'ok', `${a.id}/${slot.key}`); assert.equal(slot.pin, SHIPPED_LABEL); assert.equal(slot.newer, undefined); }
  }
});

test('default layouts have no voxel conflicts, separated footprints, kept spacing and connected main paths', () => {
  for (const a of ANLAGEN) {
    const plan = planAnlage(a, lib);
    const preview = previewAnlage(plan);
    assert.equal(preview.resolution.conflicts.length, 0, `${a.id}: Voxelkonflikte`);
    assert.deepEqual(preview.spacing, [], `${a.id}: Abstände`);
    assert.ok(preview.resolution.exportBlockers.length === 0, `${a.id}: exportierbar ${preview.resolution.exportBlockers.join('; ')}`);
    const paths = plan.placements.filter(p => p.kind === 'path');
    if (a.path) {
      assert.ok(paths.length >= 2, `${a.id}: Hauptweg`);
      const pathIds = new Set(preview.draft.instances.filter((_, i) => plan.placements[i].kind === 'path').map(i => i.id));
      const pathLinks = preview.links.filter(l => pathIds.has(l.link.a.instanceId) && pathIds.has(l.link.b.instanceId));
      assert.equal(pathLinks.length, paths.length - 1, `${a.id}: jede Fuge verbunden`);
      assert.ok(preview.links.every(l => l.state === 'ok'));
      // The path spans the whole Anlage along x.
      const ext = plan.extent, buildingsOnly = plan.placements.filter(p => p.kind === 'building');
      assert.ok(Math.min(...paths.map(p => p.footprint.x0)) <= Math.min(...buildingsOnly.map(p => p.footprint.x0)));
      assert.ok(Math.max(...paths.map(p => p.footprint.x1)) >= Math.max(...buildingsOnly.map(p => p.footprint.x1)));
      assert.ok(ext);
    } else assert.equal(paths.length, 0);
    // North districts lie north of the lane, south districts south of it.
    for (const p of plan.placements.filter(p => p.kind === 'building')) {
      const side = a.districts.find(d => d.id === p.districtId).side;
      if (side === 'nord') assert.ok(p.footprint.z1 <= -plan.choices.spacing, `${a.id}/${p.key} nördlich`);
      else assert.ok(p.footprint.z0 >= plan.lane + plan.choices.spacing, `${a.id}/${p.key} südlich`);
    }
  }
});

test('planning is deterministic and pure (same transforms, nothing stored)', () => {
  const a = anlageById('anl_moderne');
  const one = planAnlage(a, lib, { spacing: 5 }), two = planAnlage(a, lib, { spacing: 5 });
  assert.deepEqual(one.placements.map(p => [p.key, p.version.id, p.transform]), two.placements.map(p => [p.key, p.version.id, p.transform]));
  assert.deepEqual(previewAnlage(one).draft.instances.map(i => i.id), previewAnlage(two).draft.instances.map(i => i.id));
  // Row houses keep their curated zero gap; the district gap never exceeds the chosen spacing.
  const rh = one.placements.filter(p => p.districtId === 'reihe').sort((x, y) => x.footprint.x0 - y.footprint.x0);
  for (let i = 1; i < rh.length; i++) assert.equal(rh[i].footprint.x0, rh[i - 1].footprint.x1);
});

test('embedded ensembles keep their curated relative layout', () => {
  const plan = planAnlage(anlageById('anl_mittelalter'), lib);
  const ensemble = ENSEMBLES.find(e => e.id === 'ens_burg');
  const placed = plan.placements.filter(p => p.ensembleId === 'ens_burg');
  assert.equal(placed.length, ensemble.members.length);
  const x0 = Math.min(...ensemble.members.map(m => m.at[0])), z0 = Math.min(...ensemble.members.map(m => m.at[1]));
  const px = Math.min(...placed.map(p => p.footprint.x0)), pz = Math.min(...placed.map(p => p.footprint.z0));
  ensemble.members.forEach((m, i) => {
    const p = placed.find(x => x.key === `burg.ens_burg.${i + 1}`);
    assert.deepEqual([p.footprint.x0 - px, p.footprint.z0 - pz], [m.at[0] - x0, m.at[1] - z0], `Mitglied ${i + 1}`);
  });
});

test('pins stay fixed when a newer version exists; a swap pins the current version of the new asset', async () => {
  const asset = buildings.assets.find(a => a.id === 'bld_fischerhuette');
  const old = versions.get(asset.versionIds[0]);
  const { asset: next, version } = await addAssetVersion(asset, { payload: old.payload, label: '2.0', connectors: [], source: { format: 'demo' } });
  const lib2 = { assets: buildings.assets.map(a => a.id === next.id ? next : a), versions: new Map([...versions, [version.id, version]]) };
  const plan = planAnlage(anlageById('anl_kueste'), lib2);
  const slot = plan.slots.find(s => s.key === 'k_haus1');
  assert.equal(slot.version.id, old.id);
  assert.equal(slot.pin, '1.0');
  assert.equal(slot.newer, '2.0');
  assert.ok(pinnedVersionIdsOf(plan).includes(old.id) && !pinnedVersionIdsOf(plan).includes(version.id));
  const swapped = planAnlage(anlageById('anl_kueste'), lib2, { swaps: { k_haus2: 'bld_fischerhuette' } }).slots.find(s => s.key === 'k_haus2');
  assert.equal(swapped.version.id, version.id);
  assert.equal(swapped.swapped, true);
});

test('missing pinned versions block adoption of enabled districts only', () => {
  const lib2 = { assets: buildings.assets.filter(a => a.id !== 'bld_kueste_werft'), versions };
  const plan = planAnlage(anlageById('anl_kueste'), lib2);
  assert.equal(plan.blockers.length, 1);
  assert.match(plan.blockers[0], /Werft/);
  assert.throws(() => createAnlageProject(previewAnlage(plan)), /nicht übernehmbar/);
  const without = planAnlage(anlageById('anl_kueste'), lib2, { off: ['hafen'] });
  assert.deepEqual(without.blockers, []);
  assert.ok(!without.placements.some(p => p.districtId === 'hafen'));
  assert.ok(createAnlageProject(previewAnlage(without)).instances.length > 0);
});

test('a shifted district produces real voxel conflicts that need explicit confirmation', () => {
  const a = anlageById('anl_landleben');
  const plan = planAnlage(a, lib);
  const dorf = plan.districts.find(d => d.id === 'dorf'), hand = plan.districts.find(d => d.id === 'handwerk');
  const shifted = planAnlage(a, lib, { shifts: { handwerk: [dorf.footprint.x0 - hand.footprint.x0, 0] } });
  const preview = previewAnlage(shifted);
  assert.ok(preview.conflicts.length > 0, 'Voxelkonflikte erkannt');
  assert.ok(preview.spacing.some(s => s.kind === 'overlap'));
  assert.throws(() => createAnlageProject(preview), /Voxelkonflikt/);
  const project = createAnlageProject(preview, { acceptConflicts: true });
  assert.equal(resolveProject(project, versions).conflicts.length, preview.conflicts.length);
  // A small shift only makes the gap tight, without voxel conflicts.
  const tight = previewAnlage(planAnlage(a, lib, { shifts: { handwerk: [-4, 0] } }));
  assert.ok(tight.spacing.some(s => s.kind === 'tight'));
});

test('adoption creates instances with pinned versions, path links and build sections in plan order', () => {
  const a = anlageById('anl_moderne');
  const preview = previewAnlage(planAnlage(a, lib, { off: ['hoch'] }));
  const project = createAnlageProject(preview, { name: 'Mein Quartier' });
  assert.equal(project.name, 'Mein Quartier');
  assert.equal(project.instances.length, preview.plan.placements.length);
  assert.deepEqual(project.instances.map(i => i.assetVersionId), preview.plan.placements.map(p => p.version.id));
  assert.equal(project.links.length, preview.draft.links.length);
  const site = checkSite(project.site);
  assert.deepEqual(site.sections.map(s => s.name), ['Stadtquartier: Hauptweg', 'Reihenhauszeile', 'Zentrum', 'Öffentliche Gebäude']);
  assert.equal(site.sections.reduce((n, s) => n + s.members.length, 0), project.instances.length);
  assert.ok(site.sections.every(s => s.note));
  // Fresh ids each time: the same Anlage can be adopted twice.
  const again = createAnlageProject(preview);
  assert.ok(again.instances.every(i => !project.instances.some(j => j.id === i.id)));
  assert.equal(resolveProject(project, versions).conflicts.length, 0);
});

test('adding to an existing project: beside the buildings is conflict free, an overlap is detected, one undoable step', () => {
  const plan = planAnlage(anlageById('anl_endposten'), lib);
  const seed = createAnlageProject(previewAnlage(planAnlage(anlageById('anl_nether'), lib)), { name: 'Basis' });
  const beside = besideOffset(plan, resolveProject(seed, versions));
  const ok = previewAnlage(plan, { base: seed, offset: beside, versions });
  assert.equal(ok.conflicts.length, 0);
  assert.equal(ok.conflictsWithBase, 0);
  const op = anlageIntoProject(ok, seed);
  const history = execute(seed, EMPTY_HISTORY, op);
  assert.equal(history.project.instances.length, seed.instances.length + plan.placements.length);
  assert.equal(checkSite(history.project.site).sections.length, seed.site.sections.length + plan.anlage.districts.length);
  const back = undo(history.project, history.history);
  assert.deepEqual(back.project.instances, seed.instances);
  assert.deepEqual(back.project.site, seed.site);
  const clash = previewAnlage(plan, { base: seed, offset: [0, 0], versions });
  assert.ok(clash.conflictsWithBase > 0, 'Konflikt mit bestehendem Bau');
  assert.throws(() => anlageIntoProject(clash, seed), /Voxelkonflikt/);
  // A stale preview (project changed meanwhile) is refused.
  const changed = applyOperation(seed, { kind: 'instance.remove', instanceId: seed.instances[0].id }).project;
  assert.throws(() => anlageIntoProject(ok, changed), /geändert/);
});

test('choices are validated', () => {
  const a = anlageById('anl_kueste');
  assert.throws(() => normalizeChoices(a, { off: ['gibtsnicht'] }), /Bereich/);
  assert.throws(() => normalizeChoices(a, { swaps: { x: 'bld_iglu' } }), /Platz/);
  assert.throws(() => normalizeChoices(a, { spacing: 13 }), /Abstand/);
  assert.throws(() => normalizeChoices(a, { shifts: { hafen: [0.5, 0] } }), /ganzzahlig/);
  assert.equal(normalizeChoices(a, { path: false }).path, false);
  assert.equal(normalizeChoices(anlageById('anl_nether')).path, false);
  assert.equal(planAnlage(a, lib, { path: false }).placements.filter(p => p.kind === 'path').length, 0);
  assert.throws(() => createAnlageProject(previewAnlage(planAnlage(a, lib, { off: a.districts.map(d => d.id), path: false }))), /kein Bereich/);
  const first = previewAnlage(planAnlage(a, lib));
  assert.throws(() => previewAnlage(first.plan, { base: first.project }), /bereits enthalten/);
  assert.doesNotThrow(() => previewAnlage(first.plan, { base: createAnlageProject(first), offset: [200, 0] }), 'adopted copies have fresh ids');
});

test('swap candidates: family variants first, then same category in the Bauwelt, never the current asset', () => {
  const a = anlageById('anl_moderne');
  const slot = planAnlage(a, lib).slots.find(s => s.key === 's_rh1');
  const c = swapCandidates(entries, a, slot);
  assert.ok(c.length >= 3);
  assert.deepEqual(c.slice(0, 3).map(x => x.reason), ['variante', 'variante', 'variante']);
  assert.ok(c.every(x => x.assetId !== slot.assetId));
  assert.ok(c.some(x => x.reason === 'bauwelt'));
  const kat = new Set(entries.find(e => e.asset.id === slot.assetId).facets.kategorie);
  for (const x of c.filter(x => x.reason === 'bauwelt')) assert.ok(entries.find(e => e.asset.id === x.assetId).facets.kategorie.some(k => kat.has(k)));
  // Swapping keeps the layout valid (spacing recomputed from the real footprint).
  const swapped = previewAnlage(planAnlage(a, lib, { swaps: { s_rh1: c.at(-1).assetId } }));
  assert.equal(swapped.conflicts.length, 0);
});

test('an empty project as target behaves like a new one', () => {
  const plan = planAnlage(anlageById('anl_fernost'), lib);
  const empty = createProject({ name: 'Leer' });
  assert.deepEqual(besideOffset(plan, null), [0, 0]);
  const p = previewAnlage(plan, { base: empty, versions });
  assert.equal(p.conflicts.length, 0);
  assert.equal(anlageIntoProject(p, empty).kind, 'batch');
});
