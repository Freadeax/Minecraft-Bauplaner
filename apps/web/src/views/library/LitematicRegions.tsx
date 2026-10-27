import type { LitematicResult } from '../../../../../packages/formats/src/index.js';

/**
 * Region choice for a Litematic import (P5-01): all regions merged into one
 * part, or a single region as its own part. Gaps between regions stay unselected.
 */
export function LitematicRegions({ report, disabled, onChange }: { report: LitematicResult; disabled: boolean; onChange: (region: string | undefined) => void }) {
  return <div className="litematic-regions">
    <p className="muted">Litematic-Format {report.version}{report.subVersion !== null ? `.${report.subVersion}` : ''} · DataVersion {report.dataVersion || 'unbekannt'} · {report.regions.length} {report.regions.length === 1 ? 'Region' : 'Regionen'}</p>
    {report.regions.length > 1 && <label>Übernehmen
      <select value={report.selectedRegion ?? ''} disabled={disabled} aria-label="Litematic-Region" onChange={e => onChange(e.target.value || undefined)}>
        <option value="">Alle Regionen als ein Bauteil</option>
        {report.regions.map(r => <option key={r.name} value={r.name}>Nur „{r.name}“ ({r.dimensions.join('×')})</option>)}
      </select></label>}
    <ul className="region-list">{report.regions.map(r => <li key={r.name} className={report.selectedRegion && report.selectedRegion !== r.name ? 'muted' : ''}>
      <strong>{r.name}</strong> · {r.dimensions.join('×')} ab {r.min.join('/')} · {r.blocks} Blöcke{r.tileEntities ? ` · ${r.tileEntities} BlockEntities` : ''}{r.entities ? ` · ${r.entities} Entities` : ''}
    </li>)}</ul>
  </div>;
}
