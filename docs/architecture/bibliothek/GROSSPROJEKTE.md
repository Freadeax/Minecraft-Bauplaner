# Großprojekte (GROSS-01)

Die Bibliothek kannte bis dahin drei Größenstufen: einzelne Gebäude (bis etwa 25 × 25 Blöcke), [Ensembles](CATALOG.md) (5–14 Gebäude in fester Anordnung) und [Anlagen](ANLAGEN.md) (Bereiche entlang eines geraden Hauptwegs, bis 19 Einheiten). Ein **Großprojekt** ist die Stufe darüber: eine ganze Stadt, Festung oder Industrieanlage als Plan mit Quartieren auf einem Straßenraster, einem eigenen Straßennetz und Bauphasen, die zu Bauabschnitten der [Baustelle](../planer/SITE.md) werden. Alles stammt aus dem Katalog; nichts wird erfunden oder dupliziert.

Route: `#/bibliothek/grossprojekte[/<id>]`, Reiter „Großprojekte“ in der Bibliothek. Das Öffnen platziert und speichert nichts.

## Daten

`packages/domain/src/catalog/grossprojekte.ts` (Typen und Engine), `packages/domain/src/catalog/grossprojekte/*.ts` (ein Projekt je Datei, Registry `index.ts` mit `GROSSPROJEKTE`). Ein Großprojekt hat

- `streets`: Straßenstil (`dorf`, `kies`, `stein`, `asphalt`), Breite 2–9, Laternen, optional Ringstraße; oder `null`,
- `spacing`: empfohlener Abstand zwischen Gebäuden und zur Straße,
- `quartiere`: je Quartier Zweck, Art (`bauten`, `platz`, `gruen`, `frei`), Rasterzelle `[Spalte, Zeile]`, optional `span` über mehrere Zellen, Einheiten (`units`) und für freie Bauplätze `reserve` (Breite × Tiefe),
- `phasen`: Bauabfolge; jedes Quartier steht in genau einer Phase.

Einheiten sind `slot` (ein Katalogbauteil mit festgehaltener Version `pin`, Standard `1.0`, Drehung und Rolle), `ensemble` (ein mitgeliefertes Ensemble als Block mit seinem kuratierten Layout) oder `anlage` (eine ganze Bauwelt-Anlage samt eigenem Hauptweg). `validateGrossprojekt` prüft Struktur, Raster (keine überlagerten Zellen), Phasen und Verweise; die Tests prüfen alle mitgelieferten Projekte.

Mitgeliefert sind elf Projekte (Freie Marktstadt, Große Hafenstadt, Moderne Innenstadt, Große Burganlage, Bergbaustadt der Zwerge, Tempelstadt am Kirschhain, Großes Landgut, Stadt der Magier, Industriehafen, Hauptstadt mit Altstadt und Hafen, Kolosseum-Viertel) mit 27–62 Gebäuden. Das **Kolosseum-Viertel** (GEN-03, `grossprojekte/kolosseum.ts`) setzt Philipps Kolosseum-Bauplan als Mitte eines römischen Viertels um: Kolosseumsplatz (Ensemble, Hypogäum unter Straßenniveau), Gladiatorenschule mit Kaserne, Forum, Ladenzeile aus Tabernae, Thermen, Theater, Wohnvillen, Gärten und Aquädukt; 9 Quartiere, 30 Gebäude, 208 × 137 Blöcke, Straßen 5 breit wie die Kolosseumstore. Größenklassen (`scaleOf`): Siedlung (bis 14 Gebäude), Quartier (15–34), Stadtteil (35–69), Stadt (ab 70).

## Layout

`planGrossprojekt(gp, bibliothek, wahl)` ist rein und deterministisch:

