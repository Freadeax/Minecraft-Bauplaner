# Kreativwerkzeuge der Werkstatt (EDIT-04)

Stand: 02.11.2026 · Roadmap-IDs **EDIT-04**, **EDIT-05** · baut auf [BLOCK_EDITOR](BLOCK_EDITOR.md) (EDIT-01/02/03) · Herleitung: [Vergleich mit anderen Planern](../project/PLANER_VERGLEICH.md)

Sechs Werkzeuge, deren Ideen aus anderen Minecraft-Bautools stammen (Symmetrie- und Pfadwerkzeuge von Editor-Mods, Pinsel und Masken von WorldEdit, Blockpaletten- und Pixel-Art-Seiten), umgesetzt ausschließlich auf unserem Kern. Alle bleiben im Entwurfsvertrag: Sie erzeugen nur Zelländerungen (`Edit`), ein Werkzeugschritt ist **ein** Rückgängig-Schritt, gleiche Eingaben ergeben dieselben Zellen und damit dieselbe Version. Keine zweite Koordinaten- oder Drehregel.

## Symmetrie (`editor/symmetry.ts`)

- `Symmetry { mirrorX, mirrorZ, rotate: 1|2|4, centre2: [2x, 2z] }`. Die Achse ist **verdoppelt** gespeichert: gerade Werte liegen auf einer Zellmitte, ungerade auf der Grenze zwischen zwei Zellen (z. B. 9 = zwischen 4 und 5). So sind beide Bauweisen möglich: Burg mit Mittelblock (ungerade Breite) und Halle ohne Mittelblock (gerade Breite).
- `symmetryGroup` erzeugt die Gruppe aus den Erzeugern (Spiegeln X = `mirrorX`, Spiegeln Z = `mirrorX + 2 Vierteldrehungen`, Drehen = Vierteldrehungen) mit der Komposition `R^a M^m ∘ R^b M^n = R^(a ± b) M^(m xor n)`. Größen 1, 2, 4 oder 8 (Spiegeln + vierfach drehen).
- `symmetryImage` rechnet mit `transformVector` um die Achse; `symmetricEdit` dreht Blockzustände mit `transformBlockState`. Nicht drehbare Zustände (Mod-Blöcke, chirale Muster) werden **ungedreht** geschrieben und in `unresolved` gemeldet; die Werkstatt zeigt sie an.
- Vierfache Drehung verlangt, dass beide Achsenkoordinaten gleich liegen (beide Mitte oder beide Grenze); die Oberfläche verschiebt Z dafür um eine halbe Zelle.
- Direkte Änderungen gewinnen: Bilder werden zuerst, die geklickten Zellen zuletzt geschrieben; doppelte Bildzellen fallen weg.
- Blockentitäten werden unverändert kopiert (NBT-Drehung ist NBT-01).
- Oberfläche: Symmetrie-Feld unter den Werkzeugen. Die Achse ist fest (wandert nicht mit dem wachsenden Modell); beim ersten Einschalten liegt sie auf der Modellmitte, Knöpfe „Achse: Modellmitte/Auswahlmitte“ und Eingaben X/Z verschieben sie. Achsen erscheinen als orange gestrichelte Linien im Ebenenraster, die Drehachse als Ring. Wirkt auf Setzen, alle Formen, Fläche füllen, Kurven und Einfügen (auch Schablonen und Bilder), nicht auf Auswahloperationen und Ersetzen.

## Kurven (`editor/curves.ts`)

- Catmull-Rom-Kurve durch die geklickten Punkte (Zellmitten), `tension` 0 = gerade Abschnitte, 1 = weich; `closed` schließt zum Ring. Höchstens 64 Punkte.
- Abtastung höchstens ¼ Block; jede Diagonalstufe wird über Zwischenzellen geschlossen (`addConnected`), daher ist jede Kurve flächenverbunden – im Spiel keine Lücken in Weg oder Mauer.
- Profile: `tube` (Kugelquerschnitt Radius 0–16, 0 = Linie), `road` (waagrechtes Band der Breite 1–33 quer zur Fahrtrichtung, Schienen im Abstand ½ Block → keine Löcher), `wall` (Band mit Höhe 1–128).
- Oberfläche: Werkzeug „Kurve“ (U). Klicks setzen Punkte (Ebene wechseln für Steigungen), Vorschau folgt dem Zeiger, Enter setzt, Rücktaste nimmt den letzten Punkt, Esc verwirft. Muster und Symmetrie wirken mit (z. B. Kiesweg mit Pflastermischung, gespiegelter Burggraben).

