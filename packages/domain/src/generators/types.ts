import type { VoxelPayload } from '../../../voxel/src/types.js';
import { axis, Plot } from '../build/plot.js';
import type { Props } from '../build/plot.js';
import type { BuildingFacets } from '../catalog.js';
import type { Connector } from '../types.js';
import { Args } from './params.js';
import type { ParamDef, ParamValues } from './params.js';
import { aged, isAxial, STYLE_OPTIONS, styleOf } from './styles.js';
import type { Style } from './styles.js';

/** What a generator produces from normalised parameters. */
export interface GeneratedBuilding {
  readonly payload: VoxelPayload;
  readonly connectors: readonly Connector[];
  /** Suggested asset name, e.g. "Rundturm 14 m (Mittelalter)". */
  readonly name: string;
  readonly description: string;
  readonly facets: BuildingFacets;
  /** Hints shown next to the preview (connector profiles, limits, assumptions). */
  readonly notes: readonly string[];
}

export interface Preset { readonly id: string; readonly label: string; readonly values: ParamValues }

export interface Generator {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /**
   * Algorithm version. Raise it whenever the same parameters would produce
   * other geometry, so stored versions are reported as "ältere Generatorversion"
   * instead of "abweichend". Pinned by the tests.
   */
  readonly version: number;
  readonly params: readonly ParamDef[];
  readonly presets: readonly Preset[];
  build(args: Args, values: ParamValues): GeneratedBuilding;
}

// ------------------------------------------------------------ shared parameters
export const styleParam = (def = 'mittelalter'): ParamDef => ({ key: 'stil', label: 'Stil', group: 'Stil & Material', type: 'choice', options: STYLE_OPTIONS, default: def });
export const WEATHER_PARAMS: readonly ParamDef[] = [
  { key: 'verwitterung', label: 'Verwitterung', group: 'Stil & Material', type: 'int', min: 0, max: 50, step: 5, default: 0, unit: '%',
    hint: 'Anteil bemooster oder rissiger Steine; nur Stile mit gealterten Varianten.' },
  { key: 'variante', label: 'Variante', group: 'Stil & Material', type: 'int', min: 1, max: 99, default: 1,
    hint: 'Startwert für Verwitterung und Details: gleiche Zahl ⇒ gleiches Bauwerk.' },
];

/**
 * Plot plus style: generators place roles (wall, corner, beam) instead of block
 * ids, and weathering is applied in one place.
 */
export class Mason {
  readonly style: Style;
  private readonly weather: number;
  private readonly seed: number;
  constructor(readonly p: Plot, args: Args) {
    this.style = styleOf(args.str('stil'));
    this.weather = args.int('verwitterung');
    this.seed = args.int('variante');
  }
  /** Block with weathering; upright axis for logs and pillars. */
  put(x: number, y: number, z: number, id: string, props: Props = {}): void {
    const block = aged(this.style, id, this.weather, this.seed, x, y, z);
    this.p.set(x, y, z, block, isAxial(block) && !props.axis ? axis('y') : props);
  }
  wall(x: number, y: number, z: number): void { this.put(x, y, z, this.style.wall); }
  corner(x: number, y: number, z: number): void { this.put(x, y, z, this.style.corner); }
  base(x: number, y: number, z: number): void { this.put(x, y, z, this.style.base.full); }
  /** Horizontal beam along an axis (logs lie, other blocks unchanged). */
  beam(x: number, y: number, z: number, along: 'x' | 'z'): void {
    const b = this.style.beam;
    this.p.set(x, y, z, b, isAxial(b) ? axis(along) : {});
  }
  fillWith(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, f: (x: number, y: number, z: number) => void): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) f(x, y, z);
  }
  /** Seeded deterministic chance for optional details. */
  chance(x: number, y: number, z: number, percent: number): boolean {
    const v = (((x + this.seed * 13) * 73856093) ^ ((y + this.seed) * 19349663) ^ ((z + this.seed * 3) * 83492791)) >>> 0;
    return v % 100 < percent;
  }
}

export const wallProfile = (thickness: number, height: number): string => `wall_${thickness}x${height}`;
export const pathProfile = (width: number): string => `weg_${width}`;
