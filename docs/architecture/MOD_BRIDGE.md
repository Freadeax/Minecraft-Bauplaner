# Spielbrücke: Baufortschritt aus der Welt (Konzept · P6-01 · R-020)

Stand: 27.10.2026. M1 (Website) implementiert, Mod (M2) in Arbeit. Zielumgebung laut Nutzer: Minecraft 26.3, Fabric Loader 0.19.5, Fabric API 0.164.0+26.3, Java 25, Mehrspieler-Server; weitere Versionen und Launcher sollen folgen, WorldEdit wird nirgends vorausgesetzt. Nutzerfrage: Kann eine Minecraft-Mod das Gebaute in der Welt auslesen und auf der Website zeigen, wie weit der Bau ist? Antwort: ja, ohne Server und ohne die statische Pages-Seite aufzugeben. Dieses Dokument legt Architektur, Datenformat, Übertragungswege, Stufen und offene Entscheidungen fest. Ergänzt [Bauanleitung](GUIDE.md), [Schem-Export](SCHEM_EXPORT.md), [Speicherung](PERSISTENCE.md) und [Voxelvertrag](VOXEL_CONTRACT.md).

## Leitentscheidung: dünne Mod, Vergleich auf der Website

Die Mod **liest nur** und schreibt eine **Ist-Aufnahme** des Planbereichs als Sponge Schem v3. Soll/Ist-Vergleich, Zuordnung zu Bauschritten und Fortschrittsanzeige passieren im TypeScript-Domänenkern der Website.

Begründung:

- Eine einzige Vergleichs- und Schrittlogik. Die Schritte (`<instanzId>~L<schicht>~<phase>`) entstehen in `buildGuide` aus `resolution.world`; eine zweite Schrittlogik in Java würde den Grundsatz „keine zweite Koordinaten-/Zähllogik“ verletzen und bei jeder Anleitungsänderung auseinanderlaufen.
- Die Mod bleibt klein und je Minecraft-Version billig zu pflegen: Bereich lesen, Blockzustände als Text, Datei schreiben.
- Der vorhandene Schem-Reader, der Python-Prüfer und die Node-Tests decken das Format bereits ab. Der Vergleich ist mit synthetischen Ist-Dateien vollständig ohne Minecraft testbar.
- Fremde Schem-Dateien ohne Bauplaner-Metadaten liest die Website ebenfalls, dann mit manueller Ausrichtung. Das ist nur ein technischer Rückfall; WorldEdit oder andere Werkzeuge werden nicht vorausgesetzt.

Die Mod verändert die Welt nie (AGENTS: keine automatische Weltveränderung). Sie setzt keine Blöcke, platziert keine Geisterblöcke als echte Blöcke und sendet nichts an Dritte.

## Datenfluss

```
Website                         Spiel (Mod)                          Website
───────                         ───────────                          ───────
Revision einfrieren  ──.schem──▶ Plan laden (Soll, Metadaten)
                                 Anker setzen (Weltposition)
                                 Bereich lesen (nur geladene Chunks)
                                 Ist-Aufnahme schreiben  ──.schem──▶ Aufnahme importieren
                                                                     Revision + Hash prüfen
                                                                     Zellvergleich Soll/Ist
                                                                     Schritte: im Spiel geprüft
```