1. **Einheiten** je Quartier aus den echten gedrehten Grundflächen der festen Versionen; Einzelgebäude drehen sich mit dem Eingang zur nächsten Straße (Straße unterhalb des Quartiers bevorzugt, sonst oberhalb; Handdrehung hat Vorrang). Einheiten füllen Reihen bis `rowWidth` (Standard 48) mit dem Quartiersabstand (`gap`, z. B. 1 für Werkstattgassen).
2. **Raster**: Spaltenbreiten und Zeilentiefen ergeben sich aus den größten Quartieren der Spalte/Zeile; ein Quartier über mehrere Zellen verbreitert nötigenfalls seine letzte Zelle. Zwischen den Zellen liegt eine Fahrbahn mit beidseitigem Abstand.
3. **Platzierung**: Quartiersinhalt waagerecht zentriert und an die Straße gedrückt, der die Gebäude zugewandt sind; weitere Reihen wachsen von der Straße weg. Freie Bauplätze bleiben leer (gestrichelt im Lageplan, Notiz im Bauabschnitt).
4. **Straßen**: Fahrbahnen zwischen allen Spalten und Zeilen (und als Ring), ohne die Abschnitte innerhalb eines Quartiers über mehrere Zellen; Kreuzungen und Einmündungen entstehen aus der Überlagerung. Laternen (Pfosten, Zaun, Laterne) alle 12 Blöcke neben der Fahrbahn, nie auf Gebäuden. Das Netz wird ein eigenes Bauteil (`streetPayload`, Quelle `base-plan`), Mittelstreifen und Randstreifen je Stil gemischt.

Wahlmöglichkeiten (`GrossprojektChoices`): Quartiere abwählen, Abstand 0–12, Straßen an/aus, Breite, Stil, Laternen, Platz tauschen (Kandidaten wie bei Anlagen), Platz drehen, Türregel.

## Vorschau und Übernahme

`buildGrossprojektPlan(layout)` liefert einen `AnlagePlan`-kompatiblen `GrossprojektPlan` (Quartiere als Bereiche, Straßennetz als `area`-Platzierung) und erzeugt die Netz-Version (asynchron wegen des Inhaltshashs). `previewGrossprojekt` nutzt `previewAnlage`: Voxelkonflikte blockgenau über den Composer, Grundflächen und Abstände als Vorfilter (innerhalb eines Ensembles oder einer eingebetteten Anlage nicht geprüft), Anschlüsse der Wegmodule eingebetteter Anlagen über `checkLinks`.

Übernahme nur per Knopf: `createGrossprojektProject` (neues Projekt) oder `grossprojektIntoProject` (eine rückgängig machbare Batch-Operation für ein bestehendes Projekt, neben die bestehenden Bauten oder mit eigenem Versatz, mit Veraltungsprüfung). Die Oberfläche speichert zuerst das Straßennetz als Bauteil, dann das Projekt. Bauabschnitte: „Straßen & Plätze“, dann „Phase N: <Name>“ je Phase mit den Zwecken der Quartiere und freigehaltenen Bauplätzen in der Notiz. Das Projektmodul leitet daraus Meilensteine ab (Thread „Projektmodul vertiefen“).

Mit Voxelkonflikten ist die Übernahme nur nach ausdrücklicher Bestätigung möglich. Instanz- und Verbindungs-IDs werden bei jeder Übernahme neu vergeben.

## Eigenes Großprojekt hinzufügen

Eine Datei `packages/domain/src/catalog/grossprojekte/<slug>.ts` mit einer `const` vom Typ `Grossprojekt` (Helfer `s`, `e`, `a`, `q`, `ph` aus `helpers.ts`) und eine Zeile in `grossprojekte/index.ts`. Die Tests prüfen automatisch: Struktur, vorhandene Bauteile, keine Voxelkonflikte und Abstände im Standardlayout, zusammenhängendes Straßennetz, jedes Quartier in einer Phase.

## Großbauten (S05)

Das Set `packages/domain/src/catalog/build/sets/grossbauten.ts` liefert die Wahrzeichen, für die Großprojekte einen Platz brauchen. Bis dahin war kein Katalog-Gebäude größer als 25 × 25 Blöcke.

