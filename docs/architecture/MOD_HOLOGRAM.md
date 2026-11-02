# Bauplaner-Mod 2.0: Hologramm und Live-Abgleich (GAME-07)

Stand 02.11.2026 · Stufe 1 „Fundament + Hologramm“ (0.2.0, Wahl Philipp) Stufe 2 „Texturen, Material, Ebenen“ (0.3.0) und Stufe 3 „Platzierhilfe“ (0.4.0) Stufe 4 „NeoForge, Shader, andere Mods“ (0.6.0) und Stufe 5 „Bauabschnitte, Röntgensicht, Shulker“ (0.7.0); 0.7.1 Baustand für die Live-Karte (`GET /v1/scan`, [LIVE_LINK](LIVE_LINK.md)), 0.7.2 Testphase (`/bauplaner diagnose`, Absturzschutz). Fabric 26.3 und NeoForge 26.3 mit demselben Client-Kern; die bisherige Aufnahme (`/bauplaner scan`, [MOD_BRIDGE](MOD_BRIDGE.md)) bleibt unverändert erhalten.

## Grundsätze

- **Reiner Client.** Kein zusätzliches oder verändertes Paket an den Server (die Platzierhilfe lässt einen normalen Klick durch oder verwirft ihn vorher, und wählt höchstens einen Schnellleistenplatz wie eine Zifferntaste), keine Weltänderung, kein automatisches Bauen („Printer“), kein Teleport. Funktioniert damit auf jedem Server, auch ohne Plugin und ohne Rechte.
- **Keine Abhängigkeiten** außer Fabric API bzw. NeoForge: kein WorldEdit, kein Litematica, keine eigenen Shader. Gezeichnet wird mit Vanilla-Rendertypen (`debugQuads`, `lines`) über `LevelRenderEvents.COLLECT_SUBMITS` (Fabric) bzw. `SubmitCustomGeometryEvent` (NeoForge), damit Sodium und Iris nichts ersetzen müssen.
- **Eine Wahrheit für den Vergleich.** `BlockRules.compare` ist eine Portierung von `compareBlock`/`ignoredProperties` aus `packages/domain/src/gameCheck.ts`: Ergebnis im Spiel = Ergebnis der Website.

## Aufbau

| Teil | Inhalt |
|---|---|
| `mod-core/` (Java 21, ohne Minecraft) | `BlockState` (Text `id[k=v]`, sortiert), `BlockRules` (OK/STATE/MISSING/WRONG/UNKNOWN), `Placement` (Anker, Viertel­drehungen im Uhrzeigersinn, Spiegelung der x-Achse vor dem Drehen; Positionen und Zustände: facing, axis, rotation 0–15, Schienenformen, Jigsaw-Ausrichtung, Seiten-Eigenschaften, Tür-Scharnier, Treppenform, Kistentyp), `PlanModel` (liest die exportierte `.schem` inkl. `Metadata.Bauplaner.ProjectMin`), `LiveCheck` (Urteil je Planblock, Chunk-Index, Runden-Abgleich, nächster Fehler), `PlacementStore` (`bauplaner/platzierung.properties` je Server/Welt). 7 JUnit-Tests |
| `mod-core/.../Materials.java` | Materialliste: je Block offen/gesamt; Türen, hohe Pflanzen und Betten zählen einmal, Doppelstufen zwei Stufen; optional nur bestimmte Höhen (Ebenen) |
| `hologram-26.3/` (nur Vanilla-Klassen, von Fabric und NeoForge als Quellordner eingebunden) | `HologramClient` (Fassade: Tick, Zeichnen, HUD, Tasten, Befehle, Klicks, Welt betreten/verlassen), `Hologram*.java`, `PlanScreen`, `MaterialScreen`, `GhostModels`, `PlacementAssist`, `McCompat`, Sprachdateien |
| `fabric-26.3/.../BridgeClient.java`, `neoforge-26.3/.../BridgeNeoForge.java` | nur die Verdrahtung mit den Ereignissen des Loaders; sonst kein eigener Code je Loader |