1. **Plan in die Mod.** Der vorhandene Export (Tab „Export“) liefert die Soll-Datei mit `Metadata.Bauplaner{ProjectId, RevisionId, RevisionNumber, Profile}` und `Offset` = Projektminimum (Anker „Projektursprung“). Die Mod liest daraus Abmessungen, Projektminimum und die IDs. Blockdaten braucht sie in Stufe M2 nur für den Umriss; ab M4 für Overlays.
2. **Anker.** Der Spieler legt fest, an welcher Weltkoordinate der Projektursprung 0/0/0 liegt: `/bauplaner anker` (angeschauter Block) oder `/bauplaner anker <x> <y> <z>`. Die Mod zeigt den Planumriss als Linienrahmen (nur Darstellung). In v1 keine Drehung zwischen Plan und Welt; wer gedreht bauen will, dreht die Instanzen im Planer.
3. **Aufnahme.** Die Mod liest jede Zelle der Planbox aus der Welt. Nicht geladene Chunks werden nicht geraten, sondern als `bauplaner:unloaded` geschrieben. Das Lesen läuft in Scheiben über mehrere Ticks mit festem Zellbudget, damit das Spiel nicht hängt.
4. **Ist-Datei.** Sponge Schem v3 mit derselben Box (Width/Height/Length, Offset) wie der Plan, Blockzustände als vollständiger Text (`id[key=value,…]`), BlockEntities ohne Inhalt (siehe Grenzen) und Metadaten (unten).
5. **Import auf der Website.** Tab „Bauen“ → „Spielaufnahme importieren“. Die Website prüft, dass ProjectId/RevisionId zum Projekt passen und die Revision existiert, löst genau diese Revision auf und vergleicht.

## Ist-Aufnahme: `Metadata.Bauplaner` (Format `bauplaner-scan` v1)

| Feld | Inhalt |
|---|---|
| `Kind` | `"scan"` (Plan-Dateien haben kein Kind-Feld; so werden Soll und Ist nie verwechselt) |
| `ScanVersion` | `1` |
| `ProjectId`, `RevisionId`, `RevisionNumber` | aus der Plan-Datei übernommen |
| `PlanSha256` | SHA-256 der geladenen Plan-Datei; gleiche Revision, andere Exporteinstellungen fallen so auf |
| `ProjectMin` | Projektkoordinate der Boxecke (= Plan-`Offset`) |
| `WorldAnchor` | Weltkoordinate des Projektursprungs |
| `Dimension` | z. B. `minecraft:overworld` |
| `ScannedAt` | ISO-Zeit |
| `Source` | `"client"` (geladene Chunks des Spielers) oder `"server"` (Serverwelt, Chunks werden nachgeladen) |
| `Unloaded` | Anzahl der Zellen mit `bauplaner:unloaded` |
| `GameVersion`, `ModVersion`, `Loader` | zur Nachvollziehbarkeit, nicht zur Registryprüfung |

`DataVersion` kommt aus dem laufenden Spiel. Die Website zeigt eine Abweichung zur Plan-DataVersion als Hinweis an.

Für Aufnahmen gelten eigene Leselimits (Volumen bis zur Exportgrenze 4 000 000 Zellen, Achse bis 65 535) statt der Bauteil-Importlimits (`SCHEM_LIMITS`, 20 000 Zellen). Der Vergleich arbeitet auf der Palette, nicht auf einem Voxelpayload, damit große Aufnahmen nicht als Bauteil validiert werden müssen.

## Zellvergleich

Grundlage: `resolveProject` der eingefrorenen Revision. Projektkoordinate = Aufnahmekoordinate (lokal) + `ProjectMin`.

| Soll (Weltpayload) | Ist | Ergebnis |
|---|---|---|
| Block | gleicher Block, gleiche Bau-Properties | `ok` |
| Block | gleicher Block, andere Bau-Properties | `zustand` (z. B. Treppe falsch gedreht) |
| Block | Luft | `fehlt` |
| Block | anderer Block | `falsch` |
| ausdrückliche Luft / Löschen | Luft | `ok` |
| ausdrückliche Luft / Löschen | Block | `abbauen` |
| nicht ausgewählt (Lücke) | beliebig | ignoriert |
| beliebig | `bauplaner:unloaded` | `unbekannt` |

