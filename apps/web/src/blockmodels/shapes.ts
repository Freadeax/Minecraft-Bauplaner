import { blockLook } from './colors26.ts';
import type { BakedBlock, BakedQuad, FaceName } from './model.ts';
import { FACE_NAMES } from './model.ts';

/**
 * Own block shapes (Blockdarstellung ohne Texturquelle): stairs, slabs, walls,
 * fences, gates, panes, doors, trapdoors, buttons, plates, carpets, snow,
 * torches, signs, banners, heads, beds, chests, rails, ladders, vines, plants
 * and liquids follow their block state; every other vanilla block uses the
 * silhouette class from the generated list (cross plant, crop, pot, box).
 * Geometry written for this project, no Mojang models. Painted with average
 * colours or, for blocks that Minecraft draws as entities, with a texture of
 * the loaded source (particle sprite).
 */
export interface Paint {
  readonly top: string;
  readonly side: string;
  readonly bottom: string;
  readonly translucent?: boolean;
}
type Props = Readonly<Record<string, string>>;
type V3 = readonly [number, number, number];

const CORNERS: Readonly<Record<FaceName, readonly (readonly [number, number, number])[]>> = {
  north: [[1, 1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]], south: [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]],
  west: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]], east: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]],
  up: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], down: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
};
const uvOf = (face: FaceName, p: V3): [number, number] => {
  switch (face) {
    case 'up': return [p[0], p[2]];
    case 'down': return [p[0], 1 - p[2]];
    case 'north': return [1 - p[0], 1 - p[1]];
    case 'south': return [p[0], 1 - p[1]];
    case 'west': return [p[2], 1 - p[1]];
    case 'east': return [1 - p[2], 1 - p[1]];
  }
};
const ON_BOUNDARY: Readonly<Record<FaceName, (f: V3, t: V3) => boolean>> = {
  down: f => f[1] === 0, up: (_f, t) => t[1] === 16, north: f => f[2] === 0, south: (_f, t) => t[2] === 16, west: f => f[0] === 0, east: (_f, t) => t[0] === 16,
};

let partSeq = 0;
/** Axis-aligned box in 1/16 block units. */
export function box(from: V3, to: V3, paint: Paint, faces: readonly FaceName[] = FACE_NAMES): BakedQuad[] {
  const out: BakedQuad[] = [];
  // Closed boxes carry a part number, so the print export can read the solid back after rotations.
  const part = faces.length === 6 ? ++partSeq : undefined;
  for (const face of faces) {
    const pts: V3[] = CORNERS[face].map(([a, b, c]) => [(a ? to[0] : from[0]) / 16, (b ? to[1] : from[1]) / 16, (c ? to[2] : from[2]) / 16]);
    out.push({
      pos: pts.flat(), uv: pts.flatMap(p => uvOf(face, p)),
      sprite: face === 'up' ? paint.top : face === 'down' ? paint.bottom : paint.side,
      tint: -1, cull: ON_BOUNDARY[face](from, to) ? face : null, shade: face, translucent: paint.translucent === true,
      ...(part !== undefined && { part }),
    });
  }
  return out;
}

/** A vertical double-sided plane from (x0,z0) to (x1,z1), heights in 1/16. */
function plane(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, sprite: string): BakedQuad[] {
  const a: V3 = [x0 / 16, y1 / 16, z0 / 16], b: V3 = [x0 / 16, y0 / 16, z0 / 16], c: V3 = [x1 / 16, y0 / 16, z1 / 16], d: V3 = [x1 / 16, y1 / 16, z1 / 16];
  const uv = [0, 0, 0, 1, 1, 1, 1, 0];
  const q = (pts: V3[]): BakedQuad => ({ pos: pts.flat(), uv, sprite, tint: -1, cull: null, shade: 'north', translucent: false });
  return [q([a, b, c, d]), q([d, c, b, a])];
}
const cross = (sprite: string, h = 16) => [...plane(1.6, 1.6, 14.4, 14.4, 0, h, sprite), ...plane(1.6, 14.4, 14.4, 1.6, 0, h, sprite)];
const crop = (sprite: string, h = 16) => [...plane(4, 0, 4, 16, 0, h, sprite), ...plane(12, 0, 12, 16, 0, h, sprite), ...plane(0, 4, 16, 4, 0, h, sprite), ...plane(0, 12, 16, 12, 0, h, sprite)];
/** Flat face lying on the floor (rails, wire, carpets of petals). */
const flat = (sprite: string, y = 0.25, inset = 0) => box([inset, 0, inset], [16 - inset, y, 16 - inset], { top: sprite, side: sprite, bottom: sprite }, ['up', 'down']);

