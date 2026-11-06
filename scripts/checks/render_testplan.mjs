// Erzeugt docs/testing/TESTPLAN.md aus apps/web/src/testing/testplan.ts (eine Quelle für Seite und Doku).
// Aufruf: node scripts/checks/render_testplan.mjs [--check]  (--check: nur prüfen, ob die Datei aktuell ist)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ACCEPTANCE, ALL_CASES, AREA_KIND_LABEL, MERGED_INTO, PLACE_LABEL, packagePlace, TEST_AREAS } from '../../apps/web/src/testing/testplan.ts';

const out = fileURLToPath(new URL('../../docs/testing/TESTPLAN.md', import.meta.url));
const lines = [
  '# Testplan der großen Testphase (QA-04)',
  '',
  'Erzeugt aus `apps/web/src/testing/testplan.ts` mit `node scripts/checks/render_testplan.mjs`; nicht von Hand ändern. Dieselben Fälle stehen im Planer unter **Testphase** (`#/testphase`) mit Haken, Notizen und „Fehler melden“.',
  '',
  'Aufbau: drei Teile – nur im Browser (Planer), mit Minecraft (Mod) und mit Paper-Server (Plugin). Am 06.11.2026 neu geordnet: doppelte Fälle zusammengelegt, Dateiwege nur noch als Notfall; welche früheren IDs in welchem Fall stecken, steht am Ende unter „Zusammengelegte Fälle“.',
  '',
  '**Kern** = in jeder Testrunde einmal; **vertieft** = wenn Zeit ist oder der Bereich geändert wurde. Fehler bitte über den Planer (Testphase → Fehler melden) oder die GitHub-Vorlagen „Testphase: Planer“ / „Testphase: Mod“ melden; im Spiel vorher `/bauplaner diagnose`.',
  '',
];
let kern = 0, total = 0;
for (const area of TEST_AREAS) {
  lines.push(`## ${area.id} · ${area.title} (${AREA_KIND_LABEL[area.kind]})`, '', area.intro, '');
  lines.push('| ID | Fall | Stufe | Schritte | Erwartet |', '|---|---|---|---|---|');
  for (const c of area.cases) {
    total++; if (c.level === 'kern') kern++;
    const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join('<br>');
    lines.push(`| ${c.id}${c.merged ? `<br><small>früher ${c.merged.join(', ')}</small>` : ''} | ${c.title}${c.start ? ` ([Start](https://freadeax.github.io/Minecraft-Bauplaner/${c.start}))` : ''} | ${c.level} | ${steps.replaceAll('|', '\\|')} | ${c.expect.replaceAll('|', '\\|')} |`);
  }
  lines.push('');
}
// Abnahme je Roadmap-Paket: jedes implementierte Paket braucht Testfälle (QA-04).
const known = new Set(ALL_CASES.map(c => c.id));
const roadmap = JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/roadmap.json', import.meta.url)), 'utf8'));
const problems = [];
for (const item of roadmap.items) if (item.status === 'implemented' && !ACCEPTANCE[item.id]?.length) problems.push(`${item.id} ist implementiert, hat aber keine Testfälle in ACCEPTANCE (apps/web/src/testing/testplan.ts)`);
for (const [pkg, cases] of Object.entries(ACCEPTANCE)) for (const c of cases) if (!known.has(c)) problems.push(`ACCEPTANCE ${pkg}: unbekannter Testfall ${c}`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
lines.push('## Abnahme je Roadmap-Paket', '', 'Welche Fälle die Abnahme eines Pakets abdecken (Quelle `ACCEPTANCE` in testplan.ts), geordnet nach dem Ort, den die Abnahme braucht. Ein Paket gilt als abgenommen, wenn alle genannten Fälle ✓ sind; Ob ein Paket noch auf Abnahme wartet, steht in `docs/ROADMAP.md`.', '');
for (const place of Object.keys(PLACE_LABEL)) {
  const pkgs = Object.keys(ACCEPTANCE).filter(p => packagePlace(p) === place).sort((a, b) => a.localeCompare(b));
  lines.push(`### ${PLACE_LABEL[place]} (${pkgs.length} Pakete)`, '', '| Paket | Testfälle |', '|---|---|');
  for (const pkg of pkgs) lines.push(`| ${pkg} | ${ACCEPTANCE[pkg].join(', ')} |`);
  lines.push('');
}
const merged = Object.entries(MERGED_INTO).sort(([a], [b]) => a.localeCompare(b, 'de', { numeric: true }));
lines.push('## Zusammengelegte Fälle', '', 'Frühere Fall-IDs bleiben gültig: Testprotokolle übernehmen ihre Haken (✕ in einem Teil → ✕, ✓ nur wenn alle Teile ✓, sonst ?), `#/testphase?melden=<frühere ID>` und die Suche auf der Seite führen zum neuen Fall.', '', '| Früher | Jetzt |', '|---|---|');
for (const [old, cur] of merged) lines.push(`| ${old} | ${cur} |`);
lines.push('');
lines.splice(4, 0, `Umfang: ${total} Fälle in ${TEST_AREAS.length} Bereichen, davon ${kern} Kernfälle.`, '');
const text = lines.join('\n');
if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(out, 'utf8'); } catch { /* fehlt */ }
  if (current !== text) { console.error('docs/testing/TESTPLAN.md ist nicht aktuell: node scripts/checks/render_testplan.mjs'); process.exit(1); }
  console.log('TESTPLAN.md aktuell.');
} else {
  writeFileSync(out, text);
  console.log(`${out}: ${total} Fälle, ${kern} Kern.`);
}
