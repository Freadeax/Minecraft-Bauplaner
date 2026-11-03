import { useEffect, useState } from 'react';
import { joinLive, readInvite } from '../../../../../packages/domain/src/index.js';
import type { Invite, TeamState } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { useDocumentTitle } from '../../app/Shell';
import { errorText } from '../../app/ui';
import { getHeader, getPlan, roomInfo } from './roomClient';
import { openTeamPackage } from './TeamOpen';
import { newDeviceId } from './TeamRoom';
import type { RoomHeader } from './teamTransfer';

/**
 * `#/team/beitreten?raum=…&id=…&k=…` (COOP-07, TEAM_LIVE.md §6): opening the invitation link is all a new
 * player does. The plan comes from the room (no file), the project is created and stays live.
 */
export function TeamJoinView({ search }: { search: string }) {
  const app = useApp();
  useDocumentTitle('Team beitreten');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [info, setInfo] = useState<{ name: string; events: number; header: boolean } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const inv = readInvite(search);
      setInvite(inv);
      if (inv.kind === 'member') void roomInfo(inv).then(setInfo).catch(e => setError(errorText(e)));
    } catch (e) { setError(`Der Einladungslink ist unvollständig: ${errorText(e)}`); }
  }, [search]);

  const join = async () => {
    if (!invite) return;
    setBusy(true); setError('');
    try {
      const header = await getHeader<RoomHeader>(invite);
      if (!header.plan?.sha) throw new Error('Die Bauleitung hat noch keinen Planstand in den Team-Raum gestellt.');
      const text = await getPlan(invite, header.plan.sha);
      const blank = { schemaVersion: 1, teamId: header.teamId, name: header.name, createdAt: header.createdAt, founder: header.founder, events: [] } as TeamState;
      const live = joinLive(blank, invite, newDeviceId()).live!;
      await openTeamPackage(text, app, live);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  return <div className="page"><section className="team-block team-join" aria-label="Team beitreten" style={{ maxWidth: 640 }}>
    <span className="panel-kicker">TEAM LIVE</span>
    <h2>{info ? `Team „${info.name}“ beitreten` : 'Team beitreten'}</h2>
    {invite?.kind === 'server' ? <p className="notice warning" role="alert">Das ist der Link für den Minecraft-Server. Gib ihn auf dem Server mit <code>/bauplaner team verbinden &lt;Link&gt;</code> ein, nicht im Browser – und gib ihn nicht weiter.</p> : <>
      <p>Du bekommst den Plan und den Teamstand direkt aus dem Team-Raum, ohne Datei. Danach siehst du live, wer welchen Abschnitt baut, und deine Meldungen kommen sofort bei allen an.</p>
      {info && <p className="muted">{info.events} Ereignisse im Team{info.header ? '' : ' · noch kein Planstand freigegeben'}.</p>}
      <button className="primary" disabled={busy || !invite || !info} onClick={() => void join()}>{busy ? 'Plan wird geladen …' : 'Beitreten und Plan laden'}</button>
      <p className="muted"><small>Wenn du das Projekt schon hast, wird es nur live verbunden; nichts geht verloren.</small></p>
    </>}
    {error && <p className="notice warning" role="alert">{error}</p>}
  </section></div>;
}
