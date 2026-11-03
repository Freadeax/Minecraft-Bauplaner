#!/usr/bin/env node
/**
 * Übernahme von Bibliotheksbeiträgen in den festen Katalog (LIB-06).
 *
 *   npm run library:add -- <datei.bauplaner-beitrag.json> [--ersetzen] [--trocken]
 *   npm run library:remove -- <beitrag_kennung>
 *   npm run library:list
 *   node scripts/library_intake.mjs check | render
 *
 * „add“ prüft das Paket mit derselben Domänenfunktion wie die App (readContribution:
 * Format, Prüfsumme, Angaben, Rechtebestätigung, Blockdaten, Inhalts-Hash, Anschlüsse,
 * Größe), lehnt Kennungen mitgelieferter Gebäude ab und schreibt
 *   packages/domain/src/community/entries/<kennung>.ts   (das Paket, unverändert)
 *   packages/domain/src/community/registry.ts            (Register, neu erzeugt)
 *   docs/library/beitraege/<kennung>.png                 (Vorschaubild, falls im Paket)
 *   docs/library/BEITRAEGE.md                            (Übersicht, neu erzeugt)
 * Danach wie immer: npm run check, Commit, Push, Pages veröffentlichen.
 *
 * Braucht den gebauten Kern (npm run build:core). `--root <ordner>` schreibt in einen
 * anderen Checkout (Tests).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENTRY_DIR = 'packages/domain/src/community/entries';
const REGISTRY = 'packages/domain/src/community/registry.ts';
const PREVIEW_DIR = 'docs/library/beitraege';
const OVERVIEW = 'docs/library/BEITRAEGE.md';
const HEADER = '// Erzeugt von scripts/library_intake.mjs (npm run library:add / library:remove) – nicht von Hand ändern.';

async function domain() {
  const file = path.join(repo, 'dist/domain/src/index.js');
  if (!existsSync(file)) throw new Error('Gebauter Kern fehlt: zuerst „npm run build:core“ ausführen.');
  return import(pathToFileURL(file).href);
}

/** The package and intake date stored in one entry module. */
export function parseEntryModule(text) {
  const start = text.indexOf('const contribution: unknown = '), end = text.lastIndexOf(';\nexport default contribution;');
  const added = /export const addedAt = '(\d{4}-\d{2}-\d{2})';/.exec(text);
  if (start < 0 || end < start || !added) throw new Error('Eintragsmodul nicht lesbar');
  return { file: JSON.parse(text.slice(start + 'const contribution: unknown = '.length, end)), addedAt: added[1] };
}

export function entryModule(file, addedAt) {
  return `${HEADER}\n// Bibliotheksbeitrag „${file.meta.name.replace(/[\r\n]/g, ' ')}“ von ${file.meta.author.replace(/[\r\n]/g, ' ')}.\n` +
    `export const addedAt = '${addedAt}';\nconst contribution: unknown = ${JSON.stringify(file)};\nexport default contribution;\n`;
}

const q = s => JSON.stringify(s);

function readEntries(root) {
  const dir = path.join(root, ENTRY_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.ts')).sort().map(f => ({ id: f.slice(0, -3), ...parseEntryModule(readFileSync(path.join(dir, f), 'utf8')) }));
}

function writeRegistry(root, entries, licenses) {
  const lines = entries.map(e => `  { id: ${q(e.id)}, name: ${q(e.file.meta.name)}, author: ${q(e.file.meta.author)}, addedAt: ${q(e.addedAt)}, checksum: ${q(e.file.checksum)},\n` +
    `    tips: ${JSON.stringify(e.file.meta.tips ?? [])}, load: () => import('./entries/${e.id}.js') },`);
  writeFileSync(path.join(root, REGISTRY), `${HEADER}\nimport type { CommunityEntry } from './types.js';\n\nexport const COMMUNITY_ENTRIES: readonly CommunityEntry[] = [\n${lines.join('\n')}${lines.length ? '\n' : ''}];\n`);
  const md = ['# Bibliotheksbeiträge (LIB-06)', '',
    `Erzeugt von \`scripts/library_intake.mjs\`. Ablauf und Regeln: [CONTRIBUTIONS](../architecture/CONTRIBUTIONS.md). Stand: ${entries.length} Beitr${entries.length === 1 ? 'ag' : 'äge'}.`, ''];
  if (!entries.length) md.push('Noch keine Beiträge aufgenommen.', '');
  for (const e of entries) {
    const m = e.file.meta;
    md.push(`## ${m.name}`, '', `- Kennung: \`${e.id}\` · aufgenommen ${e.addedAt} · Prüfsumme \`${e.file.checksum.slice(0, 16)}…\``,
      `- Autor: ${m.author} · Herkunft: ${m.source} · Nutzungsrechte: ${licenses[m.license] ?? m.license}`);
    if (m.description) md.push(`- ${m.description}`);
    if (e.file.preview) md.push('', `![Vorschau ${m.name}](beitraege/${e.id}.png)`);
    md.push('');
  }
  mkdirSync(path.join(root, path.dirname(OVERVIEW)), { recursive: true });
  writeFileSync(path.join(root, OVERVIEW), md.join('\n'));
}

function writePreview(root, id, preview) {
  const file = path.join(root, PREVIEW_DIR, `${id}.png`);
  if (!preview) { rmSync(file, { force: true }); return; }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(preview.slice('data:image/png;base64,'.length), 'base64'));
}

