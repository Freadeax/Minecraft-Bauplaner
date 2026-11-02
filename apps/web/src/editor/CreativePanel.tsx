import { useMemo, useRef, useState } from 'react';
import {
  CURVE_PROFILE_LABEL, IMAGE_ORIENTATION_LABEL, MAX_IMAGE_SIDE, SURFACE_FACES_LABEL, blockLabel, blockSchema, colorGradient, curveLength, dilateEdit, erodeEdit,
  imageToBlocks, naturalizeEdit, overlayEdit, paintSurfaceEdit, rgbToHex, similarBlocks, smoothEdit, symmetryLabel,
} from '../../../../packages/domain/src/index.js';
import type { Box, CellSlot, Clipboard, ColorCandidate, CurveProfile, Draft, Edit, ImageOrientation, Pattern, SurfaceFaces, Symmetry } from '../../../../packages/domain/src/index.js';
import type { Vec3 } from '../../../../packages/voxel/src/index.js';
import { formatNumber } from '../app/ui';
import { COLOR_GROUP_LABEL, candidateFor, colorCandidates } from './colorCandidates';
import type { ColorGroup } from './colorCandidates';

/**
 * Kreativwerkzeuge der Werkstatt (EDIT-04): Symmetrie, Kurven, Natur-
 * werkzeuge, Oberflächenmaske, Farbpaletten und Bild → Blöcke. All logic is
 * in the domain (`editor/symmetry.ts`, `curves.ts`, `sculpt.ts`,
 * `colorMatch.ts`); these panels only collect options and call `run`.
 */
const clampInt = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Math.trunc(Number(v)) || min));
const half = (v: string) => Math.round((Number(v.replace(',', '.')) || 0) * 2);

// ------------------------------------------------------------------ symmetry

/**
 * The axis is a fixed position (doubled, [2x, 2z]) so it does not wander while the model grows; the
 * buttons put it on the middle of the model or the selection at that moment.
 */
export interface SymmetryState {
  readonly mirrorX: boolean;
  readonly mirrorZ: boolean;
  readonly rotate: 1 | 2 | 4;
  readonly centre2: readonly [number, number];
  /** False until the axis was placed; the first activation places it on the model middle. */
  readonly placed: boolean;
}
export const INITIAL_SYMMETRY: SymmetryState = { mirrorX: false, mirrorZ: false, rotate: 1, centre2: [0, 0], placed: false };

const middle2 = (a: Vec3, b: Vec3): [number, number] => [Math.min(a[0], b[0]) + Math.max(a[0], b[0]), Math.min(a[2], b[2]) + Math.max(a[2], b[2])];

/** Domain symmetry from the panel state. Quarter turns need both coordinates on centres or both on borders. */
export function toSymmetry(s: SymmetryState): Symmetry {
  let centre2 = s.centre2;
  if (s.rotate === 4 && (centre2[0] - centre2[1]) % 2 !== 0) centre2 = [centre2[0], centre2[1] + 1];
  return { mirrorX: s.mirrorX, mirrorZ: s.mirrorZ, rotate: s.rotate, centre2 };
}

export function SymmetryControls({ state, onChange, symmetry, model, selection }: {
  state: SymmetryState; onChange: (s: SymmetryState) => void; symmetry: Symmetry; model: { min: Vec3; max: Vec3 } | null; selection: Box | null;
}) {
  const set = (p: Partial<SymmetryState>) => {
    const next = { ...state, ...p };
    const on = next.mirrorX || next.mirrorZ || next.rotate > 1;
    onChange(on && !next.placed ? { ...next, placed: true, centre2: model ? middle2(model.min, model.max) : [0, 0] } : next);
  };
  const active = state.mirrorX || state.mirrorZ || state.rotate > 1;
  return <section className="creative-sym" aria-label="Symmetrie">
    <span className="panel-kicker">SYMMETRIE</span>
    <div className="seg" role="group" aria-label="Spiegeln">
      <button aria-pressed={state.mirrorX} onClick={() => set({ mirrorX: !state.mirrorX })} title="Spiegelt an einer Nord-Süd-Linie (Ost ↔ West)">⇆ Ost/West</button>
      <button aria-pressed={state.mirrorZ} onClick={() => set({ mirrorZ: !state.mirrorZ })} title="Spiegelt an einer Ost-West-Linie (Nord ↔ Süd)">⇅ Nord/Süd</button>
    </div>
    <div className="seg" role="group" aria-label="Drehsymmetrie">
      {([1, 2, 4] as const).map(n => <button key={n} aria-pressed={state.rotate === n} onClick={() => set({ rotate: n })}>{n === 1 ? 'ohne Drehung' : `${n}× drehen`}</button>)}
    </div>
    {active && <>
      <div className="sel-range">
        <label>Achse X<input type="number" step={0.5} value={state.centre2[0] / 2} onChange={e => set({ centre2: [half(e.target.value), state.centre2[1]] })} aria-label="Achse X" /></label>
        <label>Achse Z<input type="number" step={0.5} value={state.centre2[1] / 2} onChange={e => set({ centre2: [state.centre2[0], half(e.target.value)] })} aria-label="Achse Z" /></label>
      </div>
      <div className="button-grid">
        <button disabled={!model} onClick={() => model && set({ centre2: middle2(model.min, model.max) })}>Achse: Modellmitte</button>
        <button disabled={!selection} onClick={() => selection && set({ centre2: middle2(selection.a, selection.b) })}>Achse: Auswahlmitte</button>
      </div>
      <p className="muted small" data-symmetry={symmetryLabel(symmetry)}>{symmetryLabel(symmetry)} (x,5 = zwischen zwei Blöcken). Wirkt auf Setzen, Formen, Füllen, Kurven und Einfügen; Treppen, Türen usw. werden mitgedreht.</p>
    </>}
  </section>;
}

