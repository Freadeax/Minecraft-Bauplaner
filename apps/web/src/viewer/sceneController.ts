import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Bounds, Cell, Vec3 } from '../../../../packages/voxel/src/index.js';
import { buildFaces } from './faces';
import type { Rgb } from './faces';
import { FOCUS_MIN_RADIUS, VIEWS, boundsCentre, boundsRadius, frameBounds, orthoZoom } from './camera';
import type { ViewName } from './camera';
import { SPEED_STEPS, clampPitch, defaultSpeed, flightStep, lookDirection, yawPitch } from './flight';

export type Projection = 'perspective' | 'orthographic';
export type NavMode = 'orbit' | 'flight';

/** Snapshot for the React toolbar; emitted on every mode change. */
export interface ViewerState {
  readonly mode: NavMode;
  readonly projection: Projection;
  readonly view: ViewName | null;
  readonly speed: number;
}
/**
 * Grab-and-move of a selection on a horizontal plane (editor "Ziehen").
 * `canGrab` decides per picked cell; `move` gets the integer X/Z offset from
 * the grab cell whenever it changes; `end` gets the final offset, or null when
 * cancelled (Escape, second finger, pointer cancel).
 */
export interface DragHandler {
  canGrab(cell: Cell): boolean;
  move(delta: Vec3): void;
  end(delta: Vec3 | null): void;
}
export type GhostTone = 'free' | 'snap' | 'conflict';
const GHOST_COLOR: Record<GhostTone, number> = { free: 0xffffff, snap: 0x5ff0b0, conflict: 0xff6b6b };

export interface MeshStats { readonly blocks: number; readonly quads: number; readonly naiveQuads: number; readonly buildMs: number }

export interface ControllerEvents {
  pick(cell: Cell | null): void;
  hover(cell: Cell | null): void;
  state(state: ViewerState): void;
  lost(): void;
}

const FOV = 38, ORTHO_HALF = 50;
const FLIGHT_KEYS: Record<string, readonly [axis: 'forward' | 'right' | 'up', sign: number]> = {
  KeyW: ['forward', 1], KeyS: ['forward', -1], KeyA: ['right', -1], KeyD: ['right', 1],
  Space: ['up', 1], ShiftLeft: ['up', -1], ShiftRight: ['up', -1], KeyC: ['up', -1], KeyE: ['up', 1], KeyQ: ['up', -1],
};
const LOOK_KEYS: Record<string, readonly [yaw: number, pitch: number]> = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

/**
 * Owns renderer, cameras, controls and the culled block mesh for one viewer
 * element. Geometry can be replaced without losing the camera, so selection
 * colours or edits never recreate the WebGL context. Rendering is on demand.
 */
export class SceneController {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly perspective = new THREE.PerspectiveCamera(FOV, 1, 0.05, 20000);
  private readonly ortho = new THREE.OrthographicCamera(-ORTHO_HALF, ORTHO_HALF, ORTHO_HALF, -ORTHO_HALF, -20000, 20000);
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = this.perspective;
  private controls: OrbitControls;
  private readonly material: THREE.MeshStandardMaterial;
  private mesh: THREE.Mesh | null = null;
  private quadCells: Int32Array = new Int32Array(0);
  private cells: readonly Cell[] = [];
  private grid: THREE.GridHelper | null = null;
  private readonly marker: THREE.LineSegments;
  /** Integer world offset subtracted from every vertex (keeps float32 precise for far coordinates). */
  private origin: Vec3 | null = null;
  private bounds: Bounds = { min: [0, 0, 0], maxExclusive: [1, 1, 1] };
  private aspect = 1;
  private frame = 0;
  private last = 0;
  private stateValue: ViewerState = { mode: 'orbit', projection: 'perspective', view: 'iso', speed: 8 };
  private readonly keys = new Set<string>();
  private readonly pointers = new Set<number>();
  private focusTarget: Bounds | null = null;
  private yaw = 0;
  private pitch = 0;
  private orbitDistance = 10;
  private dragging: { id: number; x: number; y: number; moved: boolean } | null = null;
  private hoverQueued: PointerEvent | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private dragHandler: DragHandler | null = null;
  private grab: { id: number; plane: THREE.Plane; start: [number, number]; delta: Vec3 } | null = null;
  private readonly ghost: THREE.LineSegments;
  private readonly disposers: (() => void)[] = [];

