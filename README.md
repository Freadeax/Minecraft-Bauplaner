# Minecraft-Bauplaner

Browserbasierter Minecraft-Bauhelfer: Bauwerke betrachten, wiederverwendbare Module verwalten, neue Pläne zusammensetzen und gemeinsam Schritt für Schritt bauen.

Zielrepository: https://github.com/Freadeax/Minecraft-Bauplaner

**Stand: 27.10.2026.** Das Repository wurde geprüft: vor dieser Grundlage enthielt es nur die initiale README. Architektur und Arbeitsregeln sind ausgearbeitet. Ein erster TypeScript-Voxelkern mit Validierung, diskreten Transformationen, Schichtauswahl und Blockzählung ist implementiert und lokal geprüft. Eine erste React-/Three.js-Browseransicht ist implementiert: 3D-Orbit/Zoom, Blockauswahl, X/Y/Z-Schichten, Blockmengen und lokaler Import im internen Voxel-JSON-Vertrag. Schem-Import ist noch offen. Das Repository ist öffentlich.

## Einstieg

- [Verbindliche Regeln für Coding-Agenten](AGENTS.md)
- [Produktgrundsätze](docs/project/PRINCIPLES.md)
- [Technische Gesamtspezifikation](docs/architecture/SPECIFICATION.md)
- [Normativer Voxelvertrag v1](docs/architecture/VOXEL_CONTRACT.md)
- [Architekturentscheidungen](docs/architecture/DECISIONS.md)
- [Roadmap und Abnahme](docs/ROADMAP.md)
- [Vollständiger Umsetzungsplan](docs/IMPLEMENTATION_PLAN.md)
- [Selbstständiger GitHub-/Pages-Ablauf](docs/operations/GITHUB_CONNECTOR_RUNBOOK.md)
- [Anforderungen und Zuordnung](docs/REQUIREMENTS.md)
- [Zusammenarbeit und Kommunikation](docs/COMMUNICATION.md)
- [Stand und Übergabe](docs/STATUS.md)
- [Eigenständig ausgeführte Prüfungen](docs/TESTING.md)
- [Anweisung für das GPT-Projekt](docs/project/GPT_PROJECT_INSTRUCTIONS.md)
- [Beitragsregeln](CONTRIBUTING.md)
- [Sicherheit](SECURITY.md)

## Hosting

Verbindliches Ziel: **GitHub Pages** mit lokal gebautem statischem Frontend und Browser-Web-Workers. Keine eigenen Actions. Teamdienste werden später separat angebunden. Statischer Webbuild und Hashmanifest sind vorhanden; die erstmalige Veröffentlichung wird eingerichtet. Siehe [Hostingvertrag](docs/architecture/HOSTING.md).

## Geplanter Aufbau

`apps/web` für Oberfläche, `apps/api` für Zugriff und Zusammenarbeit, `apps/worker` für Import und Export; gemeinsame Pakete für Domäne, Voxel, Formate, Transformationen, Generatoren und API-Verträge. Diese Verzeichnisse werden mit funktionierendem Code angelegt; leere Verzeichnisse stellen keine fertige Architektur dar.

Lokaler Viewer und exportierbare Pläne bilden die erste Ausbaustufe. Teamserver, vollständige Weltimporte und Ingame-Synchronisation folgen nach einem geprüften Kern.

## Weiterentwicklung

Als Nächstes P1-01: begrenzten Schem-v3-Reader mit echten unabhängigen Binärfixtures entwickeln und den Transformationskern um geprüfte Block-/NBT-Adapter erweitern. Lokale Dokumentationsprüfung: `python3 scripts/check_docs.py`. GitHub Actions werden nicht genutzt. Der bearbeitende Agent führt die Prüfungen selbst aus und dokumentiert sie vor dem Push in `docs/TESTING.md`. Kernprüfungen sind vorhanden; Browser- und Minecraft-Integrationstests folgen mit den betreffenden Komponenten.

Eine Projektlizenz ist noch nicht festgelegt. Vor Veröffentlichung fremder Assets, Texturen oder Codebestandteile müssen Nutzungsrechte und Lizenzkompatibilität geprüft werden.

## Lokaler Kernstart

Node.js ab 22.18 und npm erforderlich. TypeScript 5.9.3, React/React DOM 19.3.1, Three.js 0.186.1 und Vite 8.3.5 sind exakt im Lockfile fixiert.

```sh
npm ci --ignore-scripts
npm run check
```

`check` führt strenge Typprüfung, Bibliotheksbuild, Node-Tests und Dokumentationsprüfung aus. Einzelbefehle: `npm run typecheck`, `npm run build`, `npm test` (nach Build), `npm run check:docs`. Generierte Module und Deklarationen liegen unter `dist/voxel/src/`. Webentwicklung: `npm run dev`; Produktionsvorschau: `npm run preview` (jeweils unter `/Minecraft-Bauplaner/`). `npm run build:web` erzeugt `dist-web/` mit `.nojekyll`, Worker, Lizenzhinweisen und `deployment.json`.

Der Kern zählt platzierte Zustände, Luft und Löschzellen getrennt. Unbekannte Transformationen werden gemeldet und erhalten. Die Testprofile sind synthetisch; daraus folgt keine Minecraft-/Modpack-Kompatibilität.

Die erste Browseransicht verwendet einen eigenen synthetischen Hafenhausentwurf. Alle Blöcke erscheinen vereinfacht als Würfel ohne Minecraft-Texturen. JSON-Import: höchstens 2 MB, 20.000 Zellen und 256 Blöcke je Achse; Verarbeitung im Browser-Worker. JSON-Sicherung ist kein Minecraft-Export. Freier Flug, echte Schem-/Litematic-Dateien, Composer und dauerhafte Projektverwaltung folgen.
