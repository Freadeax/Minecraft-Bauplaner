import type { StoreChest, TeamEventBody, TeamRole, TeamView } from '../../../../../../packages/domain/src/index.js';
import { canTeam, farmType } from '../../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../../app/ui';

const short = (id: string) => id.replace(/^minecraft:/, '');
const when = (iso?: string) => iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
const total = (m: Readonly<Record<string, number>>) => Object.values(m).reduce((a, b) => a + b, 0);
const top = (m: Readonly<Record<string, number>>, n = 6) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
const signed = (m: Readonly<Record<string, number>>, n = 6) => Object.entries(m).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, n)
  .map(([i, v]) => `${v > 0 ? '+' : '−'}${formatNumber(Math.abs(v))} ${short(i)}`).join(', ');
const STATUS: Record<StoreChest['status'], string> = { geprueft: 'geprüft', abweichend: 'abweichend', fehlt: 'Kiste fehlt', ungeprueft: 'ungeprüft' };
const PROTECTION: Record<string, string> = { offen: 'offen für alle', team: 'Team', abschnitt: 'nur Abschnitt', eingang: 'Eingang (nur einlegen)', gesperrt: 'gesperrt' };

/** One checked store (COOP-05): status, content, open difference, bookings per member. */
function StoreRow({ c, sections, nameOf, farmName }: { c: StoreChest; sections: readonly { readonly id: string; readonly name: string }[]; nameOf(id?: string | null): string; farmName?: (id: string) => string | undefined }) {
  const section = c.section ? sections.find(x => x.id === c.section)?.name ?? 'entfernter Abschnitt' : 'ganzes Projekt';
  const movers = [...new Set([...Object.keys(c.movedIn), ...Object.keys(c.movedOut)])];
  const hopper = Object.keys(c.hopperIn).length || Object.keys(c.hopperOut).length;
  return <li className={`team-store ${c.status}`} data-status={c.status}>
    <div className="team-store-head"><strong>{c.name}</strong><span className="team-store-status">{STATUS[c.status]}</span>
      <span>{section} · {c.purpose} · Schutz {PROTECTION[c.protection ?? (c.purpose === 'eingang' ? 'eingang' : 'team')]}</span>
      <small>{c.pos.join(' ')}{c.pos2 ? ` + ${c.pos2.join(' ')}` : ''}{c.dimension !== 'minecraft:overworld' ? ` · ${short(c.dimension)}` : ''}</small></div>
    <small>{c.countedAt ? `${formatNumber(total(c.items))} Items · gezählt ${when(c.countedAt)} von ${nameOf(c.countedBy)}${c.partial ? ' · Liste gekürzt' : ''}` : 'noch nicht gezählt'}
      {c.checkedAt ? ` · geprüft ${when(c.checkedAt)}` : ''}{c.sealedBy ? ` · gesiegelt ${when(c.sealedAt)} von ${nameOf(c.sealedBy)}` : ''}</small>
    {Object.keys(c.deviation).length > 0 && <p className="team-store-deviation">Ohne Buchung verändert: {signed(c.deviation, 8)}. Ein Baumeister prüft die Kiste und bestätigt im Spiel mit <code>/bauplaner lager siegeln</code>.</p>}
    {c.status === 'fehlt' && <p className="team-store-deviation">An der Stelle steht keine Kiste mehr. Im Spiel neu aufstellen oder mit <code>/bauplaner lager entmarkieren</code> aufheben.</p>}
    {c.seen && <p className="team-store-seen" data-seen>Laut Spiel ({nameOf(c.seen.by)}, {when(c.seen.at)}, ungeprüft): {top(c.seen.items, 6).map(([i, n]) => `${formatNumber(n)} ${short(i)}`).join(', ') || 'leer'}{c.seen.partial ? ' …' : ''}</p>}
    {c.purpose === 'ertrag' && <p className="team-store-yield">Ertragskiste{c.farm ? ` · Farm ${farmName?.(c.farm) ?? c.farm}` : ''}: {formatNumber(Object.values(c.yieldIn).reduce((n, x) => n + x, 0))} Items in {formatNumber(c.yieldMinutes)} min Laufzeit
      {c.yieldMinutes >= 10 && ` · ${formatNumber(Math.round(Object.values(c.yieldIn).reduce((n, x) => n + x, 0) * 60 / c.yieldMinutes))} je Stunde`}</p>}
    {(movers.length > 0 || hopper > 0) && <ul className="team-store-moves" aria-label={`Buchungen in ${c.name}`}>
      {movers.map(m => <li key={m}><span>{nameOf(m)}</span><span>{top(c.movedIn[m] ?? {}, 3).map(([i, n]) => `+${formatNumber(n)} ${short(i)}`).join(', ')}{c.movedIn[m] && c.movedOut[m] ? ' · ' : ''}{top(c.movedOut[m] ?? {}, 3).map(([i, n]) => `−${formatNumber(n)} ${short(i)}`).join(', ')}</span></li>)}
      {hopper > 0 && <li><span>Trichter</span><span>{top(c.hopperIn, 3).map(([i, n]) => `+${formatNumber(n)} ${short(i)}`).join(', ')}{top(c.hopperOut, 3).map(([i, n]) => ` −${formatNumber(n)} ${short(i)}`).join(',')}</span></li>}
    </ul>}
  </li>;
}

