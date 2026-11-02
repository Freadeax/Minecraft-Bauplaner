import type { BakedQuad, FaceName } from './model.ts';
import { box } from './shapes.ts';

/**
 * Own geometry of free entities (ENTITY-01): paintings, item frames, armor
 * stands and a marker for every other entity. The views turn each entity into
 * one extra cell at its anchor with the reserved state `bauplaner:entity`
 * whose properties describe the geometry (entityScene.ts), so the 3D view,
 * still images and layer images draw it with the block mesh pipeline (light,
 * picking, layers). Own shapes and colours: no Mojang textures – paintings
 * show a colour mosaic per motif, not the artwork.
 */
export const ENTITY_STATE_ID = 'bauplaner:entity';
type V3 = readonly [number, number, number];

const WOOD = '#9c7246', FRAME = '#8a5a2b', GLOW_FRAME = '#d4b44a', CANVAS_BACK = '#6b4a2b', STONE = '#9a9a9a';
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
/** Deterministic colour mosaic per painting motif (no artwork is shipped). */
function mosaic(variant: string, n: number): string[] {
  const h = hash(variant), base = h % 360, out: string[] = [];
  for (let i = 0; i < n; i++) {
    const k = hash(`${variant}:${i}`), hue = (base + (k % 90) - 45 + 360) % 360, l = 0.32 + ((k >>> 8) % 40) / 100, s = 0.35 + ((k >>> 16) % 35) / 100;
    const a = s * Math.min(l, 1 - l), f = (m: number) => { const t = (m + hue / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(t - 3, 9 - t, 1)))).toString(16).padStart(2, '0'); };
    out.push(`#${f(0)}${f(8)}${f(4)}`);
  }
  return out;
}

// ------------------------------------------------------------------ quads
const FACES: readonly FaceName[] = ['down', 'up', 'north', 'south', 'west', 'east'];
const NORMAL: Readonly<Record<FaceName, V3>> = { down: [0, -1, 0], up: [0, 1, 0], north: [0, 0, -1], south: [0, 0, 1], west: [-1, 0, 0], east: [1, 0, 0] };
const nearestFace = (v: V3): FaceName => FACES.reduce((best, f) => { const n = NORMAL[f], b = NORMAL[best]; return n[0] * v[0] + n[1] * v[1] + n[2] * v[2] > b[0] * v[0] + b[1] * v[1] + b[2] * v[2] ? f : best; }, 'up' as FaceName);

/** Box in block units around the local origin (x/z centred), coloured, as quads. */
function part(from: V3, to: V3, color: string, faces?: readonly FaceName[]): BakedQuad[] {
  return box([from[0] * 16, from[1] * 16, from[2] * 16], [to[0] * 16, to[1] * 16, to[2] * 16], { top: color, side: color, bottom: color }, faces)
    .map(({ part: _part, ...q }) => ({ ...q, cull: null }));
}
/** Rotates quads about the local origin (yaw like Minecraft: 0 = facing south, 90 = west) and moves them to `at`. */
function place(quads: readonly BakedQuad[], yaw: number, at: V3, pitchUp = 0): BakedQuad[] {
  const r = yaw * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const tx = (x: number, y: number, z: number): V3 => {
    // Optional tilt for frames lying on floors/ceilings: front (+Z) turns to +Y (pitchUp = 1) or −Y (−1).
    if (pitchUp) [y, z] = [z * pitchUp, -y * pitchUp];
    return [x * c - z * s + at[0], y + at[1], x * s + z * c + at[2]];
  };
  return quads.map(q => {
    const pos: number[] = [];
    for (let i = 0; i < 12; i += 3) pos.push(...tx(q.pos[i]!, q.pos[i + 1]!, q.pos[i + 2]!));
    const n = q.shade ? NORMAL[q.shade] : NORMAL.up, o = tx(0, 0, 0), m = tx(n[0], n[1], n[2]);
    const shade = nearestFace([m[0] - o[0], m[1] - o[1], m[2] - o[2]]);
    return { ...q, pos, shade, cull: null };
  });
}
const YAW: Readonly<Record<string, number>> = { south: 0, west: 90, north: 180, east: -90 };

