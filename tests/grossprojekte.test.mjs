import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANLAGEN, ENSEMBLES, GROSSPROJEKTE, SHIPPED_LABEL, STREET_STYLE_LABEL, applyOperation, besideOffset, buildCatalog, buildGrossprojektPlan, createBuildingLibrary, createGrossprojektProject,
  createProject, grossprojektAssetIds, grossprojektById, grossprojektIntoProject, grossprojekteForTheme, normalizeGpChoices, planGrossprojekt, previewGrossprojekt, resolveProject, scaleOf,
  summarizeGrossprojekt, swapCandidates, undo, execute, EMPTY_HISTORY, validateGrossprojekt, streetPayload, siteOf,
} from '../dist/domain/src/index.js';
import { BUILD_THEMES } from '../dist/domain/src/buildThemes.js';

const buildings = await createBuildingLibrary();
const versions = new Map(buildings.versions.map(v => [v.id, v]));
const lib = { assets: buildings.assets, versions };
const { entries } = buildCatalog(buildings.assets, versions);
const assetIds = new Set(buildings.assets.map(a => a.id));
const byId = id => grossprojektById(id);
const planOf = async (gp, choices = {}) => buildGrossprojektPlan(planGrossprojekt(gp, lib, choices));

test('curated Großprojekte: valid structure, real assets, pinned versions, every quarter in exactly one phase', () => {
  assert.ok(GROSSPROJEKTE.length >= 10, `${GROSSPROJEKTE.length} Großprojekte`);
  assert.equal(new Set(GROSSPROJEKTE.map(g => g.id)).size, GROSSPROJEKTE.length, 'ids eindeutig');
  assert.equal(new Set(GROSSPROJEKTE.map(g => g.name)).size, GROSSPROJEKTE.length, 'Namen eindeutig');
  for (const gp of GROSSPROJEKTE) {
    assert.doesNotThrow(() => validateGrossprojekt(gp), gp.id);
    assert.ok(gp.quartiere.length >= 6, `${gp.id}: mindestens sechs Quartiere`);
    assert.ok(gp.phasen.length >= 3, `${gp.id}: mindestens drei Phasen`);
    if (gp.themeId) assert.ok(BUILD_THEMES.some(t => t.id === gp.themeId), `${gp.id}: Bauwelt`);
    for (const id of grossprojektAssetIds(gp)) assert.ok(assetIds.has(id), `${gp.id}: ${id} im Katalog`);
    const layout = planGrossprojekt(gp, lib);
    assert.deepEqual(layout.blockers, [], gp.id);
    for (const slot of layout.slots) { assert.equal(slot.status, 'ok', `${gp.id}/${slot.key}`); assert.equal(slot.pin, SHIPPED_LABEL); assert.equal(slot.newer, undefined); }
  }
  assert.ok(grossprojekteForTheme('mittelalter').length >= 2);
  assert.equal(byId('gp_nein'), undefined);
});

test('default layouts: no voxel conflicts, separated footprints, spacing kept, exportable, quarters inside their grid regions', async () => {
  for (const gp of GROSSPROJEKTE) {
    const plan = await planOf(gp);
    const preview = previewGrossprojekt(plan);
    assert.equal(preview.resolution.conflicts.length, 0, `${gp.id}: Voxelkonflikte`);
    assert.deepEqual(preview.spacing, [], `${gp.id}: Abstände`);
    assert.equal(preview.resolution.exportBlockers.length, 0, `${gp.id}: exportierbar ${preview.resolution.exportBlockers.join('; ')}`);
    assert.equal(preview.links.filter(l => l.state !== 'ok').length, 0, `${gp.id}: Anschlüsse`);
    for (const q of plan.layout.quartiere) {
      if (!q.footprint || !q.region) continue;
      assert.ok(q.footprint.x0 >= q.region.x0 && q.footprint.x1 <= q.region.x1 && q.footprint.z0 >= q.region.z0 && q.footprint.z1 <= q.region.z1, `${gp.id}/${q.id}: Grundfläche im Rasterfeld`);
    }
    // No two quarter regions overlap, and no placement lies on a street lane.
    const regs = plan.layout.quartiere.filter(q => q.region).map(q => q.region);
    for (let i = 0; i < regs.length; i++) for (let j = i + 1; j < regs.length; j++) {
      const a = regs[i], b = regs[j];
      assert.ok(!(a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1), `${gp.id}: Rasterfelder getrennt`);
    }
    const lanes = plan.layout.streets?.lanes ?? [];
    for (const p of plan.layout.placements) for (const l of lanes)
      assert.ok(!(p.footprint.x0 < l.x1 && l.x0 < p.footprint.x1 && p.footprint.z0 < l.z1 && l.z0 < p.footprint.z1), `${gp.id}: ${p.name} liegt nicht auf der Straße`);
  }
});

