import { useCallback, useEffect, useRef, useState } from 'react';
import type { CellValue } from '../../../../packages/domain/src/index.js';
import type { Vec3 } from '../../../../packages/voxel/src/index.js';
import { blockLook } from '../blockmodels/colors26';
import { stateColor } from '../colors';
import type { LayerCell } from './useDraft';

export interface Stroke { readonly phase: 'down' | 'move' | 'up'; readonly cell: Vec3; readonly shift: boolean; readonly alt: boolean }
export interface GridBox { readonly min: Vec3; readonly maxExclusive: Vec3 }

interface Props {
  readonly layers: ReadonlyMap<number, readonly LayerCell[]>;
  readonly y: number;
  readonly extent: { readonly min: Vec3; readonly max: Vec3 } | null;
  readonly selection: GridBox | null;
  /** Shape preview while dragging (positions on any layer; only this layer is drawn strongly). */
  readonly preview: readonly Vec3[];
  readonly previewColor: string;
  /** Per-position colours of the preview (patterns, paste); falls back to `previewColor`. */
  readonly previewColors?: readonly string[] | undefined;
  /** Size of the shape being drawn, shown in the HUD. */
  readonly previewInfo?: string;
  readonly picked: Vec3 | null;
  readonly onStroke: (s: Stroke) => void;
  readonly onHover: (cell: Vec3 | null) => void;
  /** EDIT-04: symmetry axes (grid coordinates, e.g. 5.5 = through the centre of cell 5) and curve control points. */
  readonly guides?: { readonly lineX?: number | undefined; readonly lineZ?: number | undefined; readonly centre?: boolean; readonly points?: readonly Vec3[] } | undefined;
}

const FACING: Readonly<Record<string, readonly [number, number]>> = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** Seen from above: the top colour of the block where known. */
export const topColor = (id: string): string => (id.startsWith('minecraft:') ? blockLook(id.slice(10))?.top : undefined) ?? stateColor(id);
function fillFor(v: CellValue): string { return v.kind === 'block' ? topColor(v.state.id) : v.kind === 'air' ? 'rgba(160,200,255,0.18)' : 'rgba(211,95,95,0.5)'; }

/**
 * Top view of one Y layer (X → right, Z → down, like the in-game map). Left
 * button paints with the active tool, Shift+drag selects, right/middle button
 * or Space+drag pans, wheel scrolls, Ctrl+wheel (or the buttons) zooms.
 * The layer below is drawn faintly as a guide.
 */
