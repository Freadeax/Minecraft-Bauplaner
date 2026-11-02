# Weltkarte (MAP-01, früher B15)

Stand: 01.11.2026 · Roadmap-ID MAP-01 · Route `#/karte`

Die Weltkarte zeigt alle Projekte an ihren Koordinaten in einer Minecraft-Welt. Man fliegt frei darüber, prüft Abstände und Überschneidungen und sieht, welche Teile laut Bauanleitung schon gebaut sind. Eine externe Live-Karte des Servers (BlueMap, Dynmap, Pl3xMap …) lässt sich verknüpfen, damit Plan und echte Welt nebeneinander verglichen werden können.

## Datenvertrag

- `Project.world?: WorldPlacement` – optional, fehlt bei nicht platzierten Projekten.
  - `schemaVersion: 1`, `origin: [x, y, z]` (ganze Zahlen; X/Z innerhalb ±29 999 984, Y von −2032 bis 2031), `dimension` (Namespace-ID, z. B. `minecraft:overworld`, Mod-Dimensionen erlaubt), `hidden`, `note` (≤ 300 Zeichen).
- **Weltkoordinate = Projektkoordinate + Ursprung**, für jede Zelle. Es gibt keine zweite Koordinatenregel: Karte, Bauanleitung und Schem-Export beschreiben dieselben Blöcke; die Karte verschiebt nur.
- Änderung ausschließlich über die Operation `world.set` (`project.ts`) mit exakter Umkehrung (Rückgängig), validiert durch `checkWorldPlacement`. Sicherungen prüfen das Feld in `checkProjectRecord`.

## Ableitung (`packages/domain/src/worldmap.ts`)

`buildWorldMap(projects, versions, { dimension, maxCells, showHidden })` ist rein und deterministisch:

1. Jedes Projekt der Dimension wird mit dem gemeinsamen Kern aufgelöst (`resolveProject`, `buildGuide`, `evaluateProgress`).
2. Sichtbare Blockzellen werden um den Ursprung verschoben und in eine Anzeigeliste mit gemeinsamer Palette übernommen. Pro Zelle: besitzendes Projekt (`owner`) und Fortschritt (`progress`: 0 offen, 1 abgehakt, 2 abgehakt, aber Geometrie seitdem geändert).
3. **Überschneidungen zwischen Projekten:** AABB als Vorfilter, dann je Voxel einschließlich geforderter Luft und Löschzellen. Gleiche Zustände zählen als „identisch“, alles andere als Widerspruch mit erster Beispielposition. Die Karte entscheidet nichts; beide Pläne bleiben vollständig sichtbar. Ausgeblendete Projekte nehmen an der Prüfung teil.
4. Anzeigebudget `MAP_MAX_CELLS` (1,5 Mio. Blöcke): Ein Projekt, das nicht mehr passt, wird mit Grund „über dem Anzeigebudget“ gelistet, nie abgeschnitten.
5. `topViews` liefert je Projekt den höchsten Block je X/Z-Säule für die Draufsicht.

Die zusammengeführten Zellen sind **Anzeigedaten, kein Bauplan**, und werden nie exportiert. **Gelände:** Ohne Geländeaufnahme kennt die Karte nur geplante Blöcke (`TERRAIN_NOTE`, sichtbar auf der Seite). Projekte mit Geländeaufnahme (TERRAIN-01) zeigen ihr Gelände in Draufsicht und 3D, die Geländehöhe unter dem Zeiger und eine Erdarbeiten-Schätzung mit Höhenvorschlag ([TERRAIN](TERRAIN.md)).

`suggestPlacement` setzt ein neues Projekt östlich aller vorhandenen der Dimension, mit 8 Blöcken Abstand, chunkbündig (X-Kante auf Vielfachem von 16), Unterkante auf Y 64.

## Oberfläche (`apps/web/src/views/map/`)

- `WorldMapView.tsx`: Dimension, Färbung (Blöcke / Projekte / Fortschritt), Rundflug, Projektliste mit Fortschrittsbalken, „Noch nicht platziert“ mit „Platzieren“, Detailbereich mit Kennwerten (Ursprung, Bauplatz-Ecken, Chunks), Überschneidungswarnungen und Lageformular. Auswahl und Dimension stehen in der Adresse (`#/karte?projekt=…&dim=…`).
- `OverviewMap.tsx`: Draufsicht als Canvas, Norden oben. Raster für Blöcke, Chunks (16) und Regionen (512), Weltachsen, Koordinaten/Chunk/Region unter dem Zeiger, Ziehen, Mausrad, zwei Finger, Pfeil- und Plus/Minus-Tasten. Klick wählt, Doppelklick fliegt hin. Rote Kreuze markieren Überschneidungen.
- 3D: der vorhandene Viewer (Orbit, freier Flug WASD/Touch-Pad, Ansichten). Neu ist nur die optionale Eigenschaft `frameRequest` („Hinfliegen“).
- `PlacementForm.tsx`: Ursprung, ±16-Schritte, Dimension (auch Mod-Dimension), Notiz, Ausblenden. Jede Eingabe zeigt sofort eine Umrissvorschau in Draufsicht und 3D und nennt berührte Nachbarflächen.
- `map.worker.ts`/`transport.ts`: Die Berechnung läuft in einem Worker; Zellen kommen als ein übertragbares `Int32Array` zurück. Ohne Worker-Unterstützung wird auf dem Hauptthread gerechnet.

## Live-Karte mit Spielanbindung und Weltplan (MAP-03)

