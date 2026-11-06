import { useMemo, useState } from 'react';
import {
  appendEvents, authorize, canTeam, createTeam, describeEvent, freezeRevision, newId, NOTE_TAG_LABEL, NOTE_TAGS, PLAYER_NAME, SECTION_TEAM_STATUS_LABEL, siteOf, siteOperation,
  programOf, setProgram, setStock, teamContextOf, teamIntoProgram, teamEvent, laterThan, TEAM_ROLE_LABEL, TEAM_ROLE_TEXT, TEAM_ROLES, teamView,
} from '../../../../../../packages/domain/src/index.js';
import type { NoteTag, SectionTeamState, SitePlan, TeamEventBody, TeamRole, TeamState, TeamView } from '../../../../../../packages/domain/src/index.js';
import { errorText, formatNumber, localToday } from '../../../app/ui';
import type { ProjectSession } from '../session';
import { TeamExchange } from './TeamExchange';
import { TeamProof } from './TeamProof';
import { TeamLive } from './TeamLive';
import { TeamRoom } from './TeamRoom';
import { TeamCompact } from './TeamCompact';
import { TeamAreaNav, TeamIssues, TeamPlanning, TeamProgressArea, TeamRightsArea } from './TeamPlan';
import type { TeamArea } from './TeamPlan';
import { More } from '../../../app/More';
import '../../../styles/team.css';

const short = (id: string) => id.replace(/^minecraft:/, '');
const itemId = (raw: string) => { const t = raw.trim().toLowerCase().replace(/\s+/g, '_'); return t.includes(':') ? t : `minecraft:${t}`; };
const when = (iso?: string) => iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';

/**
 * Teambau (COOP-01, docs/architecture/team/TEAMBAU.md): several players build one project. Every action is
 * an event in `site.team`, written through the undoable `site.set`; who may do what follows the role
 * in the team log. Exchange with other browsers and the server lives in {@link TeamExchange}.
 */
export function TeamTab({ session }: { session: ProjectSession }) {
  const { project } = session;
  const site = siteOf(project);
  const team = site.team;
  const [message, setMessage] = useState('');
  const save = (next: SitePlan, label: string) => { const e = session.execute(siteOperation(next, label)); setMessage(e); return !e; };
  const saveTeam = (next: TeamState, label: string) => save({ ...site, team: next }, label);

  if (!team) return <section className="team" aria-label="Team"><Found site={site} projectName={project.name} projectId={project.id} onFound={t => saveTeam(t, 'Team gegründet')} />
    <TeamExchange session={session} team={null} view={null} onMessage={setMessage} />{message && <p role="alert" className="notice warning">{message}</p>}</section>;

  return <TeamPage session={session} site={site} team={team} message={message} setMessage={setMessage} saveTeam={saveTeam} saveSite={save} />;
}

