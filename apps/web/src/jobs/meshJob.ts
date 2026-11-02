import { checkColumns } from '../../../../packages/voxel/src/index.js';
import type { BlockState, Cell, CellColumns, Vec3 } from '../../../../packages/voxel/src/index.js';
import { buildSectionMesh } from '../blockmodels/mesh.ts';
import type { Mark, MeshLayer, MeshSection, SpawnMap } from '../blockmodels/mesh.ts';
import { rendererFromSnapshot } from '../blockmodels/snapshot.ts';
import type { RenderSnapshot } from '../blockmodels/snapshot.ts';
import type { JobContext } from './protocol';

/**
 * Builds the 3D view of large models in the background (PERF-04): culled
 * block faces, ambient occlusion, sky and block light, spawn floor – the
 * same `buildSectionMesh` as on the page. Sections the page already shows
 * unchanged (same fingerprint) are only named, not rebuilt or sent.
 */
export interface MeshJobInput {
  readonly columns: CellColumns;
  readonly palette: readonly BlockState[];
  readonly snapshot: RenderSnapshot;
  readonly origin: Vec3;
  /** Distinct marks and, per cell, 0 = none or 1 + index into `table`. */
  readonly marks: { readonly table: readonly Mark[]; readonly index: Uint16Array } | null;
  /** Sections the page shows now: fingerprint and face counts. */
  readonly previous: readonly { readonly key: string; readonly hash: string; readonly quads: readonly [number, number] }[];
}
export interface BuiltSection { readonly key: string; readonly hash: string; readonly min: Vec3; readonly solid: MeshLayer; readonly translucent: MeshLayer }
export interface MeshJobOutput {
  /** Section keys in draw order; each is in `built` or was in `previous`. */
  readonly order: readonly string[];
  readonly built: readonly BuiltSection[];
  readonly quads: number;
  readonly blocks: number;
  readonly naiveQuads: number;
  readonly spawn: SpawnMap | null;
  readonly lit: boolean;
  readonly reused: number;
}

const layerBuffers = (l: MeshLayer): ArrayBuffer[] => [l.positions, l.uvs, l.colors, l.marks, l.light, l.indices, l.quadCells].map(a => a.buffer as ArrayBuffer);

export async function meshJob(input: MeshJobInput, ctx: JobContext): Promise<MeshJobOutput> {
  checkColumns(input.columns);
  const { columns: c, marks } = input;
  if (marks && marks.index.length !== c.count) throw new Error('Markierungen passen nicht zu den Zellen.');
  ctx.progress('Blöcke übernehmen', 0.02);
  // Plain cells for this worker only; `m` carries the mark so no lookup table per cell is needed.
  type MarkedCell = Cell & { readonly m: number };
  const cells: MarkedCell[] = new Array(c.count);
  for (let i = 0; i < c.count; i++) {
    const position: Vec3 = [c.xyz[i * 3]!, c.xyz[i * 3 + 1]!, c.xyz[i * 3 + 2]!], m = marks ? marks.index[i]! : 0, k = c.kinds[i];
    cells[i] = (k === 0 ? { position, kind: 'erase', m } : { position, kind: k === 1 ? 'air' : 'block', paletteIndex: c.palette[i]!, m }) as MarkedCell;
  }
  const { renderer, sprites } = rendererFromSnapshot(input.snapshot, input.palette);
  const markOf = marks ? (cell: Cell) => { const m = (cell as MarkedCell).m; return m ? marks.table[m - 1] ?? null : null; } : undefined;
  // Only key, fingerprint and face counts of the shown sections matter for reuse.
  const previous = input.previous.map(p => ({ key: p.key, hash: p.hash, solid: { quads: p.quads[0] }, translucent: { quads: p.quads[1] } })) as unknown as MeshSection[];
  ctx.progress('Licht und verdeckte Flächen berechnen', 0.05);
  const mesh = buildSectionMesh(cells, input.palette, renderer, sprites, input.origin, markOf, {
    progress: f => ctx.progress(f < 0.35 ? 'Licht und verdeckte Flächen berechnen' : 'Blockflächen bauen', 0.05 + f * 0.93),
  }, previous);
  const known = new Set(previous);
  const built: BuiltSection[] = [];
  for (const s of mesh.sections) if (!known.has(s)) {
    built.push({ key: s.key, hash: s.hash, min: s.min, solid: s.solid, translucent: s.translucent });
    ctx.transfer([...layerBuffers(s.solid), ...layerBuffers(s.translucent)]);
  }
  if (mesh.spawn) ctx.transfer([mesh.spawn.positions.buffer as ArrayBuffer, mesh.spawn.when.buffer as ArrayBuffer]);
  return { order: mesh.sections.map(s => s.key), built, quads: mesh.quads, blocks: mesh.blocks, naiveQuads: mesh.naiveQuads, spawn: mesh.spawn, lit: mesh.lit, reused: mesh.reused };
}
