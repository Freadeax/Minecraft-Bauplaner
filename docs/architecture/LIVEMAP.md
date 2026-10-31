# Livekartenlinks und Markerdatei · B15-L

Stand: 31.10.2026. Implementierung: `packages/domain/src/livemap.ts`; Regressionen: `tests/livemap.test.mjs`.

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
