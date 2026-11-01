import type { BuildTheme } from '../../../../../packages/domain/src/buildThemes.js';
import { encodeLibraryState } from './urlState.ts';

/** Uses the same serializer as the catalogue; the caller retains any project context in its base href. */
export function buildThemeSearch(theme: BuildTheme, facetKeys: readonly string[]): string {
  return encodeLibraryState({ query: '', filters: { facets: theme.facets }, sort: 'name', descending: false,
    collapse: false, layout: 'raster', onlyFavorites: false }, facetKeys);
}
