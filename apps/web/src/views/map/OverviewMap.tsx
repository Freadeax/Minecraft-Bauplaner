import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Bounds } from '../../../../../packages/voxel/src/index.js';
import { chunkOf, regionOf } from '../../../../../packages/domain/src/worldmap.js';
import type { TopView, WorldMapView } from '../../../../../packages/domain/src/worldmap.js';
import { columnAt } from '../../../../../packages/domain/src/index.js';
import type { TerrainSurvey } from '../../../../../packages/domain/src/index.js';
import { surveyImage } from './terrainLayer';

/**
 * 2D Draufsicht (MAP-01): every placed project as a top-down image of its
 * highest blocks, north up (−Z), east right (+X). Grid lines for blocks,
 * chunks (16) and regions (512) appear when they are far enough apart.
 * Pan by dragging, zoom with the wheel or two fingers, click selects, double
 * click / double tap flies the 3D view there.
 */
export interface OverviewProps {
  readonly map: WorldMapView;
  readonly tops: readonly TopView[];
  /** "#rrggbb" for a cell index of map.cells. */
  readonly colorOf: (cell: number) => string;
  readonly selected: string | null;
  readonly onSelect: (projectId: string | null) => void;
  readonly onFly: (projectId: string) => void;
  /** Outline of a placement being edited (world bounds). */
  readonly preview?: { readonly bounds: Bounds; readonly conflict: boolean } | null;
  /** Bumped by the parent to frame a project (or everything with null). */
  readonly frame?: { readonly projectId: string | null; readonly seq: number } | null;
  /** Stored terrain surveys drawn under the projects (TERRAIN-01). */
  readonly terrain?: readonly TerrainSurvey[];
  /** Fallback frame for a project without drawn blocks (e.g. an empty building site with a survey). */
  readonly boundsOf?: (projectId: string) => Bounds | null;
}

interface View { cx: number; cz: number; scale: number }
const MIN_SCALE = 1 / 64, MAX_SCALE = 32;
const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
const fmt = (n: number) => n.toLocaleString('de-DE');

