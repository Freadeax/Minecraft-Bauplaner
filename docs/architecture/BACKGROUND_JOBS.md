# Schwere Berechnungen im Hintergrund (PERF-04)

Stand: 02.11.2026. Ziel: Die Seite friert bei großen Modellen nie ein. Lesen großer Dateien, Prüfsummen, Packen, 3D-Netz mit Licht, 3D-Export, Versionsvergleich und Update-Vorschau laufen in einem Web Worker, mit Fortschrittsanzeige und „Abbrechen“. Ergebnisse sind bitgenau dieselben wie im Hauptthread (Node-Prüfungen vergleichen beide Wege).

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

- **Protokoll** (`protocol.ts`): `run {id, kind, input}` → `progress {step, fraction}` (höchstens alle 80 ms) → `done {result}` oder `error {message, code}`. Fehler kommen als lesbare deutsche Meldung an.
- **Abbrechen** = `worker.terminate()`. Ein abgebrochener oder überholter Auftrag liefert nie ein Ergebnis; nichts wird gespeichert oder heruntergeladen. Zeitlimit 10 Minuten mit Hinweis „zu groß für diesen Rechner“.
- **Rückfall:** ohne `Worker` (Node, sehr alte Browser) rechnet der Hauptthread wie vorher. Die 3D-Ansicht fällt bei einem Workerfehler auf den direkten Weg zurück.
- **Anzeige:** `JobStatus.tsx` zeigt Titel, Schritt, Prozent, Sekunden und „Abbrechen“; in der 3D-Ansicht als Überlagerung (`.viewer-busy`), `data-mesh="pending|ready"` am Ansichtsrahmen.

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

- `tests/background-jobs.test.mjs` (Node, 11 Tests): verlustfreie Spaltenübergabe mit gleicher Prüfsumme, beschädigte Spalten und Limits abgewiesen, `createPayload`/`cropPayload` unverändert, gemerkte Prüfsumme und gepackte Zellen nur für versiegelte Payloads, Verbindungsprüfung wie vorher, Renderer-Schnappschuss ergibt byte-gleiches 3D-Netz, Fortschritt von Netz und Export ohne Einfluss auf die Datei, Auftragsclient mit Fortschritt, Fehlern, fremden Antworten, Abbrechen und Zeitlimit.
- `tests/e2e/background-jobs.e2e.mjs` (Chromium, 130 000 Blöcke): Import, 3D-Ansicht, Speichern, Datencheck ohne Befund nach Neuladen, STL wasserdicht; Abbrechen von 3MF-Export und Import; Update-Vorschau und Versionsvergleich über den Worker.

## Grenzen

- Das Entpacken der Bibliothek beim Start und die Kennwerte sehr großer Versionen im Katalog laufen weiter im Hauptthread.
- Hochladen auf die Grafikkarte und Sortieren durchsichtiger Flächen bleiben im Hauptthread.
- Nur Chromium geprüft; Firefox/Safari und echte Geräte offen.
