/**
 * GAME-11 S04: installation of the client mod per launcher (Modrinth App, Prism Launcher, CurseForge, the
 * official Minecraft launcher) for the chosen loader and Minecraft version. Pure data, rendered on #/mod;
 * text in `backticks` is shown as code. The client mod belongs only into the game profile; the server needs
 * nothing (the Paper plugin is optional and has its own page).
 */
export type LauncherId = 'modrinth' | 'prism' | 'curseforge' | 'offiziell';
export const LAUNCHERS: readonly LauncherId[] = ['modrinth', 'prism', 'curseforge', 'offiziell'];
export const LAUNCHER_LABEL: Readonly<Record<LauncherId, string>> = {
  modrinth: 'Modrinth App', prism: 'Prism Launcher', curseforge: 'CurseForge', offiziell: 'Offizieller Launcher',
};

/** Modrinth page of the mod (slug from GAME-09); found in the launchers' search once Modrinth has approved it. */
export const MODRINTH_PAGE = 'https://modrinth.com/mod/bauplaner-bridge';
export const FABRIC_API_PAGE = 'https://modrinth.com/mod/fabric-api';
export const FABRIC_INSTALLER = 'https://fabricmc.net/use/installer/';
export const NEOFORGE_INSTALLER = 'https://neoforged.net/';

export interface InstallGuide {
  readonly launcher: LauncherId;
  readonly steps: readonly string[];
  /** Where the mods folder of a profile is. */
  readonly folder: string;
  /** Loader-specific extra mods the profile needs (Fabric API), empty for NeoForge. */
  readonly needs: readonly string[];
}

const loaderName = (loader: string) => loader === 'neoforge' ? 'NeoForge' : loader === 'forge' ? 'Forge' : 'Fabric';

