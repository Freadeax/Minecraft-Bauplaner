import { useSyncExternalStore } from 'react';
import { BIOMES, DEFAULT_BIOME } from './biomes.ts';

/**
 * Graphics settings of the block view (GFX-01), one set for the whole app and
 * remembered in this browser: light mode, ambient occlusion, sun time with
 * shadows, the monster spawn check, render quality and (GFX-02) the biome
 * that colours grass, leaves and water. All 3D views follow
 * changes immediately; still images use the fixed look `STILL_LOOK` so
 * catalogue pictures stay comparable.
 */
export type LightMode = 'flat' | 'day' | 'sun' | 'night';
export type Quality = 'auto' | 'high' | 'low';

export interface GraphicsSettings {
  readonly mode: LightMode;
  /** Ambient occlusion in corners and edges (Minecraft "smooth lighting"). */
  readonly ao: boolean;
  /** Shadows in the sun mode. */
  readonly shadows: boolean;
  /** Time of day for the sun mode, 6 (sunrise, east) … 18 (sunset, west). */
  readonly hour: number;
  /** Mark floor cells where hostile mobs can spawn. */
  readonly spawn: boolean;
  /** 'low' renders at device pixel ratio 1 without antialias-heavy shadow maps. */
  readonly quality: Quality;
  /** Biome id (biomes.ts) for grass, foliage and water colours; still images always use plains. */
  readonly biome: string;
}

export const LIGHT_MODES: readonly { readonly id: LightMode; readonly label: string; readonly title: string }[] = [
  { id: 'day', label: 'Tag', title: 'Minecraft-Tageslicht: Himmels- und Blocklicht wie im Spiel, Innenräume ohne Licht werden dunkler' },
  { id: 'sun', label: 'Sonne', title: 'Sonnenlicht mit Schatten nach Uhrzeit, Himmelslicht und Fackeln' },
  { id: 'night', label: 'Nacht', title: 'Nacht: nur Mondlicht und Blocklicht (Fackeln, Laternen, Glowstone …) – zeigt dunkle Ecken' },
  { id: 'flat', label: 'Flach', title: 'Gleichmäßig hell: nur feste Flächenhelligkeit und Eckschatten, gut zum Bauen' },
];

export const DEFAULT_GRAPHICS: GraphicsSettings = { mode: 'day', ao: true, shadows: true, hour: 10, spawn: false, quality: 'auto', biome: DEFAULT_BIOME };
/** Look of catalogue images, galleries and layer plans. */
export const STILL_LOOK = 'gfx1-day-ao';

const KEY = 'bauplaner.grafik.v1';
const MODES = new Set<LightMode>(['flat', 'day', 'sun', 'night']);

/** Reads stored settings; anything missing or invalid falls back to the defaults. */
export function parseGraphics(raw: unknown): GraphicsSettings {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const hour = typeof o.hour === 'number' && Number.isFinite(o.hour) ? Math.min(18, Math.max(6, o.hour)) : DEFAULT_GRAPHICS.hour;
  return {
    mode: MODES.has(o.mode as LightMode) ? o.mode as LightMode : DEFAULT_GRAPHICS.mode,
    ao: typeof o.ao === 'boolean' ? o.ao : DEFAULT_GRAPHICS.ao,
    shadows: typeof o.shadows === 'boolean' ? o.shadows : DEFAULT_GRAPHICS.shadows,
    hour,
    spawn: typeof o.spawn === 'boolean' ? o.spawn : DEFAULT_GRAPHICS.spawn,
    quality: o.quality === 'high' || o.quality === 'low' || o.quality === 'auto' ? o.quality : DEFAULT_GRAPHICS.quality,
    biome: typeof o.biome === 'string' && BIOMES.some(b => b.id === o.biome) ? o.biome : DEFAULT_GRAPHICS.biome,
  };
}

/**
 * Direction towards the sun (x east, y up, z south) for an hour between 6 and
 * 18: rises in the east, highest at noon slightly south (as seen in Minecraft,
 * where the sun path is tilted only by the shader packs – we tilt it a bit so
 * north/south walls are not always unlit), sets in the west.
 */
export function sunDirection(hour: number): [number, number, number] {
  const t = (Math.min(18, Math.max(6, hour)) - 6) / 12; // 0 sunrise … 1 sunset
  const a = t * Math.PI;
  const elevation = Math.max(0.08, Math.sin(a));
  const x = Math.cos(a), y = elevation, z = 0.35;
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len];
}

let settings: GraphicsSettings = DEFAULT_GRAPHICS;
let loaded = false;
const listeners = new Set<() => void>();

function load(): GraphicsSettings {
  if (!loaded) {
    loaded = true;
    try { const raw = globalThis.localStorage?.getItem(KEY); if (raw) settings = parseGraphics(JSON.parse(raw)); } catch { /* private mode etc.: defaults */ }
  }
  return settings;
}

export function graphics(): GraphicsSettings { return load(); }
export function setGraphics(patch: Partial<GraphicsSettings>): void {
  settings = parseGraphics({ ...load(), ...patch });
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(settings)); } catch { /* not persisted */ }
  for (const l of listeners) l();
}
export function subscribeGraphics(l: () => void): () => void { listeners.add(l); return () => { listeners.delete(l); }; }
export function useGraphics(): GraphicsSettings { return useSyncExternalStore(subscribeGraphics, graphics, () => DEFAULT_GRAPHICS); }
