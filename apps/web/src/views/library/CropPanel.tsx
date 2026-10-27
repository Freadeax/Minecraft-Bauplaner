import { useEffect, useMemo, useState } from 'react';
import { addAssetVersion, createAsset, cropPayload } from '../../../../../packages/domain/src/index.js';
import type { AssetVersionSource, Provenance } from '../../../../../packages/domain/src/index.js';
import { countBlocks } from '../../../../../packages/voxel/src/index.js';
import type { Cell, VoxelPayload } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { errorText, formatNumber } from '../../app/ui';
import type { Highlight } from './ConnectorEditor';

type Box = [[number, number, number], [number, number, number]];

/**
 * Bereich als Bauteil (Block B5): selects an inclusive integer box of the shown
 * payload and stores it as a new asset. The source payload stays unchanged;
 * the crop keeps its source offset and the parent's provenance.
 */
export function CropPanel({ payload, name, provenance, getSource, onHighlight, onSaved }: {
  payload: VoxelPayload; name: string; provenance: Provenance; getSource: () => Promise<AssetVersionSource>;
  onHighlight: (h: Highlight) => void; onSaved: (message: string, assetId: string) => void;
}) {
  const { repo, reloadLibrary } = useApp();
  const full: Box = [[...payload.bounds.min] as Box[0], payload.bounds.maxExclusive.map(n => n - 1) as Box[1]];
  const [box, setBox] = useState<Box>(full);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const region = useMemo(() => ({ min: box[0], maxExclusive: box[1].map(n => n + 1) as Box[1] }), [box]);
  const preview = useMemo(() => {
    try { const p = cropPayload(payload, region); return { payload: p, error: '' }; }
    catch (e) { return { payload: null, error: errorText(e) }; }
  }, [payload, region]);

  useEffect(() => {
    if (!open) { onHighlight(null); return; }
    const inside = (c: Cell) => c.position.every((n, i) => n >= region.min[i]! && n < region.maxExclusive[i]!);
    onHighlight((c: Cell) => inside(c) ? null : 'dim');
  }, [open, region, onHighlight]);
  useEffect(() => () => onHighlight(null), [onHighlight]);

  const set = (corner: 0 | 1, axis: number, raw: string) => {
    const n = Number(raw);
    if (!Number.isSafeInteger(n)) return;
    setBox(b => { const next = structuredClone(b) as Box; next[corner][axis] = n; return next; });
  };
  const save = async (form: FormData) => {
    if (!preview.payload) return;
    setBusy(true); setError('');
    try {
      const parent = await getSource();
      const asset = createAsset({ name: String(form.get('cropName')), tags: String(form.get('cropTags') ?? '').split(',').map(t => t.trim()).filter(Boolean),
        description: `Ausschnitt aus „${name}“, Bereich ${box[0].join('/')} bis ${box[1].join('/')} (einschließlich).`, provenance });
      const source: AssetVersionSource = { ...parent, format: 'crop' };
      const r = await addAssetVersion(asset, { payload: preview.payload, label: '1.0', source });
      await repo.saveVersion(r.version); await repo.saveAsset(r.asset); await reloadLibrary();
      onSaved(`Bereich als neues Bauteil „${r.asset.name}“ gespeichert. Anschlüsse jetzt im Anschluss-Editor festlegen.`, r.asset.id);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return <details className="crop-panel" open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
    <summary>Bereich als Bauteil speichern</summary>
    <form onSubmit={e => { e.preventDefault(); void save(new FormData(e.currentTarget)); }}>
      <p className="small-note">Grenzen einschließlich, in Koordinaten der Vorschau. Außerhalb liegende Zellen sind abgedunkelt.</p>
      {(['von', 'bis'] as const).map((l, corner) => <div className="coord-row three" key={l}>{(['X', 'Y', 'Z'] as const).map((a, axis) => <label key={a}>{a} {l}
        <input key={`${corner}-${axis}-${box[corner as 0 | 1][axis]!}`} inputMode="numeric" defaultValue={box[corner as 0 | 1][axis]!} aria-label={`${a} ${l}`}
          onBlur={e => set(corner as 0 | 1, axis, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} /></label>)}</div>)}
      {preview.payload ? <p className="muted">{preview.payload.bounds.maxExclusive.join(' × ')} · {formatNumber(countBlocks(preview.payload).blocks)} Blöcke im Bereich</p>
        : <p className="field-error" role="alert">{preview.error}</p>}
      <label>Bezeichnung<input name="cropName" required maxLength={120} defaultValue={`${name} Ausschnitt`} /></label>
      <label>Schlagworte (Komma-getrennt)<input name="cropTags" /></label>
      <p className="small-note">Herkunft wird übernommen: {provenance.author || 'ohne Autor'} · {provenance.source || '–'} · {provenance.license || 'ungeklärt'}</p>
      <button className="primary" type="submit" disabled={busy || !preview.payload}>Ausschnitt speichern</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  </details>;
}