// ------------------------------------------------------------------ curve

export interface CurveState { readonly profile: CurveProfile; readonly radius: number; readonly width: number; readonly height: number; readonly closed: boolean; readonly smooth: boolean }
export const INITIAL_CURVE: CurveState = { profile: 'road', radius: 0, width: 3, height: 4, closed: false, smooth: true };

export function CurveControls({ state, onChange, points, onFinish, onUndoPoint, onClear }: {
  state: CurveState; onChange: (s: CurveState) => void; points: readonly Vec3[]; onFinish: () => void; onUndoPoint: () => void; onClear: () => void;
}) {
  const set = (p: Partial<CurveState>) => onChange({ ...state, ...p });
  const length = useMemo(() => { try { return points.length >= 2 ? curveLength(points, { closed: state.closed, tension: state.smooth ? 1 : 0 }) : 0; } catch { return 0; } }, [points, state.closed, state.smooth]);
  return <div className="creative-curve">
    <label>Profil<select value={state.profile} onChange={e => set({ profile: e.target.value as CurveProfile })} aria-label="Kurvenprofil">
      {(Object.keys(CURVE_PROFILE_LABEL) as CurveProfile[]).map(k => <option key={k} value={k}>{CURVE_PROFILE_LABEL[k]}</option>)}</select></label>
    <div className="sel-range">
      {state.profile === 'tube' ? <label>Radius<input type="number" min={0} max={16} value={state.radius} onChange={e => set({ radius: clampInt(e.target.value, 0, 16) })} aria-label="Kurvenradius" /></label>
        : <label>Breite<input type="number" min={1} max={33} value={state.width} onChange={e => set({ width: clampInt(e.target.value, 1, 33) })} aria-label="Kurvenbreite" /></label>}
      {state.profile === 'wall' && <label>Höhe<input type="number" min={1} max={128} value={state.height} onChange={e => set({ height: clampInt(e.target.value, 1, 128) })} aria-label="Kurvenhöhe" /></label>}
    </div>
    <label className="check"><input type="checkbox" checked={state.smooth} onChange={e => set({ smooth: e.target.checked })} /> weich (sonst gerade Abschnitte)</label>
    <label className="check"><input type="checkbox" checked={state.closed} onChange={e => set({ closed: e.target.checked })} /> geschlossen (Ring)</label>
    <p className="muted small" data-curve-points={points.length}>{points.length ? `${points.length} Punkte${length ? ` · ca. ${formatNumber(Math.round(length))} Blöcke lang` : ''}` : 'In die Ebene klicken, um Punkte zu setzen (Ebene wechseln für Steigungen).'}</p>
    <div className="button-grid">
      <button className="primary" disabled={points.length < 2} onClick={onFinish} title="Enter">Kurve setzen</button>
      <button disabled={!points.length} onClick={onUndoPoint} title="Rücktaste">Letzten Punkt weg</button>
      <button disabled={!points.length} onClick={onClear} title="Esc">Punkte verwerfen</button>
    </div>
  </div>;
}

// ------------------------------------------------------------------ nature & surface

