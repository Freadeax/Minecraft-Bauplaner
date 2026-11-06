import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { WORLD_KIND_LABEL, WORLD_PATH_STYLES, itemColor, pathLength, pointTypeLabel, worldPlanSummary, zoneArea, zoneCategoryOf } from '../../../../../packages/domain/src/index.js';
import type { WorldItem } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import type { MapHit } from './OverviewMap';

/**
 * Weltbuilder (MAP-04): selection bar, context menu, layers and the object
 * list of the world map. The map view owns the state and the actions; these
 * components only show them.
 */

export type LayerId = 'projects' | 'site' | 'path' | 'point' | 'zone';
export type Layers = Readonly<Record<LayerId, boolean>>;
export const LAYERS: readonly { readonly id: LayerId; readonly label: string }[] = [
  { id: 'projects', label: 'Projekte' }, { id: 'site', label: 'Bauplätze' }, { id: 'path', label: 'Wege' }, { id: 'point', label: 'Punkte' }, { id: 'zone', label: 'Zonen' },
];
export const ALL_LAYERS: Layers = { projects: true, site: true, path: true, point: true, zone: true };
const LAYER_KEY = 'bauplaner.weltkarte.ebenen';
const NAMED_KEY = 'bauplaner.weltkarte.ebenen.aus';
const GROUPS_KEY = 'bauplaner.weltkarte.gruppen.aus';

/** Visible layers, remembered per browser (convenience only). */
export function useLayers(): [Layers, (next: Layers) => void] {
  const [layers, setLayers] = useState<Layers>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LAYER_KEY) ?? 'null') as Partial<Record<LayerId, unknown>> | null;
      if (raw && typeof raw === 'object') return Object.fromEntries(LAYERS.map(l => [l.id, raw[l.id] !== false])) as Layers;
    } catch { /* storage blocked */ }
    return ALL_LAYERS;
  });
  const set = (next: Layers) => { setLayers(next); try { localStorage.setItem(LAYER_KEY, JSON.stringify(next)); } catch { /* storage blocked */ } };
  return [layers, set];
}

function useHiddenNames(key: string): [ReadonlySet<string>, (next: ReadonlySet<string>) => void] {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => {
    try { const raw = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown; return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []); }
    catch { return new Set(); }
  });
  const set = (next: ReadonlySet<string>) => { setHidden(next); try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* storage blocked */ } };
  return [hidden, set];
}

/** Hidden named layers (MAP-06), remembered per browser. */
export function useHiddenLayers(): [ReadonlySet<string>, (next: ReadonlySet<string>) => void] { return useHiddenNames(NAMED_KEY); }

/** Hidden named groups (GAME-07-S11), remembered per browser; the game has its own switch (/bauplaner gruppe aus). */
export function useHiddenGroups(): [ReadonlySet<string>, (next: ReadonlySet<string>) => void] { return useHiddenNames(GROUPS_KEY); }

/** Named groups (schema 3) with show/hide, entry counts and a lock mark when all entries of a group are locked. */
export function GroupToggles({ groups, hidden, onHidden, onSelect }: {
  groups: readonly { readonly name: string; readonly count: number; readonly locked: number }[];
  hidden: ReadonlySet<string>; onHidden: (next: ReadonlySet<string>) => void; onSelect: (name: string) => void;
}) {
  if (!groups.length) return null;
  const toggle = (name: string, on: boolean) => { const next = new Set(hidden); if (on) next.delete(name); else next.add(name); onHidden(next); };
  return <div className="builder-layers builder-groups" role="group" aria-label="Gruppen">
    <span className="muted small">Gruppen:</span>
    {groups.map(g => <span key={g.name} className="chip-check named group">
      <input type="checkbox" checked={!hidden.has(g.name)} aria-label={`Gruppe „${g.name}“ zeigen`} onChange={e => toggle(g.name, e.target.checked)} />
      <button type="button" className="text-button" onClick={() => onSelect(g.name)} title="Ganze Gruppe auswählen">{g.locked === g.count ? '🔒 ' : g.locked ? '◐ ' : ''}{g.name}</button> <small>{g.count}</small>
    </span>)}
    {hidden.size > 0 && <button type="button" className="text-button" onClick={() => onHidden(new Set())}>alle zeigen</button>}
  </div>;
}

