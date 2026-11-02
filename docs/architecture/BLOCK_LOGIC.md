# Echte Blocklogik 26.3 (BLOCK-01)

Stand 02.11.2026. Ziel: Der Planer behandelt Minecraft-Blöcke so, wie das Spiel sie behandelt – mit allen Zuständen, Verbindungen, Halt- und Schwerkraftregeln – und leitet daraus Bauschritt-Reihenfolge, Platzierprüfung und Material ab.

## Woher die Fakten kommen

Nichts ist geschätzt oder von Hand abgetippt. Die Fakten stammen aus dem **offiziellen Minecraft-26.3-Server** (`server.jar` SHA-1 `33680f5f2ac32864d6d7cf5e56a705fdb3e05f4c`, DataVersion 5023), auf zwei Wegen:

1. **Datengenerator-Berichte** (`java -DbundlerMainClass=net.minecraft.data.Main -jar server.jar --reports`): `blocks.json` (alle 1286 Blöcke, alle Property-Werte in Spielreihenfolge, Standardzustand; SHA-256 `7a0de8aa…`, derselbe Bericht wie für [WORLD_IMPORT](WORLD_IMPORT.md)), Item-Komponenten (Stapelgröße) und Block-Tags.
2. **Prüfprogramm** [`scripts/probe/BlockFactsProbe.java`](../../scripts/probe/BlockFactsProbe.java): startet die Spielklassen (Bootstrap, Vanilla-Tags gebunden) und fragt für **jeden der 35.723 Zustände** den echten Spielcode:
   - `isFaceSturdy` je Seite für FULL/CENTER/RIGID (worauf Fackeln, Schienen, Laternen halten),
   - `canSurvive` allein, mit einem Steinblock je Richtung, auf 73 Böden (alle Mitglieder der `supports_*`-Tags) und mit Wasser neben dem Boden (Zuckerrohr), im Dunkeln (Pilze),
   - welche Nachbarzustände genau halten (Regel = Stützart, Ausnahmen als Block-/Zustandsliste),
   - `canBeReplaced`, Licht, Flüssigkeit, `isSolid`, Abdeckung der Mauer-Testflächen (für hohe/niedrige Mauerseiten),
   - Klasse (FenceBlock, WallBlock, FallingBlock …), `asItem`, Härte, Werkzeugpflicht, `Fallable`.
   Zusätzlich erzeugt es **Prüfvektoren**: zufällige Nachbarschaften, auf die das Spiel `updateShape` bzw. `canSurvive` anwendet.

[`scripts/gen_block_facts.mjs`](../../scripts/gen_block_facts.mjs) verdichtet das zu [`packages/voxel/src/blockFacts.ts`](../../packages/voxel/src/blockFacts.ts) (188 KB, 543 verschiedene Zustandsfakten, je Block die bestimmenden Properties) und [`fixtures/blocks/block-vectors-26.3.json`](../../fixtures/blocks/block-vectors-26.3.json) (3.060 Vektoren). Lizenz wie [ADR-020](DECISIONS.md): nur Fakten (IDs, Werte, Zahlen, Tag-Mitgliedschaften), keine Mojang-Dateien, kein Spielcode im Repository.

Neu erzeugen für eine andere Version: Server-Jar laden, Berichte erzeugen (entpackt `versions/` und `libraries/`), Prüfprogramm kompilieren und starten, Generator aufrufen – die Befehle stehen im Kopf beider Skripte. Braucht Java 25.

## Module

| Modul | Inhalt |
|---|---|
| `voxel/src/blocklogic/facts.ts` | Zugriff: `blockFacts`, `stateFacts`, `completeState`, `inTag`, `hasClass`, `itemOf`, `stackOfItem`, Richtungen. |
| `voxel/src/blocklogic/connect.ts` | Verbindungen wie im Spiel: `settleState`, `connectFamily`, `fenceConnects`, `wallConnects`, `paneConnects`. |
| `voxel/src/blocklogic/support.ts` | Halt: `survives` (mit `heldBy`), `supportNeed`, `falls`, `fallingState`, `letsFallThrough`. |
| `domain/src/placement.ts` | Platzierprüfung `checkPlacement`, `settlePayload`, Hilfsmittel (Eimer). |
| `domain/src/editor/settle.ts` | Werkstatt: `settleEdit` als ein rückgängig machbarer Schritt. |
| `domain/src/guide.ts` | Bauphasen aus den Fakten, Phase „Hängende Blöcke“, Halt-Voraussetzungen. |

## Verbindungen

Minecraft speichert Verbindungen nicht als Wahl des Bauenden; sie folgen aus den Nachbarn. `settleState` bildet das für diese Familien nach:

- **Zäune**: gleiche Zaunart (Holz mit Holz, Netherziegel mit Netherziegel), Zauntore in passender Achse, feste Seitenflächen – außer Laub, Barriere, Kürbis/Melone, Shulkerkisten.
- **Mauern**: Mauern, Gitter/Scheiben, Tore, feste Seiten; Seite **hoch**, wenn der Block darüber die Seitenfläche abdeckt; Pfosten nach der Spielregel (Ecken/Enden immer, gerade hohe Mauer nie, sonst Pfostenblock oder Abdeckung darüber).
- **Glasscheiben, Eisen- und Kupfergitter**: untereinander, mit Mauern und festen Seiten.
- **Treppen**: innere/äußere Ecken aus Vorder- und Rückseite (gleiche Hälfte, quer stehende Treppe, `canTakeShape`).
- **Zauntore** `in_wall`, **Schneegras/Myzel/Podsol** `snowy`, **Pilzblöcke** (Seiten zu gleichen Pilzblöcken).

