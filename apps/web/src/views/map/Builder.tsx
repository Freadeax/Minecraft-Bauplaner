import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { WORLD_PATH_STYLES, pathLength, pointTypeLabel, worldPlanSummary } from '../../../../../packages/domain/src/index.js';
import type { WorldItem } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import type { MapHit } from './OverviewMap';

/**
 * Weltbuilder (MAP-04): selection bar, context menu, layers and the object
 * list of the world map. The map view owns the state and the actions; these
 * components only show them.
 */

export type LayerId = 'projects' | 'site' | 'path' | 'point';
export type Layers = Readonly<Record<LayerId, boolean>>;
export const LAYERS: readonly { readonly id: LayerId; readonly label: string }[] = [
  { id: 'projects', label: 'Projekte' }, { id: 'site', label: 'Bauplätze' }, { id: 'path', label: 'Wege' }, { id: 'point', label: 'Punkte' },
];
export const ALL_LAYERS: Layers = { projects: true, site: true, path: true, point: true };
const LAYER_KEY = 'bauplaner.weltkarte.ebenen';

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

export function LayerToggles({ layers, onChange, counts }: { layers: Layers; onChange: (l: Layers) => void; counts: Readonly<Record<LayerId, number>> }) {
  return <div className="builder-layers" role="group" aria-label="Ebenen">
    <span className="muted small">Ebenen:</span>
    {LAYERS.map(l => <label key={l.id} className="chip-check">
      <input type="checkbox" checked={layers[l.id]} onChange={e => onChange({ ...layers, [l.id]: e.target.checked })} /> {l.label} <small>{counts[l.id]}</small>
    </label>)}
  </div>;
}

export interface SelectionActions {
  readonly onDelete: () => void;
  readonly onDuplicate: (() => void) | null;
  readonly onRotate: ((turns: number) => void) | null;
  readonly onMirror: ((axis: 'x' | 'z') => void) | null;
  readonly onAlign: (() => void) | null;
  readonly onFrame: () => void;
  readonly onClear: () => void;
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
    <button className="secondary" onClick={actions.onFrame}>Zeigen</button>
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

const KIND_LABEL: Record<WorldItem['kind'], string> = { site: 'Bauplatz', path: 'Weg', point: 'Punkt' };
function itemInfo(i: WorldItem): string {
  if (i.kind === 'site') return `Bauplatz ${i.width}×${i.length}${i.y !== null ? ` · Y ${i.y}` : ''}${i.projectId ? '' : ' · frei'}`;
  if (i.kind === 'path') return `${WORLD_PATH_STYLES.find(s => s.id === i.style)?.label} · ${formatNumber(pathLength(i.points))} Blöcke · ${i.points.length} Ecken`;
  return `${pointTypeLabel(i.type)} · X ${i.x} · Y ${i.y} · Z ${i.z}`;
}

/** Object list of the Weltplan: search, filter by kind, multi-select, delete and show per row. */
export function ObjectList({ items, selection, onSelect, onDelete, onFrame, onSelectAll }: {
  items: readonly WorldItem[]; selection: ReadonlySet<string>;
  onSelect: (hit: MapHit, add: boolean) => void; onDelete: (id: string) => void; onFrame: (id: string) => void; onSelectAll: (ids: readonly string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<WorldItem['kind'] | 'all'>('all');
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('de');
    return items.filter(i => (kind === 'all' || i.kind === kind) && (!q || `${i.name} ${i.note} ${itemInfo(i)}`.toLocaleLowerCase('de').includes(q)));
  }, [items, query, kind]);
  if (!items.length) return <p className="muted small">Noch kein Weltplan in dieser Dimension. Zeichne mit „Bauplatz“, „Weg“ oder „Punkt“ direkt auf der Draufsicht.</p>;
  const sum = worldPlanSummary(items);
  return <div className="builder-objects">
    <p className="muted small">{sum.sites} Bauplätze ({sum.freeSites} frei) · {sum.paths} Wege, {formatNumber(sum.pathLength)} Blöcke lang · {sum.points} Punkte</p>
    <div className="builder-filter">
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Suchen …" aria-label="Weltplan durchsuchen" />
      <select value={kind} onChange={e => setKind(e.target.value as typeof kind)} aria-label="Art">
        <option value="all">Alle Arten</option><option value="site">Bauplätze</option><option value="path">Wege</option><option value="point">Punkte</option>
      </select>
      <button className="text-button" disabled={!shown.length} onClick={() => onSelectAll(shown.map(i => i.id))} title="Alle angezeigten Einträge auswählen">Alle wählen</button>
    </div>
    {!shown.length && <p className="muted small">Kein Eintrag passt zur Suche.</p>}
    <ul className="plan-list">{shown.map(i => <li key={i.id} className={selection.has(i.id) ? 'on' : ''}>
      <button className="plan-row" aria-pressed={selection.has(i.id)} onClick={e => onSelect({ kind: 'item', id: i.id }, e.shiftKey || e.ctrlKey || e.metaKey)}
        onDoubleClick={() => onFrame(i.id)} title="Klick wählt, Umschalt/Strg-Klick wählt dazu, Doppelklick zeigt auf der Karte">
        <i className={`plan-kind ${i.kind}`} aria-hidden="true" />
        <b>{i.name}</b>
        <small>{itemInfo(i)}</small>
      </button>
      <button className="plan-row-act" onClick={() => onFrame(i.id)} aria-label={`„${i.name}“ auf der Karte zeigen`} title="Auf der Karte zeigen">⌖</button>
      <button className="plan-row-act danger-item" onClick={() => onDelete(i.id)} aria-label={`${KIND_LABEL[i.kind]} „${i.name}“ löschen`} title="Löschen (Rückgängig mit Strg+Z)">🗑</button>
    </li>)}</ul>
  </div>;
}
