# Grafik: Licht, Schatten, Spawnprüfung, große Modelle (GFX-01)

Baut auf der Blockdarstellung [BLOCK_MODELS](BLOCK_MODELS.md) (VIEW-02) auf. Ziel: Bauwerke im Planer so aussehen lassen, wie sie im Spiel beleuchtet sind, und daraus echte Planungshinweise ziehen (dunkle Ecken, Monster-Spawnflächen). Gilt für alle 3D-Ansichten (Betrachter, Bibliothek, Generatoren, Werkstatt, Projekte, Weltkarte) und die Standbilder (Katalogvorschauen, Bildergalerie, Ebenenpläne).

## Was im Mesh steckt

`apps/web/src/blockmodels/mesh.ts` backt pro Eckpunkt vier Werte in das Attribut `aLight` (alle 0..1):

| Wert | Bedeutung |
|---|---|
| Flächenhelligkeit | Feste Minecraft-Werte je Richtung: oben 1, unten 0,5, Nord/Süd 0,8, West/Ost 0,6 (vorher in der Farbe eingerechnet). |
| Eckschatten (AO) | Wie „Weiche Beleuchtung“ im Spiel: zwei Seiten- und ein Eckblock vor der Fläche; Stufen 0,48 / 0,64 / 0,8 / 1. Glas und andere durchsichtige Würfel verschatten nicht. Das Viereck wird entlang der helleren Diagonale geteilt. |
| Blocklicht | Aus `light.ts`: Leuchtstärke je Blockzustand (Fackel 14, Laterne/Glowstone/Seelaterne 15/15/10, Ofen nur mit `lit=true` 13, Kerzen 3 je Kerze, Seegurken 6–15 nur im Wasser, Seelenanker nach Ladung, Lichtblock nach `level`, Kupferbirne nach Oxidation …). Ausbreitung wie im Spiel: −1 je Schritt, Wasser/Laub/Eis/Spinnennetz zusätzlich −1, volle undurchsichtige Blöcke halten Licht auf. |
| Himmelslicht | Fällt senkrecht ohne Verlust bis zum ersten undurchsichtigen Block und breitet sich dann seitlich aus (−1 je Schritt). Außerhalb des Modells gilt freier Himmel. |

Pro Eckpunkt wird wie im Spiel über die freien Zellen vor der Fläche gemittelt (vorn, zwei Seiten, Ecke). Gekreuzte Pflanzen und gedrehte Elemente bekommen das Licht ihrer eigenen Zelle ohne Eckschatten.

Licht wird über das Gitter der Modellgrenzen plus zwei Zellen Rand gerechnet. Über `LIGHT_LIMIT` (24 Mio. Gitterzellen, z. B. sehr weit verstreute Weltausschnitte) entfällt es: volles Tageslicht, kein Blocklicht, keine Spawnprüfung (die Oberfläche sagt das).

## Lichtmodi (Shader, `threeMesh.ts`)

Umschalten ändert nur Uniforms, nie die Geometrie (`data-build-ms` bleibt gleich).

| Modus | Darstellung |
|---|---|
| **Tag** (Standard) | Minecraft-Tageslicht: Flächenhelligkeit × Eckschatten × Lichtkurve aus max(Himmel, Block). Innenräume ohne Fenster und Licht werden dunkler (Untergrenze 20 %, damit man noch planen kann). |
| **Sonne** | Gerichtetes Sonnenlicht nach Uhrzeit (6–18 Uhr: Osten → Westen, leicht südlich geneigt) mit Schattenkarte, dazu Himmels-Umgebungslicht und Fackeln. |
| **Nacht** | Mondlicht aus dem Himmelslicht (bläulich, schwach) und warmes Blocklicht. Zeigt, wo Licht fehlt. |
| **Flach** | Nur Flächenhelligkeit und Eckschatten – gleichmäßig hell, gut zum Bauen. |

Die Lichtkurve ist Minecrafts `l / (4 − 3l)` mit halber „Hell“-Gammaanhebung. Markierungen (Auswahl, Konflikte, Unterschiede) werden nach dem Licht eingemischt und bleiben auch nachts sichtbar.

**Schatten:** `SunShadow` rendert die Tiefe aller festen Abschnitte aus Sonnenrichtung in eine Tiefentextur (2048², ab Modellradius 96 und passender GPU 4096²), nur wenn sich Geometrie, Uhrzeit oder Modus ändern. Ausgeschnittene Texturen (Laub, Gitter) werfen löchrige Schatten, durchscheinende Blöcke (Glas, Wasser) werfen keine. 3×3-Filter, Normalenversatz gegen Streifen.

## Spawnprüfung

`mesh.spawn` listet jede freie Zelle über einem Block mit voller, undurchsichtiger Oberseite (nicht Glas, Laub, Barriere, Magma, Schleim-/Honigblock, Gerüst, Spawner), über der zwei Zellen frei oder durchlässig sind (Gras, Blumen, Redstone, Knöpfe, Schilder, eine Schneeschicht; Schienen verhindern), und deren **Blocklicht 0** ist (Regel seit 1.18). Rotes Kreuz: Himmelslicht ≤ 7, Monster können auch tagsüber spawnen (Innenräume, Keller). Gelbes Kreuz: nur nachts (Dächer, offene Höfe). Biome, Mob-Größen außer 2 Blöcken Höhe und Spawn-Sperren durch Strukturen sind nicht berücksichtigt. Bei einem Schnitt (Ebenenfilter) gilt die Prüfung für das sichtbare Modell.

