import type { BlockState } from '../../../../packages/voxel/src/index.js';
import { blockLook } from './colors26.ts';
import type { BlockRenderer } from './mesh.ts';
import { Bakery } from './model.ts';
import type { BakedBlock, ModelSource } from './model.ts';
import { fallbackBlock } from './shapes.ts';
import type { Paint } from './shapes.ts';
import { tintColor } from './tint.ts';
import { ENTITY_STATE_ID, entityQuads } from './entityShapes.ts';

/**
 * The two block renderers: own shapes with average colours (always
 * available) and real models from a loaded texture source. Blocks the source
 * draws as entities (chests, banners, heads …) and liquids fall back to own
 * shapes, painted with a texture of the source where that reads well.
 */
const keyOf = (s: BlockState) => `${s.id}[${Object.keys(s.properties).sort().map(k => `${k}=${s.properties[k]}`).join(',')}]`;

export function fallbackRenderer(): BlockRenderer {
  const cache = new Map<string, BakedBlock>();
  return {
    key: 'formen-v1', textured: false,
    block(state) {
      const k = keyOf(state);
      let b = cache.get(k);
      if (!b) { b = state.id === ENTITY_STATE_ID ? { quads: entityQuads(state.properties), kind: 'fallback' } : fallbackBlock(state.id, state.properties); cache.set(k, b); }
      return b;
    },
    // Average colours already include the plains tint.
    tint: () => null,
  };
}

/** Entity-rendered blocks that look right with their particle texture on the own shape. */
const TEXTURED_ENTITY = /^(chest|trapped_chest|ender_chest|.*copper_chest|.*shulker_box|decorated_pot|conduit|.*copper_golem_statue)$/;
const all = (sprite: string, translucent = false): Paint => ({ top: sprite, side: sprite, bottom: sprite, translucent });

export function packRenderer(source: ModelSource, key: string): BlockRenderer {
  const bakery = new Bakery(source);
  const cache = new Map<string, BakedBlock>();
  const resolve = (state: BlockState): BakedBlock => {
    // Free entities (paintings, frames, armor stands) keep their own geometry with every texture source.
    if (state.id === ENTITY_STATE_ID) return { quads: entityQuads(state.properties), kind: 'fallback' };
    const name = state.id.startsWith('minecraft:') ? state.id.slice(10) : null;
    if (name === 'water' || name === 'bubble_column') {
      const b = fallbackBlock(state.id, state.properties, all('minecraft:block/water_still', true));
      return { ...b, quads: b.quads.map(q => ({ ...q, tint: 0 })) };
    }
    if (name === 'lava') return fallbackBlock(state.id, state.properties, all('minecraft:block/lava_still'));
    const baked = bakery.bake(state.id, state.properties);
    if (baked.kind === 'pack') return baked;
    if (baked.kind === 'entity' && name && baked.particle && TEXTURED_ENTITY.test(name)) return fallbackBlock(state.id, state.properties, all(baked.particle));
    // Banners, heads, beds of older versions, mod blocks without assets: own shape in average colours.
    const look = name ? blockLook(name) : undefined;
    return fallbackBlock(state.id, state.properties, look ? { top: look.top, side: look.side, bottom: look.bottom } : undefined);
  };
  return {
    key, textured: true,
    block(state) {
      const k = keyOf(state);
      let b = cache.get(k);
      if (!b) { b = resolve(state); cache.set(k, b); }
      return b;
    },
    tint: (state, index) => tintColor(state.id, state.properties, index),
  };
}
