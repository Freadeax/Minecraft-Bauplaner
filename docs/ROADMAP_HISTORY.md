# Roadmap-Änderungsverlauf

Aus [roadmap.json](roadmap.json) erzeugt. Ereignisse werden angehängt, nicht nachträglich umgeschrieben. Commitnachweise: Git-Historie der JSON-Datei; Veröffentlichung: deployment.json und Artefakt-Kindcommit.

## 2026-11-01T06:15:35+01:00 · baseline

**Aufgaben:** CORE-01, CORE-02, CORE-03, STORE-01, MAT-01, BUILD-01, LIB-01, GEN-01, OPS-01, PLAN-01, ARCH-01, DOC-01, STORE-02, QA-01, QA-02, UI-01, STAB-01, OPS-02, OPS-03, LICENSE-01, PROFILE-01, NBT-01, FORMAT-01, FORMAT-02, MAT-02, MAT-03, MAT-04, DIFF-01, PERF-01, PERF-02, PERF-03, VIEW-01, VIEW-02, EDIT-01, UPDATE-01, LIB-02, LIB-03, WORLD-02, BUILD-05, GEN-02, MAP-01, MAP-02, GAME-01, GAME-02, GAME-03, WORLD-IMPORT-01, BACKUP-02, TEAM-01, AUTH-01, TEAM-02, TEAM-03, GAME-04, LAGER-01, OPS-04, DEFER-01, DEFER-02

Aktuellen Main-Snapshot 84838f0 und dokumentierten 342-Test-Stand übernommen; offene Browser-/Spiel-/Geräteabnahmen ausdrücklich nicht als erledigt gezählt. Historische Roadmap separat erhalten.

## 2026-11-01T06:15:35+01:00 · started

**Aufgaben:** PLAN-01, ARCH-01, DOC-01

Nutzer beauftragt vollständige Roadmap mit Mergepflege. Anwendungsschicht begonnen; vollständige Prüfung und Main-/Pages-Integration noch ausstehend.

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

