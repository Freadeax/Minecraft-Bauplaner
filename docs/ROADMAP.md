# Roadmap

P0-01 ist mit der Bestandsaufnahme und Integration dieses Dokumentationsstands bearbeitet. P0-02 und P0-03 sind als interner Voxelvertrag mit unabhängigen handberechneten Fixtures implementiert und lokal geprüft. P1-02/P1-04 haben erste Kernfunktionen; vollständige Profil-/NBT-Regeln, Konfliktauflösung und Oberfläche fehlen. Weitere Pakete sind geplant. Das Repository enthielt zuvor nur eine README. Arbeitspakete erhalten bei Bedarf verknüpfte Issues.

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
| P3-01 | Schem-v3-Writer | P2 | Referenzprüfung und semantischer Roundtrip bestehen (B2 umgesetzt; Spielabnahme offen) |
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

## Umsetzungsnachweise · 27.10.2026

- P0-02 abgeschlossen: [Voxelvertrag](architecture/VOXEL_CONTRACT.md), `packages/voxel/src/types.ts` und `validation.ts`.
- P0-03 abgeschlossen für den internen Vertrag: [synthetische, handberechnete Fixtures](../fixtures/voxel/README.md) und `tests/voxel.test.mjs`. Binäre Referenzdateien gehören zur folgenden Parserabnahme.
- P1-02 teilweise: geometrische Transformationen und begrenzter expliziter Zustandskatalog; BlockEntity-Transformationen melden ungelöste Semantik. Keine vollständige Minecraft-Kompatibilität.
- P1-04 teilweise: Zählung eindeutiger Blockzustände plus separate Luft-/Löschzahlen. P1-04a (B1) umgesetzt: Bauitems aus `resolution.world` mit Vanilla-Katalog, ungelöste/angenommene Zuordnungen sichtbar, Stacks/Shulkerkisten, Tab „Material“. Rohstoffbedarf offen.
- Nächster vollständiger Schritt: P1-01, Schem-v3-Reader mit strukturellen Limits, Abbruch und unabhängigen Binärfixtures.

P1-03 wird verbindlich als statisches GitHub-Pages-Frontend mit Browser-Web-Workers, Repository-Unterpfad und ohne eigene Actions umgesetzt. Pages ist veröffentlicht; siehe [Hosting](architecture/HOSTING.md).

## Detaillierter Ausführungsplan

[IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) konkretisiert P1 bis P7 und ergänzt HP-01 bis HP-04 für statischen Build, Konnektor-Artefakttransport, Pages-Bootstrap und Wiederherstellung. HP-01 bis HP-03 sind für die erste Vorabansicht umgesetzt; Rückkehrprobe/erweiterte Prüfungen bleiben offen. [Konnektor-Runbook](operations/GITHUB_CONNECTOR_RUNBOOK.md) definiert die selbstständige Integration/Veröffentlichung ohne eigene Actions. Eine gekennzeichnete nutzbare Kernansicht kann bereits vor dem vollständigen Parser veröffentlicht werden; sie erfüllt nicht die gesamte P1-03-/P3-Abnahme.

### Erster Webbuild · 27.10.2026

P1-03a implementiert: React-/Three.js-Kernansicht mit eigenem synthetischem Beispiel, Layern, Blockauswahl, geprüften Voxel-JSON-Dateien und Blockmengen. Kein Schem-Import, kein freier Flug. HP-01/HP-02 teilweise umgesetzt: Vite-Unterpfadbuild und SHA-256-Manifest samt Lizenzhinweisen vorhanden, Artefaktübertragung/Pages-Aktivierung und Liveprüfung folgen unmittelbar. Zwei zusätzliche Artefakttests bestehen (insgesamt 45). Vollständige P1-03-/HP-03-/HP-04-Abnahme bleibt bis echter Browser-/Deploymentprüfung offen.

### Live-Abnahme der Vorabansicht

P1-03a: bedienbare synthetische Kernansicht live geprüft (Software-Isometrie, Picking, Layer, Mengen). HP-01/02: statischer Build, Hashmanifest und Artefakttransport implementiert/geprüft. HP-03: Pages-Quelle gh-pages / root im Browser bestätigt und erste Website erreichbar; interner Pages-Deploymentlauf erfolgreich. HP-04: neue Artefaktversion erfolgreich veröffentlicht; Rückkehrprobe noch offen. Echte GPU-/Mobil-/Dateiimportprüfung und die vollständige P1-03-Abnahme bleiben getrennt offen.

## Laufender Schem-Importblock

P1-01a/01b/01c begrenzt implementiert: Big-Endian-NBT/GZip/Sponge v3, unabhängige Python-struct-Binärfixture und Browserworker/-Importbericht. 27 neue Formattests, insgesamt 72 lokale Tests. Original/Quell-NBT bleiben erhalten; nicht dargestellte Zusatzdaten sichtbar. Vollständige P1-01-Abnahme bleibt wegen noch fehlender Referenzwerkzeug-/Spielprüfung teilweise offen. Keine Folgearbeit nach Nutzersteuerung „Block fertig machen und warten“.

