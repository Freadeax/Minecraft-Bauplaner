# Bauplaner-Brücke (Minecraft-Mod)

Liest den Bereich eines Bauplans aus der Welt und schreibt eine **Aufnahme**, die die Website im Tab „Bauen“ importiert. Daraus entsteht der Fortschritt je Bauschritt („im Spiel bestätigt / teilweise / abweichend“). Konzept und Format: [MOD_BRIDGE](../../docs/architecture/MOD_BRIDGE.md).

Die Brücke ist **nur lesend**: Sie setzt und entfernt keine Blöcke und sendet nichts ins Internet. Als Fabric-Mod läuft sie im Einzelspieler und auf Mehrspieler-Servern als reine Client-Mod; als Paper-Plugin (Abschnitt „Paper-Server“) läuft sie auf dem Server und liest die ganze Serverwelt.

## Stand

| Teil | Stand |
|---|---|
| `core/` (reines Java 21, ohne Minecraft) | Plan lesen, Aufnahme in Scheiben, Aufnahme-Datei schreiben, Anker je Welt/Server merken. 6 JUnit-Tests und sprachübergreifende Prüfung mit Website und Python-Leser bestanden (`scripts/test_bridge.sh`) |
| `paper/` (Paper-Server-Plugin, eine .jar für Minecraft 1.18.2 bis 26.3, Java ≥ 17) | Liest auf dem Server die ganze Planbox, lädt vorhandene Chunks kurz nach, erzeugt nie Gelände. Auf echten Paper-Servern 1.18.2, 1.20.6, 1.21.4, 1.21.11 und 26.3 automatisch geprüft (`scripts/test_bridge_paper.sh`, 01.11.2026). Versionsabhängige Aufrufe in `PaperCompat.java` |
| `mod-core/` (reines Java 21, ohne Minecraft) | Mod 2.0 (GAME-07): Blockzustände, Vergleichsregeln wie die Website, Platzierung mit Drehen/Spiegeln, Planmodell, Live-Abgleich, Platzierungsspeicher, Materialliste. 8 JUnit-Tests. Konzept: [MOD_HOLOGRAM](../../docs/architecture/MOD_HOLOGRAM.md) |
| `core/.../session/` | Gemeinsame Befehlslogik `BridgeSession` (plan, anker, scan, status …) und Schnittstelle `BridgeHost` zum Spiel; NeoForge, Forge und das Paper-Plugin nutzen sie, damit alle Loader gleich reagieren. 3 JUnit-Tests mit einem nachgebauten Spiel |
| `client-26.3/` (nur Vanilla-Klassen, kein eigenes Gradle-Projekt) | `ClientHost` und der `/bauplaner`-Befehlsbaum für den Client, unverändert von NeoForge und Forge eingebunden; dazu der gemeinsame Spieltest `ClientScenario` |
| `neoforge-26.3/` (Minecraft 26.3, NeoForge ≥ 26.3.0, Java 25) | Gebaut und im echten 26.3-Client automatisch durchgespielt (`scripts/test_bridge_ingame_forge.sh neoforge`, 01.11.2026). Reine Client-Mod, braucht keine weiteren Mods |
| `forge-26.3/` (Minecraft 26.3, Forge ≥ 66, Java 25) | Gebaut und lädt im echten 26.3-Client; der automatische Durchlauf (`scripts/test_bridge_ingame_forge.sh forge`) bleibt in der kopflosen Cloud-Umgebung im Ladebildschirm stehen, die Spielprüfung ist daher noch offen und die .jar noch nicht auf der Download-Seite. Reine Client-Mod (`clientSideOnly`), braucht keine weiteren Mods |
| `fabric-26.3/` (Minecraft 26.3, Fabric Loader ≥ 0.19.5, Fabric API 0.164.0+26.3, Java 25) | Gebaut und im echten 26.3-Client automatisch durchgespielt, auch zusammen mit allen 21 Mods aus Philipps Modpack (`scripts/test_bridge_ingame.sh`, 01.11.2026). Mehrspieler-Abnahme auf einem echten Server steht aus. Alle versionsabhängigen Aufrufe stehen in `McCompat.java` |

