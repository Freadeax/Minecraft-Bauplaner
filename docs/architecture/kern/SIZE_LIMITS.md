# Größengrenzen für große Bauwerke (SIZE-01)

Stand: 03.11.2026 · Anlass: Philipp, „Überarbeiten des Volumenlimits beim Bearbeiten und Senden von Daten über die Mod ins Spiel, vor allem bei großen komplexen Builds“. Code: `packages/voxel/src/sizeLimits.ts` (Website), `PlanModel`/`LiveCheck`/`Hologram` (Mod 0.9.0). Tests: `tests/unit/core/size-limits.test.mjs`, `mods/bauplaner-bridge/mod-core/src/test/.../BigPlanTest.java`.

## Grundsatz

Es gibt **eine** Stelle, an der die Website festlegt, wie groß ein Modell sein darf: `sizeLimits.ts`. Import, Werkstatt, Export, Aufnahmen und die Übertragung zur Mod lesen ihre Grenzen von dort, statt eigene Zahlen zu pflegen. Zwei Arten:

- **Harte Grenzen** schützen Browser und Spiel vor dem Absturz. Darüber bricht der Vorgang ab und sagt, wie es trotzdem geht (in Bauabschnitte oder Teilprojekte teilen).
- **Stufen** darunter sind nur Hinweise (`assessSize`): ab 500.000 Zellen „groß“, ab 1,5 Mio. „sehr groß“. Werkstatt und Mod-Übertragung zeigen sie (`SizeNotice`), arbeiten aber weiter.

## Grenzen vorher und jetzt

| Bereich | Vorher | Jetzt |
|---|---|---|
| Zellen je Modell (Voxelvertrag) | 1 Mio. | **4 Mio.** (`MODEL_MAX_CELLS`) |
| Box je Modell | 16,7 Mio. | 16,7 Mio. (`MODEL_MAX_VOLUME`, z. B. 512 × 64 × 512) |
| Schem-Import | 250.000 Zellen Box, 256 je Achse, 4 MB | **16,7 Mio. Box, 4096 je Achse, 4 Mio. Blöcke, 64 MB** |
| Litematic-Import | 1 Mio. Blöcke, 256 je Achse, 4 MB | **4 Mio. Blöcke, 4096 je Achse, 64 MB**; auch die Gesamtbox mehrerer Regionen ist begrenzt |
| Voxel-JSON-Import | 250.000 Zellen, 256 je Achse | 4 Mio. Zellen, 4096 je Achse |
| Weltausschnitt in die Bibliothek | 250.000 Zellen, 256 je Achse | 4 Mio. Zellen (Bereich weiter bis 1024 × 4064 × 1024) |
| Datei in der Oberfläche | 16 MB | 64 MB |
| Werkstatt: Modell | 400.000 Zellen | 4 Mio. |
| Werkstatt: ein Schritt | 250.000 Zellen | 1 Mio. |
| Werkstatt: Rückgängig | 300 Schritte | 300 Schritte **und** höchstens 6 Mio. geänderte Zellen (älteste fallen zuerst) |
| Schem-Export / Plan für die Mod | 4 Mio. Zellen Box | **16,7 Mio.** |
| Spielaufnahme / Baustand | 4 Mio. Box, 16 MB | 16,7 Mio. Box, 64 MB |
| Übertragung zur Mod | 16 MiB | 64 MB (Mod 0.9.0, Fähigkeit `bigplans`) |
| Mod: Planbox | 4 Mio. | 16,7 Mio., höchstens 4 Mio. Blöcke |

Bis 250.000 Zellen Box bleibt Luft beim Import eine ausdrückliche `air`-Zelle (wie bisher); größere Dateien übernehmen nur ihre Blöcke, die Luft bleibt unausgewählt und der Bericht nennt die Zahl. Das Original bleibt unverändert gespeichert.

## Warum gerade 4 Mio.

