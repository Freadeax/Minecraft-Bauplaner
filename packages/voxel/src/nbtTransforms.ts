import { PROFILE_BLOCK_ENTITY_TYPES } from './profileData.js';
import type { BlockEntity, NbtTag, Transform, Vec3 } from './types.js';

/**
 * Semantische BlockEntity-Transformationen (NBT-01). When a placed asset is moved, turned or mirrored,
 * every block entity is classified by its type (registry `minecraft:block_entity_type` of the profile)
 * and handled by the rule of its family:
 *
 *  - relative     – content relative to the block (inventories, sign text, banner patterns, sherds,
 *                   book slots …). Minecraft itself keeps such NBT unchanged when it places a rotated or
 *                   mirrored structure (StructureTemplate, Litematica); so does the planner. Resolved.
 *  - conditional  – relative unless a field holds a world position (bee flower_pos, sculk vibration
 *                   event, catalyst cursors, spawn data with Pos). Then unresolved for every change.
 *  - command      – command text: relative coordinates (~, ^) survive moving but not turning or
 *                   mirroring; three bare numbers look like absolute coordinates and break on any change.
 *  - geometry     – own box with offset, size, rotation and mirror (structure block, test instance,
 *                   moving piston): moving is fine, turning/mirroring has no checked adapter yet.
 *  - absolute     – world position (end gateway exit portal): unresolved for every change.
 *  - unknown      – type outside the profile or a mod type: unresolved for every change.
 *
 * Own position fields of the entry (flat `x`/`y`/`z`, Sponge `Pos`) are bookkeeping: they are moved with
 * the entry, keeping their offset to `position`, so the payload stays self-consistent. Nothing is
 * dropped: unresolved entries keep their NBT unchanged and block the semantic approval.
 */
export type NbtFamily = 'relative' | 'conditional' | 'command' | 'geometry' | 'absolute' | 'unknown';

const FAMILY: Readonly<Record<string, NbtFamily>> = {
  banner: 'relative', barrel: 'relative', beacon: 'relative', bell: 'relative', blast_furnace: 'relative', brewing_stand: 'relative', brushable_block: 'relative',
  campfire: 'relative', chest: 'relative', chiseled_bookshelf: 'relative', comparator: 'relative', conduit: 'relative', copper_golem_statue: 'relative',
  crafter: 'relative', creaking_heart: 'relative', daylight_detector: 'relative', decorated_pot: 'relative', dispenser: 'relative', dropper: 'relative',
  enchanting_table: 'relative', end_portal: 'relative', ender_chest: 'relative', furnace: 'relative', hanging_sign: 'relative', hopper: 'relative',
  jigsaw: 'relative', jukebox: 'relative', lectern: 'relative', potent_sulfur: 'relative', shelf: 'relative', shulker_box: 'relative', sign: 'relative',
  skull: 'relative', smoker: 'relative', test_block: 'relative', trapped_chest: 'relative', vault: 'relative',
  beehive: 'conditional', calibrated_sculk_sensor: 'conditional', sculk_sensor: 'conditional', sculk_shrieker: 'conditional', sculk_catalyst: 'conditional',
  mob_spawner: 'conditional', trial_spawner: 'conditional',
  command_block: 'command',
  structure_block: 'geometry', test_instance_block: 'geometry', piston: 'geometry',
  end_gateway: 'absolute',
};

export const NBT_FAMILY_LABEL: Readonly<Record<NbtFamily, string>> = {
  relative: 'Inhalt relativ zum Block', conditional: 'relativ, außer bei Weltpositionen', command: 'Befehl', geometry: 'eigener Bereich mit Drehung',
  absolute: 'Weltposition', unknown: 'unbekannter Typ',
};

/** Family of a block entity type (`minecraft:chest`, `sign` …). Mod types and unknown ids are 'unknown'. */
export function nbtFamily(type: string): NbtFamily {
  const id = type.toLowerCase();
  if (id.includes(':') && !id.startsWith('minecraft:')) return 'unknown';
  return FAMILY[id.replace(/^minecraft:/, '')] ?? 'unknown';
}
/** Every block entity type of the profile with its family (for tests and documentation). */
export function profileNbtFamilies(): readonly { readonly type: string; readonly family: NbtFamily }[] {
  return PROFILE_BLOCK_ENTITY_TYPES.map(t => ({ type: `minecraft:${t}`, family: nbtFamily(t) }));
}