export function LayerToggles({ layers, onChange, counts, names = [], hidden, onHidden, nameCounts }: {
  layers: Layers; onChange: (l: Layers) => void; counts: Readonly<Record<LayerId, number>>;
  /** Named layers in use (MAP-06), which of them are hidden, and how many entries each has. */
  names?: readonly string[]; hidden?: ReadonlySet<string>; onHidden?: (next: ReadonlySet<string>) => void; nameCounts?: ReadonlyMap<string, number>;
}) {
  const toggle = (name: string, on: boolean) => { const next = new Set(hidden); if (on) next.delete(name); else next.add(name); onHidden?.(next); };
  return <div className="builder-layers" role="group" aria-label="Ebenen">
    <span className="muted small">Ebenen:</span>
    {LAYERS.map(l => <label key={l.id} className="chip-check">
      <input type="checkbox" checked={layers[l.id]} onChange={e => onChange({ ...layers, [l.id]: e.target.checked })} /> {l.label} <small>{counts[l.id]}</small>
    </label>)}
    {names.length > 0 && <span className="builder-named" role="group" aria-label="Benannte Ebenen">
      <span className="muted small">Benannt:</span>
      {names.map(n => <label key={n} className="chip-check named">
        <input type="checkbox" checked={!hidden?.has(n)} onChange={e => toggle(n, e.target.checked)} /> {n} <small>{nameCounts?.get(n) ?? 0}</small>
      </label>)}
      {hidden && hidden.size > 0 && <button type="button" className="text-button" onClick={() => onHidden?.(new Set())}>alle zeigen</button>}
    </span>}
  </div>;
}

const PICKER_TEXT = {
  layer: { what: 'Ebene', none: 'keine Ebene', fresh: 'Neue Ebene …', assign: 'Ebene zuweisen', title: 'Die gewählten Einträge in eine benannte Ebene legen (ein-/ausblendbar, in der Liste filterbar)' },
  group: { what: 'Gruppe', none: 'keine Gruppe', fresh: 'Neue Gruppe …', assign: 'Gruppe zuweisen', title: 'Die gewählten Einträge zu einer benannten Gruppe zusammenfassen: ein Klick wählt dann die ganze Gruppe, ein zweiter nur den Eintrag. Die Mod zeigt Gruppen im Hologramm (/bauplaner gruppe).' },
} as const;

/** Assigns a named layer (MAP-06) or group (schema 3) to the selection: existing names or a new one. */
export function NamePicker({ kind, names, current, onPick }: { kind: keyof typeof PICKER_TEXT; names: readonly string[]; current: string | null; onPick: (name: string) => void }) {
  const t = PICKER_TEXT[kind];
  const [fresh, setFresh] = useState<string | null>(null);
  if (fresh !== null) return <form className="builder-layer-new" onSubmit={e => { e.preventDefault(); if (fresh.trim()) onPick(fresh.trim()); setFresh(null); }}>
    <input value={fresh} maxLength={40} autoFocus placeholder={`Name der ${t.what}`} aria-label={`Neue ${t.what}`} onChange={e => setFresh(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setFresh(null); } }} />
    <button className="secondary" disabled={!fresh.trim()}>OK</button>
  </form>;
  return <select className="builder-layer-pick" aria-label={t.assign} value={current ?? ''} title={t.title}
    onChange={e => { const v = e.target.value; if (v === '\u0000neu') setFresh(''); else onPick(v); }}>
    <option value="">{current === null ? `${t.what} …` : t.none}</option>
    {names.map(n => <option key={n} value={n}>{n}</option>)}
    <option value={'\u0000neu'}>{t.fresh}</option>
  </select>;
}

