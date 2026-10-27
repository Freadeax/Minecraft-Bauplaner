import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist-web');
const manifest=JSON.parse(readFileSync(path.join(root,'deployment.json'),'utf8'));
test('Pages manifest matches every published file and contains no source files',()=>{
  assert.equal(manifest.schemaVersion,1);
  assert.match(manifest.sourceCommit,/^[a-f0-9]{40}$/);
  const paths=new Set();
  for(const entry of manifest.files){
    assert.ok(!entry.path.includes('..')&&!entry.path.startsWith('/'));
    assert.ok(!paths.has(entry.path));paths.add(entry.path);
    const data=readFileSync(path.join(root,entry.path));assert.equal(data.length,entry.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);
    assert.ok(!/\.(tsx?|map|md)$/.test(entry.path));
  }
  assert.ok(paths.has('.nojekyll'));assert.ok(paths.has('THIRD_PARTY_NOTICES.txt'));
  const expected=[];
  function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())walk(full);else expected.push(path.relative(root,full).split(path.sep).join('/'));}}
  walk(root);assert.deepEqual([...paths].sort(),expected.filter(p=>p!=='deployment.json').sort());
});
test('Pages entry uses repository subpath and ships a separate import worker',()=>{
  const html=readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/lang="de"/);assert.match(html,/\/Minecraft-Bauplaner\/assets\//);
  assert.ok(manifest.files.some(f=>/assets\/import\.worker-.*\.js$/.test(f.path)));
  const notices=readFileSync(path.join(root,'THIRD_PARTY_NOTICES.txt'),'utf8');
  for(const name of ['react','react-dom','three'])assert.ok(notices.includes(name));
});
