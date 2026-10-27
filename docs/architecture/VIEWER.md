# Viewer und Bedienung (Block B6, P1-03c)

Stand: 27.10.2026. Umsetzung in `apps/web/src/viewer/`, `apps/web/src/Viewer.tsx`, `apps/web/src/canvasFallback.ts`; Inspektorlogik in `packages/domain/src/inspect.ts`. Tests: `tests/viewer.test.mjs`, `tests/e2e/viewer.e2e.mjs`.

Der Viewer ist reine Ansicht. Mengen, Konflikte und Export lesen weiterhin ausschließlich das Voxelpayload bzw. `resolution.world`, nie das Vorschaumesh.

## Bedienung

| Funktion | Maus/Tastatur | Touch |
|---|---|---|
| Drehen, Zoomen, Verschieben | Ziehen, Mausrad, rechte Taste | ein Finger drehen, zwei Finger zoomen/verschieben |
| Block wählen | Klick (Bewegung ≤ 5 px) | Tippen; mehrere Finger wählen nie |
| Ansichten | Schaltflächen Iso/Oben/N/O/S/W oder Tasten 1–6 | Schaltflächen (≥ 40 px bei grobem Zeiger) |
| Parallelprojektion | „Ortho“ oder O | Schaltfläche |
| Fokus | „Auswahl“/„Einpassen“ oder F | Schaltfläche |
| Freier Flug | „Flug“ oder V; W/A/S/D, Leertaste/E hoch, Shift/C/Q runter, Pfeiltasten oder Ziehen zum Umsehen, Mausrad Tempo, Esc beendet | Steuerkreuz mit Hoch/Runter, Tempoauswahl, „Flug beenden“; Ziehen zum Umsehen |

Konventionen wie in Minecraft: Norden = −Z, Osten = +X, oben = +Y. Die Draufsicht zeigt Norden oben. Tastenkürzel wirken nur, wenn die 3D-Fläche fokussiert ist (Klick oder Tab), damit Eingabefelder und Strg+Z/Strg+Y des Editors unberührt bleiben. W/S folgen wie im Kreativmodus der horizontalen Blickrichtung; Diagonalen sind nicht schneller (`flightStep`).

Fokus: Im Betrachter der gewählte Block, im Editor die Begrenzung der gewählten Instanz, ohne Auswahl das ganze Bauwerk. Mindestradius 4 Blöcke, damit Umgebung sichtbar bleibt. Im Flug wird vor das Ziel geflogen, die Blickrichtung bleibt.

## Inspektor und Schichten im Editor

- Klick auf einen Block wählt seine Instanz und zeigt **Weltkoordinate**, Blockzustand und je beteiligter Instanz die **Lokalkoordinate** im unveränderten AssetVersion-Payload. `inspectCell` sucht die Quellzelle über die gemeinsame `transformCellPosition` – keine zweite (inverse) Transformationsregel. Konflikte und Vorrangentscheidungen werden genannt.
- Schichtfilter (`useLayerFilter`): Achse X/Y/Z, Modus *Alles*, *Bereich* (von–bis, inklusive) und *Einzeln*, Stufen −/＋. Nutzt `selectLayers` aus dem Voxelkern; Mengen und Konfliktbericht bleiben vollständig.

## Darstellung und Leistung

- **Nur sichtbare Flächen:** `buildFaces` erzeugt ein einziges indiziertes Mesh. Eine Fläche entsteht nur, wenn die Nachbarzelle keinen sichtbaren Block enthält; Luft-, Lösch- und ungewählte Zellen verdecken nichts. Schnittflächen eines Schichtfilters bleiben dadurch sichtbar. Picking: Dreieck → Viereck → Zelle (`quadCells`).
- **Blockkanten** werden im Fragmentshader aus dem ganzzahligen Raster berechnet (keine Lücken, keine Zusatzgeometrie).
- **Präzision:** Vertices relativ zu einem ganzzahligen Ursprung (Mitte des ersten Payloads), damit auch große Weltkoordinaten in float32 exakt bleiben.
- **Ein WebGL-Kontext je Ansicht:** Auswahlfarben und Bearbeitungen tauschen nur die Geometrie; Kamera bleibt erhalten. Gerendert wird nur bei Änderung (Steuerung, Dämpfung, Flug), nicht dauerhaft 60 Hz.
- **Code-Splitting:** `Viewer.tsx` lädt `viewer/ThreeViewer.tsx` samt three.js per `React.lazy`. Projektzentrale und Bibliothek ohne 3D laden three.js nicht.
- **Ohne WebGL:** Softwareansicht (Canvas 2D) mit denselben Ansichtsvoreinstellungen, Fokus, Picking und Flächenkulling; kein Flug, keine Parallelprojektion. Deutlich gekennzeichnet.

### Messung (27.10.2026, Container, Headless-Chromium mit Software-WebGL/SwiftShader, keine GPU)

| Messgröße | vorher (main 3584213) | nachher |
|---|---|---|
| Haupt-JS-Bundle | 857 kB (233 kB gzip), three.js enthalten | 298 kB (93 kB gzip) + Viewer-Chunk 579 kB (146 kB gzip) bei Bedarf |
| Flächen Hafenhaus (425 Blöcke) | 2 550 (Würfel je Block) | 1 118 |
| Flächen Vollwürfel 27³ = 19 683 Blöcke | 118 098 | 4 374 (−96,3 %) |
| Meshaufbau 27³ | – | 35 ms Node, 39–44 ms Browser |
| Drehen 27³, je Frame inkl. Playwright-Rundlauf | 2 145 ms | 92,5 ms |

Messweg: `node --test tests/viewer.test.mjs` und `npm run test:e2e` protokollieren die Werte (`# 27³ …`). Der Vorher/Nachher-Framevergleich lief einmalig mit einem Playwright-Skript (20 Ziehschritte, je ein `requestAnimationFrame`) gegen beide Builds; Software-Rendering ist um Größenordnungen langsamer als eine GPU, die Werte sind nur relativ aussagekräftig.

## Grenzen

- Farbige Würfel, keine Minecraft-Blockmodelle oder Texturen; Treppen, Zäune usw. erscheinen als Vollwürfel. Vorschaufarben (`colors.ts`, eigene Näherungswerte, keine Texturen): exakte IDs, dann Familien – 16 Farbstoffe für Wolle/Teppich/Beton/Keramik/Glas/Betten/Banner/Kerzen/Shulkerkisten (rotes Sandstein bleibt Material), Holzarten mit Brettern/Rinde/Laub (entrindete Stämme in Brettfarbe), Stein-/Metallmaterialien; Formen (Stufe, Treppe, Mauer, Zaun, Scheibe, Tür, Falltür, Schild …) erben die Materialfarbe. Mod-IDs und Unbekanntes erhalten weiter eine stabile Hashfarbe.
- Kein Greedy-Meshing und keine BVH; bei maximal 20 000 Zellen nicht nötig. Für größere Limits wäre Greedy-Meshing je Farbe der nächste Schritt.
- Touch im Headless-Chromium mit Geräteemulation (Pixel 7) und CDP-Touchereignissen geprüft; echter iPhone-/Android-Test und echte GPU stehen aus.
- Greifen und Ziehen einer Auswahl (Editor) und Platzierungsumriss: siehe [CONNECTORS](CONNECTORS.md#andocken-per-ziehen).
