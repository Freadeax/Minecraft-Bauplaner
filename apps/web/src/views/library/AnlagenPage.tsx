import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { SIDE_LABEL, TERRAIN_MODE_LABEL, EARTHWORK_NOTE, findTerrainSpot, fitAnlageToTerrain } from '../../../../../packages/domain/src/index.js';
import type { AnlageTerrainFit, TerrainMode, TerrainSurvey } from '../../../../../packages/domain/src/index.js';
import { useSurvey } from '../world/surveys';
import { surveyImage } from '../map/terrainLayer';
import type { Cell } from '../../../../../packages/voxel/src/index.js';
import { ANLAGEN, MAX_SPACING, MIN_SPACING, anlageById, anlageIntoProject, applyOperation, besideOffset, createAnlageProject, planAnlage, previewAnlage, resolveProject, swapCandidates, themeOfAnlage } from '../../../../../packages/domain/src/index.js';
import type { Anlage, AnlageChoices, AnlageLibrary, AnlagePlan, AnlagePreview, CatalogEntry, Project, SlotState } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { navigate } from '../../app/router';
import type { LibraryPage } from '../../app/router';
import { errorText, formatNumber } from '../../app/ui';
import { Viewer } from '../../Viewer';
import { Thumb } from '../../thumbnail/Thumb';
import './anlagen.css';

const SHIFT_STEP = 4;
const CONFLICT_MARK = { color: '#ff5f57', amount: 0.85 } as const;
const DISTRICT_COLORS = ['#8be3c0', '#e3c59a', '#9fc4ff', '#f0a3c8', '#c9b6ff', '#a6dd8b', '#ffb98a', '#7fd6e0'];
type Target = { readonly kind: 'new' } | { readonly kind: 'project'; readonly projectId: string };

function safePlan(anlage: Anlage, lib: AnlageLibrary, choices: AnlageChoices): { plan: AnlagePlan | null; error: string } {
  try { return { plan: planAnlage(anlage, lib, choices), error: '' }; } catch (e) { return { plan: null, error: errorText(e) }; }
}
function safePreview(plan: AnlagePlan | null, base: Project | undefined, offset: readonly [number, number], versions: AnlageLibrary['versions'], heights?: ReadonlyMap<string, number>): { preview: AnlagePreview | null; error: string } {
  if (!plan) return { preview: null, error: '' };
  try { return { preview: previewAnlage(plan, { ...(base && { base }), offset, versions, ...(heights && { heights }) }), error: '' }; } catch (e) { return { preview: null, error: errorText(e) }; }
}
/** Survey usable for a target project: same dimension as its world placement. */
const terrainOf = (p: Project | undefined) => p?.world && p.terrain && p.terrain.dimension === p.world.dimension ? p.terrain : null;
const size = (f: { x0: number; z0: number; x1: number; z1: number } | null) => f ? `${f.x1 - f.x0} × ${f.z1 - f.z0}` : '–';

/**
 * Bauwelt-Anlagen (BUILD-05): overview of all Anlagen and a planner per
 * Anlage. Every change only recomputes the preview; projects are created or
 * changed exclusively by the explicit adoption button.
 */
export function AnlagenPage({ id, entries, projects, libHref, onMessage }: {
  id: string | undefined;
  entries: readonly CatalogEntry[];
  projects: readonly Project[];
  libHref(page: LibraryPage, id?: string): string;
  onMessage(text: string, link?: { href: string; label: string }): void;
}) {
  const { library } = useApp();
  const lib = useMemo<AnlageLibrary>(() => ({ assets: library.assets, versions: library.versions }), [library]);
  const anlage = id ? anlageById(id) : undefined;
  if (!anlage) return <AnlagenOverview missingId={id} lib={lib} libHref={libHref} />;
  return <AnlagePlanner key={anlage.id} anlage={anlage} lib={lib} entries={entries} projects={projects} libHref={libHref} onMessage={onMessage} />;
}

