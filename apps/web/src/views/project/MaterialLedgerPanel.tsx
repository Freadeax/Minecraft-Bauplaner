import { useMemo, useState } from 'react';
import { formatStacks, ledgerToCsv, materialLedger, siteOf } from '../../../../../packages/domain/src/index.js';
import type { LedgerLine, MaterialReport, Project, SiteOverview } from '../../../../../packages/domain/src/index.js';
import { download, formatNumber } from '../../app/ui';

type Filter = 'all' | 'procure' | 'now' | 'free';
const FILTER_LABEL: Readonly<Record<Filter, string>> = { all: 'Alle', procure: 'Zu beschaffen', now: 'Jetzt nötig', free: 'Freies Lager' };
const short = (id: string): string => id.replace(/^minecraft:/, '');
const stacks = (l: LedgerLine, n: number) => n > l.stackSize ? formatStacks({ fullStacks: Math.floor(n / l.stackSize), remainder: n % l.stackSize, stackSize: l.stackSize }) : '';

/**
 * Materialbilanz (FLOW-01): Gesamtbedarf, verbaut, Lager, reserviert und zu beschaffen in einer Tabelle,
 * aus Materialbericht und Baustellenplan (keine zweite Zähllogik). Lager kommt aus der Baustelle bzw. aus
 * den im Team-Reiter übernommenen Lagerkisten.
 */
export function MaterialLedgerPanel({ project, report, plan }: { project: Project; report: MaterialReport; plan: SiteOverview }) {
  const stock = siteOf(project).stock;
  const ledger = useMemo(() => materialLedger(report, plan, stock), [report, plan, stock]);
  const [filter, setFilter] = useState<Filter>('all');
  const lines = ledger.lines.filter(l => filter === 'all' ? l.total > 0 || l.stock > 0 : filter === 'procure' ? l.procure > 0 : filter === 'now' ? l.procureNow > 0 || l.reservedNow > 0 : l.free > 0);
  const t = ledger.totals;
  const pct = (n: number) => t.total ? Math.round(n / t.total * 100) : 0;
  return <section className="ledger" aria-labelledby="ledger-title" data-testid="material-ledger">
    <header className="ledger-head">
      <div><h3 id="ledger-title">Materialbilanz <small>Bedarf · Lager · reserviert · zu beschaffen</small></h3>
        <p className="muted small">{ledger.current ? <>Aktueller Bauabschnitt: <b>{ledger.current.name}</b>. „Jetzt“ meint diesen Abschnitt.</> : 'Alle Schritte sind abgehakt.'} Lagerbestand pflegst du im Reiter <a href={`#/projekt/${project.id}/baustelle`}>Baustelle</a> oder übernimmst ihn aus den Team-Lagerkisten.</p></div>
      <button className="materials-csv" onClick={() => download(`${project.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}-materialbilanz.csv`, '﻿' + ledgerToCsv(ledger), 'text/csv;charset=utf-8')}>⤓ Bilanz als CSV</button>
    </header>
    <div className="ledger-bar" role="img" aria-label={`Von ${formatNumber(t.total)} Bauitems sind ${formatNumber(t.built)} verbaut, ${formatNumber(t.reserved)} im Lager reserviert und ${formatNumber(t.procure)} noch zu beschaffen.`}>
      <span className="built" style={{ width: `${pct(t.built)}%` }} /><span className="reserved" style={{ width: `${pct(t.reserved)}%` }} /><span className="procure" style={{ width: `${pct(t.procure)}%` }} />
    </div>
    <dl className="report-stats ledger-stats">
      <div><dt>Gesamtbedarf</dt><dd>{formatNumber(t.total)}</dd></div>
      <div className="built"><dt>Verbaut (abgehakt)</dt><dd>{formatNumber(t.built)}</dd></div>
      <div className="reserved"><dt>Im Lager reserviert</dt><dd>{formatNumber(t.reserved)}</dd></div>
      <div className="procure"><dt>Zu beschaffen</dt><dd>{formatNumber(t.procure)}{t.procureNow > 0 && <small> davon jetzt {formatNumber(t.procureNow)}</small>}</dd></div>
      <div><dt>Freies Lager</dt><dd>{formatNumber(t.free)}</dd></div>
    </dl>
    <div className="chips" role="group" aria-label="Bilanz filtern">
      {(Object.keys(FILTER_LABEL) as Filter[]).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{FILTER_LABEL[f]}</button>)}
    </div>
    {lines.length === 0 ? <p className="muted">Nichts in diesem Filter.</p> : <div className="table-wrap"><table className="materials-table ledger-table">
      <thead><tr><th>Item</th><th className="num">Gesamt</th><th className="num">Verbaut</th><th className="num">Offen</th><th className="num">Lager</th><th className="num">Reserviert</th><th className="num">Zu beschaffen</th><th className="num">Frei</th></tr></thead>
      <tbody>{lines.map(l => <tr key={l.itemId} className={l.assumed ? 'assumed' : undefined} data-item={l.itemId}>
        <td><code>{short(l.itemId)}</code>{l.assumed && <em className="badge warn">Annahme</em>}</td>
        <td className="num">{formatNumber(l.total)}<small>{stacks(l, l.total)}</small></td>
        <td className="num">{formatNumber(l.built)}</td>
        <td className="num">{formatNumber(l.open)}</td>
        <td className="num">{formatNumber(l.stock)}</td>
        <td className="num">{formatNumber(l.reserved)}{l.reservedNow > 0 && <small>jetzt {formatNumber(l.reservedNow)}</small>}</td>
        <td className={`num${l.procure ? ' bad' : ''}`}>{formatNumber(l.procure)}{l.procureNow > 0 && <small>jetzt {formatNumber(l.procureNow)}{stacks(l, l.procureNow) && ` · ${stacks(l, l.procureNow)}`}</small>}</td>
        <td className={`num${l.free ? ' good' : ''}`}>{formatNumber(l.free)}</td>
      </tr>)}</tbody>
    </table></div>}
    <ul className="materials-notes">{ledger.notes.map(n => <li key={n}>{n}</li>)}</ul>
  </section>;
}
