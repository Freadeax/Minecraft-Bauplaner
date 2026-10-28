import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { Cell } from '../../../../../packages/voxel/src/index.js';
import { addGeneratedVersion, analyzeVersion, applyOperation, checkReproducible, createGeneratedAsset, defaultsOf, describeParams, generatorById, generatorSourceOf, newInstance, presetValues, resolveProject,
  rollParams, runGenerator, compoundById, createCompoundProject, COMPOUNDS, GENERATORS } from '../../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, CompoundBuild, GeneratorRun, ParamValue, ParamValues, Project, ReproCheck, Resolution } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { href, navigate } from '../../app/router';
import type { LibraryPage } from '../../app/router';
import { errorText, formatNumber } from '../../app/ui';
import { stateColor } from '../../colors';
import { Viewer } from '../../Viewer';
import { Thumb } from '../../thumbnail/Thumb';
import { stars } from './BuildingCard';
import { GeneratorForm } from './GeneratorForm';

/** Route id: `<generator>`, `<generator>~<preset>` or `<generator>@<assetId>` (edit a generated asset). */
export function parseGeneratorRoute(id: string | undefined): { generatorId?: string; presetId?: string; assetId?: string } {
  if (!id) return {};
  const at = id.indexOf('@'), tilde = id.indexOf('~');
  if (at > 0) return { generatorId: id.slice(0, at), assetId: id.slice(at + 1) };
  if (tilde > 0) return { generatorId: id.slice(0, tilde), presetId: id.slice(tilde + 1) };
  return { generatorId: id };
}

/**
 * Generatoren (B13): overview of the parametric generators with their
 * presets, and per generator a live preview next to the parameter form.
 * Saving creates an ordinary own asset (or a new version of the generated
 * asset being edited), so catalogue, editor, materials and export use it as
 * any other part.
 */
export function GeneratorsPage({ id, projects, libHref, onSaved }: {
  id: string | undefined;
  projects: readonly Project[];
  libHref(page: LibraryPage, id?: string): string;
  onSaved(message: string, assetId: string): void;
}) {
  const route = parseGeneratorRoute(id);
  const generator = route.generatorId ? generatorById(route.generatorId) : undefined;
  const compound = route.generatorId ? compoundById(route.generatorId) : undefined;
  if (compound) return <CompoundWorkbench key={id} compoundId={compound.id} presetId={route.presetId} libHref={libHref} />;
  if (!generator) return <section className="generators" aria-label="Generatoren">
    {id && <div className="notice warning" role="alert">Generator „{route.generatorId}“ gibt es nicht.</div>}
    <p className="muted section-lead">Bauwerke nach Maß: Maße, Stil und Details wählen, Vorschau sofort sehen und als eigenes Bauteil speichern. Gleiche Werte ergeben immer dasselbe Bauwerk; die Werte werden mit der Version gespeichert.</p>
    <ul className="card-grid-auto gen-cards">{GENERATORS.map(g => {
      const run = runGenerator(g.id);
      return <li key={g.id}><article className="ecard gen-card">
        <a href={libHref('generators', g.id)} className="gen-card-open" aria-label={`Generator ${g.name} öffnen`}>
          <Thumb cacheKey={`gen:${g.id}:v${g.version}`} payload={() => run.payload} alt={`Vorschau ${g.name}`} width={360} height={220} />
          <div className="bcard-body"><strong>{g.name}</strong><span className="ecard-text">{g.description}</span></div></a>
        <div className="gen-presets" aria-label={`Vorlagen ${g.name}`}>{g.presets.map(p => <a key={p.id} className="chip-link" href={libHref('generators', `${g.id}~${p.id}`)}>{p.label}</a>)}</div>
      </article></li>;
    })}</ul>
    <h2 className="section-title">Anlagen</h2>
    <p className="muted section-lead">Mehrere generierte Bauteile als fertiges Projekt: Türme und Mauern als Burgring, unterschiedliche Häuser als Straßenzug.</p>
    <ul className="card-grid-auto gen-cards">{COMPOUNDS.map(c => <li key={c.id}><article className="ecard gen-card">
      <a href={libHref('generators', c.id)} className="gen-card-open" aria-label={`Anlage ${c.name} öffnen`}>
        <CompoundThumb id={c.id} version={c.version} />
        <div className="bcard-body"><strong>{c.name}</strong><span className="ecard-text">{c.description}</span></div></a>
      <div className="gen-presets" aria-label={`Vorlagen ${c.name}`}>{c.presets.map(p => <a key={p.id} className="chip-link" href={libHref('generators', `${c.id}~${p.id}`)}>{p.label}</a>)}</div>
    </article></li>)}</ul>
  </section>;
  return <GeneratorWorkbench key={id} generatorId={generator.id} presetId={route.presetId} assetId={route.assetId} projects={projects} libHref={libHref} onSaved={onSaved} />;
}

