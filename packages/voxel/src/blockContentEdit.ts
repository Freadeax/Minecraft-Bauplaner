import { blockEntityContent, blockEntityTile, componentText } from './entities.js';
import type { SignText } from './entities.js';
import { blockEntityTypeOf } from './nbtTransforms.js';
import { isProfileItem } from './profile.js';
import type { NbtTag } from './types.js';

/**
 * Editing block contents (EDIT-06, follows ENTITY-01): the items of chests,
 * barrels, shulker boxes, hoppers, dispensers, droppers, crafters, furnaces and
 * brewing stands, the custom name of a container, and the text of signs and
 * hanging signs. Everything works on the stored block entity NBT of one cell:
 * fields the planner does not understand (loot tables, lock, colour, glowing
 * text, item components) are kept as they are, only the edited fields change.
 * Writes the current Java format (26.3): `Items` with `Slot`/`id`/`count`,
 * `front_text`/`back_text` with four `messages` as plain text components.
 */
type Compound = Readonly<Record<string, NbtTag>>;
const comp = (t: NbtTag | undefined): Compound | null => t?.type === 'compound' ? t.value : null;
const text = (t: NbtTag | undefined): string | null => t?.type === 'string' ? t.value : null;
const num = (t: NbtTag | undefined): number | null => t && (t.type === 'byte' || t.type === 'short' || t.type === 'int') ? t.value : null;
const list = (t: NbtTag | undefined): readonly NbtTag[] => t?.type === 'list' ? t.value : [];
const str = (value: string): NbtTag => ({ type: 'string', value });
const byte = (value: number): NbtTag => ({ type: 'byte', value });
const int = (value: number): NbtTag => ({ type: 'int', value });
const namespaced = (id: string) => id.includes(':') ? id.toLowerCase() : `minecraft:${id.toLowerCase()}`;

/** Slots per container block entity type (single chest half: 27; a double chest is two blocks). */
export const CONTAINER_SLOTS: Readonly<Record<string, number>> = Object.freeze({
  'minecraft:chest': 27, 'minecraft:trapped_chest': 27, 'minecraft:barrel': 27, 'minecraft:shulker_box': 27,
  'minecraft:dispenser': 9, 'minecraft:dropper': 9, 'minecraft:crafter': 9, 'minecraft:hopper': 5,
  'minecraft:furnace': 3, 'minecraft:smoker': 3, 'minecraft:blast_furnace': 3, 'minecraft:brewing_stand': 5,
});
/** German names of the special slots of furnaces and brewing stands; other containers count from 1. */
const SLOT_NAMES: Readonly<Record<string, readonly string[]>> = {
  'minecraft:furnace': ['Zutat', 'Brennstoff', 'Ergebnis'], 'minecraft:smoker': ['Zutat', 'Brennstoff', 'Ergebnis'], 'minecraft:blast_furnace': ['Zutat', 'Brennstoff', 'Ergebnis'],
  'minecraft:brewing_stand': ['Flasche links', 'Flasche Mitte', 'Flasche rechts', 'Zutat', 'Lohenstaub'],
};
export const MAX_STACK = 99;
export const SIGN_LINES = 4;
export const SIGN_COLORS: readonly string[] = ['black', 'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red'];

export type ContentKind = 'container' | 'sign';
/** What can be edited in a block of this id, or null. */
export function editableContent(blockId: string): { kind: ContentKind; type: string; slots: number } | null {
  const type = blockEntityTypeOf(blockId);
  if (!type) return null;
  if (type === 'minecraft:sign' || type === 'minecraft:hanging_sign') return { kind: 'sign', type, slots: 0 };
  const slots = CONTAINER_SLOTS[type];
  return slots ? { kind: 'container', type, slots } : null;
}
/** Label of slot `i` (0-based) of a container type: „Platz 1“ … or the furnace/brewing name. */
export function slotLabel(type: string, i: number): string { return SLOT_NAMES[type]?.[i] ?? `Platz ${i + 1}`; }

