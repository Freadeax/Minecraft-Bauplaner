import { useMemo, useState } from 'react';
import { formatStacks, materialsForResolution, materialsToCsv } from '../../../../../packages/domain/src/index.js';
import type { ItemLine, MaterialReport, MaterialScope, UnresolvedReason } from '../../../../../packages/domain/src/index.js';
import { download, formatNumber } from '../../app/ui';
import { isResolved } from './session';
import { RawMaterialsPanel } from './RawMaterialsPanel';
import type { ProjectSession } from './session';

const reasonLabel: Record<UnresolvedReason, string> = {
  'liquid': 'Flüssigkeit', 'mod-namespace': 'Modblock', 'no-item': 'kein Bauitem', 'creative-only': 'nur Kreativ', 'invalid-state': 'ungültiger Zustand',
};
const ruleLabel = {
  direct: 'Block = Item', renamed: 'anderes Item', 'wall-variant': 'Wandvariante', multiblock: 'Mehrblockobjekt', slab: 'Stufe',
  count: 'Anzahl im Block', composite: 'zusammengesetzt', derived: 'abgeleitet', assumed: 'Annahme',
} as const;
const short = (id: string): string => id.replace(/^minecraft:/, '');
const props = (p: Readonly<Record<string, string>>): string => Object.entries(p).map(([k, v]) => `${k}=${v}`).join(', ');

