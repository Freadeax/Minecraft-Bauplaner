import { useEffect, useMemo, useRef, useState } from 'react';
import type { VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { stateColor } from '../colors';
import { facingArrow, firstBuiltLayer, layerCounts, layerIndex, shapeOf } from './layers';
import type { LayerIndex } from './layers';

/**
 * Bauplan je Schicht (B12): top view of one Y layer with the layer below as a
 * faint ghost, orientation arrows for stairs, doors and other facing blocks,
 * slab marks, hover info and a legend of the layer. "Alle Ebenen" shows every
 * layer as a small plan; "Drucken" prints those plans (print stylesheet).
 * Coordinates are those of the payload, north is up, east is right.
 */
export type ColorOf = (cellIndex: number) => string | null;
const bare = (id: string) => id.replace(/^minecraft:/, '');

function cellSizeFor(w: number, h: number, maxPx: number, maxCell: number, minCell: number): number {
  return Math.max(minCell, Math.min(maxCell, Math.floor(maxPx / Math.max(w, h))));
}

function drawLayer(canvas: HTMLCanvasElement, index: LayerIndex, payload: VoxelPayload, y: number, cs: number, colorOf: ColorOf | undefined, detail: boolean, hover: readonly [number, number] | null): void {
  const w = index.x1 - index.x0 + 1, h = index.z1 - index.z0 + 1;
  const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
  canvas.width = Math.round(w * cs * ratio); canvas.height = Math.round(h * cs * ratio);
  canvas.style.width = `${w * cs}px`; canvas.style.aspectRatio = `${w} / ${h}`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#0d1a22'; ctx.fillRect(0, 0, w * cs, h * cs);
  const colour = (i: number, paletteIndex: number) => colorOf ? colorOf(i) : stateColor(payload.palette[paletteIndex]!.id);
  // Ghost of the layer below: where the next blocks stand on.
  if (detail) {
    ctx.globalAlpha = 0.22;
    for (const c of index.byY.get(y - 1) ?? []) {
      const col = colour(c.index, c.paletteIndex); if (!col) continue;
      ctx.fillStyle = col; ctx.fillRect((c.x - index.x0) * cs, (c.z - index.z0) * cs, cs, cs);
    }
    ctx.globalAlpha = 1;
  }
  for (const c of index.byY.get(y) ?? []) {
    const col = colour(c.index, c.paletteIndex); if (!col) continue;
    const px = (c.x - index.x0) * cs, pz = (c.z - index.z0) * cs;
    ctx.fillStyle = col; ctx.fillRect(px, pz, cs, cs);
    if (!detail || cs < 10) continue;
    const state = payload.palette[c.paletteIndex]!;
    const shape = shapeOf(state.id, state.properties);
    ctx.strokeStyle = 'rgba(10,20,28,.65)'; ctx.fillStyle = 'rgba(10,20,28,.55)'; ctx.lineWidth = Math.max(1, cs / 14);
    if (shape === 'half-bottom' || shape === 'half-top') {
      // Slab: hatched half, bottom slab lower-left, top slab upper-right.
      ctx.beginPath();
      if (shape === 'half-bottom') { ctx.moveTo(px, pz + cs); ctx.lineTo(px + cs, pz + cs); ctx.lineTo(px, pz); }
      else { ctx.moveTo(px, pz); ctx.lineTo(px + cs, pz); ctx.lineTo(px + cs, pz + cs); }
      ctx.closePath(); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
    }
    const arrow = facingArrow(state.properties);
    if (arrow) {
      const cx = px + cs / 2, cz = pz + cs / 2, r = cs * 0.3, [dx, dz] = arrow;
      ctx.beginPath();
      ctx.moveTo(cx + dx * r, cz + dz * r);
      ctx.lineTo(cx - dx * r * 0.6 - dz * r * 0.7, cz - dz * r * 0.6 + dx * r * 0.7);
      ctx.lineTo(cx - dx * r * 0.6 + dz * r * 0.7, cz - dz * r * 0.6 - dx * r * 0.7);
      ctx.closePath(); ctx.fill();
      if (shape === 'stairs') { ctx.beginPath(); ctx.moveTo(px + 2, pz + 2); ctx.lineTo(px + cs - 2, pz + 2); ctx.lineTo(px + cs - 2, pz + cs - 2); ctx.lineTo(px + 2, pz + cs - 2); ctx.closePath(); ctx.stroke(); }
    }
  }
  if (detail && cs >= 6) {
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) { ctx.moveTo(x * cs + 0.5, 0); ctx.lineTo(x * cs + 0.5, h * cs); }
    for (let z = 0; z <= h; z++) { ctx.moveTo(0, z * cs + 0.5); ctx.lineTo(w * cs, z * cs + 0.5); }
    ctx.stroke();
    // Every fifth line a bit stronger: counting blocks in game.
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 5) { ctx.moveTo(x * cs + 0.5, 0); ctx.lineTo(x * cs + 0.5, h * cs); }
    for (let z = 0; z <= h; z += 5) { ctx.moveTo(0, z * cs + 0.5); ctx.lineTo(w * cs, z * cs + 0.5); }
    ctx.stroke();
  }
  if (hover) {
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
    ctx.strokeRect((hover[0] - index.x0) * cs + 1, (hover[1] - index.z0) * cs + 1, cs - 2, cs - 2);
  }
}

