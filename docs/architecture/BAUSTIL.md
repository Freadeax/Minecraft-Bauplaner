# Baustil: Gestaltungsregeln für Bibliothek und Generatoren (LIB-05)

Stand: 02.11.2026. Code: `packages/domain/src/catalog/build/style.ts` (Gestaltungsbaukasten), `packages/domain/src/catalog/build/refine.ts` (Veredelung), `packages/domain/src/catalog/build/quality.ts` (Gestaltungskennwerte), Stile der Generatoren in `packages/domain/src/catalog/generators/styles.ts`. Tests: `tests/baustil.test.mjs`.

Auftrag (Philipp, 02.11.2026): „Prüfe die hochgeladenen Bauobjekte, wie sie aufgebaut sind, die Muster und Varianten, und gehe darauf hin über die komplette Bibliothek – die ganzen Sachen, die wir haben, sehen nicht gut aus.“ Dazu drei Seiten als weitere Quelle.

## Studienmaterial und Rechte

Untersucht wurden **31 fertige Bauten** im Litematica-Format: die fünf hochgeladenen Dateien (Rathaus, zwei mittelalterliche Häuser, Olymp; „Ocean Kingdom“ enthält nur einen Block) und 27 frei herunterladbare Gebäude von minemev.com (Anbieter choculaterie und redenmc, Kategorie Gebäude). Von minecraftschem.com führen alle Downloads auf Patreon, sereyka.com verkauft die Dateien; beide wurden nur als Übersicht angesehen.

Die Dateien dienten **nur als Studienmaterial**: ausgelesen wurden Kennzahlen (Blockanteile, Formen, Tiefe der Fassaden, Fensterumgebung, Dachaufbau), keine Geometrie. Keine Datei, kein Ausschnitt und kein Nachbau liegt im Repository; alle Katalog-Gebäude bleiben eigene Entwürfe (Provenienz „eigener synthetischer Entwurf“).

## Messwerte

Gemessen pro Gebäude ohne Gelände (Gras, Erde, Pflanzen):

| Kennwert | Vorlagen (Median, 31 Bauten) | Unser Katalog vorher (336) |
|---|---|---|
| Anteil Nicht-Vollblöcke (Treppen, Stufen, Falltüren, Zäune, Mauern, Scheiben …) | **40 %** (Häuser 43–56 %) | 18 % |
| davon Treppen umgedreht (`half=top`) | **52 %** | 4 % |
| Falltüren offen (Läden, Verkleidung) | **49 %** (mittelalterliche Häuser 74–77 %) | – |
| sichtbare Fassade auf der Hauptebene (Rest steht davor oder dahinter) | **24 %** | 64 % |
| verschiedene Blöcke je Gebäude | 25–90 | 13 |

Typische Muster (Häufigkeit in den Häusern):

- **Sockel aus gemischtem Stein**: Steinziegel mit 15–25 % bemoosten/rissigen Ziegeln, Andesit, Bruchstein; 2–6 Reihen hoch, Pfosten laufen hindurch.
- **Wandfläche nie aus einem Block**: Putz aus Calcit + Betonpulver + Diorit (≈ 6 : 2 : 2; im Baukasten Beton statt Betonpulver, weil Pulver ohne Unterbau fällt), oder Bretter mit entrindetem Holz.
- **Fachwerk**: entrindete Stämme als Pfosten alle 2–4 Blöcke und als liegende Balken auf jeder Geschossdecke (Achse entlang der Wand).
- **Vorkragung**: jedes Obergeschoss steht 1 Block vor, darunter Knaggen aus umgedrehten Treppen (Häuser: 33 → 35 → 37 Blöcke Breite).
- **Fenster** meist 1 × 2 (Rathaus 1 × 6): darüber eine umgedrehte Treppe als Sturz (50 %), außen seitlich offene Falltüren als Läden (60 %), darunter umgedrehte Treppe oder Falltür als Sims, oft ein Blumenkasten.
- **Dach** ≈ ein Drittel der Gebäudehöhe, 45° oder steiler; Überstand 1–2 Blöcke an allen Seiten; zweischichtig (Treppen über Vollblöcken); Ortgang (Giebelkante) aus dunklerem Holz; Traufkasten aus umgedrehten Treppen; Quergiebel mit Kehlen; Zaun-/Mauerspitzen auf dem First; Schornstein mit Kragen.
- **Material gemischt auch auf Dächern und Kuppeln** (Olymp: blaues und hellblaues Glas gemischt; Rathaus: zwei Kupferstufen gemischt).
- **Klassische Bauten**: Sockel (3 Lagen), Säulenreihe mit Fenstern dazwischen, Gebälk aus Treppen, gestuftes Dach, Tambour mit Säulen, Kuppel, Laterne.

