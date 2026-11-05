import { useEffect, useMemo, useState } from 'react';
import { BASE_FUNCTIONS, SPLIT_DEFAULTS, analyzeSplit, createAsset, extractParts, extractRest, splitProject } from '../../../../../packages/domain/src/index.js';
import type { AssetVersion, AssetVersionSource, GroundMode, Provenance, SplitAnalysis, SplitProjectPart, SplitOptions, SplitPart } from '../../../../../packages/domain/src/index.js';
import type { Cell, VoxelPayload } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { navigate } from '../../app/router';
import { errorText, formatNumber } from '../../app/ui';
import { addAssetVersionInBackground } from '../../jobs/versions';
import type { Highlight } from './ConnectorEditor';

const AREA_COLOR = '#c9b48a';
const colorOf = (p: SplitPart) => p.kind === 'area' ? AREA_COLOR : p.role === 'bridge' ? '#c9a46a' : p.role === 'underground' ? '#7d7f9a' : BASE_FUNCTIONS.find(f => f.id === p.fn)?.color ?? '#8be3c0';
/** SPLIT-01-S05: what the list says about a part's kind. */
const kindLabel = (p: SplitPart) => p.kind === 'area' ? 'Fläche' : p.role === 'bridge' ? 'Brücke' : p.role === 'underground' ? 'Unterirdisch' : 'Gebäude';

/**
 * Gebäude herauslösen (SPLIT-01): finds the single buildings and areas
 * (fields, pens, paths) of a large model and saves the chosen ones as own
 * library parts – each on its own, merged into one, or all together as a
 * project where every part stands at its original position.
 */
