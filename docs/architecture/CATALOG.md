# Gebäudekatalog: Vorschläge, Kennwerte und Filter (B9)

Stand: 28.10.2026 (Katalog v2). Code: `packages/domain/src/catalog.ts` (Facetten, Kennwerte, Spielphase, Familien, Suche, Vorschläge), `packages/domain/src/buildings.ts` (Register der mitgelieferten Gebäude), `packages/domain/src/build/` (Bauwerkzeug `plot.ts`, `spec.ts` und zehn Themen-Sets unter `sets/`), `packages/domain/src/ensembles.ts`, Oberfläche `views/LibraryView.tsx` mit `views/library/BuildingSheet.tsx`, `CatalogFilters.tsx`, `FacetFields.tsx`. Tests: `tests/catalog.test.mjs`, `tests/e2e/catalog.e2e.mjs`. Ergänzt den [Domänenvertrag](DOMAIN.md).

## Zwei Arten von Werten

| Art | Herkunft | Kennzeichnung |
|---|---|---|
| **Angaben** | Kategorie, Stil, Biom, Funktion: Aussagen des Autors, gespeichert als Tags `<schlüssel>:<wert>` am Asset | Badge „Angabe“; Beispiele schreibgeschützt, eigene Bauteile über „Angaben bearbeiten“ |
| **Kennwerte** | `analyzeVersion(version)` aus der unveränderlichen Version, mit den gemeinsamen Regeln aus `packages/voxel`, B1 (Material), B4 (Phasen) und B7 (Zustände) | Badge „berechnet“ bzw. „gezählt“; Heuristiken nennen Formel und Annahmen |

Facetten-Tags brauchen keine Schemaänderung: Speicherung, Sicherung und Suche funktionieren unverändert. Unbekannte Werte (selbst getippt) bleiben erhalten und werden wörtlich angezeigt. Tags ohne bekannten Präfix sind normale Tags.

Vokabular (`FACETS`): Kategorie (Wohnhaus, Landwirtschaft, Handwerk, Handel, Sakralbau, Befestigung, Infrastruktur, Wahrzeichen, Dekoration, Statue, Farm, Redstone-Technik, Landschaft & Bäume, Basis; seit v2 auch Magie, Fahrzeug, Garten), Stil (v2: fernöstlich, Fantasy, antik, industriell, tropisch, Nether, End, technisch), Biom (inkl. „Überall passend“, das jeden Biomfilter erfüllt; v2: Ozean, Kirschhain, Pilzinsel, Tafelberge, Höhle, Nether, End), Funktion (v2: Ressourcen, Transport, Verzaubern, Schmelzen, Sortieren, Beleuchtung, Reisen, Unterhaltung, Handelsplatz).

Der Präfix `familie:<id>` ist kein Facettenwert, sondern verbindet Varianten (siehe unten); er erscheint nicht unter den normalen Tags.

## Kennwerte je Version

Abmessungen B × H × T, umbauter Raum, Grundfläche (belegte x/z-Säulen) mit Größenklasse (≤ 25 / ≤ 100 / ≤ 400 / > 400 m²), Umfang nach Blöcken XS–XL (< 500 / < 2 000 / < 10 000 / < 50 000 / ≥ 50 000), Blöcke, freizuräumende Luftzellen, Füllgrad, Schichten, Blocktypen/Zustände, häufigste Blöcke (12) mit Anteil, Materialgruppen nach Namensregeln, Bauitems/Inventarplätze/Shulkerkisten und Vollständigkeit aus `computeMaterials`, Bauphasen wie die Bauanleitung, ausgerichtete Blöcke (`needsOrientation`: facing/rotation/hinge/orientation, liegende Achsen, obere Hälften, obere Stufen), Drehen/Spiegeln gelöst laut B7-Katalog, Anschlüsse, Mod-Namensräume, „gespeichert in“ (DataVersion nur bei Dateiimport, sonst „unbekannt“).

Ausstattung (gezählt): Betten (Fußteile), Türen (untere Hälften), Glasblöcke, Lichtquellen mit Summe der Vanilla-Lichtstufen (ohne Lichtsimulation; Öfen nur mit `lit=true`), Lagerplätze (Truhe/Fass 27, Trichter 5, Spender/Werfer 9), Arbeitsblöcke mit Dorfbewohnerberuf.

