// PROJ-05: Bauleute-Konto (Lagerbuchungen je Bauleute) und Bauleute aus dem Spiel in der Planung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, newInstance, resolveProject, createSampleLibrary, buildGuide, evaluateProgress, planSite, DEFAULT_PACE,
  emptySite, addSection, addBuilder, assignSection, planProgram, programOf, createTeam, appendEvents, teamEvent, teamView, teamContextOf,
  builderAccounts, accountText, builderText, teamIntoProgram, setProgram, checkProgram,
} from '../../../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetVersionId, name, position) => newInstance({ assetVersionId, name, transform: { position, quarterTurns: 0, mirrorX: false } });
const project = applyOperation(createProject({ name: 'Burg' }), { kind: 'batch', label: 't', operations: [
  at(latest('sample_tower'), 'Turm West', [0, 0, 0]), at(latest('sample_wall'), 'Mauer', [4, 0, 1]), at(latest('sample_tower'), 'Turm Ost', [10, 0, 0]),
].map(instance => ({ kind: 'instance.add', instance })) }).project;

function setup() {
  let site = emptySite();
  project.instances.forEach((i, n) => { site = addSection(site, i.name, [{ instanceId: i.id }], `s${n}`); });
  site = addBuilder(addBuilder(site, 'Anna', 64, 'a'), 'Ben', 64, 'b');
  site = assignSection(assignSection(assignSection(site, 's0', ['a']), 's1', ['a']), 's2', ['b']);
  const resolution = resolveProject(project, versions), guide = buildGuide(project, resolution);
  const overview = planSite(site, guide, evaluateProgress(guide, project.progress), resolution);
  return { site, plan: planProgram(site, overview, DEFAULT_PACE, '2026-11-06') };
}
let clock = 0;
const t = () => new Date(Date.UTC(2026, 10, 6, 8, 0, clock++)).toISOString();

test('without team: the account shows only the need, everything is open', () => {
  const { plan } = setup();
  const r = builderAccounts(plan, null);
  assert.equal(r.hasTeam, false);
  assert.equal(r.accounts.length, 2);
  const anna = r.accounts.find(a => a.id === 'a'), need = plan.builders.find(b => b.id === 'a').items;
  assert.ok(need.length > 0, 'sample sections need items');
  assert.equal(anna.totals.missing, need.reduce((n, i) => n + i.missing, 0));
  assert.equal(anna.totals.open, anna.totals.missing);
  assert.equal(anna.balance, 0);
  assert.ok(r.unclaimed.length > 0);
  assert.deepEqual(r.candidates, []);
});

test('claims, deliveries and chest bookings per builder; promises of others reduce what is open', () => {
  const { site, plan } = setup();
  const item = plan.builders.find(b => b.id === 'a').items[0];
  let team = createTeam({ name: 'T', founder: 'a', teamId: 'team_acc00001', at: '2026-11-01T08:00:00Z' });
  team = appendEvents(team, [
    teamEvent('b', { kind: 'member.join', member: 'b', name: 'Ben', player: 'BenBaut' }, t()),
    teamEvent('c', { kind: 'member.join', member: 'c', name: 'Carla', player: 'CarlaMC' }, t()),
    teamEvent('a', { kind: 'gather.claim', item: item.itemId, count: 1 }, t()),
    teamEvent('b', { kind: 'gather.claim', item: item.itemId, count: 2 }, t()),
    teamEvent('a', { kind: 'contribution', items: [{ item: 'minecraft:oak_log', count: 32 }] }, t()),
  ]);
  const view = teamView(team, teamContextOf(site));
  const r = builderAccounts(plan, view, [
    { member: 'b', where: 'planer', since: '2026-11-06T07:00:00Z' },
    { member: 'b', where: 'spiel', player: 'BenBaut', section: 's2', since: '2026-11-06T07:30:00Z' },
    { member: 'x', where: 'spiel', player: 'Fremd', since: '2026-11-06T07:31:00Z' },
    { member: 'srv', where: 'server', since: '2026-11-06T07:00:00Z' },
  ]);
  const anna = r.accounts.find(a => a.id === 'a'), line = anna.lines.find(l => l.itemId === item.itemId);
  assert.equal(line.missing, item.missing);
  assert.equal(line.claimed, 1);
  assert.equal(line.claimedByOthers, 2);
  assert.equal(line.open, Math.max(0, item.missing - 3));
  const log = anna.lines.find(l => l.itemId === 'minecraft:oak_log');
  assert.equal(log.brought, 32);
  assert.equal(anna.totals.brought, 32);
  assert.equal(anna.balance, 32);
  assert.equal(anna.inTeam, true);
  // Ben is live in the game (game wins over planer), with his section.
  const ben = r.accounts.find(a => a.id === 'b');
  assert.deepEqual(ben.live, { where: 'spiel', since: '2026-11-06T07:30:00Z', section: 's2', player: 'BenBaut' });
  assert.equal(ben.player, 'BenBaut');
  // Carla joined but is not in the planning: candidate; the stranger is only live in the room.
  assert.deepEqual(r.candidates.map(c => [c.id, c.player, c.live]), [['c', 'CarlaMC', false]]);
  assert.deepEqual(r.strangers, [{ member: 'x', player: 'Fremd' }]);
  // Taking the team over makes Carla a builder; the account then lists her.
  const sync = teamIntoProgram(programOf(site), view, '2026-11-06');
  assert.equal(sync.added, 1);
  const next = setProgram(site, { ...programOf(site), builders: sync.builders, assignments: sync.assignments });
  assert.ok(checkProgram(programOf(next)));
  // Bauzettel text with the account.
  const text = [builderText(plan, site, 'a', 'Burg'), ...accountText(anna)].join('\n');
  assert.match(text, /Deine Sammelzusagen/);
  assert.match(text, /Lagerbuchungen \(eingebracht 32, entnommen 0, Saldo \+32\)/);
  assert.match(text, /oak_log: \+32/);
});

test('items nobody promised are listed once per item with the builders that need them', () => {
  const { plan } = setup();
  const r = builderAccounts(plan, null);
  for (const u of r.unclaimed) {
    assert.ok(u.open > 0);
    assert.ok(u.builders.length >= 1);
  }
  const ids = r.unclaimed.map(u => u.itemId);
  assert.equal(new Set(ids).size, ids.length);
});