export function NaturePanel({ draft, box, pattern, run, onMessage }: { draft: Draft; box: Box | null; pattern: Pattern; run: (e: Edit, ok?: string) => boolean; onMessage: (text: string) => void }) {
  const [iter, setIter] = useState(2);
  const [faces, setFaces] = useState(3);
  const [neigh, setNeigh] = useState(4);
  const [overMode, setOverMode] = useState<'above' | 'replace'>('above');
  const [depth, setDepth] = useState(1);
  const [onlyGrass, setOnlyGrass] = useState(false);
  const [skin, setSkin] = useState<SurfaceFaces>('all');
  const go = (make: (b: Box) => Edit) => { if (!box) return; try { const e = make(box); if (e.changes.length) run(e); else onMessage(`${e.label}: nichts zu ändern`); } catch (err) { onMessage(err instanceof Error ? err.message : String(err)); } };
  return <section className="panel-lite creative-nature" aria-label="Natur und Oberfläche">
    <span className="panel-kicker">NATUR &amp; OBERFLÄCHE</span>
    {!box ? <p className="muted">Wirkt in der Auswahl: zuerst einen Bereich auswählen (Höhe über „Y von/bis“).</p> : <>
      <div className="sel-range">
        <label>Durchgänge<input type="number" min={1} max={8} value={iter} onChange={e => setIter(clampInt(e.target.value, 1, 8))} aria-label="Durchgänge" /></label>
        <label>offene Seiten<input type="number" min={1} max={6} value={faces} onChange={e => setFaces(clampInt(e.target.value, 1, 6))} aria-label="Offene Seiten zum Abtragen" /></label>
      </div>
      <div className="button-grid">
        <button onClick={() => go(b => smoothEdit(draft, b, { iterations: iter }))} title="Höhen ausgleichen: Spitzen ab, Mulden auf; Gras bleibt oben">Glätten</button>
        <button onClick={() => go(b => erodeEdit(draft, b, { faces, iterations: iter }))} title="Blöcke mit vielen offenen Seiten entfernen: Kanten, Spitzen, Ruinen">Abtragen</button>
        <button onClick={() => go(b => dilateEdit(draft, b, { neighbours: neigh, iterations: iter }))} title="Lücken mit vielen Nachbarn mit dem umgebenden Block füllen">Aufbauen</button>
        <button onClick={() => go(b => naturalizeEdit(draft, b))} title="Natürlicher Boden: Gras oben, drei Lagen Erde, darunter Stein (Bauwerke bleiben)">Naturalisieren</button>
      </div>
      <label>Nachbarn zum Aufbauen<input type="number" min={1} max={6} value={neigh} onChange={e => setNeigh(clampInt(e.target.value, 1, 6))} aria-label="Nachbarn zum Aufbauen" /></label>
      <hr />
      <span className="muted small">Überziehen mit dem Pinsel bzw. Muster (Schnee, Moos, Kies …)</span>
      <div className="seg" role="group" aria-label="Überziehen">
        <button aria-pressed={overMode === 'above'} onClick={() => setOverMode('above')}>darauf legen</button>
        <button aria-pressed={overMode === 'replace'} onClick={() => setOverMode('replace')}>oberste Blöcke ersetzen</button>
      </div>
      <div className="sel-range">
        <label>Tiefe<input type="number" min={1} max={16} value={depth} onChange={e => setDepth(clampInt(e.target.value, 1, 16))} aria-label="Überzugstiefe" /></label>
        <label className="check"><input type="checkbox" checked={onlyGrass} onChange={e => setOnlyGrass(e.target.checked)} /> nur auf Gras</label>
      </div>
      <button onClick={() => go(b => overlayEdit(draft, b, pattern, { mode: overMode, depth, ...(onlyGrass && { onlyOn: ['minecraft:grass_block'] }) }, blockSchema))}>Überziehen</button>
      <hr />
      <label>Oberfläche bemalen<select value={skin} onChange={e => setSkin(e.target.value as SurfaceFaces)} aria-label="Sichtbare Seiten">
        {(Object.keys(SURFACE_FACES_LABEL) as SurfaceFaces[]).map(k => <option key={k} value={k}>{SURFACE_FACES_LABEL[k]}</option>)}</select></label>
      <button onClick={() => go(b => paintSurfaceEdit(draft, b, pattern, skin, blockSchema))} title="Nur sichtbare Blöcke bekommen den Pinsel bzw. das Muster; Innenwände bleiben">Sichtbare Blöcke bemalen</button>
    </>}
  </section>;
}

// ------------------------------------------------------------------ colours

const swatch = (c: ColorCandidate, face: 'side' | 'top' = 'side') => rgbToHex(face === 'top' ? c.top : c.side);

