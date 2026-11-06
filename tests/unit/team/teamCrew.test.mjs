// TEAM-03: Abschnitte und Sammelaufträge für mehrere Spieler, versionierte Zuständigkeiten und Buchungen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTeam, teamEvent, appendEvents, teamView, mergeTeam, checkTeam, checkTeamEvent, teamIssues, teamSchedule, teamProgress, teamAssignments, authorize,
  compactTeam, MAX_CREW,
} from '../../../dist/domain/src/index.js';

let clock = Date.parse('2026-11-06T10:00:00Z');
const t = (min = 1) => new Date(clock += min * 60_000).toISOString();
const ev = (by, body, at = t()) => teamEvent(by, body, at);
const ctx = { sections: [{ id: 'sec_a', name: 'Fundament' }, { id: 'sec_b', name: 'Dach' }], builders: [] };
const team0 = () => appendEvents(createTeam({ name: 'Burg', founder: 'phil', teamId: 'team_crew0001', at: '2026-11-06T09:00:00Z' }), [
  ev('phil', { kind: 'member.join', member: 'phil', name: 'Philipp' }),
  ev('anna', { kind: 'member.join', member: 'anna', name: 'Anna' }),
  ev('ben', { kind: 'member.join', member: 'ben', name: 'Ben' }),
  ev('cem', { kind: 'member.join', member: 'cem', name: 'Cem' }),
  ev('phil', { kind: 'member.role', member: 'ben', role: 'meister' }),
]);
const sec = (view, id = 'sec_a') => view.sections.find(s => s.sectionId === id);
const add = (team, ...events) => appendEvents(team, events);

test('Mitbauer: Meister legt fest, ohne Inhaber wird der erste verantwortlich; Helfer steigen ein und aus', () => {
  let team = add(team0(), ev('ben', { kind: 'section.crew', section: 'sec_a', members: ['anna', 'cem'] }));
  let v = teamView(team, ctx);
  assert.equal(sec(v).owner, 'anna');
  assert.deepEqual(sec(v).crew, ['cem']);
  assert.equal(sec(v).status, 'vergeben');
  assert.equal(sec(v).version, 1);
  assert.deepEqual(v.members.find(m => m.id === 'cem').crewSections, ['sec_a']);
  assert.deepEqual(teamAssignments(v).sec_a, ['anna', 'cem']);

  team = add(team, ev('phil', { kind: 'section.join', section: 'sec_a', base: 1 }));
  v = teamView(team, ctx);
  assert.deepEqual(sec(v).crew, ['cem', 'phil']);
  assert.equal(sec(v).version, 2);

  // Anna (Inhaberin) steigt aus: Cem wird verantwortlich, Phil bleibt Mitbauer.
  team = add(team, ev('anna', { kind: 'section.leave', section: 'sec_a', base: 2 }));
  v = teamView(team, ctx);
  assert.equal(sec(v).owner, 'cem');
  assert.deepEqual(sec(v).crew, ['phil']);
  // Mitbauer meldet fertig: kein Konflikt.
  team = add(team, ev('phil', { kind: 'section.done', section: 'sec_a' }));
  v = teamView(team, ctx);
  assert.equal(sec(v).status, 'gemeldet');
  assert.equal(v.conflicts.length, 0);
  assert.equal(v.members.find(m => m.id === 'phil').reportedSections, 1);
});

test('Rechte: Helfer legen keine Mitbauer fest, Gäste bauen nicht mit, nur Meister nehmen andere heraus', () => {
  let team = add(team0(), ev('phil', { kind: 'member.role', member: 'cem', role: 'gast' }));
  team = add(team, ev('anna', { kind: 'section.crew', section: 'sec_a', members: ['anna', 'ben'] }));
  let v = teamView(team, ctx);
  assert.match(v.rejected.at(-1).reason, /Helfer und darf das nicht/);
  team = add(team, ev('ben', { kind: 'section.crew', section: 'sec_a', members: ['anna', 'cem'] }));
  v = teamView(team, ctx);
  assert.match(v.rejected.at(-1).reason, /Gast und kann nicht mitbauen/);
  team = add(team, ev('ben', { kind: 'section.crew', section: 'sec_a', members: ['anna', 'phil'] }));
  team = add(team, ev('anna', { kind: 'section.leave', section: 'sec_a', member: 'phil' }));
  v = teamView(team, ctx);
  assert.match(v.rejected.at(-1).reason, /selbst oder ein Baumeister/);
  team = add(team, ev('ben', { kind: 'section.leave', section: 'sec_a', member: 'phil' }));
  v = teamView(team, ctx);
  assert.deepEqual(sec(v).crew, []);
  assert.equal(sec(v).owner, 'anna');
  assert.equal(authorize(team, ctx, 'anna', { kind: 'section.crew', section: 'sec_b', members: ['anna'] }).ok, false);
});

