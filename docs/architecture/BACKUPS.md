# Sicherungsstand und Abschnittsstände (BACKUP-02)

Stand: 01.11.2026. Baut auf [PERSISTENCE](PERSISTENCE.md) (Sicherungsformat, Wiederherstellung) und [SITE](SITE.md) (Bauabschnitte) auf.

| Teil | Dateien |
|---|---|
| Domäne Sicherungsstand | `packages/domain/src/data/backupStatus.ts` |
| Domäne Abschnittsstände | `packages/domain/src/building/sectionSnapshots.ts`, gemeinsame Zuordnungsregel `sectionMembership.ts`, Validierung über `checkSite` in `site.ts` |
| Speicher | `Repository.getBackupLedger/recordBackup` (`packages/application/src/repository.ts`), IndexedDB-Store `meta` Schlüssel `backupLedger` (keine Migration), `MemoryRepository` |
| Oberfläche | `apps/web/src/app/backupStatus.ts` (Hooks), `views/BackupPanel.tsx` (Erinnerung, Sicherungsstand, Prüfen), Projektkopf-Chip in `views/project/ProjectView.tsx`, `views/project/SnapshotsPanel.tsx` und Einfrieren in `SiteTab.tsx`, Stile `apps/web/src/styles/backup.css` |
| Tests | `tests/backup-reminder.test.mjs`, `tests/e2e/backup-reminder.e2e.mjs` |

## S01 · Letzte Sicherung mit Datenänderungen vergleichen

**Belege statt Behauptungen.** Für jede erzeugte Sicherungsdatei (Download ausgelöst) und jede wieder eingelesene Datei mit gültiger Prüfsumme legt der Browser einen *Beleg* (`BackupReceipt`) an: Zeit, Dateiname, Umfang (`project`/`all`), Formatversion, `contentSha256` und je Projekt, eigenem Bauteil, eigener Sammlung und Vorlage einen Fingerabdruck. Die Fingerabdrücke werden **aus dem Dateiinhalt** berechnet (SHA-256 über kanonisches JSON ohne die Speicherrevision `revision`), nicht aus dem lokalen Stand. Die letzten 40 Belege bleiben erhalten.

**Vergleich** (`compareWithBackups`): Je Datensatz entscheidet der neueste Beleg, der ihn enthält – *gesichert* (gleicher Fingerabdruck), *seit Sicherung geändert* oder *noch nie gesichert*. Mitgelieferte Beispielbauteile zählen nicht. Projekte aus der letzten Gesamtsicherung, die lokal fehlen, werden als Information genannt. Eine wiederhergestellte Fassung mit gleichem Inhalt zählt als gesichert, auch wenn ihre Speicherrevision anders ist.

**Erinnerung:** `ok` ohne offene Änderungen; `hint`, wenn Änderungen jünger als 7 Tage sind; `due`, wenn noch nie gesichert wurde, die älteste offene Änderung 7 Tage oder älter ist oder ein Projekt in gar keiner Sicherung steckt. Bei `due` zeigt die Projektzentrale ein Banner („Gesamtsicherung herunterladen“, „Morgen erinnern“ – nur eine Ansichtseinstellung in `localStorage`). Der Projektkopf zeigt den Stand des offenen Projekts.

**Ehrlichkeit (Abnahme „keine Cloudkopie behaupten“):** Ein Beleg beweist nur, dass dieser Browser eine Datei mit diesem Inhalt erzeugt oder gelesen hat. Jede Anzeige führt den festen Hinweis `BACKUP_DISCLAIMER`: Ob die Datei im Download-Ordner, auf einem anderen Gerät oder in einer Cloud liegt, kann der Bauplaner nicht prüfen. Die Erfolgsmeldung nach dem Sichern sagt „zum Herunterladen übergeben“ und bittet, die Datei außerhalb des Browsers abzulegen.

**Sicherung prüfen:** Öffnet eine Datei, prüft sie vollständig mit `readBackup` (Format, Prüfsumme, Versionen, Originale), schreibt nichts außer dem Beleg `verified`. Auch das Öffnen zur Wiederherstellung legt diesen Beleg an. Eine manipulierte Datei wird abgelehnt und erzeugt keinen Beleg.

