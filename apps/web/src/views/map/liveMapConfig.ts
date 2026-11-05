import { useCallback, useState } from 'react';
import { checkLiveMapTarget, checkSavedLiveMaps } from '../../../../../packages/domain/src/livemap.js';
import type { SavedLiveMap } from '../../../../../packages/domain/src/livemap.js';
import { liveMapTemplateFromLink } from '../../../../../packages/domain/src/worldmap.js';

export const LIVE_MAP_KIND_LABEL = { bluemap: 'BlueMap', dynmap: 'Dynmap', 'world-x-z': 'Webkarte' } as const;

/**
 * Live map connection for this browser (MAP-01). Only a URL template and the
 * map's world names are kept – no request is ever sent to the map server; the
 * page only builds links and, if switched on, shows the map in a frame.
 * Kept in localStorage on purpose: it is a viewer preference, not project
 * data (persisted, shared targets are MAP-02).
 */
export interface LiveMapSettings {
  readonly name: string;
  readonly urlTemplate: string;
  /** World/map name per dimension id as the live map calls it. */
  readonly worlds: Readonly<Record<string, string>>;
  readonly embed: boolean;
}

/**
 * Starting points, taken from each provider's own web app source (see
 * docs/architecture/WORLDMAP.md). The server part is a placeholder the
 * operator replaces; camera values are the providers' usual defaults.
 * squaremap is not offered: no primary source for its link format was checked.
 */
export interface LiveMapPreset {
  readonly id: string;
  readonly label: string;
  readonly template: string;
  readonly worlds: Readonly<Record<string, string>>;
  readonly source: string;
}
export const LIVE_MAP_PRESETS: readonly LiveMapPreset[] = [
  { id: 'bluemap', label: 'BlueMap', template: 'https://eure-karte.example/#{world}:{x}:{y}:{z}:150:0:0.9:0:0:perspective',
    worlds: { 'minecraft:overworld': 'world', 'minecraft:the_nether': 'world_nether', 'minecraft:the_end': 'world_the_end' },
    source: 'BlueMap webapp BlueMapApp.js (updatePageAddress/loadPageAddress): #map:x:y:z:distance:rotation:angle:tilt:ortho:mode' },
  { id: 'dynmap', label: 'Dynmap', template: 'https://eure-karte.example/?worldname={world}&mapname=flat&zoom=6&x={x}&y={y}&z={z}',
    worlds: { 'minecraft:overworld': 'world', 'minecraft:the_nether': 'world_nether', 'minecraft:the_end': 'world_the_end' },
    source: 'Dynmap web/js/map.js (getLink): ?worldname=&mapname=&zoom=&x=&y=&z=' },
  { id: 'pl3xmap', label: 'Pl3xMap', template: 'https://eure-karte.example/?world={world}&renderer=basic&zoom=3&x={x}&z={z}',
    worlds: { 'minecraft:overworld': 'world', 'minecraft:the_nether': 'world_nether', 'minecraft:the_end': 'world_the_end' },
    source: 'Pl3xMap webmap/src/control/LinkControl.ts: ?world=&renderer=&zoom=&x=&z=' },
];

const KEY = 'bauplaner.livekarte';
export const EMPTY_LIVE_MAP: LiveMapSettings = { name: 'Live-Karte', urlTemplate: '', worlds: { ...LIVE_MAP_PRESETS[0]!.worlds }, embed: false };

function read(): LiveMapSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<LiveMapSettings> | null;
    if (!raw || typeof raw !== 'object') return EMPTY_LIVE_MAP;
    const worlds = raw.worlds && typeof raw.worlds === 'object' ? Object.fromEntries(Object.entries(raw.worlds).filter(([, v]) => typeof v === 'string')) as Record<string, string> : EMPTY_LIVE_MAP.worlds;
    const settings = { name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : EMPTY_LIVE_MAP.name, urlTemplate: typeof raw.urlTemplate === 'string' ? raw.urlTemplate : '', worlds, embed: raw.embed === true };
    return repairPastedLink(settings);
  } catch { return EMPTY_LIVE_MAP; }
}

/**
 * A real map link saved as template (pasted into the wrong field, no
 * placeholders) is turned into a template for the overworld, so an earlier
 * paste works without retyping.
 */
export function repairPastedLink(s: LiveMapSettings): LiveMapSettings {
  if (!s.urlTemplate || s.urlTemplate.includes('{')) return s;
  const t = liveMapTemplateFromLink(s.urlTemplate);
  if (!t) return s;
  const generic = ['Live-Karte', 'BlueMap', 'Dynmap', 'Pl3xMap', 'Webkarte'].includes(s.name);
  return { ...s, name: generic ? LIVE_MAP_KIND_LABEL[t.kind] : s.name, urlTemplate: t.template, worlds: { ...s.worlds, 'minecraft:overworld': t.world } };
}

/** Validation message for a template, or '' when it is usable. */
export function templateProblem(s: LiveMapSettings): string {
  if (!s.urlTemplate) return '';
  try { checkLiveMapTarget({ name: s.name || 'Live-Karte', urlTemplate: s.urlTemplate }); return ''; }
  catch (e) { return e instanceof Error ? e.message : String(e); }
}

export function useLiveMapSettings(): [LiveMapSettings, (next: LiveMapSettings) => void] {
  const [settings, set] = useState<LiveMapSettings>(read);
  const update = useCallback((next: LiveMapSettings) => {
    set(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* session only */ }
  }, []);
  return [settings, update];
}

const SAVED_KEY = 'bauplaner.livekarten';
function readSaved(): SavedLiveMap[] {
  try { return checkSavedLiveMaps(JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')); } catch { return []; }
}

/**
 * MAP-02: named live maps of this browser (several servers, a test and a main
 * map …). Like the active settings a viewer preference; shared as a file
 * (`bauplaner-live-maps`) instead of being sent anywhere.
 */
export function useSavedLiveMaps(): [SavedLiveMap[], (next: SavedLiveMap[]) => void] {
  const [maps, set] = useState<SavedLiveMap[]>(readSaved);
  const update = useCallback((next: SavedLiveMap[]) => {
    set(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* session only */ }
  }, []);
  return [maps, update];
}
