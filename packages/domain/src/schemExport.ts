import { writeSchemV3 } from '../../formats/src/schemWrite.js';
import { writeLitematic } from '../../formats/src/litematicWrite.js';
import type { LitematicExportReport } from '../../formats/src/litematicWrite.js';
import type { SchemAnchor, SchemExportReport, UnselectedPolicy } from '../../formats/src/schemWrite.js';
import type { NbtTag } from '../../voxel/src/types.js';
import { resolveProject } from './compose.js';
import type { Resolution } from './compose.js';
import { canonicalJson } from './hash.js';
import { freezeRevision } from './project.js';
import { DomainError } from './types.js';
import type { AssetVersion, BlueprintRevision, Project } from './types.js';

/**
 * Schem v3 export of frozen revisions (P3-01). Every export names exactly one
 * BlueprintRevision; the file is computed from that revision's instances, never
 * from the live editor state, so it can be reproduced later bit for bit.
 */

/** Selection aid for the DataVersion field. Values from the Minecraft wiki, not verified by this app. */
export const KNOWN_DATA_VERSIONS: readonly { readonly version: string; readonly dataVersion: number }[] = Object.freeze([
  { version: '1.20.1', dataVersion: 3465 },
  { version: '1.20.4', dataVersion: 3700 },
  { version: '1.20.6', dataVersion: 3839 },
  { version: '1.21.1', dataVersion: 3955 },
  { version: '1.21.4', dataVersion: 4189 },
]);

/** Target file format of a revision export. Both describe the same cells and anchor. */
export type ExportFormat = 'schem' | 'litematic';
export const EXPORT_FORMAT_LABEL: Readonly<Record<ExportFormat, string>> = { schem: 'Sponge Schematic v3 (.schem)', litematic: 'Litematica (.litematic)' };

export interface SchemExportSettings {
  /** Default 'schem'. */
  readonly format?: ExportFormat;
  readonly dataVersion: number;
  readonly anchor: SchemAnchor;
  readonly unselected: UnselectedPolicy;
  readonly author?: string;
}

export interface RevisionExport {
  readonly format: ExportFormat;
  readonly revision: BlueprintRevision;
  readonly fileName: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly report: SchemExportReport | LitematicExportReport;
  /** Domain notes in addition to the format report (profile, DataVersion sources). */
  readonly notes: readonly string[];
}

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
  return resolveProject({ ...project, instances: revision.instances, links: revision.links }, versions);
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

export function exportFileName(project: Project, revision: BlueprintRevision, format: ExportFormat = 'schem'): string {
  const slug = project.name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bauplan';
  return `${slug}-rev${revision.number}.${format}`;
}

/**
 * Writes the Schem or Litematic file for one frozen revision. The export lock is re-checked
 * against that revision's own resolution, so an old revision that later lost a
 * version (or never was clean) is refused as well.
 */
export async function exportRevisionSchem(project: Project, revisionId: string, versions: ReadonlyMap<string, AssetVersion>, settings: SchemExportSettings): Promise<RevisionExport> {
  const revision = project.revisions.find(r => r.id === revisionId);
  if (!revision) throw new DomainError('NOT_FOUND', `Revision ${revisionId} existiert nicht.`);
  const resolution = resolveRevision(project, revision, versions);
  if (resolution.exportBlockers.length || !resolution.world) throw new DomainError('EXPORT_BLOCKED', `Revision ${revision.number} ist nicht exportierbar: ${resolution.exportBlockers.join('; ') || 'leer'}`);
  const notes: string[] = [];
  const mismatches = resolution.issues.filter(i => i.code === 'PROFILE_MISMATCH');
  if (mismatches.length) notes.push(`${mismatches.length} Bauteile stammen aus einem anderen Profil als ${project.profileId}.`);
  const profileDv = dataVersionFromProfile(project.profileId);
  if (profileDv && profileDv !== settings.dataVersion) notes.push(`Gewählte DataVersion ${settings.dataVersion} weicht vom Projektprofil (${profileDv}) ab.`);
  const sources = new Set(revision.instances.map(i => versions.get(i.assetVersionId)?.source.dataVersion).filter((d): d is number => d !== undefined));
  if ([...sources].some(d => d !== settings.dataVersion)) notes.push(`Importierte Bauteile stammen aus DataVersion ${[...sources].sort().join(', ')}; Blockzustände werden nicht umgewandelt.`);
  const extra: Record<string, NbtTag> = {
    Bauplaner: { type: 'compound', value: {
      ProjectId: { type: 'string', value: project.id },
      RevisionId: { type: 'string', value: revision.id },
      RevisionNumber: { type: 'int', value: revision.number },
      Profile: { type: 'string', value: project.profileId },
      // Project coordinate of the box minimum: the game bridge needs it to align recordings for any anchor.
      ProjectMin: { type: 'intArray', value: [...resolution.world.bounds.min] },
    } },
  };
  const date = Date.parse(revision.createdAt);
  const format = settings.format ?? 'schem';
  if (format !== 'schem' && format !== 'litematic') throw new DomainError('EXPORT_FORMAT', `Unbekanntes Exportformat ${String(format)}.`);
  if (format === 'litematic') {
    const out = await writeLitematic(resolution.world, {
      dataVersion: settings.dataVersion, anchor: settings.anchor, unselected: settings.unselected, regionName: project.name,
      metadata: { name: `${project.name} · Revision ${revision.number}`, ...(settings.author?.trim() && { author: settings.author.trim() }), ...(revision.comment && { description: revision.comment }), ...(Number.isSafeInteger(date) && { date }), extra },
    });
    return { format, revision, fileName: exportFileName(project, revision, format), bytes: out.bytes, sha256: out.sha256, report: out.report, notes };
  }
  const out = await writeSchemV3(resolution.world, {
    dataVersion: settings.dataVersion, anchor: settings.anchor, unselected: settings.unselected,
    metadata: { name: `${project.name} · Revision ${revision.number}`, ...(settings.author?.trim() && { author: settings.author.trim() }), ...(Number.isSafeInteger(date) && { date }), extra },
  });
  return { format, revision, fileName: exportFileName(project, revision), bytes: out.bytes, sha256: out.sha256, report: out.report, notes };
}