## Gestaltungsregeln

1. **Mischen statt flächig**: jede große Fläche aus einer Mischung (`Mix`) mit 2–5 Blöcken derselben Farbfamilie; deterministisch je Zelle (`pick`). Mehr Verwitterung in Bodennähe.
2. **Relief**: höchstens die Hälfte der Fassade auf einer Ebene. Mittel: Sockel, Vorkragung, Dachüberstand, Läden, Simse, Blumenkästen, Pfosten.
3. **Rahmen**: Ecken und Pfosten aus Stämmen, Geschossdecken als liegende Balken, Giebel mit Mittelpfosten.
4. **Fenster nie nackt**: Sturz, Sims, Läden (rustikale Stile) oder Gewände.
5. **Dächer mit Gewicht**: Überstand ≥ 1, Traufkasten, Ortgang, zweischichtiger Körper, steil bei Fachwerk; Quergiebel statt einer langen Kiste.
6. **Detailblöcke statt Vollblöcke**: Ziel ≥ 30 % Nicht-Vollblöcke an Wohn- und Handelsbauten, davon ein großer Teil umgedrehte Treppen.
7. **Proportion**: Dach ≈ ⅓ der Höhe; Geschosse 4–5 Blöcke; Erdgeschoss aus Stein, Obergeschosse leichter.
8. **Varianten** über Rollen: dieselbe Form mit anderem Look (Holzart, Putz, Dach) – das nutzen Materialfamilien und Generator-Stile.

## Gestaltungsbaukasten (`build/style.ts`)

- `Mix`, `pick`, `Look` (Rollen: Sockel, Wand, Rahmen, Dach, Zierholz, Ladenholz, Tür, Boden, Fenster, Licht) und fertige Looks (`LOOKS`: Fachwerk hell, Fachwerk Backstein, Nordisch, Stein, Wüste, Kirsche, Antik, Sumpf), `woodLook` für die acht Holz-Starterhäuser.
- `windowKit` (Scheiben, Sturz, Sims, Läden, optional Blumenkasten), `flowerBox`, `doorKit` (Tür, Sturz, Stufe, Laterne an Konsole).
- `pitchedRoof`: Sattel-, Walm-, Krüppelwalm- und Pultdach, Neigung flach/normal/steil, Überstand, Traufkasten, Ortgang, Firstspitzen, gefüllte Giebel mit Pfosten und Fenstern; mehrere Flügel bilden **ein Höhenfeld**, Quergiebel treffen sich in Kehlen.
- `house`: ganzes Haus aus Sockel, Geschossen (Stein, Fachwerk, Wand), Vorkragung mit Knaggen, Flügeln (L-, T-, Kreuzgrundriss), Fensterrhythmus, Tür, Dach, Schornstein; liefert Böden und Räume zum Einrichten.
- `chimneyKit`, `column`, `dome`, `beltCourse`, `skirt`.

Alle Helfer schreiben nur Zustände des B7-Katalogs (drehbar, spiegelbar) und überspringen Zellen außerhalb des Plots.

Dazu `ladderUp` (Leiter, die an runden oder sich verjüngenden Wänden immer Halt findet) und `hangLantern` (Laterne an `iron_chain` bis zur Decke). Laternen hängen an Zaun-Konsolen, nicht unter oberen Stufen: eine obere Stufe trägt im Spiel keine hängende Laterne (BLOCK_LOGIC.md).

