# Asset-Revisionsschutz · STORE-02

## Vertrag und atomare Schreibgrenze

`Asset.revision` ist eine additive lokale Speicherrevision, getrennt von unveränderlichen AssetVersionen. Neue Bauteile beginnen bei 0; bei `saveAsset` oder `applyBatch` ist der gelesene Wert die erwartete Basis. Der Speicher liest den aktuellen Datensatz und schreibt nur bei gleicher Basis `revision + 1`. Eine unbekannte ID benötigt Basis 0. Keine Zeitstempelvergleiche und kein automatisches Zusammenführen. `updateAssetMeta` und `addAssetVersion` behalten die Basis, bis der Speicher erfolgreich schreibt.

`AssetRevisionConflictError` nennt Bauteil-ID, gespeicherte und erwartete Revision. Das UI zeigt den Fehler statt Erfolg. Die Eingangsobjekte bleiben unverändert; nach erfolgreicher Speicherung wird die Bibliothek erneut gelesen. MemoryRepository und IndexedDB verwenden dieselbe CAS-Entscheidung in der Anwendungsschicht. Speichergrenzen kopieren Eingaben/Rückgaben, damit eine nachträgliche Objektänderung keine Revision umgeht. Doppelte IDs innerhalb eines Batches werden vor Schreibzugriffen abgewiesen.

Assets, neue AssetVersionen, Originale und gegebenenfalls Projektänderungen werden gemeinsam geschrieben. Ein Assetkonflikt lässt alle beteiligten Stores unverändert. Anschlusseditor und Bereichsextraktion verwenden deshalb einen einzigen Batch statt zweier einzelner Speichervorgänge. Gleichzeitige initiale Katalogeinrichtung darf den aktuellen Stand begrenzt neu einlesen; Benutzerentwürfe werden niemals automatisch wiederholt. Demo-Aktualisierungen behalten Archivzustand und Versionsliste.

## Migration und Sicherungen

IndexedDB-Version 2 ergänzt eine neue Migration, ohne den veröffentlichten Schritt 1 zu verändern. Alte Assets ohne Revisionsfeld erhalten in der Upgrade-Transaktion Revision 1. Bereits vorhandene gültige Revisionswerte bleiben erhalten; ungültige Felder oder Datensätze brechen die gesamte Migration ab. AssetVersionen, Projektstände und Originalbytes bleiben unverändert. Ältere offene Tabs schließen ihre Verbindung bei `versionchange`; ältere Appfassungen öffnen eine neuere DB nicht schreibend.

`StorageMigrationError` führt ausdrücklich nicht zum flüchtigen Fallback. Bei gescheiterter Migration bleibt die alte DB erhalten und der Fehler sichtbar. Die echten Browserregressionen wurden am 01.11.2026 unter lokalem Playwright-Chromium auf Windows ausgeführt: Upgrade, Originalerhalt, geschlossene Altverbindung, Zwei-Verbindungs-CAS und vollständiges Upgrade-Rollback bestanden. Quelltextprüfung und Memorytests allein wären dafür kein Nachweis.

Ältere geprüfte Sicherungen ohne Revisionsfeld bleiben lesbar, ohne ihre ursprünglichen Daten vor der Hashprüfung umzuschreiben. Vorhandene Felder werden als sichere nichtnegative Ganzzahlen validiert. Beim Restore eines neuen lokalen Bauteils wird dessen lokale Basis auf 0 gesetzt; ein Merge trägt die lokale Revision aus der Restorevorschau. Veraltete Restorepläne scheitern atomar. Ein reiner Unterschied lokaler Speicherrevisionen zählt nicht als Inhaltsänderung.

## Bearbeitungsgrundlage im UI

Ein Formular hält die Assetrevision fest, mit der sein Entwurf begonnen wurde. Broadcast-Aktualisierungen ändern diese Grundlage nicht. Das betrifft Gebäudeangaben, Anschlüsse, Materialvarianten und die Bearbeitung im Generator. Sonst könnte ein altes Formular durch neue Props unbeabsichtigt die aktuelle Speicherfreigabe erhalten.

Bei veraltetem Entwurf bleibt dessen Inhalt sichtbar und eine Meldung erklärt den Konflikt. „Seite neu laden“ verwirft Eingaben erst nach ausdrücklichem Klick. Ein abgewiesenes Angabenformular bleibt offen. Es gibt weder stilles Überschreiben noch eine automatische fachliche Zusammenführung von Versionslisten, Tags oder Anschlüssen.

## Prüfnachweise und Grenze

Node-Regressionen: `tests/unit/core/asset-concurrency.test.mjs`, `asset-restore.test.mjs`, `asset-seeding.test.mjs`. Sie prüfen zwei konkurrierende Änderungen, konkurrierendes Versionsergänzen, Revisionen/Overflow, Kopiergrenzen, Duplikate, alle beteiligten Stores, alte Sicherungen und einen veralteten Restoreplan. Browserregressionen: `tests/e2e/asset-concurrency.e2e.mjs` prüft die echte v1→v2-Migration und separate Verbindungen; `asset-editing.e2e.mjs` prüft zwei sichtbare Bearbeitungsformulare mit Broadcast und erhaltenem Entwurf. Alle drei Fälle sind am 01.11.2026 lokal bestanden, nachdem der mehrdeutige Hinweis im UI-Test auf den Angabenbereich begrenzt wurde. Ausführungsstand und Grenzen stehen in [TESTING](../../TESTING.md); daraus folgt keine Safari-/iPhone-Abnahme.
