import { buildWorldMap } from '../../../../../packages/domain/src/world/worldmap.js';
import type { WorldMapView } from '../../../../../packages/domain/src/world/worldmap.js';
import type { AssetVersion, Project } from '../../../../../packages/domain/src/core/types.js';
import type { Cell } from '../../../../../packages/voxel/src/index.js';

export interface MapRequest {
  readonly jobId: number;
  readonly projects: readonly Project[];
  readonly versions: readonly AssetVersion[];
  readonly dimension: string;
  readonly showHidden: boolean;
}
/** WorldMapView with cells packed as x,y,z,paletteIndex quadruples. */
export interface PackedMap extends Omit<WorldMapView, 'cells'> { readonly positions: Int32Array }
export type MapResponse = { readonly jobId: number; readonly ok: true; readonly map: PackedMap } | { readonly jobId: number; readonly ok: false; readonly error: string };

export function packMap(map: WorldMapView): PackedMap {
  const { cells, ...rest } = map;
  const positions = new Int32Array(cells.length * 4);
  cells.forEach((c, i) => { positions[i * 4] = c.position[0]; positions[i * 4 + 1] = c.position[1]; positions[i * 4 + 2] = c.position[2]; positions[i * 4 + 3] = c.kind === 'erase' ? -1 : c.paletteIndex; });
  return { ...rest, positions };
}

export function unpackMap(packed: PackedMap): WorldMapView {
  const { positions, ...rest } = packed, cells: Cell[] = new Array(positions.length / 4);
  for (let i = 0; i < cells.length; i++) cells[i] = { position: [positions[i * 4]!, positions[i * 4 + 1]!, positions[i * 4 + 2]!], kind: 'block', paletteIndex: positions[i * 4 + 3]! };
  return { ...rest, cells };
}

/** Only versions referenced by placed projects of this dimension cross the worker boundary. */
export function mapRequest(jobId: number, projects: readonly Project[], versions: ReadonlyMap<string, AssetVersion>, dimension: string, showHidden: boolean): MapRequest {
  const ids = new Set(projects.filter(p => p.world?.dimension === dimension || !p.world).flatMap(p => p.instances.map(i => i.assetVersionId)));
  return { jobId, projects, versions: [...ids].flatMap(id => { const v = versions.get(id); return v ? [v] : []; }), dimension, showHidden };
}

let seq = 0;
/**
 * Runs the map build in a worker; without Worker support (old browsers,
 * tests) it falls back to the UI thread. Returns a cancel function.
 */
export function computeMap(projects: readonly Project[], versions: ReadonlyMap<string, AssetVersion>, dimension: string, showHidden: boolean,
  done: (result: { map: WorldMapView } | { error: string }) => void, timeoutMs = 120_000): () => void {
  const request = mapRequest(++seq, projects, versions, dimension, showHidden);
  if (typeof Worker === 'undefined') {
    const timer = setTimeout(() => {
      try { done({ map: buildWorldMap(projects, versions, { dimension, showHidden }) }); }
      catch (e) { done({ error: e instanceof Error ? e.message : String(e) }); }
    }, 0);
    return () => clearTimeout(timer);
  }
  const worker = new Worker(new URL('./map.worker.ts', import.meta.url), { type: 'module' });
  let finished = false;
  const finish = (result: { map: WorldMapView } | { error: string }) => { if (finished) return; finished = true; clearTimeout(timer); worker.terminate(); done(result); };
  const timer = setTimeout(() => finish({ error: 'Die Weltkarte braucht zu lange. Weniger Projekte einblenden oder die Seite neu laden.' }), timeoutMs);
  worker.onmessage = (e: MessageEvent<MapResponse>) => {
    if (e.data.jobId !== request.jobId) return;
    finish(e.data.ok ? { map: unpackMap(e.data.map) } : { error: e.data.error });
  };
  worker.onerror = e => { e.preventDefault(); finish({ error: e.message || 'Kartenberechnung fehlgeschlagen.' }); };
  worker.postMessage(request);
  return () => { finished = true; clearTimeout(timer); worker.terminate(); };
}
