import { useMemo, useState } from 'react';
import type React from 'react';
import releasesData from './releases.json';
import { buildsFor, checkJarBytes, INSTALL_HINT, LOADER_LABEL, loadersFor, minecraftVersions, parseSelectionSearch, PLANNED_LOADERS, releasesFor, resolveSelection, selectionSearch, targetOf, versionsOf } from './releases';
import type { ModRelease, Selection, Target } from './releases';
import { formatNumber } from '../../app/ui';
import { More } from '../../app/More';
import { ServerPanel } from './ServerPanel';
import { ModCommands } from './ModCommands';
import { INSTALL_CHECKS, LAUNCHERS, LAUNCHER_LABEL, MODRINTH_PAGE, installGuide, stepParts } from './installGuide';
import type { LauncherId } from './installGuide';

const LAUNCHER_KEY = 'bauplaner.mod.launcher';
const readLauncher = (): LauncherId => { try { const v = localStorage.getItem(LAUNCHER_KEY); return LAUNCHERS.includes(v as LauncherId) ? v as LauncherId : 'modrinth'; } catch { return 'modrinth'; } };

/** Text with `code` and **bold** parts (installGuide.ts). */
const Rich = ({ text }: { text: string }) => <>{stepParts(text).map((p, i) => p.code ? <code key={i}>{p.text}</code> : p.bold ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>)}</>;

/** GAME-11 S04: installation per launcher for the chosen loader and Minecraft version. */
function LauncherGuide({ loader, minecraft, file }: { loader: string; minecraft: string; file: string }) {
  const [launcher, setLauncher] = useState<LauncherId>(readLauncher);
  const pick = (l: LauncherId) => { setLauncher(l); try { localStorage.setItem(LAUNCHER_KEY, l); } catch { /* private mode */ } };
  const guide = installGuide(launcher, loader, minecraft, file);
  return <section className="system-card system-wide mod-launchers" aria-labelledby="mod-launcher">
    <h2 id="mod-launcher">Installieren mit deinem Launcher</h2>
    <div className="seg" role="group" aria-label="Launcher">
      {LAUNCHERS.map(l => <button key={l} type="button" aria-pressed={launcher === l} onClick={() => pick(l)}>{LAUNCHER_LABEL[l]}</button>)}
    </div>
    <ol className="mod-steps" aria-label={`Schritte für ${LAUNCHER_LABEL[launcher]}`}>
      {guide.steps.map((step, i) => <li key={i}><Rich text={step} /></li>)}
    </ol>
    <p className="muted"><b>Ordner <code>mods</code>:</b> <Rich text={guide.folder} />{guide.needs.length > 0 && <> · Außerdem nötig: {guide.needs.join(', ')}.</>} Modrinth-Seite: <a href={MODRINTH_PAGE} target="_blank" rel="noopener noreferrer">Bauplaner Bridge</a> (erscheint, sobald Modrinth sie freigegeben hat).</p>
    <ul className="mod-checks">{INSTALL_CHECKS.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul>
  </section>;
}

const releases: readonly ModRelease[] = releasesData.releases;
const base = import.meta.env.BASE_URL;
const kb = (n: number) => `${formatNumber(Math.round(n / 1024))} KB`;

type Check = { state: 'idle' } | { state: 'busy' } | { state: 'ok'; file: string } | { state: 'bad'; file: string; problems: string[] };

/**
 * Downloads the jar, checks it like a launcher would (size, SHA-256, ZIP end, metadata) and only then
 * saves exactly these bytes. A cut-off download or an HTML page never lands in the mods folder.
 */
async function verifiedDownload(href: string, build: ModRelease): Promise<string[]> {
  const response = await fetch(href, { cache: 'no-store' });
  if (!response.ok) return [`Server antwortet mit ${response.status}.`];
  const bytes = new Uint8Array(await response.arrayBuffer());
  const problems = checkJarBytes(bytes, build);
  if (!problems.length) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const hex = [...digest].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hex !== build.sha256) problems.push('Prüfsumme (SHA-256) stimmt nicht.');
  }
  if (problems.length) return problems;
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/java-archive' }));
  const a = document.createElement('a');
  a.href = url; a.download = build.file; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return [];
}

/**
 * Download page of the game bridge. First choice: for my game (client mod in a launcher profile) or for a
 * server (plugin), so a player never ends up with the server plugin; then Minecraft version, loader, version.
 */
