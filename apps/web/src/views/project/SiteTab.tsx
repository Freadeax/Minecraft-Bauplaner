import { useEffect, useMemo, useState } from 'react';
import {
  addSection, buildGuide, linkOperation, unlinkedMates, checkSections, evaluateProgress, moveSection, planSite, pruneSite, removeSection, reservationsFor, RESERVATION_STATE_LABEL,
  SECTION_PRESET_LABEL, setReservation, setStock, siteOf, siteOperation, suggestSections, updateSection, MAX_RESERVATION_DEPTH,
} from '../../../../../packages/domain/src/index.js';
import type { Guide, Reservation, SectionMember, SectionPlan, SectionPreset, SitePlan, SiteSection } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { download, errorText, formatNumber } from '../../app/ui';
import { isResolved } from './session';
import type { ProjectSession } from './session';
import '../../site.css';

const short = (id: string): string => id.replace(/^minecraft:/, '');
const pct = (a: number, b: number): number => b ? Math.round(a / b * 100) : 0;
const hoursText = (h: number): string => h < 1 ? `${Math.round(h * 60)} min` : `${h.toLocaleString('de-DE', { maximumFractionDigits: 1 })} h`;

/**
 * Construction site (B14): build sections in order, progress per section,
 * stock and gathering plan, free space at connectors. All rules in domain
 * `site.ts`; this tab only edits `project.site` through undoable operations.
 */
