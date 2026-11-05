# Kontrollierte Versionsupdates (UPDATE-01)

Stand: 02.11.2026. Code: `packages/domain/src/versions/updates.ts`, `packages/domain/src/versions/updateState.ts`, `packages/application/src/catalogSync.ts`, Oberfläche `apps/web/src/views/project/UpdatesTab.tsx` (Projekt-Reiter „Updates“). Tests: `tests/updates.test.mjs`, `tests/e2e/updates.e2e.mjs`.

## Grundsatz

Eine Instanz zeigt immer auf **eine feste AssetVersion**. Nichts stellt ein Projekt von selbst um: weder neue Bibliotheksversionen noch neue App-Stände. Neue Versionen werden angezeigt, ihre Folgen vor dem Wechsel berechnet, und erst ein ausdrückliches „Update übernehmen“ ändert das Projekt, als **ein** rückgängig machbarer Schritt. Ein Teamserver ist nicht nötig.

## Was als Update zählt

- Updatequelle sind die Versionen eines Bauteils in seiner Reihenfolge (`Asset.versionIds`), **ohne lokale Projektänderungen**.
- Lokale Projektänderung = Version mit `source.localTo` (Projekt-ID). Sie entsteht im Projekt-Reiter „Blöcke“ (EDIT-02) und bei der Übernahme einer lokalen Änderung auf eine neue Version. Solche Versionen werden nie einem anderen Projekt als Update angeboten und sind nie die „neueste Version“ eines Bauteils (`latestReleaseId`: Bibliothek, Katalogbild, neue Instanzen, Anlagen, Beispielprojekte, Anschlussvorschläge).
- Versionen, die vor dem 02.11.2026 im Reiter „Blöcke“ entstanden, tragen die Markierung noch nicht und erscheinen deshalb wie normale Versionen.
- `findUpdates` liefert je Instanz: aktuelle Version, Ausgangsversion (bei lokaler Änderung die Version, auf der sie beruht), neuere und ältere Versionen, Einfrierung und Status (`aktuell`, `Update verfügbar`, `eingefroren`, `Version fehlt`).

## Updateplan (S01)

`prepareUpdate(project, library, choices, { policy })` berechnet vor jeder Änderung:

- **Geometrie**: Zellvergleich alt/neu, am Platzierungspunkt (Pivot) ausgerichtet (`diffVersions`, `pivotAligned`); ein Anbau nach Westen gilt als hinzugefügt statt als verschobenes Gebäude. Ansicht mit der Vergleichsdarstellung aus B12 (Bild/3D/Ebenen).
- **Material**: Blockmengen des ganzen zusammengesetzten Projekts vorher/nachher (Überlappungen einmal gezählt).
- **Anschlüsse**: neu, entfällt, verschoben, Typ/Profil geändert; Verbindungen, deren Zustand sich ändert. Verbindungen, die danach nicht mehr passen, werden im selben Schritt gelöst. Freiraum-Einstellungen der Baustelle zu entfallenen Anschlüssen werden gemeldet.
- **Aufgaben**: abgehakte Bauschritte, die prüfbedürftig werden oder entfallen, mit Bauabschnitt; Anzahl neuer offener Schritte.
- **Konflikte und Export**: Voxelkonflikte vorher/nachher, Namen der neu beteiligten Instanzen, Exportsperren vorher/nachher.
- Hinweise: Doppeländerungen, Profilwechsel, archivierte Bauteile.

## Lokale Änderungen (lokale Overrides)

Steht eine Instanz auf einer lokalen Änderung, wird diese beim Update als Patch mitgenommen (`rebasePatch`, Dreiwegevergleich Ausgang/lokal/neu, pivotbezogen):

