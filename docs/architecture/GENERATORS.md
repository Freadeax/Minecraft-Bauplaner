# Parametrische Gebäudegeneratoren (B13)

Stand: 28.10.2026. Code: `packages/domain/src/generators/` (`params.ts` Parametervertrag, `styles.ts` Stilpaletten, `roofs.ts` Dachformen, `types.ts` Mason und gemeinsame Parameter, Generatoren `house.ts`, `tower.ts`, `wall.ts`, `bridge.ts`, `roof.ts`, Anlagen `compound.ts`, Register und Versionen `index.ts`). Oberfläche: `views/library/GeneratorsPage.tsx`, `GeneratorForm.tsx`. Tests: `tests/generators.test.mjs`, `tests/e2e/generators.e2e.mjs`. Setzt R-012/P5-02 („Größenänderung durch deklarierte Generatoren“, AGENTS.md) um und ergänzt den [Domänenvertrag](DOMAIN.md) und den [Katalog](CATALOG.md).

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

`tests/generators.test.mjs` (13 Fälle) über Standard, alle Vorlagen, alle Stile mit Verwitterung, 25 gewürfelte Sätze und die Bereichsgrenzen je Generator: gültige und deterministische Payloads, alle Zustände im B7-Katalog (vier Drehungen, doppelte Spiegelung), keine ungelösten, angenommenen oder rezeptlosen Items, gültige Anschlüsse, Turm und Mauer gleichen Profils docken konfliktfrei an, Auflösung und Bauanleitung, Versionen/Nachrechnung/Sicherung, Katalogeintrag, Maße folgen den Parametern, festgehaltene Hashes, Anlagen ohne Konflikte. `tests/e2e/generators.e2e.mjs` (1400 px und 390 px): Übersicht, Parameteränderung mit Live-Kennwerten, sichtbare Korrektur, Speichern, Nachrechnung „identisch“, neue Version, Vorlagenlink, Burganlage als Projekt mit 9 Instanzen.

## Grenzen

Keine Statik, kein Gelände (Brückenenden und Pfeiler stehen auf y = 0 bzw. auf Höhe der Enden). Treppen an Dachecken bleiben „gerade“ (keine Eckformen). Die Vorschau zeichnet Treppen, Stufen und Zäune als Würfel. Fenster von Rundtürmen nur an den vier Achsen. Mauern ungerader Stärke: Anschlusspunkt liegt einen halben Block neben der Mitte (Gitterpunkt), Anlagen setzen deshalb nach Geometrie. Bauwerke sind nicht im Spiel abgenommen.
