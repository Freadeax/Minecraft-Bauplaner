import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Cell, VoxelPayload } from '../../../packages/voxel/src/index.js';
export const blockColors = ['#c7d4d5','#b58452','#895e39','#7cc3b4','#8e9ca9'];
export function Viewer({payload, cells, onSelect}: {payload: VoxelPayload; cells: readonly Cell[]; onSelect: (cell: Cell | null)=>void}) {
  const host=useRef<HTMLDivElement>(null);
  const saved=useRef<{position:THREE.Vector3;target:THREE.Vector3}|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const el=host.current; if(!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); }
    catch { setError('Die 3D-Ansicht benötigt WebGL. Schichten und Blockmengen kannst du weiterhin prüfen.'); return; }
    setError('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setClearColor(0x000000,0);
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','3D-Bauwerk: Ziehen zum Drehen, Scrollen zum Zoomen, Block anklicken für Koordinaten');
    renderer.domElement.setAttribute('role','img');
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(38,1,0.1,15000);
    const b=payload.bounds;
    const centre=new THREE.Vector3((b.min[0]+b.maxExclusive[0])/2,(b.min[1]+b.maxExclusive[1])/2,(b.min[2]+b.maxExclusive[2])/2);
    const size=Math.max(...b.maxExclusive.map((n,i)=>n-b.min[i]!));
    camera.position.copy(saved.current?.position??new THREE.Vector3(size*1.7,size*1.25,size*1.9));
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.target.copy(saved.current?.target??new THREE.Vector3()); controls.enableDamping=true; controls.update();
    controls.minDistance=1; controls.maxDistance=Math.max(100,size*10);
    scene.add(new THREE.HemisphereLight(0xdff7ff,0x665a47,2.7));
    const sun=new THREE.DirectionalLight(0xffefdb,3.4);sun.position.set(-20,40,25);scene.add(sun);
    const grid=new THREE.GridHelper(Math.max(30,size*2),Math.min(100,Math.max(30,size*2)),0x47766f,0x29444d);
    grid.position.set(0,b.min[1]-centre.y-0.06,0);scene.add(grid);
    const geometry=new THREE.BoxGeometry(0.97,0.97,0.97);
    const groups=new Map<number, Cell[]>();
    for(const cell of cells) if(cell.kind==='block') { const group=groups.get(cell.paletteIndex)??[];group.push(cell);groups.set(cell.paletteIndex,group); }
    const meshes:THREE.InstancedMesh[]=[];const materials:THREE.MeshStandardMaterial[]=[];
    const map=new Map<THREE.Object3D,Cell[]>();const dummy=new THREE.Object3D();
    for(const [index,list] of groups) {
      const material=new THREE.MeshStandardMaterial({color:blockColors[index%blockColors.length]!,roughness:0.85,metalness:0.05});
      materials.push(material);
      const mesh=new THREE.InstancedMesh(geometry,material,list.length);
      list.forEach((cell,i)=>{ dummy.position.set(cell.position[0]+0.5-centre.x,cell.position[1]+0.5-centre.y,cell.position[2]+0.5-centre.z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix); });
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh);meshes.push(mesh);map.set(mesh,list);
    }
    const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let down=[0,0];
    const pointerDown=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};
    const pointerUp=(e:PointerEvent)=>{
      if(Math.hypot(e.clientX-down[0]!,e.clientY-down[1]!)>5)return;
      const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(meshes)[0];
      onSelect(hit&&hit.instanceId!==undefined?map.get(hit.object)?.[hit.instanceId]??null:null);
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
    const resize=new ResizeObserver(()=>{const {width,height}=el.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();});resize.observe(el);
    let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
    const lost=(e:Event)=>{e.preventDefault();setError('Die Grafikverbindung wurde unterbrochen. Bitte die Seite neu laden.');};renderer.domElement.addEventListener('webglcontextlost',lost);
    return()=>{saved.current={position:camera.position.clone(),target:controls.target.clone()};cancelAnimationFrame(frame);resize.disconnect();controls.dispose();geometry.dispose();materials.forEach(m=>m.dispose());grid.geometry.dispose();(grid.material as THREE.Material).dispose();renderer.dispose();renderer.domElement.remove();};
  },[payload,cells,onSelect]);
  return <div className="scene" ref={host}>{error&&<div className="graphics-error" role="alert">{error}</div>}</div>;
}
