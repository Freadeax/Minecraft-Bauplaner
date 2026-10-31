import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPreferenceStore, parsePreferenceIds } from '../apps/web/src/views/library/preferenceStore.ts';

function fixture() {
  const data = new Map();
  let blocked = false;
  const store = createPreferenceStore(() => ({
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { if (blocked) throw new Error('QuotaExceededError'); data.set(key, value); },
  }));
  return { store, data, block: value => { blocked = value; } };
}

test('blocked storage getter retains preferences for subsequent readers in this tab', () => {
  const store = createPreferenceStore(() => { throw new Error('SecurityError'); });
  store.write('favorites', '["tower"]');
  assert.deepEqual(parsePreferenceIds(store.read('favorites'), 500), ['tower']);
  store.write('view', 'north');
  assert.equal(store.read('view'), 'north');
});

test('quota failure cannot revive stale persisted favorites; later writes recover', () => {
  const { store, data, block } = fixture();
  store.write('favorites', '["old"]'); block(true);
  store.write('favorites', '["new"]');
  assert.equal(data.get('favorites'), '["old"]');
  assert.equal(store.read('favorites'), '["new"]');
  block(false); store.write('favorites', '["new","tower"]');
  assert.equal(data.get('favorites'), '["new","tower"]');
  assert.equal(store.read('favorites'), '["new","tower"]');
});

test('storage updates, deletion and clear supersede session fallback', () => {
  const { store, data, block } = fixture();
  block(true); store.write('view', 'north');
  data.set('view', 'south'); store.invalidate('view');
  assert.equal(store.read('view'), 'south');
  data.delete('view'); store.invalidate('view'); assert.equal(store.read('view'), null);
  store.write('a', 'a'); store.write('b', 'b'); data.clear(); store.invalidate(null);
  assert.equal(store.read('a'), null); assert.equal(store.read('b'), null);
});

test('lists reject malformed data, deduplicate and enforce comparison capacity on read', () => {
  for (const raw of ['{', '{}', 'null', '42']) assert.deepEqual(parsePreferenceIds(raw, 4), []);
  assert.deepEqual(parsePreferenceIds('["a",null,"",1,"b","a","c","d","e"]', 4), ['b', 'c', 'd', 'e']);
});
