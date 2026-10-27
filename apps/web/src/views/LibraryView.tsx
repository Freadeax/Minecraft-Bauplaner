import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { countBlocks } from '../../../../packages/voxel/src/index.js';
import type { Cell } from '../../../../packages/voxel/src/index.js';
import { addAssetVersion, applyOperation, buildCatalog, createAsset, facetCounts, facetLabel, newInstance, projectContext, queryCatalog, resolveProject,
  similarEntries, suggestForProject, updateAssetMeta, withFacets, SORT_LABEL } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersionSource, BuildingFacets, BuildingMetrics, CatalogEntry, OriginalFile, Project, SortKey } from '../../../../packages/domain/src/index.js';
import { useApp } from '../app/context';
import { importFile } from '../app/importFile';
import type { ImportedFile } from '../app/importFile';
import { errorText, formatNumber } from '../app/ui';
import { mix, stateColor } from '../colors';
import { ConnectorEditor } from './library/ConnectorEditor';
import type { Highlight } from './library/ConnectorEditor';
import { CropPanel } from './library/CropPanel';
import { BuildingSheet } from './library/BuildingSheet';
import { CatalogFilters, activeFilterCount } from './library/CatalogFilters';
import type { Filters } from './library/CatalogFilters';
import { FacetFields, facetsFromForm } from './library/FacetFields';
import { Viewer } from '../Viewer';

const size = (b: { min: readonly number[]; maxExclusive: readonly number[] }) => b.maxExclusive.map((n, i) => n - b.min[i]!).join(' × ');

const stars = (level: number): string => '★'.repeat(level) + '☆'.repeat(5 - level);
const SORTS = Object.keys(SORT_LABEL) as SortKey[];

/**
 * Bibliothek: Gebäudevorschläge und eigene Bauteile (B9 catalogue on top of
 * the B0 asset library). Search, facet filters, building site, sorting,
 * project-aware suggestions, building sheet, file import as asset.
 */
