import type { BlockState, Cell, Vec3 } from '../../../../packages/voxel/src/index.js';
import { dampening, emission, propagateLight, spawnFloorExcluded, spawnPassable } from './light.ts';
import type { BakedBlock, BakedQuad, FaceName } from './model.ts';
import { FACE_NAMES, FACE_VECTORS, OPPOSITE, coversFace } from './model.ts';

/**
 * Block mesh for the viewer and still images (Blockdarstellung): real block
 * shapes from a renderer (texture source or own shapes), hidden faces culled
 * against neighbours that cover them, tints and an optional per-cell mark
 * (selection, conflicts, diff). Two layers: opaque/cutout and translucent.
 *
 * GFX-01 adds what Minecraft's own renderer bakes into its vertices: smooth
 * ambient occlusion in the corners, sky light and block light (torches,
 * lanterns …) averaged per vertex, the fixed face brightness as a separate
 * value so the shader can switch between looks, and the floor cells where
 * monsters could spawn. `buildSectionMesh` cuts the mesh into 32³ sections
 * and reuses every section whose content, marks and light did not change.
 * A view artefact only – materials and export never read it.
 */
export type Layer = 0 | 1 | 2;
export interface SpriteSlot {
  /** Atlas rectangle u0, v0, u1, v1 (0..1, v downwards). */
  readonly rect: readonly [number, number, number, number];
  /** 0 opaque, 1 cutout (alpha test), 2 translucent. */
  readonly layer: Layer;
}
/** Looks up a texture; colour sprites (`#rrggbb`) map to a neutral tile tinted with the colour. */
export type SpriteLookup = (sprite: string) => SpriteSlot;

export interface BlockRenderer {
  /** Changes whenever the shapes or textures change (cache keys of still images). */
  readonly key: string;
  /** True when real textures are loaded. */
  readonly textured: boolean;
  block(state: BlockState): BakedBlock;
  tint(state: BlockState, tintindex: number): string | null;
}

/** Mixes the final colour towards `color` by `amount` (0..1). */
export interface Mark { readonly color: string; readonly amount: number }

export interface MeshLayer {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  /** Tint × colour sprite, linear 0..1 per vertex (no shading). */
  readonly colors: Float32Array;
  /** Mark colour and amount per vertex. */
  readonly marks: Float32Array;
  /** Per vertex: fixed face brightness, ambient occlusion, block light, sky light (all 0..1). */
  readonly light: Float32Array;
  readonly indices: Uint32Array;
  /** Quad → index into the input cell list of the build that made the layer (triangle t belongs to quad t >> 1). */
  readonly quadCells: Int32Array;
  readonly quads: number;
}
/** Floor cells where hostile mobs may spawn: world X/Y/Z of the free cell, and 1 = also by day, 2 = only at night. */
export interface SpawnMap { readonly positions: Int32Array; readonly when: Uint8Array; readonly count: number }

export interface BlockMesh {
  readonly solid: MeshLayer;
  readonly translucent: MeshLayer;
  readonly quads: number;
  readonly blocks: number;
  /** Quads an unculled cube per block would need (6 per block), for measurements. */
  readonly naiveQuads: number;
  /** Null when light was not computed (switched off or grid too large). */
  readonly spawn: SpawnMap | null;
  /** True when sky and block light were propagated. */
  readonly lit: boolean;
}

export interface MeshSection {
  /** Section coordinates (world position / SECTION, floored) joined with commas. */
  readonly key: string;
  readonly solid: MeshLayer;
  readonly translucent: MeshLayer;
  /** Fingerprint of everything that shaped this section (content, marks, neighbours, light, origin, look). */
  readonly hash: string;
  /** World bounds of the section box. */
  readonly min: Vec3;
  /** The input cells of the build that made it (quadCells index into these). */
  readonly cells: readonly Cell[];
}
export interface SectionMesh {
  readonly sections: readonly MeshSection[];
  readonly quads: number;
  readonly blocks: number;
  readonly naiveQuads: number;
  readonly spawn: SpawnMap | null;
  readonly lit: boolean;
  /** Sections taken over unchanged from `previous`, and sections built anew. */
  readonly reused: number;
  readonly built: number;
}

