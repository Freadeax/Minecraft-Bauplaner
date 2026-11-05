# Landschaft gestalten (TERRAIN-02)

Stand: 04.11.2026 · Roadmap-IDs TERRAIN-02, TERRAIN-03 (Gelände und Wege) · baut auf [TERRAIN](TERRAIN.md) (Geländeaufnahme), [WORLD_IMPORT](WORLD_IMPORT.md) und [ANLAGEN](../bibliothek/ANLAGEN.md) auf.

Die Geländeaufnahme hält fest, wie der Bauplatz **ist**. Die Geländegestaltung plant, wie er **werden soll**: Hügel und Mulden formen, die Oberfläche wie Biome bemalen, Teiche füllen, Wege mit sanfter Steigung legen und Bauplätze einebnen. Ideen stammen aus Weltplanern wie WorldPainter (Höhenpinsel, automatische Ebenen nach Hang und Höhe) und Axiom (Formpinsel mit weicher Kante); Code, Daten und Bezeichnungen sind eigene Umsetzung. In der Welt ändert sich nichts, bis die Blöcke gebaut werden.

## Datenmodell

`packages/domain/src/world/terrainDesign.ts`. Je Spalte eines X/Z-Rechtecks (dieselben Grenzen wie die Aufnahme, höchstens 512 × 512):

- `height`: geplanter Boden (Y), `SURVEY_UNKNOWN` für unbekannte Spalten – die werden von keinem Werkzeug verändert.
- `top`/`fill`: oberster Block und Füllblock darunter (Index in `ids`). Der Füllblock wird beim Aufschütten verbaut (Gras → Erde, Sand → Sand, Fels → Stein …, `fillerFor`).
- `water`: Wasserspiegel oder `NO_WATER`; `path`: Wegspalte (0 = kein Weg, 1 = Weg; TERRAIN-03: 2…5 Treppe, die nach Norden/Osten/Süden/Westen ansteigt, 6 Halbstufe, 7 Brückenfeld, 8 Brückenfeld mit Geländer).
- `step` (TERRAIN-03): Block der Wegstufe bzw. des Brückenbelags (Index in `ids`, 0 = keiner).
- `base`: Grundlage, entweder die Geländeaufnahme (`{ kind: 'survey', sha256 }`) oder ebener Grund (`{ kind: 'flat', y }`, `flatSurvey`).

**Speicherung:** Binärdatei `BPTDES01` (Kopf als JSON, danach vier 16-Bit-Felder und ein 8-Bit-Feld; mit Wegstufen oder Brücken steht im Kopf `steps: true` und `step` folgt als fünftes 16-Bit-Feld – Dateien ohne Wegstufen bleiben Byte für Byte wie vorher) im Originalspeicher, Medientyp `application/x-bauplaner-terrain-design`. Das Projekt hält den Verweis `project.terrainDesign` (Hash, Bereich, Dimension, Grundlage, Änderungszeit, Zahl gestalteter Spalten), geändert nur über die rückgängig machbare Operation `terrainDesign.set`. Sicherungen nehmen die Gestaltung **und** die Aufnahme, auf der sie beruht, mit (auch wenn die Aufnahme des Projekts inzwischen erneuert wurde); der Datencheck meldet fehlende Dateien. `DB_VERSION` bleibt unverändert.

## Werkzeuge

Alle Werkzeuge sind deterministisch (gleiche Eingabe, gleiches Ergebnis; Zufall nur über `columnHash`/`valueNoise` je Spalte) und arbeiten auf einer Arbeitskopie mit Rückgängig/Wiederholen (30 Schritte).

