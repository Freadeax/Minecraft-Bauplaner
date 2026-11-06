# Build-Studio-Mod 2.0: Hologramm und Live-Abgleich (GAME-07)

Stand 02.11.2026 · Stufe 1 „Fundament + Hologramm“ (0.2.0, Wahl Philipp) Stufe 2 „Texturen, Material, Ebenen“ (0.3.0) und Stufe 3 „Platzierhilfe“ (0.4.0) Stufe 4 „NeoForge, Shader, andere Mods“ (0.6.0) und Stufe 5 „Bauabschnitte, Röntgensicht, Shulker“ (0.7.0); 0.7.1 Baustand für die Live-Karte (`GET /v1/scan`, [LIVE_LINK](../team/LIVE_LINK.md)), 0.7.2 Testphase (`/bauplaner diagnose`, Absturzschutz), 0.8.0 Live-Protokoll 2 (Zonen, Ebenen, Farben, neue Punktarten, Mitspieler; GAME-08), 0.9.0 große Pläne (SIZE-01), 0.10.0 Teambau (COOP-03). Fabric 26.3 und NeoForge 26.3 mit demselben Client-Kern; die bisherige Aufnahme (`/bauplaner scan`, [MOD_BRIDGE](MOD_BRIDGE.md)) bleibt unverändert erhalten.

## Grundsätze

- **Reiner Client.** Kein zusätzliches oder verändertes Paket an den Server (die Platzierhilfe lässt einen normalen Klick durch oder verwirft ihn vorher, und wählt höchstens einen Schnellleistenplatz wie eine Zifferntaste), keine Weltänderung, kein automatisches Bauen („Printer“), kein Teleport. Funktioniert damit auf jedem Server, auch ohne Plugin und ohne Rechte. Einzige Ausnahme seit 0.10.0: der Teamkanal `bauplaner:team` – nur wenn der Server ihn selbst anbietet (Build-Studio-Plugin) **und** der Spieler ihn mit `/bauplaner team erlauben` für diesen Server eingeschaltet hat (Entscheidung Philipp 03.11.2026, [TEAMBAU §7](../team/TEAMBAU.md)).
- **Keine Abhängigkeiten** außer Fabric API bzw. NeoForge: kein WorldEdit, kein Litematica, keine eigenen Shader. Gezeichnet wird mit Vanilla-Rendertypen (`debugQuads`, `lines`) über `LevelRenderEvents.COLLECT_SUBMITS` (Fabric) bzw. `SubmitCustomGeometryEvent` (NeoForge), damit Sodium und Iris nichts ersetzen müssen.
- **Eine Wahrheit für den Vergleich.** `BlockRules.compare` ist eine Portierung von `compareBlock`/`ignoredProperties` aus `packages/domain/src/building/gameCheck.ts`: Ergebnis im Spiel = Ergebnis der Website.

## Aufbau

| Teil | Inhalt |
|---|---|
| `mod-core/` (Java 21, ohne Minecraft) | `BlockState` (Text `id[k=v]`, sortiert), `BlockRules` (OK/STATE/MISSING/WRONG/UNKNOWN), `Placement` (Anker, Viertel­drehungen im Uhrzeigersinn, Spiegelung der x-Achse vor dem Drehen; Positionen und Zustände: facing, axis, rotation 0–15, Schienenformen, Jigsaw-Ausrichtung, Seiten-Eigenschaften, Tür-Scharnier, Treppenform, Kistentyp), `PlanModel` (liest die exportierte `.schem` inkl. `Metadata.Bauplaner.ProjectMin`), `LiveCheck` (Urteil je Planblock, Chunk-Index, Runden-Abgleich, nächster Fehler), `PlacementStore` (`bauplaner/platzierung.properties` je Server/Welt). 7 JUnit-Tests |
| `mod-core/.../Materials.java` | Materialliste: je Block offen/gesamt; Türen, hohe Pflanzen und Betten zählen einmal, Doppelstufen zwei Stufen; optional nur bestimmte Höhen (Ebenen) |
| `hologram-26.3/` (nur Vanilla-Klassen, von Fabric und NeoForge als Quellordner eingebunden) | `HologramClient` (Fassade: Tick, Zeichnen, HUD, Tasten, Befehle, Klicks, Welt betreten/verlassen), `Hologram*.java`, `PlanScreen`, `MaterialScreen`, `GhostModels`, `PlacementAssist`, `McCompat`, Sprachdateien |
| `fabric-26.3/.../BridgeClient.java`, `neoforge-26.3/.../BridgeNeoForge.java` | nur die Verdrahtung mit den Ereignissen des Loaders; sonst kein eigener Code je Loader |