export interface MeshOptions {
  /** Propagate sky and block light (default true). Without it every vertex has full daylight. */
  readonly light?: boolean;
  /** Ambient occlusion (default true). */
  readonly ao?: boolean;
  /** Section builds only: share done 0..1 (light and culling count as the first third). Not part of the look. */
  readonly progress?: (fraction: number) => void;
}

export const SECTION = 32;
/** Brightness by number of occluding neighbours at a vertex (3 = open), as in Minecraft's smooth lighting. */
export const AO_LEVELS: readonly number[] = [0.48, 0.64, 0.8, 1];
const BRIGHTNESS: Readonly<Record<FaceName, number>> = { up: 1, down: 0.5, north: 0.8, south: 0.8, west: 0.6, east: 0.6 };

const hexCache = new Map<string, [number, number, number]>();
export function hexRgb(hex: string): [number, number, number] {
  let v = hexCache.get(hex);
  if (!v) {
    const n = Number.parseInt(hex.slice(1, 7), 16);
    v = Number.isFinite(n) ? [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] : [1, 0, 1];
    hexCache.set(hex, v);
  }
  return v;
}

interface PreparedQuad {
  readonly q: BakedQuad; readonly slot: SpriteSlot; readonly rgb: readonly [number, number, number]; readonly layer: Layer;
  readonly shade: number;
  /** Normal axis 0..2 of an axis-aligned quad, −1 otherwise. */
  readonly axis: number;
  /** +1 / −1 along the axis. */
  readonly sign: number;
  /** The quad lies on the cell boundary, so the cell in front is the neighbour. */
  readonly boundary: boolean;
  /** Per vertex: direction (−1, 0, +1) along both tangent axes towards the cell edge the vertex sits on. */
  readonly edge: Int8Array;
  readonly tangents: readonly [number, number];
  /** Bits (FACE_NAMES index) of the cull face and of its opposite; 0 without cull face. */
  readonly cullBit: number;
  readonly oppositeBit: number;
}
interface Prepared {
  readonly quads: readonly PreparedQuad[]; readonly occludes: number; readonly full: number; readonly id: string;
  readonly opaque: boolean; readonly aoOccluder: boolean; readonly damp: number; readonly emit: number;
  readonly floor: boolean; readonly passable: boolean;
}

/** Growing typed buffers per layer; plain number arrays were the bottleneck for 10⁶ quads. */
class LayerBuilder {
  private cap = 64; private n = 0;
  private positions = new Float32Array(this.cap * 12); private uvs = new Float32Array(this.cap * 8);
  private colors = new Float32Array(this.cap * 12); private marks = new Float32Array(this.cap * 16);
  private light = new Float32Array(this.cap * 16); private cells = new Int32Array(this.cap);
  private grow(): void {
    this.cap *= 2;
    const more = <T extends Float32Array | Int32Array>(a: T, per: number): T => { const b = new (a.constructor as new (n: number) => T)(this.cap * per); b.set(a); return b; };
    this.positions = more(this.positions, 12); this.uvs = more(this.uvs, 8); this.colors = more(this.colors, 12);
    this.marks = more(this.marks, 16); this.light = more(this.light, 16); this.cells = more(this.cells, 1);
  }
  /** `vl` holds 4 × (shade, ao, block, sky); `rot` starts the corner order at another vertex (flipped diagonal). */
  add(p: PreparedQuad, ox: number, oy: number, oz: number, mark: readonly [number, number, number, number], cell: number, vl: Float32Array, rot: number): void {
    if (this.n === this.cap) this.grow();
    const { q, slot, rgb } = p, [u0, v0, u1, v1] = slot.rect, n = this.n;
    for (let j = 0; j < 4; j++) {
      const k = (j + rot) & 3;
      const i3 = (n * 4 + j) * 3, i2 = (n * 4 + j) * 2, i4 = (n * 4 + j) * 4;
      this.positions[i3] = q.pos[k * 3]! + ox; this.positions[i3 + 1] = q.pos[k * 3 + 1]! + oy; this.positions[i3 + 2] = q.pos[k * 3 + 2]! + oz;
      // Sprite UVs may exceed 0..1 slightly for rotated elements; clamp to the slot.
      const u = Math.min(1, Math.max(0, q.uv[k * 2]!)), v = Math.min(1, Math.max(0, q.uv[k * 2 + 1]!));
      this.uvs[i2] = u0 + (u1 - u0) * u; this.uvs[i2 + 1] = v0 + (v1 - v0) * v;
      this.colors[i3] = rgb[0]; this.colors[i3 + 1] = rgb[1]; this.colors[i3 + 2] = rgb[2];
      this.marks[i4] = mark[0]; this.marks[i4 + 1] = mark[1]; this.marks[i4 + 2] = mark[2]; this.marks[i4 + 3] = mark[3];
      this.light[i4] = vl[k * 4]!; this.light[i4 + 1] = vl[k * 4 + 1]!; this.light[i4 + 2] = vl[k * 4 + 2]!; this.light[i4 + 3] = vl[k * 4 + 3]!;
    }
    this.cells[n] = cell;
    this.n++;
  }
  done(): MeshLayer {
    const quads = this.n, indices = new Uint32Array(quads * 6);
    for (let i = 0; i < quads; i++) {
      const o = i * 6, b = i * 4;
      indices[o] = b; indices[o + 1] = b + 1; indices[o + 2] = b + 2; indices[o + 3] = b; indices[o + 4] = b + 2; indices[o + 5] = b + 3;
    }
    return { positions: this.positions.slice(0, quads * 12), uvs: this.uvs.slice(0, quads * 8), colors: this.colors.slice(0, quads * 12),
      marks: this.marks.slice(0, quads * 16), light: this.light.slice(0, quads * 16), indices, quadCells: this.cells.slice(0, quads), quads };
  }
}

