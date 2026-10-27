import { useMemo, useState } from 'react';
import { checkLinks, faceOf, findSnapCandidates, linkOperation, linkUsage, newInstance, snapOperation, unlinkedMates } from '../../../../../packages/domain/src/index.js';
import type { AssetVersion, Connector, SnapCandidate } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { errorText } from '../../app/ui';
import type { ProjectSession } from './session';

const FACE_DE = { west: 'West', east: 'Ost', north: 'Nord', south: 'Süd', up: 'oben', down: 'unten' } as const;
const face = (c: Connector) => { const f = faceOf(c.normal); return f ? FACE_DE[f] : '?'; };
const LIMIT = 8;

/** Anschlüsse, Snap-Vorschläge und gespeicherte Verbindungen im Editor (Block B5). */
export function SnapPanel({ session }: { session: ProjectSession }) {
  const { library } = useApp();
  const { project, selectedInstanceId } = session;
  const [mirror, setMirror] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [message, setMessage] = useState('');
  const versions = library.versions;
  const selected = project.instances.find(i => i.id === selectedInstanceId) ?? null;
  const selectedVersion = selected ? versions.get(selected.assetVersionId) ?? null : null;
  const name = (id: string) => project.instances.find(i => i.id === id)?.name ?? 'fehlt';

  const status = useMemo(() => checkLinks(project, versions), [project, versions]);
  const mates = useMemo(() => unlinkedMates(project, versions), [project, versions]);
  const usage = useMemo(() => linkUsage(project.links), [project.links]);
  const moveCandidates = useMemo(() => {
    if (!selected || !selectedVersion || !selectedVersion.connectors.length) return [];
    try { return findSnapCandidates({ project, versions, version: selectedVersion, instanceId: selected.id, allowMirror: mirror, limit: LIMIT }); }
    catch { return []; }
  }, [project, versions, selected, selectedVersion, mirror]);
  const attachable = library.assets.filter(a => !a.archived && (versions.get(a.versionIds.at(-1) ?? '')?.connectors.length ?? 0) > 0);
  const attachVersion: AssetVersion | null = versions.get(library.assets.find(a => a.id === assetId)?.versionIds.at(-1) ?? '') ?? null;
  const attachCandidates = useMemo(() => {
    if (!selected || !attachVersion) return [];
    try { return findSnapCandidates({ project, versions, version: attachVersion, targetInstanceIds: [selected.id], allowMirror: mirror, limit: LIMIT,
      reference: selected.transform.position }); }
    catch { return []; }
  }, [project, versions, selected, attachVersion, mirror]);

  const run = (build: () => Parameters<ProjectSession['execute']>[0]) => {
    try { const error = session.execute(build()); setMessage(error); } catch (e) { setMessage(errorText(e)); }
  };
  const label = (c: SnapCandidate) => `${c.connectorId} → ${name(c.target.instanceId)} · ${c.target.connectorId}`;
  const detail = (c: SnapCandidate) => `${c.transform.quarterTurns * 90}°${c.transform.mirrorX ? ' gespiegelt' : ''} · Pivot ${c.transform.position.join(' / ')}${c.pairs.length > 1 ? ` · ${c.pairs.length} Anschlüsse` : ''}`;
  const candidateList = (list: SnapCandidate[], onPick: (c: SnapCandidate) => void, aria: string) => list.length === 0
    ? <p className="muted">Keine passenden freien Anschlüsse (Typ und Profil gleich, Händigkeit passend).</p>
    : <ul className="snap-list" aria-label={aria}>{list.map(c => <li key={c.key}>
      <button onClick={() => onPick(c)} title={c.conflicts ? 'Andocken möglich, erzeugt aber Voxelkonflikte' : 'Andocken'}>
        <strong>{label(c)}</strong><span>{detail(c)}</span>
        {c.conflicts > 0 ? <em className="badge danger">{c.conflicts} Konflikte</em> : <em className="badge ok">konfliktfrei</em>}
      </button></li>)}</ul>;

  return <section className="snap-panel" aria-label="Anschlüsse und Snap">
    <span className="panel-kicker">ANSCHLÜSSE &amp; SNAP</span>
    {selected && selectedVersion && <>
      {selectedVersion.connectors.length === 0
        ? <p className="muted">Dieses Bauteil hat keine Anschlüsse. Lege sie in der Bibliothek an.</p>
        : <ul className="connector-list">{selectedVersion.connectors.map(c => {
          const used = usage.get(`${selected.id}\u0000${c.id}`) ?? 0;
          return <li key={c.id}><strong>{c.id}</strong> <span>{face(c)} · {c.type}/{c.profile}{c.handedness ? ` · ${c.handedness === 'left' ? 'links' : 'rechts'}` : ''}</span> <em className={used ? 'badge ok' : 'badge'}>{used}/{c.maxLinks ?? 1}</em></li>;
        })}</ul>}
      <label className="check"><input type="checkbox" checked={mirror} onChange={e => setMirror(e.target.checked)} /> Gespiegelte Lagen zulassen (Händigkeit wird geprüft)</label>
      {selectedVersion.connectors.length > 0 && <details open><summary>Instanz andocken</summary>
        {candidateList(moveCandidates, c => run(() => snapOperation(project, versions, c, { instanceId: selected.id })), 'Snap-Vorschläge')}</details>}
      {attachable.length > 0 && <details><summary>Bauteil an Anschluss anfügen</summary>
        <label>Bauteil<select value={assetId} onChange={e => setAssetId(e.target.value)} aria-label="Bauteil zum Anfügen">
          <option value="">– wählen –</option>{attachable.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        {attachVersion && candidateList(attachCandidates, c => {
          const asset = library.assets.find(a => a.id === attachVersion.assetId);
          const instance = newInstance({ assetVersionId: attachVersion.id, name: `${asset?.name ?? 'Bauteil'} ${project.instances.filter(i => i.assetVersionId === attachVersion.id).length + 1}` });
          run(() => snapOperation(project, versions, c, { newInstance: instance }));
          session.select(instance.id);
        }, 'Anfüge-Vorschläge')}</details>}
    </>}
    {!selected && <p className="muted">Instanz wählen, um passende Anschlüsse zu sehen.</p>}
    <span className="panel-kicker">VERBINDUNGEN ({project.links.length})</span>
    {status.length === 0 && <p className="muted">Noch keine gespeicherten Verbindungen.</p>}
    <ul className="link-list">{status.map(s => <li key={s.link.id} className={s.state === 'ok' ? '' : 'broken'}>
      <span>{name(s.link.a.instanceId)}·{s.link.a.connectorId} ↔ {name(s.link.b.instanceId)}·{s.link.b.connectorId}</span>
      <em className={s.state === 'ok' ? 'badge ok' : 'badge danger'}>{s.message}</em>
      <button onClick={() => run(() => ({ kind: 'link.remove', linkId: s.link.id }))} aria-label="Verbindung lösen">Lösen</button></li>)}</ul>
    {mates.length > 0 && <div className="button-row">
      <span className="muted">{mates.length} aufeinanderliegende Anschlüsse ohne Verbindung</span>
      <button onClick={() => run(() => {
        const first = mates[0]!; return linkOperation(project, versions, first.a, first.b);
      })}>Nächste verbinden</button></div>}
    {message && <p className="small-note" role="alert">{message}</p>}
  </section>;
}
