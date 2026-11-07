import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isPagesArtifact } from '../pages/prepare_main_pages.mjs';

export const labels = { planned: '⏳ Offen', in_progress: '🚧 In Arbeit', blocked: '⛔ Blockiert', implemented: '🧩 Implementiert · Abnahme offen', verified: '✅ Im beschriebenen Umfang geprüft', deferred: '⏸ Zurückgestellt' };
const generated = ['docs/ROADMAP.md', 'docs/ROADMAP_HISTORY.md'];
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const safePath = p => typeof p === 'string' && p.length > 0 && !p.startsWith('/') && !p.split('/').includes('..') && !/[\r\n]/.test(p);
const validDate = s => typeof s === 'string' && Number.isFinite(Date.parse(s)) && /(?:Z|[+-]\d\d:\d\d)$/.test(s);
const hash = s => s === null || typeof s === 'string' && /^[a-f0-9]{40}$/.test(s);
/** Prüfsumme über verdichtete Ereignisse, verkettet mit einem früheren Archivblock. */
export const eventsDigest = (events, prior) => createHash('sha256').update((prior?.sha256 ?? '') + JSON.stringify(events)).digest('hex');
/** Verdichtet die Historie: Ereignisse wandern in die Git-Historie, roadmap.json behält Anzahl, Prüfsumme und Fundstelle. */
export function compactHistory(data, commit) {
  if (!data.events.length) return data;
  const archive = { until: data.events.at(-1).at, count: (data.archive?.count ?? 0) + data.events.length, sha256: eventsDigest(data.events, data.archive), commit };
  return { ...data, archive, events: [] };
}
export function validateRoadmap(data, root = process.cwd()) {
  const errors = [];
  if (data?.schemaVersion !== 1 || !Array.isArray(data?.items) || !Array.isArray(data?.phases) || !Array.isArray(data?.events)) return ['Roadmap-Schema ungültig.'];
  if (!validDate(data.updatedAt) || !hash(data.baselineCommit) || !data.baselineCommit) errors.push('Zeit/Baseline ungültig.');
  if (data.archive !== undefined && (!validDate(data.archive?.until) || !Number.isInteger(data.archive.count) || data.archive.count < 1 || !/^[a-f0-9]{64}$/.test(data.archive.sha256 ?? '') || !hash(data.archive.commit) || !data.archive.commit)) errors.push('Archivblock der Historie ungültig.');
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
  errors.push(...validateOverview(data, ids));
  for (const event of data.events) {
    if (!validDate(event.at) || !event.summary || !event.kind || !event.items?.length || event.items.some(id => !ids.has(id))) errors.push('Ungültiger Verlaufseintrag.');
    if (event.files && (!Array.isArray(event.files) || event.files.some(p => !safePath(p)))) errors.push('Ungültige Dateizuordnung im Verlauf.');
  }
  return errors;
}
export const philippKinds = { server: 'Auf deinem Server mit Mitspielern', spiel: 'Im Spiel an deinem PC', geraet: 'Auf echten Geräten und Browsern', datei: 'Dateien oder Welt liefern', planer: 'Im Planer abnehmen', entscheidung: 'Entscheiden oder Rückfrage beantworten' };
export const intakeStates = ['verwaist', 'zugeteilt', 'zurückgestellt', 'übernommen', 'verworfen'];
// Übersicht nach Bereichen (optional je Aufgabe, damit parallele Arbeitsstränge ohne Zuordnung nicht scheitern).
function validateOverview(data, ids) {
  const errors = [];
  if (data.areas === undefined) return errors;
  const areas = new Set();
  if (!Array.isArray(data.areas)) return ['Bereiche ungültig.'];
  for (const a of data.areas) {
    if (!/^[A-Z]+$/.test(a?.id ?? '') || areas.has(a.id) || !a.title) errors.push(`Ungültiger/doppelter Bereich ${a?.id}`);
    areas.add(a?.id);
  }
  for (const i of data.items) {
    if (i.area !== undefined && !areas.has(i.area)) errors.push(`${i.id}: unbekannter Bereich ${i.area}`);
    if (i.thread !== undefined && i.thread !== null && (typeof i.thread !== 'string' || !i.thread.trim())) errors.push(`${i.id}: Arbeitsstrang ungültig.`);
    if (i.philipp !== undefined && (!Array.isArray(i.philipp) || i.philipp.some(p => !Object.hasOwn(philippKinds, p?.kind) || !p.text))) errors.push(`${i.id}: Philipp-Aufgaben ungültig.`);
    if (i.orphans !== undefined && (!Array.isArray(i.orphans) || i.orphans.some(o => typeof o !== 'string' || !o))) errors.push(`${i.id}: verwaiste Punkte ungültig.`);
  }
  const seen = new Set();
  for (const e of data.intake ?? []) {
    if (!/^IN-\d{2,}$/.test(e?.id ?? '') || seen.has(e.id)) errors.push(`Ungültiger/doppelter Eingang ${e?.id}`);
    seen.add(e?.id);
    if (!validDate(e.at) || !e.title || !e.source || !areas.has(e.area) || !intakeStates.includes(e.state) || !Array.isArray(e.items) || e.items.some(id => !ids.has(id))) errors.push(`${e.id}: Eingang unvollständig.`);
    if (e.thread !== null && (typeof e.thread !== 'string' || !e.thread.trim())) errors.push(`${e.id}: Arbeitsstrang ungültig.`);
  }
  return errors;
}
const open = i => !['verified', 'deferred'].includes(i.status);
const parked = i => i.area === 'SPAETER';
const orphaned = i => open(i) && !parked(i) && (!i.thread || i.orphans?.length > 0);
const threadLabel = i => i.thread ? `„${esc(i.thread)}“` : (open(i) && !parked(i) ? '**verwaist**' : '—');
const shortTitle = t => { const s = t.split(': ')[0]; return s.length > 90 ? `${s.slice(0, 88)}…` : s; };
export function renderOverview(data) {
  if (!Array.isArray(data.areas)) return '';
  const areaOf = new Map(data.areas.map(a => [a.id, a]));
  const groups = [...data.areas, { id: '', title: 'Noch keinem Bereich zugeordnet' }];
  let out = '## Überblick nach Bereichen\n\nJe Bereich die offenen Pakete mit Status, Priorität, zuständigem Arbeitsstrang und dem, was nur Philipp tun kann. „Verwaist“ heißt: Arbeit offen, aber kein laufender Arbeitsstrang zuständig. Abgeschlossene Pakete stehen darunter in einer Zeile. Pflege: Felder `area`, `thread`, `philipp`, `orphans` je Aufgabe in roadmap.json; neue Wünsche ohne Paket als Eingang (`intake`).\n\n| Bereich | Offen | Verwaist | Nur Philipp | Geprüft |\n|---|---:|---:|---:|---:|\n';
  const inArea = id => data.items.filter(i => (areaOf.has(i.area) ? i.area : '') === id);
  for (const g of groups) {
    const items = inArea(g.id); if (!items.length) continue;
    out += `| [${esc(g.title)}](#bereich-${(g.id || 'ohne').toLowerCase()}) | ${items.filter(open).length} | ${items.filter(orphaned).length} | ${items.filter(i => i.philipp?.length).length} | ${items.filter(i => i.status === 'verified').length} |\n`;
  }
  out += '\n';
  for (const g of groups) {
    const items = inArea(g.id); if (!items.length) continue;
    const active = items.filter(open).sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
    out += `<a id="bereich-${(g.id || 'ohne').toLowerCase()}"></a>\n\n### Bereich: ${g.title}\n\n`;
    if (active.length) {
      out += '| ID | Paket | Status | Prio | Arbeitsstrang | Nur Philipp |\n|---|---|---|---|---|---|\n';
      for (const i of active) out += `| [${i.id}](#${i.id.toLowerCase()}) | ${esc(shortTitle(i.title))} | ${labels[i.status]} ${done(i)}/${i.steps.length} | ${i.priority} | ${threadLabel(i)}${i.orphans?.length ? ` · ${i.orphans.length} verwaist` : ''} | ${(i.philipp ?? []).map(p => esc(p.text)).join('<br>') || '—'} |\n`;
      out += '\n';
    }
    const closed = items.filter(i => !open(i));
    if (closed.length) out += `Abgeschlossen oder zurückgestellt: ${closed.map(i => `${i.id} (${i.status === 'verified' ? 'geprüft' : 'zurückgestellt'})`).join(', ')}.\n\n`;
  }
  out += '## Was nur Philipp tun kann\n\nGesammelt aus allen Paketen, nach Art. Die Testfälle stehen auf [#/testphase](https://freadeax.github.io/Minecraft-Bauplaner/#/testphase); Fehler dort über „Fehler melden“ oder im Spiel mit `/bauplaner diagnose`.\n\n';
  for (const [kind, title] of Object.entries(philippKinds)) {
    const rows = data.items.flatMap(i => (i.philipp ?? []).filter(p => p.kind === kind).map(p => `- **${i.id}** · ${esc(p.text)}`));
    if (rows.length) out += `### ${title}\n\n${rows.join('\n')}\n\n`;
  }
  out += '## Verwaiste Punkte\n\nArbeit, für die gerade kein laufender Arbeitsstrang zuständig ist. Zum Verteilen: Arbeitsstrang starten, `thread` in roadmap.json setzen und den Punkt aus `orphans` entfernen, sobald er ein eigener Teilschritt oder erledigt ist.\n\n| ID | Bereich | Prio | Status | Offen ohne Bearbeiter |\n|---|---|---|---|---|\n';
  const orphanItems = data.items.filter(orphaned).sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
  for (const i of orphanItems) out += `| [${i.id}](#${i.id.toLowerCase()}) | ${esc(areaOf.get(i.area)?.title.split(':')[0].split(' (')[0] ?? '—')} | ${i.priority} | ${labels[i.status]} | ${(i.orphans?.length ? i.orphans : [i.next]).map(esc).join('<br>')} |\n`;
  out += '\n';
  if (data.intake?.length) {
    out += `## Eingänge ohne eigenes Paket\n\n${esc(data.intakeRule ?? '')}\n\n| ID | Eingang | Von | Bereich | Zustand | Arbeitsstrang | Bezug |\n|---|---|---|---|---|---|---|\n`;
    for (const e of data.intake) out += `| ${e.id} | ${esc(e.title)} | ${esc(e.source)}, ${e.at.slice(0, 10)} | ${esc(areaOf.get(e.area)?.title.split(':')[0].split(' (')[0] ?? e.area)} | ${e.state} | ${e.thread ? `„${esc(e.thread)}“` : (e.state === 'verwaist' ? '**verwaist**' : '—')} | ${e.items.join(', ') || '—'} |\n`;
    out += '\n';
  }
  return out;
}
const esc = s => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
const done = i => i.steps.filter(s => s.done).length;
const short = h => h ? `\`${h.slice(0, 7)}\`` : 'ausstehend';
const commit = h => h ? `[${h.slice(0, 7)}](https://github.com/Freadeax/Minecraft-Bauplaner/commit/${h})` : 'ausstehend';
export function renderRoadmap(data) {
  const counts = Object.keys(labels).map(k => `| ${labels[k]} | ${data.items.filter(i => i.status === k).length} |`).join('\n');
  let out = `# Verbindliche Roadmap und Fortschritt\n\nStand: ${data.updatedAt}. Automatisch erzeugt aus [roadmap.json](roadmap.json); nicht direkt bearbeiten. Baseline: ${commit(data.baselineCommit)}.\n\n## So liest du den Stand\n\n- Jede Aufgabe hat eine feste ID, echte Teilschritte, Abhängigkeiten, Nachweise und eine nächste Aktion.\n- **Implementiert ≠ geprüft ≠ auf Main ≠ live.** „Geprüft“ gilt nur für den beschriebenen Umfang und den genannten Nachweis.\n- Teilschritte sind abzählbare Ergebnisse, keine geschätzten Fertigstellungsprozente. Eine Phase ist erst nach ihren Austrittskriterien abgeschlossen.\n- Main-/Pages-Spalten nennen den letzten eingetragenen Nachweis; jüngste Integration ist über Git-Historie und das [Live-Manifest](https://freadeax.github.io/Minecraft-Bauplaner/deployment.json) nachprüfbar. Ein neuer Commit kann den eigenen Hash nicht enthalten.\n- Historische Nachweise ersetzen keinen aktuellen Browser-, Geräte- oder Spieltest.\n\n| Status | Pakete |\n|---|---:|\n${counts}\n\n${renderOverview(data)}## Aktiver Arbeitsblock\n\n`;
  for (const id of data.active) {
    const i = data.items.find(i => i.id === id);
    out += `- **${i.id} · ${i.title}** — ${labels[i.status]}, ${done(i)}/${i.steps.length} Teilschritte. Nächster Schritt: ${i.next}\n`;
  }
  out += '\n## Verbindlicher Ablauf bei jedem Main-Merge oder Push\n\n1. Vor Beginn Aufgabe und Dateiumfang in roadmap.json eintragen; Eintrag hier auf „In Arbeit“ setzen.\n2. Teilschritte und Nachweise nach jedem vollständigen Arbeitsblock aktualisieren; Blocker mit Grund und nächster Aktion festhalten.\n3. `npm run roadmap:record -- ID-01,ID-02 "Konkretes Ergebnis und Prüfgrenzen"` hängt Dateien und Aufgabenstände an die Historie an und rendert beide Ansichten. Änderungen an Aufgaben vorher in roadmap.json eintragen.\n4. `npm run check` und ausführbare Browserprüfungen durchführen; Ergebnisse in TESTING festhalten.\n5. `npm run check:roadmap-change -- <vorheriger-main> [quellcommit]` prüft vor Integration Dateizuordnung, neue Ereignisse und unveränderte Historie.\n6. Regulär integrieren; den passenden manifestgeprüften Pages-Artefaktcommit unmittelbar veröffentlichen. Artefaktcommits benötigen keinen neuen Aufgabenstatus.\n7. Integration und Live-Hash prüfen; tatsächliche SHAs im Abschluss berichten und beim nächsten sachlichen Quellupdate nachtragen. Keine künstliche Deployment-Commit-Schleife.\n\nLokaler Pre-Push-Hook: `npm run setup:hooks`. Ohne eigene Actions erzwingt GitHub diese lokale Regel nicht für fremde Clients oder direkte API-Schreibzugriffe.\n\n';
  for (const phase of data.phases) {
    out += `## ${phase.id}: ${phase.title}\n\n**Ziel:** ${phase.goal}\n\n**Austrittskriterien:**\n\n${phase.exit.map(x => `- ${x}`).join('\n')}\n\n| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |\n|---|---|---|---:|---|---|---|\n`;
    for (const i of data.items.filter(i => i.phase === phase.id)) out += `| [${i.id}](#${i.id.toLowerCase()}) | ${esc(i.title)} | ${labels[i.status]} | ${done(i)}/${i.steps.length} | ${i.dependencies.join(', ') || '—'} | ${short(i.delivery.main)} | ${short(i.delivery.pagesSource)} |\n`;
    out += '\n';
  }
  out += '## Details aller Arbeitspakete\n\n';
  for (const i of data.items) {
    out += `### ${i.id}\n\n**${i.title}** · ${labels[i.status]} · Priorität ${i.priority} · Verantwortlich: ${i.owner}${i.thread !== undefined ? ` · Arbeitsstrang: ${threadLabel(i)}` : ''} · Aktualisiert: ${i.updatedAt}\n\n${i.steps.map(s => `- [${s.done ? 'x' : ' '}] ${s.id}: ${s.title}`).join('\n')}\n\n**Abnahme:** ${i.acceptance.join(' ')}\n\n**Nächste Aktion:** ${i.next}\n\n`;
    if (i.blockers.length) out += `**Blocker:** ${i.blockers.join(' ')}\n\n`;
    if (i.philipp?.length) out += `**Nur Philipp:** ${i.philipp.map(p => `${philippKinds[p.kind]}: ${p.text}`).join(' ')}\n\n`;
    if (i.orphans?.length) out += `**Verwaist (ohne Bearbeiter):** ${i.orphans.join(' ')}\n\n`;
    out += `**Prüfstand:** ${i.verification.note}\n\n**Nachweise:** ${i.evidence.length ? i.evidence.map(e => `[${e.path}](${path.posix.relative('docs', e.path)}) — ${e.note}`).join('; ') : 'noch ausstehend'}\n\n**Dateiumfang:** ${i.scope.map(p => `\`${p}\``).join(', ')}. **Abhängigkeiten:** ${i.dependencies.join(', ') || 'keine'}. **Alte IDs:** ${i.legacyIds.join(', ') || '—'}.\n\n**Integration:** Main ${commit(i.delivery.main)}; Pages-Quelle ${commit(i.delivery.pagesSource)}.\n\n`;
  }
  out += '## Weiterführende Dokumente\n\n- [Änderungsverlauf mit Dateien und Aufgabenständen](ROADMAP_HISTORY.md)\n- [Aktueller Systemstatus](STATUS.md)\n- [Prüfstand](TESTING.md)\n- [Modulvertrag](architecture/kern/MODULES.md)\n';
  return out;
}
export function renderHistory(data) {
  let text = '# Roadmap-Änderungsverlauf\n\nAus [roadmap.json](roadmap.json) erzeugt. Ereignisse werden angehängt, nicht nachträglich umgeschrieben. Commitnachweise: Git-Historie der JSON-Datei; Veröffentlichung: deployment.json und Artefakt-Kindcommit.\n\n';
  if (data.archive) text += `**Ältere Ereignisse:** ${data.archive.count} Einträge bis ${data.archive.until.slice(0, 10)} sind verdichtet und vollständig in ${commit(data.archive.commit)} (\`docs/roadmap.json\`, Prüfsumme \`${data.archive.sha256.slice(0, 12)}\`).\n\n`;
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
  let base = previous.events ?? [];
  if (JSON.stringify(current.archive ?? null) !== JSON.stringify(previous.archive ?? null)) {
    // Verdichtung: Der neue Archivblock muss genau die bisherigen Ereignisse zusammenfassen.
    const a = current.archive;
    if (!a || a.count !== (previous.archive?.count ?? 0) + base.length || a.sha256 !== eventsDigest(base, previous.archive)) errors.push('Archivblock der Historie passt nicht zu den bisherigen Ereignissen.');
    base = [];
  }
  if (current.events.length <= base.length || JSON.stringify(current.events.slice(0, base.length)) !== JSON.stringify(base)) errors.push('Neue Quellen benötigen angehängte Historie; alte Ereignisse dürfen nicht umgeschrieben werden.');
  const events = current.events.slice(base.length);
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
  if (cmd === 'compact') {
    // compact <commit>: verdichtet alle Ereignisse; <commit> muss die vollständige Historie enthalten.
    if (!args[0]) throw new Error('compact <commit mit vollständiger Historie>');
    const full = git(['rev-parse', '--verify', `${args[0]}^{commit}`]);
    if (JSON.stringify(JSON.parse(git(['show', `${full}:docs/roadmap.json`])).events) !== JSON.stringify(data.events)) throw new Error('Der Commit enthält nicht dieselben Ereignisse.');
    data = compactHistory(data, full);
    writeFileSync('docs/roadmap.json', JSON.stringify(data, null, 2) + '\n');
  }
  if (cmd === 'render' || cmd === 'record' || cmd === 'compact') { render(data); console.log('Roadmap und Historie aktualisiert.'); return; }
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
  console.log(`Roadmap gültig: ${data.items.length} Aufgaben, ${(data.archive?.count ?? 0) + data.events.length} Verlaufseinträge${data.archive ? ` (${data.archive.count} verdichtet)` : ''}, keine Abhängigkeitszyklen.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
