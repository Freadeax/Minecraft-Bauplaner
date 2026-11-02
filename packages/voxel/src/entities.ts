import type { FreeEntity, NbtTag, Transform, Vec3 } from './types.js';
import { transformDirection, transformVector } from './states.js';
import type { Direction } from './states.js';

/**
 * Free entities and block entity contents (ENTITY-01): paintings, item frames,
 * armor stands and the readable content of signs, containers and banners.
 *
 * Contract (docs/architecture/ENTITIES.md):
 *  - `FreeEntity.position` is the exact entity position in the payload frame
 *    (Minecraft `Pos`); position fields inside `data` are stripped on import
 *    and derived again on export (`entityExportData`).
 *  - Hanging entities (paintings, frames) are anchored in the free block cell
 *    in front of the wall they hang on, as Minecraft's `block_pos`/`TileX`;
 *    the anchor is derived from position, facing and size, never stored.
 *  - Everything not understood stays unchanged in `data`.
 */

export type EntityKind = 'painting' | 'item_frame' | 'glow_item_frame' | 'armor_stand' | 'other';
export type Facing = Direction;
type Compound = Readonly<Record<string, NbtTag>>;

// ------------------------------------------------------------------ NBT helpers
const comp = (t: NbtTag | undefined): Compound | null => t?.type === 'compound' ? t.value : null;
const text = (t: NbtTag | undefined): string | null => t?.type === 'string' ? t.value : null;
const num = (t: NbtTag | undefined): number | null => t && (t.type === 'byte' || t.type === 'short' || t.type === 'int' || t.type === 'float' || t.type === 'double') ? t.value : null;
const items = (t: NbtTag | undefined): readonly NbtTag[] => t?.type === 'list' ? t.value : [];
const byte = (value: number): NbtTag => ({ type: 'byte', value });
const int = (value: number): NbtTag => ({ type: 'int', value });
const str = (value: string): NbtTag => ({ type: 'string', value });
const float = (value: number): NbtTag => ({ type: 'float', value: Object.is(Math.fround(value), -0) ? 0 : Math.fround(value) });
const double = (value: number): NbtTag => ({ type: 'double', value: Object.is(value, -0) ? 0 : value });
const namespaced = (id: string) => id.includes(':') ? id : `minecraft:${id}`;

/** Fields that only describe where an entity is; `position` replaces them. */
export const ENTITY_POSITION_FIELDS: readonly string[] = ['Pos', 'TileX', 'TileY', 'TileZ', 'block_pos'];

export function entityId(e: Pick<FreeEntity, 'data'>): string {
  const id = text(comp(e.data)?.id) ?? text(comp(e.data)?.Id);
  return id ? namespaced(id.toLowerCase()) : '';
}
export function entityKind(e: Pick<FreeEntity, 'data'>): EntityKind {
  switch (entityId(e)) {
    case 'minecraft:painting': return 'painting';
    case 'minecraft:item_frame': return 'item_frame';
    case 'minecraft:glow_item_frame': return 'glow_item_frame';
    case 'minecraft:armor_stand': return 'armor_stand';
    default: return 'other';
  }
}
export const isHanging = (kind: EntityKind) => kind === 'painting' || kind === 'item_frame' || kind === 'glow_item_frame';

