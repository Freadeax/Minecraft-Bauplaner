import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { BlockState, Bounds, Cell, Vec3 } from '../../../../packages/voxel/src/index.js';
import type { RenderKit } from '../blockmodels/assets';
import { sunDirection } from '../blockmodels/graphics';
import type { GraphicsSettings } from '../blockmodels/graphics';
import { buildSectionMesh } from '../blockmodels/mesh';
import type { BeaconCount, Mark, MeshSection, SectionMesh, SpawnMap } from '../blockmodels/mesh';
import { BlockObject, MODE_INDEX, SunShadow, blockMaterials, lookUniforms, setBiomeFactors, spawnOverlay } from '../blockmodels/threeMesh';
import { biomeFactors } from '../blockmodels/biomes';
import type { BlockMaterials } from '../blockmodels/threeMesh';
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
/** A block face under the pointer: the cell, the axis direction of the face and the free cell in front of it. */
export interface PickHit { readonly cell: Cell; readonly normal: Vec3; readonly adjacent: Vec3 }
export interface PointerMods { readonly shift: boolean; readonly alt: boolean; readonly ctrl: boolean }
/**
 * Building directly in the 3D view (EDIT-06). A press on a block face asks `canStart`; when it agrees the
 * gesture belongs to the handler (no orbit): `move` reports the face under the pointer (lazy, a ray test
 * against the blocks) and the cells on the plane of the start face, both in the layer of the hit cell and
 * the layer in front of it; `end` closes it (cancelled by Escape, a second finger or pointer cancel).
 * `hover` follows the mouse outside gestures, for the outline of the cell a click would change.
 */
export interface BuildHandler {
  canStart(hit: PickHit, mods: PointerMods): boolean;
  start(hit: PickHit, mods: PointerMods): void;
  move(at: { readonly hit: () => PickHit | null; readonly plane: { readonly cell: Vec3; readonly adjacent: Vec3 } | null }): void;
  end(cancelled: boolean): void;
  hover(hit: PickHit | null): void;
}
/** Planned cells drawn as translucent boxes over the blocks (shape preview, cells to remove). */
export interface PreviewCells { readonly positions: readonly Vec3[]; readonly colors?: readonly string[]; readonly color: string; readonly erase?: boolean }
const PREVIEW_MAX = 30_000;
const GHOST_COLOR: Record<GhostTone, number> = { free: 0xffffff, snap: 0x5ff0b0, conflict: 0xff6b6b };

export interface MeshStats {
  readonly blocks: number; readonly quads: number; readonly naiveQuads: number; readonly buildMs: number;
  /** 32³ sections drawn, and how many of them were taken over unchanged from the previous geometry. */
  readonly sections: number; readonly reused: number;
  /** Floor cells where monsters could spawn (also by day / only at night); null without light. */
  readonly spawnDay: number | null; readonly spawnNight: number | null;
  /** Beacons and how many of them shine (GFX-02). */
  readonly beacons: BeaconCount;
}

/** What a geometry change needs before its mesh is built (see SceneController.planCells). */
export interface CellsPlan {
  readonly payloadBounds: Bounds;
  readonly kit: RenderKit;
  readonly origin: Vec3;
  readonly reframe: boolean;
  readonly previous: readonly MeshSection[];
}