test('Versionen: zwei Meister weisen gleichzeitig zu – der spätere ist überholt und wird nicht still übernommen', () => {
  let team = add(team0(), ev('ben', { kind: 'section.crew', section: 'sec_a', members: ['anna'] }));
  const base = sec(teamView(team, ctx)).version;
  // Beide sahen Version 1 (offline, gleichzeitig): Phil will Cem dazu, Ben will Phil dazu.
  const a = add(team, ev('phil', { kind: 'section.crew', section: 'sec_a', members: ['anna', 'cem'], base }));
  const b = add(team, ev('ben', { kind: 'section.crew', section: 'sec_a', members: ['anna', 'phil'], base }));
  const merged = mergeTeam(a, b).team;
  const v = teamView(merged, ctx);
  assert.deepEqual(sec(v).crew, ['cem']); // Phils Änderung kam zuerst
  const stale = v.rejected.find(r => r.stale);
  assert.ok(stale, 'überholte Änderung steht in den Hinweisen');
  assert.match(stale.reason, /Überholt: „Fundament“ wurde inzwischen von Philipp geändert \(gesehen Version 1, jetzt 2\)/);
  // Merge in der anderen Richtung ergibt denselben Stand.
  assert.deepEqual(sec(teamView(mergeTeam(b, a).team, ctx)), sec(v));
  // Lösung: „Trotzdem so übernehmen“ schreibt die Änderung auf der aktuellen Version neu.
  const issue = teamIssues(merged, ctx, v).find(i => i.event.id === stale.event.id);
  const fix = issue.fixes.find(f => f.label === 'Trotzdem so übernehmen');
  assert.equal(fix.body.base, 2);
  const fixed = add(merged, ev('ben', fix.body));
  assert.deepEqual(sec(teamView(fixed, ctx)).crew, ['phil']);
  // Eigene Folgeänderungen auf alter Version sind nicht überholt.
  const own = add(fixed, ev('ben', { kind: 'section.join', section: 'sec_b', base: 0 }), ev('ben', { kind: 'section.crew', section: 'sec_b', members: ['ben', 'anna'], base: 0 }));
  const vo = teamView(own, ctx);
  assert.equal(vo.rejected.filter(r => r.stale).length, 1);
  assert.deepEqual(sec(vo, 'sec_b').crew, ['anna']);
});

test('Ohne Version (ältere Mod/Plugin-Ereignisse) gilt die alte Regel weiter', () => {
  let team = add(team0(), ev('anna', { kind: 'section.claim', section: 'sec_a' }), ev('ben', { kind: 'section.assign', section: 'sec_a', member: 'cem' }));
  const v = teamView(team, ctx);
  assert.equal(sec(v).owner, 'cem');
  assert.equal(sec(v).version, 2);
  assert.equal(v.conflicts.length, 1);
  // Zuweisen an einen Mitbauer ist kein Umweisen gegen jemanden: kein Konflikt, er wechselt in die Verantwortung.
  team = add(team, ev('ben', { kind: 'section.crew', section: 'sec_a', members: ['cem', 'anna'] }), ev('ben', { kind: 'section.assign', section: 'sec_a', member: 'anna' }));
  const w = teamView(team, ctx);
  assert.equal(sec(w).owner, 'anna');
  assert.deepEqual(sec(w).crew, []);
  assert.equal(w.conflicts.length, 1);
  // Abgeben durch einen Mitbauer heißt nur aussteigen.
  team = add(team, ev('ben', { kind: 'section.crew', section: 'sec_a', members: ['anna', 'phil'] }), ev('phil', { kind: 'section.release', section: 'sec_a' }));
  assert.equal(sec(teamView(team, ctx)).owner, 'anna');
  assert.deepEqual(sec(teamView(team, ctx)).crew, []);
});

