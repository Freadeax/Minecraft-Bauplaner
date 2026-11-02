import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addAssetVersion, applyOperation, createAsset, createPlacement, createProject, dimensionLabel, NATURAL_TERRAIN_IDS, SAMPLE_PROFILE, SURVEY_MAX_COLUMNS, SURVEY_MAX_SIDE, columnAt } from '../../../../../packages/domain/src/index.js';
import type { AssetVersionSource, OriginalFile } from '../../../../../packages/domain/src/index.js';
import { CHUNK_STATE_LABEL, WORLD_SAMPLE_LIMITS, EXCERPT_PAYLOAD_LIMITS } from '../../../../../packages/formats/src/index.js';
import type { ChunkState, SurfaceMap } from '../../../../../packages/formats/src/index.js';
import type { Bounds, Cell } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { navigate } from '../../app/router';
import { errorText, formatNumber } from '../../app/ui';
import { Viewer } from '../../Viewer';
import { WorldClient } from './protocol';
import type { WorldResponse } from './protocol';
import { RegionPicker } from './RegionPicker';
import { areaLabel, readSurvey, storeSurvey } from './surveys';
import type { PickedWorld } from './RegionPicker';
import { SurfaceCanvas, surfaceRange } from './SurfaceCanvas';
import type { AreaXZ } from './SurfaceCanvas';
import './world.css';

type Excerpt = Extract<WorldResponse, { kind: 'excerpt' }>;
/** Top-left region of the 2 × 2 region window the overview shows. */
interface MapWindow { readonly rx: number; readonly rz: number }

/** Chooses overview windows: every 2 × 2 block of regions that contains picked files, most files first. */
export function mapWindows(regions: readonly { rx: number; rz: number }[]): MapWindow[] {
  const has = new Set(regions.map(r => `${r.rx},${r.rz}`)), seen = new Map<string, { w: MapWindow; n: number }>();
  for (const r of regions) for (const dx of [0, -1]) for (const dz of [0, -1]) {
    const w = { rx: r.rx + dx, rz: r.rz + dz }, k = `${w.rx},${w.rz}`;
    if (seen.has(k)) continue;
    let n = 0; for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) if (has.has(`${w.rx + a},${w.rz + b}`)) n++;
    seen.set(k, { w, n });
  }
  return [...seen.values()].sort((a, b) => b.n - a.n || a.w.rz - b.w.rz || a.w.rx - b.w.rx).map(v => v.w);
}
const windowLabel = (w: MapWindow) => `X ${w.rx * 512} … ${w.rx * 512 + 1023}, Z ${w.rz * 512} … ${w.rz * 512 + 1023}`;

const int = (v: string): number | null => /^-?\d{1,8}$/.test(v.trim()) ? Number(v.trim()) : null;

/**
 * Weltimport (WORLD-IMPORT-01): pick region files, look at the surface, select
 * a box and take it over into the library as an own building. Reading is
 * bounded (box, chunks, cells); unknown terrain is never filled with air.
 */
