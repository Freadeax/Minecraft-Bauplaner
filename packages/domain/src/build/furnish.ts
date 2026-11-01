import { Plot, F, T, OPPOSITE, slab, stairs, trapdoor, lantern } from './plot.js';
import type { H, Props } from './plot.js';

/**
 * Möbel- und Zustandsbaukasten (Katalog v3): Vanilla-Möbeltricks aus Treppen,
 * Stufen, Falltüren, Zäunen und Teppichen, plus Zustandshelfer für die
 * Blöcke, deren B7-Regel mit v3 dazukam (Glocke, Kakao,
 * Tageslichtsensor, Süßbeeren, Seetang, Bambus).
 * Alle Helfer schreiben exakt das B7-Schema.
 */

const STEP: Readonly<Record<H, readonly [number, number]>> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
/** The horizontal direction 90° clockwise (seen from above). */
export const CW: Readonly<Record<H, H>> = { north: 'east', east: 'south', south: 'west', west: 'north' };

// ------------------------------------------------------------ state helpers (new B7 rules)
export const bell = (f: H, attachment: 'floor' | 'ceiling' | 'single_wall' | 'double_wall' = 'floor'): Props => ({ attachment, facing: f, powered: F });
export const cocoa = (f: H, age = 2): Props => ({ age: String(age), facing: f });
export const daylight = (inverted = false): Props => ({ inverted: inverted ? T : F, power: '0' });
export const berries = (age = 3): Props => ({ age: String(age) });
export const kelp = (age = 25): Props => ({ age: String(age) });
export const bamboo = (leaves: 'none' | 'small' | 'large' = 'none'): Props => ({ age: '0', leaves, stage: '0' });
export const fenceGate = (f: H, open = false): Props => ({ facing: f, in_wall: F, open: open ? T : F, powered: F });
export const wallTorch = (f: H): Props => ({ facing: f });
export const wallBanner = (f: H): Props => ({ facing: f });

