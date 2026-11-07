# Passt zu deinem Spiel? (COMPAT-01)

Stand: 07.11.2026. Der Planer rechnet mit dem [Versionsprofil Java 26.3](VERSION_PROFILE.md). Viele spielen aber eine ältere Version, einen anderen Loader oder fügen mit einem anderen Werkzeug ein. Der Kompatibilitätscheck sagt **vor** dem Export oder Download, was im eigenen Spiel ankommt. Nichts wird dabei umgewandelt; der Bericht beschreibt die Datei, wie der Planer sie schreibt.

## Mein Spiel

Einmal wählen, der Browser merkt es sich (`localStorage` `bauplaner.spiel`, gilt für alle Seiten und Tabs):

| Feld | Werte |
|---|---|
| Minecraft-Version | jede Java-Version mit Blockbericht (Tabelle unten), Vorgabe 26.3 |
| Loader / Server | Fabric, NeoForge, Forge, Paper-Server, Vanilla (ohne Mods) |
| Einfügen mit | Litematica (`.litematic`) oder WorldEdit / FAWE (`.schem`, Sponge v3), Vorgabe WorldEdit |

Die Statuszeile steht an drei Stellen:

- **Export** (Projektreiter „Export“): Abschnitt „Passt zu deinem Spiel?“. Die Version setzt die DataVersion, das Werkzeug das Dateiformat; beides bleibt von Hand änderbar. Eine abweichende DataVersion wird gemeldet.
- **Gebäudeblatt** in der Bibliothek (Bauen & Technik): kurze Zeile, Details aufklappbar, „Mein Spiel ändern“.
- **Mod-Seite** (`#/mod`): ob es die Bauplaner-Mod bzw. das Paper-Plugin für dieses Spiel gibt; „Passende Datei auswählen“ übernimmt sie in die Auswahl darunter.

## Was geprüft wird

`checkCompatibility(input, setup)` in `packages/voxel/src/versionCompat.ts`, je benutzter Palettenstelle und mit Zellenzahl:

| Befund | Stufe | Bedeutung |
|---|---|---|
| Block fehlt in der Version | Verlust | Die Blockart gibt es dort noch nicht; die Stelle bleibt beim Einfügen leer. |
| Eigenschaft fehlt oder Wert ungültig | Hinweis | Das Spiel setzt die Grundeinstellung des Blocks (z. B. Kopf ohne `powered` in 1.20.1). |
| Mod-Namensraum | Hinweis, auf Paper/Vanilla Verlust | Mods für den gewählten Loader nötig; ohne Mods fehlen die Blöcke. |
| Werkzeug und Loader | Verlust/Hinweis | Litematica ohne Loader unmöglich, für NeoForge/Forge nur inoffizielle Portierungen; WorldEdit braucht Mod oder Plugin. |
| Entities | Info | Litematica setzt sie mit, WorldEdit nur mit `//paste -e`. |

Unbekannte Version: Hinweis „nicht geprüft“. Die Stufe der Statuszeile ist der schwerste Befund (`ok`, `warn`, `loss`).

## Datenherkunft

Nur Unterschiede werden eingecheckt (`packages/voxel/src/versionCompatData.ts`, ~47 kB): je Version die Blöcke des Profils, die dort fehlen, und die Blöcke mit anderen Eigenschaften samt deren Werten und Grundzustand. Quelle ist der Blockbericht des offiziellen Servers jeder Version (Datengenerator `--reports`), DataVersion aus `version.json` im Server-Jar (`world_version`). Der Bezug ist an den Bericht des Profils gebunden (SHA-256 aus `blockFacts.ts`); passt er nicht, bricht der Generator ab.

```
scripts/gen/fetch_version_reports.sh /tmp/mcv              # Server laden (SHA-1 geprüft), Blockbericht erzeugen
node scripts/gen/gen_version_compat.mjs /tmp/mcv            # versionCompatData.ts schreiben
```

Bis 1.21.x reicht JDK 21, ab 26.x braucht der Server JDK 25 (`BAUPLANER_JAVA25`).

| Version | DataVersion | fehlende Blöcke (gegenüber 26.3) | andere Eigenschaften |
|---|---:|---:|---:|
| 26.2 | 4903 | 90 | 0 |
| 26.1.2 | 4790 | 118 | 0 |
| 1.21.11 | 4671 | 120 | 1 |
| 1.21.10 | 4556 | 120 | 1 |
| 1.21.8 | 4440 | 182 | 1 |
| 1.21.5 | 4325 | 183 | 1 |
| 1.21.4 | 4189 | 192 | 2 |
| 1.21.1 | 3955 | 227 | 1 |
| 1.20.6 | 3839 | 227 | 1 |
| 1.20.4 | 3700 | 229 | 2 |
| 1.20.1 | 3465 | 285 | 16 |

Die Auswahlhilfe der DataVersion im Export (`KNOWN_DATA_VERSIONS`) kommt aus derselben Liste.

## Grenzen

- Blöcke, die es nur in älteren Versionen gibt (umbenannt, z. B. `grass` → `short_grass`), betreffen den Import, nicht den Export, und werden hier nicht gemeldet.
- Ob es Litematica oder WorldEdit für eine bestimmte Version gibt, prüft der Planer nicht; die Hinweise nennen die offiziellen Wege.
- Inhalte von BlockEntities (z. B. neue Komponenten in Truhen) werden nicht versionsweise geprüft.
- Tests: `tests/unit/formats/version-compat.test.mjs`, Browser `tests/e2e/compat.e2e.mjs`.
