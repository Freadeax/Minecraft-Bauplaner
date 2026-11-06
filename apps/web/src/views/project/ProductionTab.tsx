import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  addFarm, analyzeProduction, COVER_WAY_LABEL, detectFarms, dimensionOf, FARM_GROUPS, FARM_MODE_LABEL, FARM_RANGE_LABEL, FARM_STATE_LABEL, FARM_TYPES, farmCostOf, farmsOnMap, farmType,
  logHarvest, MAX_UNITS, newWorldItemId, paceOf, planProgramWithMaterial, productionOf, productionText, programOf, removeFarm, removeHarvest, setProductionSettings, siteOf, siteOperation,
  splitGathering, updateFarm, worldDimensionOf, teamChests, suggestChests, SUGGESTION_TARGET_DAYS, MIN_SAVED_HOURS,
  FURNACE_LINE_BUILDINGS, FURNACE_TARGET_HOURS, furnaceBuildingOf, furnaceLineOperation, furnaceLineOptions,
} from '../../../../../packages/domain/src/index.js';
import type {
  AfkSpot, FarmCost, FurnaceBuilding, Operation, Project, SiteOverview, AssetVersion, FarmDimension, FarmPlace, FarmState, FarmStatus, FarmSuggestion, GatherAssignment, ProductionCoverageLine, ProductionReport, SitePlan, WorldItem,
} from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { download, errorText, formatNumber, localToday } from '../../app/ui';
import { useWorldPlan } from '../map/useWorldPlan';
import { isResolved } from './session';
import type { ProjectSession } from './session';
import '../../styles/site.css';
import { More } from '../../app/More';
import '../../styles/production.css';

const short = (id: string): string => id.replace(/^minecraft:/, '');
const num = (n: number): string => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const hoursText = (h: number): string => h < 1 ? `${Math.round(h * 60)} min` : `${num(h)} h`;
const daysText = (d: number | null): string => d === null ? 'offen' : d === 0 ? 'sofort' : `${num(d)} ${d === 1 ? 'Tag' : 'Tage'}`;
const today = localToday;
const fileStem = (name: string): string => name.replace(/[^\p{L}\p{N}_-]+/gu, '_');
const placeText = (p: FarmPlace): string => `${p.dimension} ${p.x} / ${p.y} / ${p.z}`;
const DIMS: readonly FarmDimension[] = ['Oberwelt', 'Nether', 'Ende'];

type Save = (next: SitePlan | (() => SitePlan), label: string) => void;

/**
 * Produktion (PROD-01…04): farms of the project with harvest log, coverage of
 * the gathering plan by farms and hand work, readiness per build section
 * against the program schedule, farm suggestions with payback, furnaces and
 * fuel, storage and logistics, AFK spot and gathering jobs per builder. All
 * rules in domain production.ts / productionPlan.ts; edits go through
 * undoable `site.set` operations.
 */
