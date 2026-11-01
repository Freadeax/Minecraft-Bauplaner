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

test('eight editorial themes use real supported facets and each has existing building previews', () => {
  assert.equal(BUILD_THEMES.length, 8);
  assert.equal(new Set(BUILD_THEMES.map(theme => theme.id)).size, 8);
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
