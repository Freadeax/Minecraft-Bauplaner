import type { VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { Thumb } from './Thumb';
import { interiorCutY, STANDARD_VIEWS } from './views';
import type { ShotView, StandardView } from './views';

const EMPTY = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const cuts = new WeakMap<object, number | null>();

/** Schnitthöhe der Innenansicht einer (unveränderlichen) Payload, je Payload einmal berechnet. */
export function interiorCutOf(payload: Pick<VoxelPayload, 'cells' | 'palette'>): number | undefined {
  const hit = cuts.get(payload);
  if (hit !== undefined) return hit ?? undefined;
  const blocks: { x: number; y: number; z: number }[] = [];
  for (const c of payload.cells) {
    if (c.kind !== 'block' || EMPTY.has(payload.palette[c.paletteIndex]?.id ?? '')) continue;
    blocks.push({ x: c.position[0], y: c.position[1], z: c.position[2] });
  }
  const cut = interiorCutY(blocks);
  cuts.set(payload, cut ?? null);
  return cut;
}

/** Kamera und Schnitt einer Standardansicht. */
export function standardShot(id: StandardView, payload: Pick<VoxelPayload, 'cells' | 'palette'>): { view: ShotView; cutY: number | undefined } {
  const def = STANDARD_VIEWS.find(v => v.id === id)!;
  return { view: def.view, cutY: id === 'innen' ? interiorCutOf(payload) : undefined };
}

/**
 * Die drei einheitlichen Ansichten außen, innen, oben (LIB-07) nebeneinander. Gleiche Kamera
 * für jedes Bauwerk, damit Karten, Detailseite und Vergleich dieselben Bilder zeigen.
 */
export function StandardViews({ cacheKey, payload, name, width = 200, height = 140 }: {
  cacheKey: string;
  payload: () => Pick<VoxelPayload, 'cells' | 'palette' | 'entities'>;
  name: string;
  width?: number;
  height?: number;
}) {
  return <div className="std-views" role="group" aria-label={`Ansichten ${name}`}>{STANDARD_VIEWS.map(v => {
    const p = payload();
    const { view, cutY } = standardShot(v.id, p);
    const noCut = v.id === 'innen' && cutY === undefined;
    return <figure key={v.id} title={noCut ? 'Kein durchgehender Boden: die Innenansicht zeigt den ganzen Bau' : v.title}>
      <Thumb cacheKey={cacheKey} payload={payload} view={view} cutY={cutY} alt={`${name}: ${v.title}`} width={width} height={height} />
      <figcaption>{v.label}{noCut ? ' (ohne Schnitt)' : ''}</figcaption></figure>;
  })}</div>;
}

/** Thumb-Optionen für eine Kartenblickrichtung: "innen" wird zum einheitlichen Schnitt, alles andere bleibt eine Kamera. */
export function standardOrShot(view: ShotView | 'innen', payload: Pick<VoxelPayload, 'cells' | 'palette'>): { view: ShotView; cutY?: number } {
  if (view !== 'innen') return { view };
  const cutY = interiorCutOf(payload);
  return cutY === undefined ? { view: 'so' } : { view: 'so', cutY };
}
