# Testphase: Checklisten, Testprotokoll und Fehlerberichte mit Diagnose (QA-04)

Stand 02.11.2026. Die große Testphase läuft, sobald die laufenden Blöcke auf main sind: Philipp und weitere Tester spielen Planer und Mod durch, Claude sichtet und behebt die gemeldeten Fehler. Diese Seite beschreibt die Werkzeuge dafür. Der Testplan selbst steht in [TESTPLAN](../../testing/TESTPLAN.md) (erzeugt).

## Ziele

- Tester ohne Vorwissen können jeden Bereich nach einer Liste durchgehen und wissen, was „richtig“ ist.
- Ein Fehlerbericht enthält immer die Diagnose, die zum Nachstellen nötig ist (Build, Browser, Grafik, Speicher, Fehlerprotokoll, Konsole, letzte Seiten; in der Mod Version, Loader, Mods, Tasten, Hologramm-Zustand, Log-Auszug), ohne dass der Tester etwas zusammensuchen muss.
- Es wird nichts von selbst gesendet. Berichte entstehen als Text in der Zwischenablage oder als Datei; ein GitHub-Issue entsteht erst, wenn der Tester es auf GitHub abschickt. Projektdaten, Welten und Zugangsdaten bleiben außen vor.

## Planer

| Teil | Datei | Aufgabe |
|---|---|---|
| Testplan | `apps/web/src/testing/testplan.ts` | Eine Quelle für Seite und Doku: Bereiche (`TestArea`, Art `planer`/`mod`) mit Fällen (`TestCase`: stabile ID `BEREICH-NN`, Schritte, Erwartung, Stufe `kern`/`vertieft`, optionale Startadresse). `node scripts/checks/render_testplan.mjs` erzeugt `docs/testing/TESTPLAN.md`; `--check` prüft, ob sie aktuell ist. |
| Testprotokoll | `apps/web/src/testing/protocol.ts` | Ergebnis je Fall (`ok`/`fehler`/`offen`, Notiz, Zeit) und Testername, in `localStorage` unter `bauplaner.testphase.v1`. Browserdaten, nicht Teil der Sicherungen; `protocolMarkdown` gibt sie als Markdown weiter. Kaputte Daten werden still verworfen. |
| Diagnose | `apps/web/src/app/diagnostics.ts` | `installDiagnostics()` (in `main.tsx`) hängt sich an `console.warn/error` (Originalausgabe bleibt, höchstens 60 Einträge) und an Seitenwechsel (25). `collectEnvironment` liest Build (deployment.json), Adresse, Browser (User-Agent und Client Hints), System, Sprache/Zeitzone, Bildschirm, Eingabe, Kerne/RAM, WebGL-Version und -Renderer, Speicherbelegung und -schutz, Speicherart, Anzahl Projekte/eigene Bauteile, Farbschema, Online. `diagnosisText` und `bugReport` bauen den Markdown-Bericht; `issueUrl` die GitHub-Adresse mit vorausgefüllten Formularfeldern (Feld-IDs = IDs der Issue-Vorlage) und kürzt die Diagnose, wenn die Adresse über 7 500 Zeichen läge. Das Fehlerprotokoll selbst bleibt in `errorLog.ts` (S-01). |
| Seite | `apps/web/src/testing/TestphaseView.tsx`, `testphase.css` | Route `#/testphase` (`?melden` öffnet das Formular, `?melden=<Fall>` füllt es aus dem Fall). Zusammenfassung, Testername, „Nur Kernfälle“, Protokoll kopieren/als Datei, Zurücksetzen; je Bereich die Fälle mit ✓ ✕ ?, aufklappbaren Schritten, Notiz und bei ✕ „Fehler zu … melden“. Formular: Titel, Bereich, Schwere, Testfall, Name, Schritte, Erwartet, Tatsächlich; Diagnose einsehbar; „Als GitHub-Issue öffnen“, „Bericht kopieren“, „Als Datei speichern“. |
| Einstiege | `Shell.tsx` (Fußzeile), `CommandPalette.tsx`, `SystemView.tsx` („Fehler melden (mit Diagnose)“), `ErrorBoundary.tsx` (Absturzseite → „Fehler melden“) | Kein neuer Hauptnavigationspunkt; die Testphase ist zeitlich begrenzt. |

## Mod

`/bauplaner diagnose` (Fabric und NeoForge, Vertrag [MOD_HOLOGRAM](../mod/MOD_HOLOGRAM.md)):

