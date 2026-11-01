// Publishes a built bridge adapter for download on the website (GAME-02, GAME-04, GAME-05):
//   node scripts/release_mod.mjs <adapter, e.g. fabric-26.3, neoforge-26.3, forge-26.3 or paper> "<what was tested>"
// Copies the jar from mods/bauplaner-bridge/<adapter>/build/libs/ to downloads/mod/ (served by Pages
// from main) and adds or replaces its entry in apps/web/src/views/mod/releases.json. Build and test
// first: ./gradlew -PwithFabric|-PwithNeoForge|-PwithForge :<adapter>:build and the real-game test
// (scripts/test_bridge_ingame.sh for Fabric, scripts/test_bridge_ingame_forge.sh neoforge|forge), or for
// Paper ./gradlew -PwithPaper :paper:build and scripts/test_bridge_paper.sh. An adapter without a version in
// its name (paper) is one jar for several Minecraft versions: tested_versions in its gradle.properties.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [adapter, tested] = process.argv.slice(2);
if (!adapter || !/^[a-z]+(-[0-9.]+)?$/.test(adapter) || !tested) throw new Error('usage: release_mod.mjs <adapter> "<getestet>"');
const root = 'mods/bauplaner-bridge';
const props = Object.fromEntries(readFileSync(join(root, adapter, 'gradle.properties'), 'utf8').split('\n')
  .filter(l => /^[a-z_]+=/.test(l)).map(l => l.split('=').map(s => s.trim())));
const modVersion = readFileSync(join(root, 'VERSION'), 'utf8').trim();
const loader = adapter.split('-')[0];
const file = `bauplaner-bridge-${adapter}-${modVersion}.jar`;
const built = join(root, adapter, 'build/libs', file);
const multi = !adapter.includes('-');
const flag = { fabric: 'withFabric', paper: 'withPaper', neoforge: 'withNeoForge', forge: 'withForge' }[loader] ?? 'with' + loader;
if (!existsSync(built)) throw new Error(`${built} fehlt: zuerst ./gradlew -P${flag} :${adapter}:build`);
const bytes = readFileSync(built);
copyFileSync(built, join('downloads/mod', file));

const manifestPath = 'apps/web/src/views/mod/releases.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const entry = {
  file, modVersion, loader, minecraft: props.minecraft_version, loaderMin: props.loader_version ?? props.paper_plugin_api_version,
  ...(multi && { minecraftVersions: props.tested_versions.split(/\s+/).filter(Boolean) }),
  ...(props.fabric_api_version && { fabricApi: props.fabric_api_version }), java: props.java_version ?? '25',
  bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
  releasedAt: new Date().toISOString().slice(0, 10), sourceCommit: execFileSync('git', ['log', '-1', '--format=%H', '--', root]).toString().trim(), tested,
};
manifest.releases = [...manifest.releases.filter(r => r.file !== file), entry];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Bereitgestellt: downloads/mod/${file} (${bytes.length} Bytes, ${entry.sha256}).`);
