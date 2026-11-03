# Performance- und Stabilitätsbefund (PERF-05)

Stand: 03.11.2026, Quelle `main` 7b975a0 plus PERF-05. Auftrag: Philipp, Thread „Gesamtsystem auf Performance und Stabilität optimieren“. Rahmen: kleine, einzeln getestete Schritte, kein Big-Bang-Umbau. Dateien der laufenden Threads (Teambau in Mod, Planer und Plugin, Lagerkisten) werden nur nach Absprache angefasst.

Alle Zahlen sind gemessen, nicht geschätzt: Chromium 1243 headless (SwiftShader, keine GPU), Cloud-Container, `vite preview` auf dem gebauten Pages-Artefakt, Median aus drei Läufen. Messskript: `node scripts/perf/measure_start.mjs` (nach `npm run build`). Auf Philipps Rechner sind die absoluten Werte anders. Die Verhältnisse gelten trotzdem.

## Ergebnis dieser Runde

| Messgröße | vorher | nachher | Maßnahme |
|---|---:|---:|---|
| Erststart bis Projektzentrale (leerer Browser oder neuer App-Stand) | 5,2 s | **1,4 s** | P-1 Katalogdatei |
| Katalog selbst erzeugt (Rückfall, Node) | 4,3 s | 3,9 s | P-3 canonicalJson |
| Startpaket JavaScript (Einstieg) | 1 329 kB (400 kB gzip) | **720 kB (215 kB gzip)** | P-2 Seiten bei Bedarf |
| Bausatz aller Gebäudesets im Seitenpaket | ~600 kB | 0 (nur Worker, Rückfall nachgeladen) | P-2 |
| Neustart mit gespeichertem Katalog | 1,1 s | 1,1 s (Heap 42 → 18 MB) | O-1, O-2 erledigt; Wandzeit bestimmen Worker und IndexedDB |
| Gleicher Katalog in Node und Chromium | **nein** (Kolosseum abweichend) | ja, Test | S-1 plattformfeste Mathematik |

Der Erststart betrifft nicht nur neue Nutzer. Der Katalogschlüssel ist ein Fingerabdruck über den ganzen Kerncode. Jede Veröffentlichung mit Kernänderung, also fast jede, hat bisher bei jedem Nutzer den Katalog im Browser neu erzeugt.

## Umgesetzt

### P-1 Mitgelieferter Katalog als Datei (größter Gewinn)

- **Befund:** Der erste Start eines neuen App-Stands erzeugte alle 359 mitgelieferten Bauwerke im Worker: Generatoren laufen lassen, hashen, packen, Kennwerte berechnen. Das kostete 4,3 s CPU in Node und 4,7 bis 5,2 s im Browser, auf schwächeren Rechnern ein Vielfaches.
- **Lösung:** Dieselbe Rechnung läuft beim Bauen der Seite (`scripts/build_catalog_snapshot.mjs`, Teil von `npm run build:web`). Sie schreibt `assets/catalog-<key>.json`. Der Worker lädt die Datei nur, wenn der gespeicherte Katalog nicht passt. Danach prüft er sie wie den Katalogspeicher (`fromCache`: jede Version entpackt, jede Referenz aufgelöst) und legt sie als Katalogspeicher ab. Der nächste Start liest sie also lokal.
- **Ausfallsicher:** Fehlt die Datei, ist sie beschädigt, gehört sie zu einem anderen Schlüssel oder dauert sie länger als 20 s, erzeugt der Worker den Katalog wie bisher (Warnung in der Konsole). Der Start hängt nie von der Datei ab.
- **Größe:** 3,1 MB, gzip 451 kB. GitHub Pages liefert gzip aus. Je Veröffentlichung kommt eine Datei hinzu, die alte wird vom Publisher entfernt (`isPagesArtifact` erlaubt genau `assets/catalog-<32 hex>.json`).
- **Schutz vor veraltetem Kern:** Das Skript bricht ab, wenn `dist/` älter ist als `packages/` (dann wäre die Datei nicht passend zum Code).
- **Tests:** `tests/e2e/catalog-snapshot.e2e.mjs` prüft, dass der Katalog aus der Datei Asset für Asset und Version für Version (id, payloadHash, Zellenzahl) dem im Browser erzeugten gleicht. Außerdem prüft er, dass fehlende, beschädigte und fremde Dateien zum Erzeugen führen und dass ein Neustart die Datei nicht erneut lädt. `library-start.e2e.mjs` erwartet beim Erststart jetzt `snapshot`.