export function LibraryView({ projectId: initialProjectId }: { projectId?: string | undefined } = {}) {
  const { repo, library, reloadLibrary } = useApp();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortKey>(initialProjectId ? 'match' : 'name');
  const [descending, setDescending] = useState(false);
  const [projects, setProjects] = useState<readonly Project[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState<{ href: string; label: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imported, setImported] = useState<ImportedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const abort = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  // Metrics are pure functions of immutable, content-addressed versions: cache by version id.
  const metricsCache = useRef(new Map<string, BuildingMetrics>());
  const catalog = useMemo(() => buildCatalog(library.assets, library.versions, metricsCache.current), [library]);
  const tags = useMemo(() => [...new Set(catalog.entries.flatMap(e => e.tags))].sort(), [catalog]);

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
  const scores = useMemo(() => suggestions ? new Map([...suggestions].map(([id, s]) => [id, s.score])) : undefined, [suggestions]);
  const effectiveSort: SortKey = sort === 'match' && !scores ? 'name' : sort;
  const catalogQuery = { ...filters, text: query, sort: effectiveSort, descending };
  const results = queryCatalog(catalog.entries, catalogQuery, scores);
  const counts = facetCounts(catalog.entries, catalogQuery);
  const selected = library.assets.find(a => a.id === selectedId) ?? null;
  const selectedEntry: CatalogEntry | null = catalog.entries.find(e => e.asset.id === selectedId) ?? null;
  const similar = useMemo(() => selectedEntry ? similarEntries(selectedEntry, catalog.entries) : [], [selectedEntry, catalog]);
  const latest = selected ? library.versions.get(selected.versionIds.at(-1) ?? '') ?? null : null;
  const noSelect = useMemo(() => () => {}, []);
  // Each panel owns one highlight layer; the crop box wins over connector anchors.
  const [connectorMarks, setConnectorMarksState] = useState<Highlight>(null);
  const [cropMarks, setCropMarksState] = useState<Highlight>(null);
  const setConnectorMarks = useCallback((h: Highlight) => setConnectorMarksState(() => h), []);
  const setCropMarks = useCallback((h: Highlight) => setCropMarksState(() => h), []);

  const open = async (f: File) => {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); setMessage('');
    try { const r = await importFile(f, controller.signal); if (!controller.signal.aborted) { setImported(r); setSelectedId(null); } }
    catch (e) { if (!controller.signal.aborted) setMessage(`Import nicht übernommen: ${errorText(e)}`); }
    finally { if (abort.current === controller) setBusy(false); }
  };
  const sourceOf = (r: ImportedFile): Promise<AssetVersionSource> => crypto.subtle.digest('SHA-256', r.original).then(d => ({
    format: r.format === 'schem' ? 'schem-v3' : 'voxel-json', fileName: r.name,
    originalSha256: Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join(''),
    ...(r.report && { dataVersion: r.report.dataVersion }),
  }));
  // Original bytes are stored unchanged next to the version, in the same transaction (B3).
  const originalOf = (r: ImportedFile, source: AssetVersionSource): OriginalFile => ({
    sha256: source.originalSha256!, fileName: r.name, mediaType: r.format === 'json' ? 'application/json' : 'application/octet-stream',
    size: r.original.byteLength, createdAt: new Date().toISOString(), bytes: new Uint8Array(r.original.slice(0)),
  });
  const saveNew = async (form: FormData) => {
    if (!imported) return;
    try {
      const asset = createAsset({ name: String(form.get('name')), description: String(form.get('description') ?? ''),
        tags: withFacets(String(form.get('tags') ?? '').split(',').map(t => t.trim()).filter(Boolean), facetsFromForm(form)),
        provenance: { author: String(form.get('author') ?? ''), source: String(form.get('source') ?? ''), license: String(form.get('license') ?? '') } });
      const r = await addAssetVersion(asset, { payload: imported.payload, label: '1.0', source: await sourceOf(imported) });
      await repo.applyBatch({ versions: [r.version], assets: [r.asset], originals: [originalOf(imported, r.version.source)] }); await reloadLibrary();
      setImported(null); setSelectedId(r.asset.id); setMessage(`„${r.asset.name}“ als Bauteil gespeichert.`);
    } catch (e) { setMessage(`Nicht gespeichert: ${errorText(e)}`); }
  };
  const saveVersion = async (asset: Asset, label: string) => {
    if (!imported) return;
    try {
      const previous = library.versions.get(asset.versionIds.at(-1) ?? '');
      const r = await addAssetVersion(asset, { payload: imported.payload, label, connectors: previous?.connectors ?? [], source: await sourceOf(imported) });
      await repo.applyBatch({ versions: [r.version], assets: [r.asset], originals: [originalOf(imported, r.version.source)] }); await reloadLibrary();
      setImported(null); setSelectedId(asset.id); setMessage(`Version ${r.version.label} von „${asset.name}“ gespeichert. Bestehende Projekte behalten ihre Version.`);
    } catch (e) { setMessage(`Nicht gespeichert: ${errorText(e)}`); }
  };
  const archive = async (asset: Asset) => {
    try { await repo.saveAsset(updateAssetMeta(asset, { archived: !asset.archived })); await reloadLibrary(); }
    catch (e) { setMessage(errorText(e)); }
  };
  const say = (text: string, next: { href: string; label: string } | null = null) => { setMessage(text); setLink(next); };
  const saveFacets = async (asset: Asset, facets: BuildingFacets, plain: string[]) => {
    try { await repo.saveAsset(updateAssetMeta(asset, { tags: withFacets(plain, facets) })); await reloadLibrary(); say(`Angaben zu „${asset.name}“ gespeichert.`); }
    catch (e) { say(`Angaben nicht gespeichert: ${errorText(e)}`); }
  };
  /**
   * Adds the latest version as new instance beside the existing world, exactly
   * like the editor does, and stores it with the project's current revision.
   * Snapping to connectors stays an explicit step in the editor.
   */
  const addToProject = async (entry: CatalogEntry) => {
    if (!project) return;
    setAdding(true);
    try {
      const stored = await repo.getProject(project.id);
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

  const preview = imported?.payload ?? latest?.payload ?? null;
  const colorFor = useMemo(() => (cell: Cell) => {
    const base = cell.kind === 'erase' || !preview ? '#d35f5f' : stateColor(preview.palette[cell.paletteIndex]!.id);
    const mark = cropMarks?.(cell) ?? connectorMarks?.(cell) ?? null;
    return mark === 'hit' ? '#ffd166' : mark === 'dim' ? mix(base, '#16303c', 0.7) : base;
  }, [preview, cropMarks, connectorMarks]);
  return <div className="page">
    <header className="page-head"><div><span className="eyebrow">BIBLIOTHEK</span><h1 className="page-title">Gebäude &amp; Bauteile</h1>
      <p className="muted">{catalog.entries.filter(e => e.asset.demo && !e.asset.archived).length} mitgelieferte Gebäudevorschläge und deine eigenen Bauteile. Kennwerte werden aus dem Bauplan berechnet, Angaben wie Stil oder Biom sind gekennzeichnet. Jede Version ist unveränderlich; Projekte behalten ihre Version.</p></div>
      <div className="button-row"><button className="primary" disabled={busy} onClick={() => file.current?.click()}>＋ Schem / JSON importieren</button>
        <input ref={file} className="file-input" type="file" aria-label="Bauteildatei" accept=".schem,.json,application/json,application/octet-stream"
          onChange={e => { const f = e.target.files?.[0]; if (f) void open(f); e.target.value = ''; }} />
        {busy && <button onClick={() => { abort.current?.abort(); setBusy(false); setMessage('Import abgebrochen.'); }}>Abbrechen</button>}</div></header>
    {message && <div className="notice" role="status">{message}{link && <a className="notice-link" href={link.href}>{link.label} →</a>}</div>}
    {catalog.missing.length > 0 && <div className="notice warning" role="alert">Version fehlt im Speicher für: {catalog.missing.map(a => a.name).join(', ')}. Diese Einträge werden nicht angezeigt.</div>}
    <section className="catalog-bar" aria-label="Suche und Sortierung">
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Suchen: Name, Stil, Material, Beruf …" aria-label="Bauteile suchen" />
      <label>Passend zu Projekt<select value={projectId} aria-label="Projekt für Vorschläge" onChange={e => { setProjectId(e.target.value); if (e.target.value) setSort('match'); }}>
        <option value="">– kein Projekt –</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Sortieren<select value={effectiveSort} aria-label="Sortierung" onChange={e => setSort(e.target.value as SortKey)}>
        {SORTS.map(k => <option key={k} value={k} disabled={k === 'match' && !scores}>{SORT_LABEL[k]}</option>)}</select></label>
      {effectiveSort !== 'match' && <button type="button" aria-label={descending ? 'Absteigend sortiert' : 'Aufsteigend sortiert'} onClick={() => setDescending(!descending)}>{descending ? '↓ absteigend' : '↑ aufsteigend'}</button>}
      <span className="muted" role="status">{results.length} von {catalog.entries.filter(e => !e.asset.archived).length} Einträgen</span>
    </section>
    <section className="library catalog">
      <aside className="library-list">
        <details className="filter-panel"><summary>Filter{activeFilterCount(filters) ? ` (${activeFilterCount(filters)} aktiv)` : ''}</summary>
          <CatalogFilters filters={filters} onChange={setFilters} counts={counts} tags={tags} /></details>
        <ul className="instance-list catalog-results">{results.map(e => { const m = e.metrics, s = scores?.get(e.asset.id); return <li key={e.asset.id}>
          <button aria-pressed={e.asset.id === selectedId} onClick={() => { setSelectedId(e.asset.id); setImported(null); }}>
            <strong>{e.asset.name}{s !== undefined && <em className="score" title="Passung zum Projekt (0–100)">{s}</em>}</strong>
            <span>{[...e.facets.kategorie.map(k => facetLabel('kategorie', k)), ...e.facets.stil.map(v => facetLabel('stil', v))].join(' · ') || 'ohne Angaben'}{e.asset.demo ? ' · Beispiel' : ''}{e.asset.archived ? ' · archiviert' : ''}</span>
            <span>{m.size.join('×')} · {formatNumber(m.blocks)} Blöcke · <span className="stars" aria-label={`Schwierigkeit ${m.difficulty.level} von 5`}>{stars(m.difficulty.level)}</span> · ≈ {m.buildTime.minutes} min</span>
          </button></li>; })}
          {results.length === 0 && <li className="muted">Keine Treffer. Filter lockern oder <button className="text-button" onClick={() => { setFilters({}); setQuery(''); }}>alles zurücksetzen</button>.</li>}</ul>
      </aside>
      <div className="viewport library-preview">
        {preview ? <Viewer key={imported ? `import-${imported.name}` : latest?.id} payload={preview} cells={preview.cells} onSelect={noSelect} colorFor={colorFor} />
          : <div className="scene empty-scene"><p>Wähle links ein Gebäude oder importiere eine Datei.</p></div>}
      </div>
      <aside className="inspector">
        {imported ? <form onSubmit={e => { e.preventDefault(); void saveNew(new FormData(e.currentTarget)); }}>
          <span className="panel-kicker">DATEI GEPRÜFT</span>
          <p className="muted">{imported.name} · {imported.format === 'schem' ? `Sponge Schem v3, DataVersion ${imported.report?.dataVersion}` : 'Voxel-JSON'} · {size(imported.payload.bounds)} · {formatNumber(countBlocks(imported.payload).blocks)} Blöcke</p>
          {imported.report?.warnings.map((w, i) => <p className="small-note" key={i}>{w}</p>)}
          <label>Name<input name="name" required maxLength={120} defaultValue={imported.name.replace(/\.(schem|json)$/i, '')} /></label>
          <label>Beschreibung<textarea name="description" maxLength={2000} rows={2} /></label>
          <label>Tags (Komma-getrennt)<input name="tags" placeholder="mauer, hafen" /></label>
          <FacetFields />
          <label>Autor<input name="author" maxLength={120} /></label>
          <label>Herkunft<input name="source" maxLength={300} defaultValue={imported.name} /></label>
          <label>Nutzungsrechte<input name="license" maxLength={300} placeholder="ungeklärt" /></label>
          <button className="primary" type="submit">Als neues Bauteil speichern</button>
          <button className="text-button" type="button" onClick={() => setImported(null)}>Verwerfen</button>
        </form> : selected && latest ? <div className="inspector-body">
          {selectedEntry && <BuildingSheet entry={selectedEntry} similar={similar} onSelect={id => setSelectedId(id)}
            suggestion={suggestions?.get(selected.id)} projectName={project?.name} adding={adding}
            onAdd={project ? () => void addToProject(selectedEntry) : undefined}
            onSaveFacets={selected.demo ? undefined : (facets, plain) => void saveFacets(selected, facets, plain)} />}
          <span className="panel-kicker">HERKUNFT</span>
          <dl className="stats">
            <div><dt>Autor</dt><dd>{selected.provenance.author || '–'}</dd></div><div><dt>Herkunft</dt><dd>{selected.provenance.source || '–'}</dd></div>
            <div><dt>Nutzungsrechte</dt><dd>{selected.provenance.license}</dd></div><div><dt>Profil</dt><dd>{latest.payload.profileId}</dd></div>
            <div><dt>Anschlüsse</dt><dd>{latest.connectors.map(c => c.id).join(', ') || 'keine'}</dd></div></dl>
          <span className="panel-kicker">VERSIONEN</span>
          <ul className="version-list">{selected.versionIds.map(id => { const v = library.versions.get(id); return <li key={id}><strong>{v?.label ?? '?'}</strong> <span className="hash">{v?.payloadHash.slice(0, 12) ?? 'fehlt'}</span> {v && <small>{new Date(v.createdAt).toLocaleDateString('de-DE')} · {v.source.format}</small>}</li>; })}</ul>
          <div className="button-row"><button onClick={() => void archive(selected)}>{selected.archived ? 'Aus Archiv holen' : 'Archivieren'}</button></div>
          <ConnectorEditor key={`c-${latest.id}`} asset={selected} version={latest} onHighlight={setConnectorMarks} onSaved={setMessage} />
          <CropPanel key={`r-${latest.id}`} payload={latest.payload} name={selected.name} provenance={selected.provenance} getSource={async () => latest.source}
            onHighlight={setCropMarks} onSaved={(m, id) => { setMessage(m); setSelectedId(id); }} />
        </div> : suggestions && project ? <div className="inspector-body"><span className="panel-kicker">VORSCHLÄGE FÜR „{project.name.toUpperCase()}“</span>
          <ul className="similar-list">{[...suggestions.values()].filter(s => !catalog.entries.find(e => e.asset.id === s.assetId)?.asset.archived).slice(0, 6).map(s => {
            const e = catalog.entries.find(x => x.asset.id === s.assetId);
            return e && <li key={s.assetId}><button onClick={() => setSelectedId(s.assetId)}><strong>{e.asset.name}</strong>
              <span>{s.reasons.filter(r => r.points > 0).slice(0, 2).map(r => r.label).join(' · ') || 'wenig Gemeinsamkeiten'}</span><b>{s.score}</b></button></li>;
          })}</ul><p className="small-note">Punkte: Materialähnlichkeit, Stil, Biom, freie Anschlüsse, neue Kategorie, Profil. Details im Steckbrief.</p></div>
          : <p className="muted">Wähle links ein Gebäude für den Steckbrief{projects.length ? ' oder oben ein Projekt für passende Vorschläge' : ''}.</p>}
        {imported && <CropPanel key={`r-import-${imported.name}`} payload={imported.payload} name={imported.name.replace(/\.(schem|json)$/i, '')}
          provenance={{ author: '', source: imported.name, license: '' }} getSource={() => sourceOf(imported)}
          onHighlight={setCropMarks} onSaved={(m, id) => { setMessage(m); setImported(null); setSelectedId(id); }} />}
        {imported && library.assets.length > 0 && <details className="version-from-import"><summary>Stattdessen als neue Version speichern</summary>
          <ul className="asset-picker">{library.assets.filter(a => !a.demo).map(a => <li key={a.id}><button onClick={() => void saveVersion(a, `${a.versionIds.length + 1}.0`)}>→ {a.name} (v{a.versionIds.length + 1}.0)</button></li>)}</ul>
          {library.assets.every(a => a.demo) && <p className="small-note">Beispielbauteile erhalten keine neuen Versionen.</p>}</details>}
      </aside>
    </section>
  </div>;
}
