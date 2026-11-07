import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { countBlocks } from '../../../../packages/voxel/src/index.js';
import type { Cell } from '../../../../packages/voxel/src/index.js';
import { applyOperation, buildCatalog, buildingInfo, createAsset, createEnsembleProject, createProject, ensemblesWith, facetCounts, FACETS, familyMembers,
  latestVersions, newInstance, projectContext, queryCatalog, resolveProject, similarEntries, suggestForProject, updateAssetMeta, withFacets,
  ENSEMBLES, ANLAGEN, GROSSPROJEKTE, GENERATORS, SORT_LABEL, STAGES, variantGroup, assetIdsIn, templateFromEnsemble, collectionTree, flattenTree, isContributionId, PLOT_PRESETS, STYLE_PALETTES, profileFit } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersionSource, BuildingFacets, CatalogEntry, CatalogQuery, Ensemble, OriginalFile, Project, SortKey } from '../../../../packages/domain/src/index.js';
import { href, navigate } from '../app/router';
import type { LibraryPage } from '../app/router';
import { useApp } from '../app/context';
import { importFile, IMPORT_ACCEPT, IMPORT_FORMAT_LABEL } from '../app/importFile';
import type { ImportedFile } from '../app/importFile';
import { errorText, formatNumber } from '../app/ui';
import { catalogMetrics } from '../app/metricsCache';
import { addAssetVersionInBackground } from '../jobs/versions';
import { isAbort } from '../jobs/client';
import { JobStatus } from '../jobs/JobStatus';
import type { JobProgress } from '../jobs/protocol';
import { DIM_MARK, HIT_MARK } from '../viewer/marks';
import type { Mark } from '../viewer/types';
import type { Highlight } from './library/ConnectorEditor';
import { CropPanel } from './library/CropPanel';
import { BasePage } from './library/BasePage';
import { BuildingCard } from './library/BuildingCard';
import { BuildingDetail } from './library/BuildingDetail';
import { CatalogFilters, activeFilterCount, filterChips } from './library/CatalogFilters';
import type { Filters } from './library/CatalogFilters';
import { ComparePage } from './library/ComparePage';
import { EnsemblesPage } from './library/EnsemblesPage';
import { GeneratorsPage } from './library/GeneratorsPage';
import { BuildThemesPage } from './library/BuildThemesPage';
import { AnlagenPage } from './library/AnlagenPage';
import { GrossprojektePage } from './library/GrossprojektePage';
import { FacetFields, facetsFromForm } from './library/FacetFields';
import { useCardView, useCompare, useFavorites, MAX_COMPARE } from './library/prefs';
import { SHOTS } from '../thumbnail/views';
import { standardOrShot } from '../thumbnail/StandardViews';
import type { ShotView } from '../thumbnail/views';
import { Viewer } from '../Viewer';
import { Thumb } from '../thumbnail/Thumb';
import { LitematicRegions, PLACEHOLDER_NAMES } from './library/LitematicRegions';
import { decodeLibraryState, encodeLibraryState } from './library/urlState';
import { useUserLibrary } from './library/userLibrary';
import { CollectionsPage } from './library/CollectionsPage';
import { TemplatesPage } from './library/TemplatesPage';
import { PalettesPage } from './library/PalettesPage';
import { CollectionPicker } from './library/CollectionPicker';
import './library/collections.css';
import '../styles/navGroups.css';

/** Values with their number of occurrences, most frequent first, then alphabetically. */
const countBy = (values: readonly string[]): [string, number][] => {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1));
};
const size = (b: { min: readonly number[]; maxExclusive: readonly number[] }) => b.maxExclusive.map((n, i) => n - b.min[i]!).join(' × ');
const SORTS = Object.keys(SORT_LABEL) as SortKey[];
const PAGE_SIZE = 48;
const KATEGORIE = FACETS.find(f => f.key === 'kategorie')!;
const FACET_KEYS = FACETS.map(f => f.key);
/** Blickrichtungen der Karten; "innen" ist der einheitliche Schnitt (LIB-07), "so" = Außen, "oben" = Draufsicht. */
const CARD_VIEWS: readonly (ShotView | 'innen')[] = ['so', 'innen', 'oben', 'sw', 'nw', 'no', 'sued'];
const CARD_VIEW_TITLE = (v: ShotView | 'innen') => v === 'innen' ? 'Innen: Schnitt in Augenhöhe' : v === 'so' ? 'Außen: isometrisch von Südosten' : v === 'oben' ? 'Oben: Draufsicht' : SHOTS.find(x => x.id === v)!.title;
/** Facets offered as "Stöbern" rows on the clean overview (category has its own strip). */
const BROWSE_FACETS = FACETS.filter(f => f.key === 'stil' || f.key === 'biom');
const readUrl = (search: string | undefined) => decodeLibraryState(search ?? '', FACET_KEYS, { sorts: SORTS, stages: STAGES });

/**
 * Bibliothek: building catalogue (B9) on top of the B0 asset library, laid out
 * like common schematic collections: category strip, filter sidebar, card grid
 * with previews, detail page per building, ensembles, Merkliste and comparison.
 * Sub-pages are hash routes, so the browser's back button returns to the grid
 * with search, filters and scroll position intact (the view stays mounted).
 */
