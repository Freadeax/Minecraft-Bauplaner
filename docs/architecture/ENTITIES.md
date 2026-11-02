# Gemälde, Rahmen, Rüstungsständer und Blockinhalte (ENTITY-01)

Stand: 02.11.2026. Schließt den offenen Punkt aus FORMAT-02 („Entities werden nicht übernommen“). Code: `packages/voxel/src/entities.ts` (Modell, Geometrie, Inhalte), `packages/formats/src/entityIo.ts` (Lesen), Schreiber in `litematicWrite.ts`/`schemWrite.ts`, Darstellung `apps/web/src/blockmodels/entityShapes.ts` + `entityScene.ts`, Ansichten `apps/web/src/viewer/ContentInfo.tsx`, Werkstatt `apps/web/src/editor/EntityPanel.tsx`.

## Datenmodell

- `VoxelPayload.entities?: FreeEntity[]` mit `{ position: [x, y, z], data }`. `position` sind Kommazahlen im Koordinatensystem der Nutzlast (Zelle 0/0/0 reicht von 0 bis 1), `data` ist das Entity-NBT (Compound mit `id`) **ohne** Positionsfelder (`Pos`, `TileX/Y/Z`, `block_pos`). Das Feld ist optional: Nutzlasten ohne Entities haben denselben Hash wie vorher, alte Sicherungen bleiben gültig.
- Validierung: höchstens so viele Entities wie Zellen, endliche Position innerhalb der Box ±1 Block, `data` mit Text-`id`, NBT-Budget wie bei BlockEntities.
- Blockinhalte (Schilder-Text, Truhen-/Fass-Inhalte, Banner, Bücher, Platten) stecken wie bisher in `blockEntities`; `blockEntityContent()` liest sie (Sponge-`Data`-Hülle, `Items`, `item`/`Book`/`RecordItem`, `front_text`/`back_text` oder alte `Text1–4`, `patterns`/`Patterns`, `CustomName`). Nur lesend.

## Geometrie

Hängende Entities (Gemälde, Rahmen, Leuchtrahmen) haben eine Ankerzelle und eine Richtung, aus denen sich die Mitte wie in Minecrafts `HangingEntity` ergibt: Anker + 0,5 − Richtung·0,46875, bei gerader Breite/Höhe um 0,5 nach links bzw. oben versetzt. Gemälde: 2D-`facing` (0 S, 1 W, 2 N, 3 E), alle Vanilla-Motive mit Größe in `PAINTING_VARIANTS`; Rahmen: 3D-`Facing` (0 unten, 1 oben, 2 N, 3 S, 4 W, 5 O). Übrige Entities: Ankerzelle = abgerundete Position, Blickrichtung aus `Rotation[0]` (0 = Süden, 90 = Westen).

Drehen/Spiegeln (`transformEntity`) dreht Position, Richtung, `Rotation` und spiegelt `ItemRotation`. Rahmen an Boden/Decke mit Gegenstand unter Drehung: Ausrichtung des Gegenstands nicht eindeutig → Problem `UNRESOLVED_ENTITY`, Export blockiert wie bei unaufgelösten Blockzuständen.

## Import und Export

| Format | Lesen | Schreiben |
|---|---|---|
| Litematica | Region-`Entities`, `Pos` relativ zur Region-`Position` | flache `Entities`-Liste mit `Pos`, hängend zusätzlich `TileX/Y/Z` und `block_pos` |
| Sponge v2/v3 | `Entities` `{Id, Pos, Data}` bzw. flach, `Pos` relativ zum Minimum | `Entities` `{Id, Pos, Data}` |

Entities ohne lesbare Position/`id` oder weit außerhalb der Box werden gezählt und im Bericht gewarnt; der Bericht nennt die übernommenen nach Art. Die Exportberichte führen `freeEntities`.

## Anzeige

Jede Entity wird in den Ansichten zu einer Pseudozelle mit dem reservierten Zustand `bauplaner:entity`, deren Eigenschaften die Form beschreiben (Art, Richtung, Motiv/Größe, Gegenstandsfarbe, Rüstungsfarben). Die Renderer zeichnen dafür eigene Formen (`entityQuads`): Gemälde als Farbmosaik je Motiv mit Holzrand (keine Mojang-Bilder), Rahmen, Rüstungsständer mit Rüstung und Arm, sonstige Entities als Markierung. Damit gelten Licht, Ebenenschnitt, Vorschaubilder und Auswahl ohne eigenen Pfad. Echte Blöcke gewinnen beim Nachbarraster, Entities verdecken keine Blockflächen.

- 3D: Klick auf eine Entity zeigt ihre Karte (Motiv, Richtung, Gegenstand, Ausrüstung); Klick auf einen Block mit Inhalt zeigt Schild-Text, Inhalt oder Bannermuster. `data-entities` am Canvas zählt die gezeichneten Entities.
- Steckbrief/Schem-Ansicht: „Ausstattung und Inhalte“ fasst alles zusammen. Ebenenblätter: Legende „Ausstattung“ je Ebene.
- Materialliste: Entities als Gegenstände (Gemälde, Rahmen, Rüstungsständer, Leine, Loren, Boote) mit Regel `entity`; Mobs als „nicht baubar“ (`mob`). Tabelle „Ausstattung und Inhalte“ listet Inhalte (Truhen, Rahmen, Rüstung) getrennt, CSV-Zeilen „Inhalt“.
- Bauanleitung: eigener letzter Schritt „Ausstattung“ je Bauteil nach der obersten Ebene, mit Liste (was, wo, Richtung, Gegenstände, Schild-Text); auch in Bauen-Ansicht und Druckblatt.

## Werkstatt

Bereich „Ausstattung“ im Blockeditor: Block wählen (Prüfen oder Klick in 3D), Art (Gemälde/Rahmen/Rüstungsständer), Richtung, Motiv, Gegenstand, Leuchtrahmen, Rüstungsmaterial und Arme wählen, „Anbringen an …“ bzw. „Aufstellen auf …“. Jede Änderung ist ein rückgängig machbarer Schritt (`Edit.entities` ersetzt die Liste); Speichern legt eine neue Version mit der Ausstattung an.

## Grenzen

- Kein Bearbeiten von Truhen-Inhalten oder Schild-Text in der Werkstatt (nur Anzeige).
- Verschieben/Drehen einer Auswahl in der Werkstatt bewegt Entities nicht mit; der Projekt-Blockreiter bearbeitet keine Entities.
- Drehen von BlockEntity-NBT (z. B. Schädel-`Rotation`) bleibt Teil von NBT-01.
- Nicht im Spiel geprüft: Laden exportierter Entities mit Litematica/WorldEdit auf Philipps PC.

## Tests

`tests/entities.test.mjs` (Geometrie gegen Minecraft-Werte, Drehung/Spiegelung, Litematica- und Sponge-Roundtrip, Inhalte, Materialliste, Bauanleitung, Draft), `tests/litematic.test.mjs` (echte Datei-Form mit negativer `Pos`), `tests/e2e/entities.e2e.mjs` (Werkstatt platzieren, Rückgängig, 3D-Zählung, Steckbrief, Ebenenlegende).