export function ColorPanel({ brush, onBrush, onGradient }: { brush: CellSlot; onBrush: (b: CellSlot) => void; onGradient: (stops: readonly CellSlot[]) => void }) {
  const [group, setGroup] = useState<ColorGroup>('alle');
  const [target, setTarget] = useState('minecraft:white_concrete');
  const [steps, setSteps] = useState(5);
  const list = useMemo(() => colorCandidates(group), [group]);
  const all = useMemo(() => colorCandidates('alle'), []);
  const from = brush?.kind === 'block' ? candidateFor(brush.state.id) : undefined;
  const similar = useMemo(() => from ? similarBlocks(from.side, all.filter(c => c.id !== from.id), 8) : [], [from, all]);
  const gradient = useMemo(() => {
    const to = candidateFor(target);
    if (!from || !to || from.id === to.id) return [];
    try { return colorGradient(from, to, steps, list.some(c => c.id === from.id) && list.some(c => c.id === to.id) ? list : [...list, from, to]); } catch { return []; }
  }, [from, target, steps, list]);
  return <section className="panel-lite creative-colors" aria-label="Farbpaletten">
    <span className="panel-kicker">FARBEN</span>
    {!from ? <p className="muted">Pinsel ist kein voller Block mit bekannter Farbe: einen Block wie Stein, Wolle oder Bretter wählen.</p> : <>
      <span className="muted small">Ähnliche Blöcke zu <b>{blockLabel(from.id)}</b> (Klick = Pinsel)</span>
      <div className="color-row" role="list" aria-label="Ähnliche Blöcke">
        {similar.map(s => <button key={s.candidate.id} role="listitem" className="color-chip" style={{ background: swatch(s.candidate) }} title={`${blockLabel(s.candidate.id)} · ΔE ${s.distance.toFixed(1)}`}
          aria-label={blockLabel(s.candidate.id)} onClick={() => onBrush(s.candidate.value ?? { kind: 'block', state: { id: s.candidate.id, properties: {} } })} />)}
      </div>
      <span className="muted small">Farbverlauf vom Pinsel zu …</span>
      <label>Zielblock<select value={target} onChange={e => setTarget(e.target.value)} aria-label="Zielblock des Farbverlaufs">
        {all.map(c => <option key={c.id} value={c.id}>{blockLabel(c.id)}</option>)}</select></label>
      <div className="sel-range">
        <label>Stufen<input type="number" min={2} max={12} value={steps} onChange={e => setSteps(clampInt(e.target.value, 2, 12))} aria-label="Stufen des Farbverlaufs" /></label>
        <label>Blöcke aus<select value={group} onChange={e => setGroup(e.target.value as ColorGroup)} aria-label="Blockgruppe">
          {(Object.keys(COLOR_GROUP_LABEL) as ColorGroup[]).map(g => <option key={g} value={g}>{COLOR_GROUP_LABEL[g]}</option>)}</select></label>
      </div>
      <div className="color-row gradient" aria-label="Farbverlauf" data-gradient={gradient.map(c => c.id).join(' ')}>
        {gradient.map(c => <span key={c.id} className="color-chip" style={{ background: swatch(c) }} title={blockLabel(c.id)} />)}
      </div>
      <button disabled={gradient.length < 2} onClick={() => onGradient(gradient.map(c => c.value ?? { kind: 'block', state: { id: c.id, properties: {} } }))}>Als Verlaufsmuster übernehmen</button>
    </>}
  </section>;
}

// ------------------------------------------------------------------ image

