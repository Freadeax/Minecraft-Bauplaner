import { DOMAIN_SCHEMA_VERSION, DomainError } from '../core/types.js';

// PERF-07 O-9: small parts of the backup format the app start needs, without the record checks of backup.ts
// (those pull site, team, planning and production into the start bundle).

/** Upper bound for a backup file read in the browser. */
export const MAX_BACKUP_BYTES = 100_000_000;

/** Rejects records written by a newer app and unknown old schemas. */
export function checkSchemaVersion(kind: string, record: { readonly schemaVersion?: unknown }): void {
  const v = record.schemaVersion;
  if (v === DOMAIN_SCHEMA_VERSION) return;
  if (typeof v === 'number' && v > DOMAIN_SCHEMA_VERSION) throw new DomainError('SCHEMA_NEWER', `${kind} stammt aus einer neueren App-Version (Schema ${v}). Bitte die App aktualisieren.`);
  throw new DomainError('SCHEMA', `${kind} hat ein unbekanntes Schema (${String(v)}).`);
}