// ------------------------------------------------------------------ paintings
/** Vanilla painting variants (Java 1.21–26.x) with width × height in blocks. */
export const PAINTING_VARIANTS: Readonly<Record<string, readonly [number, number]>> = Object.freeze({
  alban: [1, 1], aztec: [1, 1], aztec2: [1, 1], bomb: [1, 1], kebab: [1, 1], meditative: [1, 1], plant: [1, 1], wasteland: [1, 1],
  graham: [1, 2], prairie_ride: [1, 2], wanderer: [1, 2],
  courbet: [2, 1], creebet: [2, 1], pool: [2, 1], sea: [2, 1], sunset: [2, 1],
  baroque: [2, 2], bust: [2, 2], earth: [2, 2], fire: [2, 2], humble: [2, 2], match: [2, 2], skull_and_roses: [2, 2], stage: [2, 2],
  void: [2, 2], water: [2, 2], wind: [2, 2], wither: [2, 2],
  bouquet: [3, 3], cavebird: [3, 3], cotan: [3, 3], dennis: [3, 3], endboss: [3, 3], fern: [3, 3], owlemons: [3, 3], sunflowers: [3, 3], tides: [3, 3],
  backyard: [3, 4], pond: [3, 4],
  changing: [4, 2], fighters: [4, 2], finding: [4, 2], lowmist: [4, 2], passage: [4, 2],
  donkey_kong: [4, 3], skeleton: [4, 3],
  burning_skull: [4, 4], orb: [4, 4], pigscene: [4, 4], pointer: [4, 4], unpacked: [4, 4],
});

export interface PaintingInfo { readonly variant: string; readonly width: number; readonly height: number; readonly known: boolean }
/** `variant` (1.19+), `Motive` (1.13–1.18, 1.12 in CamelCase) or an inline variant compound with width/height. */
export function paintingInfo(e: Pick<FreeEntity, 'data'>): PaintingInfo {
  const d = comp(e.data) ?? {};
  const inline = comp(d.variant);
  if (inline) {
    const w = num(inline.width) ?? 1, h = num(inline.height) ?? 1;
    return { variant: text(inline.asset_id) ?? 'eigenes Motiv', width: Math.max(1, Math.min(16, w)), height: Math.max(1, Math.min(16, h)), known: false };
  }
  const raw = text(d.variant) ?? text(d.Motive) ?? 'minecraft:kebab';
  const name = raw.replace(/^minecraft:/, '').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  const size = PAINTING_VARIANTS[name];
  return { variant: raw.includes(':') ? raw.toLowerCase() : `minecraft:${name}`, width: size?.[0] ?? 1, height: size?.[1] ?? 1, known: size !== undefined };
}

// ------------------------------------------------------------------ facing
const FACING_2D: readonly Facing[] = ['south', 'west', 'north', 'east'];
const FACING_3D: readonly Facing[] = ['down', 'up', 'north', 'south', 'west', 'east'];
const VEC: Readonly<Record<Facing, Vec3>> = { north: [0, 0, -1], south: [0, 0, 1], west: [-1, 0, 0], east: [1, 0, 0], up: [0, 1, 0], down: [0, -1, 0] };
const CCW: Readonly<Record<Facing, Facing>> = { north: 'west', west: 'south', south: 'east', east: 'north', up: 'up', down: 'down' };

/** Direction the front of a hanging entity faces (away from the wall); null for other entities. */
export function entityFacing(e: Pick<FreeEntity, 'data'>): Facing | null {
  const kind = entityKind(e), d = comp(e.data) ?? {};
  if (kind === 'painting') {
    const v = num(d.facing) ?? num(d.Facing) ?? num(d.Direction);
    return v !== null ? FACING_2D[((v % 4) + 4) % 4]! : 'south';
  }
  if (kind === 'item_frame' || kind === 'glow_item_frame') {
    const v = num(d.Facing) ?? num(d.facing);
    return v !== null && v >= 0 && v < 6 ? FACING_3D[v]! : 'south';
  }
  return null;
}
function withFacing(data: Compound, kind: EntityKind, facing: Facing): Compound {
  if (kind === 'painting') {
    const key = 'facing' in data ? 'facing' : 'Facing' in data ? 'Facing' : 'facing';
    return { ...data, [key]: byte(FACING_2D.indexOf(facing)) };
  }
  const key = 'Facing' in data ? 'Facing' : 'facing' in data ? 'facing' : 'Facing';
  return { ...data, [key]: byte(FACING_3D.indexOf(facing)) };
}

