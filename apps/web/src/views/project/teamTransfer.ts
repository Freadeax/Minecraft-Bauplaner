// Plan transfer for the team (COOP-01/07): one way to pack the plan of the Bauleitung and one way to take
// it over, shared by the file exchange (TeamExchange) and the Team-Raum (TeamRoom, docs/architecture/TEAM_LIVE.md §6).
import {
  buildRestore, buildTeamPackage, createBackup, planRestore, readBackup, sectionNeeds, serializeBackup, siteOf, takeOverPlan, teamContextOf, teamServerFile, teamView, serverFarms, productionOf
} from '../../../../../packages/domain/src/index.js';
import type { Project, TeamServerFile, TeamState } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../../../../packages/application/src/repository.js';
import type { ProjectSession } from './session';

interface Library { readonly assets: Parameters<typeof createBackup>[0]['assets']; readonly versions: Parameters<typeof createBackup>[0]['versions'] }

/** Team package text; with plan it carries a backup of this project without "Ich bin" and without the live key. */
export async function teamPackageText(project: Project, team: TeamState, from: { member: string; name: string }, withPlan: boolean, app: { repo: Repository; library: Library }): Promise<string> {
  let backupText: string | undefined;
  if (withPlan) {
    const site = siteOf(project);
    const { self: _self, live: _live, ...shared } = team as TeamState & { live?: unknown };
    const plain = { ...project, site: { ...site, team: shared as TeamState } };
    const file = await createBackup({ projects: [plain], assets: app.library.assets, versions: app.library.versions, getOriginal: sha => app.repo.getOriginal(sha) }, 'project', [project.id]);
    backupText = serializeBackup(file);
  }
  return JSON.stringify(await buildTeamPackage(team, from, backupText));
}

/**
 * Takes over the plan of the Bauleitung: stores the local state as a copy first (recoverable without undo),
 * then replaces the plan while keeping id, revision, "Ich bin" and the live connection.
 */
export async function takePlan(session: ProjectSession, incoming: Project, backupText: string, number: number, team: TeamState, app: { repo: Repository; reloadLibrary(): Promise<void> | void }): Promise<string> {
  const { project } = session;
  const backup = await readBackup(backupText);
  const [versions, originals, assets] = await Promise.all([app.repo.listVersions(), app.repo.listOriginalHashes(), app.repo.listAssets()]);
  const write = buildRestore(planRestore(backup, { projects: [], assets, versionIds: new Set(versions.map(v => v.id)), originalHashes: new Set(originals) }));
  const copyName = `${project.name} (vor Planstand ${number})`.slice(0, 120);
  const { id: _id, ...rest } = project;
  await app.repo.applyBatch({ assets: write.assets, versions: write.versions, originals: write.originals,
    projects: [{ project: { ...rest, id: `project_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`, name: copyName, revision: 0 } as Project, baseRevision: 0 }] });
  await app.reloadLibrary();
  session.replace(takeOverPlan(project, incoming, team));
  return copyName;
}

/** Room header for the plugin and joining planners: the server file without events (they come live) plus the plan snapshot. */
export interface RoomHeader extends Omit<TeamServerFile, 'events'> {
  readonly events: readonly [];
  readonly plan?: { readonly sha: string; readonly revisionNumber?: number; readonly revisionId?: string; readonly at: string; readonly bytes: number };
}

export function roomHeader(session: ProjectSession, team: TeamState, plan?: RoomHeader['plan']): RoomHeader {
  const { project, computation } = session;
  const site = siteOf(project);
  const view = teamView(team, teamContextOf(site));
  const guide = computation?.guide;
  const needs = computation && guide ? sectionNeeds(site, guide, computation.stepMaterials) : undefined;
  const file = teamServerFile({ team, view, projectName: project.name, sections: site.sections, steps: guide?.steps ?? [], origin: (project.world?.origin ?? [0, 0, 0]) as [number, number, number],
    dimension: project.world?.dimension ?? 'minecraft:overworld', ...(needs && { needs }), farms: serverFarms(productionOf(site)) });
  return { ...file, events: [], ...(plan && { plan }) };
}
