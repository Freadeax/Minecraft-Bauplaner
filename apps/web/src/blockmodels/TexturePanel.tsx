import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cancelTextureLoad, DEFAULT_VERSION, installFromFiles, installFromMojang, releaseVersions, removeTextures, usePackStatus } from './assets';

/**
 * Blockdarstellung: where the user decides between the own shapes in average
 * colours and the original Minecraft textures. Textures come either straight
 * from Mojang's servers into this browser or from files the user picks; they
 * are kept only in this browser.
 */
let open = false;
const listeners = new Set<() => void>();
const setOpen = (v: boolean) => { open = v; for (const l of listeners) l(); };
export function openTextureDialog(): void { setOpen(true); }
const useOpen = () => useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => open);

const mb = (n: number) => `${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;

/** Small status button for the top bar. */
export function TextureChip() {
  const status = usePackStatus();
  const label = status.state === 'ready' ? 'Originaltexturen' : status.state === 'loading' ? 'Texturen laden …' : 'Eigene Formen';
  return <button type="button" className={`texture-chip ${status.state}`} onClick={openTextureDialog}
    title="Blockdarstellung: eigene Formen oder Originaltexturen deiner Minecraft-Version">▦ <span>{label}</span></button>;
}

export function TextureDialog() {
  const isOpen = useOpen();
  const ref = useRef<HTMLDialogElement>(null);
  const status = usePackStatus();
  const [versions, setVersions] = useState<string[]>([DEFAULT_VERSION]);
  const [version, setVersion] = useState(DEFAULT_VERSION);
  const [add, setAdd] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal(); else if (!isOpen && d.open) d.close();
  }, [isOpen]);
  // Mojang is contacted only on request: the version list when the select is used, the jar on the button.
  const listVersions = () => {
    if (versions.length > 1) return;
    releaseVersions().then(list => setVersions(list.slice(0, 30))).catch(() => { /* offline: default version only */ });
  };

  const busy = status.state === 'loading';
  const meta = status.state === 'ready' || status.state === 'error' ? status.meta : undefined;
  // Content only while open, so the page holds no extra file input in the background.
  return <dialog ref={ref} className="texture-dialog" aria-labelledby="texture-title" onClose={() => setOpen(false)}>{isOpen && <>
    <form method="dialog" className="texture-close"><button aria-label="Schließen">✕</button></form>
    <h2 id="texture-title">Blockdarstellung</h2>
    <p className="texture-state" role="status">
      {status.state === 'ready' ? <><b>Originaltexturen aktiv:</b> {status.meta.sources.map(s => s.label).join(' + ')} · {status.meta.files.toLocaleString('de-DE')} Dateien · {mb(status.meta.bytes)}, nur in diesem Browser gespeichert.</>
        : status.state === 'loading' ? <><b>{status.step}</b>{status.fraction !== undefined && <progress max={1} value={status.fraction} />} <button type="button" onClick={cancelTextureLoad}>Abbrechen</button></>
        : status.state === 'error' ? <><b>Fehler:</b> {status.message}{meta && <> Weiter aktiv: {meta.sources.map(s => s.label).join(' + ')}.</>}</>
        : <><b>Eigene Formen:</b> Treppen, Stufen, Zäune, Türen, Pflanzen und alle übrigen Blöcke in eigener Nachbildung mit Durchschnittsfarben. Für die echten Minecraft-Texturen und -Modelle eine Quelle laden.</>}
    </p>
    <section>
      <h3>Von Mojang laden</h3>
      <p>Dein Browser lädt die offizielle Client-Datei direkt von Mojangs Servern (piston-data.mojang.com), wie es ein Launcher tut, prüft die Prüfsumme und behält nur Blockmodelle und -texturen. Das Build Studio selbst veröffentlicht keine Minecraft-Texturen. Voraussetzung ist eine eigene Minecraft-Lizenz; es gelten die Minecraft-EULA und Mojangs Nutzungsrichtlinien.</p>
      <div className="texture-row">
        <label>Version <select value={version} onFocus={listVersions} onChange={e => setVersion(e.target.value)} disabled={busy}>{versions.map(v => <option key={v}>{v}</option>)}</select></label>
        <button type="button" className="primary" disabled={busy} onClick={() => void installFromMojang(version)}>Texturen laden (ca. 40 MB)</button>
      </div>
    </section>
    <section>
      <h3>Eigene Dateien</h3>
      <p>Client-Jar deiner Installation (z. B. <code>.minecraft/versions/26.3/26.3.jar</code>), Ressourcenpakete (.zip) oder Mod-Jars mit Blockmodellen. Mehrere Dateien gelten in der gewählten Reihenfolge, spätere überschreiben frühere.</p>
      <div className="texture-row">
        <label className="file-button">Dateien wählen<input type="file" accept=".jar,.zip" multiple disabled={busy}
          onChange={e => { const files = [...(e.currentTarget.files ?? [])]; e.currentTarget.value = ''; if (files.length) void installFromFiles(files, add); }} /></label>
        <label className="check"><input type="checkbox" checked={add} disabled={busy || status.state !== 'ready'} onChange={e => setAdd(e.target.checked)} /> zu den aktiven Texturen hinzufügen</label>
      </div>
    </section>
    {meta && <div className="texture-row end"><button type="button" disabled={busy} onClick={() => void removeTextures()}>Texturen aus diesem Browser entfernen</button></div>}
  </>}</dialog>;
}