export function SiteTab({ session }: { session: ProjectSession }) {
  const { library } = useApp();
  const { project, resolution } = session;
  const site = siteOf(project);
  const [message, setMessage] = useState('');
  const [focus, setFocus] = useState<string | null>(null);
  const save = (next: SitePlan, label: string): void => {
    try { setMessage(session.execute(siteOperation(next, label))); } catch (e) { setMessage(errorText(e)); }
  };

  const guide = useMemo<Guide | null>(() => {
    if (!isResolved(resolution)) return null;
    try { return buildGuide(project, resolution); } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution, project.instances]);
  const progress = useMemo(() => guide ? evaluateProgress(guide, project.progress) : null, [guide, project.progress]);
  const plan = useMemo(() => guide && progress && isResolved(resolution) ? planSite(site, guide, progress, resolution) : null, [site, guide, progress, resolution]);
  const issues = useMemo(() => guide ? checkSections(site, project, guide) : [], [site, project, guide]);
  const reservations = useMemo(() => isResolved(resolution) ? reservationsFor(project, library.versions, site, resolution) : [], [project, library.versions, site, resolution]);

  if (!isResolved(resolution)) return <section className="site" aria-label="Baustelle"><div className="notice warning" role="alert"><strong>Baustelle nicht verfügbar</strong><p>{resolution.error}</p></div></section>;
  if (!guide || !progress || !plan) return null;
  if (!guide.steps.length) return <section className="site" aria-label="Baustelle"><div className="notice">Noch nichts zu planen. Füge im <a href={`#/projekt/${project.id}/editor`}>Editor</a> Bauteile ein.</div></section>;

  const t = plan.totals, current = plan.sections.find(s => s.id === plan.currentId) ?? null;
  const selected = plan.sections.find(s => s.id === focus) ?? current ?? plan.sections[0]!;
  const blocked = reservations.filter(r => r.state === 'blocked');
  const orphans = issues.some(i => i.kind === 'orphan');

  return <section className="site" aria-label="Baustelle">
    <header className="site-overview" aria-label="Fortschrittsübersicht">
      <div className="site-kpi wide">
        <span className="panel-kicker">GESAMTFORTSCHRITT · MANUELL ABGEHAKT</span>
        <strong>{pct(t.blocksDone, t.blocks)} %</strong>
        <Bar value={pct(t.blocksDone, t.blocks)} label="Gesetzte Blöcke laut Haken" />
        <small>{formatNumber(t.blocksDone)} von {formatNumber(t.blocks)} Blöcken · {t.done} / {t.steps} Schritte{t.review > 0 && ` · ${t.review} prüfbedürftig`}</small>
      </div>
      <div className="site-kpi"><span className="panel-kicker">MATERIAL IM LAGER</span><strong>{pct(t.itemsCovered, t.itemsNeeded)} %</strong>
        <Bar value={pct(t.itemsCovered, t.itemsNeeded)} label="Restbedarf aus dem Lager gedeckt" /><small>{formatNumber(t.itemsCovered)} von {formatNumber(t.itemsNeeded)} Bauitems für offene Schritte</small></div>
      <div className="site-kpi"><span className="panel-kicker">NOCH SAMMELN</span><strong>{hoursText(t.gatherHours)}</strong><small>Richtwert für einen Spieler</small></div>
      <div className="site-kpi"><span className="panel-kicker">JETZT DRAN</span><strong className="site-current">{current ? current.name : '✓ Fertig'}</strong>
        <small>{current ? `${current.ready.length} Schritte bereit · ${current.open + current.review} offen` : 'Alle Schritte abgehakt'}</small>
        {current && <a className="link-button" href={`#/projekt/${project.id}/bauen`}>Zur Bauanleitung →</a>}</div>
      <div className="site-kpi"><span className="panel-kicker">FREIRAUM AN ANSCHLÜSSEN</span><strong className={blocked.length ? 'bad' : undefined}>{blocked.length ? `${blocked.length} verbaut` : 'frei'}</strong>
        <small>{reservations.filter(r => r.state === 'free').length} frei · {reservations.filter(r => r.state === 'linked').length} verbunden{reservations.some(r => r.state === 'docked') ? ` · ${reservations.filter(r => r.state === 'docked').length} angedockt` : ''}</small></div>
    </header>
    {message && <div className="notice warning" role="alert">{message}<button onClick={() => setMessage('')}>OK</button></div>}

    <Sections site={site} plan={plan.sections} guide={guide} project={project} issues={issues} selected={selected.id} onSelect={setFocus} save={save}
      onPrune={orphans ? () => save(pruneSite(site, project), 'Entfernte Bauteile aus dem Plan gelöst') : null} />
    <GatherPlan section={selected} site={site} save={save} fileStem={project.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')} />
    <Reservations site={site} reservations={reservations} save={save} onSelectInstance={id => session.select(id)} projectId={project.id}
      onLinkDocked={() => {
        try {
          const ops = unlinkedMates(project, library.versions).map(m => linkOperation(project, library.versions, m.a, m.b));
          if (ops.length) setMessage(session.execute({ kind: 'batch', label: `${ops.length} angedockte Anschlüsse verbunden`, operations: ops }));
        } catch (e) { setMessage(errorText(e)); }
      }} />
    <ul className="materials-notes">{plan.notes.map(n => <li key={n}>{n}</li>)}</ul>
  </section>;
}

function Bar({ value, label }: { value: number; label: string }) {
  return <div className="site-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div>;
}

interface SectionsProps {
  site: SitePlan; plan: readonly SectionPlan[]; guide: Guide; project: ProjectSession['project']; issues: ReturnType<typeof checkSections>;
  selected: string; onSelect(id: string): void; save(next: SitePlan, label: string): void; onPrune: (() => void) | null;
}

function Sections({ site, plan, guide, project, issues, selected, onSelect, save, onPrune }: SectionsProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const preset = (p: SectionPreset) => save({ ...site, sections: suggestSections(project, guide, p) }, `Bauabschnitte: ${SECTION_PRESET_LABEL[p]}`);
  return <section className="site-block" aria-label="Bauabschnitte">
    <div className="site-head">
      <h3>Bauabschnitte <small>in Bau-Reihenfolge · ein Schritt gehört zum ersten passenden Abschnitt</small></h3>
      <form className="site-add" onSubmit={e => { e.preventDefault(); if (name.trim()) { save(addSection(site, name), `Abschnitt „${name.trim()}“ angelegt`); setName(''); } }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Neuer Abschnitt, z. B. Westflügel" aria-label="Name des neuen Bauabschnitts" maxLength={80} />
        <button type="submit" disabled={!name.trim()}>+ Abschnitt</button>
      </form>
    </div>
    {!site.sections.length && <div className="notice site-presets">Noch keine eigenen Abschnitte – alles zählt als ein Abschnitt. Vorschlag übernehmen:
      {(Object.keys(SECTION_PRESET_LABEL) as SectionPreset[]).map(p => <button key={p} onClick={() => preset(p)}>{SECTION_PRESET_LABEL[p]}</button>)}</div>}
    {issues.length > 0 && <div className="notice warning" role="status"><strong>Plan prüfen</strong><ul>{issues.map(i => <li key={i.message}>{i.message}</li>)}</ul>
      {onPrune && <button onClick={onPrune}>Entfernte Bauteile aus dem Plan lösen</button>}</div>}
    <ol className="site-sections">
      {plan.map((s, index) => {
        const def = site.sections.find(d => d.id === s.id);
        const p = pct(s.blocksDone, s.blocks), covered = s.items.reduce((n, i) => n + i.fromStock, 0), need = s.items.reduce((n, i) => n + i.need, 0);
        return <li key={s.id || 'rest'} className={`site-section${s.id === selected ? ' selected' : ''}${s.complete ? ' complete' : ''}`}>
          <button className="site-section-main" onClick={() => onSelect(s.id)} aria-pressed={s.id === selected}>
            <span className="site-no">{s.complete ? '✓' : index + 1}</span>
            <span className="site-section-text"><strong>{s.name}</strong>
              <small>{s.done} / {s.steps.length} Schritte · {formatNumber(s.blocksDone)} / {formatNumber(s.blocks)} Blöcke{s.review ? ` · ${s.review} prüfbedürftig` : ''}</small>
              {s.note && <small className="note">{s.note}</small>}</span>
            <span className="site-section-meta">
              <Bar value={p} label={`Fortschritt ${s.name}`} />
              <small>{p} % gebaut · {s.complete ? 'fertig' : `Lager ${pct(covered, need)} % · ${hoursText(s.gatherHours)} sammeln`}{s.ready.length > 0 && !s.complete ? ` · ${s.ready.length} bereit` : ''}</small>
            </span>
          </button>
          {def && <div className="site-section-tools">
            <button onClick={() => save(moveSection(site, def.id, -1), `„${def.name}“ früher`)} disabled={index === 0} aria-label={`${def.name} früher bauen`}>↑</button>
            <button onClick={() => save(moveSection(site, def.id, 1), `„${def.name}“ später`)} disabled={index === site.sections.length - 1} aria-label={`${def.name} später bauen`}>↓</button>
            <button onClick={() => setEditing(editing === def.id ? null : def.id)} aria-expanded={editing === def.id}>Bearbeiten</button>
            <button onClick={() => save(removeSection(site, def.id), `Abschnitt „${def.name}“ entfernt`)} aria-label={`${def.name} entfernen`}>✕</button>
          </div>}
          {def && editing === def.id && <SectionEditor section={def} site={site} project={project} guide={guide} save={save} onClose={() => setEditing(null)} />}
        </li>;
      })}
    </ol>
  </section>;
}

/** Member while editing: empty inputs are undefined. */
type Draft = { -readonly [K in keyof SectionMember]: SectionMember[K] | undefined } & { instanceId: string };

function SectionEditor({ section, site, project, guide, save, onClose }: { section: SiteSection; site: SitePlan; project: ProjectSession['project']; guide: Guide; save(next: SitePlan, label: string): void; onClose(): void }) {
  const [name, setName] = useState(section.name), [note, setNote] = useState(section.note ?? '');
  const [members, setMembers] = useState<Draft[]>([...section.members]);
  useEffect(() => { setName(section.name); setNote(section.note ?? ''); setMembers([...section.members]); }, [section]);
  const top = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of guide.steps) m.set(s.instanceId, Math.max(m.get(s.instanceId) ?? 0, s.layer));
    return m;
  }, [guide]);
  const member = (id: string) => members.find(m => m.instanceId === id);
  const patch = (id: string, next: Draft | null) => setMembers(ms => next ? (ms.some(m => m.instanceId === id) ? ms.map(m => m.instanceId === id ? next : m) : [...ms, next]) : ms.filter(m => m.instanceId !== id));
  const layer = (v: string): number | undefined => v === '' ? undefined : Math.max(0, Math.floor(Number(v)));
  const apply = () => {
    const clean: SectionMember[] = members.map(m => ({ instanceId: m.instanceId, ...(m.fromLayer ? { fromLayer: m.fromLayer } : {}), ...(m.toLayer !== undefined ? { toLayer: m.toLayer } : {}) }));
    save(updateSection(site, section.id, { name, note, members: clean }), `Abschnitt „${name.trim() || section.name}“ geändert`);
    onClose();
  };
  return <form className="site-editor" onSubmit={e => { e.preventDefault(); apply(); }}>
    <label>Name<input value={name} onChange={e => setName(e.target.value)} maxLength={80} required /></label>
    <label>Notiz<input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="z. B. erst nach dem Nether-Ausflug" /></label>
    <fieldset><legend>Bauteile und Schichten <small>Schicht 0 = unterste Schicht des Bauteils; leer = ganz</small></legend>
      {project.instances.map(inst => {
        const m = member(inst.id), max = top.get(inst.id) ?? 0;
        return <div key={inst.id} className="site-member">
          <label className="raw-toggle"><input type="checkbox" checked={!!m} onChange={e => patch(inst.id, e.target.checked ? { instanceId: inst.id } : null)} /> {inst.name}</label>
          {m && <span className="site-range">Schicht <input type="number" min={0} max={max} value={m.fromLayer ?? ''} placeholder="0" aria-label={`${inst.name}: von Schicht`}
            onChange={e => patch(inst.id, { ...m, fromLayer: layer(e.target.value) })} /> bis <input type="number" min={0} max={max} value={m.toLayer ?? ''} placeholder={String(max)} aria-label={`${inst.name}: bis Schicht`}
            onChange={e => patch(inst.id, { ...m, toLayer: layer(e.target.value) })} /> <small>von 0…{max}</small></span>}
        </div>;
      })}
    </fieldset>
    <div className="button-row"><button type="submit" className="primary">Übernehmen</button><button type="button" onClick={onClose}>Abbrechen</button></div>
  </form>;
}

