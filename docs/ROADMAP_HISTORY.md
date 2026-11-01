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