## Natur- und Formwerkzeuge (`editor/sculpt.ts`)

Wirken in der Auswahl; Nachbarn außerhalb werden gelesen, aber nicht geändert. „Fest“ heißt Blockzelle; Luft, Löschzellen und leere Zellen sind offen. Entfernte Zellen werden `null` wie beim Abbauen.

| Funktion | Regel |
| --- | --- |
| `erodeEdit` (Abtragen) | Blöcke mit ≥ `faces` offenen Seiten (1–6, Standard 3) entfernen; `iterations` 1–8 |
| `dilateEdit` (Aufbauen) | Offene Zellen mit ≥ `neighbours` festen Nachbarn (Standard 4) mit dem häufigsten Nachbarblock füllen |
| `smoothEdit` (Glätten) | Höhenfeld der Säulen mit Mittelwert (Radius 1–3) glätten; gehobene Säulen bekommen oben den häufigsten Nachbar-Deckblock, darunter das Material unter ihrem alten Deckblock (Gras bleibt oben, Erde darunter); gesenkte Säulen behalten ihren Deckblock |
| `overlayEdit` (Überziehen) | je Säule `depth` Lagen darauf (`above`) oder die obersten Blöcke ersetzen (`replace`, Eigenschaften werden wie beim Ersetzen übernommen); optional nur auf bestimmten Blöcken (`onlyOn`, z. B. nur Gras) |
| `naturalizeEdit` (Naturalisieren) | natürlicher Boden (`NATURAL_GROUND`) wird von oben Gras, `dirt` Lagen Erde (Standard 3), darunter Stein; Bauwerke bleiben, Boden darunter zählt als tief |
| `surfaceCells` / `paintSurfaceEdit` | Maske „nur sichtbare Blöcke“: alle Seiten, nur oben offen oder nur seitlich offen (Fassade); bemalt mit Pinsel oder Muster und übernimmt Ausrichtung/Blockentitäten wie `replacePatternEdit` |

Grenze: höchstens `MAX_EDIT_CELLS` (250 000) Zellen Auswahl.

## Farbpaletten und Bild → Blöcke (`editor/colorMatch.ts`)

- Der Kern enthält **keine** Farbtabellen: Die Werkstatt übergibt `ColorCandidate { id, side, top, value }` aus der eigenen generierten Durchschnittsfarb-Tabelle (`apps/web/src/editor/colorCandidates.ts` aus `blockmodels/colors26.ts`). Kandidaten sind nur volle Würfel; ausgeschlossen sind geformte, durchsichtige, fallende (Sand, Kies, Trockenbeton), technische, leuchtende Funktions- und absterbende Blöcke. Gruppen: alle, Wolle, Beton, Terrakotta, Stein/Ziegel/Erde, Holz.
- Farbabstand in CIE Lab (D65, ΔE 1976). `similarBlocks` liefert die nächsten Blöcke, `colorGradient(from, to, steps)` wählt Zwischenstufen nahe gleichmäßig verteilten Lab-Farben; jeder Block nur einmal. Die Oberfläche übernimmt den Verlauf direkt als Verlaufsmuster (EDIT-03).
- `imageToBlocks(pixels, candidates, { orientation, origin, dither, alphaThreshold })`: Wandbild entlang X oder Z (Seitenfarbe) oder Bodenbild (Deckfarbe), transparente Pixel bleiben leer, optional Fehlerverteilung (Floyd–Steinberg). Deterministisch; höchstens 256 × 256. Ergebnis inkl. Blockzählung und mittlerer Farbabweichung.
- Oberfläche: Bilddatei wird im Browser verkleinert (Breite in Blöcken), umgerechnet und als **Zwischenablage** übergeben; das Einfügen-Werkzeug zeigt die Vorschau unter dem Zeiger, R dreht, M spiegelt. Das Bild verlässt den Browser nicht.

