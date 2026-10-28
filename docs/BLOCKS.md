# Parallele Arbeitsblöcke

Stand: 27.10.2026. Nutzerauftrag: Systeme strukturiert in mehreren parallelen Threads ausarbeiten, sauber und funktionierend. Das gemeinsame Fundament (Block B0) liegt auf main; die Blöcke B1–B7 bauen darauf auf und sind so geschnitten, dass sie verschiedene Dateien besitzen.

## B0 · Fundament (erledigt)

Domänenvertrag ([DOMAIN](architecture/DOMAIN.md)): Asset/AssetVersion inhaltsadressiert, Projekte, Operationen mit Undo/Redo, Revisionen, Zusammensetzung mit Voxelkonflikten und Override, Beispielbauteile. Weboberfläche: Hash-Router, Projektzentrale, Bibliothek mit Dateiimport als Bauteil, Editor mit Instanzen/Transformationen/Konfliktbericht, Speicherschnittstelle, Projekt-Tab-Registry. Playwright-Prüfung `npm run test:e2e`, Veröffentlichung `scripts/publish_pages.sh`.

## Gemeinsame Regeln für alle Blöcke

1. Vor Beginn: `git pull origin main`, AGENTS.md, diese Datei, DOMAIN.md lesen; Eintrag in COMMUNICATION.md anlegen.
2. Nur die eigenen Dateien ändern. Gemeinsame Dateien nur wie folgt:
   - `packages/domain/src/index.ts`: eigene Exportzeilen anhängen.
   - `apps/web/src/views/project/tabs.ts`: genau einen Registry-Eintrag anhängen.
   - `apps/web/src/style.css`: eigene Regeln in einem eigenen kommentierten Abschnitt am Ende.
   - `package.json`: neue Skripte/Abhängigkeiten nur begründet, exakt fixiert, mit Lockfile.
   - STATUS/ROADMAP/REQUIREMENTS/REVIEW: nur eigene Zeilen; TESTING und COMMUNICATION: eigener Abschnitt am Ende.
3. Domänenlogik in `packages/*` mit Node-Tests unter `tests/`, UI nur als Adapter. Keine zweite Koordinaten-, Transformations- oder Zähllogik.
4. Vor jedem Push: `git pull --rebase origin main`, dann `npm run check` und `npm run test:e2e` vollständig grün; Ergebnis in TESTING.md. Konflikte fachlich lösen, nie Force-Push.
5. Direkt nach dem Push auf main: `scripts/publish_pages.sh` ausführen und `https://freadeax.github.io/Minecraft-Bauplaner/deployment.json` auf den neuen Quellcommit prüfen. Keine GitHub Actions.
6. Grenzen sichtbar machen: Demo, ungeprüfte Profile, manuelle Haken, fehlende Zuordnungen.

## Blöcke