/** Block entity type that a vanilla block carries (by id rules of the profile); null for blocks without one. */
export function blockEntityTypeOf(blockId: string): string | null {
  if (blockId.includes(':') && !blockId.startsWith('minecraft:')) return null;
  const b = blockId.replace(/^minecraft:/, '');
  const direct = (t: string): string => `minecraft:${t}`;
  if (/_wall_hanging_sign$|_hanging_sign$/.test(b)) return direct('hanging_sign');
  if (/_sign$/.test(b)) return direct('sign');
  if (/_banner$/.test(b)) return direct('banner');
  if (/(^|_)shulker_box$/.test(b)) return direct('shulker_box');
  if (/_(head|skull)$/.test(b)) return direct('skull');
  if (/_shelf$/.test(b)) return direct('shelf');
  if (/copper_golem_statue$/.test(b)) return direct('copper_golem_statue');
  if (/copper_chest$/.test(b)) return direct('chest');
  if (/^(chain_|repeating_)?command_block$/.test(b)) return direct('command_block');
  if (/^suspicious_(sand|gravel)$/.test(b)) return direct('brushable_block');
  if (b === 'soul_campfire') return direct('campfire');
  if (b === 'bee_nest') return direct('beehive');
  if (b === 'spawner') return direct('mob_spawner');
  if (b === 'moving_piston') return direct('piston');
  if (b === 'test_instance_block') return direct('test_instance_block');
  return PROFILE_BLOCK_ENTITY_TYPES.includes(b) ? direct(b) : null;
}

// ------------------------------------------------------------------ NBT helpers
type Compound = Readonly<Record<string, NbtTag>>;
const comp = (t: NbtTag | undefined): Compound | null => t?.type === 'compound' ? t.value : null;
const text = (t: NbtTag | undefined): string | null => t?.type === 'string' ? t.value : null;
const list = (t: NbtTag | undefined): readonly NbtTag[] => t?.type === 'list' ? t.value : [];
const intNum = (t: NbtTag | undefined): number | null => t && (t.type === 'byte' || t.type === 'short' || t.type === 'int') ? t.value : null;

/** Tile compound and how to put a changed one back (Sponge keeps it under `Data` next to `Id`/`Pos`). */
function unwrap(data: NbtTag): { tile: Compound; wrap: (tile: Compound, outer?: Compound) => NbtTag; outer: Compound } | null {
  const c = comp(data);
  if (!c) return null;
  const inner = comp(c.Data);
  if (inner && (c.Id || c.Pos)) return { tile: inner, outer: c, wrap: (tile, outer = c) => ({ type: 'compound', value: { ...outer, Data: { type: 'compound', value: tile } } }) };
  return { tile: c, outer: c, wrap: tile => ({ type: 'compound', value: tile }) };
}
/** Block entity type of an entry: `id` of a flat tile, Sponge `Id`, else the block at its position. */
export function blockEntityType(data: NbtTag, blockId?: string): string | null {
  const c = comp(data);
  const id = text(c?.id) ?? text(c?.Id) ?? text(comp(c?.Data)?.id);
  if (id) return id.includes(':') ? id.toLowerCase() : `minecraft:${id.toLowerCase()}`;
  return blockId ? blockEntityTypeOf(blockId) : null;
}

