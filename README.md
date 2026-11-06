# LMNT — Build Studio

Browserbasierter Minecraft-Bauhelfer: Bauwerke betrachten, wiederverwendbare Module verwalten, neue Pläne zusammensetzen und gemeinsam Schritt für Schritt bauen.

Zielrepository: https://github.com/Freadeax/Minecraft-Bauplaner

**Stand: 01.11.2026.** Implementiert sind Projektzentrale, Bibliothek mit 336 Gebäuden (u. a. eingerichtete Räume, Garten, Natur, Stadt, Küste, Fahrzeuge, Bergbau, Nether/End, Tierhof, Fantasy und historische Bauten), Composer, Orbit/Freiflug, Schichten, Schem-v3- und Litematic-Import/-Export, lokale Projektspeicherung, Asset-Revisionsschutz gegen konkurrierende Änderungen, abbrechbare Worker-Projektberechnung, Bauanleitungen, Material-/Rohstoffplanung, Baustellen und elf parametrische Generatoren (Haus, Turm, Mauer, Brücke, Dach, Treppenhaus, Kirche, Hafen, Torhaus, Windmühle, Brunnen) mit Anlagen wie Burganlage und Dorfplatz. Spielaufnahmen werden mit Originaldatei und Verlauf gespeichert. Neu: fünf Oberflächenthemen mit Hell/Dunkel/System und ein Materiallabor mit Familien, Suche und Herkunft der berechneten Bauitems. Die Bibliothek bietet elf Bauwelten; Glas, Beton und Terrakotta lassen sich als getrennte Materialvarianten wählen. Die Weltkartenoberfläche und Teamdienste bleiben offen. Grenzen und Prüfstand: [STATUS](docs/STATUS.md).

## Einstieg

- [Verbindliche Regeln für Coding-Agenten](AGENTS.md)
- [Ordnerkarte: wo liegt was?](docs/STRUKTUR.md)
- [Produktgrundsätze](docs/project/PRINCIPLES.md)
- [Technische Gesamtspezifikation](docs/architecture/kern/SPECIFICATION.md)
- [Normativer Voxelvertrag v1](docs/architecture/kern/VOXEL_CONTRACT.md)
- [Architekturentscheidungen](docs/architecture/kern/DECISIONS.md)
- [Verbindliche Roadmap mit 56 Arbeitspaketen](docs/ROADMAP.md)
- [Nachvollziehbarer Arbeitsverlauf](docs/ROADMAP_HISTORY.md)
- [Maschinenlesbarer Aufgabenstand](docs/roadmap.json)
- [Ausführbarer Modulvertrag](docs/architecture/kern/MODULES.md)
- [Strukturierte Bestandsprüfung](docs/REVIEW.md)
- [Weltkarte und Live-Karten-Verknüpfung](docs/architecture/welt/WORLDMAP.md)
- [Schem-Import und Grenzen](docs/architecture/formate/SCHEM_IMPORT.md)
- [Vollständiger Umsetzungsplan](docs/archiv/IMPLEMENTATION_PLAN.md)
- [Selbstständiger GitHub-/Pages-Ablauf](docs/operations/GITHUB_CONNECTOR_RUNBOOK.md)
- [Anforderungen und Zuordnung](docs/REQUIREMENTS.md)
- [Domänenvertrag: Bibliothek, Projekte, Konflikte](docs/architecture/kern/DOMAIN.md)
- [Parallele Arbeitsblöcke](docs/archiv/BLOCKS.md)
- [Zusammenarbeit und Kommunikation](docs/COMMUNICATION.md)
- [Stand und Übergabe](docs/STATUS.md)
- [Eigenständig ausgeführte Prüfungen](docs/TESTING.md)
- [Anweisung für das GPT-Projekt](docs/project/GPT_PROJECT_INSTRUCTIONS.md)
- [Beitragsregeln](CONTRIBUTING.md)
- [Sicherheit](SECURITY.md)

## Hosting

Verbindliches Ziel: **GitHub Pages** mit lokal gebautem statischem Frontend und Browser-Web-Workers. Keine eigenen Actions. Teamdienste werden später separat angebunden. Statischer Webbuild und Hashmanifest sind vorhanden; die erste Veröffentlichung ist unter https://freadeax.github.io/Minecraft-Bauplaner/ erreichbar. Siehe [Hostingvertrag](docs/architecture/betrieb/HOSTING.md).

## Modulstruktur und Datenfluss

| Pfad | Verantwortung |
|---|---|
| `apps/web` | React-Oberfläche, 3D-/Softwareansicht, Import-/Scan-Worker und lokale Speicherung |
| `packages/voxel` | gemeinsamer Voxelvertrag, Transformationen und Zustandsregeln |
| `packages/application` | Exportanwendungsfall, Speicherports, Aufnahmeverwaltung und portabler Sitzungsspeicher |
| `packages/domain` | Assets/Versionen, Projekte, Zusammensetzen, Materialien, Anleitung, Sicherung und Generatoren |
| `packages/formats` | getrennte NBT-/Schem-/Litematic-Adapter |
| `mods/bauplaner-bridge` | Client-Mod (Fabric/NeoForge), Paper-Plugin und Modrinth-Angaben |
| `fixtures`, `tests` | Formatbeispiele, Kernregressionen und Browserprüfungen |
| `scripts` | lokale Prüfungen, Webbuild und Main-Veröffentlichung |
| `docs` | Verträge, Entscheidungen, Aufgaben und Prüfprotokolle |
| `services/team-room` | Team-Raum (Cloudflare Worker) |