export interface SlotItem { readonly slot: number; readonly id: string; readonly count: number }
export interface ContainerEdit { readonly items: readonly SlotItem[]; readonly name: string }
export interface SignEdit { readonly front: readonly string[]; readonly back: readonly string[]; readonly waxed: boolean; readonly color: string; readonly glowing: boolean }

/** Tile compound and how to put a changed one back (Sponge keeps it under `Data` next to `Id`/`Pos`). */
function unwrap(data: NbtTag | undefined, type: string): { tile: Compound; wrap: (tile: Compound) => NbtTag } {
  const c = comp(data);
  if (!c) return { tile: { id: str(type) }, wrap: tile => ({ type: 'compound', value: tile }) };
  const inner = comp(c.Data);
  if (inner && (c.Id || c.Pos)) return { tile: inner, wrap: tile => ({ type: 'compound', value: { ...c, Data: { type: 'compound', value: tile } } }) };
  return { tile: c, wrap: tile => ({ type: 'compound', value: tile }) };
}

/** Current items (by slot) and custom name of a container cell; empty for a cell without block entity. */
export function readContainer(data: NbtTag | undefined): ContainerEdit {
  if (!data) return { items: [], name: '' };
  const tile = blockEntityTile(data);
  const items: SlotItem[] = [];
  for (const e of list(tile.Items)) {
    const c = comp(e); const id = text(c?.id); const slot = num(c?.Slot);
    if (!c || !id || slot === null || namespaced(id) === 'minecraft:air') continue;
    items.push({ slot, id: namespaced(id), count: Math.max(1, num(c.count) ?? num(c.Count) ?? 1) });
  }
  items.sort((a, b) => a.slot - b.slot);
  return { items, name: blockEntityContent(data).name ?? '' };
}

/** Problems of a container edit in German; empty when it can be written. */
export function checkContainer(type: string, edit: ContainerEdit): string[] {
  const slots = CONTAINER_SLOTS[type] ?? 0, seen = new Set<number>(), out: string[] = [];
  for (const it of edit.items) {
    const where = slotLabel(type, it.slot);
    if (!Number.isInteger(it.slot) || it.slot < 0 || it.slot >= slots) out.push(`${where}: gibt es in diesem Behälter nicht (${slots} Plätze).`);
    else if (seen.has(it.slot)) out.push(`${where}: doppelt belegt.`);
    seen.add(it.slot);
    if (!it.id.trim()) out.push(`${where}: Gegenstand fehlt.`);
    else if (!isProfileItem(namespaced(it.id.trim()))) out.push(`${where}: „${it.id.trim()}“ ist kein Gegenstand in Java 26.3.`);
    if (!Number.isInteger(it.count) || it.count < 1 || it.count > MAX_STACK) out.push(`${where}: Anzahl muss zwischen 1 und ${MAX_STACK} liegen.`);
  }
  if (edit.name.length > 50) out.push('Name: höchstens 50 Zeichen (wie am Amboss).');
  return out;
}

/**
 * New block entity NBT with `edit` applied to a container. Unchanged slots keep their stored item compound
 * (enchantments, components …); other tile fields stay. Throws with the first problem of {@link checkContainer}.
 */
export function withContainer(data: NbtTag | undefined, blockId: string, edit: ContainerEdit): NbtTag {
  const info = editableContent(blockId);
  if (info?.kind !== 'container') throw new Error(`${blockId} ist kein Behälter mit Plätzen.`);
  const problems = checkContainer(info.type, edit);
  if (problems.length) throw new Error(problems[0]);
  const { tile, wrap } = unwrap(data, info.type);
  const before = new Map<number, Compound>();
  for (const e of list(tile.Items)) { const c = comp(e); const s = num(c?.Slot); if (c && s !== null) before.set(s, c); }
  const items: NbtTag[] = [...edit.items].sort((a, b) => a.slot - b.slot).map(it => {
    const id = namespaced(it.id.trim()), old = before.get(it.slot);
    const keep = old && text(old.id) && namespaced(text(old.id)!) === id ? old : {};
    const { Count: _legacy, ...rest } = keep as Record<string, NbtTag>;
    return { type: 'compound', value: { ...rest, Slot: byte(it.slot), id: str(id), count: int(it.count) } };
  });
  const next: Record<string, NbtTag> = { ...tile };
  if (!text(next.id)) next.id = str(info.type);
  if (items.length) next.Items = { type: 'list', elementType: 'compound', value: items }; else delete next.Items;
  const name = edit.name.trim();
  if (name) next.CustomName = str(name); else delete next.CustomName;
  return wrap(next);
}