export interface ControllerEvents {
  pick(cell: Cell | null, hit?: PickHit | null, mods?: PointerMods): void;
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
const overlaps = (a: Bounds, b: Bounds) => [0, 1, 2].every(i => a.min[i]! < b.maxExclusive[i]! && b.min[i]! < a.maxExclusive[i]!);
const sameBounds = (a: Bounds, b: Bounds) => [0, 1, 2].every(i => a.min[i] === b.min[i] && a.maxExclusive[i] === b.maxExclusive[i]);

export class SceneController {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly perspective = new THREE.PerspectiveCamera(FOV, 1, 0.05, 20000);
  private readonly ortho = new THREE.OrthographicCamera(-ORTHO_HALF, ORTHO_HALF, ORTHO_HALF, -ORTHO_HALF, -20000, 20000);
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = this.perspective;
  private controls: OrbitControls;
  private materials: BlockMaterials | null = null;
  private mesh: BlockObject | null = null;
  private sections: readonly MeshSection[] = [];
  private readonly look = lookUniforms();
  private readonly shadow = new SunShadow();
  private shadowDirty = true;
  private graphics: GraphicsSettings | null = null;
  private spawnMesh: THREE.Mesh | null = null;
  private cells: readonly Cell[] = [];
  private cellIndex: Map<string, Cell> | null = null;
  private readonly frustum = new THREE.Frustum();
  private readonly frustumMatrix = new THREE.Matrix4();
  private grid: THREE.GridHelper | null = null;
  private readonly marker: THREE.LineSegments;
  /** Integer world offset subtracted from every vertex (keeps float32 precise for far coordinates). */
  private origin: Vec3 | null = null;
  private bounds: Bounds = { min: [0, 0, 0], maxExclusive: [1, 1, 1] };
  private aspect = 1;
  private frame = 0;
  /**
   * True until the user moves the camera: while set, a size change of the view
   * (layout settling after a file import, tab switch) or a new structure with
   * other bounds frames the whole structure again instead of leaving it off-screen.
   */
  private autoFrame = true;
  private last = 0;
  private stateValue: ViewerState = { mode: 'orbit', projection: 'perspective', view: 'iso', speed: 8 };
  private readonly keys = new Set<string>();
  private readonly pointers = new Set<number>();
  /** Fingers on the host, counted before OrbitControls or a build/grab gesture can swallow them. */
  private readonly touches = new Set<number>();
  private focusTarget: Bounds | null = null;
  private yaw = 0;
  private pitch = 0;
  private orbitDistance = 10;
  private dragging: { id: number; x: number; y: number; moved: boolean } | null = null;
  private hoverQueued: PointerEvent | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private dragHandler: DragHandler | null = null;
  private grab: { id: number; plane: THREE.Plane; start: [number, number]; delta: Vec3 } | null = null;
  private buildHandler: BuildHandler | null = null;
  private building: { id: number; plane: THREE.Plane; normal: Vec3 } | null = null;
  private preview: THREE.InstancedMesh | null = null;
  private readonly ghost: THREE.LineSegments;
  private readonly disposers: (() => void)[] = [];
  private uploadStarted = 0;

  constructor(private readonly host: HTMLElement, private readonly events: ControllerEvents) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const canvas = this.renderer.domElement;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D-Bauwerk: Ziehen zum Drehen, Scrollen zum Zoomen, Block anklicken für Koordinaten. Tasten 1–6 Ansichten, F Fokus, V Freiflug.');
    host.appendChild(canvas);
    host.dataset.ghost = ''; // no preview yet; tests and tools can rely on the attribute being present

