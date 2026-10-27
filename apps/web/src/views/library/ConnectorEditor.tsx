import { useEffect, useMemo, useState } from 'react';
import { addAssetVersion, anchorCells, canonicalJson, FACES, faceOf, suggestConnector, validateConnectors } from '../../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, Connector, FaceName } from '../../../../../packages/domain/src/index.js';
import type { Cell, Vec3 } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { errorText } from '../../app/ui';

export type Highlight = ((cell: Cell) => 'hit' | 'dim' | null) | null;

const FACE_DE: Record<FaceName, string> = { west: 'West (−X)', east: 'Ost (+X)', north: 'Nord (−Z)', south: 'Süd (+Z)', up: 'Oben (+Y)', down: 'Unten (−Y)' };
const faces = Object.keys(FACES) as FaceName[];
const ups = (f: FaceName): FaceName[] => faces.filter(u => FACES[u].findIndex(n => n !== 0) !== FACES[f].findIndex(n => n !== 0));

/**
 * Anschluss-Editor (Block B5): edits the connectors of an asset's latest version
 * and stores them as a new immutable version. Placed projects keep their version.
 */
export function ConnectorEditor({ asset, version, onHighlight, onSaved }: {
  asset: Asset; version: AssetVersion; onHighlight: (h: Highlight) => void; onSaved: (message: string) => void;
}) {
  const { repo, reloadLibrary } = useApp();
  const [draft, setDraft] = useState<Connector[]>(() => structuredClone([...version.connectors]));
  const [newFace, setNewFace] = useState<FaceName>('east');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const issues = useMemo(() => validateConnectors(version.payload, draft), [version.payload, draft]);
  const errors = issues.filter(i => i.severity === 'error');
  const changed = canonicalJson(draft) !== canonicalJson(version.connectors);

  useEffect(() => {
    const keys = new Set(draft.flatMap(c => anchorCells(c).map(p => p.join(','))));
    onHighlight(keys.size ? (cell: Cell) => keys.has(cell.position.join(',')) ? 'hit' : 'dim' : null);
  }, [draft, onHighlight]);
  useEffect(() => () => onHighlight(null), [onHighlight]);

  const update = (index: number, patch: Partial<Connector>) => setDraft(d => d.map((c, i) => i === index ? { ...c, ...patch } : c));
  const setCoord = (index: number, axis: number, raw: string) => {
    const n = Number(raw);
    if (!Number.isSafeInteger(n)) return;
    const position = [...draft[index]!.position] as [number, number, number]; position[axis] = n;
    update(index, { position });
  };
  const add = () => {
    const base = draft[0] ?? { type: 'verbindung', profile: 'standard' };
    let n = 1; while (draft.some(c => c.id === `${newFace}${n > 1 ? n : ''}`)) n++;
    setDraft(d => [...d, suggestConnector(version.payload, newFace, { id: `${newFace}${n > 1 ? n : ''}`, type: base.type, profile: base.profile })]);
  };
  const save = async () => {
    setBusy(true); setError('');
    try {
      const label = `${asset.versionIds.length + 1}.0`;
      const r = await addAssetVersion(asset, { payload: version.payload, label, connectors: draft, source: version.source });
      await repo.saveVersion(r.version); await repo.saveAsset(r.asset); await reloadLibrary();
      onSaved(`Anschlüsse als Version ${label} von „${asset.name}“ gespeichert. Bestehende Projekte behalten ihre Version.`);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  if (asset.demo) return <section className="connector-editor" aria-label="Anschluss-Editor">
    <span className="panel-kicker">ANSCHLÜSSE</span>
    <ul className="connector-list">{version.connectors.map(c => <li key={c.id}><strong>{c.id}</strong> <span>{FACE_DE[faceOf(c.normal) ?? 'east']} · {c.type}/{c.profile}{c.handedness ? ` · ${c.handedness === 'left' ? 'links' : 'rechts'}` : ''} · {c.position.join(' / ')}</span></li>)}</ul>
    <p className="small-note">Beispielbauteile sind schreibgeschützt. Eigene Bauteile erhalten hier bearbeitbare Anschlüsse.</p>
  </section>;

  return <section className="connector-editor" aria-label="Anschluss-Editor">
    <span className="panel-kicker">ANSCHLÜSSE BEARBEITEN</span>
    <p className="small-note">Punkt auf einer Außenfläche (Zellgrenze), Normale zeigt nach außen. Nur gleicher Typ und gleiches Profil verbinden sich. Unsymmetrische Profile (z. B. Wehrgang auf einer Seite) bekommen eine Händigkeit, von außen gesehen: links passt nur an rechts, Spiegeln tauscht sie. Gelb markiert: Blöcke am Anschlusspunkt.</p>
    {draft.map((c, i) => {
      const f = faceOf(c.normal) ?? 'east', u = faceOf(c.up) ?? 'up';
      const own = issues.filter(x => x.connectorId === c.id);
      return <fieldset key={i} className="connector-row">
        <legend>Anschluss {i + 1}</legend>
        <label>ID<input value={c.id} maxLength={60} onChange={e => update(i, { id: e.target.value })} aria-label={`Anschluss ${i + 1} ID`} /></label>
        <label>Fläche<select value={f} aria-label={`Anschluss ${i + 1} Fläche`} onChange={e => {
          const next = e.target.value as FaceName, s = suggestConnector(version.payload, next, c);
          update(i, { normal: s.normal, position: s.position, up: ups(next).includes(u) ? c.up : s.up });
        }}>{faces.map(x => <option key={x} value={x}>{FACE_DE[x]}</option>)}</select></label>
        <div className="coord-row three">{(['X', 'Y', 'Z'] as const).map((l, axis) => <label key={l}>{l}
          <input key={`${i}-${axis}-${c.position[axis]}`} inputMode="numeric" defaultValue={c.position[axis]} aria-label={`Anschluss ${i + 1} ${l}`}
            onBlur={e => setCoord(i, axis, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /></label>)}</div>
        <label>Up<select value={u} onChange={e => update(i, { up: FACES[e.target.value as FaceName] as Vec3 })} aria-label={`Anschluss ${i + 1} Up`}>
          {ups(f).map(x => <option key={x} value={x}>{FACE_DE[x]}</option>)}</select></label>
        <label>Typ<input value={c.type} maxLength={60} onChange={e => update(i, { type: e.target.value })} aria-label={`Anschluss ${i + 1} Typ`} /></label>
        <label>Profil<input value={c.profile} maxLength={60} onChange={e => update(i, { profile: e.target.value })} aria-label={`Anschluss ${i + 1} Profil`} /></label>
        <label>Max. Verbindungen<input inputMode="numeric" value={c.maxLinks ?? 1} aria-label={`Anschluss ${i + 1} Max. Verbindungen`}
          onChange={e => { const n = Number(e.target.value); if (Number.isSafeInteger(n) && n >= 1) { const { maxLinks: _drop, ...rest } = c; setDraft(d => d.map((x, k) => k === i ? (n === 1 ? rest : { ...rest, maxLinks: n }) : x)); } }} /></label>
        <label>Händigkeit<select value={c.handedness ?? ''} aria-label={`Anschluss ${i + 1} Händigkeit`} onChange={e => {
          const { handedness: _drop, ...rest } = c, v = e.target.value;
          setDraft(d => d.map((x, k) => k === i ? (v === 'left' || v === 'right' ? { ...rest, handedness: v } : rest) : x));
        }}><option value="">symmetrisch</option><option value="left">links</option><option value="right">rechts</option></select></label>
        {own.map((x, k) => <p key={k} className={x.severity === 'error' ? 'field-error' : 'small-note'}>{x.message}</p>)}
        <button type="button" className="danger" onClick={() => setDraft(d => d.filter((_, k) => k !== i))}>Entfernen</button>
      </fieldset>;
    })}
    {issues.filter(x => !x.connectorId).map((x, k) => <p key={k} className="field-error">{x.message}</p>)}
    <div className="button-row">
      <select value={newFace} onChange={e => setNewFace(e.target.value as FaceName)} aria-label="Fläche für neuen Anschluss">{faces.map(x => <option key={x} value={x}>{FACE_DE[x]}</option>)}</select>
      <button type="button" onClick={add}>＋ Anschluss</button>
    </div>
    <div className="button-row">
      <button type="button" className="primary" disabled={busy || !changed || errors.length > 0} onClick={() => void save()}>Als neue Version speichern</button>
      {changed && <button type="button" onClick={() => setDraft(structuredClone([...version.connectors]))}>Verwerfen</button>}
    </div>
    {errors.length > 0 && <p className="field-error" role="alert">{errors.length} Fehler – Speichern gesperrt.</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </section>;
}
