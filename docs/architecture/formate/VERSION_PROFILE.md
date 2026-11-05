# Versionsprofil Java 26.3 (PROFILE-01)

Ein Profil, eine Herkunft: Blöcke, Property-Werte, Items, Item-Tags, Rezepte und Brennstoffe des Planers stammen aus **demselben offiziellen Minecraft-Server** und sind mit Hashes belegt. Es wird nichts von Hand abgetippt und keine Datei von Mojang eingecheckt, nur abgeleitete Fakten (IDs, Mengen, Tag-Mitgliedschaften, Brennzeiten; siehe ADR-020 in [DECISIONS](../kern/DECISIONS.md)).

| Angabe | Wert |
|---|---|
| Profil-ID | `java-26.3` (`JAVA_PROFILE_ID`) |
| Version / DataVersion | 26.3 / 5023 |
| server.jar SHA-1 | `33680f5f2ac32864d6d7cf5e56a705fdb3e05f4c` (Download über piston-meta, Hash geprüft) |
| `reports/blocks.json` SHA-256 | `7a0de8aaf7b04d00c40b8ffdc4cfe75184cff2e821d336a020573201867105a4` (gleicher Bericht wie [BLOCK_LOGIC](BLOCK_LOGIC.md)) |
| `reports/registries.json` SHA-256 | `51f62d56f8bd0e9134ee88dd9226b64e9e56cf6a32377540d44291bf47ecdac6` |
| Item-Komponenten, Rezepte, Item-Tags, Kochwerte | Baumhashes in `packages/voxel/src/profileData.ts` (`PROFILE_SOURCES`) |
| Umfang | 1286 Blöcke, 1658 Items, 1696 von 2042 Rezeptdateien, 35 benutzte Item-Tags, 347 Brennstoffe |

## Dateien

| Datei | Inhalt |
|---|---|
| `scripts/gen/gen_profile.mjs` | Erzeugt die beiden Datendateien aus Serverberichten und den Daten im Server-Jar. |
| `packages/voxel/src/profileData.ts` | Profilkopf mit Hashes, Item-IDs, Item-Tags (aufgelöst), Brennstoffe. Erzeugt. |
| `packages/domain/src/materials/profileRecipes.ts` | Alle Rezepte, die Items in Bauitems verwandeln (Werkbank inkl. Umfärben, Steinsäge, Ofen, Schmelzofen, Räucherofen, Lagerfeuer, Schmiedetisch). Erzeugt. |
| `packages/voxel/src/profile.ts` | Profil-API: `JAVA_PROFILE`, `assertProfileConsistent`, `isProfileItem`, `profileItemTag`, `fuelOf`, `smeltsPerFuel`, `checkProfileStates`, `checkPayloadProfile`. |
| `packages/voxel/src/blockRegistry.ts` | Blockregister (VIEW-02), jetzt direkt aus den Blockfakten des Serverberichts. |

Nicht übernommen werden Sonderrezepte ohne feste Zutaten (Banner kopieren, Feuerwerk, Karten, Reparatur), Brauen und Rüstungsverzierungen; sie stehen nur gezählt in `PROFILE_RECIPE_TYPES`.

## Regeln

- **DataVersion behauptet keine Verträglichkeit.** `checkProfileStates(states, dataVersion)` prüft den Inhalt: jede Block-ID, jede Property und jeden Wert gegen das Profil. Ergebnis `passt` nur, wenn alle Zustände gültig sind *und* die Datei die DataVersion des Profils nennt. Gültige Zustände aus einer anderen DataVersion ergeben `zustaende-passen` (nutzbar, aber nicht umgewandelt). Eine unbekannte ID oder ein ungültiger Wert ergibt `abweichend`, auch bei gleicher DataVersion.
- Zustände aus anderen Namensräumen (Mods) bleiben sichtbar und unverändert; sie sind kein Fehler, aber auch nicht Teil des Profils.
- Fehlende Properties füllt das Spiel mit seinem Standard (`incomplete` zählt sie).
- `assertProfileConsistent()` schlägt fehl, sobald Blockfakten und Profil aus verschiedenen Server-Jars stammen. Ein neues Profil heißt: beide Generatoren mit derselben Jar laufen lassen.
- Die Profil-ID in Nutzlasten (`java:dataversion-N:registry-unverified` beim Import) bleibt die Angabe der Datei. Die Prüfung steht daneben: Gebäudeblatt → „Bauen & Technik“ → **Profilprüfung** (Tooltip mit Begründung, Liste der Abweichungen).

## Neu erzeugen

```sh
# Java 25 nötig (26.3 ist mit Klassenversion 69 gebaut)
curl -o server.jar https://piston-data.mojang.com/v1/objects/33680f5f2ac32864d6d7cf5e56a705fdb3e05f4c/server.jar
java -DbundlerMainClass=net.minecraft.data.Main -jar server.jar --reports --output out
mkdir jar && (cd jar && unzip -q ../versions/26.3/server-26.3.jar 'data/minecraft/recipe/*' 'data/minecraft/tags/item/*' \
  'data/minecraft/context_int_provider/*' 'data/minecraft/context_float_provider/*')
node scripts/gen/gen_profile.mjs out jar 26.3 5023 33680f5f2ac32864d6d7cf5e56a705fdb3e05f4c
```

Brennzeiten sind in 26.3 datengetrieben: Item-Komponente `minecraft:cooking_fuel` verweist auf Zahlenanbieter (`context_int_provider/cooking/time_*`), die je nach `block/fast_cooking` (Schmelzofen, Räucherofen) halbiert werden; die Geschwindigkeit verdoppelt sich dort. Der Generator wertet beide Fälle aus. Eine Kohle reicht damit überall für 8 Vorgänge à 200 Ticks.

## Prüfung

`tests/unit/formats/profile.test.mjs`: Hashes und gleiche Jar wie die Blockfakten, Register = Serverbericht (vollständige Werte, keine Entity-IDs), jedes Blockitem ist ein Profil-Item, Brennstoffe (Kohle 8, Kohleblock 80, Lavaeimer 100, Planke 1,5 Vorgänge), DataVersion-Regel, Mod-Zustände, unvollständige Zustände. Die Rezeptbindung prüft `tests/unit/materials/recipe-profile.test.mjs` (MAT-02).
