# Weltbuilder (MAP-04)

Der Weltbuilder ist das Bearbeiten auf der Weltkarte (`#/karte`): Projekte setzen und Weltplan-Einträge (Bauplätze, Wege, Punkte) zeichnen, auswählen, löschen und umformen. Grundlage sind [WORLDMAP](WORLDMAP.md) (Lage der Projekte) und [LIVE_LINK](LIVE_LINK.md) (Weltplan, Werkzeuge, Spielanbindung). Auslöser: Philipp am 02.11.2026 – „im weltbuilder gibt es keine möglichkeit sachen zu löschen und zu entfernen, der Weltbuilder mehr in die tiefe ausbauen“. Löschen gab es bis dahin nur als Knopf ganz unten im Bearbeitungsfeld.

## Bedienung

| Was | Wie |
|---|---|
| Auswählen | Klick; Umschalt/Strg-Klick wählt dazu oder ab; Werkzeug „Rahmen“ (Taste A) oder Umschalt-Ziehen im Werkzeug „Auswählen“ zieht einen Auswahlrahmen; Strg+A wählt alles Sichtbare dieser Dimension; Escape hebt auf. In den Listen links gilt Klick/Umschalt-Klick genauso. |
| Löschen | Entf oder Rücktaste, Knopf „Löschen“ in der Auswahlleiste, Rechtsklick → „Löschen“, 🗑 in jeder Listenzeile, „Löschen“ im Bearbeitungsfeld. Weltplan-Einträge werden gelöscht; Projekte werden nur **von der Karte genommen** (Lage entfernt), das Projekt selbst bleibt und steht danach unter „Noch nicht platziert“. |
| Rückgängig | Ein gemeinsamer Verlauf für Weltplan und Projektlagen: ↶/↷, Strg+Z, Strg+Y bzw. Strg+Umschalt+Z, „Rückgängig“ in der Meldung. Eine Aktion auf mehreren Objekten ist ein Schritt. |
| Verschieben | Gewähltes ziehen (alles Gewählte zieht mit) oder Pfeiltasten auf der Karte (1 Block, Umschalt: 16 = ein Chunk). |
| Duplizieren | Strg+D, Auswahlleiste oder Menü. Kopien liegen östlich neben der Auswahl (2 Blöcke Abstand), heißen „… (Kopie)“; die Projektbindung eines Bauplatzes wird nicht mitkopiert. Projekte werden nicht dupliziert (ein Projekt hat genau eine Lage). |
| Drehen/Spiegeln | R (Umschalt+R gegenläufig), Auswahlleiste oder Menü: 90° um die ganzzahlige Mitte der Auswahl, Ost-West oder Nord-Süd spiegeln. Gilt für Weltplan-Einträge; Projekte dreht man im Editor. |
| Ans Gelände | Setzt die Höhe von Punkten (Boden + 1) und Bauplätzen (Median des Bodens + 1, bei großen Plätzen auf einem Raster bis 64×64 gemessen) aus Geländeaufnahme oder Live-Gelände. Unbekanntes Gelände bleibt unverändert und wird gemeldet. |
| Wegecken | Ist genau ein Weg gewählt, zeigt er Griffe: Ecke ziehen verschiebt sie, den runden Mittelpunkt ziehen fügt eine Ecke ein, Rechtsklick auf eine Ecke → „Wegecke löschen“ oder „Weg an dieser Ecke teilen“. Weitere Menüpunkte: „Wegrichtung umkehren“, bei zwei gewählten Wegen mit gemeinsamem Ende „Wege verbinden“. |
| Kontextmenü | Rechtsklick (Handy: lange drücken). Auf leerem Boden: Bauplatz/Weg/Punkt hier, Alles auswählen, Messen. |
| Ebenen | Projekte, Bauplätze, Wege, Punkte ein-/ausblenden (je Browser gemerkt). Ausgeblendetes ist weder sichtbar noch anklickbar und fällt aus der Auswahl; Zeichnen blendet die passende Ebene wieder ein. |
| Objektliste | Suche über Name, Notiz und Angaben, Filter nach Art, „Alle wählen“ für die Treffer, je Zeile „auf der Karte zeigen“ (⌖, auch Doppelklick) und Löschen. |

## Technik

- Fachkern `packages/domain/src/worldPlanEdit.ts` (rein, getestet in `tests/worldbuilder.test.mjs`): `removeItemsOp`, `selectionBounds`/`selectionPivot`, `itemsInRect`, `rotateColumn`/`rotateItem`, `mirrorColumn`/`mirrorItem`, `updateItemsOp`, `duplicateItems`, Wegecken (`pathVertexAt`, `movePathVertex`, `insertPathVertex`, `removePathVertex`, `reversePath`, `splitPath`, `joinPaths`), `groundHeight`/`alignToGround`.
- Drehen und Spiegeln rechnen auf Spaltenmitten um einen ganzzahligen Drehpunkt; dadurch bleibt alles im Blockraster, vier Vierteldrehungen bzw. zweimal Spiegeln ergeben exakt den Ausgang.
- `worldPlan.ts`: neue Operation `insert` (Eintrag an Listenposition). `remove` hat jetzt `insert` als Umkehrung statt eines Stapels über den ganzen Listenrest – Löschen von 2000 Einträgen hat eine lineare Umkehrung. Gespeicherte Daten und das Schema (Version 1) sind unverändert; die Mod bekommt weiterhin dieselben Einträge.
- `apps/web/src/views/map/useMapHistory.ts`: Verlauf aus Schritten (`plan` oder `project`). Alle Weltplan-Schritte einer Änderung werden als ein Batch gespeichert, jede Projektlage mit eigener Revisionsprüfung. Ändert ein anderer Tab den Weltplan (`useWorldPlan().epoch`), wird der Verlauf verworfen.
- `OverviewMap.tsx` (Eigenschaft `plan`): Auswahlmengen, Rahmen, Griffe, Kontextmenü-Ereignis, Langdruck (550 ms), Pfeiltasten. `Builder.tsx`: Auswahlleiste, Kontextmenü, Ebenen, Objektliste. Tastenkürzel außerhalb der Zeichenfläche hört `WorldMapView` am Fenster ab, nie in Eingabefeldern.

## Grenzen

- Projekte lassen sich auf der Karte verschieben und von der Karte nehmen, aber nicht drehen, spiegeln oder duplizieren (das gehört in Editor bzw. Projektzentrale).
- Ein Projekt ganz löschen geht weiter nur in der Projektzentrale.
- Gruppen mit eigenem Namen und Sperren einzelner Einträge gibt es nicht: dafür müsste das Weltplan-Schema wachsen, das auch die Mod liest. Ebenen sind deshalb reine Ansicht.
- Langdruck auf Touch-Geräten ist nur im Browser automatisch abgedeckt, ein echtes Gerät fehlt (MAP-04-S06).