export function SplitPanel({ payload, name, provenance, getSource, onHighlight, onSaved }: {
  payload: VoxelPayload; name: string; provenance: Provenance; getSource: () => Promise<AssetVersionSource>;
  onHighlight: (h: Highlight) => void; onSaved: (message: string, assetId?: string) => void;
}) {
  const { repo, reloadLibrary } = useApp();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Required<SplitOptions>>(SPLIT_DEFAULTS);
  const [state, setState] = useState<{ analysis: SplitAnalysis | null; error: string; running: boolean }>({ analysis: null, error: '', running: false });
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [names, setNames] = useState<Readonly<Record<string, string>>>({});
  const [hover, setHover] = useState<string | null>(null);
  const [ground, setGround] = useState<GroundMode>('ohne');
  const [rest, setRest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Analyse only while open; deferred one tick so the panel shows "läuft" first.
  useEffect(() => {
    if (!open) return;
    let live = true;
    setState(s => ({ ...s, running: true, error: '' }));
    const t = setTimeout(() => {
      try {
        const analysis = analyzeSplit(payload, options);
        if (!live) return;
        setState({ analysis, error: '', running: false });
        setPicked(new Set(analysis.parts.filter(p => p.kind === 'building').map(p => p.id)));
        setNames({});
      } catch (e) { if (live) setState({ analysis: null, error: errorText(e), running: false }); }
    }, 20);
    return () => { live = false; clearTimeout(t); };
  }, [open, payload, options]);

  const analysis = state.analysis;
  const ownerOf = useMemo(() => {
    if (!analysis) return null;
    return (c: Cell) => {
      const x = c.position[0] - analysis.minX, z = c.position[2] - analysis.minZ;
      if (x < 0 || z < 0 || x >= analysis.width || z >= analysis.length) return null;
      const o = analysis.owner[x + z * analysis.width]!;
      return o ? analysis.parts[o - 1]! : null;
    };
  }, [analysis]);
  useEffect(() => {
    if (!open || !ownerOf) { onHighlight(null); return; }
    onHighlight((c: Cell) => {
      const p = ownerOf(c);
      if (!p) return 'dim';
      if (hover) return p.id === hover ? 'hit' : 'dim';
      return picked.has(p.id) ? null : 'dim';
    });
  }, [open, ownerOf, picked, hover, onHighlight]);
  useEffect(() => () => onHighlight(null), [onHighlight]);

  const toggle = (id: string) => setPicked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const nameOf = (p: SplitPart) => (names[p.id] ?? p.name).trim() || p.name;
  const chosen = analysis?.parts.filter(p => picked.has(p.id)) ?? [];

  const store = async (versionPayload: VoxelPayload, partName: string, tags: string[], description: string): Promise<AssetVersion> => {
    const parent = await getSource();
    const asset = createAsset({ name: partName.slice(0, 120), tags: ['herausgeloest', ...tags], description: description.slice(0, 2000), provenance });
    const r = await addAssetVersionInBackground(asset, { payload: versionPayload, label: '1.0', source: { ...parent, format: 'crop' } });
    await repo.applyBatch({ versions: [r.version], assets: [r.asset] });
    return r.version;
  };
  const tagsOf = (p: SplitPart) => [p.kind === 'area' ? 'flaeche' : 'gebaeude', ...(p.role === 'bridge' ? ['bruecke'] : p.role === 'underground' ? ['unterirdisch'] : []), ...(p.fn ? [`funktion:${p.fn}`] : [])];

  const run = async (how: 'each' | 'merge' | 'project') => {
    if (!analysis || !chosen.length) return;
    setBusy(true); setError('');
    try {
      if (how === 'merge') {
        const ex = extractParts(payload, analysis, chosen.map(p => p.id), { ground });
        const label = chosen.map(nameOf).join(' + ').slice(0, 120);
        const v = await store(ex.payload, label, ['gebaeude'], `Aus „${name}“ herausgelöst: ${chosen.length} Teile zusammen, Bereich ab ${ex.at.join('/')}.`);
        await reloadLibrary();
        onSaved(`„${label}“ als ein Bauteil gespeichert.`, v.assetId);
        return;
      }
      const saved: { version: AssetVersion; part: SplitPart; at: readonly [number, number, number] }[] = [];
      for (const p of chosen) {
        const ex = extractParts(payload, analysis, [p.id], { ground });
        const v = await store(ex.payload, nameOf(p), tagsOf(p), `Aus „${name}“ herausgelöst (${kindLabel(p)}${p.reason ? `, erkannt an: ${p.reason}` : ''}), Bereich ab ${ex.at.join('/')}.`);
        saved.push({ version: v, part: p, at: ex.at });
      }
      if (how === 'each') {
        await reloadLibrary();
        onSaved(`${saved.length} Bauteile aus „${name}“ in der Bibliothek gespeichert (Schlagwort „herausgeloest“).`, saved.length === 1 ? saved[0]!.version.assetId : undefined);
        return;
      }
      const parts: SplitProjectPart[] = saved.map(s => ({ version: s.version, name: nameOf(s.part), kind: s.part.kind, at: s.at }));
      if (rest) {
        const r = extractRest(payload, analysis, chosen.map(p => p.id));
        if (r) {
          const v = await store(r, `${name}: Gelände & Rest`.slice(0, 120), ['gelaende'], `Alles aus „${name}“, was keinem herausgelösten Teil gehört (Boden, Bäume, Kleinteile).`);
          parts.unshift({ version: v, name: 'Gelände & Rest', kind: 'rest', at: r.bounds.min as [number, number, number] });
        }
      }
      await reloadLibrary();
      const project = splitProject({ name: `${name} (aufgeteilt)`, profileId: payload.profileId, source: payload, parts });
      await repo.saveProject(project, 0);
      navigate({ view: 'project', projectId: project.id, tab: 'editor' });
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  const setOpt = (k: keyof SplitOptions, v: string) => { const n = Number(v); if (Number.isInteger(n)) setOptions(o => ({ ...o, [k]: n })); };

  return <details className="crop-panel split-panel" open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
    <summary>Gebäude herauslösen</summary>
    <p className="muted">Findet die einzelnen Gebäude und Flächen (Felder, Gehege, Wege) eines großen Modells. Gewählte Teile werden eigene Bauteile, auf Wunsch zusammen als Projekt an ihrer alten Stelle. Das Modell selbst bleibt unverändert.</p>
    <div className="split-options">
      <label>Mindesthöhe Gebäude<input type="number" min={1} max={64} value={options.coreHeight} onChange={e => setOpt('coreHeight', e.target.value)} aria-label="Mindesthöhe Gebäude" /></label>
      <label>Zusammenfassen bis<input type="number" min={0} max={16} value={options.join} onChange={e => setOpt('join', e.target.value)} aria-label="Zusammenfassen bis Blöcke" /></label>
      <label>Rand zum Gebäude<input type="number" min={0} max={16} value={options.margin} onChange={e => setOpt('margin', e.target.value)} aria-label="Rand zum Gebäude" /></label>
      <label>Kleinste Fläche<input type="number" min={1} max={100000} value={options.minArea} onChange={e => setOpt('minArea', e.target.value)} aria-label="Kleinste Fläche" /></label>
      <label>Gelände<select value={ground} onChange={e => setGround(e.target.value as GroundMode)} aria-label="Gelände beim Herauslösen">
        <option value="ohne">ohne Boden und Natur</option><option value="mit">mit Boden darunter</option></select></label>
    </div>
    {state.running && <p className="muted" role="status">Modell wird untersucht …</p>}
    {state.error && <p className="field-error" role="alert">{state.error}</p>}
    {analysis && <>
      <p className="muted" data-testid="split-summary">{analysis.parts.filter(p => p.kind === 'building' && !p.role).length} Gebäude, {analysis.parts.filter(p => p.kind === 'area').length} Flächen{analysis.parts.some(p => p.role === 'underground') ? `, ${analysis.parts.filter(p => p.role === 'underground').length} unterirdisch` : ''}{analysis.parts.some(p => p.role === 'bridge') ? `, ${analysis.parts.filter(p => p.role === 'bridge').length} Brücken` : ''} gefunden · {formatNumber(analysis.restBlocks)} gebaute Blöcke ohne Teil · {formatNumber(analysis.natureBlocks)} Naturblöcke</p>
      <SplitMap analysis={analysis} picked={picked} hover={hover} onToggle={toggle} />
      <div className="button-row"><button type="button" onClick={() => setPicked(new Set(analysis.parts.map(p => p.id)))}>Alle wählen</button>
        <button type="button" onClick={() => setPicked(new Set(analysis.parts.filter(p => p.kind === 'building').map(p => p.id)))}>Nur Gebäude</button>
        <button type="button" onClick={() => setPicked(new Set())}>Keine</button></div>
      <ul className="split-parts" aria-label="Gefundene Teile">{analysis.parts.map(p => <li key={p.id} className={hover === p.id ? 'active' : ''} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}>
        <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} aria-label={`${p.name} wählen`} />
        <span className="split-swatch" style={{ background: colorOf(p) }} aria-hidden="true" />
        <input type="text" value={names[p.id] ?? p.name} maxLength={120} aria-label={`Name für ${p.name}`} onChange={e => setNames(n => ({ ...n, [p.id]: e.target.value }))} />
        <span className="split-meta" data-role={p.role ?? p.kind}>{kindLabel(p)} · {p.box.maxExclusive[0] - p.box.min[0]} × {p.box.maxExclusive[1] - p.box.min[1]} × {p.box.maxExclusive[2] - p.box.min[2]} · {formatNumber(p.blocks)} Blöcke{p.reason ? ` · erkannt: ${p.reason}` : ''}{p.connects?.length ? ` · verbindet ${p.connects.map(id => `„${nameOf(analysis.parts.find(x => x.id === id) ?? p)}“`).join(' und ')}` : ''} · {p.top.slice(0, 3).map(t => t.id).join(', ')}</span>
      </li>)}</ul>
      <label className="chip-check"><input type="checkbox" checked={rest} onChange={e => setRest(e.target.checked)} /> Beim Aufteilen in ein Projekt den Rest (Gelände, Bäume) als eigenes Teil mitnehmen</label>
      <div className="button-row">
        <button className="primary" disabled={busy || !chosen.length} onClick={() => void run('project')}>Als Projekt aufteilen ({chosen.length})</button>
        <button disabled={busy || !chosen.length} onClick={() => void run('each')}>Einzeln als Bauteile speichern</button>
        <button disabled={busy || chosen.length < 2} onClick={() => void run('merge')}>Gewählte zu einem Bauteil</button>
      </div>
      {busy && <p className="muted" role="status">Wird gespeichert …</p>}
    </>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </details>;
}

function SplitMap({ analysis, picked, hover, onToggle }: { analysis: SplitAnalysis; picked: ReadonlySet<string>; hover: string | null; onToggle(id: string): void }) {
  const { minX, minZ, width, length } = analysis;
  return <svg className="split-map" viewBox={`${minX - 1} ${minZ - 1} ${width + 2} ${length + 2}`} role="img" aria-label="Draufsicht der gefundenen Teile">
    <rect x={minX - 1} y={minZ - 1} width={width + 2} height={length + 2} fill="var(--panel-2)" />
    {analysis.parts.map(p => <g key={p.id} onClick={() => onToggle(p.id)} style={{ cursor: 'pointer' }}>
      <rect x={p.box.min[0]} y={p.box.min[2]} width={p.box.maxExclusive[0] - p.box.min[0]} height={p.box.maxExclusive[2] - p.box.min[2]}
        fill={colorOf(p)} fillOpacity={picked.has(p.id) ? 0.55 : 0.12} stroke={colorOf(p)} strokeWidth={hover === p.id ? 1 : 0.4} />
    </g>)}
  </svg>;
}
