import { useMemo, useState } from 'react';
import { applyPalette, archiveTemplate, assetIdsIn, collectionTree, createTemplate, editTemplate, flattenTree, materialSet, PALETTE_ROLE_KIND, PALETTE_ROLE_LABEL, PALETTE_ROLES,
  paletteProblems } from '../../../../../packages/domain/src/index.js';
import type { CatalogEntry, PaletteRole, PaletteRoles, PaletteResult } from '../../../../../packages/domain/src/index.js';
import { MATERIAL_SETS, SCOPED_MATERIAL_SETS } from '../../../../../packages/domain/src/materials/variants.js';
import { useApp } from '../../app/context';
import type { LibraryPage } from '../../app/router';
import { errorText, formatNumber } from '../../app/ui';
import { Thumb } from '../../thumbnail/Thumb';
import { paletteChoices, variantAsset } from './paletteVariants';
import type { PaletteChoice } from './paletteVariants';
import type { UserLibrary } from './userLibrary';

const MAX_PREVIEW = 24;
const setsOfKind = (role: PaletteRole) => [...MATERIAL_SETS, ...SCOPED_MATERIAL_SETS].filter(s => s.kind === PALETTE_ROLE_KIND[role]);
const label = (id: string | undefined) => (id && materialSet(id)?.label) || '–';

/**
 * Baustil-Paletten (LIB-07, #/bibliothek/paletten): mitgelieferte und eigene Paletten, je
 * Rolle ein Materialsatz. Eine Palette lässt sich auf Merkliste, Vergleich oder eine eigene
 * Sammlung legen; jedes Gebäude wird dann als Materialvariante im selben Stil gespeichert.
 * Eigene Paletten sind Vorlagen (Art "palette"): mit Verlauf, in Sicherungen enthalten.
 */
export function PalettesPage({ id, lib, entries, favorites, compare, libHref, onMessage }: {
  id: string | undefined;
  lib: UserLibrary;
  entries: readonly CatalogEntry[];
  favorites: readonly string[];
  compare: readonly string[];
  libHref(page: LibraryPage, id?: string): string;
  onMessage(text: string): void;
}) {
  const choices = useMemo(() => paletteChoices(lib.templates), [lib.templates]);
  const selected = id ? choices.find(c => c.id === id) : undefined;
  if (id && !selected && !lib.loaded) return <p role="status">Paletten werden geladen …</p>;
  return <section className="palettes" aria-label="Baustil-Paletten">
    {lib.error && <div className="notice warning" role="alert">Eigene Paletten konnten nicht vollständig gelesen werden: {lib.error}</div>}
    {id && !selected && <div className="notice warning" role="alert">Palette „{id}“ gibt es nicht (mehr).</div>}
    <p className="muted section-lead">Eine Baustil-Palette legt fest, welches Holz, welcher Stein, welche Farbe und welches Glas ein ganzer Stil verwendet. Dieselbe Palette macht aus jedem Gebäude eine passende Materialvariante – so sehen alle Häuser einer Siedlung zusammengehörig aus. Form und Ausrichtung jedes Blocks bleiben exakt.</p>
    <ul className="palette-grid" aria-label="Paletten">{choices.map(c => <li key={c.id}>
      <a className={`palette-card${c.id === selected?.id ? ' on' : ''}`} href={libHref('palettes', c.id)} aria-current={c.id === selected?.id ? 'true' : undefined}>
        <strong>{c.name}</strong>{c.own && <span className="badge">eigene</span>}
        <span className="palette-roles">{PALETTE_ROLES.filter(r => c.roles[r]).map(r => <span key={r} title={PALETTE_ROLE_LABEL[r]}>{label(c.roles[r])}</span>)}</span>
        <small>{c.description}</small></a></li>)}</ul>
    {selected ? <PaletteDetail key={`${selected.id}:${selected.own?.number ?? 0}`} palette={selected} lib={lib} entries={entries} favorites={favorites} compare={compare} libHref={libHref} onMessage={onMessage} />
      : <p className="muted">Eine Palette wählen, um sie anzusehen, als eigene zu kopieren oder auf mehrere Gebäude anzuwenden. Eigene Paletten entstehen auch auf jeder Gebäudeseite unter „Materialvariante erzeugen“.</p>}
  </section>;
}

