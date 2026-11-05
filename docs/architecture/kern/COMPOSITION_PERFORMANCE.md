# PERF-02 · Interne Zellindizes beim Zusammensetzen

Stand 01.11.2026. `resolveProject` verwendet für die interne Belegungsmap einen linearen Ganzzahlindex statt einer Koordinatenzeichenkette. Dieselbe interne Abbildung ordnet BlockEntities zu. Der öffentliche Vertrag bleibt gleich: `owners` ist eine gewöhnliche stringbasierte Map, einschließlich bisheriger Einfügereihenfolge. Aufgelöste Zellen bleiben Y/Z/X-sortiert, Zustände und Konflikte folgen denselben Regeln. Damit bleibt das Ergebnis für Worker per Structured Clone übertragbar.

## Sicherheitsgrenze

Aus den bereits transformierten, validierten Instanzgrenzen wird die gemeinsame Auswahlbox bestimmt. Nur wenn ihr mit BigInt geprüftes Gesamtvolumen höchstens `Number.MAX_SAFE_INTEGER` beträgt, wird numerisch indiziert:

`(x − minX) + spanX × ((z − minZ) + spanZ × (y − minY))`

Jeder Summand und jedes Zwischenergebnis liegt dann im sicheren Ganzzahlbereich. Negative Weltkoordinaten werden durch den Boxursprung ausgeglichen. Liegt die Box außerhalb dieses Bereichs, bleibt die bisherige Zeichenkettenabbildung erhalten. Die abschließende Payloadvalidierung mit den bestehenden Volumen-/Zell-/NBT-Limits läuft unverändert; die Ersatzabbildung genehmigt keine übergroßen Projekte. Es werden keine dichten Arrays in Größe der Auswahlbox angelegt.

## Reproduzierbare Node-Messung

```sh
npm run build:core
node --expose-gc scripts/bench/benchmark_composition.mjs 2b8ea8d
```

Das Skript lädt den unveränderten `compose.ts` des angegebenen Gitstands, transpiliert ihn ausschließlich in ein temporäres Verzeichnis und vergleicht ihn mit dem aktuellen Kernbuild. Beide benutzen dieselben übrigen Kernmodule und dieselbe Fixture. Temporäre Dateien werden auch im Fehlerfall entfernt. Vorbereitung und Ergebnisprüfung liegen außerhalb der gemessenen Kompositionszeit.

Szenario: vier getrennte hohle Hallen mit je 96 × 36 × 96 Auswahlblöcken, Böden alle sechs Y-Schichten, zwei Materialien, negative Ursprünge; insgesamt **266.784 belegte Zellen**. Keine BlockEntities oder Kollisionen in dieser Leistungsfixture. Drei Läufe pro Implementierung mit wechselnder Reihenfolge und explizitem GC vor jedem Lauf; Median aus drei Werten. Kein Browser-/GPU-Leistungsnachweis.

Umgebung: Node **v24.22.1**, Linux-Container, AMD EPYC 9V74 80-Core Processor, 9 sichtbare logische CPUs und 9,73 GiB sichtbarer Systemspeicher. Geteilte Containerlast und kurze Laufserie begrenzen die Aussagekraft.

| Lauf | Vorher: stringbasierte Map | Nachher: interne Zahlenindizes |
|---|---:|---:|
| 1 | 777,87 ms | 790,37 ms |
| 2 | 938,88 ms | 874,34 ms |
| 3 | 833,60 ms | 778,35 ms |
| Median | **833,60 ms** | **790,37 ms** |

Die Medianzeit liegt in dieser abschließenden Messung **5,2 % niedriger**. Eine erste Messserie ergab 14,7 %; die Streuung erlaubt keine allgemeine Prozentgarantie. Der erste Einzellauf der abschließenden Serie ist mit Zahlenindizes geringfügig langsamer. Der unveränderte öffentliche Stringindex und Transformation/Validierung bleiben relevante Kostenblöcke.

Alle sechs Ausgaben des abschließenden Vergleichs haben denselben SHA-256 über die gesamte öffentlich sichtbare Resolution einschließlich Map-Einträgen und ihrer Reihenfolge:

`945aae2b41b8124b2a8fec2d63e6a10c84fe6c3e7b66c8612e7ad860032a431d`

## Semantische Abnahme

`tests/unit/core/composition-index.test.mjs` enthält handberechnete Erwartungen für negative Koordinaten, dünn belegte Auswahlboxen, explizite Luft und Löschzellen, BlockEntity-NBT, alle vier Konfliktarten, explizite und konkurrierende Overrides, öffentliche Besitzer-/Paletten-/Zellreihenfolge und Structured Clone. Eine dünne Box nahe der sicheren Ganzzahlgrenze erhält benachbarte Zellen getrennt; eine darüberliegende Box bleibt durch die bisherigen Limits abgewiesen. Leere Projekte, fehlende Versionen und engere Aufruflimits behalten ihre Ergebnisse.

Die Leistungsänderung ersetzt weder die Browserabnahme von PERF-01 noch eine Welt-/Spielprüfung. Alle Format-, Material-, Anleitungs- und Exportverträge bleiben unverändert.