function GeneratorWorkbench({ generatorId, presetId, assetId, projects, libHref, onSaved }: {
  generatorId: string; presetId: string | undefined; assetId: string | undefined;
  projects: readonly Project[]; libHref(page: LibraryPage, id?: string): string; onSaved(message: string, assetId: string): void;
}) {
  const { repo, library, reloadLibrary } = useApp();
  const generator = generatorById(generatorId)!;
  const editing: { asset: Asset; version: AssetVersion } | null = useMemo(() => {
    const asset = assetId ? library.assets.find(a => a.id === assetId) : undefined;
    const version = asset ? library.versions.get(asset.versionIds.at(-1) ?? '') : undefined;
    return asset && version && generatorSourceOf(version)?.id === generatorId ? { asset, version } : null;
  }, [assetId, library, generatorId]);
  const [raw, setRaw] = useState<Record<string, ParamValue>>(() => {
    if (editing) return { ...generatorSourceOf(editing.version)!.params };
    if (presetId && generator.presets.some(p => p.id === presetId)) return { ...presetValues(generatorId, presetId) };
    return { ...defaultsOf(generator.params) };
  });
  const [preset, setPreset] = useState(presetId ?? '');
  const [name, setName] = useState('');
  const [target, setTarget] = useState(projects[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deferred = useDeferredValue(raw);
  const run: GeneratorRun | null = useMemo(() => { try { return runGenerator(generatorId, deferred); } catch (e) { setError(errorText(e)); return null; } }, [generatorId, deferred]);
  const metrics = useMemo(() => run ? analyzeVersion({ id: 'preview', payload: run.payload, connectors: run.connectors }) : null, [run]);
  const colorFor = useMemo(() => run ? (cell: Cell) => cell.kind === 'erase' ? '#d35f5f' : stateColor(run.payload.palette[cell.paletteIndex]!.id) : undefined, [run]);
  const noSelect = useMemo(() => () => {}, []);
  const values: ParamValues = run?.values ?? raw;
  const set = (key: string, value: ParamValue) => { setRaw(r => ({ ...r, [key]: value })); setPreset(''); };
  const choosePreset = (pid: string) => { setPreset(pid); if (pid) setRaw({ ...presetValues(generatorId, pid) }); };
  const roll = () => { setRaw({ ...rollParams(generator.params, Math.floor(Math.random() * 2 ** 31), { stil: values.stil! }) }); setPreset(''); };
  const sameAsStored = editing && run && JSON.stringify(generatorSourceOf(editing.version)!.params) === JSON.stringify(run.values);

  const save = async (mode: 'new' | 'version' | 'project') => {
    if (!run) return;
    setBusy(true); setError('');
    try {
      const r = mode === 'version' && editing ? await addGeneratedVersion(editing.asset, run) : await createGeneratedAsset(run, { name });
      let saved: Project | null = null;
      if (mode === 'project') {
        const stored = await repo.getProject(target);
        if (!stored) throw new Error('Projekt nicht mehr vorhanden');
        let world = null;
        try { world = resolveProject(stored, library.versions).world; } catch { /* place at the origin when the project cannot be resolved */ }
        const x = world ? world.bounds.maxExclusive[0] + 1 : 0;
        const instance = newInstance({ assetVersionId: r.version.id, name: `${r.asset.name} 1`, transform: { position: [x, 0, 0], quarterTurns: 0, mirrorX: false } });
        await repo.applyBatch({ assets: [r.asset], versions: [r.version], projects: [{ project: applyOperation(stored, { kind: 'instance.add', instance }).project, baseRevision: stored.revision }] });
        saved = stored;
      } else await repo.applyBatch({ assets: [r.asset], versions: [r.version] });
      await reloadLibrary();
      if (saved) navigate({ view: 'project', projectId: saved.id, tab: 'editor' });
      else onSaved(mode === 'version' ? `Version ${r.version.label} von „${r.asset.name}“ gespeichert. Projekte behalten ihre bisherige Version, bis du sie im Editor aktualisierst.`
        : `„${r.asset.name}“ als eigenes Bauteil gespeichert.`, r.asset.id);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return <section className="building-detail generator-page" aria-label={`Generator ${generator.name}`}>
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('browse')}>Bibliothek</a><span aria-hidden="true">›</span><a href={libHref('generators')}>Generatoren</a><span aria-hidden="true">›</span>
      <span aria-current="page">{generator.name}{editing ? ` · ${editing.asset.name}` : ''}</span></nav>
    <div className="detail-hero gen-hero">
      <div className="viewport detail-stage">
        {run && colorFor ? <Viewer key={generatorId} payload={run.payload} cells={run.payload.cells} onSelect={noSelect} colorFor={colorFor} />
          : <div className="scene empty-scene"><p>Keine Vorschau.</p></div>}
      </div>
      <div className="detail-summary gen-summary">
        <span className="panel-kicker">GENERATOR · v{generator.version}</span>
        <h1 className="detail-title">{run?.name ?? generator.name}</h1>
        <p className="detail-lead">{generator.description}</p>
        {metrics && <dl className="stat-tiles">
          <div><dt>Größe</dt><dd>{metrics.size.join(' × ')}</dd><small>B × H × T</small></div>
          <div><dt>Blöcke</dt><dd>{formatNumber(metrics.blocks)}</dd><small>{metrics.distinctBlocks} Blocktypen</small></div>
          <div title={metrics.buildTime.assumptions}><dt>Bauzeit</dt><dd>≈ {metrics.buildTime.minutes} min</dd><small>{stars(metrics.difficulty.level)}</small></div>
          <div><dt>Material</dt><dd>{metrics.items.shulkerBoxes} Shulker</dd><small>{formatNumber(metrics.items.total)} Items{metrics.items.complete ? '' : ' · unvollständig'}</small></div>
        </dl>}
        {run && run.notes.length > 0 && <ul className="gen-notes">{run.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
        {run && run.issues.length > 0 && <ul className="gen-issues" role="status">{run.issues.map((n, i) => <li key={i}>{n.message}</li>)}</ul>}
        <div className="gen-save">
          {editing && <button className="primary" disabled={busy || !run || !!sameAsStored} onClick={() => void save('version')}
            title={sameAsStored ? 'Werte entsprechen der gespeicherten Version' : undefined}>Als Version {editing.asset.versionIds.length + 1}.0 von „{editing.asset.name}“ speichern</button>}
          <label>Name des Bauteils<input value={name} placeholder={run?.name ?? ''} maxLength={120} onChange={e => setName(e.target.value)} /></label>
          <div className="button-row">
            <button className={editing ? '' : 'primary'} disabled={busy || !run} onClick={() => void save('new')}>Als neues Bauteil speichern</button>
          </div>
          {projects.length > 0 && <div className="add-row">
            <select aria-label="Zielprojekt" value={projects.some(p => p.id === target) ? target : projects[0]!.id} onChange={e => setTarget(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <button disabled={busy || !run} onClick={() => void save('project')}>＋ Speichern und ins Projekt</button></div>}
          {error && <p className="field-error" role="alert">{error}</p>}
          <p className="small-note">Gespeichert werden Geometrie, Anschlüsse und alle Parameter (Generator v{generator.version}). Herkunft: eigener Entwurf, keine fremden Vorlagen.</p>
        </div>
      </div>
    </div>
    <div className="gen-controls">
      <div className="gen-toolbar">
        <label>Vorlage<select value={preset} aria-label="Vorlage" onChange={e => choosePreset(e.target.value)}>
          <option value="">– eigene Werte –</option>{generator.presets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <button type="button" onClick={roll} title="Zufällige Maße und Details, Stil bleibt">🎲 Würfeln</button>
        <button type="button" className="text-button" onClick={() => { setRaw({ ...defaultsOf(generator.params) }); setPreset(''); }}>Zurücksetzen</button>
      </div>
      <GeneratorForm params={generator.params} values={values} onChange={set} />
    </div>
  </section>;
}

/**
 * Hint on the building page of a generated version: generator, stored
 * parameters, the result of rebuilding them, and a link to edit them.
 */
export function GeneratedInfo({ version }: { version: AssetVersion }) {
  const src = generatorSourceOf(version), g = src ? generatorById(src.id) : undefined;
  const [check, setCheck] = useState<ReproCheck | null>(null);
  useEffect(() => {
    let alive = true;
    setCheck(null);
    if (src) void checkReproducible(version).then(c => { if (alive) setCheck(c); }).catch(() => {});
    return () => { alive = false; };
  }, [version, src]);
  if (!src) return null;
  return <div className="gen-info" role="group" aria-label="Generator">
    <span className="filter-label">Erzeugt mit Generator „{g?.name ?? src.id}“ v{src.version}</span>
    {g && <p>{describeParams(g.params, src.params)}</p>}
    {check && <p className={check.status === 'gleich' ? 'ok-text' : 'warn-text'}>{check.message}</p>}
    {g && <a className="button-link" href={href({ view: 'library', page: 'generators', id: `${src.id}@${version.assetId}` })}>⚙ Mit Generator bearbeiten</a>}
  </div>;
}

/** World of a compound build (async: parts are hashed like any asset version). */
function useCompound(id: string, raw: Readonly<Record<string, unknown>>): { build: CompoundBuild | null; resolution: Resolution | null; error: string } {
  const [state, setState] = useState<{ build: CompoundBuild | null; resolution: Resolution | null; error: string }>({ build: null, resolution: null, error: '' });
  const key = JSON.stringify(raw);
  useEffect(() => {
    let alive = true;
    createCompoundProject(id, JSON.parse(key) as Record<string, unknown>).then(build => {
      if (!alive) return;
      const resolution = resolveProject(build.project, new Map(build.versions.map(v => [v.id, v])));
      setState({ build, resolution, error: '' });
    }).catch(e => { if (alive) setState({ build: null, resolution: null, error: errorText(e) }); });
    return () => { alive = false; };
  }, [id, key]);
  return state;
}

function CompoundThumb({ id, version }: { id: string; version: number }) {
  const { resolution } = useCompound(id, {});
  return resolution?.world ? <Thumb cacheKey={`anlage:${id}:v${version}`} payload={() => resolution.world} alt={`Vorschau ${id}`} width={360} height={220} />
    : <div className="thumb" aria-hidden="true" />;
}

function CompoundWorkbench({ compoundId, presetId, libHref }: { compoundId: string; presetId: string | undefined; libHref(page: LibraryPage, id?: string): string }) {
  const { repo, reloadLibrary } = useApp();
  const compound = compoundById(compoundId)!;
  const start = presetId ? compound.presets.find(p => p.id === presetId)?.values : undefined;
  const [raw, setRaw] = useState<Record<string, ParamValue>>(() => ({ ...defaultsOf(compound.params), ...(start ?? {}) }));
  const [preset, setPreset] = useState(start ? presetId! : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deferred = useDeferredValue(raw);
  const { build, resolution, error: buildError } = useCompound(compoundId, deferred);
  const world = resolution?.world ?? null;
  const colorFor = useMemo(() => world ? (cell: Cell) => cell.kind === 'erase' ? '#d35f5f' : stateColor(world.palette[cell.paletteIndex]!.id) : undefined, [world]);
  const noSelect = useMemo(() => () => {}, []);
  const values: ParamValues = build?.values ?? raw;
  const set = (key: string, value: ParamValue) => { setRaw(r => ({ ...r, [key]: value })); setPreset(''); };
  const create = async () => {
    setBusy(true); setError('');
    try {
      const b = await createCompoundProject(compoundId, raw);
      await repo.applyBatch({ assets: b.assets, versions: b.versions, projects: [{ project: b.project, baseRevision: 0 }] });
      await reloadLibrary();
      navigate({ view: 'project', projectId: b.project.id, tab: 'editor' });
    } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  const blocks = world ? world.cells.filter(c => c.kind === 'block').length : 0;
  return <section className="building-detail generator-page" aria-label={`Anlage ${compound.name}`}>
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('browse')}>Bibliothek</a><span aria-hidden="true">›</span><a href={libHref('generators')}>Generatoren</a><span aria-hidden="true">›</span>
      <span aria-current="page">{compound.name}</span></nav>
    <div className="detail-hero gen-hero">
      <div className="viewport detail-stage">
        {world && colorFor ? <Viewer key={compoundId} payload={world} cells={world.cells} onSelect={noSelect} colorFor={colorFor} />
          : <div className="scene empty-scene"><p>{buildError || 'Vorschau wird berechnet …'}</p></div>}
      </div>
      <div className="detail-summary gen-summary">
        <span className="panel-kicker">ANLAGE · v{compound.version}</span>
        <h1 className="detail-title">{compound.name}</h1>
        <p className="detail-lead">{compound.description}</p>
        {build && world && <dl className="stat-tiles">
          <div><dt>Fläche</dt><dd>{world.bounds.maxExclusive.map((n, i) => n - world.bounds.min[i]!).join(' × ')}</dd><small>B × H × T</small></div>
          <div><dt>Blöcke</dt><dd>{formatNumber(blocks)}</dd><small>{build.project.instances.length} Bauteile</small></div>
          <div><dt>Überschneidungen</dt><dd>{resolution!.conflicts.length ? <span className="warn-text">{resolution!.conflicts.length}</span> : <span className="ok-text">keine</span>}</dd><small>{build.assets.length} neue Bauteile</small></div>
        </dl>}
        {build && <ul className="gen-notes">{build.notes.map((n, i) => <li key={i}>{n}</li>)}
          <li>Teile: {build.project.instances.map(i => i.name).join(', ')}.</li></ul>}
        <div className="gen-save">
          <button className="primary" disabled={busy || !build} onClick={() => void create()}>Als Projekt anlegen</button>
          {error && <p className="field-error" role="alert">{error}</p>}
          <p className="small-note">Legt jedes unterschiedliche Teil als eigenes generiertes Bauteil an (mit gespeicherten Parametern) und ein neues Projekt mit einer Instanz je Teil.</p>
        </div>
      </div>
    </div>
    <div className="gen-controls">
      <div className="gen-toolbar">
        <label>Vorlage<select value={preset} aria-label="Vorlage" onChange={e => { setPreset(e.target.value); const p = compound.presets.find(x => x.id === e.target.value); if (p) setRaw({ ...defaultsOf(compound.params), ...p.values } as Record<string, ParamValue>); }}>
          <option value="">– eigene Werte –</option>{compound.presets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <button type="button" onClick={() => { setRaw({ ...rollParams(compound.params, Math.floor(Math.random() * 2 ** 31), { stil: values.stil! }) }); setPreset(''); }}>🎲 Würfeln</button>
        <button type="button" className="text-button" onClick={() => { setRaw({ ...defaultsOf(compound.params) }); setPreset(''); }}>Zurücksetzen</button>
      </div>
      <GeneratorForm params={compound.params} values={values} onChange={set} />
    </div>
  </section>;
}