- `mod-core/.../mod/Diagnostics.java` (reines Java, getestet): Abschnitte mit Schlüssel/Wert, Logauswahl `selectLog` (jede Zeile mit „bauplaner“ samt folgender Stackzeilen, dazu bis zu 20 `ERROR`/`Exception`-Zeilen aus den letzten 400 Zeilen, insgesamt höchstens 80, Reihenfolge wie im Log), Schwärzen `redact` (Benutzerordner → `~`, IPv4 außer 127.0.0.1 → `x.x.x.x`, `code|token|kopplungscode: …` → `•••`), Dateiname `diagnose-JJJJMMTT-HHMMSS.txt`.
- `hologram-26.3/.../hologram/HologramDiagnose.java`: füllt Mod (Version, Loader, Minecraft/DataVersion, Java, System, Arbeitsspeicher, Launcher aus dem Pfad geschätzt, Instanzordner), Modpack (Dateien in `mods/`, Shaderpaket aktiv über Iris-API), Tasten (jede Bauplaner-Taste mit Belegung und Konflikten gegen alle anderen `keyMappings`), Welt (Einzel-/Mehrspieler, Dimension, Spielerposition), Hologramm (Plan, Platzierung, Fortschritt, Sichtbarkeit, Ebenen, Abschnitt, Texturen, Röntgensicht, Platzierhilfe), Website-Verbindung (Status, Port, zuletzt aktiv) und den Logauszug aus `logs/latest.log` (letzte 20 000 Zeilen gelesen). Schreibt nach `<Instanz>/bauplaner/diagnose/`, legt den Text in die Zwischenablage und meldet beides im Chat. Fällt ein Teil aus, entsteht trotzdem ein Kurzbericht.
- Der Absturzschutz der Mod (`HologramClient.guarded`, Thread Mod) loggt „[Fehler]“ mit Stack über den Logger `bauplaner` und verweist im Chat auf `/bauplaner diagnose`; so landen Abstürze im Auszug.

## Teststand

- Planer: main ab dem QA-04-Commit (alle Blöcke der Novemberrunde im Kern fertig: LIB-05 Runde 3, EDIT-05, BASE-01/SPLIT-01, PERF-04-S07, MAP-05, Mod-Absturzschutz). Der genaue Stand steht im Systemcheck unter „Auslieferung → Quellstand“ und in jedem Fehlerbericht unter „Build“.
- Mod: 0.7.2 (Fabric, NeoForge, main 8ce80fc) auf `#/mod`, mit `/bauplaner diagnose` und Absturzschutz; im Spieltest auf NeoForge, Fabric und Fabric mit Philipps Modpack samt Shader geprüft (der Spieltest führt `diagnose` aus und prüft den Bericht). Beispielbericht: `/mnt/project-files/mod/0.7.2-diagnose-beispiel.txt`. Bekannt: eine alte `options.txt` behält Tastenbelegungen über Updates, der Bericht meldet dann z. B. „Ebene tiefer“ auf Num 3 im Konflikt mit Jade; Abhilfe Optionen → Steuerung → Bauplaner zurücksetzen (Standard Num *).
- Stand 04.11.2026 mittags: Mod 0.14.0 (Fabric/NeoForge; Teambau ohne Server-Datei über den Team-Raum, LINK-07) und Paper-Plugin 0.13.0 (Serveraufnahme per Klick, LINK-06) sind der aktuelle Teststand; davor Mod 0.13.0 (Packliste, Gerüst, Markieren); Team-Raum live. Neue Fälle: PROJ-12…15 (Produktion, Materialvarianten, Rohstoffe), BIB-17/18, DATEI-06…08 (Profilprüfung, gedrehte Inhalte, WorldEdit/Litematica), SYS-03, TEAMBAU-26 (Team live im Alltag) (alte Browserdaten), LINK-01…04, TEAMBAU-25, LAGER-01…09.
- Abnahme je Paket: `ACCEPTANCE` in `testplan.ts` ordnet jedem Roadmap-Paket mit Status „implemented“ die Testfälle seiner Abnahme zu; `npm run check:testplan` schlägt fehl, wenn ein implementiertes Paket keinen Eintrag hat oder ein Fall unbekannt ist. TESTPLAN.md zeigt „Abnahme je Roadmap-Paket“, geordnet nach Ort (`placeOf`/`packagePlace`: nur Browser, mit Minecraft, mit Paper-Server; ein Paket braucht den anspruchsvollsten Ort seiner Fälle), die Seite bei jedem Fall „Abnahme für: …“.
- Frühere offene Abnahmen (02.11.): BASE-01-S06 (Basisplaner), SPLIT-01-S05 (Herauslösen mit echten Dateien), LIB-05-S08 (neue Gebäude im Spiel), EDIT-05-S07 (gestapelte/gedrehte Bauteile im Spiel), GAME-07-S05/MAP-05 (Paper-Server, Langdruck-Menü am Handy), PERF-04-S06 (Firefox/Safari). Jede hat einen Testfall (BIB-10/11/12, WERK-06, MOD-10, LIVE-01, START-07).

