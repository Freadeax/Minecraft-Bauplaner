import { useRef, useState } from 'react';
import { buildRestore, MAX_BACKUP_BYTES, mergeTeam, planRestore, readBackup, readTeamPackage } from '../../../../../packages/domain/src/index.js';
import type { Project, TeamLive, TeamState } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../../../../packages/application/src/repository.js';
import { useApp } from '../../app/context';
import { navigate } from '../../app/router';
import { errorText } from '../../app/ui';

/**
 * "Teampaket öffnen" on the project list (COOP-01): a new team member opens the package of the
 * Bauleitung and gets the project with plan, sections and team log; then chooses "Ich bin" in the
 * Team tab. An existing copy of the same team is never replaced here – it is merged in its Team tab.
 */
export function TeamOpen({ onMessage, onDone }: { onMessage(m: string): void; onDone(): void }) {
  const { repo, reloadLibrary } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const open = async (file: File) => {
    setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Die Datei ist zu groß.');
      onMessage((await openTeamPackage(await file.text(), { repo, reloadLibrary })).message);
      onDone();
    } catch (e) { onMessage(`Teampaket nicht geöffnet – nichts geändert: ${errorText(e)}`); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return <>
    <button className="secondary" disabled={busy} onClick={() => input.current?.click()} title="Projekt eines Teams aus dem Teampaket der Bauleitung anlegen">Teampaket öffnen</button>
    <input ref={input} type="file" accept=".json,application/json" hidden aria-label="Teampaket wählen" onChange={e => { const f = e.target.files?.[0]; if (f) void open(f); }} />
  </>;
}

/**
 * Opens a team package text (file or Team-Raum): creates the project with plan, sections and team log,
 * or – when this browser already has the team – only adds the live connection and the log there.
 * `live` comes from an invitation link (TEAM_LIVE.md §6).
 */
export async function openTeamPackage(text: string, app: { repo: Repository; reloadLibrary(): Promise<void> | void }, live?: TeamLive): Promise<{ projectId: string | null; message: string }> {
  const { repo, reloadLibrary } = app;
  const pkg = await readTeamPackage(text);
  const [projects, assets, versions, originals] = await Promise.all([repo.listProjects(), repo.listAssets(), repo.listVersions(), repo.listOriginalHashes()]);
  const known = projects.find(p => p.site?.team?.teamId === pkg.team.teamId);
  if (known) {
    if (live && known.site?.team) {
      const merged = mergeTeam(known.site.team, pkg.team as TeamState).team;
      // Everything this browser has goes up once; the room answers "known" for what it already has.
      const joined = { ...live, pending: merged.events.map(e => e.id) };
      await repo.applyBatch({ assets: [], versions: [], originals: [], projects: [{ project: { ...known, site: { ...known.site, team: { ...merged, live: joined } as TeamState } } as Project, baseRevision: known.revision }] });
      await reloadLibrary();
      navigate({ view: 'project', projectId: known.id, tab: 'team' });
      return { projectId: known.id, message: `„${known.name}“ ist jetzt live mit dem Team-Raum verbunden.` };
    }
    navigate({ view: 'project', projectId: known.id, tab: 'team' });
    return { projectId: known.id, message: `Das Team „${pkg.team.name}“ ist schon als Projekt „${known.name}“ da. Das Paket dort im Reiter „Team“ einlesen – so bleibt nichts verloren.` };
  }
  if (!pkg.backup) throw new Error('Dieses Teampaket enthält keinen Plan. Bitte die Bauleitung um ein „Teampaket mit Plan“.');
  const backup = await readBackup(pkg.backup);
  const plan = planRestore(backup, { projects, assets, versionIds: new Set(versions.map(v => v.id)), originalHashes: new Set(originals) });
  const write = buildRestore(plan);
  const withTeam = write.projects.map(({ project, baseRevision }) => {
    const local = project.site?.team;
    const shared = { ...pkg.team } as TeamState;
    const team = local && local.teamId === shared.teamId ? mergeTeam({ ...local }, shared).team : shared;
    const { self: _self, ...plain } = team as TeamState & { live?: unknown };
    delete (plain as { live?: unknown }).live;
    return { project: { ...project, ...(project.site && { site: { ...project.site, team: { ...plain, ...(live && { live }) } as TeamState } }) } as Project, baseRevision };
  });
  await repo.applyBatch({ assets: write.assets, versions: write.versions, originals: write.originals, projects: withTeam });
  await reloadLibrary();
  const target = withTeam[0]?.project;
  if (target) navigate({ view: 'project', projectId: target.id, tab: 'team' });
  return { projectId: target?.id ?? null, message: `${live ? 'Dem Team beigetreten' : `Teampaket von ${pkg.from.name} geöffnet`}: „${target?.name ?? pkg.team.name}“. Wähle im Reiter „Team“, wer du bist.` };
}