export function LibraryView({ projectId: initialProjectId, page = 'browse', id, sub, search }: {
  projectId?: string | undefined; page?: LibraryPage | undefined; id?: string | undefined; sub?: string | undefined; search?: string | undefined;
} = {}) {
  const { repo, library, reloadLibrary } = useApp();
  // Search, filters and view come from the URL once (shared link) and are written back while browsing.
  const [initial] = useState(() => readUrl(search));
  const [query, setQuery] = useState(initial.query);
  const [filters, setFilters] = useState<Filters>(initial.filters as Filters);
  const [sort, setSort] = useState<SortKey>((initial.sort as SortKey | undefined) ?? (initialProjectId ? 'match' : 'name'));
  const [descending, setDescending] = useState(initial.descending);
  const [projects, setProjects] = useState<readonly Project[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState<{ href: string; label: string } | null>(null);
  const [imported, setImported] = useState<ImportedFile | null>(null);
  const [busy, setBusy] = useState(false);
  /** Background job shown with progress and „Abbrechen“ (PERF-04). */
  const [job, setJob] = useState<{ title: string; progress: JobProgress | null } | null>(null);
  const [message, setMessage] = useState('');
  const [collapse, setCollapse] = useState(initial.collapse);
  const [layout, setLayout] = useState<'raster' | 'liste'>(initial.layout);
  const [onlyFavorites, setOnlyFavorites] = useState(initial.onlyFavorites);
  const [collectionId, setCollectionId] = useState(initial.collection ?? '');
  const userLib = useUserLibrary(repo);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const favorites = useFavorites();
  const [cardView, setCardView] = useCardView(CARD_VIEWS, 'so');
  const compare = useCompare();
  const abort = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const scroll = useRef(0);
  // Metrics are pure functions of immutable, content-addressed versions: cache by version id.
  const catalog = useMemo(() => buildCatalog(library.assets, library.versions, catalogMetrics), [library]);
  const tags = useMemo(() => [...new Set(catalog.entries.flatMap(e => e.tags))].sort(), [catalog]);
  const byAsset = useMemo(() => latestVersions(library.assets, library.versions), [library]);
  const assetNames = useMemo(() => new Map(library.assets.map(a => [a.id, a.name])), [library]);

  // A link into the library for another project switches the suggestions without losing search and filters.
  const routeProject = useRef(initialProjectId);
  useEffect(() => {
    if (initialProjectId && initialProjectId !== routeProject.current) { setProjectId(initialProjectId); setSort('match'); }
    routeProject.current = initialProjectId;
  }, [initialProjectId]);
  const loadProjects = useCallback(() => repo.listProjects().then(list => setProjects([...list].sort((a, b) => a.name.localeCompare(b.name, 'de')))).catch(() => {}), [repo]);
  useEffect(() => { void loadProjects(); }, [loadProjects]);
  useEffect(() => repo.subscribe(c => { if (c.kind === 'projects') void loadProjects(); }), [repo, loadProjects]);
  const project = projects.find(p => p.id === projectId) ?? null;
  const context = useMemo(() => {
    if (!project) return null;
    let resolution = null;
    try { resolution = resolveProject(project, library.versions); } catch { /* unresolved projects are scored without world materials */ }
    return projectContext(project, resolution, library.versions, library.assets);
  }, [project, library]);
  const suggestions = useMemo(() => context ? new Map(suggestForProject(catalog.entries, context).map(s => [s.assetId, s])) : null, [catalog, context]);
  const scores = useMemo(() => suggestions ? new Map([...suggestions].map(([k, s]) => [k, s.score])) : undefined, [suggestions]);
  const effectiveSort: SortKey = sort === 'match' && !scores ? 'name' : sort;
  const catalogQuery = { ...filters, text: query, sort: effectiveSort, descending };
  const allResults = queryCatalog(catalog.entries, { ...catalogQuery, collapseFamilies: collapse }, scores);
  // Own collection filter (LIB-02): the catalogue stays one library, a collection only narrows it.
  const activeCollection = collectionId ? userLib.collections.find(c => c.id === collectionId) : undefined;
  // A collection that is still loading or no longer exists shows no entries (never silently the whole catalogue).
  const collectionIds = useMemo(() => activeCollection ? assetIdsIn(userLib.collections, activeCollection.id) : collectionId ? new Set<string>() : null, [activeCollection, collectionId, userLib.collections]);
  const collectionOptions = useMemo(() => flattenTree(collectionTree(userLib.collections)), [userLib.collections]);
  const results = allResults.filter(e => (!onlyFavorites || favorites.has(e.asset.id)) && (!collectionIds || collectionIds.has(e.asset.id)));
  const families = useMemo(() => familyMembers(catalog.entries), [catalog]);
  const entryById = useMemo(() => new Map(catalog.entries.map(e => [e.asset.id, e])), [catalog]);
  const entryOf = useCallback((assetId: string) => entryById.get(assetId), [entryById]);
  const counts = facetCounts(catalog.entries, catalogQuery);
  // LIB-07: mods and profiles present in the library, and how many entries each quick choice would leave.
  const modList = useMemo(() => countBy(catalog.entries.filter(e => !e.asset.archived).flatMap(e => e.metrics.modNamespaces)).map(([ns, count]) => ({ ns, count })), [catalog]);
  const profileList = useMemo(() => countBy(catalog.entries.filter(e => !e.asset.archived).map(e => profileFit(e.version.payload).key)).map(([id, count]) => ({ id, count })), [catalog]);
  const quick = useMemo(() => {
    const base = { ...filters, text: query, collapseFamilies: collapse };
    const n = (patch: Partial<CatalogQuery>) => queryCatalog(catalog.entries, { ...base, ...patch }).length;
    return {
      plots: Object.fromEntries(PLOT_PRESETS.map(p => [p.id, n({ plot: p.plot })])),
      effort: Object.fromEntries([1, 2, 3, 4, 5].map(level => [level, n({ effortMax: level })])),
      checked: n({ gameChecked: true }),
      vanilla: n({ vanillaOnly: true }),
    };
  }, [catalog, filters, query, collapse]);
  const categoryCounts = facetCounts(catalog.entries, { ...catalogQuery, facets: { ...filters.facets, kategorie: [] } }).kategorie;
  const total = catalog.entries.filter(e => !e.asset.archived).length;
  const activeKategorie = filters.facets?.kategorie ?? [];
  // A representative (largest) building per category for the category tiles.
  // Per facet value: the largest buildings (cover candidates) and the count.
  const covers = useMemo(() => {
    const out = new Map<string, Map<string, { top: CatalogEntry[]; count: number }>>();
    for (const f of FACETS) out.set(f.key, new Map());
    for (const e of catalog.entries) {
      if (e.asset.archived) continue;
      for (const f of FACETS) for (const v of e.facets[f.key]) {
        const m = out.get(f.key)!, cur = m.get(v) ?? { top: [], count: 0 };
        cur.count++; cur.top = [...cur.top, e].sort((a, b) => b.metrics.blocks - a.metrics.blocks).slice(0, 6);
        m.set(v, cur);
      }
    }
    return out;
  }, [catalog]);
  /** One cover per value of a facet, avoiding the same building twice in a row of tiles. */
  const coverRow = useCallback((key: string) => {
    const used = new Set<string>(), out = new Map<string, { entry: CatalogEntry; count: number }>();
    for (const [v, c] of covers.get(key) ?? []) {
      const entry = c.top.find(e => !used.has(e.family ?? e.asset.id)) ?? c.top[0]!;
      used.add(entry.family ?? entry.asset.id); out.set(v, { entry, count: c.count });
    }
    return out;
  }, [covers]);
  const categoryCovers = useMemo(() => new Map([...coverRow('kategorie')].map(([k, v]) => [k, v.entry])), [coverRow]);

  const libHref = useCallback((p: LibraryPage, target?: string, subPage?: string) =>
    href({ view: 'library', ...(projectId && { projectId }), page: p, ...(target && { id: target }), ...(subPage && { sub: subPage }) }), [projectId]);
  const variantName = useCallback((e: CatalogEntry) => buildingInfo(e.asset.id)?.family?.variant ?? e.asset.name, []);
  // Remember the grid position when leaving it, restore it on return.
  const prevPage = useRef(page);
  useLayoutEffect(() => {
    if (prevPage.current !== page && page === 'browse') window.scrollTo(0, scroll.current);
    prevPage.current = page;
  }, [page]);
  useEffect(() => {
    if (page !== 'browse') return;
    const save = () => { scroll.current = window.scrollY; };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [page]);
  useEffect(() => { setLimit(PAGE_SIZE); }, [query, filters, sort, descending, collapse, onlyFavorites, collectionId]);
  // A followed link with another query (e.g. a category tile on the project page) replaces the state.
  const lastSearch = useRef(search ?? '');
  const incomingSearch = useRef(false);
  useEffect(() => {
    if (page !== 'browse' || search === undefined || search === lastSearch.current) return;
    lastSearch.current = search;
    incomingSearch.current = true;
    const s = readUrl(search);
    setQuery(s.query); setFilters(s.filters as Filters); setSort((s.sort as SortKey | undefined) ?? (projectId ? 'match' : 'name')); setDescending(s.descending);
    setCollapse(s.collapse); setLayout(s.layout); setOnlyFavorites(s.onlyFavorites); setCollectionId(s.collection ?? '');
  }, [search, page, projectId]);
  // Write the overview state into the address without a navigation (no history entry, no scroll jump).
  const urlSearch = encodeLibraryState({ query, filters, ...(sort !== (projectId ? 'match' : 'name') && { sort }), descending, collapse, layout, onlyFavorites, ...(collectionId && { collection: collectionId }) }, FACET_KEYS);
  useEffect(() => {
    if (page !== 'browse') return;
    // An external thematic search first updates React state. Do not write the
    // previous filter state back over that incoming URL in the same effect pass.
    if (incomingSearch.current) { incomingSearch.current = false; return; }
    lastSearch.current = urlSearch;
    const next = href({ view: 'library', ...(projectId && { projectId }), ...(urlSearch && { search: urlSearch }) });
    if (window.location.hash !== next) history.replaceState(history.state, '', next);
  }, [page, urlSearch, projectId]);

  const say = (text: string, next: { href: string; label: string } | null = null) => { setMessage(text); setLink(next); };
  const open = async (f: File) => {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); say(''); setJob({ title: `${f.name} wird gelesen`, progress: null });
    try { const r = await importFile(f, controller.signal, undefined, p => { if (abort.current === controller) setJob({ title: `${f.name} wird gelesen`, progress: p }); }); if (!controller.signal.aborted) { setImported(r); window.scrollTo(0, 0); } }
    catch (e) { if (!controller.signal.aborted) say(`Import nicht übernommen: ${errorText(e)}`); }
    finally { if (abort.current === controller) { setBusy(false); setJob(null); } }
  };
  const pickRegion = async (region: string | undefined) => {
    if (!imported) return;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); say(''); setJob({ title: 'Region wird gelesen', progress: null });
    try { const r = await importFile(new File([imported.original], imported.name), controller.signal, region, p => { if (abort.current === controller) setJob({ title: 'Region wird gelesen', progress: p }); }); if (!controller.signal.aborted) setImported(r); }
    catch (e) { if (!controller.signal.aborted) say(`Region nicht übernommen: ${errorText(e)}`); }
    finally { if (abort.current === controller) { setBusy(false); setJob(null); } }
  };
  const sourceOf = (r: ImportedFile): Promise<AssetVersionSource> => crypto.subtle.digest('SHA-256', r.original).then(d => ({
    format: r.format === 'schem' ? 'schem-v3' : r.format === 'litematic' ? 'litematic' : 'voxel-json', fileName: r.name,
    originalSha256: Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join(''),
    ...(r.report && { dataVersion: r.report.dataVersion }),
  }));
  // Original bytes are stored unchanged next to the version, in the same transaction (B3).
  const originalOf = (r: ImportedFile, source: AssetVersionSource): OriginalFile => ({
    sha256: source.originalSha256!, fileName: r.name, mediaType: r.format === 'json' ? 'application/json' : 'application/octet-stream',
    size: r.original.byteLength, createdAt: new Date().toISOString(), bytes: new Uint8Array(r.original.slice(0)),
  });
  const showBuilding = (assetId: string) => navigate({ view: 'library', ...(projectId && { projectId }), page: 'building', id: assetId });
  /** Runs a save of the imported file with progress; large payloads are prepared in the background (PERF-04). */
  const saving = async (title: string, work: (signal: AbortSignal, onProgress: (p: JobProgress) => void) => Promise<void>) => {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); say(''); setJob({ title, progress: null });
    try { await work(controller.signal, p => { if (abort.current === controller) setJob({ title, progress: p }); }); }
    catch (e) { if (!controller.signal.aborted && !isAbort(e)) say(`Nicht gespeichert: ${errorText(e)}`); }
    finally { if (abort.current === controller) { setBusy(false); setJob(null); } }
  };
  const saveNew = (form: FormData) => saving('Bauteil wird gespeichert', async (signal, onProgress) => {
    if (!imported) return;
    const asset = createAsset({ name: String(form.get('name')), description: String(form.get('description') ?? ''),
      tags: withFacets(String(form.get('tags') ?? '').split(',').map(t => t.trim()).filter(Boolean), facetsFromForm(form)),
      provenance: { author: String(form.get('author') ?? ''), source: String(form.get('source') ?? ''), license: String(form.get('license') ?? '') } });
    const r = await addAssetVersionInBackground(asset, { payload: imported.payload, label: '1.0', source: await sourceOf(imported), columns: imported.columns }, { signal, onProgress });
    if (signal.aborted) return;
    onProgress({ step: 'Im Browser speichern', fraction: null });
    await repo.applyBatch({ versions: [r.version], assets: [r.asset], originals: [originalOf(imported, r.version.source)] }); await reloadLibrary();
    setImported(null); say(`„${r.asset.name}“ als Bauteil gespeichert.`); showBuilding(r.asset.id);
  });
  const saveVersion = (asset: Asset, label: string) => saving(`Version ${label} wird gespeichert`, async (signal, onProgress) => {
    if (!imported) return;
    const previous = library.versions.get(asset.versionIds.at(-1) ?? '');
    const r = await addAssetVersionInBackground(asset, { payload: imported.payload, label, connectors: previous?.connectors ?? [], source: await sourceOf(imported), columns: imported.columns }, { signal, onProgress });
    if (signal.aborted) return;
    onProgress({ step: 'Im Browser speichern', fraction: null });
    await repo.applyBatch({ versions: [r.version], assets: [r.asset], originals: [originalOf(imported, r.version.source)] }); await reloadLibrary();
    setImported(null); say(`Version ${r.version.label} von „${asset.name}“ gespeichert. Bestehende Projekte behalten ihre Version.`); showBuilding(asset.id);
  });
  const archive = async (asset: Asset) => {
    try { await repo.saveAsset(updateAssetMeta(asset, { archived: !asset.archived })); await reloadLibrary(); }
    catch (e) { say(errorText(e)); }
  };
  const saveFacets = async (asset: Asset, facets: BuildingFacets, plain: string[]) => {
    try { await repo.saveAsset(updateAssetMeta(asset, { tags: withFacets(plain, facets) })); await reloadLibrary(); say(`Angaben zu „${asset.name}“ gespeichert.`); return true; }
    catch (e) { say(`Angaben nicht gespeichert: ${errorText(e)}`); return false; }
  };
  /**
   * Adds the latest version as new instance beside the existing world, exactly
   * like the editor does, and stores it with the project's current revision.
   * Snapping to connectors stays an explicit step in the editor.
   */
  const addToProject = async (entry: CatalogEntry, targetId: string) => {
    setAdding(true);
    try {
      const stored = await repo.getProject(targetId);
      if (!stored) throw new Error('Projekt nicht mehr vorhanden');
      let world = null;
      try { world = resolveProject(stored, library.versions).world; } catch { /* place at the origin when the project cannot be resolved */ }
      const v = entry.version, x = world ? world.bounds.maxExclusive[0] + 1 - v.payload.bounds.min[0] : 0;
      const count = stored.instances.filter(i => i.assetVersionId === v.id).length;
      const instance = newInstance({ assetVersionId: v.id, name: `${entry.asset.name} ${count + 1}`, transform: { position: [x, 0, 0], quarterTurns: 0, mirrorX: false } });
      const saved = await repo.saveProject(applyOperation(stored, { kind: 'instance.add', instance }).project, stored.revision);
      setProjects(list => list.map(p => p.id === saved.id ? saved : p));
      say(`„${entry.asset.name}“ in „${saved.name}“ eingefügt (Position x = ${x}, neben dem bestehenden Bau). Ausrichten und Andocken im Editor.`,
        { href: `#/projekt/${encodeURIComponent(saved.id)}`, label: 'Zum Editor' });
    } catch (e) { say(`Nicht eingefügt: ${errorText(e)}`); }
    finally { setAdding(false); }
  };
  const newProjectWith = async (entry: CatalogEntry) => {
    try {
      let created = createProject({ name: entry.asset.name, description: `Gestartet mit „${entry.asset.name}“ aus der Bibliothek.` });
      created = applyOperation(created, { kind: 'instance.add', instance: newInstance({ assetVersionId: entry.version.id, name: `${entry.asset.name} 1`, transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } }) }).project;
      await repo.saveProject(created, 0);
      navigate({ view: 'project', projectId: created.id, tab: 'editor' });
    } catch (e) { say(`Projekt nicht angelegt: ${errorText(e)}`); }
  };
  const saveEnsembleTemplate = async (ensemble: Ensemble) => {
    try {
      const t = templateFromEnsemble(ensemble, byAsset, assetNames);
      const error = await userLib.write({ templates: [t] });
      if (error) say(`Vorlage nicht gespeichert: ${error}`);
      else say(`„${t.name}“ als eigene Vorlage gespeichert – mit den heutigen Bauteilversionen festgehalten.`, { href: libHref('templates', t.id), label: 'Zur Vorlage' });
    } catch (e) { say(`Vorlage nicht gespeichert: ${errorText(e)}`); }
  };
  const collectionHref = (cid: string) => libHref('collections', cid);
  const createFromEnsemble = async (ensemble: Ensemble) => {
    try {
      const created = createEnsembleProject(ensemble, byAsset, assetNames);
      await repo.saveProject(created, 0);
      navigate({ view: 'project', projectId: created.id, tab: 'editor' });
    } catch (e) { say(`Projekt nicht angelegt: ${errorText(e)}`); }
  };
  const toggleCompare = (assetId: string) => {
    if (!compare.has(assetId) && compare.ids.length >= MAX_COMPARE) say(`Höchstens ${MAX_COMPARE} Gebäude im Vergleich – das älteste wurde ersetzt.`);
    compare.toggle(assetId);
  };
  const surprise = () => {
    const pool = results.length ? results : catalog.entries.filter(e => !e.asset.archived);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) showBuilding(pick.asset.id);
  };
  const setKategorie = (value: string | null) => setFilters(f => ({ ...f, facets: { ...f.facets, kategorie: value === null || (f.facets?.kategorie?.length === 1 && f.facets.kategorie[0] === value) ? [] : [value] } }));

  const contributions = catalog.entries.filter(e => e.asset.demo && !e.asset.archived && isContributionId(e.asset.id)).length;
  const header = <header className="page-head library-head"><div><span className="eyebrow">BIBLIOTHEK</span><h1 className="page-title">Gebäude &amp; Bauteile</h1>
      <p className="muted">{catalog.entries.filter(e => e.asset.demo && !e.asset.archived).length} mitgelieferte Gebäudevorschläge{contributions ? ` (davon ${contributions} ${contributions === 1 ? 'Bibliotheksbeitrag' : 'Bibliotheksbeiträge'})` : ''} und deine eigenen Bauteile, mit Vorschau, berechneten Kennwerten und Bauplan.</p></div>
    <div className="button-row"><button className="secondary" disabled={busy} onClick={() => file.current?.click()} title="Eigene Schem-, Litematic- oder JSON-Datei als Bauteil übernehmen">＋ Schem / Litematic / JSON importieren</button>
      <input ref={file} className="file-input" type="file" aria-label="Bauteildatei" accept={IMPORT_ACCEPT}
        onChange={e => { const f = e.target.files?.[0]; if (f) void open(f); e.target.value = ''; }} />
      <a className="button" href="#/werkstatt/neu" title="Blockeditor: neues Bauteil Block für Block bauen">✎ Neues Bauteil bauen</a>
      </div>
    {job && <JobStatus title={job.title} progress={job.progress} onCancel={() => { abort.current?.abort(); abort.current = null; setBusy(false); setJob(null); say(job.title.includes('gespeichert') ? 'Speichern abgebrochen – nichts wurde gespeichert.' : 'Import abgebrochen.'); }} />}</header>
  // UX-01: zehn Unterseiten in drei Gruppen – erst finden, dann nach Maß erzeugen, dann Größeres planen.
  const tabs = <nav className="lib-tabs" aria-label="Ansicht">
    <span className="lib-tab-group" role="group" aria-label="Finden" title="Fertige Gebäude suchen, merken und vergleichen"><span className="lib-tab-group-label" aria-hidden="true">Finden</span>
      <a href={libHref('browse')} aria-current={page === 'browse' || page === 'building' ? 'page' : undefined}>Gebäude <small>{total}</small></a>
      <a href={libHref('ensembles')} aria-current={page === 'ensembles' ? 'page' : undefined}>Ensembles <small>{ENSEMBLES.length}</small></a>
      <a href={libHref('collections')} aria-current={page === 'collections' ? 'page' : undefined}>Sammlungen <small>{userLib.collections.filter(c => !c.archived).length}</small></a>
      <a href={compare.ids.length ? libHref('compare', compare.ids.join(',')) : libHref('compare', '-')} aria-current={page === 'compare' ? 'page' : undefined}>Vergleich <small>{compare.ids.length}</small></a></span>
    <span className="lib-tab-group" role="group" aria-label="Nach Maß" title="Bauwerke mit eigenen Maßen erzeugen"><span className="lib-tab-group-label" aria-hidden="true">Nach Maß</span>
      <a href={libHref('generators')} aria-current={page === 'generators' ? 'page' : undefined}>Generatoren <small>{GENERATORS.length}</small></a>
      <a href={libHref('templates')} aria-current={page === 'templates' ? 'page' : undefined}>Vorlagen <small>{userLib.templates.filter(t => !t.archived && t.body.kind !== 'palette').length}</small></a>
      <a href={libHref('palettes')} aria-current={page === 'palettes' ? 'page' : undefined}>Paletten <small>{STYLE_PALETTES.length + userLib.templates.filter(t => !t.archived && t.body.kind === 'palette').length}</small></a></span>
    <span className="lib-tab-group" role="group" aria-label="Größer planen" title="Ganze Basen, Anlagen und Großprojekte"><span className="lib-tab-group-label" aria-hidden="true">Größer planen</span>
      <a href={libHref('grossprojekte')} aria-current={page === 'grossprojekte' ? 'page' : undefined}>Großprojekte <small>{GROSSPROJEKTE.length}</small></a>
      <a href={libHref('base')} aria-current={page === 'base' ? 'page' : undefined}>Basisplaner</a>
      <a href={libHref('facilities')} aria-current={page === 'facilities' ? 'page' : undefined}>Anlagen <small>{ANLAGEN.length}</small></a>
      <a href={libHref('themes')} aria-current={page === 'themes' ? 'page' : undefined}>Bauwelten</a></span>
  </nav>;
  const notices = <>
    {message && <div className="notice" role="status">{message}{link && <a className="notice-link" href={link.href}>{link.label} →</a>}</div>}
    {catalog.missing.length > 0 && <div className="notice warning" role="alert">Version fehlt im Speicher für: {catalog.missing.map(a => a.name).join(', ')}. Diese Einträge werden nicht angezeigt.</div>}
  </>;
  const tray = compare.ids.length > 0 && page !== 'compare' && <aside className="compare-tray" aria-label="Vergleichsauswahl">
    <ul>{compare.ids.map(cid => { const v = byAsset.get(cid); return <li key={cid} title={assetNames.get(cid)}>
      {v && <Thumb cacheKey={v.id} payload={() => v.payload} alt="" width={64} height={44} className="thumb mini" />}
      <button type="button" className="tray-x" aria-label={`${assetNames.get(cid) ?? cid} aus dem Vergleich nehmen`} onClick={() => compare.toggle(cid)}>×</button></li>; })}</ul>
    <a className="primary button-link" href={libHref('compare', compare.ids.join(','))}>Vergleichen ({compare.ids.length})</a>
    <button type="button" className="text-button" onClick={() => compare.set([])}>leeren</button>
  </aside>;

  if (imported) return <div className="page">{header}{notices}<ImportPanel imported={imported} busy={busy} library={library.assets}
    onRegion={r => void pickRegion(r)} onSave={f => void saveNew(f)} onVersion={(a, l) => void saveVersion(a, l)} onCancel={() => setImported(null)}
    sourceOf={sourceOf} onCropSaved={(m, savedId) => { say(m); setImported(null); showBuilding(savedId); }} /></div>;

  if (page === 'building') {
    const entry = catalog.entries.find(e => e.asset.id === id) ?? null;
    const asset = entry?.asset ?? null, latest = entry?.version ?? null;
    return <div className="page">{tabs}{notices}
      {entry && asset && latest ? <BuildingDetail key={asset.id} entry={entry} asset={asset} latest={latest} versions={library.versions}
        info={buildingInfo(asset.id)} group={variantGroup(entry, catalog.entries)} variantName={variantName} sub={sub} ensembles={ensemblesWith(asset.id)} similar={similarEntries(entry, catalog.entries, 6)}
        suggestion={suggestions?.get(asset.id)} project={project} projects={projects} adding={adding}
        favorite={favorites.has(asset.id)} comparing={compare.has(asset.id)} libHref={libHref}
        onFavorite={() => favorites.toggle(asset.id)} onCompare={() => toggleCompare(asset.id)}
        onAdd={pid => void addToProject(entry, pid)} onNewProject={() => void newProjectWith(entry)}
        onSaveFacets={asset.demo ? undefined : (base, facets, plain) => saveFacets(base, facets, plain)}
        onArchive={() => void archive(asset)} onMessage={m => say(m)} onSelectSaved={showBuilding}
        collections={<CollectionPicker lib={userLib} item={{ kind: 'asset', assetId: asset.id }} label={asset.name} collectionHref={collectionHref} onMessage={m => say(m)} />} />
        : <div className="notice warning" role="alert">Gebäude „{id}“ ist nicht in der Bibliothek. <a href={libHref('browse')}>Zur Übersicht</a></div>}
      {tray}</div>;
  }
  if (page === 'ensembles') return <div className="page">{header}{tabs}{notices}
    <EnsemblesPage id={id} byAsset={byAsset} names={assetNames} versions={library.versions} libHref={libHref} entryOf={entryOf} onCreate={e => void createFromEnsemble(e)}
      onSaveTemplate={e => void saveEnsembleTemplate(e)}
      collections={e => <CollectionPicker lib={userLib} item={{ kind: 'ensemble', ensembleId: e.id }} label={e.name} collectionHref={collectionHref} onMessage={m => say(m)} />} /></div>;
  if (page === 'collections') return <div className="page">{header}{tabs}{notices}
    <CollectionsPage id={id} lib={userLib} library={library} byAsset={byAsset} names={assetNames} libHref={libHref} onMessage={m => say(m)}
      browseHref={cid => href({ view: 'library', ...(projectId && { projectId }), search: encodeLibraryState({ query: '', filters: {}, descending: false, collapse: true, layout: 'raster', onlyFavorites: false, collection: cid }, FACET_KEYS) })} /></div>;
  if (page === 'templates') return <div className="page">{header}{tabs}{notices}
    <TemplatesPage id={id} lib={userLib} projects={projects} libHref={libHref} onMessage={m => say(m)} /></div>;
  if (page === 'palettes') return <div className="page">{header}{tabs}{notices}
    <PalettesPage id={id} lib={userLib} entries={catalog.entries} favorites={favorites.ids} compare={compare.ids} libHref={libHref} onMessage={m => say(m)} /></div>;
  if (page === 'themes') return <div className="page">{header}{tabs}{notices}
    <BuildThemesPage entries={catalog.entries}
      browseHref={search => href({ view: 'library', ...(projectId && { projectId }), search })}
      buildingHref={id => libHref('building', id)} anlageHref={id => libHref('facilities', id)} /></div>;
  if (page === 'facilities') return <div className="page">{header}{tabs}{notices}
    <AnlagenPage id={id} entries={catalog.entries} projects={projects} libHref={libHref} onMessage={(m, l) => say(m, l ?? null)} /></div>;
  if (page === 'grossprojekte') return <div className="page">{header}{tabs}{notices}
    <GrossprojektePage id={id} entries={catalog.entries} projects={projects} libHref={libHref} onMessage={(m, l) => say(m, l ?? null)} /></div>;
  if (page === 'base') return <div className="page">{header}{tabs}{notices}
    <BasePage projects={projects} libHref={libHref} onMessage={(m, l) => say(m, l ?? null)} /></div>;
  if (page === 'generators') return <div className="page">{header}{tabs}{notices}
    <GeneratorsPage id={id} projects={projects} libHref={libHref} onSaved={(m, savedId) => { say(m); showBuilding(savedId); }} userLib={userLib} onMessage={m => say(m)} /></div>;
  if (page === 'compare') {
    const ids = (id ?? '').split(',').filter(x => x && x !== '-');
    const entries = ids.map(x => catalog.entries.find(e => e.asset.id === x)).filter((e): e is CatalogEntry => !!e);
    return <div className="page">{tabs}{notices}
      <ComparePage entries={entries} missing={ids.filter(x => !entries.some(e => e.asset.id === x))} libHref={libHref}
        onRemove={x => { compare.set(compare.ids.filter(c => c !== x)); const rest = ids.filter(c => c !== x); navigate({ view: 'library', ...(projectId && { projectId }), page: 'compare', id: rest.join(',') || '-' }); }} /></div>;
  }

  const chips = filterChips(filters);
  const shown = results.slice(0, limit);
  return <div className="page">
    {header}{tabs}{notices}
    <section className="category-strip" role="group" aria-label="Kategorien">
      <button type="button" className="cat-tile all" aria-pressed={activeKategorie.length === 0} onClick={() => setKategorie(null)}>
        <span className="cat-label">Alle</span><small>{total}</small></button>
      {Object.entries(KATEGORIE.values).map(([value, label]) => {
        const n = categoryCounts[value] ?? 0, cover = categoryCovers.get(value), on = activeKategorie.includes(value);
        if (!n && !on && !cover) return null;
        return <button key={value} type="button" className="cat-tile" aria-pressed={on} disabled={!n && !on} onClick={() => setKategorie(value)}>
          {cover && <Thumb cacheKey={cover.version.id} payload={() => cover.version.payload} alt="" width={120} height={80} className="thumb mini" />}
          <span className="cat-label">{label}</span><small>{n}</small></button>;
      })}
    </section>
    {!query && activeFilterCount(filters) === 0 && !onlyFavorites && <section className="browse-rows" aria-label="Stöbern">
      {BROWSE_FACETS.map(f => { const row = coverRow(f.key); return <div key={f.key} className="browse-row">
        <h2>Nach {f.label} stöbern</h2>
        <ul className="browse-tiles" aria-label={`Nach ${f.label}`}>{Object.entries(f.values).map(([value, label]) => {
          const c = row.get(value);
          if (!c) return null;
          return <li key={value}><button type="button" onClick={() => setFilters({ facets: { [f.key]: [value] } })}>
            <Thumb cacheKey={c.entry.version.id} payload={() => c.entry.version.payload} alt="" width={168} height={96} className="thumb" {...standardOrShot(cardView, c.entry.version.payload)} />
            <strong>{label}</strong><small>{c.count} Gebäude</small></button></li>;
        })}</ul></div>; })}
    </section>}
    <section className="catalog-bar" aria-label="Suche und Sortierung">
      <div className="search-box"><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Suchen: Name, Stil, Material, Beruf …" aria-label="Bauteile suchen" /></div>
      <label>Passend zu Projekt<select value={projectId} aria-label="Projekt für Vorschläge" onChange={e => { setProjectId(e.target.value); if (e.target.value) setSort('match'); }}>
        <option value="">– kein Projekt –</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Sortieren<select value={effectiveSort} aria-label="Sortierung" onChange={e => setSort(e.target.value as SortKey)}>
        {SORTS.map(k => <option key={k} value={k} disabled={k === 'match' && !scores}>{SORT_LABEL[k]}</option>)}</select></label>
      {effectiveSort !== 'match' && <button type="button" className="sort-dir" aria-label={descending ? 'Absteigend sortiert' : 'Aufsteigend sortiert'} onClick={() => setDescending(!descending)}>{descending ? '↓' : '↑'}</button>}
      <div className="seg" role="group" aria-label="Darstellung">
        <button type="button" aria-pressed={layout === 'raster'} onClick={() => setLayout('raster')}>Raster</button>
        <button type="button" aria-pressed={layout === 'liste'} onClick={() => setLayout('liste')}>Liste</button></div>
      <label className="view-dir">Blickrichtung<select value={cardView} aria-label="Blickrichtung der Vorschaubilder" onChange={e => setCardView(e.target.value as ShotView | 'innen')}>
        {CARD_VIEWS.map(v => <option key={v} value={v}>{CARD_VIEW_TITLE(v)}</option>)}</select></label>
      <button type="button" className="surprise" onClick={surprise} title="Zufälliges Gebäude aus den aktuellen Treffern">🎲 Überrasch mich</button>
    </section>
    <section className="catalog-layout">
      <aside className={`filter-sidebar${filtersOpen ? ' open' : ''}`} aria-label="Filter">
        <button type="button" className="filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
          Filter{activeFilterCount(filters) ? ` (${activeFilterCount(filters)} aktiv)` : ''}</button>
        <div className="filter-body">
          <label className="check"><input type="checkbox" checked={collapse} onChange={e => setCollapse(e.target.checked)} /> Varianten zusammenfassen</label>
          <label className="check"><input type="checkbox" checked={onlyFavorites} onChange={e => setOnlyFavorites(e.target.checked)} /> Nur Merkliste ({favorites.ids.length})</label>
          {(collectionOptions.length > 0 || collectionId) && <label className="collection-filter">Sammlung<select value={collectionId} aria-label="Nur Sammlung zeigen" onChange={e => setCollectionId(e.target.value)}>
            <option value="">– alle Einträge –</option>
            {collectionId && !activeCollection && <option value={collectionId}>(Sammlung nicht gefunden)</option>}
            {collectionOptions.map(n => <option key={n.collection.id} value={n.collection.id}>{'\u00a0\u00a0'.repeat(n.depth)}{n.collection.name}</option>)}</select></label>}
          <CatalogFilters filters={filters} onChange={setFilters} counts={counts} tags={tags} hideFacets={['kategorie']} mods={modList} profiles={profileList} quick={quick} />
        </div>
      </aside>
      <div className="catalog-main">
        <div className="result-head">
          <span className="result-count" role="status"><b>{results.length}</b> von {total} Einträgen</span>
          {activeCollection && <ul className="active-chips" aria-label="Sammlungsfilter"><li><button type="button" onClick={() => setCollectionId('')} aria-label={`Sammlungsfilter ${activeCollection.name} entfernen`}>📁 {activeCollection.name} <span aria-hidden="true">×</span></button></li>
            <li><a className="text-button" href={collectionHref(activeCollection.id)}>Sammlung öffnen</a></li></ul>}
          {chips.length > 0 && <ul className="active-chips" aria-label="Aktive Filter">{chips.map(c => <li key={c.key}>
            <button type="button" onClick={() => setFilters(c.next)} aria-label={`Filter ${c.label} entfernen`}>{c.label} <span aria-hidden="true">×</span></button></li>)}
            <li><button type="button" className="text-button" onClick={() => setFilters({})}>Alle Filter zurücksetzen</button></li></ul>}
        </div>
        {suggestions && project && <p className="small-note match-note">Sortiert nach Passung zu „{project.name}“: Materialähnlichkeit, Stil, Biom, freie Anschlüsse, neue Kategorie, Profil. Details auf der Gebäudeseite.</p>}
        <ul className={`catalog-results ${layout}`}>{shown.map(e => <li key={e.asset.id}>
          <BuildingCard entry={e} href={libHref('building', e.asset.id)} score={scores?.get(e.asset.id)}
            variants={collapse && e.family ? families.get(e.family)?.length : undefined}
            favorite={favorites.has(e.asset.id)} comparing={compare.has(e.asset.id)} view={cardView}
            onFavorite={() => favorites.toggle(e.asset.id)} onCompare={() => toggleCompare(e.asset.id)} /></li>)}
          {results.length === 0 && <li className="empty-results"><p>{collectionId && !userLib.loaded ? 'Sammlung wird geladen …' : collectionId && !activeCollection ? 'Diese Sammlung gibt es nicht (mehr).' : activeCollection && !collectionIds?.size ? `Die Sammlung „${activeCollection.name}“ enthält noch keine Gebäude.` : 'Keine Treffer.'}</p><button className="text-button" onClick={() => { setFilters({}); setQuery(''); setOnlyFavorites(false); setCollectionId(''); }}>Suche und Filter zurücksetzen</button></li>}</ul>
        {results.length > shown.length && <div className="more-row"><button type="button" onClick={() => setLimit(limit + PAGE_SIZE)}>Weitere {Math.min(PAGE_SIZE, results.length - shown.length)} laden</button>
          <span className="muted">{shown.length} von {results.length} angezeigt</span></div>}
      </div>
    </section>
    {tray}
  </div>;
}

