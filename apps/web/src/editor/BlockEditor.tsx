import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import {
  ARCH_STYLE_LABEL, BOX_SHAPE_LABEL, PATTERN_KIND_LABEL, archEdit, boxBounds, boxEdit, boxVolume, cellAt, coneEdit, copyBox, countMatches, cylinderEdit, defaultState, floodEdit, lineEdit, materializeDraft,
  curveEdit, moveBoxEdit, paintEdit, pasteEdit, symmetricEdit, symmetryActive, pyramidEdit, replaceEdit, replacePatternEdit, rotateCellEdit, setCells, sphereEdit, blockSchema, blockLabel, transformClipboard, wallLineEdit,
  checkPlacement, settleEdit,
  clearBoxEdit, clearRegionEdit, clipEdit, copyRegion, ellipsoidEdit, helixEdit, magicSelect, moveRegionEdit, posKey, regionBounds, torusEdit, MAGIC_MODE_LABEL,
} from '../../../../packages/domain/src/index.js';
import type { ArchStyle, Box, BoxShape, CellSlot, Clipboard, Draft, Edit, Region, ReplaceQuery } from '../../../../packages/domain/src/index.js';
import type { BlockState, Cell, Vec3, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { formatNumber } from '../app/ui';
import { useLeaveGuard } from '../app/router';
import { SizeNotice } from '../app/SizeNotice';
import { Viewer } from '../Viewer';
import { LayoutButtons, useWorkspaceLayout } from '../app/workspaceLayout';
import type { BuildHandler, DragHandler, Mark, PickHit, PointerMods, PreviewCells } from '../viewer/types';
import { ContentEditor } from './ContentEditor';
import { BlockPalette, StateFields, brushColor, brushLabel, stateText } from './BlockPalette';
import { LayerGrid } from './LayerGrid';
import { INITIAL_PATTERN, PatternPanel, patternActive, toPattern } from './PatternPanel';
import type { PatternState } from './PatternPanel';
import { StencilPanel } from './StencilPanel';
import { ColorPanel, CurveControls, INITIAL_CURVE, INITIAL_SYMMETRY, ImagePanel, NaturePanel, SymmetryControls, toSymmetry } from './CreativePanel';
import type { CurveState, SymmetryState } from './CreativePanel';
import { fromPattern } from './PatternPanel';
import type { GridBox, Stroke } from './LayerGrid';
import { useDraft } from './useDraft';
import { EntityPanel } from './EntityPanel';
import type { DraftModel } from './useDraft';
import { HelixControls, INITIAL_HELIX, INITIAL_MAGIC, INITIAL_TORUS, MagicControls, RegionTools, TorusControls } from './RegionPanel';
import { More } from '../app/More';
import type { HelixState, MagicState, TorusState } from './RegionPanel';

export type Tool = 'stift' | 'abbauen' | 'pipette' | 'fuellen' | 'drehen' | 'zustand' | 'auswahl' | 'linie' | 'quader' | 'zylinder' | 'kugel' | 'einfuegen' | 'bogen' | 'pyramide' | 'kegel' | 'kurve'
  | 'zauberstab' | 'ellipsoid' | 'torus' | 'wendel';
/** Tool, icon, label, hint, letter key (EDIT-03). Digits 1–9 select the first nine tools. */
const TOOLS: readonly (readonly [Tool, string, string, string, string])[] = [
  ['stift', '✎', 'Setzen', 'Pinsel auf Zellen malen (Ziehen malt mehrere, ein Rückgängig-Schritt je Strich)', 'B'],
  ['abbauen', '⌫', 'Abbauen', 'Zellen aus dem Modell entfernen', 'E'],
  ['pipette', '⊙', 'Pipette', 'Block samt Zustand als Pinsel übernehmen', 'I'],
  ['fuellen', '▧', 'Fläche füllen', 'Zusammenhängende gleiche Fläche dieser Ebene füllen (in Leerflächen nur innerhalb der Auswahl oder des Modells)', 'F'],
  ['drehen', '⟳', 'Drehen', 'Block um 90° im Uhrzeigersinn drehen (Treppen, Türen, Truhen …)', 'D'],
  ['zustand', 'ⓘ', 'Prüfen', 'Block auswählen, Zustand ansehen und ändern', 'P'],
  ['auswahl', '⬚', 'Auswahl', 'Bereich aufziehen (auch Shift+Ziehen mit jedem Werkzeug)', 'A'],
  ['linie', '╱', 'Linie', 'Gerade Linie ziehen; mit Höhe/Stärke als Mauerzug (auch schräg)', 'L'],
  ['quader', '▣', 'Quader', 'Quader, Hohlkörper, Wände oder Kanten aufziehen', 'Q'],
  ['zylinder', '◍', 'Zylinder', 'Vom Mittelpunkt aus aufziehen; Höhe einstellbar', 'Z'],
  ['kugel', '●', 'Kugel', 'Vom Mittelpunkt aus aufziehen; voll, hohl oder Kuppel', 'K'],
  ['bogen', '⌒', 'Bogen', 'Von Fußpunkt zu Fußpunkt ziehen: Rund-, Spitz- oder Flachbogen, auch als Wand mit Öffnung', 'O'],
  ['pyramide', '▲', 'Pyramide', 'Grundfläche aufziehen: Stufenpyramide, auf Rechtecken ein Walmdach', 'Y'],
  ['kegel', '⏶', 'Kegel', 'Vom Mittelpunkt aus aufziehen: Kegeldach für runde Türme', 'C'],
  ['einfuegen', '⎘', 'Einfügen', 'Zwischenablage oder Schablone an der geklickten Zelle einfügen (untere Ecke); R dreht', 'V'],
  ['kurve', '∿', 'Kurve', 'Punkte klicken, Enter setzt eine weiche Kurve: Weg, Mauer oder Rohr (EDIT-04)', 'U'],
  ['zauberstab', '✦', 'Zauberstab', 'Zusammenhängende gleiche Blöcke auswählen (Shift+Klick fügt hinzu, Alt+Klick nimmt weg)', 'W'],
  ['ellipsoid', '⬭', 'Ellipsoid', 'Grundfläche aufziehen, Höhe einstellen: Ei, Zwiebelkuppel, flacher Hügel', 'J'],
  ['torus', '◎', 'Torus', 'Vom Mittelpunkt aus aufziehen: Ring liegend oder stehend (Brunnenrand, Rundfenster)', 'T'],
  ['wendel', '🌀', 'Wendel', 'Vom Mittelpunkt aus aufziehen: Wendeltreppe oder Spiralrampe für Türme', 'H'],
];
const BRUSH_TOOLS: ReadonlySet<Tool> = new Set(['stift', 'fuellen', 'linie', 'quader', 'zylinder', 'kugel', 'bogen', 'pyramide', 'kegel', 'kurve', 'ellipsoid', 'torus', 'wendel']);
/** Tools that build by pressing and dragging on block faces in the 3D view (EDIT-06); the others act on a click. */
const GESTURE_TOOLS: ReadonlySet<Tool> = new Set(['stift', 'abbauen', 'auswahl', 'linie', 'quader', 'zylinder', 'kugel', 'bogen', 'pyramide', 'kegel', 'ellipsoid', 'torus', 'wendel']);
/** Tools whose cells start in front of the clicked face (on top of a floor, next to a wall). */
const FACE_TOOLS: ReadonlySet<Tool> = new Set([...GESTURE_TOOLS, 'einfuegen', 'kurve'].filter(t => t !== 'abbauen' && t !== 'auswahl') as Tool[]);
const BUILD3D_KEY = 'bauplaner.werkstatt.bauen3d.v1';
const readBuild3d = () => { try { return localStorage.getItem(BUILD3D_KEY) !== 'off'; } catch { return true; } };
/** Shortcut list for the help panel (also the documentation of the keys). */
const SHORTCUTS: readonly (readonly [string, string])[] = [
  ['1–9 · Buchstabe im Werkzeug', 'Werkzeug wählen (B Setzen, E Abbauen, I Pipette, F Füllen, L Linie, Q Quader, K Kugel, O Bogen …)'],
  ['Bild↑ / Bild↓ · ] / [', 'Ebene höher / tiefer'],
  ['Strg+Z · Strg+Y', 'Rückgängig · Wiederholen'],
  ['Strg+C · Strg+X · Strg+V', 'Auswahl kopieren · ausschneiden · Einfügen-Werkzeug mit der Zwischenablage'],
  ['Strg+A', 'ganzes Modell auswählen'],
  ['Entf', 'Auswahl leeren'],
  ['Pfeiltasten · Shift+↑/↓', 'Auswahl samt Inhalt verschieben (Norden/Süden/Westen/Osten · oben/unten)'],
  ['R · M', 'Zwischenablage (beim Einfügen) oder Auswahl drehen · spiegeln'],
  ['G', '3D nur bis zur aktuellen Ebene (Schnitt) an/aus'],
  ['3D: Klick · Ziehen auf Blöcken', 'Im 3D bauen: Setzen auf die angeklickte Fläche, Abbauen, Formen und Auswahl aufziehen (Wand an Seitenflächen)'],
  ['3D: Rechte Maustaste · Mitte · Ziehen ins Leere', 'Im 3D bauen: drehen · verschieben · drehen'],
  ['3D: Auswahl-Werkzeug, Auswahl ziehen', 'Ausgewählte Gruppe samt Inhalt im 3D-Bild verschieben'],
  ['U · Enter · Rücktaste', 'Kurve: Punkte klicken · Kurve setzen · letzten Punkt entfernen'],
  ['W · Shift+Klick · Alt+Klick', 'Zauberstab (Zauberauswahl) · hinzufügen · wegnehmen'],
  ['J · T · H', 'Ellipsoid · Torus · Wendel(treppe)'],
  ['Esc', 'Auswahl aufheben, Ziehen abbrechen'],
  ['Shift+Ziehen', 'mit jedem Werkzeug einen Bereich auswählen'],
  ['Rechtsklick/Leertaste+Ziehen · Strg+Mausrad', 'Ebene verschieben · zoomen'],
  ['?', 'diese Übersicht'],
];
const PREVIEW_LIMIT = 30_000;

const clampInt = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Math.trunc(Number(v)) || min));
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
  /** Offer the „Ausstattung“ panel (paintings, frames, armor stands); only where saving keeps free entities. */
  readonly entityTools?: boolean;
}