| ID | Block | Roadmap/Anforderung | Besitzt (neu/hauptverantwortlich) | Hängt ab von |
|---|---|---|---|---|
| B1 | Materialbedarf und Bauitems | P1-04a, R-017 | `packages/domain/src/materials.ts`, `tests/materials.test.mjs`, `views/project/MaterialsTab.tsx`, `docs/architecture/MATERIALS.md` | B0 |
| B2 | Schem-v3-Export | P3-01, R-022 | `packages/formats/src/nbtWrite.ts`, `schemWrite.ts`, unabhängiger Python-Leser `scripts/verify_schem.py`, `tests/schem-export.test.mjs`, `views/project/ExportTab.tsx`, `docs/architecture/SCHEM_EXPORT.md` | B0 |
| B3 | Dauerhafte Speicherung und Backup | P2-01, R-023/R-024 | `apps/web/src/app/idbRepository.ts`, `openRepository` in `repository.ts`, `packages/domain/src/backup.ts`, `tests/backup.test.mjs`, `tests/e2e/persistence.e2e.mjs`, Backup-UI in `ProjectsView.tsx`, `docs/architecture/PERSISTENCE.md` | B0 |
| B4 | Bauanleitung und Aufgaben | P3-02, R-007 | `packages/domain/src/guide.ts`, `tests/guide.test.mjs`, `views/project/BuildTab.tsx`, `docs/architecture/GUIDE.md` | B0 (B1 optional für Itemmengen) |
| B5 | Anschlüsse, Snap und Bereichsauswahl | P2-02, R-009/R-011 | `packages/domain/src/connectors.ts`, `tests/connectors.test.mjs`, `views/project/SnapPanel.tsx` (eine Einbindungszeile in `EditorTab.tsx`), `views/library/ConnectorEditor.tsx` und `CropPanel.tsx` (Einbindung in `LibraryView.tsx`) | B0 |
| B6 | Viewer und Bedienung | P1-03c, R-004/R-005/R-006 | `apps/web/src/Viewer.tsx`, `canvasFallback.ts`, `colors.ts`, neue Viewer-Module; Code-Splitting in `vite.config.mjs` | B0 |
| B7 | Zustandsadapter für Drehen/Spiegeln | P1-02a, R-010 | `packages/voxel/src/transforms.ts` (+ neue `states.ts`), `tests/states.test.mjs`, Abschnitt in VOXEL_CONTRACT.md | B0 |
| B8 | Spielbrücke: Fortschritt aus der Welt | P6-01, R-020 | `docs/architecture/MOD_BRIDGE.md`, `packages/formats/src/scan.ts`, `apps/web/src/scan.worker.ts`, `tests/e2e/game-check.e2e.mjs`, `packages/domain/src/gameCheck.ts`, `tests/game-check.test.mjs`, `views/project/GameCheckPanel.tsx` (eine Einbindungszeile in `BuildTab.tsx`), `mods/bauplaner-bridge/` | B2, B4 |
| B9 | Gebäudekatalog und Vorschläge | R-008 | `packages/domain/src/catalog.ts`, `buildings.ts`, `tests/catalog.test.mjs`, `tests/e2e/catalog.e2e.mjs`, `views/library/BuildingSheet.tsx`, `CatalogFilters.tsx`, `FacetFields.tsx`, Katalogteile von `LibraryView.tsx`, `docs/architecture/CATALOG.md`; kleine Änderungen: `seedSamples` in `repository.ts`, Facetten in `samples.ts`, Route in `router.ts`/`main.tsx`, ein Link in `EditorTab.tsx` | B1, B4, B5, B7 |
| B1-R | Rohstoffe und Rezepte | R-017 (Rest) | `packages/domain/src/recipes.ts`, `tests/recipes.test.mjs`, `tests/e2e/recipes.e2e.mjs`, `views/project/RawMaterialsPanel.tsx` (eine Einbindungszeile in `MaterialsTab.tsx`), Abschnitt in `docs/architecture/MATERIALS.md`; klein: `stackSizeOf` exportiert und ein Hinweistext in `materials.ts` | B1 |

### Abnahme je Block

