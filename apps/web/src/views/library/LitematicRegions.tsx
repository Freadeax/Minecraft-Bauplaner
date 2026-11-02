import type { LitematicResult } from '../../../../../packages/formats/src/index.js';

const COMPRESSION_LABEL = { gzip: 'GZip (wie Litematica)', zlib: 'zlib', none: 'unkomprimiert' } as const;
const short = (id: string) => id.replace(/^minecraft:/, '');
const date = (ms: string | undefined) => {
  const n = Number(ms);
  return ms && n > 0 && Number.isSafeInteger(n) ? new Date(n).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : null;
};
/** Litematica placeholder names that say nothing about the build. */
export const PLACEHOLDER_NAMES = new Set(['Unnamed', 'Converted Schematic', '']);

/**
 * Region choice and file breakdown for a Litematic import (P5-01): all regions
 * merged into one part, or a single region as its own part. Gaps between
 * regions stay unselected. The breakdown lists what the file stores the same
 * way Litematica structures it: Metadata, Regions (Position/Size, palette,
 * bit width), TileEntities, Entities and pending ticks.
 */
export function LitematicRegions({ report, disabled, onChange }: { report: LitematicResult; disabled: boolean; onChange: (region: string | undefined) => void }) {
  const m = report.metadata, created = date(m.timeCreated), modified = date(m.timeModified);
  const meta: [string, string][] = [];
  if (m.name !== undefined && !PLACEHOLDER_NAMES.has(m.name)) meta.push(['Name', m.name]);
  if (m.author) meta.push(['Autor', m.author]);
  if (m.description) meta.push(['Beschreibung', m.description]);
  if (m.software) meta.push(['Software', m.software]);
  if (created) meta.push(['Erstellt', created]);
  if (modified && modified !== created) meta.push(['Geändert', modified]);
  if (m.enclosingSize) meta.push(['Umschließende Größe', m.enclosingSize.join(' × ')]);
  if (m.totalBlocks !== undefined) meta.push(['Blöcke laut Datei', m.totalBlocks.toLocaleString('de-DE')]);
  meta.push(['Vorschaubild', m.previewImageSize ? `${m.previewImageSize} × ${m.previewImageSize} px` : 'keins']);
  if (report.compression) meta.push(['Speicherung', COMPRESSION_LABEL[report.compression]]);
  return <div className="litematic-regions">
    <p className="muted">Litematic-Format {report.version}{report.subVersion !== null ? `.${report.subVersion}` : ''} · DataVersion {report.dataVersion || 'unbekannt'} · {report.regions.length} {report.regions.length === 1 ? 'Region' : 'Regionen'}</p>
    {report.regions.length > 1 && <label>Übernehmen
      <select value={report.selectedRegion ?? ''} disabled={disabled} aria-label="Litematic-Region" onChange={e => onChange(e.target.value || undefined)}>
        <option value="">Alle Regionen als ein Bauteil</option>
        {report.regions.map(r => <option key={r.name} value={r.name}>Nur „{r.name}“ ({r.dimensions.join('×')})</option>)}
      </select></label>}
    <ul className="region-list">{report.regions.map(r => <li key={r.name} className={report.selectedRegion && report.selectedRegion !== r.name ? 'muted' : ''}>
      <strong>{r.name}</strong> · {r.dimensions.join('×')} ab {r.min.join('/')} · {r.blocks.toLocaleString('de-DE')} Blöcke{r.tileEntities ? ` · ${r.tileEntities} BlockEntities` : ''}{r.entities ? ` · ${r.entities} Entities` : ''}
    </li>)}</ul>
    <details className="litematic-breakdown">
      <summary>Aufschlüsselung der Datei</summary>
      <dl>{meta.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {report.regions.map(r => <section key={r.name} aria-label={`Region ${r.name}`}>
        <h4>Region „{r.name}“</h4>
        <dl>
          <div><dt>Position · Size</dt><dd>{r.position.join('/')} · {r.size.join('/')}</dd></div>
          <div><dt>Palette</dt><dd>{r.paletteSize} Zustände · {r.bitsPerEntry} Bit je Block</dd></div>
          <div><dt>Volumen</dt><dd>{r.volume.toLocaleString('de-DE')} Zellen · {r.blocks.toLocaleString('de-DE')} Blöcke · {r.air.toLocaleString('de-DE')} Luft</dd></div>
          <div><dt>TileEntities</dt><dd>{r.tileEntityTypes.length ? r.tileEntityTypes.map(([id, n]) => `${n}× ${short(id)}`).join(', ') : 'keine'}</dd></div>
          <div><dt>Entities</dt><dd>{r.entityTypes.length ? r.entityTypes.map(([id, n]) => `${n}× ${short(id)}`).join(', ') : 'keine'}</dd></div>
          {r.pendingTicks > 0 && <div><dt>Geplante Ticks</dt><dd>{r.pendingTicks}</dd></div>}
        </dl>
      </section>)}
    </details>
  </div>;
}