/** Complete block editor: layer grid + 3D preview, all blocks, tools, selection operations and undo. */
type UsedCounts = Map<string, { state: BlockState; count: number }>;
const baseUsage = new WeakMap<object, UsedCounts>();
function countValue(counts: UsedCounts, v: CellSlot | undefined, delta: number, texts: Map<BlockState, string>): void {
  if (!v || v.kind !== 'block') return;
  let k = texts.get(v.state);
  if (k === undefined) { k = stateText(v.state); texts.set(v.state, k); }
  const u = counts.get(k);
  if (u) u.count += delta; else if (delta > 0) counts.set(k, { state: v.state, count: delta });
}
/** Blocks of the model with counts: base counted once per base, edits adjust it (SIZE-01). */
function usedBlocks(draft: Draft): { state: BlockState; count: number }[] {
  const texts = new Map<BlockState, string>();
  let base = baseUsage.get(draft.baseCells);
  if (!base) { base = new Map(); for (const v of draft.baseCells.values()) countValue(base, v, 1, texts); baseUsage.set(draft.baseCells, base); }
  const counts: UsedCounts = new Map([...base].map(([k, u]) => [k, { ...u }]));
  for (const [k, v] of draft.overlay) { countValue(counts, draft.baseCells.get(k), -1, texts); countValue(counts, v, 1, texts); }
  return [...counts.values()].filter(u => u.count > 0).sort((a, b) => b.count - a.count || (stateText(a.state) < stateText(b.state) ? -1 : 1));
}

/** One line for the editor message: what the game will do with this model. */
function placementSummary(r: ReturnType<typeof checkPlacement>): string {
  const parts = [r.counts.unsupported && `${r.counts.unsupported} ohne Halt`, r.counts.falls && `${r.counts.falls} fallen herunter`, r.counts.connection && `${r.counts.connection} Verbindungen anders als im Spiel`,
    r.counts.half && `${r.counts.half} halbe Türen/Betten/Pflanzen`, r.counts['invalid-state'] && `${r.counts['invalid-state']} ungültige Zustände`].filter(Boolean);
  const first = r.issues[0];
  return parts.length ? `Spielprüfung: ${parts.join(', ')}.${first ? ` Zum Beispiel X ${first.position[0]} Y ${first.position[1]} Z ${first.position[2]}: ${first.note}` : ''}${r.dependsOnSurroundings ? ` ${r.dependsOnSurroundings} Blöcke hängen von der Umgebung ab.` : ''}`
    : `Spielprüfung bestanden: ${formatNumber(r.blocks)} Blöcke halten und verbinden sich wie geplant${r.dependsOnSurroundings ? ` (${r.dependsOnSurroundings} brauchen Halt aus der Umgebung)` : ''}.`;
}