export function LayerPicker(props: { names: readonly string[]; current: string | null; onPick: (name: string) => void }) { return <NamePicker kind="layer" {...props} />; }

export interface SelectionActions {
  readonly onDelete: () => void;
  readonly onDuplicate: (() => void) | null;
  readonly onRotate: ((turns: number) => void) | null;
  readonly onMirror: ((axis: 'x' | 'z') => void) | null;
  readonly onAlign: (() => void) | null;
  readonly onFrame: () => void;
  readonly onClear: () => void;
  /** Named layers (MAP-06): names in use, the layer of the selection (null = mixed) and the setter; null for projects only. */
  readonly layers?: { readonly names: readonly string[]; readonly current: string | null; readonly onPick: (name: string) => void } | null;
  /** Named groups (schema 3), same shape as layers. */
  readonly groups?: { readonly names: readonly string[]; readonly current: string | null; readonly onPick: (name: string) => void } | null;
  /** Lock (schema 3): how many of the selected entries are locked, and the switch; null for projects only. */
  readonly lock?: { readonly locked: number; readonly total: number; readonly onLock: (locked: boolean) => void } | null;
  /** Distance from the player in the game to the selection, when known. */
  readonly playerDistance?: string | null;
}

/** Bar over the map while something is selected: what is selected and what can be done with it. */
export function SelectionBar({ items, projects, actions }: { items: number; projects: number; actions: SelectionActions }) {
  const parts = [items && `${items} ${items === 1 ? 'Eintrag' : 'Einträge'}`, projects && `${projects} ${projects === 1 ? 'Projekt' : 'Projekte'}`].filter(Boolean).join(' und ');
  const deleteLabel = items && !projects ? 'Löschen' : !items ? 'Von der Karte nehmen' : 'Löschen / von der Karte nehmen';
  return <div className="builder-selection" role="toolbar" aria-label="Auswahl">
    <b>{parts} gewählt</b>
    <button className="danger" onClick={actions.onDelete} title={projects ? 'Weltplan-Einträge werden gelöscht, Projekte nur von der Karte genommen (das Projekt selbst bleibt). Rückgängig mit Strg+Z.' : 'Löscht die gewählten Einträge (Entf). Rückgängig mit Strg+Z.'}>🗑 {deleteLabel}</button>
    {actions.onDuplicate && <button className="secondary" onClick={actions.onDuplicate} title="Kopie daneben anlegen (Strg+D)">⧉ Duplizieren</button>}
    {actions.onRotate && <button className="secondary" onClick={() => actions.onRotate!(1)} title="90° im Uhrzeigersinn um die Mitte der Auswahl drehen (R, Umschalt+R gegen den Uhrzeigersinn)" aria-label="Im Uhrzeigersinn drehen">↻ Drehen</button>}
    {actions.onMirror && <button className="secondary" onClick={() => actions.onMirror!('x')} title="Ost und West tauschen" aria-label="Ost-West spiegeln">⇋ Spiegeln</button>}
    {actions.onMirror && <button className="secondary" onClick={() => actions.onMirror!('z')} title="Nord und Süd tauschen" aria-label="Nord-Süd spiegeln">⇅ Spiegeln</button>}
    {actions.onAlign && <button className="secondary" onClick={actions.onAlign} title="Höhe von Bauplätzen und Punkten aus dem bekannten Gelände setzen (Geländeaufnahme oder Spiel)">⛰ Ans Gelände</button>}
    {actions.layers && <LayerPicker names={actions.layers.names} current={actions.layers.current} onPick={actions.layers.onPick} />}
    {actions.groups && <NamePicker kind="group" names={actions.groups.names} current={actions.groups.current} onPick={actions.groups.onPick} />}
    {actions.lock && <button className="secondary" aria-pressed={actions.lock.locked === actions.lock.total} onClick={() => actions.lock!.onLock(actions.lock!.locked < actions.lock!.total)}
      title="Gesperrte Einträge bleiben, wo sie sind: nicht verschieben, umformen oder löschen, bis sie entsperrt sind. Im Hologramm der Mod ist der Plan in gesperrten Flächen grau.">
      {actions.lock.locked === actions.lock.total ? '🔓 Entsperren' : actions.lock.locked ? `🔒 Alle sperren (${actions.lock.locked}/${actions.lock.total})` : '🔒 Sperren'}</button>}
    <button className="secondary" onClick={actions.onFrame}>Zeigen</button>
    {actions.playerDistance && <span className="muted small builder-distance">{actions.playerDistance}</span>}
    <button className="text-button" onClick={actions.onClear} aria-label="Auswahl aufheben">✕</button>
  </div>;
}

