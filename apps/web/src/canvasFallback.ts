import type { Bounds, Cell, Vec3, VoxelPayload } from '../../../packages/voxel/src/index.js';
import type { ViewName } from './viewer/camera';
import { boundsCentre } from './viewer/camera';
type Point = readonly [number,number];
type Poly = { points: Point[]; cell: Cell };
/** Camera of the software view; kept by the caller so rebuilding after an edit keeps the angle. */
export interface FallbackCamera { yaw: number; pitch: number; zoom: number; centre: Vec3 | null; scaleOf: Bounds | null }
export interface FallbackHandle { dispose(): void; setView(view: ViewName): void; focus(bounds: Bounds): void }
const PRESETS: Record<ViewName, readonly [yaw: number, pitch: number]> = {
  iso: [Math.PI/4, 0.55], top: [0, Math.PI/2], north: [Math.PI, 0], east: [Math.PI/2, 0], south: [0, 0], west: [-Math.PI/2, 0],
};
export function newFallbackCamera(): FallbackCamera { return { yaw: Math.PI/4, pitch: 0.55, zoom: 1, centre: null, scaleOf: null }; }
const span = (b: Bounds) => Math.max(1, ...b.maxExclusive.map((n,i)=>n-b.min[i]!));
/**
 * A software isometric view for devices without WebGL; no Minecraft model claim.
 * Only faces towards the viewer whose neighbour is empty are drawn (painter's order).
 */
export function canvasFallback(host: HTMLDivElement, payload: VoxelPayload, cells: readonly Cell[], onSelect: (cell: Cell|null)=>void, colorOf: (cell: Cell)=>string, cam: FallbackCamera = newFallbackCamera()): FallbackHandle {
  const canvas=document.createElement('canvas');host.appendChild(canvas);
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Isometrische Ersatzansicht: ziehen zum Drehen, scrollen zum Zoomen, Block anklicken');
  const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return{dispose(){},setView(){},focus(){}};}
  const context=ctx;let polys:Poly[]=[];
  const b=payload.bounds;
  let width=1,height=1,frame=0;
  const blocks=cells.filter(c=>c.kind==='block');
  const filled=new Set(blocks.map(c=>c.position.join(',')));
  const open=(x:number,y:number,z:number)=>!filled.has(`${x},${y},${z}`);
  const colors=new Map<Cell,string>();
  function shade(color:string,factor:number):string {const n=Number.parseInt(color.slice(1),16);return `rgb(${Math.round((n>>16)*factor)},${Math.round((n>>8&255)*factor)},${Math.round((n&255)*factor)})`;}
  function render(){
    context.clearRect(0,0,width,height);polys=[];
    const centre=cam.centre??boundsCentre(b);const size=span(cam.scaleOf??b);
    const scale=Math.min(width/(size*1.6),height/(size*1.35))*cam.zoom;
    const {yaw,pitch}=cam;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    function project(x:number,y:number,z:number):Point {x-=centre[0];y-=centre[1];z-=centre[2];const depth=sy*x+cy*z;return[width/2+(cy*x-sy*z)*scale,height/2+(sp*depth-cp*y)*scale];}
    function face(vertices: readonly (readonly [number,number,number])[],cell:Cell,color:string){
      const points=vertices.map(v=>project(...v));context.beginPath();points.forEach((p,i)=>{if(i===0)context.moveTo(...p);else context.lineTo(...p);});context.closePath();context.fillStyle=color;context.fill();context.strokeStyle='#132a3450';context.lineWidth=0.5;context.stroke();polys.push({points,cell});
    }
    context.strokeStyle='#719c9d18';context.lineWidth=0.6;
    for(let i=-1;i<=16;i++){const n=i/16;const x=b.min[0]+n*(b.maxExclusive[0]-b.min[0]);const z=b.min[2]+n*(b.maxExclusive[2]-b.min[2]);
      for(const [a,c] of [[project(x,b.min[1]-0.1,b.min[2]),project(x,b.min[1]-0.1,b.maxExclusive[2])],[project(b.min[0],b.min[1]-0.1,z),project(b.maxExclusive[0],b.min[1]-0.1,z)]]){context.beginPath();context.moveTo(...a!);context.lineTo(...c!);context.stroke();}}
    const sorted=[...blocks].sort((a,b)=>(sy*(a.position[0]-b.position[0])+cy*(a.position[2]-b.position[2]))*cp+(a.position[1]-b.position[1])*sp);
    const side=Math.abs(cp)>1e-3, top=sp>1e-3;
    for(const cell of sorted){
      const [x,y,z]=cell.position;const r=1;
      let color=colors.get(cell);if(!color){color=colorOf(cell);colors.set(cell,color);}
      if(side&&Math.abs(sy)>1e-3){
        if(sy>0){if(open(x+1,y,z))face([[x+r,y,z],[x+r,y,z+r],[x+r,y+r,z+r],[x+r,y+r,z]],cell,shade(color,0.74));}
        else if(open(x-1,y,z))face([[x,y,z+r],[x,y,z],[x,y+r,z],[x,y+r,z+r]],cell,shade(color,0.74));
      }
      if(side&&Math.abs(cy)>1e-3){
        if(cy>0){if(open(x,y,z+1))face([[x,y,z+r],[x+r,y,z+r],[x+r,y+r,z+r],[x,y+r,z+r]],cell,shade(color,0.88));}
        else if(open(x,y,z-1))face([[x+r,y,z],[x,y,z],[x,y+r,z],[x+r,y+r,z]],cell,shade(color,0.88));
      }
      if(top&&open(x,y+1,z))face([[x,y+r,z],[x+r,y+r,z],[x+r,y+r,z+r],[x,y+r,z+r]],cell,color);
    }
    canvas.dataset.faces=String(polys.length);
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(render);}
  const observer=new ResizeObserver(()=>{const rect=host.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);schedule();});observer.observe(host);
  let start:Point=[0,0],last:Point=[0,0],dragging=false;
  const down=(e:PointerEvent)=>{start=[e.clientX,e.clientY];last=start;dragging=true;canvas.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{if(!dragging)return;cam.yaw+=(e.clientX-last[0])*0.008;cam.pitch=Math.max(0,Math.min(Math.PI/2,cam.pitch+(e.clientY-last[1])*0.006));last=[e.clientX,e.clientY];schedule();};
  const up=(e:PointerEvent)=>{dragging=false;if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
    const rect=canvas.getBoundingClientRect();const px=e.clientX-rect.left,py=e.clientY-rect.top;
    const inside=(points:Point[])=>{let result=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i]!,b=points[j]!;if(((a[1]>py)!==(b[1]>py))&&(px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0]))result=!result;}return result;};
    onSelect([...polys].reverse().find(p=>inside(p.points))?.cell??null);
  };
  const wheel=(e:WheelEvent)=>{e.preventDefault();cam.zoom=Math.max(0.2,Math.min(20,cam.zoom*Math.exp(-e.deltaY*0.001)));schedule();};
  const cancel=()=>{dragging=false;};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});
  return {
    dispose(){cancelAnimationFrame(frame);observer.disconnect();canvas.remove();},
    setView(view){[cam.yaw,cam.pitch]=PRESETS[view];cam.zoom=1;cam.centre=null;cam.scaleOf=null;schedule();},
    focus(bounds){cam.centre=boundsCentre(bounds);cam.scaleOf=bounds;cam.zoom=1;schedule();},
  };
}