## Bauen

Voraussetzung: JDK 25 (für den Fabric-Teil), Internetzugang zu `maven.fabricmc.net` und den Mojang-Servern.

```
cd mods/bauplaner-bridge
./gradlew :core:test :mod-core:test          # Kerne, brauchen nur Maven Central
./gradlew -PwithFabric :fabric-26.3:build    # Mod-.jar unter fabric-26.3/build/libs/
./gradlew -PwithPaper :paper:build          # Paper-Plugin unter paper/build/libs/, braucht repo.papermc.io
./gradlew -PwithNeoForge :neoforge-26.3:build
./gradlew -PwithForge :forge-26.3:build
```

NeoForge und Forge brauchen zusätzlich `maven.neoforged.net` bzw. `maven.minecraftforge.net`; fehlende Java-Versionen (Forge startet seinen Entwicklungsclient über Java 8) lädt Gradle über den foojay-Toolchain-Dienst selbst.

Unter Windows `gradlew.bat` statt `./gradlew`.

Paper-Servertest (lädt echte Paper-Server, JDK 21 und für 26.x JDK 25):

```
npm run build:core
scripts/test_bridge_paper.sh               # alle Versionen aus paper/gradle.properties
scripts/test_bridge_paper.sh 26.3          # nur eine
```

## Spieltest

```
npm run build:core
scripts/test_bridge_ingame.sh                                   # echter Client, nur die Mod
BAUPLANER_MODPACK_MODS=<instanz>/mods scripts/test_bridge_ingame.sh   # zusammen mit einem Modpack
```

Für NeoForge und Forge: `scripts/test_bridge_ingame_forge.sh neoforge` bzw. `… forge`. Ein Testmod (nicht in der ausgelieferten .jar) legt über den normalen „Welt erstellen“-Bildschirm eine flache Testwelt an, baut den Plan auf, schaut auf den Ursprungsblock und schickt die Befehle wie der Chat; der Vergleich ist derselbe wie beim Fabric-Test.

Der Fabric-Test startet Minecraft 26.3 (Fabric Client Game Test, Quellsatz `fabric-26.3/src/gametest`, nicht Teil der ausgelieferten .jar), baut einen von der Website exportierten Plan mit einem falschen und einem fehlenden Block auf, tippt die `/bauplaner`-Befehle in den Chat und vergleicht die Aufnahme wie die Website. Ohne Bildschirm braucht er `weston` (kopfloser Wayland-Server); Xvfb reicht für Minecraft 26.3 nicht.

## Installieren

