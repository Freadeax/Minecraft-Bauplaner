import { useEffect, useMemo, useRef, useState } from 'react';
import { dimensionLabel, earthworkMap, middleLine, planColumns, terrainSection } from '../../../../../packages/domain/src/index.js';
import type { EarthColumn, EarthworkMap, Project, SectionAxis, TerrainSurvey, WorldPlacement } from '../../../../../packages/domain/src/index.js';
import type { VoxelPayload } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { errorText, formatNumber } from '../../app/ui';
import type { LiveGame } from '../map/liveClient';
import { useSurvey } from '../world/surveys';
import { gameDimension, gameTerrainLevel, takeGameSurvey } from '../world/gameTerrain';

type MapMode = 'earth' | 'height' | 'water';
const MODE_LABEL: Readonly<Record<MapMode, string>> = { earth: 'Erdbewegung', height: 'Höhe', water: 'Wassertiefe' };
const AXIS_LABEL: Readonly<Record<SectionAxis, string>> = { x: 'West → Ost', z: 'Nord → Süd' };
const C = { cut: '#e04848', fill: '#f3d23a', wet: '#3a7bd5', plan: '#4fbf7a', unknown: '#59606b', land: '#8a6b45', water: '#3a7bd5', live: '#f08a24' };
const at = (when: string) => new Date(when).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Geländeschnitt und Erdbewegung (FLOW-01): Plan, gespeicherte Geländeaufnahme und Live-Gelände aus der Mod stehen
 * getrennt nebeneinander. Die Karte zeigt Abtrag, Unterbau, Kollisionen, Höhe oder Wassertiefe je Spalte; ein Klick
 * legt die Schnittlinie. Live wird nur verglichen, nie gespeichert (dafür „Gelände aus dem Spiel erneuern“).
 */
