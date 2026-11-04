import { columnBuffers, emptyColumns, fillColumns } from '../../../../packages/voxel/src/index.js';
import type { BlockState, Cell, Vec3 } from '../../../../packages/voxel/src/index.js';
import type { RenderKit } from '../blockmodels/assets';
import type { Mark, MeshSection, SectionMesh } from '../blockmodels/mesh';
import { snapshotRenderer } from '../blockmodels/snapshot';
import { backgroundFrom, pause, runJob, workersAvailable } from '../jobs/client';
import type { JobOptions } from '../jobs/client';

/** From this many cells the 3D view (faces, occlusion, light, spawn floor) is built in the background. */
export const BACKGROUND_MESH_CELLS = 120_000;
export const meshInBackground = (cells: number): boolean => cells >= backgroundFrom(BACKGROUND_MESH_CELLS) && workersAvailable();

const SLICE = 100_000;

/**
 * `buildSectionMesh` in the background worker (PERF-04). Cells and marks
 * travel as typed arrays, prepared here in slices; sections the view already
 * shows unchanged are taken from `previous` instead of being sent back.
 */
export async function buildSectionMeshInBackground(cells: readonly Cell[], palette: readonly BlockState[], kit: RenderKit, origin: Vec3,
  markOf: ((cell: Cell) => Mark | null) | undefined, previous: readonly MeshSection[], options: Pick<JobOptions, 'signal' | 'onProgress'> = {}): Promise<SectionMesh> {
  const { signal } = options;
  const columns = emptyColumns(cells.length);
  const markIndex = markOf ? new Uint16Array(cells.length) : null;
  const table: Mark[] = [], known = new Map<string, number>();
  for (let from = 0; from < cells.length; from += SLICE) {
    if (signal?.aborted) throw Object.assign(new Error('Abgebrochen.'), { name: 'AbortError' });
    const to = Math.min(cells.length, from + SLICE);
    fillColumns(cells, columns, from, to);
    if (markOf && markIndex) for (let i = from; i < to; i++) {
      const c = cells[i]!;
      if (c.kind !== 'block') continue;
      const m = markOf(c);
      if (!m) continue;
      const k = `${m.color}|${m.amount}`;
      let n = known.get(k);
      if (n === undefined) {
        if (table.length >= 0xfffe) throw new Error('Zu viele verschiedene Markierungen für die Hintergrundberechnung.');
        n = table.length + 1; known.set(k, n); table.push({ color: m.color, amount: m.amount });
      }
      markIndex[i] = n;
    }
    if (to < cells.length) await pause();
  }
  const snapshot = snapshotRenderer(kit.renderer, kit.atlas.lookup, palette);
  const out = await runJob('mesh', {
    columns, palette, snapshot, origin, marks: markIndex ? { table, index: markIndex } : null,
    previous: previous.map(s => ({ key: s.key, hash: s.hash, quads: [s.solid.quads, s.translucent.quads] as const })),
  }, { ...options, transfer: [...columnBuffers(columns), ...(markIndex ? [markIndex.buffer as ArrayBuffer] : [])] });
  const before = new Map(previous.map(s => [s.key, s])), built = new Map(out.built.map(s => [s.key, s]));
  const sections = out.order.map((key): MeshSection => {
    const b = built.get(key);
    if (b) return { ...b, cells };
    const p = before.get(key);
    if (!p) throw new Error('Ansicht: wiederverwendeter Abschnitt fehlt.');
    return p;
  });
  return { sections, quads: out.quads, blocks: out.blocks, naiveQuads: out.naiveQuads, spawn: out.spawn, lit: out.lit, beacons: out.beacons, reused: out.reused, built: out.built.length };
}
