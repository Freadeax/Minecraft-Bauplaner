import { facetLabel, STAGE_LABEL } from '../../../../../packages/domain/src/index.js';
import type { CatalogEntry } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import { Thumb } from '../../thumbnail/Thumb';

export const stars = (level: number): string => '★'.repeat(level) + '☆'.repeat(5 - level);

/**
 * Catalogue card: isometric preview, name, declared category/style and the
 * computed key figures. The whole card opens the detail page; Merken and
 * Vergleichen are separate buttons so they never trigger navigation.
 */
export function BuildingCard({ entry, href, score, variants, favorite, comparing, onFavorite, onCompare }: {
  entry: CatalogEntry;
  href: string;
  score?: number | undefined;
  variants?: number | undefined;
  favorite: boolean;
  comparing: boolean;
  onFavorite(): void;
  onCompare(): void;
}) {
  const { asset, metrics: m, facets } = entry;
  const kicker = [...facets.kategorie.map(k => facetLabel('kategorie', k)), ...facets.stil.map(v => facetLabel('stil', v))].join(' · ') || 'ohne Angaben';
  return <article className={`bcard${asset.archived ? ' archived' : ''}`}>
    <a className="bcard-open" href={href} aria-label={`${asset.name} öffnen`}>
      <div className="bcard-media">
        <Thumb cacheKey={entry.version.id} payload={() => entry.version.payload} alt={`Vorschau ${asset.name}`} />
        <span className={`stage stage-${m.progression.stage} bcard-stage`}>{STAGE_LABEL[m.progression.stage]}</span>
        {score !== undefined && <em className="score" title="Passung zum Projekt (0–100)">{score}</em>}
        {variants !== undefined && variants > 1 && <em className="variants" title="Weitere Varianten auf der Detailseite">+{variants - 1} Varianten</em>}
      </div>
      <div className="bcard-body">
        <strong>{asset.name}</strong>
        <span className="bcard-kicker">{kicker}{asset.demo ? '' : ' · eigenes Bauteil'}{asset.archived ? ' · archiviert' : ''}</span>
        <span className="bcard-facts">
          <span title="Breite × Höhe × Tiefe">{m.size.join('×')}</span>
          <span>{formatNumber(m.blocks)} Blöcke</span>
          <span className="stars" aria-label={`Schwierigkeit ${m.difficulty.level} von 5`}>{stars(m.difficulty.level)}</span>
          <span title="Schätzung">≈ {m.buildTime.minutes} min</span>
        </span>
      </div>
    </a>
    <div className="bcard-actions">
      <button type="button" className={`icon-button${favorite ? ' on' : ''}`} aria-pressed={favorite} aria-label={`${asset.name} merken`} title={favorite ? 'Von der Merkliste nehmen' : 'Merken'} onClick={onFavorite}>{favorite ? '♥' : '♡'}</button>
      <button type="button" className={`icon-button${comparing ? ' on' : ''}`} aria-pressed={comparing} aria-label={`${asset.name} vergleichen`} title={comparing ? 'Aus dem Vergleich nehmen' : 'Zum Vergleich'} onClick={onCompare}>⇄</button>
    </div>
  </article>;
}
