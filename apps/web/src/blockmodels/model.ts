/**
 * Block model baking (Blockdarstellung): turns a block state into textured
 * quads following the Minecraft Java resource format – blockstate variants and
 * multipart, model parents, texture variables, elements with per-face UV,
 * face rotation, element rotation (legacy axis/angle with rescale, and the
 * newer x/y/z form), variant x/y rotation with uvlock, cullface, tintindex and
 * shade. Pure and DOM-free; the JSON comes from a texture source the user
 * loaded (client jar, resource packs). Nothing here ships Mojang data.
 *
 * Coordinates: block units 0..1, Minecraft axes (north = −Z, east = +X, up = +Y).
 */
export type FaceName = 'down' | 'up' | 'north' | 'south' | 'west' | 'east';
export const FACE_NAMES: readonly FaceName[] = ['down', 'up', 'north', 'south', 'west', 'east'];
export const FACE_VECTORS: Readonly<Record<FaceName, readonly [number, number, number]>> = {
  down: [0, -1, 0], up: [0, 1, 0], north: [0, 0, -1], south: [0, 0, 1], west: [-1, 0, 0], east: [1, 0, 0],
};
export const OPPOSITE: Readonly<Record<FaceName, FaceName>> = { down: 'up', up: 'down', north: 'south', south: 'north', west: 'east', east: 'west' };

export interface BakedQuad {
  /** Four corners (x,y,z each), counter-clockwise seen from the front. */
  readonly pos: readonly number[];
  /** Sprite-relative UV (0..1, v downwards) per corner. */
  readonly uv: readonly number[];
  /** Texture id (`minecraft:block/stone`) or a plain colour `#rrggbb`. */
  readonly sprite: string;
  /** Model tintindex, −1 without tint. */
  readonly tint: number;
  /** Hidden when the neighbour on this side covers it. */
  readonly cull: FaceName | null;
  /** Direction for the fixed Minecraft face brightness; null = unshaded. */
  readonly shade: FaceName | null;
  /** Texture marked force_translucent (stained glass and the like). */
  readonly translucent: boolean;
}

export interface BakedBlock {
  readonly quads: readonly BakedQuad[];
  /** 'pack' = real model, 'entity' = model without geometry (chests, banners …), 'missing' = no blockstate. */
  readonly kind: 'pack' | 'entity' | 'missing' | 'fallback';
  /** Particle texture, e.g. for entity-rendered blocks. */
  readonly particle?: string;
}

/** Read access to the files of the loaded texture source(s). */
export interface ModelSource {
  json(path: string): unknown;
}

type Vec = [number, number, number];
interface FaceSpec { uv?: number[]; texture: string; cullface?: string; rotation?: number; tintindex?: number }
interface ElementRotation { origin?: number[]; axis?: 'x' | 'y' | 'z'; angle?: number; rescale?: boolean; x?: number; y?: number; z?: number }
interface Element { from: number[]; to: number[]; rotation?: ElementRotation; shade?: boolean; faces?: Partial<Record<string, FaceSpec>>; shade_direction_override?: string }
interface ResolvedModel { readonly textures: ReadonlyMap<string, { sprite: string; translucent: boolean }>; readonly elements: readonly Element[] | null }
interface Variant { model: string; x?: number; y?: number; uvlock?: boolean }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `minecraft:block/stone` → [namespace, path]. */
export function location(ref: string): [string, string] {
  const i = ref.indexOf(':');
  return i < 0 ? ['minecraft', ref] : [ref.slice(0, i), ref.slice(i + 1)];
}
export const spriteFile = (sprite: string) => { const [ns, p] = location(sprite); return `assets/${ns}/textures/${p}.png`; };
const canonical = (ref: string) => { const [ns, p] = location(ref); return `${ns}:${p}`; };

// ------------------------------------------------------------------ geometry helpers
/** Corners per face as indices into [x0,x1] × [y0,y1] × [z0,z1] (0 = from, 1 = to): TL, BL, BR, TR seen from outside. */
const CORNERS: Readonly<Record<FaceName, readonly (readonly [number, number, number])[]>> = {
  north: [[1, 1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]],
  south: [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]],
  west: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]],
  east: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]],
  up: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
  down: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
};