test('Sammelauftrag auf mehrere Spieler verteilen, versioniert', () => {
  let team = add(team0(), ev('anna', { kind: 'gather.claim', item: 'minecraft:oak_log', count: 64 }));
  let v = teamView(team, ctx);
  assert.equal(v.gatherVersions['minecraft:oak_log'], 1);
  team = add(team, ev('ben', { kind: 'gather.assign', item: 'minecraft:oak_log', shares: [{ member: 'anna', count: 200 }, { member: 'cem', count: 120 }], base: 1 }));
  v = teamView(team, ctx);
  assert.deepEqual(v.gather.map(g => [g.member, g.count, g.by]), [['anna', 200, 'ben'], ['cem', 120, 'ben']]);
  assert.equal(v.gatherVersions['minecraft:oak_log'], 2);
  // Anna gibt auf Version 1 zurück (hat die Verteilung nicht gesehen): überholt.
  team = add(team, ev('anna', { kind: 'gather.claim', item: 'minecraft:oak_log', count: 0, base: 1 }));
  v = teamView(team, ctx);
  assert.equal(v.gather.length, 2);
  assert.ok(v.rejected.at(-1).stale);
  // Auf dem aktuellen Stand geht es.
  team = add(team, ev('anna', { kind: 'gather.claim', item: 'minecraft:oak_log', count: 0, base: 2 }));
  assert.deepEqual(teamView(team, ctx).gather.map(g => g.member), ['cem']);
  // Gäste bekommen keine Sammelaufträge; Helfer dürfen nicht verteilen.
  team = add(team, ev('phil', { kind: 'member.role', member: 'cem', role: 'gast' }), ev('ben', { kind: 'gather.assign', item: 'minecraft:stone', shares: [{ member: 'cem', count: 5 }] }),
    ev('anna', { kind: 'gather.assign', item: 'minecraft:stone', shares: [{ member: 'anna', count: 5 }] }));
  v = teamView(team, ctx);
  assert.match(v.rejected.at(-2).reason, /Gast und sammelt nicht/);
  assert.match(v.rejected.at(-1).reason, /Helfer und darf das nicht/);
});

test('Buchungen korrigieren und stornieren: neue Version, Konto rechnet neu, Verlauf bleibt', () => {
  let team = add(team0(), ev('anna', { kind: 'contribution', items: [{ item: 'minecraft:stone', count: 64 }], blocks: 100 }));
  const ref = team.events.at(-1).id;
  team = add(team, ev('anna', { kind: 'contribution.fix', ref, items: [{ item: 'minecraft:stone', count: 32 }], blocks: 100, note: 'verzählt', base: 1 }));
  let v = teamView(team, ctx);
  assert.equal(v.delivered['minecraft:stone'], 32);
  assert.equal(v.members.find(m => m.id === 'anna').items['minecraft:stone'], 32);
  const b = v.bookings.find(x => x.id === ref);
  assert.equal(b.version, 2);
  assert.equal(b.history[0].text, 'korrigiert: verzählt');
  // Cem (Helfer) darf fremde Buchungen nicht ändern, Ben (Meister) storniert.
  team = add(team, ev('cem', { kind: 'contribution.fix', ref, base: 2 }));
  assert.match(teamView(team, ctx).rejected.at(-1).reason, /Nur Anna oder ein Baumeister/);
  team = add(team, ev('ben', { kind: 'contribution.fix', ref, base: 2 }));
  v = teamView(team, ctx);
  assert.equal(v.delivered['minecraft:stone'], undefined);
  assert.equal(v.members.find(m => m.id === 'anna').blocks, 0);
  assert.equal(v.bookings.find(x => x.id === ref).cancelled, true);
  // Eine zweite Korrektur auf Version 2 (Anna sah die Stornierung nicht) ist überholt.
  team = add(team, ev('anna', { kind: 'contribution.fix', ref, items: [{ item: 'minecraft:stone', count: 30 }], base: 2 }));
  v = teamView(team, ctx);
  assert.ok(v.rejected.at(-1).stale);
  assert.equal(v.delivered['minecraft:stone'], undefined);
  // Unbekannte Buchung.
  team = add(team, ev('anna', { kind: 'contribution.fix', ref: 'evt_gibtsnicht', blocks: 1 }));
  assert.match(teamView(team, ctx).rejected.at(-1).reason, /gibt es nicht/);
});