/** World positions inside a conditional tile; empty when it holds none. */
function worldPositionFields(type: string, tile: Compound): string[] {
  const found: string[] = [];
  const t = type.replace(/^minecraft:/, '');
  if (t === 'beehive') list(tile.bees).forEach((b, i) => { if (comp(b)?.flower_pos) found.push(`bees[${i}].flower_pos`); });
  if (t === 'sculk_sensor' || t === 'calibrated_sculk_sensor' || t === 'sculk_shrieker') {
    const l = comp(tile.listener);
    if (l && (l.event || l.pending)) found.push('listener.event');
  }
  if (t === 'sculk_catalyst') list(tile.cursors).forEach((c, i) => { if (comp(c)?.pos) found.push(`cursors[${i}].pos`); });
  if (t === 'mob_spawner' || t === 'trial_spawner') {
    const hasPos = (n: NbtTag | undefined, depth = 0): boolean => {
      const c = comp(n);
      if (!c || depth > 6) return false;
      if (c.Pos) return true;
      return Object.values(c).some(v => hasPos(v, depth + 1) || list(v).some(x => hasPos(x, depth + 1)));
    };
    for (const key of ['SpawnData', 'SpawnPotentials', 'spawn_data', 'spawn_potentials', 'normal_config', 'ominous_config']) {
      if (hasPos(tile[key]) || list(tile[key]).some(x => hasPos(x))) found.push(key);
    }
  }
  return found;
}

/** Coordinates in a command: relative (~ ^) and three-number groups that look like absolute positions. */
export function commandCoordinates(command: string): { relative: boolean; absolute: boolean } {
  return { relative: /(^|\s)[~^]/.test(command), absolute: /(^|\s)-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+-?\d+(\.\d+)?(\s|$)/.test(command) };
}

export interface BlockEntityTransformResult {
  readonly entity: BlockEntity;
  readonly resolved: boolean;
  readonly family: NbtFamily;
  readonly type: string | null;
  readonly note?: string;
}

/** Moves own position fields (flat x/y/z, Sponge Pos) with the entry, keeping their offset to `position`. */
function moveOwnFields(data: NbtTag, from: Vec3, to: Vec3): NbtTag {
  const u = unwrap(data);
  if (!u) return data;
  const shift = (c: Compound): Compound => {
    const x = intNum(c.x), y = intNum(c.y), z = intNum(c.z);
    if (x === null || y === null || z === null) return c;
    return { ...c, x: { type: 'int', value: x - from[0] + to[0] }, y: { type: 'int', value: y - from[1] + to[1] }, z: { type: 'int', value: z - from[2] + to[2] } };
  };
  let outer = u.outer;
  const pos = outer.Pos;
  if (pos?.type === 'intArray' && pos.value.length === 3 && u.tile !== u.outer) {
    outer = { ...outer, Pos: { type: 'intArray', value: pos.value.map((v, i) => v - from[i]! + to[i]!) } };
  }
  return u.tile === u.outer ? { type: 'compound', value: shift(u.tile) } : u.wrap(shift(u.tile), outer);
}

const ROTATIONS = ['NONE', 'CLOCKWISE_90', 'CLOCKWISE_180', 'COUNTERCLOCKWISE_90'] as const;
/** One clockwise quarter turn of an offset like Minecraft's Rotation.CLOCKWISE_90: (x, z) → (−z, x). */
const turnOffset = (v: readonly [number, number, number], turns: number): [number, number, number] => {
  let [x, y, z] = v;
  for (let i = 0; i < turns; i++) [x, z] = [-z, x];
  return [x === 0 ? 0 : x, y, z === 0 ? 0 : z];
};
/**
 * Structure block under clockwise quarter turns (NBT-01-S03), the way the turned world needs it:
 * SAVE – the region posX/Y/Z + sizeX/Y/Z is the bounding box of the turned cells (new minimum corner, X/Z sizes swapped);
 * LOAD – the anchor offset turns with the block and `rotation` gains the same quarter turns, so the loaded structure
 * lands exactly where the turned original would. CORNER/DATA have no geometry. Null when fields are missing or unknown.
 */
