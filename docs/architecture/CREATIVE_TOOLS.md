# Kreativwerkzeuge der Werkstatt (EDIT-04)

Stand: 02.11.2026 · Roadmap-ID **EDIT-04** · baut auf [BLOCK_EDITOR](BLOCK_EDITOR.md) (EDIT-01/02/03) · Herleitung: [Vergleich mit anderen Planern](../project/PLANER_VERGLEICH.md)

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

## Prüfung

- `node --test tests/editor-creative.test.mjs` (nach `npm run build:core`): Gruppengrößen, Spiegelbilder auf Mitte/Grenze, vier Vierteldrehungen = Identität, Treppen zeigen nach Spiegeln/Drehen in die richtige Richtung (gegen `transformBlockState`), ungelöste Zustände gemeldet; Kurven durch alle Punkte, flächenverbunden, Wegbreite exakt, Mauerhöhe, Ring ohne lose Enden; Abtragen/Aufbauen/Glätten/Überziehen/Naturalisieren mit Handzählung; Oberflächenmaske (98 von 125, 25 oben, 80 Seiten); Lab-Grenzwerte, Grauverlauf, Bild mit Transparenz, Lage und reproduzierbarem Dithering.
- `node --test tests/e2e/workshop-creative.e2e.mjs` (nach `npm run build`): gespiegelter Block, gespiegelte Kurve als ein Rückgängig-Schritt, Abtragen in der Auswahl, Naturalisieren, Farbverlauf als Muster, Oberfläche bemalen, PNG → Wollbild → Einfügen; 390 px ohne waagrechtes Scrollen.
- Offen: Spielprüfung gespiegelter Zustände (Türen, Truhen, Schienen), Firefox/Safari, echte Geräte; Symmetrie und Kurven im Mod (später).