const half = (n: number) => n % 2 === 0 ? 0.5 : 0;
/** Offset from the anchor cell's minimum corner to the entity position (Minecraft's HangingEntity box centre). */
function hangingOffset(kind: EntityKind, facing: Facing, size: readonly [number, number]): [number, number, number] {
  const f = VEC[facing], side = VEC[CCW[facing]];
  const [w, h] = kind === 'painting' && facing !== 'up' && facing !== 'down' ? size : [1, 1];
  const o: [number, number, number] = [0.5 - f[0] * 0.46875, 0.5 - f[1] * 0.46875, 0.5 - f[2] * 0.46875];
  for (let i = 0; i < 3; i++) o[i] = o[i]! + side[i]! * half(w) + (i === 1 ? half(h) : 0);
  return o;
}
const sizeOf = (e: Pick<FreeEntity, 'data'>): readonly [number, number] => {
  if (entityKind(e) !== 'painting') return [1, 1];
  const p = paintingInfo(e); return [p.width, p.height];
};

/** Integer cell the entity belongs to: the free cell in front of the wall for hanging entities, else the cell it stands in. */
export function entityAnchor(e: FreeEntity): Vec3 {
  const kind = entityKind(e), facing = entityFacing(e), p = e.position;
  if (facing && isHanging(kind)) {
    const o = hangingOffset(kind, facing, sizeOf(e));
    return [Math.round(p[0] - o[0]), Math.round(p[1] - o[1]), Math.round(p[2] - o[2])];
  }
  return [Math.floor(p[0] + 1e-6), Math.floor(p[1] + 1e-6), Math.floor(p[2] + 1e-6)];
}
/** Exact position of a hanging entity anchored in `anchor` (inverse of entityAnchor). */
export function hangingPosition(kind: EntityKind, anchor: Vec3, facing: Facing, size: readonly [number, number] = [1, 1]): [number, number, number] {
  const o = hangingOffset(kind, facing, size);
  return [anchor[0] + o[0], anchor[1] + o[1], anchor[2] + o[2]];
}
/** Cells a hanging entity covers (paintings span width × height), for layers and conflicts. */
export function entityCells(e: FreeEntity): Vec3[] {
  const a = entityAnchor(e), kind = entityKind(e), facing = entityFacing(e);
  if (kind !== 'painting' || !facing || facing === 'up' || facing === 'down') return [a];
  const [w, h] = sizeOf(e), side = VEC[CCW[facing]];
  // The anchor is the cell left of / below the centre for even sizes, as in Minecraft.
  const x0 = -Math.floor((w - 1) / 2), y0 = -Math.floor((h - 1) / 2), out: Vec3[] = [];
  for (let i = x0; i < x0 + w; i++) for (let j = y0; j < y0 + h; j++) out.push([a[0] + side[0] * i, a[1] + j, a[2] + side[2] * i]);
  return out;
}

// ------------------------------------------------------------------ transformation
export interface EntityTransformResult { readonly entity: FreeEntity; readonly resolved: boolean; readonly note?: string }
const yawVector = (yaw: number): [number, number] => { const r = yaw * Math.PI / 180; return [-Math.sin(r), Math.cos(r)]; };
const yawOf = (x: number, z: number): number => { const y = Math.round(Math.atan2(-x, z) * 180 / Math.PI * 1000) / 1000; return y <= -180 ? y + 360 : y; };