Seit MAP-03 plant man direkt auf der Draufsicht (Bauplätze, Wege, Punkte, Messen, Projekte ziehen, Rückgängig) und verbindet die Karte über die Bauplaner-Mod live mit dem eigenen Spiel (Position, Gelände der geladenen Chunks, Hologramm-Fortschritt, Plan und Markierungen ins Spiel). Vertrag, Sicherheit und Protokoll: [LIVE_LINK](LIVE_LINK.md).

Seit MAP-04 (Weltbuilder) lässt sich alles auf der Karte mehrfach auswählen, löschen (Entf, Rechtsklick, Listen), verschieben, duplizieren, drehen, spiegeln und ans Gelände ausrichten; Wegecken sind direkt bearbeitbar, Ebenen blenden Arten aus, ein Verlauf deckt Weltplan und Projektlagen ab: [WORLD_BUILDER](WORLD_BUILDER.md).

## Server-Livekarte (Verknüpfung, keine Datenquelle)

Die LMNT-Website (`lmnt-gaming.net`, Seiten Start, Gameserver, Tools) zeigt am 28.10.2026 keine öffentliche Live-Karte; der Minecraft-Server ist dort als geschlossen geführt. Es wird nichts von einer Karte gelesen oder gescrapt. Stattdessen:

- **Link einfügen:** Ein aus der Adresszeile der Live-Karte kopierter Link wird mit `liveMapTemplateFromLink` in eine URL-Vorlage für den vorhandenen Adapter `livemap.ts` (B15-L) umgewandelt. Erkannt werden:
  - BlueMap `#<karte>:<x>:<y>:<z>:<distanz>:<drehung>:<winkel>:<neigung>:<ortho>:<modus>` – Quelle: BlueMap-Webapp `BlueMapApp.js`, `updatePageAddress`/`loadPageAddress` (zehn Teile).
  - Dynmap `?worldname=…&mapname=…&zoom=…&x=…&y=…&z=…` – Quelle: Dynmap `web/js/map.js`, `getLink`.
  - `?world=…&x=…&z=…` (Pl3xMap und ähnlich) – Quelle: Pl3xMap `webmap/src/control/LinkControl.ts`.
  - squaremap wird nicht eigens angeboten (Format nicht an einer Primärquelle geprüft).
- **Echte Links in jedem Feld:** Abschnitt heißt „Server-Webkarte verknüpfen“ (getrennt von der Spielverbindung über die Mod). Ein echter Link ohne Platzhalter wird auch im Feld „URL-Vorlage“ oder in einem Kartennamen-Feld umgewandelt statt abgewiesen; „gilt für“ wählt die Dimension. Ein früher gespeicherter roher Link wird beim Laden repariert (`repairPastedLink`, Oberwelt). Name, Vorlage, Kartennamen, Einbetten und Export stehen unter „Erweitert“. Rückmeldung Philipp 02.11.2026 (BlueMap `http://…:8100/#1026:…`).
- **Gemischte Inhalte:** Eine `http://`-Karte kann in die `https`-Seite nicht eingebettet werden (der Browser blockiert sie still). Dann gibt es statt des leeren Rahmens den Hinweis und „in neuem Tab öffnen“ (`blockedAsMixedContent`). Links in neuen Tabs funktionieren auch mit `http`.
- **Vorlagen** für BlueMap, Dynmap und Pl3xMap mit Platzhalter-Server; die Kameraparameter sind die üblichen Startwerte.
- Je Projekt der Link „Auf <Karte> zeigen“ zur Mitte der Grundfläche, Höhe = Oberkante des Plans.
- Optionales Einbetten per `iframe` (Sandbox, kein Referrer). Viele Kartenserver verbieten das Einbetten; dann bleibt nur der Link.
- Downloads: Marker im Bauplaner-Austauschformat (`createLiveMapMarkerFile`, kein natives Plugin-Format) und Weltlagen als JSON.
- Die Einstellung liegt nur im Browser (localStorage). Gespeicherte, geteilte Kartenziele und native Markerdateien gehören zu MAP-02.

## Prüfung

- `tests/worldmap.test.mjs`: Validierung, Rückgängig, Sicherung; Zelle für Zelle Welt = Projekt + Ursprung; Dimensionen, nicht platzierte, leere und ausgeblendete Projekte; Überschneidungen gegen Handzählung; Fortschritt je Zelle inkl. „prüfen“ nach Drehung; Budget; Platzierungsvorschlag; Draufsicht; Determinismus; Marker und Link-Übernahme für alle drei Formen.
- `tests/e2e/worldmap.e2e.mjs` (1400 und 390 px): zwei Projekte platzieren, Hinfliegen ändert die Kamera, Freiflug, Draufsicht-Koordinaten, Überschneidung mit Vorschau und Warnung, Rückgängig, Neuladen, Dimension, Live-Link mit erwarteter Koordinate, Markerdownload, kein waagerechtes Scrollen, keine Konsolenfehler.

## Grenzen

- Gelände nur, wo eine Geländeaufnahme gespeichert ist, und nur als Höhenkarte (keine Höhlen/Überhänge); sonst bleiben Fundament, Höhe und Umgebung ungeprüft.
- Fortschritt stammt aus den Haken der Bauanleitung, nicht aus einer Messung im Spiel (die Spielbrücke ergänzt das je Projekt).
- Livekarten-Vorlagen sind aus Quelltext abgeleitet, aber nicht gegen einen laufenden Kartenserver geprüft. GPU- und Touch-Prüfung auf echten Geräten offen (QA-02).