## Auswahl- und Formwerkzeuge (EDIT-05)

Zweite Runde aus dem [Planer-Vergleich](../project/PLANER_VERGLEICH.md): Auswahlwerkzeuge von Editor-Mods (Zauberauswahl, Stapeln, Extrudieren) und fehlende Formen. Gleicher Vertrag: nur `Edit`, ein Rückgängig-Schritt, deterministisch, keine zweite Dreh- oder Koordinatenregel.

### Zellauswahl (`editor/region.ts`)

- `Region` = Menge von Zellschlüsseln. Die Werkstatt hält neben dem Auswahlquader optional eine Zellauswahl (`mask`); der Quader ist dann ihr Umriss. Alle Auswahlknöpfe wirken auf eine Zellauswahl **nur auf ihre Zellen** (`clipEdit` filtert jede Quader-, Muster-, Ersetzen- und Naturänderung), Nachbarn bleiben unverändert.
- `magicSelect(draft, start, { mode, plane, diagonal, limitBox })`: zusammenhängende Blockzellen ab einem Block. Modi: gleicher Zustand, gleicher Block, gleiches Material (`blockFamily`: Treppen, Stufen, Mauern, Zäune, Bretter, Stämme einer Holz-/Steinart; `stone_bricks` ↔ `stone_brick_wall`), alle Blöcke (ganzes Bauteil). `plane` bleibt in der Ebene, `diagonal` geht zusätzlich über die 12 Kantennachbarn (Dächer, Treppenläufe). Luft, Löschzellen und leere Zellen gehören nie dazu. Oberfläche: Werkzeug „Zauberstab“ (W), Shift+Klick fügt hinzu, Alt+Klick nimmt weg; Vorschau unter dem Zeiger, Zellen im Ebenenraster mint mit Umriss, im 3D markiert.
- `growRegion`/`shrinkRegion` (Flächennachbarn, wahlweise nur in der Ebene), `resizeBox` (Quader ±1), `fitBox` („an Inhalt anpassen“), „Nur Blöcke“ (Quader → Zellauswahl seiner Blöcke), „Als Quader“.
- `copyRegion`, `clearRegionEdit`, `clearBoxEdit`, `fillRegionEdit`, `moveRegionEdit` (Verschieben, Drehen, Spiegeln über `transformClipboard`; die Zellauswahl selbst wird nach derselben Regel mitbewegt und folgt).
- `stackEdit(draft, region, step, count)`: wiederholt den Inhalt `count`-mal (1–64) mit Versatz `step`; die Oberfläche rechnet `step` aus Richtung × (Auswahlgröße + Abstand). Explizite Luft wird mitgeschrieben (abschaltbar), Blockentitäten und Ausstattung werden kopiert.
- `extrudeEdit(draft, region, seite, weite)`: Herausziehen = jede Blockzelle der Auswahl, deren Nachbar zur Seite kein Block ist, wächst um `weite` Zellen ihres Zustands (stoppt am ersten Block, Blockentitäten werden nicht verdoppelt); Einschieben (negative Weite) entfernt je Säule höchstens |weite| Blöcke, nur innerhalb der Auswahl. Eine Zellauswahl wächst beim Herausziehen mit.

### Ausstattung zieht mit (offener Punkt aus ENTITY-01)

- `Clipboard.entities` (optional) hält Gemälde, Rahmen und Rüstungsständer, deren Ankerzelle (`entityAnchor`) in der Auswahl liegt, relativ zur Ecke. `transformClipboard` dreht sie mit `transformEntity` nach derselben Regel wie Zellmitten (q → R(q) + Versatz), `pasteEdit(…, { entities })` hängt sie an die aktuelle Liste an.
- `moveBoxEdit`/`moveRegionEdit` bewegen, drehen und spiegeln sie mit; Ausschneiden und Leeren entfernen sie; Stapeln kopiert sie; gespeicherte Schablonen behalten sie. Ohne `entities`-Liste (Modelle ohne Ausstattung) bleiben sie wie bisher weg.

