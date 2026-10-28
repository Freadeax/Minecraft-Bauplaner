import type { ReactNode } from 'react';
import { facetLabel, FACETS, MATERIAL_GROUP_LABEL, STAGE_LABEL, stageIndex } from '../../../../../packages/domain/src/index.js';
import type { BuildingMetrics, CatalogEntry } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import { Thumb } from '../../thumbnail/Thumb';
import { stars } from './BuildingCard';
import { MaterialBar, pct } from './BuildingSheet';

interface Line {
  readonly label: string;
  readonly show: (m: BuildingMetrics, e: CatalogEntry) => ReactNode;
  /** Numeric value for marking the smallest/largest; omitted for text rows. */
  readonly value?: (m: BuildingMetrics) => number;
}

const LINES: readonly Line[] = [
  { label: 'Abmessungen (B × H × T)', show: m => m.size.join(' × ') },
  { label: 'Grundfläche', show: m => `${formatNumber(m.footprint)} m²`, value: m => m.footprint },
  { label: 'Höhe', show: m => `${m.size[1]} Blöcke`, value: m => m.size[1] },
  { label: 'Blöcke', show: m => formatNumber(m.blocks), value: m => m.blocks },
  { label: 'Blocktypen', show: m => m.distinctBlocks, value: m => m.distinctBlocks },
  { label: 'Schwierigkeit', show: m => <span className="stars">{stars(m.difficulty.level)}</span>, value: m => m.difficulty.level },
  { label: 'Bauzeit (Schätzung)', show: m => `≈ ${m.buildTime.minutes} min`, value: m => m.buildTime.minutes },
  { label: 'Spielphase', show: m => STAGE_LABEL[m.progression.stage], value: m => stageIndex(m.progression.stage) },
  { label: 'Bauitems', show: m => `${formatNumber(m.items.total)} in ${m.items.lines} Sorten`, value: m => m.items.total },
  { label: 'Shulkerkisten', show: m => m.items.shulkerBoxes, value: m => m.items.shulkerBoxes },
  { label: 'Materialgruppen', show: (_m, e) => <><MaterialBar entry={e} /><small>{e.metrics.groups.slice(0, 3).map(g => `${MATERIAL_GROUP_LABEL[g.group]} ${pct(g.share)}`).join(' · ')}</small></> },
  { label: 'Schlafplätze', show: m => m.beds, value: m => m.beds },
  { label: 'Türen', show: m => m.doors, value: m => m.doors },
  { label: 'Lichtquellen', show: m => m.lightSources, value: m => m.lightSources },
  { label: 'Lagerplätze', show: m => `${formatNumber(m.storageSlots)} Slots`, value: m => m.storageSlots },
  { label: 'Arbeitsblöcke', show: m => m.workstations.map(w => w.profession).join(', ') || 'keine' },
  { label: 'Drehen / Spiegeln', show: m => `${m.transform.rotatable ? 'drehbar' : 'ungelöst'} · ${m.transform.mirrorable ? 'spiegelbar' : 'ungelöst'}` },
  { label: 'Anschlüsse', show: m => m.connectors.length ? m.connectors.map(c => c.type).join(', ') : 'keine' },
];

/** Side-by-side comparison of up to four buildings; extremes of numeric rows are marked, never ranked as "better". */
export function ComparePage({ entries, missing, libHref, onRemove }: {
  entries: readonly CatalogEntry[];
  missing: readonly string[];
  libHref(page: 'browse' | 'building', id?: string): string;
  onRemove(assetId: string): void;
}) {
  return <section className="compare" aria-label="Vergleich">
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('browse')}>Bibliothek</a><span aria-hidden="true">›</span><span aria-current="page">Vergleich</span></nav>
    <h1 className="page-title">Gebäude vergleichen</h1>
    {missing.length > 0 && <div className="notice warning" role="alert">Nicht gefunden: {missing.join(', ')}</div>}
    {entries.length === 0 ? <p className="muted">Noch nichts im Vergleich. In der Bibliothek auf ⇄ tippen, um bis zu vier Gebäude nebeneinanderzustellen.</p> :
    <div className="compare-scroll"><table className="compare-table" style={{ ['--cols' as string]: entries.length }}>
      <thead><tr><th scope="col"><span className="sr-only">Kennwert</span></th>{entries.map(e => <th key={e.asset.id} scope="col">
        <a href={libHref('building', e.asset.id)}><Thumb cacheKey={e.version.id} payload={() => e.version.payload} alt={`Vorschau ${e.asset.name}`} width={220} height={150} /><strong>{e.asset.name}</strong></a>
        <small>{[...e.facets.kategorie, ...e.facets.stil].map(v => facetLabel(e.facets.kategorie.includes(v) ? 'kategorie' : 'stil', v)).join(' · ')}</small>
        <button type="button" className="text-button" onClick={() => onRemove(e.asset.id)} aria-label={`${e.asset.name} aus dem Vergleich nehmen`}>entfernen</button></th>)}</tr></thead>
      <tbody>{LINES.map(line => {
        const values = line.value ? entries.map(e => line.value!(e.metrics)) : [];
        const min = Math.min(...values), max = Math.max(...values), differs = values.length > 1 && min !== max;
        return <tr key={line.label}><th scope="row">{line.label}</th>{entries.map((e, i) => <td key={e.asset.id}
          className={differs ? values[i] === min ? 'lo' : values[i] === max ? 'hi' : '' : ''}>{line.show(e.metrics, e)}</td>)}</tr>;
      })}
        {FACETS.filter(f => f.key !== 'kategorie').map(f => <tr key={f.key}><th scope="row">{f.label} <span className="badge source">Angabe</span></th>
          {entries.map(e => <td key={e.asset.id}>{e.facets[f.key].map(v => facetLabel(f.key, v)).join(', ') || '–'}</td>)}</tr>)}
      </tbody></table></div>}
    {entries.length > 1 && <p className="small-note">Markiert: kleinster (▼) und größter (▲) Wert je Zeile. Das ist keine Bewertung – mehr Blöcke sind nicht „besser“.</p>}
  </section>;
}
