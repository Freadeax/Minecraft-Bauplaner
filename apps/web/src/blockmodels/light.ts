/**
 * Minecraft light for the block view (GFX-01): light emission and light
 * dampening of block states, sky light and block light propagated over the
 * voxel grid exactly like the game does it (level 15 at the source, minus one
 * per step plus the dampening of the cell entered; opaque full blocks stop
 * light), and the floor cells where hostile mobs may spawn (block light 0 on
 * a solid top with two free cells above). Pure and DOM-free; the mesh builder
 * and tests share it. Values follow Minecraft Java 26.x; mod blocks emit
 * nothing unless their id names an obvious light source.
 */
type Props = Readonly<Record<string, string>>;

const FIXED: Readonly<Record<string, number>> = {
  glowstone: 15, sea_lantern: 15, jack_o_lantern: 15, lantern: 15, shroomlight: 15, beacon: 15, conduit: 15,
  end_gateway: 15, end_portal: 15, fire: 15, lava: 15, ochre_froglight: 15, verdant_froglight: 15, pearlescent_froglight: 15,
  torch: 14, wall_torch: 14, end_rod: 14, copper_torch: 14, copper_wall_torch: 14,
  nether_portal: 11,
  soul_torch: 10, soul_wall_torch: 10, soul_lantern: 10, soul_fire: 10, crying_obsidian: 10,
  enchanting_table: 7, ender_chest: 7, glow_lichen: 7,
  sculk_catalyst: 6, amethyst_cluster: 5, large_amethyst_bud: 4, magma_block: 3, medium_amethyst_bud: 2, firefly_bush: 2,
  small_amethyst_bud: 1, brewing_stand: 1, brown_mushroom: 1, dragon_egg: 1, end_portal_frame: 1, sculk_sensor: 1, calibrated_sculk_sensor: 1,
  light: 15,
};
/** Blocks that only shine with lit=true, and their default when the state does not say. */
const LIT: Readonly<Record<string, readonly [level: number, litByDefault: boolean]>> = {
  furnace: [13, false], blast_furnace: [13, false], smoker: [13, false], redstone_lamp: [15, false],
  redstone_ore: [9, false], deepslate_redstone_ore: [9, false], redstone_torch: [7, true], redstone_wall_torch: [7, true],
  campfire: [15, true], soul_campfire: [10, true],
};
const COPPER_BULB: Readonly<Record<string, number>> = { copper_bulb: 15, exposed_copper_bulb: 12, weathered_copper_bulb: 8, oxidized_copper_bulb: 4 };

const shortId = (id: string) => id.startsWith('minecraft:') ? id.slice(10) : id;
const isOn = (props: Props, key: string, fallback: boolean) => props[key] === undefined ? fallback : props[key] === 'true';

/** Light level (0..15) a block state emits. */
export function emission(id: string, props: Props = {}): number {
  const name = shortId(id);
  if (id.includes(':') && !id.startsWith('minecraft:')) return /lantern|torch|glowstone|lamp/.test(name) ? 14 : 0;
  if (name === 'light') return Math.max(0, Math.min(15, Number(props.level ?? 15) || 0));
  const fixed = FIXED[name]; if (fixed !== undefined) return fixed;
  const lit = LIT[name]; if (lit) return isOn(props, 'lit', lit[1]) ? lit[0] : 0;
  const bulb = COPPER_BULB[name.replace(/^waxed_/, '')]; if (bulb !== undefined) return isOn(props, 'lit', false) ? bulb : 0;
  if (name.endsWith('candle_cake')) return isOn(props, 'lit', false) ? 3 : 0;
  if (name === 'candle' || name.endsWith('_candle')) return isOn(props, 'lit', false) ? 3 * Math.max(1, Math.min(4, Number(props.candles ?? 1) || 1)) : 0;
  if (name === 'sea_pickle') return isOn(props, 'waterlogged', true) ? 3 + 3 * Math.max(1, Math.min(4, Number(props.pickles ?? 1) || 1)) : 0;
  if (name === 'cave_vines' || name === 'cave_vines_plant') return isOn(props, 'berries', false) ? 14 : 0;
  if (name === 'respawn_anchor') return [0, 3, 7, 11, 15][Math.max(0, Math.min(4, Number(props.charges ?? 0) || 0))]!;
  if (name === 'trial_spawner' || name === 'vault') return 4;
  return 0;
}

/** Extra levels a non-opaque block takes from light passing through (water, leaves, ice …). */
export function dampening(id: string): number {
  return /(^|:)(water|bubble_column|ice|frosted_ice|cobweb|slime_block|honey_block)$|_leaves$/.test(id) ? 1 : 0;
}

/** Light spreading in buckets by level, so every cell is settled from its brightest source first. */
class Buckets {
  readonly lists: Int32Array[] = []; readonly sizes = new Int32Array(16);
  constructor() { for (let i = 0; i < 16; i++) this.lists.push(new Int32Array(64)); }
  push(level: number, index: number): void {
    let list = this.lists[level]!; const n = this.sizes[level]!;
    if (n === list.length) { const more = new Int32Array(n * 2); more.set(list); this.lists[level] = list = more; }
    list[n] = index; this.sizes[level] = n + 1;
  }
}