## Bedienung

| Taste (änderbar unter Steuerung → „Build Studio“; Standard so gewählt, dass Xaero, Simple Voice Chat, Iris und Jade aus Philipps Modpack nicht kollidieren) | Wirkung |
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
- `scripts/mod/test_bridge_ingame.sh` spielt nach der Aufnahme das Hologramm durch: platzieren am angeschauten Block, Fortschritt genau „fehlt 1 · falsch 1“, Fehlerfinder zeigt den Diamantblock, Server setzt den fehlenden Block → ohne Befehl „fehlt 0“, gedreht passt der Plan nicht mehr, zurückgedreht wieder wie vorher, Platzierung gespeichert, Taste J öffnet das Menü; Materialliste „1 × Bruchstein“, Fehlerfinder bleibt in der gewählten Ebene, nach Teilabriss erscheinen die Mauerblöcke als texturierte Geister und in der Materialliste, Num 7 öffnet die Materialliste; Platzierhilfe über den echten Klickweg (`MultiPlayerGameMode.useItemOn`): Bruchstein statt Eichenstamm wird nicht gesetzt und der Stamm aus der Schnellleiste genommen, seitlich angeklickter Stamm wird nicht gesetzt und der Hinweis nennt „auf den Block darunter klicken“, so geklickt steht er aufrecht, Abbauen ist geschützt, nach „warnen“ möglich; Bildschirmfotos `hologramm.png`, `menue.png`, `geister.png`, `material.png`, `platzierhilfe.png` (mit `BAUPLANER_KEEP=<ordner>`). Mit `BAUPLANER_MODPACK_MODS` und `BAUPLANER_SHADERPACK` dasselbe mit Philipps Mods und Complementary-Shader.
- `scripts/mod/test_bridge_ingame_forge.sh neoforge` spielt dieselben Schritte im echten NeoForge-Client (`HologramScenario`): Fortschritt, Fehlerfinder, Drehen, Materialliste, Ebenen, J und Num 7, Platzierhilfe über `Minecraft.startUseItem`/`startAttack` mit dem Fadenkreuzziel; ob die Mod den Klick verworfen hat, hält ein Ereignis-Hörer mit niedrigster Priorität fest. Geprüft wird mit demselben `bridge_gametest.mjs verify`.

## Ebenen und Materialliste (0.3.0)

- Ebenenmodus: „nur eine Ebene“ beginnt an der untersten Ebene mit offener Arbeit; ein türkiser Rahmen markiert sie. Zeichnen, Fehlerfinder, HUD-Zeile „Ebene …: x / y richtig, n offen“ und Materialliste gelten nur für die gewählten Höhen. Verschieben in y nimmt die Ebene mit.
- Materialliste: offen = fehlend oder falscher Block (Zustand falsch braucht kein neues Material). Inventar zählt die eigenen Slots und seit 0.7.0 den Inhalt von Shulkerkisten und Bündeln.

## Platzierhilfe (0.4.0)

Vorbild ist Litematicas „Easy Place“, aber serverkonform: Easy Place verändert Blickrichtung und Klickposition im Paket an den Server, damit der Block richtig herum landet. Das kann Anti-Cheat auslösen und gilt auf manchen Servern als unerlaubt. Das Build Studio macht das nicht.

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
- **Shader (Iris, z. B. Complementary Unbound).** Hologramm, Rahmen und Fehlerfinder bleiben sichtbar. Weil die durchscheinenden Geisterblöcke mit Shader-Licht fast wie echte Blöcke aussehen, bekommt jeder texturierte Geist bei aktivem Shaderpaket zusätzlich eine blaue Tönung und hellblaue Kanten (`McCompat.shadersActive`, über `IrisApi` per Reflexion, ohne Abhängigkeit). Getestet mit `BAUPLANER_SHADERPACK=<zip>` in `scripts/mod/test_bridge_ingame.sh`.
- **Tool Switcher.** Die Fabric-Klickhaken laufen in einer eigenen Phase `bauplaner_bridge:platzierhilfe` vor der Standardphase. Ein Klick, den die Platzierhilfe verwirft (z. B. Abbauschutz), erreicht Tool Switcher nicht mehr, das Werkzeug wird also nicht unnötig gewechselt.
- **Tasten.** „Ebene tiefer“ liegt seit 0.5.0 auf Num * statt Num 3 (Jade belegt Num 0–5).