test('street network: connected lanes, lamps beside (never on) the lanes or buildings, own part with style palette', async () => {
  for (const gp of GROSSPROJEKTE.filter(g => g.streets)) {
    const layout = planGrossprojekt(gp, lib);
    const s = layout.streets;
    assert.ok(s && s.cells.length > 0, `${gp.id}: Straßen`);
    const set = new Set(s.cells.map(([x, z]) => `${x},${z}`));
    // Flood fill: every lane cell is reachable from the first one.
    const seen = new Set([s.cells[0].join(',')]);
    const stack = [s.cells[0]];
    while (stack.length) {
      const [x, z] = stack.pop();
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${z + dz}`; if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, z + dz]); } }
    }
    assert.equal(seen.size, set.size, `${gp.id}: Straßennetz zusammenhängend`);
    for (const [x, z] of s.lamps) {
      assert.ok(!set.has(`${x},${z}`), `${gp.id}: Laterne nicht auf der Fahrbahn`);
      assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => set.has(`${x + dx},${z + dz}`)), `${gp.id}: Laterne neben der Straße`);
      for (const p of layout.placements) assert.ok(!(x >= p.footprint.x0 && x < p.footprint.x1 && z >= p.footprint.z0 && z < p.footprint.z1), `${gp.id}: Laterne nicht in ${p.name}`);
    }
    const net = streetPayload(s);
    assert.ok(net.payload.cells.length >= s.cells.length + 3 * s.lamps.length);
    assert.ok(net.payload.palette.length >= 2);
  }
  // Styles differ in their palette.
  const l = planGrossprojekt(byId('gp_marktstadt'), lib);
  const ids = style => new Set(streetPayload({ ...l.streets, style }).payload.palette.map(p => p.id));
  assert.ok(ids('asphalt').has('minecraft:gray_concrete') && !ids('stein').has('minecraft:gray_concrete'));
  assert.ok(ids('dorf').has('minecraft:dirt_path'));
  assert.deepEqual(Object.keys(STREET_STYLE_LABEL).sort(), ['asphalt', 'dorf', 'kies', 'stein']);
});

test('layout is deterministic and the grid grows with wider street choices', async () => {
  const gp = byId('gp_hafenstadt');
  const a = planGrossprojekt(gp, lib), b = planGrossprojekt(gp, lib);
  assert.deepEqual(a.placements.map(p => [p.key, p.transform]), b.placements.map(p => [p.key, p.transform]));
  const wide = planGrossprojekt(gp, lib, { streetWidth: 8 });
  assert.ok(wide.extent.x1 - wide.extent.x0 > a.extent.x1 - a.extent.x0, 'breitere Straßen → größere Ausdehnung');
  assert.equal(wide.streets.width, 8);
  const none = planGrossprojekt(gp, lib, { streets: false });
  assert.equal(none.streets, null);
  assert.ok(none.extent.x1 - none.extent.x0 < a.extent.x1 - a.extent.x0, 'ohne Straßen kompakter');
  const noLamps = planGrossprojekt(gp, lib, { lamps: false });
  assert.deepEqual(noLamps.streets.lamps, []);
  assert.ok(a.streets.lamps.length > 10);
});

test('embedded ensembles keep their curated relative layout; embedded Anlagen bring their own path modules', async () => {
  const gp = byId('gp_landgut');
  const layout = planGrossprojekt(gp, lib);
  const ens = ENSEMBLES.find(e => e.id === 'ens_bauernhof');
  const placed = layout.placements.filter(p => p.ensembleId === 'ens_bauernhof');
  assert.equal(placed.length, ens.members.length);
  // Relative offsets between members equal the curated ones.
  const d = (p, q) => [p.footprint.x0 - q.footprint.x0, p.footprint.z0 - q.footprint.z0];
  assert.deepEqual(d(placed[1], placed[0]), [ens.members[1].at[0] - ens.members[0].at[0], ens.members[1].at[1] - ens.members[0].at[1]]);

  const haupt = byId('gp_hauptstadt');
  const hl = planGrossprojekt(haupt, lib);
  const alt = hl.placements.filter(p => p.districtId === 'altstadt');
  assert.ok(alt.some(p => p.kind === 'path'), 'Hauptweg der eingebetteten Anlage');
  const anl = ANLAGEN.find(a => a.id === 'anl_mittelalter');
  assert.ok(alt.filter(p => p.kind === 'building').length >= anl.districts.reduce((n, dd) => n + dd.slots.length, 0), 'alle Plätze der Anlage');
  const plan = await buildGrossprojektPlan(hl);
  const preview = previewGrossprojekt(plan);
  assert.equal(preview.conflicts.length, 0);
  assert.ok(preview.links.length > 5 && preview.links.every(l => l.state === 'ok'), 'Wegmodule der Anlage verbunden');
  assert.equal(scaleOf(hl.placements.filter(p => p.kind === 'building').length), 'stadtteil');
});

test('choices: quarters off, swap and turn slots, invalid choices refused, doors face the street', () => {
  const gp = byId('gp_marktstadt');
  const off = planGrossprojekt(gp, lib, { off: ['dom', 'garten'] });
  assert.equal(off.quartiere.find(q => q.id === 'dom').enabled, false);
  assert.equal(off.placements.filter(p => p.districtId === 'dom').length, 0);
  assert.ok(off.slots.some(s => s.districtId === 'dom'), 'Plätze abgewählter Quartiere bleiben sichtbar');
  const full = planGrossprojekt(gp, lib);
  assert.ok(off.placements.length < full.placements.length);

  const slot = full.slots.find(s => s.key === 'h3');
  const cands = swapCandidates(entries, { ...gp, districts: [] , path: null }, slot);
  assert.ok(cands.length > 0, 'Tauschkandidaten');
  const swapped = planGrossprojekt(gp, lib, { swaps: { h3: cands[0].assetId } });
  const sw = swapped.slots.find(s => s.key === 'h3');
  assert.equal(sw.assetId, cands[0].assetId); assert.equal(sw.swapped, true); assert.equal(sw.status, 'ok');
  const turned = planGrossprojekt(gp, lib, { turns: { h3: 2 } });
  const t = turned.slots.find(s => s.key === 'h3');
  assert.equal(t.turns, 2); assert.equal(t.turnSource, 'manual');
  assert.ok(full.slots.filter(s => s.facesPath === true).length >= 10, 'Türen zur Straße gedreht');
  const noDoors = planGrossprojekt(gp, lib, { doors: false });
  assert.ok(noDoors.slots.every(s => s.turnSource !== 'door'));

  assert.throws(() => normalizeGpChoices(gp, { off: ['nix'] }), /Quartier nix/);
  assert.throws(() => normalizeGpChoices(gp, { swaps: { nix: 'bld_villa' } }), /Platz nix/);
  assert.throws(() => normalizeGpChoices(gp, { spacing: 99 }), /Abstand/);
  assert.throws(() => normalizeGpChoices(gp, { streetWidth: 1 }), /Straßenbreite/);
  assert.throws(() => normalizeGpChoices(gp, { streetStyle: 'gold' }), /Straßenstil/);
  assert.throws(() => normalizeGpChoices(gp, { turns: { h3: 7 } }), /Drehung/);
});

test('validateGrossprojekt refuses broken curated data', () => {
  const gp = byId('gp_burganlage');
  const bad = patch => () => validateGrossprojekt({ ...gp, ...patch });
  assert.throws(bad({ id: 'burg' }), /gp_<slug>/);
  assert.throws(bad({ quartiere: [...gp.quartiere, { ...gp.quartiere[0], id: 'doppelt', cell: gp.quartiere[1].cell }] }), /überlagern/);
  assert.throws(bad({ phasen: gp.phasen.slice(1) }), /in keiner Phase/);
  assert.throws(bad({ phasen: [...gp.phasen, gp.phasen[0]] }), /in zwei Phasen/);
  assert.throws(bad({ quartiere: gp.quartiere.map(q => q.id === 'kern' ? { ...q, units: [{ kind: 'ensemble', key: 'x', ensembleId: 'ens_nix' }] } : q) }), /Ensemble ens_nix/);
  assert.throws(bad({ quartiere: gp.quartiere.map(q => q.id === 'kern' ? { ...q, units: [{ kind: 'anlage', key: 'x', anlageId: 'anl_nix' }] } : q) }), /Anlage anl_nix/);
  assert.throws(bad({ quartiere: gp.quartiere.map(q => q.id === 'kern' ? { ...q, kind: 'frei', units: [] } : q) }), /reserve/);
  // Missing asset shows up as a blocker, not a crash.
  const layout = planGrossprojekt({ ...gp, quartiere: gp.quartiere.map(q => q.id === 'kern' ? { ...q, units: [{ kind: 'slot', key: 'x', assetId: 'bld_gibt_es_nicht' }] } : q) }, lib);
  assert.match(layout.blockers.join(), /bld_gibt_es_nicht fehlt/);
  const plan = { ...layout };
  assert.ok(plan.slots.find(s => s.key === 'x').status === 'missing-asset');
});

test('reserved plots are kept free, shown in the layout and noted in the sections', async () => {
  const gp = byId('gp_marktstadt');
  const plan = await planOf(gp);
  const frei = plan.layout.quartiere.find(q => q.id === 'erweiterung');
  assert.equal(frei.reserved, true);
  assert.equal(frei.footprint.x1 - frei.footprint.x0, 28);
  assert.equal(frei.placements, 0);
  for (const p of plan.layout.placements) assert.ok(!(p.footprint.x0 < frei.footprint.x1 && frei.footprint.x0 < p.footprint.x1 && p.footprint.z0 < frei.footprint.z1 && frei.footprint.z0 < p.footprint.z1), `${p.name} nicht auf dem Bauplatz`);
  const preview = previewGrossprojekt(plan);
  const project = createGrossprojektProject(plan, preview);
  const sec = siteOf(project).sections.find(s => s.name.startsWith('Phase 4'));
  assert.match(sec.note, /Erweiterungsfläche: Bauplatz 28 × 28 freihalten/);
});

test('adoption: new project with streets first, one section per phase in order, fresh ids, pinned versions; network stored separately', async () => {
  const gp = byId('gp_innenstadt');
  const plan = await planOf(gp);
  const preview = previewGrossprojekt(plan);
  assert.ok(plan.network, 'Straßennetz als eigenes Bauteil');
  assert.equal(plan.network.version.label, '1.0');
  const project = createGrossprojektProject(plan, preview, { name: 'Meine Stadt' });
  assert.equal(project.name, 'Meine Stadt');
  assert.equal(project.instances.length, preview.draft.instances.length);
  assert.ok(project.instances.every(i => !i.id.startsWith('inst_anl_')), 'frische Instanz-IDs');
  assert.ok(project.instances.some(i => i.assetVersionId === plan.network.version.id), 'Straßennetz als Instanz');
  const site = siteOf(project);
  assert.equal(site.sections[0].name, 'Straßen & Plätze');
  assert.deepEqual(site.sections.slice(1).map(s => s.name), gp.phasen.map((p, i) => `Phase ${i + 1}: ${p.name}`));
  const covered = new Set(site.sections.flatMap(s => s.members.map(m => m.instanceId)));
  assert.equal(covered.size, project.instances.length, 'jede Instanz in genau einem Abschnitt');
  assert.match(site.sections[2].note, /Hochhausviertel: /);
  // Same content twice → independent projects (no shared ids).
  const again = createGrossprojektProject(plan, preview);
  assert.equal(new Set([...project.instances, ...again.instances].map(i => i.id)).size, project.instances.length * 2);
  // Resolves without conflicts with the network version supplied.
  const v = new Map(versions); v.set(plan.network.version.id, plan.network.version);
  const res = resolveProject(project, v);
  assert.equal(res.conflicts.length, 0);
  // Undo the whole adoption batch.
  assert.equal(project.revisions.length, 0);
});

test('insertion into an existing project: one undoable batch beside the existing buildings, stale preview refused', async () => {
  const gp = byId('gp_tempelstadt');
  const plan = await planOf(gp, { off: ['markt', 'bogen', 'pilger'] });
  let base = createProject({ name: 'Bestand' });
  const house = buildings.assets.find(a => a.id === 'bld_japanhaus');
  const hv = versions.get(house.versionIds[0]);
  base = applyOperation(base, { kind: 'instance.add', instance: { id: 'inst_haus', assetVersionId: hv.id, name: 'Haus', override: false, transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } } }).project;
  const v = new Map(versions); v.set(plan.network.version.id, plan.network.version);
  const offset = besideOffset(plan, resolveProject(base, v));
  assert.ok(offset[0] > 0, 'neben den Bestand');
  const preview = previewGrossprojekt(plan, { base, offset, versions: v });
  assert.equal(preview.conflicts.length, 0);
  const op = grossprojektIntoProject(plan, preview, base);
  assert.equal(op.kind, 'batch');
  const h1 = execute(base, EMPTY_HISTORY, op);
  const after = h1.project;
  assert.equal(after.instances.length, 1 + preview.draft.instances.length);
  assert.equal(siteOf(after).sections.length, 1 + gp.phasen.length - 1, 'Straßen + Phasen mit Inhalt (Phase 4 ist leer)');
  const back = undo(after, h1.history);
  assert.equal(back.project.instances.length, 1);
  assert.equal(siteOf(back.project).sections.length, 0);
  // Changing the base after the preview → refused.
  const changed = applyOperation(base, { kind: 'instance.transform', instanceId: 'inst_haus', transform: { position: [3, 0, 0], quarterTurns: 0, mirrorX: false } }).project;
  assert.throws(() => grossprojektIntoProject(plan, preview, changed), /seit der Vorschau geändert/);
  // Overlapping offset → conflicts → refused unless accepted.
  const bad = previewGrossprojekt(plan, { base, offset: [-plan.layout.extent.x0 - 5, -plan.layout.extent.z0 - 5], versions: v });
  if (bad.conflicts.length) {
    assert.throws(() => grossprojektIntoProject(plan, bad, base), /Voxelkonflikt/);
    assert.doesNotThrow(() => grossprojektIntoProject(plan, bad, base, { acceptConflicts: true }));
  }
});

test('summary and scale classes', () => {
  const sums = GROSSPROJEKTE.map(g => summarizeGrossprojekt(g, lib));
  for (const s of sums) { assert.ok(s.buildings >= 25, `${s.id}: ${s.buildings} Gebäude`); assert.equal(s.blockers, 0); assert.ok(s.area > 5000); }
  assert.ok(sums.some(s => s.scale === 'stadtteil') && sums.some(s => s.scale === 'quartier'));
  assert.equal(scaleOf(3), 'siedlung'); assert.equal(scaleOf(20), 'quartier'); assert.equal(scaleOf(40), 'stadtteil'); assert.equal(scaleOf(90), 'stadt');
});