// ------------------------------------------------------------------ transforms
const HORIZONTAL: readonly FaceName[] = ['north', 'east', 'south', 'west'];
const turnFace = (f: FaceName | null, q: number): FaceName | null => f && HORIZONTAL.includes(f) ? HORIZONTAL[(HORIZONTAL.indexOf(f) + q) % 4]! : f;
/** Rotates around the block centre about Y; positive degrees turn north → east (clockwise from above). */
export function rotateY(quads: readonly BakedQuad[], degrees: number): BakedQuad[] {
  const a = degrees * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const q = ((Math.round(degrees / 90) % 4) + 4) % 4, exact = degrees % 90 === 0;
  return quads.map(quad => {
    const pos: number[] = [];
    for (let i = 0; i < 4; i++) {
      const x = quad.pos[i * 3]! - 0.5, z = quad.pos[i * 3 + 2]! - 0.5;
      // north (0,0,-1) → east (1,0,0): x' = −z·s + x·c, z' = x·s + z·c
      const nx = x * c - z * s, nz = x * s + z * c;
      pos.push(clean(nx + 0.5), quad.pos[i * 3 + 1]!, clean(nz + 0.5));
    }
    return { ...quad, pos, cull: exact ? turnFace(quad.cull, q) : null, shade: exact ? turnFace(quad.shade, q) : quad.shade };
  });
}
const clean = (n: number) => Math.abs(n - Math.round(n * 16) / 16) < 1e-9 ? Math.round(n * 16) / 16 : n;
/** Mirror top ↔ bottom (top slabs, upper stair halves, ceiling buttons). */
function flipY(quads: readonly BakedQuad[]): BakedQuad[] {
  const swap = (f: FaceName | null) => f === 'up' ? 'down' : f === 'down' ? 'up' : f;
  return quads.map(q => {
    const pos: number[] = [], uv: number[] = [];
    for (let i = 3; i >= 0; i--) { pos.push(q.pos[i * 3]!, 1 - q.pos[i * 3 + 1]!, q.pos[i * 3 + 2]!); uv.push(q.uv[i * 2]!, q.uv[i * 2 + 1]!); }
    return { ...q, pos, uv, cull: swap(q.cull), shade: swap(q.shade) };
  });
}
const FACING_TURNS: Readonly<Record<string, number>> = { north: 0, east: 1, south: 2, west: 3 };
/** Shapes are written facing north; turns them to `facing`. */
const facingNorth = (quads: BakedQuad[], facing: string | undefined) => facing && facing in FACING_TURNS ? rotateY(quads, 90 * FACING_TURNS[facing]!) : quads;

// ------------------------------------------------------------------ families
function stairs(p: Props, paint: Paint): BakedQuad[] {
  // North-facing frame: the tall back half lies at the north side (z 0..8).
  const shape = p.shape ?? 'straight';
  const parts: BakedQuad[] = [...box([0, 0, 0], [16, 8, 16], paint)];
  if (shape === 'straight') parts.push(...box([0, 8, 0], [16, 16, 8], paint));
  else if (shape === 'outer_left') parts.push(...box([0, 8, 0], [8, 16, 8], paint));
  else if (shape === 'outer_right') parts.push(...box([8, 8, 0], [16, 16, 8], paint));
  else if (shape === 'inner_left') parts.push(...box([0, 8, 0], [16, 16, 8], paint), ...box([0, 8, 8], [8, 16, 16], paint));
  else parts.push(...box([0, 8, 0], [16, 16, 8], paint), ...box([8, 8, 8], [16, 16, 16], paint));
  const turned = facingNorth(parts, p.facing);
  return p.half === 'top' ? flipY(turned) : turned;
}

function connections(p: Props, post: () => BakedQuad[], arm: (low: boolean) => BakedQuad[]): BakedQuad[] {
  const out = post();
  for (const side of HORIZONTAL) {
    const v = p[side];
    if (v === undefined || v === 'false' || v === 'none') continue;
    out.push(...rotateY(arm(v === 'low'), 90 * FACING_TURNS[side]!));
  }
  return out;
}

function door(p: Props, paint: Paint): BakedQuad[] {
  // Closed north-facing door sits at the south side of its block (z 13..16); open doors swing to the hinge side.
  let turns = FACING_TURNS[p.facing ?? 'north'] ?? 0;
  if (p.open === 'true') turns += p.hinge === 'right' ? 3 : 1;
  return rotateY(box([0, 0, 13], [16, 16, 16], paint), 90 * (turns % 4));
}