## Bauabschnitte, Röntgensicht, Shulker (0.7.0)

- **Bauabschnitte aus der Website.** Der Plan-Export schreibt die Abschnitte aus dem Tab „Baustelle“ (BUILD-01/06) in die Plandatei: `Metadata.Bauplaner.SectionNames` (Liste in Bauordnung) und `SectionCells` (ein Byte je Zelle der Planbox in Sponge-Reihenfolge, 1-basiert, 0 = kein Abschnitt). Zugehörigkeit wie auf der Website (`sectionOfStep`: Bauteil und Lagenbereich, erster passender Abschnitt). Ältere Pläne ohne Abschnitte laufen unverändert.
- **Ein Filter für alles:** `mod-core/Filter` (Höhen aus dem Ebenenmodus und Abschnitt) gilt für Geisterblöcke, HUD-Zählung, Materialliste und Fehlerfinder; Ebenen und Abschnitt lassen sich kombinieren. Wahl mit Num /, im Menü J (◀ ▶), mit `/bauplaner abschnitt …` oder von der Website (`POST /v1/section`). HUD-Zeile „Abschnitt 2/5 „Erdgeschoss“: 73 % · 12 offen“. Ist ein Abschnitt fertig (alles geladen und richtig), meldet der Chat das einmal und nennt den nächsten offenen; gewechselt wird nur auf Wunsch.
- **Röntgensicht:** Rahmen um offene Blöcke (blau fehlt, rot falsch, gelb Zustand, höchstens 4 000 nächste) in einer eigenen Linien-Pipeline ohne Tiefentest, gebaut aus der Vanilla-Linien-Pipeline wie die durchscheinenden Namensschilder; schlägt das fehl, normale Linien. Einstellung bleibt gespeichert (`roentgen` in `einstellungen.properties`).
- **Shulkerkisten und Bündel:** Materialliste (Spalte „Inventar“) und Platzierhilfe („3 in Shulkerkiste/Bündel“) zählen den Inhalt mit, gelesen aus den Itemdaten, die der Client ohnehin hat.
- **Website-Verbindung:** `GET /v1/status` meldet `hologram.section` und `hologram.sections` (Name, richtig, gesamt); `readLiveStatus` liest beides.

## Nächste Stufen

Packliste und Gerüst-Hinweise kamen mit 0.13.0, Gruppen und Sperren mit 0.19.0 (Abschnitte unten).

## Testphase: Diagnose und Absturzschutz (0.7.2)

`/bauplaner diagnose` (QA-04, `HologramDiagnose` + `mod-core/Diagnostics`) schreibt einen Bericht nach `bauplaner/diagnose/diagnose-<zeit>.txt` und in die Zwischenablage: Mod, Loader, Minecraft, Java, System, Launcher, Modliste, Shader, jede Build-Studio-Taste mit Konflikten (`KeyMapping.same`), Welt, Hologramm (Plan, Platzierung, Fortschritt, Ebenen, Abschnitt, Texturen, Röntgen, Platzierhilfe), Website-Verbindung, abgefangene Fehler und ein geschwärzter Auszug aus `logs/latest.log`. Der Spieltest führt den Befehl aus und prüft den Bericht.

`HologramClient` führt Tick, Weltzeichnen, HUD und die Klick-Haken der Platzierhilfe geschützt aus: Ein Fehler der Mod beendet das Spiel nicht mehr. Er landet einmal je Art mit Stack im Log (Logger `bauplaner`, Präfix `[Fehler]`), gleiche Fehler in jedem Bild werden nur gezählt (`errors()`), und der erste zeigt einen Chat-Hinweis auf `/bauplaner diagnose`. Klicks laufen bei einem Fehler normal durch (PASS).

## Live-Protokoll 2 (0.8.0, GAME-08)