/** Rigid transform about `pivot` (same rule as cells): position, facing, yaw and the item rotation in frames. */
export function transformEntity(e: FreeEntity, pivot: Vec3, t: Transform): EntityTransformResult {
  const r = transformVector([e.position[0] - pivot[0], e.position[1] - pivot[1], e.position[2] - pivot[2]], t);
  const position: [number, number, number] = [r[0] + t.position[0], r[1] + t.position[1], r[2] + t.position[2]];
  let data = comp(e.data);
  if (!data) return { entity: { position, data: e.data }, resolved: false, note: 'Entity ohne Compound' };
  const kind = entityKind(e), facing = entityFacing(e);
  let resolved = true, note: string | undefined;
  if (facing && isHanging(kind)) {
    const next = transformDirection(facing, t);
    data = withFacing(data, kind, next);
    if ((kind === 'item_frame' || kind === 'glow_item_frame') && data.Item) {
      const rot = num(data.ItemRotation) ?? 0;
      if (facing === 'up' || facing === 'down') {
        if (t.quarterTurns || t.mirrorX) { resolved = false; note = 'Drehung des Gegenstands in einem liegenden Rahmen ist nicht geprüft; Gegenstand unverändert.'; }
      } else if (t.mirrorX && rot) data = { ...data, ItemRotation: byte((8 - rot) % 8) };
    }
  }
  const rotation = data.Rotation;
  if (rotation?.type === 'list' && rotation.value.length >= 1 && rotation.value[0]!.type === 'float' && (t.quarterTurns || t.mirrorX)) {
    const [x, z] = yawVector(num(rotation.value[0]) ?? 0);
    const v = transformVector([x, 0, z], t);
    data = { ...data, Rotation: { type: 'list', elementType: 'float', value: [float(yawOf(v[0], v[2])), ...rotation.value.slice(1)] } };
  }
  return { entity: { position, data: { type: 'compound', value: data } }, resolved, ...(note && { note }) };
}

// ------------------------------------------------------------------ import / export
/** Entity from a file entry: position in the payload frame, position fields removed from the data. */
export function importEntity(data: NbtTag, position: readonly [number, number, number]): FreeEntity {
  const d = comp(data) ?? {};
  const rest: Record<string, NbtTag> = {};
  for (const [k, v] of Object.entries(d)) if (!ENTITY_POSITION_FIELDS.includes(k)) rest[k] = v;
  return { position, data: { type: 'compound', value: rest } };
}
/** Minecraft `Pos` of an NBT entry, or null. */
export function nbtPos(data: NbtTag | undefined): [number, number, number] | null {
  const pos = comp(data)?.Pos;
  if (pos?.type !== 'list' || pos.value.length !== 3) return null;
  const v = pos.value.map(num);
  return v.every(n => n !== null && Number.isFinite(n)) ? v as [number, number, number] : null;
}
/**
 * Full NBT for a file: `Pos` = position − origin, hanging entities also `TileX/Y/Z` and `block_pos`
 * (older and newer Minecraft read one of them and ignore the other), id with namespace.
 */
export function entityExportData(e: FreeEntity, origin: Vec3): Compound {
  const d = comp(e.data) ?? {};
  const out: Record<string, NbtTag> = { ...d };
  out.id = str(entityId(e) || 'minecraft:unknown');
  delete out.Id;
  out.Pos = { type: 'list', elementType: 'double', value: [0, 1, 2].map(i => double(e.position[i]! - origin[i]!)) };
  if (isHanging(entityKind(e))) {
    const a = entityAnchor(e), rel = [a[0] - origin[0], a[1] - origin[1], a[2] - origin[2]];
    out.TileX = int(rel[0]!); out.TileY = int(rel[1]!); out.TileZ = int(rel[2]!);
    out.block_pos = { type: 'intArray', value: rel };
  }
  return out;
}

// ------------------------------------------------------------------ items
export interface ItemStack { readonly id: string; readonly count: number; readonly slot?: number | string; readonly name?: string }
/** `{id, count}` (1.20.5+) or `{id, Count}`; null for air or missing id. */
export function itemStack(tag: NbtTag | undefined, slot?: number | string): ItemStack | null {
  const c = comp(tag); if (!c) return null;
  const id = text(c.id); if (!id) return null;
  const full = namespaced(id);
  if (full === 'minecraft:air') return null;
  const count = num(c.count) ?? num(c.Count) ?? 1;
  const name = customName(c);
  return { id: full, count: Math.max(1, Math.floor(count)), ...(slot !== undefined && { slot }), ...(name && { name }) };
}
function customName(c: Compound): string | null {
  const components = comp(c.components);
  const raw = components?.['minecraft:custom_name'] ?? comp(comp(c.tag)?.display)?.Name ?? c.CustomName;
  if (!raw) return null;
  const t = componentText(raw).trim();
  return t || null;
}

