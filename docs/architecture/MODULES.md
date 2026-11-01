# Modulvertrag und Anwendungsschicht

Stand: 01.11.2026 · ARCH-01. Verbindlicher Aufgabenstand: [Roadmap](../ROADMAP.md).

## Tatsächliche Abhängigkeiten

| Paket | Verantwortung | Darf importieren |
|---|---|---|
| `voxel` | Voxelvertrag, Koordinaten, Validierung, Transformationen, neutraler Aufnahmevertrag | eigene Module |
| `domain` | AssetVersionen, Projekte, Konflikte, Anschlüsse, Materialien, Rezepte, Anleitung, Spielvergleich, reine Revisionsplanung | voxel, eigene Module |
| `formats` | begrenzte NBT-/Schem-/Litematic-Reader und Writer sowie Scanparser | voxel, eigene Module |
| `application` | Exportablauf, Aufnahme-/Originalspeicherung, Repositoryports und portabler Sitzungsspeicher | domain, voxel, formats, eigene Module |
| `apps/web` | React, Three.js, Workerlebensdauer, IndexedDB, Dateidialoge und Downloads | Anwendung/Fachkern/Formatadapter |

`npm run check:architecture` prüft alle TypeScript-Paketdateien einschließlich Type-Imports, Reexports und statisch benannter dynamischer Imports. Fachpakete importieren weder Browseradapter noch React/Three.js oder externe Laufzeitpakete. Die erlaubte Paketmatrix ist azyklisch. Die Prüfung ist keine vollständige Analyse beliebiger Laufzeitcodegenerierung; solche Umgehungen sind unzulässig.

## Konkrete Anwendungsfälle

- `prepareRevisionExport`: aktuelle Geometrie auflösen, Exportblocker prüfen, Revision erzeugen oder wiederverwenden, Datei aus eingefrorenem Stand schreiben. Gibt Projekt und fertige Datei zurück; speichert nichts und löst keinen Download aus. Writerfehler lassen das Eingangsprojekt unverändert.
- `exportRevisionSchem`: bewahrt den bestehenden Namen, schreibt Schem oder Litematic und prüft auch historische Revisionen erneut. Formatwriter befinden sich ausschließlich außerhalb der Domäne. Formatspezifische Einstellungen/Berichte bleiben zunächst typisierte Formatadapterverträge in der Anwendungsschicht; eine neue Writer-Portabstraktion erst bei realem Ersatzbedarf einführen.
- `saveProjectScan` / `loadProjectScanOriginal`: Originalhash, Aufnahmezuordnung und Ausrichtung prüfen; Original und Projektreferenz atomar über `applyBatch` speichern. Kein Browser-/Reactzugriff.
- `Repository`: vorhandene Schnittstelle nach innen verlegt. Kleine Fähigkeiten werden bei Anwendungsfällen über `Pick<Repository, ...>` angegeben. IndexedDB implementiert diesen Vertrag; `MemoryRepository` bleibt portabler, ausdrücklich flüchtiger Fallback.

Die bisherigen Web-Einstiege `app/repository.ts` und `app/scanPersistence.ts` exportieren dieselben Typen/Fehler bzw. Funktionen weiter. Dadurch bleiben bestehende UI-Imports und insbesondere die Identität von `RevisionConflictError` erhalten. Kein Datenformat, Datenbankname, DB-Version oder AssetVersion-Hash wurde wegen der Verlagerung geändert.

## Klare Fachgrenzen

- `domain/revisionExport.ts` enthält nur Profilableitung, Revisionsauflösung und reine Einfrierregeln. Kein Writerimport.
- `voxel/observation.ts` enthält `WorldScan`, `ScanMeta` und den ungeladenen Zellmarker. Parser und Soll/Ist-Vergleich hängen von demselben neutralen Vertrag ab. `formats/scan.ts` reexportiert ihn für bestehende Verbraucher.
- Materialien, Anleitung, Renderer und Export beziehen Geometrie aus derselben Auflösung. Der Renderer ist keine Mengendatenbank.
- UI persistiert die neue Revision weiterhin nach erfolgreicher Dateierzeugung. Speicherfehler werden durch den bestehenden Sitzungsstatus angezeigt; Dateierzeugung allein ist kein Nachweis dauerhafter Speicherung. Eine spätere Export-/Save-Queue-Konsolidierung muss konkurrierende UI-Änderungen gesondert prüfen.

## Nächste Umbauten mit Abnahme

STORE-02 ergänzt Asset-Revisionsschutz samt Migration und UI-Konfliktbehandlung. PERF-01 führt abbrechbare, revisionsgebundene Rechenaufträge ein. Weitere UI-Anwendungsfälle werden einzeln herausgelöst; keine leeren Services und kein zweites Repository-/Koordinatenmodell. Siehe [Roadmap](../ROADMAP.md).