Die Fachordner innerhalb der Pakete und wo neue Dateien hingehören: [Ordnerkarte](docs/STRUKTUR.md). Die Dateien `index.html`, `assets/`, `deployment.json` und `examples/` in der Wurzel sind Pages-Ausgabe und werden nur von `scripts/publish_pages.sh` geschrieben.

Importadapter erhalten Originaldaten getrennt vom normalisierten Voxelmodell. Der gemeinsame Kern liefert Vorschau, Materialbedarf, Bauanleitung und Export. Projekte referenzieren konkrete unveränderliche Bauteilversionen. IndexedDB speichert Projekte und Originaldateien lokal; Sicherungen ermöglichen den manuellen Transfer. Es gibt noch keinen produktiven Team-/Cloudserver.

## Veröffentlichung

GitHub Pages liefert **`main` / Repositorywurzel** aus. `scripts/publish_pages.sh` startet den Main-Publisher: geprüften Quellcommit bauen, Webartefakte samt Manifest als Kindcommit auf main übernehmen, anschließend Liveauslieferung prüfen. Quellcode bleibt erhalten. Die Remote-Abfrage vom 01.11.2026 zeigt ausschließlich `main`; keine Branchlöschung durch diesen Setupauftrag. Keine eigenen GitHub Actions und kein Hintergrundprozess, der fremde Pushes selbst baut.

Der Konnektor kann Dateien, Gitobjekte und main aktualisieren. Branchlöschung und Pages-Einstellungen sind in seiner aktuellen Werkzeugoberfläche nicht verfügbar; das ist keine fehlende Freigabe für Entwicklung oder Veröffentlichung.

Eine Projektlizenz ist noch nicht festgelegt. Vor Veröffentlichung fremder Assets, Texturen oder Codebestandteile müssen Nutzungsrechte und Lizenzkompatibilität geprüft werden.

## Lokaler Kernstart

Codex-Einrichtung und konkrete Anschlussaufgaben: [CODEX_SETUP](docs/project/CODEX_SETUP.md). `npm run setup:codex` richtet Abhängigkeiten, lokale Hooks und Build ein. Die Browserlaufzeit wird separat mit `npm run setup:browser` installiert.

Node.js ab 22.18 und npm erforderlich. TypeScript 5.9.3, React/React DOM 19.3.1, Three.js 0.186.1 und Vite 8.3.5 sind exakt im Lockfile fixiert.

```sh
npm ci --ignore-scripts
npm run check
```

`check` prüft auch Modulgrenzen, Roadmapschema und generierte Fortschrittsansichten und führt strenge Typprüfung, Bibliotheksbuild, Node-Tests und Dokumentationsprüfung aus. Einzelbefehle: `npm run typecheck`, `npm run build`, `npm test` (nach Build), `npm run check:docs`. Generierte Module und Deklarationen liegen unter `dist/voxel/src/`. Webentwicklung: `npm run dev`; Produktionsvorschau: `npm run preview` (jeweils unter `/Minecraft-Bauplaner/`). `npm run build:web` erzeugt `dist-web/` mit `.nojekyll`, Worker, Lizenzhinweisen und `deployment.json`.

Der Kern zählt platzierte Zustände, Luft und Löschzellen getrennt. Unbekannte Transformationen werden gemeldet und erhalten. Die Testprofile sind synthetisch; daraus folgt keine Minecraft-/Modpack-Kompatibilität.

Die Darstellung nutzt eigene synthetische Gebäude und farbige Blockwürfel ohne fremde Minecraft-Texturen. Konservative Importlimits und Formatgrenzen stehen in den verlinkten Formatverträgen. Unbekannte Blockzustände bleiben erhalten; ungeklärte Transformationen sperren einen verlässlichen Export.

Ohne WebGL steht eine gekennzeichnete isometrische Canvas-Ersatzansicht bereit. Browserprüfungen: `npm run build && npm run test:e2e`; Playwright ist exakt im Lockfile fixiert, Chromium über `npm run setup:browser` installieren. Echte GPU-/iPhone- und Referenzwerkzeugtests bleiben gesondert offen.

## Lizenz

MIT, siehe [LICENSE](LICENSE). Herkunft aller Inhalte, Fremdbestandteile und Regeln für neue Inhalte: [docs/LICENSING.md](docs/LICENSING.md). Texturen werden nicht mitgeliefert; sie kommen nur aus Quellen des Nutzers.

## Aufgaben und Fortschritt pflegen

Vor jedem Arbeitsblock Aufgabe in `docs/roadmap.json` und COMMUNICATION anmelden. Teilschritte, Nachweise und nächste Aktion nachführen; `npm run roadmap:record -- ARCH-01 "Konkretes Ergebnis und Prüfgrenzen"` hängt Dateizuordnung und Aufgabenstand an. `npm run check:roadmap-change -- <vorheriger-main>` ist vor jedem Quell-Merge/Push verpflichtend. `npm run setup:hooks` aktiviert den lokalen Pre-Push-Check. Die JSON-Datei erzeugt Roadmap und Historie; keine zweite Statusliste pflegen. Details und Grenzen der lokalen Durchsetzung stehen in der Roadmap.