export function ImagePanel({ onClip, onMessage }: { onClip: (clip: Clipboard, label: string) => void; onMessage: (text: string) => void }) {
  const [width, setWidth] = useState(48);
  const [orientation, setOrientation] = useState<ImageOrientation>('wall-x');
  const [group, setGroup] = useState<ColorGroup>('wolle');
  const [dither, setDither] = useState(false);
  const [result, setResult] = useState<{ name: string; w: number; h: number; counts: { candidate: ColorCandidate; count: number }[]; error: number } | null>(null);
  const bitmap = useRef<{ name: string; draw: (w: number, h: number) => Uint8ClampedArray; aspect: number } | null>(null);
  const preview = useRef<HTMLCanvasElement>(null);

  const convert = (w = width, o = orientation, g = group, d = dither) => {
    const b = bitmap.current; if (!b) return;
    const W = Math.max(1, Math.min(MAX_IMAGE_SIDE, w)), H = Math.max(1, Math.min(MAX_IMAGE_SIDE, Math.round(W / b.aspect)));
    const data = b.draw(W, H);
    const r = imageToBlocks({ width: W, height: H, data }, colorCandidates(g), { orientation: o, origin: [0, 0, 0], dither: d });
    // Clipboard relative to the lower corner; the paste preview follows the pointer.
    const min = [Infinity, Infinity, Infinity];
    for (const c of r.edit.changes) for (let i = 0; i < 3; i++) min[i] = Math.min(min[i]!, c.position[i]!);
    const size: Vec3 = o === 'floor' ? [W, 1, H] : o === 'wall-x' ? [W, H, 1] : [1, H, W];
    const cells = r.edit.changes.filter(c => c.value).map(c => ({ offset: [c.position[0] - min[0]!, c.position[1] - min[1]!, c.position[2] - min[2]!] as Vec3, value: c.value! }));
    setResult({ name: b.name, w: W, h: H, counts: r.counts, error: r.meanError });
    // Preview: one pixel per block in the block colour.
    const cv = preview.current;
    if (cv) {
      cv.width = W; cv.height = H;
      const g2 = cv.getContext('2d');
      if (g2) {
        const img = g2.createImageData(W, H), face = o === 'floor' ? 'top' : 'side';
        for (const c of r.edit.changes) {
          const col = o === 'floor' ? c.position[0] : o === 'wall-x' ? c.position[0] : c.position[2];
          const row = o === 'floor' ? c.position[2] : H - 1 - c.position[1];
          const cand = c.value?.kind === 'block' ? candidateFor(c.value.state.id) : undefined;
          if (!cand) continue;
          const rgb = face === 'top' ? cand.top : cand.side, i = (row * W + col) * 4;
          img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
        }
        g2.putImageData(img, 0, 0);
      }
    }
    onClip({ size, cells }, `Bild „${b.name}“`);
  };

  const load = async (file: File) => {
    try {
      const bmp = await createImageBitmap(file);
      bitmap.current = {
        name: file.name, aspect: bmp.width / bmp.height,
        draw: (w, h) => {
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d', { willReadFrequently: true })!;
          g.imageSmoothingQuality = 'high'; g.drawImage(bmp, 0, 0, w, h);
          return g.getImageData(0, 0, w, h).data;
        },
      };
      convert();
    } catch (e) { onMessage(`Bild nicht lesbar: ${e instanceof Error ? e.message : String(e)}`); }
  };

  return <section className="panel-lite creative-image" aria-label="Bild zu Blöcken">
    <span className="panel-kicker">BILD → BLÖCKE</span>
    <label>Bilddatei<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Bilddatei" onChange={e => { const f = e.target.files?.[0]; if (f) void load(f); }} /></label>
    <div className="sel-range">
      <label>Breite<input type="number" min={1} max={MAX_IMAGE_SIDE} value={width} onChange={e => setWidth(clampInt(e.target.value, 1, MAX_IMAGE_SIDE))} aria-label="Bildbreite in Blöcken" /></label>
      <label>Blöcke aus<select value={group} onChange={e => setGroup(e.target.value as ColorGroup)} aria-label="Blockgruppe für das Bild">
        {(Object.keys(COLOR_GROUP_LABEL) as ColorGroup[]).map(g => <option key={g} value={g}>{COLOR_GROUP_LABEL[g]}</option>)}</select></label>
    </div>
    <label>Lage<select value={orientation} onChange={e => setOrientation(e.target.value as ImageOrientation)} aria-label="Lage des Bildes">
      {(Object.keys(IMAGE_ORIENTATION_LABEL) as ImageOrientation[]).map(k => <option key={k} value={k}>{IMAGE_ORIENTATION_LABEL[k]}</option>)}</select></label>
    <label className="check"><input type="checkbox" checked={dither} onChange={e => setDither(e.target.checked)} /> feine Abstufung (Fehlerverteilung)</label>
    <button disabled={!bitmap.current} onClick={() => convert()}>Neu umrechnen</button>
    <canvas ref={preview} className="image-preview" hidden={!result} aria-label="Vorschau des Blockbilds" />
    {result && <>
      <p className="muted small" data-image-blocks={result.counts.reduce((s, c) => s + c.count, 0)}>{result.w} × {result.h} Blöcke · {result.counts.length} Blockarten · mittlere Farbabweichung ΔE {result.error.toFixed(1)}. Liegt in der Zwischenablage: in die Ebene klicken zum Einfügen (R dreht).</p>
      <ul className="image-counts">{result.counts.slice(0, 8).map(c => <li key={c.candidate.id}><span className="color-chip" style={{ background: swatch(c.candidate, orientation === 'floor' ? 'top' : 'side') }} /> {blockLabel(c.candidate.id)} · {formatNumber(c.count)}</li>)}</ul>
    </>}
  </section>;
}
