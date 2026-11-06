# 3D-Export: OBJ/MTL, glTF/GLB, STL und 3MF (MODEL-01)

Bauteile, Projekte, Anlagen und im Betrachter geöffnete Dateien lassen sich als 3D-Modell für andere Programme speichern: für Blender, Spiele-Engines, Web- und AR-Ansichten (OBJ, GLB) und für den 3D-Druck (STL, 3MF). Die Idee stammt aus Werkzeugen wie Mineways; Geometrie und Farben kommen aus unserem eigenen Grafiksystem ([GRAPHICS](../planer/GRAPHICS.md), [BLOCK_MODELS](BLOCK_MODELS.md)). Die Datei entsteht lokal im Browser und wird heruntergeladen; nichts wird hochgeladen. Es ist **kein Minecraft-Bauplan** – dafür bleibt der Schem-/Litematic-Export ([SCHEM_EXPORT](SCHEM_EXPORT.md), [LITEMATIC](LITEMATIC.md)).

## Wo in der App

| Ort | Daten |
|---|---|
| Bibliothek → Gebäude → Reiter **Modelldatei** (`#/bibliothek/gebaeude/<id>/modell`) | neueste Version des Bauteils |
| Betrachter (`#/betrachter`) → „Ansichten und Bauplan“ → **Modelldatei** | geöffnete Schem-/Litematic-/JSON-Datei |
| Projekt → Export → „3D-Datei für Blender und 3D-Druck“ | aufgelöster aktueller Stand, auch mit offenen Konflikten, ohne Revision |
| Bibliothek → Anlagen → Anlage → „3D-Datei der Anlage“ | aktuelle Vorschau der Anlage |

## Zwei Geometrien

**Ansichtsmodell** (Standard für GLB/OBJ): dasselbe Netz wie der Betrachter (`buildBlockMesh`): Blockformen nach Zustand (Treppen, Zäune, Türen, Pflanzen …), verdeckte Flächen weggelassen, Glas/Wasser als eigene durchscheinende Materialien. Mit geladener Texturquelle (▦) wird der Texturatlas als PNG mitgeliefert (GLB eingebettet, OBJ im ZIP) und mit Pixel-Filter (nächster Nachbar) eingebunden; sonst Durchschnittsfarben. Wahlweise werden Flächenhelligkeit und Eckschatten als Eckpunktfarbe eingebacken (OBJ-Erweiterung `v x y z r g b`, glTF `COLOR_0` linear). Lage „Mitte unten auf 0/0/0“ oder echte Minecraft-Koordinaten. Kein geschlossenes Volumen – nicht zum Drucken.

**Druckmodell** (immer für STL/3MF, wählbar für GLB/OBJ): geschlossene Hülle aus einem Voxelgitter (`packages/formats/src/printGrid.ts`).

1. **Rastern** mit Feinheit 1, 2 oder 4 Zellen je Blockkante. Jeder Block trägt die geschlossenen Quader seiner eigenen Form ein (`solidParts` in `blockmodels/shapes.ts`, dieselben Formen wie die Ansicht): Platten, Treppen, Mauern, Zäune, Türen, Falltüren, Teppiche, Fackeln … Eine Zelle wird belegt, wenn der Quader sie mindestens zur Hälfte überdeckt; dünnere Teile bekommen mindestens eine Zelle (verstärkt wie bei Mineways). Pflanzen, Schienen, Leitern, Ranken und Flüssigkeiten haben keine Druckform. „Kleinteile“ (unter 1/8 Block Volumen) lassen sich abwählen.
2. **Innenräume füllen** (Standard an): Luft, die von außen nicht erreichbar ist, wird massiv.
3. **Aushöhlen** (aus): Zellen weiter als die Wandstärke (mm → Zellen) von jeder Luft werden entfernt. Der Hohlraum ist geschlossen; für Harzdruck Ablaufloch im Slicer setzen.
4. **Lose Kleinteile entfernen** (aus): Teile unter einem Block Volumen, das größte Teil bleibt.
5. **Reparatur** (immer): wo sich Zellen nur an einer Kante oder Ecke berühren, wird eine Verbindungszelle ergänzt, bis jedes 2×2×2-Fenster belegte und leere Zellen je über Flächen zusammenhängend hat. Dann ist die Hülle an jeder Kante und jeder Ecke mannigfaltig.
6. **Hülle**: Flächen zwischen belegten und leeren Zellen, Normalen nach außen. Seit MODEL-01-S06 werden gleiche Flächen (Richtung, Ebene, Farbe) gierig zu Rechtecken zusammengefasst; jedes Rechteck bekommt jeden Eckpunkt eines Nachbarrechtecks auf seinem Rand und wird dann als Fächer um seine Mitte trianguliert – keine T-Stöße, jede Kante weiter genau zweimal (`merge: false` liefert die alten Einheitsflächen, `unitFaces` zählt sie).
7. **Prüfung** (`checkClosed`): Punkte nach Lage zusammenführen; jede Kante genau zwei Flächen in Gegenrichtung, jeder Punkt genau ein Flächenfächer, keine entarteten Dreiecke; Volumen über Divergenzsatz. Ergebnis steht im Exportbericht („✓ wasserdicht und mannigfaltig“).