function AnlagenOverview({ missingId, lib, libHref }: { missingId: string | undefined; lib: AnlageLibrary; libHref(page: LibraryPage, id?: string): string }) {
  const plans = useMemo(() => ANLAGEN.map(a => ({ anlage: a, ...safePlan(a, lib, {}) })), [lib]);
  return <section className="anlagen" aria-label="Anlagen">
    {missingId && <div className="notice warning" role="alert">Anlage „{missingId}“ gibt es nicht.</div>}
    <div className="anlagen-intro"><div><span className="panel-kicker">BAUWELT ALS ANLAGE</span>
      <h2>Aus einer Bauwelt wird ein geplanter Ort.</h2>
      <p>Jede Anlage ordnet Gebäude und Ensembles einer Bauwelt in Bereiche entlang eines Hauptwegs. Du wählst Bereiche, Abstand und Varianten, siehst echte Voxelkonflikte und übernimmst erst auf Knopfdruck in ein Projekt, mit Bauabschnitten für die Baustelle.</p></div>
      <aside>Feste Versionen: Jeder Platz hält eine bestimmte Bauteilversion fest. Neuere Versionen werden angezeigt, aber nie automatisch übernommen.</aside></div>
    <ul className="anlagen-grid">{plans.map(({ anlage, plan }) => {
      const theme = themeOfAnlage(anlage);
      const buildings = plan?.placements.filter(p => p.kind === 'building').length ?? 0;
      return <li key={anlage.id}><a className="anlage-card" href={libHref('facilities', anlage.id)}>
        <Thumb cacheKey={`anl:${anlage.id}:${plan ? plan.placements.map(p => p.version.id).join(',') : '-'}`} alt={`Vorschau ${anlage.name}`} width={360} height={220}
          payload={() => { if (!plan) return null; try { return previewAnlage(plan, { versions: lib.versions }).resolution.world; } catch { return null; } }} />
        <div className="anlage-card-body"><span className="panel-kicker">{theme?.name ?? anlage.themeId}</span><strong>{anlage.name}</strong>
          <span className="anlage-card-meta">{anlage.districts.length} Bereiche · {buildings} Gebäude · {size(plan?.extent ?? null)} Blöcke{anlage.path ? ` · ${anlage.path === 'weg' ? 'Weg' : 'Straße'}` : ''}</span>
          <span className="anlage-card-text">{anlage.description}</span></div></a></li>;
    })}</ul>
  </section>;
}