/** Number input that saves on blur or Enter (one undo entry per change, not per keystroke). */
function StockInput({ value, label, onCommit }: { value: number; label: string; onCommit(n: number): void }) {
  const [text, setText] = useState(String(value || ''));
  useEffect(() => setText(String(value || '')), [value]);
  const commit = () => { const n = Math.max(0, Math.floor(Number(text) || 0)); if (n !== value) onCommit(n); };
  return <input className="site-stock" type="number" min={0} inputMode="numeric" value={text} placeholder="0" aria-label={label}
    onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }} />;
}

function GatherPlan({ section, site, save, fileStem }: { section: SectionPlan; site: SitePlan; save(next: SitePlan, label: string): void; fileStem: string }) {
  const stockOf = (id: string): number => site.stock[id] ?? 0;
  const setHave = (id: string, n: number) => save(setStock(site, id, n), `Lager ${short(id)}: ${n}`);
  const toGather = section.gather.filter(g => g.missing > 0);
  const csv = () => {
    const q = (s: string | number) => typeof s === 'number' ? String(s) : /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    const rows: (string | number)[][] = [['Abschnitt', 'Typ', 'Item', 'Bedarf', 'Aus Lager', 'Fehlt', 'Tätigkeit', 'Werkzeug', 'Farm', 'Stunden (Richtwert)']];
    for (const i of section.items) rows.push([section.name, 'Bauitem', i.itemId, i.need, i.fromStock, i.missing, '', '', '', '']);
    for (const g of section.gather) rows.push([section.name, g.kind === 'fuel' ? 'Brennstoff' : g.kind === 'unknown' ? 'ohne Rezept' : g.kind === 'resolved' ? 'vorhanden' : 'Rohstoff', g.itemId, g.need, g.fromStock, g.missing,
      g.rule?.activity ?? '', g.rule?.tool ?? '', g.rule?.farm ?? '', g.hours ?? '']);
    download(`${fileStem}-sammelplan-${section.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.csv`, '﻿' + rows.map(r => r.map(q).join(';')).join('\n') + '\n', 'text/csv;charset=utf-8');
  };
  return <section className="site-block" aria-label="Sammel- und Farmplan">
    <div className="site-head">
      <h3>Sammel- und Farmplan · {section.name} <small>nur offene Schritte, Lager in Abschnitt-Reihenfolge verbraucht</small></h3>
      <button className="materials-csv" onClick={csv}>⤓ Sammelplan-CSV</button>
    </div>
    {section.complete ? <p className="muted">Dieser Abschnitt ist abgehakt – nichts mehr zu sammeln.</p> : <>
      <div className="site-columns">
        <div>
          <h4>Bauitems <small>Lagerbestand eintragen, wird gespeichert</small></h4>
          <div className="table-wrap"><table className="materials-table">
            <thead><tr><th>Item</th><th className="num">Bedarf</th><th className="num">Im Lager</th><th className="num">Fehlt</th></tr></thead>
            <tbody>{section.items.map(i => <tr key={i.itemId} className={i.assumed ? 'assumed' : undefined}>
              <td><code>{short(i.itemId)}</code>{i.fromStock > 0 && i.fromStock < stockOf(i.itemId) && <small>{formatNumber(i.fromStock)} für diesen Abschnitt</small>}</td>
              <td className="num">{formatNumber(i.need)}</td>
              <td className="num"><StockInput value={stockOf(i.itemId)} label={`Lagerbestand ${short(i.itemId)}`} onCommit={n => setHave(i.itemId, n)} /></td>
              <td className={`num${i.missing ? ' bad' : ' good'}`}>{i.missing ? formatNumber(i.missing) : '✓'}</td>
            </tr>)}</tbody>
          </table></div>
        </div>
        <div>
          <h4>Sammeln und farmen <small>{toGather.length ? `≈ ${hoursText(section.gatherHours)}${section.unplannable ? `, ${section.unplannable} ohne Richtwert` : ''}` : 'alles gedeckt'}</small></h4>
          {section.gather.length === 0 ? <p className="muted">Alle Bauitems dieses Abschnitts liegen im Lager.</p> : <div className="table-wrap"><table className="materials-table site-gather">
            <thead><tr><th>Rohstoff</th><th className="num">Fehlt</th><th className="num">Im Lager</th><th>Wie</th><th className="num">Zeit</th></tr></thead>
            <tbody>{section.gather.map(g => <tr key={g.itemId} className={g.kind === 'unknown' ? 'assumed' : undefined}>
              <td><code>{short(g.itemId)}</code>{g.kind === 'fuel' && <small>Brennstoff für den Ofen</small>}{g.kind === 'resolved' && <small>als „vorhanden“ markiert</small>}{g.kind === 'unknown' && <small className="note">kein Rezept im Katalog</small>}</td>
              <td className={`num${g.missing ? ' bad' : ' good'}`}>{g.missing ? formatNumber(g.missing) : '✓'}{g.slots > 0 && <small>{g.slots} Plätze</small>}</td>
              <td className="num">{g.kind === 'resolved' ? '–' : <StockInput value={stockOf(g.itemId)} label={`Lagerbestand ${short(g.itemId)}`} onCommit={n => setHave(g.itemId, n)} />}</td>
              <td>{g.rule ? <>{g.rule.activity}<small>{g.rule.tool}{g.rule.dimension ? ` · ${g.rule.dimension}` : ''}</small>
                {g.rule.farm && <small className="farm">{g.rule.buildingId ? <a href={`#/bibliothek/gebaeude/${g.rule.buildingId}`}>⌂ {g.rule.farm}</a> : <>⌂ {g.rule.farm}</>}</small>}</> : '–'}</td>
              <td className="num">{g.missing ? g.hours === null ? <em className="badge warn">offen</em> : hoursText(g.hours) : '–'}</td>
            </tr>)}</tbody>
          </table></div>}
        </div>
      </div>
      {section.unresolvedCells > 0 && <p className="muted">{formatNumber(section.unresolvedCells)} Zellen ohne Itemregel (Flüssigkeiten, Modblöcke) sind hier nicht enthalten.</p>}
    </>}
  </section>;
}

