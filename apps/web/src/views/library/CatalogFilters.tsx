import { BLOCK_CLASS_LABEL, FACETS, SIZE_CLASS_LABEL } from '../../../../../packages/domain/src/index.js';
import type { BlockClass, BuildingMetrics, CatalogQuery, FacetKey } from '../../../../../packages/domain/src/index.js';

export type Filters = Omit<CatalogQuery, 'text' | 'sort' | 'descending'>;

const DIFFICULTY = ['Sehr leicht', 'Leicht', 'Mittel', 'Anspruchsvoll', 'Experte'];

/** Number of active filter groups, shown on the collapsed panel. */
export function activeFilterCount(f: Filters): number {
  return FACETS.filter(d => f.facets?.[d.key]?.length).length + (f.tags?.length ? 1 : 0) + (f.sizeClasses?.length ? 1 : 0) + (f.blockClasses?.length ? 1 : 0)
    + (f.difficultyMax !== undefined ? 1 : 0) + (f.maxBuildMinutes !== undefined ? 1 : 0) + (f.plot ? 1 : 0)
    + (f.origin && f.origin !== 'alle' ? 1 : 0) + [f.onlyComplete, f.vanillaOnly, f.withConnectors, f.withBeds, f.includeArchived].filter(Boolean).length;
}

function toggle<T>(list: readonly T[] | undefined, value: T): T[] {
  const set = new Set(list ?? []);
  if (set.has(value)) set.delete(value); else set.add(value);
  return [...set];
}

