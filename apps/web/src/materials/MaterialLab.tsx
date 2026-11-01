import { useMemo, useState } from 'react';
import { materialLab, LAB_FAMILY_LABEL } from '../../../../packages/domain/src/materialLab.js';
import type { LabFamily } from '../../../../packages/domain/src/materialLab.js';
import type { MaterialReport } from '../../../../packages/domain/src/materials.js';
import { formatStacks } from '../../../../packages/domain/src/materials.js';
import { formatNumber } from '../app/ui';
import { stateColor } from '../colors';
import './materialLab.css';

/** Visual exploration of the existing, scoped material report; no second inventory. */
export function MaterialLab({ report }: { report: MaterialReport }) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<LabFamily | 'all'>('all');
  const [confidence, setConfidence] = useState<'all' | 'catalog' | 'assumed'>('all');
  const [sort, setSort] = useState<'count' | 'name'>('count');
  const [limit, setLimit] = useState(6);
  const view = useMemo(() => materialLab(report, { query, family, confidence, sort }), [report, query, family, confidence, sort]);
  const reset = () => { setQuery(''); setFamily('all'); setConfidence('all'); setSort('count'); setLimit(6); };
  if (!report.items.length) return null;
  return <section className="material-lab" aria-label="Materiallabor">
    <div className="material-lab-heading"><div><span className="panel-kicker">PALETTEN · FORMEN · HERKUNFT</span><h3>Materiallabor</h3></div>
      <p>Entdecke die Bauitems dieses Umfangs. Familien dienen der Orientierung; Blöcke und Mengen bleiben unverändert.</p></div>
    <div className="material-lab-families" role="group" aria-label="Materialfamilie wählen">
      <button aria-pressed={family === 'all'} onClick={() => { setFamily('all'); setLimit(6); }}>Alle <small>{report.items.length} Sorten</small></button>
      {view.families.filter(f => f.types > 0).map(f => <button key={f.id} aria-pressed={family === f.id} onClick={() => { setFamily(f.id); setLimit(6); }}>{f.label}<small>{f.types} Sorten · {formatNumber(f.count)} Items</small></button>)}
    </div>
    <div className="material-lab-controls">
      <label>Material oder Familie<input type="search" aria-label="Materiallabor durchsuchen" value={query} placeholder="z. B. Eiche, oak oder stone" onChange={e => { setQuery(e.target.value); setLimit(6); }} /></label>
      <label>Zuordnung<select aria-label="Materiallabor Zuordnung" value={confidence} onChange={e => { setConfidence(e.target.value as typeof confidence); setLimit(6); }}><option value="all">Alle Zuordnungen</option><option value="catalog">Katalogregel</option><option value="assumed">Annahme prüfen</option></select></label>
      <label>Sortieren<select aria-label="Materiallabor sortieren" value={sort} onChange={e => { setSort(e.target.value as typeof sort); setLimit(6); }}><option value="count">Größter Bedarf zuerst</option><option value="name">Item-ID A–Z</option></select></label>
      <button onClick={reset}>Zurücksetzen</button>
    </div>
    <p className="material-lab-result" role="status">{view.entries.length} von {report.items.length} Sorten · {formatNumber(view.count)} Bauitems · {formatNumber(view.slots)} Inventarplätze im Filter</p>
    {!view.entries.length && <p className="notice">Kein Bauitem passt zu diesen Filtern. Ändere die Suche oder setze die Filter zurück.</p>}
    <div className="material-lab-grid">{view.entries.slice(0, limit).map(({ line, family: itemFamily, setLabel }) => <article className="material-lab-card" key={line.itemId}>
      <div className="material-lab-swatch" aria-hidden="true" style={{ backgroundColor: stateColor(line.itemId) }} />
      <div className="material-lab-card-content"><small>{LAB_FAMILY_LABEL[itemFamily]}{setLabel ? ` · ${setLabel}` : ''}</small><h4><code>{line.itemId.replace(/^minecraft:/, '')}</code></h4>
        <strong>{formatNumber(line.count)} <span>Bauitems</span></strong><p>{formatStacks(line)} · {line.slots} {line.slots === 1 ? 'Platz' : 'Plätze'}{!line.packable && ' · nicht in Shulkerkisten'}</p>
        <span className="material-lab-certainty">{line.confidence === 'assumed' ? '⚠ Annahme – Zuordnung prüfen' : '✓ Katalogregel (Profil ungeprüft)'}</span>
        <details><summary>Herkunft und Blockzustände</summary><ul>{line.sources.map(s => <li key={`${s.key}|${s.rule}|${s.note ?? ''}`}><code>{s.state.id}</code>{Object.keys(s.state.properties).length > 0 && <code>{Object.entries(s.state.properties).map(([k,v]) => `${k}=${v}`).join(', ')}</code>}<span>{formatNumber(s.cells)} Zellen → {formatNumber(s.items)} Bauitems</span>{s.note && <span>{s.note}</span>}</li>)}</ul></details>
      </div>
    </article>)}</div>
    {view.entries.length > limit && <button className="material-lab-more" onClick={() => setLimit(n => n + 12)}>Weitere Materialien anzeigen ({view.entries.length - limit})</button>}
    <p className="material-lab-note">Farben sind schematische Vorschauen, keine Minecraft-Texturen. Ungelöste Blockzustände stehen separat unter „Ungelöst“. Lager und Sammelbedarf werden im Tab „Baustelle“ geführt.</p>
  </section>;
}