## Bedienung

| Taste (änderbar unter Steuerung → „Bauplaner“; Standard so gewählt, dass Xaero, Simple Voice Chat, Iris und Jade aus Philipps Modpack nicht kollidieren) | Wirkung |
|---|---|
| J | Planmenü: Pläne aus `bauplaner/plans/`; Klick platziert am angeschauten Block. Rechts: hierher, X/Y/Z ±1/±10, drehen, spiegeln, aus-/einblenden, entfernen |
| Pfeiltasten, Bild↑/Bild↓ | Plan relativ zur Blickrichtung verschieben (↑ = von mir weg) |
| Ende / Pos1 / Einfg | 90° rechts drehen / zum angeschauten Block / spiegeln |
| , (Komma) | Hologramm ein/aus |
| Num 7 | Materialliste: je Block offen, im Inventar, noch holen (Ebenen beachtet) |
| Num 6 / Num 9 / Num * | Ebenenmodus wechseln (alle → nur eine Ebene → bis zur Ebene) / Ebene höher / tiefer |
| Num / | Nächster Bauabschnitt aus der Website (alle → 1 → 2 → … → alle) |
| Num - | Röntgensicht: offene Blöcke als Rahmen auch durch Wände |
| . (Punkt) | Fehlerfinder: nächster falscher/fehlender Block bekommt violetten Rahmen und Strahl, HUD zeigt Richtung, Entfernung und was falsch ist |

Befehle (gleiche Aktionen, für Tastaturlose und Tests): `/bauplaner zeigen <datei>`, `fortschritt`, `hierher [x y z]`, `verschieben <dx> <dy> <dz>`, `drehen [viertel]`, `spiegeln`, `umschalten`, `fehler`, `entfernen`, `ebene <y>|bis <y>|alle`, `material`, `texturen`, `abschnitt [<nummer>|alle|weiter]`, `roentgen`.

## Darstellung

- fehlt, bis 40 Blöcke Entfernung (höchstens 6 000): das echte Blockmodell des Spiels, durchscheinend und bläulich getönt (Texturen aus dem Blockatlas, Ressourcenpakete gelten; Flächen zwischen zwei vollen Geisterblöcken werden weggelassen, damit Wände nicht wie Gitter aussehen). Blöcke ohne Modell (Kisten, Schilder, Banner) und weiter entfernte: blaue Kiste. Im Menü „Texturen: aus“ schaltet auf Kisten um (gespeichert in `bauplaner/einstellungen.properties`).
- falsch: rote Kiste über dem Block · Zustand falsch: gelbe Kiste · richtig: nichts. Weißer Rahmen um die ganze Planbox.
- Gezeichnet werden höchstens 30 000 offene Blöcke im Umkreis von 72 Blöcken, nach Chunk-Ringen von der Kamera aus; die Auswahl wird nur neu berechnet, wenn sich ein Urteil ändert oder die Kamera den Chunk wechselt.
- HUD am rechten Rand (oben links liegt meist die Minikarte): Prozent richtig, Balken, fehlt/falsch/Zustand/nicht geladen, Fehlerfinder-Zeile.

## Live-Abgleich

Jeder Tick prüft 8 000 Planblöcke reihum (`LiveCheck.sweep`, ca. 160 000/s), nur in der Dimension der Platzierung. Ungeladene Chunks zählen als „nicht geladen“ statt als fehlend; beim Entladen eines Chunks werden seine Blöcke wieder unbekannt. Ohne Mixins, daher robust gegen andere Mods. Zustandstexte werden je Spiel-Blockzustand nur einmal erzeugt (Identitäts-Cache).

## Speicherung

`bauplaner/platzierung.properties`: je Schlüssel (`server:<adresse>` bzw. `welt:<name>`) Plan-Datei, Dimension, Anker, Drehung, Spiegelung, sichtbar. Beim Betreten des Servers/der Welt wird die Platzierung wiederhergestellt.

## Prüfung

