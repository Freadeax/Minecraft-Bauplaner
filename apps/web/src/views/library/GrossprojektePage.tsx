import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { Cell } from '../../../../../packages/voxel/src/index.js';
import { EARTHWORK_NOTE, GROSSPROJEKTE, MAX_GP_SPACING, MAX_STREET_WIDTH, MIN_STREET_WIDTH, NETWORK_SURFACE, QUARTIER_KIND_LABEL, SCALE_LABEL, STREET_STYLE_LABEL, TERRAIN_MODE_LABEL, applyOperation, besideOffset, buildGrossprojektPlan,
  OWN_GP_ROUTE_PREFIX, createGrossprojektProject, findTerrainSpot, grossprojektFromCollection, ownGrossprojektRoute, fitAnlageToTerrain, grossprojektById, grossprojektIntoProject, isTurned, planGrossprojekt, previewGrossprojekt, resolveProject, scaleOf, swapCandidates, themeOfGrossprojekt, turnLabel, turnOf, withoutNetwork } from '../../../../../packages/domain/src/index.js';
import type { AnlageLibrary, AnlagePreview, AnlageTerrainFit, CatalogEntry, Collection, Grossprojekt, GrossprojektChoices, GrossprojektLayout, GrossprojektPlan, PlanNetwork, Project, SlotState, StreetStyle, TerrainMode } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { navigate } from '../../app/router';
import type { LibraryPage } from '../../app/router';
import { errorText, formatNumber } from '../../app/ui';
import { Viewer } from '../../Viewer';
import { Thumb } from '../../thumbnail/Thumb';
import { ModelExportPanel } from '../../export3d/ModelExportPanel';
import { projectTerrainDimension, useProjectTerrain } from '../world/designs';
import { DEFAULT_LANDSCAPE, LandscapeControls, adoptLandscape, landscapeSummary, previewLandscape, useStoredProject, writesLandscape } from './planTerrain';
import type { LandscapeChoice, LandscapePreview } from './planTerrain';
import './anlagen.css';
import './grossprojekte.css';

const CONFLICT_MARK = { color: '#ff5f57', amount: 0.85 } as const;
const QUARTER_COLORS = ['#8be3c0', '#e3c59a', '#9fc4ff', '#f0a3c8', '#c9b6ff', '#a6dd8b', '#ffb98a', '#7fd6e0', '#f3e38a', '#b8d8ff'];
type Target = { readonly kind: 'new' } | { readonly kind: 'project'; readonly projectId: string };

function safeLayout(gp: Grossprojekt, lib: AnlageLibrary, choices: GrossprojektChoices): { layout: GrossprojektLayout | null; error: string } {
  try { return { layout: planGrossprojekt(gp, lib, choices), error: '' }; } catch (e) { return { layout: null, error: errorText(e) }; }
}
function safePreview(plan: GrossprojektPlan | null, base: Project | undefined, offset: readonly [number, number], versions: AnlageLibrary['versions'], heights?: ReadonlyMap<string, number>): { preview: AnlagePreview | null; error: string } {
  if (!plan) return { preview: null, error: '' };
  try { return { preview: previewGrossprojekt(plan, { ...(base && { base }), offset, versions, ...(heights && { heights }) }), error: '' }; } catch (e) { return { preview: null, error: errorText(e) }; }
}
/** Street network of a layout as landscape network input. */
const streetNetwork = (layout: GrossprojektLayout | null | undefined): PlanNetwork | null =>
  layout?.streets ? { cells: layout.streets.cells, lamps: layout.streets.lamps, style: NETWORK_SURFACE[layout.streets.style]! } : null;
const size = (f: { x0: number; z0: number; x1: number; z1: number } | null) => f ? `${f.x1 - f.x0} × ${f.z1 - f.z0}` : '–';

/**
 * Großprojekte (GROSS-01): the library's largest size class. Overview of all
 * curated town plans and a planner per project. Every change only recomputes
 * the preview; projects are created or changed exclusively by the explicit
 * adoption button.
 */
export function GrossprojektePage({ id, entries, projects, libHref, onMessage }: {
  id: string | undefined;
  entries: readonly CatalogEntry[];
  projects: readonly Project[];
  libHref(page: LibraryPage, id?: string): string;
  onMessage(text: string, link?: { href: string; label: string }): void;
}) {
  const { library, repo } = useApp();
  const lib = useMemo<AnlageLibrary>(() => ({ assets: library.assets, versions: library.versions }), [library]);
  // Own collections (GROSS-01-S08): loaded once per visit, an own Großprojekt is built from one of them.
  const [collections, setCollections] = useState<readonly Collection[] | null>(null);
  useEffect(() => { let live = true; repo.listCollections().then(c => { if (live) setCollections(c); }, () => { if (live) setCollections([]); }); return () => { live = false; }; }, [repo]);
  const own = useMemo(() => {
    if (!id?.startsWith(OWN_GP_ROUTE_PREFIX) || !collections) return null;
    const c = collections.find(x => x.id === id.slice(OWN_GP_ROUTE_PREFIX.length));
    if (!c) return { gp: null, skipped: [], error: 'Die Sammlung gibt es nicht mehr.' };
    try { return { ...grossprojektFromCollection(c, { all: collections, assets: lib.assets, versions: lib.versions }), error: '' }; } catch (e) { return { gp: null, skipped: [], error: errorText(e) }; }
  }, [id, collections, lib]);
  if (id?.startsWith(OWN_GP_ROUTE_PREFIX)) {
    if (!own) return <p className="muted" role="status">Sammlung wird geladen …</p>;
    if (!own.gp) return <GrossprojekteOverview missingId={undefined} error={own.error} lib={lib} libHref={libHref} collections={collections ?? []} />;
    return <>
      {own.skipped.length > 0 && <div className="notice warning" role="status" data-testid="gp-own-skipped">Nicht übernommen: {own.skipped.slice(0, 6).join(' · ')}{own.skipped.length > 6 ? ' …' : ''}</div>}
      <GrossprojektPlanner key={own.gp.id} gp={own.gp} lib={lib} entries={entries} projects={projects} libHref={libHref} onMessage={onMessage} />
    </>;
  }
  const gp = id ? grossprojektById(id) : undefined;
  if (!gp) return <GrossprojekteOverview missingId={id} lib={lib} libHref={libHref} collections={collections ?? []} />;
  return <GrossprojektPlanner key={gp.id} gp={gp} lib={lib} entries={entries} projects={projects} libHref={libHref} onMessage={onMessage} />;
}

