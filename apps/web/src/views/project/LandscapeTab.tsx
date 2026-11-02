import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BRUSH_LABEL, DEFAULT_AUTO_PAINT, DESIGN_NOTE, NO_WATER, SAMPLE_PROFILE, SURFACE_STYLES, SURVEY_UNKNOWN, addAssetVersion, applyBrush, autoPaint, cloneDesign, columnBases,
  compareDesign, createAsset, designFromSurvey, designMatchesBase, designPayload, designedSurvey, dimensionLabel, flatSurvey, floodWater, gradeFootprints,
  heightLimits, layPath, newInstance, positionKey, resetToBase, strokePoints, surveyDisplayCells, translateBounds,
} from '../../../../../packages/domain/src/index.js';
import type { AssetVersionSource, Brush, BrushTool, DesignStats, Falloff, Operation, PathReport, TerrainDesign, TerrainSurvey } from '../../../../../packages/domain/src/index.js';
import { createPayload } from '../../../../../packages/voxel/src/index.js';
import type { Cell } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { faceColors } from '../../colors';
import { errorText, formatNumber } from '../../app/ui';
import { Viewer } from '../../Viewer';
import { loadDesign, loadDesignBase, storeDesign } from '../world/designs';
import { areaAround, areaLabel, useSurvey } from '../world/surveys';
import { CANVAS_MODE_LABEL, DesignCanvas } from './landscape/DesignCanvas';
import type { CanvasMode } from './landscape/DesignCanvas';
import { isResolved } from './session';
import type { ProjectSession } from './session';
import './landscape/landscape.css';