/** Minecraft's default UV of a point on a face (in 0..16 texture pixels). */
function defaultUv(face: FaceName, p: readonly number[]): [number, number] {
  switch (face) {
    case 'up': return [p[0]!, p[2]!];
    case 'down': return [p[0]!, 16 - p[2]!];
    case 'north': return [16 - p[0]!, 16 - p[1]!];
    case 'south': return [p[0]!, 16 - p[1]!];
    case 'west': return [p[2]!, 16 - p[1]!];
    case 'east': return [16 - p[2]!, 16 - p[1]!];
  }
}

const deg = (a: number) => a * Math.PI / 180;
function rotateAxis(v: Vec, axis: 'x' | 'y' | 'z', angle: number): Vec {
  const c = Math.cos(deg(angle)), s = Math.sin(deg(angle)), [x, y, z] = v;
  if (axis === 'x') return [x, y * c - z * s, y * s + z * c];
  if (axis === 'y') return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}
const round = (n: number) => Math.abs(n - Math.round(n)) < 1e-6 ? Math.round(n) : n;

function applyElementRotation(p: Vec, r: ElementRotation): Vec {
  const o = (r.origin ?? [8, 8, 8]) as number[];
  let d: Vec = [p[0] - o[0]!, p[1] - o[1]!, p[2] - o[2]!];
  if (r.axis && typeof r.angle === 'number') {
    d = rotateAxis(d, r.axis, r.angle);
    if (r.rescale && r.angle % 90 !== 0) {
      const scale = 1 / Math.cos(deg(Math.abs(r.angle) % 90 === 22.5 || Math.abs(r.angle) % 90 === 67.5 ? 22.5 : 45));
      d = [r.axis === 'x' ? d[0] : d[0] * scale, r.axis === 'y' ? d[1] : d[1] * scale, r.axis === 'z' ? d[2] : d[2] * scale];
    }
  } else {
    // Euler form: R = Rx · Ry · Rz (Z applied first).
    if (r.z) d = rotateAxis(d, 'z', r.z);
    if (r.y) d = rotateAxis(d, 'y', r.y);
    if (r.x) d = rotateAxis(d, 'x', r.x);
  }
  return [d[0] + o[0]!, d[1] + o[1]!, d[2] + o[2]!];
}

/** Variant rotation in quarter turns: x first (up → north), then y (north → east), around the block centre. */
function variantRotate(p: Vec, xq: number, yq: number): Vec {
  let [x, y, z] = [p[0] - 8, p[1] - 8, p[2] - 8];
  for (let i = 0; i < xq; i++) [y, z] = [z, -y];
  for (let i = 0; i < yq; i++) [x, z] = [-z, x];
  return [x + 8, y + 8, z + 8];
}
function rotateFace(face: FaceName, xq: number, yq: number): FaceName {
  const v = variantRotate([8 + FACE_VECTORS[face][0], 8 + FACE_VECTORS[face][1], 8 + FACE_VECTORS[face][2]], xq, yq);
  const n = [Math.round(v[0] - 8), Math.round(v[1] - 8), Math.round(v[2] - 8)];
  return FACE_NAMES.find(f => FACE_VECTORS[f].every((c, i) => c === n[i]))!;
}
const quarter = (angle: number | undefined) => ((Math.round((angle ?? 0) / 90) % 4) + 4) % 4;

// ------------------------------------------------------------------ blockstates
function whenMatches(when: unknown, props: Readonly<Record<string, string>>): boolean {
  if (!isObject(when)) return true;
  for (const [key, value] of Object.entries(when)) {
    if (key === 'OR') { if (!Array.isArray(value) || !value.some(w => whenMatches(w, props))) return false; continue; }
    if (key === 'AND') { if (!Array.isArray(value) || !value.every(w => whenMatches(w, props))) return false; continue; }
    const have = props[key];
    if (have === undefined || !String(value).split('|').includes(have)) return false;
  }
  return true;
}

