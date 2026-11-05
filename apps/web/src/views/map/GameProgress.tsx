import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GAME_STATUS_LABEL, LIVE_FEATURE_SCAN, VERDICT_LABEL, checkScan, confirmedUnticked, deviationColumns, layerProgress, liveCan, scanTarget,
  stepStatusCounts, tickConfirmed, tickedButNotBuilt,
} from '../../../../../packages/domain/src/index.js';
import type { DeviationColumn, GameCheck, GuideStep, LayerProgress, Operation, Project, StepStatus } from '../../../../../packages/domain/src/index.js';
import type { Vec3 } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { href } from '../../app/router';
import { loadProjectScanOriginal, saveProjectScan } from '../../app/scanPersistence';
import { errorText, formatNumber } from '../../app/ui';
import { useProjectComputation } from '../../app/useProjectComputation';
import { readScan } from '../project/GameCheckPanel';
import type { LoadedScan } from '../project/GameCheckPanel';
import type { LiveGame } from './liveClient';
import { liveApi } from './liveClient';

/**
 * Baustand aus dem Spiel (MAP-05, docs/architecture/LIVE_LINK.md): the mod records the hologram's
 * whole plan box (GET /v1/scan, mod 0.7.1+), the page compares it like an imported recording
 * (gameCheck.ts), keeps it in the project's recording history and shows what is missing or wrong
 * per layer and on the map. Ticks change only through the explicit „abhaken“ button.
 */

const AUTO_MS = 20_000;
const pct = (n: number) => `${Math.round(n * 100)} %`;

export interface GameProgress {
  readonly supported: boolean;
  readonly project: Project | null;
  readonly busy: boolean;
  readonly error: string;
  readonly notice: string;
  readonly scan: LoadedScan | null;
  readonly fetchedAt: string | null;
  readonly stored: boolean;
  readonly check: GameCheck | null;
  readonly checkError: string;
  readonly pending: boolean;
  readonly layers: readonly LayerProgress[];
  readonly confirmable: readonly GuideStep[];
  readonly contradicted: readonly GuideStep[];
  readonly auto: boolean;
  readonly setAuto: (on: boolean) => void;
  readonly fetch: () => Promise<void>;
  /** Undoable operation that ticks every confirmed step; null when there is nothing to tick. */
  readonly tickOp: () => Operation | null;
  /** Project height filter for the map overlay (null = all heights). */
  readonly layer: number | null;
  readonly setLayer: (y: number | null) => void;
  readonly showOnMap: boolean;
  readonly setShowOnMap: (on: boolean) => void;
  /** Map overlay in world columns (project placed on the map), empty when hidden or not placed. */
  readonly columns: readonly DeviationColumn[];
}

