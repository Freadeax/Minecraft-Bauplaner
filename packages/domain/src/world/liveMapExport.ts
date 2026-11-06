import { readLiveMapMarkerFile } from './livemap.js';
import type { LiveMapMarker, LiveMapMarkerFile } from './livemap.js';
import { itemColor, newWorldItemId, pathStyleOf, pointTypeLabel, zoneCategoryOf, WORLD_PLAN_MAX_ITEMS } from './worldPlan.js';
import type { WorldItem, WorldPoint, WorldPointType } from './worldPlan.js';
import type { WorldMapView } from './worldmap.js';
import { DomainError } from '../core/types.js';

/**
 * MAP-02: everything on one dimension of the Weltkarte as neutral map shapes,
 * and writers for the live maps whose marker formats were checked against
 * their own documentation (see docs/architecture/welt/LIVEMAP.md, section MAP-02).
 */
export type MapShape =
  | { readonly kind: 'area'; readonly id: string; readonly label: string; readonly detail: string; readonly color: string; readonly group: MapShapeGroup;
      /** Outline in block columns (x, z), counter-clockwise or clockwise, not closed. */
      readonly points: readonly (readonly [number, number])[];
      readonly minY: number | null; readonly maxY: number | null }
  | { readonly kind: 'line'; readonly id: string; readonly label: string; readonly detail: string; readonly color: string; readonly group: MapShapeGroup;
      readonly points: readonly (readonly [number, number])[]; readonly y: number; readonly width: number }
  | { readonly kind: 'poi'; readonly id: string; readonly label: string; readonly detail: string; readonly color: string; readonly group: MapShapeGroup;
      readonly x: number; readonly y: number; readonly z: number };
export type MapShapeGroup = 'projekte' | 'bauplaetze' | 'wege' | 'zonen' | 'punkte';
export const MAP_SHAPE_GROUP_LABEL: Readonly<Record<MapShapeGroup, string>> = {
  projekte: 'Bauplaner: Projekte', bauplaetze: 'Bauplaner: Bauplätze', wege: 'Bauplaner: Wege', zonen: 'Bauplaner: Zonen', punkte: 'Bauplaner: Punkte',
};
export const MAP_SHAPE_GROUPS = Object.keys(MAP_SHAPE_GROUP_LABEL) as MapShapeGroup[];

const fail = (message: string): never => { throw new DomainError('LIVEMAP', message); };
/** Y used for flat shapes without a height (sites without y, zones, paths). */
export const DEFAULT_SHAPE_Y = 64;
const safeId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'x';

export interface MapShapeOptions {
  /** Groups to include; default all. */
  readonly groups?: readonly MapShapeGroup[];
  /** Only items of these layers (MAP-06); default all. */
  readonly layers?: readonly string[];
}

/** Projects of the map view plus the world plan items of the same dimension as shapes. */
export function mapShapes(map: WorldMapView | null, items: readonly WorldItem[], dimension: string, options: MapShapeOptions = {}): MapShape[] {
  const groups = new Set(options.groups ?? MAP_SHAPE_GROUPS);
  const layerOk = (i: WorldItem) => !options.layers || (i.layer !== undefined && options.layers.includes(i.layer));
  const out: MapShape[] = [];
  if (map && map.dimension === dimension && groups.has('projekte')) for (const e of map.entries) {
    const b = e.worldBounds; if (!b || e.skipped) continue;
    const [x0, , z0] = b.min, [x1, , z1] = b.maxExclusive;
    out.push({ kind: 'area', id: `projekt_${safeId(e.projectId)}`, label: e.name.slice(0, 120), group: 'projekte', color: '#f2b84b',
      detail: `${e.blocks.toLocaleString('de-DE')} Blöcke · ${Math.round(e.share * 100)} % gebaut`,
      points: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], minY: b.min[1], maxY: b.maxExclusive[1] });
  }
  for (const i of items) {
    if (i.dimension !== dimension || !layerOk(i)) continue;
    const color = itemColor(i), note = i.note.trim().slice(0, 300), id = safeId(i.id);
    if (i.kind === 'site' && groups.has('bauplaetze'))
      out.push({ kind: 'area', id, label: i.name, group: 'bauplaetze', color, detail: [`Bauplatz ${i.width} × ${i.length}`, note].filter(Boolean).join(' · '),
        points: [[i.minX, i.minZ], [i.minX + i.width, i.minZ], [i.minX + i.width, i.minZ + i.length], [i.minX, i.minZ + i.length]], minY: i.y, maxY: null });
    else if (i.kind === 'zone' && groups.has('zonen'))
      out.push({ kind: 'area', id, label: i.name, group: 'zonen', color, detail: [zoneCategoryOf(i.category).label, note].filter(Boolean).join(' · '),
        points: i.points.map(([x, z]) => [x + 0.5, z + 0.5] as const), minY: null, maxY: null });
    else if (i.kind === 'path' && groups.has('wege'))
      out.push({ kind: 'line', id, label: i.name, group: 'wege', color, detail: [pathStyleOf(i.style).label, note].filter(Boolean).join(' · '),
        points: i.points.map(([x, z]) => [x + 0.5, z + 0.5] as const), y: DEFAULT_SHAPE_Y, width: i.width });
    else if (i.kind === 'point' && groups.has('punkte'))
      out.push({ kind: 'poi', id, label: i.name, group: 'punkte', color, detail: [pointTypeLabel(i.type), note].filter(Boolean).join(' · '), x: i.x, y: i.y, z: i.z });
  }
  return out;
}