function variantMatches(key: string, props: Readonly<Record<string, string>>): boolean {
  if (key === '' || key === 'normal') return true;
  return key.split(',').every(pair => { const [k, v] = pair.split('='); return k !== undefined && props[k] === v; });
}
const first = (v: unknown): Variant | null => {
  const x = Array.isArray(v) ? v[0] : v;
  return isObject(x) && typeof x.model === 'string' ? x as unknown as Variant : null;
};

/** The variants a state applies; `matched` false when no variant fits and the first one stands in. */
export function selectVariants(blockstate: unknown, props: Readonly<Record<string, string>>): { variants: Variant[]; matched: boolean } {
  if (!isObject(blockstate)) return { variants: [], matched: false };
  if (isObject(blockstate.variants)) {
    const entries = Object.entries(blockstate.variants);
    const hit = entries.find(([k]) => variantMatches(k, props));
    const v = first((hit ?? entries[0])?.[1]);
    return { variants: v ? [v] : [], matched: hit !== undefined };
  }
  if (Array.isArray(blockstate.multipart)) {
    const variants: Variant[] = [];
    for (const part of blockstate.multipart) {
      if (!isObject(part) || !whenMatches(part.when, props)) continue;
      const v = first(part.apply);
      if (v) variants.push(v);
    }
    return { variants, matched: true };
  }
  return { variants: [], matched: false };
}

// ------------------------------------------------------------------ bakery
export class Bakery {
  private readonly models = new Map<string, ResolvedModel | null>();
  private readonly baked = new Map<string, BakedBlock>();
  private readonly source: ModelSource;

  constructor(source: ModelSource) { this.source = source; }

  /** Resolved model with inherited textures and elements; null when the file is missing. */
  model(ref: string, depth = 0): ResolvedModel | null {
    const key = canonical(ref);
    if (this.models.has(key)) return this.models.get(key)!;
    const [ns, p] = location(key);
    const json = this.source.json(`assets/${ns}/models/${p}.json`);
    let result: ResolvedModel | null = null;
    if (isObject(json)) {
      const parent = typeof json.parent === 'string' && depth < 32 ? this.model(json.parent, depth + 1) : null;
      const textures = new Map(parent?.textures ?? []);
      if (isObject(json.textures)) for (const [k, v] of Object.entries(json.textures)) {
        if (typeof v === 'string') textures.set(k, { sprite: v, translucent: false });
        else if (isObject(v) && typeof v.sprite === 'string') textures.set(k, { sprite: v.sprite, translucent: v.force_translucent === true });
      }
      result = { textures, elements: Array.isArray(json.elements) ? json.elements as Element[] : parent?.elements ?? null };
    }
    this.models.set(key, result);
    return result;
  }

  private texture(model: ResolvedModel, ref: string): { sprite: string; translucent: boolean } | null {
    // Face textures may name a variable without '#' (heavy_core: "all"); Minecraft reads those as references too.
    let r = !ref.startsWith('#') && !ref.includes(':') && !ref.includes('/') && model.textures.has(ref) ? `#${ref}` : ref, translucent = false;
    for (let i = 0; i < 16 && r.startsWith('#'); i++) {
      const t = model.textures.get(r.slice(1));
      if (!t) return null;
      r = t.sprite; translucent ||= t.translucent;
    }
    return r.startsWith('#') ? null : { sprite: canonical(r), translucent };
  }

  /** Bakes a block state; cached per state. */
  bake(id: string, props: Readonly<Record<string, string>>): BakedBlock {
    const key = `${id}[${Object.keys(props).sort().map(k => `${k}=${props[k]}`).join(',')}]`;
    const hit = this.baked.get(key);
    if (hit) return hit;
    const [ns, name] = location(id);
    const state = this.source.json(`assets/${ns}/blockstates/${name}.json`);
    let block: BakedBlock;
    if (!isObject(state)) block = { quads: [], kind: 'missing' };
    else {
      const { variants } = selectVariants(state, props);
      const quads: BakedQuad[] = [];
      let particle: string | undefined, anyElements = false;
      for (const v of variants) {
        const model = this.model(v.model);
        if (!model) continue;
        particle ??= this.texture(model, '#particle')?.sprite;
        if (!model.elements?.length) continue;
        anyElements = true;
        for (const el of model.elements) this.bakeElement(model, el, quarter(v.x), quarter(v.y), v.uvlock === true, quads);
      }
      block = anyElements ? { quads, kind: 'pack', ...(particle && { particle }) }
        : { quads: [], kind: variants.length ? 'entity' : 'missing', ...(particle && { particle }) };
    }
    this.baked.set(key, block);
    return block;
  }

