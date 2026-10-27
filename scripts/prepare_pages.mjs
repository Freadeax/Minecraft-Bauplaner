import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
const root=path.resolve('dist-web');
await writeFile(path.join(root,'.nojekyll'),'');
const runtimePackages=['react','react-dom','three'];
const notices=[];
for(const name of runtimePackages){
 const pkg=JSON.parse(await readFile(path.join('node_modules',name,'package.json'),'utf8'));
 let license;
 for(const filename of ['LICENSE','LICENSE.md']){try{license=await readFile(path.join('node_modules',name,filename),'utf8');break;}catch{}}
 if(!license)throw new Error(`Lizenz fehlt: ${name}`);
 notices.push(`${name} ${pkg.version}\n${license}`);
}
await writeFile(path.join(root,'THIRD_PARTY_NOTICES.txt'),notices.join('\n\n---\n\n'));
await mkdir(path.join(root,'examples'),{recursive:true});
const fixtureHex=(await readFile('fixtures/schem/asymmetric.nbt.hex','utf8')).replace(/\s/g,'');
await writeFile(path.join(root,'examples/contract-v3.schem'),gzipSync(Buffer.from(fixtureHex,'hex')));
const files=[];
async function walk(dir){
  for(const item of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const full=path.join(dir,item.name);const relative=path.relative(root,full).split(path.sep).join('/');
    if(item.isSymbolicLink())throw new Error(`Symlink nicht erlaubt: ${relative}`);
    if(item.isDirectory())await walk(full);
    else if(relative!=='deployment.json'){const data=await readFile(full);files.push({path:relative,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
  }
}
await walk(root);
const sha=process.env.LMNT_SOURCE_SHA??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Ungültige Source-SHA');
await writeFile(path.join(root,'deployment.json'),JSON.stringify({schemaVersion:1,sourceCommit:sha,builtAt:new Date().toISOString(),node:process.version,files},null,2)+'\n');
console.log(`Pages-Artefakt: ${files.length} Dateien, Quellcommit ${sha}`);
