import { useRef, useState } from 'react';
import {
  buildRestore, buildTeamPackage, createBackup, decodeReportCode, encodeReportCode, MAX_BACKUP_BYTES, mergeTeam, planRestore, readBackup, readTeamPackage, readTeamServerFile,
  serializeBackup, siteOf, siteOperation, takeOverPlan, TEAM_PACKAGE_FORMAT, TEAM_SERVER_FORMAT, teamContextOf, teamPackageFileName, teamServerFile, teamServerFileName,
  teamStatusText, teamView, describeEvent,
} from '../../../../../packages/domain/src/index.js';
import type { Project, TeamEvent, TeamMerge, TeamState, TeamView } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { download, errorText } from '../../app/ui';
import type { ProjectSession } from './session';

interface Preview {
  readonly source: string;
  readonly merge: TeamMerge;
  readonly before: TeamView;
  readonly after: TeamView;
  /** Plan of the Bauleitung from a team package, newer than the local release. */
  readonly plan?: { readonly project: Project; readonly backupText: string; readonly number: number; readonly summary: string };
  /** Local project has no team yet and adopts the incoming one. */
  readonly adopt: boolean;
}

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Exchange of the team log (COOP-01/02): team package, report code, server file, status text and import with preview. */
export function TeamExchange({ session, team, view, onMessage }: { session: ProjectSession; team: TeamState | null; view: TeamView | null; onMessage(m: string): void }) {
  const { repo, library, reloadLibrary } = useApp();
  const { project, computation } = session;
  const site = siteOf(project);
  const ctx = teamContextOf(site);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [shown, setShown] = useState<{ title: string; text: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [takePlan, setTakePlan] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const me = team?.self && view ? view.members.find(m => m.id === team.self) ?? null : null;

  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (e) { onMessage(errorText(e)); } finally { setBusy(false); } };
  const show = async (title: string, text: string) => { setShown({ title, text }); if (await copy(text)) onMessage(`${title} in die Zwischenablage kopiert.`); };

  const exportPackage = (withPlan: boolean) => run(async () => {
    if (!team || !view) return;
    let backupText: string | undefined;
    if (withPlan) {
      // The package must not carry this browser's "Ich bin".
      const { self: _self, ...shared } = team;
      const plain = { ...project, site: { ...site, team: shared as TeamState } };
      const file = await createBackup({ projects: [plain], assets: library.assets, versions: library.versions, getOriginal: sha => repo.getOriginal(sha) }, 'project', [project.id]);
      backupText = serializeBackup(file);
    }
    const pkg = await buildTeamPackage(team, { member: me?.id ?? team.founder, name: me?.name ?? 'unbekannt' }, backupText);
    const name = teamPackageFileName(team);
    download(name, JSON.stringify(pkg), 'application/json');
    onMessage(`Teampaket „${name}“ erzeugt (${team.events.length} Ereignisse${withPlan ? ', mit Plan' : ', nur Teamstand'}). Über Discord oder Chat an die anderen schicken; die lesen es im Reiter „Team“ ein (neue Mitspieler: Projekte → „Teampaket öffnen“).`);
  });

  const reportCode = () => run(async () => {
    if (!team || !me) { onMessage('Bitte zuerst oben wählen, wer du bist.'); return; }
    const mine = team.events.filter(e => e.by === me.id);
    if (!mine.length) { onMessage('Du hast noch nichts gemeldet.'); return; }
    let events: TeamEvent[] = mine, text = '';
    for (;;) {
      try { text = await encodeReportCode(team, events); break; }
      catch (e) { if (events.length <= 1) throw e; events = events.slice(Math.ceil(events.length / 2)); }
    }
    await show(`Meldecode (${events.length} Ereignis${events.length === 1 ? '' : 'se'} von dir${events.length < mine.length ? `, die neuesten von ${mine.length}` : ''})`, text);
  });

  const statusText = () => {
    if (!team || !view) return;
    const progress = new Map((computation?.site.plan?.sections ?? []).map(s => [s.id, s.blocks ? s.blocksDone / s.blocks : 0]));
    void show('Statustext', teamStatusText({ projectName: project.name, team, view, ctx, progressBySection: progress }));
  };
  const invitation = () => {
    if (!team) return;
    const url = `${location.origin}${location.pathname}`;
    void show('Einladung', [`Hallo! Wir bauen „${project.name}“${team.server ? ` auf ${team.server}` : ''} gemeinsam.`, '',
      '1) Nur spielen: auf dem Server /bauplaner team eingeben – dort siehst du freie Abschnitte, /bauplaner nehmen <nr> übernimmt einen, /bauplaner fertig meldet ihn.',
      `2) Mit Hologramm im Spiel: Mod von ${url}#/mod installieren, im Spiel /bauplaner verbinden.`,
      `3) Mit Planer: ${url} öffnen, Projekte → „Teampaket öffnen“ und die Datei wählen, die ich dir schicke. Dann im Reiter „Team“ deinen Namen wählen.`, '',
      'Rollen: Helfer übernehmen Abschnitte und melden sie fertig, Baumeister prüfen, die Bauleitung gibt Planstände frei.'].join('\n'));
  };

  const serverFile = () => run(async () => {
    if (!team || !view) return;
    if (!project.world) { onMessage('Für die Serverdatei muss das Projekt auf der Weltkarte platziert sein (Ursprung und Dimension), sonst weiß der Server nicht, wo die Abschnitte liegen.'); return; }
    const guide = computation?.guide;
    if (!guide) { onMessage('Die Bauanleitung ist noch nicht berechnet.'); return; }
    const file = teamServerFile({ team, view, projectName: project.name, sections: site.sections, steps: guide.steps, origin: project.world.origin as [number, number, number], dimension: project.world.dimension });
    const name = teamServerFileName(team);
    download(name, JSON.stringify(file, null, 1), 'application/json');
    onMessage(`Serverdatei „${name}“ erzeugt. Auf dem Server nach plugins/BauplanerBridge/team/ legen und /bauplaner team laden eingeben. Abschnitte ohne Bauteile haben keine Box.`);
  });

  const preparePreview = async (source: string, incomingTeam: TeamState, plan?: Preview['plan']) => {
    let base = team;
    const adopt = !base;
    if (!base) base = { ...incomingTeam, events: [] };
    const merge = mergeTeam(base, incomingTeam);
    const before = teamView(base, ctx), after = teamView(merge.team, ctx);
    setPreview({ source, merge, before, after, adopt, ...(plan && { plan }) });
    setTakePlan(true);
  };

  const readFile = (file: File) => run(async () => {
    setPreview(null);
    if (file.size > MAX_BACKUP_BYTES) throw new Error('Die Datei ist zu groß.');
    const text = await file.text();
    let format: unknown;
    try { format = (JSON.parse(text) as { format?: unknown }).format; } catch { throw new Error('Die Datei ist kein gültiges JSON.'); }
    if (format === TEAM_SERVER_FORMAT) {
      const s = readTeamServerFile(text);
      if (team && s.teamId !== team.teamId) throw new Error(`Die Serverdatei gehört zum Team „${s.name}“, nicht zu „${team.name}“.`);
      if (!team) throw new Error('Eine Serverdatei enthält keinen Plan. Bitte zuerst ein Teampaket der Bauleitung öffnen.');
      await preparePreview(`Server (${file.name})`, { ...team, events: s.events });
      return;
    }
    if (format !== TEAM_PACKAGE_FORMAT) throw new Error('Das ist weder ein Teampaket noch eine Server-Teamdatei.');
    const pkg = await readTeamPackage(text);
    const incoming = { ...pkg.team } as TeamState;
    let plan: Preview['plan'];
    if (pkg.backup) {
      const backup = await readBackup(pkg.backup);
      const p = backup.projects[0];
      if (p) {
        const incomingView = teamView(incoming, teamContextOf(siteOf(p)));
        const localNumber = view?.release?.revisionNumber ?? -1;
        if (incomingView.release && incomingView.release.revisionNumber > localNumber && p.revisions.some(r => r.id === incomingView.release!.revisionId))
          plan = { project: p, backupText: pkg.backup, number: incomingView.release.revisionNumber, summary: incomingView.release.summary };
        if (!team && p.id !== project.id) throw new Error(`Das Teampaket gehört zum Projekt „${p.name}“. Neue Teamprojekte öffnest du unter Projekte → „Teampaket öffnen“.`);
      }
    } else if (!team) throw new Error('Dieses Teampaket enthält keinen Plan. Bitte die Bauleitung um ein Paket „mit Plan“.');
    if (team && incoming.teamId !== team.teamId) throw new Error(`Das Teampaket gehört zum Team „${incoming.name}“, nicht zu „${team.name}“.`);
    await preparePreview(`Teampaket von ${pkg.from.name} (${file.name})`, incoming, plan);
  });

  const readCode = () => run(async () => {
    setPreview(null);
    if (!team) throw new Error('Meldecodes gehören zu einem Team. Erst ein Team gründen oder ein Teampaket öffnen.');
    const d = await decodeReportCode(code);
    if (d.teamId !== team.teamId) throw new Error('Der Meldecode gehört zu einem anderen Team.');
    await preparePreview('Meldecode', { ...team, events: d.events });
  });

  const apply = () => run(async () => {
    if (!preview) return;
    const { merge } = preview;
    const self = team?.self;
    const merged: TeamState = self !== undefined ? { ...merge.team, self } : (() => { const { self: _s, ...t } = merge.team; return t as TeamState; })();
    if (preview.plan && takePlan) {
      const backup = await readBackup(preview.plan.backupText);
      const [versions, originals] = await Promise.all([repo.listVersions(), repo.listOriginalHashes()]);
      const plan = planRestore(backup, { projects: [], assets: await repo.listAssets(), versionIds: new Set(versions.map(v => v.id)), originalHashes: new Set(originals) });
      const write = buildRestore(plan);
      // Keep the local state as a copy before the plan changes (recoverable without undo).
      const copyName = `${project.name} (vor Planstand ${preview.plan.number})`.slice(0, 120);
      const { id: _id, ...rest } = project;
      await repo.applyBatch({ assets: write.assets, versions: write.versions, originals: write.originals,
        projects: [{ project: { ...rest, id: `project_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`, name: copyName, revision: 0 } as Project, baseRevision: 0 }] });
      await reloadLibrary();
      session.replace(takeOverPlan(project, preview.plan.project, merged));
      onMessage(`Planstand ${preview.plan.number} übernommen, ${merge.added.length} neue Ereignisse eingelesen. Dein vorheriger Stand liegt als Projekt „${copyName}“ in der Projektliste.`);
    } else {
      const e = session.execute(siteOperation({ ...site, team: merged }, `${preview.source}: ${merge.added.length} Ereignisse eingelesen`));
      if (e) throw new Error(e);
      onMessage(`${merge.added.length} neue Ereignisse eingelesen${merge.known ? `, ${merge.known} waren schon bekannt` : ''}. Mit Strg+Z rückgängig machbar.`);
    }
    setPreview(null); setCode('');
  });

  const names = new Map((preview?.after ?? view)?.members.map(m => [m.id, m.name]) ?? []);
  const newIssues = preview ? [...preview.after.conflicts.filter(c => !preview.before.conflicts.some(b => b.text === c.text)).map(c => c.text),
    ...preview.after.rejected.filter(r => !preview.before.rejected.some(b => b.event.id === r.event.id)).map(r => `nicht übernommen: ${r.reason}`)] : [];

  return <div role="region" className="team-block team-exchange" aria-label="Austausch">
    <h3>Austausch <small>ohne Server und Konten – der Planer verschickt nichts selbst</small></h3>
    {team && <div className="team-exchange-grid">
      <div><h4>Weitergeben</h4>
        <div className="team-buttons">
          <button disabled={busy} onClick={() => void exportPackage(true)}>Teampaket mit Plan</button>
          <button disabled={busy} className="secondary" onClick={() => void exportPackage(false)}>Teampaket nur Teamstand</button>
          <button disabled={busy || !me} className="secondary" onClick={() => void reportCode()}>Meldecode kopieren</button>
          <button disabled={busy} className="secondary" onClick={statusText}>Statustext für Discord</button>
          <button disabled={busy} className="secondary" onClick={invitation}>Einladung</button>
        </div>
        <small className="muted">Teampaket mit Plan: für neue Mitspieler und nach einer Freigabe. Meldecode: deine Meldungen als eine Zeile für den Chat.</small>
        <h4>Server (Paper-Plugin)</h4>
        <div className="team-buttons"><button disabled={busy} className="secondary" onClick={() => void serverFile()}>Serverdatei herunterladen</button></div>
        <small className="muted">Nach <code>plugins/BauplanerBridge/team/</code> legen, <code>/bauplaner team laden</code>. Was Spieler im Spiel melden, holst du mit <code>/bauplaner team export</code> und liest die Datei hier ein.</small>
      </div>
      <div><h4>Einlesen</h4>
        <div className="team-buttons"><button disabled={busy} onClick={() => fileInput.current?.click()}>Datei wählen …</button></div>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = ''; }} />
        <form className="team-inline" onSubmit={e => { e.preventDefault(); void readCode(); }}>
          <input className="grow" aria-label="Meldecode" placeholder="Meldecode einfügen (BPT1:…)" value={code} onChange={e => setCode(e.target.value)} />
          <button disabled={busy || !code.trim()}>Prüfen</button></form>
      </div>
    </div>}
    {!team && <div><p className="muted">Bist du Bauleitung in einem anderen Browser? Teampaket dieses Projekts hier einlesen:</p>
      <button disabled={busy} className="secondary" onClick={() => fileInput.current?.click()}>Teampaket einlesen …</button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = ''; }} /></div>}
    {shown && <div className="team-shown"><div className="team-block-head"><h4>{shown.title}</h4><button className="link-button" onClick={() => setShown(null)}>schließen</button></div>
      <textarea readOnly value={shown.text} rows={Math.min(14, shown.text.split('\n').length + 1)} onFocus={e => e.target.select()} aria-label={shown.title} /></div>}
    {preview && <div className="team-preview" role="region" aria-label="Vorschau Einlesen">
      <h4>Vorschau: {preview.source}</h4>
      <ul>
        <li><strong>{preview.merge.added.length}</strong> neue Ereignisse{preview.merge.known ? `, ${preview.merge.known} schon bekannt` : ''}{preview.adopt ? ' – dieses Projekt wird Teil des Teams' : ''}.</li>
        {preview.merge.added.slice(0, 8).map(e => <li key={e.id} className="muted">{describeEvent(e, ctx, names)}</li>)}
        {preview.merge.added.length > 8 && <li className="muted">… und {preview.merge.added.length - 8} weitere</li>}
        {preview.merge.clashes.length > 0 && <li className="bad">{preview.merge.clashes.length} Ereignis(se) mit gleicher Kennung, aber anderem Inhalt – die eigene Fassung bleibt.</li>}
        {newIssues.map((t, i) => <li key={i} className="warn">{t}</li>)}
      </ul>
      {preview.plan && <label className="team-check"><input type="checkbox" checked={takePlan} onChange={e => setTakePlan(e.target.checked)} />
        Neuen Planstand {preview.plan.number} der Bauleitung übernehmen{preview.plan.summary ? ` („${preview.plan.summary}“)` : ''} – {preview.plan.project.instances.length} Bauteile, {preview.plan.project.site?.sections.length ?? 0} Abschnitte. Dein bisheriger Stand bleibt als Kopie erhalten.</label>}
      <div className="team-buttons"><button disabled={busy || (!preview.merge.added.length && !(preview.plan && takePlan))} onClick={() => void apply()}>Übernehmen</button>
        <button className="secondary" onClick={() => setPreview(null)}>Verwerfen</button></div>
    </div>}
  </div>;
}
