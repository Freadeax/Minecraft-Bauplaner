import { useState } from 'react';
import { anchorFromScan, anchorOf, checkWorldPlacement, createPlacement, dimensionLabel, sameAnchor, worldOperation } from '../../../../../../packages/domain/src/index.js';
import type { Operation, Project } from '../../../../../../packages/domain/src/index.js';
import type { ScanMeta, Vec3 } from '../../../../../../packages/voxel/src/index.js';
import { errorText } from '../../../app/ui';

/**
 * Anker der Bauführung: the world position of project 0/0/0. It is the same
 * value as the world placement (MAP-01) and the bridge's `/bauplaner anker`,
 * so there is exactly one place where it is stored (`project.world`).
 */
export function AnchorBar({ project, scanMeta, execute }: { project: Project; scanMeta: ScanMeta | null; execute(op: Operation): string }) {
  const anchor = anchorOf(project);
  const fromScan = anchorFromScan(scanMeta);
  const [edit, setEdit] = useState<Vec3 | null>(null);
  const [message, setMessage] = useState('');
  const save = (origin: Vec3, dimension: string | null, label: string) => {
    try {
      const next = project.world ? checkWorldPlacement({ ...project.world, origin, ...(dimension && { dimension }) }) : createPlacement(origin, dimension ?? undefined);
      setMessage(execute(worldOperation(next, label)) || ''); setEdit(null);
    } catch (e) { setMessage(errorText(e)); }
  };
  const o = anchor.origin;
  return <section className="anchor-bar build-wide" aria-label="Anker">
    <div className="anchor-text">
      <span className="panel-kicker">ANKER · PROJEKT 0/0/0 IN DER WELT</span>
      {o ? <strong data-anchor={o.join(',')}>X {o[0]} · Y {o[1]} · Z {o[2]} <small>{dimensionLabel(anchor.dimension!)}</small></strong>
        : <strong>nicht gesetzt <small>Koordinaten gelten relativ zum Anker</small></strong>}
      <small className="muted">Derselbe Punkt wie <code>/bauplaner anker</code> in der Mod und die Weltlage auf der <a href={`#/karte?projekt=${encodeURIComponent(project.id)}`}>Weltkarte</a>. Norden = −Z, Osten = +X.</small>
    </div>
    {edit ? <form className="anchor-edit" onSubmit={e => { e.preventDefault(); save(edit, null, 'Anker gesetzt'); }}>
      {(['X', 'Y', 'Z'] as const).map((axis, i) => <label key={axis}>{axis}<input type="number" required value={edit[i]} onChange={e => {
        const v = [...edit] as [number, number, number]; v[i] = Math.trunc(Number(e.target.value) || 0); setEdit(v);
      }} /></label>)}
      <button className="primary" type="submit">Anker speichern</button>
      <button type="button" onClick={() => setEdit(null)}>Abbrechen</button>
    </form> : <div className="button-row">
      <button onClick={() => setEdit(o ? [...o] as Vec3 : [0, 64, 0])}>{o ? 'Anker ändern' : 'Anker setzen'}</button>
      {fromScan && !sameAnchor(anchor, fromScan) && <button className="primary" onClick={() => save(fromScan.origin!, fromScan.dimension, 'Anker aus Spielaufnahme übernommen')}>
        Anker aus Spielaufnahme übernehmen (X {fromScan.origin![0]} · Y {fromScan.origin![1]} · Z {fromScan.origin![2]})</button>}
    </div>}
    {message && <p className="notice warning" role="alert">{message}<button onClick={() => setMessage('')}>OK</button></p>}
  </section>;
}