  constructor(private readonly host: HTMLElement, private readonly events: ControllerEvents) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const canvas = this.renderer.domElement;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D-Bauwerk: Ziehen zum Drehen, Scrollen zum Zoomen, Block anklicken für Koordinaten. Tasten 1–6 Ansichten, F Fokus, V Freiflug.');
    host.appendChild(canvas);

    this.scene.add(new THREE.HemisphereLight(0xdff7ff, 0x665a47, 2.7));
    const sun = new THREE.DirectionalLight(0xffefdb, 3.4); sun.position.set(-20, 40, 25); this.scene.add(sun);
    this.scene.add(sun.target);
    this.material = gridMaterial();
    this.marker = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.9 }));
    this.marker.visible = false; this.marker.renderOrder = 2; this.scene.add(this.marker);
    this.ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.95 }));
    this.ghost.visible = false; this.ghost.renderOrder = 3; this.scene.add(this.ghost);
    this.controls = this.makeControls();

    const on = <K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
      target.addEventListener(type, fn as EventListener, options); this.disposers.push(() => target.removeEventListener(type, fn as EventListener, options));
    };
    // Grabbing runs in the capture phase on the host, before OrbitControls and the canvas handlers see the pointer.
    on(host, 'pointerdown', e => this.grabStart(e), { capture: true });
    on(host, 'pointermove', e => this.grabMove(e), { capture: true });
    on(host, 'pointerup', e => this.grabEnd(e, false), { capture: true });
    on(host, 'pointercancel', e => this.grabEnd(e, true), { capture: true });
    on(canvas, 'pointerdown', e => this.pointerDown(e));
    on(canvas, 'pointermove', e => this.pointerMove(e));
    on(canvas, 'pointerup', e => this.pointerUp(e));
    on(canvas, 'pointercancel', e => { this.pointers.delete(e.pointerId); this.dragging = null; });
    on(canvas, 'pointerleave', () => { this.hoverQueued = null; this.events.hover(null); });
    on(canvas, 'wheel', e => this.wheel(e), { passive: false });
    const lost = (e: Event) => { e.preventDefault(); this.events.lost(); };
    canvas.addEventListener('webglcontextlost', lost); this.disposers.push(() => canvas.removeEventListener('webglcontextlost', lost));
    on(host, 'keydown', e => this.keyDown(e));
    on(host, 'keyup', e => this.keyUp(e));
    on(host, 'focusout', () => { this.keys.clear(); });
    const resize = new ResizeObserver(() => this.resize()); resize.observe(host);
    this.disposers.push(() => resize.disconnect());
    this.resize();
  }

  get state(): ViewerState { return this.stateValue; }

  /** Replaces the visible blocks. `payloadBounds` sizes the grid and the default framing. */
  setCells(cells: readonly Cell[], payloadBounds: Bounds, colorOf: (cell: Cell) => Rgb): MeshStats {
    const started = performance.now();
    const firstFrame = this.origin === null;
    if (!this.origin) { const c = boundsCentre(payloadBounds); this.origin = [Math.floor(c[0]), Math.floor(c[1]), Math.floor(c[2])]; }
    this.bounds = payloadBounds;
    const faces = buildFaces(cells, colorOf, this.origin);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(faces.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(faces.normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(faces.colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(faces.indices, 1));
    geometry.computeBoundingSphere(); geometry.computeBoundingBox();
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); }
    this.mesh = new THREE.Mesh(geometry, this.material); this.scene.add(this.mesh);
    this.quadCells = faces.quadCells; this.cells = cells;
    this.updateGrid();
    if (firstFrame) this.setView('iso');
    this.requestRender();
    return { blocks: faces.blocks, quads: faces.quads, naiveQuads: faces.naiveQuads, buildMs: performance.now() - started };
  }

  /** Outlines one cell (selection marker); null hides it. */
  mark(cell: Cell | null): void {
    if (!cell || !this.origin) this.marker.visible = false;
    else { this.marker.visible = true; this.marker.position.set(...this.local(cell.position, 0.5)); }
    this.requestRender();
  }

  setView(name: ViewName): void {
    const preset = VIEWS.find(v => v.id === name)!;
    if (this.stateValue.mode === 'flight') this.leaveFlight();
    this.frameTo(this.bounds, preset.direction);
    this.update({ view: name });
  }

  /** Frames `bounds` from the current viewing direction (orbit) or flies in front of it (flight). */
  focus(bounds: Bounds): void {
    if (this.stateValue.mode === 'flight') {
      const { distance } = frameBounds(bounds, [0, 0, 1], FOV, this.aspect, 1.08, FOCUS_MIN_RADIUS);
      const target = this.local(boundsCentre(bounds));
      const d = lookDirection(this.yaw, this.pitch);
      this.perspective.position.set(target[0] - d[0] * distance, target[1] - d[1] * distance, target[2] - d[2] * distance);
      this.requestRender(); return;
    }
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.frameTo(bounds, [dir.x, dir.y, dir.z], FOCUS_MIN_RADIUS);
    this.update({ view: null });
  }

  setProjection(projection: Projection): void {
    if (projection === this.stateValue.projection) return;
    if (this.stateValue.mode === 'flight' && projection === 'orthographic') this.leaveFlight();
    const from = this.camera, target = this.controls.target.clone();
    const to = projection === 'orthographic' ? this.ortho : this.perspective;
    const dir = from.position.clone().sub(target).normalize();
    const radius = boundsRadius(this.bounds);
    if (to === this.ortho) {
      // Keep the apparent size: the perspective view height at the target distance.
      const distance = from.position.distanceTo(target);
      const visible = 2 * distance * Math.tan(FOV * Math.PI / 360);
      this.ortho.zoom = (2 * ORTHO_HALF) / Math.max(visible, 1e-3);
      this.ortho.position.copy(target).addScaledVector(dir, Math.max(radius * 4, 50));
    } else {
      const visible = (2 * ORTHO_HALF) / this.ortho.zoom;
      const distance = visible / (2 * Math.tan(FOV * Math.PI / 360));
      this.perspective.position.copy(target).addScaledVector(dir, distance);
    }
    to.up.set(0, 1, 0); to.lookAt(target); to.updateProjectionMatrix();
    this.camera = to;
    this.controls.dispose(); this.controls = this.makeControls(); this.controls.target.copy(target); this.controls.update();
    this.update({ projection });
  }

  setFlight(on: boolean): void {
    if (on === (this.stateValue.mode === 'flight')) return;
    if (on) {
      if (this.stateValue.projection === 'orthographic') this.setProjection('perspective');
      const dir = this.controls.target.clone().sub(this.perspective.position);
      this.orbitDistance = dir.length();
      ({ yaw: this.yaw, pitch: this.pitch } = yawPitch([dir.x, dir.y, dir.z]));
      this.controls.enabled = false;
      this.applyLook();
      this.update({ mode: 'flight', view: null });
      this.host.focus({ preventScroll: true });
    } else this.leaveFlight();
  }

  /** Touch/flight pad input; `value` 1 pressed, 0 released. */
  setFlightKey(code: string, pressed: boolean): void {
    if (pressed) this.keys.add(code); else this.keys.delete(code);
    this.requestRender();
  }
  setSpeed(speed: number): void { this.update({ speed }); }
  /** Enables grab-and-move; null restores plain orbit/pick behaviour (and cancels a running grab). */
  setDragHandler(handler: DragHandler | null): void {
    if (!handler && this.grab) { const h = this.dragHandler; this.grab = null; h?.end(null); }
    this.dragHandler = handler;
  }
  /** Outline box of a planned placement (drag preview); null hides it. */
  setGhost(bounds: Bounds | null, tone: GhostTone = 'free'): void {
    if (!bounds || !this.origin) this.ghost.visible = false;
    else {
      const size = bounds.maxExclusive.map((n, i) => n - bounds.min[i]!) as [number, number, number];
      const min = this.local(bounds.min);
      this.ghost.scale.set(size[0] + 0.04, size[1] + 0.04, size[2] + 0.04);
      this.ghost.position.set(min[0] + size[0] / 2, min[1] + size[1] / 2, min[2] + size[2] / 2);
      (this.ghost.material as THREE.LineBasicMaterial).color.setHex(GHOST_COLOR[tone]);
      this.ghost.visible = true;
    }
    this.host.dataset.ghost = bounds ? `${bounds.min.join(',')}|${tone}` : '';
    this.requestRender();
  }
  /** Bounds that F / the focus button frame; null ⇒ the whole structure. */
  setFocusTarget(bounds: Bounds | null): void { this.focusTarget = bounds; }
  focusSelection(): void { this.focus(this.focusTarget ?? this.bounds); }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.disposers.forEach(d => d());
    this.controls.dispose();
    this.mesh?.geometry.dispose(); this.material.dispose();
    this.marker.geometry.dispose(); (this.marker.material as THREE.Material).dispose();
    this.ghost.geometry.dispose(); (this.ghost.material as THREE.Material).dispose();
    if (this.grid) { this.grid.geometry.dispose(); (this.grid.material as THREE.Material).dispose(); }
    this.renderer.dispose(); this.renderer.domElement.remove();
  }

  // ---------------------------------------------------------------- internal

  private update(patch: Partial<ViewerState>): void {
    this.stateValue = { ...this.stateValue, ...patch };
    this.events.state(this.stateValue);
    this.requestRender();
  }

  private makeControls(): OrbitControls {
    const c = new OrbitControls(this.camera, this.renderer.domElement);
    c.enableDamping = true; c.dampingFactor = 0.12;
    c.minDistance = 1; c.maxDistance = 20000; c.minZoom = 0.02; c.maxZoom = 200;
    c.addEventListener('change', () => this.requestRender());
    c.addEventListener('start', () => { if (this.stateValue.view) this.update({ view: null }); });
    return c;
  }

  private local(p: Vec3, add = 0): [number, number, number] {
    const o = this.origin ?? [0, 0, 0];
    return [p[0] - o[0] + add, p[1] - o[1] + add, p[2] - o[2] + add];
  }

  private frameTo(bounds: Bounds, direction: Vec3, minRadius = 0.5): void {
    const f = frameBounds(bounds, direction, FOV, this.aspect, 1.08, minRadius);
    const target = new THREE.Vector3(...this.local(f.target));
    const dir = new THREE.Vector3(...direction).normalize();
    if (this.camera === this.ortho) {
      this.ortho.zoom = orthoZoom(bounds, ORTHO_HALF, this.aspect, 1.08, minRadius);
      this.ortho.position.copy(target).addScaledVector(dir, Math.max(f.radius * 4, 50));
      this.ortho.updateProjectionMatrix();
    } else this.perspective.position.copy(target).addScaledVector(dir, f.distance);
    this.camera.up.set(0, 1, 0);
    this.controls.target.copy(target);
    this.camera.lookAt(target);
    this.controls.update();
    this.requestRender();
  }

  private leaveFlight(): void {
    const d = lookDirection(this.yaw, this.pitch);
    const target = this.perspective.position.clone().add(new THREE.Vector3(...d).multiplyScalar(Math.max(this.orbitDistance, 2)));
    this.controls.target.copy(target);
    this.controls.enabled = true; this.controls.update();
    this.keys.clear();
    this.update({ mode: 'orbit' });
  }

  private applyLook(): void {
    this.perspective.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.requestRender();
  }

  private updateGrid(): void {
    if (this.grid) { this.scene.remove(this.grid); this.grid.geometry.dispose(); (this.grid.material as THREE.Material).dispose(); }
    const b = this.bounds, size = Math.max(...b.maxExclusive.map((n, i) => n - b.min[i]!));
    const extent = Math.ceil(Math.max(30, size * 2) / 2) * 2;
    this.grid = new THREE.GridHelper(extent, Math.min(200, extent), 0x47766f, 0x29444d);
    const c = this.local(boundsCentre(b));
    // Grid lines on block boundaries, just below the lowest layer.
    this.grid.position.set(Math.round(c[0]), b.min[1] - this.origin![1] - 0.02, Math.round(c[2]));
    this.scene.add(this.grid);
  }

  private resize(): void {
    const { width, height } = this.host.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.aspect = width / height;
    this.perspective.aspect = this.aspect; this.perspective.updateProjectionMatrix();
    this.ortho.left = -ORTHO_HALF * this.aspect; this.ortho.right = ORTHO_HALF * this.aspect; this.ortho.updateProjectionMatrix();
    this.requestRender();
  }

  requestRender(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  private tick(time: number): void {
    this.frame = 0;
    const seconds = this.last ? Math.min(0.1, (time - this.last) / 1000) : 1 / 60;
    let again = false;
    if (this.stateValue.mode === 'flight') {
      const input = { forward: 0, right: 0, up: 0 };
      let yaw = 0, pitch = 0;
      for (const code of this.keys) {
        const move = FLIGHT_KEYS[code]; if (move) input[move[0]] += move[1];
        const look = LOOK_KEYS[code]; if (look) { yaw += look[0]; pitch += look[1]; }
      }
      if (yaw || pitch) { this.yaw += yaw * 1.6 * seconds; this.pitch = clampPitch(this.pitch + pitch * 1.2 * seconds); this.applyLook(); }
      const p = this.perspective.position;
      const next = flightStep([p.x, p.y, p.z], this.yaw, input, this.stateValue.speed, seconds);
      p.set(...next);
      again = this.keys.size > 0;
    } else again = this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const c = this.camera.position;
    // Rounded camera position in world coordinates; read by browser tests and handy when debugging.
    this.host.dataset.camera = this.local([0, 0, 0]).map((o, i) => (c.getComponent(i) - o).toFixed(1)).join(',');
    this.last = again ? time : 0;
    if (again) this.requestRender();
    if (this.hoverQueued) { const e = this.hoverQueued; this.hoverQueued = null; this.events.hover(this.pickAt(e)); }
  }

  private pickAt(e: PointerEvent | MouseEvent): Cell | null {
    if (!this.mesh) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.mesh, false)[0];
    if (!hit || hit.faceIndex == null) return null;
    return this.cells[this.quadCells[hit.faceIndex >> 1]!] ?? null;
  }

  private rayAt(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), this.camera);
  }

  /** World X/Z cell on the grab plane under the pointer. */
  private planeCell(e: PointerEvent, plane: THREE.Plane): [number, number] | null {
    this.rayAt(e);
    const hit = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return null;
    const o = this.origin ?? [0, 0, 0];
    return [Math.floor(hit.x + o[0]), Math.floor(hit.z + o[2])];
  }

  private grabStart(e: PointerEvent): void {
    if (this.grab) { // a second finger cancels the move and falls back to pinch/pan
      const h = this.dragHandler; this.grab = null; h?.end(null); return;
    }
    if (!this.dragHandler || this.stateValue.mode === 'flight' || e.button > 0) return;
    const cell = this.pickAt(e);
    if (!cell || !this.dragHandler.canGrab(cell)) return;
    // Plane through the middle of the grabbed cell: dragging follows that layer under the pointer.
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.local(cell.position, 0.5)[1]);
    const start = this.planeCell(e, plane) ?? [cell.position[0], cell.position[2]];
    e.stopPropagation(); e.preventDefault();
    this.host.focus({ preventScroll: true }); // Escape cancels
    this.host.setPointerCapture(e.pointerId);
    this.grab = { id: e.pointerId, plane, start, delta: [0, 0, 0] };
    this.host.dataset.dragging = 'true';
  }

  private grabMove(e: PointerEvent): void {
    const g = this.grab; if (!g || g.id !== e.pointerId) return;
    e.stopPropagation();
    const at = this.planeCell(e, g.plane); if (!at) return;
    const delta: Vec3 = [at[0] - g.start[0], 0, at[1] - g.start[1]];
    if (delta[0] === g.delta[0] && delta[2] === g.delta[2]) return;
    g.delta = delta; this.dragHandler?.move(delta);
  }

  private grabEnd(e: PointerEvent, cancelled: boolean): void {
    const g = this.grab; if (!g || g.id !== e.pointerId) return;
    e.stopPropagation();
    this.grab = null; delete this.host.dataset.dragging;
    if (this.host.hasPointerCapture(e.pointerId)) this.host.releasePointerCapture(e.pointerId);
    this.dragHandler?.end(cancelled ? null : g.delta);
  }

  private pointerDown(e: PointerEvent): void {
    this.host.focus({ preventScroll: true });
    this.pointers.add(e.pointerId);
    // A second finger turns the gesture into pinch/pan; it must never select.
    if (this.pointers.size > 1) { if (this.dragging) this.dragging.moved = true; return; }
    this.dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    if (this.stateValue.mode === 'flight') this.renderer.domElement.setPointerCapture(e.pointerId);
  }

  private pointerMove(e: PointerEvent): void {
    const d = this.dragging;
    if (d && d.id === e.pointerId) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) d.moved = true;
      if (this.stateValue.mode === 'flight' && d.moved) {
        // Drag to look (mouse and touch alike); no pointer lock needed.
        this.yaw += e.movementX * 0.005; this.pitch = clampPitch(this.pitch + e.movementY * 0.005);
        this.applyLook();
      }
      return;
    }
    if (e.pointerType === 'mouse') { this.hoverQueued = e; this.requestRender(); }
  }

  private pointerUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    const d = this.dragging; if (d?.id === e.pointerId) this.dragging = null;
    if (!d || d.id !== e.pointerId || d.moved) return;
    this.events.pick(this.pickAt(e));
  }

  private wheel(e: WheelEvent): void {
    if (this.stateValue.mode !== 'flight') return; // orbit zoom is handled by OrbitControls
    e.preventDefault();
    const i = SPEED_STEPS.findIndex(s => s >= this.stateValue.speed);
    const next = SPEED_STEPS[Math.max(0, Math.min(SPEED_STEPS.length - 1, (i < 0 ? SPEED_STEPS.length - 1 : i) + (e.deltaY < 0 ? 1 : -1)))]!;
    this.setSpeed(next);
  }

  private keyDown(e: KeyboardEvent): void {
    if ((e.target as HTMLElement | null)?.closest('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const flying = this.stateValue.mode === 'flight';
    if (flying && (FLIGHT_KEYS[e.code] || LOOK_KEYS[e.code])) {
      e.preventDefault(); this.keys.add(e.code); this.requestRender(); return;
    }
    if (e.code === 'Escape' && flying) { e.preventDefault(); this.setFlight(false); return; }
    if (e.code === 'Escape' && this.grab) { e.preventDefault(); const h = this.dragHandler; this.grab = null; delete this.host.dataset.dragging; h?.end(null); return; }
    // Buttons are handled by the toolbar; keyboard shortcuts only when the scene itself is focused.
    if ((e.target as HTMLElement | null)?.closest('button')) return;
    const view = VIEWS.find(v => v.key === e.key);
    if (view) { e.preventDefault(); this.setView(view.id); return; }
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); this.focusSelection(); return; }
    if (e.key === 'v' || e.key === 'V') { e.preventDefault(); this.setFlight(!flying); return; }
    if (e.key === 'o' || e.key === 'O') { e.preventDefault(); this.setProjection(this.stateValue.projection === 'perspective' ? 'orthographic' : 'perspective'); }
  }

  private keyUp(e: KeyboardEvent): void {
    if (this.keys.delete(e.code)) this.requestRender();
  }

  /** Default speed for the current structure; called by the component on first geometry. */
  resetSpeed(): void {
    const b = this.bounds, size = Math.max(...b.maxExclusive.map((n, i) => n - b.min[i]!));
    const target = defaultSpeed(size);
    this.setSpeed(SPEED_STEPS.find(s => s >= target) ?? SPEED_STEPS.at(-1)!);
  }
}

/** Vertex-coloured standard material with thin block-edge lines computed from the integer grid. */
function gridMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
  m.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCell;\nvarying vec3 vAxis;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCell = position;\nvAxis = abs(normal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCell;\nvarying vec3 vAxis;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 edge = min(fract(vCell), 1.0 - fract(vCell)) + vAxis;
        float line = 1.0 - smoothstep(0.0, 0.035, min(min(edge.x, edge.y), edge.z));
        diffuseColor.rgb *= 1.0 - 0.32 * line;`);
  };
  return m;
}
