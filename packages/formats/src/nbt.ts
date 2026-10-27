import type { NbtTag, NbtType } from '../../voxel/src/types.js';
export interface NbtLimits { maxBytes:number; maxDepth:number; maxNodes:number; maxDurationMs:number }
export const NBT_LIMITS: Readonly<NbtLimits> = Object.freeze({maxBytes:8_000_000,maxDepth:32,maxNodes:200_000,maxDurationMs:5_000});
export class FormatError extends Error { constructor(readonly code:string,message:string){super(message);this.name='FormatError';} }
const types: readonly NbtType[]=['byte','short','int','long','float','double','byteArray','string','list','compound','intArray','longArray'];
export function nbtLimits(options:Partial<NbtLimits>):NbtLimits {
  const limits={...NBT_LIMITS,...options};
  for(const [key,v] of Object.entries(limits))if(!Number.isSafeInteger(v)||v<1)throw new FormatError('LIMIT',`Ungültiges Limit: ${key}`);
  return limits;
}
/** Big-endian Java NBT. Separate from gzip and Schematic schema validation. */
export function readNbt(bytes:Uint8Array,options:Partial<NbtLimits>={}):{name:string;tag:NbtTag} {
  const limits=nbtLimits(options);if(bytes.byteLength>limits.maxBytes)throw new FormatError('LIMIT','Entpackte NBT-Datei überschreitet das Größenlimit.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let pos=0,nodes=0,checks=0;
  const deadline=performance.now()+limits.maxDurationMs;
  function fail(code:string,message:string):never{throw new FormatError(code,`NBT bei Byte ${pos}: ${message}`);}
  function tick(){if(++checks%128===0&&performance.now()>deadline)fail('TIMEOUT','Zeitbudget überschritten.');}
  function need(n:number){tick();if(n<0||n>bytes.length-pos)fail('TRUNCATED','Datei endet unerwartet.');}
  function spend(n:number){nodes+=n;if(nodes>limits.maxNodes)fail('LIMIT','Knoten-/Arraylimit überschritten.');}
  function u8(){need(1);return view.getUint8(pos++);}
  function i16(){need(2);const n=view.getInt16(pos);pos+=2;return n;}
  function u16(){need(2);const n=view.getUint16(pos);pos+=2;return n;}
  function i32(){need(4);const n=view.getInt32(pos);pos+=4;return n;}
  function long(){need(8);const n=view.getBigInt64(pos);pos+=8;return n.toString();}
  function string(){
    const length=u16();need(length);const end=pos+length;let result='';
    while(pos<end){const a=u8();let unit:number;
      if(a<128)unit=a;
      else if((a&224)===192){if(pos>=end)fail('STRING','Unvollständiges Modified-UTF-8.');const b=u8();if((b&192)!==128)fail('STRING','Ungültiges Modified-UTF-8.');unit=((a&31)<<6)|(b&63);if(unit!==0&&unit<128)fail('STRING','Überlange Zeichenkodierung.');}
      else if((a&240)===224){if(end-pos<2)fail('STRING','Unvollständiges Modified-UTF-8.');const b=u8(),c=u8();if((b&192)!==128||(c&192)!==128)fail('STRING','Ungültiges Modified-UTF-8.');unit=((a&15)<<12)|((b&63)<<6)|(c&63);if(unit<2048)fail('STRING','Überlange Zeichenkodierung.');}
      else fail('STRING','Erwartet Java Modified-UTF-8 (keine 4-Byte-UTF-8-Sequenz).');
      result+=String.fromCharCode(unit);
    }return result;
  }
  function length(){const n=i32();if(n<0)fail('LENGTH','Negative Array-/Listenlänge.');spend(n);return n;}
  function tag(type:number,depth:number):NbtTag {
    tick();spend(1);if(depth>limits.maxDepth)fail('LIMIT','NBT-Tiefenlimit überschritten.');
    switch(type){
      case 1:{const v=u8();return{type:'byte',value:v>=128?v-256:v};}
      case 2:return{type:'short',value:i16()};
      case 3:return{type:'int',value:i32()};
      case 4:return{type:'long',value:long()};
      case 5:case 6:{const n=type===5?4:8;need(n);const value=type===5?view.getFloat32(pos):view.getFloat64(pos);pos+=n;if(!Number.isFinite(value)||Object.is(value,-0))fail('NUMBER','NBT-Gleitkommawert ist im JSON-Vertrag nicht verlustfrei darstellbar.');return{type:type===5?'float':'double',value};}
      case 7:{const n=length();need(n);const value=Array.from(bytes.subarray(pos,pos+n),v=>v>=128?v-256:v);pos+=n;return{type:'byteArray',value};}
      case 8:return{type:'string',value:string()};
      case 9:{const element=u8(),n=length();if(element>12||(element===0&&n!==0))fail('TYPE','Ungültiger NBT-Listentyp.');const value:NbtTag[]=[];for(let i=0;i<n;i++)value.push(tag(element,depth+1));return{type:'list',elementType:element===0?'end':types[element-1]!,value};}
      case 10:{const value:Record<string,NbtTag>=Object.create(null);while(true){const t=u8();if(t===0)break;if(t>12)fail('TYPE','Unbekannter NBT-Typ.');const name=string();if(Object.hasOwn(value,name))fail('DUPLICATE',`Doppelter Compound-Schlüssel: ${name}`);value[name]=tag(t,depth+1);}return{type:'compound',value};}
      case 11:{const n=length();need(n*4);const value:number[]=[];for(let i=0;i<n;i++)value.push(i32());return{type:'intArray',value};}
      case 12:{const n=length();need(n*8);const value:string[]=[];for(let i=0;i<n;i++)value.push(long());return{type:'longArray',value};}
      default:return fail('TYPE','Unbekannter NBT-Typ.');
    }
  }
  if(u8()!==10)fail('ROOT','NBT-Wurzel muss ein Compound sein.');const name=string();const result=tag(10,0);
  if(pos!==bytes.length)fail('TRAILING','Zusätzliche Daten hinter der NBT-Wurzel.');
  if(performance.now()>deadline)fail('TIMEOUT','Zeitbudget überschritten.');
  return {name,tag:result};
}
