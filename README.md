# Minecraft-Bauplaner

Browserbasierter Minecraft-Bauhelfer: Bauwerke betrachten, wiederverwendbare Module verwalten, neue Pläne zusammensetzen und gemeinsam Schritt für Schritt bauen.

Zielrepository: https://github.com/Freadeax/Minecraft-Bauplaner

**Stand: 31.10.2026.** Implementiert sind Projektzentrale, Bibliothek mit 174 Gebäuden, Composer, Orbit/Freiflug, Schichten, Schem-v3- und Litematic-Import/-Export, lokale Projektspeicherung, Bauanleitungen, Material-/Rohstoffplanung, Baustellen und parametrische Generatoren. Spielaufnahmen werden mit Originaldatei und Verlauf gespeichert. Die Weltkartenoberfläche und Teamdienste bleiben offen. Grenzen und Prüfstand: [STATUS](docs/STATUS.md).

## Einstieg

- [Verbindliche Regeln für Coding-Agenten](AGENTS.md)
- [Produktgrundsätze](docs/project/PRINCIPLES.md)
- [Technische Gesamtspezifikation](docs/architecture/SPECIFICATION.md)
- [Normativer Voxelvertrag v1](docs/architecture/VOXEL_CONTRACT.md)
- [Architekturentscheidungen](docs/architecture/DECISIONS.md)
- [Roadmap und Abnahme](docs/ROADMAP.md)
- [Strukturierte Bestandsprüfung](docs/REVIEW.md)
- [Schem-Import und Grenzen](docs/architecture/SCHEM_IMPORT.md)
- [Vollständiger Umsetzungsplan](docs/IMPLEMENTATION_PLAN.md)
- [Selbstständiger GitHub-/Pages-Ablauf](docs/operations/GITHUB_CONNECTOR_RUNBOOK.md)
- [Anforderungen und Zuordnung](docs/REQUIREMENTS.md)
- [Domänenvertrag: Bibliothek, Projekte, Konflikte](docs/architecture/DOMAIN.md)
- [Parallele Arbeitsblöcke](docs/BLOCKS.md)
- [Zusammenarbeit und Kommunikation](docs/COMMUNICATION.md)
- [Stand und Übergabe](docs/STATUS.md)
- [Eigenständig ausgeführte Prüfungen](docs/TESTING.md)
- [Anweisung für das GPT-Projekt](docs/project/GPT_PROJECT_INSTRUCTIONS.md)
- [Beitragsregeln](CONTRIBUTING.md)
- [Sicherheit](SECURITY.md)

## Hosting

Verbindliches Ziel: **GitHub Pages** mit lokal gebautem statischem Frontend und Browser-Web-Workers. Keine eigenen Actions. Teamdienste werden später separat angebunden. Statischer Webbuild und Hashmanifest sind vorhanden; die erste Veröffentlichung ist unter https://freadeax.github.io/Minecraft-Bauplaner/ erreichbar. Siehe [Hostingvertrag](docs/architecture/HOSTING.md).

## Modulstruktur und Datenfluss

| Pfad | Verantwortung |
|---|---|
| `apps/web` | React-Oberfläche, 3D-/Softwareansicht, Import-/Scan-Worker und lokale Speicherung |
| `packages/voxel` | gemeinsamer Voxelvertrag, Transformationen und Zustandsregeln |
| `packages/domain` | Assets/Versionen, Projekte, Zusammensetzen, Materialien, Anleitung, Sicherung und Generatoren |
| `packages/formats` | getrennte NBT-/Schem-/Litematic-Adapter |
| `mods/bauplaner-bridge` | lesende Spielbrücke; Fabric-Adapter noch nicht im Spiel abgenommen |
| `fixtures`, `tests` | Formatbeispiele, Kernregressionen und Browserprüfungen |
| `scripts` | lokale Prüfungen, Webbuild und Main-Veröffentlichung |
| `docs` | Verträge, Entscheidungen, Aufgaben und Prüfprotokolle |

Importadapter erhalten Originaldaten getrennt vom normalisierten Voxelmodell. Der gemeinsame Kern liefert Vorschau, Materialbedarf, Bauanleitung und Export. Projekte referenzieren konkrete unveränderliche Bauteilversionen. IndexedDB speichert Projekte und Originaldateien lokal; Sicherungen ermöglichen den manuellen Transfer. Es gibt noch keinen produktiven Team-/Cloudserver.

## Veröffentlichung

GitHub Pages liefert **`main` / Repositorywurzel** aus. `scripts/publish_pages.sh` startet den Main-Publisher: geprüften Quellcommit bauen, Webartefakte samt Manifest als Kindcommit auf main übernehmen, anschließend Liveauslieferung prüfen. Quellcode bleibt erhalten. `gh-pages` wird nicht mehr benötigt; alte integrierte Branches warten nur auf eine verfügbare Löschfunktion. Keine eigenen GitHub Actions und kein Hintergrundprozess, der fremde Pushes selbst baut.

Der Konnektor kann Dateien, Gitobjekte und main aktualisieren. Branchlöschung und Pages-Einstellungen sind in seiner aktuellen Werkzeugoberfläche nicht verfügbar; das ist keine fehlende Freigabe für Entwicklung oder Veröffentlichung.

Eine Projektlizenz ist noch nicht festgelegt. Vor Veröffentlichung fremder Assets, Texturen oder Codebestandteile müssen Nutzungsrechte und Lizenzkompatibilität geprüft werden.

## Lokaler Kernstart

Node.js ab 22.18 und npm erforderlich. TypeScript 5.9.3, React/React DOM 19.3.1, Three.js 0.186.1 und Vite 8.3.5 sind exakt im Lockfile fixiert.

```sh
npm ci --ignore-scripts
npm run check
```

`check` führt strenge Typprüfung, Bibliotheksbuild, Node-Tests und Dokumentationsprüfung aus. Einzelbefehle: `npm run typecheck`, `npm run build`, `npm test` (nach Build), `npm run check:docs`. Generierte Module und Deklarationen liegen unter `dist/voxel/src/`. Webentwicklung: `npm run dev`; Produktionsvorschau: `npm run preview` (jeweils unter `/Minecraft-Bauplaner/`). `npm run build:web` erzeugt `dist-web/` mit `.nojekyll`, Worker, Lizenzhinweisen und `deployment.json`.

Der Kern zählt platzierte Zustände, Luft und Löschzellen getrennt. Unbekannte Transformationen werden gemeldet und erhalten. Die Testprofile sind synthetisch; daraus folgt keine Minecraft-/Modpack-Kompatibilität.

Die Darstellung nutzt eigene synthetische Gebäude und farbige Blockwürfel ohne fremde Minecraft-Texturen. Konservative Importlimits und Formatgrenzen stehen in den verlinkten Formatverträgen. Unbekannte Blockzustände bleiben erhalten; ungeklärte Transformationen sperren einen verlässlichen Export.

Ohne WebGL steht eine gekennzeichnete isometrische Canvas-Ersatzansicht bereit. Browserprüfungen: `npm run build && npm run test:e2e`; dafür muss Playwright-Chromium verfügbar sein. Echte GPU-/iPhone- und Referenzwerkzeugtests bleiben gesondert offen.
