import { useMemo, useState } from 'react';
import type React from 'react';
import releasesData from './releases.json';
import { buildsFor, checkJarBytes, INSTALL_HINT, LOADER_LABEL, loadersFor, minecraftVersions, parseSelectionSearch, PLANNED_LOADERS, resolveSelection, selectionSearch, SERVER_LOADERS, versionsOf } from './releases';
import type { ModRelease, Selection } from './releases';
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

/** Download page of the game bridge: pick Minecraft version, loader and mod version, then download the jar. */
export function ModView({ search }: { search?: string | undefined }) {
  const [selection, setSelection] = useState<Selection | null>(() => resolveSelection(releases, parseSelectionSearch(search)));
  /** A new Minecraft version or loader starts again at its newest mod version. */
  const choose = (wish: Partial<Selection>, newestVersion = false) => {
    const current: Partial<Selection> = selection ? (newestVersion ? { minecraft: selection.minecraft, loader: selection.loader } : selection) : {};
    const next = resolveSelection(releases, { ...current, ...wish });
    setSelection(next);
    // Shareable link without a hashchange (which would scroll to the top).
    if (next) history.replaceState(null, '', `#/mod?${selectionSearch(next)}`);
  };
  const versions = useMemo(() => minecraftVersions(releases), []);
  const loaders = selection ? loadersFor(releases, selection.minecraft) : [];
  const builds = selection ? buildsFor(releases, selection.minecraft, selection.loader) : [];
  const build = builds.find(b => b.modVersion === selection?.modVersion);
  const server = !!selection && SERVER_LOADERS.includes(selection.loader);
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
      <p className="muted">Die Brücke liest den Bereich eines Bauplans aus der Welt und schreibt eine Aufnahme, die du im Projekt unter „Bauen“ importierst. Sie setzt keine Blöcke und sendet nichts ins Internet. Als Fabric-Mod läuft sie in deinem Spiel und braucht nichts auf dem Server; als Paper-Plugin läuft sie auf dem Server und liest dort die ganze Welt.</p></div></div>

    {!selection ? <div className="notice warning" role="alert">Noch keine Mod-Version bereitgestellt.</div> : <div className="system-grid">
      <section className="system-card" aria-labelledby="mod-choose">
        <h2 id="mod-choose">Passende Version wählen</h2>
        <label>Minecraft-Version
          <select value={selection.minecraft} onChange={e => choose({ minecraft: e.target.value }, true)}>
            {versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select></label>
        <label>Mod-Loader
          <select value={selection.loader} onChange={e => choose({ loader: e.target.value }, true)}>
            {loaders.map(l => <option key={l} value={l}>{LOADER_LABEL[l] ?? l}</option>)}
            {PLANNED_LOADERS.filter(l => !loaders.includes(l)).map(l => <option key={l} value={l} disabled>{LOADER_LABEL[l] ?? l} – geplant</option>)}
          </select></label>
        <label>Mod-Version
          <select value={selection.modVersion} onChange={e => choose({ modVersion: e.target.value })}>
            {builds.map((b, i) => <option key={b.modVersion} value={b.modVersion}>{b.modVersion}{i === 0 ? ' (neueste)' : ''}</option>)}
          </select></label>
        <p className="muted">Deine Minecraft-Version steht im Launcher beim Profil und im Spiel links unten im Hauptmenü.</p>
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
      <h2 id="mod-install">Installieren und benutzen</h2>
      <ol className="mod-steps">
        <li>{INSTALL_HINT[selection?.loader ?? 'fabric'] ?? INSTALL_HINT.fabric}</li>
        <li>Im Projekt unter „Bauen“ eine Revision einfrieren, dann im Tab „Export“ als <code>.schem</code> exportieren (DataVersion für 26.3: 5023) und nach <code>&lt;Instanzordner&gt;/bauplaner/plans/</code> kopieren.</li>
        <li>Im Spiel <code>/bauplaner plan &lt;datei&gt;</code>, dann auf den Block mit Projektkoordinate 0/0/0 schauen und <code>/bauplaner anker hier</code> eingeben.</li>
        <li>In der Nähe des Baus <code>/bauplaner scan</code>. Die Aufnahme aus <code>bauplaner/scans/</code> im Projekt unter „Bauen“ mit „Spielaufnahme importieren“ öffnen.</li>
      </ol>
      <p className="muted">Weitere Befehle: <code>/bauplaner status</code>, <code>/bauplaner abbrechen</code>, <code>/bauplaner plaene</code>. Nur geladene Chunks werden gelesen.</p>
    </section>}
  </div>;
}
