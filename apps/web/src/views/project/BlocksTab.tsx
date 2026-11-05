import { useRef, useState } from 'react';
import { commitProjectEdit, planProjectEdit } from '../../../../../packages/domain/src/index.js';
import type { CommitWarning, Resolution } from '../../../../../packages/domain/src/index.js';
import type { Vec3 } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { errorText } from '../../app/ui';
import { BlockEditor } from '../../editor/BlockEditor';
import type { DraftModel } from '../../editor/useDraft';
import '../../editor/editor.css';
import { isResolved } from './session';
import type { ProjectSession } from './session';

/**
 * Projekt-Reiter „Blöcke“ (EDIT-02): edits the whole resolved project world.
 * On save every touched instance gets a new version of its own module (with
 * the instance rotation undone exactly) and new blocks in empty space go to a
 * chosen instance or a new "Eigene Blöcke" module. One undo step in the project.
 */
export function BlocksTab({ session }: { session: ProjectSession }) {
  const { project } = session;
  const [result, setResult] = useState<Notice | null>(null);
  // A different placement (other tab, undo) starts a fresh draft on the new world.
  const signature = project.instances.map(i => `${i.id}:${i.assetVersionId}:${i.transform.position.join(',')}:${i.transform.quarterTurns}:${i.transform.mirrorX}`).join('|');
  // While the project is recalculated with the same placement (e.g. a renamed instance from the team),
  // keep editing on the last world instead of unmounting the editor and losing the draft.
  const last = useRef<{ signature: string; resolution: Resolution } | null>(null);
  let resolution = session.resolution;
  if (isResolved(resolution)) last.current = { signature, resolution };
  else if (session.computationState === 'pending' && last.current?.signature === signature) resolution = last.current.resolution;
  if (!isResolved(resolution)) return <div className="notice warning" role="alert">Das Projekt lässt sich nicht zusammensetzen: {resolution.error}</div>;
  return <>
    {result && <div className={`notice ${result.error ? 'warning' : 'success'}`} role={result.error ? 'alert' : 'status'}>
      <p>{result.text}</p>{result.warnings.length > 0 && <ul>{result.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>}</div>}
    <ProjectBlocks key={signature} session={session} resolution={resolution} setResult={setResult} />
  </>;
}

type Notice = { text: string; warnings: readonly CommitWarning[]; error?: boolean };

function ProjectBlocks({ session, resolution, setResult }: { session: ProjectSession; resolution: Resolution; setResult: (n: Notice | null) => void }) {
  const { repo, library, reloadLibrary } = useApp();
  const { project } = session;
  const [loose, setLoose] = useState<string>('new');
  const [name, setName] = useState(`Eigene Blöcke · ${project.name}`.slice(0, 120));
  const [busy, setBusy] = useState(false);

  const save = async (model: DraftModel) => {
    setBusy(true); setResult(null);
    try {
      const c = await commitProjectEdit(project, resolution, library.assets, model.draft, { loose, newName: name });
      if (!c.operation) { setResult({ text: 'Keine Änderung zu speichern.', warnings: [] }); return; }
      await repo.applyBatch({ assets: c.assets, versions: c.versions });
      // The new versions are stored from here on: report later problems as such, not as a failed save.
      try { await reloadLibrary(); } catch (e) { setResult({ text: `Bauteilversionen gespeichert, aber die Bibliothek ließ sich nicht neu laden (${errorText(e)}). Bitte die Seite neu laden, bevor du erneut speicherst.`, warnings: c.warnings, error: true }); return; }
      const err = session.execute(c.operation);
      if (err) { setResult({ text: `Bauteilversionen gespeichert, aber das Projekt wurde nicht umgestellt: ${err} Nicht erneut speichern, sondern zuerst neu laden.`, warnings: c.warnings, error: true }); return; }
      setResult({ text: `Gespeichert: ${c.versions.length} neue Bauteilversion(en). Ein Schritt „Blöcke bearbeitet“ ist im Projekt rückgängig machbar (Editor-Reiter, Strg+Z).`, warnings: c.warnings });
    } catch (e) { setResult({ text: errorText(e), warnings: [], error: true }); } finally { setBusy(false); }
  };

  const saveBar = (model: DraftModel) => {
    let plan: ReturnType<typeof planProjectEdit> | null = null, planError = '';
    try { if (model.draft.overlay.size) plan = planProjectEdit(resolution, model.draft, { loose }); } catch (e) { planError = errorText(e); }
    return <div className="save-bar">
      <label className="inline">Neue Blöcke in leerer Fläche →<select value={loose} onChange={e => setLoose(e.target.value)} aria-label="Ziel für neue Blöcke">
        <option value="new">neues Bauteil</option>
        {project.instances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select></label>
      {loose === 'new' && <input value={name} onChange={e => setName(e.target.value)} maxLength={120} aria-label="Name des neuen Bauteils" />}
      <span className="muted" title={planError}>{plan ? `${plan.perInstance.length} Bauteil(e) betroffen${plan.loose.length ? ` · ${plan.loose.length} neue Zellen` : ''}` : planError}</span>
      <button className="primary" disabled={busy || !plan || !!planError} onClick={() => void save(model)}>Im Projekt speichern</button>
    </div>;
  };

  const owners = (p: Vec3) => {
    const ids = resolution.owners.get(`${p[0]},${p[1]},${p[2]}`) ?? [];
    return <p className="muted small">{ids.length ? <>Gehört zu: {ids.map(id => project.instances.find(i => i.id === id)?.name ?? id).join(', ')}</> : 'Leere Fläche: neue Blöcke gehen ins gewählte Ziel.'}</p>;
  };

  return <section className="project-blocks" aria-label="Blöcke bearbeiten">
    <p className="muted">Bearbeite die Blöcke des ganzen Projekts. Beim Speichern bekommt jedes betroffene Bauteil eine <b>neue Version</b> (die alte bleibt in der Bibliothek), gedrehte Instanzen werden exakt zurückgerechnet.</p>
    {resolution.conflicts.length > 0 && <p className="notice warning">Das Projekt hat {resolution.conflicts.length} ungeklärte Voxelkonflikte. Eine Änderung an einer Konfliktzelle wird in alle beteiligten Bauteile geschrieben und löst den Konflikt so auf.</p>}
    <BlockEditor base={resolution.world} profileId={project.profileId} saveBar={saveBar} inspectExtra={owners} />
  </section>;
}
