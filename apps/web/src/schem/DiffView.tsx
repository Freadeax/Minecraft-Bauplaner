import { useMemo, useState } from 'react';
import { diffAsPayload, diffPayloads } from '../../../../packages/voxel/src/index.js';
import type { Cell, DiffKind, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { formatNumber } from '../app/ui';
import { mix, stateColor } from '../colors';
import { Viewer } from '../Viewer';
import { Thumb } from '../thumbnail/Thumb';
import { LayerSheet } from './LayerSheet';

/**
 * Unterschiede zweier Bauversionen (B12): counts per change kind, the union
 * of both structures with coloured changes in 3D, as image or per layer, and
 * the block delta by id. Both structures are aligned at their minimum corner.
 */
export const DIFF_COLOR: Readonly<Record<Exclude<DiffKind, 'same'>, string>> = { added: '#4fd18b', removed: '#ff6b6b', material: '#ffb347', state: '#6fb3ff' };
export const DIFF_LABEL: Readonly<Record<DiffKind, string>> = { same: 'unverändert', added: 'hinzugefügt', removed: 'entfernt', material: 'anderes Material', state: 'nur Ausrichtung/Zustand' };
const KINDS: readonly DiffKind[] = ['added', 'removed', 'material', 'state', 'same'];
const bare = (id: string) => id.replace(/^minecraft:/, '');

export function DiffView({ a, b, labelA, labelB, cacheKey, profileId }: {
  a: VoxelPayload; b: VoxelPayload; labelA: string; labelB: string; cacheKey: string; profileId: string;
}) {
  const diff = useMemo(() => diffPayloads(a, b), [a, b]);
  const union = useMemo(() => diffAsPayload(diff, profileId), [diff, profileId]);
  const [mode, setMode] = useState<'3d' | 'bild' | 'ebenen'>('bild');
  const [hideSame, setHideSame] = useState(false);
  const [allRows, setAllRows] = useState(false);
  const kindAt = useMemo(() => new Map(union.payload.cells.map((c, i) => [c.position.join(','), union.kinds[i]!])), [union]);
  const colour = (kind: DiffKind, id: string): string | null => kind === 'same' ? (hideSame ? null : mix(stateColor(id), '#16303c', 0.62)) : DIFF_COLOR[kind];
  const colorOfIndex = (i: number) => { const c = union.payload.cells[i]!; return colour(union.kinds[i]!, c.kind === 'erase' ? '' : union.payload.palette[c.paletteIndex]!.id); };
  const cells3d = useMemo(() => hideSame ? union.payload.cells.filter((_, i) => union.kinds[i] !== 'same') : union.payload.cells, [union, hideSame]);
  const colorFor = useMemo(() => (cell: Cell) => cell.kind === 'erase' ? '#d35f5f'
    : colour(kindAt.get(cell.position.join(',')) ?? 'same', union.payload.palette[cell.paletteIndex]!.id) ?? '#000000', [kindAt, union, hideSame]);
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
        <figure><Thumb key={`d-${hideSame}`} cacheKey={`diff:${cacheKey}:${hideSame ? 'h' : 'a'}`} payload={() => union.payload} colorOf={(_c, i) => colorOfIndex(i)} eager alt="Unterschiede farbig" width={420} height={300} className="thumb shot-big" /><figcaption>Unterschiede</figcaption></figure>
      </div>}
      {mode === '3d' && <div className="viewport detail-stage"><Viewer key={cacheKey} payload={union.payload} cells={cells3d.length ? cells3d : union.payload.cells} onSelect={noSelect} colorFor={colorFor} /></div>}
      {mode === 'ebenen' && <LayerSheet key={`${cacheKey}:${hideSame}`} payload={union.payload} name={`${labelA} → ${labelB}`} colorOf={colorOfIndex} />}
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