function AnlagePlanner({ anlage, lib, entries, projects, libHref, onMessage }: {
  anlage: Anlage; lib: AnlageLibrary; entries: readonly CatalogEntry[]; projects: readonly Project[];
  libHref(page: LibraryPage, id?: string): string;
  onMessage(text: string, link?: { href: string; label: string }): void;
}) {
  const { repo } = useApp();
  const [choices, setChoices] = useState<AnlageChoices>({});
  const [target, setTarget] = useState<Target>({ kind: 'new' });
  const [placement, setPlacement] = useState<'beside' | 'manual'>('beside');
  const [manual, setManual] = useState<[number, number]>([0, 0]);
  const [name, setName] = useState(anlage.name);
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [useTerrain, setUseTerrain] = useState(true);
  const [mode, setMode] = useState<TerrainMode>('terrassen');
  const [searching, setSearching] = useState(false);
  const [spotNote, setSpotNote] = useState('');
  const deferred = useDeferredValue(choices);
  const theme = themeOfAnlage(anlage);

  const { plan, error: planError } = useMemo(() => safePlan(anlage, lib, deferred), [anlage, lib, deferred]);
  const base = target.kind === 'project' ? projects.find(p => p.id === target.projectId) : undefined;
  const baseResolution = useMemo(() => { if (!base) return null; try { return resolveProject(base, lib.versions); } catch { return null; } }, [base, lib]);
  const offset = useMemo<[number, number]>(() => !base ? [0, 0] : placement === 'beside' && plan ? besideOffset(plan, baseResolution) : manual, [base, placement, plan, baseResolution, manual]);
  // Gelände (TERRAIN-01): the target's terrain survey fits the plan to the real ground.
  const terrainRef = terrainOf(base);
  const { survey, error: surveyError } = useSurvey(repo, terrainRef);
  const fit = useMemo((): { fit: AnlageTerrainFit | null; error: string } => {
    if (!plan || !survey || !useTerrain || !base?.world) return { fit: null, error: '' };
    try { return { fit: fitAnlageToTerrain(plan, { survey, origin: base.world.origin, offset, mode }), error: '' }; } catch (e) { return { fit: null, error: errorText(e) }; }
  }, [plan, survey, useTerrain, base, offset, mode]);
  const { preview, error: previewError } = useMemo(() => safePreview(plan, base, offset, lib.versions, fit.fit?.heights), [plan, base, offset, lib, fit]);
  const conflictCells = useMemo(() => new Set(preview?.conflicts.map(c => c.position.join(',')) ?? []), [preview]);
  const markFor = useCallback((cell: Cell) => conflictCells.has(cell.position.join(',')) ? CONFLICT_MARK : null, [conflictCells]);
  const noSelect = useMemo(() => () => {}, []);
  const stale = deferred !== choices;

  const update = (patch: (c: AnlageChoices) => AnlageChoices) => { setAccept(false); setChoices(c => patch(c)); };
  const toggleDistrict = (did: string) => update(c => { const off = new Set(c.off ?? []); off.has(did) ? off.delete(did) : off.add(did); return { ...c, off: [...off] }; });
  const shift = (did: string, dx: number, dz: number) => update(c => { const [x, z] = c.shifts?.[did] ?? [0, 0]; return { ...c, shifts: { ...c.shifts, [did]: [x + dx, z + dz] } }; });
  const resetShift = (did: string) => update(c => { const rest = { ...c.shifts }; delete rest[did]; return { ...c, shifts: rest }; });
  const swap = (slot: SlotState, assetId: string) => update(c => { const rest = { ...c.swaps }; if (assetId === slot.curatedAssetId) delete rest[slot.key]; else rest[slot.key] = assetId; return { ...c, swaps: rest }; });
  const turn = (slot: SlotState) => update(c => ({ ...c, turns: { ...c.turns, [slot.key]: ((slot.turns + 1) % 4) as 0 | 1 | 2 | 3 } }));
  const resetTurn = (slot: SlotState) => update(c => { const rest = { ...c.turns }; delete rest[slot.key]; return { ...c, turns: rest }; });
  const searchSpot = () => {
    if (!plan || !survey || !base?.world) return;
    setSearching(true); setSpotNote('');
    // Let the button show its busy state before the (synchronous) search runs.
    setTimeout(() => {
      try {
        const spot = findTerrainSpot(plan, { survey, origin: base.world!.origin, mode });
        if (!spot) setSpotNote('Die Anlage ist größer als die Geländeaufnahme. Bitte eine größere Fläche aufnehmen oder Bereiche abwählen.');
        else { setAccept(false); setPlacement('manual'); setManual([spot.offset[0], spot.offset[1]]);
          setSpotNote(`Platz mit den wenigsten Erdarbeiten gewählt (${spot.tried} Lagen verglichen): Versatz x ${spot.offset[0]}, z ${spot.offset[1]}, ${formatNumber(spot.fit.totals.fill)} Blöcke Unterbau, ${formatNumber(spot.fit.totals.cut)} Blöcke Abtrag.`); }
      } catch (e) { setSpotNote(`Keine Lage gefunden: ${errorText(e)}`); }
      finally { setSearching(false); }
    }, 30);
  };

  const adopt = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      if (target.kind === 'new') {
        const fresh = previewAnlage(plan, { versions: lib.versions });
        const created = createAnlageProject(fresh, { name, acceptConflicts: accept });
        await repo.saveProject(created, 0);
        navigate({ view: 'project', projectId: created.id, tab: 'editor' });
        return;
      }
      // Re-read the target and recompute the preview against the stored state (never adopt a stale preview).
      const stored = await repo.getProject(target.projectId);
      if (!stored) throw new Error('Projekt nicht mehr vorhanden');
      let storedWorld = null;
      try { storedWorld = resolveProject(stored, lib.versions); } catch { /* unresolved projects: place at the manual/zero offset */ }
      const at = placement === 'beside' ? besideOffset(plan, storedWorld) : manual;
      // Heights from the stored project's terrain (its origin may have changed since the preview).
      const storedRef = terrainOf(stored);
      if (useTerrain && terrainRef && storedRef?.sha256 !== terrainRef.sha256) throw new Error('Die Geländeaufnahme des Projekts wurde seit der Vorschau geändert; bitte Vorschau prüfen');
      const heights = useTerrain && storedRef && survey && stored.world ? fitAnlageToTerrain(plan, { survey, origin: stored.world.origin, offset: at, mode }).heights : undefined;
      const fresh = previewAnlage(plan, { base: stored, offset: at, versions: lib.versions, ...(heights && { heights }) });
      if (fresh.conflicts.length && !accept) throw new Error(`${fresh.conflicts.length} Voxelkonflikt(e) nach Neuberechnung; bitte prüfen und bestätigen`);
      const saved = await repo.saveProject(applyOperation(stored, anlageIntoProject(fresh, stored, { acceptConflicts: accept })).project, stored.revision);
      onMessage(`„${anlage.name}“ in „${saved.name}“ eingefügt: ${fresh.draft.instances.length} Instanzen, ${fresh.draft.sections.length} Bauabschnitte. Rückgängig im Editor möglich.`,
        { href: `#/projekt/${encodeURIComponent(saved.id)}/baustelle`, label: 'Zur Baustelle' });
    } catch (e) { onMessage(`Nicht übernommen: ${errorText(e)}`); }
    finally { setBusy(false); }
  };

  const spacing = choices.spacing ?? anlage.spacing;
  const blockers = plan?.blockers ?? [];
  const conflicts = preview?.conflicts.length ?? 0;
  const overlaps = preview?.spacing.filter(s => s.kind === 'overlap') ?? [];
  const tight = preview?.spacing.filter(s => s.kind === 'tight') ?? [];
  const badLinks = preview?.links.filter(l => l.state !== 'ok') ?? [];
  const buildings = plan?.placements.filter(p => p.kind === 'building').length ?? 0;
  const paths = plan?.placements.filter(p => p.kind === 'path').length ?? 0;
  const totalBlocks = preview ? [...preview.blocks.values()].reduce((a, b) => a + b, 0) : 0;
  const canAdopt = !!preview && !blockers.length && buildings + paths > 0 && (!conflicts || accept) && !busy && !stale && !!name.trim();

  return <section className="building-detail anlage-planner" aria-label="Anlage planen">
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('browse')}>Bibliothek</a><span aria-hidden="true">›</span><a href={libHref('facilities')}>Anlagen</a><span aria-hidden="true">›</span><span aria-current="page">{anlage.name}</span></nav>
    <div className="detail-hero">
      <div className="viewport detail-stage">
        {preview?.resolution.world ? <Viewer key={anlage.id} payload={preview.resolution.world} cells={preview.resolution.world.cells} onSelect={noSelect} markFor={markFor} />
          : <div className="scene empty-scene"><p>{planError || previewError || 'Keine Gebäude ausgewählt.'}</p></div>}
      </div>
      <div className="detail-summary">
        <span className="panel-kicker">ANLAGE · {theme?.name ?? anlage.themeId}</span><h2 className="detail-title">{anlage.name}</h2>
        <p className="detail-lead">{anlage.description}</p>
        <dl className="stat-tiles" aria-live="polite">
          <div><dt>Fläche</dt><dd>{size(plan?.extent ?? null)}</dd></div>
          <div><dt>Gebäude</dt><dd>{buildings}{paths ? <small> + {paths} Weg</small> : null}</dd></div>
          <div><dt>Blöcke</dt><dd>{formatNumber(totalBlocks)}</dd></div>
          <div><dt>Voxelkonflikte</dt><dd data-testid="anlage-conflicts">{conflicts ? <span className="warn-text">{conflicts}</span> : <span className="ok-text">keine</span>}</dd></div>
        </dl>
        {stale && <p className="small-note" role="status">Vorschau wird neu berechnet …</p>}
        {theme && <p className="small-note">Bauwelt: <a href={libHref('themes')}>{theme.name}</a>. Ensembles in Bereichen behalten ihr kuratiertes Layout.</p>}
      </div>
    </div>

    <div className="anlage-columns">
      <section className="anlage-panel" aria-labelledby="anlage-layout-title">
        <h3 id="anlage-layout-title">Lageplan</h3>
        {plan && <SitePlanSvg plan={plan} preview={preview} offset={offset} survey={fit.fit ? survey : null} origin={base?.world?.origin ?? null} fit={fit.fit} />}
        <div className="anlage-controls">
          <label className="anlage-range">Abstand zwischen Gebäuden und zum Weg: <strong>{spacing} Blöcke</strong>
            <input type="range" min={MIN_SPACING} max={MAX_SPACING} value={spacing} onChange={e => update(c => ({ ...c, spacing: Number(e.target.value) }))} aria-label="Abstand in Blöcken" />
            <small>Empfohlen: {anlage.spacing}. {spacing < anlage.spacing ? 'Enger als empfohlen – Zugänge und Freiraum prüfen.' : ''}</small></label>
          {anlage.path && <label className="chip-check"><input type="checkbox" checked={choices.path !== false} onChange={e => update(c => ({ ...c, path: e.target.checked }))} />
            Hauptweg aus {anlage.path === 'weg' ? 'Wegmodulen' : 'Stadtstraßen'} bauen</label>}
          {anlage.path && <label className="chip-check"><input type="checkbox" checked={choices.doors !== false} onChange={e => update(c => ({ ...c, doors: e.target.checked }))} />
            Türen zum Weg drehen <small>({plan?.slots.filter(sl => sl.facesPath).length ?? 0} von {plan?.slots.filter(sl => sl.facesPath !== null).length ?? 0} Eingängen zeigen zum Weg)</small></label>}
        </div>
      </section>

      <section className="anlage-panel" aria-labelledby="anlage-check-title">
        <h3 id="anlage-check-title">Prüfung</h3>
        <ul className="anlage-checks">
          <li className={conflicts ? 'bad' : 'good'}><strong>{conflicts ? `${conflicts} Voxelkonflikt${conflicts === 1 ? '' : 'e'}` : 'Keine Voxelkonflikte'}</strong>
            <span>Blockgenau geprüft{preview && preview.conflictsWithBase ? `, davon ${preview.conflictsWithBase} mit bestehenden Bauten des Zielprojekts` : ''}. Rot markiert in der 3D-Ansicht.</span></li>
          <li className={overlaps.length ? 'bad' : 'good'}><strong>{overlaps.length ? `${overlaps.length} Grundflächen überlappen` : 'Grundflächen getrennt'}</strong>
            <span>Umrisse (Vorfilter, kein Konfliktbeweis){overlaps.length ? `: ${overlaps.slice(0, 3).map(o => `${o.a} / ${o.b}`).join(', ')}${overlaps.length > 3 ? ' …' : ''}` : ''}.</span></li>
          <li className={tight.length ? 'warn' : 'good'}><strong>{tight.length ? `${tight.length} Abstände unter ${spacing}` : 'Abstände eingehalten'}</strong>
            <span>{tight.length ? tight.slice(0, 3).map(o => `${o.a} / ${o.b}: ${o.gap}`).join(', ') : 'Zwischen Gebäuden und zum Weg.'}</span></li>
          <li className={badLinks.length ? 'bad' : 'good'}><strong>{preview?.links.length ? `${preview.links.length - badLinks.length}/${preview.links.length} Anschlüsse verbunden` : 'Keine Anschlüsse'}</strong>
            <span>{anlage.path ? 'Wegmodule werden über ihre Anschlüsse verknüpft.' : 'Diese Anlage hat keinen Weg-Baukasten.'}</span></li>
          {blockers.map(b => <li key={b} className="bad"><strong>Nicht übernehmbar</strong><span>{b}</span></li>)}
          {(planError || previewError) && <li className="bad"><strong>Fehler</strong><span>{planError || previewError}</span></li>}
        </ul>
        {conflicts > 0 && preview && <details className="anlage-conflicts"><summary>Konfliktstellen anzeigen</summary><ol>
          {preview.conflicts.slice(0, 12).map(c => <li key={c.position.join(',')}>x {c.position[0]} · y {c.position[1]} · z {c.position[2]}: {c.instanceIds.map(i => preview.names.get(i) ?? i).join(' / ')}</li>)}
          {conflicts > 12 && <li>… und {conflicts - 12} weitere</li>}</ol></details>}
        {fit.fit ? <p className="small-note">Gelände aus der Geländeaufnahme von „{base!.name}“ ({TERRAIN_MODE_LABEL[fit.fit.mode]}). {EARTHWORK_NOTE}</p>
          : <p className="small-note">Gelände ungeprüft: Die Anlage kennt nur geplante Blöcke{terrainRef ? ', die Geländeaufnahme ist abgeschaltet.' : '. Für Hanglagen einen Bauplatz mit Geländeaufnahme anlegen (Weltimport oder Projektreiter „Gelände“) und hier als Ziel wählen.'}</p>}
      </section>
    </div>

    {terrainRef && <TerrainPanel base={base!} survey={survey} error={surveyError || fit.error} fit={fit.fit} useTerrain={useTerrain} mode={mode} searching={searching} note={spotNote}
      onUse={v => { setAccept(false); setUseTerrain(v); }} onMode={m => { setAccept(false); setMode(m); }} onSearch={searchSpot} />}

    <section className="anlage-panel" aria-labelledby="anlage-districts-title">
      <h3 id="anlage-districts-title">Bereiche und Bauabschnitte</h3>
      <p className="small-note">Reihenfolge = Bauabschnitte auf der Baustelle{anlage.path ? ' (der Hauptweg kommt zuerst)' : ''}. Bereiche abwählen, verschieben oder einzelne Plätze tauschen; jede Änderung berechnet nur die Vorschau neu.</p>
      <ol className="anlage-districts">{anlage.districts.map((district, index) => {
        const layout = plan?.districts.find(x => x.id === district.id);
        const enabled = !(choices.off ?? []).includes(district.id);
        const [sx, sz] = choices.shifts?.[district.id] ?? [0, 0];
        const slots = plan?.slots.filter(sl => sl.districtId === district.id) ?? [];
        return <li key={district.id} className={enabled ? '' : 'off'} data-district={district.id}>
          <header>
            <span className="anlage-dot" style={{ background: DISTRICT_COLORS[index % DISTRICT_COLORS.length] }} aria-hidden="true" />
            <label className="chip-check"><input type="checkbox" checked={enabled} onChange={() => toggleDistrict(district.id)} />{index + 1}. {district.name}</label>
            <span className="muted">{district.side === 'nord' ? 'nördlich' : 'südlich'} des Wegs · {layout?.placements ?? 0} Gebäude · {size(layout?.footprint ?? null)}{preview?.blocks.get(district.id) ? ` · ${formatNumber(preview.blocks.get(district.id)!)} Blöcke` : ''}</span>
          </header>
          <p className="anlage-purpose">{district.purpose}{district.ensemble ? ` Enthält das Ensemble ${district.ensemble.replace(/^ens_/, '')}.` : ''}</p>
          {enabled && <div className="anlage-shift" role="group" aria-label={`${district.name} verschieben`}>
            <span>Verschieben ({sx}, {sz}):</span>
            <button type="button" aria-label={`${district.name} nach Westen`} onClick={() => shift(district.id, -SHIFT_STEP, 0)}>←</button>
            <button type="button" aria-label={`${district.name} nach Osten`} onClick={() => shift(district.id, SHIFT_STEP, 0)}>→</button>
            <button type="button" aria-label={`${district.name} nach Norden`} onClick={() => shift(district.id, 0, -SHIFT_STEP)}>↑</button>
            <button type="button" aria-label={`${district.name} nach Süden`} onClick={() => shift(district.id, 0, SHIFT_STEP)}>↓</button>
            {(sx || sz) ? <button type="button" className="text-button" onClick={() => resetShift(district.id)}>zurücksetzen</button> : null}
          </div>}
          <ul className="anlage-slots">{slots.map(slot => <SlotRow key={slot.key} slot={slot} anlage={anlage} entries={entries} editable={enabled && !slot.ensembleId}
            libHref={libHref} onSwap={a => swap(slot, a)} onTurn={() => turn(slot)} onResetTurn={() => resetTurn(slot)} unit={fit.fit?.units.find(u => u.keys.includes(slot.key)) ?? null} />)}</ul>
        </li>;
      })}</ol>
    </section>

    <section className="anlage-panel anlage-adopt" aria-labelledby="anlage-adopt-title">
      <h3 id="anlage-adopt-title">Übernehmen</h3>
      <p className="small-note">Bis hierhin wurde nichts gespeichert oder platziert. Die Übernahme legt Instanzen mit den festen Versionen, die Wegverbindungen und je Bereich einen Bauabschnitt an.</p>
      <div className="anlage-target">
        <label>Ziel<select value={target.kind === 'new' ? '' : target.projectId} onChange={e => { setAccept(false); setTarget(e.target.value ? { kind: 'project', projectId: e.target.value } : { kind: 'new' }); }}>
          <option value="">Neues Projekt</option>
          {projects.map(p => <option key={p.id} value={p.id}>In „{p.name}“ einfügen{terrainOf(p) ? ' (mit Gelände)' : ''}</option>)}</select></label>
        {target.kind === 'new' ? <label>Projektname<input value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
          : <fieldset className="anlage-offset"><legend>Lage im Projekt</legend>
            <label className="chip-check"><input type="radio" name="anlage-offset" checked={placement === 'beside'} onChange={() => { setAccept(false); setPlacement('beside'); }} />neben die bestehenden Bauten</label>
            <label className="chip-check"><input type="radio" name="anlage-offset" checked={placement === 'manual'} onChange={() => { setAccept(false); setPlacement('manual'); }} />eigener Versatz</label>
            {placement === 'manual' && <span className="anlage-xz">
              <label>x<input type="number" value={manual[0]} onChange={e => { setAccept(false); setManual([Math.trunc(Number(e.target.value) || 0), manual[1]]); }} /></label>
              <label>z<input type="number" value={manual[1]} onChange={e => { setAccept(false); setManual([manual[0], Math.trunc(Number(e.target.value) || 0)]); }} /></label></span>}
            <small>Versatz: x {offset[0]}, z {offset[1]}</small></fieldset>}
      </div>
      {conflicts > 0 && <label className="chip-check anlage-accept"><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} />
        Trotz {conflicts} Voxelkonflikt{conflicts === 1 ? '' : 'en'} übernehmen (sie bleiben im Editor sichtbar und sperren den Export, bis sie gelöst sind)</label>}
      <div className="button-row"><button className="primary" type="button" disabled={!canAdopt} onClick={() => void adopt()}>
        {target.kind === 'new' ? 'Als Projekt anlegen' : 'In Projekt einfügen'}</button></div>
    </section>
  </section>;
}

