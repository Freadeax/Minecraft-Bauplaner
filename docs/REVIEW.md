# Strukturierte Bestandsprüfung · 27.10.2026

Prüfgrundlage: Repositoryregeln, README, STATUS, ROADMAP, COMMUNICATION, Architekturentscheidungen, vorhandener Code und lokale Prüfbefehle. Keine pauschale Vollabnahme aller geplanten Systeme. Der laufende Ausbau umfasst ausschließlich den begrenzten Schem-v3-Reader und seine Browserintegration.

| Punkte / Anforderungen | Aktueller Befund | Weiterer Bedarf |
|---|---|---|
| Import R-001 | Begrenzter GZip-/NBT-/Sponge-v3-Reader, Zustände und Originaldaten erhalten; unabhängige synthetische Binärtests | echter Referenzwerkzeugexport und Spielabnahme |
| Weitere Formate R-002/003 | eigene spätere Adapter geplant | Litematic/selektiver Weltimport nicht implementiert |
| Ansicht R-004/005/006 | Orbit/Zoom, Picking, X/Y/Z-Schichten und Mengen; Softwareansicht ohne WebGL | freier Flug, vollständige Blockmodelle, echte GPU-/Touchprüfung |
| Aufgaben R-007 | Bauanleitung mit Schichtschritten, Voraussetzungen, manuellem Fortschritt und „prüfbedürftig“ bei Geometrieänderung (B4) | Team-Aufgaben/Zuweisung (P4-02), Prüfung im Spiel (P6-01), frei definierte Bauabschnitte |
| Bibliothek R-008/024 | Assets mit Herkunft/Lizenzfeld, Tags, Suche, unveränderliche Versionen mit Hashprüfung, Import als Bauteil (B0), Anschluss-Editor und Bereich als Bauteil (B5) | dauerhafte Speicherung (B3) |
| Snap/Composer R-009/011/013 | Editor mit Instanzen, Transformationen, Undo/Redo, Voxelkonflikten und Override (B0); Anschlussvalidierung, deterministischer Snap, gespeicherte und geprüfte Verbindungen (B5) | Spiegelprofile, Freiräume an Anschlüssen, Ziehen im Viewer |
| Transformation R-010 | Rastergeometrie und kleiner geprüfter Zustandkatalog | unbekannte Regeln und BlockEntity-NBT bleiben ungelöst |
| Generatoren/Fundamente R-012/014 | segmentierte Generatoren und Terrainprüfung geplant | keine Generator-/Terrainimplementierung |
| Updates R-015 | Versionen einfrieren und Diff geplant | kein Update-/Patchsystem |
| Team/API R-016/019 | separate serverseitige Rechte-/Operationsarchitektur geplant | kein Teamdienst, kein Login-/Rechtesystem |
| Materialien R-017 | platzierte Zustände/Luft/Löschen getrennt; Bauitems mit Mehrblock-, Stufen-, Anzahl- und Wandregeln, Stack-/Shulkerbedarf, Konflikte als vorläufig markiert (B1) | Rohstoffe/Rezepte, Bindung an exakte Spielversion |
| Lager/Spiel R-018/020 | spätere explizite Adapter geplant | keine Spielverbindung oder Weltänderung |
| Themes R-021 | kompatibilitätsgeprüfte Mappings geplant | keine Themeumsetzung |
| Export R-022 | Schem-v3-Writer aus eingefrorener Revision, Exportsperre, reproduzierbare Datei mit SHA-256, unabhängiger Python-Leser und Roundtrip (B2) | echte WorldEdit-/Spielabnahme, DataVersion-/Registryprüfung |
| Lokale Projekte R-023 | lokale Dateiverarbeitung ohne Upload; IndexedDB-Projektspeicher mit Revisionskonflikt, Originale als Blobs, Sicherungsformat mit Prüfsummen und konfliktsicherer Wiederherstellung (B3) | keine Synchronisierung zwischen Geräten; Safari-/iPhone-Speicherverhalten ungeprüft |
| Ehrlicher Status R-025 | Grenzen, Importberichte und echte Prüfungen ausgewiesen | ältere widersprüchliche Statusabsätze bereinigt |
| Git/Pages | Mainfreigabe, geprüfte lokale Builds, gh-pages/Manifest/Liveprüfung | kein eigener Actions-Workflow; kein Monitor für fremde Pushes |

Die neue Formatfunktion wird durch den gemeinsamen Voxelvertrag validiert. Mengen/Koordinaten stammen nicht aus KI-Text oder sichtbaren Meshes. Nicht unterstützte Daten werden getrennt erhalten oder ausdrücklich abgewiesen. Keine Umgehung von Qualitätsprüfungen, keine automatische Weltveränderung.

Nach Nutzersteuerung wird dieser laufende Block vollständig geprüft, dokumentiert und veröffentlicht. Danach endet die aktive Bearbeitung; es startet kein weiteres Arbeitspaket und kein Hintergrundprozess.
