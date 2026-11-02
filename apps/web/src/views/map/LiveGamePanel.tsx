import { useState } from 'react';
import { HOLOGRAM_MATCH_LABEL, LIVE_DEFAULT_PORT, liveShare, playerBlock } from '../../../../../packages/domain/src/index.js';
import type { HologramMatch, Project } from '../../../../../packages/domain/src/index.js';
import { dimensionLabel } from '../../../../../packages/domain/src/worldmap.js';
import { formatNumber } from '../../app/ui';
import type { LiveGame } from './liveClient';

const pct = (n: number) => `${Math.round(n * 100)} %`;

export interface LiveActions {
  readonly follow: boolean;
  readonly onFollow: (on: boolean) => void;
  readonly onShowPlayer: () => void;
  readonly terrainBusy: boolean;
  readonly onLoadTerrain: () => void;
  readonly chunkCount: number;
  readonly onSendMarks: (() => void) | null;
  readonly marksInfo: string;
  /** Project of the hologram in the game and how it matches the map. */
  readonly hologramProject: Project | null;
  readonly hologramMatch: HologramMatch | null;
  readonly onAdoptHologram: (() => void) | null;
}

/**
 * „Mit dem Spiel verbunden“ (MAP-03): connection to the Bauplaner mod on this
 * computer, pairing with the code from the chat, and what the game reports.
 */