const NO_MARK = [0, 0, 0, 0] as const;
const EPS = 1e-4;

function prepareQuad(q: BakedQuad, slot: SpriteSlot, layer: Layer, rgb: readonly [number, number, number]): PreparedQuad {
  const p = q.pos;
  const ax = p[3]! - p[0]!, ay = p[4]! - p[1]!, az = p[5]! - p[2]!, bx = p[6]! - p[0]!, by = p[7]! - p[1]!, bz = p[8]! - p[2]!;
  const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, len = Math.hypot(nx, ny, nz) || 1;
  const n = [nx / len, ny / len, nz / len];
  let axis = -1;
  for (let i = 0; i < 3; i++) if (Math.abs(n[i]!) > 0.999) axis = i;
  const shade = q.shade ? BRIGHTNESS[q.shade] : 1;
  const edge = new Int8Array(8);
  const cullBit = q.cull ? 1 << FACE_NAMES.indexOf(q.cull) : 0, oppositeBit = q.cull ? 1 << FACE_NAMES.indexOf(OPPOSITE[q.cull]) : 0;
  if (axis < 0) return { q, slot, layer, rgb, shade, axis, sign: 0, boundary: false, edge, tangents: [0, 0], cullBit, oppositeBit };
  // Corners are counter-clockwise seen from the front, so the normal points out of the face.
  const sign = n[axis]! > 0 ? 1 : -1, plane = p[axis]!;
  const boundary = sign > 0 ? plane > 1 - EPS : plane < EPS;
  const t1 = (axis + 1) % 3, t2 = (axis + 2) % 3;
  for (let k = 0; k < 4; k++) {
    const a = p[k * 3 + t1]!, b = p[k * 3 + t2]!;
    edge[k * 2] = a < EPS ? -1 : a > 1 - EPS ? 1 : 0;
    edge[k * 2 + 1] = b < EPS ? -1 : b > 1 - EPS ? 1 : 0;
  }
  return { q, slot, layer, rgb, shade, axis, sign, boundary, edge, tangents: [t1, t2], cullBit, oppositeBit };
}

const mix32 = (h: number) => { h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); return (h ^ (h >>> 16)) >>> 0; };
function fnv(s: string): number { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return h >>> 0; }
const stateKey = (s: BlockState) => `${s.id}[${Object.keys(s.properties).sort().map(k => `${k}=${s.properties[k]}`).join(',')}]`;