function trapdoor(p: Props, paint: Paint): BakedQuad[] {
  if (p.open === 'true') return facingNorth(box([0, 0, 13], [16, 16, 16], paint), p.facing);
  return p.half === 'top' ? box([0, 13, 0], [16, 16, 16], paint) : box([0, 0, 0], [16, 3, 16], paint);
}

/** Small part attached to floor, wall (north-facing frame: on the south wall) or ceiling. */
function attached(p: Props, floorBox: [V3, V3], wallBox: [V3, V3], paint: Paint): BakedQuad[] {
  if (p.face === 'wall') return facingNorth(box(wallBox[0], wallBox[1], paint), p.facing);
  const q = facingNorth(box(floorBox[0], floorBox[1], paint), p.facing);
  return p.face === 'ceiling' ? flipY(q) : q;
}

function rotation16(p: Props, quads: BakedQuad[]): BakedQuad[] {
  // rotation 0 = facing south … 8 = north; the shapes are written facing north.
  const r = Number(p.rotation ?? 8);
  return rotateY(quads, (r * 22.5 + 180) % 360);
}

function look(name: string): Paint | null {
  const l = blockLook(name);
  return l ? { top: l.top, side: l.side, bottom: l.bottom } : null;
}

const PLANT_PARTS = /(_sapling|_tulip|_mushroom|_fungus|_roots|_sprouts|_propagule|_bush|grass|fern|seagrass|_coral|_coral_fan|dandelion|poppy|orchid|allium|bluet|daisy|cornflower|lily_of_the_valley|wither_rose|torchflower|eyeblossom|cactus_flower|lilac|rose_bush|peony|sunflower|pitcher_plant|cobweb|hanging_moss|spore_blossom)$/;

