import { useState } from 'react';
import {
  FACE_DIRECTION_LABEL, FACE_DIRECTION_VECTOR, MAGIC_MODE_LABEL, TORUS_AXIS_LABEL, boxBounds, boxRegion, cellAt, keyPos, extrudeEdit, fitBox, growRegion, regionBounds, resizeBox, shrinkRegion, stackEdit,
} from '../../../../packages/domain/src/index.js';
import type { Box, Draft, Edit, FaceDirection, MagicMode, Region, TorusAxis } from '../../../../packages/domain/src/index.js';
import type { Vec3 } from '../../../../packages/voxel/src/index.js';
import { formatNumber } from '../app/ui';
import type { GridBox } from './LayerGrid';

/**
 * Auswahl- und Formwerkzeuge aus Editor-Mods (EDIT-05): Zauberauswahl,
 * Auswahl anpassen, Stapeln, Extrudieren, Torus und Wendel. The panels only
 * hold their options; every change goes through `run` (one undo step).
 */
const clampInt = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Math.trunc(Number(v)) || min));
const DIRS = Object.keys(FACE_DIRECTION_LABEL) as FaceDirection[];

export interface MagicState { readonly mode: MagicMode; readonly plane: boolean; readonly diagonal: boolean }
export const INITIAL_MAGIC: MagicState = { mode: 'block', plane: false, diagonal: false };

export function MagicControls({ state, onChange, count }: { state: MagicState; onChange: (s: MagicState) => void; count: number | null }) {
  return <div className="region-tool" aria-label="Zauberauswahl">
    <label>Zusammenhängend<select value={state.mode} onChange={e => onChange({ ...state, mode: e.target.value as MagicMode })} aria-label="Zauberauswahl wählt">
      {(Object.keys(MAGIC_MODE_LABEL) as MagicMode[]).map(m => <option key={m} value={m}>{MAGIC_MODE_LABEL[m]}</option>)}</select></label>
    <label className="check"><input type="checkbox" checked={state.plane} onChange={e => onChange({ ...state, plane: e.target.checked })} /> nur diese Ebene</label>
    <label className="check"><input type="checkbox" checked={state.diagonal} onChange={e => onChange({ ...state, diagonal: e.target.checked })} /> auch über Kanten (Dächer, Treppenläufe)</label>
    <p className="muted small">Klick auf einen Block wählt alle zusammenhängenden passenden Blöcke. Shift+Klick fügt hinzu, Alt+Klick nimmt weg. Alle Auswahlknöpfe wirken dann nur auf diese Zellen.
      {count !== null && <> Aktuell: <b>{formatNumber(count)} Zellen</b>.</>}</p>
  </div>;
}

export interface TorusState { readonly minor: number; readonly axis: TorusAxis; readonly half: boolean }
export const INITIAL_TORUS: TorusState = { minor: 1, axis: 'y', half: false };
export function TorusControls({ state, onChange }: { state: TorusState; onChange: (s: TorusState) => void }) {
  return <>
    <label>Rohrradius<input type="number" min={1} max={32} value={state.minor} onChange={e => onChange({ ...state, minor: clampInt(e.target.value, 1, 32) })} aria-label="Rohrradius" /></label>
    <label>Lage<select value={state.axis} onChange={e => onChange({ ...state, axis: e.target.value as TorusAxis })} aria-label="Lage des Torus">
      {(Object.keys(TORUS_AXIS_LABEL) as TorusAxis[]).map(a => <option key={a} value={a}>{TORUS_AXIS_LABEL[a]}</option>)}</select></label>
    <label className="check"><input type="checkbox" checked={state.half} onChange={e => onChange({ ...state, half: e.target.checked })} /> nur obere Hälfte (Bogenring)</label>
    <p className="muted small">Vom Mittelpunkt aus aufziehen: der Abstand ist der Ringradius bis zur Rohrmitte.</p>
  </>;
}