| Werkzeug | Wirkung |
| --- | --- |
| Anheben / Absenken | Stärke in Blöcken, Kante hart, weich (Kosinus) oder spitz |
| Glätten | Mittel der Nachbarn, Stärke = Durchgänge |
| Einebnen | auf Zielhöhe oder die Höhe beim Ansetzen |
| Aufschütten (U, TERRAIN-03) | füllt nur, was tiefer als die Zielhöhe liegt (Mulden, Senken); Höheres bleibt stehen |
| Abtragen (K, TERRAIN-03) | trägt nur ab, was höher als die Zielhöhe liegt (Kuppen, Hügel); Mulden bleiben |
| Rampe (M, TERRAIN-03) | zwei Klicks: gleichmäßige Steigung von Anfang bis Ende (Höhen aus dem Gelände oder eingegeben), volle Breite exakt, Übergang läuft weich ins Gelände aus; meldet Länge und Steigung in Prozent |
| Aufrauen | weiches Rauschen (Hügel, Mulden), für dieselbe Stelle immer gleich |
| Terrassen | rastet auf Vielfache der Stufenhöhe ein |
| Hänge abflachen | trägt Klippen ab, bis keine Stufe höher als die Stärke ist |
| Bemalen | Stile wie Biome (Wiese, Waldboden, Moos, Sumpf, Strand, Wüste, Fels, Geröll, Schnee, Lehm; Wegbeläge Trampelpfad, Kiesweg, Pflaster, Steinweg), gemischte Blöcke je Spalte fest; Filter „nur Hang ab“, „nur ab/bis Y“, „nicht unter Wasser“ |
| Wasser füllen | Eimerfüllung von einer Spalte aus bis zum Wasserspiegel über alle verbundenen tieferen Spalten; meldet, wenn das Wasser bis an den Rand läuft (kein Ufer) |
| Wasser entfernen | Pinsel |
| Weg | Wegpunkte (oder ein Weg aus der Weltkarte), 4-verbundene Mittellinie, Höhen geglättet und auf höchstens einen Block je Schritt begrenzt, Breite eingeebnet und mit Belag bemalt; Treppen oder Halbstufen an jedem Höhenwechsel; über Wasser als Damm oder Brücke (siehe unten) |
| Pipette | übernimmt Höhe und Wasserspiegel |

Für die ganze Fläche: **Automatisch bemalen** (Fels ab Hangstufe, Schnee ab Y, Strand bis n Blöcke vom Wasser, sonst ein Stil; Wege bleiben), **Bauplätze einebnen** (`gradeFootprints`: unter jedem geplanten Block liegt der Boden genau eine Schicht tiefer, Übergang läuft weich aus – danach zeigt die Erdarbeiten-Schätzung weder Unterbau noch Abtrag) und **Zurücksetzen**.

## Wegstufen und Brücken (TERRAIN-03)

`layPath` mit `steps`, `material` und `water`; Domäne in `terrainDesign.ts` (`PATH_MATERIALS`, `risingDirs`, `pathPieceCells`).

- **Treppen:** Jede Wegspalte, deren Nachbar auf dem Weg genau einen Block höher liegt, bekommt eine Treppe einen Block über ihrem Boden – über die ganze Wegbreite. Sie zeigt bergauf (`facing` = Richtung, in die man hinaufgeht), bevorzugt entlang der Wegrichtung, egal in welcher Richtung der Weg gelegt wurde. Zustände kommen aus den Blockfakten 26.3 (`half=bottom`, `shape=straight`, `waterlogged=false`).
- **Halbstufen:** dieselben Stellen mit einer unteren Stufe (`type=bottom`).
- **Material:** Fichte, Eiche, Schwarzeiche, Bruchstein, bemooster Bruchstein, Steinziegel, polierter Andesit, Sandstein, Ziegel – je Treppe, Stufe, Brückenbelag und Geländer (Zaun bzw. Mauer). „Passend zum Belag“: Trampelpfad → Fichte, Kiesweg und Pflaster → Bruchstein, Steinweg → Steinziegel.
- **Brücke:** Statt eines Damms liegt über dem Wasser ein Belag einen Block über dem Wasserspiegel; Wasser und Grund darunter bleiben unverändert. Die erste Uferspalte auf jeder Seite liegt eben mit dem Belag (Absatz), damit Treppen von dort ans höhere Ufer führen – ein Brückenfeld selbst trägt keine Treppe. Geländer stehen auf jedem Brückenfeld, das an etwas grenzt, das kein Weg ist (Wasser, Ufer, Rand); Zäune und Mauern verbinden sich mit den Nachbargeländern.
- **Bericht:** Höhenwechsel, gesetzte Treppen/Halbstufen, Brückenfelder, Geländer und „ohne Stufe“ (Wechsel um mehr als einen Block oder Stufen abgewählt).
- **Spätere Änderungen:** Wird eine Stufenspalte angehoben, abgesenkt oder mit einem Nicht-Wegstil bemalt, verschwindet ihre Stufe. Eine Treppe, deren höherer Nachbar nicht mehr genau einen Block höher liegt, wird beim Erzeugen der Blöcke ausgelassen – es gibt keine Treppen ins Leere. Trockenlegen nimmt die Brücke weg.
- **Weg aus der Weltkarte:** Beim Werkzeug „Weg“ stehen alle Wege des Weltplans (MAP-04/MAP-06) derselben Dimension, die die Gestaltung kreuzen, zur Auswahl. „Übernehmen“ setzt ihre Eckpunkte und Breite (höchstens 9) als Wegpunkte, den Belag nach Wegart (Weg → Trampelpfad, Straße → Pflaster, Schiene → Kiesweg, Brücke → Steinweg und „Brücke mit Geländer“). Gelegt wird erst mit „Weg legen“.
- **Übergabe:** Stufen, Belag und Geländer gehören zu `designPayload` (Bauteil, Material, Export, Mod) und zur 3D-Vorschau; im geplanten Gelände (`designedSurvey`) ist der Brückenbelag die Oberfläche, der Grund bleibt das Gewässerbett – Weltkarte und Routen sehen die Brücke.

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

