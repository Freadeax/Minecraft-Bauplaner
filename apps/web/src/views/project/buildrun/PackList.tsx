import type { PackPlan } from '../../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../../app/ui';
import { stateColor } from '../../../colors';

export const shortItem = (id: string): string => id.replace(/^minecraft:/, '');

/** Shulker boxes in order of first use, plus stock coverage per item. */
export function PackList({ pack, compact = false }: { pack: PackPlan; compact?: boolean }) {
  if (!pack.lines.length && !pack.unresolved.length) return <p className="muted">Keine Bauitems nötig (nur Freiräumen oder Flüssigkeiten).</p>;
  const t = pack.totals;
  return <div className="pack-list">
    <p className="pack-summary"><strong>{formatNumber(t.boxes)} {t.boxes === 1 ? 'Shulkerkiste' : 'Shulkerkisten'}</strong>{t.looseSlots ? ` + ${t.looseSlots} lose Plätze` : ''} · {formatNumber(t.items)} Items in {formatNumber(t.slots)} Plätzen
      {t.fromStock > 0 && <> · {formatNumber(t.fromStock)} aus dem Lager</>}{t.missing > 0 && <> · <em className="pack-missing">{formatNumber(t.missing)} noch besorgen</em></>}
      {pack.provisional && <> · <em className="badge review" title="Enthält Annahmen der Itemzuordnung oder ungeklärte Voxelkonflikte">vorläufig</em></>}</p>
    <ol className="pack-boxes">{pack.boxes.map(b => <li key={b.index} className="pack-box">
      <header><strong>Kiste {b.index}</strong><small>ab Schritt {b.fromStep} · {b.slots.length}/27 Plätze</small></header>
      <ul>{b.items.map(i => <li key={i.itemId}><i style={{ background: stateColor(i.itemId) }} aria-hidden="true" /><code>{shortItem(i.itemId)}</code><span>{formatNumber(i.count)}</span></li>)}</ul>
    </li>)}
      {pack.loose.map(l => <li key={l.itemId} className="pack-box loose"><header><strong>Lose im Inventar</strong><small>passt nicht in Shulkerkisten</small></header>
        <ul><li><code>{shortItem(l.itemId)}</code><span>{formatNumber(l.count)}</span></li></ul></li>)}
    </ol>
    {!compact && pack.lines.some(l => l.fromStock > 0 || l.missing > 0) && <details className="pack-stock"><summary>Einkaufsliste: Lager und Fehlmengen je Item</summary>
      <table className="build-materials"><thead><tr><th>Item</th><th>Bedarf</th><th>aus Lager</th><th>besorgen</th></tr></thead>
        <tbody>{pack.lines.map(l => <tr key={l.itemId} className={l.assumed ? 'assumed' : undefined}><td><code>{shortItem(l.itemId)}</code>{l.assumed && <em className="badge review">Annahme</em>}</td>
          <td>{formatNumber(l.count)}</td><td>{formatNumber(l.fromStock)}</td><td>{l.missing ? formatNumber(l.missing) : '✓'}</td></tr>)}</tbody></table></details>}
    {pack.unresolved.length > 0 && <p className="muted">Ohne Itemzuordnung: {pack.unresolved.map(u => `${u.count}× ${u.label}`).join(' · ')}</p>}
  </div>;
}
