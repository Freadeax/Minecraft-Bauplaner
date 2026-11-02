# Vergleich mit anderen Minecraft-Planern und Bautools (Gap-Analyse)

Stand: 02.11.2026 · Roadmap-ID **EDIT-04** (Umsetzung der ersten Lücken) · Auftrag Philipp: „Komplexes vertieftes kreatives Weiterentwickeln anhand Informationen und Modulen von anderen Planern und unseren Systemen“.

Grundsatz: Wir übernehmen **Ideen und Arbeitsweisen**, keine Inhalte, Texturen, Namen oder Oberflächen fremder Werkzeuge. Jede Funktion wird auf unseren eigenen Kern gesetzt (Voxelvertrag, Entwurf mit exakter Umkehrung, Drehregeln aus `states.ts`, Muster aus `patterns.ts`). Angaben zu fremden Werkzeugen beruhen auf deren öffentlicher Dokumentation und Änderungsprotokollen (Quellen am Ende); Details können sich dort ändern.

## 1. Betrachtete Werkzeuge

| Werkzeug | Art | Kern der Idee |
| --- | --- | --- |
| Litematica | Client-Mod | Schematic als Hologramm platzieren, Ebenen einblenden, Materialliste, Prüfer (falsche/fehlende Blöcke), „Easy Place“ |
| Axiom | Client/Server-Editor-Mod | Formwerkzeug mit Extrudieren, Pfadwerkzeug, Bildhauer-Pinsel (Sculpt), Painter mit Verlaufsmodus, Symmetrie-Werkzeug, Lasso-/Magie-Auswahl, Blueprint-Browser |
| WorldEdit / FAWE | Server-/Client-Mod | Muster (`50%stone,50%cobble`), Masken (nur Oberfläche, nur bestimmte Blöcke), Pinsel `smooth`, `erode`/`fill`, `overlay`, `//naturalize`, `//curve` (Spline durch Punkte), `//generate` (Formelformen), `//stack` |
| WorldPainter | Desktop | Gelände malen (Höhe, Schichten, Biome), eigene Objekte streuen |
| Amulet | Desktop | Weltausschnitte bearbeiten, zwischen Versionen umwandeln |
| Plotz, Pixel-Kreis-Generatoren | Web | Formen (Kugel, Kuppel, Torus, Ellipse) Ebene für Ebene als Bauanleitung |
| Blockpaletten-Seiten | Web | Blöcke nach Farbe kombinieren, harmonische Paletten, Verläufe |
| Kartenbild-/Pixel-Art-Generatoren | Web | Bild in Blöcke umrechnen (Farbabgleich, Dithering) |
| Mineways | Desktop | Weltausschnitt als 3D-Modell (OBJ/USD/STL, 3D-Druck) |
| Structurize / MineColonies | Mod | Bauplan scannen, Stilpakete, Ausbaustufen 1–5, Bauauftrag mit Materialanforderung |
| Arnis | Desktop | Reale Orte aus OpenStreetMap und Höhendaten als Minecraft-Welt |
| BlueMap / Dynmap / Chunky | Server | 3D-/2D-Weltkarte, Vorgenerierung |

## 2. Abgleich je Modul

Legende: ✅ vorhanden (gleichwertig oder besser) · ◐ teilweise · ✗ fehlt · ★ bei uns kreativ besser.

### Werkstatt (Blockeditor, EDIT-01/02/03)

