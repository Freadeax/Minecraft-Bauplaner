# Parametrische Gebäudegeneratoren (B13)

Stand: 28.10.2026. Code: `packages/domain/src/catalog/generators/` (`params.ts` Parametervertrag, `styles.ts` Stilpaletten, `roofs.ts` Dachformen, `types.ts` Mason und gemeinsame Parameter, Generatoren `house.ts`, `tower.ts`, `wall.ts`, `bridge.ts`, `roof.ts`, Anlagen `compound.ts`, Register und Versionen `index.ts`). Oberfläche: `views/library/GeneratorsPage.tsx`, `GeneratorForm.tsx`. Tests: `tests/unit/catalog/generators.test.mjs`, `tests/e2e/generators.e2e.mjs`. Setzt R-012/P5-02 („Größenänderung durch deklarierte Generatoren“, AGENTS.md) um und ergänzt den [Domänenvertrag](../kern/DOMAIN.md) und den [Katalog](CATALOG.md).

## Grundsatz

Ein Generator ist eine reine, deterministische Funktion *normalisierte Parameter → VoxelPayload + Anschlüsse*. Das Ergebnis ist eine gewöhnliche, unveränderliche AssetVersion (`source.format = 'generator'`). In `source.generator` stehen Generator-ID, Algorithmusversion und alle normalisierten Parameter. Damit gilt:

- **Reproduzierbar:** gleiche Werte ⇒ gleicher Payload-Hash. `checkReproducible(version)` rechnet nach und meldet `gleich`, `abweichend`, `aeltere-version` (Generator inzwischen geändert) oder `unbekannt`; nachträglich im Anschluss-Editor geänderte Anschlüsse werden genannt. Der Steckbrief zeigt das Ergebnis.
- **Versionen statt Überschreiben:** „Mit Generator bearbeiten“ öffnet die gespeicherten Werte; neue Werte ergeben eine neue Version desselben Assets. Projekte behalten ihre fest verknüpfte Version (Aktualisieren bleibt ein Editor-Schritt). Unveränderte Werte lassen sich nicht als neue Version speichern.
- **Gewöhnliche Bauteile:** generierte Assets sind eigene Bauteile (kein Demo), mit Facetten-Tags, Tag `generiert` und `generator:<id>`; Katalog-Kennwerte, Material, Rezepte, Bauanleitung, Export, Sicherung und Snap arbeiten unverändert.
- **Generatorversion:** Ändert sich die Geometrie für gleiche Werte, muss `version` des Generators steigen. Der Test hält die Hashes der Standardwerte fest.

## Parametervertrag

Typen `int` (min, max, Schritt, Einheit), `choice`, `bool`; Gruppen für das Formular; `when` blendet abhängige Parameter aus (Wert bleibt erhalten). `normalizeParams` begrenzt Zahlen auf Bereich und Schritt, ersetzt unbekannte Auswahlen durch den Standard, verwirft unbekannte Schlüssel und meldet jede Korrektur sichtbar („Radius: 99 auf 8 angepasst“). Gespeichert wird nur das Normalisierte, in Deklarationsreihenfolge. `rollParams(defs, seed, keep)` würfelt deterministisch (mulberry32); die Oberfläche hält dabei den Stil fest.

Gemeinsame Parameter: Stil, Verwitterung (0–50 %, bemooste/rissige Varianten per deterministischem Rauschen) und Variante (Startwert).

## Stile

Acht Paletten: Mittelalter (Stein), Fachwerk, Nordisch (Fichte), Wüste (Sandstein), Fernost (Kirsche), Modern (Beton), Antik (Quarz), Nether. Eine Palette liefert Rollen (Wand, Ecke, Sockel-/Zier-/Dachformen mit Treppe/Stufe/Mauer, Boden, Holzart, Balken, Fenster, Licht, Bettfarbe, gealterte Varianten, Flachdach-Vorliebe) und die Katalog-Facetten Stil/Biom. Generatoren setzen nur Rollen, nie feste Blöcke; jeder Generator spricht jeden Stil. Alle Blöcke haben Bauitem und Rezept (getestet über alle Stile).

## Generatoren