export interface MenuEntry { readonly label: string; readonly onClick: () => void; readonly danger?: boolean; readonly hint?: string | undefined; readonly disabled?: boolean }

/** Context menu at a screen position (right click / long press); closes on Escape, outside click or scroll. */
export function MapContextMenu({ at, title, entries, onClose }: { at: { x: number; y: number }; title: string; entries: readonly (MenuEntry | null)[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(at);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: Math.max(8, Math.min(at.x, innerWidth - r.width - 8)), y: Math.max(8, Math.min(at.y, innerHeight - r.height - 8)) });
    el.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  }, [at]);
  useEffect(() => {
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const buttons = [...ref.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []];
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(i + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
    };
    const scroll = () => onClose();
    window.addEventListener('pointerdown', down, true); window.addEventListener('keydown', key, true); window.addEventListener('scroll', scroll, true);
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key, true); window.removeEventListener('scroll', scroll, true); };
  }, [onClose]);
  return <div className="builder-menu" ref={ref} role="menu" aria-label={title} style={{ left: pos.x, top: pos.y }} onContextMenu={e => e.preventDefault()}>
    <div className="builder-menu-title">{title}</div>
    {entries.map((m, i) => m ? <button key={i} role="menuitem" className={m.danger ? 'danger-item' : ''} disabled={m.disabled} title={m.hint}
      onClick={() => { onClose(); m.onClick(); }}>{m.label}</button> : <hr key={i} />)}
  </div>;
}

const KIND_LABEL = WORLD_KIND_LABEL;
function itemInfo(i: WorldItem): string {
  if (i.kind === 'site') return `Bauplatz ${i.width}×${i.length}${i.y !== null ? ` · Y ${i.y}` : ''}${i.projectId ? '' : ' · frei'}`;
  if (i.kind === 'path') return `${WORLD_PATH_STYLES.find(s => s.id === i.style)?.label} · ${formatNumber(pathLength(i.points))} Blöcke · ${i.points.length} Ecken`;
  if (i.kind === 'zone') return `Zone · ${zoneCategoryOf(i.category).label} · ≈ ${formatNumber(zoneArea(i))} Blöcke² · ${i.points.length} Ecken`;
  return `${pointTypeLabel(i.type)} · X ${i.x} · Y ${i.y} · Z ${i.z}`;
}