export function ProductionTab({ session }: { session: ProjectSession }) {
  const { library, repo } = useApp();
  const world = useWorldPlan(repo);
  const { project, resolution, computation } = session;
  const site = siteOf(project), production = productionOf(site);
  const [message, setMessage] = useState('');
  // Result of „Ofenstraße einplanen“ with its own undo (the tab has no undo button; the details fold closes on recompute).
  const [placed, setPlaced] = useState('');
  const save: Save = (next, label) => { try { setMessage(session.execute(siteOperation(typeof next === 'function' ? next() : next, label))); } catch (e) { setMessage(errorText(e)); } };
  const overview = computation?.site.plan ?? null, guide = computation?.guide ?? null, progress = computation?.site.progress ?? null;

  // Same schedule as the planning tab: it waits for material when the program says so (PROJ-02).
  const schedule = useMemo(() => overview && site.sections.length ? planProgramWithMaterial(site, overview, paceOf(site), today()).plan.sections : undefined, [site, overview]);
  // Build cost of the catalogue farm buildings (latest version of each), computed once per library state.
  const farmCosts = useMemo(() => {
    const costs = new Map<string, FarmCost>();
    for (const t of FARM_TYPES) {
      if (!t.buildingId || costs.has(t.buildingId)) continue;
      const asset = library.assets.find(a => a.id === t.buildingId), v = asset ? library.versions.get(asset.versionIds[asset.versionIds.length - 1]!) : undefined;
      if (v) { try { costs.set(t.buildingId, farmCostOf(v.payload)); } catch { /* unreadable payload: cost stays unknown */ } }
    }
    return costs;
  }, [library]);
  // Furnace buildings of the catalogue (PROD-03-Folge): Ofenstraße and the chainable module, latest version each.
  const furnaceBuildings = useMemo(() => FURNACE_LINE_BUILDINGS.flatMap(id => {
    const asset = library.assets.find(a => a.id === id), v = asset ? library.versions.get(asset.versionIds[asset.versionIds.length - 1]!) : undefined;
    if (!asset || !v) return [];
    try { const b = furnaceBuildingOf({ assetId: id, versionId: v.id, name: asset.name, payload: v.payload }); return b ? [b] : []; } catch { return []; }
  }), [library]);
  const besideX = isResolved(resolution) && resolution.world ? resolution.world.bounds.maxExclusive[0] + 1 : 0;
  const report = useMemo(() => overview ? analyzeProduction({ site, overview, pace: paceOf(site), farmCosts, ...(schedule && { schedule }) }) : null, [site, overview, farmCosts, schedule]);
  const detected = useMemo(() => {
    if (!guide || !progress) return [];
    const blocks = new Map<string, { all: number; done: number }>();
    for (const s of guide.steps) { const b = blocks.get(s.instanceId) ?? { all: 0, done: 0 }; b.all += s.blocks; if (progress.status.get(s.id) === 'done') b.done += s.blocks; blocks.set(s.instanceId, b); }
    return detectFarms(production, project.instances.map(i => {
      const b = blocks.get(i.id);
      return { id: i.id, name: i.name, assetId: library.versions.get(i.assetVersionId)?.assetId ?? '', built: b && b.all ? b.done / b.all : 0 };
    }));
  }, [guide, progress, production, project.instances, library.versions]);
  const mapFarms = useMemo(() => farmsOnMap(production, world.plan.items), [production, world.plan.items]);
  const ownSite = world.plan.items.find((i): i is Extract<WorldItem, { kind: 'site' }> => i.kind === 'site' && i.projectId === project.id) ?? null;
  const builders = programOf(site).builders;
  const assignments = useMemo(() => report ? splitGathering(report.coverage, builders) : [], [report, builders]);

  if (session.computationState !== 'ready') return <section className="site prod" aria-label="Produktion"><p role="status">{session.computationState === 'pending' ? 'Produktion wird neu berechnet.' : session.computationState === 'cancelled' ? 'Berechnung abgebrochen.' : 'Produktion nicht verfügbar.'}</p></section>;
  if (!isResolved(resolution)) return <section className="site prod" aria-label="Produktion"><div className="notice warning" role="alert"><strong>Produktion nicht verfügbar</strong><p>{resolution.error}</p></div></section>;
  if (!report || !overview) return <section className="site prod" aria-label="Produktion"><p role="alert">Die Produktionsplanung konnte nicht erstellt werden.</p></section>;

  const t = report.totals;
  const sitePlace: FarmPlace | null = ownSite ? { x: ownSite.minX + Math.floor(ownSite.width / 2), y: ownSite.y ?? 64, z: ownSite.minZ + Math.floor(ownSite.length / 2), dimension: dimensionOf(ownSite.dimension) } : null;
  const addToMap = async (name: string, at: FarmPlace, type: 'farm' | 'treffpunkt'): Promise<void> => {
    const item: WorldItem = { kind: 'point', id: newWorldItemId('point'), name, note: type === 'farm' ? `Aus Projekt „${project.name}“ (Produktion)` : `AFK-Platz für „${project.name}“`, dimension: worldDimensionOf(at.dimension), type, x: at.x, y: at.y, z: at.z };
    const inverse = await world.commit({ kind: 'add', item });
    setMessage(inverse ? `„${name}“ auf der Weltkarte eingetragen.` : world.error || 'Eintragen auf der Weltkarte fehlgeschlagen.');
  };

  return <section className="site prod" aria-label="Produktion">
    <header className="site-overview" aria-label="Produktionsübersicht">
      <div className="site-kpi wide"><span className="panel-kicker">MATERIAL KOMPLETT · PROJEKTION</span>
        <strong>{t.missing === 0 ? '✓ Alles da' : t.readyDays === null ? 'offen' : `in ${daysText(t.readyDays)}`}</strong>
        <small>{t.missing === 0 ? 'Der Sammelplan der Baustelle ist gedeckt.' : `${formatNumber(t.missing)} Items fehlen · ${num(production.gatherHoursPerDay)} h Sammelzeit je Tag${production.afkHoursPerDay ? ` + ${num(production.afkHoursPerDay)} h AFK` : ''}${t.unknown ? ` · ${t.unknown} ohne Richtwert` : ''}`}</small></div>
      <div className="site-kpi"><span className="panel-kicker">ENGPASS</span><strong className="site-current">{t.bottleneck ? short(t.bottleneck.itemId) : '–'}</strong><small>{t.bottleneck?.why ?? 'Kein Engpass'}</small></div>
      <div className="site-kpi"><span className="panel-kicker">HANDARBEIT</span><strong>{hoursText(t.handHours)}</strong><small>{t.handDays === null ? 'Sammelzeit je Tag ist 0' : `${daysText(t.handDays)} bei ${num(production.gatherHoursPerDay)} h/Tag`}</small></div>
      <div className="site-kpi"><span className="panel-kicker">FARMEN</span><strong>{t.running} / {production.farms.length}</strong><small>{t.running ? `${formatNumber(t.farmPerDay)} Items je Spieltag` : 'Keine Farm läuft'}</small></div>
      <div className="site-kpi"><span className="panel-kicker">BAUBEGINN GEFÄHRDET</span><strong className={t.late ? 'bad' : undefined}>{t.late || '–'}</strong>
        <small>{schedule ? (t.late ? 'Abschnitte, deren Material nach dem geplanten Baubeginn fertig wird' : programOf(site).waitForMaterial ? 'Die Planung wartet auf das Material' : 'Material rechtzeitig laut Planung') : 'Ohne Bauabschnitte kein Zeitplan'}</small></div>
    </header>
    {message && <div className="notice warning" role="alert">{message}<button onClick={() => setMessage('')}>OK</button></div>}
    {placed && <div className="notice prod-placed" role="status" aria-label="Ofenstraße eingeplant">{placed} <a href={`#/projekt/${project.id}/planung`}>Zur Planung</a>
      <button type="button" className="secondary" onClick={() => { session.undo(); setPlaced(''); }}>Rückgängig</button><button type="button" onClick={() => setPlaced('')}>OK</button></div>}
    {/* UX-01-S06: Farmen, Deckung und Bereitschaft zuerst; Einstellungen und Detailrechnungen eingeklappt. */}
    <More className="prod-settings-more" title="Zeitbudget und Server" hint={`${num(production.gatherHoursPerDay)} h Sammelzeit je Spieltag · nur ändern, wenn du anders spielst`}>
      <Settings production={production} site={site} save={save} />
    </More>
    <Farms report={report} site={site} save={save} sitePlace={sitePlace} onMap={addToMap} />
    <Found detected={detected} mapFarms={mapFarms} site={site} save={save} sitePlace={sitePlace} projectId={project.id} />
    <Coverage report={report} />
    <Readiness report={report} projectId={project.id} hasProgram={!!site.program} />
    <Suggestions suggestions={report.suggestions} site={site} save={save} missing={t.missing} />
    <Jobs assignments={assignments} projectId={project.id} />
    <More className="prod-more" title="Öfen, Lager, AFK-Platz und Produktionsblatt" hint="Detailrechnungen und Teilen als Text">
      <Furnaces report={report} furnaceLine={<FurnaceLine report={report} project={project} overview={overview} buildings={furnaceBuildings} besideX={besideX} versions={library.versions} run={(op, done) => { try { const error = session.execute(op); if (error) setMessage(error); else setPlaced(done); } catch (e) { setMessage(errorText(e)); } }} />} />
      <Logistics report={report} boxes={paceOf(site).boxesPerSession} />
      <Afk report={report} site={site} save={save} sitePlace={sitePlace} onMap={addToMap} />
      <section className="site-block" aria-label="Teilen und Hinweise">
        <div className="site-head"><h3>Produktionsblatt <small>alles oben als Text – zum Teilen, Drucken oder für Mitspieler</small></h3>
          <button className="materials-csv" onClick={() => download(`${fileStem(project.name)}-produktion.txt`, productionText(report, project.name, assignments), 'text/plain;charset=utf-8')}>⤓ Als Text</button>
          <button className="materials-csv" onClick={() => { void navigator.clipboard?.writeText(productionText(report, project.name, assignments)).then(() => setMessage('Produktionsblatt kopiert.'), () => setMessage('Kopieren nicht erlaubt – bitte „Als Text“ nutzen.')); }}>Kopieren</button></div>
        <ul className="materials-notes">{report.notes.map(n => <li key={n}>{n}</li>)}</ul>
      </section>
    </More>
  </section>;
}

