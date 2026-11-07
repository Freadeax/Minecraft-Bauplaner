import type { Bounds, Cell, Vec3 } from '../../../../packages/voxel/src/index.js';

/**
 * Werkzeuge der 3D-Ansicht (UX-02) ohne Three.js: freier Schnitt entlang X, Y oder Z, Geistermodus-Auswahl
 * und gespeicherte Kameras. Rein und klein, damit sie im Einheitstest und in der Ersatzansicht gleich laufen.
 */
export type CutAxis = 'x' | 'y' | 'z';
/** `keep: 'below'` behält alles bis einschließlich `at`, `'above'` alles ab `at`. */
export interface Cut { readonly axis: CutAxis; readonly at: number; readonly keep: 'below' | 'above' }

const AXIS: Record<CutAxis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };
export const CUT_AXIS_LABEL: Record<CutAxis, string> = { x: 'X (Ost–West)', y: 'Y (Höhe)', z: 'Z (Nord–Süd)' };

/** Kleinste und größte Blockkoordinate entlang der Achse. */
export function cutRange(bounds: Bounds, axis: CutAxis): [number, number] {
  const i = AXIS[axis];
  return [bounds.min[i]!, Math.max(bounds.min[i]!, bounds.maxExclusive[i]! - 1)];
}

/** Startschnitt: Höhe in der Mitte, damit man sofort ins Innere sieht. */
export function defaultCut(bounds: Bounds, axis: CutAxis = 'y'): Cut {
  const [lo, hi] = cutRange(bounds, axis);
  return { axis, at: Math.floor((lo + hi) / 2), keep: 'below' };
}

/** Schnitt auf eine neue Achse oder in neue Grenzen legen, ohne aus dem Bauwerk zu fallen. */
export function clampCut(cut: Cut, bounds: Bounds): Cut {
  const [lo, hi] = cutRange(bounds, cut.axis);
  const at = Math.min(hi, Math.max(lo, Math.round(cut.at)));
  return at === cut.at ? cut : { ...cut, at };
}

export function inCut(position: Vec3, cut: Cut): boolean {
  const v = position[AXIS[cut.axis]]!;
  return cut.keep === 'below' ? v <= cut.at : v >= cut.at;
}

/** Teilt Zellen in sichtbare und weggeschnittene; ohne Schnitt bleibt die Liste unverändert (gleiche Referenz). */
export function splitCells(cells: readonly Cell[], cut: Cut | null, ghost?: ((cell: Cell) => boolean) | null): { readonly shown: readonly Cell[]; readonly hidden: readonly Cell[] } {
  if (!cut && !ghost) return { shown: cells, hidden: [] };
  const shown: Cell[] = [], hidden: Cell[] = [];
  for (const c of cells) {
    if (c.kind === 'erase') { shown.push(c); continue; }
    if ((cut && !inCut(c.position, cut)) || ghost?.(c)) hidden.push(c); else shown.push(c);
  }
  return { shown, hidden };
}

// ---------------------------------------------------------------- gespeicherte Kameras

export interface SavedCamera { readonly name: string; readonly eye: Vec3; readonly target: Vec3; readonly projection: 'perspective' | 'orthographic' }
export const MAX_CAMERAS = 12;
const CAMERA_KEY = 'bauplaner.kameras.v1';

const isVec = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n));
function validCamera(v: unknown): v is SavedCamera {
  const c = v as SavedCamera;
  return !!c && typeof c.name === 'string' && c.name.length > 0 && c.name.length <= 60 && isVec(c.eye) && isVec(c.target) && (c.projection === 'perspective' || c.projection === 'orthographic');
}

/** Liest die Kameras eines Ziels (z. B. Projekt-Id); kaputte Einträge fallen still weg. */
export function parseCameras(raw: string | null, key: string): SavedCamera[] {
  try {
    const all = JSON.parse(raw ?? '{}') as Record<string, unknown>;
    const list = all && typeof all === 'object' ? all[key] : null;
    return Array.isArray(list) ? list.filter(validCamera).slice(0, MAX_CAMERAS) : [];
  } catch { return []; }
}

/** Gleicher Name ersetzt die alte Kamera; höchstens zwölf, die älteste fällt weg. */
export function withCamera(list: readonly SavedCamera[], cam: SavedCamera): SavedCamera[] {
  return [...list.filter(c => c.name !== cam.name), cam].slice(-MAX_CAMERAS);
}

export function nextCameraName(list: readonly SavedCamera[]): string {
  for (let n = list.length + 1; ; n++) { const name = `Ansicht ${n}`; if (!list.some(c => c.name === name)) return name; }
}

export function loadCameras(key: string): SavedCamera[] {
  try { return parseCameras(localStorage.getItem(CAMERA_KEY), key); } catch { return []; }
}
export function storeCameras(key: string, list: readonly SavedCamera[]): boolean {
  try {
    const all = JSON.parse(localStorage.getItem(CAMERA_KEY) ?? '{}') as Record<string, unknown>;
    const next = { ...(all && typeof all === 'object' ? all : {}), [key]: list };
    if (!list.length) delete next[key];
    localStorage.setItem(CAMERA_KEY, JSON.stringify(next));
    return true;
  } catch { return false; }
}
