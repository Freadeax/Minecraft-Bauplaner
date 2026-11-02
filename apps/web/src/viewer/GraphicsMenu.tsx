import { useEffect, useRef, useState } from 'react';
import { LIGHT_MODES, setGraphics, useGraphics } from '../blockmodels/graphics';
import type { MeshStats } from './sceneController';

const fmt = (n: number) => n.toLocaleString('de-DE');
const clock = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'} Uhr`;

/**
 * „Licht“ in the viewer toolbar (GFX-01): light mode, corner shading, sun time
 * with shadows, the monster spawn check and render quality. Settings apply to
 * every 3D view of the app and are remembered in this browser.
 */
export function GraphicsMenu({ stats }: { stats: MeshStats | null }) {
  const g = useGraphics();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', close); box.current?.addEventListener('keydown', key);
    const el = box.current;
    return () => { document.removeEventListener('pointerdown', close); el?.removeEventListener('keydown', key); };
  }, [open]);
  const mode = LIGHT_MODES.find(m => m.id === g.mode)!;
  return <div className="gfx-menu" ref={box}>
    <button type="button" aria-expanded={open} aria-haspopup="dialog" title={`Licht und Grafik: ${mode.title}`} onClick={() => setOpen(!open)}>
      {g.mode === 'night' ? '☾' : '☀'} <span>{mode.label}</span>
    </button>
    {open && <div className="gfx-panel" role="dialog" aria-label="Licht und Grafik">
      <fieldset className="gfx-modes"><legend>Licht</legend>
        {LIGHT_MODES.map(m => <label key={m.id} title={m.title}>
          <input type="radio" name="gfx-mode" value={m.id} checked={g.mode === m.id} onChange={() => setGraphics({ mode: m.id })} />{m.label}
        </label>)}
      </fieldset>
      <p className="gfx-note">{mode.title}.</p>
      {g.mode === 'sun' && <>
        <label className="gfx-row">Uhrzeit <input type="range" min={6} max={18} step={0.5} value={g.hour} aria-label="Uhrzeit der Sonne"
          onChange={e => setGraphics({ hour: Number(e.target.value) })} /><output>{clock(g.hour)}</output></label>
        <label className="gfx-check"><input type="checkbox" checked={g.shadows} onChange={e => setGraphics({ shadows: e.target.checked })} />Schatten</label>
      </>}
      <label className="gfx-check" title="Ecken und Kanten neben vollen Blöcken abdunkeln (im Spiel: „Weiche Beleuchtung“)">
        <input type="checkbox" checked={g.ao} onChange={e => setGraphics({ ao: e.target.checked })} />Eckschatten (weiche Beleuchtung)</label>
      <label className="gfx-check" title="Bodenflächen mit Blocklicht 0 und zwei freien Blöcken darüber: rotes Kreuz spawnt auch tagsüber (Himmelslicht ≤ 7), gelbes nur nachts">
        <input type="checkbox" checked={g.spawn} onChange={e => setGraphics({ spawn: e.target.checked })} />Spawnprüfung (Monster)</label>
      {g.spawn && stats && <p className="gfx-note" role="status">{stats.spawnDay === null ? 'Für dieses Modell wird kein Licht berechnet (zu groß).'
        : stats.spawnDay + (stats.spawnNight ?? 0) === 0 ? 'Keine Spawnflächen: überall Blocklicht oder kein Platz.'
          : <><b className="spawn-day">{fmt(stats.spawnDay)}</b> Flächen auch tagsüber, <b className="spawn-night">{fmt(stats.spawnNight ?? 0)}</b> nur nachts. Fackeln, Laternen oder Halbstufen setzen.</>}</p>}
      <label className="gfx-row">Qualität <select value={g.quality} onChange={e => setGraphics({ quality: e.target.value as typeof g.quality })}>
        <option value="auto">Automatisch</option><option value="high">Hoch (scharf)</option><option value="low">Sparsam (Akku)</option></select></label>
      {stats && <p className="gfx-note">{fmt(stats.sections)} Abschnitte à 32³{stats.reused ? `, ${fmt(stats.reused)} unverändert übernommen` : ''} · zuletzt {stats.buildMs.toFixed(0)} ms</p>}
    </div>}
  </div>;
}