Farben im Druckmodell: Durchschnittsfarbe der Seitenfläche je Block-ID; 3MF kann auf höchstens 16/8/4/2/1 Farben reduziert werden (seltene Farben gehen in die ähnlichste häufige).

## Formate, Einheiten, Achsen

| Format | Einheit | Oben | Inhalt |
|---|---|---|---|
| GLB (glTF 2.0) | Meter (1 Block = 1 m einstellbar) | Y | Ein Knoten, eine Primitive je Material, PBR ohne Metall, `MASK` für Laub/Gitter, `BLEND` für Glas, Textur eingebettet. |
| OBJ + MTL (ZIP) | Meter | Y | `.obj`, `.mtl`, optional `<name>_bloecke.png`; `map_Kd`/`map_d`, `d`/`Tr` für Glas. |
| STL (binär) | Millimeter | Z | Dreiecke mit Flächennormale; Kopf beginnt nie mit „solid“. |
| 3MF | Millimeter | Z | Kernspezifikation 2015/02, gemeinsame Eckpunkte, `basematerials` mit Farbe je Dreieck – für Mehrfarbdruck. |

Bei Z oben wird Minecraft-Y zu Z und Norden zu +Y (Drehung, keine Spiegelung); das Modell steht auf dem Druckbett bei 0/0/0. Der Maßstab ist frei (mm je Block); Knöpfe „auf 100/150/200 mm“ setzen die längste Seite. Unter 0,8 mm je Gitterzelle warnt die Oberfläche.

ZIP-Pakete (OBJ, 3MF) schreibt `packages/formats/src/zipWrite.ts` (CRC-32, deflate-raw über `CompressionStream`, gespeichert, wenn Packen nicht kleiner macht; ohne ZIP64).

## Code

- `packages/formats/src/model3d.ts` – neutrales Netz `Mesh3d`, `weldMesh`, `checkClosed`, Schreiber `writeObj`, `writeGlb`, `writeStl` (+ `readStl`), `write3mf`.
- `packages/formats/src/printGrid.ts` – Druckgitter, `fillCavities`, `hollowGrid`, `labelParts`, `removeSmallParts`, `repairGrid`, `reduceMaterials`, `shellMesh`; Grenze `PRINT_GRID_LIMIT` (48 Mio. Gitterzellen).
- `apps/web/src/export3d/build.ts` – `viewModel`, `printModel`, `exportModel`; bekommt die Formatfunktionen übergeben (Oberfläche: Quelle, Node-Prüfung: `dist`).
- `apps/web/src/export3d/ModelExportPanel.tsx` – Oberfläche; Rechenmodule werden erst beim Export geladen.

## Messung (Node, Container)

Synthetische Siedlung, 64.912 Blöcke (128 × 10 × 128, 144 Häuser), als 3MF mit Füllen: Feinheit 1 ≈ 1 s (160 Tsd. Dreiecke, 1,3 MB), Feinheit 2 ≈ 4 s (717 Tsd., 5,8 MB), Feinheit 4 ≈ 20 s (2,9 Mio., 23 MB) – alle wasserdicht. Ansichtsmodell derselben Siedlung ≈ 0,5 s. Ab 8 Mio. Gitterzellen weist die Oberfläche auf die Wartezeit hin. Im Browser läuft der Export im Hintergrund-Worker mit Schrittanzeige und „Abbrechen“ ([BACKGROUND_JOBS](../kern/BACKGROUND_JOBS.md), PERF-04); die Seite bleibt bedienbar.

## Prüfungen und Grenzen