export function LayerGrid({ layers, y, extent, selection, preview, previewColor, previewColors, previewInfo, picked, onStroke, onHover, guides }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null), wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([600, 420]);
  const [cell, setCell] = useState(22);
  const [centre, setCentre] = useState<[number, number]>(() => extent ? [(extent.min[0] + extent.max[0] + 1) / 2, (extent.min[2] + extent.max[2] + 1) / 2] : [0.5, 0.5]);
  const [hover, setHover] = useState<Vec3 | null>(null);
  const drag = useRef<{ mode: 'paint' | 'pan'; x: number; y: number; centre: [number, number] } | null>(null);
  const space = useRef(false);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => { const r = e!.contentRect; setSize([Math.max(200, Math.floor(r.width)), Math.max(220, Math.floor(r.height))]); });
    ro.observe(el);
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target as HTMLElement).closest('input,textarea,select,button')) { space.current = e.type === 'keydown'; } };
    window.addEventListener('keydown', down); window.addEventListener('keyup', down);
    return () => { ro.disconnect(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', down); };
  }, []);

  // React wheel listeners are passive; stop the page from scrolling while the grid scrolls.
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const stop = (e: WheelEvent) => e.preventDefault();
    c.addEventListener('wheel', stop, { passive: false });
    return () => c.removeEventListener('wheel', stop);
  }, []);

  const toCell = useCallback((px: number, py: number): Vec3 => [Math.floor(centre[0] + (px - size[0] / 2) / cell), y, Math.floor(centre[1] + (py - size[1] / 2) / cell)], [centre, size, cell, y]);
  const toScreen = useCallback((x: number, z: number): [number, number] => [size[0] / 2 + (x - centre[0]) * cell, size[1] / 2 + (z - centre[1]) * cell], [centre, size, cell]);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size[0] * dpr; c.height = size[1] * dpr;
    const g = c.getContext('2d'); if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = css('--canvas', '#0f1a1f'); g.fillRect(0, 0, size[0], size[1]);
    const x0 = Math.floor(centre[0] - size[0] / 2 / cell) - 1, x1 = Math.ceil(centre[0] + size[0] / 2 / cell) + 1;
    const z0 = Math.floor(centre[1] - size[1] / 2 / cell) - 1, z1 = Math.ceil(centre[1] + size[1] / 2 / cell) + 1;
    const visible = (x: number, z: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
    // Model extent.
    if (extent) {
      const [ax, az] = toScreen(extent.min[0], extent.min[2]), [bx, bz] = toScreen(extent.max[0] + 1, extent.max[2] + 1);
      g.fillStyle = 'rgba(127,127,127,0.07)'; g.fillRect(ax, az, bx - ax, bz - az);
    }
    // Grid.
    if (cell >= 8) {
      g.strokeStyle = 'rgba(127,127,127,0.16)'; g.lineWidth = 1; g.beginPath();
      for (let x = x0; x <= x1; x++) { const [sx] = toScreen(x, 0); g.moveTo(Math.round(sx) + 0.5, 0); g.lineTo(Math.round(sx) + 0.5, size[1]); }
      for (let z = z0; z <= z1; z++) { const [, sz] = toScreen(0, z); g.moveTo(0, Math.round(sz) + 0.5); g.lineTo(size[0], Math.round(sz) + 0.5); }
      g.stroke();
    }
    // Origin axes.
    g.strokeStyle = 'rgba(127,127,127,0.45)'; g.beginPath();
    const [ox, oz] = toScreen(0, 0); g.moveTo(ox, 0); g.lineTo(ox, size[1]); g.moveTo(0, oz); g.lineTo(size[0], oz); g.stroke();
    // Layer below as a guide.
    const here = layers.get(y) ?? [], below = layers.get(y - 1) ?? [];
    const occupied = new Set(here.map(c => `${c.x},${c.z}`));
    g.globalAlpha = 0.22;
    for (const c of below) if (visible(c.x, c.z) && !occupied.has(`${c.x},${c.z}`) && c.value.kind === 'block') {
      const [sx, sz] = toScreen(c.x, c.z); g.fillStyle = fillFor(c.value); g.fillRect(sx, sz, cell, cell);
    }
    g.globalAlpha = 1;
    for (const c of here) {
      if (!visible(c.x, c.z)) continue;
      const [sx, sz] = toScreen(c.x, c.z);
      g.fillStyle = fillFor(c.value); g.fillRect(sx + 0.5, sz + 0.5, cell - 1, cell - 1);
      if (c.value.kind === 'erase' && cell >= 8) { g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(sx + 3, sz + 3); g.lineTo(sx + cell - 3, sz + cell - 3); g.moveTo(sx + cell - 3, sz + 3); g.lineTo(sx + 3, sz + cell - 3); g.stroke(); }
      if (c.value.kind === 'block' && cell >= 12) {
        const p = c.value.state.properties, f = FACING[p.facing ?? ''] ?? FACING[p.horizontal_facing ?? ''];
        if (f) { // Orientation marker: a wedge on the facing side.
          g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath();
          const mx = sx + cell / 2, mz = sz + cell / 2, r = cell * 0.36;
          g.moveTo(mx + f[0] * r, mz + f[1] * r); g.lineTo(mx - f[1] * r * 0.7 - f[0] * r * 0.2, mz + f[0] * r * 0.7 - f[1] * r * 0.2); g.lineTo(mx + f[1] * r * 0.7 - f[0] * r * 0.2, mz - f[0] * r * 0.7 - f[1] * r * 0.2);
          g.fill();
        }
        if (p.half === 'top' || p.type === 'top') { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(sx + 1, sz + 1, cell - 2, Math.max(2, cell * 0.18)); }
        if (p.type === 'bottom') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(sx + 1, sz + cell - 1 - Math.max(2, cell * 0.18), cell - 2, Math.max(2, cell * 0.18)); }
      }
    }
    // Preview of the shape being drawn.
    if (preview.length) {
      g.fillStyle = previewColor; g.globalAlpha = 0.55;
      // Cells of other layers (arches, cones, walls) as small dots, so the whole shape stays visible from above.
      const drawn = new Set<string>();
      preview.forEach((p, i) => {
        if (p[1] === y || !visible(p[0], p[2]) || drawn.has(`${p[0]},${p[2]}`)) return;
        drawn.add(`${p[0]},${p[2]}`);
        const [sx, sz] = toScreen(p[0], p[2]); g.fillStyle = previewColors?.[i] ?? previewColor; g.globalAlpha = 0.3; g.fillRect(sx + cell * 0.35, sz + cell * 0.35, cell * 0.3, cell * 0.3);
      });
      g.globalAlpha = 0.6;
      preview.forEach((p, i) => { if (p[1] === y && visible(p[0], p[2])) { const [sx, sz] = toScreen(p[0], p[2]); g.fillStyle = previewColors?.[i] ?? previewColor; g.fillRect(sx + 2, sz + 2, cell - 4, cell - 4); } });
      g.globalAlpha = 1;
    }
    // Selection.
    if (selection) {
      const inLayer = y >= selection.min[1] && y < selection.maxExclusive[1];
      const [ax, az] = toScreen(selection.min[0], selection.min[2]), [bx, bz] = toScreen(selection.maxExclusive[0], selection.maxExclusive[2]);
      g.setLineDash([6, 4]); g.lineWidth = 2; g.strokeStyle = inLayer ? css('--mint', '#5be3b5') : 'rgba(127,127,127,0.6)';
      g.strokeRect(ax + 1, az + 1, bx - ax - 2, bz - az - 2); g.setLineDash([]); g.lineWidth = 1;
    }
    // Guides (EDIT-04): symmetry axes as dashed lines, the rotation axis as a ring, curve points as numbered dots.
    if (guides) {
      g.save(); g.setLineDash([8, 5]); g.lineWidth = 2; g.strokeStyle = '#ff9f43';
      if (guides.lineX !== undefined) { const [sx] = toScreen(guides.lineX, 0); g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx, size[1]); g.stroke(); }
      if (guides.lineZ !== undefined) { const [, sz] = toScreen(0, guides.lineZ); g.beginPath(); g.moveTo(0, sz); g.lineTo(size[0], sz); g.stroke(); }
      g.setLineDash([]);
      if (guides.centre && guides.lineX !== undefined && guides.lineZ !== undefined) { const [sx, sz] = toScreen(guides.lineX, guides.lineZ); g.beginPath(); g.arc(sx, sz, Math.max(5, cell * 0.4), 0, Math.PI * 2); g.stroke(); }
      (guides.points ?? []).forEach((p, i) => {
        const [sx, sz] = toScreen(p[0] + 0.5, p[2] + 0.5);
        g.fillStyle = p[1] === y ? '#ff9f43' : 'rgba(255,159,67,0.5)'; g.beginPath(); g.arc(sx, sz, Math.max(4, cell * 0.3), 0, Math.PI * 2); g.fill();
        if (cell >= 14) { g.fillStyle = '#1b1b1b'; g.font = `bold ${Math.round(cell * 0.4)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), sx, sz + 0.5); }
      });
      g.restore();
    }
    if (picked && picked[1] === y) { const [sx, sz] = toScreen(picked[0], picked[2]); g.strokeStyle = '#ffd34d'; g.lineWidth = 2; g.strokeRect(sx + 1, sz + 1, cell - 2, cell - 2); g.lineWidth = 1; }
    if (hover) { const [sx, sz] = toScreen(hover[0], hover[2]); g.strokeStyle = css('--text', '#fff'); g.strokeRect(sx + 0.5, sz + 0.5, cell - 1, cell - 1); }
  }, [layers, y, extent, selection, preview, previewColor, previewColors, picked, hover, size, cell, centre, toScreen, guides]);

  const point = (e: React.PointerEvent | React.WheelEvent): [number, number] => { const r = canvas.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const zoom = (factor: number) => setCell(c => Math.max(4, Math.min(48, Math.round(c * factor))));
  const fit = () => {
    if (!extent) return;
    setCentre([(extent.min[0] + extent.max[0] + 1) / 2, (extent.min[2] + extent.max[2] + 1) / 2]);
    const w = extent.max[0] - extent.min[0] + 3, d = extent.max[2] - extent.min[2] + 3;
    setCell(Math.max(4, Math.min(48, Math.floor(Math.min(size[0] / w, size[1] / d)))));
  };

  return <div className="layer-grid" ref={wrap}>
    <canvas ref={canvas} style={{ width: size[0], height: size[1] }} role="application" aria-label={`Ebene Y ${y}: Blöcke von oben. Linksklick bearbeitet, Shift+Ziehen wählt aus, Rechtsklick+Ziehen verschiebt die Ansicht.`}
      data-layer={y} data-cell-size={cell} data-centre={centre.join(',')}
      onContextMenu={e => e.preventDefault()}
      onPointerDown={e => {
        const [px, py] = point(e); e.currentTarget.setPointerCapture(e.pointerId);
        if (e.button === 1 || e.button === 2 || space.current) { drag.current = { mode: 'pan', x: px, y: py, centre }; return; }
        if (e.button !== 0) return;
        drag.current = { mode: 'paint', x: px, y: py, centre };
        onStroke({ phase: 'down', cell: toCell(px, py), shift: e.shiftKey, alt: e.altKey });
      }}
      onPointerMove={e => {
        const [px, py] = point(e), c = toCell(px, py);
        if (!hover || hover[0] !== c[0] || hover[2] !== c[2] || hover[1] !== c[1]) { setHover(c); onHover(c); }
        const d = drag.current; if (!d) return;
        if (d.mode === 'pan') setCentre([d.centre[0] - (px - d.x) / cell, d.centre[1] - (py - d.y) / cell]);
        else onStroke({ phase: 'move', cell: c, shift: e.shiftKey, alt: e.altKey });
      }}
      onPointerUp={e => {
        const d = drag.current; drag.current = null;
        if (d?.mode === 'paint') { const [px, py] = point(e); onStroke({ phase: 'up', cell: toCell(px, py), shift: e.shiftKey, alt: e.altKey }); }
      }}
      onPointerLeave={() => { setHover(null); onHover(null); }}
      onWheel={e => {
        if (e.ctrlKey || e.metaKey) { zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); return; }
        setCentre(([cx, cz]) => [cx + (e.shiftKey ? e.deltaY : e.deltaX) / cell, cz + (e.shiftKey ? 0 : e.deltaY) / cell]);
      }} />
    <div className="grid-zoom" role="group" aria-label="Ansicht der Ebene">
      <button onClick={() => zoom(1.25)} aria-label="Vergrößern" title="Vergrößern (Strg+Mausrad)">＋</button>
      <button onClick={() => zoom(0.8)} aria-label="Verkleinern" title="Verkleinern">−</button>
      <button onClick={fit} aria-label="Modell einpassen" title="Ganzes Modell einpassen">◎</button>
    </div>
    {(hover || previewInfo) && <div className="grid-hud" aria-hidden="true">{hover && <>X {hover[0]} · Y {hover[1]} · Z {hover[2]}</>}{previewInfo && <>{hover ? ' · ' : ''}{previewInfo}</>}</div>}
  </div>;
}