| Generator | Wichtige Parameter | Anschlüsse |
|---|---|---|
| Haus | Breite/Tiefe 5–25, 1–4 Geschosse, Geschosshöhe, Dachform (passend zum Stil, Sattel, Walm, Pult, Flach), Neigung, Firstrichtung, Überstand, Fensterabstand, Pfosten/Balken, Einrichtung, Vordach, Schornstein | – |
| Turm | rund/eckig, Radius 2–8, Höhe 5–48, Geschosshöhe, Abschluss (Kegel, Zinnen, flaches Zeltdach, Plattform), Blitzableiter, Fenster, Gesims, Laternen | optional vier `wall_joint` mit Profil der passenden Mauer |
| Mauer | Länge 3–64, Höhe 2–16, Stärke 1–4, Krone (Zinnen, Mauerblöcke, Stufen, keine), Wehrgang, Strebepfeiler, Schießscharten, Tor | `wall_joint` an beiden Enden, Profil `wall_<Stärke>x<Gesamthöhe>`; 2 × 5 passt zu den Beispielmodulen |
| Brücke | Steinbogen, Balkenbrücke auf Pfeilern, Hängebrücke; Länge 6–48, Wegbreite 2–9, Höhe, Geländer, Pfeilerabstand, Laternen | `path_joint` an beiden Enden, Profil `weg_<Breite>`; `weg_4` passt zum Wege-Baukasten |
| Dach | Breite/Tiefe 3–31, Form, Neigung, First, Überstand, Giebelwände, Brüstung, Schornstein | – |

Dächer sind ein Höhenfeld: jede Zelle bekommt ihren Abstand zur Traufe; steil = ein Block je Schritt (Treppen), flach = halber Block (Stufen unten/oben). Brücken steigen höchstens einen Block je Schritt und sind mit Treppen begehbar; eine unerreichbare Höhe wird gemeldet. Jeder Generator hat 5–7 Vorlagen (z. B. Burgturm zur Burgmauer, Hängebrücke über eine Schlucht, Moderne Villa).

## Anlagen

`createCompoundProject` baut mehrere Teile und ein neues Projekt mit je einer Instanz (Platzierung wie Ensembles über `memberTransform`); gleiche Teile teilen ein Asset.

- **Burganlage:** vier Ecktürme mit Mauer-Anschlüssen, vier Mauern (Zinnen nach außen gedreht), Tor in der Nordmauer, optional Bergfried; getestet konfliktfrei für Standard, Vorlagen und gewürfelte Werte.
- **Häuserzeile:** 2–10 unterschiedliche Häuser eines Stils, je Haus aus der Variante gewürfelt; Abstand 0 ergibt Reihenhäuser ohne Überstand.

## Oberfläche

Bibliothek → Reiter „Generatoren“ (`#/bibliothek/generatoren`): Karten je Generator und Anlage mit Vorlagen. `#/bibliothek/generatoren/<id>[~<vorlage>|@<assetId>]` öffnet die Werkbank: 3D-Vorschau, Kennwerte (Größe, Blöcke, Bauzeit, Material), Hinweise und Korrekturen, Formular (Schieber + Zahl, Umschalter, Auswahl), Vorlage, „Würfeln“, „Zurücksetzen“, Speichern als neues Bauteil, als neue Version oder direkt ins Projekt. Der Steckbrief generierter Bauteile zeigt Parameter, Nachrechnung und „Mit Generator bearbeiten“; der Editor verlinkt „Bauwerk nach Maß generieren“.

## Prüfung

`tests/unit/catalog/generators.test.mjs` (13 Fälle) über Standard, alle Vorlagen, alle Stile mit Verwitterung, 25 gewürfelte Sätze und die Bereichsgrenzen je Generator: gültige und deterministische Payloads, alle Zustände im B7-Katalog (vier Drehungen, doppelte Spiegelung), keine ungelösten, angenommenen oder rezeptlosen Items, gültige Anschlüsse, Turm und Mauer gleichen Profils docken konfliktfrei an, Auflösung und Bauanleitung, Versionen/Nachrechnung/Sicherung, Katalogeintrag, Maße folgen den Parametern, festgehaltene Hashes, Anlagen ohne Konflikte. `tests/e2e/generators.e2e.mjs` (1400 px und 390 px): Übersicht, Parameteränderung mit Live-Kennwerten, sichtbare Korrektur, Speichern, Nachrechnung „identisch“, neue Version, Vorlagenlink, Burganlage als Projekt mit 9 Instanzen.