| Gebäude | Größe (B × H × T) | Inhalt |
| --- | --- | --- |
| Großes Rathaus mit Turm (`bld_gross_rathaus`) | 35 × 50 × 27 | U-Form um einen Vorhof, Bürgerhalle, Ratssaal, Archiv, Uhr- und Glockenturm |
| Schloss mit Innenhof (`bld_gross_schloss`) | 41 × 26 × 41 | Vier Flügel, Hofgarten mit Brunnen, Ecktürme mit Kupferkuppeln, Thronsaal, Küche, Bibliothek |
| Kuppelbasilika (`bld_gross_basilika`) | 31 × 29 × 43 | Kreuzgrundriss, Säulenportikus, Tambour mit Kuppel, Säulenreihen, Altar |
| Arena (`bld_gross_arena`) | 45 × 15 × 35 | Ovale Bogenmauer, Umgang in zwei Geschossen, Sitzreihen, vier Tore, Ehrenloge |
| Großer Marktplatz (`bld_gross_marktplatz`) | 33 × 8 × 33 | Brunnen, acht Stände mit Waren, Linden, Marktkreuz |
| Stadttor mit Mauer (`bld_gross_stadttor`) | 37 × 29 × 15 | Torhaus mit Fallgitter, Rundtürme, Wehrgang, offene Mauerenden zum Anbauen |
| Klosteranlage mit Kreuzgang (`bld_gross_kloster`) | 41 × 35 × 39 | Kirche mit Glockenturm, Kreuzgang mit Arkaden und Kräutergarten, Kapitelsaal, Bibliothek, Schlafsaal, Refektorium, Küche, Bienenstöcke |
| Universität mit Sternwarte (`bld_gross_universitaet`) | 39 × 35 × 35 | U-Form um einen Hof, Hörsaal mit ansteigenden Bänken, Bibliotheks- und Laborflügel, Studierzimmer, Sternwarte mit Kupferkuppel |

Alle acht bestehen die Blocklogik-Prüfung (Halt, Verbindungen, Zustände, Drehen und Spiegeln). Die Hauptstadt nutzt sie in den Quartieren „Residenz“ und „Großer Markt“ (Phase 5). Die Großprojekte „Residenzstadt mit Schlosspark“ und „Klosterdorf im Tal“ bauen auf Schloss, Universität, Kloster, Marktplatz und Stadttor auf (S07).

## Prüfung

- `tests/unit/catalog/grossprojekte.test.mjs`: Kuratierung aller Projekte, Standardlayouts ohne Voxelkonflikte und Abstandsbefunde (exportierbar, Quartiere in ihren Rasterfeldern, nichts auf der Straße), Straßennetz zusammenhängend mit Laternen neben der Fahrbahn, Stilpaletten, Determinismus, Straßenbreite/aus/Laternen, eingebettete Ensembles (kuratierte Lage) und Anlagen (Wegmodule verbunden), Wahl (ab, Tausch, Drehung, Türen, Fehler), Datenprüfung, freie Bauplätze, Übernahme (Straßen zuerst, Phasen, frische IDs, Netz-Bauteil), Einfügen mit Rückgängig und Veraltungsprüfung, Größenklassen.
- `tests/e2e/grossprojekte.e2e.mjs` (Port 4303): Reiter und Übersicht, Planer mit Lageplan, Quartier ab, Straßenbreite/-stil, Tausch und Drehung, Übernahme (Abschnitte, Straßennetz-Bauteil), Einfügen in bestehendes Projekt, Handy 390 px.

Grenzen: Straßen nur orthogonal auf einer Höhe; keine Geländeanpassung im Planer (dafür das Projekt anlegen und im Reiter „Gelände“ prüfen oder Teile als Anlage planen); Wasserkanten (Hafen, Werft) sind eine Angabe in der Beschreibung, keine geprüfte Umgebung; Plätze und Grünflächen sind Quartiere mit Katalogbauteilen, keine eigenen Bodenflächen.