Heuristiken:

- **Schwierigkeit 1–5** = 1 + ⌊Punkte / 2⌋. Punkte: Blockzahl (0–4: < 100 / < 300 / < 800 / < 2 000 / mehr), Zustandsvielfalt (≥ 15: 1, ≥ 30: 2), Anteil ausgerichteter Blöcke (≥ 12 %: 1, ≥ 30 %: 2), Höhe ≥ 12, Flüssigkeit oder Schwerkraft, ≥ 10 angebrachte Blöcke. Jeder Faktor wird im Steckbrief gezeigt.
- **Bauzeit (Schätzung)** = 1,2 s je Block + 1,5 s je ausgerichtetem Block + 0,4 s je Luftzelle + 12 s je Schicht; Überleben, Material griffbereit, ohne Gelände und Beschaffung.

**Spielphase (berechnet)** Start / Frühes Spiel / Mittleres Spiel / Spätes Spiel: jede Block-ID wird über die geordnete Regelliste `STAGE_RULES` einer Phase zugeordnet (z. B. Glas, Ziegel, Laternen, Öfen ⇒ früh; Obsidian, Redstone-Technik, Tiefenschiefer, Netherblöcke ⇒ mitte; Purpur, Endstein, Leuchtfeuer, Shulker ⇒ spät; spätere Regel gewinnt). Das Gebäude erhält die späteste Phase seiner Blöcke; der Steckbrief nennt die auslösenden Blöcke. Unbekannte Blöcke zählen als Start. Das ist eine Faustregel für den Überlebensmodus, keine Fortschrittsprüfung.

Kennwerte sind reine Funktionen der inhaltsadressierten Version; die Oberfläche cached sie nach Versions-ID.

## Suche, Filter, Sortierung

`queryCatalog`: Text über Name, Beschreibung, Tags, Facettenwerte und -namen, Herkunft, häufigste Block-IDs und Berufe. Facetten: innerhalb einer Gruppe ODER, zwischen Gruppen UND. Weitere Filter: Größenklasse, Umfang, Schwierigkeit, Bauzeit, Bauplatz (Breite/Tiefe/Höhe, wahlweise mit 90°-Drehung), Herkunft (Vorschläge/eigene), nur vollständige Materialliste, nur Vanilla, mit Anschlüssen/Anschlusstyp, mit Schlafplatz, Archivierte. `facetCounts` zeigt je Wert die Treffer unter allen übrigen Filtern. Weiter: `stageMax` (höchstens bis zu einer Spielphase) und `collapseFamilies` (je Variantenfamilie nur der beste Treffer, Liste zeigt „+N Varianten“; in der Oberfläche standardmäßig an, abschaltbar). Sortierung: Passung, Name, Blöcke, Grundfläche, Höhe, Schwierigkeit, Bauzeit, Bauitems, Spielphase, zuletzt geändert; gleiche Werte nach Name und ID. Der Suchtext umfasst zusätzlich Familienname und Phasenbezeichnung.

## Vorschläge für ein Projekt

`projectContext` liest aus Projekt und aufgelöster Welt: Blockverteilung, verwendete Assets, gewichtete Angaben der verwendeten Bauteile, freie Anschlüsse (`Typ|Profil` mit Kapazität laut `maxLinks`). `suggestForProject` vergibt höchstens 100 Punkte, jeder Punkt als Grund sichtbar: Materialähnlichkeit 35 (Σ min der Anteile), gleicher Stil 20, Biom 15, freier passender Anschluss 15, neue Kategorie 10, gleiches Profil 5, bereits verwendet −10. Hinweise: Profilabweichung, leeres Projekt, unvollständige Materialliste. `similarEntries`: Material 50, Kategorie 20, Stil 20, Biom 10.

„Ins Projekt übernehmen“ fügt die neueste Version wie der Editor neben dem bestehenden Bau ein und speichert mit der aktuellen Projektrevision (Konflikt ⇒ Fehlermeldung, nichts überschrieben). Andocken bleibt ein ausdrücklicher Schritt im Editor (B5). Route `#/bibliothek/fuer/<projekt>` öffnet die Bibliothek mit Vorschlägen; der Editor verlinkt dorthin.

