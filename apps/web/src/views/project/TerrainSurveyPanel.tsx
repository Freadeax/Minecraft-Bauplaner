import { useState } from 'react';
import type { ReactNode } from 'react';
import { biomeLabel, biomeShares, dimensionLabel } from '../../../../../packages/domain/src/index.js';
import type { Project, ProjectTerrainReference, WorldPlacement } from '../../../../../packages/domain/src/index.js';
import type { Bounds } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { errorText, formatNumber } from '../../app/ui';
import type { LiveGame } from '../map/liveClient';
import type { WorldClient } from '../world/protocol';
import { areaAround, areaLabel, readSurvey, storeSurvey, useSurvey } from '../world/surveys';
import { ageLabel, gameDimension, gameTerrainLevel, takeGameSurvey, useGameCoverage } from '../world/gameTerrain';
import { GameLinkBar } from '../world/GameLinkBar';

const MARGIN_DEFAULT = 24;

/** Area of the Geländeaufnahme around the placed project (or 64 × 64 around an empty project's origin). */
export function surveyArea(placement: WorldPlacement, worldBounds: Bounds | null, margin: number) {
  const o = placement.origin;
  return worldBounds ? areaAround(worldBounds.min[0], worldBounds.min[2], worldBounds.maxExclusive[0], worldBounds.maxExclusive[2], margin)
    : areaAround(o[0], o[2], o[0] + 1, o[2] + 1, Math.max(margin, 32));
}

/**
 * Geländeaufnahme eines Projekts (TERRAIN-01, TERRAIN-04): stores the height map around the building
 * site, so the world map, Anlagen and Landschaft use the real terrain. It comes straight from the game
 * (mod live link, Geländegedächtnis from 0.20.0) or, as fallback, from the region files. Saving is one
 * undoable `terrain.set`.
 */
