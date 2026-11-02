import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { Cell } from '../../../../../packages/voxel/src/index.js';
import {
  BASE_FUNCTIONS, BASE_PHASES, BASE_SPACING, BASE_TEMPLATES, EARTHWORK_NOTE, PATH_STYLE_LABEL, PATH_WIDTH, RESERVE_ID, TERRAIN_MODE_LABEL, WATER_SIDE_LABEL,
  applyOperation, baseIntoProject, baseTemplateById, besideOffset, buildBasePlan, createBaseProject, defaultZones, fitAnlageToTerrain, layoutBase,
  mainCandidates, previewBase, resolveProject, zoneKeyFor,
} from '../../../../../packages/domain/src/index.js';
import type {
  AnlageLibrary, AnlagePreview, AnlageTerrainFit, BaseChoices, BaseFunctionId, BaseLayout, BasePhase, BasePlan, BaseZoneChoice, BaseZonePlan, PathStyle, Project, TerrainMode, WaterSide,
} from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { navigate } from '../../app/router';
import type { LibraryPage } from '../../app/router';
import { errorText, formatNumber } from '../../app/ui';
import { Viewer } from '../../Viewer';
import { projectTerrainDimension, useProjectTerrain } from '../world/designs';
import './anlagen.css';
import './base.css';

const CONFLICT_MARK = { color: '#ff5f57', amount: 0.85 } as const;
type Target = { readonly kind: 'new' } | { readonly kind: 'project'; readonly projectId: string };
const size = (f: { x0: number; z0: number; x1: number; z1: number } | null) => f ? `${f.x1 - f.x0} × ${f.z1 - f.z0}` : '–';

function safeLayout(lib: AnlageLibrary, choices: BaseChoices): { layout: BaseLayout | null; error: string } {
  try { return { layout: layoutBase(lib, choices), error: '' }; } catch (e) { return { layout: null, error: errorText(e) }; }
}

/**
 * Basisplaner (BASE-01): a whole survival base from function zones around a
 * plaza – layout, routed paths with lanterns, shore and harbour, game checks
 * per zone, build phases. Only the adoption button creates or changes a
 * project.
 */
