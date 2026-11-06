# Bauplaner-Brücke (Minecraft-Mod)

Liest den Bereich eines Bauplans aus der Welt und schreibt eine **Aufnahme**, die die Website im Tab „Bauen“ importiert. Daraus entsteht der Fortschritt je Bauschritt („im Spiel bestätigt / teilweise / abweichend“). Konzept und Format: [MOD_BRIDGE](../../docs/architecture/mod/MOD_BRIDGE.md).

Die Brücke ist **nur lesend**: Sie setzt und entfernt keine Blöcke und sendet nichts ins Internet. Als Fabric-Mod läuft sie im Einzelspieler und auf Mehrspieler-Servern als reine Client-Mod; als Paper-Plugin (Abschnitt „Paper-Server“) läuft sie auf dem Server und liest die ganze Serverwelt.

## Stand

| Teil | Stand |
|---|---|
| `core/` (reines Java 21, ohne Minecraft) | Plan lesen, Aufnahme in Scheiben, Aufnahme-Datei schreiben, Anker je Welt/Server merken. 6 JUnit-Tests und sprachübergreifende Prüfung mit Website und Python-Leser bestanden (`scripts/mod/test_bridge.sh`) |
| `paper/` (Paper-Server-Plugin, eine .jar für Minecraft 1.18.2 bis 26.3, Java ≥ 17) | Liest auf dem Server die ganze Planbox, lädt vorhandene Chunks kurz nach, erzeugt nie Gelände. Auf echten Paper-Servern 1.18.2, 1.20.6, 1.21.4, 1.21.11 und 26.3 automatisch geprüft (`scripts/mod/test_bridge_paper.sh`, 01.11.2026). Versionsabhängige Aufrufe in `PaperCompat.java` |
| `mod-core/` (reines Java 21, ohne Minecraft) | Mod 2.0 (GAME-07): Blockzustände, Vergleichsregeln wie die Website, Platzierung mit Drehen/Spiegeln, Planmodell, Live-Abgleich, Platzierungsspeicher, Materialliste, Platzierhilfe-Regeln. 9 JUnit-Tests. Konzept: [MOD_HOLOGRAM](../../docs/architecture/mod/MOD_HOLOGRAM.md) |
| `core/.../session/` | Gemeinsame Befehlslogik `BridgeSession` (plan, anker, scan, status …) und Schnittstelle `BridgeHost` zum Spiel; NeoForge, Forge und das Paper-Plugin nutzen sie, damit alle Loader gleich reagieren. 3 JUnit-Tests mit einem nachgebauten Spiel |
| `client-26.3/` (nur Vanilla-Klassen, kein eigenes Gradle-Projekt) | `ClientHost` und der `/bauplaner`-Befehlsbaum für den Client, unverändert von NeoForge und Forge eingebunden; dazu der gemeinsame Spieltest `ClientScenario` |
| `hologram-26.3/` (nur Vanilla-Klassen, kein eigenes Gradle-Projekt) | Die Client-Mod 2.0 ohne Loader (`HologramClient`): Hologramm, Live-Abgleich, HUD, Tasten, Menü, Materialliste, Ebenen, Platzierhilfe, Website-Verbindung und Weltplan-Markierungen. Fabric und NeoForge binden den Ordner ein und verdrahten nur ihre Ereignisse (seit 0.6.0) |
| `neoforge-26.3/` (Minecraft 26.3, NeoForge ≥ 26.3.0, Java 25) | Seit 0.6.0 dieselbe Client-Mod wie Fabric (Hologramm, Platzierhilfe, Website-Verbindung). Im echten 26.3-Client automatisch durchgespielt (`scripts/mod/test_bridge_ingame_forge.sh neoforge`, 02.11.2026). Reine Client-Mod, braucht keine weiteren Mods |
| `forge-26.3/` (Minecraft 26.3, Forge ≥ 66, Java 25) | Gebaut und lädt im echten 26.3-Client; der automatische Durchlauf (`scripts/mod/test_bridge_ingame_forge.sh forge`) bleibt in der kopflosen Cloud-Umgebung im Ladebildschirm stehen, die Spielprüfung ist daher noch offen und die .jar noch nicht auf der Download-Seite. Reine Client-Mod (`clientSideOnly`), braucht keine weiteren Mods |
| `fabric-26.3/` (Minecraft 26.3, Fabric Loader ≥ 0.19.5, Fabric API 0.164.0+26.3, Java 25) | Gebaut und im echten 26.3-Client automatisch durchgespielt, auch zusammen mit allen 21 Mods aus Philipps Modpack (`scripts/mod/test_bridge_ingame.sh`, 01.11.2026). Mehrspieler-Abnahme auf einem echten Server steht aus. Alle versionsabhängigen Aufrufe stehen in `McCompat.java` |

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
scripts/mod/test_bridge_paper.sh               # alle Versionen aus paper/gradle.properties
scripts/mod/test_bridge_paper.sh 26.3          # nur eine
```

## Spieltest

```
npm run build:core
scripts/mod/test_bridge_ingame.sh                                   # echter Client, nur die Mod
BAUPLANER_MODPACK_MODS=<instanz>/mods scripts/mod/test_bridge_ingame.sh   # zusammen mit einem Modpack
```

Für NeoForge und Forge: `scripts/mod/test_bridge_ingame_forge.sh neoforge` bzw. `… forge`. Ein Testmod (nicht in der ausgelieferten .jar) legt über den normalen „Welt erstellen“-Bildschirm eine flache Testwelt an, baut den Plan auf, schaut auf den Ursprungsblock und schickt die Befehle wie der Chat; der Vergleich ist derselbe wie beim Fabric-Test.

Der Fabric-Test startet Minecraft 26.3 (Fabric Client Game Test, Quellsatz `fabric-26.3/src/gametest`, nicht Teil der ausgelieferten .jar), baut einen von der Website exportierten Plan mit einem falschen und einem fehlenden Block auf, tippt die `/bauplaner`-Befehle in den Chat und vergleicht die Aufnahme wie die Website. Ohne Bildschirm braucht er `weston` (kopfloser Wayland-Server); Xvfb reicht für Minecraft 26.3 nicht.

## Installieren

Fertige Dateien gibt es auf der Website unter [Mod herunterladen](https://freadeax.github.io/Minecraft-Bauplaner/#/mod) (Version wählen, .jar laden). Neue Builds stellt `node scripts/mod/release_mod.mjs <adapter> "<was geprüft wurde>"` bereit: Die .jar kommt nach `downloads/mod/`, der Eintrag mit Größe und SHA-256 nach `apps/web/src/views/mod/releases.json`.

Die passende Datei `bauplaner-bridge-<loader>-26.3-<Version>.jar` (nicht die `-sources.jar`) in den `mods`-Ordner der Instanz legen. Das funktioniert mit jedem Launcher, der Mods dieses Loaders lädt (Modrinth App, Prism, CurseForge, ATLauncher, offizieller Launcher mit Loader-Profil). Für Fabric muss Fabric API installiert sein; NeoForge und Forge brauchen nichts weiter.

## Benutzen

**Kurz (ab 0.23.0):** `/bauplaner hilfe` zeigt die fünf Schritte. **J** öffnet rechts eine Seitenleiste mit den Reitern Plan, Position, Ansicht und Optionen. Meldungen erscheinen als kurze Karten oben rechts statt im Chat (`/bauplaner meldungen einblendung|chat|beides`), das Baufenster oben rechts ist kompakt (`/bauplaner anzeige kompakt|ausfuehrlich|aus`). Jeder Befehl geht auf Deutsch (`/bauplaner fortschritt`) und Englisch (`/buildplanner progress`); Texte und Tab-Vervollständigung folgen der Spielsprache, `/bauplaner sprache deutsch|englisch|auto` stellt sie fest ein. Alle Befehle in beiden Sprachen stehen auf der Planerseite #/mod.

Notfallweg mit Dateien:

1. Auf der Website im Tab „Export“ eine Revision als `.schem` exportieren (DataVersion für 26.3: 5023) und die Datei nach `<Instanzordner>/bauplaner/plans/` kopieren.
2. Im Spiel: `/bauplaner plan <datei>` (Tab ergänzt den Namen).
3. Auf den Block schauen, der der Projektkoordinate 0/0/0 entsprechen soll, und `/bauplaner anker hier` eingeben, alternativ `/bauplaner anker <x> <y> <z>`. Der Anker wird je Server/Welt gespeichert.
4. In die Nähe des Baus gehen, damit die Chunks geladen sind, und `/bauplaner scan` ausführen. Der Fortschritt steht über der Hotbar.
5. Die Datei aus `<Instanzordner>/bauplaner/scans/` auf der Website im Tab „Bauen“ mit „Spielaufnahme importieren“ öffnen.

Weitere Befehle: `/bauplaner status`, `/bauplaner abbrechen`, `/bauplaner plaene`.

Bei Problemen `/bauplaner diagnose` (Fabric, NeoForge): schreibt einen Diagnosebericht nach `<Instanzordner>/bauplaner/diagnose/` und in die Zwischenablage (Mod-Version, Loader, Mods, Tastenkonflikte, Shader, Hologramm-Zustand, Auszug aus `logs/latest.log`; Benutzerordner, Server-Adressen und Codes geschwärzt). Den Text in ein GitHub-Issue „Testphase: Mod“ einfügen.

### Hologramm (Fabric, ab 0.2.0; Texturen, Materialliste, Ebenen ab 0.3.0; Platzierhilfe ab 0.4.0)

1. Plan wie oben nach `bauplaner/plans/` legen.
2. Auf den Block schauen, an dem Projektkoordinate 0/0/0 stehen soll, **J** drücken und den Plan anklicken.
3. Mit Pfeiltasten/Bild↑↓ verschieben, **Ende** dreht, **Einfg** spiegelt. **,** (Komma) blendet aus, **.** (Punkt) zeigt den nächsten Fehler. Alle Tasten sind unter Optionen → Steuerung → „Bauplaner“ änderbar.
4. Bauen: Fehlende Blöcke erscheinen als durchscheinende, bläuliche Blöcke mit echter Textur (weiter weg als blaue Kästen), falsche rot, falsch ausgerichtete gelb; richtige verschwinden. Am rechten Rand steht der Fortschritt. Die Platzierung bleibt je Server/Welt gespeichert.
5. **Num 7** Materialliste (offen / im Inventar / noch holen), **Num 6** Ebenenmodus (alle → nur eine → bis zu einer Ebene), **Num 9/Num \*** Ebene höher/tiefer (bis 0.4.0 Num 3; kollidierte mit Jade). Alles auch im Menü (J).
6. **Platzierhilfe** (Menü J oder `/bauplaner platzierhilfe an|warnen|aus`, Standard „an“): Ein falscher Block oder eine falsche Ausrichtung wird gar nicht erst gesetzt; liegt der richtige Block in der Schnellleiste, nimmt die Mod ihn in die Hand. Unter dem Fadenkreuz steht, was hingehört und wie man klickt („Blick nach Osten, auf den Block darunter klicken“). Richtig gesetzte Planblöcke sind vor versehentlichem Abbauen geschützt. **Num 8** nimmt den angezielten Planblock in die Hand. Serverkonform: Klicks werden nie verfälscht, nur durchgelassen oder verworfen.

Alles nur auf deinem Rechner; der Server merkt nichts davon. Details: [MOD_HOLOGRAM](../../docs/architecture/mod/MOD_HOLOGRAM.md).

## Weitere Minecraft-Versionen

NeoForge/Forge: `client-26.3` nach `client-<version>` kopieren und dort `ClientHost` anpassen, dazu `neoforge-<version>`/`forge-<version>` mit neuen Versionen in `gradle.properties`, Schalter in `settings.gradle`. Fabric: den Ordner `fabric-26.3` kopieren (z. B. `fabric-26.4`), in `gradle.properties` die Versionen eintragen, `McCompat.java` anpassen und den Ordner in `settings.gradle` einbinden. Der Kern bleibt unverändert.

## Paper-Server

1. `bauplaner-bridge-paper-<Version>.jar` in den Ordner `plugins` des Servers legen und neu starten (Paper 1.18.2 bis 26.3; Folia nicht).
2. Auf der Website im Tab „Export“ eine Revision als `.schem` exportieren und nach `plugins/BauplanerBridge/plans/` hochladen.
3. Im Spiel `/bauplaner plan <datei>`, auf den Block mit Projektkoordinate 0/0/0 schauen, `/bauplaner anker hier` (oder `/bauplaner anker <x> <y> <z> [welt]`, in der Konsole ohne `/`). Der Anker gilt für alle, die diesen Plan laden.
4. `/bauplaner scan` liest die ganze Planbox, auch wenn niemand in der Nähe ist; `scan geladen` nur geladene Chunks. Die Aufnahme aus `plugins/BauplanerBridge/scans/` herunterladen und im Tab „Bauen“ importieren.

Rechte: `bauplaner.use` (alle), `bauplaner.nachladen` (Chunks nachladen) und `bauplaner.abbrechen.alle` (Operatoren). Einstellungen: `plugins/BauplanerBridge/config.yml` (Zeitbudget je Tick, Nachladen, Chunk-Grenze).

### Gemeinsam bauen (Teambau, COOP-02)

Konzept: [TEAMBAU](../../docs/architecture/team/TEAMBAU.md). Die Bauleitung lädt im Planer (Reiter „Team“) die **Serverdatei** herunter, legt sie nach `plugins/BauplanerBridge/team/` und gibt `/bauplaner team laden` ein. Mitspieler brauchen weder Planer noch Mod:

| Befehl | Wirkung |
|---|---|
| `/bauplaner team` | Projekt, Planstand, eigene Abschnitte, freie Abschnitte, offene Notizen |
| `/bauplaner abschnitte` | alle Abschnitte mit Status und Inhaber |
| `/bauplaner nehmen <nr>` · `abgeben <nr>` · `fertig [<nr>] [notiz]` | Abschnitt übernehmen, zurückgeben, fertig melden (der erste Befehl tritt dem Team als Helfer bei) |
| `/bauplaner zeigen <nr>` | Umriss 30 s als Partikel, nur für dich |
| `/bauplaner notiz <frage\|problem\|material\|info> <text>` · `notizen` | Notiz an deiner Position, Notizen in der Nähe |
| `/bauplaner geliefert <item\|hand> [menge]` · `sammle <item> <menge>` | Lieferung melden (nimmt nichts aus dem Inventar), Sammelauftrag |
| `/bauplaner beitrag [alle]` · `nachweis [an\|aus]` | Baunachweis: eigene gesetzte/abgebaute Blöcke und Lagerbuchungen, mit `alle` je Abschnitt; Zählung für sich ab- oder anschalten |
| `/bauplaner lager` · `lager zaehlen` · Baumeister: `lager setzen <name>`, `lager entfernen <name>` | Lagerkisten des Teams: Bestand, Zählen auf Befehl; beim Schließen einer Lagerkiste wird automatisch gezählt (auch Shulkerinhalt) |
| Baumeister: `zuweisen <nr> <spieler>`, `pruefen <nr> ok\|nacharbeit [notiz]` · Bauleitung: `rolle <spieler> <rolle>`, `team export`, `team wahl <name>` | |

Jede Handlung landet als Ereignis in `team/<teamId>.events.jsonl`; `/bauplaner team export` schreibt den Stand, den der Planer einliest. Wer in einem Abschnitt steht, sieht ihn in der Aktionsleiste. `config.yml` → `team.schutz`: `hinweis` (Standard), `sperren` (Blockänderungen in fremden Abschnitten verhindern) oder `aus`. Rechte `bauplaner.team.use` (alle) und `bauplaner.team.leitung` (Operatoren). In der Konsole handelt `bauplaner team als <spieler> <befehl>` für einen Spieler. Servertest: `scripts/mod/test_bridge_paper_team.sh`.

## Lizenz

Mod, Paper-Plugin und Kerne unter `mods/bauplaner-bridge/` stehen unter der [MIT-Lizenz](LICENSE) (Philipp, 03.11.2026). Ab der nächsten Version tragen auch die .jar „MIT“ (0.10.0 nennt in Fabric noch „All-Rights-Reserved“).

## Modrinth

Die Mod (Fabric, NeoForge) und das Paper-Plugin erscheinen als ein Projekt auf Modrinth (Slug `bauplaner-bridge`, GAME-09). Alles dafür liegt im Repo:

- `modrinth/project.json` – Titel, Kurztext, Sichtbarkeit, Kategorien, Seiten, Lizenz, Links, Loader und Abhängigkeiten (Fabric braucht die Fabric API). Forge fehlt bewusst, bis es im Spiel geprüft ist.
- `modrinth/DESCRIPTION.md` – Projektseite, Englisch (Pflicht bei Modrinth) und Deutsch.
- `modrinth/icon.png`, `modrinth/gallery/` – Icon und Bilder, alle echte Spielaufnahmen aus den Spieltests (keine KI-Bilder, Modrinth-Regel 6.2).
- `project.json` → `disclosures` – Offenlegungen (Content Disclosures, API v3): KI-Anteil an Code und Text, Telemetrie nur mit Zustimmung (Team-Raum), Systemzugriffe (127.0.0.1, Zwischenablage). Bei neuen Netz- oder Datenfunktionen hier nachziehen.
- `CHANGELOG.md` – je Version ein Abschnitt `## <Version>`, wird unverändert als Änderungsliste hochgeladen.

Hochgeladen werden genau die .jar aus `downloads/mod/`, die `releases.json` ab `firstVersion` nennt (SHA-256 wird verglichen). Ohne GitHub Actions (Projektregel): Der Token liegt als Umgebungsvariable `MODRINTH_TOKEN` in der Cloud-Umgebung des Projekts und nie im Repo. Nötige Rechte: Create/Read/Write projects, Create/Read versions.

```
node scripts/mod/modrinth_publish.mjs check     # offline, auch in npm test
node scripts/mod/modrinth_publish.mjs plan      # was passieren würde
node scripts/mod/modrinth_publish.mjs create    # einmalig: Projekt anlegen, Bilder, Versionen, zur Prüfung einreichen
node scripts/mod/modrinth_publish.mjs release   # nach jeder Mod-Veröffentlichung: fehlende Versionen hochladen
node scripts/mod/modrinth_publish.mjs sync      # Text, Icon, Galerie (ersetzen, entfernen, sortieren) und Offenlegungen abgleichen; release macht das bei jeder Version mit
```

Ablauf bei einer neuen Mod-Version: bauen und im Spiel prüfen, `release_mod.mjs` je Loader, Abschnitt in `CHANGELOG.md`, Push auf main, dann `modrinth_publish.mjs release`.
