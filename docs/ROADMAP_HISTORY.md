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

## 2026-11-03T18:38:37.063Z · progress

**Aufgaben:** SIZE-01

Browsertest Weltkarte: aktuelle Mod im Simulator meldet große Pläne

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05) mit einem großen Bau im Spiel. |

**Geänderte Dateien:**

- `node_modules`
- `tests/e2e/map-depth.e2e.mjs`

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

## 2026-11-03T20:21:00.399Z · progress

**Aufgaben:** PERF-05

Wettlauf im Kartenverlauf behoben: Strg+Z direkt nach dem Löschen (mit Projektlage) ging verloren, weil der Schritt erst nach dem Speichern der Projektlage im Verlauf stand; Änderung, Rückgängig und Wiederholen laufen jetzt nacheinander. Nachgestellt mit CPU-Drosselung: alt rot, neu grün.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-05 | 🧩 Implementiert · Abnahme offen | 6/8 | O-2 Zellen bei Bedarf entpacken (nach Merge der Teambau-Threads); Mod/Plugin-Analyse (O-8). |

**Geänderte Dateien:**

- `apps/web/src/views/map/useMapHistory.ts`
- `docs/TESTING.md`

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

## 2026-11-03T20:38:19.401Z · progress

**Aufgaben:** COOP-05

Vorbereitung Team-Raum (TEAM_LIVE.md): TeamUplink-Schnittstelle, jedes vom Server geschriebene Ereignis (Befehle, Teamkanal, Baunachweis, Lager) geht einmal an den Uplink; TeamModule.receive nimmt Raum-Ereignisse über TeamLog.add an, ohne Echo. Standard: kein Uplink.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| COOP-05 | 🧩 Implementiert · Abnahme offen | 3/5 | Mod-Thread veröffentlicht Paper-Jar 0.10.0 mit Teamkanal; danach Abnahme LAGER-01…09 auf Philipps Server. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamUplink.java`

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

## 2026-11-04T09:00:40.731Z · progress

**Aufgaben:** GAME-11

Versionsentscheidung Philipp: Fabric 26.3 zuerst, dann die jeweils neueste Version; keine Matrix älterer Versionen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-11 | ⏳ Offen | 0/4 | Entschieden (Philipp 04.11.): Fabric 26.3 (sein Modpack mit REI) hat Vorrang, danach jeweils die neueste Minecraft-Version nachziehen; keine Matrix älterer Versionen. |

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