/** Object list of the Weltplan: search, filter by kind and named layer, multi-select, delete and show per row. */
export function ObjectList({ items, selection, onSelect, onDelete, onFrame, onSelectAll, layerNames: names = [], groupNames: groups = [] }: {
  items: readonly WorldItem[]; selection: ReadonlySet<string>;
  onSelect: (hit: MapHit, add: boolean) => void; onDelete: (id: string) => void; onFrame: (id: string) => void; onSelectAll: (ids: readonly string[]) => void;
  layerNames?: readonly string[]; groupNames?: readonly string[];
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<WorldItem['kind'] | 'all'>('all');
  const [layer, setLayer] = useState<string>('all');
  const [group, setGroup] = useState<string>('all');
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('de');
    return items.filter(i => (kind === 'all' || i.kind === kind) && (layer === 'all' || (layer === '' ? !i.layer : i.layer === layer))
      && (group === 'all' || (group === '' ? !i.group : i.group === group))
      && (!q || `${i.name} ${i.note} ${i.layer ?? ''} ${i.group ?? ''} ${i.locked ? 'gesperrt' : ''} ${itemInfo(i)}`.toLocaleLowerCase('de').includes(q)));
  }, [items, query, kind, layer, group]);
  if (!items.length) return <p className="muted small">Noch kein Weltplan in dieser Dimension. Zeichne mit „Bauplatz“, „Weg“, „Zone“ oder „Punkt“ direkt auf der Draufsicht.</p>;
  const sum = worldPlanSummary(items);
  return <div className="builder-objects">
    <p className="muted small">{sum.sites} Bauplätze ({sum.freeSites} frei) · {sum.paths} Wege, {formatNumber(sum.pathLength)} Blöcke lang · {sum.points} Punkte{sum.zones ? ` · ${sum.zones} Zonen, ≈ ${formatNumber(sum.zoneArea)} Blöcke²` : ''}</p>
    <div className="builder-filter">
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Suchen …" aria-label="Weltplan durchsuchen" />
      <select value={kind} onChange={e => setKind(e.target.value as typeof kind)} aria-label="Art">
        <option value="all">Alle Arten</option><option value="site">Bauplätze</option><option value="path">Wege</option><option value="point">Punkte</option><option value="zone">Zonen</option>
      </select>
      {names.length > 0 && <select value={layer} onChange={e => setLayer(e.target.value)} aria-label="Ebene">
        <option value="all">Alle Ebenen</option>{names.map(n => <option key={n} value={n}>{n}</option>)}<option value="">ohne Ebene</option>
      </select>}
      {groups.length > 0 && <select value={group} onChange={e => setGroup(e.target.value)} aria-label="Gruppe">
        <option value="all">Alle Gruppen</option>{groups.map(n => <option key={n} value={n}>{n}</option>)}<option value="">ohne Gruppe</option>
      </select>}
      <button className="text-button" disabled={!shown.length} onClick={() => onSelectAll(shown.map(i => i.id))} title="Alle angezeigten Einträge auswählen">Alle wählen</button>
    </div>
    {!shown.length && <p className="muted small">Kein Eintrag passt zur Suche.</p>}
    <ul className="plan-list">{shown.map(i => <li key={i.id} className={selection.has(i.id) ? 'on' : ''}>
      <button className="plan-row" aria-pressed={selection.has(i.id)} onClick={e => onSelect({ kind: 'item', id: i.id }, e.shiftKey || e.ctrlKey || e.metaKey)}
        onDoubleClick={() => onFrame(i.id)} title="Klick wählt, Umschalt/Strg-Klick wählt dazu, Doppelklick zeigt auf der Karte">
        <i className={`plan-kind ${i.kind}`} aria-hidden="true" style={i.color || i.kind === 'point' || i.kind === 'zone' ? { background: itemColor(i) } : undefined} />
        <b>{i.locked && <span className="plan-lock" title="Gesperrt" aria-label="gesperrt">🔒</span>}{i.name}{i.layer && <em className="plan-layer-chip">{i.layer}</em>}{i.group && <em className="plan-layer-chip group">{i.group}</em>}</b>
        <small>{itemInfo(i)}</small>
      </button>
      <button className="plan-row-act" onClick={() => onFrame(i.id)} aria-label={`„${i.name}“ auf der Karte zeigen`} title="Auf der Karte zeigen">⌖</button>
      <button className="plan-row-act danger-item" onClick={() => onDelete(i.id)} disabled={i.locked} aria-label={`${KIND_LABEL[i.kind]} „${i.name}“ löschen`} title={i.locked ? 'Gesperrt – erst entsperren' : 'Löschen (Rückgängig mit Strg+Z)'}>🗑</button>
    </li>)}</ul>
  </div>;
}
