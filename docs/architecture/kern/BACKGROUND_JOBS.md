# Schwere Berechnungen im Hintergrund (PERF-04)

Stand: 02.11.2026. Ziel: Die Seite friert bei großen Modellen nie ein. Lesen großer Dateien, Prüfsummen, Packen, 3D-Netz mit Licht, 3D-Export, Versionsvergleich, Update-Vorschau und der Bibliotheksstart laufen in einem Web Worker, mit Fortschrittsanzeige und „Abbrechen“. Ergebnisse sind bitgenau dieselben wie im Hauptthread (Node-Prüfungen vergleichen beide Wege).

## Aufträge

`apps/web/src/jobs/` – ein Modul-Worker (`heavy.worker.ts`) je Auftrag, Rechenteile werden im Worker per dynamischem Import geladen (`vite.config.mjs`: `worker.format = 'es'`).

| Auftrag | Wer startet | Was im Worker läuft | Schwelle |
|---|---|---|---|
| `import` | `app/importFile.ts` (Bibliothek, Betrachter) | Entpacken, Lesen, Prüfen (`validatePayload`), Bericht | immer |
| `version` | `jobs/versions.ts` `addAssetVersionInBackground` (Speichern, Zuschneiden) | `addAssetVersion`: Prüfsumme, Version-ID, Packen, Kennwerte | immer im Browser |
| `mesh` | `viewer/backgroundMesh.ts` (3D-Ansicht, Standbilder) | `buildSectionMesh` mit Eckschatten, Licht, Spawnprüfung | ab 120 000 Zellen |
| `model` | `export3d/ModelExportPanel.tsx` | `exportModel` (Ansichtsmodell, Druckhülle, Dateischreiben) | immer im Browser |
| `diff` | `schem/DiffView.tsx` | `diffPayloads` + farbige Vereinigung | ab 120 000 Zellen (beide Stände) |
| `update` | `jobs/updates.ts` `prepareUpdateInBackground` (Projekt → Updates) | `prepareUpdate` mit Rebase und Folgen | ab 100 000 Zellen |
| `library` | `jobs/library.ts` `startLibrary` (App-Start, `app/context.tsx`) | mitgelieferten Katalog erzeugen, gespeicherte Versionen entpacken, Auslieferung planen (`planSeed`), Katalogkennwerte aller neuesten Versionen | immer im Browser |

- **Protokoll** (`protocol.ts`): `run {id, kind, input}` → `progress {step, fraction}` (höchstens alle 80 ms) → `done {result}` oder `error {message, code}`. Fehler kommen als lesbare deutsche Meldung an.
- **Abbrechen** = `worker.terminate()`. Ein abgebrochener oder überholter Auftrag liefert nie ein Ergebnis; nichts wird gespeichert oder heruntergeladen. Zeitlimit 10 Minuten mit Hinweis „zu groß für diesen Rechner“.
- **Rückfall:** ohne `Worker` (Node, sehr alte Browser) rechnet der Hauptthread wie vorher. Die 3D-Ansicht fällt bei einem Workerfehler auf den direkten Weg zurück.
- **Anzeige:** `JobStatus.tsx` zeigt Titel, Schritt, Prozent, Sekunden und „Abbrechen“; in der 3D-Ansicht als Überlagerung (`.viewer-busy`), `data-mesh="pending|ready"` am Ansichtsrahmen.

## Bibliotheksstart (S05)

Vorher lief bei **jedem** Start im Hauptthread: alle 336 mitgelieferten Gebäude erzeugen und hashen (`createBuildingLibrary`, im Browser ~3 s am Stück), die Auslieferung geänderter Katalogbauten planen und beim ersten Öffnen der Bibliothek die Kennwerte jeder neuesten Version berechnen (~1 s, mit großen eigenen Bauten mehr).

Jetzt (`jobs/library.ts`, `jobs/libraryJob.ts`):