function GrossprojekteOverview({ missingId, error, lib, libHref, collections }: { missingId: string | undefined; error?: string; lib: AnlageLibrary; libHref(page: LibraryPage, id?: string): string; collections: readonly Collection[] }) {
  const layouts = useMemo(() => GROSSPROJEKTE.map(gp => ({ gp, ...safeLayout(gp, lib, {}) })), [lib]);
  const usable = collections.filter(c => !c.archived && (c.items.length > 0 || collections.some(x => x.parentId === c.id)));
  const [pick, setPick] = useState('');
  const chosen = usable.find(c => c.id === pick) ?? usable[0];
  return <section className="anlagen grossprojekte" aria-label="Großprojekte">
    {missingId && <div className="notice warning" role="alert">Großprojekt „{missingId}“ gibt es nicht.</div>}
    {error && <div className="notice warning" role="alert">{error}</div>}
    <div className="anlagen-intro"><div><span className="panel-kicker">GRÖSSENKLASSE STADT</span>
      <h2>Ganze Städte, Festungen und Anlagen als Plan.</h2>
      <p>Ein Großprojekt ordnet Quartiere auf einem Straßenraster: Gebäude, Ensembles und ganze Bauwelt-Anlagen aus dem Katalog, verbunden durch ein eigenes Straßennetz, gegliedert in Bauphasen. Du wählst Quartiere, Straßenbreite und Varianten, siehst echte Voxelkonflikte und übernimmst erst auf Knopfdruck in ein Projekt mit Bauabschnitten je Phase.</p></div>
      <aside>Größenklassen: {Object.values(SCALE_LABEL).join(' · ')}. Jeder Platz hält eine feste Bauteilversion; neuere Versionen werden angezeigt, aber nie automatisch übernommen.</aside></div>
    <div className="anlage-panel gp-own" data-testid="gp-own">
      <h3>Eigenes Großprojekt aus einer Sammlung</h3>
      {usable.length ? <div className="anlage-target">
        <label>Sammlung<select value={chosen?.id ?? ''} onChange={e => setPick(e.target.value)} aria-label="Sammlung für ein eigenes Großprojekt">
          {usable.map(c => <option key={c.id} value={c.id}>{c.name}{c.category ? ` · ${c.category}` : ''}</option>)}</select></label>
        {chosen && <a className="primary button-link" href={libHref('grossprojekte', ownGrossprojektRoute(chosen.id))}>Als Großprojekt planen</a>}
      </div> : <p className="small-note">Noch keine Sammlung mit Gebäuden. Lege unter <a href={libHref('collections')}>Sammlungen</a> eine an.</p>}
      <p className="small-note">Die Gebäude der Sammlung bilden das erste Quartier, jeder Unterordner wird ein weiteres Quartier mit eigener Bauphase. Straßennetz, Gelände und Übernahme funktionieren wie bei den mitgelieferten Großprojekten.</p>
    </div>
    <ul className="anlagen-grid">{layouts.map(({ gp, layout }) => {
      const theme = themeOfGrossprojekt(gp);
      const buildings = layout?.placements.filter(p => p.kind === 'building').length ?? 0;
      const scale = scaleOf(buildings);
      return <li key={gp.id}><a className="anlage-card gp-card" href={libHref('grossprojekte', gp.id)} data-gp={gp.id}>
        {layout && <GridThumb layout={layout} />}
        <div className="anlage-card-body">
          <span className="anlage-card-meta">{SCALE_LABEL[scale].split(' (')[0]} · {theme?.name ?? 'eigene Bauwelt'}</span>
          <strong>{gp.name}</strong>
          <span className="anlage-card-text">{gp.description}</span>
          <span className="anlage-card-meta">{buildings} Gebäude · {gp.quartiere.length} Quartiere · {gp.phasen.length} Bauphasen · {size(layout?.extent ?? null)} Blöcke{layout?.blockers.length ? ` · ${layout.blockers.length} Bauteile fehlen` : ''}</span>
        </div></a></li>;
    })}</ul>
  </section>;
}