## Neuordnung 06.11.2026 (kürzer, nach Teilen)

- Umfang von 177 Fällen in 13 Bereichen auf 104 Fälle (46 Kern) gekürzt; danach kamen PROJ-26 (TERRAIN-05) und TEAMBAU-29 (TEAM-02) dazu. Doppelte Fälle sind zusammengelegt (z. B. Ensembles in „Übernehmen“, Symmetrie und Kurven der Mod in MOD-18, Lagerkisten-Buchung mit Doppelkiste/Shulker in LAGER-02); veraltete Dateiwege (Teampaket, Meldecode, Serverdatei, Plan-Datei nach `plans/` kopieren, Vergleich Mod 0.8/0.9) sind durch die Online-Wege ersetzt und nur noch als Notfall genannt (LINK-13).
- Drei Teile auf der Seite und in TESTPLAN.md: **nur im Browser** (START, BIB, PROJ, WERK, DATEI, KARTE, TEAMBAU, GERAET, SYS), **mit Minecraft** (MOD, LIVE, LINK) und **mit Paper-Server** (LAGER). Fälle, die ein Plugin brauchen, erkennt `placeOf` auch in anderen Bereichen (Filter „Ort“).
- Stabile IDs: der aufnehmende Fall behält seine ID und führt die früheren in `merged`. `MERGED_INTO`/`currentCaseId`/`findCase` lösen frühere IDs auf; `migrateEntries` in `protocol.ts` überträgt gespeicherte Haken beim Laden (✕ in einem Teil → ✕, ✓ nur wenn alle Teile ✓ waren, sonst ? mit Notiz „früher … ✓“). Verweise in Roadmap und Doku auf frühere IDs bleiben über die Tabelle „Zusammengelegte Fälle“ in TESTPLAN.md und die Suche auf der Seite auffindbar. Neue Fälle nie mit einer früheren ID anlegen.
- `ACCEPTANCE` nennt nur aktuelle IDs; jede frühere Abnahme-Zuordnung ist auf den aufnehmenden Fall übertragen (Unit-Test prüft, dass keine frühere ID mehr genannt wird und der Plan höchstens 110 Fälle hat).
- Seite: Sprungleiste je Teil mit Fortschritt, Bereiche zuklappbar (gemerkt in `bauplaner.testphase.ansicht`), Suche (auch frühere IDs und Paketnamen), Filter Ort, „Nur Kernfälle“, „Erledigte ausblenden“; die Anleitung ist eingeklappt, sobald es Haken gibt.

## Wo Berichte landen

- GitHub-Issue-Formulare `.github/ISSUE_TEMPLATE/testphase-planer.yml` und `testphase-mod.yml` (Labels `testphase` + `planer`/`mod`), `config.yml` verlinkt die Testphase-Seite. Die Feld-IDs des Planer-Formulars sind Vertrag für `issueUrl` (Test `tests/unit/web/testphase.test.mjs` prüft beides gegeneinander).
- Ohne GitHub-Konto: Bericht kopieren und als Nachricht schicken (Projektchat); Claude legt dann das Issue an bzw. behebt direkt.
- Bearbeitung: Issues mit Label `testphase` werden im Thread „Große Testphase vorbereiten und betreuen“ gesichtet, nach Schwere sortiert (Absturz/Datenverlust zuerst), behoben und mit Commit-Verweis geschlossen; das Testprotokoll des Testers nennt die Fälle, die danach erneut zu prüfen sind.

## Grenzen

- Konsolen-Mitschnitt nur für `warn`/`error`, nicht für `log`; Einträge aus Web Workern kommen nur an, wenn sie als Fehler zurückgemeldet werden.
- GPU-Name über `WEBGL_debug_renderer_info`; manche Browser liefern ihn nicht oder verallgemeinert.
- Die GitHub-Adresse hat eine Längengrenze; lange Diagnosen werden gekürzt, der Tester hängt dann die gespeicherte Datei an.
- Forge und Paper haben keinen `diagnose`-Befehl (Forge ohne Spieltest, Paper nur Server).
