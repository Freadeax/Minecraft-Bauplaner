# Anforderungsregister

Priorität: M = Kern, S = Folgeausbau, L = Langfristig. Status: Übersicht der Anforderungen; Implementierungsnachweise und verbleibende Grenzen stehen in REVIEW.md und STATUS.md. Die Tabelle ist keine pauschale Fertigmeldung. Nach Implementierung Beleg als Datei/Test/Issue ergänzen.

| ID | Anforderung | Priorität | Roadmap |
|---|---|---|---|
| R-001 | Schem-Import mit vollständigen Zuständen | M | P1-01 |
| R-002 | Litematic einschließlich mehrerer Regionen | S | P5-01 |
| R-003 | Selektiver Weltimport | L | P7-01 |
| R-004 | Browser-3D und freier Flug | M | P1-03 |
| R-005 | Ganzzahlige Layer und Schnitte | M | P1-03 |
| R-006 | Auswahl, Block-/Modulfilter und Inspektor | M | P1-03/P2-02 |
| R-007 | Aufgaben, Guides und manuelle Fortschritte | M | P3-02 |
| R-008 | Metadaten, Suche, Tags und Versionen | M | P2-01 |
| R-009 | Semantische Konnektoren | M | P2-02 |
| R-010 | Drehen, Spiegeln und lokaler Override | M | P1-02/P2-02 |
| R-011 | Composer mit Raster und Undo | M | P2-02 |
| R-012 | Start-/Loop-/Endgeneratoren und Ecken | S | P5-02 |
| R-013 | Voxelkonflikte und deklarierte Freiräume | M | P2-02 |
| R-014 | Geländeabhängige Fundamentprüfung | S | P5-02/P7-01 |
| R-015 | Instanzupdates, Diff und Version einfrieren | S | P5-03 |
| R-016 | Teamrechte, gemeinsame Aufgaben und Konflikte | S | P4 |
| R-017 | Materialbedarf getrennt von Item-/Rohstoffbedarf | M | P1-04 |
| R-018 | Lagerprüfung und Fehlbestände | S | P6-02 |
| R-019 | REST, Ereignisse und signierte Webhooks | S | P4/P6-02 |
| R-020 | Serverplan-Sync und spätere Client-Overlays | L | P6-01 |
| R-021 | Nichtdestruktive Themes | S | P5-02 |
| R-022 | Reproduzierbarer Schem-Export | M | P3-01 |
| R-023 | Lokaler Entwurf, privates Speichern | M | P2-01 |
| R-024 | Abhängigkeiten, Herkunft und Lizenz | M | P2-01 |
| R-025 | Sichtbare Grenzen und echte Prüfergebnisse | M | alle |

Neue Anforderungen erhalten stabile IDs, Nutzen, Abnahme und Abhängigkeiten. Widersprüche werden dokumentiert und entschieden, nicht still umgedeutet. Nicht unterstützte Features werden in der Oberfläche nicht als fertig angeboten.

Aktueller Nachweis R-001: packages/formats/src, unabhängige fixtures/schem, tests/schem.test.mjs und Importworker/-Bericht. Begrenzte Sponge-v3-Unterstützung, keine allgemeine Versionsfreigabe. [Importvertrag](architecture/SCHEM_IMPORT.md).

Nachweis B0 (27.10.2026): R-008 teilweise (Metadaten, Tags, Suche, Versionen in `packages/domain/src/library.ts`), R-010/R-011/R-013 teilweise (Instanztransformationen, Override, Undo/Redo, Voxelkonflikte in `project.ts`/`compose.ts`, Editor), R-024 teilweise (Herkunft/Nutzungsrechte je Asset, inhaltsadressierte Versionen). Tests: `tests/domain.test.mjs`, `tests/e2e/app.e2e.mjs`. Offene Teile siehe [Blockplan](BLOCKS.md).

Nachweis B3 (27.10.2026): R-023 umgesetzt für lokalen Browserspeicher (IndexedDB, Revisionskonflikte, Sicherung/Wiederherstellung; [PERSISTENCE](architecture/PERSISTENCE.md)), R-024 teilweise (Sicherung nimmt Herkunft, alle Versionen verwendeter Bauteile und Originale mit; Wiederherstellung prüft Vollständigkeit). Tests: `tests/backup.test.mjs`, `tests/e2e/persistence.e2e.mjs`.
