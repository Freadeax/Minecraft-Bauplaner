# Bauwelt-Anlagen (BUILD-05)

Eine Bauwelt ([BUILD_THEMES](BUILD_THEMES.md)) zeigt passende Gebäude. Eine **Anlage** macht daraus einen planbaren Ort: kuratierte Bereiche entlang eines Hauptwegs, feste Bauteilversionen, eingebettete Ensembles, echte Konfliktvorschau und eine ausdrückliche Übernahme als Projekt mit Bauabschnitten für die Baustelle ([SITE](SITE.md)).

Die Stufe darüber – ganze Städte mit Quartieren, Straßenraster und Bauphasen – sind die [Großprojekte](GROSSPROJEKTE.md).

Route: `#/bibliothek/anlagen[/<id>]`, Reiter „Anlagen“ in der Bibliothek. Jede Bauwelt-Karte verlinkt „Als Anlage planen“. Das Öffnen platziert nichts.

## Daten

`packages/domain/src/anlagen.ts`, `ANLAGEN`: genau eine Anlage je Bauwelt (11). Eine Anlage hat

- `path`: Hauptweg aus Wegmodulen (`weg`: Wege-Baukasten mit Wendeplatz, `strasse`: Stadtstraße) oder `null` (Nether, End),
- `spacing`: empfohlener Abstand zwischen Gebäuden und zum Weg (Blöcke),
- `districts` (Bereiche) in Bauabfolge, je mit Seite (`nord`/`sued` des Wegs), Zweck, optional einem eingebetteten Ensemble und Plätzen (`slots`). Ein Platz nennt Bauteil, festgehaltene Version (`pin`, Standard `1.0`), Drehung und Rolle. Ein Bereich kann einen kleineren eigenen Abstand haben (Reihenhäuser 0).

Alle Gebäude stammen aus dem mitgelieferten Katalog; nichts wurde für die Anlagen erfunden oder dupliziert. Ensembles werden nur gelesen, ihre kuratierte relative Anordnung bleibt erhalten.

## Feste Versionen

Ein Platz löst die Version mit dem festgehaltenen Label auf, nicht die neueste. Gibt es eine neuere Version, zeigt der Plan „neuer: x (nicht übernommen)“. Ein getauschter Platz hält die zum Tauschzeitpunkt aktuelle Version des neuen Bauteils fest. Fehlt ein Bauteil oder die festgehaltene Version in einem gewählten Bereich, ist die Übernahme gesperrt (Grund wird angezeigt); der Bereich kann abgewählt oder getauscht werden. Nie entsteht ein halbes Projekt.

## Layout

`planAnlage(anlage, bibliothek, wahl)` ist rein und deterministisch. Bereiche reihen sich je Seite entlang +x, getrennt durch den doppelten Abstand. Nordbereiche wachsen nach −z, Südbereiche nach +z; im Bereich füllen Einheiten (ein Ensemble als Block oder ein Platz) Reihen bis 64 Blöcke Breite. Grundflächen kommen aus den tatsächlichen gedrehten Grenzen der festen Versionen, deshalb bleibt das Layout beim Tauschen oder Drehen gültig. Der Hauptweg wird aus geraden Modulen über die ganze Länge gelegt; ihre Anschlüsse (`path_joint`, Profil `weg_4`) liegen exakt aufeinander und werden als Verbindungen angelegt.

Wahlmöglichkeiten (`AnlageChoices`): Bereiche abwählen, Abstand 0–12, Hauptweg an/aus, Platz tauschen (Varianten derselben Familie, dann gleiche Kategorie innerhalb der Bauwelt), Platz um 90° drehen, Bereich verschieben (±128, erzeugt gegebenenfalls echte Konflikte).

## Konfliktvorschau

`previewAnlage(plan, { base?, offset? })` baut ein Entwurfsprojekt (nicht gespeichert) und prüft es mit dem Composer:

- **Voxelkonflikte** blockgenau (`resolveProject`), in der 3D-Ansicht rot markiert und mit Positionen gelistet; mit Zielprojekt zusätzlich die Konflikte mit dessen bestehenden Bauten.
- **Grundflächen** (AABB, nur Vorfilter) und **Abstände** unter dem gewählten Wert; innerhalb eines Ensembles nicht geprüft, Wegmodule untereinander nicht.
- **Anschlüsse** über `checkLinks`.

Der Lageplan zeigt alle Grundflächen von oben, Bereiche farbig, Weg grau, bestehende Bauten des Zielprojekts blass, Konfliktbeteiligte rot umrandet. Mit Geländeaufnahme des Zielprojekts liegt die Höhenkarte darunter und jede Einheit wird auf den Hang gesetzt ([TERRAIN](TERRAIN.md)); ohne Aufnahme bleibt Gelände ungeprüft.

## Übernahme

Nur über die Schaltfläche:

- `createAnlageProject(preview)`: neues Projekt mit Instanzen der festen Versionen, Wegverbindungen und Bauabschnitten (Hauptweg zuerst, dann die Bereiche in Reihenfolge, Zweck als Notiz).
- `anlageIntoProject(preview, projekt)`: ein rückgängig machbarer Batch für ein bestehendes Projekt, standardmäßig neben die bestehenden Bauten (`besideOffset`) oder mit eigenem Versatz; Bauabschnitte werden angehängt. Die Oberfläche liest das Projekt vor dem Speichern neu, berechnet die Vorschau gegen den gespeicherten Stand und lehnt eine veraltete Vorschau ab.

Mit Voxelkonflikten ist die Übernahme nur nach ausdrücklicher Bestätigung möglich; die Konflikte bleiben im Editor sichtbar und sperren den Export wie gewohnt. Instanz- und Verbindungs-IDs werden bei jeder Übernahme neu vergeben.

## Prüfung

- `tests/anlagen.test.mjs`: Kuratierung (jede Bauwelt, echte Bauteile, Ensembles), alle Standardlayouts ohne Voxelkonflikte und Abstandsbefunde, verbundener Hauptweg, Seiten, Determinismus, Ensemblelayout, feste Versionen trotz neuerer Version, Tausch, fehlende Versionen, echte Konflikte durch Verschieben, Übernahme mit Bauabschnitten, Einfügen mit Rückgängig und Veraltungsprüfung, Wahlprüfung, Tauschkandidaten.
- `tests/e2e/anlagen.e2e.mjs`: Bauwelt → Planer, Vorschau speichert nichts, Konflikt sperrt die Übernahme, Abwählen/Tauschen/Anlegen, Einfügen in bestehendes Projekt, Handy 390 px.

Gelände und Türen (TERRAIN-01, [TERRAIN](TERRAIN.md)): Terrassen oder eine Ebene auf der Geländeaufnahme des Zielprojekts, Unterbau/Abtrag je Einheit, Suche nach dem flachsten Platz; Einzelgebäude drehen sich automatisch mit dem Eingang zum Weg (Schalter „Türen zum Weg drehen“, Handdrehung hat Vorrang).

Grenzen: Weg nur gerade entlang einer Achse und auf einer Höhe; Treppen, Rampen und Stützmauern werden als Bedarf genannt, nicht als Blöcke geplant; Höhenkarte statt Volumen.