Weltplan-Schema 2 von der Website im Spiel ([LIVE_LINK](../team/LIVE_LINK.md#protokoll-2-game-08-mod-080)): Zonen als durchscheinender Teppich auf Bodenhöhe mit Rand, Bauplätze/Wege/Punkte mit eigener Farbe, fünf neue Punktarten (Notiz, Gefahr, Rohstoff, Spawn/Bett, Aussicht), HUD-Zeile mit der Zone am Standort, `/bauplaner ebenen` zum Ein-/Ausblenden benannter Ebenen, `GET /v1/players` für die Mitspieler auf der Karte, `hello.protocol` 2 mit `features` scan, marks2, players. Der Spieltest schickt Zone und Gefahr-Punkt auf einer Ebene, fragt die Mitspieler ab und liest die Ebenenliste im Chat.

## Große Pläne (0.9.0, SIZE-01)

Planbox bis 16,7 Mio. Zellen und 4 Mio. Blöcke, Übertragung von der Website bis 64 MB (Fähigkeit `bigplans`). Der Plan wird einmal entpackt, `LiveCheck` braucht rund 30 Byte je Block (keine HashMap je Block), große Pläne und das Verschieben großer Hologramme werden im Thread „Build-Studio-Planlader“ vorbereitet, der Baustand liest in Scheiben. Bauabschnitte kommen als Läufe (`SectionRuns`), alte Dateien mit `SectionCells` gehen weiter. Render-Budget mit `/bauplaner leistung niedrig|normal|hoch` (15 000 / 30 000 / 60 000 offene Blöcke im Umkreis von 72); greift es, zeigt die Anzeige „Zeigt die nächsten …“. Die Diagnose nennt Planbox, Chunks, Leistung und Java-Speicher. Einzelheiten und Messwerte: [SIZE_LIMITS](../kern/SIZE_LIMITS.md).

## Teambau (0.10.0, COOP-03)

Die Mod zeigt den Teamstand im Spiel und meldet aus dem Spiel. Das vollständige Protokoll steht in [TEAMBAU §7](../team/TEAMBAU.md).

- **Quelle des Teamstands.** Der Planer schickt ihn über „Mit Spiel abgleichen“ (`POST /v1/team`). Ist der Kanal erlaubt, kommt er vom Paper-Plugin. Abschnitte ordnet die Mod über `SectionIds`/`TeamId` der Plandatei zu, bei älteren Plänen über eindeutige Namen.
- **Darstellung.**
  - Abschnittsrahmen in der Farbe des Inhabers, eigene dicker. Frei ist grün, gemeldet cyan, bestätigt grau, Nacharbeit rot.
  - Lagerkisten (vom Plugin) nach Prüfstatus und Notizpfosten.
  - HUD unten rechts: Team und Weg zum Server, „Hier: Abschnitt …“, „Mein Auftrag … % · offen“ und die nächste Notiz.
- **Befehle `/bauplaner team …`:**
  - `abschnitte`, `nehmen <nr>`, `abgeben`, `fertig [nr] [notiz]`, `pruefen <nr> ok|nacharbeit` und `zuweisen <nr> <spieler>`
  - `zeigen <nr>`, `mein`, `frei` und `alle` (Abschnittsmaske im Hologramm, gilt auch für Materialliste und Fehlersuche)
  - `material [spieler]` und `notiz <art> <text>`, `notizen`, `erledigt <id>`
  - `geliefert hand|<item> <menge>`, `sammle` und `lager`
  - `erlauben`, `verbieten`, `status`, `korb [leeren]`, `rahmen` und `anzeige`
- **Ausgang.** Eigene Meldungen liegen in `bauplaner/team/<server>.ausgang.json`, bis Planer oder Plugin sie quittieren. Das Spiel zeigt sie sofort als vorläufigen Stand. Die Erlaubnis je Server steht in `bauplaner/team/erlaubt.properties`.
- **Prüfung.**
  - JUnit `TeamTest`: Teamstand, vorläufiger Stand, Planzuordnung, Rahmen und Stücke, und dass ohne Ankündigung und Erlaubnis nichts gesendet wird.
  - `LiveLinkTest`: Merkmal `team`, Schlüssel für alle Teamwege.
  - Spieltest Fabric: Teamstand vom Planer, `nehmen 2`, `mein`, die Übernahme im Ausgang als Ereignis von „Ich bin“, und ohne Plugin 409 `team-plugin-fehlt`.
  - Echter Paper-26.3-Servertest mit eingeschaltetem Kanal.

## Befehlsseite (0.11.0, GAME-10)

Im Plan-Menü (J) führt „Befehle & Status“ zu einer Seite, auf der alle Befehle der Mod und des Paper-Plugins per Klick laufen. `/bauplaner befehle` öffnet sie direkt.

- **Katalog.** `mod-core/commands/CommandCatalog` beschreibt jeden Befehl einmal: Gruppe, Beschriftung, Pfad, Eingaben (Abschnitt, Zahl, Wort, Text, Spieler, Auswahl, Item) und Voraussetzung (Plan, Team, Plugin, Bauleitung, Kiste). Der Katalog prüft die Eingaben und baut daraus genau den Befehl, den man eintippen würde. `CommandCatalogTest` hält ihn mit den Befehlen von Mod und Plugin abgeglichen; die Plugin-Befehle liest der Test aus `TeamModule.COMMANDS` und `StorageModule.SUBCOMMANDS`, ein neuer Plugin-Befehl ohne Knopf lässt ihn fehlschlagen.
- **Mod oder Server.** Mod-Befehle laufen als `/bauplaner …`. Plugin-Befehle laufen über den Alias `/bp …`, weil die Mod `/bauplaner` selbst belegt. Ein Klick sendet über `connection.sendCommand` dasselbe Befehlspaket wie das Eintippen; es gibt kein zusätzliches Paket an den Server.
- **Ausgegraut.** Ob der Server das Plugin hat, liest die Seite aus dem Befehlsbaum (`bp` vorhanden). Unterbefehle sieht der Client bei Paper nicht, Rechte prüft der Server und antwortet selbst. Bauleitungs-Knöpfe richten sich nach der Rolle im Teamstand, Kisten-Knöpfe werden erst aktiv, wenn man auf einen Behälter in Reichweite schaut. Der Grund steht im Tooltip.
- **Status.** Plan, Fortschritt, Filter, Platzierhilfe, Teamkanal, Team, eigener Auftrag, Lager, Server mit oder ohne Plugin und Website-Verbindung. Die Seite aktualisiert sich alle halbe Sekunde.
- **Antworten.** `ReplyLog` sammelt die eigenen „[Build Studio]“-Zeilen und für 4 s nach einem Serverbefehl von der Seite alle Systemzeilen des Servers (Fabric `ClientReceiveMessageEvents.GAME`, NeoForge `ClientChatReceivedEvent.System`).
- **Kleine Fenster.** Ab 520 GUI-Pixeln Breite steht der Status links neben den Knöpfen, darunter nur im Reiter „Status“ über den Knöpfen. Mehr Knöpfe als Platz werden geblättert (◀ ▶ unten links).
- **Prüfung.** JUnit `CommandCatalogTest`; Spieltest Fabric mit echten Mausklicks (Reiter Team, „Übersicht“, „Abschnitt zeigen 2“, Antworten auf der Seite, Serverknöpfe im Einzelspieler ausgegraut); NeoForge-Szenario öffnet die Seite und führt einen Befehl aus.


## Stufe 6 und Protokoll 3 (0.13.0, GAME-07/GAME-08)

- **Packliste.** `/bauplaner packliste` rechnet für den gezeigten Teil des Plans (Filter, Abschnitt, Ebene): offenes Material minus das, was man trägt (mit Shulkerkisten und Bündeln), in Stapeln (Stapelgröße je Item, z. B. 16 für Schilder), Shulkerkisten und freien Inventarplätzen. Liegt ein Item in einer Team-Lagerkiste (COOP-04), nennt die Liste die nächste Kiste zuerst mit Lage und Entfernung (`mod-core/PackList`).
- **Gerüst.** `/bauplaner geruest` findet offene Blöcke, die man gerade nicht setzen kann: Teile des Plans, die nirgends an etwas Stehendes stoßen (Ausbreitung über benachbarte offene Planblöcke ab jedem Block mit festem Nachbarn; nicht erreichte hängen), und fallende Blöcke (Sand, Kies, Trockenbeton, Ambosse …) ohne Halt darunter. Der Zeiger springt auf den nächsten (`mod-core/Scaffold`). Ungeladene Chunks zählen als möglicher Halt.
- **Markieren für die Weltkarte.** `/bauplaner markieren <art> [name]`, `/bauplaner markierungen [loeschen <nr>]`; Ablauf und Routen in [LIVE_LINK.md](../team/LIVE_LINK.md), Abschnitt Protokoll 3.
- **Prüfung.** JUnit `StageSixTest`, `GameMarksTest`, `LiveLinkTest`; Spieltest Fabric und NeoForge führen alle vier Befehle aus und prüfen die Antworten (`scripts/mod/bridge_gametest.mjs`); Browser `tests/e2e/map-depth.e2e.mjs` übernimmt Punkte aus dem Simulator, ohne Doppelte, und macht die Übernahme rückgängig.
- **Erledigt mit 0.19.0.** Gruppen/Sperren aus dem Weltbuilder im Hologramm (GAME-07-S11, Abschnitt „Stufe 6b“).

## Bauhilfen: Symmetrie und Kurven (EDIT-04)

- **Was.** Beim Bauen von Hand zeigt die Mod Geisterblöcke für Spiegelbilder und Kurven, wie die Werkstatt des Planers ([CREATIVE_TOOLS.md](../planer/CREATIVE_TOOLS.md)). Nur Client: Die Mod setzt nie einen Block, sendet nichts an den Server und braucht kein Plugin.
- **Symmetrie.** `/bauplaner symmetrie x|z` (Spiegeln Ost/West, Nord/Süd, je an/aus), `symmetrie drehen 1|2|4`, `symmetrie hier` (Achse durch die Mitte des angeschauten Blocks), `symmetrie kante` (Achse auf die Ecke: gerade Breiten), `symmetrie aus`. Beim ersten Einschalten liegt die Achse am angeschauten Block. Jeder Block, den der Spieler danach setzt (Rechtsklick mit einem Block, zwei Ticks später in der Welt gesehen), wird Quelle; seine Bilder erscheinen mit gedrehtem Zustand. Wer auf einen Geist baut, folgt der Hilfe und erzeugt keine neue Quelle. Abbauen einer Quelle nimmt ihre Geister weg; schon gesetzte Gegenstücke bekommen einen roten „abbauen“-Rahmen, bis sie weg sind. Höchstens 4096 Quellen im Umkreis von 256 Blöcken um die Achse.
- **Kurven.** `/bauplaner kurve punkt` setzt einen Punkt dort, wo ein Block hinkäme (Fadenkreuz; ersetzbare Pflanzen werden übersprungen); der Block in der Hand wird Kurvenblock (`kurve block`). `kurve profil rohr|weg|mauer`, `breite`, `hoehe`, `radius`, `geschlossen`, `glatt <0–100>`, `versetzen <dy>`, `zurueck`, `loeschen`. Die Punkte erscheinen als türkise Würfel, die Kurve als Linie, die Zellen als Geister; bei aktiver Symmetrie auch gespiegelt. Höchstens 64 Punkte und 60 000 Zellen.
- **Als Plan.** `/bauplaner bauhilfe alsplan [name]` (auch `kurve alsplan`) schreibt die Geister als Plan (`mod/edit/GuidePlan`, Sponge v3 mit Build-Studio-Metadaten, Projektursprung = untere Ecke) nach `bauplaner/plans/` und blendet ihn ein: Materialliste, Platzierhilfe, Fortschritt und Aufnahme wie bei einem Website-Plan. Die Datei lässt sich auf der Website als `.schem` importieren.
- **Anzeige.** Geister mit Texturen (wie Planblöcke), andere Blöcke rot, falsche Ausrichtung gelb; Gras, Schnee und Wasser zählen als frei. HUD über der Schnellleiste: Modus, Kurve und „gesetzt / gesamt“. Zwei Tasten, ab Werk unbelegt: „Bauhilfe: Kurvenpunkt setzen“ und „Bauhilfe: Symmetrieachse hier“. Befehlsseite (J → „Befehle & Status“) Reiter „Bauhilfen“.
- **Grenzen.** Die Bauhilfen gelten in einer Dimension und gehen beim Neustart verloren (nur im Speicher); „als Plan“ hält sie fest. Blöcke, die andere Spieler setzen, werden nicht gespiegelt.
- **Prüfung.** JUnit `EditGuidesTest` (gleiche Zellen, Gruppen, Bilder und Zustände wie der Planer über `fixtures/edit/mod-edit-vectors.json`; Quellen, Folgen, Abbauen, 4-fach mit Kurve, Plan lesbar über `PlanModel`), Befehlsseite `CommandCatalogTest`.

## Stufe 6b: Gruppen und Sperren aus dem Weltbuilder (0.19.0, GAME-07-S11)

Auslöser: Roadmap Block 2 (06.11.2026, MAP-04 „benannte Gruppen und Sperren mit Schemaerweiterung, abgestimmt mit der Mod“). Der Weltplan hat dafür Schema 3 (`group`, `locked` an jedem Eintrag, [WORLD_BUILDER.md](../welt/WORLD_BUILDER.md)); die Mod liest beides mit `POST /v1/marks` und merkt es in `markierungen.json`, also auch ohne offene Website.

- **Flächen.** `mod-core/live/MarkAreas` macht aus Bauplätzen (Rechteck), Zonen (Polygon, Mittelpunktregel wie `insideZone`) und Wegen (Mittellinie mit halber Breite, quadratischer Pinsel wie `pathColumns`) eine Spaltenprüfung `contains(x, z)` mit Begrenzungsrahmen vorab. Punkte haben keine Fläche.
- **Gesperrt = grau.** Offene Planblöcke in gesperrten Flächen zeichnet `HologramRenderer` als graue Kästen (keine Texturgeister, keine Röntgenrahmen); `PlacementAssist` greift dort nicht ein (kein Blockwechsel, kein Abbauschutz, Zielzeile „gesperrter Bereich im Weltplan, Platzierhilfe ruht“), der Fehlerfinder (`Hologram.finderFilter`) überspringt sie. Fortschritt und Material zählen sie weiter mit; das HUD nennt „N gesperrt (grau)“.
- **Gruppe als Filter.** `Filter` hat eine Komponente `area` (null = keine Grenze, `within(...)` verknüpft). `Hologram.filter()` = Ebene ∧ Abschnitt ∧ gewählte Gruppe ∧ ¬ausgeblendete Gruppen, nur wenn die Markierungen aus der Dimension des Plans stammen. Damit folgen Hologramm, HUD, Materialliste, Packliste, Gerüst und Fehlerfinder automatisch. `LiveCheck.count` nimmt den schnellen Weg über Abschnittssummen nur ohne Fläche.
- **Bedienung.** `/bauplaner gruppe` (Liste mit Anzahl, gewählter Gruppe, gesperrten Planblöcken), `/bauplaner gruppe <name>`, `… alle`, `… aus <name>`, `… an <name>` (ausgeblendet = Markierungen und Hologramm darin weg; nicht gespeichert, wie Ebenen). Planmenü (J): Zeile „Gruppe: …“ (weiterschalten) und „Alle“. Befehlsseite: fünf Knöpfe in „Verbindung“. Markierungen gesperrter Einträge sind grau, die Zonenzeile im HUD nennt Gruppe und „gesperrt“.
- **Website.** Merkmal `groups`; `POST /v1/group {group: name|null}` (400 bei unbekannter Gruppe), Status `hologram.group` und `hologram.locked` (Planblöcke des gezeigten Teils in gesperrten Flächen). Die Spielverbindung zeigt „Weltplan-Gruppen im Spiel“ mit Knöpfen je Gruppe ([LIVE_LINK.md](../team/LIVE_LINK.md)).
- **Prüfung.** JUnit `MarkAreasTest` (Schema 3 lesen, Flächen, Filter mit Fläche, Fehlerfinder ohne Sperre), `LiveLinkTest` (Merkmal, Route braucht Schlüssel), `CommandCatalogTest`; Spieltest Fabric: gesperrter Bauplatz „Markt“ über dem ganzen Plan, Website wählt die Gruppe, `locked` = alle Blöcke des gezeigten Abschnitts, unbekannte Gruppe 400, `/bauplaner gruppe` im Chat, Bildschirmfoto `gruppe.png` (`scripts/mod/bridge_gametest.mjs`); Browser `tests/e2e/world-groups.e2e.mjs` gegen den Simulator.


## Einfache Bedienung, Deutsch und Englisch (0.23.0, GAME-12)

- **Sprache:** `mod-core/.../Lang.java` hält die Sprache der Mod (auto = Spielsprache aus `options.languageCode`, jeden Tick nachgeführt; oder fest per `/bauplaner sprache deutsch|englisch|auto`). Jeder Text der Mod steht als `t("Deutsch", "English")` im Code, so kann keine Sprache vergessen werden. Texte an die Website (`statusText` für `/v1/…`, `link().label`, HTTP-Fehler) bleiben deutsch, weil der Planer deutsch ist; fürs Spiel gibt es `text()`/`statusLine()`.
- **Befehle:** Der Befehlsbaum wird einmal deutsch gebaut; `hologram-26.3/.../CommandLang.java` hängt ihn unter `/bauplaner` und `/buildplanner` und legt zu jedem deutschen Wort aus `mod-core/.../commands/CommandWords.java` einen englischen Zwilling mit denselben Kindern an (gemischte Zeilen gehen). `LangLiteral.listSuggestions` schlägt nur Wörter der aktuellen Sprache vor; das andere Wort nur, wenn es als einziges zum Getippten passt. `createBuilder()` behält die Klasse, damit Fabric (`ClientCommands`, kopiert den Baum für die Vorschläge) und NeoForge sie nicht verlieren. **Neues `literal("…")` ⇒ Wort in `CommandWords` eintragen** (oder in `SAME`, wenn es in beiden Sprachen gleich ist) – `CommandWordsTest` liest alle Quellen und schlägt sonst fehl; der Spieltest prüft zusätzlich `CommandLang.untranslated` im echten Baum.
- **Katalog:** `CommandCatalog` (Befehlsseite) hat englische Titel/Hilfen in `CommandCatalogEn` (Test: jeder Eintrag übersetzt). `CommandExport` schreibt den Katalog als `apps/web/src/views/mod/modCommands.json` für die Befehlsliste auf #/mod; `CommandExportTest` schlägt fehl, wenn die Datei veraltet ist (`BAUPLANER_WRITE_COMMANDS=1 ./gradlew :mod-core:test` schreibt sie neu).
- **Meldungen:** `McCompat.chat` = Rückmeldung → Karte oben rechts (`Toasts`: 200 ms rein, 240 ms raus, Fehler rütteln, gleiche Meldung ×N, höchstens 4) und eine Zeile im Log (für den Spieltest); im Modus `chat`/`beides` auch in den Chat. `McCompat.chatLine` = Liste, die der Spieler abgefragt hat → immer Chat. Einstellung `meldungen` in `bauplaner/oberflaeche.properties` (getrennt von `einstellungen.properties` des Hologramms).
- **Anzeigen:** `HudCard` ist der gemeinsame Kartenstil (Farben UI-03 „Werkbank“: Akzent #7fd494, Gold #e9c46a, Fläche #1a2220, Warnung #f0b45a, Fehler #ff8a7a, dunkle Unterkante wie ein Block). Das Baufenster oben rechts (`HologramHud`) rückt unter die Meldungskarten; Team- und Weltplan-Anzeige unten rechts stapelt `HudCard.bottomRight` von der Hotbar aufwärts. `anzeige kompakt|ausfuehrlich|aus`. Quelle der Werte ist der Abschnitt „Design-System (UI-03)“ in `docs/architecture/planer/UI.md`; ändert sich dort ein Farbwert, `HudCard` mitziehen.
- **Menü J:** `PlanScreen` ist eine Seitenleiste (200 ms Einfahren, ohne Unschärfe) mit Reitern Plan, Position, Ansicht, Optionen (englisch Plan, Move, View, Options). Knöpfe außerhalb des Fensters sind während des Einfahrens unsichtbar (26.3 bricht sonst mit „Scissor size must be >0“ ab, wenn ein zu langer Knopftext außerhalb des Bildschirms zugeschnitten wird); Knopftexte werden mit Rand gekürzt.
- **Spieltest:** startet mit `/bauplaner sprache deutsch` (der Testclient läuft en_us) und endet mit `ui()`: Meldungskarten, deutsche und englische Vervollständigung (`ClientCommands.getActiveDispatcher` / `connection.getCommands`), englisches Menü, Bilder `meldungen.png`, `menue-einstellungen.png`, `menue-en.png`; `bridge_gametest.mjs verify` prüft `ui.json`.
