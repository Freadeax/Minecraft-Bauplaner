import commandsData from './modCommands.json' with { type: 'json' };

/**
 * GAME-12 (Mod 0.23.0): every command of the mod and the server plugin, in German and English.
 * The list comes from the mod's own catalog (CommandExport.java → modCommands.json, kept fresh by CommandExportTest).
 */
export type Lang = 'de' | 'en';
type Text = { label: string; command: string; help: string };
export type ModCommand = { id: string; group: string; side: 'mod' | 'plugin'; de: Text; en: Text };
type Group = { de: string; en: string };

export const MOD_COMMANDS: readonly ModCommand[] = commandsData.commands as ModCommand[];
export const MOD_COMMAND_GROUPS: readonly Group[] = commandsData.groups;

/** Commands matching the search in either language (label, command or help), in catalog order. */
export function searchCommands(list: readonly ModCommand[], query: string, group: string | null): ModCommand[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(c => (group === null || c.group === group) && words.every(w =>
    [c.de.label, c.de.command, c.de.help, c.en.label, c.en.command, c.en.help].some(t => t.toLowerCase().includes(w))));
}

