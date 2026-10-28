import { useMemo } from 'react';
import type { Cell, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { Viewer } from '../Viewer';
import { useLayerFilter } from '../viewer/LayerControl';
import { LayerSheet } from './LayerSheet';
import { ShotGallery } from './ShotGallery';

/**
 * Schem-Ansicht (B12): one structure in three views behind tabs – 3D with the
 * layer filter, a still image gallery (nine views, cutaway, PNG download) and
 * the build plan per layer. Pure view: counts and exports never read from it.
 */
export type SchemTab = '3d' | 'bilder' | 'ebenen';
export const SCHEM_TABS: readonly (readonly [SchemTab, string])[] = [['3d', '3D'], ['bilder', 'Bilder'], ['ebenen', 'Ebenen']];

export function SchemView({ payload, cacheKey, name, tab, onTab, colorFor, tabs = SCHEM_TABS }: {
  payload: VoxelPayload;
  /** Immutable key of the payload (version id) for cached images. */
  cacheKey: string;
  name: string;
  tab: SchemTab;
  onTab(tab: SchemTab): void;
  /** 3D colours (marks of connector editor or crop panel). */
  colorFor?: (cell: Cell) => string;
  /** Offered tabs, e.g. without 3D where a page already has its own 3D view. */
  tabs?: readonly (readonly [SchemTab, string])[];
}) {
  const layers = useLayerFilter(payload);
  const noSelect = useMemo(() => () => {}, []);
  return <div className="schem-view">
    <div className="schem-tabs" role="tablist" aria-label="Ansicht">
      {tabs.map(([id, label]) => <button key={id} type="button" role="tab" id={`schem-tab-${id}`} aria-selected={tab === id} aria-controls={`schem-panel-${id}`}
        tabIndex={tab === id ? 0 : -1} onClick={() => onTab(id)}
        onKeyDown={e => {
          const i = tabs.findIndex(([t]) => t === tab), n = tabs.length;
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n]![0]; onTab(next); document.getElementById(`schem-tab-${next}`)?.focus(); }
        }}>{label}</button>)}
    </div>
    <div className="schem-panel" role="tabpanel" id={`schem-panel-${tab}`} aria-labelledby={`schem-tab-${tab}`}>
      {tab === '3d' && <>
        <div className="viewport detail-stage">
          <Viewer key={cacheKey} payload={payload} cells={layers.visible?.cells ?? payload.cells} onSelect={noSelect} {...(colorFor && { colorFor })} />
        </div>
        {layers.control}
      </>}
      {tab === 'bilder' && <ShotGallery key={cacheKey} payload={payload} cacheKey={cacheKey} name={name} />}
      {tab === 'ebenen' && <LayerSheet key={cacheKey} payload={payload} name={name} />}
    </div>
  </div>;
}
