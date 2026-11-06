# Livekartenlinks und Markerdatei · B15-L

Stand: 31.10.2026. Implementierung: `packages/domain/src/world/livemap.ts`; Regressionen: `tests/unit/world/livemap.test.mjs`.

## Bewusster Umfang

Der Adapter erzeugt Links aus einer ausdrücklich eingetragenen URL-Vorlage. Er baut keine Serververbindung auf, verändert keine Welt und richtet keine Livekarte ein. BlueMap, Dynmap, squaremap und Pl3xMap besitzen unterschiedliche URL-/Markerverträge; der Adapter behauptet keine automatische Erkennung oder native Unterstützung eines bestimmten Vertrags. Die tatsächlich beim jeweiligen Server gültige Vorlage muss dessen Betreiber bereitstellen.

`LiveMapTarget` enthält `name` und `urlTemplate`. Erlaubte Platzhalter sind `{x}`, `{y}`, `{z}`, `{world}`, `{dimension}`. Mindestens ein Platzhalter muss vorkommen. Ein festes absolutes HTTP(S)-Ziel ohne Zugangsdaten ist erforderlich; Platzhalter dürfen weder Protokoll noch Server/Port steuern. Unbekannte oder unvollständige Platzhalter, Steuerzeichen, Rückstriche und Leerraum am Vorlagenrand werden abgewiesen.

`buildLiveMapUrl(target, position)` validiert alle drei Blockkoordinaten als sichere Ganzzahlen und Welt/Dimension als nichtleeren Text. Welt und Dimension werden als URL-Komponenten kodiert: enthaltene `/`, `?`, `&` oder `#` können keine zusätzlichen Pfade oder Parameter erzeugen. Relative Dot-Pfadsegmente und ungültiger Unicode werden abgewiesen. Die Koordinaten gehören zur ausdrücklich angegebenen Welt/Dimension; es gibt keine automatische Nether-/Overworld-Umrechnung.

Eine rein illustrative, **nicht providerspezifische** Vorlage:

```text
https://maps.example.test/map/{world}?x={x}&y={y}&z={z}#dimension={dimension}
```

## Markerdatei

`createLiveMapMarkerFile(markers)` erzeugt eine JSON-kompatible Kopie mit `schemaVersion: 1`, `format: "bauplaner-world-markers"` und `coordinateSystem: "minecraft-blocks"`. Jeder Marker besitzt eine eindeutige `id`, eine `label` und eine vollständige `position`. Höchstens 10000 Marker sind erlaubt. Der Adapter übernimmt keine Referenzen auf veränderliche Eingabepositionen.

Das ist ein eigenes Bauplaner-Austauschformat, **kein direkt importierbares natives Markerformat** einer Livekartenimplementierung und kein geografisches GeoJSON. Eine konkrete Exportanbindung benötigt einen separat nachgewiesenen Providervertrag.

`readLiveMapMarkerFile(input)` liest das geparste eigene JSON-Format wieder ein. Schema, Format, Koordinatensystem, vollständige Felder, Markergrenze, eindeutige IDs und Positionen werden geprüft. Unbekannte Felder werden abgewiesen, damit Zusatzdaten nicht still verschwinden. Das Ergebnis ist eine unabhängige Kopie. Dateigrößenlimits und JSON-Parsing gehören in den späteren UI-Dateiadapter; diese Funktion verarbeitet bereits geparste Werte.

## Prüfung und Grenzen

Die Tests prüfen negative/sichere Koordinaten, Pfad-/Query-/Fragmentkodierung, Protokoll-/Zugangsdaten-/Origin-Prüfung, fehlerhafte Platzhalter, Unicode, Markerduplikate und Kopierverhalten. Keine Netzaufrufe, kein Livekartensmoke und keine Spielabnahme. Noch keine UI-Einbindung oder gespeicherte Zielkonfiguration; diese folgen im Weltkartenblock B15.

## MAP-02: gespeicherte Karten, echte Marker für BlueMap und Dynmap

Stand: 05.11.2026. Implementierung: `packages/domain/src/world/livemap.ts` (gespeicherte Karten), `packages/domain/src/world/liveMapExport.ts` (Formen, Markerimport, Exporte), Oberfläche im Weltkarten-Bereich „Server-Webkarte verknüpfen“ (`apps/web/src/views/map/LiveMapPanel.tsx`). Tests: `tests/unit/world/livemap-export.test.mjs`, `tests/e2e/livemap-export.e2e.mjs`. Abnahme: KARTE-08.