| Idee | Vorbild | Stand bei uns | Bewertung |
| --- | --- | --- | --- |
| Setzen/Abbauen/Pipette/Füllen/Ersetzen mit Zustand | alle | ✅ inkl. Übernahme passender Eigenschaften | – |
| Quader, Kugel, Zylinder, Linie, Bogen, Pyramide, Kegel | WorldEdit, Plotz, Axiom | ✅ ★ Bogen mit Rund-/Spitz-/Flachbogen und Lückenschluss | Torus/Ellipsoid fehlen (klein) |
| Muster (Mischung, Verlauf, Schachbrett, Streifen) | WorldEdit-Muster, Axiom-Painter | ✅ ★ reproduzierbar (fester Hash, gleiche Version) | – |
| **Symmetrie beim Bauen** (Spiegelachsen, Drehsymmetrie) | Axiom Symmetry | ✗ | **hoch** – halbiert Arbeit an Burgen, Kirchen, Brunnen |
| **Kurven/Pfade durch Punkte** (Spline mit Profil) | WorldEdit `//curve`, Axiom Path Tool | ✗ (nur gerade Linie/Mauerzug) | **hoch** – Stadtmauern, Wege, Flüsse, Brücken |
| **Masken: nur Oberfläche / nur Sichtseite** | WorldEdit-Masken | ✗ (Ersetzen nur nach Block-ID) | **hoch** – Fassade verwittern ohne Innenwände |
| **Glätten, Abtragen, Aufbauen, Überziehen, Naturalisieren** | WorldEdit `smooth`/`erode`/`overlay`/`naturalize`, Axiom Sculpt | ✗ | **hoch** – Felsen, Hügel, Ruinen, Gärten |
| **Farbverlauf zwischen zwei Blöcken, ähnliche Blöcke** | Blockpaletten, Axiom-Verlaufshelfer | ◐ Verlauf nur mit selbst gewählten Stufen | **mittel–hoch** – Stufen werden automatisch nach Farbe gewählt |
| **Bild → Blöcke** (Wandbild, Bodenmosaik, Banner-Motiv) | Pixel-Art-Generatoren | ✗ | **mittel–hoch** – kreativ, eigenständig |
| Formelformen | WorldEdit `//generate` | ✗ | niedrig (für Spielerinnen schwer zugänglich) |
| Auswahl nach Ähnlichkeit/Lasso | Axiom | ◐ Quader-Auswahl, „Im Modell“ | mittel, später |
| Schablonen/Blueprint-Browser | Axiom Blueprints, Litematica | ✅ ★ versionierte Schablonen in der Bibliothek | – |

### Bibliothek, Katalog, Generatoren

| Idee | Vorbild | Stand | Bewertung |
| --- | --- | --- | --- |
| Gebäude-Browser mit Vorschau | Axiom Blueprints, MineColonies | ✅ ★ 174+ Gebäude, Familien, Spielphase, Vergleich, Merkliste | – |
| Stilpakete | Structurize | ✅ Bauwelten/Themes, Materiallabor | – |
| Ausbaustufen | MineColonies Hut 1–5 | ◐ Spielphasen, Bauversionen mit Diff | Ausbaupfad „Stufe → Stufe“ als Bauauftrag denkbar (später) |
| Parametrische Gebäude | (kaum bei anderen) | ✅ ★ Haus/Turm/Mauer/Brücke/Kirche/Hafen … | eigener Vorsprung |

### Projekt, Baustelle, Bauanleitung

| Idee | Vorbild | Stand | Bewertung |
| --- | --- | --- | --- |
| Materialliste je Ebene | Litematica | ✅ ★ je Schritt, Bautag, Shulker-Packliste, Rezepte | – |
| Ebene für Ebene bauen | Plotz, Litematica | ✅ Schichtführung mit Koordinaten | – |
| Prüfer falsche/fehlende Blöcke | Litematica Verifier | ✅ Soll/Ist aus Spielaufnahmen | Live im Spiel: Mod GAME-07 |
| Bauauftrag mit Anforderungen | MineColonies | ✅ Sammel-/Farmplan, Lager | – |

### Welt, Gelände, Karte

| Idee | Vorbild | Stand | Bewertung |
| --- | --- | --- | --- |
| Weltausschnitte lesen | Amulet | ✅ Regionsdateien, Geländeaufnahmen | Schreiben bewusst nicht (keine Weltveränderung) |
| Gelände modellieren/malen (Höhe, Schichten, Pfade) | WorldPainter, Axiom Sculpt | ✅ TERRAIN-02 (Gelände formen, bemalen, Wasser, Wege), parallel entstanden | – |
| **Reale Orte** (Karten- und Höhendaten) | Arnis | ✗ | mittel, groß, Lizenz (ODbL) und Netz klären → eigener Thread |
| 3D-Weltkarte | BlueMap | ◐ Projektkarte mit Gelände | – |

