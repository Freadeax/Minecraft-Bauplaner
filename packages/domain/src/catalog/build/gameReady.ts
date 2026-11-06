import { adoptPayload, stateKey } from '../../../../voxel/src/validation.js';
import type { BlockState, Cell, Vec3, VoxelPayload } from '../../../../voxel/src/types.js';
import { isFactBlock, stateFacts, survives } from '../../../../voxel/src/blocklogic/index.js';
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
 * tests/unit/catalog/catalog-game.test.mjs checks every building and generator.
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
  return withChanges(payload, changed);
}

/** The payload with the given cells replaced or added (palette compacted, cells in y/z/x order). */
function withChanges(payload: VoxelPayload, changed: ReadonlyMap<string, { position: Vec3; state: BlockState }>): VoxelPayload {
  if (!changed.size) return payload;
  const key = (p: Vec3) => `${p[0]},${p[1]},${p[2]}`;
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

const isSource = (s: BlockState | undefined): boolean => !!s && ((s.id === 'minecraft:water' && (s.properties.level ?? '0') === '0') || s.properties.waterlogged === 'true');
const HORIZONTAL: readonly Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];

/** The tight version of a waterloggable block at a basin edge, or null (then it is drawn waterlogged). */
function sealed(s: BlockState): BlockState | null {
  if (/_slab$/.test(s.id) && s.properties.type !== 'double') return { id: s.id, properties: { ...s.properties, type: 'double', waterlogged: 'false' } };
  if (/_wall$/.test(s.id)) {
    const base = s.id.replace(/_wall$/, '');
    for (const id of [`${base}s`, base]) if (isFactBlock(id)) return { id, properties: {} };
  }
  return null;
}

/**
 * Dichte Becken (BLOCK-02, found with the real server, scripts/mod/test_game_placement.sh): a
 * waterloggable block next to two water sources with a solid block or a source below becomes a water
 * source itself (FlowingFluid.getNewLiquid) – a wall or slab at the corner of a round basin fills with
 * water and lets it run out. Such a slab becomes a double slab, such a wall the full block of its
 * material; any other waterloggable block is drawn waterlogged, as the game will make it.
 */
export function sealBasins(payload: VoxelPayload): VoxelPayload {
  const look = payloadLookup(payload);
  const changed = new Map<string, { position: Vec3; state: BlockState }>();
  const key = (p: Vec3) => `${p[0]},${p[1]},${p[2]}`;
  const lookup: StateLookup = p => changed.get(key(p))?.state ?? look.state(p);
  for (let round = 0; round < 4; round++) {
    let more = false;
    for (const c of payload.cells) {
      if (c.kind !== 'block' || changed.has(key(c.position))) continue;
      const state = lookup(c.position)!;
      if (state.properties.waterlogged !== 'false' || state.properties.type === 'double') continue;
      const [x, y, z] = c.position;
      const sources = HORIZONTAL.filter(([dx, , dz]) => isSource(lookup([x + dx, y, z + dz]))).length;
      if (sources < 2) continue;
      const below = lookup([x, y - 1, z]);
      if (!isSource(below) && !(below && stateFacts(below)?.solid)) continue;
      changed.set(key(c.position), { position: c.position, state: sealed(state) ?? { id: state.id, properties: { ...state.properties, waterlogged: 'true' } } });
      more = true;
    }
    if (!more) break;
  }
  return withChanges(payload, changed);
}

const CORAL = /^minecraft:(tube|brain|bubble|fire|horn)_coral(_block|_fan|_wall_fan)?$/;
const wet = (s: BlockState | undefined): boolean => !!s && (s.id === 'minecraft:water' || s.id === 'minecraft:bubble_column' || s.properties.waterlogged === 'true');

/**
 * Korallen (BLOCK-02, real server): a coral block without water on any of its six sides, and a coral
 * or coral fan that is not waterlogged, dies on its first tick. Drawn dead, as the game shows it –
 * inner blocks of a reef are not seen anyway.
 */
export function dryCorals(payload: VoxelPayload): VoxelPayload {
  const look = payloadLookup(payload);
  const changed = new Map<string, { position: Vec3; state: BlockState }>();
  const SIDES: readonly Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const s = payload.palette[c.paletteIndex]!;
    if (!CORAL.test(s.id)) continue;
    const [x, y, z] = c.position;
    const alive = s.id.endsWith('_block') ? SIDES.some(([dx, dy, dz]) => wet(look.state([x + dx, y + dy, z + dz]))) : s.properties.waterlogged !== 'false';
    if (!alive) changed.set(`${x},${y},${z}`, { position: c.position, state: { id: s.id.replace('minecraft:', 'minecraft:dead_'), properties: s.properties } });
  }
  return withChanges(payload, changed);
}

/** Lanterns secured, basins tight, corals as they survive, then every connection as the game shows it. */
export function gameReady(payload: VoxelPayload): VoxelPayload {
  return settlePayload(dryCorals(sealBasins(hangLanterns(payload)))).payload;
}