## Mitgelieferte Gebäude

150 eigene synthetische Entwürfe aus Code plus die drei B0-Module (153 Einträge); seit B12 weitere 24 (Spielhilfen und Materialvarianten, siehe [SCHEM_VIEWS](SCHEM_VIEWS.md#bibliothek)), zusammen 174 plus 3 Module. Keine importierten Welten, keine fremden Schematics, keine Texturen.

- **Klassisch (16, unverändert):** Fachwerkhaus, Blockhütte, Wüstenhaus, Leuchtturm, Dorfbrunnen, Schmiede, Scheune, Marktstand, Kapelle, Gewächshaus, Moderne Villa, Iglu, Steinbrücke, Hafensteg, Holz-Wachturm, Baumhaus. Ihre Versions-IDs sind im Test festgeschrieben, bestehende Projekte bleiben gültig.
- **Themen-Sets (134)** unter `packages/domain/src/build/sets/`, jedes eine Datei:

| Set | Inhalt |
|---|---|
| Wohnen (24) | Starterhaus in 8 Holzarten (Familie), Stadthaus, Bauernhaus, Fischerhütte, Erdhaus, Japanhaus, Rundhütte, Chalet, Langhaus, Jurte, Strandhaus, Würfelhaus, Stelzenhaus, Pilzhaus, Lehmhaus, Hausboot, großes Baumhaus |
| Dorf (22) | 12 Berufswerkstätten mit dem passenden Arbeitsblock (Familie), 4 Marktbuden (Familie), Taverne, Rathaus, Windmühle, Lagerhaus, Dorfplatz, Dorftor |
| Farmen (15) | 4 Äcker (Familie), Zuckerrohr-, Kürbis-, Melonenmodul mit `farm_joint` (Familie), Hühner-, Kaktus-, Baum-, Pilzfarm, Bienenhaus, Tierweide, Eisenfarm, Obstgarten |
| Redstone (8) | Schmelz- und Sortiermodul mit `machine_joint` zum Aneinanderreihen (Familie), Lampenreihe, Taktgeber, Gleis gerade/Kurve/Bahnhof mit `rail_joint` (Familie), Wasseraufzug |
| Befestigung (9) | Palisade gerade/Turm/Tor mit `palisade_joint` (Familie), Bergfried, Rundturm, Torhaus mit `wall_joint`, Wüstenfort, Außenposten, Bunker |
| Sakral (8) | Kathedrale, antiker Tempel, Schrein, Torii, Wüstenpyramide, Steinkreis, Zaubererturm (15 Bücherregale für Stufe 30), Friedhof |
| Infrastruktur (14) | Wege-Baukasten gerade/Kurve/Kreuzung/T/Wendeplatz mit `path_joint`/`weg_4` (Familie), 3 Straßenlaternen (Familie), Holzbrücke, Aquädukt, Netherportal, Tunnelportal, Wegweiser, Hafenkran |
| Landschaft (15) | große Eiche, 8 Baumarten (Familie), roter/brauner Riesenpilz (Familie), Findling, Teich, Blumenwiese, Zen-Garten, Pavillon |
| Deko (16) | Springbrunnen, Sitzbank, Lagerfeuer, Zeltlager, Statuen (Creeper, Golem, Ritter), Schwert im Stein, Heißluftballon, Segelschiff, Weihnachtsbaum, Uhrturm, Spiralturm, Obelisk, Triumphbogen, Leuchtfeuer |
| Welten (3) | Netherbasis (Seelenanker statt Bett), End-Startplattform, Unterwasserkuppel |

Bauwerkzeug: `Plot` (Füllen, Ringe, Räume, Scheiben, Röhren, Dächer, Bäume, Laternenpfähle; Zäune/Scheiben/Mauern erhalten ihre Arme automatisch) und typisierte Zustandshelfer, die genau das B7-Schema erzeugen. Eine `BuildingSpec` trägt Angaben, Tags, Anschlüsse, optional Familie, Bautipps, Inspirationslinks und die erwarteten Lücken (`gaps`, z. B. Wasser/Lava) und Annahmen (`assumed`, z. B. Ackerboden ⇒ Erde). Der Test vergleicht diese Erwartung mit der tatsächlichen Materialliste: keine stillen Lücken. Alle Zustände mit Properties folgen exakt dem B7-Schema (vier Drehungen und doppelte Spiegelung = Identität), jedes Bauitem hat ein Rezept oder eine Rohstoffquelle (B1-R).

**Variantenfamilien (12):** Starterhaus, Dorfwerkstatt, Marktbude, Acker, Farmmodul, Technikmodul, Gleisbau, Palisade, Wegbau, Straßenlaterne, Baum, Riesenpilz. Gespeichert als Tag `familie:<id>`; `buildingInfo(assetId)` liefert Familienname, Variantenbezeichnung, alle Geschwister, Tipps und Links. Der Steckbrief zeigt die Varianten als Umschalter.

**Bautipps und Inspiration:** 66 Gebäude mit Bautipps (Spielmechanik: Seelenanker im Nether, 15 Bücherregale, Abstand für Eisengolems …), 30 mit Links ausschließlich auf das [Minecraft Wiki](https://minecraft.wiki/) (Mechanik und Begriffe, CC BY-NC-SA). Die Entwürfe selbst sind eigene Konstruktionen, keine nachgebauten Schematics; der Steckbrief sagt das ausdrücklich.

`seedSamples` legt fehlende Gebäude an und aktualisiert bei bereits gespeicherten Beispielen nur Beschreibung und Tags; Versionen, Archivstatus und Projekte bleiben unberührt.

## Ensembles

`ENSEMBLES` (9): Starter-Basis, Marktdorf, Bauernhof, Burg, Kirschblütengarten, Küstendorf, Technikhof, Wüstenaußenposten, Weg mit Brücke. Ein Ensemble referenziert nur Asset-IDs mit `at` (x/z der Minimum-Ecke nach Drehung), optional `y` und `turns`. `memberTransform` rechnet die Drehung über `transformPayload` gegen, damit die Ecke genau bei `at` liegt. „Als Projekt anlegen“ (`createEnsembleProject`) erzeugt ein normales Projekt mit einer Instanz je Mitglied über `instance.add`; Konflikte, Material, Bauanleitung und Export arbeiten unverändert. Fehlt ein Bauteil (z. B. archiviert gelöscht), wird nichts angelegt (`missingMembers`). Getestet: alle 9 lösen ohne Voxelkonflikt auf, jede Ecke liegt bei `at`. In „Weg mit Brücke“ treffen sich die Anschlüsse von Gerade, Kreuzung, Brücke und Wendeplatz. Die Bibliothek hat dafür die Ansicht „Ensembles“ mit Vorschau der aufgelösten Welt; der Steckbrief eines Gebäudes nennt die Ensembles, die es nutzen.

Der Editor hat für die lange Bauteilliste eine Suche (Name und Tags) und eine eigene Scrollfläche.

## Vorbild und Abgrenzung

Struktur angelehnt an öffentliche Schematic-Bibliotheken (gesichtet: shulkr.com, Java-Filter): Oberkategorien wie Gebäude/Deko/Farm/Landschaft/Redstone, Filter Kategorie/Stil/Tag/Version/Größe/Mods, Steckbrief mit Maßen, Blockzahl, Blockarten, Größenklasse nach Blöcken, häufigsten Materialien, „gespeichert in“ und Mods. Übernommen wurden nur Ordnungsideen, keine Inhalte. Nicht übernommen: Downloads, Aufrufe, Trend-Sortierung (keine Nutzungsdaten in einer lokalen App) und „läuft in Version X“ (nicht prüfbar; Profile bleiben explizit `registry-unverified`).

## Grenzen

Angaben sind ungeprüfte Aussagen. Materialgruppen folgen Namensregeln. Schwierigkeit und Bauzeit sind Heuristiken. Keine Lichtsimulation, keine Statik, kein Gelände. Vorschläge bewerten nur die neueste Version eines Assets. Spielphase ist eine Faustregel über Block-IDs. Ensembles sind feste Anordnungen ohne Gelände; Wasser/Lava bleiben wie bei Einzelgebäuden ungelöst. Redstone-Module sind nach Java-Regeln gesetzt, aber nicht im Spiel abgenommen. Vorschaufarben einiger Blöcke (Stufen, Scheiben) sind gehasht und wirken unnatürlich (Farbtabelle liegt bei B6).
