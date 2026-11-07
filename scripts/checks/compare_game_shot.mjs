#!/usr/bin/env node
// Block 5 (06.11.2026, GFX-01-S06 / GFX-02-S04): image comparison of the planner's 3D view with a real
// Minecraft 26.3 screenshot of the same plan.
//
//   BAUPLANER_KEEP=<dir> scripts/mod/test_bridge_ingame.sh       # writes <dir>/…/spielbild.png + spielbild.properties + plan.schem
//   npm run build && node scripts/checks/compare_game_shot.mjs <dir> [--engine chromium|webkit] [--textures client.jar] [--out <dir>]
//   xvfb-run -a node scripts/checks/compare_game_shot.mjs <dir> --engine firefox      # Firefox needs a display for WebGL
//
// The planner draws plan.schem from exactly the camera of the game (eye, yaw, pitch, vertical field of
// view from spielbild.properties) with the original textures of the game's client jar. Compared are the
// pixels the planner covers with blocks: in a 24 × 14 grid every cell that both pictures show mostly as
// building gets its mean colour, and the share of cells within a colour distance of 48 (of 441) counts.
// Light, fog and shading differ by design (GRAPHICS.md), shape and material must not: the check fails
// below 60 % matching cells or when less than 70 % of the planner's building cells show building in the game
// (sky and ground of the game picture are measured outside the planner's silhouette; the HUD lies outside it).
// Output: vergleich.png (game | planner | difference) and vergleich.json in --out (default: the run folder).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const engine = opt('--engine') ?? 'chromium';
let textures = opt('--textures');
const outArg = opt('--out');
const runArg = args[0];
if (!runArg) { console.error('Aufruf: node scripts/checks/compare_game_shot.mjs <Spieltest-Ordner> [--engine …] [--textures client.jar] [--out <dir>]'); process.exit(2); }

/** Finds a file by name below `dir` (the kept work folder holds the run in a temp subfolder). */
function find(dir, name, depth = 4) {
  if (!existsSync(dir) || depth < 0) return null;
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (e === name) return p;
    if (statSync(p).isDirectory()) { const r = find(p, name, depth - 1); if (r) return r; }
  }
  return null;
}
const shotFile = find(runArg, 'spielbild.png'), poseFile = find(runArg, 'spielbild.properties'), planFile = find(runArg, 'plan.schem');
if (!shotFile || !poseFile || !planFile) { console.error(`Im Ordner ${runArg} fehlen spielbild.png, spielbild.properties oder plan.schem (Spieltest mit BAUPLANER_KEEP laufen lassen).`); process.exit(2); }
const out = outArg ?? path.dirname(shotFile);
mkdirSync(out, { recursive: true });

if (!textures) {
  // Loom keeps the client jar of the game in the Gradle cache.
  const roots = [path.join(homedir(), '.gradle/caches/fabric-loom'), path.join(homedir(), '.gradle/caches/fabric-loom/minecraftMaven')];
  const walk = (dir, depth) => {
    if (!existsSync(dir) || depth < 0) return null;
    for (const e of readdirSync(dir)) {
      const p = path.join(dir, e);
      if (/^(minecraft-)?client(-26\.3)?\.jar$/.test(e) && p.includes('26.3')) return p;
      if (statSync(p).isDirectory()) { const r = walk(p, depth - 1); if (r) return r; }
    }
    return null;
  };
  for (const r of roots) { textures = walk(r, 5); if (textures) break; }
}

const pose = Object.fromEntries(readFileSync(poseFile, 'utf8').split('\n').filter(Boolean).map(l => l.split('=')));
const [ex, ey, ez] = pose.eye.split(' ').map(Number), [ax, ay, az] = pose.anchor.split(' ').map(Number);
const yaw = Number(pose.yaw) * Math.PI / 180, pitch = Number(pose.pitch) * Math.PI / 180, fov = Number(pose.fov || 70);
// Minecraft: yaw 0 looks to +Z, positive pitch looks down. The plan's min corner sits on the anchor.
const eye = [ex - ax, ey - ay, ez - az];
const dir = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
const target = eye.map((v, i) => v + dir[i] * 10);

