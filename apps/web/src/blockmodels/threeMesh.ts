import * as THREE from 'three';
import type { Cell } from '../../../../packages/voxel/src/index.js';
import type { RenderKit } from './assets.ts';
import type { LightMode } from './graphics.ts';
import type { BlockMesh, MeshLayer, MeshSection, SpawnMap } from './mesh.ts';

/**
 * three.js side of the block mesh, shared by the 3D viewer and the still
 * images: atlas texture with nearest sampling, cutout alpha test for leaves
 * and plants, a translucent pass for glass and water (sorted back to front),
 * mark colours, and – for the plain look without textures – faint block edges.
 *
 * Light (GFX-01) is chosen in the shader from per-vertex values the mesh
 * builder baked (face brightness, ambient occlusion, block and sky light):
 * - flat:  fixed face brightness and corner shading only,
 * - day:   Minecraft daylight – interiors without sky light get darker,
 * - sun:   directional sunlight with a shadow map, sky ambient and torches,
 * - night: moonlight from the sky and warm block light from torches etc.
 * Switching the look never rebuilds geometry. The same holds for the biome
 * (GFX-02): faces carry their colour class and the vertex shader swaps the
 * baked plains colour for the biome's grass, foliage or water colour.
 */
const VERTEX = /* glsl */`
attribute vec3 aColor;
attribute vec4 aMark;
attribute vec4 aLight;
attribute float aTint;
uniform vec3 biome[4];
varying vec2 vUv;
varying vec3 vColor;
varying vec4 vMark;
varying vec4 vLight;
varying vec3 vPos;
void main() {
  vec3 f = aTint < 0.5 ? biome[0] : aTint < 1.5 ? biome[1] : aTint < 2.5 ? biome[2] : biome[3];
  vUv = uv; vColor = aColor * f; vMark = aMark; vLight = aLight; vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAGMENT = /* glsl */`
uniform sampler2D map;
uniform float alphaTest;
uniform float edges;
uniform float translucent;
uniform int mode;
uniform float aoStrength;
uniform vec3 sunDir;
uniform float shadowOn;
uniform sampler2D shadowMap;
uniform mat4 shadowMatrix;
uniform float shadowTexel;
uniform float normalBias;
varying vec2 vUv;
varying vec3 vColor;
varying vec4 vMark;
varying vec4 vLight;
varying vec3 vPos;

// Minecraft's light curve (level 0..1 → brightness), softened a little like the "Hell" gamma.
float curve(float l) { float g = l / (4.0 - 3.0 * l); return mix(g, 1.0 - pow(1.0 - g, 4.0), 0.5); }

float sunShadow(vec3 n) {
  vec4 sc = shadowMatrix * vec4(vPos + n * normalBias, 1.0);
  vec3 p = sc.xyz / sc.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float lit = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
    float d = texture2D(shadowMap, p.xy + vec2(float(x), float(y)) * shadowTexel).r;
    lit += p.z - 0.0015 <= d ? 1.0 : 0.0;
  }
  return lit / 9.0;
}

