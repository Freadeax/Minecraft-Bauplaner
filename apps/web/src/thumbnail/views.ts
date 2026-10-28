/**
 * Projection of a block set into flat 2D faces for still images (B12): four
 * isometric corners, a top-down plan and four façades. Pure maths, no DOM and
 * no runtime imports, so Node tests load it directly.
 *
 * Minecraft conventions as in the 3D viewer: north = −Z, east = +X, up = +Y.
 * An isometric view is named after the corner the camera stands at; "so"
 * (south-east) looks towards north-west and shows the east and south faces.
 * The top view has north up, a façade is seen straight on from its side.
 */
export type ShotView = 'so' | 'sw' | 'nw' | 'no' | 'oben' | 'sued' | 'ost' | 'nord' | 'west';
export interface ShotInfo { readonly id: ShotView; readonly label: string; readonly title: string }
export const SHOTS: readonly ShotInfo[] = [
  { id: 'so', label: 'SO', title: 'Isometrisch von Südosten' },
  { id: 'sw', label: 'SW', title: 'Isometrisch von Südwesten' },
  { id: 'nw', label: 'NW', title: 'Isometrisch von Nordwesten' },
  { id: 'no', label: 'NO', title: 'Isometrisch von Nordosten' },
  { id: 'oben', label: 'Oben', title: 'Draufsicht, Norden oben' },
  { id: 'sued', label: 'Süd', title: 'Südfassade' },
  { id: 'ost', label: 'Ost', title: 'Ostfassade' },
  { id: 'nord', label: 'Nord', title: 'Nordfassade' },
  { id: 'west', label: 'West', title: 'Westfassade' },
];
export const ISO_SHOTS: readonly ShotView[] = ['so', 'sw', 'nw', 'no'];

export interface ShotBlock { readonly x: number; readonly y: number; readonly z: number; readonly color: string }
/** A face polygon at unit scale; `shade` 0 = full colour … 1 = black. */
export interface ShotFace { readonly points: readonly number[]; readonly color: string; readonly shade: number }
export interface ShotGeometry { readonly faces: ShotFace[]; readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number }

const COS30 = Math.cos(Math.PI / 6);
/** (x, z) → rotated (x, z) such that the camera corner becomes south-east. Determinant +1: never mirrored. */
const ROTATE: Readonly<Record<'so' | 'sw' | 'nw' | 'no', (x: number, z: number) => [number, number]>> = {
  so: (x, z) => [x, z],
  sw: (x, z) => [z, -x],
  nw: (x, z) => [-x, -z],
  no: (x, z) => [-z, x],
};

function collector() {
  const faces: ShotFace[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (color: string, shade: number, pts: readonly (readonly [number, number])[]) => {
    const points: number[] = [];
    for (const [sx, sy] of pts) {
      points.push(sx, sy);
      if (sx < minX) minX = sx; if (sx > maxX) maxX = sx; if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;
    }
    faces.push({ points, color, shade });
  };
  return { add, done: (): ShotGeometry => ({ faces, minX, minY, maxX, maxY }) };
}

function isoShot(blocks: readonly ShotBlock[], view: 'so' | 'sw' | 'nw' | 'no'): ShotGeometry {
  const rot = ROTATE[view];
  const solid = new Set<string>();
  const list = blocks.map(b => { const [x, z] = rot(b.x, b.z); solid.add(`${x},${b.y},${z}`); return { x, y: b.y, z, color: b.color }; });
  // Painter's order by x+y+z is exact for unit cubes in this projection.
  list.sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z) || a.y - b.y);
  const project = (x: number, y: number, z: number): [number, number] => [(x - z) * COS30, (x + z) * 0.5 - y];
  const c = collector();
  for (const { x, y, z, color } of list) {
    if (!solid.has(`${x},${y + 1},${z}`)) c.add(color, 0, [project(x, y + 1, z), project(x + 1, y + 1, z), project(x + 1, y + 1, z + 1), project(x, y + 1, z + 1)]);
    if (!solid.has(`${x + 1},${y},${z}`)) c.add(color, 0.22, [project(x + 1, y, z), project(x + 1, y + 1, z), project(x + 1, y + 1, z + 1), project(x + 1, y, z + 1)]);
    if (!solid.has(`${x},${y},${z + 1}`)) c.add(color, 0.38, [project(x, y, z + 1), project(x + 1, y, z + 1), project(x + 1, y + 1, z + 1), project(x, y + 1, z + 1)]);
  }
  return c.done();
}

/**
 * Orthographic plan or façade: per screen cell the nearest block wins; deeper
 * blocks are darkened up to 45 % so steps and recesses stay readable.
 */
function flatShot(blocks: readonly ShotBlock[], view: 'oben' | 'sued' | 'ost' | 'nord' | 'west'): ShotGeometry {
  // [screen u, screen v, nearness] per block; larger nearness = closer to the camera.
  const map: (b: ShotBlock) => [number, number, number] = {
    oben: (b: ShotBlock) => [b.x, b.z, b.y] as [number, number, number],
    sued: (b: ShotBlock) => [b.x, -b.y, b.z] as [number, number, number],
    nord: (b: ShotBlock) => [-b.x, -b.y, -b.z] as [number, number, number],
    ost: (b: ShotBlock) => [-b.z, -b.y, b.x] as [number, number, number],
    west: (b: ShotBlock) => [b.z, -b.y, -b.x] as [number, number, number],
  }[view];
  const best = new Map<string, { u: number; v: number; near: number; color: string }>();
  let nearMax = -Infinity, nearMin = Infinity;
  for (const b of blocks) {
    const [u, v, near] = map(b), key = `${u},${v}`, prev = best.get(key);
    if (!prev || near > prev.near) best.set(key, { u, v, near, color: b.color });
  }
  for (const b of best.values()) { nearMax = Math.max(nearMax, b.near); nearMin = Math.min(nearMin, b.near); }
  const span = Math.max(1, nearMax - nearMin);
  const c = collector();
  const sorted = [...best.values()].sort((a, b) => a.v - b.v || a.u - b.u);
  for (const b of sorted) c.add(b.color, Math.min(0.45, ((nearMax - b.near) / span) * 0.45), [[b.u, b.v], [b.u + 1, b.v], [b.u + 1, b.v + 1], [b.u, b.v + 1]]);
  return c.done();
}

/** Faces of a block set for one view; `cutY` keeps only blocks at or below that layer (Schnitt). */
export function shotGeometry(blocks: readonly ShotBlock[], view: ShotView, cutY?: number): ShotGeometry {
  const shown = cutY === undefined ? blocks : blocks.filter(b => b.y <= cutY);
  return view === 'so' || view === 'sw' || view === 'nw' || view === 'no' ? isoShot(shown, view) : flatShot(shown, view);
}

/** File name for a downloaded image, ASCII only. */
export function shotFileName(name: string, view: ShotView, cutY?: number): string {
  const base = name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bauwerk';
  return `${base}-${view}${cutY === undefined ? '' : `-schnitt-y${cutY}`}.png`;
}