/** Steps for one launcher; `loader` is fabric or neoforge, `minecraft` e.g. 26.3, `file` the jar name. */
export function installGuide(launcher: LauncherId, loader: string, minecraft: string, file: string): InstallGuide {
  const L = loaderName(loader), fabric = loader === 'fabric';
  const needs = fabric ? ['Fabric API'] : [];
  const api = fabric ? ' Fabric API muss im Profil sein (in Modpacks fast immer schon dabei).' : '';
  const old = 'Ältere `bauplaner-bridge-…jar` im Ordner `mods` löschen, es darf nur eine Version drin liegen.';
  switch (launcher) {
    case 'modrinth': return {
      launcher, needs, folder: 'Windows: `%APPDATA%\\ModrinthApp\\profiles\\<Profilname>\\mods`',
      steps: [
        `Profil mit ${L} und Minecraft ${minecraft} öffnen oder neu anlegen („+“ links → „Profil erstellen“ → Loader ${L}, Version ${minecraft}).`,
        `Am einfachsten über die Suche: im Profil „Inhalte hinzufügen“ → „LMNT — Build Studio Bridge“ suchen → „Installieren“. Die App holt passende Abhängigkeiten${fabric ? ' wie Fabric API' : ''} selbst und meldet neue Versionen. Solange Modrinth das Projekt noch prüft, findet die Suche es nicht – dann der nächste Schritt.`,
        `Mit der Datei von dieser Seite: im Profil oben rechts „⋯“ → „Ordner öffnen“ → Ordner \`mods\` öffnen und \`${file}\` hineinlegen.${api}`,
        old,
        'Profil starten, eine Welt oder einen Server betreten und **J** drücken: das Planmenü öffnet sich.',
      ],
    };
    case 'prism': return {
      launcher, needs, folder: 'Instanz rechtsklicken → „Ordner“ → `minecraft/mods` (bzw. `.minecraft/mods`)',
      steps: [
        `„Instanz hinzufügen“ → Minecraft ${minecraft} wählen → unten bei „Mod-Loader“ ${L} wählen → „OK“. Eine vorhandene Instanz geht genauso, wenn Version und Loader passen.`,
        `Instanz markieren → „Bearbeiten“ → „Mods“ → „Mods herunterladen“ → Reiter „Modrinth“ → „LMNT — Build Studio Bridge“ suchen, auswählen, „OK“.${fabric ? ' Prism bietet Fabric API als Abhängigkeit gleich mit an.' : ''} Solange Modrinth das Projekt noch prüft, findet die Suche es nicht – dann der nächste Schritt.`,
        `Mit der Datei von dieser Seite: in „Bearbeiten“ → „Mods“ auf „Datei hinzufügen“ klicken (oder \`${file}\` in die Liste ziehen).${api}`,
        old,
        'Instanz starten, eine Welt oder einen Server betreten und **J** drücken: das Planmenü öffnet sich.',
      ],
    };
    case 'curseforge': return {
      launcher, needs, folder: 'Profil → „⋯“ → „Open Folder“ → `mods` (Windows meist `%USERPROFILE%\\curseforge\\minecraft\\Instances\\<Profil>\\mods`)',
      steps: [
        `„Minecraft“ → „Create Custom Profile“ → Version ${minecraft} → Loader ${L} → „Create“. Ein Modpack-Profil mit ${L} ${minecraft} geht genauso.`,
        `Die Build-Studio-Mod steht nicht auf CurseForge, darum mit der Datei von dieser Seite: im Profil „⋯“ → „Open Folder“ → Ordner \`mods\` öffnen und \`${file}\` hineinlegen.`,
        ...(fabric ? ['Fehlt Fabric API: im Profil „Add More Content“ → „Fabric API“ suchen und installieren.'] : []),
        old,
        'Profil mit „Play“ starten, eine Welt oder einen Server betreten und **J** drücken: das Planmenü öffnet sich.',
      ],
    };
    case 'offiziell': return {
      launcher, needs, folder: 'Windows: `%APPDATA%\\.minecraft\\mods` (Win+R, `%appdata%\\.minecraft` eingeben) · macOS: `~/Library/Application Support/minecraft/mods` · Linux: `~/.minecraft/mods`',
      steps: [
        fabric
          ? `Fabric-Installer laden (${FABRIC_INSTALLER}), „Client“ wählen, Minecraft ${minecraft}, „Installieren“. Danach steht im offiziellen Launcher ein Profil „fabric-loader-${minecraft}“.`
          : `NeoForge-Installer für Minecraft ${minecraft} laden (${NEOFORGE_INSTALLER}), „Install client“ → „OK“. Danach steht im offiziellen Launcher ein NeoForge-Profil.`,
        `Den Ordner \`mods\` im Minecraft-Ordner öffnen (fehlt er, einmal das ${L}-Profil starten oder ihn anlegen) und \`${file}\` hineinlegen.`,
        ...(fabric ? [`Fabric API für ${minecraft} von ${FABRIC_API_PAGE} laden und ebenfalls in \`mods\` legen.`] : []),
        old,
        `Im Launcher unten links das ${L}-Profil wählen, „Spielen“, eine Welt oder einen Server betreten und **J** drücken.`,
      ],
    };
  }
}

/** Checks for every launcher: what tells the player the install worked or what went wrong. */
export const INSTALL_CHECKS: readonly string[] = [
  'Im Spiel öffnet **J** das Planmenü. Unter Optionen → Steuerung stehen alle Tasten in der Gruppe „Build Studio“.',
  'Startet das Spiel nicht: Loader und Minecraft-Version des Profils mit der Datei vergleichen (oben unter „Datei“). Mit Fabric fehlt meist Fabric API.',
  'Nie das Server-Plugin (`bauplaner-bridge-paper-…jar`) in `mods` legen – es gehört nur auf einen Paper-Server und ist freiwillig.',
  'Probleme melden: im Spiel `/bauplaner diagnose` und die Datei aus `bauplaner/diagnose/` schicken.',
];

/** Splits a step into text and `code` parts (odd indices are code); **bold** stays for the renderer. */
export function stepParts(step: string): { readonly text: string; readonly code: boolean; readonly bold: boolean }[] {
  const out: { text: string; code: boolean; bold: boolean }[] = [];
  step.split('`').forEach((chunk, i) => {
    if (i % 2 === 1) { if (chunk) out.push({ text: chunk, code: true, bold: false }); return; }
    chunk.split('**').forEach((t, j) => { if (t) out.push({ text: t, code: false, bold: j % 2 === 1 }); });
  });
  return out;
}
