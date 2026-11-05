# Weltbuilder (MAP-04)

Der Weltbuilder ist das Bearbeiten auf der Weltkarte (`#/karte`): Projekte setzen und Weltplan-Einträge (Bauplätze, Wege, Punkte) zeichnen, auswählen, löschen und umformen. Grundlage sind [WORLDMAP](WORLDMAP.md) (Lage der Projekte) und [LIVE_LINK](../team/LIVE_LINK.md) (Weltplan, Werkzeuge, Spielanbindung). Auslöser: Philipp am 02.11.2026 – „im weltbuilder gibt es keine möglichkeit sachen zu löschen und zu entfernen, der Weltbuilder mehr in die tiefe ausbauen“. Löschen gab es bis dahin nur als Knopf ganz unten im Bearbeitungsfeld.

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

- Fachkern `packages/domain/src/world/worldPlanEdit.ts` (rein, getestet in `tests/unit/world/worldbuilder.test.mjs`): `removeItemsOp`, `selectionBounds`/`selectionPivot`, `itemsInRect`, `rotateColumn`/`rotateItem`, `mirrorColumn`/`mirrorItem`, `updateItemsOp`, `duplicateItems`, Wegecken (`pathVertexAt`, `movePathVertex`, `insertPathVertex`, `removePathVertex`, `reversePath`, `splitPath`, `joinPaths`), `groundHeight`/`alignToGround`.
- Drehen und Spiegeln rechnen auf Spaltenmitten um einen ganzzahligen Drehpunkt; dadurch bleibt alles im Blockraster, vier Vierteldrehungen bzw. zweimal Spiegeln ergeben exakt den Ausgang.
- `worldPlan.ts`: neue Operation `insert` (Eintrag an Listenposition). `remove` hat jetzt `insert` als Umkehrung statt eines Stapels über den ganzen Listenrest – Löschen von 2000 Einträgen hat eine lineare Umkehrung. Gespeicherte Daten und das Schema (Version 1) sind unverändert; die Mod bekommt weiterhin dieselben Einträge.
- `apps/web/src/views/map/useMapHistory.ts`: Verlauf aus Schritten (`plan` oder `project`). Alle Weltplan-Schritte einer Änderung werden als ein Batch gespeichert, jede Projektlage mit eigener Revisionsprüfung. Ändert ein anderer Tab den Weltplan (`useWorldPlan().epoch`), wird der Verlauf verworfen.
- `OverviewMap.tsx` (Eigenschaft `plan`): Auswahlmengen, Rahmen, Griffe, Kontextmenü-Ereignis, Langdruck (550 ms), Pfeiltasten. `Builder.tsx`: Auswahlleiste, Kontextmenü, Ebenen, Objektliste. Tastenkürzel außerhalb der Zeichenfläche hört `WorldMapView` am Fenster ab, nie in Eingabefeldern.

## Grenzen

- Projekte lassen sich auf der Karte verschieben und von der Karte nehmen, aber nicht drehen, spiegeln oder duplizieren (das gehört in Editor bzw. Projektzentrale).
- Ein Projekt ganz löschen geht weiter nur in der Projektzentrale.
- Sperren einzelner Einträge gibt es nicht. Benannte Ebenen (seit MAP-06) sind ein Feld am Eintrag und reisen in den Weltplan, in Sicherungen und (ab Mod-Protokoll 2) ins Spiel; welche Ebene ausgeblendet ist, merkt sich nur der Browser.
- Langdruck auf Touch-Geräten ist nur im Browser automatisch abgedeckt, ein echtes Gerät fehlt (MAP-04-S06).

## Vertiefung (MAP-06)