/** Card thumbnail: the plan's footprints as a small top view. */
function GridThumb({ layout }: { layout: GrossprojektLayout }) {
  const e = layout.extent;
  if (!e) return <div className="gp-thumb" />;
  const colorOf = (qid: string | null) => qid === null ? '#8a9ba6' : QUARTER_COLORS[layout.gp.quartiere.findIndex(q => q.id === qid) % QUARTER_COLORS.length]!;
  return <svg className="gp-thumb" viewBox={`${e.x0 - 2} ${e.z0 - 2} ${e.x1 - e.x0 + 4} ${e.z1 - e.z0 + 4}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    {layout.streets?.lanes.map((l, i) => <rect key={`l${i}`} x={l.x0} y={l.z0} width={l.x1 - l.x0} height={l.z1 - l.z0} fill="#8a9ba6" fillOpacity={0.7} />)}
    {layout.quartiere.filter(q => q.reserved && q.footprint).map(q => <rect key={q.id} x={q.footprint!.x0} y={q.footprint!.z0} width={q.footprint!.x1 - q.footprint!.x0} height={q.footprint!.z1 - q.footprint!.z0} fill="none" stroke={colorOf(q.id)} strokeDasharray="3 2" strokeWidth={1} />)}
    {layout.placements.map(p => <rect key={p.key} x={p.footprint.x0} y={p.footprint.z0} width={p.footprint.x1 - p.footprint.x0} height={p.footprint.z1 - p.footprint.z0} fill={p.kind === 'path' ? '#aab8c2' : colorOf(p.districtId)} fillOpacity={0.9} />)}
  </svg>;
}

function GrossprojektPlanner({ gp, lib, entries, projects, libHref, onMessage }: {
  gp: Grossprojekt; lib: AnlageLibrary; entries: readonly CatalogEntry[]; projects: readonly Project[];
  libHref(page: LibraryPage, id?: string): string;
  onMessage(text: string, link?: { href: string; label: string }): void;
}) {
  const { repo, reloadLibrary } = useApp();
  const [choices, setChoices] = useState<GrossprojektChoices>({});
  const [target, setTarget] = useState<Target>({ kind: 'new' });
  const [placement, setPlacement] = useState<'beside' | 'manual'>('beside');
  const [manual, setManual] = useState<[number, number]>([0, 0]);
  const [name, setName] = useState(gp.name);
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const deferred = useDeferredValue(choices);
  const theme = themeOfGrossprojekt(gp);

  const { layout, error: layoutError } = useMemo(() => safeLayout(gp, lib, deferred), [gp, lib, deferred]);
  // The street network is an own part with a content hash (async); the plan follows the layout.
  const [plan, setPlan] = useState<GrossprojektPlan | null>(null);
  useEffect(() => {
    let live = true;
    setPlan(null);
    if (layout) void buildGrossprojektPlan(layout).then(p => { if (live) setPlan(p); }).catch(() => { if (live) setPlan(null); });
    return () => { live = false; };
  }, [layout]);
  const [adopted, setAdopted] = useState(0);
  const base = useStoredProject(repo, target.kind === 'project' ? projects.find(p => p.id === target.projectId) : undefined, adopted);
  const baseResolution = useMemo(() => { if (!base) return null; try { return resolveProject(base, lib.versions); } catch { return null; } }, [base, lib]);
  const offset = useMemo<[number, number]>(() => !base ? [0, 0] : placement === 'beside' && plan ? besideOffset(plan, baseResolution) : manual, [base, placement, plan, baseResolution, manual]);
  // Gelände (GROSS-01-S08): terrace fit, streets as landscape network, levelled sites and quay walls on the target's terrain.
  const [useTerrain, setUseTerrain] = useState(true);
  const [mode, setMode] = useState<TerrainMode>('terrassen');
  const [landscape, setLandscape] = useState<LandscapeChoice>(DEFAULT_LANDSCAPE);
  const terrainRef = base?.world && projectTerrainDimension(base, 'planned') === base.world.dimension && (base.terrain || base.terrainDesign) ? base : null;
  const { survey, error: surveyError } = useProjectTerrain(repo, terrainRef, 'planned');
  const network = useMemo(() => streetNetwork(layout), [layout]);
  const shaped = !!survey && useTerrain && writesLandscape(landscape);
  const fit = useMemo((): { fit: AnlageTerrainFit | null; land: LandscapePreview | null; error: string } => {
    if (!plan || !survey || !useTerrain || !base?.world) return { fit: null, land: null, error: '' };
    if (isTurned(base.world)) return { fit: null, land: null, error: `„${base.name}“ liegt auf der Weltkarte ${turnLabel(turnOf(base.world))}; ans Gelände angepasst wird nur bei ungedrehter Weltlage.` };
    try {
      if (writesLandscape(landscape)) { const land = previewLandscape(plan, survey, { origin: base.world.origin, offset, mode, choice: landscape, network }); return { fit: land.fit, land, error: '' }; }
      return { fit: fitAnlageToTerrain(plan, { survey, origin: base.world.origin, offset, mode }), land: null, error: '' };
    } catch (e) { return { fit: null, land: null, error: errorText(e) }; }
  }, [plan, survey, useTerrain, base, offset, mode, landscape, network]);
  const shownPlan = useMemo(() => plan && shaped && landscape.network === 'landschaft' ? { ...withoutNetwork(plan), network: null } : plan, [plan, shaped, landscape.network]);
  const { preview, error: previewError } = useMemo(() => safePreview(shownPlan, base, offset, lib.versions, fit.fit?.heights), [shownPlan, base, offset, lib, fit]);
  // Wasserkanten: buildings whose footprint stands on real water (by quarter).
  const wetQuarters = useMemo(() => {
    if (!fit.fit || !plan) return [];
    const district = new Map(plan.placements.map(p => [p.key, p.districtId]));
    const byQuarter = new Map<string, number>();
    for (const u of fit.fit.units) if (u.kind !== 'path' && u.estimate.water) { const q = district.get(u.keys[0]!) ?? null; if (q) byQuarter.set(q, (byQuarter.get(q) ?? 0) + u.estimate.water); }
    return [...byQuarter].map(([id, columns]) => ({ name: gp.quartiere.find(q => q.id === id)?.name ?? id, columns }));
  }, [fit, plan, gp]);
  const findSpot = () => {
    if (!plan || !survey || !base?.world) return;
    // Never onto the target's existing buildings (their bounding box plus the spacing).
    const b = baseResolution?.world?.bounds, gap = Math.max(1, plan.choices.spacing) * 2;
    const avoid = b && baseResolution!.world!.cells.length ? [{ x0: b.min[0] - gap, z0: b.min[2] - gap, x1: b.maxExclusive[0] + gap, z1: b.maxExclusive[2] + gap }] : [];
    const spot = findTerrainSpot(shaped && landscape.network === 'landschaft' ? withoutNetwork(plan) : plan, { survey, origin: base.world.origin, mode, avoid });
    if (!spot) { onMessage('Das Großprojekt passt nicht neben die bestehenden Bauten in die Geländeaufnahme; bitte eine größere Fläche aufnehmen.'); return; }
    setAccept(false); setPlacement('manual'); setManual([spot.offset[0], spot.offset[1]]);
    onMessage(`Flachster Platz: Versatz x ${spot.offset[0]}, z ${spot.offset[1]} (${spot.tried} Lagen verglichen, ${formatNumber(spot.fit.totals.fill)} Blöcke Unterbau, ${formatNumber(spot.fit.totals.cut)} Abtrag).`);
  };
  const conflictCells = useMemo(() => new Set(preview?.conflicts.map(c => c.position.join(',')) ?? []), [preview]);
  const markFor = useCallback((cell: Cell) => conflictCells.has(cell.position.join(',')) ? CONFLICT_MARK : null, [conflictCells]);
  const noSelect = useMemo(() => () => {}, []);
  const stale = deferred !== choices || (!!layout && !plan && !layoutError);

  const update = (patch: (c: GrossprojektChoices) => GrossprojektChoices) => { setAccept(false); setChoices(c => patch(c)); };
  const toggleQuarter = (qid: string) => update(c => { const off = new Set(c.off ?? []); off.has(qid) ? off.delete(qid) : off.add(qid); return { ...c, off: [...off] }; });
  const togglePhase = (ids: readonly string[], on: boolean) => update(c => { const off = new Set(c.off ?? []); for (const q of ids) on ? off.delete(q) : off.add(q); return { ...c, off: [...off] }; });
  const swap = (slot: SlotState, assetId: string) => update(c => { const rest = { ...c.swaps }; if (assetId === slot.curatedAssetId) delete rest[slot.key]; else rest[slot.key] = assetId; return { ...c, swaps: rest }; });
  const turn = (slot: SlotState) => update(c => ({ ...c, turns: { ...c.turns, [slot.key]: ((slot.turns + 1) % 4) as 0 | 1 | 2 | 3 } }));
  const resetTurn = (slot: SlotState) => update(c => { const rest = { ...c.turns }; delete rest[slot.key]; return { ...c, turns: rest }; });

  const adopt = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      // The street network is an own part: store it first, then the project that uses it.
      const stored = plan.network ? await buildGrossprojektPlan(plan.layout, { name }) : plan;
      if (stored.network) { await repo.applyBatch({ versions: [stored.network.version], assets: [stored.network.asset] }); await reloadLibrary(); }
      const versions = new Map(lib.versions);
      if (stored.network) versions.set(stored.network.version.id, stored.network.version);
      if (target.kind === 'new') {
        const fresh = previewGrossprojekt(stored, { versions });
        const created = createGrossprojektProject(stored, fresh, { name, acceptConflicts: accept });
        await repo.saveProject(created, 0);
        navigate({ view: 'project', projectId: created.id, tab: 'editor' });
        return;
      }
      // Re-read the target and recompute the preview against the stored state (never adopt a stale preview).
      const project = await repo.getProject(target.projectId);
      if (!project) throw new Error('Projekt nicht mehr vorhanden');
      let world = null;
      try { world = resolveProject(project, versions); } catch { /* unresolved projects: place at the manual/zero offset */ }
      const at = placement === 'beside' ? besideOffset(stored, world) : manual;
      const terrainOk = useTerrain && !!survey && !!project.world && !isTurned(project.world);
      if (terrainOk && writesLandscape(landscape)) {
        const land = await adoptLandscape(repo, project, stored, { offset: at, mode, choice: landscape, network: streetNetwork(stored.layout), name: project.name, networkKey: 'strassen', asphalt: stored.layout.streets?.style === 'asphalt' });
        if (land.lamps) { await repo.applyBatch({ versions: [land.lamps.version], assets: [land.lamps.asset] }); await reloadLibrary(); versions.set(land.lamps.version.id, land.lamps.version); }
        const fresh = previewGrossprojekt(land.plan, { base: project, offset: at, versions, heights: land.heights });
        if (fresh.conflicts.length && !accept) throw new Error(`${fresh.conflicts.length} Voxelkonflikt(e) nach Neuberechnung; bitte prüfen und bestätigen`);
        const op = grossprojektIntoProject(land.plan, fresh, project, { acceptConflicts: accept });
        const saved = await repo.saveProject(applyOperation(project, { kind: 'batch', label: `„${gp.name}“ auf dem Gelände eingefügt`, operations: [op, land.operation] }).project, project.revision);
        onMessage(`„${gp.name}“ in „${saved.name}“ eingefügt: ${fresh.draft.instances.length} Instanzen, ${gp.phasen.length} Bauphasen. Gelände angepasst: ${landscapeSummary(land.result)} Im Reiter „Landschaft“ als Bauteil übernehmen. Rückgängig im Editor möglich.`,
          { href: `#/projekt/${encodeURIComponent(saved.id)}/landschaft`, label: 'Zur Landschaft' });
        return;
      }
      const heights = terrainOk ? fitAnlageToTerrain(stored, { survey: survey!, origin: project.world!.origin, offset: at, mode }).heights : undefined;
      const fresh = previewGrossprojekt(stored, { base: project, offset: at, versions, ...(heights && { heights }) });
      if (fresh.conflicts.length && !accept) throw new Error(`${fresh.conflicts.length} Voxelkonflikt(e) nach Neuberechnung; bitte prüfen und bestätigen`);
      const saved = await repo.saveProject(applyOperation(project, grossprojektIntoProject(stored, fresh, project, { acceptConflicts: accept })).project, project.revision);
      onMessage(`„${gp.name}“ in „${saved.name}“ eingefügt: ${fresh.draft.instances.length} Instanzen, ${gp.phasen.length} Bauphasen. Rückgängig im Editor möglich.`,
        { href: `#/projekt/${encodeURIComponent(saved.id)}/baustelle`, label: 'Zur Baustelle' });
    } catch (e) { onMessage(`Nicht übernommen: ${errorText(e)}`); }
    finally { setBusy(false); setAdopted(n => n + 1); }
  };

  const spacing = choices.spacing ?? gp.spacing;
  const streetWidth = choices.streetWidth ?? gp.streets?.width ?? 4;
  const streetStyle = choices.streetStyle ?? gp.streets?.style ?? 'stein';
  const streetsOn = !!gp.streets && choices.streets !== false;
  const blockers = layout?.blockers ?? [];
  const conflicts = preview?.conflicts.length ?? 0;
  const overlaps = preview?.spacing.filter(s => s.kind === 'overlap') ?? [];
  const tight = preview?.spacing.filter(s => s.kind === 'tight') ?? [];
  const badLinks = preview?.links.filter(l => l.state !== 'ok') ?? [];
  const buildings = layout?.placements.filter(p => p.kind === 'building').length ?? 0;
  const pathParts = layout?.placements.filter(p => p.kind === 'path').length ?? 0;
  const totalBlocks = preview ? [...preview.blocks.values()].reduce((a, b) => a + b, 0) : 0;
  const scale = scaleOf(buildings);
  const canAdopt = !!preview && !!plan && !blockers.length && buildings + pathParts > 0 && (!conflicts || accept) && !busy && !stale && !!name.trim();
  const doorSlots = layout?.slots.filter(sl => sl.facesPath !== null) ?? [];

  return <section className="building-detail anlage-planner gp-planner" aria-label="Großprojekt planen">
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('browse')}>Bibliothek</a><span aria-hidden="true">›</span><a href={libHref('grossprojekte')}>Großprojekte</a><span aria-hidden="true">›</span><span aria-current="page">{gp.name}</span></nav>
    <div className="detail-hero">
      <div className="viewport detail-stage">
        {preview?.resolution.world ? <Viewer key={gp.id} payload={preview.resolution.world} cells={preview.resolution.world.cells} onSelect={noSelect} markFor={markFor} />
          : <div className="scene empty-scene"><p>{layoutError || previewError || (stale ? 'Vorschau wird berechnet …' : 'Keine Quartiere ausgewählt.')}</p></div>}
      </div>
      <div className="detail-summary">
        <span className="panel-kicker">GROSSPROJEKT · {SCALE_LABEL[scale].split(' (')[0]}{theme ? ` · ${theme.name}` : ''}</span><h2 className="detail-title">{gp.name}</h2>
        <p className="detail-lead">{gp.description}</p>
        <dl className="stat-tiles" aria-live="polite">
          <div><dt>Fläche</dt><dd>{size(layout?.extent ?? null)}</dd></div>
          <div><dt>Gebäude</dt><dd data-testid="gp-buildings">{buildings}{pathParts ? <small> + {pathParts} Weg</small> : null}</dd></div>
          <div><dt>Blöcke</dt><dd>{formatNumber(totalBlocks)}</dd></div>
          <div><dt>Voxelkonflikte</dt><dd data-testid="gp-conflicts">{stale ? '…' : conflicts ? <span className="warn-text">{conflicts}</span> : <span className="ok-text">keine</span>}</dd></div>
        </dl>
        {stale && <p className="small-note" role="status">Vorschau wird neu berechnet …</p>}
        <p className="small-note">{gp.quartiere.length} Quartiere auf {layout?.columns ?? '–'} × {layout?.rows ?? '–'} Rasterfeldern, {gp.phasen.length} Bauphasen.{theme ? <> Bauwelt: <a href={libHref('themes')}>{theme.name}</a>.</> : null} Ensembles und eingebettete Anlagen behalten ihr kuratiertes Layout.</p>
      </div>
    </div>

    <div className="anlage-columns">
      <section className="anlage-panel" aria-labelledby="gp-layout-title">
        <h3 id="gp-layout-title">Lageplan</h3>
        {layout && <SitePlanSvg layout={layout} preview={preview} offset={offset} />}
        <div className="anlage-controls">
          <label className="anlage-range">Abstand zwischen Gebäuden und zur Straße: <strong>{spacing} Blöcke</strong>
            <input type="range" min={0} max={MAX_GP_SPACING} value={spacing} onChange={e => update(c => ({ ...c, spacing: Number(e.target.value) }))} aria-label="Abstand in Blöcken" />
            <small>Empfohlen: {gp.spacing}. {spacing < gp.spacing ? 'Enger als empfohlen – Zugänge und Freiraum prüfen.' : ''}</small></label>
          {gp.streets && <label className="chip-check"><input type="checkbox" checked={streetsOn} onChange={e => update(c => ({ ...c, streets: e.target.checked }))} />
            Straßennetz zwischen den Quartieren bauen{gp.streets.ring ? ' (mit Ringstraße)' : ''}</label>}
          {gp.streets && streetsOn && <label className="anlage-range">Straßenbreite: <strong>{streetWidth} Blöcke</strong>
            <input type="range" min={MIN_STREET_WIDTH} max={MAX_STREET_WIDTH} value={streetWidth} onChange={e => update(c => ({ ...c, streetWidth: Number(e.target.value) }))} aria-label="Straßenbreite in Blöcken" />
            <small>Empfohlen: {gp.streets.width}. Ab 3 Blöcken bekommt die Straße einen Randstreifen.</small></label>}
          {gp.streets && streetsOn && <label className="gp-select">Straßenstil
            <select value={streetStyle} onChange={e => update(c => ({ ...c, streetStyle: e.target.value as StreetStyle }))} aria-label="Straßenstil">
              {(Object.keys(STREET_STYLE_LABEL) as StreetStyle[]).map(s => <option key={s} value={s}>{STREET_STYLE_LABEL[s]}</option>)}</select></label>}
          {gp.streets && streetsOn && <label className="chip-check"><input type="checkbox" checked={choices.lamps ?? gp.streets.lamps} onChange={e => update(c => ({ ...c, lamps: e.target.checked }))} />
            Laternen entlang der Straßen <small>({layout?.streets?.lamps.length ?? 0})</small></label>}
          {gp.streets && <label className="chip-check"><input type="checkbox" checked={choices.doors !== false} onChange={e => update(c => ({ ...c, doors: e.target.checked }))} />
            Türen zur Straße drehen <small>({doorSlots.filter(sl => sl.facesPath).length} von {doorSlots.length} Eingängen zeigen zur Straße)</small></label>}
        </div>
      </section>

      <section className="anlage-panel" aria-labelledby="gp-check-title">
        <h3 id="gp-check-title">Prüfung</h3>
        <ul className="anlage-checks">
          <li className={conflicts ? 'bad' : 'good'}><strong>{stale ? 'Prüfung läuft …' : conflicts ? `${conflicts} Voxelkonflikt${conflicts === 1 ? '' : 'e'}` : 'Keine Voxelkonflikte'}</strong>
            <span>Blockgenau geprüft{preview && preview.conflictsWithBase ? `, davon ${preview.conflictsWithBase} mit bestehenden Bauten des Zielprojekts` : ''}. Rot markiert in der 3D-Ansicht.</span></li>
          <li className={overlaps.length ? 'bad' : 'good'}><strong>{overlaps.length ? `${overlaps.length} Grundflächen überlappen` : 'Grundflächen getrennt'}</strong>
            <span>Umrisse (Vorfilter, kein Konfliktbeweis){overlaps.length ? `: ${overlaps.slice(0, 3).map(o => `${o.a} / ${o.b}`).join(', ')}${overlaps.length > 3 ? ' …' : ''}` : ''}.</span></li>
          <li className={tight.length ? 'warn' : 'good'}><strong>{tight.length ? `${tight.length} Abstände unter ${spacing}` : 'Abstände eingehalten'}</strong>
            <span>{tight.length ? tight.slice(0, 3).map(o => `${o.a} / ${o.b}: ${o.gap}`).join(', ') : 'Zwischen Gebäuden und zur Straße; innerhalb von Ensembles und Anlagen gilt deren eigenes Layout.'}</span></li>
          <li className={badLinks.length ? 'bad' : 'good'}><strong>{preview?.links.length ? `${preview.links.length - badLinks.length}/${preview.links.length} Anschlüsse verbunden` : 'Keine Anschlüsse'}</strong>
            <span>Wegmodule eingebetteter Anlagen werden über ihre Anschlüsse verknüpft; das Straßennetz ist ein eigenes Bauteil.</span></li>
          {blockers.map(b => <li key={b} className="bad"><strong>Nicht übernehmbar</strong><span>{b}</span></li>)}
          {(layoutError || previewError) && <li className="bad"><strong>Fehler</strong><span>{layoutError || previewError}</span></li>}
        </ul>
        {conflicts > 0 && preview && <details className="anlage-conflicts"><summary>Konfliktstellen anzeigen</summary><ol>
          {preview.conflicts.slice(0, 12).map(c => <li key={c.position.join(',')}>x {c.position[0]} · y {c.position[1]} · z {c.position[2]}: {c.instanceIds.map(i => preview.names.get(i) ?? i).join(' / ')}</li>)}
          {conflicts > 12 && <li>… und {conflicts - 12} weitere</li>}</ol></details>}
        {fit.fit && <ul className="anlage-checks" data-testid="gp-terrain">
          <li className={wetQuarters.length ? 'warn' : 'good'} data-testid="gp-water-edges"><strong>{wetQuarters.length ? `Wasserkanten: ${wetQuarters.length} Quartier${wetQuarters.length === 1 ? '' : 'e'} im Wasser` : 'Kein Gebäude im Wasser'}</strong>
            <span>{wetQuarters.length ? `${wetQuarters.slice(0, 4).map(w => `${w.name} (${w.columns} Spalten)`).join(', ')}${wetQuarters.length > 4 ? ' …' : ''}. ${landscape.grade ? 'Die Bauplätze werden aufgeschüttet' + (landscape.quay ? ', das neue Ufer bekommt eine Kaimauer.' : '.') : '„Bauplätze einebnen“ schüttet sie auf.'}` : 'Grundrisse der Quartiere liegen an Land.'}</span></li>
        </ul>}
        {fit.land && <p className="base-landscape-note" data-testid="gp-landscape-report" role="status">Gelände anpassen: {landscapeSummary(fit.land.result)}</p>}
        {fit.fit ? <p className="small-note">Gelände aus „{base!.name}“ ({TERRAIN_MODE_LABEL[fit.fit.mode]}): {formatNumber(fit.fit.totals.fill)} Blöcke Unterbau, {formatNumber(fit.fit.totals.cut)} Blöcke Abtrag. {fit.fit.notes.join(' ')} {EARTHWORK_NOTE}</p>
          : <p className="small-note">Gelände ungeprüft: Für Hanglagen, Wasserkanten und Straßen als Landschaftsweg ein Projekt mit Geländeaufnahme als Ziel wählen.</p>}
        {(surveyError || fit.error) && <p className="field-error" role="alert">{surveyError || fit.error}</p>}
      </section>
    </div>

    <section className="anlage-panel" aria-labelledby="gp-phases-title">
      <h3 id="gp-phases-title">Bauphasen und Quartiere</h3>
      <p className="small-note">Jede Phase wird ein Bauabschnitt auf der Baustelle{gp.streets ? ' (das Straßennetz kommt zuerst)' : ''}. Quartiere abwählen oder einzelne Plätze tauschen und drehen; jede Änderung berechnet nur die Vorschau neu.</p>
      <ol className="gp-phases">{gp.phasen.map((phase, pi) => {
        const quarters = phase.quartiere.map(qid => gp.quartiere.find(q => q.id === qid)!);
        const onCount = quarters.filter(q => !(choices.off ?? []).includes(q.id)).length;
        return <li key={phase.id} data-phase={phase.id}>
          <header className="gp-phase-head">
            <strong>Phase {pi + 1}: {phase.name}</strong><span className="muted">{phase.note}</span>
            <span className="gp-phase-actions">{onCount < quarters.length && <button type="button" className="text-button" onClick={() => togglePhase(phase.quartiere, true)}>alle an</button>}
              {onCount > 0 && <button type="button" className="text-button" onClick={() => togglePhase(phase.quartiere, false)}>alle aus</button>}</span>
          </header>
          <ol className="anlage-districts">{quarters.map(q => {
            const index = gp.quartiere.findIndex(x => x.id === q.id);
            const ql = layout?.quartiere.find(x => x.id === q.id);
            const enabled = !(choices.off ?? []).includes(q.id);
            const slots = layout?.slots.filter(sl => sl.districtId === q.id) ?? [];
            const embedded = q.units.filter(u => u.kind !== 'slot');
            return <li key={q.id} className={enabled ? '' : 'off'} data-quarter={q.id}>
              <header>
                <span className="anlage-dot" style={{ background: QUARTER_COLORS[index % QUARTER_COLORS.length] }} aria-hidden="true" />
                <label className="chip-check"><input type="checkbox" checked={enabled} onChange={() => toggleQuarter(q.id)} />{q.name}</label>
                <span className="muted">{QUARTIER_KIND_LABEL[q.kind]} · Feld {q.cell[0] + 1}/{q.cell[1] + 1}{q.span && (q.span[0] > 1 || q.span[1] > 1) ? ` (${q.span[0]} × ${q.span[1]})` : ''} · {ql?.placements ?? 0} Gebäude · {size(ql?.footprint ?? null)}{preview?.blocks.get(q.id) ? ` · ${formatNumber(preview.blocks.get(q.id)!)} Blöcke` : ''}</span>
              </header>
              <p className="anlage-purpose">{q.purpose}{embedded.length ? ` Enthält ${embedded.map(u => u.kind === 'ensemble' ? `das Ensemble ${u.ensembleId.replace(/^ens_/, '')}` : `die Anlage ${u.anlageId.replace(/^anl_/, '')}`).join(' und ')}.` : ''}{q.kind === 'frei' && q.reserve ? ` Freigehalten: ${q.reserve[0]} × ${q.reserve[1]} Blöcke.` : ''}</p>
              {slots.length > 0 && <details className="gp-slots" open={slots.length <= 8}><summary>{slots.length} Plätze</summary>
                <ul className="anlage-slots">{slots.map(slot => <SlotRow key={slot.key} slot={slot} plan={plan} entries={entries} editable={enabled && !slot.ensembleId} libHref={libHref}
                  onSwap={assetId => swap(slot, assetId)} onTurn={() => turn(slot)} onResetTurn={() => resetTurn(slot)} />)}</ul></details>}
            </li>;
          })}</ol>
        </li>;
      })}</ol>
    </section>

    <section className="anlage-panel anlage-adopt" aria-labelledby="gp-adopt-title">
      <h3 id="gp-adopt-title">Übernehmen</h3>
      <p className="small-note">Bis hierhin wurde nichts gespeichert oder platziert. Die Übernahme speichert das Straßennetz als eigenes Bauteil und legt Instanzen mit den festen Versionen, Wegverbindungen und je Bauphase einen Bauabschnitt an.</p>
      <div className="anlage-target">
        <label>Ziel<select value={target.kind === 'new' ? '' : target.projectId} onChange={e => { setAccept(false); setTarget(e.target.value ? { kind: 'project', projectId: e.target.value } : { kind: 'new' }); }}>
          <option value="">Neues Projekt</option>
          {projects.map(p => <option key={p.id} value={p.id}>In „{p.name}“ einfügen</option>)}</select></label>
        {target.kind === 'new' ? <label>Projektname<input value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
          : <fieldset className="anlage-offset"><legend>Lage im Projekt</legend>
            <label className="chip-check"><input type="radio" name="gp-offset" checked={placement === 'beside'} onChange={() => { setAccept(false); setPlacement('beside'); }} />neben die bestehenden Bauten</label>
            <label className="chip-check"><input type="radio" name="gp-offset" checked={placement === 'manual'} onChange={() => { setAccept(false); setPlacement('manual'); }} />eigener Versatz</label>
            {placement === 'manual' && <span className="anlage-xz">
              <label>x<input type="number" value={manual[0]} onChange={e => { setAccept(false); setManual([Math.trunc(Number(e.target.value) || 0), manual[1]]); }} /></label>
              <label>z<input type="number" value={manual[1]} onChange={e => { setAccept(false); setManual([manual[0], Math.trunc(Number(e.target.value) || 0)]); }} /></label></span>}
            <small>Versatz: x {offset[0]}, z {offset[1]}</small>
            {survey && useTerrain && <button type="button" className="text-button" onClick={findSpot}>Flachsten Platz in der Geländeaufnahme suchen</button>}</fieldset>}
        {terrainRef && <label className="chip-check"><input type="checkbox" checked={useTerrain} onChange={e => { setAccept(false); setUseTerrain(e.target.checked); }} /> Geländeaufnahme nutzen</label>}
        {terrainRef && useTerrain && <label>Höhen<select value={mode} onChange={e => { setAccept(false); setMode(e.target.value as TerrainMode); }} aria-label="Höhenanpassung">
          {(Object.keys(TERRAIN_MODE_LABEL) as TerrainMode[]).map(m => <option key={m} value={m}>{TERRAIN_MODE_LABEL[m]}</option>)}</select></label>}
      </div>
      {terrainRef && useTerrain && <LandscapeControls choice={landscape} onChange={c => { setAccept(false); setLandscape(c); }} label="Straßennetz" idPrefix="gp" />}
      {conflicts > 0 && <label className="chip-check anlage-accept"><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} />
        Trotz {conflicts} Voxelkonflikt{conflicts === 1 ? '' : 'en'} übernehmen (sie bleiben im Editor sichtbar und sperren den Export, bis sie gelöst sind)</label>}
      <div className="button-row"><button className="primary" type="button" disabled={!canAdopt} onClick={() => void adopt()}>
        {busy ? 'Wird übernommen …' : target.kind === 'new' ? 'Als Projekt anlegen' : 'In Projekt einfügen'}</button></div>
    </section>
    {preview?.resolution.world && !stale && <details className="anlage-panel anlage-model3d">
      <summary>3D-Datei des Großprojekts (OBJ, GLB, STL, 3MF)</summary>
      <ModelExportPanel key={`${gp.id}-${preview.resolution.world.cells.length}`} cells={preview.resolution.world.cells} palette={preview.resolution.world.palette} name={name.trim() || gp.name} source={`Großprojekt ${gp.name}`} />
    </details>}
  </section>;
}

