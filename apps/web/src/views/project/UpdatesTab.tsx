import { useEffect, useMemo, useState } from 'react';
import {
  CONNECTOR_CHANGE_LABEL, PATCH_POLICY_LABEL, UPDATE_KIND_LABEL, UPDATE_STATUS_LABEL, findUpdates, freezeOperation, pivotAligned, returnChoice,
  summarizeUpdates, unfreezeOperation, updatesOf,
} from '../../../../../packages/domain/src/index.js';
import type { AssetVersion, InstanceUpdateInfo, PatchPolicy, PreparedUpdate, Project, UpdateChoice } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { errorText, formatNumber } from '../../app/ui';
import { DiffView } from '../../schem/DiffView';
import { changedCells } from '../../../../../packages/voxel/src/index.js';
import { isResolved } from './session';
import type { ProjectSession } from './session';
import { prepareUpdateInBackground } from '../../jobs/updates';
import { isAbort } from '../../jobs/client';
import { JobStatus } from '../../jobs/JobStatus';
import type { JobProgress } from '../../jobs/protocol';
import './updates.css';

/**
 * Projekt-Reiter „Updates“ (UPDATE-01): which instances have newer library
 * versions, what a switch would change (geometry, materials, connectors and
 * links, build steps, conflicts) and the explicit decision: take over as one
 * undoable step, freeze, or return. Nothing is switched automatically.
 */
type Filter = 'alle' | 'update' | 'frozen' | 'local';
const FILTER_LABEL: Readonly<Record<Filter, string>> = { alle: 'Alle', update: 'Mit Update', frozen: 'Eingefroren', local: 'Lokal geändert' };
const when = (iso: string) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const bare = (id: string) => id.replace(/^minecraft:/, '');
const signed = (n: number) => `${n > 0 ? '+' : ''}${formatNumber(n)}`;

interface Pending { readonly project: Project; readonly choices: readonly UpdateChoice[]; readonly policy: PatchPolicy }
type Prepared = { readonly key: Pending; readonly result: PreparedUpdate } | { readonly key: Pending; readonly error: string };

/** Versions an instance can switch to: newer, older and any version it came from. */
function optionsFor(info: InstanceUpdateInfo, project: Project, versions: ReadonlyMap<string, AssetVersion>): { version: AssetVersion; note: string }[] {
  const out = new Map<string, { version: AssetVersion; note: string }>();
  for (const v of info.newer) out.set(v.id, { version: v, note: v === info.newer.at(-1) ? 'neueste' : 'neuer' });
  for (const e of updatesOf(project).log) if (e.instanceId === info.instance.id && !out.has(e.fromVersionId)) {
    const v = versions.get(e.fromVersionId);
    if (v) out.set(v.id, { version: v, note: 'vorher verwendet' });
  }
  for (const v of [...info.older].reverse()) if (!out.has(v.id)) out.set(v.id, { version: v, note: 'älter' });
  out.delete(info.instance.assetVersionId);
  return [...out.values()];
}

