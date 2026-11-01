import { useMemo, useState } from 'react';
import releasesData from './releases.json';
import { buildsFor, LOADER_LABEL, loadersFor, minecraftVersions, parseSelectionSearch, PLANNED_LOADERS, resolveSelection, selectionSearch } from './releases';
import type { ModRelease, Selection } from './releases';
import { formatNumber } from '../../app/ui';

const releases: readonly ModRelease[] = releasesData.releases;
const base = import.meta.env.BASE_URL;
const kb = (n: number) => `${formatNumber(Math.round(n / 1024))} KB`;

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

  return <div className="page system-page mod-page">
    <div className="page-head"><div><span className="eyebrow">MOD · BAUPLANER-BRÜCKE</span><h1 className="page-title">Mod herunterladen</h1>
      <p className="muted">Die Mod liest im Spiel den Bereich eines Bauplans und schreibt eine Aufnahme, die du im Projekt unter „Bauen“ importierst. Sie setzt keine Blöcke, sendet nichts ins Internet und braucht nichts auf dem Server.</p></div></div>

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
          <div><dt>{LOADER_LABEL[build.loader] ?? build.loader} Loader</dt><dd>ab {build.loaderMin}</dd></div>
          {build.fabricApi && <div><dt>Fabric API</dt><dd>{build.fabricApi} (muss installiert sein)</dd></div>}
          <div><dt>Java</dt><dd>{build.java}</dd></div>
          <div><dt>Größe</dt><dd>{kb(build.bytes)}</dd></div>
          <div><dt>Bereitgestellt</dt><dd>{new Date(build.releasedAt).toLocaleDateString('de-DE')} · Quelle <code>{build.sourceCommit.slice(0, 7)}</code></dd></div>
        </dl>
        <div className="button-row"><a className="primary" href={`${base}downloads/mod/${build.file}`} download={build.file}>⬇ {build.file} herunterladen</a></div>
        <p className="muted mod-sha">SHA-256: <code>{build.sha256}</code></p>
        <p className="muted"><b>Geprüft:</b> {build.tested}</p>
      </section>}
    </div>}

    <section className="system-card system-wide" aria-labelledby="mod-install">
      <h2 id="mod-install">Installieren und benutzen</h2>
      <ol className="mod-steps">
        <li>Die .jar in den Ordner <code>mods</code> deiner Fabric-Instanz legen (Modrinth App, Prism, CurseForge oder offizieller Launcher mit Fabric-Profil). Fabric API muss installiert sein.</li>
        <li>Im Projekt unter „Bauen“ eine Revision einfrieren, dann im Tab „Export“ als <code>.schem</code> exportieren (DataVersion für 26.3: 5023) und nach <code>&lt;Instanzordner&gt;/bauplaner/plans/</code> kopieren.</li>
        <li>Im Spiel <code>/bauplaner plan &lt;datei&gt;</code>, dann auf den Block mit Projektkoordinate 0/0/0 schauen und <code>/bauplaner anker hier</code> eingeben.</li>
        <li>In der Nähe des Baus <code>/bauplaner scan</code>. Die Aufnahme aus <code>bauplaner/scans/</code> im Projekt unter „Bauen“ mit „Spielaufnahme importieren“ öffnen.</li>
      </ol>
      <p className="muted">Weitere Befehle: <code>/bauplaner status</code>, <code>/bauplaner abbrechen</code>, <code>/bauplaner plaene</code>. Nur geladene Chunks werden gelesen.</p>
    </section>
  </div>;
}