### P-2 Seiten erst bei Bedarf laden

- **Befund:** `main.tsx` importierte alle Seiten statisch: Bibliothek, Projekt, Karte, Werkstatt, Mod, System, Testphase, Weltimport, Betrachter. Dazu zog `app/repository.ts` über `createBuildingLibrary` alle Gebäudesets ins Seitenpaket, obwohl der Katalog im Worker entsteht. Der Einstieg wog 1,33 MB.
- **Lösung:** `app/lazyPage.tsx` lädt jede Seite außer der Projektzentrale beim ersten Öffnen nach, mit einer Ladeanzeige über `Suspense`. Die Gebäudesets lädt nur noch der Rückfall ohne Worker nach (`seedSamples`).
- **Stabilität:** Nach einer Veröffentlichung gibt es die Bausteine des alten Stands nicht mehr. Ein offener Tab bekäme beim Seitenwechsel einen Ladefehler. `lazyPage` lädt dann einmal neu, abgesichert über sessionStorage gegen eine Schleife. Scheitert es auch danach, zeigt die Fehlergrenze die Meldung wie bei jedem anderen Seitenfehler.

### P-3 `canonicalJson` ohne Zwischenarrays

- **Befund:** Erster CPU-Brennpunkt beim Katalogbau (631 ms Eigenzeit von 4,3 s). Jede Version-ID und jeder payloadHash läuft durch diese Funktion. Die alte Form legte je Objekt `Object.entries`, `filter`, `sort`, `map` und `join` an.
- **Lösung:** Sie hängt jetzt an einen einzigen String an. Die Ausgabe ist Byte für Byte gleich, gesichert durch `tests/canonical-json.test.mjs`: 2000 Zufallswerte gegen die alte Implementierung plus Sonderfälle. Gespeicherte Hashes und IDs ändern sich nicht.

### S-1 Plattformfeste Winkelfunktionen (Stabilitätsfehler)

- **Befund:** Beim Abgleich Node gegen Chromium wich das **Kolosseum** ab: andere Geometrie, also eine andere Version-ID. Ursache: `Math.sin`, `Math.cos` und `Math.atan2` sind in JavaScript nur angenähert. Node 22 und Chromium 1243 liefern bei rund 4 % der Eingaben ein anderes letztes Bit, gemessen auf 4097 Stützstellen (`sin` 161, `cos` 151, `atan2` 788 Abweichungen). Firefox und Safari rechnen wieder anders. Kippt dadurch eine Ganzzahl-Entscheidung, etwa Bogennummer oder Block ja/nein, hat dasselbe mitgelieferte Gebäude je Browser eine andere Version-ID. Folgen: Scheinupdates nach Browserupdates, Teampakete mit abweichenden Versionen zwischen Mitspielern, und die Katalogdatei hätte nicht gepasst.
- **Lösung:** `packages/voxel/src/stableMath.ts` mit `stableSin`, `stableCos`, `stableAtan`, `stableAtan2` und `stableHypot`. Sie nutzen nur Grundrechenarten, `Math.sqrt` und `Math.round` in fester Reihenfolge (Verfahren aus fdlibm). Damit liefert jede Engine dasselbe Ergebnis. Der Fehler liegt unter 2·10⁻¹⁶, und feste Referenzbits stehen im Test (`tests/stable-math.test.mjs`).
- **Ersetzt in:** Generatoren (`generators/arena.ts`), Bausets (`build/sets/*`), `terrainDesign.ts`, `base.ts`, `editor/forms.ts`. **Kein** mitgeliefertes Gebäude hat dadurch gegenüber dem bisherigen Node-Ergebnis eine neue Version-ID bekommen (alle 359 geprüft). Wer das Kolosseum schon in Chrome erzeugt hatte, bekommt es einmal als Aktualisierung angeboten, ab dann ist es überall gleich.
- **Regel ab jetzt:** Für Geometrie, die gespeichert, gehasht oder verglichen wird, `stable*` statt `Math.*` verwenden. Anzeige, Kamera und Messwerte dürfen `Math.*` nutzen.

## Offene Befunde, priorisiert

Priorität: **P1** spürbar für jeden Nutzer, **P2** bei großen Daten oder bestimmten Seiten, **P3** Wartbarkeit.

