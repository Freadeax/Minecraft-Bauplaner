import * as THREE from 'three';
import type { Cell } from '../../../../packages/voxel/src/index.js';
import type { RenderKit } from './assets.ts';
import type { BlockMesh, MeshLayer } from './mesh.ts';

/**
 * three.js side of the block mesh, shared by the 3D viewer and the still
 * images: atlas texture with nearest sampling, cutout alpha test for leaves
 * and plants, a translucent pass for glass and water, Minecraft-style fixed
 * face brightness from the vertex colours, mark colours, and – for the plain
 * look without textures – faint block edges.
 */
const VERTEX = /* glsl */`
attribute vec3 aColor;
attribute vec4 aMark;
varying vec2 vUv;
varying vec3 vColor;
varying vec4 vMark;
varying vec3 vPos;
void main() {
  vUv = uv; vColor = aColor; vMark = aMark; vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAGMENT = /* glsl */`
uniform sampler2D map;
uniform float alphaTest;
uniform float edges;
uniform float translucent;
varying vec2 vUv;
varying vec3 vColor;
varying vec4 vMark;
varying vec3 vPos;
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < alphaTest) discard;
  vec3 c = tex.rgb * vColor;
  if (edges > 0.5) {
    vec3 n = abs(normalize(cross(dFdx(vPos), dFdy(vPos))));
    vec3 e = min(fract(vPos), 1.0 - fract(vPos)) + step(0.5, n);
    float line = 1.0 - smoothstep(0.0, 0.035, min(min(e.x, e.y), e.z));
    c *= 1.0 - 0.3 * line;
  }
  c = mix(c, vMark.rgb, vMark.a);
  // Plain look: colour sprites are opaque, so translucent blocks get a fixed alpha.
  gl_FragColor = vec4(c, translucent > 0.5 ? (edges > 0.5 ? 0.55 : tex.a) : 1.0);
}`;

export interface BlockMaterials {
  readonly solid: THREE.ShaderMaterial;
  readonly translucent: THREE.ShaderMaterial;
  readonly texture: THREE.Texture;
  readonly key: string;
  dispose(): void;
}

export function blockMaterials(kit: RenderKit): BlockMaterials {
  const texture = new THREE.CanvasTexture(kit.atlas.canvas);
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace; texture.flipY = false; texture.needsUpdate = true;
  const make = (translucent: boolean) => new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT,
    uniforms: { map: { value: texture }, alphaTest: { value: translucent ? 0.02 : 0.5 }, edges: { value: kit.textured ? 0 : 1 }, translucent: { value: translucent ? 1 : 0 } },
    transparent: translucent, depthWrite: !translucent,
  });
  const solid = make(false), translucent = make(true);
  return { solid, translucent, texture, key: kit.key, dispose() { solid.dispose(); translucent.dispose(); texture.dispose(); } };
}

function geometry(layer: MeshLayer): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(layer.positions, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(layer.uvs, 2));
  g.setAttribute('aColor', new THREE.BufferAttribute(layer.colors, 3));
  g.setAttribute('aMark', new THREE.BufferAttribute(layer.marks, 4));
  g.setIndex(new THREE.BufferAttribute(layer.indices, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

/** Both passes of a block mesh as one object; `pick` maps a ray hit back to its cell. */
export class BlockObject {
  readonly group = new THREE.Group();
  private readonly solid: THREE.Mesh;
  private readonly translucent: THREE.Mesh;
  private readonly mesh: BlockMesh;
  private readonly cells: readonly Cell[];

  constructor(mesh: BlockMesh, cells: readonly Cell[], materials: BlockMaterials) {
    this.mesh = mesh; this.cells = cells;
    this.solid = new THREE.Mesh(geometry(mesh.solid), materials.solid);
    this.translucent = new THREE.Mesh(geometry(mesh.translucent), materials.translucent);
    this.translucent.renderOrder = 1;
    this.group.add(this.solid, this.translucent);
  }

  setMaterials(materials: BlockMaterials): void { this.solid.material = materials.solid; this.translucent.material = materials.translucent; }

  pick(raycaster: THREE.Raycaster): Cell | null {
    const hits = raycaster.intersectObjects([this.solid, this.translucent], false);
    const hit = hits[0];
    if (!hit || hit.faceIndex == null) return null;
    const layer = hit.object === this.solid ? this.mesh.solid : this.mesh.translucent;
    return this.cells[layer.quadCells[hit.faceIndex >> 1]!] ?? null;
  }

  dispose(): void { this.solid.geometry.dispose(); this.translucent.geometry.dispose(); }
}