- `./gradlew :mod-core:test` (9 Tests: Platzierhilfe-Urteil und Wegauswahl, Materialliste und Ebenen, Zustände, Regeln wie Website, Drehen/Spiegeln von Positionen und Zuständen inkl. Rückweg, Planlesen, Live-Abgleich, Speicher).
- `scripts/test_bridge_ingame.sh` spielt nach der Aufnahme das Hologramm durch: platzieren am angeschauten Block, Fortschritt genau „fehlt 1 · falsch 1“, Fehlerfinder zeigt den Diamantblock, Server setzt den fehlenden Block → ohne Befehl „fehlt 0“, gedreht passt der Plan nicht mehr, zurückgedreht wieder wie vorher, Platzierung gespeichert, Taste J öffnet das Menü; Materialliste „1 × Bruchstein“, Fehlerfinder bleibt in der gewählten Ebene, nach Teilabriss erscheinen die Mauerblöcke als texturierte Geister und in der Materialliste, Num 7 öffnet die Materialliste; Platzierhilfe über den echten Klickweg (`MultiPlayerGameMode.useItemOn`): Bruchstein statt Eichenstamm wird nicht gesetzt und der Stamm aus der Schnellleiste genommen, seitlich angeklickter Stamm wird nicht gesetzt und der Hinweis nennt „auf den Block darunter klicken“, so geklickt steht er aufrecht, Abbauen ist geschützt, nach „warnen“ möglich; Bildschirmfotos `hologramm.png`, `menue.png`, `geister.png`, `material.png`, `platzierhilfe.png` (mit `BAUPLANER_KEEP=<ordner>`). Mit `BAUPLANER_MODPACK_MODS` und `BAUPLANER_SHADERPACK` dasselbe mit Philipps Mods und Complementary-Shader.
- `scripts/test_bridge_ingame_forge.sh neoforge` spielt dieselben Schritte im echten NeoForge-Client (`HologramScenario`): Fortschritt, Fehlerfinder, Drehen, Materialliste, Ebenen, J und Num 7, Platzierhilfe über `Minecraft.startUseItem`/`startAttack` mit dem Fadenkreuzziel; ob die Mod den Klick verworfen hat, hält ein Ereignis-Hörer mit niedrigster Priorität fest. Geprüft wird mit demselben `bridge_gametest.mjs verify`.

## Ebenen und Materialliste (0.3.0)

- Ebenenmodus: „nur eine Ebene“ beginnt an der untersten Ebene mit offener Arbeit; ein türkiser Rahmen markiert sie. Zeichnen, Fehlerfinder, HUD-Zeile „Ebene …: x / y richtig, n offen“ und Materialliste gelten nur für die gewählten Höhen. Verschieben in y nimmt die Ebene mit.
- Materialliste: offen = fehlend oder falscher Block (Zustand falsch braucht kein neues Material). Inventar zählt die eigenen Slots und seit 0.7.0 den Inhalt von Shulkerkisten und Bündeln.

## Platzierhilfe (0.4.0)

Vorbild ist Litematicas „Easy Place“, aber serverkonform: Easy Place verändert Blickrichtung und Klickposition im Paket an den Server, damit der Block richtig herum landet. Das kann Anti-Cheat auslösen und gilt auf manchen Servern als unerlaubt. Der Bauplaner macht das nicht.