export interface LightGrid {
  /** Sky light 0..15 per grid cell; null when the grid was too large (then everything counts as 15). */
  readonly sky: Uint8Array | null;
  /** Block light 0..15 per grid cell; null as above (then 0). */
  readonly block: Uint8Array | null;
}

/** Grids above this many cells keep full daylight and no block light (memory and time). */
export const LIGHT_LIMIT = 24_000_000;

/**
 * Propagates sky and block light over a grid of palette indices + 1 (0 = empty)
 * laid out as ((x * sy) + y) * sz + z. `opaque`, `damp` and `emit` are per
 * grid value (index 0 = empty). Everything outside the grid is open sky.
 */
export function propagateLight(grid: Int32Array, sx: number, sy: number, sz: number, opaque: Uint8Array, damp: Uint8Array, emit: Uint8Array): LightGrid {
  const volume = sx * sy * sz;
  if (!volume || volume > LIGHT_LIMIT) return { sky: null, block: null };
  const sky = new Uint8Array(volume), block = new Uint8Array(volume);
  const ys = sz, xs = sy * sz;
  // Sky light falls straight down without loss until something dampens or stops it.
  for (let x = 0; x < sx; x++) for (let z = 0; z < sz; z++) {
    let level = 15;
    for (let y = sy - 1; y >= 0 && level > 0; y--) {
      const i = x * xs + y * ys + z, v = grid[i]!;
      if (opaque[v]) break;
      level = Math.max(0, level - damp[v]!);
      sky[i] = level;
    }
  }
  const spread = (light: Uint8Array, buckets: Buckets) => {
    for (let level = 15; level > 1; level--) {
      // Pushes during this level only go to lower levels, so the list does not change while iterating.
      const list = buckets.lists[level]!, size = buckets.sizes[level]!;
      for (let k = 0; k < size; k++) {
        const i = list[k]!;
        if (light[i] !== level) continue;
        const x = (i / xs) | 0, rest = i - x * xs, y = (rest / ys) | 0, z = rest - y * ys;
        for (let d = 0; d < 6; d++) {
          let j: number;
          switch (d) {
            case 0: if (x === 0) continue; j = i - xs; break;
            case 1: if (x === sx - 1) continue; j = i + xs; break;
            case 2: if (y === 0) continue; j = i - ys; break;
            case 3: if (y === sy - 1) continue; j = i + ys; break;
            case 4: if (z === 0) continue; j = i - 1; break;
            default: if (z === sz - 1) continue; j = i + 1;
          }
          const v = grid[j]!;
          if (opaque[v]) continue;
          const next = level - 1 - damp[v]!;
          if (next > light[j]!) { light[j] = next; if (next > 1) buckets.push(next, j); }
        }
      }
    }
  };
  const skyBuckets = new Buckets();
  for (let i = 0; i < volume; i++) {
    const l = sky[i]!;
    if (l < 2) continue;
    // Only cells next to a darker free neighbour can spread anything.
    const x = (i / xs) | 0, rest = i - x * xs, y = (rest / ys) | 0, z = rest - y * ys;
    const darker = (j: number) => !opaque[grid[j]!] && sky[j]! < l - 1;
    if ((x > 0 && darker(i - xs)) || (x < sx - 1 && darker(i + xs)) || (y > 0 && darker(i - ys)) || (y < sy - 1 && darker(i + ys)) || (z > 0 && darker(i - 1)) || (z < sz - 1 && darker(i + 1))) skyBuckets.push(l, i);
  }
  spread(sky, skyBuckets);
  const blockBuckets = new Buckets();
  let any = false;
  for (let i = 0; i < volume; i++) {
    const e = emit[grid[i]!]!;
    if (e) { block[i] = e; any = true; if (e > 1) blockBuckets.push(e, i); }
  }
  if (any) spread(block, blockBuckets);
  return { sky, block };
}

/** Floor blocks mobs never spawn on even with a full top (glass, leaves, barriers …). */
export function spawnFloorExcluded(id: string): boolean {
  return /glass|_leaves$|(^|:)(barrier|light|scaffolding|mangrove_roots|magma_block|honey_block|slime_block|spawner|trial_spawner|vault)$/.test(id);
}
/** Blocks a mob can stand inside (no collision, no spawn blocker): plants, wires, buttons … */
export function spawnPassable(id: string, props: Props = {}): boolean {
  const name = shortId(id);
  if (name === 'snow') return (Number(props.layers ?? 1) || 1) <= 1;
  if (/rail$/.test(name)) return false;
  return /^(short_grass|grass|tall_grass|fern|large_fern|dead_bush|bush|.*_sapling|dandelion|poppy|blue_orchid|allium|azure_bluet|.*_tulip|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|torchflower|sunflower|lilac|rose_bush|peony|pink_petals|wildflowers|leaf_litter|redstone_wire|vine|tripwire|.*_button|lever|.*_pressure_plate|sugar_cane|.*_wall_sign|.*_sign|.*_banner|.*_wall_banner|structure_void|cave_air|void_air)$/.test(name);
}