function hexRgb(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const NO_TERRAIN: readonly TerrainSurvey[] = [];

export function OverviewMap({ map, tops, colorOf, selected, onSelect, onFly, preview = null, frame = null, terrain = NO_TERRAIN, boundsOf }: OverviewProps) {
  const canvas = useRef<HTMLCanvasElement>(null), wrap = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ cx: 0, cz: 0, scale: 4 });
  const [cursor, setCursor] = useState<{ x: number; z: number } | null>(null);
  const [scaleShown, setScaleShown] = useState(4);
  const raf = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; moved: boolean; pinch?: number } | null>(null);
  const lastTap = useRef(0);

  // One small image per project: pixel = top block colour, shaded by height inside the project.
  const images = useMemo(() => tops.map(t => {
    const img = document.createElement('canvas'); img.width = Math.max(1, t.width); img.height = Math.max(1, t.depth);
    const ctx = img.getContext('2d'); if (!ctx) return { entry: t.entry, img, min: t.min };
    const data = ctx.createImageData(img.width, img.height);
    let lo = Infinity, hi = -Infinity;
    for (const i of t.top) if (i >= 0) { const y = map.cells[i]!.position[1]; lo = Math.min(lo, y); hi = Math.max(hi, y); }
    t.top.forEach((i, k) => {
      if (i < 0) return;
      const [r, g, b] = hexRgb(colorOf(i));
      const shade = hi > lo ? 0.72 + 0.28 * (map.cells[i]!.position[1] - lo) / (hi - lo) : 1;
      data.data.set([r * shade, g * shade, b * shade, 255], k * 4);
    });
    ctx.putImageData(data, 0, 0);
    return { entry: t.entry, img, min: t.min };
  }), [tops, map, colorOf]);

  const terrainImages = useMemo(() => terrain.map(s => ({ s, img: surveyImage(s) })), [terrain]);

  const draw = useCallback(() => {
    raf.current = 0;
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(c);
    const bg = css.getPropertyValue('--map-bg').trim() || '#0f1d22', line = css.getPropertyValue('--map-grid').trim() || '#29444d',
      strong = css.getPropertyValue('--map-grid-strong').trim() || '#47766f', text = css.getPropertyValue('--map-text').trim() || '#d8ece8',
      accent = css.getPropertyValue('--map-accent').trim() || '#5ff0b0', danger = css.getPropertyValue('--map-danger').trim() || '#ff6b6b';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const { cx, cz, scale } = view.current;
    const sx = (x: number) => (x - cx) * scale + w / 2, sz = (z: number) => (z - cz) * scale + h / 2;
    const x0 = cx - w / 2 / scale, x1 = cx + w / 2 / scale, z0 = cz - h / 2 / scale, z1 = cz + h / 2 / scale;
    const grid = (step: number, color: string, width: number) => {
      if (step * scale < 6) return;
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
      for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { ctx.moveTo(Math.round(sx(x)) + 0.5, 0); ctx.lineTo(Math.round(sx(x)) + 0.5, h); }
      for (let z = Math.ceil(z0 / step) * step; z <= z1; z += step) { ctx.moveTo(0, Math.round(sz(z)) + 0.5); ctx.lineTo(w, Math.round(sz(z)) + 0.5); }
      ctx.stroke();
    };
    ctx.globalAlpha = 0.45; grid(1, line, 1); ctx.globalAlpha = 1;
    grid(16, line, 1); grid(512, strong, 1.5);
    // Axes through the world origin.
    ctx.strokeStyle = strong; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath();
    ctx.moveTo(sx(0), 0); ctx.lineTo(sx(0), h); ctx.moveTo(0, sz(0)); ctx.lineTo(w, sz(0)); ctx.stroke(); ctx.setLineDash([]);

    ctx.imageSmoothingEnabled = false;
    for (const { s, img } of terrainImages) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, sx(s.minX), sz(s.minZ), s.width * scale, s.length * scale);
      ctx.globalAlpha = 1; ctx.strokeStyle = strong; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.strokeRect(sx(s.minX), sz(s.minZ), s.width * scale, s.length * scale); ctx.setLineDash([]);
    }
    for (const { entry, img, min } of images) {
      const e = map.entries[entry]!;
      ctx.globalAlpha = selected && selected !== e.projectId ? 0.55 : 1;
      ctx.drawImage(img, sx(min[0]), sz(min[1]), img.width * scale, img.height * scale);
    }
    ctx.globalAlpha = 1;
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textBaseline = 'bottom';
    for (const e of map.entries) {
      if (!e.worldBounds || e.skipped === 'empty' || e.skipped === 'error') continue;
      const b = e.worldBounds, rx = sx(b.min[0]), rz = sz(b.min[2]), rw = (b.maxExclusive[0] - b.min[0]) * scale, rh = (b.maxExclusive[2] - b.min[2]) * scale;
      const on = e.projectId === selected;
      ctx.strokeStyle = on ? accent : e.skipped ? strong : text; ctx.lineWidth = on ? 2.5 : 1;
      if (e.skipped) ctx.setLineDash([3, 3]);
      ctx.strokeRect(rx - 0.5, rz - 0.5, Math.max(rw, 3) + 1, Math.max(rh, 3) + 1); ctx.setLineDash([]);
      if (on || rw > 40 || map.entries.length < 12) {
        const label = e.name.length > 28 ? `${e.name.slice(0, 27)}…` : e.name;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(rx, rz - 17, tw + 8, 16);
        ctx.fillStyle = on ? accent : text; ctx.fillText(label, rx + 4, rz - 3);
      }
    }
    for (const col of map.collisions) if (col.cells && col.sample) {
      const x = sx(col.sample[0] + 0.5), z = sz(col.sample[2] + 0.5), r = Math.max(5, scale);
      ctx.strokeStyle = danger; ctx.lineWidth = 2.5; ctx.beginPath();
      ctx.moveTo(x - r, z - r); ctx.lineTo(x + r, z + r); ctx.moveTo(x + r, z - r); ctx.lineTo(x - r, z + r); ctx.stroke();
    }
    if (preview) {
      const b = preview.bounds;
      ctx.strokeStyle = preview.conflict ? danger : accent; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx(b.min[0]), sz(b.min[2]), (b.maxExclusive[0] - b.min[0]) * scale, (b.maxExclusive[2] - b.min[2]) * scale);
      ctx.setLineDash([]);
    }
    // Compass.
    ctx.fillStyle = text; ctx.font = '700 12px system-ui, sans-serif'; ctx.textBaseline = 'top'; ctx.fillText('N ↑', w - 34, 8);
  }, [images, terrainImages, map, selected, preview]);

  const redraw = useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(draw); }, [draw]);
  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => redraw()); ro.observe(el);
    return () => ro.disconnect();
  }, [redraw]);

  const fit = useCallback((b: Bounds | null) => {
    const c = canvas.current; if (!c) return;
    const surveyed = terrain.length ? { min: [Math.min(...terrain.map(s => s.minX)), 0, Math.min(...terrain.map(s => s.minZ))] as [number, number, number],
      maxExclusive: [Math.max(...terrain.map(s => s.minX + s.width)), 1, Math.max(...terrain.map(s => s.minZ + s.length))] as [number, number, number] } : null;
    const target = b ?? map.bounds ?? surveyed;
    if (!target) { view.current = { cx: 0, cz: 0, scale: 4 }; setScaleShown(4); redraw(); return; }
    const w = Math.max(c.clientWidth, 100), h = Math.max(c.clientHeight, 100);
    const bw = target.maxExclusive[0] - target.min[0], bd = target.maxExclusive[2] - target.min[2];
    const scale = clampScale(Math.min(w / (bw + 16), h / (bd + 16)));
    view.current = { cx: (target.min[0] + target.maxExclusive[0]) / 2, cz: (target.min[2] + target.maxExclusive[2]) / 2, scale };
    setScaleShown(scale); redraw();
  }, [map, redraw, terrain]);
  // Frame everything when a new map arrives; the parent can frame one project.
  const framedMap = useRef<WorldMapView | null>(null);
  useEffect(() => { if (framedMap.current !== map) { framedMap.current = map; fit(null); } }, [map, fit]);
  // Surveys load after the map: frame them when there is nothing else to frame.
  useEffect(() => { if (!map.bounds && terrain.length) fit(null); }, [terrain]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!frame) return;
    fit(frame.projectId ? map.entries.find(e => e.projectId === frame.projectId)?.worldBounds ?? boundsOf?.(frame.projectId) ?? null : null);
  }, [frame]); // eslint-disable-line react-hooks/exhaustive-deps

  const worldAt = (clientX: number, clientY: number) => {
    const c = canvas.current!, r = c.getBoundingClientRect(), { cx, cz, scale } = view.current;
    return { x: (clientX - r.left - r.width / 2) / scale + cx, z: (clientY - r.top - r.height / 2) / scale + cz };
  };
  const projectAt = (clientX: number, clientY: number): string | null => {
    const p = worldAt(clientX, clientY);
    // Smallest footprint first, so a small project inside a large one stays clickable.
    const hits = map.entries.filter(e => e.worldBounds && !e.skipped && p.x >= e.worldBounds.min[0] && p.x < e.worldBounds.maxExclusive[0] && p.z >= e.worldBounds.min[2] && p.z < e.worldBounds.maxExclusive[2]);
    hits.sort((a, b) => area(a.worldBounds!) - area(b.worldBounds!));
    return hits[0]?.projectId ?? null;
  };
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const before = worldAt(clientX, clientY), v = view.current;
    v.scale = clampScale(v.scale * factor);
    const after = worldAt(clientX, clientY);
    v.cx += before.x - after.x; v.cz += before.z - after.z;
    setScaleShown(v.scale); redraw();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2, moved: true, pinch: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
    } else drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = worldAt(e.clientX, e.clientY);
    setCursor({ x: Math.floor(p.x), z: Math.floor(p.z) });
    const d = drag.current; if (!d || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = view.current;
    if (pointers.current.size >= 2 && d.pinch) {
      const [a, b] = [...pointers.current.values()];
      const mx = (a!.x + b!.x) / 2, my = (a!.y + b!.y) / 2, dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      v.cx -= (mx - d.x) / v.scale; v.cz -= (my - d.y) / v.scale;
      zoomAt(mx, my, dist / d.pinch);
      drag.current = { x: mx, y: my, moved: true, pinch: dist };
      return;
    }
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
    v.cx -= (e.clientX - d.x) / v.scale; v.cz -= (e.clientY - d.y) / v.scale;
    drag.current = { x: e.clientX, y: e.clientY, moved: true };
    redraw();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (pointers.current.size > 0) { const [p] = [...pointers.current.values()]; drag.current = { x: p!.x, y: p!.y, moved: true }; return; }
    drag.current = null;
    if (!d || d.moved) return;
    const hit = projectAt(e.clientX, e.clientY), now = performance.now();
    if (hit && now - lastTap.current < 350) onFly(hit);
    lastTap.current = now;
    onSelect(hit);
  };
  const onWheel = (e: React.WheelEvent) => { zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); };
  const onKey = (e: React.KeyboardEvent) => {
    const v = view.current, step = 64 / v.scale;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (m) { e.preventDefault(); v.cx += m[0]; v.cz += m[1]; redraw(); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); v.scale = clampScale(v.scale * 1.5); setScaleShown(v.scale); redraw(); }
    else if (e.key === '-') { e.preventDefault(); v.scale = clampScale(v.scale / 1.5); setScaleShown(v.scale); redraw(); }
  };

  // Wheel must not scroll the page while zooming the map.
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const stop = (e: WheelEvent) => e.preventDefault();
    c.addEventListener('wheel', stop, { passive: false });
    return () => c.removeEventListener('wheel', stop);
  }, []);

  const scaleText = scaleShown >= 1 ? `${fmt(Math.round(scaleShown * 10) / 10)} px je Block` : `1 px ≙ ${fmt(Math.round(1 / scaleShown))} Blöcke`;
  return <div className="overview" ref={wrap}>
    <canvas ref={canvas} className="overview-canvas" tabIndex={0} role="img"
      aria-label="Draufsicht der Weltkarte: Ziehen verschiebt, Mausrad oder zwei Finger zoomen, Klick wählt ein Projekt, Doppelklick fliegt hin. Pfeiltasten verschieben, Plus/Minus zoomen."
      data-scale={scaleShown.toFixed(3)} data-center={`${Math.round(view.current.cx)},${Math.round(view.current.cz)}`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={e => { pointers.current.delete(e.pointerId); drag.current = null; }}
      onPointerLeave={() => setCursor(null)} onWheel={onWheel} onKeyDown={onKey} />
    <div className="overview-tools" role="toolbar" aria-label="Draufsicht">
      <button onClick={() => zoomAt(canvasCentre(canvas.current).x, canvasCentre(canvas.current).y, 1.5)} aria-label="Hineinzoomen">＋</button>
      <button onClick={() => zoomAt(canvasCentre(canvas.current).x, canvasCentre(canvas.current).y, 1 / 1.5)} aria-label="Herauszoomen">－</button>
      <button onClick={() => fit(null)}>Alles</button>
    </div>
    <div className="overview-hud" aria-live="off">
      {cursor ? <span><b>X {fmt(cursor.x)} · Z {fmt(cursor.z)}</b> · Chunk {chunkOf(cursor.x)}, {chunkOf(cursor.z)} · Region r.{regionOf(cursor.x)}.{regionOf(cursor.z)}<GroundAt terrain={terrain} x={cursor.x} z={cursor.z} /></span> : <span>Norden oben · Osten rechts</span>}
      <span>{scaleText}</span>
    </div>
  </div>;
}

const area = (b: Bounds) => (b.maxExclusive[0] - b.min[0]) * (b.maxExclusive[2] - b.min[2]);
function canvasCentre(c: HTMLCanvasElement | null): { x: number; y: number } {
  const r = c?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
}

/** Ground under the pointer from the first survey that knows the column. */
function GroundAt({ terrain, x, z }: { terrain: readonly TerrainSurvey[]; x: number; z: number }) {
  for (const s of terrain) {
    const c = columnAt(s, x, z);
    if (c) return <> · Gelände Y {c.fluid ? `${c.surface} (${c.surfaceId.replace(/^minecraft:/, '')} über Boden ${c.ground})` : `${c.ground} (${c.groundId.replace(/^minecraft:/, '')})`}</>;
  }
  return null;
}
