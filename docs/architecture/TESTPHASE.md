# Testphase: Checklisten, Testprotokoll und Fehlerberichte mit Diagnose (QA-04)

Stand 02.11.2026. Die große Testphase läuft, sobald die laufenden Blöcke auf main sind: Philipp und weitere Tester spielen Planer und Mod durch, Claude sichtet und behebt die gemeldeten Fehler. Diese Seite beschreibt die Werkzeuge dafür. Der Testplan selbst steht in [TESTPLAN](../testing/TESTPLAN.md) (erzeugt).

## Ziele

- Tester ohne Vorwissen können jeden Bereich nach einer Liste durchgehen und wissen, was „richtig“ ist.
- Ein Fehlerbericht enthält immer die Diagnose, die zum Nachstellen nötig ist (Build, Browser, Grafik, Speicher, Fehlerprotokoll, Konsole, letzte Seiten; in der Mod Version, Loader, Mods, Tasten, Hologramm-Zustand, Log-Auszug), ohne dass der Tester etwas zusammensuchen muss.
- Es wird nichts von selbst gesendet. Berichte entstehen als Text in der Zwischenablage oder als Datei; ein GitHub-Issue entsteht erst, wenn der Tester es auf GitHub abschickt. Projektdaten, Welten und Zugangsdaten bleiben außen vor.

## Planer

| Teil | Datei | Aufgabe |
|---|---|---|
| Testplan | `apps/web/src/testing/testplan.ts` | Eine Quelle für Seite und Doku: Bereiche (`TestArea`, Art `planer`/`mod`) mit Fällen (`TestCase`: stabile ID `BEREICH-NN`, Schritte, Erwartung, Stufe `kern`/`vertieft`, optionale Startadresse). `node scripts/render_testplan.mjs` erzeugt `docs/testing/TESTPLAN.md`; `--check` prüft, ob sie aktuell ist. |
| Testprotokoll | `apps/web/src/testing/protocol.ts` | Ergebnis je Fall (`ok`/`fehler`/`offen`, Notiz, Zeit) und Testername, in `localStorage` unter `bauplaner.testphase.v1`. Browserdaten, nicht Teil der Sicherungen; `protocolMarkdown` gibt sie als Markdown weiter. Kaputte Daten werden still verworfen. |
| Diagnose | `apps/web/src/app/diagnostics.ts` | `installDiagnostics()` (in `main.tsx`) hängt sich an `console.warn/error` (Originalausgabe bleibt, höchstens 60 Einträge) und an Seitenwechsel (25). `collectEnvironment` liest Build (deployment.json), Adresse, Browser (User-Agent und Client Hints), System, Sprache/Zeitzone, Bildschirm, Eingabe, Kerne/RAM, WebGL-Version und -Renderer, Speicherbelegung und -schutz, Speicherart, Anzahl Projekte/eigene Bauteile, Farbschema, Online. `diagnosisText` und `bugReport` bauen den Markdown-Bericht; `issueUrl` die GitHub-Adresse mit vorausgefüllten Formularfeldern (Feld-IDs = IDs der Issue-Vorlage) und kürzt die Diagnose, wenn die Adresse über 7 500 Zeichen läge. Das Fehlerprotokoll selbst bleibt in `errorLog.ts` (S-01). |
| Seite | `apps/web/src/testing/TestphaseView.tsx`, `testphase.css` | Route `#/testphase` (`?melden` öffnet das Formular, `?melden=<Fall>` füllt es aus dem Fall). Zusammenfassung, Testername, „Nur Kernfälle“, Protokoll kopieren/als Datei, Zurücksetzen; je Bereich die Fälle mit ✓ ✕ ?, aufklappbaren Schritten, Notiz und bei ✕ „Fehler zu … melden“. Formular: Titel, Bereich, Schwere, Testfall, Name, Schritte, Erwartet, Tatsächlich; Diagnose einsehbar; „Als GitHub-Issue öffnen“, „Bericht kopieren“, „Als Datei speichern“. |
| Einstiege | `Shell.tsx` (Fußzeile), `CommandPalette.tsx`, `SystemView.tsx` („Fehler melden (mit Diagnose)“), `ErrorBoundary.tsx` (Absturzseite → „Fehler melden“) | Kein neuer Hauptnavigationspunkt; die Testphase ist zeitlich begrenzt. |

## Mod

`/bauplaner diagnose` (Fabric und NeoForge, Vertrag [MOD_HOLOGRAM](MOD_HOLOGRAM.md)):