## Neu gezeichnete Gebäude

Von Hand mit dem Baukasten neu entworfen (gleicher Zweck, gleiche Räume und Einrichtung, Grundfläche teils größer):

| Set | Gebäude |
|---|---|
| Klassiker (`sets/klassiker.ts`) | Fachwerkhaus, Blockhütte, Wüstenhaus, Leuchtturm, Schmiede, Scheune, Kapelle, Holz-Wachturm, Baumhaus |
| Wohnen | Starterhaus (8 Holzarten), Stadthaus, Bauernhaus, Fischerhütte, Japanisches Haus, Rundhütte, Chalet, Langhaus, Strandhaus, Würfelhaus, Stelzenhaus, Lehmhaus, großes Baumhaus |
| Dorf | 12 Berufswerkstätten (Ladenfenster mit Theke, Vordach, Sockel, wechselnde Dachformen), Taverne (L-Grundriss mit Biergarten), Rathaus (Säulenportikus, Uhrturm), Windmühle, Lagerhaus |
| Befestigung | Bergfried (Pechnasen-Kranz, Schießscharten, Wachstube), Rundturm (Galerie auf Konsolen, Kegeldach), Wüstenfort |
| Sakral | Kathedrale (Strebebögen, Rosette, Doppelturmfront mit Helmen, Apsis), Antiker Tempel (Säulen mit Kapitellen, Gebälk, Giebel), Zaubererturm |
| Hof | Kuhstall, Zuchthaus, Handelsscheune |

Materialvarianten (B12) entstehen weiter aus dem Grundgebäude; Ensembles Marktdorf, Burg, Küstendorf und Wüstenaußenposten sind für die neuen Maße neu angeordnet.

## Ergebnis (Median, gemessen mit `designMetrics`)

| | Nicht-Vollblöcke | Treppen umgedreht | Fassade auf Hauptebene | Blockarten |
|---|---|---|---|---|
| Vorlagen (31 Bauten) | 40 % | 52 % | 24 % | 25–90 |
| Wohnhäuser vorher → nachher (48) | 28 % → 33 % | 0 % → 27 % | 76 % → 46 % | 14 → 24 |
| Architektur vorher → nachher (169) | 22 % → 29 % | 0 % → 4 % | 70 % → 50 % | 14 → 21 |
| ganzer Katalog vorher → nachher (336) | 17 % → 25 % | 0 % → 0 % | 64 % → 53 % | 13 → 13 |

`tests/baustil.test.mjs` hält die Ziele fest (Wohnhäuser: ≥ 30 % Detailblöcke, ≥ 20 % umgedrehte Treppen, ≤ 50 % Hauptebene, ≥ 20 Blockarten; Architektur ≤ 55 % Hauptebene) und prüft Mischung, `house`, `pitchedRoof` und Veredelung. Die Abstände zu den Vorlagen bleiben bei Stadt (moderne Bauten), Küste, Epochen und Fantasy am größten; sie sind die nächsten Kandidaten.

## Runde 2: Fassadenbaukasten, Stadt bis Fantasy, Meisterstücke

Philipp (02.11.2026): „sowie alle weiteren Punkte auch, sauber über jedes Modell und neue in die Tiefe entwickelte hinzufügen“.

**Fassadenbaukasten `build/facade.ts`.** Arbeitet auf einer fertigen Hülle und schreibt nur in freie Zellen vor der Wand, sodass Entwurf und Einrichtung bleiben:

