#!/usr/bin/env node
/**
 * FORMAT-01-S02: Rundlauf einer echten .schem-Datei (z. B. mit WorldEdit `//schem save` gespeichert).
 *
 *   npm run format:check-schem -- datei.schem [--out ausgabe.schem] [--json]
 *
 * 1. Import mit dem Planer-Reader, 2. Export mit dem Planer-Writer (Anker „Projektursprung“, gleiche
 * DataVersion, Lücken als Luft), 3. erneuter Import, 4. semantischer Vergleich: jede Zelle mit Zustand,
 * Ursprung (Offset), WorldEdit-Einfügepunkt (WEOffset), BlockEntities ohne eigene Positionsfelder,
 * freie Entities. Zusätzlich prüft der unabhängige Python-Verifier (scripts/checks/verify_schem.py) Original
 * und Export. Exit 0 = semantisch gleich, 1 = Abweichung, 2 = Aufruf-/Lesefehler.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { python } from '../dev/python.mjs';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out');
const outIdx = args.indexOf('--out');
const asJson = args.includes('--json');
if (!file) { console.error('Aufruf: npm run format:check-schem -- datei.schem [--out export.schem] [--json]'); process.exit(2); }

const { importSchemV3, writeSchemV3 } = await import('../../dist/formats/src/index.js');
const { stateKey } = await import('../../dist/voxel/src/index.js');

const ab = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
function verify(path) {
  const r = spawnSync(python, ['-I', '-X', 'utf8', fileURLToPath(new URL('./verify_schem.py', import.meta.url)), path], { encoding: 'utf8' });
  let summary = null; try { summary = JSON.parse(r.stdout); } catch { /* invalid output */ }
  return { ok: r.status === 0, summary, error: r.status === 0 ? '' : (r.stderr || r.stdout).trim().slice(0, 400) };
}
const OWN = new Set(['x', 'y', 'z', 'Pos', 'keepPacked']);
const canon = t => t.type === 'compound' ? `{${Object.keys(t.value).sort().map(k => `${k}:${canon(t.value[k])}`).join(',')}}`
  : t.type === 'list' ? `[${t.value.map(canon).join(',')}]` : `${t.type}:${JSON.stringify(t.value)}`;
function tile(data) {
  const c = data.type === 'compound' ? data.value : {};
  const inner = c.Data?.type === 'compound' ? c.Data.value : null;
  const t = inner && (c.Id || c.Pos) ? { ...inner, ...(c.Id && !inner.id && { id: c.Id }) } : c;
  const kept = {}; for (const k of Object.keys(t).sort()) if (!OWN.has(k)) kept[k] = t[k];
  return canon({ type: 'compound', value: kept });
}
function model(r) {
  const p = r.payload, cells = new Map();
  for (const c of p.cells) if (c.kind !== 'erase') cells.set(c.position.join(','), c.kind === 'air' ? 'air' : stateKey(p.palette[c.paletteIndex]));
  const bes = new Map(p.blockEntities.map(e => [e.position.join(','), tile(e.data)]));
  const ents = (p.entities ?? []).map(e => `${e.position.map(v => Math.round(v * 1000) / 1000).join(',')}|${tile(e.data)}`).sort();
  return { cells, bes, ents, size: p.bounds.maxExclusive, offset: r.offset, weOffset: r.weOffset, dataVersion: r.dataVersion };
}

let original;
try { original = readFileSync(file); } catch (e) { console.error(`Datei nicht lesbar: ${e.message}`); process.exit(2); }
let a;
try { a = await importSchemV3(ab(original)); } catch (e) { console.error(`Import fehlgeschlagen: ${e.message}`); process.exit(2); }
const dir = mkdtempSync(join(tmpdir(), 'schem-rundlauf-'));
const world = { ...a.payload, bounds: { min: a.offset, maxExclusive: a.payload.bounds.maxExclusive.map((v, i) => v + a.offset[i]) },
  cells: a.payload.cells.map(c => ({ ...c, position: c.position.map((v, i) => v + a.offset[i]) })),
  blockEntities: a.payload.blockEntities.map(e => ({ ...e, position: e.position.map((v, i) => v + a.offset[i]) })),
  ...(a.payload.entities && { entities: a.payload.entities.map(e => ({ ...e, position: e.position.map((v, i) => v + a.offset[i]) })) }) };
