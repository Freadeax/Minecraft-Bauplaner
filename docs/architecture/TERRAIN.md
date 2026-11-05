# Gelände in Weltkarte und Anlagen (TERRAIN-01)

Stand: 02.11.2026 · Roadmap-ID TERRAIN-01 · baut auf [WORLD_IMPORT](WORLD_IMPORT.md), [WORLDMAP](WORLDMAP.md) und [ANLAGEN](ANLAGEN.md) auf.

Der Weltimport liest Regionsdateien nur für die Dauer einer Sitzung. Eine **Geländeaufnahme** hält das Gelände eines Bauplatzes dauerhaft fest, damit Weltkarte und Anlagen es ohne die Dateien nutzen: die Karte zeigt es, schätzt das Fundament und schlägt die Höhe vor; eine Anlage wird mit Terrassen auf den Hang gesetzt. Dazu drehen Anlagen ihre Gebäude so, dass der Eingang zum Hauptweg zeigt.

## Geländeaufnahme

`packages/domain/src/world/terrainSurvey.ts`. Je Spalte eines X/Z-Rechtecks (höchstens 512 × 512, 262 144 Spalten):

- `surface`/`surfaceBlock`: oberster sichtbarer Block. Wasser, Lava und Laub zählen, Pflanzen, Schneeschichten und Luft nicht (`SURFACE_SKIP_IDS` = alles Ersetzbare aus `terrain.ts` plus Barriere, Strukturleere, Licht).
- `ground`/`groundBlock`: höchster **Boden**block: fest, nicht ersetzbar, keine Flüssigkeit, kein Baumteil (`isGroundId`, dieselben Klassen wie die blockgenaue Geländeprüfung).
- Unbekannte Spalten (Chunk nicht gewählt, nie erzeugt, unfertig, unlesbar) behalten `SURVEY_UNKNOWN` und werden nie als eben gewertet.

Gelesen wird mit `terrainColumns` (`packages/formats/src/worldExcerpt.ts`) im Welt-Worker, Chunk für Chunk; die Bodenregel kommt als Funktion aus der Domäne, damit `formats` nicht von `domain` abhängt.

**Speicherung:** Binärdatei `BPTERR01` (Kopf als JSON, danach vier 16-Bit-Felder, Little Endian) im Originalspeicher, inhaltsadressiert per SHA-256, Medientyp `application/x-bauplaner-terrain`. Das Projekt hält nur den Verweis `project.terrain` (Hash, Bereich, Dimension, Lesezeit, bekannte Spalten, Bodenbereich), geändert ausschließlich über die rückgängig machbare Operation `terrain.set`. Sicherungen nehmen die Datei wie Spielaufnahmen mit, die Wiederherstellung prüft den Verweis, der Datencheck meldet eine fehlende Datei. `DB_VERSION` bleibt 3.

**Anlegen:**

- Projektreiter „Gelände“: Regionsdateien wählen, „Geländeaufnahme speichern“ nimmt den Bauplatz samt einstellbarem Rand (Standard 24) auf, für ein leeres Projekt 64 × 64 um den Ursprung. Erneuern ersetzt den Verweis, Entfernen ist rückgängig machbar.
- Weltimport `#/welt`: „Als Bauplatz anlegen“ macht aus dem gewählten X/Z-Bereich ein neues, leeres Projekt mit Weltlage (Nordwestecke, Ursprung Y eins über dem mittleren Boden) und Geländeaufnahme und öffnet die Weltkarte darauf.

## Weltkarte

- Draufsicht: jede Aufnahme der Dimension unter den Projekten, Farbe des obersten Blocks (Oberseite), schattiert nach Höhe und Hangneigung, gestrichelt umrandet. Unter dem Zeiger steht die Geländehöhe.
- 3D: je bekannter Spalte der oberste Bodenblock (Wasser/Lava, wo sie obenauf liegen; Baumkronen ausgelassen), an Hängen bis zu vier Blöcke nach unten geschlossen (`surveyDisplayCells`). Geplante Blöcke haben Vorrang. Nur Anzeigedaten innerhalb des Kartenbudgets, nie Teil eines Bauplans; über dem Budget bleibt die Aufnahme nur in der Draufsicht.
- Schalter „Gelände (n)“, Hinweiszeile statt „Gelände ungeprüft“, Hinfliegen auch zu einem leeren Bauplatz.
- Detailbereich „Gelände unter dem Projekt“ (`estimateEarthwork`): eigene Aufnahme zuerst, sonst die eines Nachbarprojekts, die den Grundriss abdeckt. Fundamentspalten der untersten Bauschicht tragen oder hängen (Unterbau bis zum Boden), Spalten, in die der Boden hineinragt, brauchen Abtrag, dazu Wasser und Unbekanntes, Bodenbereich und Höhenvorschlag. „Höhe ans Gelände anpassen“ ist eine `world.set`-Operation. Beim Verschieben im Lageformular rechnet die Schätzung live an der neuen Lage.

Die Schätzung ist 2,5D (Höhenkarte): Höhlen, Überhänge und Blöcke im Boden kennt sie nicht. Blockgenau prüft weiter der Reiter „Gelände“ mit den Regionsdateien (`checkTerrain`).

