import { useMemo, useState } from 'react';
import { ancestorsOf, collectionCategories, collectionDeletion, collectionTree, createCollection, flattenTree, groupByCategory, moveCollection, moveCollectionItem, moveProblem,
  pinItemVersion, removeFromCollection, resolveCollection, runGenerator, setItemNote, updateCollection, ENSEMBLES } from '../../../../../packages/domain/src/index.js';
import type { AssetVersion, Collection, CollectionNode, LibraryTemplate, ResolvedItem } from '../../../../../packages/domain/src/index.js';
import type { Library } from '../../app/context';
import type { LibraryPage } from '../../app/router';
import { Thumb } from '../../thumbnail/Thumb';
import { ensembleWorld, templateThumbKey, templateWorld } from './templateWorld';
import type { UserLibrary } from './userLibrary';

const STATE_LABEL: Record<ResolvedItem['state'], string> = { ok: '', missing: 'fehlt in der Bibliothek', 'version-missing': 'festgehaltene Version fehlt', archived: 'archiviert' };
const KIND_LABEL: Record<ResolvedItem['item']['kind'], string> = { asset: 'Gebäude', ensemble: 'Ensemble', template: 'Vorlage' };

/** Preview of an item: its version, the ensemble layout or the template's world. */
export function ItemThumb({ r, library, byAsset, names, width = 240, height = 150 }: {
  r: ResolvedItem; library: Library; byAsset: ReadonlyMap<string, AssetVersion>; names: ReadonlyMap<string, string>; width?: number; height?: number;
}) {
  if (r.version) { const v = r.version; return <Thumb cacheKey={v.id} payload={() => v.payload} alt="" width={width} height={height} />; }
  if (r.ensemble) { const e = r.ensemble; return <Thumb cacheKey={`ens:${e.id}:${e.members.map(mb => byAsset.get(mb.assetId)?.id ?? '-').join(',')}`} payload={() => ensembleWorld(e, byAsset, names, library.versions)?.world ?? null} alt="" width={width} height={height} />; }
  if (r.template) return <TemplateThumb t={r.template} library={library} width={width} height={height} />;
  return <div className="thumb thumb-missing" style={{ aspectRatio: `${width} / ${height}` }} aria-hidden="true">?</div>;
}

export function TemplateThumb({ t, library, width = 240, height = 150 }: { t: LibraryTemplate; library: Library; width?: number; height?: number }) {
  return <Thumb cacheKey={templateThumbKey(t)} alt="" width={width} height={height}
    payload={() => { if (t.body.kind === 'ensemble') return templateWorld(t, library.versions)?.world ?? null; if (t.body.kind === 'palette') return null; try { return runGenerator(t.body.source.id, t.body.source.params).payload; } catch { return null; } }} />;
}

function TreeList({ nodes, current, href }: { nodes: readonly CollectionNode[]; current: string | undefined; href(id: string): string }) {
  return <ul className="col-tree">{nodes.map(n => <li key={n.collection.id}>
    <a href={href(n.collection.id)} aria-current={n.collection.id === current ? 'page' : undefined}>
      <span className="col-name">{n.children.length ? '🗂' : '📁'} {n.collection.name}</span><small>{n.totalItems}</small></a>
    {n.children.length > 0 && <TreeList nodes={n.children} current={current} href={href} />}</li>)}</ul>;
}

/**
 * Eigene Sammlungen (LIB-02): folders with sub-folders and own categories that
 * reference catalogue entries, ensembles and templates. The catalogue stays
 * the one library; a collection never copies geometry. Missing references stay
 * visible with a reason instead of disappearing.
 */