`packages/domain/src/world/terrainScatter.ts` (Verteilung, Bauteile, Blöcke) und `terrainScatterPlan.ts` (Daten, Prüfung). Idee wie die Objektebenen von WorldPainter, eigene Umsetzung.

- **Bauteile:** eingebaut Eiche, Birke, Fichte, Kirschbaum, Busch, Felsbrocken, Steine, Blumen, Gras, Farn, Pilze, Kaktus, Toter Busch, Zuckerrohr – je mit Varianten, Laub dauerhaft (`persistent=true`), Zustände aus den Blockfakten 26.3. Dazu jede **eigene Schablone** (Bibliotheksmodul mit Schlagwort `schablone`, EDIT-03/EDIT-04): unterste Schicht steht auf dem Boden, Luftzellen werden nicht gesetzt, höchstens 4 096 Blöcke.
- **Ebene:** Bauteil, Dichte (Teile je 1 000 Spalten), Mindestabstand, Oberflächenstile (wie Biome; erkannt am obersten Block der Spalte), Hang von/bis, Höhe von/bis, „nur bis n vom Wasser“, Abstand zu Bauten, Startwert. Mischungen legen mehrere Ebenen auf einmal an (Mischwald, Nadelwald, Blumenwiese, Felsen und Geröll, Wüste, Ufer, Kirschhain, Pilze im Wald).
- **Verteilung:** deterministisch – verwürfeltes Raster mit Zellgröße = Abstand, je Zelle höchstens ein Kandidat mit Wahrscheinlichkeit Dichte·Abstand²/1000, Lage, Variante und Drehung aus `columnHash`. Gleiches Gelände, gleiche Ebene, gleicher Startwert ergeben dieselben Teile; „Neu würfeln“ wechselt den Startwert.
- **Passt ein Teil?** Ankerspalte bekannt, kein Wasser, kein Weg, genug Abstand zu Bauten, passender Boden (Bäume: Erde/Gras/Moos/Schnee; Pflanzen: Gras/Erde/Moos; Kaktus: Sand und freie Seiten; Zuckerrohr: Wasser direkt neben dem Standblock). Jede Zelle des Teils liegt im Bereich, über dem geplanten Boden (Felsen dürfen einsinken), über Wasser und – auf unveränderten Spalten – über dem gemessenen Bestand (vorhandene Bäume), nicht in einer geplanten Bauzelle und nicht in einem anderen Teil.
- **Speicherung:** im Kopf der Gestaltungsdatei (`scatter`: Ebenen und Teile mit Anker X/Z, Drehung, Variante, „von Hand“). Ältere Dateien ohne Streu-Ebene bleiben gültig; Rückgängig, Sichern und Wiederherstellen laufen mit der Gestaltung. Höchstens 32 Ebenen und 50 000 Teile.
- **Bearbeiten:** jede Einstellungsänderung streut die Ebene sofort neu (von Hand gesetzte Teile bleiben); Werkzeug **Streuen** (Taste N): „Setzen“ stellt ein Teil der gewählten Ebene hin und nennt sonst den Grund, „Entfernen“ nimmt Teile im Pinselkreis weg; Leeren, Ebene löschen, Ebene ausblenden.
- **Gelände ändert sich danach:** Teile tragen keine feste Höhe, sie stehen immer auf dem aktuellen geplanten Boden. Teile, die nicht mehr passen (z. B. jetzt im Wasser), werden ausgelassen und unter „Passen nicht mehr“ gezählt.
- **Übergabe:** `scatterCells` liefert die Blöcke; „Als Bauteil ins Projekt übernehmen“ gibt sie `designPayload` als `extra` mit, ein Teil ersetzt dabei die Geländezelle an derselben Stelle. Damit zählen Material, Bauen, Schem/Litematic-Export und die Mod Bäume und Felsen mit. Die Weltkarte zeigt Kronen und Felsen der eingebauten Bauteile als Oberfläche (`plannedSurvey`; Pflanzen wie im Spiel nicht), der Boden bleibt der Boden. Draufsicht mit Punkten je Gruppe, 3D-Vorschau mit den Teilen.

