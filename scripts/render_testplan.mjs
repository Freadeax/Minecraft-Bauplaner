// Erzeugt docs/testing/TESTPLAN.md aus apps/web/src/testing/testplan.ts (eine Quelle für Seite und Doku).
// Aufruf: node scripts/render_testplan.mjs [--check]  (--check: nur prüfen, ob die Datei aktuell ist)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TEST_AREAS } from '../apps/web/src/testing/testplan.ts';

const out = fileURLToPath(new URL('../docs/testing/TESTPLAN.md', import.meta.url));
const lines = [
  '# Testplan der großen Testphase (QA-04)',
  '',
  'Erzeugt aus `apps/web/src/testing/testplan.ts` mit `node scripts/render_testplan.mjs`; nicht von Hand ändern. Dieselben Fälle stehen im Planer unter **Testphase** (`#/testphase`) mit Haken, Notizen und „Fehler melden“.',
  '',
  '**Kern** = in jeder Testrunde einmal; **vertieft** = wenn Zeit ist oder der Bereich geändert wurde. Fehler bitte über den Planer (Testphase → Fehler melden) oder die GitHub-Vorlagen „Testphase: Planer“ / „Testphase: Mod“ melden; im Spiel vorher `/bauplaner diagnose`.',
  '',
];
let kern = 0, total = 0;
for (const area of TEST_AREAS) {
  lines.push(`## ${area.id} · ${area.title} (${area.kind === 'mod' ? 'Mod' : 'Planer'})`, '', area.intro, '');
  lines.push('| ID | Fall | Stufe | Schritte | Erwartet |', '|---|---|---|---|---|');
  for (const c of area.cases) {
    total++; if (c.level === 'kern') kern++;
    const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join('<br>');
    lines.push(`| ${c.id} | ${c.title}${c.start ? ` ([Start](https://freadeax.github.io/Minecraft-Bauplaner/${c.start}))` : ''} | ${c.level} | ${steps.replaceAll('|', '\\|')} | ${c.expect.replaceAll('|', '\\|')} |`);
  }
  lines.push('');
}
lines.splice(4, 0, `Umfang: ${total} Fälle in ${TEST_AREAS.length} Bereichen, davon ${kern} Kernfälle.`, '');
const text = lines.join('\n');
if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(out, 'utf8'); } catch { /* fehlt */ }
  if (current !== text) { console.error('docs/testing/TESTPLAN.md ist nicht aktuell: node scripts/render_testplan.mjs'); process.exit(1); }
  console.log('TESTPLAN.md aktuell.');
} else {
  writeFileSync(out, text);
  console.log(`${out}: ${total} Fälle, ${kern} Kern.`);
}