Auslöser: Philipp am 02.11.2026 – „Weiterentwicklung der Weltkarte mit mehreren Funktionen, sauber in die Tiefe strukturiert, mitplanen von besserer Anbindung der Mod“. Der Weltplan hat seit dieser Runde **Schema 2** ([LIVE_LINK](../team/LIVE_LINK.md#weltplan)); Schema 1 wird weiter gelesen.

| Was | Wie |
|---|---|
| Zonen | Werkzeug „Zone“ (Taste Z): Ecken klicken, Eingabe/Doppelklick schließt (mindestens drei, höchstens 256 Ecken). Art (Wohnen, Farmen, Industrie, Lager, Natur, Gefahr, Verkehr, Sonstiges) mit eigener Farbe, Fläche nach der Schnürformel. Zonen sind wie Wege umformbar (Ecken ziehen, Mittelpunkt auch auf der Schlussseite fügt eine Ecke ein, Rechtsklick → „Zonenecke löschen“), drehbar, spiegelbar, duplizierbar, ohne Geländehöhe. Treffer: Rand und Ecken vor dem Inneren, kleine Zonen vor großen, Bauplätze/Wege/Punkte vor Zonen. |
| Benannte Ebenen | Jeder Eintrag kann in einer Ebene liegen (Feld „Ebene“ im Bearbeitungsfeld mit Vorschlagsliste, oder „Ebene zuweisen“ in der Auswahlleiste mit „Neue Ebene …“ – ein Rückgängig-Schritt für alle gewählten). Unter „Benannt:“ lassen sich Ebenen ausblenden (je Browser gemerkt, „alle zeigen“); Ausgeblendetes ist unsichtbar, nicht anklickbar und fällt aus der Auswahl. Die Objektliste filtert nach Ebene („ohne Ebene“ eingeschlossen) und zeigt die Ebene als Chip. |
| Farben | Eigene Farbe je Eintrag (Farbfeld, „Standard“ stellt die Art-Farbe zurück); Bauplätze mit Projekt behalten die Projektfarbe. |
| Punktarten | Neu: Notiz, Gefahr, Rohstoff, Spawn/Bett, Aussicht (im Feld „Art“ mit „(Mod ab marks2)“ gekennzeichnet). Notizen stehen bei Auswahl oder ab Maßstab 6 als Text auf der Karte; Kontextmenü „📝 Notiz hier setzen“, „⚠ Gefahr hier markieren“, „Zone hier beginnen“. |
| Messen mit mehreren Punkten | Messen (M): jeder Klick fügt einen Punkt an, Rücktaste nimmt zurück, Eingabe/Doppelklick beendet, Escape löscht. Anzeige: Luftlinie, Weg zu Fuß (Raster), ΔX/ΔZ, Höhe Start → Ende mit Auf-/Abstieg, Nether-Entfernung, ab drei Punkten Anzahl und Fläche des Polygons. |
| Höhenprofil | Ist ein Weg gewählt und Gelände bekannt (Live-Chunks oder Geländeaufnahme), zeigt das Bearbeitungsfeld das Profil entlang der Wegspalten (Linie, Wasser blau, unbekannt grau): Y-Bereich, Auf-/Abstieg, größte Stufe, Stufen ab 2 Blöcken („Treppe nötig“). |
| Route übers Gelände | „⤳ Route übers Gelände“ führt jeden Abschnitt des Wegs per A* über die Geländespalten (vierfach verbunden, Stufen bis 1 Block, Steigung und Wasser kosten mehr, Lava und Unbekanntes sperren), vereinfacht die Spur (Douglas–Peucker, höchstens 256 Ecken) und ersetzt den Weg als ein Rückgängig-Schritt. Abschnitte ohne Route bleiben gerade und werden gemeldet. Suchraum: die Box der Endpunkte plus 48 Blöcke Rand, höchstens 400 000 Spalten. |
| Mit der Mod | Kasten „Spiel“: „📍 Punkt, wo ich stehe“ (Anker mit Spielhöhe und Uhrzeit), „Spur als Weg“ (die aufgezeichnete Spur als Weg, vereinfacht), Entfernung und Richtung vom Spieler zum gewählten Eintrag in der Auswahlleiste, Mitspieler in Sichtweite (Mod mit `players`). „Weltplan ins Spiel senden“ und der automatische Abgleich schicken einer Mod ohne `marks2` nur, was sie versteht, und nennen den Rest. |

Technik: `worldPlan.ts` (Zonen, `layer`/`color`, `itemColor`, `layerNames`, `insideZone`, `zoneArea`, `zonesAt`), `worldPlanEdit.ts` (Ecken für Wege **und** Zonen, `setLayerOp`), neu `worldRoute.ts` (`measureSummary`/`measureText`, `lineColumns`, `pathProfile`, `routeOverTerrain`, `simplifyLine`, `routePath`, `trailToPath`), `liveLink.ts` (`marksForMod`, `readLivePlayers`, Protokoll 1 und 2). Oberfläche: `OverviewMap.tsx` (Zone/Messen-Entwürfe, Mitspieler-Pfeile), `Builder.tsx` (`LayerPicker`, benannte Ebenen, Ebenenfilter), `PlanPanel.tsx` (`PathProfileView`), `WorldMapView.tsx`. Tests: `tests/unit/world/worldplan.test.mjs`, `tests/unit/world/worldbuilder.test.mjs`, `tests/unit/world/worldroute.test.mjs`, `tests/unit/team/livelink.test.mjs`, Browser `tests/e2e/map-depth.e2e.mjs`.
