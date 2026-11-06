import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BRUSH_LABEL, DEFAULT_AUTO_PAINT, DESIGN_NOTE, NO_WATER, SAMPLE_PROFILE, SURFACE_STYLES, SURVEY_UNKNOWN, addAssetVersion, applyBrush, autoPaint, cloneDesign, columnBases,
  compareDesign, createAsset, designFromSurvey, designMatchesBase, designPayload, designedSurvey, dimensionLabel, flatSurvey, floodWater, gradeFootprints,
  heightLimits, layPath, layRamp, newInstance, PATH_DECK, PATH_MATERIALS, PATH_SLAB, PATH_STAIR, PATH_STYLE_MATERIAL, pathLine, pathPieceCells, positionKey, resetToBase, strokePoints, surveyDisplayCells, placedBounds, isTurned, turnOf, turnVector, turnLabel,
  SCATTER_MISS_LABEL, STENCIL_TAG, addScatterItem, builtinResolver, removeScatterItems, scatterCells, stencilScatterPart,
  RAIN_LABEL, RIVER_BED_LABEL, STAMP_LABEL, carveRiver, erodeTerrain, footprintMask, maskCount, stampShape,
} from '../../../../../packages/domain/src/index.js';
import type { AssetVersionSource, Brush, BrushTool, DesignStats, Falloff, Operation, PathReport, PathSteps, PathWater, WorldPath, WorldPathStyle, ScatterCells, ScatterContext, ScatterGroup, ScatterPart, ScatterPartResolver,
  TerrainDesign, TerrainSurvey, PaintFilter, RainAmount, RiverBed, RiverReport, SculptMask, StampShape } from '../../../../../packages/domain/src/index.js';
import { createPayload } from '../../../../../packages/voxel/src/index.js';
import type { Cell } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { faceColors } from '../../colors';
import { errorText, formatNumber } from '../../app/ui';
import { Viewer } from '../../Viewer';
import { loadDesign, loadDesignBase, storeDesign } from '../world/designs';
import { areaAround, areaLabel, storeSurvey, useSurvey } from '../world/surveys';
import { useLiveGame } from '../map/liveClient';
import { gameDimension, gameTerrainLevel, takeGameSurvey } from '../world/gameTerrain';
import { GameLinkBar } from '../world/GameLinkBar';
import { biomeLabel, biomeShares, paintByBiome } from '../../../../../packages/domain/src/index.js';
import { CANVAS_MODE_LABEL, DesignCanvas } from './landscape/DesignCanvas';
import type { CanvasMode, ScatterDot } from './landscape/DesignCanvas';
import { ScatterPanel } from './landscape/ScatterPanel';
import type { StencilOption } from './landscape/ScatterPanel';
import { isResolved } from './session';
import type { ProjectSession } from './session';
import './landscape/landscape.css';

type Tool = BrushTool | 'ramp' | 'water' | 'path' | 'pick' | 'scatter' | 'erode' | 'stamp' | 'river';
/** TERRAIN-05: tools that honour the mask (filter and protected building sites). */
const MASK_TOOLS: readonly Tool[] = ['raise', 'lower', 'smooth', 'flatten', 'fillUp', 'cut', 'roughen', 'terrace', 'soften', 'paint', 'erode', 'stamp', 'river'];
const SHAPE_TOOLS: readonly BrushTool[] = ['raise', 'lower', 'smooth', 'flatten', 'fillUp', 'cut', 'roughen', 'terrace', 'soften'];
const TOOL_KEYS: Readonly<Record<string, Tool>> = { a: 'raise', s: 'lower', g: 'smooth', e: 'flatten', u: 'fillUp', k: 'cut', m: 'ramp', r: 'roughen', t: 'terrace', h: 'soften', b: 'paint', w: 'water', d: 'drain', p: 'path', i: 'pick', n: 'scatter', v: 'erode', f: 'stamp', l: 'river' };
/** Weltkarte path styles → Belag (TERRAIN-03: „Weg aus der Weltkarte“). */
const WORLD_PATH_STYLE: Readonly<Record<WorldPathStyle, string>> = { weg: 'pfad', strasse: 'pflaster', bahn: 'kiesweg', bruecke: 'steinweg' };
const TOOL_HELP: Readonly<Record<Tool, string>> = {
  raise: 'Ziehen hebt das Gelände an, die Kante läuft weich aus.', lower: 'Ziehen senkt das Gelände ab.', smooth: 'Ziehen gleicht Höhen an die Nachbarn an.',
  flatten: 'Ziehen ebnet auf die Zielhöhe ein (leer = Höhe beim Ansetzen).',
  fillUp: 'Ziehen schüttet Mulden bis zur Zielhöhe auf – was höher liegt, bleibt stehen (leer = Höhe beim Ansetzen).',
  cut: 'Ziehen trägt ab, was über der Zielhöhe liegt – Mulden bleiben, wie sie sind (leer = Höhe beim Ansetzen).',
  ramp: 'Erster Klick setzt den Anfang, zweiter das Ende: dazwischen steigt das Gelände gleichmäßig (Zufahrt, Rampe zum Tor, Weg zum Plateau).', roughen: 'Ziehen macht das Gelände unruhig (Hügel, Mulden), immer gleich für dieselbe Stelle.',
  terrace: 'Ziehen rastet Höhen auf Stufen ein (Terrassenfelder, Weinberg).', soften: 'Ziehen trägt Klippen ab, bis keine Stufe höher als die Stärke ist.',
  paint: 'Ziehen bemalt die Oberfläche mit dem Stil, auf Wunsch nur an Hängen oder in Höhenbereichen.', drain: 'Ziehen entfernt Wasser.',
  water: 'Klick füllt Wasser bis zum Wasserspiegel – wie ein Eimer in einer Mulde.',
  path: 'Klicks setzen Wegpunkte, „Weg legen“ baut den Weg mit höchstens einem Block Steigung je Schritt – auf Wunsch mit Treppen an jedem Höhenwechsel und als Brücke über Wasser.',
  pick: 'Klick übernimmt Höhe und Block der Stelle als Zielhöhe und Wasserspiegel.',
  scatter: 'Setzen: Klick stellt ein Teil der gewählten Streu-Ebene hin. Entfernen: Ziehen nimmt Teile im Pinselkreis weg.',
  erode: 'Ziehen lässt das Gelände verwittern: steile Stufen bröckeln zum Hangfuß, Regen wäscht Rinnen aus. Die Erde bleibt erhalten, sie rutscht nur bergab.',
  stamp: 'Klick setzt die gewählte Form (Hügel, Berg, Krater, Mulde, Plateau) mit Größe und Höhe an diese Stelle – auf das Gelände, das dort liegt.',
  river: 'Klicks setzen Flusspunkte in Fließrichtung, „Fluss graben“ legt Bett, Wasser und Ufer an. Der Wasserspiegel steigt flussab nie an.',
};
const TOOL_LABEL: Readonly<Record<Tool, string>> = { ...BRUSH_LABEL, ramp: 'Rampe', water: 'Wasser füllen', path: 'Weg', pick: 'Pipette', scatter: 'Streuen', erode: 'Verwittern', stamp: 'Formstempel', river: 'Fluss' };
const STEPS_LABEL: Readonly<Record<PathSteps, string>> = { stairs: 'Treppen', slabs: 'Halbstufen', none: 'keine' };
const pieceLabel = (code: number): string => code >= PATH_DECK ? 'Brücke' : code === PATH_SLAB ? 'Halbstufe' : code >= PATH_STAIR ? `Treppe nach ${['Norden', 'Osten', 'Süden', 'Westen'][code - PATH_STAIR]}` : '';
const UNDO_LIMIT = 30;
const short = (id: string) => id.replace(/^minecraft:/, '');

/**
 * Landschaft (TERRAIN-02): shape and paint the building site's terrain on top
 * of its Geländeaufnahme (or flat ground), fill water, lay paths, grade the
 * building sites. Saving stores the design as an original (`terrainDesign.set`,
 * undoable); the world map and the Anlagen planner use it as planned terrain,
 * and the blocks go into the project as a Bauteil for material, export and mod.
 */