export function CollectionsPage({ id, lib, library, byAsset, names, libHref, browseHref, onMessage }: {
  id: string | undefined;
  lib: UserLibrary;
  library: Library;
  byAsset: ReadonlyMap<string, AssetVersion>;
  names: ReadonlyMap<string, string>;
  libHref(page: LibraryPage, id?: string): string;
  /** Catalogue overview filtered to this collection. */
  browseHref(collectionId: string): string;
  onMessage(text: string): void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const tree = useMemo(() => collectionTree(lib.collections, { includeArchived: showArchived }), [lib.collections, showArchived]);
  const groups = groupByCategory(tree);
  const categories = collectionCategories(lib.collections);
  const collection = id ? lib.collections.find(c => c.id === id) : undefined;
  const href = (cid: string) => libHref('collections', cid);
  const archivedCount = lib.collections.filter(c => c.archived).length;

  const aside = <aside className="col-aside" aria-label="Sammlungsordner">
    <a className={`col-all${!id ? ' current' : ''}`} href={libHref('collections')}>Alle Sammlungen <small>{lib.collections.filter(c => !c.archived).length}</small></a>
    {groups.map(g => <div key={g.category || '-'} className="col-group"><h3>{g.category || 'Ohne Kategorie'}</h3><TreeList nodes={g.nodes} current={id} href={href} /></div>)}
    {archivedCount > 0 && <label className="check small-note"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Archivierte zeigen ({archivedCount})</label>}
    <NewCollectionForm lib={lib} categories={categories} parent={collection ?? null} onMessage={onMessage} href={href} />
  </aside>;

  if (!lib.loaded) return <section className="col-layout" aria-label="Sammlungen"><p role="status">Sammlungen werden geladen …</p></section>;
  return <section className="col-layout" aria-label="Sammlungen">
    {aside}
    <div className="col-main">
      {lib.error && <div className="notice warning" role="alert">Sammlungen konnten nicht vollständig gelesen werden: {lib.error}</div>}
      {id && !collection && <div className="notice warning" role="alert">Sammlung „{id}“ gibt es nicht (mehr). <a href={libHref('collections')}>Zur Übersicht</a></div>}
      {collection ? <CollectionDetail key={collection.id} collection={collection} lib={lib} library={library} byAsset={byAsset} names={names} libHref={libHref} browseHref={browseHref} categories={categories} onMessage={onMessage} />
        : <Overview tree={tree} lib={lib} library={library} byAsset={byAsset} names={names} href={href} />}
    </div>
  </section>;
}

function Overview({ tree, lib, library, byAsset, names, href }: { tree: readonly CollectionNode[]; lib: UserLibrary; library: Library; byAsset: ReadonlyMap<string, AssetVersion>; names: ReadonlyMap<string, string>; href(id: string): string }) {
  if (!tree.length) return <div className="empty-state col-empty">
    <h2>Noch keine eigenen Sammlungen</h2>
    <p className="muted">Sammlungen sind deine Ordner in der Bibliothek: z. B. „Survival-Basis“, „Ideen fürs Dorf“ oder „Redstone geprüft“. Sie verweisen auf Gebäude, Ensembles und eigene Vorlagen, ohne etwas zu kopieren.</p>
    <ol className="muted"><li>Links eine Sammlung anlegen (optional mit Kategorie und Oberordner).</li><li>Auf einer Gebäude-, Ensemble- oder Vorlagenseite „📁 In Sammlung“ wählen.</li><li>Im Katalog über den Filter „Sammlung“ nur diese Einträge zeigen.</li></ol>
  </div>;
  return <>
    <p className="muted section-lead">Deine Ordner in der Bibliothek. Einträge verweisen auf Gebäude, Ensembles und Vorlagen; Projekte und Bauteile bleiben unverändert.</p>
    <ul className="card-grid-auto col-cards">{flattenTree(tree).filter(n => n.depth === 0).map(n => {
      const resolved = resolveCollection(n.collection, { assets: library.assets, versions: library.versions, templates: lib.templates, ensembles: ENSEMBLES }).slice(0, 4);
      return <li key={n.collection.id}><a className="ecard col-card" href={href(n.collection.id)}>
        <div className="col-mosaic">{resolved.length ? resolved.map(r => <ItemThumb key={r.key} r={r} library={library} byAsset={byAsset} names={names} width={180} height={110} />) : <span className="muted">leer</span>}</div>
        <div className="bcard-body"><strong>{n.collection.name}</strong>
          <span className="bcard-kicker">{n.totalItems} Einträge{n.children.length ? ` · ${n.children.length} Unterordner` : ''}{n.collection.category ? ` · ${n.collection.category}` : ''}{n.collection.archived ? ' · archiviert' : ''}</span>
          {n.collection.description && <span className="ecard-text">{n.collection.description}</span>}</div></a></li>;
    })}</ul>
  </>;
}

function NewCollectionForm({ lib, categories, parent, onMessage, href }: { lib: UserLibrary; categories: readonly string[]; parent: Collection | null; onMessage(t: string): void; href(id: string): string }) {
  const [busy, setBusy] = useState(false);
  const [inside, setInside] = useState(false);
  const parentProblem = parent ? moveProblem(lib.collections, '', parent.id) : null;
  return <form className="col-new" aria-label="Neue Sammlung" onSubmit={async e => {
    e.preventDefault();
    const form = e.currentTarget, data = new FormData(form);
    let c: Collection;
    try { c = createCollection({ name: String(data.get('name') ?? ''), category: String(data.get('category') ?? ''), parentId: inside && parent && !parentProblem ? parent.id : null }); }
    catch (err) { onMessage(err instanceof Error ? err.message : String(err)); return; }
    setBusy(true);
    const error = await lib.write({ collections: [c] });
    setBusy(false);
    if (error) { onMessage(`Sammlung nicht angelegt: ${error}`); return; }
    form.reset(); setInside(false);
    onMessage(`Sammlung „${c.name}“ angelegt.`);
    window.location.hash = href(c.id);
  }}>
    <h3>Neue Sammlung</h3>
    <label>Name<input name="name" required maxLength={120} placeholder="z. B. Ideen fürs Dorf" /></label>
    <label>Kategorie<input name="category" maxLength={60} list="col-categories" placeholder="optional, z. B. Survival" /></label>
    <datalist id="col-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
    {parent && <label className="check"><input type="checkbox" checked={inside} disabled={!!parentProblem} onChange={e => setInside(e.target.checked)} /> als Unterordner von „{parent.name}“{parentProblem ? ` (${parentProblem})` : ''}</label>}
    <button className="primary" type="submit" disabled={busy}>Anlegen</button>
  </form>;
}

function CollectionDetail({ collection, lib, library, byAsset, names, libHref, browseHref, categories, onMessage }: {
  collection: Collection; lib: UserLibrary; library: Library; byAsset: ReadonlyMap<string, AssetVersion>; names: ReadonlyMap<string, string>;
  libHref(page: LibraryPage, id?: string): string; browseHref(id: string): string; categories: readonly string[]; onMessage(t: string): void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const resolved = resolveCollection(collection, { assets: library.assets, versions: library.versions, templates: lib.templates, ensembles: ENSEMBLES });
  const crumbs = ancestorsOf(lib.collections, collection.id).reverse();
  const children = lib.collections.filter(c => c.parentId === collection.id && c.id !== collection.id).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const options = flattenTree(collectionTree(lib.collections, { includeArchived: true })).filter(n => n.collection.id !== collection.id);
  const assetCount = resolved.filter(r => r.item.kind === 'asset').length;
  const save = async (next: Collection | Collection[], ok: string) => {
    setBusy(true);
    const error = await lib.write({ collections: Array.isArray(next) ? next : [next] });
    setBusy(false);
    onMessage(error ? `Nicht gespeichert: ${error}` : ok);
    return !error;
  };
  const run = (fn: () => Collection, ok: string) => { try { void save(fn(), ok); } catch (e) { onMessage(e instanceof Error ? e.message : String(e)); } };
  const remove = async () => {
    const { children: moved } = collectionDeletion(lib.collections, collection.id);
    setBusy(true);
    const error = await lib.write({ removeCollections: [{ id: collection.id, revision: collection.revision }], collections: [...moved] });
    setBusy(false);
    if (error) { onMessage(`Nicht gelöscht: ${error}`); return; }
    onMessage(`Sammlung „${collection.name}“ gelöscht${moved.length ? `; ${moved.length} Unterordner eine Ebene nach oben verschoben` : ''}. Gebäude, Vorlagen und Projekte bleiben unverändert.`);
    window.location.hash = collection.parentId ? libHref('collections', collection.parentId) : libHref('collections');
  };

  return <article className="col-detail" aria-label={`Sammlung ${collection.name}`}>
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('collections')}>Sammlungen</a>
      {crumbs.map(c => <span key={c.id}><span aria-hidden="true"> › </span><a href={libHref('collections', c.id)}>{c.name}</a></span>)}
      <span aria-hidden="true"> › </span><span aria-current="page">{collection.name}</span></nav>
    <header className="col-head">
      <div><span className="panel-kicker">SAMMLUNG{collection.category ? ` · ${collection.category.toUpperCase()}` : ''}</span>
        <h2 className="detail-title">{collection.name}{collection.archived && <span className="tag"> archiviert</span>}</h2>
        {collection.description && <p className="detail-lead">{collection.description}</p>}
        <p className="small-note">{resolved.length} Einträge · geändert {new Date(collection.updatedAt).toLocaleString('de-DE')}</p></div>
      {assetCount > 0 && <a className="button-link" href={browseHref(collection.id)}>Im Katalog filtern →</a>}
    </header>

    {children.length > 0 && <section aria-label="Unterordner"><h3 className="section-title">Unterordner</h3>
      <ul className="chips">{children.map(c => <li key={c.id}><a className="chip-link" href={libHref('collections', c.id)}>🗂 {c.name}</a></li>)}</ul></section>}

    {resolved.length === 0 ? <div className="empty-state"><p>Diese Sammlung ist leer.</p>
      <p className="muted">Öffne ein Gebäude, ein Ensemble oder eine Vorlage und wähle „📁 In Sammlung“. <a href={libHref('browse')}>Zum Katalog</a> · <a href={libHref('ensembles')}>Ensembles</a> · <a href={libHref('templates')}>Vorlagen</a></p></div>
      : <ol className="col-items" aria-label="Einträge">{resolved.map((r, i) => {
        const target = r.item.kind === 'asset' ? libHref('building', r.item.assetId) : r.item.kind === 'ensemble' ? libHref('ensembles', r.item.ensembleId) : libHref('templates', r.item.templateId);
        return <li key={r.key} className={`col-item state-${r.state}`}>
          <a className="col-item-thumb" href={r.state === 'missing' ? undefined : target}><ItemThumb r={r} library={library} byAsset={byAsset} names={names} /></a>
          <div className="col-item-body">
            <span className="bcard-kicker">{KIND_LABEL[r.item.kind]}{r.state !== 'ok' ? <span className="warn-text"> · {STATE_LABEL[r.state]}</span> : ''}{r.outdated ? ' · neuere Version vorhanden' : ''}</span>
            {r.state === 'missing' ? <strong>{r.label}</strong> : <a href={target}><strong>{r.label}</strong></a>}
            {r.item.kind === 'asset' && r.asset && <label className="col-pin">Version
              <select value={r.item.versionId ?? ''} disabled={busy} aria-label={`Version für ${r.asset.name}`}
                onChange={e => run(() => pinItemVersion(collection, r.key, e.target.value || null, r.asset!), e.target.value ? 'Version festgehalten.' : 'Folgt wieder der neuesten Version.')}>
                <option value="">immer neueste</option>
                {[...r.asset.versionIds].reverse().map(vid => <option key={vid} value={vid}>festhalten: v{library.versions.get(vid)?.label ?? '?'}</option>)}
                {r.item.versionId && !r.asset.versionIds.includes(r.item.versionId) && <option value={r.item.versionId}>fehlende Version</option>}
              </select></label>}
            <NoteField note={r.item.note ?? ''} disabled={busy} onSave={note => run(() => setItemNote(collection, r.key, note), 'Notiz gespeichert.')} />
            <div className="col-item-actions">
              <button type="button" disabled={busy || i === 0} aria-label={`${r.label} nach oben`} onClick={() => run(() => moveCollectionItem(collection, r.key, -1), 'Reihenfolge gespeichert.')}>↑</button>
              <button type="button" disabled={busy || i === resolved.length - 1} aria-label={`${r.label} nach unten`} onClick={() => run(() => moveCollectionItem(collection, r.key, 1), 'Reihenfolge gespeichert.')}>↓</button>
              <button type="button" className="text-button" disabled={busy} onClick={() => run(() => removeFromCollection(collection, r.key), `„${r.label}“ aus der Sammlung entfernt (das Original bleibt erhalten).`)}>Entfernen</button>
            </div>
          </div></li>;
      })}</ol>}

    <details className="col-edit"><summary>Sammlung bearbeiten</summary>
      <form onSubmit={e => {
        e.preventDefault();
        const d = new FormData(e.currentTarget), parentId = String(d.get('parent') ?? '') || null;
        run(() => moveCollection(lib.collections, updateCollection(collection, { name: String(d.get('name') ?? ''), description: String(d.get('description') ?? ''), category: String(d.get('category') ?? '') }), parentId), 'Sammlung gespeichert.');
      }}>
        <label>Name<input name="name" required maxLength={120} defaultValue={collection.name} /></label>
        <label>Beschreibung<textarea name="description" rows={2} maxLength={2000} defaultValue={collection.description} /></label>
        <label>Kategorie<input name="category" maxLength={60} list="col-categories-edit" defaultValue={collection.category} /></label>
        <datalist id="col-categories-edit">{categories.map(c => <option key={c} value={c} />)}</datalist>
        <label>Liegt in<select name="parent" defaultValue={collection.parentId ?? ''}>
          <option value="">– oberste Ebene –</option>
          {options.map(n => { const problem = moveProblem(lib.collections, collection.id, n.collection.id); return <option key={n.collection.id} value={n.collection.id} disabled={!!problem} title={problem ?? undefined}>{'  '.repeat(n.depth)}{n.collection.name}</option>; })}
        </select></label>
        <div className="button-row"><button className="primary" type="submit" disabled={busy}>Speichern</button>
          <button type="button" disabled={busy} onClick={() => run(() => updateCollection(collection, { archived: !collection.archived }), collection.archived ? 'Sammlung aus dem Archiv geholt.' : 'Sammlung archiviert (ausgeblendet, nichts gelöscht).')}>{collection.archived ? 'Aus Archiv holen' : 'Archivieren'}</button>
          {!confirmDelete ? <button type="button" className="text-button" disabled={busy} onClick={() => setConfirmDelete(true)}>Löschen …</button>
            : <><button type="button" className="danger" disabled={busy} onClick={() => void remove()}>Endgültig löschen</button><button type="button" className="text-button" onClick={() => setConfirmDelete(false)}>Abbrechen</button></>}
        </div>
        {confirmDelete && <p className="small-note">Löscht nur den Ordner mit seinen Verweisen. Unterordner rücken eine Ebene nach oben; Gebäude, Vorlagen und Projekte bleiben erhalten.</p>}
      </form>
    </details>
  </article>;
}

function NoteField({ note, disabled, onSave }: { note: string; disabled: boolean; onSave(note: string): void }) {
  const [value, setValue] = useState(note);
  return <form className="col-note" onSubmit={e => { e.preventDefault(); onSave(value); }}>
    <input value={value} maxLength={300} disabled={disabled} placeholder="Notiz …" aria-label="Notiz" onChange={e => setValue(e.target.value)} />
    {value !== note && <button type="submit" disabled={disabled}>Speichern</button>}
  </form>;
}