**Gespeicherte Karten.** `SavedLiveMap { name, urlTemplate, worlds }`, höchstens 20, Name eindeutig ohne Groß-/Kleinschreibung (`checkSavedLiveMap(s)`, `upsertSavedLiveMap`). Sie liegen wie die aktive Einstellung im Browser (`localStorage` `bauplaner.livekarten`); geteilt wird über die Datei `bauplaner-live-maps` (`createLiveMapTargetsFile`/`readLiveMapTargetsFile`, höchstens 256 KB). `mergeSavedLiveMaps` fügt neue Namen hinzu und überspringt vorhandene. Es wird nie etwas an einen Kartenserver gesendet.

**Formen.** `mapShapes(map, items, dimension)` macht aus einer Dimension der Weltkarte neutrale Formen in fünf Gruppen: Projekte (Grundrissrechteck der Weltlage mit Höhe von–bis, auch gedrehte Lagen über `worldBounds`), Bauplätze (Rechteck, Höhe des Bauplatzes oder 64), Wege (Linie durch die Blockmitten, Breite), Zonen (Umriss durch die Blockmitten) und Punkte.

**Primärquellen (geprüft 05.11.2026).**

| Karte | Quelle | Ergebnis |
| --- | --- | --- |
| BlueMap | Wiki „Markers“ (bluemap.bluecolored.de/wiki/customization/Markers.html) | `marker-sets` am Ende der Kartenkonfiguration; Set mit `label`, `toggleable`, `default-hidden`, `sorting`, `markers`; Marker `poi` (`position`, `label`, `detail` mit HTML), `line` (`line`-Punkte x/y/z, `line-width`, `line-color`), `shape` (`shape` x/z, `shape-y`, `fill-color`), `extrude` (`shape-min-y`, `shape-max-y`); Farben als `{ r, g, b, a }`. Keine Markerdatei außerhalb der Kartenkonfiguration. |
| Dynmap | Wiki „Using markers“ und „Commands“ (github.com/webbukkit/dynmap/wiki) | Nur Befehle, kein Markerimport aus Datei: `dmarker addset id:… <label> hide:…`, `dmarker add id:… <label> icon:… set:… x: y: z: world:` (auch aus der Konsole), `dmarker clearcorners`/`addcorner x y z world`, `dmarker addarea id:… <label> set:… color: fillcolor: fillopacity: weight: ytop: ybottom:`, `dmarker addline … color: weight:`, `dmarker deleteset id:…`. |
| squaremap | README, Ordner `web/src/js` | Marker nur über die Programmierschnittstelle (`squaremap-api`) bzw. Erweiterungen; kein Dateiformat. Linkformat nicht aus dem Quelltext belegt, darum weiter keine Vorlage. |
| Pl3xMap | README (v3) | Marker nur über API bzw. Addons; keine Markerdatei. |

**Exporte.** `blueMapMarkerConfig(shapes)` schreibt einen vollständigen `marker-sets: { … }`-Block (Sets `bauplaner-projekte` … `bauplaner-punkte`; Bauplätze und Zonen standardmäßig ausgeblendet; Projekte als `extrude` mit `depth-test: true`, flache Flächen als `shape`, Wege als `line`, Punkte als `poi`). Zeichenketten werden JSON-maskiert (gültiges HOCON), das HTML-Detail zusätzlich HTML-maskiert. `dynmapMarkerCommands(shapes, world)` schreibt Konsolenbefehle; jedes Set wird zuerst gelöscht, ein zweiter Lauf ersetzt also die alten Marker. Bezeichnungen stehen in `"…"`, enthaltene `"` werden zu `'`. Der Dynmap-Weltname kommt aus der aktiven gespeicherten Karte (Kartenname der Dimension).

**Markerdatei → Punkte.** `markersToPoints(json, items, type)` liest das eigene Format (`readLiveMapMarkerFile`) und legt je Marker einen Weltplan-Punkt (Art „Notiz“) an, als ein Rückgängig-Schritt. Bereits vorhandene Punkte (gleicher Name und Block in derselben Dimension) und Marker mit ungültiger Dimension werden übersprungen; Dateien über 4 MB werden vor dem Lesen abgewiesen. Der JSON-Export enthält jetzt neben den Projekten auch die Punkte des Weltplans.

**Grenzen.** Keine Prüfung gegen einen laufenden BlueMap-/Dynmap-Server in den Tests (Abnahme KARTE-08); Zonen mit Löchern und Kreise werden nicht erzeugt.

## WORLD-SHARE-01: Marker ohne Datei (06.11.2026)

Die Exporte oben sind seit 0.22.0 nur noch der Notfall. Normalerweise geht der Weltplan mit fertigen Markern über den Team-Raum an das Paper-Plugin, und das Plugin schreibt sie selbst in BlueMap und Dynmap; die Kartenliste teilt sich über den Raum. Ablauf, Schnittstellen und Prüfung: [WORLD_SHARE](WORLD_SHARE.md).
