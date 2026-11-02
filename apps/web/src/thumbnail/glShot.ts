import * as THREE from 'three';
import type { Cell, Vec3, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import type { RenderKit } from '../blockmodels/assets';
import { buildBlockMesh } from '../blockmodels/mesh';
import type { Mark, MeshSection } from '../blockmodels/mesh';
import { buildSectionMeshInBackground, meshInBackground } from '../viewer/backgroundMesh';
import { BlockObject, blockMaterials } from '../blockmodels/threeMesh';
import type { BlockMaterials } from '../blockmodels/threeMesh';
import type { ShotView } from './views';
import { withEntities } from '../blockmodels/entityScene';

/**
 * Still images with real block shapes and textures (B12 + Blockdarstellung):
 * one shared offscreen WebGL renderer draws the same block mesh as the 3D
 * viewer with a parallel camera and hands back a PNG. Catalogue cards, the
 * image gallery and the layer plans all use it; dozens of cards never hold
 * more than this one context. Loaded lazily together with three.js.
 * Light is the fixed still look (`STILL_LOOK`): Minecraft daylight with
 * corner shading, independent of the viewer's light menu.
 */
export interface GlShotOptions {
  readonly view?: ShotView;
  /** Only blocks at or below this layer (cutaway). */
  readonly cutY?: number;
  /** Only blocks of exactly this layer (layer plan). */
  readonly onlyY?: number;
  /** Per-cell highlight; false hides the cell. */
  readonly markOf?: (cell: Cell, index: number) => Mark | null | false;
  readonly padding?: number;
  /** Exact framing of the top view in world X/Z (layer plans), instead of fitting the blocks. */
  readonly area?: { readonly x0: number; readonly z0: number; readonly x1: number; readonly z1: number };
}

let renderer: THREE.WebGLRenderer | null = null;
let materials: BlockMaterials | null = null;

function context(): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.addEventListener('webglcontextlost', () => { renderer = null; materials = null; });
  }
  return renderer;
}

const ISO_ELEVATION = Math.PI / 6;
/** Direction from the target to the camera; isometric views as in views.ts (2:1, from the named corner). */
function direction(view: ShotView): THREE.Vector3 {
  const h = Math.cos(ISO_ELEVATION) * Math.SQRT1_2, v = Math.sin(ISO_ELEVATION);
  switch (view) {
    case 'so': return new THREE.Vector3(h, v, h);
    case 'sw': return new THREE.Vector3(-h, v, h);
    case 'nw': return new THREE.Vector3(-h, v, -h);
    case 'no': return new THREE.Vector3(h, v, -h);
    case 'oben': return new THREE.Vector3(0, 1, 0);
    case 'sued': return new THREE.Vector3(0, 0, 1);
    case 'nord': return new THREE.Vector3(0, 0, -1);
    case 'ost': return new THREE.Vector3(1, 0, 0);
    case 'west': return new THREE.Vector3(-1, 0, 0);
  }
}

/** Renders a view into a PNG data URL of the given CSS size; '' when nothing is visible. */
export function renderGlShot(payload: Pick<VoxelPayload, 'cells' | 'palette' | 'entities'>, width: number, height: number, kit: RenderKit, options: GlShotOptions = {}): string {
  return renderGlCanvas(payload, width, height, kit, options)?.toDataURL('image/png') ?? '';
}

/** Like {@link renderGlShot}; the block mesh of large models is built in the background worker (PERF-04). */
export async function renderGlShotAsync(payload: Pick<VoxelPayload, 'cells' | 'palette' | 'entities'>, width: number, height: number, kit: RenderKit, options: GlShotOptions = {}): Promise<string> {
  return (await renderGlCanvasAsync(payload, width, height, kit, options))?.toDataURL('image/png') ?? '';
}

interface Selection { readonly cells: readonly Cell[]; readonly palette: VoxelPayload['palette']; readonly origin: Vec3; readonly markOf: ((cell: Cell) => Mark | null) | undefined }

function select(payload: Pick<VoxelPayload, 'cells' | 'palette' | 'entities'>, options: GlShotOptions): Selection | null {
  const cells: Cell[] = [], marks = new Map<Cell, Mark>();
  payload.cells.forEach((c, i) => {
    if (c.kind !== 'block') return;
    const y = c.position[1];
    if (options.cutY !== undefined && y > options.cutY) return;
    if (options.onlyY !== undefined && y !== options.onlyY) return;
    const m = options.markOf?.(c, i);
    if (m === false) return;
    if (m) marks.set(c, m);
    cells.push(c);
  });
  if (!cells.length) return null;
  // Free entities (paintings, frames, armor stands) with the same layer rules as the cells.
  const withEnt = withEntities(cells, payload.palette, payload.entities, a => (options.cutY === undefined || a[1] <= options.cutY) && (options.onlyY === undefined || a[1] === options.onlyY));
  return { cells: withEnt.cells, palette: withEnt.palette, origin: [cells[0]!.position[0], cells[0]!.position[1], cells[0]!.position[2]], markOf: marks.size ? c => marks.get(c) ?? null : undefined };
}