Gemessen in Node 22 (Chromium ähnlich): eine Million Zellen belegen als Zellobjekte rund 130 MB, die Werkstatt braucht zusätzlich rund 100 MB. Vier Millionen sind auf einem Rechner mit 8 GB machbar, aber zäh – deshalb der Hinweis „sehr groß“ ab 1,5 Mio. Die Großprojekte (10 Städte, Kolosseum-Viertel) liegen bei 15.000 bis 60.000 Blöcken und Boxen bis 1,3 Mio. Zellen; sie stießen vorher an keine Grenze, aber eingelesene Fremddateien ab 250.000 Zellen Box und Exporte über 4 Mio. Zellen Box schon.

## Was dafür umgebaut wurde (Website)

- **Kein Kopieren beim Import.** Schem, Weltausschnitt und Voxel-JSON bauen ihre Zellen selbst und versiegeln sie jetzt mit `adoptPayload` statt sie mit `createPayload` noch einmal zu kopieren. Bei einer Million Zellen spart das rund 3 Sekunden und die Hälfte des Speichers (gemessen: 3,0 s → 0,3 s).
- **Werkstatt:** gleiche Zellwerte teilen sich ein Objekt je Palettenzustand; die Umkehrung eines Schritts wird linear gebaut (vorher quadratisch, ein großer Füllschritt hing minutenlang); Rückgängig hat ein Zellbudget.
- **Bauabschnitte im Plan:** zusätzlich zu `SectionCells` (ein Byte je Boxzelle, für Mods bis 0.8.0) schreibt der Export `SectionRuns` (Läufe aus Anzahl und Abschnitt). `SectionCells` entfällt bei Boxen über 4 Mio. Zellen, die ältere Mods ohnehin nicht laden.
- **Vor dem Senden zur Mod** prüft `checkPlanForMod`, ob die verbundene Mod den Plan laden kann (Box, Dateigröße), nennt sonst die nötige Mod-Version und wartet bei großen Dateien länger (etwa 1 s je MB, mindestens 20 s).

## Was dafür umgebaut wurde (Mod 0.9.0)

- **Plan einmal entpacken:** `Plan.parse(name, bytes, decoded)` liest Kopf und Blöcke aus demselben NBT-Baum (vorher zweimal).
- **6 Byte je Planblock** in `PlanModel` (Boxindex + Palettenindex) statt 16; Abschnitte nur, wenn der Plan welche hat.
- **`LiveCheck` ohne Objekt je Block:** Weltpositionen als `int[]`, Urteile als `byte[]`, erwarteter Zustand je Palettenzustand einmal gedreht, Positionssuche über eine sortierte Liste je Chunk statt einer `HashMap` mit einem Eintrag je Block. Zählungen je Bauabschnitt werden mitgeführt, so kostet der Abschnittsfortschritt keinen Durchlauf mehr. Messung: 3,1 Mio. Blöcke in 0,7 s (vorher hätte allein die HashMap rund 300 MB belegt).
- **Laden im Hintergrund:** Pläne von der Website werden im Thread der Webanfrage gelesen und vorbereitet; das Spiel tauscht nur noch aus. Große Plandateien (ab 512 KB) und das Verschieben großer Hologramme (ab 250.000 Blöcken) laufen im Thread „Build-Studio-Planlader“; das alte Hologramm bleibt bis dahin stehen, die Anzeige sagt „Plan wird vorbereitet …“.
- **Baustand in Scheiben:** `GET /v1/scan` liest die Planbox in Scheiben zu 200.000 Zellen, jede in einem eigenen Spieltick.
- **Render-Budget:** Das Hologramm zeichnet weiter höchstens 30.000 offene Blöcke im Umkreis von 72 (die nächsten zuerst), 6.000 mit Textur und 4.000 in der Röntgensicht. `/bauplaner leistung niedrig|normal|hoch` halbiert oder verdoppelt das. Wenn das Budget greift, steht in der Anzeige „Zeigt die nächsten …“. Die Auswahl wird bei reinen Urteilsänderungen höchstens alle 250 ms neu gebaut.

