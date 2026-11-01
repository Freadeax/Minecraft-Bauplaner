import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isPagesArtifact } from './prepare_main_pages.mjs';

export const labels = { planned: '⏳ Offen', in_progress: '🚧 In Arbeit', blocked: '⛔ Blockiert', implemented: '🧩 Implementiert · Abnahme offen', verified: '✅ Im beschriebenen Umfang geprüft', deferred: '⏸ Zurückgestellt' };
const generated = ['docs/ROADMAP.md', 'docs/ROADMAP_HISTORY.md'];
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const safePath = p => typeof p === 'string' && p.length > 0 && !p.startsWith('/') && !p.split('/').includes('..') && !/[\r\n]/.test(p);
const validDate = s => typeof s === 'string' && Number.isFinite(Date.parse(s)) && /(?:Z|[+-]\d\d:\d\d)$/.test(s);
const hash = s => s === null || typeof s === 'string' && /^[a-f0-9]{40}$/.test(s);
export function validateRoadmap(data, root = process.cwd()) {
  const errors = [];
  if (data?.schemaVersion !== 1 || !Array.isArray(data?.items) || !Array.isArray(data?.phases) || !Array.isArray(data?.events)) return ['Roadmap-Schema ungültig.'];
  if (!validDate(data.updatedAt) || !hash(data.baselineCommit) || !data.baselineCommit) errors.push('Zeit/Baseline ungültig.');
  const ids = new Set(), phases = new Set(data.phases.map(p => p.id));
  if (phases.size !== 4 || data.phases.length !== 4) errors.push('Genau vier eindeutige Phasen erforderlich.');
  for (const p of data.phases) if (!p.title || !p.goal || !p.exit?.length) errors.push(`Phase ${p.id}: Ziel/Abnahme fehlt.`);
  for (const item of data.items) {
    if (!/^[A-Z]+(?:-[A-Z]+)*-\d{2}$/.test(item.id) || ids.has(item.id)) errors.push(`Ungültige/doppelte Aufgaben-ID ${item.id}`);
    ids.add(item.id);
    if (!phases.has(item.phase) || !Object.hasOwn(labels, item.status) || !item.title || !item.owner || !item.next || !validDate(item.updatedAt)) errors.push(`${item.id}: Pflichtfelder/Status fehlen.`);
    if (!Array.isArray(item.dependencies) || !Array.isArray(item.legacyIds) || !item.scope?.length || item.scope.some(p => !safePath(p))) errors.push(`${item.id}: Abhängigkeiten/Dateiumfang ungültig.`);
    if (!item.acceptance?.length || !Array.isArray(item.evidence) || !Array.isArray(item.blockers)) errors.push(`${item.id}: Abnahme/Nachweise fehlen.`);
    const steps = new Set();
    if (!item.steps?.length) errors.push(`${item.id}: Teilschritte fehlen.`);
    for (const step of item.steps ?? []) {
      if (!step.id?.startsWith(`${item.id}-S`) || steps.has(step.id) || typeof step.done !== 'boolean' || !step.title) errors.push(`${item.id}: ungültiger Teilschritt.`);
      steps.add(step.id);
    }
    if (item.status === 'blocked' && !item.blockers?.length) errors.push(`${item.id}: Blockergrund fehlt.`);
    if (item.status === 'planned' && item.steps?.some(s => s.done)) errors.push(`${item.id}: offene Aufgabe hat erledigte Schritte.`);
    if (item.status === 'verified' && (!item.steps?.every(s => s.done) || item.verification?.state !== 'passed' || !item.evidence?.length)) errors.push(`${item.id}: geprüft ohne vollständige Schritte/Nachweis.`);
    if (!['passed', 'pending', 'failed'].includes(item.verification?.state) || !item.verification?.note) errors.push(`${item.id}: Prüfstand fehlt.`);
    if (!item.delivery || !hash(item.delivery.main) || !hash(item.delivery.pagesSource)) errors.push(`${item.id}: Commitnachweis ungültig.`);
    for (const e of item.evidence ?? []) if (!safePath(e.path) || !existsSync(path.join(root, e.path)) || !e.note) errors.push(`${item.id}: Nachweis fehlt: ${e.path}`);
  }
  const byId = new Map(data.items.map(i => [i.id, i]));
  for (const item of data.items) for (const dep of item.dependencies ?? []) {
    if (!ids.has(dep) || dep === item.id) errors.push(`${item.id}: unbekannte/eigene Abhängigkeit ${dep}`);
    const before = byId.get(dep);
    if (before && Number(before.phase.slice(1)) > Number(item.phase.slice(1))) errors.push(`${item.id}: Rückwärtsabhängigkeit zu späterer Phase ${dep}`);
  }
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { errors.push(`Zyklische Abhängigkeit bei ${id}`); return; }
    if (visited.has(id) || !byId.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id).dependencies ?? []) visit(dep);
    visiting.delete(id); visited.add(id);
  }
  for (const id of ids) visit(id);
  if (!Array.isArray(data.active) || data.active.some(id => !ids.has(id))) errors.push('Aktive Aufgaben unbekannt.');
  for (const event of data.events) {
    if (!validDate(event.at) || !event.summary || !event.kind || !event.items?.length || event.items.some(id => !ids.has(id))) errors.push('Ungültiger Verlaufseintrag.');
    if (event.files && (!Array.isArray(event.files) || event.files.some(p => !safePath(p)))) errors.push('Ungültige Dateizuordnung im Verlauf.');
  }
  return errors;
}
const esc = s => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
const done = i => i.steps.filter(s => s.done).length;
const short = h => h ? `\`${h.slice(0, 7)}\`` : 'ausstehend';
const commit = h => h ? `[${h.slice(0, 7)}](https://github.com/Freadeax/Minecraft-Bauplaner/commit/${h})` : 'ausstehend';
export function renderRoadmap(data) {
  const counts = Object.keys(labels).map(k => `| ${labels[k]} | ${data.items.filter(i => i.status === k).length} |`).join('\n');
  let out = `# Verbindliche Roadmap und Fortschritt\n\nStand: ${data.updatedAt}. Automatisch erzeugt aus [roadmap.json](roadmap.json); nicht direkt bearbeiten. Baseline: ${commit(data.baselineCommit)}.\n\n## So liest du den Stand\n\n- Jede Aufgabe hat eine feste ID, echte Teilschritte, Abhängigkeiten, Nachweise und eine nächste Aktion.\n- **Implementiert ≠ geprüft ≠ auf Main ≠ live.** „Geprüft“ gilt nur für den beschriebenen Umfang und den genannten Nachweis.\n- Teilschritte sind abzählbare Ergebnisse, keine geschätzten Fertigstellungsprozente. Eine Phase ist erst nach ihren Austrittskriterien abgeschlossen.\n- Main-/Pages-Spalten nennen den letzten eingetragenen Nachweis; jüngste Integration ist über Git-Historie und das [Live-Manifest](https://freadeax.github.io/Minecraft-Bauplaner/deployment.json) nachprüfbar. Ein neuer Commit kann den eigenen Hash nicht enthalten.\n- Historische Nachweise ersetzen keinen aktuellen Browser-, Geräte- oder Spieltest.\n\n| Status | Pakete |\n|---|---:|\n${counts}\n\n## Aktiver Arbeitsblock\n\n`;
  for (const id of data.active) {
    const i = data.items.find(i => i.id === id);
    out += `- **${i.id} · ${i.title}** — ${labels[i.status]}, ${done(i)}/${i.steps.length} Teilschritte. Nächster Schritt: ${i.next}\n`;
  }
  out += '\n## Verbindlicher Ablauf bei jedem Main-Merge oder Push\n\n1. Vor Beginn Aufgabe und Dateiumfang in COMMUNICATION anmelden; Eintrag hier auf „In Arbeit“ setzen.\n2. Teilschritte und Nachweise nach jedem vollständigen Arbeitsblock aktualisieren; Blocker mit Grund und nächster Aktion festhalten.\n3. `npm run roadmap:record -- ID-01,ID-02 "Konkretes Ergebnis und Prüfgrenzen"` hängt Dateien und Aufgabenstände an die Historie an und rendert beide Ansichten. Änderungen an Aufgaben vorher in roadmap.json eintragen.\n4. `npm run check` und ausführbare Browserprüfungen durchführen; Ergebnisse in TESTING festhalten.\n5. `npm run check:roadmap-change -- <vorheriger-main> [quellcommit]` prüft vor Integration Dateizuordnung, neue Ereignisse und unveränderte Historie.\n6. Regulär integrieren; den passenden manifestgeprüften Pages-Artefaktcommit unmittelbar veröffentlichen. Artefaktcommits benötigen keinen neuen Aufgabenstatus.\n7. Integration und Live-Hash prüfen; tatsächliche SHAs im Abschluss berichten und beim nächsten sachlichen Quellupdate nachtragen. Keine künstliche Deployment-Commit-Schleife.\n\nLokaler Pre-Push-Hook: `npm run setup:hooks`. Ohne eigene Actions erzwingt GitHub diese lokale Regel nicht für fremde Clients oder direkte API-Schreibzugriffe. Auch beim Konnektor gilt deshalb die dokumentierte Vorprüfung.\n\n';
  for (const phase of data.phases) {
    out += `## ${phase.id}: ${phase.title}\n\n**Ziel:** ${phase.goal}\n\n**Austrittskriterien:**\n\n${phase.exit.map(x => `- ${x}`).join('\n')}\n\n| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |\n|---|---|---|---:|---|---|---|\n`;
    for (const i of data.items.filter(i => i.phase === phase.id)) out += `| [${i.id}](#${i.id.toLowerCase()}) | ${esc(i.title)} | ${labels[i.status]} | ${done(i)}/${i.steps.length} | ${i.dependencies.join(', ') || '—'} | ${short(i.delivery.main)} | ${short(i.delivery.pagesSource)} |\n`;
    out += '\n';
  }
  out += '## Details aller Arbeitspakete\n\n';
  for (const i of data.items) {
    out += `### ${i.id}\n\n**${i.title}** · ${labels[i.status]} · Priorität ${i.priority} · Verantwortlich: ${i.owner} · Aktualisiert: ${i.updatedAt}\n\n${i.steps.map(s => `- [${s.done ? 'x' : ' '}] ${s.id}: ${s.title}`).join('\n')}\n\n**Abnahme:** ${i.acceptance.join(' ')}\n\n**Nächste Aktion:** ${i.next}\n\n`;
    if (i.blockers.length) out += `**Blocker:** ${i.blockers.join(' ')}\n\n`;
    out += `**Prüfstand:** ${i.verification.note}\n\n**Nachweise:** ${i.evidence.length ? i.evidence.map(e => `[${e.path}](${path.posix.relative('docs', e.path)}) — ${e.note}`).join('; ') : 'noch ausstehend'}\n\n**Dateiumfang:** ${i.scope.map(p => `\`${p}\``).join(', ')}. **Abhängigkeiten:** ${i.dependencies.join(', ') || 'keine'}. **Alte IDs:** ${i.legacyIds.join(', ') || '—'}.\n\n**Integration:** Main ${commit(i.delivery.main)}; Pages-Quelle ${commit(i.delivery.pagesSource)}.\n\n`;
  }
  out += '## Weiterführende Dokumente\n\n- [Änderungsverlauf mit Dateien und Aufgabenständen](ROADMAP_HISTORY.md)\n- [Aktueller Systemstatus](STATUS.md)\n- [Tests und Prüfgrenzen](TESTING.md)\n- [Historische Roadmap, nicht mehr steuernd](ROADMAP_LEGACY.md)\n- [Modulvertrag](architecture/MODULES.md)\n- [Entwicklungskoordination](COMMUNICATION.md)\n';
  return out;
}
export function renderHistory(data) {
  let text = '# Roadmap-Änderungsverlauf\n\nAus [roadmap.json](roadmap.json) erzeugt. Ereignisse werden angehängt, nicht nachträglich umgeschrieben. Commitnachweise: Git-Historie der JSON-Datei; Veröffentlichung: deployment.json und Artefakt-Kindcommit.\n\n';
  for (const event of data.events) {
    text += `## ${event.at} · ${event.kind}\n\n**Aufgaben:** ${event.items.join(', ')}\n\n${event.summary}\n\n`;
    if (event.snapshot) text += `| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |\n|---|---|---:|---|\n${event.snapshot.map(s => `| ${s.id} | ${labels[s.status]} | ${s.done}/${s.total} | ${esc(s.next)} |`).join('\n')}\n\n`;
    if (event.files?.length) text += `**Geänderte Dateien:**\n\n${event.files.map(p => `- \`${p}\``).join('\n')}\n\n`;
  }
  return text;
}
export function checkChange(previous, current, files) {
  const errors = [];
  const sources = files.filter(p => !isPagesArtifact(p));
  if (!sources.length) return errors; // Source-preserving artifacts verified separately by publisher.
  for (const required of ['docs/roadmap.json', ...generated]) if (!files.includes(required)) errors.push(`Quelländerung ohne aktualisierten Fortschrittsnachweis: ${required}`);
  if (current.events.length <= previous.events.length || JSON.stringify(current.events.slice(0, previous.events.length)) !== JSON.stringify(previous.events)) errors.push('Neue Quellen benötigen angehängte Historie; alte Ereignisse dürfen nicht umgeschrieben werden.');
  const events = current.events.slice(previous.events.length);
  const covered = new Set(events.flatMap(e => e.files ?? []));
  for (const p of sources.filter(p => !generated.includes(p) && p !== 'docs/roadmap.json')) if (!covered.has(p)) errors.push(`Geänderte Datei ohne Aufgabenzuordnung: ${p}`);
  const affected = new Set(events.flatMap(e => e.items));
  const old = new Map(previous.items.map(i => [i.id, i]));
  for (const i of current.items) if (JSON.stringify(old.get(i.id)) !== JSON.stringify(i) && !affected.has(i.id)) errors.push(`Aufgabenänderung ohne Ereignis: ${i.id}`);
  return errors;
}
function load() { return JSON.parse(readFileSync('docs/roadmap.json', 'utf8')); }
function render(data) { writeFileSync(generated[0], renderRoadmap(data)); writeFileSync(generated[1], renderHistory(data)); }
function main() {
  const [cmd = 'check', ...args] = process.argv.slice(2);
  let data = load();
  if (cmd === 'record') {
    const ids = args[0]?.split(','); const summary = args.slice(1).join(' ');
    if (!ids?.length || !summary || ids.some(id => !data.items.some(i => i.id === id))) throw new Error('record <ID-01,ID-02> <Ergebnis und Prüfgrenzen>');
    const files = [...new Set([...git(['diff', '--name-only', 'HEAD']).split('\n'), ...git(['ls-files', '--others', '--exclude-standard']).split('\n')])].filter(Boolean).sort();
    const at = new Date().toISOString();
    for (const i of data.items) if (ids.includes(i.id)) i.updatedAt = at;
    data.updatedAt = at;
    data.events.push({ at, kind: 'progress', items: ids, summary, files: files.filter(p => !generated.includes(p) && p !== 'docs/roadmap.json'), snapshot: ids.map(id => { const i = data.items.find(i => i.id === id); return { id, status: i.status, done: done(i), total: i.steps.length, next: i.next }; }) });
    writeFileSync('docs/roadmap.json', JSON.stringify(data, null, 2) + '\n');
  }
  const errors = validateRoadmap(data);
  if (errors.length) throw new Error(errors.join('\n'));
  if (cmd === 'render' || cmd === 'record') { render(data); console.log('Roadmap und Historie aktualisiert.'); return; }
  if (readFileSync(generated[0], 'utf8') !== renderRoadmap(data) || readFileSync(generated[1], 'utf8') !== renderHistory(data)) throw new Error('Roadmapansichten veraltet: npm run roadmap:render');
  if (cmd === 'check-change') {
    if (!args[0]) throw new Error('check-change <vorheriger-main> [quellcommit]');
    git(['rev-parse', '--verify', `${args[0]}^{commit}`]);
    if (args[1]) git(['rev-parse', '--verify', `${args[1]}^{commit}`]);
    let raw;
    try { raw = git(['show', `${args[0]}:docs/roadmap.json`]); } catch {
      // First migration: still requires roadmap plus both views and a file-linked progress event.
      raw = JSON.stringify({ items: [], events: [] });
    }
    const next = args[1] ? JSON.parse(git(['show', `${args[1]}:docs/roadmap.json`])) : data;
    const files = git(['diff', '--name-only', args[0], ...(args[1] ? [args[1]] : [])]).split('\n').filter(Boolean);
    if (!args[1]) files.push(...git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean));
    const changeErrors = [...validateRoadmap(next), ...checkChange(JSON.parse(raw), next, files)];
    if (args[1]) {
      if (git(['show', `${args[1]}:docs/ROADMAP.md`]) !== renderRoadmap(next).trim()) changeErrors.push('Roadmap im Quellcommit ist veraltet.');
      if (git(['show', `${args[1]}:docs/ROADMAP_HISTORY.md`]) !== renderHistory(next).trim()) changeErrors.push('Historie im Quellcommit ist veraltet.');
    }
    if (changeErrors.length) throw new Error(changeErrors.join('\n'));
  } else if (cmd !== 'check') throw new Error(`Unbekannter Befehl ${cmd}`);
  console.log(`Roadmap gültig: ${data.items.length} Aufgaben, ${data.events.length} Verlaufseinträge, keine Abhängigkeitszyklen.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