## Prüfung

- `tests/unit/world/terrain-design.test.mjs` (10 Fälle): Start aus Aufnahme und ebenem Grund, alle Pinsel mit Handwerten (Kante, Ziel, Glätten, Terrassen, Klippen, Grenzen, Unbekanntes), Stile und Filter, Eimerfüllung mit offenem Rand, Wege (Mittellinie, Steigung ≤ 1, Breite, Damm), automatisches Bemalen, Einebnen unter Bauten mit anschließender Erdarbeiten-Schätzung 0, Blöcke Zelle für Zelle, geplantes Gelände, Dateiformat, `terrainDesign.set` mit Rückgängig, Sicherung (beide Originale), Wiederherstellung und Datencheck.
- `tests/unit/world/terrain-scatter.test.mjs` (8 Fälle): eingebaute Bauteile, Determinismus, Dichte und Abstand, Regeln (Stil, Hang, Höhe, Ufer, Wasser, Weg, Bauten, Bestand), Handsetzen/Entfernen, Teile folgen dem Gelände, Blöcke im Geländebauteil mit gültigem Payload, Datei-Rundreise, gedrehte Schablone mit Zuständen, Kaktusregeln.
- `tests/e2e/landscape-scatter.e2e.mjs` (Chromium 1400 und 390 px): Mischwald streuen, erneut streuen ergibt dasselbe, Ebene ändern, von Hand setzen und entfernen, Rückgängig, 3D, Speichern/Neuladen, Bauteil im Projekt mit Laub und Stämmen in der Materialliste.
- `tests/unit/world/terrain-paths.test.mjs` (8 Fälle, TERRAIN-03): Aufschütten/Abtragen nur einseitig, Rampe (gleichmäßig, Breite, Übergang, unbekannte Enden), Treppen je Höhenwechsel über die Breite und bergauf in beiden Legerichtungen, gültige Zustände im Payload, Halbstufen, Stufen nach späteren Pinselstrichen, Brücke (Belag, Geländer mit Verbindungen, Wasser bleibt, geplantes Gelände), Brücke mit hohem Ufer (Absatz und Treppen), Datei mit und ohne Wegstufen, alle Materialien sind Blöcke in 26.3.
- `tests/e2e/landscape-paths.e2e.mjs` (Chromium 1400 und 390 px, Touch): ebener Grund → Aufschütten, Graben abtragen, Rampe, Weg mit Treppen, Wasser im Graben, Brücke aus Eiche → 3D, Speichern, Neuladen → Bauteil im Projekt mit Treppen und Zäunen in der Materialliste.
- `tests/e2e/landscape.e2e.mjs` (Chromium 1400 und 390 px, Touch): Bauplatz aus echter Regionsdatei → Anheben per Ziehen, Rückgängig/Wiederholen, Bemalen, Mulde graben und füllen, Weg legen, Ansichten und 3D → Speichern und Neuladen → Weltkarte mit geplantem Gelände und Umschalter → Anlage mit vorausgewähltem Ziel und Geländequelle → Bauteil im Projekt, Materialliste.

## Grenzen

- Höhenkarte: keine Höhlen, Überhänge oder Tunnel; Wasser ist ruhendes Wasser je Spalte, keine Strömung.
- Biome im Sinne des Spiels (Biom-IDs, Farben von Gras und Laub) werden nicht geändert, nur Blöcke der Oberfläche.
- Wegstufen gibt es nur für Höhenwechsel um genau einen Block; Brücken liegen immer einen Block über dem Wasser (keine hohen Bögen oder Pfeiler). Wege des Basisplaners (BASE-01) liegen auf ebenem Grund und bekommen ihre Stufen erst, wenn sie in der Landschaft als Weg gelegt werden.
- Streu-Ebene: Oberflächenstile werden am obersten Block erkannt (Gras gehört zu Wiese, Waldboden und Moos). Die Weltkarte zeigt eigene Schablonen nicht als Oberfläche; Bäume werden nicht als wachsende Setzlinge, sondern fertig geplant.
- Abnahme in Philipps eigener 26.3-Welt und auf echten Touch-Geräten offen.