/** Material tab: placed states, build items and storage from `resolution.world` (domain `materials.ts`). */
export function MaterialsTab({ session }: { session: ProjectSession }) {
  const { project, resolution } = session;
  const [scopeId, setScopeId] = useState('');
  const [filter, setFilter] = useState('');
  const scopeInstance = project.instances.find(i => i.id === scopeId), scopeLabel = scopeInstance?.name;
  const report = useMemo(() => {
    if (!isResolved(resolution)) return null;
    const scope: MaterialScope = scopeInstance ? { kind: 'instance', instanceId: scopeInstance.id, name: scopeInstance.name } : { kind: 'project' };
    return materialsForResolution(resolution, scope);
  }, [resolution, scopeInstance?.id, scopeLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isResolved(resolution)) return <section className="materials report danger-report" role="alert"><h3>Material kann nicht berechnet werden</h3><p>{resolution.error}</p></section>;
  if (!report) return null;
  const q = filter.trim().toLowerCase();
  const items = q ? report.items.filter(l => l.itemId.includes(q) || l.sources.some(s => s.state.id.includes(q))) : report.items;
  const scopeName = report.scope.kind === 'project' ? 'Gesamtprojekt' : `Instanz „${report.scope.name}“`;

  return <section className="materials" aria-label="Materialbedarf">
    <div className="materials-head">
      <label>Umfang
        <select value={scopeId} onChange={e => setScopeId(e.target.value)} aria-label="Umfang der Materialliste">
          <option value="">Gesamtprojekt</option>
          {project.instances.map(i => <option key={i.id} value={i.id}>Instanz: {i.name}</option>)}
        </select>
      </label>
      <label>Suchen<input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="z. B. oak" aria-label="Materialien filtern" /></label>
      <button className="materials-csv" disabled={!report.placed.blocks}
        onClick={() => download(`${project.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}-material.csv`, '﻿' + materialsToCsv(report), 'text/csv;charset=utf-8')}>⤓ CSV</button>
    </div>
    <Status report={report} scopeName={scopeName} />
    <dl className="report-stats materials-stats">
      <div><dt>Bauitems</dt><dd>{formatNumber(report.totals.items)}</dd></div>
      <div><dt>Inventarplätze (Stacks)</dt><dd>{formatNumber(report.totals.slots)}</dd></div>
      <div><dt>Shulkerkisten à 27 Plätze</dt><dd>{formatNumber(report.totals.shulkerBoxes)}{report.totals.unpackableSlots > 0 && <small> + {report.totals.unpackableSlots} lose</small>}</dd></div>
      <div><dt>Platzierte Blöcke</dt><dd>{formatNumber(report.placed.blocks)}</dd></div>
    </dl>
    {report.placed.blocks === 0 ? <p className="muted">Keine platzierten Blöcke in diesem Umfang{report.placed.air ? `; ${report.placed.air} Luftzellen.` : '.'}</p> : <>
      <h3 className="materials-title">Bauitems <small>{items.length} von {report.items.length}</small></h3>
      <div className="table-wrap"><table className="materials-table">
        <thead><tr><th>Item</th><th className="num">Menge</th><th className="num">Stacks</th><th className="num">Plätze</th><th>Regel</th></tr></thead>
        <tbody>{items.map(l => <ItemRow key={l.itemId} line={l} />)}</tbody>
      </table></div>
      {report.unresolved.length > 0 && <>
        <h3 className="materials-title">Ungelöst <small>nicht in den Bauitems enthalten</small></h3>
        <div className="table-wrap"><table className="materials-table unresolved">
          <thead><tr><th>Blockzustand</th><th className="num">Zellen</th><th>Grund</th></tr></thead>
          <tbody>{report.unresolved.map(u => <tr key={u.key}>
            <td><code>{u.state.id}</code>{Object.keys(u.state.properties).length > 0 && <small>{props(u.state.properties)}</small>}</td>
            <td className="num">{formatNumber(u.count)}</td><td><em className="badge danger">{reasonLabel[u.reason]}</em> {u.message}</td>
          </tr>)}</tbody>
        </table></div>
      </>}
      <details className="materials-placed"><summary>Platzierte Blockzustände ({report.placed.states.length}) · {formatNumber(report.placed.air)} Luft · {formatNumber(report.placed.erase)} Löschen</summary>
        <div className="table-wrap"><table className="materials-table">
          <thead><tr><th>Blockzustand</th><th className="num">Zellen</th></tr></thead>
          <tbody>{report.placed.states.map(s => <tr key={s.key}><td><code>{s.state.id}</code>{Object.keys(s.state.properties).length > 0 && <small>{props(s.state.properties)}</small>}</td><td className="num">{formatNumber(s.count)}</td></tr>)}</tbody>
        </table></div>
      </details>
      <RawMaterialsPanel report={report} fileStem={project.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')} />
    </>}
    <ul className="materials-notes">{report.notes.map(n => <li key={n}>{n}</li>)}</ul>
  </section>;
}

function Status({ report, scopeName }: { report: MaterialReport; scopeName: string }) {
  const assumed = report.items.filter(l => l.confidence === 'assumed').length;
  const reasons = [
    report.conflicts > 0 && `${report.conflicts} ungeklärte Voxelkonflikte – Mengen folgen der roten Vorschauwahl im Editor`,
    report.unresolved.length > 0 && `${report.unresolved.reduce((s, u) => s + u.count, 0)} Zellen ohne Itemregel (${report.unresolved.length} Zustände)`,
    assumed > 0 && `${assumed} Items beruhen auf Annahmen`,
  ].filter((r): r is string => Boolean(r));
  if (!report.placed.blocks) return <div className="notice materials-status" role="status"><strong>{scopeName}: keine Blöcke</strong></div>;
  return <div className={`notice materials-status ${report.complete ? 'ok' : 'warning'}`} role="status">
    <strong>{report.complete ? `✓ ${scopeName}: vollständige Bauitemliste` : `⚠ ${scopeName}: vorläufige Bauitemliste`}</strong>
    {reasons.length > 0 && <ul>{reasons.map(r => <li key={r}>{r}</li>)}</ul>}
  </div>;
}

function ItemRow({ line }: { line: ItemLine }) {
  const rules = [...new Set(line.sources.map(s => ruleLabel[s.rule]))].join(', ');
  const notes = [...new Set(line.sources.map(s => s.note).filter((n): n is string => Boolean(n)))];
  return <tr className={line.confidence === 'assumed' ? 'assumed' : undefined}>
    <td><code>{short(line.itemId)}</code>
      {(line.sources.length > 1 || line.sources[0]?.state.id !== line.itemId) && <small>aus {line.sources.map(s => `${formatNumber(s.cells)} × ${short(s.state.id)}`).join(' · ')}</small>}
      {notes.map(n => <small key={n} className="note">{n}</small>)}</td>
    <td className="num">{formatNumber(line.count)}</td>
    <td className="num">{formatStacks(line)}{line.stackSize !== 64 && <small>Stapel {line.stackSize}</small>}</td>
    <td className="num">{line.slots}{!line.packable && <small>nicht in Shulker</small>}</td>
    <td>{line.confidence === 'assumed' && <em className="badge warn">Annahme</em>} {rules}</td>
  </tr>;
}
