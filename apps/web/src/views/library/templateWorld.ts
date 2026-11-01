import { createEnsembleProject, createTemplateProject, missingMembers, missingTemplateVersions, resolveProject } from '../../../../../packages/domain/src/index.js';
import type { AssetVersion, Ensemble, LibraryTemplate } from '../../../../../packages/domain/src/index.js';

/** Resolved world of the project an ensemble template would create; null when versions are missing or it does not resolve. */
export function templateWorld(t: LibraryTemplate, versions: ReadonlyMap<string, AssetVersion>) {
  if (t.body.kind !== 'ensemble' || missingTemplateVersions(t, versions).length) return null;
  try { return resolveProject(createTemplateProject(t, versions), versions); } catch { return null; }
}

/** Same for a shipped ensemble with the newest versions. */
export function ensembleWorld(e: Ensemble, byAsset: ReadonlyMap<string, AssetVersion>, names: ReadonlyMap<string, string>, versions: ReadonlyMap<string, AssetVersion>) {
  if (missingMembers(e, byAsset).length) return null;
  try { return resolveProject(createEnsembleProject(e, byAsset, names), versions); } catch { return null; }
}

/** Thumbnail cache key: content-addressed versions plus layout make it stable across reloads. */
export const templateThumbKey = (t: LibraryTemplate) => t.body.kind === 'ensemble'
  ? `tpl:${t.body.members.map(m => `${m.assetVersionId}@${m.transform.position.join(',')}/${m.transform.quarterTurns}${m.transform.mirrorX ? 'm' : ''}`).join(';')}`
  : `tplgen:${t.body.source.id}:v${t.body.source.version}:${JSON.stringify(t.body.source.params)}`;
