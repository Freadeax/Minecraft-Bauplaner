import { useState } from 'react';
import { BLOCK_CLASS_LABEL, FACETS, MATERIAL_GROUP_LABEL, SIZE_CLASS_LABEL, facetLabel } from '../../../../../packages/domain/src/index.js';
import type { BuildingFacets, CatalogEntry, MaterialGroup, Similar, Suggestion } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import { stateColor } from '../../colors';
import { FacetFields, facetsFromForm } from './FacetFields';

const GROUP_COLOR: Readonly<Record<MaterialGroup, string>> = {
  holz: '#b58452', stein: '#a3a6a8', glas: '#bfe3ea', beton: '#e0e0dc', wolle: '#d46a6a', natur: '#6d9b45', licht: '#ffd166',
  funktion: '#8a6340', metall: '#8e9ca9', fluessig: '#3f76e4', schnee: '#eef6fb', sonstiges: '#6c7a86',
};
const pct = (share: number): string => `${Math.round(share * 100)} %`;
const short = (id: string): string => id.replace(/^minecraft:/, '').replace(/_/g, ' ');
const stars = (level: number): string => '★'.repeat(level) + '☆'.repeat(5 - level);

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div title={hint}><dt>{label}</dt><dd>{children}</dd></div>;
}

/**
 * Steckbrief eines Gebäudes: declared Angaben and computed Kennwerte in
 * separate, labelled sections. Heuristics carry their formula as tooltip and
 * in a details block.
 */
