import { compareFacts, facetLabel, isContributionId, STAGE_LABEL } from '../../../../../packages/domain/src/index.js';
import type { CatalogEntry } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import { Thumb } from '../../thumbnail/Thumb';
import { standardOrShot } from '../../thumbnail/StandardViews';
import type { ShotView } from '../../thumbnail/views';

export const stars = (level: number): string => '★'.repeat(level) + '☆'.repeat(5 - level);

/**
 * Catalogue card: isometric preview, name, declared category/style and the
 * computed key figures. The whole card opens the detail page; Merken and
 * Vergleichen are separate buttons so they never trigger navigation.
 */
export function BuildingCard({ entry, href, score, variants, favorite, comparing, onFavorite, onCompare, view }: {
  entry: CatalogEntry;
  /** Blickrichtung of the preview image; default south-east. */
  view?: ShotView | 'innen' | undefined;
  href: string;
  score?: number | undefined;
  variants?: number | undefined;
  favorite: boolean;
  comparing: boolean;
  onFavorite(): void;
  onCompare(): void;
}) {
  const { asset, metrics: m, facets } = entry;
  const f = compareFacts(entry);
  const kicker = [...facets.kategorie.map(k => facetLabel('kategorie', k)), ...facets.stil.map(v => facetLabel('stil', v))].join(' · ') || 'ohne Angaben';
  return <article className={`bcard${asset.archived ? ' archived' : ''}`}>
    <a className="bcard-open" href={href} aria-label={`${asset.name} öffnen`}>
      <div className="bcard-media">
        <Thumb cacheKey={entry.version.id} payload={() => entry.version.payload} alt={`Vorschau ${asset.name}`} {...(view && standardOrShot(view, entry.version.payload))} />
        <span className={`stage stage-${m.progression.stage} bcard-stage`}>{STAGE_LABEL[m.progression.stage]}</span>
        {score !== undefined && <em className="score" title="Passung zum Projekt (0–100)">{score}</em>}
        {variants !== undefined && variants > 1 && <em className="variants" title="Weitere Varianten auf der Detailseite">+{variants - 1} Varianten</em>}
      </div>
      <div className="bcard-body">
        <strong>{asset.name}</strong>
        <span className="bcard-kicker">{kicker}{asset.demo ? (isContributionId(asset.id) ? ' · Beitrag' : '') : ' · eigenes Bauteil'}{asset.archived ? ' · archiviert' : ''}</span>
        <dl className="bcard-facts" aria-label="Vergleichswerte">
          <div title={`Grundfläche Breite × Tiefe, ${formatNumber(m.footprint)} m² bebaut${f.plot ? `; passt auf ${f.plot.label}` : ''}`}><dt>Grundfläche</dt><dd>{m.size[0]}×{m.size[2]}</dd></div>
          <div title="Höhe in Blöcken"><dt>Höhe</dt><dd>{m.size[1]}</dd></div>
          <div title={`${formatNumber(m.blocks)} Blöcke, ${formatNumber(m.items.total)} Bauitems in ${m.items.lines} Sorten, ${m.items.shulkerBoxes} Shulkerkisten`}><dt>Material</dt><dd>{f.material}</dd></div>
          <div title={`${f.effort.formula}${f.effort.factors.length ? ` – ${f.effort.factors.map(x => x.label).join(', ')}` : ''}`}><dt>Survival</dt><dd className={`effort effort-${f.effort.level}`}>{f.effort.label}</dd></div>
        </dl>
        <span className="bcard-badges">
          <span className="badge profile" title={`${f.profileFit.detail}${f.mods.length ? `; braucht ${f.mods.join(', ')}` : '; nur Vanilla-Blöcke'}`}>{f.profile}{f.mods.length ? ` + ${f.mods.length} Mod${f.mods.length > 1 ? 's' : ''}` : ''}</span>
          <span className={`badge check check-${f.check.state}`} title={f.check.detail}>{f.check.state === 'spiel' || f.check.state === 'hinweis' ? '✓ ' : f.check.state === 'abweichung' ? '! ' : ''}{f.check.label}</span>
          <span className="stars" aria-label={`Schwierigkeit ${m.difficulty.level} von 5`} title={`Schwierigkeit ${m.difficulty.label}, ≈ ${m.buildTime.minutes} min Bauzeit (Schätzung)`}>{stars(m.difficulty.level)}</span>
        </span>
      </div>
    </a>
    <div className="bcard-actions">
      <button type="button" className={`icon-button${favorite ? ' on' : ''}`} aria-pressed={favorite} aria-label={`${asset.name} merken`} title={favorite ? 'Von der Merkliste nehmen' : 'Merken'} onClick={onFavorite}>{favorite ? '♥' : '♡'}</button>
      <button type="button" className={`icon-button${comparing ? ' on' : ''}`} aria-pressed={comparing} aria-label={`${asset.name} vergleichen`} title={comparing ? 'Aus dem Vergleich nehmen' : 'Zum Vergleich'} onClick={onCompare}>⇄</button>
    </div>
  </article>;
}