function LayerCanvas({ index, payload, y, cs, colorOf, detail, label, onHover, onPick }: {
  index: LayerIndex; payload: VoxelPayload; y: number; cs: number; colorOf: ColorOf | undefined; detail: boolean; label: string;
  onHover?: (cell: readonly [number, number] | null) => void; onPick?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<readonly [number, number] | null>(null);
  useEffect(() => { if (ref.current) drawLayer(ref.current, index, payload, y, cs, colorOf, detail, hover); }, [index, payload, y, cs, colorOf, detail, hover]);
  const at = (e: React.PointerEvent<HTMLCanvasElement>): readonly [number, number] | null => {
    const r = e.currentTarget.getBoundingClientRect(), w = index.x1 - index.x0 + 1, h = index.z1 - index.z0 + 1;
    const x = Math.floor((e.clientX - r.left) / r.width * w), z = Math.floor((e.clientY - r.top) / r.height * h);
    return x >= 0 && z >= 0 && x < w && z < h ? [index.x0 + x, index.z0 + z] : null;
  };
  return <canvas ref={ref} role="img" aria-label={label} className={onPick ? 'pickable' : undefined}
    onPointerMove={onHover ? e => { const c = at(e); setHover(c); onHover(c); } : undefined}
    onPointerLeave={onHover ? () => { setHover(null); onHover(null); } : undefined}
    onClick={onPick} />;
}

export function LayerSheet({ payload, name, colorOf, legendColor }: {
  payload: VoxelPayload;
  name: string;
  /** Colour per cell index (e.g. diff marks); default block colours. */
  colorOf?: ColorOf;
  /** Swatch colour of a legend entry; default block colour. */
  legendColor?: (id: string) => string;
}) {
  const index = useMemo(() => layerIndex(payload), [payload]);
  const [y, setY] = useState(() => firstBuiltLayer(index));
  const [mode, setMode] = useState<'one' | 'all'>('one');
  const [hover, setHover] = useState<readonly [number, number] | null>(null);
  useEffect(() => { setY(firstBuiltLayer(index)); }, [index]);
  const lo = index.ys[0] ?? 0, hi = index.ys.at(-1) ?? 0;
  const layer = Math.max(lo, Math.min(hi, y));
  const w = index.x1 - index.x0 + 1, h = index.z1 - index.z0 + 1;
  const counts = useMemo(() => layerCounts(index, layer, payload.palette), [index, layer, payload]);
  const blocks = counts.reduce((s, c) => s + c.count, 0);
  const below = (index.byY.get(layer - 1)?.length ?? 0);
  const hovered = useMemo(() => {
    if (!hover) return null;
    const cell = index.byY.get(layer)?.find(c => c.x === hover[0] && c.z === hover[1]);
    return { pos: hover, state: cell ? payload.palette[cell.paletteIndex]! : null };
  }, [hover, index, layer, payload]);
  const step = (d: number) => setY(Math.max(lo, Math.min(hi, layer + d)));
  const print = () => {
    setMode('all');
    document.body.classList.add('printing-layers');
    const done = () => { document.body.classList.remove('printing-layers'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(done, 500); }, 60);
  };
  const swatch = legendColor ?? stateColor;
  const built = index.ys.filter(v => (index.byY.get(v)?.length ?? 0) > 0);

  return <div className="layer-sheet" aria-label={`Bauplan ${name}`}>
    <div className="layer-sheet-bar" role="toolbar" aria-label="Ebenen">
      <div className="seg" role="group" aria-label="Darstellung">
        <button type="button" aria-pressed={mode === 'one'} onClick={() => setMode('one')}>Einzeln</button>
        <button type="button" aria-pressed={mode === 'all'} onClick={() => setMode('all')}>Alle Ebenen</button>
      </div>
      {mode === 'one' && <>
        <span className="seg"><button type="button" aria-label="Ebene tiefer" disabled={layer <= lo} onClick={() => step(-1)}>▼</button>
          <button type="button" aria-label="Ebene höher" disabled={layer >= hi} onClick={() => step(1)}>▲</button></span>
        <label className="layer-slider">Y {layer}<input type="range" min={lo} max={hi} value={layer} aria-label="Ebene (Y)" onChange={e => setY(Number(e.target.value))} /></label>
        <span className="layer-pos" aria-live="polite">Ebene {layer - lo + 1} von {hi - lo + 1} · <b>{blocks}</b> Blöcke</span>
      </>}
      <button type="button" className="layer-print" onClick={print}>⎙ Drucken</button>
    </div>
    {mode === 'one' ? <div className="layer-one">
      <div className="layer-canvas" tabIndex={0} aria-label="Bauplan, Pfeiltasten wechseln die Ebene"
        onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(1); } if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); step(-1); } }}>
        <span className="compass" aria-hidden="true">N ↑</span>
        <LayerCanvas index={index} payload={payload} y={layer} cs={cellSizeFor(w, h, 620, 44, 4)} colorOf={colorOf} detail label={`Ebene Y ${layer}: ${blocks} Blöcke`} onHover={setHover} />
        <p className="layer-hover" aria-live="polite">{hovered ? <>X {hovered.pos[0]} · Y {layer} · Z {hovered.pos[1]} · {hovered.state ? <b>{bare(hovered.state.id)}</b> : 'leer'}
          {hovered.state && Object.keys(hovered.state.properties).length > 0 && <small> [{Object.entries(hovered.state.properties).map(([k, v]) => `${k}=${v}`).join(', ')}]</small>}</>
          : <>{w} × {h} Felder · Norden oben · blasser Schatten: Ebene darunter ({below} Blöcke) · Pfeil: Blickrichtung</>}</p>
      </div>
      <aside className="layer-legend" aria-label={`Blöcke der Ebene Y ${layer}`}>
        <h4>Diese Ebene</h4>
        {counts.length ? <ul>{counts.map(c => <li key={c.id}><i style={{ background: swatch(c.id) }} aria-hidden="true" /><span>{bare(c.id)}</span><b>{c.count}</b></li>)}</ul>
          : <p className="muted">Keine Blöcke in dieser Ebene.</p>}
      </aside>
    </div>
      : <div className="layer-all">
        <p className="layer-print-head">{name} · Bauplan · {w} × {index.ys.length} × {h} · Norden oben · {built.length} belegte Ebenen</p>
        <ol>{built.map(v => <li key={v}>
          <button type="button" className="layer-thumb" aria-label={`Ebene Y ${v} öffnen`} onClick={() => { setY(v); setMode('one'); }}>
            <LayerCanvas index={index} payload={payload} y={v} cs={cellSizeFor(w, h, 180, 12, 2)} colorOf={colorOf} detail={false} label={`Ebene Y ${v}`} />
          </button>
          <span>Y {v} · {index.byY.get(v)?.length ?? 0}</span></li>)}</ol>
      </div>}
  </div>;
}
