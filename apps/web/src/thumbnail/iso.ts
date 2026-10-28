import type { VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { mix, stateColor } from '../colors';

/**
 * Isometric 2D preview of a voxel payload for catalogue cards. Plain canvas,
 * no WebGL: dozens of cards must not each hold a 3D context. Colours are the
 * approximate preview colours of the viewer (no Minecraft textures).
 *
 * True isometric projection, viewed from +x/+y/+z: a cube shows its top, its
 * +x face (right) and its +z face (left). Painter's order by x+y+z is exact for
 * unit cubes in this projection; faces hidden by a neighbouring block are skipped.
 */
const COS30 = Math.cos(Math.PI / 6);
export interface IsoFace { readonly points: readonly number[]; readonly color: string }

/** Screen position of a lattice point (unit scale, y grows downwards). */
const project = (x: number, y: number, z: number): [number, number] => [(x - z) * COS30, (x + z) * 0.5 - y];

/** Visible faces in drawing order plus the projected extent, at unit scale. */
export function isoFaces(payload: Pick<VoxelPayload, 'cells' | 'palette'>): { faces: IsoFace[]; minX: number; minY: number; maxX: number; maxY: number } {
  const solid = new Set<string>();
  const blocks: { x: number; y: number; z: number; color: string }[] = [];
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const id = payload.palette[c.paletteIndex]?.id ?? '';
    if (id === 'minecraft:air' || id.endsWith(':cave_air') || id.endsWith(':void_air')) continue;
    const [x, y, z] = c.position;
    solid.add(`${x},${y},${z}`);
    blocks.push({ x, y, z, color: stateColor(id) });
  }
  blocks.sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z) || a.y - b.y);
  const faces: IsoFace[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const quad = (color: string, ...pts: [number, number, number][]) => {
    const points: number[] = [];
    for (const [x, y, z] of pts) {
      const [sx, sy] = project(x, y, z);
      points.push(sx, sy);
      if (sx < minX) minX = sx; if (sx > maxX) maxX = sx; if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;
    }
    faces.push({ points, color });
  };
  for (const { x, y, z, color } of blocks) {
    if (!solid.has(`${x},${y + 1},${z}`)) quad(color, [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]);
    if (!solid.has(`${x + 1},${y},${z}`)) quad(mix(color, '#000000', 0.22), [x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]);
    if (!solid.has(`${x},${y},${z + 1}`)) quad(mix(color, '#000000', 0.38), [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]);
  }
  return { faces, minX, minY, maxX, maxY };
}

/** Renders the preview into a PNG data URL of the given CSS size (device pixel ratio applied). */
export function renderThumbnail(payload: Pick<VoxelPayload, 'cells' | 'palette'>, width: number, height: number, padding = 0.08): string {
  const { faces, minX, minY, maxX, maxY } = isoFaces(payload);
  const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx || faces.length === 0) return '';
  const w = maxX - minX, h = maxY - minY;
  const scale = Math.min(canvas.width * (1 - 2 * padding) / w, canvas.height * (1 - 2 * padding) / h);
  const ox = (canvas.width - w * scale) / 2 - minX * scale, oy = (canvas.height - h * scale) / 2 - minY * scale;
  // Small scales: strokes in the face colour close hairline seams; large scales: a faint edge reads as blocks.
  const edges = scale > 9;
  ctx.lineJoin = 'round';
  for (const f of faces) {
    const p = f.points;
    ctx.beginPath();
    ctx.moveTo(ox + p[0]! * scale, oy + p[1]! * scale);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(ox + p[i]! * scale, oy + p[i + 1]! * scale);
    ctx.closePath();
    ctx.fillStyle = f.color; ctx.fill();
    ctx.lineWidth = edges ? Math.max(1, scale / 22) : 0.6;
    ctx.strokeStyle = edges ? 'rgba(10,20,28,.28)' : f.color;
    ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}
