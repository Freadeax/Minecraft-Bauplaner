# Mitarbeiten

Dieses Dokument beschreibt, wie Änderungen an LMNT — Build Studio entstehen, geprüft und veröffentlicht werden. Grundlage sind die [Produktgrundsätze](docs/project/PRINCIPLES.md) und die [Ordnerkarte](docs/STRUKTUR.md).

## Einrichten

```sh
npm run setup           # installiert exakt aus dem Lockfile, aktiviert den pre-push-Hook, baut Kern und Website
npm run setup:browser   # Chromium für die Browsertests
npm run dev             # Planer lokal unter /Minecraft-Bauplaner/
```

Node.js ≥ 22.18 und Python 3 werden vorausgesetzt. Für die Mod zusätzlich JDK 25, siehe [mods/bauplaner-bridge](mods/bauplaner-bridge/README.md).

## Arbeitsablauf

1. **Aufgabe festlegen.** Jede größere Änderung gehört zu einem Arbeitspaket in [`docs/roadmap.json`](docs/roadmap.json) (feste ID wie `TERRAIN-04`) oder zu einem Issue. Status, Teilschritte und nächste Aktion dort pflegen; [ROADMAP.md](docs/ROADMAP.md) und [ROADMAP_HISTORY.md](docs/ROADMAP_HISTORY.md) werden daraus erzeugt und nie von Hand bearbeitet.
2. **Am richtigen Ort ablegen.** Neue Dateien kommen in den Fachordner, den die [Ordnerkarte](docs/STRUKTUR.md) nennt. Verschoben wird nur mit `node scripts/dev/restructure.mjs`, damit Importe und Links mitwandern.
3. **Klein und vollständig liefern.** Ein Arbeitspaket ist eine vertikale Scheibe aus Verhalten, Tests und Dokumentation. Geschäftsregeln gehören in die Pakete unter `packages/`, die Oberfläche bleibt austauschbar.
4. **Prüfen.** `npm run check` und die passenden Browsertests (`npm run test:e2e`) ausführen. Ergebnis, geprüfter Stand und Grenzen in [docs/TESTING.md](docs/TESTING.md) festhalten.
5. **Fortschritt erfassen.** Nach allen Änderungen und vor dem Commit `npm run roadmap:record -- ID-01,ID-02 "Ergebnis und Prüfgrenzen"` ausführen. Das hängt die geänderten Dateien als Ereignis an die Historie an.
6. **Integrieren.** Auf den aktuellen Stand von `main` rebasen, Konflikte fachlich lösen (nicht pauschal eine Seite wählen), erneut prüfen und regulär pushen. Der pre-push-Hook prüft mit `check:roadmap-change`, dass jede geänderte Datei einem neuen Ereignis zugeordnet ist.
7. **Veröffentlichen.** Direkt nach jedem Push auf `main` mit `scripts/publish_pages.sh` die Website veröffentlichen und den Live-Stand prüfen, siehe [Veröffentlichung](docs/operations/VEROEFFENTLICHUNG.md).

## Regeln für Git

- `main` ist die einzige dauerhafte Linie. Arbeitsbranches sind kurzlebig und werden nach der Integration gelöscht.
- Kein Force-Push, kein Umschreiben veröffentlichter Historie, kein Zurücksetzen fremder Arbeit.
- Commit, Push, Veröffentlichung und Mod-Release sind getrennte Schritte und werden getrennt nachgewiesen.
- GitHub Actions werden nicht verwendet; unter `.github/workflows` liegt nichts. Die Dokumentationsprüfung schlägt sonst fehl.

## Fachliche Regeln

- Primär Minecraft Java Edition; jedes unterstützte Versionsprofil ist dokumentiert ([VERSION_PROFILE](docs/architecture/formate/VERSION_PROFILE.md)).
- Asset, unveränderliche AssetVersion, platzierte Instanz und BlueprintRevision bleiben getrennt.
- Ein gemeinsamer Voxel- und Transformationskern für Vorschau, Materialzählung und Export.
- Block-ID, vollständige Properties, NBT-Typen, Ursprung und explizite Luft bleiben erhalten. Unbekannte Zustände werden sichtbar markiert, unbekannte Transformationen sperren den Export.
- Konflikte werden auf Voxelbasis geprüft; ein Begrenzungsquader ist nur ein Vorfilter.
- Keine automatische Weltveränderung als Nebeneffekt von Import, Vorschau oder Live-Abgleich.
- Demo-Daten, Schätzungen und manuelle Ergebnisse sind sichtbar gekennzeichnet.
- Öffentliche Inhalte brauchen Autor, Herkunft und geklärte Rechte ([LICENSING](docs/LICENSING.md)); keine Minecraft-Texturen im Repository.

## Prüfanforderungen

| Änderung | Mindestens |
|---|---|
| Format oder Parser | unabhängige Fixtures und semantischer Roundtrip |
| Transformationen | konkrete Zustandsausrichtungen, vier Vierteldrehungen und doppelte Spiegelung |
| Materialien | Überschneidungen, Varianten, Mehrblockobjekte und Item-Zuordnung |
| Team | parallele Operationen, Berechtigungen, Wiederholung und Wiederverbindung |
| Oberfläche | Desktop- und Touch-Prüfung im Browser |
| Mod | JUnit, Gametest im echten Client und Spielprüfstand, siehe [mods/bauplaner-bridge](mods/bauplaner-bridge/README.md) |

Tests werden nie abgeschwächt, um ein grünes Ergebnis zu erreichen. Nicht ausführbare Prüfungen werden als offen vermerkt.

## Definition of Done

- Verhalten umgesetzt und mit passender Prüfung belegt.
- Fehlerfälle, Kompatibilitätsgrenzen und Berechtigungen berücksichtigt.
- Keine unmarkierten Platzhalter, erfundenen Daten oder unbelegten Erfolgsmeldungen.
- Dokumentation, Roadmap und Prüfstand aktualisiert.
- Keine Zugangsdaten, privaten Welten oder ungeklärten Fremdinhalte eingecheckt.
- Auf `main` integriert und live veröffentlicht.

## Bibliotheksbeiträge

Eigene Bauwerke können über das Formular „Bibliotheksbeitrag“ eingereicht werden. Übernahme mit `npm run library:add -- <datei>`, Ablauf in [CONTRIBUTIONS](docs/architecture/bibliothek/CONTRIBUTIONS.md).
