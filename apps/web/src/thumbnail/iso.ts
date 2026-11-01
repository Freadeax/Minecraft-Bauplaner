import type { Cell, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import type { Mark } from '../blockmodels/mesh';
import { faceColors, mix } from '../colors';
import { shotGeometry } from './views';
import type { ShotBlock, ShotView } from './views';

/**
 * Still images of a voxel payload as plain unit cubes in average colours –
 * the fallback where WebGL is missing (the normal path is glShot.ts with real
 * block shapes). Projection and face order live in views.ts.
 */
export interface ShotOptions {
  /** Default "so" (isometric from the south-east), as the catalogue cards. */
  readonly view?: ShotView;
  /** Only blocks at or below this layer (cutaway). */
  readonly cutY?: number;
  /** Highlight per cell (e.g. diff marks); false hides the cell. */
  readonly markOf?: (cell: Cell, index: number) => Mark | null | false;
  readonly padding?: number;
}

const EMPTY = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
export function shotBlocks(payload: Pick<VoxelPayload, 'cells' | 'palette'>, markOf?: ShotOptions['markOf']): ShotBlock[] {
  const out: ShotBlock[] = [];
  payload.cells.forEach((c, i) => {
    if (c.kind !== 'block') return;
    const id = payload.palette[c.paletteIndex]?.id ?? '';
    if (EMPTY.has(id)) return;
    const mark = markOf ? markOf(c, i) : null;
    if (mark === false) return;
    const { top, side } = faceColors(id), paint = (hex: string) => mark ? mix(hex, mark.color, mark.amount) : hex;
    out.push({ x: c.position[0], y: c.position[1], z: c.position[2], color: paint(side), top: paint(top) });
  });
  return out;
}

/** Renders a view into a PNG data URL of the given CSS size (device pixel ratio applied); '' when nothing is visible. */
export function renderShot(payload: Pick<VoxelPayload, 'cells' | 'palette'>, width: number, height: number, options: ShotOptions = {}): string {
  const { faces, minX, minY, maxX, maxY } = shotGeometry(shotBlocks(payload, options.markOf), options.view ?? 'so', options.cutY);
  const padding = options.padding ?? 0.08;
  const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx || faces.length === 0) return '';
  const w = Math.max(1e-6, maxX - minX), h = Math.max(1e-6, maxY - minY);
  const scale = Math.min(canvas.width * (1 - 2 * padding) / w, canvas.height * (1 - 2 * padding) / h);
  const ox = (canvas.width - w * scale) / 2 - minX * scale, oy = (canvas.height - h * scale) / 2 - minY * scale;
  // Small scales: strokes in the face colour close hairline seams; large scales: a faint edge reads as blocks.
  const edges = scale > 9;
  ctx.lineJoin = 'round';
  for (const f of faces) {
    const p = f.points, color = f.shade > 0 ? mix(f.color, '#000000', f.shade) : f.color;
    ctx.beginPath();
    ctx.moveTo(ox + p[0]! * scale, oy + p[1]! * scale);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(ox + p[i]! * scale, oy + p[i + 1]! * scale);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = edges ? Math.max(1, scale / 22) : 0.6;
    ctx.strokeStyle = edges ? 'rgba(10,20,28,.28)' : color;
    ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}

/** Catalogue card preview (isometric from the south-east). */
export function renderThumbnail(payload: Pick<VoxelPayload, 'cells' | 'palette'>, width: number, height: number, padding = 0.08): string {
  return renderShot(payload, width, height, { padding });
}