| ID | Prio | Befund | Vorschlag | Abhängigkeit |
|---|---|---|---|---|
| O-1 | P1 | **Erledigt (Runde 2):** Vorschaubilder wurden bei jedem Start neu gerendert. Beim Neustart belegte das WebGL-Rendern samt Rücklesen den Hauptthread rund 0,6 s. | `thumbnail/thumbStore.ts`: Cache Storage je Render-Revision (gehashte Baustein-Adresse des Renderers), Schlüssel = bisheriger Bildschlüssel + Pixeldichte, alte Stände werden gelöscht, ohne Cache Storage wird wie bisher gerendert. Neustart: längste Hauptthread-Blockade 326 ms → 123 ms, kein `drawImage` mehr. Test `thumb-store.e2e.mjs`. | — |
| O-2 | P1 | **Erledigt (Runde 3):** Beim Start entpackte die Seite alle Versionen (394 000 Zellen als Objekte), obwohl die Projektzentrale keine Zellen braucht. | `unpackVersionLazily` (versionStorage.ts): `payload.cells` wird beim ersten Lesen entpackt, `cellCount` liefert die Anzahl ohne Entpacken, Speichern einer unberührten Version nimmt ihre Bytes. Projektzentrale entpackt 0 Versionen, Bibliothek nur die sichtbaren (20). JS-Heap nach dem Neustart 42 → 18 MB. Test `lazy-cells.test.mjs`. | — |
| O-3 | P2 | Startpaket weiterhin 720 kB. Die Projektzentrale zieht Betrachter-nahe Module (LayerSheet, litematicWrite, Vermessungen), und `packages/domain/src/index.ts` exportiert alles in einem Barrel, was das Aufteilen erschwert. `world.worker` wiegt 1 MB. | Projektzentrale-Abhängigkeiten nachladen (Export- und Schnittansichten erst beim Klick). Später gezielte Unterpfade statt Barrel-Import. | `ProjectsView.tsx` wird gerade vom Teambau-Planer geändert, deshalb nach dessen Merge |
| O-4 | P2 | Katalogbau-Brennpunkte: `refinePayload` 529 ms, `deepFreeze` 296 ms, `validatePayload` 205 ms, `computeMaterials` 199 ms, `analyzeVersion` 1,2 s. Seit P-1 nur noch beim Bauen und im Rückfall, aber dieselben Wege laufen bei Generatoren und großen Importen auf der Seite. | Doppeltes Einfrieren und Validieren vermeiden (versiegelte Payloads durchreichen). `analyzeVersion` teilt Zählschleifen mit `computeMaterials`. | Generator-Dateien, nach Absprache mit Bibliothek und Kolosseum |
| O-5 | P2 | Katalogdatei 3,1 MB, davon 1 MB Kennwerte und 1,2 MB Versionsköpfe (Paletten). | Paletten und Kennwerte deduplizieren oder binär ablegen. Ziel unter 200 kB gzip. | eigenständig |
| O-6 | P3 | Sehr große Dateien mit verdichteten Einzeilern: `WorldMapView.tsx` 846 Zeilen, `BlockEditor.tsx` 610, `LandscapeTab.tsx` 547, `TeamTab.tsx`, `team.ts` 752, `base.ts` 801, `blockFacts.ts` 2074. Das erschwert Review und parallele Arbeit, weil Konflikte gehäuft auftreten. | Je Datei erst nach Merge des zuständigen Threads in Unterkomponenten und Hooks aufteilen, jeweils ohne Verhaltensänderung und mit vorhandenen Browsertests als Netz. | nacheinander, nie während ein Thread die Datei bearbeitet |
| O-7 | P3 | Restliche plattformabhängige Mathematik: `voxel/entities.ts` (Gierwinkel, auf 1/1000° gerundet, daher geringes Risiko), `editor/colorMatch.ts` (`Math.cbrt`, Bild zu Blöcken, Nutzeraktion), `Math.hypot` in Weltplan und Route (Messwerte, nicht gespeichert). | Beobachten. `entities.ts` bei der nächsten Entity-Änderung auf `stableAtan2` umstellen. | — |
| O-8 | P2 | Mod und Paper-Plugin (9 951 Zeilen Java): `LiveLinkServer` und `Hologram` mit eigenen Threads, 27 breite `catch`-Blöcke als Absturzschutz (gewollt), `TeamModule.java` 840 Zeilen. | Eigene Analyse, sobald die Threads „Gemeinsames Bauen in der Mod ausbauen“ und „Server-Plugin mit geprüften Lagerkisten“ gemergt sind. Vorher keine Änderungen. | laufende Threads |