function SlotRow({ slot, anlage, entries, editable, libHref, onSwap, onTurn, onResetTurn, unit }: {
  slot: SlotState; anlage: Anlage; entries: readonly CatalogEntry[]; editable: boolean;
  libHref(page: LibraryPage, id?: string): string; onSwap(assetId: string): void; onTurn(): void; onResetTurn(): void;
  unit: AnlageTerrainFit['units'][number] | null;
}) {
  const entry = entries.find(e => e.asset.id === slot.assetId);
  const candidates = useMemo(() => editable ? swapCandidates(entries, anlage, slot) : [], [editable, entries, anlage, slot]);
  const status = slot.status === 'ok' ? null : slot.status === 'archived' ? 'archiviert' : slot.status === 'missing-asset' ? 'Bauteil fehlt' : `Version ${slot.pin} fehlt`;
  return <li className={slot.version ? '' : 'missing'}>
    {slot.version ? <Thumb cacheKey={slot.version.id} payload={() => slot.version!.payload} alt="" width={64} height={44} className="thumb mini" /> : <span className="thumb mini" />}
    <div className="anlage-slot-text">
      <a href={libHref('building', slot.assetId)}><strong>{entry?.asset.name ?? slot.assetId}</strong></a>
      <span>{slot.role !== (entry?.asset.name ?? slot.assetId) ? `${slot.role} · ` : ''}{slot.turns ? `${slot.turns * 90}° gedreht · ` : ''}<span className="anlage-pin" title={slot.version?.id}>Version {slot.pin} fest</span>
        {slot.newer && <span className="anlage-newer"> · neuer: {slot.newer} (nicht übernommen)</span>}
        {slot.swapped && <span className="anlage-newer"> · getauscht</span>}
        {status && <span className="warn-text"> · {status}</span>}
        {slot.facesPath !== null && <span className={slot.facesPath ? 'anlage-door ok-text' : 'anlage-door warn-text'} title={slot.entrance ? `Eingang (${slot.entrance.kind === 'door' ? 'Tür' : 'Tor'}) im ${slot.entrance.sides.map(x => SIDE_LABEL[x]).join('/')} des Bauteils` : undefined}>
          {' · '}{slot.facesPath ? `Eingang zum Weg${slot.turnSource === 'door' ? ' (automatisch gedreht)' : ''}` : 'Eingang zeigt nicht zum Weg'}</span>}
        {slot.facesPath === null && !slot.ensembleId && slot.version && anlage.path && <span className="muted"> · ohne Tür</span>}
        {unit && unit.kind === 'building' && <span className="anlage-height"> · Y {unit.baseY}{unit.stepToPath ? ` (${unit.stepToPath > 0 ? '+' : ''}${unit.stepToPath} zum Weg)` : ''}{unit.estimate.fill ? ` · ${formatNumber(unit.estimate.fill)} Unterbau` : ''}{unit.estimate.cut ? ` · ${formatNumber(unit.estimate.cut)} Abtrag` : ''}</span>}</span>
    </div>
    {editable && <div className="anlage-slot-actions">
      {candidates.length > 0 && <select aria-label={`${slot.role} tauschen`} value={slot.assetId} onChange={e => onSwap(e.target.value)}>
        <option value={slot.assetId}>{entry?.asset.name ?? slot.assetId}</option>
        {candidates.map(c => <option key={c.assetId} value={c.assetId}>{c.reason === 'variante' ? 'Variante: ' : ''}{c.name}</option>)}</select>}
      <button type="button" aria-label={`${slot.role} drehen`} onClick={onTurn}>↻ 90°</button>
      {slot.turnSource === 'manual' && <button type="button" className="text-button" onClick={onResetTurn}>automatisch</button>}
    </div>}
  </li>;
}

