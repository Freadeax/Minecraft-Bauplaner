import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { SURFACE_UNKNOWN } from '../../../../../packages/formats/src/index.js';
import type { SurfaceMap } from '../../../../../packages/formats/src/index.js';
import { faceColors } from '../../colors';

/** World X/Z rectangle, inclusive corners as shown in game (F3). */
export interface AreaXZ { readonly x1: number; readonly z1: number; readonly x2: number; readonly z2: number }

const rgb = (hex: string): [number, number, number] => { const n = Number.parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/**
 * Top view of the surface (top block colour, shaded by height difference to the
 * north neighbour). Drag to select an area; unknown columns stay checkered.
 */
export function SurfaceCanvas({ map, area, onArea, marks }: {
  map: SurfaceMap; area: AreaXZ | null; onArea: (a: AreaXZ) => void;
  /** Extra outlines in world X/Z (e.g. a placed project). */
  marks?: readonly { readonly area: AreaXZ; readonly label: string }[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
  const drag = useRef<{ x: number; z: number } | null>(null);
  const colors = useMemo(() => map.ids.map(id => id === '?' ? [0, 0, 0] as [number, number, number] : rgb(faceColors(id).top)), [map]);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    c.width = map.width; c.height = map.length;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const img = ctx.createImageData(map.width, map.length), d = img.data;
    for (let z = 0; z < map.length; z++) for (let x = 0; x < map.width; x++) {
      const i = z * map.width + x, h = map.heights[i]!, o = i * 4;
      if (h === SURFACE_UNKNOWN) { const v = ((x >> 3) + (z >> 3)) & 1 ? 46 : 36; d[o] = v; d[o + 1] = v + 4; d[o + 2] = v + 8; d[o + 3] = 255; continue; }
      const north = z > 0 ? map.heights[i - map.width]! : h;
      const shade = north === SURFACE_UNKNOWN ? 1 : Math.max(0.7, Math.min(1.25, 1 + (h - north) * 0.08));
      const col = colors[map.blocks[i]!]!;
      d[o] = Math.min(255, col[0] * shade); d[o + 1] = Math.min(255, col[1] * shade); d[o + 2] = Math.min(255, col[2] * shade); d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [map, colors]);

  const toWorld = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * map.width), z = Math.floor((e.clientY - r.top) / r.height * map.length);
    return { x: map.minX + Math.max(0, Math.min(map.width - 1, x)), z: map.minZ + Math.max(0, Math.min(map.length - 1, z)) };
  };
  const at = hover ? (hover.z - map.minZ) * map.width + (hover.x - map.minX) : -1;
  const pct = (v: number, base: number, span: number) => `${(v - base) / span * 100}%`;
  const box = (a: AreaXZ) => ({
    left: pct(Math.min(a.x1, a.x2), map.minX, map.width), top: pct(Math.min(a.z1, a.z2), map.minZ, map.length),
    width: pct(Math.abs(a.x2 - a.x1) + 1 + map.minX, map.minX, map.width), height: pct(Math.abs(a.z2 - a.z1) + 1 + map.minZ, map.minZ, map.length),
  });

  return <figure className="world-map">
    <div className="world-map-stage"
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); const p = toWorld(e); drag.current = p; onArea({ x1: p.x, z1: p.z, x2: p.x, z2: p.z }); }}
      onPointerMove={e => { const p = toWorld(e); setHover(p); if (drag.current) onArea({ x1: drag.current.x, z1: drag.current.z, x2: p.x, z2: p.z }); }}
      onPointerUp={() => { drag.current = null; }} onPointerLeave={() => setHover(null)}>
      <canvas ref={canvas} className="world-map-canvas" role="img" aria-label={`Draufsicht X ${map.minX} bis ${map.minX + map.width - 1}, Z ${map.minZ} bis ${map.minZ + map.length - 1}`} />
      {marks?.map(m => <div key={m.label} className="world-map-mark" style={box(m.area)} title={m.label}><span>{m.label}</span></div>)}
      {area && <div className="world-map-area" style={box(area)} aria-hidden="true" />}
    </div>
    <figcaption>
      <span>Norden oben (−Z), Osten rechts (+X) · Ziehen wählt einen Bereich</span>
      <span aria-live="polite">{hover ? <>X <b>{hover.x}</b> Z <b>{hover.z}</b>{at >= 0 && map.heights[at] !== SURFACE_UNKNOWN ? <> · Y <b>{map.heights[at]}</b> · {map.ids[map.blocks[at]!]!.replace('minecraft:', '')}</> : ' · unbekannt'}</> : ' '}</span>
    </figcaption>
  </figure>;
}

/** Height range of the surface inside an area (for a sensible default Y range); null when nothing is known. */
export function surfaceRange(map: SurfaceMap, a: AreaXZ): { min: number; max: number } | null {
  let min = Infinity, max = -Infinity;
  for (let z = Math.min(a.z1, a.z2); z <= Math.max(a.z1, a.z2); z++) for (let x = Math.min(a.x1, a.x2); x <= Math.max(a.x1, a.x2); x++) {
    const gx = x - map.minX, gz = z - map.minZ;
    if (gx < 0 || gz < 0 || gx >= map.width || gz >= map.length) continue;
    const h = map.heights[gz * map.width + gx]!;
    if (h === SURFACE_UNKNOWN) continue;
    if (h < min) min = h; if (h > max) max = h;
  }
  return Number.isFinite(min) ? { min, max } : null;
}