export function UpdatesTab({ session }: { session: ProjectSession }) {
  const { repo, library, reloadLibrary } = useApp();
  const { project } = session;
  const infos = useMemo(() => findUpdates(project, library), [project, library]);
  const summary = summarizeUpdates(infos);
  const [filter, setFilter] = useState<Filter>('alle');
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [keepLocal, setKeepLocal] = useState(true);
  const [policy, setPolicy] = useState<PatchPolicy>('local');
  const [pending, setPending] = useState<Pending | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean; undo?: boolean } | null>(null);
  const [note, setNote] = useState('');

  const targetOf = (info: InstanceUpdateInfo): string | undefined => {
    const options = optionsFor(info, project, library.versions);
    const chosen = targets[info.instance.id];
    return options.some(o => o.version.id === chosen) ? chosen : (info.newer.at(-1)?.id ?? options[0]?.version.id);
  };
  const choiceFor = (info: InstanceUpdateInfo): UpdateChoice | null => {
    const target = targetOf(info);
    return target && !info.frozen ? { instanceId: info.instance.id, targetVersionId: target, keepLocal } : null;
  };

  // Computes the consequences off the click handler so the page can show progress first.
  // Large projects are computed in the background worker with progress and „Abbrechen“ (PERF-04).
  useEffect(() => {
    if (!pending) return;
    const controller = new AbortController();
    setPrepared(null); setProgress(null);
    const timer = setTimeout(() => {
      prepareUpdateInBackground(pending.project, library, pending.choices, { policy: pending.policy, ...(isResolved(session.resolution) && pending.project === project && { before: session.resolution }) },
        { signal: controller.signal, onProgress: p => { if (!controller.signal.aborted) setProgress(p); } })
        .then(result => { if (!controller.signal.aborted) setPrepared({ key: pending, result }); })
        .catch(e => { if (!controller.signal.aborted && !isAbort(e)) setPrepared({ key: pending, error: errorText(e) }); });
    }, 0);
    return () => { controller.abort(); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, library]);

  const show = (choices: readonly UpdateChoice[]) => { setNotice(null); setPending(choices.length ? { project, choices, policy } : null); };
  const stale = pending !== null && pending.project !== project;

  const run = (op: () => ReturnType<typeof freezeOperation>, text: string) => {
    try { const err = session.execute(op()); setNotice(err ? { text: err, error: true } : { text, undo: true }); }
    catch (e) { setNotice({ text: errorText(e), error: true }); }
  };

  const apply = async () => {
    if (!prepared || !('result' in prepared) || stale) return;
    const r = prepared.result;
    setBusy(true);
    try {
      if (r.versions.length) { await repo.applyBatch({ assets: r.assets, versions: r.versions }); await reloadLibrary(); }
      const err = session.execute(r.operation);
      if (err) throw new Error(err);
      const n = r.plan.instances.length;
      setNotice({ text: `Übernommen: ${n === 1 ? `${r.plan.instances[0]!.instanceName} steht jetzt auf ${r.plan.instances[0]!.to.label}` : `${n} Instanzen umgestellt`}. Die alte Version bleibt in der Bibliothek; „Zurückkehren“ im Verlauf oder Rückgängig stellt sie wieder her.`, undo: true });
      setPending(null); setPrepared(null); setChecked(new Set());
    } catch (e) { setNotice({ text: errorText(e), error: true }); } finally { setBusy(false); }
  };

  const visible = infos.filter(i => filter === 'alle' || (filter === 'update' ? i.status === 'available' : filter === 'frozen' ? i.status === 'frozen' : i.local));
  const checkedInfos = infos.filter(i => checked.has(i.instance.id));
  const toggle = (id: string) => setChecked(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const log = [...updatesOf(project).log].reverse();
  const returnable = new Set(project.instances.filter(i => returnChoice(project, library, i.id)).map(i => i.id));

  return <section className="updates-tab" aria-label="Updates und Versionen">
    <div className="updates-head">
      <div>
        <h2>Updates und Versionen</h2>
        <p className="muted">Jede Instanz bleibt auf ihrer festen Version. Neue Versionen werden nur angezeigt; umgestellt wird erst, wenn du die Folgen geprüft und übernommen hast. Eingefrorene Instanzen bekommen keine Updates angeboten.</p>
      </div>
      <dl className="updates-stats" aria-label="Übersicht">
        <div className={summary.available ? 'has' : ''}><dt>Update verfügbar</dt><dd data-testid="updates-available">{summary.available}</dd></div>
        <div><dt>Eingefroren</dt><dd>{summary.frozen}</dd></div>
        <div><dt>Lokal geändert</dt><dd>{summary.local}</dd></div>
        {summary.missing > 0 && <div className="bad"><dt>Version fehlt</dt><dd>{summary.missing}</dd></div>}
      </dl>
    </div>

    {notice && <div className={`notice ${notice.error ? 'warning' : 'success'}`} role={notice.error ? 'alert' : 'status'}>
      <p>{notice.text}</p>{notice.undo && !notice.error && <button type="button" onClick={() => { session.undo(); setNotice(null); }}>Rückgängig</button>}</div>}

    {!infos.length ? <p className="notice">Das Projekt enthält noch keine Bauteile.</p> : <>
      <div className="updates-bar" role="toolbar" aria-label="Auswahl">
        <div className="seg" role="group" aria-label="Filter">
          {(Object.keys(FILTER_LABEL) as Filter[]).map(f => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{FILTER_LABEL[f]}</button>)}
        </div>
        <button type="button" disabled={!summary.available} onClick={() => setChecked(new Set(infos.filter(i => i.status === 'available').map(i => i.instance.id)))}>Alle mit Update wählen</button>
        <button type="button" disabled={!checked.size} onClick={() => setChecked(new Set())}>Auswahl leeren</button>
      </div>

      <div className="table-wrap">
        <table className="updates-table">
          <thead><tr><th scope="col"><span className="sr-only">Wählen</span></th><th scope="col">Instanz</th><th scope="col">Version</th><th scope="col">Stand</th><th scope="col">Wechseln auf</th><th scope="col"><span className="sr-only">Aktionen</span></th></tr></thead>
          <tbody>{visible.map(info => {
            const options = optionsFor(info, project, library.versions), target = targetOf(info);
            const id = info.instance.id;
            return <tr key={id} data-instance={info.instance.name} data-status={info.status}>
              <td><input type="checkbox" aria-label={`${info.instance.name} wählen`} disabled={!!info.frozen || !options.length} checked={checked.has(id)} onChange={() => toggle(id)} /></td>
              <th scope="row">{info.instance.name}<small>{info.asset?.name ?? 'unbekanntes Bauteil'}</small></th>
              <td>{info.current?.label ?? '—'}{info.local && <span className="badge local" title={`Eigene Blockänderungen auf Grundlage von ${info.base?.label ?? 'unbekannt'}`}>lokal geändert</span>}</td>
              <td><span className={`update-chip ${info.status}`}>{UPDATE_STATUS_LABEL[info.status]}</span>
                {info.status === 'available' && <small>neu: {info.newer.map(v => v.label).join(', ')}</small>}
                {info.frozen && <small title={info.frozen.note}>seit {when(info.frozen.at)}{info.frozen.note && ` · ${info.frozen.note}`}{info.newer.length ? ` · neuer: ${info.newer.at(-1)!.label}` : ''}</small>}</td>
              <td>{options.length ? <select aria-label={`Zielversion für ${info.instance.name}`} value={target} disabled={!!info.frozen} onChange={e => setTargets(t => ({ ...t, [id]: e.target.value }))}>
                {options.map(o => <option key={o.version.id} value={o.version.id}>{o.version.label} ({o.note})</option>)}</select> : <span className="muted">keine andere Version</span>}</td>
              <td><div className="updates-actions">
                {!info.frozen && options.length > 0 && <button type="button" onClick={() => { const c = choiceFor(info); if (c) show([c]); }}>Folgen anzeigen</button>}
                {returnable.has(id) && !info.frozen && <button type="button" onClick={() => { const c = returnChoice(project, library, id); if (c) show([c]); }}>Zurückkehren</button>}
                {info.frozen ? <button type="button" onClick={() => run(() => unfreezeOperation(project, [id]), `${info.instance.name} freigegeben.`)}>Freigeben</button>
                  : info.current && <button type="button" onClick={() => run(() => freezeOperation(project, [id], note), `${info.instance.name} auf ${info.current!.label} eingefroren.`)}>Einfrieren</button>}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>

      <div className="updates-bar">
        <label className="check"><input type="checkbox" checked={keepLocal} onChange={e => setKeepLocal(e.target.checked)} /> Lokale Blockänderungen mitnehmen</label>
        <label className="inline">Bei Doppeländerung <select value={policy} onChange={e => setPolicy(e.target.value as PatchPolicy)} aria-label="Regel bei Doppeländerung">
          {(Object.keys(PATCH_POLICY_LABEL) as PatchPolicy[]).map(p => <option key={p} value={p}>{PATCH_POLICY_LABEL[p]}</option>)}</select></label>
        <input value={note} maxLength={300} onChange={e => setNote(e.target.value)} placeholder="Notiz zum Einfrieren (optional)" aria-label="Notiz zum Einfrieren" />
        <button type="button" className="primary" disabled={!checkedInfos.length} onClick={() => show(checkedInfos.map(choiceFor).filter((c): c is UpdateChoice => !!c))}>Folgen für {checkedInfos.length} anzeigen</button>
        <button type="button" disabled={!checkedInfos.length} onClick={() => run(() => freezeOperation(project, checkedInfos.map(i => i.instance.id), note), `${checkedInfos.length} Instanz(en) eingefroren.`)}>Auswahl einfrieren</button>
      </div>
    </>}

    {pending && <UpdatePlanView prepared={prepared && prepared.key === pending ? prepared : null} stale={stale} busy={busy} progress={progress}
      onApply={() => void apply()} onCancel={() => { setPending(null); setPrepared(null); }} onRefresh={() => show(pending.choices)} profileId={project.profileId} />}

    <section className="updates-log" aria-label="Updateverlauf">
      <h3>Verlauf</h3>
      {!log.length ? <p className="muted">Noch keine Version gewechselt.</p> : <ol>{log.map(e => <li key={e.id}>
        <strong>{UPDATE_KIND_LABEL[e.kind]}</strong> · {e.instanceName}: {e.fromLabel} → {e.toLabel}
        {e.patch && <span className="muted"> · {e.patch.cells} lokale Zelle(n) mitgenommen{e.patch.conflicts ? `, ${e.patch.conflicts} Doppeländerung(en): ${PATCH_POLICY_LABEL[e.patch.policy]}` : ''}</span>}
        {e.removedLinks > 0 && <span className="muted"> · {e.removedLinks} Verbindung(en) gelöst</span>}
        <small>{when(e.at)}</small></li>)}</ol>}
    </section>
  </section>;
}

function UpdatePlanView({ prepared, stale, busy, onApply, onCancel, onRefresh, profileId, progress }: {
  prepared: Prepared | null; stale: boolean; busy: boolean; onApply(): void; onCancel(): void; onRefresh(): void; profileId: string; progress: JobProgress | null;
}) {
  const [index, setIndex] = useState(0);
  if (!prepared) return <section className="update-plan" aria-label="Folgen des Updates" aria-busy="true">
    {progress ? <JobStatus title="Folgen werden berechnet …" progress={progress} onCancel={onCancel} /> : <p role="status">Folgen werden berechnet …</p>}</section>;
  if ('error' in prepared) return <section className="update-plan" aria-label="Folgen des Updates">
    <div className="notice warning" role="alert"><p>{prepared.error}</p></div><button type="button" onClick={onCancel}>Schließen</button></section>;
  const { plan } = prepared.result;
  const one = plan.instances[Math.min(index, plan.instances.length - 1)]!;
  const [a, b] = pivotAligned(one.from.payload, one.to.payload);
  const changed = (p: typeof one) => changedCells(p.geometry);
  return <section className="update-plan" aria-label="Folgen des Updates">
    <h3>Folgen vor dem Übernehmen</h3>
    {stale && <div className="notice warning" role="alert"><p>Das Projekt wurde seitdem geändert.</p><button type="button" onClick={onRefresh}>Neu berechnen</button></div>}
    <ul className="plan-list">{plan.instances.map((p, i) => <li key={p.instanceId}>
      <button type="button" className="link-button" aria-pressed={i === index} onClick={() => setIndex(i)}>{p.instanceName}</button>: {p.from.label} → <strong>{p.to.label}</strong>
      <span className="muted"> · {UPDATE_KIND_LABEL[p.kind]} · {changed(p) ? `${formatNumber(changed(p))} Zellen anders` : 'blockgleich'}</span>
      {p.rebase && <span className="muted"> · {p.rebase.patchCells} lokale Zelle(n): {p.rebase.applied} übertragen, {p.rebase.already} schon enthalten, {p.rebase.conflicts.length} Doppeländerung(en)</span>}
      {p.connectors.length > 0 && <span className="muted"> · Anschlüsse: {p.connectors.map(c => `${c.id} ${CONNECTOR_CHANGE_LABEL[c.kind]}`).join(', ')}</span>}
    </li>)}</ul>

    <dl className="plan-stats">
      <div><dt>Blöcke im Projekt</dt><dd>{formatNumber(plan.blocksBefore)} → {formatNumber(plan.blocksAfter)} ({signed(plan.blocksAfter - plan.blocksBefore)})</dd></div>
      <div className={plan.conflictsAfter > plan.conflictsBefore ? 'bad' : ''}><dt>Voxelkonflikte</dt><dd>{plan.conflictsBefore} → {plan.conflictsAfter}</dd></div>
      <div className={plan.removedLinkIds.length ? 'bad' : ''}><dt>Verbindungen gelöst</dt><dd>{plan.removedLinkIds.length}</dd></div>
      <div className={plan.steps.length ? 'warn' : ''}><dt>Abgehakte Schritte prüfen</dt><dd>{plan.steps.length}</dd></div>
      <div><dt>Neue offene Schritte</dt><dd>{plan.openedSteps}</dd></div>
    </dl>
    {plan.warnings.length > 0 && <ul className="plan-warnings">{plan.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    {plan.newConflictsWith.length > 0 && <p className="notice warning">Neue Konflikte mit: {plan.newConflictsWith.join(', ')}.</p>}

    <div className="plan-grid">
      <details open={plan.materials.length > 0}><summary>Material ({plan.materials.length} Blockarten ändern sich)</summary>
        {plan.materials.length ? <div className="table-wrap"><table className="materials-table"><thead><tr><th>Block</th><th>vorher</th><th>nachher</th><th>Änderung</th></tr></thead>
          <tbody>{plan.materials.slice(0, 30).map(m => <tr key={m.id}><td><code>{bare(m.id)}</code></td><td>{formatNumber(m.before)}</td><td>{formatNumber(m.after)}</td><td>{signed(m.after - m.before)}</td></tr>)}</tbody></table></div>
          : <p className="muted">Materialmengen bleiben gleich.</p>}</details>
      <details open={plan.links.length > 0}><summary>Anschlüsse und Verbindungen ({plan.links.length})</summary>
        {plan.links.length ? <ul>{plan.links.map(l => <li key={l.linkId}>{l.label}: {l.before} → <strong>{l.after}</strong>{plan.removedLinkIds.includes(l.linkId) && ' (wird gelöst)'}</li>)}</ul>
          : <p className="muted">Alle Verbindungen bleiben gültig.</p>}</details>
      <details open={plan.steps.length > 0}><summary>Bauschritte und Abschnitte ({plan.steps.length})</summary>
        {plan.steps.length ? <><ul>{plan.steps.slice(0, 40).map(s => <li key={s.stepId}>{s.label}{s.section && ` · ${s.section}`}: {s.before === 'done' ? 'abgehakt' : 'prüfbedürftig'} → <strong>{s.after === 'entfällt' ? 'entfällt' : s.after === 'review' ? 'prüfbedürftig' : s.after}</strong></li>)}</ul>
          {plan.sections.length > 0 && <p className="muted">Betroffene Bauabschnitte: {plan.sections.join(', ')}</p>}</>
          : <p className="muted">Kein abgehakter Schritt ändert sich.</p>}</details>
      {(plan.exportBlockersBefore.length > 0 || plan.exportBlockersAfter.length > 0) && <details><summary>Export</summary>
        <p>Vorher: {plan.exportBlockersBefore.join('; ') || 'exportierbar'}</p><p>Nachher: {plan.exportBlockersAfter.join('; ') || 'exportierbar'}</p></details>}
    </div>

    <h4>Geometrie {one.instanceName}: {one.from.label} → {one.to.label}</h4>
    <DiffView a={a} b={b} labelA={one.from.label} labelB={one.to.label} cacheKey={`upd:${one.from.id}:${one.to.id}`} profileId={profileId} />

    <div className="button-row">
      <button type="button" className="primary" disabled={busy || stale} onClick={onApply}>{busy ? 'Wird übernommen …' : `Update übernehmen (${plan.instances.length})`}</button>
      <button type="button" onClick={onCancel}>Abbrechen</button>
    </div>
  </section>;
}
