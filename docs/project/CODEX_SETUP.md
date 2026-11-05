# Weiterentwicklung mit Codex

Stand: 01.11.2026. Ziel: `Freadeax/Minecraft-Bauplaner`, Hauptbranch `main`. Die vorhandene Anwendung und ihre Architektur sind die Arbeitsbasis. Keine Ersatzanwendung und keine eigenen GitHub Actions.

## Tatsächlich verbundener Stand

Der zuvor leere lokale Projektordner `F:\LMNT\Bauplaner` enthält jetzt einen vollständigen Git-Clone mit `origin` auf das Zielrepository und ausgechecktem `main`. Dieser aktive Codex-Chat arbeitet darin. GitHub-Konnektor bestätigt Lese-/Schreib-/Adminrechte; GitHub CLI ist als Freadeax angemeldet. Die Branchabfrage meldet für main keinen Branchschutz. Keine Schutzregeln, Kontoeinstellungen oder Sichtbarkeit wurden verändert.

Dies belegt den lokalen Checkout und Repositoryzugriff. Eine zusätzliche Registrierung im Codex-Projektmenü oder eine veröffentlichte Cloud-Umgebung ist damit nicht bewiesen. Die aktuelle Werkzeugoberfläche enthält keine Funktion zum Anlegen/Veröffentlichen solcher Projekte oder Umgebungen. Bestehende Cloud-Umgebungen konnten darüber ebenfalls nicht aufgelistet werden. Keine Cloud-ID oder erfolgreiche Einrichtung erfinden.

## Reproduzierbarer lokaler Start

Voraussetzungen: Git, Node.js gemäß `package.json` (ab 22.18), npm und Python 3. Auf Windows zusätzlich Git Bash für den vorhandenen Pages-Publisher. Python wird auf Windows als `python`, sonst als `python3` gestartet. Optional `PYTHON` auf den vollständigen Interpreterpfad setzen; keine Argumente oder Shellbefehle in diese Variable schreiben.

```sh
npm run setup:codex
npm run check
npm run setup:browser
npm run test:e2e
npm run dev
```

`setup:codex` prüft Python/Git, führt `npm ci --ignore-scripts`, `npm run setup:hooks` und `npm run build` aus. Es verändert weder Remote noch Branch. Die Aktivierung von `.githooks` gilt nur für diesen Checkout; ein vorhandener eigener Hookpfad muss vor dem Setup bewusst berücksichtigt werden. Browserinstallation bleibt separat, damit ein Kernsetup keinen großen Browserdownload benötigt. Linux-Images benötigen zusätzlich die Systembibliotheken für Chromium; dort bei Bedarf `npx playwright install --with-deps chromium` während des Umgebungssetups ausführen.

Die Entwicklungsseite liegt unter `http://127.0.0.1:5173/Minecraft-Bauplaner/`. `npm run preview` liefert den Produktionsbuild gewöhnlich auf Port 4173 aus; die E2E-Dateien starten ihre eigenen Server. Vor Browserprüfungen muss `npm run build` erfolgreich sein. Playwright 1.64.1 ist eine exakt fixierte reine Entwicklungsabhängigkeit für die bestehende Node-Test-Suite; kein zusätzliches Testframework und keine Browserbibliothek im Produktbundle. `.gitattributes` vereinheitlicht Textdateien auf LF, damit generierte Ansichten und Shellskripte auf Windows reproduzierbar bleiben.

## Einrichtung in der Codex-Oberfläche