export function TerrainSectionPanel({ project, placement, world, game }: { project: Project; placement: WorldPlacement; world: VoxelPayload; game: LiveGame }) {
  const { repo } = useApp();
  const ref = project.terrain ?? null;
  const { survey, error } = useSurvey(repo, ref);
  const [live, setLive] = useState<{ survey: TerrainSurvey; at: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [show, setShow] = useState({ plan: true, survey: true, live: true });
  const [mode, setMode] = useState<MapMode>('earth');
  const [axis, setAxis] = useState<SectionAxis>('z');
  const [line, setLine] = useState<number | null>(null);
  const plan = useMemo(() => planColumns(world, placement), [world, placement]);
  const liveSurvey = live && ref && live.key === ref.sha256 ? live.survey : null;
  const map = useMemo(() => survey ? earthworkMap(survey, plan, { margin: 6, live: liveSurvey }) : null, [survey, plan, liveSurvey]);
  const lineAt = map ? line ?? middleLine(map, axis) : 0;
  const section = useMemo(() => map ? terrainSection(map, axis, lineAt) : null, [map, axis, lineAt]);
  const level = gameTerrainLevel(game), here = gameDimension(game);

  if (!ref) return <section className="terrain-section" aria-label="Geländeschnitt"><h3>Geländeschnitt und Erdbewegung</h3>
    <p className="muted">Sobald eine Geländeaufnahme gespeichert ist (oben), zeigt dieser Bereich Höhenprofil, Wassertiefe, Abtrag, Unterbau und wo der Plan ins Gelände stößt.</p></section>;
  if (!survey) return <section className="terrain-section" aria-label="Geländeschnitt"><h3>Geländeschnitt und Erdbewegung</h3><p role={error ? 'alert' : 'status'}>{error || 'Geländeaufnahme wird geladen …'}</p></section>;

  const readLive = async () => {
    setBusy(true); setNote('');
    try {
      const r = await takeGameSurvey(game, ref.area, placement.dimension);
      setLive({ survey: r.survey, at: new Date().toISOString(), key: ref.sha256 });
      setNote(r.live || r.remembered ? `Live-Gelände gelesen (${r.live} Chunks geladen${r.remembered ? `, ${r.remembered} aus dem Geländegedächtnis` : ''}). Es wird nur verglichen, nicht gespeichert.` : 'Die Mod kennt hier noch kein Gelände. Geh im Spiel einmal zum Bauplatz.');
    } catch (e) { setNote(`Live nicht gelesen: ${errorText(e)}`); } finally { setBusy(false); }
  };
  const t = map!.totals;
  return <section className="terrain-section" aria-labelledby="terrain-section-title" data-testid="terrain-section">
    <h3 id="terrain-section-title">Geländeschnitt und Erdbewegung</h3>
    <div className="source-cards" role="group" aria-label="Datenquellen">
      <label className={`source-card plan${show.plan ? ' on' : ''}`}><input type="checkbox" checked={show.plan} onChange={e => setShow(s => ({ ...s, plan: e.target.checked }))} />
        <b>Plan</b><small>Revision {project.revision} · {formatNumber(plan.size)} Spalten · Ursprung {placement.origin.join(' / ')}</small></label>
      <label className={`source-card survey${show.survey ? ' on' : ''}`}><input type="checkbox" checked={show.survey} onChange={e => setShow(s => ({ ...s, survey: e.target.checked }))} />
        <b>Geländeaufnahme</b><small>{ref.source === 'mod' ? 'aus dem Spiel' : 'aus Regionsdateien'} · {at(ref.readAt)} · {dimensionLabel(ref.dimension)}</small></label>
      <div className={`source-card live${liveSurvey && show.live ? ' on' : ''}`}>
        {liveSurvey ? <label><input type="checkbox" checked={show.live} onChange={e => setShow(s => ({ ...s, live: e.target.checked }))} /> <b>Live aus dem Spiel</b></label> : <b>Live aus dem Spiel</b>}
        <small>{liveSurvey ? <>gelesen {at(live!.at)} · <b data-testid="live-changed">{formatNumber(t.changed)}</b> Spalten anders als die Aufnahme</> : level === 'none' ? 'Mod nicht verbunden (oben verbinden)' : 'noch nicht gelesen, wird nicht gespeichert'}</small>
        {level !== 'none' && <button type="button" className="secondary" disabled={busy || game.phase !== 'connected' || (here !== null && here !== placement.dimension)} onClick={() => void readLive()}>{liveSurvey ? 'Live erneut lesen' : 'Live vergleichen'}</button>}
      </div>
    </div>
    {note && <p className="notice" role="status">{note}</p>}
    <dl className="report-stats earth-stats" data-testid="earth-totals">
      <div className="cut"><dt>Abtragen</dt><dd>{formatNumber(t.cut)}<small>bis {t.maxCut} tief</small></dd></div>
      <div className="fill"><dt>Unterbau</dt><dd>{formatNumber(t.fill)}<small>bis {t.maxFill} hoch</small></dd></div>
      <div className="cut"><dt>Kollisionen</dt><dd>{formatNumber(t.collisions)}<small>Spalten, Gelände im Plan</small></dd></div>
      <div className="wet"><dt>Im Wasser</dt><dd>{formatNumber(t.wet)}<small>max. {t.maxWater} tief</small></dd></div>
      {t.unknown > 0 && <div><dt>Unbekannt</dt><dd>{formatNumber(t.unknown)}<small>Planspalten ohne Aufnahme</small></dd></div>}
    </dl>
    <div className="earth-grid">
      <figure className="earth-map">
        <div className="chips" role="group" aria-label="Karte zeigt">{(Object.keys(MODE_LABEL) as MapMode[]).map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{MODE_LABEL[m]}</button>)}</div>
        <EarthCanvas map={map!} mode={mode} showPlan={show.plan} axis={axis} line={lineAt} onPick={(x, z) => setLine(axis === 'x' ? z : x)} />
        <figcaption>{mode === 'earth' ? <><i style={{ background: C.cut }} /> Abtrag / Kollision <i style={{ background: C.fill }} /> Unterbau <i style={{ background: C.wet }} /> Fundament im Wasser</> : mode === 'water' ? 'Wassertiefe: je dunkler, desto tiefer' : 'Höhe des Bodens: hell = hoch'} · Klick legt die Schnittlinie · Norden oben</figcaption>
      </figure>
      <div className="earth-section">
        <div className="terrain-run">
          <label>Schnitt<select value={axis} onChange={e => { setAxis(e.target.value as SectionAxis); setLine(null); }} aria-label="Richtung des Schnitts">
            {(Object.keys(AXIS_LABEL) as SectionAxis[]).map(a => <option key={a} value={a}>{AXIS_LABEL[a]}</option>)}</select></label>
          <label>{axis === 'x' ? 'bei Z' : 'bei X'}<input type="number" value={lineAt} onChange={e => setLine(Math.trunc(Number(e.target.value)) || 0)} aria-label="Lage der Schnittlinie" /></label>
        </div>
        {section && <SectionSvg columns={section.columns} from={section.from} yMin={section.yMin} yMax={section.yMax} show={{ ...show, live: show.live && !!liveSurvey }} axis={axis} />}
        {section && <p className="muted small" data-testid="section-summary">Höhenprofil {AXIS_LABEL[axis]} bei {axis === 'x' ? 'Z' : 'X'} {lineAt}: Boden Y {range(section.columns.map(c => c.ground))}{section.totals.maxWater ? `, Wasser bis ${section.totals.maxWater} tief` : ''}. Im Schnitt: {formatNumber(section.totals.cut)} abtragen, {formatNumber(section.totals.fill)} unterbauen, {section.totals.collisions} Kollisionen.</p>}
      </div>
    </div>
    <p className="muted small">Schätzung aus der Höhenkarte (oberster Block und Boden je Spalte): Höhlen und Überhänge fehlen. Blockgenau prüft „Blockgenau prüfen“ unten. Unterbau zählt nur unter der untersten Planschicht, wie die Erdarbeiten der Weltkarte.</p>
  </section>;
}

