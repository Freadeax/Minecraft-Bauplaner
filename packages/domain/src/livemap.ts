import { DomainError } from './types.js';

/** No provider-specific URL contract is implied: the operator supplies the complete template. */
export interface LiveMapTarget {
  readonly name: string;
  readonly urlTemplate: string;
}

export interface LiveMapPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly world: string;
  readonly dimension: string;
}

export interface LiveMapMarker {
  readonly id: string;
  readonly label: string;
  readonly position: LiveMapPosition;
}

/** Portable Bauplaner interchange, not a native BlueMap/Dynmap/squaremap/Pl3xMap marker file. */
export interface LiveMapMarkerFile {
  readonly schemaVersion: 1;
  readonly format: 'bauplaner-world-markers';
  readonly coordinateSystem: 'minecraft-blocks';
  readonly markers: readonly LiveMapMarker[];
}

const TOKENS = ['x', 'y', 'z', 'world', 'dimension'] as const;
const TOKEN = /\{([^{}]*)\}/g;
const fail = (message: string): never => { throw new DomainError('LIVEMAP', message); };

function text(value: unknown, label: string, max = 256): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value))
    fail(`${label}: nichtleerer Text ohne Steuerzeichen erforderlich (höchstens ${max} Zeichen)`);
}

export function checkLiveMapPosition(position: LiveMapPosition): void {
  if (!position || typeof position !== 'object') fail('Kartenposition fehlt');
  for (const axis of ['x', 'y', 'z'] as const)
    if (!Number.isSafeInteger(position[axis])) fail(`${axis}: sichere ganzzahlige Blockkoordinate erforderlich`);
  text(position.world, 'Welt'); text(position.dimension, 'Dimension');
  // Reject lone surrogate code units before encodeURIComponent can throw an opaque URIError.
  try { encodeURIComponent(position.world); encodeURIComponent(position.dimension); }
  catch { fail('Welt/Dimension enthalten ungültigen Unicode'); }
  if ([position.world, position.dimension].some(v => v === '.' || v === '..')) fail('Welt/Dimension dürfen keine relativen Pfadsegmente sein');
}

function absoluteHttpUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { return fail('Ungültige absolute Livekarten-URL'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') fail('Livekarten-URL muss HTTP oder HTTPS verwenden');
  if (!url.hostname || url.username || url.password) fail('Livekarten-URL darf keine Zugangsdaten enthalten');
  return url;
}

/** Validate a configured template. Placeholders cannot choose a server, protocol or credentials. */
export function checkLiveMapTarget(target: LiveMapTarget): void {
  if (!target || typeof target !== 'object') fail('Livekartenziel fehlt');
  text(target.name, 'Livekartenname', 120);
  text(target.urlTemplate, 'URL-Vorlage', 4096);
  const template = target.urlTemplate;
  if (template !== template.trim() || template.includes('\\')) fail('URL-Vorlage enthält Leerraum am Rand oder Rückstriche');
  const authority = /^https?:\/\/([^/?#]+)/i.exec(template);
  if (!authority || /[{}@]/.test(authority[1]!)) fail('URL-Vorlage benötigt einen festen HTTP(S)-Server ohne Platzhalter');
  let count = 0;
  const sample = template.replace(TOKEN, (_match, token: string) => {
    if (!(TOKENS as readonly string[]).includes(token)) fail(`Unbekannter URL-Platzhalter: {${token}}`);
    count++; return '0';
  });
  if (/[{}]/.test(sample)) fail('Ungültige Klammern in URL-Vorlage');
  if (count === 0) fail('URL-Vorlage benötigt mindestens einen Koordinaten-/Weltplatzhalter');
  absoluteHttpUrl(sample);
}

/** Pure link construction: no request is made and no external map is configured or modified. */
export function buildLiveMapUrl(target: LiveMapTarget, position: LiveMapPosition): string {
  checkLiveMapTarget(target); checkLiveMapPosition(position);
  const value = target.urlTemplate.replace(TOKEN, (_match, token: string) => {
    const key = token as typeof TOKENS[number];
    return encodeURIComponent(String(position[key]));
  });
  return absoluteHttpUrl(value).href;
}

/** Snapshot marker data without mutating projects or retaining caller-owned objects. */
export function createLiveMapMarkerFile(markers: readonly LiveMapMarker[]): LiveMapMarkerFile {
  if (!Array.isArray(markers) || markers.length > 10_000) fail('Höchstens 10000 Kartenmarker erlaubt');
  const ids = new Set<string>();
  const copies = Array.from(markers, marker => {
    if (!marker || typeof marker !== 'object') fail('Ungültiger Kartenmarker');
    text(marker.id, 'Marker-ID', 120); text(marker.label, 'Markername', 120);
    if (ids.has(marker.id)) fail(`Doppelte Marker-ID: ${marker.id}`);
    ids.add(marker.id); checkLiveMapPosition(marker.position);
    return { id: marker.id, label: marker.label, position: { x: marker.position.x, y: marker.position.y, z: marker.position.z, world: marker.position.world, dimension: marker.position.dimension } };
  });
  return { schemaVersion: 1, format: 'bauplaner-world-markers', coordinateSystem: 'minecraft-blocks', markers: copies };
}

/** Read only our versioned interchange; reject extra fields rather than silently losing them. */
export function readLiveMapMarkerFile(input: unknown): LiveMapMarkerFile {
  function record(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(`${label}: Objekt erforderlich`);
    const result = value as Record<string, unknown>;
    if (Object.keys(result).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(result, key)))
      return fail(`${label}: fehlende oder unbekannte Felder`);
    return result;
  }
  const file = record(input, ['schemaVersion', 'format', 'coordinateSystem', 'markers'], 'Markerdatei');
  if (file.schemaVersion !== 1 || file.format !== 'bauplaner-world-markers' || file.coordinateSystem !== 'minecraft-blocks')
    return fail('Nicht unterstütztes Markerformat, Schema oder Koordinatensystem');
  if (!Array.isArray(file.markers) || file.markers.length > 10_000) return fail('Höchstens 10000 Kartenmarker erlaubt');
  const markers = Array.from(file.markers, value => {
    const marker = record(value, ['id', 'label', 'position'], 'Kartenmarker');
    const position = record(marker.position, ['x', 'y', 'z', 'world', 'dimension'], 'Kartenposition');
    // The shared writer validates every scalar and duplicate identity and makes a fresh snapshot.
    return { id: marker.id, label: marker.label, position } as unknown as LiveMapMarker;
  });
  return createLiveMapMarkerFile(markers);
}
