# Spielbrücke: Baufortschritt aus der Welt (Konzept · P6-01 · R-020)

Stand: 27.10.2026, Konzept, noch nicht implementiert. Nutzerfrage: Kann eine Minecraft-Mod das Gebaute in der Welt auslesen und auf der Website zeigen, wie weit der Bau ist? Antwort: ja, ohne Server und ohne die statische Pages-Seite aufzugeben. Dieses Dokument legt Architektur, Datenformat, Übertragungswege, Stufen und offene Entscheidungen fest. Ergänzt [Bauanleitung](GUIDE.md), [Schem-Export](SCHEM_EXPORT.md), [Speicherung](PERSISTENCE.md) und [Voxelvertrag](VOXEL_CONTRACT.md).

## Leitentscheidung: dünne Mod, Vergleich auf der Website

Die Mod **liest nur** und schreibt eine **Ist-Aufnahme** des Planbereichs als Sponge Schem v3. Soll/Ist-Vergleich, Zuordnung zu Bauschritten und Fortschrittsanzeige passieren im TypeScript-Domänenkern der Website.

Begründung:

- Eine einzige Vergleichs- und Schrittlogik. Die Schritte (`<instanzId>~L<schicht>~<phase>`) entstehen in `buildGuide` aus `resolution.world`; eine zweite Schrittlogik in Java würde den Grundsatz „keine zweite Koordinaten-/Zähllogik“ verletzen und bei jeder Anleitungsänderung auseinanderlaufen.
- Die Mod bleibt klein und je Minecraft-Version billig zu pflegen: Bereich lesen, Blockzustände als Text, Datei schreiben.
- Der vorhandene Schem-Reader, der Python-Prüfer und die Node-Tests decken das Format bereits ab. Der Vergleich ist mit synthetischen Ist-Dateien vollständig ohne Minecraft testbar.
- Ersatzweg ohne Mod: ein mit WorldEdit gespeicherter Bereich (`//copy`, `//schem save`) ist dasselbe Format. Der Webteil ist damit schon vor der Mod nutzbar (mit manueller Ausrichtung, siehe unten).

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

## Offene Entscheidungen (Nutzer)

1. **Spielumgebung**: Einzelspieler, eigener Server oder fremder Server? Bestimmt Client-Mod gegen Plugin.
2. **Loader**: Fabric (Empfehlung), NeoForge oder bereits genutztes Modpack.
3. **Minecraft-Version** exakt (Launcher bzw. F3). Die Mod wird je Version gebaut; Pläne tragen die DataVersion.

## Grenzen

- Nur Blockzustände; BlockEntity-Inhalte (Kisteninhalt, Schildtext) werden in v1 nicht verglichen, nur der Block selbst. Freie Entities (Rahmen, Rüstungsständer) und Biome werden nicht geprüft.
- Mod-Blöcke werden per ID/Properties verglichen; ihre Bedeutung bleibt unbekannt.
- „Im Spiel bestätigt“ heißt: Zustand zum Aufnahmezeitpunkt in den gelesenen Chunks. Spätere Änderungen in der Welt sieht die Website erst mit der nächsten Aufnahme.
- Keine Drehung zwischen Plan und Welt in v1.
- Nichts davon ist implementiert oder im Spiel geprüft.
