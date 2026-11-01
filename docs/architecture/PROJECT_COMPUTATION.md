# Asynchrone Projektberechnung · PERF-01

## Ein Fachkern, gemeinsame Ergebnisse

`packages/application/src/projectComputation.ts` kombiniert die vorhandenen Regeln: Projektauflösung, Bauanleitung, Gesamt-/Instanzmaterialien, Bauitemberichte je Schritt sowie Fortschritt, Abschnitte, Sammelplanung und Anschlussfreiräume der Baustelle. Der Renderer zählt keine Materialien. Ein Eigentümerdurchlauf partitioniert Instanzzellen, statt für jede Instanz die gesamte Welt zu durchsuchen. Mehrblock- und Behälterregeln stammen weiterhin aus `computeMaterials`; Teilmengen und Schrittberichte werden gegen die bisherigen Funktionen geprüft.

`mergeBuildItems` addiert bereits gezählte, disjunkte Schrittberichte für die offene Ebenen-Packliste. Es liest keine Voxel und erfindet keine neue Itemzuordnung. Es führt Quellen/Annahmen zusammen, prüft widersprüchliche Stapelregeln und berechnet gemeinsame Stapelgrenzen aus der vorhandenen Stapelgröße. Damit löst jeder Fortschrittsklick keine zusätzliche geometrische Materialzählung in der Packliste aus.

## Worker und Lebensdauer

`computation/project.worker.ts` ist ein durch Vite gebauter Modulworker, erreichbar unter dem Pages-Unterpfad. Der Browseradapter überträgt nur tatsächlich referenzierte AssetVersionen; der übrige Gebäudebestand wird nicht bei jedem Projektauftrag kopiert. Keine Abhängigkeit der Anwendungsschicht von Browser-APIs.

Jeder Auftrag trägt Job-ID, Projekt-ID, Speicherrevision und optional eine eingefrorene Revisions-ID. Der Client prüft sämtliche Rücktags und die grundlegende Ergebnisstruktur einschließlich Maps. Workerfehler, Übertragungsfehler, unvollständige Antworten und Zeitüberschreitung enden sichtbar. Standardzeitgrenze: 120 Sekunden. Bei Abbruch, neuem Auftrag und Unmount wird der Worker tatsächlich beendet; Listener, Timer und Abort-Verknüpfungen werden entfernt. Es gibt keinen blockierenden synchronen Ersatzpfad bei fehlender Workerunterstützung.

`useProjectComputation` hält die Identität des gesamten Eingabesnapshots und des Retry-Versuchs fest. Vor einer neuen Effect-Ausführung wird das Ergebnis des vorherigen Snapshots bereits beim Rendern ausgeblendet. Gleiche Speicherrevisionen allein reichen nicht: auch noch ungespeicherte Änderungen können dieselbe Revision besitzen. Sowohl Clienttags als auch React-Snapshotbezug müssen passen. Ein neuer Hook-Auftrag bekommt einen eigenen Client; Aufräumen und erneutes Ausführen funktionieren dadurch auch bei Reacts wiederholter Effect-Einrichtung.

Ein geladener Arbeitsschritt, eine Lageränderung oder die bestätigte Speicherrevision erzeugen in dieser ersten Fassung einen neuen Gesamtauftrag. Das ist bewusst konservativ. Selektive Aktualisierung ohne erneute Geometrieberechnung gehört zum verbleibenden Teil von PERF-02; ein Wiederverwendungsnachweis muss zuerst Geometrie, Profil, Versionen, Abschnitte und Fortschritt korrekt trennen.

## Oberfläche und eingefrorene Bauversionen

Projektkopf und Ansichten unterscheiden pending, ready, error und cancelled. „Berechnung abbrechen“ beendet den Auftrag, „Neu berechnen“ startet einen neuen Versuch. Währenddessen bleibt die Projektbedienung erreichbar; alte Geometrie, Bauanleitungen und Materialzahlen werden nicht als aktueller Stand angezeigt. Speicherung und Berechnung besitzen getrennte Zustände.