// ------------------------------------------------------------ furniture
/** Chair: a stair whose back faces `back`; optional trapdoor arm rests left and right. */
export function chair(p: Plot, x: number, y: number, z: number, wood: string, back: H, arms = false): void {
  p.set(x, y, z, `${wood}_stairs`, stairs(back));
  if (!arms) return;
  const [sx, sz] = STEP[CW[back]];
  for (const s of [1, -1]) if (p.inside(x + s * sx, y, z + s * sz) && !p.get(x + s * sx, y, z + s * sz))
    p.set(x + s * sx, y, z + s * sz, `${wood}_trapdoor`, trapdoor(s === 1 ? CW[back] : OPPOSITE[CW[back]], 'bottom', true));
}
/** Sofa of `n` stairs in a row along the axis perpendicular to `back`, closed by open trapdoors. */
export function sofa(p: Plot, x: number, y: number, z: number, wood: string, back: H, n: number, cushion?: string): void {
  const [sx, sz] = STEP[CW[back]];
  for (let i = 0; i < n; i++) p.set(x + i * sx, y, z + i * sz, cushion ? `${cushion}_stairs` : `${wood}_stairs`, stairs(back));
  const ends: readonly [number, H][] = [[-1, OPPOSITE[CW[back]]], [n, CW[back]]];
  for (const [i, f] of ends) if (p.inside(x + i * sx, y, z + i * sz)) p.set(x + i * sx, y, z + i * sz, `${wood}_trapdoor`, trapdoor(f, 'bottom', true));
}
/** Table: fence leg with a pressure plate top (one cell). */
export function table(p: Plot, x: number, y: number, z: number, wood: string, top: 'plate' | 'carpet' = 'plate', carpet = 'white'): void {
  p.set(x, y, z, `${wood}_fence`);
  p.set(x, y + 1, z, top === 'plate' ? `${wood}_pressure_plate` : `${carpet}_carpet`, top === 'plate' ? { powered: F } : {});
}
/** Long table: a row of upper slabs from (x0,z0) to (x1,z1). */
export function longTable(p: Plot, x0: number, z0: number, x1: number, z1: number, y: number, top: string): void {
  p.fill(x0, y, z0, x1, y, z1, top, slab('top'));
}
/** Cupboard: barrels behind closed trapdoor doors, `h` cells high, facing the room. */
export function cupboard(p: Plot, x: number, y: number, z: number, wood: string, f: H, h = 2): void {
  for (let i = 0; i < h; i++) p.set(x, y + i, z, 'barrel', { facing: f, open: F });
  const [dx, dz] = STEP[f];
  for (let i = 0; i < h; i++) if (p.inside(x + dx, y + i, z + dz)) p.set(x + dx, y + i, z + dz, `${wood}_trapdoor`, trapdoor(f, 'bottom', true));
}
/** Kitchen counter: upper slabs or a block row with a smoker and a cauldron sink. */
export function counter(p: Plot, x0: number, z0: number, x1: number, z1: number, y: number, top: string): void {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) p.set(x, y, z, top, slab('top'));
}
/** Ceiling lamp: chain down from the ceiling with a hanging lantern. */
export function hangingLamp(p: Plot, x: number, yCeil: number, z: number, chainLen = 1, light = 'lantern'): void {
  for (let i = 1; i <= chainLen; i++) p.set(x, yCeil - i, z, 'chain', { axis: 'y', waterlogged: F });
  p.set(x, yCeil - chainLen - 1, z, light, lantern(true));
}
/** Rug: carpet rectangle. */
export function rug(p: Plot, x0: number, z0: number, x1: number, z1: number, y: number, color: string, border?: string): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++)
    p.set(x, y, z, `${border && (x === x0 || x === x1 || z === z0 || z === z1) ? border : color}_carpet`);
}
/** Exposed ceiling beam along x over the whole room width with a chain lamp below at `x`. */
export function beamLamp(p: Plot, x: number, z: number, yBeam: number, width: number, beam: string, chainLen = 1, light = 'lantern'): void {
  p.fill(0, yBeam, z, width - 1, yBeam, z, beam, beam.endsWith('_log') ? { axis: 'x' } : {});
  hangingLamp(p, x, yBeam, z, chainLen, light);
}
/**
 * Room module: floor and walls with open sides (dollhouse cut, so the
 * catalogue preview from the south-east looks inside) and an optional
 * ceiling. The room is meant to be set into a house shell of the same size;
 * the inside is explicit air so it clears what was there.
 */
export function roomShell(p: Plot, w: number, d: number, h: number, floor: string, wall: string, open: H | readonly H[] | null, ceiling: string | null, wallProps: Props = {}): void {
  p.fill(0, 0, 0, w - 1, 0, d - 1, floor);
  p.room(0, 0, w - 1, d - 1, 1, h, wall, wallProps);
  const sides = new Set<H>(open === null ? [] : typeof open === 'string' ? [open as H] : open as readonly H[]);
  const side = (f: H): readonly [number, number, number, number] => f === 'south' ? [0, d - 1, w - 1, d - 1] : f === 'north' ? [0, 0, w - 1, 0] : f === 'east' ? [w - 1, 0, w - 1, d - 1] : [0, 0, 0, d - 1];
  for (const f of sides) {
    const [x0, z0, x1, z1] = side(f);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      // A corner stays when the neighbouring side is closed.
      const corner = (x === 0 || x === w - 1) && (z === 0 || z === d - 1);
      if (corner) {
        const other: H = f === 'south' || f === 'north' ? (x === 0 ? 'west' : 'east') : (z === 0 ? 'north' : 'south');
        if (!sides.has(other)) continue;
      }
      p.fill(x, 1, z, x, h, z, null);
    }
  }
  if (ceiling) p.fill(0, h + 1, 0, w - 1, h + 1, d - 1, ceiling);
}
/** Decorated pot (B7: cracked, facing, waterlogged). */
export const pot = (f: H = 'south'): Props => ({ cracked: F, facing: f, waterlogged: F });