test('Verdichten rechnet korrigierte Buchungen netto ein', () => {
  let team = add(team0(), ev('anna', { kind: 'contribution', items: [{ item: 'minecraft:stone', count: 64 }] }));
  const ref = team.events.at(-1).id;
  team = add(team, ev('anna', { kind: 'contribution.fix', ref, items: [{ item: 'minecraft:stone', count: 10 }] }));
  t(60);
  team = add(team, ev('anna', { kind: 'note.add', noteId: 'n1', text: 'danach', tag: 'info' }));
  const before = teamView(team, ctx);
  const r = compactTeam(team, ctx, { before: new Date(clock - 30 * 60_000).toISOString(), by: 'phil', run: 'crew1' });
  const after = teamView(r.team, ctx);
  assert.equal(after.delivered['minecraft:stone'], before.delivered['minecraft:stone']);
  assert.equal(after.bookings.length, 0);
});

test('Prüfung der neuen Ereignisse und Grenzen', () => {
  const base = { id: 'e1', at: '2026-11-06T10:00:00Z', by: 'ben', origin: 'planer' };
  assert.throws(() => checkTeamEvent({ ...base, kind: 'section.crew', section: 'sec_a', members: Array.from({ length: MAX_CREW + 1 }, (_, i) => `m${i}`) }), /höchstens 8 Mitbauer/);
  assert.throws(() => checkTeamEvent({ ...base, kind: 'section.crew', section: 'sec_a', members: ['a', 'a'] }), /doppelt/);
  assert.throws(() => checkTeamEvent({ ...base, kind: 'gather.assign', item: 'stone', shares: [] }), /Item ungültig/);
  assert.throws(() => checkTeamEvent({ ...base, kind: 'gather.assign', item: 'minecraft:stone', shares: [{ member: 'a', count: 0 }] }), /Menge/);
  assert.throws(() => checkTeamEvent({ ...base, kind: 'section.claim', section: 'sec_a', base: -1 }), /Version/);
  assert.doesNotThrow(() => checkTeamEvent({ ...base, kind: 'contribution.fix', ref: 'e0', items: [] }));
  // Ein Team mit allen neuen Arten übersteht Export/Import.
  const team = add(team0(), ev('ben', { kind: 'section.crew', section: 'sec_a', members: ['anna', 'cem'] }), ev('ben', { kind: 'gather.assign', item: 'minecraft:stone', shares: [{ member: 'anna', count: 5 }] }));
  assert.deepEqual(checkTeam(JSON.parse(JSON.stringify(team))).events.length, team.events.length);
  // Sechs weitere Spieler füllen die Mannschaft auf 8, der neunte wird abgewiesen.
  let big = team;
  for (let i = 0; i < 7; i++) big = add(big, ev(`p${i}`, { kind: 'member.join', member: `p${i}`, name: `Spieler ${i}` }), ev(`p${i}`, { kind: 'section.join', section: 'sec_a' }));
  const v = teamView(big, ctx);
  assert.equal(1 + sec(v).crew.length, MAX_CREW);
  assert.match(v.rejected.at(-1).reason, /schon 8 Spieler/);
});

test('Zeitplan und Fortschritt: Mitbauer machen den Abschnitt schneller und teilen die Arbeit', () => {
  const work = [
    { id: 'sec_a', name: 'Fundament', work: 600, openWork: 600, steps: 3, dependsOn: [], dependsOnLater: [] },
    { id: 'sec_b', name: 'Dach', work: 300, openWork: 300, steps: 2, dependsOn: [], dependsOnLater: [] },
  ];
  const team = add(team0(), ev('ben', { kind: 'section.crew', section: 'sec_a', members: ['anna', 'cem'] }), ev('ben', { kind: 'section.assign', section: 'sec_b', member: 'cem' }));
  const v = teamView(team, ctx);
  const plan = teamSchedule({ view: v, work, pace: { blocksPerSession: 300 }, today: '2026-11-06' });
  const a = plan.items.find(i => i.sectionId === 'sec_a'), b = plan.items.find(i => i.sectionId === 'sec_b');
  assert.equal(a.end, 1); // 600 Blöcke, zwei Spieler à 300
  assert.deepEqual(a.crew, ['cem']);
  assert.equal(b.start, 1); // Cem ist erst nach dem Fundament frei
  assert.ok(plan.notes.some(n => /Mitbauern/.test(n)));
  const p = teamProgress({ view: v, work, now: '2026-11-06T12:00:00Z' });
  assert.equal(p.members.find(m => m.member === 'anna').work, 300);
  assert.equal(p.members.find(m => m.member === 'cem').work, 600);
});
