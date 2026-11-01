import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD_THEMES, buildThemeQuery, selectBuildTheme } from '../dist/domain/src/buildThemes.js';
import { buildCatalog, createBuildingLibrary, FACETS, queryCatalog, SORT_LABEL, STAGES } from '../dist/domain/src/index.js';
import { buildThemeSearch } from '../apps/web/src/views/library/buildThemeLinks.ts';
import { decodeLibraryState } from '../apps/web/src/views/library/urlState.ts';

const buildings = await createBuildingLibrary();
const { entries } = buildCatalog(buildings.assets, new Map(buildings.versions.map(version => [version.id, version])));
const facetKeys = FACETS.map(facet => facet.key);
const ids = values => values.map(value => value.asset.id);

test('eleven editorial themes use real supported facets and each has existing building previews', () => {
  assert.equal(BUILD_THEMES.length, 11);
  assert.equal(new Set(BUILD_THEMES.map(theme => theme.id)).size, 11);
  for (const theme of BUILD_THEMES) {
    for (const [key, values] of Object.entries(theme.facets)) {
      const facet = FACETS.find(facet => facet.key === key);
      assert.ok(facet, key);
      for (const value of values) assert.ok(Object.hasOwn(facet.values, value), `${key}:${value}`);
    }
    const selection = selectBuildTheme(entries, theme);
    const actual = queryCatalog(entries, buildThemeQuery(theme));
    assert.ok(selection.count > 0, `${theme.id} has real matches`);
    assert.equal(selection.count, actual.length);
    assert.deepEqual(ids(selection.previews), ids(actual.slice(0, 3)));
    for (const preview of selection.previews) assert.ok(entries.includes(preview), 'original catalogue references, no duplicate buildings');
    assert.equal(theme.tasks.length, 3);
  }
});

test('serialized theme links reproduce actual result IDs and counts including every variant', () => {
  for (const theme of BUILD_THEMES) {
    const search = buildThemeSearch(theme, facetKeys);
    assert.equal(new URLSearchParams(search).get('varianten'), 'alle');
    const decoded = decodeLibraryState(search, facetKeys, { sorts: Object.keys(SORT_LABEL), stages: STAGES });
    const linked = queryCatalog(entries, { ...decoded.filters, text: decoded.query, sort: decoded.sort, descending: decoded.descending, collapseFamilies: decoded.collapse });
    assert.deepEqual(ids(linked), ids(queryCatalog(entries, buildThemeQuery(theme))), theme.id);
  }
});

test('theme results follow library additions and archive state without mutating entries', () => {
  const theme = BUILD_THEMES[0];
  const base = selectBuildTheme(entries, theme);
  const sample = base.previews[0];
  const own = { ...sample, asset: { ...sample.asset, id: 'own:coastal', demo: false, archived: false } };
  const updated = [...entries, own];
  assert.equal(selectBuildTheme(updated, theme).count, base.count + 1, 'own assets join through the existing facet query');
  own.asset.archived = true;
  assert.equal(selectBuildTheme(updated, theme).count, base.count);
  assert.equal(selectBuildTheme([], theme).count, 0);
  assert.deepEqual(selectBuildTheme([], theme).previews, []);
  assert.equal(base.count, selectBuildTheme(entries, theme).count, 'original catalogue retained');
  assert.equal(entries.length, buildings.assets.length);
});


test('WORLD-02 coverage: far-eastern gardens, desert trade and the End use only real catalogue entries', () => {
  // Styles the roadmap asked to check, with the editorial world that now covers them.
  const required = { fernoestlich: 'fernost', wuestenstil: 'wuestenhandel', end: 'endposten' };
  for (const [style, themeId] of Object.entries(required)) {
    const theme = BUILD_THEMES.find(candidate => candidate.id === themeId);
    assert.ok(theme, themeId);
    assert.ok(theme.facets.stil.includes(style), `${themeId} names the existing style ${style}`);
    const matches = queryCatalog(entries, buildThemeQuery(theme));
    assert.ok(matches.length > 0, `${themeId} has real matches`);
    assert.equal(matches.length, selectBuildTheme(entries, theme).count);
    for (const preview of selectBuildTheme(entries, theme).previews)
      assert.ok(preview.facets.stil.includes(style), `${themeId}/${preview.asset.id} is a real entry of that style`);
    // The reproducible filter link resolves to exactly the same catalogue ids.
    const search = buildThemeSearch(theme, facetKeys);
    const decoded = decodeLibraryState(search, facetKeys, { sorts: Object.keys(SORT_LABEL), stages: STAGES });
    assert.deepEqual(ids(queryCatalog(entries, { ...decoded.filters, text: decoded.query, sort: decoded.sort, descending: decoded.descending, collapseFamilies: decoded.collapse })), ids(matches), themeId);
  }
  // No editorial theme claims a style the shipped catalogue cannot serve.
  for (const theme of BUILD_THEMES) for (const style of theme.facets.stil ?? [])
    assert.ok(entries.some(entry => entry.facets.stil?.includes(style)), `${theme.id}: style ${style} has entries`);
});
