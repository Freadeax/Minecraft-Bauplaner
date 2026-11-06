import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOD_COMMANDS, MOD_COMMAND_GROUPS, searchCommands } from '../../../apps/web/src/views/mod/modCommands.ts';

// GAME-12 (Mod 0.23.0): the #/mod page lists every command in German and English, from the mod's own catalog.
test('every command has German and English text, mod commands use both roots', () => {
  assert.ok(MOD_COMMANDS.length >= 100, `${MOD_COMMANDS.length} Befehle`);
  const groups = new Set(MOD_COMMAND_GROUPS.map(g => g.de));
  for (const c of MOD_COMMANDS) {
    assert.ok(groups.has(c.group), `${c.id}: Gruppe ${c.group}`);
    for (const l of ['de', 'en']) for (const k of ['label', 'command', 'help']) assert.ok(c[l][k].trim(), `${c.id}.${l}.${k}`);
    if (c.side === 'mod') {
      assert.match(c.de.command, /^\/bauplaner( |$)/, c.id);
      assert.match(c.en.command, /^\/buildplanner( |$)/, c.id);
    } else {
      assert.match(c.de.command, /^\/bp /, c.id);
      assert.equal(c.en.command.split(' ')[0], '/bp', `${c.id}: Server-Befehle bleiben /bp`);
    }
  }
  assert.ok(MOD_COMMAND_GROUPS.every(g => g.en && g.de), 'Gruppen in beiden Sprachen');
  assert.ok(MOD_COMMANDS.some(c => c.en.command === '/buildplanner progress'));
  assert.ok(MOD_COMMANDS.some(c => c.de.command.startsWith('/bauplaner sprache')), 'neuer Befehl sprache');
});

test('search finds a command by German or English words, and filters by group', () => {
  const de = searchCommands(MOD_COMMANDS, 'fortschritt', null);
  const en = searchCommands(MOD_COMMANDS, 'progress', null);
  assert.ok(de.length > 0 && en.length > 0);
  assert.ok(de.some(c => en.includes(c)), 'dasselbe Kommando über beide Sprachen');
  assert.equal(searchCommands(MOD_COMMANDS, '', null).length, MOD_COMMANDS.length);
  const g = MOD_COMMAND_GROUPS[0].de;
  assert.ok(searchCommands(MOD_COMMANDS, '', g).every(c => c.group === g));
  assert.equal(searchCommands(MOD_COMMANDS, 'gibtesnichtxyz', null).length, 0);
});