- **Vorhersage:** Vor jedem Rechtsklick in den Plan (Fabric `UseBlockCallback`, läuft im Client vor dem Senden) berechnet die Mod mit der Platzierlogik des Spiels selbst (`BlockItem.getPlacementState` über `updatePlacementContext`), welcher Zustand entstehen würde. Damit sind Wandfackeln, Schilder, Stufen zur Doppelstufe, Türen und Stämme abgedeckt, ohne eigene Regeln je Block.
- **Urteil** (`mod-core/PlacementAdvice.judge`, gleiche Regeln wie der Live-Abgleich): richtig → Klick geht normal durch; anderer Block → nicht gesetzt, liegt der richtige in der Schnellleiste, wird er gewählt („nochmal klicken“, bei gehaltener Taste setzt der nächste Wiederholklick); falsche Ausrichtung → nicht gesetzt, Hinweis wie es geht.
- **Ausrichtungsfinder:** Für die Zielstelle probiert die Mod 16 Blickrichtungen × waagerecht/oben/unten × jede feste Nachbarfläche × obere/untere Hälfte mit derselben Platzierlogik durch (Drehung nur rechnerisch, innerhalb eines Ticks zurückgesetzt, nie gesendet). `PlacementAdvice.best` wählt den einfachsten Weg: Haupthimmelsrichtung, wenig drehen, Blickneigung wie jetzt, Block darunter anklicken. Findet sich kein Weg (Zustand hängt von Nachbarn ab, die noch fehlen), wird **nicht** gesperrt, nur gewarnt.
- **Abbauschutz:** Richtig gesetzte Planblöcke lassen sich bei „an“ nicht abbauen (`AttackBlockCallback`).
- **Nie eingegriffen** wird bei geplanter Luft (Gerüst erlaubt), außerhalb des Plans, bei ausgeblendetem Hologramm, in anderer Dimension, mit Nicht-Block-Gegenständen und beim Klick auf Türen, Kisten, Knöpfe usw. (ohne Schleichen).
- **Fadenkreuz-Zeile:** was an der angezielten Stelle hingehört und wie (grün „✓ so setzen“, gelb „Blick nach Osten, auf den Block darunter klicken“, gelb „Num 8 nimmt ihn in die Hand“ / „nicht im Inventar“, rot „falscher Block, erst abbauen“). Zielt der Spieler durch das Hologramm, gilt die erste offene Planstelle auf dem Blickstrahl.
- **Modi:** an / nur warnen / aus, im Menü J, mit `/bauplaner platzierhilfe an|warnen|aus` oder einer frei belegbaren Taste (Standard: keine, alle Nummernblocktasten in der Nähe sind im Modpack belegt). Num 8 nimmt den Planblock in die Hand (nur Schnellleiste; Inventarverschiebungen werden bewusst nicht ausgelöst).
- Jede Meldung steht einmal im `latest.log` als `[Platzierhilfe] …` (für Fehlerberichte und den Spieltest).

## NeoForge, Shader und andere Mods (0.6.0)

- **Ein Client-Kern für beide Loader.** Alles außer der Verdrahtung liegt in `hologram-26.3`. NeoForge nutzt `RegisterKeyMappingsEvent`, `RegisterGuiLayersEvent`, `RegisterClientCommandsEvent`, `ClientTickEvent.Post`, `SubmitCustomGeometryEvent`, `ClientPlayerNetworkEvent` und `ChunkEvent.Unload`. Die Platzierhilfe hängt an `InputEvent.InteractionKeyMappingTriggered`: Das Ereignis kommt in `Minecraft.startUseItem`/`startAttack`/`continueAttack`, bevor `MultiPlayerGameMode` etwas sendet; abgebrochen (ohne Armschwung) gibt es keinen Klick und kein Paket.
- **Shader (Iris, z. B. Complementary Unbound).** Hologramm, Rahmen und Fehlerfinder bleiben sichtbar. Weil die durchscheinenden Geisterblöcke mit Shader-Licht fast wie echte Blöcke aussehen, bekommt jeder texturierte Geist bei aktivem Shaderpaket zusätzlich eine blaue Tönung und hellblaue Kanten (`McCompat.shadersActive`, über `IrisApi` per Reflexion, ohne Abhängigkeit). Getestet mit `BAUPLANER_SHADERPACK=<zip>` in `scripts/test_bridge_ingame.sh`.
- **Tool Switcher.** Die Fabric-Klickhaken laufen in einer eigenen Phase `bauplaner_bridge:platzierhilfe` vor der Standardphase. Ein Klick, den die Platzierhilfe verwirft (z. B. Abbauschutz), erreicht Tool Switcher nicht mehr, das Werkzeug wird also nicht unnötig gewechselt.
- **Tasten.** „Ebene tiefer“ liegt seit 0.5.0 auf Num * statt Num 3 (Jade belegt Num 0–5).

