# Gebäudekatalog: Vorschläge, Kennwerte und Filter (B9)

Stand: 27.10.2026. Code: `packages/domain/src/catalog.ts` (Facetten, Kennwerte, Suche, Vorschläge), `packages/domain/src/buildings.ts` (mitgelieferte Gebäude), Oberfläche `views/LibraryView.tsx` mit `views/library/BuildingSheet.tsx`, `CatalogFilters.tsx`, `FacetFields.tsx`. Tests: `tests/catalog.test.mjs`, `tests/e2e/catalog.e2e.mjs`. Ergänzt den [Domänenvertrag](DOMAIN.md).

## Zwei Arten von Werten

| Art | Herkunft | Kennzeichnung |
|---|---|---|
| **Angaben** | Kategorie, Stil, Biom, Funktion: Aussagen des Autors, gespeichert als Tags `<schlüssel>:<wert>` am Asset | Badge „Angabe“; Beispiele schreibgeschützt, eigene Bauteile über „Angaben bearbeiten“ |
| **Kennwerte** | `analyzeVersion(version)` aus der unveränderlichen Version, mit den gemeinsamen Regeln aus `packages/voxel`, B1 (Material), B4 (Phasen) und B7 (Zustände) | Badge „berechnet“ bzw. „gezählt“; Heuristiken nennen Formel und Annahmen |

Facetten-Tags brauchen keine Schemaänderung: Speicherung, Sicherung und Suche funktionieren unverändert. Unbekannte Werte (selbst getippt) bleiben erhalten und werden wörtlich angezeigt. Tags ohne bekannten Präfix sind normale Tags.

Vokabular (`FACETS`): Kategorie (Wohnhaus, Landwirtschaft, Handwerk, Handel, Sakralbau, Befestigung, Infrastruktur, Wahrzeichen, Dekoration, Statue, Farm, Redstone-Technik, Landschaft & Bäume, Basis), Stil, Biom (inkl. „Überall passend“, das jeden Biomfilter erfüllt), Funktion.

## Kennwerte je Version

Abmessungen B × H × T, umbauter Raum, Grundfläche (belegte x/z-Säulen) mit Größenklasse (≤ 25 / ≤ 100 / ≤ 400 / > 400 m²), Umfang nach Blöcken XS–XL (< 500 / < 2 000 / < 10 000 / < 50 000 / ≥ 50 000), Blöcke, freizuräumende Luftzellen, Füllgrad, Schichten, Blocktypen/Zustände, häufigste Blöcke (12) mit Anteil, Materialgruppen nach Namensregeln, Bauitems/Inventarplätze/Shulkerkisten und Vollständigkeit aus `computeMaterials`, Bauphasen wie die Bauanleitung, ausgerichtete Blöcke (`needsOrientation`: facing/rotation/hinge/orientation, liegende Achsen, obere Hälften, obere Stufen), Drehen/Spiegeln gelöst laut B7-Katalog, Anschlüsse, Mod-Namensräume, „gespeichert in“ (DataVersion nur bei Dateiimport, sonst „unbekannt“).

Ausstattung (gezählt): Betten (Fußteile), Türen (untere Hälften), Glasblöcke, Lichtquellen mit Summe der Vanilla-Lichtstufen (ohne Lichtsimulation; Öfen nur mit `lit=true`), Lagerplätze (Truhe/Fass 27, Trichter 5, Spender/Werfer 9), Arbeitsblöcke mit Dorfbewohnerberuf.

Heuristiken:

- **Schwierigkeit 1–5** = 1 + ⌊Punkte / 2⌋. Punkte: Blockzahl (0–4: < 100 / < 300 / < 800 / < 2 000 / mehr), Zustandsvielfalt (≥ 15: 1, ≥ 30: 2), Anteil ausgerichteter Blöcke (≥ 12 %: 1, ≥ 30 %: 2), Höhe ≥ 12, Flüssigkeit oder Schwerkraft, ≥ 10 angebrachte Blöcke. Jeder Faktor wird im Steckbrief gezeigt.
- **Bauzeit (Schätzung)** = 1,2 s je Block + 1,5 s je ausgerichtetem Block + 0,4 s je Luftzelle + 12 s je Schicht; Überleben, Material griffbereit, ohne Gelände und Beschaffung.

Kennwerte sind reine Funktionen der inhaltsadressierten Version; die Oberfläche cached sie nach Versions-ID.

## Suche, Filter, Sortierung