export function ModView({ search }: { search?: string | undefined }) {
  const wish = parseSelectionSearch(search);
  const [target, setTarget] = useState<Target>(() => wish.loader && targetOf(wish.loader) === 'server' && releasesFor(releases, 'server').length ? 'server' : 'client');
  const pool = useMemo(() => {
    const own = releasesFor(releases, target);
    return own.length ? own : [...releases];
  }, [target]);
  const [selection, setSelection] = useState<Selection | null>(() => resolveSelection(pool, wish));
  const remember = (next: Selection | null) => {
    setSelection(next);
    // Shareable link without a hashchange (which would scroll to the top).
    if (next) history.replaceState(null, '', `#/mod?${selectionSearch(next)}`);
  };
  /** A new Minecraft version or loader starts again at its newest mod version. */
  const choose = (change: Partial<Selection>, newestVersion = false) => {
    const current: Partial<Selection> = selection ? (newestVersion ? { minecraft: selection.minecraft, loader: selection.loader } : selection) : {};
    remember(resolveSelection(pool, { ...current, ...change }));
  };
  const switchTarget = (next: Target) => {
    if (next === target) return;
    setTarget(next);
    setCheck({ state: 'idle' });
    remember(resolveSelection(releasesFor(releases, next), selection ? { minecraft: selection.minecraft } : {}));
  };
  const versions = useMemo(() => minecraftVersions(pool), [pool]);
  const loaders = selection ? loadersFor(pool, selection.minecraft) : [];
  const builds = selection ? buildsFor(pool, selection.minecraft, selection.loader) : [];
  const build = builds.find(b => b.modVersion === selection?.modVersion);
  const server = target === 'server';
  const hasServer = releasesFor(releases, 'server').length > 0;
  const [check, setCheck] = useState<Check>({ state: 'idle' });
  const download = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!build || !window.crypto?.subtle) return; // without WebCrypto the plain link downloads
    event.preventDefault();
    const href = event.currentTarget.href;
    setCheck({ state: 'busy' });
    verifiedDownload(href, build).then(
      problems => setCheck(problems.length ? { state: 'bad', file: build.file, problems } : { state: 'ok', file: build.file }),
      () => setCheck({ state: 'bad', file: build.file, problems: ['Keine Verbindung zum Server.'] }));
  };

  return <div className="page system-page mod-page">
    <div className="page-head"><div><span className="eyebrow">MOD · BAUPLANER-BRÜCKE</span><h1 className="page-title">Mod herunterladen</h1>
      <p className="muted">Die Bauplaner-Mod zeigt deinen Plan im Spiel als Hologramm, gleicht ihn live mit der Welt ab, hilft beim richtigen Setzen und schreibt Aufnahmen für den Soll/Ist-Vergleich. Sie baut nie selbst und sendet nichts ins Internet.</p>
      <p><a href="#/anleitung?weg=mod" data-guide-link="">Neu hier? Schritt für Schritt mit Bildern: „Mod installieren und verbinden“ →</a></p></div></div>

    <div className="mod-targets" role="group" aria-label="Wofür brauchst du die Mod?">
      <button type="button" className="mod-target" aria-pressed={!server} onClick={() => switchTarget('client')}>
        <b>Für mein Spiel</b><span className="mod-target-tag">Client-Mod · empfohlen</span>
        <span>In dein Launcher-Profil (Modrinth App, Prism, CurseForge …). Hologramm, Materialliste, Platzierhilfe und Aufnahme. Auf dem Server muss nichts installiert sein.</span>
      </button>
      {hasServer && <button type="button" className="mod-target" aria-pressed={server} onClick={() => switchTarget('server')}>
        <b>Für einen Server</b><span className="mod-target-tag">Server-Plugin · Paper</span>
        <span>Nur für Serverbetreiber: kommt in den Ordner <code>plugins</code> des Servers, nicht in dein Spielprofil. Liest die ganze Welt für Aufnahmen.</span>
      </button>}
    </div>

    {!server && <section className="system-card system-wide mod-quick" aria-labelledby="mod-quick">
      <h2 id="mod-quick">So geht's in drei Schritten</h2>
      <ol className="mod-steps mod-quick-steps">
        <li><b>Mod holen:</b> in der Modrinth App „Bauplaner Bridge“ suchen und installieren – oder unten die passende Datei laden.</li>
        <li><b>Verbinden:</b> Minecraft starten, <b>J</b> drücken und „Planer zulassen“ klicken.</li>
        <li><b>Plan ins Spiel:</b> auf der <a href="#/karte">Weltkarte</a> „▶ Ins Spiel senden“ – der Plan erscheint als Hologramm.</li>
      </ol>
    </section>}

    <ServerPanel search={search} />

    {!selection ? <div className="notice warning" role="alert">Noch keine Mod-Version bereitgestellt.</div> : <div className="system-grid">
      <section className="system-card" aria-labelledby="mod-choose">
        <h2 id="mod-choose">Passende Version wählen</h2>
        <label>Minecraft-Version
          <select value={selection.minecraft} onChange={e => choose({ minecraft: e.target.value }, true)}>
            {versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select></label>
        <label>{server ? 'Server-Software' : 'Mod-Loader'}
          <select value={selection.loader} onChange={e => choose({ loader: e.target.value }, true)}>
            {loaders.map(l => <option key={l} value={l}>{LOADER_LABEL[l] ?? l}</option>)}
            {!server && PLANNED_LOADERS.filter(l => !loaders.includes(l)).map(l => <option key={l} value={l} disabled>{LOADER_LABEL[l] ?? l} – geplant</option>)}
          </select></label>
        <label>Mod-Version
          <select value={selection.modVersion} onChange={e => choose({ modVersion: e.target.value })}>
            {builds.map((b, i) => <option key={b.modVersion} value={b.modVersion}>{b.modVersion}{i === 0 ? ' (neueste)' : ''}</option>)}
          </select></label>
        <p className="muted">{server ? 'Die Minecraft-Version des Servers steht in der Serverliste und in der Konsole beim Start.' : 'Minecraft-Version und Loader stehen in der Modrinth App oben auf der Profilseite (z. B. „Fabric 26.3“), im Spiel links unten im Hauptmenü.'}</p>
      </section>

      {build && <section className="system-card" aria-labelledby="mod-file">
        <h2 id="mod-file">Datei</h2>
        <dl className="system-facts">
          <div><dt>Minecraft</dt><dd>{build.minecraft}</dd></div>
          {server
            ? <div><dt>Server</dt><dd>{LOADER_LABEL[build.loader] ?? build.loader}-Server, geprüft mit Minecraft {versionsOf(build).join(', ')}</dd></div>
            : <div><dt>{LOADER_LABEL[build.loader] ?? build.loader} Loader</dt><dd>ab {build.loaderMin}</dd></div>}
          {build.fabricApi && <div><dt>Fabric API</dt><dd>{build.fabricApi} (muss installiert sein)</dd></div>}
          <div><dt>Java</dt><dd>{server ? `wie der Server, mindestens ${build.java}` : build.java}</dd></div>
          <div><dt>Größe</dt><dd>{kb(build.bytes)}</dd></div>
          <div><dt>Bereitgestellt</dt><dd>{new Date(build.releasedAt).toLocaleDateString('de-DE')} · Quelle <code>{build.sourceCommit.slice(0, 7)}</code></dd></div>
        </dl>
        <div className="button-row"><a className="primary" href={`${base}downloads/mod/${build.file}`} download={build.file} onClick={download} aria-busy={check.state === 'busy'}>⬇ {build.file} herunterladen</a></div>
        <p className="mod-check" role="status">
          {check.state === 'busy' && 'Lade und prüfe die Datei …'}
          {check.state === 'ok' && check.file === build.file && <>✓ Geprüft und gespeichert: vollständig ({formatNumber(build.bytes)} Bytes), Prüfsumme stimmt, als Mod lesbar. Prüfe im Download-Ordner, dass die Datei genau {formatNumber(build.bytes)} Bytes hat.</>}
          {check.state === 'bad' && check.file === build.file && <span className="mod-check-bad">Nicht gespeichert, die geladene Datei ist fehlerhaft: {check.problems.join(' ')} Bitte erneut versuchen.</span>}
        </p>
        <p className="muted mod-sha">SHA-256: <code>{build.sha256}</code></p>
        <p className="muted"><b>Geprüft:</b> {build.tested}</p>
      </section>}
    </div>}

    {server ? <section className="system-card system-wide" aria-labelledby="mod-install">
      <h2 id="mod-install">Auf dem Server installieren und benutzen</h2>
      <ol className="mod-steps">
        <li>Die .jar in den Ordner <code>plugins</code> des Paper-Servers legen und den Server neu starten (Dateimenü deines Hosters). Folia wird nicht unterstützt. Das Plugin richtet sich beim ersten Start selbst ein.</li>
        <li>Als Operator mit der Bauplaner-Mod (ab 0.12) beitreten, im Spiel <b>J</b> → „Teambau erlauben“, dann oben auf dieser Seite unter „Spiel und Server verbinden“ auf „Server koppeln“. Ab dann stellst du alles hier ein: Einstellungen, Team, Team-Raum. Befehle sind nicht nötig.</li>
        <li>Team-Infos (Abschnitte, Lagerkisten, Abschnittsschutz) holt sich das Plugin über das Internet aus dem Team-Raum: Im Projekt unter „Team“ → „Team live“ als Bauleitung „Mein Spiel verbinden“ klicken und mit der Mod auf den Server gehen – die Mod verbindet den Server dann selbst (Mod und Plugin ab 0.21.0). Pläne legst du mit „⇪ Plan auf den Server legen“ im Reiter „Bauen“ ab. Nichts herunterladen, nichts hochladen.</li>
        <li>Im Spiel <code>/bauplaner plan &lt;datei&gt;</code>, dann auf den Block mit Projektkoordinate 0/0/0 schauen und <code>/bauplaner anker hier</code> eingeben. Der Anker gilt für alle, die diesen Plan laden. In der Konsole: <code>bauplaner anker &lt;x&gt; &lt;y&gt; &lt;z&gt; [welt]</code>.</li>
        <li>Am einfachsten ohne Befehl: Server unten koppeln, auf der Weltkarte „⇪ Auf den Server legen“, dann im Projekt unter „Bauen“ „⇩ Auf dem Server aufnehmen“ (Plugin 0.13.0).</li>
        <li><code>/bauplaner scan</code> liest die ganze Planbox, auch ohne dass jemand in der Nähe ist: vorhandene Chunks werden kurz nachgeladen, nie erzeugtes Gelände wird nicht erzeugt. Der Planer holt sie per Klick über die Mod oder den Team-Raum („⟳ Baustand holen“); die Datei in <code>plugins/BauplanerBridge/scans/</code> braucht nur der Notfall ohne Internet.</li>
      </ol>
      <p className="muted">Weitere Befehle: <code>/bauplaner status</code>, <code>/bauplaner abbrechen</code>, <code>/bauplaner plaene</code>, <code>/bauplaner scan geladen</code> (nur geladene Chunks). Rechte: <code>bauplaner.use</code> (alle), <code>bauplaner.nachladen</code> und <code>bauplaner.abbrechen.alle</code> (Operatoren). Einstellungen in <code>plugins/BauplanerBridge/config.yml</code>.</p>
    </section> : <More title="Ausführliche Anleitung" hint="Plan setzen, Tasten im Spiel, Baustand vergleichen"><section className="system-card system-wide" aria-labelledby="mod-install">
      <h2 id="mod-install">In dein Profil installieren und benutzen</h2>
      <ol className="mod-steps">
        <li>{selection ? <>Mod in dein Profil bringen: Schritte für deinen Launcher stehen unten unter „Installieren mit deinem Launcher“. Kurz: <code>.jar</code> in den Ordner <code>mods</code> des {LOADER_LABEL[selection.loader] ?? selection.loader}-Profils legen.</> : INSTALL_HINT.fabric}</li>
        <li>Planer und Mod verbinden (oben „Mit dem Spiel verbinden“, im Spiel J → „Planer zulassen“), dann auf der Weltkarte „▶ Ins Spiel senden“ – ohne Datei kopieren. Im Team: „Team live“ → „Mein Spiel verbinden“.</li>
        <li>Im Spiel auf die Stelle schauen, an der der Plan stehen soll, <b>J</b> drücken: rechts gleitet das Menü mit den Reitern Plan, Position, Ansicht und Optionen herein. Plan anklicken, „Hierher“, unter „Position“ schieben, drehen, spiegeln (oder Pfeiltasten, Bild↑/↓, Ende dreht, Einfg spiegelt).</li>
        <li>Bauen: fehlende Blöcke erscheinen als durchsichtige Geisterblöcke, falsche rot. <b>Num 7</b> Materialliste, <b>Num 6</b> Ebenen, <b>Num 8</b> Planblock in die Hand, <b>.</b> nächster Fehler. Die Platzierhilfe verhindert falsche Blöcke und falsche Ausrichtung und sagt, wie man richtig klickt.</li>
        <li>Für den Vergleich auf der Website: im Projekt unter „Bauen“ „⟳ Baustand holen (bester Weg)“ – die Mod liest den Bau und schickt ihn direkt an den Planer. Nur ohne Verbindung: <code>/bauplaner scan</code> und „Notfall: Aufnahme-Datei“.</li>
      </ol>
      <p className="muted">Läuft nur auf deinem Rechner, auch auf fremden Servern ohne Plugin. Meldungen der Mod erscheinen ab 0.23.0 als kurze Karte oben rechts statt im Chat, das Baufenster oben rechts ist kompakt; beides stellst du im Menü unter „Optionen“ um (oder <code>/bauplaner meldungen chat</code>, <code>/bauplaner anzeige ausfuehrlich</code>). <code>/bauplaner hilfe</code> zeigt die fünf Schritte. Alle Tasten unter Optionen → Steuerung → „Bauplaner“.</p>
    </section></More>}

    {!server && selection && build && <LauncherGuide loader={selection.loader} minecraft={selection.minecraft} file={build.file} />}

    <More title="Alle Befehle (Deutsch / English)" hint="Jeder Befehl als /bauplaner und /buildplanner, mit Suche">
      <ModCommands />
    </More>

    {!server && <More title="Mehr wissen" hint="Live-Karte im Detail und gemeinsames Bauen im Spiel">
      <section className="system-card system-wide" aria-labelledby="mod-live">
      <h2 id="mod-live">Mit dem Spiel verbinden (Live-Karte, ab Mod 0.5)</h2>
      <p>Die Weltkarte zeigt dann deine Position, das Gelände um dich und den Baufortschritt des Hologramms live. Pläne schickst du mit einem Klick ins Spiel, ohne Dateien zu kopieren, und Bauplätze, Wege und Punkte aus dem Weltplan erscheinen im Spiel als Linien.</p>
      <ol className="mod-steps">
        <li>Minecraft mit der Mod starten und eine Welt oder den Server betreten.</li>
        <li>Oben unter „Spiel und Server verbinden“ oder auf der <a href="#/karte">Weltkarte</a> unter „Spiel“ auf „Verbinden“ drücken. Fragt der Browser nach Zugriff auf Geräte im lokalen Netzwerk: erlauben.</li>
        <li>Im Spiel <b>J</b> drücken und „Planer zulassen“ klicken (ab Mod 0.12; ältere Mods: <code>/bauplaner verbinden</code> und den Code eintragen).</li>
      </ol>
      <p className="muted">Die Verbindung läuft nur zwischen diesem Browser und deinem Minecraft auf demselben Computer (127.0.0.1), nichts geht an den Server, die Welt wird nie verändert. Nur diese Website darf die Mod abfragen. <code>/bauplaner verbinden status</code> zeigt den Stand, <code>/bauplaner verbinden aus</code> trennt alle Browser.</p>
      </section>

      <section className="system-card system-wide" aria-labelledby="mod-team">
      <h2 id="mod-team">Gemeinsam bauen im Spiel (ab Mod 0.10.0)</h2>
      <p>Mit einem Team im Projekt (Reiter „Team“) zeigt das Hologramm die Bauabschnitte in der Farbe ihres Inhabers, rechts unten steht dein Auftrag mit Fortschritt. Übernehmen, fertig melden, Notizen und Lieferungen gehen direkt aus dem Spiel.</p>
      <ol className="mod-steps">
        <li>Im Planer im Reiter „Team“ „Ich bin“ wählen, mit dem Spiel verbinden (siehe oben) und unter „Mit Spiel abgleichen“ „Jetzt abgleichen“ drücken.</li>
        <li>Im Spiel <code>/bauplaner team abschnitte</code>, <code>/bauplaner team nehmen &lt;nr&gt;</code>, <code>/bauplaner team mein</code> (nur deine Abschnitte einblenden), <code>/bauplaner team material</code>, <code>/bauplaner team fertig</code>.</li>
        <li>Läuft auf dem Server das Bauplaner-Plugin, fragt das Spiel einmal: <b>J</b> → „Teambau erlauben“. Dann kommen die Meldungen aller Mitspieler live an und die Bauleitung kann den Planstand vom Planer aus auf den Server legen.</li>
      </ol>
      <p className="muted">Ohne „Teambau erlauben“ sendet die Mod nichts an den Server, auch wenn er das Plugin hat. Deine Meldungen warten dann im Ausgangskorb, bis der Planer sie beim nächsten Abgleich abholt (<code>/bauplaner team korb</code>). <code>/bauplaner team verbieten</code> schaltet den Kanal für diesen Server wieder ab. Ab Mod 0.11.0 gehen alle diese Befehle, auch die des Server-Plugins für Lager und Nachweis, per Klick: im Plan-Menü (J) unten links „Befehle &amp; Status“. Mit NeoForge nennt der Client beim Verbinden die Namen aller optionalen Kanäle seiner Mods, auch <code>bauplaner:team</code>. Das ist Teil der Verbindungsaushandlung von NeoForge, dabei wird kein Teampaket gesendet.</p>
      </section>
    </More>}
  </div>;
}