export function WorldImportView() {
  const { repo, reloadLibrary } = useApp();
  const client = useRef<WorldClient | null>(null);
  if (!client.current) client.current = new WorldClient();
  useEffect(() => () => client.current?.dispose(), []);
  const [dimension, setDimension] = useState('minecraft:overworld');
  const [picked, setPicked] = useState<PickedWorld | null>(null);
  const [busy, setBusy] = useState<string>('');
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [win, setWin] = useState<MapWindow | null>(null);
  const [map, setMap] = useState<SurfaceMap | null>(null);
  const [area, setArea] = useState<AreaXZ | null>(null);
  const [fields, setFields] = useState({ x1: '', y1: '', z1: '', x2: '', y2: '', z2: '' });
  const [air, setAir] = useState<'none' | 'explicit'>('none');
  const [trim, setTrim] = useState(true);
  const [dropTerrain, setDropTerrain] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [excerpt, setExcerpt] = useState<Excerpt | null>(null);

  const run = useCallback(async <T,>(label: string, job: (progress: (d: number, t: number) => void) => Promise<T>): Promise<T | null> => {
    setBusy(label); setError(''); setProgress(null);
    try { return await job((d, t) => setProgress([d, t])); }
    catch (e) { const text = errorText(e); if (text !== 'Abgebrochen.' && text !== 'Durch eine neue Anfrage ersetzt.') setError(text); return null; }
    finally { setBusy(''); setProgress(null); }
  }, []);

  const openFiles = async (list: File[]) => {
    setExcerpt(null); setMap(null); setArea(null); setMessage('');
    const r = await run('Regionsdateien werden gelesen', () => client.current!.open(list));
    if (!r) return;
    setPicked(r);
    const first = mapWindows(r.regions.filter(x => !x.error && x.chunks > 0))[0] ?? null;
    setWin(first);
  };
  const windows = useMemo(() => picked ? mapWindows(picked.regions.filter(x => !x.error && x.chunks > 0)) : [], [picked]);
  useEffect(() => {
    if (!win) return;
    void run('Übersicht wird gezeichnet', p => client.current!.surface({ min: { cx: win.rx * 32, cz: win.rz * 32 }, max: { cx: win.rx * 32 + 63, cz: win.rz * 32 + 63 }, includeIncomplete: incomplete,
      ...(dimension === 'minecraft:the_nether' && { maxY: 120 }) }, p)).then(r => { if (r) setMap(r.map); });
  }, [win, incomplete, dimension, run]);

  const chooseArea = (a: AreaXZ) => {
    setArea(a);
    const range = map ? surfaceRange(map, a) : null;
    setFields(f => ({ x1: String(Math.min(a.x1, a.x2)), z1: String(Math.min(a.z1, a.z2)), x2: String(Math.max(a.x1, a.x2)), z2: String(Math.max(a.z1, a.z2)),
      y1: range ? String(range.min - 3) : f.y1 || '60', y2: range ? String(range.max + 1) : f.y2 || '80' }));
  };
  const box = useMemo((): Bounds | string => {
    const v = { x1: int(fields.x1), y1: int(fields.y1), z1: int(fields.z1), x2: int(fields.x2), y2: int(fields.y2), z2: int(fields.z2) };
    if (Object.values(v).some(n => n === null)) return 'Bitte alle sechs Koordinaten als ganze Zahlen angeben.';
    const n = v as Record<keyof typeof v, number>;
    const b: Bounds = { min: [Math.min(n.x1, n.x2), Math.min(n.y1, n.y2), Math.min(n.z1, n.z2)], maxExclusive: [Math.max(n.x1, n.x2) + 1, Math.max(n.y1, n.y2) + 1, Math.max(n.z1, n.z2) + 1] };
    const size = [0, 1, 2].map(i => b.maxExclusive[i]! - b.min[i]!);
    if (size.some(s => s > EXCERPT_PAYLOAD_LIMITS.maxDimension)) return `Höchstens ${EXCERPT_PAYLOAD_LIMITS.maxDimension} Blöcke je Achse (gewählt ${size.join(' × ')}).`;
    if (size[0]! * size[1]! * size[2]! > WORLD_SAMPLE_LIMITS.maxVolume) return 'Bereich zu groß.';
    return b;
  }, [fields]);
  const boxSize = typeof box === 'string' ? null : [0, 1, 2].map(i => box.maxExclusive[i]! - box.min[i]!);

  const read = async () => {
    if (typeof box === 'string') return;
    setExcerpt(null); setMessage('');
    const r = await run('Ausschnitt wird gelesen', p => client.current!.excerpt({ box, air, trim, exclude: dropTerrain ? [...NATURAL_TERRAIN_IDS] : [], includeIncomplete: incomplete, name: '', dimension }, p));
    if (r) setExcerpt(r);
  };
  const noop = useCallback((_: Cell | null) => {}, []);

  const save = async (form: FormData) => {
    if (!excerpt) return;
    try {
      const name = String(form.get('name') ?? '').trim() || 'Weltausschnitt';
      const o = excerpt.report.origin;
      const asset = createAsset({ name, description: String(form.get('description') ?? ''), tags: ['weltausschnitt'],
        provenance: { author: String(form.get('author') ?? ''), source: `Eigene Welt, ${dimensionLabel(dimension)}, ab X ${o[0]} Y ${o[1]} Z ${o[2]}`, license: String(form.get('license') ?? '') } });
      const fileName = `${name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'weltausschnitt'}.schem`;
      const source: AssetVersionSource = { format: 'world-region', fileName, originalSha256: excerpt.originalSha256, dataVersion: excerpt.report.dataVersion,
        world: { box: excerpt.report.box, dimension } };
      const r = await addAssetVersion(asset, { payload: excerpt.payload, label: '1.0', source });
      const original: OriginalFile = { sha256: excerpt.originalSha256, fileName, mediaType: 'application/octet-stream', size: excerpt.original.byteLength, createdAt: new Date().toISOString(), bytes: excerpt.original };
      await repo.applyBatch({ versions: [r.version], assets: [r.asset], originals: [original] });
      await reloadLibrary();
      navigate({ view: 'library', page: 'building', id: r.asset.id });
    } catch (e) { setMessage(`Nicht gespeichert: ${errorText(e)}`); }
  };

  // Bauplatz (TERRAIN-01): the chosen X/Z rectangle as a new project with world placement and terrain survey.
  const siteArea = useMemo(() => {
    const v = [fields.x1, fields.z1, fields.x2, fields.z2].map(int);
    if (v.some(n => n === null)) return 'Für einen Bauplatz X und Z beider Ecken angeben.';
    const [x1, z1, x2, z2] = v as number[];
    const a = { minX: Math.min(x1!, x2!), minZ: Math.min(z1!, z2!), width: Math.abs(x2! - x1!) + 1, length: Math.abs(z2! - z1!) + 1 };
    if (a.width > SURVEY_MAX_SIDE || a.length > SURVEY_MAX_SIDE || a.width * a.length > SURVEY_MAX_COLUMNS) return `Bauplatz höchstens ${SURVEY_MAX_SIDE} × ${SURVEY_MAX_SIDE} Blöcke (gewählt ${a.width} × ${a.length}).`;
    return a;
  }, [fields]);
  const createSite = async (form: FormData) => {
    if (typeof siteArea === 'string') return;
    const survey = await run('Gelände wird aufgenommen', p => readSurvey(client.current!, siteArea, dimension, incomplete, p));
    if (!survey) return;
    try {
      // Origin: north-west corner of the site, one block above the median ground (where a base layer at y 0 stands on the ground).
      const ground: number[] = [];
      for (let z = 0; z < survey.length; z++) for (let x = 0; x < survey.width; x++) { const c = columnAt(survey, survey.minX + x, survey.minZ + z); if (c && c.groundId !== '?') ground.push(c.ground); }
      if (!ground.length) throw new Error('Im Bereich ist kein Gelände bekannt (Regionsdateien gewählt? Chunks erzeugt?).');
      ground.sort((a, b) => a - b);
      const name = String(form.get('siteName') ?? '').trim() || `Bauplatz bei X ${siteArea.minX} Z ${siteArea.minZ}`;
      const reference = await storeSurvey(repo, survey, name);
      const created = createProject({ name, profileId: SAMPLE_PROFILE, description: `Bauplatz aus der eigenen Welt (${dimensionLabel(dimension)}), ${areaLabel(siteArea)}. Gelände aufgenommen am ${new Date(survey.readAt).toLocaleString('de-DE')}.` });
      const project = applyOperation(created, { kind: 'batch', label: 'Bauplatz aus der Welt angelegt', operations: [
        { kind: 'world.set', world: createPlacement([siteArea.minX, ground[Math.floor(ground.length / 2)]! + 1, siteArea.minZ], dimension, 'Aus dem Weltimport') },
        { kind: 'terrain.set', terrain: reference },
      ] }).project;
      await repo.saveProject(project, 0);
      navigate({ view: 'map', search: `projekt=${encodeURIComponent(project.id)}${dimension !== 'minecraft:overworld' ? `&dim=${encodeURIComponent(dimension)}` : ''}` });
    } catch (e) { setMessage(`Bauplatz nicht angelegt: ${errorText(e)}`); }
  };

  const states = excerpt ? excerpt.chunks.reduce<Partial<Record<ChunkState, number>>>((m, c) => ({ ...m, [c.state]: (m[c.state] ?? 0) + 1 }), {}) : {};
  const set = (k: keyof typeof fields) => (e: { target: { value: string } }) => { setFields(f => ({ ...f, [k]: e.target.value })); setArea(null); };

  return <div className="page world-page">
    <header className="page-head"><div><span className="eyebrow">WELTIMPORT</span><h1 className="page-title">Ausschnitt aus deiner Welt übernehmen</h1>
      <p className="muted">Lies einen begrenzten Bereich direkt aus den Regionsdateien deiner Minecraft-Welt (Java, ab 1.16, getestet mit 26.3) und speichere ihn als eigenes Bauteil. Die Welt selbst wird nie verändert.</p></div></header>
    <RegionPicker dimension={dimension} onDimension={d => { setDimension(d); setMap(null); setPicked(null); setExcerpt(null); }} picked={picked} busy={!!busy} onFiles={f => void openFiles(f)} />
    {busy && <div className="notice world-busy" role="status">{busy}{progress && ` … ${progress[0]} / ${progress[1]} Chunks`}<button onClick={() => client.current?.abort()}>Abbrechen</button></div>}
    {error && <div className="notice warning" role="alert">{error}</div>}
    {message && <div className="notice" role="status">{message}</div>}

    {picked && <section className="world-select" aria-label="Bereich wählen">
      <div className="world-select-map">
        {windows.length > 1 && <label className="world-window">Übersicht <select value={win ? `${win.rx},${win.rz}` : ''} onChange={e => { const [rx, rz] = e.target.value.split(',').map(Number); setWin({ rx: rx!, rz: rz! }); }}>
          {windows.map(w => <option key={`${w.rx},${w.rz}`} value={`${w.rx},${w.rz}`}>{windowLabel(w)}</option>)}</select></label>}
        {map ? <SurfaceCanvas map={map} area={area} onArea={chooseArea} /> : <div className="world-map-empty">{windows.length ? 'Übersicht wird vorbereitet …' : 'Keine lesbaren Chunks in den gewählten Dateien.'}</div>}
      </div>
      <div className="world-side">
      <form className="world-box" onSubmit={e => { e.preventDefault(); void read(); }}>
        <h2>Bereich</h2>
        <p className="muted">Zwei gegenüberliegende Ecken wie im Spiel (F3). Ziehen in der Übersicht füllt X und Z und schlägt Y nach der Oberfläche vor.</p>
        <div className="world-corners">
          <span>Ecke 1</span>{(['x1', 'y1', 'z1'] as const).map(k => <label key={k}>{k[0]!.toUpperCase()}<input inputMode="numeric" value={fields[k]} onChange={set(k)} aria-label={`Ecke 1 ${k[0]!.toUpperCase()}`} /></label>)}
          <span>Ecke 2</span>{(['x2', 'y2', 'z2'] as const).map(k => <label key={k}>{k[0]!.toUpperCase()}<input inputMode="numeric" value={fields[k]} onChange={set(k)} aria-label={`Ecke 2 ${k[0]!.toUpperCase()}`} /></label>)}
        </div>
        <p className={typeof box === 'string' ? 'field-error' : 'muted'} role="status">{typeof box === 'string' ? box : `${boxSize!.join(' × ')} Blöcke · ${formatNumber(boxSize![0]! * boxSize![1]! * boxSize![2]!)} Zellen`}</p>
        <fieldset className="world-options"><legend>Übernahme</legend>
          <label><input type="radio" name="air" checked={air === 'none'} onChange={() => setAir('none')} /> Luft weglassen (nur Blöcke)</label>
          <label><input type="radio" name="air" checked={air === 'explicit'} onChange={() => setAir('explicit')} /> Luft übernehmen (Bauplan räumt den Raum frei)</label>
          <label><input type="checkbox" checked={trim} onChange={e => setTrim(e.target.checked)} /> Auf die Blöcke zuschneiden</label>
          <label><input type="checkbox" checked={dropTerrain} onChange={e => setDropTerrain(e.target.checked)} /> Natürliches Gelände weglassen (Erde, Gras, Stein, Sand, Wasser …)</label>
          <label><input type="checkbox" checked={incomplete} onChange={e => setIncomplete(e.target.checked)} /> Auch nicht fertig generierte Chunks lesen</label>
        </fieldset>
        <div className="button-row"><button className="primary" type="submit" disabled={!!busy || typeof box === 'string'}>Ausschnitt lesen</button></div>
      </form>
      <form className="world-site" aria-label="Als Bauplatz anlegen" onSubmit={e => { e.preventDefault(); void createSite(new FormData(e.currentTarget)); }}>
        <h2>Als Bauplatz anlegen</h2>
        <p className="muted">Statt Blöcke zu übernehmen: ein neues, leeres Projekt an genau dieser Stelle deiner Welt, mit Geländeaufnahme (Höhenkarte) des Bereichs. Weltkarte und Anlagen zeigen dann das echte Gelände; eine Anlage lässt sich mit Terrassen auf den Hang setzen.</p>
        <label>Titel des Bauplatzes<input name="siteName" maxLength={120} placeholder={typeof siteArea === 'string' ? 'Bauplatz' : `Bauplatz bei X ${siteArea.minX} Z ${siteArea.minZ}`} /></label>
        <p className={typeof siteArea === 'string' ? 'field-error' : 'muted'} role="status">{typeof siteArea === 'string' ? siteArea : `Bereich ${areaLabel(siteArea)}`}</p>
        <div className="button-row"><button className="secondary" type="submit" disabled={!!busy || typeof siteArea === 'string'}>Bauplatz anlegen</button></div>
      </form>
      </div>
    </section>}

    {excerpt && <section className="world-result" aria-label="Gelesener Ausschnitt">
      <div className="world-result-3d build-3d"><Viewer payload={excerpt.payload} cells={excerpt.payload.cells} onSelect={noop} /></div>
      <div className="world-result-side">
        <h2>Gelesen</h2>
        <dl className="world-facts">
          <div><dt>Blöcke</dt><dd>{formatNumber(excerpt.report.blocks)}</dd></div>
          <div><dt>Größe</dt><dd>{excerpt.report.size.join(' × ')}</dd></div>
          <div><dt>Ab Weltkoordinate</dt><dd>X {excerpt.report.origin[0]} · Y {excerpt.report.origin[1]} · Z {excerpt.report.origin[2]}</dd></div>
          <div><dt>Chunks</dt><dd>{Object.entries(states).map(([k, n]) => `${n} ${CHUNK_STATE_LABEL[k as ChunkState]}`).join(' · ')}</dd></div>
          <div><dt>BlockEntities</dt><dd>{excerpt.report.blockEntities}</dd></div>
          <div><dt>DataVersion</dt><dd>{excerpt.report.dataVersion}</dd></div>
          {excerpt.report.unknown > 0 && <div><dt>Unbekannt</dt><dd className="warn-text">{formatNumber(excerpt.report.unknown)} Zellen</dd></div>}
        </dl>
        <details open={excerpt.report.warnings.length < 4}><summary>Hinweise ({excerpt.report.warnings.length})</summary><ul className="world-warnings">{excerpt.report.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>
        <form className="world-save" onSubmit={e => { e.preventDefault(); void save(new FormData(e.currentTarget)); }}>
          <h3>Als Bauteil speichern</h3>
          <label>Name<input name="name" required maxLength={80} defaultValue="Weltausschnitt" /></label>
          <label>Beschreibung<textarea name="description" maxLength={500} rows={2} /></label>
          <label>Autor<input name="author" maxLength={80} /></label>
          <label>Nutzung/Lizenz<input name="license" maxLength={80} placeholder="z. B. eigener Bau" /></label>
          <p className="muted small">Gespeichert werden der Ausschnitt und als Original eine exakte Schem-v3-Datei mit Weltlage; die Regionsdateien selbst werden nicht gespeichert.</p>
          <div className="button-row"><button className="primary" type="submit">In die Bibliothek</button></div>
        </form>
      </div>
    </section>}
  </div>;
}
