import { importEntity, nbtPos } from '../../voxel/src/entities.js';
import type { Bounds, FreeEntity, NbtTag } from '../../voxel/src/types.js';

/**
 * Free entities from a file (ENTITY-01). Litematica stores the flat entity NBT
 * with `Pos` relative to the region position; Sponge Schem v3 stores
 * `{Id, Pos, Data}` with `Pos` relative to the schematic's minimum corner.
 * `toLocal` maps the stored `Pos` into the payload frame. Entities without a
 * readable `Pos`/id or too far outside the box stay only in the original file.
 */
export interface FileEntities { readonly entities: FreeEntity[]; readonly dropped: number }
export function readFileEntities(tags: readonly NbtTag[], toLocal: (pos: readonly [number, number, number]) => [number, number, number], bounds: Bounds): FileEntities {
  const entities: FreeEntity[] = [];
  let dropped = 0;
  for (const tag of tags) {
    if (tag.type !== 'compound') { dropped++; continue; }
    const c = tag.value;
    // Sponge v3: {Id, Pos, Data}; everything else (Litematica, worlds): flat with id and Pos.
    const sponge = c.Data?.type === 'compound' && c.Id?.type === 'string';
    const data: NbtTag = sponge ? { type: 'compound', value: { ...(c.Data as { value: Record<string, NbtTag> }).value, id: c.Id! } } : tag;
    const id = data.type === 'compound' ? data.value.id : undefined;
    const pos = nbtPos(tag);
    if (id?.type !== 'string' || !id.value || !pos) { dropped++; continue; }
    const local = toLocal(pos).map(n => Object.is(n, -0) ? 0 : n) as [number, number, number];
    if (local.some((n, i) => !Number.isFinite(n) || n < bounds.min[i]! - 1 || n > bounds.maxExclusive[i]! + 1)) { dropped++; continue; }
    entities.push(importEntity(data, local));
  }
  return { entities, dropped };
}