export function LandscapeTab({ session }: { session: ProjectSession }) {
  const { repo, library, reloadLibrary } = useApp();
  const { project } = session;
  const placement = project.world ?? null;
  const ref = project.terrainDesign ?? null;
  const { survey: projectSurvey, error: surveyError } = useSurvey(repo, project.terrain ?? null);

  // Working copy: mutated in place by the tools, `version` re-renders.
  const [work, setWork] = useState<{ design: TerrainDesign; base: TerrainSurvey; savedVersion: number; refSha: string | null } | null>(null);
  const [version, setVersion] = useState(0);
  const [statsVersion, setStatsVersion] = useState(0);
  const [loadError, setLoadError] = useState('');
  const undoStack = useRef<TerrainDesign[]>([]);
  const redoStack = useRef<TerrainDesign[]>([]);

  // Load the saved design (once per saved reference that is not ours already).
  useEffect(() => {
    if (!ref) { setWork(w => w && w.refSha !== null ? null : w); return; }
    if (work && work.refSha === ref.sha256) return;
    let live = true;
    Promise.all([loadDesign(repo, ref), loadDesignBase(repo, ref)]).then(([design, base]) => {
      if (!live) return;
      if (!designMatchesBase(design, base)) { setLoadError('Gestaltung und ihre Geländeaufnahme passen nicht zusammen.'); return; }
      undoStack.current = []; redoStack.current = [];
      setWork({ design, base, savedVersion: 0, refSha: ref.sha256 }); setVersion(0); setStatsVersion(v => v + 1); setLoadError('');
    }, e => { if (live) setLoadError(errorText(e)); });
    return () => { live = false; };
  }, [repo, ref?.sha256]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tool, setTool] = useState<Tool>('raise');
  const [radius, setRadius] = useState(4);
  const [strength, setStrength] = useState(2);
  const [falloff, setFalloff] = useState<Falloff>('soft');
  const [target, setTarget] = useState('');
  const [step, setStep] = useState(4);
  const [style, setStyle] = useState('wiese');
  const [filter, setFilter] = useState<{ minSlope: string; minY: string; maxY: string; onlyDry: boolean }>({ minSlope: '', minY: '', maxY: '', onlyDry: false });
  const [waterLevel, setWaterLevel] = useState('');
  const [pathStyle, setPathStyle] = useState('pfad');
  const [pathWidth, setPathWidth] = useState(3);
  const [pathPoints, setPathPoints] = useState<[number, number][]>([]);
  const [pathSteps, setPathSteps] = useState<PathSteps>('stairs');
  const [pathMaterial, setPathMaterial] = useState('auto');
  const [pathWater, setPathWater] = useState<PathWater>('causeway');
  const [rampPoints, setRampPoints] = useState<[number, number][]>([]);
  const [ramp, setRamp] = useState({ width: 3, margin: 2, from: '', to: '' });
  const [mode, setMode] = useState<CanvasMode>('terrain');
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [show3d, setShow3d] = useState(false);
  const [scatterLayer, setScatterLayer] = useState<string | null>(null);
  const [scatterMode, setScatterMode] = useState<'add' | 'remove'>('add');
  // TERRAIN-05: Verwittern, Formstempel, Fluss, Maske.
  const [talus, setTalus] = useState(1);
  const [rain, setRain] = useState<RainAmount>(1);
  const [shape, setShape] = useState<StampShape>('huegel');
  const [shapeHeight, setShapeHeight] = useState(12);
  const [riverPoints, setRiverPoints] = useState<[number, number][]>([]);
  const [river, setRiver] = useState<{ width: number; depth: number; bank: number; bed: RiverBed; start: string }>({ width: 5, depth: 3, bank: 3, bed: 'kies', start: '' });
  const [riverReport, setRiverReport] = useState<RiverReport | null>(null);
  const [protectSites, setProtectSites] = useState(false);
  const [protectMargin, setProtectMargin] = useState(1);
  const stroke = useRef<{ last: [number, number]; changed: number; target: number | undefined } | null>(null);

  const design = work?.design ?? null, base = work?.base ?? null;
  const dirty = work !== null && (version !== work.savedVersion || work.refSha === null);
  const bump = () => setVersion(v => v + 1);
  const snapshot = () => { if (!design) return; undoStack.current.push(cloneDesign(design)); if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift(); redoStack.current = []; };
  const restore = (from: TerrainDesign[], to: TerrainDesign[]) => {
    if (!work || !from.length) return;
    to.push(cloneDesign(work.design));
    const prev = from.pop()!;
    setWork({ ...work, design: prev }); bump(); setStatsVersion(v => v + 1);
  };
  const undo = () => restore(undoStack.current, redoStack.current);
  const redo = () => restore(redoStack.current, undoStack.current);

  const brush = (t: BrushTool, centreTarget?: number): Brush => {
    const flat = target.trim() ? Number(target) : centreTarget;
    return {
    tool: t, radius, strength, falloff, step, style,
    ...((t === 'flatten' || t === 'fillUp' || t === 'cut') && flat !== undefined && { target: flat }),
    ...mask(),
    };
  };
  /** TERRAIN-05: the mask of every shaping tool – filter fields and (optionally) the protected building sites. */
  const mask = (): SculptMask => {
    const f: PaintFilter = {
      ...(filter.minSlope.trim() && { minSlope: Number(filter.minSlope) }), ...(filter.minY.trim() && { minY: Number(filter.minY) }),
      ...(filter.maxY.trim() && { maxY: Number(filter.maxY) }), ...(filter.onlyDry && { onlyDry: true }) };
    return { ...(Object.keys(f).length && { filter: f }), ...(protectSites && protectMask && { protect: protectMask }) };
  };
  const erodeAt = (x: number, z: number) => design ? erodeTerrain(design, { passes: strength, talus, rain, region: { x, z, radius }, ...mask() }).columns : 0;
  const heightAt = (x: number, z: number) => design ? design.height[(x - design.minX) + (z - design.minZ) * design.width]! : SURVEY_UNKNOWN;

  const handlers = {
    start(x: number, z: number) {
      if (!design) return;
      setNote('');
      if (tool === 'path') { setPathPoints(p => [...p, [x, z]]); return; }
      if (tool === 'river') { setRiverPoints(p => [...p, [x, z]]); return; }
      if (tool === 'stamp') {
        snapshot();
        try {
          const r = stampShape(design, x, z, { shape, radius: Math.max(2, radius), height: shapeHeight, ...mask() });
          if (!r.columns) { undoStack.current.pop(); setNote(`${STAMP_LABEL[shape]} ändert hier nichts (unbekanntes Gelände oder Maske).`); return; }
          setNote(`${STAMP_LABEL[shape]} gesetzt: ${formatNumber(r.columns)} Spalten, ${formatNumber(r.fill)} aufschütten, ${formatNumber(r.cut)} abtragen${r.peakY !== null && r.fill ? `, höchster Punkt Y ${r.peakY}` : ''}.`);
          bump(); setStatsVersion(v => v + 1);
        } catch (e) { undoStack.current.pop(); setNote(errorText(e)); }
        return;
      }
      if (tool === 'ramp') {
        if (!rampPoints.length) { setRampPoints([[x, z]]); setNote(`Rampe beginnt bei X ${x} · Z ${z}. Jetzt das Ende anklicken.`); return; }
        const a = rampPoints[0]!;
        setRampPoints([]);
        snapshot();
        try {
          const r = layRamp(design, a, [x, z], { width: ramp.width, margin: ramp.margin, ...(ramp.from.trim() && { fromY: Math.trunc(Number(ramp.from)) }), ...(ramp.to.trim() && { toY: Math.trunc(Number(ramp.to)) }) });
          if (!r.columns && !r.blended) { undoStack.current.pop(); setNote('Die Rampe ändert hier nichts.'); return; }
          setNote(`Rampe gelegt: ${r.length} Blöcke lang von Y ${r.fromY} nach Y ${r.toY}${r.length ? ` (${Math.round(Math.abs(r.toY - r.fromY) / r.length * 100)} % Steigung)` : ''}, ${formatNumber(r.columns)} Spalten, ${formatNumber(r.blended)} im Übergang, ${formatNumber(r.fill)} aufschütten, ${formatNumber(r.cut)} abtragen.`);
          bump(); setStatsVersion(v => v + 1);
        } catch (e) { undoStack.current.pop(); setNote(errorText(e)); }
        return;
      }
      if (tool === 'pick') {
        const h = heightAt(x, z);
        if (h === SURVEY_UNKNOWN) { setNote('Unbekanntes Gelände an dieser Stelle.'); return; }
        const i = (x - design.minX) + (z - design.minZ) * design.width;
        setTarget(String(h)); setWaterLevel(String(design.water[i] !== NO_WATER ? design.water[i] : h + 1));
        setNote(`Übernommen: Höhe Y ${h}, ${short(design.ids[design.top[i]!]!)}. Zielhöhe und Wasserspiegel gesetzt.`);
        return;
      }
      if (tool === 'scatter') {
        if (scatterMode === 'add') {
          const layer = design.scatter?.layers.find(l => l.id === scatterLayer) ?? design.scatter?.layers[0];
          if (!layer) { setNote('Erst rechts unter „Streu-Ebene“ eine Ebene oder Mischung anlegen.'); return; }
          snapshot();
          try {
            const miss = addScatterItem(design, scatterCtx, layer.id, x, z);
            if (miss) { undoStack.current.pop(); setNote(`„${layer.label}“ passt hier nicht: ${SCATTER_MISS_LABEL[miss]}.`); return; }
            setNote(`„${layer.label}“ gesetzt bei X ${x} · Z ${z}.`); bump(); setStatsVersion(v => v + 1);
          } catch (e) { undoStack.current.pop(); setNote(errorText(e)); }
          return;
        }
        snapshot();
        stroke.current = { last: [x, z], changed: removeScatterItems(design, x, z, radius), target: undefined };
        bump();
        return;
      }
      if (tool === 'water') {
        const h = heightAt(x, z);
        const level = waterLevel.trim() ? Number(waterLevel) : h + 2;
        snapshot();
        try {
          const r = floodWater(design, x, z, level);
          if (!r.filled) { undoStack.current.pop(); setNote(h === SURVEY_UNKNOWN ? 'Unbekanntes Gelände an dieser Stelle.' : `Hier liegt der Boden (Y ${h}) nicht unter dem Wasserspiegel Y ${level}.`); return; }
          setNote(`${formatNumber(r.filled)} Spalten mit Wasser bis Y ${level} gefüllt (${formatNumber(r.blocks)} Wasserblöcke).${r.reachedEdge ? ' Achtung: Das Wasser läuft bis an den Rand der Gestaltung – dort fehlt ein Ufer.' : ''}`);
          bump(); setStatsVersion(v => v + 1);
        } catch (e) { undoStack.current.pop(); setNote(errorText(e)); }
        return;
      }
      snapshot();
      const centre = heightAt(x, z);
      stroke.current = { last: [x, z], changed: 0, target: centre === SURVEY_UNKNOWN ? undefined : centre };
      stroke.current.changed += tool === 'erode' ? erodeAt(x, z) : applyBrush(design, x, z, brush(tool, stroke.current.target));
      bump();
    },
    move(x: number, z: number) {
      const s = stroke.current;
      if (!design || !s || (x === s.last[0] && z === s.last[1])) return;
      for (const [px, pz] of strokePoints(s.last[0], s.last[1], x, z, radius))
        s.changed += tool === 'scatter' ? removeScatterItems(design, px, pz, radius) : tool === 'erode' ? erodeAt(px, pz) : applyBrush(design, px, pz, brush(tool as BrushTool, s.target));
      s.last = [x, z];
      bump();
    },
    end() {
      const s = stroke.current; stroke.current = null;
      if (!s) return;
      if (!s.changed) undoStack.current.pop();
      else if (tool === 'scatter') setNote(`${formatNumber(s.changed)} Teile entfernt.`);
      else if (tool === 'erode') setNote(`${formatNumber(s.changed)} Spalten verwittert.`);
      setStatsVersion(v => v + 1);
    },
    hover(x: number, z: number) { setHover([x, z]); },
    leave() { setHover(null); },
  };

  // Keyboard: tool letters, Strg+Z / Strg+Y (not while typing in a field).
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (!design || el?.closest('input, select, textarea')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = TOOL_KEYS[e.key.toLowerCase()];
    if (t) setTool(t);
    else if (e.key === '+' || e.key === ']') setRadius(r => Math.min(32, r + 1));
    else if (e.key === '-' || e.key === '[') setRadius(r => Math.max(0, r - 1));
  };
  useEffect(() => { const f = (e: KeyboardEvent) => keyRef.current(e); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, []);

  const stats = useMemo((): DesignStats | null => design && base ? compareDesign(base, design) : null, [design, base, statsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Footprint of the placed project (world columns) for grading and the overlay.
  const terrainInstances = useMemo(() => project.instances.filter(i => library.versions.get(i.assetVersionId)?.source.format === 'terrain-design'), [project.instances, library.versions]);
  // Planned building cells (world coordinates), without the terrain Bauteil itself.
  const buildingCells = useMemo(() => {
    if (!placement || !isResolved(session.resolution) || !session.resolution.world) return null;
    const own = new Set(terrainInstances.map(i => i.id)), owners = session.resolution.owners;
    const cells = session.resolution.world.cells.filter(c => c.kind === 'block' && !own.has(owners.get(positionKey(c.position))?.[0] ?? ''));
    // MAP-07: on a turned placement the buildings stand turned around the origin.
    const t = turnOf(placement);
    return cells.length ? (isTurned(placement) ? cells.map(c => ({ ...c, position: turnVector(c.position, t) })) : cells) : null;
  }, [session.resolution, placement, terrainInstances]);
  const footprint = useMemo(() => buildingCells && placement ? columnBases(buildingCells, placement.origin) : null, [buildingCells, placement]);
  const protectMask = useMemo(() => design && footprint ? footprintMask(design, footprint, protectMargin) : null, [design, footprint, protectMargin]);
  const footprintPath = useMemo(() => {
    if (!footprint || !design) return null;
    return footprint.filter(c => c.x >= design.minX && c.z >= design.minZ && c.x < design.minX + design.width && c.z < design.minZ + design.length)
      .map(c => `M${c.x - design.minX} ${c.z - design.minZ}h1v1h-1z`).join('');
  }, [footprint, design]);

  // ------------------------------------------------------------------ Streu-Ebene
  // Own Schablonen (library modules tagged „schablone“) can be scattered like the built-in parts.
  const stencils = useMemo((): StencilOption[] => library.assets.filter(a => !a.archived && a.tags.includes(STENCIL_TAG)).flatMap(a => {
    const v = library.versions.get(a.versionIds.at(-1) ?? '');
    return v ? [{ ref: { kind: 'stencil' as const, assetId: a.id, versionId: v.id, label: a.name.slice(0, 120) }, blocks: v.payload.cells.filter(c => c.kind === 'block').length }] : [];
  }), [library.assets, library.versions]);
  const resolve = useMemo((): ScatterPartResolver => {
    const cache = new Map<string, ScatterPart | undefined>();
    return ref => {
      if (ref.kind === 'builtin') return builtinResolver(ref);
      if (cache.has(ref.versionId)) return cache.get(ref.versionId);
      const v = library.versions.get(ref.versionId);
      let part: ScatterPart | undefined;
      try { part = v ? stencilScatterPart(ref, v.payload) : undefined; } catch { part = undefined; }
      cache.set(ref.versionId, part);
      return part;
    };
  }, [library.versions]);
  const scatterCtx = useMemo((): ScatterContext => {
    const o0 = placement?.origin ?? [0, 0, 0];
    const occupied = new Set((buildingCells ?? []).map(c => `${c.position[0] + o0[0]},${c.position[1] + o0[1]},${c.position[2] + o0[2]}`));
    return { base: work?.base ?? flatSurvey({ minX: 0, minZ: 0, width: 1, length: 1 }, 0, 'minecraft:overworld'), resolve,
      buildingColumns: (footprint ?? []).map(c => [c.x, c.z] as const), occupied: (x, y, z) => occupied.has(`${x},${y},${z}`) };
  }, [work?.base, resolve, footprint, buildingCells, placement]);
  const scatterInfo = useMemo((): ScatterCells | null => {
    if (!design || !base || !design.scatter?.items.length) return null;
    try { return scatterCells(design, scatterCtx); } catch { return null; }
  }, [design, base, scatterCtx, statsVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const scatterDots = useMemo((): ScatterDot[] => {
    if (!design?.scatter) return [];
    const groupOf = new Map(design.scatter.layers.map(l => [l.id, { group: resolve(l.part)?.group ?? 'baum' as ScatterGroup, on: l.enabled }] as const));
    return design.scatter.items.flatMap(it => { const g = groupOf.get(it.layer); return g?.on ? [{ x: it.x, z: it.z, group: g.group, active: it.layer === scatterLayer }] : []; });
  }, [design, version, resolve, scatterLayer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------ start
  const area = useMemo(() => {
    if (placement && isResolved(session.resolution) && session.resolution.world && session.resolution.world.cells.length) {
      const b = placedBounds(session.resolution.world.bounds, placement);
      return areaAround(b.min[0], b.min[2], b.maxExclusive[0], b.maxExclusive[2], 32);
    }
    const o = placement?.origin ?? [0, 64, 0];
    return areaAround(o[0], o[2], o[0] + 1, o[2] + 1, 48);
  }, [placement, session.resolution]);
  const [flatY, setFlatY] = useState(() => (placement?.origin[1] ?? 64) - 1);
  const startFromSurvey = () => {
    if (!projectSurvey || !project.terrain) return;
    undoStack.current = []; redoStack.current = [];
    setWork({ design: designFromSurvey(projectSurvey, { kind: 'survey', sha256: project.terrain.sha256 }), base: projectSurvey, savedVersion: -1, refSha: null });
    bump(); setStatsVersion(v => v + 1); setNote('Gestaltung auf der Geländeaufnahme begonnen. Noch nicht gespeichert.');
  };
  // TERRAIN-04: the terrain straight from the game, stored as the project's Geländeaufnahme, then designed on.
  const game = useLiveGame();
  const [gameBusy, setGameBusy] = useState('');
  const startFromGame = async () => {
    const dim = placement?.dimension;
    if (!dim) return;
    setGameBusy('Gelände kommt aus dem Spiel …');
    try {
      const r = await takeGameSurvey(game, area, dim, (d, t) => setGameBusy(`Gelände kommt aus dem Spiel … ${d} / ${t} Chunks`));
      if (!r.live && !r.remembered) { setNote(`Die Mod kennt hier noch kein Gelände. Geh oder flieg im Spiel einmal zum Bauplatz (${areaLabel(area)}), dann erneut.`); return; }
      const reference = await storeSurvey(repo, r.survey, project.name);
      const err = session.execute({ kind: 'terrain.set', terrain: reference, label: project.terrain ? 'Geländeaufnahme erneuert' : 'Geländeaufnahme gespeichert' });
      if (err) { setNote(err); return; }
      undoStack.current = []; redoStack.current = [];
      setWork({ design: designFromSurvey(r.survey, { kind: 'survey', sha256: reference.sha256 }), base: r.survey, savedVersion: -1, refSha: null });
      bump(); setStatsVersion(v => v + 1);
      setNote(`Gelände aus dem Spiel übernommen (${r.live + r.remembered} Chunks${r.missing ? `, ${r.missing} noch nie gesehen` : ''}) und als Geländeaufnahme gespeichert. Gestaltung begonnen, noch nicht gespeichert.`);
    } catch (e) { setNote(`Nicht übernommen: ${errorText(e)}`); }
    finally { setGameBusy(''); }
  };
  const startFlat = () => {
    const lim = heightLimits(placement?.dimension ?? 'minecraft:overworld');
    const y = Math.max(lim[0], Math.min(lim[1], Math.trunc(flatY)));
    const s = flatSurvey(area, y, placement?.dimension ?? 'minecraft:overworld');
    undoStack.current = []; redoStack.current = [];
    setWork({ design: designFromSurvey(s, { kind: 'flat', y }), base: s, savedVersion: -1, refSha: null });
    bump(); setStatsVersion(v => v + 1); setNote(`Gestaltung auf ebenem Grund (Y ${y}) begonnen. Noch nicht gespeichert.`);
  };

  // ------------------------------------------------------------------ save / hand over
  const save = async () => {
    if (!work) return;
    setBusy('Gestaltung wird gespeichert'); setNote('');
    try {
      const reference = await storeDesign(repo, work.design, work.base, project.name);
      const err = session.execute({ kind: 'terrainDesign.set', design: reference, label: ref ? 'Geländegestaltung geändert' : 'Geländegestaltung gespeichert' });
      if (err) { setNote(`Nicht gespeichert: ${err}`); return; }
      setWork({ ...work, savedVersion: version, refSha: reference.sha256 });
      setNote(`Gespeichert: ${formatNumber(reference.changed)} Spalten gestaltet. Weltkarte und Anlagen nutzen jetzt das geplante Gelände.`);
    } catch (e) { setNote(`Nicht gespeichert: ${errorText(e)}`); } finally { setBusy(''); }
  };
  const discard = () => {
    if (ref) { const err = session.execute({ kind: 'terrainDesign.set', design: null, label: 'Geländegestaltung entfernt' }); setNote(err || 'Gestaltung entfernt. Rückgängig im Editor möglich.'); }
    setWork(null); undoStack.current = []; redoStack.current = [];
  };

  const toProject = async () => {
    if (!work) return;
    if (isTurned(placement)) { setNote(`Nicht übernommen: Das Projekt liegt auf der Weltkarte ${turnLabel(turnOf(placement))}. Ein Geländebauteil passt nur zu einer ungedrehten Weltlage – Drehung auf der Weltkarte zurücksetzen, übernehmen, dann wieder drehen.`); return; }
    setBusy('Blöcke werden erzeugt'); setNote('');
    try {
      const o0 = placement?.origin ?? [0, 0, 0];
      const occupied = new Set((buildingCells ?? []).map(c => `${c.position[0] + o0[0]},${c.position[1] + o0[1]},${c.position[2] + o0[2]}`));
      const scatter = work.design.scatter?.items.length ? scatterCells(work.design, scatterCtx) : null;
      const blocks = designPayload(work.base, work.design, project.profileId || SAMPLE_PROFILE, (x, y, z) => occupied.has(`${x},${y},${z}`), scatter?.cells ?? []);
      if (!blocks) { setNote('Noch nichts gestaltet: die Gestaltung entspricht dem Gelände.'); return; }
      const asset = createAsset({ name: `Gelände ${project.name}`.slice(0, 120), tags: ['gelaende', 'landschaft'],
        description: `Geländegestaltung für „${project.name}“: ${areaLabel(work.design)}, ${formatNumber(blocks.blocks)} Blöcke setzen, ${formatNumber(blocks.air)} Blöcke abtragen (Luft)${scatter?.placed ? `, davon ${formatNumber(scatter.placed)} gestreute Natur-Bauteile` : ''}.`,
        provenance: { author: '', source: 'Eigene Geländegestaltung im Build Studio', license: 'eigene Planung' } });
      const o = blocks.origin, size = blocks.payload.bounds.maxExclusive;
      const source: AssetVersionSource = { format: 'terrain-design', localTo: project.id,
        world: { box: { min: [o[0], o[1], o[2]], maxExclusive: [o[0] + size[0], o[1] + size[1], o[2] + size[2]] }, dimension: work.design.dimension } };
      const r = await addAssetVersion(asset, { payload: blocks.payload, label: '1.0', source });
      await repo.applyBatch({ assets: [r.asset], versions: [r.version] });
      await reloadLibrary();
      const origin = placement?.origin ?? [0, 0, 0];
      const instance = newInstance({ assetVersionId: r.version.id, name: 'Gelände', transform: { position: [o[0] - origin[0], o[1] - origin[1], o[2] - origin[2]], quarterTurns: 0, mirrorX: false } });
      const ops: Operation[] = [...terrainInstances.map(i => ({ kind: 'instance.remove' as const, instanceId: i.id })), { kind: 'instance.add', instance }];
      const err = session.execute(ops.length === 1 ? ops[0]! : { kind: 'batch', label: 'Gelände ins Projekt übernommen', operations: ops });
      setNote(err || `Gelände als Bauteil im Projekt: ${formatNumber(blocks.blocks)} Blöcke setzen, ${formatNumber(blocks.air)} abtragen.${scatter?.placed ? ` Mit ${formatNumber(scatter.placed)} Bäumen, Felsen und Pflanzen der Streu-Ebene.` : ''}${blocks.skipped ? ` ${formatNumber(blocks.skipped)} Zellen bleiben den Bauten überlassen.` : ''}${terrainInstances.length ? ' Das frühere Geländebauteil wurde ersetzt.' : ''} Material, Bauen, Export und Mod enthalten es jetzt.`);
    } catch (e) { setNote(`Nicht übernommen: ${errorText(e)}`); } finally { setBusy(''); }
  };
  const runArea = (label: string, fn: (d: TerrainDesign) => string) => {
    if (!design) return;
    snapshot();
    try { const msg = fn(design); bump(); setStatsVersion(v => v + 1); setNote(msg); }
    catch (e) { undoStack.current.pop(); setNote(`${label}: ${errorText(e)}`); }
  };
  const [rules, setRules] = useState({ steep: DEFAULT_AUTO_PAINT.steep, snowY: '', beach: DEFAULT_AUTO_PAINT.beach, rest: DEFAULT_AUTO_PAINT.rest });
  const [margin, setMargin] = useState(4);
  const [areaPasses, setAreaPasses] = useState(8);
  const [pathReport, setPathReport] = useState<PathReport | null>(null);
  const lay = () => runArea('Weg', d => {
    const r = layPath(d, pathPoints, { width: pathWidth, style: pathStyle, steps: pathSteps, material: pathMaterial, water: pathWater });
    setPathReport(r); setPathPoints([]);
    const pieces = [r.stairs && `${r.stairs} Treppen`, r.slabs && `${r.slabs} Halbstufen`].filter(Boolean).join(' und ');
    return `Weg gelegt: ${r.length} Blöcke lang, ${r.columns} Spalten, ${r.steps} Höhenwechsel${pieces ? ` mit ${pieces}` : ''}${r.open ? ` (${r.open} ohne Stufe${pathSteps === 'none' ? '' : ' – dort mehr als ein Block oder unbekanntes Gelände'})` : ''}`
      + `${r.causeway ? `, ${r.causeway} Spalten als Damm durchs Wasser` : ''}${r.bridge ? `, Brücke über ${r.bridge} Spalten Wasser mit ${r.rails} Geländerfeldern` : ''}.`;
  });

  const dig = () => runArea('Fluss', d => {
    const r = carveRiver(d, riverPoints, { width: river.width, depth: river.depth, bank: river.bank, bed: river.bed, ...(river.start.trim() && { startY: Math.trunc(Number(river.start)) }), ...mask() });
    setRiverReport(r); setRiverPoints([]);
    return `Fluss gegraben: ${r.length} Blöcke lang, Wasserspiegel von Y ${r.fromY} bis Y ${r.toY}, ${formatNumber(r.columns)} Spalten Wasser (${formatNumber(r.water)} Wasserblöcke), ${formatNumber(r.banks)} Uferspalten abgeböscht`
      + `${r.embanked ? `, ${formatNumber(r.embanked)} Spalten zum Ufer aufgeschüttet` : ''}, ${formatNumber(r.cut)} abtragen, ${formatNumber(r.fill)} aufschütten${r.unknown ? `, ${r.unknown} Punkte auf unbekanntem Gelände übersprungen` : ''}.`;
  });

  // Weg aus der Weltkarte (TERRAIN-03): paths of the Weltplan that cross this design.
  const [worldPaths, setWorldPaths] = useState<WorldPath[]>([]);
  const [worldPathId, setWorldPathId] = useState('');
  const designKey = design ? `${design.dimension}|${design.minX}|${design.minZ}|${design.width}|${design.length}` : '';
  useEffect(() => {
    if (!design) { setWorldPaths([]); return; }
    let live = true;
    const inside = (x: number, z: number) => x >= design.minX && z >= design.minZ && x < design.minX + design.width && z < design.minZ + design.length;
    repo.getWorldPlan().then(plan => {
      if (!live) return;
      setWorldPaths(plan.items.filter((i): i is WorldPath => i.kind === 'path' && i.dimension === design.dimension && pathLine(i.points).some(([x, z]) => inside(x, z))));
    }, () => { if (live) setWorldPaths([]); });
    return () => { live = false; };
  }, [repo, designKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const takeWorldPath = () => {
    const p = worldPaths.find(w => w.id === worldPathId) ?? worldPaths[0];
    if (!p) return;
    setPathPoints(p.points.map(([x, z]) => [x, z] as [number, number]));
    setPathWidth(Math.max(1, Math.min(9, p.width)));
    setPathStyle(WORLD_PATH_STYLE[p.style]);
    if (p.style === 'bruecke') setPathWater('bridge');
    setNote(`„${p.name || 'Weg'}“ aus der Weltkarte übernommen: ${p.points.length} Wegpunkte, Breite ${Math.min(9, p.width)}. Prüfen und „Weg legen“ drücken.`);
  };

  // 3D preview: planned terrain as display cells.
  const preview3d = useMemo(() => {
    if (!show3d || !design || !base) return null;
    try {
      const planned = designedSurvey(base, design);
      const disp = surveyDisplayCells([planned], { maxCells: 400_000, skirt: 3 });
      const extra = [...(scatterInfo?.cells ?? []), ...pathPieceCells(design)];
      if (!disp.count) return null;
      let lo = Infinity;
      for (let k = 0; k < disp.count; k++) lo = Math.min(lo, disp.cells[k * 4 + 1]!);
      let hi = -Infinity;
      for (let k = 0; k < disp.count; k++) hi = Math.max(hi, disp.cells[k * 4 + 1]!);
      for (const c of extra) { lo = Math.min(lo, c.y); hi = Math.max(hi, c.y); }
      // Terrain columns first, then the scatter parts (they replace a terrain cell at the same place).
      const at = new Map<string, Cell>();
      for (let k = 0; k < disp.count; k++) {
        const position: [number, number, number] = [disp.cells[k * 4]! - design.minX, disp.cells[k * 4 + 1]! - lo, disp.cells[k * 4 + 2]! - design.minZ];
        at.set(position.join(','), { position, kind: 'block', paletteIndex: disp.cells[k * 4 + 3]! });
      }
      const palette = disp.ids.map(id => ({ id, properties: id === 'minecraft:water' ? { level: '0' } : {} as Record<string, string> }));
      const index = new Map<string, number>();
      for (const c of extra) {
        const key = JSON.stringify(c.state ?? c.id);
        let p = index.get(key);
        if (p === undefined) { p = palette.length; palette.push(c.state ? { id: c.state.id, properties: { ...c.state.properties } } : { id: c.id, properties: {} }); index.set(key, p); }
        const position: [number, number, number] = [c.x - design.minX, c.y - lo, c.z - design.minZ];
        if (position[0] < 0 || position[2] < 0 || position[0] >= design.width || position[2] >= design.length) continue;
        at.set(position.join(','), { position, kind: 'block', paletteIndex: p });
      }
      const cells = [...at.values()];
      const payload = createPayload({ schemaVersion: 1, profileId: SAMPLE_PROFILE, bounds: { min: [0, 0, 0], maxExclusive: [design.width, hi - lo + 1, design.length] }, pivot: [0, 0, 0], sourceOrigin: [design.minX, lo, design.minZ],
        palette, cells, blockEntities: [] }, { maxCells: 600_000 });
      return { payload, cells: payload.cells };
    } catch { return null; }
  }, [show3d, design, base, statsVersion, scatterInfo]); // eslint-disable-line react-hooks/exhaustive-deps
  const noop = useCallback((_: Cell | null) => {}, []);

  // ------------------------------------------------------------------ render
  const hoverInfo = (() => {
    if (!hover || !design || !base) return null;
    const i = (hover[0] - design.minX) + (hover[1] - design.minZ) * design.width, h = design.height[i]!;
    if (h === SURVEY_UNKNOWN) return `X ${hover[0]} · Z ${hover[1]} · unbekannt`;
    const g = base.ground[i]!, delta = h - g;
    return `X ${hover[0]} · Z ${hover[1]} · Y ${h}${delta ? ` (${delta > 0 ? '+' : ''}${delta})` : ''} · ${short(design.ids[design.top[i]!]!)}${design.water[i] !== NO_WATER ? ` · Wasser bis Y ${design.water[i]}` : ''}${design.path[i] ? ` · Weg${pieceLabel(design.path[i]!) ? ` (${pieceLabel(design.path[i]!)})` : ''}` : ''}`;
  })();
  const isBrush = tool !== 'water' && tool !== 'path' && tool !== 'ramp' && tool !== 'pick' && tool !== 'river' && (tool !== 'scatter' || scatterMode === 'remove');

  if (!work) return <section className="landscape" aria-label="Landschaft">
    <header className="landscape-head"><div><span className="panel-kicker">LANDSCHAFT GESTALTEN</span><h2>Gelände formen und bemalen</h2>
      <p className="muted">Hügel und Mulden formen, Oberflächen wie Biome bemalen, Teiche und Bäche füllen, Wege mit sanfter Steigung legen und Bauplätze einebnen. Geplant wird auf einer Kopie: in der Welt ändert sich nichts, bis du die Blöcke baust.</p></div></header>
    {loadError && <div className="notice warning" role="alert">{loadError}</div>}
    {note && <div className="notice" role="status">{note}</div>}
    {ref && !loadError && <p role="status">Gestaltung wird geladen …</p>}
    {!ref && <div className="landscape-start">
      <section aria-label="Auf der Geländeaufnahme">
        <h3>Auf der Geländeaufnahme</h3>
        {project.terrain ? <>
          <p>{areaLabel(project.terrain.area)} · {dimensionLabel(project.terrain.dimension)}{project.terrain.groundRange && <> · Boden Y {project.terrain.groundRange[0]} … {project.terrain.groundRange[1]}</>}</p>
          {surveyError && <p className="notice warning" role="alert">{surveyError}</p>}
          <button className="primary" disabled={!projectSurvey} onClick={startFromSurvey}>Gestaltung beginnen</button>
        </> : <p className="muted">Noch keine Geländeaufnahme. Hol sie unten direkt aus dem Spiel (oder im Reiter <a href={`#/projekt/${project.id}/gelaende`}>Gelände</a>), dann gestaltest du dein echtes Gelände.</p>}
      </section>
      <section aria-label="Gelände aus dem Spiel" data-testid="landscape-from-game">
        <h3>Gelände aus dem Spiel</h3>
        {placement ? <>
          <p>{areaLabel(area)} · {dimensionLabel(placement.dimension)} · ohne Dateien, mit Biomen ab Mod 0.20.0</p>
          <GameLinkBar game={game} purpose="Die Mod liefert das Gelände des Bauplatzes." />
          {gameTerrainLevel(game) !== 'none' && <button className="primary" disabled={!!gameBusy || game.phase !== 'connected' || (gameDimension(game) !== null && gameDimension(game) !== placement.dimension)}
            onClick={() => void startFromGame()}>{project.terrain ? 'Neu aus dem Spiel holen und gestalten' : 'Aus dem Spiel holen und gestalten'}</button>}
          {gameBusy && <p role="status">{gameBusy}</p>}
        </> : <p className="muted">Lege zuerst auf der <a href={`#/karte?projekt=${encodeURIComponent(project.id)}`}>Weltkarte</a> fest, wo das Projekt in deiner Welt steht.</p>}
      </section>
      <section aria-label="Auf ebenem Grund">
        <h3>Auf ebenem Grund</h3>
        <p>{areaLabel(area)}{placement ? ` · ${dimensionLabel(placement.dimension)}` : ' · Projektkoordinaten (noch keine Weltlage)'}</p>
        <label>Bodenhöhe Y <input type="number" value={flatY} onChange={e => setFlatY(Math.trunc(Number(e.target.value)) || 0)} /></label>
        <button className="secondary" onClick={startFlat}>Auf ebenem Grund beginnen</button>
      </section>
    </div>}
  </section>;

  const d = work.design;
  return <section className="landscape" aria-label="Landschaft" data-design-version={version}>
    <header className="landscape-head">
      <div><span className="panel-kicker">LANDSCHAFT GESTALTEN</span>
        <h2>{areaLabel(d)} · {dimensionLabel(d.dimension)}</h2>
        <p className="muted">{d.base.kind === 'survey' ? 'Grundlage: Geländeaufnahme' : `Grundlage: ebener Grund Y ${d.base.y}`}
          {d.base.kind === 'survey' && project.terrain && project.terrain.sha256 !== d.base.sha256 && ' (eine ältere als die aktuelle Aufnahme)'}. {DESIGN_NOTE}</p></div>
      <div className="landscape-save">
        <span className={`save-state ${dirty ? 'saving' : 'saved'}`} role="status" data-testid="landscape-state">{dirty ? 'nicht gespeichert' : 'gespeichert'}</span>
        <button onClick={undo} disabled={!undoStack.current.length} title="Strg+Z">↶ Rückgängig</button>
        <button onClick={redo} disabled={!redoStack.current.length} title="Strg+Y">↷ Wiederholen</button>
        <button className="primary" onClick={() => void save()} disabled={!!busy || !dirty}>Gestaltung speichern</button>
        <button className="text-button" onClick={discard} disabled={!!busy}>{ref ? 'Gestaltung entfernen' : 'Verwerfen'}</button>
      </div>
    </header>

    <div className="landscape-grid">
      <div className="landscape-main">
        <div className="landscape-tools" role="toolbar" aria-label="Werkzeuge">
          {([...SHAPE_TOOLS, 'erode', 'stamp', 'ramp', 'paint', 'water', 'river', 'drain', 'path', 'scatter', 'pick'] as Tool[]).map(t =>
            <button key={t} className={tool === t ? 'active' : ''} aria-pressed={tool === t} onClick={() => setTool(t)}
              title={`${TOOL_LABEL[t]} (${Object.entries(TOOL_KEYS).find(([, v]) => v === t)![0].toUpperCase()})`}>{TOOL_LABEL[t]}</button>)}
        </div>
        <p className="muted small landscape-help">{TOOL_HELP[tool]}</p>
        <div className="landscape-options">
          {isBrush && <>
            <label>Größe <input type="range" min={0} max={32} value={radius} onChange={e => setRadius(Number(e.target.value))} aria-label="Pinselgröße" /> <b>{radius * 2 + 1}</b></label>
            {tool !== 'paint' && tool !== 'drain' && tool !== 'flatten' && tool !== 'fillUp' && tool !== 'cut' && tool !== 'scatter' && tool !== 'stamp' && <label>{tool === 'soften' ? 'Höchste Stufe' : tool === 'smooth' ? 'Durchgänge' : tool === 'erode' ? 'Runden' : 'Stärke'} <input type="number" min={1} max={tool === 'smooth' ? 8 : 16} value={strength} onChange={e => setStrength(Math.max(1, Math.min(16, Math.trunc(Number(e.target.value)) || 1)))} /></label>}
            {tool !== 'paint' && tool !== 'drain' && tool !== 'scatter' && tool !== 'erode' && tool !== 'stamp' && <label>Kante <select value={falloff} onChange={e => setFalloff(e.target.value as Falloff)}><option value="soft">weich</option><option value="cone">spitz</option><option value="hard">hart</option></select></label>}
          </>}
          {(tool === 'flatten' || tool === 'fillUp' || tool === 'cut' || tool === 'pick') && <label>Zielhöhe Y <input type="number" placeholder="beim Ansetzen" value={target} onChange={e => setTarget(e.target.value)} /></label>}
          {tool === 'ramp' && <>
            <label>Breite <input type="number" min={1} max={15} value={ramp.width} onChange={e => setRamp({ ...ramp, width: Math.max(1, Math.min(15, Math.trunc(Number(e.target.value)) || 1)) })} aria-label="Rampenbreite" /></label>
            <label>Übergang <input type="number" min={0} max={16} value={ramp.margin} onChange={e => setRamp({ ...ramp, margin: Math.max(0, Math.min(16, Math.trunc(Number(e.target.value)) || 0)) })} aria-label="Rampenübergang" /></label>
            <label>Anfang Y <input type="number" placeholder="Gelände" value={ramp.from} onChange={e => setRamp({ ...ramp, from: e.target.value })} aria-label="Rampe Anfang Y" /></label>
            <label>Ende Y <input type="number" placeholder="Gelände" value={ramp.to} onChange={e => setRamp({ ...ramp, to: e.target.value })} aria-label="Rampe Ende Y" /></label>
            <span>{rampPoints.length ? 'Ende anklicken' : 'Anfang anklicken'}</span>
            {rampPoints.length > 0 && <button onClick={() => setRampPoints([])}>Abbrechen</button>}
          </>}
          {tool === 'terrace' && <label>Stufenhöhe <input type="number" min={2} max={16} value={step} onChange={e => setStep(Math.max(2, Math.min(16, Math.trunc(Number(e.target.value)) || 4)))} /></label>}
          {tool === 'paint' && <>
            <label>Stil <select value={style} onChange={e => setStyle(e.target.value)} aria-label="Oberflächenstil">{SURFACE_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}{s.path ? ' (Weg)' : ''}</option>)}</select></label>
            <span className="landscape-swatches" aria-hidden="true">{styleSwatch(style)}</span>
          </>}
          {tool === 'erode' && <>
            <label>Hang hält bis <input type="number" min={1} max={8} value={talus} onChange={e => setTalus(Math.max(1, Math.min(8, Math.trunc(Number(e.target.value)) || 1)))} aria-label="Hang hält bis" /> Blöcke</label>
            <label>Regen <select value={rain} onChange={e => setRain(Number(e.target.value) as RainAmount)} aria-label="Regen">{([0, 1, 2, 3] as RainAmount[]).map(k => <option key={k} value={k}>{RAIN_LABEL[k]}</option>)}</select></label>
          </>}
          {tool === 'stamp' && <>
            <label>Form <select value={shape} onChange={e => setShape(e.target.value as StampShape)} aria-label="Form">{(Object.keys(STAMP_LABEL) as StampShape[]).map(k => <option key={k} value={k}>{STAMP_LABEL[k]}</option>)}</select></label>
            <label>{shape === 'mulde' || shape === 'krater' ? 'Tiefe' : 'Höhe'} <input type="number" min={1} max={128} value={shapeHeight} onChange={e => setShapeHeight(Math.max(1, Math.min(128, Math.trunc(Number(e.target.value)) || 1)))} aria-label="Formhöhe" /></label>
          </>}
          {tool === 'river' && <>
            <label>Breite <input type="number" min={1} max={31} value={river.width} onChange={e => setRiver({ ...river, width: Math.max(1, Math.min(31, Math.trunc(Number(e.target.value)) || 1)) })} aria-label="Flussbreite" /></label>
            <label>Tiefe <input type="number" min={1} max={8} value={river.depth} onChange={e => setRiver({ ...river, depth: Math.max(1, Math.min(8, Math.trunc(Number(e.target.value)) || 1)) })} aria-label="Flusstiefe" /></label>
            <label>Ufer <input type="number" min={0} max={16} value={river.bank} onChange={e => setRiver({ ...river, bank: Math.max(0, Math.min(16, Math.trunc(Number(e.target.value)) || 0)) })} aria-label="Uferbreite" /></label>
            <label>Bett <select value={river.bed} onChange={e => setRiver({ ...river, bed: e.target.value as RiverBed })} aria-label="Flussbett">{(Object.keys(RIVER_BED_LABEL) as RiverBed[]).map(k => <option key={k} value={k}>{RIVER_BED_LABEL[k]}</option>)}</select></label>
            <label>Wasser am Anfang Y <input type="number" placeholder="Gelände" value={river.start} onChange={e => setRiver({ ...river, start: e.target.value })} aria-label="Wasserspiegel am Flussanfang" /></label>
            <span>{riverPoints.length} Punkte</span>
            <button className="primary" disabled={riverPoints.length < 2} onClick={dig}>Fluss graben</button>
            <button disabled={!riverPoints.length} onClick={() => setRiverPoints(p => p.slice(0, -1))}>Letzten Punkt weg</button>
            <button disabled={!riverPoints.length} onClick={() => setRiverPoints([])}>Punkte verwerfen</button>
          </>}
          {MASK_TOOLS.includes(tool) && <span className="landscape-mask" role="group" aria-label="Maske">
            <b>Maske</b>
            <label>nur Hang ab <input type="number" min={1} max={32} placeholder="–" value={filter.minSlope} onChange={e => setFilter({ ...filter, minSlope: e.target.value })} aria-label="nur Hang ab" /></label>
            <label>nur ab Y <input type="number" placeholder="–" value={filter.minY} onChange={e => setFilter({ ...filter, minY: e.target.value })} aria-label="nur ab Y" /></label>
            <label>nur bis Y <input type="number" placeholder="–" value={filter.maxY} onChange={e => setFilter({ ...filter, maxY: e.target.value })} aria-label="nur bis Y" /></label>
            <label className="chip-check"><input type="checkbox" checked={filter.onlyDry} onChange={e => setFilter({ ...filter, onlyDry: e.target.checked })} /> nicht unter Wasser</label>
            {protectMask && <>
              <label className="chip-check"><input type="checkbox" checked={protectSites} onChange={e => setProtectSites(e.target.checked)} aria-label="Bauplätze schützen" /> Bauplätze schützen ({formatNumber(maskCount(protectMask))} Spalten)</label>
              {protectSites && <label>Rand <input type="number" min={0} max={16} value={protectMargin} onChange={e => setProtectMargin(Math.max(0, Math.min(16, Math.trunc(Number(e.target.value)) || 0)))} aria-label="Schutzrand" /></label>}
            </>}
          </span>}
          {(tool === 'water' || tool === 'pick') && <label>Wasserspiegel Y <input type="number" placeholder="Boden + 2" value={waterLevel} onChange={e => setWaterLevel(e.target.value)} aria-label="Wasserspiegel" /></label>}
          {tool === 'scatter' && <>
            <span className="scatter-modes" role="radiogroup" aria-label="Streuen">
              <label className="chip-check"><input type="radio" name="scatter-mode" checked={scatterMode === 'add'} onChange={() => setScatterMode('add')} /> Setzen</label>
              <label className="chip-check"><input type="radio" name="scatter-mode" checked={scatterMode === 'remove'} onChange={() => setScatterMode('remove')} /> Entfernen</label>
            </span>
            {scatterMode === 'add' && (d.scatter?.layers.length
              ? <label>Ebene <select value={scatterLayer ?? d.scatter.layers[0]!.id} onChange={e => setScatterLayer(e.target.value)} aria-label="Streu-Ebene zum Setzen">
                {d.scatter.layers.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
              : <span className="muted">Erst rechts eine Streu-Ebene anlegen.</span>)}
          </>}
          {tool === 'path' && <>
            <label>Belag <select value={pathStyle} onChange={e => setPathStyle(e.target.value)} aria-label="Wegbelag">{SURFACE_STYLES.filter(s => s.path).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
            <label>Breite <input type="number" min={1} max={9} value={pathWidth} onChange={e => setPathWidth(Math.max(1, Math.min(9, Math.trunc(Number(e.target.value)) || 1)))} aria-label="Wegbreite" /></label>
            <label>Stufen <select value={pathSteps} onChange={e => setPathSteps(e.target.value as PathSteps)} aria-label="Wegstufen">{(Object.keys(STEPS_LABEL) as PathSteps[]).map(k => <option key={k} value={k}>{STEPS_LABEL[k]}</option>)}</select></label>
            <label>Material <select value={pathMaterial} onChange={e => setPathMaterial(e.target.value)} aria-label="Stufenmaterial">
              <option value="auto">passend zum Belag ({PATH_MATERIALS.find(m => m.id === (PATH_STYLE_MATERIAL[pathStyle] ?? 'fichte'))?.label})</option>
              {PATH_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            <label>Über Wasser <select value={pathWater} onChange={e => setPathWater(e.target.value as PathWater)} aria-label="Weg über Wasser"><option value="causeway">Damm</option><option value="bridge">Brücke mit Geländer</option></select></label>
            <span>{pathPoints.length} Punkte</span>
            <button className="primary" disabled={pathPoints.length < 2} onClick={lay}>Weg legen</button>
            <button disabled={!pathPoints.length} onClick={() => setPathPoints(p => p.slice(0, -1))}>Letzten Punkt weg</button>
            <button disabled={!pathPoints.length} onClick={() => setPathPoints([])}>Punkte verwerfen</button>
            {worldPaths.length > 0 && <span className="landscape-worldpath">
              <label>Weg aus der Weltkarte <select value={worldPathId || worldPaths[0]!.id} onChange={e => setWorldPathId(e.target.value)} aria-label="Weg aus der Weltkarte">
                {worldPaths.map(w => <option key={w.id} value={w.id}>{w.name || 'Weg'} ({w.points.length} Punkte)</option>)}</select></label>
              <button onClick={takeWorldPath}>Übernehmen</button>
            </span>}
          </>}
        </div>
        <div className="landscape-view">
          <div className="landscape-modes" role="radiogroup" aria-label="Ansicht">{(Object.keys(CANVAS_MODE_LABEL) as CanvasMode[]).map(m =>
            <label key={m} className="chip-check"><input type="radio" name="landscape-mode" checked={mode === m} onChange={() => setMode(m)} /> {CANVAS_MODE_LABEL[m]}</label>)}
            <label className="chip-check"><input type="checkbox" checked={show3d} onChange={e => setShow3d(e.target.checked)} /> 3D-Vorschau</label>
          </div>
          <DesignCanvas design={d} base={work.base} version={version} mode={mode} handlers={handlers} brushRadius={isBrush ? radius : null}
            hover={hover} pathPoints={tool === 'ramp' ? rampPoints : tool === 'river' ? riverPoints : pathPoints} footprint={footprintPath} scatter={scatterDots} />
          <p className="landscape-hover" aria-live="polite" data-testid="landscape-hover">{hoverInfo ?? 'Zeiger über die Karte bewegen: Höhe und Block erscheinen hier. Tasten: A/S/G/E/U/K/R/T/H formen, V verwittern, F Formstempel, L Fluss, M Rampe, B malen, W Wasser, D trocknen, P Weg, N Streuen, I Pipette, +/− Größe.'}</p>
          {show3d && <div className="landscape-3d build-3d">{preview3d ? <Viewer payload={preview3d.payload} cells={preview3d.cells} onSelect={noop} /> : <p className="muted">3D-Vorschau nicht verfügbar (zu groß).</p>}</div>}
        </div>
        {note && <div className="notice" role="status" data-testid="landscape-note">{note}</div>}
        {busy && <div className="notice" role="status">{busy} …</div>}
      </div>

      <aside className="landscape-side">
        <h3>Bilanz gegenüber {d.base.kind === 'survey' ? 'der Aufnahme' : 'ebenem Grund'}</h3>
        {stats && <dl className="landscape-stats" data-testid="landscape-stats">
          <dt>Gestaltete Spalten</dt><dd data-stat="changed">{formatNumber(stats.changed)}</dd>
          <dt>Abtragen</dt><dd data-stat="cut">{formatNumber(stats.cut)} Blöcke ({formatNumber(stats.lowered)} Spalten)</dd>
          <dt>Aufschütten</dt><dd data-stat="fill">{formatNumber(stats.fill)} Blöcke ({formatNumber(stats.raised)} Spalten)</dd>
          <dt>Neu bemalt</dt><dd>{formatNumber(stats.repainted)} Spalten</dd>
          <dt>Wasser</dt><dd data-stat="water">{formatNumber(stats.water)} Blöcke{stats.drained ? `, ${formatNumber(stats.drained)} Spalten trockengelegt` : ''}</dd>
          <dt>Wege</dt><dd data-stat="path">{formatNumber(stats.path)} Spalten</dd>
          {(stats.stairs > 0 || stats.slabs > 0 || stats.deck > 0) && <><dt>Wegstufen und Brücken</dt><dd data-stat="pieces">{[stats.stairs && `${formatNumber(stats.stairs)} Treppen`, stats.slabs && `${formatNumber(stats.slabs)} Halbstufen`, stats.deck && `${formatNumber(stats.deck)} Brückenfelder`].filter(Boolean).join(', ')}</dd></>}
          {stats.heightRange && <><dt>Höhen</dt><dd>Y {stats.heightRange[0]} … {stats.heightRange[1]}</dd></>}
        </dl>}
        {stats && stats.materials.length > 0 && <><h4>Material zum Setzen</h4>
          <table className="landscape-materials"><tbody>{stats.materials.slice(0, 10).map(m => <tr key={m.id}><td><i style={{ background: swatchColor(m.id) }} /> {short(m.id)}</td><td>{formatNumber(m.count)}</td></tr>)}</tbody></table>
          {stats.materials.length > 10 && <p className="muted small">… und {stats.materials.length - 10} weitere</p>}</>}
        {pathReport && <p className="muted small" data-testid="path-report">Letzter Weg: {pathReport.length} Blöcke, {pathReport.rise} Blöcke Höhenunterschied in {pathReport.steps} Stufen{pathReport.stairs ? `, ${pathReport.stairs} Treppen` : ''}{pathReport.slabs ? `, ${pathReport.slabs} Halbstufen` : ''}{pathReport.open ? `, ${pathReport.open} ohne Stufe` : ''}{pathReport.bridge ? `, ${pathReport.bridge} Brückenfelder` : ''}, {formatNumber(pathReport.cut)} abtragen, {formatNumber(pathReport.fill)} aufschütten{pathReport.unknown ? `, ${pathReport.unknown} Punkte auf unbekanntem Gelände` : ''}.</p>}

        {riverReport && <p className="muted small" data-testid="river-report">Letzter Fluss: {riverReport.length} Blöcke, Wasserspiegel Y {riverReport.fromY} → Y {riverReport.toY}, {formatNumber(riverReport.columns)} Spalten Wasser, {formatNumber(riverReport.banks)} Uferspalten{riverReport.embanked ? `, ${formatNumber(riverReport.embanked)} aufgeschüttet` : ''}.</p>}

        <h3>Ganze Fläche</h3>
        <details className="landscape-area" data-testid="landscape-erode">
          <summary>Verwittern lassen</summary>
          <p className="muted small">Wie Erosion in anderen Weltplanern: steile Stufen bröckeln zum Hangfuß, Regen wäscht Rinnen aus und legt die Erde unten ab. Wege, Wasser und geschützte Bauplätze bleiben. Die Maske oben gilt mit.</p>
          <label>Runden <input type="number" min={1} max={32} value={areaPasses} onChange={e => setAreaPasses(Math.max(1, Math.min(32, Math.trunc(Number(e.target.value)) || 1)))} aria-label="Runden ganze Fläche" /></label>
          <label>Hang hält bis <input type="number" min={1} max={8} value={talus} onChange={e => setTalus(Math.max(1, Math.min(8, Math.trunc(Number(e.target.value)) || 1)))} aria-label="Hang hält bis, ganze Fläche" /> Blöcke</label>
          <label>Regen <select value={rain} onChange={e => setRain(Number(e.target.value) as RainAmount)} aria-label="Regen, ganze Fläche">{([0, 1, 2, 3] as RainAmount[]).map(k => <option key={k} value={k}>{RAIN_LABEL[k]}</option>)}</select></label>
          <button className="secondary" onClick={() => runArea('Verwittern', x => {
            const r = erodeTerrain(x, { passes: areaPasses, talus, rain, ...mask() });
            return r.columns ? `${formatNumber(r.columns)} Spalten verwittert, ${formatNumber(r.moved)} Blöcke Erde hangab gerutscht${r.gullies ? `, ${formatNumber(r.gullies)} ${r.gullies === 1 ? "Rinne" : "Rinnen"} ausgewaschen` : ''}.` : 'Nichts verwittert: kein Hang ist steiler als erlaubt.';
          })}>Ganze Fläche verwittern</button>
        </details>
        <details className="landscape-area">
          <summary>Automatisch bemalen</summary>
          <p className="muted small">Wie automatische Ebenen anderer Weltplaner: Fels an steilen Hängen, Schnee ab einer Höhe, Strand am Wasser, sonst der gewählte Stil. Wege bleiben.</p>
          <label>Fels ab Hangstufe <input type="number" min={1} max={16} value={rules.steep} onChange={e => setRules({ ...rules, steep: Math.max(1, Math.trunc(Number(e.target.value)) || 3) })} /></label>
          <label>Schnee ab Y <input type="number" placeholder="kein Schnee" value={rules.snowY} onChange={e => setRules({ ...rules, snowY: e.target.value })} /></label>
          <label>Strand bis <input type="number" min={0} max={8} value={rules.beach} onChange={e => setRules({ ...rules, beach: Math.max(0, Math.trunc(Number(e.target.value)) || 0) })} /> Blöcke vom Wasser</label>
          <label>Sonst <select value={rules.rest} onChange={e => setRules({ ...rules, rest: e.target.value })}>{SURFACE_STYLES.filter(s => !s.path).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <button className="secondary" onClick={() => runArea('Automatisch bemalen', x => `${formatNumber(autoPaint(x, { steep: rules.steep, snowY: rules.snowY.trim() ? Number(rules.snowY) : null, beach: rules.beach, rest: rules.rest }))} Spalten automatisch bemalt.`)}>Automatisch bemalen</button>
        </details>
        {work.base.biomes && <details className="landscape-area" data-testid="landscape-biomes">
          <summary>Nach Biomen bemalen</summary>
          <p className="muted small">Die Mod hat die Biome des Bauplatzes mitgeliefert: {biomeShares(work.base).slice(0, 5).map(b => `${biomeLabel(b.id)} (${formatNumber(b.columns)})`).join(', ')}. Jede Spalte bekommt den passenden Stil (Wald, Wüste, Schnee, Strand …). Wege und Wasser bleiben.</p>
          <button className="secondary" onClick={() => runArea('Nach Biomen bemalen', x => `${formatNumber(paintByBiome(x, work.base))} Spalten nach Biomen bemalt.`)}>Nach Biomen bemalen</button>
        </details>}
        <details className="landscape-area">
          <summary>Bauplätze einebnen</summary>
          {footprint ? <>
            <p className="muted small">Unter jedem geplanten Block liegt der Boden danach genau eine Schicht tiefer: kein Fundament hängt, nichts steckt im Hang. Der Rand läuft weich ins Gelände aus.</p>
            <label>Übergang <input type="number" min={0} max={32} value={margin} onChange={e => setMargin(Math.max(0, Math.min(32, Math.trunc(Number(e.target.value)) || 0)))} /> Blöcke</label>
            <button className="secondary" onClick={() => runArea('Bauplätze einebnen', x => {
              const r = gradeFootprints(x, footprint, margin);
              return `${formatNumber(r.graded)} Spalten unter den Bauten angepasst, ${formatNumber(r.blended)} im Übergang${r.outside ? `, ${formatNumber(r.outside)} außerhalb der Gestaltung` : ''}.`;
            })}>Bauplätze einebnen</button>
          </> : <p className="muted small">Braucht eine Weltlage und geplante Bauten im Projekt.</p>}
        </details>
        <details className="landscape-area">
          <summary>Zurücksetzen</summary>
          <p className="muted small">Setzt die ganze Gestaltung auf die Grundlage zurück (rückgängig machbar).</p>
          <button onClick={() => runArea('Zurücksetzen', x => { resetToBase(x, work.base); return 'Auf die Grundlage zurückgesetzt.'; })}>Alles zurücksetzen</button>
        </details>

        <h3>Streu-Ebene</h3>
        <ScatterPanel design={d} ctx={scatterCtx} resolve={resolve} stencils={stencils} info={scatterInfo} active={scatterLayer}
          onActive={id => { setScatterLayer(id); if (id) { setTool('scatter'); setScatterMode('add'); } }} run={runArea} />

        <h3>Übergabe</h3>
        <ul className="landscape-handover">
          <li><button className="secondary" disabled={!!busy || (!stats?.changed && !scatterInfo?.placed)} onClick={() => void toProject()}>{terrainInstances.length ? 'Geländebauteil im Projekt erneuern' : 'Als Bauteil ins Projekt übernehmen'}</button>
            <small className="muted">Setzt die Blöcke (mit Luft zum Abtragen) samt Streu-Ebene als Bauteil an die Weltlage. Danach zählen Material, Bauen, Export und die Mod Gelände, Bäume und Felsen mit.</small></li>
          <li><a href={`#/karte?projekt=${encodeURIComponent(project.id)}`}>Auf der Weltkarte ansehen</a> <small className="muted">nach dem Speichern als geplantes Gelände</small></li>
          <li><a href={`#/bibliothek/anlagen?ziel=${encodeURIComponent(project.id)}`}>Anlage auf diesem Gelände planen</a> <small className="muted">Terrassen und flachster Platz rechnen mit dem geplanten Gelände</small></li>
        </ul>
      </aside>
    </div>
  </section>;
}

const swatchColor = (id: string) => faceColors(id).top;
function styleSwatch(styleId: string) {
  const s = SURFACE_STYLES.find(x => x.id === styleId);
  return s ? s.top.map(([id]) => <i key={id} title={short(id)} style={{ background: faceColors(id).top }} />) : null;
}
