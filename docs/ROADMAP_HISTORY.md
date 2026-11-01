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

