# Landschaft gestalten (TERRAIN-02)

Stand: 02.11.2026 · Roadmap-ID TERRAIN-02 · baut auf [TERRAIN](TERRAIN.md) (Geländeaufnahme), [WORLD_IMPORT](WORLD_IMPORT.md) und [ANLAGEN](ANLAGEN.md) auf.

Die Geländeaufnahme hält fest, wie der Bauplatz **ist**. Die Geländegestaltung plant, wie er **werden soll**: Hügel und Mulden formen, die Oberfläche wie Biome bemalen, Teiche füllen, Wege mit sanfter Steigung legen und Bauplätze einebnen. Ideen stammen aus Weltplanern wie WorldPainter (Höhenpinsel, automatische Ebenen nach Hang und Höhe) und Axiom (Formpinsel mit weicher Kante); Code, Daten und Bezeichnungen sind eigene Umsetzung. In der Welt ändert sich nichts, bis die Blöcke gebaut werden.

## Datenmodell

`packages/domain/src/terrainDesign.ts`. Je Spalte eines X/Z-Rechtecks (dieselben Grenzen wie die Aufnahme, höchstens 512 × 512):

- `height`: geplanter Boden (Y), `SURVEY_UNKNOWN` für unbekannte Spalten – die werden von keinem Werkzeug verändert.
- `top`/`fill`: oberster Block und Füllblock darunter (Index in `ids`). Der Füllblock wird beim Aufschütten verbaut (Gras → Erde, Sand → Sand, Fels → Stein …, `fillerFor`).
- `water`: Wasserspiegel oder `NO_WATER`; `path`: Wegspalte.
- `base`: Grundlage, entweder die Geländeaufnahme (`{ kind: 'survey', sha256 }`) oder ebener Grund (`{ kind: 'flat', y }`, `flatSurvey`).

**Speicherung:** Binärdatei `BPTDES01` (Kopf als JSON, danach vier 16-Bit-Felder und ein 8-Bit-Feld) im Originalspeicher, Medientyp `application/x-bauplaner-terrain-design`. Das Projekt hält den Verweis `project.terrainDesign` (Hash, Bereich, Dimension, Grundlage, Änderungszeit, Zahl gestalteter Spalten), geändert nur über die rückgängig machbare Operation `terrainDesign.set`. Sicherungen nehmen die Gestaltung **und** die Aufnahme, auf der sie beruht, mit (auch wenn die Aufnahme des Projekts inzwischen erneuert wurde); der Datencheck meldet fehlende Dateien. `DB_VERSION` bleibt unverändert.

## Werkzeuge

Alle Werkzeuge sind deterministisch (gleiche Eingabe, gleiches Ergebnis; Zufall nur über `columnHash`/`valueNoise` je Spalte) und arbeiten auf einer Arbeitskopie mit Rückgängig/Wiederholen (30 Schritte).

| Werkzeug | Wirkung |
| --- | --- |
| Anheben / Absenken | Stärke in Blöcken, Kante hart, weich (Kosinus) oder spitz |
| Glätten | Mittel der Nachbarn, Stärke = Durchgänge |
| Einebnen | auf Zielhöhe oder die Höhe beim Ansetzen |
| Aufrauen | weiches Rauschen (Hügel, Mulden), für dieselbe Stelle immer gleich |
| Terrassen | rastet auf Vielfache der Stufenhöhe ein |
| Hänge abflachen | trägt Klippen ab, bis keine Stufe höher als die Stärke ist |
| Bemalen | Stile wie Biome (Wiese, Waldboden, Moos, Sumpf, Strand, Wüste, Fels, Geröll, Schnee, Lehm; Wegbeläge Trampelpfad, Kiesweg, Pflaster, Steinweg), gemischte Blöcke je Spalte fest; Filter „nur Hang ab“, „nur ab/bis Y“, „nicht unter Wasser“ |
| Wasser füllen | Eimerfüllung von einer Spalte aus bis zum Wasserspiegel über alle verbundenen tieferen Spalten; meldet, wenn das Wasser bis an den Rand läuft (kein Ufer) |
| Wasser entfernen | Pinsel |
| Weg | Wegpunkte, 4-verbundene Mittellinie, Höhen geglättet und auf höchstens einen Block je Schritt begrenzt, Breite eingeebnet und mit Belag bemalt, über Wasser als Damm; Bericht mit Höhenwechseln (Stufen/Treppen setzen) |
| Pipette | übernimmt Höhe und Wasserspiegel |

Für die ganze Fläche: **Automatisch bemalen** (Fels ab Hangstufe, Schnee ab Y, Strand bis n Blöcke vom Wasser, sonst ein Stil; Wege bleiben), **Bauplätze einebnen** (`gradeFootprints`: unter jedem geplanten Block liegt der Boden genau eine Schicht tiefer, Übergang läuft weich aus – danach zeigt die Erdarbeiten-Schätzung weder Unterbau noch Abtrag) und **Zurücksetzen**.

## Bilanz und Blöcke

