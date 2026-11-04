// Testphase (QA-04): Testplan-Konsistenz, Testprotokoll und Fehlerbericht mit Diagnose (ohne Browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEST_AREAS, ALL_CASES, areaOf } from '../apps/web/src/testing/testplan.ts';
import { parseProtocol, setResult, summarize, protocolMarkdown, EMPTY } from '../apps/web/src/testing/protocol.ts';
import { bugReport, diagnosisText, issueUrl, ISSUE_URL_LIMIT, recordConsole, consoleLog, recordRoute, routeHistory } from '../apps/web/src/app/diagnostics.ts';
import { parseRoute, href } from '../apps/web/src/app/router.ts';
import { readFileSync } from 'node:fs';

test('Testplan: eindeutige IDs mit Bereichskürzel, Schritte und Erwartung in jedem Fall, Kernfälle je Bereich', () => {
  const ids = new Set();
  for (const area of TEST_AREAS) {
    assert.ok(area.cases.some(c => c.level === 'kern'), `${area.id}: kein Kernfall`);
    for (const c of area.cases) {
      assert.ok(!ids.has(c.id), `doppelte ID ${c.id}`); ids.add(c.id);
      assert.ok(c.id.startsWith(`${area.id}-`), `${c.id} gehört nicht zu ${area.id}`);
      assert.ok(c.steps.length > 0 && c.steps.every(s => s.length > 8), `${c.id}: Schritte fehlen`);
      assert.ok(c.expect.length > 10, `${c.id}: Erwartung fehlt`);
      if (c.start) assert.equal(href(parseRoute(c.start)).split('?')[0], c.start.split('?')[0], `${c.id}: Startadresse ${c.start} ist keine Route`);
    }
  }
  assert.equal(ALL_CASES.length, ids.size);
  assert.equal(areaOf('MOD-01')?.kind, 'mod');
  assert.equal(areaOf('nix'), undefined);
});