## GEN-02: Neue Generatoren und Treppen-Eckformen (01.11.2026)

Sechs weitere Generatoren (`stairwell.ts`, `church.ts`, `harbor.ts`, `gatehouse.ts`, `windmill.ts`, `well.ts`), eine neue Anlage und Eckformen für Treppen. Alle sprechen alle acht Stile, haben 5–7 Vorlagen und laufen durch dieselben Prüfungen wie die B13-Generatoren.

| Generator | Wichtige Parameter | Besonderheit |
|---|---|---|
| Treppenhaus | Außenmaß 5–11, 2–10 Geschosse, Geschosshöhe 3–6, Kern (Spindel, offenes Treppenauge mit Geländer, verglaster Lichtschacht), Untermauerung, Dach, Austritte | Eine Umdrehung je Geschoss im Uhrzeigersinn: erst `Geschosshöhe + 1` Stufen, dann ebene Schritte bis zum Absatz. Alle Türen liegen übereinander im Norden auf den Geschosshöhen des Hauses (`k × (Geschosshöhe + 1) + 1`), das Treppenhaus passt also an ein Haus gleicher Geschosshöhe. Begehbarkeit ist geprüft (Suche über Standzellen: höchstens eine Stufe je Schritt, zwei freie Blöcke über jeder Stufe). |
| Kirche | Langhaus 7–19 (ungerade) × 9–41, Wandhöhe 5–14, Neigung, Turm (Westturm, Dachreiter, keiner), Turmhöhe, Abschluss (Spitzhelm, Zeltdach, Zinnen), Glocke, Chor (Apsis, Rechteck, gerade), Seitenschiffe, Fensterabstand, Einrichtung | Westturm mit Leiter, Glockenstube mit Schallöffnungen und Glocke; ohne Turm eine Rosette in der Giebelfassade. Seitenschiffe (ab Wandhöhe 8) unter Pultdächern mit Arkaden und Obergaden-Fenstern; Apsis mit halbem Kegeldach. Bänke zum Altar, Altar mit Kerzen, Lesepult, Leuchter an Ketten. |
| Hafen | Kailänge 10–48, Kaitiefe 3–10, Wassertiefe 2–10, 0–5 Stege (Länge, Breite), Kran, Lagerschuppen, Leuchtfeuer, Poller | Steht auf dem Meeresgrund (y = 0): Stege einen Block über dem Wasserspiegel auf Pfählen, Kai einen Block höher mit Treppenstufe je Steg. Wasser ist nicht Teil des Plans. Landseite als `path_joint` mit Profil `weg_4`. Zu viele Stege für die Kailänge werden gemeldet. |
| Torhaus | Breite 7–21, Tiefe 5–13 (beide ungerade), Höhe, Torbreite/-höhe, Fallgitter, Abschluss, Wachstuben, Mauer-Anschlüsse (Stärke, Gesamthöhe) | Anschlüsse wie beim Turm zentriert (`wall_<Stärke>x<Gesamthöhe>`). Liegt der Wehrgang der Mauer über dem Torgewölbe (Gesamthöhe ≥ Torhöhe + 3), liegt das Obergeschoss auf Wehrgangshöhe und der Wehrgang führt durch Öffnungen in beiden Seitenwänden hindurch; sonst wird das gemeldet. |
| Windmühle | Radius 3–6, Höhe 8–28, Verjüngung, Flügellänge 4–12, Stellung (+, ×), Kappe (Kegel, Zelt), Galerie, Mahlboden | Flügel in der Ebene vor der Nordseite, Tuch jeweils auf derselben Seite des Ruten-Balkens; zu lange Flügel werden sichtbar gekürzt. Tür auf der Südseite, Leiter an einem Pfosten, wo sich die Wand verjüngt. |
| Brunnen | Ziehbrunnen oder Springbrunnen, Beckenradius 1–6, 1–3 Schalen, Dach, Wasser ja/nein, Platz, Laternen | Wasserquellen stehen im Plan; die Materialliste meldet sie als Flüssigkeit (nicht gezählt). Das ist die einzige erlaubte Lücke in der Generatorprüfung. |