function paintingQuads(p: Readonly<Record<string, string>>): BakedQuad[] {
  const w = Number(p.w ?? 1), h = Number(p.h ?? 1), motif = p.motif ?? 'minecraft:kebab';
  const quads: BakedQuad[] = [...part([-w / 2, -h / 2, -1 / 32], [w / 2, h / 2, 1 / 32], CANVAS_BACK, ['north', 'west', 'east', 'up', 'down'])];
  // Front: wooden border plus a 2×2 colour mosaic per block.
  const cols = w * 2, rows = h * 2, colors = mosaic(motif, cols * rows), b = 1 / 16;
  quads.push(...part([-w / 2, -h / 2, 1 / 32 - 0.001], [w / 2, h / 2, 1 / 32], WOOD, ['south']));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x0 = -w / 2 + b + (w - 2 * b) * i / cols, x1 = -w / 2 + b + (w - 2 * b) * (i + 1) / cols;
    const y0 = -h / 2 + b + (h - 2 * b) * j / rows, y1 = -h / 2 + b + (h - 2 * b) * (j + 1) / rows;
    quads.push(...part([x0, y0, 1 / 32], [x1, y1, 1 / 32 + 0.002], colors[i * rows + j]!, ['south']));
  }
  return quads;
}
function frameQuads(p: Readonly<Record<string, string>>): BakedQuad[] {
  const quads = part([-6 / 16, -6 / 16, -1 / 32], [6 / 16, 6 / 16, 1 / 32], p.kind === 'glow_item_frame' ? GLOW_FRAME : FRAME);
  quads.push(...part([-5 / 16, -5 / 16, 1 / 32], [5 / 16, 5 / 16, 1 / 32 + 0.002], '#c8a878', ['south']));
  if (p.item) quads.push(...part([-4 / 16, -4 / 16, 1 / 32 + 0.002], [4 / 16, 4 / 16, 1 / 32 + 1 / 16], p.item));
  return quads;
}
function armorStandQuads(p: Readonly<Record<string, string>>): BakedQuad[] {
  const k = p.small ? 0.5 : 1, s = (v: V3): V3 => [v[0] * k, v[1] * k, v[2] * k];
  const q: BakedQuad[] = [];
  const add = (from: V3, to: V3, color: string) => q.push(...part(s(from), s(to), color));
  if (p.plate) add([-6 / 16, 0, -6 / 16], [6 / 16, 1 / 16, 6 / 16], STONE);
  if (!p.invisible) {
    add([-1 / 16, 1 / 16, -1 / 16], [1 / 16, 23 / 16, 1 / 16], WOOD); // body post
    add([-3 / 16, 1 / 16, -1 / 16], [-1 / 16, 12 / 16, 1 / 16], WOOD); // legs
    add([1 / 16, 1 / 16, -1 / 16], [3 / 16, 12 / 16, 1 / 16], WOOD);
    add([-4 / 16, 12 / 16, -1 / 16], [4 / 16, 14 / 16, 1 / 16], WOOD); // hips
    add([-6 / 16, 21 / 16, -1.5 / 16], [6 / 16, 24 / 16, 1.5 / 16], WOOD); // shoulders
    add([-1 / 16, 24 / 16, -1 / 16], [1 / 16, 30 / 16, 1 / 16], WOOD); // neck
    if (p.arms) { add([-7 / 16, 12 / 16, -1 / 16], [-5 / 16, 21 / 16, 1 / 16], WOOD); add([5 / 16, 12 / 16, -1 / 16], [7 / 16, 21 / 16, 1 / 16], WOOD); }
  }
  if (p.head) add([-4.5 / 16, 23.5 / 16, -4.5 / 16], [4.5 / 16, 32.5 / 16, 4.5 / 16], p.head);
  if (p.chest) add([-4.5 / 16, 12 / 16, -2.5 / 16], [4.5 / 16, 24.5 / 16, 2.5 / 16], p.chest);
  if (p.legs) add([-4.3 / 16, 4 / 16, -2.3 / 16], [4.3 / 16, 13 / 16, 2.3 / 16], p.legs);
  if (p.feet) add([-4.5 / 16, 0.5 / 16, -2.6 / 16], [4.5 / 16, 4.5 / 16, 2.6 / 16], p.feet);
  if (p.hand) add([-7.5 / 16, 9 / 16, 1 / 16], [-4.5 / 16, 18 / 16, 3 / 16], p.hand);
  return q;
}
/** Generic marker for other entities: a small coloured column with a nose in look direction. */
function markerQuads(p: Readonly<Record<string, string>>): BakedQuad[] {
  const c = p.color ?? '#c04080';
  return [...part([-4 / 16, 0, -4 / 16], [4 / 16, 14 / 16, 4 / 16], c), ...part([-1.5 / 16, 9 / 16, 4 / 16], [1.5 / 16, 12 / 16, 7 / 16], '#ffffff')];
}

/** Quads of an entity state, in block units relative to its anchor cell. */
export function entityQuads(props: Readonly<Record<string, string>>): BakedQuad[] {
  const at: V3 = [Number(props.x ?? 0.5), Number(props.y ?? 0), Number(props.z ?? 0.5)];
  const kind = props.kind;
  if (kind === 'painting' || kind === 'item_frame' || kind === 'glow_item_frame') {
    const facing = props.facing ?? 'south';
    const local = kind === 'painting' ? paintingQuads(props) : frameQuads(props);
    if (facing === 'up' || facing === 'down') return place(local, 0, at, facing === 'up' ? 1 : -1);
    return place(local, YAW[facing] ?? 0, at);
  }
  if (kind === 'armor_stand') return place(armorStandQuads(props), Number(props.yaw ?? 0), at);
  return place(markerQuads(props), Number(props.yaw ?? 0), at);
}