/** Filter panel of the building catalogue. Facet chips show how many entries each value would leave. */
export function CatalogFilters({ filters, onChange, counts, tags }: {
  filters: Filters;
  onChange(f: Filters): void;
  counts: Record<FacetKey, Record<string, number>>;
  tags: readonly string[];
}) {
  const set = (patch: { [K in keyof Filters]?: Filters[K] | undefined }) => {
    const next: Record<string, unknown> = { ...filters, ...patch };
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    onChange(next as Filters);
  };
  const setFacet = (key: FacetKey, value: string) => set({ facets: { ...filters.facets, [key]: toggle(filters.facets?.[key], value) } });
  const num = (raw: string): number | undefined => { const n = Number(raw); return raw.trim() && Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined; };
  const plot = filters.plot;
  // A missing side means "unbounded" (9999); without width and depth there is no plot filter.
  const setPlot = (patch: { width?: number; depth?: number; height?: number | undefined; allowRotation?: boolean }) => {
    const width = patch.width ?? (plot && plot.width < 9999 ? plot.width : 0), depth = patch.depth ?? (plot && plot.depth < 9999 ? plot.depth : 0);
    const height = 'height' in patch ? patch.height : plot?.height;
    const allowRotation = patch.allowRotation ?? plot?.allowRotation ?? true;
    set({ plot: width || depth || height ? { width: width || 9999, depth: depth || 9999, allowRotation, ...(height !== undefined && { height }) } : undefined });
  };
  return <div className="catalog-filters">
    {FACETS.map(f => {
      const values = Object.keys({ ...f.values, ...counts[f.key] });
      return <div key={f.key} className="filter-group" role="group" aria-label={`Filter ${f.label}`}><span className="filter-label">{f.label}</span>
        <div className="chips">{values.map(v => {
          const n = counts[f.key][v] ?? 0, on = filters.facets?.[f.key]?.includes(v) ?? false;
          if (!n && !on) return null;
          return <button key={v} type="button" aria-pressed={on} onClick={() => setFacet(f.key, v)}>{f.values[v] ?? v} <small>{n}</small></button>;
        })}</div></div>;
    })}
    <div className="filter-group" role="group" aria-label="Filter Größe"><span className="filter-label">Größe (Grundfläche)</span>
      <div className="chips">{(Object.keys(SIZE_CLASS_LABEL) as BuildingMetrics['sizeClass'][]).map(c =>
        <button key={c} type="button" aria-pressed={filters.sizeClasses?.includes(c) ?? false} onClick={() => set({ sizeClasses: toggle(filters.sizeClasses, c) })}>{SIZE_CLASS_LABEL[c]}</button>)}</div></div>
    <div className="filter-group" role="group" aria-label="Filter Umfang"><span className="filter-label">Umfang (Blöcke)</span>
      <div className="chips">{(Object.keys(BLOCK_CLASS_LABEL) as BlockClass[]).map(c =>
        <button key={c} type="button" aria-pressed={filters.blockClasses?.includes(c) ?? false} onClick={() => set({ blockClasses: toggle(filters.blockClasses, c) })}>{BLOCK_CLASS_LABEL[c]}</button>)}</div></div>
    <label>Schwierigkeit höchstens
      <select value={filters.difficultyMax ?? ''} onChange={e => set({ difficultyMax: e.target.value ? Number(e.target.value) : undefined })}>
        <option value="">beliebig</option>{DIFFICULTY.map((d, i) => <option key={d} value={i + 1}>{i + 1} · {d}</option>)}</select></label>
    <label>Bauzeit höchstens (Minuten, Schätzung)<input inputMode="numeric" value={filters.maxBuildMinutes ?? ''} placeholder="beliebig"
      onChange={e => set({ maxBuildMinutes: num(e.target.value) })} /></label>
    <fieldset className="plot-fields"><legend>Bauplatz</legend>
      <div className="coord-row three">
        <label>Breite<input inputMode="numeric" aria-label="Bauplatz Breite" value={plot && plot.width < 9999 ? plot.width : ''} onChange={e => setPlot({ width: num(e.target.value) ?? 0 })} /></label>
        <label>Tiefe<input inputMode="numeric" aria-label="Bauplatz Tiefe" value={plot && plot.depth < 9999 ? plot.depth : ''} onChange={e => setPlot({ depth: num(e.target.value) ?? 0 })} /></label>
        <label>Höhe<input inputMode="numeric" aria-label="Bauplatz Höhe" value={plot?.height ?? ''} placeholder="∞" onChange={e => setPlot({ height: num(e.target.value) })} /></label>
      </div>
      <label className="check"><input type="checkbox" checked={plot?.allowRotation ?? true} disabled={!plot} onChange={e => setPlot({ allowRotation: e.target.checked })} /> Drehen um 90° erlaubt</label>
    </fieldset>
    <label>Herkunft<select value={filters.origin ?? 'alle'} onChange={e => set({ origin: e.target.value as Filters['origin'] })}>
      <option value="alle">Alle</option><option value="beispiele">Mitgelieferte Vorschläge</option><option value="eigene">Eigene Bauteile</option></select></label>
    <label className="check"><input type="checkbox" checked={filters.onlyComplete ?? false} onChange={e => set({ onlyComplete: e.target.checked })} /> Nur vollständige Materialliste</label>
    <label className="check"><input type="checkbox" checked={filters.vanillaOnly ?? false} onChange={e => set({ vanillaOnly: e.target.checked })} /> Nur Vanilla (keine Mods)</label>
    <label className="check"><input type="checkbox" checked={filters.withConnectors ?? false} onChange={e => set({ withConnectors: e.target.checked })} /> Mit Anschlüssen</label>
    <label className="check"><input type="checkbox" checked={filters.withBeds ?? false} onChange={e => set({ withBeds: e.target.checked })} /> Mit Schlafplatz</label>
    <label className="check"><input type="checkbox" checked={filters.includeArchived ?? false} onChange={e => set({ includeArchived: e.target.checked })} /> Archivierte zeigen</label>
    {tags.length > 0 && <details className="filter-group" open={(filters.tags?.length ?? 0) > 0}><summary className="filter-label">Tags ({tags.length})</summary>
      <div className="chips" role="group" aria-label="Tags">{tags.map(t => <button key={t} type="button" aria-pressed={filters.tags?.includes(t) ?? false} onClick={() => set({ tags: toggle(filters.tags, t) })}>{t}</button>)}</div></details>}
    {activeFilterCount(filters) > 0 && <button type="button" className="text-button" onClick={() => onChange({})}>Alle Filter zurücksetzen</button>}
  </div>;
}