/**
 * Baunachweis und Lager (COOP-04, docs/architecture/team/TEAMBAU.md §8–9): numbers measured by the server
 * plugin – blocks per player and section, storage chests and what each player put in or took out.
 * Read-only except one's own on/off switch and taking the counted stock into the site storage.
 */
export function TeamProof({ view, sections, me, role, act, nameOf, sectionBlocks, siteStock, onTakeStock, farms }: {
  view: TeamView;
  sections: readonly { readonly id: string; readonly name: string }[];
  me: string | null;
  role: TeamRole;
  act(body: TeamEventBody, label: string): boolean;
  nameOf(id?: string | null): string;
  /** Blocks of each section in the plan (for "x of y"). */
  sectionBlocks: ReadonlyMap<string, number>;
  siteStock: Readonly<Record<string, number>>;
  /** Farms of the project (Produktion), to name the farm of a yield store and compare with its planned rate. */
  farms?: readonly { readonly id: string; readonly name: string; readonly type?: string; readonly units?: number }[];
  onTakeStock(stock: Readonly<Record<string, number>>): void;
}) {
  const builders = view.members.filter(m => m.placed || m.broken || total(m.stored) || total(m.taken) || !m.tally);
  const self = me ? view.members.find(m => m.id === me) : undefined;
  const sectionRows = view.sections.filter(s => s.placed || s.broken || s.seen);
  const seenStock = top(view.stockSeen, 24);
  const stock = top(view.stock, 40);
  const differs = Object.entries(view.stock).some(([item, n]) => (siteStock[item] ?? 0) !== n);
  const nothing = !builders.length && !view.stores.length && !sectionRows.length;
  return <div role="region" className="team-block team-proof" aria-label="Baunachweis und Lager">
    <div className="team-block-head"><h3>Baunachweis &amp; Lager</h3>
      {self && <button className="link-button" onClick={() => act({ kind: 'member.tally', member: self.id, on: !self.tally }, self.tally ? 'Baunachweis aus' : 'Baunachweis an')}>
        {self.tally ? 'Meinen Baunachweis abschalten' : 'Meinen Baunachweis einschalten'}</button>}</div>
    {nothing && <p className="muted">Das Paper-Plugin zählt auf dem Server, wer in welchem Abschnitt wie viele Blöcke gesetzt hat, und den Inhalt der Lagerkisten.
      Im Spiel: <code>/bauplaner lager markieren &lt;Name&gt;</code> (Baumeister, auf die Kiste schauen), <code>/bauplaner lager bedarf</code>, <code>/bauplaner beitrag</code>, <code>/bauplaner nachweis aus</code>.
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
          {(s.placed > 0 || s.broken > 0) && <span>{formatNumber(s.placed)} gesetzt{need ? ` (Plan ${formatNumber(need)})` : ''}{s.broken ? ` · ${formatNumber(s.broken)} abgebaut` : ''}</span>}
          {s.seen && <span className="team-seen" data-seen title="Vom Mod eines Mitspielers im Spiel gezählt, nicht vom Server geprüft">
            laut Spiel {s.seen.total ? Math.floor(s.seen.placed / s.seen.total * 100) : 0} % ({formatNumber(s.seen.placed)} von {formatNumber(s.seen.total)}{s.seen.wrong ? ` · ${formatNumber(s.seen.wrong)} falsch` : ''}) · {nameOf(s.seen.by)}, {when(s.seen.at)}, ungeprüft
            {s.seen.missing.length > 0 && <small> · fehlt: {s.seen.missing.slice(0, 4).map(l => `${formatNumber(l.count)} ${short(l.item)}`).join(', ')}</small>}</span>}
          <span className="team-share" aria-label={`Anteile an ${name}`}>{shares.map(([id, n]) => <span key={id} style={{ flexGrow: n }} title={`${nameOf(id)}: ${formatNumber(n)}`}>{nameOf(id)} {s.placed ? Math.round(n / s.placed * 100) : 0} %</span>)}</span></li>;
      })}</ul></>}
    {Object.keys(view.placedBlocks).length > 0 && <><h4>Verbaut</h4>
      <p className="team-chips static">{top(view.placedBlocks, 12).map(([i, n]) => <span key={i}>{formatNumber(n)} × {short(i)}</span>)}</p></>}
    <YieldBook view={view} farms={farms} />
    {view.stores.length > 0 && <><h4>Lagerkisten</h4>
      {(() => { const bad = view.stores.filter(c => c.status === 'abweichend' || c.status === 'fehlt').length;
        return <p className={bad ? 'team-store-summary bad' : 'team-store-summary'}>{view.stores.length} Lager · {view.stores.filter(c => c.status === 'geprueft').length} geprüft{bad ? ` · ${bad} mit Abweichung oder fehlender Kiste` : ''}</p>; })()}
      <ul className="team-list team-stores">{view.stores.map(c => <StoreRow key={c.id} c={c} sections={sections} nameOf={nameOf} farmName={id => farms?.find(f => f.id === id)?.name} />)}</ul>
      {stock.length > 0 && <><p className="team-chips static" aria-label="Lagerbestand">{stock.map(([i, n]) => <span key={i}>{formatNumber(n)} × {short(i)}</span>)}</p>
        {canTeam(role, 'section.verify') ? <button className="secondary" disabled={!differs} onClick={() => onTakeStock(view.stock)}>
          {differs ? 'Bestand ins Baustellen-Lager übernehmen' : 'Baustellen-Lager entspricht dem Bestand'}</button>
          : <small className="muted">Baumeister und Bauleitung übernehmen den Bestand ins Lager im Reiter „Baustelle“.</small>}</>}
      {seenStock.length > 0 && <p className="team-chips static seen" aria-label="Bestand laut Spiel">{seenStock.map(([i, n]) => <span key={i}>{formatNumber(n)} × {short(i)}</span>)}<small className="muted"> laut Spiel, ohne Serverzählung (ungeprüft)</small></p>}
    </>}
  </div>;
}