Reihenfolge beim ganzen Modell: Treppen zuerst (ihre Form ändert die Flächen, die Zäune sehen), dann Mauern von oben nach unten, dann der Rest. Ergebnis wiederholt angewendet ändert nichts mehr.

## Halt und Schwerkraft

`survives` beantwortet „bleibt der Block hier?“ wie `canSurvive`: allein haltend, gehalten aus einer Richtung (mit der gemessenen Stützart und Ausnahmen), auf passendem Boden (Tag), mit Wasser neben dem Boden oder hängend. Sonderregeln, die mehrere Blöcke ansehen: Kaktus (keine festen Nachbarn), Zuckerrohr (Wasser am Boden), Gerüst (Abstand < 7), Ranken (jede Seite an fester Fläche oder unter einer Ranke mit derselben Seite). Pilze halten auf weiteren Böden nur im Dunkeln; da das Licht vom fertigen Bau abhängt, gilt das als Annahme (`assumed`). `falls` folgt `FallingBlock.isFree` (Luft, Feuer, Flüssigkeit, ersetzbare Blöcke); gilt für alle `Fallable`-Blöcke, die allein halten (Sand, verdächtiger Sand/Kies, Beton­pulver, Ambosse, Drachenei).

Bekannte Grenze: Feuer (hält an brennbaren Nachbarn; kein Bauitem) wird nicht nachgebildet; Stützausnahmen sind über eine Auswahl von ~2.000 Nachbarzuständen gemessen, ungemessene Zustände folgen der Stützart.

## Platzierprüfung

`checkPlacement(payload)` meldet: **ohne Halt** (bricht ab), **fällt herunter**, **zweite Hälfte fehlt** (Türen, Betten, Doppelpflanzen), **Verbindung anders als im Spiel** (mit dem Zustand, den das Spiel zeigt) und **ungültiger Zustand**. Zellen außerhalb der Auswahl gelten als Umgebung: ein Halt dort wird nur gezählt („hängt von der Umgebung ab“), nie als Fehler gemeldet. Hilfsmittel: Wassereimer für Quellen und wassergeflutete Blöcke, Lavaeimer.

Oberfläche: Bauanleitung → aufklappbare **Spielprüfung** (wird erst beim Öffnen berechnet, „Schritt zeigen“ springt zum Bauschritt). Werkstatt → **⛓ Wie im Spiel verbinden** (ganzes Modell oder Auswahl, rückgängig machbar) und **✓ Spielprüfung**.

## Bauschritt-Reihenfolge

`phaseOf` nutzt die Fakten statt Namenslisten: Flüssigkeit (LiquidBlock), Schwerkraft (Fallable und allein haltend), angebracht (hält nicht allein: Fackeln, Türen, Teppiche, Pflanzen, Schienen, Gerüst …), sonst Grundblöcke. Neu ist die Phase **Hängende Blöcke** (Laternen mit `hanging=true`, Hängeschilder, Trauerranken …): ihr Schritt kommt nach der Schicht, die sie hält, Ketten von oben nach unten. Angebrachte, hängende und Schwerkraftblöcke bekommen den Schritt der tatsächlich haltenden Zelle als Voraussetzung; Blöcke ohne Halt im Plan stehen als Hinweis am Schritt.

Folge: Schritte, deren Blöcke die Phase wechseln (z. B. Türen jetzt „angebracht“), bekommen eine neue Schritt-ID; alte Haken dazu erscheinen als verwaist und können entfernt werden.

## Material

`itemsForCell` nimmt für Blöcke ohne eigene Katalogregel das Item, das das Spiel per `asItem` setzt (vorher „Item = Block angenommen“); Blöcke ohne Item werden als „kein Item“ gemeldet. `stackSizeOf` liest die echte Stapelgröße aus dem Item-Bericht (Schilder/Banner 16, Betten 1, Türen 64 …). Die Werkstatt-Palette nutzt die vollständigen Property-Listen und Standardwerte des Spiels (geplantes Laub bleibt `persistent=true`).

## Nachweis

- `tests/block-logic.test.mjs`: Fakten gegen den Bericht und die Standardzustandstabelle, Stützflächen/Halt/Items/Stapel, **alle 3.060 Spielvektoren**, Wasser/Kaktus/Gerüst, Platzierprüfung, Verbinden (idempotent), Werkstatt-Schritt, Bauanleitung mit hängender Laterne, Material.
- Lokal zusätzlich 42.000 Vektoren (2.000 je Familie, 16.000 Halt): alle gleich außer 9 Feuer-Fällen (bewusst nicht nachgebildet) und 6 Pilz-Fällen (Prüfwelt hell, Planer nimmt Dunkelheit an).
- Katalog: 339 Versionen, 136.863 Blöcke in 246 ms geprüft; 140 Blöcke ohne Halt (109 Laternen unter Luft …), 1.239 Verbindungen anders als im Spiel.
