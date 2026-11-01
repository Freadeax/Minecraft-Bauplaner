import { useMemo, useState } from 'react';
import { compareSnapshot, createProject, deleteSnapshot, latestSnapshot, planSnapshotRestore, siteOperation, snapshotProjectContent, snapshotsOf } from '../../../../../packages/domain/src/index.js';
import type { Guide, GuideProgress, Operation, Project, SectionSnapshot, SitePlan, SnapshotComparison } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { navigate } from '../../app/router';
import { errorText, formatNumber } from '../../app/ui';
import '../../backup.css';

const when = (iso: string) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

/** Comparison of every snapshot with the current plan (pure, recomputed with the project). */
export function useSnapshotComparisons(site: SitePlan, project: Project, guide: Guide, progress: GuideProgress): SnapshotComparison[] {
  return useMemo(() => snapshotsOf(site).map(s => compareSnapshot(s, { site, project, guide, progress })), [site, project, guide, progress]);
}

/** Latest snapshot per section id, compared with the current plan. */
export function latestBySection(site: SitePlan, comparisons: readonly SnapshotComparison[]): Map<string, SnapshotComparison> {
  const out = new Map<string, SnapshotComparison>();
  for (const sec of site.sections) {
    const latest = latestSnapshot(site, sec.id);
    const c = latest && comparisons.find(x => x.snapshot.id === latest.id);
    if (c) out.set(sec.id, c);
  }
  return out;
}

export function SnapshotBadge({ comparison }: { comparison: SnapshotComparison | undefined }) {
  if (!comparison) return null;
  const n = comparison.changes.length;
  return <span className={`snap-badge ${n ? 'changed' : 'same'}`} data-snapshot-state={comparison.state}
    title={n ? comparison.changes.map(c => c.message).join('\n') : 'Geometrie und Bauteile wie im eingefrorenen Stand'}>
    ❄ Stand {comparison.snapshot.number} · {n ? `${n} Abweichung${n === 1 ? '' : 'en'}` : 'unverändert'}</span>;
}

/**
 * Abschnittsstände (BACKUP-02-S02): archive of all frozen section states,
 * also of removed sections, with comparison, previewed restore, a separate
 * project copy and explicit deletion. Every write is one undoable operation.
 */
