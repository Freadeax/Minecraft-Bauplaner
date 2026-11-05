import type { Asset } from '../../../../../packages/domain/src/core/types.js';

/** An editing draft keeps its original storage base even when another tab broadcasts new data. */
export function AssetRevisionNotice({ base, current }: { base: Asset; current: Asset }) {
  if ((base.revision ?? 0) === (current.revision ?? 0)) return null;
  return <div className="notice warning" role="alert">
    <strong>Dieses Bauteil wurde inzwischen geändert.</strong>
    <p>Dein Entwurf bleibt hier sichtbar. Speichern mit dieser alten Grundlage wird abgewiesen. Beim Neuladen werden deine ungespeicherten Eingaben verworfen.</p>
    <button type="button" onClick={() => window.location.reload()}>Seite neu laden</button>
  </div>;
}