## Anlagen auf Gelände

`packages/domain/src/base/anlagenTerrain.ts`. Ist das Ziel ein Projekt mit Weltlage und Geländeaufnahme derselben Dimension, bietet der Planer „Anlage ans Gelände anpassen“ (Standard an):

- **Einheiten:** jedes Einzelgebäude, jedes eingebettete Ensemble (behält eine Ebene, sein kuratiertes Layout bleibt) und der ganze Hauptweg (eine Höhe, damit die Anschlüsse der Wegmodule weiter exakt aufeinanderliegen).
- **Terrassen (Hanglage):** jede Einheit steht mit ihrer untersten Schicht eins über dem mittleren Boden ihres eigenen Grundrisses.
- **Eine Ebene:** alles auf der Höhe des Wegs (Median des Bodens unter dem Weg).
- Je Einheit: Höhe, Höhenunterschied zum Weg (über einem Block: Treppe oder Rampe nötig), Hang (Bodenunterschied, über vier Blöcken Hinweis auf Stützmauer/Sockel), Unterbau, Abtrag, Wasser, Unbekanntes. Unbekannte Spalten behalten die geplante Höhe und werden genannt.
- **Flachsten Platz suchen:** grobes Raster über alle Versätze, bei denen die ganze Anlage in der Aufnahme liegt, dann Feinsuche um den besten Platz; bewertet werden Unterbau + Abtrag, Wasser, Unbekanntes und große Stufen zum Weg. Das Ergebnis wird als eigener Versatz übernommen, nichts wird gespeichert.
- Der Lageplan zeigt die Höhenkarte unter den Grundflächen; die Höhen gehen über `previewAnlage(…, { heights })` in die blockgenaue Konfliktvorschau ein. Bei der Übernahme wird das gespeicherte Projekt neu gelesen und die Höhe gegen dessen Ursprung neu berechnet; hat sich die Geländeaufnahme seit der Vorschau geändert, wird abgelehnt.

## Türen zum Weg

`packages/domain/src/base/entrance.ts`. Der Eingang eines Gebäudes wird aus der festgehaltenen Version selbst bestimmt: untere Türhälften (ohne Türen Zauntore), nur das unterste Geschoss mit Tür (Balkon- und Obergeschosstüren zählen nicht), die Tür mit dem kleinsten Abstand zum Grundrissrand legt die Seite fest. Das `facing` der Tür wird bewusst nicht verwendet, weil der Katalog Türen an derselben Wand mit unterschiedlichem `facing` setzt.

In Anlagen mit Hauptweg dreht `planAnlage` jedes Einzelgebäude so, dass der Eingang zum Weg zeigt (Nordbereiche nach Süden, Südbereiche nach Norden); bei gleich nahen Türen gewinnt die kleinste Drehung. Eine Drehung von Hand hat Vorrang („automatisch“ setzt sie zurück), der Schalter „Türen zum Weg drehen“ schaltet die Regel ab, Ensembles behalten ihre kuratierte Ausrichtung. Ergebnis im mitgelieferten Katalog: alle 69 Plätze mit Tür oder Tor zeigen zum Weg, alle Standardlayouts bleiben konfliktfrei und abstandsgerecht.

## Prüfung

- `tests/terrain-survey.test.mjs`: echte Regionsdatei mit Hang, Teich, Baum und Gras (`scripts/make_terrain_fixture.py`, nutzt die Schreiber von `make_region_fixture.py`) gegen handberechnete Spalten und gegen die dichte 3D-Probe; Dateiformat und Hash; `terrain.set` mit Rückgängig, Sicherung, Wiederherstellung und Datencheck; Erdarbeiten von Hand gezählt; 3D-Anzeigezellen; Eingangsregel; Türen im ganzen Katalog; Terrassen, eine Ebene, verbundene Wegmodule, Übernahme mit Höhen; Platzsuche.
- `tests/e2e/terrain.e2e.mjs` (1400 und 390 px): Bauplatz aus Regionsdatei → Weltkarte mit Gelände in 2D/3D und Geländehöhe unter dem Zeiger → Anlage „Dorf mit Hof“ mit Türen zum Weg, Gelände, flachstem Platz, Modi → Einfügen → Erdarbeiten-Schätzung auf der Karte → Reiter „Gelände“.

## Grenzen

- Höhenkarte statt Volumen: Höhlen, Überhänge, Erze und Bauten im Boden sind nicht Teil der Schätzung.
- Der Hauptweg bleibt gerade und auf einer Höhe; Weg mit Stufen, Kurven und Abzweigungen ist nicht umgesetzt. Unterbau und Stützmauern werden als Menge genannt, nicht als Blöcke geplant.
- Die Aufnahme ist ein Stand: Änderungen in der Welt danach kennt sie erst nach „Geländeaufnahme erneuern“.
- Abnahme mit Philipps eigener 26.3-Welt und auf echten Geräten offen.

Geplantes Gelände (formen, bemalen, Wasser, Wege, Bauplätze einebnen) beschreibt [LANDSCAPE](LANDSCAPE.md) (TERRAIN-02).
