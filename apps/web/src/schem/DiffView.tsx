import { useEffect, useMemo, useState } from 'react';
import { columnBuffers, diffAsPayload, diffPayloads, hydratePayload } from '../../../../packages/voxel/src/index.js';
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
 * the block delta by id. Both structures are aligned at their minimum corner.
 */
const SAME_MARK: Mark = { color: '#16303c', amount: 0.62 };
export const DIFF_COLOR: Readonly<Record<Exclude<DiffKind, 'same'>, string>> = { added: '#4fd18b', removed: '#ff6b6b', material: '#ffb347', state: '#6fb3ff' };
export const DIFF_LABEL: Readonly<Record<DiffKind, string>> = { same: 'unverändert', added: 'hinzugefügt', removed: 'entfernt', material: 'anderes Material', state: 'nur Ausrichtung/Zustand' };
const KINDS: readonly DiffKind[] = ['added', 'removed', 'material', 'state', 'same'];
const bare = (id: string) => id.replace(/^minecraft:/, '');

type Union = { readonly payload: VoxelPayload; readonly kinds: readonly DiffKind[] };
type Computed = { readonly diff: Omit<PayloadDiff, 'cells'>; readonly union: Union };
/** From this many cells (both sides) the comparison runs in the background worker (PERF-04). */
const BACKGROUND_DIFF_CELLS = 120_000;

/** Diff and coloured union; large structures are compared in the background, small ones right here. */
function useDiff(a: VoxelPayload, b: VoxelPayload, profileId: string): { computed: Computed | null; progress: JobProgress | null; error: string } {
  const background = workersAvailable() && a.cells.length + b.cells.length >= backgroundFrom(BACKGROUND_DIFF_CELLS);
  const direct = useMemo(() => {
    if (background) return null;
    const diff = diffPayloads(a, b);
    return { diff, union: diffAsPayload(diff, profileId) };
  }, [a, b, profileId, background]);
  const [state, setState] = useState<{ key: readonly unknown[]; computed: Computed | null; progress: JobProgress | null; error: string }>({ key: [], computed: null, progress: null, error: '' });
  useEffect(() => {
    if (!background) return;
    const key = [a, b, profileId], controller = new AbortController();
    setState({ key, computed: null, progress: { step: 'Stände vorbereiten', fraction: 0 }, error: '' });
    void (async () => {
      try {
        const [ta, tb] = [await transportInSlices(a, controller.signal), await transportInSlices(b, controller.signal)];
        const out = await runJob('diff', { a: ta, b: tb, profileId }, {
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
  }, [a, b, profileId, background]);
  if (direct) return { computed: direct, progress: null, error: '' };
  const current = state.key[0] === a && state.key[1] === b && state.key[2] === profileId;
  return current ? state : { computed: null, progress: { step: 'Stände vorbereiten', fraction: 0 }, error: '' };
}

export function DiffView(props: {
  a: VoxelPayload; b: VoxelPayload; labelA: string; labelB: string; cacheKey: string; profileId: string;
}) {
  const { computed, progress, error } = useDiff(props.a, props.b, props.profileId);
  if (error) return <div className="notice warning" role="alert"><strong>Vergleich nicht möglich.</strong><p>{error}</p></div>;
  if (!computed) return <div className="diff-view" aria-busy="true"><JobStatus title="Unterschiede werden im Hintergrund berechnet" progress={progress} /></div>;
  return <DiffBody {...props} diff={computed.diff} union={computed.union} />;
}

function DiffBody({ a, b, labelA, labelB, cacheKey, diff, union }: {
  a: VoxelPayload; b: VoxelPayload; labelA: string; labelB: string; cacheKey: string; diff: Omit<PayloadDiff, 'cells'>; union: Union;
}) {
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
  const changed = diff.counts.added + diff.counts.removed + diff.counts.material + diff.counts.state;
  const rows = allRows ? diff.blocks : diff.blocks.slice(0, 10);

  return <div className="diff-view" aria-label={`Unterschiede ${labelA} → ${labelB}`}>
    <dl className="diff-stats">
      {KINDS.map(k => <div key={k} className={`diff-${k}`}><dt><i aria-hidden="true" style={{ background: k === 'same' ? '#5b6b75' : DIFF_COLOR[k] }} />{DIFF_LABEL[k]}</dt><dd>{formatNumber(diff.counts[k])}</dd></div>)}
    </dl>
    <p className="small-note">{labelA}: {formatNumber(diff.blocksBefore)} Blöcke → {labelB}: {formatNumber(diff.blocksAfter)} Blöcke ({diff.blocksAfter - diff.blocksBefore >= 0 ? '+' : ''}{formatNumber(diff.blocksAfter - diff.blocksBefore)}).
      {changed === 0 ? ' Beide Stände sind blockgenau gleich.' : ` ${formatNumber(changed)} Zellen unterscheiden sich.`} Ausgerichtet an der unteren Ecke beider Bauwerke.</p>
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