/** Top view of all footprints: districts coloured, path grey, overlaps outlined; with terrain the height map underneath. */
function SitePlanSvg({ plan, preview, offset, survey, origin, fit }: { plan: AnlagePlan; preview: AnlagePreview | null; offset: readonly [number, number]; survey: TerrainSurvey | null; origin: readonly number[] | null; fit: AnlageTerrainFit | null }) {
  const terrainHref = useMemo(() => { if (!survey) return null; try { return surveyImage(survey).toDataURL(); } catch { return null; } }, [survey]);
  const base = preview && preview.project.instances.length > preview.draft.instances.length ? preview.resolution.placed.filter(p => !preview.draft.instances.some(i => i.id === p.instance.id)) : [];
  const rects = [
    ...base.map(p => ({ key: `base-${p.instance.id}`, f: { x0: p.payload.bounds.min[0], z0: p.payload.bounds.min[2], x1: p.payload.bounds.maxExclusive[0], z1: p.payload.bounds.maxExclusive[2] }, fill: 'var(--muted)', label: p.instance.name, base: true })),
    ...plan.placements.map(p => {
      const i = plan.anlage.districts.findIndex(x => x.id === p.districtId);
      return { key: p.key, f: { x0: p.footprint.x0 + offset[0], z0: p.footprint.z0 + offset[1], x1: p.footprint.x1 + offset[0], z1: p.footprint.z1 + offset[1] },
        fill: p.kind === 'path' ? '#8a9ba6' : DISTRICT_COLORS[i % DISTRICT_COLORS.length]!, label: p.name, base: false };
    }),
  ];
  if (!rects.length) return <p className="small-note">Nichts ausgewählt.</p>;
  const x0 = Math.min(...rects.map(r => r.f.x0)) - 2, z0 = Math.min(...rects.map(r => r.f.z0)) - 2;
  const x1 = Math.max(...rects.map(r => r.f.x1)) + 2, z1 = Math.max(...rects.map(r => r.f.z1)) + 2;
  const conflictNames = new Set(preview?.conflicts.flatMap(c => c.instanceIds.map(i => preview.names.get(i) ?? '')) ?? []);
  const heightOf = new Map(fit?.units.flatMap(u => u.keys.map(k => [k, u] as const)) ?? []);
  return <svg className="anlage-plan" viewBox={`${x0} ${z0} ${x1 - x0} ${z1 - z0}`} role="img" aria-label={`Lageplan, ${x1 - x0 - 4} × ${z1 - z0 - 4} Blöcke, Norden oben${survey ? ', mit Gelände' : ''}`}>
    {terrainHref && survey && origin && <image href={terrainHref} x={survey.minX - origin[0]!} y={survey.minZ - origin[2]!} width={survey.width} height={survey.length} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} opacity={0.85} data-testid="anlage-plan-terrain" />}
    {rects.map(r => <rect key={r.key} x={r.f.x0} y={r.f.z0} width={r.f.x1 - r.f.x0} height={r.f.z1 - r.f.z0} fill={r.fill} fillOpacity={r.base ? 0.35 : 0.55}
      stroke={conflictNames.has(r.label) ? '#ff5f57' : 'rgba(0,0,0,.45)'} strokeWidth={conflictNames.has(r.label) ? 1.2 : 0.3}><title>{r.label}{r.base ? ' (bestehend)' : ''}{heightOf.get(r.key) ? ` · Y ${heightOf.get(r.key)!.baseY}` : ''}</title></rect>)}
    <text x={x1 - 1} y={z0 + 4} fontSize="3.5" textAnchor="end" fill="currentColor">N ↑</text>
  </svg>;
}