test('Testprotokoll: Ergebnisse setzen, aufheben, zusammenfassen und als Markdown ausgeben; kaputte Daten werden ignoriert', () => {
  let p = setResult(EMPTY, 'START-01', 'ok', '', '2026-11-02T10:00:00Z');
  p = setResult(p, 'START-02', 'fehler', 'Name\nweg', '2026-11-02T10:01:00Z');
  p = setResult(p, 'MOD-01', 'offen');
  const start = TEST_AREAS.find(a => a.id === 'START');
  assert.deepEqual(summarize(p, start), { total: start.cases.length, ok: 1, fehler: 1, offen: 0, done: 2 });
  assert.equal(summarize(p, start, 'kern').total, start.cases.filter(c => c.level === 'kern').length);
  p = setResult(p, 'START-01', null);
  assert.equal(p.entries['START-01'], undefined, 'ohne Notiz verschwindet der Eintrag');
  p = setResult(p, 'START-03', null, 'nur Notiz');
  assert.equal(p.entries['START-03'].result, 'offen', 'Notiz ohne Ergebnis gilt als offen');
  const md = protocolMarkdown({ ...p, tester: 'Anna' }, [['Build', 'abc1234'], ['Browser', 'Chrome'], ['Grafik', 'egal']], new Date('2026-11-02T12:00:00Z'));
  assert.match(md, /^## Testprotokoll Minecraft-Bauplaner\n- Tester: Anna\n- Stand: 2026-11-02T12:00:00.000Z\n- Build: abc1234\n- Browser: Chrome\n/);
  assert.ok(!md.includes('Grafik'));
  assert.match(md, /### Start, Projektzentrale und Sicherung · 0 ok, 1 Fehler, 1 offen/);
  assert.match(md, /- START-02 Projekt anlegen, umbenennen, löschen: ✕ Fehler – Name weg\n/);
  assert.match(md, /- MOD-01 Installation: \? offen\n/);
  assert.ok(!md.includes('BIB-'), 'nicht bewertete Bereiche fehlen');
  assert.equal(protocolMarkdown(EMPTY, []).trim().split('\n').at(-1), 'Noch kein Testfall bewertet.');

  assert.deepEqual(parseProtocol(null), EMPTY);
  assert.deepEqual(parseProtocol('{"tester":5,"entries":{"A":{"result":"kaputt"},"B":{"result":"ok"},"C":"x"}}'), { tester: '', entries: { B: { result: 'ok', note: '', at: '' } } });
  assert.deepEqual(parseProtocol('{{'), EMPTY);
  assert.deepEqual(parseProtocol(JSON.stringify(p)), p, 'Roundtrip');
});

test('Fehlerbericht: eigene Angaben, Diagnose mit Protokoll/Konsole/Seiten, GitHub-Adresse mit Feldern und Kürzung', () => {
  recordConsole('warn', ['Achtung', { a: 1 }]);
  recordConsole('error', [new Error('kaputt')]);
  recordRoute('#/'); recordRoute('#/'); recordRoute('#/bibliothek');
  assert.equal(consoleLog().length, 2);
  assert.equal(consoleLog()[0].text, 'Achtung {"a":1}');
  assert.equal(consoleLog()[1].text, 'Error: kaputt');
  assert.deepEqual(routeHistory().map(r => r.route), ['#/', '#/bibliothek']);

  const env = [['Build', 'abc1234 (2026-11-02)'], ['Browser', 'Test']];
  const errors = [{ at: '2026-11-02T10:00:00.000Z', source: 'render', message: 'TypeError: x', detail: 'at y', route: '#/projekt/1' }];
  const diag = diagnosisText(env, errors, consoleLog(), routeHistory());
  assert.match(diag, /### Umgebung\n- Build: abc1234 \(2026-11-02\)\n- Browser: Test\n/);
  assert.match(diag, /### Fehlerprotokoll \(1\)\n```\n#1 10:00:00 \[render\] #\/projekt\/1\nTypeError: x\nat y\n```/);
  assert.match(diag, /### Konsole \(2 Warnungen\/Fehler\)\n```\n\d\d:\d\d:\d\d Warnung: Achtung \{"a":1\}\n\d\d:\d\d:\d\d FEHLER: Error: kaputt\n```/);
  assert.match(diag, /### Zuletzt besuchte Seiten\n- \d\d:\d\d:\d\d #\/\n- \d\d:\d\d:\d\d #\/bibliothek$/);
  assert.match(diagnosisText(env, [], [], []), /Keine Fehler in dieser Sitzung\.\n\n### Konsole \(0 Warnungen\/Fehler\)\nKeine\.\n\n### Zuletzt besuchte Seiten\n- keine erfasst/);
  assert.ok(diagnosisText(env, [{ ...errors[0], message: 'a ``` b' }]).includes("a ''' b"), 'Zäune im Text werden entschärft');

  const bug = { title: 'Export kaputt', area: 'Projekt', severity: 'Funktion geht nicht', caseId: 'PROJ-04', steps: '1. Export', expected: 'Datei', actual: 'nichts', tester: 'Anna' };
  const report = bugReport(bug, diag, new Date('2026-11-02T12:00:00Z'));
  assert.match(report, /^## Export kaputt\n- Bereich: Projekt\n- Schwere: Funktion geht nicht\n- Testfall: PROJ-04\n- Tester: Anna\n- Zeit: 2026-11-02T12:00:00.000Z\n\n### Was ich gemacht habe\n1. Export\n\n### Erwartet\nDatei\n\n### Tatsächlich\nnichts\n\n## Diagnose/);
  assert.match(bugReport({ ...bug, title: ' ', caseId: '', tester: '' }, ''), /^## Fehler in der Testphase\n- Bereich: Projekt\n- Schwere: Funktion geht nicht\n- Zeit:/);

  const { url, truncated } = issueUrl('https://github.com/x/y', bug, diag);
  assert.equal(truncated, false);
  const u = new URL(url);
  assert.equal(u.pathname, '/x/y/issues/new');
  assert.equal(u.searchParams.get('template'), 'testphase-planer.yml');
  assert.equal(u.searchParams.get('title'), '[Planer] Export kaputt');
  assert.equal(u.searchParams.get('schritte'), '1. Export');
  assert.equal(u.searchParams.get('diagnose'), diag);
  const long = issueUrl('https://github.com/x/y', bug, 'x'.repeat(20_000));
  assert.equal(long.truncated, true);
  assert.ok(long.url.length <= ISSUE_URL_LIMIT, `${long.url.length}`);
  assert.match(new URL(long.url).searchParams.get('diagnose'), /x+\n\n… gekürzt\. Vollständige Diagnose/);

  // Die Felder der Adresse müssen die IDs der Issue-Vorlage sein, sonst bleibt das Formular leer.
  const template = readFileSync(new URL('../.github/ISSUE_TEMPLATE/testphase-planer.yml', import.meta.url), 'utf8');
  for (const id of ['bereich', 'schwere', 'testfall', 'schritte', 'erwartet', 'tatsaechlich', 'diagnose']) {
    assert.ok(template.includes(`id: ${id}\n`), `Vorlage ohne Feld ${id}`);
    assert.ok(u.searchParams.has(id), `Adresse ohne Feld ${id}`);
  }
});

test('Route #/testphase mit Parametern', () => {
  assert.deepEqual(parseRoute('#/testphase'), { view: 'testphase' });
  assert.deepEqual(parseRoute('#/testphase?melden=PROJ-04'), { view: 'testphase', search: 'melden=PROJ-04' });
  assert.equal(href({ view: 'testphase', search: 'melden' }), '#/testphase?melden');
  assert.equal(parseRoute('#/testphase/x').view, 'not-found');
});

test('Abnahme je Paket: jedes implementierte Roadmap-Paket hat bekannte Testfälle', async () => {
  const { ACCEPTANCE, ALL_CASES, packagesOf } = await import('../apps/web/src/testing/testplan.ts');
  const { readFileSync } = await import('node:fs');
  const roadmap = JSON.parse(readFileSync(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const known = new Set(ALL_CASES.map(c => c.id));
  for (const item of roadmap.items.filter(i => i.status === 'implemented')) {
    assert.ok(ACCEPTANCE[item.id]?.length, `${item.id} ohne Testfälle`);
    for (const c of ACCEPTANCE[item.id]) assert.ok(known.has(c), `${item.id}: ${c} unbekannt`);
  }
  assert.deepEqual(packagesOf('DATEI-07'), ['NBT-01', 'ENTITY-01']);
  assert.equal(new Set(ALL_CASES.map(c => c.id)).size, ALL_CASES.length, 'Fall-IDs eindeutig');
});
