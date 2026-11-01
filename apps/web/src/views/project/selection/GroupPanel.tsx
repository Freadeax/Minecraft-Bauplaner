import { useCallback, useEffect, useMemo, useState } from 'react';
import { groupOperation, positionKey, reservationsFor, siteOf } from '../../../../../../packages/domain/src/index.js';
import type { GroupAction, Reservation, Resolution } from '../../../../../../packages/domain/src/index.js';
import type { Bounds, Vec3 } from '../../../../../../packages/voxel/src/index.js';
import { useApp } from '../../../app/context';
import { errorText, formatNumber } from '../../../app/ui';
import type { ProjectSession } from '../session';

/**
 * Mehrfachauswahl (EDIT-01): a group of instances chosen in the instance list
 * (Strg/Shift-Klick or the checkboxes). The group has a visible hull, its
 * connector free-space zones and conflicts are listed, and every group action
 * is one atomic, undoable batch (domain `groupOperation`).
 */
export interface Group {
  readonly ids: readonly string[];
  has(id: string): boolean;
  toggle(id: string): void;
  set(ids: readonly string[]): void;
  clear(): void;
}

export function useGroup(session: ProjectSession): Group {
  const [ids, setIds] = useState<readonly string[]>([]);
  const present = session.project.instances;
  // Members that no longer exist (removed, undo) leave the group.
  useEffect(() => { setIds(list => { const next = list.filter(id => present.some(i => i.id === id)); return next.length === list.length ? list : next; }); }, [present]);
  const toggle = useCallback((id: string) => setIds(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]), []);
  return useMemo(() => ({ ids, has: (id: string) => ids.includes(id), toggle, set: setIds, clear: () => setIds([]) }), [ids, toggle]);
}

/** World bounds of the group members (union of placed payload bounds). */
export function groupHull(resolution: Resolution | null, ids: readonly string[]): Bounds | null {
  let min: number[] | null = null, max: number[] | null = null;
  for (const p of resolution?.placed ?? []) {
    if (!ids.includes(p.instance.id)) continue;
    const b = p.payload.bounds;
    min = min ? min.map((n, i) => Math.min(n, b.min[i]!)) : [...b.min];
    max = max ? max.map((n, i) => Math.max(n, b.maxExclusive[i]!)) : [...b.maxExclusive];
  }
  return min && max ? { min: min as unknown as Vec3, maxExclusive: max as unknown as Vec3 } : null;
}

/** Cells of the group (for highlighting) and blocked free-space cells of its connectors. */
export function useGroupCells(resolution: Resolution | null, ids: readonly string[], reservations: readonly Reservation[]): { members: ReadonlySet<string>; blocked: ReadonlySet<string> } {
  return useMemo(() => {
    const members = new Set<string>(), blocked = new Set<string>();
    if (resolution && ids.length) for (const [key, owners] of resolution.owners) if (owners.some(o => ids.includes(o))) members.add(key);
    for (const r of reservations) for (const b of r.blockedBy) blocked.add(positionKey(b.position));
    return { members, blocked };
  }, [resolution, ids, reservations]);
}

export function useGroupReservations(session: ProjectSession, resolution: Resolution | null, ids: readonly string[]): Reservation[] {
  const { library } = useApp();
  const { project } = session;
  return useMemo(() => {
    if (!resolution || !ids.length) return [];
    try { return reservationsFor(project, library.versions, siteOf(project), resolution).filter(r => ids.includes(r.instanceId)); } catch { return []; }
  }, [project, library.versions, resolution, ids]);
}

const RES_LABEL: Readonly<Record<string, string>> = { free: 'frei', blocked: 'verbaut', docked: 'angedockt', linked: 'verbunden', off: 'aus' };