interface Core {
  readonly prepared: (gridValue: number) => Prepared | null;
  readonly grid: Int32Array; readonly sky: Uint8Array | null; readonly block: Uint8Array | null;
  readonly sx: number; readonly sy: number; readonly sz: number; readonly lo: readonly number[];
  readonly at: (x: number, y: number, z: number) => number;
  readonly blocks: number; readonly spawn: SpawnMap | null;
  readonly marks: (readonly [number, number, number, number])[];
  /** Emits the quads of one cell into the layers. */
  emit(index: number, solid: LayerBuilder, translucent: LayerBuilder): void;
}

/** Shared part of both builders: grid with a two-cell margin, light, spawn map and per-cell emission. */
function core(cells: readonly Cell[], palette: readonly BlockState[], renderer: BlockRenderer, sprites: SpriteLookup, origin: Vec3,
  markOf: ((cell: Cell) => Mark | null) | undefined, options: MeshOptions): Core {
  const preparedByIndex = new Map<number, Prepared>();
  const prepare = (index: number): Prepared => {
    let hit = preparedByIndex.get(index);
    if (hit) return hit;
    const state = palette[index] ?? { id: 'minecraft:air', properties: {} };
    const block = renderer.block(state);
    const quads: PreparedQuad[] = [];
    let occludes = 0, full = 0, translucentAny = false;
    for (const q of block.quads) {
      const colour = q.sprite.startsWith('#');
      const slot = sprites(colour ? '#' : q.sprite);
      const tint = q.tint >= 0 ? renderer.tint(state, q.tint) : null;
      const base = colour ? hexRgb(q.sprite) : [1, 1, 1] as const, t = tint ? hexRgb(tint) : [1, 1, 1] as const;
      const layer: Layer = q.translucent ? 2 : slot.layer;
      if (layer === 2) translucentAny = true;
      quads.push(prepareQuad(q, slot, layer, [base[0] * t[0], base[1] * t[1], base[2] * t[2]]));
      if (q.cull) {
        const bit = 1 << FACE_NAMES.indexOf(q.cull);
        if (coversFace(q, q.cull)) { full |= bit; if (layer === 0) occludes |= bit; }
      }
    }
    const id = state.id, opaque = occludes === 63;
    hit = {
      quads, occludes, full, id, opaque,
      // Minecraft darkens corners next to full blocks, but not next to glass and other see-through cubes.
      aoOccluder: full === 63 && !translucentAny && !/glass/.test(id),
      damp: opaque ? 15 : dampening(id), emit: emission(id, state.properties),
      floor: (occludes & (1 << FACE_NAMES.indexOf('up'))) !== 0 && !spawnFloorExcluded(id),
      passable: !block.quads.length || spawnPassable(id, state.properties),
    };
    preparedByIndex.set(index, hit);
    return hit;
  };

  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let blocks = 0;
  for (const c of cells) if (c.kind === 'block') {
    blocks++;
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, c.position[i]!); hi[i] = Math.max(hi[i]!, c.position[i]!); }
  }
  const M = 2;
  const sx = blocks ? hi[0]! - lo[0]! + 1 + 2 * M : 0, sy = blocks ? hi[1]! - lo[1]! + 1 + 2 * M : 0, sz = blocks ? hi[2]! - lo[2]! + 1 + 2 * M : 0;
  const ys = sz, xs = sy * sz;
  // Palette index + 1 per cell over the block bounds plus a two-cell margin; 0 = empty.
  const grid = new Int32Array(sx * sy * sz);
  const at = (x: number, y: number, z: number) => (x - lo[0]! + M) * xs + (y - lo[1]! + M) * ys + (z - lo[2]! + M);
  for (const c of cells) if (c.kind === 'block') grid[at(c.position[0], c.position[1], c.position[2])] = c.paletteIndex + 1;

  // Per grid value tables (0 = empty cell).
  const values = palette.length + 1;
  const opaque = new Uint8Array(values), damp = new Uint8Array(values), emit = new Uint8Array(values), occluder = new Uint8Array(values);
  const floor = new Uint8Array(values), passable = new Uint8Array(values);
  passable[0] = 1;
  const used = new Uint8Array(values);
  for (const c of cells) if (c.kind === 'block' && !used[c.paletteIndex + 1]) {
    used[c.paletteIndex + 1] = 1;
    const p = prepare(c.paletteIndex), v = c.paletteIndex + 1;
    opaque[v] = p.opaque ? 1 : 0; damp[v] = p.damp; emit[v] = p.emit; occluder[v] = p.aoOccluder ? 1 : 0;
    floor[v] = p.floor ? 1 : 0; passable[v] = p.passable ? 1 : 0;
  }
  const { sky, block } = options.light === false ? { sky: null, block: null } : propagateLight(grid, sx, sy, sz, opaque, damp, emit);
  const ao = options.ao !== false;

  let spawn: SpawnMap | null = null;
  if (sky && block) {
    const pos: number[] = [], when: number[] = [];
    for (const c of cells) {
      if (c.kind !== 'block' || !floor[c.paletteIndex + 1]) continue;
      const i = at(c.position[0], c.position[1], c.position[2]), a = i + ys, b = i + 2 * ys;
      if (!passable[grid[a]!] || !passable[grid[b]!] || block[a]! > 0) continue;
      pos.push(c.position[0], c.position[1] + 1, c.position[2]); when.push(sky[a]! <= 7 ? 1 : 2);
    }
    spawn = { positions: Int32Array.from(pos), when: Uint8Array.from(when), count: when.length };
  }

  const marks = cells.map(c => {
    if (!markOf || c.kind !== 'block') return NO_MARK;
    const m = markOf(c);
    return m ? [...hexRgb(m.color), Math.max(0, Math.min(1, m.amount))] as const : NO_MARK;
  });

  const strides = [xs, ys, 1];
  const vl = new Float32Array(16);
  const emitCell = (index: number, solid: LayerBuilder, translucent: LayerBuilder) => {
    const c = cells[index]!;
    if (c.kind !== 'block') return;
    const own = prepare(c.paletteIndex);
    if (!own.quads.length) return;
    const [x, y, z] = c.position;
    const gi = at(x, y, z);
    const mark = marks[index]!;
    const ox = x - origin[0], oy = y - origin[1], oz = z - origin[2];
    for (const p of own.quads) {
      const cull = p.q.cull;
      if (cull) {
        const n = FACE_VECTORS[cull], neighbour = grid[gi + n[0] * xs + n[1] * ys + n[2]]!;
        if (neighbour) {
          const other = prepare(neighbour - 1), bit = p.oppositeBit;
          if (other.occludes & bit) continue;
          // Glass, water, leaves …: faces between two equal blocks are hidden as in Minecraft.
          if (other.id === own.id && (other.full & bit) && (own.full & p.cullBit)) continue;
        }
      }
      let rot = 0;
      if (p.axis < 0) {
        // Crossed plants, rotated elements: light of the own cell (or the one above for a full block), no occlusion.
        const j = opaque[grid[gi]!] ? gi + ys : gi;
        const b = block ? block[j]! / 15 : 0, s = sky ? sky[j]! / 15 : 1;
        for (let k = 0; k < 4; k++) { vl[k * 4] = p.shade; vl[k * 4 + 1] = 1; vl[k * 4 + 2] = b; vl[k * 4 + 3] = s; }
      } else {
        const front = p.boundary ? gi + p.sign * strides[p.axis]! : gi;
        const st1 = strides[p.tangents[0]]!, st2 = strides[p.tangents[1]]!;
        const fo = opaque[grid[front]!] === 1;
        const fs = sky ? sky[front]! : 15, fb = block ? block[front]! : 0;
        for (let k = 0; k < 4; k++) {
          const e1 = p.edge[k * 2]!, e2 = p.edge[k * 2 + 1]!;
          const a = e1 ? front + e1 * st1 : -1, b = e2 ? front + e2 * st2 : -1, d = e1 && e2 ? a + e2 * st2 : -1;
          const ga = a >= 0 ? grid[a]! : 0, gb = b >= 0 ? grid[b]! : 0, gd = d >= 0 ? grid[d]! : 0;
          const oa = a >= 0 && occluder[ga] === 1, ob = b >= 0 && occluder[gb] === 1, both = oa && ob, od = !both && d >= 0 && occluder[gd] === 1;
          const k4 = k * 4;
          vl[k4] = p.shade;
          vl[k4 + 1] = ao ? AO_LEVELS[both ? 0 : 3 - (+oa + +ob + +od)]! : 1;
          if (!sky || !block) { vl[k4 + 2] = 0; vl[k4 + 3] = 1; continue; }
          // Smooth light: average of the free cells around the vertex in front of the face.
          let n = 0, sl = 0, bl = 0;
          if (!fo) { n = 1; sl = fs; bl = fb; }
          if (a >= 0 && !opaque[ga]) { n++; sl += sky[a]!; bl += block[a]!; }
          if (b >= 0 && !opaque[gb]) { n++; sl += sky[b]!; bl += block[b]!; }
          if (!both && d >= 0 && !opaque[gd]) { n++; sl += sky[d]!; bl += block[d]!; }
          if (!n) { sl = fs; bl = fb; n = 1; }
          const f = 1 / (15 * n);
          vl[k4 + 2] = bl * f; vl[k4 + 3] = sl * f;
        }
        // Split the quad along the brighter diagonal, as Minecraft does, so corners shade evenly.
        const w0 = vl[1]! * (1 + Math.max(vl[3]!, vl[2]!)), w1 = vl[5]! * (1 + Math.max(vl[7]!, vl[6]!));
        const w2 = vl[9]! * (1 + Math.max(vl[11]!, vl[10]!)), w3 = vl[13]! * (1 + Math.max(vl[15]!, vl[14]!));
        if (w0 + w2 < w1 + w3) rot = 1;
      }
      (p.layer === 2 ? translucent : solid).add(p, ox, oy, oz, mark, index, vl, rot);
    }
  };
  return { prepared: v => v ? prepare(v - 1) : null, grid, sky, block, sx, sy, sz, lo, at, blocks, spawn, marks, emit: emitCell };
}

