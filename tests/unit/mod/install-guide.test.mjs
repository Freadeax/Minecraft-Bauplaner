import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSTALL_CHECKS, LAUNCHERS, LAUNCHER_LABEL, installGuide, stepParts } from '../../../apps/web/src/views/mod/installGuide.ts';

// GAME-11 S04: Modrinth App, Prism Launcher, CurseForge and the official launcher, for Fabric and NeoForge.
test('every launcher has steps for Fabric and NeoForge with the file, the version and the J key', () => {
  assert.deepEqual([...LAUNCHERS], ['modrinth', 'prism', 'curseforge', 'offiziell']);
  for (const l of LAUNCHERS) {
    assert.ok(LAUNCHER_LABEL[l]);
    for (const loader of ['fabric', 'neoforge']) {
      const file = `bauplaner-bridge-${loader}-26.3-0.18.0.jar`;
      const g = installGuide(l, loader, '26.3', file);
      const all = g.steps.join('\n');
      assert.ok(g.steps.length >= 4, `${l}/${loader}`);
      assert.ok(all.includes(file), `${l}/${loader}: Dateiname`);
      assert.ok(all.includes('26.3'), `${l}/${loader}: Minecraft-Version`);
      assert.match(all, /\*\*J\*\*/, `${l}/${loader}: Taste J`);
      assert.match(all, /Ältere `bauplaner-bridge-…jar`/, `${l}/${loader}: alte Version entfernen`);
      assert.ok(g.folder.includes('mods'), `${l}: Ordner mods`);
      assert.deepEqual(g.needs, loader === 'fabric' ? ['Fabric API'] : []);
      // Fabric API only where it is needed; NeoForge never asks for it.
      if (loader === 'fabric') assert.match(all, /Fabric API/, `${l}: Fabric API nennen`);
      if (loader === 'neoforge') assert.doesNotMatch(all, /Fabric API|Fabric-Installer/);
      // Never steer a player to put the server plugin into the game profile.
      assert.doesNotMatch(all, /paper/i);
    }
  }
  assert.match(installGuide('offiziell', 'fabric', '26.3', 'x.jar').steps[0], /fabricmc\.net/);
  assert.match(installGuide('offiziell', 'neoforge', '26.3', 'x.jar').steps[0], /neoforged\.net/);
  assert.match(installGuide('curseforge', 'fabric', '26.3', 'x.jar').steps.join(' '), /nicht auf CurseForge/);
  assert.ok(INSTALL_CHECKS.some(c => c.includes('paper')), 'Hinweis: Plugin nie in mods');
});

test('step text splits into text, code and bold parts', () => {
  assert.deepEqual(stepParts('Ordner `mods` und **J** drücken'), [
    { text: 'Ordner ', code: false, bold: false }, { text: 'mods', code: true, bold: false }, { text: ' und ', code: false, bold: false },
    { text: 'J', code: false, bold: true }, { text: ' drücken', code: false, bold: false },
  ]);
  assert.deepEqual(stepParts('`a**b`'), [{ text: 'a**b', code: true, bold: false }]);
});
