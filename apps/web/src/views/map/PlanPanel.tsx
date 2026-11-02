import { useEffect, useMemo, useState } from 'react';
import {
  WORLD_PATH_STYLES, WORLD_POINT_TYPES, WORLD_ZONE_CATEGORIES, itemColor, itemKindLabel, pathColumns, pathLength, pathProfile, snapSiteToChunks, zoneArea,
} from '../../../../../packages/domain/src/index.js';
import type { GroundAt, PathProfile, Project, WorldItem, WorldPath, WorldPathStyle, WorldPointType, WorldZoneCategory } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import { MAP_TOOLS } from './OverviewMap';
import type { MapTool } from './OverviewMap';

/** Toolbar of the planning tools with undo/redo (MAP-03); undo covers Weltplan and placements (MAP-04). */
export function PlanToolbar({ tool, onTool, canUndo, canRedo, onUndo, onRedo }: {
  tool: MapTool; onTool: (t: MapTool) => void; canUndo: string | null; canRedo: string | null; onUndo: () => void; onRedo: () => void;
}) {
  const info = MAP_TOOLS.find(t => t.id === tool)!;
  return <div className="plan-toolbar">
    <div className="seg" role="group" aria-label="Planungswerkzeug">
      {MAP_TOOLS.map(t => <button key={t.id} aria-pressed={tool === t.id} title={`${t.hint} (Taste ${t.key})`} onClick={() => onTool(t.id)}>{t.label}</button>)}
    </div>
    <button className="secondary" disabled={!canUndo} title={canUndo ? `Rückgängig: ${canUndo}` : 'Nichts rückgängig zu machen'} onClick={onUndo} aria-label="Karte: Schritt zurück">↶</button>
    <button className="secondary" disabled={!canRedo} title={canRedo ? `Wiederholen: ${canRedo}` : 'Nichts zu wiederholen'} onClick={onRedo} aria-label="Karte: wiederholen">↷</button>
    <span className="muted small plan-hint">{info.hint}</span>
  </div>;
}

/** Editor of one Weltplan entry. Changes are saved on „Übernehmen“ as one undoable step. */
export function PlanItemEditor({ item, projects, onSave, onRemove, onClose, actions, layerNames = [], groundAt, onRoute }: {
  item: WorldItem; projects: readonly Project[]; onSave: (next: WorldItem) => void; onRemove: () => void; onClose: () => void;
  actions?: React.ReactNode;
  /** MAP-06: named layers in use (suggestions), the known ground (height profile of paths) and re-routing over the terrain. */
  layerNames?: readonly string[]; groundAt?: GroundAt | undefined; onRoute?: ((path: WorldPath) => void) | null;
}) {
  const [draft, setDraft] = useState<WorldItem>(item);
  useEffect(() => { setDraft(item); }, [item]);
  const changed = JSON.stringify(draft) !== JSON.stringify(item);
  const num = (v: string, fallback: number) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : fallback; };
  const kindLabel = itemKindLabel(item);
  const setExtra = (key: 'layer' | 'color', value: string) => { const { [key]: _old, ...rest } = draft; setDraft(value ? { ...rest, [key]: value } as WorldItem : rest as WorldItem); };
  const profile = useMemo(() => item.kind === 'path' && groundAt ? pathProfile(item.points, groundAt) : null, [item, groundAt]);

  return <section className="plan-editor" aria-label={`${kindLabel} „${item.name}“`}>
    <header><h2>{kindLabel}: {item.name}</h2><button className="text-button" onClick={onClose} aria-label="Schließen">✕</button></header>
    <form onSubmit={e => { e.preventDefault(); onSave(draft); }}>
      <div className="plan-fields">
        <label>Name<input value={draft.name} maxLength={120} required onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        {draft.kind === 'site' && <>
          <label>X (West)<input inputMode="numeric" value={draft.minX} onChange={e => setDraft({ ...draft, minX: num(e.target.value, draft.minX) })} /></label>
          <label>Z (Nord)<input inputMode="numeric" value={draft.minZ} onChange={e => setDraft({ ...draft, minZ: num(e.target.value, draft.minZ) })} /></label>
          <label>Breite<input inputMode="numeric" value={draft.width} onChange={e => setDraft({ ...draft, width: Math.max(1, num(e.target.value, draft.width)) })} /></label>
          <label>Länge<input inputMode="numeric" value={draft.length} onChange={e => setDraft({ ...draft, length: Math.max(1, num(e.target.value, draft.length)) })} /></label>
          <label>Höhe Y<input inputMode="numeric" value={draft.y ?? ''} placeholder="offen" onChange={e => setDraft({ ...draft, y: e.target.value.trim() === '' ? null : num(e.target.value, draft.y ?? 64) })} /></label>
          <label className="wide">Projekt auf diesem Bauplatz
            <select value={draft.projectId ?? ''} onChange={e => setDraft({ ...draft, projectId: e.target.value || null })}>
              <option value="">frei (noch kein Projekt)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
        </>}
        {draft.kind === 'path' && <>
          <label>Art<select value={draft.style} onChange={e => setDraft({ ...draft, style: e.target.value as WorldPathStyle })}>
            {WORLD_PATH_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <label>Breite<input type="number" min={1} max={15} value={draft.width} onChange={e => setDraft({ ...draft, width: Math.max(1, Math.min(15, num(e.target.value, draft.width))) })} /></label>
        </>}
        {draft.kind === 'point' && <>
          <label>Art<select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as WorldPointType })}>
            {WORLD_POINT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}{t.v1 ? '' : ' (Mod ab marks2)'}</option>)}</select></label>
          <label>X<input inputMode="numeric" value={draft.x} onChange={e => setDraft({ ...draft, x: num(e.target.value, draft.x) })} /></label>
          <label>Y<input inputMode="numeric" value={draft.y} onChange={e => setDraft({ ...draft, y: num(e.target.value, draft.y) })} /></label>
          <label>Z<input inputMode="numeric" value={draft.z} onChange={e => setDraft({ ...draft, z: num(e.target.value, draft.z) })} /></label>
        </>}
        {draft.kind === 'zone' && <label>Art<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as WorldZoneCategory })}>
          {WORLD_ZONE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
        <label>Ebene<input list="plan-layer-names" value={draft.layer ?? ''} maxLength={40} placeholder="keine" onChange={e => setExtra('layer', e.target.value)} title="Benannte Ebene, z. B. „Phase 2“ – ein-/ausblendbar und in der Liste filterbar" />
          <datalist id="plan-layer-names">{layerNames.map(n => <option key={n} value={n} />)}</datalist></label>
        <label className="plan-color">Farbe<span>
          <input type="color" value={draft.color ?? itemColor(draft)} aria-label="Farbe" onChange={e => setExtra('color', e.target.value.toLowerCase())} />
          {draft.color ? <button type="button" className="text-button" onClick={() => setExtra('color', '')}>Standard</button> : <small className="muted">Standard</small>}</span></label>
        <label className="wide">Notiz<textarea value={draft.note} maxLength={500} rows={draft.note.length > 60 ? 3 : 1} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="Erscheint bei Punkten auch auf der Karte" /></label>
      </div>
      {item.kind === 'path' && <p className="muted small">{item.points.length} Ecken · {formatNumber(pathLength(item.points))} Blöcke lang · {formatNumber(pathColumns(item).length)} Wegblöcke bei {item.width} Breite</p>}
      {item.kind === 'site' && <p className="muted small">{item.width} × {item.length} = {formatNumber(item.width * item.length)} Blöcke Fläche · Chunks {Math.floor(item.minX / 16)},{Math.floor(item.minZ / 16)} bis {Math.floor((item.minX + item.width - 1) / 16)},{Math.floor((item.minZ + item.length - 1) / 16)}</p>}
      {item.kind === 'zone' && <p className="muted small">{item.points.length} Ecken · ≈ {formatNumber(zoneArea(item))} Blöcke² · Ecken ziehen wie bei Wegen (runder Griff fügt eine Ecke ein)</p>}
      {item.kind === 'path' && profile && <PathProfileView profile={profile} onRoute={onRoute ? () => onRoute(item) : null} />}
      <div className="button-row">
        <button className="primary" disabled={!changed || !draft.name.trim()}>Übernehmen</button>
        {draft.kind === 'site' && <button type="button" className="secondary" onClick={() => setDraft({ ...draft, ...snapSiteToChunks(draft) })}>An Chunks ausrichten</button>}
        <button type="button" className="danger" onClick={onRemove} title="Löscht den Eintrag (Entf). Rückgängig mit Strg+Z.">🗑 Löschen</button>
      </div>
    </form>
    {actions && <div className="button-row plan-actions">{actions}</div>}
  </section>;
}

