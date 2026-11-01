# Große Projektberechnung im Browser · PERF-01-S03

Am 01.11.2026 um 13:22 Uhr MEZ wurde der vorhandene gemeinsame Rechenfall mit seinem echten Browserworker verglichen. Die terminierte DOM-Rückmeldung wurde früher verarbeitet; der vollständige Workerauftrag dauerte einschließlich Start und Übertragung länger. Größere Hauptthreadpausen beim Übertragen bleiben sichtbar und begründen den nächsten Teil von PERF-02.

Die vollständigen Einzelwerte, Ergebnisdigests, Invarianten und Laufzeitangaben stehen in [project-browser-benchmark.json](project-browser-benchmark.json). Der Rechenkern und Client waren gegenüber Baseline `6a309073872cda244a66a6b8d91452139cbdce09` unverändert. Der gemeinsame Arbeitsbaum enthielt neue Prüfdateien und Dokumentation; die Baseline-SHA bezeichnet deshalb nicht einen damals bereits eingecheckten Benchmark. Im JSON stehen `workingTreeDirty: true` und `computationSourceFilesDirty: false`.

## Reproduktion

Nach dem dokumentierten [Codex-Setup](../project/CODEX_SETUP.md) mit installiertem Projekt-Chromium:

```sh
node scripts/benchmark_project_browser.mjs
```

Das Skript schreibt den JSON-Bericht auf stdout, baut einen isolierten Produktions-Harness über die vorhandene Vite-API in ein eigenes temporäres Verzeichnis und startet dessen lokalen HTTP-Server auf einem freien Port. Der bestehende Produktionsclient erzeugt den tatsächlichen Modulworker. `dist` und `dist-web` sowie Produktkonfiguration und Quelldaten werden nicht verändert. Browser, HTTP-Server und das anhand von Elternverzeichnis und Namenspräfix geprüfte temporäre Verzeichnis werden anschließend geschlossen bzw. entfernt.

Für kleine Funktionsläufe lassen sich `LMNT_BENCH_SIDE` (10–60) und `LMNT_BENCH_RUNS` (1–10) setzen. Die dokumentierte Abnahme verwendet die unveränderten Standardwerte 40 und 3. Ein vorheriger Smoke mit 1.000 Zellen, einer Wiederholung und beiden Viewports bestand; er geht nicht in die folgenden Werte ein.

## Modell und Ablauf

Eigenes synthetisches Modell: ein vollständig belegter Steinwürfel mit 40 × 40 × 40 = 64.000 Zellen, eine feste AssetVersion und eine platzierte Instanz bei `[-40, 0, -40]`. Profil `java:registry-unverified`, keine behauptete Minecraft-Versionskompatibilität. Die AssetVersion entsteht über den bestehenden validierenden/hashenden Bibliotheksvertrag vor der Zeitmessung.

Verglichen wird dieselbe aktuelle `computeProject`-Funktion synchron auf dem Hauptthread und über den vorhandenen `createProjectComputationClient`. Das ist ein kontrollierter Vergleich vor/nach Auslagerung derselben Arbeit, kein Vergleich zweier historischer Gitstände. Je Viewport läuft ein Warmup beider Modi, danach drei Messpaare mit wechselnder Reihenfolge. Jeder Workerauftrag bekommt wie im Produkt einen neuen Worker. Die Hauptthreadmessung beginnt unmittelbar vor dem Funktionsaufruf; die Workermessung unmittelbar vor `client.run` und endet nach der vollständigen Antwort.

Ein 5-ms-Timer erfasst Ereignisschleifenabstände. Ein für zehn Millisekunden nach Messbeginn terminierter Button-Click schreibt eine sichtbare DOM-Rückmeldung; protokolliert wird seine zusätzliche Verzögerung gegenüber diesem Termin. Vor und nach der Berechnung gibt es jeweils 35 ms Beobachtungszeit. Hashbildung und separate Clone-Messungen finden außerhalb dieses Responsivitätsfensters statt.

Jeder Messlauf muss unabhängig die handgezählten 64.000 Weltzellen, Besitzer und Steinitems, 40 Bauschritte sowie null Konflikte liefern. Alle relevanten Ergebnis-Maps müssen nach Übertragung echte Maps bleiben. Zusätzlich wird das gesamte Ergebnis mit expliziter Mapkodierung gehasht: alle sechs Ergebnisse je Viewport besitzen denselben SHA-256-Digest. Zwischen den Viewports unterscheiden sich die Digests wegen der jeweils neu erzeugten Zeitstempel; die Gleichheitsprüfung gilt innerhalb desselben unveränderten Eingabesnapshots.

