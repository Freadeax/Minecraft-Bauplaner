import { useState } from 'react';
import { dimensionLabel } from '../../../../../packages/domain/src/index.js';
import type { Project, ProjectTerrainReference, WorldPlacement } from '../../../../../packages/domain/src/index.js';
import type { Bounds } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { errorText, formatNumber } from '../../app/ui';
import type { WorldClient } from '../world/protocol';
import { areaAround, areaLabel, readSurvey, storeSurvey } from '../world/surveys';

const MARGIN_DEFAULT = 24;

/**
 * Geländeaufnahme eines Projekts (TERRAIN-01): stores the height map around
 * the building site, so the world map and the Anlagen planner can use the
 * terrain without the region files. Saving is one undoable `terrain.set`.
 */
export function TerrainSurveyPanel({ project, placement, worldBounds, client, canRead, busy, setBusy, execute }: {
  project: Project; placement: WorldPlacement; worldBounds: Bounds | null; client: WorldClient; canRead: boolean;
  busy: boolean; setBusy(label: string): void; execute(op: { kind: 'terrain.set'; terrain: ProjectTerrainReference | null; label: string }): string;
}) {
  const { repo } = useApp();
  const [margin, setMargin] = useState(MARGIN_DEFAULT);
  const [incomplete, setIncomplete] = useState(false);
  const [note, setNote] = useState('');
  const ref = project.terrain ?? null;
  const o = placement.origin;
  const area = worldBounds ? areaAround(worldBounds.min[0], worldBounds.min[2], worldBounds.maxExclusive[0], worldBounds.maxExclusive[2], margin)
    : areaAround(o[0], o[2], o[0] + 1, o[2] + 1, Math.max(margin, 32));
  const otherDimension = ref && ref.dimension !== placement.dimension;

  const record = async () => {
    setBusy('Gelände wird aufgenommen'); setNote('');
    try {
      const survey = await readSurvey(client, area, placement.dimension, incomplete);
      const reference = await storeSurvey(repo, survey, project.name);
      const err = execute({ kind: 'terrain.set', terrain: reference, label: ref ? 'Geländeaufnahme erneuert' : 'Geländeaufnahme gespeichert' });
      const unknown = area.width * area.length - reference.known;
      setNote(err || `Geländeaufnahme gespeichert: ${areaLabel(area)}${reference.groundRange ? `, Boden Y ${reference.groundRange[0]} … ${reference.groundRange[1]}` : ''}${unknown ? `, ${formatNumber(unknown)} Spalten unbekannt` : ''}. Weltkarte und Anlagen nutzen sie jetzt.`);
    } catch (e) { const t = errorText(e); if (t !== 'Abgebrochen.') setNote(`Nicht aufgenommen: ${t}`); }
    finally { setBusy(''); }
  };
  const remove = () => { const err = execute({ kind: 'terrain.set', terrain: null, label: 'Geländeaufnahme entfernt' }); setNote(err || 'Geländeaufnahme entfernt. Rückgängig im Editor möglich.'); };

  return <section className="terrain-survey" aria-labelledby="terrain-survey-title">
    <h3 id="terrain-survey-title">Geländeaufnahme</h3>
    {ref ? <p className="terrain-survey-state" data-testid="terrain-survey-state"><b>Gespeichert:</b> {areaLabel(ref.area)} · {dimensionLabel(ref.dimension)} · aufgenommen {new Date(ref.readAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
      {ref.groundRange && <> · Boden Y {ref.groundRange[0]} … {ref.groundRange[1]}</>} · {Math.round(100 * ref.known / (ref.area.width * ref.area.length))} % bekannt
      <button type="button" className="text-button" disabled={busy} onClick={remove}>Entfernen</button></p>
      : <p className="muted">Noch keine Geländeaufnahme. Sie speichert die Höhenkarte rund um den Bauplatz (oberster Block und Boden je Spalte), damit Weltkarte und Anlagen das echte Gelände zeigen und Erdarbeiten schätzen, auch ohne Regionsdateien.</p>}
    {otherDimension && <p className="notice warning" role="alert">Die Aufnahme stammt aus {dimensionLabel(ref!.dimension)}, das Projekt liegt in {dimensionLabel(placement.dimension)}. Bitte neu aufnehmen.</p>}
    {canRead ? <div className="terrain-run">
      <label>Rand um das Projekt <input type="number" min={0} max={128} value={margin} onChange={e => setMargin(Math.max(0, Math.min(128, Math.trunc(Number(e.target.value)) || 0)))} /></label>
      <label className="chip-check"><input type="checkbox" checked={incomplete} onChange={e => setIncomplete(e.target.checked)} /> unfertige Chunks lesen</label>
      <button className="secondary" disabled={busy} onClick={() => void record()}>{ref ? 'Geländeaufnahme erneuern' : 'Geländeaufnahme speichern'}</button>
      <small className="muted">Bereich {areaLabel(area)}, höchstens 512 × 512.</small>
    </div> : <p className="muted small">Zum Aufnehmen oben die Regionsdateien dieser Dimension wählen.</p>}
    {note && <p className="notice" role="status">{note}</p>}
  </section>;
}
