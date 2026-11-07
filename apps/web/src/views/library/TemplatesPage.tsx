import { useMemo, useState } from 'react';
import { countBlocks } from '../../../../../packages/voxel/src/index.js';
import { archiveTemplate, collectionsWith, createTemplateProject, describeTemplate, duplicateTemplate, editTemplate, generatorById, itemKey, missingTemplateVersions, removeFromCollection,
  restoreTemplateSnapshot, runGenerator, templateBodyFromProject, templateFromProject, ENSEMBLES } from '../../../../../packages/domain/src/index.js';
import type { Collection, LibraryTemplate, Project, TemplateBody } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import type { Library } from '../../app/context';
import { navigate } from '../../app/router';
import type { LibraryPage } from '../../app/router';
import { formatNumber } from '../../app/ui';
import { Viewer } from '../../Viewer';
import { CollectionPicker } from './CollectionPicker';
import { TemplateThumb } from './CollectionsPage';
import { templateWorld } from './templateWorld';
import type { UserLibrary } from './userLibrary';

const size = (b: { min: readonly number[]; maxExclusive: readonly number[] }) => b.maxExclusive.map((n, i) => n - b.min[i]!).join(' × ');
const tagsFrom = (text: string) => text.split(',').map(t => t.trim()).filter(Boolean);

/** Generator route that opens a template's parameters in the workbench. */
export const generatorTemplateRoute = (t: LibraryTemplate) => t.body.kind === 'generator' ? `${t.body.source.id}!${t.id}` : '';

function originText(t: LibraryTemplate): string {
  const o = t.origin;
  if (!o) return 'eigener Entwurf';
  if (o.kind === 'project') return `aus Projekt „${o.projectName}“`;
  if (o.kind === 'ensemble') return `aus Ensemble „${ENSEMBLES.find(e => e.id === o.ensembleId)?.name ?? o.ensembleId}“`;
  if (o.kind === 'generator') return `aus Generator „${generatorById(o.generatorId)?.name ?? o.generatorId}“`;
  return 'Kopie einer Vorlage';
}

/**
 * Eigene Vorlagen (LIB-03): own ensembles (fixed versions and placements) and
 * generator settings (generator id, algorithm version, parameters). Taking a
 * template over creates an independent project; editing keeps the earlier
 * state in the history, which can be restored.
 */