export function TerrainSurveyPanel({ project, placement, worldBounds, client, canRead, busy, setBusy, execute, game, picker }: {
  project: Project; placement: WorldPlacement; worldBounds: Bounds | null; client: WorldClient; canRead: boolean;
  busy: boolean; setBusy(label: string): void; execute(op: { kind: 'terrain.set'; terrain: ProjectTerrainReference | null; label: string }): string;
  game: LiveGame;
  /** Region file picker (fallback without the mod). */
  picker?: ReactNode;
}) {
  const { repo } = useApp();
  const [margin, setMargin] = useState(MARGIN_DEFAULT);
  const [incomplete, setIncomplete] = useState(false);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const ref = project.terrain ?? null;
  const { survey } = useSurvey(repo, ref);
  const area = surveyArea(placement, worldBounds, margin);
  const otherDimension = ref && ref.dimension !== placement.dimension;
  const level = gameTerrainLevel(game);
  const here = gameDimension(game);
  const wrongDimension = level !== 'none' && here !== null && here !== placement.dimension;
  const coverage = useGameCoverage(game, area, placement.dimension);
  const biomes = survey ? biomeShares(survey).slice(0, 4) : [];

  const save = async (s: Parameters<typeof storeSurvey>[1], from: string, extra = '') => {
    const reference = await storeSurvey(repo, s, project.name);
    const err = execute({ kind: 'terrain.set', terrain: reference, label: ref ? 'Geländeaufnahme erneuert' : 'Geländeaufnahme gespeichert' });
    const unknown = area.width * area.length - reference.known;
    setNote(err || `Geländeaufnahme ${from} gespeichert: ${areaLabel(area)}${reference.groundRange ? `, Boden Y ${reference.groundRange[0]} … ${reference.groundRange[1]}` : ''}${unknown ? `, ${formatNumber(unknown)} Spalten unbekannt` : ''}${extra}. Weltkarte, Anlagen und Landschaft nutzen sie jetzt.`);
  };
  const record = async () => {
    setBusy('Gelände wird aufgenommen'); setNote('');
    try { await save(await readSurvey(client, area, placement.dimension, incomplete), 'aus den Regionsdateien'); }
    catch (e) { const t = errorText(e); if (t !== 'Abgebrochen.') setNote(`Nicht aufgenommen: ${t}`); }
    finally { setBusy(''); }
  };
  const fromGame = async () => {
    setBusy('Gelände kommt aus dem Spiel'); setNote(''); setProgress(null);
    try {
      const r = await takeGameSurvey(game, area, placement.dimension, (d, t) => setProgress([d, t]));
      if (!r.live && !r.remembered) { setNote(`Die Mod kennt hier noch kein Gelände. Geh oder flieg im Spiel einmal zum Bauplatz (${areaLabel(area)}), dann erneut übernehmen.`); return; }
      await save(r.survey, 'aus dem Spiel', ` (${r.live} Chunks gerade geladen${r.remembered ? `, ${r.remembered} aus dem Geländegedächtnis` : ''}${r.missing ? `, ${r.missing} Chunks noch nie gesehen` : ''})`);
    } catch (e) { setNote(`Nicht übernommen: ${errorText(e)}`); }
    finally { setBusy(''); setProgress(null); }
  };
  const remove = () => { const err = execute({ kind: 'terrain.set', terrain: null, label: 'Geländeaufnahme entfernt' }); setNote(err || 'Geländeaufnahme entfernt. Rückgängig im Editor möglich.'); };

  return <section className="terrain-survey" aria-labelledby="terrain-survey-title">
    <h3 id="terrain-survey-title">Geländeaufnahme</h3>
    {ref ? <p className="terrain-survey-state" data-testid="terrain-survey-state"><b>Gespeichert:</b> {areaLabel(ref.area)} · {dimensionLabel(ref.dimension)} · {ref.source === 'mod' ? 'aus dem Spiel' : 'aus Regionsdateien'} · aufgenommen {new Date(ref.readAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
      {ref.groundRange && <> · Boden Y {ref.groundRange[0]} … {ref.groundRange[1]}</>} · {Math.round(100 * ref.known / (ref.area.width * ref.area.length))} % bekannt
      {biomes.length > 0 && <> · Biome: {biomes.map(b => biomeLabel(b.id)).join(', ')}</>}
      <button type="button" className="text-button" disabled={busy} onClick={remove}>Entfernen</button></p>
      : <p className="muted">Noch keine Geländeaufnahme. Sie speichert die Höhenkarte rund um den Bauplatz (oberster Block und Boden je Spalte), damit Weltkarte, Anlagen und Landschaft das echte Gelände zeigen und Erdarbeiten schätzen.</p>}
    {otherDimension && <p className="notice warning" role="alert">Die Aufnahme stammt aus {dimensionLabel(ref!.dimension)}, das Projekt liegt in {dimensionLabel(placement.dimension)}. Bitte neu aufnehmen.</p>}
    <div className="terrain-run">
      <label>Rand um das Projekt <input type="number" min={0} max={128} value={margin} onChange={e => setMargin(Math.max(0, Math.min(128, Math.trunc(Number(e.target.value)) || 0)))} /></label>
      <small className="muted">Bereich {areaLabel(area)}, höchstens 512 × 512.</small>
    </div>

    <div className="terrain-source" aria-label="Aus dem Spiel" data-testid="terrain-from-game">
      <h4>Aus dem Spiel <small className="muted">ohne Dateien</small></h4>
      <GameLinkBar game={game} purpose="Die Mod liefert das Gelände rund um den Bauplatz direkt an diese Seite." />
      {level !== 'none' && <>
        {wrongDimension && <p className="notice warning small" role="alert">Du bist im Spiel in {dimensionLabel(here!)}, der Bauplatz liegt in {dimensionLabel(placement.dimension)}.</p>}
        {coverage && <p className="terrain-coverage" data-testid="terrain-coverage">
          <meter min={0} max={1} value={coverage.share} aria-label="Bekanntes Gelände" /> Die Mod kennt <b>{coverage.known} von {coverage.chunks} Chunks</b> des Bereichs
          {coverage.newest !== null && <> (zuletzt gesehen {ageLabel(coverage.newest)})</>}.
          {coverage.share < 1 && <> Es fehlt Gelände {coverage.missingSide}: geh oder flieg einmal um den Bauplatz, die Mod merkt es sich.</>}</p>}
        <div className="button-row">
          <button className="primary" disabled={busy || wrongDimension || game.phase !== 'connected'} onClick={() => void fromGame()}>{ref ? 'Gelände aus dem Spiel erneuern' : 'Gelände aus dem Spiel übernehmen'}</button>
          {progress && <span role="status">{progress[0]} / {progress[1]} Chunks</span>}
        </div>
      </>}
    </div>

    <details className="terrain-source terrain-fallback" aria-label="Aus Regionsdateien" open={canRead || undefined}>
      <summary>Notfall ohne Mod: Regionsdateien <small className="muted">nur wenn die Mod nicht läuft</small></summary>
      {picker}
      {canRead ? <div className="terrain-run">
        <label className="chip-check"><input type="checkbox" checked={incomplete} onChange={e => setIncomplete(e.target.checked)} /> unfertige Chunks lesen</label>
        <button className="secondary" disabled={busy} onClick={() => void record()}>{ref ? 'Geländeaufnahme erneuern' : 'Geländeaufnahme speichern'}</button>
      </div> : <p className="muted small">Für diesen Weg die Regionsdateien dieser Dimension wählen.</p>}
    </details>
    {note && <p className="notice" role="status">{note}</p>}
  </section>;
}
