import { useState } from 'react';
import type { Cell, FreeEntity, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { BlockContent, EntityCard, FurnishingSummary, contentAt } from '../viewer/ContentInfo';
import { Viewer } from '../Viewer';
import type { Mark } from '../viewer/types';
import { useLayerFilter } from '../viewer/LayerControl';
import { LayerSheet } from './LayerSheet';
import { ShotGallery } from './ShotGallery';
import { ModelExportPanel } from '../export3d/ModelExportPanel';

/**
 * Schem-Ansicht (B12): one structure in three views behind tabs – 3D with the
 * layer filter, a still image gallery (nine views, cutaway, PNG download) and
 * the build plan per layer, plus the 3D file export (OBJ, GLB, STL, 3MF).
 * Pure view: counts and Minecraft exports never read from it.
 */
export type SchemTab = '3d' | 'bilder' | 'ebenen' | 'modell';
export const SCHEM_TABS: readonly (readonly [SchemTab, string])[] = [['3d', '3D'], ['bilder', 'Bilder'], ['ebenen', 'Ebenen'], ['modell', 'Modelldatei']];

export function SchemView({ payload, cacheKey, name, tab, onTab, markFor, tabs = SCHEM_TABS }: {
  payload: VoxelPayload;
  /** Immutable key of the payload (version id) for cached images. */
  cacheKey: string;
  name: string;
  tab: SchemTab;
  onTab(tab: SchemTab): void;
  /** 3D highlights (marks of connector editor or crop panel). */
  markFor?: (cell: Cell) => Mark | null;
  /** Offered tabs, e.g. without 3D where a page already has its own 3D view. */
  tabs?: readonly (readonly [SchemTab, string])[];
}) {
  const layers = useLayerFilter(payload);
  // Clicking shows what a block or entity holds (sign text, chest items, painting, armor) (ENTITY-01).
  const [picked, setPicked] = useState<Cell | null>(null);
  const [entity, setEntity] = useState<FreeEntity | null>(null);
  const content = picked && picked.kind === 'block' ? contentAt(payload, picked.position) : null;
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
          <Viewer key={cacheKey} payload={payload} cells={layers.visible?.cells ?? payload.cells} onSelect={setPicked} onSelectEntity={setEntity} {...(markFor && { markFor })} sectionTools />
        </div>
        {layers.control}
        {entity && <EntityCard entity={entity} />}
        {content && <BlockContent content={content} />}
        <FurnishingSummary payload={payload} />
      </>}
      {tab === 'bilder' && <ShotGallery key={cacheKey} payload={payload} cacheKey={cacheKey} name={name} />}
      {tab === 'ebenen' && <LayerSheet key={cacheKey} payload={payload} name={name} />}
      {tab === 'modell' && <ModelExportPanel key={cacheKey} cells={payload.cells} palette={payload.palette} name={name} />}
    </div>
  </div>;
}