## Runde 3: Projektberechnung (PERF-02-S03) und Zellen bei Bedarf (O-2)

Messprojekt: die 60 größten mitgelieferten Gebäude nebeneinander, teils gedreht, gespiegelt und überlappend (256 000 Zellen). Prüfstand: SHA-256 jedes Ergebnisteils (Auflösung mit allen Unterfeldern, Anleitung, Materialien, Schrittmaterialien, Instanzmaterialien, Baustelle) vor und nach jeder Änderung, alle gleich.

| Messgröße (Node 22) | vorher | nachher |
|---|---|---|
| `computeProject` je Änderung | 2,2–2,3 s | 1,8–1,9 s |
| Ergebnis Worker → Seite (kodieren, kopieren, dekodieren) | 0,8 s | 0,45 s |
| Fortschritt abhaken, Baustelle oder Projektname ändern | volle Neuberechnung (2,5 s und mehr, Anzeige „wird berechnet“) | nur Baustellenteil auf der Seite (0,13–0,25 s bei 256 000 Zellen, wenige ms bei üblichen Projekten) |
| JS-Heap nach Neustart (Chromium) | 42 MB | 18 MB |

- **Doppelte Arbeit:** `paletteKeys` merkt sich die Zustandsschlüssel je eingefrorener Palette (vorher je Material- und Schrittaufruf neu). `resolveProject` findet den Palettenplatz über die Identität des Zustands. Die Itemregeln ohne Nachbarn gelten je Palette für alle Aufrufe. Die Anleitung kennt die Weltzellen jedes Schritts (`stepCellIndices`), Schrittmaterialien und Übertragung brauchen keine Positionssuche mehr.
- **Übertragung:** `Resolution.owners` reist als Zahlen (`ownerWire.ts`: Koordinaten, Index der Besitzerliste, gleiche Listen einmal) und wird auf der Seite zur selben Map. Eine erst beim Lesen gefüllte Map wurde verworfen: `structuredClone` und `util.isDeepStrictEqual` sehen sie leer.
- **Selektive Neuberechnung:** `computeProject` = `computeGeometry` (liest per Typ nur `instances` und `profileId` und die benutzten Versionen) + `computeSite`. `sameGeometry` vergleicht genau diese Eingaben (Instanzen kanonisch, Versionen als dasselbe Objekt oder gleiche id, payloadHash und alle übrigen Felder). `useProjectComputation` nutzt die letzte fertige Geometrie und rechnet nur `computeSite` neu; „Erneut versuchen“ rechnet immer voll. Test `selective-recompute.test.mjs`: Ergebnis gleich der vollen Rechnung, jede Geometrieeingabe macht ungültig.
- **Zellen bei Bedarf:** siehe O-2.
- **Weiter offen:** Die Geometrie selbst wird bei jeder Instanzänderung voll neu gerechnet (Anleitung 0,5 s, Material 0,4 s bei 256 000 Zellen). Ein inkrementelles Zusammensetzen je Instanz wäre der nächste Schritt, ist aber ein großer Eingriff in `compose.ts`/`guide.ts`.

## Geprüft ohne Befund

- **Speicherlecks durch Ereignisse und Zeitgeber:** Alle `addEventListener` in Komponenten haben ein Gegenstück oder hängen an Objekten mit eigener Lebensdauer (OrbitControls, WakeLock). `setInterval` wird überall im Effekt-Aufräumen gestoppt.
- **Fehlerbehandlung:** Fehlergrenze je Seite (S1), Fehlerprotokoll, Systemcheck, atomare IndexedDB-Schreibvorgänge, Worker-Rückfall ohne Worker und bei defektem Worker. Dazu kommt jetzt der Katalogdatei-Rückfall und das Nachladen nach einem Deploy.
- **Doppelte Datenbankabfragen beim Start:** Assets, Versionen und Katalogspeicher werden je einmal parallel gelesen.
- **Kleine Unsauberkeit behoben:** `fromCache` prüfte Asset-Referenzen mit `versions.some(...)` je Referenz (quadratisch). Jetzt nutzt es ein Set.

## Messen

```
npm run build
node scripts/perf/measure_start.mjs --runs 3 --json messung.json
```

Das Skript gibt Erststart, Neustart, längste Hauptthread-Blockade und geladenes JavaScript je Seite aus. In der Cloud-Umgebung braucht es `PLAYWRIGHT_BROWSERS_PATH` auf das vorhandene Chromium (siehe TESTING.md).