export function GroupPanel({ session, resolution, group, reservations }: { session: ProjectSession; resolution: Resolution | null; group: Group; reservations: readonly Reservation[] }) {
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const { project } = session;
  const hull = groupHull(resolution, group.ids);
  // Without a group the panel stays out of the inspector (the checkboxes carry the hint as tooltip).
  if (!group.ids.length) return null;
  const conflicts = resolution?.conflicts.filter(c => c.instanceIds.some(id => group.has(id))).length ?? 0;
  const centre: Vec3 = hull ? [Math.floor((hull.min[0] + hull.maxExclusive[0]) / 2), hull.min[1], Math.floor((hull.min[2] + hull.maxExclusive[2]) / 2)] : [0, 0, 0];
  const width = hull ? hull.maxExclusive[0] - hull.min[0] : 1;
  const act = (action: GroupAction) => {
    try {
      const err = session.execute(groupOperation(project, group.ids, action, centre));
      setMessage(err);
      if (!err && action.kind === 'remove') group.clear();
    } catch (e) { setMessage(errorText(e)); }
  };
  const move = (d: Vec3) => act({ kind: 'move', delta: [d[0] * step, d[1] * step, d[2] * step] });
  const allOverride = group.ids.every(id => project.instances.find(i => i.id === id)?.override);
  const blocked = reservations.filter(r => r.state === 'blocked');

  return <section className="group-panel" aria-label="Gruppe">
    <span className="panel-kicker">GRUPPE · {group.ids.length} INSTANZEN</span>
    <p className="muted">{group.ids.map(id => project.instances.find(i => i.id === id)?.name ?? id).join(', ')}</p>
    {hull && <p className="muted">Hülle X {hull.min[0]}…{hull.maxExclusive[0] - 1} · Y {hull.min[1]}…{hull.maxExclusive[1] - 1} · Z {hull.min[2]}…{hull.maxExclusive[2] - 1}
      {conflicts > 0 ? <> · <em className="badge danger">{conflicts} Konflikte</em></> : ' · konfliktfrei'}</p>}
    <div className="group-move" role="group" aria-label="Gruppe verschieben">
      <label>Schritt<input type="number" min={1} max={256} value={step} onChange={e => setStep(Math.max(1, Math.min(256, Math.trunc(Number(e.target.value)) || 1)))} aria-label="Schrittweite in Blöcken" /></label>
      {([['X−', [-1, 0, 0]], ['X+', [1, 0, 0]], ['Y−', [0, -1, 0]], ['Y+', [0, 1, 0]], ['Z−', [0, 0, -1]], ['Z+', [0, 0, 1]]] as const).map(([l, d]) =>
        <button key={l} onClick={() => move(d)} aria-label={`Gruppe ${l}`}>{l}</button>)}
    </div>
    <div className="button-row">
      <button onClick={() => act({ kind: 'rotate', turns: 3 })} title="Gruppe als Ganzes um ihre Mitte drehen">↺ 90°</button>
      <button onClick={() => act({ kind: 'rotate', turns: 1 })} title="Gruppe als Ganzes um ihre Mitte drehen">↻ 90°</button>
      <button onClick={() => act({ kind: 'mirror' })}>⇋ Spiegeln</button>
      <button onClick={() => act({ kind: 'duplicate', delta: [width + 1, 0, 0] })}>⧉ Duplizieren</button>
      <button aria-pressed={allOverride} onClick={() => act({ kind: 'override', value: !allOverride })}>Vorrang {allOverride ? 'aus' : 'an'}</button>
      <button className="danger" onClick={() => act({ kind: 'remove' })}>✕ Entfernen</button>
      <button onClick={group.clear}>Auswahl aufheben</button>
    </div>
    {reservations.length > 0 && <details open={blocked.length > 0}><summary>Freiraum an Anschlüssen: {reservations.length} Zonen{blocked.length ? `, ${blocked.length} verbaut` : ''}</summary>
      <ul className="group-reservations">{reservations.map(r => <li key={r.key}><b>{r.instanceName}</b> · {r.connector.id}: {RES_LABEL[r.state] ?? r.state}
        {r.state === 'blocked' && ` (${formatNumber(r.blockedBy.length)} Blöcke im Weg, rot markiert)`}</li>)}</ul></details>}
    {message && <p className="notice warning" role="alert">{message}</p>}
    <p className="muted small">Jede Gruppenaktion ist ein Rückgängig-Schritt und gilt für alle oder keine Instanz.</p>
  </section>;
}
