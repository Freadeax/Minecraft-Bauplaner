# Großprojekte (GROSS-01)

Die Bibliothek kannte bis dahin drei Größenstufen: einzelne Gebäude (bis etwa 25 × 25 Blöcke), [Ensembles](CATALOG.md) (5–14 Gebäude in fester Anordnung) und [Anlagen](ANLAGEN.md) (Bereiche entlang eines geraden Hauptwegs, bis 19 Einheiten). Ein **Großprojekt** ist die Stufe darüber: eine ganze Stadt, Festung oder Industrieanlage als Plan mit Quartieren auf einem Straßenraster, einem eigenen Straßennetz und Bauphasen, die zu Bauabschnitten der [Baustelle](SITE.md) werden. Alles stammt aus dem Katalog; nichts wird erfunden oder dupliziert.

Route: `#/bibliothek/grossprojekte[/<id>]`, Reiter „Großprojekte“ in der Bibliothek. Das Öffnen platziert und speichert nichts.

## Daten

`packages/domain/src/grossprojekte.ts` (Typen und Engine), `packages/domain/src/grossprojekte/*.ts` (ein Projekt je Datei, Registry `index.ts` mit `GROSSPROJEKTE`). Ein Großprojekt hat

- `streets`: Straßenstil (`dorf`, `kies`, `stein`, `asphalt`), Breite 2–9, Laternen, optional Ringstraße; oder `null`,
- `spacing`: empfohlener Abstand zwischen Gebäuden und zur Straße,
- `quartiere`: je Quartier Zweck, Art (`bauten`, `platz`, `gruen`, `frei`), Rasterzelle `[Spalte, Zeile]`, optional `span` über mehrere Zellen, Einheiten (`units`) und für freie Bauplätze `reserve` (Breite × Tiefe),
- `phasen`: Bauabfolge; jedes Quartier steht in genau einer Phase.

Einheiten sind `slot` (ein Katalogbauteil mit festgehaltener Version `pin`, Standard `1.0`, Drehung und Rolle), `ensemble` (ein mitgeliefertes Ensemble als Block mit seinem kuratierten Layout) oder `anlage` (eine ganze Bauwelt-Anlage samt eigenem Hauptweg). `validateGrossprojekt` prüft Struktur, Raster (keine überlagerten Zellen), Phasen und Verweise; die Tests prüfen alle mitgelieferten Projekte.

Mitgeliefert sind zehn Projekte (Freie Marktstadt, Große Hafenstadt, Moderne Innenstadt, Große Burganlage, Bergbaustadt der Zwerge, Tempelstadt am Kirschhain, Großes Landgut, Stadt der Magier, Industriehafen, Hauptstadt mit Altstadt und Hafen) mit 27–62 Gebäuden. Größenklassen (`scaleOf`): Siedlung (bis 14 Gebäude), Quartier (15–34), Stadtteil (35–69), Stadt (ab 70).

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

Eine Datei `packages/domain/src/grossprojekte/<slug>.ts` mit einer `const` vom Typ `Grossprojekt` (Helfer `s`, `e`, `a`, `q`, `ph` aus `helpers.ts`) und eine Zeile in `grossprojekte/index.ts`. Die Tests prüfen automatisch: Struktur, vorhandene Bauteile, keine Voxelkonflikte und Abstände im Standardlayout, zusammenhängendes Straßennetz, jedes Quartier in einer Phase.

## Prüfung

- `tests/grossprojekte.test.mjs`: Kuratierung aller Projekte, Standardlayouts ohne Voxelkonflikte und Abstandsbefunde (exportierbar, Quartiere in ihren Rasterfeldern, nichts auf der Straße), Straßennetz zusammenhängend mit Laternen neben der Fahrbahn, Stilpaletten, Determinismus, Straßenbreite/aus/Laternen, eingebettete Ensembles (kuratierte Lage) und Anlagen (Wegmodule verbunden), Wahl (ab, Tausch, Drehung, Türen, Fehler), Datenprüfung, freie Bauplätze, Übernahme (Straßen zuerst, Phasen, frische IDs, Netz-Bauteil), Einfügen mit Rückgängig und Veraltungsprüfung, Größenklassen.
- `tests/e2e/grossprojekte.e2e.mjs` (Port 4303): Reiter und Übersicht, Planer mit Lageplan, Quartier ab, Straßenbreite/-stil, Tausch und Drehung, Übernahme (Abschnitte, Straßennetz-Bauteil), Einfügen in bestehendes Projekt, Handy 390 px.

Grenzen: Straßen nur orthogonal auf einer Höhe; keine Geländeanpassung im Planer (dafür das Projekt anlegen und im Reiter „Gelände“ prüfen oder Teile als Anlage planen); Wasserkanten (Hafen, Werft) sind eine Angabe in der Beschreibung, keine geprüfte Umgebung; Plätze und Grünflächen sind Quartiere mit Katalogbauteilen, keine eigenen Bodenflächen.
