/** Standalone material inventory; no recipe assumptions or external registry. */
const BLOCK_ID = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;
export function normalizeBlockId(value) {
  if (typeof value !== 'string' || !BLOCK_ID.test(value)) throw new TypeError('Invalid namespaced block ID');
  return value;
}
export function countMaterials(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Expected material entries');
  const counts = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') throw new TypeError('Invalid material entry');
    const id = normalizeBlockId(entry.id);
    const amount = entry.count;
    if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError('Material count must be a nonnegative safe integer');
    const sum = (counts.get(id) ?? 0) + amount;
    if (!Number.isSafeInteger(sum)) throw new RangeError('Material count overflow');
    counts.set(id, sum);
  }
  return Object.freeze([...counts].sort(([a],[b]) => a.localeCompare(b,'en')).map(([id,count]) => Object.freeze({id,count})));
}
export function materialShortage(required, inventory) {
  const need = countMaterials(required);
  const owned = new Map(countMaterials(inventory).map(({id,count}) => [id,count]));
  return Object.freeze(need.map(({id,count}) => Object.freeze({id,required:count,available:owned.get(id) ?? 0,missing:Math.max(0,count-(owned.get(id) ?? 0))})));
}