/** Renders a view into a new canvas (device pixels); null when nothing is visible. */
export function renderGlCanvas(payload: Pick<VoxelPayload, 'cells' | 'palette' | 'entities'>, width: number, height: number, kit: RenderKit, options: GlShotOptions): HTMLCanvasElement | null {
  const sel = select(payload, options);
  if (!sel) return null;
  const mesh = buildBlockMesh(sel.cells, sel.palette, kit.renderer, kit.atlas.lookup, sel.origin, sel.markOf);
  if (!mesh.quads) return null;
  return draw([{ key: 'all', solid: mesh.solid, translucent: mesh.translucent, hash: '', min: [0, 0, 0], cells: sel.cells }], sel, width, height, kit, options);
}

/** Like {@link renderGlCanvas}; large models are meshed in the background, only drawing happens here. */
export async function renderGlCanvasAsync(payload: Pick<VoxelPayload, 'cells' | 'palette' | 'entities'>, width: number, height: number, kit: RenderKit, options: GlShotOptions): Promise<HTMLCanvasElement | null> {
  const sel = select(payload, options);
  if (!sel) return null;
  if (!meshInBackground(sel.cells.length)) return renderGlCanvas(payload, width, height, kit, options);
  const built = await buildSectionMeshInBackground(sel.cells, sel.palette, kit, sel.origin, sel.markOf, []);
  if (!built.quads) return null;
  return draw(built.sections, sel, width, height, kit, options);
}

function draw(sections: readonly MeshSection[], sel: Selection, width: number, height: number, kit: RenderKit, options: GlShotOptions): HTMLCanvasElement | null {
  const view = options.view ?? 'so', origin = sel.origin;
  const r = context();
  if (materials?.key !== kit.key) { materials?.dispose(); materials = blockMaterials(kit); }
  const object = new BlockObject(sections, sel.cells, materials);
  const scene = new THREE.Scene();
  scene.add(object.group);

  const dir = direction(view);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1e4, 1e4);
  camera.up.set(0, 1, 0);
  if (view === 'oben') camera.up.set(0, 0, -1); // north up
  camera.position.copy(dir); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const toView = camera.matrixWorldInverse;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  if (options.area && view === 'oben') {
    const a = options.area;
    minX = a.x0 - origin[0]; maxX = a.x1 + 1 - origin[0]; minY = -(a.z1 + 1 - origin[2]); maxY = -(a.z0 - origin[2]);
  } else {
    const p = new THREE.Vector3();
    for (const layer of sections.flatMap(sec => [sec.solid, sec.translucent])) for (let i = 0; i < layer.positions.length; i += 3) {
      p.set(layer.positions[i]!, layer.positions[i + 1]!, layer.positions[i + 2]!).applyMatrix4(toView);
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    const pad = options.padding ?? 0.08, w = maxX - minX, h = maxY - minY;
    const scale = Math.max(w / (width * (1 - 2 * pad)), h / (height * (1 - 2 * pad)));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    minX = cx - width * scale / 2; maxX = cx + width * scale / 2; minY = cy - height * scale / 2; maxY = cy + height * scale / 2;
  }
  camera.left = minX; camera.right = maxX; camera.bottom = minY; camera.top = maxY;
  camera.updateProjectionMatrix();
  // Glass and water back to front, seen from far along the view direction.
  if (sections.some(sec => sec.translucent.quads)) object.sortTranslucent(dir.clone().multiplyScalar(1e4));

  // Rendering at up to twice the size and scaling down smooths the nearest-sampled textures.
  const ratio = Math.min(2, globalThis.devicePixelRatio || 1), ss = Math.min(2, 4096 / Math.max(width * ratio, height * ratio));
  const pw = Math.max(1, Math.round(width * ratio * ss)), ph = Math.max(1, Math.round(height * ratio * ss));
  r.setPixelRatio(1); r.setSize(pw, ph, false);
  r.render(scene, camera);
  object.dispose();
  const out = document.createElement('canvas');
  out.width = Math.round(width * ratio); out.height = Math.round(height * ratio);
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(r.domElement, 0, 0, out.width, out.height);
  return out;
}