/**
 * Marker file (own interchange) → points of the Weltplan. Markers already
 * present (same name and block in the same dimension) and markers of other
 * dimension ids are skipped, so importing twice adds nothing.
 */
export function markersToPoints(input: unknown, items: readonly WorldItem[], type: WorldPointType = 'notiz'): { points: WorldPoint[]; skipped: number; file: LiveMapMarkerFile } {
  const file = readLiveMapMarkerFile(input);
  const have = new Set(items.filter((i): i is WorldPoint => i.kind === 'point').map(p => `${p.dimension}|${p.name}|${p.x}|${p.y}|${p.z}`));
  const points: WorldPoint[] = []; let skipped = 0;
  for (const m of file.markers) {
    const p = m.position, key = `${p.dimension}|${m.label.trim()}|${p.x}|${p.y}|${p.z}`;
    if (have.has(key) || !/^[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}$/.test(p.dimension) || Math.abs(p.x) > 29_999_984 || Math.abs(p.z) > 29_999_984 || p.y < -2032 || p.y > 2031) { skipped++; continue; }
    have.add(key);
    points.push({ kind: 'point', id: newWorldItemId('point'), name: m.label.trim().slice(0, 120) || 'Marker', note: `Aus Markerdatei (${m.id})`.slice(0, 500), dimension: p.dimension, type, x: p.x, y: p.y, z: p.z });
  }
  if (items.length + points.length > WORLD_PLAN_MAX_ITEMS) fail(`Der Weltplan hätte mehr als ${WORLD_PLAN_MAX_ITEMS} Einträge`);
  return { points, skipped, file };
}

/** Points of the Weltplan as markers of the own interchange (added to the project markers). */
export function pointMarkers(items: readonly WorldItem[], dimension: string, world: string): LiveMapMarker[] {
  return items.filter((i): i is WorldPoint => i.kind === 'point' && i.dimension === dimension)
    .map(p => ({ id: p.id, label: p.name.slice(0, 120), position: { x: p.x, y: p.y, z: p.z, world, dimension } }));
}

const rgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); const n = m ? parseInt(m[1]!, 16) : 0xf2b84b;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const num = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(1);
const q = (s: string) => JSON.stringify(s);
const html = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const center = (points: readonly (readonly [number, number])[]): [number, number] => {
  let x = 0, z = 0; for (const [px, pz] of points) { x += px; z += pz; }
  return [x / Math.max(1, points.length), z / Math.max(1, points.length)];
};

/**
 * BlueMap: `marker-sets` block for the end of a map config (format from the
 * BlueMap wiki „Markers“: sets with label/toggleable/default-hidden/sorting,
 * markers of type poi, line, shape (shape-y) and extrude (shape-min-y/-max-y),
 * colours as {r, g, b, a}). Strings are written JSON-quoted, which HOCON reads as is.
 * Array elements need commas: in HOCON `{…} {…}` on one line is ONE merged object, and BlueMap 5.29 then refuses
 * the whole map („A shape has to have at least 3 points!“, found on a real server, KARTE-08).
 * Projects with a height become extrude markers, flat areas shape markers.
 */