/** Height profile of a path along the known ground (MAP-06): small chart and the numbers a builder needs. */
export function PathProfileView({ profile: p, onRoute }: { profile: PathProfile; onRoute: (() => void) | null }) {
  const W = 260, H = 48;
  const known = p.samples.filter((y): y is number => y !== null);
  const lo = p.yMin ?? 0, hi = p.yMax ?? 0, span = Math.max(1, hi - lo);
  const x = (i: number) => (i / Math.max(1, p.samples.length - 1)) * W;
  const y = (v: number) => H - 4 - ((v - lo) / span) * (H - 8);
  let d = '', open = false;
  p.samples.forEach((v, i) => { if (v === null) { open = false; return; } d += `${open ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; open = true; });
  const walkable = p.steep === 0 && p.unknown === 0;
  return <section className="plan-profile" aria-label="Höhenprofil" data-testid="path-profile">
    <h3>Höhenprofil <small>{p.known ? `Y ${lo} … ${hi}` : 'kein Gelände bekannt'}</small></h3>
    {known.length > 1 && <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`Höhe entlang des Wegs von ${lo} bis ${hi}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>}
    <p className={walkable ? 'ok-text' : 'warn-text'}>
      {p.known ? `↑ ${p.climb} ↓ ${p.descent} Blöcke · größte Stufe ${p.maxStep}${p.steep ? ` · ${p.steep} Stufen ab 2 Blöcken (Treppe nötig)` : ' · ohne Treppe begehbar'}` : 'Lade Gelände aus dem Spiel oder lege eine Geländeaufnahme an, dann zeigt der Weg sein Profil.'}
      {p.water ? ` · ${p.water} Spalten im Wasser` : ''}{p.unknown && p.known ? ` · ${p.unknown} Spalten ohne Gelände` : ''}
    </p>
    {onRoute && <button type="button" className="secondary" onClick={onRoute} disabled={!p.known}
      title="Sucht zwischen den Ecken den flachsten begehbaren Weg über das bekannte Gelände (höchstens ein Block Stufe, Wasser und Unbekanntes gemieden). Die Ecken bleiben Wegpunkte.">⤳ Route übers Gelände</button>}
  </section>;
}
