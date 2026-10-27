# Bauplaner-Brücke (Minecraft-Mod)

Liest den Bereich eines Bauplans aus der Welt und schreibt eine **Aufnahme**, die die Website im Tab „Bauen“ importiert. Daraus entsteht der Fortschritt je Bauschritt („im Spiel bestätigt / teilweise / abweichend“). Konzept und Format: [MOD_BRIDGE](../../docs/architecture/MOD_BRIDGE.md).

Die Mod ist **nur lesend**: Sie setzt und entfernt keine Blöcke, sendet nichts ins Internet und braucht nichts auf dem Server. Sie läuft im Einzelspieler und auf Mehrspieler-Servern als reine Client-Mod.

## Stand

| Teil | Stand |
|---|---|
| `core/` (reines Java 21, ohne Minecraft) | Plan lesen, Aufnahme in Scheiben, Aufnahme-Datei schreiben, Anker je Welt/Server merken. 6 JUnit-Tests und sprachübergreifende Prüfung mit Website und Python-Leser bestanden (`scripts/test_bridge.sh`) |
| `fabric-26.3/` (Minecraft 26.3, Fabric Loader ≥ 0.19.5, Fabric API 0.164.0+26.3, Java 25) | Quelltext fertig, **noch nicht kompiliert und nicht im Spiel getestet**, weil die Fabric- und Mojang-Server aus der Cloud-Umgebung gesperrt sind. Alle versionsabhängigen Aufrufe stehen in `McCompat.java` |

## Bauen

Voraussetzung: JDK 25 (für den Fabric-Teil), Internetzugang zu `maven.fabricmc.net` und den Mojang-Servern.

```
cd mods/bauplaner-bridge
./gradlew :core:test                         # Kern, braucht nur Maven Central
./gradlew -PwithFabric :fabric-26.3:build    # Mod-.jar unter fabric-26.3/build/libs/
```

Unter Windows `gradlew.bat` statt `./gradlew`.

## Installieren

Die Datei `bauplaner-bridge-fabric-26.3-<Version>.jar` (nicht die `-sources.jar`) in den `mods`-Ordner der Fabric-Instanz legen. Das funktioniert mit jedem Launcher, der Fabric-Mods lädt (Modrinth App, Prism, CurseForge, offizieller Launcher mit Fabric-Profil). Fabric API muss installiert sein.

## Benutzen

1. Auf der Website im Tab „Export“ eine Revision als `.schem` exportieren und die Datei nach `<Instanzordner>/bauplaner/plans/` kopieren.
2. Im Spiel: `/bauplaner plan <datei>` (Tab ergänzt den Namen).
3. Auf den Block schauen, der der Projektkoordinate 0/0/0 entsprechen soll, und `/bauplaner anker hier` eingeben, alternativ `/bauplaner anker <x> <y> <z>`. Der Anker wird je Server/Welt gespeichert.
4. In die Nähe des Baus gehen, damit die Chunks geladen sind, und `/bauplaner scan` ausführen. Der Fortschritt steht über der Hotbar.
5. Die Datei aus `<Instanzordner>/bauplaner/scans/` auf der Website im Tab „Bauen“ mit „Spielaufnahme importieren“ öffnen.

Weitere Befehle: `/bauplaner status`, `/bauplaner abbrechen`, `/bauplaner plaene`.

## Weitere Minecraft-Versionen

Für eine neue Version den Ordner `fabric-26.3` kopieren (z. B. `fabric-26.4`), in `gradle.properties` die Versionen eintragen, `McCompat.java` anpassen und den Ordner in `settings.gradle` einbinden. Der Kern bleibt unverändert.
