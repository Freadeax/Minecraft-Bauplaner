import { resolveProject } from '../core/compose.js';
import type { Resolution } from '../core/compose.js';
import { canonicalJson } from '../core/hash.js';
import { freezeRevision } from '../core/project.js';
import { DomainError } from '../core/types.js';
import type { AssetVersion, BlueprintRevision, Project } from '../core/types.js';

/** DataVersion encoded in a profile id such as "java:dataversion-3465:registry-unverified". */
export function dataVersionFromProfile(profileId: string): number | null {
  const m = /(?:^|:)dataversion-(\d{1,10})(?::|$)/.exec(profileId);
  const n = m ? Number(m[1]) : NaN;
  return Number.isSafeInteger(n) && n > 0 && n <= 2_147_483_647 ? n : null;
}

/**
 * Suggests a DataVersion: project profile first, else the single DataVersion all
 * imported sources share. Returns null when nothing reliable is known.
 */
export function suggestDataVersion(project: Project, versions: ReadonlyMap<string, AssetVersion>, instances = project.instances): { dataVersion: number | null; source: string } {
  const fromProfile = dataVersionFromProfile(project.profileId);
  if (fromProfile) return { dataVersion: fromProfile, source: `Projektprofil ${project.profileId}` };
  const found = new Set<number>();
  for (const i of instances) {
    const v = versions.get(i.assetVersionId);
    const d = v?.source.dataVersion ?? (v ? dataVersionFromProfile(v.payload.profileId) : null);
    if (d) found.add(d);
  }
  if (found.size === 1) return { dataVersion: [...found][0]!, source: 'DataVersion der importierten Bauteile' };
  if (found.size > 1) return { dataVersion: null, source: `Bauteile nennen verschiedene DataVersions (${[...found].sort().join(', ')})` };
  return { dataVersion: null, source: 'Keine DataVersion bekannt; bitte Zielversion wählen' };
}

/** Resolves the frozen instances of one revision with the same composer as the editor. */
export function resolveRevision(project: Project, revision: BlueprintRevision, versions: ReadonlyMap<string, AssetVersion>): Resolution {
  return resolveProject({ profileId: project.profileId, instances: revision.instances }, versions);
}

const sameContent = (project: Project, revision: BlueprintRevision): boolean =>
  canonicalJson(project.instances) === canonicalJson(revision.instances) && canonicalJson(project.links) === canonicalJson(revision.links);

/**
 * Returns the revision an export of the current state must use: the newest
 * revision when it already equals the current instances and links, otherwise a
 * newly frozen one. Refuses (export lock) while the current state has blockers.
 */
export function revisionForExport(project: Project, resolution: Resolution, comment: string): { project: Project; revision: BlueprintRevision; created: boolean } {
  if (resolution.exportBlockers.length) throw new DomainError('EXPORT_BLOCKED', `Export gesperrt: ${resolution.exportBlockers.join('; ')}`);
  const last = project.revisions.at(-1);
  if (last && sameContent(project, last)) return { project, revision: last, created: false };
  const r = freezeRevision(project, comment.trim() || 'Schem-Export');
  return { ...r, created: true };
}