export function SnapshotsPanel({ site, project, comparisons, execute }: {
  site: SitePlan; project: Project; comparisons: readonly SnapshotComparison[]; execute(op: Operation): string;
}) {
  const { repo, library } = useApp();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const run = (fn: () => string) => { try { setMessage(fn()); } catch (e) { setMessage(errorText(e)); } };
  const q = filter.trim().toLowerCase();
  const list = [...comparisons].sort((a, b) => b.snapshot.createdAt.localeCompare(a.snapshot.createdAt))
    .filter(c => !q || `${c.snapshot.section.name} ${c.snapshot.label} stand ${c.snapshot.number}`.toLowerCase().includes(q));
  if (!comparisons.length) return <section className="site-block" aria-label="Abschnittsstände">
    <div className="site-head"><h3>Abschnittsstände <small>eingefrorene Stände zum Wiederfinden und Vergleichen</small></h3></div>
    <p className="muted">Noch kein Stand eingefroren. Über „❄ Einfrieren“ an einem Bauabschnitt hältst du Bauteile, Versionen, Platzierungen und Bauschritte reproduzierbar fest.</p>
  </section>;

  const copyAsProject = async (s: SectionSnapshot) => {
    try {
      const content = snapshotProjectContent(s);
      const base = createProject({ name: `${project.name} – ${s.section.name} Stand ${s.number}`.slice(0, 120), description: `Kopie des Abschnittsstands ${s.number} („${s.label || s.section.name}“) vom ${when(s.createdAt)} aus „${project.name}“.`, profileId: project.profileId });
      const copy: Project = { ...base, instances: content.instances, links: content.links, site: content.site, progress: content.progress };
      await repo.saveProject(copy, 0);
      navigate({ view: 'project', projectId: copy.id, tab: 'baustelle' });
    } catch (e) { setMessage(`Kopie nicht angelegt: ${errorText(e)}`); }
  };

  return <section className="site-block" aria-label="Abschnittsstände">
    <div className="site-head">
      <h3>Abschnittsstände <small>{comparisons.length} eingefroren · {comparisons.filter(c => c.state !== 'same').length} weichen ab</small></h3>
      <input className="snap-filter" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Stand suchen (Abschnitt, Bezeichnung)" aria-label="Abschnittsstände durchsuchen" />
    </div>
    {message && <div className="notice" role="status">{message}<button onClick={() => setMessage('')}>OK</button></div>}
    <ol className="snap-list">{list.map(c => {
      const s = c.snapshot, plan = restoring === s.id ? planSnapshotRestore(s, site, project, library.versions) : null;
      return <li key={s.id} className={`snap-item${c.state === 'changed' ? ' changed' : c.state === 'section-removed' ? ' removed changed' : ''}`} data-snapshot={s.id}>
        <header><strong>{s.section.name} · Stand {s.number}</strong>{s.label && <span>„{s.label}“</span>}<small>eingefroren {when(s.createdAt)}</small>
          <span className={`snap-badge ${c.changes.length ? 'changed' : 'same'}`}>{c.state === 'section-removed' ? 'Abschnitt entfernt' : c.changes.length ? `${c.changes.length} Abweichung${c.changes.length === 1 ? '' : 'en'}` : 'unverändert'}</span></header>
        <small>{s.instances.length} Bauteil{s.instances.length === 1 ? '' : 'e'} · {s.totals.steps} Schritte · {formatNumber(s.totals.blocks)} Blöcke · damals {s.totals.done} abgehakt
          {c.state !== 'section-removed' && `, jetzt ${c.progress.doneNow}${c.progress.reviewNow ? ` (+${c.progress.reviewNow} prüfbedürftig)` : ''}`} · Fingerabdruck {s.fingerprint}</small>
        {(c.changes.length > 0 || c.cosmetic.length > 0) && <ul>{[...c.changes, ...c.cosmetic].map((x, i) => <li key={i}>{x.message}</li>)}</ul>}
        <div className="button-row">
          <button onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>Inhalt</button>
          {(c.state !== 'same' || c.cosmetic.length > 0) && <button onClick={() => setRestoring(restoring === s.id ? null : s.id)} aria-expanded={restoring === s.id}>Auf diesen Stand zurücksetzen …</button>}
          <button onClick={() => void copyAsProject(s)}>Als eigenes Projekt öffnen</button>
          <button onClick={() => { if (window.confirm(`Stand ${s.number} von „${s.section.name}“ löschen? (rückgängig machbar)`)) run(() => execute(siteOperation(deleteSnapshot(site, s.id), `Stand ${s.number} von „${s.section.name}“ gelöscht`))); }}>Löschen</button>
        </div>
        {open === s.id && <ul className="muted">{s.instances.map(i => <li key={i.id}>{i.name} · Version <code>{i.assetVersionId}</code> · Position {i.transform.position.join('/')} · {i.transform.quarterTurns * 90}°{i.transform.mirrorX ? ' · gespiegelt' : ''}
          {(() => { const m = s.section.members.find(x => x.instanceId === i.id); return m && (m.fromLayer !== undefined || m.toLayer !== undefined) ? ` · Schichten ${m.fromLayer ?? 0}–${m.toLayer ?? 'oben'}` : ''; })()}</li>)}</ul>}
        {plan && <div className="snap-restore" role="group" aria-label="Zurücksetzen prüfen">
          <strong>Vorschau – noch nichts geändert</strong>
          {plan.blocked.length > 0 && <div className="notice warning" role="alert"><ul>{plan.blocked.map(b => <li key={b}>{b}</li>)}</ul></div>}
          {plan.actions.length ? <ul>{plan.actions.map((a, i) => <li key={i}>{a}</li>)}</ul> : <p className="muted">Nichts zurückzusetzen.</p>}
          {plan.warnings.length > 0 && <ul className="muted">{plan.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
          <div className="button-row"><button className="primary" disabled={!plan.operation} onClick={() => { const op = plan.operation; if (op) { run(() => execute(op)); setRestoring(null); } }}>Zurücksetzen (rückgängig machbar)</button>
            <button onClick={() => setRestoring(null)}>Abbrechen</button></div>
        </div>}
      </li>;
    })}</ol>
    {!list.length && <p className="muted">Kein Stand passt zur Suche.</p>}
  </section>;
}
