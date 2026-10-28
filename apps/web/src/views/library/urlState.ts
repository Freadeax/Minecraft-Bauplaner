/**
 * Search, filters and view of the library overview as a query string behind
 * the hash route (#/bibliothek?kategorie=wohnhaus&q=turm), so a search can be
 * bookmarked and shared (B12). Pure functions without runtime imports, so
 * Node tests load them directly. Unknown or malformed values are dropped,
 * never guessed; the defaults are omitted to keep links short.
 */
export interface UrlFilters {
  readonly facets?: Readonly<Record<string, readonly string[]>>;
  readonly tags?: readonly string[];
  readonly sizeClasses?: readonly string[];
  readonly blockClasses?: readonly string[];
  readonly difficultyMax?: number;
  readonly stageMax?: string;
  readonly maxBuildMinutes?: number;
  readonly plot?: { readonly width: number; readonly depth: number; readonly height?: number; readonly allowRotation: boolean };
  readonly origin?: 'alle' | 'beispiele' | 'eigene';
  readonly onlyComplete?: boolean;
  readonly vanillaOnly?: boolean;
  readonly withConnectors?: boolean;
  readonly withBeds?: boolean;
  readonly includeArchived?: boolean;
}
export interface LibraryUrlState {
  readonly query: string;
  readonly filters: UrlFilters;
  readonly sort?: string;
  readonly descending: boolean;
  readonly collapse: boolean;
  readonly layout: 'raster' | 'liste';
  readonly onlyFavorites: boolean;
}

const FLAGS = [['onlyComplete', 'vollstaendig'], ['vanillaOnly', 'vanilla'], ['withConnectors', 'anschluesse'], ['withBeds', 'bett'], ['includeArchived', 'archiv']] as const;
const LISTS = [['tags', 'tag'], ['sizeClasses', 'groesse'], ['blockClasses', 'umfang']] as const;
const list = (v: string | null) => (v ?? '').split(',').map(s => s.trim()).filter(Boolean);
const int = (v: string | null, min: number, max: number) => {
  if (v === null || !/^\d+$/.test(v)) return undefined;
  const n = Number(v);
  return n >= min && n <= max ? n : undefined;
};

export function encodeLibraryState(s: LibraryUrlState, facetKeys: readonly string[]): string {
  const p = new URLSearchParams();
  if (s.query.trim()) p.set('q', s.query.trim());
  for (const k of facetKeys) { const v = s.filters.facets?.[k]; if (v?.length) p.set(k, v.join(',')); }
  for (const [key, name] of LISTS) { const v = s.filters[key]; if (v?.length) p.set(name, v.join(',')); }
  if (s.filters.difficultyMax !== undefined) p.set('schwierigkeit', String(s.filters.difficultyMax));
  if (s.filters.stageMax) p.set('phase', s.filters.stageMax);
  if (s.filters.maxBuildMinutes !== undefined) p.set('zeit', String(s.filters.maxBuildMinutes));
  if (s.filters.plot) p.set('platz', [s.filters.plot.width, s.filters.plot.depth, ...(s.filters.plot.height !== undefined ? [s.filters.plot.height] : [])].join('x'));
  if (s.filters.plot && !s.filters.plot.allowRotation) p.set('drehen', '0');
  if (s.filters.origin && s.filters.origin !== 'alle') p.set('herkunft', s.filters.origin);
  for (const [key, name] of FLAGS) if (s.filters[key]) p.set(name, '1');
  if (s.sort) p.set('sortierung', s.sort);
  if (s.descending) p.set('absteigend', '1');
  if (!s.collapse) p.set('varianten', 'alle');
  if (s.layout === 'liste') p.set('ansicht', 'liste');
  if (s.onlyFavorites) p.set('merkliste', '1');
  return p.toString();
}

export function decodeLibraryState(search: string, facetKeys: readonly string[], options: { sorts: readonly string[]; stages: readonly string[] }): LibraryUrlState {
  const p = new URLSearchParams(search.replace(/^\?/, ''));
  const facets: Record<string, string[]> = {};
  for (const k of facetKeys) { const v = list(p.get(k)); if (v.length) facets[k] = v; }
  const filters: Record<string, unknown> = {};
  if (Object.keys(facets).length) filters.facets = facets;
  for (const [key, name] of LISTS) { const v = list(p.get(name)); if (v.length) filters[key] = v; }
  const difficulty = int(p.get('schwierigkeit'), 1, 5); if (difficulty !== undefined) filters.difficultyMax = difficulty;
  const stage = p.get('phase'); if (stage && options.stages.includes(stage)) filters.stageMax = stage;
  const minutes = int(p.get('zeit'), 1, 100000); if (minutes !== undefined) filters.maxBuildMinutes = minutes;
  const plot = (p.get('platz') ?? '').split('x').map(v => int(v, 1, 100000));
  if (plot.length >= 2 && plot.length <= 3 && plot.every(v => v !== undefined)) filters.plot = { width: plot[0]!, depth: plot[1]!, ...(plot[2] !== undefined && { height: plot[2] }), allowRotation: p.get('drehen') !== '0' };
  const origin = p.get('herkunft'); if (origin === 'beispiele' || origin === 'eigene') filters.origin = origin;
  for (const [key, name] of FLAGS) if (p.get(name) === '1') filters[key] = true;
  const sort = p.get('sortierung');
  return {
    query: p.get('q') ?? '',
    filters: filters as UrlFilters,
    ...(sort && options.sorts.includes(sort) && { sort }),
    descending: p.get('absteigend') === '1',
    collapse: p.get('varianten') !== 'alle',
    layout: p.get('ansicht') === 'liste' ? 'liste' : 'raster',
    onlyFavorites: p.get('merkliste') === '1',
  };
}
