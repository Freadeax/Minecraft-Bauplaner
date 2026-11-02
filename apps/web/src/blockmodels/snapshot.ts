import type { BlockState } from '../../../../packages/voxel/src/index.js';
import type { BakedBlock } from './model.ts';
import type { BlockRenderer, SpriteLookup, SpriteSlot } from './mesh.ts';

/**
 * Plain-data copy of what the mesh needs from a block renderer, for one
 * palette (PERF-04). The renderer and sprite lookup are closures over the
 * texture source and the atlas canvas and cannot cross into a worker; their
 * answers for the few hundred states of a palette can. `rendererFromSnapshot`
 * gives the worker a renderer that answers exactly the same.
 */
export interface RenderSnapshot {
  readonly key: string;
  readonly textured: boolean;
  /** Baked block per palette index. */
  readonly blocks: readonly BakedBlock[];
  /** Tint colour per palette index and tintindex (null = none). */
  readonly tints: readonly (readonly (string | null)[])[];
  /** Every sprite the baked blocks use, and '#' for colour sprites. */
  readonly sprites: readonly (readonly [string, SpriteSlot])[];
}

const keyOf = (s: BlockState) => `${s.id}[${Object.keys(s.properties).sort().map(k => `${k}=${s.properties[k]}`).join(',')}]`;
const AIR: BlockState = { id: 'minecraft:air', properties: {} };

export function snapshotRenderer(renderer: BlockRenderer, sprites: SpriteLookup, palette: readonly BlockState[]): RenderSnapshot {
  const blocks: BakedBlock[] = [], tints: (string | null)[][] = [], used = new Map<string, SpriteSlot>();
  const states = [...palette, AIR];
  for (const state of states) {
    const block = renderer.block(state);
    blocks.push(block);
    const t: (string | null)[] = [];
    for (const q of block.quads) {
      if (q.tint >= 0 && t[q.tint] === undefined) t[q.tint] = renderer.tint(state, q.tint);
      const sprite = q.sprite.startsWith('#') ? '#' : q.sprite;
      if (!used.has(sprite)) used.set(sprite, sprites(sprite));
    }
    tints.push(t);
  }
  return { key: renderer.key, textured: renderer.textured, blocks, tints, sprites: [...used] };
}

export function rendererFromSnapshot(snapshot: RenderSnapshot, palette: readonly BlockState[]): { renderer: BlockRenderer; sprites: SpriteLookup } {
  const index = new Map<string, number>();
  palette.forEach((s, i) => { if (!index.has(keyOf(s))) index.set(keyOf(s), i); });
  index.set(keyOf(AIR), palette.length);
  const slots = new Map(snapshot.sprites);
  const at = (state: BlockState): number => {
    const i = index.get(keyOf(state));
    if (i === undefined) throw new Error(`Blockzustand ${keyOf(state)} fehlt in der Ansichtskopie.`);
    return i;
  };
  return {
    renderer: {
      key: snapshot.key, textured: snapshot.textured,
      block: state => snapshot.blocks[at(state)]!,
      tint: (state, tintindex) => snapshot.tints[at(state)]?.[tintindex] ?? null,
    },
    sprites: sprite => {
      const slot = slots.get(sprite);
      if (!slot) throw new Error(`Textur ${sprite} fehlt in der Ansichtskopie.`);
      return slot;
    },
  };
}
