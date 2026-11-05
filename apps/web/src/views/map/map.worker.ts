/// <reference lib="webworker" />
import { buildWorldMap } from '../../../../../packages/domain/src/world/worldmap.js';
import type { AssetVersion, Project } from '../../../../../packages/domain/src/core/types.js';
import { packMap } from './transport';
import type { MapRequest, MapResponse } from './transport';

/**
 * Builds the world map off the UI thread: resolving every placed project and
 * merging up to MAP_MAX_CELLS cells would otherwise freeze the page. Cells
 * travel back as one transferable Int32Array instead of millions of objects.
 */
self.onmessage = (event: MessageEvent<MapRequest>) => {
  const { jobId, projects, versions, dimension, showHidden } = event.data;
  try {
    const map = buildWorldMap(projects as Project[], new Map((versions as AssetVersion[]).map(v => [v.id, v])), { dimension, showHidden });
    const packed = packMap(map);
    const response: MapResponse = { jobId, ok: true, map: packed };
    (self as unknown as DedicatedWorkerGlobalScope).postMessage(response, [packed.positions.buffer, packed.owner.buffer, packed.progress.buffer]);
  } catch (e) {
    const response: MapResponse = { jobId, ok: false, error: e instanceof Error ? e.message : String(e) };
    (self as unknown as DedicatedWorkerGlobalScope).postMessage(response);
  }
};