Bauen, Material und Baustelle lesen dasselbe Ergebnis. Historische Bauversionen verwenden einen getrennten Auftrag mit deren Instanzen/Verbindungen und `buildGuide` auf der konkreten eingefrorenen Revision. Der Basiswähler bleibt auch während Abbruch, Fehler oder leerer Geometrie zugänglich. Die aktuelle Projektrevision wird dabei nicht überschrieben. Exportwriter und der zusätzliche Soll/Ist-Spielvergleich bleiben eigene Anwendungsfälle; sie wurden durch diesen Block nicht vollständig in Worker verlagert.

Korrektur aus der echten Browserprüfung am 01.11.2026: Der Aufnahmecontroller bleibt beim Wechsel pending/ready mit stabiler React-Identität eingebunden. Sein Originaldateipuffer, Ladezustand und seine Rückmeldungen dürfen durch die Neuberechnung oder Wahl einer historischen Grundlage nicht verschwinden. Vergleichszahlen stammen weiterhin ausschließlich aus dem aktuellen Ergebnis. Die vorhandenen Aufnahmeimport- und Original-/Reload-Regressionen sichern diesen Lebensdauerfehler ab.

## Nachweise und Grenzen

Acht Node-Tests in `tests/project-computation.test.mjs` prüfen semantische Gleichheit zu bestehenden Funktionen, historische Basis, Instanz-/Überlappungsregeln, Structured Clone der vollständigen Maps und Baustellenpläne, Quellenaggregation, späte Antworten, falsche Tags, Abbruch, Retry, Timeout, Worker-/Nachrichtenfehler und Entsorgung. Ein echter Node-`worker_threads`-Lauf vergleicht dieselbe fachliche Berechnung samt Übertragung. Vier Browserregressionen in `tests/e2e/project-computation.e2e.mjs` betreffen reale Worker, Abbruch/Retry, schnelle Änderungen, Fehler und historische Bauversionen; alle vier am 01.11.2026 lokal unter Playwright-Chromium auf Windows bestanden. Ein vor Initialisierung abgebrochener Worker erzeugt eine Scriptanfrage, aber kein Ereignis für einen initialisierten Worker; beide Beobachtungen werden getrennt geprüft. Das ist keine Browserlatenzmessung großer Modelle.

Abgegrenzte Messung des Teilthreads: Node v24.22.1, AMD EPYC 9V74, 42.875 belegte Zellen. Synchroner Gesamtlauf 478 ms; Worker inklusive Start/Kopieren/Rückübertragung 725 ms. Während des Workerauftrags wurden 121 Ereignisschleifen-Ticks bedient, größter gemessener Abstand 23 ms. Das ist ein Responsivitätsnachweis im Node-Szenario und keine Beschleunigungs- oder Browsergarantie. Geteilte Containerlast beeinflusst Laufzeiten. Der Test protokolliert jeweils seine aktuellen Messwerte, statt dieselben Zahlen als Garantie zu prüfen.

Der [große Browservergleich](PROJECT_BROWSER_BENCHMARK.md) ergänzt inzwischen zwölf echte Chromiumläufe mit 64.000 synthetischen Zellen und vollständiger Ergebnisgleichheit. Im isolierten Produktionsharness reagiert eine terminierte DOM-Interaktion mit Worker früher, während Start und Übertragung die Gesamtdauer erhöhen. Separate Clonewerte und weiterhin messbare Hauptthreadpausen stehen mit sämtlichen Rohdaten im Messbericht.

Structured Clone, große Vorschau-/GPU-Aktualisierungen, zusätzliche UI-Berechnungen und initiale Payloadvalidierung können weiterhin Zeit auf dem Hauptthread verbrauchen. Vollständige React-/Viewer-Interaktion, INP und echte Mobilgeräte bleiben offen; der schmale Benchmarkviewport ist Desktop-Touchemulation. Kompakter Transport und selektive Invalidierung bleiben PERF-02. Interne Indexmessung separat: [COMPOSITION_PERFORMANCE](COMPOSITION_PERFORMANCE.md). Konkreter Teststand und Veröffentlichungsgrenze: [TESTING](../TESTING.md).
