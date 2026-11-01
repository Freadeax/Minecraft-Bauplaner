import { useMemo, useState } from 'react';
import { buildLiveMapUrl } from '../../../../../packages/domain/src/livemap.js';
import { DIMENSIONS, dimensionLabel, liveMapPositionOf, liveMapTemplateFromLink, mapMarkers, placementsJson } from '../../../../../packages/domain/src/worldmap.js';
import type { MapEntry, WorldMapView } from '../../../../../packages/domain/src/worldmap.js';
import { download, errorText } from '../../app/ui';
import { LIVE_MAP_PRESETS, templateProblem } from './liveMapConfig';
import type { LiveMapSettings } from './liveMapConfig';

function linkFor(settings: LiveMapSettings, entry: MapEntry): string | null {
  if (!settings.urlTemplate || templateProblem(settings)) return null;
  const world = settings.worlds[entry.placement.dimension]; if (!world) return null;
  const position = liveMapPositionOf(entry, world); if (!position) return null;
  try { return buildLiveMapUrl({ name: settings.name || 'Live-Karte', urlTemplate: settings.urlTemplate }, position); } catch { return null; }
}

/** “Auf der Live-Karte” for one project; nothing when no usable template is set. */
export function LiveMapLink({ settings, entry }: { settings: LiveMapSettings; entry: MapEntry }) {
  const url = linkFor(settings, entry);
  return url ? <a href={url} target="_blank" rel="noreferrer noopener">Auf {settings.name || 'der Live-Karte'} zeigen ↗</a> : null;
}

/**
 * Connects the map with the server's own live map (BlueMap, Dynmap, Pl3xMap …):
 * paste a link copied from it, or start from a preset, and every project gets
 * a link to the same coordinates. Markers and placements can be downloaded
 * for the map plugin or the game bridge. No request goes to the map server.
 */
export function LiveMapPanel({ settings, onChange, map, dimension }: { settings: LiveMapSettings; onChange: (s: LiveMapSettings) => void; map: WorldMapView | null; dimension: string }) {
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState('');
  const problem = templateProblem(settings);
  const world = settings.worlds[dimension] ?? '';
  const embedUrl = useMemo(() => {
    if (!settings.embed || !settings.urlTemplate || problem || !world || !map) return null;
    const first = map.entries.find(e => e.worldBounds && !e.skipped);
    const position = first ? liveMapPositionOf(first, world) : { x: 0, y: 64, z: 0, world, dimension };
    try { return position ? buildLiveMapUrl({ name: settings.name || 'Live-Karte', urlTemplate: settings.urlTemplate }, position) : null; } catch { return null; }
  }, [settings, problem, world, map, dimension]);

  const adopt = () => {
    const t = liveMapTemplateFromLink(pasted);
    if (!t) { setMessage('Diesen Link erkenne ich nicht. Kopiere die Adresse aus der Live-Karte, nachdem du dort an eine Stelle gesprungen bist (BlueMap: mit #welt:x:y:z…, Dynmap/Pl3xMap: mit ?world…&x=…&z=…).'); return; }
    onChange({ ...settings, urlTemplate: t.template, worlds: { ...settings.worlds, [dimension]: t.world } });
    setPasted(''); setMessage(`Übernommen (${t.kind === 'bluemap' ? 'BlueMap-Format' : t.kind === 'dynmap' ? 'Dynmap-Format' : 'Format mit world/x/z'}), Welt „${t.world}“ für ${dimensionLabel(dimension)}.`);
  };
  const exportMarkers = () => {
    if (!map) return;
    try { download(`bauplaner-marker-${dimensionLabel(dimension).toLowerCase()}.json`, JSON.stringify(mapMarkers(map, world || 'world'), null, 2), 'application/json'); }
    catch (e) { setMessage(errorText(e)); }
  };

  return <details className="live-panel">
    <summary><b>Live-Karte des Servers verbinden</b> <span className="muted">{settings.urlTemplate && !problem ? `· ${settings.name} verbunden` : '· optional'}</span></summary>
    <p className="muted">Läuft auf eurem Server eine Live-Karte (z. B. BlueMap, Dynmap oder Pl3xMap), springt jedes Projekt per Klick an dieselbe Stelle. So vergleichst du Plan und echte Welt. Es wird nichts an den Server gesendet; die Einstellung bleibt nur in diesem Browser.</p>
    <div className="live-adopt">
      <label>Link aus der Live-Karte einfügen
        <input value={pasted} onChange={e => setPasted(e.target.value)} placeholder="https://karte.euer-server.de/#world:120:64:-30:150:0:0.9:0:0:perspective" /></label>
      <button className="secondary" disabled={!pasted.trim()} onClick={adopt}>Übernehmen</button>
    </div>
    <div className="live-presets" role="group" aria-label="Vorlagen">
      <span className="muted">oder Vorlage:</span>
      {LIVE_MAP_PRESETS.map(p => <button key={p.id} className="secondary" title={`Format aus ${p.source}`}
        onClick={() => { onChange({ ...settings, name: p.label, urlTemplate: p.template, worlds: { ...p.worlds } }); setMessage(`Vorlage ${p.label} gesetzt. Ersetze „eure-karte.example“ durch die Adresse eurer Karte.`); }}>{p.label}</button>)}
    </div>
    <div className="live-fields">
      <label>Name<input value={settings.name} maxLength={120} onChange={e => onChange({ ...settings, name: e.target.value })} /></label>
      <label className="wide">URL-Vorlage <small>Platzhalter {'{world} {x} {y} {z} {dimension}'}</small>
        <input value={settings.urlTemplate} onChange={e => onChange({ ...settings, urlTemplate: e.target.value.trim() })} placeholder="https://karte.example/#{world}:{x}:{y}:{z}:150:0:0.9:0:0:perspective" /></label>
      {DIMENSIONS.map(d => <label key={d.id}>Welt {d.label}<input value={settings.worlds[d.id] ?? ''} onChange={e => onChange({ ...settings, worlds: { ...settings.worlds, [d.id]: e.target.value.trim() } })} /></label>)}
    </div>
    {problem && <p className="field-error" role="alert">{problem}</p>}
    {message && <p className="muted" role="status">{message}</p>}
    <div className="button-row">
      <label className="chip-check"><input type="checkbox" checked={settings.embed} onChange={e => onChange({ ...settings, embed: e.target.checked })} /> Live-Karte hier einbetten</label>
      <button className="secondary" disabled={!map?.entries.length} onClick={exportMarkers}>Marker (JSON) herunterladen</button>
      <button className="secondary" disabled={!map?.entries.length} onClick={() => map && download(`bauplaner-weltlage-${dimensionLabel(dimension).toLowerCase()}.json`, placementsJson(map), 'application/json')}>Lagen (JSON) herunterladen</button>
    </div>
    <p className="muted small">Die Markerdatei ist das eigene Bauplaner-Austauschformat, keine fertige Plugin-Konfiguration. Die Vorlagen für BlueMap, Dynmap und Pl3xMap sind aus deren Quelltext abgeleitet; an eurer Karte einmal ausprobieren.</p>
    {embedUrl && <figure className="live-embed">
      <iframe src={embedUrl} title={`${settings.name} (eingebettet)`} sandbox="allow-scripts allow-same-origin allow-popups" referrerPolicy="no-referrer" loading="lazy" />
      <figcaption className="muted">Bleibt die Fläche leer, erlaubt der Kartenserver kein Einbetten. Dann den Link „Auf {settings.name} zeigen“ nutzen.</figcaption>
    </figure>}
  </details>;
}