function Reservations({ site, reservations, save, onSelectInstance, projectId, onLinkDocked }: { site: SitePlan; reservations: readonly Reservation[]; save(next: SitePlan, label: string): void; onSelectInstance(id: string): void; projectId: string; onLinkDocked(): void }) {
  const docked = reservations.filter(r => r.state === 'docked').length;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? reservations : reservations.filter(r => r.state !== 'linked');
  const setDefault = (n: number) => save({ ...site, reservations: { ...site.reservations, defaultDepth: n } }, `Freiraum-Standardtiefe ${n}`);
  return <section className="site-block" aria-label="Freiraum an Anschlüssen">
    <div className="site-head">
      <h3>Freiraum an Anschlüssen <small>hält Platz für spätere Anbauten frei; geprüft gegen alle gesetzten Blöcke</small></h3>
      <label className="site-depth">Standardtiefe <StockInput value={site.reservations.defaultDepth} label="Standard-Freiraumtiefe in Blöcken" onCommit={n => setDefault(Math.min(n, MAX_RESERVATION_DEPTH))} /> Blöcke</label>
      <label className="raw-toggle"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> verbundene zeigen</label>
      {docked > 0 && <button className="materials-csv" onClick={onLinkDocked}>Angedockte verbinden ({docked})</button>}
    </div>
    {!reservations.length ? <p className="muted">Keine Bauteile mit Anschlüssen im Projekt.</p> : !visible.length ? <p className="muted">Alle Anschlüsse sind verbunden.</p> :
      <div className="table-wrap"><table className="materials-table site-reservations">
        <thead><tr><th>Anschluss</th><th>Zustand</th><th>Bereich</th><th className="num">Tiefe</th></tr></thead>
        <tbody>{visible.map(r => {
          const b = r.bounds;
          return <tr key={r.key} className={r.state === 'blocked' ? 'blocked' : undefined}>
            <td><button className="link-button" onClick={() => onSelectInstance(r.instanceId)} title="Im Editor auswählen">{r.instanceName}</button> · <code>{r.connector.id}</code>
              <small>{r.connector.type} / {r.connector.profile}{r.connector.handedness ? ` (${r.connector.handedness === 'left' ? 'links' : 'rechts'})` : ''}</small></td>
            <td><em className={`badge res-${r.state}`}>{RESERVATION_STATE_LABEL[r.state]}</em>
              {r.dockedWith && <small>an {r.dockedWith} – im Editor verbinden</small>}
              {r.blockedBy.length > 0 && <small>{r.blockedBy.length} Blöcke von {[...new Set(r.blockedBy.map(x => x.instanceName))].join(', ')}</small>}</td>
            <td>{b ? <small>X {b.min[0]}…{b.maxExclusive[0] - 1} · Y {b.min[1]}…{b.maxExclusive[1] - 1} · Z {b.min[2]}…{b.maxExclusive[2] - 1}<br />{r.width} breit × {r.height} hoch ({r.source === 'profile' ? 'aus Profil' : r.source === 'override' ? 'eigene Angabe' : 'Standard'})</small> : '–'}</td>
            <td className="num">{r.state === 'linked' || r.state === 'docked' ? '–' : <StockInput value={r.depth} label={`Freiraumtiefe ${r.instanceName} ${r.connector.id}`}
              onCommit={n => save(setReservation(site, r.instanceId, r.connector.id, { depth: Math.min(n, MAX_RESERVATION_DEPTH), ...(r.source === 'override' && site.reservations.overrides[r.key]?.width !== undefined && { width: r.width }), ...(r.source === 'override' && site.reservations.overrides[r.key]?.height !== undefined && { height: r.height }) }), `Freiraum ${r.instanceName}/${r.connector.id}: ${n}`)} />}
              {r.source === 'override' && <button className="link-button" onClick={() => save(setReservation(site, r.instanceId, r.connector.id, null), `Freiraum ${r.instanceName}/${r.connector.id} zurückgesetzt`)}>Standard</button>}</td>
          </tr>;
        })}</tbody>
      </table></div>}
    {reservations.some(r => r.state === 'blocked') && <p className="muted">Verbaute Freiräume im <a href={`#/projekt/${projectId}/editor`}>Editor</a> auflösen: Bauteil verschieben, Anschluss verbinden oder Tiefe verringern.</p>}
  </section>;
}

