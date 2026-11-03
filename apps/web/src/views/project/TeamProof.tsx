import type { TeamEventBody, TeamRole, TeamView } from '../../../../../packages/domain/src/index.js';
import { canTeam } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';

const short = (id: string) => id.replace(/^minecraft:/, '');
const when = (iso?: string) => iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
const total = (m: Readonly<Record<string, number>>) => Object.values(m).reduce((a, b) => a + b, 0);
const top = (m: Readonly<Record<string, number>>, n = 6) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);

/**
 * Baunachweis und Lager (COOP-04, docs/architecture/TEAMBAU.md §8–9): numbers measured by the server
 * plugin – blocks per player and section, storage chests and what each player put in or took out.
 * Read-only except one's own on/off switch and taking the counted stock into the site storage.
 */
export function TeamProof({ view, sections, me, role, act, nameOf, sectionBlocks, siteStock, onTakeStock }: {
  view: TeamView;
  sections: readonly { readonly id: string; readonly name: string }[];
  me: string | null;
  role: TeamRole;
  act(body: TeamEventBody, label: string): boolean;
  nameOf(id?: string | null): string;
  /** Blocks of each section in the plan (for "x of y"). */
  sectionBlocks: ReadonlyMap<string, number>;
  siteStock: Readonly<Record<string, number>>;
  onTakeStock(stock: Readonly<Record<string, number>>): void;
}) {
  const builders = view.members.filter(m => m.placed || m.broken || total(m.stored) || total(m.taken) || !m.tally);
  const self = me ? view.members.find(m => m.id === me) : undefined;
  const sectionRows = view.sections.filter(s => s.placed || s.broken);
  const stock = top(view.stock, 40);
  const differs = Object.entries(view.stock).some(([item, n]) => (siteStock[item] ?? 0) !== n);
  const nothing = !builders.length && !view.stores.length;
  return <div role="region" className="team-block team-proof" aria-label="Baunachweis und Lager">
    <div className="team-block-head"><h3>Baunachweis &amp; Lager</h3>
      {self && <button className="link-button" onClick={() => act({ kind: 'member.tally', member: self.id, on: !self.tally }, self.tally ? 'Baunachweis aus' : 'Baunachweis an')}>
        {self.tally ? 'Meinen Baunachweis abschalten' : 'Meinen Baunachweis einschalten'}</button>}</div>
    {nothing && <p className="muted">Das Paper-Plugin zählt auf dem Server, wer in welchem Abschnitt wie viele Blöcke gesetzt hat, und den Inhalt der Lagerkisten.
      Im Spiel: <code>/bauplaner lager setzen &lt;Name&gt;</code> (Baumeister, auf die Kiste schauen), <code>/bauplaner beitrag</code>, <code>/bauplaner nachweis aus</code>.
      Die Zahlen kommen mit der Ausfuhr (<code>/bauplaner team export</code>) hierher.</p>}
    {builders.length > 0 && <>
      <table className="team-table team-proof-members"><thead><tr><th>Mitglied</th><th className="num">gesetzt</th><th className="num">abgebaut</th><th>ins Lager</th><th>entnommen</th></tr></thead>
        <tbody>{builders.map(m => <tr key={m.id}><td><strong>{m.name}</strong>{!m.tally && <small className="muted"> · Nachweis aus</small>}</td>
          <td className="num">{m.tally ? formatNumber(m.placed) : '–'}</td><td className="num">{m.tally ? formatNumber(m.broken) : '–'}</td>
          <td>{top(m.stored, 3).map(([i, n]) => `${formatNumber(n)} ${short(i)}`).join(', ') || '–'}</td>
          <td>{top(m.taken, 3).map(([i, n]) => `${formatNumber(n)} ${short(i)}`).join(', ') || '–'}</td></tr>)}</tbody></table>
      {view.tallySpan && <small className="muted">Gezählt vom {when(view.tallySpan.from)} bis {when(view.tallySpan.until)}; nur Blöcke in Teamabschnitten, nur von Mitgliedern mit Nachweis an.</small>}
    </>}
    {sectionRows.length > 0 && <><h4>Je Abschnitt</h4>
      <ul className="team-list team-proof-sections">{sectionRows.map(s => {
        const name = sections.find(x => x.id === s.sectionId)?.name ?? 'entfernter Abschnitt', need = sectionBlocks.get(s.sectionId);
        const shares = Object.entries(s.builders).sort((a, b) => b[1] - a[1]);
        return <li key={s.sectionId}><strong>{name}</strong>
          <span>{formatNumber(s.placed)} gesetzt{need ? ` (Plan ${formatNumber(need)})` : ''}{s.broken ? ` · ${formatNumber(s.broken)} abgebaut` : ''}</span>
          <span className="team-share" aria-label={`Anteile an ${name}`}>{shares.map(([id, n]) => <span key={id} style={{ flexGrow: n }} title={`${nameOf(id)}: ${formatNumber(n)}`}>{nameOf(id)} {s.placed ? Math.round(n / s.placed * 100) : 0} %</span>)}</span></li>;
      })}</ul></>}
    {Object.keys(view.placedBlocks).length > 0 && <><h4>Verbaut</h4>
      <p className="team-chips static">{top(view.placedBlocks, 12).map(([i, n]) => <span key={i}>{formatNumber(n)} × {short(i)}</span>)}</p></>}
    {view.stores.length > 0 && <><h4>Lagerkisten</h4>
      <ul className="team-list">{view.stores.map(c => <li key={c.id}><strong>{c.name}</strong><span>{c.pos.join(' ')}{c.dimension !== 'minecraft:overworld' ? ` · ${short(c.dimension)}` : ''}</span>
        <small>{c.countedAt ? `${formatNumber(total(c.items))} Items · gezählt ${when(c.countedAt)} von ${nameOf(c.countedBy)}${c.partial ? ' · Liste gekürzt' : ''}` : 'noch nicht gezählt'}</small></li>)}</ul>
      {stock.length > 0 && <><p className="team-chips static" aria-label="Lagerbestand">{stock.map(([i, n]) => <span key={i}>{formatNumber(n)} × {short(i)}</span>)}</p>
        {canTeam(role, 'section.verify') ? <button className="secondary" disabled={!differs} onClick={() => onTakeStock(view.stock)}>
          {differs ? 'Bestand ins Baustellen-Lager übernehmen' : 'Baustellen-Lager entspricht dem Bestand'}</button>
          : <small className="muted">Baumeister und Bauleitung übernehmen den Bestand ins Lager im Reiter „Baustelle“.</small>}</>}
    </>}
  </div>;
}
