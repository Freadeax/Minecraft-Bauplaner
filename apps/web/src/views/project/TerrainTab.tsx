import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dimensionLabel, positionKey, TERRAIN_DEPTH, TERRAIN_VERDICT_LABEL, FOOT_VERDICT_LABEL } from '../../../../../packages/domain/src/index.js';
import type { TerrainVerdict } from '../../../../../packages/domain/src/index.js';
import { CHUNK_STATE_LABEL } from '../../../../../packages/formats/src/index.js';
import type { ChunkState } from '../../../../../packages/formats/src/index.js';
import type { Cell } from '../../../../../packages/voxel/src/index.js';
import { errorText, formatNumber } from '../../app/ui';
import { Viewer } from '../../Viewer';
import type { Mark } from '../../viewer/types';
import { WorldClient } from '../world/protocol';
import type { WorldResponse } from '../world/protocol';
import { RegionPicker } from '../world/RegionPicker';
import { TerrainSurveyPanel } from './TerrainSurveyPanel';
import { translateBounds } from '../../../../../packages/domain/src/index.js';
import type { PickedWorld } from '../world/RegionPicker';
import { isResolved } from './session';
import type { ProjectSession } from './session';
import '../world/world.css';

type Result = Extract<WorldResponse, { kind: 'terrain' }> & { readonly revision: number; readonly originKey: string };

const COLORS: Readonly<Record<TerrainVerdict, string | null>> = {
  present: '#4fbf7a', free: null, obstacle: '#e04848', clear: '#f08a24', fluid: '#3a7bd5', unknown: '#8a8f98',
};
const HANGING = '#f3d23a';
const short = (id: string) => id.replace(/^minecraft:/, '');

/**
 * Gelände (WORLD-IMPORT-01): compares the placed project with the terrain in the
 * player's own region files. Read-only; the only change offered is the origin
 * height suggestion, applied as an undoable world.set operation.
 */