  private bakeElement(model: ResolvedModel, el: Element, xq: number, yq: number, uvlock: boolean, out: BakedQuad[]): void {
    if (!Array.isArray(el.from) || !Array.isArray(el.to) || !isObject(el.faces)) return;
    const from = el.from, to = el.to;
    for (const face of FACE_NAMES) {
      const spec = el.faces[face];
      if (!spec || typeof spec.texture !== 'string') continue;
      const tex = this.texture(model, spec.texture);
      if (!tex) continue;
      let corners: Vec[] = CORNERS[face].map(([a, b, c]) => [a ? to[0]! : from[0]!, b ? to[1]! : from[1]!, c ? to[2]! : from[2]!]);
      const uvRect = Array.isArray(spec.uv) && spec.uv.length === 4 ? spec.uv
        : (() => { const a = defaultUv(face, from), b = defaultUv(face, to); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; })();
      const [u1, v1, u2, v2] = uvRect as [number, number, number, number];
      const uvCorners: [number, number][] = [[u1, v1], [u1, v2], [u2, v2], [u2, v1]];
      const shift = quarter(spec.rotation);
      let uv = [0, 1, 2, 3].flatMap(i => uvCorners[(i + shift) % 4]!);
      if (el.rotation) corners = corners.map(p => applyElementRotation(p, el.rotation!));
      if (xq || yq) corners = corners.map(p => variantRotate(p, xq, yq));
      const worldFace = rotateFace(face, xq, yq);
      if (uvlock && (xq || yq) && !el.rotation) uv = corners.flatMap(p => defaultUv(worldFace, p));
      const cull = typeof spec.cullface === 'string' && (FACE_NAMES as readonly string[]).includes(spec.cullface)
        ? rotateFace(spec.cullface as FaceName, xq, yq) : null;
      const override = typeof el.shade_direction_override === 'string' && (FACE_NAMES as readonly string[]).includes(el.shade_direction_override)
        ? rotateFace(el.shade_direction_override as FaceName, xq, yq) : null;
      out.push({
        pos: corners.flatMap(p => [round(p[0]) / 16, round(p[1]) / 16, round(p[2]) / 16]),
        uv: uv.map(n => n / 16),
        sprite: tex.sprite,
        tint: typeof spec.tintindex === 'number' ? spec.tintindex : -1,
        cull,
        shade: el.shade === false ? null : override ?? worldFace,
        translucent: tex.translucent,
      });
    }
  }
}

/** True when the quad lies on the block boundary of `face` and covers it completely. */
export function coversFace(q: BakedQuad, face: FaceName): boolean {
  const axis = face === 'west' || face === 'east' ? 0 : face === 'down' || face === 'up' ? 1 : 2;
  const plane = face === 'east' || face === 'up' || face === 'south' ? 1 : 0;
  let lo1 = Infinity, hi1 = -Infinity, lo2 = Infinity, hi2 = -Infinity;
  const a1 = (axis + 1) % 3, a2 = (axis + 2) % 3;
  for (let i = 0; i < 4; i++) {
    if (Math.abs(q.pos[i * 3 + axis]! - plane) > 1e-6) return false;
    const p1 = q.pos[i * 3 + a1]!, p2 = q.pos[i * 3 + a2]!;
    lo1 = Math.min(lo1, p1); hi1 = Math.max(hi1, p1); lo2 = Math.min(lo2, p2); hi2 = Math.max(hi2, p2);
  }
  return lo1 <= 1e-6 && hi1 >= 1 - 1e-6 && lo2 <= 1e-6 && hi2 >= 1 - 1e-6;
}
