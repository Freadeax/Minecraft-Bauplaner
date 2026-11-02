import { entityAnchor, entityEquipment, entityFacing, entityId, entityItems, entityKind, entityYaw, paintingInfo } from '../../../../packages/voxel/src/index.js';
import type { BlockState, Cell, FreeEntity, NbtTag } from '../../../../packages/voxel/src/index.js';
import { stateColor } from '../colors';
import { ENTITY_STATE_ID } from './entityShapes.ts';

/** Free entities as extra cells of a view (ENTITY-01); geometry in entityShapes.ts. */
const ARMOR: readonly (readonly [RegExp, string])[] = [
  [/^leather_/, '#8b5a2b'], [/^chainmail_/, '#8e8e8e'], [/^iron_/, '#dcdcdc'], [/^golden_/, '#f2d24a'], [/^diamond_/, '#4fd3d3'],
  [/^netherite_/, '#4a4044'], [/^copper_/, '#c4774f'], [/^turtle_/, '#4caf50'], [/elytra/, '#8c8fb5'],
];
function itemColor(id: string): string {
  const name = id.replace(/^minecraft:/, '');
  for (const [re, c] of ARMOR) if (re.test(name)) return c;
  return stateColor(id.includes(':') ? id : `minecraft:${id}`);
}
// ------------------------------------------------------------------ geometry spec (state properties)
/** Geometry of one entity as plain strings (block state properties), position relative to the anchor cell. */
export function entitySpec(e: FreeEntity): Record<string, string> {
  const a = entityAnchor(e), kind = entityKind(e);
  const r = (n: number) => String(Math.round(n * 1000) / 1000);
  const spec: Record<string, string> = { kind, x: r(e.position[0] - a[0]), y: r(e.position[1] - a[1]), z: r(e.position[2] - a[2]) };
  if (kind === 'painting') {
    const p = paintingInfo(e);
    Object.assign(spec, { facing: entityFacing(e) ?? 'south', w: String(p.width), h: String(p.height), motif: p.variant });
  } else if (kind === 'item_frame' || kind === 'glow_item_frame') {
    const item = entityItems(e).contents[0];
    Object.assign(spec, { facing: entityFacing(e) ?? 'south', item: item ? itemColor(item.id) : '' });
  } else if (kind === 'armor_stand') {
    const eq = entityEquipment(e), d = e.data.type === 'compound' ? e.data.value : {};
    const flag = (t: NbtTag | undefined) => t && (t.type === 'byte' || t.type === 'int') && t.value === 1 ? '1' : '';
    Object.assign(spec, { yaw: r(entityYaw(e)), small: flag(d.Small), arms: flag(d.ShowArms), plate: flag(d.NoBasePlate) ? '' : '1', invisible: flag(d.Invisible),
      head: eq.head ? itemColor(eq.head.id) : '', chest: eq.chest ? itemColor(eq.chest.id) : '', legs: eq.legs ? itemColor(eq.legs.id) : '', feet: eq.feet ? itemColor(eq.feet.id) : '',
      hand: eq.mainhand ? itemColor(eq.mainhand.id) : '' });
  } else {
    spec.yaw = r(entityYaw(e));
    spec.color = stateColor(entityId(e) || 'minecraft:unknown');
  }
  for (const k of Object.keys(spec)) if (spec[k] === '') delete spec[k];
  return spec;
}

// ------------------------------------------------------------------ cells for the views
export interface EntityScene {
  /** Entity cells first (so a real block in the same cell wins the neighbour grid), then the given cells. */
  readonly cells: readonly Cell[];
  readonly palette: readonly BlockState[];
  /** Entity behind an entity cell (for picking and hover). */
  readonly entityOf: (cell: Cell) => FreeEntity | undefined;
  readonly count: number;
}
const NONE: EntityScene['entityOf'] = () => undefined;

/**
 * Adds entity cells to the cells of a view. `filter` limits the entities (e.g. to the visible layers);
 * without entities the input is returned unchanged.
 */
export function withEntities(cells: readonly Cell[], palette: readonly BlockState[], entities: readonly FreeEntity[] | undefined,
  filter?: (anchor: readonly [number, number, number]) => boolean): EntityScene {
  if (!entities?.length) return { cells, palette, entityOf: NONE, count: 0 };
  const extra: BlockState[] = [], index = new Map<string, number>(), byKey = new Map<string, FreeEntity>(), byPos = new Map<string, FreeEntity>(), out: Cell[] = [];
  for (const e of entities) {
    const anchor = entityAnchor(e);
    if (filter && !filter(anchor)) continue;
    const properties = entitySpec(e), key = JSON.stringify(properties);
    let i = index.get(key);
    if (i === undefined) { i = palette.length + extra.length; extra.push({ id: ENTITY_STATE_ID, properties }); index.set(key, i); }
    out.push({ position: anchor, kind: 'block', paletteIndex: i });
    const at = anchor.join(','); byKey.set(`${at}|${i}`, e); if (!byPos.has(at)) byPos.set(at, e);
  }
  if (!out.length) return { cells, palette, entityOf: NONE, count: 0 };
  // By position and state, not object identity: the 3D view reuses mesh sections (and their cell objects) across builds.
  const base = palette.length;
  const entityOf = (c: Cell) => {
    if (c.kind !== 'block' || c.paletteIndex < base) return undefined;
    const at = c.position.join(',');
    return byKey.get(`${at}|${c.paletteIndex}`) ?? byPos.get(at);
  };
  return { cells: [...out, ...cells], palette: [...palette, ...extra], entityOf, count: out.length };
}

/** Y range of the given block cells, for filtering entities like the layer filter of a view. */
export function cellYRange(cells: readonly Cell[]): readonly [number, number] | null {
  let lo = Infinity, hi = -Infinity;
  for (const c of cells) { const y = c.position[1]; if (y < lo) lo = y; if (y > hi) hi = y; }
  return lo <= hi ? [lo, hi] : null;
}
