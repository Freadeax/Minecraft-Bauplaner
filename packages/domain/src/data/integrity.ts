import type { Asset, AssetVersion, Project } from '../core/types.js';
import { sha256Hex } from '../core/hash.js';
import { verifyAssetVersion } from '../catalog/library.js';
import { checkAssetRecord, checkProjectRecord, referencedVersionIds } from './backup.js';
import type { OriginalFile } from './backup.js';
import { checkCollectionRecord, checkTemplateRecord } from '../catalog/collections.js';
import type { Collection, LibraryTemplate } from '../catalog/collections.js';
import { buildPlanGraph, PLAN_KIND_LABEL, PLAN_ROLE_LABEL } from './planGraph.js';
import type { PlanEdge, PlanRole } from './planGraph.js';

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
  | 'ORIGINAL_MISSING' | 'ORIGINAL_HASH' | 'ORIGINAL_UNUSED'
  | 'COLLECTION_RECORD' | 'TEMPLATE_RECORD' | 'DANGLING_REFERENCE';

export interface IntegrityFinding {
  readonly severity: IntegritySeverity;
  readonly code: IntegrityCode;
  /** Record kind and id the finding is about. */
  readonly subject: { readonly kind: 'project' | 'asset' | 'version' | 'original' | 'collection' | 'template'; readonly id: string; readonly name?: string };
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
  /** Own collections and templates (LIB-02/LIB-03); checked when given. */
  readonly collections?: readonly Collection[];
  readonly templates?: readonly LibraryTemplate[];
}

/**
 * References the specific checks above do not cover yet, judged by the
 * reference graph (ARCH-02). Required references that dangle are errors,
 * history and convenience references warnings or hints.
 */