export interface HelixState { readonly height: number; readonly width: number; readonly pitch: number; readonly clockwise: boolean; readonly thickness: number }
export const INITIAL_HELIX: HelixState = { height: 16, width: 2, pitch: 12, clockwise: true, thickness: 1 };
export function HelixControls({ state, onChange }: { state: HelixState; onChange: (s: HelixState) => void }) {
  return <>
    <div className="sel-range">
      <label>Höhe<input type="number" min={1} max={384} value={state.height} onChange={e => onChange({ ...state, height: clampInt(e.target.value, 1, 384) })} aria-label="Wendelhöhe" /></label>
      <label>Breite<input type="number" min={1} max={65} value={state.width} onChange={e => onChange({ ...state, width: clampInt(e.target.value, 1, 65) })} aria-label="Wendelbreite" /></label>
      <label>Steigung<input type="number" min={2} max={384} value={state.pitch} onChange={e => onChange({ ...state, pitch: clampInt(e.target.value, 2, 384) })} aria-label="Höhe je Umdrehung" /></label>
      <label>Stärke<input type="number" min={1} max={16} value={state.thickness} onChange={e => onChange({ ...state, thickness: clampInt(e.target.value, 1, 16) })} aria-label="Stärke unter der Stufe" /></label>
    </div>
    <div className="seg" role="group" aria-label="Drehsinn">
      <button aria-pressed={state.clockwise} onClick={() => onChange({ ...state, clockwise: true })}>im Uhrzeigersinn</button>
      <button aria-pressed={!state.clockwise} onClick={() => onChange({ ...state, clockwise: false })}>gegen</button>
    </div>
    <p className="muted small">Vom Mittelpunkt aus aufziehen (Abstand = Außenradius). Mit Treppen als Pinsel zeigen die Stufen bergauf. Steigung = Höhe je Umdrehung.</p>
  </>;
}

export interface RegionToolsProps {
  readonly draft: Draft;
  readonly box: Box;
  /** Cell selection (magic select), or null for the box. */
  readonly mask: Region | null;
  readonly run: (e: Edit, ok?: string) => boolean;
  readonly onMessage: (text: string) => void;
  readonly onBox: (b: GridBox) => void;
  readonly onMask: (m: Region | null) => void;
  readonly plane: boolean;
}