- **B1:** Platzierte Zustände, Bauitems und Stacks getrennt; Türen/Betten/Doppelpflanzen nur einmal, Doppelstufen zweifach, Kerzen/Seegurken/Schneeschichten nach Anzahl, Wandvarianten auf Item abgebildet, Flüssigkeiten und Modblöcke ungelöst sichtbar, Annahmen gekennzeichnet; Mengen aus `resolution.world`; Tab „Material“ mit Stück/Stacks/Shulkerkisten und Hinweis bei Konflikten.
- **B2:** NBT-Writer und Schem-v3-Writer aus aufgelöster Welt; Exportsperre bei `exportBlockers`; Luft-/Lösch-/Auswahlpolitik und Offset im Bericht; unabhängiger Python-Leser prüft Abmessungen, Palette, VarInts, BlockEntities; zusätzlich Roundtrip über eigenen Reader; Export friert eine Revision ein und nennt sie.
- **B3:** IndexedDB mit SchemaVersion/Migration, atomare Transaktionen, `baseRevision`-Konflikt bei zwei Tabs, Speicherfehler sichtbar, Originaldateien als Blobs; Projektbackup mit Hashes, Wiederherstellung prüft Vollständigkeit und überschreibt nichts still.
- **B4:** Schritte je Bauabschnitt/Instanz und Y-Schicht mit stabiler ID, Koordinatenbereich, Mengen, Voraussetzungen ohne Zyklen; Schwerkraftblöcke, Flüssigkeiten zuletzt; manuell abgehakt getrennt von geprüft; geänderte Geometrie ⇒ prüfbedürftig; mobile Bauansicht.
- **B5:** Anschlüsse auf Grenzflächen validiert, Transformation von Position/Normale/Up, deterministische Snap-Kandidaten mit Konfliktprüfung und Nutzungsgrenze, Verbindungen gespeichert; Anschluss-Editor und Bereich-als-Bauteil in der Bibliothek.
- **B6:** freier Flug (WASD, Escape), Draufsicht/Seitenansichten, Auswahl fokussieren, Welt-/Lokalkoordinate im Inspektor, Schichtmodi Bereich/einzeln im Editor, Touch-Bedienung, Leistung (nur sichtbare Flächen, Code-Splitting) mit dokumentierter Messung.
- **B7:** expliziter Regelkatalog für Vanilla-Familien (Treppen, Stämme/Säulen, `facing`, Türen/Falltüren inkl. Scharnier, Zäune/Scheiben/Mauern, Schienen, Betten, Schilder/Banner/Köpfe `rotation`), unabhängige erwartete Ausrichtungen, vier Drehungen = Identität, doppelte Spiegelung = Identität; Unbekanntes bleibt ungelöst.
- **B9:** 16 eigene Gebäude ohne ungelöste Dreh-/Spiegelzustände; Angaben (Facetten-Tags) und berechnete Kennwerte getrennt gekennzeichnet; Filter mit Trefferzahlen, Bauplatz mit Drehung, deterministische Sortierung; Vorschläge mit vollständig sichtbarer Punktbegründung; Übernahme ins Projekt mit `baseRevision`. Details [CATALOG](architecture/CATALOG.md).
- **B1-R:** Bauitems bis zu Rohstoffen über einen azyklischen Rezeptkatalog; Rundung über den ganzen Baum geteilt, Reste sichtbar; Steinsäge/Werkbank wählbar; Tags mit sichtbarer Sortenwahl; Brennstoff, Wasser, Werkzeuge getrennt; Items ohne Rezept markiert. Details [MATERIALS](architecture/MATERIALS.md#rohstoffe-und-rezepte-b1-r).
- **B8:** siehe Stufen M1–M4 in [MOD_BRIDGE](architecture/MOD_BRIDGE.md); Mod-Build und Spielabnahme auf dem Rechner des Nutzers.

### B10 · Litematic-Adapter (P5-01, R-002)

Besitzt: `packages/formats/src/litematic.ts`, `litematicWrite.ts`, `structure.ts`, `scripts/make_litematic_fixture.py`, `scripts/verify_litematic.py`, `fixtures/litematic/`, `tests/litematic.test.mjs`, `tests/e2e/litematic.e2e.mjs`, `views/library/LitematicRegions.tsx`, `docs/architecture/LITEMATIC.md`. Kleine Eingriffe: `import.worker.ts`, `importFile.ts`, Formatzeilen in `LibraryView.tsx`/`ViewerView.tsx`, Formatwahl in `ExportTab.tsx`, `format` in `schemExport.ts`, `'litematic'` in `AssetSourceFormat`, Beispieldatei in `prepare_pages.mjs`. Abnahme: Mehrregionen, negative Größen, Versionsgrenzen 1/2–4/5–7/≥8, Bitpacking über Long-Grenzen, unabhängige Fixture und Python-Leser, Export lesbar für die Litematica-Version der Ziel-DataVersion. Status: erledigt, Spielabnahme offen.

### B9-A · Gebäudekatalog v2 (Ausbau)

Besitzt: `packages/domain/src/build/` (`plot.ts`, `spec.ts`, `sets/*.ts`), `packages/domain/src/ensembles.ts`, Erweiterungen in `catalog.ts`/`buildings.ts`, `tests/catalog.test.mjs`, `tests/e2e/catalog.e2e.mjs`, Katalogansichten unter `views/library/`. Kleine Eingriffe: `materials.ts` (`bricks`, `ender_chest` direkt), `recipes.ts` (Endertruhe, Enderauge, Lohenstaub, Enderperle), `colors.ts` (Redstone-, Pilz-, Farmblöcke), `EditorTab.tsx` (Suche in der Bauteilliste), `tests/e2e/app.e2e.mjs`. Abnahme: 150 Gebäude in 10 Sets + 16 klassische mit festen Versions-IDs, 12 Variantenfamilien, Spielphase, 9 Ensembles ohne Konflikte, keine stillen Material-/Rezeptlücken. Status: erledigt. Details [CATALOG](architecture/CATALOG.md).

### B11 · Oberfläche Bibliothek und Projektzentrale

Besitzt: `apps/web/src/thumbnail/` (`iso.ts`, `Thumb.tsx`), `apps/web/src/catalog.css`, `views/library/BuildingCard.tsx`, `BuildingDetail.tsx`, `EnsemblesPage.tsx`, `ComparePage.tsx`, `prefs.ts`, `docs/architecture/UI.md`. Umgebaut: `LibraryView.tsx` (Übersicht/Unterseiten/Import), `BuildingSheet.tsx` (in Abschnitte zerlegt), `ProjectsView.tsx` (Einstieg, Projektkarten mit Bild, Vorlagen). Kleine Eingriffe: `router.ts` (Bibliotheksunterseiten), `main.tsx`, `CatalogFilters.tsx` (`filterChips`, `hideFacets`), Bildchen in der Editor-Bauteilliste (`EditorTab.tsx`), angepasste Selektoren in `app`/`snap`/`persistence`-E2E. Details [UI](architecture/UI.md).

### B13 · Parametrische Gebäudegeneratoren

Besitzt: `packages/domain/src/generators/` (Parametervertrag, Stile, Generatoren Turm/Mauer/Brücke/Dach/Haus), `tests/generators.test.mjs`, `tests/e2e/generators.e2e.mjs`, `views/library/GeneratorsPage.tsx`, `views/library/GeneratorForm.tsx`, `docs/architecture/GENERATORS.md`. Kleine Eingriffe: `'generator'` in `AssetSourceFormat` und optionales `generator`-Feld in `AssetVersionSource` (`types.ts`), Unterseite `generatoren` in `router.ts`, ein Reiter und ein Seitenzweig in `LibraryView.tsx`, ein Link im Steckbrief (`BuildingDetail.tsx`) und in der Editor-Bauteilliste (`EditorTab.tsx`), Exportzeilen in `index.ts`, CSS-Abschnitt „B13“. Abnahme: deterministische Erzeugung (gleiche Parameter ⇒ gleiche Versions-ID), Parameter validiert und in der Version gespeichert (reproduzierbar, prüfbar), alle Zustände im B7-Schema, keine stillen Material-/Rezeptlücken, gültige Anschlüsse mit maßabhängigem Profil, neue Parameter ⇒ neue Version desselben Assets, bestehende Projekte behalten ihre Version. Status: in Arbeit (Thread „Parametrische Gebäudegeneratoren bauen“).

### B12 · Schem-Ansichten, Bauversionen, Bibliothek

Besitzt: `packages/voxel/src/diff.ts`, `packages/domain/src/variants.ts`, `build/sets/spielhilfen.ts`, `build/sets/varianten.ts`, `apps/web/src/schem/` (`SchemView`, `ShotGallery`, `LayerSheet`, `DiffView`, `layers.ts`), `thumbnail/views.ts`, `schem.css`, `views/library/VersionsSection.tsx`, `urlState.ts`, `tests/variants.test.mjs`, `tests/schem-views.test.mjs`, `tests/e2e/schem.e2e.mjs`, `docs/architecture/SCHEM_VIEWS.md`. Kleine Eingriffe: `states.ts` (Braustand, Zielblock, Netherwarze), `catalog.ts` (`basis:`-Tag, `variantGroup`), `AssetSourceFormat` um `'variant'`, `iso.ts`/`Thumb.tsx` (Blickwinkel, Schnitt), `BuildingDetail.tsx`, `LibraryView.tsx` (URL-Zustand, Stöbern, Blickrichtung), `ViewerView.tsx`, `router.ts` (Unterseite und Suche), `sceneController.ts` (Einpassen), `sakral.ts` (Braustand mit Zustand), `catalog.e2e` (Karte ins Bild scrollen). Abnahme: Diff handgezählt, Materialfamilien nur Materialtausch, 15 Bücherregale, Bilder/Ebenen/Versionen im Browser bei 1400 und 390 px. Status: erledigt. Details [SCHEM_VIEWS](architecture/SCHEM_VIEWS.md).

### B14 · Baustelle: Bauabschnitte, Lager, Sammelplan, Freiraum

Besitzt: `packages/domain/src/site.ts`, `tests/site.test.mjs`, `tests/e2e/site.e2e.mjs`, `views/project/SiteTab.tsx`, `apps/web/src/site.css`, `docs/architecture/SITE.md`. Kleine Eingriffe: optionales Feld `site` in `Project` (`types.ts`), Operation `site.set` in `project.ts`, `checkSite` in `checkProjectRecord` (`backup.ts`), Einstellungen statt Sitzungszustand in `RawMaterialsPanel.tsx`/`MaterialsTab.tsx`, Abschnittsfilter in `BuildTab.tsx`, Exporte in `index.ts`, Registry-Eintrag in `tabs.ts`. Abnahme: „vorhanden“ dauerhaft, eigene Abschnitte mit Schichtbereichen und Reihenfolgeprüfung, Sammel-/Farmplan je Abschnitt mit Lagerverbrauch in Bau-Reihenfolge, Freiraum an Anschlüssen (frei/verbaut/angedockt/verbunden), Fortschrittsübersicht. Status: erledigt. Details [SITE](architecture/SITE.md).

### S1 · Stabilität und Qualitätssicherung

Besitzt: `packages/domain/src/integrity.ts`, `apps/web/src/app/ErrorBoundary.tsx`, `errorLog.ts`, `delivery.ts`, `views/SystemView.tsx`, `tests/integrity.test.mjs`, `tests/stability.test.mjs`, `tests/e2e/stability.e2e.mjs`, `docs/architecture/STABILITY.md`. Kleine Eingriffe: `validation.ts`, `transforms.ts`, `compose.ts`, `guide.ts` (Leistung, Ergebnisse unverändert), `catalog.css`, `router.ts`, `main.tsx`, `ProjectsView.tsx`, `index.ts`. Abnahme: Datencheck ohne Mutation mit allen Befundarten, Auslieferungsprüfung gegen das Hashmanifest, Absturzschutz je Seite, Großmodell mit Zeitbudgets, Geometriehash unverändert, Importvorschau im Bild. Status: erledigt. Details [STABILITY](architecture/STABILITY.md).
