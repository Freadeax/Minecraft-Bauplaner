# Semantische BlockEntity-Transformationen (NBT-01)

Wird ein Bauteil verschoben, gedreht oder gespiegelt, entscheidet `packages/voxel/src/nbtTransforms.ts` je BlockEntity, ob ihr NBT danach noch stimmt. Grundlage ist die Liste aller 49 BlockEntity-Typen des Profils `java-26.3` (Register `minecraft:block_entity_type`, [VERSION_PROFILE](VERSION_PROFILE.md)). Jeder Typ gehört zu genau einer Familie; ein Test prüft, dass kein Profiltyp ohne Familie bleibt.

| Familie | Typen | Regel |
|---|---|---|
| relativ | Truhen (auch Kupfer), Fässer, Shulkerkisten, Öfen, Trichter, Spender, Schilder, Hängeschilder, Banner, Köpfe, Regale, Bücherregal, Krug, Lesepult, Plattenspieler, Lagerfeuer, Leuchtfeuer, Glocke, Braustand, Werkbank-Crafter, Komparator, Tageslichtsensor, Kupfergolem-Statue, Tresor, Jigsaw … | Inhalt bezieht sich auf den Block selbst. Minecraft lässt solches NBT beim Platzieren gedrehter oder gespiegelter Strukturen unverändert (StructureTemplate), Litematica ebenso; der Planer auch. **Gelöst.** |
| bedingt | Bienenstock/-nest, Sculk-Sensor (auch kalibriert), Sculk-Kreischer, Sculk-Katalysator, Spawner, Prüfungsspawner | Relativ, solange kein Feld eine Weltposition hält (`bees[].flower_pos`, `listener.event`, `cursors[].pos`, `Pos` in Spawn-Daten). Sonst bei jeder Änderung **ungelöst**. |
| Befehl | Befehlsblöcke (alle drei) | Relative Koordinaten (`~`, `^`) überstehen Verschieben, aber nicht Drehen/Spiegeln; drei Zahlen hintereinander gelten als feste Koordinaten und sind bei jeder Änderung ungelöst. Befehle ohne Koordinaten sind gelöst. |
| eigener Bereich | Strukturblock, Testinstanz, bewegter Kolben | Versatz und Größe beziehen sich auf den Block: Verschieben gelöst. Strukturblock beim Drehen **gelöst** über den Adapter (NBT-01-S03, unten); Spiegeln sowie Testinstanz und bewegter Kolben beim Drehen **ungelöst**. |
| Weltposition | Endtor (`exit_portal`) | Bei jeder Änderung ungelöst. |
| unbekannt | Typen außerhalb des Profils, Mod-Typen, Einträge ohne Typ und ohne Block | Bei jeder Änderung ungelöst. |

Weitere Regeln:

- **Keine stillen NBT-Verluste.** Kein Feld wird entfernt oder erfunden; unbekannte Restdaten bleiben, wie sie sind. Ungelöste Einträge behalten ihr NBT vollständig und setzen `semanticsResolved = false` (Meldung `UNRESOLVED_BLOCK_ENTITY` mit Grund). Damit sperrt eine ungeklärte Transformation den verlässlichen Export, wie bei ungelösten Blockzuständen.
- **Eigene Positionsfelder** des Eintrags (flaches `x`/`y`/`z`, Sponge-`Pos`) sind Buchführung. Sie wandern mit dem Eintrag und behalten ihren Abstand zu `position`; beim Export schreiben Schem/Litematic sie ohnehin neu.
- Der Typ kommt aus `id` (flach) bzw. `Id` (Sponge). Fehlt er, nennt der Block an derselben Zelle den Typ (`blockEntityTypeOf`, z. B. `oak_wall_sign` → `sign`, `spawner` → `mob_spawner`).
- Zellposition und Zustand folgen dem gemeinsamen Kern (`transformCellPosition`, `transformBlockState`); es gibt keine zweite Koordinatenregel.
- Gespiegelte Scherben, Bücher und Regalinhalte bleiben in ihrer Reihenfolge – so verhält sich Minecraft selbst. Wer ein gespiegeltes Bild der Bücher braucht, muss sie im Spiel umstellen.

Prüfung: `tests/unit/formats/nbt-transforms.test.mjs` (alle Profiltypen mit Familie, vier Vierteldrehungen und doppelte Spiegelung einer Truhe mit Restdaten, konkrete Richtung, Scherben/Schild/Banner/Bücherregal unter sechs Transformationen, Bienen mit und ohne Blumenposition, Endtor, Befehle, Strukturblock, Mod-Typ, Sponge-`Pos` und flache `x/y/z`, Eintrag ohne Typ) und `tests/unit/core/voxel.test.mjs`.

## Strukturblock-Adapter (NBT-01-S03) · 04.11.2026

`turnStructureBlock(tile, turns)` dreht einen Strukturblock wie Minecrafts `Rotation.CLOCKWISE_90` (Versatz (x, z) → (−z, x)):

- **SAVE:** Der Speicherbereich `posX/Y/Z` + `sizeX/Y/Z` wird zur Hülle der gedrehten Zellen: neue Minimum-Ecke, X- und Z-Größe getauscht. Gespeichert wird danach genau der gedrehte Bau.
- **LOAD:** Der Ankerversatz dreht mit, `rotation` bekommt dieselben Vierteldrehungen dazu (`NONE → CLOCKWISE_90 → CLOCKWISE_180 → COUNTERCLOCKWISE_90`). Die geladene Struktur landet damit genau dort, wo sie neben dem ungedrehten Block gelandet wäre, nur mitgedreht.
- **CORNER/DATA:** keine Geometrie, unverändert.
- Fehlende Felder oder eine unbekannte `rotation` → ungelöst, NBT unverändert. Spiegeln bleibt ungelöst, weil sich `mirror` mit der vorhandenen Drehung nicht ohne Spielprüfung zusammensetzen lässt.

Der Blockzustand `structure_block[mode=…]` ist ausrichtungsfrei (eigene Regel in `states.ts`). Prüfung: `tests/unit/formats/nbt-transforms.test.mjs` (handgerechnete Bereiche für SAVE, LOAD mit Drehungsfolge, vier Drehungen = Ausgangszustand, unbekannte Drehung, gespiegelt ungelöst).