/** Own geometry for a block state. `paint` overrides the colour lookup (entity-rendered blocks with a texture). */
export function fallbackQuads(id: string, props: Props, paintOverride?: Paint): BakedQuad[] {
  const colon = id.indexOf(':'), ns = colon < 0 ? 'minecraft' : id.slice(0, colon), name = id.slice(colon + 1);
  const info = ns === 'minecraft' ? blockLook(name) : undefined;
  const paint: Paint = paintOverride ?? look(name) ?? hashedPaint(id);
  const glassy = /glass|^ice$|^packed_ice$|^blue_ice$|slime_block|honey_block|^frosted_ice$/.test(name) && !paintOverride;
  const p = props;
  const solid = (f: V3, t: V3) => box(f, t, paint);

  if (ns !== 'minecraft') return box([0, 0, 0], [16, 16, 16], paint);
  if (name === 'air' || name === 'cave_air' || name === 'void_air' || name === 'barrier' || name === 'light' || name === 'structure_void') return [];
  if (name === 'water' || name === 'lava' || name === 'bubble_column') {
    const level = Number(p.level ?? 0), h = level === 0 || level >= 8 ? 14 : Math.max(2, 14 - level * 2);
    return box([0, 0, 0], [16, h, 16], { ...paint, translucent: name !== 'lava' });
  }
  if (name.endsWith('_slab')) return p.type === 'double' ? solid([0, 0, 0], [16, 16, 16]) : p.type === 'top' ? solid([0, 8, 0], [16, 16, 16]) : solid([0, 0, 0], [16, 8, 16]);
  if (name.endsWith('_stairs')) return stairs(p, paint);
  if (name.endsWith('_wall') && 'up' in p) {
    return connections(p, () => p.up === 'false' ? [] : solid([4, 0, 4], [12, 16, 12]), low => box([5, 0, 0], [11, low ? 14 : 16, 8], paint));
  }
  if (name.endsWith('_fence_gate')) {
    const open = p.open === 'true', y = p.in_wall === 'true' ? -3 : 0;
    const parts = [...box([0, 5 + y, 7], [2, 16 + y, 9], paint), ...box([14, 5 + y, 7], [16, 16 + y, 9], paint)];
    if (open) parts.push(...box([0, 6 + y, 9], [2, 15 + y, 16], paint), ...box([14, 6 + y, 9], [16, 15 + y, 16], paint));
    else parts.push(...box([2, 6 + y, 7], [14, 9 + y, 9], paint), ...box([2, 12 + y, 7], [14, 15 + y, 9], paint));
    return facingNorth(parts, p.facing);
  }
  if (name.endsWith('_fence')) {
    return connections(p, () => solid([6, 0, 6], [10, 16, 10]), () => [...box([7, 6, 0], [9, 9, 6], paint), ...box([7, 12, 0], [9, 15, 6], paint)]);
  }
  if (name.endsWith('_pane') || name.endsWith('_bars') || name === 'iron_bars') {
    const pane = { ...paint, translucent: glassy || paint.translucent === true };
    return connections(p, () => box([7, 0, 7], [9, 16, 9], pane), () => box([7, 0, 0], [9, 16, 7], pane));
  }
  if (name.endsWith('_door')) return door(p, paint);
  if (name.endsWith('_trapdoor')) return trapdoor(p, paint);
  if (name.endsWith('_button')) return attached(p, [[5, 0, 6], [11, 2, 10]], [[5, 6, 14], [11, 10, 16]], paint);
  if (name === 'lever') return attached(p, [[5, 0, 4], [11, 3, 12]], [[5, 4, 13], [11, 12, 16]], paint);
  if (name.endsWith('_pressure_plate')) return solid([1, 0, 1], [15, 1, 15]);
  if (name.endsWith('carpet')) return solid([0, 0, 0], [16, 1, 16]);
  if (name === 'snow') return solid([0, 0, 0], [16, 2 * Math.max(1, Math.min(8, Number(p.layers ?? 1))), 16]);
  if (name.endsWith('wall_torch')) return facingNorth(box([7, 3, 13], [9, 13, 16], paint), p.facing);
  if (name.endsWith('torch')) return solid([7, 0, 7], [9, 10, 9]);
  if (name.endsWith('_wall_hanging_sign')) return facingNorth([...solid([1, 0, 7], [15, 10, 9]), ...solid([0, 14, 6], [16, 16, 10])], p.facing);
  if (name.endsWith('_hanging_sign')) return rotation16(p, [...solid([1, 0, 7], [15, 10, 9]), ...solid([3, 10, 7.5], [4, 16, 8.5]), ...solid([12, 10, 7.5], [13, 16, 8.5])]);
  if (name.endsWith('_wall_sign')) return facingNorth(solid([0, 4.5, 14], [16, 12.5, 16]), p.facing);
  if (name.endsWith('_sign')) return rotation16(p, [...solid([7.25, 0, 7.25], [8.75, 9.3, 8.75]), ...solid([0, 9.3, 7.25], [16, 17.3, 8.75])]);
  if (name.endsWith('_wall_banner')) return facingNorth(solid([0, -14, 15], [16, 14, 16]), p.facing);
  if (name.endsWith('_banner')) return rotation16(p, [...solid([7, 0, 7], [9, 28, 9]), ...solid([0, 2, 9], [16, 30, 10]), ...solid([0, 28, 7], [16, 30, 9])]);
  if (name.endsWith('_wall_head') || name.endsWith('_wall_skull')) return facingNorth(solid([4, 4, 8], [12, 12, 16]), p.facing);
  if (name.endsWith('_head') || name.endsWith('_skull')) return rotation16(p, solid([4, 0, 4], [12, 8, 12]));
  if (name.endsWith('_bed')) return solid([0, 0, 0], [16, 9, 16]);
  if (name === 'chest' || name === 'trapped_chest' || name === 'ender_chest' || name.endsWith('copper_chest')) {
    const single = p.type === undefined || p.type === 'single';
    // Double chests: the half named "left" extends to its right (seen from the front), i.e. east when facing north.
    const x0 = single || p.type === 'right' ? 1 : 0, x1 = single || p.type === 'left' ? 15 : 16;
    return facingNorth([...solid([x0, 0, 1], [x1, 10, 15]), ...solid([x0, 10, 1], [x1, 14, 15])], p.facing);
  }
  if (name.endsWith('shulker_box')) return solid([0, 0, 0], [16, 16, 16]);
  if (name === 'decorated_pot') return solid([1, 0, 1], [15, 16, 15]);
  if (name === 'conduit') return solid([5, 5, 5], [11, 11, 11]);
  if (name.endsWith('copper_golem_statue')) return facingNorth([...solid([4, 0, 5], [12, 6, 11]), ...solid([3, 6, 4], [13, 12, 12]), ...solid([7, 12, 7], [9, 15, 9])], p.facing);
  if (name === 'ladder') return facingNorth(box([0, 0, 15], [16, 16, 16], paint, ['north', 'south']), p.facing);
  if (name === 'vine' || name === 'glow_lichen' || name === 'sculk_vein' || name === 'resin_clump') {
    const out: BakedQuad[] = [];
    for (const side of HORIZONTAL) if (p[side] === 'true') out.push(...rotateY(box([0, 0, 0], [16, 16, 0.8], paint, ['north', 'south']), 90 * FACING_TURNS[side]!));
    if (p.up === 'true') out.push(...box([0, 15.2, 0], [16, 16, 16], paint, ['up', 'down']));
    if (p.down === 'true') out.push(...box([0, 0, 0], [16, 0.8, 16], paint, ['up', 'down']));
    return out.length ? out : box([0, 0, 0], [16, 16, 0.8], paint, ['north', 'south']);
  }
  if (name.endsWith('rail')) return flat(paint.top, 1, 0);
  if (name === 'redstone_wire') return flat(paint.top, 0.25, 0);
  if (name === 'chain' || name.endsWith('_chain')) {
    const q = solid([6.5, 0, 6.5], [9.5, 16, 9.5]);
    return p.axis === 'x' ? rotateZ90(q) : p.axis === 'z' ? rotateX90(q) : q;
  }
  if (name === 'fire' || name === 'soul_fire') return cross(paint.side);
  if (name === 'pink_petals' || name === 'wildflowers' || name === 'leaf_litter') return flat(paint.top, 1, 0);
  if (name === 'lily_pad') return flat(paint.top, 0.25, 0);

  if (info?.shape === 'x' || (!info && PLANT_PARTS.test(name))) return cross(paint.side);
  if (info?.shape === 'c') return crop(paint.side, p.age !== undefined ? Math.max(4, 16 * (Number(p.age) + 1) / 8) : 16);
  if (info?.shape === 'p') return [...solid([5, 0, 5], [11, 6, 11]), ...cross(paint.top, 14).map(q => ({ ...q, pos: q.pos.map((v, i) => i % 3 === 1 ? 0.375 + v * 0.6 : 0.5 + (v - 0.5) * 0.6) }))];
  if (info?.shape === 'b' && info.box) {
    const [x0, y0, z0, x1, y1, z1] = info.box as [number, number, number, number, number, number];
    const quads = box([x0, y0, z0], [x1, y1, z1], { ...paint, translucent: glassy });
    // The generated box belongs to the default state; blockstate files list "facing=east" first.
    return p.facing && p.facing in FACING_TURNS ? rotateY(quads, 90 * ((FACING_TURNS[p.facing]! - 1 + 4) % 4)) : quads;
  }
  return box([0, 0, 0], [16, 16, 16], { ...paint, translucent: glassy });
}

