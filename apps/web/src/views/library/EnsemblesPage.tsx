import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { countBlocks } from '../../../../../packages/voxel/src/index.js';
import { createEnsembleProject, groupFacts, missingMembers, profileLabel, resolveProject, ENSEMBLES } from '../../../../../packages/domain/src/index.js';
import type { AssetVersion, CatalogEntry, Ensemble, GroupFacts } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import { Viewer } from '../../Viewer';
import { Thumb } from '../../thumbnail/Thumb';

const size = (b: { min: readonly number[]; maxExclusive: readonly number[] }) => b.maxExclusive.map((n, i) => n - b.min[i]!).join(' × ');

/** World of the project an ensemble would create; null when members are missing or the layout does not resolve. */
function ensembleWorld(ensemble: Ensemble, byAsset: ReadonlyMap<string, AssetVersion>, names: ReadonlyMap<string, string>, versions: ReadonlyMap<string, AssetVersion>) {
  if (missingMembers(ensemble, byAsset).length) return null;
  try { return resolveProject(createEnsembleProject(ensemble, byAsset, names), versions); } catch { return null; }
}

/**
 * Ensembles: shipped buildings as a ready layout. Overview as cards with a
 * preview of the whole layout, detail with the 3D view and "Als Projekt anlegen".
 */
/** Vergleichswerte einer Gruppe wie auf jeder Gebäudekarte (LIB-07). */
export function GroupFactsView({ facts }: { facts: GroupFacts }) {
  return <>
    <dl className="bcard-facts" aria-label="Vergleichswerte">
      <div title="Umfassendes Rechteck der Aufstellung, Breite × Tiefe"><dt>Grundfläche</dt><dd>{facts.size[0]}×{facts.size[2]}</dd></div>
      <div><dt>Höhe</dt><dd>{facts.size[1]}</dd></div>
      <div title={`Summe aller Gebäude, ${facts.shulkerBoxes} Shulkerkisten`}><dt>Material</dt><dd>{formatNumber(facts.items)} Items</dd></div>
      <div title={facts.effort.formula}><dt>Survival</dt><dd className={`effort effort-${facts.effort.level}`}>{facts.effort.label}</dd></div>
    </dl>
    <span className="bcard-badges">
      <span className="badge profile" title={facts.mods.length ? `braucht ${facts.mods.join(', ')}` : 'nur Vanilla-Blöcke'}>{facts.profiles.map(profileLabel).join(', ')}{facts.mods.length ? ` + ${facts.mods.length} Mods` : ''}</span>
      <span className={`badge check check-${facts.checked === facts.members ? 'spiel' : facts.checked ? 'neu' : 'offen'}`} title="Gebäude, deren genauer Stand auf dem Spielprüfstand im echten Server unverändert blieb">{facts.checked === facts.members ? `✓ alle ${facts.members} im Spiel geprüft` : `${facts.checked} von ${facts.members} im Spiel geprüft`}</span>
    </span></>;
}