function NumberField({ value, label, min, max, step = 1, onCommit, unit }: { value: number; label: string; min: number; max: number; step?: number; onCommit(n: number): void; unit?: string }) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) { setSeen(value); setText(String(value)); }
  const commit = () => { const n = Math.min(max, Math.max(min, Number(text.replace(',', '.')))); if (Number.isFinite(n) && n !== value) onCommit(n); else setText(String(value)); };
  return <label className="prod-field">{label}<span><input type="number" min={min} max={max} step={step} value={text} aria-label={label} inputMode="decimal"
    onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }} />{unit && <small>{unit}</small>}</span></label>;
}

function Settings({ production, site, save }: { production: ReturnType<typeof productionOf>; site: SitePlan; save: Save }) {
  return <section className="site-block" aria-label="Zeitbudget">
    <div className="site-head"><h3>Zeitbudget und Server <small>bestimmt, wie lange Farmen laufen und wie schnell Handarbeit vorangeht</small></h3></div>
    <div className="prod-settings">
      <NumberField label="Sammelzeit je Spieltag" unit="h" min={0} max={24} step={0.25} value={production.gatherHoursPerDay} onCommit={n => save(() => setProductionSettings(site, { gatherHoursPerDay: n }), `Sammelzeit ${n} h/Tag`)} />
      <NumberField label="AFK-Zeit je Spieltag" unit="h" min={0} max={24} step={0.5} value={production.afkHoursPerDay} onCommit={n => save(() => setProductionSettings(site, { afkHoursPerDay: n }), `AFK-Zeit ${n} h/Tag`)} />
      <NumberField label="Simulationsdistanz" unit="Chunks" min={2} max={32} value={production.simulationDistance} onCommit={n => save(() => setProductionSettings(site, { simulationDistance: Math.round(n) }), `Simulationsdistanz ${Math.round(n)}`)} />
      <p className="muted">Während der Sammelzeit laufen Farmen in deiner Nähe mit; in der AFK-Zeit nur die, die der AFK-Platz erreicht. Paper und Vanilla stehen auf Simulationsdistanz 10 (server.properties: <code>simulation-distance</code>).</p>
    </div>
  </section>;
}

function PlaceEditor({ value, onCommit, sitePlace }: { value: FarmPlace | undefined; onCommit(p: FarmPlace | null): void; sitePlace: FarmPlace | null }) {
  const [p, setP] = useState<FarmPlace>(value ?? sitePlace ?? { x: 0, y: 64, z: 0, dimension: 'Oberwelt' });
  const set = (k: 'x' | 'y' | 'z', v: string) => setP({ ...p, [k]: Math.round(Number(v) || 0) });
  return <form className="prod-place" onSubmit={e => { e.preventDefault(); onCommit(p); }} aria-label="Ort der Farm">
    {(['x', 'y', 'z'] as const).map(k => <input key={k} type="number" value={p[k]} onChange={e => set(k, e.target.value)} aria-label={`${k.toUpperCase()}-Koordinate`} placeholder={k.toUpperCase()} />)}
    <select value={p.dimension} onChange={e => setP({ ...p, dimension: e.target.value as FarmDimension })} aria-label="Dimension">{DIMS.map(d => <option key={d}>{d}</option>)}</select>
    <button type="submit">Ort speichern</button>
    {value && <button type="button" onClick={() => onCommit(null)}>Ort löschen</button>}
  </form>;
}