export function BlockEditor({ base, profileId, saveBar, inspectExtra, startY, entityTools = false }: BlockEditorProps) {
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
  const [stroke, setStroke] = useState<{ start: Vec3; cells: Map<string, Vec3>; current: Vec3; selecting: boolean; from3d?: boolean } | null>(null);
  // Pointer moves are continuous events: React may not have rendered the last move when the next move or the
  // button release arrives. The ref always holds the newest stroke, so no cell of a fast drag gets lost.
  const strokeRef = useRef<typeof stroke>(null);
  const setLiveStroke = (next: typeof stroke) => { strokeRef.current = next; setStroke(next); };
  const [show3d, setShow3d] = useState(true);
  /** EDIT-06: build directly on block faces in the 3D view (remembered per browser). */
  const [build3d, setBuild3dRaw] = useState(readBuild3d);
  const setBuild3d = (on: boolean) => { setBuild3dRaw(on); try { localStorage.setItem(BUILD3D_KEY, on ? 'on' : 'off'); } catch { /* private mode */ } };
  const [hover3d, setHover3d] = useState<PickHit | null>(null);
  const [moveDelta, setMoveDelta] = useState<Vec3 | null>(null);
  const [cut3d, setCut3d] = useState(false);
  const [pattern, setPattern] = useState<PatternState>(INITIAL_PATTERN);
  const [arch, setArch] = useState<{ style: ArchStyle; rise: number; thickness: number; depth: number; legs: number; wall: boolean }>({ style: 'round', rise: 4, thickness: 1, depth: 1, legs: 2, wall: false });
  const [line, setLine] = useState({ height: 1, thickness: 1 });
  const [pyramid, setPyramid] = useState({ step: 1, maxHeight: 0 });
  const [coneHeight, setConeHeight] = useState(6);
  const [hover, setHover] = useState<Vec3 | null>(null);
  const [help, setHelp] = useState(false);
  const layout = useWorkspaceLayout('werkstatt');
  const [replaceFrom, setReplaceFrom] = useState('');
  const [replaceScope, setReplaceScope] = useState<'all' | 'selection'>('all');
  const [keepProps, setKeepProps] = useState(true);
  const [symState, setSymState] = useState<SymmetryState>(INITIAL_SYMMETRY);
  const [curve, setCurve] = useState<CurveState>(INITIAL_CURVE);
  const [curvePts, setCurvePts] = useState<readonly Vec3[]>([]);
  // EDIT-05: cell selection (magic select) inside the selection box, and the options of the new tools.
  const [mask, setMask] = useState<Region | null>(null);
  const [magic, setMagic] = useState<MagicState>(INITIAL_MAGIC);
  const [torus, setTorus] = useState<TorusState>(INITIAL_TORUS);
  const [helix, setHelix] = useState<HelixState>(INITIAL_HELIX);
  const walkRef = useRef(true);
  /** A box chosen by the user replaces a cell selection. */
  const selectBox = (b: GridBox | null) => { setMask(null); setSelection(b); };
  const entityOpt = entityTools ? { entities: draft.entities ?? [] } : {};

  const setBrush = (b: CellSlot) => { setBrushRaw(b); if (tool === 'abbauen' || tool === 'pipette' || tool === 'zustand') setTool('stift'); };
  const run = useCallback((input: Edit, ok = '') => {
    // Without the „Ausstattung“ tools the caller cannot save free entities (project tab „Blöcke“): moving,
    // clearing or stacking blocks must not pretend to move paintings and armor stands with them.
    let edit = input, kept = '';
    if (!entityTools && input.entities) { const { entities: _e, ...rest } = input; edit = rest; if (input.changes.length) kept = ' Gemälde, Rahmen und Rüstungsständer bleiben hier an ihrem Platz (in der Werkstatt mitbewegen).'; }
    if (!edit.changes.length && !edit.entities) { setMessage('Keine Änderung'); return false; }
    const err = model.run(edit); setMessage(err === '' ? `${ok || `${edit.label}: ${formatNumber(edit.changes.length)} Zellen`}${kept && (input.entities?.length || draft.entities?.length) ? kept : ''}` : err); return err === '';
  }, [model, entityTools, draft]);
  /**
   * Building an edit can throw (size limit of one edit, invalid region): show the reason instead of
   * losing the click silently in the console.
   */
  const guarded = <A extends unknown[]>(f: (...a: A) => unknown) => (...a: A): void => {
    try { f(...a); } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
  };
  const toolValue = (t: Tool): CellSlot => t === 'abbauen' ? null : brush;
  const usePattern = patternActive(pattern);
  const activePattern = useMemo(() => toPattern(pattern, brush), [pattern, brush]);
  /** Applies the pattern to brush edits (painting, shapes, fills); removals and other tools stay as they are. */
  const paint = useCallback((e: Edit): Edit => usePattern ? paintEdit(e, activePattern) : e, [usePattern, activePattern]);
  // Symmetry (EDIT-04): copies brush edits to all symmetric positions with turned block states.
  const symmetry = useMemo(() => toSymmetry(symState), [symState]);
  const symOn = symmetryActive(symmetry);
  const unresolvedRef = useRef<readonly string[]>([]);
  const sym = useCallback((e: Edit): Edit => {
    if (!symOn) { unresolvedRef.current = []; return e; }
    const r = symmetricEdit(e, symmetry); unresolvedRef.current = r.unresolved; return r.edit;
  }, [symOn, symmetry]);
  const symNote = () => unresolvedRef.current.length ? `Ohne Drehregel ungedreht übernommen: ${unresolvedRef.current.join(', ')}` : '';
  const curveOptions = { profile: curve.profile, radius: curve.radius, width: curve.width, height: curve.height, closed: curve.closed, tension: curve.smooth ? 1 : 0 };
  const finishCurve = () => {
    if (curvePts.length < 2) { setMessage('Eine Kurve braucht mindestens zwei Punkte.'); return; }
    try { if (run(sym(paint(curveEdit(curvePts, brush, curveOptions))), symNote())) setCurvePts([]); }
    catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
  };

  // Shape being dragged → edit (preview and final).
  const shapeEdit = useCallback((s: NonNullable<typeof stroke>, final = true): Edit | null => {
    const v = toolValue(tool), a = s.start, b = s.current;
    const r = Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]));
    const raw = (): Edit | null => {
      switch (tool) {
        case 'stift': case 'abbauen': return setCells(s.cells.values(), v, tool === 'abbauen' ? 'Abbauen' : 'Setzen');
        case 'linie': return line.height > 1 || line.thickness > 1 ? wallLineEdit(a, b, line.height, v, { thickness: line.thickness }) : lineEdit(a, b, v);
        // Dragged along a side face in 3D: the box spans the drag (a wall); otherwise the height setting counts.
        case 'quader': return boxEdit({ a, b: s.from3d && b[1] !== a[1] ? b : [b[0], a[1] + height - 1, b[2]] }, shape, v);
        case 'zylinder': return cylinderEdit(a, r, height, v, { hollow });
        case 'kugel': return sphereEdit(a, r, v, { hollow, ...(dome && { half: 'upper' as const }) });
        case 'bogen': return archEdit(a, b, v, arch);
        case 'pyramide': return pyramidEdit(a, b, v, { hollow, step: pyramid.step, maxHeight: pyramid.maxHeight });
        case 'kegel': return coneEdit(a, r, coneHeight, v, { hollow });
        case 'ellipsoid': return ellipsoidEdit({ a, b: s.from3d && b[1] !== a[1] ? b : [b[0], a[1] + height - 1, b[2]] }, v, { hollow, dome });
        case 'torus': return torusEdit(a, r, torus.minor, v, { axis: torus.axis, hollow, half: torus.half });
        case 'wendel': { const h = helixEdit(a, r, v, helix); walkRef.current = h.walkable; return h; }
        default: return null;
      }
    };
    try { const e = raw(), painted = e && tool !== 'abbauen' ? paint(e) : e; return painted && sym(painted); }
    // While dragging an unfinished shape (e.g. an arch narrower than 3) only the release reports the reason.
    catch (e) { if (final) setMessage(e instanceof Error ? e.message : String(e)); return null; }
  }, [tool, brush, height, shape, hollow, dome, arch, line, pyramid, coneHeight, paint, sym, torus, helix]);

  const previewEdit = useMemo((): Edit | null => {
    if (stroke) return stroke.selecting ? null : shapeEdit(stroke, false);
    // Paste preview: the clipboard (or stencil) follows the pointer.
    if (tool === 'einfuegen' && clip && hover) { try { return sym(pasteEdit(clip, hover)); } catch { return null; } }
    // Magic select: the cells a click would select glow under the pointer.
    if (tool === 'zauberstab' && hover && cellAt(draft, hover)?.kind === 'block') {
      try { const m = magicSelect(draft, hover, magic); return m.size > PREVIEW_LIMIT ? null : setCells([...m].map(k => k.split(',').map(Number) as unknown as Vec3), { kind: 'air' }, 'Vorschau'); } catch { return null; }
    }
    // Curve preview: the placed points plus the pointer as the next point.
    if (tool === 'kurve' && curvePts.length) {
      const pts = hover && curvePts.length < 64 ? [...curvePts, hover] : curvePts;
      if (pts.length < 2) return null;
      try { return sym(paint(curveEdit(pts, brush, curveOptions))); } catch { return null; }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stroke, shapeEdit, tool, clip, hover, sym, curvePts, curve, paint, brush, magic, draft]);
  const preview = useMemo(() => previewEdit ? previewEdit.changes.slice(0, PREVIEW_LIMIT).map(c => c.position) : [], [previewEdit]);
  const previewColors = useMemo(() => previewEdit && (usePattern || tool === 'einfuegen' || symOn) ? previewEdit.changes.slice(0, PREVIEW_LIMIT).map(c => brushColor(c.value)) : undefined, [previewEdit, usePattern, tool]);
  /** What the 3D view shows of the planned change: the drag preview, else the cell a click would change. */
  const preview3d = useMemo((): PreviewCells | null => {
    if (!build3d) return null;
    if (stroke?.from3d) {
      if (stroke.selecting || !previewEdit) return null;
      return { positions: preview, ...(previewColors && { colors: previewColors }), color: brushColor(toolValue(tool)), erase: tool === 'abbauen' };
    }
    if (stroke || !hover3d) return null;
    if (tool === 'abbauen') return { positions: [hover3d.cell.position], color: '#d35f5f', erase: true };
    if (tool === 'einfuegen' && clip) { try { const e = sym(pasteEdit(clip, hover3d.adjacent)); return { positions: e.changes.slice(0, PREVIEW_LIMIT).map(c => c.position), colors: e.changes.slice(0, PREVIEW_LIMIT).map(c => brushColor(c.value)), color: '#ffffff' }; } catch { return null; } }
    if (GESTURE_TOOLS.has(tool) && tool !== 'auswahl') return { positions: [hover3d.adjacent], color: brushColor(brush) };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [build3d, stroke, previewEdit, preview, previewColors, hover3d, tool, brush, clip, sym]);
  /** Outline: the box being selected in 3D, or the selection moved by the grab offset. */
  const ghost3d = useMemo(() => {
    if (stroke?.from3d && stroke.selecting) return { bounds: boxBounds({ a: stroke.start, b: stroke.current }), tone: 'snap' as const };
    if (moveDelta && selection) return { bounds: { min: selection.min.map((n, i) => n + moveDelta[i]!) as unknown as Vec3, maxExclusive: selection.maxExclusive.map((n, i) => n + moveDelta[i]!) as unknown as Vec3 }, tone: 'snap' as const };
    return null;
  }, [stroke, moveDelta, selection]);
  /** Size of the shape being drawn, for the grid HUD. */
  const previewInfo = useMemo(() => {
    if (!previewEdit?.changes.length) return '';
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const c of previewEdit.changes) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, c.position[i]!); max[i] = Math.max(max[i]!, c.position[i]!); }
    return `${max[0]! - min[0]! + 1} × ${max[1]! - min[1]! + 1} × ${max[2]! - min[2]! + 1} · ${formatNumber(previewEdit.changes.length)} Zellen`;
  }, [previewEdit]);

  const extentBox: Box | null = extent ? { a: extent.min, b: extent.max } : null;
  /** Magic select (EDIT-05): replace, add (Shift) or remove (Alt) the connected cells from the cell selection. */
  const magicPick = (p: Vec3, addTo: boolean, remove: boolean) => {
    try {
      const found = magicSelect(draft, p, magic);
      const base = mask ?? new Set<string>();
      const next = remove ? new Set([...base].filter(k => !found.has(k))) : addTo ? new Set([...base, ...found]) : found;
      const b = regionBounds(next);
      if (!b) { selectBox(null); setMessage('Zauberauswahl leer.'); return; }
      setMask(next); setSelection({ min: b.min, maxExclusive: b.maxExclusive });
      setMessage(`Zauberauswahl (${MAGIC_MODE_LABEL[magic.mode]}): ${formatNumber(next.size)} Zellen${remove ? ' nach dem Wegnehmen' : addTo ? ' mit Hinzufügen' : ''}. Die Auswahlknöpfe wirken jetzt nur auf diese Zellen.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
  };
  const onCell = (p: Vec3, from3d = false) => {
    switch (tool) {
      case 'zauberstab': magicPick(p, false, false); return true;
      case 'pipette': { const v = cellAt(draft, p); if (v) { setBrushRaw(v.kind === 'block' ? { kind: 'block', state: v.state } : v); setTool('stift'); setMessage(`Pinsel: ${brushLabel(v)}`); } else setMessage('Leere Zelle'); return true; }
      case 'drehen': { const r = rotateCellEdit(draft, p, { quarterTurns: 1, mirrorX: false }); if (r.resolved) run(r.edit, 'Block gedreht'); else setMessage(r.message); return true; }
      case 'zustand': setPicked(p); return true;
      case 'fuellen': {
        const limit = selection ? toBox(selection) : extentBox;
        // With a pattern the fill value is only a marker that differs from the area (the pattern paints every cell).
        const target = cellAt(draft, p), marker: CellSlot = usePattern ? (target?.kind === 'erase' ? { kind: 'air' } : { kind: 'erase' }) : brush;
        try { run(sym(paint(floodEdit(draft, p, marker, { plane: 'y', ...(limit && { limitBox: { a: [limit.a[0], p[1], limit.a[2]], b: [limit.b[0], p[1], limit.b[2]] } }) }))), symNote()); }
        catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
        return true;
      }
      case 'kurve': setCurvePts(pts => pts.length >= 64 ? pts : [...pts, p]); return true;
      case 'einfuegen': if (clip) { try { run(sym(pasteEdit(clip, p, entityOpt)), symNote()); } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); } } else setMessage('Zwischenablage ist leer: zuerst einen Bereich kopieren.'); return true;
      case 'abbauen': if (from3d) { run(setCells([p], null, 'Abbauen')); return true; } return false;
      default: return false;
    }
  };

  const onStroke = (s: Stroke) => {
    if (s.phase === 'cancel') { setLiveStroke(null); return; }
    if (tool === 'zauberstab') { if (s.phase === 'down') magicPick(s.cell, s.shift, s.alt); return; }
    const selecting = tool === 'auswahl' || s.shift;
    if (s.phase === 'down') {
      if (!selecting && onCell(s.cell)) return;
      setLiveStroke({ start: s.cell, current: s.cell, cells: new Map([[s.cell.join(','), s.cell]]), selecting });
      if (selecting) selectBox(boxBounds({ a: s.cell, b: s.cell }));
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
    if (e) run(e, tool === 'wendel' && !walkRef.current ? `${e.label}: ${formatNumber(e.changes.length)} Zellen – zu steil zum Begehen; Steigung verringern oder Breite erhöhen.` : symNote());
  };

  // Keyboard (EDIT-03): layers, tools, clipboard, selection. The latest state is read through a ref so the
  // listener stays registered once and never acts on a stale draft.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    const key = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  // Blocks of the model for "Im Modell" and replace.
  const used = useMemo(() => usedBlocks(draft), [draft]);
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
    if (mask) return mask.has(posKey(p)) ? { color: '#5be3b5', amount: 0.45 } : null;
    return p.every((n, i) => n >= s.min[i]! && n < s.maxExclusive[i]!) ? { color: '#5be3b5', amount: 0.35 } : null;
  }, [selection, mask]);
  const cells3d = useMemo(() => cut3d && payload ? payload.cells.filter(c => c.position[1] <= y) : null, [cut3d, payload, y]);
  const onSelect3d = useCallback((c: Cell | null, hit?: PickHit | null, mods?: PointerMods) => {
    if (!c) return;
    if (tool === 'zauberstab' && mods && (mods.shift || mods.alt)) { magicPick(c.position, mods.shift, mods.alt); return; }
    // Paste and curve points go in front of the clicked face, everything else acts on the clicked block.
    const p = hit && build3d && FACE_TOOLS.has(tool) ? hit.adjacent : c.position;
    setY(p[1]); setPicked(c.position); onCell(p, true);
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, draft, brush, clip, selection, mask, magic, build3d, curvePts, paint, sym]);

  // ---------------------------------------------------------------- EDIT-06: building in the 3D view
  /** Latest handler body; the object handed to the viewer stays the same so the scene never re-registers. */
  const build3dRef = useRef<BuildHandler | null>(null);
  build3dRef.current = {
    canStart: (_hit, mods) => mods.shift || GESTURE_TOOLS.has(tool),
    start: (hit, mods) => {
      const selecting = tool === 'auswahl' || mods.shift;
      const at: Vec3 = selecting || tool === 'abbauen' ? hit.cell.position : hit.adjacent;
      setHover3d(null);
      setLiveStroke({ start: at, current: at, cells: new Map([[at.join(','), at]]), selecting, from3d: true });
    },
    move: ({ hit, plane }) => {
      const s = strokeRef.current; if (!s?.from3d) return;
      let current = s.current, cells = s.cells;
      if (!s.selecting && (tool === 'stift' || tool === 'abbauen')) {
        // Painting follows the faces under the pointer; short jumps on one plane are joined by a line.
        const h = hit(); if (!h) return;
        const p: Vec3 = tool === 'abbauen' ? h.cell.position : h.adjacent;
        if (p.join(',') === current.join(',')) return;
        cells = new Map(cells);
        const gap = Math.max(...p.map((v, i) => Math.abs(v - current[i]!)));
        const flat = p.some((v, i) => v === current[i]);
        if (gap > 1 && gap <= 8 && flat && tool === 'stift') for (const c of lineEdit(current, p, null).changes) cells.set(c.position.join(','), c.position);
        cells.set(p.join(','), p);
        current = p;
      } else {
        if (!plane) return;
        const p = s.selecting ? plane.cell : plane.adjacent;
        if (p.join(',') === current.join(',')) return;
        current = p;
      }
      setLiveStroke({ ...s, current, cells });
    },
    end: cancelled => {
      const s = strokeRef.current; setLiveStroke(null);
      if (!s?.from3d || cancelled) { if (cancelled) setMessage('Abgebrochen.'); return; }
      if (s.selecting) {
        const b = boxBounds({ a: s.start, b: s.current });
        selectBox(b); setY(s.start[1]);
        setMessage(`Auswahl im 3D-Bild: ${b.maxExclusive.map((n, i) => n - b.min[i]!).join(' × ')} Zellen. Mit dem Auswahl-Werkzeug lässt sich die Gruppe im 3D-Bild verschieben.`);
        return;
      }
      const e = shapeEdit(s);
      if (e && run(e, tool === 'wendel' && !walkRef.current ? `${e.label}: ${formatNumber(e.changes.length)} Zellen – zu steil zum Begehen; Steigung verringern oder Breite erhöhen.` : symNote())) {
        setY(s.start[1]);
        if (s.cells.size === 1 && tool === 'stift') setPicked(s.start);
      }
    },
    hover: setHover3d,
  };
  const build3dHandler = useMemo<BuildHandler>(() => ({
    canStart: (h, m) => build3dRef.current?.canStart(h, m) ?? false,
    start: (h, m) => build3dRef.current?.start(h, m),
    move: a => build3dRef.current?.move(a),
    end: c => build3dRef.current?.end(c),
    hover: h => build3dRef.current?.hover(h),
  }), []);
  /** Group move: with the selection tool, a selected block can be grabbed and the group dragged in 3D. */
  const moveRef = useRef<DragHandler | null>(null);
  moveRef.current = {
    canGrab: c => {
      if (tool !== 'auswahl' || !selection) return false;
      const p = c.position;
      return mask ? mask.has(posKey(p)) : p.every((n, i) => n >= selection.min[i]! && n < selection.maxExclusive[i]!);
    },
    move: d => setMoveDelta(d),
    end: d => {
      setMoveDelta(null);
      if (d && (d[0] || d[1] || d[2])) transformSelection(null, d);
    },
  };
  const moveHandler = useMemo<DragHandler>(() => ({
    canGrab: c => moveRef.current?.canGrab(c) ?? false,
    move: d => moveRef.current?.move(d),
    end: d => moveRef.current?.end(d),
  }), []);

  const selBox = selection ? toBox(selection) : null;
  /** Selection operations: on a cell selection only its cells change. */
  const selOp = (edit: Edit, ok = '') => run(mask ? clipEdit(edit, mask) : edit, ok);
  const clearSelection = guarded((label: string = 'Auswahl leeren') => selBox && run(mask ? clearRegionEdit(draft, mask, { label }) : clearBoxEdit(draft, selBox, label)));
  const maskLayer = useMemo(() => mask ? [...mask].map(k => k.split(',').map(Number) as unknown as Vec3).filter(p => p[1] === y) : undefined, [mask, y]);
  const replaceQuery = (): ReplaceQuery | null => {
    if (!replaceFrom) return null;
    const from: ReplaceQuery['from'] = replaceFrom === 'air' ? 'air' : replaceFrom.includes('[') || used.some(u => stateText(u.state) === replaceFrom)
      ? { id: used.find(u => stateText(u.state) === replaceFrom)?.state.id ?? replaceFrom, properties: used.find(u => stateText(u.state) === replaceFrom)?.state.properties ?? {} }
      : { id: replaceFrom };
    return { from, to: brush, keepProperties: keepProps, ...(replaceScope === 'selection' && selBox && { box: selBox }) };
  };
  const rq = replaceQuery();
  const replaceEditNow = (q: ReplaceQuery): Edit => {
    const e = usePattern ? replacePatternEdit(draft, q, activePattern, blockSchema) : replaceEdit(draft, q, blockSchema);
    return mask && q.box ? clipEdit(e, mask) : e;
  };
  // Counted once per draft/query, not on every hover render; a too large edit shows its reason instead of crashing the editor.
  const rqKey = rq ? JSON.stringify(rq) : '';
  const replaceInfo = useMemo((): { count: number; error?: string } => {
    if (!rq) return { count: 0 };
    try { return { count: mask && rq.box ? clipEdit(replaceEdit(draft, rq, blockSchema), mask).changes.length : countMatches(draft, rq.from, rq.box) }; }
    catch (e) { return { count: 0, error: e instanceof Error ? e.message : String(e) }; }
  }, [draft, rqKey, mask, blockSchema]); // eslint-disable-line react-hooks/exhaustive-deps
  const replaceCount = replaceInfo.count;
  const transformSelection = guarded((t: { quarterTurns: 0 | 1 | 2 | 3; mirrorX: boolean } | null, delta: Vec3 = [0, 0, 0]) => {
    if (!selBox) return;
    if (mask) {
      const r = moveRegionEdit(draft, mask, delta, t ?? undefined);
      if (run(r.edit, r.unresolved.length ? `Ohne Drehregel unverändert: ${r.unresolved.join(', ')}` : '')) {
        const b = regionBounds(r.region);
        setMask(r.region); if (b) setSelection({ min: b.min, maxExclusive: b.maxExclusive });
      }
      return;
    }
    const r = moveBoxEdit(draft, selBox, delta, t ?? undefined);
    if (run(r.edit, r.unresolved.length ? `Ohne Drehregel unverändert: ${r.unresolved.join(', ')}` : '')) {
      const s = boxBounds(selBox), size = [s.maxExclusive[0] - s.min[0], s.maxExclusive[1] - s.min[1], s.maxExclusive[2] - s.min[2]];
      const turned = t && t.quarterTurns % 2 === 1 ? [size[2]!, size[1]!, size[0]!] : size;
      const off = [Math.floor((size[0]! - turned[0]!) / 2), 0, Math.floor((size[2]! - turned[2]!) / 2)];
      const min: Vec3 = [s.min[0] + delta[0] + off[0]!, s.min[1] + delta[1], s.min[2] + delta[2] + off[2]!];
      setSelection({ min, maxExclusive: [min[0] + turned[0]!, min[1] + turned[1]!, min[2] + turned[2]!] });
    }
  });

  const copySelection = guarded((cut: boolean) => {
    if (!selBox) { setMessage('Keine Auswahl.'); return; }
    const c = mask ? copyRegion(draft, mask) : copyBox(draft, selBox); setClip(c);
    const ent = c.entities?.length ? ` und ${c.entities.length} Ausstattungsstücke` : '';
    if (cut) run(mask ? clearRegionEdit(draft, mask, { label: 'Ausschneiden' }) : clearBoxEdit(draft, selBox, 'Ausschneiden'), `Ausgeschnitten: ${formatNumber(c.cells.length)} Zellen${ent}`);
    else setMessage(`Kopiert: ${formatNumber(c.cells.length)} Zellen${ent}`);
  });
  const turnClip = (t: { quarterTurns: 0 | 1 | 2 | 3; mirrorX: boolean }) => {
    if (!clip) return;
    const r = transformClipboard(clip, t); setClip(r.clip);
    setMessage(`Zwischenablage ${t.mirrorX ? 'gespiegelt' : 'gedreht'}: ${r.clip.size.join(' × ')}${r.unresolved.length ? ` · ohne Drehregel unverändert: ${r.unresolved.join(', ')}` : ''}`);
  };
  const takeClip = (c: Clipboard, label: string) => { setClip(c); setTool('einfuegen'); setMessage(`${label} in der Zwischenablage (${c.size.join(' × ')}): in die Ebene klicken zum Einfügen, R dreht.`); };

  keyRef.current = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement | null)?.closest('input,textarea,select,[contenteditable]')) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    // The focused 3D view has its own keys (views, flight); there only Ctrl shortcuts reach the editor.
    if (e.altKey || (!ctrl && (e.target as HTMLElement | null)?.closest('.editor-3d'))) return;
    if (ctrl) {
      const l = k.toLowerCase();
      if (l === 'c' && selBox) { e.preventDefault(); copySelection(false); }
      else if (l === 'x' && selBox) { e.preventDefault(); copySelection(true); }
      else if (l === 'v') { if (clip) { e.preventDefault(); setTool('einfuegen'); setMessage('Einfügen: in die Ebene klicken (R dreht, M spiegelt).'); } }
      else if (l === 'a' && extent) { e.preventDefault(); selectBox({ min: extent.min, maxExclusive: [extent.max[0] + 1, extent.max[1] + 1, extent.max[2] + 1] }); }
      return;
    }
    if (k === 'PageUp' || k === ']') { e.preventDefault(); setY(v => v + 1); }
    else if (k === 'PageDown' || k === '[') { e.preventDefault(); setY(v => v - 1); }
    else if (tool === 'kurve' && k === 'Enter') { e.preventDefault(); finishCurve(); }
    else if (tool === 'kurve' && k === 'Backspace' && curvePts.length) { e.preventDefault(); setCurvePts(pts => pts.slice(0, -1)); }
    else if (k === 'Escape') { setCurvePts([]); selectBox(null); strokeRef.current = null; setStroke(null); setHelp(false); }
    else if (k === '?') { setHelp(h => !h); }
    else if (/^[1-9]$/.test(k)) { const t = TOOLS[Number(k) - 1]; if (t) setTool(t[0]); }
    else if ((k === 'Delete' || k === 'Backspace') && selBox) { e.preventDefault(); clearSelection(); }
    else if (k.startsWith('Arrow') && selBox) {
      e.preventDefault();
      const d: Vec3 = k === 'ArrowUp' ? (e.shiftKey ? [0, 1, 0] : [0, 0, -1]) : k === 'ArrowDown' ? (e.shiftKey ? [0, -1, 0] : [0, 0, 1]) : k === 'ArrowLeft' ? [-1, 0, 0] : [1, 0, 0];
      transformSelection(null, d);
      if (d[1]) setY(v => v + d[1]);
    }
    else if (k === 'r' || k === 'R') { if (tool === 'einfuegen' && clip) turnClip({ quarterTurns: 1, mirrorX: false }); else if (selBox) transformSelection({ quarterTurns: 1, mirrorX: false }); }
    else if (k === 'm' || k === 'M') { if (tool === 'einfuegen' && clip) turnClip({ quarterTurns: 0, mirrorX: true }); else if (selBox) transformSelection({ quarterTurns: 0, mirrorX: true }); }
    else if (k === 'g' || k === 'G') setCut3d(c => !c);
    else if (k.length === 1) { const t = TOOLS.find(x => x[4] === k.toUpperCase()); if (t) setTool(t[0]); }
  };

  const pickedValue = picked ? cellAt(draft, picked) : null;
  const yRange = extent ? `${extent.min[1]} … ${extent.max[1]}` : '–';
  const changes = model.summary.added + model.summary.removed + model.summary.changed + model.summary.entities;
  // Unsaved draft: leaving the page (other tab, other route, closing the browser tab) asks first.
  useLeaveGuard(changes ? `Im Blockeditor ${changes === 1 ? 'ist 1 Änderung' : `sind ${formatNumber(changes)} Änderungen`} noch nicht gespeichert.` : null);

  return <div className="block-editor">
    <div className="editor-bar" role="toolbar" aria-label="Bearbeitung">
      <button onClick={model.undo} disabled={!model.history.undo.length} title={model.history.undo.at(-1) ? `Rückgängig: ${model.history.undo.at(-1)!.label} (Strg+Z)` : 'Rückgängig (Strg+Z)'}>↶ Rückgängig</button>
      <button onClick={model.redo} disabled={!model.history.redo.length} title="Wiederholen (Strg+Y)">↷ Wiederholen</button>
      <button data-testid="settle" onClick={guarded(() => { const e = settleEdit(draft, selBox); if (e) run(e, `${e.label}: Zäune, Mauern, Scheiben, Treppen und Tore zeigen jetzt die Form aus dem Spiel.`); else setMessage('Alle Verbindungen entsprechen schon dem Spiel.'); })}
        title={selBox ? 'Verbindungen in der Auswahl wie im Spiel setzen (Zäune, Mauern, Scheiben, Gitter, Treppenecken, Tore)' : 'Verbindungen im ganzen Modell wie im Spiel setzen (Zäune, Mauern, Scheiben, Gitter, Treppenecken, Tore)'}>⛓ Wie im Spiel verbinden</button>
      <button data-testid="placement-check" onClick={() => { const pl = materializeDraft(draft); setMessage(pl ? placementSummary(checkPlacement(pl)) : 'Das Modell ist leer.'); }} title="Halt, Schwerkraft, Verbindungen und Hälften wie im Spiel prüfen">✓ Spielprüfung</button>
      <span className="editor-stats" aria-live="polite" data-changes={changes}>
        {formatNumber(model.cellCount)} Zellen · Änderungen: <b>+{formatNumber(model.summary.added)}</b> / <b>−{formatNumber(model.summary.removed)}</b> / <b>~{formatNumber(model.summary.changed)}</b>{model.summary.entities > 0 && <> · Ausstattung geändert</>}
      </span>
      <span className="spacer" />
      {saveBar(model)}
    </div>
    {message && <p className="editor-message" role="status">{message}</p>}
    <SizeNotice cells={model.cellCount} />
    <div className="editor-main" ref={layout.ref as RefObject<HTMLDivElement | null>} {...layout.attrs}>
      <aside className="editor-tools" id="werkstatt-tools" aria-label="Werkzeuge" hidden={!layout.side}>
        <div className="tool-grid" role="radiogroup" aria-label="Werkzeug">
          {TOOLS.map(([id, icon, label, hint, letter], i) => <button key={id} role="radio" aria-checked={tool === id} title={`${hint} (${i < 9 ? `${i + 1} oder ` : ''}${letter})`} onClick={() => setTool(id)}>
            <span aria-hidden="true">{icon}</span> {label}<kbd aria-hidden="true">{letter}</kbd></button>)}
        </div>
        <div className="brush-now" title={brush?.kind === 'block' ? stateText(brush.state) : brushLabel(brush)}>
          <span className="swatch" style={{ background: brushColor(tool === 'abbauen' ? null : brush) }} aria-hidden="true" />
          <span><span className="panel-kicker">PINSEL</span><b>{tool === 'abbauen' ? 'Entfernen' : usePattern && BRUSH_TOOLS.has(tool) ? `Muster: ${PATTERN_KIND_LABEL[pattern.kind]} (${pattern.entries.length})` : brushLabel(brush)}</b>
            {brush?.kind === 'block' && <small>{stateText(brush.state).replace('minecraft:', '')}</small>}</span>
        </div>
        {brush?.kind === 'block' && tool !== 'abbauen' && <StateFields state={brush.state} label="Pinsel-Zustand" onChange={s => setBrushRaw({ kind: 'block', state: s })} />}
        {(tool === 'quader') && <label>Form<select value={shape} onChange={e => setShape(e.target.value as BoxShape)} aria-label="Quaderform">
          {(Object.keys(BOX_SHAPE_LABEL) as BoxShape[]).map(s => <option key={s} value={s}>{BOX_SHAPE_LABEL[s]}</option>)}</select></label>}
        {(tool === 'quader' || tool === 'zylinder' || tool === 'ellipsoid') && <label>Höhe ab Ebene<input type="number" min={1} max={384} value={height} onChange={e => setHeight(Math.max(1, Math.min(384, Number(e.target.value) || 1)))} /></label>}
        {tool === 'linie' && <div className="sel-range">
          <label>Höhe<input type="number" min={1} max={384} value={line.height} onChange={e => setLine(l => ({ ...l, height: clampInt(e.target.value, 1, 384) }))} aria-label="Mauerhöhe" /></label>
          <label>Stärke<input type="number" min={1} max={16} value={line.thickness} onChange={e => setLine(l => ({ ...l, thickness: clampInt(e.target.value, 1, 16) }))} aria-label="Mauerstärke" /></label>
        </div>}
        {tool === 'bogen' && <>
          <label>Bogenform<select value={arch.style} onChange={e => setArch(a => ({ ...a, style: e.target.value as ArchStyle }))} aria-label="Bogenform">
            {(Object.keys(ARCH_STYLE_LABEL) as ArchStyle[]).map(k => <option key={k} value={k}>{ARCH_STYLE_LABEL[k]}</option>)}</select></label>
          <div className="sel-range">
            <label>Bogenhöhe<input type="number" min={1} max={128} value={arch.rise} onChange={e => setArch(a => ({ ...a, rise: clampInt(e.target.value, 1, 128) }))} aria-label="Bogenhöhe" /></label>
            <label>Pfosten<input type="number" min={0} max={128} value={arch.legs} onChange={e => setArch(a => ({ ...a, legs: clampInt(e.target.value, 0, 128) }))} aria-label="Pfostenhöhe" /></label>
            <label>Stärke<input type="number" min={1} max={32} value={arch.thickness} onChange={e => setArch(a => ({ ...a, thickness: clampInt(e.target.value, 1, 32) }))} aria-label="Bogenstärke" /></label>
            <label>Tiefe<input type="number" min={1} max={64} value={arch.depth} onChange={e => setArch(a => ({ ...a, depth: clampInt(e.target.value, 1, 64) }))} aria-label="Bogentiefe" /></label>
          </div>
          <label className="check"><input type="checkbox" checked={arch.wall} onChange={e => setArch(a => ({ ...a, wall: e.target.checked }))} /> als Wand mit Öffnung</label>
          <p className="muted small">Von Fußpunkt zu Fußpunkt ziehen; Tiefe wächst nach Süden bzw. Osten.</p>
        </>}
        {tool === 'pyramide' && <div className="sel-range">
          <label>Stufe<input type="number" min={1} max={8} value={pyramid.step} onChange={e => setPyramid(p => ({ ...p, step: clampInt(e.target.value, 1, 8) }))} aria-label="Stufenbreite" /></label>
          <label>max. Höhe<input type="number" min={0} max={384} value={pyramid.maxHeight} onChange={e => setPyramid(p => ({ ...p, maxHeight: clampInt(e.target.value, 0, 384) }))} aria-label="Maximale Höhe (0 = bis zur Spitze)" /></label>
        </div>}
        {tool === 'kegel' && <label>Höhe<input type="number" min={1} max={384} value={coneHeight} onChange={e => setConeHeight(clampInt(e.target.value, 1, 384))} aria-label="Kegelhöhe" /></label>}
        {tool === 'zauberstab' && <MagicControls state={magic} onChange={setMagic} count={mask ? mask.size : null} />}
        {tool === 'torus' && <TorusControls state={torus} onChange={setTorus} />}
        {tool === 'wendel' && <HelixControls state={helix} onChange={setHelix} />}
        {(tool === 'zylinder' || tool === 'kugel' || tool === 'pyramide' || tool === 'kegel' || tool === 'ellipsoid' || tool === 'torus') && <label className="check"><input type="checkbox" checked={hollow} onChange={e => setHollow(e.target.checked)} /> hohl</label>}
        {(tool === 'kugel' || tool === 'ellipsoid') && <label className="check"><input type="checkbox" checked={dome} onChange={e => setDome(e.target.checked)} /> nur obere Hälfte (Kuppel)</label>}
        {tool === 'einfuegen' && <>
          <p className="muted">{clip ? `Zwischenablage: ${clip.size.join(' × ')} · ${formatNumber(clip.cells.length)} Zellen` : 'Zwischenablage leer: Bereich kopieren oder Schablone wählen.'}</p>
          {clip && <div className="button-grid">
            <button onClick={() => turnClip({ quarterTurns: 1, mirrorX: false })} title="R">Ablage ⟳ 90°</button>
            <button onClick={() => turnClip({ quarterTurns: 0, mirrorX: true })} title="M">Ablage spiegeln</button>
          </div>}
        </>}
        {tool === 'kurve' && <CurveControls state={curve} onChange={setCurve} points={curvePts} onFinish={finishCurve} onUndoPoint={() => setCurvePts(pts => pts.slice(0, -1))} onClear={() => setCurvePts([])} />}
        {BRUSH_TOOLS.has(tool) && <PatternPanel state={pattern} onChange={setPattern} brush={brush} />}
        <SymmetryControls state={symState} onChange={setSymState} symmetry={symmetry} model={extent} selection={selection ? toBox(selection) : null} />
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
          {show3d && <label className="check" title="Zeigt im 3D-Bild nur die Ebenen bis zur aktuellen (G)"><input type="checkbox" checked={cut3d} onChange={e => setCut3d(e.target.checked)} /> 3D bis Ebene</label>}
          {show3d && <label className="check" title="Blöcke direkt an den Flächen im 3D-Bild setzen, abbauen, Formen und Auswahl aufziehen"><input type="checkbox" data-testid="build3d" checked={build3d} onChange={e => setBuild3d(e.target.checked)} /> Im 3D bauen</label>}
          <button onClick={() => setHelp(h => !h)} aria-expanded={help} title="Tastenkürzel (?)">⌨ Tasten</button>
          <LayoutButtons layout={layout} sideLabel="Werkzeuge" sideId="werkstatt-tools" inspectorId="werkstatt-side" plan2d={false} />
        </div>
        {extent && <LayerStrip layers={layers} min={extent.min[1]} max={extent.max[1]} y={y} onY={setY} />}
        <div className={`canvas-split${show3d ? ' with-3d' : ''}`}>
          <LayerGrid layers={layers} y={y} extent={extent} selection={selection} selectionCells={maskLayer} preview={preview} previewColor={brushColor(toolValue(tool))} previewColors={previewColors}
            previewInfo={previewInfo} picked={picked} onStroke={onStroke} onHover={setHover}
            guides={symOn || curvePts.length ? {
              lineX: symmetry.mirrorX || symmetry.rotate > 1 ? symmetry.centre2[0] / 2 + 0.5 : undefined,
              lineZ: symmetry.mirrorZ || symmetry.rotate > 1 ? symmetry.centre2[1] / 2 + 0.5 : undefined,
              centre: symmetry.rotate > 1, points: curvePts,
            } : undefined} />
          {show3d && <div className="editor-3d">
            {payload ? <Viewer payload={payload} cells={cells3d ?? payload.cells} onSelect={onSelect3d} markFor={markFor}
              focus={selection ? { min: selection.min, maxExclusive: selection.maxExclusive } : null}
              build={build3d ? build3dHandler : null} preview={preview3d} ghost={ghost3d}
              drag={build3d && tool === 'auswahl' && selection ? moveHandler : null} sectionTools cameraKey="werkstatt" />
              : <div className="scene empty-3d"><p className="muted">Noch keine Blöcke. Wähle links einen Block und klicke in die Ebene.</p></div>}
            <p className="muted small build3d-hint">{build3d
              ? <>Im 3D bauen: Klick oder Ziehen auf Blöcken setzt auf die Fläche, „Abbauen“ entfernt, Formen und Auswahl lassen sich aufziehen (an Seitenflächen als Wand). Drehen mit der rechten Maustaste oder Ziehen ins Leere.</>
              : <>Klick in 3D wählt Ebene und Block; mit „Abbauen“, „Pipette“ oder „Drehen“ wirkt das Werkzeug direkt.</>}</p>
          </div>}
        </div>
      </section>

      <aside className="editor-side" id="werkstatt-side" aria-label="Auswahl und Block" hidden={!layout.inspector}>
        <section className="panel-lite" aria-label="Auswahl">
          <span className="panel-kicker">AUSWAHL</span>
          {selection && selBox ? <>
            <p><b>{(['X', 'Y', 'Z'] as const).map((a, i) => `${a} ${selection.min[i]}…${selection.maxExclusive[i]! - 1}`).join(' · ')}</b> · {mask ? <><b data-testid="mask-size">{formatNumber(mask.size)}</b> ausgewählte Zellen (Zauberauswahl)</> : <>{formatNumber(boxVolume(selBox))} Zellen</>}</p>
            {!mask && <div className="sel-range">
              <label>Y von<input type="number" value={selection.min[1]} onChange={e => { const v = Math.trunc(Number(e.target.value)); setSelection(s => s && { min: [s.min[0], Math.min(v, s.maxExclusive[1] - 1), s.min[2]], maxExclusive: s.maxExclusive }); }} /></label>
              <label>bis<input type="number" value={selection.maxExclusive[1] - 1} onChange={e => { const v = Math.trunc(Number(e.target.value)); setSelection(s => s && { min: s.min, maxExclusive: [s.maxExclusive[0], Math.max(v, s.min[1]) + 1, s.maxExclusive[2]] }); }} /></label>
            </div>}
            <div className="button-grid">
              {(Object.keys(BOX_SHAPE_LABEL) as BoxShape[]).map(s => <button key={s} onClick={guarded(() => selOp(paint(boxEdit(selBox, s, brush))))}>{BOX_SHAPE_LABEL[s]}</button>)}
              <button onClick={() => clearSelection()}>Leeren</button>
              <button onClick={guarded(() => selOp({ ...boxEdit(selBox, 'fill', { kind: 'air' }), label: 'Mit Luft füllen' }))} title="Explizite Luft räumt beim Einfügen im Spiel frei">Luft setzen</button>
            </div>
            <div className="button-grid">
              <button onClick={() => copySelection(false)} title="Strg+C">Kopieren</button>
              <button onClick={() => copySelection(true)} title="Strg+X">Ausschneiden</button>
              <button disabled={!clip} onClick={guarded(() => clip && run(pasteEdit(clip, selection.min, entityOpt)))}>Einfügen hier</button>
              <button onClick={() => transformSelection({ quarterTurns: 1, mirrorX: false })} title="R">Drehen 90°</button>
              <button onClick={() => transformSelection({ quarterTurns: 0, mirrorX: true })} title="M">Spiegeln X</button>
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
            <RegionTools draft={draft} box={selBox} mask={mask} run={run} onMessage={setMessage} onBox={setSelection} onMask={setMask} plane={magic.plane} />
            <button className="link" onClick={() => selectBox(null)}>Auswahl aufheben (Esc)</button>
          </> : <p className="muted">Mit „Auswahl“ oder Shift+Ziehen einen Bereich aufziehen, mit „Zauberauswahl“ (W) zusammenhängende Blöcke wählen. Höhe danach über „Y von/bis“.</p>}
        </section>

        {/* UX-01-S06: Schablonen, Natur, Farben und Bild sind Kreativ-Extras; Auswahl, Ersetzen und Block bleiben sichtbar. */}
        <More className="creative-more" title="Kreativ-Werkzeuge" hint="Schablonen, Natur, Farbverläufe, Bild → Blöcke">
          <StencilPanel profileId={draft.profileId} onClip={takeClip} onMessage={setMessage} selectionClip={() => selBox ? (mask ? copyRegion(draft, mask) : copyBox(draft, selBox)) : null} />
          <NaturePanel draft={draft} box={selBox} pattern={activePattern} run={mask ? (e, ok) => run(clipEdit(e, mask), ok) : run} onMessage={setMessage} />
          <ColorPanel brush={brush} onBrush={setBrush} onGradient={stops => {
            setPattern(p => fromPattern({ kind: 'gradient', stops, axis: p.gradientAxis, blend: p.blend, seed: p.seed }, p));
            setMessage(`Farbverlauf mit ${stops.length} Stufen als Muster übernommen (wirkt auf Setzen, Formen und Füllen).`);
          }} />
          <ImagePanel onClip={takeClip} onMessage={setMessage} />
        </More>

        <section className="panel-lite" aria-label="Ersetzen">
          <span className="panel-kicker">ERSETZEN</span>
          <label>Suchen<select value={replaceFrom} onChange={e => setReplaceFrom(e.target.value)} aria-label="Zu ersetzender Block">
            <option value="">– Block aus dem Modell wählen –</option>
            <optgroup label="Alle Zustände eines Blocks">{usedIds.map(([id, n]) => <option key={id} value={id}>{blockLabel(id)} ({formatNumber(n)})</option>)}</optgroup>
            <optgroup label="Genau dieser Zustand">{used.slice(0, 200).map(u => <option key={stateText(u.state)} value={stateText(u.state)}>{stateText(u.state).replace('minecraft:', '')} ({formatNumber(u.count)})</option>)}</optgroup>
            <option value="air">explizite Luft</option>
          </select></label>
          <p className="muted">durch {usePattern ? <>Muster: <b>{PATTERN_KIND_LABEL[pattern.kind]} ({pattern.entries.length} Einträge)</b></> : <>Pinsel: <b>{brushLabel(brush)}</b></>}</p>
          <label className="check"><input type="checkbox" checked={keepProps} onChange={e => setKeepProps(e.target.checked)} /> Ausrichtung/Zustand übernehmen, wo möglich</label>
          <div className="seg" role="group" aria-label="Bereich"><button aria-pressed={replaceScope === 'all'} onClick={() => setReplaceScope('all')}>Ganzes Modell</button>
            <button aria-pressed={replaceScope === 'selection'} disabled={!selection} onClick={() => setReplaceScope('selection')}>Nur Auswahl</button></div>
          <button className="primary" disabled={!rq || !replaceCount} onClick={guarded(() => rq && run(replaceEditNow(rq)))}>
            {formatNumber(replaceCount)} Zellen {usePattern ? 'mit Muster ' : ''}ersetzen</button>
          {replaceInfo.error && <p className="muted" role="status">{replaceInfo.error}</p>}
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
              <ContentEditor key={`${picked.join(',')}|${model.history.undo.length}|${model.history.redo.length}`} position={picked} state={pickedValue.state} entity={pickedValue.entity} run={run} />
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
        {entityTools && <EntityPanel entities={draft.entities ?? []} picked={picked} run={run} />}
      </aside>
    </div>
    <BlockPalette brush={brush} onBrush={setBrush} used={used} />
    {help && <section className="panel-lite shortcut-help" aria-label="Tastenkürzel">
      <span className="panel-kicker">TASTENKÜRZEL</span>
      <dl>{SHORTCUTS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <button className="link" onClick={() => setHelp(false)}>Schließen (Esc)</button>
    </section>}
    <p className="muted small">Tasten: ? zeigt alle Kürzel · 1–9 oder Buchstabe wählt das Werkzeug · Bild↑/Bild↓ Ebene · Strg+C/X/V · Pfeile verschieben die Auswahl · R dreht.
      Gespeicherte Versionen bleiben unverändert; Speichern legt eine neue Version an.</p>
  </div>;
}

/** Overview of all layers (cells per layer as bars); click jumps to the layer. */
function LayerStrip({ layers, min, max, y, onY }: { layers: ReadonlyMap<number, readonly unknown[]>; min: number; max: number; y: number; onY: (y: number) => void }) {
  const ys: number[] = [];
  for (let v = Math.min(min, y); v <= Math.max(max, y) && ys.length < 512; v++) ys.push(v);
  const top = Math.max(1, ...ys.map(v => layers.get(v)?.length ?? 0));
  return <div className="layer-strip" role="group" aria-label="Ebenenübersicht">
    {ys.map(v => { const n = layers.get(v)?.length ?? 0; return <button key={v} aria-pressed={v === y} onClick={() => onY(v)} title={`Ebene Y ${v}: ${formatNumber(n)} Zellen`} aria-label={`Ebene ${v}`}>
      <span style={{ height: `${n ? Math.max(12, Math.round(n / top * 100)) : 0}%` }} /></button>; })}
  </div>;
}
