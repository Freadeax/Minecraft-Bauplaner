import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProject, decodeComputeResult, encodeComputeResult, recomputeSite, sameGeometry } from '../dist/application/src/index.js';
import { createProject, createSampleLibrary, newInstance } from '../dist/domain/src/index.js';

// PERF-02-S03: same geometry → only the site part again; anything the geometry reads invalidates.
const library = await createSampleLibrary(), versions = new Map(library.versions.map(v => [v.id, v]));
const [a, b] = library.versions;
const base = { ...createProject({ name: 'Selektiv' }), profileId: a.payload.profileId, instances: [
  newInstance({ name: 'A', assetVersionId: a.id, transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } }),
  newInstance({ name: 'B', assetVersionId: b.id, transform: { position: [1, 0, 1], quarterTurns: 1, mirrorX: true } }),
] };
const first = { project: base, versions };
const previous = { input: first, result: computeProject(first) };
const stepId = previous.result.guide.steps.find(s => s.positions.length).id;

test('site-only changes reuse the geometry and equal a full computation', () => {
  const variants = [
    { ...base, name: 'Umbenannt', revision: base.revision + 1 },
    { ...base, progress: { [stepId]: { done: true, updatedAt: '2026-11-03T00:00:00.000Z' } } },
    // content-equal copies (as after loading from storage) still count as the same geometry
    structuredClone(base),
  ];
  for (const project of variants) {
    const input = { project, versions: new Map([...versions].map(([id, v]) => [id, { ...v }])) };
    assert.ok(sameGeometry(first, input));
    const reused = recomputeSite(input, previous);
    assert.ok(reused);
    assert.equal(reused.resolution, previous.result.resolution, 'Geometrie wiederverwendet');
    assert.deepEqual(reused, computeProject(input));
  }
});

test('the page can reuse a decoded worker result', () => {
  const sent = encodeComputeResult(computeProject(first));
  const decoded = decodeComputeResult(structuredClone(sent.result, { transfer: sent.transfer }), versions);
  const input = { project: { ...base, progress: { [stepId]: { done: true, updatedAt: '2026-11-03T00:00:00.000Z' } } }, versions };
  const reused = recomputeSite(input, { input: first, result: decoded });
  assert.deepEqual(reused.site, computeProject(input).site);
  const section = reused.site.plan.sections[0];
  if (section?.steps[0]) assert.equal(section.steps[0], reused.guide.byId.get(section.steps[0].id), 'Abschnitte zeigen auf die Schritte');
});

test('every geometry input invalidates', () => {
  const moved = base.instances.map((i, k) => k ? i : { ...i, transform: { ...i.transform, position: [0, 1, 0] } });
  const renamed = base.instances.map((i, k) => k ? i : { ...i, name: 'A2' });
  const cases = [
    { project: { ...base, instances: moved }, versions },
    { project: { ...base, instances: renamed }, versions },
    { project: { ...base, instances: base.instances.slice(1) }, versions },
    { project: { ...base, profileId: 'anderes-profil' }, versions },
    { project: base, versions: new Map([...versions].map(([id, v]) => [id, id === a.id ? { ...v, payloadHash: 'x' } : v])) },
    { project: base, versions: new Map([...versions].map(([id, v]) => [id, id === a.id ? { ...v, connectors: [...(v.connectors ?? []), { id: 'neu' }] } : v])) },
    { project: base, versions: new Map([...versions].filter(([id]) => id !== b.id)) },
    { project: base, versions, basis: { id: 'rev', instances: moved, links: [] } },
  ];
  for (const input of cases) {
    assert.equal(sameGeometry(first, input), false);
    assert.equal(recomputeSite(input, previous), null);
  }
});
