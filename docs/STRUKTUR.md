# Ordnerkarte: wo liegt was?

Stand: 07.11.2026. Diese Karte ist verbindlich: Neue Dateien kommen in den Ordner ihres Fachbereichs. Aufgabenstand: [Roadmap](ROADMAP.md). Paketgrenzen: [MODULES](architecture/kern/MODULES.md).

## Repo-Wurzel

| Pfad | Inhalt |
|---|---|
| `packages/` | TypeScript-Kern ohne Browser: `voxel` ← `domain`/`formats` ← `application` |
| `apps/web/` | Planer-Oberfläche (React, Three.js, Worker, IndexedDB) |
| `mods/bauplaner-bridge/` | Minecraft-Mod (Fabric/NeoForge/Forge), Paper-Plugin, Modrinth-Angaben |
| `services/team-room/` | Team-Raum (Cloudflare Worker) |
| `scripts/` | Werkzeuge für Build, Pages, Prüfungen, Mod-Tests und Datengeneratoren |
| `tests/` | Einheitstests (`node --test`) und Browsertests (`tests/e2e/`) |
| `docs/` | Stand und Planung (Status, Roadmap, Prüfstand) und Fachdokumentation, Einstieg [docs/README.md](README.md) |
| `fixtures/` | Testdaten (Schem, Litematic, Blöcke, Voxel) |
| `.githooks/`, `.github/` | pre-push-Prüfung, Issue- und PR-Vorlagen (keine Actions) |
| `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` | Überblick, Arbeitsablauf, Sicherheitsgrundsätze, Lizenz |

**Pages-Ausgabe, nicht von Hand ändern:** `index.html`, `assets/`, `deployment.json`, `favicon.svg`, `.nojekyll`, `THIRD_PARTY_NOTICES.txt`, `examples/`. GitHub Pages liefert `main` aus der Wurzel aus; `scripts/publish_pages.sh` schreibt diese Dateien als eigenen Artefaktcommit ([HOSTING](architecture/betrieb/HOSTING.md)). `downloads/mod/` enthält die ausgelieferten Mod-Dateien, die der Planer verlinkt.

## Fachkern `packages/domain/src/`

`index.ts` ist die einzige öffentliche Tür; Oberfläche und Anwendungsschicht importieren nach Möglichkeit von dort.

| Ordner | Inhalt |
|---|---|
| `core/` | Typen, Hash, Projekt und Operationen, Zusammensetzung, Platzierung, Anschlüsse, Herauslösen, Beispiele |
| `catalog/` | Bibliothek, Katalog, Gebäude, Sammlungen, Beiträge, Ensembles, Baustile, Großprojekte; Unterordner `build/` (Gebäudesätze), `generators/`, `grossprojekte/`, `community/` |
| `base/` | Basisplaner und Anlagen (Zonen, Funktionen, Eingänge, Gelände der Anlage) |
| `materials/` | Material, Rezepte, Versionsprofil-Rezepte, Produktion, Materialvarianten, Kupfer |
| `building/` | Bauanleitung, Bauablauf, Spielprüfung, Baustelle, Bauabschnitte |
| `planning/` | Projektplanung (Meilensteine, Zeitplan), Reihenfolge zwischen Projekten |
| `world/` | Weltplan, Weltkarte, Routen, Live-Karte, Gelände (Aufnahme, Gestaltung, Streuen) |
| `team/` | Teambau, Teamplan, Team-Raum/Kopplung, Steuernachrichten, Live-Abgleich |
| `data/` | Verweisgraph, Datencheck, Speicherform, Sicherung, Sicherungsstand |
| `versions/` | Updates, Update-Zustand, Revisionen für den Export |
| `editor/` | Werkstatt-Werkzeuge |

## Oberfläche `apps/web/src/`

| Ordner | Inhalt |
|---|---|
| `app/` | Hülle, Router, Speicher, Fehlerschutz, gemeinsame UI-Bausteine |
| `views/` | Seiten; `views/project/` Projektreiter, `views/project/team/` alle Team-Ansichten, `views/library/`, `views/map/`, `views/world/`, `views/mod/` |
| `styles/` | seitenübergreifende Stylesheets; ansichtseigene CSS liegt neben der Ansicht |
| `viewer/`, `blockmodels/`, `thumbnail/`, `schem/`, `export3d/` | 3D-Darstellung, Blockmodelle, Vorschaubilder, Schem-Ansichten, 3D-Export |
| `editor/`, `materials/`, `jobs/`, `computation/`, `theme/`, `testing/` | Werkstatt, Materiallabor, Hintergrundaufträge, Projektberechnung, Farbschema, Testphase |

## Skripte `scripts/`

`scripts/publish_pages.sh` ist der feste Einstieg für die Pages-Veröffentlichung. Alles andere liegt nach Zweck in Unterordnern; die `npm run …`-Befehle rufen die richtigen Pfade auf.

