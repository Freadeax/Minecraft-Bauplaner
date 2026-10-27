# Vollständiger Umsetzungsplan für den Minecraft-Bauhelfer

Stand: 27.10.2026. Ergänzt die [Gesamtspezifikation](architecture/SPECIFICATION.md), ohne geplante Systeme als fertig auszugeben. Verbindliche Quellen sind [Roadmap](ROADMAP.md), [Anforderungen](REQUIREMENTS.md), [Voxelvertrag](architecture/VOXEL_CONTRACT.md) und [Konnektorablauf](operations/GITHUB_CONNECTOR_RUNBOOK.md).

## 1. Ziel und vorhandene Grundlage

Der erste baubare Kreislauf lautet: eigenes Bauwerk importieren → in 3D prüfen → Bauteile speichern → Instanzen zusammensetzen → Konflikte lösen → Materialien und Schritte berechnen → Plan exportieren → lokal weiterarbeiten. Das Frontend läuft auf GitHub Pages. Browserberechnungen und lokale Projekte funktionieren ohne Konto oder Pflichtbackend.

Vorhanden und lokal geprüft: TypeScript-Voxelvertrag, unveränderliche validierte Snapshots, diskrete Geometrie, kleiner expliziter Zustandskatalog, X/Y/Z-Auswahl, getrennte Block-/Luft-/Löschzählung sowie 43 interne Tests. Schem-Dateiparser, Weboberfläche, Datenbank, Exporter und Deploymentwerkzeuge existieren noch nicht.

Kein allgemeines Minecraft-/Modpackversprechen. Das erste tatsächliche Profil wird aus einer unabhängig erzeugten Referenzdatei und deren DataVersion abgeleitet und exakt dokumentiert. Der unbekannte Modblock bleibt erhalten und sichtbar. Der Hafen wird erst nach Dateiprüfung als Pilot übernommen.

## 2. Module und Verantwortlichkeiten

| Bereich | Geplante Aufgabe | Datenhoheit |
|---|---|---|
| `apps/web` | React-Oberfläche, Routen, Viewer, Bauansicht | nur Bedien-/Ansichtszustand |
| Browser-Worker in `apps/web` | Parser, Meshing, Export, Abbruch | versionierte Jobnachrichten |
| `packages/voxel` | Raster, Grenzen, Snapshot, gemeinsame Geometrie | kanonische Zellen/Zustände |
| `packages/formats` | begrenztes NBT, Schem-Reader/Writer, später Litematic | Adapter, keine UI-Regeln |
| `packages/domain` | Asset/Version, Instanz, Revision, Patch, Konnektor | fachliche Identitäten |
| `packages/contracts` | Job-/Projekt-/Sicherungsformate | validierte Austauschverträge |
| spätere Generatorpakete | deklarierte Start-/Loop-/Endregeln | deterministische Eingaben/Ergebnisse |
| lokale Persistenzschicht | IndexedDB, Migration, Backups | atomare Speicherung |
| späterer Teamdienst | Rechte, gemeinsame Revisionen, Payloadspeicher | serverseitige Autorität |

Neue Verzeichnisse entstehen mit funktionierendem Code. Keine zweite Transformationslogik im Renderer, keine Zählung aus Meshes. Abhängigkeiten werden erst bei Einführung versionsgenau gewählt und überprüft; keine unbestätigten Paketversionen im Plan festschreiben.

## 3. Durchgehende Oberflächenstruktur

Projektzentrale zeigt lokale Projekte mit Profil, Revision, letzter Änderung und Sicherungsstatus. Bibliothek zeigt Assets mit Herkunft, Version, Abmessungen und Nutzungsrechten. Editor verbindet Projektbaum, 3D-Fläche, Eigenschaften und Layer. Bauansicht reduziert auf aktuellen Schritt, Koordinaten, Material und Fortschritt. Nicht implementierte Funktionen erscheinen nicht als aktive Schaltflächen.

Desktop: Orbit und freier Flug, Mausfreigabe mit Escape, Fokus auf Auswahl, Koordinatenkreuz und Inspektor. Tastenkürzel sind in Textfeldern deaktiviert. Mobil: Touch-Orbit, Schichten, Materialien und Aufgaben; anspruchsvolle Komposition zuerst Desktop. Fehler haben Ursache und mögliche nächste Handlung. Farbe wird immer durch Text/Symbol ergänzt.

