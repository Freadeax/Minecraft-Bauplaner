import type { Asset, AssetVersion, Project } from './types.js';
import { sha256Hex } from './hash.js';
import { verifyAssetVersion } from './library.js';
import { checkAssetRecord, checkProjectRecord, referencedVersionIds } from './backup.js';
import type { OriginalFile } from './backup.js';

/**
 * Datencheck (S-02): read-only consistency check of everything stored in the
 * browser. It never repairs or deletes; every finding names the record and
 * what the user can do (usually: download a backup, then decide). Content
 * addresses are recomputed, so silently corrupted records are found even if
 * the IndexedDB layer reported a successful write.
 */

export type IntegritySeverity = 'error' | 'warning' | 'info';
export type IntegrityCode =
  | 'PROJECT_RECORD' | 'ASSET_RECORD' | 'VERSION_HASH'
  | 'MISSING_VERSION' | 'VERSION_WITHOUT_ASSET' | 'VERSION_NOT_LISTED' | 'ASSET_VERSION_MISSING'
  | 'REVISION_ORDER'
  | 'ORIGINAL_MISSING' | 'ORIGINAL_HASH' | 'ORIGINAL_UNUSED';

export interface IntegrityFinding {
  readonly severity: IntegritySeverity;
  readonly code: IntegrityCode;
  /** Record kind and id the finding is about. */
  readonly subject: { readonly kind: 'project' | 'asset' | 'version' | 'original'; readonly id: string; readonly name?: string };
  readonly message: string;
}

export interface IntegritySource {
  readonly projects: readonly Project[];
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  /** Stored original hashes; their bytes are fetched on demand via `getOriginal`. */
  readonly originalHashes: readonly string[];
  /** Optional: when given, original bytes are re-hashed (slower, finds bit rot). */
  readonly getOriginal?: (sha256: string) => Promise<OriginalFile | null>;
}

export interface IntegrityReport {
  readonly checkedAt: string;
  readonly counts: { readonly projects: number; readonly assets: number; readonly versions: number; readonly originals: number };
  readonly findings: readonly IntegrityFinding[];
  readonly errors: number;
  readonly warnings: number;
  /** True when no error was found (warnings and infos are allowed). */
  readonly ok: boolean;
}

const msg = (e: unknown) => e instanceof Error ? e.message : String(e);

export async function checkIntegrity(source: IntegritySource, now: () => Date = () => new Date()): Promise<IntegrityReport> {
  const findings: IntegrityFinding[] = [];
  const add = (f: IntegrityFinding) => { findings.push(f); };
  const assets = new Map(source.assets.map(a => [a.id, a]));
  const versions = new Map(source.versions.map(v => [v.id, v]));
  const originals = new Set(source.originalHashes);

  for (const a of source.assets) {
    try { checkAssetRecord(a); } catch (e) { add({ severity: 'error', code: 'ASSET_RECORD', subject: { kind: 'asset', id: a.id, name: a.name }, message: msg(e) }); continue; }
    for (const id of a.versionIds) if (!versions.has(id)) {
      add({ severity: 'error', code: 'ASSET_VERSION_MISSING', subject: { kind: 'asset', id: a.id, name: a.name }, message: `Version ${id} ist im Bauteil eingetragen, aber nicht gespeichert.` });
    }
  }

  const usedOriginals = new Set<string>();
  for (const v of source.versions) {
    const subject = { kind: 'version' as const, id: v.id, name: v.label };
    try { await verifyAssetVersion(v); } catch (e) { add({ severity: 'error', code: 'VERSION_HASH', subject, message: msg(e) }); }
    const owner = assets.get(v.assetId);
    if (!owner) add({ severity: 'warning', code: 'VERSION_WITHOUT_ASSET', subject, message: `Gehört zu Bauteil ${v.assetId}, das nicht mehr gespeichert ist.` });
    else if (!owner.versionIds.includes(v.id)) add({ severity: 'warning', code: 'VERSION_NOT_LISTED', subject, message: `Fehlt in der Versionsliste von „${owner.name}“.` });
    const sha = v.source.originalSha256;
    if (sha) {
      usedOriginals.add(sha);
      if (!originals.has(sha)) add({ severity: 'warning', code: 'ORIGINAL_MISSING', subject, message: `Originaldatei ${v.source.fileName ?? ''} (${sha.slice(0, 12)}…) fehlt; Export des Originals ist nicht möglich.`.replace(' ()', '') });
    }
  }

  for (const p of source.projects) {
    const subject = { kind: 'project' as const, id: p.id, name: p.name };
    // Structure, unique instance ids, transforms and connector links.
    try { checkProjectRecord(p); } catch (e) { add({ severity: 'error', code: 'PROJECT_RECORD', subject, message: msg(e) }); continue; }
    for (const id of referencedVersionIds(p)) if (!versions.has(id)) {
      add({ severity: 'error', code: 'MISSING_VERSION', subject, message: `Verwendet Version ${id}, die nicht gespeichert ist; betroffene Instanzen können nicht dargestellt werden.` });
    }
    p.revisions.forEach((r, i) => {
      if (i > 0 && r.number <= p.revisions[i - 1]!.number) add({ severity: 'warning', code: 'REVISION_ORDER', subject, message: `Revision ${r.number} steht nach Revision ${p.revisions[i - 1]!.number}.` });
    });
  }

  for (const sha of source.originalHashes) {
    const subject = { kind: 'original' as const, id: sha };
    if (!usedOriginals.has(sha)) add({ severity: 'info', code: 'ORIGINAL_UNUSED', subject, message: 'Originaldatei wird von keiner Version verwendet (belegt nur Speicher).' });
    if (!source.getOriginal) continue;
    try {
      const file = await source.getOriginal(sha);
      if (!file) add({ severity: 'warning', code: 'ORIGINAL_MISSING', subject, message: 'Originaldatei ist gelistet, aber nicht lesbar.' });
      else if (await sha256Hex(file.bytes) !== sha) add({ severity: 'error', code: 'ORIGINAL_HASH', subject: { ...subject, name: file.fileName }, message: 'Prüfsumme der Originaldatei stimmt nicht – Datei ist beschädigt.' });
    } catch (e) { add({ severity: 'warning', code: 'ORIGINAL_MISSING', subject, message: `Originaldatei nicht lesbar: ${msg(e)}` }); }
  }

  const rank: Record<IntegritySeverity, number> = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
  const errors = findings.filter(f => f.severity === 'error').length, warnings = findings.filter(f => f.severity === 'warning').length;
  return {
    checkedAt: now().toISOString(),
    counts: { projects: source.projects.length, assets: source.assets.length, versions: source.versions.length, originals: source.originalHashes.length },
    findings, errors, warnings, ok: errors === 0,
  };
}

export const INTEGRITY_SEVERITY_LABEL: Readonly<Record<IntegritySeverity, string>> = { error: 'Fehler', warning: 'Warnung', info: 'Hinweis' };