const side = (t: NbtTag | undefined): { lines: string[]; color: string; glowing: boolean } => {
  const c = comp(t);
  const lines = list(c?.messages).map(m => componentText(m));
  while (lines.length < SIGN_LINES) lines.push('');
  return { lines: lines.slice(0, SIGN_LINES), color: text(c?.color) ?? 'black', glowing: num(c?.has_glowing_text) === 1 };
};
/** Sign text for editing: both sides, waxed, colour and glow of the front (old Text1…4 signs read as front). */
export function readSign(data: NbtTag | undefined): SignEdit {
  if (!data) return { front: ['', '', '', ''], back: ['', '', '', ''], waxed: false, color: 'black', glowing: false };
  const tile = blockEntityTile(data);
  if (!tile.front_text && !tile.back_text && (tile.Text1 || tile.Text2 || tile.Text3 || tile.Text4)) {
    const sign: SignText | undefined = blockEntityContent(data).sign;
    return { front: [...(sign?.front ?? []), '', '', '', ''].slice(0, SIGN_LINES), back: ['', '', '', ''], waxed: false, color: text(tile.Color) ?? 'black', glowing: num(tile.GlowingText) === 1 };
  }
  const f = side(tile.front_text), b = side(tile.back_text);
  return { front: f.lines, back: b.lines, waxed: num(tile.is_waxed) === 1, color: f.color, glowing: f.glowing };
}

/** Problems of a sign edit; empty when it can be written. */
export function checkSign(edit: SignEdit): string[] {
  const out: string[] = [];
  if (edit.front.length > SIGN_LINES || edit.back.length > SIGN_LINES) out.push(`Ein Schild hat ${SIGN_LINES} Zeilen je Seite.`);
  [...edit.front, ...edit.back].forEach((l, i) => { if (l.length > 90) out.push(`Zeile ${i % SIGN_LINES + 1}: höchstens 90 Zeichen.`); });
  if (!SIGN_COLORS.includes(edit.color)) out.push(`Farbe „${edit.color}“ gibt es für Schilder nicht.`);
  return out;
}

/**
 * New block entity NBT with the sign text of `edit`. The front colour/glow follow the edit; the back keeps
 * its own colour and glow. Old Text1…4 fields are replaced by the current format.
 */
export function withSign(data: NbtTag | undefined, blockId: string, edit: SignEdit): NbtTag {
  const info = editableContent(blockId);
  if (info?.kind !== 'sign') throw new Error(`${blockId} ist kein Schild.`);
  const problems = checkSign(edit);
  if (problems.length) throw new Error(problems[0]);
  const { tile, wrap } = unwrap(data, info.type);
  const messages = (lines: readonly string[]): NbtTag => ({ type: 'list', elementType: 'string', value: [...lines, '', '', '', ''].slice(0, SIGN_LINES).map(l => str(l)) });
  const sideTag = (old: NbtTag | undefined, lines: readonly string[], color: string, glowing: boolean): NbtTag => ({
    type: 'compound', value: { ...(comp(old) ?? {}), messages: messages(lines), color: str(color), has_glowing_text: byte(glowing ? 1 : 0) },
  });
  const back = side(tile.back_text);
  const next: Record<string, NbtTag> = { ...tile };
  for (const k of ['Text1', 'Text2', 'Text3', 'Text4', 'Color', 'GlowingText']) delete next[k];
  if (!text(next.id)) next.id = str(info.type);
  next.front_text = sideTag(tile.front_text, edit.front, edit.color, edit.glowing);
  next.back_text = sideTag(tile.back_text, edit.back, back.color, back.glowing);
  next.is_waxed = byte(edit.waxed ? 1 : 0);
  return wrap(next);
}