const require = createRequire(import.meta.url);
const pw = require('playwright');
const PORT = 4497, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  // Firefox has WebGL only with a display: run it under xvfb-run (as npm run test:e2e:firefox does).
  browser = await pw[engine].launch(engine === 'firefox' ? { headless: !process.env.DISPLAY, firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.enable-webgl2': true } } : {});
  const shot = readFileSync(shotFile);
  const size = shot.readUInt32BE(16), height = shot.readUInt32BE(20);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('bauplaner.test.pose', '1'));
  const p = await context.newPage();
  p.setDefaultTimeout(120_000);
  await p.goto(`${BASE}#/betrachter`);
  if (textures) {
    await p.locator('.texture-chip').click();
    await p.locator('.texture-dialog input[type=file]').setInputFiles(textures);
    await p.locator('.texture-dialog').getByText('Originaltexturen aktiv:').waitFor();
    await p.keyboard.press('Escape');
  }
  await p.locator('input[type=file]').first().setInputFiles(planFile);
  await p.waitForFunction(() => document.querySelector('.canvas-host')?.dataset.mesh === 'ready');
  // Only the 3D canvas over pure magenta (the mask; Firefox has no transparent screenshots), exactly as large as the game window; no grid, no buttons.
  await p.addStyleTag({ content: `*{background:transparent!important;box-shadow:none!important}body *{visibility:hidden!important}.canvas-host,.canvas-host canvas{visibility:visible!important}.canvas-host{position:fixed!important;left:0!important;top:0!important;width:${size}px!important;height:${height}px!important;z-index:2147483647!important}html{background:#ff00ff!important}` });
  await p.waitForTimeout(800);
  await p.evaluate(([e, t, f]) => document.querySelector('.canvas-host').bauplanerPose(e, t, f, false), [eye, target, fov]);
  await p.waitForTimeout(1200);
  const planner = await p.screenshot({ clip: { x: 0, y: 0, width: size, height } });
  const result = await p.evaluate(async ([gameUrl, planUrl]) => {
    const load = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const [g, q] = await Promise.all([load(gameUrl), load(planUrl)]);
    const W = q.naturalWidth, H = q.naturalHeight;
    const draw = (img, alpha) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); if (!alpha) x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W, H); return x.getImageData(0, 0, W, H).data; };
    const game = draw(g, false), plan = draw(q, true);
    // Magenta background → transparent.
    for (let i = 0; i < W * H; i++) if (plan[i * 4] > 235 && plan[i * 4 + 1] < 25 && plan[i * 4 + 2] > 235) plan[i * 4 + 3] = 0;
    // Planner: building = drawn (alpha). Game: building = differs from the sky/ground estimate taken outside the planner silhouette.
    const GX = 24, GY = 14, cells = [];
    let both = 0, either = 0, match = 0, counted = 0; // either = cells the planner fills
    // Sky and ground of the game picture, measured where the planner draws nothing (upper and lower half).
    // Median, not mean: the message cards and the hotbar must not pull the sky towards grey.
    const mean = (y0, y1) => { const ch = [[], [], []]; for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (plan[i + 3] < 10) for (let k = 0; k < 3; k++) ch[k].push(game[i + k]); } return ch[0].length ? ch.map(c => c.sort((a, b) => a - b)[c.length >> 1]) : null; };
    const backs = [mean(0, Math.floor(H * 0.4)), mean(Math.floor(H * 0.6), H)].filter(Boolean);
    for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
      const x0 = Math.floor(gx * W / GX), x1 = Math.floor((gx + 1) * W / GX), y0 = Math.floor(gy * H / GY), y1 = Math.floor((gy + 1) * H / GY);
      let n = 0, cov = 0; const a = [0, 0, 0], b = [0, 0, 0];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 4; n++;
        if (plan[i + 3] < 128) continue;
        cov++;
        for (let k = 0; k < 3; k++) { a[k] += game[i + k]; b[k] += plan[i + k]; }
      }
      const planCell = cov / n > 0.6;
      // Game: the cell is building when its mean colour is neither sky nor ground (textures are too noisy per pixel).
      const gm = [0, 0, 0];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4; for (let k = 0; k < 3; k++) gm[k] += game[i + k] / n; }
      const gameCell = backs.every(b => Math.hypot(gm[0] - b[0], gm[1] - b[1], gm[2] - b[2]) > 25);
      if (planCell && gameCell) both++;
      if (planCell) either++;
      if (!planCell) continue;
      const ma = a.map(v => v / cov), mb = b.map(v => v / cov), d = Math.hypot(ma[0] - mb[0], ma[1] - mb[1], ma[2] - mb[2]);
      counted++; if (d <= 48) match++;
      cells.push({ gx, gy, game: ma.map(Math.round), planner: mb.map(Math.round), distance: Math.round(d) });
    }
    // Side by side: game | planner | difference.
    const c = document.createElement('canvas'); c.width = W * 3; c.height = H;
    const x = c.getContext('2d');
    x.drawImage(g, 0, 0, W, H); const shown = x.createImageData(W, H); for (let i = 0; i < W * H * 4; i += 4) { const on = plan[i + 3] > 0; shown.data[i] = on ? plan[i] : 27; shown.data[i + 1] = on ? plan[i + 1] : 42; shown.data[i + 2] = on ? plan[i + 2] : 51; shown.data[i + 3] = 255; } x.putImageData(shown, W, 0);
    const diff = x.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const on = plan[i * 4 + 3] >= 128, d = Math.hypot(game[i * 4] - plan[i * 4], game[i * 4 + 1] - plan[i * 4 + 1], game[i * 4 + 2] - plan[i * 4 + 2]);
      diff.data[i * 4] = on ? Math.min(255, d * 1.6) : 20; diff.data[i * 4 + 1] = on ? Math.max(0, 200 - d * 1.6) : 20; diff.data[i * 4 + 2] = 30; diff.data[i * 4 + 3] = 255;
    }
    x.putImageData(diff, W * 2, 0);
    return { width: W, height: H, counted, match, overlap: either ? both / either : 0, cells, image: c.toDataURL('image/png') };
  }, [`data:image/png;base64,${shot.toString('base64')}`, `data:image/png;base64,${planner.toString('base64')}`]);
  const share = result.counted ? result.match / result.counted : 0;
  const report = { engine, textures: textures ? path.basename(textures) : null, pose: { eye, target, fov }, cells: result.counted, matching: result.match, share: Number(share.toFixed(3)), overlap: Number(result.overlap.toFixed(3)), detail: result.cells };
  writeFileSync(path.join(out, 'vergleich.png'), Buffer.from(result.image.split(',')[1], 'base64'));
  writeFileSync(path.join(out, 'vergleich.json'), JSON.stringify(report, null, 2));
  console.log(`Spielbildvergleich (${engine}${textures ? ', Originaltexturen' : ', eigene Formen'}): ${result.match}/${result.counted} Felder farbgleich (${Math.round(share * 100)} %), Umriss ${Math.round(result.overlap * 100)} % im Spiel ebenfalls Bau → ${path.join(out, 'vergleich.png')}`);
  if (share < 0.6 || result.overlap < 0.7) { console.error('Planer und Spiel weichen zu stark ab.'); process.exitCode = 1; }
} finally {
  await browser?.close();
  server.kill();
}
