import { useState } from 'react';
import { addToCollection, collectionsWith, collectionTree, createCollection, flattenTree, itemKey, removeFromCollection } from '../../../../../packages/domain/src/index.js';
import type { Collection } from '../../../../../packages/domain/src/index.js';
import type { UserLibrary } from './userLibrary';

export type CollectionRef = { kind: 'asset'; assetId: string } | { kind: 'ensemble'; ensembleId: string } | { kind: 'template'; templateId: string };

const matches = (c: Collection, ref: CollectionRef) => collectionsWith([c], ref).length > 0;
/** Removes every item of the reference (all pinned versions of an asset). */
function withoutRef(c: Collection, ref: CollectionRef): Collection {
  let next = c;
  for (const i of c.items) if (collectionsWith([{ ...c, items: [i] }], ref).length) next = removeFromCollection(next, itemKey(i));
  return next;
}

/**
 * "In Sammlung": toggles a building, ensemble or template in the own
 * collections (LIB-02) and creates a new collection on the spot. Adding an
 * asset references it without a version pin (it follows the newest version);
 * pinning a version is done on the collection page.
 */
export function CollectionPicker({ lib, item, label, collectionHref, onMessage }: {
  lib: UserLibrary;
  item: CollectionRef;
  label: string;
  collectionHref(id: string): string;
  onMessage(text: string): void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const nodes = flattenTree(collectionTree(lib.collections));
  const inside = lib.collections.filter(c => !c.archived && matches(c, item));
  const toggle = async (c: Collection) => {
    setBusy(true);
    const on = matches(c, item);
    const next = on ? withoutRef(c, item) : addToCollection(c, item);
    const error = await lib.write({ collections: [next] });
    setBusy(false);
    onMessage(error ? `Sammlung nicht geändert: ${error}` : on ? `„${label}“ aus „${c.name}“ entfernt.` : `„${label}“ zu „${c.name}“ hinzugefügt.`);
  };
  const create = async () => {
    let c: Collection;
    try { c = addToCollection(createCollection({ name }), item); } catch (e) { onMessage(e instanceof Error ? e.message : String(e)); return; }
    setBusy(true);
    const error = await lib.write({ collections: [c] });
    setBusy(false);
    if (!error) setName('');
    onMessage(error ? `Sammlung nicht angelegt: ${error}` : `Sammlung „${c.name}“ angelegt, „${label}“ ist darin.`);
  };
  return <details className="collection-picker">
    <summary>📁 In Sammlung{inside.length ? ` (${inside.length})` : ''}</summary>
    <div className="collection-picker-body">
      {lib.error && <p className="warn-text" role="alert">{lib.error}</p>}
      {nodes.length === 0 && <p className="small-note">Noch keine eigenen Sammlungen. Lege die erste hier an.</p>}
      {nodes.length > 0 && <ul className="picker-list" aria-label="Sammlungen">{nodes.map(n => <li key={n.collection.id} style={{ paddingInlineStart: `${n.depth * 14}px` }}>
        <label className="check"><input type="checkbox" disabled={busy} checked={matches(n.collection, item)} onChange={() => void toggle(n.collection)} /> {n.collection.name}</label>
        <a className="picker-open" href={collectionHref(n.collection.id)} aria-label={`Sammlung ${n.collection.name} öffnen`}>↗</a></li>)}</ul>}
      <form className="picker-new" onSubmit={e => { e.preventDefault(); void create(); }}>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="Neue Sammlung …" aria-label="Name der neuen Sammlung" />
        <button type="submit" disabled={busy || !name.trim()}>Anlegen</button>
      </form>
    </div>
  </details>;
}
