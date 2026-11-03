import { useRef, useState } from 'react';
import { buildRestore, MAX_BACKUP_BYTES, mergeTeam, planRestore, readBackup, readTeamPackage } from '../../../../../packages/domain/src/index.js';
import type { Project, TeamState } from '../../../../../packages/domain/src/index.js';
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
      const pkg = await readTeamPackage(await file.text());
      if (!pkg.backup) throw new Error('Dieses Teampaket enthält keinen Plan. Bitte die Bauleitung um ein „Teampaket mit Plan“.');
      const backup = await readBackup(pkg.backup);
      const [projects, assets, versions, originals] = await Promise.all([repo.listProjects(), repo.listAssets(), repo.listVersions(), repo.listOriginalHashes()]);
      const known = projects.find(p => p.site?.team?.teamId === pkg.team.teamId);
      if (known) {
        onMessage(`Das Team „${pkg.team.name}“ ist schon als Projekt „${known.name}“ da. Das Paket dort im Reiter „Team“ einlesen – so bleibt nichts verloren.`);
        navigate({ view: 'project', projectId: known.id, tab: 'team' });
        return;
      }
      const plan = planRestore(backup, { projects, assets, versionIds: new Set(versions.map(v => v.id)), originalHashes: new Set(originals) });
      const write = buildRestore(plan);
      const withTeam = write.projects.map(({ project, baseRevision }) => {
        const local = project.site?.team;
        const shared = { ...pkg.team } as TeamState;
        const team = local && local.teamId === shared.teamId ? mergeTeam({ ...local }, shared).team : shared;
        const { self: _self, ...plain } = team;
        return { project: { ...project, ...(project.site && { site: { ...project.site, team: plain as TeamState } }) } as Project, baseRevision };
      });
      await repo.applyBatch({ assets: write.assets, versions: write.versions, originals: write.originals, projects: withTeam });
      await reloadLibrary();
      onDone();
      const target = withTeam[0]?.project;
      if (target) navigate({ view: 'project', projectId: target.id, tab: 'team' });
      onMessage(`Teampaket von ${pkg.from.name} geöffnet: „${target?.name ?? pkg.team.name}“. Wähle im Reiter „Team“, wer du bist.`);
    } catch (e) { onMessage(`Teampaket nicht geöffnet – nichts geändert: ${errorText(e)}`); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return <>
    <button className="secondary" disabled={busy} onClick={() => input.current?.click()} title="Projekt eines Teams aus dem Teampaket der Bauleitung anlegen">Teampaket öffnen</button>
    <input ref={input} type="file" accept=".json,application/json" hidden aria-label="Teampaket wählen" onChange={e => { const f = e.target.files?.[0]; if (f) void open(f); }} />
  </>;
}