### Formen (`editor/forms.ts`)

| Funktion | Regel |
| --- | --- |
| `ellipsoidEdit(box, …, { hollow, dome })` | Ellipsoid im aufgezogenen Quader (Grundfläche ziehen, „Höhe ab Ebene“), jede Achse eigener Radius; `dome` legt den Äquator auf die Unterseite (Zwiebel-/Ellipsenkuppel). Werkzeug J. |
| `torusEdit(mitte, ring, rohr, …, { axis, hollow, half })` | Ringradius bis zur Rohrmitte (Ziehweite), Rohrradius 1–32; liegend (Brunnenrand, Turmkragen) oder stehend (Rad, Rundfenster), halb als Bogenring. Werkzeug T. |
| `helixEdit(mitte, radius, …, { width, pitch, height, clockwise, thickness })` | Wendel: jede Ringzelle bekommt je Umdrehung eine Stufe auf der Höhe ihres Winkels; mit Treppen als Pinsel zeigen die Stufen bergauf (`facing` entlang der Steigung). `walkable` meldet, ob jede Höhe flächig an die nächste grenzt (keine Zwei-Block-Stufe); die Oberfläche warnt sonst. Werkzeug H. |

Hohlformen behalten Zellen mit einem Flächen- **oder Kantennachbarn** außerhalb; so bleiben gekrümmte Schalen flächenverbunden (keine Zellen, die sich nur an einer Kante berühren).

## Prüfung

- `node --test tests/editor-creative.test.mjs` (nach `npm run build:core`): Gruppengrößen, Spiegelbilder auf Mitte/Grenze, vier Vierteldrehungen = Identität, Treppen zeigen nach Spiegeln/Drehen in die richtige Richtung (gegen `transformBlockState`), ungelöste Zustände gemeldet; Kurven durch alle Punkte, flächenverbunden, Wegbreite exakt, Mauerhöhe, Ring ohne lose Enden; Abtragen/Aufbauen/Glätten/Überziehen/Naturalisieren mit Handzählung; Oberflächenmaske (98 von 125, 25 oben, 80 Seiten); Lab-Grenzwerte, Grauverlauf, Bild mit Transparenz, Lage und reproduzierbarem Dithering.
- `node --test tests/e2e/workshop-creative.e2e.mjs` (nach `npm run build`): gespiegelter Block, gespiegelte Kurve als ein Rückgängig-Schritt, Abtragen in der Auswahl, Naturalisieren, Farbverlauf als Muster, Oberfläche bemalen, PNG → Wollbild → Einfügen; 390 px ohne waagrechtes Scrollen.
- `node --test tests/editor-region.test.mjs` (EDIT-05): Materialfamilien, Zauberauswahl in allen Modi mit Ebene/Kanten/Grenze, Wachsen/Schrumpfen/Einpassen, Quaderwerkzeuge auf Zellauswahl, Verschieben/Drehen einer L-Zellauswahl mit gedrehten Treppen und einem Rückgängig, Ausstattung beim Verschieben/Drehen (Gemälde hängt danach an der gedrehten Wand, Rüstungsständer blickt gedreht), Zwischenablage mit Ausstattung, Stapeln (auch diagonal, ohne Luft), Extrudieren heraus/hinein, Ellipsoid/Torus/Wendel mit Symmetrie-, Verbundenheits- und Richtungsprüfungen.
- `node --test tests/e2e/workshop-region.e2e.mjs`: Zauberstab mit Shift/Alt, Stapeln ×3 und Rückgängig, Herausziehen/Einschieben, Leeren nur der Zellauswahl, Verschieben mit Pfeiltaste, Ellipsoid, Torus, Wendel; 390 px ohne waagrechtes Scrollen.
- Offen: Spielprüfung gespiegelter Zustände (Türen, Truhen, Schienen), Firefox/Safari, echte Geräte; Symmetrie und Kurven im Mod (später).
