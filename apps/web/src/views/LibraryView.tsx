import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { countBlocks } from '../../../../packages/voxel/src/index.js';
import type { Cell } from '../../../../packages/voxel/src/index.js';
import { addAssetVersion, applyOperation, buildCatalog, buildingInfo, createAsset, createEnsembleProject, createProject, ensemblesWith, facetCounts, FACETS, familyMembers,
  latestVersions, newInstance, projectContext, queryCatalog, resolveProject, similarEntries, suggestForProject, updateAssetMeta, withFacets,
  ENSEMBLES, SORT_LABEL } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersionSource, BuildingFacets, CatalogEntry, Ensemble, OriginalFile, Project, SortKey } from '../../../../packages/domain/src/index.js';
import { href, navigate } from '../app/router';
import type { LibraryPage } from '../app/router';
import { useApp } from '../app/context';
import { importFile, IMPORT_ACCEPT, IMPORT_FORMAT_LABEL } from '../app/importFile';
import type { ImportedFile } from '../app/importFile';
import { errorText, formatNumber } from '../app/ui';
import { mix, stateColor } from '../colors';
import type { Highlight } from './library/ConnectorEditor';
import { CropPanel } from './library/CropPanel';
import { BuildingCard } from './library/BuildingCard';
import { BuildingDetail } from './library/BuildingDetail';
import { CatalogFilters, activeFilterCount, filterChips } from './library/CatalogFilters';
import type { Filters } from './library/CatalogFilters';
import { ComparePage } from './library/ComparePage';
import { EnsemblesPage } from './library/EnsemblesPage';
import { FacetFields, facetsFromForm } from './library/FacetFields';
import { useCompare, useFavorites, MAX_COMPARE } from './library/prefs';
import { Viewer } from '../Viewer';
import { Thumb } from '../thumbnail/Thumb';
import { LitematicRegions } from './library/LitematicRegions';

const size = (b: { min: readonly number[]; maxExclusive: readonly number[] }) => b.maxExclusive.map((n, i) => n - b.min[i]!).join(' × ');
const SORTS = Object.keys(SORT_LABEL) as SortKey[];
const PAGE_SIZE = 48;
const KATEGORIE = FACETS.find(f => f.key === 'kategorie')!;

/**
 * Bibliothek: building catalogue (B9) on top of the B0 asset library, laid out
 * like common schematic collections: category strip, filter sidebar, card grid
 * with previews, detail page per building, ensembles, Merkliste and comparison.
 * Sub-pages are hash routes, so the browser's back button returns to the grid
 * with search, filters and scroll position intact (the view stays mounted).
 */
