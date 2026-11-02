import { useMemo, useState } from 'react';
import { buildLiveMapUrl } from '../../../../../packages/domain/src/livemap.js';
import { DIMENSIONS, dimensionLabel, liveMapPositionOf, liveMapTemplateFromLink, mapMarkers, placementsJson } from '../../../../../packages/domain/src/worldmap.js';
import type { MapEntry, WorldMapView } from '../../../../../packages/domain/src/worldmap.js';
import { download, errorText } from '../../app/ui';
import { LIVE_MAP_KIND_LABEL as KIND_LABEL, LIVE_MAP_PRESETS, templateProblem } from './liveMapConfig';
import type { LiveMapSettings } from './liveMapConfig';

function linkFor(settings: LiveMapSettings, entry: MapEntry): string | null {
  if (!settings.urlTemplate || templateProblem(settings)) return null;
  const world = settings.worlds[entry.placement.dimension]; if (!world) return null;
  const position = liveMapPositionOf(entry, world); if (!position) return null;
  try { return buildLiveMapUrl({ name: settings.name || 'Live-Karte', urlTemplate: settings.urlTemplate }, position); } catch { return null; }
}

/** Link to any block of the Weltkarte on the server's web map (BlueMap …); null without a usable template. */
export function liveMapUrlAt(settings: LiveMapSettings, dimension: string, x: number, y: number, z: number): string | null {
  if (!settings.urlTemplate || templateProblem(settings)) return null;
  const world = settings.worlds[dimension]; if (!world) return null;
  try { return buildLiveMapUrl({ name: settings.name || 'Live-Karte', urlTemplate: settings.urlTemplate }, { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), world, dimension }); } catch { return null; }
}

/** “Auf der Live-Karte” for one project; nothing when no usable template is set. */
export function LiveMapLink({ settings, entry }: { settings: LiveMapSettings; entry: MapEntry }) {
  const url = linkFor(settings, entry);
  return url ? <a href={url} target="_blank" rel="noreferrer noopener">Auf {settings.name || 'der Live-Karte'} zeigen ↗</a> : null;
}


/** True when the browser will refuse to show this map inside the page (http map in an https page). */
export function blockedAsMixedContent(url: string): boolean {
  return typeof location !== 'undefined' && location.protocol === 'https:' && /^http:\/\//i.test(url);
}

/**
 * Connects the map with the server's own web map (BlueMap, Dynmap, Pl3xMap …):
 * paste any link copied from it – in any field – and it becomes a template, so
 * every project gets a link to the same coordinates. Markers and placements can
 * be downloaded. No request goes to the map server.
 */
