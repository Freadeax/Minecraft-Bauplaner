import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Bounds } from '../../../../../packages/voxel/src/index.js';
import { chunkOf, regionOf } from '../../../../../packages/domain/src/worldmap.js';
import type { TopView, WorldMapView } from '../../../../../packages/domain/src/worldmap.js';
import { columnAt, itemAt, pathColumns, pathStyleOf, WORLD_POINT_TYPES } from '../../../../../packages/domain/src/index.js';
import type { TerrainSurvey, WorldItem } from '../../../../../packages/domain/src/index.js';
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
  /** Weltplan, live game and planning tools (MAP-03); all optional, the map works without them. */
  readonly plan?: PlanLayer;
}

/** Planning tool of the top view. „select“ selects, drags selected things and pans. */
export type MapTool = 'select' | 'site' | 'path' | 'point' | 'measure';
export const MAP_TOOLS: readonly { readonly id: MapTool; readonly label: string; readonly key: string; readonly hint: string }[] = [
  { id: 'select', label: 'Auswählen', key: 'V', hint: 'Klick wählt, Ziehen verschiebt das Gewählte (sonst die Karte)' },
  { id: 'site', label: 'Bauplatz', key: 'B', hint: 'Rechteck aufziehen; Umschalt rastet an Chunks ein' },
  { id: 'path', label: 'Weg', key: 'W', hint: 'Klick setzt Ecken, Doppelklick oder Eingabe beendet, Rücktaste nimmt die letzte Ecke zurück' },
  { id: 'point', label: 'Punkt', key: 'P', hint: 'Klick setzt einen Punkt (Anker, Ziel, Lager …)' },
  { id: 'measure', label: 'Messen', key: 'M', hint: 'Zwei Klicks messen Abstand und Höhenunterschied' },
];

export type MapHit = { readonly kind: 'project'; readonly id: string } | { readonly kind: 'item'; readonly id: string };
export type MapDraft =
  | { readonly kind: 'site'; readonly a: readonly [number, number]; readonly b: readonly [number, number]; readonly snap: boolean }
  | { readonly kind: 'path'; readonly points: readonly (readonly [number, number])[] }
  | { readonly kind: 'point'; readonly x: number; readonly z: number };