- Zelle nur lokal geändert → lokaler Stand auf die neue Version.
- Neue Version hat dieselbe Änderung → zählt als „schon enthalten“.
- Beide Seiten unterschiedlich geändert → **Doppeländerung**; die Regel entscheidet: „Eigene Änderung behalten“ (Standard) oder „Neue Version übernehmen“. Jede Doppeländerung wird gezählt und im Plan genannt.
- Ergebnis ist eine neue unveränderliche Version „N.0 + lokal“ (`localTo` bleibt), die alte lokale Version bleibt erhalten. Dieselbe Übernahme wird nicht doppelt gespeichert.
- „Lokale Blockänderungen mitnehmen“ abwählen → Instanz geht auf die reine neue Version.
- Der bestehende Instanz-Vorrang (`Instance.override`) bleibt bei jedem Wechsel unverändert.

## Übernehmen, einfrieren, zurückkehren (S02)

- **Übernehmen**: ein Batch aus `link.remove` (nicht mehr passende Verbindungen), `instance.update` je Instanz und `updates.set` mit Verlaufseintrag. Rückgängig stellt Version, Verbindungen und Verlauf wieder her.
- **Einfrieren**: `project.updates.frozen[instanceId]` mit Version, Zeit und Notiz. Eingefrorene Instanzen bekommen kein Update angeboten, `prepareUpdate` lehnt sie ab; neuere Versionen bleiben sichtbar. „Freigeben“ hebt das auf.
- **Zurückkehren**: Der Verlauf (`project.updates.log`, höchstens 200 Einträge) hält Von-/Nach-Version jedes Wechsels. „Zurückkehren“ stellt die vorige Version exakt wieder her (ohne Patch) und wird als eigener Eintrag „Zurückgekehrt“ vermerkt. Daneben ist jede ältere Version wählbar.
- Versionen aus dem Verlauf gelten als referenziert (`referencedVersionIds`), Sicherungen enthalten sie, damit Rückkehr nach einer Wiederherstellung möglich bleibt.

## Neue Katalogstände

Bisher bekamen bestehende Browser geänderte mitgelieferte Gebäude nie zu sehen. `seedSamples` liefert sie jetzt als **neue Version** aus (`planCatalogDelivery`): Weicht die mitgelieferte Geometrie bzw. die Anschlüsse eines gespeicherten Katalog-Gebäudes von allen gespeicherten Katalogversionen ab, wird sie als nächste freie Version „N.0“ (Quelle `demo`) angehängt. Archivstatus, vorhandene Versionen und Projekte bleiben unverändert; erneutes Laden oder ein älterer App-Stand liefern nichts doppelt. Wer Katalog-Geometrie ändert, darf das deshalb jetzt tun: Projekte sehen die Änderung im Reiter „Updates“.

## Datenmodell

- `Project.updates?: UpdateState` (`schemaVersion: 1`, `frozen`, `log`), optional; fehlend = nichts eingefroren. Geprüft in `checkProjectRecord`. Keine IndexedDB-Migration.
- `AssetVersionSource.localTo?: string`; ändert die Versionskennung nicht (sie hängt nur an Bauteil, Bezeichnung, Payload-Hash und Anschlüssen).
- Operation `updates.set` mit exakter Umkehrung.

## Oberfläche

- Projekt-Reiter „Updates“: Übersicht, Filter, Tabelle je Instanz mit Zielversion, „Folgen anzeigen“, „Zurückkehren“, „Einfrieren“/„Freigeben“, Mehrfachauswahl, Plan mit Übernehmen/Abbrechen, Verlauf.
- Projektkopf: Hinweis „N Updates verfügbar“ (nur wenn es welche gibt), Projektzentrale: Hinweis „N Updates“ an der Projektkarte.

## Grenzen

- Die Folgenberechnung setzt das Projekt zweimal zusammen; bei sehr großen Projekten dauert sie einige Sekunden (Anzeige „Folgen werden berechnet …“).
- Kein Abgleich von Blockentitätsinhalten über Stände hinweg außer exakter Gleichheit im Patch.
- Keine Updates über Gerätegrenzen hinweg; nur Chromium im Container geprüft, keine Echtgeräte (QA-02).