## Tatsächlich gemessene Werte

Windows `10.0.26200`, AMD Ryzen 5 3600, zwölf logische CPUs, 32 GiB RAM, Node `v24.18.0`, Headless-Chromium `156.0.8078.4`. Keine CPU-Drosselung. Root und die anderen Teilagenten hielten für den finalen Lauf ihre Test-/Messlast an; allgemeine Hintergrundlast des Windowsrechners wurde nicht kontrolliert. Angaben sind Median aus drei Läufen, auf eine Nachkommastelle gerundet:

- **1400 × 1000 px:** Gesamtdauer synchron **703,1 ms**, Worker **1.183,9 ms**. Größter Heartbeatabstand je Lauf im Median **703,2 → 161,7 ms**. Zusätzliche Verzögerung des terminierten DOM-Clicks **693,2 → 30,0 ms**. Die Worker-Gesamtdauern lagen zwischen 1.181,5 und 1.259,6 ms; der größte einzelne Worker-Heartbeatabstand betrug 205,2 ms.
- **390 × 844 px mit Touch-Emulation:** Gesamtdauer synchron **799,9 ms**, Worker **1.420,2 ms**. Größter Heartbeatabstand je Lauf im Median **800,3 → 197,4 ms**. Zusätzliche DOM-Click-Verzögerung **790,3 → 35,1 ms**. Die Worker-Gesamtdauern lagen zwischen 1.292,6 und 1.450,8 ms; der größte einzelne Worker-Heartbeatabstand betrug 230,6 ms.
- **Separates `structuredClone` auf dem Hauptthread:** Bei 1400 px lagen Eingabeklone im Median je nach Modus bei 91,1 bzw. 97,0 ms und Ergebnisklone bei 303,1 bzw. 336,3 ms. Bei 390 px waren es 110,4 bzw. 111,0 ms und 340,0 bzw. 446,4 ms. Diese isolierten Klone sind keine Messung der tatsächlichen `postMessage`-Übertragungsdauer; sie dürfen nicht von der Worker-Gesamtdauer abgezogen werden, um eine vermeintliche reine Rechenzeit herzuleiten.

Die Messung belegt frühere Verarbeitung des terminierten DOM-Ereignisses und kürzere Ereignisschleifenpausen im beschriebenen Szenario. Sie belegt keine Gesamtbeschleunigung und keine durchgehend flüssige Bedienung: auch mit Worker bleiben Pausen über 150 ms. Konservative Übertragung großer Objektgraphen ist damit weiterhin ein messbarer Ansatzpunkt.

## Abnahmegrenzen und nächste Aktion

Der DOM-Click wird synthetisch per Timer ausgelöst. Er misst weder reale Benutzereingaben noch INP oder die anschließende Bildausgabe. Der Harness rendert keine React-Projektansicht und keinen Viewer; GPU-, Mesh-, Layout-, IndexedDB- und vollständige Produkt-Reaktionszeiten sind nicht erfasst. Der schmale Viewport bleibt Desktop-Chromium mit Touch-Emulation, kein iPhone-/Safari-/Mobilhardware-Nachweis. Eine einzelne homogene Instanz ersetzt keine Messmatrix für viele Instanzen, Konflikte, NBT oder komplizierte Blockzustände.

PERF-01-S03 besitzt damit den reproduzierbaren großen Browser-/Hardwarevergleich für den abgegrenzten Rechen- und Transportfall. Abbruch, Retry und historische Grundlage bleiben durch die bestehenden [Workerregressionen](../../tests/e2e/project-computation.e2e.mjs) abgedeckt. Nächste konkrete Arbeit ist PERF-02-S03: tatsächliche Übertragungsphasen und Besitzer-/Geometriedaten getrennt instrumentieren, anschließend selektive Neuberechnung bzw. ein kompakteres Transportformat mit vollständiger Invalidierungs- und Ergebnisgleichheitsprüfung einführen. Echte Geräte bleiben QA-02. Gesamtprüfung, Main-Integration und Pages-Livenachweis folgen zentral durch Root; dieser Teilagent hat weder committet noch gepusht.
