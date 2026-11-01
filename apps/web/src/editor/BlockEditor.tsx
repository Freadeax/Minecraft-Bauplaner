import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BOX_SHAPE_LABEL, boxBounds, boxEdit, boxVolume, cellAt, copyBox, countMatches, cylinderEdit, defaultState, floodEdit, lineEdit, materializeDraft, moveBoxEdit, pasteEdit,
  replaceEdit, rotateCellEdit, setCells, sphereEdit, blockSchema, blockLabel, transformClipboard,
} from '../../../../packages/domain/src/index.js';
import type { Box, BoxShape, CellSlot, Clipboard, Edit, ReplaceQuery } from '../../../../packages/domain/src/index.js';
import type { BlockState, Cell, Vec3, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { formatNumber } from '../app/ui';
import { Viewer } from '../Viewer';
import type { Mark } from '../viewer/types';
import { BlockPalette, StateFields, brushColor, brushLabel, stateText } from './BlockPalette';
import { LayerGrid } from './LayerGrid';
import type { GridBox, Stroke } from './LayerGrid';
import { useDraft } from './useDraft';
import type { DraftModel } from './useDraft';

export type Tool = 'stift' | 'abbauen' | 'pipette' | 'fuellen' | 'drehen' | 'zustand' | 'auswahl' | 'linie' | 'quader' | 'zylinder' | 'kugel' | 'einfuegen';
const TOOLS: readonly (readonly [Tool, string, string, string])[] = [
  ['stift', '✎', 'Setzen', 'Pinsel auf Zellen malen (Ziehen malt mehrere, ein Rückgängig-Schritt je Strich)'],
  ['abbauen', '⌫', 'Abbauen', 'Zellen aus dem Modell entfernen'],
  ['pipette', '⊙', 'Pipette', 'Block samt Zustand als Pinsel übernehmen'],
  ['fuellen', '▧', 'Fläche füllen', 'Zusammenhängende gleiche Fläche dieser Ebene füllen (in Leerflächen nur innerhalb der Auswahl oder des Modells)'],
  ['drehen', '⟳', 'Drehen', 'Block um 90° im Uhrzeigersinn drehen (Treppen, Türen, Truhen …)'],
  ['zustand', 'ⓘ', 'Prüfen', 'Block auswählen, Zustand ansehen und ändern'],
  ['auswahl', '⬚', 'Auswahl', 'Bereich aufziehen (auch Shift+Ziehen mit jedem Werkzeug)'],
  ['linie', '╱', 'Linie', 'Gerade Linie ziehen'],
  ['quader', '▣', 'Quader', 'Quader, Hohlkörper, Wände oder Kanten aufziehen'],
  ['zylinder', '◍', 'Zylinder', 'Vom Mittelpunkt aus aufziehen; Höhe einstellbar'],
  ['kugel', '●', 'Kugel', 'Vom Mittelpunkt aus aufziehen; voll, hohl oder Kuppel'],
  ['einfuegen', '⎘', 'Einfügen', 'Zwischenablage an der geklickten Zelle einfügen (untere Ecke)'],
];
const PREVIEW_LIMIT = 30_000;

const toBox = (g: GridBox): Box => ({ a: g.min, b: [g.maxExclusive[0] - 1, g.maxExclusive[1] - 1, g.maxExclusive[2] - 1] });
const xyz = (p: Vec3) => `X ${p[0]} · Y ${p[1]} · Z ${p[2]}`;

export interface BlockEditorProps {
  readonly base: VoxelPayload | null;
  readonly profileId: string;
  /** Save controls, rendered in the editor's header bar. */
  readonly saveBar: (model: DraftModel) => ReactNode;
  /** Extra lines for the picked cell, e.g. owning instances in a project. */
  readonly inspectExtra?: (p: Vec3) => ReactNode;
  /** Initial layer; defaults to the lowest layer of the model. */
  readonly startY?: number;
}

/** Complete block editor: layer grid + 3D preview, all blocks, tools, selection operations and undo. */
export function BlockEditor({ base, profileId, saveBar, inspectExtra, startY }: BlockEditorProps) {
  const model = useDraft(base, profileId);
  const { draft, layers, extent } = model;
  const [tool, setTool] = useState<Tool>('stift');
  const [brush, setBrushRaw] = useState<CellSlot>(() => ({ kind: 'block', state: defaultState('minecraft:stone') }));
  const [y, setY] = useState(() => startY ?? extent?.min[1] ?? 0);
  const [selection, setSelection] = useState<GridBox | null>(null);
  const [shape, setShape] = useState<BoxShape>('fill');
  const [height, setHeight] = useState(1);
  const [hollow, setHollow] = useState(false);
  const [dome, setDome] = useState(false);
  const [clip, setClip] = useState<Clipboard | null>(null);
  const [picked, setPicked] = useState<Vec3 | null>(null);
  const [message, setMessage] = useState('');
  const [stroke, setStroke] = useState<{ start: Vec3; cells: Map<string, Vec3>; current: Vec3; selecting: boolean } | null>(null);
  // Pointer moves are continuous events: React may not have rendered the last move when the next move or the
  // button release arrives. The ref always holds the newest stroke, so no cell of a fast drag gets lost.
  const strokeRef = useRef<typeof stroke>(null);
  const setLiveStroke = (next: typeof stroke) => { strokeRef.current = next; setStroke(next); };
  const [show3d, setShow3d] = useState(true);
  const [replaceFrom, setReplaceFrom] = useState('');
  const [replaceScope, setReplaceScope] = useState<'all' | 'selection'>('all');
  const [keepProps, setKeepProps] = useState(true);

  const setBrush = (b: CellSlot) => { setBrushRaw(b); if (tool === 'abbauen' || tool === 'pipette' || tool === 'zustand') setTool('stift'); };
  const run = useCallback((edit: Edit, ok = '') => { const err = model.run(edit); setMessage(err === '' ? ok || `${edit.label}: ${formatNumber(edit.changes.length)} Zellen` : err); return err === ''; }, [model]);
  const toolValue = (t: Tool): CellSlot => t === 'abbauen' ? null : brush;

  // Shape being dragged → edit (preview and final).
  const shapeEdit = useCallback((s: NonNullable<typeof stroke>): Edit | null => {
    const v = toolValue(tool), a = s.start, b = s.current;
    const r = Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]));
    try {
      switch (tool) {
        case 'stift': case 'abbauen': return setCells(s.cells.values(), v, tool === 'abbauen' ? 'Abbauen' : 'Setzen');
        case 'linie': return lineEdit(a, b, v);
        case 'quader': return boxEdit({ a, b: [b[0], a[1] + height - 1, b[2]] }, shape, v);
        case 'zylinder': return cylinderEdit(a, r, height, v, { hollow });
        case 'kugel': return sphereEdit(a, r, v, { hollow, ...(dome && { half: 'upper' as const }) });
        default: return null;
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); return null; }
  }, [tool, brush, height, shape, hollow, dome]);

  const preview = useMemo(() => {
    if (!stroke) return [];
    if (stroke.selecting) return [];
    const e = shapeEdit(stroke);
    return e ? e.changes.slice(0, PREVIEW_LIMIT).map(c => c.position) : [];
  }, [stroke, shapeEdit]);

  const extentBox: Box | null = extent ? { a: extent.min, b: extent.max } : null;
  const onCell = (p: Vec3, from3d = false) => {
    switch (tool) {
      case 'pipette': { const v = cellAt(draft, p); if (v) { setBrushRaw(v.kind === 'block' ? { kind: 'block', state: v.state } : v); setTool('stift'); setMessage(`Pinsel: ${brushLabel(v)}`); } else setMessage('Leere Zelle'); return true; }
      case 'drehen': { const r = rotateCellEdit(draft, p, { quarterTurns: 1, mirrorX: false }); if (r.resolved) run(r.edit, 'Block gedreht'); else setMessage(r.message); return true; }
      case 'zustand': setPicked(p); return true;
      case 'fuellen': {
        const limit = selection ? toBox(selection) : extentBox;
        try { run(floodEdit(draft, p, brush, { plane: 'y', ...(limit && { limitBox: { a: [limit.a[0], p[1], limit.a[2]], b: [limit.b[0], p[1], limit.b[2]] } }) })); }
        catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
        return true;
      }
      case 'einfuegen': if (clip) run(pasteEdit(clip, p)); else setMessage('Zwischenablage ist leer: zuerst einen Bereich kopieren.'); return true;
      case 'abbauen': if (from3d) { run(setCells([p], null, 'Abbauen')); return true; } return false;
      default: return false;
    }
  };

  const onStroke = (s: Stroke) => {
    const selecting = tool === 'auswahl' || s.shift;
    if (s.phase === 'down') {
      if (!selecting && onCell(s.cell)) return;
      setLiveStroke({ start: s.cell, current: s.cell, cells: new Map([[s.cell.join(','), s.cell]]), selecting });
      if (selecting) setSelection(boxBounds({ a: s.cell, b: s.cell }));
      return;
    }
    const stroke = strokeRef.current;
    if (!stroke) return;
    const next = { ...stroke, current: s.cell };
    if (tool === 'stift' || tool === 'abbauen') { next.cells = new Map(stroke.cells); for (const p of lineEdit(stroke.current, s.cell, null).changes) next.cells.set(p.position.join(','), p.position); }
    if (stroke.selecting) {
      const keep = selection && stroke.start[1] >= selection.min[1] && stroke.start[1] < selection.maxExclusive[1] ? [selection.min[1], selection.maxExclusive[1] - 1] : [stroke.start[1], stroke.start[1]];
      setSelection(boxBounds({ a: [stroke.start[0], keep[0]!, stroke.start[2]], b: [s.cell[0], keep[1]!, s.cell[2]] }));
    }
    if (s.phase === 'move') { setLiveStroke(next); return; }
    setLiveStroke(null);
    if (stroke.selecting) return;
    const e = shapeEdit(next);
    if (e) run(e);
  };

  // Keyboard: layers and tools.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'PageUp' || e.key === ']') { e.preventDefault(); setY(v => v + 1); }
      else if (e.key === 'PageDown' || e.key === '[') { e.preventDefault(); setY(v => v - 1); }
      else if (e.key === 'Escape') { setSelection(null); strokeRef.current = null; setStroke(null); }
      else if (/^[1-9]$/.test(e.key)) { const t = TOOLS[Number(e.key) - 1]; if (t) setTool(t[0]); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  // Blocks of the model for "Im Modell" and replace.
  const used = useMemo(() => {
    const counts = new Map<string, { state: BlockState; count: number }>();
    for (const list of layers.values()) for (const c of list) if (c.value.kind === 'block') {
      const k = stateText(c.value.state), u = counts.get(k);
      if (u) u.count++; else counts.set(k, { state: c.value.state, count: 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || (stateText(a.state) < stateText(b.state) ? -1 : 1));
  }, [layers]);
  const usedIds = useMemo(() => {
    const m = new Map<string, number>(); for (const u of used) m.set(u.state.id, (m.get(u.state.id) ?? 0) + u.count);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [used]);

  // 3D preview of the current model.
  const payload = useMemo(() => { try { return materializeDraft(draft); } catch { return null; } }, [draft]);
  const markFor = useCallback((c: Cell): Mark | null => {
    if (c.kind === 'erase') return { color: '#d35f5f', amount: 0.6 };
    if (!selection) return null;
    const p = c.position, s = selection;
    return p.every((n, i) => n >= s.min[i]! && n < s.maxExclusive[i]!) ? { color: '#5be3b5', amount: 0.35 } : null;
  }, [selection]);
  const onSelect3d = useCallback((c: Cell | null) => { if (!c) return; setY(c.position[1]); setPicked(c.position); onCell(c.position, true); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, draft, brush, clip, selection]);

  const selBox = selection ? toBox(selection) : null;
  const selOp = (edit: Edit) => run(edit);
  const replaceQuery = (): ReplaceQuery | null => {
    if (!replaceFrom) return null;
    const from: ReplaceQuery['from'] = replaceFrom === 'air' ? 'air' : replaceFrom.includes('[') || used.some(u => stateText(u.state) === replaceFrom)
      ? { id: used.find(u => stateText(u.state) === replaceFrom)?.state.id ?? replaceFrom, properties: used.find(u => stateText(u.state) === replaceFrom)?.state.properties ?? {} }
      : { id: replaceFrom };
    return { from, to: brush, keepProperties: keepProps, ...(replaceScope === 'selection' && selBox && { box: selBox }) };
  };
  const rq = replaceQuery();
  const replaceCount = rq ? countMatches(draft, rq.from, rq.box) : 0;
  const transformSelection = (t: { quarterTurns: 0 | 1 | 2 | 3; mirrorX: boolean } | null, delta: Vec3 = [0, 0, 0]) => {
    if (!selBox) return;
    const r = moveBoxEdit(draft, selBox, delta, t ?? undefined);
    if (run(r.edit, r.unresolved.length ? `Ohne Drehregel unverändert: ${r.unresolved.join(', ')}` : '')) {
      const s = boxBounds(selBox), size = [s.maxExclusive[0] - s.min[0], s.maxExclusive[1] - s.min[1], s.maxExclusive[2] - s.min[2]];
      const turned = t && t.quarterTurns % 2 === 1 ? [size[2]!, size[1]!, size[0]!] : size;
      const off = [Math.floor((size[0]! - turned[0]!) / 2), 0, Math.floor((size[2]! - turned[2]!) / 2)];
      const min: Vec3 = [s.min[0] + delta[0] + off[0]!, s.min[1] + delta[1], s.min[2] + delta[2] + off[2]!];
      setSelection({ min, maxExclusive: [min[0] + turned[0]!, min[1] + turned[1]!, min[2] + turned[2]!] });
    }
  };

  const pickedValue = picked ? cellAt(draft, picked) : null;
  const yRange = extent ? `${extent.min[1]} … ${extent.max[1]}` : '–';
  const changes = model.summary.added + model.summary.removed + model.summary.changed;

  return <div className="block-editor">
    <div className="editor-bar" role="toolbar" aria-label="Bearbeitung">
      <button onClick={model.undo} disabled={!model.history.undo.length} title={model.history.undo.at(-1) ? `Rückgängig: ${model.history.undo.at(-1)!.label} (Strg+Z)` : 'Rückgängig (Strg+Z)'}>↶ Rückgängig</button>
      <button onClick={model.redo} disabled={!model.history.redo.length} title="Wiederholen (Strg+Y)">↷ Wiederholen</button>
      <span className="editor-stats" aria-live="polite" data-changes={changes}>
        {formatNumber(model.cellCount)} Zellen · Änderungen: <b>+{model.summary.added}</b> / <b>−{model.summary.removed}</b> / <b>~{model.summary.changed}</b>
      </span>
      <span className="spacer" />
      {saveBar(model)}
    </div>
    {message && <p className="editor-message" role="status">{message}</p>}
    <div className="editor-main">
      <aside className="editor-tools" aria-label="Werkzeuge">
        <div className="tool-grid" role="radiogroup" aria-label="Werkzeug">
          {TOOLS.map(([id, icon, label, hint], i) => <button key={id} role="radio" aria-checked={tool === id} title={`${hint} (${i + 1})`} onClick={() => setTool(id)}>
            <span aria-hidden="true">{icon}</span> {label}</button>)}
        </div>
        <div className="brush-now" title={brush?.kind === 'block' ? stateText(brush.state) : brushLabel(brush)}>
          <span className="swatch" style={{ background: brushColor(tool === 'abbauen' ? null : brush) }} aria-hidden="true" />
          <span><span className="panel-kicker">PINSEL</span><b>{tool === 'abbauen' ? 'Entfernen' : brushLabel(brush)}</b>
            {brush?.kind === 'block' && <small>{stateText(brush.state).replace('minecraft:', '')}</small>}</span>
        </div>
        {brush?.kind === 'block' && tool !== 'abbauen' && <StateFields state={brush.state} label="Pinsel-Zustand" onChange={s => setBrushRaw({ kind: 'block', state: s })} />}
        {(tool === 'quader') && <label>Form<select value={shape} onChange={e => setShape(e.target.value as BoxShape)}>
          {(Object.keys(BOX_SHAPE_LABEL) as BoxShape[]).map(s => <option key={s} value={s}>{BOX_SHAPE_LABEL[s]}</option>)}</select></label>}
        {(tool === 'quader' || tool === 'zylinder') && <label>Höhe ab Ebene<input type="number" min={1} max={384} value={height} onChange={e => setHeight(Math.max(1, Math.min(384, Number(e.target.value) || 1)))} /></label>}
        {(tool === 'zylinder' || tool === 'kugel') && <label className="check"><input type="checkbox" checked={hollow} onChange={e => setHollow(e.target.checked)} /> hohl</label>}
        {tool === 'kugel' && <label className="check"><input type="checkbox" checked={dome} onChange={e => setDome(e.target.checked)} /> nur obere Hälfte (Kuppel)</label>}
        {tool === 'einfuegen' && <p className="muted">{clip ? `Zwischenablage: ${clip.size.join(' × ')} · ${formatNumber(clip.cells.length)} Zellen` : 'Zwischenablage leer.'}</p>}
      </aside>

      <section className="editor-canvas" aria-label="Arbeitsfläche">
        <div className="layer-bar">
          <span className="panel-kicker">EBENE</span>
          <button onClick={() => setY(v => v - 1)} aria-label="Ebene tiefer" title="Ebene tiefer (Bild ↓ oder [)">▼</button>
          <label>Y<input type="number" value={y} onChange={e => setY(Math.trunc(Number(e.target.value) || 0))} aria-label="Ebene Y" /></label>
          <button onClick={() => setY(v => v + 1)} aria-label="Ebene höher" title="Ebene höher (Bild ↑ oder ])">▲</button>
          <span className="muted">Modell Y {yRange} · {formatNumber(layers.get(y)?.length ?? 0)} Zellen in dieser Ebene</span>
          <span className="spacer" />
          <label className="check"><input type="checkbox" checked={show3d} onChange={e => setShow3d(e.target.checked)} /> 3D-Vorschau</label>
        </div>
        <div className={`canvas-split${show3d ? ' with-3d' : ''}`}>
          <LayerGrid layers={layers} y={y} extent={extent} selection={selection} preview={preview} previewColor={brushColor(toolValue(tool))} picked={picked}
            onStroke={onStroke} onHover={() => {}} />
          {show3d && <div className="editor-3d">
            {payload ? <Viewer payload={payload} cells={payload.cells} onSelect={onSelect3d} markFor={markFor}
              focus={selection ? { min: selection.min, maxExclusive: selection.maxExclusive } : null} />
              : <div className="scene empty-3d"><p className="muted">Noch keine Blöcke. Wähle links einen Block und klicke in die Ebene.</p></div>}
            <p className="muted small">Klick in 3D wählt Ebene und Block; mit „Abbauen“, „Pipette“ oder „Drehen“ wirkt das Werkzeug direkt.</p>
          </div>}
        </div>
      </section>

      <aside className="editor-side" aria-label="Auswahl und Block">
        <section className="panel-lite" aria-label="Auswahl">
          <span className="panel-kicker">AUSWAHL</span>
          {selection && selBox ? <>
            <p><b>{(['X', 'Y', 'Z'] as const).map((a, i) => `${a} ${selection.min[i]}…${selection.maxExclusive[i]! - 1}`).join(' · ')}</b> · {formatNumber(boxVolume(selBox))} Zellen</p>
            <div className="sel-range">
              <label>Y von<input type="number" value={selection.min[1]} onChange={e => { const v = Math.trunc(Number(e.target.value)); setSelection(s => s && { min: [s.min[0], Math.min(v, s.maxExclusive[1] - 1), s.min[2]], maxExclusive: s.maxExclusive }); }} /></label>
              <label>bis<input type="number" value={selection.maxExclusive[1] - 1} onChange={e => { const v = Math.trunc(Number(e.target.value)); setSelection(s => s && { min: s.min, maxExclusive: [s.maxExclusive[0], Math.max(v, s.min[1]) + 1, s.maxExclusive[2]] }); }} /></label>
            </div>
            <div className="button-grid">
              {(Object.keys(BOX_SHAPE_LABEL) as BoxShape[]).map(s => <button key={s} onClick={() => selOp(boxEdit(selBox, s, brush))}>{BOX_SHAPE_LABEL[s]}</button>)}
              <button onClick={() => selOp({ ...boxEdit(selBox, 'fill', null), label: 'Auswahl leeren' })}>Leeren</button>
              <button onClick={() => selOp({ ...boxEdit(selBox, 'fill', { kind: 'air' }), label: 'Mit Luft füllen' })} title="Explizite Luft räumt beim Einfügen im Spiel frei">Luft setzen</button>
            </div>
            <div className="button-grid">
              <button onClick={() => { const c = copyBox(draft, selBox); setClip(c); setMessage(`Kopiert: ${formatNumber(c.cells.length)} Zellen`); }}>Kopieren</button>
              <button onClick={() => { const c = copyBox(draft, selBox); setClip(c); run({ ...boxEdit(selBox, 'fill', null), label: 'Ausschneiden' }); }}>Ausschneiden</button>
              <button disabled={!clip} onClick={() => clip && run(pasteEdit(clip, selection.min))}>Einfügen hier</button>
              <button disabled={!clip} onClick={() => clip && setClip(transformClipboard(clip, { quarterTurns: 1, mirrorX: false }).clip)} title="Zwischenablage drehen">Ablage ⟳</button>
              <button onClick={() => transformSelection({ quarterTurns: 1, mirrorX: false })}>Drehen 90°</button>
              <button onClick={() => transformSelection({ quarterTurns: 0, mirrorX: true })}>Spiegeln X</button>
            </div>
            <div className="move-pad" role="group" aria-label="Auswahl verschieben">
              <span className="muted">Verschieben</span>
              <button onClick={() => transformSelection(null, [0, 0, -1])} aria-label="nach Norden">N</button>
              <button onClick={() => transformSelection(null, [0, 0, 1])} aria-label="nach Süden">S</button>
              <button onClick={() => transformSelection(null, [-1, 0, 0])} aria-label="nach Westen">W</button>
              <button onClick={() => transformSelection(null, [1, 0, 0])} aria-label="nach Osten">O</button>
              <button onClick={() => transformSelection(null, [0, 1, 0])} aria-label="nach oben">↑</button>
              <button onClick={() => transformSelection(null, [0, -1, 0])} aria-label="nach unten">↓</button>
            </div>
            <button className="link" onClick={() => setSelection(null)}>Auswahl aufheben (Esc)</button>
          </> : <p className="muted">Mit „Auswahl“ oder Shift+Ziehen einen Bereich aufziehen. Höhe danach über „Y von/bis“.</p>}
        </section>

        <section className="panel-lite" aria-label="Ersetzen">
          <span className="panel-kicker">ERSETZEN</span>
          <label>Suchen<select value={replaceFrom} onChange={e => setReplaceFrom(e.target.value)} aria-label="Zu ersetzender Block">
            <option value="">– Block aus dem Modell wählen –</option>
            <optgroup label="Alle Zustände eines Blocks">{usedIds.map(([id, n]) => <option key={id} value={id}>{blockLabel(id)} ({formatNumber(n)})</option>)}</optgroup>
            <optgroup label="Genau dieser Zustand">{used.slice(0, 200).map(u => <option key={stateText(u.state)} value={stateText(u.state)}>{stateText(u.state).replace('minecraft:', '')} ({formatNumber(u.count)})</option>)}</optgroup>
            <option value="air">explizite Luft</option>
          </select></label>
          <p className="muted">durch Pinsel: <b>{brushLabel(brush)}</b></p>
          <label className="check"><input type="checkbox" checked={keepProps} onChange={e => setKeepProps(e.target.checked)} /> Ausrichtung/Zustand übernehmen, wo möglich</label>
          <div className="seg" role="group" aria-label="Bereich"><button aria-pressed={replaceScope === 'all'} onClick={() => setReplaceScope('all')}>Ganzes Modell</button>
            <button aria-pressed={replaceScope === 'selection'} disabled={!selection} onClick={() => setReplaceScope('selection')}>Nur Auswahl</button></div>
          <button className="primary" disabled={!rq || !replaceCount} onClick={() => rq && run(replaceEdit(draft, rq, blockSchema))}>{formatNumber(replaceCount)} Zellen ersetzen</button>
        </section>

        <section className="panel-lite" aria-label="Gewählter Block">
          <span className="panel-kicker">GEWÄHLTER BLOCK</span>
          {picked ? <>
            <p><b>{xyz(picked)}</b> · {pickedValue ? brushLabel(pickedValue) : 'leer'}</p>
            {pickedValue?.kind === 'block' && <>
              <p className="muted small">{stateText(pickedValue.state)}</p>
              <StateFields state={pickedValue.state} label="Zustand dieses Blocks"
                onChange={s => run(setCells([picked], pickedValue.entity ? { kind: 'block', state: s, entity: pickedValue.entity } : { kind: 'block', state: s }, 'Zustand geändert'), 'Zustand geändert')} />
              <div className="button-grid">
                <button onClick={() => { const r = rotateCellEdit(draft, picked, { quarterTurns: 1, mirrorX: false }); if (r.resolved) run(r.edit, 'Gedreht'); else setMessage(r.message); }}>Drehen ⟳</button>
                <button onClick={() => { const r = rotateCellEdit(draft, picked, { quarterTurns: 0, mirrorX: true }); if (r.resolved) run(r.edit, 'Gespiegelt'); else setMessage(r.message); }}>Spiegeln</button>
                <button onClick={() => setBrushRaw({ kind: 'block', state: pickedValue.state })}>Als Pinsel</button>
              </div>
            </>}
            <div className="neighbour-pad" role="group" aria-label="Pinsel daneben setzen">
              <span className="muted">Pinsel daneben setzen</span>
              {([['↑ oben', [0, 1, 0]], ['↓ unten', [0, -1, 0]], ['N', [0, 0, -1]], ['S', [0, 0, 1]], ['W', [-1, 0, 0]], ['O', [1, 0, 0]]] as const).map(([l, d]) =>
                <button key={l} onClick={() => { const p: Vec3 = [picked[0] + d[0], picked[1] + d[1], picked[2] + d[2]]; if (run(setCells([p], brush, 'Setzen'))) { setPicked(p); setY(p[1]); } }}>{l}</button>)}
            </div>
            {pickedValue && <button onClick={() => run(setCells([picked], null, 'Abbauen'))}>Diesen Block entfernen</button>}
            {inspectExtra?.(picked)}
          </> : <p className="muted">Mit „Prüfen“ oder per Klick in der 3D-Ansicht einen Block wählen.</p>}
        </section>
      </aside>
    </div>
    <BlockPalette brush={brush} onBrush={setBrush} used={used} />
    <p className="muted small">Tasten: 1–9 Werkzeuge · Bild↑/Bild↓ oder [ ] Ebene · Strg+Z/Strg+Y · Esc Auswahl aufheben · Rechtsklick/Leertaste+Ziehen verschiebt die Ebene · Strg+Mausrad zoomt.
      Gespeicherte Versionen bleiben unverändert; Speichern legt eine neue Version an.</p>
  </div>;
}