Importdialog: Dateiauswahl → strukturelle Prüfung → Profil/Palette und Warnungen → Vorschau → bewusste Übernahme. Abbruch verwirft vorläufige Jobs. Kein Import veröffentlicht das Bauwerk oder verändert eine Spielwelt.

## 4. Arbeitspakete bis zur ersten veröffentlichten Kernansicht

Alle folgenden Pakete sind geplant. IDs erweitern die bestehende Roadmap; die Abnahme ist jeweils vollständig lokal durch den Agenten auszuführen.

| ID | Abhängigkeit | Ergebnis | Abnahme |
|---|---|---|---|
| P1-01a | P0 | binärer NBT-Leser mit Byte-/Tiefe-/Knoten-/Zeitbudget | unabhängige valide und beschädigte Binärfixtures; int64 und Abbruch ohne Teilresultat |
| P1-01b | 01a | Sponge Schem v3-Reader | Dimensions-/Paletten-/VarInt-/Indexregeln gegen Originalspec geprüft; Referenzdatei semantisch korrekt |
| P1-01c | 01b | Workerjob mit Fortschritt/Abbruch | keine Hauptthreadblockade durch Parser; abgebrochene/veraltete Antworten werden ignoriert |
| P1-02a | Reader | benötigte Zustands-/NBT-Adapter | konkrete Richtungen/Mehrblockfälle geprüft; Unbekanntes bleibt Exportblocker |
| P1-03a | Kern | statische Web-App mit nutzbarer Kernansicht | vorhandene interne Fixture klar als Demo, Layer/Koordinaten/Mengen bedienbar; Unterpfad/Reload geprüft |
| P1-03b | 03a,01c | Schem-Datei → Worker → 3D | eigenes Referenzbauwerk mit vollständigem Bericht; Importfehler sichtbar |
| P1-03c | 03b | Orbit/Flug/Picking/Filter | lokale und Weltzelle stimmen bei Drehung/Spiegelung; Touchbedienung geprüft |
| P1-04a | Reader,Kern | Zustandsmengen und ungelöste Itemregeln | keine 1:1-Annahme bei Türen, Betten, Doppelstufen und Flüssigkeiten |
| HP-01 | 03a | reproduzierbarer statischer Webbuild | nur erlaubte Artefakte, `.nojekyll`, Repository-Unterpfad, lokal ladbare Module/Worker |
| HP-02 | HP-01 | Manifest und Konnektor-Uploadplan | SHA-256/Dateiliste/Sourcecommit korrekt, Binärblobs base64, Tree vollständig |
| HP-03 | HP-02 | Pages-Bootstrap und erste Veröffentlichung | Quelle bestätigt, Konto erlaubt Betrieb, echte URL liefert passenden Manifeststand |
| HP-04 | HP-03 | Update-/Rückkehrprobe | neuer Main-Stand live nachgewiesen; vorheriges Artefakt per neuem Commit wiederherstellbar |

P1-03a darf mit synthetischer Fixture vor dem Parser fertig werden, damit früh eine echte bedienbare Vorschau verfügbar wird. Sie ist eine gekennzeichnete Vorabansicht und erfüllt noch nicht P1-03 insgesamt oder den baubaren Import-/Exportkreislauf. Sobald sie fertig ist, unmittelbar veröffentlichen; nicht auf Teamserver oder den gesamten Langfristumfang warten. Parserentwicklung bleibt das nächste Kernpaket, kann aber nicht als Grund dienen, einen bereits geprüften Webbuild zurückzuhalten.

### Format- und Workerregeln

Reader prüft komprimierte und entpackte Größe, NBT-Tiefe, Volumen, Palette, Blockdatenlänge, Indizes und begrenzte Bearbeitungszeit vor Übernahme. Maßgeblich ist die originale Sponge-Spezifikation; keine Formatannahmen aus Endung oder Beispiel-JSON. Originalbytes und normalisierte Daten erhalten getrennte Hashes. Nicht darstellbare NBT-Sonderwerte, Entities oder Biome erfordern eine Vertragserweiterung vor Verlust; andernfalls Import mit nachvollziehbarem Bericht ablehnen.