## Prüffall Olympus: große Blockmengen einfügen und senden

Philipps Datei `olympus.litematic` (952.911 Blöcke, Box 164 × 184 × 189 = 5,7 Mio. Zellen, 464 Zustände) ist der Prüffall für den ganzen Weg: Import, Werkstatt, Projekt, Weltkarte, Senden über Mod 0.9.0. Gemessen im Browser (Chromium ohne GPU) vorher → jetzt:

| Schritt | vorher | jetzt |
| --- | --- | --- |
| Werkstatt: ein Block setzen/abbauen, Rückgängig | 5–6 s | 1,5 s |
| Werkstatt: als neue Version speichern | 15 s | 8 s |
| Projekt berechnen (Bauteil eingefügt) | 20–35 s | 10 s |
| .schem-Export | 11 s | 4 s |
| Senden ins Spiel | 15 s | 7 s |

Was dafür umgebaut wurde:

- **Übergabe an den Hintergrundrechner** (`packages/application/src/computationTransport.ts`): Zellen gehen als Spalten typisierter Arrays hin und zurück (übertragen, nicht kopiert); Bauschritte nennen ihre Zellen als Index in die Welt; die eingefügten Bauteile rechnet die Seite aus ihren eigenen Versionen nach. Vorher kostete allein das Kopieren 16 s.
- **Projektberechnung** (Node 29 s → 6 s): Zellindex als Zahl statt Text, dichte `Int32Array`-Tabellen für Belegung und Bauschritt, Materialregeln je Palettenzustand einmal, Besitzer je Zelle als Tabelle (`cellOwnersOf`), Geometrie-Hash fortlaufend (`QuickHasher`, gleiche Werte wie vorher), unveränderte Bauteile werden beim Einfügen nicht neu aufgebaut.
- **Export**: das Projekt wird für die Revision nur noch einmal aufgelöst.
- **Werkstatt**: Ebenen, Blockliste und Modell werden je Basis einmal aufgebaut; eine Änderung baut nur die betroffenen Ebenen neu und mischt ihre Zellen in die sortierte Basis ein, statt eine Million Zellen zu kopieren, zu zerlegen und zu sortieren. Das Modell wird an Ort und Stelle versiegelt.
- **Prüfsumme**: `canonicalPayloadJson` schreibt die übliche Zellform direkt und ist textgleich mit `canonicalJson` (Test `tests/unit/core/large-edit.test.mjs`); gespeicherte Prüfsummen und Versionskennungen bleiben gültig.

Die Mod las den gesendeten Plan (194 KB .schem) in 0,4 s, die Prüfung braucht rund 56 MB.

## Abnahme Großstadt im echten Spiel (SIZE-01-S05, 06.11.2026)

`scripts/size/test_grossbau_ingame.sh` prüft DATEI-05, WERK-07, MOD-11 (mit MOD-15) und LIVE-02 (mit LIVE-09) automatisch mit einem echten Großbau:

- `scripts/size/big_build.mjs` packt alle Katalog-Gebäude bis 30 hoch dicht an dicht mit 3-Block-Straßen auf eine 600 × 600 große Bodenplatte: **1.451.347 Blöcke, Box 600 × 31 × 600 = 11,2 Mio. Zellen, 1.112 Gebäude, 1,1 MB**. Dazu `zu-gross.litematic` mit 4,2 Mio. Blöcken für die Grenzmeldung.
- `tests/big/grossbau.big.mjs` bedient die gebaute Website in Chromium (ohne GPU) wie ein Spieler: zu große Datei, Import abbrechen, ganz laden, als Bauteil speichern, Werkstatt öffnen, 356.055 Grasblöcke durch Moos ersetzen, Rückgängig, Wiederholen, als Version 2.0 speichern, Projekt anlegen, Litematic exportieren (und wieder einlesen: alle Blöcke, Moos stimmt), auf der Weltkarte „Wo ich stehe“ und „▶ Ins Spiel senden“.
- Im Spiel (Minecraft 26.3, Fabric-Client-Gametest, weston) läuft die echte Mod: Verbinden per Klickfreigabe, Hologramm des Großplans, Lage = Kartenursprung der Website, Leistung `normal`/`niedrig`/`hoch` (Grenze greift, „niedrig“ < „normal“), Drehen mit Ende, Verschieben mit Pfeiltaste, `/bauplaner diagnose`, Scan-Download. Spiel und Browser messen Zeit, längste Tick-/Bildpause und Speicher.

