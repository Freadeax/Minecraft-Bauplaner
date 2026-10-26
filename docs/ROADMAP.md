# Roadmap

P0-01 ist mit der Bestandsaufnahme und Integration dieses Dokumentationsstands bearbeitet. Die weiteren Implementierungspakete sind geplant. Das Repository enthielt zuvor nur eine README. Arbeitspakete erhalten bei Bedarf verknüpfte Issues.

| ID | Paket | Abhängigkeit | Abnahme |
|---|---|---|---|
| P0-01 | Repository prüfen und Grundregeln integrieren | Zugriff | Vorhandene Dateien geprüft, Regeln widerspruchsfrei, Status aktuell |
| P0-02 | Koordinaten- und Voxelschema | P0-01 | Grenzen, Pivot, NBT-Typen, Luftsemantik dokumentiert |
| P0-03 | Unabhängige Testfixtures | P0-02 | Bekannte Zustände, Richtungen und erwartete Mengen |
| P1-01 | Schem-v3-Reader | P0-03 | Valide Fixtures korrekt, beschädigte Dateien begrenzt abgewiesen |
| P1-02 | Voxel-/Transformationskern | P0-03 | Geometrie und Properties korrekt transformiert |
| P1-03 | Viewer, Orbit, Flug, Layer, Picking | P1-01/02 | Ausgewählte Welt-/Lokalkoordinate und Slice stimmen |
| P1-04 | Materialanalyse | P1-01/02 | Bekannte Mengen, ungelöste Item-Zuordnungen sichtbar |
| P2-01 | Asset-Versionen und lokale Projekte | P1 | Reload erhält reproduzierbaren Stand |
| P2-02 | Composer, Snap, Kollision, Undo | P2-01 | Verbindungs- und Voxelregeln bestehen Tests |
| P3-01 | Schem-v3-Writer | P2 | Referenzprüfung und semantischer Roundtrip bestehen |
| P3-02 | Bauabschnitte, Anleitung, Aufgaben | P2 | Schritte referenzieren konkrete Geometrie/Revision |
| P3-03 | Erste nutzbare Fassung | P3-01/02 | Datei → planen → exportieren → nachbauen durchgängig |
| P4-01 | API, Konten, Rechte, Payloadspeicher | P3 | Keine fremden Projektzugriffe, Wiederherstellung geprüft |
| P4-02 | Gemeinsame Operationen und Tasks | P4-01 | Parallele Änderungen und Reconnect ohne stillen Verlust |
| P5-01 | Litematic-Adapter | P3 | Mehrregionen und Versionsgrenzen geprüft |
| P5-02 | Themes und parametrische Module | P2/P3 | Reproduzierbare Erzeugung und Zustandsprüfung |
| P5-03 | Updates, Versionsdiff, lokale Patches | P4 | Folgen vor Update sichtbar; Einfrieren und Rückkehr möglich |
| P6-01 | Ein festgelegter Spieladapter | P4/P5 | Planlieferung idempotent bestätigt; kein Weltsetzen |
| P6-02 | Optionale Discord-/Lageranbindung | P4/P6-01 | Zeit/Herkunft der Daten und Berechtigungen sichtbar |
| P7-01 | Weltimport und große Projekte | P5 | Bereichsimport mit Limits und dokumentiertem Lasttest |

Die erste Fassung schließt P0 bis P3 ein. Backend kann früher eingeführt werden, wenn bestehender Repository-Code es rechtfertigt; daraus folgt keine parallele Neukonstruktion. Keine unbegründeten Fertigstellungstermine festlegen.