type Tool = BrushTool | 'water' | 'path' | 'pick';
const SHAPE_TOOLS: readonly BrushTool[] = ['raise', 'lower', 'smooth', 'flatten', 'roughen', 'terrace', 'soften'];
const TOOL_KEYS: Readonly<Record<string, Tool>> = { a: 'raise', s: 'lower', g: 'smooth', e: 'flatten', r: 'roughen', t: 'terrace', h: 'soften', b: 'paint', w: 'water', d: 'drain', p: 'path', i: 'pick' };
const TOOL_HELP: Readonly<Record<Tool, string>> = {
  raise: 'Ziehen hebt das Gelände an, die Kante läuft weich aus.', lower: 'Ziehen senkt das Gelände ab.', smooth: 'Ziehen gleicht Höhen an die Nachbarn an.',
  flatten: 'Ziehen ebnet auf die Zielhöhe ein (leer = Höhe beim Ansetzen).', roughen: 'Ziehen macht das Gelände unruhig (Hügel, Mulden), immer gleich für dieselbe Stelle.',
  terrace: 'Ziehen rastet Höhen auf Stufen ein (Terrassenfelder, Weinberg).', soften: 'Ziehen trägt Klippen ab, bis keine Stufe höher als die Stärke ist.',
  paint: 'Ziehen bemalt die Oberfläche mit dem Stil, auf Wunsch nur an Hängen oder in Höhenbereichen.', drain: 'Ziehen entfernt Wasser.',
  water: 'Klick füllt Wasser bis zum Wasserspiegel – wie ein Eimer in einer Mulde.', path: 'Klicks setzen Wegpunkte, „Weg legen“ baut den Weg mit höchstens einem Block Steigung je Schritt.',
  pick: 'Klick übernimmt Höhe und Block der Stelle als Zielhöhe und Wasserspiegel.',
};
const TOOL_LABEL: Readonly<Record<Tool, string>> = { ...BRUSH_LABEL, water: 'Wasser füllen', path: 'Weg', pick: 'Pipette' };
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
  const [mode, setMode] = useState<CanvasMode>('terrain');
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [show3d, setShow3d] = useState(false);
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
    ...(t === 'flatten' && flat !== undefined && { target: flat }),
    ...(t === 'paint' && { filter: {
      ...(filter.minSlope.trim() && { minSlope: Number(filter.minSlope) }), ...(filter.minY.trim() && { minY: Number(filter.minY) }),
      ...(filter.maxY.trim() && { maxY: Number(filter.maxY) }), ...(filter.onlyDry && { onlyDry: true }) } }),
    };
  };
  const heightAt = (x: number, z: number) => design ? design.height[(x - design.minX) + (z - design.minZ) * design.width]! : SURVEY_UNKNOWN;

  const handlers = {
    start(x: number, z: number) {
      if (!design) return;
      setNote('');
      if (tool === 'path') { setPathPoints(p => [...p, [x, z]]); return; }
      if (tool === 'pick') {
        const h = heightAt(x, z);
        if (h === SURVEY_UNKNOWN) { setNote('Unbekanntes Gelände an dieser Stelle.'); return; }
        const i = (x - design.minX) + (z - design.minZ) * design.width;
        setTarget(String(h)); setWaterLevel(String(design.water[i] !== NO_WATER ? design.water[i] : h + 1));
        setNote(`Übernommen: Höhe Y ${h}, ${short(design.ids[design.top[i]!]!)}. Zielhöhe und Wasserspiegel gesetzt.`);
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
      stroke.current.changed += applyBrush(design, x, z, brush(tool, stroke.current.target));
      bump();
    },
    move(x: number, z: number) {
      const s = stroke.current;
      if (!design || !s || (x === s.last[0] && z === s.last[1])) return;
      for (const [px, pz] of strokePoints(s.last[0], s.last[1], x, z, radius)) s.changed += applyBrush(design, px, pz, brush(tool as BrushTool, s.target));
      s.last = [x, z];
      bump();
    },
    end() {
      const s = stroke.current; stroke.current = null;
      if (!s) return;
      if (!s.changed) undoStack.current.pop();
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
    return cells.length ? cells : null;
  }, [session.resolution, placement, terrainInstances]);
  const footprint = useMemo(() => buildingCells && placement ? columnBases(buildingCells, placement.origin) : null, [buildingCells, placement]);
  const footprintPath = useMemo(() => {
    if (!footprint || !design) return null;
    return footprint.filter(c => c.x >= design.minX && c.z >= design.minZ && c.x < design.minX + design.width && c.z < design.minZ + design.length)
      .map(c => `M${c.x - design.minX} ${c.z - design.minZ}h1v1h-1z`).join('');
  }, [footprint, design]);

  // ------------------------------------------------------------------ start
  const area = useMemo(() => {
    if (placement && isResolved(session.resolution) && session.resolution.world && session.resolution.world.cells.length) {
      const b = translateBounds(session.resolution.world.bounds, placement.origin);
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
    setBusy('Blöcke werden erzeugt'); setNote('');
    try {
      const o0 = placement?.origin ?? [0, 0, 0];
      const occupied = new Set((buildingCells ?? []).map(c => `${c.position[0] + o0[0]},${c.position[1] + o0[1]},${c.position[2] + o0[2]}`));
      const blocks = designPayload(work.base, work.design, project.profileId || SAMPLE_PROFILE, (x, y, z) => occupied.has(`${x},${y},${z}`));
      if (!blocks) { setNote('Noch nichts gestaltet: die Gestaltung entspricht dem Gelände.'); return; }
      const asset = createAsset({ name: `Gelände ${project.name}`.slice(0, 120), tags: ['gelaende', 'landschaft'],
        description: `Geländegestaltung für „${project.name}“: ${areaLabel(work.design)}, ${formatNumber(blocks.blocks)} Blöcke setzen, ${formatNumber(blocks.air)} Blöcke abtragen (Luft).`,
        provenance: { author: '', source: 'Eigene Geländegestaltung im Bauplaner', license: 'eigene Planung' } });
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
      setNote(err || `Gelände als Bauteil im Projekt: ${formatNumber(blocks.blocks)} Blöcke setzen, ${formatNumber(blocks.air)} abtragen.${blocks.skipped ? ` ${formatNumber(blocks.skipped)} Zellen bleiben den Bauten überlassen.` : ''}${terrainInstances.length ? ' Das frühere Geländebauteil wurde ersetzt.' : ''} Material, Bauen, Export und Mod enthalten es jetzt.`);
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
  const [pathReport, setPathReport] = useState<PathReport | null>(null);
  const lay = () => runArea('Weg', d => {
    const r = layPath(d, pathPoints, { width: pathWidth, style: pathStyle });
    setPathReport(r); setPathPoints([]);
    return `Weg gelegt: ${r.length} Blöcke lang, ${r.columns} Spalten, ${r.steps} Höhenwechsel (Stufen oder Treppen setzen)${r.causeway ? `, ${r.causeway} Spalten als Damm durchs Wasser` : ''}.`;
  });

  // 3D preview: planned terrain as display cells.
  const preview3d = useMemo(() => {
    if (!show3d || !design || !base) return null;
    try {
      const planned = designedSurvey(base, design);
      const disp = surveyDisplayCells([planned], { maxCells: 400_000, skirt: 3 });
      if (!disp.count) return null;
      let lo = Infinity;
      for (let k = 0; k < disp.count; k++) lo = Math.min(lo, disp.cells[k * 4 + 1]!);
      let hi = -Infinity;
      for (let k = 0; k < disp.count; k++) hi = Math.max(hi, disp.cells[k * 4 + 1]!);
      const cells: Cell[] = [];
      for (let k = 0; k < disp.count; k++) cells.push({ position: [disp.cells[k * 4]! - design.minX, disp.cells[k * 4 + 1]! - lo, disp.cells[k * 4 + 2]! - design.minZ], kind: 'block', paletteIndex: disp.cells[k * 4 + 3]! });
      const payload = createPayload({ schemaVersion: 1, profileId: SAMPLE_PROFILE, bounds: { min: [0, 0, 0], maxExclusive: [design.width, hi - lo + 1, design.length] }, pivot: [0, 0, 0], sourceOrigin: [design.minX, lo, design.minZ],
        palette: disp.ids.map(id => ({ id, properties: id === 'minecraft:water' ? { level: '0' } : {} })), cells, blockEntities: [] }, { maxCells: 400_000 });
      return { payload, cells: payload.cells };
    } catch { return null; }
  }, [show3d, design, base, statsVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const noop = useCallback((_: Cell | null) => {}, []);

  // ------------------------------------------------------------------ render
  const hoverInfo = (() => {
    if (!hover || !design || !base) return null;
    const i = (hover[0] - design.minX) + (hover[1] - design.minZ) * design.width, h = design.height[i]!;
    if (h === SURVEY_UNKNOWN) return `X ${hover[0]} · Z ${hover[1]} · unbekannt`;
    const g = base.ground[i]!, delta = h - g;
    return `X ${hover[0]} · Z ${hover[1]} · Y ${h}${delta ? ` (${delta > 0 ? '+' : ''}${delta})` : ''} · ${short(design.ids[design.top[i]!]!)}${design.water[i] !== NO_WATER ? ` · Wasser bis Y ${design.water[i]}` : ''}${design.path[i] ? ' · Weg' : ''}`;
  })();
  const isBrush = tool !== 'water' && tool !== 'path' && tool !== 'pick';

  if (!work) return <section className="landscape" aria-label="Landschaft">
    <header className="landscape-head"><div><span className="panel-kicker">LANDSCHAFT GESTALTEN</span><h2>Gelände formen und bemalen</h2>
      <p className="muted">Hügel und Mulden formen, Oberflächen wie Biome bemalen, Teiche und Bäche füllen, Wege mit sanfter Steigung legen und Bauplätze einebnen. Geplant wird auf einer Kopie: in der Welt ändert sich nichts, bis du die Blöcke baust.</p></div></header>
    {loadError && <div className="notice warning" role="alert">{loadError}</div>}
    {ref && !loadError && <p role="status">Gestaltung wird geladen …</p>}
    {!ref && <div className="landscape-start">
      <section aria-label="Auf der Geländeaufnahme">
        <h3>Auf der Geländeaufnahme</h3>
        {project.terrain ? <>
          <p>{areaLabel(project.terrain.area)} · {dimensionLabel(project.terrain.dimension)}{project.terrain.groundRange && <> · Boden Y {project.terrain.groundRange[0]} … {project.terrain.groundRange[1]}</>}</p>
          {surveyError && <p className="notice warning" role="alert">{surveyError}</p>}
          <button className="primary" disabled={!projectSurvey} onClick={startFromSurvey}>Gestaltung beginnen</button>
        </> : <p className="muted">Noch keine Geländeaufnahme. Nimm sie im Reiter <a href={`#/projekt/${project.id}/gelaende`}>Gelände</a> aus deinen Regionsdateien auf, dann gestaltest du dein echtes Gelände.</p>}
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
          {([...SHAPE_TOOLS, 'paint', 'water', 'drain', 'path', 'pick'] as Tool[]).map(t =>
            <button key={t} className={tool === t ? 'active' : ''} aria-pressed={tool === t} onClick={() => setTool(t)}
              title={`${TOOL_LABEL[t]} (${Object.entries(TOOL_KEYS).find(([, v]) => v === t)![0].toUpperCase()})`}>{TOOL_LABEL[t]}</button>)}
        </div>
        <p className="muted small landscape-help">{TOOL_HELP[tool]}</p>
        <div className="landscape-options">
          {isBrush && <>
            <label>Größe <input type="range" min={0} max={32} value={radius} onChange={e => setRadius(Number(e.target.value))} aria-label="Pinselgröße" /> <b>{radius * 2 + 1}</b></label>
            {tool !== 'paint' && tool !== 'drain' && tool !== 'flatten' && <label>{tool === 'soften' ? 'Höchste Stufe' : tool === 'smooth' ? 'Durchgänge' : 'Stärke'} <input type="number" min={1} max={tool === 'smooth' ? 8 : 16} value={strength} onChange={e => setStrength(Math.max(1, Math.min(16, Math.trunc(Number(e.target.value)) || 1)))} /></label>}
            {tool !== 'paint' && tool !== 'drain' && <label>Kante <select value={falloff} onChange={e => setFalloff(e.target.value as Falloff)}><option value="soft">weich</option><option value="cone">spitz</option><option value="hard">hart</option></select></label>}
          </>}
          {(tool === 'flatten' || tool === 'pick') && <label>Zielhöhe Y <input type="number" placeholder="beim Ansetzen" value={target} onChange={e => setTarget(e.target.value)} /></label>}
          {tool === 'terrace' && <label>Stufenhöhe <input type="number" min={2} max={16} value={step} onChange={e => setStep(Math.max(2, Math.min(16, Math.trunc(Number(e.target.value)) || 4)))} /></label>}
          {tool === 'paint' && <>
            <label>Stil <select value={style} onChange={e => setStyle(e.target.value)} aria-label="Oberflächenstil">{SURFACE_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}{s.path ? ' (Weg)' : ''}</option>)}</select></label>
            <label>nur Hang ab <input type="number" min={1} max={32} placeholder="–" value={filter.minSlope} onChange={e => setFilter({ ...filter, minSlope: e.target.value })} aria-label="nur Hang ab" /></label>
            <label>nur ab Y <input type="number" placeholder="–" value={filter.minY} onChange={e => setFilter({ ...filter, minY: e.target.value })} aria-label="nur ab Y" /></label>
            <label>nur bis Y <input type="number" placeholder="–" value={filter.maxY} onChange={e => setFilter({ ...filter, maxY: e.target.value })} aria-label="nur bis Y" /></label>
            <label className="chip-check"><input type="checkbox" checked={filter.onlyDry} onChange={e => setFilter({ ...filter, onlyDry: e.target.checked })} /> nicht unter Wasser</label>
            <span className="landscape-swatches" aria-hidden="true">{styleSwatch(style)}</span>
          </>}
          {(tool === 'water' || tool === 'pick') && <label>Wasserspiegel Y <input type="number" placeholder="Boden + 2" value={waterLevel} onChange={e => setWaterLevel(e.target.value)} aria-label="Wasserspiegel" /></label>}
          {tool === 'path' && <>
            <label>Belag <select value={pathStyle} onChange={e => setPathStyle(e.target.value)} aria-label="Wegbelag">{SURFACE_STYLES.filter(s => s.path).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
            <label>Breite <input type="number" min={1} max={9} value={pathWidth} onChange={e => setPathWidth(Math.max(1, Math.min(9, Math.trunc(Number(e.target.value)) || 1)))} aria-label="Wegbreite" /></label>
            <span>{pathPoints.length} Punkte</span>
            <button className="primary" disabled={pathPoints.length < 2} onClick={lay}>Weg legen</button>
            <button disabled={!pathPoints.length} onClick={() => setPathPoints(p => p.slice(0, -1))}>Letzten Punkt weg</button>
            <button disabled={!pathPoints.length} onClick={() => setPathPoints([])}>Punkte verwerfen</button>
          </>}
        </div>
        <div className="landscape-view">
          <div className="landscape-modes" role="radiogroup" aria-label="Ansicht">{(Object.keys(CANVAS_MODE_LABEL) as CanvasMode[]).map(m =>
            <label key={m} className="chip-check"><input type="radio" name="landscape-mode" checked={mode === m} onChange={() => setMode(m)} /> {CANVAS_MODE_LABEL[m]}</label>)}
            <label className="chip-check"><input type="checkbox" checked={show3d} onChange={e => setShow3d(e.target.checked)} /> 3D-Vorschau</label>
          </div>
          <DesignCanvas design={d} base={work.base} version={version} mode={mode} handlers={handlers} brushRadius={isBrush ? radius : null}
            hover={hover} pathPoints={pathPoints} footprint={footprintPath} />
          <p className="landscape-hover" aria-live="polite" data-testid="landscape-hover">{hoverInfo ?? 'Zeiger über die Karte bewegen: Höhe und Block erscheinen hier. Tasten: A/S/G/E/R/T/H formen, B malen, W Wasser, D trocknen, P Weg, I Pipette, +/− Größe.'}</p>
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
          {stats.heightRange && <><dt>Höhen</dt><dd>Y {stats.heightRange[0]} … {stats.heightRange[1]}</dd></>}
        </dl>}
        {stats && stats.materials.length > 0 && <><h4>Material zum Setzen</h4>
          <table className="landscape-materials"><tbody>{stats.materials.slice(0, 10).map(m => <tr key={m.id}><td><i style={{ background: swatchColor(m.id) }} /> {short(m.id)}</td><td>{formatNumber(m.count)}</td></tr>)}</tbody></table>
          {stats.materials.length > 10 && <p className="muted small">… und {stats.materials.length - 10} weitere</p>}</>}
        {pathReport && <p className="muted small">Letzter Weg: {pathReport.length} Blöcke, {pathReport.rise} Blöcke Höhenunterschied in {pathReport.steps} Stufen, {formatNumber(pathReport.cut)} abtragen, {formatNumber(pathReport.fill)} aufschütten{pathReport.unknown ? `, ${pathReport.unknown} Punkte auf unbekanntem Gelände` : ''}.</p>}

        <h3>Ganze Fläche</h3>
        <details className="landscape-area">
          <summary>Automatisch bemalen</summary>
          <p className="muted small">Wie automatische Ebenen anderer Weltplaner: Fels an steilen Hängen, Schnee ab einer Höhe, Strand am Wasser, sonst der gewählte Stil. Wege bleiben.</p>
          <label>Fels ab Hangstufe <input type="number" min={1} max={16} value={rules.steep} onChange={e => setRules({ ...rules, steep: Math.max(1, Math.trunc(Number(e.target.value)) || 3) })} /></label>
          <label>Schnee ab Y <input type="number" placeholder="kein Schnee" value={rules.snowY} onChange={e => setRules({ ...rules, snowY: e.target.value })} /></label>
          <label>Strand bis <input type="number" min={0} max={8} value={rules.beach} onChange={e => setRules({ ...rules, beach: Math.max(0, Math.trunc(Number(e.target.value)) || 0) })} /> Blöcke vom Wasser</label>
          <label>Sonst <select value={rules.rest} onChange={e => setRules({ ...rules, rest: e.target.value })}>{SURFACE_STYLES.filter(s => !s.path).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <button className="secondary" onClick={() => runArea('Automatisch bemalen', x => `${formatNumber(autoPaint(x, { steep: rules.steep, snowY: rules.snowY.trim() ? Number(rules.snowY) : null, beach: rules.beach, rest: rules.rest }))} Spalten automatisch bemalt.`)}>Automatisch bemalen</button>
        </details>
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

        <h3>Übergabe</h3>
        <ul className="landscape-handover">
          <li><button className="secondary" disabled={!!busy || !stats?.changed} onClick={() => void toProject()}>{terrainInstances.length ? 'Geländebauteil im Projekt erneuern' : 'Als Bauteil ins Projekt übernehmen'}</button>
            <small className="muted">Setzt die Blöcke (mit Luft zum Abtragen) als Bauteil an die Weltlage. Danach zählen Material, Bauen, Export und die Mod das Gelände mit.</small></li>
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