function SlotRow({ slot, plan, entries, editable, libHref, onSwap, onTurn, onResetTurn }: {
  slot: SlotState; plan: GrossprojektPlan | null; entries: readonly CatalogEntry[]; editable: boolean;
  libHref(page: LibraryPage, id?: string): string; onSwap(assetId: string): void; onTurn(): void; onResetTurn(): void;
}) {
  const entry = entries.find(e => e.asset.id === slot.assetId);
  const candidates = useMemo(() => editable && plan ? swapCandidates(entries, plan.anlage, slot) : [], [editable, entries, plan, slot]);
  const status = slot.status === 'ok' ? null : slot.status === 'archived' ? 'archiviert' : slot.status === 'missing-asset' ? 'Bauteil fehlt' : `Version ${slot.pin} fehlt`;
  return <li className={slot.version ? '' : 'missing'}>
    {slot.version ? <Thumb cacheKey={slot.version.id} payload={() => slot.version!.payload} alt="" width={64} height={44} className="thumb mini" /> : <span className="thumb mini" />}
    <div className="anlage-slot-text">
      <a href={libHref('building', slot.assetId)}><strong>{entry?.asset.name ?? slot.assetId}</strong></a>
      <span>{slot.role !== (entry?.asset.name ?? slot.assetId) ? `${slot.role} · ` : ''}{slot.turns ? `${slot.turns * 90}° gedreht · ` : ''}<span className="anlage-pin" title={slot.version?.id}>Version {slot.pin} fest</span>
        {slot.newer && <span className="anlage-newer"> · neuer: {slot.newer} (nicht übernommen)</span>}
        {slot.swapped && <span className="anlage-newer"> · getauscht</span>}
        {status && <span className="warn-text"> · {status}</span>}
        {slot.facesPath !== null && <span className={slot.facesPath ? 'anlage-door ok-text' : 'anlage-door warn-text'}>{' · '}{slot.facesPath ? `Eingang zur Straße${slot.turnSource === 'door' ? ' (automatisch gedreht)' : ''}` : 'Eingang zeigt nicht zur Straße'}</span>}
      </span>
    </div>
    {editable && <div className="anlage-slot-actions">
      {candidates.length > 0 && <select aria-label={`${slot.role} tauschen`} value={slot.assetId} onChange={e => onSwap(e.target.value)}>
        <option value={slot.assetId}>{entry?.asset.name ?? slot.assetId}</option>
        {candidates.map(c => <option key={c.assetId} value={c.assetId}>{c.reason === 'variante' ? 'Variante: ' : ''}{c.name}</option>)}</select>}
      <button type="button" aria-label={`${slot.role} drehen`} onClick={onTurn}>↻ 90°</button>
      {slot.turnSource === 'manual' && <button type="button" className="text-button" onClick={onResetTurn}>automatisch</button>}
    </div>}
  </li>;
}