function rotateX90(quads: readonly BakedQuad[]): BakedQuad[] {
  return quads.map(q => ({ ...q, cull: null, pos: q.pos.map((_, i) => { const b = i - (i % 3), x = q.pos[b]!, y = q.pos[b + 1]!, z = q.pos[b + 2]!; return i % 3 === 0 ? x : i % 3 === 1 ? z : 1 - y; }) }));
}
function rotateZ90(quads: readonly BakedQuad[]): BakedQuad[] {
  return quads.map(q => ({ ...q, cull: null, pos: q.pos.map((_, i) => { const b = i - (i % 3), x = q.pos[b]!, y = q.pos[b + 1]!, z = q.pos[b + 2]!; return i % 3 === 0 ? y : i % 3 === 1 ? 1 - x : z; }) }));
}

/** Stable colour for unknown (mod) blocks. */
export function hashedColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360, s = 0.35, l = 0.58;
  const f = (n: number) => { const k = (n + hue / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
}
const hashedPaint = (id: string): Paint => { const c = hashedColor(id); return { top: c, side: c, bottom: c }; };

/** Solid box in block units (0..1, may reach outside the cell for banners and gates in walls). */
export type SolidPart = readonly [number, number, number, number, number, number];

/**
 * Closed boxes of the own shape of a state (3D print export): slabs, stairs,
 * walls, fences, doors, carpets … as boxes; planes (plants, rails, ladders,
 * vines) have no volume and are left out. Same geometry as the view.
 */
export function solidParts(id: string, props: Props): SolidPart[] {
  const parts = new Map<number, number[]>();
  for (const q of fallbackQuads(id, props)) {
    if (q.part === undefined) continue;
    let b = parts.get(q.part);
    if (!b) { b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; parts.set(q.part, b); }
    for (let i = 0; i < 12; i++) { const a = i % 3, v = q.pos[i]!; if (v < b[a]!) b[a] = v; if (v > b[a + 3]!) b[a + 3] = v; }
  }
  return [...parts.values()].filter(b => b[3]! > b[0]! && b[4]! > b[1]! && b[5]! > b[2]!) as unknown as SolidPart[];
}

/** Fallback block for a state (no texture source, or a block the source does not describe). */
export function fallbackBlock(id: string, props: Props, paint?: Paint): BakedBlock {
  return { quads: fallbackQuads(id, props, paint), kind: 'fallback' };
}
