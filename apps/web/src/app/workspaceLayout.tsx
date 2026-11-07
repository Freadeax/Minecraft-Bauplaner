import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import './workspaceLayout.css';

/**
 * Arbeitsfläche mit einklappbaren Seitenleisten, Vollbild und 2D-Plan (UX-02). Editor und Blockwerkstatt
 * nutzen denselben Baustein, damit sich beide gleich bedienen. Leisten und 2D merken sich je Arbeitsfläche
 * im Browser; Vollbild nie (nach dem Neuladen soll niemand in einer Vollbildfläche festsitzen).
 * Vollbild nutzt die Fullscreen-API, wo es sie gibt; sonst (iPhone) füllt die Fläche das Fenster per CSS.
 */
export interface WorkspaceLayout {
  readonly side: boolean;
  readonly inspector: boolean;
  readonly plan2d: boolean;
  readonly max: boolean;
  toggle(part: 'side' | 'inspector' | 'plan2d' | 'max'): void;
  readonly ref: RefObject<HTMLElement | null>;
  /** Für das Element der Arbeitsfläche: data-Attribute, die das Raster umstellen. */
  readonly attrs: { 'data-side': 'on' | 'off'; 'data-inspector': 'on' | 'off'; 'data-max'?: '' };
}

const KEY = 'bauplaner.arbeitsflaeche.v1';
type Stored = Record<string, { side?: boolean; inspector?: boolean; plan2d?: boolean }>;
const read = (): Stored => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Stored; return v && typeof v === 'object' ? v : {}; } catch { return {}; } };

export function useWorkspaceLayout(id: string): WorkspaceLayout {
  const [state, setState] = useState(() => ({ side: true, inspector: true, plan2d: false, ...read()[id] }));
  const [max, setMax] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const maxRef = useRef(max); maxRef.current = max;
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), [id]: state })); } catch { /* ohne Speicher */ } }, [id, state]);
  // Verlässt der Browser das Vollbild selbst (Esc, Wischgeste), folgt die Fläche.
  useEffect(() => {
    const on = () => { if (!document.fullscreenElement) setMax(false); };
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  // CSS-Vollbild ohne Fullscreen-API: Esc beendet es, außer eine Ansicht braucht Esc gerade selbst (Flug, Ziehen, Menü).
  useEffect(() => {
    if (!max || document.fullscreenElement) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || ref.current?.querySelector('.scene.flying, [aria-expanded=true], [data-dragging], [data-building]')) return;
      setMax(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [max]);
  useEffect(() => {
    document.documentElement.classList.toggle('workspace-max', max);
    return () => document.documentElement.classList.remove('workspace-max');
  }, [max]);
  const toggle = useCallback((part: 'side' | 'inspector' | 'plan2d' | 'max') => {
    if (part !== 'max') { setState(s => ({ ...s, [part]: !s[part] })); return; }
    // Fullscreen braucht die Klick-Geste: direkt hier aufrufen, nicht in einem State-Updater.
    const el = ref.current, on = maxRef.current;
    if (!on) el?.requestFullscreen?.().catch(() => { /* nur CSS-Vollbild */ });
    else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    setMax(!on);
  }, []);
  return { ...state, max, toggle, ref, attrs: { 'data-side': state.side ? 'on' : 'off', 'data-inspector': state.inspector ? 'on' : 'off', ...(max && { 'data-max': '' as const }) } };
}

/** Knöpfe für die Werkzeugleiste der Arbeitsfläche. */
export function LayoutButtons({ layout, sideLabel, sideId, inspectorId, plan2d = true }: { layout: WorkspaceLayout; sideLabel: string; sideId: string; inspectorId: string; plan2d?: boolean }) {
  return <span className="layout-buttons" role="group" aria-label="Arbeitsfläche">
    <button type="button" aria-label={`${sideLabel} zeigen`} aria-pressed={layout.side} aria-controls={sideId} onClick={() => layout.toggle('side')} title={`${sideLabel} ein- oder ausblenden`}>◧ <span>{sideLabel}</span></button>
    <button type="button" aria-label="Inspektor zeigen" aria-pressed={layout.inspector} aria-controls={inspectorId} onClick={() => layout.toggle('inspector')} title="Inspektor ein- oder ausblenden">◨ <span>Inspektor</span></button>
    {plan2d && <button type="button" aria-label="2D-Schichtplan" aria-pressed={layout.plan2d} onClick={() => layout.toggle('plan2d')} title="2D-Schichtplan statt 3D-Bild (auch ohne WebGL, mit Tastatur bedienbar)">▦ <span>2D</span></button>}
    <button type="button" aria-label="Vollbild" aria-pressed={layout.max} onClick={() => layout.toggle('max')} title={layout.max ? 'Vollbild beenden (Esc)' : 'Vollbild: nur die Arbeitsfläche'}>{layout.max ? '🗗' : '⛶'} <span>{layout.max ? 'Verkleinern' : 'Vollbild'}</span></button>
  </span>;
}