- `mod-core/.../mod/Diagnostics.java` (reines Java, getestet): Abschnitte mit Schlüssel/Wert, Logauswahl `selectLog` (jede Zeile mit „bauplaner“ samt folgender Stackzeilen, dazu bis zu 20 `ERROR`/`Exception`-Zeilen aus den letzten 400 Zeilen, insgesamt höchstens 80, Reihenfolge wie im Log), Schwärzen `redact` (Benutzerordner → `~`, IPv4 außer 127.0.0.1 → `x.x.x.x`, `code|token|kopplungscode: …` → `•••`), Dateiname `diagnose-JJJJMMTT-HHMMSS.txt`.
- `hologram-26.3/.../hologram/HologramDiagnose.java`: füllt Mod (Version, Loader, Minecraft/DataVersion, Java, System, Arbeitsspeicher, Launcher aus dem Pfad geschätzt, Instanzordner), Modpack (Dateien in `mods/`, Shaderpaket aktiv über Iris-API), Tasten (jede Bauplaner-Taste mit Belegung und Konflikten gegen alle anderen `keyMappings`), Welt (Einzel-/Mehrspieler, Dimension, Spielerposition), Hologramm (Plan, Platzierung, Fortschritt, Sichtbarkeit, Ebenen, Abschnitt, Texturen, Röntgensicht, Platzierhilfe), Website-Verbindung (Status, Port, zuletzt aktiv) und den Logauszug aus `logs/latest.log` (letzte 20 000 Zeilen gelesen). Schreibt nach `<Instanz>/bauplaner/diagnose/`, legt den Text in die Zwischenablage und meldet beides im Chat. Fällt ein Teil aus, entsteht trotzdem ein Kurzbericht.
- Der Absturzschutz der Mod (`HologramClient.guarded`, Thread Mod) loggt „[Fehler]“ mit Stack über den Logger `bauplaner` und verweist im Chat auf `/bauplaner diagnose`; so landen Abstürze im Auszug.

## Teststand

- Planer: main ab dem QA-04-Commit (alle Blöcke der Novemberrunde im Kern fertig: LIB-05 Runde 3, EDIT-05, BASE-01/SPLIT-01, PERF-04-S07, MAP-05, Mod-Absturzschutz). Der genaue Stand steht im Systemcheck unter „Auslieferung → Quellstand“ und in jedem Fehlerbericht unter „Build“.
- Mod: 0.7.1 (Fabric, NeoForge) auf `#/mod`. `/bauplaner diagnose` kommt mit der nächsten Version (Thread Mod); bis dahin bei Mod-Fehlern `logs/latest.log` und ggf. `crash-reports/` anhängen.
- Offene Abnahmen, die Teil der Testphase sind: BASE-01-S06 (Basisplaner), SPLIT-01-S05 (Herauslösen mit echten Dateien), LIB-05-S08 (neue Gebäude im Spiel), EDIT-05-S07 (gestapelte/gedrehte Bauteile im Spiel), GAME-07-S05/MAP-05 (Paper-Server, Langdruck-Menü am Handy), PERF-04-S06 (Firefox/Safari). Jede hat einen Testfall (BIB-10/11/12, WERK-06, MOD-10, LIVE-01, START-07).

## Wo Berichte landen

- GitHub-Issue-Formulare `.github/ISSUE_TEMPLATE/testphase-planer.yml` und `testphase-mod.yml` (Labels `testphase` + `planer`/`mod`), `config.yml` verlinkt die Testphase-Seite. Die Feld-IDs des Planer-Formulars sind Vertrag für `issueUrl` (Test `tests/testphase.test.mjs` prüft beides gegeneinander).
- Ohne GitHub-Konto: Bericht kopieren und als Nachricht schicken (Projektchat); Claude legt dann das Issue an bzw. behebt direkt.
- Bearbeitung: Issues mit Label `testphase` werden im Thread „Große Testphase vorbereiten und betreuen“ gesichtet, nach Schwere sortiert (Absturz/Datenverlust zuerst), behoben und mit Commit-Verweis geschlossen; das Testprotokoll des Testers nennt die Fälle, die danach erneut zu prüfen sind.

## Grenzen

- Konsolen-Mitschnitt nur für `warn`/`error`, nicht für `log`; Einträge aus Web Workern kommen nur an, wenn sie als Fehler zurückgemeldet werden.
- GPU-Name über `WEBGL_debug_renderer_info`; manche Browser liefern ihn nicht oder verallgemeinert.
- Die GitHub-Adresse hat eine Längengrenze; lange Diagnosen werden gekürzt, der Tester hängt dann die gespeicherte Datei an.
- Forge und Paper haben keinen `diagnose`-Befehl (Forge ohne Spieltest, Paper nur Server).