/** Selection panel part: adjust the selection, stack and extrude (EDIT-05). */
export function RegionTools({ draft, box, mask, run, onMessage, onBox, onMask, plane }: RegionToolsProps) {
  const [dir, setDir] = useState<FaceDirection>('east');
  const [count, setCount] = useState(3);
  const [gap, setGap] = useState(0);
  const [exDir, setExDir] = useState<FaceDirection>('up');
  const [dist, setDist] = useState(1);
  const fail = (e: unknown) => onMessage(e instanceof Error ? e.message : String(e));
  const region = (): Region => mask ?? boxRegion(draft, box);
  const toGrid = (b: { min: Vec3; maxExclusive: Vec3 }): GridBox => ({ min: b.min, maxExclusive: b.maxExclusive });
  const setRegion = (m: Region, what: string) => {
    const b = regionBounds(m);
    if (!b) { onMessage('Die Auswahl wäre leer.'); return; }
    onMask(m); onBox(toGrid(b)); onMessage(`${what}: ${formatNumber(m.size)} Zellen.`);
  };
  const size = (() => { const b = boxBounds(box); return [0, 1, 2].map(i => b.maxExclusive[i]! - b.min[i]!) as unknown as Vec3; })();
  const step = (): Vec3 => { const v = FACE_DIRECTION_VECTOR[dir], axis = v.findIndex(n => n !== 0); const len = size[axis]! + gap; return [v[0] * len, v[1] * len, v[2] * len]; };

  return <div className="region-tools">
    <div className="button-grid" role="group" aria-label="Auswahl anpassen">
      <button onClick={() => { try { if (mask) setRegion(growRegion(mask, { plane }), 'Auswahl gewachsen'); else { const b = resizeBox(box, 1); if (b) onBox(toGrid(boxBounds(b))); } } catch (e) { fail(e); } }}
        title="Auswahl um einen Block nach allen Seiten vergrößern">+1 wachsen</button>
      <button onClick={() => { if (mask) setRegion(shrinkRegion(mask, { plane }), 'Auswahl geschrumpft'); else { const b = resizeBox(box, -1); if (b) onBox(toGrid(boxBounds(b))); else onMessage('Die Auswahl ist zu klein zum Schrumpfen.'); } }}
        title="Randzellen der Auswahl abziehen">−1 schrumpfen</button>
      {!mask && <button onClick={() => { const b = fitBox(draft, box); if (b) { onBox(toGrid(boxBounds(b))); onMessage('Auswahl an den Inhalt angepasst.'); } else onMessage('In der Auswahl sind keine Blöcke.'); }}
        title="Auswahl auf den kleinsten Quader um die Blöcke darin verkleinern">An Inhalt anpassen</button>}
      {!mask && <button onClick={() => { try { const r = new Set([...boxRegion(draft, box)].filter(k => cellAt(draft, keyPos(k))?.kind === 'block')); setRegion(r, 'Nur Blöcke ausgewählt'); } catch (e) { fail(e); } }}
        title="Nur die Blöcke im Quader als Zellauswahl übernehmen (ohne Luft und leere Zellen)">Nur Blöcke</button>}
      {mask && <button onClick={() => { onMask(null); onMessage('Zellauswahl als Quader übernommen.'); }} title="Den umgebenden Quader auswählen">Als Quader</button>}
    </div>

    <fieldset className="region-group">
      <legend>Stapeln</legend>
      <div className="sel-range">
        <label>Richtung<select value={dir} onChange={e => setDir(e.target.value as FaceDirection)} aria-label="Stapelrichtung">
          {DIRS.map(d => <option key={d} value={d}>{FACE_DIRECTION_LABEL[d]}</option>)}</select></label>
        <label>Anzahl<input type="number" min={1} max={64} value={count} onChange={e => setCount(clampInt(e.target.value, 1, 64))} aria-label="Anzahl der Kopien" /></label>
        <label>Abstand<input type="number" min={0} max={64} value={gap} onChange={e => setGap(clampInt(e.target.value, 0, 64))} aria-label="Abstand zwischen den Kopien" /></label>
      </div>
      <button data-testid="stack" onClick={() => {
        try { const r = stackEdit(draft, region(), step(), count); run(r.edit, `${r.edit.label}: ${formatNumber(r.edit.changes.length)} Zellen nach ${FACE_DIRECTION_LABEL[dir]} (Versatz ${step().join(', ')})`); }
        catch (e) { fail(e); }
      }}>Stapeln ×{count}</button>
      <p className="muted small">Wiederholt die Auswahl lückenlos (Abstand 0) für Stockwerke, Fensterreihen, Arkaden. Ausstattung wird mitkopiert.</p>
    </fieldset>

    <fieldset className="region-group">
      <legend>Extrudieren</legend>
      <div className="sel-range">
        <label>Seite<select value={exDir} onChange={e => setExDir(e.target.value as FaceDirection)} aria-label="Seite zum Extrudieren">
          {DIRS.map(d => <option key={d} value={d}>{FACE_DIRECTION_LABEL[d]}</option>)}</select></label>
        <label>Weite<input type="number" min={1} max={64} value={dist} onChange={e => setDist(clampInt(e.target.value, 1, 64))} aria-label="Weite in Blöcken" /></label>
      </div>
      <div className="button-grid">
        <button data-testid="extrude-out" onClick={() => {
          try {
            const r = region(), e = extrudeEdit(draft, r, exDir, dist);
            if (!e.changes.length) { onMessage(`Zur Seite ${FACE_DIRECTION_LABEL[exDir]} ist keine freie Fläche.`); return; }
            if (run(e) && mask) setRegion(new Set([...mask, ...e.changes.map(c => c.position.join(','))]), e.label);
          } catch (e) { fail(e); }
        }} title="Sichtfläche dieser Seite um die Weite herausziehen (bis zum nächsten Block)">Herausziehen</button>
        <button data-testid="extrude-in" onClick={() => {
          try { const e = extrudeEdit(draft, region(), exDir, -dist); if (!e.changes.length) onMessage('Nichts zum Einschieben.'); else run(e); } catch (e) { fail(e); }
        }} title="Sichtfläche dieser Seite um die Weite in die Auswahl hineinschieben (Blöcke entfernen)">Einschieben</button>
      </div>
    </fieldset>
  </div>;
}
