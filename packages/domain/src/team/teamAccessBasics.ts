import type { Project } from '../core/types.js';
import type { RoomTeam } from './teamSync.js';
import type { TeamState } from './team.js';

// PERF-07 O-9: the two team-access helpers the app start needs (backup status, backup hint), without the
// signing and room code of teamAccess.ts.

/** True when the project holds keys of a Team-Raum (live mode). */
export function hasTeamAccess(project: Pick<Project, 'site'>): boolean {
  return !!(project.site?.team as RoomTeam | undefined)?.live;
}

/** The project without the Team-Raum block (keys, read position, outbox). Everything else stays untouched. */
export function withoutTeamAccess<P extends Pick<Project, 'site'>>(project: P): P {
  const team = project.site?.team as RoomTeam | undefined;
  if (!team?.live) return project;
  const { live: _l, ...rest } = team;
  return { ...project, site: { ...project.site!, team: rest as TeamState } };
}