export type EquipmentSlot = 'head' | 'chest' | 'legs' | 'feet' | 'mainhand' | 'offhand';
export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ['head', 'chest', 'legs', 'feet', 'mainhand', 'offhand'];
/** Armor stand (or mob) equipment: `equipment` (1.21.5+) or ArmorItems [feet, legs, chest, head] + HandItems [main, off]. */
export function entityEquipment(e: Pick<FreeEntity, 'data'>): Partial<Record<EquipmentSlot, ItemStack>> {
  const d = comp(e.data) ?? {}, out: Partial<Record<EquipmentSlot, ItemStack>> = {};
  const eq = comp(d.equipment);
  if (eq) for (const slot of EQUIPMENT_SLOTS) { const s = itemStack(eq[slot], slot); if (s) out[slot] = s; }
  const armor = items(d.ArmorItems), hands = items(d.HandItems);
  (['feet', 'legs', 'chest', 'head'] as const).forEach((slot, i) => { const s = itemStack(armor[i], slot); if (s && !out[slot]) out[slot] = s; });
  (['mainhand', 'offhand'] as const).forEach((slot, i) => { const s = itemStack(hands[i], slot); if (s && !out[slot]) out[slot] = s; });
  return out;
}

const PLACEABLE_ENTITY_ITEMS = /^minecraft:(minecart|chest_minecart|furnace_minecart|hopper_minecart|tnt_minecart|command_block_minecart|end_crystal|[a-z_]+_(boat|raft))$/;
export interface EntityItems {
  /** Item a player uses to place the entity; null for mobs and unknown entities. */
  readonly placement: string | null;
  /** Items shown or worn by it (frame content, armor, hands). */
  readonly contents: readonly ItemStack[];
}
export function entityItems(e: FreeEntity): EntityItems {
  const id = entityId(e), kind = entityKind(e), d = comp(e.data) ?? {};
  if (kind === 'painting') return { placement: 'minecraft:painting', contents: [] };
  if (kind === 'item_frame' || kind === 'glow_item_frame') {
    const item = itemStack(d.Item);
    return { placement: id, contents: item ? [item] : [] };
  }
  const worn = Object.values(entityEquipment(e)).filter((s): s is ItemStack => !!s);
  if (kind === 'armor_stand') return { placement: 'minecraft:armor_stand', contents: worn };
  if (id === 'minecraft:leash_knot') return { placement: 'minecraft:lead', contents: [] };
  if (PLACEABLE_ENTITY_ITEMS.test(id)) return { placement: id, contents: [] };
  return { placement: null, contents: worn };
}

// ------------------------------------------------------------------ block entity contents
/** Plain text of a text component: JSON string, SNBT-like compound, list or literal (1.21.5+). */
export function componentText(tag: NbtTag | string): string {
  const fromJson = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(fromJson).join('');
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const own = typeof o.text === 'string' ? o.text : typeof o.translate === 'string' ? (typeof o.fallback === 'string' ? o.fallback : o.translate) : '';
      return own + (Array.isArray(o.extra) ? o.extra.map(fromJson).join('') : '');
    }
    return v === undefined || v === null ? '' : String(v);
  };
  if (typeof tag === 'string') {
    const s = tag.trim();
    if (s.startsWith('{') || s.startsWith('[') || s.startsWith('"')) { try { return fromJson(JSON.parse(s)); } catch { /* literal */ } }
    return tag;
  }
  if (tag.type === 'string') return componentText(tag.value);
  if (tag.type === 'list') return tag.value.map(t => componentText(t)).join('');
  if (tag.type === 'compound') {
    const c = tag.value;
    const own = text(c.text) ?? (text(c.translate) ? (text(c.fallback) ?? text(c.translate)!) : '');
    return own + items(c.extra).map(t => componentText(t)).join('');
  }
  return '';
}