**Bau-Properties.** Properties, die das Spiel selbst aus der Umgebung oder dem Betrieb ableitet, zählen nicht als Baufehler: Zaun-/Scheiben-/Mauerverbindungen (`north/east/south/west/up`), `snowy`, `powered`, `power`, `lit` bei Redstone-Bauteilen, `open` bei Türen/Toren/Falltüren, `distance` und `persistent` bei Laub, `age`, `stage`, `moisture`, `triggered`, `extended`, `occupied`. Diese Liste wird wie der B7-Zustandskatalog explizit je Familie geführt und getestet; unbekannte Properties werden verglichen. `waterlogged` wird verglichen, weil es den Bau sichtbar ändert. Die Ausnahmeliste ist eine Annahme und bleibt in der Oberfläche benannt.

Der Vergleich zählt Zellen, nicht Items. Mehrblockobjekte (Tür, Bett) bestehen aus mehreren Zellen und werden je Zelle geprüft – genau wie die Schritte der Anleitung.

## Anbindung an die Bauanleitung

`buildGuide` liefert je Schritt die Weltpositionen. Jede Weltzelle liegt in genau einem Schritt, also lässt sich jedes Vergleichsergebnis eindeutig einem Schritt zuordnen. Je Schritt entsteht:

```
GameCheck { stepId, revisionId, geometryHash, scanSha256, scannedAt,
            total, ok, zustand, fehlt, falsch, abbauen, unbekannt }
```

Status je Schritt:

- **im Spiel bestätigt**: alle Zellen `ok`, keine `unbekannt`.
- **im Spiel teilweise**: mindestens eine Zelle `ok`, Rest offen; Anzeige „37/48 Blöcke“.
- **im Spiel abweichend**: mindestens eine `falsch`, `zustand` oder `abbauen` (rote Zellen in der Schichtdraufsicht).
- **nicht geprüft**: alle Zellen `unbekannt` oder keine Aufnahme.

Der manuelle Haken (`progress.set`) bleibt unverändert und getrennt, wie in [GUIDE](GUIDE.md) vorgesehen. Die Oberfläche zeigt beides nebeneinander und weist auf Widersprüche hin („abgehakt, aber im Spiel fehlen 3 Blöcke“). Ein Knopf „bestätigte Schritte abhaken“ übernimmt Spielergebnisse ausdrücklich als `batch`, nie automatisch.

Gespeichert wird die letzte Aufnahme je Projekt und Revision (Originaldatei als Blob wie andere Originale, plus Ergebnis). Ein Ergebnis gilt nur, solange `geometryHash` des Schritts gleich bleibt; sonst „Aufnahme veraltet“. Ältere Aufnahmen bleiben als Verlauf erhalten (Fortschritt über Zeit).

Gesamtfortschritt auf der Projektseite: bestätigte Blöcke / Soll-Blöcke, getrennt nach „laut Spiel“ und „laut Haken“.

## Übertragung zur statischen Pages-Seite

Die Seite hat keinen Server. Geprüfte Wege:

| Weg | Wie | Bewertung |
|---|---|---|
| **Datei** (Stufe M2, Standard) | Mod schreibt `<Spielordner>/bauplaner/scans/<Projekt>_r<Nr>_<Zeit>.schem`; Website importiert per Dateiauswahl oder Ziehen | funktioniert offline, in jedem Browser, auf dem Handy über Dateifreigabe; kein Netzwerk, keine Rechte. Entspricht ADR-009 „Datei-Export vor Live-Sync“ |
| **Lokale Verbindung** (Stufe M3, optional) | Mod öffnet einen HTTP-Dienst nur auf `127.0.0.1`; Website ruft `http://127.0.0.1:<Port>/` ab, holt Aufnahmen und kann Pläne übergeben | bequem („Jetzt prüfen“-Knopf). Browser behandeln `127.0.0.1` zwar als sicheren Ursprung, verlangen aber teils eine Freigabe für lokale Netzzugriffe; Verhalten in Chrome, Firefox und Safari ist **ungeprüft** und muss gemessen werden. Funktioniert nur auf demselben Rechner |
| Zwischenablage | Mod kopiert Text, Website liest Einfügung | nur für kurze Zusammenfassungen tauglich, nicht für Zellen; verworfen |
| Server-Plugin mit Web-API | Plugin auf Spielserver, Website fragt Server | braucht öffentliches Hosting, Konten und Sicherheit; passt zum späteren Teamdienst (ADR-004), nicht zu Pages allein; verschoben |

