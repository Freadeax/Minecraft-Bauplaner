import type { Limits, Vec3, VoxelPayload } from './types.js';

export const DEFAULT_LIMITS: Limits = Object.freeze({
  maxCells: 1_000_000, maxPalette: 65_536, maxVolume: 16_777_216,
  maxNbtDepth: 64, maxNbtNodes: 1_000_000, maxStringLength: 1_000_000,
});
export class VoxelValidationError extends Error {
  constructor(readonly path: string, message: string) {
    super(`${path}: ${message}`); this.name = 'VoxelValidationError';
  }
}
function fail(path: string, message: string): never { throw new VoxelValidationError(path, message); }
function object(v: unknown, path: string): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) fail(path, 'Objekt erwartet');
  const prototype: unknown = Object.getPrototypeOf(v);
  if (prototype !== Object.prototype && prototype !== null) fail(path, 'JSON-Objekt erwartet');
  return v as Record<string, unknown>;
}
function keys(v: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(v)) if (!allowed.includes(key)) fail(`${path}.${key}`, 'unbekanntes Feld; nicht still verwerfen');
}
function integer(v: unknown, min: number, max: number, path: string): asserts v is number {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max) fail(path, 'Ganzzahl außerhalb des erlaubten Bereichs');
}
export function assertVec3(v: unknown, path = 'position'): asserts v is Vec3 {
  if (!Array.isArray(v) || v.length !== 3) fail(path, 'drei Koordinaten erwartet');
  v.forEach((n, i) => integer(n, -2_147_483_648, 2_147_483_647, `${path}[${i}]`));
}
function array(v: unknown, max: number, path: string): unknown[] {
  if (!Array.isArray(v) || v.length > max) fail(path, 'Array fehlt oder Limit überschritten');
  return v;
}
function string(v: unknown, max: number, path: string): asserts v is string {
  if (typeof v !== 'string' || v.length > max) fail(path, 'Text fehlt oder Limit überschritten');
}
const nbtTypes = ['byte','short','int','long','float','double','string','byteArray','intArray','longArray','list','compound'];
const ranges: Record<string, readonly [number, number]> = {
  byte: [-128, 127], short: [-32768, 32767], int: [-2147483648, 2147483647],
};
function long(v: unknown, path: string): void {
  if (typeof v !== 'string' || !/^(0|-[1-9]\d*|[1-9]\d*)$/.test(v) || v.length > 20) fail(path, 'kanonischer dezimaler Long-String erwartet');
  const n = BigInt(v);
  if (n < -(1n << 63n) || n >= (1n << 63n)) fail(path, 'Long außerhalb von int64');
}
export const AIR_IDS: ReadonlySet<string> = new Set(['minecraft:air','minecraft:cave_air','minecraft:void_air']);
export function stateKey(state: { readonly id: string; readonly properties: Readonly<Record<string, string>> }): string {
  return JSON.stringify([state.id, Object.entries(state.properties).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)]);
}
export function validatePayload(input: unknown, overrides: Partial<Limits> = {}): asserts input is VoxelPayload {
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  for (const [key, value] of Object.entries(limits)) integer(value, 1, Number.MAX_SAFE_INTEGER, `limits.${key}`);
  const p = object(input, 'payload');
  keys(p, ['schemaVersion','profileId','bounds','pivot','sourceOrigin','palette','cells','blockEntities'], 'payload');
  if (p.schemaVersion !== 1) fail('schemaVersion', 'nur Version 1 unterstützt');
  string(p.profileId, limits.maxStringLength, 'profileId');
  if (!p.profileId.trim()) fail('profileId', 'Profilkennung erforderlich');
  const b = object(p.bounds, 'bounds'); keys(b, ['min','maxExclusive'], 'bounds');
  assertVec3(b.min, 'bounds.min'); assertVec3(b.maxExclusive, 'bounds.maxExclusive');
  const min = b.min, max = b.maxExclusive;
  let volume = 1n;
  for (const i of [0,1,2] as const) {
    if (max[i] <= min[i]) fail('bounds', 'jede Achse muss eine positive Länge haben');
    volume *= BigInt(max[i] - min[i]);
  }
  if (volume > BigInt(limits.maxVolume)) fail('bounds', 'Volumenlimit überschritten');
  assertVec3(p.pivot, 'pivot'); assertVec3(p.sourceOrigin, 'sourceOrigin');
  const palette = array(p.palette, limits.maxPalette, 'palette');
  const paletteIds: string[] = [], seenStates = new Set<string>();
  for (const [i, value] of palette.entries()) {
    const s = object(value, `palette[${i}]`); keys(s, ['id','properties'], `palette[${i}]`);
    string(s.id, limits.maxStringLength, `palette[${i}].id`);
    if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(s.id)) fail(`palette[${i}].id`, 'Namespaced-ID erwartet');
    const properties = object(s.properties, `palette[${i}].properties`);
    for (const [k, v] of Object.entries(properties)) {
      string(k, limits.maxStringLength, 'property key'); string(v, limits.maxStringLength, 'property value');
      if (!k || !v) fail(`palette[${i}].properties`, 'leere Property');
    }
    const key = stateKey({ id: s.id, properties: properties as Record<string, string> });
    if (seenStates.has(key)) fail(`palette[${i}]`, 'doppelter Zustand');
    seenStates.add(key); paletteIds.push(s.id);
  }
  function inside(v: Vec3, path: string): void {
    for (const i of [0,1,2] as const) if (v[i] < min[i] || v[i] >= max[i]) fail(path, 'Zelle außerhalb der Auswahlgrenzen');
  }
  const selected = new Map<string, string>();
  const cells = array(p.cells, limits.maxCells, 'cells');
  for (const [i, value] of cells.entries()) {
    const path = `cells[${i}]`, c = object(value, path);
    keys(c, c.kind === 'erase' ? ['position','kind'] : ['position','kind','paletteIndex'], path);
    assertVec3(c.position, `${path}.position`); inside(c.position, path);
    const key = c.position.join(',');
    if (selected.has(key)) fail(path, 'doppelte Zellposition');
    if (c.kind !== 'erase' && c.kind !== 'air' && c.kind !== 'block') fail(path, 'unbekannte Zellsemantik');
    if (c.kind !== 'erase') {
      integer(c.paletteIndex, 0, palette.length - 1, `${path}.paletteIndex`);
      if (AIR_IDS.has(paletteIds[c.paletteIndex]!) !== (c.kind === 'air')) fail(path, 'Luftzustand und Zellart widersprechen sich');
    }
    selected.set(key, c.kind);
  }
  let budget = limits.maxNbtNodes;
  function spend(count: number, path: string): void { budget -= count; if (budget < 0) fail(path, 'NBT-Knotenlimit überschritten'); }
  function nbt(value: unknown, depth: number, path: string): void {
    spend(1, path);
    if (depth > limits.maxNbtDepth) fail(path, 'NBT-Tiefenlimit überschritten');
    const tag = object(value, path);
    keys(tag, tag.type === 'list' ? ['type','elementType','value'] : ['type','value'], path);
    if (typeof tag.type !== 'string' || !nbtTypes.includes(tag.type)) fail(path, 'unbekannter NBT-Typ');
    const range = ranges[tag.type];
    if (range) integer(tag.value, range[0], range[1], path);
    else if (tag.type === 'long') long(tag.value, path);
    else if (tag.type === 'string') string(tag.value, limits.maxStringLength, path);
    else if (tag.type === 'float' || tag.type === 'double') {
      if (typeof tag.value !== 'number' || !Number.isFinite(tag.value)) fail(path, 'endliche Zahl erwartet; nicht darstellbare NBT-Zahl ablehnen');
      if (Object.is(tag.value, -0)) fail(path, 'negatives Gleitkomma-Null ist im JSON-Vertrag nicht verlustfrei darstellbar');
      if (tag.type === 'float' && !Object.is(Math.fround(tag.value), tag.value)) fail(path, 'Float muss exakt als float32 darstellbar sein');
    } else if (tag.type === 'compound') {
      for (const [k, child] of Object.entries(object(tag.value, path))) {
        string(k, limits.maxStringLength, path); nbt(child, depth + 1, `${path}.${k}`);
      }
    } else {
      const children = array(tag.value, limits.maxNbtNodes, path);
      if (tag.type === 'list') {
        if (typeof tag.elementType !== 'string' || ![...nbtTypes,'end'].includes(tag.elementType)) fail(path, 'Listentyp fehlt');
        if (tag.elementType === 'end' && children.length) fail(path, 'End-Liste muss leer sein');
        for (const child of children) {
          if (object(child, path).type !== tag.elementType) fail(path, 'heterogene NBT-Liste');
          nbt(child, depth + 1, path);
        }
      } else {
        spend(children.length, path);
        for (const child of children) {
          if (tag.type === 'longArray') long(child, path);
          else integer(child, tag.type === 'byteArray' ? -128 : -2147483648, tag.type === 'byteArray' ? 127 : 2147483647, path);
        }
      }
    }
  }
  const entityPositions = new Set<string>();
  for (const [i, value] of array(p.blockEntities, limits.maxCells, 'blockEntities').entries()) {
    const path = `blockEntities[${i}]`, e = object(value, path); keys(e, ['position','data'], path);
    assertVec3(e.position, path); inside(e.position, path);
    const key = e.position.join(',');
    if (selected.get(key) !== 'block' || entityPositions.has(key)) fail(path, 'BlockEntity braucht genau eine belegte Blockzelle');
    entityPositions.add(key);
    if (object(e.data, path).type !== 'compound') fail(path, 'BlockEntity braucht NBT-Compound');
    nbt(e.data, 0, `${path}.data`);
  }
}

/** Validates before returning an isolated, recursively immutable snapshot. */
export function createPayload(input: unknown, limits: Partial<Limits> = {}): VoxelPayload {
  validatePayload(input, limits);
  const copy = structuredClone(input);
  function freeze(value: unknown): void {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
  }
  freeze(copy); return copy;
}