export const DYE_COLORS: readonly string[] = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
export interface BannerPattern { readonly pattern: string; readonly color: string }
export interface SignText { readonly front: readonly string[]; readonly back: readonly string[]; readonly waxed: boolean }
export interface BlockEntityContent {
  readonly id: string;
  /** Stored items (chests, barrels, shulker boxes, hoppers, furnaces, pots, lecterns, jukeboxes …). */
  readonly items: readonly ItemStack[];
  readonly sign?: SignText;
  readonly patterns?: readonly BannerPattern[];
  readonly name?: string;
}
/** The tile compound itself: Sponge entries keep it under `Data`, Litematica and worlds store it flat. */
export function blockEntityTile(data: NbtTag): Compound {
  const c = comp(data) ?? {};
  const inner = comp(c.Data);
  if (inner && (c.Id || c.Pos)) return { ...inner, ...(c.Id && !inner.id && { id: c.Id }) };
  return c;
}
const signLines = (side: NbtTag | undefined): string[] => {
  const messages = items(comp(side)?.messages);
  return messages.map(m => componentText(m));
};
/** Readable content of a block entity; nothing is invented, unknown fields are ignored. */
export function blockEntityContent(data: NbtTag): BlockEntityContent {
  const t = blockEntityTile(data);
  const id = namespaced(text(t.id) ?? '');
  const out: { id: string; items: ItemStack[]; sign?: SignText; patterns?: BannerPattern[]; name?: string } = { id, items: [] };
  for (const entry of items(t.Items)) {
    const c = comp(entry); const slot = num(c?.Slot ?? undefined);
    const s = itemStack(entry, slot ?? undefined); if (s) out.items.push(s);
  }
  for (const key of ['item', 'Book', 'RecordItem', 'book', 'record_item']) { const s = itemStack(t[key], key); if (s) out.items.push(s); }
  if (t.front_text || t.back_text) {
    out.sign = { front: signLines(t.front_text), back: signLines(t.back_text), waxed: num(t.is_waxed) === 1 };
  } else if (t.Text1 || t.Text2 || t.Text3 || t.Text4) {
    out.sign = { front: ['Text1', 'Text2', 'Text3', 'Text4'].map(k => t[k] ? componentText(t[k]!) : ''), back: [], waxed: false };
  }
  const patterns = items(t.patterns).length ? items(t.patterns) : items(t.Patterns);
  if (patterns.length) {
    out.patterns = patterns.map(p => {
      const c = comp(p) ?? {};
      const pattern = text(c.pattern) ?? text(comp(c.pattern)?.asset_id) ?? text(c.Pattern) ?? '?';
      const colorNum = num(c.Color);
      const color = text(c.color) ?? (colorNum !== null ? DYE_COLORS[colorNum] ?? String(colorNum) : '?');
      return { pattern: pattern.replace(/^minecraft:/, ''), color };
    });
  }
  const name = t.CustomName ? componentText(t.CustomName).trim() : (t.custom_name ? componentText(t.custom_name).trim() : '');
  if (name) out.name = name;
  return out;
}
export const hasContent = (c: BlockEntityContent): boolean =>
  c.items.length > 0 || !!c.name || !!c.patterns?.length || !!c.sign && [...c.sign.front, ...c.sign.back].some(l => l.trim() !== '');

