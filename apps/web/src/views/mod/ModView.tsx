import { useMemo, useState } from 'react';
import type React from 'react';
import releasesData from './releases.json';
import { buildsFor, checkJarBytes, INSTALL_HINT, LOADER_LABEL, loadersFor, minecraftVersions, parseSelectionSearch, PLANNED_LOADERS, releasesFor, resolveSelection, selectionSearch, targetOf, versionsOf } from './releases';
import type { ModRelease, Selection, Target } from './releases';
import { formatNumber } from '../../app/ui';

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
      <p className="muted">Die Bauplaner-Mod zeigt deinen Plan im Spiel als Hologramm, gleicht ihn live mit der Welt ab, hilft beim richtigen Setzen und schreibt Aufnahmen für den Soll/Ist-Vergleich. Sie baut nie selbst und sendet nichts ins Internet.</p></div></div>

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
        <li>Die .jar in den Ordner <code>plugins</code> des Paper-Servers legen und den Server neu starten. Folia wird nicht unterstützt.</li>
        <li>Im Projekt unter „Bauen“ eine Revision einfrieren, im Tab „Export“ als <code>.schem</code> exportieren und auf dem Server nach <code>plugins/BauplanerBridge/plans/</code> hochladen (Dateiverwaltung oder FTP deines Hosters).</li>
        <li>Im Spiel <code>/bauplaner plan &lt;datei&gt;</code>, dann auf den Block mit Projektkoordinate 0/0/0 schauen und <code>/bauplaner anker hier</code> eingeben. Der Anker gilt für alle, die diesen Plan laden. In der Konsole: <code>bauplaner anker &lt;x&gt; &lt;y&gt; &lt;z&gt; [welt]</code>.</li>
        <li><code>/bauplaner scan</code> liest die ganze Planbox, auch ohne dass jemand in der Nähe ist: vorhandene Chunks werden kurz nachgeladen, nie erzeugtes Gelände wird nicht erzeugt. Die Aufnahme aus <code>plugins/BauplanerBridge/scans/</code> herunterladen und im Projekt unter „Bauen“ mit „Spielaufnahme importieren“ öffnen.</li>
      </ol>
      <p className="muted">Weitere Befehle: <code>/bauplaner status</code>, <code>/bauplaner abbrechen</code>, <code>/bauplaner plaene</code>, <code>/bauplaner scan geladen</code> (nur geladene Chunks). Rechte: <code>bauplaner.use</code> (alle), <code>bauplaner.nachladen</code> und <code>bauplaner.abbrechen.alle</code> (Operatoren). Einstellungen in <code>plugins/BauplanerBridge/config.yml</code>.</p>
    </section> : <section className="system-card system-wide" aria-labelledby="mod-install">
      <h2 id="mod-install">In dein Profil installieren und benutzen</h2>
      <ol className="mod-steps">
        {selection?.loader === 'fabric' || !selection
          ? <li><b>Modrinth App:</b> Profil öffnen → oben rechts <b>⋯</b> → „Ordner öffnen“ → Ordner <code>mods</code> öffnen und die .jar hineinlegen (unter Windows <code>%APPDATA%\ModrinthApp\profiles\&lt;Profilname&gt;\mods</code>). Ältere <code>bauplaner-bridge-…jar</code> dort löschen. Prism, CurseForge und andere Launcher haben ebenfalls einen Ordner <code>mods</code> je Profil. Fabric API muss im Profil sein (in Modpacks meist schon dabei).</li>
          : <li>{INSTALL_HINT[selection.loader] ?? INSTALL_HINT.fabric}</li>}
        <li>Im Projekt unter „Bauen“ eine Revision einfrieren, im Tab „Export“ als <code>.schem</code> exportieren (DataVersion für 26.3: 5023) und in den Profilordner nach <code>bauplaner/plans/</code> kopieren.</li>
        <li>Im Spiel auf die Stelle schauen, an der der Plan stehen soll, <b>J</b> drücken und den Plan anklicken. Dann mit Pfeiltasten und Bild↑/↓ schieben, Ende dreht, Einfg spiegelt.</li>
        <li>Bauen: fehlende Blöcke erscheinen als durchsichtige Geisterblöcke, falsche rot. <b>Num 7</b> Materialliste, <b>Num 6</b> Ebenen, <b>Num 8</b> Planblock in die Hand, <b>.</b> nächster Fehler. Die Platzierhilfe verhindert falsche Blöcke und falsche Ausrichtung und sagt, wie man richtig klickt.</li>
        <li>Für den Vergleich auf der Website: <code>/bauplaner plan &lt;datei&gt;</code>, <code>/bauplaner anker hier</code>, <code>/bauplaner scan</code> und die Aufnahme aus <code>bauplaner/scans/</code> im Projekt unter „Bauen“ mit „Spielaufnahme importieren“ öffnen.</li>
      </ol>
      <p className="muted">Läuft nur auf deinem Rechner, auch auf fremden Servern ohne Plugin. Alle Tasten unter Optionen → Steuerung → „Bauplaner“.</p>
    </section>}

    {!server && <section className="system-card system-wide" aria-labelledby="mod-live">
      <h2 id="mod-live">Mit dem Spiel verbinden (Live-Karte, ab Mod 0.5)</h2>
      <p>Die Weltkarte zeigt dann deine Position, das Gelände um dich und den Baufortschritt des Hologramms live. Pläne schickst du mit einem Klick ins Spiel, ohne Dateien zu kopieren, und Bauplätze, Wege und Punkte aus dem Weltplan erscheinen im Spiel als Linien.</p>
      <ol className="mod-steps">
        <li>Minecraft mit der Mod starten und eine Welt oder den Server betreten.</li>
        <li>Im Spiel <code>/bauplaner verbinden</code> eingeben. Der Chat zeigt einen sechsstelligen Code (5 Minuten gültig).</li>
        <li>Auf der <a href="#/karte">Weltkarte</a> unter „Spiel“ auf „Verbinden“ drücken, den Code eintragen, „Koppeln“. Fragt der Browser nach Zugriff auf Geräte im lokalen Netzwerk: erlauben.</li>
      </ol>
      <p className="muted">Die Verbindung läuft nur zwischen diesem Browser und deinem Minecraft auf demselben Computer (127.0.0.1), nichts geht an den Server, die Welt wird nie verändert. Nur diese Website darf die Mod abfragen. <code>/bauplaner verbinden status</code> zeigt den Stand, <code>/bauplaner verbinden aus</code> trennt alle Browser.</p>
    </section>}
  </div>;
}
