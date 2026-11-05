import { adoptPayload, stateKey } from '../../../../voxel/src/validation.js';
import type { BlockState, Cell, Vec3, VoxelPayload } from '../../../../voxel/src/types.js';
import { survives } from '../../../../voxel/src/blocklogic/index.js';
import type { StateLookup } from '../../../../voxel/src/blocklogic/index.js';
import { payloadLookup, settlePayload } from '../../core/placement.js';

/**
 * Spielgerecht bauen (BLOCK-02): the last step of every catalogue building and
 * generator. Two rules of the game the designs rely on:
 *  - Laternen: a lantern that does not hold where it is drawn hangs from an
 *    iron chain down from the next block above (at most `MAX_CHAIN` links);
 *    a standing lantern without floor but with a block right above hangs from it.
 *  - Verbindungen: fences, walls, panes, bars, stairs … get the state the game
 *    derives from the neighbours (settlePayload, from the real block facts).
 * Cells that are not part of the plan count as air: a catalogue building owns
 * its space. Everything else that does not hold must be fixed in the design;
 * tests/catalog-game.test.mjs checks every building and generator.
 */
export const MAX_CHAIN = 8;
const CHAIN: BlockState = { id: 'minecraft:iron_chain', properties: { axis: 'y', waterlogged: 'false' } };
const isLantern = (s: BlockState): boolean => /^minecraft:(soul_|copper_|exposed_copper_|weathered_copper_|oxidized_copper_|waxed_[a-z_]*)?lantern$/.test(s.id) && 'hanging' in s.properties;
const isAir = (s: BlockState | undefined): boolean => !s || s.id === 'minecraft:air';

export function hangLanterns(payload: VoxelPayload): VoxelPayload {
  const look = payloadLookup(payload);
  const changed = new Map<string, { position: Vec3; state: BlockState }>();
  const key = (p: Vec3) => `${p[0]},${p[1]},${p[2]}`;
  const lookup: StateLookup = p => changed.get(key(p))?.state ?? look.state(p);
  const top = payload.bounds.maxExclusive[1];
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const state = payload.palette[c.paletteIndex]!;
    if (!isLantern(state) || survives(state, c.position, lookup).survives) continue;
    const [x, y, z] = c.position;
    const hanging: BlockState = { id: state.id, properties: { ...state.properties, hanging: 'true' } };
    if (survives(hanging, c.position, lookup).survives) { changed.set(key(c.position), { position: c.position, state: hanging }); continue; }
    let ceiling = -1;
    for (let yy = y + 1; yy < top && yy <= y + MAX_CHAIN + 1; yy++) if (!isAir(lookup([x, yy, z]))) { ceiling = yy; break; }
    if (ceiling < 0) continue;
    // Chains survive on their own; the topmost link touches the ceiling block.
    for (let yy = y + 1; yy < ceiling; yy++) changed.set(key([x, yy, z]), { position: [x, yy, z], state: CHAIN });
    changed.set(key(c.position), { position: c.position, state: hanging });
    if (!survives(hanging, c.position, lookup).survives) {
      for (let yy = y + 1; yy < ceiling; yy++) changed.delete(key([x, yy, z]));
      changed.delete(key(c.position));
    }
  }
  if (!changed.size) return payload;
  const palette = [...payload.palette], index = new Map(palette.map((s, i) => [stateKey(s), i]));
  const indexOf = (s: BlockState): number => {
    const k = stateKey(s);
    let i = index.get(k);
    if (i === undefined) { i = palette.length; palette.push(s); index.set(k, i); }
    return i;
  };
  const seen = new Set<string>();
  const cells: Cell[] = payload.cells.map(c => {
    const k = key(c.position), n = changed.get(k);
    if (!n) return c;
    seen.add(k);
    return { position: c.position, kind: 'block', paletteIndex: indexOf(n.state) };
  });
  for (const [k, n] of changed) if (!seen.has(k)) cells.push({ position: n.position, kind: 'block', paletteIndex: indexOf(n.state) });
  cells.sort((a, b) => a.position[1] - b.position[1] || a.position[2] - b.position[2] || a.position[0] - b.position[0]);
  const used = new Set(cells.flatMap(c => c.kind === 'erase' ? [] : [c.paletteIndex]));
  const remap = new Map<number, number>(), finalPalette: BlockState[] = [];
  palette.forEach((s, i) => { if (used.has(i) || i === 0) { remap.set(i, finalPalette.length); finalPalette.push(s); } });
  return adoptPayload({ ...payload, palette: finalPalette, cells: cells.map(c => c.kind === 'erase' ? c : { ...c, paletteIndex: remap.get(c.paletteIndex)! }), blockEntities: [...payload.blockEntities] });
}

/** Lanterns secured, then every connection as the game shows it. */
export function gameReady(payload: VoxelPayload): VoxelPayload {
  return settlePayload(hangLanterns(payload)).payload;
}