const exported = await writeSchemV3(world, { dataVersion: a.dataVersion, anchor: 'project-origin', unselected: 'air' });
const outPath = outIdx >= 0 ? args[outIdx + 1] : join(dir, 'export.schem');
writeFileSync(outPath, exported.bytes);
const b = await importSchemV3(ab(exported.bytes));
const A = model(a), B = model(b);

const findings = [];
const diffMaps = (x, y, label, limit = 5) => {
  let n = 0; const ex = [];
  for (const [k, v] of x) if (y.get(k) !== v) { n++; if (ex.length < limit) ex.push(`${k}: ${v} → ${y.get(k) ?? 'fehlt'}`); }
  for (const k of y.keys()) if (!x.has(k)) { n++; if (ex.length < limit) ex.push(`${k}: fehlt → ${y.get(k)}`); }
  if (n) findings.push({ part: label, count: n, examples: ex });
};
if (A.size.join() !== B.size.join()) findings.push({ part: 'Größe', count: 1, examples: [`${A.size.join('×')} → ${B.size.join('×')}`] });
if (A.offset.join() !== B.offset.join()) findings.push({ part: 'Ursprung (Offset)', count: 1, examples: [`${A.offset.join(',')} → ${B.offset.join(',')}`] });
if (A.dataVersion !== B.dataVersion) findings.push({ part: 'DataVersion', count: 1, examples: [`${A.dataVersion} → ${B.dataVersion}`] });
diffMaps(A.cells, B.cells, 'Zellen/Zustände');
diffMaps(A.bes, B.bes, 'BlockEntities');
if (A.ents.join('\n') !== B.ents.join('\n')) findings.push({ part: 'Entities', count: Math.abs(A.ents.length - B.ents.length) || 1, examples: [`${A.ents.length} → ${B.ents.length}`] });
const notes = [];
if (A.weOffset && A.weOffset.join() !== B.weOffset?.join()) notes.push(`WorldEdit-Einfügepunkt (WEOffset) ${A.weOffset.join(',')} → ${B.weOffset?.join(',')}: der Planer-Export setzt WEOffset = Offset (Projektursprung). Die Weltlage bleibt gleich, //paste setzt den Bau relativ zur Spielerposition aber anders als das Original.`);
const vo = verify(file), ve = verify(outPath);
if (!ve.ok) findings.push({ part: 'Verifier (Export)', count: 1, examples: [ve.error] });
const norm = t => { const m = /^([^[]+)(?:\[(.*)\])?$/.exec(t); return m[2] ? `${m[1]}[${m[2].split(',').sort().join(',')}]` : m[1]; };
const stateCounts = v => { const out = {}; for (const [k, n] of Object.entries(v.counts ?? {})) out[norm(k)] = (out[norm(k)] ?? 0) + n; return JSON.stringify(Object.entries(out).sort()); };
if (vo.ok && ve.ok && stateCounts(vo.summary) !== stateCounts(ve.summary)) findings.push({ part: 'Verifier-Zustandszählung', count: 1, examples: ['Original und Export zählen andere Zustände'] });

const report = { file, export: outPath, size: A.size, offset: A.offset, weOffset: A.weOffset, dataVersion: A.dataVersion,
  cells: A.cells.size, blockEntities: A.bes.size, entities: A.ents.length, importWarnings: a.warnings, verifierOriginal: vo.ok ? 'gültig' : vo.error,
  verifierExport: ve.ok ? 'gültig' : ve.error, findings, notes, equal: findings.length === 0 };
if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`${file}: ${A.size.join(' × ')}, ${A.cells.size} Zellen, ${A.bes.size} BlockEntities, ${A.ents.length} Entities, DataVersion ${A.dataVersion}, Offset ${A.offset.join(' / ')}${A.weOffset ? `, WEOffset ${A.weOffset.join(' / ')}` : ''}`);
  console.log(`Verifier Original: ${report.verifierOriginal} · Export: ${report.verifierExport}`);
  for (const f of findings) console.log(`ABWEICHUNG ${f.part}: ${f.count}${f.examples.length ? ` – ${f.examples.join('; ')}` : ''}`);
  for (const n of notes) console.log(`Hinweis: ${n}`);
  console.log(report.equal ? 'Ergebnis: semantisch gleich (Zellen, Zustände, Ursprung, BlockEntities, Entities).' : 'Ergebnis: ABWEICHUNG.');
}
process.exit(report.equal ? 0 : 1);