/** One mesh for all cells (still images, tests). */
export function buildBlockMesh(cells: readonly Cell[], palette: readonly BlockState[], renderer: BlockRenderer, sprites: SpriteLookup, origin: Vec3,
  markOf?: (cell: Cell) => Mark | null, options: MeshOptions = {}): BlockMesh {
  const c = core(cells, palette, renderer, sprites, origin, markOf, options);
  const solid = new LayerBuilder(), translucent = new LayerBuilder();
  for (let i = 0; i < cells.length; i++) c.emit(i, solid, translucent);
  const s = solid.done(), t = translucent.done();
  return { solid: s, translucent: t, quads: s.quads + t.quads, blocks: c.blocks, naiveQuads: c.blocks * 6, spawn: c.spawn, lit: c.sky !== null };
}

/**
 * Mesh in 32³ sections (3D viewer). A section of `previous` is reused when its
 * fingerprint is unchanged: the cells in it and in a two-cell margin around
 * it (culling, occlusion), their marks, the light of the free cells around it,
 * the origin and the renderer key. Edits therefore rebuild only the sections
 * they touch – plus those whose light changed.
 */
export function buildSectionMesh(cells: readonly Cell[], palette: readonly BlockState[], renderer: BlockRenderer, sprites: SpriteLookup, origin: Vec3,
  markOf?: (cell: Cell) => Mark | null, options: MeshOptions = {}, previous?: readonly MeshSection[]): SectionMesh {
  options.progress?.(0);
  const c = core(cells, palette, renderer, sprites, origin, markOf, options);
  options.progress?.(0.35);
  const seed = fnv(`${renderer.key}|${origin.join(',')}|${options.light !== false}|${options.ao !== false}`);
  const stateHash = palette.map(s => fnv(stateKey(s)));
  const markHash = new Map<string, number>();
  interface Acc { sum: number; xor: number; members: number[]; min: Vec3 }
  const acc = new Map<string, Acc>();
  const sec = (v: number) => Math.floor(v / SECTION);
  const touch = (key: string, h: number, sxi: number, syi: number, szi: number): Acc => {
    let a = acc.get(key);
    if (!a) { a = { sum: seed, xor: 0, members: [], min: [sxi * SECTION, syi * SECTION, szi * SECTION] }; acc.set(key, a); }
    a.sum = (a.sum + h) >>> 0; a.xor = (a.xor ^ mix32(h + 0x9e3779b9)) >>> 0;
    return a;
  };
  const near = (v: number) => { const r = v - sec(v) * SECTION; return r < 2 ? -1 : r >= SECTION - 2 ? 1 : 0; };
  cells.forEach((cell, index) => {
    if (cell.kind !== 'block') return;
    const [x, y, z] = cell.position;
    const m = c.marks[index]!;
    let mh = 0;
    if (m !== NO_MARK) { const k = m.join(','); mh = markHash.get(k) ?? fnv(k); markHash.set(k, mh); }
    const h = mix32(mix32(mix32(Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) + stateHash[cell.paletteIndex]!) + mh);
    const bx = sec(x), by = sec(y), bz = sec(z);
    touch(`${bx},${by},${bz}`, h, bx, by, bz).members.push(index);
    // Cells near a section border shape the neighbour's faces as well (culling, occlusion).
    const nx = near(x), ny = near(y), nz = near(z);
    if (nx || ny || nz) for (const dx of nx ? [0, nx] : [0]) for (const dy of ny ? [0, ny] : [0]) for (const dz of nz ? [0, nz] : [0]) {
      if (!dx && !dy && !dz) continue;
      const k = `${bx + dx},${by + dy},${bz + dz}`;
      const a = acc.get(k);
      if (a) { a.sum = (a.sum + h) >>> 0; a.xor = (a.xor ^ mix32(h + 0x9e3779b9)) >>> 0; }
      else touch(k, h, bx + dx, by + dy, bz + dz);
    }
  });
  // Light of free cells (not full daylight without block light) in each section and a one-cell margin.
  if (c.sky && c.block) {
    const { sx, sy, sz, lo, grid, sky, block } = c;
    for (let gx = 0; gx < sx; gx++) for (let gy = 0; gy < sy; gy++) {
      const base = (gx * sy + gy) * sz, wx = gx + lo[0]! - 2, wy = gy + lo[1]! - 2;
      for (let gz = 0; gz < sz; gz++) {
        const i = base + gz, s = sky[i]!, b = block[i]!;
        if (s === 15 && b === 0) continue;
        const v = grid[i]!;
        if (v && c.prepared(v)!.opaque) continue;
        const wz = gz + lo[2]! - 2;
        const h = mix32(Math.imul(wx, 73856093) ^ Math.imul(wy, 19349663) ^ Math.imul(wz, 83492791) ^ (s << 4 | b) * 0x27d4eb2d);
        const bx = sec(wx), by = sec(wy), bz = sec(wz);
        const rx = wx - bx * SECTION, ry = wy - by * SECTION, rz = wz - bz * SECTION;
        const ex = rx === 0 ? -1 : rx === SECTION - 1 ? 1 : 0, ey = ry === 0 ? -1 : ry === SECTION - 1 ? 1 : 0, ez = rz === 0 ? -1 : rz === SECTION - 1 ? 1 : 0;
        for (const dx of ex ? [0, ex] : [0]) for (const dy of ey ? [0, ey] : [0]) for (const dz of ez ? [0, ez] : [0]) {
          const a = acc.get(`${bx + dx},${by + dy},${bz + dz}`);
          if (a) { a.sum = (a.sum + h) >>> 0; a.xor = (a.xor ^ mix32(h + 0x85ebca6b)) >>> 0; }
        }
      }
    }
  }
  const old = new Map((previous ?? []).map(s => [s.key, s]));
  const sections: MeshSection[] = [];
  let reused = 0, built = 0, quads = 0;
  let visited = 0;
  for (const [key, a] of acc) {
    if (options.progress && (++visited & 15) === 0) options.progress(0.35 + 0.65 * visited / acc.size);
    if (!a.members.length) continue;
    const hash = `${a.sum.toString(36)}.${a.xor.toString(36)}.${a.members.length}`;
    const before = old.get(key);
    if (before && before.hash === hash) { sections.push(before); reused++; quads += before.solid.quads + before.translucent.quads; continue; }
    const solid = new LayerBuilder(), translucent = new LayerBuilder();
    for (const index of a.members) c.emit(index, solid, translucent);
    const s = solid.done(), t = translucent.done();
    if (!s.quads && !t.quads) continue;
    sections.push({ key, solid: s, translucent: t, hash, min: a.min, cells });
    built++; quads += s.quads + t.quads;
  }
  return { sections, quads, blocks: c.blocks, naiveQuads: c.blocks * 6, spawn: c.spawn, lit: c.sky !== null, reused, built };
}
