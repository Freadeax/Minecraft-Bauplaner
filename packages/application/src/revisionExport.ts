import { writeSchemV3 } from '../../formats/src/schemWrite.js';
import { writeLitematic } from '../../formats/src/litematicWrite.js';
import type { LitematicExportReport } from '../../formats/src/litematicWrite.js';
import type { SchemAnchor, SchemExportReport, UnselectedPolicy } from '../../formats/src/schemWrite.js';
import type { NbtTag } from '../../voxel/src/types.js';
import { DomainError } from '../../domain/src/types.js';
import type { AssetVersion, BlueprintRevision, Project } from '../../domain/src/types.js';

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

import { dataVersionFromProfile, resolveRevision, revisionForExport } from '../../domain/src/revisionExport.js';
import { resolveProject } from '../../domain/src/compose.js';

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


/** Prepare one complete export without storage or UI side effects. Failed writers
 * never publish a new revision; callers persist the returned project only after success. */
export async function prepareRevisionExport(project: Project, versions: ReadonlyMap<string, AssetVersion>, settings: SchemExportSettings,
  options: { readonly revisionId?: string; readonly comment?: string } = {}): Promise<{ readonly project: Project; readonly created: boolean; readonly output: RevisionExport }> {
  const prepared = options.revisionId === undefined
    ? revisionForExport(project, resolveProject(project, versions), options.comment ?? '')
    : { project, revision: project.revisions.find(r => r.id === options.revisionId), created: false };
  if (!prepared.revision) throw new DomainError('NOT_FOUND', `Revision ${options.revisionId} existiert nicht.`);
  const output = await exportRevisionSchem(prepared.project, prepared.revision.id, versions, settings);
  return { project: prepared.project, created: prepared.created, output };
}
