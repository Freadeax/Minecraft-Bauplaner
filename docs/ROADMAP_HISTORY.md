# Roadmap-Änderungsverlauf

Aus [roadmap.json](roadmap.json) erzeugt. Ereignisse werden angehängt, nicht nachträglich umgeschrieben. Commitnachweise: Git-Historie der JSON-Datei; Veröffentlichung: deployment.json und Artefakt-Kindcommit.

## 2026-11-01T05:19:41.200Z · progress

**Aufgaben:** PLAN-01, ARCH-01, DOC-01

56 Aufgaben in vier Phasen dokumentiert; Anwendungsschicht, Speicherports und Aufnahmevertrag entkoppelt; 353 Node-Tests und Gesamtcheck bestanden. Browserlauf noch durch fehlendes Chromium blockiert; Installationsversuch läuft. Main/Pages noch ausstehend.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PLAN-01 | 🚧 In Arbeit | 1/3 | Schema, Historie, Darstellung und Änderungsprüfung implementieren und testen. |
| ARCH-01 | 🚧 In Arbeit | 2/4 | Gesamtprüfung und bestehende Format-/Browserregressionen ausführen. |
| DOC-01 | 🚧 In Arbeit | 1/2 | Aktuellen Status ersetzen; historische Aussagen ausdrücklich archivieren. |

**Geänderte Dateien:**

- `.githooks/pre-push`
- `AGENTS.md`
- `README.md`
- `apps/web/src/app/repository.ts`
- `apps/web/src/app/scanPersistence.ts`
- `apps/web/src/views/project/ExportTab.tsx`
- `apps/web/tsconfig.json`
- `docs/COMMUNICATION.md`
- `docs/ROADMAP_LEGACY.md`
- `docs/STATUS.md`
- `docs/STATUS_HISTORY.md`
- `docs/architecture/DECISIONS.md`
- `docs/architecture/MODULES.md`
- `docs/operations/GITHUB_CONNECTOR_RUNBOOK.md`
- `package.json`
- `packages/application/src/index.ts`
- `packages/application/src/memoryRepository.ts`
- `packages/application/src/repository.ts`
- `packages/application/src/revisionExport.ts`
- `packages/application/src/scanPersistence.ts`
- `packages/domain/src/gameCheck.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/revisionExport.ts`
- `packages/domain/src/schemExport.ts`
- `packages/formats/src/scan.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/observation.ts`
- `scripts/check_architecture.mjs`
- `scripts/publish_main_pages.sh`
- `scripts/roadmap.mjs`
- `tests/application.test.mjs`
- `tests/architecture.test.mjs`
- `tests/game-check.test.mjs`
- `tests/litematic.test.mjs`
- `tests/roadmap.test.mjs`
- `tests/scan-persistence.test.mjs`
- `tests/schem-export.test.mjs`

## 2026-11-01T05:20:38.605Z · progress

**Aufgaben:** PLAN-01, ARCH-01, DOC-01, QA-01

Roadmap mit 56 Paketen, Teilschritten und verbindlicher Mergepflege implementiert. Anwendungsschicht und Architekturprüfung bestehen im Gesamtcheck mit 353 Node-Tests. Historische Statuswidersprüche bereinigt. Browserinstallation fehlgeschlagen; QA-01 bleibt blockiert. Mainintegration und Liveprüfung stehen als nächste Integrationsschritte aus.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PLAN-01 | 🧩 Implementiert · Abnahme offen | 2/3 | Geprüften Quellstand integrieren, passenden Pages-Build veröffentlichen und beide SHAs prüfen. |
| ARCH-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Geprüfte Anwendungsschicht nach Main/Pages integrieren; QA-01 bleibt eigenständige offene Browserabnahme. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei jedem folgenden Quellblock Status über dieselben Aufgaben und Nachweise nachführen. |
| QA-01 | ⛔ Blockiert | 0/2 | Chromium-Laufzeit bereitstellen bzw. Verfügbarkeit prüfen. |

**Geänderte Dateien:**

- `.githooks/pre-push`
- `AGENTS.md`
- `README.md`
- `apps/web/src/app/repository.ts`
- `apps/web/src/app/scanPersistence.ts`
- `apps/web/src/views/project/ExportTab.tsx`
- `apps/web/tsconfig.json`
- `docs/COMMUNICATION.md`
- `docs/ROADMAP_LEGACY.md`
- `docs/STATUS.md`
- `docs/STATUS_HISTORY.md`
- `docs/TESTING.md`
- `docs/architecture/DECISIONS.md`
- `docs/architecture/MODULES.md`
- `docs/operations/GITHUB_CONNECTOR_RUNBOOK.md`
- `package.json`
- `packages/application/src/index.ts`
- `packages/application/src/memoryRepository.ts`
- `packages/application/src/repository.ts`
- `packages/application/src/revisionExport.ts`
- `packages/application/src/scanPersistence.ts`
- `packages/domain/src/gameCheck.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/revisionExport.ts`
- `packages/domain/src/schemExport.ts`
- `packages/formats/src/scan.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/observation.ts`
- `scripts/check_architecture.mjs`
- `scripts/publish_main_pages.sh`
- `scripts/roadmap.mjs`
- `tests/application.test.mjs`
- `tests/architecture.test.mjs`
- `tests/game-check.test.mjs`
- `tests/litematic.test.mjs`
- `tests/roadmap.test.mjs`
- `tests/scan-persistence.test.mjs`
- `tests/schem-export.test.mjs`

## 2026-11-01T06:15:35+01:00 · baseline

**Aufgaben:** CORE-01, CORE-02, CORE-03, STORE-01, MAT-01, BUILD-01, LIB-01, GEN-01, OPS-01, PLAN-01, ARCH-01, DOC-01, STORE-02, QA-01, QA-02, UI-01, STAB-01, OPS-02, OPS-03, LICENSE-01, PROFILE-01, NBT-01, FORMAT-01, FORMAT-02, MAT-02, MAT-03, MAT-04, DIFF-01, PERF-01, PERF-02, PERF-03, VIEW-01, VIEW-02, EDIT-01, UPDATE-01, LIB-02, LIB-03, WORLD-02, BUILD-05, GEN-02, MAP-01, MAP-02, GAME-01, GAME-02, GAME-03, WORLD-IMPORT-01, BACKUP-02, TEAM-01, AUTH-01, TEAM-02, TEAM-03, GAME-04, LAGER-01, OPS-04, DEFER-01, DEFER-02

Aktuellen Main-Snapshot 84838f0 und dokumentierten 342-Test-Stand übernommen; offene Browser-/Spiel-/Geräteabnahmen ausdrücklich nicht als erledigt gezählt. Historische Roadmap separat erhalten.

## 2026-11-01T06:15:35+01:00 · started

**Aufgaben:** PLAN-01, ARCH-01, DOC-01

Nutzer beauftragt vollständige Roadmap mit Mergepflege. Anwendungsschicht begonnen; vollständige Prüfung und Main-/Pages-Integration noch ausstehend.

## 2026-11-01T09:26:37.129Z · progress

**Aufgaben:** STORE-02

STORE-02 nach Prüfung von S4-Referenzen und sauberem Remote-Stand begonnen; Vertrag, Migration, UI-Konfliktbehandlung und atomare Regressionen reserviert. Noch nicht implementiert oder geprüft.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| STORE-02 | 🚧 In Arbeit | 1/3 | Asset-CAS in beiden Speicheradaptern, Migration und bestehende UI-Schreibpfade vollständig integrieren. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`

## 2026-11-01T09:32:42.167Z · progress

**Aufgaben:** STORE-02, PLAN-01, ARCH-01, DOC-01

STORE-02 implementiert: lokale Asset-CAS, additive DB-v2-Migration, atomare Schreibpfade und feste Formulargrundlage. Gezielt geprüfte Restore-/Seedfälle; Gesamtcheck folgt, echte Browserabnahme offen. Vorherige PLAN-/ARCH-/DOC-Mainintegration und Live-SHA plus zwölf Hashes nachgewiesen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| STORE-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Echte IndexedDB-v1→v2-Migration und Zwei-Tab-UI-Regressionsfälle bei verfügbarer Chromium-Laufzeit ausführen; danach STORE-02 vollständig abnehmen. Folgender Entwicklungsblock PERF-01. |
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |
| ARCH-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |

**Geänderte Dateien:**

- `README.md`
- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/app/repository.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/library/AssetRevisionNotice.tsx`
- `apps/web/src/views/library/BuildingDetail.tsx`
- `apps/web/src/views/library/BuildingSheet.tsx`
- `apps/web/src/views/library/ConnectorEditor.tsx`
- `apps/web/src/views/library/CropPanel.tsx`
- `apps/web/src/views/library/GeneratorsPage.tsx`
- `apps/web/src/views/library/VersionsSection.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/architecture/ASSET_CONCURRENCY.md`
- `docs/architecture/DECISIONS.md`
- `packages/application/src/assetConcurrency.ts`
- `packages/application/src/index.ts`
- `packages/application/src/memoryRepository.ts`
- `packages/application/src/repository.ts`
- `packages/domain/src/backup.ts`
- `packages/domain/src/library.ts`
- `packages/domain/src/recordValidation.ts`
- `packages/domain/src/types.ts`
- `tests/asset-concurrency.test.mjs`
- `tests/asset-restore.test.mjs`
- `tests/asset-seeding.test.mjs`
- `tests/e2e/asset-concurrency.e2e.mjs`
- `tests/e2e/asset-editing.e2e.mjs`

## 2026-11-01T09:33:55.354Z · progress

**Aufgaben:** STORE-02, PLAN-01, ARCH-01, DOC-01

STORE-02 vollständig implementiert und kerngeprüft: 364 Node-Tests, Typ-/Build-/Modul-/Roadmap-/Dokumentationscheck bestanden. Echte DB-v2-/Zwei-Tab-Browserabnahme mangels Chromium offen, daher Abnahmeschritt nicht abgeschlossen. Vorherige PLAN-/ARCH-/DOC-Main-/Pagesnachweise nachgetragen. Mainintegration dieses Blocks und Liveprüfung folgen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| STORE-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Echte IndexedDB-v1→v2-Migration und Zwei-Tab-UI-Regressionsfälle bei verfügbarer Chromium-Laufzeit ausführen; danach STORE-02 vollständig abnehmen. Folgender Entwicklungsblock PERF-01. |
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |
| ARCH-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |

**Geänderte Dateien:**

- `README.md`
- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/app/repository.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/library/AssetRevisionNotice.tsx`
- `apps/web/src/views/library/BuildingDetail.tsx`
- `apps/web/src/views/library/BuildingSheet.tsx`
- `apps/web/src/views/library/ConnectorEditor.tsx`
- `apps/web/src/views/library/CropPanel.tsx`
- `apps/web/src/views/library/GeneratorsPage.tsx`
- `apps/web/src/views/library/VersionsSection.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/ASSET_CONCURRENCY.md`
- `docs/architecture/DECISIONS.md`
- `packages/application/src/assetConcurrency.ts`
- `packages/application/src/index.ts`
- `packages/application/src/memoryRepository.ts`
- `packages/application/src/repository.ts`
- `packages/domain/src/backup.ts`
- `packages/domain/src/library.ts`
- `packages/domain/src/recordValidation.ts`
- `packages/domain/src/types.ts`
- `tests/asset-concurrency.test.mjs`
- `tests/asset-restore.test.mjs`
- `tests/asset-seeding.test.mjs`
- `tests/e2e/asset-concurrency.e2e.mjs`
- `tests/e2e/asset-editing.e2e.mjs`

## 2026-11-01T09:39:17.366Z · progress

**Aufgaben:** WORLD-02

Drei Bauwelten aus tatsaechlichen Katalogeintraegen ergaenzt (fernoestlich 3, wuestenstil 6, end 2); Kernpruefung bestanden, Browser-Sichtpruefung offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| WORLD-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Main-Integration und Pages-Artefakt veröffentlichen; Sichtprüfung der drei neuen Bauwelten bleibt Teil von QA-01. |

**Geänderte Dateien:**

- `README.md`
- `docs/COMMUNICATION.md`
- `docs/NOVEMBER_EXPANSION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/BUILD_THEMES.md`
- `packages/domain/src/buildThemes.ts`
- `tests/build-themes.test.mjs`

## 2026-11-01T09:42:34.925Z · progress

**Aufgaben:** WORLD-02

Main c3e6478 und Pages-Artefakt bc74958 veroeffentlicht; Live-Manifest, Quell-SHA und zwoelf Dateihashes inklusive Stichproben-Bytes geprueft. Browser-Sichtpruefung bleibt in QA-01 offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| WORLD-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Sichtprüfung der drei neuen Bauwelten bei verfügbarer Browserlaufzeit in QA-01 nachholen; folgender Entwicklungsblock PERF-01. |

**Geänderte Dateien:**

- `docs/STATUS.md`
- `docs/TESTING.md`

## 2026-11-01T10:07:13.335Z · progress

**Aufgaben:** PERF-01, PERF-02

Größerer Performanceblock begonnen: asynchrone Projektberechnung, Worker-Lifecycle, Session/Ansichten und gemessene interne Zellindizes. Noch keine Fertigstellung oder Browsermessung behauptet.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-01 | 🚧 In Arbeit | 0/3 | Zusammenhängenden Worker-/Indexblock implementieren und mit semantischen Regressionen sowie abgegrenzter Node-Messung prüfen. |
| PERF-02 | 🚧 In Arbeit | 0/2 | Zusammenhängenden Worker-/Indexblock implementieren und mit semantischen Regressionen sowie abgegrenzter Node-Messung prüfen. |

**Geänderte Dateien:**

- `apps/web/src/views/project/BuildTab.tsx`
- `apps/web/src/views/project/MaterialsTab.tsx`
- `apps/web/src/views/project/SiteTab.tsx`
- `docs/COMMUNICATION.md`
- `packages/domain/src/compose.ts`
- `scripts/benchmark_composition.mjs`

## 2026-11-01T10:13:29.044Z · progress

**Aufgaben:** PERF-01, PERF-02, STORE-02

Worker-Rechenfall, Client-Lifecycle, Snapshotbindung und Bau-/Material-/Baustellenansichten integriert; interner Indexteil mit identischen Resolution-Hashes und Node-Messung geprüft. Browser-/Mobilabnahme und selektiver Cache weiterhin offen; vollständiger Abschlusscheck folgt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-01 | 🧩 Implementiert · Abnahme offen | 2/3 | Vollständige Browser-/Mobil-Latenz und Abbruch/Retry/historische Revisionen mit verfügbarer Chromium-Laufzeit messen; danach PERF-01 vollständig abnehmen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Kopier-/Ownerkosten im echten Browser messen und selektive Geometrie-/Fortschritts-Invalidierung vor Cache-/Chunkumbau prüfen. |
| STORE-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Echte IndexedDB-v1→v2-Migration und Zwei-Tab-UI-Regressionsfälle bei verfügbarer Chromium-Laufzeit ausführen; danach STORE-02 vollständig abnehmen. Folgender Entwicklungsblock PERF-01. |

**Geänderte Dateien:**

- `README.md`
- `apps/web/src/app/useProjectComputation.ts`
- `apps/web/src/computation/client.ts`
- `apps/web/src/computation/project.worker.ts`
- `apps/web/src/computation/protocol.ts`
- `apps/web/src/views/project/BuildTab.tsx`
- `apps/web/src/views/project/MaterialsTab.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/SiteTab.tsx`
- `apps/web/src/views/project/session.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/architecture/COMPOSITION_PERFORMANCE.md`
- `docs/architecture/DECISIONS.md`
- `docs/architecture/MODULES.md`
- `docs/architecture/PROJECT_COMPUTATION.md`
- `packages/application/src/index.ts`
- `packages/application/src/projectComputation.ts`
- `packages/domain/src/compose.ts`
- `scripts/benchmark_composition.mjs`
- `tests/composition-index.test.mjs`
- `tests/e2e/project-computation.e2e.mjs`
- `tests/project-computation.test.mjs`

## 2026-11-01T10:15:04.390Z · progress

**Aufgaben:** PERF-01, PERF-02, STORE-02

Zusammenhängender Performanceblock implementiert: Workerberechnung, Lifecycle/Abbruch/Retry, Snapshotbindung, Projekt-/Bau-/Material-/Baustellenansichten und interner Zahlenindex. 377 Tests und vollständiger Check bestanden. Browser-/Mobilabnahme und selektiver Cache bleiben explizit offen; Main/Pages folgen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-01 | 🧩 Implementiert · Abnahme offen | 2/3 | Vollständige Browser-/Mobil-Latenz und Abbruch/Retry/historische Revisionen mit verfügbarer Chromium-Laufzeit messen; danach PERF-01 vollständig abnehmen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Kopier-/Ownerkosten im echten Browser messen und selektive Geometrie-/Fortschritts-Invalidierung vor Cache-/Chunkumbau prüfen. |
| STORE-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Echte IndexedDB-v1→v2-Migration und Zwei-Tab-UI-Regressionsfälle bei verfügbarer Chromium-Laufzeit ausführen; danach STORE-02 vollständig abnehmen. Folgender Entwicklungsblock PERF-01. |

**Geänderte Dateien:**

- `README.md`
- `apps/web/src/app/useProjectComputation.ts`
- `apps/web/src/computation/client.ts`
- `apps/web/src/computation/project.worker.ts`
- `apps/web/src/computation/protocol.ts`
- `apps/web/src/views/project/BuildTab.tsx`
- `apps/web/src/views/project/MaterialsTab.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/SiteTab.tsx`
- `apps/web/src/views/project/session.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/COMPOSITION_PERFORMANCE.md`
- `docs/architecture/DECISIONS.md`
- `docs/architecture/MODULES.md`
- `docs/architecture/PROJECT_COMPUTATION.md`
- `packages/application/src/index.ts`
- `packages/application/src/projectComputation.ts`
- `packages/domain/src/compose.ts`
- `scripts/benchmark_composition.mjs`
- `tests/composition-index.test.mjs`
- `tests/e2e/project-computation.e2e.mjs`
- `tests/project-computation.test.mjs`

## 2026-11-01T10:22:39.771Z · progress

**Aufgaben:** PERF-01, PERF-02, QA-01

Direkter veröffentlichter Cloud-Chrome-Desktop-Smoke bestanden: Projektberechnung, zwei schnelle Höhenänderungen, Bauplan Y2 und konsistente 350-Block-Material-/Baustellenwerte. Quelle 7dffd92 / Artefakt e1d6ba0 und 13 Livehashes bestätigt. Automatische Worker-/DB-/Mobil- und Latenzabnahme weiterhin offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-01 | 🧩 Implementiert · Abnahme offen | 2/3 | Vollständige Browser-/Mobil-Latenz und Abbruch/Retry/historische Revisionen mit verfügbarer Chromium-Laufzeit messen; danach PERF-01 vollständig abnehmen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Kopier-/Ownerkosten im echten Browser messen und selektive Geometrie-/Fortschritts-Invalidierung vor Cache-/Chunkumbau prüfen. |
| QA-01 | ⛔ Blockiert | 0/2 | Chromium-Laufzeit bereitstellen bzw. Verfügbarkeit prüfen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`

## 2026-11-01T11:03:14.381Z · progress

**Aufgaben:** PLAN-01, DOC-01

Codex-Vorbereitung ab main 9f1700e begonnen: vorhandene Regeln und Aufgaben erhalten; Setup, Windows-Prüfbarkeit und Browserlaufzeit werden geprüft.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PLAN-01 | 🚧 In Arbeit | 3/3 | Codex-Setup und Windows-/Browserprüfbarkeit vervollständigen, lokal prüfen und getrennt von Main/Pages nachweisen. |
| DOC-01 | 🚧 In Arbeit | 2/2 | Codex-Setup und Windows-/Browserprüfbarkeit vervollständigen, lokal prüfen und getrennt von Main/Pages nachweisen. |

**Geänderte Dateien:**

- `.gitattributes`
- `docs/COMMUNICATION.md`

## 2026-11-01T11:08:10.310Z · progress

**Aufgaben:** PLAN-01, DOC-01, QA-01, OPS-03

Setup eingerichtet, Playwright/Chromium lokal verfügbar, Windows-Pfade und UTF-8 geprüft. Remote enthält nur main; keine Branchlöschung nötig. Vollständige Browserabnahme läuft, erste Testfehler werden getrennt untersucht.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PLAN-01 | 🚧 In Arbeit | 3/3 | Codex-Setup und Windows-/Browserprüfbarkeit vervollständigen, lokal prüfen und getrennt von Main/Pages nachweisen. |
| DOC-01 | 🚧 In Arbeit | 2/2 | Codex-Setup und Windows-/Browserprüfbarkeit vervollständigen, lokal prüfen und getrennt von Main/Pages nachweisen. |
| QA-01 | 🚧 In Arbeit | 1/2 | Vollständige lokale Chromium-Suite auswerten; erstmals ausgeführte Selektor-/Wartefehler korrigieren und Produktfehler getrennt untersuchen. |
| OPS-03 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig. |

**Geänderte Dateien:**

- `.gitattributes`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `README.md`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/operations/GITHUB_CONNECTOR_RUNBOOK.md`
- `docs/project/CODEX_SETUP.md`
- `package-lock.json`
- `package.json`
- `scripts/bridge_crosscheck.mjs`
- `scripts/python.mjs`
- `scripts/setup_codex.mjs`
- `tests/e2e/export.e2e.mjs`
- `tests/e2e/litematic.e2e.mjs`
- `tests/litematic.test.mjs`
- `tests/main-pages.test.mjs`
- `tests/python-runner.test.mjs`
- `tests/schem-export.test.mjs`

## 2026-11-01T11:17:28.576Z · progress

**Aufgaben:** PLAN-01, DOC-01, QA-01, OPS-03, STORE-02, PERF-01, GAME-01

Codex-Setup und lokale Hooks eingerichtet; Windows-Prüfbarkeit und exakt fixierte Browserabhängigkeit ergänzt. 54/54 echte E2E bestanden; Aufnahmecontroller-Unmount behoben, Testannahmen korrigiert. STORE-02 und QA-01 abgenommen; große Worker-Latenz und echte Geräte offen. Main/Pages folgen getrennt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| QA-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Suite nach relevanten Änderungen wiederholen; echte Geräte in QA-02 und große Worker-Browserlatenz in PERF-01 prüfen. |
| OPS-03 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig. |
| STORE-02 | ✅ Im beschriebenen Umfang geprüft | 3/3 | CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02. |
| PERF-01 | 🧩 Implementiert · Abnahme offen | 2/3 | Große Projektberechnung im Browser mit Modell, Hardware und UI-Reaktionszeit vor/nachher messen (S03); Funktionsregressionen für Abbruch/Retry/historische Revisionen sind bestanden. |
| GAME-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |

**Geänderte Dateien:**

- `.gitattributes`
- `.github/pull_request_template.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `README.md`
- `apps/web/src/views/project/BuildTab.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/ASSET_CONCURRENCY.md`
- `docs/architecture/DECISIONS.md`
- `docs/architecture/PROJECT_COMPUTATION.md`
- `docs/operations/GITHUB_CONNECTOR_RUNBOOK.md`
- `docs/project/CODEX_SETUP.md`
- `package-lock.json`
- `package.json`
- `scripts/bridge_crosscheck.mjs`
- `scripts/python.mjs`
- `scripts/setup_codex.mjs`
- `tests/e2e/asset-editing.e2e.mjs`
- `tests/e2e/build-themes.e2e.mjs`
- `tests/e2e/export.e2e.mjs`
- `tests/e2e/game-check.e2e.mjs`
- `tests/e2e/litematic.e2e.mjs`
- `tests/e2e/project-computation.e2e.mjs`
- `tests/e2e/recipes.e2e.mjs`
- `tests/litematic.test.mjs`
- `tests/main-pages.test.mjs`
- `tests/python-runner.test.mjs`
- `tests/schem-export.test.mjs`

## 2026-11-01T11:18:47.672Z · progress

**Aufgaben:** PLAN-01, DOC-01, QA-01, OPS-03, STORE-02, PERF-01, GAME-01

Abschluss: 379/379 Node-Tests und 54/54 reale Chromium-E2E bestanden. Setup, Hooks, Aufgabenführung und Dokumentation geprüft; tatsächlichen lokalen/Cloud-/Pageszustand getrennt festgehalten. Aufnahmeverlust behoben. Dateibearbeitung beendet; Main-/Live-Nachweis folgt ohne selbstreferenzielle Commit-Schleife.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| QA-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Suite nach relevanten Änderungen wiederholen; echte Geräte in QA-02 und große Worker-Browserlatenz in PERF-01 prüfen. |
| OPS-03 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig. |
| STORE-02 | ✅ Im beschriebenen Umfang geprüft | 3/3 | CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02. |
| PERF-01 | 🧩 Implementiert · Abnahme offen | 2/3 | Große Projektberechnung im Browser mit Modell, Hardware und UI-Reaktionszeit vor/nachher messen (S03); Funktionsregressionen für Abbruch/Retry/historische Revisionen sind bestanden. |
| GAME-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |

**Geänderte Dateien:**

- `.gitattributes`
- `.github/pull_request_template.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `README.md`
- `apps/web/src/views/project/BuildTab.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/ASSET_CONCURRENCY.md`
- `docs/architecture/DECISIONS.md`
- `docs/architecture/PROJECT_COMPUTATION.md`
- `docs/operations/GITHUB_CONNECTOR_RUNBOOK.md`
- `docs/project/CODEX_SETUP.md`
- `package-lock.json`
- `package.json`
- `scripts/bridge_crosscheck.mjs`
- `scripts/python.mjs`
- `scripts/setup_codex.mjs`
- `tests/e2e/asset-editing.e2e.mjs`
- `tests/e2e/build-themes.e2e.mjs`
- `tests/e2e/export.e2e.mjs`
- `tests/e2e/game-check.e2e.mjs`
- `tests/e2e/litematic.e2e.mjs`
- `tests/e2e/project-computation.e2e.mjs`
- `tests/e2e/recipes.e2e.mjs`
- `tests/litematic.test.mjs`
- `tests/main-pages.test.mjs`
- `tests/python-runner.test.mjs`
- `tests/schem-export.test.mjs`

## 2026-11-01T12:19:58.409Z · progress

**Aufgaben:** PERF-01, OPS-02, UI-01, WORLD-02

56 Aufgaben gelesen; drei überschneidungsfreie parallele Prüfblöcke angemeldet. Root koordiniert Roadmap, Gesamtcheck und Main/Pages; keine fremde aktive Arbeit übernommen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-01 | 🚧 In Arbeit | 2/3 | Große Browsermessung isoliert durchführen; Messmodell, Hardware, Structured-Clone und UI-Reaktionszeit belegen. |
| OPS-02 | 🚧 In Arbeit | 0/2 | Isolierte Wiederherstellungsprobe ohne Remoteänderung durchführen und Source-/Manifestintegrität prüfen. |
| UI-01 | 🚧 In Arbeit | 2/3 | Visuelle Chromium-Abnahme hell/dunkel bei 1400/390 px durchführen; echte Geräte separat offen halten. |
| WORLD-02 | 🚧 In Arbeit | 2/2 | Vorhandene elf Bauwelten und drei neue Filterlinks im Browser abnehmen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`

## 2026-11-01T12:36:29.241Z · progress

**Aufgaben:** PERF-01, PERF-02, OPS-02, UI-01, WORLD-02, PLAN-01, DOC-01, QA-01, OPS-03, STORE-02, GAME-01

Drei parallele Blöcke abgeschlossen: große Browsermessung, isolierte Recoveryprobe und visuelle Themen/Bauweltenabnahme. Zwölf Messläufe, 4 Recovery- und 4 neue Browserfälle bestanden; Grenzen dokumentiert. Vorherige Main-/Live-SHAs nachgeführt. Gesamtprüfung folgt vor Push.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Messung bei Rechenkernänderungen wiederholen; Übertragungs-/Invalidierungsarbeit in PERF-02, vollständige React-/Gerätelatenz gesondert prüfen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Gemessene Structured-Clone-/Worker-Rückgabekosten reduzieren; selektive Geometrie-/Fortschrittsinvalidierung zuerst mit vollständigen semantischen Regressionen absichern. |
| OPS-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei tatsächlichem Vorfall bekannten Build neu bestätigen und Recovery regulär ohne Force vorbereiten; Livehashes danach gesondert prüfen. |
| UI-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Oberflächenregression bei Themen-/Layoutänderungen weiterführen; echte Geräte separat in QA-02. |
| WORLD-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Kuratierte Filter-/Treffernachweise bei Katalogänderungen fortführen; keine weitere Karte ohne tatsächliche Assets. |
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Aktuelle Prüf-/Main-/Live-Nachweise im nächsten sachlichen Quellblock nachführen; keine selbstreferenzielle Deploymentfolge. |
| QA-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Suite nach relevanten Änderungen wiederholen; echte Geräte in QA-02 und große Worker-Browserlatenz in PERF-01 prüfen. |
| OPS-03 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig. |
| STORE-02 | ✅ Im beschriebenen Umfang geprüft | 3/3 | CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02. |
| GAME-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/architecture/PROJECT_BROWSER_BENCHMARK.md`
- `docs/architecture/UI_ACCEPTANCE.md`
- `docs/architecture/project-browser-benchmark.json`
- `docs/operations/PAGES_RESTORE_PROBE.md`
- `docs/project/CODEX_SETUP.md`
- `scripts/benchmark_project_browser.mjs`
- `scripts/probe_pages_restore.mjs`
- `tests/e2e/ui-acceptance.e2e.mjs`
- `tests/pages-restore.test.mjs`

## 2026-11-01T12:40:32.602Z · progress

**Aufgaben:** PERF-01, PERF-02, OPS-02, UI-01, WORLD-02, PLAN-01, DOC-01, QA-01, OPS-03, STORE-02, GAME-01

383 Node-Tests und Gesamtcheck bestanden; neue Prüfdateien und Architekturbelege vollständig zugeordnet. Erster Browservolltest 57/58 mit Timeout vor Restore; isoliert unverändert 3/3 Speicherfälle bestanden, vollständige unabhängige Wiederholung läuft.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Messung bei Rechenkernänderungen wiederholen; Übertragungs-/Invalidierungsarbeit in PERF-02, vollständige React-/Gerätelatenz gesondert prüfen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Gemessene Structured-Clone-/Worker-Rückgabekosten reduzieren; selektive Geometrie-/Fortschrittsinvalidierung zuerst mit vollständigen semantischen Regressionen absichern. |
| OPS-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei tatsächlichem Vorfall bekannten Build neu bestätigen und Recovery regulär ohne Force vorbereiten; Livehashes danach gesondert prüfen. |
| UI-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Oberflächenregression bei Themen-/Layoutänderungen weiterführen; echte Geräte separat in QA-02. |
| WORLD-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Kuratierte Filter-/Treffernachweise bei Katalogänderungen fortführen; keine weitere Karte ohne tatsächliche Assets. |
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Aktuelle Prüf-/Main-/Live-Nachweise im nächsten sachlichen Quellblock nachführen; keine selbstreferenzielle Deploymentfolge. |
| QA-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Suite nach relevanten Änderungen wiederholen; echte Geräte in QA-02 und große Worker-Browserlatenz in PERF-01 prüfen. |
| OPS-03 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig. |
| STORE-02 | ✅ Im beschriebenen Umfang geprüft | 3/3 | CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02. |
| GAME-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/PROJECT_BROWSER_BENCHMARK.md`
- `docs/architecture/PROJECT_COMPUTATION.md`
- `docs/architecture/UI_ACCEPTANCE.md`
- `docs/architecture/project-browser-benchmark.json`
- `docs/operations/PAGES_RESTORE_PROBE.md`
- `docs/project/CODEX_SETUP.md`
- `scripts/benchmark_project_browser.mjs`
- `scripts/probe_pages_restore.mjs`
- `tests/e2e/ui-acceptance.e2e.mjs`
- `tests/pages-restore.test.mjs`

## 2026-11-01T12:42:58.241Z · progress

**Aufgaben:** PERF-01, PERF-02, OPS-02, UI-01, WORLD-02, PLAN-01, DOC-01, QA-01, OPS-03, STORE-02, GAME-01

Abschluss: 383 Node-Tests, große Browsermessung, Recoveryprobe und 58/58 unabhängige Chromiumregression bestanden. Vier Aufgaben im beschriebenen Umfang abgenommen, Ersttimeout und Geräte-/React-/Spielgrenzen erhalten. Alle Dateien zugeordnet; Main/Pages folgen getrennt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Messung bei Rechenkernänderungen wiederholen; Übertragungs-/Invalidierungsarbeit in PERF-02, vollständige React-/Gerätelatenz gesondert prüfen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Gemessene Structured-Clone-/Worker-Rückgabekosten reduzieren; selektive Geometrie-/Fortschrittsinvalidierung zuerst mit vollständigen semantischen Regressionen absichern. |
| OPS-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei tatsächlichem Vorfall bekannten Build neu bestätigen und Recovery regulär ohne Force vorbereiten; Livehashes danach gesondert prüfen. |
| UI-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Oberflächenregression bei Themen-/Layoutänderungen weiterführen; echte Geräte separat in QA-02. |
| WORLD-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Kuratierte Filter-/Treffernachweise bei Katalogänderungen fortführen; keine weitere Karte ohne tatsächliche Assets. |
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Aktuelle Prüf-/Main-/Live-Nachweise im nächsten sachlichen Quellblock nachführen; keine selbstreferenzielle Deploymentfolge. |
| QA-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Suite nach relevanten Änderungen wiederholen; echte Geräte in QA-02 und große Worker-Browserlatenz in PERF-01 prüfen. |
| OPS-03 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig. |
| STORE-02 | ✅ Im beschriebenen Umfang geprüft | 3/3 | CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02. |
| GAME-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/PROJECT_BROWSER_BENCHMARK.md`
- `docs/architecture/PROJECT_COMPUTATION.md`
- `docs/architecture/UI_ACCEPTANCE.md`
- `docs/architecture/project-browser-benchmark.json`
- `docs/operations/PAGES_RESTORE_PROBE.md`
- `docs/project/CODEX_SETUP.md`
- `scripts/benchmark_project_browser.mjs`
- `scripts/probe_pages_restore.mjs`
- `tests/e2e/ui-acceptance.e2e.mjs`
- `tests/pages-restore.test.mjs`

## 2026-11-01T12:48:14.548Z · progress

**Aufgaben:** PLAN-01

Claude-Codex-Abstimmung: Stand ab main ce59efb erhoben, abgebrochene Claude-Reservierungen B15/B16/B17 ohne Code aufgehoben, Aufgabenaufteilung und Fragen an Codex in MSG-CLAUDE-SYNC-00, Codex-Prompt docs/project/CODEX_PROMPT.md. Reine Dokumentation, npm run check bestanden.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/project/CODEX_PROMPT.md`
- `docs/project/CODEX_SETUP.md`

## 2026-11-01T12:52:36.925Z · progress

**Aufgaben:** MAP-01

MAP-01 von Claude übernommen (MSG-MAP01-00); B15-Reservierung abgeglichen, kein unintegrierter Altcode.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-01 | 🚧 In Arbeit | 2/4 | Projektursprung/Dimension, Undo und Sicherung ergänzen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`

## 2026-11-01T12:55:58.546Z · progress

**Aufgaben:** LIB-02, LIB-03

LIB-02/LIB-03 von Claude übernommen (MSG-LIB0203-00); B17-Altreservierung aufgehoben, kein unintegrierter Altcode.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-02 | 🚧 In Arbeit | 0/2 | Datenmodell collections.ts, Speicher (IndexedDB v3) und Sicherung erweitern. |
| LIB-03 | 🚧 In Arbeit | 0/2 | Vorlagen referenzieren feste Versionen bzw. versionierte Generatorparameter. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`

## 2026-11-01T12:56:16.487Z · progress

**Aufgaben:** EDIT-01, EDIT-02

Anmeldung: EDIT-01 übernommen, neue Aufgabe EDIT-02 Blockeditor angelegt; Dateibesitz und Hinweis an Codex zu PROFILE-01 in MSG-CLAUDE-EDIT-00. Reine Dokumentation.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| EDIT-01 | 🚧 In Arbeit | 0/2 | Auswahlvertrag und atomare Gruppenoperationen definieren. |
| EDIT-02 | 🚧 In Arbeit | 0/5 | Entwurfsvertrag und Werkzeuge umsetzen, Blockregister von VIEW-02 übernehmen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`

## 2026-11-01T13:02:14.162Z · progress

**Aufgaben:** VIEW-02

Blockformen nach Zustand für alle 1288 Blöcke (26.3), Originaltexturen nur aus Mojang-Jar oder eigenen Dateien im Browser, Blockregister und Zustandsregeln 26.3, Importgrenze 250.000 Zellen. 391 Node- und 59 Chromium-Prüfungen bestanden; Mojang-Download im Browser, Firefox/Safari und Geräte offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| VIEW-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Mojang-Download im echten Browser und weitere Browser prüfen; Registerdaten an PROFILE-01 binden, sobald es auf main liegt. |

**Geänderte Dateien:**

- `apps/web/src/blockmodels/TexturePanel.tsx`
- `apps/web/src/blockmodels/assets.ts`
- `apps/web/src/blockmodels/atlas.ts`
- `apps/web/src/blockmodels/blocks.css`
- `apps/web/src/blockmodels/colors26.ts`
- `apps/web/src/blockmodels/mesh.ts`
- `apps/web/src/blockmodels/model.ts`
- `apps/web/src/blockmodels/pack.ts`
- `apps/web/src/blockmodels/packKit.ts`
- `apps/web/src/blockmodels/renderers.ts`
- `apps/web/src/blockmodels/shapes.ts`
- `apps/web/src/blockmodels/threeMesh.ts`
- `apps/web/src/blockmodels/tint.ts`
- `apps/web/src/blockmodels/zip.ts`
- `apps/web/src/colors.ts`
- `apps/web/src/import.worker.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/schem/DiffView.tsx`
- `apps/web/src/schem/LayerSheet.tsx`
- `apps/web/src/schem/SchemView.tsx`
- `apps/web/src/schem/ShotGallery.tsx`
- `apps/web/src/thumbnail/Thumb.tsx`
- `apps/web/src/thumbnail/glShot.ts`
- `apps/web/src/thumbnail/iso.ts`
- `apps/web/src/thumbnail/views.ts`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/faces.ts`
- `apps/web/src/viewer/marks.ts`
- `apps/web/src/viewer/sceneController.ts`
- `apps/web/src/viewer/types.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/ViewerView.tsx`
- `apps/web/src/views/library/BuildingDetail.tsx`
- `apps/web/src/views/library/EnsemblesPage.tsx`
- `apps/web/src/views/library/GeneratorsPage.tsx`
- `apps/web/src/views/project/BuildTab.tsx`
- `apps/web/src/views/project/EditorTab.tsx`
- `docs/BLOCKS.md`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BLOCK_MODELS.md`
- `docs/architecture/DECISIONS.md`
- `docs/architecture/LITEMATIC.md`
- `docs/architecture/SCHEM_IMPORT.md`
- `docs/architecture/VIEWER.md`
- `packages/domain/src/build/sets/wohnen.ts`
- `packages/formats/src/litematic.ts`
- `packages/formats/src/schem.ts`
- `packages/voxel/src/blockRegistry.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/states.ts`
- `scripts/gen_block_data.py`
- `tests/blocks.test.mjs`
- `tests/e2e/textures.e2e.mjs`
- `tests/helpers/minipack.mjs`
- `tests/schem.test.mjs`
- `tests/stability.test.mjs`
- `tests/states.test.mjs`
- `tests/viewer.test.mjs`

## 2026-11-01T13:15:45.514Z · progress

**Aufgaben:** MAP-01

Weltkarte #/karte umgesetzt: Weltlage je Projekt (world.set, Sicherung), buildWorldMap mit Fortschritt je Zelle und voxelgenauen Überschneidungen, Draufsicht mit Chunkraster, 3D-Freiflug/Rundflug, Platzierungsvorschlag, Live-Karten-Verknüpfung über livemap.ts. 8 Node-Tests, Browser 1400/390 px bestanden; Geräte-, Spiel- und Kartenserverabnahme offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02. |

**Geänderte Dateien:**

- `README.md`
- `apps/web/src/app/router.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/map.css`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/types.ts`
- `apps/web/src/views/map/LiveMapPanel.tsx`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/PlacementForm.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveMapConfig.ts`
- `apps/web/src/views/map/map.worker.ts`
- `apps/web/src/views/map/transport.ts`
- `docs/BLOCKS.md`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/WORLDMAP.md`
- `packages/domain/src/backup.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/project.ts`
- `packages/domain/src/types.ts`
- `packages/domain/src/worldmap.ts`
- `tests/e2e/worldmap.e2e.mjs`
- `tests/worldmap.test.mjs`

## 2026-11-01T13:26:19.608Z · progress

**Aufgaben:** LIB-04

Gebäudebibliothek v3: 12 neue Sets, 159 neue Gebäude (336 gesamt), 20 Materialvarianten, 7 Ensembles, neue Facetten; alle Gebäude im B7-Schema drehbar und spiegelbar. Redstone-Bauten nicht im Spiel abgenommen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen. |

**Geänderte Dateien:**

- `README.md`
- `apps/web/src/colors.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/CATALOG.md`
- `packages/domain/src/build/furnish.ts`
- `packages/domain/src/build/sets/dimensionen.ts`
- `packages/domain/src/build/sets/epochen.ts`
- `packages/domain/src/build/sets/fahrzeuge.ts`
- `packages/domain/src/build/sets/fantasy.ts`
- `packages/domain/src/build/sets/garten.ts`
- `packages/domain/src/build/sets/hof.ts`
- `packages/domain/src/build/sets/index.ts`
- `packages/domain/src/build/sets/interieur.ts`
- `packages/domain/src/build/sets/kueste.ts`
- `packages/domain/src/build/sets/natur.ts`
- `packages/domain/src/build/sets/stadt.ts`
- `packages/domain/src/build/sets/technik.ts`
- `packages/domain/src/build/sets/untergrund.ts`
- `packages/domain/src/build/sets/varianten.ts`
- `packages/domain/src/catalog.ts`
- `packages/domain/src/ensembles.ts`
- `packages/domain/src/materials.ts`
- `packages/domain/src/recipes.ts`
- `tests/asset-seeding.test.mjs`

## 2026-11-01T13:30:13.842Z · progress

**Aufgaben:** LIB-02, LIB-03

Eigene Sammlungen (Ordner, Kategorien, Katalogfilter, festgehaltene Versionen) und Vorlagen (Ensemble-/Generatorvorlagen, Verlauf, Wiederherstellen, Projektübernahme als Kopie); IndexedDB v3, Sicherung Format 2. Node- und Chromium-Tests; keine Echtgeräteabnahme.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Rückmeldung zur Bedienung der Sammlungen einholen. |
| LIB-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen. |

**Geänderte Dateien:**

- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/app/router.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/library/BuildingDetail.tsx`
- `apps/web/src/views/library/CollectionPicker.tsx`
- `apps/web/src/views/library/CollectionsPage.tsx`
- `apps/web/src/views/library/EnsemblesPage.tsx`
- `apps/web/src/views/library/GeneratorsPage.tsx`
- `apps/web/src/views/library/TemplatesPage.tsx`
- `apps/web/src/views/library/collections.css`
- `apps/web/src/views/library/templateWorld.ts`
- `apps/web/src/views/library/urlState.ts`
- `apps/web/src/views/library/userLibrary.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/COLLECTIONS.md`
- `docs/architecture/PERSISTENCE.md`
- `packages/application/src/assetConcurrency.ts`
- `packages/application/src/memoryRepository.ts`
- `packages/application/src/repository.ts`
- `packages/domain/src/backup.ts`
- `packages/domain/src/collections.ts`
- `packages/domain/src/index.ts`
- `tests/collections.test.mjs`
- `tests/e2e/asset-concurrency.e2e.mjs`
- `tests/e2e/collections.e2e.mjs`
- `tests/e2e/generators.e2e.mjs`

## 2026-11-01T13:31:11.269Z · progress

**Aufgaben:** UI-02

Rebase auf MAP-01 und LIB-02/03: Weltkarte in der Navigationsliste, Kopfzeile verdichtet sich stufenweise (Test 1920–761 px), klebende Spalten unter der Kopfzeile.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| UI-02 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Echte Geräteprüfung (Safari/iPhone, Touch) in QA-02; weitere Hauptbereiche (z. B. Karte MAP-01) als Eintrag in nav.ts anhängen. |

**Geänderte Dateien:**

- `apps/web/src/app/CommandPalette.tsx`
- `apps/web/src/app/Shell.tsx`
- `apps/web/src/app/icons.tsx`
- `apps/web/src/app/nav.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/shell.css`
- `apps/web/src/style.css`
- `apps/web/src/views/project/ProjectView.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/UI.md`
- `tests/e2e/shell.e2e.mjs`

## 2026-11-01T13:33:15.064Z · progress

**Aufgaben:** GAME-02

Fabric-Adapter 26.3 kompiliert (Klammerfehler, displayClientMessage→sendSystemMessage/sendOverlayMessage), echter 26.3-Client-Spieltest per Fabric Client Game Test (Chatbefehle, anker hier, Aufnahme, Website-Vergleich 146/148 mit genau 1 falschen und 1 fehlenden Block) bestanden, ebenso als Produktionsstart mit allen 21 Mods aus Philipps Modpack; .jar 0.1.0 und Anleitung in Projektdateien. Offen: Mehrspieler-Abnahme auf server.lmnt-gaming.net durch Philipp.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Philipp testet die .jar aus /mnt/project-files/mod/ auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md). |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/MOD_BRIDGE.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/fabric-26.3/build.gradle`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/resources/fabric.mod.json`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/McCompat.java`
- `scripts/bridge_crosscheck.mjs`
- `scripts/bridge_gametest.mjs`
- `scripts/test_bridge_ingame.sh`
- `tests/roadmap.test.mjs`

## 2026-11-01T13:36:58.036Z · progress

**Aufgaben:** LIB-04

Abschlussprüfung LIB-04: npm run check grün (399 Node-Tests), E2E grün; Bauwelt-Zählungen im UI-Abnahmetest an den Katalog v3 angepasst.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen. |

**Geänderte Dateien:**

- `README.md`
- `apps/web/src/colors.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/CATALOG.md`
- `packages/domain/src/build/furnish.ts`
- `packages/domain/src/build/sets/dimensionen.ts`
- `packages/domain/src/build/sets/epochen.ts`
- `packages/domain/src/build/sets/fahrzeuge.ts`
- `packages/domain/src/build/sets/fantasy.ts`
- `packages/domain/src/build/sets/garten.ts`
- `packages/domain/src/build/sets/hof.ts`
- `packages/domain/src/build/sets/index.ts`
- `packages/domain/src/build/sets/interieur.ts`
- `packages/domain/src/build/sets/kueste.ts`
- `packages/domain/src/build/sets/natur.ts`
- `packages/domain/src/build/sets/stadt.ts`
- `packages/domain/src/build/sets/technik.ts`
- `packages/domain/src/build/sets/untergrund.ts`
- `packages/domain/src/build/sets/varianten.ts`
- `packages/domain/src/catalog.ts`
- `packages/domain/src/ensembles.ts`
- `packages/domain/src/materials.ts`
- `packages/domain/src/recipes.ts`
- `tests/asset-seeding.test.mjs`
- `tests/e2e/ui-acceptance.e2e.mjs`

## 2026-11-01T14:08:37.152Z · progress

**Aufgaben:** GEN-02

GEN-02 übernommen: Claude-Thread „Neue Gebäudegeneratoren ergänzen“, Teilschritte für Treppenhaus, Kirche, Hafen, weitere Generatoren und Prüfung festgelegt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GEN-02 | 🚧 In Arbeit | 0/5 | Generatorspezifikation und Umsetzung Treppenhaus, Kirche, Hafen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`

## 2026-11-01T14:10:49.361Z · progress

**Aufgaben:** WORLD-IMPORT-01

WORLD-IMPORT-01 übernommen: Dateiumfang und Abstimmung in COMMUNICATION; noch keine Funktion.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| WORLD-IMPORT-01 | 🚧 In Arbeit | 0/2 | Konsistentes Sicherungsformat und Bereichsauswahl festlegen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`

## 2026-11-01T14:16:52.468Z · progress

**Aufgaben:** GAME-02

Mod-Download auf der Website: #/mod mit Auswahl von Minecraft-Version, Loader und Mod-Version, .jar 0.1.0 in downloads/mod (Pages aus main), releases.json mit Größe/SHA-256/Quellcommit/Prüfstand, release_mod.mjs für künftige Builds; Node- und Chromium-Tests (Desktop/Handy) bestanden.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp testet die .jar aus /mnt/project-files/mod/ auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md). |

**Geänderte Dateien:**

- `apps/web/src/app/CommandPalette.tsx`
- `apps/web/src/app/Shell.tsx`
- `apps/web/src/app/nav.ts`
- `apps/web/src/app/router.ts`
- `apps/web/src/catalog.css`
- `apps/web/src/main.tsx`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/mod/releases.ts`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/MOD_BRIDGE.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.1.0.jar`
- `mods/bauplaner-bridge/README.md`
- `scripts/release_mod.mjs`
- `tests/e2e/mod-download.e2e.mjs`
- `tests/mod-releases.test.mjs`
- `tests/router.test.mjs`

## 2026-11-01T14:29:20.816Z · progress

**Aufgaben:** EDIT-01, EDIT-02

Blockeditor #/werkstatt und Projekt-Reiter „Blöcke“: alle 26.3-Blöcke mit Zuständen, invertierbare Werkzeuge (Stift, Quader/Hohlformen, Kugel, Zylinder, Linie, Füllen, Ersetzen, Drehen, Ablage), Speichern nur als neue Version, Projektzuordnung über exakte Umkehrung der Instanztransformation in einem Rückgängig-Schritt. Mehrfachauswahl mit Hülle, Freiraumzonen und atomaren Gruppenoperationen. 11 Node-Tests, 4 Chromium-Fälle; Spiel-, Geräte- und Nicht-Chromium-Prüfung offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| EDIT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Geräteprüfung (QA-02); Gruppenziehen direkt im 3D-Bild als Folgeschritt. |
| EDIT-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Picking an 3D-Blockflächen; Registerlücken mit PROFILE-01-Serverreport schließen; Spielprüfung. |

**Geänderte Dateien:**

- `apps/web/src/app/CommandPalette.tsx`
- `apps/web/src/app/icons.tsx`
- `apps/web/src/app/router.ts`
- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/editor/BlockPalette.tsx`
- `apps/web/src/editor/LayerGrid.tsx`
- `apps/web/src/editor/WorkshopPage.tsx`
- `apps/web/src/editor/editor.css`
- `apps/web/src/editor/useDraft.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/style.css`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/library/BuildingDetail.tsx`
- `apps/web/src/views/project/BlocksTab.tsx`
- `apps/web/src/views/project/EditorTab.tsx`
- `apps/web/src/views/project/selection/GroupPanel.tsx`
- `apps/web/src/views/project/tabs.ts`
- `docs/BLOCKS.md`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BLOCK_EDITOR.md`
- `packages/domain/src/editor/blocks.ts`
- `packages/domain/src/editor/commit.ts`
- `packages/domain/src/editor/draft.ts`
- `packages/domain/src/editor/index.ts`
- `packages/domain/src/editor/tools.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/project.ts`
- `packages/domain/src/types.ts`
- `tests/e2e/editor.e2e.mjs`
- `tests/editor.test.mjs`

## 2026-11-01T14:48:06.970Z · progress

**Aufgaben:** GEN-02

GEN-02: Generatoren Treppenhaus, Kirche, Hafen, Torhaus, Windmühle, Brunnen; Anlage Dorfplatz, Burganlage mit Torhaus; Treppen-Eckformen nach Spielregel (Haus/Turm/Dach v2). npm run check grün (425), Generator-E2E grün; shell-Schnellsuche-E2E scheitert bereits auf main. Nicht im Spiel abgenommen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GEN-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Generierte Bauten (v. a. Treppenhaus, Torhaus-Wehrgang, Hafen) im Spiel abnehmen; Treppenhaus-Anbau an Haus als Anlage erwägen. |

**Geänderte Dateien:**

- `README.md`
- `apps/web/src/views/library/GeneratorsPage.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/GENERATORS.md`
- `packages/domain/src/build/plot.ts`
- `packages/domain/src/generators/bridge.ts`
- `packages/domain/src/generators/church.ts`
- `packages/domain/src/generators/compound.ts`
- `packages/domain/src/generators/gatehouse.ts`
- `packages/domain/src/generators/harbor.ts`
- `packages/domain/src/generators/house.ts`
- `packages/domain/src/generators/index.ts`
- `packages/domain/src/generators/roof.ts`
- `packages/domain/src/generators/roofs.ts`
- `packages/domain/src/generators/stairwell.ts`
- `packages/domain/src/generators/tower.ts`
- `packages/domain/src/generators/types.ts`
- `packages/domain/src/generators/wall.ts`
- `packages/domain/src/generators/well.ts`
- `packages/domain/src/generators/windmill.ts`
- `tests/e2e/generators.e2e.mjs`
- `tests/generators.test.mjs`

## 2026-11-01T14:53:42.132Z · progress

**Aufgaben:** BUILD-05

Bauwelt-Anlagen: 11 kuratierte Anlagen mit Bereichen, festen Versionen, Ensembles und Hauptweg; Lageplan, blockgenaue Konfliktvorschau, ausdrückliche Übernahme mit Bauabschnitten. Gelände und Echtgeräte ungeprüft.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BUILD-05 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Gelände-/Hanglagen und Türausrichtung zum Weg als eigene Folgeaufgabe; Echtgeräteabnahme mit QA-02. |

**Geänderte Dateien:**

- `apps/web/src/app/router.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/library/AnlagenPage.tsx`
- `apps/web/src/views/library/BuildThemesPage.tsx`
- `apps/web/src/views/library/anlagen.css`
- `apps/web/src/views/library/buildThemes.css`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/ANLAGEN.md`
- `docs/architecture/BUILD_THEMES.md`
- `packages/domain/src/anlagen.ts`
- `packages/domain/src/index.ts`
- `tests/anlagen.test.mjs`
- `tests/e2e/anlagen.e2e.mjs`

## 2026-11-01T14:55:14.685Z · progress

**Aufgaben:** BUILD-05

Nachweis nach Rebase auf EDIT-02/GEN-02 aktualisiert.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BUILD-05 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Gelände-/Hanglagen und Türausrichtung zum Weg als eigene Folgeaufgabe; Echtgeräteabnahme mit QA-02. |

**Geänderte Dateien:**

- `apps/web/src/app/router.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/library/AnlagenPage.tsx`
- `apps/web/src/views/library/BuildThemesPage.tsx`
- `apps/web/src/views/library/anlagen.css`
- `apps/web/src/views/library/buildThemes.css`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/ANLAGEN.md`
- `docs/architecture/BUILD_THEMES.md`
- `packages/domain/src/anlagen.ts`
- `packages/domain/src/index.ts`
- `tests/anlagen.test.mjs`
- `tests/e2e/anlagen.e2e.mjs`

## 2026-11-01T15:00:58.460Z · progress

**Aufgaben:** GAME-05

GAME-05 übernommen: gemeinsame Befehlslogik BridgeSession/BridgeHost im Bridge-Kern (mit Paper-Thread abgestimmt, JUnit-Tests), Schalter für NeoForge/Forge in settings.gradle.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-05 | 🚧 In Arbeit | 0/4 | BridgeSession im Kern, dann NeoForge-Adapter. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `mods/bauplaner-bridge/core/src/main/java/io/github/freadeax/bauplaner/bridge/session/BridgeHost.java`
- `mods/bauplaner-bridge/core/src/main/java/io/github/freadeax/bauplaner/bridge/session/BridgeSession.java`
- `mods/bauplaner-bridge/core/src/test/java/io/github/freadeax/bauplaner/bridge/BridgeSessionTest.java`
- `mods/bauplaner-bridge/settings.gradle`

## 2026-11-01T15:10:37.702Z · progress

**Aufgaben:** WORLD-IMPORT-01

Weltimport #/welt und Projektreiter Gelände: Regionsdateien 1.16–26.3 (zlib/GZip/LZ4/ohne), 26.x-Standardzustände aus offiziellem Bericht, Übernahme als Bauteil, Geländeprüfung. Geprüft mit unabhängiger Fixture, echten 26.3-Serverwelten und Chromium 1400/390 px; Abnahme an Philipps eigener Welt offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| WORLD-IMPORT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Mit einer Kopie von Philipps eigener 26.3-Welt (Modpack) einen Ausschnitt übernehmen und ein platziertes Projekt prüfen. |

**Geänderte Dateien:**

- `apps/web/src/app/icons.tsx`
- `apps/web/src/app/nav.ts`
- `apps/web/src/app/router.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/shell.css`
- `apps/web/src/views/project/TerrainTab.tsx`
- `apps/web/src/views/project/tabs.ts`
- `apps/web/src/views/world/RegionPicker.tsx`
- `apps/web/src/views/world/SurfaceCanvas.tsx`
- `apps/web/src/views/world/WorldImportView.tsx`
- `apps/web/src/views/world/protocol.ts`
- `apps/web/src/views/world/world.css`
- `apps/web/src/views/world/world.worker.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/WORLD_IMPORT.md`
- `docs/roadmap.json`
- `packages/domain/src/index.ts`
- `packages/domain/src/terrain.ts`
- `packages/domain/src/types.ts`
- `packages/formats/src/anvil.ts`
- `packages/formats/src/defaultStates.ts`
- `packages/formats/src/index.ts`
- `packages/formats/src/lz4.ts`
- `packages/formats/src/nbt.ts`
- `packages/formats/src/worldExcerpt.ts`
- `scripts/gen_default_states.mjs`
- `scripts/make_region_fixture.py`
- `scripts/test_world_import_real.sh`
- `tests/anvil.test.mjs`
- `tests/e2e/shell.e2e.mjs`
- `tests/e2e/world-import.e2e.mjs`
- `tests/terrain.test.mjs`

## 2026-11-01T15:25:25.019Z · progress

**Aufgaben:** BACKUP-02

Sicherungsstand (Belege, Vergleich, Erinnerung, Prüfen) und Abschnittsstände (einfrieren, Abweichungen, Zurücksetzen, Kopie) umgesetzt; Node- und Chromium-Tests, keine Echtgeräteabnahme.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BACKUP-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen. |

**Geänderte Dateien:**

- `apps/web/src/app/backupStatus.ts`
- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/backup.css`
- `apps/web/src/views/BackupPanel.tsx`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/SiteTab.tsx`
- `apps/web/src/views/project/SnapshotsPanel.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BACKUPS.md`
- `docs/architecture/PERSISTENCE.md`
- `docs/architecture/SITE.md`
- `packages/application/src/memoryRepository.ts`
- `packages/application/src/repository.ts`
- `packages/domain/src/backupStatus.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/sectionMembership.ts`
- `packages/domain/src/sectionSnapshots.ts`
- `packages/domain/src/site.ts`
- `tests/backup-reminder.test.mjs`
- `tests/e2e/backup-reminder.e2e.mjs`

## 2026-11-01T17:44:58.271Z · progress

**Aufgaben:** BACKUP-02

Prüfprotokoll nach Rebase auf d2f7af8 nachgetragen; Integration auf main und Pages-Veröffentlichung.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BACKUP-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen. |

**Geänderte Dateien:**

- `docs/TESTING.md`

## 2026-11-01T17:45:29.973Z · progress

**Aufgaben:** GAME-04, GAME-06

Paper-Plugin (eine .jar für Paper 1.18.2 bis 26.3): Plan, Anker je Plan, Aufnahme der Serverwelt mit Nachladen vorhandener Chunks ohne Geländeerzeugung, Rechte, Konsole; echter Servertest in fünf Versionen bestanden. Signierte Webhooks als neue Aufgabe GAME-06 ausgelagert.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-04 | 🚧 In Arbeit | 2/4 | Jar auf #/mod anbieten, dann Abnahme auf Philipps Paper-Server. |
| GAME-06 | ⏳ Offen | 0/1 | Nach TEAM-02 spezifizieren. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/releases.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/MOD_BRIDGE.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/paper/build.gradle`
- `mods/bauplaner-bridge/paper/gradle.properties`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/PaperCompat.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerScan.java`
- `mods/bauplaner-bridge/paper/src/main/resources/config.yml`
- `mods/bauplaner-bridge/paper/src/main/resources/plugin.yml`
- `mods/bauplaner-bridge/settings.gradle`
- `scripts/bridge_gametest.mjs`
- `scripts/bridge_papertest.mjs`
- `scripts/release_mod.mjs`
- `scripts/test_bridge_paper.sh`
- `tests/e2e/mod-download.e2e.mjs`
- `tests/mod-releases.test.mjs`

## 2026-11-01T17:45:30.290Z · progress

**Aufgaben:** GAME-04

Paper-Plugin 0.1.0 auf #/mod: eine .jar für Minecraft 1.18.2, 1.20.6, 1.21.4, 1.21.11 und 26.3 (Feld minecraftVersions), Serveranleitung auf der Seite.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-04 | 🚧 In Arbeit | 3/4 | Abnahme auf Philipps eigenem Paper-Server (GAME-04-S04). |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-paper-0.1.0.jar`

## 2026-11-01T17:47:04.911Z · progress

**Aufgaben:** GAME-04

Quellcommit der Paper-Jar nach Rebase auf den Commit auf main korrigiert.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-04 | 🚧 In Arbeit | 3/4 | Abnahme auf Philipps eigenem Paper-Server (GAME-04-S04). |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`

## 2026-11-01T18:52:18.883Z · progress

**Aufgaben:** QA-03

Wacklige E2E-Tests stabilisiert: Strg+K vor dem Datenladen gemerkt, Systemcheck wartet auf Manifest, Ebenenraster-Geometrie nach Einschwingen, Pinselstrich per Ref, 3D-Editor bleibt während Neuberechnung stehen, Suchknopf mit festem Namen. Gesamtsuite 3× 84/84 in Chromium; keine Testabschwächung.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-03 | ✅ Im beschriebenen Umfang geprüft | 7/7 | Bei neuen Ausfällen zuerst nach Lesen vor dem Laden (Manifest, IndexedDB, ResizeObserver, Worker-Neuberechnung) suchen. |

**Geänderte Dateien:**

- `apps/web/src/app/CommandPalette.tsx`
- `apps/web/src/app/Shell.tsx`
- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/viewer/sceneController.ts`
- `apps/web/src/views/project/EditorTab.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `tests/e2e/editor.e2e.mjs`
- `tests/e2e/snap.e2e.mjs`
- `tests/e2e/stability.e2e.mjs`

## 2026-11-01T19:07:46.818Z · progress

**Aufgaben:** GAME-05

NeoForge-Brücke 26.3 gebaut, im echten Client geprüft und auf #/mod angeboten; Forge-Brücke 26.3 gebaut (Spielprüfung offen, kopfloser Client hängt im Ladebildschirm); gemeinsame client-26.3-Schicht und Spieltest. npm run check grün, E2E 82/84 (fremde Ausfälle).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-05 | 🧩 Implementiert · Abnahme offen | 3/4 | Forge-Spieltest: kopfloser Client bleibt im Ladebildschirm stehen; auf einem Rechner mit Bildschirm (scripts/test_bridge_ingame_forge.sh forge) oder durch Philipp prüfen, dann Forge-Jar bereitstellen. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/TESTING.md`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.1.0.jar`

## 2026-11-01T19:17:43.235Z · progress

**Aufgaben:** GAME-05

Nach Rebase auf QA-03: npm run check grün, E2E 84/84.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-05 | 🧩 Implementiert · Abnahme offen | 3/4 | Forge-Spieltest: kopfloser Client bleibt im Ladebildschirm stehen; auf einem Rechner mit Bildschirm (scripts/test_bridge_ingame_forge.sh forge) oder durch Philipp prüfen, dann Forge-Jar bereitstellen. |

**Geänderte Dateien:**

- `docs/TESTING.md`

## 2026-11-01T19:18:40.607Z · progress

**Aufgaben:** GAME-05

Dateizuordnung der GAME-05-Integration (742fe03..10d71cc) nachgetragen: NeoForge-/Forge-Adapter, client-26.3, Spieltest, Download-Seite, Dokumentation.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-05 | 🧩 Implementiert · Abnahme offen | 3/4 | Forge-Spieltest: kopfloser Client bleibt im Ladebildschirm stehen; auf einem Rechner mit Bildschirm (scripts/test_bridge_ingame_forge.sh forge) oder durch Philipp prüfen, dann Forge-Jar bereitstellen. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/mod/releases.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/MOD_BRIDGE.md`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.1.0.jar`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/client-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/ClientScenario.java`
- `mods/bauplaner-bridge/client-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/client/BridgeCommands.java`
- `mods/bauplaner-bridge/client-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/client/ClientHost.java`
- `mods/bauplaner-bridge/forge-26.3/build.gradle`
- `mods/bauplaner-bridge/forge-26.3/gradle.properties`
- `mods/bauplaner-bridge/forge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/ForgeGameTest.java`
- `mods/bauplaner-bridge/forge-26.3/src/gametest/resources/META-INF/mods.toml`
- `mods/bauplaner-bridge/forge-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/forge/BridgeForge.java`
- `mods/bauplaner-bridge/forge-26.3/src/main/templates/META-INF/mods.toml`
- `mods/bauplaner-bridge/forge-26.3/src/main/templates/pack.mcmeta`
- `mods/bauplaner-bridge/neoforge-26.3/build.gradle`
- `mods/bauplaner-bridge/neoforge-26.3/gradle.properties`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/NeoForgeGameTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/resources/META-INF/neoforge.mods.toml`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/neoforge/BridgeNeoForge.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/templates/META-INF/neoforge.mods.toml`
- `mods/bauplaner-bridge/settings.gradle`
- `scripts/release_mod.mjs`
- `scripts/test_bridge_ingame_forge.sh`
- `tests/e2e/mod-download.e2e.mjs`

## 2026-11-02T05:07:08.400Z · progress

**Aufgaben:** BUILD-06

BUILD-06 angemeldet: Aufgabe, Dateiumfang und Teilschritte; noch keine Implementierung.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BUILD-06 | 🚧 In Arbeit | 0/5 | Domäne buildRun.ts mit Tests, dann Oberfläche im Bauen-Tab. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`

## 2026-11-02T05:07:24.985Z · progress

**Aufgaben:** UPDATE-01

UPDATE-01 übernommen: Anmeldung und Dateiumfang in COMMUNICATION

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| UPDATE-01 | 🚧 In Arbeit | 0/2 | Updateplan mit Geometrie/Material/Anschluss-/Aufgabendiff erstellen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`

## 2026-11-02T05:30:31.682Z · progress

**Aufgaben:** EDIT-03

Werkstatt vertieft: Muster-Pinsel, Bogen/Pyramide/Kegel/Mauerzug, Schablonen, Ebenenübersicht, 3D-Schnitt, Tastenkürzel. npm run check grün (476/477, 1 übersprungen), E2E 86/86.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| EDIT-03 | 🧩 Implementiert · Abnahme offen | 5/5 | Picking an 3D-Blockflächen; Spielprüfung der Schablonen-Zustände (Tür, Treppe, Laterne). |

**Geänderte Dateien:**

- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/editor/LayerGrid.tsx`
- `apps/web/src/editor/PatternPanel.tsx`
- `apps/web/src/editor/StencilPanel.tsx`
- `apps/web/src/editor/editor.css`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BLOCK_EDITOR.md`
- `packages/domain/src/editor/index.ts`
- `packages/domain/src/editor/patterns.ts`
- `packages/domain/src/editor/shapes.ts`
- `packages/domain/src/editor/stencils.ts`
- `tests/e2e/editor.e2e.mjs`
- `tests/e2e/workshop-tools.e2e.mjs`
- `tests/editor-patterns.test.mjs`

## 2026-11-02T05:34:31.591Z · progress

**Aufgaben:** UPDATE-01

UPDATE-01 umgesetzt: Projektreiter Updates mit Folgenplan, Übernahme als ein Rückgängig-Schritt, lokale Patches, Einfrieren/Zurückkehren, Katalogzustellung als neue Version; neueste Version ohne lokale Projektänderungen. check grün, E2E 86/86; keine Echtgeräte.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| UPDATE-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Echtgeräteabnahme (QA-02); Teamreihenfolge der Updateoperationen in TEAM-02. |

**Geänderte Dateien:**

- `apps/web/src/app/icons.tsx`
- `apps/web/src/app/repository.ts`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/project/EditorTab.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/SnapPanel.tsx`
- `apps/web/src/views/project/UpdatesTab.tsx`
- `apps/web/src/views/project/tabs.ts`
- `apps/web/src/views/project/updates.css`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/UPDATES.md`
- `packages/application/src/catalogSync.ts`
- `packages/application/src/index.ts`
- `packages/domain/src/anlagen.ts`
- `packages/domain/src/backup.ts`
- `packages/domain/src/catalog.ts`
- `packages/domain/src/editor/commit.ts`
- `packages/domain/src/ensembles.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/project.ts`
- `packages/domain/src/types.ts`
- `packages/domain/src/updateState.ts`
- `packages/domain/src/updates.ts`
- `tests/e2e/updates.e2e.mjs`
- `tests/updates.test.mjs`

## 2026-11-02T05:45:11.173Z · progress

**Aufgaben:** GAME-07

Mod 2.0 Stufe 1: Hologramm, Live-Abgleich, Fehlerfinder, Planmenü; Fabric 0.2.0 auf #/mod, im echten Client und mit Philipps Modpack geprüft

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 4/6 | Philipp testet 0.2.0 auf server.lmnt-gaming.net (Anleitung /mnt/project-files/mod/ANLEITUNG_HOLOGRAMM.md); danach Stufe 3 (texturierte Geisterblöcke, Materialliste im Spiel). |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.2.0.jar`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/build.gradle`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/Hologram.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramCommands.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramHud.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramKeys.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramRenderer.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/McCompat.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/PlanScreen.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/resources/assets/bauplaner_bridge/lang/de_de.json`
- `mods/bauplaner-bridge/fabric-26.3/src/main/resources/assets/bauplaner_bridge/lang/en_us.json`
- `mods/bauplaner-bridge/mod-core/build.gradle`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/BlockRules.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/BlockState.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/LiveCheck.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Placement.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlacementStore.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlanModel.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java`
- `mods/bauplaner-bridge/settings.gradle`
- `scripts/bridge_gametest.mjs`
- `scripts/test_bridge_ingame.sh`
- `tests/e2e/mod-download.e2e.mjs`

## 2026-11-02T05:47:56.343Z · progress

**Aufgaben:** BUILD-06

BUILD-06 umgesetzt: Schichtführung mit Anker-/Weltkoordinaten, Anker aus Weltlage oder Spielaufnahme, Bautage nach Block-/Kistenbudget, Shulker-Packliste je Bautag/Abschnitt, Tagesziel, Bauzettel (Druck/Text), Handy-Baumodus, Spielstatus und bestätigte Schritte je Tag, Nacharbeitsliste. npm run check grün (476/477, 1 übersprungen), test:e2e 85/85. Grenzen: keine echten Geräte/Drucker, kein Client-Spieltest.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BUILD-06 | 🧩 Implementiert · Abnahme offen | 5/5 | Echtgeräte- und Druckerabnahme mit QA-02; Philipps Spieltest mit Mod-Aufnahme (WorldAnchor) auf seinem Server. |

**Geänderte Dateien:**

- `apps/web/src/buildrun.css`
- `apps/web/src/views/project/BuildTab.tsx`
- `apps/web/src/views/project/buildrun/AnchorBar.tsx`
- `apps/web/src/views/project/buildrun/BuildFocus.tsx`
- `apps/web/src/views/project/buildrun/PackList.tsx`
- `apps/web/src/views/project/buildrun/PrintSheet.tsx`
- `apps/web/src/views/project/buildrun/SessionsView.tsx`
- `apps/web/src/views/project/buildrun/StepRows.tsx`
- `apps/web/src/views/project/buildrun/common.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/BUILD_RUN.md`
- `docs/architecture/GUIDE.md`
- `docs/architecture/SITE.md`
- `packages/domain/src/buildRun.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/site.ts`
- `tests/build-run.test.mjs`
- `tests/e2e/build-run.e2e.mjs`

## 2026-11-02T06:01:12.819Z · progress

**Aufgaben:** TERRAIN-01

Geländeaufnahmen für Weltkarte und Anlagen: Höhenkarte als Original, Bauplatz aus dem Weltimport, Gelände in der Karte mit Erdarbeiten-Schätzung, Anlagen in Terrassen mit flachstem Platz, Türen automatisch zum Weg.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit eigener Welt (S05); danach Weg mit Stufen/Kurven und Stützmauern als Blöcke als eigene Folgeaufgabe. |

**Geänderte Dateien:**

- `apps/web/src/map.css`
- `apps/web/src/views/library/AnlagenPage.tsx`
- `apps/web/src/views/library/anlagen.css`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/terrainLayer.ts`
- `apps/web/src/views/project/TerrainSurveyPanel.tsx`
- `apps/web/src/views/project/TerrainTab.tsx`
- `apps/web/src/views/world/WorldImportView.tsx`
- `apps/web/src/views/world/protocol.ts`
- `apps/web/src/views/world/surveys.ts`
- `apps/web/src/views/world/world.css`
- `apps/web/src/views/world/world.worker.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/ANLAGEN.md`
- `docs/architecture/TERRAIN.md`
- `docs/architecture/WORLDMAP.md`
- `docs/architecture/WORLD_IMPORT.md`
- `packages/domain/src/anlagen.ts`
- `packages/domain/src/anlagenTerrain.ts`
- `packages/domain/src/backup.ts`
- `packages/domain/src/entrance.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/integrity.ts`
- `packages/domain/src/project.ts`
- `packages/domain/src/terrain.ts`
- `packages/domain/src/terrainSurvey.ts`
- `packages/domain/src/types.ts`
- `packages/formats/src/index.ts`
- `packages/formats/src/worldExcerpt.ts`
- `scripts/make_terrain_fixture.py`
- `tests/e2e/terrain.e2e.mjs`
- `tests/terrain-survey.test.mjs`

## 2026-11-02T06:32:41.549Z · progress

**Aufgaben:** GAME-07

Download-Prüfung: Website prüft .jar vor dem Speichern (Größe, SHA-256, EOCD, Metadaten), Tests für jede .jar, release_mod bricht bei fehlerhafter .jar ab

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 4/6 | Philipp testet 0.2.0 auf server.lmnt-gaming.net (Anleitung /mnt/project-files/mod/ANLEITUNG_HOLOGRAMM.md); danach Stufe 3 (texturierte Geisterblöcke, Materialliste im Spiel). |

**Geänderte Dateien:**

- `apps/web/src/catalog.css`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/releases.ts`
- `docs/TESTING.md`
- `scripts/release_mod.mjs`
- `tests/e2e/mod-download.e2e.mjs`
- `tests/mod-releases.test.mjs`

## 2026-11-02T06:46:18.043Z · progress

**Aufgaben:** GAME-07

Stufe 2 (0.3.0): texturierte Geisterblöcke, Materialliste, Ebenenmodus; im echten Client und mit Philipps Modpack geprüft, Release auf #/mod

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 5/7 | Philipp testet 0.3.0 auf server.lmnt-gaming.net (Anleitung /mnt/project-files/mod/ANLEITUNG_HOLOGRAMM.md); danach Stufe 3. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.3.0.jar`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/GhostModels.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/Hologram.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramCommands.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramHud.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramKeys.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramRenderer.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/MaterialScreen.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/PlanScreen.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/resources/assets/bauplaner_bridge/lang/de_de.json`
- `mods/bauplaner-bridge/fabric-26.3/src/main/resources/assets/bauplaner_bridge/lang/en_us.json`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/LiveCheck.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Materials.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java`
- `scripts/bridge_gametest.mjs`

## 2026-11-02T07:00:21.077Z · progress

**Aufgaben:** FORMAT-02

Echte Litematic-Dateien: unkomprimiert/zlib, große Modelle bis 1 Mio. Blöcke, Aufschlüsselung im Import, Metadata-Vorbelegung, alte IDs chain/grass, Exportbox bis 16,7 Mio. Zellen; an fünf echten Dateien lokal geprüft, Export im Spiel offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| FORMAT-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Export im Spiel mit Litematica laden (Philipps PC, Fabric 26.3) – FORMAT-02-S02. |

**Geänderte Dateien:**

- `apps/web/src/app/importFile.ts`
- `apps/web/src/app/importLimits.ts`
- `apps/web/src/blockmodels/colors26.ts`
- `apps/web/src/import.worker.ts`
- `apps/web/src/style.css`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/ViewerView.tsx`
- `apps/web/src/views/library/LitematicRegions.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/LITEMATIC.md`
- `fixtures/litematic/README.md`
- `fixtures/litematic/realworld.nbt.hex`
- `packages/formats/src/index.ts`
- `packages/formats/src/litematic.ts`
- `packages/formats/src/litematicWrite.ts`
- `packages/formats/src/structure.ts`
- `scripts/gen_block_data.py`
- `scripts/make_litematic_fixture.py`
- `tests/blocks.test.mjs`
- `tests/e2e/litematic.e2e.mjs`
- `tests/litematic.test.mjs`

## 2026-11-02T08:13:54.837Z · progress

**Aufgaben:** GFX-01

Grafik vertieft: Minecraft-Licht (Leuchtwerte, Himmels-/Blocklicht, weiches Licht, Eckschatten), Lichtmodi Tag/Sonne mit Schatten/Nacht/Flach, Spawnprüfung, sortiertes Glas, 32³-Abschnitte mit Wiederverwendung. Node 517 (1 übersprungen), Chromium 95/95; echte GPUs/Firefox/Safari/Geräte offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GFX-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Prüfung auf echten Geräten und Browsern; danach Biomfarben und leuchtende Blockentities. |

**Geänderte Dateien:**

- `apps/web/src/blockmodels/blocks.css`
- `apps/web/src/blockmodels/graphics.ts`
- `apps/web/src/blockmodels/light.ts`
- `apps/web/src/blockmodels/mesh.ts`
- `apps/web/src/blockmodels/threeMesh.ts`
- `apps/web/src/thumbnail/Thumb.tsx`
- `apps/web/src/thumbnail/glShot.ts`
- `apps/web/src/viewer/GraphicsMenu.tsx`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/sceneController.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BLOCK_MODELS.md`
- `docs/architecture/GRAPHICS.md`
- `tests/e2e/graphics.e2e.mjs`
- `tests/graphics.test.mjs`

## 2026-11-02T08:26:29.438Z · progress

**Aufgaben:** BLOCK-01

Echte Blocklogik 26.3: Fakten aus dem Server, Verbindungen, Halt, Bauschritte, Material, Spielprüfung

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BLOCK-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme im Spiel; die gefundenen Katalogfehler (u. a. 109 Laternen ohne Halt, Leitern an Scheiben) in der Gebäudebibliothek beheben; PROFILE-01 kann die Berichtsfakten übernehmen. |

**Geänderte Dateien:**

- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/style.css`
- `apps/web/src/views/project/BuildTab.tsx`
- `apps/web/src/views/project/PlacementPanel.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/BLOCK_LOGIC.md`
- `fixtures/blocks/block-vectors-26.3.json`
- `packages/domain/src/editor/blocks.ts`
- `packages/domain/src/editor/index.ts`
- `packages/domain/src/editor/settle.ts`
- `packages/domain/src/guide.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/materials.ts`
- `packages/domain/src/placement.ts`
- `packages/voxel/src/blockFacts.ts`
- `packages/voxel/src/blocklogic/connect.ts`
- `packages/voxel/src/blocklogic/facts.ts`
- `packages/voxel/src/blocklogic/index.ts`
- `packages/voxel/src/blocklogic/support.ts`
- `packages/voxel/src/index.ts`
- `scripts/gen_block_facts.mjs`
- `scripts/probe/BlockFactsProbe.java`
- `tests/block-logic.test.mjs`
- `tests/e2e/block-logic.e2e.mjs`

## 2026-11-02T08:56:28.176Z · progress

**Aufgaben:** GAME-07

Stufe 3 (0.4.0): Platzierhilfe wie Easy Place, aber serverkonform (Vorhersage, Schutz vor falschem Block/falscher Ausrichtung, Block aus der Schnellleiste, Hinweis am Fadenkreuz, Abbauschutz); im echten Client und mit Philipps Modpack geprüft, Release auf #/mod

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 6/8 | Philipp testet 0.4.0 (Platzierhilfe) auf server.lmnt-gaming.net; danach Stufe 4. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.4.0.jar`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/Hologram.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramCommands.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramHud.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramKeys.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/PlacementAssist.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/PlanScreen.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/resources/assets/bauplaner_bridge/lang/de_de.json`
- `mods/bauplaner-bridge/fabric-26.3/src/main/resources/assets/bauplaner_bridge/lang/en_us.json`
- `mods/bauplaner-bridge/fabric-26.3/src/main/resources/fabric.mod.json`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlacementAdvice.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java`
- `scripts/bridge_gametest.mjs`

## 2026-11-02T09:08:13.761Z · progress

**Aufgaben:** ARCH-02

Planmodell: gemeinsamer Verweisgraph (Sicherung, Datencheck, Verwendet in), Blockzellen gepackt bp-cells-1 (Katalog 41× kleiner, Inhaltsadressen unverändert), IndexedDB v4, Sicherungsformat 3, Abschnittsstände in Projektsicherungen; 539 Node-/100 Browsertests, Abnahme mit echten Bestandsdaten offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| ARCH-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme der Migration mit echten Browserdaten (S05); danach kompakte Laufzeitform der Zellen als Folge von PERF-02. |

**Geänderte Dateien:**

- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/datamodel.css`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/SystemView.tsx`
- `apps/web/src/views/library/BuildingDetail.tsx`
- `apps/web/src/views/library/UsageSection.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/DOMAIN.md`
- `docs/architecture/MODULES.md`
- `docs/architecture/PERSISTENCE.md`
- `docs/architecture/PLAN_MODEL.md`
- `packages/domain/src/backup.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/integrity.ts`
- `packages/domain/src/planGraph.ts`
- `packages/domain/src/versionStorage.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/packedCells.ts`
- `tests/collections.test.mjs`
- `tests/e2e/asset-concurrency.e2e.mjs`
- `tests/e2e/collections.e2e.mjs`
- `tests/e2e/plan-model.e2e.mjs`
- `tests/e2e/stability.e2e.mjs`
- `tests/plan-model.test.mjs`

## 2026-11-02T09:21:57.765Z · progress

**Aufgaben:** GAME-07

Download-Seite #/mod: zuerst Client-Mod (für mein Spiel, vorausgewählt, Modrinth-Anleitung) oder Server-Plugin (Paper) wählen, damit das Plugin nicht im Spielprofil landet

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 6/8 | Philipp testet 0.4.0 (Platzierhilfe) auf server.lmnt-gaming.net; danach Stufe 4. |

**Geänderte Dateien:**

- `apps/web/src/catalog.css`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/releases.ts`
- `docs/TESTING.md`
- `tests/e2e/mod-download.e2e.mjs`

## 2026-11-02T09:23:43.965Z · progress

**Aufgaben:** MODEL-01

3D-Export OBJ/MTL-ZIP, GLB, STL, 3MF: Ansichtsmodell aus buildBlockMesh, wasserdichte Druckhülle (Feinheit 1/2/4, Füllen, Aushöhlen, Reparatur, Farben); Node 15/15, E2E 2/2, Gesamt-E2E 100/100. Offen: Fremdprogramme, Testdruck, Worker.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MODEL-01 | 🧩 Implementiert · Abnahme offen | 4/6 | Dateien in Blender und Slicern prüfen und ein Testdruck; danach Worker und Flächenzusammenfassung (S06). |

**Geänderte Dateien:**

- `apps/web/src/blockmodels/model.ts`
- `apps/web/src/blockmodels/shapes.ts`
- `apps/web/src/export3d/ModelExportPanel.tsx`
- `apps/web/src/export3d/build.ts`
- `apps/web/src/export3d/model3d.css`
- `apps/web/src/schem/SchemView.tsx`
- `apps/web/src/views/ViewerView.tsx`
- `apps/web/src/views/library/AnlagenPage.tsx`
- `apps/web/src/views/project/ExportTab.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/GRAPHICS.md`
- `docs/architecture/MODEL_EXPORT.md`
- `packages/formats/src/index.ts`
- `packages/formats/src/model3d.ts`
- `packages/formats/src/printGrid.ts`
- `packages/formats/src/zipWrite.ts`
- `tests/e2e/model3d.e2e.mjs`
- `tests/model3d.test.mjs`

## 2026-11-02T09:32:44.995Z · progress

**Aufgaben:** TERRAIN-02

Landschaft gestalten: Gelände formen, bemalen, Wasser, Wege, Bauplätze einebnen; geplantes Gelände in Weltkarte und Anlagen, Geländebauteil im Projekt; auf ARCH-02/MODEL-01 rebased

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-02 | 🧩 Implementiert · Abnahme offen | 4/6 | Abnahme mit eigener Welt (S05); danach Streu-Ebene mit EDIT-04 (S06). |

**Geänderte Dateien:**

- `apps/web/src/app/icons.tsx`
- `apps/web/src/views/library/AnlagenPage.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/project/LandscapeTab.tsx`
- `apps/web/src/views/project/landscape/DesignCanvas.tsx`
- `apps/web/src/views/project/landscape/landscape.css`
- `apps/web/src/views/project/tabs.ts`
- `apps/web/src/views/world/designs.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/LANDSCAPE.md`
- `docs/architecture/TERRAIN.md`
- `packages/domain/src/backup.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/integrity.ts`
- `packages/domain/src/planGraph.ts`
- `packages/domain/src/project.ts`
- `packages/domain/src/terrainDesign.ts`
- `packages/domain/src/types.ts`
- `tests/e2e/landscape.e2e.mjs`
- `tests/terrain-design.test.mjs`

## 2026-11-02T09:49:37.649Z · progress

**Aufgaben:** MAP-03, GAME-03

Menüpunkt „Spiel“ (#/mod) in der Hauptnavigation, Kopfzeile für sechs Bereiche, MAP-03 angemeldet und GAME-03 übernommen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-03 | 🚧 In Arbeit | 1/6 | Weltplan und Planungswerkzeuge umsetzen (S02/S03), danach Live-Verbindung (S04, zusammen mit GAME-03). |
| GAME-03 | 🚧 In Arbeit | 0/2 | LiveLink in mod-core (Loopback, Kopplungscode, Ursprungsprüfung) und Fabric 0.5.0. |

**Geänderte Dateien:**

- `apps/web/src/app/CommandPalette.tsx`
- `apps/web/src/app/icons.tsx`
- `apps/web/src/app/nav.ts`
- `apps/web/src/shell.css`
- `docs/COMMUNICATION.md`
- `tests/e2e/shell.e2e.mjs`

## 2026-11-02T10:07:03.926Z · progress

**Aufgaben:** EDIT-04

Kreativwerkzeuge aus dem Planer-Vergleich: Gap-Analyse, Symmetrie, Kurven, Natur-/Formwerkzeuge, Oberflächenmaske, Farbpaletten, Bild → Blöcke. Auf e003884 integriert; Node und Chromium grün (Zahlen in TESTING); Spielprüfung gespiegelter Zustände, Firefox/Safari, Geräte offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Spielprüfung gespiegelter Zustände; danach Gelände-Werkzeuge auf Projektgelände (eigener Thread) und Symmetrie/Kurven im Mod. |

**Geänderte Dateien:**

- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/editor/CreativePanel.tsx`
- `apps/web/src/editor/LayerGrid.tsx`
- `apps/web/src/editor/colorCandidates.ts`
- `apps/web/src/editor/editor.css`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/BLOCK_EDITOR.md`
- `docs/architecture/CREATIVE_TOOLS.md`
- `docs/project/PLANER_VERGLEICH.md`
- `packages/domain/src/editor/colorMatch.ts`
- `packages/domain/src/editor/curves.ts`
- `packages/domain/src/editor/index.ts`
- `packages/domain/src/editor/sculpt.ts`
- `packages/domain/src/editor/symmetry.ts`
- `tests/e2e/workshop-creative.e2e.mjs`
- `tests/editor-creative.test.mjs`

## 2026-11-02T10:18:02.455Z · progress

**Aufgaben:** MAP-03, GAME-03

Live-Karte mit Spielanbindung: Weltplan (Bauplätze, Wege, Punkte) mit Werkzeugen und Rückgängig auf der Weltkarte, Live-Verbindung zur Mod 0.5.0 über 127.0.0.1 mit Kopplungscode (Spielerposition, Gelände, Hologramm-Fortschritt), Plan und Markierungen ins Spiel, Lage übernehmen; Spieltest mit Modpack

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-03 | undefined | 5/6 | Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server. |
| GAME-03 | undefined | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |

**Geänderte Dateien:**

- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/app/repository.ts`
- `apps/web/src/map.css`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/PlanPanel.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/map/terrainLayer.ts`
- `apps/web/src/views/map/useWorldPlan.ts`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/releases.json`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `docs/architecture/WORLDMAP.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.5.0.jar`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/Hologram.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramKeys.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramRenderer.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/LiveLink.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/MarksRenderer.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/McCompat.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/Json.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/SurfaceRuns.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `packages/application/src/memoryRepository.ts`
- `packages/application/src/repository.ts`
- `packages/domain/src/backup.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveLink.ts`
- `packages/domain/src/worldPlan.ts`
- `scripts/bridge_gametest.mjs`
- `tests/e2e/livelink.e2e.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/livelink.test.mjs`
- `tests/worldplan.test.mjs`

## 2026-11-02T10:18:11.573Z · progress

**Aufgaben:** MAP-03, GAME-03

Live-Karte mit Spielanbindung: Weltplan (Bauplätze, Wege, Punkte) mit Werkzeugen und Rückgängig auf der Weltkarte, Live-Verbindung zur Mod 0.5.0 über 127.0.0.1 mit Kopplungscode (Spielerposition, Gelände, Hologramm-Fortschritt), Plan und Markierungen ins Spiel, Lage übernehmen; Spieltest mit Modpack

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server. |
| GAME-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |

**Geänderte Dateien:**

- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/app/repository.ts`
- `apps/web/src/map.css`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/PlanPanel.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/map/terrainLayer.ts`
- `apps/web/src/views/map/useWorldPlan.ts`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/releases.json`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `docs/architecture/WORLDMAP.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.5.0.jar`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/Hologram.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramKeys.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramRenderer.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/LiveLink.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/MarksRenderer.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/McCompat.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/Json.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/SurfaceRuns.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `packages/application/src/memoryRepository.ts`
- `packages/application/src/repository.ts`
- `packages/domain/src/backup.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveLink.ts`
- `packages/domain/src/worldPlan.ts`
- `scripts/bridge_gametest.mjs`
- `tests/e2e/livelink.e2e.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/livelink.test.mjs`
- `tests/worldplan.test.mjs`

## 2026-11-02T10:40:33.215Z · progress

**Aufgaben:** MAP-03

Nachbesserung nach Live-Rückmeldung: Ansichtsknöpfe und Kartenbeschriftungen im hellen Design lesbar, Spielverbindung oben über den Werkzeugen, keine leere 3D-Fläche ohne Projekte, neuer Einleitungstext; Handy 390 px ohne Überlauf geprüft.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server. |

**Geänderte Dateien:**

- `apps/web/src/map.css`
- `apps/web/src/style.css`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`

## 2026-11-02T10:57:37.022Z · progress

**Aufgaben:** MAP-03

„Zu mir“ holt die Draufsicht in den sichtbaren Bereich, seit die Spielverbindung über der Karte steht; livelink-, worldmap- und textures-Browsertests grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server. |

## 2026-11-02T11:28:21.794Z · progress

**Aufgaben:** MAP-01

Server-Webkarte verständlicher: echter Link in jedem Feld wird zur Vorlage, gespeicherte Rohlinks werden repariert, http-Karte in https-Seite nicht still leer eingebettet, sondern in neuem Tab; worldmap-Browsertest prüft Umwandlung.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02. |

**Geänderte Dateien:**

- `apps/web/src/map.css`
- `apps/web/src/views/map/LiveMapPanel.tsx`
- `apps/web/src/views/map/liveMapConfig.ts`
- `docs/architecture/WORLDMAP.md`
- `tests/e2e/worldmap.e2e.mjs`

## 2026-11-02T11:45:38.986Z · progress

**Aufgaben:** MAP-03, GAME-03

Philipps Spieltest: „/bauplaner verbinden port“ speicherte nur den Port, Verbindung blieb aus. Mod 0.5.1 startet sie mit dem Port-Befehl (Spieltest mit Modpack bestanden). Website: Schritte in richtiger Reihenfolge, sucht nach „Verbinden“ 3 Minuten weiter, erkennt blockierte Browserfreigabe, Selbsttest 127.0.0.1/v1/hello.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server. |
| GAME-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |

**Geänderte Dateien:**

- `apps/web/src/map.css`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/mod/releases.json`
- `docs/architecture/LIVE_LINK.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.5.1.jar`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/LiveLink.java`
- `tests/e2e/livelink.e2e.mjs`

## 2026-11-02T11:45:46.079Z · progress

**Aufgaben:** GAME-03

Download-Eintrag Mod 0.5.1 auf den Quellcommit gesetzt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`

## 2026-11-02T12:00:34.846Z · progress

**Aufgaben:** MAP-03

Weltkarten-Browsertest holt die Draufsicht vor dem Zeigen in den sichtbaren Bereich (Spiel-Kasten mit Schritten ist höher).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server. |

**Geänderte Dateien:**

- `tests/e2e/worldmap.e2e.mjs`

## 2026-11-02T12:10:10.657Z · progress

**Aufgaben:** TERRAIN-02

Streu-Ebene (S06): Bäume, Büsche, Felsen, Pflanzen und eigene Schablonen nach Stil, Hang, Höhe, Ufer und Dichte deterministisch verteilen, von Hand setzen/entfernen, im Geländebauteil für Material, Bauen, Export und Mod. Kern 8/8, Browser 2/2, gesamt 110/110 E2E; Abnahme in eigener Welt offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-02 | 🧩 Implementiert · Abnahme offen | 5/7 | Abnahme mit eigener Welt (S05); Wegstufen als Treppen (S07). |

**Geänderte Dateien:**

- `apps/web/src/views/project/LandscapeTab.tsx`
- `apps/web/src/views/project/landscape/DesignCanvas.tsx`
- `apps/web/src/views/project/landscape/ScatterPanel.tsx`
- `apps/web/src/views/project/landscape/landscape.css`
- `apps/web/src/views/world/designs.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/LANDSCAPE.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/terrainDesign.ts`
- `packages/domain/src/terrainScatter.ts`
- `packages/domain/src/terrainScatterPlan.ts`
- `tests/e2e/landscape-scatter.e2e.mjs`
- `tests/terrain-scatter.test.mjs`

## 2026-11-02T12:14:07.007Z · progress

**Aufgaben:** GAME-07

Mod 0.6.0: NeoForge auf Fabric-Stand (gemeinsamer Client-Kern hologram-26.3 inkl. Website-Verbindung), Geister unter Iris-Shadern getönt und umrandet, Platzierhilfe vor Tool Switcher; Spieltests Fabric (auch Modpack + Complementary) und NeoForge bestanden.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 7/9 | Philipp testet 0.6.0 (Fabric oder NeoForge) auf server.lmnt-gaming.net, auch mit Complementary-Shader; danach Stufe 5. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.6.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.6.0.jar`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/client-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/ClientScenario.java`
- `mods/bauplaner-bridge/fabric-26.3/build.gradle`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/GhostModels.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramHud.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramKeys.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MarksRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MaterialScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/McCompat.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlacementAssist.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/resources/assets/bauplaner_bridge/lang/de_de.json`
- `mods/bauplaner-bridge/hologram-26.3/src/main/resources/assets/bauplaner_bridge/lang/en_us.json`
- `mods/bauplaner-bridge/neoforge-26.3/build.gradle`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/LiveLinkScenario.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/NeoForgeGameTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/neoforge/BridgeNeoForge.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/templates/META-INF/neoforge.mods.toml`
- `scripts/bridge_gametest.mjs`
- `scripts/test_bridge_ingame.sh`
- `tests/e2e/mod-download.e2e.mjs`

## 2026-11-02T12:23:17.039Z · progress

**Aufgaben:** ENTITY-01

Gemälde, Rahmen, Rüstungsständer und Blockinhalte: Import/Export, 3D/Bilder/Ebenen, Materialliste, Bauanleitung, Werkstatt

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| ENTITY-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Export mit Entities im Spiel prüfen; Entities bei Auswahl-Verschieben in der Werkstatt mitnehmen; Truhen-/Schildinhalte bearbeiten. |

**Geänderte Dateien:**

- `apps/web/src/blockmodels/entityScene.ts`
- `apps/web/src/blockmodels/entityShapes.ts`
- `apps/web/src/blockmodels/renderers.ts`
- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/editor/EntityPanel.tsx`
- `apps/web/src/editor/WorkshopPage.tsx`
- `apps/web/src/schem/LayerSheet.tsx`
- `apps/web/src/schem/SchemView.tsx`
- `apps/web/src/thumbnail/Thumb.tsx`
- `apps/web/src/thumbnail/glShot.ts`
- `apps/web/src/viewer/BlockInfo.tsx`
- `apps/web/src/viewer/ContentInfo.tsx`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/content.css`
- `apps/web/src/viewer/types.ts`
- `apps/web/src/views/project/BuildTab.tsx`
- `apps/web/src/views/project/EditorTab.tsx`
- `apps/web/src/views/project/FurnishList.tsx`
- `apps/web/src/views/project/MaterialsTab.tsx`
- `apps/web/src/views/project/buildrun/BuildFocus.tsx`
- `apps/web/src/views/project/buildrun/PrintSheet.tsx`
- `docs/COMMUNICATION.md`
- `docs/architecture/ENTITIES.md`
- `docs/architecture/LITEMATIC.md`
- `packages/domain/src/compose.ts`
- `packages/domain/src/editor/draft.ts`
- `packages/domain/src/guide.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/materials.ts`
- `packages/formats/src/entityIo.ts`
- `packages/formats/src/litematic.ts`
- `packages/formats/src/litematicWrite.ts`
- `packages/formats/src/schem.ts`
- `packages/formats/src/schemWrite.ts`
- `packages/voxel/src/analysis.ts`
- `packages/voxel/src/entities.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/transforms.ts`
- `packages/voxel/src/types.ts`
- `packages/voxel/src/validation.ts`
- `tests/e2e/entities.e2e.mjs`
- `tests/editor.test.mjs`
- `tests/entities.test.mjs`
- `tests/litematic.test.mjs`
- `tests/voxel.test.mjs`

## 2026-11-02T12:25:42.264Z · progress

**Aufgaben:** BLOCK-02, BLOCK-01

Katalog und Generatoren spielgerecht: gemeinsame Bauregel gameReady (Laternen an iron_chain bis zur Decke, Verbindungen wie im Spiel), chain→iron_chain, alle 336 Gebäude und 466 Generator-Fälle ohne Halt-, Verbindungs- und ID-Fehler (vorher 208 bzw. 140 Blöcke ohne Halt, 1.239 Verbindungsabweichungen, 152 unbekannte Ketten); 178 Gebäude als neue Katalogversion, Generatoren Kirche/Hafen/Torhaus/Windmühle/Brücke/Treppenhaus/Brunnen v2; neuer Dauertest tests/catalog-game.test.mjs; npm run check und 108/108 Browsertests grün. Offen: Abnahme im Spiel.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BLOCK-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme im Spiel (S06): geänderte Gebäude (z. B. Werkstatt, Windmühle, Torhaus, Stadthaus) per Litematic setzen. |
| BLOCK-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme im Spiel; PROFILE-01 kann die Berichtsfakten übernehmen. Die Katalogfehler aus der Spielprüfung behebt BLOCK-02. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BLOCK_LOGIC.md`
- `packages/domain/src/build/furnish.ts`
- `packages/domain/src/build/gameReady.ts`
- `packages/domain/src/build/plot.ts`
- `packages/domain/src/build/sets/befestigung.ts`
- `packages/domain/src/build/sets/deko.ts`
- `packages/domain/src/build/sets/dimensionen.ts`
- `packages/domain/src/build/sets/dorf.ts`
- `packages/domain/src/build/sets/epochen.ts`
- `packages/domain/src/build/sets/fahrzeuge.ts`
- `packages/domain/src/build/sets/fantasy.ts`
- `packages/domain/src/build/sets/farmen.ts`
- `packages/domain/src/build/sets/garten.ts`
- `packages/domain/src/build/sets/hof.ts`
- `packages/domain/src/build/sets/infrastruktur.ts`
- `packages/domain/src/build/sets/interieur.ts`
- `packages/domain/src/build/sets/kueste.ts`
- `packages/domain/src/build/sets/landschaft.ts`
- `packages/domain/src/build/sets/natur.ts`
- `packages/domain/src/build/sets/redstone.ts`
- `packages/domain/src/build/sets/stadt.ts`
- `packages/domain/src/build/sets/untergrund.ts`
- `packages/domain/src/build/sets/wohnen.ts`
- `packages/domain/src/buildings.ts`
- `packages/domain/src/generators/bridge.ts`
- `packages/domain/src/generators/church.ts`
- `packages/domain/src/generators/compound.ts`
- `packages/domain/src/generators/gatehouse.ts`
- `packages/domain/src/generators/harbor.ts`
- `packages/domain/src/generators/stairwell.ts`
- `packages/domain/src/generators/well.ts`
- `packages/domain/src/generators/windmill.ts`
- `packages/domain/src/guide.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/materials.ts`
- `packages/domain/src/placement.ts`
- `packages/voxel/src/blocklogic/support.ts`
- `tests/catalog-game.test.mjs`
- `tests/catalog.test.mjs`
- `tests/generators.test.mjs`

## 2026-11-02T13:29:25.610Z · progress

**Aufgaben:** MAP-04

Weltbuilder: Löschen/Entfernen aller Kartenobjekte (Entf, Kontextmenü, Auswahlleiste, Listen), Mehrfachauswahl mit Rahmen, ein Rückgängig für Weltplan und Projektlagen, Duplizieren/Drehen/Spiegeln/Gelände, Wegecken, Ebenen, Objektliste; check 625 und e2e 113/113 grün, Abnahme offen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-04 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); denkbare Folge: benannte Gruppen/Sperren mit Schemaerweiterung, abgestimmt mit der Mod. |

**Geänderte Dateien:**

- `apps/web/src/map.css`
- `apps/web/src/views/map/Builder.tsx`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/PlanPanel.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/useMapHistory.ts`
- `apps/web/src/views/map/useWorldPlan.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/WORLDMAP.md`
- `docs/architecture/WORLD_BUILDER.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/worldPlan.ts`
- `packages/domain/src/worldPlanEdit.ts`
- `tests/e2e/livelink.e2e.mjs`
- `tests/e2e/worldbuilder.e2e.mjs`
- `tests/worldbuilder.test.mjs`

## 2026-11-02T13:48:27.653Z · progress

**Aufgaben:** PERF-04, MODEL-01

PERF-04: Import, Speichern, 3D-Netz mit Licht, 3D-Export, Versionsvergleich und Update-Vorschau großer Modelle im Web Worker mit Fortschritt und Abbrechen; Speichern 927k Blöcke 70 s → 18 s, Blockierung ~100 s → 7 s. MODEL-01-S06 auf Flächenzusammenfassung reduziert. Freie Entities (ENTITY-01) laufen im Worker-Netz mit. Nur Chromium geprüft.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Bibliotheksstart und Katalogkennwerte sehr großer Versionen auslagern; Abnahme auf Philipps Rechner mit Olympus (S05). |
| MODEL-01 | 🧩 Implementiert · Abnahme offen | 4/6 | Dateien in Blender und Slicern prüfen und ein Testdruck; danach Flächenzusammenfassung (S06). Export läuft seit PERF-04 im Worker. |

**Geänderte Dateien:**

- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/app/importFile.ts`
- `apps/web/src/app/metricsCache.ts`
- `apps/web/src/blockmodels/mesh.ts`
- `apps/web/src/blockmodels/snapshot.ts`
- `apps/web/src/export3d/ModelExportPanel.tsx`
- `apps/web/src/export3d/build.ts`
- `apps/web/src/import.worker.ts`
- `apps/web/src/jobs/JobStatus.tsx`
- `apps/web/src/jobs/client.ts`
- `apps/web/src/jobs/diffJob.ts`
- `apps/web/src/jobs/heavy.worker.ts`
- `apps/web/src/jobs/importJob.ts`
- `apps/web/src/jobs/jobs.css`
- `apps/web/src/jobs/jobs.ts`
- `apps/web/src/jobs/meshJob.ts`
- `apps/web/src/jobs/modelJob.ts`
- `apps/web/src/jobs/protocol.ts`
- `apps/web/src/jobs/transport.ts`
- `apps/web/src/jobs/updateJob.ts`
- `apps/web/src/jobs/updates.ts`
- `apps/web/src/jobs/versionJob.ts`
- `apps/web/src/jobs/versions.ts`
- `apps/web/src/schem/DiffView.tsx`
- `apps/web/src/thumbnail/Thumb.tsx`
- `apps/web/src/thumbnail/glShot.ts`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/backgroundMesh.ts`
- `apps/web/src/viewer/sceneController.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/ViewerView.tsx`
- `apps/web/src/views/library/CropPanel.tsx`
- `apps/web/src/views/project/UpdatesTab.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/BACKGROUND_JOBS.md`
- `docs/architecture/MODEL_EXPORT.md`
- `packages/domain/src/connectors.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/library.ts`
- `packages/domain/src/versionStorage.ts`
- `packages/formats/src/structure.ts`
- `packages/voxel/src/cellColumns.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/validation.ts`
- `tests/background-jobs.test.mjs`
- `tests/e2e/background-jobs.e2e.mjs`
- `tests/pages.test.mjs`
- `vite.config.mjs`

## 2026-11-02T15:09:27.531Z · progress

**Aufgaben:** LIB-05

Bibliothek im Stil der Vorlagen neu gestaltet: Baukasten style.ts, Veredelung, Klassiker/Wohnen/Dorf/Befestigung/Sakral/Hof neu, Generatoren v3

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-05 | 🧩 Implementiert · Abnahme offen | 5/6 | LIB-05-S06: Stadt, Küste, Epochen und Fantasy neu zeichnen; Abnahme einiger neuer Gebäude im Spiel. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BAUSTIL.md`
- `docs/architecture/CATALOG.md`
- `docs/architecture/GENERATORS.md`
- `packages/domain/src/build/quality.ts`
- `packages/domain/src/build/refine.ts`
- `packages/domain/src/build/sets/befestigung.ts`
- `packages/domain/src/build/sets/dorf.ts`
- `packages/domain/src/build/sets/hof.ts`
- `packages/domain/src/build/sets/index.ts`
- `packages/domain/src/build/sets/klassiker.ts`
- `packages/domain/src/build/sets/sakral.ts`
- `packages/domain/src/build/sets/wohnen.ts`
- `packages/domain/src/build/style.ts`
- `packages/domain/src/buildings.ts`
- `packages/domain/src/ensembles.ts`
- `packages/domain/src/generators/bridge.ts`
- `packages/domain/src/generators/church.ts`
- `packages/domain/src/generators/compound.ts`
- `packages/domain/src/generators/gatehouse.ts`
- `packages/domain/src/generators/harbor.ts`
- `packages/domain/src/generators/house.ts`
- `packages/domain/src/generators/roof.ts`
- `packages/domain/src/generators/roofs.ts`
- `packages/domain/src/generators/stairwell.ts`
- `packages/domain/src/generators/styles.ts`
- `packages/domain/src/generators/tower.ts`
- `packages/domain/src/generators/types.ts`
- `packages/domain/src/generators/wall.ts`
- `packages/domain/src/generators/well.ts`
- `packages/domain/src/generators/windmill.ts`
- `tests/baustil.test.mjs`
- `tests/catalog.test.mjs`
- `tests/e2e/catalog.e2e.mjs`
- `tests/e2e/model3d.e2e.mjs`
- `tests/e2e/schem.e2e.mjs`
- `tests/generators.test.mjs`

## 2026-11-02T15:51:20.990Z · progress

**Aufgaben:** LIB-05

Bibliothek im Stil der Vorlagen neu gestaltet: Baukasten style.ts, Veredelung, Klassiker/Wohnen/Dorf/Befestigung/Sakral/Hof neu, Generatoren v3

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-05 | 🧩 Implementiert · Abnahme offen | 5/6 | LIB-05-S06: Stadt, Küste, Epochen und Fantasy neu zeichnen; Abnahme einiger neuer Gebäude im Spiel. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BAUSTIL.md`
- `docs/architecture/CATALOG.md`
- `docs/architecture/GENERATORS.md`
- `packages/domain/src/build/quality.ts`
- `packages/domain/src/build/refine.ts`
- `packages/domain/src/build/sets/befestigung.ts`
- `packages/domain/src/build/sets/dorf.ts`
- `packages/domain/src/build/sets/hof.ts`
- `packages/domain/src/build/sets/index.ts`
- `packages/domain/src/build/sets/klassiker.ts`
- `packages/domain/src/build/sets/sakral.ts`
- `packages/domain/src/build/sets/wohnen.ts`
- `packages/domain/src/build/style.ts`
- `packages/domain/src/buildings.ts`
- `packages/domain/src/ensembles.ts`
- `packages/domain/src/generators/bridge.ts`
- `packages/domain/src/generators/church.ts`
- `packages/domain/src/generators/compound.ts`
- `packages/domain/src/generators/gatehouse.ts`
- `packages/domain/src/generators/harbor.ts`
- `packages/domain/src/generators/house.ts`
- `packages/domain/src/generators/roof.ts`
- `packages/domain/src/generators/roofs.ts`
- `packages/domain/src/generators/stairwell.ts`
- `packages/domain/src/generators/styles.ts`
- `packages/domain/src/generators/tower.ts`
- `packages/domain/src/generators/types.ts`
- `packages/domain/src/generators/wall.ts`
- `packages/domain/src/generators/well.ts`
- `packages/domain/src/generators/windmill.ts`
- `tests/baustil.test.mjs`
- `tests/catalog.test.mjs`
- `tests/e2e/catalog.e2e.mjs`
- `tests/e2e/model3d.e2e.mjs`
- `tests/e2e/schem.e2e.mjs`
- `tests/e2e/worldbuilder.e2e.mjs`
- `tests/generators.test.mjs`

## 2026-11-02T18:20:40.445Z · progress

**Aufgaben:** LIB-05

Runde 2: Fassadenbaukasten für Stadt, Küste, Epochen, Fantasy, Nether und Torhaus; sieben neue Meisterstücke

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-05 | 🧩 Implementiert · Abnahme offen | 6/7 | LIB-05-S07: Untergrund innen, Interieur, Technik; Abnahme neuer Gebäude im Spiel durch Philipp. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BAUSTIL.md`
- `docs/architecture/CATALOG.md`
- `packages/domain/src/build/facade.ts`
- `packages/domain/src/build/plot.ts`
- `packages/domain/src/build/sets/befestigung.ts`
- `packages/domain/src/build/sets/epochen.ts`
- `packages/domain/src/build/sets/fantasy.ts`
- `packages/domain/src/build/sets/index.ts`
- `packages/domain/src/build/sets/kueste.ts`
- `packages/domain/src/build/sets/meister.ts`
- `packages/domain/src/build/sets/stadt.ts`
- `packages/domain/src/build/sets/welten.ts`
- `tests/baustil.test.mjs`

## 2026-11-02T18:40:22.884Z · progress

**Aufgaben:** LIB-05

Runde 2: Fassadenbaukasten für Stadt, Küste, Epochen, Fantasy, Nether und Torhaus; sieben neue Meisterstücke

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-05 | 🧩 Implementiert · Abnahme offen | 6/7 | LIB-05-S07: Untergrund innen, Interieur, Technik; Abnahme neuer Gebäude im Spiel durch Philipp. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BAUSTIL.md`
- `docs/architecture/CATALOG.md`
- `packages/domain/src/build/facade.ts`
- `packages/domain/src/build/plot.ts`
- `packages/domain/src/build/sets/befestigung.ts`
- `packages/domain/src/build/sets/epochen.ts`
- `packages/domain/src/build/sets/fantasy.ts`
- `packages/domain/src/build/sets/index.ts`
- `packages/domain/src/build/sets/kueste.ts`
- `packages/domain/src/build/sets/meister.ts`
- `packages/domain/src/build/sets/stadt.ts`
- `packages/domain/src/build/sets/welten.ts`
- `tests/baustil.test.mjs`
- `tests/e2e/app.e2e.mjs`
- `tests/e2e/snap.e2e.mjs`

## 2026-11-02T18:46:03.589Z · progress

**Aufgaben:** GAME-07

Mod 0.7.0: Bauabschnitte aus dem Planer im Spiel (Num /, /bauplaner abschnitt), Röntgensicht (Num -), Shulkerkisten und Bündel in der Materialliste, Abschnittswahl von der Website (POST /v1/section)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 8/10 | Philipp testet 0.7.0 auf server.lmnt-gaming.net (Bauabschnitte aus seinem Projekt, Röntgensicht mit Shader); danach Stufe 6. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.7.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.7.0.jar`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramHud.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramKeys.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MaterialScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/McCompat.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlacementAssist.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/resources/assets/bauplaner_bridge/lang/de_de.json`
- `mods/bauplaner-bridge/hologram-26.3/src/main/resources/assets/bauplaner_bridge/lang/en_us.json`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Filter.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/LiveCheck.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Materials.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlanModel.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/LiveLinkScenario.java`
- `packages/application/src/revisionExport.ts`
- `packages/domain/src/liveLink.ts`
- `scripts/bridge_gametest.mjs`
- `tests/game-check.test.mjs`
- `tests/livelink.test.mjs`

## 2026-11-02T19:07:27.604Z · progress

**Aufgaben:** PERF-04

Bibliotheksstart im Worker (Auftrag library): Katalog erzeugen, Seed planen, Kennwerte; Startbildschirm mit Fortschritt; Blockierung beim Start 4,6 s → 0,8 s; nur Chromium geprüft

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-04 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06); GPU-Upload großer Szenen bleibt im Hauptthread. |

**Geänderte Dateien:**

- `apps/web/src/app/context.tsx`
- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/app/repository.ts`
- `apps/web/src/jobs/jobs.css`
- `apps/web/src/jobs/jobs.ts`
- `apps/web/src/jobs/library.ts`
- `apps/web/src/jobs/libraryJob.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BACKGROUND_JOBS.md`
- `packages/application/src/catalogSync.ts`
- `packages/application/src/index.ts`
- `packages/application/src/repository.ts`
- `packages/domain/src/buildings.ts`
- `tests/e2e/library-start.e2e.mjs`
- `tests/library-start.test.mjs`

## 2026-11-02T19:16:30.126Z · progress

**Aufgaben:** GAME-07

Absturzschutz der Client-Mod für die Testphase: Fehler in Tick, Zeichnen, HUD und Klicks beenden das Spiel nicht, landen als [Fehler] im Log mit Chat-Hinweis auf /bauplaner diagnose

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 8/10 | Philipp testet 0.7.0 auf server.lmnt-gaming.net (Bauabschnitte aus seinem Projekt, Röntgensicht mit Shader); danach Stufe 6. |

**Geänderte Dateien:**

- `docs/architecture/MOD_HOLOGRAM.md`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`

## 2026-11-02T19:23:55.694Z · progress

**Aufgaben:** EDIT-05

Auswahl- und Formwerkzeuge: Zauberauswahl als Zellauswahl, wachsen/schrumpfen/einpassen, Stapeln, Extrudieren, Ellipsoid/Torus/Wendel, Ausstattung zieht beim Verschieben/Drehen/Stapeln mit

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| EDIT-05 | 🧩 Implementiert · Abnahme offen | 6/7 | EDIT-05-S07: Abnahme durch Philipp in der Werkstatt (Zauberstab, Stapeln, Extrudieren, Wendel) und Spielprüfung gestapelter/gedrehter Bauteile mit Ausstattung. |

**Geänderte Dateien:**

- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/editor/LayerGrid.tsx`
- `apps/web/src/editor/RegionPanel.tsx`
- `apps/web/src/editor/editor.css`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/BLOCK_EDITOR.md`
- `docs/architecture/CREATIVE_TOOLS.md`
- `docs/architecture/ENTITIES.md`
- `docs/project/PLANER_VERGLEICH.md`
- `packages/domain/src/editor/forms.ts`
- `packages/domain/src/editor/index.ts`
- `packages/domain/src/editor/region.ts`
- `packages/domain/src/editor/stencils.ts`
- `packages/domain/src/editor/symmetry.ts`
- `packages/domain/src/editor/tools.ts`
- `tests/e2e/workshop-region.e2e.mjs`
- `tests/editor-region.test.mjs`

## 2026-11-02T19:41:48.238Z · progress

**Aufgaben:** PERF-04

Katalogspeicher je App-Version (Schlüssel aus packages/ beim Bauen, CatalogCache im meta-Speicher): Neuladen bis zum Katalog 5 s → 1 s; Rückfall bei anderem Schlüssel oder Schaden; nur Chromium geprüft

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06); GPU-Upload großer Szenen bleibt im Hauptthread. |

**Geänderte Dateien:**

- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/jobs/library.ts`
- `apps/web/src/jobs/libraryJob.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BACKGROUND_JOBS.md`
- `packages/application/src/repository.ts`
- `tests/e2e/library-start.e2e.mjs`
- `tests/library-start.test.mjs`
- `vite.config.mjs`

## 2026-11-02T19:48:53.099Z · progress

**Aufgaben:** BASE-01, SPLIT-01

Basisplaner (Funktionszonen, Wegenetz, Spielprüfungen, Bauphasen) und Gebäude herauslösen (Säulenanalyse, Erkennung, Aufteilen als Projekt); Einheits- und Browsertests grün, Abnahme in der Testphase offen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BASE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); danach Küstenlinie aus der Geländeaufnahme und Wegstufen. |
| SPLIT-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit echten Dateien (S05). |

**Geänderte Dateien:**

- `apps/web/src/app/router.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/library/BasePage.tsx`
- `apps/web/src/views/library/BuildingDetail.tsx`
- `apps/web/src/views/library/SplitPanel.tsx`
- `apps/web/src/views/library/base.css`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BASE_PLANNER.md`
- `packages/domain/src/anlagen.ts`
- `packages/domain/src/base.ts`
- `packages/domain/src/baseFunctions.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/split.ts`
- `packages/domain/src/types.ts`
- `tests/base.test.mjs`
- `tests/e2e/base.e2e.mjs`

## 2026-11-02T20:12:54.947Z · progress

**Aufgaben:** LIB-05

Runde 3: Interieur-Räume gegliedert (dressRoom), Untergrundhallen mit Wandrippen (innerRibs), Wasseraufzug mit Gehäuse

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-05 | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BAUSTIL.md`
- `packages/domain/src/build/facade.ts`
- `packages/domain/src/build/sets/interieur.ts`
- `packages/domain/src/build/sets/redstone.ts`
- `packages/domain/src/build/sets/untergrund.ts`
- `tests/baustil.test.mjs`

## 2026-11-02T20:15:42.955Z · progress

**Aufgaben:** LIB-05

Runde 3: Interieur-Räume gegliedert (dressRoom), Untergrundhallen mit Wandrippen (innerRibs), Wasseraufzug mit Gehäuse; Browsertests warten auf die im Worker geladene Bibliothek

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-05 | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/BAUSTIL.md`
- `packages/domain/src/build/facade.ts`
- `packages/domain/src/build/sets/interieur.ts`
- `packages/domain/src/build/sets/redstone.ts`
- `packages/domain/src/build/sets/untergrund.ts`
- `tests/baustil.test.mjs`
- `tests/e2e/app.e2e.mjs`
- `tests/e2e/snap.e2e.mjs`

## 2026-11-02T20:30:03.485Z · progress

**Aufgaben:** MAP-05

Baustand aus dem Spiel auf der Live-Karte (Mod 0.7.1 GET /v1/scan, Plankoordinaten auch gedreht), Ebenen und Abweichungen auf der Karte, bestätigte Schritte abhaken, Bauabschnitte der Mod 0.7.0 wählen, Weltplan-Autoabgleich, Kontextmenü Hologramm/BlueMap; Grenzen: Abnahme durch Philipp offen, gedrehte Lagen nicht übernommen, BlueMap nur als Link

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können. |

**Geänderte Dateien:**

- `apps/web/src/map.css`
- `apps/web/src/views/map/GameProgress.tsx`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/LiveMapPanel.tsx`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/LIVE_LINK.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.7.1.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.7.1.jar`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/core/src/main/java/io/github/freadeax/bauplaner/bridge/ScanJob.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/PlanScan.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/LiveLinkScenario.java`
- `packages/domain/src/gameCheck.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveLink.ts`
- `scripts/bridge_gametest.mjs`
- `tests/e2e/game-progress.e2e.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/game-check.test.mjs`
- `tests/livelink.test.mjs`

## 2026-11-02T20:42:09.301Z · progress

**Aufgaben:** QA-04

Große Testphase: Testplan, Seite #/testphase mit Protokoll und Fehlerbericht mit Diagnose, Mod /bauplaner diagnose, Issue-Vorlagen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/testphase-mod.yml`
- `.github/ISSUE_TEMPLATE/testphase-planer.yml`
- `apps/web/src/app/CommandPalette.tsx`
- `apps/web/src/app/ErrorBoundary.tsx`
- `apps/web/src/app/Shell.tsx`
- `apps/web/src/app/diagnostics.ts`
- `apps/web/src/app/nav.ts`
- `apps/web/src/app/router.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/testing/TestphaseView.tsx`
- `apps/web/src/testing/protocol.ts`
- `apps/web/src/testing/testphase.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/SystemView.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/TESTPHASE.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramDiagnose.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Diagnostics.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/DiagnosticsTest.java`
- `package.json`
- `scripts/render_testplan.mjs`
- `tests/e2e/testphase.e2e.mjs`
- `tests/testphase.test.mjs`

## 2026-11-02T20:42:10.000Z · progress

**Aufgaben:** QA-04

Testplan um die offenen Abnahmen der Novemberrunde ergänzt (65 Fälle), Teststand festgehalten

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `docs/COMMUNICATION.md`
- `docs/architecture/TESTPHASE.md`
- `docs/testing/TESTPLAN.md`

## 2026-11-02T22:14:34.982Z · progress

**Aufgaben:** GAME-07

Mod 0.7.2 für die Testphase: /bauplaner diagnose (mit Fehlerzähler des Absturzschutzes) im Spieltest geprüft, Klammerfehler behoben, Fabric und NeoforGe veröffentlicht

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 8/10 | Philipp testet 0.7.0 auf server.lmnt-gaming.net (Bauabschnitte aus seinem Projekt, Röntgensicht mit Shader); danach Stufe 6. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.7.2.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.7.2.jar`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramDiagnose.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java`
- `scripts/bridge_gametest.mjs`

## 2026-11-02T22:22:15.691Z · progress

**Aufgaben:** QA-04

Teststand Mod 0.7.2 mit diagnose; Hinweis alte Tastenbelegung

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `docs/architecture/TESTPHASE.md`
- `docs/testing/TESTPLAN.md`

## 2026-11-02T23:00:01.616Z · progress

**Aufgaben:** MAP-06, GAME-08

MAP-06 Weltkarte in die Tiefe (Schema 2, Zonen, Ebenen, Messen, Route, Protokoll 2) umgesetzt; GAME-08 für die Mod geplant

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-06 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag). |
| GAME-08 | ⏳ Offen | 0/4 | Umsetzung im Mod-Thread nach der Testphase; Vertrag in LIVE_LINK.md „Protokoll 2 (Entwurf)“. |

**Geänderte Dateien:**

- `apps/web/src/map.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/Builder.tsx`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/PlanPanel.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/WORLD_BUILDER.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveLink.ts`
- `packages/domain/src/worldPlan.ts`
- `packages/domain/src/worldPlanEdit.ts`
- `packages/domain/src/worldRoute.ts`
- `tests/e2e/map-depth.e2e.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/livelink.test.mjs`
- `tests/worldbuilder.test.mjs`
- `tests/worldplan.test.mjs`
- `tests/worldroute.test.mjs`

## 2026-11-02T23:03:24.346Z · progress

**Aufgaben:** MAP-06

STATUS: Weltkarte und Spielanbindung nach MAP-06 nachgeführt

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-06 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag). |

**Geänderte Dateien:**

- `docs/STATUS.md`

## 2026-11-02T23:23:44.219Z · progress

**Aufgaben:** GAME-08

Mod 0.8.0: Live-Protokoll 2 im Spiel (Zonen als Bodenteppich, Ebenen mit /bauplaner ebenen, Farben, fünf neue Punktarten, GET /v1/players, hello.protocol 2); Spieltests Fabric, Modpack+Shader und NeoForge gegen die Leser der Website

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-08 | undefined | 4/4 | Protokoll 3: Rückrichtung „Markierung im Spiel setzen → Weltplan“ mit Zeitstempel je Eintrag (siehe LIVE_LINK.md); Forge und Paper ohne Live-Verbindung. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.8.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.8.0.jar`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MarksRenderer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/LiveLinkScenario.java`
- `scripts/bridge_gametest.mjs`

## 2026-11-03T15:22:00.823Z · progress

**Aufgaben:** GROSS-01

Großprojekte als neue Größenstufe der Bibliothek: Engine mit Rasterlayout, Straßennetz und Phasen, zehn kuratierte Pläne, Seite #/bibliothek/grossprojekte, 11 Einheits- und 2 Browsertests grün; Großbauten-Set und Abnahme offen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 4/6 | Abnahme durch Philipp (S06); Großbauten-Set (S05). |

**Geänderte Dateien:**

- `apps/web/src/app/router.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/library/GrossprojektePage.tsx`
- `apps/web/src/views/library/grossprojekte.css`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/ANLAGEN.md`
- `docs/architecture/GROSSPROJEKTE.md`
- `packages/domain/src/grossprojekte.ts`
- `packages/domain/src/grossprojekte/bergbaustadt.ts`
- `packages/domain/src/grossprojekte/burganlage.ts`
- `packages/domain/src/grossprojekte/hafenstadt.ts`
- `packages/domain/src/grossprojekte/hauptstadt.ts`
- `packages/domain/src/grossprojekte/helpers.ts`
- `packages/domain/src/grossprojekte/index.ts`
- `packages/domain/src/grossprojekte/industriehafen.ts`
- `packages/domain/src/grossprojekte/innenstadt.ts`
- `packages/domain/src/grossprojekte/landgut.ts`
- `packages/domain/src/grossprojekte/magierstadt.ts`
- `packages/domain/src/grossprojekte/marktstadt.ts`
- `packages/domain/src/grossprojekte/tempelstadt.ts`
- `packages/domain/src/index.ts`
- `tests/e2e/grossprojekte.e2e.mjs`
- `tests/grossprojekte.test.mjs`

## 2026-11-03T15:28:11.884185Z · progress

**Aufgaben:** GROSS-01

Nachtrag: gerenderter Testplan (docs/testing/TESTPLAN.md) mit Fall BIB-13 zum Push fe33414 zugeordnet; keine inhaltliche Änderung

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 4/6 | Abnahme durch Philipp (S06); Großbauten-Set (S05). |

**Geänderte Dateien:**

- `docs/testing/TESTPLAN.md`

## 2026-11-03T15:52:52.715Z · progress

**Aufgaben:** GEN-03

Kolosseum aus Philipps ChatGPT-Bauplan: Generator Arena (Vorlage Kolosseum 81 × 61, vier Etagen, Hypogäum, Velarium) mit sechs Vorlagen, Bauset Antike (7 Bauten), Ensemble Kolosseumsplatz und Großprojekt Kolosseum-Viertel (9 Quartiere, 30 Gebäude, 4 Phasen). check grün, Browser catalog/generators/grossprojekte 6/6; Spielabnahme offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GEN-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp baut das Kolosseum im Spiel nach (BIB-14); danach Feinschliff (Statuen in den Attika-Fenstern, Treppen im Hypogäum). |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/CATALOG.md`
- `docs/architecture/GENERATORS.md`
- `docs/architecture/GROSSPROJEKTE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/build/sets/antike.ts`
- `packages/domain/src/build/sets/index.ts`
- `packages/domain/src/ensembles.ts`
- `packages/domain/src/generators/arena.ts`
- `packages/domain/src/generators/index.ts`
- `packages/domain/src/grossprojekte/index.ts`
- `packages/domain/src/grossprojekte/kolosseum.ts`
- `tests/e2e/generators.e2e.mjs`
- `tests/e2e/grossprojekte.e2e.mjs`
- `tests/generators.test.mjs`

## 2026-11-03T16:15:14.846Z · progress

**Aufgaben:** GROSS-01

Großbauten-Set (S05): sechs Wahrzeichen bis 45 × 41 Blöcke (Rathaus mit Turm, Schloss, Kuppelbasilika, Arena, Großer Marktplatz, Stadttor), Hauptstadt um Residenz und Großen Markt erweitert

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); Großbauten-Set (S05). |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/GROSSPROJEKTE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/build/sets/grossbauten.ts`
- `packages/domain/src/build/sets/index.ts`
- `packages/domain/src/grossprojekte/hauptstadt.ts`

## 2026-11-03T16:19:48.921Z · progress

**Aufgaben:** COOP-01, COOP-02

Teambau ohne Backend: Teamprotokoll (team.ts), Reiter Team, Teampaket/Meldecode/Serverdatei, Paper-Teammodul; 12 Domänentests, Browsertest mit zwei Browsern, Servertest Paper 1.18.2/1.21.4/26.3. Grenze: Aktionsleiste/Schutz/Partikel ohne echte Spieler ungeprüft.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-01 | 🧩 Implementiert · Abnahme offen | 3/5 | PROJ-01-Anbindung (S04) nach dessen Merge; Abnahme durch Philipp mit Mitspielern. |
| COOP-02 | 🧩 Implementiert · Abnahme offen | 2/4 | Jar veröffentlichen; Abnahme auf Philipps Server. |

## 2026-11-03T16:19:54.092Z · progress

**Aufgaben:** COOP-03, COOP-04

Geplant: Live-Abgleich über die Mod (nur freiwillig nach Serveranmeldung des Kanals und Bestätigung) und Baunachweis/Lagerkisten; Vorschlag in TEAMBAU.md.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-03 | ⏳ Offen | 0/2 | Nach der Testphase mit dem Mod-Thread abstimmen. |
| COOP-04 | ⏳ Offen | 0/2 | Nach COOP-02-Abnahme. |

## 2026-11-03T16:19:59.131Z · progress

**Aufgaben:** TEAM-01, TEAM-02, TEAM-03, AUTH-01

Nächste Aktion ergänzt: für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04; Backend bleibt Option.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TEAM-01 | ⏳ Offen | 0/2 | API, Betriebsmodell und Kostenrahmen dokumentieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |
| TEAM-02 | ⏳ Offen | 0/2 | Operation-ID, Revisionsprüfung und Wiederholung serverseitig umsetzen. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |
| TEAM-03 | ⏳ Offen | 0/2 | Zuständigkeiten und Lagerbuchungen versionieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |
| AUTH-01 | ⏳ Offen | 0/2 | Gast-/Kontovertrag und serverseitige Rechte definieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |

## 2026-11-03T16:20:13.104Z · progress

**Aufgaben:** COOP-01, COOP-02

Dateizuordnung Teambau (Domäne, Reiter Team, Paper-Teammodul, Tests, Doku).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-01 | 🧩 Implementiert · Abnahme offen | 3/5 | PROJ-01-Anbindung (S04) nach dessen Merge; Abnahme durch Philipp mit Mitspielern. |
| COOP-02 | 🧩 Implementiert · Abnahme offen | 2/4 | Jar veröffentlichen; Abnahme auf Philipps Server. |

**Geänderte Dateien:**

- `apps/web/src/app/icons.tsx`
- `apps/web/src/team.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/project/TeamExchange.tsx`
- `apps/web/src/views/project/TeamOpen.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `apps/web/src/views/project/tabs.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/TEAMBAU.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/resources/config.yml`
- `mods/bauplaner-bridge/paper/src/main/resources/plugin.yml`
- `packages/domain/src/index.ts`
- `packages/domain/src/site.ts`
- `packages/domain/src/team.ts`
- `scripts/bridge_paperteam.mjs`
- `scripts/test_bridge_paper_team.sh`
- `tests/e2e/team.e2e.mjs`
- `tests/team.test.mjs`

## 2026-11-03T16:33:52.289Z · progress

**Aufgaben:** SIZE-01

Größengrenzen zentral (4 Mio. Zellen, 16,7 Mio. Box), Import ohne Kopie, Werkstatt linear, Mod 0.9.0 mit großen Plänen im Hintergrund, Render-Budget und Baustand in Scheiben

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |

**Geänderte Dateien:**

- `apps/web/src/app/SizeNotice.tsx`
- `apps/web/src/app/importLimits.ts`
- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/jobs/importJob.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/ViewerView.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `docs/TESTING.md`
- `docs/architecture/BLOCK_EDITOR.md`
- `docs/architecture/CREATIVE_TOOLS.md`
- `docs/architecture/LITEMATIC.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/MOD_BRIDGE.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `docs/architecture/SCHEM_IMPORT.md`
- `docs/architecture/SIZE_LIMITS.md`
- `docs/architecture/WORLD_IMPORT.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/core/src/main/java/io/github/freadeax/bauplaner/bridge/Plan.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramDiagnose.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramHud.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/LiveCheck.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlanModel.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/PlanScan.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/BigPlanTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `packages/application/src/revisionExport.ts`
- `packages/application/src/scanPersistence.ts`
- `packages/domain/src/editor/draft.ts`
- `packages/domain/src/editor/index.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveLink.ts`
- `packages/formats/src/litematic.ts`
- `packages/formats/src/litematicWrite.ts`
- `packages/formats/src/scan.ts`
- `packages/formats/src/schem.ts`
- `packages/formats/src/schemWrite.ts`
- `packages/formats/src/worldExcerpt.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/sizeLimits.ts`
- `packages/voxel/src/validation.ts`
- `scripts/bridge_gametest.mjs`
- `tests/game-check.test.mjs`
- `tests/schem.test.mjs`
- `tests/size-limits.test.mjs`

## 2026-11-03T16:37:18.371Z · progress

**Aufgaben:** LIB-06

Bibliotheksbeiträge: eigene Bauwerke über „In Bibliothek einreichen“ als geprüftes Paket, Übernahme mit npm run library:add in den festen Katalog, Auslieferung wie mitgelieferte Gebäude; Node 706/706, Browser LIB-06 3/3, Durchstich lokal; Abnahme durch Philipp offen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-06 | 🧩 Implementiert · Abnahme offen | 5/7 | Abnahme durch Philipp (S06) und erster echter Beitrag (S07). |

**Geänderte Dateien:**

- `.github/ISSUE_TEMPLATE/bibliotheksbeitrag.yml`
- `apps/web/src/app/repository.ts`
- `apps/web/src/catalog.css`
- `apps/web/src/jobs/libraryJob.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/library/BuildingCard.tsx`
- `apps/web/src/views/library/BuildingDetail.tsx`
- `apps/web/src/views/library/ContributePanel.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/CATALOG.md`
- `docs/architecture/CONTRIBUTIONS.md`
- `docs/library/BEITRAEGE.md`
- `docs/testing/TESTPLAN.md`
- `package.json`
- `packages/domain/src/buildings.ts`
- `packages/domain/src/community/library.ts`
- `packages/domain/src/community/registry.ts`
- `packages/domain/src/community/types.ts`
- `packages/domain/src/contribution.ts`
- `packages/domain/src/index.ts`
- `scripts/library_intake.mjs`
- `tests/contribution.test.mjs`
- `tests/e2e/contribution.e2e.mjs`

## 2026-11-03T16:46:52.767Z · progress

**Aufgaben:** SIZE-01

Mod 0.9.0 für Fabric und NeoForge auf #/mod freigegeben (Spieltests Fabric, NeoForge, Modpack mit Shader)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/TESTING.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.9.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.9.0.jar`

## 2026-11-03T17:39:42.853Z · progress

**Aufgaben:** PERF-04

Erststart der Bibliothek schneller (7,5 s → 4,7 s), gemeinsamer Startwarter für Browsertests

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06); GPU-Upload großer Szenen bleibt im Hauptthread. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `packages/domain/src/build/plot.ts`
- `packages/domain/src/build/refine.ts`
- `tests/e2e/app.e2e.mjs`
- `tests/e2e/background-jobs.e2e.mjs`
- `tests/e2e/backup-reminder.e2e.mjs`
- `tests/e2e/block-logic.e2e.mjs`
- `tests/e2e/build-run.e2e.mjs`
- `tests/e2e/catalog.e2e.mjs`
- `tests/e2e/editor.e2e.mjs`
- `tests/e2e/export.e2e.mjs`
- `tests/e2e/game-check.e2e.mjs`
- `tests/e2e/game-progress.e2e.mjs`
- `tests/e2e/guide.e2e.mjs`
- `tests/e2e/litematic.e2e.mjs`
- `tests/e2e/livelink.e2e.mjs`
- `tests/e2e/map-depth.e2e.mjs`
- `tests/e2e/materials.e2e.mjs`
- `tests/e2e/persistence.e2e.mjs`
- `tests/e2e/project-computation.e2e.mjs`
- `tests/e2e/recipes.e2e.mjs`
- `tests/e2e/scan-persistence.e2e.mjs`
- `tests/e2e/shell.e2e.mjs`
- `tests/e2e/site.e2e.mjs`
- `tests/e2e/snap.e2e.mjs`
- `tests/e2e/start.mjs`
- `tests/e2e/team.e2e.mjs`
- `tests/e2e/ui-acceptance.e2e.mjs`
- `tests/e2e/updates.e2e.mjs`
- `tests/e2e/viewer.e2e.mjs`
- `tests/e2e/world-import.e2e.mjs`
- `tests/e2e/worldbuilder.e2e.mjs`
- `tests/e2e/worldmap.e2e.mjs`

## 2026-11-03T17:57:24.438Z · progress

**Aufgaben:** COOP-04, COOP-02

COOP-04 Baunachweis und Lagerkisten: Ereignisse build.tally/member.tally/store.chest/store.count (nur Server für Messwerte), Plugin zählt Blöcke in Teamabschnitten und Lagerkisten beim Schließen (auch Shulkerinhalt), Befehle lager/nachweis/beitrag, Bereich „Baunachweis & Lager“ mit Übernahme ins Baustellen-Lager. Servertest Paper 1.18.2–26.3 und Browsertest grün; Abnahme mit echten Spielern offen (TEAMBAU-07/08).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung Lagerkisten im Thread „Server-Plugin mit geprüften Lagerkisten“. |
| COOP-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Server. |

**Geänderte Dateien:**

- `apps/web/src/team.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/TeamProof.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/TEAMBAU.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/resources/config.yml`
- `packages/domain/src/team.ts`
- `scripts/bridge_paperteam.mjs`
- `scripts/test_bridge_paper.sh`
- `scripts/test_bridge_paper_team.sh`
- `tests/e2e/team.e2e.mjs`
- `tests/team.test.mjs`

## 2026-11-03T18:00:55.314Z · progress

**Aufgaben:** COOP-02

Plugin-Jar bauplaner-bridge-paper-0.9.0 mit Teammodul, Baunachweis und Lagerkisten auf der Download-Seite (#/mod, Server); Servertests Teambau auf fünf Paper-Versionen und Brücke 1.21.4 grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Server. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-paper-0.9.0.jar`

## 2026-11-03T18:22:37.656Z · progress

**Aufgaben:** COOP-02

Download-Browsertest wählt das neueste Paper-Plugin (0.9.0) statt des ersten Eintrags.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Server. |

**Geänderte Dateien:**

- `tests/e2e/mod-download.e2e.mjs`

## 2026-11-03T18:31:28.782Z · progress

**Aufgaben:** COOP-03

Teambau in der Mod 0.10.0: Teamstand vom Planer oder Paper-Plugin im Spiel (Abschnitte in Inhaberfarbe, Mein Auftrag, /bauplaner team …), Ausgang mit Quittung, Kanal bauplaner:team nur nach Serveranmeldung und /bauplaner team erlauben (Entscheidung Philipp), Website „Mit Spiel abgleichen“. Spieltests Fabric/NeoForge 26.3, Paper 26.3, Browser grün; Kanal echter Client ↔ echtes Plugin offen (TEAMBAU-09).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server; Lagerkisten (COOP-04) hängen sich an TeamChannel.decorate/broadcastStore. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/project/TeamLive.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `docs/TESTING.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `docs/architecture/TEAMBAU.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramHud.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MaterialScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamPayload.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Filter.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/LiveCheck.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlanModel.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/Json.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamColors.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamOutbox.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamPlan.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamState.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamWire.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/TeamTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/neoforge/BridgeNeoForge.java`
- `mods/bauplaner-bridge/paper/build.gradle`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamChannel.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/resources/config.yml`
- `packages/application/src/revisionExport.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveLink.ts`
- `packages/domain/src/teamLink.ts`
- `scripts/bridge_gametest.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/team-live.e2e.mjs`
- `tests/game-check.test.mjs`
- `tests/team-link.test.mjs`

## 2026-11-03T18:38:13.844Z · progress

**Aufgaben:** COOP-03

Mod 0.10.0 (Fabric und NeoForge 26.3) auf #/mod freigegeben: Teambau im Spiel, Teamkanal nur nach /bauplaner team erlauben.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.10.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.10.0.jar`

## 2026-11-03T18:38:37.063Z · progress

**Aufgaben:** SIZE-01

Browsertest Weltkarte: aktuelle Mod im Simulator meldet große Pläne

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |

**Geänderte Dateien:**

- `node_modules`
- `tests/e2e/map-depth.e2e.mjs`

## 2026-11-03T18:41:55.872Z · progress

**Aufgaben:** COOP-03

Weltkarten-Browsertest: simulierte aktuelle Mod meldet auch das Merkmal team (Mod kann … Teambau im Spiel).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore. |

**Geänderte Dateien:**

- `tests/e2e/map-depth.e2e.mjs`

## 2026-11-03T18:44:29.660Z · progress

**Aufgaben:** PROJ-01

Rebase auf main 2e0c984 (COOP-03/04, Mod 0.10.0); Browsersuite 137/138, einziger roter Test map-depth war fremd und ist auf main behoben

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |

## 2026-11-03T18:49:57.179Z · progress

**Aufgaben:** PERF-05

Gesamtoptimierung Runde 1: mitgelieferter Katalog als Datei beim Bauen (Erststart 5,2 s → 1,4 s), Seiten bei Bedarf geladen und im Leerlauf vorgeladen (Einstieg 1,33 MB → 0,72 MB), canonicalJson schneller bei gleicher Ausgabe, plattformfeste Winkelfunktionen (Kolosseum Node/Chromium gleich), Befund PERFORMANCE_AUDIT.md. Geprüft: npm run check, Browser-Suite in Chromium 1243; echte Geräte, Firefox/Safari offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-05 | 🧩 Implementiert · Abnahme offen | 5/7 | O-1 Vorschaubildcache und O-2 Zellen bei Bedarf entpacken; Mod/Plugin-Analyse nach Merge der Teambau-Threads. |

**Geänderte Dateien:**

- `apps/web/src/app/context.tsx`
- `apps/web/src/app/lazyPage.tsx`
- `apps/web/src/app/repository.ts`
- `apps/web/src/jobs/library.ts`
- `apps/web/src/jobs/libraryJob.ts`
- `apps/web/src/main.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/PERFORMANCE_AUDIT.md`
- `package.json`
- `packages/application/src/catalogSnapshot.ts`
- `packages/application/src/index.ts`
- `packages/domain/src/base.ts`
- `packages/domain/src/build/sets/befestigung.ts`
- `packages/domain/src/build/sets/deko.ts`
- `packages/domain/src/build/sets/dorf.ts`
- `packages/domain/src/build/sets/epochen.ts`
- `packages/domain/src/build/sets/garten.ts`
- `packages/domain/src/build/sets/grossbauten.ts`
- `packages/domain/src/build/sets/klassiker.ts`
- `packages/domain/src/build/sets/natur.ts`
- `packages/domain/src/build/sets/sakral.ts`
- `packages/domain/src/editor/forms.ts`
- `packages/domain/src/generators/arena.ts`
- `packages/domain/src/hash.ts`
- `packages/domain/src/terrainDesign.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/stableMath.ts`
- `scripts/build_catalog_snapshot.mjs`
- `scripts/catalog_key.mjs`
- `scripts/perf/measure_start.mjs`
- `scripts/prepare_main_pages.mjs`
- `tests/canonical-json.test.mjs`
- `tests/e2e/catalog-snapshot.e2e.mjs`
- `tests/e2e/library-start.e2e.mjs`
- `tests/stable-math.test.mjs`
- `vite.config.mjs`

## 2026-11-03T18:54:07.036Z · progress

**Aufgaben:** PROJ-01

Dateizuordnung für den PROJ-01-Commit 43fb192 nachgetragen (beim Auflösen der Roadmap-Konflikte verloren); keine Codeänderung.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 0/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |

**Geänderte Dateien:**

- `apps/web/src/app/icons.tsx`
- `apps/web/src/planning.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/project/PlanningTab.tsx`
- `apps/web/src/views/project/tabs.ts`
- `apps/web/src/views/project/updates.css`
- `docs/BLOCKS.md`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/PLAN_MODEL.md`
- `docs/architecture/PROGRAM.md`
- `docs/architecture/SITE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/program.ts`
- `packages/domain/src/site.ts`
- `tests/e2e/program.e2e.mjs`
- `tests/program.test.mjs`

## 2026-11-03T19:04:30.091Z · progress

**Aufgaben:** COOP-04, COOP-05

Paper-Plugin 0.10.0: geprüfte, markierte Lagerkisten (Abschnitt, Zweck, Schutzstufen, Protokoll je Spieler und Trichter, Prüfung mit Abweichung und Siegel, Bedarf je Abschnitt, Teamkanal an die Mod); echte Paper-Server 1.18.2–26.3 grün, Spielerklicks offen (LAGER-02…06).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-04 | 🧩 Implementiert · Abnahme offen | 0/4 | Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md). |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod-Thread veröffentlicht Paper-Jar 0.10.0 mit Teamkanal; danach Abnahme LAGER-01…09 auf Philipps Server. |

**Geänderte Dateien:**

- `apps/web/src/team.css`
- `apps/web/src/testing/TestphaseView.tsx`
- `apps/web/src/testing/testphase.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/project/TeamProof.tsx`
- `assets/ThreeViewer-BA9gr6eN.js`
- `assets/entityScene-BF8iCKwh.js`
- `assets/glShot-CBF6-Y03.js`
- `assets/heavy.worker-Cx-DjMhT.js`
- `assets/idbRepository-B6ttcIAI.js`
- `assets/index-BkcVyq-d.css`
- `assets/index-DCXa3EUQ.js`
- `assets/index-D_KNMrrl.js`
- `assets/index-Wfhc_wz9.css`
- `assets/libraryJob-CJbd3o1D.js`
- `assets/packKit-C_8KQS7S.js`
- `assets/repository-DvDM7-hG.js`
- `assets/repository-DysWJyt9.js`
- `assets/snapshot-BKFzBdhT.js`
- `assets/src-DSLIwO4r.js`
- `assets/src-FclWmkMU.js`
- `assets/updateJob-BUXzDadq.js`
- `assets/versionJob-D2TWQZV5.js`
- `deployment.json`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/LAGERKISTEN.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-paper-0.10.0.jar`
- `index.html`
- `mods/bauplaner-bridge/paper/build.gradle`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndex.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreLedger.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreWorld.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/resources/config.yml`
- `mods/bauplaner-bridge/paper/src/main/resources/plugin.yml`
- `mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndexTest.java`
- `mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/StoreLedgerTest.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/team.ts`
- `scripts/bridge_paperlager.mjs`
- `scripts/bridge_paperteam.mjs`
- `scripts/render_testplan.mjs`
- `scripts/test_bridge_paper_lager.sh`
- `tests/lager.test.mjs`

## 2026-11-03T19:05:43.334Z · progress

**Aufgaben:** COOP-05

Quellcommit der Paper-Jar 0.10.0 nach dem Rebase nachgetragen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-05 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod-Thread veröffentlicht Paper-Jar 0.10.0 mit Teamkanal; danach Abnahme LAGER-01…09 auf Philipps Server. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`

## 2026-11-03T19:07:52.295Z · progress

**Aufgaben:** COOP-01

COOP-01-S04: Bauleute der Projektplanung mit Minecraft-Namen (Builder.player), Team per Knopf in die Planung übernehmen (Beigetretene als Bauleute, Zuweisungen aus den Abschnittsinhabern). Tests team/program und Browsertests grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05). |

**Geänderte Dateien:**

- `apps/web/src/views/project/TeamTab.tsx`
- `docs/TESTING.md`
- `docs/architecture/TEAMBAU.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/program.ts`
- `packages/domain/src/team.ts`
- `tests/e2e/team.e2e.mjs`
- `tests/team.test.mjs`

## 2026-11-03T19:17:47.115Z · progress

**Aufgaben:** PERF-05

Runde 2: dauerhafter Vorschaubildcache (Cache Storage je Render-Revision), Neustart ohne erneutes Rendern; Hauptthread-Blockade beim Neustart 326 ms → 123 ms. Geprüft: npm run check, Browser-Suite in Chromium 1243.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-05 | 🧩 Implementiert · Abnahme offen | 6/8 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |

**Geänderte Dateien:**

- `apps/web/src/thumbnail/Thumb.tsx`
- `apps/web/src/thumbnail/glShot.ts`
- `apps/web/src/thumbnail/thumbStore.ts`
- `docs/TESTING.md`
- `docs/architecture/PERFORMANCE_AUDIT.md`
- `reload.cpuprofile`
- `tests/e2e/thumb-store.e2e.mjs`

## 2026-11-03T19:23:40.842Z · progress

**Aufgaben:** SIZE-01

Olympus-Prüffall (953.000 Blöcke): Übergabe an den Hintergrundrechner als Spalten, Projektberechnung, Export und Werkstatt beschleunigt; Prüfsummen unverändert

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |

**Geänderte Dateien:**

- `apps/web/src/app/useProjectComputation.ts`
- `apps/web/src/computation/client.ts`
- `apps/web/src/computation/project.worker.ts`
- `apps/web/src/computation/protocol.ts`
- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/editor/useDraft.ts`
- `docs/TESTING.md`
- `docs/architecture/SIZE_LIMITS.md`
- `packages/application/src/computationTransport.ts`
- `packages/application/src/index.ts`
- `packages/application/src/projectComputation.ts`
- `packages/application/src/revisionExport.ts`
- `packages/domain/src/compose.ts`
- `packages/domain/src/editor/draft.ts`
- `packages/domain/src/guide.ts`
- `packages/domain/src/hash.ts`
- `packages/domain/src/library.ts`
- `packages/domain/src/materials.ts`
- `packages/domain/src/site.ts`
- `packages/voxel/src/transforms.ts`
- `tests/computation-transport.test.mjs`
- `tests/large-edit.test.mjs`

## 2026-11-03T19:49:18.315Z · progress

**Aufgaben:** GAME-09

Modrinth-Projekt vorbereitet: project.json, Beschreibung EN/DE, Icon, 6 Bilder, CHANGELOG.md, scripts/modrinth_publish.mjs (check/plan/create/sync/release) ohne Actions, Sperre gegen KI-Werkzeugnamen; Tests 4/4, nachgebaute API; echte Veröffentlichung wartet auf Philipps Bestätigung und MODRINTH_TOKEN in neuer Sitzung

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 2/5 | Philipps Bestätigung (Name, Text, Sichtbarkeit, Lizenz) und MODRINTH_TOKEN in der Cloud-Umgebung abwarten, dann create in einer neuen Sitzung. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/gallery/01-hologram.png`
- `mods/bauplaner-bridge/modrinth/gallery/02-placement-helper-shaders.png`
- `mods/bauplaner-bridge/modrinth/gallery/03-sections-xray.png`
- `mods/bauplaner-bridge/modrinth/gallery/04-material-list.png`
- `mods/bauplaner-bridge/modrinth/gallery/05-plan-menu.png`
- `mods/bauplaner-bridge/modrinth/gallery/06-website-link.png`
- `mods/bauplaner-bridge/modrinth/icon.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `scripts/modrinth_publish.mjs`
- `scripts/release_mod.mjs`
- `tests/modrinth.test.mjs`

## 2026-11-03T19:57:31.636Z · progress

**Aufgaben:** PERF-05

Nachtrag: versehentlich eingecheckte Profildatei reload.cpuprofile entfernt, *.cpuprofile ignoriert; Testprotokoll Runde 2 (vorheriger Commit) liegt im PERF-05-Abschnitt von TESTING.md.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-05 | 🧩 Implementiert · Abnahme offen | 6/8 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |

**Geänderte Dateien:**

- `.gitignore`
- `reload.cpuprofile`

## 2026-11-03T20:01:09.951Z · progress

**Aufgaben:** COOP-06

Teamplanung im Planer (Reiter Team: Planung, Fortschritt, Rechte & Übergabe) umgesetzt

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-06 | 🧩 Implementiert · Abnahme offen | 3/5 | Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern. |

**Geänderte Dateien:**

- `apps/web/src/teamplan.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/TeamExchange.tsx`
- `apps/web/src/views/project/TeamPlan.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/TEAMBAU.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/team.ts`
- `packages/domain/src/teamPlan.ts`
- `tests/e2e/teamplan.e2e.mjs`
- `tests/teamPlan.test.mjs`

## 2026-11-03T20:09:28.132Z · progress

**Aufgaben:** GAME-09

Lizenz MIT (Philipp): LICENSE unter mods/bauplaner-bridge, project.json und fabric.mod.json

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 3/5 | Projekt anlegen (create) und 0.10.0 hochladen. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/LICENSE`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/fabric-26.3/src/main/resources/fabric.mod.json`
- `mods/bauplaner-bridge/modrinth/project.json`

## 2026-11-03T20:20:12.136Z · progress

**Aufgaben:** GAME-09

Projekt auf Modrinth angelegt (uL1mPEKJ), 0.10.0 Fabric/NeoForge/Paper hochgeladen, Umgebung je Version über API v3, zur Prüfung eingereicht

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 3/5 | Modrinth-Prüfung abwarten (Status processing → approved); danach jede neue Mod-Version mit modrinth_publish.mjs release. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `mods/bauplaner-bridge/modrinth/project.json`
- `scripts/modrinth_publish.mjs`

## 2026-11-03T20:20:27.809Z · progress

**Aufgaben:** COOP-06

Plugin faltet die COOP-06-Arten (Übergabe mit Annahme, Abwesenheit, erledigte Hinweise) in TeamLog.java wie team.ts; neue Befehle /bp uebergeben, annehmen, ablehnen, abwesend, zurueck, auch über den Teamkanal; echte Paper-Server 1.18.2, 1.21.4, 26.3 grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `docs/architecture/TEAMBAU.md`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/resources/plugin.yml`
- `scripts/bridge_paperteam.mjs`

## 2026-11-03T20:21:00.399Z · progress

**Aufgaben:** PERF-05

Wettlauf im Kartenverlauf behoben: Strg+Z direkt nach dem Löschen (mit Projektlage) ging verloren, weil der Schritt erst nach dem Speichern der Projektlage im Verlauf stand; Änderung, Rückgängig und Wiederholen laufen jetzt nacheinander. Nachgestellt mit CPU-Drosselung: alt rot, neu grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-05 | 🧩 Implementiert · Abnahme offen | 6/8 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |

**Geänderte Dateien:**

- `apps/web/src/views/map/useMapHistory.ts`
- `docs/TESTING.md`

## 2026-11-03T20:27:03.185Z · progress

**Aufgaben:** GAME-10

Befehlsseite im Plan-Menü (Mod 0.11.0): 98 Befehle von Mod und Plugin per Klick, Status, Antworten; Spieltests Fabric (echte Klicks) und NeoForge bestanden, Serverbefehle mit echtem Plugin offen (MOD-16).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/ModView.tsx`
- `docs/TESTING.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/McCompat.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandContext.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/ReplyLog.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/neoforge/BridgeNeoForge.java`
- `scripts/bridge_gametest.mjs`

## 2026-11-03T20:34:44.327Z · progress

**Aufgaben:** GAME-10

Katalog um die COOP-06-Serverbefehle (uebergeben, annehmen, ablehnen, abwesend, zurueck) ergänzt, 103 Befehle; JUnit liest die Plugin-Befehle aus den Quellen. Spieltests Fabric und NeoForge mit Endstand bestanden.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/TESTING.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.11.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.11.0.jar`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`

## 2026-11-03T20:38:19.401Z · progress

**Aufgaben:** COOP-05

Vorbereitung Team-Raum (TEAM_LIVE.md): TeamUplink-Schnittstelle, jedes vom Server geschriebene Ereignis (Befehle, Teamkanal, Baunachweis, Lager) geht einmal an den Uplink; TeamModule.receive nimmt Raum-Ereignisse über TeamLog.add an, ohne Echo. Standard: kein Uplink.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-05 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod-Thread veröffentlicht Paper-Jar 0.10.0 mit Teamkanal; danach Abnahme LAGER-01…09 auf Philipps Server. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamUplink.java`

## 2026-11-03T20:41:53.052Z · progress

**Aufgaben:** GAME-10

Paper-Jar 0.11.0 (Übergabe, Abwesenheit aus COOP-06) mit freigegeben, Änderungsliste ergänzt; Paper-26.3-Teamtest mit dieser Jar bestanden.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `docs/TESTING.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.11.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.11.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.11.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`

## 2026-11-03T20:52:59.449Z · progress

**Aufgaben:** CORE-01, CORE-02, CORE-03, STORE-01, MAT-01, BUILD-01, LIB-01, GEN-01, OPS-01, PLAN-01, ARCH-01, ARCH-02, DOC-01, STORE-02, QA-01, QA-02, QA-03, UI-01, UI-02, STAB-01, OPS-02, OPS-03, LICENSE-01, PROFILE-01, NBT-01, FORMAT-01, FORMAT-02, MAT-02, MAT-03, MAT-04, DIFF-01, PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, VIEW-01, VIEW-02, BLOCK-01, BLOCK-02, GFX-01, MODEL-01, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, UPDATE-01, LIB-02, LIB-03, WORLD-02, BUILD-05, TERRAIN-01, TERRAIN-02, BUILD-06, GEN-02, MAP-01, MAP-03, MAP-04, MAP-02, GAME-01, GAME-02, GAME-07, GAME-08, GAME-03, WORLD-IMPORT-01, BACKUP-02, TEAM-01, AUTH-01, TEAM-02, TEAM-03, GAME-04, GAME-05, GAME-06, LAGER-01, OPS-04, DEFER-01, DEFER-02, LIB-04, ENTITY-01, LIB-05, LIB-06, BASE-01, SPLIT-01, GROSS-01, MAP-05, MAP-06, QA-04, GEN-03, SIZE-01, COOP-01, COOP-02, COOP-03, COOP-04, COOP-05, COOP-06, PROJ-01, GAME-09, GAME-10

Roadmap nach 12 Bereichen neu geordnet: je Aufgabe Bereich, zuständiger Thread, was nur Philipp tun kann und verwaiste Arbeit; Eingänge IN-01…07 aus Projektchat, Threads, Konzeptdokumenten und GitHub-Issues. Nur Roadmap-Werkzeug und Doku, kein Anwendungscode; Zuordnung der Threads Stand 03.11.2026 20:50.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| CORE-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| CORE-02 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| CORE-03 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| STORE-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| MAT-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| BUILD-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| LIB-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| GEN-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| OPS-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| ARCH-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |
| ARCH-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme der Migration mit echten Browserdaten (S05); danach kompakte Laufzeitform der Zellen als Folge von PERF-02. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Aktuelle Prüf-/Main-/Live-Nachweise im nächsten sachlichen Quellblock nachführen; keine selbstreferenzielle Deploymentfolge. |
| STORE-02 | ✅ Im beschriebenen Umfang geprüft | 3/3 | CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02. |
| QA-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Suite nach relevanten Änderungen wiederholen; echte Geräte in QA-02 und große Worker-Browserlatenz in PERF-01 prüfen. |
| QA-02 | ⏳ Offen | 0/2 | Geräte-/Browsermatrix und reproduzierbare Aufgaben definieren. |
| QA-03 | ✅ Im beschriebenen Umfang geprüft | 7/7 | Bei neuen Ausfällen zuerst nach Lesen vor dem Laden (Manifest, IndexedDB, ResizeObserver, Worker-Neuberechnung) suchen. |
| UI-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Oberflächenregression bei Themen-/Layoutänderungen weiterführen; echte Geräte separat in QA-02. |
| UI-02 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Echte Geräteprüfung (Safari/iPhone, Touch) in QA-02; weitere Hauptbereiche (z. B. Karte MAP-01) als Eintrag in nav.ts anhängen. |
| STAB-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Echten Renderingfehler auslösen und Wiederaufnahme im Browser prüfen. |
| OPS-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei tatsächlichem Vorfall bekannten Build neu bestätigen und Recovery regulär ohne Force vorbereiten; Livehashes danach gesondert prüfen. |
| OPS-03 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig. |
| LICENSE-01 | ⏳ Offen | 0/2 | Eigene und fremde Bestandteile inventarisieren. |
| PROFILE-01 | ⏳ Offen | 0/2 | Registryreport und Zielversion mit Herkunft/Hash dokumentieren. |
| NBT-01 | ⏳ Offen | 0/2 | Zu unterstützende NBT-Familien und Positions-/Ausrichtungsregeln festlegen. |
| FORMAT-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Echte WorldEdit-Dateien importieren, exportieren und im Referenzwerkzeug vergleichen. |
| FORMAT-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Export im Spiel mit Litematica laden (Philipps PC, Fabric 26.3) – FORMAT-02-S02. |
| MAT-02 | ⏳ Offen | 0/2 | Vorhandene Regeln mit Profilreport abgleichen. |
| MAT-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Varianten im Zielprofil und in der Oberfläche prüfen. |
| MAT-04 | ⏳ Offen | 0/2 | Zustandsmatrix und Formfamilien mit Profilbeleg definieren. |
| DIFF-01 | 🧩 Implementiert · Abnahme offen | 1/3 | Verschiebung von echten Geometrieänderungen unterscheiden. |
| PERF-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Messung bei Rechenkernänderungen wiederholen; Übertragungs-/Invalidierungsarbeit in PERF-02, vollständige React-/Gerätelatenz gesondert prüfen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Gemessene Structured-Clone-/Worker-Rückgabekosten reduzieren; selektive Geometrie-/Fortschrittsinvalidierung zuerst mit vollständigen semantischen Regressionen absichern. |
| PERF-03 | ⏳ Offen | 0/3 | Bundleanteile und UI-Verantwortungen messen. |
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06); GPU-Upload großer Szenen bleibt im Hauptthread. |
| PERF-05 | 🧩 Implementiert · Abnahme offen | 6/8 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |
| VIEW-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Aktuelle GPU-/Touch-Prüfung mit negativen Koordinaten und allen Schnittachsen. |
| VIEW-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Mojang-Download im echten Browser und weitere Browser prüfen; Registerdaten an PROFILE-01 binden, sobald es auf main liegt. |
| BLOCK-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme im Spiel; PROFILE-01 kann die Berichtsfakten übernehmen. Die Katalogfehler aus der Spielprüfung behebt BLOCK-02. |
| BLOCK-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme im Spiel (S06): geänderte Gebäude (z. B. Werkstatt, Windmühle, Torhaus, Stadthaus) per Litematic setzen. |
| GFX-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Prüfung auf echten Geräten und Browsern; danach Biomfarben und leuchtende Blockentities. |
| MODEL-01 | 🧩 Implementiert · Abnahme offen | 4/6 | Dateien in Blender und Slicern prüfen und ein Testdruck; danach Flächenzusammenfassung (S06). Export läuft seit PERF-04 im Worker. |
| EDIT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Geräteprüfung (QA-02); Gruppenziehen direkt im 3D-Bild als Folgeschritt. |
| EDIT-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Picking an 3D-Blockflächen; Registerlücken mit PROFILE-01-Serverreport schließen; Spielprüfung. |
| EDIT-03 | 🧩 Implementiert · Abnahme offen | 5/5 | Picking an 3D-Blockflächen; Spielprüfung der Schablonen-Zustände (Tür, Treppe, Laterne). |
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Spielprüfung gespiegelter Zustände; danach Gelände-Werkzeuge auf Projektgelände (eigener Thread) und Symmetrie/Kurven im Mod. |
| EDIT-05 | 🧩 Implementiert · Abnahme offen | 6/7 | EDIT-05-S07: Abnahme durch Philipp in der Werkstatt (Zauberstab, Stapeln, Extrudieren, Wendel) und Spielprüfung gestapelter/gedrehter Bauteile mit Ausstattung. |
| UPDATE-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Echtgeräteabnahme (QA-02); Teamreihenfolge der Updateoperationen in TEAM-02. |
| LIB-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Rückmeldung zur Bedienung der Sammlungen einholen. |
| LIB-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen. |
| WORLD-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Kuratierte Filter-/Treffernachweise bei Katalogänderungen fortführen; keine weitere Karte ohne tatsächliche Assets. |
| BUILD-05 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Gelände-/Hanglagen und Türausrichtung zum Weg als eigene Folgeaufgabe; Echtgeräteabnahme mit QA-02. |
| TERRAIN-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit eigener Welt (S05); danach Weg mit Stufen/Kurven und Stützmauern als Blöcke als eigene Folgeaufgabe. |
| TERRAIN-02 | 🧩 Implementiert · Abnahme offen | 5/7 | Abnahme mit eigener Welt (S05); Wegstufen als Treppen (S07). |
| BUILD-06 | 🧩 Implementiert · Abnahme offen | 5/5 | Echtgeräte- und Druckerabnahme mit QA-02; Philipps Spieltest mit Mod-Aufnahme (WorldAnchor) auf seinem Server. |
| GEN-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Generierte Bauten (v. a. Treppenhaus, Torhaus-Wehrgang, Hafen) im Spiel abnehmen; Treppenhaus-Anbau an Haus als Anlage erwägen. |
| MAP-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02. |
| MAP-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server. |
| MAP-04 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); denkbare Folge: benannte Gruppen/Sperren mit Schemaerweiterung, abgestimmt mit der Mod. |
| MAP-02 | ⏳ Offen | 0/2 | URL-/Markerformate anhand Primärquellen pro Provider verifizieren. |
| GAME-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| GAME-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp testet die .jar aus /mnt/project-files/mod/ auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md). |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 8/10 | Philipp testet 0.7.0 auf server.lmnt-gaming.net (Bauabschnitte aus seinem Projekt, Röntgensicht mit Shader); danach Stufe 6. |
| GAME-08 | 🧩 Implementiert · Abnahme offen | 4/4 | Protokoll 3: Rückrichtung „Markierung im Spiel setzen → Weltplan“ mit Zeitstempel je Eintrag (siehe LIVE_LINK.md); Forge und Paper ohne Live-Verbindung. |
| GAME-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |
| WORLD-IMPORT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Mit einer Kopie von Philipps eigener 26.3-Welt (Modpack) einen Ausschnitt übernehmen und ein platziertes Projekt prüfen. |
| BACKUP-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen. |
| TEAM-01 | ⏳ Offen | 0/2 | API, Betriebsmodell und Kostenrahmen dokumentieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |
| AUTH-01 | ⏳ Offen | 0/2 | Gast-/Kontovertrag und serverseitige Rechte definieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |
| TEAM-02 | ⏳ Offen | 0/2 | Operation-ID, Revisionsprüfung und Wiederholung serverseitig umsetzen. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |
| TEAM-03 | ⏳ Offen | 0/2 | Zuständigkeiten und Lagerbuchungen versionieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |
| GAME-04 | 🚧 In Arbeit | 3/4 | Abnahme auf Philipps eigenem Paper-Server (GAME-04-S04). |
| GAME-05 | 🧩 Implementiert · Abnahme offen | 3/4 | Forge-Spieltest: kopfloser Client bleibt im Ladebildschirm stehen; auf einem Rechner mit Bildschirm (scripts/test_bridge_ingame_forge.sh forge) oder durch Philipp prüfen, dann Forge-Jar bereitstellen. |
| GAME-06 | ⏳ Offen | 0/1 | Nach TEAM-02 spezifizieren. |
| LAGER-01 | ⏳ Offen | 0/2 | Inventar-/NBT-Rechte und Herkunft der Aufnahme festlegen. |
| OPS-04 | ⏳ Offen | 0/2 | Monitoring, Datenmigration, Lösch-/Aufbewahrung und Wiederanlauf definieren. |
| DEFER-01 | ⏸ Zurückgestellt | 0/1 | Nur nach neuem ausdrücklichem Nutzerauftrag neu bewerten. |
| DEFER-02 | ⏸ Zurückgestellt | 0/1 | Erst bei konkretem Bedarf und ausdrücklichem Auftrag spezifizieren. |
| LIB-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen. |
| ENTITY-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Export mit Entities im Spiel prüfen; Entities bei Auswahl-Verschieben in der Werkstatt mitnehmen; Truhen-/Schildinhalte bearbeiten. |
| LIB-05 | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp. |
| LIB-06 | 🧩 Implementiert · Abnahme offen | 5/7 | Abnahme durch Philipp (S06) und erster echter Beitrag (S07). |
| BASE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); danach Küstenlinie aus der Geländeaufnahme und Wegstufen. |
| SPLIT-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit echten Dateien (S05). |
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); Großbauten-Set (S05). |
| MAP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können. |
| MAP-06 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag). |
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |
| GEN-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp baut das Kolosseum im Spiel nach (BIB-14); danach Feinschliff (Statuen in den Attika-Fenstern, Treppen im Hypogäum). |
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |
| COOP-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05). |
| COOP-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Server. |
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore. |
| COOP-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md). |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod-Thread veröffentlicht Paper-Jar 0.10.0 mit Teamkanal; danach Abnahme LAGER-01…09 auf Philipps Server. |
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern. |
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |
| GAME-09 | 🚧 In Arbeit | 3/5 | Modrinth-Prüfung abwarten (Status processing → approved); danach jede neue Mod-Version mit modrinth_publish.mjs release. |
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `scripts/roadmap.mjs`
- `tests/roadmap.test.mjs`

## 2026-11-03T20:57:38.742Z · progress

**Aufgaben:** GAME-05, GAME-07, GAME-08, GAME-11

Mod-Punkte aus der Roadmap übernommen (Thread „Teambau und Befehle in der Mod ausbauen“): Forge-Test, Stufe 6, Protokoll 3, neu GAME-11 weitere Versionen und Launcher (IN-04 zugeteilt).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-05 | 🧩 Implementiert · Abnahme offen | 3/4 | Forge-Spieltest: kopfloser Client bleibt im Ladebildschirm stehen; auf einem Rechner mit Bildschirm (scripts/test_bridge_ingame_forge.sh forge) oder durch Philipp prüfen, dann Forge-Jar bereitstellen. |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 8/10 | Philipp testet 0.7.0 auf server.lmnt-gaming.net (Bauabschnitte aus seinem Projekt, Röntgensicht mit Shader); danach Stufe 6. |
| GAME-08 | 🧩 Implementiert · Abnahme offen | 4/5 | Protokoll 3: Rückrichtung „Markierung im Spiel setzen → Weltplan“ mit Zeitstempel je Eintrag (siehe LIVE_LINK.md); Forge und Paper ohne Live-Verbindung. |
| GAME-11 | ⏳ Offen | 0/4 | Versionsmatrix mit Philipp abstimmen (welche Versionen braucht er wirklich?). |

## 2026-11-03T20:58:46.186Z · progress

**Aufgaben:** SIZE-01

Senden ins Spiel repariert: leere Zellen als Luft statt Strukturleere (Mod nahm sie als Blöcke, Olympus über 4 Mio.), gedrehte ältere Zustände (Laub, Köpfe) nicht mehr gesperrt; Sendeprüfung mit dem Mod-Leser für gedrehte Teile, alle Großprojekte und Olympus

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |

**Geänderte Dateien:**

- `apps/web/src/views/map/WorldMapView.tsx`
- `docs/TESTING.md`
- `docs/architecture/LIVE_LINK.md`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/DumpPlan.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveLink.ts`
- `packages/voxel/src/states.ts`
- `scripts/bridge_sendcheck.mjs`
- `scripts/test_bridge.sh`
- `tests/states.test.mjs`

## 2026-11-03T21:00:35.000Z · progress

**Aufgaben:** COOP-07

Team live ohne Dateien: Team-Raum-Dienst, Sync-Kern, Live-Abgleich im Planer, Einladungslink, Planstand live, Serverschlüssel für Messungen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-07 | 🧩 Implementiert · Abnahme offen | 4/6 | Plugin-Thread: RoomLink gegen team-room v1; Philipp: Cloudflare-Konto, wrangler deploy, Spieltest. |

**Geänderte Dateien:**

- `packages/domain/src/teamSync.ts`
- `packages/domain/src/team.ts`
- `services/team-room/src/core.js`
- `services/team-room/src/index.js`
- `services/team-room/wrangler.toml`
- `services/team-room/README.md`
- `apps/web/src/views/project/roomClient.ts`
- `apps/web/src/views/project/TeamRoom.tsx`
- `apps/web/src/views/project/TeamJoinView.tsx`
- `apps/web/src/views/project/teamTransfer.ts`
- `apps/web/src/views/project/TeamOpen.tsx`
- `apps/web/src/views/project/TeamExchange.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `apps/web/src/app/router.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/team.css`
- `docs/architecture/TEAM_LIVE.md`
- `tests/team-room.test.mjs`
- `tests/e2e/team-room.e2e.mjs`
- `scripts/team_room_smoke.mjs`
- `apps/web/src/testing/testplan.ts`
- `docs/architecture/TEAMBAU.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `services/team-room/.gitignore`
- `tests/router.test.mjs`

## 2026-11-03T21:12:09.080Z · progress

**Aufgaben:** GAME-07

Mod 0.11.1: PlanModel überspringt structure_void wie Luft (Fund der Sendeprüfung aus SIZE-01); Brückenprüfung, Sendeprüfung und Spieltests Fabric/NeoForge grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 8/10 | Philipp testet 0.7.0 auf server.lmnt-gaming.net (Bauabschnitte aus seinem Projekt, Röntgensicht mit Shader); danach Stufe 6. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlanModel.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java`

## 2026-11-03T21:12:09.599Z · progress

**Aufgaben:** GAME-07

Mod 0.11.1 (Fabric, NeoForge) auf #/mod freigegeben.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 8/10 | Philipp testet 0.7.0 auf server.lmnt-gaming.net (Bauabschnitte aus seinem Projekt, Röntgensicht mit Shader); danach Stufe 6. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.11.1.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.11.1.jar`

## 2026-11-03T21:19:45.021Z · progress

**Aufgaben:** LAGER-01, PERF-03, LICENSE-01, STAB-01

Aufräumen: STAB-01-S02 Renderingfehler im Browser geprüft und ErrorBoundary für React 19 korrigiert; LICENSE-01 mit MIT erledigt; LAGER-01 mit COOP-04/05 und PERF-03 mit PERF-05 abgeglichen; Issues #2–#4 geschlossen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LAGER-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf dem Paper-Server (Thread „Server-Plugin mit geprüften Lagerkisten“). |
| PERF-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Filterzustände der Bibliothek beim Seitenwechsel im Browser prüfen. |
| LICENSE-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Erledigt. Neue fremde Inhalte nach den Regeln in LICENSING.md prüfen. |
| STAB-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Erledigt. |

**Geänderte Dateien:**

- `LICENSE`
- `README.md`
- `apps/web/src/app/ErrorBoundary.tsx`
- `docs/COMMUNICATION.md`
- `docs/LICENSING.md`
- `docs/TESTING.md`
- `package-lock.json`
- `package.json`
- `tests/e2e/render-crash.e2e.mjs`

## 2026-11-03T21:33:16.961Z · progress

**Aufgaben:** COOP-05

Plugin-Uplink zum Team-Raum (team-room v1): RoomLink.java mit /bp team verbinden, trennen, raum; Header-Abruf, Live-Kanal mit Cursor und Outbox, Batches bis 200, Backoff, 4401/4403. Nur aktiv nach /bp team verbinden; Test gegen services/team-room steht noch aus.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-05 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod-Thread veröffentlicht Paper-Jar 0.10.0 mit Teamkanal; danach Abnahme LAGER-01…09 auf Philipps Server. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`

## 2026-11-03T21:37:46.206Z · progress

**Aufgaben:** PROFILE-01, VIEW-02, EDIT-02, NBT-01, MAT-02, MAT-04, DIFF-01, PERF-02, FORMAT-01, QA-02

PROFILE-01: verbindliches Java-26.3-Profil aus der offiziellen server.jar (SHA-1 33680f5f…, JDK 25): Items, Item-Tags, 1696 Rezepte, 347 Brennstoffe (cooking_fuel) mit Quellhashes; Blockregister (VIEW-02/EDIT-02) direkt aus dem Serverbericht statt Client-Blockstates (264 fehlende Property-Werte ergänzt, Rahmen sind Entities); checkProfileStates: DataVersion allein behauptet keine Verträglichkeit, Profilprüfung im Gebäudeblatt. Thread „Liegengebliebene Datenpakete abarbeiten“ übernimmt die verwaisten Codex-Pakete (IN-06). Prüfung: Node-Tests; Browseransicht nur gebaut. Browser: Katalog-E2E prüft die Profilprüfung im Gebäudeblatt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROFILE-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme: Profilprüfung im Gebäudeblatt an einer echten älteren Schem-/Litematic-Datei ansehen (Testphase). |
| VIEW-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Mojang-Download im echten Browser und weitere Browser prüfen (Testphase); Register ist seit PROFILE-01 an den Serverbericht gebunden. |
| EDIT-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Picking an 3D-Blockflächen; Spielprüfung. Registerlücken sind seit PROFILE-01 geschlossen. |
| NBT-01 | ⏳ Offen | 0/2 | Zu unterstützende NBT-Familien und Positions-/Ausrichtungsregeln festlegen. |
| MAT-02 | ⏳ Offen | 0/2 | Vorhandene Regeln mit Profilreport abgleichen. |
| MAT-04 | ⏳ Offen | 0/2 | Zustandsmatrix und Formfamilien mit Profilbeleg definieren. |
| DIFF-01 | 🧩 Implementiert · Abnahme offen | 1/3 | Verschiebung von echten Geometrieänderungen unterscheiden. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Gemessene Structured-Clone-/Worker-Rückgabekosten reduzieren; selektive Geometrie-/Fortschrittsinvalidierung zuerst mit vollständigen semantischen Regressionen absichern. |
| FORMAT-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Echte WorldEdit-Dateien importieren, exportieren und im Referenzwerkzeug vergleichen. |
| QA-02 | ⏳ Offen | 0/2 | Geräte-/Browsermatrix und reproduzierbare Aufgaben definieren. |

**Geänderte Dateien:**

- `apps/web/src/views/library/BuildingSheet.tsx`
- `docs/architecture/BLOCK_EDITOR.md`
- `docs/architecture/BLOCK_MODELS.md`
- `docs/architecture/VERSION_PROFILE.md`
- `packages/domain/src/profileRecipes.ts`
- `packages/voxel/src/blockRegistry.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/profile.ts`
- `packages/voxel/src/profileData.ts`
- `packages/voxel/src/states.ts`
- `scripts/gen_block_data.py`
- `scripts/gen_profile.mjs`
- `tests/block-logic.test.mjs`
- `tests/e2e/catalog.e2e.mjs`
- `tests/profile.test.mjs`
- `tests/states.test.mjs`

## 2026-11-03T21:58:17.986Z · progress

**Aufgaben:** COOP-07

Paper-Plugin im Team-Raum: RoomLink (verbinden/trennen/raum, Planstand aus dem Raum, Ereignisse live hoch und runter, Cursor und Outbox über Neustart, 4401/4403); echte Paper-Server 1.18.2, 1.21.4, 26.3 gegen wrangler dev grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-07 | 🧩 Implementiert · Abnahme offen | 5/6 | Plugin-Thread: RoomLink gegen team-room v1; Philipp: Cloudflare-Konto, wrangler deploy, Spieltest. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `scripts/bridge_paperroom.mjs`
- `scripts/test_bridge_paper_room.sh`

## 2026-11-03T22:11:54.050Z · progress

**Aufgaben:** GAME-10

Mod 0.11.2: Team-Raum-Befehle (raum, trennen) auf der Befehlsseite, Test liest team-Unterbefehle aus dem Plugin; Paper-Jar mit RoomLink.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`

## 2026-11-03T22:11:54.563Z · progress

**Aufgaben:** GAME-10

Mod 0.11.2 (Fabric, NeoForge, Paper) auf #/mod freigegeben.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.11.2.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.11.2.jar`
- `downloads/mod/bauplaner-bridge-paper-0.11.2.jar`

## 2026-11-03T22:26:37.867Z · progress

**Aufgaben:** NBT-01, MAT-02, MAT-04

NBT-01: BlockEntity-Familien für alle 49 Typen des Profils (relativ wie Minecraft-Strukturen = gelöst; Bienen-Blumenposition, Sculk-Ereignisse, Spawner-Pos, Befehle mit Koordinaten, Strukturblock beim Drehen, Endtor, Mod-Typen = ungelöst ohne NBT-Verlust; eigene x/y/z/Pos wandern mit). MAT-02: Katalog gegen 1696 Profilrezepte geprüft, Funde behoben (iron_chain statt chain, Quarzziegel 4, Holzkohle nur aus brennbaren Stämmen), Pappel als Holzfamilie, 147 fehlende Bauitems mit Profilrezept, Alternativen je Arbeitsschritt, Brennstoffbilanz aus cooking_fuel. MAT-04: Kupfermatrix aus Weathering-Klassen (15 Familien × 4 Stufen × Wachs), acht Kupfer-Variantensätze, Tausch behält Properties und Truhen-NBT, Rezepte aller Stufen. Prüfung: Node-Tests (789), Browser: Rohstoffe/Baustelle/Katalog.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| NBT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme im Spiel: gedrehtes Bauteil mit Truhen/Schildern exportieren und in 26.3 laden (Testphase). Strukturblock-Adapter nur bei Bedarf. |
| MAT-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme in der Testphase: Rohstoffliste eines großen Bauwerks mit dem Spiel vergleichen. |
| MAT-04 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme: Kupfervariante eines Bauwerks im Planer erzeugen und im Spiel ansehen (Testphase). |

**Geänderte Dateien:**

- `apps/web/src/style.css`
- `apps/web/src/views/project/RawMaterialsPanel.tsx`
- `docs/architecture/MATERIALS.md`
- `docs/architecture/NBT_TRANSFORMS.md`
- `docs/architecture/SCHEM_VIEWS.md`
- `docs/architecture/VOXEL_CONTRACT.md`
- `packages/domain/src/copper.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/materialLab.ts`
- `packages/domain/src/recipeProfile.ts`
- `packages/domain/src/recipes.ts`
- `packages/domain/src/variants.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/nbtTransforms.ts`
- `packages/voxel/src/profileData.ts`
- `packages/voxel/src/transforms.ts`
- `scripts/gen_profile.mjs`
- `tests/copper.test.mjs`
- `tests/e2e/recipes.e2e.mjs`
- `tests/nbt-transforms.test.mjs`
- `tests/recipe-profile.test.mjs`
- `tests/recipes.test.mjs`
- `tests/variants.test.mjs`
- `tests/voxel.test.mjs`

## 2026-11-03T22:26:42.450Z · progress

**Aufgaben:** DIFF-01

DIFF-01: Vergleich erkennt eine Verschiebung des ganzen Stands (Eck-Ausrichtungen + Stimmen seltener Zustände, Materialtausch wird nie als Verschiebung gedeutet; Hinweis mit Schalter ohne Ausgleich), neue Art „anderer Inhalt“ für BlockEntity-Änderungen (Kisteninhalt, Schild, Banner, Name; eigene Positionsfelder zählen nicht), Zustandsänderungen aus Nachbarn als abgeleitet markiert, betroffene Ebenen für Bauschritte. Updates vergleichen weiter fest am Pivot. Prüfung: Node-Tests (794).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| DIFF-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme in der Testphase: zwei Stände eines verschobenen Bauwerks vergleichen. |

**Geänderte Dateien:**

- `apps/web/src/jobs/diffJob.ts`
- `apps/web/src/schem.css`
- `apps/web/src/schem/DiffView.tsx`
- `apps/web/src/views/project/UpdatesTab.tsx`
- `docs/architecture/SCHEM_VIEWS.md`
- `packages/domain/src/updates.ts`
- `packages/voxel/src/diff.ts`
- `packages/voxel/src/index.ts`
- `tests/diff-shift.test.mjs`
- `tests/variants.test.mjs`

## 2026-11-03T22:26:51.801Z · progress

**Aufgaben:** FORMAT-01, QA-02, PERF-02

FORMAT-01-S02: Rundlauf-Prüfwerkzeug npm run format:check-schem (Import → Export → Import, Zellen/Zustände/Offset/BlockEntities/Entities, unabhängiger Verifier), Import liest WorldEdit-WEOffset und meldet den Einfügepunkt; echte WorldEdit-Datei von Philipp offen. QA-02-S01: Gerätematrix docs/testing/GERAETEMATRIX.md und Testplanbereich GERAET-01…06; echte Geräte offen. PERF-02-S03 an den Performance-Thread übergeben. STATUS.md aktualisiert.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| FORMAT-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Hochgeladene WorldEdit-Datei mit npm run format:check-schem prüfen; Befunde beheben. |
| QA-02 | 🚧 In Arbeit | 1/2 | Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 2/3 | PERF-02-S03 zusammen mit PERF-05-S08 (Zellen erst bei Bedarf entpacken) im Performance-Thread umsetzen; beide ändern compose/Entpacken. Übergabe abgestimmt am 03.11.2026. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/SCHEM_EXPORT.md`
- `docs/testing/GERAETEMATRIX.md`
- `docs/testing/TESTPLAN.md`
- `package.json`
- `packages/formats/src/schem.ts`
- `scripts/check_schem_roundtrip.mjs`
- `tests/schem-roundtrip.test.mjs`

## 2026-11-03T23:02:57.928Z · progress

**Aufgaben:** PERF-02, PERF-05

PERF-02-S03 selektive Neuberechnung (computeGeometry/computeSite, sameGeometry vergleicht genau die Geometrieeingaben; Fortschritt, Baustelle, Name ohne Worker), Besitzer als Zahlen übertragen, doppelte Arbeit in Material/Anleitung entfernt (gleiche Prüfsummen, computeProject 2,2 → 1,85 s, Rückweg 0,8 → 0,45 s bei 256 000 Zellen); PERF-05-S08 Zellen erst beim Lesen entpacken (Heap nach Neustart 42 → 18 MB). npm run check grün, Browser-Suite 149/149.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-02 | 🧩 Implementiert · Abnahme offen | 3/3 | PERF-02-S03 zusammen mit PERF-05-S08 (Zellen erst bei Bedarf entpacken) im Performance-Thread umsetzen; beide ändern compose/Entpacken. Übergabe abgestimmt am 03.11.2026. |
| PERF-05 | 🧩 Implementiert · Abnahme offen | 7/8 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |

**Geänderte Dateien:**

- `apps/web/src/app/useProjectComputation.ts`
- `apps/web/src/jobs/library.ts`
- `apps/web/src/views/ProjectsView.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/PERFORMANCE_AUDIT.md`
- `packages/application/src/computationTransport.ts`
- `packages/application/src/index.ts`
- `packages/application/src/projectComputation.ts`
- `packages/domain/src/compose.ts`
- `packages/domain/src/connectors.ts`
- `packages/domain/src/guide.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/materials.ts`
- `packages/domain/src/ownerWire.ts`
- `packages/domain/src/revisionExport.ts`
- `packages/domain/src/versionStorage.ts`
- `packages/voxel/src/validation.ts`
- `tests/lazy-cells.test.mjs`
- `tests/owner-wire.test.mjs`
- `tests/selective-recompute.test.mjs`

## 2026-11-04T01:15:21.000Z · progress

**Aufgaben:** COOP-07

Team-Raum ausgerollt unter https://bauplaner-team.team-room.workers.dev und im Planer voreingestellt; Planbereitschaft erst mit dem Planstand der Freigabe; Planer (zwei Browser) und Paper-Plugin gegen den echten Dienst geprüft.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl im Thread „Anbindung von Planer, Mod und Server neu denken“ (LINK-05). |

**Geänderte Dateien:**

- `apps/web/src/views/project/roomClient.ts`
- `apps/web/src/views/project/TeamRoom.tsx`
- `tests/e2e/team-room.e2e.mjs`
- `docs/architecture/TEAM_LIVE.md`
- `services/team-room/README.md`

## 2026-11-04T01:49:58.384Z · progress

**Aufgaben:** PROD-01, PROD-02, PROD-03, PROD-04

Reiter Produktion: 34 Farmarten, Farmliste und Ertragsbuch (bucht ins Lager, gemessene Raten), Deckung/Engpass, Materialbereitschaft je Abschnitt gegen Zeitplan, Lohnt-sich-Vorschläge mit Amortisation, Öfen/Brennstoff netto, Lager/Logistik, AFK-Platz, Farmen aus Projekt und Weltkarte, Sammelaufträge je Bauleute. npm run check grün (818), Browser-Suite 151/151; Abnahme PROJ-12/13 offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROD-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-12; später Erträge aus geprüften Lagerkisten (COOP-05) ins Ertragsbuch. |
| PROD-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-13. |
| PROD-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Später: Ofenstraße aus dem Katalog direkt vorschlagen und in die Planung legen. |
| PROD-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin. |

**Geänderte Dateien:**

- `apps/web/src/production.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/ProductionTab.tsx`
- `apps/web/src/views/project/SiteTab.tsx`
- `apps/web/src/views/project/tabs.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/PRODUCTION.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/production.ts`
- `packages/domain/src/productionPlan.ts`
- `packages/domain/src/site.ts`
- `tests/e2e/production.e2e.mjs`
- `tests/production.test.mjs`

## 2026-11-04T02:19:40.131Z · progress

**Aufgaben:** LINK-01, LINK-02, LINK-03, LINK-04, LINK-05, LINK-06

Server ohne Befehle (Mod/Plugin 0.12.0): Plugin richtet sich selbst ein, Kopplung per Klick (OP), signierte Steuernachrichten statt /bp-Befehlen, Planer-Bereich auf #/mod, zweiter Weg über den Team-Raum (iPad, Freigabe-Link). Geprüft: Einheiten, Browser 1400/390/820 px, echter Paper 1.21.11 über Mod-Kanal und Team-Raum (wrangler dev), Fabric/NeoForge 26.3 Spieltest. Offen: Abnahme bei Philipp, Team-Raum-Deploy, LINK-06.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LINK-01 auf Philipps Server. |
| LINK-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Plan-Upload aus dem Planer; Abnahme LINK-02. |
| LINK-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LIVE-01 in Philipps Modpack. |
| LINK-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp. |
| LINK-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme vom iPad. |
| LINK-06 | ⏳ Offen | 0/2 | Nach Abnahme von LINK-01…05. |

**Geänderte Dateien:**

- `apps/web/src/catalog.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/ServerPanel.tsx`
- `apps/web/src/views/mod/serverClient.ts`
- `apps/web/src/views/project/TeamExchange.tsx`
- `apps/web/src/views/project/TeamJoinView.tsx`
- `apps/web/src/views/project/TeamLive.tsx`
- `apps/web/src/views/project/TeamRoom.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/AUTO_LINK.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/TEAMBAU.md`
- `docs/architecture/TEAM_LIVE.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LinkPrompt.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/TeamTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/LiveLinkScenario.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/LinkCore.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerLink.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamChannel.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/LinkCoreTest.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/serverControl.ts`
- `scripts/bridge_gametest.mjs`
- `scripts/bridge_paperlink.mjs`
- `scripts/test_bridge_paper_link.sh`
- `services/team-room/src/core.js`
- `services/team-room/src/index.js`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/server-link.e2e.mjs`
- `tests/server-link.test.mjs`
- `tests/team-room.test.mjs`

## 2026-11-04T02:19:47.540Z · progress

**Aufgaben:** LINK-03

Mod 0.12.0 (Fabric, NeoForge, Paper) auf #/mod freigegeben; NeoForge 26.3 Spieltest bestanden (Port-Neustart beim bereits laufenden Dienst behoben).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LIVE-01 in Philipps Modpack. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.12.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.12.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.12.0.jar`

## 2026-11-04T02:20:00.609Z · progress

**Aufgaben:** COOP-07

Nächste Aktion nachgetragen: Steuerkanal und Kopplung ohne Befehl sind mit LINK-05 umgesetzt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl umgesetzt (LINK-05). |

## 2026-11-04T02:26:45.477Z · progress

**Aufgaben:** LINK-04

Nachtrag: Selbstverweis „Mod herunterladen“ im Server-Bereich entfernt (Download-Test), Prüfstand nach Rebase in TESTING.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp. |

**Geänderte Dateien:**

- `docs/TESTING.md`

## 2026-11-04T08:42:48.661Z · progress

**Aufgaben:** PROD-01, PROD-02, PROD-03, PROD-04, COOP-06, GAME-09, GAME-11, QA-04

Roadmap-Abgleich 04.11.: Produktion an den Produktions-Thread, COOP-06 an den Plugin-Thread, Modrinth-Freigabe/-Versionen und Testphase-Betreuung als verwaist, Versionsmatrix als Philipps Entscheidung, aktiver Arbeitsblock auf die laufenden Threads.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROD-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-12; später Erträge aus geprüften Lagerkisten (COOP-05) ins Ertragsbuch. |
| PROD-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-13. |
| PROD-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Später: Ofenstraße aus dem Katalog direkt vorschlagen und in die Planung legen. |
| PROD-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin. |
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern. |
| GAME-09 | 🚧 In Arbeit | 3/5 | Modrinth-Prüfung abwarten (Status processing → approved); danach jede neue Mod-Version mit modrinth_publish.mjs release. |
| GAME-11 | ⏳ Offen | 0/4 | Versionsmatrix mit Philipp abstimmen (welche Versionen braucht er wirklich?). |
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

## 2026-11-04T08:48:05.000Z · progress

**Aufgaben:** COOP-09

Team live im Alltag: Chip und Meldungen in jedem Reiter, Anwesenheit mit Abschnitt, Einladung/Server-Link erneuern, abgelehnte Meldungen sichtbar; gegen den echten Team-Raum geprüft.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-09 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit Mitspielern (TEAMBAU-25). |

**Geänderte Dateien:**

- `apps/web/src/views/project/TeamLiveBar.tsx`
- `apps/web/src/views/project/roomClient.ts`
- `apps/web/src/views/project/TeamRoom.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/team.css`
- `tests/e2e/team-room.e2e.mjs`
- `docs/architecture/TEAM_LIVE.md`

## 2026-11-04T08:50:13.176Z · progress

**Aufgaben:** LINK-05, LINK-06

iPad-Weg gegen den echten Team-Raum geprüft (Browsertest mit TEAM_ROOM_URL); LINK-06-S01: „⇪ Auf den Server legen“ auf der Weltkarte – Plan mit Anker per Steuernachricht über Mod oder Team-Raum, geprüft im Browser und auf echtem Paper 1.21.11 samt echtem Raum. Offen: Serveraufnahme per Steuernachricht.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Abnahme vom iPad (Testplan LINK-04). |
| LINK-06 | 🚧 In Arbeit | 1/2 | Serveraufnahme (scan) als Steueraktion; Abnahme LINK-05 (Testplan). |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/mod/serverClient.ts`
- `docs/TESTING.md`
- `docs/architecture/AUTO_LINK.md`
- `docs/testing/TESTPLAN.md`
- `scripts/bridge_paperlink.mjs`
- `scripts/test_bridge_paper_link.sh`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/server-link.e2e.mjs`

## 2026-11-04T08:57:48.489Z · progress

**Aufgaben:** COOP-08

Ertragskisten: Zweck ertrag mit Farm, Plugin misst Einlagen von Trichtern und Spielern und geladene Minuten, store.yield alle 30 min und beim Herunterfahren, TeamView.yields, farms in der Serverdatei, Trichterbuchungen je Minute gebündelt; echte Paper-Server 1.18.2, 1.21.4, 26.3 grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-08 | 🧩 Implementiert · Abnahme offen | 2/4 | PROD-05 liest TeamView.yields bzw. store.yield; Abnahme LAGER-10 auf Philipps Server. |

**Geänderte Dateien:**

- `apps/web/src/team.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/TeamExchange.tsx`
- `apps/web/src/views/project/TeamLive.tsx`
- `apps/web/src/views/project/TeamProof.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `apps/web/src/views/project/teamTransfer.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/LAGERKISTEN.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndex.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreLedger.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `mods/bauplaner-bridge/paper/src/main/resources/config.yml`
- `packages/domain/src/index.ts`
- `packages/domain/src/production.ts`
- `packages/domain/src/team.ts`
- `scripts/bridge_paperlager.mjs`
- `tests/lager.test.mjs`

## 2026-11-04T09:00:40.731Z · progress

**Aufgaben:** GAME-11

Versionsentscheidung Philipp: Fabric 26.3 zuerst, dann die jeweils neueste Version; keine Matrix älterer Versionen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-11 | ⏳ Offen | 0/4 | Entschieden (Philipp 04.11.): Fabric 26.3 (sein Modpack mit REI) hat Vorrang, danach jeweils die neueste Minecraft-Version nachziehen; keine Matrix älterer Versionen. |

## 2026-11-04T09:09:15.288Z · progress

**Aufgaben:** PERF-05

S09 Startpaket (O-3): Reiternamen ohne Komponenten in tabNames.ts, Projektreiter einzeln per lazyPage mit eigenem Suspense, Gebäudesets im Seitenbau nebenwirkungsfrei. Start-JS 2,0 → 1,56 MB (587 → 458 kB gzip), Einstieg 847 → 276 kB, Projektseite 335 → 10 kB, Erststart 1,43 → 1,09 s. npm run check grün, Browser-Suite 153/154 (project-computation 1400px einmal Element abgelöst, danach 6/6 grün auch unter CPU-Last).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-05 | 🧩 Implementiert · Abnahme offen | 8/9 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |

**Geänderte Dateien:**

- `apps/web/src/app/CommandPalette.tsx`
- `apps/web/src/app/lazyPage.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/tabNames.ts`
- `apps/web/src/views/project/tabs.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/PERFORMANCE_AUDIT.md`
- `vite.config.mjs`

## 2026-11-04T09:10:54.815Z · progress

**Aufgaben:** COOP-08

Testplan nach Rebase neu gerendert.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-08 | 🧩 Implementiert · Abnahme offen | 2/4 | PROD-05 liest TeamView.yields bzw. store.yield; Abnahme LAGER-10 auf Philipps Server. |

**Geänderte Dateien:**

- `docs/testing/TESTPLAN.md`

## 2026-11-04T09:13:22.230Z · progress

**Aufgaben:** GROSS-01

Bibliothek Runde 2 (S07): Großbauten Klosteranlage und Universität, Großprojekte Residenzstadt mit Schlosspark und Klosterdorf im Tal

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme durch Philipp (S06); Großbauten-Set (S05). |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/GROSSPROJEKTE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/build/sets/grossbauten.ts`
- `packages/domain/src/grossprojekte/index.ts`
- `packages/domain/src/grossprojekte/klosterdorf.ts`
- `packages/domain/src/grossprojekte/residenzstadt.ts`
- `tests/e2e/grossprojekte.e2e.mjs`

## 2026-11-04T09:16:18.610Z · progress

**Aufgaben:** PROD-05

Sammeltruhen aus dem Team-Lager: Farm mit Lagerkiste verknüpfen, echte Rate aus store.yield (COOP-08) oder Trichterbuchungen, Vorschläge, keine Doppelbuchung. npm run check grün (825), Browser-Suite 155/155.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROD-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen. |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/PRODUCTION.md`

## 2026-11-04T09:25:01.963Z · progress

**Aufgaben:** GAME-07, GAME-08

Mod 0.13.0: Stufe 6 (/bauplaner packliste mit Stapeln, Shulkerkisten und nächster Team-Lagerkiste; /bauplaner geruest für hängende und fallende Blöcke) und Protokoll 3 (/bauplaner markieren → GET /v1/marks/game, Weltkarte „In den Weltplan übernehmen“ als ein Rückgängig-Schritt, Quittung, keine Doppelten). JUnit, Spieltests Fabric und NeoForge, Browser map-depth grün; offen Philipps Spieltest MOD-17 und Stufe 6b (Gruppen/Sperren).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 9/11 | Philipp prüft Packliste und Gerüst (0.13.0, TESTPLAN MOD-17) im echten Spiel; danach Stufe 6b (Gruppen/Sperren aus dem Weltbuilder). |
| GAME-08 | 🧩 Implementiert · Abnahme offen | 5/5 | Philipp prüft Protokoll 3 im echten Spiel (TESTPLAN MOD-17); Forge und Paper ohne Live-Verbindung. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `docs/TESTING.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PackList.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Scaffold.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/GameMarks.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/GameMarksTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/StageSixTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveLink.ts`
- `scripts/bridge_gametest.mjs`
- `tests/e2e/map-depth.e2e.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/livelink.test.mjs`

## 2026-11-04T09:25:02.358Z · progress

**Aufgaben:** GAME-07, GAME-08

Mod 0.13.0 für Fabric und NeoForge 26.3 auf #/mod bereitgestellt (release_mod, Spieltests bestanden).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 9/11 | Philipp prüft Packliste und Gerüst (0.13.0, TESTPLAN MOD-17) im echten Spiel; danach Stufe 6b (Gruppen/Sperren aus dem Weltbuilder). |
| GAME-08 | 🧩 Implementiert · Abnahme offen | 5/5 | Philipp prüft Protokoll 3 im echten Spiel (TESTPLAN MOD-17); Forge und Paper ohne Live-Verbindung. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.13.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.13.0.jar`

## 2026-11-04T09:25:54.830Z · progress

**Aufgaben:** QA-04

Abnahme je Paket: ACCEPTANCE in testplan.ts ordnet jedem implementierten Roadmap-Paket Testfälle zu (check:testplan erzwingt es); neue Fälle BIB-17/18, PROJ-14/15, DATEI-06–08, SYS-03, PROJ-12 mit Öfen; Teststand Mod/Plugin 0.12.0

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `apps/web/src/testing/TestphaseView.tsx`
- `apps/web/src/testing/testplan.ts`
- `docs/architecture/TESTPHASE.md`
- `docs/testing/TESTPLAN.md`
- `scripts/render_testplan.mjs`
- `tests/testphase.test.mjs`

## 2026-11-04T09:26:50.360Z · progress

**Aufgaben:** QA-04

Nachtrag zum Commit 96c8c4c (trägt versehentlich die Überschrift von COOP-09, Inhalt ist QA-04: Abnahme je Roadmap-Paket, neue Fälle inkl. TEAMBAU-26 für COOP-09, PROD-05→LAGER-10); Teststand Mod 0.13.0 / Plugin 0.12.0

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `docs/architecture/TESTPHASE.md`

## 2026-11-04T09:28:40.230Z · progress

**Aufgaben:** NBT-01, MAT-02

MAT-02-S03: Sorte je Rezept-Tag (z. B. Planken für Stöcke/Truhen) und Brennstoff im Rohstoffpanel wählbar, im Baustellenplan gespeichert und für den Sammelplan genutzt; Brennstoff auf Wunsch in den Rohstoffen mit festem Punkt (Holzkohle braucht selbst Brennstoff). NBT-01-S03: Strukturblock-Adapter (SAVE-Bereich, LOAD-Anker und Drehung) beim Drehen, Spiegeln bleibt ungelöst; Strukturblock-Zustand ausrichtungsfrei. Prüfung: Node-Tests, volle Browser-Suite 154 grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| NBT-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme im Spiel: gedrehtes Bauteil mit Truhen, Schildern und einem Strukturblock exportieren und in 26.3 laden (Testphase). |
| MAT-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme in der Testphase: Rohstoffliste eines großen Bauwerks mit gewählter Holzart und Brennstoff mit dem Spiel vergleichen. |

**Geänderte Dateien:**

- `apps/web/src/style.css`
- `apps/web/src/views/project/MaterialsTab.tsx`
- `apps/web/src/views/project/RawMaterialsPanel.tsx`
- `docs/architecture/MATERIALS.md`
- `docs/architecture/NBT_TRANSFORMS.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/recipes.ts`
- `packages/domain/src/site.ts`
- `packages/voxel/src/index.ts`
- `packages/voxel/src/nbtTransforms.ts`
- `packages/voxel/src/states.ts`
- `tests/e2e/recipes.e2e.mjs`
- `tests/nbt-transforms.test.mjs`
- `tests/recipe-prefs.test.mjs`

## 2026-11-04T09:33:11.151Z · progress

**Aufgaben:** PROJ-02

Zeitplan ab heute, Material abwarten aus der Produktion, Basisplan mit Verzug, Anteil der Bautage; program-depth 6/6, Browsersuite 156/156; Rebase auf main 6a41af4

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROJ-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05, PROJ-16…18). |

**Geänderte Dateien:**

- `apps/web/src/planning.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/PlanningTab.tsx`
- `apps/web/src/views/project/ProductionTab.tsx`
- `docs/COMMUNICATION.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/PRODUCTION.md`
- `docs/architecture/PROGRAM.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/program.ts`
- `packages/domain/src/programMaterial.ts`
- `tests/e2e/program-depth.e2e.mjs`
- `tests/program-depth.test.mjs`

## 2026-11-04T09:38:35.990Z · progress

**Aufgaben:** LINK-06

Serveraufnahme per Klick: Steueraktion scan (list/start/fetch/cancel) im Paper-Plugin 0.13.0, Planer Reiter „Bauen“ → „Auf dem Server aufnehmen“/„Letzte Aufnahme holen“ über Mod oder Team-Raum; Ertragskisten (COOP-08) im selben Plugin-Release

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-06 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme durch Philipp (Testplan LINK-05, LINK-06; Paper-Plugin 0.13.0 auf dem Server). |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/mod/serverClient.ts`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `docs/architecture/AUTO_LINK.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-paper-0.13.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/LinkCore.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerLink.java`
- `packages/domain/src/serverControl.ts`
- `scripts/bridge_paperlink.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/server-link.e2e.mjs`

## 2026-11-04T10:03:44.722Z · progress

**Aufgaben:** PROD-05

Server-Zuordnung von Ertragskisten (store.config.farm, COOP-08) gilt ohne Verknüpfung, Vorschlag zuerst, nie für fremde Farmen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROD-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen. |

**Geänderte Dateien:**

- `apps/web/src/views/project/ProductionTab.tsx`
- `docs/architecture/PRODUCTION.md`
- `packages/domain/src/productionPlan.ts`
- `tests/production.test.mjs`

## 2026-11-04T12:34:12.347Z · progress

**Aufgaben:** LINK-07

Ohne Server-Datei: Mod 0.14.0 spricht direkt mit dem Team-Raum (Teamstand mit dem TeamLog des Plugins, eigene Meldungen, Anwesenheit), Planer „Mein Spiel verbinden“/„Spiel trennen“; echter Fabric-Spieltest ohne Server

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-07 | 🚧 In Arbeit | 3/6 | Positionen und Aufnahmen über den Raum; Release 0.14.0; Abnahme LINK-07. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/mod/serverClient.ts`
- `apps/web/src/views/project/TeamRoom.tsx`
- `docs/architecture/AUTO_LINK.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.14.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.14.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/build.gradle`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/mod-core/build.gradle`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomState.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamState.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomClientTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/build.gradle`
- `scripts/bridge_gametest.mjs`
- `scripts/bridge_room_prepare.mjs`
- `scripts/test_bridge_ingame.sh`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/team-room.e2e.mjs`

## 2026-11-04T12:47:26.654Z · progress

**Aufgaben:** COOP-08, COOP-05, PERF-05, PERF-03, GAME-09, LINK-01, LINK-02, LINK-03, LINK-04, LINK-05, LINK-06, LINK-07

Roadmap-Abgleich 04.11. mittags: LINK an den umbenannten Thread, Modrinth wieder aktiv, Reste von Plugin- und Performance-Thread als verwaist, COOP-08-S03 teils durch PROD-05 erledigt, aktiver Arbeitsblock auf offene Threads.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-08 | 🧩 Implementiert · Abnahme offen | 2/4 | S03 zur Hälfte durch PROD-05 erledigt (Reiter Produktion nutzt store.yield als gemessene Rate); offen: Ertragskisten im Reiter Team anzeigen; Abnahme LAGER-10. |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod-Thread veröffentlicht Paper-Jar 0.10.0 mit Teamkanal; danach Abnahme LAGER-01…09 auf Philipps Server. |
| PERF-05 | 🧩 Implementiert · Abnahme offen | 8/9 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |
| PERF-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Filterzustände der Bibliothek beim Seitenwechsel im Browser prüfen. |
| GAME-09 | 🚧 In Arbeit | 3/5 | Modrinth-Prüfung abwarten (Status processing → approved); danach jede neue Mod-Version mit modrinth_publish.mjs release. |
| LINK-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LINK-01 auf Philipps Server. |
| LINK-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Plan-Upload aus dem Planer; Abnahme LINK-02. |
| LINK-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LIVE-01 in Philipps Modpack. |
| LINK-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp. |
| LINK-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Abnahme vom iPad (Testplan LINK-04). |
| LINK-06 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme durch Philipp (Testplan LINK-05, LINK-06; Paper-Plugin 0.13.0 auf dem Server). |
| LINK-07 | 🚧 In Arbeit | 3/6 | Positionen und Aufnahmen über den Raum; Release 0.14.0; Abnahme LINK-07. |

## 2026-11-04T12:52:53.984Z · progress

**Aufgaben:** QA-04

Testplan auf Mod 0.14.0 (TEAMBAU-25/09 ohne Server-Datei, Team-Raum vorausgefüllt, COOP-07 auch LINK-07); Abnahme je Paket nach Ort geordnet (placeOf/packagePlace: Browser, Minecraft, Paper-Server)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `docs/architecture/TESTPHASE.md`
- `docs/testing/TESTPLAN.md`
- `scripts/render_testplan.mjs`
- `tests/testphase.test.mjs`

## 2026-11-04T13:24:32.693Z · progress

**Aufgaben:** GFX-02, GFX-01, PERF-04, PERF-03

GFX-02 Runde 2: Biomfarben im Shader ohne Neuaufbau (17 Biome), Leuchtfeuer-Strahl mit Pyramide/Glasfarben/Sperre, Magma/Endportal voll hell, große Szenen in Stücken auf die GPU; PERF-03 Filterzustände im Browser geprüft. check grün (847), test:e2e 160/160; echte GPUs, Firefox/Safari offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GFX-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf echten GPUs, Firefox/Safari und Abgleich mit Spielbildern (S04, zusammen mit GFX-01-S06). |
| GFX-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Prüfung auf echten Geräten und Browsern (S06); Biomfarben und leuchtende Blockentities als GFX-02. |
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06); der GPU-Upload großer Szenen läuft seit GFX-02-S03 in Stücken. |
| PERF-03 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Erledigt; weitere Bundle-Arbeit läuft unter PERF-05 (O-5, gezielte Unterpfade). |

**Geänderte Dateien:**

- `apps/web/src/blockmodels/beacon.ts`
- `apps/web/src/blockmodels/biomes.ts`
- `apps/web/src/blockmodels/graphics.ts`
- `apps/web/src/blockmodels/mesh.ts`
- `apps/web/src/blockmodels/snapshot.ts`
- `apps/web/src/blockmodels/threeMesh.ts`
- `apps/web/src/blockmodels/tint.ts`
- `apps/web/src/jobs/meshJob.ts`
- `apps/web/src/viewer/GraphicsMenu.tsx`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/backgroundMesh.ts`
- `apps/web/src/viewer/sceneController.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/GRAPHICS.md`
- `tests/e2e/graphics2.e2e.mjs`
- `tests/e2e/library-filters.e2e.mjs`
- `tests/graphics2.test.mjs`

## 2026-11-04T13:25:59.610Z · progress

**Aufgaben:** TERRAIN-03, TERRAIN-02

Gelände und Wege: Aufschütten/Abtragen/Rampe, Wegstufen als Treppen oder Halbstufen, Brücken mit Geländer, Weg aus der Weltkarte; Kern 8/8, Browser 2/2 (Landschaft-Tests zentrieren die Zeichenfläche jetzt, sonst deckt am Handy die untere Leiste sie ab); Abnahme im Spiel (PROJ-19) und Basisplaner auf Gelände offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-03 | 🧩 Implementiert · Abnahme offen | 5/7 | Abnahme PROJ-19 im Spiel; danach Basisplaner auf Gelände (S06). |
| TERRAIN-02 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit eigener Welt (S05); Wegstufen und Brücken siehe TERRAIN-03. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/LandscapeTab.tsx`
- `apps/web/src/views/project/landscape/DesignCanvas.tsx`
- `docs/architecture/LANDSCAPE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/terrainDesign.ts`
- `tests/e2e/landscape-paths.e2e.mjs`
- `tests/e2e/landscape-scatter.e2e.mjs`
- `tests/e2e/landscape.e2e.mjs`
- `tests/terrain-paths.test.mjs`

## 2026-11-04T13:31:43.280Z · progress

**Aufgaben:** GFX-02

Testfall DATEI-09 (Biom, Leuchtfeuer, große Szene) im Testplan für GFX-02.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GFX-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf echten GPUs, Firefox/Safari und Abgleich mit Spielbildern (S04, zusammen mit GFX-01-S06). |

**Geänderte Dateien:**

- `apps/web/src/blockmodels/beacon.ts`
- `apps/web/src/blockmodels/biomes.ts`
- `apps/web/src/blockmodels/graphics.ts`
- `apps/web/src/blockmodels/mesh.ts`
- `apps/web/src/blockmodels/snapshot.ts`
- `apps/web/src/blockmodels/threeMesh.ts`
- `apps/web/src/blockmodels/tint.ts`
- `apps/web/src/jobs/meshJob.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/viewer/GraphicsMenu.tsx`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/backgroundMesh.ts`
- `apps/web/src/viewer/sceneController.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/GRAPHICS.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/graphics2.e2e.mjs`
- `tests/e2e/library-filters.e2e.mjs`
- `tests/graphics2.test.mjs`

## 2026-11-04T13:41:53.533Z · progress

**Aufgaben:** EDIT-06, EDIT-01, EDIT-02, EDIT-03, ENTITY-01

Direkt im 3D-Bild bauen: Flächen-Picking, Setzen/Abbauen/Formen/Auswahl per Klick und Ziehen im 3D-Bild mit Vorschau, Wände an Seitenflächen, Gruppe im 3D ziehen; Truhen-, Behälter- und Schildinhalte in der Werkstatt bearbeiten. Unit- und alle Chromium-Tests grün; iPad und Spielprüfung offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| EDIT-06 | 🧩 Implementiert · Abnahme offen | 4/5 | EDIT-06-S05: Philipp prüft das Bauen im 3D-Bild auf PC und iPad (WERK-08) und lädt eine Truhe/ein Schild mit Inhalt im Spiel (WERK-09). |
| EDIT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Geräteprüfung (QA-02). Gruppenziehen im 3D-Bild ist mit EDIT-06 erledigt. |
| EDIT-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung. Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| EDIT-03 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung der Schablonen-Zustände (Tür, Treppe, Laterne). Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| ENTITY-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Export mit Entities im Spiel prüfen (S06). Truhen-/Schildinhalte bearbeiten ist mit EDIT-06 erledigt. |

**Geänderte Dateien:**

- `apps/web/src/blockmodels/threeMesh.ts`
- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/editor/ContentEditor.tsx`
- `apps/web/src/editor/editor.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/sceneController.ts`
- `apps/web/src/viewer/types.ts`
- `docs/architecture/BLOCK_EDITOR.md`
- `docs/testing/TESTPLAN.md`
- `packages/voxel/src/blockContentEdit.ts`
- `packages/voxel/src/index.ts`
- `tests/block-content-edit.test.mjs`
- `tests/e2e/workshop-build3d.e2e.mjs`

## 2026-11-04T14:22:09.121Z · progress

**Aufgaben:** LINK-07

LINK-07 Stufe 2 / Mod 0.15.0: Mitspieler-Positionen über den Team-Raum (Gerade da), Aufnahme per Klick über den Raum (Aufnahme im Spiel anfordern, /bauplaner team aufnahme), section.seen/store.seen aus der Mod, Lagerkisten aus dem Raum; Raum: Aufnahmen-Speicher, Position, ask/asked

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-07 | 🚧 In Arbeit | 5/6 | Team-Thread deployt den Raum (Aufnahmen, Positionen); Modrinth 0.15.0; Abnahme LINK-07/LINK-08 durch Philipp. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `apps/web/src/views/project/TeamRoom.tsx`
- `apps/web/src/views/project/roomClient.ts`
- `docs/architecture/AUTO_LINK.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.15.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.15.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/McCompat.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomState.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomClientTest.java`
- `scripts/bridge_gametest.mjs`
- `services/team-room/src/core.js`
- `services/team-room/src/index.js`
- `tests/e2e/team-room.e2e.mjs`
- `tests/team-room.test.mjs`

## 2026-11-04T14:30:00.000Z · progress

**Aufgaben:** COOP-10

COOP-10 Client zuerst: section.seen/store.seen (Mod meldet Baustand und Kisteninhalt mit Mitgliedsschlüssel) in Teamfaltung, Paper-TeamLog und Planer, ungeprüft getrennt von Servermessungen; Unit + Browser grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-10 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod meldet section.seen/store.seen (Anbindungs-Thread), dann Abnahme TEAMBAU-25. |

**Geänderte Dateien:**

- `packages/domain/src/team.ts`
- `packages/domain/src/index.ts`
- `apps/web/src/views/project/TeamProof.tsx`
- `apps/web/src/team.css`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `tests/team.test.mjs`
- `tests/e2e/team-room.e2e.mjs`
- `docs/architecture/TEAM_LIVE.md`
- `apps/web/src/testing/testplan.ts`
- `docs/testing/TESTPLAN.md`

## 2026-11-04T22:02:23.142Z · progress

**Aufgaben:** GAME-09

Modrinth-Stand: 0.10.0 bis 0.15.0 (Fabric, NeoForge, Paper bis 0.13.0) hochgeladen, 21 Dateien, kein KI-Werkzeugname; Projekt weiter in der Modrinth-Prüfung

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

## 2026-11-04T22:20:00.000Z · progress

**Aufgaben:** COOP-10

COOP-10: Team-Raum mit Positionen/Aufnahmen ausgerollt (Philipps Karte, Version 8318d1eb, echter Dienst grün); „Gerade da“ zeigt Abschnitt bzw. Abstand aus der Spielposition (whereInPlan).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-10 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme mit Mitspielern ohne Plugin (TEAMBAU-27, TEAMBAU-25). |

**Geänderte Dateien:**

- `packages/domain/src/team.ts`
- `packages/domain/src/index.ts`
- `apps/web/src/views/project/TeamRoom.tsx`
- `tests/team.test.mjs`
- `tests/e2e/team-room.e2e.mjs`
- `docs/architecture/TEAM_LIVE.md`

## 2026-11-04T22:23:54.313Z · progress

**Aufgaben:** FALLBACK-01

FALLBACK-01: Mod 0.16.0 (Teamstand offline in raum-stand.json, HTTP statt WebSocket, offline gemerkte Messungen) und Planer „Baustand holen (bester Weg)“; RoomFallbackTest, RoomClientTest gegen echten Raum, Unit + Browser grün, Spieltest Fabric (mit Team-Raum) und NeoForge bestanden.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| FALLBACK-01 | 🚧 In Arbeit | 4/5 | Spieltest Mod 0.16.0, Release über den Modrinth-Thread, Abnahme LINK-09 durch Philipp. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `docs/architecture/AUTO_LINK.md`
- `docs/architecture/FALLBACKS.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.16.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.16.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomFallbackTest.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/scanRoutes.ts`
- `tests/e2e/game-progress.e2e.mjs`
- `tests/scan-routes.test.mjs`

## 2026-11-04T22:55:00.000Z · progress

**Aufgaben:** COOP-10

COOP-10: Zeile „Mein Spiel“ unter Team live mit den FALLBACK-01-Feldern der Mod (Modus, Alter, wartende Meldungen, anderer Raum).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-10 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit Mitspielern ohne Plugin (TEAMBAU-27, TEAMBAU-25). |

**Geänderte Dateien:**

- `apps/web/src/views/project/TeamRoom.tsx`
- `apps/web/src/team.css`
- `tests/e2e/team-room.e2e.mjs`
- `tests/e2e/modSimulator.mjs`
- `docs/architecture/TEAM_LIVE.md`

## 2026-11-05T07:12:28.553Z · progress

**Aufgaben:** COOP-11, COOP-08

COOP-11 Verlauf verdichten (team.digest, compactTeam, Merge ohne Doppelzählung, Produktion/Team live) und COOP-08 S03 Ertragsbuch im Reiter Team. Geprüft: tests/team-digest.test.mjs (10), tests/e2e/team-digest.e2e.mjs (Desktop+Handy). Grenze: Plugin/Mod-TeamLog übergehen team.digest; Abnahme TEAMBAU-28 offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| COOP-08 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LAGER-10 mit einer echten Farm; Ertragsbuch in TEAMBAU-28. |

**Geänderte Dateien:**

- `apps/web/src/team.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/TeamCompact.tsx`
- `apps/web/src/views/project/TeamProof.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `docs/architecture/TEAMBAU.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/productionPlan.ts`
- `packages/domain/src/team.ts`
- `packages/domain/src/teamDigest.ts`
- `packages/domain/src/teamSync.ts`
- `tests/e2e/team-digest.e2e.mjs`
- `tests/team-digest.test.mjs`

## 2026-11-05T07:38:47.249Z · progress

**Aufgaben:** COOP-11, COOP-08, PROJ-03, MAP-07

Teamverlauf verdichten und Ertragsbuch (COOP-11, COOP-08 S03), Abwesenheiten und Basisplan-Verlauf in der Planung (PROJ-03), gedrehte Projektlagen auf der Weltkarte wie das Mod-Hologramm (MAP-07)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| COOP-08 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LAGER-10 mit einer echten Farm; Ertragsbuch in TEAMBAU-28. |
| PROJ-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-20 durch Philipp. |
| MAP-07 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme KARTE-07; Server-Plugin könnte Pläne gedreht ablegen (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |

**Geänderte Dateien:**

- `apps/web/src/planning.css`
- `apps/web/src/team.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/library/AnlagenPage.tsx`
- `apps/web/src/views/library/BasePage.tsx`
- `apps/web/src/views/map/GameProgress.tsx`
- `apps/web/src/views/map/PlacementForm.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/project/LandscapeTab.tsx`
- `apps/web/src/views/project/PlanningTab.tsx`
- `apps/web/src/views/project/TeamCompact.tsx`
- `apps/web/src/views/project/TeamExchange.tsx`
- `apps/web/src/views/project/TeamLive.tsx`
- `apps/web/src/views/project/TeamProof.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `apps/web/src/views/project/TerrainTab.tsx`
- `apps/web/src/views/project/buildrun/AnchorBar.tsx`
- `apps/web/src/views/project/teamTransfer.ts`
- `apps/web/src/views/world/world.worker.ts`
- `docs/architecture/PROGRAM.md`
- `docs/architecture/TEAMBAU.md`
- `docs/architecture/WORLDMAP.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/buildRun.ts`
- `packages/domain/src/gameCheck.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveLink.ts`
- `packages/domain/src/productionPlan.ts`
- `packages/domain/src/program.ts`
- `packages/domain/src/team.ts`
- `packages/domain/src/teamDigest.ts`
- `packages/domain/src/teamSync.ts`
- `packages/domain/src/terrain.ts`
- `packages/domain/src/worldmap.ts`
- `tests/e2e/program-absence.e2e.mjs`
- `tests/e2e/team-digest.e2e.mjs`
- `tests/e2e/world-turn.e2e.mjs`
- `tests/program-absence.test.mjs`
- `tests/team-digest.test.mjs`
- `tests/world-turn.test.mjs`

## 2026-11-05T07:43:25.996Z · progress

**Aufgaben:** MAP-05, COOP-01, PROJ-02, MAP-07, COOP-11, PROJ-03

Restpunkte übernommen: MAP-05 gedrehte Lagen → MAP-07, COOP-01 Verdichten → COOP-11, PROJ-02 Abwesenheiten/Basisplan-Verlauf → PROJ-03; Testnachweise in TESTING.md

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können. |
| COOP-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05). |
| PROJ-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05, PROJ-16…18). |
| MAP-07 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme KARTE-07; Server-Plugin könnte Pläne gedreht ablegen (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| PROJ-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-20 durch Philipp. |

## 2026-11-05T07:43:52.853Z · progress

**Aufgaben:** MAP-07, COOP-11, PROJ-03

Testnachweise in TESTING.md zugeordnet

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-07 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme KARTE-07; Server-Plugin könnte Pläne gedreht ablegen (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| PROJ-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-20 durch Philipp. |

**Geänderte Dateien:**

- `docs/TESTING.md`

## 2026-11-05T07:58:33.828Z · progress

**Aufgaben:** SPLIT-01, MODEL-01, MAT-03

Herauslösen erkennt unterirdische Räume, Keller und Brücken (SPLIT-01-S06); Druckhülle fasst Flächen ohne T-Stöße zusammen (MODEL-01-S06); Materialvarianten gegen das Profil 26.3 und im Browser geprüft (MAT-03-S03)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| SPLIT-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme mit echten Dateien (S05). |
| MODEL-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Dateien in Blender und Slicern prüfen und ein Testdruck; danach Flächenzusammenfassung (S06). Export läuft seit PERF-04 im Worker. |
| MAT-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme PROJ-14. |

**Geänderte Dateien:**

- `apps/web/src/export3d/build.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/library/SplitPanel.tsx`
- `docs/TESTING.md`
- `docs/architecture/BASE_PLANNER.md`
- `docs/architecture/MODEL_EXPORT.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/split.ts`
- `packages/formats/src/printGrid.ts`
- `tests/e2e/mat-variants.e2e.mjs`
- `tests/model3d.test.mjs`
- `tests/split-under.test.mjs`
- `tests/variants.test.mjs`

## 2026-11-05T08:18:58.875Z · progress

**Aufgaben:** MAP-02

MAP-02: gespeicherte Server-Karten (bis 20, Kartenliste als Datei), BlueMap-marker-sets und Dynmap-Befehle aus Projekten/Bauplätzen/Wegen/Zonen/Punkten, Markerdatei als Weltplan-Punkte; Formate aus Primärquellen geprüft; Roadmap-Test unabhängig vom echten Waisenstand.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme KARTE-08 auf Philipps Server-Karte. |

**Geänderte Dateien:**

- `apps/web/src/map.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/LiveMapPanel.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveMapConfig.ts`
- `docs/TESTING.md`
- `docs/architecture/LIVEMAP.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/liveMapExport.ts`
- `packages/domain/src/livemap.ts`
- `tests/e2e/livemap-export.e2e.mjs`
- `tests/e2e/worldmap.e2e.mjs`
- `tests/livemap-export.test.mjs`
- `tests/roadmap.test.mjs`

## 2026-11-05T08:30:33.788Z · progress

**Aufgaben:** PROJ-04

PROJ-04: Reihenfolge zwischen Projekten (program.after, projectOrder.ts), Planung „Reihenfolge der Projekte“ mit frühestem Start aus dem Basisplan der Vorgänger, Kreisprüfung, Pfeile und Detail auf der Weltkarte.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROJ-04 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-21 durch Philipp. |

**Geänderte Dateien:**

- `apps/web/src/map.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/project/PlanningTab.tsx`
- `apps/web/src/views/project/ProjectOrder.tsx`
- `docs/TESTING.md`
- `docs/architecture/PROGRAM.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/program.ts`
- `packages/domain/src/projectOrder.ts`
- `tests/e2e/project-order.e2e.mjs`
- `tests/project-order.test.mjs`

## 2026-11-05T10:23:42.887Z · progress

**Aufgaben:** TERRAIN-03, PROD-04, COOP-06, PROJ-01

Prüfrunde Bibliothek/Welt/Team (05.11.): TERRAIN-03-S06 Küste aus der Geländeaufnahme im Basisplaner (baseShore.ts: Wasserseite aus Reihen mit offenem Wasser, echtes Ufer gegen geplante Uferlinie, ans Ufer schieben, Gebäude im Wasser/Stege an Land; Abnahme BIB-19); Fehler behoben: Tagesdatum in Planung/Produktion/Team/Projektzentrale als Ortszeit statt UTC, Standardort übernommener Farmen in der Dimension des Bauplatzes, AFK-Annahme ohne Ort/AFK-Platz als Hinweis; Team-Einstieg nennt Team live zuerst. Unit 6+1 neu, Browser base-shore 1400/390 px; Wegenetz als Landschaftsweg (S08) offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-03 | 🧩 Implementiert · Abnahme offen | 6/8 | Abnahme PROJ-19 und BIB-19 im Spiel; danach Wegenetz der Basis als Landschaftsweg (S08). |
| PROD-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin. |
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern. |
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |

**Geänderte Dateien:**

- `apps/web/src/app/ui.tsx`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/library/BasePage.tsx`
- `apps/web/src/views/library/base.css`
- `apps/web/src/views/project/PlanningTab.tsx`
- `apps/web/src/views/project/ProductionTab.tsx`
- `apps/web/src/views/project/TeamPlan.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `apps/web/src/views/project/buildrun/common.ts`
- `docs/architecture/BASE_PLANNER.md`
- `docs/architecture/PRODUCTION.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/baseShore.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/productionPlan.ts`
- `tests/base-shore.test.mjs`
- `tests/e2e/base-shore.e2e.mjs`
- `tests/production.test.mjs`

## 2026-11-05T10:29:43.640Z · progress

**Aufgaben:** TERRAIN-03

Prüfprotokoll der Prüfrunde Bibliothek/Welt/Team in TESTING ergänzt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-03 | 🧩 Implementiert · Abnahme offen | 6/8 | Abnahme PROJ-19 und BIB-19 im Spiel; danach Wegenetz der Basis als Landschaftsweg (S08). |

**Geänderte Dateien:**

- `apps/web/src/app/ui.tsx`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/library/BasePage.tsx`
- `apps/web/src/views/library/base.css`
- `apps/web/src/views/project/PlanningTab.tsx`
- `apps/web/src/views/project/ProductionTab.tsx`
- `apps/web/src/views/project/TeamPlan.tsx`
- `apps/web/src/views/project/TeamTab.tsx`
- `apps/web/src/views/project/buildrun/common.ts`
- `docs/TESTING.md`
- `docs/architecture/BASE_PLANNER.md`
- `docs/architecture/PRODUCTION.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/baseShore.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/productionPlan.ts`
- `tests/base-shore.test.mjs`
- `tests/e2e/base-shore.e2e.mjs`
- `tests/production.test.mjs`

## 2026-11-05T10:30:50.888Z · progress

**Aufgaben:** LINK-10

Anbindung geprüft und gehärtet (Mod/Plugin 0.17.0): WebSocket-Rahmen über WsQueue streng nacheinander (vorher gingen gleichzeitige Rahmen still verloren bzw. das Plugin trennte), Messungen bis zur Bestätigung gemerkt, Team-Raum mit Ping ohne Aufwecken, sauberem Schließen und Server-Anwesenheit nur mit Serverschlüssel, Planer ohne gestapelte Abfrage-Schleifen. Geprüft: mod-core/core/paper-Unit-Tests, RoomClientTest gegen lokalen Team-Raum (wrangler dev), test_bridge_paper_room.sh (Paper 1.21.11, 26.3) und test_bridge_paper_link.sh über den Raum, Spieltest Fabric 26.3 mit Team-Raum und NeoForge 26.3 bestanden. Offen: Ausrollen des Team-Raums, Modrinth, Abnahme LINK-10.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-10 | 🧩 Implementiert · Abnahme offen | 4/4 | Release 0.17.0 über den Modrinth-Thread, Team-Raum ausrollen, Abnahme mit LINK-09. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/project/roomClient.ts`
- `docs/architecture/FALLBACKS.md`
- `docs/architecture/TEAM_LIVE.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.17.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.17.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.17.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WsQueue.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/WsQueueTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomFallbackTest.java`
- `mods/bauplaner-bridge/paper/build.gradle`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`
- `services/team-room/src/core.js`
- `services/team-room/src/index.js`
- `tests/team-room.test.mjs`

## 2026-11-05T10:34:38.680Z · progress

**Aufgaben:** STRUCT-01, CORE-02, CORE-03, STORE-01, MAT-01, BUILD-01, ARCH-01, ARCH-02, UI-02, STAB-01, PROFILE-01, MAT-02, MAT-03, MAT-04, DIFF-01, PERF-02, PERF-04, PERF-05, BLOCK-01, BLOCK-02, EDIT-01, UPDATE-01, LIB-03, WORLD-02, BUILD-05, TERRAIN-01, TERRAIN-02, TERRAIN-03, BUILD-06, MAP-01, MAP-04, MAP-02, GAME-01, GAME-07, WORLD-IMPORT-01, BACKUP-02, TEAM-02, TEAM-03, LAGER-01, LIB-04, ENTITY-01, LIB-05, LIB-06, BASE-01, SPLIT-01, GROSS-01, MAP-05, MAP-06, MAP-07, GEN-03, SIZE-01, COOP-01, COOP-03, COOP-04, COOP-05, COOP-06, PROJ-01, COOP-07, COOP-08, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, LINK-02, LINK-04, LINK-05, LINK-06, COOP-09, COOP-10, COOP-11, PROJ-02, PROJ-03, PROJ-04, LINK-07, FALLBACK-01, LINK-10

Stufe 2 (STRUCT-01): packages/domain/src in Fachordner (core, catalog, base, materials, building, planning, world, team, data, versions), Web-CSS nach styles/, Team-Ansichten nach views/project/team/, Codemod scripts/dev/restructure.mjs, Ordnerkarte docs/STRUKTUR.md. Übrige Aufgaben: nur Dateiumfang/Nachweispfade auf die neuen Orte umgeschrieben.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| STRUCT-01 | 🚧 In Arbeit | 2/4 | Stufe 1: scripts/, tests/ und docs/architecture nach Bereich ordnen. |
| CORE-02 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| CORE-03 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| STORE-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| MAT-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| BUILD-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| ARCH-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |
| ARCH-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme der Migration mit echten Browserdaten (S05); danach kompakte Laufzeitform der Zellen als Folge von PERF-02. |
| UI-02 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Echte Geräteprüfung (Safari/iPhone, Touch) in QA-02; weitere Hauptbereiche (z. B. Karte MAP-01) als Eintrag in nav.ts anhängen. |
| STAB-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Erledigt. |
| PROFILE-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme: Profilprüfung im Gebäudeblatt an einer echten älteren Schem-/Litematic-Datei ansehen (Testphase). |
| MAT-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme in der Testphase: Rohstoffliste eines großen Bauwerks mit gewählter Holzart und Brennstoff mit dem Spiel vergleichen. |
| MAT-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme PROJ-14. |
| MAT-04 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme: Kupfervariante eines Bauwerks im Planer erzeugen und im Spiel ansehen (Testphase). |
| DIFF-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme in der Testphase: zwei Stände eines verschobenen Bauwerks vergleichen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 3/3 | PERF-02-S03 zusammen mit PERF-05-S08 (Zellen erst bei Bedarf entpacken) im Performance-Thread umsetzen; beide ändern compose/Entpacken. Übergabe abgestimmt am 03.11.2026. |
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06); der GPU-Upload großer Szenen läuft seit GFX-02-S03 in Stücken. |
| PERF-05 | 🧩 Implementiert · Abnahme offen | 8/9 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |
| BLOCK-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme im Spiel; PROFILE-01 kann die Berichtsfakten übernehmen. Die Katalogfehler aus der Spielprüfung behebt BLOCK-02. |
| BLOCK-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme im Spiel (S06): geänderte Gebäude (z. B. Werkstatt, Windmühle, Torhaus, Stadthaus) per Litematic setzen. |
| EDIT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Geräteprüfung (QA-02). Gruppenziehen im 3D-Bild ist mit EDIT-06 erledigt. |
| UPDATE-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Echtgeräteabnahme (QA-02); Teamreihenfolge der Updateoperationen in TEAM-02. |
| LIB-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen. |
| WORLD-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Kuratierte Filter-/Treffernachweise bei Katalogänderungen fortführen; keine weitere Karte ohne tatsächliche Assets. |
| BUILD-05 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Gelände-/Hanglagen und Türausrichtung zum Weg als eigene Folgeaufgabe; Echtgeräteabnahme mit QA-02. |
| TERRAIN-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit eigener Welt (S05); danach Weg mit Stufen/Kurven und Stützmauern als Blöcke als eigene Folgeaufgabe. |
| TERRAIN-02 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit eigener Welt (S05); Wegstufen und Brücken siehe TERRAIN-03. |
| TERRAIN-03 | 🧩 Implementiert · Abnahme offen | 6/8 | Abnahme PROJ-19 und BIB-19 im Spiel; danach Wegenetz der Basis als Landschaftsweg (S08). |
| BUILD-06 | 🧩 Implementiert · Abnahme offen | 5/5 | Echtgeräte- und Druckerabnahme mit QA-02; Philipps Spieltest mit Mod-Aufnahme (WorldAnchor) auf seinem Server. |
| MAP-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02. |
| MAP-04 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); denkbare Folge: benannte Gruppen/Sperren mit Schemaerweiterung, abgestimmt mit der Mod. |
| MAP-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme KARTE-08 auf Philipps Server-Karte. |
| GAME-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 9/11 | Philipp prüft Packliste und Gerüst (0.13.0, TESTPLAN MOD-17) im echten Spiel; danach Stufe 6b (Gruppen/Sperren aus dem Weltbuilder). |
| WORLD-IMPORT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Mit einer Kopie von Philipps eigener 26.3-Welt (Modpack) einen Ausschnitt übernehmen und ein platziertes Projekt prüfen. |
| BACKUP-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen. |
| TEAM-02 | ⏳ Offen | 0/2 | Operation-ID, Revisionsprüfung und Wiederholung serverseitig umsetzen. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |
| TEAM-03 | ⏳ Offen | 0/2 | Zuständigkeiten und Lagerbuchungen versionieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option. |
| LAGER-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf dem Paper-Server (Thread „Server-Plugin mit geprüften Lagerkisten“). |
| LIB-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen. |
| ENTITY-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Export mit Entities im Spiel prüfen (S06). Truhen-/Schildinhalte bearbeiten ist mit EDIT-06 erledigt. |
| LIB-05 | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp. |
| LIB-06 | 🧩 Implementiert · Abnahme offen | 5/7 | Abnahme durch Philipp (S06) und erster echter Beitrag (S07). |
| BASE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); danach Küstenlinie aus der Geländeaufnahme und Wegstufen. |
| SPLIT-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme mit echten Dateien (S05). |
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme durch Philipp (S06); Großbauten-Set (S05). |
| MAP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können. |
| MAP-06 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag). |
| MAP-07 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme KARTE-07; Server-Plugin könnte Pläne gedreht ablegen (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| GEN-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp baut das Kolosseum im Spiel nach (BIB-14); danach Feinschliff (Statuen in den Attika-Fenstern, Treppen im Hypogäum). |
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |
| COOP-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05). |
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore. |
| COOP-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md). |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod-Thread veröffentlicht Paper-Jar 0.10.0 mit Teamkanal; danach Abnahme LAGER-01…09 auf Philipps Server. |
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern. |
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |
| COOP-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl umgesetzt (LINK-05). |
| COOP-08 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LAGER-10 mit einer echten Farm; Ertragsbuch in TEAMBAU-28. |
| PROD-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-12; später Erträge aus geprüften Lagerkisten (COOP-05) ins Ertragsbuch. |
| PROD-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-13. |
| PROD-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Später: Ofenstraße aus dem Katalog direkt vorschlagen und in die Planung legen. |
| PROD-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin. |
| PROD-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen. |
| LINK-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Plan-Upload aus dem Planer; Abnahme LINK-02. |
| LINK-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp. |
| LINK-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Abnahme vom iPad (Testplan LINK-04). |
| LINK-06 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme durch Philipp (Testplan LINK-05, LINK-06; Paper-Plugin 0.13.0 auf dem Server). |
| COOP-09 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit Mitspielern (TEAMBAU-25). |
| COOP-10 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit Mitspielern ohne Plugin (TEAMBAU-27, TEAMBAU-25). |
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| PROJ-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05, PROJ-16…18). |
| PROJ-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-20 durch Philipp. |
| PROJ-04 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-21 durch Philipp. |
| LINK-07 | 🚧 In Arbeit | 5/6 | Team-Thread deployt den Raum (Aufnahmen, Positionen); Modrinth 0.15.0; Abnahme LINK-07/LINK-08 durch Philipp. |
| FALLBACK-01 | 🚧 In Arbeit | 4/5 | Spieltest Mod 0.16.0, Release über den Modrinth-Thread, Abnahme LINK-09 durch Philipp. |
| LINK-10 | 🧩 Implementiert · Abnahme offen | 4/4 | Release 0.17.0 über den Modrinth-Thread, Team-Raum ausrollen, Abnahme mit LINK-09. |

**Geänderte Dateien:**

- `AGENTS.md`
- `README.md`
- `apps/web/src/app/useProjectComputation.ts`
- `apps/web/src/jobs/libraryJob.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/materials/MaterialLab.tsx`
- `apps/web/src/styles/backup.css`
- `apps/web/src/styles/buildrun.css`
- `apps/web/src/styles/catalog.css`
- `apps/web/src/styles/datamodel.css`
- `apps/web/src/styles/map.css`
- `apps/web/src/styles/planning.css`
- `apps/web/src/styles/production.css`
- `apps/web/src/styles/schem.css`
- `apps/web/src/styles/shell.css`
- `apps/web/src/styles/site.css`
- `apps/web/src/styles/style.css`
- `apps/web/src/styles/team.css`
- `apps/web/src/styles/teamplan.css`
- `apps/web/src/views/BackupPanel.tsx`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/SystemView.tsx`
- `apps/web/src/views/library/AssetRevisionNotice.tsx`
- `apps/web/src/views/library/BuildThemesPage.tsx`
- `apps/web/src/views/library/UsageSection.tsx`
- `apps/web/src/views/library/VersionsSection.tsx`
- `apps/web/src/views/library/buildThemeLinks.ts`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/LiveMapPanel.tsx`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/PlacementForm.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveMapConfig.ts`
- `apps/web/src/views/map/map.worker.ts`
- `apps/web/src/views/map/transport.ts`
- `apps/web/src/views/project/BuildTab.tsx`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `apps/web/src/views/project/PlanningTab.tsx`
- `apps/web/src/views/project/ProductionTab.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/SiteTab.tsx`
- `apps/web/src/views/project/SnapshotsPanel.tsx`
- `apps/web/src/views/project/tabs.ts`
- `apps/web/src/views/project/team/TeamCompact.tsx`
- `apps/web/src/views/project/team/TeamExchange.tsx`
- `apps/web/src/views/project/team/TeamJoinView.tsx`
- `apps/web/src/views/project/team/TeamLive.tsx`
- `apps/web/src/views/project/team/TeamLiveBar.tsx`
- `apps/web/src/views/project/team/TeamOpen.tsx`
- `apps/web/src/views/project/team/TeamPlan.tsx`
- `apps/web/src/views/project/team/TeamProof.tsx`
- `apps/web/src/views/project/team/TeamRoom.tsx`
- `apps/web/src/views/project/team/TeamTab.tsx`
- `apps/web/src/views/project/team/roomClient.ts`
- `apps/web/src/views/project/team/teamTransfer.ts`
- `docs/BLOCKS.md`
- `docs/COMMUNICATION.md`
- `docs/REQUIREMENTS.md`
- `docs/STRUKTUR.md`
- `docs/architecture/ANLAGEN.md`
- `docs/architecture/AUTO_LINK.md`
- `docs/architecture/BACKUPS.md`
- `docs/architecture/BASE_PLANNER.md`
- `docs/architecture/BAUSTIL.md`
- `docs/architecture/BLOCK_LOGIC.md`
- `docs/architecture/BUILD_RUN.md`
- `docs/architecture/BUILD_THEMES.md`
- `docs/architecture/CATALOG.md`
- `docs/architecture/COLLECTIONS.md`
- `docs/architecture/CONNECTORS.md`
- `docs/architecture/CONTRIBUTIONS.md`
- `docs/architecture/FALLBACKS.md`
- `docs/architecture/GENERATORS.md`
- `docs/architecture/GROSSPROJEKTE.md`
- `docs/architecture/GUIDE.md`
- `docs/architecture/LANDSCAPE.md`
- `docs/architecture/LIVEMAP.md`
- `docs/architecture/LIVE_LINK.md`
- `docs/architecture/MATERIALS.md`
- `docs/architecture/MODULES.md`
- `docs/architecture/MOD_BRIDGE.md`
- `docs/architecture/MOD_HOLOGRAM.md`
- `docs/architecture/PERSISTENCE.md`
- `docs/architecture/PLAN_MODEL.md`
- `docs/architecture/PRODUCTION.md`
- `docs/architecture/PROGRAM.md`
- `docs/architecture/SCHEM_VIEWS.md`
- `docs/architecture/SITE.md`
- `docs/architecture/STABILITY.md`
- `docs/architecture/TEAMBAU.md`
- `docs/architecture/TEAM_LIVE.md`
- `docs/architecture/TERRAIN.md`
- `docs/architecture/UI.md`
- `docs/architecture/UPDATES.md`
- `docs/architecture/VERSION_PROFILE.md`
- `docs/architecture/VIEWER.md`
- `docs/architecture/WORLDMAP.md`
- `docs/architecture/WORLD_BUILDER.md`
- `docs/architecture/WORLD_IMPORT.md`
- `docs/project/CODEX_PROMPT.md`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/BlockRules.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndex.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreLedger.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `packages/application/src/assetConcurrency.ts`
- `packages/application/src/catalogSnapshot.ts`
- `packages/application/src/catalogSync.ts`
- `packages/application/src/computationTransport.ts`
- `packages/application/src/memoryRepository.ts`
- `packages/application/src/projectComputation.ts`
- `packages/application/src/revisionExport.ts`
- `packages/application/src/scanPersistence.ts`
- `packages/domain/src/base/anlagen.ts`
- `packages/domain/src/base/anlagenTerrain.ts`
- `packages/domain/src/base/base.ts`
- `packages/domain/src/base/baseFunctions.ts`
- `packages/domain/src/base/baseShore.ts`
- `packages/domain/src/base/entrance.ts`
- `packages/domain/src/building/buildRun.ts`
- `packages/domain/src/building/gameCheck.ts`
- `packages/domain/src/building/guide.ts`
- `packages/domain/src/building/sectionMembership.ts`
- `packages/domain/src/building/sectionSnapshots.ts`
- `packages/domain/src/building/site.ts`
- `packages/domain/src/catalog/build/facade.ts`
- `packages/domain/src/catalog/build/furnish.ts`
- `packages/domain/src/catalog/build/gameReady.ts`
- `packages/domain/src/catalog/build/plot.ts`
- `packages/domain/src/catalog/build/quality.ts`
- `packages/domain/src/catalog/build/refine.ts`
- `packages/domain/src/catalog/build/sets/antike.ts`
- `packages/domain/src/catalog/build/sets/befestigung.ts`
- `packages/domain/src/catalog/build/sets/deko.ts`
- `packages/domain/src/catalog/build/sets/dimensionen.ts`
- `packages/domain/src/catalog/build/sets/dorf.ts`
- `packages/domain/src/catalog/build/sets/epochen.ts`
- `packages/domain/src/catalog/build/sets/fahrzeuge.ts`
- `packages/domain/src/catalog/build/sets/fantasy.ts`
- `packages/domain/src/catalog/build/sets/farmen.ts`
- `packages/domain/src/catalog/build/sets/garten.ts`
- `packages/domain/src/catalog/build/sets/grossbauten.ts`
- `packages/domain/src/catalog/build/sets/hof.ts`
- `packages/domain/src/catalog/build/sets/index.ts`
- `packages/domain/src/catalog/build/sets/infrastruktur.ts`
- `packages/domain/src/catalog/build/sets/interieur.ts`
- `packages/domain/src/catalog/build/sets/klassiker.ts`
- `packages/domain/src/catalog/build/sets/kueste.ts`
- `packages/domain/src/catalog/build/sets/landschaft.ts`
- `packages/domain/src/catalog/build/sets/meister.ts`
- `packages/domain/src/catalog/build/sets/natur.ts`
- `packages/domain/src/catalog/build/sets/redstone.ts`
- `packages/domain/src/catalog/build/sets/sakral.ts`
- `packages/domain/src/catalog/build/sets/spielhilfen.ts`
- `packages/domain/src/catalog/build/sets/stadt.ts`
- `packages/domain/src/catalog/build/sets/technik.ts`
- `packages/domain/src/catalog/build/sets/untergrund.ts`
- `packages/domain/src/catalog/build/sets/varianten.ts`
- `packages/domain/src/catalog/build/sets/welten.ts`
- `packages/domain/src/catalog/build/sets/wohnen.ts`
- `packages/domain/src/catalog/build/spec.ts`
- `packages/domain/src/catalog/build/style.ts`
- `packages/domain/src/catalog/buildThemes.ts`
- `packages/domain/src/catalog/buildings.ts`
- `packages/domain/src/catalog/catalog.ts`
- `packages/domain/src/catalog/collections.ts`
- `packages/domain/src/catalog/community/library.ts`
- `packages/domain/src/catalog/community/registry.ts`
- `packages/domain/src/catalog/community/types.ts`
- `packages/domain/src/catalog/contribution.ts`
- `packages/domain/src/catalog/ensembles.ts`
- `packages/domain/src/catalog/generators/arena.ts`
- `packages/domain/src/catalog/generators/bridge.ts`
- `packages/domain/src/catalog/generators/church.ts`
- `packages/domain/src/catalog/generators/compound.ts`
- `packages/domain/src/catalog/generators/gatehouse.ts`
- `packages/domain/src/catalog/generators/harbor.ts`
- `packages/domain/src/catalog/generators/house.ts`
- `packages/domain/src/catalog/generators/index.ts`
- `packages/domain/src/catalog/generators/params.ts`
- `packages/domain/src/catalog/generators/roof.ts`
- `packages/domain/src/catalog/generators/roofs.ts`
- `packages/domain/src/catalog/generators/stairwell.ts`
- `packages/domain/src/catalog/generators/styles.ts`
- `packages/domain/src/catalog/generators/tower.ts`
- `packages/domain/src/catalog/generators/types.ts`
- `packages/domain/src/catalog/generators/wall.ts`
- `packages/domain/src/catalog/generators/well.ts`
- `packages/domain/src/catalog/generators/windmill.ts`
- `packages/domain/src/catalog/grossprojekte.ts`
- `packages/domain/src/catalog/grossprojekte/bergbaustadt.ts`
- `packages/domain/src/catalog/grossprojekte/burganlage.ts`
- `packages/domain/src/catalog/grossprojekte/hafenstadt.ts`
- `packages/domain/src/catalog/grossprojekte/hauptstadt.ts`
- `packages/domain/src/catalog/grossprojekte/helpers.ts`
- `packages/domain/src/catalog/grossprojekte/index.ts`
- `packages/domain/src/catalog/grossprojekte/industriehafen.ts`
- `packages/domain/src/catalog/grossprojekte/innenstadt.ts`
- `packages/domain/src/catalog/grossprojekte/klosterdorf.ts`
- `packages/domain/src/catalog/grossprojekte/kolosseum.ts`
- `packages/domain/src/catalog/grossprojekte/landgut.ts`
- `packages/domain/src/catalog/grossprojekte/magierstadt.ts`
- `packages/domain/src/catalog/grossprojekte/marktstadt.ts`
- `packages/domain/src/catalog/grossprojekte/residenzstadt.ts`
- `packages/domain/src/catalog/grossprojekte/tempelstadt.ts`
- `packages/domain/src/catalog/library.ts`
- `packages/domain/src/core/compose.ts`
- `packages/domain/src/core/connectors.ts`
- `packages/domain/src/core/hash.ts`
- `packages/domain/src/core/inspect.ts`
- `packages/domain/src/core/placement.ts`
- `packages/domain/src/core/project.ts`
- `packages/domain/src/core/samples.ts`
- `packages/domain/src/core/split.ts`
- `packages/domain/src/core/types.ts`
- `packages/domain/src/data/backup.ts`
- `packages/domain/src/data/backupStatus.ts`
- `packages/domain/src/data/integrity.ts`
- `packages/domain/src/data/planGraph.ts`
- `packages/domain/src/data/recordValidation.ts`
- `packages/domain/src/data/versionStorage.ts`
- `packages/domain/src/editor/colorMatch.ts`
- `packages/domain/src/editor/commit.ts`
- `packages/domain/src/editor/curves.ts`
- `packages/domain/src/editor/draft.ts`
- `packages/domain/src/editor/forms.ts`
- `packages/domain/src/editor/patterns.ts`
- `packages/domain/src/editor/region.ts`
- `packages/domain/src/editor/sculpt.ts`
- `packages/domain/src/editor/settle.ts`
- `packages/domain/src/editor/shapes.ts`
- `packages/domain/src/editor/stencils.ts`
- `packages/domain/src/editor/symmetry.ts`
- `packages/domain/src/editor/tools.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/materials/copper.ts`
- `packages/domain/src/materials/materialLab.ts`
- `packages/domain/src/materials/materials.ts`
- `packages/domain/src/materials/production.ts`
- `packages/domain/src/materials/productionPlan.ts`
- `packages/domain/src/materials/profileRecipes.ts`
- `packages/domain/src/materials/recipeProfile.ts`
- `packages/domain/src/materials/recipes.ts`
- `packages/domain/src/materials/variants.ts`
- `packages/domain/src/planning/program.ts`
- `packages/domain/src/planning/programMaterial.ts`
- `packages/domain/src/planning/projectOrder.ts`
- `packages/domain/src/team/liveLink.ts`
- `packages/domain/src/team/ownerWire.ts`
- `packages/domain/src/team/serverControl.ts`
- `packages/domain/src/team/team.ts`
- `packages/domain/src/team/teamDigest.ts`
- `packages/domain/src/team/teamLink.ts`
- `packages/domain/src/team/teamPlan.ts`
- `packages/domain/src/team/teamSync.ts`
- `packages/domain/src/versions/revisionExport.ts`
- `packages/domain/src/versions/updateState.ts`
- `packages/domain/src/versions/updates.ts`
- `packages/domain/src/world/liveMapExport.ts`
- `packages/domain/src/world/livemap.ts`
- `packages/domain/src/world/scanRoutes.ts`
- `packages/domain/src/world/terrain.ts`
- `packages/domain/src/world/terrainDesign.ts`
- `packages/domain/src/world/terrainScatter.ts`
- `packages/domain/src/world/terrainScatterPlan.ts`
- `packages/domain/src/world/terrainSurvey.ts`
- `packages/domain/src/world/worldPlan.ts`
- `packages/domain/src/world/worldPlanEdit.ts`
- `packages/domain/src/world/worldRoute.ts`
- `packages/domain/src/world/worldmap.ts`
- `packages/formats/src/worldExcerpt.ts`
- `scripts/benchmark_composition.mjs`
- `scripts/benchmark_project_browser.mjs`
- `scripts/bridge_paperlink.mjs`
- `scripts/dev/moves/2026-11-05-stufe2-module.json`
- `scripts/dev/restructure.mjs`
- `scripts/gen_profile.mjs`
- `scripts/library_intake.mjs`
- `services/team-room/src/core.js`
- `tests/anlagen.test.mjs`
- `tests/baustil.test.mjs`
- `tests/build-run.test.mjs`
- `tests/build-themes.test.mjs`
- `tests/contribution.test.mjs`
- `tests/copper.test.mjs`
- `tests/generators.test.mjs`
- `tests/grossprojekte.test.mjs`
- `tests/large-edit.test.mjs`
- `tests/lazy-cells.test.mjs`
- `tests/livemap.test.mjs`
- `tests/material-lab.test.mjs`
- `tests/owner-wire.test.mjs`
- `tests/record-validation.test.mjs`
- `tests/restructure.test.mjs`
- `tests/roadmap.test.mjs`
- `tests/variants.test.mjs`
- `vite.config.mjs`

## 2026-11-05T11:02:09.307Z · progress

**Aufgaben:** CORE-04

Kernmodule geprüft: Verweise zwischen Projekten, Projektsitzung, Werkstatt (8 Fehler), Import/Export/Speicher (3 Fehler) behoben; check grün, Browser 175 Tests grün (team-room einmal wackelig); Abnahme PROJ-22 offen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| CORE-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme CORE-04-S05 durch Philipp. |

**Geänderte Dateien:**

- `apps/web/src/app/router.ts`
- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/editor/LayerGrid.tsx`
- `apps/web/src/editor/WorkshopPage.tsx`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/project/BlocksTab.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/session.ts`
- `apps/web/src/views/project/team/TeamRoom.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/DOMAIN.md`
- `docs/architecture/PLAN_MODEL.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/core/project.ts`
- `packages/domain/src/data/backup.ts`
- `packages/domain/src/data/integrity.ts`
- `packages/domain/src/data/planGraph.ts`
- `packages/domain/src/editor/stencils.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/planning/projectOrder.ts`
- `packages/formats/src/structure.ts`
- `packages/voxel/src/blockContentEdit.ts`
- `tests/block-content-edit.test.mjs`
- `tests/core-links.test.mjs`
- `tests/editor-patterns.test.mjs`

## 2026-11-05T11:03:24.121Z · progress

**Aufgaben:** CORE-01, CORE-02, CORE-03, STORE-01, MAT-01, BUILD-01, LIB-01, GEN-01, OPS-01, PLAN-01, ARCH-01, ARCH-02, DOC-01, STORE-02, UI-01, UI-02, STAB-01, OPS-02, PROFILE-01, NBT-01, FORMAT-01, FORMAT-02, MAT-02, MAT-03, MAT-04, DIFF-01, PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, VIEW-01, VIEW-02, BLOCK-01, BLOCK-02, GFX-01, GFX-02, MODEL-01, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, UPDATE-01, LIB-02, LIB-03, WORLD-02, BUILD-05, TERRAIN-01, TERRAIN-02, TERRAIN-03, BUILD-06, GEN-02, MAP-01, MAP-03, MAP-04, MAP-02, GAME-01, GAME-02, GAME-07, GAME-08, GAME-03, WORLD-IMPORT-01, BACKUP-02, GAME-04, GAME-05, LAGER-01, DEFER-01, LIB-04, ENTITY-01, LIB-05, LIB-06, BASE-01, SPLIT-01, GROSS-01, MAP-05, MAP-06, MAP-07, QA-04, GEN-03, SIZE-01, COOP-01, COOP-02, COOP-03, COOP-04, COOP-05, COOP-06, PROJ-01, GAME-09, GAME-10, COOP-07, COOP-08, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, LINK-01, LINK-02, LINK-03, LINK-05, LINK-06, COOP-09, COOP-10, COOP-11, PROJ-02, PROJ-03, PROJ-04, LINK-07, EDIT-06, FALLBACK-01, LINK-10, STRUCT-01, CORE-04

Stufe 1 (STRUCT-01): scripts/ in Unterordner (pages, checks, roadmap, mod, gen, fixtures, bench, library, team, dev; publish_pages.sh bleibt), Einheitstests nach tests/unit/<bereich>/ (npm test über tests/**/*.test.mjs), docs/architecture nach Bereich, Altbestand nach docs/archiv/, Strukturtest. Übrige Aufgaben: nur Dateiumfang/Nachweispfade umgeschrieben. npm run check und 176 Browsertests grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| CORE-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| CORE-02 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| CORE-03 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| STORE-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| MAT-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| BUILD-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| LIB-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| GEN-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| OPS-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| ARCH-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |
| ARCH-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme der Migration mit echten Browserdaten (S05); danach kompakte Laufzeitform der Zellen als Folge von PERF-02. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Aktuelle Prüf-/Main-/Live-Nachweise im nächsten sachlichen Quellblock nachführen; keine selbstreferenzielle Deploymentfolge. |
| STORE-02 | ✅ Im beschriebenen Umfang geprüft | 3/3 | CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02. |
| UI-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Oberflächenregression bei Themen-/Layoutänderungen weiterführen; echte Geräte separat in QA-02. |
| UI-02 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Echte Geräteprüfung (Safari/iPhone, Touch) in QA-02; weitere Hauptbereiche (z. B. Karte MAP-01) als Eintrag in nav.ts anhängen. |
| STAB-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Erledigt. |
| OPS-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei tatsächlichem Vorfall bekannten Build neu bestätigen und Recovery regulär ohne Force vorbereiten; Livehashes danach gesondert prüfen. |
| PROFILE-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme: Profilprüfung im Gebäudeblatt an einer echten älteren Schem-/Litematic-Datei ansehen (Testphase). |
| NBT-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme im Spiel: gedrehtes Bauteil mit Truhen, Schildern und einem Strukturblock exportieren und in 26.3 laden (Testphase). |
| FORMAT-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Hochgeladene WorldEdit-Datei mit npm run format:check-schem prüfen; Befunde beheben. |
| FORMAT-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Export im Spiel mit Litematica laden (Philipps PC, Fabric 26.3) – FORMAT-02-S02. |
| MAT-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme in der Testphase: Rohstoffliste eines großen Bauwerks mit gewählter Holzart und Brennstoff mit dem Spiel vergleichen. |
| MAT-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme PROJ-14. |
| MAT-04 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme: Kupfervariante eines Bauwerks im Planer erzeugen und im Spiel ansehen (Testphase). |
| DIFF-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme in der Testphase: zwei Stände eines verschobenen Bauwerks vergleichen. |
| PERF-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Messung bei Rechenkernänderungen wiederholen; Übertragungs-/Invalidierungsarbeit in PERF-02, vollständige React-/Gerätelatenz gesondert prüfen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 3/3 | PERF-02-S03 zusammen mit PERF-05-S08 (Zellen erst bei Bedarf entpacken) im Performance-Thread umsetzen; beide ändern compose/Entpacken. Übergabe abgestimmt am 03.11.2026. |
| PERF-03 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Erledigt; weitere Bundle-Arbeit läuft unter PERF-05 (O-5, gezielte Unterpfade). |
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06); der GPU-Upload großer Szenen läuft seit GFX-02-S03 in Stücken. |
| PERF-05 | 🧩 Implementiert · Abnahme offen | 8/9 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |
| VIEW-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Aktuelle GPU-/Touch-Prüfung mit negativen Koordinaten und allen Schnittachsen. |
| VIEW-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Mojang-Download im echten Browser und weitere Browser prüfen (Testphase); Register ist seit PROFILE-01 an den Serverbericht gebunden. |
| BLOCK-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme im Spiel; PROFILE-01 kann die Berichtsfakten übernehmen. Die Katalogfehler aus der Spielprüfung behebt BLOCK-02. |
| BLOCK-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme im Spiel (S06): geänderte Gebäude (z. B. Werkstatt, Windmühle, Torhaus, Stadthaus) per Litematic setzen. |
| GFX-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Prüfung auf echten Geräten und Browsern (S06); Biomfarben und leuchtende Blockentities als GFX-02. |
| GFX-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf echten GPUs, Firefox/Safari und Abgleich mit Spielbildern (S04, zusammen mit GFX-01-S06). |
| MODEL-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Dateien in Blender und Slicern prüfen und ein Testdruck; danach Flächenzusammenfassung (S06). Export läuft seit PERF-04 im Worker. |
| EDIT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Geräteprüfung (QA-02). Gruppenziehen im 3D-Bild ist mit EDIT-06 erledigt. |
| EDIT-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung. Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| EDIT-03 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung der Schablonen-Zustände (Tür, Treppe, Laterne). Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Spielprüfung gespiegelter Zustände; danach Gelände-Werkzeuge auf Projektgelände (eigener Thread) und Symmetrie/Kurven im Mod. |
| EDIT-05 | 🧩 Implementiert · Abnahme offen | 6/7 | EDIT-05-S07: Abnahme durch Philipp in der Werkstatt (Zauberstab, Stapeln, Extrudieren, Wendel) und Spielprüfung gestapelter/gedrehter Bauteile mit Ausstattung. |
| UPDATE-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Echtgeräteabnahme (QA-02); Teamreihenfolge der Updateoperationen in TEAM-02. |
| LIB-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Rückmeldung zur Bedienung der Sammlungen einholen. |
| LIB-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen. |
| WORLD-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Kuratierte Filter-/Treffernachweise bei Katalogänderungen fortführen; keine weitere Karte ohne tatsächliche Assets. |
| BUILD-05 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Gelände-/Hanglagen und Türausrichtung zum Weg als eigene Folgeaufgabe; Echtgeräteabnahme mit QA-02. |
| TERRAIN-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit eigener Welt (S05); danach Weg mit Stufen/Kurven und Stützmauern als Blöcke als eigene Folgeaufgabe. |
| TERRAIN-02 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit eigener Welt (S05); Wegstufen und Brücken siehe TERRAIN-03. |
| TERRAIN-03 | 🧩 Implementiert · Abnahme offen | 6/8 | Abnahme PROJ-19 und BIB-19 im Spiel; danach Wegenetz der Basis als Landschaftsweg (S08). |
| BUILD-06 | 🧩 Implementiert · Abnahme offen | 5/5 | Echtgeräte- und Druckerabnahme mit QA-02; Philipps Spieltest mit Mod-Aufnahme (WorldAnchor) auf seinem Server. |
| GEN-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Generierte Bauten (v. a. Treppenhaus, Torhaus-Wehrgang, Hafen) im Spiel abnehmen; Treppenhaus-Anbau an Haus als Anlage erwägen. |
| MAP-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02. |
| MAP-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server. |
| MAP-04 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); denkbare Folge: benannte Gruppen/Sperren mit Schemaerweiterung, abgestimmt mit der Mod. |
| MAP-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme KARTE-08 auf Philipps Server-Karte. |
| GAME-01 | ✅ Im beschriebenen Umfang geprüft | 1/1 | Regressionen bei Änderungen weiterführen. |
| GAME-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp testet die .jar aus /mnt/project-files/mod/ auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md). |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 9/11 | Philipp prüft Packliste und Gerüst (0.13.0, TESTPLAN MOD-17) im echten Spiel; danach Stufe 6b (Gruppen/Sperren aus dem Weltbuilder). |
| GAME-08 | 🧩 Implementiert · Abnahme offen | 5/5 | Philipp prüft Protokoll 3 im echten Spiel (TESTPLAN MOD-17); Forge und Paper ohne Live-Verbindung. |
| GAME-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |
| WORLD-IMPORT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Mit einer Kopie von Philipps eigener 26.3-Welt (Modpack) einen Ausschnitt übernehmen und ein platziertes Projekt prüfen. |
| BACKUP-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen. |
| GAME-04 | 🚧 In Arbeit | 3/4 | Abnahme auf Philipps eigenem Paper-Server (GAME-04-S04). |
| GAME-05 | 🧩 Implementiert · Abnahme offen | 3/4 | Forge-Spieltest: kopfloser Client bleibt im Ladebildschirm stehen; auf einem Rechner mit Bildschirm (scripts/test_bridge_ingame_forge.sh forge) oder durch Philipp prüfen, dann Forge-Jar bereitstellen. |
| LAGER-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf dem Paper-Server (Thread „Server-Plugin mit geprüften Lagerkisten“). |
| DEFER-01 | ⏸ Zurückgestellt | 0/1 | Nur nach neuem ausdrücklichem Nutzerauftrag neu bewerten. |
| LIB-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen. |
| ENTITY-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Export mit Entities im Spiel prüfen (S06). Truhen-/Schildinhalte bearbeiten ist mit EDIT-06 erledigt. |
| LIB-05 | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp. |
| LIB-06 | 🧩 Implementiert · Abnahme offen | 5/7 | Abnahme durch Philipp (S06) und erster echter Beitrag (S07). |
| BASE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06); danach Küstenlinie aus der Geländeaufnahme und Wegstufen. |
| SPLIT-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme mit echten Dateien (S05). |
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme durch Philipp (S06); Großbauten-Set (S05). |
| MAP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können. |
| MAP-06 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag). |
| MAP-07 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme KARTE-07; Server-Plugin könnte Pläne gedreht ablegen (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |
| GEN-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp baut das Kolosseum im Spiel nach (BIB-14); danach Feinschliff (Statuen in den Attika-Fenstern, Treppen im Hypogäum). |
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |
| COOP-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05). |
| COOP-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Server. |
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore. |
| COOP-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md). |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod-Thread veröffentlicht Paper-Jar 0.10.0 mit Teamkanal; danach Abnahme LAGER-01…09 auf Philipps Server. |
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern. |
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |
| COOP-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl umgesetzt (LINK-05). |
| COOP-08 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LAGER-10 mit einer echten Farm; Ertragsbuch in TEAMBAU-28. |
| PROD-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-12; später Erträge aus geprüften Lagerkisten (COOP-05) ins Ertragsbuch. |
| PROD-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-13. |
| PROD-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Später: Ofenstraße aus dem Katalog direkt vorschlagen und in die Planung legen. |
| PROD-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin. |
| PROD-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen. |
| LINK-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LINK-01 auf Philipps Server. |
| LINK-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Plan-Upload aus dem Planer; Abnahme LINK-02. |
| LINK-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LIVE-01 in Philipps Modpack. |
| LINK-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Abnahme vom iPad (Testplan LINK-04). |
| LINK-06 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme durch Philipp (Testplan LINK-05, LINK-06; Paper-Plugin 0.13.0 auf dem Server). |
| COOP-09 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit Mitspielern (TEAMBAU-25). |
| COOP-10 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit Mitspielern ohne Plugin (TEAMBAU-27, TEAMBAU-25). |
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| PROJ-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05, PROJ-16…18). |
| PROJ-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-20 durch Philipp. |
| PROJ-04 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-21 durch Philipp. |
| LINK-07 | 🚧 In Arbeit | 5/6 | Team-Thread deployt den Raum (Aufnahmen, Positionen); Modrinth 0.15.0; Abnahme LINK-07/LINK-08 durch Philipp. |
| EDIT-06 | 🧩 Implementiert · Abnahme offen | 4/5 | EDIT-06-S05: Philipp prüft das Bauen im 3D-Bild auf PC und iPad (WERK-08) und lädt eine Truhe/ein Schild mit Inhalt im Spiel (WERK-09). |
| FALLBACK-01 | 🚧 In Arbeit | 4/5 | Spieltest Mod 0.16.0, Release über den Modrinth-Thread, Abnahme LINK-09 durch Philipp. |
| LINK-10 | 🧩 Implementiert · Abnahme offen | 4/4 | Release 0.17.0 über den Modrinth-Thread, Team-Raum ausrollen, Abnahme mit LINK-09. |
| STRUCT-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Durchsicht der Ordnerkarte durch Philipp; parallele Threads ziehen neue Dateien mit dem Codemod nach. |
| CORE-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme CORE-04-S05 durch Philipp. |

**Geänderte Dateien:**

- `.githooks/pre-push`
- `AGENTS.md`
- `README.md`
- `apps/web/src/blockmodels/colors26.ts`
- `apps/web/src/jobs/library.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/library/ContributePanel.tsx`
- `apps/web/src/views/map/GameProgress.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/map/liveMapConfig.ts`
- `apps/web/src/views/mod/ServerPanel.tsx`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/mod/releases.ts`
- `apps/web/src/views/mod/serverClient.ts`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `apps/web/src/views/project/team/TeamLive.tsx`
- `apps/web/src/views/project/team/TeamPlan.tsx`
- `apps/web/src/views/project/team/TeamProof.tsx`
- `apps/web/src/views/project/team/TeamRoom.tsx`
- `apps/web/src/views/project/team/TeamTab.tsx`
- `apps/web/src/views/project/team/roomClient.ts`
- `apps/web/src/views/project/team/teamTransfer.ts`
- `docs/BLOCKS.md`
- `docs/COMMUNICATION.md`
- `docs/LICENSING.md`
- `docs/REQUIREMENTS.md`
- `docs/REVIEW.md`
- `docs/STATUS.md`
- `docs/STRUKTUR.md`
- `docs/TESTING.md`
- `docs/architecture/betrieb/HOSTING.md`
- `docs/architecture/betrieb/TESTPHASE.md`
- `docs/architecture/bibliothek/ANLAGEN.md`
- `docs/architecture/bibliothek/BASE_PLANNER.md`
- `docs/architecture/bibliothek/BAUSTIL.md`
- `docs/architecture/bibliothek/BUILD_THEMES.md`
- `docs/architecture/bibliothek/CATALOG.md`
- `docs/architecture/bibliothek/COLLECTIONS.md`
- `docs/architecture/bibliothek/CONTRIBUTIONS.md`
- `docs/architecture/bibliothek/GENERATORS.md`
- `docs/architecture/bibliothek/GROSSPROJEKTE.md`
- `docs/architecture/formate/BLOCK_LOGIC.md`
- `docs/architecture/formate/BLOCK_MODELS.md`
- `docs/architecture/formate/ENTITIES.md`
- `docs/architecture/formate/LITEMATIC.md`
- `docs/architecture/formate/MODEL_EXPORT.md`
- `docs/architecture/formate/NBT_TRANSFORMS.md`
- `docs/architecture/formate/SCHEM_EXPORT.md`
- `docs/architecture/formate/SCHEM_IMPORT.md`
- `docs/architecture/formate/VERSION_PROFILE.md`
- `docs/architecture/kern/ASSET_CONCURRENCY.md`
- `docs/architecture/kern/BACKGROUND_JOBS.md`
- `docs/architecture/kern/BACKUPS.md`
- `docs/architecture/kern/COMPOSITION_PERFORMANCE.md`
- `docs/architecture/kern/CONNECTORS.md`
- `docs/architecture/kern/DECISIONS.md`
- `docs/architecture/kern/DOMAIN.md`
- `docs/architecture/kern/MODULES.md`
- `docs/architecture/kern/PERFORMANCE_AUDIT.md`
- `docs/architecture/kern/PERSISTENCE.md`
- `docs/architecture/kern/PLAN_MODEL.md`
- `docs/architecture/kern/PROJECT_BROWSER_BENCHMARK.md`
- `docs/architecture/kern/PROJECT_COMPUTATION.md`
- `docs/architecture/kern/SIZE_LIMITS.md`
- `docs/architecture/kern/SPECIFICATION.md`
- `docs/architecture/kern/STABILITY.md`
- `docs/architecture/kern/UPDATES.md`
- `docs/architecture/kern/VOXEL_CONTRACT.md`
- `docs/architecture/kern/project-browser-benchmark.json`
- `docs/architecture/mod/MOD_BRIDGE.md`
- `docs/architecture/mod/MOD_HOLOGRAM.md`
- `docs/architecture/planer/BLOCK_EDITOR.md`
- `docs/architecture/planer/BUILD_RUN.md`
- `docs/architecture/planer/CREATIVE_TOOLS.md`
- `docs/architecture/planer/GRAPHICS.md`
- `docs/architecture/planer/GUIDE.md`
- `docs/architecture/planer/MATERIALS.md`
- `docs/architecture/planer/MATERIAL_LAB.md`
- `docs/architecture/planer/PRODUCTION.md`
- `docs/architecture/planer/PROGRAM.md`
- `docs/architecture/planer/SCHEM_VIEWS.md`
- `docs/architecture/planer/SITE.md`
- `docs/architecture/planer/THEME_TOKENS.md`
- `docs/architecture/planer/UI.md`
- `docs/architecture/planer/UI_ACCEPTANCE.md`
- `docs/architecture/planer/VIEWER.md`
- `docs/architecture/team/AUTO_LINK.md`
- `docs/architecture/team/FALLBACKS.md`
- `docs/architecture/team/LAGERKISTEN.md`
- `docs/architecture/team/LIVE_LINK.md`
- `docs/architecture/team/TEAMBAU.md`
- `docs/architecture/team/TEAM_LIVE.md`
- `docs/architecture/welt/LANDSCAPE.md`
- `docs/architecture/welt/LIVEMAP.md`
- `docs/architecture/welt/TERRAIN.md`
- `docs/architecture/welt/WORLDMAP.md`
- `docs/architecture/welt/WORLD_BUILDER.md`
- `docs/architecture/welt/WORLD_IMPORT.md`
- `docs/archiv/BLOCKS.md`
- `docs/archiv/IMPLEMENTATION_PLAN.md`
- `docs/archiv/NOVEMBER_EXPANSION.md`
- `docs/archiv/ROADMAP_LEGACY.md`
- `docs/archiv/STATUS_HISTORY.md`
- `docs/library/BEITRAEGE.md`
- `docs/operations/GITHUB_CONNECTOR_RUNBOOK.md`
- `docs/operations/MAIN_ONLY_BRANCHES.md`
- `docs/operations/PAGES_RESTORE_PROBE.md`
- `docs/project/CODEX_PROMPT.md`
- `docs/project/CODEX_SETUP.md`
- `docs/project/PLANER_VERGLEICH.md`
- `docs/testing/TESTPLAN.md`
- `fixtures/litematic/README.md`
- `fixtures/schem/README.md`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/client-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/ClientScenario.java`
- `mods/bauplaner-bridge/core/src/main/java/io/github/freadeax/bauplaner/bridge/ScanJob.java`
- `mods/bauplaner-bridge/core/src/test/java/io/github/freadeax/bauplaner/bridge/SimulateScan.java`
- `mods/bauplaner-bridge/fabric-26.3/build.gradle`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/forge-26.3/build.gradle`
- `mods/bauplaner-bridge/forge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/ForgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LinkPrompt.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/BlockRules.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamState.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/DumpPlan.java`
- `mods/bauplaner-bridge/modrinth/project.json`
- `mods/bauplaner-bridge/neoforge-26.3/build.gradle`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/LiveLinkScenario.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/NeoForgeGameTest.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/LinkCore.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerLink.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndex.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreLedger.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamChannel.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/resources/config.yml`
- `mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/LinkCoreTest.java`
- `package.json`
- `packages/application/src/catalogSnapshot.ts`
- `packages/domain/src/building/buildRun.ts`
- `packages/domain/src/building/gameCheck.ts`
- `packages/domain/src/catalog/build/gameReady.ts`
- `packages/domain/src/catalog/build/quality.ts`
- `packages/domain/src/catalog/build/refine.ts`
- `packages/domain/src/catalog/build/sets/klassiker.ts`
- `packages/domain/src/catalog/build/style.ts`
- `packages/domain/src/catalog/community/registry.ts`
- `packages/domain/src/materials/profileRecipes.ts`
- `packages/domain/src/team/liveLink.ts`
- `packages/domain/src/team/serverControl.ts`
- `packages/domain/src/team/team.ts`
- `packages/domain/src/team/teamDigest.ts`
- `packages/domain/src/team/teamLink.ts`
- `packages/domain/src/team/teamPlan.ts`
- `packages/domain/src/team/teamSync.ts`
- `packages/domain/src/world/liveMapExport.ts`
- `packages/formats/src/anvil.ts`
- `packages/formats/src/defaultStates.ts`
- `packages/formats/src/scan.ts`
- `packages/voxel/src/blockFacts.ts`
- `packages/voxel/src/blocklogic/facts.ts`
- `packages/voxel/src/entities.ts`
- `packages/voxel/src/profile.ts`
- `packages/voxel/src/profileData.ts`
- `scripts/bench/benchmark_composition.mjs`
- `scripts/bench/benchmark_project_browser.mjs`
- `scripts/bench/perf/measure_start.mjs`
- `scripts/checks/check_architecture.mjs`
- `scripts/checks/check_docs.py`
- `scripts/checks/check_schem_roundtrip.mjs`
- `scripts/checks/render_testplan.mjs`
- `scripts/checks/verify_litematic.py`
- `scripts/checks/verify_schem.py`
- `scripts/dev/moves/2026-11-05-stufe1-doku.json`
- `scripts/dev/moves/2026-11-05-stufe1-skripte.json`
- `scripts/dev/moves/2026-11-05-stufe1-tests.json`
- `scripts/dev/python.mjs`
- `scripts/dev/restructure.mjs`
- `scripts/dev/setup_codex.mjs`
- `scripts/fixtures/make_litematic_fixture.py`
- `scripts/fixtures/make_region_fixture.py`
- `scripts/fixtures/make_schem_fixture.py`
- `scripts/fixtures/make_terrain_fixture.py`
- `scripts/gen/gen_block_data.py`
- `scripts/gen/gen_block_facts.mjs`
- `scripts/gen/gen_default_states.mjs`
- `scripts/gen/gen_profile.mjs`
- `scripts/gen/probe/BlockFactsProbe.java`
- `scripts/library/library_intake.mjs`
- `scripts/mod/bridge_crosscheck.mjs`
- `scripts/mod/bridge_gametest.mjs`
- `scripts/mod/bridge_paperlager.mjs`
- `scripts/mod/bridge_paperlink.mjs`
- `scripts/mod/bridge_paperroom.mjs`
- `scripts/mod/bridge_paperteam.mjs`
- `scripts/mod/bridge_papertest.mjs`
- `scripts/mod/bridge_room_prepare.mjs`
- `scripts/mod/bridge_sendcheck.mjs`
- `scripts/mod/modrinth_publish.mjs`
- `scripts/mod/release_mod.mjs`
- `scripts/mod/test_bridge.sh`
- `scripts/mod/test_bridge_ingame.sh`
- `scripts/mod/test_bridge_ingame_forge.sh`
- `scripts/mod/test_bridge_paper.sh`
- `scripts/mod/test_bridge_paper_lager.sh`
- `scripts/mod/test_bridge_paper_link.sh`
- `scripts/mod/test_bridge_paper_room.sh`
- `scripts/mod/test_bridge_paper_team.sh`
- `scripts/mod/test_world_import_real.sh`
- `scripts/pages/build_catalog_snapshot.mjs`
- `scripts/pages/catalog_key.mjs`
- `scripts/pages/clean_pages.mjs`
- `scripts/pages/prepare_main_pages.mjs`
- `scripts/pages/prepare_pages.mjs`
- `scripts/pages/probe_pages_restore.mjs`
- `scripts/pages/publish_main_pages.sh`
- `scripts/publish_pages.sh`
- `scripts/roadmap/roadmap.mjs`
- `scripts/team/team_room_smoke.mjs`
- `services/team-room/README.md`
- `services/team-room/src/core.js`
- `services/team-room/src/index.js`
- `services/team-room/wrangler.toml`
- `tests/e2e/export.e2e.mjs`
- `tests/e2e/landscape-scatter.e2e.mjs`
- `tests/e2e/landscape.e2e.mjs`
- `tests/e2e/litematic.e2e.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/server-link.e2e.mjs`
- `tests/e2e/team-live.e2e.mjs`
- `tests/e2e/team-room.e2e.mjs`
- `tests/e2e/terrain.e2e.mjs`
- `tests/e2e/world-import.e2e.mjs`
- `tests/unit/building/block-content-edit.test.mjs`
- `tests/unit/building/block-logic.test.mjs`
- `tests/unit/building/blocks.test.mjs`
- `tests/unit/building/build-run.test.mjs`
- `tests/unit/building/game-check.test.mjs`
- `tests/unit/building/guide.test.mjs`
- `tests/unit/building/site.test.mjs`
- `tests/unit/catalog/anlagen.test.mjs`
- `tests/unit/catalog/base-shore.test.mjs`
- `tests/unit/catalog/base.test.mjs`
- `tests/unit/catalog/baustil.test.mjs`
- `tests/unit/catalog/build-themes.test.mjs`
- `tests/unit/catalog/catalog-game.test.mjs`
- `tests/unit/catalog/catalog.test.mjs`
- `tests/unit/catalog/collections.test.mjs`
- `tests/unit/catalog/contribution.test.mjs`
- `tests/unit/catalog/generators.test.mjs`
- `tests/unit/catalog/grossprojekte.test.mjs`
- `tests/unit/catalog/library-start.test.mjs`
- `tests/unit/core/application.test.mjs`
- `tests/unit/core/asset-concurrency.test.mjs`
- `tests/unit/core/asset-restore.test.mjs`
- `tests/unit/core/asset-seeding.test.mjs`
- `tests/unit/core/background-jobs.test.mjs`
- `tests/unit/core/canonical-json.test.mjs`
- `tests/unit/core/composition-index.test.mjs`
- `tests/unit/core/computation-transport.test.mjs`
- `tests/unit/core/connectors.test.mjs`
- `tests/unit/core/core-links.test.mjs`
- `tests/unit/core/diff-shift.test.mjs`
- `tests/unit/core/domain.test.mjs`
- `tests/unit/core/large-edit.test.mjs`
- `tests/unit/core/lazy-cells.test.mjs`
- `tests/unit/core/project-computation.test.mjs`
- `tests/unit/core/scan-persistence.test.mjs`
- `tests/unit/core/selective-recompute.test.mjs`
- `tests/unit/core/size-limits.test.mjs`
- `tests/unit/core/split-under.test.mjs`
- `tests/unit/core/stable-math.test.mjs`
- `tests/unit/core/states.test.mjs`
- `tests/unit/core/updates.test.mjs`
- `tests/unit/core/variants.test.mjs`
- `tests/unit/core/voxel.test.mjs`
- `tests/unit/data/backup-reminder.test.mjs`
- `tests/unit/data/backup.test.mjs`
- `tests/unit/data/integrity.test.mjs`
- `tests/unit/data/plan-model.test.mjs`
- `tests/unit/data/record-validation.test.mjs`
- `tests/unit/editor/editor-creative.test.mjs`
- `tests/unit/editor/editor-patterns.test.mjs`
- `tests/unit/editor/editor-region.test.mjs`
- `tests/unit/editor/editor.test.mjs`
- `tests/unit/formats/anvil.test.mjs`
- `tests/unit/formats/entities.test.mjs`
- `tests/unit/formats/litematic.test.mjs`
- `tests/unit/formats/model3d.test.mjs`
- `tests/unit/formats/nbt-transforms.test.mjs`
- `tests/unit/formats/profile.test.mjs`
- `tests/unit/formats/schem-export.test.mjs`
- `tests/unit/formats/schem-roundtrip.test.mjs`
- `tests/unit/formats/schem-views.test.mjs`
- `tests/unit/formats/schem.test.mjs`
- `tests/unit/materials/copper.test.mjs`
- `tests/unit/materials/material-catalog.test.mjs`
- `tests/unit/materials/material-lab.test.mjs`
- `tests/unit/materials/materials.test.mjs`
- `tests/unit/materials/production.test.mjs`
- `tests/unit/materials/recipe-prefs.test.mjs`
- `tests/unit/materials/recipe-profile.test.mjs`
- `tests/unit/materials/recipes.test.mjs`
- `tests/unit/mod/mod-releases.test.mjs`
- `tests/unit/mod/modrinth.test.mjs`
- `tests/unit/planning/program-absence.test.mjs`
- `tests/unit/planning/program-depth.test.mjs`
- `tests/unit/planning/program.test.mjs`
- `tests/unit/planning/project-order.test.mjs`
- `tests/unit/team/lager.test.mjs`
- `tests/unit/team/livelink.test.mjs`
- `tests/unit/team/owner-wire.test.mjs`
- `tests/unit/team/server-link.test.mjs`
- `tests/unit/team/team-digest.test.mjs`
- `tests/unit/team/team-link.test.mjs`
- `tests/unit/team/team-room.test.mjs`
- `tests/unit/team/team.test.mjs`
- `tests/unit/team/teamPlan.test.mjs`
- `tests/unit/tooling/architecture.test.mjs`
- `tests/unit/tooling/main-pages.test.mjs`
- `tests/unit/tooling/pages-restore.test.mjs`
- `tests/unit/tooling/pages.test.mjs`
- `tests/unit/tooling/python-runner.test.mjs`
- `tests/unit/tooling/restructure.test.mjs`
- `tests/unit/tooling/roadmap.test.mjs`
- `tests/unit/tooling/structure.test.mjs`
- `tests/unit/web/graphics.test.mjs`
- `tests/unit/web/graphics2.test.mjs`
- `tests/unit/web/preferences.test.mjs`
- `tests/unit/web/router.test.mjs`
- `tests/unit/web/stability.test.mjs`
- `tests/unit/web/testphase.test.mjs`
- `tests/unit/web/theme-preferences.test.mjs`
- `tests/unit/web/theme-tokens.test.mjs`
- `tests/unit/web/viewer.test.mjs`
- `tests/unit/world/livemap-export.test.mjs`
- `tests/unit/world/livemap.test.mjs`
- `tests/unit/world/scan-routes.test.mjs`
- `tests/unit/world/terrain-design.test.mjs`
- `tests/unit/world/terrain-paths.test.mjs`
- `tests/unit/world/terrain-scatter.test.mjs`
- `tests/unit/world/terrain-survey.test.mjs`
- `tests/unit/world/terrain.test.mjs`
- `tests/unit/world/world-turn.test.mjs`
- `tests/unit/world/worldbuilder.test.mjs`
- `tests/unit/world/worldmap.test.mjs`
- `tests/unit/world/worldplan.test.mjs`
- `tests/unit/world/worldroute.test.mjs`
- `vite.config.mjs`

## 2026-11-05T11:06:42.936Z · progress

**Aufgaben:** STRUCT-01

STRUCT-01 im Testplan an Start- und Systemcheck (START-03, SYS-03) gebunden: nach dem Umzug startet der Planer und der Datencheck ist sauber.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| STRUCT-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Durchsicht der Ordnerkarte durch Philipp; parallele Threads ziehen neue Dateien mit dem Codemod nach. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `docs/testing/TESTPLAN.md`

## 2026-11-05T11:53:19.756Z · progress

**Aufgaben:** PERF-06

S01 Offline-Speicher: sw.js aus dem Build, Start ohne Internet, nach Updates nur geänderte Dateien, Systemcheck-Karte, Notbremse; npm run check grün, offline.e2e 3/3 in Chromium; Safari/Firefox offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-06 | 🚧 In Arbeit | 1/3 | PERF-06-S02 Cloudflare Pages einrichten (Philipp 05.11.2026: kostenlos, Offline-Speicher und Cloudflare-Anbindung). |

**Geänderte Dateien:**

- `apps/web/src/app/offline.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/views/SystemView.tsx`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/betrieb/HOSTING.md`
- `docs/architecture/betrieb/OFFLINE.md`
- `package.json`
- `scripts/pages/build_service_worker.mjs`
- `scripts/pages/prepare_main_pages.mjs`
- `scripts/pages/service_worker.template.js`
- `tests/e2e/offline.e2e.mjs`
- `tests/unit/tooling/service-worker.test.mjs`

## 2026-11-05T11:59:28.525Z · progress

**Aufgaben:** PERF-06

S02 Cloudflare Pages live (bauplaner.pages.dev, gratis), publish_pages.sh lädt mit hoch; Team-Raum-Herkunft im Code, Deploy und Mod-Herkunft offen (S03).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-06 | 🚧 In Arbeit | 2/3 | PERF-06-S03: Team-Raum mit neuer Herkunft deployen (zusammen mit dem offenen LINK-10-Raum-Deploy) und Mod-Herkunft in der nächsten Mod-Version (Thread „Anbindung von Planer, Mod und Server neu denken“). |

**Geänderte Dateien:**

- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/betrieb/OFFLINE.md`
- `package.json`
- `scripts/pages/publish_cloudflare.mjs`
- `scripts/pages/publish_main_pages.sh`
- `services/team-room/src/index.js`
- `tests/unit/tooling/cloudflare-pages.test.mjs`

## 2026-11-05T12:05:46.647Z · progress

**Aufgaben:** GAME-09

Modrinth-Seite vollständig: Offenlegungen (KI-Anteil Code/Text, Telemetrie nur mit Zustimmung über den Team-Raum, Systemzugriffe), Beschreibung Stand 0.17.0, neue Galerie und Icon aus echtem Spieltest; release gleicht Text, Icon, Galerie und Offenlegungen bei jeder Version ab

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/gallery/01-hologram.png`
- `mods/bauplaner-bridge/modrinth/gallery/04-material-list.png`
- `mods/bauplaner-bridge/modrinth/gallery/05-commands-status.png`
- `mods/bauplaner-bridge/modrinth/gallery/05-plan-menu.png`
- `mods/bauplaner-bridge/modrinth/gallery/06-team-commands.png`
- `mods/bauplaner-bridge/modrinth/gallery/06-website-link.png`
- `mods/bauplaner-bridge/modrinth/gallery/07-team-hud.png`
- `mods/bauplaner-bridge/modrinth/gallery/08-allow-planner.png`
- `mods/bauplaner-bridge/modrinth/icon.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `scripts/mod/modrinth_publish.mjs`
- `tests/unit/mod/modrinth.test.mjs`

## 2026-11-05T12:09:15.574Z · progress

**Aufgaben:** LINK-10

Mod 0.17.1 und Planer: https://bauplaner.pages.dev (PERF-06, Cloudflare Pages) als erlaubte Herkunft der Spielverbindung; Team-Raum-Quelle ebenso (Ausrollen wartet auf Philipps Karte). Geprüft: livelink.test, LiveLinkTest, Spieltest Fabric 26.3 und NeoForge 26.3 bestanden.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-10 | 🧩 Implementiert · Abnahme offen | 5/5 | Team-Raum mit bauplaner.pages.dev ausrollen (Karte), Release 0.17.0/0.17.1 über den Modrinth-Thread, Abnahme LINK-10. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.17.1.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.17.1.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `packages/domain/src/team/liveLink.ts`
- `tests/unit/team/livelink.test.mjs`

## 2026-11-05T12:13:28.443Z · progress

**Aufgaben:** GAME-09

KI-Offenlegung wird nicht mehr vom Skript gepflegt (Philipp 05.11.2026); Skript setzt nur die in project.json genannten Offenlegungen und lässt andere unangetastet

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/modrinth/project.json`
- `scripts/mod/modrinth_publish.mjs`
- `tests/unit/mod/modrinth.test.mjs`

## 2026-11-05T12:23:25.618Z · progress

**Aufgaben:** LINK-10

Mod 0.17.2: Planmenü kompakt bei 854×480/großer GUI-Größe (Footer unter die Planliste, engere rechte Spalte), Offenlegung um bauplaner.pages.dev ergänzt. Geprüft: Spieltest Fabric 26.3 mit Bildschirmfoto 854×480 und NeoForge 26.3 bestanden.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-10 | 🧩 Implementiert · Abnahme offen | 6/6 | Team-Raum mit bauplaner.pages.dev ausrollen (Karte), Release 0.17.2 über den Modrinth-Thread, Abnahme LINK-10. |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.17.2.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.17.2.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/modrinth/project.json`

## 2026-11-05T12:25:51.250Z · progress

**Aufgaben:** GAME-09

Titelbild (hervorgehobenes Galeriebild aus echter Spielaufnahme mit Projekttitel); KI-Offenlegung nur als Pflichtfeld ohne Text

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/modrinth/gallery/00-title.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `tests/unit/mod/modrinth.test.mjs`

## 2026-11-06T09:06:53.011Z · progress

**Aufgaben:** PROJ-05, PROJ-01, PROJ-02

PROJ-05: Bauleute-Konto (Sammelzusagen, eingebracht, entnommen, Saldo, ohne Zusage) und Bauleute aus dem Spiel (Kandidaten aus dem Team, live im Team-Raum, Team übernehmen mit Rückgängig) in der Planung; Waisen von PROJ-01/02 erledigt (Projektabhängigkeiten auf der Weltkarte seit PROJ-04).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROJ-05 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-23 durch Philipp. |
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |
| PROJ-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05, PROJ-16…18). |

**Geänderte Dateien:**

- `apps/web/src/styles/planning.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/PlanningTab.tsx`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/planer/PROGRAM.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/planning/builderAccount.ts`
- `tests/e2e/builder-account.e2e.mjs`
- `tests/unit/planning/builder-account.test.mjs`

## 2026-11-06T09:11:06.629Z · progress

**Aufgaben:** GFX-03, PERF-05, PERF-04

GFX-03: Glas/Wasser im Betrachter je Bild sortiert (höchstens ~25 ms statt 400 ms am Stück bei 1,56 Mio. Blöcken), Anklicken 3–4 statt 11–19 ms und richtiger Block auf sortiertem Glas/Wasser, Sichtfeld zuerst hochladen; Testfall DATEI-10. PERF-05-S07 (O-8): Plugin-Teamstand je Team zwischengespeichert, StorageCommands aus StorageModule herausgelöst (Paper 1.21.11 Lager-/Teamtest grün, noch ohne Release). Geprüft: npm run check, test:e2e 179/179; echte GPU offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GFX-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Rechner: großes Modell mit Wasser drehen und Blöcke anklicken, dazu Firefox/Safari (S04). |
| PERF-05 | 🧩 Implementiert · Abnahme offen | 9/9 | Weitere große Dateien (TeamClient, LiveLink, RoomClient, TeamModule) nach Merge der Mod-Threads teilen; inkrementelle Faltung des Teamprotokolls im Plugin beobachten. |
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06). Der GPU-Upload großer Szenen läuft seit GFX-02-S03 in Stücken, seit GFX-03 mit Sichtfeld zuerst. |

**Geänderte Dateien:**

- `apps/web/src/blockmodels/threeMesh.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/viewer/sceneController.ts`
- `docs/COMMUNICATION.md`
- `docs/TESTING.md`
- `docs/architecture/kern/PERFORMANCE_AUDIT.md`
- `docs/architecture/planer/GRAPHICS.md`
- `docs/architecture/team/LAGERKISTEN.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageCommands.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `tests/e2e/graphics2.e2e.mjs`
- `tests/unit/web/graphics3.test.mjs`

## 2026-11-06T09:18:45.680Z · progress

**Aufgaben:** TERRAIN-03, BASE-01, GROSS-01, GEN-03

Wegenetze als Landschaftsweg, Bauplätze einebnen mit Kaimauer, Küste im Lageplan, Großprojekte auf Gelände und aus Sammlungen, Kolosseum v2

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-03 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme PROJ-19, BIB-19 und BIB-20 im Spiel (Treppen, Brücken, Wegenetz der Basis auf echtem Gelände). |
| BASE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06, BIB-10, BIB-19, BIB-20); Küstenlinie, Wegstufen und Brücken sind über TERRAIN-03-S06/S08 umgesetzt. |
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S06 BIB-13, BIB-21, BIB-22). |
| GEN-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Philipp baut das Kolosseum im Spiel nach (BIB-14, mit Statuen und Hypogäum-Treppen). |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/library/BasePage.tsx`
- `apps/web/src/views/library/GrossprojektePage.tsx`
- `apps/web/src/views/library/anlagen.css`
- `apps/web/src/views/library/grossprojekte.css`
- `apps/web/src/views/library/planTerrain.tsx`
- `docs/architecture/bibliothek/BASE_PLANNER.md`
- `docs/architecture/bibliothek/GENERATORS.md`
- `docs/architecture/bibliothek/GROSSPROJEKTE.md`
- `docs/architecture/welt/LANDSCAPE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/base/anlagenTerrain.ts`
- `packages/domain/src/base/baseShore.ts`
- `packages/domain/src/base/planLandscape.ts`
- `packages/domain/src/catalog/generators/arena.ts`
- `packages/domain/src/catalog/grossprojekte.ts`
- `packages/domain/src/catalog/ownGrossprojekt.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/world/terrainDesign.ts`
- `tests/e2e/plan-landscape.e2e.mjs`
- `tests/unit/catalog/generators.test.mjs`
- `tests/unit/catalog/plan-landscape.test.mjs`
- `tests/unit/world/terrain-network.test.mjs`

## 2026-11-06T09:35:19.769Z · progress

**Aufgaben:** EDIT-04, COOP-05, LINK-02, GAME-11

Mod 0.18.0: Bauhilfen Symmetrie und Kurven in der Mod (Java-Port gleich den Planer-Prüfvektoren), Lagerstand aus dem Team-Raum im Materialfenster, Plan-Upload aus „Bauen“ mit Ankerwahl, Launcher-Anleitung auf #/mod; Plugin mit Teamstand-Zwischenspeicher aus GFX-03. Geprüft: Unit-Tests, mod-core/Paper-Tests, echte Spieltests Fabric und NeoForge 26.3, alle Browsertests; Bauhilfen im Spiel noch durch Philipp (MOD-18/19).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 7/8 | Spielprüfung gespiegelter Zustände im Planer (S07) und der Bauhilfen in der Mod (MOD-18/19); Gelände-Werkzeuge auf dem Projektgelände bleiben offen. |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LAGER-01…09 und LAGER-11 auf Philipps Server. |
| LINK-02 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme LINK-02 und LINK-11. |
| GAME-11 | 🚧 In Arbeit | 1/4 | Entschieden (Philipp 04.11.): Fabric 26.3 (sein Modpack mit REI) hat Vorrang, danach jeweils die neueste Minecraft-Version nachziehen; keine Matrix älterer Versionen. |

## 2026-11-06T09:55:18.242Z · progress

**Aufgaben:** EDIT-04, COOP-05, LINK-02, GAME-11

Dateizuordnung zu Mod 0.18.0 nachgetragen (der vorige Eintrag entstand nach dem Rebase ohne Dateiliste); keine inhaltliche Änderung.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 7/8 | Spielprüfung gespiegelter Zustände im Planer (S07) und der Bauhilfen in der Mod (MOD-18/19); Gelände-Werkzeuge auf dem Projektgelände bleiben offen. |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LAGER-01…09 und LAGER-11 auf Philipps Server. |
| LINK-02 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme LINK-02 und LINK-11. |
| GAME-11 | 🚧 In Arbeit | 1/4 | Entschieden (Philipp 04.11.): Fabric 26.3 (sein Modpack mit REI) hat Vorrang, danach jeweils die neueste Minecraft-Version nachziehen; keine Matrix älterer Versionen. |

**Geänderte Dateien:**

- `apps/web/src/styles/catalog.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/installGuide.ts`
- `apps/web/src/views/mod/planUpload.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `docs/architecture/mod/MOD_HOLOGRAM.md`
- `docs/architecture/planer/CREATIVE_TOOLS.md`
- `docs/architecture/team/AUTO_LINK.md`
- `docs/architecture/team/LAGERKISTEN.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.18.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.18.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.18.0.jar`
- `fixtures/edit/mod-edit-vectors.json`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/GuideClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramKeys.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MaterialScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/resources/assets/bauplaner_bridge/lang/de_de.json`
- `mods/bauplaner-bridge/hologram-26.3/src/main/resources/assets/bauplaner_bridge/lang/en_us.json`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/BuildGuides.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/Curve.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/GuidePlan.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/Symmetry.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomState.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/StoreStock.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamState.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/edit/EditGuidesTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomStockTest.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndex.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/serverControl.ts`
- `scripts/fixtures/make_edit_vectors.mjs`
- `tests/e2e/mod-download.e2e.mjs`
- `tests/e2e/shell.e2e.mjs`
- `tests/unit/editor/mod-edit-vectors.test.mjs`
- `tests/unit/mod/install-guide.test.mjs`
- `tests/unit/team/server-link.test.mjs`

## 2026-11-06T09:59:21.385Z · progress

**Aufgaben:** GAME-09

0.18.0 auf Modrinth (Fabric, NeoForge, Paper); Beschreibung um Bauhilfen Symmetrie/Kurven und Lagerspalte ergänzt

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`

## 2026-11-06T10:12:51.224Z · progress

**Aufgaben:** EDIT-04

Spieltest Fabric 26.3 um die Bauhilfen erweitert: Symmetrieachse, 4-fach gedreht und gespiegelt, 15 Blöcke über den echten Klickweg gesetzt, Mauerkurve durch drei Punkte; Aufnahme bauhilfen.png für die Modrinth-Galerie. Geprüft: echter Spieltest Fabric 26.3 bestanden.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 7/8 | Spielprüfung gespiegelter Zustände im Planer (S07) und der Bauhilfen in der Mod (MOD-18/19); Gelände-Werkzeuge auf dem Projektgelände bleiben offen. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `scripts/mod/bridge_gametest.mjs`

## 2026-11-06T10:18:20.598Z · progress

**Aufgaben:** GAME-09

Modrinth-Galerie: Bild Bauhilfen Symmetrie/Kurven (0.18.0)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/modrinth/gallery/09-build-guides.png`
- `mods/bauplaner-bridge/modrinth/project.json`

## 2026-11-06T10:23:30.536Z · progress

**Aufgaben:** MAP-04, GAME-07

Gruppen und Sperren: Weltplan-Schema 3 (group, locked), Weltbuilder (zuweisen, ein-/ausblenden, sperren, Gruppe wählen), Mod 0.19.0 zeigt gesperrte Flächen grau und beschränkt das Hologramm auf eine Gruppe (/bauplaner gruppe, POST /v1/group); echte Spieltests Fabric und NeoForge 26.3 grün, Abnahme KARTE-09/MOD-21 offen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme durch Philipp (S06): Langdruck-Menü auf dem Touch-Gerät, Gruppen und Sperren auf dem iPad (Testfall KARTE-09). |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 10/11 | Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7. |

## 2026-11-06T10:25:37.203Z · progress

**Aufgaben:** MAP-04, GAME-07

Dateizuordnung zu Gruppen und Sperren (Mod 0.19.0) nachgetragen (der vorige Eintrag entstand nach dem Rebase ohne Dateiliste); keine inhaltliche Änderung.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme durch Philipp (S06): Langdruck-Menü auf dem Touch-Gerät, Gruppen und Sperren auf dem iPad (Testfall KARTE-09). |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 10/11 | Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7. |

**Geänderte Dateien:**

- `apps/web/src/styles/map.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/Builder.tsx`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/OverviewMap.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/mod/releases.json`
- `docs/TESTING.md`
- `docs/architecture/mod/MOD_HOLOGRAM.md`
- `docs/architecture/team/LIVE_LINK.md`
- `docs/architecture/welt/WORLD_BUILDER.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.19.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.19.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramHud.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MarksRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlacementAssist.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Filter.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/LiveCheck.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/MarkAreas.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/MarkAreasTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/LiveLinkScenario.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/liveLink.ts`
- `packages/domain/src/world/worldPlan.ts`
- `packages/domain/src/world/worldPlanEdit.ts`
- `scripts/mod/bridge_gametest.mjs`
- `tests/e2e/map-depth.e2e.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/world-groups.e2e.mjs`
- `tests/unit/team/livelink.test.mjs`
- `tests/unit/world/worldgroups.test.mjs`
- `tests/unit/world/worldplan.test.mjs`

## 2026-11-06T10:33:10.581Z · progress

**Aufgaben:** GAME-09

0.19.0 auf Modrinth (Fabric, NeoForge); Beschreibung um Gruppen und Sperren ergänzt

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`

## 2026-11-06T10:43:17.217Z · progress

**Aufgaben:** GAME-07

Spieltest Fabric nimmt bei jedem Lauf ein Galeriebild für Gruppen und Sperren auf (Turm normal, gesperrte Mauer grau, ohne HUD); Spieltest grün

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-07 | 🧩 Implementiert · Abnahme offen | 10/11 | Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `scripts/mod/bridge_gametest.mjs`

## 2026-11-06T10:49:44.743Z · progress

**Aufgaben:** GAME-09

Modrinth-Galerie: Bild Gruppen und gesperrte Flächen (0.19.0)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/modrinth/gallery/10-groups-locked.png`
- `mods/bauplaner-bridge/modrinth/project.json`

## 2026-11-06T12:37:11.138Z · progress

**Aufgaben:** TERRAIN-04, GAME-09

Gelände- und Landschaftsreiter holen das Gelände direkt aus der Mod (Geländegedächtnis ab Mod 0.20.0, /v1/terrain, /v1/box), Regionsdateien nur noch als Notfallweg; Mod 0.20.0 Fabric+NeoForge im echten Spiel getestet

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp im Spiel (S05). |
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/project/LandscapeTab.tsx`
- `apps/web/src/views/project/TerrainSurveyPanel.tsx`
- `apps/web/src/views/project/TerrainTab.tsx`
- `apps/web/src/views/world/GameLinkBar.tsx`
- `apps/web/src/views/world/gameTerrain.ts`
- `apps/web/src/views/world/world.css`
- `docs/architecture/team/LIVE_LINK.md`
- `docs/architecture/welt/TERRAIN.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.20.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.20.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TerrainRecorder.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/BoxRead.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/TerrainMemory.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/TerrainMemoryTest.java`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/gallery/11-terrain-memory.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/liveLink.ts`
- `packages/domain/src/world/liveTerrain.ts`
- `packages/domain/src/world/terrainSurvey.ts`
- `scripts/mod/bridge_gametest.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/terrain-game.e2e.mjs`
- `tests/unit/world/live-terrain.test.mjs`
- `tests/e2e/map-depth.e2e.mjs`

## 2026-11-06T12:58:19.470Z · progress

**Aufgaben:** GAME-09

0.20.0 auf Modrinth (Fabric, NeoForge) mit Galeriebild Geländegedächtnis und Offenlegung

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

## 2026-11-06T13:02:57.153Z · progress

**Aufgaben:** LINK-11

LINK-11: Alles über das Internet – Mod 0.21.0 übergibt den Team-Raum der Bauleitung selbst an das Paper-Plugin (link.room, nur OP/bauplaner.team.leitung), Planer hält den Raum-Kopf ohne Freigabe aktuell und verbindet gekoppelte Server selbst; Teampaket, Meldecode, Serverdatei, Server-Link und Aufnahme-Datei nur noch zugeklappt als Notfall. Geprüft: Einheitstests, Browsertests, echter Paper 1.21.11 mit Team-Raum, Spieltest Fabric und NeoForge 26.3. Offen: Abnahme LINK-12/13, Weltplan/Karten im eigenen Thread.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LINK-11 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme LINK-12 und LINK-13 durch Philipp auf seinem Server; Weltplan/Karten im eigenen Thread. |

**Geänderte Dateien:**

- `apps/web/src/styles/team.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/ServerPanel.tsx`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/mod/serverClient.ts`
- `apps/web/src/views/project/GameCheckPanel.tsx`
- `apps/web/src/views/project/team/TeamExchange.tsx`
- `apps/web/src/views/project/team/TeamOpen.tsx`
- `apps/web/src/views/project/team/TeamPlan.tsx`
- `apps/web/src/views/project/team/TeamRoom.tsx`
- `apps/web/src/views/project/team/TeamTab.tsx`
- `docs/architecture/team/AUTO_LINK.md`
- `docs/architecture/team/FALLBACKS.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.21.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.21.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.21.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/TeamTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/project.json`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerLink.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamChannel.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/RoomLinkTest.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/liveLink.ts`
- `packages/domain/src/team/team.ts`
- `packages/domain/src/world/scanRoutes.ts`
- `scripts/mod/bridge_paperlink.mjs`
- `tests/e2e/game-check.e2e.mjs`
- `tests/e2e/game-progress.e2e.mjs`
- `tests/e2e/map-depth.e2e.mjs`
- `tests/e2e/mod-download.e2e.mjs`
- `tests/e2e/production.e2e.mjs`
- `tests/e2e/team-digest.e2e.mjs`
- `tests/e2e/team-room.e2e.mjs`
- `tests/e2e/team.e2e.mjs`
- `tests/unit/team/team-room.test.mjs`
- `tests/unit/world/scan-routes.test.mjs`

## 2026-11-06T13:09:28.727Z · progress

**Aufgaben:** TERRAIN-04

Browsertest map-depth erwartet die neuen fehlenden Mod-Merkmale (Geländegedächtnis, blockgenaue Prüfung) bei älteren Mods

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp im Spiel (S05). |

**Geänderte Dateien:**

- `tests/e2e/map-depth.e2e.mjs`

## 2026-11-06T13:37:29.153Z · progress

**Aufgaben:** GAME-09

0.21.0 auf Modrinth (Fabric, NeoForge, Paper) mit Offenlegung der Raumübergabe ans Plugin

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

## 2026-11-06T14:07:27.429Z · progress

**Aufgaben:** WORLD-SHARE-01

Weltplan und Kartenliste über den Team-Raum: Mods im Team und Paper-Plugin (BlueMap/Dynmap-Marker, Sperrschutz), Datei-Wege nur als Notfall (Mod 0.22.0)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| WORLD-SHARE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme KARTE-10..12 im Spiel und auf der Server-Karte. |

**Geänderte Dateien:**

- `apps/web/src/styles/map.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/map/LiveMapPanel.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/WorldSharePanel.tsx`
- `apps/web/src/views/map/useWorldPlan.ts`
- `apps/web/src/views/map/useWorldShare.ts`
- `apps/web/src/views/mod/releases.json`
- `docs/TESTING.md`
- `docs/architecture/team/TEAM_LIVE.md`
- `docs/architecture/welt/LIVEMAP.md`
- `docs/architecture/welt/WORLD_SHARE.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.22.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.22.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.22.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/MarkAreasTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomClientTest.java`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/gallery/12-team-world-plan.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `mods/bauplaner-bridge/paper/build.gradle`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/MapMarkers.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldShare.java`
- `mods/bauplaner-bridge/paper/src/main/resources/config.yml`
- `mods/bauplaner-bridge/paper/src/main/resources/plugin.yml`
- `mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/WorldShareTest.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/world/worldShare.ts`
- `scripts/mod/bridge_gametest.mjs`
- `scripts/mod/bridge_paperworld.mjs`
- `scripts/mod/test_bridge_paper_world.sh`
- `services/team-room/README.md`
- `services/team-room/src/core.js`
- `services/team-room/src/index.js`
- `tests/e2e/livemap-export.e2e.mjs`
- `tests/e2e/team-room.e2e.mjs`
- `tests/e2e/worldmap.e2e.mjs`
- `tests/unit/team/team-room.test.mjs`
- `tests/unit/world/world-share.test.mjs`

## 2026-11-06T14:18:29.478Z · progress

**Aufgaben:** GUIDE-01

Anleitung „Wie geh ich es an?“ (#/anleitung): sechs Wege nach Ziel, jeder Schritt mit Grafik, einem kurzen Satz und Knopf an die passende Stelle im eigenen Projekt; Einstiege in Navigation, Schnellsuche, Projektzentrale und Seite „Spiel“; Testfälle START-08/09; npm run check grün, Browserlauf 187/188 (neuer Test danach 3/3). Abnahme am iPad offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GUIDE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (START-08/09); Begriffe mit „Bedienung des Planers vereinfachen“ (Reiter-Kurzsätze) und UI-03 abgleichen. |

**Geänderte Dateien:**

- `apps/web/src/app/Shell.tsx`
- `apps/web/src/app/icons.tsx`
- `apps/web/src/app/nav.ts`
- `apps/web/src/app/router.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/styles/shell.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/guide/GuideArt.tsx`
- `apps/web/src/views/guide/GuideView.tsx`
- `apps/web/src/views/guide/guide.css`
- `apps/web/src/views/guide/guideSteps.ts`
- `apps/web/src/views/mod/ModView.tsx`
- `docs/TESTING.md`
- `docs/architecture/planer/UI.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/anleitung.e2e.mjs`
- `tests/e2e/shell.e2e.mjs`
- `tests/unit/web/guide.test.mjs`

## 2026-11-06T14:23:13.593Z · progress

**Aufgaben:** GAME-09

0.22.0 auf Modrinth (Fabric, NeoForge, Paper) mit Galeriebild Weltplan des Teams

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

## 2026-11-06T14:33:48.068Z · progress

**Aufgaben:** UX-01

Bedienung vereinfacht: Hauptnavigation auf Projekte, Bibliothek, Weltkarte, Spiel (+ Anleitung), Datei-Wege in Fußzeile/Schnellsuche; zwölf Projektreiter in vier Schritten mit Kurzsatz; Bibliothek in drei Gruppen; Sicherung, Datei-Notfallwege, ausführliche Mod-Anleitung, Spielverbindung und Team-Hintergrund eingeklappt; Mod-Seite und Team mit drei Schritten. Prüfung: npm run check, simple-ui.e2e 2/2, betroffene Browsertests 22/22; Abnahme START-10..12 offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| UX-01 | 🚧 In Arbeit | 5/6 | Philipps Abnahme START-10..12 im Browser und auf dem iPad; danach Werkstatt, Baustelle und Produktion auf Experten-Optionen prüfen. Optik übernimmt „Planer-Oberfläche schön neu gestalten“. |

**Geänderte Dateien:**

- `apps/web/src/app/CommandPalette.tsx`
- `apps/web/src/app/More.tsx`
- `apps/web/src/app/Shell.tsx`
- `apps/web/src/app/more.css`
- `apps/web/src/app/nav.ts`
- `apps/web/src/styles/map.css`
- `apps/web/src/styles/navGroups.css`
- `apps/web/src/styles/shell.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/BackupPanel.tsx`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/tabNames.ts`
- `apps/web/src/views/project/tabs.ts`
- `apps/web/src/views/project/team/TeamTab.tsx`
- `docs/TESTING.md`
- `docs/architecture/planer/UI.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/backup-reminder.e2e.mjs`
- `tests/e2e/collections.e2e.mjs`
- `tests/e2e/persistence.e2e.mjs`
- `tests/e2e/shell.e2e.mjs`
- `tests/e2e/simple-ui.e2e.mjs`
- `tests/e2e/stability.e2e.mjs`
- `tests/e2e/start.mjs`

## 2026-11-06T14:56:41.483Z · progress

**Aufgaben:** GAME-12

Mod 0.23.0: Menü J als animierte Seitenleiste (Plan, Position, Ansicht, Optionen), Meldungskarten oben rechts statt Chat, kompaktes Baufenster, gestapelte Anzeigen, alle Texte und Befehle Deutsch/Englisch (/bauplaner und /buildplanner mit Vervollständigung in der Spielsprache), Befehlsliste DE/EN mit Suche auf #/mod (eingeklappt unter „Alle Befehle“), Plugin-Befehl weltplan auch englisch. Spieltests Fabric und NeoForge 26.3 und Paper 26.3 + BlueMap bestanden; Abnahme im Modpack (MOD-25 bis MOD-28) offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-12 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme MOD-25 bis MOD-28 im Spiel. |

**Geänderte Dateien:**

- `apps/web/src/styles/catalog.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/ModCommands.tsx`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/modCommands.json`
- `apps/web/src/views/mod/modCommands.ts`
- `apps/web/src/views/mod/releases.json`
- `docs/architecture/mod/MOD_HOLOGRAM.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.23.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.23.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.23.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/client-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/client/BridgeCommands.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/ClientSettings.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandLang.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/GuideClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramHud.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramKeys.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HudCard.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LinkPrompt.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MarksRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MaterialScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/McCompat.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlacementAssist.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TerrainRecorder.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Toasts.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Lang.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlacementAdvice.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalogEn.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandContext.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandExport.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandWords.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/Curve.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/Symmetry.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamState.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandExportTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandWordsTest.java`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/gallery/13-menu-side-panel.png`
- `mods/bauplaner-bridge/modrinth/gallery/14-message-cards.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/neoforge/BridgeNeoForge.java`
- `mods/bauplaner-bridge/paper/build.gradle`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldModule.java`
- `scripts/mod/bridge_gametest.mjs`
- `tests/unit/mod/mod-commands.test.mjs`

## 2026-11-06T15:13:31.442Z · progress

**Aufgaben:** UX-01

Werkstatt, Baustelle und Produktion vereinfacht: Kreativ-Werkzeuge, Abschnittsstände, Freiraum an Anschlüssen, Zeitbudget sowie Öfen/Lager/AFK-Platz/Produktionsblatt eingeklappt (Stände und verbauter Freiraum öffnen sich selbst). Prüfung: voller Browserlauf 190/190, npm run check; Abnahme START-13 offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| UX-01 | 🚧 In Arbeit | 6/6 | Philipps Abnahme START-10..13 im Browser und auf dem iPad. Optik übernimmt „Planer-Oberfläche schön neu gestalten“. |

**Geänderte Dateien:**

- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/editor/editor.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/ProductionTab.tsx`
- `apps/web/src/views/project/SiteTab.tsx`
- `docs/TESTING.md`
- `docs/architecture/planer/UI.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/production.e2e.mjs`
- `tests/e2e/site.e2e.mjs`
- `tests/e2e/workshop-creative.e2e.mjs`
- `tests/e2e/workshop-tools.e2e.mjs`

## 2026-11-06T15:17:03.640Z · progress

**Aufgaben:** PERF-06

Offline-Browsertest stabilisiert: eigener Port, 60 s Wartezeit auf den neuen Service Worker; 3/3 auch unter Last, voller Lauf 189/190 (Ausfall simple-ui, fremd).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-06 | 🚧 In Arbeit | 2/3 | PERF-06-S03: Team-Raum mit neuer Herkunft deployen (zusammen mit dem offenen LINK-10-Raum-Deploy) und Mod-Herkunft in der nächsten Mod-Version (Thread „Anbindung von Planer, Mod und Server neu denken“). |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `tests/e2e/offline.e2e.mjs`

## 2026-11-06T15:19:46.401Z · progress

**Aufgaben:** GAME-12

Offline-Speicher ausschalten löscht den Speicher auch dann ganz, wenn der alte Service Worker ihn gerade wieder geöffnet hat (zeigte sich im Browsertest offline.e2e nach dem Einbau der Befehlsliste).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-12 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme MOD-25 bis MOD-28 im Spiel. |

**Geänderte Dateien:**

- `apps/web/src/app/offline.ts`
- `apps/web/src/styles/catalog.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/ModCommands.tsx`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/modCommands.json`
- `apps/web/src/views/mod/modCommands.ts`
- `apps/web/src/views/mod/releases.json`
- `docs/architecture/mod/MOD_HOLOGRAM.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.23.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.23.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.23.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/client-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/client/BridgeCommands.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/ClientSettings.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandLang.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/GuideClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramHud.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramKeys.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HudCard.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LinkPrompt.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MarksRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MaterialScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/McCompat.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlacementAssist.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TerrainRecorder.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Toasts.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Lang.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlacementAdvice.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalogEn.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandContext.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandExport.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandWords.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/Curve.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/Symmetry.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamState.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandExportTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandWordsTest.java`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/gallery/13-menu-side-panel.png`
- `mods/bauplaner-bridge/modrinth/gallery/14-message-cards.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/neoforge/BridgeNeoForge.java`
- `mods/bauplaner-bridge/paper/build.gradle`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldModule.java`
- `scripts/mod/bridge_gametest.mjs`
- `tests/unit/mod/mod-commands.test.mjs`

## 2026-11-06T15:30:12.832Z · progress

**Aufgaben:** UX-01

simple-ui.e2e stabilisiert: wartet auf den Kurzsatz des geöffneten Reiters statt ihn sofort nach dem Hashwechsel zu lesen; 6/6 Läufe grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| UX-01 | 🚧 In Arbeit | 6/6 | Philipps Abnahme START-10..13 im Browser und auf dem iPad. Optik übernimmt „Planer-Oberfläche schön neu gestalten“. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `tests/e2e/simple-ui.e2e.mjs`

## 2026-11-06T15:38:48.193Z · progress

**Aufgaben:** GAME-12

Browsertest simple-ui wartet auf den Hinweis des Reiters Material statt ihn sofort zu lesen (scheiterte gelegentlich im Gesamtlauf); Gesamtlauf test:e2e sonst grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-12 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme MOD-25 bis MOD-28 im Spiel. |

**Geänderte Dateien:**

- `apps/web/src/app/offline.ts`
- `apps/web/src/styles/catalog.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/ModCommands.tsx`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/modCommands.json`
- `apps/web/src/views/mod/modCommands.ts`
- `apps/web/src/views/mod/releases.json`
- `docs/architecture/mod/MOD_HOLOGRAM.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.23.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.23.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.23.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/client-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/client/BridgeCommands.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/ClientSettings.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandLang.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/GuideClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramHud.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramKeys.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HudCard.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LinkPrompt.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MarksRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MaterialScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/McCompat.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlacementAssist.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TerrainRecorder.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Toasts.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Lang.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlacementAdvice.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalogEn.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandContext.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandExport.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandWords.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/Curve.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/Symmetry.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamState.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandExportTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandWordsTest.java`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/gallery/13-menu-side-panel.png`
- `mods/bauplaner-bridge/modrinth/gallery/14-message-cards.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/neoforge/BridgeNeoForge.java`
- `mods/bauplaner-bridge/paper/build.gradle`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldModule.java`
- `scripts/mod/bridge_gametest.mjs`
- `tests/e2e/simple-ui.e2e.mjs`
- `tests/unit/mod/mod-commands.test.mjs`

## 2026-11-06T15:49:33.071Z · progress

**Aufgaben:** UI-03

Design-System: Thema „Werkbank“, einheitliche Knöpfe/Felder/Karten/Hinweise/Reiter, Farbfeld-Menü, dezente Animationen, iPad-Ziele 44 px, Kontrastprüfung hell/dunkel; Offline-Speicher ausschalten löscht zuverlässig

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| UI-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme START-20/21 durch Philipp am iPad; gruppierte Projektreiter aus „Bedienung vereinfachen“ und Anleitung optisch mitziehen; Werte an das Mod-Menü weitergeben. |

**Geänderte Dateien:**

- `apps/web/src/app/offline.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/theme/ThemeControl.tsx`
- `apps/web/src/theme/design.css`
- `apps/web/src/theme/themePreferences.ts`
- `apps/web/src/theme/themeTokens.d.mts`
- `apps/web/src/theme/themeTokens.mjs`
- `docs/TESTING.md`
- `docs/architecture/planer/UI.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/design.e2e.mjs`
- `tests/e2e/livelink.e2e.mjs`
- `tests/e2e/theme.e2e.mjs`
- `tests/e2e/ui-acceptance.e2e.mjs`
- `tests/e2e/world-groups.e2e.mjs`
- `tests/unit/web/theme-preferences.test.mjs`
- `tests/unit/web/theme-tokens.test.mjs`

## 2026-11-06T16:29:23.694Z · progress

**Aufgaben:** GAME-12

Mod-Kartenstil verweist auf das Planer-Design-System UI-03 (docs/architecture/planer/UI.md) als Quelle der Farbwerte; Werte geprüft und gleich.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-12 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme MOD-25 bis MOD-28 im Spiel. |

**Geänderte Dateien:**

- `docs/architecture/mod/MOD_HOLOGRAM.md`

## 2026-11-06T16:36:09.947Z · progress

**Aufgaben:** GAME-09

0.23.0 auf Modrinth (Fabric, NeoForge, Paper) mit Galeriebildern Seitenmenü und Meldungskarten

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

## 2026-11-06T20:21:49.359Z · progress

**Aufgaben:** TERRAIN-05, EDIT-04

TERRAIN-05 Gelände-Werkzeuge auf dem Projektgelände: Verwittern (mengengleich, Regenrinnen), Formstempel Hügel/Berg/Krater/Mulde/Plateau, Fluss mit nie steigendem Spiegel, Maske für alle Pinsel und Bauplätze schützen; check 966/966, Landschafts-Browsertests 12/12; Abnahme PROJ-26 offen. EDIT-04 ohne verwaisten Punkt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-05 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im Planer und im Spiel (PROJ-26). |
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 7/8 | Spielprüfung gespiegelter Zustände im Planer (S07) und der Bauhilfen in der Mod (MOD-18/19); Gelände-Werkzeuge auf dem Projektgelände sind als TERRAIN-05 umgesetzt. |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/LandscapeTab.tsx`
- `apps/web/src/views/project/landscape/landscape.css`
- `docs/TESTING.md`
- `docs/architecture/welt/LANDSCAPE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/world/terrainDesign.ts`
- `packages/domain/src/world/terrainSculpt.ts`
- `tests/e2e/landscape-sculpt.e2e.mjs`
- `tests/unit/world/terrain-sculpt.test.mjs`

## 2026-11-06T20:34:36.445Z · progress

**Aufgaben:** TERRAIN-05

Prüfprotokoll TERRAIN-05 ergänzt: voller Browserlauf 197/197 grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TERRAIN-05 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im Planer und im Spiel (PROJ-26). |

**Geänderte Dateien:**

- `docs/TESTING.md`

## 2026-11-06T20:15:17.119Z · progress

**Aufgaben:** GAME-11, PERF-06

Mod auf Minecraft 26.4 vorbereitet: Adapter fabric-26.4 gegen 26.4-snapshot-7 über mod-core und geprüfte Ersetzungsregeln (26.3 unverändert), echter Spieltest unter 26.4 bestanden, kein Release bis 26.4 erscheint; PERF-06-S03: pages.dev in Mod (seit 0.17.2) und Team-Raum live bestätigt, Planer-Hinweis nennt beide Adressen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-11 | 🚧 In Arbeit | 2/4 | Fabric 26.4 ist vorbereitet (Snapshot, kein Release). Erscheint 26.4: Versionen in fabric-26.4/gradle.properties auf das Release setzen, Spieltest BAUPLANER_MC=26.4, dann #/mod und Modrinth je Version (S03); NeoForge 26.4 sobald NeoForge Builds hat. |
| PERF-06 | 🚧 In Arbeit | 3/3 | Abnahme: Safari/iPad und Firefox (Offline-Speicher); Verbindung Mod ↔ Planer einmal über https://bauplaner.pages.dev/Minecraft-Bauplaner/ im echten Spiel. |

**Geänderte Dateien:**

- `apps/web/src/views/map/liveClient.ts`
- `docs/TESTING.md`
- `docs/architecture/mod/MOD_BRIDGE.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/fabric-26.4/build.gradle`
- `mods/bauplaner-bridge/fabric-26.4/compat-26.4.gradle`
- `mods/bauplaner-bridge/fabric-26.4/gradle.properties`
- `mods/bauplaner-bridge/fabric-26.4/src/override/java/io/github/freadeax/bauplaner/bridge/hologram/Compat264.java`
- `mods/bauplaner-bridge/settings.gradle`
- `scripts/mod/test_bridge_ingame.sh`
- `tests/unit/mod/mod-versions.test.mjs`

## 2026-11-06T20:43:01.586Z · progress

**Aufgaben:** TEAM-02

TEAM-02: Revisionsprüfung je Gegenstand im Team-Raum (guards → stale), Stapel als Transaktion, Wiederholung ohne Doppelbuchung, sauberes Wiederverbinden im Planer, Team-Rückgängig über geprüfte Gegenschritte, Abnahmefall TEAMBAU-29; Node-Tests und wrangler-dev-Probe grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TEAM-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme TEAMBAU-29 mit Mitspielern im echten Raum (zwei Geräte übernehmen gleichzeitig denselben Abschnitt). |

**Geänderte Dateien:**

- `apps/web/src/styles/team.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/team/TeamLiveBar.tsx`
- `apps/web/src/views/project/team/TeamTab.tsx`
- `apps/web/src/views/project/team/TeamUndoList.tsx`
- `apps/web/src/views/project/team/roomClient.ts`
- `docs/architecture/team/TEAM_LIVE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/teamSync.ts`
- `packages/domain/src/team/teamUndo.ts`
- `services/team-room/README.md`
- `services/team-room/src/core.js`
- `services/team-room/src/index.js`
- `tests/unit/team/team-concurrency.test.mjs`
- `tests/unit/team/team-room.test.mjs`

## 2026-11-06T20:51:49.893Z · progress

**Aufgaben:** QA-04

Testphase gekürzt und neu geordnet: 106 statt 177 Fälle in drei Teilen (Browser, Minecraft, Server), zusammengelegte Fälle mit merged und Haken-Übertragung, Seite mit Sprungleiste, Filter Ort/Kern/Erledigte und Suche; alle Abnahmen erhalten

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `apps/web/src/testing/TestphaseView.tsx`
- `apps/web/src/testing/protocol.ts`
- `apps/web/src/testing/testphase.css`
- `apps/web/src/testing/testplan.ts`
- `docs/TESTING.md`
- `docs/architecture/betrieb/TESTPHASE.md`
- `docs/testing/TESTPLAN.md`
- `scripts/checks/render_testplan.mjs`
- `tests/e2e/testphase.e2e.mjs`
- `tests/unit/web/testphase.test.mjs`

## 2026-11-06T20:59:52.182Z · progress

**Aufgaben:** ARCH-02, QA-02, UX-01, PROFILE-01, NBT-01, FORMAT-01, FORMAT-02, MAT-04, DIFF-01, PERF-02, PERF-04, PERF-06, VIEW-01, VIEW-02, BLOCK-01, BLOCK-02, GFX-01, GFX-02, GFX-03, MODEL-01, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, UPDATE-01, LIB-02, LIB-03, TERRAIN-03, TERRAIN-04, TERRAIN-05, BUILD-06, GEN-02, MAP-01, MAP-04, MAP-02, GAME-02, GAME-07, GAME-08, GAME-03, BACKUP-02, GAME-04, GAME-05, GAME-13, LAGER-01, OPS-04, LIB-04, ENTITY-01, LIB-05, BASE-01, SPLIT-01, GROSS-01, MAP-05, MAP-06, MAP-07, GEN-03, SIZE-01, COOP-01, COOP-02, COOP-03, COOP-04, COOP-05, COOP-06, PROJ-01, GAME-10, GAME-12, COOP-07, COOP-08, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, LINK-01, LINK-02, LINK-03, LINK-04, LINK-05, LINK-06, COOP-09, COOP-10, COOP-11, PROJ-02, PROJ-03, PROJ-04, PROJ-05, EDIT-06, GUIDE-01, UI-03

Roadmap-Runde 06.11.: 8 Block-Threads als zuständige Threads je Punkt eingetragen, Forge-Adapter aus GAME-05 als GAME-13 zurückgestellt (Versionsentscheidung 04.11.), OPS-04 auf Team-Raum-Betrieb zugeschnitten.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| ARCH-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme der Migration mit echten Browserdaten (S05); danach kompakte Laufzeitform der Zellen als Folge von PERF-02. |
| QA-02 | 🚧 In Arbeit | 1/2 | Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben. |
| UX-01 | 🚧 In Arbeit | 6/6 | Philipps Abnahme START-10..13 im Browser und auf dem iPad. Optik übernimmt „Planer-Oberfläche schön neu gestalten“. |
| PROFILE-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme: Profilprüfung im Gebäudeblatt an einer echten älteren Schem-/Litematic-Datei ansehen (Testphase). |
| NBT-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme im Spiel: gedrehtes Bauteil mit Truhen, Schildern und einem Strukturblock exportieren und in 26.3 laden (Testphase). |
| FORMAT-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Hochgeladene WorldEdit-Datei mit npm run format:check-schem prüfen; Befunde beheben. |
| FORMAT-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Export im Spiel mit Litematica laden (Philipps PC, Fabric 26.3) – FORMAT-02-S02. |
| MAT-04 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme: Kupfervariante eines Bauwerks im Planer erzeugen und im Spiel ansehen (Testphase). |
| DIFF-01 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme in der Testphase: zwei Stände eines verschobenen Bauwerks vergleichen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 3/3 | PERF-02-S03 zusammen mit PERF-05-S08 (Zellen erst bei Bedarf entpacken) im Performance-Thread umsetzen; beide ändern compose/Entpacken. Übergabe abgestimmt am 03.11.2026. |
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06). Der GPU-Upload großer Szenen läuft seit GFX-02-S03 in Stücken, seit GFX-03 mit Sichtfeld zuerst. |
| PERF-06 | 🚧 In Arbeit | 3/3 | Abnahme: Safari/iPad und Firefox (Offline-Speicher); Verbindung Mod ↔ Planer einmal über https://bauplaner.pages.dev/Minecraft-Bauplaner/ im echten Spiel. |
| VIEW-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Aktuelle GPU-/Touch-Prüfung mit negativen Koordinaten und allen Schnittachsen. |
| VIEW-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Mojang-Download im echten Browser und weitere Browser prüfen (Testphase); Register ist seit PROFILE-01 an den Serverbericht gebunden. |
| BLOCK-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme im Spiel; PROFILE-01 kann die Berichtsfakten übernehmen. Die Katalogfehler aus der Spielprüfung behebt BLOCK-02. |
| BLOCK-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme im Spiel (S06): geänderte Gebäude (z. B. Werkstatt, Windmühle, Torhaus, Stadthaus) per Litematic setzen. |
| GFX-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Prüfung auf echten Geräten und Browsern (S06); Biomfarben und leuchtende Blockentities als GFX-02. |
| GFX-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf echten GPUs, Firefox/Safari und Abgleich mit Spielbildern (S04, zusammen mit GFX-01-S06). |
| GFX-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Rechner: großes Modell mit Wasser drehen und Blöcke anklicken, dazu Firefox/Safari (S04). |
| MODEL-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Dateien in Blender und Slicern prüfen und ein Testdruck; danach Flächenzusammenfassung (S06). Export läuft seit PERF-04 im Worker. |
| EDIT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Geräteprüfung (QA-02). Gruppenziehen im 3D-Bild ist mit EDIT-06 erledigt. |
| EDIT-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung. Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| EDIT-03 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung der Schablonen-Zustände (Tür, Treppe, Laterne). Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 7/8 | Spielprüfung gespiegelter Zustände im Planer (S07) und der Bauhilfen in der Mod (MOD-18/19); Gelände-Werkzeuge auf dem Projektgelände sind als TERRAIN-05 umgesetzt. |
| EDIT-05 | 🧩 Implementiert · Abnahme offen | 6/7 | EDIT-05-S07: Abnahme durch Philipp in der Werkstatt (Zauberstab, Stapeln, Extrudieren, Wendel) und Spielprüfung gestapelter/gedrehter Bauteile mit Ausstattung. |
| UPDATE-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Echtgeräteabnahme (QA-02); Teamreihenfolge der Updateoperationen in TEAM-02. |
| LIB-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Rückmeldung zur Bedienung der Sammlungen einholen. |
| LIB-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen. |
| TERRAIN-03 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme PROJ-19, BIB-19 und BIB-20 im Spiel (Treppen, Brücken, Wegenetz der Basis auf echtem Gelände). |
| TERRAIN-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp im Spiel (S05). |
| TERRAIN-05 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im Planer und im Spiel (PROJ-26). |
| BUILD-06 | 🧩 Implementiert · Abnahme offen | 5/5 | Echtgeräte- und Druckerabnahme mit QA-02; Philipps Spieltest mit Mod-Aufnahme (WorldAnchor) auf seinem Server. |
| GEN-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Generierte Bauten (v. a. Treppenhaus, Torhaus-Wehrgang, Hafen) im Spiel abnehmen; Treppenhaus-Anbau an Haus als Anlage erwägen. |
| MAP-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02. |
| MAP-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme durch Philipp (S06): Langdruck-Menü auf dem Touch-Gerät, Gruppen und Sperren auf dem iPad (Testfall KARTE-09). |
| MAP-02 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme KARTE-08 auf Philipps Server-Karte. |
| GAME-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp testet die .jar aus /mnt/project-files/mod/ auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md). |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 10/11 | Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7. |
| GAME-08 | 🧩 Implementiert · Abnahme offen | 5/5 | Philipp prüft Protokoll 3 im echten Spiel (TESTPLAN MOD-17); Forge und Paper ohne Live-Verbindung. |
| GAME-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |
| BACKUP-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen. |
| GAME-04 | 🚧 In Arbeit | 3/4 | Abnahme auf Philipps eigenem Paper-Server (GAME-04-S04). |
| GAME-05 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme NeoForge über einen echten Launcher (Testphase). Forge 26.3 ist nach Philipps Versionsentscheidung (04.11.: neueste Version und Fabric 26.3, NeoForge mit) als GAME-13 zurückgestellt. |
| GAME-13 | ⏸ Zurückgestellt | 0/1 | Nur neu bewerten, wenn Philipp Forge ausdrücklich wieder möchte; Grundlage: Versionsentscheidung 04.11.2026 (IN-04: neueste Version, Fabric 26.3, NeoForge mit). |
| LAGER-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf dem Paper-Server (Thread „Server-Plugin mit geprüften Lagerkisten“). |
| OPS-04 | 🚧 In Arbeit | 0/2 | Neu zugeschnitten auf den Team-Raum (Cloudflare, kostenlos): Sicherung/Export eines Raums, Wiederherstellung, Aufbewahrung und Löschen alter Räume, Zustandsseite. |
| LIB-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen. |
| ENTITY-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Export mit Entities im Spiel prüfen (S06). Truhen-/Schildinhalte bearbeiten ist mit EDIT-06 erledigt. |
| LIB-05 | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp. |
| BASE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06, BIB-10, BIB-19, BIB-20); Küstenlinie, Wegstufen und Brücken sind über TERRAIN-03-S06/S08 umgesetzt. |
| SPLIT-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme mit echten Dateien (S05). |
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S06 BIB-13, BIB-21, BIB-22). |
| MAP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können. |
| MAP-06 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag). |
| MAP-07 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme KARTE-07; Server-Plugin könnte Pläne gedreht ablegen (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| GEN-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Philipp baut das Kolosseum im Spiel nach (BIB-14, mit Statuen und Hypogäum-Treppen). |
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |
| COOP-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05). |
| COOP-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Server. |
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore. |
| COOP-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md). |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LAGER-01…09 und LAGER-11 auf Philipps Server. |
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern. |
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |
| GAME-12 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme MOD-25 bis MOD-28 im Spiel. |
| COOP-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl umgesetzt (LINK-05). |
| COOP-08 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LAGER-10 mit einer echten Farm; Ertragsbuch in TEAMBAU-28. |
| PROD-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-12; später Erträge aus geprüften Lagerkisten (COOP-05) ins Ertragsbuch. |
| PROD-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-13. |
| PROD-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Später: Ofenstraße aus dem Katalog direkt vorschlagen und in die Planung legen. |
| PROD-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin. |
| PROD-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen. |
| LINK-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LINK-01 auf Philipps Server. |
| LINK-02 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme LINK-02 und LINK-11. |
| LINK-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LIVE-01 in Philipps Modpack. |
| LINK-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp. |
| LINK-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Abnahme vom iPad (Testplan LINK-04). |
| LINK-06 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme durch Philipp (Testplan LINK-05, LINK-06; Paper-Plugin 0.13.0 auf dem Server). |
| COOP-09 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit Mitspielern (TEAMBAU-25). |
| COOP-10 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit Mitspielern ohne Plugin (TEAMBAU-27, TEAMBAU-25). |
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| PROJ-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05, PROJ-16…18). |
| PROJ-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-20 durch Philipp. |
| PROJ-04 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-21 durch Philipp. |
| PROJ-05 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-23 durch Philipp. |
| EDIT-06 | 🧩 Implementiert · Abnahme offen | 4/5 | EDIT-06-S05: Philipp prüft das Bauen im 3D-Bild auf PC und iPad (WERK-08) und lädt eine Truhe/ein Schild mit Inhalt im Spiel (WERK-09). |
| GUIDE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (START-08/09); Begriffe mit „Bedienung des Planers vereinfachen“ (Reiter-Kurzsätze) und UI-03 abgleichen. |
| UI-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme START-20/21 durch Philipp am iPad; gruppierte Projektreiter aus „Bedienung vereinfachen“ und Anleitung optisch mitziehen; Werte an das Mod-Menü weitergeben. |

## 2026-11-06T21:15:30.975Z · progress

**Aufgaben:** QA-02

Block 5 Grundlage: Browsertests per Schalter in Firefox und WebKit (engine-hook, e2e_engine.mjs); echte Geräte weiter offen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-02 | 🚧 In Arbeit | 1/2 | Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben. |

**Geänderte Dateien:**

- `docs/TESTING.md`
- `docs/testing/GERAETEMATRIX.md`
- `package.json`
- `scripts/checks/e2e_engine.mjs`
- `tests/e2e/engine-hook.mjs`

## 2026-11-06T21:17:39.366Z · progress

**Aufgaben:** QA-04

Gemeinsame Stelle für automatische Abnahmen aller Blöcke: autochecks.ts (AUTO_CHECKS: Fall, Umfang voll/teil, Nachweis, Befehl), Kennzeichen und Nachweis am Fall auf #/testphase, Tabelle „Automatische Abnahmen“ in TESTPLAN.md mit ID-Prüfung

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `apps/web/src/testing/TestphaseView.tsx`
- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/testing/testphase.css`
- `docs/testing/TESTPLAN.md`
- `scripts/checks/render_testplan.mjs`

## 2026-11-06T21:23:28.718Z · progress

**Aufgaben:** TEAM-03

Mehrere Spieler je Abschnitt (Mitbauer) und je Sammelauftrag, versionierte Zuständigkeiten, Sammelaufträge und Buchungen (überholte Änderungen sichtbar abgelehnt), Zeitplan/Fortschritt mit Mitbauern, Plugin-Faltung; check 988/988, Browser 199/199, Plugin-Tests grün; Abnahme TEAMBAU-30 offen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TEAM-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-30 durch Philipp; Plugin-Faltung kommt mit der nächsten Plugin-Version. |

**Geänderte Dateien:**

- `apps/web/src/styles/team.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/team/TeamPlan.tsx`
- `apps/web/src/views/project/team/TeamTab.tsx`
- `docs/TESTING.md`
- `docs/architecture/team/TEAMBAU.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/TeamLogCrewTest.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/team.ts`
- `packages/domain/src/team/teamPlan.ts`
- `tests/e2e/teamcrew.e2e.mjs`
- `tests/unit/team/teamCrew.test.mjs`

## 2026-11-06T21:09:31.710Z · progress

**Aufgaben:** OPS-04

Team-Raum sichert sich selbst in einen eigenen Tresor (Durable Object RoomVault, kostenlos): automatisch nach Änderungen höchstens stündlich, vor Wiederherstellung und Löschen; Aufbewahrung 48 h/30 Tage, ungenutzte Räume nach 365 Tagen gelöscht und 90 Tage zurückholbar; Wiederherstellen ohne Verlust (Nummern laufen weiter, Planer reichen ihre Schritte über die neue Marke epoch nach); Planer „Sicherung und Zustand“ für die Bauleitung. Geprüft: Einheiten 6/6, echter Worker lokal (wrangler dev, Alarme) mit team_room_backup_smoke, Browser 2/2. Offen: Ausrollen auf den echten Dienst, Abnahme TEAMBAU-31.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| OPS-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Nach Philipps OK ausrollen (npx wrangler deploy) und team_room_smoke + team_room_backup_smoke gegen den Dienst; danach Abnahme TEAMBAU-31. |

**Geänderte Dateien:**

- `apps/web/src/styles/team.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/team/TeamBackup.tsx`
- `apps/web/src/views/project/team/TeamRoom.tsx`
- `apps/web/src/views/project/team/roomClient.ts`
- `docs/TESTING.md`
- `docs/architecture/team/TEAM_BACKUP.md`
- `docs/architecture/team/TEAM_LIVE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/teamSync.ts`
- `scripts/team/team_room_backup_smoke.mjs`
- `services/team-room/README.md`
- `services/team-room/src/core.js`
- `services/team-room/src/index.js`
- `services/team-room/src/vault.js`
- `services/team-room/wrangler.toml`
- `tests/e2e/team-backup.e2e.mjs`
- `tests/unit/team/team-backup.test.mjs`

## 2026-11-06T21:41:13.586Z · progress

**Aufgaben:** MAP-07, MAP-02

Echtserver-Prüfung KARTE-07/08: Placement.java und Planer gleich dem Spiel (/place template, 8 Lagen, 1512 Zellen), Plugin-Abschnitte gedreht richtig; BlueMap-/Dynmap-Notfallweg auf echten Servern geprüft und drei Exportfehler behoben (HOCON-Kommas, angehängter Block ersetzt, leere Dynmap-Sets gelöscht). Offen: Bedienung im eigenen Spiel und auf Philipps Server-Karte.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MAP-07 | 🧩 Implementiert · Abnahme offen | 3/4 | Rest von KARTE-07 im eigenen Spiel (drehen, senden, übernehmen, F3). Server-Plugin könnte Pläne gedreht ablegen. |
| MAP-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Rest von KARTE-08 auf Philipps Server-Karte (Link speichern, Sets ansehen, Markerdatei laden). |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/views/map/LiveMapPanel.tsx`
- `docs/TESTING.md`
- `docs/architecture/welt/LIVEMAP.md`
- `docs/architecture/welt/WORLDMAP.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `packages/domain/src/world/liveMapExport.ts`
- `scripts/mod/PlacementProbe.java`
- `scripts/mod/bridge_papermapfallback.mjs`
- `scripts/mod/bridge_paperplacement.mjs`
- `scripts/mod/test_bridge_paper_mapfallback.sh`
- `scripts/mod/test_bridge_paper_placement.sh`
- `tests/unit/world/livemap-export.test.mjs`

## 2026-11-06T21:44:54.861Z · progress

**Aufgaben:** COOP-02, COOP-03, COOP-04, LINK-01, LINK-04, LINK-05, LINK-11, GAME-02, QA-04

Block 4 Mehrspieler und Server automatisch abnehmen: Prüfstand scripts/mod/lib/multiplayer.mjs (Paper + echte Spieler als Bots + Team-Raum), test_multiplayer.sh (TEAMBAU-06, LINK-01/04/12 auf Paper 1.21.11 und 26.1.2), test_multiplayer_client.sh (echter 26.3-Client mit Mod auf Paper 26.3); COOP-02 und LINK-01 geprüft, AUTO_CHECKS für TEAMBAU-06, LINK-12, LINK-01, LINK-04. Grenzen: Hologramm mit Teamplan, Baustellen-Lager-Übernahme im Planer, echte Mitspieler auf Philipps Server bleiben Stichprobe.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-02 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Regressionen bei Plugin-Änderungen mit scripts/mod/test_multiplayer.sh. |
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore. |
| COOP-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md). |
| LINK-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Regressionen mit test_bridge_paper_link.sh und test_multiplayer.sh. |
| LINK-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp. |
| LINK-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Abnahme vom iPad (Testplan LINK-04). |
| LINK-11 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme LINK-12 und LINK-13 durch Philipp auf seinem Server; Weltplan/Karten im eigenen Thread. |
| GAME-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp testet die .jar aus /mnt/project-files/mod/ auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md). |
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `docs/TESTING.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/PaperMultiplayerTest.java`
- `scripts/mod/bridge_multiplayer.mjs`
- `scripts/mod/bridge_multiplayer_client.mjs`
- `scripts/mod/lib/multiplayer.mjs`
- `scripts/mod/test_multiplayer.sh`
- `scripts/mod/test_multiplayer_client.sh`

## 2026-11-06T21:50:29.150Z · progress

**Aufgaben:** PROD-03, PROJ-01, PROJ-02, PROJ-04, QA-04

Block 7: Ofenstraße aus dem Katalog in Baustelle und Planung (PROD-03-S04); Szenariotests PROJ-09/12/13/21, acht Fälle automatisch geprüft (6 voll, 2 teil)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PROD-03 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme PROJ-12/13; Ofenstraße im Spiel prüfen (Trichterwege der Module). |
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |
| PROJ-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05, PROJ-16…18). |
| PROJ-04 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-21 durch Philipp. |
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist. |

**Geänderte Dateien:**

- `apps/web/src/styles/production.css`
- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/views/project/ProductionTab.tsx`
- `docs/TESTING.md`
- `docs/architecture/planer/PRODUCTION.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/materials/furnaceLine.ts`
- `tests/e2e/scenario-project.e2e.mjs`
- `tests/unit/materials/furnace-line.test.mjs`

## 2026-11-06T21:53:21.545Z · progress

**Aufgaben:** MODEL-01, ARCH-02, PERF-02

Block 6: 3D-Dateien unabhängig geprüft (glTF-Validator, STL/3MF-Prüfer, lib3mf, Blender 5.2, PrusaSlicer 2.7 mit G-Code), 3MF nur benutzte Farben; Migration mit Datenbanken echter alter Stände (v1/v3/v4) verlustfrei; kompakte Laufzeitform: höchstens 2 Mio. entpackte Bibliothekszellen; Testfälle PROJ-05 und GERAET-03 teilweise automatisch. Offen: echter Druck, Stichprobe Philipps Browserdaten.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| MODEL-01 | 🧩 Implementiert · Abnahme offen | 7/8 | Echter Testdruck und Bambu Studio/Cura bei Philipp (S05-Rest); sonst abgeschlossen. |
| ARCH-02 | 🧩 Implementiert · Abnahme offen | 6/7 | Stichprobe mit Philipps eigenen Browserdaten (Testfall GERAET-03); bei neuer DB_VERSION eine weitere gealterte Datenbank erzeugen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Folge erledigt (06.11.): kompakte Laufzeitform als begrenzte Menge entpackter Bibliothekszellen (ARCH-02-S07); PERF-05-S08 lädt Zellen erst bei Bedarf. |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/views/SystemView.tsx`
- `docs/TESTING.md`
- `docs/architecture/formate/MODEL_EXPORT.md`
- `docs/architecture/kern/PLAN_MODEL.md`
- `docs/testing/TESTPLAN.md`
- `fixtures/aged-browserdata/2026-10-28-db1.json.gz`
- `fixtures/aged-browserdata/2026-11-02-db3.json.gz`
- `fixtures/aged-browserdata/2026-11-04-db4.json.gz`
- `package-lock.json`
- `package.json`
- `packages/domain/src/data/versionStorage.ts`
- `packages/domain/src/index.ts`
- `packages/formats/src/model3d.ts`
- `scripts/checks/blender_model3d.py`
- `scripts/checks/verify_model3d.py`
- `scripts/dev/make_aged_browserdata.mjs`
- `tests/e2e/aged-browserdata.e2e.mjs`
- `tests/e2e/model3d.e2e.mjs`
- `tests/e2e/plan-model.e2e.mjs`
- `tests/unit/core/lazy-cells.test.mjs`
- `tests/unit/formats/model3d-external.test.mjs`
- `tests/unit/formats/model3d-files.test.mjs`

## 2026-11-06T22:02:05.657Z · progress

**Aufgaben:** QA-02, EDIT-06, MAP-04

Block 5: Werkstatt und Weltkarte auf iPad Pro 11/iPhone 15 (WebKit) und Firefox mit Touch, Zwei-Finger-Zoom und Langdruck geprüft (touch-devices.e2e.mjs); Fix: zweiter Finger setzt im 3D-Bild keine Blöcke mehr; Firefox-Testkorrektur Weltbuilder; Autochecks WERK-01/02/03/08, KARTE-01/02/05 teilweise. Grenze: kein echtes Gerät.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-02 | 🚧 In Arbeit | 1/2 | Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben. |
| EDIT-06 | 🧩 Implementiert · Abnahme offen | 4/5 | EDIT-06-S05: Philipp prüft das Bauen im 3D-Bild auf PC und iPad (WERK-08) und lädt eine Truhe/ein Schild mit Inhalt im Spiel (WERK-09). |
| MAP-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme durch Philipp (S06): Langdruck-Menü auf dem Touch-Gerät, Gruppen und Sperren auf dem iPad (Testfall KARTE-09). |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/viewer/sceneController.ts`
- `apps/web/src/views/map/OverviewMap.tsx`
- `docs/TESTING.md`
- `docs/testing/GERAETEMATRIX.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/touch-devices.e2e.mjs`
- `tests/e2e/world-groups.e2e.mjs`
- `tests/e2e/worldbuilder.e2e.mjs`

## 2026-11-06T22:07:50.122Z · progress

**Aufgaben:** NAME-01

Nach Rebase auf Block 4/6, MAP-07, QA-02: neue Texte (Kartensets, Abnahmen, Mehrspieler-Tests) umbenannt; Mod-Dateien 0.24.0 mit dem aktuellen Plugin-Stand neu gebaut.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| NAME-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp: Seite und Mod 0.24.0 im Spiel ansehen (Tastengruppe „Build Studio“, Menütitel). |

**Geänderte Dateien:**

- `.github/ISSUE_TEMPLATE/testphase-mod.yml`
- `AGENTS.md`
- `README.md`
- `apps/web/index.html`
- `apps/web/src/app/Shell.tsx`
- `apps/web/src/app/errorLog.ts`
- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/app/nav.ts`
- `apps/web/src/blockmodels/TexturePanel.tsx`
- `apps/web/src/export3d/build.ts`
- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/testing/protocol.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/guide/guideSteps.ts`
- `apps/web/src/views/library/ContributePanel.tsx`
- `apps/web/src/views/library/VersionsSection.tsx`
- `apps/web/src/views/map/LiveGamePanel.tsx`
- `apps/web/src/views/map/LiveMapPanel.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/liveClient.ts`
- `apps/web/src/views/mod/ModView.tsx`
- `apps/web/src/views/mod/ServerPanel.tsx`
- `apps/web/src/views/mod/installGuide.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/mod/releases.ts`
- `apps/web/src/views/mod/serverClient.ts`
- `apps/web/src/views/project/LandscapeTab.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/TerrainTab.tsx`
- `apps/web/src/views/project/team/TeamLive.tsx`
- `apps/web/src/views/project/team/TeamRoom.tsx`
- `apps/web/src/views/project/team/TeamTab.tsx`
- `apps/web/src/views/world/GameLinkBar.tsx`
- `docs/TESTING.md`
- `docs/architecture/betrieb/TESTPHASE.md`
- `docs/architecture/formate/BLOCK_MODELS.md`
- `docs/architecture/kern/BACKUPS.md`
- `docs/architecture/kern/SIZE_LIMITS.md`
- `docs/architecture/kern/SPECIFICATION.md`
- `docs/architecture/mod/MOD_BRIDGE.md`
- `docs/architecture/mod/MOD_HOLOGRAM.md`
- `docs/architecture/planer/UI.md`
- `docs/architecture/team/AUTO_LINK.md`
- `docs/architecture/team/LIVE_LINK.md`
- `docs/architecture/welt/LIVEMAP.md`
- `docs/architecture/welt/WORLDMAP.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.24.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.24.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.24.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/README.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/core/src/main/java/io/github/freadeax/bauplaner/bridge/AnchorStore.java`
- `mods/bauplaner-bridge/core/src/main/java/io/github/freadeax/bauplaner/bridge/Plan.java`
- `mods/bauplaner-bridge/core/src/main/java/io/github/freadeax/bauplaner/bridge/session/BridgeSession.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/PaperMultiplayerTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/resources/fabric.mod.json`
- `mods/bauplaner-bridge/fabric-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/fabric/BridgeClient.java`
- `mods/bauplaner-bridge/fabric-26.3/src/main/resources/fabric.mod.json`
- `mods/bauplaner-bridge/forge-26.3/src/gametest/resources/META-INF/mods.toml`
- `mods/bauplaner-bridge/forge-26.3/src/main/templates/META-INF/mods.toml`
- `mods/bauplaner-bridge/forge-26.3/src/main/templates/pack.mcmeta`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/ClientSettings.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/GuideClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Hologram.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramDiagnose.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramKeys.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LinkPrompt.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MaterialScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/McCompat.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TerrainRecorder.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/resources/assets/bauplaner_bridge/lang/de_de.json`
- `mods/bauplaner-bridge/hologram-26.3/src/main/resources/assets/bauplaner_bridge/lang/en_us.json`
- `mods/bauplaner-bridge/mod-core/build.gradle`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Diagnostics.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlacementStore.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/ReplyLog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/GuidePlan.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/DiagnosticsTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/gallery/00-title.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `mods/bauplaner-bridge/neoforge-26.3/src/gametest/resources/META-INF/neoforge.mods.toml`
- `mods/bauplaner-bridge/neoforge-26.3/src/main/templates/META-INF/neoforge.mods.toml`
- `mods/bauplaner-bridge/paper/build.gradle`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/MapMarkers.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerLink.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamChannel.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldShare.java`
- `mods/bauplaner-bridge/paper/src/main/resources/config.yml`
- `mods/bauplaner-bridge/paper/src/main/resources/plugin.yml`
- `mods/bauplaner-bridge/settings.gradle`
- `packages/domain/src/base/base.ts`
- `packages/domain/src/base/planLandscape.ts`
- `packages/domain/src/catalog/buildings.ts`
- `packages/domain/src/catalog/contribution.ts`
- `packages/domain/src/catalog/generators/index.ts`
- `packages/domain/src/catalog/grossprojekte.ts`
- `packages/domain/src/core/samples.ts`
- `packages/domain/src/data/backup.ts`
- `packages/domain/src/data/backupStatus.ts`
- `packages/domain/src/team/liveLink.ts`
- `packages/domain/src/team/serverControl.ts`
- `packages/domain/src/team/team.ts`
- `packages/domain/src/team/teamLink.ts`
- `packages/domain/src/world/liveMapExport.ts`
- `packages/domain/src/world/livemap.ts`
- `packages/domain/src/world/terrainDesign.ts`
- `packages/domain/src/world/terrainSurvey.ts`
- `packages/formats/src/litematic.ts`
- `packages/formats/src/model3d.ts`
- `packages/formats/src/scan.ts`
- `scripts/mod/bridge_gametest.mjs`
- `scripts/mod/bridge_paperlink.mjs`
- `scripts/mod/bridge_papermapfallback.mjs`
- `scripts/mod/bridge_papertest.mjs`
- `scripts/mod/bridge_paperworld.mjs`
- `scripts/mod/lib/multiplayer.mjs`
- `scripts/mod/modrinth_publish.mjs`
- `scripts/mod/test_bridge_ingame.sh`
- `scripts/mod/test_bridge_ingame_forge.sh`
- `scripts/mod/test_bridge_paper_mapfallback.sh`
- `scripts/mod/test_multiplayer_client.sh`
- `services/team-room/src/index.js`
- `services/team-room/wrangler.toml`
- `tests/e2e/anleitung.e2e.mjs`
- `tests/e2e/livemap-export.e2e.mjs`
- `tests/e2e/mod-download.e2e.mjs`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/server-link.e2e.mjs`
- `tests/e2e/stability.e2e.mjs`
- `tests/e2e/worldmap.e2e.mjs`
- `tests/unit/data/backup.test.mjs`
- `tests/unit/team/livelink.test.mjs`
- `tests/unit/team/team-link.test.mjs`
- `tests/unit/web/testphase.test.mjs`
- `tests/unit/world/livemap-export.test.mjs`
- `tests/unit/world/livemap.test.mjs`
- `tests/unit/world/terrain-design.test.mjs`
- `tests/unit/world/terrain-survey.test.mjs`

## 2026-11-06T22:08:21.993Z · progress

**Aufgaben:** NAME-01

Mod-Dateien 0.24.0 nach Rebase neu gebaut (mod-core/paper-Tests grün).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| NAME-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp: Seite und Mod 0.24.0 im Spiel ansehen (Tastengruppe „Build Studio“, Menütitel). |

**Geänderte Dateien:**

- `apps/web/src/views/mod/releases.json`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.24.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.24.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.24.0.jar`

## 2026-11-06T22:11:34.211Z · progress

**Aufgaben:** NAME-01

Testplan-Ansicht nach Rebase neu erzeugt.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| NAME-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp: Seite und Mod 0.24.0 im Spiel ansehen (Tastengruppe „Build Studio“, Menütitel). |

**Geänderte Dateien:**

- `docs/testing/TESTPLAN.md`

## 2026-11-06T22:12:39.157Z · progress

**Aufgaben:** COOP-01, COOP-06, COOP-07, COOP-09, COOP-10, COOP-11, TEAM-02

Block 4c: automatische Abnahme Team live mit drei Geräten gegen den echten Team-Raum (wrangler dev) und Mod-Client, tests/e2e/team-acceptance.e2e.mjs deckt TEAMBAU-01/03/05/21/24/25/27/28/29 ab (AUTO_CHECKS); behoben: WLAN aus sofort offline statt nach 70 s, Pakete teilen im Live-Team verweist auf Freigabe statt Datei. Grenze: echte Spieler im Spiel, echtes Handy-WLAN.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05). |
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern. |
| COOP-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl umgesetzt (LINK-05). |
| COOP-09 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit Mitspielern (TEAMBAU-25). |
| COOP-10 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit Mitspielern ohne Plugin (TEAMBAU-27, TEAMBAU-25). |
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Thread „Mod, Server und Client mit Fallbacks ausbauen“). |
| TEAM-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme TEAMBAU-29 mit Mitspielern im echten Raum (zwei Geräte übernehmen gleichzeitig denselben Abschnitt). |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/views/project/team/TeamPlan.tsx`
- `apps/web/src/views/project/team/roomClient.ts`
- `docs/TESTING.md`
- `docs/architecture/team/TEAM_LIVE.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/team-acceptance.e2e.mjs`
- `tests/e2e/teamRoomDev.mjs`

## 2026-11-06T22:20:27.341Z · progress

**Aufgaben:** GAME-09

0.24.0 auf Modrinth (Fabric, NeoForge, Paper); Projekt umbenannt in LMNT — Build Studio Bridge, neues Titelbild

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |

## 2026-11-07T01:02:09.889Z · progress

**Aufgaben:** VIEW-01, VIEW-02, GFX-01, GFX-02, GFX-03, PERF-04

Block 5 Grafik in Firefox und Safari: Grafik-, Betrachter-, Textur- und Worker-Browsertests in WebKit 17/17 und Firefox 19/19 grün; Fixes: WebKit-Speicherwachstum der Bibliothek (backdrop-filter auf Kartenknöpfen), Speichern von Originaldateien/Texturen im Safari-Privatfenster (ArrayBuffer statt Blob), ruhende Vorschauplatzhalter; Spielbildabgleich Minecraft 26.3 gegen Planer (compare_game_shot.mjs) in Chromium/Firefox/WebKit 30/30; Autochecks DATEI-01/04/05, GERAET-05 teilweise. Voller Chromium-Browserlauf 212/212. Grenze: keine echte GPU, kein echtes iPad.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| VIEW-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Aktuelle GPU-/Touch-Prüfung mit negativen Koordinaten und allen Schnittachsen. |
| VIEW-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Mojang-Download im echten Browser und echte Geräte (S06); Firefox/Safari-Engine automatisch geprüft (Block 5). |
| GFX-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Nur noch echte GPU und Handy/iPad mit Schatten (S06); Firefox/Safari-Engine und Spielbildabgleich sind automatisch geprüft. |
| GFX-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Nur noch Abnahme auf echter GPU (S04); Firefox/Safari-Engine und Spielbildabgleich automatisch geprüft (Block 5). |
| GFX-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Rechner: großes Modell mit Wasser drehen und Blöcke anklicken (S04); Firefox/Safari-Engine automatisch geprüft. |
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus (S06); Firefox/Safari-Engine automatisch geprüft. |

**Geänderte Dateien:**

- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/blockmodels/pack.ts`
- `apps/web/src/styles/catalog.css`
- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/thumbnail/Thumb.tsx`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/sceneController.ts`
- `docs/TESTING.md`
- `docs/architecture/planer/GRAPHICS.md`
- `docs/testing/GERAETEMATRIX.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `scripts/checks/compare_game_shot.mjs`
- `tests/e2e/background-jobs.e2e.mjs`
- `tests/e2e/viewer.e2e.mjs`

## 2026-11-07T01:04:09.413Z · progress

**Aufgaben:** BLOCK-02, BLOCK-01, LIB-05, GEN-02, GEN-03

Spielprüfstand im echten Paper 26.3: 559 Katalog-/Generatorpläne ohne Abweichung; 47 Gebäude und Brunnen-Generator behoben, neue Regeln Doppeltruhe, Trampelpfad, Redstone-Staub, dichte Becken, Korallen. Grenze: Gestaltung bleibt Stichprobe im Spiel.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BLOCK-02 | 🧩 Implementiert · Abnahme offen | 6/7 | S06 Stichprobe durch Philipp im eigenen Spiel (Gestaltung, Begehbarkeit); Gelände, Großprojekte und Basisplaner auf demselben Prüfstand. |
| BLOCK-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme im Spiel; PROFILE-01 kann die Berichtsfakten übernehmen. Die Katalogfehler aus der Spielprüfung behebt BLOCK-02. |
| LIB-05 | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp. |
| GEN-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Generierte Bauten (v. a. Treppenhaus, Torhaus-Wehrgang, Hafen) im Spiel abnehmen; Treppenhaus-Anbau an Haus als Anlage erwägen. |
| GEN-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Philipp baut das Kolosseum im Spiel nach (BIB-14, mit Statuen und Hypogäum-Treppen). |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `docs/TESTING.md`
- `docs/architecture/formate/BLOCK_LOGIC.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/catalog/build/gameReady.ts`
- `packages/domain/src/catalog/build/sets/dorf.ts`
- `packages/domain/src/catalog/build/sets/fantasy.ts`
- `packages/domain/src/catalog/build/sets/farmen.ts`
- `packages/domain/src/catalog/build/sets/grossbauten.ts`
- `packages/domain/src/catalog/build/sets/natur.ts`
- `packages/domain/src/catalog/build/sets/redstone.ts`
- `packages/domain/src/catalog/build/sets/technik.ts`
- `packages/domain/src/catalog/build/sets/wohnen.ts`
- `packages/domain/src/catalog/generators/well.ts`
- `packages/domain/src/core/placement.ts`
- `packages/domain/src/index.ts`
- `packages/voxel/src/blocklogic/connect.ts`
- `packages/voxel/src/diff.ts`
- `packages/voxel/src/states.ts`
- `scripts/mod/game_placement.mjs`
- `scripts/mod/probe/PlacementProbe.java`
- `scripts/mod/test_game_placement.sh`
- `tests/unit/catalog/game-rules.test.mjs`
- `tests/unit/catalog/generators.test.mjs`
- `tests/unit/core/states.test.mjs`

## 2026-11-07T01:12:24.706Z · progress

**Aufgaben:** FORMAT-01, FORMAT-02, NBT-01, ENTITY-01, DIFF-01, MAT-04, PROFILE-01

Block 1: Exporte im echten Spiel automatisch geprüft (Litematica 0.29.1, WorldEdit 7.4.6, Vanilla, Minecraft 26.3): 22/22, 5 Formatfehler behoben

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| FORMAT-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Erledigt; Stichprobe mit Philipps Modpack in DATEI-08. |
| FORMAT-02 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Erledigt; Stichprobe mit Philipps Modpack in DATEI-08. |
| NBT-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Erledigt; Stichprobe in DATEI-08. |
| ENTITY-01 | ✅ Im beschriebenen Umfang geprüft | 6/6 | Erledigt; Stichprobe in DATEI-08. |
| DIFF-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Erledigt; Oberfläche in BIB-02. |
| MAT-04 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Erledigt; Glas/Beton/Terrakotta und Oberfläche in PROJ-14. |
| PROFILE-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Erledigt; ältere Datei in der Oberfläche in DATEI-02. |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `docs/TESTING.md`
- `docs/architecture/formate/ENTITIES.md`
- `docs/architecture/formate/SCHEM_EXPORT.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/export-check-26.3/build.gradle`
- `mods/bauplaner-bridge/export-check-26.3/gradle.properties`
- `mods/bauplaner-bridge/export-check-26.3/src/gametest/java/io/github/freadeax/bauplaner/exportcheck/ExportCheckGameTest.java`
- `mods/bauplaner-bridge/export-check-26.3/src/gametest/resources/fabric.mod.json`
- `mods/bauplaner-bridge/settings.gradle`
- `packages/formats/src/schemWrite.ts`
- `packages/voxel/src/diff.ts`
- `packages/voxel/src/entities.ts`
- `scripts/mod/export_check.mjs`
- `scripts/mod/test_exports_ingame.sh`
- `tests/unit/core/diff-shift.test.mjs`
- `tests/unit/formats/entities.test.mjs`

## 2026-11-07T01:21:51.439Z · progress

**Aufgaben:** COOP-05, COOP-08, PROD-05, PROD-04, LAGER-01

Block 4b: Lagerkisten und Ertragsfarm mit echten Spielern automatisch abgenommen (scripts/mod/test_bridge_paper_bots.sh: zwei mineflayer-Bots, Team-Raum wrangler dev; lager auf Paper 1.21.11 und 26.1.2, farm mit echter Zuckerrohrfarm auf 1.21.11: 156/h im Spiel und im Planer). Behoben: Lager-Aktionsleiste von Abschnittsanzeige überschrieben, Helfer konnte an Lager anbauen, Modus hinweis ohne Meldung an Baumeister, Planer nahm Server-Ertragsrate erst ab 1 h und rundete die Laufzeit. AUTO_CHECKS LAGER-01..05, -07, -10, -11 (teil). Grenzen: Paper 26.3 nur Konsolentest (mineflayer kann 26.3 nicht), Mod-Anzeige LAGER-11 und Planer-Oberfläche nicht im Test, Abnahme auf Philipps Server offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-05 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme LAGER-01…09 und LAGER-11 auf Philipps Server. |
| COOP-08 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LAGER-10 mit einer echten Farm; Ertragsbuch in TEAMBAU-28. |
| PROD-05 | 🧩 Implementiert · Abnahme offen | 6/6 | Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen. |
| PROD-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin. |
| LAGER-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf dem Paper-Server (Thread „Server-Plugin mit geprüften Lagerkisten“). |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `docs/TESTING.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreWorld.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `packages/domain/src/materials/productionPlan.ts`
- `scripts/mod/bridge_paperbots.mjs`
- `scripts/mod/test_bridge_paper_bots.sh`
- `tests/unit/materials/production.test.mjs`

## 2026-11-07T01:42:20.153Z · progress

**Aufgaben:** GAME-12, GAME-10, GAME-07, GAME-03, LINK-03, EDIT-04, TERRAIN-04, MAP-05, MAP-06

Block 3: Mod 0.25.0 im echten Spiel in drei Fenstergrößen und mit dem echten Planer im Browser automatisch abgenommen; Frage-Karte, Bauhilfe-Zeile und Knopfbeschriftungen korrigiert

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-12 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme MOD-25 bis MOD-28 im Spiel. |
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 10/11 | Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7. |
| GAME-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |
| LINK-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LIVE-01 in Philipps Modpack. |
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 7/8 | Spielprüfung gespiegelter Zustände im Planer (S07) und der Bauhilfen in der Mod (MOD-18/19); Gelände-Werkzeuge auf dem Projektgelände sind als TERRAIN-05 umgesetzt. |
| TERRAIN-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp im Spiel (S05). |
| MAP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können. |
| MAP-06 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag). |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/views/mod/releases.json`
- `docs/TESTING.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.25.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.25.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.25.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/GuideClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramHud.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HudCard.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HudLayout.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LinkPrompt.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/MarksRenderer.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/Toasts.java`
- `scripts/mod/bridge_browser.mjs`
- `scripts/mod/bridge_gametest.mjs`
- `scripts/mod/test_bridge_ingame.sh`
- `scripts/mod/test_bridge_ingame_forge.sh`

## 2026-11-07T01:55:22.675Z · progress

**Aufgaben:** QA-02, PERF-06, UI-03, UX-01, GUIDE-01, LIB-02, LIB-03, BACKUP-02

Block 5 Geräte: Abläufe in Chromium, Firefox und WebKit automatisch abgenommen (27/27 je Engine), Safari-Fehler behoben (Vorschaubilder, Download-Adresse, hängendes Speichern); START-01/03/08/10/11, BIB-07, GERAET-02 teilweise automatisch geprüft; echte Geräte bleiben bei Philipp

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-02 | 🚧 In Arbeit | 1/2 | Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben. |
| PERF-06 | 🚧 In Arbeit | 3/3 | Abnahme: Safari/iPad und Firefox (Offline-Speicher); Verbindung Mod ↔ Planer einmal über https://bauplaner.pages.dev/Minecraft-Bauplaner/ im echten Spiel. |
| UI-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme START-20/21 durch Philipp am iPad; gruppierte Projektreiter aus „Bedienung vereinfachen“ und Anleitung optisch mitziehen; Werte an das Mod-Menü weitergeben. |
| UX-01 | 🚧 In Arbeit | 6/6 | Philipps Abnahme START-10..13 im Browser und auf dem iPad. Optik übernimmt „Planer-Oberfläche schön neu gestalten“. |
| GUIDE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (START-08/09); Begriffe mit „Bedienung des Planers vereinfachen“ (Reiter-Kurzsätze) und UI-03 abgleichen. |
| LIB-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Rückmeldung zur Bedienung der Sammlungen einholen. |
| LIB-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen. |
| BACKUP-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen. |

**Geänderte Dateien:**

- `apps/web/src/app/idbRepository.ts`
- `apps/web/src/app/ui.tsx`
- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/thumbnail/Thumb.tsx`
- `apps/web/src/thumbnail/thumbStore.ts`
- `apps/web/src/views/ViewerView.tsx`
- `docs/TESTING.md`
- `docs/testing/GERAETEMATRIX.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/offline.e2e.mjs`
- `tests/e2e/persistence.e2e.mjs`
- `tests/e2e/simple-ui.e2e.mjs`
- `tests/e2e/start.mjs`
- `tests/e2e/thumb-store.e2e.mjs`

## 2026-11-07T01:59:38.294Z · progress

**Aufgaben:** SIZE-01, SPLIT-01

SIZE-01-S06 und SPLIT-01-S07: Großbau (1,45 Mio. Blöcke) und eine im echten Spiel gebaute Basis automatisch im Minecraft-26.3-Gametest mit echter Mod und Chromium geprüft (npm run test:grossbau); WERK-07 und LIVE-02 voll, DATEI-05, MOD-11 und BIB-11 teilweise automatisch. Behoben: Litematic-Grenzmeldung, Steg über tiefem Bach, Zähler, Wo ich stehe außerhalb der Bauhöhe. Offen: Bildrate im eigenen Spiel, eigene Basis, Hänger 4–10 s bei 1,5 Mio. Blöcken.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Rest von MOD-11 im eigenen Spiel (Bildrate auf echter Grafikkarte). Folgepunkt Leistung: Werkstatt, Projekt anlegen, Export und Senden blockieren bei 1,5 Mio. Blöcken die Seite 4–10 s (in den Hintergrundrechner verlagern); Mod-Zahlen mit Tausenderpunkt. |
| SPLIT-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Rest von BIB-11 mit einer eigenen Basis aus Philipps Welt. Bekannt: Brücke nimmt das Wasser darunter mit, Bibliotheksgebäude ohne Funktion. |

**Geänderte Dateien:**

- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/views/map/WorldMapView.tsx`
- `docs/STRUKTUR.md`
- `docs/TESTING.md`
- `docs/architecture/bibliothek/BASE_PLANNER.md`
- `docs/architecture/kern/SIZE_LIMITS.md`
- `fixtures/litematic/README.md`
- `fixtures/litematic/basis-aus-dem-spiel.litematic`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/GrossbauScenario.java`
- `package.json`
- `packages/domain/src/core/split.ts`
- `packages/formats/src/litematic.ts`
- `scripts/size/basis_build.mjs`
- `scripts/size/basis_check.mjs`
- `scripts/size/big_build.mjs`
- `scripts/size/grossbau_verify.mjs`
- `scripts/size/test_grossbau_ingame.sh`
- `tests/big/basis.big.mjs`
- `tests/big/grossbau.big.mjs`
- `tests/unit/core/size-limits.test.mjs`
- `tests/unit/core/split-game-base.test.mjs`
- `tests/unit/core/split-under.test.mjs`
- `tests/unit/formats/litematic.test.mjs`