**Treppen-Eckformen.** `Plot.shapeStairs()` setzt `shape` aller Treppen nach der Regel des Spiels: Steht hinter einer Treppe eine quer laufende Treppe gleicher Hälfte, wird sie eine Außenecke (`outer_left`, wenn deren Blickrichtung gegen den Uhrzeigersinn liegt, sonst `outer_right`); sonst prüft dieselbe Regel die Vorderseite auf eine Innenecke. Generatoren rufen das über `Mason.payload()` auf; Katalogbauten bleiben unverändert, ihre Versions-IDs bleiben gleich. Walmdächer, Kegeldächer, Turmhelme und Wendeltreppen bekommen damit dieselben Ecken wie im Spiel. Weil sich dadurch die Geometrie für gleiche Werte ändert, stehen **Haus, Turm und Dach jetzt auf Version 2** (Mauer und Brücke sind unverändert, Vergleich über 75 Parametersätze je Generator); gespeicherte v1-Versionen meldet die Nachrechnung als „ältere Generatorversion“. Pultdächer können über `flip` zur anderen Seite steigen (östliches Seitenschiff).

**Anlagen.** Neu ist der **Dorfplatz**: Kirche (Dorfkirche, Kapelle oder Basilika) an der Nordseite um 180° gedreht, damit das Portal zum Platz zeigt, Brunnen in der Platzmitte, eine Häuserzeile gegenüber (Türen zum Platz) und eine Windmühle am Rand. Die **Burganlage** kann statt des Mauertors ein **Torhaus** zwischen zwei Mauerstücke setzen (ab Mauerlänge 13); der Test prüft, dass die Anschlüsse von Torhaus und Mauern genau aufeinanderliegen. Burganlage und Häuserzeile stehen auf Version 2 (Turm- und Hausgeometrie).

**Prüfung.** `tests/unit/catalog/generators.test.mjs` hat jetzt 17 Fälle: alle bisherigen Prüfungen für alle elf Generatoren (Standard, Vorlagen, acht Stile, 25 gewürfelte Sätze, Bereichsgrenzen) plus Begehbarkeit aller Treppenhaus-Geschosse und Türhöhen, Eckformen nach Spielregel (auch Innenecke direkt am Plot), Parameterwirkung von Kirche, Hafen, Torhaus, Windmühle und Brunnen (auch Durchfahrt offen bzw. durch Fallgitter geschlossen) und das genaue Andocken des Torhauses in der Burganlage. Die Browserprüfung zählt 14 Karten, öffnet die Basilika-Vorlage mit sichtbarem Hinweis und den Dorfplatz ohne Überschneidungen.

## GEN-03: Arena und Kolosseum (03.11.2026)

Quelle: Philipps Kolosseum-Bauplan aus einem ChatGPT-Verlauf (Java Edition, originalgetreu, Block für Block): 81 × 61 Blöcke, vier Etagen zu je 8 Blöcken, Ellipsen für Außenkante, Gang, Zuschauerbereich und Arena, Sandarena, acht Sitzreihen aus Sandsteintreppen, vier Haupteingänge mit 5 Blöcke breiten Bögen, Hypogäum neun Blöcke unter der Arena, Materialien Sandstein, Steinziegel, Quarz, Eichenfalltüren, Eisenstangen, Laternen, Banner und Sonnensegel.

Generator `arena` (`generators/arena.ts`): Halbachsen 14–60 × 16–50, 1–4 Etagen, Etagenhöhe 7–10, unterer Rang 4–12 und oberer Rang 0–8 Reihen, zwei oder vier Tore, Hypogäum, Velarium, Banner/Laternen, Stil und Verwitterung. Vorlagen: Kolosseum (Sandstein, exakt nach dem Bauplan), Kolosseum aus Marmor, Provinzarena, Kleiner Kampfplatz, Verfallene Arena, Nether-Arena.

