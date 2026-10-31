import { DomainError } from './types.js';

function fail(message: string): never { throw new DomainError('BACKUP', message); }
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function text(value: unknown, field: string, max?: number, required = false): void {
  if (typeof value !== 'string' || (max !== undefined && value.length > max) || (required && !value.trim()))
    fail(`${field}: ${required ? 'nichtleerer ' : ''}Text${max !== undefined ? ` bis ${max} Zeichen` : ''} erwartet`);
}
function strings(value: unknown, field: string, max?: number): asserts value is string[] {
  if (!Array.isArray(value)) fail(`${field}: Liste erwartet`);
  for (const entry of value) text(entry, field, max, true);
  if (new Set(value).size !== value.length) fail(`${field}: doppelte Einträge`);
}
function timestamp(value: unknown, field: string): void {
  text(value, field, undefined, true);
  if (!Number.isFinite(Date.parse(value as string))) fail(`${field}: gültiger Zeitpunkt erwartet`);
}

/**
 * Checks every field consumed by the library, without normalising or rebuilding
 * records (version history, metadata and creation times must remain unchanged).
 * The caller checks the record object and schema version first.
 */
export function assertAssetRecordFields(raw: Record<string, unknown>): void {
  text(raw.id, 'Bauteil-ID', undefined, true);
  text(raw.name, 'Bauteilname', 120, true);
  text(raw.description, 'Bauteilbeschreibung', 2000);
  strings(raw.tags, 'Bauteil-Tags', 40);
  if (!object(raw.provenance)) fail(`Bauteil „${String(raw.name)}“: Herkunft fehlt`);
  text(raw.provenance.author, 'Autor', 120);
  text(raw.provenance.source, 'Herkunft', 300);
  text(raw.provenance.license, 'Nutzungsrechte', 300);
  if (typeof raw.archived !== 'boolean' || typeof raw.demo !== 'boolean') fail('Bauteil: Archiv-/Beispielkennzeichnung muss boolesch sein');
  strings(raw.versionIds, 'Versionsliste');
  timestamp(raw.createdAt, 'Bauteil-Erstellzeit');
  timestamp(raw.updatedAt, 'Bauteil-Änderungszeit');
}

const HASH = /^[0-9a-f]{64}$/;
function hash(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !HASH.test(value)) fail('Originalmanifest: gültiger SHA-256-Hash erwartet');
}

/**
 * Missing-original warnings are derived from references, never trusted from an
 * unhashed warning list. Older valid backups keep their original format; a
 * removed or inaccurate warning list cannot hide missing source bytes.
 */
export function validateOriginalManifest(
  referencedHashes: Iterable<string>,
  originals: readonly { readonly sha256: string }[],
  declaredMissing: unknown,
): string[] {
  if (!Array.isArray(declaredMissing)) fail('Fehlende Originale: Liste erwartet');
  for (const declared of declaredMissing) hash(declared);
  const available = new Set<string>();
  for (const original of originals) {
    hash(original.sha256);
    if (available.has(original.sha256)) fail(`Originalmanifest: Original ${original.sha256} doppelt enthalten`);
    available.add(original.sha256);
  }
  const missing = new Set<string>();
  for (const reference of referencedHashes) {
    hash(reference);
    if (!available.has(reference)) missing.add(reference);
  }
  return [...missing].sort();
}
