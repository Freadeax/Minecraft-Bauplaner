# Eigene Sammlungen und Vorlagen (LIB-02, LIB-03 · Block B17)

Stand 01.11.2026. Code: `packages/domain/src/catalog/collections.ts` (fachliche Regeln, Prüfung, Revisionen), Speicher `apps/web/src/app/idbRepository.ts` (Migration 3) und `packages/application/src/memoryRepository.ts`, Sicherung `packages/domain/src/data/backup.ts`, Oberfläche `apps/web/src/views/library/` (`CollectionsPage`, `TemplatesPage`, `CollectionPicker`, `userLibrary`, Generatorvorlagen in `GeneratorsPage`). Tests: `tests/collections.test.mjs`, `tests/e2e/collections.e2e.mjs`, Migration v2→v3 in `tests/e2e/asset-concurrency.e2e.mjs`.

## Grundsatz: eine Bibliothek

Katalog und eigene Inhalte bleiben **dieselbe** Bibliothek. Eine Sammlung kopiert nie Geometrie, sie verweist nur:

| Eintrag | Verweis | Verhalten |
|---|---|---|
| Gebäude/Bauteil | `assetId`, optional `versionId` | ohne Version: folgt der neuesten Version; mit Version: genau diese bleibt festgehalten („neuere Version vorhanden“ wird angezeigt) |
| Ensemble | `ensembleId` (mitgeliefert) | Vorschau wie Ensembleseite |
| Vorlage | `templateId` (eigene Vorlage) | Link zur Vorlage |

Fehlende Ziele (gelöschtes Bauteil, fehlende festgehaltene Version, gelöschte Vorlage) bleiben sichtbar mit Grund und werden nie still entfernt. Im Katalog filtert „Sammlung“ (URL `?sammlung=<id>`) die Übersicht auf die Gebäude der Sammlung samt Unterordnern; eine noch ladende oder nicht mehr vorhandene Sammlung zeigt keine Einträge statt des ganzen Katalogs.

## Ordner und Kategorien

- `parentId` bildet Unterordner (höchstens 4 Ebenen, keine Zyklen; `moveProblem` erklärt, warum ein Verschieben nicht geht). Ein Datensatz mit fehlendem Oberordner oder Zyklus erscheint auf oberster Ebene statt zu verschwinden.
- `category` ist freier Text (bis 60 Zeichen); die Seitenleiste gruppiert oberste Ordner danach, „Ohne Kategorie“ zuletzt.
- Archivieren blendet aus, löscht nichts. Löschen entfernt nur den Ordner; direkte Unterordner rücken in derselben Transaktion eine Ebene nach oben.

## Vorlagen

- **Ensemblevorlage:** Bauteile mit fester `assetVersionId`, diskreter Transformation (`position`, Vierteldrehung, Spiegelung), Vorrang-Kennzeichen und Verbindungen (über Mitglieds-IDs `m1…`). Quellen: Projekt („Projekt als Vorlage“), mitgeliefertes Ensemble („Als eigene Vorlage speichern“, heutige Versionen werden festgehalten, Anordnung identisch zu „Als Projekt anlegen“), Duplikat.
- **Generatorvorlage:** nur `GeneratorSource` (Generator-ID, Algorithmusversion, normalisierte Parameter), keine Geometrie. Öffnen über `#/bibliothek/generatoren/<gen>!<templateId>`; „aktualisieren“ ersetzt die Werte. Ist der Generator inzwischen in neuerer Version, wird das ausdrücklich angezeigt.
- **Projektübernahme** (`createTemplateProject`) erzeugt ein neues Projekt mit neuen Instanz-/Verbindungs-IDs und denselben Versionen. Das Projekt ist eine Kopie: spätere Vorlagenänderungen überschreiben kein übernommenes Projekt (Abnahmekriterium LIB-03, Node- und Browsertest vergleichen das gespeicherte Projekt vor/nach der Änderung). Fehlt eine feste Version, wird nichts angelegt.
- **Bearbeiten/Wiederherstellen:** Jede inhaltliche Änderung erhöht `number` („Stand“) und legt den vorherigen Stand im Verlauf ab (höchstens 20, älteste zuerst verworfen). „Wiederherstellen“ macht einen früheren Stand als neuen Stand aktuell; der ersetzte bleibt im Verlauf. Inhalte bearbeiten: Bauteil entfernen oder „Inhalt aus Projekt übernehmen“ (Vorlage als Projekt anlegen → im Editor ändern → übernehmen). Löschen erst nach Archivieren; Verweise in Sammlungen werden in derselben Transaktion entfernt.

## Speicher

- IndexedDB `DB_VERSION = 3`: Migration 3 legt die Stores `collections` und `templates` (Schlüssel `id`) an; bestehende Stores bleiben unverändert.
- Revisionen wie bei Bauteilen: eingehende `revision` ist die erwartete gespeicherte Basis (0 = neu), gespeichert wird Basis + 1; sonst `LibraryRecordConflictError` und der ganze Batch schreibt nichts. Löschen (`removeCollections`/`removeTemplates`) prüft ebenfalls die Revision. Prüfung aller Datensätze (`checkCollectionRecord`, `checkTemplateRecord`) vor jedem Lesen/Schreiben.
- Andere Tabs erhalten `StorageChange { kind: 'userLibrary' }` und laden neu.

## Sicherung

- Vollsicherungen („Alles sichern“) enthalten Sammlungen und Vorlagen sowie alle Bauteile, deren Versionen Vorlagen oder Sammlungen festhalten (auch mitgelieferte). Projektsicherungen bleiben ohne eigene Bibliothek.
- Format 2 wird nur geschrieben, wenn Sammlungen/Vorlagen enthalten sind; dann gehören beide Listen in die Prüfsumme. Ohne sie bleibt die Datei Format 1 mit unveränderter Prüfsummenberechnung, ältere App-Versionen lesen sie weiter. Format-1-Dateien mit Sammlungsfeldern werden abgelehnt.
- Wiederherstellung: neu → anlegen; identisch → überspringen; lokal abweichend → lokale Fassung bleibt, die Sicherung wird als Kopie „(Wiederhergestellt <Datum>)“ angelegt.

## Grenzen

- Sammlungen verweisen nur auf Gebäude, Ensembles und Vorlagen, nicht auf Projekte.
- Ensemblevorlagen speichern keine Baustellenplanung, keinen Fortschritt und keine Revisionen des Quellprojekts.
- Kein Teilen zwischen Personen (TEAM-Aufgaben); Austausch nur über Sicherungsdateien.
