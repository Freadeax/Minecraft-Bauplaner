import './world.css';
import { useState } from 'react';
import { dimensionLabel } from '../../../../../packages/domain/src/index.js';
import type { LiveGame } from '../map/liveClient';
import { gameTerrainLevel } from './gameTerrain';

/**
 * Compact game connection for project tabs (TERRAIN-04): the same link as on the world map
 * (useLiveGame), without map tools. Shows the state, „Verbinden“, the click approval in the game
 * and, for old mods, the code form.
 */
export function GameLinkBar({ game, purpose }: { game: LiveGame; purpose: string }) {
  const [code, setCode] = useState('');
  const level = gameTerrainLevel(game);
  const p = game.status?.player ?? null;
  return <div className="game-link-bar" data-live-phase={game.phase} data-testid="game-link">
    {game.originProblem && <p className="notice warning" role="alert">{game.originProblem}</p>}
    {(game.phase === 'connected' || game.phase === 'lost') ? <p className="game-link-state">
      <span className={`live-dot ${game.phase}`}>{game.phase === 'connected' ? 'Spiel verbunden' : 'Verbindung unterbrochen'}</span>
      {game.hello && <> · Mod {game.hello.mod.version} ({game.hello.mod.loader})</>}
      {p ? <> · du bist in {dimensionLabel(p.dimension)} bei X {Math.floor(p.x)} · Z {Math.floor(p.z)}</> : <> · betritt eine Welt oder einen Server</>}
      {level === 'loaded' && <><br /><small className="muted">Diese Mod liefert nur Chunks, die gerade geladen sind. Ab Mod 0.20.0 merkt sie sich jedes gesehene Gelände samt Biomen (<a href="#/mod">Mod aktualisieren</a>).</small></>}
    </p>
      : game.phase === 'asking' ? <p role="status" data-testid="live-asking"><b>Jetzt im Spiel J drücken und „Planer zulassen“ klicken.</b> <button type="button" className="text-button" onClick={() => void game.disconnect()}>Abbrechen</button></p>
      : game.phase === 'unpaired' ? <form className="live-pair" onSubmit={e => { e.preventDefault(); void game.pair(code); }}>
        <span>Im Spiel <code>/bauplaner verbinden</code> eingeben und den Code eintragen:</span>
        <label>Code <input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" maxLength={7} placeholder="123456" /></label>
        <button className="primary" disabled={!/^\d{6}$/.test(code.replace(/\s/g, ''))}>Koppeln</button>
      </form>
      : <p>
        {game.phase === 'searching' ? <span role="status">Suche die Mod auf diesem PC … läuft Minecraft mit der Build-Studio-Mod?</span>
          : <span className="muted">{purpose} Minecraft mit der Build-Studio-Mod starten (<a href="#/mod">Mod</a>), dann:</span>}{' '}
        {game.phase === 'searching' ? <button type="button" className="secondary" onClick={() => void game.disconnect()}>Abbrechen</button>
          : <button type="button" className="primary" disabled={!!game.originProblem} onClick={() => void game.connect()}>Mit dem Spiel verbinden</button>}
      </p>}
    {game.error && game.phase !== 'connected' && <p className="notice warning small" role="alert">{game.error}</p>}
  </div>;
}