function range(ys: readonly (number | null)[]): string {
  const k = ys.filter((y): y is number => y !== null);
  return k.length ? `${Math.min(...k)} … ${Math.max(...k)}` : 'unbekannt';
}

function colorOf(c: EarthColumn, mode: MapMode, lo: number, hi: number): string | null {
  if (c.ground === null) return C.unknown;
  if (mode === 'water') return c.water ? `rgba(58,123,213,${Math.min(1, 0.25 + c.water / 10)})` : null;
  if (mode === 'height') { const t = hi > lo ? (c.ground - lo) / (hi - lo) : 0.5; const v = Math.round(60 + t * 150); return `rgb(${v},${v},${Math.round(v * 0.9)})`; }
  if (c.cut) return C.cut;
  if (c.wet) return C.wet;
  if (c.fill) return C.fill;
  return c.fluid ? 'rgba(58,123,213,0.35)' : null;
}

function EarthCanvas({ map, mode, showPlan, axis, line, onPick }: { map: EarthworkMap; mode: MapMode; showPlan: boolean; axis: SectionAxis; line: number; onPick(x: number, z: number): void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const scale = Math.max(1, Math.min(6, Math.floor(480 / Math.max(map.width, map.length, 1))));
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const grounds = map.columns.map(c => c.ground).filter((g): g is number => g !== null);
    const lo = grounds.length ? Math.min(...grounds) : 0, hi = grounds.length ? Math.max(...grounds) : 0;
    for (const c of map.columns) {
      const x = (c.x - map.minX) * scale, y = (c.z - map.minZ) * scale;
      const fill = colorOf(c, mode, lo, hi);
      if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, scale, scale); }
      if (showPlan && c.plan) { ctx.fillStyle = 'rgba(79,191,122,0.35)'; ctx.fillRect(x, y, scale, scale); }
    }
    ctx.strokeStyle = C.live; ctx.lineWidth = Math.max(1, scale / 2);
    ctx.beginPath();
    if (axis === 'x') { const y = (line - map.minZ + 0.5) * scale; ctx.moveTo(0, y); ctx.lineTo(cv.width, y); }
    else { const x = (line - map.minX + 0.5) * scale; ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); }
    ctx.stroke();
  }, [map, mode, showPlan, axis, line, scale]);
  return <canvas ref={ref} width={map.width * scale} height={map.length * scale} className="earth-canvas" data-testid="earth-map" role="img"
    aria-label={`Erdbewegungskarte ${map.width} × ${map.length} Spalten ab X ${map.minX}, Z ${map.minZ}`}
    onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const k = r.width / e.currentTarget.width;
      onPick(map.minX + Math.floor((e.clientX - r.left) / k / scale), map.minZ + Math.floor((e.clientY - r.top) / k / scale)); }} />;
}

