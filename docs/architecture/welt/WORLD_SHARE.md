# Weltplan und Karten über das Internet teilen (WORLD-SHARE-01)

Stand: 06.11.2026 · Mod und Paper-Plugin 0.22.0 · Philipps Regel vom 06.11.: „Wir benutzen keine Daten runterladen und dann irgendwo einfügen – alle Systeme müssen über das Internet kommunizieren.“

## Was vorher war

- Den Weltplan (Bauplätze, Wege, Zonen, Punkte, Gruppen, Sperren) bekam nur die **eigene** Mod über `127.0.0.1` (`POST /v1/marks`). Mitspieler sahen ihn nicht, der Server gar nicht.
- BlueMap-/Dynmap-Marker gab es nur als Datei: `.conf`-Block in die Kartenkonfiguration einfügen bzw. `dmarker`-Befehle in die Konsole tippen. Die Kartenliste ging als JSON-Datei von Browser zu Browser, die Lagen als JSON-Download.

## Was jetzt gilt

```
Planer (Weltkarte) ──PUT doc/weltplan──▶ Team-Raum ──push {type:doc}──▶ Mods des Teams (Hologramm, Marken, Sperren grau)
       ▲   │                                   │
       │   └──PUT doc/karten──▶                └──push {type:doc}──▶ Paper-Plugin ──▶ BlueMap / Dynmap (Marker), Sperrschutz
       └── andere Planer des Teams (Abgleich je Eintrag)
```

1. **Team-Raum** (`services/team-room`, Protokoll `team-room` 1): geteilte Dokumente neben den Ereignissen. `GET /v1/rooms/{room}/doc/{name}` und `PUT …/doc/{name}` mit `name` ∈ `weltplan`, `karten`; höchstens 4 MB JSON-Objekt, gespeichert in Stücken wie Planstände. Jede Fassung zählt `rev` hoch, `If-Match: <rev>` macht aus einem verlorenen Wettlauf 409 statt stillem Überschreiben. `?known=<rev>` antwortet nur `{unchanged:true}` (billiges Nachfragen). Planerschlüssel (Mitglied, Bauleitung) schreiben, der **Serverschlüssel liest nur**. Jede neue Fassung geht als `{type:'doc', name, rev, by, at}` an alle Verbindungen; `welcome`/`GET …/` nennen die aktuellen Stände in `docs`.
2. **Planer** (`apps/web/src/views/map/useWorldShare.ts`, Kasten „Weltplan im Team“ über der Spielverbindung): Wählt einen Team-Raum aus den Projekten mit Live-Team (Standard: das erste). Alle 8 s, beim Fokus und kurz nach jeder eigenen Änderung: Raumstand holen, mit dem eigenen Weltplan **dreiseitig je Eintrags-ID** zusammenführen (`mergeWorldItems`, Basis = letzter gemeinsamer Stand im `localStorage`), Ergebnis lokal speichern und – wenn es vom Raum abweicht – mit `If-Match` zurückschreiben. Regeln: nur eine Seite geändert → diese Seite; beide geändert → der Raum (der andere war zuerst) und ein Hinweis; im Raum gesperrte Einträge ändert dieser Browser nie. Mit dem Weltplan gehen fertige **Marker je Dimension** mit (`mapShapes`, dieselben Formen wie die alten Exporte); Projekte anderer Dimensionen behält der Raum von dem Browser, der sie berechnet hat (`mergeShapes`). Die gespeicherten Server-Webkarten und die verknüpfte Karte laufen genauso über `karten` (`mergeMapLists`).
3. **Mod** (`RoomClient.onDoc`, `LiveLink.sharedWorld`): folgt `weltplan` nach dem Verbinden, bei jedem Push und im HTTP-Ersatzbetrieb alle 15 s. Sie schneidet den Weltplan auf die Dimension des Spielers zu (`WorldMarks.shared`, höchstens 500 je Dimension) und wechselt beim Dimensionswechsel mit. Damit sieht **jeder Spieler des Teams** Bauplätze, Gruppen und gesperrte Flächen, nicht nur der mit offenem Planer. Der Weg über `127.0.0.1` bleibt für den eigenen Rechner.
4. **Paper-Plugin** (`WorldModule`, `WorldShare`, `MapMarkers`): holt `weltplan` mit dem Serverschlüssel, merkt ihn je Team in `team/<teamId>.weltplan.json` und schreibt die Marker **selbst** in BlueMap (API 2: `BlueMapAPI.onEnable`, `getWorld(World)`, `BlueMapMap.getMarkerSets`, `ShapeMarker`/`ExtrudeMarker`/`LineMarker`/`POIMarker`) und Dynmap (`getMarkerAPI`, `createMarkerSet`/`createAreaMarker`/`createPolyLineMarker`/`createMarker`). Beide über Reflexion: keine Abhängigkeit zur Übersetzungszeit (BlueMaps API ist Java-21-Code, das Plugin Java 17), ohne Kartenplugin läuft alles weiter. Sets `bauplaner-projekte` … `bauplaner-punkte` wie die alten Exporte; sie sind nicht dauerhaft gespeichert und werden nach jedem Start aus dem gemerkten Weltplan neu geschrieben. Mehrere Teams auf einem Server bekommen Marker-IDs mit Team-Präfix.
5. **Sperrschutz (optional):** `weltplan.sperren` in der `config.yml` bzw. `/bauplaner weltplan sperren aus|hinweis|sperren` (Bauleitung). `hinweis` schreibt eine Chatzeile, `sperren` verhindert Setzen, Abbauen und Eimer in gesperrten Bauplätzen, Zonen und Wegen (Säulen nach denselben Regeln wie die Mod, `MarkAreas`); `bauplaner.weltplan.umgehen` ist ausgenommen. Standard `aus`.

