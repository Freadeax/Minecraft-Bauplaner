# Ordnerkarte: wo liegt was?

Stand: 05.11.2026 · STRUCT-01. Diese Karte ist verbindlich: Neue Dateien kommen in den Ordner ihres Fachbereichs. Aufgabenstand: [Roadmap](ROADMAP.md). Paketgrenzen: [MODULES](architecture/MODULES.md).

## Repo-Wurzel

| Pfad | Inhalt |
|---|---|
| `packages/` | TypeScript-Kern ohne Browser: `voxel` ← `domain`/`formats` ← `application` |
| `apps/web/` | Planer-Oberfläche (React, Three.js, Worker, IndexedDB) |
| `mods/bauplaner-bridge/` | Minecraft-Mod (Fabric/NeoForge/Forge), Paper-Plugin, Modrinth-Angaben |
| `services/team-room/` | Team-Raum (Cloudflare Worker) |
| `scripts/` | Werkzeuge für Build, Pages, Prüfungen, Mod-Tests und Datengeneratoren |
| `tests/` | Einheitstests (`node --test`) und Browsertests (`tests/e2e/`) |
| `docs/` | Leitstand (Roadmap, Status, Tests, Kommunikation) und Fachdokumentation |
| `fixtures/` | Testdaten (Schem, Litematic, Blöcke, Voxel) |
| `.githooks/`, `.github/` | pre-push-Prüfung, Issue-Vorlagen (keine Actions) |

**Pages-Ausgabe, nicht von Hand ändern:** `index.html`, `assets/`, `deployment.json`, `favicon.svg`, `.nojekyll`, `THIRD_PARTY_NOTICES.txt`, `examples/`. GitHub Pages liefert `main` aus der Wurzel aus; `scripts/publish_pages.sh` schreibt diese Dateien als eigenen Artefaktcommit ([HOSTING](architecture/HOSTING.md)). `downloads/mod/` enthält die ausgelieferten Mod-Dateien, die der Planer verlinkt.

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

## Umziehen von Dateien

Verschiebungen laufen über `node scripts/dev/restructure.mjs <liste.json>`: Das Skript verschiebt per `git mv` und schreibt Importe, Markdown-Links, Pfade ab Repo-Wurzel und den Umfang der Roadmap-Aufgaben um. Die Listen liegen in `scripts/dev/moves/`. Wer nach einem Rebase Konflikte in Importen hat, nimmt die eigene Fassung und lässt dieselbe Liste erneut laufen; Verweise auf alte Pfade werden nachgezogen. Danach `npm run check`.
