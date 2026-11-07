import { useEffect, useMemo, useRef, useState } from 'react';
import type { Cell, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { mix, stateColor } from '../colors';
import type { Mark } from './types';
import './viewTools.css';

type BlockCell = Exclude<Cell, { readonly kind: 'erase' }>;

/**
 * 2D-Schichtplan (UX-02): Draufsicht einer Ebene als Alternative zum 3D-Bild – ohne WebGL, mit Tastatur
 * (Pfeile bewegen den Zeiger, Bild ↑/↓ wechselt die Ebene, Eingabe wählt den Block) und mit Ansage für
 * Screenreader. Norden ist oben, wie in der Draufsicht des 3D-Bilds und im Spiel auf der Karte.
 */
export function PlanView2D({ payload, cells, onSelect, markFor }: {
  payload: VoxelPayload; cells: readonly Cell[]; onSelect: (cell: Cell | null) => void; markFor?: ((cell: Cell) => Mark | null) | undefined;
}) {
  const b = payload.bounds;
  const byLayer = useMemo(() => {
    const m = new Map<number, Map<string, BlockCell>>();
    for (const c of cells) { if (c.kind === 'erase') continue; const y = c.position[1]; let l = m.get(y); if (!l) m.set(y, l = new Map()); l.set(`${c.position[0]},${c.position[2]}`, c); }
    return m;
  }, [cells]);
  const ys = useMemo(() => [...byLayer.keys()].sort((a, c) => a - c), [byLayer]);
  const [y, setY] = useState(() => ys[0] ?? b.min[1]);
  const layerY = ys.includes(y) ? y : ys[0] ?? b.min[1];
  const [cursor, setCursor] = useState<[number, number]>([b.min[0], b.min[2]]);
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = host.current; if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 600)); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const w = b.maxExclusive[0] - b.min[0], d = b.maxExclusive[2] - b.min[2];
  const size = Math.max(4, Math.min(24, Math.floor((width - 16) / Math.max(1, w))));
  const layer = byLayer.get(layerY);
  useEffect(() => {
    const cv = canvas.current; if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * size * dpr; cv.height = d * size * dpr;
    const g = cv.getContext('2d'); if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0d1b24'; g.fillRect(0, 0, w * size, d * size);
    if (size >= 8) { g.strokeStyle = '#1d3340'; g.lineWidth = 1; for (let x = 0; x <= w; x++) { g.beginPath(); g.moveTo(x * size + .5, 0); g.lineTo(x * size + .5, d * size); g.stroke(); } for (let z = 0; z <= d; z++) { g.beginPath(); g.moveTo(0, z * size + .5); g.lineTo(w * size, z * size + .5); g.stroke(); } }
    for (const c of layer?.values() ?? []) {
      const base = stateColor(payload.palette[c.paletteIndex]?.id ?? ''), m = markFor?.(c);
      g.fillStyle = m ? mix(base, m.color, m.amount) : base;
      g.fillRect((c.position[0] - b.min[0]) * size + 1, (c.position[2] - b.min[2]) * size + 1, size - 1, size - 1);
    }
    g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    g.strokeRect((cursor[0] - b.min[0]) * size + 1, (cursor[1] - b.min[2]) * size + 1, size - 2, size - 2);
  }, [layer, size, w, d, payload, markFor, cursor, b.min]);
  const at = layer?.get(`${cursor[0]},${cursor[1]}`) ?? null;
  const name = (c: BlockCell | null) => c ? payload.palette[c.paletteIndex]?.id.replace(/^minecraft:/, '') ?? '?' : 'Luft';
  const move = (dx: number, dz: number) => setCursor(([x, z]) => [Math.min(b.maxExclusive[0] - 1, Math.max(b.min[0], x + dx)), Math.min(b.maxExclusive[2] - 1, Math.max(b.min[2], z + dz))]);
  const step = (dir: 1 | -1) => { const i = ys.indexOf(layerY) + dir; if (i >= 0 && i < ys.length) setY(ys[i]!); };
  return <div className="plan2d" ref={host}>
    <div className="plan2d-bar">
      <label>Ebene <input type="range" min={0} max={Math.max(0, ys.length - 1)} value={Math.max(0, ys.indexOf(layerY))} aria-label="Ebene (Y)" aria-valuetext={`Y ${layerY}`}
        onChange={e => setY(ys[Number(e.target.value)] ?? layerY)} disabled={ys.length < 2} /></label>
      <output>Y {layerY} · {layer?.size ?? 0} Blöcke</output>
      <button type="button" onClick={() => step(-1)} disabled={ys.indexOf(layerY) <= 0} aria-label="Ebene tiefer">▼</button>
      <button type="button" onClick={() => step(1)} disabled={ys.indexOf(layerY) >= ys.length - 1} aria-label="Ebene höher">▲</button>
    </div>
    <div className="plan2d-scroll">
      <canvas ref={canvas} style={{ width: w * size, height: d * size }} tabIndex={0} role="img"
        aria-label={`Schichtplan Ebene Y ${layerY}, Norden oben. Pfeiltasten bewegen den Zeiger, Bild auf/ab wechselt die Ebene, Eingabe wählt den Block.`}
        onKeyDown={e => {
          const keys: Record<string, () => void> = { ArrowLeft: () => move(-1, 0), ArrowRight: () => move(1, 0), ArrowUp: () => move(0, -1), ArrowDown: () => move(0, 1),
            PageUp: () => step(1), PageDown: () => step(-1), Enter: () => onSelect(at), ' ': () => onSelect(at) };
          const k = keys[e.key]; if (k) { e.preventDefault(); k(); }
        }}
        onClick={e => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = b.min[0] + Math.floor((e.clientX - r.left) / size), z = b.min[2] + Math.floor((e.clientY - r.top) / size);
          setCursor([x, z]); onSelect(layer?.get(`${x},${z}`) ?? null);
        }} />
    </div>
    <p className="plan2d-status" aria-live="polite">X {cursor[0]} · Y {layerY} · Z {cursor[1]}: {name(at)}</p>
  </div>;
}