Jobvertrag: `jobId`, Jobtyp, Vertragversion, Eingabeprofil, Limits, Phase, Fortschritt, Ergebnisreferenz, Warnungen, Fehlercode und Abbruch. Fortschritt unbekannter Dauer darf unbestimmt sein. Nachrichten enthalten keine vorgetäuschten Prozentwerte. Bufferübertragung darf kein weiterhin benötigtes Original unbemerkt entkoppeln. Große Ergebnisse chunkweise verarbeiten; endgültige Übernahme atomar.

## 5. Bibliothek, lokale Projekte und Composer

P2-01 wird in drei vollständige Schritte zerlegt: Domänenverträge → atomare Persistenz → Bibliotheksbedienung. Asset trägt dauerhafte Identität, Herkunft, Lizenz und Archivstatus. AssetVersion ist unveränderlich mit Payloadhash, Profil und Konnektoren. Projektinstanz verweist auf feste Version plus diskrete Transformation und expliziten Override. BlueprintRevision friert Instanzen und Patchbezüge ein. Ein Versionswechsel ist eine Operation, keine Änderung am Bibliotheksoriginal.

IndexedDB hält Manifeste und Blobs in einer transaktional geplanten Struktur. Hashprüfung vor Übernahme; Quota-/Speicherfehler zeigen fehlgeschlagene Speicherung, nicht Erfolg. Migrationen besitzen SchemaVersion und Wiederherstellungsweg. Zwei Tabs dürfen denselben Projektstand nicht still überschreiben: Basisrevision prüfen und Konflikt anzeigen. Lokale Speicherung bleibt als lokal bezeichnet; portables Backup ist ein eigener Benutzerbefehl. Server-Synchronisation wird erst nach Bestätigung als synchronisiert gemeldet.

Sicherungsformat enthält Manifest, feste Versionen, referenzierte Payloads und Hashes; reine Vorschaumeshes reichen nicht. Wiederherstellung prüft Pfade, entpackte Größe, Vollständigkeit und Hashes und übernimmt erst danach atomar. Importiertes Projekt überschreibt kein gleichnamiges Original ohne ausdrückliche Zuordnung.

P2-02 folgt: Instanz platzieren/verschieben/drehen/spiegeln → Voxelkonflikte → Snap → Undo/Redo. AABB nur Vorprüfung; gleicher Zustand ist Duplikat, anderer Zustand Konflikt. Reservierter Freiraum ist von Luft getrennt. Standard löst nichts still per Reihenfolge. Material zählt erst die eindeutig aufgelöste Weltzelle.

Konnektorvertrag speichert Position im Grenzraum, Normale, Up, Typ, Profil, Querschnitt und Nutzungsgrenze. Kandidaten müssen Profil, Orientierung, Belegung und resultierendes Integergitter bestehen. Toleranz und Tie-Breaker deterministisch. Fundament ohne Terrain lautet ungeprüft. Undo bezieht sich lokal auf eigene Operationen; spätere Teamgegenoperation braucht Revisionsprüfung.

Abnahme: zwei Assets verbunden ohne unerklärte Überlappung, Projektbackup/Reload reproduziert Versionen, Transformationen und Aufgaben, ursprüngliches Asset unverändert. Tests umfassen zwei Tabs und Speicherabbruch.

## 6. Export, Materialbedarf und Bauanleitung

P3-01: fixierte Revision auflösen → Transformation/Overrides/Themes anwenden → Konflikte prüfen → Profil und Block-/NBT-Regeln prüfen → Palette neu aufbauen → Schem v3 schreiben → mit unabhängiger Referenz und eigenem Reader prüfen. Reader/Writer-Roundtrip allein ist kein unabhängiger Nachweis. Originale bleiben erhalten; Exportbericht nennt Zielprofil, offene Daten und alle angewendeten Entscheidungen. Ungeklärte Regeln blockieren den baubaren Export.

P1-04/P3-Mengen: platzierte Zustände, Bauitems, Rohstoffe und Lager getrennt. Itemmapping aus dem exakten Profil; Mehrblockobjekte nur einmal als Bauitem, Doppelstufen nach geprüftem Mapping, unbekannte Moditems ungelöst. Vollprojekt und aktuelle Auswahl werden eindeutig beschriftet. Kein unvollständiger Bedarf als vollständige Einkaufsliste.

