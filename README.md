# Minecraft-Bauplaner

Browserbasierter Minecraft-Bauhelfer: Bauwerke betrachten, wiederverwendbare Module verwalten, neue Pläne zusammensetzen und gemeinsam Schritt für Schritt bauen.

Zielrepository: https://github.com/Freadeax/Minecraft-Bauplaner

**Stand: 27.10.2026.** Das Repository wurde geprüft: vor dieser Grundlage enthielt es nur die initiale README. Architektur, Roadmap und feste Arbeitsregeln sind nun ausgearbeitet. Eine Anwendung ist noch nicht implementiert. Das Repository bleibt privat.

## Einstieg

- [Verbindliche Regeln für Coding-Agenten](AGENTS.md)
- [Produktgrundsätze](docs/project/PRINCIPLES.md)
- [Technische Gesamtspezifikation](docs/architecture/SPECIFICATION.md)
- [Architekturentscheidungen](docs/architecture/DECISIONS.md)
- [Roadmap und Abnahme](docs/ROADMAP.md)
- [Anforderungen und Zuordnung](docs/REQUIREMENTS.md)
- [Zusammenarbeit und Kommunikation](docs/COMMUNICATION.md)
- [Stand und Übergabe](docs/STATUS.md)
- [Anweisung für das GPT-Projekt](docs/project/GPT_PROJECT_INSTRUCTIONS.md)
- [Beitragsregeln](CONTRIBUTING.md)
- [Sicherheit](SECURITY.md)

## Geplanter Aufbau

`apps/web` für Oberfläche, `apps/api` für Zugriff und Zusammenarbeit, `apps/worker` für Import und Export; gemeinsame Pakete für Domäne, Voxel, Formate, Transformationen, Generatoren und API-Verträge. Diese Verzeichnisse werden mit funktionierendem Code angelegt; leere Verzeichnisse stellen keine fertige Architektur dar.

Lokaler Viewer und exportierbare Pläne bilden die erste Ausbaustufe. Teamserver, vollständige Weltimporte und Ingame-Synchronisation folgen nach einem geprüften Kern.

## Weiterentwicklung

Als Nächstes Koordinaten-/Voxelvertrag und unabhängige Fixtures umsetzen. Lokale Dokumentationsprüfung: `python3 scripts/check_docs.py`. Die CI prüft Dokumentationslinks und das Längenlimit der GPT-Anweisung. Anwendungstests werden zusammen mit der Anwendung eingeführt.

Eine Projektlizenz ist noch nicht festgelegt. Vor Veröffentlichung fremder Assets, Texturen oder Codebestandteile müssen Nutzungsrechte und Lizenzkompatibilität geprüft werden.
