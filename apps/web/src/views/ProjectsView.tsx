import { useCallback, useEffect, useRef, useState } from 'react';
import { applyOperation, backupFileName, buildRestore, createBackup, createProject, MAX_BACKUP_BYTES, newInstance, planRestore, readBackup } from '../../../../packages/domain/src/index.js';
import type { Instance, Project, ProjectChoice, RestorePlan } from '../../../../packages/domain/src/index.js';
import { useApp } from '../app/context';
import type { StorageInfo } from '../app/repository';
import { href, navigate } from '../app/router';
import { Cube, download, errorText } from '../app/ui';

const mb = (n: number) => `${(n / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
const planLabel = { new: 'neu', same: 'identisch vorhanden', differs: 'weicht lokal ab' } as const;

/** Projektzentrale: local projects with revision, size and storage status. */
export function ProjectsView() {
  const { repo, library, reloadLibrary } = useApp();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [storage, setStorage] = useState<StorageInfo>({});
  const [restore, setRestore] = useState<{ plan: RestorePlan; fileName: string; choices: Record<string, ProjectChoice> } | null>(null);
  const [busy, setBusy] = useState(false);
  const restoreInput = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    try { setProjects((await repo.listProjects()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); }
    catch (e) { setMessage(errorText(e)); }
    setStorage(await repo.storageInfo().catch(() => ({})));
  }, [repo]);
  useEffect(() => { void load(); }, [load]);
  // Other tabs saving or deleting projects refresh this list.
  useEffect(() => repo.subscribe(c => { if (c.kind === 'projects') void load(); }), [repo, load]);

  const backup = async (scope: 'project' | 'all', project?: Project) => {
    setBusy(true);
    try {
      const file = await createBackup({ projects: projects ?? [], assets: library.assets, versions: library.versions, getOriginal: sha => repo.getOriginal(sha) },
        scope, project ? [project.id] : undefined);
      download(backupFileName(file), JSON.stringify(file), 'application/json');
      setMessage(`Sicherung erstellt: ${file.projects.length} Projekt(e), ${file.assets.length} Bauteil(e), ${file.versions.length} Version(en), ${file.originals.length} Originaldatei(en)${file.missingOriginals.length ? ` – ${file.missingOriginals.length} Original(e) lokal nicht vorhanden` : ''}. Datei liegt in deinen Downloads.`);
    } catch (e) { setMessage(`Sicherung fehlgeschlagen: ${errorText(e)}`); }
    finally { setBusy(false); }
  };
  const openBackup = async (file: File) => {
    setBusy(true); setRestore(null); setMessage('');
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Sicherungsdatei ist zu groß');
      const parsed = await readBackup(await file.text());
      const [localProjects, assets, versions, originals] = await Promise.all([repo.listProjects(), repo.listAssets(), repo.listVersions(), repo.listOriginalHashes()]);
      const plan = planRestore(parsed, { projects: localProjects, assets, versionIds: new Set(versions.map(v => v.id)), originalHashes: new Set(originals) });
      setRestore({ plan, fileName: file.name, choices: {} });
    } catch (e) { setMessage(`Sicherung nicht lesbar – nichts geändert: ${errorText(e)}`); }
    finally { setBusy(false); if (restoreInput.current) restoreInput.current.value = ''; }
  };
  const applyRestore = async () => {
    if (!restore) return;
    setBusy(true);
    try {
      const write = buildRestore(restore.plan, restore.choices);
      await repo.applyBatch(write);
      setRestore(null); await reloadLibrary(); await load();
      setMessage(`Wiederhergestellt. ${write.summary.join(' ')}`);
    } catch (e) { setMessage(`Wiederherstellung abgebrochen, nichts geschrieben: ${errorText(e)}`); }
    finally { setBusy(false); }
  };
  const persist = async () => {
    const granted = await repo.requestPersistence();
    setMessage(granted ? 'Der Browser hält die Daten jetzt dauerhaft vor.' : 'Der Browser hat dauerhafte Speicherung nicht gewährt. Regelmäßige Sicherungen bleiben wichtig.');
    setStorage(await repo.storageInfo().catch(() => ({})));
  };

  const create = async (project: Project) => {
    try { await repo.saveProject(project, 0); navigate({ view: 'project', projectId: project.id, tab: 'editor' }); }
    catch (e) { setMessage(`Projekt nicht gespeichert: ${errorText(e)}`); }
  };
  const createEmpty = () => {
    try { void create(createProject({ name: name || 'Neues Projekt' })); } catch (e) { setMessage(errorText(e)); }
  };
  const createSample = () => {
    const version = (assetId: string) => library.assets.find(a => a.id === assetId)?.versionIds.at(-1);
    const tower = version('sample_tower'), wall = version('sample_wall'), gate = version('sample_gate');
    if (!tower || !wall || !gate) { setMessage('Beispielbauteile fehlen in der Bibliothek.'); return; }
    const at = (assetVersionId: string, name: string, x: number, z: number, quarterTurns: 0 | 1 | 2 | 3 = 0): Instance =>
      newInstance({ assetVersionId, name, transform: { position: [x, 0, z], quarterTurns, mirrorX: false } });
    // Positions follow the sample connectors: tower east face (4,0,2) ↔ wall west joint (0,0,1).
    const instances = [at(tower, 'Turm West', 0, 0), at(wall, 'Mauer 1', 4, 1), at(gate, 'Tor', 10, 1), at(wall, 'Mauer 2', 16, 1), at(tower, 'Turm Ost', 22, 0)];
    let project = createProject({ name: 'Burgmauer (Beispiel)', description: 'Beispielprojekt aus den synthetischen Bibliotheksbauteilen.' });
    project = applyOperation(project, { kind: 'batch', label: 'Beispiel', operations: instances.map(instance => ({ kind: 'instance.add' as const, instance })) }).project;
    void create(project);
  };
  const remove = async (project: Project) => {
    if (!window.confirm(`Projekt „${project.name}“ endgültig löschen? Bibliotheksbauteile bleiben erhalten.`)) return;
    try { await repo.deleteProject(project.id); await load(); } catch (e) { setMessage(errorText(e)); }
  };

  return <div className="page">
    <section className="intro"><div><span className="eyebrow">PROJEKTZENTRALE</span><h1>Große Ideen.<br /><em>Block für Block.</em></h1>
      <p>Setze gespeicherte Bauteile zu Projekten zusammen, prüfe Überschneidungen Block für Block und plane den Nachbau. Alles läuft lokal in deinem Browser.</p></div>
      <div className="intro-aside"><div className="local-badge"><span className="pulse" /> {repo.kind === 'memory' ? 'Nur für diese Sitzung gespeichert' : 'Lokal in diesem Browser gespeichert'}</div>
        <p>Keine Anmeldung. Kein Welt-Upload.<br />{repo.kind === 'memory' ? 'Nach dem Neuladen sind Projekte weg – bitte Sicherungen herunterladen.' : 'Browserdaten sind keine Cloudsicherung – lade regelmäßig Sicherungen herunter.'}</p></div></section>
    {repo.notice && <div className="notice warning" role="alert"><strong>Nur Sitzungsspeicher</strong><p>{repo.notice}</p></div>}
    <section className="storage-panel" aria-label="Speicher und Sicherung">
      <div><span className="panel-kicker">SPEICHER & SICHERUNG</span>
        <p className="muted">{repo.kind === 'indexeddb' ? 'IndexedDB in diesem Browser' : 'Sitzungsspeicher'}
          {storage.usage !== undefined && ` · ${mb(storage.usage)} belegt${storage.quota ? ` von ${mb(storage.quota)}` : ''}`}
          {storage.persisted !== undefined && (storage.persisted ? ' · vor Löschen geschützt' : ' · Browser darf bei Platzmangel löschen')}</p></div>
      <div className="button-row">
        {repo.kind === 'indexeddb' && storage.persisted === false && <button onClick={() => void persist()}>Dauerhaft speichern anfragen</button>}
        <button onClick={() => void backup('all')} disabled={busy || !projects}>Alles sichern</button>
        <label className="file-button">Sicherung wiederherstellen …<input ref={restoreInput} type="file" accept=".json,application/json" disabled={busy}
          onChange={e => { const f = e.target.files?.[0]; if (f) void openBackup(f); }} /></label>
      </div>
    </section>
    {restore && <section className="restore-plan" aria-label="Wiederherstellung prüfen">
      <span className="panel-kicker">WIEDERHERSTELLUNG PRÜFEN</span>
      <p className="muted">„{restore.fileName}“ vom {new Date(restore.plan.backup.createdAt).toLocaleString('de-DE')} – Prüfsummen, Versionen und Originale verifiziert. Noch wurde nichts geschrieben.</p>
      <ul>{restore.plan.projects.map(p => <li key={p.project.id}><strong>{p.project.name}</strong> · {planLabel[p.status]}
        {p.status === 'differs' && <select aria-label={`Vorgehen für ${p.project.name}`} value={restore.choices[p.project.id] ?? 'copy'}
          onChange={e => setRestore({ ...restore, choices: { ...restore.choices, [p.project.id]: e.target.value as ProjectChoice } })}>
          <option value="copy">als Kopie anlegen (lokal bleibt)</option><option value="skip">überspringen</option><option value="replace">lokale Fassung ersetzen</option></select>}</li>)}</ul>
      <ul className="muted">{buildRestore(restore.plan, restore.choices).summary.map((line, i) => <li key={i}>{line}</li>)}</ul>
      <div className="button-row"><button className="primary" onClick={() => void applyRestore()} disabled={busy}>Wiederherstellen</button><button onClick={() => setRestore(null)}>Abbrechen</button></div>
    </section>}
    <section className="card-grid" aria-label="Projekte">
      <form className="card new-card" onSubmit={e => { e.preventDefault(); createEmpty(); }}>
        <span className="panel-kicker">NEUES PROJEKT</span>
        <label>Name<input value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="z. B. Hafenviertel" /></label>
        <button className="primary" type="submit">＋ Leeres Projekt anlegen</button>
        <button className="secondary" type="button" onClick={createSample}>Beispielprojekt „Burgmauer“</button>
        <a className="text-button" href="#/betrachter">Nur eine Datei ansehen →</a>
      </form>
      {projects === null ? <p className="muted">Projekte werden geladen …</p> : projects.map(p => <article className="card" key={p.id}>
        <div className="project-icon"><Cube /></div>
        <h2><a href={href({ view: 'project', projectId: p.id, tab: 'editor' })}>{p.name}</a></h2>
        {p.description && <p className="muted">{p.description}</p>}
        <dl className="stats"><div><dt>Instanzen</dt><dd>{p.instances.length}</dd></div><div><dt>Freigegebene Revisionen</dt><dd>{p.revisions.length}</dd></div>
          <div><dt>Speicherrevision</dt><dd>{p.revision}</dd></div><div><dt>Profil</dt><dd>{p.profileId}</dd></div><div><dt>Zuletzt geändert</dt><dd>{new Date(p.updatedAt).toLocaleString('de-DE')}</dd></div></dl>
        <div className="button-row"><a className="primary" href={href({ view: 'project', projectId: p.id, tab: 'editor' })}>Öffnen</a><button onClick={() => void backup('project', p)} disabled={busy}>Sichern</button><button className="danger" onClick={() => void remove(p)}>Löschen</button></div>
      </article>)}
    </section>
    {message && <div className="notice" role="status">{message}</div>}
  </div>;
}