P3-02: Bauabschnitt → Instanz → Schritt mit stabiler ID, Revision, Koordinaten, Layerbereich, Material, Voraussetzungen und Prüfkriterium. Geometrische Layerreihenfolge funktioniert deterministisch; semantische Gruppen benötigen Bestätigung. Abhängigkeiten dürfen keine Zyklen haben. Geänderte Geometrie setzt betroffene Abnahmen auf prüfbedürftig. Manuell abgehakt ist getrennt von im Spiel geprüft. KI formuliert Texte; Mengen/Koordinaten werden berechnet.

P3-03 ist erst erfüllt, wenn eine echte Datei importiert, zusammengesetzt, gesichert, exportiert und anhand der erzeugten Schritte nachbaubar ist. Eine schöne Demovorschau allein erfüllt das nicht.

## 7. Team, weitere Formate und Spielanbindung

P4 wird erst nach lokalem baubarem Kreislauf produktiv. Dienstanbieter, Kosten und konkrete Einrichtung sind noch offen. Das Pages-Frontend bleibt unabhängig. Server prüft Projekt-/Assetrechte und Downloadzugriffe, speichert Payloads dauerhaft und bestätigt Operationen mit `operationId` und `baseRevision`. Wiederholung erzeugt keine Duplikate, alte Revisionen keine stillen Überschreibungen. Wiederverbindung mit Konfliktanzeige und transaktionale Ereigniszustellung gehören zur Abnahme.

P5-01 Litematic ist ein separater Adapter mit Mehrregionen, vorzeichenbehafteten Größen, Ursprüngen und originalen Referenzdateien. P5-02 Themes prüfen Zustand und BlockEntity-Kompatibilität; Generatoren speichern Version, Eingaben, Seed und Start-/Loop-/Endmodule. Keine beliebige Meshskalierung als Minecraft-Export. P5-03 Versionsdiff zeigt Geometrie, Mengen, Verbindungen, lokale Patches und Aufgaben vor gezieltem Update; eingefrorene Versionen bleiben verfügbar.

P6 beginnt mit genau einem dokumentierten Paper-, Fabric- oder NeoForge-Adapter. Erst Planlieferung/Bestätigung; Clientoverlay separat. Weltsetzen bleibt ein eigener ausdrücklich beauftragter Modus mit Rechten, Dry-Run, Budget, Sicherung und Konfliktprüfung. Keine beliebige Fernkonsole. Lagerstände haben Quelle und Zeitpunkt. Discord-Nachrichten nur im ausdrücklich beauftragten Funktionsumfang.

P7 importiert ausgewählte Bereiche konsistenter Weltsicherungen. Chunkweises Laden, Meshing und Speicherbudget werden erst mit benanntem Hardware-/Browserszenario freigegeben. Keine Komplettwelt ungefragt laden.

## 8. Qualität, Kompatibilität und Fertigstellung

Jedes Paket liefert implementiertes Verhalten, unabhängige Erwartungswerte, Fehlerfälle, passenden lokalen Prüflauf und aktualisierte Dokumentation. Leistungsziele aus der Gesamtspezifikation sind Messziele; keine bisherigen Messergebnisse. Browsermatrix: ein dokumentierter Desktopbrowser und iPhone/Safari für die mobile Bauansicht; konkrete Versionen und Geräte erst bei tatsächlicher Prüfung eintragen.

Berechtigungen, unbekannte Daten, Abbruch, Speicherfehler und parallele Änderungen gehören zu den jeweils betroffenen Paketen. Automatische Weltänderungen und öffentliche Uploads sind nie Importnebeneffekte. Ressourcenpakete/Texturen nur mit geklärten Nutzungsrechten. Keine Werbung mit nicht vorhandener Unterstützung.

Nach jedem Main-Update unmittelbar den [Konnektor-Veröffentlichungsablauf](operations/GITHUB_CONNECTOR_RUNBOOK.md) ausführen. Erfolg getrennt berichten: implementiert, lokal geprüft, main integriert, Artefakt übertragen, live bestätigt. Ohne bestätigte Pages-Konfiguration und Webbuild lautet der aktuelle Abschluss weiterhin: Main aktuell, Pages nicht veröffentlicht.
