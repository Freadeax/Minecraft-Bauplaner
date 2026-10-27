import { createPayload, countBlocks } from '../../../packages/voxel/src/index.js';
import { importSchemV3, FormatError } from '../../../packages/formats/src/index.js';
self.onmessage = async (event: MessageEvent<{jobId:number;buffer:ArrayBuffer;name:string}>) => {
  const {jobId,buffer,name}=event.data;
  try{
    if(buffer.byteLength>2_000_000)throw new Error('Die Datei ist zu groß (maximal 2 MB).');
    const bytes=new Uint8Array(buffer);
    if(bytes[0]===31&&bytes[1]===139){
      const report=await importSchemV3(buffer);
      self.postMessage({jobId,payload:report.payload,format:'schem',report,counts:countBlocks(report.payload)});
      return;
    }
    if(!name.toLowerCase().endsWith('.json'))throw new Error('Erwartet GZip-komprimiertes Sponge Schem v3 oder Voxel-JSON. Litematic und alte Schematic-Versionen werden noch nicht unterstützt.');
    const payload=createPayload(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),{maxCells:20_000,maxNbtNodes:50_000,maxNbtDepth:32,maxStringLength:100_000});
    if(payload.bounds.maxExclusive.some((n,i)=>n-payload.bounds.min[i]!>256))throw new Error('Die Vorschau unterstützt höchstens 256 Blöcke pro Achse.');
    self.postMessage({jobId,payload,format:'json',counts:countBlocks(payload)});
  }catch(error){self.postMessage({jobId,error:error instanceof Error?error.message:'Datei konnte nicht gelesen werden.',code:error instanceof FormatError?error.code:'IMPORT'});}
};