const DANGLING: Partial<Record<PlanRole, { readonly severity: IntegritySeverity; readonly advice: string }>> = {
  pin: { severity: 'warning', advice: 'Die Einfrierung zeigt auf eine fehlende Version; im Reiter „Updates“ lösen.' },
  'section-snapshot': { severity: 'warning', advice: 'Dieser Abschnittsstand lässt sich nicht vollständig wiederherstellen; Sicherung mit der Version einspielen.' },
  'edited-from': { severity: 'info', advice: 'Die Ausgangsversion der Bearbeitung ist nicht mehr gespeichert; die Version selbst ist vollständig.' },
  'local-to': { severity: 'info', advice: 'Lokale Änderung eines Projekts, das nicht mehr gespeichert ist.' },
  'collection-asset': { severity: 'warning', advice: 'Der Sammlungseintrag zeigt ins Leere; Eintrag entfernen oder Bauteil wiederherstellen.' },
  'collection-version': { severity: 'warning', advice: 'Die fest gewählte Version fehlt; der Eintrag folgt nun der neuesten Version.' },
  'collection-template': { severity: 'warning', advice: 'Die Vorlage wurde gelöscht; Eintrag entfernen.' },
  'collection-parent': { severity: 'info', advice: 'Der übergeordnete Ordner fehlt; die Sammlung erscheint oben.' },
  'project-after': { severity: 'info', advice: 'Das vorherige Projekt ist gelöscht; die Reihenfolge wird nicht mehr beachtet. Im Reiter „Planung“ entfernen.' },
  'template-member': { severity: 'error', advice: 'Die Vorlage kann so nicht übernommen werden; Sicherung mit der Version einspielen.' },
};
const severityOf = (e: PlanEdge): IntegritySeverity | null => {
  const rule = DANGLING[e.role];
  if (!rule) return null;
  return e.role === 'template-member' && !e.required ? 'info' : rule.severity;
};

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
    for (const scan of p.scanHistory ?? []) {
      usedOriginals.add(scan.sha256);
      if (!originals.has(scan.sha256)) add({ severity: 'warning', code: 'ORIGINAL_MISSING', subject, message: `Spielaufnahme ${scan.fileName} (${scan.sha256.slice(0, 12)}…) fehlt; bitte das Original erneut importieren.` });
    }
    if (p.terrain) {
      usedOriginals.add(p.terrain.sha256);
      if (!originals.has(p.terrain.sha256)) add({ severity: 'warning', code: 'ORIGINAL_MISSING', subject, message: `Geländeaufnahme ${p.terrain.fileName} (${p.terrain.sha256.slice(0, 12)}…) fehlt; Weltkarte und Anlagen zeigen dort kein Gelände. Bitte im Reiter „Gelände“ neu aufnehmen.` });
    }
    if (p.terrainDesign) {
      const design = p.terrainDesign;
      usedOriginals.add(design.sha256);
      if (!originals.has(design.sha256)) add({ severity: 'warning', code: 'ORIGINAL_MISSING', subject, message: `Geländegestaltung ${design.fileName} (${design.sha256.slice(0, 12)}…) fehlt; das geplante Gelände ist verloren. Bitte aus einer Sicherung wiederherstellen oder im Reiter „Landschaft“ neu gestalten.` });
      if (design.base.kind === 'survey') {
        usedOriginals.add(design.base.sha256);
        if (!originals.has(design.base.sha256)) add({ severity: 'warning', code: 'ORIGINAL_MISSING', subject, message: `Geländeaufnahme unter der Gestaltung (${design.base.sha256.slice(0, 12)}…) fehlt; Abtrag, Aufschüttung und Blöcke lassen sich nicht berechnen.` });
      }
    }
    p.revisions.forEach((r, i) => {
      if (i > 0 && r.number <= p.revisions[i - 1]!.number) add({ severity: 'warning', code: 'REVISION_ORDER', subject, message: `Revision ${r.number} steht nach Revision ${p.revisions[i - 1]!.number}.` });
    });
  }

  for (const sha of source.originalHashes) {
    const subject = { kind: 'original' as const, id: sha };
    if (!usedOriginals.has(sha)) add({ severity: 'info', code: 'ORIGINAL_UNUSED', subject, message: 'Originaldatei wird von keiner Version oder Spielaufnahme verwendet (belegt nur Speicher).' });
    if (!source.getOriginal) continue;
    try {
      const file = await source.getOriginal(sha);
      if (!file) add({ severity: 'warning', code: 'ORIGINAL_MISSING', subject, message: 'Originaldatei ist gelistet, aber nicht lesbar.' });
      else if (await sha256Hex(file.bytes) !== sha) add({ severity: 'error', code: 'ORIGINAL_HASH', subject: { ...subject, name: file.fileName }, message: 'Prüfsumme der Originaldatei stimmt nicht – Datei ist beschädigt.' });
    } catch (e) { add({ severity: 'warning', code: 'ORIGINAL_MISSING', subject, message: `Originaldatei nicht lesbar: ${msg(e)}` }); }
  }

  const collections = (source.collections ?? []).filter(c => {
    try { checkCollectionRecord(c); return true; } catch (e) { add({ severity: 'error', code: 'COLLECTION_RECORD', subject: { kind: 'collection', id: c.id, name: c.name }, message: msg(e) }); return false; }
  });
  const templates = (source.templates ?? []).filter(t => {
    try { checkTemplateRecord(t); return true; } catch (e) { add({ severity: 'error', code: 'TEMPLATE_RECORD', subject: { kind: 'template', id: t.id, name: t.name }, message: msg(e) }); return false; }
  });
  const graph = buildPlanGraph({ projects: source.projects, assets: source.assets, versions: source.versions, collections, templates });
  const names = new Map<string, string>([...source.projects.map(p => [`project:${p.id}`, p.name] as const), ...collections.map(c => [`collection:${c.id}`, c.name] as const),
    ...templates.map(t => [`template:${t.id}`, t.name] as const), ...source.versions.map(v => [`version:${v.id}`, v.label] as const)]);
  const reported = new Set<string>();
  for (const e of graph.dangling) {
    const severity = severityOf(e);
    if (!severity) continue;
    const once = `${e.from.kind}:${e.from.id}|${e.role}|${e.to.id}`;
    if (reported.has(once)) continue;
    reported.add(once);
    const name = names.get(`${e.from.kind}:${e.from.id}`);
    add({ severity, code: 'DANGLING_REFERENCE', subject: { kind: e.from.kind as IntegrityFinding['subject']['kind'], id: e.from.id, ...(name !== undefined && { name }) },
      message: `${PLAN_ROLE_LABEL[e.role]}${e.detail ? ` (${e.detail})` : ''} verweist auf ${PLAN_KIND_LABEL[e.to.kind]} ${e.to.id}, ${e.to.kind === 'asset' || e.to.kind === 'project' ? 'das' : 'die'} nicht gespeichert ist. ${DANGLING[e.role]!.advice}` });
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