export function TerrainTab({ session }: { session: ProjectSession }) {
  const { project, resolution } = session;
  const placement = project.world ?? null;
  const client = useRef<WorldClient | null>(null);
  if (!client.current) client.current = new WorldClient();
  useEffect(() => () => client.current?.dispose(), []);
  const [picked, setPicked] = useState<PickedWorld | null>(null);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [error, setError] = useState('');
  const [depth, setDepth] = useState(TERRAIN_DEPTH);
  const [incomplete, setIncomplete] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [note, setNote] = useState('');
  const originKey = placement ? placement.origin.join(',') : '';
  const stale = result !== null && (result.revision !== project.revision || result.originKey !== originKey);

  const open = async (files: File[]) => {
    setBusy('Regionsdateien werden gelesen'); setError(''); setResult(null);
    try { setPicked(await client.current!.open(files)); } catch (e) { setError(errorText(e)); } finally { setBusy(''); }
  };
  const check = async () => {
    if (!placement || !isResolved(resolution) || !resolution.world) return;
    setBusy('Gelände wird geprüft'); setError(''); setNote(''); setProgress(null);
    try {
      const r = await client.current!.terrain({ planned: resolution.world, placement, depth, includeIncomplete: incomplete }, (d, t) => setProgress([d, t]));
      setResult({ ...r, revision: project.revision, originKey });
    } catch (e) { const t = errorText(e); if (t !== 'Abgebrochen.') setError(t); } finally { setBusy(''); setProgress(null); }
  };
  const applySuggestion = () => {
    if (!placement || !result || result.check.suggestedOriginY === null) return;
    const o = placement.origin;
    const err = session.execute({ kind: 'world.set', world: { ...placement, origin: [o[0], result.check.suggestedOriginY, o[2]] }, label: 'Höhe ans Gelände angepasst' });
    setNote(err || `Ursprung Y auf ${result.check.suggestedOriginY} gesetzt. Bitte erneut prüfen.`);
  };

  const c = result?.check ?? null;
  const markFor = useCallback((cell: Cell): Mark | null => {
    if (!c) return null;
    const k = positionKey(cell.position), v = c.verdictAt.get(k);
    if (cell.kind === 'block' && cell.position[1] === c.foundation.baseY && c.foundation.at.get(`${cell.position[0]},${cell.position[2]}`) === 'hanging') {
      // Highlight the hanging base cell itself (the column's lowest block).
      return { color: HANGING, amount: 0.55 };
    }
    const color = v ? COLORS[v] : null;
    return color ? { color, amount: 0.55 } : null;
  }, [c]);
  const noop = useCallback((_: Cell | null) => {}, []);
  const chunkStates = useMemo(() => result ? result.chunks.reduce<Partial<Record<ChunkState, number>>>((m, x) => ({ ...m, [x.state]: (m[x.state] ?? 0) + 1 }), {}) : {}, [result]);

  if (!placement) return <section className="terrain" aria-label="Gelände"><div className="notice">
    <strong>Noch keine Weltlage.</strong> Lege auf der <a href={`#/karte?projekt=${encodeURIComponent(project.id)}`}>Weltkarte</a> fest, wo das Projekt in deiner Welt stehen soll. Danach prüft dieser Bereich das echte Gelände an dieser Stelle.</div></section>;
  if (!isResolved(resolution) || !resolution.world) return <section className="terrain" aria-label="Gelände"><p role="status">{'error' in resolution ? resolution.error : 'Projekt wird berechnet …'}</p></section>;
  const world = resolution.world;
  const b = world.bounds, o = placement.origin;
  const empty = !world.cells.length;
  const survey = <TerrainSurveyPanel project={project} placement={placement} worldBounds={empty ? null : translateBounds(b, o)} client={client.current!} canRead={!!picked}
    busy={!!busy} setBusy={setBusy} execute={op => session.execute(op)} />;

  return <section className="terrain" aria-label="Gelände">
    <header className="terrain-head">
      <div><span className="panel-kicker">GELÄNDE AN DER WELTLAGE</span>
        {empty ? <h2>{dimensionLabel(placement.dimension)} · Ursprung X {o[0]} · Y {o[1]} · Z {o[2]}</h2>
          : <h2>{dimensionLabel(placement.dimension)} · X {b.min[0] + o[0]} … {b.maxExclusive[0] + o[0] - 1} · Y {b.min[1] + o[1]} … {b.maxExclusive[1] + o[1] - 1} · Z {b.min[2] + o[2]} … {b.maxExclusive[2] + o[2] - 1}</h2>}
        <p className="muted">Wähle die Regionsdateien dieser Dimension. Gelesen werden nur die Chunks unter dem Projekt und {depth} Blöcke darunter, für die Geländeaufnahme die Oberfläche rund um den Bauplatz.</p></div>
    </header>
    <RegionPicker dimension={placement.dimension} picked={picked} busy={!!busy} onFiles={f => void open(f)} />
    {busy && <div className="notice world-busy" role="status">{busy}{progress && ` … ${progress[0]} / ${progress[1]} Chunks`}<button onClick={() => client.current?.abort()}>Abbrechen</button></div>}
    {survey}
    {empty && <div className="notice">Noch nichts geplant. Füge im <a href={`#/projekt/${project.id}/editor`}>Editor</a> Bauteile ein oder plane eine <a href="#/bibliothek/anlagen">Anlage</a> auf diesem Gelände.</div>}
    {picked && !empty && <div className="terrain-run">
      <label>Tiefe unter dem Fundament <input type="number" min={1} max={64} value={depth} onChange={e => setDepth(Math.max(1, Math.min(64, Number(e.target.value) || TERRAIN_DEPTH)))} /></label>
      <label className="chip-check"><input type="checkbox" checked={incomplete} onChange={e => setIncomplete(e.target.checked)} /> unfertige Chunks lesen</label>
      <button className="primary" disabled={!!busy} onClick={() => void check()}>{result ? 'Erneut prüfen' : 'Gelände prüfen'}</button>
    </div>}
    {error && <div className="notice warning" role="alert">{error}</div>}
    {note && <div className="notice" role="status">{note}</div>}
    {c && <>
      {stale && <div className="notice warning" role="status">Projekt oder Weltlage wurden seit der Prüfung geändert. Bitte erneut prüfen.</div>}
      <div className={`terrain-verdict ${c.complete ? (c.cells.obstacle || c.foundation.hanging || c.foundation.fluid ? 'work' : 'ok') : 'partial'}`} role="status">
        {!c.complete ? <><b>Teilweise geprüft.</b> {formatNumber(c.cells.unknown)} Zellen und {c.foundation.unknown} Fundamentspalten liegen auf unbekanntem Gelände.</>
          : c.cells.obstacle || c.foundation.hanging || c.foundation.fluid ? <><b>Bauplatz braucht Vorarbeit.</b> {formatNumber(c.cells.obstacle + c.cells.clear)} Geländeblöcke abtragen, {formatNumber(c.foundation.fillBlocks)} Blöcke unterbauen.</>
          : <><b>Bauplatz frei und tragfähig.</b> Kein Gelände im Weg, das Fundament liegt überall auf.</>}
      </div>
      <div className="terrain-grid">
        <div className="terrain-3d build-3d"><Viewer payload={world} cells={world.cells} onSelect={noop} markFor={markFor} /></div>
        <div className="terrain-side">
          <h3>Geplante Zellen</h3>
          <ul className="terrain-legend">{(Object.keys(TERRAIN_VERDICT_LABEL) as TerrainVerdict[]).map(v => <li key={v}>
            <i style={{ background: COLORS[v] ?? 'transparent' }} /> {TERRAIN_VERDICT_LABEL[v]} <b>{formatNumber(c.cells[v])}</b></li>)}</ul>
          <h3>Fundament ({c.foundation.columns} Spalten der untersten Schicht)</h3>
          <ul className="terrain-legend">
            <li><i style={{ background: '#4fbf7a' }} /> {FOOT_VERDICT_LABEL.carried} <b>{c.foundation.carried}</b></li>
            <li><i style={{ background: HANGING }} /> {FOOT_VERDICT_LABEL.hanging} <b>{c.foundation.hanging}</b>{c.foundation.hanging > 0 && <small> · {formatNumber(c.foundation.fillBlocks)}{c.foundation.gapCapped ? '+' : ''} Blöcke Unterbau, bis {c.foundation.maxGap} tief</small>}</li>
            <li><i style={{ background: COLORS.fluid! }} /> {FOOT_VERDICT_LABEL.fluid} <b>{c.foundation.fluid}</b></li>
            <li><i style={{ background: COLORS.unknown! }} /> {FOOT_VERDICT_LABEL.unknown} <b>{c.foundation.unknown}</b></li>
          </ul>
          {c.ground && <p className="terrain-ground">Gelände im Grundriss: Y {c.ground.min} … {c.ground.max} (Median {c.ground.median}).
            {c.suggestedOriginY !== null && c.suggestedOriginY !== o[1] && <> Vorschlag: Ursprung Y {c.suggestedOriginY} statt {o[1]}, dann steht die unterste Schicht auf dem mittleren Gelände.
              <button className="secondary" disabled={stale} onClick={applySuggestion}>Y {c.suggestedOriginY} übernehmen</button></>}</p>}
          {c.removal.length > 0 && <><h3>Abtragen</h3><table className="terrain-removal"><tbody>{c.removal.slice(0, 12).map(r => <tr key={r.id}><td>{short(r.id)}</td><td>{formatNumber(r.count)}</td></tr>)}</tbody></table>
            {c.removal.length > 12 && <p className="muted small">… und {c.removal.length - 12} weitere Blockarten</p>}</>}
          <p className="muted small">Chunks: {Object.entries(chunkStates).map(([k, n]) => `${n} ${CHUNK_STATE_LABEL[k as ChunkState]}`).join(' · ')}</p>
          <ul className="world-warnings">{[...result!.warnings, ...c.notes].map(w => <li key={w}>{w}</li>)}</ul>
        </div>
      </div>
    </>}
  </section>;
}