## Bauabschnitte, Röntgensicht, Shulker (0.7.0)

- **Bauabschnitte aus der Website.** Der Plan-Export schreibt die Abschnitte aus dem Tab „Baustelle“ (BUILD-01/06) in die Plandatei: `Metadata.Bauplaner.SectionNames` (Liste in Bauordnung) und `SectionCells` (ein Byte je Zelle der Planbox in Sponge-Reihenfolge, 1-basiert, 0 = kein Abschnitt). Zugehörigkeit wie auf der Website (`sectionOfStep`: Bauteil und Lagenbereich, erster passender Abschnitt). Ältere Pläne ohne Abschnitte laufen unverändert.
- **Ein Filter für alles:** `mod-core/Filter` (Höhen aus dem Ebenenmodus und Abschnitt) gilt für Geisterblöcke, HUD-Zählung, Materialliste und Fehlerfinder; Ebenen und Abschnitt lassen sich kombinieren. Wahl mit Num /, im Menü J (◀ ▶), mit `/bauplaner abschnitt …` oder von der Website (`POST /v1/section`). HUD-Zeile „Abschnitt 2/5 „Erdgeschoss“: 73 % · 12 offen“. Ist ein Abschnitt fertig (alles geladen und richtig), meldet der Chat das einmal und nennt den nächsten offenen; gewechselt wird nur auf Wunsch.
- **Röntgensicht:** Rahmen um offene Blöcke (blau fehlt, rot falsch, gelb Zustand, höchstens 4 000 nächste) in einer eigenen Linien-Pipeline ohne Tiefentest, gebaut aus der Vanilla-Linien-Pipeline wie die durchscheinenden Namensschilder; schlägt das fehl, normale Linien. Einstellung bleibt gespeichert (`roentgen` in `einstellungen.properties`).
- **Shulkerkisten und Bündel:** Materialliste (Spalte „Inventar“) und Platzierhilfe („3 in Shulkerkiste/Bündel“) zählen den Inhalt mit, gelesen aus den Itemdaten, die der Client ohnehin hat.
- **Website-Verbindung:** `GET /v1/status` meldet `hologram.section` und `hologram.sections` (Name, richtig, gesamt); `readLiveStatus` liest beides.

## Nächste Stufen

Gruppen/Sperren aus dem Weltbuilder (MAP-04) in der Mod, Bauabschnitt als Packliste mit Kistenstandorten, Gerüst-Hinweise für hängende Blöcke.

## Testphase: Diagnose und Absturzschutz (0.7.2)

`/bauplaner diagnose` (QA-04, `HologramDiagnose` + `mod-core/Diagnostics`) schreibt einen Bericht nach `bauplaner/diagnose/diagnose-<zeit>.txt` und in die Zwischenablage: Mod, Loader, Minecraft, Java, System, Launcher, Modliste, Shader, jede Bauplaner-Taste mit Konflikten (`KeyMapping.same`), Welt, Hologramm (Plan, Platzierung, Fortschritt, Ebenen, Abschnitt, Texturen, Röntgen, Platzierhilfe), Website-Verbindung, abgefangene Fehler und ein geschwärzter Auszug aus `logs/latest.log`. Der Spieltest führt den Befehl aus und prüft den Bericht.

`HologramClient` führt Tick, Weltzeichnen, HUD und die Klick-Haken der Platzierhilfe geschützt aus: Ein Fehler der Mod beendet das Spiel nicht mehr. Er landet einmal je Art mit Stack im Log (Logger `bauplaner`, Präfix `[Fehler]`), gleiche Fehler in jedem Bild werden nur gezählt (`errors()`), und der erste zeigt einen Chat-Hinweis auf `/bauplaner diagnose`. Klicks laufen bei einem Fehler normal durch (PASS).