## Notfall ohne Internet

Die Dateiwege (BlueMap-`.conf`, Dynmap-Befehle, Markerdatei, Lagen-JSON, Kartenliste als Datei) stehen im Weltkarten-Bereich „Server-Webkarte verknüpfen“ nur noch eingeklappt unter „Erweitert → Notfall ohne Team-Raum oder Plugin: Dateien“.

## Prüfung

- `tests/unit/team/team-room.test.mjs` (Dokumente: Stände, If-Match, Serverschlüssel nur lesen, `known`, Größe, Stücke), `tests/unit/world/world-share.test.mjs` (Format, Zusammenführen, Marker, Kartenliste).
- `RoomClientTest.liveWithTheRealRoomWithoutAnyServer` gegen echten Raum: Weltplan nach dem Verbinden und per Push, Serverschlüssel 403. `MarkAreasTest.sharedWeltplanIsCutPerDimension`, `WorldShareTest` (Plugin).
- `scripts/mod/test_bridge_paper_world.sh`: echter Paper-Server 26.3 mit BlueMap 5.29 bzw. 1.21.4 mit Dynmap 3.7-beta-8, Raum per `wrangler dev`; Marker erscheinen im Live-`markers.json` von BlueMap bzw. in `marker_world.json` von Dynmap, eine neue Fassung ersetzt sie per Push, nach Neustart sind sie aus dem Speicher wieder da.
- `tests/e2e/livemap-export.e2e.mjs`: Dateiknöpfe nur noch im Notfall-Bereich.

## Grenzen

- Der Raum prüft nur Form und Größe, nicht den Inhalt; jedes Teammitglied darf den Weltplan ändern (wie im Planer). Sperren schützt der Planer bei der Bearbeitung und optional das Plugin auf dem Server.
- Zwei Browser, die gleichzeitig denselben Eintrag ändern: der zuerst gespeicherte gilt, der andere bekommt einen Hinweis.
- squaremap und Pl3xMap haben keine allgemeine Marker-API ohne eigenes Addon: keine Marker dort.
