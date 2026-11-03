/**
 * Deterministic JSON: object keys sorted (UTF-16 code unit order), arrays in
 * order, no whitespace, `undefined` object members left out.
 *
 * Hot path: every payload hash and version id runs through it (hundreds of
 * thousands of cells at the first start). It therefore appends to one string
 * instead of building arrays of entries per object; the output is byte for
 * byte the same as the former entries/sort/map/join form (PERF-05, test
 * `canonical-json.test.mjs`), so stored hashes and ids never change.
 */
export function canonicalJson(value: unknown): string {
  return appendCanonical('', value);
}

function appendCanonical(out: string, value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Nicht-endliche Zahl ist nicht kanonisch darstellbar');
    if (value === undefined) throw new Error('undefined ist nicht kanonisch darstellbar');
    return out + JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    out += '[';
    for (let i = 0; i < value.length; i++) {
      if (i) out += ',';
      out = appendCanonical(out, value[i]);
    }
    return out + ']';
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  out += '{';
  let first = true;
  for (const key of keys) {
    const member = record[key];
    if (member === undefined) continue;
    out += first ? '' : ',';
    first = false;
    out = appendCanonical(out + JSON.stringify(key) + ':', member);
  }
  return out + '}';
}

/** SHA-256 hex via Web Crypto (browser and Node ≥ 22). */
export async function sha256Hex(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fast synchronous 53-bit change detector (cyrb53). Not cryptographic: only for
 * cache keys and "geometry changed" checks, never for integrity of stored data.
 */
export function quickHash(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** Random id with readable prefix. Uses Web Crypto randomness. */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}