Sicherheit der lokalen Verbindung (M3): Bindung ausschließlich an Loopback; Kopplungscode, den die Mod im Chat zeigt und die Website einmalig abfragt; CORS nur für `https://freadeax.github.io`; nur lesende Endpunkte plus „Plan übergeben“; keine Befehle, keine Weltänderung; standardmäßig aus.

## Loader und Plattform

| Variante | Liest | Stärken | Grenzen |
|---|---|---|---|
| **Fabric, clientseitig** (Empfehlung) | Blöcke, die der eigene Client geladen hat | läuft in Einzelspieler und auf jedem Server ohne Serverinstallation; kleine API, neue Minecraft-Versionen schnell verfügbar | nur geladene Chunks (Sichtweite); Server mit Anti-Xray verschleiern verdeckte Blöcke ⇒ dort `unbekannt`/falsche Werte möglich; Mod-Regeln fremder Server beachten |
| Fabric, Einzelspieler über den integrierten Server | komplette Welt, Chunks werden nachgeladen | keine Sichtweitengrenze | nur Einzelspieler oder eigener Fabric-Server |
| NeoForge, clientseitig | wie Fabric-Client | sinnvoll, falls Philipp ein NeoForge-Modpack spielt | eigener Build je Loader |
| Paper-/Spigot-Plugin | komplette Serverwelt | gemeinsamer Server, mehrere Spieler, Aufnahme ohne anwesenden Spieler | kein Einzelspieler; eigener Server nötig |

Aufbau, damit ein späterer zweiter Loader billig bleibt:

- `bridge-core` (reines Java, ohne Minecraft): NBT lesen/schreiben, Plan-Metadaten, Ist-Datei schreiben, Scanplanung (Scheiben, Budget). Mit JUnit ohne Spiel testbar.
- `bridge-fabric` (dünn): Befehle `/bauplaner plan|anker|scan|status`, Blockzugriff über eine Schnittstelle `BlockSource` (Client-Welt bzw. Server-Welt), Umriss-Rendering.
- Weitere Adapter (NeoForge, Paper) implementieren nur `BlockSource` und Befehle.

Ablage im Repository: `mods/bauplaner-bridge/` als eigenes Gradle-Projekt, nicht Teil von `npm run check`. Fabric-Maven und Mojang-Server sind aus der Cloud-Arbeitsumgebung nicht erreichbar (geprüft 27.10.2026). Der Mod-Build und jede Spielprüfung laufen daher auf Philipps Rechner; `bridge-core` kann hier gebaut und getestet werden.

## Stufen

| Stufe | Inhalt | Abnahme |
|---|---|---|
| M0 | dieses Konzept | Entscheidungen Loader, Version, Spielumgebung getroffen |
| M1 | Website: Aufnahme importieren, Zellvergleich, Schrittstatus, Gesamtfortschritt, Verlauf; Ersatzweg WorldEdit-Schem mit manueller Ausrichtung | Node-Tests mit handgezählten Ist-Dateien (ok/fehlt/falsch/zustand/abbauen/unbekannt, ignorierte Properties, Lücken), Revisions-/Hash-Abweisung, Playwright-Import |
| M2 | Mod: Plan laden, Anker, Umriss, Aufnahme in Scheiben, Ist-Datei | `bridge-core`-Tests; Python-Prüfer liest erzeugte Ist-Dateien; manuelle Spielabnahme an einem Testbau mit bekannten Fehlern |
| M3 | Lokale Verbindung Website ↔ Mod | Browsermessung in Chrome/Firefox/Safari, Kopplung, Abweisung fremder Ursprünge |
| M4 | Im Spiel: aktueller Schritt als Umriss, fehlende Blöcke markiert, HUD „Schritt X: 12 fehlen“ | nur Darstellung, keine Weltänderung |