Fertige Dateien gibt es auf der Website unter [Mod herunterladen](https://freadeax.github.io/Minecraft-Bauplaner/#/mod) (Version wählen, .jar laden). Neue Builds stellt `node scripts/release_mod.mjs <adapter> "<was geprüft wurde>"` bereit: Die .jar kommt nach `downloads/mod/`, der Eintrag mit Größe und SHA-256 nach `apps/web/src/views/mod/releases.json`.

Die passende Datei `bauplaner-bridge-<loader>-26.3-<Version>.jar` (nicht die `-sources.jar`) in den `mods`-Ordner der Instanz legen. Das funktioniert mit jedem Launcher, der Mods dieses Loaders lädt (Modrinth App, Prism, CurseForge, ATLauncher, offizieller Launcher mit Loader-Profil). Für Fabric muss Fabric API installiert sein; NeoForge und Forge brauchen nichts weiter.

## Benutzen

1. Auf der Website im Tab „Export“ eine Revision als `.schem` exportieren (DataVersion für 26.3: 5023) und die Datei nach `<Instanzordner>/bauplaner/plans/` kopieren.
2. Im Spiel: `/bauplaner plan <datei>` (Tab ergänzt den Namen).
3. Auf den Block schauen, der der Projektkoordinate 0/0/0 entsprechen soll, und `/bauplaner anker hier` eingeben, alternativ `/bauplaner anker <x> <y> <z>`. Der Anker wird je Server/Welt gespeichert.
4. In die Nähe des Baus gehen, damit die Chunks geladen sind, und `/bauplaner scan` ausführen. Der Fortschritt steht über der Hotbar.
5. Die Datei aus `<Instanzordner>/bauplaner/scans/` auf der Website im Tab „Bauen“ mit „Spielaufnahme importieren“ öffnen.

Weitere Befehle: `/bauplaner status`, `/bauplaner abbrechen`, `/bauplaner plaene`.

### Hologramm (Fabric, ab 0.2.0; Texturen, Materialliste, Ebenen ab 0.3.0)

1. Plan wie oben nach `bauplaner/plans/` legen.
2. Auf den Block schauen, an dem Projektkoordinate 0/0/0 stehen soll, **J** drücken und den Plan anklicken.
3. Mit Pfeiltasten/Bild↑↓ verschieben, **Ende** dreht, **Einfg** spiegelt. **,** (Komma) blendet aus, **.** (Punkt) zeigt den nächsten Fehler. Alle Tasten sind unter Optionen → Steuerung → „Bauplaner“ änderbar.
4. Bauen: Fehlende Blöcke erscheinen als durchscheinende, bläuliche Blöcke mit echter Textur (weiter weg als blaue Kästen), falsche rot, falsch ausgerichtete gelb; richtige verschwinden. Am rechten Rand steht der Fortschritt. Die Platzierung bleibt je Server/Welt gespeichert.
5. **Num 7** Materialliste (offen / im Inventar / noch holen), **Num 6** Ebenenmodus (alle → nur eine → bis zu einer Ebene), **Num 9/Num 3** Ebene höher/tiefer. Alles auch im Menü (J).

Alles nur auf deinem Rechner; der Server merkt nichts davon. Details: [MOD_HOLOGRAM](../../docs/architecture/MOD_HOLOGRAM.md).

## Weitere Minecraft-Versionen

NeoForge/Forge: `client-26.3` nach `client-<version>` kopieren und dort `ClientHost` anpassen, dazu `neoforge-<version>`/`forge-<version>` mit neuen Versionen in `gradle.properties`, Schalter in `settings.gradle`. Fabric: den Ordner `fabric-26.3` kopieren (z. B. `fabric-26.4`), in `gradle.properties` die Versionen eintragen, `McCompat.java` anpassen und den Ordner in `settings.gradle` einbinden. Der Kern bleibt unverändert.

## Paper-Server

1. `bauplaner-bridge-paper-<Version>.jar` in den Ordner `plugins` des Servers legen und neu starten (Paper 1.18.2 bis 26.3; Folia nicht).
2. Auf der Website im Tab „Export“ eine Revision als `.schem` exportieren und nach `plugins/BauplanerBridge/plans/` hochladen.
3. Im Spiel `/bauplaner plan <datei>`, auf den Block mit Projektkoordinate 0/0/0 schauen, `/bauplaner anker hier` (oder `/bauplaner anker <x> <y> <z> [welt]`, in der Konsole ohne `/`). Der Anker gilt für alle, die diesen Plan laden.
4. `/bauplaner scan` liest die ganze Planbox, auch wenn niemand in der Nähe ist; `scan geladen` nur geladene Chunks. Die Aufnahme aus `plugins/BauplanerBridge/scans/` herunterladen und im Tab „Bauen“ importieren.

Rechte: `bauplaner.use` (alle), `bauplaner.nachladen` (Chunks nachladen) und `bauplaner.abbrechen.alle` (Operatoren). Einstellungen: `plugins/BauplanerBridge/config.yml` (Zeitbudget je Tick, Nachladen, Chunk-Grenze).
