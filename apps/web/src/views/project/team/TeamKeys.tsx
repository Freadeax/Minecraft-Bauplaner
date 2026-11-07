import { useState } from 'react';
import { TEAM_ROLE_LABEL } from '../../../../../../packages/domain/src/index.js';
import type { RoomTeam } from '../../../../../../packages/domain/src/index.js';
import { errorText } from '../../../app/ui';
import { RoomError, approveMember, listRoomKeys, revokeRoomKey, setRoomIdentity } from './roomClient';
import type { RoomKey } from './roomClient';

const day = (iso: string | null) => iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('de-DE') : '–';

/**
 * PRIV-01-S05 (docs/architecture/team/TEAM_IDENTITY.md): every member who joined with the invitation has own keys
 * (planner, game). The Bauleitung sees all of them here, revokes single ones, confirms members waiting for their role
 * and switches an older room to „nur persönliche Schlüssel“. Everybody else sees and revokes only their own.
 */
export function TeamKeys({ team, names, saveLive, onMessage }: { team: RoomTeam; names: ReadonlyMap<string, string>; saveLive(next: RoomTeam): void; onMessage(m: string): void }) {
  const live = team.live!;
  const leads = !!live.adminKey;
  const [keys, setKeys] = useState<RoomKey[] | null>(null);
  const [old, setOld] = useState(false), [busy, setBusy] = useState(false);
  const load = async () => {
    try { setKeys(await listRoomKeys(live)); setOld(false); }
    catch (e) { if (e instanceof RoomError && e.status === 404 && e.code === 'nicht-gefunden') setOld(true); else onMessage(errorText(e)); }
  };
  const run = async (job: () => Promise<string>) => {
    setBusy(true);
    try { onMessage(await job()); } catch (e) { onMessage(errorText(e)); } finally { setBusy(false); await load(); }
  };
  const name = (id: string) => names.get(id) ?? (id === team.founder ? 'Bauleitung' : 'Unbekannt');
  const revoke = (k: RoomKey) => {
    if (!confirm(`Zugang „${k.label}“ von ${name(k.member)} widerrufen? Dieses Gerät ist sofort getrennt und kann nichts mehr in den Raum schreiben. Für einen neuen Zugang braucht ${name(k.member)} wieder einen Einladungslink${leads ? '' : ' (bei dir: dieses Gerät, falls es dein aktueller Schlüssel ist)'}.`)) return;
    void run(async () => { await revokeRoomKey(live, k.id); return `Zugang „${k.label}“ von ${name(k.member)} widerrufen.`; });
  };
  const approve = (member: string) => void run(async () => { const r = await approveMember(live, member); return `${name(member)} bestätigt: gilt jetzt als ${TEAM_ROLE_LABEL[r.role]}.`; });
  const strict = live.identity?.strict ?? false;
  const setStrict = (on: boolean) => void run(async () => {
    const identity = await setRoomIdentity(live, { strict: on });
    saveLive({ ...team, live: { ...live, identity } });
    return on ? 'Der Raum nimmt jetzt nur noch Schritte mit persönlichem Schlüssel an. Die Einladung dient nur noch zum Beitreten.' : 'Der Raum nimmt wieder Schritte mit der Einladung an (ältere Mods und Planer).';
  });
  const byMember = new Map<string, RoomKey[]>();
  for (const k of keys ?? []) byMember.set(k.member, [...(byMember.get(k.member) ?? []), k]);
  const waiting = (keys ?? []).filter((k, i, all) => k.pending && all.findIndex(x => x.member === k.member) === i).length;

  return <details className="team-keys" data-testid="team-keys" onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) void load(); }}>
    <summary>{leads ? 'Zugänge im Team-Raum' : 'Meine Zugänge im Team-Raum'}{waiting > 0 && <span className="team-keys-waiting"> · {waiting} warten auf Bestätigung</span>}</summary>
    <p className="muted">Wer mit dem Einladungslink beitritt, bekommt für jedes Gerät (Planer, Spiel) einen eigenen Schlüssel. {leads ? 'Hier nimmst du einzelne Zugänge zurück, ohne alle anderen neu einladen zu müssen.' : 'Hier siehst du deine Geräte und nimmst ein verlorenes zurück.'}</p>
    {old ? <p className="notice" role="status">Dieser Team-Raum kennt noch keine persönlichen Schlüssel (ältere Fassung des Dienstes). Bis er aktualisiert ist, sperrt nur „Einladung erneuern“ alte Links – dann für alle.</p>
      : !keys ? <p className="muted">Lade …</p>
      : !keys.length ? <p className="muted">{leads ? 'Noch niemand ist mit eigenem Schlüssel beigetreten.' : 'Keine eigenen Schlüssel.'}</p>
      : <ul className="team-keys-list" aria-label="Zugänge">{[...byMember].map(([member, ks]) => <li key={member} data-member={member}>
        <div className="team-keys-who"><strong>{name(member)}</strong> <span className="muted">{TEAM_ROLE_LABEL[ks[0]!.role]}</span>
          {ks[0]!.pending && <> <span className="team-keys-pending">wartet auf Bestätigung – bis dahin Helfer</span>
            {leads && <button className="secondary" disabled={busy} onClick={() => approve(member)} aria-label={`${name(member)} bestätigen`}>Bestätigen</button>}</>}</div>
        <table className="team-keys-table"><thead><tr><th>Gerät</th><th>ausgestellt</th><th>zuletzt genutzt</th><th /></tr></thead>
          <tbody>{ks.map(k => <tr key={k.id} data-key={k.id}><td>{k.label}</td><td>{day(k.createdAt)}</td><td>{day(k.lastUsed)}</td>
            <td><button className="text-button" disabled={busy} onClick={() => revoke(k)} aria-label={`Zugang ${k.label} von ${name(member)} widerrufen`}>Widerrufen</button></td></tr>)}</tbody></table>
      </li>)}</ul>}
    {leads && live.identity && !old && <label className="team-keys-strict"><input type="checkbox" checked={strict} disabled={busy} onChange={e => setStrict(e.target.checked)} />
      Nur persönliche Schlüssel annehmen <small className="muted">(empfohlen; ältere Mods ohne eigenen Schlüssel können dann nur noch lesen)</small></label>}
  </details>;
}
