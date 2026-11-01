import { useMemo } from 'react';
import { BUILD_THEMES, selectBuildTheme } from '../../../../../packages/domain/src/buildThemes.js';
import { FACETS, facetLabel } from '../../../../../packages/domain/src/catalog.js';
import type { CatalogEntry } from '../../../../../packages/domain/src/catalog.js';
import { Thumb } from '../../thumbnail/Thumb';
import { formatNumber } from '../../app/ui';
import { buildThemeSearch } from './buildThemeLinks';
import './buildThemes.css';

/** Themed browsing of real current library entries; creating projects remains an explicit catalogue action. */
export function BuildThemesPage({ entries, browseHref, buildingHref }: {
  entries: readonly CatalogEntry[];
  browseHref(search: string): string;
  buildingHref(id: string): string;
}) {
  const themes = useMemo(() => BUILD_THEMES.map(theme => selectBuildTheme(entries, theme)), [entries]);
  return <section className="build-themes" aria-labelledby="build-themes-title">
    <div className="build-themes-intro"><div><span className="panel-kicker">DEINE NÄCHSTE BAUWELT</span>
      <h2 id="build-themes-title">Aus einzelnen Bauten wird ein Ort.</h2>
      <p>Wähle eine Richtung, entdecke passende Gebäude und entwickle daraus dein eigenes Projekt. Die Vorschauen kommen direkt aus deiner aktuellen Bibliothek.</p></div>
      <aside>Die Zuordnung folgt den Stil- und Kategorieangaben der Bauteile. Jede Bauvariante zählt als eigener Treffer; die Themen sind frei kombinierbare Bauideen.</aside></div>
    <nav className="build-themes-jump" aria-label="Bauwelten auswählen">{themes.map(({ theme, count }) => <button type="button" key={theme.id}
      onClick={() => document.getElementById(`bauwelt-${theme.id}`)?.scrollIntoView({ block: 'start' })}>
      {theme.name}<span>{formatNumber(count)}</span></button>)}</nav>
    <div className="build-themes-grid">{themes.map(({ theme, count, previews }, index) => <article key={theme.id} id={`bauwelt-${theme.id}`} className="build-theme-card">
      <header><span className="build-theme-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><span className="panel-kicker">{theme.eyebrow}</span><h3>{theme.name}</h3></div></header>
      <p className="build-theme-description">{theme.description}</p>
      <div className="build-theme-facets" aria-label="Verwendete Filter">{FACETS.flatMap(facet => (theme.facets[facet.key] ?? []).map(value => <span key={`${facet.key}:${value}`}>{facet.label}: {facetLabel(facet.key, value)}</span>))}</div>
      {previews.length ? <ul className="build-theme-previews">{previews.map(entry => <li key={entry.asset.id}><a href={buildingHref(entry.asset.id)}>
        <Thumb cacheKey={entry.version.id} payload={() => entry.version.payload} alt={`Vorschau ${entry.asset.name}`} width={240} height={150} />
        <strong>{entry.asset.name}</strong><small>{entry.metrics.size.join(' × ')} Blöcke</small>
      </a></li>)}</ul> : <p className="build-theme-empty">Noch keine passenden Bauteile in deiner Bibliothek. Importiere eigene Bauten und ergänze die gezeigten Angaben.</p>}
      <details className="build-theme-tasks"><summary>Drei Ideen für deinen Aufbau</summary><ol>{theme.tasks.map(task => <li key={task}>{task}</li>)}</ol></details>
      <a className="secondary button-link build-theme-browse" href={browseHref(buildThemeSearch(theme, FACETS.map(facet => facet.key)))}>
        {formatNumber(count)} Treffer im Katalog ansehen <span aria-hidden="true">↗</span></a>
    </article>)}</div>
    <p className="build-themes-note">Keine Spiel- oder Versionsfreigabe: Materialien, Gelände, Exporte und technische Funktionen prüfst du im jeweiligen Projekt. Die Aufbauideen sind Vorschläge und verändern keine gespeicherten Bauteile.</p>
  </section>;
}