1. Die Seite öffnet die Datenbank (`openRepository({ seed: false })`) und liest Bauteile und die **rohen** Versionsdatensätze (`listVersionRecords`, Zellen noch gepackt – billig zu lesen und zu kopieren).
2. Der Worker erzeugt den Katalog, entpackt die Datensätze, plant mit `planSeed` (dieselbe Funktion wie `seedSamples` in `app/repository.ts`) und berechnet die Kennwerte. Er schickt nur den Schreibplan (Versionen gepackt, Bytes übertragen) und die Kennwerte zurück.
3. Die Seite schreibt den Plan selbst über `applyBatch` (Revisionsprüfung bleibt an einer Stelle; die Packbytes des Workers werden über `rememberPackedCells` wiederverwendet), übernimmt die Kennwerte in `catalogMetrics` und entpackt die Bibliothek in Scheiben zu 150 000 Zellen mit Pausen (`loadLibrary`, auch für `reloadLibrary`).
4. Der Startbildschirm zeigt `JobStatus` „Bibliothek wird geladen“ mit Schritt und Prozent (`.app-start`).

Zwei Tabs gleichzeitig: Revisionskonflikt beim Schreiben → bis zu zweimal neu von vorn. Ohne Worker oder bei einem Workerfehler seedet die Seite direkt wie vorher (`console.warn`), die App startet immer.

Messung (Chromium headless, Cloud-Container, 336 Katalogbauten; Blockierung = Summe der Long Tasks bis zum Katalog):

| | vorher | nachher |
|---|---|---|
| Neuladen, nur Katalog | 4,6 s, größter Block 2,8 s | 0,8 s, größter Block 0,12 s |
| Neuladen mit eigenem Bau (600 000 Blöcke) | 6,7 s, größter Block 3,3 s | 0,5–0,8 s, größter Block 0,26 s |

Die Zeit bis zum fertigen Katalog blieb dabei etwa gleich (~5 s), aber die Seite zeichnet und reagiert in dieser Zeit.

### Katalogspeicher je App-Version (S07)

- `vite.config.mjs` berechnet beim Bauen `__CATALOG_KEY__`: SHA-256 über alle Quelldateien unter `packages/` (Geometrie, Prüfsummen, IDs, Kennwerte hängen nur davon ab). Der Entwicklungsserver setzt keinen Schlüssel – dort gibt es keinen Speicher.
- Der Worker legt den gebauten Katalog (Bauteile, Versionen gepackt) und die Kennwerte nach Version-ID als `CatalogCache` zurück; die Seite speichert ihn im `meta`-Speicher (Schlüssel `catalogCache`, keine Migration). Passt beim nächsten Start der Schlüssel, nimmt der Worker Katalog und Kennwerte daraus und berechnet nur Kennwerte neuer Versionen (dann wird der Speicher erneuert).
- Anderer Schlüssel, beschädigter oder unvollständiger Datensatz → neu bauen, Ergebnis gleich. Der Speicher ist reine Bequemlichkeit: Verlust kostet einmal Neubau, nie Daten. Er ist nicht Teil von Sicherungen.
- `document.documentElement.dataset.libraryStart` = `built` | `cache` | `direct` (Testhaken).
- Messung: Neuladen bis zum Katalog 5,1 s → 1,0 s; mit eigenem 600.000-Block-Bau beim ersten Start danach 3,2 s (Kennwerte des neuen Baus), dann 1,0 s.

## Zellübergabe

`packages/voxel/src/cellColumns.ts`: Zellen reisen als Spalten (`kinds` Uint8Array, `palette` Int32Array, `xyz` Int32Array) und werden übertragen statt kopiert (Transferables). Der Hauptthread baut die Spalten in Scheiben zu je 100 000 Zellen und gibt dazwischen die Seite frei (`pause()`: `scheduler.yield` oder `setTimeout`).

- `hydratePayload` setzt die Zellen in Scheiben wieder zusammen und ruft `sealTransportedPayload`.
- **Vertrauensregel:** `sealTransportedPayload` nimmt nur Payloads an, die im Worker vollständig mit `validatePayload` geprüft wurden. Er prüft Zellenlimit, friert Kopf und Zellen ein und registriert sie als geprüft; die Zelle-für-Zelle-Prüfung wird nicht wiederholt. Neue Aufrufer müssen diese Regel einhalten.
- `createPayload` gibt eine schon geprüfte Payload mit ausreichenden Grenzen unverändert zurück (kein `structuredClone` mehr).