- `facade()` liest die Außenebene eines Rechtecks, erkennt Fenster- und Türachsen und setzt Lisenen zwischen den Öffnungen (`rhythm`) oder nur an den Ecken, Gesimse auf den Geschosslinien, ein Kranzgesims, Fensterbänke (umgedrehte Treppen), Sonnenblenden (obere Stufen), einen Sockel aus Treppen, ein Vordach über Türen und einen Gehweg.
- `machicolations()` baut einen vorkragenden Wehrgang: Konsolen aus umgedrehten Treppen, Brüstung und Zinnen.
- `buttress()` und `buttresses()` bauen Strebepfeiler mit abgeschrägter Kappe und breiterem Fuß.
- Dazu kommen `shopAwning()`, `balcony()` und `roofKit()` mit Klimageräten, Lüftern, Solarfeldern und Wassertank für Flachdächer.

`Plot.moved()` verschiebt einen fertigen Entwurf in eine größere Grundfläche, damit vor den Wänden Platz für das Relief ist. Anschlüsse werden dabei mitverschoben (Torhaus: `wall_2x5` jetzt bei z = 2).

**Überarbeitet:**

| Set | Gebäude | Was dazukam |
|---|---|---|
| Stadt | Schule, Feuerwache, Ärztehaus, Bibliothek, Polizeiwache, Wohnblock, Reihenhäuser, Café, Bäckerei, Supermarkt | Lisenen, Geschoss- und Kranzgesimse, Fensterbänke, Sonnenblenden, Sockel, Vordächer, Gehweg, Dachtechnik |
| Stadt | Hochhaus | Finnen vor den Stützen |
| Küste | Bootshaus | Sockel und Fensterbänke |
| Küste | Hafenspeicher | Gurtgesimse auf den Böden, Lisenen zwischen den Luken |
| Epochen | Glockenturm | Eckpfeiler und Geschossgesimse |
| Epochen | Kreuzgang | Spitzbogenfenster zwischen Strebepfeilern |
| Epochen | Römische Villa | Pilaster mit Sockel |
| Epochen | Zugbrückentor | Gurtgesims und Maschikulis |
| Epochen | Kaserne | Sockel, Fensterbänke, Vordach |
| Fantasy | Magierakademie | Strebepfeiler und Gurtgesims |
| Nether | Netherbasis | Basalt-Strebepfeiler, Kranzgesims |
| Befestigung | Torhaus | Maschikulis und Gurtgesims |

**Meisterstücke `sets/meister.ts`.** Sieben neue, vollständig eingerichtete Entwürfe nach den Regeln oben:

- Gildehaus: drei Geschosse, zweifach vorkragend, Zwerchgiebel, Marktstände.
- Wassermühle: Wasserrad auf Eichenwelle, Mahlstein, Steg über den Bach.
- Markthalle: Säulenarkaden mit Ständen und Brunnen, Ratssaal, Glocke.
- Bahnhof: Uhrturm mit drei Zifferblättern, Wartehalle, Bahnsteigdach, Gleis.
- Fischerkate: auf Pfählen, mit Terrasse, Steg und Netzgestell.
- Alchemistenturm: Rundturm, Fachwerkerker auf Konsolen, Kegeldach, Labor, Bibliothek, Sternwarte.
- Stadtvilla: Turmflügel, Veranda mit Balkon, Salon, Esszimmer, Schlafzimmer, Garten.

| Median `designMetrics` | Fassade auf Hauptebene vorher → nachher | Nicht-Vollblöcke | Blockarten |
|---|---|---|---|
| Stadt (21) | 77 % → 56 % | 27 % → 28 % | 27 → 34 |
| Meisterstücke (7) | 37 % (neu) | 28 % | 40 |

Alle überarbeiteten und neuen Gebäude halten im Spiel (`catalog-game`: 0 Fehler).

Nicht überarbeitet sind die Untergrundhallen (Zwergenhalle, Erzgießerei, Lager, Bahnhof unter Tage). Sie liegen im Fels, deshalb bringt dort nur das Innere etwas. Auch die Redstone-Technik bleibt, weil Funktion vor Form geht, und die Interieur-Räume, die offene Schnitte sind. Diese drei Gruppen folgen in Runde 3.

## Runde 3: Innenräume, Untergrundhallen, Technik

Auftrag (02.11.2026): Untergrundhallen, Inneneinrichtungen und Redstone-Bauten nachziehen.

