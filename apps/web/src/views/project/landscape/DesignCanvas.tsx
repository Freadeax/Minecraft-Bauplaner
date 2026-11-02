import { useEffect, useMemo, useRef } from 'react';
import { NO_WATER, SURVEY_UNKNOWN } from '../../../../../../packages/domain/src/index.js';
import type { TerrainDesign, TerrainSurvey } from '../../../../../../packages/domain/src/index.js';
import { faceColors } from '../../../colors';

export type CanvasMode = 'terrain' | 'heights' | 'changes';
export const CANVAS_MODE_LABEL: Readonly<Record<CanvasMode, string>> = { terrain: 'Gelände', heights: 'Höhenlinien', changes: 'Änderungen' };

const rgb = (hex: string): [number, number, number] => { const v = Number.parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const WATER: [number, number, number] = [52, 110, 210];
const STOPS: readonly [number, number, number][] = [[64, 140, 72], [196, 178, 96], [140, 98, 66], [238, 238, 238]];
const ramp = (t: number): [number, number, number] => {
  const f = Math.max(0, Math.min(1, t)) * (STOPS.length - 1), k = Math.min(STOPS.length - 2, Math.floor(f)), u = f - k, a = STOPS[k]!, b = STOPS[k + 1]!;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
};

/**
 * Pixel image of a design: one pixel per column. "Gelände" draws the top block
 * colour shaded by height and slope with water on top (like the world map),
 * "Höhenlinien" a height ramp with a contour every four blocks, "Änderungen"
 * cut (red), fill (green), repaint (yellow), water (blue) against the base.
 */
export function renderDesign(ctx: CanvasRenderingContext2D, d: TerrainDesign, base: TerrainSurvey, mode: CanvasMode): void {
  const img = ctx.createImageData(d.width, d.length), px = img.data;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < d.height.length; i++) { const v = d.height[i]!; if (v !== SURVEY_UNKNOWN) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  const colors = d.ids.map(id => id ? rgb(faceColors(id).top) : [0, 0, 0] as [number, number, number]);
  const H = (x: number, z: number, fallback: number) => {
    if (x < 0 || z < 0 || x >= d.width || z >= d.length) return fallback;
    const v = d.height[x + z * d.width]!; return v === SURVEY_UNKNOWN ? fallback : v;
  };
  for (let z = 0; z < d.length; z++) for (let x = 0; x < d.width; x++) {
    const i = x + z * d.width, y = d.height[i]!;
    if (y === SURVEY_UNKNOWN) { px.set([40, 40, 46, 120], i * 4); continue; }
    let c: [number, number, number];
    if (mode === 'changes') {
      const g = base.ground[i]!, known = base.surface[i] !== SURVEY_UNKNOWN && !!base.groundBlock[i];
      const baseWater = known && base.ids[base.surfaceBlock[i]!] === 'minecraft:water' && base.surface[i]! > g ? base.surface[i]! : NO_WATER;
      if (!known) c = [90, 90, 96];
      else if (y > g) { const t = Math.min(1, (y - g) / 6); c = [60, 150 + 80 * t, 70]; }
      else if (y < g) { const t = Math.min(1, (g - y) / 6); c = [170 + 80 * t, 70, 60]; }
      else if (d.water[i] !== baseWater) c = d.water[i] === NO_WATER ? [190, 160, 90] : WATER;
      else if (d.ids[d.top[i]!] !== base.ids[base.groundBlock[i]!]) c = [225, 200, 70];
      else { const t = hi > lo ? (y - lo) / (hi - lo) : 0.5; c = [110 + 50 * t, 112 + 50 * t, 118 + 50 * t]; }
      if (d.path[i]) c = [Math.min(255, c[0] + 30), Math.min(255, c[1] + 20), c[2]];
    } else if (mode === 'heights') {
      const t = hi > lo ? (y - lo) / (hi - lo) : 0.5;
      c = ramp(t);
      const band = Math.floor(y / 4);
      if (Math.floor(H(x + 1, z, y) / 4) !== band || Math.floor(H(x, z + 1, y) / 4) !== band) c = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55];
      if (d.water[i] !== NO_WATER) c = [c[0] * 0.4 + WATER[0] * 0.6, c[1] * 0.4 + WATER[1] * 0.6, c[2] * 0.4 + WATER[2] * 0.6];
    } else {
      const slope = (H(x - 1, z, y) - H(x + 1, z, y)) + (H(x, z - 1, y) - H(x, z + 1, y));
      const shade = Math.max(0.45, Math.min(1.25, 0.8 + (hi > lo ? 0.2 * (y - lo) / (hi - lo) : 0.1) + 0.07 * slope));
      const [r, g, b] = colors[d.top[i]!]!;
      c = [r * shade, g * shade, b * shade];
      if (d.water[i] !== NO_WATER) { const depth = Math.min(1, (d.water[i]! - y) / 6); const a = 0.55 + 0.35 * depth; c = [c[0] * (1 - a) + WATER[0] * a, c[1] * (1 - a) + WATER[1] * a, c[2] * (1 - a) + WATER[2] * a]; }
    }
    px.set([Math.min(255, c[0]), Math.min(255, c[1]), Math.min(255, c[2]), 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
}

export interface StrokeHandlers {
  start(x: number, z: number): void;
  move(x: number, z: number): void;
  end(): void;
  hover(x: number, z: number): void;
  leave(): void;
}

/**
 * Draufsicht of a design with pointer painting (mouse, pen, touch). The
 * overlay shows the brush, planned path points and the project's footprint.
 */
export function DesignCanvas({ design, base, version, mode, handlers, brushRadius, hover, pathPoints, footprint }: {
  design: TerrainDesign; base: TerrainSurvey; version: number; mode: CanvasMode; handlers: StrokeHandlers; brushRadius: number | null;
  hover: [number, number] | null; pathPoints: readonly (readonly [number, number])[]; footprint: string | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx) renderDesign(ctx, design, base, mode);
  }, [design, base, version, mode]);
  const toWorld = (e: React.PointerEvent): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * design.width), z = Math.floor((e.clientY - r.top) / r.height * design.length);
    return [design.minX + Math.max(0, Math.min(design.width - 1, x)), design.minZ + Math.max(0, Math.min(design.length - 1, z))];
  };
  const line = useMemo(() => pathPoints.map(([x, z]) => `${x - design.minX + 0.5},${z - design.minZ + 0.5}`).join(' '), [pathPoints, design.minX, design.minZ]);
  return <div className="landscape-canvas" style={{ aspectRatio: `${design.width} / ${design.length}` }}>
    <canvas ref={canvas} width={design.width} height={design.length} aria-label="Draufsicht der Geländegestaltung" data-testid="landscape-canvas"
      onPointerDown={e => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drawing.current = true; handlers.start(...toWorld(e)); }}
      onPointerMove={e => { const p = toWorld(e); handlers.hover(...p); if (drawing.current) handlers.move(...p); }}
      onPointerUp={() => { if (drawing.current) { drawing.current = false; handlers.end(); } }}
      onPointerCancel={() => { if (drawing.current) { drawing.current = false; handlers.end(); } }}
      onPointerLeave={() => handlers.leave()} />
    <svg viewBox={`0 0 ${design.width} ${design.length}`} preserveAspectRatio="none" aria-hidden="true">
      {footprint && <path d={footprint} className="landscape-footprint" />}
      {pathPoints.length > 0 && <polyline points={line} className="landscape-path" />}
      {pathPoints.map(([x, z], k) => <circle key={k} cx={x - design.minX + 0.5} cy={z - design.minZ + 0.5} r={Math.max(0.8, design.width / 120)} className="landscape-path-point" />)}
      {hover && brushRadius !== null && <circle cx={hover[0] - design.minX + 0.5} cy={hover[1] - design.minZ + 0.5} r={brushRadius + 0.5} className="landscape-brush" />}
    </svg>
  </div>;
}