/** Checked file before it becomes a part: preview, region choice, metadata, area crop or new version of an own part. */
function ImportPanel({ imported, busy, library, onRegion, onSave, onVersion, onCancel, sourceOf, onCropSaved }: {
  imported: ImportedFile;
  busy: boolean;
  library: readonly Asset[];
  onRegion(region: string | undefined): void;
  onSave(form: FormData): void;
  onVersion(asset: Asset, label: string): void;
  onCancel(): void;
  sourceOf(r: ImportedFile): Promise<AssetVersionSource>;
  onCropSaved(message: string, assetId: string): void;
}) {
  const [cropMarks, setCropMarksState] = useState<Highlight>(null);
  const setCropMarks = useCallback((h: Highlight) => setCropMarksState(() => h), []);
  const noSelect = useMemo(() => () => {}, []);
  const preview = imported.payload;
  const blockCount = useMemo(() => countBlocks(preview).blocks, [preview]);
  const markFor = useMemo(() => (cell: Cell): Mark | null => {
    const mark = cropMarks?.(cell) ?? null;
    return mark === 'hit' ? HIT_MARK : mark === 'dim' ? DIM_MARK : null;
  }, [cropMarks]);
  const own = library.filter(a => !a.demo);
  const regionName = imported.report && 'selectedRegion' in imported.report ? imported.report.selectedRegion : undefined;
  // Litematica stores name and author in Metadata; prefill them unless they are placeholders.
  const fileMeta = imported.report && 'metadata' in imported.report ? imported.report.metadata : undefined;
  const metaName = fileMeta?.name !== undefined && !PLACEHOLDER_NAMES.has(fileMeta.name.trim()) ? fileMeta.name.trim().slice(0, 120) : undefined;
  const metaAuthor = fileMeta?.author?.trim().slice(0, 120) || undefined;
  return <section className="detail-hero import-hero" aria-label="Import prüfen">
    <div className="viewport detail-stage"><Viewer key={`import-${imported.name}-${regionName ?? ''}`} payload={preview} cells={preview.cells} onSelect={noSelect} markFor={markFor} /></div>
    <aside className="inspector detail-summary">
      <form onSubmit={e => { e.preventDefault(); onSave(new FormData(e.currentTarget)); }}>
        <span className="panel-kicker">DATEI GEPRÜFT</span>
        <p className="muted">{imported.name} · {IMPORT_FORMAT_LABEL[imported.format]}{imported.report ? `, DataVersion ${imported.report.dataVersion}` : ''} · {size(preview.bounds)} · {formatNumber(blockCount)} Blöcke</p>
        {imported.report && 'regions' in imported.report && <LitematicRegions report={imported.report} disabled={busy} onChange={onRegion} />}
        {imported.report?.warnings.map((w, i) => <p className="small-note" key={i}>{w}</p>)}
        <label>Name<input name="name" required maxLength={120} key={regionName ?? ''} defaultValue={regionName || metaName || imported.name.replace(/\.(schem|litematic|json)$/i, '')} /></label>
        <label>Beschreibung<textarea name="description" maxLength={2000} rows={2} defaultValue={fileMeta?.description && !/^Converted from /.test(fileMeta.description) ? fileMeta.description.slice(0, 2000) : undefined} /></label>
        <label>Tags (Komma-getrennt)<input name="tags" placeholder="mauer, hafen" /></label>
        <FacetFields />
        <label>Autor<input name="author" maxLength={120} defaultValue={metaAuthor} /></label>
        <label>Herkunft<input name="source" maxLength={300} defaultValue={imported.name} /></label>
        <label>Nutzungsrechte<input name="license" maxLength={300} placeholder="ungeklärt" /></label>
        <button className="primary" type="submit" disabled={busy}>Als neues Bauteil speichern</button>
        <button className="text-button" type="button" onClick={onCancel}>Verwerfen</button>
      </form>
      <CropPanel key={`r-import-${imported.name}`} payload={preview} name={imported.name.replace(/\.(schem|litematic|json)$/i, '')}
        provenance={{ author: '', source: imported.name, license: '' }} getSource={() => sourceOf(imported)} onHighlight={setCropMarks} onSaved={onCropSaved} />
      {library.length > 0 && <details className="version-from-import"><summary>Stattdessen als neue Version speichern</summary>
        <ul className="asset-picker">{own.map(a => <li key={a.id}><button disabled={busy} onClick={() => onVersion(a, `${a.versionIds.length + 1}.0`)}>→ {a.name} (v{a.versionIds.length + 1}.0)</button></li>)}</ul>
        {own.length === 0 && <p className="small-note">Beispielbauteile erhalten keine neuen Versionen.</p>}</details>}
    </aside>
  </section>;
}
