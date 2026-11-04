/**
 * Glowing block entities (GFX-02): the beacon beam and the blocks Minecraft
 * draws at full brightness regardless of the light around them.
 *
 * A beacon shines when the layer right below it is a complete 3×3 of iron,
 * gold, diamond, emerald or netherite blocks (more layers raise the level up
 * to 4 with 9×9) and nothing opaque except bedrock stands above it. Stained
 * glass and panes in the way colour the beam: the first one sets the colour,
 * each further one mixes half and half, as in Java 1.20+. Pure and DOM-free;
 * the mesh builder turns the result into a full-bright column.
 */
export interface BeamSegment {
  /** World Y where the segment starts and ends (exclusive). */
  readonly from: number;
  readonly to: number;
  /** Linear 0..1 colour. */
  readonly rgb: readonly [number, number, number];
}
export interface Beam {
  /** Pyramid level 0..4 (0 = no complete layer below). */
  readonly level: number;
  /** True when the beam reaches the sky (level ≥ 1 and nothing opaque above). */
  readonly active: boolean;
  /** Y of the opaque block that stops it, null when free. */
  readonly blockedAt: number | null;
  readonly segments: readonly BeamSegment[];
}

const BASE = /^(minecraft:)?(iron|gold|diamond|emerald|netherite)_block$/;
/** Dye colours of beacon beams (DyeColor texture diffuse colours). */
const DYE: Readonly<Record<string, string>> = {
  white: 'f9fffe', orange: 'f9801d', magenta: 'c74ebd', light_blue: '3ab3da', yellow: 'fed83d', lime: '80c71f', pink: 'f38baa', gray: '474f52',
  light_gray: '9d9d97', cyan: '169c9c', purple: '8932b8', blue: '3c44aa', brown: '835432', green: '5e7c16', red: 'b02e26', black: '1d1d21',
};
const GLASS = /^(?:minecraft:)?([a-z_]+)_stained_glass(?:_pane)?$/;
const WHITE: readonly [number, number, number] = [1, 1, 1];
const rgb = (hex: string): [number, number, number] => { const n = Number.parseInt(hex, 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

export const isBeacon = (id: string): boolean => id === 'minecraft:beacon' || id === 'beacon';
/** Beam colour a block gives, or null when it does not change the colour. */
export function beamColour(id: string): [number, number, number] | null {
  const m = GLASS.exec(id);
  const hex = m ? DYE[m[1]!] : undefined;
  return hex ? rgb(hex) : null;
}

/** Blocks Minecraft renders full-bright whatever the light around them (emissive rendering). */
export function fullBright(id: string, props: Readonly<Record<string, string>> = {}): boolean {
  const name = id.startsWith('minecraft:') ? id.slice(10) : id;
  if (name === 'magma_block' || name === 'end_portal' || name === 'end_gateway') return true;
  if (name === 'sculk_sensor' || name === 'calibrated_sculk_sensor') return props.sculk_sensor_phase === 'active';
  return false;
}

/**
 * Beam of a beacon at x/y/z. `blockAt` returns the block id at a position and
 * whether it is a full opaque block, or null for an empty cell. The beam is
 * traced up to `top` (exclusive); above that the sky is free.
 */
export function traceBeam(x: number, y: number, z: number, top: number,
  blockAt: (x: number, y: number, z: number) => { readonly id: string; readonly opaque: boolean } | null): Beam {
  let level = 0;
  for (let k = 1; k <= 4; k++) {
    let full = true;
    for (let dx = -k; dx <= k && full; dx++) for (let dz = -k; dz <= k; dz++) {
      const b = blockAt(x + dx, y - k, z + dz);
      if (!b || !BASE.test(b.id)) { full = false; break; }
    }
    if (!full) break;
    level = k;
  }
  const segments: BeamSegment[] = [];
  let colour: readonly [number, number, number] = WHITE, tinted = false, from = y + 1;
  for (let wy = y + 1; wy < top; wy++) {
    const b = blockAt(x, wy, z);
    if (!b) continue;
    const c = beamColour(b.id);
    if (c) {
      const next: readonly [number, number, number] = tinted ? [(colour[0] + c[0]) / 2, (colour[1] + c[1]) / 2, (colour[2] + c[2]) / 2] : c;
      if (wy > from) segments.push({ from, to: wy, rgb: colour });
      colour = next; tinted = true; from = wy;
      continue;
    }
    if (b.opaque && !/(^|:)bedrock$/.test(b.id)) return { level, active: false, blockedAt: wy, segments: [] };
  }
  if (!level) return { level, active: false, blockedAt: null, segments: [] };
  segments.push({ from, to: Math.max(top, from + 1), rgb: colour });
  return { level, active: true, blockedAt: null, segments };
}