M1 hängt von keiner der offenen Entscheidungen ab und kann sofort beginnen.

## Entscheidungen (Nutzer, 27.10.2026)

1. **Loader**: Fabric, clientseitig. Das Modpack des Nutzers läuft mit Minecraft 26.3, Fabric Loader 0.19.5, Fabric API 0.164.0+26.3 und Java 25 und wird auf einem Mehrspieler-Server gespielt. Die Mod darf daher nichts auf dem Server voraussetzen.
2. **Mehrere Versionen und Launcher**: `bridge-core` ohne Minecraft-Abhängigkeit, je Minecraft-Version ein dünner Fabric-Adapter und eine eigene .jar. Jeder Launcher, der Fabric-Mods lädt, funktioniert; die Mod schreibt nur in ihren Unterordner des Spielordners.
3. **Kein WorldEdit.**

## Umsetzung M1 (Website)

- `packages/formats/src/scan.ts`: `readWorldScan`/`normalizeScan` mit eigenen Limits (`SCAN_LIMITS`: 4 000 000 Zellen, 16 MB komprimiert, 40 MB entpackt, 20 s), dichte Palettenindizes statt Voxelpayload, `bauplaner:unloaded`, Metadatenprüfung (Plan-Dateien ohne `Kind` werden mit Hinweis abgewiesen, `ScanVersion` ≠ 1 ebenfalls). Entpacken über das gemeinsame `gunzipLimited` aus `schem.ts`.
- `packages/domain/src/gameCheck.ts`: `scanTarget` (Projekt und Revision müssen passen), `checkScan` (Zellvergleich, Zuordnung über `buildGuide`-Positionen), `compareBlock`/`ignoredProperties` (expliziter Katalog oben), `confirmedUnticked`, `tickedButNotBuilt`, `tickConfirmed` (ein rückgängig machbarer `batch`).
- Plan-Export schreibt zusätzlich `Bauplaner.ProjectMin`, damit Aufnahmen bei jedem Anker ausrichtbar sind.
- Tab „Bauen“: Bereich „Fortschritt laut Spielaufnahme“ (`GameCheckPanel.tsx`, Lesen im Worker `scan.worker.ts`), Grundlage springt auf die Revision der Aufnahme, Spielstatus je Schritt in der Liste, Abweichungen mit Koordinaten in der Schrittkarte und rot umrandet im Schichtplan, Hinweis auf abgehakte, aber im Spiel fehlende Schritte, Knopf „bestätigte Schritte abhaken“.
- Grenze M1: Die Aufnahme wird noch nicht gespeichert und muss nach dem Neuladen erneut importiert werden (Speicherung als Original-Blob folgt mit der Mod).

## Umsetzung M2 (Mod) · Stand 27.10.2026

[`mods/bauplaner-bridge`](../../mods/bauplaner-bridge/README.md), Gradle 9.8.2 mit Wrapper.

- `core/` (Java 21, ohne Minecraft): `Nbt` (Big-Endian, Modified UTF-8), `Plan` (liest Plan-Dateien, weist Aufnahmen und Pläne ohne `ProjectMin` ab, Grenze 4 000 000 Zellen), `ScanJob` (liest über `BlockSource` in Scheiben, Sponge-Reihenfolge, `bauplaner:unloaded`, prüft das Zustandsformat, schreibt `bauplaner-scan` v1), `AnchorStore` (Plan und Anker je Server/Welt in `bauplaner/state.properties`).
- `fabric-26.3/`: Client-Befehle `/bauplaner plan|anker|scan|status|abbrechen|plaene`, 12 000 Zellen je Tick, Fortschritt über der Hotbar, atomares Schreiben nach `bauplaner/scans/`, Abbruch bei Welt- oder Dimensionswechsel. Versionsabhängiges nur in `McCompat.java`. **Nicht kompiliert und nicht im Spiel geprüft** (Fabric-Maven und Mojang-Server aus der Cloud-Umgebung gesperrt).
- Prüfung: `scripts/test_bridge.sh` führt die JUnit-Tests aus und prüft sprachübergreifend: Website exportiert einen Plan, der Java-Kern nimmt eine daraus gebaute Welt mit einem falschen Block auf, der unabhängige Python-Leser und der Website-Vergleich finden genau diese Zelle.
- Noch offen in M2: Umriss der Planbox im Spiel, Speicherung der Aufnahme auf der Website.