`compareDesign` vergleicht mit der Grundlage: gestaltete, angehobene, abgesenkte, neu bemalte und trockengelegte Spalten, Abtrag und Aufschüttung in Blöcken, Wasserblöcke, Wegspalten, Höhenbereich und Materialliste.

`designPayload` erzeugt die Blöcke als Bauteil-Payload: Füllblöcke und Oberblock beim Aufschütten, **ausdrückliche Luft** beim Abtragen und über veränderten Spalten (Pflanzen, Laub), den Oberblock beim Neubemalen, Wasser (`level=0`) und Luft beim Trockenlegen. Zustände kommen aus den Blockfakten 26.3 (`completeState`, z. B. `grass_block[snowy=false]`). Zellen, auf denen geplante Bauten stehen, werden ausgelassen (`skip`), damit Gelände und Gebäude nie in Voxelkonflikt geraten. Grenze: 1 000 000 Zellen.

## Oberfläche

Projektreiter **„Landschaft“** (`#/projekt/<id>/landschaft`, `apps/web/src/views/project/LandscapeTab.tsx`):

- Start auf der Geländeaufnahme oder auf ebenem Grund (Bereich um das Projekt, Bodenhöhe wählbar).
- Draufsicht (`landscape/DesignCanvas.tsx`) mit Pinseln für Maus, Stift und Touch, Ansichten Gelände, Höhenlinien (alle vier Blöcke) und Änderungen (Abtrag rot, Aufschüttung grün, Wasser blau, Bemalung gelb), Grundriss der geplanten Bauten, Höhe und Block unter dem Zeiger, 3D-Vorschau mit der normalen Blockdarstellung.
- Tastatur: A/S/G/E/R/T/H formen, B malen, W Wasser, D trocknen, P Weg, I Pipette, +/− Pinselgröße, Strg+Z/Strg+Y.
- Bilanz, Materialliste, Speichern/Entfernen (eine Projektoperation).

## Übergabe

- **Weltkarte:** Projekte mit Gestaltung zeigen das geplante Gelände (`designedSurvey`: unveränderte Spalten behalten die Aufnahme samt Bäumen); Schalter „geplantes Gelände“ zum Vergleich mit der Aufnahme. Die Erdarbeiten-Schätzung rechnet gegen das gezeigte Gelände.
- **Anlagen:** Terrassen, eine Ebene und „Flachsten Platz suchen“ rechnen mit dem geplanten Gelände (Schalter im Gelände-Panel). Der Link „Anlage auf diesem Gelände planen“ wählt das Projekt als Ziel vor (`?ziel=`). Bei der Übernahme wird geprüft, ob sich Aufnahme oder Gestaltung seit der Vorschau geändert haben.
- **Bauteil im Projekt:** „Als Bauteil ins Projekt übernehmen“ legt ein Bauteil (Quelle `terrain-design`, `localTo` = Projekt, Weltbereich) an und setzt es an die Weltlage; ein früheres Geländebauteil wird in derselben Operation ersetzt. Damit zählen Material, Bauen, Export (Schem/Litematic) und die Mod das Gelände mit.
- **Werkstatt (EDIT-03/EDIT-04):** eigene Bäume, Felsen und andere Natur-Bauteile, die in der Werkstatt als Schablone gespeichert werden, lassen sich über die Streu-Ebene verteilen (siehe unten).

## Streu-Ebene (S06)

`packages/domain/src/terrainScatter.ts` (Verteilung, Bauteile, Blöcke) und `terrainScatterPlan.ts` (Daten, Prüfung). Idee wie die Objektebenen von WorldPainter, eigene Umsetzung.