export function turnStructureBlock(tile: Compound, turns: number): Compound | null {
  const n = ((turns % 4) + 4) % 4;
  const pos = ['posX', 'posY', 'posZ'].map(k => intNum(tile[k])), size = ['sizeX', 'sizeY', 'sizeZ'].map(k => intNum(tile[k]));
  const mode = (text(tile.mode) ?? 'DATA').toUpperCase();
  if (mode === 'CORNER' || mode === 'DATA' || n === 0) return tile;
  if (pos.some(v => v === null)) return null;
  const p = pos as [number, number, number];
  const int = (value: number): NbtTag => ({ type: 'int', value });
  if (mode === 'LOAD') {
    const r = ROTATIONS.indexOf((text(tile.rotation) ?? 'NONE') as typeof ROTATIONS[number]);
    if (r < 0) return null;
    const q = turnOffset(p, n);
    return { ...tile, posX: int(q[0]), posY: int(q[1]), posZ: int(q[2]), rotation: { type: 'string', value: ROTATIONS[(r + n) % 4]! } };
  }
  if (mode !== 'SAVE' || size.some(v => v === null || v! < 0)) return null;
  const sz = size as [number, number, number];
  if (sz.some(v => v === 0)) { const q = turnOffset(p, n); return { ...tile, posX: int(q[0]), posY: int(q[1]), posZ: int(q[2]) }; }
  const a = turnOffset(p, n), b = turnOffset([p[0] + sz[0] - 1, p[1] + sz[1] - 1, p[2] + sz[2] - 1], n);
  const lo = [0, 1, 2].map(i => Math.min(a[i]!, b[i]!)), hi = [0, 1, 2].map(i => Math.max(a[i]!, b[i]!));
  return { ...tile, posX: int(lo[0]!), posY: int(lo[1]!), posZ: int(lo[2]!), sizeX: int(hi[0]! - lo[0]! + 1), sizeY: int(hi[1]! - lo[1]! + 1), sizeZ: int(hi[2]! - lo[2]! + 1) };
}

/**
 * Transforms one block entity: `position` is the cell's old position, `to` its new one (already computed with
 * the cell rule), `blockId` the block at the cell (fallback for entries without id).
 */
export function transformBlockEntity(entity: BlockEntity, to: Vec3, t: Transform, blockId?: string): BlockEntityTransformResult {
  const turned = t.quarterTurns % 4 !== 0 || t.mirrorX;
  const moved = turned || entity.position.some((v, i) => v !== to[i]);
  const type = blockEntityType(entity.data, blockId);
  const family = type ? nbtFamily(type) : 'unknown';
  const data = moved ? moveOwnFields(entity.data, entity.position, to) : entity.data;
  const out = (resolved: boolean, note?: string): BlockEntityTransformResult =>
    ({ entity: { position: to, data }, resolved, family, type, ...(note !== undefined && { note }) });
  if (!moved) return out(true);
  const name = type ? type.replace(/^minecraft:/, '') : 'ohne Typ';
  const tile = unwrap(entity.data)?.tile ?? {};
  switch (family) {
    case 'relative': return out(true);
    case 'conditional': {
      const fields = worldPositionFields(type!, tile);
      return fields.length ? out(false, `${name}: ${fields.join(', ')} ist eine Weltposition; ohne Adapter unverändert erhalten.`) : out(true);
    }
    case 'command': {
      const cmd = text(tile.Command) ?? '';
      const c = commandCoordinates(cmd);
      if (c.absolute) return out(false, `${name}: Befehl enthält scheinbar feste Koordinaten; unverändert erhalten.`);
      if (c.relative && turned) return out(false, `${name}: relative Koordinaten (~ ^) zeigen nach dem Drehen/Spiegeln woandershin; Befehl unverändert erhalten.`);
      return out(true);
    }
    case 'geometry':
      if (turned && !t.mirrorX && type === 'minecraft:structure_block') {
        const u = unwrap(data), next = u ? turnStructureBlock(u.tile, t.quarterTurns) : null;
        if (u && next) return { entity: { position: to, data: u.tile === u.outer ? { type: 'compound', value: next } : u.wrap(next) }, resolved: true, family, type };
      }
      return turned ? out(false, `${name}: eigener Bereich (Versatz, Größe, Drehung) – Drehen/Spiegeln ohne geprüften Adapter; NBT unverändert erhalten.`) : out(true);
    case 'absolute': return out(false, `${name}: enthält eine Weltposition (Ausgang/Ziel); unverändert erhalten.`);
    default: return out(false, `${name}: BlockEntity-Typ nicht im Profil java-26.3; NBT unverändert erhalten.`);
  }
}
