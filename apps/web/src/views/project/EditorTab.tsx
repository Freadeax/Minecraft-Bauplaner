import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { countBlocks } from '../../../../../packages/voxel/src/index.js';
import type { Cell, Transform, Vec3 } from '../../../../../packages/voxel/src/index.js';
import { findSnapCandidates, nearestSnap, newInstance, placementBounds, positionKey, rotateInPlace, snapOperation } from '../../../../../packages/domain/src/index.js';
import type { Asset, Instance, Resolution, SnapCandidate } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { formatNumber } from '../../app/ui';
import { mix, stateColor } from '../../colors';
import { Viewer } from '../../Viewer';
import type { DragHandler, ViewerProps } from '../../viewer/types';
import { SnapPanel } from './SnapPanel';
import { Thumb } from '../../thumbnail/Thumb';
import { useLayerFilter } from '../../viewer/LayerControl';
import { BlockInfo } from '../../viewer/BlockInfo';
import { isResolved } from './session';
import type { ProjectSession } from './session';

const CONFLICT = '#ff4d4d', DIM_TARGET = '#16303c';

function latestVersionId(asset: Asset): string | undefined { return asset.versionIds.at(-1); }

/** Composer: place, move, rotate, mirror instances; voxel conflicts and undo/redo. */
export function EditorTab({ session }: { session: ProjectSession }) {
  const { library } = useApp();
  const { project, resolution, selectedInstanceId: selectedId } = session;
  const [message, setMessage] = useState('');
  const [picked, setPicked] = useState<Vec3 | null>(null);
  const run = useCallback((op: Parameters<ProjectSession['execute']>[0]) => { setMessage(session.execute(op)); }, [session]);
  const resolved: Resolution | null = isResolved(resolution) ? resolution : null;
  const world = resolved?.world ?? null;
  const selected = project.instances.find(i => i.id === selectedId) ?? null;
  const [dragMode, setDragMode] = useState(false);
  const [snapOn, setSnapOn] = useState(true);
  const [ghost, setGhost] = useState<NonNullable<ViewerProps['ghost']> | null>(null);
  const [dragInfo, setDragInfo] = useState('');

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input,textarea,select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) session.redo(); else session.undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); session.redo(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [session]);

  const conflictKeys = useMemo(() => new Set(resolved?.conflicts.map(c => positionKey(c.position)) ?? []), [resolved]);
  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    if (resolved && selectedId) for (const [key, ids] of resolved.owners) if (ids.includes(selectedId)) keys.add(key);
    return keys;
  }, [resolved, selectedId]);
  const colorFor = useCallback((cell: Cell) => {
    const key = positionKey(cell.position);
    if (conflictKeys.has(key)) return CONFLICT;
    const base = cell.kind === 'erase' ? '#d35f5f' : stateColor(world!.palette[cell.paletteIndex]!.id);
    return selectedId && !selectedKeys.has(key) ? mix(base, DIM_TARGET, 0.55) : base;
  }, [conflictKeys, selectedKeys, selectedId, world]);
  const { visible, control: layerControl } = useLayerFilter(world);
  const focus = useMemo(() => resolved?.placed.find(p => p.instance.id === selectedId)?.payload.bounds ?? null, [resolved, selectedId]);
  const onSelect = useCallback((cell: Cell | null) => {
    setPicked(cell?.position ?? null);
    session.select(cell && resolved ? resolved.owners.get(positionKey(cell.position))?.[0] ?? null : null);
  }, [session, resolved]);

  // Drag to move (B5 × B6): the selected instance follows the pointer on the X/Z grid and
  // snaps to the nearest fitting free connector within reach; the drop is one undoable step.
  const dragState = useRef<{ candidates: SnapCandidate[]; plan: { transform: Transform; snap: SnapCandidate | null } | null } | null>(null);
  const drag = useMemo<DragHandler | null>(() => {
    if (!dragMode || !selected || !resolved) return null;
    const version = library.versions.get(selected.assetVersionId);
    if (!version) return null;
    const own = selectedKeys;
    const plan = (delta: Vec3) => {
      const p = selected.transform.position, dragged: Vec3 = [p[0] + delta[0], p[1], p[2] + delta[2]];
      const snap = snapOn && dragState.current ? nearestSnap(dragState.current.candidates, dragged, selected.transform) : null;
      return { transform: snap?.transform ?? { ...selected.transform, position: dragged }, snap };
    };
    return {
      canGrab: cell => own.has(positionKey(cell.position)),
      move: delta => {
        if (!dragState.current) {
          let candidates: SnapCandidate[] = [];
          try { if (snapOn && version.connectors.length) candidates = findSnapCandidates({ project, versions: library.versions, version, instanceId: selected.id, limit: 500 }); } catch { /* no snap targets */ }
          dragState.current = { candidates, plan: null };
        }
        const next = plan(delta);
        dragState.current.plan = next;
        setGhost({ bounds: placementBounds(version, next.transform), tone: next.snap ? next.snap.conflicts ? 'conflict' : 'snap' : 'free' });
        setDragInfo(next.snap ? `Rastet ein: ${next.snap.connectorId} → ${project.instances.find(i => i.id === next.snap!.target.instanceId)?.name ?? '?'} · ${next.snap.target.connectorId}${next.snap.conflicts ? ` · ${next.snap.conflicts} Konflikte` : ''}`
          : `Verschieben um X ${delta[0]} · Z ${delta[2]}`);
      },
      end: delta => {
        const planned = dragState.current?.plan ?? null;
        dragState.current = null; setGhost(null); setDragInfo('');
        if (!delta || !planned) return;
        if (planned.snap) {
          try { setMessage(session.execute(snapOperation(project, library.versions, planned.snap, { instanceId: selected.id }))); } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
        } else if (delta[0] || delta[2]) run({ kind: 'instance.transform', instanceId: selected.id, transform: planned.transform });
      },
    };
  }, [dragMode, selected, resolved, selectedKeys, snapOn, project, library.versions, session, run]);

  const assets = library.assets.filter(a => !a.archived && latestVersionId(a));
  // The shipped catalogue has well over a hundred buildings: the picker filters by name and tag and scrolls on its own.
  const [pickerQuery, setPickerQuery] = useState('');
  const needle = pickerQuery.trim().toLowerCase();
  const pickerAssets = needle ? assets.filter(a => a.name.toLowerCase().includes(needle) || a.tags.some(t => t.toLowerCase().includes(needle))) : assets;
  const add = (asset: Asset) => {
    const versionId = latestVersionId(asset)!;
    const version = library.versions.get(versionId);
    if (!version) { setMessage(`Version für ${asset.name} fehlt im Speicher.`); return; }
    // Place beside the existing world so a new instance never overlaps by default.
    const x = world ? world.bounds.maxExclusive[0] + 1 - version.payload.bounds.min[0] : 0;
    const instance = newInstance({ assetVersionId: versionId, name: `${asset.name} ${project.instances.filter(i => i.assetVersionId === versionId).length + 1}`,
      transform: { position: [x, 0, 0], quarterTurns: 0, mirrorX: false } });
    run({ kind: 'instance.add', instance }); session.select(instance.id);
  };
  const transform = (instance: Instance, t: Transform) => run({ kind: 'instance.transform', instanceId: instance.id, transform: t });
  const move = (instance: Instance, axis: 0 | 1 | 2, delta: number) => {
    const position = [...instance.transform.position] as [number, number, number]; position[axis] += delta;
    transform(instance, { ...instance.transform, position });
  };
  const setCoordinate = (instance: Instance, axis: 0 | 1 | 2, raw: string) => {
    const n = Number(raw);
    if (!Number.isSafeInteger(n)) { setMessage('Koordinaten sind ganze Zahlen.'); return; }
    const position = [...instance.transform.position] as [number, number, number]; position[axis] = n;
    transform(instance, { ...instance.transform, position });
  };
  const duplicate = (instance: Instance) => {
    const version = library.versions.get(instance.assetVersionId);
    const width = version ? version.payload.bounds.maxExclusive[0] - version.payload.bounds.min[0] : 1;
    const copy = newInstance({ assetVersionId: instance.assetVersionId, name: `${instance.name} Kopie`, override: instance.override,
      transform: { ...instance.transform, position: [instance.transform.position[0] + width + 1, instance.transform.position[1], instance.transform.position[2]] as Vec3 } });
    run({ kind: 'instance.add', instance: copy }); session.select(copy.id);
  };
  const assetOf = (instance: Instance) => { const v = library.versions.get(instance.assetVersionId); return { version: v, asset: v ? library.assets.find(a => a.id === v.assetId) : undefined }; };
  const counts = useMemo(() => world ? countBlocks(world) : null, [world]);
  const conflictsOf = (id: string) => resolved?.conflicts.filter(c => c.instanceIds.includes(id)).length ?? 0;

  return <section className="editor" aria-label="Editor">
    <aside className="editor-tree">
      <span className="panel-kicker">INSTANZEN</span>
      {project.instances.length === 0 && <p className="muted">Noch keine Bauteile. Füge unten eines aus der Bibliothek ein.</p>}
      <ul className="instance-list">{project.instances.map(i => {
        const n = conflictsOf(i.id), { asset, version } = assetOf(i);
        return <li key={i.id}><button aria-pressed={i.id === selectedId} onClick={() => session.select(i.id === selectedId ? null : i.id)}>
          <strong>{i.name}</strong><span>{asset?.name ?? 'fehlende Version'} · v{version?.label ?? '?'}{i.override ? ' · Vorrang' : ''}</span>
          {n > 0 && <em className="badge danger">{n} Konflikte</em>}
        </button></li>;
      })}</ul>
      <span className="panel-kicker">BAUTEIL EINFÜGEN</span>
      <a className="text-button suggest-link" href={`#/bibliothek/fuer/${encodeURIComponent(project.id)}`}>Passende Gebäude vorschlagen →</a>
      <input type="search" className="picker-search" value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} placeholder={`${assets.length} Bauteile durchsuchen …`} aria-label="Bauteil zum Einfügen suchen" />
      {needle && pickerAssets.length === 0 && <p className="muted">Kein Bauteil passt zu „{pickerQuery.trim()}“.</p>}
      <ul className="asset-picker">{pickerAssets.map(a => <li key={a.id}><button className="with-thumb" onClick={() => add(a)} title={a.description}>
        {(() => { const v = library.versions.get(latestVersionId(a)!); return v ? <Thumb cacheKey={v.id} payload={() => v.payload} alt="" width={40} height={28} className="thumb mini" /> : null; })()}
        <span>＋ {a.name}{a.demo && <small> · Beispiel</small>}</span></button></li>)}</ul>
      <a className="text-button" href="#/bibliothek">Bibliothek verwalten →</a>
    </aside>
    <div className="viewport">
      <div className="view-toolbar">
        <span className="view-label"><span /> PROJEKT · {formatNumber(counts?.blocks ?? 0)} BLÖCKE</span>
        <div>
          <button aria-pressed={dragMode} onClick={() => setDragMode(!dragMode)} title="Gewählte Instanz im 3D-Bild ziehen; rastet an passenden Anschlüssen ein">✥ <span>Ziehen</span></button>
          {dragMode && <label className="check drag-snap"><input type="checkbox" checked={snapOn} onChange={e => setSnapOn(e.target.checked)} /> Einrasten</label>}
          <button onClick={session.undo} disabled={!session.history.undo.length} title={session.history.undo.at(-1)?.label ?? ''}>↶ <span>Rückgängig</span></button>
          <button onClick={session.redo} disabled={!session.history.redo.length} title={session.history.redo.at(-1)?.label ?? ''}>↷ <span>Wiederholen</span></button>
        </div>
      </div>
      {world && visible ? <Viewer payload={world} cells={visible.cells} onSelect={onSelect} colorFor={colorFor} focus={focus} drag={drag} ghost={ghost} />
        : <div className="scene empty-scene"><p>{isResolved(resolution) ? 'Leeres Projekt – füge links ein Bauteil ein.' : resolution.error}</p></div>}
      {dragMode && <div className="drag-hint" role="status">{dragInfo || (selected ? `„${selected.name}“ im Bild greifen und ziehen; daneben ziehen dreht die Ansicht. Esc bricht ab.` : 'Erst eine Instanz wählen, dann im Bild ziehen.')}</div>}
      <div className="viewport-footer"><span>Ziehen: drehen · Scrollen: zoomen · Klick: Block und Instanz wählen · F: Fokus · V: Flug · Strg+Z / Strg+Y</span>
        {layerControl}
      </div>
    </div>
    <aside className="inspector" aria-label="Eigenschaften">
      {resolved && picked && <BlockInfo resolution={resolved} position={picked} onSelectInstance={id => session.select(id)} />}
      <span className="panel-kicker">EIGENSCHAFTEN</span>
      {!selected ? <p className="muted">Wähle eine Instanz in der Liste oder im Bauwerk.</p> : (() => {
        const { asset, version } = assetOf(selected);
        return <div className="inspector-body">
          <label>Name<input key={selected.id} defaultValue={selected.name} onBlur={e => { if (e.target.value.trim() !== selected.name) run({ kind: 'instance.update', instanceId: selected.id, name: e.target.value }); }} /></label>
          <p className="muted">{asset?.name ?? 'Unbekanntes Bauteil'} · Version {version?.label ?? '–'}{asset?.demo ? ' · Beispiel' : ''}</p>
          <fieldset><legend>Position (Pivot)</legend>
            {(['X', 'Y', 'Z'] as const).map((label, axis) => <div className="coord-row" key={label}>
              <span>{label}</span>
              <button aria-label={`${label} minus 1`} onClick={() => move(selected, axis as 0 | 1 | 2, -1)}>−</button>
              <input key={`${selected.id}-${axis}-${selected.transform.position[axis]}`} inputMode="numeric" defaultValue={selected.transform.position[axis]} aria-label={`${label}-Koordinate`}
                onBlur={e => { if (e.target.value !== String(selected.transform.position[axis])) setCoordinate(selected, axis as 0 | 1 | 2, e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
              <button aria-label={`${label} plus 1`} onClick={() => move(selected, axis as 0 | 1 | 2, 1)}>＋</button>
            </div>)}
          </fieldset>
          <div className="button-row">
            <button onClick={() => transform(selected, rotateInPlace(selected.transform, 3))}>↺ 90°</button>
            <button onClick={() => transform(selected, rotateInPlace(selected.transform, 1))}>↻ 90°</button>
            <button aria-pressed={selected.transform.mirrorX} onClick={() => transform(selected, { ...selected.transform, mirrorX: !selected.transform.mirrorX })}>⇋ Spiegeln</button>
          </div>
          <p className="muted">Drehung {selected.transform.quarterTurns * 90}° · {selected.transform.mirrorX ? 'gespiegelt' : 'nicht gespiegelt'}</p>
          <label className="check"><input type="checkbox" checked={selected.override} onChange={e => run({ kind: 'instance.update', instanceId: selected.id, override: e.target.checked })} />
            Vorrang bei Überschneidung (expliziter Override)</label>
          <div className="button-row">
            <button onClick={() => duplicate(selected)}>⧉ Duplizieren</button>
            <button className="danger" onClick={() => { run({ kind: 'instance.remove', instanceId: selected.id }); session.select(null); }}>✕ Entfernen</button>
          </div>
        </div>;
      })()}
      <SnapPanel session={session} />
    </aside>
    {message && <div className="notice warning editor-message" role="alert">{message}<button onClick={() => setMessage('')}>OK</button></div>}
    <ConflictReport session={session} />
  </section>;
}

function ConflictReport({ session }: { session: ProjectSession }) {
  const r = session.resolution;
  if (!isResolved(r)) return <section className="report danger-report" role="alert"><h3>Projekt kann nicht aufgelöst werden</h3><p>{r.error}</p></section>;
  const name = (id: string) => session.project.instances.find(i => i.id === id)?.name ?? id;
  const ok = r.exportBlockers.length === 0;
  return <section className={`report ${ok ? 'ok-report' : 'danger-report'}`} aria-label="Konfliktbericht">
    <h3>{ok ? '✓ Geometrisch konfliktfrei' : '⚠ Offene Punkte vor einem baubaren Export'}</h3>
    <dl className="report-stats">
      <div><dt>Ungeklärte Konflikte</dt><dd>{r.conflicts.length}</dd></div>
      <div><dt>Per Vorrang entschieden</dt><dd>{r.overridden.length}</dd></div>
      <div><dt>Identische Überlappungen (einmal gezählt)</dt><dd>{r.duplicates}</dd></div>
      <div><dt>Überlappende Begrenzungsboxen</dt><dd>{r.boundsOverlaps.length}</dd></div>
    </dl>
    {r.exportBlockers.length > 0 && <ul>{r.exportBlockers.map(b => <li key={b}>{b}</li>)}</ul>}
    {r.conflicts.length > 0 && <details><summary>Konflikte anzeigen</summary><ul className="conflict-list">{r.conflicts.slice(0, 200).map(c =>
      <li key={positionKey(c.position)}><button onClick={() => session.select(c.instanceIds[0]!)}>X {c.position[0]} · Y {c.position[1]} · Z {c.position[2]}</button>
        {' '}{c.kind === 'state' ? 'verschiedene Blöcke' : c.kind === 'air-vs-block' ? 'Luft gegen Block' : c.kind === 'erase-vs-block' ? 'Löschen gegen Block' : 'verschiedene BlockEntity-Daten'}: {c.instanceIds.map(name).join(' ↔ ')}</li>)}
      {r.conflicts.length > 200 && <li>… und {r.conflicts.length - 200} weitere</li>}</ul></details>}
    {r.issues.length > 0 && <details><summary>{r.issues.length} Hinweise zu Profil und Transformation</summary><ul>{r.issues.map((i, n) => <li key={n}>{i.message}</li>)}</ul></details>}
  </section>;
}