- Node `tests/unit/formats/model3d.test.mjs`: Wasserdichtheit und Volumen (Würfel, Raum, Haus mit Treppen/Zaun/Tür/Glas bei Feinheit 1/2/4, gefüllt/hohl), Kanten- und Eckreparatur inkl. Schachbrett, Aushöhlen/Füllen, lose Teile, Farbreduktion, Druckformen je Zustand, Ansichtsnetz (Flächen, Glas, Eingebackenes), OBJ/MTL-Verweise, GLB-Aufbau (Chunks, Accessoren, Ausrichtung, Textur), STL-Rundreise mit Normalen, ZIP gegen den App-ZIP-Leser, 3MF-Paket.
- Browser `tests/e2e/model3d.e2e.mjs` (Chromium): Bauteil → GLB, STL (heruntergeladene Datei unabhängig auf Wasserdichtheit und 100 mm geprüft), 3MF mit 4 Farben und Aushöhlen; Betrachter auf Handybreite → OBJ-ZIP; Anlage zeigt den Export.
- **Unabhängige Dateiprüfung (06.11.2026, Block 6):** `tests/unit/formats/model3d-files.test.mjs` und der Browsertest geben jede erzeugte Datei an Prüfer, die keinen Planer-Code nutzen:
  - GLB: offizieller **Khronos glTF-Validator** (npm `gltf-validator` 2.0.0-dev.3.10, nur Entwicklungsabhängigkeit) – 0 Fehler und 0 Warnungen für farbige und texturierte Ansichtsmodelle (mit Glas, mittig und an Ort); eine absichtlich kaputte Datei meldet er.
  - STL, 3MF, GLB-Behälter, OBJ-ZIP: `scripts/checks/verify_model3d.py` (nur Python-Standardbibliothek). STL: Länge passt zur Dreieckszahl, Normalen passen zur Eckreihenfolge. 3MF nach Core Specification 1.3: OPC-Paket (`[Content_Types].xml`, `_rels/.rels` → Modellteil), Namensraum, Einheit, eindeutige Ressourcen-IDs, Farbangaben, Punkt- und Materialverweise, Build-Items. Netz (STL und jedes 3MF-Objekt): Punkte exakt verschweißt, jede gerichtete Kante genau einmal und ihre Gegenrichtung genau einmal (geschlossen, einheitlich orientiert, kantenmannigfaltig), ein einziger Flächenfächer um jeden Punkt (punktmannigfaltig), positives Volumen. Gegenproben: offene, gekippte, umgestülpte, nur an einer Ecke berührende Körper und falsche Verweise werden gemeldet.
  - Ist die Referenzbibliothek des 3MF-Konsortiums installiert (`pip install lib3mf`, 2.5.0 geprüft), liest das Skript jede 3MF zusätzlich im strengen Modus und fragt `IsManifoldAndOriented`; im Container ohne Befund.
  - Geprüft bei Feinheit 1/2/4, gefüllt, ausgehöhlt, mit 2 und 4 Farben und an 12 Zufallsformen; STL- und 3MF-Volumen stimmen mit `checkClosed` überein.
  - Dabei gefunden und behoben: Die 3MF listete bei „Farben: 4“ weiterhin alle Grundmaterialien des Bauteils, auch unbenutzte; Slicer hätten dafür Filamente angeboten. `write3mf` schreibt nur noch benutzte Materialien (`p1` neu nummeriert).
- **Echte Programme (MODEL-01-S05, soweit maschinell möglich):** `tests/unit/formats/model3d-external.test.mjs` öffnet die Dateien in **Blender 5.2** (Python-Modul `bpy`, Skript `scripts/checks/blender_model3d.py`) und in **PrusaSlicer 2.7** (Kommandozeile). Blender: GLB mit eingebetteter Textur, OBJ+MTL und STL laden ohne Fehler, gleiche Dreieckszahl, Materialien und Textur kommen an, Größe 7×6×6 m; STL nach „Zusammenführen nach Abstand“ ohne nicht-mannigfaltige Kanten/Punkte, Normalen einheitlich, Volumen gleich. PrusaSlicer: STL und 3MF `manifold = yes`, ein Teil, gleiches Volumen, 70 mm Breite; beide werden zu G-Code geschnitten (über 100 Schichten). Größtes Katalogbauwerk (Kolosseum, 47 534 Zellen) als 120-mm-3MF, ausgehöhlt, 4 Farben: 78 390 Dreiecke, `manifold = yes`, 212 Schichten G-Code. Ohne die Programme werden die Fälle übersprungen (`BLENDER_PYTHON`, `PRUSA_SLICER`).
- Nicht geprüft: echter Druck auf einem Drucker, Cura und Bambu Studio, Öffnen im Browser Firefox/Safari. Biomfarben, Blockentities als Modelle (Truhen, Banner nur als eigene Form), freie Entities und animierte Texturen fehlen. Das Druckmodell fasst Flächen ohne T-Stöße zusammen (S06, geprüft mit `checkClosed` an Stufen, Löchern, Farbwechseln und zufälligen Formen); der Export läuft seit PERF-04 im Worker.
- Lizenz: Texturen stammen ausschließlich aus der vom Nutzer geladenen Quelle (ADR-020) und landen nur in seiner Datei; das Repo und Pages enthalten keine.