### Formate und Export

| Idee | Vorbild | Stand | Bewertung |
| --- | --- | --- | --- |
| .schem / .litematic / .nbt | WorldEdit, Litematica, Strukturblock | ✅ Lesen und Schreiben | – |
| 3D-Modell-Export (OBJ/glTF, 3D-Druck) | Mineways | ✅ MODEL-01 (OBJ/MTL, glTF/GLB, STL, 3MF), parallel entstanden | – |

### Mod im Spiel

| Idee | Vorbild | Stand | Bewertung |
| --- | --- | --- | --- |
| Hologramm, Ebenen, Materialliste | Litematica | ✅ GAME-07 (Fabric 0.3.0) | – |
| Platzierhilfe (richtigen Zustand automatisch setzen) | Litematica Easy Place | ✅ GAME-07 Stufe 3 (Mod 0.4.0, serverkonform), parallel entstanden | – |
| Symmetrie/Kurven im Spiel | Axiom | ✗ | erst Website, später Mod |

## 3. Auswahl für EDIT-04 (dieser Thread)

Ausgewählt nach Nutzen für Philipps Bauweise (große Burg-/Stadtanlagen, Modpack mit vielen Blöcken), Passung zum vorhandenen Kern und Unabhängigkeit von den parallel laufenden Threads (Blocklogik, Grundstruktur):

1. **Symmetrie** – Spiegeln an X- und/oder Z-Achse und 2-/4-fache Drehsymmetrie um eine senkrechte Achse; wirkt auf jedes Werkzeug, Zustände werden mit der einen Drehregel (`transformBlockState`) mitgedreht. Ungelöste Zustände bleiben sichtbar gemeldet.
2. **Kurven** – Catmull-Rom-Kurve durch geklickte Punkte, Profile Rohr, Weg (waagrechtes Band quer zur Richtung), Mauer (Band mit Höhe), offen oder geschlossen. Lückenlos (jede Zelle hat eine Flächennachbarin).
3. **Natur- und Formwerkzeuge** in der Auswahl – Glätten (Höhenkarte), Abtragen und Aufbauen (Nachbarzählung), Überziehen (oberste Schicht mit Muster, Tiefe), Naturalisieren (Gras/Erde/Stein nach Tiefe).
4. **Oberflächenmaske** – Muster und Ersetzen wirken wahlweise nur auf sichtbare Zellen (mindestens eine Seite an Luft/leer).
5. **Farbpaletten** – Farbverlauf zwischen zwei Blöcken mit automatisch gewählten Zwischenstufen (Farbabstand in Lab), „ähnliche Blöcke“; übernimmt sich direkt als Verlaufsmuster.
6. **Bild → Blöcke** – Bilddatei als Wand- oder Bodenbild, Farbabgleich nur mit vollen Würfeln, wahlweise Fehlerverteilung (Dithering), Blockgruppen wählbar (Wolle, Beton, Terrakotta, alle).

Technischer Vertrag: [CREATIVE_TOOLS](../architecture/CREATIVE_TOOLS.md).

## 4. Vorschläge für eigene Threads

Diese Lücken sind groß und unabhängig; sie werden dem Koordinator als eigene Threads vorgeschlagen:

- ~~Gelände modellieren~~: inzwischen mit TERRAIN-02 umgesetzt.
- ~~3D-Export~~: inzwischen mit MODEL-01 umgesetzt.
- ~~Platzierhilfe im Mod~~: inzwischen mit GAME-07 Stufe 3 umgesetzt.
- **Reale Orte** (Arnis-Idee): Karten- und Höhendaten als Geländevorlage; vorher Lizenz und Netzzugang klären.

## Quellen

- Axiom Änderungsprotokoll (Symmetrie-, Pfad-, Painter-Verlaufswerkzeug): https://modrinth.com/mod/axiom/changelog
- WorldEdit-Pinsel (smooth, erode, overlay, Masken): https://worldedit-be-docs.readthedocs.io/en/latest/usage/brushes/
- Arnis: https://github.com/louis-e/arnis