**Regel für Innenräume.** Ein Raum wirkt erst fertig, wenn seine Wände gegliedert sind. Die Vorlagen zeigen dafür vier Mittel: Holzpfosten in der Wand, eine Sockelleiste, ein Deckenprofil aus umgedrehten Treppen und einen Bodenrand in einem zweiten Material. Für Hallen unter Tage kommen Wandrippen dazu, also Pfeiler vor der Wand mit eigenem Fuß.

**Baukasten** (`build/facade.ts`, schreibt nur in Wandmaterial oder freie Zellen; Möbel, Fenster und Maschinen bleiben):

- `dressRoom(p, w, d, h, holz, {posts, dado, crown, border})` erkennt die geschlossenen Wände eines `roomShell`-Raums selbst. Offene Schnittseiten bleiben offen.
- `innerRibs(p, x0, z0, x1, z1, y0, y1, id, abstand, fuß)` setzt Rippen nur in Spalten, die vom Boden bis zur Decke frei sind und vor geschlossener Wand stehen, also nie vor Türen oder Fenstern.

**Überarbeitet:**

| Gruppe | Bauten | Was dazukam |
|---|---|---|
| Interieur | 17 von 20 Räumen (ohne Weinkeller, Schatzkammer, Kerker, die schon gewölbt sind) | Pfosten, Sockelleiste, Deckenprofil, Bodenrand; Holz je Raum passend |
| Untergrund | Zwergenhalle | Tiefenschiefer-Rippen auf gemeißelten Füßen unter dem Gewölbe |
| Untergrund | Erzgießerei | Rippen in der Achse der Außenpfosten, Deckenprofil über den Seitenwänden |
| Untergrund | Bergbaulager | Fichtenstämme unter den Deckenbalken mit Kopfbändern |
| Redstone | Wasseraufzug | Steinpfosten statt Glaskanten, Gurtbänder alle vier Lagen, Kopfgesims |

Die übrigen Redstone- und Technikmodule bleiben unverändert. Sie sind klein und reihbar, und jede zusätzliche Wand würde Anschlüsse oder Schaltungen stören.

Interieur-Median: Nicht-Vollblöcke 13 % → 17 %, Blockarten 15 → 16. Alle Bauten halten weiter im Spiel (`catalog-game`: 0 Fehler).

## Veredelung (`build/refine.ts`)

Für jedes Katalog-Gebäude, abhängig von Kategorie und Stil (`refineOptionsFor`): außen liegende Steinziegel, Bruchstein, Tiefenschiefer-, Schwarzstein- und Netherziegel erhalten ihre bemoosten/rissigen Varianten (Treppen/Stufen/Mauern ihre bemoosten Formen); einfache Fenster in Wohn-, Handels- und Handwerksbauten bekommen Läden und Sims, wo innerhalb der Grenzen Platz ist. Grenzen, Anschlüsse und explizite Luft bleiben unverändert. Die Veredelung läuft für jedes Katalog-Gebäude (`refinedSpec`, vor den Materialvarianten); moderne, technische und End-Bauten verwittern nicht.

## Generatoren

Weil sich Dächer und Mischungen aller Stile geändert haben, ist die Version jedes Generators und jeder Anlage um eins erhöht (Haus 3, Mauer 2, alle übrigen 3); gespeicherte Generator-Bauten melden sich dadurch als älter. Die acht Stile haben jetzt Rollen-Mischungen (`mix.wall`, `mix.base`, `mix.roof`), Zierholz und Ladenholz; „Fachwerk“ entspricht dem studierten Look (Calcit-Putz, Fichtenfachwerk, Schieferdach, Schwarzeichen-Ortgang). Alle Satteldächer, Walm- und Pultdächer der Generatoren kommen aus `pitchedRoof`. Das **Haus** (Version 3) baut die Hülle mit `house`: neue Parameter Vorkragung, Steinsockel, Fensterläden/Blumenkästen, Quergiebel; neue Neigung „sehr steil“.