Falls der Ordner noch nicht als Projekt angezeigt wird: Projekt hinzufügen bzw. Projekt bearbeiten und den Repositoryordner als primären Ordner wählen. Die [offizielle Projektdokumentation](https://learn.chatgpt.com/docs/projects) beschreibt die automatische Erkennung von AGENTS im primären Ordner.

Für [lokale Umgebungen](https://learn.chatgpt.com/docs/environments/local-environment) in den Einstellungen `npm run setup:codex` als Worktree-Setup verwenden. Sinnvolle Aktionen: `npm run dev`, `npm run check`, `npm run test:e2e`. Die App erzeugt ihre Konfiguration im `.codex`-Ordner. Eine nicht nachgewiesene Konfigurationsstruktur wird hier nicht als funktionierende App-Anbindung ausgegeben.

Für eine [Cloud-Umgebung](https://learn.chatgpt.com/docs/environments/cloud-environments): neuer Codex-Auftrag → Work in / Cloud → Select environment → Create environment (alternativ Einstellungen → Codex Cloud → Environments). Repository und main auswählen, Node/Python/Git bereitstellen, Setupbefehl oben und Chromium samt Systembibliotheken ausführen. Installation benötigt Zugriff auf npm und die Playwright-Browserdownloads. Setup und `npm run check` sowie E2E tatsächlich ausführen, dann die Umgebung veröffentlichen und ihre ID dokumentieren. Lokale Browseranmeldungen werden nicht automatisch in Cloud-Aufträge übernommen. Dieser Oberflächenschritt wurde in diesem Auftrag nicht ausgeführt; er ist keine fehlende GitHub-Freigabe.

## Arbeitsablauf und nächste Aufgaben

Vor Beginn [AGENTS](../../AGENTS.md), [README](../../README.md), [STATUS](../STATUS.md), [ROADMAP](../ROADMAP.md), [Historie](../ROADMAP_HISTORY.md), [Kommunikation](../COMMUNICATION.md), [Entscheidungen](../architecture/kern/DECISIONS.md) und den betroffenen Modulvertrag lesen. Lokale Änderungen und Remote prüfen. Dateiumfang und stabile Aufgaben-ID anmelden; fremde Arbeit erhalten.

Die einzige Aufgabenquelle bleibt `docs/roadmap.json` mit 56 vorhandenen Paketen. Keine zweite Backlogliste aufbauen. QA-01 (vollständige Chromiumregression) und STORE-02 (echte Migration/Zwei-Tab-Abnahme) sind im dokumentierten lokalen Umfang bestanden. PERF-01 besitzt inzwischen den großen isolierten Browservergleich mit unveränderten vollständigen Ergebnissen; Abbruch, Retry und historische Grundlage sind separat geprüft. Drei parallele Teilagenten haben diese Messung, OPS-02 (isolierte Pages-Wiederherstellungsprobe) und UI-01/WORLD-02 (visuelle Chromiumabnahme) mit getrennten Dateizuständigkeiten abgeschlossen. Root koordiniert Gesamtprüfung und Main-/Pages-Veröffentlichung. Nächste Entwicklungsaufgabe ist PERF-02-S03 für gemessene Übertragungs-/Invalidierungsarbeit; vollständige React-/Gerätelatenz und echte Geräte bleiben gesondert offen. Der jeweils aktuelle Stand und die nächste Aktion stehen verbindlich in der JSON-Datei.

Nach jedem Arbeitsblock Aufgaben und Prüfprotokoll pflegen, `npm run roadmap:record -- <IDs> "Ergebnis und Grenzen"`, `npm run check` und `npm run check:roadmap-change -- <vorheriger-main>` ausführen. Vor Commit/Push neue Kommunikation und Remote prüfen; ohne Force regulär auf main integrieren. Quellcommit, Artefaktcommit und Livezustand getrennt berichten. Direkte API-Schreibzugriffe umgehen lokale Hooks und benötigen dieselbe ausdrückliche Vorprüfung.

## Pages getrennt behandeln

Pages-API am 01.11.2026: `build_type=legacy`, Quelle `main` / `/`, Website `https://freadeax.github.io/Minecraft-Bauplaner/`. Es wurde keine Quellenänderung vorgenommen. GitHubs interner Pages-Build ist von eigenen Actions-Dateien zu unterscheiden.

Nach jedem Main-Quellpush sofort `bash scripts/publish_pages.sh` in Git Bash starten. Der vorhandene Publisher prüft den Quellstand erneut und erzeugt einen manifestgeprüften Artefakt-Kindcommit auf main. Anschließend `deployment.json` und sämtliche dort genannten Dateigrößen/SHA-256 live gegen den lokalen Build prüfen. Ein Push allein bedeutet noch keine erfolgreiche Liveauslieferung. Details: [Runbook](../operations/GITHUB_CONNECTOR_RUNBOOK.md), konkrete Ergebnisse: [TESTING](../TESTING.md). Keine nachträgliche Commit-Schleife nur zum Eintragen der eigenen Deployment-SHA.

## Zusammenarbeit mit Claude

Claude arbeitet parallel in mehreren Threads. Gemeinsame Regeln, Aufteilung der Roadmap-Aufgaben und Abstimmung über `COMMUNICATION.md`: [CODEX_PROMPT](CODEX_PROMPT.md). Offene Abstimmungsnachricht: `MSG-CLAUDE-SYNC-00`.