`queryCatalog`: Text über Name, Beschreibung, Tags, Facettenwerte und -namen, Herkunft, häufigste Block-IDs und Berufe. Facetten: innerhalb einer Gruppe ODER, zwischen Gruppen UND. Weitere Filter: Größenklasse, Umfang, Schwierigkeit, Bauzeit, Bauplatz (Breite/Tiefe/Höhe, wahlweise mit 90°-Drehung), Herkunft (Vorschläge/eigene), nur vollständige Materialliste, nur Vanilla, mit Anschlüssen/Anschlusstyp, mit Schlafplatz, Archivierte. `facetCounts` zeigt je Wert die Treffer unter allen übrigen Filtern. Sortierung: Passung, Name, Blöcke, Grundfläche, Höhe, Schwierigkeit, Bauzeit, Bauitems, zuletzt geändert; gleiche Werte nach Name und ID.

## Vorschläge für ein Projekt

`projectContext` liest aus Projekt und aufgelöster Welt: Blockverteilung, verwendete Assets, gewichtete Angaben der verwendeten Bauteile, freie Anschlüsse (`Typ|Profil` mit Kapazität laut `maxLinks`). `suggestForProject` vergibt höchstens 100 Punkte, jeder Punkt als Grund sichtbar: Materialähnlichkeit 35 (Σ min der Anteile), gleicher Stil 20, Biom 15, freier passender Anschluss 15, neue Kategorie 10, gleiches Profil 5, bereits verwendet −10. Hinweise: Profilabweichung, leeres Projekt, unvollständige Materialliste. `similarEntries`: Material 50, Kategorie 20, Stil 20, Biom 10.

„Ins Projekt übernehmen“ fügt die neueste Version wie der Editor neben dem bestehenden Bau ein und speichert mit der aktuellen Projektrevision (Konflikt ⇒ Fehlermeldung, nichts überschrieben). Andocken bleibt ein ausdrücklicher Schritt im Editor (B5). Route `#/bibliothek/fuer/<projekt>` öffnet die Bibliothek mit Vorschlägen; der Editor verlinkt dorthin.

## Mitgelieferte Gebäude

16 eigene synthetische Entwürfe aus Code (`BUILDING_SPECS`): Fachwerkhaus, Blockhütte, Wüstenhaus, Leuchtturm, Dorfbrunnen, Schmiede, Scheune, Marktstand, Kapelle, Gewächshaus, Moderne Villa, Iglu, Steinbrücke, Hafensteg, Holz-Wachturm, Baumhaus. Keine importierten Welten, keine fremden Schematics, keine Texturen. Alle Zustände mit Properties folgen exakt dem B7-Schema (getestet: vier Drehungen und doppelte Spiegelung = Identität). Bewusst sichtbare Lücken: Wasser (Dorfbrunnen, Gewächshaus) bleibt in der Materialliste ungelöst, Ackerboden ist eine Annahme (Erde + Hacke). Steinbrücke und Hafensteg teilen den Anschluss `path_joint`/`weg_4`. Die drei B0-Module erhalten Facetten, ihre Geometrie und IDs bleiben gleich.

`seedSamples` legt fehlende Gebäude an und aktualisiert bei bereits gespeicherten Beispielen nur Beschreibung und Tags; Versionen, Archivstatus und Projekte bleiben unberührt.

## Vorbild und Abgrenzung

Struktur angelehnt an öffentliche Schematic-Bibliotheken (gesichtet: shulkr.com, Java-Filter): Oberkategorien wie Gebäude/Deko/Farm/Landschaft/Redstone, Filter Kategorie/Stil/Tag/Version/Größe/Mods, Steckbrief mit Maßen, Blockzahl, Blockarten, Größenklasse nach Blöcken, häufigsten Materialien, „gespeichert in“ und Mods. Übernommen wurden nur Ordnungsideen, keine Inhalte. Nicht übernommen: Downloads, Aufrufe, Trend-Sortierung (keine Nutzungsdaten in einer lokalen App) und „läuft in Version X“ (nicht prüfbar; Profile bleiben explizit `registry-unverified`).

## Grenzen

Angaben sind ungeprüfte Aussagen. Materialgruppen folgen Namensregeln. Schwierigkeit und Bauzeit sind Heuristiken. Keine Lichtsimulation, keine Statik, kein Gelände. Vorschläge bewerten nur die neueste Version eines Assets. Vorschaufarben einiger Blöcke (Stufen, Scheiben) sind gehasht und wirken unnatürlich (Farbtabelle liegt bei B6).