Gemessen (vier Läufe vom 06.11.2026, Container ohne GPU; JS-Speicher der Seite bis 2,6 GB):

| Schritt | Zeit | längste Bildpause | Chromium gesamt |
| --- | --- | --- | --- |
| Zu große Datei abgewiesen | 0,7 s | 0,1 s | 0,8 GB |
| Import 1,45 Mio. Blöcke | 3–4,5 s | 0,4–0,5 s | 1,2 GB |
| Als Bauteil speichern | 7–9 s | 0,5–0,7 s | 2,8 GB |
| Werkstatt öffnen | 4,6–4,8 s | 4,2 s | 2,5–3,5 GB |
| 356.055 Blöcke ersetzen | 4,4–6 s | 4–5,6 s | 3,6–3,9 GB |
| Rückgängig / Wiederholen | 2,4–2,7 s / 3,3–4,9 s | 2–4,7 s | 3,2–4,8 GB |
| Als Version 2.0 speichern | 12–15 s | 3,8–5,4 s | 4,4–5,3 GB |
| Projekt anlegen | 32–41 s | 6–9 s | 5,1–6,4 GB |
| Litematic-Export | 9–10 s | 7–8 s | 5,1–6,2 GB |
| Ins Spiel senden | 15–18 s | 9–10 s | 5,9–6,8 GB |

Mod: der Plan ist 12–13 s nach dem Klick als Hologramm da, längste Tickpause dabei 0,15 s, Java-Speicher 0,5–0,7 von 3,4 GB, Drehen 0,3–0,4 s, Verschieben 0,2–0,3 s, Baustand-Scan 2–4 s. Leistung zeigt 36.000 offene Blöcke bei „normal“ (30.000 + 6.000 mit Textur), 18.000 bei „niedrig“, bei „hoch“ alle 54.098 im Umkreis.

Dabei behoben: Litematic über 4 Mio. Blöcke meldete einen Fehler mitten im Lesen und ließ genau 4 Mio. nicht zu – jetzt zählt der Import vorher und sagt „… mehr als die 4 Mio. … die Datei in mehrere Teile teilen“; die Werkstatt zeigt Änderungszähler mit Tausenderpunkt; „Wo ich stehe“ auf der Weltkarte übernimmt keine Lage außerhalb der Bauhöhe (−64 bis 319) mehr.

Offen (Folgepunkt Leistung): Werkstatt, Projekt anlegen, Export und Senden halten den Hauptthread bei 1,5 Mio. Blöcken 4–10 s fest (Seite stockt, bricht aber nicht ab); die Mod schreibt Blockzahlen im Chat und in der Anzeige ohne Tausenderpunkt. Bildrate auf echter Grafikkarte und mit Shadern, ferne Blöcke als Kisten und „Plan wird vorbereitet …“ prüft nur Philipp im eigenen Spiel (MOD-11 bleibt teilweise).

## Grenzen, die bleiben

- Mehr als 4 Mio. Blöcke oder eine Box über 16,7 Mio. Zellen: in Teilprojekte oder Bauabschnitte teilen. Die Meldungen sagen das.
- Ältere Mods (bis 0.8.0) laden Pläne bis 4 Mio. Zellen Box und 16 MiB; die Website erkennt das an der fehlenden Fähigkeit `bigplans` und sagt es vor dem Senden.
- Der Browser hat je Tab eine eigene Speichergrenze (Chrome rund 4 GB). „Sehr groß“ heißt: andere Tabs schließen hilft.
