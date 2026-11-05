import { useEffect, useMemo, useState } from 'react';
import { DIMENSIONS, WORLD_SCHEMA_VERSION, WORLD_XZ_LIMIT, WORLD_Y_MAX, WORLD_Y_MIN, checkWorldPlacement, createPlacement } from '../../../../../packages/domain/src/world/worldmap.js';
import type { WorldPlacement } from '../../../../../packages/domain/src/world/worldmap.js';

/**
 * Edits one project's placement. Every change previews live (outline on the
 * map, neighbours that touch the footprint); saving is one undoable
 * operation. Arrow buttons move by one chunk, the inputs take any block.
 */
export function PlacementForm({ placement, onPreview, neighbours, onSave, onRemove }: {
  placement: WorldPlacement | null;
  onPreview: (p: WorldPlacement | null) => void;
  neighbours: readonly string[];
  onSave: (p: WorldPlacement) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}) {
  const start = placement ?? createPlacement([0, 64, 0]);
  const [x, setX] = useState(String(start.origin[0])), [y, setY] = useState(String(start.origin[1])), [z, setZ] = useState(String(start.origin[2]));
  const known = DIMENSIONS.some(d => d.id === start.dimension);
  const [dimension, setDimension] = useState(known ? start.dimension : 'custom'), [custom, setCustom] = useState(known ? '' : start.dimension);
  const [hidden, setHidden] = useState(start.hidden), [note, setNote] = useState(start.note);
  const [turns, setTurns] = useState<number>(start.turns ?? 0), [mirror, setMirror] = useState(start.mirror === true);
  const [busy, setBusy] = useState(false);

  const draft = useMemo((): { value: WorldPlacement | null; error: string } => {
    try {
      const n = (s: string) => (/^-?\d+$/.test(s.trim()) ? Number(s.trim()) : Number.NaN);
      return { value: checkWorldPlacement({ schemaVersion: WORLD_SCHEMA_VERSION, origin: [n(x), n(y), n(z)], dimension: dimension === 'custom' ? custom.trim() : dimension, hidden, note: note.trim(), ...(turns && { turns }), ...(mirror && { mirror: true }) }), error: '' };
    } catch (e) { return { value: null, error: e instanceof Error ? e.message : String(e) }; }
  }, [x, y, z, dimension, custom, hidden, note, turns, mirror]);
  const changed = !!draft.value && JSON.stringify(draft.value) !== JSON.stringify(placement);
  useEffect(() => { onPreview(changed ? draft.value : null); }, [changed, draft.value]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onPreview(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const nudge = (set: (v: string) => void, value: string, by: number) => { const n = Number(value); if (Number.isInteger(n)) set(String(n + by)); };
  const submit = async () => { if (!draft.value) return; setBusy(true); try { await onSave(draft.value); } finally { setBusy(false); } };

  return <form className="placement-form" onSubmit={e => { e.preventDefault(); void submit(); }} aria-label="Weltlage bearbeiten">
    <h3>{placement ? 'Weltlage' : 'Auf die Karte setzen'}</h3>
    <p className="muted">Weltkoordinate = Projektkoordinate + Ursprung{turns || mirror ? ', gedreht um den Ursprung' : ''}. Pfeile verschieben um einen Chunk (16 Blöcke).</p>
    <div className="placement-grid">
      {([['X', x, setX, WORLD_XZ_LIMIT], ['Y', y, setY, WORLD_Y_MAX], ['Z', z, setZ, WORLD_XZ_LIMIT]] as const).map(([label, value, set, max]) =>
        <label key={label}>{label}
          <span className="placement-axis">
            {label !== 'Y' && <button type="button" onClick={() => nudge(set, value, -16)} aria-label={`${label} minus 16`}>−16</button>}
            <input inputMode="numeric" value={value} onChange={e => set(e.target.value)} aria-label={`Ursprung ${label}`}
              title={label === 'Y' ? `${WORLD_Y_MIN} bis ${WORLD_Y_MAX}` : `±${max.toLocaleString('de-DE')}`} />
            {label !== 'Y' && <button type="button" onClick={() => nudge(set, value, 16)} aria-label={`${label} plus 16`}>+16</button>}
          </span></label>)}
      <label>Dimension
        <select value={dimension} onChange={e => setDimension(e.target.value)}>
          {DIMENSIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          <option value="custom">Andere (Mod-Dimension) …</option>
        </select></label>
      {dimension === 'custom' && <label>Dimensions-ID<input value={custom} onChange={e => setCustom(e.target.value)} placeholder="mod:dimension" /></label>}
      <label>Drehung
        <select value={turns} onChange={e => setTurns(Number(e.target.value))} title="Dreht das Projekt um seinen Ursprung (Projekt 0/0/0), wie das Hologramm der Mod. Auf der Karte dreht R eine Auswahl um ihre Nordwestecke.">
          <option value={0}>ungedreht</option><option value={1}>90° im Uhrzeigersinn</option><option value={2}>180°</option><option value={3}>90° gegen den Uhrzeigersinn</option>
        </select></label>
      <label className="chip-check"><input type="checkbox" checked={mirror} onChange={e => setMirror(e.target.checked)} /> gespiegelt (Ost ↔ West vor dem Drehen)</label>
      <label className="placement-note">Notiz<input value={note} maxLength={300} onChange={e => setNote(e.target.value)} placeholder="z. B. Nordufer, neben dem Dorf" /></label>
      <label className="chip-check"><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} /> auf der Karte ausblenden</label>
    </div>
    {draft.error && <p className="field-error" role="alert">{draft.error}</p>}
    {changed && neighbours.length > 0 && <p className="notice warning" role="status">Die neue Lage berührt die Fläche von {neighbours.map(n => `„${n}“`).join(', ')}. Genaue Überschneidungen zeigt die Karte nach dem Speichern.</p>}
    <div className="button-row">
      <button className="primary" type="submit" disabled={!changed || busy}>{placement ? 'Lage speichern' : 'Platzieren'}</button>
      {placement && <button type="button" className="danger" disabled={busy} onClick={() => { setBusy(true); void onRemove().finally(() => setBusy(false)); }}>Von der Karte nehmen</button>}
    </div>
  </form>;
}
