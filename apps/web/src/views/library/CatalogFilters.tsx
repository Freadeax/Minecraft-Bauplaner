import { BLOCK_CLASS_LABEL, EFFORT_LABEL, FACETS, PLOT_PRESETS, plotPresetOf, profileFitLabel, SIZE_CLASS_LABEL, STAGES, STAGE_HINT, STAGE_LABEL } from '../../../../../packages/domain/src/index.js';
import type { BlockClass, BuildingMetrics, CatalogQuery, FacetKey, Stage } from '../../../../../packages/domain/src/index.js';

export type Filters = Omit<CatalogQuery, 'text' | 'sort' | 'descending' | 'collapseFamilies'>;

const DIFFICULTY = ['Sehr leicht', 'Leicht', 'Mittel', 'Anspruchsvoll', 'Experte'];

/** Number of active filter groups, shown on the collapsed panel. */
export function activeFilterCount(f: Filters): number {
  return FACETS.filter(d => f.facets?.[d.key]?.length).length + (f.tags?.length ? 1 : 0) + (f.sizeClasses?.length ? 1 : 0) + (f.blockClasses?.length ? 1 : 0)
    + (f.difficultyMax !== undefined ? 1 : 0) + (f.stageMax ? 1 : 0) + (f.maxBuildMinutes !== undefined ? 1 : 0) + (f.plot ? 1 : 0)
    + (f.origin && f.origin !== 'alle' ? 1 : 0) + [f.onlyComplete, f.vanillaOnly, f.withConnectors, f.withBeds, f.includeArchived, f.gameChecked].filter(Boolean).length
    + (f.effortMax !== undefined ? 1 : 0) + (f.mods?.length ? 1 : 0) + (f.profiles?.length ? 1 : 0);
}

/** One removable chip per active filter value, for the row above the results. */
export function filterChips(f: Filters): { key: string; label: string; next: Filters }[] {
  const out: { key: string; label: string; next: Filters }[] = [];
  const without = (patch: Partial<Record<keyof Filters, unknown>>): Filters => {
    const next: Record<string, unknown> = { ...f, ...patch };
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    return next as Filters;
  };
  for (const d of FACETS) for (const v of f.facets?.[d.key] ?? [])
    out.push({ key: `${d.key}:${v}`, label: `${d.label}: ${d.values[v] ?? v}`, next: without({ facets: { ...f.facets, [d.key]: f.facets![d.key]!.filter(x => x !== v) } }) });
  for (const t of f.tags ?? []) out.push({ key: `tag:${t}`, label: `#${t}`, next: without({ tags: f.tags!.filter(x => x !== t) }) });
  for (const c of f.sizeClasses ?? []) out.push({ key: `size:${c}`, label: `Größe ${SIZE_CLASS_LABEL[c].split(' (')[0]}`, next: without({ sizeClasses: f.sizeClasses!.filter(x => x !== c) }) });
  for (const c of f.blockClasses ?? []) out.push({ key: `blocks:${c}`, label: `Umfang ${c.toUpperCase()}`, next: without({ blockClasses: f.blockClasses!.filter(x => x !== c) }) });
  if (f.difficultyMax !== undefined) out.push({ key: 'difficulty', label: `Schwierigkeit ≤ ${f.difficultyMax}`, next: without({ difficultyMax: undefined }) });
  if (f.stageMax) out.push({ key: 'stage', label: `bis ${STAGE_LABEL[f.stageMax]}`, next: without({ stageMax: undefined }) });
  if (f.maxBuildMinutes !== undefined) out.push({ key: 'time', label: `≤ ${f.maxBuildMinutes} min`, next: without({ maxBuildMinutes: undefined }) });
  if (f.effortMax !== undefined) out.push({ key: 'effort', label: `Survival-Aufwand ≤ ${EFFORT_LABEL[f.effortMax as 1]}`, next: without({ effortMax: undefined }) });
  if (f.mods?.length) out.push({ key: 'mods', label: `Mods: ${f.mods.join(', ')}`, next: without({ mods: undefined }) });
  for (const p of f.profiles ?? []) out.push({ key: `profile:${p}`, label: profileFitLabel(p), next: without({ profiles: f.profiles!.filter(x => x !== p) }) });
  if (f.plot) out.push({ key: 'plot', label: plotPresetOf(f.plot) ? `Grundstück ${plotPresetOf(f.plot)!.label}` : `Bauplatz ${f.plot.width < 9999 ? f.plot.width : '∞'}×${f.plot.depth < 9999 ? f.plot.depth : '∞'}${f.plot.height ? `×${f.plot.height}` : ''}`, next: without({ plot: undefined }) });
  if (f.origin && f.origin !== 'alle') out.push({ key: 'origin', label: f.origin === 'eigene' ? 'Eigene Bauteile' : 'Mitgelieferte', next: without({ origin: undefined }) });
  const flags: [keyof Filters, string][] = [['onlyComplete', 'Vollständige Materialliste'], ['vanillaOnly', 'Nur Vanilla'], ['withConnectors', 'Mit Anschlüssen'], ['withBeds', 'Mit Schlafplatz'], ['includeArchived', 'Mit Archiv'], ['gameChecked', 'Im Spiel geprüft']];
  for (const [k, label] of flags) if (f[k]) out.push({ key: k, label, next: without({ [k]: undefined }) });
  return out;
}

function toggle<T>(list: readonly T[] | undefined, value: T): T[] {
  const set = new Set(list ?? []);
  if (set.has(value)) set.delete(value); else set.add(value);
  return [...set];
}