    this.marker = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.9 }));
    this.marker.visible = false; this.marker.renderOrder = 2; this.scene.add(this.marker);
    this.ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.95 }));
    this.ghost.visible = false; this.ghost.renderOrder = 3; this.scene.add(this.ghost);
    this.controls = this.makeControls();

    const on = <K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
      target.addEventListener(type, fn as EventListener, options); this.disposers.push(() => target.removeEventListener(type, fn as EventListener, options));
    };
    // Grabbing runs in the capture phase on the host, before OrbitControls and the canvas handlers see the pointer.
    on(host, 'pointerdown', e => {
      // The first finger of a touch is primary; a stale entry (finger lifted outside the view) never blocks building.
      if (e.pointerType === 'touch') { if (e.isPrimary) this.touches.clear(); this.touches.add(e.pointerId); }
      this.autoFrame = false; this.grabStart(e); if (!this.grab) this.buildStart(e);
    }, { capture: true });
    on(host, 'pointermove', e => { this.grabMove(e); this.buildMove(e); }, { capture: true });
    on(host, 'pointerup', e => { this.touches.delete(e.pointerId); this.grabEnd(e, false); this.buildEnd(e, false); }, { capture: true });
    on(host, 'pointercancel', e => { this.touches.delete(e.pointerId); this.grabEnd(e, true); this.buildEnd(e, true); }, { capture: true });
    on(canvas, 'pointerdown', e => this.pointerDown(e));
    on(canvas, 'pointermove', e => this.pointerMove(e));
    on(canvas, 'pointerup', e => this.pointerUp(e));
    on(canvas, 'pointercancel', e => { this.pointers.delete(e.pointerId); this.dragging = null; });
    on(canvas, 'pointerleave', () => { this.hoverQueued = null; this.events.hover(null); this.buildHandler?.hover(null); });
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

  /**
   * Replaces the visible blocks: real block shapes (and textures, if loaded)
   * from `kit`, optionally tinted per cell by `markOf`. `payloadBounds` sizes
   * the grid and the default framing.
   */
  setCells(cells: readonly Cell[], payloadBounds: Bounds, palette: readonly BlockState[], kit: RenderKit, markOf?: (cell: Cell) => Mark | null): MeshStats {
    const started = performance.now();
    const plan = this.planCells(payloadBounds, kit);
    const built = buildSectionMesh(cells, palette, kit.renderer, kit.atlas.lookup, plan.origin, markOf, {}, plan.previous);
    return this.applyCells(plan, built, cells, started);
  }

  /**
   * First half of a geometry change whose mesh is built elsewhere (PERF-04,
   * background worker): the origin and the sections that may be reused. The
   * current view stays untouched until {@link applyCells}.
   */
  planCells(payloadBounds: Bounds, kit: RenderKit): CellsPlan {
    // A structure that does not overlap the previous one (another file in the same view) is framed anew.
    const elsewhere = this.origin !== null && !overlaps(this.bounds, payloadBounds);
    const reframe = this.origin === null || elsewhere || (this.autoFrame && !sameBounds(this.bounds, payloadBounds));
    const c = boundsCentre(payloadBounds);
    const origin: Vec3 = !this.origin || elsewhere ? [Math.floor(c[0]), Math.floor(c[1]), Math.floor(c[2])] : this.origin;
    const previous = this.materials?.key !== kit.key || origin !== this.origin ? [] : this.sections;
    return { payloadBounds, kit, origin, reframe, previous };
  }

  /** Second half: shows a mesh built for `plan` (here or in the background). */
  applyCells(plan: CellsPlan, built: SectionMesh, cells: readonly Cell[], started = performance.now()): MeshStats {
    const { kit } = plan;
    // The camera may have moved while the mesh was computed: re-check whether framing is still wanted.
    const reframe = plan.reframe && (this.origin === null || this.origin !== plan.origin || this.autoFrame);
    this.origin = plan.origin;
    this.bounds = plan.payloadBounds;
    if (this.materials?.key !== kit.key) {
      this.materials?.dispose(); this.materials = blockMaterials(kit, this.look);
      this.mesh?.setMaterials(this.materials);
    }
    this.sections = built.sections;
    if (!this.mesh) { this.mesh = new BlockObject(built.sections, cells, this.materials!, { progressive: true }); this.scene.add(this.mesh.group); }
    else this.mesh.update(built.sections);
    this.uploadStarted = performance.now();
    this.markUpload();
    this.cells = cells; this.cellIndex = null;
    this.setSpawn(built.spawn);
    this.shadowDirty = true;
    this.updateGrid();
    if (reframe) this.setView(this.stateValue.view ?? 'iso', true);
    this.host.dataset.sections = String(built.sections.length);
    this.host.dataset.reused = String(built.reused);
    this.requestRender();
    let day: number | null = null, night: number | null = null;
    if (built.spawn) { day = 0; night = 0; for (const w of built.spawn.when) if (w === 1) day++; else night++; }
    return { blocks: built.blocks, quads: built.quads, naiveQuads: built.naiveQuads, buildMs: performance.now() - started,
      sections: built.sections.length, reused: built.reused, spawnDay: day, spawnNight: night, beacons: built.beacons };
  }

  /** Applies light mode, occlusion, sun and spawn marks; never rebuilds geometry. */
  setGraphics(g: GraphicsSettings): void {
    const before = this.graphics;
    this.graphics = g;
    this.look.mode.value = MODE_INDEX[g.mode];
    this.look.aoStrength.value = g.ao ? 1 : 0;
    this.look.sunDir.value.set(...sunDirection(g.hour));
    this.look.shadowOn.value = g.mode === 'sun' && g.shadows ? 1 : 0;
    if (!before || before.biome !== g.biome) setBiomeFactors(this.look, biomeFactors(g.biome));
    this.host.dataset.biome = g.biome;
    if (!before || before.hour !== g.hour || before.shadows !== g.shadows || before.mode !== g.mode) this.shadowDirty = true;
    if (!before || before.quality !== g.quality) {
      this.renderer.setPixelRatio(g.quality === 'low' ? 1 : Math.min(window.devicePixelRatio, g.quality === 'high' ? 3 : 2));
      this.resize();
    }
    if (this.spawnMesh) this.spawnMesh.visible = g.spawn;
    this.host.dataset.light = g.mode;
    this.host.dataset.spawnCheck = g.spawn ? 'on' : 'off';
    this.requestRender();
  }

  private setSpawn(spawn: SpawnMap | null): void {
    if (this.spawnMesh) { this.scene.remove(this.spawnMesh); this.spawnMesh.geometry.dispose(); (this.spawnMesh.material as THREE.Material).dispose(); this.spawnMesh = null; }
    this.host.dataset.spawn = spawn ? String(spawn.count) : '';
    if (!spawn?.count || !this.origin) return;
    this.spawnMesh = spawnOverlay(spawn, this.origin);
    this.spawnMesh.visible = this.graphics?.spawn ?? false;
    this.scene.add(this.spawnMesh);
  }

  /** Outlines one cell (selection marker); null hides it. */
  mark(cell: Cell | null): void {
    if (!cell || !this.origin) this.marker.visible = false;
    else { this.marker.visible = true; this.marker.position.set(...this.local(cell.position, 0.5)); }
    this.requestRender();
  }

  setView(name: ViewName, automatic = false): void {
    if (!automatic) this.autoFrame = false;
    const preset = VIEWS.find(v => v.id === name)!;
    if (this.stateValue.mode === 'flight') this.leaveFlight();
    this.frameTo(this.bounds, preset.direction);
    this.update({ view: name });
  }

  /**
   * Exact camera pose in world block coordinates (Block 5, image comparison with game screenshots):
   * eye and target as in Minecraft (`tp` position + eye height, `lookAt`), vertical field of view in degrees;
   * `grid: false` hides the ground grid so only blocks are drawn.
   * Only the comparison script calls it (via the test hook in ThreeViewer); the menu never does.
   */
  setPose(eye: Vec3, target: Vec3, fov = FOV, grid = true): void {
    this.autoFrame = false;
    if (this.grid) this.grid.visible = grid;
    if (this.stateValue.mode === 'flight') this.leaveFlight();
    if (this.stateValue.projection !== 'perspective') this.setProjection('perspective');
    this.perspective.fov = fov; this.perspective.updateProjectionMatrix();
    const t = new THREE.Vector3(...this.local(target));
    this.perspective.position.set(...this.local(eye));
    this.perspective.up.set(0, 1, 0);
    this.controls.target.copy(t);
    this.perspective.lookAt(t);
    this.controls.update();
    this.update({ view: null });
    this.requestRender();
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
  /**
   * Enables building on block faces (EDIT-06); null restores plain orbit/pick behaviour. While enabled the
   * right mouse button orbits and the middle one pans, so a left drag on blocks can build.
   */
  setBuildHandler(handler: BuildHandler | null): void {
    if (!handler && this.building) { const h = this.buildHandler; this.building = null; delete this.host.dataset.building; h?.end(true); }
    if (!handler) this.buildHandler?.hover(null);
    this.buildHandler = handler;
    this.applyMouseButtons(this.controls);
    this.host.dataset.build = handler ? 'on' : 'off';
  }
  /** Translucent boxes for planned cells (null hides them); at most 30 000 are drawn. */
  setPreview(preview: PreviewCells | null): void {
    const n = preview ? Math.min(preview.positions.length, PREVIEW_MAX) : 0;
    if (!preview || !n || !this.origin) {
      if (this.preview) this.preview.count = 0;
      this.host.dataset.preview = '0';
      this.requestRender(); return;
    }
    if (!this.preview || this.preview.instanceMatrix.count < n) {
      if (this.preview) { this.scene.remove(this.preview); this.preview.geometry.dispose(); (this.preview.material as THREE.Material).dispose(); }
      const capacity = Math.min(PREVIEW_MAX, Math.max(256, 2 ** Math.ceil(Math.log2(n))));
      this.preview = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false }), capacity);
      this.preview.renderOrder = 1; this.preview.frustumCulled = false;
      this.scene.add(this.preview);
    }
    const m = new THREE.Matrix4(), color = new THREE.Color(), size = preview.erase ? 1.04 : 0.92;
    (this.preview.material as THREE.MeshBasicMaterial).opacity = preview.erase ? 0.55 : 0.45;
    for (let i = 0; i < n; i++) {
      const p = this.local(preview.positions[i]!, 0.5);
      m.makeScale(size, size, size).setPosition(p[0], p[1], p[2]);
      this.preview.setMatrixAt(i, m);
      this.preview.setColorAt(i, color.set(preview.colors?.[i] ?? preview.color));
    }
    this.preview.count = n;
    this.preview.instanceMatrix.needsUpdate = true;
    if (this.preview.instanceColor) this.preview.instanceColor.needsUpdate = true;
    this.host.dataset.preview = String(n);
    this.requestRender();
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
    this.mesh?.dispose(); this.materials?.dispose(); this.shadow.dispose(); this.setSpawn(null);
    this.marker.geometry.dispose(); (this.marker.material as THREE.Material).dispose();
    this.ghost.geometry.dispose(); (this.ghost.material as THREE.Material).dispose();
    if (this.preview) { this.preview.geometry.dispose(); (this.preview.material as THREE.Material).dispose(); }
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
    this.applyMouseButtons(c);
    return c;
  }

  /** Building (EDIT-06) keeps the left button for blocks: right orbits, middle pans; otherwise the defaults. */
  private applyMouseButtons(c: OrbitControls): void {
    c.mouseButtons = this.buildHandler
      ? { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }
      : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
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
    if (this.autoFrame && this.mesh && this.stateValue.mode === 'orbit') this.setView(this.stateValue.view ?? 'iso', true);
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
    let uploading = false;
    const inView = this.updateFrustum();
    if (this.mesh?.pending && this.origin) {
      // Large scenes reach the GPU in pieces, sections on screen and nearest first (GFX-02/03).
      const c = this.camera.position, o = this.origin;
      this.mesh.uploadStep([c.x + o[0], c.y + o[1], c.z + o[2]], (w, r) => inView([w[0] - o[0], w[1] - o[1], w[2] - o[2]], r));
      uploading = true;
      if (!this.mesh.pending) this.shadowDirty = true;
      this.markUpload();
    }
    if (this.mesh && this.materials) {
      if (this.shadowDirty && this.look.shadowOn.value > 0.5) { this.shadow.render(this.renderer, this.scene, this.mesh, this.materials); this.shadowDirty = false; }
      // Glass and water back to front, spread over frames: sections on screen and near first (GFX-03).
      if (this.mesh.translucentQuads) {
        const more = this.mesh.sortStep(this.camera.position, inView);
        this.host.dataset.sorting = more ? 'true' : 'false';
        if (more) again = true;
      }
    }
    const renderStart = performance.now();
    this.renderer.render(this.scene, this.camera);
    if (uploading) { this.mesh!.reportFrame(performance.now() - renderStart); again = true; }
    const c = this.camera.position;
    // Rounded camera position in world coordinates; read by browser tests and handy when debugging.
    this.host.dataset.camera = this.local([0, 0, 0]).map((o, i) => (c.getComponent(i) - o).toFixed(1)).join(',');
    this.last = again ? time : 0;
    if (again) this.requestRender();
    if (this.hoverQueued) {
      const e = this.hoverQueued; this.hoverQueued = null;
      const hit = this.pickHitAt(e);
      this.events.hover(hit?.cell ?? null);
      if (!this.building) this.buildHandler?.hover(hit);
    }
  }

  /** Block face under the pointer with the free cell in front of it (EDIT-06). */
  private pickHitAt(e: PointerEvent | MouseEvent): PickHit | null {
    if (!this.mesh) return null;
    this.rayAt(e);
    const hit = this.mesh.pickFace(this.raycaster);
    if (!hit) return null;
    if (!this.cellIndex) { this.cellIndex = new Map(); for (const c of this.cells) this.cellIndex.set(c.position.join(','), c); }
    const cell = this.cellIndex.get(hit.cell.position.join(','));
    if (!cell) return null;
    const p = cell.position, n = hit.normal;
    return { cell, normal: n, adjacent: [p[0] + n[0], p[1] + n[1], p[2] + n[2]] };
  }

  private mods(e: PointerEvent): PointerMods { return { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey }; }

  private buildStart(e: PointerEvent): void {
    if (this.building) { // a second finger cancels the gesture
      const h = this.buildHandler; this.building = null; delete this.host.dataset.building; h?.end(true); return;
    }
    // A finger landing while another one is down (it missed the model and went to zoom/orbit) is a pinch, not a build.
    if (!this.buildHandler || this.stateValue.mode === 'flight' || e.button > 0 || this.touches.size > 1) return;
    const hit = this.pickHitAt(e);
    const mods = this.mods(e);
    if (!hit || !this.buildHandler.canStart(hit, mods)) return;
    // Plane of the hit face: dragging moves along it (top face ⇒ horizontal, side face ⇒ a wall).
    const n = hit.normal, face = this.local(hit.cell.position, 0.5).map((v, i) => v + n[i]! * 0.5);
    const normal = new THREE.Vector3(n[0], n[1], n[2]);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(face[0], face[1], face[2]));
    e.stopPropagation(); e.preventDefault();
    this.host.focus({ preventScroll: true });
    this.host.setPointerCapture(e.pointerId);
    this.building = { id: e.pointerId, plane, normal: n };
    this.host.dataset.building = 'true';
    this.buildHandler.hover(null);
    this.marker.visible = false;
    this.buildHandler.start(hit, mods);
  }

  private buildMove(e: PointerEvent): void {
    const b = this.building; if (!b || b.id !== e.pointerId) return;
    e.stopPropagation();
    this.rayAt(e);
    const point = this.raycaster.ray.intersectPlane(b.plane, new THREE.Vector3());
    const o = this.origin ?? [0, 0, 0], n = b.normal;
    const cellAt = (shift: number): Vec3 => [0, 1, 2].map(i => Math.floor((point!.getComponent(i) + o[i]!) + n[i]! * shift)) as unknown as Vec3;
    const plane = point ? { cell: cellAt(-0.5), adjacent: cellAt(0.5) } : null;
    let cached: PickHit | null | undefined;
    this.buildHandler?.move({ hit: () => cached === undefined ? (cached = this.pickHitAt(e)) : cached, plane });
  }

  private buildEnd(e: PointerEvent, cancelled: boolean): void {
    const b = this.building; if (!b || b.id !== e.pointerId) return;
    e.stopPropagation();
    this.building = null; delete this.host.dataset.building;
    if (this.host.hasPointerCapture(e.pointerId)) this.host.releasePointerCapture(e.pointerId);
    this.buildHandler?.end(cancelled);
  }

  /** Frustum of the current camera as a sphere test in local coordinates. */
  private updateFrustum(): (center: readonly [number, number, number], radius: number) => boolean {
    const cam = this.camera;
    cam.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.frustumMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const sphere = new THREE.Sphere();
    return (c, r) => this.frustum.intersectsSphere(sphere.set(sphere.center.set(c[0], c[1], c[2]), r));
  }

  /** Upload state for the toolbar and tests: sections waiting, frames used, time until complete. */
  private markUpload(): void {
    const m = this.mesh;
    if (!m) return;
    this.host.dataset.upload = String(m.pending);
    if (!m.pending) {
      this.host.dataset.uploadFrames = String(m.uploadFrames);
      this.host.dataset.uploadMs = (performance.now() - this.uploadStarted).toFixed(0);
    }
  }

  private pickAt(e: PointerEvent | MouseEvent): Cell | null {
    if (!this.mesh) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    const hit = this.mesh.pick(this.raycaster);
    if (!hit) return null;
    // Reused sections still point at the cells of an earlier build: resolve by position.
    if (!this.cellIndex) { this.cellIndex = new Map(); for (const c of this.cells) this.cellIndex.set(c.position.join(','), c); }
    return this.cellIndex.get(hit.position.join(',')) ?? null;
  }

  private rayAt(e: PointerEvent | MouseEvent): void {
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
    if (!this.dragHandler || this.stateValue.mode === 'flight' || e.button > 0 || this.touches.size > 1) return;
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
    const hit = this.pickHitAt(e);
    this.events.pick(hit?.cell ?? null, hit, this.mods(e));
  }

  private wheel(e: WheelEvent): void {
    this.autoFrame = false;
    if (this.stateValue.mode !== 'flight') return; // orbit zoom is handled by OrbitControls
    e.preventDefault();
    const i = SPEED_STEPS.findIndex(s => s >= this.stateValue.speed);
    const next = SPEED_STEPS[Math.max(0, Math.min(SPEED_STEPS.length - 1, (i < 0 ? SPEED_STEPS.length - 1 : i) + (e.deltaY < 0 ? 1 : -1)))]!;
    this.setSpeed(next);
  }

  private keyDown(e: KeyboardEvent): void {
    this.autoFrame = false;
    if ((e.target as HTMLElement | null)?.closest('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const flying = this.stateValue.mode === 'flight';
    if (flying && (FLIGHT_KEYS[e.code] || LOOK_KEYS[e.code])) {
      e.preventDefault(); this.keys.add(e.code); this.requestRender(); return;
    }
    if (e.code === 'Escape' && flying) { e.preventDefault(); this.setFlight(false); return; }
    if (e.code === 'Escape' && this.grab) { e.preventDefault(); const h = this.dragHandler; this.grab = null; delete this.host.dataset.dragging; h?.end(null); return; }
    if (e.code === 'Escape' && this.building) { e.preventDefault(); const h = this.buildHandler; this.building = null; delete this.host.dataset.building; h?.end(true); return; }
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