/** Gelände-Panel (TERRAIN-01): mode, totals, units with heights and earthwork, flattest spot. */
function TerrainPanel({ base, survey, error, fit, useTerrain, mode, searching, note, onUse, onMode, onSearch }: {
  base: Project; survey: TerrainSurvey | null; error: string; fit: AnlageTerrainFit | null; useTerrain: boolean; mode: TerrainMode; searching: boolean; note: string;
  onUse(v: boolean): void; onMode(m: TerrainMode): void; onSearch(): void;
}) {
  const t = fit?.totals;
  const units = fit?.units.filter(u => u.kind !== 'path') ?? [];
  const path = fit?.units.find(u => u.kind === 'path');
  return <section className="anlage-panel anlage-terrain" aria-labelledby="anlage-terrain-title">
    <h3 id="anlage-terrain-title">Gelände</h3>
    <p className="small-note">Geländeaufnahme von „{base.name}“: {base.terrain!.area.width} × {base.terrain!.area.length} Blöcke ab X {base.terrain!.area.minX}, Z {base.terrain!.area.minZ}. Das Projekt liegt bei X {base.world!.origin[0]} · Y {base.world!.origin[1]} · Z {base.world!.origin[2]}.</p>
    {error && <p className="notice warning" role="alert">{error}</p>}
    {!survey && !error && <p role="status">Geländeaufnahme wird geladen …</p>}
    <div className="anlage-controls">
      <label className="chip-check"><input type="checkbox" checked={useTerrain} onChange={e => onUse(e.target.checked)} /> Anlage ans Gelände anpassen</label>
      {useTerrain && <div className="seg" role="group" aria-label="Höhenanpassung">
        {(Object.keys(TERRAIN_MODE_LABEL) as TerrainMode[]).map(m => <button key={m} type="button" aria-pressed={mode === m} onClick={() => onMode(m)}>{TERRAIN_MODE_LABEL[m]}</button>)}</div>}
      {useTerrain && <button type="button" className="secondary" disabled={!survey || searching} onClick={onSearch}>{searching ? 'Suche läuft …' : 'Flachsten Platz suchen'}</button>}
    </div>
    {note && <p className="anlage-terrain-note" role="status">{note}</p>}
    {fit && t && <>
      <dl className="stat-tiles" data-testid="anlage-terrain-totals">
        <div><dt>Unterbau</dt><dd>{formatNumber(t.fill)}</dd></div>
        <div><dt>Abtrag</dt><dd>{formatNumber(t.cut)}</dd></div>
        <div><dt>Im Wasser</dt><dd>{t.water}</dd></div>
        <div><dt>Unbekannt</dt><dd>{t.unknown ? <span className="warn-text">{t.unknown}</span> : 0}</dd></div>
      </dl>
      {path && <p className="small-note">Hauptweg auf Y {path.baseY} (eine Höhe, damit die Wegmodule verbunden bleiben){path.estimate.fill || path.estimate.cut ? `: ${formatNumber(path.estimate.fill)} Blöcke Unterbau, ${formatNumber(path.estimate.cut)} Abtrag` : ''}.</p>}
      <ul className="anlage-checks">{fit.notes.map(n => <li key={n} className="warn"><span>{n}</span></li>)}</ul>
      <details className="anlage-terrain-units"><summary>Höhen je Gebäude ({units.length})</summary>
        <table><thead><tr><th>Einheit</th><th>Y</th><th>zum Weg</th><th>Hang</th><th>Unterbau</th><th>Abtrag</th></tr></thead>
          <tbody>{units.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.baseY}</td><td>{u.stepToPath === null ? '–' : `${u.stepToPath > 0 ? '+' : ''}${u.stepToPath}`}</td><td>{u.slope ?? '–'}</td>
            <td>{formatNumber(u.estimate.fill)}</td><td>{formatNumber(u.estimate.cut)}</td></tr>)}</tbody></table></details>
    </>}
  </section>;
}