export function BuildingSheet({ entry, suggestion, projectName, similar, onSelect, onAdd, onSaveFacets, adding }: {
  entry: CatalogEntry;
  suggestion?: Suggestion | undefined;
  projectName?: string | undefined;
  similar: readonly Similar[];
  onSelect(assetId: string): void;
  onAdd?: (() => void) | undefined;
  adding?: boolean;
  onSaveFacets?: ((facets: BuildingFacets, tags: string[]) => void) | undefined;
}) {
  const { asset, metrics: m, facets } = entry;
  const [editing, setEditing] = useState(false);
  const declared = FACETS.filter(f => facets[f.key].length);
  return <div className="building-sheet">
    <span className="panel-kicker">STECKBRIEF</span><h2>{asset.name}</h2>
    <div className="chips sheet-badges">
      {asset.demo && <span className="tag">Synthetisches Beispiel</span>}
      {facets.kategorie.map(k => <span key={k} className="tag">{facetLabel('kategorie', k)}</span>)}
      <span className="tag" title="berechnet">{stars(m.difficulty.level)} {m.difficulty.label}</span>
    </div>
    {asset.description && <p className="muted">{asset.description}</p>}

    {suggestion && projectName !== undefined && <section className="sheet-section match" aria-label="Passung zum Projekt">
      <h3>Passung zu „{projectName}“ <b>{suggestion.score}</b><small>/100</small></h3>
      <ul className="reason-list">{suggestion.reasons.map(r => <li key={r.label} className={r.points < 0 ? 'minus' : ''}><span>{r.label}</span><b>{r.points > 0 ? '+' : ''}{r.points}</b></li>)}
        {suggestion.reasons.length === 0 && <li><span>Keine Gemeinsamkeiten gefunden</span><b>0</b></li>}</ul>
      {suggestion.notes.map(n => <p key={n} className="small-note">{n}</p>)}
      {onAdd && <button className="primary" disabled={adding} onClick={onAdd}>＋ Ins Projekt übernehmen</button>}
    </section>}

    <section className="sheet-section" aria-label="Angaben">
      <h3>Angaben <span className="badge source">Angabe</span></h3>
      {editing && onSaveFacets ? <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget);
        onSaveFacets(facetsFromForm(f), String(f.get('tags') ?? '').split(',').map(t => t.trim()).filter(Boolean)); setEditing(false); }}>
        <FacetFields initial={facets} />
        <label>Weitere Tags (Komma-getrennt)<input name="tags" defaultValue={entry.tags.join(', ')} /></label>
        <div className="button-row"><button className="primary" type="submit">Angaben speichern</button><button type="button" onClick={() => setEditing(false)}>Abbrechen</button></div>
      </form> : <>
        <dl className="stats">{declared.map(f => <Row key={f.key} label={f.label}>{facets[f.key].map(v => facetLabel(f.key, v)).join(', ')}</Row>)}
          {entry.tags.length > 0 && <Row label="Tags">{entry.tags.join(', ')}</Row>}</dl>
        {declared.length === 0 && <p className="small-note">Keine Angaben hinterlegt. Kategorie, Stil, Biom und Funktion helfen bei Filtern und Vorschlägen.</p>}
        {onSaveFacets && <button type="button" onClick={() => setEditing(true)}>Angaben bearbeiten</button>}
        {!onSaveFacets && asset.demo && <p className="small-note">Angaben der mitgelieferten Vorschläge sind schreibgeschützt.</p>}
      </>}
    </section>

    <section className="sheet-section" aria-label="Kennwerte">
      <h3>Kennwerte <span className="badge ok">berechnet</span></h3>
      <dl className="stats">
        <Row label="Abmessungen (B × H × T)">{m.size.join(' × ')}</Row>
        <Row label="Grundfläche">{formatNumber(m.footprint)} m² · {SIZE_CLASS_LABEL[m.sizeClass].split(' (')[0]}</Row>
        <Row label="Umbauter Raum">{formatNumber(m.volume)} Zellen · Füllgrad {pct(m.fillRatio)}</Row>
        <Row label="Blöcke">{formatNumber(m.blocks)} · Umfang {BLOCK_CLASS_LABEL[m.blockClass].split(' (')[0]}</Row>
        <Row label="Freizuräumen (Luft)" hint="Explizite Luftzellen: dort muss Gelände entfernt werden">{formatNumber(m.air)}</Row>
        <Row label="Schichten">{m.layers}</Row>
        <Row label="Blocktypen / Zustände">{m.distinctBlocks} / {m.distinctStates}</Row>
        <Row label="Schwierigkeit" hint="Heuristik, siehe Faktoren">{m.difficulty.level} · {m.difficulty.label}</Row>
        <Row label="Bauzeit" hint={m.buildTime.assumptions}>≈ {m.buildTime.minutes} min <small>(Schätzung)</small></Row>
      </dl>
      <details><summary>Wie Schwierigkeit und Bauzeit entstehen</summary>
        <ul className="reason-list">{m.difficulty.factors.map(f => <li key={f.label}><span>{f.label}</span><b>+{f.points}</b></li>)}
          {m.difficulty.factors.length === 0 && <li><span>keine erschwerenden Faktoren</span><b>0</b></li>}</ul>
        <p className="small-note">Stufe = 1 + ⌊Punkte / 2⌋, höchstens 5. {m.buildTime.assumptions}</p></details>
    </section>

    <section className="sheet-section" aria-label="Materialien">
      <h3>Materialien <span className="badge ok">berechnet</span></h3>
      <div className="group-bar" role="img" aria-label={m.groups.map(g => `${MATERIAL_GROUP_LABEL[g.group]} ${pct(g.share)}`).join(', ')}>
        {m.groups.map(g => <span key={g.group} style={{ flexGrow: g.count, background: GROUP_COLOR[g.group] }} title={`${MATERIAL_GROUP_LABEL[g.group]}: ${formatNumber(g.count)} (${pct(g.share)})`} />)}</div>
      <ul className="group-legend">{m.groups.map(g => <li key={g.group}><i style={{ background: GROUP_COLOR[g.group] }} />{MATERIAL_GROUP_LABEL[g.group]} <b>{pct(g.share)}</b></li>)}</ul>
      <ul className="block-top">{m.topBlocks.map(b => <li key={b.id}><i style={{ background: stateColor(b.id) }} /><span>{short(b.id)}</span><b>{formatNumber(b.count)}</b><small>{pct(b.share)}</small></li>)}</ul>
      <dl className="stats">
        <Row label="Bauitems">{formatNumber(m.items.total)} in {m.items.lines} Sorten</Row>
        <Row label="Inventarplätze / Shulkerkisten">{formatNumber(m.items.slots)} / {m.items.shulkerBoxes}</Row>
        <Row label="Materialliste">{m.items.complete ? <span className="ok-text">vollständig</span>
          : <span className="warn-text">unvollständig{m.items.assumed ? ` · ${m.items.assumed} Annahme(n)` : ''}{m.items.unresolved ? ` · ${m.items.unresolved} ungelöste Zellen` : ''}</span>}</Row>
      </dl>
      <p className="small-note">Gruppen nach Namensregeln, Items nach dem Vanilla-Katalog der Materialliste. Rohstoffe und Rezepte werden nicht abgeleitet.</p>
    </section>

    <section className="sheet-section" aria-label="Ausstattung">
      <h3>Ausstattung <span className="badge ok">gezählt</span></h3>
      <dl className="stats">
        <Row label="Schlafplätze (Betten)">{m.beds}</Row>
        <Row label="Türen">{m.doors}</Row>
        <Row label="Glasflächen">{formatNumber(m.windows)} Blöcke</Row>
        <Row label="Lichtquellen" hint="Summe der Lichtstufen; keine Lichtsimulation">{m.lightSources}{m.lightSources ? ` · Σ Stufe ${m.lightSum}` : ''}</Row>
        <Row label="Lagerplätze">{formatNumber(m.storageSlots)} Slots</Row>
        <Row label="Arbeitsblöcke">{m.workstations.length ? m.workstations.map(w => `${w.profession}${w.count > 1 ? ` ×${w.count}` : ''}`).join(', ') : 'keine'}</Row>
      </dl>
    </section>

    <section className="sheet-section" aria-label="Bauen und Technik">
      <h3>Bauen &amp; Technik <span className="badge ok">berechnet</span></h3>
      <dl className="stats">
        <Row label="Bauphasen" hint="Zuordnung wie in der Bauanleitung">Struktur {m.phases.structure} · Schwerkraft {m.phases.gravity} · angebracht {m.phases.attached} · Flüssig {m.phases.liquid}</Row>
        <Row label="Ausgerichtete Blöcke">{formatNumber(m.oriented)} ({pct(m.blocks ? m.oriented / m.blocks : 0)})</Row>
        <Row label="Drehen / Spiegeln" hint="Zustandskatalog B7">{m.transform.rotatable ? 'drehbar' : 'Drehen ungelöst'} · {m.transform.mirrorable ? 'spiegelbar' : 'Spiegeln ungelöst'}</Row>
        <Row label="Anschlüsse">{m.connectors.length ? m.connectors.map(c => `${c.id} (${c.type})`).join(', ') : 'keine'}</Row>
        <Row label="Profil">{m.profileId}</Row>
        <Row label="Gespeichert in" hint="DataVersion aus der importierten Datei">{m.dataVersion !== undefined ? `DataVersion ${m.dataVersion}` : 'unbekannt (kein Dateiimport)'}</Row>
        <Row label="Mods">{m.modNamespaces.length ? m.modNamespaces.join(', ') : 'keine, nur Vanilla-Namensraum'}</Row>
        {m.blockEntities > 0 && <Row label="BlockEntities">{m.blockEntities}</Row>}
      </dl>
      {m.transform.unresolvedStates.length > 0 && <p className="small-note">Ungelöste Zustände bei Transformation: {m.transform.unresolvedStates.map(short).join(', ')}</p>}
    </section>

    {similar.length > 0 && <section className="sheet-section" aria-label="Ähnliche Gebäude">
      <h3>Ähnliche Gebäude</h3>
      <ul className="similar-list">{similar.map(s => <li key={s.entry.asset.id}><button onClick={() => onSelect(s.entry.asset.id)}>
        <strong>{s.entry.asset.name}</strong><span>{s.reasons.join(' · ') || 'ähnliche Größe'}</span><b>{s.score}</b></button></li>)}</ul>
    </section>}
  </div>;
}