export function LibraryView({ projectId: initialProjectId, page = 'browse', id }: { projectId?: string | undefined; page?: LibraryPage | undefined; id?: string | undefined } = {}) {
  const { repo, library, reloadLibrary } = useApp();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortKey>(initialProjectId ? 'match' : 'name');
  const [descending, setDescending] = useState(false);
  const [projects, setProjects] = useState<readonly Project[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState<{ href: string; label: string } | null>(null);
  const [imported, setImported] = useState<ImportedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [collapse, setCollapse] = useState(true);
  const [layout, setLayout] = useState<'raster' | 'liste'>('raster');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const favorites = useFavorites();
  const compare = useCompare();
  const abort = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const scroll = useRef(0);
  // Metrics are pure functions of immutable, content-addressed versions: cache by version id.
  const metricsCache = useRef(new Map());
  const catalog = useMemo(() => buildCatalog(library.assets, library.versions, metricsCache.current), [library]);
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
  const results = onlyFavorites ? allResults.filter(e => favorites.has(e.asset.id)) : allResults;
  const families = useMemo(() => familyMembers(catalog.entries), [catalog]);
  const counts = facetCounts(catalog.entries, catalogQuery);
  const categoryCounts = facetCounts(catalog.entries, { ...catalogQuery, facets: { ...filters.facets, kategorie: [] } }).kategorie;
  const total = catalog.entries.filter(e => !e.asset.archived).length;
  const activeKategorie = filters.facets?.kategorie ?? [];
  // A representative (largest) building per category for the category tiles.
  const categoryCovers = useMemo(() => {
    const best = new Map<string, CatalogEntry>();
    for (const e of catalog.entries) for (const k of e.facets.kategorie) {
      const cur = best.get(k);
      if (!e.asset.archived && (!cur || e.metrics.blocks > cur.metrics.blocks)) best.set(k, e);
    }
    return best;
  }, [catalog]);

  const libHref = useCallback((p: LibraryPage, target?: string) => href({ view: 'library', ...(projectId && { projectId }), page: p, ...(target && { id: target }) }), [projectId]);
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
  useEffect(() => { setLimit(PAGE_SIZE); }, [query, filters, sort, descending, collapse, onlyFavorites]);

  const say = (text: string, next: { href: string; label: string } | null = null) => { setMessage(text); setLink(next); };
  const open = async (f: File) => {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); say('');
    try { const r = await importFile(f, controller.signal); if (!controller.signal.aborted) { setImported(r); window.scrollTo(0, 0); } }
    catch (e) { if (!controller.signal.aborted) say(`Import nicht übernommen: ${errorText(e)}`); }
    finally { if (abort.current === controller) setBusy(false); }
  };
  const pickRegion = async (region: string | undefined) => {
    if (!imported) return;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); say('');
    try { const r = await importFile(new File([imported.original], imported.name), controller.signal, region); if (!controller.signal.aborted) setImported(r); }
    catch (e) { if (!controller.signal.aborted) say(`Region nicht übernommen: ${errorText(e)}`); }
    finally { if (abort.current === controller) setBusy(false); }
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
  const saveNew = async (form: FormData) => {
    if (!imported) return;
    try {
      const asset = createAsset({ name: String(form.get('name')), description: String(form.get('description') ?? ''),
        tags: withFacets(String(form.get('tags') ?? '').split(',').map(t => t.trim()).filter(Boolean), facetsFromForm(form)),
        provenance: { author: String(form.get('author') ?? ''), source: String(form.get('source') ?? ''), license: String(form.get('license') ?? '') } });
      const r = await addAssetVersion(asset, { payload: imported.payload, label: '1.0', source: await sourceOf(imported) });
      await repo.applyBatch({ versions: [r.version], assets: [r.asset], originals: [originalOf(imported, r.version.source)] }); await reloadLibrary();
      setImported(null); say(`„${r.asset.name}“ als Bauteil gespeichert.`); showBuilding(r.asset.id);
    } catch (e) { say(`Nicht gespeichert: ${errorText(e)}`); }
  };
  const saveVersion = async (asset: Asset, label: string) => {
    if (!imported) return;
    try {
      const previous = library.versions.get(asset.versionIds.at(-1) ?? '');
      const r = await addAssetVersion(asset, { payload: imported.payload, label, connectors: previous?.connectors ?? [], source: await sourceOf(imported) });
      await repo.applyBatch({ versions: [r.version], assets: [r.asset], originals: [originalOf(imported, r.version.source)] }); await reloadLibrary();
      setImported(null); say(`Version ${r.version.label} von „${asset.name}“ gespeichert. Bestehende Projekte behalten ihre Version.`); showBuilding(asset.id);
    } catch (e) { say(`Nicht gespeichert: ${errorText(e)}`); }
  };
  const archive = async (asset: Asset) => {
    try { await repo.saveAsset(updateAssetMeta(asset, { archived: !asset.archived })); await reloadLibrary(); }
    catch (e) { say(errorText(e)); }
  };
  const saveFacets = async (asset: Asset, facets: BuildingFacets, plain: string[]) => {
    try { await repo.saveAsset(updateAssetMeta(asset, { tags: withFacets(plain, facets) })); await reloadLibrary(); say(`Angaben zu „${asset.name}“ gespeichert.`); }
    catch (e) { say(`Angaben nicht gespeichert: ${errorText(e)}`); }
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

  const header = <header className="page-head library-head"><div><span className="eyebrow">BIBLIOTHEK</span><h1 className="page-title">Gebäude &amp; Bauteile</h1>
      <p className="muted">{catalog.entries.filter(e => e.asset.demo && !e.asset.archived).length} mitgelieferte Gebäudevorschläge und deine eigenen Bauteile, mit Vorschau, berechneten Kennwerten und Bauplan.</p></div>
    <div className="button-row"><button className="primary" disabled={busy} onClick={() => file.current?.click()}>＋ Schem / Litematic / JSON importieren</button>
      <input ref={file} className="file-input" type="file" aria-label="Bauteildatei" accept={IMPORT_ACCEPT}
        onChange={e => { const f = e.target.files?.[0]; if (f) void open(f); e.target.value = ''; }} />
      {busy && <button onClick={() => { abort.current?.abort(); setBusy(false); say('Import abgebrochen.'); }}>Abbrechen</button>}</div></header>
  const tabs = <nav className="lib-tabs" aria-label="Ansicht">
    <a href={libHref('browse')} aria-current={page === 'browse' || page === 'building' ? 'page' : undefined}>Gebäude <small>{total}</small></a>
    <a href={libHref('ensembles')} aria-current={page === 'ensembles' ? 'page' : undefined}>Ensembles <small>{ENSEMBLES.length}</small></a>
    <a href={compare.ids.length ? libHref('compare', compare.ids.join(',')) : libHref('compare', '-')} aria-current={page === 'compare' ? 'page' : undefined}>Vergleich <small>{compare.ids.length}</small></a>
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
      {entry && asset && latest ? <BuildingDetail key={asset.id} entry={entry} asset={asset} latest={latest} versions={library.versions} byAsset={byAsset}
        info={buildingInfo(asset.id)} ensembles={ensemblesWith(asset.id)} similar={similarEntries(entry, catalog.entries, 6)}
        suggestion={suggestions?.get(asset.id)} project={project} projects={projects} adding={adding}
        favorite={favorites.has(asset.id)} comparing={compare.has(asset.id)} libHref={libHref}
        onFavorite={() => favorites.toggle(asset.id)} onCompare={() => toggleCompare(asset.id)}
        onAdd={pid => void addToProject(entry, pid)} onNewProject={() => void newProjectWith(entry)}
        onSaveFacets={asset.demo ? undefined : (facets, plain) => void saveFacets(asset, facets, plain)}
        onArchive={() => void archive(asset)} onMessage={m => say(m)} onSelectSaved={showBuilding} />
        : <div className="notice warning" role="alert">Gebäude „{id}“ ist nicht in der Bibliothek. <a href={libHref('browse')}>Zur Übersicht</a></div>}
      {tray}</div>;
  }
  if (page === 'ensembles') return <div className="page">{header}{tabs}{notices}
    <EnsemblesPage id={id} byAsset={byAsset} names={assetNames} versions={library.versions} libHref={libHref} onCreate={e => void createFromEnsemble(e)} /></div>;
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
      <button type="button" className="surprise" onClick={surprise} title="Zufälliges Gebäude aus den aktuellen Treffern">🎲 Überrasch mich</button>
    </section>
    <section className="catalog-layout">
      <aside className={`filter-sidebar${filtersOpen ? ' open' : ''}`} aria-label="Filter">
        <button type="button" className="filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
          Filter{activeFilterCount(filters) ? ` (${activeFilterCount(filters)} aktiv)` : ''}</button>
        <div className="filter-body">
          <label className="check"><input type="checkbox" checked={collapse} onChange={e => setCollapse(e.target.checked)} /> Varianten zusammenfassen</label>
          <label className="check"><input type="checkbox" checked={onlyFavorites} onChange={e => setOnlyFavorites(e.target.checked)} /> Nur Merkliste ({favorites.ids.length})</label>
          <CatalogFilters filters={filters} onChange={setFilters} counts={counts} tags={tags} hideFacets={['kategorie']} />
        </div>
      </aside>
      <div className="catalog-main">
        <div className="result-head">
          <span className="result-count" role="status"><b>{results.length}</b> von {total} Einträgen</span>
          {chips.length > 0 && <ul className="active-chips" aria-label="Aktive Filter">{chips.map(c => <li key={c.key}>
            <button type="button" onClick={() => setFilters(c.next)} aria-label={`Filter ${c.label} entfernen`}>{c.label} <span aria-hidden="true">×</span></button></li>)}
            <li><button type="button" className="text-button" onClick={() => setFilters({})}>Alle Filter zurücksetzen</button></li></ul>}
        </div>
        {suggestions && project && <p className="small-note match-note">Sortiert nach Passung zu „{project.name}“: Materialähnlichkeit, Stil, Biom, freie Anschlüsse, neue Kategorie, Profil. Details auf der Gebäudeseite.</p>}
        <ul className={`catalog-results ${layout}`}>{shown.map(e => <li key={e.asset.id}>
          <BuildingCard entry={e} href={libHref('building', e.asset.id)} score={scores?.get(e.asset.id)}
            variants={collapse && e.family ? families.get(e.family)?.length : undefined}
            favorite={favorites.has(e.asset.id)} comparing={compare.has(e.asset.id)}
            onFavorite={() => favorites.toggle(e.asset.id)} onCompare={() => toggleCompare(e.asset.id)} /></li>)}
          {results.length === 0 && <li className="empty-results"><p>Keine Treffer.</p><button className="text-button" onClick={() => { setFilters({}); setQuery(''); setOnlyFavorites(false); }}>Suche und Filter zurücksetzen</button></li>}</ul>
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
  const colorFor = useMemo(() => (cell: Cell) => {
    const base = cell.kind === 'erase' ? '#d35f5f' : stateColor(preview.palette[cell.paletteIndex]!.id);
    const mark = cropMarks?.(cell) ?? null;
    return mark === 'hit' ? '#ffd166' : mark === 'dim' ? mix(base, '#16303c', 0.7) : base;
  }, [preview, cropMarks]);
  const own = library.filter(a => !a.demo);
  const regionName = imported.report && 'selectedRegion' in imported.report ? imported.report.selectedRegion : undefined;
  return <section className="detail-hero import-hero" aria-label="Import prüfen">
    <div className="viewport detail-stage"><Viewer key={`import-${imported.name}-${regionName ?? ''}`} payload={preview} cells={preview.cells} onSelect={noSelect} colorFor={colorFor} /></div>
    <aside className="inspector detail-summary">
      <form onSubmit={e => { e.preventDefault(); onSave(new FormData(e.currentTarget)); }}>
        <span className="panel-kicker">DATEI GEPRÜFT</span>
        <p className="muted">{imported.name} · {IMPORT_FORMAT_LABEL[imported.format]}{imported.report ? `, DataVersion ${imported.report.dataVersion}` : ''} · {size(preview.bounds)} · {formatNumber(countBlocks(preview).blocks)} Blöcke</p>
        {imported.report && 'regions' in imported.report && <LitematicRegions report={imported.report} disabled={busy} onChange={onRegion} />}
        {imported.report?.warnings.map((w, i) => <p className="small-note" key={i}>{w}</p>)}
        <label>Name<input name="name" required maxLength={120} key={regionName ?? ''} defaultValue={regionName || imported.name.replace(/\.(schem|litematic|json)$/i, '')} /></label>
        <label>Beschreibung<textarea name="description" maxLength={2000} rows={2} /></label>
        <label>Tags (Komma-getrennt)<input name="tags" placeholder="mauer, hafen" /></label>
        <FacetFields />
        <label>Autor<input name="author" maxLength={120} /></label>
        <label>Herkunft<input name="source" maxLength={300} defaultValue={imported.name} /></label>
        <label>Nutzungsrechte<input name="license" maxLength={300} placeholder="ungeklärt" /></label>
        <button className="primary" type="submit">Als neues Bauteil speichern</button>
        <button className="text-button" type="button" onClick={onCancel}>Verwerfen</button>
      </form>
      <CropPanel key={`r-import-${imported.name}`} payload={preview} name={imported.name.replace(/\.(schem|litematic|json)$/i, '')}
        provenance={{ author: '', source: imported.name, license: '' }} getSource={() => sourceOf(imported)} onHighlight={setCropMarks} onSaved={onCropSaved} />
      {library.length > 0 && <details className="version-from-import"><summary>Stattdessen als neue Version speichern</summary>
        <ul className="asset-picker">{own.map(a => <li key={a.id}><button onClick={() => onVersion(a, `${a.versionIds.length + 1}.0`)}>→ {a.name} (v{a.versionIds.length + 1}.0)</button></li>)}</ul>
        {own.length === 0 && <p className="small-note">Beispielbauteile erhalten keine neuen Versionen.</p>}</details>}
    </aside>
  </section>;
}
