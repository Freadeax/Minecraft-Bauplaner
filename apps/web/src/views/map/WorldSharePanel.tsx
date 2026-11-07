import { href } from '../../app/router';
import type { WorldShareState } from './useWorldShare';
import { ShareNote } from '../../app/ShareNote';

const time = (ms: number) => ms ? new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

/**
 * WORLD-SHARE-01: „Weltplan im Team“ – which Team-Raum gets this browser's Weltplan and the server web
 * maps, and how far the exchange is. Everything goes over the internet: the mods of the team and the
 * Paper plugin read the same state from the room (no file to download or paste).
 */
export function WorldSharePanel({ share }: { share: WorldShareState }) {
  const { rooms, room } = share;
  return <section className="world-share" aria-label="Weltplan im Team">
    <div className="world-share-head">
      <b>Weltplan im Team</b>
      {room && <span className={share.error ? 'warn-text' : 'muted'} role="status">
        {share.error ? `nicht abgeglichen: ${share.error}` : share.syncedAt ? `live über den Team-Raum · Stand ${share.rev}${share.by ? ` · zuletzt von ${share.by}` : ''} · abgeglichen ${time(share.syncedAt)}` : 'verbinde mit dem Team-Raum …'}
      </span>}
    </div>
    {!rooms.length
      ? <p className="muted small">Noch kein Projekt mit Team-Raum. Sobald ein Team-Projekt „Live“ ist (Projekt → Team → Team-Raum), teilt die Karte den Weltplan, die Bauplätze, Gruppen und Sperren mit allen Mods des Teams und dem Server-Plugin – über das Internet, ohne Datei. <a href={href({ view: 'projects' })}>Zu den Projekten</a></p>
      : <>
        <div className="button-row">
          <label>Teilen mit
            <select value={room?.projectId ?? ''} onChange={e => share.choose(e.target.value || null)} aria-label="Team-Raum für den Weltplan">
              {rooms.map(r => <option key={r.projectId} value={r.projectId}>{r.teamName} (Projekt „{r.projectName}“)</option>)}
              <option value="">nicht teilen (nur dieser Browser)</option>
            </select></label>
          {room && <button className="secondary" disabled={share.busy} onClick={share.syncNow}>Jetzt abgleichen</button>}
        </div>
        {room && <p className="muted small">Bauplätze, Wege, Zonen, Punkte, Gruppen und Sperren gehen an alle im Team: Die Mods zeigen sie im Spiel, das Paper-Plugin zeichnet sie als Marker auf BlueMap/Dynmap und kann gesperrte Flächen schützen. Gleichzeitige Änderungen werden je Eintrag zusammengeführt. Die Kartenliste und die verknüpfte Server-Webkarte kommen mit.</p>}
        <ShareNote flow="world-share" extra={room ? `Gerade: ${room.url} (Team „${room.teamName}“).` : 'Gerade: nicht geteilt.'} />
        {share.message && <p className="muted small" role="status">{share.message}</p>}
      </>}
  </section>;
}
