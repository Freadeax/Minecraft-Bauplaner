// Prepare and check scripts/size/test_grossbau_ingame.sh (SIZE-01-S05, SPLIT-01-S05).
//   prepare <dir>   basis.txt (game commands) and basis-box.txt (recorded box) for the game test
//   verify <dir>    1. the base the game built and the mod recorded → basis-aus-dem-spiel.litematic → „Gebäude herauslösen“:
//                      houses, fields, pen, path network, cellar with its house, bunker, bridge between two houses;
//                      split into a project, every block stands at its old place
//                   2. the big build: the real mod got exactly the website's blocks, the game never froze, render budget,
//                      turning/moving, diagnosis and Baustand; browser timings → grossbau-bericht.json
// `verify` also runs on a kept folder (BAUPLANER_KEEP) without the game.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { importLitematic } from '../../dist/formats/src/index.js';
import { readLiveBox } from '../../dist/domain/src/index.js';
import { commands, recordBox, toLitematic } from './basis_build.mjs';
import { checkBase } from './basis_check.mjs';

const [mode, dir] = process.argv.slice(2);
if (!['prepare', 'verify'].includes(mode) || !dir) throw new Error('usage: grossbau_verify.mjs prepare|verify <dir>');
const de = n => n.toLocaleString('de-DE');

if (mode === 'prepare') {
  const cmds = await commands();
  writeFileSync(join(dir, 'basis.txt'), cmds.join('\n') + '\n');
  const b = recordBox();
  writeFileSync(join(dir, 'basis-box.txt'), [...b.min, ...b.maxExclusive].join(' ') + '\n');
  console.log(`Basis vorbereitet: ${cmds.length} Befehle, Aufnahme ${b.maxExclusive.map((v, i) => v - b.min[i]).join(' × ')}.`);
  process.exit(0);
}

const report = { checkedAt: new Date().toISOString() };

// ---------------------------------------------------------------- 1. base recorded in the game
const boxFile = join(dir, 'basis-box.json');
if (existsSync(boxFile)) {
  const answer = JSON.parse(readFileSync(boxFile, 'utf8'));
  assert.equal(answer.status, 200, `GET /v1/box: ${JSON.stringify(answer).slice(0, 300)}`);
  const box = readLiveBox(answer.body);
  assert.equal(box.unloaded, 0, 'alle Chunks der Basis waren geladen');
  const lit = await toLitematic({ ...box, min: [0, 0, 0], maxExclusive: box.maxExclusive.map((v, i) => v - box.min[i]) });
  writeFileSync(join(dir, 'basis-aus-dem-spiel.litematic'), lit.bytes);
  // Read back like a user's file, then split.
  const back = await importLitematic(lit.bytes.buffer.slice(lit.bytes.byteOffset, lit.bytes.byteOffset + lit.bytes.byteLength));
  const base = await checkBase(back.payload);
  const mod = JSON.parse(readFileSync(join(dir, 'basis-mod.json'), 'utf8'));
  report.basis = { ...mod, box: [...box.min, ...box.maxExclusive], blocks: base.sourceBlocks, palette: box.palette.length, ...base };
  console.log(`Basis aus dem Spiel: ${de(base.sourceBlocks)} Blöcke (${mod.commands} Befehle, ${mod.failed} abgelehnt, gebaut in ${(mod.buildMs / 1000).toFixed(1)} s, aufgenommen in ${(mod.readMs / 1000).toFixed(1)} s).`);
  for (const p of base.parts) console.log(`  ${p.kind === 'building' ? (p.role === 'bridge' ? 'Brücke ' : p.role === 'underground' ? 'Untergrund' : 'Gebäude') : 'Fläche '} ${p.name} – ${p.reason}`);
  if (base.problems.length) throw new Error(`Herauslösen der echten Basis:\n- ${base.problems.join('\n- ')}`);
  console.log(`Herauslösen bestanden: ${base.parts.length} Teile, aufgeteiltes Projekt ohne Konflikt, jeder der ${de(base.placedBlocks)} Blöcke am alten Platz.`);
}

// ---------------------------------------------------------------- 2. big build: browser and real mod
const meta = JSON.parse(readFileSync(join(dir, 'grossstadt.json'), 'utf8'));
if (existsSync(join(dir, 'browser.json'))) report.browser = JSON.parse(readFileSync(join(dir, 'browser.json'), 'utf8'));
const modFile = join(dir, 'grossbau-mod.json');
if (existsSync(modFile)) {
  const mod = JSON.parse(readFileSync(modFile, 'utf8'));
  const holo = mod.status.body.hologram;
  assert.ok(holo, 'Hologramm im Spiel');
  assert.match(holo.planFile, /^grossstadt.*\.schem$/);
  assert.equal(holo.total, meta.blocks, 'die Mod zeigt genau die Blöcke der Website');
  if (report.browser?.mapOrigin) assert.deepEqual([holo.placement.x, holo.placement.y, holo.placement.z], report.browser.mapOrigin, 'Hologramm genau an der Kartenlage');
  assert.ok(mod.maxTickGapMs < 2000, `das Spiel stand beim Empfang ${mod.maxTickGapMs} ms still`);
  assert.ok(mod.turn.maxTickGapMs < 2000 && mod.move.maxTickGapMs < 2000, `Drehen/Verschieben ohne Hänger: ${JSON.stringify([mod.turn, mod.move])}`);
  assert.equal(mod.turnedTo, (holo.placement.turns + 1) % 4, 'Ende dreht um 90°');
  assert.equal(Math.abs(mod.moved[0]) + Math.abs(mod.moved[1]) + Math.abs(mod.moved[2]), 1, 'Pfeiltaste verschiebt um einen Block');
  // Render budget (HologramRenderer: 30 000 open plus 6 000 textured blocks at „normal“, half at „niedrig“, double at „hoch“): never above the cap; „niedrig“ draws less than „normal“ when the cap cuts.
  const caps = { niedrig: 18_000, normal: 36_000, hoch: 72_000 };
  for (const b of mod.budget) assert.ok(b.shown <= caps[b.level], `Leistung ${b.level}: ${b.shown} Blöcke über der Grenze`);
  const [normal, low, high] = mod.budget;
  if (normal.capped) assert.ok(low.shown < normal.shown && high.shown >= normal.shown, `Leistung niedrig/normal/hoch: ${low.shown}/${normal.shown}/${high.shown}`);
  assert.equal(mod.scan.status, 200, `Baustand: ${JSON.stringify(mod.scan)}`);
  const diag = readFileSync(join(dir, 'grossbau-diagnose.txt'), 'utf8');
  assert.match(diag, /grossstadt/);
  report.mod = { ...mod, diagnose: diag.split('\n').slice(0, 40).join('\n') };
  console.log(`Mod: ${de(holo.total)} Blöcke angekommen, ${mod.installedMs} ms nach dem Klick auf „Senden“ fertig, längste Spielpause ${mod.maxTickGapMs} ms; `
    + `Drehen ${mod.turn.ms} ms, Verschieben ${mod.move.ms} ms; Hologramm zeigt ${mod.budget.map(b => `${b.level} ${de(b.shown)}${b.capped ? ' (gekappt)' : ''}`).join(', ')}; Baustand ${(mod.scanMs / 1000).toFixed(1)} s, `
    + `Pause ${mod.scanMaxTickGapMs} ms; Java-Speicher ${mod.heapUsedMb}/${mod.heapMaxMb} MB.`);
}
writeFileSync(join(dir, 'grossbau-bericht.json'), JSON.stringify(report, null, 1));
console.log('Großbau- und Basisprüfung im Spiel bestanden.');