// ------------------------------------------------------------------ factories (Werkstatt)
const itemTag = (id: string, count = 1): NbtTag => ({ type: 'compound', value: { id: str(namespaced(id)), count: int(count) } });
/** Painting in the current Java format (`variant`, `facing` as 2D data value). Only horizontal facings exist. */
export function makePainting(anchor: Vec3, facing: Facing, variant: string): FreeEntity {
  if (facing === 'up' || facing === 'down') throw new Error('Gemälde hängen nur an Wänden.');
  const v = namespaced(variant);
  const probe: FreeEntity = { position: [0, 0, 0], data: { type: 'compound', value: { id: str('minecraft:painting'), variant: str(v) } } };
  const p = paintingInfo(probe);
  return { position: hangingPosition('painting', anchor, facing, [p.width, p.height]),
    data: { type: 'compound', value: { id: str('minecraft:painting'), variant: str(v), facing: byte(FACING_2D.indexOf(facing)) } } };
}
export function makeItemFrame(anchor: Vec3, facing: Facing, item: string | null, glow = false): FreeEntity {
  const id = glow ? 'minecraft:glow_item_frame' : 'minecraft:item_frame';
  const value: Record<string, NbtTag> = { id: str(id), Facing: byte(FACING_3D.indexOf(facing)) };
  if (item) { value.Item = itemTag(item); value.ItemRotation = byte(0); }
  return { position: hangingPosition('item_frame', anchor, facing), data: { type: 'compound', value } };
}
/** Armor stand standing in `cell` (feet on its floor), looking towards `facing`. */
export function makeArmorStand(cell: Vec3, facing: Facing, equipment: Partial<Record<EquipmentSlot, string>> = {}, options: { arms?: boolean; small?: boolean } = {}): FreeEntity {
  const v = VEC[facing === 'up' || facing === 'down' ? 'south' : facing];
  const value: Record<string, NbtTag> = { id: str('minecraft:armor_stand'), Rotation: { type: 'list', elementType: 'float', value: [float(yawOf(v[0], v[2])), float(0)] } };
  const eq = Object.entries(equipment).filter(([, id]) => !!id);
  if (eq.length) value.equipment = { type: 'compound', value: Object.fromEntries(eq.map(([slot, id]) => [slot, itemTag(id!)])) };
  if (options.arms) value.ShowArms = byte(1);
  if (options.small) value.Small = byte(1);
  return { position: [cell[0] + 0.5, cell[1], cell[2] + 0.5], data: { type: 'compound', value } };
}
/** Yaw of an entity in degrees (0 = looking south), 0 when absent. */
export function entityYaw(e: Pick<FreeEntity, 'data'>): number {
  const r = comp(e.data)?.Rotation;
  return r?.type === 'list' && r.value.length ? num(r.value[0]) ?? 0 : 0;
}

// ------------------------------------------------------------------ labels
const pretty = (id: string) => id.replace(/^minecraft:/, '').replace(/_/g, ' ');
const KIND_LABEL: Readonly<Record<EntityKind, string>> = { painting: 'Gemälde', item_frame: 'Rahmen', glow_item_frame: 'Leuchtrahmen', armor_stand: 'Rüstungsständer', other: 'Entity' };
export function entityKindLabel(kind: EntityKind): string { return KIND_LABEL[kind]; }
/** Short German label: „Gemälde kebab (1×1)“, „Rahmen mit diamond sword“, „Rüstungsständer mit 4 Teilen“. */
export function entityLabel(e: FreeEntity): string {
  const kind = entityKind(e);
  if (kind === 'painting') { const p = paintingInfo(e); return `Gemälde ${pretty(p.variant)} (${p.width}×${p.height})`; }
  if (kind === 'item_frame' || kind === 'glow_item_frame') {
    const item = entityItems(e).contents[0];
    return item ? `${KIND_LABEL[kind]} mit ${pretty(item.id)}${item.name ? ` „${item.name}“` : ''}` : `${KIND_LABEL[kind]} (leer)`;
  }
  if (kind === 'armor_stand') {
    const n = entityItems(e).contents.length;
    return n ? `Rüstungsständer mit ${n} ${n === 1 ? 'Teil' : 'Teilen'}` : 'Rüstungsständer (leer)';
  }
  return `Entity ${pretty(entityId(e) || 'ohne id')}`;
}
/** Entities sorted by anchor (Y, Z, X) and label, for lists and guides. */
export function sortedEntities(list: readonly FreeEntity[]): FreeEntity[] {
  return [...list].sort((a, b) => {
    const p = entityAnchor(a), q = entityAnchor(b);
    return p[1] - q[1] || p[2] - q[2] || p[0] - q[0] || entityLabel(a).localeCompare(entityLabel(b));
  });
}
