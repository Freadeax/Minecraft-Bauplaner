import { useEffect, useMemo, useState } from 'react';
import { changedCells, columnBuffers, diffAsPayload, diffPayloads, hydratePayload } from '../../../../packages/voxel/src/index.js';
import type { Cell, DiffKind, PayloadDiff, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { backgroundFrom, isAbort, pause, runJob, workersAvailable } from '../jobs/client';
import { JobStatus } from '../jobs/JobStatus';
import type { JobProgress } from '../jobs/protocol';
import { transportInSlices } from '../jobs/transport';
import { DIFF_KINDS } from '../jobs/diffJob';
import { formatNumber } from '../app/ui';
import { stateColor } from '../colors';
import { Viewer } from '../Viewer';
import type { Mark } from '../viewer/types';
import { Thumb } from '../thumbnail/Thumb';
import { LayerSheet } from './LayerSheet';

/**
 * Unterschiede zweier Bauversionen (B12): counts per change kind, the union
 * of both structures with coloured changes in 3D, as image or per layer, and
 * the block delta by id. Both structures are aligned at their minimum corner; a
 * shift of the whole of B is detected and shown on its own (DIFF-01), block entity
 * changes (chest items, sign text …) count as „anderer Inhalt“, and state changes
 * that only follow from neighbours (connections, stair corners) are named as such.
 */
const SAME_MARK: Mark = { color: '#16303c', amount: 0.62 };
export const DIFF_COLOR: Readonly<Record<Exclude<DiffKind, 'same'>, string>> = { added: '#4fd18b', removed: '#ff6b6b', material: '#ffb347', state: '#6fb3ff', content: '#c58bff' };
export const DIFF_LABEL: Readonly<Record<DiffKind, string>> = { same: 'unverändert', added: 'hinzugefügt', removed: 'entfernt', material: 'anderes Material', state: 'nur Ausrichtung/Zustand', content: 'anderer Inhalt' };
const KINDS: readonly DiffKind[] = ['added', 'removed', 'material', 'state', 'content', 'same'];
const vec = (v: readonly number[]) => v.map(n => (n > 0 ? '+' : '') + n).join(' / ');
const bare = (id: string) => id.replace(/^minecraft:/, '');

type Union = { readonly payload: VoxelPayload; readonly kinds: readonly DiffKind[] };
type Computed = { readonly diff: Omit<PayloadDiff, 'cells'>; readonly union: Union };
/** From this many cells (both sides) the comparison runs in the background worker (PERF-04). */
const BACKGROUND_DIFF_CELLS = 120_000;

/** Diff and coloured union; large structures are compared in the background, small ones right here. */
function useDiff(a: VoxelPayload, b: VoxelPayload, profileId: string, align: 'auto' | 'fixed'): { computed: Computed | null; progress: JobProgress | null; error: string } {
  const background = workersAvailable() && a.cells.length + b.cells.length >= backgroundFrom(BACKGROUND_DIFF_CELLS);
  const direct = useMemo(() => {
    if (background) return null;
    const diff = diffPayloads(a, b, { align });
    return { diff, union: diffAsPayload(diff, profileId) };
  }, [a, b, profileId, background, align]);
  const [state, setState] = useState<{ key: readonly unknown[]; computed: Computed | null; progress: JobProgress | null; error: string }>({ key: [], computed: null, progress: null, error: '' });
  useEffect(() => {
    if (!background) return;
    const key = [a, b, profileId, align], controller = new AbortController();
    setState({ key, computed: null, progress: { step: 'Stände vorbereiten', fraction: 0 }, error: '' });
    void (async () => {
      try {
        const [ta, tb] = [await transportInSlices(a, controller.signal), await transportInSlices(b, controller.signal)];
        const out = await runJob('diff', { a: ta, b: tb, profileId, align }, {
          signal: controller.signal, transfer: [...columnBuffers(ta.columns), ...columnBuffers(tb.columns)],
          onProgress: p => { if (!controller.signal.aborted) setState(s => ({ ...s, progress: { step: p.step, fraction: p.fraction === null ? null : p.fraction * 0.9 } })); },
        });
        const payload = await hydratePayload(out.union, { pause, signal: controller.signal, onProgress: f => setState(s => ({ ...s, progress: { step: 'Ansicht übernehmen', fraction: 0.9 + f * 0.1 } })) });
        const kinds = Array.from(out.kinds, k => DIFF_KINDS[k] ?? 'same');
        if (!controller.signal.aborted) setState({ key, computed: { diff: out.summary, union: { payload, kinds } }, progress: null, error: '' });
      } catch (e) {
        if (!controller.signal.aborted && !isAbort(e)) setState({ key, computed: null, progress: null, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => controller.abort();
  }, [a, b, profileId, background, align]);
  if (direct) return { computed: direct, progress: null, error: '' };
  const current = state.key[0] === a && state.key[1] === b && state.key[2] === profileId && state.key[3] === align;
  return current ? state : { computed: null, progress: { step: 'Stände vorbereiten', fraction: 0 }, error: '' };
}

export function DiffView(props: {
  a: VoxelPayload; b: VoxelPayload; labelA: string; labelB: string; cacheKey: string; profileId: string;
}) {
  const [align, setAlign] = useState<'auto' | 'fixed'>('auto');
  const { computed, progress, error } = useDiff(props.a, props.b, props.profileId, align);
  if (error) return <div className="notice warning" role="alert"><strong>Vergleich nicht möglich.</strong><p>{error}</p></div>;
  if (!computed) return <div className="diff-view" aria-busy="true"><JobStatus title="Unterschiede werden im Hintergrund berechnet" progress={progress} /></div>;
  return <DiffBody {...props} diff={computed.diff} union={computed.union} align={align} setAlign={setAlign} />;
}

function DiffBody({ a, b, labelA, labelB, cacheKey: baseKey, diff, union, align, setAlign }: {
  a: VoxelPayload; b: VoxelPayload; labelA: string; labelB: string; cacheKey: string; diff: Omit<PayloadDiff, 'cells'>; union: Union;
  align: 'auto' | 'fixed'; setAlign: (a: 'auto' | 'fixed') => void;
}) {
  const cacheKey = align === 'fixed' ? `${baseKey}:fest` : diff.shift.applied ? `${baseKey}:v${diff.shift.offset.join('_')}` : baseKey;
  const [mode, setMode] = useState<'3d' | 'bild' | 'ebenen'>('bild');
  const [hideSame, setHideSame] = useState(false);
  const [allRows, setAllRows] = useState(false);
  // Only needed for the 3D view; keyed by the cell objects (no string per cell).
  const kindAt = useMemo(() => mode === '3d' ? new Map(union.payload.cells.map((c, i) => [c, union.kinds[i]!])) : null, [union, mode]);
  const markOfKind = (kind: DiffKind): Mark | false => kind === 'same' ? (hideSame ? false : SAME_MARK) : { color: DIFF_COLOR[kind], amount: 0.7 };
  const markOfIndex = (i: number) => markOfKind(union.kinds[i]!);
  const cells3d = useMemo(() => hideSame ? union.payload.cells.filter((_, i) => union.kinds[i] !== 'same') : union.payload.cells, [union, hideSame]);
  const markFor = useMemo(() => (cell: Cell): Mark | null => {
    const kind = kindAt?.get(cell) ?? 'same';
    return kind === 'same' ? SAME_MARK : { color: DIFF_COLOR[kind], amount: 0.7 };
  }, [kindAt]);
  const noSelect = useMemo(() => () => {}, []);
  const changed = changedCells(diff);
  const { shift, followUps } = diff;
  const contentKinds = Object.entries(followUps.content);
  const rows = allRows ? diff.blocks : diff.blocks.slice(0, 10);

  return <div className="diff-view" aria-label={`Unterschiede ${labelA} → ${labelB}`}>
    <dl className="diff-stats">
      {KINDS.map(k => <div key={k} className={`diff-${k}`}><dt><i aria-hidden="true" style={{ background: k === 'same' ? '#5b6b75' : DIFF_COLOR[k] }} />{DIFF_LABEL[k]}</dt><dd>{formatNumber(diff.counts[k])}</dd></div>)}
    </dl>
    <p className="small-note">{labelA}: {formatNumber(diff.blocksBefore)} Blöcke → {labelB}: {formatNumber(diff.blocksAfter)} Blöcke ({diff.blocksAfter - diff.blocksBefore >= 0 ? '+' : ''}{formatNumber(diff.blocksAfter - diff.blocksBefore)}).
      {changed === 0 ? ' Beide Stände sind blockgenau gleich.' : ` ${formatNumber(changed)} Zellen unterscheiden sich.`} {shift.applied ? ` Verglichen nach der Verschiebung von ${labelB}.` : ' Ausgerichtet an der unteren Ecke beider Bauwerke.'}</p>
    {shift.applied && <div className="notice diff-shift" role="status" data-testid="diff-shift">
      <p><strong>{shift.pure ? `${labelB} ist nur verschoben` : `${labelB} ist verschoben`}</strong> – um {vec(shift.offset)} Blöcke (X / Y / Z) gegenüber {labelA}.
        {shift.pure ? ' Sonst ist alles blockgenau gleich.' : ` Danach unterscheiden sich ${formatNumber(changed)} Zellen; ohne Verschiebungsausgleich wären es ${formatNumber(shift.changedWithout)}.`}</p>
      <button type="button" className="text-button" onClick={() => setAlign('fixed')}>Ohne Verschiebungsausgleich vergleichen</button>
    </div>}
    {align === 'fixed' && <p className="small-note" data-testid="diff-fixed">Verglichen ohne Verschiebungsausgleich (feste Ausrichtung an der unteren Ecke). <button type="button" className="text-button" onClick={() => setAlign('auto')}>Verschiebung erkennen</button></p>}
    {changed > 0 && (diff.counts.state > 0 || diff.counts.content > 0 || followUps.layers.length > 0) && <ul className="diff-followups" aria-label="Folgen der Änderungen" data-testid="diff-followups">
      {diff.counts.state > 0 && <li>{followUps.derivedStates === diff.counts.state
        ? `Alle ${formatNumber(diff.counts.state)} Zustandsänderungen folgen aus den Nachbarn (Verbindungen von Zäunen, Mauern, Scheiben, Treppenecken) – das Spiel setzt sie beim Bauen selbst.`
        : followUps.derivedStates > 0
          ? `${formatNumber(followUps.derivedStates)} von ${formatNumber(diff.counts.state)} Zustandsänderungen folgen nur aus den Nachbarn (Verbindungen, Treppenecken); die übrigen ${formatNumber(diff.counts.state - followUps.derivedStates)} sind echte Drehungen oder Zustände.`
          : `${formatNumber(diff.counts.state)} Zustandsänderungen sind echte Drehungen oder Zustände (keine bloßen Verbindungen).`}</li>}
      {contentKinds.length > 0 && <li>Anderer Inhalt bei {formatNumber(diff.counts.content)} {diff.counts.content === 1 ? 'Block' : 'Blöcken'}: {contentKinds.map(([k, n]) => `${k} ${formatNumber(n)}×`).join(', ')}. Diese Blöcke stehen gleich, nur ihre Daten (Kisteninhalt, Schildtext, Banner …) sind anders – Ausstattung prüfen.</li>}
      {followUps.layers.length > 0 && <li>Bauschritte in {followUps.layers.length === 1 ? 'Ebene' : `${followUps.layers.length} Ebenen`} betroffen: {layerRanges(followUps.layers)} (Ebene 1 = unterste Lage des Vergleichs).</li>}
    </ul>}
    <div className="diff-bar" role="toolbar" aria-label="Unterschiede anzeigen">
      <div className="seg" role="group" aria-label="Darstellung der Unterschiede">
        {([['bild', 'Bild'], ['3d', '3D'], ['ebenen', 'Ebenen']] as const).map(([m, l]) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{l}</button>)}
      </div>
      <label className="check"><input type="checkbox" checked={hideSame} onChange={e => setHideSame(e.target.checked)} /> Unveränderte ausblenden</label>
    </div>
    <div className="diff-stage">
      {mode === 'bild' && <div className="diff-shots">
        <figure><Thumb cacheKey={`${cacheKey}:A`} payload={() => a} eager alt={`Stand ${labelA}`} width={420} height={300} className="thumb shot-big" /><figcaption>Stand {labelA}</figcaption></figure>
        <figure><Thumb cacheKey={`${cacheKey}:B`} payload={() => b} eager alt={`Stand ${labelB}`} width={420} height={300} className="thumb shot-big" /><figcaption>Stand {labelB}</figcaption></figure>
        <figure><Thumb key={`d-${hideSame}`} cacheKey={`diff:${cacheKey}:${hideSame ? 'h' : 'a'}`} payload={() => union.payload} markOf={(_c, i) => markOfIndex(i)} eager alt="Unterschiede farbig" width={420} height={300} className="thumb shot-big" /><figcaption>Unterschiede</figcaption></figure>
      </div>}
      {mode === '3d' && <div className="viewport detail-stage"><Viewer key={cacheKey} payload={union.payload} cells={cells3d.length ? cells3d : union.payload.cells} onSelect={noSelect} markFor={markFor} /></div>}
      {mode === 'ebenen' && <LayerSheet key={`${cacheKey}:${hideSame}`} payload={union.payload} name={`${labelA} → ${labelB}`} markOf={markOfIndex} />}
    </div>
    {diff.blocks.length > 0 && <table className="diff-table">
      <caption>Blockmengen, die sich ändern</caption>
      <thead><tr><th scope="col">Block</th><th scope="col">{labelA}</th><th scope="col">{labelB}</th><th scope="col">Δ</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id}><th scope="row"><i aria-hidden="true" style={{ background: stateColor(r.id) }} />{bare(r.id)}</th><td>{formatNumber(r.before)}</td><td>{formatNumber(r.after)}</td>
        <td className={r.after > r.before ? 'up' : 'down'}>{r.after > r.before ? '+' : ''}{formatNumber(r.after - r.before)}</td></tr>)}</tbody>
    </table>}
    {diff.blocks.length > 10 && <button type="button" className="text-button" onClick={() => setAllRows(!allRows)}>{allRows ? 'Weniger zeigen' : `Alle ${diff.blocks.length} Zeilen zeigen`}</button>}
  </div>;
}

/** „1–3, 7, 9–10“ from sorted zero-based layers, shown one-based. */
function layerRanges(layers: readonly number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < layers.length;) {
    let j = i;
    while (j + 1 < layers.length && layers[j + 1] === layers[j]! + 1) j++;
    parts.push(j > i ? `${layers[i]! + 1}–${layers[j]! + 1}` : `${layers[i]! + 1}`);
    i = j + 1;
  }
  return parts.length > 12 ? `${parts.slice(0, 12).join(', ')} …` : parts.join(', ');
}
