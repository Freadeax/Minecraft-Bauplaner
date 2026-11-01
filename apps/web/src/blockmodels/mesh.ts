import type { BlockState, Cell, Vec3 } from '../../../../packages/voxel/src/index.js';
import type { BakedBlock, BakedQuad, FaceName } from './model.ts';
import { FACE_NAMES, FACE_VECTORS, OPPOSITE, coversFace } from './model.ts';

/**
 * Block mesh for the viewer and still images (Blockdarstellung): real block
 * shapes from a renderer (texture source or own shapes), hidden faces culled
 * against neighbours that cover them, fixed Minecraft face brightness, tints
 * and an optional per-cell mark (selection, conflicts, diff). Two layers:
 * opaque/cutout and translucent. A view artefact only – materials and export
 * never read it.
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
  /** Tint × face brightness × colour sprite, linear 0..1 per vertex. */
  readonly colors: Float32Array;
  /** Mark colour and amount per vertex. */
  readonly marks: Float32Array;
  readonly indices: Uint32Array;
  /** Quad → index into the input cell list (triangle t belongs to quad t >> 1). */
  readonly quadCells: Int32Array;
  readonly quads: number;
}
export interface BlockMesh {
  readonly solid: MeshLayer;
  readonly translucent: MeshLayer;
  readonly quads: number;
  readonly blocks: number;
  /** Quads an unculled cube per block would need (6 per block), for measurements. */
  readonly naiveQuads: number;
}

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

interface PreparedQuad { readonly q: BakedQuad; readonly slot: SpriteSlot; readonly rgb: readonly [number, number, number]; readonly layer: Layer }
interface Prepared { readonly quads: readonly PreparedQuad[]; readonly occludes: number; readonly full: number; readonly id: string }

/** Growing typed buffers per layer; plain number arrays were the bottleneck for 10⁶ quads. */
class LayerBuilder {
  private cap = 256; private n = 0;
  private positions = new Float32Array(this.cap * 12); private uvs = new Float32Array(this.cap * 8);
  private colors = new Float32Array(this.cap * 12); private marks = new Float32Array(this.cap * 16); private cells = new Int32Array(this.cap);
  private grow(): void {
    this.cap *= 2;
    const more = <T extends Float32Array | Int32Array>(a: T, per: number): T => { const b = new (a.constructor as new (n: number) => T)(this.cap * per); b.set(a); return b; };
    this.positions = more(this.positions, 12); this.uvs = more(this.uvs, 8); this.colors = more(this.colors, 12); this.marks = more(this.marks, 16); this.cells = more(this.cells, 1);
  }
  add(p: PreparedQuad, ox: number, oy: number, oz: number, mark: readonly [number, number, number, number], cell: number): void {
    if (this.n === this.cap) this.grow();
    const { q, slot, rgb } = p, [u0, v0, u1, v1] = slot.rect, n = this.n;
    for (let k = 0; k < 4; k++) {
      const i3 = (n * 4 + k) * 3, i2 = (n * 4 + k) * 2, i4 = (n * 4 + k) * 4;
      this.positions[i3] = q.pos[k * 3]! + ox; this.positions[i3 + 1] = q.pos[k * 3 + 1]! + oy; this.positions[i3 + 2] = q.pos[k * 3 + 2]! + oz;
      // Sprite UVs may exceed 0..1 slightly for rotated elements; clamp to the slot.
      const u = Math.min(1, Math.max(0, q.uv[k * 2]!)), v = Math.min(1, Math.max(0, q.uv[k * 2 + 1]!));
      this.uvs[i2] = u0 + (u1 - u0) * u; this.uvs[i2 + 1] = v0 + (v1 - v0) * v;
      this.colors[i3] = rgb[0]; this.colors[i3 + 1] = rgb[1]; this.colors[i3 + 2] = rgb[2];
      this.marks[i4] = mark[0]; this.marks[i4 + 1] = mark[1]; this.marks[i4 + 2] = mark[2]; this.marks[i4 + 3] = mark[3];
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
      marks: this.marks.slice(0, quads * 16), indices, quadCells: this.cells.slice(0, quads), quads };
  }
}