export interface PlanLayer {
  readonly items: readonly WorldItem[];
  readonly selectedItem: string | null;
  readonly tool: MapTool;
  readonly onTool: (t: MapTool) => void;
  readonly onPick: (hit: MapHit | null) => void;
  /** Drag of the selected project or item ended (whole blocks). */
  readonly onMove: (hit: MapHit, dx: number, dz: number) => void;
  readonly onDraw: (draft: MapDraft) => void;
  /** Live: the player, the way behind and chunk tiles read from the game. */
  readonly player?: { readonly x: number; readonly z: number; readonly yaw: number; readonly name: string } | null;
  readonly trail?: readonly { readonly x: number; readonly z: number }[];
  readonly tiles?: readonly { readonly x: number; readonly z: number; readonly img: HTMLCanvasElement }[];
  /** Hologram box in the game: x0,z0,x1,z1 inclusive, with its label. */
  readonly hologram?: { readonly box: readonly [number, number, number, number]; readonly label: string; readonly matches: boolean } | null;
  readonly follow?: boolean;
  /** Ground height under a column (for measuring), from surveys or live chunks. */
  readonly groundAt?: (x: number, z: number) => { readonly y: number; readonly id: string; readonly live: boolean } | null;
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

export function OverviewMap({ map, tops, colorOf, selected, onSelect, onFly, preview = null, frame = null, terrain = NO_TERRAIN, boundsOf, plan }: OverviewProps) {
  const canvas = useRef<HTMLCanvasElement>(null), wrap = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ cx: 0, cz: 0, scale: 4 });
  const [cursor, setCursor] = useState<{ x: number; z: number } | null>(null);
  const [scaleShown, setScaleShown] = useState(4);
  const raf = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; moved: boolean; pinch?: number } | null>(null);
  const lastTap = useRef(0);
  const tool = plan?.tool ?? 'select';
  // Tool state lives in refs (pointer handlers must not read stale renders) and is mirrored for drawing.
  const [draft, setDraft] = useState<MapDraft | null>(null);
  const draftRef = useRef<MapDraft | null>(null);
  const setDraftBoth = (d: MapDraft | null) => { draftRef.current = d; setDraft(d); };
  const [hoverCol, setHoverCol] = useState<[number, number] | null>(null);
  const [measure, setMeasure] = useState<{ a: [number, number]; b: [number, number] | null } | null>(null);
  const moving = useRef<{ hit: MapHit; x: number; z: number } | null>(null);
  const [moveBy, setMoveBy] = useState<{ hit: MapHit; dx: number; dz: number } | null>(null);
  useEffect(() => { setDraftBoth(null); setMeasure(null); }, [tool]);

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
    if (plan?.tiles?.length) {
      ctx.globalAlpha = 0.85;
      for (const t of plan.tiles) ctx.drawImage(t.img, sx(t.x * 16), sz(t.z * 16), 16 * scale, 16 * scale);
      ctx.globalAlpha = 1;
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
    if (plan) drawPlan(ctx, plan, { sx, sz, scale, w, h, css, accent, danger, text, strong }, { draft, measure, hoverCol, moveBy, selectedProject: selected, map });
    // Compass.
    ctx.fillStyle = text; ctx.font = '700 12px system-ui, sans-serif'; ctx.textBaseline = 'top'; ctx.fillText('N ↑', w - 34, 8);
  }, [images, terrainImages, map, selected, preview, plan, draft, measure, hoverCol, moveBy]);

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

  const col = (p: { x: number; z: number }): [number, number] => [Math.floor(p.x), Math.floor(p.z)];
  /** What is under the pointer: Weltplan items first (points, paths, sites), then projects. */
  const hitAt = (clientX: number, clientY: number): MapHit | null => {
    const p = worldAt(clientX, clientY);
    if (plan) {
      const item = itemAt(plan.items, p.x, p.z, Math.max(1, 6 / view.current.scale));
      if (item && item.kind !== 'site') return { kind: 'item', id: item.id };
      const project = projectAt(clientX, clientY);
      if (project) return { kind: 'project', id: project };
      return item ? { kind: 'item', id: item.id } : null;
    }
    const project = projectAt(clientX, clientY);
    return project ? { kind: 'project', id: project } : null;
  };
  const isSelected = (hit: MapHit | null) => !!hit && (hit.kind === 'project' ? hit.id === selected : hit.id === plan?.selectedItem);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2, moved: true, pinch: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
      // A second finger always pans/zooms: drop what the first one started.
      moving.current = null; setMoveBy(null);
      if (draftRef.current?.kind === 'site') setDraftBoth(null);
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    const wantsPan = e.button === 1 || e.button === 2;
    if (!plan || wantsPan) return;
    const p = worldAt(e.clientX, e.clientY);
    if (tool === 'select') {
      const hit = hitAt(e.clientX, e.clientY);
      if (isSelected(hit)) moving.current = { hit: hit!, x: p.x, z: p.z };
    } else if (tool === 'site') {
      const c = col(p);
      setDraftBoth({ kind: 'site', a: c, b: c, snap: e.shiftKey });
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = worldAt(e.clientX, e.clientY);
    setCursor({ x: Math.floor(p.x), z: Math.floor(p.z) });
    if (plan && tool !== 'select') setHoverCol(col(p));
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
    const site = draftRef.current?.kind === 'site' ? draftRef.current : null;
    if (site) { setDraftBoth({ ...site, b: col(p), snap: e.shiftKey }); drag.current = { ...d, moved: true }; return; }
    if (moving.current) {
      const m = moving.current;
      setMoveBy({ hit: m.hit, dx: Math.round(p.x - m.x), dz: Math.round(p.z - m.z) });
      drag.current = { ...d, moved: true };
      return;
    }
    v.cx -= (e.clientX - d.x) / v.scale; v.cz -= (e.clientY - d.y) / v.scale;
    drag.current = { x: e.clientX, y: e.clientY, moved: true };
    redraw();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (pointers.current.size > 0) { const [p] = [...pointers.current.values()]; drag.current = { x: p!.x, y: p!.y, moved: true }; return; }
    drag.current = null;
    const p = worldAt(e.clientX, e.clientY), now = performance.now(), double = now - lastTap.current < 350;
    lastTap.current = now;
    if (moving.current) {
      const m = moving.current, dx = Math.round(p.x - m.x), dz = Math.round(p.z - m.z);
      moving.current = null; setMoveBy(null);
      if (d?.moved && (dx || dz)) { plan?.onMove(m.hit, dx, dz); return; }
    }
    const site = draftRef.current?.kind === 'site' ? draftRef.current : null;
    if (site) {
      setDraftBoth(null);
      // A plain click without dragging makes no 1×1 site by accident.
      if (d?.moved) plan?.onDraw({ ...site, b: col(p), snap: e.shiftKey });
      return;
    }
    if (!d || d.moved || e.button === 1 || e.button === 2) return;
    if (plan && tool === 'path') {
      const c = col(p), cur = draftRef.current?.kind === 'path' ? draftRef.current.points : [];
      if (double && cur.length >= 2) { finishPath(); return; }
      const last = cur.at(-1);
      if (!last || last[0] !== c[0] || last[1] !== c[1]) setDraftBoth({ kind: 'path', points: [...cur, c] });
      return;
    }
    if (plan && tool === 'point') { const c = col(p); plan.onDraw({ kind: 'point', x: c[0], z: c[1] }); return; }
    if (plan && tool === 'measure') {
      const c = col(p);
      setMeasure(m => !m || m.b ? { a: c, b: null } : { a: m.a, b: c });
      return;
    }
    const hit = hitAt(e.clientX, e.clientY);
    if (hit?.kind === 'project' && double) onFly(hit.id);
    if (plan) plan.onPick(hit);
    else onSelect(hit?.kind === 'project' ? hit.id : null);
  };
  const finishPath = () => {
    const cur = draftRef.current?.kind === 'path' ? draftRef.current.points : [];
    setDraftBoth(null);
    if (cur.length >= 2) plan?.onDraw({ kind: 'path', points: cur });
  };
  const onWheel = (e: React.WheelEvent) => { zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); };
  const onKey = (e: React.KeyboardEvent) => {
    if (plan) {
      if (e.key === 'Escape' && (draftRef.current || measure)) { e.preventDefault(); setDraftBoth(null); setMeasure(null); return; }
      if (e.key === 'Enter' && draftRef.current?.kind === 'path') { e.preventDefault(); finishPath(); return; }
      if (e.key === 'Backspace' && draftRef.current?.kind === 'path') {
        e.preventDefault(); const pts = draftRef.current.points.slice(0, -1);
        setDraftBoth(pts.length ? { kind: 'path', points: pts } : null); return;
      }
      const t = !e.ctrlKey && !e.metaKey && !e.altKey ? MAP_TOOLS.find(x => x.key === e.key.toUpperCase()) : undefined;
      if (t) { e.preventDefault(); plan.onTool(t.id); return; }
    }
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

  // Follow the player: keep the view centred on them while following is on.
  const px = plan?.player?.x, pz = plan?.player?.z;
  useEffect(() => {
    if (!plan?.follow || px === undefined || pz === undefined) return;
    view.current.cx = px; view.current.cz = pz; redraw();
  }, [plan?.follow, px, pz, redraw]); // eslint-disable-line react-hooks/exhaustive-deps

  const toolInfo = plan ? MAP_TOOLS.find(t => t.id === tool) : undefined;
  const measured = measure?.b ? measureText(measure.a, measure.b, plan?.groundAt) : null;
  const scaleText = scaleShown >= 1 ? `${fmt(Math.round(scaleShown * 10) / 10)} px je Block` : `1 px ≙ ${fmt(Math.round(1 / scaleShown))} Blöcke`;
  return <div className="overview" ref={wrap} data-tool={tool}>
    <canvas ref={canvas} className="overview-canvas" tabIndex={0} role="img"
      aria-label={plan ? `Draufsicht der Weltkarte, Werkzeug ${toolInfo?.label}: ${toolInfo?.hint}. Ziehen mit zwei Fingern oder rechter Maustaste verschiebt, Mausrad zoomt. Tasten V, B, W, P, M wechseln das Werkzeug, Escape bricht ab.`
        : 'Draufsicht der Weltkarte: Ziehen verschiebt, Mausrad oder zwei Finger zoomen, Klick wählt ein Projekt, Doppelklick fliegt hin. Pfeiltasten verschieben, Plus/Minus zoomen.'}
      data-scale={scaleShown.toFixed(3)} data-center={`${Math.round(view.current.cx)},${Math.round(view.current.cz)}`}
      data-draft={draft ? (draft.kind === 'path' ? `path:${draft.points.length}` : draft.kind) : ''}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerCancel={e => { pointers.current.delete(e.pointerId); drag.current = null; moving.current = null; setMoveBy(null); }}
      onContextMenu={e => { if (plan) e.preventDefault(); }}
      onPointerLeave={() => { setCursor(null); setHoverCol(null); }} onWheel={onWheel} onKeyDown={onKey} />
    <div className="overview-tools" role="toolbar" aria-label="Draufsicht">
      <button onClick={() => zoomAt(canvasCentre(canvas.current).x, canvasCentre(canvas.current).y, 1.5)} aria-label="Hineinzoomen">＋</button>
      <button onClick={() => zoomAt(canvasCentre(canvas.current).x, canvasCentre(canvas.current).y, 1 / 1.5)} aria-label="Herauszoomen">－</button>
      <button onClick={() => fit(null)}>Alles</button>
    </div>
    <div className="overview-hud" aria-live="off">
      {measured ? <span data-testid="map-measure"><b>{measured}</b></span>
        : draft?.kind === 'path' ? <span><b>Weg: {draft.points.length} Ecken</b> · Doppelklick oder Eingabe beendet · Rücktaste nimmt zurück · Escape bricht ab</span>
        : cursor ? <span><b>X {fmt(cursor.x)} · Z {fmt(cursor.z)}</b> · Chunk {chunkOf(cursor.x)}, {chunkOf(cursor.z)} · Region r.{regionOf(cursor.x)}.{regionOf(cursor.z)}<GroundAt terrain={terrain} x={cursor.x} z={cursor.z} live={plan?.groundAt} /></span> : <span>Norden oben · Osten rechts</span>}
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
function GroundAt({ terrain, x, z, live }: { terrain: readonly TerrainSurvey[]; x: number; z: number; live?: PlanLayer['groundAt'] | undefined }) {
  const now = live?.(x, z);
  if (now?.live) return <> · Gelände Y {now.y} ({now.id.replace(/^minecraft:/, '')}, aus dem Spiel)</>;
  for (const s of terrain) {
    const c = columnAt(s, x, z);
    if (c) return <> · Gelände Y {c.fluid ? `${c.surface} (${c.surfaceId.replace(/^minecraft:/, '')} über Boden ${c.ground})` : `${c.ground} (${c.groundId.replace(/^minecraft:/, '')})`}</>;
  }
  return null;
}

/** Measuring result: straight line, walking distance on the block grid, chunks and height difference when known. */
export function measureText(a: readonly [number, number], b: readonly [number, number], groundAt?: PlanLayer['groundAt']): string {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const parts = [`${fmt(Math.round(Math.hypot(dx, dz) * 10) / 10)} Blöcke Luftlinie`, `${fmt(Math.abs(dx) + Math.abs(dz))} zu Fuß (ΔX ${dx}, ΔZ ${dz})`];
  const ga = groundAt?.(a[0], a[1]), gb = groundAt?.(b[0], b[1]);
  if (ga && gb) parts.push(`Höhe ${ga.y} → ${gb.y} (${gb.y - ga.y >= 0 ? '+' : ''}${gb.y - ga.y})`);
  parts.push(`${fmt(Math.round(Math.hypot(dx, dz) / 8 * 10) / 10)} Blöcke im Nether`);
  return parts.join(' · ');
}

interface Draw {
  readonly sx: (x: number) => number; readonly sz: (z: number) => number; readonly scale: number; readonly w: number; readonly h: number;
  readonly css: CSSStyleDeclaration; readonly accent: string; readonly danger: string; readonly text: string; readonly strong: string;
}

/** Weltplan, drafts, measuring, hologram box and the player on top of the projects. */
function drawPlan(ctx: CanvasRenderingContext2D, plan: PlanLayer, d: Draw, st: {
  draft: MapDraft | null; measure: { a: [number, number]; b: [number, number] | null } | null; hoverCol: [number, number] | null;
  moveBy: { hit: MapHit; dx: number; dz: number } | null; selectedProject: string | null; map: WorldMapView;
}): void {
  const { sx, sz, scale } = d;
  const site = d.css.getPropertyValue('--map-site').trim() || '#f2b84b', player = d.css.getPropertyValue('--map-player').trim() || '#ffffff';
  const holo = d.css.getPropertyValue('--map-hologram').trim() || '#5fd7e8', trailColor = d.css.getPropertyValue('--map-trail').trim() || '#ffffff';
  const label = (txt: string, x: number, y: number, color: string) => {
    ctx.font = '600 11px system-ui, sans-serif'; ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(x, y - 15, tw + 8, 14);
    ctx.fillStyle = color; ctx.fillText(txt, x + 4, y - 2);
  };
  const off = (id: string) => st.moveBy?.hit.kind === 'item' && st.moveBy.hit.id === id ? st.moveBy : null;
  // Sites, then paths, then points (as in itemAt).
  for (const item of plan.items) {
    if (item.kind !== 'site') continue;
    const o = off(item.id), x = item.minX + (o?.dx ?? 0), z = item.minZ + (o?.dz ?? 0), on = item.id === plan.selectedItem;
    ctx.fillStyle = site; ctx.globalAlpha = item.projectId ? 0.08 : 0.16;
    ctx.fillRect(sx(x), sz(z), item.width * scale, item.length * scale); ctx.globalAlpha = 1;
    ctx.strokeStyle = on ? d.accent : site; ctx.lineWidth = on ? 2.5 : 1.5; ctx.setLineDash(item.projectId ? [] : [7, 4]);
    ctx.strokeRect(sx(x), sz(z), item.width * scale, item.length * scale); ctx.setLineDash([]);
    if (on || item.width * scale > 50) label(`${item.name} · ${item.width}×${item.length}`, sx(x), sz(z + item.length) + 16, on ? d.accent : site);
  }
  for (const item of plan.items) {
    if (item.kind !== 'path') continue;
    const o = off(item.id), style = pathStyleOf(item.style), on = item.id === plan.selectedItem;
    const pts = item.points.map(p => [sx(p[0] + 0.5 + (o?.dx ?? 0)), sz(p[1] + 0.5 + (o?.dz ?? 0))] as const);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (on) { ctx.strokeStyle = d.accent; ctx.lineWidth = Math.max(4, item.width * scale + 4); polyline(ctx, pts); }
    ctx.strokeStyle = style.color; ctx.lineWidth = Math.max(2, item.width * scale); polyline(ctx, pts);
    if (scale >= 4) for (const p of pts) { ctx.fillStyle = on ? d.accent : style.color; ctx.fillRect(p[0] - 2, p[1] - 2, 4, 4); }
    if (on && pts.length) label(item.name, pts[0]![0] + 6, pts[0]![1] - 4, d.accent);
  }
  for (const item of plan.items) {
    if (item.kind !== 'point') continue;
    const o = off(item.id), on = item.id === plan.selectedItem, color = WORLD_POINT_TYPES.find(t => t.id === item.type)?.color ?? d.accent;
    const x = sx(item.x + 0.5 + (o?.dx ?? 0)), z = sz(item.z + 0.5 + (o?.dz ?? 0)), r = on ? 8 : 6;
    ctx.fillStyle = color; ctx.strokeStyle = on ? d.accent : 'rgba(0,0,0,0.7)'; ctx.lineWidth = on ? 3 : 1.5;
    ctx.beginPath(); ctx.moveTo(x, z - r - 6); ctx.lineTo(x + r, z - 6); ctx.lineTo(x, z + 2); ctx.lineTo(x - r, z - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (on || scale >= 1) label(item.name, x + 9, z - 4, on ? d.accent : d.text);
  }
  // A project being dragged: outline at the new place.
  if (st.moveBy?.hit.kind === 'project') {
    const e = st.map.entries.find(x => x.projectId === st.moveBy!.hit.id), b = e?.worldBounds;
    if (b) {
      ctx.strokeStyle = d.accent; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx(b.min[0] + st.moveBy.dx), sz(b.min[2] + st.moveBy.dz), (b.maxExclusive[0] - b.min[0]) * scale, (b.maxExclusive[2] - b.min[2]) * scale);
      ctx.setLineDash([]);
      label(`${st.moveBy.dx >= 0 ? '+' : ''}${st.moveBy.dx} / ${st.moveBy.dz >= 0 ? '+' : ''}${st.moveBy.dz}`, sx(b.min[0] + st.moveBy.dx), sz(b.min[2] + st.moveBy.dz), d.accent);
    }
  }
  // Hologram in the game.
  if (plan.hologram) {
    const [x0, z0, x1, z1] = plan.hologram.box;
    ctx.strokeStyle = holo; ctx.lineWidth = 2; ctx.setLineDash(plan.hologram.matches ? [] : [3, 3]);
    ctx.strokeRect(sx(x0), sz(z0), (x1 - x0 + 1) * scale, (z1 - z0 + 1) * scale); ctx.setLineDash([]);
    label(plan.hologram.label, sx(x0), sz(z1 + 1) + 30, holo);
  }
  // Drafts.
  const dr = st.draft;
  if (dr?.kind === 'site') {
    const x0 = Math.min(dr.a[0], dr.b[0]), z0 = Math.min(dr.a[1], dr.b[1]), x1 = Math.max(dr.a[0], dr.b[0]) + 1, z1 = Math.max(dr.a[1], dr.b[1]) + 1;
    const sn = dr.snap ? [Math.floor(x0 / 16) * 16, Math.floor(z0 / 16) * 16, Math.ceil(x1 / 16) * 16, Math.ceil(z1 / 16) * 16] : [x0, z0, x1, z1];
    ctx.strokeStyle = d.accent; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.strokeRect(sx(sn[0]!), sz(sn[1]!), (sn[2]! - sn[0]!) * scale, (sn[3]! - sn[1]!) * scale); ctx.setLineDash([]);
    label(`${sn[2]! - sn[0]!} × ${sn[3]! - sn[1]!}${dr.snap ? ' (Chunks)' : ''}`, sx(sn[0]!), sz(sn[1]!), d.accent);
  }
  if (dr?.kind === 'path') {
    const pts = [...dr.points, ...(st.hoverCol ? [st.hoverCol] : [])].map(p => [sx(p[0] + 0.5), sz(p[1] + 0.5)] as const);
    ctx.strokeStyle = d.accent; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); polyline(ctx, pts); ctx.setLineDash([]);
    if (dr.points.length >= 1 && scale >= 0.5) {
      const cols = pathColumns({ points: dr.points, width: 1 }, 200_000).length;
      label(`${cols} Blöcke`, pts[0]![0] + 6, pts[0]![1] - 4, d.accent);
    }
  }
  if (st.measure) {
    const a = st.measure.a, b = st.measure.b ?? st.hoverCol;
    ctx.fillStyle = d.accent; ctx.fillRect(sx(a[0] + 0.5) - 3, sz(a[1] + 0.5) - 3, 6, 6);
    if (b) {
      ctx.strokeStyle = d.accent; ctx.lineWidth = 2; ctx.setLineDash([2, 3]);
      polyline(ctx, [[sx(a[0] + 0.5), sz(a[1] + 0.5)], [sx(b[0] + 0.5), sz(b[1] + 0.5)]]); ctx.setLineDash([]);
      label(`${fmt(Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 10) / 10)} Blöcke`, (sx(a[0]) + sx(b[0])) / 2 + 6, (sz(a[1]) + sz(b[1])) / 2, d.accent);
    }
  }
  if (st.hoverCol && plan.tool !== 'select' && scale >= 3) {
    ctx.strokeStyle = d.accent; ctx.lineWidth = 1; ctx.strokeRect(sx(st.hoverCol[0]), sz(st.hoverCol[1]), scale, scale);
  }
  // Player trail and arrow (yaw 0 = south/+Z, 90 = west/−X).
  if (plan.trail && plan.trail.length > 1) {
    ctx.strokeStyle = trailColor; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.setLineDash([2, 4]);
    polyline(ctx, plan.trail.map(t => [sx(t.x), sz(t.z)] as const)); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (plan.player) {
    const p = plan.player, x = sx(p.x), z = sz(p.z), a = p.yaw * Math.PI / 180, fx = -Math.sin(a), fz = Math.cos(a);
    ctx.fillStyle = player; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + fx * 12, z + fz * 12); ctx.lineTo(x - fz * 7 - fx * 6, z + fx * 7 - fz * 6); ctx.lineTo(x - fx * 2, z - fz * 2); ctx.lineTo(x + fz * 7 - fx * 6, z - fx * 7 - fz * 6); ctx.closePath();
    ctx.stroke(); ctx.fill();
    label(p.name || 'Spieler', x + 12, z - 8, player);
  }
}

function polyline(ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[]): void {
  if (pts.length < 2) return;
  ctx.beginPath(); ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
}