export function EnsemblesPage({ id, byAsset, names, versions, libHref, onCreate, onSaveTemplate, collections, entryOf }: {
  id: string | undefined;
  /** Katalogeintrag eines Gebäudes, für die Vergleichswerte der Gruppe. */
  entryOf?(assetId: string): CatalogEntry | undefined;
  byAsset: ReadonlyMap<string, AssetVersion>;
  names: ReadonlyMap<string, string>;
  versions: ReadonlyMap<string, AssetVersion>;
  libHref(page: 'browse' | 'building' | 'ensembles', id?: string): string;
  onCreate(ensemble: Ensemble): void;
  /** Copies the ensemble into an own template with today's versions pinned (LIB-03). */
  onSaveTemplate?(ensemble: Ensemble): void;
  /** "In Sammlung" control (LIB-02). */
  collections?(ensemble: Ensemble): ReactNode;
}) {
  const ensemble = id ? ENSEMBLES.find(e => e.id === id) : undefined;
  const world = useMemo(() => ensemble ? ensembleWorld(ensemble, byAsset, names, versions) : null, [ensemble, byAsset, names, versions]);
  const noSelect = useMemo(() => () => {}, []);
  if (!ensemble) return <section className="ensembles" aria-label="Ensembles">
    {id && <div className="notice warning" role="alert">Ensemble „{id}“ gibt es nicht.</div>}
    <p className="muted section-lead">Fertig abgestimmte Gruppen aus mitgelieferten Gebäuden – als Ganzes ansehen und mit einem Klick als Projekt anlegen.</p>
    <ul className="card-grid-auto">{ENSEMBLES.map(e => <li key={e.id}><a className="ecard" href={libHref('ensembles', e.id)}>
      <Thumb cacheKey={`ens:${e.id}:${e.members.map(mb => byAsset.get(mb.assetId)?.id ?? '-').join(',')}`}
        payload={() => ensembleWorld(e, byAsset, names, versions)?.world ?? null} alt={`Vorschau ${e.name}`} width={360} height={220} />
      <div className="bcard-body"><strong>{e.name}</strong><span className="bcard-kicker">{e.members.length} Gebäude · {e.tags.join(' · ')}</span>
        <span className="ecard-text">{e.description}</span>
        {(() => { const f = entryOf && groupFacts(e.members, entryOf); return f ? <GroupFactsView facts={f} /> : null; })()}</div></a></li>)}</ul>
  </section>;

  const missing = missingMembers(ensemble, byAsset);
  return <section className="building-detail" aria-label="Ensembles">
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('browse')}>Bibliothek</a><span aria-hidden="true">›</span><a href={libHref('ensembles')}>Ensembles</a><span aria-hidden="true">›</span><span aria-current="page">{ensemble.name}</span></nav>
    <div className="detail-hero">
      <div className="viewport detail-stage">
        {world?.world ? <Viewer key={ensemble.id} payload={world.world} cells={world.world.cells} onSelect={noSelect} />
          : <div className="scene empty-scene"><p>{missing.length ? `Bauteile fehlen in der Bibliothek: ${missing.join(', ')}` : 'Vorschau nicht verfügbar.'}</p></div>}
      </div>
      <div className="detail-summary ensemble-sheet">
        <span className="panel-kicker">ENSEMBLE</span><h2 className="detail-title">{ensemble.name}</h2>
        <p className="detail-lead">{ensemble.description}</p>
        {(() => { const f = entryOf && groupFacts(ensemble.members, entryOf); return f ? <GroupFactsView facts={f} /> : null; })()}
        {world && <dl className="stat-tiles">
          <div><dt>Fläche</dt><dd>{world.world ? size(world.world.bounds) : '–'}</dd></div>
          <div><dt>Blöcke</dt><dd>{world.world ? formatNumber(countBlocks(world.world).blocks) : '–'}</dd></div>
          <div><dt>Überschneidungen</dt><dd>{world.conflicts.length ? <span className="warn-text">{world.conflicts.length}</span> : <span className="ok-text">keine</span>}</dd></div></dl>}
        <div className="button-row"><button className="primary" disabled={missing.length > 0} onClick={() => onCreate(ensemble)}>Als Projekt anlegen</button>
          {onSaveTemplate && <button type="button" disabled={missing.length > 0} onClick={() => onSaveTemplate(ensemble)}>Als eigene Vorlage speichern</button>}</div>
        <p className="small-note">Legt ein neues Projekt mit je einer Instanz pro Gebäude an. Materialliste, Bauanleitung und Export funktionieren dort wie gewohnt. Eine eigene Vorlage hält die heutigen Bauteilversionen fest und lässt sich danach bearbeiten.</p>
        {collections?.(ensemble)}
        <span className="panel-kicker">GEBÄUDE</span>
        <ul className="member-list">{ensemble.members.map((mb, i) => { const v = byAsset.get(mb.assetId); return <li key={`${mb.assetId}-${i}`}><a href={libHref('building', mb.assetId)}>
          {v && <Thumb cacheKey={v.id} payload={() => v.payload} alt="" width={64} height={44} className="thumb mini" />}
          <strong>{names.get(mb.assetId) ?? mb.assetId}</strong><span>x {mb.at[0]} · z {mb.at[1]}{mb.turns ? ` · ${mb.turns * 90}° gedreht` : ''}</span></a></li>; })}</ul>
      </div>
    </div>
  </section>;
}