## Zwischenspeicher

- `rememberPayloadHash(payload, hash)` (Domäne, nur versiegelte Payloads, 64 Hex-Zeichen): die im Worker berechnete Prüfsumme wird übernommen.
- `rememberPackedCells(payload, packed)`: im Worker gepackte Zellen werden beim Speichern (IndexedDB) wiederverwendet; `applyBatch` packt vor dem Klonen.
- `app/metricsCache.ts` `catalogMetrics`: Kennwerte je Version für den Katalog nur einmal.
- 3D-Ansicht: unveränderte Abschnitte werden nur über Schlüssel und Hash abgeglichen und nicht zurückgeschickt.

## Testhaken

`localStorage['bauplaner.hintergrund.ab'] = '<Zellen>'` senkt alle Schwellen (nie höher), damit kleine Beispiele den Workerweg nehmen (`tests/e2e/background-jobs.e2e.mjs`).

## Messung

Synthetisches Litematic, 927 000 Blöcke, Chromium headless (Software-GL), Cloud-Container:

| | vorher | nachher |
|---|---|---|
| Import bis Bericht | 15,8 s, Blockierung 12 s | 7,4 s, Blockierung 5,4 s (größter Block 3,9 s) |
| Speichern als Bauteil | 70,7 s, Blockierungen zusammen 102 s, einzeln bis 17 s | 18,1 s, Blockierungen zusammen 6,7 s |
| 3D-Export | bis 20 s Stillstand | Seite bleibt bedienbar, Abbrechen sofort |

Die verbleibenden Blockierungen sind das Hochladen der Geometrie auf die Grafikkarte (`bufferData`, in Software-GL besonders teuer) und das Zusammensetzen der Szene.

## Prüfungen

- `tests/unit/core/background-jobs.test.mjs` (Node, 11 Tests): verlustfreie Spaltenübergabe mit gleicher Prüfsumme, beschädigte Spalten und Limits abgewiesen, `createPayload`/`cropPayload` unverändert, gemerkte Prüfsumme und gepackte Zellen nur für versiegelte Payloads, Verbindungsprüfung wie vorher, Renderer-Schnappschuss ergibt byte-gleiches 3D-Netz, Fortschritt von Netz und Export ohne Einfluss auf die Datei, Auftragsclient mit Fortschritt, Fehlern, fremden Antworten, Abbrechen und Zeitlimit.
- `tests/unit/catalog/library-start.test.mjs` (Node, 4 Tests; Test 4: Katalogspeicher mit passendem Schlüssel gibt exakt das gebaute Ergebnis ohne Bauen, anderer Schlüssel/beschädigt/fehlend baut neu): Worker-Start schreibt genau das, was `seedSamples` schreibt, mit denselben Kennwerten wie der Katalog; zweiter Start schreibt nichts, eigene Bauten bekommen Kennwerte, veraltete Katalogangaben werden erneuert, Archivstand bleibt; beschädigte Version stoppt den Start nicht.
- `tests/e2e/library-start.e2e.mjs` (Chromium): Fortschritt auf dem Startbildschirm, längste Blockade < 1,5 s, Katalog vollständig, Neuladen schreibt nichts, Datencheck ohne Befund; Start ohne Worker und mit defektem Worker.
- `tests/e2e/background-jobs.e2e.mjs` (Chromium, 130 000 Blöcke): Import, 3D-Ansicht, Speichern, Datencheck ohne Befund nach Neuladen, STL wasserdicht; Abbrechen von 3MF-Export und Import; Update-Vorschau und Versionsvergleich über den Worker.

## Grenzen

- Der erste Start nach einem App-Update baut den Katalog neu (~5 s bis zum Katalog, Seite bleibt bedienbar).
- Eine einzelne sehr große Version (900 000 Blöcke) wird beim Start in einem Stück entpackt (~0,2–0,3 s).
- Hochladen auf die Grafikkarte und Sortieren durchsichtiger Flächen bleiben im Hauptthread.
- Nur Chromium geprüft; Firefox/Safari und echte Geräte offen.