| Ordner | Inhalt |
|---|---|
| `pages/` | Webbuild aufräumen und vorbereiten, Katalogdatei, Main-Pages-Veröffentlichung, Wiederherstellungsprobe |
| `checks/` | Architektur-, Doku-, Schem-/Litematic-Prüfungen, Testplan |
| `roadmap/` | `roadmap.mjs` (Prüfen, Erfassen, Rendern; pre-push-Hook) |
| `mod/` | Mod- und Plugin-Tests (`test_bridge*.sh`, `bridge_*.mjs`), `release_mod.mjs`, `modrinth_publish.mjs`, echter Weltimport |
| `gen/` | Datengeneratoren aus dem Minecraft-Server (Blockdaten, Blockfakten, Standardzustände, Versionsprofil, `probe/`) |
| `fixtures/` | Erzeuger der Testdaten unter `fixtures/` |
| `bench/` | Leistungsmessungen (`perf/`, Benchmarks) |
| `size/` | Großbau-Abnahme im echten Spiel: Großstadt-Erzeuger `big_build.mjs`, Spielbasis `basis_build.mjs`, Prüfung `grossbau_verify.mjs`, Lauf `test_grossbau_ingame.sh` |
| `library/`, `team/` | Bibliotheksbeiträge übernehmen, Team-Raum-Rauchtest |
| `dev/` | Python-Starter, Projekteinrichtung `setup.mjs` (`npm run setup`), Umzugswerkzeug `restructure.mjs` mit Listen in `moves/` |

## Tests `tests/`

| Ordner | Inhalt |
|---|---|
| `unit/<bereich>/` | Einheitstests, gleiche Bereiche wie der Fachkern: `core`, `data`, `formats`, `catalog`, `materials`, `building`, `planning`, `world`, `team`, `editor`, `mod`, `web`, `tooling` |
| `e2e/` | Browsertests (`*.e2e.mjs`) mit `start.mjs` und `modSimulator.mjs` |
| `big/` | Browserläufe mit echten Großdateien für `scripts/size/` (`*.big.mjs`, nicht in `npm run test:e2e`) |
| `helpers/` | gemeinsame Hilfen für Einheits- und Browsertests |

`npm test` läuft über `tests/**/*.test.mjs`. Ein Strukturtest (`tests/unit/tooling/structure.test.mjs`) schlägt fehl, wenn neue Dateien wieder flach in `tests/`, `scripts/`, `packages/domain/src/` oder `docs/architecture/` landen.

## Doku `docs/`

Oben liegen der Einstieg [README](README.md) und der Stand: `STATUS.md`, `roadmap.json` (daraus erzeugt `ROADMAP.md`, `ROADMAP_HISTORY.md`), `TESTING.md`, `REQUIREMENTS.md`, `LICENSING.md` und diese Karte.

| Ordner | Inhalt |
|---|---|
| `architecture/kern/` | Domäne, Module, Entscheidungen, Spezifikation, Voxelvertrag, Planmodell, Speicherung, Sicherungen, Leistung, Größen, Stabilität, Updates, Anschlüsse |
| `architecture/formate/` | Schem, Litematic, NBT, 3D-Export, Ausstattung, Versionsprofil, Blocklogik, Blockmodelle |
| `architecture/bibliothek/` | Katalog, Sammlungen, Beiträge, Generatoren, Großprojekte, Baustil, Bauwelten, Basisplaner, Anlagen |
| `architecture/planer/` | Oberfläche, Abnahme, Farbschema, Betrachter, Grafik, Schem-Ansichten, Werkstatt, Material, Produktion, Anleitung, Bauablauf, Baustelle, Planung |
| `architecture/welt/` | Weltkarte, Weltbuilder, Live-Karte, Gelände, Landschaft, Weltimport |
| `architecture/team/` | Teambau, Team-Raum, Kopplung, Live-Abgleich, Ausweichwege, Lagerkisten |
| `architecture/mod/`, `architecture/betrieb/` | Mod-Brücke und Hologramm; Hosting und Testphase |
| `project/`, `operations/`, `testing/`, `library/` | Produktgrundsätze und Planer-Vergleich; Veröffentlichung und Wiederherstellungsprobe; Testplan und Gerätematrix; Beitragsliste |

## Umziehen von Dateien

Verschiebungen laufen über `node scripts/dev/restructure.mjs <liste.json>`: Das Skript verschiebt per `git mv` und schreibt Importe, Markdown-Links, Pfade ab Repo-Wurzel und den Umfang der Roadmap-Aufgaben um. Die Listen liegen in `scripts/dev/moves/`; Zeilen mit `restructure:keep` bleiben unverändert. Wer nach einem Rebase Konflikte in Importen hat, nimmt die eigene Fassung und lässt dieselbe Liste erneut laufen; Verweise auf alte Pfade werden nachgezogen. Danach `npm run check`.