## Durchsichtige Blöcke

Glas, Wasser und andere durchscheinende Flächen liegen in eigenen Meshes und werden vor jedem Bild von hinten nach vorn sortiert (je Abschnitt nach Viereckmitte, Abschnitte untereinander nach Abstand), sobald sich die Kamera um mehr als eine Viertel-Blocklänge bewegt. Über 300.000 durchscheinende Flächen wird erst sortiert, wenn die Kamera ruht. Standbilder sortieren einmal aus Blickrichtung.

## Große Modelle: Abschnitte

`buildSectionMesh` teilt das Mesh in 32³-Abschnitte (eigene Draw-Calls, Sichtfeld-Kulling durch three.js). Jeder Abschnitt hat einen Fingerabdruck aus

- Position und Blockzustand jeder Zelle im Abschnitt und im Rand von zwei Zellen (Kulling, Eckschatten), reihenfolgeunabhängig,
- Markierungen dieser Zellen,
- Licht aller freien Zellen im Abschnitt plus eine Zelle Rand, die nicht volles Tageslicht ohne Blocklicht haben,
- Ursprung, Renderer-Schlüssel (Formen/Texturen), Licht- und AO-Schalter.

Gleicher Fingerabdruck ⇒ Abschnitt samt GPU-Puffern wird übernommen. Eine Änderung in der Werkstatt baut deshalb nur ihre Abschnitte neu – und die, deren Licht sich ändert (eine Fackel an einer Abschnittsgrenze erneuert beide Seiten). Picking geht über die Position: wiederverwendete Abschnitte zeigen auf Zellen eines früheren Aufbaus, der Controller sucht die aktuelle Zelle an derselben Position.

Messung (Node, Container): synthetische 1,11 Mio. Blöcke / 4,8 Mio. Flächen – vollständiger Aufbau ~9 s, nach Änderung eines Blocks ~2,4 s (161 von 162 Abschnitten übernommen). Großmodell aus `tests/stability.test.mjs` (605.568 Blöcke) ~5,5 s statt ~4,3 s ohne Licht.

## Einstellungen

`blockmodels/graphics.ts`: eine Einstellung für die ganze App (`localStorage` `bauplaner.grafik.v1`): Modus, Eckschatten, Schatten, Uhrzeit, Spawnprüfung, Qualität (Automatisch = Pixelverhältnis bis 2, Hoch bis 3, Sparsam 1). Menü „☀ Tag“ in der Betrachter-Werkzeugleiste (`viewer/GraphicsMenu.tsx`), auf dem Handy als Leiste am unteren Rand. Standbilder nutzen immer den festen Look `STILL_LOOK` (Tag mit Eckschatten); er steht im Cache-Schlüssel der Vorschaubilder.

Prüfattribute am `.canvas-host`: `data-light`, `data-spawn-check`, `data-spawn`, `data-spawn-day`, `data-spawn-night`, `data-sections`, `data-reused`.

## Prüfungen und Grenzen

- Node `tests/graphics.test.mjs`: Leuchtwerte, Ausbreitung (Fackel, geschlossener Raum, Wasser, Dachöffnung), Eckschatten, Licht je Eckpunkt, Spawnflächen (dunkler Raum, Fackel, niedrige Decke, Glas/Laub), Abschnitte (gleiche Flächenzahl wie ein Mesh, Reihenfolge egal, Änderung/Markierung/Ursprung/Licht über Grenzen, inkrementell = neu gebaut), Sortierung, Einstellungen, Sonnenbahn.
- Browser `tests/e2e/graphics.e2e.mjs` (Chromium, Software-WebGL): alle Lichtmodi mit Helligkeitsvergleich der Bildschirmfotos (Schatten dunkeln ab, Nacht dunkler als Tag), Uhrzeit, Spawnzähler und Kreuze, Umschalten ohne Neuaufbau, Speicherung über Neuladen, Dorfplatz mit mehreren Abschnitten und Picking.
- Nicht geprüft: echte GPUs, Firefox/Safari, Handy-Leistung mit Schatten; Vergleich mit Bildschirmfotos aus dem Spiel. Biomfarben, Wolken, Himmelsfarbe und Nebel gibt es nicht. Blockentities (Truhen, Banner) leuchten nicht und werfen Schatten nur als eigene Form.

## Weiterverwendung

Der 3D-Export ([MODEL_EXPORT](MODEL_EXPORT.md), MODEL-01) übernimmt das Netz aus `buildBlockMesh` als Ansichtsmodell (Formen, Farben/Texturen, wahlweise Flächenhelligkeit und Eckschatten als Eckpunktfarbe) und baut die Druckhülle aus denselben eigenen Blockformen (`solidParts`).
