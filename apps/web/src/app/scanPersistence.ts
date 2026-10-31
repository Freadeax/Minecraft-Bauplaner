import type { Project, OriginalFile, ProjectScanReference } from '../../../../packages/domain/src/index.js';
import type { WorldScan } from '../../../../packages/formats/src/index.js';
import type { Vec3 } from '../../../../packages/voxel/src/index.js';
import { sha256Hex } from '../../../../packages/domain/src/hash.ts';
import type { Repository } from './repository';

export type PersistableScan = WorldScan & { readonly sourceSha256: string; readonly fileName: string };
export const MAX_STORED_SCAN_BYTES = 16_000_000;

/** Save the unchanged recording and its project reference in one baseRevision-checked transaction. */
export async function saveProjectScan(repo: Pick<Repository, 'applyBatch'>, project: Project, scan: PersistableScan,
  bytes: Uint8Array, alignment: Vec3, importedAt = new Date().toISOString()): Promise<Project> {
  if (bytes.length > MAX_STORED_SCAN_BYTES) throw new Error('Die Aufnahme ist zu groß (maximal 16 MB).');
  if (!/^[a-f0-9]{64}$/.test(scan.sourceSha256) || await sha256Hex(bytes) !== scan.sourceSha256)
    throw new Error('Prüfsumme der Aufnahmedatei stimmt nicht. Bitte erneut importieren.');
  if (!scan.fileName.trim() || scan.fileName.length > 255 || /[\x00-\x1f]/.test(scan.fileName)) throw new Error('Ungültiger Dateiname der Aufnahme.');
  if (!Number.isFinite(Date.parse(importedAt))) throw new Error('Ungültige Importzeit der Aufnahme.');
  if (alignment.length !== 3 || !alignment.every(Number.isSafeInteger)) throw new Error('Ungültige Ausrichtung der Aufnahme.');
  const revisionId = scan.meta?.revisionId ?? null;
  if (scan.meta && (scan.meta.projectId !== project.id || !project.revisions.some(r => r.id === revisionId)))
    throw new Error('Die Aufnahme gehört nicht zu einer bekannten Revision dieses Projekts.');
  const reference: ProjectScanReference = { sha256: scan.sourceSha256, fileName: scan.fileName, importedAt, revisionId, alignment: [...alignment] as Vec3 };
  const original: OriginalFile = { sha256: reference.sha256, fileName: reference.fileName, mediaType: 'application/octet-stream', size: bytes.length, createdAt: importedAt, bytes };
  const next: Project = { ...project, updatedAt: importedAt, scanHistory: [...(project.scanHistory ?? []).filter(s => s.sha256 !== reference.sha256), reference] };
  const saved = await repo.applyBatch({ originals: [original], projects: [{ project: next, baseRevision: project.revision }] });
  if (!saved[0]) throw new Error('Die Aufnahme wurde nicht bestätigt gespeichert.');
  return saved[0];
}

/** Verify source bytes again before handing them to the existing bounded reader/worker. */
export async function loadProjectScanOriginal(repo: Pick<Repository, 'getOriginal'>, reference: ProjectScanReference): Promise<OriginalFile> {
  const file = await repo.getOriginal(reference.sha256);
  if (!file) throw new Error(`Gespeicherte Aufnahme „${reference.fileName}“ fehlt. Bitte erneut importieren.`);
  if (file.bytes.length > MAX_STORED_SCAN_BYTES || file.size !== file.bytes.length || await sha256Hex(file.bytes) !== reference.sha256)
    throw new Error(`Gespeicherte Aufnahme „${reference.fileName}“ ist beschädigt. Bitte erneut importieren.`);
  return { ...file, fileName: reference.fileName };
}
