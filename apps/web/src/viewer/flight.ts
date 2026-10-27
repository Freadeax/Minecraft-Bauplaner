import type { Vec3 } from '../../../../packages/voxel/src/index.js';

/** Free flight like Minecraft creative mode: W/S follow the horizontal view direction, Space/Shift move vertically. */
export interface FlightInput { readonly forward: number; readonly right: number; readonly up: number }

export const PITCH_LIMIT = Math.PI / 2 - 0.01;

/** View direction for yaw (0 ⇒ looking along −Z / north, positive ⇒ turning left) and pitch (positive ⇒ up). */
export function lookDirection(yaw: number, pitch: number): Vec3 {
  return [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
}
export function yawPitch(direction: Vec3): { yaw: number; pitch: number } {
  const l = Math.hypot(...direction) || 1;
  return { yaw: Math.atan2(-direction[0], -direction[2]), pitch: Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, Math.asin(direction[1] / l))) };
}
export function clampPitch(pitch: number): number { return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch)); }

/** Moves `position` by `speed` blocks per second for `seconds`; diagonal input is not faster. */
export function flightStep(position: Vec3, yaw: number, input: FlightInput, speed: number, seconds: number): Vec3 {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  let x = fx * input.forward + rx * input.right, z = fz * input.forward + rz * input.right, y = input.up;
  const l = Math.hypot(x, y, z);
  if (l === 0) return position;
  const s = speed * seconds / l; x *= s; y *= s; z *= s;
  return [position[0] + x, position[1] + y, position[2] + z];
}

/** Default flight speed in blocks per second, scaled to the structure size. */
export function defaultSpeed(size: number): number { return Math.max(4, Math.min(80, size / 3)); }
export const SPEED_STEPS = [2, 4, 8, 16, 32, 64, 128] as const;