export function BasePage({ projects, libHref, onMessage }: {
  projects: readonly Project[];
  libHref(page: LibraryPage, id?: string): string;
  onMessage(text: string, link?: { href: string; label: string }): void;
}) {
  const { library, repo, reloadLibrary } = useApp();
  const lib = useMemo<AnlageLibrary>(() => ({ assets: library.assets, versions: library.versions }), [library]);
  const [choices, setChoices] = useState<BaseChoices>({ template: BASE_TEMPLATES[0]!.id });
  const [target, setTarget] = useState<Target>({ kind: 'new' });
  const [name, setName] = useState(BASE_TEMPLATES[0]!.name);
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [useTerrain, setUseTerrain] = useState(true);
  const [mode, setMode] = useState<TerrainMode>('eben');
  const [focus, setFocus] = useState<string | null>(null);
  const deferred = useDeferredValue(choices);
  const stale = deferred !== choices;

  const template = baseTemplateById(choices.template ?? '') ?? BASE_TEMPLATES[0]!;
  const zones = choices.zones ?? defaultZones(template);
  const { layout, error: layoutError } = useMemo(() => safeLayout(lib, deferred), [lib, deferred]);
  const [plan, setPlan] = useState<BasePlan | null>(null);
  useEffect(() => {
    let live = true;
    setPlan(null);
    if (layout) void buildBasePlan(layout, { name }).then(p => { if (live) setPlan(p); }).catch(() => { if (live) setPlan(null); });
    return () => { live = false; };
    // The network name follows the project name only on adoption; no rebuild per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const base = target.kind === 'project' ? projects.find(p => p.id === target.projectId) : undefined;
  const baseResolution = useMemo(() => { if (!base) return null; try { return resolveProject(base, lib.versions); } catch { return null; } }, [base, lib]);
  const offset = useMemo<[number, number]>(() => base && plan ? besideOffset(plan, baseResolution) : [0, 0], [base, plan, baseResolution]);
  const terrainRef = base?.world && projectTerrainDimension(base, 'planned') === base.world.dimension && (base.terrain || base.terrainDesign) ? base : null;
  const { survey, error: surveyError } = useProjectTerrain(repo, terrainRef, 'planned');
  const fit = useMemo((): { fit: AnlageTerrainFit | null; error: string } => {
    if (!plan || !survey || !useTerrain || !base?.world) return { fit: null, error: '' };
    try { return { fit: fitAnlageToTerrain(plan, { survey, origin: base.world.origin, offset, mode }), error: '' }; } catch (e) { return { fit: null, error: errorText(e) }; }
  }, [plan, survey, useTerrain, base, offset, mode]);
  const { preview, error: previewError } = useMemo((): { preview: AnlagePreview | null; error: string } => {
    if (!plan) return { preview: null, error: '' };
    try { return { preview: previewBase(plan, { ...(base && { base }), offset, versions: lib.versions, ...(fit.fit && { heights: fit.fit.heights }) }), error: '' }; }
    catch (e) { return { preview: null, error: errorText(e) }; }
  }, [plan, base, offset, lib, fit]);
  const conflictCells = useMemo(() => new Set(preview?.conflicts.map(c => c.position.join(',')) ?? []), [preview]);
  const markFor = useCallback((cell: Cell) => conflictCells.has(cell.position.join(',')) ? CONFLICT_MARK : null, [conflictCells]);
  const noSelect = useMemo(() => () => {}, []);

  const update = (patch: (c: BaseChoices) => BaseChoices) => { setAccept(false); setChoices(c => patch(c)); };
  const setZones = (fn: (z: readonly BaseZoneChoice[]) => BaseZoneChoice[]) => update(c => ({ ...c, zones: fn(c.zones ?? defaultZones(baseTemplateById(c.template ?? '') ?? BASE_TEMPLATES[0]!)) }));
  const patchZone = (key: string, patch: Partial<BaseZoneChoice>) => setZones(list => list.map(z => z.key === key ? { ...z, ...patch } : z));
  const chooseTemplate = (id: string) => { const t = baseTemplateById(id)!; setName(t.name); update(() => ({ template: id, water: t.water })); };
  const addZone = (fn: BaseFunctionId) => setZones(list => [...list, { key: zoneKeyFor(list, fn), fn }]);

  const adopt = async () => {
    if (!plan || !preview) return;
    setBusy(true);
    try {
      // The path network is an own part: store it first, then the project that uses it.
      const stored = plan.network ? await buildBasePlan(plan.layout, { name }) : plan;
      if (stored.network) { await repo.applyBatch({ versions: [stored.network.version], assets: [stored.network.asset] }); await reloadLibrary(); }
      const versions = new Map(lib.versions);
      if (stored.network) versions.set(stored.network.version.id, stored.network.version);
      if (target.kind === 'new') {
        const fresh = previewBase(stored, { versions });
        const created = createBaseProject(stored, fresh, { name, acceptConflicts: accept });
        await repo.saveProject(created, 0);
        navigate({ view: 'project', projectId: created.id, tab: 'editor' });
        return;
      }
      const project = await repo.getProject(target.projectId);
      if (!project) throw new Error('Projekt nicht mehr vorhanden');
      let world = null;
      try { world = resolveProject(project, versions); } catch { /* unresolved: beside offset 0 */ }
      const at = besideOffset(stored, world);
      const heights = useTerrain && survey && project.world ? fitAnlageToTerrain(stored, { survey, origin: project.world.origin, offset: at, mode }).heights : undefined;
      const fresh = previewBase(stored, { base: project, offset: at, versions, ...(heights && { heights }) });
      if (fresh.conflicts.length && !accept) throw new Error(`${fresh.conflicts.length} Voxelkonflikt(e) nach Neuberechnung; bitte prüfen und bestätigen`);
      const saved = await repo.saveProject(applyOperation(project, baseIntoProject(stored, fresh, project, { acceptConflicts: accept })).project, project.revision);
      onMessage(`Basis in „${saved.name}“ eingefügt: ${fresh.draft.instances.length} Instanzen mit Bauphasen. Rückgängig im Editor möglich.`,
        { href: `#/projekt/${encodeURIComponent(saved.id)}/baustelle`, label: 'Zur Baustelle' });
    } catch (e) { onMessage(`Nicht übernommen: ${errorText(e)}`); }
    finally { setBusy(false); }
  };

  const conflicts = preview?.conflicts.length ?? 0;
  const blockers = layout?.blockers ?? [];
  const warnings = layout?.warnings ?? [];
  const totalBlocks = preview ? [...preview.blocks.values()].reduce((a, b) => a + b, 0) : 0;
  const active = layout?.zones.filter(z => z.enabled) ?? [];
  const open = active.flatMap(z => z.requirements.filter(r => r.status === 'warn'));
  const canAdopt = !!plan && !!preview && !blockers.length && active.length > 0 && (!conflicts || accept) && !busy && !stale && !!name.trim();
  const missingFns = BASE_FUNCTIONS.filter(f => f.id !== 'platz' || !zones.some(z => z.fn === 'platz'));

  return <section className="building-detail anlage-planner base-planner" aria-label="Basis planen">
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('browse')}>Bibliothek</a><span aria-hidden="true">›</span><span aria-current="page">Basisplaner</span></nav>
    <div className="anlagen-intro"><div><span className="panel-kicker">BASIS PLANEN</span>
      <h2>Eine ganze Basis aus Funktionen: Lager, Schmiede, Felder, Hafen.</h2>
      <p>Wähle eine Vorlage und die Zonen deiner Basis. Der Planer legt den Dorfplatz in die Mitte, ordnet die Zonen nach kurzen Wegen (Lager neben Schmiede, Küche neben Feldern und Halle), legt Felder, Tierfarm und Hafen ans Wasser, die XP-Farm abseits, verlegt Wege mit Laternen und prüft jede Zone auf ihre Spielfunktion. Übernommen wird erst auf Knopfdruck, mit Bauphasen für die Baustelle.</p></div>
      <aside>Vorlagen: {BASE_TEMPLATES.map(t => t.name).join(', ')}. Jede Zone nutzt echte Gebäude aus der Bibliothek; das Hauptgebäude lässt sich tauschen oder als freier Bauplatz halten.</aside></div>

    <div className="detail-hero">
      <div className="viewport detail-stage">
        {preview?.resolution.world ? <Viewer key={plan?.layout.choices.template.id ?? 'basis'} payload={preview.resolution.world} cells={preview.resolution.world.cells} onSelect={noSelect} markFor={markFor} />
          : <div className="scene empty-scene"><p>{layoutError || previewError || (layout ? 'Vorschau wird berechnet …' : 'Keine Zone ausgewählt.')}</p></div>}
      </div>
      <div className="detail-summary">
        <span className="panel-kicker">BASIS · {template.name}</span><h2 className="detail-title">{name || template.name}</h2>
        <p className="detail-lead">{template.description}</p>
        <dl className="stat-tiles" aria-live="polite">
          <div><dt>Fläche</dt><dd>{size(layout?.extent ?? null)}</dd></div>
          <div><dt>Zonen</dt><dd data-testid="base-zones">{active.length}</dd></div>
          <div><dt>Weg</dt><dd>{formatNumber(layout?.paths.length ?? 0)} <small>Felder · {layout?.lamps.length ?? 0} Laternen</small></dd></div>
          <div><dt>Blöcke</dt><dd>{formatNumber(totalBlocks)}</dd></div>
          <div><dt>Voxelkonflikte</dt><dd data-testid="base-conflicts">{conflicts ? <span className="warn-text">{conflicts}</span> : <span className="ok-text">keine</span>}</dd></div>
          <div><dt>Offene Prüfpunkte</dt><dd data-testid="base-open">{open.length ? <span className="warn-text">{open.length}</span> : <span className="ok-text">keine</span>}</dd></div>
        </dl>
        {stale && <p className="small-note" role="status">Plan wird neu berechnet …</p>}
      </div>
    </div>

    <div className="anlage-columns">
      <section className="anlage-panel" aria-labelledby="base-plan-title">
        <h3 id="base-plan-title">Lageplan</h3>
        {layout ? <BaseMap layout={layout} focus={focus} onFocus={setFocus} /> : <p className="field-error" role="alert">{layoutError}</p>}
        <div className="anlage-controls base-controls">
          <label>Vorlage<select value={template.id} onChange={e => chooseTemplate(e.target.value)} aria-label="Vorlage">
            {BASE_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label>Wasserseite<select value={choices.water ?? template.water} onChange={e => update(c => ({ ...c, water: e.target.value as WaterSide }))} aria-label="Wasserseite">
            {(Object.keys(WATER_SIDE_LABEL) as WaterSide[]).map(w => <option key={w} value={w}>{WATER_SIDE_LABEL[w]}</option>)}</select></label>
          <label>Wegstil<select value={choices.pathStyle ?? 'dorf'} onChange={e => update(c => ({ ...c, pathStyle: e.target.value as PathStyle }))} aria-label="Wegstil">
            {(Object.keys(PATH_STYLE_LABEL) as PathStyle[]).map(w => <option key={w} value={w}>{PATH_STYLE_LABEL[w]}</option>)}</select></label>
          <label className="anlage-range">Wegbreite: <strong>{choices.pathWidth ?? PATH_WIDTH.default} Blöcke</strong>
            <input type="range" min={PATH_WIDTH.min} max={PATH_WIDTH.max} value={choices.pathWidth ?? PATH_WIDTH.default} aria-label="Wegbreite in Blöcken" onChange={e => update(c => ({ ...c, pathWidth: Number(e.target.value) }))} /></label>
          <label className="anlage-range">Abstand zum Weg: <strong>{choices.spacing ?? BASE_SPACING.default} Blöcke</strong>
            <input type="range" min={BASE_SPACING.min} max={BASE_SPACING.max} value={choices.spacing ?? BASE_SPACING.default} aria-label="Abstand zum Weg in Blöcken" onChange={e => update(c => ({ ...c, spacing: Number(e.target.value) }))} /></label>
          <label className="chip-check"><input type="checkbox" checked={choices.lights !== false} onChange={e => update(c => ({ ...c, lights: e.target.checked }))} /> Laternen an den Wegen</label>
          <label className="chip-check"><input type="checkbox" checked={choices.doors !== false} onChange={e => update(c => ({ ...c, doors: e.target.checked }))} /> Eingänge zum Platz drehen</label>
        </div>
      </section>

      <section className="anlage-panel" aria-labelledby="base-check-title">
        <h3 id="base-check-title">Prüfung</h3>
        <ul className="anlage-checks">
          <li className={conflicts ? 'bad' : 'good'}><strong>{conflicts ? `${conflicts} Voxelkonflikt${conflicts === 1 ? '' : 'e'}` : 'Keine Voxelkonflikte'}</strong><span>Blockgenau mit dem Composer geprüft{preview?.conflictsWithBase ? `, ${preview.conflictsWithBase} mit bestehenden Bauten` : ''}.</span></li>
          <li className={warnings.length ? 'warn' : 'good'}><strong>{warnings.length ? `${warnings.length} Hinweise zur Lage` : 'Alle Zonen am Wegenetz'}</strong><span>{warnings.length ? warnings.join(' ') : 'Jede Zone hat einen Weg zum Platz.'}</span></li>
          <li className={open.length ? 'warn' : 'good'}><strong>{open.length ? `${open.length} Spielfunktionen offen` : 'Spielfunktionen erfüllt'}</strong><span>{open.length ? 'Details je Zone unten.' : 'Verzauberungsstufe, Bewässerung, Arbeitsblöcke und Lager geprüft.'}</span></li>
          {blockers.map(b => <li key={b} className="bad"><strong>Nicht übernehmbar</strong><span>{b}</span></li>)}
          {(layoutError || previewError) && <li className="bad"><strong>Fehler</strong><span>{layoutError || previewError}</span></li>}
        </ul>
        {fit.fit ? <p className="small-note">Gelände aus „{base!.name}“ ({TERRAIN_MODE_LABEL[fit.fit.mode]}): {formatNumber(fit.fit.totals.fill)} Blöcke Unterbau, {formatNumber(fit.fit.totals.cut)} Blöcke Abtrag. {EARTHWORK_NOTE}</p>
          : <p className="small-note">Gelände ungeprüft: Für Hanglagen und die echte Küstenlinie ein Projekt mit Geländeaufnahme als Ziel wählen.</p>}
        {(surveyError || fit.error) && <p className="field-error" role="alert">{surveyError || fit.error}</p>}
      </section>
    </div>

    <section className="anlage-panel" aria-labelledby="base-zones-title">
      <h3 id="base-zones-title">Zonen nach Bauphasen</h3>
      {([1, 2, 3, 4] as BasePhase[]).map(phase => {
        const list = zones.filter(z => (layout?.zones.find(p => p.key === z.key)?.phase ?? BASE_FUNCTIONS.find(f => f.id === z.fn)?.phase) === phase);
        if (!list.length) return null;
        return <div key={phase} className="base-phase"><h4>Phase {phase}: {BASE_PHASES[phase].name} <small>{BASE_PHASES[phase].note}</small></h4>
          <ul className="anlage-districts">{list.map(z => <ZoneRow key={z.key} choice={z} plan={layout?.zones.find(p => p.key === z.key) ?? null} lib={lib} focused={focus === z.key}
            onFocus={() => setFocus(z.key)} onPatch={patch => patchZone(z.key, patch)} onRemove={() => setZones(l => l.filter(x => x.key !== z.key))} />)}</ul></div>;
      })}
      <label className="base-add">Zone hinzufügen<select value="" aria-label="Zone hinzufügen" onChange={e => { if (e.target.value) addZone(e.target.value as BaseFunctionId); }}>
        <option value="">Funktion wählen …</option>{missingFns.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
    </section>

    <section className="anlage-panel" aria-labelledby="base-adopt-title">
      <h3 id="base-adopt-title">Übernehmen</h3>
      <div className="anlage-target">
        <label>Ziel<select value={target.kind === 'new' ? '' : target.projectId} aria-label="Zielprojekt" onChange={e => { setAccept(false); setTarget(e.target.value ? { kind: 'project', projectId: e.target.value } : { kind: 'new' }); }}>
          <option value="">Neues Projekt</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {target.kind === 'new' && <label>Projektname<input value={name} maxLength={120} onChange={e => setName(e.target.value)} aria-label="Projektname" /></label>}
        {terrainRef && <label className="chip-check"><input type="checkbox" checked={useTerrain} onChange={e => setUseTerrain(e.target.checked)} /> Geländeaufnahme nutzen</label>}
        {terrainRef && useTerrain && <label>Höhen<select value={mode} onChange={e => setMode(e.target.value as TerrainMode)} aria-label="Höhenanpassung">
          {(Object.keys(TERRAIN_MODE_LABEL) as TerrainMode[]).map(m => <option key={m} value={m}>{TERRAIN_MODE_LABEL[m]}</option>)}</select></label>}
      </div>
      {conflicts > 0 && <label className="chip-check anlage-accept"><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} /> Trotz {conflicts} Voxelkonflikten übernehmen</label>}
      <div className="button-row"><button className="primary" disabled={!canAdopt} onClick={() => void adopt()}>{busy ? 'Wird übernommen …' : target.kind === 'new' ? 'Als neues Projekt anlegen' : 'In Projekt einfügen'}</button></div>
      <p className="small-note">Angelegt werden alle Gebäude, das Wegenetz als eigenes Bauteil und Bauabschnitte „Wege & Platz“ und Phase 1–4 mit den offenen Prüfpunkten als Notiz.</p>
    </section>
  </section>;
}

function ZoneRow({ choice, plan, lib, focused, onFocus, onPatch, onRemove }: {
  choice: BaseZoneChoice; plan: BaseZonePlan | null; lib: AnlageLibrary; focused: boolean;
  onFocus(): void; onPatch(p: Partial<BaseZoneChoice>): void; onRemove(): void;
}) {
  const fn = BASE_FUNCTIONS.find(f => f.id === choice.fn)!;
  const candidates = useMemo(() => mainCandidates(fn, lib.assets), [fn, lib]);
  const main = choice.main ?? fn.members[0]?.assetId ?? RESERVE_ID;
  const countable = fn.members.filter(m => (m.maxCount ?? 1) > 1);
  return <li className={`${choice.off ? 'off' : ''} ${focused ? 'focused' : ''}`} data-zone={choice.key}>
    <header>
      <span className="anlage-dot" style={{ background: fn.color }} aria-hidden="true" />
      <label className="chip-check"><input type="checkbox" checked={!choice.off} onChange={e => onPatch({ off: !e.target.checked })} /> <strong>{plan?.name ?? fn.name}</strong></label>
      <span className="muted">{plan?.rect ? `${size(plan.rect)} Blöcke` : choice.off ? 'abgewählt' : '–'}{plan?.reserved ? ' · Bauplatz frei' : ''}</span>
      <button type="button" className="text-button" onClick={onFocus}>Im Plan zeigen</button>
      <button type="button" className="text-button" onClick={onRemove} aria-label={`Zone ${plan?.name ?? fn.name} entfernen`}>Entfernen</button>
    </header>
    <p className="anlage-purpose">{fn.purpose}</p>
    <div className="anlage-slot-actions">
      <label>Hauptgebäude<select value={main} aria-label={`Hauptgebäude ${plan?.name ?? fn.name}`} onChange={e => onPatch({ main: e.target.value })}>
        {candidates.map(c => <option key={c.assetId} value={c.assetId}>{c.name}</option>)}
        <option value={RESERVE_ID}>Freier Bauplatz{fn.reserve ? ` (${fn.reserve[0]} × ${fn.reserve[1]})` : ''}</option></select></label>
      {countable.map(m => <label key={m.role}>{m.role}<input type="number" min={0} max={m.maxCount} value={choice.counts?.[m.role] ?? m.count ?? 1} aria-label={`Anzahl ${m.role}`}
        onChange={e => { const n = Math.max(0, Math.min(m.maxCount ?? 1, Math.round(Number(e.target.value) || 0))); onPatch({ counts: { ...choice.counts, [m.role]: n } }); }} /></label>)}
    </div>
    {plan && plan.enabled && <ul className="base-reqs">{plan.requirements.map(r => <li key={r.id} className={r.status}><strong>{r.label}</strong> <span>{r.value}</span>{r.hint && <small>{r.hint}</small>}</li>)}</ul>}
    {plan?.problems.map(p => <p key={p} className="field-error">{p}</p>)}
    {fn.hints.length > 0 && <details className="base-hints"><summary>Tipps</summary><ul>{fn.hints.map(h => <li key={h}>{h}</li>)}</ul></details>}
  </li>;
}

/** Top view of the base: water, paths, lanterns, zones with labels (like a drawn map). */
function BaseMap({ layout, focus, onFocus }: { layout: BaseLayout; focus: string | null; onFocus(key: string): void }) {
  const e = layout.extent;
  if (!e) return <p className="muted">Keine Zone.</p>;
  const pad = 8, x0 = e.x0 - pad, z0 = e.z0 - pad, w = e.x1 - e.x0 + 2 * pad, h = e.z1 - e.z0 + 2 * pad;
  const water = layout.water;
  const waterRect = !water ? null : water.side === 'sued' ? { x: x0, y: water.line, w, h: z0 + h - water.line } : water.side === 'nord' ? { x: x0, y: z0, w, h: water.line + 1 - z0 }
    : water.side === 'west' ? { x: x0, y: z0, w: water.line + 1 - x0, h } : { x: water.line, y: z0, w: x0 + w - water.line, h };
  const font = Math.max(3, Math.min(6, w / 40));
  return <svg className="anlage-plan base-map" viewBox={`${x0} ${z0} ${w} ${h}`} role="img" aria-label="Lageplan der Basis" data-testid="base-map">
    <rect x={x0} y={z0} width={w} height={h} fill="#4f7a3a" />
    {waterRect && waterRect.w > 0 && waterRect.h > 0 && <rect x={waterRect.x} y={waterRect.y} width={waterRect.w} height={waterRect.h} fill="#2f6fb5" />}
    <path d={layout.paths.map(([x, z]) => `M${x} ${z}h1v1h-1z`).join('')} fill="#c9b48a" />
    {layout.placements.map(p => <rect key={p.key} x={p.footprint.x0} y={p.footprint.z0} width={p.footprint.x1 - p.footprint.x0} height={p.footprint.z1 - p.footprint.z0} fill="#7b5534" stroke="#2a1c10" strokeWidth={0.3} />)}
    {layout.zones.filter(z => z.rect).map(z => <g key={z.key} onClick={() => onFocus(z.key)} className="base-zone">
      <rect x={z.rect!.x0 - 0.5} y={z.rect!.z0 - 0.5} width={z.rect!.x1 - z.rect!.x0 + 1} height={z.rect!.z1 - z.rect!.z0 + 1} fill={z.fn.color} fillOpacity={z.reserved ? 0.35 : 0.18}
        stroke={z.fn.color} strokeWidth={focus === z.key ? 1.2 : 0.5} strokeDasharray={z.reserved ? '2 1' : undefined} />
      <g transform={`translate(${(z.rect!.x0 + z.rect!.x1) / 2} ${z.rect!.z0 - 1.5})`}>
        <rect x={-(z.name.length * font * 0.3) - 1.5} y={-font} width={z.name.length * font * 0.6 + 3} height={font * 1.35} rx={0.8} fill="#f4ecd8" stroke="#3b2a18" strokeWidth={0.25} />
        <text x={0} y={0} textAnchor="middle" fontSize={font} fill="#2b1d0e" fontWeight={600}>{z.name}</text></g>
    </g>)}
    {layout.lamps.map(([x, z]) => <circle key={`${x},${z}`} cx={x + 0.5} cy={z + 0.5} r={0.7} fill="#ffd36b" />)}
  </svg>;
}
