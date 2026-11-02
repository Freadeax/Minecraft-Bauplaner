import { SURVEY_UNKNOWN } from '../../../../../packages/domain/src/index.js';
import type { TerrainSurvey } from '../../../../../packages/domain/src/index.js';
import { faceColors } from '../../colors';

/**
 * Draufsicht einer Geländeaufnahme (TERRAIN-01): one pixel per column, top
 * block colour, shaded by height and by the slope towards the north-west
 * light so hills read without contour lines. Unknown columns stay transparent.
 */
export function surveyImage(s: TerrainSurvey): HTMLCanvasElement {
  const img = document.createElement('canvas'); img.width = s.width; img.height = s.length;
  const ctx = img.getContext('2d'); if (!ctx) return img;
  const data = ctx.createImageData(s.width, s.length);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < s.surface.length; i++) if (s.surface[i] !== SURVEY_UNKNOWN && s.surfaceBlock[i]) { lo = Math.min(lo, s.surface[i]!); hi = Math.max(hi, s.surface[i]!); }
  const colors = s.ids.map(id => { const v = Number.parseInt(faceColors(id).top.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const; });
  const h = (x: number, z: number, fallback: number) => {
    if (x < 0 || z < 0 || x >= s.width || z >= s.length) return fallback;
    const v = s.surface[x + z * s.width]!;
    return v === SURVEY_UNKNOWN ? fallback : v;
  };
  for (let z = 0; z < s.length; z++) for (let x = 0; x < s.width; x++) {
    const i = x + z * s.width, y = s.surface[i]!;
    if (y === SURVEY_UNKNOWN || !s.surfaceBlock[i]) continue;
    const slope = (h(x - 1, z, y) - h(x + 1, z, y)) + (h(x, z - 1, y) - h(x, z + 1, y));
    const shade = Math.max(0.45, Math.min(1.25, 0.8 + (hi > lo ? 0.2 * (y - lo) / (hi - lo) : 0.1) + 0.07 * slope));
    const [r, g, b] = colors[s.surfaceBlock[i]!]!;
    data.data.set([Math.min(255, r * shade), Math.min(255, g * shade), Math.min(255, b * shade), 255], i * 4);
  }
  ctx.putImageData(data, 0, 0);
  return img;
}