async function add(root, file, { replace, dry }) {
  const d = await domain();
  let raw;
  try { raw = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { throw new Error(`Datei nicht lesbar: ${e.message}`); }
  const checked = await d.readContribution(raw);
  const id = checked.meta.id;
  const shipped = new Set([...d.BUILDING_SPECS.map(s => s.id), 'sample_tower', 'sample_wall', 'sample_gate']);
  if (shipped.has(id)) throw new Error(`Kennung ${id} gehört einem mitgelieferten Gebäude`);
  const entries = readEntries(root);
  const existing = entries.find(e => e.id === id);
  if (existing && !replace) throw new Error(`${id} ist schon aufgenommen (${existing.addedAt}). Neue Fassung mit --ersetzen übernehmen; gespeicherte Bibliotheken bekommen sie als neue Version.`);
  const sameName = entries.find(e => e.id !== id && e.file.meta.name.toLowerCase() === checked.meta.name.toLowerCase());
  const blocks = checked.payload.cells.filter(c => c.kind === 'block').length;
  console.log(`Beitrag ${id}: „${checked.meta.name}“ von ${checked.meta.author}`);
  console.log(`  ${blocks.toLocaleString('de-DE')} Blöcke, ${checked.payload.palette.length} Zustände, Blockdaten ${(checked.dataBytes / 1e3).toFixed(1)} kB, Rechte: ${d.CONTRIBUTION_LICENSES[checked.meta.license]}`);
  for (const w of [...checked.warnings, ...(sameName ? [`Gleicher Name wie ${sameName.id}`] : [])]) console.log(`  Hinweis: ${w}`);
  if (dry) { console.log('Trockenlauf: nichts geschrieben.'); return; }
  const addedAt = new Date().toISOString().slice(0, 10);
  mkdirSync(path.join(root, ENTRY_DIR), { recursive: true });
  writeFileSync(path.join(root, ENTRY_DIR, `${id}.ts`), entryModule(raw, addedAt));
  writePreview(root, id, raw.preview);
  writeRegistry(root, readEntries(root), d.CONTRIBUTION_LICENSES);
  console.log(`${existing ? 'Ersetzt' : 'Aufgenommen'}: ${ENTRY_DIR}/${id}.ts. Weiter: npm run check, Commit, Push, Pages veröffentlichen.`);
}

async function remove(root, id) {
  const d = await domain();
  const file = path.join(root, ENTRY_DIR, `${id}.ts`);
  if (!existsSync(file)) throw new Error(`${id} ist nicht aufgenommen`);
  rmSync(file);
  writePreview(root, id, undefined);
  writeRegistry(root, readEntries(root), d.CONTRIBUTION_LICENSES);
  console.log(`Entfernt: ${id}. Bereits gespeicherte Bibliotheken behalten ihre Kopie (der Katalog löscht nie gespeicherte Bauteile).`);
}

/** Every entry readable, register in sync with the entry files. */
async function check(root) {
  const d = await domain();
  const entries = readEntries(root), problems = [];
  for (const e of entries) {
    try {
      const c = await d.readContribution(e.file);
      if (c.meta.id !== e.id) problems.push(`${e.id}: Kennung im Paket ist ${c.meta.id}`);
    } catch (err) { problems.push(`${e.id}: ${err.message}`); }
  }
  const registry = readFileSync(path.join(root, REGISTRY), 'utf8');
  const listed = [...registry.matchAll(/\{ id: "([^"]+)"/g)].map(m => m[1]);
  if (listed.join('|') !== entries.map(e => e.id).join('|')) problems.push(`Register (${listed.join(', ') || 'leer'}) passt nicht zu den Eintragsdateien (${entries.map(e => e.id).join(', ') || 'keine'}); „npm run library:add“ erneut ausführen`);
  if (problems.length) throw new Error(`Bibliotheksbeiträge fehlerhaft:\n- ${problems.join('\n- ')}`);
  console.log(`Bibliotheksbeiträge in Ordnung: ${entries.length}.`);
}

async function main(argv) {
  const args = [...argv];
  let root = repo;
  const r = args.indexOf('--root');
  if (r >= 0) { root = path.resolve(args[r + 1] ?? ''); args.splice(r, 2); }
  const flags = new Set(args.filter(a => a.startsWith('--'))), rest = args.filter(a => !a.startsWith('--'));
  const [cmd, target] = rest;
  if (cmd === 'add' && target) return add(root, path.resolve(target), { replace: flags.has('--ersetzen'), dry: flags.has('--trocken') });
  if (cmd === 'remove' && target) return remove(root, target);
  if (cmd === 'check') return check(root);
  if (cmd === 'render') { writeRegistry(root, readEntries(root), (await domain()).CONTRIBUTION_LICENSES); console.log('Register und Übersicht neu geschrieben.'); return; }
  if (cmd === 'list') {
    const entries = readEntries(root);
    if (!entries.length) console.log('Noch keine Bibliotheksbeiträge.');
    for (const e of entries) console.log(`${e.id}\t${e.addedAt}\t${e.file.meta.name}\t${e.file.meta.author}`);
    return;
  }
  throw new Error('Aufruf: library_intake.mjs add <datei> [--ersetzen] [--trocken] | remove <kennung> | list | check | render');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch(e => { console.error(`Fehler: ${e.message}`); process.exit(1); });
}