function Farms({ report, site, save, sitePlace, onMap }: { report: ProductionReport; site: SitePlan; save: Save; sitePlace: FarmPlace | null; onMap(name: string, at: FarmPlace, type: 'farm'): Promise<void> }) {
  const [type, setType] = useState(FARM_TYPES[0]!.id);
  const [units, setUnits] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const chosen = farmType(type)!;
  return <section className="site-block" aria-label="Farmen">
    <div className="site-head"><h3>Farmen <small>was dein Projekt mit Material versorgt · Raten sind Richtwerte, bis du Ernten einträgst</small></h3>
      <form className="prod-add" onSubmit={e => { e.preventDefault(); save(() => addFarm(site, { type, units }), `Farm „${chosen.name}“ angelegt`); }}>
        <select value={type} onChange={e => setType(e.target.value)} aria-label="Farmart">
          {FARM_GROUPS.map(g => <optgroup key={g} label={g}>{FARM_TYPES.filter(f => f.group === g).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>)}
        </select>
        <input type="number" min={1} max={MAX_UNITS} value={units} onChange={e => setUnits(Math.max(1, Math.min(MAX_UNITS, Math.round(Number(e.target.value) || 1))))} aria-label="Anzahl Einheiten" />
        <button type="submit" className="primary">+ Farm</button>
      </form>
    </div>
    <p className="muted prod-typeinfo">{chosen.unit} · {FARM_MODE_LABEL[chosen.mode]} · {chosen.outputs.map(o => `${num(o.perHour)} ${short(o.item)}/h`).join(', ')} · {chosen.dimension}{chosen.buildingId && <> · <a href={`#/bibliothek/gebaeude/${chosen.buildingId}`}>Bauplan in der Bibliothek</a></>}</p>
    {!report.farms.length ? <div className="notice">Noch keine Farmen. Leg oben eine an, übernimm unten eine aus deinem Projekt oder der Weltkarte – oder schau bei „Lohnt sich eine Farm?“.</div> :
      <ul className="prod-farms">{report.farms.map(f => <FarmCard key={f.farm.id} f={f} site={site} save={save} open={open === f.farm.id} onToggle={() => setOpen(open === f.farm.id ? null : f.farm.id)} sitePlace={sitePlace} onMap={onMap} />)}</ul>}
  </section>;
}

function FarmCard({ f, site, save, open, onToggle, sitePlace, onMap }: { f: FarmStatus; site: SitePlan; save: Save; open: boolean; onToggle(): void; sitePlace: FarmPlace | null; onMap(name: string, at: FarmPlace, type: 'farm'): Promise<void> }) {
  const { farm, type } = f;
  const log = productionOf(site).log.filter(h => h.farmId === farm.id);
  const [item, setItem] = useState(type.outputs[0]!.item);
  const [count, setCount] = useState('');
  const [hours, setHours] = useState('');
  const book = () => {
    const c = Math.round(Number(count)), h = Number(hours.replace(',', '.'));
    if (!(c > 0) || !(h > 0)) return;
    save(() => logHarvest(site, { farmId: farm.id, itemId: item, count: c, hours: h, day: today() }), `Ernte ${c} ${short(item)} aus „${farm.name}“`);
    setCount(''); setHours('');
  };
  return <li className={`prod-farm state-${farm.state}`}>
    <div className="prod-farm-main">
      <div className="prod-farm-title"><strong>{farm.name}</strong>
        <small>{type.name !== farm.name ? `${type.name} · ` : ''}{type.unit} · {FARM_MODE_LABEL[type.mode]}{farm.at ? ` · ${placeText(farm.at)}` : ''}{farm.instanceId ? ' · im Projekt verbaut' : ''}</small></div>
      <div className="prod-farm-ctrl">
        <button onClick={() => save(() => updateFarm(site, farm.id, { units: farm.units - 1 }), `„${farm.name}“: ${farm.units - 1} Einheiten`)} disabled={farm.units <= 1} aria-label={`${farm.name} eine Einheit weniger`}>−</button>
        <span className="prod-units" aria-label="Einheiten">{farm.units}×</span>
        <button onClick={() => save(() => updateFarm(site, farm.id, { units: farm.units + 1 }), `„${farm.name}“: ${farm.units + 1} Einheiten`)} disabled={farm.units >= MAX_UNITS} aria-label={`${farm.name} eine Einheit mehr`}>+</button>
        <select value={farm.state} onChange={e => save(() => updateFarm(site, farm.id, { state: e.target.value as FarmState }), `„${farm.name}“: ${FARM_STATE_LABEL[e.target.value as FarmState]}`)} aria-label={`Zustand ${farm.name}`}>
          {(Object.keys(FARM_STATE_LABEL) as FarmState[]).map(s => <option key={s} value={s}>{FARM_STATE_LABEL[s]}</option>)}
        </select>
        <button onClick={onToggle} aria-expanded={open}>{open ? 'Schließen' : 'Ernte & Details'}</button>
        <button onClick={() => { if (!log.length || window.confirm(`„${farm.name}“ mit ${log.length} Ernten entfernen? Der eingetragene Lagerbestand bleibt.`)) save(() => removeFarm(site, farm.id), `Farm „${farm.name}“ entfernt`); }} aria-label={`${farm.name} entfernen`}>✕</button>
      </div>
    </div>
    <div className="prod-rates">{f.rates.map(r => <span key={r.itemId} className={`prod-rate ${r.source !== 'Richtwert' ? 'measured' : ''}`} title={r.source === 'Richtwert' ? 'Richtwert' : `${r.source === 'Lagerkiste' ? 'aus der Sammeltruhe' : 'aus dem Ertragsbuch'} über ${r.measuredHours} h`}>
      <code>{short(r.itemId)}</code> {num(r.perHour)}/h{f.running && r.perDay ? ` · ${num(r.perDay)}/Tag` : ''} <em>{r.source}</em></span>)}</div>
    {f.inputs.length > 0 && <p className="muted">Verbraucht: {f.inputs.map(i => `${short(i.itemId)} ${num(i.perDay)}/Tag (Farmen liefern ${num(i.suppliedPerDay)})`).join(' · ')}</p>}
    {f.issues.length > 0 && <ul className="prod-issues">{f.issues.map(i => <li key={i}>{i}</li>)}</ul>}
    {open && <div className="prod-farm-detail">
      <form className="prod-harvest" onSubmit={e => { e.preventDefault(); book(); }} aria-label={`Ernte für ${farm.name} eintragen`}>
        <strong>Ernte eintragen</strong>
        <select value={item} onChange={e => setItem(e.target.value)} aria-label="Geerntetes Item">{type.outputs.map(o => <option key={o.item} value={o.item}>{short(o.item)}</option>)}</select>
        <input type="number" min={1} value={count} onChange={e => setCount(e.target.value)} placeholder="Menge" aria-label="Menge" />
        <input type="number" min={0.1} step={0.1} value={hours} onChange={e => setHours(e.target.value)} placeholder={type.mode === 'auto' ? 'Laufzeit h' : 'Arbeitszeit h'} aria-label={type.mode === 'auto' ? 'Laufzeit seit der letzten Ernte in Stunden' : 'Arbeitszeit in Stunden'} />
        <button type="submit" className="primary" disabled={!(Number(count) > 0) || !(Number(hours.replace(',', '.')) > 0)}>Ins Lager buchen</button>
        <small className="muted">Die Menge kommt ins Baustellen-Lager; ab einer Stunde Laufzeit rechnet der Planer mit deiner gemessenen Rate.</small>
      </form>
      {log.length > 0 && <table className="materials-table prod-log"><thead><tr><th>Tag</th><th>Item</th><th className="num">Menge</th><th className="num">Stunden</th><th /></tr></thead>
        <tbody>{[...log].reverse().slice(0, 12).map(h => <tr key={h.id}><td>{h.day}</td><td><code>{short(h.itemId)}</code></td><td className="num">{formatNumber(h.count)}</td><td className="num">{num(h.hours)}</td>
          <td><button className="link-button" onClick={() => save(() => removeHarvest(site, h.id), `Ernte vom ${h.day} entfernt`)}>Entfernen</button></td></tr>)}</tbody></table>}
      <div className="prod-place-row"><strong>Ort</strong>
        <PlaceEditor value={farm.at} sitePlace={sitePlace} onCommit={p => save(() => updateFarm(site, farm.id, { at: p }), p ? `Ort von „${farm.name}“ gesetzt` : `Ort von „${farm.name}“ gelöscht`)} />
        {farm.at && !farm.pointId && <button className="link-button" onClick={() => void onMap(farm.name, farm.at!, 'farm')}>Auf Weltkarte eintragen</button>}</div>
      <ChestLink f={f} site={site} save={save} />
      <p className="muted"><strong>Bedingungen:</strong> {type.needs.join(' · ')} · {FARM_RANGE_LABEL[type.range]}</p>
      <p className="muted"><strong>Richtwert:</strong> {type.basis}</p>
      {f.logistics && <p className="muted"><strong>Logistik:</strong> {formatNumber(f.logistics.itemsPerHour)} Items/h · {f.logistics.hoppers} Trichterstrang · Truhe voll nach {num(f.logistics.chestHours)} h, Doppeltruhe nach {num(f.logistics.doubleChestHours)} h</p>}
    </div>}
  </li>;
}

function Found({ detected, mapFarms, site, save, sitePlace, projectId }: { detected: ReturnType<typeof detectFarms>; mapFarms: ReturnType<typeof farmsOnMap>; site: SitePlan; save: Save; sitePlace: FarmPlace | null; projectId: string }) {
  const newOnes = detected.filter(d => !d.farmId), linked = detected.filter(d => d.farmId);
  const prod = productionOf(site);
  const stale = linked.filter(d => { const f = prod.farms.find(x => x.id === d.farmId); return f && f.state !== d.suggested && f.state !== 'aus' && d.suggested === 'laeuft'; });
  const mapNew = mapFarms.filter(m => !m.farmId);
  const chestSug = suggestChests(prod, site.team);
  const farmName = (id: string) => prod.farms.find(f => f.id === id)?.name ?? id;
  if (!newOnes.length && !mapNew.length && !stale.length && !chestSug.length) return null;
  return <section className="site-block" aria-label="Gefundene Farmen">
    <div className="site-head"><h3>Gefunden <small>Farmen im Projekt und auf der <a href="#/karte">Weltkarte</a>, die noch nicht in der Liste stehen</small></h3></div>
    <ul className="prod-found">
      {newOnes.map(d => <li key={d.instanceId}><span><strong>{d.instanceName}</strong> <small>Bauteil im Projekt · {d.type.name} · {Math.round(d.built * 100)} % gebaut</small></span>
        <button onClick={() => save(() => addFarm(site, { type: d.type.id, name: d.instanceName, instanceId: d.instanceId, state: d.suggested, ...(sitePlace && { at: sitePlace }) }), `Farm „${d.instanceName}“ aus dem Projekt übernommen`)}>Übernehmen ({FARM_STATE_LABEL[d.suggested]})</button></li>)}
      {stale.map(d => <li key={`s-${d.instanceId}`}><span><strong>{d.instanceName}</strong> <small>im Projekt fertig abgehakt – Farm auf „läuft“ setzen?</small></span>
        <button onClick={() => save(() => updateFarm(site, d.farmId!, { state: 'laeuft' }), `„${d.instanceName}“ läuft`)}>Läuft</button></li>)}
      {chestSug.map(c => <li key={`c-${c.farmId}`}><span><strong>{farmName(c.farmId)} ↔ {c.chest.name}</strong> <small>Lagerkiste des Teams · {c.why}</small></span>
        <button onClick={() => save(() => updateFarm(site, c.farmId, { chest: c.chest.id }), `„${farmName(c.farmId)}“ mit Lagerkiste „${c.chest.name}“ verknüpft`)}>Als Sammeltruhe verknüpfen</button></li>)}
      {mapNew.map(m => <li key={m.pointId}><span><strong>{m.name}</strong> <small>Kartenpunkt · {placeText(m.at)}{m.type ? ` · erkannt als ${m.type.name}` : ' · Art bitte wählen'}</small></span>
        {m.type ? <button onClick={() => save(() => addFarm(site, { type: m.type!.id, name: m.name, pointId: m.pointId, at: m.at, state: 'laeuft' }), `Farm „${m.name}“ von der Weltkarte übernommen`)}>Übernehmen</button>
          : <MapTypePick onPick={type => save(() => addFarm(site, { type, name: m.name, pointId: m.pointId, at: m.at, state: 'laeuft' }), `Farm „${m.name}“ von der Weltkarte übernommen`)} />}</li>)}
    </ul>
    {!sitePlace && newOnes.length > 0 && <p className="muted">Tipp: Lege auf der Weltkarte einen Bauplatz für dieses Projekt an, dann bekommen übernommene Farmen automatisch einen Ort (<a href={`#/projekt/${projectId}/editor`}>Projekt</a>).</p>}
  </section>;
}

function MapTypePick({ onPick }: { onPick(type: string): void }) {
  const [t, setT] = useState(FARM_TYPES[0]!.id);
  return <span className="prod-add"><select value={t} onChange={e => setT(e.target.value)} aria-label="Farmart wählen">{FARM_TYPES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><button onClick={() => onPick(t)}>Übernehmen</button></span>;
}

function Coverage({ report }: { report: ProductionReport }) {
  const [all, setAll] = useState(false);
  const rows = all ? report.coverage : report.coverage.slice(0, 15);
  return <section className="site-block" aria-label="Deckung">
    <div className="site-head"><h3>Deckung je Rohstoff <small>Restbedarf aus dem Sammelplan · schnellerer Weg je Item, Handarbeit als gemeinsame Warteschlange</small></h3></div>
    {!report.coverage.length ? <p className="muted">Nichts mehr zu beschaffen – alles im Lager oder abgehakt.</p> : <>
      <div className="table-wrap"><table className="materials-table prod-coverage">
        <thead><tr><th>Rohstoff</th><th className="num">Fehlt</th><th className="num">Farmen/Tag</th><th className="num">Hand/h</th><th>Weg</th><th className="num">Fertig nach</th></tr></thead>
        <tbody>{rows.map((c: ProductionCoverageLine) => <tr key={c.itemId} className={report.totals.bottleneck?.itemId === c.itemId ? 'prod-bottleneck' : c.way === 'offen' ? 'assumed' : undefined}>
          <td><code>{short(c.itemId)}</code><small>{c.activity}{c.dimension ? ` · ${c.dimension}` : ''}{c.kind === 'fuel' ? ' · Ofenbrennstoff' : ''}</small></td>
          <td className="num">{formatNumber(c.missing)}</td>
          <td className="num">{c.autoPerDay ? num(c.autoPerDay) : '–'}{c.farmDays !== null && <small>{daysText(c.farmDays)}</small>}</td>
          <td className="num">{c.handRate ? num(c.handRate) : '–'}{c.handBy === 'Farm' && <small>mit Farm</small>}{c.handHours !== null && <small>{hoursText(c.handHours)}</small>}</td>
          <td><em className={`badge prod-way-${c.way}`}>{COVER_WAY_LABEL[c.way]}</em></td>
          <td className="num">{daysText(c.days)}</td>
        </tr>)}</tbody>
      </table></div>
      {report.coverage.length > 15 && <button className="link-button" onClick={() => setAll(!all)}>{all ? 'Weniger zeigen' : `Alle ${report.coverage.length} zeigen`}</button>}
    </>}
  </section>;
}

function Readiness({ report, projectId, hasProgram }: { report: ProductionReport; projectId: string; hasProgram: boolean }) {
  const open = report.sections.filter(s => !s.complete);
  if (!open.length) return null;
  const withStart = open.some(s => s.start !== null);
  return <section className="site-block" aria-label="Materialbereitschaft">
    <div className="site-head"><h3>Materialbereitschaft je Abschnitt <small>wann das Material eines Abschnitts (und aller davor) beisammen ist{withStart ? ' · verglichen mit dem Baubeginn aus der Planung' : ''}</small></h3>
      <a className="link-button" href={`#/projekt/${projectId}/planung`}>Zur Planung →</a></div>
    <div className="table-wrap"><table className="materials-table prod-ready">
      <thead><tr><th>Abschnitt</th><th className="num">Material da nach</th><th>Engpass</th>{withStart && <th className="num">Baubeginn</th>}</tr></thead>
      <tbody>{open.map(s => <tr key={s.id || 'rest'} className={s.late ? 'prod-late' : undefined}>
        <td>{s.name}{s.handHours > 0 && <small>{hoursText(s.handHours)} Handarbeit</small>}</td>
        <td className="num">{s.readyDay === null ? <em className="badge warn">offen</em> : daysText(s.readyDay)}{s.unknown.length > 0 && <small>ohne Richtwert: {s.unknown.map(short).join(', ')}</small>}</td>
        <td>{s.bottleneck ? <code>{short(s.bottleneck)}</code> : '–'}</td>
        {withStart && <td className="num">{s.start === null ? '–' : s.startDate ?? `Bautag ${s.start + 1}`}{s.late && <small className="bad">Material zu spät</small>}</td>}
      </tr>)}</tbody>
    </table></div>
    {report.totals.late > 0 && <p className="muted">Gegenmittel: Farm vergrößern oder zusätzliche Farm (unten), mehr Sammelzeit je Tag, oder in der <a href={`#/projekt/${projectId}/planung`}>Planung</a> „Abschnitte erst beginnen, wenn ihr Material da ist“ einschalten{hasProgram ? '' : ' (dort zuerst Bauleute/Startdatum festlegen)'}.</p>}
  </section>;
}

const VERDICT_LABEL: Record<FarmSuggestion['verdict'], string> = { lohnt: 'lohnt sich', knapp: 'knapp', 'lohnt nicht': 'lohnt sich nicht', planbar: 'macht planbar', unbekannt: 'Baukosten unbekannt' };

function Suggestions({ suggestions, site, save, missing }: { suggestions: readonly FarmSuggestion[]; site: SitePlan; save: Save; missing: number }) {
  const [all, setAll] = useState(false);
  if (!suggestions.length) return missing ? <section className="site-block" aria-label="Lohnt sich eine Farm?"><div className="site-head"><h3>Lohnt sich eine Farm?</h3></div>
    <p className="muted">Für den Restbedarf spart keine Farm mehr als {MIN_SAVED_HOURS} h Sammelzeit – sammeln geht schneller als bauen.</p></section> : null;
  const rows = all ? suggestions : suggestions.slice(0, 6);
  return <section className="site-block" aria-label="Lohnt sich eine Farm?">
    <div className="site-head"><h3>Lohnt sich eine Farm? <small>gesparte Sammelzeit gegen Bauaufwand (Material sammeln + bauen); Einheiten für {SUGGESTION_TARGET_DAYS} Spieltage</small></h3></div>
    <ul className="prod-suggest">{rows.map(s => <li key={s.type.id} className={`verdict-${s.verdict.replace(' ', '-')}`}>
      <div><strong>{s.type.name}</strong> <em className="badge">{VERDICT_LABEL[s.verdict]}</em>{s.planned && <em className="badge">schon geplant</em>}
        <small>{s.items.map(i => `${formatNumber(i.missing)} ${short(i.itemId)}${i.daysWithOne !== null ? ` (1 Einheit: ${daysText(i.daysWithOne)})` : ''}`).join(' · ')}</small>
        <small>{s.savedHours !== null ? `spart ${hoursText(s.savedHours)} Spielerzeit` : 'Items ohne Richtwert werden planbar'}{s.buildHours !== null ? ` · Aufwand ${hoursText(s.buildHours)} für ${s.units} ${s.units === 1 ? 'Einheit' : 'Einheiten'} (${s.costSource === 'Bauplan' ? 'aus dem Bauplan gezählt' : 'Richtwert'})` : ''}{s.ratio !== null ? ` · ${num(s.ratio)}× zurück` : ''} · {FARM_MODE_LABEL[s.type.mode]}{s.type.dimension !== 'Oberwelt' ? ` · ${s.type.dimension}` : ''}</small></div>
      <div className="prod-suggest-act">
        {s.type.buildingId && <a className="link-button" href={`#/bibliothek/gebaeude/${s.type.buildingId}`}>Bauplan</a>}
        <button onClick={() => save(() => addFarm(site, { type: s.type.id, units: s.units, state: 'plan' }), `Farm „${s.type.name}“ geplant`)}>Als geplant anlegen ({s.units}×)</button>
      </div>
    </li>)}</ul>
    {suggestions.length > 6 && <button className="link-button" onClick={() => setAll(!all)}>{all ? 'Weniger zeigen' : `Alle ${suggestions.length} zeigen`}</button>}
  </section>;
}

function Furnaces({ report, furnaceLine }: { report: ProductionReport; furnaceLine: ReactNode }) {
  const f = report.furnaces;
  if (!f.smelts) return null;
  return <section className="site-block" aria-label="Öfen und Brennstoff">
    <div className="site-head"><h3>Öfen und Brennstoff <small>Schmelzvorgänge für die fehlenden Bauitems (10 s je Vorgang)</small></h3></div>
    <div className="prod-columns">
      <div><h4>{formatNumber(f.smelts)} Vorgänge = {hoursText(f.furnaceHours)} Ofenzeit</h4>
        <ul className="prod-list">{f.furnacesFor.map(x => <li key={x.hours}><strong>{x.furnaces}</strong> {x.furnaces === 1 ? 'Ofen' : 'Öfen'} für {x.hours} h</li>)}</ul>
        <small className="muted">Erze und Rohmetall im Schmelzofen doppelt so schnell; eine <a href="#/bibliothek/gebaeude/bld_technik_ofenstrasse">Ofenstraße</a> oder <a href="#/bibliothek/gebaeude/bld_schmelz_modul">Schmelzofen-Module</a> verteilen über Trichter.</small></div>
      <div><h4>Brennstoff, jeweils allein</h4>
        <ul className="prod-list">{f.fuel.map(x => <li key={x.itemId}><strong>{formatNumber(x.count)}</strong> {short(x.itemId)}</li>)}</ul></div>
      <div><h4>Brennstoff aus Farmen</h4>
        {f.fuelFarms.length ? <><ul className="prod-list">{f.fuelFarms.map(x => <li key={`${x.farmId}-${x.itemId}`}>{short(x.itemId)}: <strong>{formatNumber(x.smeltsPerDay)}</strong> Vorgänge/Tag</li>)}</ul>
          <small className="muted">Reicht für alle Vorgänge nach {daysText(f.farmFuelDays)}. Seetang netto gerechnet (Trocknen kostet selbst Brennstoff).</small></>
          : <small className="muted">Keine laufende Brennstofffarm. Seetang (getrocknete Blöcke), Bambus oder eine Lavafarm ersparen den Kohleabbau.</small>}</div>
    </div>
    {furnaceLine}
  </section>;
}

/**
 * „Ofenstraße einplanen“ (PROD-03-Folge): picks a target time, compares the catalogue furnace buildings and puts
 * the chosen number of copies beside the build – own section before the first smelting section, the program waits
 * for it. One undoable step (furnaceLine.ts).
 */
function FurnaceLine({ report, project, overview, buildings, besideX, versions, run }: {
  report: ProductionReport; project: Project; overview: SiteOverview; buildings: readonly FurnaceBuilding[]; besideX: number;
  versions: ReadonlyMap<string, AssetVersion>; run(op: Operation, done: string): void;
}) {
  const [target, setTarget] = useState<number>(2);
  const options = furnaceLineOptions(report.furnaces, buildings, target);
  if (!options.length) return null;
  const ids = new Set(buildings.map(b => b.versionId));
  const present = project.instances.filter(i => ids.has(i.assetVersionId)).reduce((n, i) => n + (buildings.find(b => b.versionId === i.assetVersionId)?.furnaces ?? 0), 0);
  const sections = new Map(siteOf(project).sections.map(s => [s.id, s.name]));
  const place = (o: typeof options[number]) => {
    const placed = furnaceLineOperation({ project, overview, option: o, besideX, ...(versions.get(o.building.versionId) && { version: versions.get(o.building.versionId)! }) });
    const waits = placed.waiting.map(id => `„${sections.get(id) ?? id}“`);
    run(placed.operation, `${o.copies}× ${o.building.name} eingeplant: Abschnitt „Ofenstraße“ an Stelle ${placed.index + 1} der Bau-Reihenfolge${waits.length ? `; in der Planung warten ${waits.join(', ')} darauf` : ''}${placed.links ? `; ${placed.links} Verbindungen zwischen den Modulen` : ''}.`);
  };
  const firstSmelting = overview.sections.find(s => s.id && s.smelts > 0);
  return <div className="prod-furnace-line" role="group" aria-label="Ofenstraße einplanen">
    <h4>Ofenstraße einplanen</h4>
    <label className="prod-field">Alle Schmelzvorgänge fertig in
      <select aria-label="Zielzeit der Öfen" value={target} onChange={e => setTarget(Number(e.target.value))}>
        {FURNACE_TARGET_HOURS.map(h => <option key={h} value={h}>{h} h</option>)}</select></label>
    {present > 0 && <p className="muted">Im Projekt stehen schon {present} Öfen aus Ofenstraßen oder Modulen.</p>}
    <ul className="prod-list">{options.map(o => <li key={o.building.assetId}>
      <strong>{o.copies}× {o.building.name}</strong> = {o.furnaces} Öfen, fertig in {hoursText(o.hours)} · {formatNumber(o.blocks)} Blöcke, rund {hoursText(o.gatherHours)} Sammeln
      {!o.meetsTarget && <small className="bad"> – mehr als {o.copies} lohnen sich nicht, Ziel nicht erreicht</small>}
      {' '}<button onClick={() => place(o)} aria-label={`${o.copies}× ${o.building.name} ins Projekt legen`}>Ins Projekt legen</button>
      {' '}<a className="link-button" href={`#/bibliothek/gebaeude/${o.building.assetId}`}>Bauplan</a></li>)}</ul>
    <small className="muted">Legt die Öfen neben den Bau, als eigenen Bauabschnitt „Ofenstraße“{firstSmelting ? ` vor „${sections.get(firstSmelting.id) ?? firstSmelting.name}“` : ''}; mit Planung warten alle Abschnitte mit Schmelzitems darauf. Ein Rückgängig nimmt alles zurück.</small>
  </div>;
}

function Logistics({ report, boxes }: { report: ProductionReport; boxes: number }) {
  if (!report.storage.length && !report.sorterItems.length) return null;
  return <section className="site-block" aria-label="Lager und Logistik">
    <div className="site-head"><h3>Lager und Logistik <small>Platz für die Bauitems je Abschnitt und Transport mit {boxes} Shulkerkisten je Bautag</small></h3></div>
    {report.storage.length > 0 && <div className="table-wrap"><table className="materials-table">
      <thead><tr><th>Abschnitt</th><th className="num">Plätze</th><th className="num">Doppeltruhen</th><th className="num">Shulker</th><th className="num">Fahrten</th></tr></thead>
      <tbody>{report.storage.map(s => <tr key={s.id || 'rest'}><td>{s.name}</td><td className="num">{formatNumber(s.slots)}</td><td className="num">{s.doubleChests}</td><td className="num">{s.shulkers}</td><td className="num">{s.trips}</td></tr>)}</tbody>
    </table></div>}
    {report.sorterItems.length > 1 && <p className="muted">Laufende automatische Farmen liefern {report.sorterItems.length} verschiedene Items – für ein gemeinsames Lager braucht es {report.sorterItems.length} <a href="#/bibliothek/gebaeude/bld_sortier_modul">Sortier-Module</a> ({report.sorterItems.map(short).join(', ')}).</p>}
  </section>;
}

function Afk({ report, site, save, sitePlace, onMap }: { report: ProductionReport; site: SitePlan; save: Save; sitePlace: FarmPlace | null; onMap(name: string, at: FarmPlace, type: 'treffpunkt'): Promise<void> }) {
  const prod = productionOf(site);
  const name = (id: string) => prod.farms.find(f => f.id === id)?.name ?? id;
  const located = report.farms.filter(f => f.type.mode === 'auto' && f.farm.at && f.farm.state !== 'aus').length;
  const Spot = ({ s, label }: { s: AfkSpot; label: string }) => <div className="prod-afk-spot"><h4>{label}: {placeText(s.spot)}</h4>
    <small>erreicht {s.covered.length} von {s.covered.length + s.missed.length} Farmen · {formatNumber(s.itemsPerHour)} Items/h</small>
    {s.covered.length > 0 && <small>✓ {s.covered.map(name).join(', ')}</small>}
    {s.missed.map(m => <small key={m.farmId} className="bad">✕ {name(m.farmId)}: {m.reason}</small>)}</div>;
  return <section className="site-block" aria-label="AFK-Platz">
    <div className="site-head"><h3>AFK-Platz <small>ein Ort, an dem möglichst viele automatische Farmen gleichzeitig laufen (Simulationsdistanz {prod.simulationDistance})</small></h3></div>
    {located === 0 ? <p className="muted">Gib automatischen Farmen einen Ort (unter „Ernte &amp; Details“) oder übernimm Farmpunkte von der Weltkarte – dann sucht der Planer den besten AFK-Platz.</p> : <div className="prod-columns">
      {report.afk && <Spot s={report.afk} label="Gewählt" />}
      {report.bestAfk && (!report.afk || report.bestAfk.covered.length > report.afk.covered.length) && <div><Spot s={report.bestAfk} label="Vorschlag" />
        <div className="prod-suggest-act"><button onClick={() => save(() => setProductionSettings(site, { afk: report.bestAfk!.spot }), 'AFK-Platz übernommen')}>Als AFK-Platz übernehmen</button>
          <button onClick={() => void onMap('AFK-Platz', report.bestAfk!.spot, 'treffpunkt')}>Auf Weltkarte eintragen</button></div></div>}
    </div>}
    <details className="prod-afk-edit"><summary>AFK-Platz von Hand setzen</summary>
      <PlaceEditor value={prod.afk} sitePlace={sitePlace} onCommit={p => save(() => setProductionSettings(site, { afk: p }), p ? 'AFK-Platz gesetzt' : 'AFK-Platz gelöscht')} /></details>
  </section>;
}

function Jobs({ assignments, projectId }: { assignments: readonly GatherAssignment[]; projectId: string }) {
  if (!assignments.length) return <section className="site-block" aria-label="Sammelaufträge"><div className="site-head"><h3>Sammelaufträge <small>Handarbeit auf mehrere Spieler verteilen</small></h3></div>
    <p className="muted">Lege in der <a href={`#/projekt/${projectId}/planung`}>Planung</a> Bauleute an – dann verteilt der Planer die Handarbeit gleichmäßig (Nether- und End-Items als eine Tour).</p></section>;
  return <section className="site-block" aria-label="Sammelaufträge">
    <div className="site-head"><h3>Sammelaufträge <small>Handarbeit gleichmäßig auf die Bauleute der Planung verteilt</small></h3></div>
    <div className="prod-jobs">{assignments.map(a => <div key={a.builderId} className="prod-job"><h4>{a.name} <small>{hoursText(a.hours)}</small></h4>
      {a.jobs.length ? <ul className="prod-list">{a.jobs.map(j => <li key={j.label}><strong>{j.label}</strong> <small>{hoursText(j.hours)} · {j.items.map(i => `${formatNumber(i.missing)} ${short(i.itemId)}`).join(', ')}</small></li>)}</ul> : <small className="muted">nichts zu sammeln</small>}</div>)}</div>
  </section>;
}

/** PROD-05: link a farm to the team storage chest its hoppers fill; the server's reports then give the real rate. */
function ChestLink({ f, site, save }: { f: FarmStatus; site: SitePlan; save: Save }) {
  const chests = teamChests(site.team);
  const y = f.chest;
  const assigned = f.farm.chest ? undefined : chests.find(c => c.farm === f.farm.id);
  if (!chests.length && !y) return <p className="muted"><strong>Sammeltruhe:</strong> Markiert ihr die Truhe dieser Farm auf dem Server als Team-Lager (Reiter „Team“, Paper-Plugin), misst der Planer die echte Rate aus den Einlagen.</p>;
  return <div className="prod-place-row"><strong>Sammeltruhe</strong>
    <select value={f.farm.chest ?? ''} aria-label={`Sammeltruhe von ${f.farm.name}`} onChange={e => save(() => updateFarm(site, f.farm.id, { chest: e.target.value || null }), e.target.value ? `„${f.farm.name}“ mit Lagerkiste verknüpft` : `Lagerkiste von „${f.farm.name}“ gelöst`)}>
      <option value="">{assigned ? `vom Server zugeordnet: ${assigned.name}` : 'keine'}</option>{chests.map(c => <option key={c.id} value={c.id}>{c.name} ({c.pos.join(' ')})</option>)}
    </select>
    {y && <small className="muted">{y.bookings ? `${y.basis === 'server' ? `${y.bookings} Ertragsmeldungen des Servers` : `${y.bookings} Trichterbuchungen`} · ${num(y.hours)} h Laufzeit · ${Object.entries(y.items).map(([i, n]) => `${formatNumber(n)} ${short(i)}`).join(', ') || 'noch nichts eingelegt'}` : 'noch keine Einlagen gemeldet'}{y.basis === 'trichter' && y.bookings ? ' (Laufzeit aus den Buchungen geschätzt)' : ''}</small>}
  </div>;
}