export function TemplatesPage({ id, lib, projects, libHref, onMessage }: {
  id: string | undefined;
  lib: UserLibrary;
  projects: readonly Project[];
  libHref(page: LibraryPage, id?: string): string;
  onMessage(text: string): void;
}) {
  const { library } = useApp();
  const [showArchived, setShowArchived] = useState(false);
  // Baustil-Paletten (LIB-07) are templates too but have their own page.
  const template = id ? lib.templates.find(t => t.id === id && t.body.kind !== 'palette') : undefined;
  if (!lib.loaded) return <p role="status">Vorlagen werden geladen …</p>;
  if (template) return <TemplateDetail key={template.id} template={template} lib={lib} library={library} projects={projects} libHref={libHref} onMessage={onMessage} />;
  const list = lib.templates.filter(t => t.body.kind !== 'palette' && (showArchived || !t.archived)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const archived = lib.templates.filter(t => t.archived && t.body.kind !== 'palette').length;
  return <section className="templates" aria-label="Vorlagen">
    {lib.error && <div className="notice warning" role="alert">Vorlagen konnten nicht vollständig gelesen werden: {lib.error}</div>}
    {id && <div className="notice warning" role="alert">Vorlage „{id}“ gibt es nicht (mehr).</div>}
    <p className="muted section-lead">Deine eigenen Startpunkte: Ensembles mit festen Bauteilversionen und gespeicherte Generatoreinstellungen. „Als Projekt anlegen“ kopiert die Vorlage – spätere Änderungen an der Vorlage verändern keine bestehenden Projekte.</p>
    <NewFromProject lib={lib} projects={projects} onMessage={onMessage} />
    {list.length === 0 ? <div className="empty-state"><h2>Noch keine eigenen Vorlagen</h2>
      <ul className="muted"><li>Oben ein Projekt als Ensemblevorlage speichern,</li><li>auf einer <a href={libHref('ensembles')}>Ensembleseite</a> „Als eigene Vorlage speichern“ wählen,</li><li>oder im <a href={libHref('generators')}>Generator</a> die aktuellen Werte als Vorlage sichern.</li></ul></div>
      : <ul className="card-grid-auto">{list.map(t => <li key={t.id}><a className="ecard" href={libHref('templates', t.id)}>
        <TemplateThumb t={t} library={library} width={360} height={220} />
        <div className="bcard-body"><strong>{t.name}</strong>
          <span className="bcard-kicker">{t.body.kind === 'ensemble' ? 'Ensemblevorlage' : 'Generatorvorlage'} · {describeTemplate(t)} · Stand {t.number}{t.archived ? ' · archiviert' : ''}</span>
          {missingTemplateVersions(t, library.versions).length > 0 && <span className="warn-text">Feste Versionen fehlen</span>}
          {t.description && <span className="ecard-text">{t.description}</span>}</div></a></li>)}</ul>}
    {archived > 0 && <label className="check small-note"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Archivierte Vorlagen zeigen ({archived})</label>}
  </section>;
}

function NewFromProject({ lib, projects, onMessage }: { lib: UserLibrary; projects: readonly Project[]; onMessage(t: string): void }) {
  const usable = projects.filter(p => p.instances.length > 0);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = usable.find(p => p.id === projectId) ?? usable[0];
  if (!usable.length) return null;
  return <form className="tpl-new" aria-label="Vorlage aus Projekt" onSubmit={async e => {
    e.preventDefault();
    if (!chosen) return;
    let t: LibraryTemplate;
    try { t = templateFromProject(chosen, { name }); } catch (err) { onMessage(err instanceof Error ? err.message : String(err)); return; }
    setBusy(true);
    const error = await lib.write({ templates: [t] });
    setBusy(false);
    if (error) { onMessage(`Vorlage nicht gespeichert: ${error}`); return; }
    setName('');
    onMessage(`Vorlage „${t.name}“ aus „${chosen.name}“ gespeichert (${describeTemplate(t)}, Versionen festgehalten).`);
    navigate({ view: 'library', page: 'templates', id: t.id });
  }}>
    <span className="panel-kicker">PROJEKT ALS VORLAGE</span>
    <select aria-label="Projekt für Vorlage" value={chosen?.id ?? ''} onChange={e => setProjectId(e.target.value)}>
      {usable.map(p => <option key={p.id} value={p.id}>{p.name} ({p.instances.length} Bauteile)</option>)}</select>
    <input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder={chosen?.name ?? 'Name'} aria-label="Name der Vorlage" />
    <button className="primary" type="submit" disabled={busy}>Als Vorlage speichern</button>
  </form>;
}

function TemplateDetail({ template: t, lib, library, projects, libHref, onMessage }: {
  template: LibraryTemplate; lib: UserLibrary; library: Library; projects: readonly Project[]; libHref(page: LibraryPage, id?: string): string; onMessage(t: string): void;
}) {
  const { repo } = useApp();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [replaceFrom, setReplaceFrom] = useState('');
  const missing = missingTemplateVersions(t, library.versions);
  const world = useMemo(() => templateWorld(t, library.versions), [t, library.versions]);
  const generated = useMemo(() => { if (t.body.kind !== 'generator') return null; try { return runGenerator(t.body.source.id, t.body.source.params); } catch { return null; } }, [t]);
  const payload = world?.world ?? generated?.payload ?? null;
  const noSelect = useMemo(() => () => {}, []);
  const generator = t.body.kind === 'generator' ? generatorById(t.body.source.id) : undefined;
  const assetOf = (versionId: string) => library.versions.get(versionId)?.assetId;
  const write = async (next: LibraryTemplate, ok: string, collections: Collection[] = []) => {
    if (next === t && !collections.length) { onMessage('Keine Änderung.'); return true; }
    setBusy(true);
    const error = await lib.write({ templates: next === t ? [] : [next], collections });
    setBusy(false);
    onMessage(error ? `Nicht gespeichert: ${error}` : ok);
    return !error;
  };
  const run = (fn: () => LibraryTemplate, ok: string) => { try { void write(fn(), ok); } catch (e) { onMessage(e instanceof Error ? e.message : String(e)); } };
  const createProject = async () => {
    setBusy(true);
    try {
      const project = createTemplateProject(t, library.versions);
      await repo.saveProject(project, 0);
      navigate({ view: 'project', projectId: project.id, tab: 'editor' });
    } catch (e) { onMessage(`Projekt nicht angelegt: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    // Collections pointing to this template lose that entry in the same transaction; nothing else changes.
    const touched = collectionsWith(lib.collections, { kind: 'template', templateId: t.id }).map(c => removeFromCollection(c, itemKey({ kind: 'template', templateId: t.id, addedAt: '' })));
    setBusy(true);
    const error = await lib.write({ removeTemplates: [{ id: t.id, revision: t.revision }], collections: touched });
    setBusy(false);
    if (error) { onMessage(`Nicht gelöscht: ${error}`); return; }
    onMessage(`Vorlage „${t.name}“ gelöscht${touched.length ? ` und aus ${touched.length} Sammlung(en) entfernt` : ''}. Daraus angelegte Projekte bleiben unverändert.`);
    navigate({ view: 'library', page: 'templates' });
  };
  const removeMember = (memberId: string) => {
    if (t.body.kind !== 'ensemble') return;
    const body: TemplateBody = { kind: 'ensemble', members: t.body.members.filter(m => m.id !== memberId), links: t.body.links.filter(l => l.a.instanceId !== memberId && l.b.instanceId !== memberId) };
    run(() => editTemplate(t, { body }), 'Bauteil aus der Vorlage entfernt (früherer Stand im Verlauf).');
  };

  return <article className="building-detail tpl-detail" aria-label={`Vorlage ${t.name}`}>
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('browse')}>Bibliothek</a><span aria-hidden="true">›</span><a href={libHref('templates')}>Vorlagen</a><span aria-hidden="true">›</span><span aria-current="page">{t.name}</span></nav>
    <div className="detail-hero">
      <div className="viewport detail-stage">
        {payload ? <Viewer key={`${t.id}-${t.number}`} payload={payload} cells={payload.cells} onSelect={noSelect} />
          : <div className="scene empty-scene"><p>{missing.length ? `${missing.length} feste Version(en) fehlen im Speicher – Vorschau und Projektübernahme sind gesperrt.` : t.body.kind === 'generator' && !generator ? `Generator „${t.body.source.id}“ gibt es in dieser App-Version nicht.` : 'Vorschau nicht verfügbar.'}</p></div>}
      </div>
      <div className="detail-summary">
        <span className="panel-kicker">{t.body.kind === 'ensemble' ? 'ENSEMBLEVORLAGE' : 'GENERATORVORLAGE'} · STAND {t.number}</span>
        <h1 className="detail-title">{t.name}</h1>
        <div className="chips">{t.archived && <span className="tag">archiviert</span>}{t.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div>
        {t.description && <p className="detail-lead">{t.description}</p>}
        <p className="small-note">{describeTemplate(t)} · {originText(t)} · angelegt {new Date(t.createdAt).toLocaleDateString('de-DE')}, geändert {new Date(t.updatedAt).toLocaleString('de-DE')}</p>
        {world?.world && <dl className="stat-tiles">
          <div><dt>Fläche</dt><dd>{size(world.world.bounds)}</dd></div>
          <div><dt>Blöcke</dt><dd>{formatNumber(countBlocks(world.world).blocks)}</dd></div>
          <div><dt>Überschneidungen</dt><dd>{world.conflicts.length ? <span className="warn-text">{world.conflicts.length}</span> : <span className="ok-text">keine</span>}</dd></div></dl>}
        {t.body.kind === 'generator' && generator && generator.version !== t.body.source.version && <p className="notice warning">Gespeichert mit „{generator.name}“ v{t.body.source.version}, aktuell ist v{generator.version}: dieselben Werte können ein anderes Bauwerk ergeben.</p>}
        {missing.length > 0 && <div className="notice warning" role="alert">Feste Versionen fehlen: {missing.join(', ')}. Bitte eine Sicherung mit diesen Bauteilen wiederherstellen; die Vorlage bleibt unverändert.</div>}
        <div className="button-row">
          {t.body.kind === 'ensemble'
            ? <button className="primary" disabled={busy || missing.length > 0} onClick={() => void createProject()}>Als Projekt anlegen</button>
            : <a className={`primary button-link${generator ? '' : ' disabled'}`} href={generator ? libHref('generators', generatorTemplateRoute(t)) : undefined}>Im Generator öffnen</a>}
          <button type="button" disabled={busy} onClick={() => run(() => duplicateTemplate(t), `Kopie von „${t.name}“ angelegt.`)}>Duplizieren</button>
        </div>
        <p className="small-note">{t.body.kind === 'ensemble' ? 'Legt ein neues Projekt mit genau diesen Bauteilversionen und Positionen an. Spätere Änderungen an der Vorlage ändern das Projekt nicht.' : 'Öffnet den Generator mit diesen Werten. Gespeichert wird dort wie gewohnt als Bauteil oder neue Version.'}</p>
        <CollectionPicker lib={lib} item={{ kind: 'template', templateId: t.id }} label={t.name} collectionHref={cid => libHref('collections', cid)} onMessage={onMessage} />
      </div>
    </div>

    {t.body.kind === 'ensemble' && <section className="sheet-card" aria-label="Bauteile der Vorlage"><h2 className="section-title">Bauteile ({t.body.members.length})</h2>
      <ul className="tpl-members">{t.body.members.map(m => { const v = library.versions.get(m.assetVersionId), aid = assetOf(m.assetVersionId); return <li key={m.id}>
        {aid ? <a href={libHref('building', aid)}><strong>{m.name}</strong></a> : <strong>{m.name}</strong>}
        <span>{v ? `v${v.label}` : <span className="warn-text">Version fehlt</span>} · x {m.transform.position[0]} · y {m.transform.position[1]} · z {m.transform.position[2]}{m.transform.quarterTurns ? ` · ${m.transform.quarterTurns * 90}°` : ''}{m.transform.mirrorX ? ' · gespiegelt' : ''}{m.override ? ' · Vorrang' : ''}</span>
        {t.body.kind === 'ensemble' && t.body.members.length > 1 && <button type="button" className="text-button" disabled={busy} onClick={() => removeMember(m.id)}>entfernen</button>}</li>; })}</ul>
      {projects.some(p => p.instances.length) && <form className="tpl-replace" onSubmit={e => { e.preventDefault(); const p = projects.find(x => x.id === replaceFrom); if (p) run(() => editTemplate(t, { body: templateBodyFromProject(p) }), `Inhalt aus „${p.name}“ übernommen (Stand ${t.number + 1}; der bisherige Stand bleibt im Verlauf).`); }}>
        <label>Inhalt aus Projekt übernehmen<select value={replaceFrom} onChange={e => setReplaceFrom(e.target.value)} aria-label="Projekt als neuer Inhalt">
          <option value="">– Projekt wählen –</option>{projects.filter(p => p.instances.length).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <button type="submit" disabled={busy || !replaceFrom}>Übernehmen</button>
        <p className="small-note">So bearbeitest du eine Vorlage: als Projekt anlegen, im Editor ändern, hier übernehmen.</p>
      </form>}
    </section>}
    {t.body.kind === 'generator' && <section className="sheet-card" aria-label="Parameter"><h2 className="section-title">Parameter</h2>
      <dl className="tpl-params">{Object.entries(t.body.source.params).map(([k, v]) => <div key={k}><dt>{generator?.params.find(p => p.key === k)?.label ?? k}</dt><dd>{String(v)}</dd></div>)}</dl></section>}

    <section className="sheet-card" aria-label="Vorlage bearbeiten"><h2 className="section-title">Angaben</h2>
      <form className="tpl-edit" onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget);
        run(() => editTemplate(t, { name: String(d.get('name') ?? ''), description: String(d.get('description') ?? ''), tags: tagsFrom(String(d.get('tags') ?? '')) }), 'Vorlage gespeichert (früherer Stand im Verlauf).'); }}>
        <label>Name<input name="name" required maxLength={120} defaultValue={t.name} key={`n${t.number}`} /></label>
        <label>Beschreibung<textarea name="description" rows={2} maxLength={2000} defaultValue={t.description} key={`d${t.number}`} /></label>
        <label>Tags (Komma-getrennt)<input name="tags" defaultValue={t.tags.join(', ')} key={`t${t.number}`} /></label>
        <div className="button-row"><button className="primary" type="submit" disabled={busy}>Speichern</button>
          <button type="button" disabled={busy} onClick={() => run(() => archiveTemplate(t, !t.archived), t.archived ? 'Vorlage aus dem Archiv geholt.' : 'Vorlage archiviert (ausgeblendet, nichts gelöscht).')}>{t.archived ? 'Aus Archiv holen' : 'Archivieren'}</button>
          {t.archived && (!confirmDelete ? <button type="button" className="text-button" disabled={busy} onClick={() => setConfirmDelete(true)}>Löschen …</button>
            : <><button type="button" className="danger" disabled={busy} onClick={() => void remove()}>Endgültig löschen</button><button type="button" className="text-button" onClick={() => setConfirmDelete(false)}>Abbrechen</button></>)}
        </div>
        {!t.archived && <p className="small-note">Löschen ist nach dem Archivieren möglich. Projekte, die aus der Vorlage entstanden sind, bleiben immer erhalten.</p>}
      </form>
    </section>

    <section className="sheet-card" aria-label="Verlauf"><h2 className="section-title">Verlauf</h2>
      {t.history.length === 0 ? <p className="muted">Noch keine früheren Stände. Jede Änderung legt den vorherigen Stand hier ab (bis zu 20).</p>
        : <ol className="tpl-history" reversed>{[...t.history].reverse().map(s => <li key={s.number}>
          <strong>Stand {s.number}</strong> · {s.name} · {describeTemplate(s)} · {new Date(s.savedAt).toLocaleString('de-DE')}
          <button type="button" disabled={busy} onClick={() => run(() => restoreTemplateSnapshot(t, s.number), `Stand ${s.number} wiederhergestellt (als Stand ${t.number + 1}).`)}>Wiederherstellen</button></li>)}</ol>}
    </section>
  </article>;
}
