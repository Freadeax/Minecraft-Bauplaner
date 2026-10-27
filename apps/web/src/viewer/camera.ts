import type { Bounds, Vec3 } from '../../../../packages/voxel/src/index.js';

/** Camera presets. Minecraft convention: north = −Z, east = +X, up = +Y. */
export type ViewName = 'iso' | 'top' | 'north' | 'east' | 'south' | 'west';

export interface ViewPreset {
  readonly id: ViewName;
  readonly label: string;
  readonly title: string;
  readonly key: string;
  /** Unit direction from the target to the camera. */
  readonly direction: Vec3;
}

const unit = (v: Vec3): Vec3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };

export const VIEWS: readonly ViewPreset[] = [
  { id: 'iso', label: 'Iso', title: 'Schrägansicht', key: '1', direction: unit([1.7, 1.25, 1.9]) },
  // A tiny southward tilt keeps north at the top of the screen and avoids a degenerate look-at.
  { id: 'top', label: 'Oben', title: 'Draufsicht (Norden oben)', key: '2', direction: unit([0, 1, 1e-4]) },
  { id: 'north', label: 'N', title: 'Ansicht von Norden', key: '3', direction: [0, 0, -1] },
  { id: 'east', label: 'O', title: 'Ansicht von Osten', key: '4', direction: [1, 0, 0] },
  { id: 'south', label: 'S', title: 'Ansicht von Süden', key: '5', direction: [0, 0, 1] },
  { id: 'west', label: 'W', title: 'Ansicht von Westen', key: '6', direction: [-1, 0, 0] },
];

export function boundsCentre(b: Bounds): Vec3 {
  return [(b.min[0] + b.maxExclusive[0]) / 2, (b.min[1] + b.maxExclusive[1]) / 2, (b.min[2] + b.maxExclusive[2]) / 2];
}
/** Radius of the sphere enclosing the box. */
export function boundsRadius(b: Bounds): number {
  return Math.max(0.5, Math.hypot(b.maxExclusive[0] - b.min[0], b.maxExclusive[1] - b.min[1], b.maxExclusive[2] - b.min[2]) / 2);
}

export interface CameraFrame { readonly position: Vec3; readonly target: Vec3; readonly distance: number; readonly radius: number }

/** Focus keeps some surroundings visible even for a single block. */
export const FOCUS_MIN_RADIUS = 4;

/**
 * Perspective framing: the camera distance at which the bounding sphere fits
 * the narrower of the vertical/horizontal field of view, with a margin.
 */
export function frameBounds(b: Bounds, direction: Vec3, fovDeg: number, aspect: number, margin = 1.08, minRadius = 0.5): CameraFrame {
  const target = boundsCentre(b), radius = Math.max(minRadius, boundsRadius(b));
  const v = fovDeg * Math.PI / 180, h = 2 * Math.atan(Math.tan(v / 2) * aspect);
  const distance = radius * margin / Math.sin(Math.min(v, h) / 2);
  const d = unit(direction);
  return { target, radius, distance, position: [target[0] + d[0] * distance, target[1] + d[1] * distance, target[2] + d[2] * distance] };
}

/** Orthographic zoom so that the bounding sphere fits a frustum of half-height `halfHeight`. */
export function orthoZoom(b: Bounds, halfHeight: number, aspect: number, margin = 1.08, minRadius = 0.5): number {
  return halfHeight * Math.min(1, aspect) / (Math.max(minRadius, boundsRadius(b)) * margin);
}
