import type { Vec3 } from '../../../voxel/src/types.js';
import { DomainError } from '../core/types.js';
import { MAX_EDIT_CELLS } from './draft.js';
import type { CellChange, CellValue, Edit } from './draft.js';

/**
 * Farbpaletten und Bild → Blöcke (EDIT-04, Ideen aus Blockpaletten- und
 * Pixel-Art-Generatoren). The domain gets the candidate blocks with their
 * colours from the caller (the web app derives them from its block colour
 * table), so no colour data or texture lives in the core. Colours are
 * compared in CIE Lab (D65), which follows perceived differences much better
 * than RGB.
 */
export type Rgb = readonly [number, number, number];
export type Lab = readonly [number, number, number];
export interface ColorCandidate {
  readonly id: string;
  /** Colour seen from the side (walls) and from above (floors). */
  readonly side: Rgb;
  readonly top: Rgb;
  /** Block state to write; default `{ id, properties: {} }`. */
  readonly value?: CellValue;
}

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new DomainError('INVALID', `Keine Farbe: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(c: Rgb): string { return `#${c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`; }

export function rgbToLab(c: Rgb): Lab {
  const lin = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
/** Euclidean distance in Lab (ΔE 1976); about 2.3 is a just noticeable difference. */
export function deltaE(a: Lab, b: Lab): number { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

export type Face = 'side' | 'top';
interface Prepared { readonly c: ColorCandidate; readonly lab: Lab }
function prepare(candidates: readonly ColorCandidate[], face: Face): Prepared[] {
  if (!candidates.length) throw new DomainError('INVALID', 'Keine Blöcke zur Farbauswahl');
  return candidates.map(c => ({ c, lab: rgbToLab(face === 'top' ? c.top : c.side) }));
}
function nearest(lab: Lab, list: readonly Prepared[], skip?: ReadonlySet<string>): Prepared {
  let best = list[0]!, d = Infinity;
  for (const p of list) { if (skip?.has(p.c.id)) continue; const e = deltaE(lab, p.lab); if (e < d) { d = e; best = p; } }
  return best;
}
export const valueOf = (c: ColorCandidate): CellValue => c.value ?? { kind: 'block', state: { id: c.id, properties: {} } };

/** Blocks closest in colour to `rgb`, best first, with their ΔE. */
export function similarBlocks(rgb: Rgb, candidates: readonly ColorCandidate[], count = 8, face: Face = 'side'): { candidate: ColorCandidate; distance: number }[] {
  const lab = rgbToLab(rgb);
  return prepare(candidates, face).map(p => ({ candidate: p.c, distance: deltaE(lab, p.lab) }))
    .sort((a, b) => a.distance - b.distance || (a.candidate.id < b.candidate.id ? -1 : 1)).slice(0, Math.max(1, count));
}

/**
 * Farbverlauf: `steps` blocks from `from` to `to` (both included), chosen as
 * the candidates nearest to evenly spaced colours on the Lab line between
 * them. A block is used only once, so the gradient really has `steps` stops
 * (unless fewer candidates exist).
 */
export function colorGradient(from: ColorCandidate, to: ColorCandidate, steps: number, candidates: readonly ColorCandidate[], face: Face = 'side'): ColorCandidate[] {
  if (!Number.isInteger(steps) || steps < 2 || steps > 16) throw new DomainError('INVALID', 'Stufen 2–16 erwartet');
  const list = prepare(candidates, face);
  const a = rgbToLab(face === 'top' ? from.top : from.side), b = rgbToLab(face === 'top' ? to.top : to.side);
  const used = new Set([from.id, to.id]), out: ColorCandidate[] = [from];
  for (let i = 1; i < steps - 1; i++) {
    const t = i / (steps - 1), lab: Lab = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    if (used.size >= list.length) break;
    const p = nearest(lab, list, used);
    used.add(p.c.id); out.push(p.c);
  }
  out.push(to);
  return out;
}

export interface PixelImage {
  readonly width: number;
  readonly height: number;
  /** RGBA bytes, row by row from the top-left pixel. */
  readonly data: ArrayLike<number>;
}
export type ImageOrientation = 'wall-x' | 'wall-z' | 'floor';
export const IMAGE_ORIENTATION_LABEL: Readonly<Record<ImageOrientation, string>> = {
  'wall-x': 'Wandbild entlang X (Blick nach Süden)', 'wall-z': 'Wandbild entlang Z (Blick nach Osten)', floor: 'Bodenbild (von oben)',
};
export interface ImageOptions {
  readonly orientation: ImageOrientation;
  /** Lower corner of the picture (bottom-left for walls, north-west for floors). */
  readonly origin: Vec3;
  /** Floyd–Steinberg error diffusion: finer shading, more different blocks. */
  readonly dither?: boolean;
  /** Pixels with alpha below this (0–255, default 128) stay empty. */
  readonly alphaThreshold?: number;
}
export const MAX_IMAGE_SIDE = 256;

/**
 * Bild → Blöcke: every pixel becomes the candidate block with the nearest
 * colour (side colour for walls, top colour for floors). Deterministic: the
 * same picture and options give the same cells.
 */
export function imageToBlocks(img: PixelImage, candidates: readonly ColorCandidate[], o: ImageOptions): { edit: Edit; counts: { candidate: ColorCandidate; count: number }[]; meanError: number } {
  const { width: W, height: H } = img;
  if (!Number.isInteger(W) || !Number.isInteger(H) || W < 1 || H < 1) throw new DomainError('INVALID', 'Leeres Bild');
  if (W > MAX_IMAGE_SIDE || H > MAX_IMAGE_SIDE) throw new DomainError('INVALID', `Bild höchstens ${MAX_IMAGE_SIDE} × ${MAX_IMAGE_SIDE} Pixel (verkleinern)`);
  if (img.data.length < W * H * 4) throw new DomainError('INVALID', 'Bilddaten unvollständig');
  if (W * H > MAX_EDIT_CELLS) throw new DomainError('LIMIT', 'Bild zu groß');
  const list = prepare(candidates, o.orientation === 'floor' ? 'top' : 'side');
  const listRgb = list.map(p => o.orientation === 'floor' ? p.c.top : p.c.side);
  const alphaMin = o.alphaThreshold ?? 128;
  // Working colours (float, for error diffusion).
  const px = new Float64Array(W * H * 3);
  for (let i = 0; i < W * H; i++) for (let k = 0; k < 3; k++) px[i * 3 + k] = Number(img.data[i * 4 + k]);
  const cache = new Map<number, number>();
  const pick = (r: number, g: number, b: number): number => {
    const q = (Math.max(0, Math.min(255, Math.round(r))) >> 2) << 12 | (Math.max(0, Math.min(255, Math.round(g))) >> 2) << 6 | (Math.max(0, Math.min(255, Math.round(b))) >> 2);
    let hit = cache.get(q);
    if (hit === undefined) { hit = list.indexOf(nearest(rgbToLab([r, g, b]), list)); cache.set(q, hit); }
    return hit;
  };
  const changes: CellChange[] = [], counts = new Map<number, number>();
  let err = 0, n = 0;
  for (let row = 0; row < H; row++) for (let col = 0; col < W; col++) {
    const i = row * W + col;
    if (Number(img.data[i * 4 + 3]) < alphaMin) continue;
    const r = px[i * 3]!, g = px[i * 3 + 1]!, b = px[i * 3 + 2]!;
    const j = pick(r, g, b), c = listRgb[j]!;
    counts.set(j, (counts.get(j) ?? 0) + 1);
    err += deltaE(rgbToLab([Number(img.data[i * 4]), Number(img.data[i * 4 + 1]), Number(img.data[i * 4 + 2])]), list[j]!.lab); n++;
    if (o.dither) {
      const e = [r - c[0], g - c[1], b - c[2]];
      const spread = (dc: number, dr: number, w: number) => {
        const cc = col + dc, rr = row + dr;
        if (cc < 0 || cc >= W || rr >= H) return;
        const t = rr * W + cc;
        for (let k = 0; k < 3; k++) px[t * 3 + k]! += e[k]! * w;
      };
      spread(1, 0, 7 / 16); spread(-1, 1, 3 / 16); spread(0, 1, 5 / 16); spread(1, 1, 1 / 16);
    }
    const [ox, oy, oz] = o.origin;
    const position: Vec3 = o.orientation === 'floor' ? [ox + col, oy, oz + row]
      : o.orientation === 'wall-x' ? [ox + col, oy + (H - 1 - row), oz]
      : [ox, oy + (H - 1 - row), oz + col];
    changes.push({ position, value: valueOf(list[j]!.c) });
  }
  const sorted = [...counts.entries()].map(([j, count]) => ({ candidate: list[j]!.c, count })).sort((a, b) => b.count - a.count || (a.candidate.id < b.candidate.id ? -1 : 1));
  return { edit: { label: `Bild → Blöcke (${W} × ${H})`, changes }, counts: sorted, meanError: n ? err / n : 0 };
}
