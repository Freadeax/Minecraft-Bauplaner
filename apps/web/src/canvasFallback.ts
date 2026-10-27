import type { Cell, VoxelPayload } from '../../../packages/voxel/src/index.js';
import { blockColors } from './colors';
type Point = readonly [number,number];
type Poly = { points: Point[]; cell: Cell; color: string };
/** A software isometric view for devices without WebGL; no Minecraft model claim. */
export function canvasFallback(host: HTMLDivElement, payload: VoxelPayload, cells: readonly Cell[], onSelect: (cell: Cell|null)=>void): ()=>void {
  const canvas=document.createElement('canvas');host.appendChild(canvas);
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Isometrische Ersatzansicht: ziehen zum Drehen, scrollen zum Zoomen, Block anklicken');
  const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return()=>{};}
  const context=ctx;let yaw=Math.PI/4,pitch=0.55,zoom=1,polys:Poly[]=[];
  const b=payload.bounds;const centre=b.min.map((n,i)=>(n+b.maxExclusive[i]!)/2);
  const size=Math.max(...b.maxExclusive.map((n,i)=>n-b.min[i]!));
  let width=1,height=1,frame=0;
  const blocks=cells.filter(c=>c.kind==='block');
  function shade(color:string,factor:number):string {const n=Number.parseInt(color.slice(1),16);return `rgb(${Math.round((n>>16)*factor)},${Math.round((n>>8&255)*factor)},${Math.round((n&255)*factor)})`;}
  function render(){
    context.clearRect(0,0,width,height);polys=[];
    const scale=Math.min(width/(size*1.6),height/(size*1.35))*zoom;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    function project(x:number,y:number,z:number):Point {x-=centre[0]!;y-=centre[1]!;z-=centre[2]!;const depth=sy*x+cy*z;return[width/2+(cy*x-sy*z)*scale,height/2+(sp*depth-cp*y)*scale];}
    function face(vertices: readonly (readonly [number,number,number])[],cell:Cell,color:string){
      const points=vertices.map(v=>project(...v));context.beginPath();points.forEach((p,i)=>{if(i===0)context.moveTo(...p);else context.lineTo(...p);});context.closePath();context.fillStyle=color;context.fill();context.strokeStyle='#132a3450';context.lineWidth=0.5;context.stroke();polys.push({points,cell,color});
    }
    context.strokeStyle='#719c9d18';context.lineWidth=0.6;
    for(let i=-1;i<=16;i++){const n=i/16;const x=b.min[0]+n*(b.maxExclusive[0]-b.min[0]);const z=b.min[2]+n*(b.maxExclusive[2]-b.min[2]);
      for(const [a,c] of [[project(x,b.min[1]-0.1,b.min[2]),project(x,b.min[1]-0.1,b.maxExclusive[2])],[project(b.min[0],b.min[1]-0.1,z),project(b.maxExclusive[0],b.min[1]-0.1,z)]]){context.beginPath();context.moveTo(...a!);context.lineTo(...c!);context.stroke();}}
    const sorted=[...blocks].sort((a,b)=>(sy*(a.position[0]-b.position[0])+cy*(a.position[2]-b.position[2]))*cp+(a.position[1]-b.position[1])*sp);
    for(const cell of sorted){
      if(cell.kind!=='block')continue;
      const [x,y,z]=cell.position;const r=0.97;
      const color=blockColors[cell.paletteIndex%blockColors.length]!;
      if(sy>=0)face([[x+r,y,z],[x+r,y,z+r],[x+r,y+r,z+r],[x+r,y+r,z]],cell,shade(color,0.74));
      else face([[x,y,z+r],[x,y,z],[x,y+r,z],[x,y+r,z+r]],cell,shade(color,0.74));
      if(cy>=0)face([[x,y,z+r],[x+r,y,z+r],[x+r,y+r,z+r],[x,y+r,z+r]],cell,shade(color,0.88));
      else face([[x+r,y,z],[x,y,z],[x,y+r,z],[x+r,y+r,z]],cell,shade(color,0.88));
      face([[x,y+r,z],[x+r,y+r,z],[x+r,y+r,z+r],[x,y+r,z+r]],cell,color);
    }
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(render);}
  const observer=new ResizeObserver(()=>{const rect=host.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);schedule();});observer.observe(host);
  let start:Point=[0,0],last:Point=[0,0],dragging=false;
  const down=(e:PointerEvent)=>{start=[e.clientX,e.clientY];last=start;dragging=true;canvas.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{if(!dragging)return;yaw+=(e.clientX-last[0])*0.008;pitch=Math.max(0.15,Math.min(1.25,pitch+(e.clientY-last[1])*0.006));last=[e.clientX,e.clientY];schedule();};
  const up=(e:PointerEvent)=>{dragging=false;if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
    const rect=canvas.getBoundingClientRect();const px=e.clientX-rect.left,py=e.clientY-rect.top;
    const inside=(points:Point[])=>{let result=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i]!,b=points[j]!;if(((a[1]>py)!==(b[1]>py))&&(px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0]))result=!result;}return result;};
    onSelect([...polys].reverse().find(p=>inside(p.points))?.cell??null);
  };
  const wheel=(e:WheelEvent)=>{e.preventDefault();zoom=Math.max(0.4,Math.min(4,zoom*Math.exp(-e.deltaY*0.001)));schedule();};
  const cancel=()=>{dragging=false;};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});
  return()=>{cancelAnimationFrame(frame);observer.disconnect();canvas.remove();};
}
