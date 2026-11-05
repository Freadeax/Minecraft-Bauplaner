#!/usr/bin/env bash
# Real-world acceptance of the world excerpt reader (WORLD-IMPORT-01), not part of `npm run check`:
# downloads the official 26.3 dedicated server, creates three worlds (region-file-compression
# deflate, lz4, none), places known blocks by command, saves, and reads them back with the
# built reader. Needs Java 25, network access to piston-meta/piston-data.mojang.com and `npm run build:core`.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
WORK=${WORK:-$(mktemp -d)}
JAVA=${JAVA:-java}
VERSION=26.3
mkdir -p "$WORK"; cd "$WORK"
URL=$(curl -sS https://piston-meta.mojang.com/mc/game/version_manifest_v2.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).versions.find(v=>v.id==='$VERSION').url))")
SERVER=$(curl -sS "$URL" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s).downloads.server;console.log(d.url+' '+d.sha1)})")
[ -f server.jar ] || curl -sS "${SERVER% *}" -o server.jar
echo "${SERVER#* }  server.jar" | sha1sum -c -
cat > cmds.txt <<'C'
forceload add 0 0 47 47
fill 2 100 2 6 100 6 minecraft:stone_bricks
setblock 2 101 2 minecraft:oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]
setblock 3 101 2 minecraft:chest[facing=north,type=single,waterlogged=false]{Items:[{Slot:0b,id:"minecraft:diamond",count:3}]}
setblock 4 101 2 minecraft:oak_sign[rotation=4,waterlogged=false]
setblock 6 101 2 minecraft:glass
fill 20 100 20 35 100 35 minecraft:oak_planks
setblock 33 101 33 minecraft:lantern[hanging=false,waterlogged=false]
C
for C in deflate lz4 none; do
  rm -rf "w-$C"; mkdir "w-$C"; cd "w-$C"
  echo eula=true > eula.txt
  printf 'level-seed=bauplaner\nonline-mode=false\nregion-file-compression=%s\nserver-port=%s\nview-distance=4\nspawn-protection=0\n' "$C" $((25600 + RANDOM % 300)) > server.properties
  ( while ! grep -q 'Done (' logs/latest.log 2>/dev/null; do sleep 2; done
    while read -r l; do echo "$l"; sleep 0.2; done < ../cmds.txt; sleep 3; echo "save-all flush"; sleep 8; echo stop ) | "$JAVA" -Xmx2G -jar ../server.jar nogui > out.log 2>&1
  cd ..
done
node --input-type=module - "$WORK" "$ROOT" <<'JS'
const [work, root] = process.argv.slice(2);
const { readFileSync, readdirSync } = await import('node:fs');
const f = await import(`${root}/dist/formats/src/index.js`);
const text = s => s.id + (Object.keys(s.properties).length ? `[${Object.keys(s.properties).sort().map(k => `${k}=${s.properties[k]}`).join(',')}]` : '');
let failed = 0;
const expect = (a, b, what) => { if (a !== b) { failed++; console.error(`FEHLER ${what}: ${a} ≠ ${b}`); } };
for (const c of ['deflate', 'lz4', 'none']) {
  const dir = `${work}/w-${c}/world/dimensions/minecraft/overworld/region/`;
  const { files } = f.collectWorldFiles(readdirSync(dir).map(n => f.bytesRegionSource(n, new Uint8Array(readFileSync(dir + n)))));
  const s = await f.sampleWorld(files, { min: [0, 100, 0], maxExclusive: [48, 102, 48] });
  expect(s.unknownCells, 0, `${c} unbekannt`);
  expect(text(f.sampleAt(s, [2, 101, 2])), 'minecraft:oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]', `${c} Treppe`);
  expect(text(f.sampleAt(s, [3, 101, 2])), 'minecraft:chest[facing=north,type=single,waterlogged=false]', `${c} Truhe (Standardzustand)`);
  expect(text(f.sampleAt(s, [4, 101, 2])), 'minecraft:oak_sign[rotation=4,waterlogged=false]', `${c} Schild`);
  expect(text(f.sampleAt(s, [33, 101, 33])), 'minecraft:lantern[hanging=false,waterlogged=false]', `${c} Laterne`);
  expect(text(f.sampleAt(s, [35, 100, 20])), 'minecraft:oak_planks', `${c} Planken über Chunkgrenze`);
  const chest = s.blockEntities.find(b => b.position.join() === '3,101,2');
  expect(chest?.data.value.Items.value[0].value.id.value, 'minecraft:diamond', `${c} Truheninhalt`);
  const { report } = f.sampleToPayload(s, { air: 'none', trim: true, exclude: new Set() });
  expect(report.blocks, 25 + 4 + 256 + 1, `${c} Blöcke`);
  console.log(`${c}: DataVersion ${s.dataVersions.join(',')}, ${report.blocks} Blöcke, Kompression ${s.chunks[0].compression} – geprüft`);
}
process.exitCode = failed ? 1 : 0;
JS