/**
 * Ertragsbuch (COOP-08 S03): every yield store with what the server measured (store.yield: items and the
 * minutes the chunk was loaded), as items per hour, next to the planned rate of its farm (Produktion).
 */
export function YieldBook({ view, farms }: { view: TeamView; farms?: undefined | readonly { readonly id: string; readonly name: string; readonly type?: string; readonly units?: number }[] }) {
  const rows = new Map<string, { chest: string; name: string; farm?: string; items: Record<string, number>; minutes: number; periods: number; last?: { until: string; minutes: number; items: number } }>();
  for (const y of view.yields) {
    let r = rows.get(y.chest);
    if (!r) rows.set(y.chest, r = { chest: y.chest, name: y.chestName, ...(y.farm && { farm: y.farm }), items: {}, minutes: 0, periods: 0 });
    for (const [i, n] of Object.entries(y.items)) r.items[i] = (r.items[i] ?? 0) + n;
    r.minutes += y.minutes; r.periods++;
    if (y.farm) r.farm = y.farm;
    if (!r.last || y.until > r.last.until) r.last = { until: y.until, minutes: y.minutes, items: total(y.items) };
  }
  for (const c of view.stores) if (c.purpose === 'ertrag' && !rows.has(c.id)) rows.set(c.id, { chest: c.id, name: c.name, ...(c.farm && { farm: c.farm }), items: {}, minutes: 0, periods: 0 });
  if (!rows.size) return null;
  return <div className="team-yield-book" role="region" aria-label="Ertragsbuch">
    <h4>Ertragsbuch <small>gemessen vom Server-Plugin</small></h4>
    <table className="team-table"><thead><tr><th>Ertragskiste</th><th>Farm</th><th className="num">Laufzeit</th><th>je Stunde (gemessen)</th><th>Plan</th></tr></thead>
      <tbody>{[...rows.values()].sort((a, b) => a.name.localeCompare(b.name, 'de')).map(r => {
        const f = r.farm ? farms?.find(x => x.id === r.farm) : undefined, type = f?.type ? farmType(f.type) : undefined;
        const hours = r.minutes / 60;
        const measured = hours > 0 ? top(r.items, 3).map(([i, n]) => ({ item: i, perHour: n / hours })) : [];
        const planned = type ? type.outputs.map(o => ({ item: o.item, perHour: o.perHour * (f?.units ?? 1) })) : [];
        return <tr key={r.chest} data-yield={r.chest}>
          <td><strong>{r.name}</strong>{r.last && <small className="muted"><br />zuletzt {when(r.last.until)}: {formatNumber(r.last.items)} in {formatNumber(r.last.minutes)} min</small>}</td>
          <td>{f?.name ?? (r.farm ? <span className="muted">{r.farm}</span> : <span className="muted">keine</span>)}</td>
          <td className="num">{r.minutes ? `${formatNumber(Math.round(hours * 10) / 10)} h` : '–'}{r.periods > 1 ? <small className="muted"> · {r.periods} Meldungen</small> : null}</td>
          <td>{measured.length ? measured.map(m => `${formatNumber(Math.round(m.perHour))} ${short(m.item)}`).join(', ') : <span className="muted">noch nichts gemeldet</span>}
            {hours > 0 && hours < 1 && <small className="muted"> · unter 1 h, noch unsicher</small>}</td>
          <td>{planned.length ? planned.map(p => {
            const got = measured.find(m => m.item === p.item);
            const ratio = got && p.perHour ? Math.round(got.perHour / p.perHour * 100) : null;
            return <span key={p.item} className={ratio !== null && ratio < 70 ? 'bad' : undefined}>{formatNumber(Math.round(p.perHour))} {short(p.item)}{ratio !== null ? ` (${ratio} %)` : ''} </span>;
          }) : <span className="muted">–</span>}</td></tr>;
      })}</tbody></table>
    <small className="muted">Rate = Items durch die Minuten, in denen der Chunk der Kiste geladen war. Der Reiter „Produktion“ rechnet ab 1 h Laufzeit mit diesen Werten.</small>
  </div>;
}