const NO_MARK = [0, 0, 0, 0] as const;

export function buildBlockMesh(cells: readonly Cell[], palette: readonly BlockState[], renderer: BlockRenderer, sprites: SpriteLookup, origin: Vec3,
  markOf?: (cell: Cell) => Mark | null): BlockMesh {
  // Per palette entry: prepared quads and the faces it covers opaquely (bit per FACE_NAMES index).
  const prepared = new Map<number, Prepared>();
  const prepare = (index: number): Prepared => {
    let hit = prepared.get(index);
    if (hit) return hit;
    const state = palette[index] ?? { id: 'minecraft:air', properties: {} };
    const block = renderer.block(state);
    const quads: PreparedQuad[] = [];
    let occludes = 0, full = 0;
    for (const q of block.quads) {
      const colour = q.sprite.startsWith('#');
      const slot = sprites(colour ? '#' : q.sprite);
      const tint = q.tint >= 0 ? renderer.tint(state, q.tint) : null;
      const base = colour ? hexRgb(q.sprite) : [1, 1, 1] as const, t = tint ? hexRgb(tint) : [1, 1, 1] as const;
      const shade = q.shade ? BRIGHTNESS[q.shade] : 1;
      const layer: Layer = q.translucent ? 2 : slot.layer;
      quads.push({ q, slot, layer, rgb: [base[0] * t[0] * shade, base[1] * t[1] * shade, base[2] * t[2] * shade] });
      if (q.cull) {
        const bit = 1 << FACE_NAMES.indexOf(q.cull);
        if (coversFace(q, q.cull)) { full |= bit; if (layer === 0) occludes |= bit; }
      }
    }
    hit = { quads, occludes, full, id: state.id };
    prepared.set(index, hit);
    return hit;
  };

  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let blocks = 0;
  for (const c of cells) if (c.kind === 'block') {
    blocks++;
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, c.position[i]!); hi[i] = Math.max(hi[i]!, c.position[i]!); }
  }
  const sx = blocks ? hi[0]! - lo[0]! + 3 : 0, sy = blocks ? hi[1]! - lo[1]! + 3 : 0, sz = blocks ? hi[2]! - lo[2]! + 3 : 0;
  // Palette index + 1 per cell over the block bounds plus a one-cell margin; 0 = empty.
  const grid = new Int32Array(sx * sy * sz);
  const at = (x: number, y: number, z: number) => ((x - lo[0]! + 1) * sy + (y - lo[1]! + 1)) * sz + (z - lo[2]! + 1);
  for (const c of cells) if (c.kind === 'block') grid[at(c.position[0], c.position[1], c.position[2])] = c.paletteIndex + 1;

  const solid = new LayerBuilder(), translucent = new LayerBuilder();
  cells.forEach((c, index) => {
    if (c.kind !== 'block') return;
    const own = prepare(c.paletteIndex);
    if (!own.quads.length) return;
    const [x, y, z] = c.position;
    const m = markOf?.(c) ?? null;
    const mark = m ? [...hexRgb(m.color), Math.max(0, Math.min(1, m.amount))] as const : NO_MARK;
    const ox = x - origin[0], oy = y - origin[1], oz = z - origin[2];
    for (const p of own.quads) {
      const cull = p.q.cull;
      if (cull) {
        const n = FACE_VECTORS[cull], neighbour = grid[at(x + n[0], y + n[1], z + n[2])]!;
        if (neighbour) {
          const other = prepare(neighbour - 1), bit = 1 << FACE_NAMES.indexOf(OPPOSITE[cull]);
          if (other.occludes & bit) continue;
          // Glass, water, leaves …: faces between two equal blocks are hidden as in Minecraft.
          if (other.id === own.id && (other.full & bit) && (own.full & (1 << FACE_NAMES.indexOf(cull)))) continue;
        }
      }
      (p.layer === 2 ? translucent : solid).add(p, ox, oy, oz, mark, index);
    }
  });
  const s = solid.done(), t = translucent.done();
  return { solid: s, translucent: t, quads: s.quads + t.quads, blocks, naiveQuads: blocks * 6 };
}