/** Top view: quarters coloured, streets grey, reserved plots dashed, grid regions faint, conflict participants outlined red. */
function SitePlanSvg({ layout, preview, offset }: { layout: GrossprojektLayout; preview: AnlagePreview | null; offset: readonly [number, number] }) {
  const colorOf = (qid: string | null) => qid === null ? '#8a9ba6' : QUARTER_COLORS[layout.gp.quartiere.findIndex(q => q.id === qid) % QUARTER_COLORS.length]!;
  const base = preview && preview.project.instances.length > preview.draft.instances.length ? preview.resolution.placed.filter(p => !preview.draft.instances.some(i => i.id === p.instance.id)) : [];
  const sh = (f: { x0: number; z0: number; x1: number; z1: number }) => ({ x0: f.x0 + offset[0], z0: f.z0 + offset[1], x1: f.x1 + offset[0], z1: f.z1 + offset[1] });
  const rects = [
    ...base.map(p => ({ key: `base-${p.instance.id}`, f: { x0: p.payload.bounds.min[0], z0: p.payload.bounds.min[2], x1: p.payload.bounds.maxExclusive[0], z1: p.payload.bounds.maxExclusive[2] }, fill: 'var(--muted)', label: p.instance.name, base: true })),
    ...layout.placements.map(p => ({ key: p.key, f: sh(p.footprint), fill: p.kind === 'path' ? '#aab8c2' : colorOf(p.districtId), label: p.name, base: false })),
  ];
  const lanes = (layout.streets?.lanes ?? []).map(sh);
  const reserved = layout.quartiere.filter(q => q.reserved && q.footprint).map(q => ({ q, f: sh(q.footprint!) }));
  const regions = layout.quartiere.filter(q => q.region).map(q => ({ q, f: sh(q.region!) }));
  const all = [...rects.map(r => r.f), ...lanes, ...reserved.map(r => r.f)];
  if (!all.length) return <p className="small-note">Nichts ausgewählt.</p>;
  const x0 = Math.min(...all.map(r => r.x0)) - 2, z0 = Math.min(...all.map(r => r.z0)) - 2;
  const x1 = Math.max(...all.map(r => r.x1)) + 2, z1 = Math.max(...all.map(r => r.z1)) + 2;
  const conflictNames = new Set(preview?.conflicts.flatMap(c => c.instanceIds.map(i => preview.names.get(i) ?? '')) ?? []);
  return <svg className="anlage-plan" viewBox={`${x0} ${z0} ${x1 - x0} ${z1 - z0}`} role="img" aria-label={`Lageplan, ${x1 - x0 - 4} × ${z1 - z0 - 4} Blöcke, Norden oben`} data-testid="gp-plan">
    {regions.map(r => <rect key={`reg-${r.q.id}`} x={r.f.x0} y={r.f.z0} width={r.f.x1 - r.f.x0} height={r.f.z1 - r.f.z0} fill={colorOf(r.q.id)} fillOpacity={0.08} stroke={colorOf(r.q.id)} strokeOpacity={0.35} strokeWidth={0.4}><title>{r.q.name} (Rasterfeld)</title></rect>)}
    {lanes.map((l, i) => <rect key={`lane-${i}`} x={l.x0} y={l.z0} width={l.x1 - l.x0} height={l.z1 - l.z0} fill="#8a9ba6" fillOpacity={0.45} />)}
    {reserved.map(r => <rect key={`res-${r.q.id}`} x={r.f.x0} y={r.f.z0} width={r.f.x1 - r.f.x0} height={r.f.z1 - r.f.z0} fill="none" stroke={colorOf(r.q.id)} strokeDasharray="3 2" strokeWidth={0.8}><title>{r.q.name}: freigehalten</title></rect>)}
    {rects.map(r => <rect key={r.key} x={r.f.x0} y={r.f.z0} width={r.f.x1 - r.f.x0} height={r.f.z1 - r.f.z0} fill={r.fill} fillOpacity={r.base ? 0.35 : 0.6}
      stroke={conflictNames.has(r.label) ? '#ff5f57' : 'rgba(0,0,0,.45)'} strokeWidth={conflictNames.has(r.label) ? 1.2 : 0.3}><title>{r.label}{r.base ? ' (bestehend)' : ''}</title></rect>)}
    {layout.streets?.lamps.map(([x, z]) => <circle key={`lamp-${x}-${z}`} cx={x + offset[0] + 0.5} cy={z + offset[1] + 0.5} r={0.7} fill="#f3e38a" />)}
    <text x={x1 - 1} y={z0 + 4} fontSize="3.5" textAnchor="end" fill="currentColor">N ↑</text>
  </svg>;
}