export function LiveMapPanel({ settings, onChange, map, dimension }: { settings: LiveMapSettings; onChange: (s: LiveMapSettings) => void; map: WorldMapView | null; dimension: string }) {
  const [pasted, setPasted] = useState('');
  const [target, setTarget] = useState(dimension);
  const [message, setMessage] = useState('');
  const problem = templateProblem(settings);
  const world = settings.worlds[dimension] ?? '';
  const ready = !!settings.urlTemplate && !problem;
  const openUrl = useMemo(() => {
    if (!ready || !world) return null;
    const first = map?.entries.find(e => e.worldBounds && !e.skipped);
    const position = first ? liveMapPositionOf(first, world) : { x: 0, y: 64, z: 0, world, dimension };
    try { return position ? buildLiveMapUrl({ name: settings.name || 'Live-Karte', urlTemplate: settings.urlTemplate }, position) : null; } catch { return null; }
  }, [settings, ready, world, map, dimension]);
  const mixed = settings.urlTemplate ? blockedAsMixedContent(settings.urlTemplate) : false;
  const host = (() => { try { return new URL(settings.urlTemplate.replace(/\{\w+\}/g, '0')).host; } catch { return ''; } })();

  /** A real link pasted anywhere becomes the template; returns true when it was one. */
  const adoptLink = (text: string, dim: string): boolean => {
    const t = liveMapTemplateFromLink(text);
    if (!t) return false;
    const keepName = !!settings.name && !['Live-Karte', 'BlueMap', 'Dynmap', 'Pl3xMap', 'Webkarte'].includes(settings.name);
    onChange({ ...settings, name: keepName ? settings.name : KIND_LABEL[t.kind], urlTemplate: t.template, worlds: { ...settings.worlds, [dim]: t.world } });
    setMessage(`Link erkannt (${t.kind === 'bluemap' ? 'BlueMap-Format' : t.kind === 'dynmap' ? 'Dynmap-Format' : 'Format mit world/x/z'}): Karte „${t.world}“ gilt jetzt für ${dimensionLabel(dim)}. Jedes Projekt hat ab jetzt den Link „Auf ${keepName ? settings.name : KIND_LABEL[t.kind]} zeigen“.`);
    return true;
  };
  const adopt = () => {
    if (adoptLink(pasted, target)) { setPasted(''); return; }
    setMessage('Diesen Link erkenne ich nicht. Öffne eure Server-Karte, klicke dort irgendwo in die Karte und kopiere dann die Adresse aus der Adresszeile (BlueMap: endet mit #karte:x:y:z…, Dynmap/Pl3xMap: enthält ?world…&x=…&z=…).');
  };
  const exportMarkers = () => {
    if (!map) return;
    try { download(`bauplaner-marker-${dimensionLabel(dimension).toLowerCase()}.json`, JSON.stringify(mapMarkers(map, world || 'world'), null, 2), 'application/json'); }
    catch (e) { setMessage(errorText(e)); }
  };
  /** Template field: a pasted real link (no placeholders) is converted instead of rejected. */
  const setTemplate = (value: string) => {
    const v = value.trim();
    if (v && !v.includes('{') && adoptLink(v, dimension)) return;
    onChange({ ...settings, urlTemplate: v });
  };
  const setWorld = (dim: string, value: string) => {
    const v = value.trim();
    if (/^https?:\/\//i.test(v) && adoptLink(v, dim)) return;
    onChange({ ...settings, worlds: { ...settings.worlds, [dim]: v } });
  };

  return <details className="live-panel">
    <summary><b>Server-Webkarte verknüpfen</b> <span className="muted">{ready ? `· ${settings.name}${host ? ` (${host})` : ''} verknüpft` : '· BlueMap, Dynmap, Pl3xMap · optional'}</span></summary>
    <p className="muted">Hat euer Server eine Karte im Browser (z. B. BlueMap)? Dann bekommt jedes Projekt einen Knopf, der eure Server-Karte genau an seiner Stelle öffnet. Das ist unabhängig von der Spielverbindung oben. Es wird nichts an den Server gesendet; die Einstellung bleibt nur in diesem Browser.</p>
    <ol className="live-steps">
      <li>Eure Server-Karte in einem anderen Tab öffnen und einmal irgendwo in die Karte klicken.</li>
      <li>Die Adresse aus der Adresszeile kopieren und hier einfügen. Fertig.</li>
    </ol>
    <div className="live-adopt">
      <label>Link aus eurer Server-Karte
        <input value={pasted} onChange={e => setPasted(e.target.value)}
          onPaste={e => { const t = e.clipboardData.getData('text'); if (adoptLink(t, target)) { e.preventDefault(); setPasted(''); } }}
          onKeyDown={e => { if (e.key === 'Enter' && pasted.trim()) adopt(); }}
          placeholder="z. B. http://server.example.net:8100/#world:120:64:-30:150:0:0.9:0:0:perspective" /></label>
      <label className="live-target">gilt für
        <select value={target} onChange={e => setTarget(e.target.value)}>{DIMENSIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
      <button className="secondary" disabled={!pasted.trim()} onClick={adopt}>Übernehmen</button>
    </div>
    {problem && <p className="field-error" role="alert">{problem}. Am einfachsten: einen echten Link aus eurer Karte oben einfügen.</p>}
    {message && <p className="muted" role="status">{message}</p>}
    {ready && <div className="button-row">
      {openUrl && <a className="secondary" href={openUrl} target="_blank" rel="noreferrer noopener">{settings.name} öffnen ↗</a>}
      {!world && <span className="warn-text">Für {dimensionLabel(dimension)} ist noch keine Karte eingetragen: in eurer Karte zu {dimensionLabel(dimension)} wechseln, Link kopieren und oben mit „gilt für {dimensionLabel(dimension)}“ einfügen.</span>}
    </div>}
    <details className="live-advanced"><summary>Erweitert: Vorlage, Kartennamen, Einbetten, Export</summary>
      <div className="live-presets" role="group" aria-label="Vorlagen">
        <span className="muted">Leere Vorlage:</span>
        {LIVE_MAP_PRESETS.map(p => <button key={p.id} className="secondary" title={`Format aus ${p.source}`}
          onClick={() => { onChange({ ...settings, name: p.label, urlTemplate: p.template, worlds: { ...p.worlds } }); setMessage(`Vorlage ${p.label} gesetzt. Ersetze „eure-karte.example“ durch die Adresse eurer Karte.`); }}>{p.label}</button>)}
      </div>
      <div className="live-fields">
        <label>Name<input value={settings.name} maxLength={120} onChange={e => onChange({ ...settings, name: e.target.value })} /></label>
        <label className="wide">URL-Vorlage <small>Platzhalter {'{world} {x} {y} {z} {dimension}'} · ein eingefügter echter Link wird automatisch umgewandelt</small>
          <input value={settings.urlTemplate} onChange={e => setTemplate(e.target.value)} placeholder="https://karte.example/#{world}:{x}:{y}:{z}:150:0:0.9:0:0:perspective" /></label>
        {DIMENSIONS.map(d => <label key={d.id}>Karte {d.label}<input value={settings.worlds[d.id] ?? ''} onChange={e => setWorld(d.id, e.target.value)} /></label>)}
      </div>
      <div className="button-row">
        <label className="chip-check"><input type="checkbox" checked={settings.embed} onChange={e => onChange({ ...settings, embed: e.target.checked })} /> Karte hier einbetten</label>
        <button className="secondary" disabled={!map?.entries.length} onClick={exportMarkers}>Marker (JSON) herunterladen</button>
        <button className="secondary" disabled={!map?.entries.length} onClick={() => map && download(`bauplaner-weltlage-${dimensionLabel(dimension).toLowerCase()}.json`, placementsJson(map), 'application/json')}>Lagen (JSON) herunterladen</button>
      </div>
      <p className="muted small">Die Markerdatei ist das eigene Bauplaner-Austauschformat, keine fertige Plugin-Konfiguration. Die Vorlagen für BlueMap, Dynmap und Pl3xMap sind aus deren Quelltext abgeleitet.</p>
    </details>
    {settings.embed && openUrl && (mixed
      ? <p className="notice" role="note">Eure Karte läuft über <code>http://</code>. Eine <code>https</code>-Seite wie diese darf sie nicht einbetten, der Browser blockiert das. <a href={openUrl} target="_blank" rel="noreferrer noopener">{settings.name} in neuem Tab öffnen ↗</a></p>
      : <figure className="live-embed">
        <iframe src={openUrl} title={`${settings.name} (eingebettet)`} sandbox="allow-scripts allow-same-origin allow-popups" referrerPolicy="no-referrer" loading="lazy" />
        <figcaption className="muted">Bleibt die Fläche leer, erlaubt der Kartenserver kein Einbetten. Dann <a href={openUrl} target="_blank" rel="noreferrer noopener">in neuem Tab öffnen ↗</a>.</figcaption>
      </figure>)}
  </details>;
}
