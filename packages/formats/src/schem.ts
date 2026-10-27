import { createPayload, stateKey } from '../../voxel/src/validation.js';
import type { NbtTag, BlockState, Cell, Vec3, VoxelPayload, BlockEntity } from '../../voxel/src/types.js';
import { FormatError, readNbt, NBT_LIMITS } from './nbt.js';
export interface SchemLimits {maxCompressedBytes:number;maxUncompressedBytes:number;maxVolume:number;maxDimension:number;maxPalette:number;maxDepth:number;maxNodes:number;maxDurationMs:number}
export const SCHEM_LIMITS: Readonly<SchemLimits>=Object.freeze({maxCompressedBytes:2_000_000,maxUncompressedBytes:8_000_000,maxVolume:20_000,maxDimension:256,maxPalette:20_000,maxDepth:32,maxNodes:200_000,maxDurationMs:5_000});
export interface SchemResult {payload:VoxelPayload;dataVersion:number;offset:Vec3;sourceSha256:string;sourceNbt:{name:string;tag:NbtTag};warnings:string[]}
function fail(message:string):never{throw new FormatError('SCHEM',message);}
function compound(tag:NbtTag|undefined,path:string):Readonly<Record<string,NbtTag>>{if(tag?.type!=='compound')fail(`${path}: NBT-Compound fehlt.`);return tag.value;}
function int(tag:NbtTag|undefined,path:string):number{if(tag?.type!=='int')fail(`${path}: NBT-Int fehlt.`);return tag.value;}
function vector(tag:NbtTag|undefined,path:string):Vec3{if(tag?.type!=='intArray'||tag.value.length!==3)fail(`${path}: genau drei NBT-Ints erwartet.`);return tag.value as unknown as Vec3;}
function list(tag:NbtTag|undefined,path:string):readonly NbtTag[]{if(tag?.type!=='list'||(tag.elementType!=='compound'&&tag.value.length!==0))fail(`${path}: Compound-Liste erwartet.`);return tag.value;}
function namespaced(id:string):string{const result=id.includes(':')?id:`minecraft:${id}`;if(!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(result))fail(`Ungültige Block-/Entity-ID: ${id}`);return result;}
export function parseBlockState(text:string):BlockState{
  const match=/^([^\[\]]+)(?:\[([^\[\]]*)\])?$/.exec(text);if(!match)fail(`Ungültiger Blockzustand: ${text}`);
  const id=namespaced(match[1]!);const properties:Record<string,string>=Object.create(null);
  if(match[2])for(const pair of match[2].split(',')){const parts=pair.split('=');if(parts.length!==2||!parts[0]||!parts[1]||/[\s,\[\]]/.test(pair))fail(`Ungültige Property: ${pair}`);if(Object.hasOwn(properties,parts[0]))fail(`Doppelte Property: ${parts[0]}`);properties[parts[0]]=parts[1];}
  return{id,properties};
}
/** Pure schema adapter, independently testable without compression or browser UI. */
export function normalizeSchem(sourceNbt:{name:string;tag:NbtTag},options:Partial<SchemLimits>={}):Omit<SchemResult,'sourceSha256'> {
  const limits={...SCHEM_LIMITS,...options};
  for(const [key,value] of Object.entries(limits))if(!Number.isSafeInteger(value)||value<1)throw new FormatError('LIMIT',`Ungültiges Limit: ${key}`);
  const root=compound(sourceNbt.tag,'Root');const s=compound(root.Schematic,'Root.Schematic');
  if(int(s.Version,'Version')!==3)fail('Unterstützt wird ausschließlich Sponge Schematic Version 3.');
  const dataVersion=int(s.DataVersion,'DataVersion');if(dataVersion<0)fail('DataVersion darf nicht negativ sein.');
  const dimensions=['Width','Height','Length'].map(key=>{const t=s[key];if(t?.type!=='short')fail(`${key}: NBT-Short fehlt.`);const n=t.value&0xffff;if(n<1||n>limits.maxDimension)fail(`${key}: erlaubter Bereich 1–${limits.maxDimension}.`);return n;});
  const [width,height,length]=dimensions as [number,number,number];const volume=width*height*length;if(volume>limits.maxVolume)throw new FormatError('LIMIT',`Bauvolumen überschreitet ${limits.maxVolume} Zellen.`);
  const offset=s.Offset?vector(s.Offset,'Offset'):[0,0,0] as const;
  const blocks=compound(s.Blocks,'Blocks');const inputPalette=compound(blocks.Palette,'Blocks.Palette');
  const entries=Object.entries(inputPalette);if(entries.length<1||entries.length>limits.maxPalette)fail('Blockpalette fehlt oder ist zu groß.');
  const palette:BlockState[]=[];const byState=new Map<string,number>();const remap=new Map<number,number>();
  for(const [text,t] of entries){const index=int(t,`Palette.${text}`);if(index<0||remap.has(index))fail('Negative oder doppelte Paletten-ID.');
    const state=parseBlockState(text);const key=stateKey(state);let canonical=byState.get(key);if(canonical===undefined){canonical=palette.length;palette.push(state);byState.set(key,canonical);}remap.set(index,canonical);
  }
  if(blocks.Data?.type!=='byteArray')fail('Blocks.Data: NBT-ByteArray fehlt.');const bytes=blocks.Data.value;let pos=0;
  const cells:Cell[]=[];
  for(let n=0;n<volume;n++){
    let value=0,shift=0,done=false;
    for(let i=0;i<5;i++){if(pos>=bytes.length)fail('Blockdaten enden vor dem erwarteten Volumen.');const b=bytes[pos++]!&255;if(i===4&&(b&0xf8)!==0)fail('VarInt überschreitet nichtnegativen int32-Bereich.');value+=(b&127)*2**shift;if((b&128)===0){done=true;break;}shift+=7;}
    if(!done)fail('Block-VarInt länger als fünf Bytes.');const paletteIndex=remap.get(value);if(paletteIndex===undefined)fail(`Block referenziert unbekannte Paletten-ID ${value}.`);
    const id=palette[paletteIndex]!.id;const kind=['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(id)?'air':'block';
    cells.push({position:[n%width,Math.floor(n/(width*length)),Math.floor(n/width)%length],kind,paletteIndex});
  }
  if(pos!==bytes.length)fail('Überzählige Blockdaten hinter dem erwarteten Volumen.');
  const blockEntities:BlockEntity[]=[];
  if(blocks.BlockEntities)for(const t of list(blocks.BlockEntities,'Blocks.BlockEntities')){
    const be=compound(t,'BlockEntity');const position=vector(be.Pos,'BlockEntity.Pos');if(be.Id?.type!=='string')fail('BlockEntity.Id fehlt.');namespaced(be.Id.value);if(be.Data)compound(be.Data,'BlockEntity.Data');
    // Preserve the complete Schem entry, including Id, Pos, Data and unknown fields.
    blockEntities.push({position,data:t});
  }
  const warnings=['Vorschau in lokalen Koordinaten; Offset und vollständige Quelldaten bleiben separat erhalten.','DataVersion ist aus der Datei gelesen; Registry-/Modpack-Kompatibilität ist nicht geprüft.','Farbige Würfel sind eine vereinfachte Vorschau, keine exakten Minecraft-Blockmodelle.'];
  if(s.Biomes){compound(s.Biomes,'Biomes');warnings.push('Biomdaten sind im Original/NBT erhalten, werden aber nicht dargestellt.');}
  if(s.Entities){const entities=list(s.Entities,'Entities');if(entities.length)warnings.push(`${entities.length} freie Entities sind im Original/NBT erhalten, werden aber nicht dargestellt.`);}
  if(palette.some(p=>!p.id.startsWith('minecraft:')))warnings.push('Modblöcke gefunden: IDs/Properties bleiben erhalten, Registry unbekannt.');
  const knownRoot=['Schematic'];const knownSchem=['Version','DataVersion','Metadata','Width','Height','Length','Offset','Blocks','Biomes','Entities'];const knownBlocks=['Palette','Data','BlockEntities'];
  if(Object.keys(root).some(k=>!knownRoot.includes(k))||Object.keys(s).some(k=>!knownSchem.includes(k))||Object.keys(blocks).some(k=>!knownBlocks.includes(k)))warnings.push('Zusätzliche Formatfelder sind im Original/NBT erhalten, nicht in der Blockvorschau.');
  if(s.Metadata)compound(s.Metadata,'Metadata');
  const payload=createPayload({schemaVersion:1,profileId:`java:dataversion-${dataVersion}:registry-unverified`,bounds:{min:[0,0,0],maxExclusive:[width,height,length]},pivot:[0,0,0],sourceOrigin:offset,palette,cells,blockEntities},{maxCells:limits.maxVolume,maxVolume:limits.maxVolume,maxPalette:limits.maxPalette,maxNbtDepth:limits.maxDepth,maxNbtNodes:limits.maxNodes});
  return {payload,dataVersion,offset,sourceNbt,warnings};
}
export async function importSchemV3(buffer:ArrayBuffer,options:Partial<SchemLimits>={}):Promise<SchemResult>{
  const limits={...SCHEM_LIMITS,...options};for(const [key,v] of Object.entries(limits))if(!Number.isSafeInteger(v)||v<1)throw new FormatError('LIMIT',`Ungültiges Limit: ${key}`);
  if(buffer.byteLength>limits.maxCompressedBytes)throw new FormatError('LIMIT','Komprimierte Datei überschreitet das Größenlimit.');
  const input=new Uint8Array(buffer);if(input[0]!==31||input[1]!==139)throw new FormatError('GZIP','Sponge Schem v3 muss GZip-komprimiertes NBT enthalten.');
  const start=performance.now();const reader=new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks:Uint8Array[]=[];let total=0;let timer:ReturnType<typeof setTimeout>|undefined;
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new FormatError('TIMEOUT','Zeitbudget beim Entpacken überschritten.')),limits.maxDurationMs);});
  try{
    while(true){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;total+=value.byteLength;if(total>limits.maxUncompressedBytes)throw new FormatError('LIMIT','Entpackte Datei überschreitet das Größenlimit.');chunks.push(value);}
  }catch(e){if(e instanceof FormatError)throw e;throw new FormatError('GZIP','GZip-Datei ist beschädigt oder unvollständig.');}
  finally{clearTimeout(timer);void reader.cancel().catch(()=>{});}
  const raw=new Uint8Array(total);let p=0;for(const chunk of chunks){raw.set(chunk,p);p+=chunk.byteLength;}
  const remaining=limits.maxDurationMs-(performance.now()-start);if(remaining<1)throw new FormatError('TIMEOUT','Zeitbudget überschritten.');
  const sourceNbt=readNbt(raw,{...NBT_LIMITS,maxBytes:limits.maxUncompressedBytes,maxDepth:limits.maxDepth,maxNodes:limits.maxNodes,maxDurationMs:Math.max(1,Math.floor(remaining))});
  const result=normalizeSchem(sourceNbt,limits);if(performance.now()-start>limits.maxDurationMs)throw new FormatError('TIMEOUT','Zeitbudget überschritten.');
  const digest=await crypto.subtle.digest('SHA-256',buffer);const sourceSha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return {...result,sourceSha256};
}