/** Filter panel of the building catalogue. Facet chips show how many entries each value would leave. */
export function CatalogFilters({ filters, onChange, counts, tags, hideFacets = [], mods = [], profiles = [], quick }: {
  filters: Filters;
  /** Mod namespaces present in the library, with entry counts (LIB-07). */
  mods?: readonly { readonly ns: string; readonly count: number }[];
  /** Minecraft profiles present in the library, with entry counts. */
  profiles?: readonly { readonly id: string; readonly count: number }[];
  /** Entries per quick choice under the other active filters (Grundstück, Aufwand, geprüft). */
  quick?: { readonly plots: Readonly<Record<string, number>>; readonly effort: Readonly<Record<number, number>>; readonly checked: number; readonly vanilla: number };
  /** Facets shown elsewhere (the category strip), not repeated in the panel. */
  hideFacets?: readonly FacetKey[];
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
  const preset = plotPresetOf(plot);
  return <div className="catalog-filters">
    <div className="filter-group" role="group" aria-label="Filter Grundstück"><span className="filter-label" title="Passt auf ein Grundstück dieser Größe (Drehen um 90° erlaubt). Eigene Maße unten unter Bauplatz.">Grundstück</span>
      <div className="chips">{PLOT_PRESETS.map(p => {
        const on = preset?.id === p.id;
        return <button key={p.id} type="button" aria-pressed={on} title={p.hint} onClick={() => set({ plot: on ? undefined : p.plot })}>{p.label}{quick && <small>{quick.plots[p.id] ?? 0}</small>}</button>;
      })}</div></div>
    <div className="filter-group" role="group" aria-label="Filter Survival-Aufwand"><span className="filter-label" title="Sammelmenge laut Materialliste plus Spielphase der seltensten Materialien (Heuristik)">Survival-Aufwand höchstens</span>
      <div className="chips">{([1, 2, 3, 4, 5] as const).map(level => {
        const on = filters.effortMax === level;
        return <button key={level} type="button" aria-pressed={on} onClick={() => set({ effortMax: on ? undefined : level })}>{EFFORT_LABEL[level]}{quick && <small>{quick.effort[level] ?? 0}</small>}</button>;
      })}</div></div>
    <div className="filter-group" role="group" aria-label="Filter benötigte Mods"><span className="filter-label">Benötigte Mods</span>
      <div className="chips">
        <button type="button" aria-pressed={filters.vanillaOnly ?? false} onClick={() => set({ vanillaOnly: filters.vanillaOnly ? undefined : true, mods: undefined })}>Keine (nur Vanilla){quick && <small>{quick.vanilla}</small>}</button>
        {mods.map(m => { const on = filters.mods?.includes(m.ns) ?? false;
          return <button key={m.ns} type="button" aria-pressed={on} title={`Ich habe ${m.ns}: Bauten, die nur diesen (und weitere gewählte) Mods brauchen`} onClick={() => { const next = toggle(filters.mods, m.ns); set({ mods: next.length ? next : undefined, vanillaOnly: undefined }); }}>Ich habe {m.ns} <small>{m.count}</small></button>; })}
      </div>
      {mods.length === 0 && <small className="filter-hint">Kein Bau in der Bibliothek braucht Mods. Mod-Blöcke aus eigenen Importen erscheinen hier mit ihrem Namensraum.</small>}</div>
    {profiles.length > 1 && <div className="filter-group" role="group" aria-label="Filter Minecraft-Profil"><span className="filter-label">Minecraft-Profil</span>
      <div className="chips">{profiles.map(p => <button key={p.id} type="button" aria-pressed={filters.profiles?.includes(p.id) ?? false} onClick={() => { const next = toggle(filters.profiles, p.id); set({ profiles: next.length ? next : undefined }); }}>{profileFitLabel(p.id)} <small>{p.count}</small></button>)}</div></div>}
    <label className="check" title="Genau dieser Stand stand auf dem Spielprüfstand im echten Server und blieb Block für Block unverändert"><input type="checkbox" checked={filters.gameChecked ?? false} onChange={e => set({ gameChecked: e.target.checked || undefined })} /> Nur im Spiel geprüft{quick && <small> ({quick.checked})</small>}</label>
    {FACETS.filter(f => !hideFacets.includes(f.key)).map(f => {
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
    <label title={filters.stageMax ? STAGE_HINT[filters.stageMax] : 'Ab wann die Materialien im Überlebensmodus realistisch sind (berechnet)'}>Spielphase bis
      <select value={filters.stageMax ?? ''} aria-label="Spielphase bis" onChange={e => set({ stageMax: (e.target.value || undefined) as Stage | undefined })}>
        <option value="">beliebig</option>{STAGES.map(st => <option key={st} value={st}>{STAGE_LABEL[st]}</option>)}</select></label>
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
    <label className="check"><input type="checkbox" checked={filters.withConnectors ?? false} onChange={e => set({ withConnectors: e.target.checked })} /> Mit Anschlüssen</label>
    <label className="check"><input type="checkbox" checked={filters.withBeds ?? false} onChange={e => set({ withBeds: e.target.checked })} /> Mit Schlafplatz</label>
    <label className="check"><input type="checkbox" checked={filters.includeArchived ?? false} onChange={e => set({ includeArchived: e.target.checked })} /> Archivierte zeigen</label>
    {tags.length > 0 && <details className="filter-group" open={(filters.tags?.length ?? 0) > 0}><summary className="filter-label">Tags ({tags.length})</summary>
      <div className="chips" role="group" aria-label="Tags">{tags.map(t => <button key={t} type="button" aria-pressed={filters.tags?.includes(t) ?? false} onClick={() => set({ tags: toggle(filters.tags, t) })}>{t}</button>)}</div></details>}
  </div>;
}