void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < alphaTest) discard;
  vec3 base = tex.rgb * vColor;
  float shade = vLight.x, ao = mix(1.0, vLight.y, aoStrength), bl = vLight.z, sk = vLight.w;
  vec3 light;
  if (mode == 0) light = vec3(shade * ao);
  else if (mode == 1) light = vec3(shade * ao * mix(0.2, 1.0, curve(max(sk, bl))));
  else if (mode == 2) {
    vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
    if (dot(n, cameraPosition - vPos) < 0.0) n = -n;
    float ndl = max(dot(n, sunDir), 0.0);
    float direct = ndl * (shadowOn > 0.5 ? sunShadow(n) : 1.0) * smoothstep(0.0, 0.35, sk);
    vec3 sky = vec3(0.6, 0.67, 0.8) * 0.75 * (0.2 + 0.8 * curve(sk)) * (0.55 + 0.45 * shade);
    vec3 torch = vec3(1.0, 0.8, 0.55) * curve(bl) * 0.6;
    light = vec3(1.0, 0.95, 0.86) * 0.6 * direct + (sky + torch) * ao;
  } else {
    vec3 moon = vec3(0.5, 0.58, 0.86) * curve(sk) * 0.36;
    vec3 torch = vec3(1.0, 0.76, 0.48) * curve(bl) * 1.05;
    light = (moon + torch + 0.035) * shade * ao;
  }
  vec3 c = base * light;
  if (edges > 0.5) {
    vec3 n = abs(normalize(cross(dFdx(vPos), dFdy(vPos))));
    vec3 e = min(fract(vPos), 1.0 - fract(vPos)) + step(0.5, n);
    float line = 1.0 - smoothstep(0.0, 0.035, min(min(e.x, e.y), e.z));
    c *= 1.0 - 0.3 * line;
  }
  c = mix(c, vMark.rgb * (0.6 + 0.4 * shade * ao), vMark.a);
  // Plain look: colour sprites are opaque, so translucent blocks get a fixed alpha.
  gl_FragColor = vec4(c, translucent > 0.5 ? (edges > 0.5 ? 0.55 : tex.a) : 1.0);
}`;
const DEPTH_FRAGMENT = /* glsl */`
uniform sampler2D map;
varying vec2 vUv;
varying vec3 vColor;
varying vec4 vMark;
varying vec4 vLight;
varying vec3 vPos;
void main() { if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(1.0); }`;

export const MODE_INDEX: Readonly<Record<LightMode, number>> = { flat: 0, day: 1, sun: 2, night: 3 };

export interface LookUniforms {
  readonly mode: { value: number };
  readonly aoStrength: { value: number };
  readonly sunDir: { value: THREE.Vector3 };
  readonly shadowOn: { value: number };
  readonly shadowMap: { value: THREE.Texture | null };
  readonly shadowMatrix: { value: THREE.Matrix4 };
  readonly shadowTexel: { value: number };
  readonly normalBias: { value: number };
  /** Factors per biome colour class (none, grass, foliage, water) on the baked plains colours. */
  readonly biome: { value: THREE.Vector3[] };
}
export function lookUniforms(): LookUniforms {
  return { mode: { value: 1 }, aoStrength: { value: 1 }, sunDir: { value: new THREE.Vector3(0.4, 0.8, 0.45).normalize() }, shadowOn: { value: 0 },
    shadowMap: { value: null }, shadowMatrix: { value: new THREE.Matrix4() }, shadowTexel: { value: 1 / 2048 }, normalBias: { value: 0.05 },
    biome: { value: [0, 1, 2, 3].map(() => new THREE.Vector3(1, 1, 1)) } };
}
/** Sets the biome factors (biomes.ts `biomeFactors`) on look uniforms. */
export function setBiomeFactors(look: LookUniforms, factors: Float32Array): void {
  look.biome.value.forEach((v, i) => v.set(factors[i * 3]!, factors[i * 3 + 1]!, factors[i * 3 + 2]!));
}

export interface BlockMaterials {
  readonly solid: THREE.ShaderMaterial;
  readonly translucent: THREE.ShaderMaterial;
  /** Shadow pass: depth only, cutout textures still cut. */
  readonly depth: THREE.ShaderMaterial;
  readonly texture: THREE.Texture;
  readonly look: LookUniforms;
  readonly key: string;
  dispose(): void;
}

export function blockMaterials(kit: RenderKit, look: LookUniforms = lookUniforms()): BlockMaterials {
  const texture = new THREE.CanvasTexture(kit.atlas.canvas);
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace; texture.flipY = false; texture.needsUpdate = true;
  const make = (translucent: boolean) => new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT,
    uniforms: { ...look, map: { value: texture }, alphaTest: { value: translucent ? 0.02 : 0.5 }, edges: { value: kit.textured ? 0 : 1 }, translucent: { value: translucent ? 1 : 0 } },
    transparent: translucent, depthWrite: !translucent,
  });
  const solid = make(false), translucent = make(true);
  const depth = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: DEPTH_FRAGMENT, uniforms: { map: { value: texture }, biome: look.biome } });
  return { solid, translucent, depth, texture, look, key: kit.key, dispose() { solid.dispose(); translucent.dispose(); depth.dispose(); texture.dispose(); } };
}

function geometry(layer: MeshLayer): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(layer.positions, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(layer.uvs, 2));
  g.setAttribute('aColor', new THREE.BufferAttribute(layer.colors, 3));
  g.setAttribute('aMark', new THREE.BufferAttribute(layer.marks, 4));
  g.setAttribute('aLight', new THREE.BufferAttribute(layer.light, 4));
  g.setAttribute('aTint', new THREE.BufferAttribute(layer.tints, 1));
  g.setIndex(new THREE.BufferAttribute(layer.indices.slice(), 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

/** Back-to-front order of a translucent layer's quads as seen from `eye` (local coordinates). */
export function sortQuads(positions: Float32Array, quads: number, eye: readonly [number, number, number], out: Uint32Array): void {
  const keys = new Float64Array(quads);
  for (let q = 0; q < quads; q++) {
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < 4; k++) { const i = (q * 4 + k) * 3; cx += positions[i]!; cy += positions[i + 1]!; cz += positions[i + 2]!; }
    const dx = cx / 4 - eye[0], dy = cy / 4 - eye[1], dz = cz / 4 - eye[2];
    keys[q] = dx * dx + dy * dy + dz * dz;
  }
  const order = new Uint32Array(quads);
  for (let q = 0; q < quads; q++) order[q] = q;
  order.sort((a, b) => keys[b]! - keys[a]!);
  for (let i = 0; i < quads; i++) {
    const q = order[i]!, o = i * 6, b = q * 4;
    out[o] = b; out[o + 1] = b + 1; out[o + 2] = b + 2; out[o + 3] = b; out[o + 4] = b + 2; out[o + 5] = b + 3;
  }
}

/** Layer for the shadow pass camera: only solid block meshes cast shadows. */
export const SHADOW_LAYER = 1;

interface SectionObject { readonly section: MeshSection; readonly solid: THREE.Mesh | null; readonly translucent: THREE.Mesh | null }

const layerBytes = (l: MeshLayer) => l.positions.byteLength + l.uvs.byteLength + l.colors.byteLength + l.marks.byteLength + l.light.byteLength + l.tints.byteLength + l.indices.byteLength;
/** Vertex and index bytes a section sends to the GPU. */
export const sectionBytes = (s: MeshSection): number => layerBytes(s.solid) + layerBytes(s.translucent);

/** GPU upload per frame (GFX-02): start, bounds, and the frame times that make it grow or shrink. */
export const UPLOAD = { start: 16 << 20, min: 2 << 20, max: 256 << 20, fastMs: 14, slowMs: 40 } as const;

/**
 * All sections of a block mesh as one object. `update` swaps in a new section
 * list and keeps the GPU buffers of every section that was reused unchanged.
 * `pick` maps a ray hit back to the cell that made the quad.
 *
 * Progressive upload (GFX-02, `progressive: true` in the 3D viewer): when the
 * new sections hold more data than one frame may upload, they wait in a queue
 * and `uploadStep` installs the ones nearest to the camera first, within a
 * byte budget that follows the measured frame time. Until its replacement is
 * installed, the previous mesh of a section stays visible, so edits never
 * leave holes; sections that no longer exist disappear at once. Still images
 * upload everything immediately.
 */
export class BlockObject {
  readonly group = new THREE.Group();
  private parts = new Map<string, SectionObject>();
  private materials: BlockMaterials;
  private sortedAt: string | null = null;
  private queue: MeshSection[] = [];
  private budget: number = UPLOAD.start;
  private readonly progressive: boolean;
  /** Frames the last update needed to reach the GPU completely (1 = at once). */
  uploadFrames = 0;

  constructor(sections: readonly MeshSection[] | BlockMesh, cells: readonly Cell[], materials: BlockMaterials, options: { readonly progressive?: boolean } = {}) {
    this.materials = materials;
    this.progressive = options.progressive === true;
    this.update('solid' in sections ? [{ key: 'all', solid: sections.solid, translucent: sections.translucent, hash: '', min: [0, 0, 0], cells }] : sections);
  }

  /** Sections still waiting for the GPU. */
  get pending(): number { return this.queue.length; }

  /** Replaces the sections; returns how many GPU buffers were kept. */
  update(sections: readonly MeshSection[]): number {
    const wanted = new Set(sections.map(s => s.key));
    for (const [key, p] of this.parts) if (!wanted.has(key)) { this.disposePart(p); this.parts.delete(key); }
    this.queue = [];
    let kept = 0, bytes = 0;
    for (const s of sections) {
      if (this.parts.get(s.key)?.section === s) { kept++; continue; }
      this.queue.push(s); bytes += sectionBytes(s);
    }
    this.uploadFrames = this.queue.length ? 0 : 1;
    if (!this.progressive || bytes <= this.budget) this.install(this.queue.length);
    this.sortedAt = null;
    return kept;
  }

  /**
   * Installs queued sections nearest to `eye` (world coordinates) within the
   * byte budget of one frame, at least one. Returns how many are still waiting.
   */
  uploadStep(eye: readonly [number, number, number]): number {
    if (!this.queue.length) return 0;
    const d = (s: MeshSection) => {
      const h = 16, dx = s.min[0] + h - eye[0], dy = s.min[1] + h - eye[1], dz = s.min[2] + h - eye[2];
      return dx * dx + dy * dy + dz * dz;
    };
    this.queue.sort((a, b) => d(a) - d(b));
    let n = 0, bytes = 0;
    while (n < this.queue.length && (n === 0 || bytes + sectionBytes(this.queue[n]!) <= this.budget)) bytes += sectionBytes(this.queue[n++]!);
    this.install(n);
    return this.queue.length;
  }

  /** Frame time (ms) of the last frame that uploaded: the budget grows on fast frames and halves on slow ones. */
  reportFrame(ms: number): void {
    if (ms < UPLOAD.fastMs) this.budget = Math.min(UPLOAD.max, this.budget * 1.5);
    else if (ms > UPLOAD.slowMs) this.budget = Math.max(UPLOAD.min, this.budget / 2);
  }

  /** Current upload budget per frame in bytes. */
  get uploadBudget(): number { return this.budget; }

  private install(n: number): void {
    const batch = this.queue.splice(0, n);
    if (!batch.length) return;
    this.uploadFrames++;
    for (const s of batch) {
      const before = this.parts.get(s.key);
      if (before) this.disposePart(before);
      const solid = s.solid.quads ? new THREE.Mesh(geometry(s.solid), this.materials.solid) : null;
      const translucent = s.translucent.quads ? new THREE.Mesh(geometry(s.translucent), this.materials.translucent) : null;
      if (solid) { solid.layers.enable(SHADOW_LAYER); solid.userData.section = s; this.group.add(solid); }
      if (translucent) { translucent.renderOrder = 1; translucent.userData.section = s; this.group.add(translucent); this.sortedAt = null; }
      this.parts.set(s.key, { section: s, solid, translucent });
    }
  }

  setMaterials(materials: BlockMaterials): void {
    this.materials = materials;
    for (const p of this.parts.values()) { if (p.solid) p.solid.material = materials.solid; if (p.translucent) p.translucent.material = materials.translucent; }
  }

  get translucentQuads(): number { let n = 0; for (const p of this.parts.values()) n += p.section.translucent.quads; return n; }

  /**
   * Sorts translucent quads back to front for `eye` (local coordinates), and
   * the translucent section meshes among each other. Skips work when the eye
   * did not move by a quarter block.
   */
  sortTranslucent(eye: THREE.Vector3): boolean {
    const key = `${Math.round(eye.x * 4)},${Math.round(eye.y * 4)},${Math.round(eye.z * 4)}`;
    if (key === this.sortedAt) return false;
    this.sortedAt = key;
    const list: { mesh: THREE.Mesh; d: number }[] = [];
    for (const p of this.parts.values()) {
      if (!p.translucent) continue;
      const g = p.translucent.geometry, layer = p.section.translucent;
      const index = g.getIndex()!;
      sortQuads(layer.positions, layer.quads, [eye.x, eye.y, eye.z], index.array as Uint32Array);
      index.needsUpdate = true;
      list.push({ mesh: p.translucent, d: g.boundingSphere!.center.distanceToSquared(eye) });
    }
    list.sort((a, b) => b.d - a.d).forEach((e, i) => { e.mesh.renderOrder = 1 + i / Math.max(1, list.length); });
    return true;
  }

  /** Sphere around all geometry (local coordinates). */
  bounds(): THREE.Sphere | null {
    const box = new THREE.Box3();
    for (const p of this.parts.values()) for (const m of [p.solid, p.translucent]) if (m) box.union(m.geometry.boundingBox!);
    return box.isEmpty() ? null : box.getBoundingSphere(new THREE.Sphere());
  }

  pick(raycaster: THREE.Raycaster): Cell | null { return this.pickFace(raycaster)?.cell ?? null; }

  /**
   * Cell under the ray and the axis direction of the face that was hit (EDIT-06: building on faces).
   * Sloped or inset faces (stairs, slabs) are rounded to their dominant axis; a face seen from behind
   * points back towards the viewer.
   */
  pickFace(raycaster: THREE.Raycaster): { cell: Cell; normal: [number, number, number] } | null {
    const meshes: THREE.Object3D[] = [];
    for (const p of this.parts.values()) { if (p.solid) meshes.push(p.solid); if (p.translucent) meshes.push(p.translucent); }
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit || hit.faceIndex == null) return null;
    const section = hit.object.userData.section as MeshSection;
    const layer = hit.object === this.parts.get(section.key)?.solid ? section.solid : section.translucent;
    const cell = section.cells[layer.quadCells[hit.faceIndex >> 1]!];
    if (!cell) return null;
    const n = hit.face?.normal.clone() ?? new THREE.Vector3(0, 1, 0);
    if (n.dot(raycaster.ray.direction) > 0) n.negate();
    const a = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)], axis = a[0]! >= a[1]! && a[0]! >= a[2]! ? 0 : a[1]! >= a[2]! ? 1 : 2;
    const normal: [number, number, number] = [0, 0, 0];
    normal[axis] = (axis === 0 ? n.x : axis === 1 ? n.y : n.z) < 0 ? -1 : 1;
    return { cell, normal };
  }

  private disposePart(p: SectionObject): void {
    for (const m of [p.solid, p.translucent]) if (m) { this.group.remove(m); m.geometry.dispose(); }
  }

  dispose(): void { for (const p of this.parts.values()) this.disposePart(p); this.parts.clear(); this.queue = []; }
}

/**
 * Sun shadow map: an orthographic camera along the sun direction renders the
 * depth of all solid block meshes once per geometry or sun change; the block
 * shader compares against it with a 3×3 filter.
 */
export class SunShadow {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  private target: THREE.WebGLRenderTarget | null = null;
  private size = 0;

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, object: BlockObject, materials: BlockMaterials): boolean {
    const sphere = object.bounds();
    if (!sphere) return false;
    const radius = Math.max(4, sphere.radius + 1);
    const size = radius > 96 && renderer.capabilities.maxTextureSize >= 8192 ? 4096 : 2048;
    if (!this.target || this.size !== size) {
      this.target?.dispose();
      const depth = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
      this.target = new THREE.WebGLRenderTarget(size, size, { depthTexture: depth, depthBuffer: true });
      this.size = size;
    }
    const dir = materials.look.sunDir.value;
    const cam = this.camera;
    cam.left = -radius; cam.right = radius; cam.top = radius; cam.bottom = -radius; cam.near = 0.1; cam.far = radius * 4;
    cam.position.copy(sphere.center).addScaledVector(dir, radius * 2);
    cam.up.set(0, 1, 0); if (Math.abs(dir.y) > 0.99) cam.up.set(0, 0, -1);
    cam.lookAt(sphere.center); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.set(SHADOW_LAYER);
    const before = { override: scene.overrideMaterial, target: renderer.getRenderTarget(), background: scene.background };
    scene.overrideMaterial = materials.depth; scene.background = null;
    renderer.setRenderTarget(this.target);
    renderer.clear(true, true, true);
    renderer.render(scene, cam);
    renderer.setRenderTarget(before.target);
    scene.overrideMaterial = before.override; scene.background = before.background;
    const look = materials.look;
    look.shadowMap.value = this.target.depthTexture;
    look.shadowMatrix.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    look.shadowTexel.value = 1 / size;
    look.normalBias.value = Math.max(0.03, (2 * radius / size) * 1.5);
    return true;
  }

  dispose(): void { this.target?.dispose(); this.target = null; }
}

/**
 * Crosses just above the floor cells where monsters could spawn, as light
 * level overlays in the game draw them: red = also by day, yellow = only at night.
 */
export function spawnOverlay(spawn: SpawnMap, origin: readonly [number, number, number]): THREE.Mesh {
  const n = spawn.count, pos = new Float32Array(n * 24), col = new Float32Array(n * 24), idx = new Uint32Array(n * 12);
  const w = 0.07, a = 0.16, b = 0.84;
  // Two bars from corner to corner, each a thin quad in the X/Z plane.
  const bars = [[[a - w, a + w], [a + w, a - w], [b + w, b - w], [b - w, b + w]], [[a - w, b - w], [a + w, b + w], [b + w, a + w], [b - w, a - w]]];
  for (let i = 0; i < n; i++) {
    const x = spawn.positions[i * 3]! - origin[0], y = spawn.positions[i * 3 + 1]! - origin[1] + 0.02, z = spawn.positions[i * 3 + 2]! - origin[2];
    const c = spawn.when[i] === 1 ? [1, 0.16, 0.12] : [1, 0.86, 0.1];
    bars.forEach((bar, j) => {
      const v0 = i * 8 + j * 4;
      bar.forEach(([u, v], k) => { pos.set([x + u!, y, z + v!], (v0 + k) * 3); col.set(c, (v0 + k) * 3); });
      idx.set([v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3], i * 12 + j * 6);
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.renderOrder = 4;
  return m;
}