export function LiveGamePanel({ game, actions }: { game: LiveGame; actions: LiveActions }) {
  const [code, setCode] = useState('');
  const [port, setPort] = useState(String(game.settings.port));
  const s = game.status, p = s?.player ? playerBlock(s.player) : null, h = s?.hologram ?? null;
  const share = h ? liveShare(h) : null;
  const state = game.phase === 'connected' ? 'verbunden' : game.phase === 'lost' ? 'Verbindung unterbrochen' : game.phase === 'unpaired' ? 'Mod gefunden, nicht gekoppelt'
    : game.phase === 'searching' ? 'sucht …' : 'nicht verbunden';
  const portValid = /^\d{4,5}$/.test(port) && Number(port) >= 1024 && Number(port) <= 65535;

  return <section className="live-game" aria-label="Spielverbindung" data-live-phase={game.phase}>
    <header>
      <h2>Spiel <small className={`live-dot ${game.phase}`}>{state}</small></h2>
      {game.hello && <span className="muted small">Mod {game.hello.mod.version} · {game.hello.mod.loader} · Minecraft {game.hello.mod.minecraft}</span>}
    </header>
    {game.originProblem && <p className="notice warning" role="alert">{game.originProblem}</p>}

    {(game.phase === 'off' || game.phase === 'searching') && <div className="live-connect">
      <p className="muted">Mit der Bauplaner-Mod (ab 0.5, nur auf deinem PC, der Server braucht nichts) siehst du deine Position, das Gelände um dich und den Baufortschritt des Hologramms live auf der Karte und schickst Pläne direkt ins Spiel.</p>
      <ol className="live-steps">
        <li>Minecraft mit der Mod starten (<a href="#/mod">Mod herunterladen</a>) und eine Welt oder den Server betreten.</li>
        <li>Im Spiel <code>/bauplaner verbinden</code> eingeben. Im Chat erscheint ein sechsstelliger Code.</li>
        <li>Hier auf „Verbinden“ drücken. Fragt der Browser nach Zugriff auf Geräte im lokalen Netzwerk: „Zulassen“.</li>
        <li>Den Code aus dem Chat eintragen. Danach verbindet sich die Seite bei jedem Besuch von selbst.</li>
      </ol>
      <div className="button-row">
        {game.phase === 'searching'
          ? <><span className="live-wait" role="status">Suche die Mod auf diesem PC … falls noch nicht geschehen, jetzt im Spiel <code>/bauplaner verbinden</code> eingeben.</span>
            <button className="secondary" onClick={() => void game.disconnect()}>Abbrechen</button></>
          : <button className="primary" disabled={!!game.originProblem} onClick={() => { if (portValid) game.setPort(Number(port)); void game.connect(); }}>Verbinden</button>}
        <details className="live-port"><summary>Port</summary>
          <label>Port der Mod <input inputMode="numeric" value={port} onChange={e => setPort(e.target.value.trim())} aria-invalid={!portValid} /></label>
          <small className="muted">Standard {LIVE_DEFAULT_PORT}. Nur ändern, wenn du im Spiel einen anderen Port gewählt hast (<code>/bauplaner verbinden port &lt;Zahl&gt;</code>).</small>
        </details>
      </div>
      {game.phase === 'off' && game.error && <details className="live-help" open>
        <summary>Klappt nicht? Selbsttest</summary>
        <ol>
          <li>Diese Adresse in einem neuen Tab öffnen: <a href={`http://127.0.0.1:${game.settings.port}/v1/hello`} target="_blank" rel="noreferrer noopener">127.0.0.1:{game.settings.port}/v1/hello ↗</a></li>
          <li>Lädt sie nicht: Die Verbindung im Spiel ist aus. <code>/bauplaner verbinden</code> eingeben; mit <code>/bauplaner verbinden status</code> siehst du, ob sie läuft. Gibt es den Befehl nicht, ist eine Mod-Version vor 0.5 installiert.</li>
          <li>Steht dort Text mit „bauplaner-mod“: Die Mod läuft, aber der Browser blockiert diese Seite. Symbol links neben der Adresse → Website-Einstellungen → „Lokales Netzwerk“ / „Geräte im lokalen Netzwerk“ → „Zulassen“, dann neu laden. Brave: Schutzschild aus oder „Localhost-Zugriff“ erlauben.</li>
        </ol>
      </details>}
    </div>}

    {game.phase === 'unpaired' && <form className="live-pair" onSubmit={e => { e.preventDefault(); void game.pair(code); }}>
      <p>Die Mod läuft. Gib im Spiel <code>/bauplaner verbinden</code> ein{game.hello?.pairing ? ' (ein Code ist gerade offen)' : ''} und trage den Code aus dem Chat ein:</p>
      <label>Code <input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" /></label>
      <button className="primary" disabled={!/^\d{6}$/.test(code.replace(/\s/g, ''))}>Koppeln</button>
      <button type="button" className="secondary" onClick={() => void game.disconnect()}>Abbrechen</button>
    </form>}

    {(game.phase === 'connected' || game.phase === 'lost') && <div className="live-status">
      {s?.world && <p className="muted small">Welt: {s.world.singleplayer ? 'Einzelspieler' : s.world.server ?? s.world.key}</p>}
      {p && s?.player ? <dl className="map-facts">
        <div><dt>{s.player.name || 'Spieler'}</dt><dd>X {formatNumber(p.x)} · Y {p.y} · Z {formatNumber(p.z)} · blickt nach {p.facing}</dd></div>
        <div><dt>Dimension</dt><dd>{dimensionLabel(s.player.dimension)}</dd></div>
      </dl> : <p className="muted">Kein Spieler in einer Welt – betritt eine Welt oder einen Server.</p>}
      <div className="button-row">
        <button className="secondary" aria-pressed={actions.follow} disabled={!p} onClick={() => actions.onFollow(!actions.follow)}>{actions.follow ? '◉ Folgen an' : '○ Folgen'}</button>
        <button className="secondary" disabled={!p} onClick={actions.onShowPlayer}>Zu mir</button>
        <button className="secondary" disabled={!p || actions.terrainBusy} onClick={actions.onLoadTerrain} title="Liest die oberste Schicht der im Spiel geladenen Chunks um dich (etwa 160 Blöcke Umkreis).">
          {actions.terrainBusy ? 'Gelände wird gelesen …' : 'Gelände um mich lesen'}</button>
        {actions.chunkCount > 0 && <span className="muted small">{actions.chunkCount} Chunks aus dem Spiel</span>}
      </div>

      {h && share && <section className="live-hologram" aria-label="Hologramm im Spiel">
        <h3>Hologramm: {h.name}</h3>
        <span className="map-progress" aria-label={`Im Spiel fertig ${pct(share.share)}`}><span style={{ width: `${Math.round(share.share * 100)}%` }} /></span>
        <p>{formatNumber(h.counts.ok)} von {formatNumber(share.known)} geprüften Blöcken richtig ({pct(share.share)}) · fehlt {formatNumber(h.counts.missing)} · falsch {formatNumber(h.counts.wrong)} · Zustand {formatNumber(h.counts.state)}
          {h.counts.unknown ? ` · ${formatNumber(h.counts.unknown)} in nicht geladenen Chunks` : ''}</p>
        {actions.hologramProject && actions.hologramMatch && <p className={actions.hologramMatch === 'same' ? 'ok-text' : 'warn-text'}>
          „{actions.hologramProject.name}“ {HOLOGRAM_MATCH_LABEL[actions.hologramMatch]}.
          {actions.onAdoptHologram && <> <button className="text-button" onClick={actions.onAdoptHologram}>Lage aus dem Spiel übernehmen</button></>}</p>}
        {!actions.hologramProject && <p className="muted small">Der Plan im Spiel gehört zu keinem Projekt dieses Browsers.</p>}
      </section>}

      <div className="button-row">
        <button className="secondary" disabled={!actions.onSendMarks} onClick={() => actions.onSendMarks?.()}>Weltplan ins Spiel senden</button>
        <span className="muted small">{actions.marksInfo}</span>
      </div>
      <p className="muted small"><button className="text-button" onClick={() => void game.disconnect()}>Trennen</button> · Die Kopplung bleibt in diesem Browser gespeichert, bis du trennst.</p>
    </div>}
    {game.error && <p className="field-error" role="alert">{game.error}</p>}
  </section>;
}