function Found({ site, projectName, projectId, onFound }: { site: SitePlan; projectName: string; projectId: string; onFound(t: TeamState): void }) {
  const ctx = teamContextOf(site);
  const [name, setName] = useState(projectName);
  const [who, setWho] = useState(ctx.builders[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  const [player, setPlayer] = useState('');
  const [server, setServer] = useState('');
  const [error, setError] = useState('');
  const found = () => {
    try {
      if (player && !PLAYER_NAME.test(player)) throw new Error('Minecraft-Namen haben 3–16 Buchstaben, Ziffern oder _.');
      const existing = ctx.builders.find(b => b.id === who);
      const founder = existing?.id ?? newId('bld');
      const display = existing?.name ?? newName.trim();
      if (!display) throw new Error('Bitte deinen Namen angeben.');
      let t = createTeam({ name, founder, server });
      const events = [...(!existing ? [teamEvent(founder, { kind: 'member.join', member: founder, name: display.slice(0, 60), ...(player && { player }) })] : []),
        ...(existing && player ? [teamEvent(founder, { kind: 'member.player', member: founder, player })] : [])];
      if (events.length) t = appendEvents(t, events);
      onFound(t);
    } catch (e) { setError(errorText(e)); }
  };
  return <div className="team-block team-found">
    <h3>Gemeinsam bauen</h3>
    <p>Mehrere Spieler bauen an diesem Projekt: jeder übernimmt Bauabschnitte, meldet sie fertig, liefert Material und schreibt Notizen am Bau. Du wirst <strong>Bauleitung</strong>: nur du gibst Planstände frei und vergibst Rollen.</p>
    {/* UX-01: drei Schritte sichtbar, Hintergrund zu Mod und Plugin eingeklappt. */}
    <ol className="team-quick">
      <li>Team gründen – du wirst Bauleitung.</li>
      <li>Einladungslink an deine Mitspieler schicken, ohne Konten.</li>
      <li>Bauabschnitte im Reiter <a href={`#/projekt/${projectId}/baustelle`}>Baustelle</a> verteilen{site.sections.length ? ` (jetzt ${site.sections.length})` : ' – noch keine angelegt'}.</li>
    </ol>
    <More className="more-inline" title="Mehr zu Mod und Server" hint="Hologramm, Paper-Plugin, Notfall">
      <ul className="muted">
        <li>Im Spiel: Mit der Bauplaner-Mod sieht jeder seine Abschnitte im Hologramm und meldet Baustand und Kisten aus dem Spiel.</li>
        <li>Server-Plugin (freiwillig, Abschnittsschutz und geprüfte Lagerkisten): verbindet sich über das Internet selbst mit dem Team-Raum, sobald du als Bauleitung mit der Mod auf dem Server bist. Nichts herunterladen, nichts auf den Server kopieren.</li>
        <li>Nur im Notfall ohne Internet gibt es unten Dateien und Meldecodes.</li>
      </ul>
    </More>
    <div className="team-form">
      <label>Teamname<input value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
      <label>Ich bin{ctx.builders.length ? <select value={who} onChange={e => setWho(e.target.value)}>
        {ctx.builders.map(b => <option key={b.id} value={b.id}>{b.name} (Bauleute aus „Planung“)</option>)}<option value="">jemand Neues …</option></select> : null}
        {(!ctx.builders.length || !who) && <input placeholder="Dein Name" value={newName} maxLength={60} onChange={e => setNewName(e.target.value)} />}</label>
      <label>Minecraft-Name <small>(für das Plugin und die Anzeige)</small><input value={player} maxLength={17} onChange={e => setPlayer(e.target.value.trim())} placeholder="z. B. Freadeax" /></label>
      <label>Server <small>(nur für die Einladung)</small><input value={server} maxLength={120} onChange={e => setServer(e.target.value)} placeholder="server.example.net" /></label>
    </div>
    {error && <p role="alert" className="notice warning">{error}</p>}
    <button className="primary" onClick={found}>Team gründen</button>
  </div>;
}

function TeamPage({ session, site, team, message, setMessage, saveTeam, saveSite }: {
  session: ProjectSession; site: SitePlan; team: TeamState; message: string; setMessage(m: string): void; saveTeam(t: TeamState, label: string): boolean; saveSite(s: SitePlan, label: string): boolean;
}) {
  const [area, setArea] = useState<TeamArea>('bauen');
  const { project, computation } = session;
  const ctx = useMemo(() => teamContextOf(site), [site]);
  const view = useMemo(() => teamView(team, ctx), [team, ctx]);
  const me = team.self ? view.members.find(m => m.id === team.self) ?? null : null;
  const role: TeamRole = me?.role ?? 'gast';
  const progress = new Map((computation?.site.plan?.sections ?? []).map(s => [s.id, s.blocks ? s.blocksDone / s.blocks : 0]));
  const sectionBlocks = new Map((computation?.site.plan?.sections ?? []).map(s => [s.id, s.blocks]));
  const toProgram = () => {
    const program = programOf(site), r = teamIntoProgram(program, view, localToday());
    if (!r.added && !r.linked && !r.assigned && !r.absences) { setMessage('Die Projektplanung entspricht schon dem Team.'); return; }
    if (saveSite(setProgram(site, { ...program, builders: r.builders, assignments: r.assignments }), 'Team in die Projektplanung übernommen'))
      setMessage(`Projektplanung aktualisiert: ${r.added} Bauleute neu, ${r.linked} Minecraft-Namen ergänzt, ${r.assigned} Abschnittszuweisungen geändert${r.absences ? `, ${r.absences} Abwesenheiten übernommen` : ''}. Strg+Z macht es rückgängig.`);
  };
  const takeStock = (stock: Readonly<Record<string, number>>) => {
    let next = site;
    for (const [item, n] of Object.entries(stock)) next = setStock(next, item, n);
    if (saveSite(next, 'Lagerbestand vom Server übernommen')) setMessage(`Bestand von ${Object.keys(stock).length} Sorten ins Lager der Baustelle übernommen (andere Einträge bleiben). Strg+Z macht es rückgängig.`);
  };
  const names = useMemo(() => new Map(view.members.map(m => [m.id, m.name])), [view]);
  const nameOf = (id: string | null | undefined) => id ? names.get(id) ?? id : '–';

  const act = (body: TeamEventBody, label: string): boolean => {
    if (!me) { setMessage('Bitte zuerst oben wählen, wer du bist.'); return false; }
    const ok = authorize(team, ctx, me.id, body);
    if (!ok.ok) { setMessage(ok.reason); return false; }
    return saveTeam(appendEvents(team, [teamEvent(me.id, body, laterThan(team))]), label);
  };
  const release = () => {
    if (!me || !canTeam(role, 'plan.release')) return;
    const summary = window.prompt('Was ist neu in diesem Planstand? (kurz, für alle sichtbar)', '') ?? null;
    if (summary === null) return;
    try {
      const frozen = freezeRevision(project, `Teamfreigabe: ${summary}`.slice(0, 500));
      const s = siteOf(frozen.project);
      const event = teamEvent(me.id, { kind: 'plan.release', revisionId: frozen.revision.id, revisionNumber: frozen.revision.number, summary: summary.slice(0, 300) }, laterThan(team));
      session.replace({ ...frozen.project, site: { ...s, team: appendEvents(team, [event]) } });
      setMessage(`Planstand ${frozen.revision.number} eingefroren und für alle freigegeben. ${(team as { live?: unknown }).live ? 'Er geht über den Team-Raum von selbst an alle Planer, Mods und den Server.' : 'Schalte das Team live, dann bekommen ihn alle ohne Datei (Notfall ohne Internet: unten).'}`);
    } catch (e) { setMessage(errorText(e)); }
  };

  const planProps = { session, site, team, view, ctx, me, role, saveTeam, saveSite, setMessage };
  return <section className="team" aria-label="Team">
    <header className="team-head">
      <div><span className="panel-kicker">TEAM</span><h3>{team.name}</h3>
        <small>{view.members.length} Mitglied{view.members.length === 1 ? '' : 'er'}{team.server ? ` · Server ${team.server}` : ''} · {team.events.length} Ereignisse</small></div>
      <div className="team-release">
        {view.release ? <><strong>Planstand {view.release.revisionNumber} gilt</strong><small>{view.release.summary || 'ohne Beschreibung'} · {nameOf(view.release.by)}, {when(view.release.at)}</small></>
          : <><strong>Noch kein Planstand freigegeben</strong><small>Die Bauleitung friert den Plan ein, damit alle nach demselben Stand bauen.</small></>}
        {canTeam(role, 'plan.release') && <button onClick={release}>Aktuellen Plan freigeben</button>}
      </div>
      <Who team={team} view={view} me={me} onPick={id => { const { self: _old, ...rest } = team; saveTeam(id ? { ...rest, self: id } : rest, id ? 'Ich bin gewählt' : '„Ich bin“ zurückgesetzt'); }}
        onJoin={(name, player) => {
          const id = newId('bld');
          saveTeam({ ...appendEvents(team, [teamEvent(id, { kind: 'member.join', member: id, name, ...(player && { player }) }, laterThan(team))]), self: id }, 'Dem Team beigetreten');
        }} />
    </header>
    {message && <div className="notice warning" role="alert">{message}<button onClick={() => setMessage('')}>OK</button></div>}
    <TeamIssues {...planProps} />
    <TeamAreaNav area={area} onArea={setArea} />
    {area === 'planung' && <TeamPlanning {...planProps} />}
    {area === 'fortschritt' && <TeamProgressArea {...planProps} />}
    {area === 'rechte' && <TeamRightsArea {...planProps} />}
    {area === 'bauen' && <>
    {me && <Mine view={view} me={me.id} ctx={ctx} progress={progress} projectId={project.id} act={act} />}
    <Sections view={view} ctx={ctx} progress={progress} me={me?.id ?? null} role={role} nameOf={nameOf} act={act} />
    <div className="team-columns">
      <Members view={view} me={me?.id ?? null} role={role} act={act} onToProgram={toProgram} projectId={project.id} />
      <Contribute view={view} ctx={ctx} me={me?.id ?? null} role={role} act={act} nameOf={nameOf} />
    </div>
    <TeamProof view={view} sections={ctx.sections} me={me?.id ?? null} role={role} act={act} nameOf={nameOf} sectionBlocks={sectionBlocks} siteStock={site.stock} onTakeStock={takeStock} {...(site.production && { farms: site.production.farms })} />
    <Notes view={view} ctx={ctx} me={me?.id ?? null} role={role} act={act} nameOf={nameOf} />
    <TeamRoom session={session} team={team} view={view} onMessage={setMessage} />
    <TeamLive session={session} team={team} view={view} onMessage={setMessage} />
    <TeamExchange session={session} team={team} view={view} onMessage={setMessage} />
    <TeamCompact team={team} ctx={ctx} me={me?.id ?? null} role={role} live={!!(team as TeamState & { live?: unknown }).live} onSave={saveTeam} onUndo={session.undo} />
    <Log team={team} ctx={ctx} names={names} />
    </>}
  </section>;
}

function Who({ view, me, onPick, onJoin }: { team: TeamState; view: TeamView; me: TeamView['members'][number] | null; onPick(id: string): void; onJoin(name: string, player: string): void }) {
  const [name, setName] = useState(''), [player, setPlayer] = useState('');
  if (me) return <div className="team-me"><span className="panel-kicker">ICH BIN</span><strong>{me.name}{me.player ? ` · ${me.player}` : ''}</strong>
    <small><span className={`team-role role-${me.role}`}>{TEAM_ROLE_LABEL[me.role]}</span> {TEAM_ROLE_TEXT[me.role]}</small>
    <button className="link-button" onClick={() => onPick('')}>wechseln</button></div>;
  return <div className="team-me pick" role="group" aria-label="Wer bist du?">
    <span className="panel-kicker">WER BIST DU?</span>
    <div className="team-chips">{view.members.map(m => <button key={m.id} onClick={() => onPick(m.id)}>{m.name}{m.player ? ` (${m.player})` : ''}</button>)}</div>
    <div className="team-inline"><input placeholder="Ich bin neu: Name" value={name} maxLength={60} onChange={e => setName(e.target.value)} />
      <input placeholder="Minecraft-Name" value={player} maxLength={17} onChange={e => setPlayer(e.target.value.trim())} />
      <button disabled={!name.trim() || (!!player && !PLAYER_NAME.test(player))} onClick={() => onJoin(name.trim(), player)}>Beitreten</button></div>
    <small className="muted">Die Wahl gilt nur in diesem Browser. Neue Mitglieder sind Helfer, bis die Bauleitung etwas anderes festlegt.</small>
  </div>;
}

type Act = (body: TeamEventBody, label: string) => boolean;

function Mine({ view, me, ctx, progress, projectId, act }: { view: TeamView; me: string; ctx: ReturnType<typeof teamContextOf>; progress: Map<string, number>; projectId: string; act: Act }) {
  const mine = view.sections.filter(s => s.owner === me && s.status !== 'bestaetigt' && !s.orphan);
  const notes = view.notes.filter(n => !n.resolved && n.mentions.includes(me));
  const gather = view.gather.filter(g => g.member === me);
  return <div role="region" className="team-block team-mine" aria-label="Meine Aufgaben">
    <div className="team-block-head"><h3>Meine Aufgaben</h3><a className="link-button" href={`#/projekt/${projectId}/bauen`}>Zur Bauanleitung →</a></div>
    {!mine.length && !notes.length && !gather.length && <p className="muted">Gerade nichts. Unten bei „Abschnitte“ einen freien Abschnitt übernehmen.</p>}
    <ul className="team-list">{mine.map(s => {
      const name = ctx.sections.find(x => x.id === s.sectionId)?.name ?? s.sectionId, p = progress.get(s.sectionId);
      return <li key={s.sectionId}><span className={`team-status st-${s.status}`}>{SECTION_TEAM_STATUS_LABEL[s.status]}</span><strong>{name}</strong>
        {p !== undefined && <small>{Math.round(p * 100)} % abgehakt</small>}{s.status === 'nacharbeit' && s.note && <small className="bad">{s.note}</small>}
        <span className="team-actions">{s.status !== 'gemeldet' && <button onClick={() => { const note = window.prompt(`„${name}“ fertig melden – Notiz für die Bauleitung (optional):`, ''); if (note !== null) act({ kind: 'section.done', section: s.sectionId, ...(note.trim() && { note: note.trim().slice(0, 300) }) }, 'Fertig gemeldet'); }}>Fertig melden</button>}
          <button className="secondary" onClick={() => act({ kind: 'section.release', section: s.sectionId }, 'Abschnitt abgegeben')}>Abgeben</button></span></li>;
    })}
    {gather.map(g => <li key={g.item}><span className="team-status st-vergeben">sammeln</span><strong>{formatNumber(g.count)} × {short(g.item)}</strong>
      <span className="team-actions"><button className="secondary" onClick={() => act({ kind: 'gather.claim', item: g.item, count: 0 }, 'Sammelauftrag zurückgegeben')}>Zurückgeben</button></span></li>)}
    {notes.map(n => <li key={n.id}><span className="team-status st-gemeldet">für dich</span><span>{NOTE_TAG_LABEL[n.tag]}: {n.text}</span></li>)}</ul>
  </div>;
}

function Sections({ view, ctx, progress, me, role, nameOf, act }: { view: TeamView; ctx: ReturnType<typeof teamContextOf>; progress: Map<string, number>; me: string | null; role: TeamRole; nameOf(id?: string | null): string; act: Act }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!ctx.sections.length) return <div className="team-block"><h3>Abschnitte</h3><p className="muted">Noch keine Bauabschnitte. Im Reiter „Baustelle“ anlegen (z. B. „Fundament · Rohbau · Dach“), dann hier verteilen.</p></div>;
  const free = view.sections.filter(s => s.status === 'frei' && !s.orphan).length;
  return <div role="region" className="team-block" aria-label="Abschnitte">
    <div className="team-block-head"><h3>Abschnitte <small>{free} frei · {view.sections.filter(s => s.status === 'bestaetigt').length} bestätigt</small></h3></div>
    <ol className="team-sections">{view.sections.map(s => {
      const name = ctx.sections.find(x => x.id === s.sectionId)?.name ?? 'entfernter Abschnitt', p = progress.get(s.sectionId);
      return <li key={s.sectionId} className={s.orphan ? 'orphan' : undefined}>
        <div className="team-section-main">
          <strong>{name}</strong>
          <span className={`team-status st-${s.status}`}>{SECTION_TEAM_STATUS_LABEL[s.status]}</span>
          <span className="team-owner">{s.owner ? nameOf(s.owner) : <em className="muted">niemand</em>}</span>
          {p !== undefined && <span className="team-bar" title={`${Math.round(p * 100)} % abgehakt`}><span style={{ width: `${Math.round(p * 100)}%` }} /></span>}
          <SectionActions s={s} me={me} role={role} view={view} act={act} name={name} />
          {s.history.length > 0 && <button className="link-button" aria-expanded={open === s.sectionId} onClick={() => setOpen(open === s.sectionId ? null : s.sectionId)}>Verlauf</button>}
        </div>
        {s.note && <small className="muted">Notiz: {s.note}</small>}
        {open === s.sectionId && <ul className="team-history">{s.history.map((h, i) => <li key={i}>{when(h.at)} · {nameOf(h.by)}: {h.text}</li>)}</ul>}
      </li>;
    })}</ol>
  </div>;
}

function SectionActions({ s, me, role, view, act, name }: { s: SectionTeamState; me: string | null; role: TeamRole; view: TeamView; act: Act; name: string }) {
  if (!me || s.orphan) return <span />;
  const meister = canTeam(role, 'section.assign');
  return <span className="team-actions">
    {s.status === 'frei' && canTeam(role, 'section.claim') && <button onClick={() => act({ kind: 'section.claim', section: s.sectionId }, `„${name}“ übernommen`)}>Übernehmen</button>}
    {meister && <select aria-label={`„${name}“ zuweisen`} value="" onChange={e => e.target.value && act({ kind: 'section.assign', section: s.sectionId, member: e.target.value }, `„${name}“ zugewiesen`)}>
      <option value="">zuweisen …</option>{view.members.filter(m => m.role !== 'gast').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
    {meister && (s.status === 'gemeldet' || s.status === 'nacharbeit') && <>
      <button onClick={() => act({ kind: 'section.verify', section: s.sectionId, ok: true }, `„${name}“ bestätigt`)}>✓ Bestätigen</button>
      <button className="secondary" onClick={() => { const note = window.prompt('Was muss nachgearbeitet werden?', ''); if (note !== null) act({ kind: 'section.verify', section: s.sectionId, ok: false, ...(note.trim() && { note: note.trim().slice(0, 300) }) }, `„${name}“: Nacharbeit`); }}>Nacharbeit</button></>}
    {s.owner && s.owner !== me && s.status !== 'bestaetigt' && meister && <button className="secondary" onClick={() => act({ kind: 'section.release', section: s.sectionId }, `„${name}“ freigegeben`)}>Freigeben</button>}
  </span>;
}

function Members({ view, me, role, act, onToProgram, projectId }: { view: TeamView; me: string | null; role: TeamRole; act: Act; onToProgram(): void; projectId: string }) {
  return <div role="region" className="team-block" aria-label="Mitglieder">
    <div className="team-block-head"><h3>Mitglieder</h3>
      {canTeam(role, 'section.assign') && <button className="link-button" onClick={onToProgram} title="Teammitglieder als Bauleute und die aktuellen Abschnittsinhaber als Zuweisungen in den Reiter „Planung“ übernehmen">In die Projektplanung übernehmen</button>}
      <a className="link-button" href={`#/projekt/${projectId}/planung`}>Planung →</a></div>
    <table className="team-table team-members"><thead><tr><th>Name</th><th>Rolle</th><th>Abschnitte</th><th>Beitrag</th><th>Zuletzt</th></tr></thead>
      <tbody>{view.members.map(m => {
        const items = Object.values(m.items).reduce((a, b) => a + b, 0);
        return <tr key={m.id}><td><strong>{m.name}</strong>{m.player ? <small> · {m.player}</small> : (m.id === me || role === 'leitung') &&
          <button className="link-button" onClick={() => { const p = window.prompt(`Minecraft-Name von ${m.name}:`, ''); if (p && PLAYER_NAME.test(p.trim())) act({ kind: 'member.player', member: m.id, player: p.trim() }, 'Spielername gesetzt'); }}>+ Spielername</button>}
          {!m.inProgram && <small className="muted"> · nur im Team</small>}</td>
          <td>{role === 'leitung' ? <select aria-label={`Rolle von ${m.name}`} value={m.role} onChange={e => act({ kind: 'member.role', member: m.id, role: e.target.value as TeamRole }, `Rolle von ${m.name}`)}>
            {TEAM_ROLES.map(r => <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>)}</select> : <span className={`team-role role-${m.role}`}>{TEAM_ROLE_LABEL[m.role]}</span>}</td>
          <td>{m.sections.length} · {m.confirmedSections} bestätigt</td>
          <td>{m.blocks ? `${formatNumber(m.blocks)} Blöcke` : ''}{m.blocks && items ? ' · ' : ''}{items ? `${formatNumber(items)} Items` : ''}{!m.blocks && !items ? '–' : ''}</td>
          <td>{when(m.lastActive)}</td></tr>;
      })}</tbody></table>
  </div>;
}

function Contribute({ view, ctx, me, role, act, nameOf }: { view: TeamView; ctx: ReturnType<typeof teamContextOf>; me: string | null; role: TeamRole; act: Act; nameOf(id?: string | null): string }) {
  const [section, setSection] = useState(''), [blocks, setBlocks] = useState(''), [item, setItem] = useState(''), [count, setCount] = useState(''), [note, setNote] = useState('');
  const [gItem, setGItem] = useState(''), [gCount, setGCount] = useState('');
  const allowed = !!me && canTeam(role, 'contribution');
  const submit = () => {
    const b = blocks ? Number(blocks) : 0, c = count ? Number(count) : 0;
    if (!Number.isSafeInteger(b) || b < 0 || !Number.isSafeInteger(c) || c < 0) return;
    if (act({ kind: 'contribution', ...(section && { section }), ...(b > 0 && { blocks: b }), ...(item && c > 0 && { items: [{ item: itemId(item), count: c }] }), ...(note.trim() && { note: note.trim().slice(0, 300) }) }, 'Beitrag gemeldet')) {
      setBlocks(''); setItem(''); setCount(''); setNote('');
    }
  };
  const delivered = Object.entries(view.delivered).sort((a, b) => b[1] - a[1]);
  return <div role="region" className="team-block" aria-label="Beiträge und Sammeln">
    <h3>Beiträge &amp; Sammeln</h3>
    {allowed ? <form className="team-form compact" onSubmit={e => { e.preventDefault(); submit(); }}>
      <label>Abschnitt<select value={section} onChange={e => setSection(e.target.value)}><option value="">– allgemein –</option>{ctx.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Gebaute Blöcke<input inputMode="numeric" value={blocks} onChange={e => setBlocks(e.target.value.replace(/\D/g, ''))} placeholder="z. B. 320" /></label>
      <label>Geliefert: Item<input value={item} onChange={e => setItem(e.target.value)} placeholder="stone, oak_log …" /></label>
      <label>Menge<input inputMode="numeric" value={count} onChange={e => setCount(e.target.value.replace(/\D/g, ''))} placeholder="64" /></label>
      <label className="wide">Notiz<input value={note} maxLength={300} onChange={e => setNote(e.target.value)} /></label>
      <button disabled={!blocks && !(item && count) && !note.trim()}>Beitrag melden</button>
    </form> : <p className="muted">Beiträge melden Helfer, Baumeister und Bauleitung.</p>}
    {delivered.length > 0 && <><h4>Gemeldete Lieferungen</h4><p className="team-chips static">{delivered.map(([i, n]) => <span key={i}>{formatNumber(n)} × {short(i)}</span>)}</p>
      <small className="muted">Das Lager im Reiter „Baustelle“ führt die Bauleitung; gemeldete Lieferungen dort bei Bedarf eintragen.</small></>}
    <h4>Sammelaufträge</h4>
    {view.gather.length ? <ul className="team-list">{view.gather.map(g => <li key={`${g.member}${g.item}`}><strong>{nameOf(g.member)}</strong><span>{formatNumber(g.count)} × {short(g.item)}</span></li>)}</ul> : <p className="muted">Niemand sammelt gerade etwas Bestimmtes.</p>}
    {allowed && <form className="team-inline" onSubmit={e => { e.preventDefault(); const n = Number(gCount); if (gItem && Number.isSafeInteger(n) && n > 0 && act({ kind: 'gather.claim', item: itemId(gItem), count: n }, 'Sammelauftrag übernommen')) { setGItem(''); setGCount(''); } }}>
      <input placeholder="Ich sammle: Item" value={gItem} onChange={e => setGItem(e.target.value)} /><input placeholder="Menge" inputMode="numeric" value={gCount} onChange={e => setGCount(e.target.value.replace(/\D/g, ''))} />
      <button disabled={!gItem || !gCount}>Übernehmen</button></form>}
  </div>;
}

function Notes({ view, ctx, me, role, act, nameOf }: { view: TeamView; ctx: ReturnType<typeof teamContextOf>; me: string | null; role: TeamRole; act: Act; nameOf(id?: string | null): string }) {
  const [text, setText] = useState(''), [tag, setTag] = useState<NoteTag>('frage'), [section, setSection] = useState(''), [showDone, setShowDone] = useState(false);
  const list = view.notes.filter(n => showDone || !n.resolved);
  return <div role="region" className="team-block" aria-label="Notizen am Bau">
    <div className="team-block-head"><h3>Notizen am Bau <small>{view.notes.filter(n => !n.resolved).length} offen</small></h3>
      <label className="team-check"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> erledigte zeigen</label></div>
    {me && <form className="team-inline" onSubmit={e => { e.preventDefault(); if (text.trim() && act({ kind: 'note.add', noteId: newId('note'), text: text.trim().slice(0, 500), tag, ...(section && { section }) }, 'Notiz geschrieben')) setText(''); }}>
      <select aria-label="Art" value={tag} onChange={e => setTag(e.target.value as NoteTag)}>{NOTE_TAGS.map(t => <option key={t} value={t}>{NOTE_TAG_LABEL[t]}</option>)}</select>
      <select aria-label="Abschnitt" value={section} onChange={e => setSection(e.target.value)}><option value="">ganzes Projekt</option>{ctx.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <input className="grow" placeholder="Notiz, @Name erwähnt jemanden" value={text} maxLength={500} onChange={e => setText(e.target.value)} /><button disabled={!text.trim()}>Schreiben</button></form>}
    {list.length ? <ul className="team-notes">{list.map(n => <li key={n.id} className={n.resolved ? 'done' : undefined}>
      <span className={`team-tag tag-${n.tag}`}>{NOTE_TAG_LABEL[n.tag]}</span>
      <span><strong>{nameOf(n.by)}</strong>{n.section ? ` · ${ctx.sections.find(s => s.id === n.section)?.name ?? 'Abschnitt'}` : ''}{n.pos ? ` · ${n.pos.join(' ')}` : ''} · {when(n.at)}<br />{n.text}
        {n.resolved && <small className="muted"><br />erledigt von {nameOf(n.resolved.by)}{n.resolved.text ? `: ${n.resolved.text}` : ''}</small>}</span>
      {!n.resolved && me && (n.by === me || canTeam(role, 'section.verify')) && <button className="secondary" onClick={() => act({ kind: 'note.resolve', noteId: n.id }, 'Notiz erledigt')}>Erledigt</button>}
    </li>)}</ul> : <p className="muted">Keine {showDone ? '' : 'offenen '}Notizen.</p>}
  </div>;
}

function Log({ team, ctx, names }: { team: TeamState; ctx: ReturnType<typeof teamContextOf>; names: ReadonlyMap<string, string> }) {
  const [all, setAll] = useState(false);
  const events = [...team.events].reverse().slice(0, all ? undefined : 15);
  return <details className="team-block team-log"><summary>Teamprotokoll <small>{team.events.length} Ereignisse</small></summary>
    <ol>{events.map(e => <li key={e.id}><small>{when(e.at)}{e.origin === 'server' ? ' · vom Server' : ''}</small> {describeEvent(e, ctx, names)}</li>)}</ol>
    {!all && team.events.length > 15 && <button className="link-button" onClick={() => setAll(true)}>alle zeigen</button>}
  </details>;
}