function PaletteDetail({ palette, lib, entries, favorites, compare, libHref, onMessage }: {
  palette: PaletteChoice; lib: UserLibrary; entries: readonly CatalogEntry[]; favorites: readonly string[]; compare: readonly string[];
  libHref(page: LibraryPage, id?: string): string; onMessage(text: string): void;
}) {
  const { repo, reloadLibrary } = useApp();
  const [roles, setRoles] = useState<PaletteRoles>(palette.roles);
  const [name, setName] = useState(palette.own ? palette.name : `${palette.name} (eigene)`);
  const [description, setDescription] = useState(palette.description);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const problems = paletteProblems(roles);
  const changed = JSON.stringify(roles) !== JSON.stringify(palette.roles) || (!!palette.own && (name !== palette.name || description !== palette.description));

  const save = async () => {
    setBusy(true); setError('');
    try {
      const body = { kind: 'palette' as const, roles };
      const t = palette.own ? editTemplate(palette.own, { name, description, body }) : createTemplate({ name, description, body });
      const err = await lib.write({ templates: [t] });
      if (err) setError(err);
      else { onMessage(palette.own ? `Palette „${t.name}“ gespeichert (Stand ${t.number}).` : `Eigene Palette „${t.name}“ angelegt.`); if (!palette.own) location.assign(libHref('palettes', t.id)); }
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const archive = async () => {
    if (!palette.own) return;
    const err = await lib.write({ templates: [archiveTemplate(palette.own, true)] });
    if (err) setError(err); else { onMessage(`Palette „${palette.name}“ archiviert.`); location.assign(libHref('palettes')); }
  };

  // Apply to a group of buildings.
  const collections = useMemo(() => flattenTree(collectionTree(lib.collections.filter(c => !c.archived))), [lib.collections]);
  const [source, setSource] = useState(favorites.length ? 'merkliste' : compare.length ? 'vergleich' : collections[0] ? `sammlung:${collections[0].collection.id}` : 'merkliste');
  const ids = useMemo(() => {
    if (source === 'merkliste') return new Set(favorites);
    if (source === 'vergleich') return new Set(compare);
    return assetIdsIn(lib.collections, source.slice('sammlung:'.length));
  }, [source, favorites, compare, lib.collections]);
  const targets = entries.filter(e => ids.has(e.asset.id) && !e.asset.archived);
  const shown = targets.slice(0, MAX_PREVIEW);
  const rolesKey = JSON.stringify(roles);
  const results = useMemo(() => {
    const out = new Map<string, PaletteResult | null | string>();
    if (problems.length) return out;
    for (const e of targets) { try { out.set(e.asset.id, applyPalette(e.version.payload, roles)); } catch (err) { out.set(e.asset.id, errorText(err)); } }
    return out;
  }, [rolesKey, targets.map(e => e.version.id).join(',')]);
  const ready = targets.filter(e => { const r = results.get(e.asset.id); return r && typeof r !== 'string'; });

  const applyAll = async () => {
    setBusy(true); setError('');
    try {
      const made = [];
      for (const e of ready) {
        const r = results.get(e.asset.id) as PaletteResult;
        made.push(await variantAsset(e.asset, e.version, r.payload, r.swaps, { name: `${e.asset.name} (${name.trim() || palette.name})`, family: e.family, palette: name.trim() || palette.name }));
      }
      await repo.applyBatch({ assets: made.map(m => m.asset), versions: made.map(m => m.version) });
      await reloadLibrary();
      onMessage(`${made.length} Materialvarianten im Stil „${name.trim() || palette.name}“ gespeichert. Sie stehen in der Bibliothek bei ihren Ausgangsgebäuden.`);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return <div className="palette-detail">
    <section className="sheet-card" aria-label="Rollen der Palette">
      <h2 className="section-title">{palette.own ? 'Eigene Palette bearbeiten' : `${palette.name} – als eigene Palette anpassen`}</h2>
      <div className="palette-meta">
        <label>Name<input value={name} maxLength={120} onChange={e => setName(e.target.value)} aria-label="Name der Palette" /></label>
        <label>Beschreibung<input value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} aria-label="Beschreibung der Palette" /></label>
      </div>
      <table className="swap-table"><thead><tr><th scope="col">Rolle</th><th scope="col">Materialsatz</th></tr></thead>
        <tbody>{PALETTE_ROLES.map(r => <tr key={r}><th scope="row">{PALETTE_ROLE_LABEL[r]}</th><td>
          <select aria-label={`${PALETTE_ROLE_LABEL[r]} der Palette`} value={roles[r] ?? ''} onChange={e => setRoles(old => { const next: Partial<Record<PaletteRole, string>> = { ...old }; if (e.target.value) next[r] = e.target.value; else delete next[r]; return next; })}>
            <option value="">– unverändert lassen –</option>
            {setsOfKind(r).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></td></tr>)}</tbody></table>
      {problems.length > 0 && <p className="field-error" role="alert">{problems.join('; ')}</p>}
      <div className="button-row">
        <button type="button" className="primary" disabled={busy || problems.length > 0 || !name.trim() || (!!palette.own && !changed) || !lib.loaded} onClick={() => void save()}>{palette.own ? 'Änderungen speichern' : 'Als eigene Palette speichern'}</button>
        {palette.own && <button type="button" disabled={busy} onClick={() => void archive()}>Archivieren</button>}
      </div>
      <p className="small-note">Zuordnung im Gebäude: das häufigste Holz und der häufigste Stein werden zu den Hauptrollen, die zweithäufigsten zu den Akzenten; Farbe, Glas, Beton und Terrakotta je der häufigste Satz. Leere Rollen bleiben im Gebäude, wie sie sind.</p>
    </section>
    <section className="sheet-card" aria-label="Palette anwenden">
      <h2 className="section-title">Auf mehrere Gebäude anwenden</h2>
      <label>Gebäude aus<select aria-label="Gebäude für die Palette" value={source} onChange={e => setSource(e.target.value)}>
        <option value="merkliste">Merkliste ({favorites.length})</option>
        <option value="vergleich">Vergleich ({compare.length})</option>
        {collections.map(n => <option key={n.collection.id} value={`sammlung:${n.collection.id}`}>{'  '.repeat(n.depth)}Sammlung: {n.collection.name}</option>)}</select></label>
      {targets.length === 0 ? <p className="muted">Hier sind noch keine Gebäude. In der <a href={libHref('browse')}>Bibliothek</a> Gebäude merken (♡), zum Vergleich legen (⇄) oder in eine Sammlung aufnehmen.</p> : <>
        <ul className="palette-preview">{shown.map(e => { const r = results.get(e.asset.id); return <li key={e.asset.id}>
          <figure><Thumb cacheKey={e.version.id} payload={() => e.version.payload} alt={`${e.asset.name} vorher`} width={150} height={104} /><figcaption>vorher</figcaption></figure>
          {r && typeof r !== 'string' ? <figure><Thumb cacheKey={`${e.version.id}>pal:${rolesKey}`} payload={() => r.payload} alt={`${e.asset.name} im Stil ${name || palette.name}`} width={150} height={104} /><figcaption>nachher</figcaption></figure>
            : <div className="palette-none">{typeof r === 'string' ? r : 'passt schon, kein Tausch nötig'}</div>}
          <div><strong>{e.asset.name}</strong>
            {r && typeof r !== 'string' && <small>{formatNumber(r.replaced)} Blöcke getauscht{r.unresolved.length ? ` · ${r.unresolved.reduce((n, u) => n + u.count, 0)} bleiben (Form fehlt)` : ''}{r.skipped.length ? ` · ${r.skipped.length} Tausch ausgelassen (Blockinhalt)` : ''}</small>}</div>
        </li>; })}</ul>
        {targets.length > shown.length && <p className="small-note">Vorschau zeigt {shown.length} von {targets.length}; gespeichert werden alle.</p>}
        <div className="button-row"><button type="button" className="primary" disabled={busy || !ready.length || problems.length > 0} onClick={() => void applyAll()}>{ready.length} Varianten im Stil „{name.trim() || palette.name}“ speichern</button></div>
        <p className="small-note">Jede Variante ist ein neues Bauteil mit Verweis auf ihr Ausgangsgebäude; die Originale bleiben unverändert.</p>
      </>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  </div>;
}