function SectionSvg({ columns, from, yMin, yMax, show, axis }: { columns: readonly EarthColumn[]; from: number; yMin: number; yMax: number; show: { plan: boolean; survey: boolean; live: boolean }; axis: SectionAxis }) {
  const w = columns.length, rows = yMax - yMin + 1;
  // Vertical exaggeration so a long, flat section stays readable (about 3 : 1), stated in the caption.
  const k = Math.max(1, Math.min(8, Math.round(w / (rows * 3)))), h = rows * k;
  const Y = (y: number) => (yMax - y) * k; // top of block y
  const tick = Math.max(1, Math.ceil(w / 10)), yTick = Math.max(1, Math.ceil(rows / 6));
  const livePath = show.live ? columns.map((c, i) => c.live ? `${i},${Y(c.live.surface)} ${i + 1},${Y(c.live.surface)}` : '').filter(Boolean).join(' ') : '';
  return <figure className="section-svg">
    <svg viewBox={`-6 -1 ${w + 7} ${h + 3}`} role="img" aria-label={`Geländeschnitt ${AXIS_LABEL[axis]} über ${w} Spalten, Y ${yMin} bis ${yMax}`} data-testid="section-svg">
      <rect x={0} y={0} width={w} height={h} className="section-bg" />
      {columns.map((c, i) => {
        const parts = [];
        if (show.survey && c.ground !== null) {
          parts.push(<rect key="g" x={i} y={Y(c.ground)} width={1.02} height={(c.ground - yMin + 1) * k} fill={C.land} />);
          if (c.fluid && c.surface! > c.ground) parts.push(<rect key="w" x={i} y={Y(c.surface!)} width={1.02} height={(c.surface! - c.ground) * k} fill={C.water} opacity={0.7} />);
        }
        if (show.survey && c.ground === null) parts.push(<rect key="u" x={i} y={0} width={1} height={h} fill={C.unknown} opacity={0.25} />);
        if (show.plan && c.plan) {
          parts.push(<rect key="p" x={i + 0.1} y={Y(c.plan.high)} width={0.8} height={(c.plan.high - c.plan.low + 1) * k} fill={C.plan} opacity={0.75} />);
          if (c.cut) parts.push(<rect key="c" x={i + 0.1} y={Y(c.plan.low + c.cut - 1)} width={0.8} height={c.cut * k} fill={C.cut} />);
          if (c.fill) parts.push(<rect key="f" x={i + 0.25} y={Y(c.plan.low - 1)} width={0.5} height={c.fill * k} fill={C.fill} />);
        }
        return <g key={i}><title>{`${axis === 'x' ? 'X' : 'Z'} ${from + i}: ${c.ground === null ? 'Gelände unbekannt' : `Boden Y ${c.ground}${c.water ? `, Wasser ${c.water} tief` : ''}`}${c.plan ? `, Plan Y ${c.plan.low}…${c.plan.high}` : ''}${c.cut ? `, ${c.cut} abtragen` : ''}${c.fill ? `, ${c.fill} unterbauen` : ''}${c.changed ? ', live verändert' : ''}`}</title>{parts}</g>;
      })}
      {livePath && <polyline points={livePath} fill="none" stroke={C.live} strokeWidth={0.45} strokeDasharray="0.8 0.5" className="section-live" />}
      {Array.from({ length: w }, (_, i) => i % tick === 0 && <text key={`x${i}`} x={i + 0.5} y={h + 1.8} className="axis">{from + i}</text>)}
      {Array.from({ length: rows }, (_, i) => i % yTick === 0 && <text key={`y${i}`} x={-0.6} y={i * k + 0.8} className="axis end">{yMax - i}</text>)}
    </svg>
    <figcaption><i style={{ background: C.land }} /> Boden (Aufnahme) <i style={{ background: C.water }} /> Wasser <i style={{ background: C.plan }} /> Plan <i style={{ background: C.cut }} /> Kollision <i style={{ background: C.fill }} /> Unterbau {show.live && <><i style={{ background: C.live }} /> Live-Oberfläche</>}{k > 1 && ` · Höhe ${k}-fach überhöht`}</figcaption>
  </figure>;
}