/** Baustand of the project whose plan stands in the game as hologram. */
export function useGameProgress(game: LiveGame, project: Project | null, dimension: string): GameProgress {
  const { repo, library } = useApp();
  const supported = game.phase === 'connected' && liveCan(game.hello, LIVE_FEATURE_SCAN);
  const [scan, setScan] = useState<LoadedScan | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [stored, setStored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [auto, setAuto] = useState(false);
  const [layer, setLayer] = useState<number | null>(null);
  const [showOnMap, setShowOnMap] = useState(true);
  const projectId = project?.id ?? null;
  const latest = useRef(project); latest.current = project;
  const inFlight = useRef(false);

  // A new project in the hologram: start from its last stored recording, if any.
  useEffect(() => {
    setScan(null); setFetchedAt(null); setStored(false); setError(''); setNotice(''); setLayer(null);
    const reference = latest.current?.scanHistory?.at(-1);
    if (!reference) return;
    let live = true;
    void loadProjectScanOriginal(repo, reference)
      .then(file => readScan(new File([file.bytes as Uint8Array<ArrayBuffer>], reference.fileName)))
      .then(s => { if (live) { setScan(s); setFetchedAt(s.meta?.scannedAt ?? reference.importedAt); setStored(true); } }, () => { /* the Bauen tab reports broken recordings */ });
    return () => { live = false; };
  }, [projectId, repo]);

  const fetchScan = useCallback(async (store: boolean) => {
    const token = game.token(), p = latest.current;
    if (!token || !p || inFlight.current) return;
    inFlight.current = true;
    if (store) setBusy(true);
    try {
      const file = await liveApi.scan(game.settings.port, token);
      const s = await readScan(new File([file.bytes as Uint8Array<ArrayBuffer>], file.fileName));
      const target = scanTarget(p, s);
      if ('error' in target) throw new Error(target.error);
      setScan(s); setFetchedAt(s.meta?.scannedAt ?? new Date().toISOString()); setError('');
      if (store) {
        const current = latest.current ?? p;
        await saveProjectScan(repo, current, s, file.bytes, s.meta?.projectMin ?? [0, 0, 0]);
        setStored(true);
        setNotice(`Baustand geholt und im Projekt „${p.name}“ gespeichert (auch im Reiter „Bauen“).`);
      } else setStored(false);
    } catch (e) { setError(errorText(e)); }
    finally { inFlight.current = false; setBusy(false); }
  }, [game, repo]);

  useEffect(() => {
    if (!auto || !supported || !projectId) return;
    const t = setInterval(() => { void fetchScan(false); }, AUTO_MS);
    return () => clearInterval(t);
  }, [auto, supported, projectId, fetchScan]);
  useEffect(() => { if (!supported) setAuto(false); }, [supported]);

  // The recording names its revision; that revision's guide is the basis, as in the Bauen tab.
  const target = useMemo(() => scan && project ? scanTarget(project, scan) : null, [scan, project]);
  const revision = target && !('error' in target) ? target.revision ?? undefined : undefined;
  const computation = useProjectComputation(project, library.versions, { basis: revision, enabled: !!revision });
  const result = computation.result;
  const check = useMemo<GameCheck | null>(() => {
    if (!scan || !result || !target || 'error' in target) return null;
    const alignment: Vec3 = target.projectMin ?? result.resolution.world?.bounds.min ?? [0, 0, 0];
    const world = result.resolution.world;
    return world ? checkScan(result.guide, world, scan, alignment, target.notes) : null;
  }, [scan, result, target]);
  const status = useCallback((id: string): StepStatus => result?.site.progress.status.get(id) ?? 'open', [result]);
  const layers = useMemo(() => check && result?.resolution.world ? layerProgress(result.resolution.world, check) : [], [check, result]);
  const confirmable = useMemo(() => check && result ? confirmedUnticked(result.guide, check, status) : [], [check, result, status]);
  const contradicted = useMemo(() => check && result ? tickedButNotBuilt(result.guide, check, status) : [], [check, result, status]);
  const placement = project?.world && project.world.dimension === dimension ? project.world : null;
  const columns = useMemo(() => check && placement && showOnMap ? deviationColumns(check, placement, layer) : [], [check, placement, showOnMap, layer]);

  return {
    supported, project, busy, error, notice, scan, fetchedAt, stored, check,
    checkError: target && 'error' in target ? target.error : computation.status === 'error' ? computation.error : '',
    pending: !!scan && !check && computation.status === 'pending',
    layers, confirmable, contradicted, auto, setAuto, fetch: () => fetchScan(true),
    tickOp: () => check && result ? tickConfirmed(result.guide, check, status) : null,
    layer, setLayer, showOnMap, setShowOnMap, columns,
  };
}

const COLUMN_LABEL: Readonly<Record<DeviationColumn['verdict'], string>> = { missing: 'fehlt', wrong: 'falscher Block', state: 'Zustand/Ausrichtung', remove: 'noch abbauen' };

/** Inside the hologram box of the Spiel panel: fetch, summary, layers, tick. */
export function GameProgressPanel({ progress: g, onTick, modVersion }: { progress: GameProgress; onTick: (op: Operation) => void; modVersion: string | null }) {
  const c = g.check, t = c?.totals;
  const steps = c ? stepStatusCounts(c) : null;
  const time = g.fetchedAt ? new Date(g.fetchedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
  const yBase = g.project?.world?.origin[1] ?? 0;
  return <section className="game-progress" aria-label="Baustand aus dem Spiel">
    <h4>Baustand aus dem Spiel</h4>
    {!g.supported && <p className="muted small">Mit der Mod ab 0.7.1 liest die Karte auf Knopfdruck jeden Block der Planbox im Spiel, hakt bestätigte Bauschritte ab und zeigt, was fehlt.
      {modVersion ? ` Installiert ist ${modVersion}.` : ''} <a href="#/mod">Mod aktualisieren</a></p>}
    {g.supported && <div className="button-row">
      <button className="primary" disabled={g.busy || !g.project} onClick={() => void g.fetch()}
        title="Liest die ganze Planbox im Spiel (auch bei gedrehtem Hologramm), vergleicht sie mit dem Plan und speichert sie als Aufnahme im Projekt.">
        {g.busy ? 'Liest im Spiel …' : '⟳ Baustand holen'}</button>
      <label className="check-inline"><input type="checkbox" checked={g.auto} onChange={e => g.setAuto(e.target.checked)} /> alle 20 s nachsehen</label>
    </div>}
    {g.error && <p className="field-error" role="alert">{g.error}</p>}
    {g.checkError && <p className="field-error" role="alert">{g.checkError}</p>}
    {g.pending && <p className="muted small" role="status">Vergleiche mit dem Plan …</p>}
    {c && t && steps && <>
      <span className="map-progress" aria-label={`Laut Spiel fertig ${pct(t.blocks ? t.blocksOk / t.blocks : 0)}`}><span style={{ width: `${Math.round((t.blocks ? t.blocksOk / t.blocks : 0) * 100)}%` }} /></span>
      <p data-game-totals>{formatNumber(t.blocksOk)} von {formatNumber(t.blocks)} Blöcken richtig ({pct(t.blocks ? t.blocksOk / t.blocks : 0)})
        {(['missing', 'wrong', 'state', 'remove', 'unknown'] as const).filter(k => t[k]).map(k => ` · ${VERDICT_LABEL[k]} ${formatNumber(t[k])}`).join('')}</p>
      <p className="muted small">Schritte: {(['confirmed', 'partial', 'deviating'] as const).map(k => `${steps[k]} ${GAME_STATUS_LABEL[k].replace('im Spiel ', '')}`).join(' · ')}
        {time && <> · Stand {time}{g.stored ? ', im Projekt gespeichert' : ', nur angezeigt'}</>}</p>
      {g.confirmable.length > 0 && <div className="button-row">
        <button className="secondary" onClick={() => { const op = g.tickOp(); if (op) onTick(op); }}>✓ {g.confirmable.length} bestätigte Schritte abhaken</button>
        <span className="muted small">rückgängig machbar</span>
      </div>}
      {g.contradicted.length > 0 && <p className="warn-text">{g.contradicted.length} abgehakte Schritte sind im Spiel unvollständig oder abweichend.</p>}
      {c.notes.map(n => <p key={n} className="muted small">{n}</p>)}
      <label className="check-inline"><input type="checkbox" checked={g.showOnMap} onChange={e => g.setShowOnMap(e.target.checked)} /> Abweichungen auf der Karte{g.showOnMap && g.columns.length ? ` (${formatNumber(g.columns.length)} Spalten)` : ''}</label>
      {g.showOnMap && <ul className="game-legend" aria-label="Legende">
        {(Object.keys(COLUMN_LABEL) as DeviationColumn['verdict'][]).map(k => <li key={k}><i className={`dev-${k}`} /> {COLUMN_LABEL[k]}</li>)}
      </ul>}
      {g.layers.length > 0 && <details className="game-layers" open={g.layers.length <= 12}>
        <summary>Ebenen ({g.layers.filter(l => l.ok === l.total).length} von {g.layers.length} fertig)</summary>
        <div className="button-row"><button className="text-button" aria-pressed={g.layer === null} onClick={() => g.setLayer(null)}>alle Ebenen</button></div>
        <ol>
          {[...g.layers].reverse().map(l => <li key={l.y}>
            <button className="game-layer" aria-pressed={g.layer === l.y} onClick={() => g.setLayer(g.layer === l.y ? null : l.y)}
              title={`Nur Ebene Y ${l.y + yBase} auf der Karte zeigen`}>
              <span>Y {l.y + yBase}</span>
              <span className="map-progress"><span style={{ width: `${Math.round(l.share * 100)}%` }} /></span>
              <span className="small">{formatNumber(l.ok)}/{formatNumber(l.total)}{l.missing ? ` · fehlt ${formatNumber(l.missing)}` : ''}{l.wrong + l.state ? ` · falsch ${formatNumber(l.wrong + l.state)}` : ''}</span>
            </button>
          </li>)}
        </ol>
      </details>}
      {g.project && <p className="small"><a href={href({ view: 'project', projectId: g.project.id, tab: 'bauen' })}>Abweichungen mit Koordinaten im Reiter „Bauen“</a></p>}
    </>}
    {g.notice && <p className="ok-text small" role="status">{g.notice}</p>}
  </section>;
}