Aufbau: Jede Säule bekommt ihre **Tiefe**, die Zahl der verschachtelten Ellipsen (a − k, b − k), in denen sie liegt. Tiefe 0 ist die Fassade, 1–3 der Wandelgang, 4 die innere Ringmauer, dann oberer Rang, Umgang, unterer Rang, Podiumsmauer und Arena. Die **Bögen** werden nach Bogenlänge entlang der Ellipse verteilt (Raster etwa 7: 2 Pfeiler + 5 Öffnung), damit die Pfeiler auf dem Oval gleichmäßig stehen; die oberste Etage ist ab drei Etagen eine geschlossene Attika mit Rechteckfenstern. Ränge sind begehbare Treppen auf Gewölben, unter dem Umgang hängen Laternen; vier diagonale Treppen führen aus den Gewölben auf den Umgang, im Wandelgang neben jedem Tor eine Treppe je Etage. Tore sind Tonnengewölbe durch Fassade, Gang und Gewölbe bis in die Arena, mit Anschluss `path_joint` Profil `weg_5`. Das Hypogäum hat Kreuzgänge, einen Ringgang, vier Kammern mit Gitterzellen, Truhen und Fässern und vier Leiterschächte mit Falltür im Arenaboden. Hängende Laternen ohne Halt werden am Ende entfernt (Spielprüfung).

Mit Hypogäum liegt der Boden auf Ebene 9 des Plans. Als Katalogbauteil `bld_antike_kolosseum` (Set `antike.ts`) und im Ensemble „Kolosseumsplatz“ (Kolosseum um 9 abgesenkt, Ehrenbogen und Ehrensäulen auf Platzhöhe) ist das berücksichtigt; das Großprojekt „Kolosseum-Viertel“ ([GROSSPROJEKTE](GROSSPROJEKTE.md)) nutzt das Ensemble.

**Feinschliff (GEN-03-S06, Generator Version 2):** In jedem zweiten Attikafenster (nicht über den Toren) steht eine Statue – Sockel aus dem Zierblock, Körper aus Zier-Mauer, Kopf (Skelettschädel) nach außen blickend; beim Kolosseum 12 Statuen, abschaltbar mit „Statuen in den Attikafenstern“. Das Hypogäum hat zusätzlich zu den Aufzügen zwei Treppen in den seitlichen Spuren des Hauptgangs, die vom Gangboden bis auf den Arenaboden führen (zehn Stufen, Öffnung im Sand nahe den Arenaenden, der Sand über der Öffnung wird mit entfernt, damit nichts nachrutscht). Höhere Version: gespeicherte Generator-Bauteile melden „mit v1 erzeugt“; die Katalog-Kolosseen erreichen gespeicherte Bibliotheken als neue Version.

Grenzen: Ränge haben keine Einzelsitze und keine Treppen quer durch die Sitzreihen (Zugang über Umgang und Tore); Statuen sind Blockfiguren (keine Rüstungsständer); Bögen sind auf dem Oval angenähert (Stufenbögen statt runder Bögen); die Bauanleitung des Planers geht ebenenweise, nicht nach den sieben Schritten des Bauplans (die stehen als Phasennotiz im Großprojekt).

## LIB-05: Baustil der Generatoren (02.11.2026)

- Stile mit Rollen-Mischungen (`mix.wall`, `mix.base`, `mix.roof`), Zier- und Ladenholz; `lookOfStyle` übersetzt einen Stil in einen Look des Baukastens (`build/style.ts`).
- Sattel-, Walm- und Pultdächer kommen aus `pitchedRoof` (Überstand, Traufkasten aus umgedrehten Treppen, Ortgang, zweischichtiger Körper, gefüllte Giebel mit Pfosten und Fenstern, Firstspitzen). Neue Neigung „sehr steil“.
- Haus (Version 3) baut die Hülle mit `house`: Vorkragung, Steinsockel (0–4 Reihen), Fensterläden und Blumenkästen, Quergiebel, Vorlage „Bürgerhaus“.
- Alle Generatoren und Anlagen haben eine höhere Version; `PINNED` in `tests/unit/catalog/generators.test.mjs` ist neu festgehalten.

## Grenzen

Keine Statik, kein Gelände (Brückenenden und Pfeiler stehen auf y = 0 bzw. auf Höhe der Enden). Die Vorschau zeichnet Treppen, Stufen und Zäune als Würfel. Fenster von Rundtürmen nur an den vier Achsen. Mauern ungerader Stärke: Anschlusspunkt liegt einen halben Block neben der Mitte (Gitterpunkt), Anlagen setzen deshalb nach Geometrie. Bauwerke sind nicht im Spiel abgenommen. GEN-02: Hafen ohne Wasserblöcke, Brunnen-Wasser nicht als Item gezählt, Windmühlenflügel als feste Blöcke (keine Drehung), Treppenhaus und Haus werden nicht automatisch verbunden (Tür in der Hauswand selbst setzen).
