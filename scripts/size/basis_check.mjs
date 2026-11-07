// SPLIT-01-S05: checks „Gebäude herauslösen“ on the base the real game built (scripts/size/basis_build.mjs), the same way
// the Gebäudeblatt does it. Used by grossbau_verify.mjs and by the unit test on the recorded file
// (fixtures/litematic/basis-aus-dem-spiel.litematic, tests/unit/core/split-game-base.test.mjs).
import { addAssetVersion, analyzeSplit, createAsset, extractParts, extractRest, resolveProject, splitProject } from '../../dist/domain/src/index.js';
import { expected, recordBox, HOUSES } from './basis_build.mjs';

/** SPLIT-01-S05: the recorded base through the split, like the Gebäudeblatt does it. */
export async function checkBase(payload) {
  const a = analyzeSplit(payload);
  const parts = a.parts.map(p => ({ id: p.id, name: p.name, kind: p.kind, role: p.role ?? null, fn: p.fn, reason: p.reason, blocks: p.blocks, below: p.below ?? 0,
    box: [...p.box.min, ...p.box.maxExclusive], connects: p.connects ?? null }));
  const houses = a.parts.filter(p => p.kind === 'building' && !p.role);
  const bridge = a.parts.filter(p => p.role === 'bridge');
  const underground = a.parts.filter(p => p.role === 'underground');
  const fields = a.parts.filter(p => p.kind === 'area' && p.fn === 'getreidefarm');
  const pens = a.parts.filter(p => p.kind === 'area' && p.fn === 'tierfarm');
  const paths = a.parts.filter(p => p.kind === 'area' && p.fn === 'wege');
  const problems = [];
  const want = (ok, text) => { if (!ok) problems.push(text); };
  want(houses.length === expected.houses, `${expected.houses} Gebäude erwartet, gefunden ${houses.length}: ${houses.map(h => h.name).join(', ')}`);
  want(fields.length === expected.fields, `${expected.fields} Felder erwartet, gefunden ${fields.length}`);
  want(pens.length >= expected.pens, `Gehege erwartet, gefunden ${pens.length}`);
  want(paths.length >= 1, 'Wegenetz erwartet');
  want(underground.length === expected.underground, `${expected.underground} unterirdischer Raum erwartet, gefunden ${underground.length}`);
  const linked = bridge.filter(b => (b.connects ?? []).length === expected.bridge.connects);
  want(linked.length === 1, `eine Brücke zwischen zwei Häusern erwartet, gefunden ${bridge.map(b => `${b.name} (${(b.connects ?? []).length} Enden)`).join(', ') || 'keine'}`);
  if (linked.length) want(linked[0].connects.every(id => houses.some(h => h.id === id)), 'die Brücke verbindet zwei Häuser');
  // The cellar belongs to the house above it (Haus Nord, x 6–14 relative to the site = 16–24 in the recording).
  const north = HOUSES[0], margin = -recordBox().min[0];
  const cellarHouse = houses.find(h => h.box.min[0] <= north.at[0] + margin && h.box.maxExclusive[0] >= north.at[0] + margin + 9 && h.box.min[2] <= north.at[1] + margin + 1);
  want(!!cellarHouse && cellarHouse.below > 100 && /Keller/.test(cellarHouse.reason), `Keller gehört zu „${expected.cellarUnder}“: ${cellarHouse ? `${cellarHouse.name}, ${cellarHouse.below} Blöcke unter Boden, ${cellarHouse.reason}` : 'Haus nicht gefunden'}`);
  // Split everything into a project: no conflicts, every block of the recording at its old place.
  const pieces = [];
  for (const p of a.parts) {
    const ex = extractParts(payload, a, [p.id]);
    const { version } = await addAssetVersion(createAsset({ name: p.name, provenance: { author: 'Spieltest', source: 'Spieltest', license: 'Test' } }), { payload: ex.payload, label: '1.0', source: { format: 'crop' } });
    pieces.push({ version, name: p.name, kind: p.kind, at: ex.at });
  }
  const rest = extractRest(payload, a, a.parts.map(p => p.id));
  if (rest) {
    const { version } = await addAssetVersion(createAsset({ name: 'Rest', provenance: { author: 'Spieltest', source: 'Spieltest', license: 'Test' } }), { payload: rest, label: '1.0', source: { format: 'crop' } });
    pieces.unshift({ version, name: 'Gelände & Rest', kind: 'rest', at: rest.bounds.min });
  }
  const project = splitProject({ name: 'Basis aufgeteilt', profileId: payload.profileId, source: payload, parts: pieces });
  const r = resolveProject(project, new Map(pieces.map(p => [p.version.id, p.version])));
  const src = new Map(payload.cells.filter(c => c.kind === 'block').map(c => [c.position.join(','), payload.palette[c.paletteIndex].id]));
  let placed = 0, wrong = 0;
  for (const pl of r.placed) for (const c of pl.payload.cells) if (c.kind === 'block') { placed++; if (src.get(c.position.join(',')) !== pl.payload.palette[c.paletteIndex].id) wrong++; }
  want(r.conflicts.length === 0, `${r.conflicts.length} Voxelkonflikte im aufgeteilten Projekt`);
  want(wrong === 0, `${wrong} Blöcke nicht am alten Platz`);
  want(placed === src.size, `aufgeteiltes Projekt hat ${placed} Blöcke, die Aufnahme ${src.size}`);
  return { parts, sourceBlocks: src.size, placedBlocks: placed, conflicts: r.conflicts.length, sections: project.site.sections.map(s => s.name), problems };
}