export function blueMapMarkerConfig(shapes: readonly MapShape[]): string {
  const color = (hex: string, a: number) => { const [r, g, b] = rgb(hex); return `{ r: ${r}, g: ${g}, b: ${b}, a: ${a} }`; };
  const lines = ['# Bauplaner → BlueMap: ans Ende der Kartenkonfiguration (z. B. maps/world.conf) setzen', '# und „bluemap reload“. Ein neuerer Block darf einfach darunter: er ersetzt die Bauplaner-Sets des alten.', 'marker-sets: {'];
  // HOCON merges a later marker-sets block into an earlier one, so markers removed in the planner would stay.
  // Setting every Bauplaner set to null first drops what an earlier block defined (checked on BlueMap 5.29, KARTE-08).
  for (const group of MAP_SHAPE_GROUPS) lines.push(`  ${q(`bauplaner-${group}`)}: null`);
  MAP_SHAPE_GROUPS.forEach((group, sorting) => {
    const list = shapes.filter(s => s.group === group);
    if (!list.length) return;
    lines.push(`  ${q(`bauplaner-${group}`)}: {`, `    label: ${q(MAP_SHAPE_GROUP_LABEL[group])}`, '    toggleable: true', `    default-hidden: ${group === 'bauplaetze' || group === 'zonen' ? 'true' : 'false'}`, `    sorting: ${sorting}`, '    markers: {');
    for (const s of list) {
      const out: string[] = [];
      if (s.kind === 'poi') out.push('type: "poi"', `position: { x: ${s.x}, y: ${s.y}, z: ${s.z} }`);
      else if (s.kind === 'line') {
        const [cx, cz] = center(s.points);
        out.push('type: "line"', `position: { x: ${num(cx)}, y: ${s.y}, z: ${num(cz)} }`,
          `line: [ ${s.points.map(([x, z]) => `{ x: ${num(x)}, y: ${s.y}, z: ${num(z)} }`).join(', ')} ]`,
          `line-width: ${Math.min(8, Math.max(2, s.width))}`, `line-color: ${color(s.color, 1.0)}`, 'depth-test: false');
      } else {
        const [cx, cz] = center(s.points), y = s.minY ?? DEFAULT_SHAPE_Y;
        out.push(s.maxY !== null ? 'type: "extrude"' : 'type: "shape"', `position: { x: ${num(cx)}, y: ${s.maxY ?? y}, z: ${num(cz)} }`,
          `shape: [ ${s.points.map(([x, z]) => `{ x: ${num(x)}, z: ${num(z)} }`).join(', ')} ]`,
          ...(s.maxY !== null ? [`shape-min-y: ${y}`, `shape-max-y: ${s.maxY}`] : [`shape-y: ${y}`]),
          'line-width: 2', `line-color: ${color(s.color, 1.0)}`, `fill-color: ${color(s.color, 0.25)}`, `depth-test: ${s.maxY !== null ? 'true' : 'false'}`);
      }
      out.push(`label: ${q(s.label)}`, `detail: ${q(`<b>${html(s.label)}</b><br>${html(s.detail)}`)}`);
      lines.push(`      ${q(s.id)}: {`, ...out.map(l => `        ${l}`), '      }');
    }
    lines.push('    }', '  }');
  });
  lines.push('}');
  return lines.join('\n') + '\n';
}

/** Dynmap argument text: no double quotes or line breaks inside a quoted value. */
const dq = (s: string) => `"${s.replace(/["\r\n\\]/g, "'").slice(0, 120)}"`;
const dynId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);

/**
 * Dynmap: console commands (format from the Dynmap wiki „Using markers“ and
 * „Commands“: dmarker addset/add/addcorner/addarea/addline with set:, x:/y:/z:/world:,
 * color:/fillcolor:RRGGBB, fillopacity, weight, ytop/ybottom). Dynmap has no
 * marker file import; the operator pastes the lines into the server console.
 * All Bauplaner sets are deleted first (also empty ones), so running the list again replaces the old markers.
 */
export function dynmapMarkerCommands(shapes: readonly MapShape[], world: string): string {
  if (!world.trim() || /[\s"]/.test(world)) fail('Dynmap braucht den Weltnamen ohne Leerzeichen (z. B. world)');
  const lines = ['# Bauplaner → Dynmap: Zeilen ohne # nacheinander in die Serverkonsole eingeben', `# (Welt ${world}). Vorhandene Bauplaner-Sets werden zuerst gelöscht.`];
  // Every Bauplaner set is deleted first, also those that are empty now: otherwise markers removed in the planner
  // (e.g. the last point) stayed on the map after pasting the new list (real server, KARTE-08).
  for (const group of MAP_SHAPE_GROUPS) lines.push(`dmarker deleteset id:bauplaner-${group}`);
  for (const group of MAP_SHAPE_GROUPS) {
    const list = shapes.filter(s => s.group === group);
    if (!list.length) continue;
    const set = `bauplaner-${group}`;
    lines.push(`dmarker addset id:${set} ${dq(MAP_SHAPE_GROUP_LABEL[group])} hide:${group === 'bauplaetze' || group === 'zonen'}`);
    for (const s of list) {
      const hex = rgb(s.color).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      if (s.kind === 'poi') { lines.push(`dmarker add id:${dynId(s.id)} ${dq(s.label)} icon:default set:${set} x:${s.x} y:${s.y} z:${s.z} world:${world}`); continue; }
      const y = s.kind === 'line' ? s.y : (s.minY ?? DEFAULT_SHAPE_Y);
      lines.push('dmarker clearcorners', ...s.points.map(([x, z]) => `dmarker addcorner ${num(x)} ${y} ${num(z)} ${world}`));
      if (s.kind === 'line') lines.push(`dmarker addline id:${dynId(s.id)} ${dq(s.label)} set:${set} color:${hex} weight:${Math.min(8, Math.max(2, s.width))}`);
      else lines.push(`dmarker addarea id:${dynId(s.id)} ${dq(s.label)} set:${set} color:${hex} fillcolor:${hex} fillopacity:0.25 weight:2 ybottom:${y} ytop:${s.maxY ?? y}`);
    }
  }
  return lines.join('\n') + '\n';
}