Live-Smoke für diesen Block bestanden: synthetische GZip-Schem läuft über Browserworker und ergibt bekannte Koordinaten/Mengen/Quelle. Referenzwerkzeug-/Spielabnahme bleibt offen. Aktive Bearbeitung nach diesem Abschluss auf Nutzeranweisung beendet.

## Fundament B0 und Parallelblöcke · 27.10.2026

P2-01 teilweise: Domänenverträge (Asset, AssetVersion, Instanz, Projekt, Revision), inhaltsadressierte Versionen mit Hashprüfung, Bibliothekssuche und Dateiimport als Bauteil umgesetzt; dauerhafte Speicherung und Backup (B3) umgesetzt: IndexedDB mit Migration, `baseRevision`-Konflikten, Originalen als Blobs und geprüfter Sicherung/Wiederherstellung ([PERSISTENCE](architecture/PERSISTENCE.md)); Reload erhält den Stand (Browserprüfung). P2-02 teilweise: Instanzoperationen mit Undo/Redo, Voxelkonflikte, Duplikate und expliziter Override im Editor; Snap/Anschlüsse in B5 umgesetzt ([CONNECTORS](architecture/CONNECTORS.md)). Weitere Pakete laufen als [Parallelblöcke](BLOCKS.md): B1 → P1-04a, B2 → P3-01, B3 → P2-01, B4 → P3-02, B5 → P2-02, B6 → P1-03c, B7 → P1-02a.

P3-02 (B4) umgesetzt: Bauanleitung aus der aufgelösten Welt mit stabilen Schritt-IDs, Revisionsgrundlage, Koordinatenbereich, Blockzuständen, zyklenfreien Voraussetzungen, Prüfkriterium und manuellem Fortschritt mit Geometriehash; Tab „Bauen“ inkl. Mobilansicht. Details: [GUIDE](architecture/GUIDE.md). Offen: frei definierte Abschnitte, Itemmengen je Schritt (mit B1), Prüfung im Spiel.

B7 · P1-02a umgesetzt: expliziter Zustandskatalog für Drehen/Spiegeln (`packages/voxel/src/states.ts`, [Voxelvertrag](architecture/VOXEL_CONTRACT.md)). Offen für P1-02: Abgleich mit einem echten Registry-Report je Profil und semantische BlockEntity-Adapter.

P1-03c (Block B6) umgesetzt: freier Flug, Drauf-/Seitenansichten, Parallelprojektion, Fokus, Welt-/Lokalkoordinate im Editor-Inspektor, Schichtmodi Bereich/Einzeln, Touchsteuerung, Flächenkulling und Code-Splitting mit dokumentierter Messung ([Viewer](architecture/VIEWER.md)). Offen: echte GPU-/Gerätetests, Blockmodelle.

P6-01 (B8) Konzept 27.10.2026: [Spielbrücke](architecture/MOD_BRIDGE.md) – dünne lesende Mod schreibt eine Ist-Aufnahme als Schem v3, Vergleich und Schrittzuordnung auf der Website, Übertragung per Datei, später optional über 127.0.0.1. Loader, Minecraft-Version und Spielumgebung sind Nutzerentscheidungen; nichts implementiert.

P6-01 (B8) M1 umgesetzt: Spielaufnahme importieren, Zellvergleich je Bauschritt, Abweichungen im Schichtplan, bestätigte Schritte ausdrücklich abhaken. Offen: Fabric-Mod (M2, Minecraft 26.3), Speicherung der Aufnahme, lokale Verbindung (M3), Anzeige im Spiel (M4).

B9 Gebäudekatalog (27.10.2026) umgesetzt: [CATALOG](architecture/CATALOG.md). Offen: Vergleich zweier Gebäude nebeneinander, Varianten/Generatoren mit Parametern (Größe, Holzart), eigene Kategorien verwalten, Vorschaufarben für Stufen/Scheiben (B6-Farbtabelle).

Ausbau offener Punkte (27.10.2026): P3-02 Itemmengen je Schritt umgesetzt (Bauitems je Schritt, Packliste je Schicht, Summe = Materialtab). P1-04a Katalog `vanilla-java-items-v2`. P2-02 Händigkeit für unsymmetrische Profile und Andocken per Ziehen im 3D-Bild umgesetzt ([CONNECTORS](architecture/CONNECTORS.md)). P1-03 Vorschaufarben je Materialfamilie. Offen: Freiraum-Reservierung an Anschlüssen, frei definierte Bauabschnitte, Rohstoffe/Rezepte, Safari/iPhone-Speicherprüfung (braucht echtes Gerät).