Belege gehören zum Browser, nicht zu den Projektdaten: Sie stehen nicht in Sicherungsdateien und werden bei einer Wiederherstellung nicht übertragen.

## S02 · Abschnittsstand reproduzierbar einfrieren und wiederfinden

**Einfrieren** (`freezeSection`) legt in `project.site.snapshots` einen `SectionSnapshot` an: Abschnittsdefinition (Name, Notiz, Mitglieder mit Schichtbereichen), Position in der Bau-Reihenfolge, vollständige Kopien der Mitgliedsinstanzen (feste, unveränderliche Bauteilversion, diskrete Transformation, Vorrang), die Verbindungen zwischen ihnen, jeden Bauschritt des Abschnitts mit `geometryHash`, Blockzahl und Hakenstand sowie einen Fingerabdruck über Mitglieder, Platzierungen und Schrittgeometrie. Nummern zählen je Abschnitt hoch und werden nie wiederverwendet. Höchstens 200 Stände je Projekt.

Weil Instanzen nur feste Versionen referenzieren und `site` Teil des Projekts ist, reisen Stände mit jeder Projektsicherung; `checkSite` prüft sie beim Laden, in Sicherungen und bei jeder Operation. Ältere App-Versionen ignorieren das optionale Feld, `schemaVersion` bleibt 1.

**Keine stillen Änderungen.** Stände werden nie umgeschrieben. `compareSnapshot` meldet jede Abweichung einzeln: Abschnitt entfernt, Mitglieder/Schichtbereiche geändert, Bauteil entfernt, andere Version, verschoben/gedreht, Vorrang geändert, Verbindungen geändert, Schritte neu/weggefallen (auch wenn ein früherer Abschnitt Schichten übernimmt) und Schritte mit anderer Geometrie; der Fingerabdruck fängt alles Übrige ab. Umbenennen und Notizen gelten als kosmetisch, Haken als Fortschritt – beides wird getrennt gezeigt. Die Baustelle zeigt an jedem eingefrorenen Abschnitt „❄ Stand n · unverändert/x Abweichungen“, warnt im Abschnittseditor und fragt vor dem Entfernen.

**Wiederfinden:** Das Archiv „Abschnittsstände“ listet alle Stände, auch entfernter Abschnitte, durchsuchbar nach Abschnitt und Bezeichnung, mit Inhalt (Versionen, Positionen, Schichten).

**Zurücksetzen** (`planSnapshotRestore`) zeigt zuerst eine Vorschau und führt dann **eine** rückgängig machbare Operation aus: entfernte Mitglieder samt Verbindungen wieder einfügen, Version/Vorrang/Transformation zurücksetzen, Abschnittsdefinition zurücksetzen bzw. an alter Position wieder anlegen. Haken bleiben unverändert (abweichende Geometrie ⇒ *prüfbedürftig*). Fehlt eine Bauteilversion lokal, ist das Zurücksetzen gesperrt. Gehören Bauteile auch zu anderen Abschnitten, sagt die Vorschau das.

**Als eigenes Projekt öffnen** (`snapshotProjectContent`) legt eine unabhängige Kopie mit den eingefrorenen Instanzen, Verbindungen, dem Abschnitt und den damals gesetzten Haken an. Die Haken tragen den alten Geometrie-Hash: Wo sich die Geometrie ohne die übrigen Bauteile ändert (z. B. eine Überschneidung entfällt), erscheint der Schritt prüfbedürftig, nie still erledigt.

## Grenzen

- Ob eine Sicherungsdatei den Browser verlassen hat, ist technisch nicht feststellbar; die App sagt das ausdrücklich.
- Der Hakenstand eines Stands ist manuell (kein Spielnachweis).
- Ein Stand hält die Geometrie über Versionen und Platzierungen fest; die Schrittgeometrie hängt zusätzlich von Überschneidungen mit anderen Bauteilen ab. Abweichungen dadurch werden gemeldet, aber nicht zurückgesetzt.
- Geprüft mit Chromium 1400/390 px; keine Safari-/Echtgeräteprüfung (QA-02).