## Grenzen

- Nur Blockzustände; BlockEntity-Inhalte (Kisteninhalt, Schildtext) werden in v1 nicht verglichen, nur der Block selbst. Freie Entities (Rahmen, Rüstungsständer) und Biome werden nicht geprüft.
- Mod-Blöcke werden per ID/Properties verglichen; ihre Bedeutung bleibt unbekannt.
- „Im Spiel bestätigt“ heißt: Zustand zum Aufnahmezeitpunkt in den gelesenen Chunks. Spätere Änderungen in der Welt sieht die Website erst mit der nächsten Aufnahme.
- Keine Drehung zwischen Plan und Welt in v1.
- Nichts davon ist implementiert oder im Spiel geprüft.

## B8P · Dauerhafte Aufnahmen und Verlauf · 31.10.2026

Im Tab „Bauen“ speichert „Aufnahme im Projekt speichern“ die unveränderte Aufnahmedatei zusammen mit einer Projektreferenz atomar über das vorhandene Repository (`applyBatch`, `baseRevision`). `Project.scanHistory` enthält SHA-256, ursprünglichen Dateinamen, Importzeit, Revisionsbezug und Ausrichtung; die Originalbytes bleiben im vorhandenen Originalspeicher. Es gibt keine zweite Datenbank oder neue Vergleichslogik.

Die letzte gespeicherte Aufnahme wird beim Öffnen des Projektbereichs automatisch wieder geladen. Der Verlauf lässt ältere Dateien auswählen; die Originaldatei kann bytegleich heruntergeladen werden. Vor erneutem Lesen werden Größe und SHA-256 geprüft, danach liest der bestehende begrenzte Worker das Original und der vorhandene Domänenkern berechnet den Vergleich erneut. Fremde Aufnahmen behalten ihre manuell gesetzte Ausrichtung. Ausblenden löscht keine Aufnahme. Manuelle Fortschrittshaken bleiben unverändert.

Speichern benötigt einen vollständig gespeicherten Projektstand. Ein konkurrierender Tab führt zur Revisionsablehnung ohne Teilübernahme. Nach erfolgreichem Schreiben wird das Projekt neu geladen und die Rückgängig-Historie zurückgesetzt; die Oberfläche erklärt dies vor dem Klick. Falls inzwischen eine lokale Änderung begonnen hat, wird diese nicht durch automatisches Neuladen ersetzt; der Nutzer erhält den Hinweis, den gespeicherten Stand zu laden.

Projekt-/Gesamtsicherungen sammeln auch die Scan-Originalreferenzen. Wiederherstellung prüft den Verlauf strukturell; fehlende Originale werden ausdrücklich aufgeführt. Der Datencheck erkennt verwendete und fehlende Scan-Originale. Alte Projekte ohne `scanHistory` bleiben gültig. Im Sitzungsspeicher gilt keine Dauerhaftigkeitszusage; die Oberfläche weist darauf hin.

Grenzen: kein automatisches Löschen alter Originale, kein geräteübergreifender Abgleich, keine Live-Spielverbindung. Wird ein Projekt bei der Sicherungswiederherstellung unter neuer ID kopiert, behalten unveränderte Bridge-Aufnahmen ihre ursprüngliche Projekt-ID und werden deshalb ausdrücklich als fremdes Projekt abgewiesen; Originaldownload/Reimport bleibt möglich. Kein Umschreiben von Originalmetadaten. Browser-/Safari-/Spielabnahme separat offen.