- **Bauteile:** eingebaut Eiche, Birke, Fichte, Kirschbaum, Busch, Felsbrocken, Steine, Blumen, Gras, Farn, Pilze, Kaktus, Toter Busch, Zuckerrohr – je mit Varianten, Laub dauerhaft (`persistent=true`), Zustände aus den Blockfakten 26.3. Dazu jede **eigene Schablone** (Bibliotheksmodul mit Schlagwort `schablone`, EDIT-03/EDIT-04): unterste Schicht steht auf dem Boden, Luftzellen werden nicht gesetzt, höchstens 4 096 Blöcke.
- **Ebene:** Bauteil, Dichte (Teile je 1 000 Spalten), Mindestabstand, Oberflächenstile (wie Biome; erkannt am obersten Block der Spalte), Hang von/bis, Höhe von/bis, „nur bis n vom Wasser“, Abstand zu Bauten, Startwert. Mischungen legen mehrere Ebenen auf einmal an (Mischwald, Nadelwald, Blumenwiese, Felsen und Geröll, Wüste, Ufer, Kirschhain, Pilze im Wald).
- **Verteilung:** deterministisch – verwürfeltes Raster mit Zellgröße = Abstand, je Zelle höchstens ein Kandidat mit Wahrscheinlichkeit Dichte·Abstand²/1000, Lage, Variante und Drehung aus `columnHash`. Gleiches Gelände, gleiche Ebene, gleicher Startwert ergeben dieselben Teile; „Neu würfeln“ wechselt den Startwert.
- **Passt ein Teil?** Ankerspalte bekannt, kein Wasser, kein Weg, genug Abstand zu Bauten, passender Boden (Bäume: Erde/Gras/Moos/Schnee; Pflanzen: Gras/Erde/Moos; Kaktus: Sand und freie Seiten; Zuckerrohr: Wasser direkt neben dem Standblock). Jede Zelle des Teils liegt im Bereich, über dem geplanten Boden (Felsen dürfen einsinken), über Wasser und – auf unveränderten Spalten – über dem gemessenen Bestand (vorhandene Bäume), nicht in einer geplanten Bauzelle und nicht in einem anderen Teil.
- **Speicherung:** im Kopf der Gestaltungsdatei (`scatter`: Ebenen und Teile mit Anker X/Z, Drehung, Variante, „von Hand“). Ältere Dateien ohne Streu-Ebene bleiben gültig; Rückgängig, Sichern und Wiederherstellen laufen mit der Gestaltung. Höchstens 32 Ebenen und 50 000 Teile.
- **Bearbeiten:** jede Einstellungsänderung streut die Ebene sofort neu (von Hand gesetzte Teile bleiben); Werkzeug **Streuen** (Taste N): „Setzen“ stellt ein Teil der gewählten Ebene hin und nennt sonst den Grund, „Entfernen“ nimmt Teile im Pinselkreis weg; Leeren, Ebene löschen, Ebene ausblenden.
- **Gelände ändert sich danach:** Teile tragen keine feste Höhe, sie stehen immer auf dem aktuellen geplanten Boden. Teile, die nicht mehr passen (z. B. jetzt im Wasser), werden ausgelassen und unter „Passen nicht mehr“ gezählt.
- **Übergabe:** `scatterCells` liefert die Blöcke; „Als Bauteil ins Projekt übernehmen“ gibt sie `designPayload` als `extra` mit, ein Teil ersetzt dabei die Geländezelle an derselben Stelle. Damit zählen Material, Bauen, Schem/Litematic-Export und die Mod Bäume und Felsen mit. Die Weltkarte zeigt Kronen und Felsen der eingebauten Bauteile als Oberfläche (`plannedSurvey`; Pflanzen wie im Spiel nicht), der Boden bleibt der Boden. Draufsicht mit Punkten je Gruppe, 3D-Vorschau mit den Teilen.

## Prüfung

- `tests/terrain-design.test.mjs` (10 Fälle): Start aus Aufnahme und ebenem Grund, alle Pinsel mit Handwerten (Kante, Ziel, Glätten, Terrassen, Klippen, Grenzen, Unbekanntes), Stile und Filter, Eimerfüllung mit offenem Rand, Wege (Mittellinie, Steigung ≤ 1, Breite, Damm), automatisches Bemalen, Einebnen unter Bauten mit anschließender Erdarbeiten-Schätzung 0, Blöcke Zelle für Zelle, geplantes Gelände, Dateiformat, `terrainDesign.set` mit Rückgängig, Sicherung (beide Originale), Wiederherstellung und Datencheck.
- `tests/terrain-scatter.test.mjs` (8 Fälle): eingebaute Bauteile, Determinismus, Dichte und Abstand, Regeln (Stil, Hang, Höhe, Ufer, Wasser, Weg, Bauten, Bestand), Handsetzen/Entfernen, Teile folgen dem Gelände, Blöcke im Geländebauteil mit gültigem Payload, Datei-Rundreise, gedrehte Schablone mit Zuständen, Kaktusregeln.
- `tests/e2e/landscape-scatter.e2e.mjs` (Chromium 1400 und 390 px): Mischwald streuen, erneut streuen ergibt dasselbe, Ebene ändern, von Hand setzen und entfernen, Rückgängig, 3D, Speichern/Neuladen, Bauteil im Projekt mit Laub und Stämmen in der Materialliste.
- `tests/e2e/landscape.e2e.mjs` (Chromium 1400 und 390 px, Touch): Bauplatz aus echter Regionsdatei → Anheben per Ziehen, Rückgängig/Wiederholen, Bemalen, Mulde graben und füllen, Weg legen, Ansichten und 3D → Speichern und Neuladen → Weltkarte mit geplantem Gelände und Umschalter → Anlage mit vorausgewähltem Ziel und Geländequelle → Bauteil im Projekt, Materialliste.

## Grenzen

- Höhenkarte: keine Höhlen, Überhänge oder Tunnel; Wasser ist ruhendes Wasser je Spalte, keine Strömung.
- Biome im Sinne des Spiels (Biom-IDs, Farben von Gras und Laub) werden nicht geändert, nur Blöcke der Oberfläche.
- Wege bekommen keine Treppen- oder Stufenblöcke; der Bericht nennt die Höhenwechsel (S07).
- Streu-Ebene: Oberflächenstile werden am obersten Block erkannt (Gras gehört zu Wiese, Waldboden und Moos). Die Weltkarte zeigt eigene Schablonen nicht als Oberfläche; Bäume werden nicht als wachsende Setzlinge, sondern fertig geplant.
- Abnahme in Philipps eigener 26.3-Welt und auf echten Touch-Geräten offen.
