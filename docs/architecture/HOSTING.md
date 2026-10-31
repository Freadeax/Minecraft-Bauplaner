# Hosting: GitHub Pages

Verbindliche Nutzerentscheidung vom 27.10.2026: Die Website läuft über GitHub Pages. Ein Node-Server auf Pages wird nicht vorausgesetzt.

## Erste Fassung

- Statische HTML/CSS/JS-Anwendung; gemeinsamer TypeScript-Kern ohne Node-Laufzeitimporte im Browserpfad.
- Import, Export und aufwendige Berechnungen in Browser-Web-Workers. Lokale Dateien ausschließlich nach Nutzerauswahl; kein automatischer Weltupload.
- Lokale Projekte später in IndexedDB plus explizite Dateisicherung. Browserdaten allein sind keine zugesicherte dauerhafte Cloudspeicherung.
- Projektpfad `/Minecraft-Bauplaner/` für Assets, Module und Worker berücksichtigen. Hash-Routing oder eine bewusst geprüfte Alternative; Reload darf keine Serverroute voraussetzen.
- Build und Prüfungen lokal durch den bearbeitenden Agenten. Deploymentziel ist ein ausschließlich mit geprüften statischen Dateien gefüllter `gh-pages`-Branch mit `.nojekyll`; `main` bleibt Quell-/Integrationslinie. Dieser Branch ist ein Veröffentlichungsartefakt, keine zweite Entwicklungslinie.
- Keine eigenen GitHub-Actions-Workflows. GitHub verwendet laut Dokumentation intern auch bei Branchpublishing einen Pages-Deployment-Workflow. Das lässt sich nicht durch `.nojekyll` abschalten; die Datei überspringt Jekyll. Falls die Kontoeinschränkung auch den internen Pages-Deploy verhindert, ist Hosting bis zur Klärung blockiert. Keine funktionierende Veröffentlichung behaupten, bevor die echte URL geprüft ist.

## Späterer Teamdienst

Konten, Teamrechte, gemeinsame Operationen, dauerhafte geteilte Payloads und Server-Sync benötigen einen separaten, noch auszuwählenden Dienst. Die Pages-Oberfläche bleibt das Frontend; der lokale Kern darf nicht von diesem Dienst abhängen. API- und Worker-Apps sind spätere optionale Betriebsprofile. Zugangsdaten und private Weltdaten gehören nicht in das öffentliche Buildartefakt.

## Verbindlicher Veröffentlichungsablauf nach jedem Main-Update

Nutzeranweisung vom 27.10.2026: Auf jeden erfolgreichen Merge oder Push auf `main` folgt unmittelbar die Veröffentlichung des passenden geprüften statischen Builds auf GitHub Pages. Dafür ist keine erneute Erlaubnis nötig. Das ist eine Pflicht des jeweils aktiven Entwicklungsablaufs, kein eingerichteter Hintergrundmonitor für fremde Pushes. Es werden weiterhin keine eigenen GitHub-Actions-Workflows verwendet.

1. Aktuellen Main-Quellcommit feststellen und erforderliche lokale Prüfungen abschließen.
2. Statisches Website-Artefakt aus genau diesem Stand bauen; Builddateien, Repository-Unterpfad und Workerpfade prüfen.
3. Artefakt regulär auf die Pages-Veröffentlichungsquelle übertragen; keine privaten Daten oder Quell-Dokumentation als Website ausgeben.
4. Veröffentlichung und echte ausgelieferte URL prüfen; Quellcommit und Deploymentstand zuordnen. GitHubs Verarbeitungszeit ist kein sofortiger Live-Nachweis.
5. Fehler innerhalb des Auftrags beheben. Bleibt ein Blocker, ausdrücklich „main aktuell, Pages nicht aktualisiert“ mit Ursache melden; kein Erfolgsstatus aus einem Push allein ableiten.

Aktueller Nachtrag 27.10.2026: Statischer Webbuild vorhanden; Repository öffentlich bestätigt. Der Konnektor hat weiterhin keine Pages-Konfigurationsaktion, aber die authentifizierte Pages-Oberfläche ist jetzt erreichbar. Dort wurde Pages zuerst deaktiviert beobachtet; nach Anlage des Artefaktbranches ist gh-pages / root als Quelle bestätigt. Die Website ist erreichbar, keine eigene Actions-Datei angelegt. Keine zusätzliche Anmeldung oder Tokenübergabe angefordert.

## Veröffentlichung und Abnahme

Der Nutzer hat das Repository öffentlich geschaltet; dies wurde über get_repo erneut bestätigt. Webbuild unter dist-web vorhanden. Beabsichtigte Projekt-URL: `https://freadeax.github.io/Minecraft-Bauplaner/`, als erreichbar bestätigt.

Vor Veröffentlichung: funktionsfähiger statischer Build, keine Quell-/Privatdateien im Artefakt, Pfad-/Reload-/Workerprüfung unter dem Repository-Unterpfad, vollständiger lokaler Prüflauf, aktuelle Kommunikation und Remote-Integration. Danach Pages-Einstellung `Deploy from a branch`, `gh-pages`, `/` prüfen und echte ausgelieferte Dateien testen. Lokaler Build, Branchpush und erfolgreiches Pages-Deployment werden separat berichtet.

## Geprüfte Primärquellen

GitHub Docs, am 27.10.2026 geprüft:

- [Publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site): Branchpublishing und interner Deployment-Workflow.
- [Creating a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site): statische Dateien, `.nojekyll`, Tarif-/Sichtbarkeitsgrenzen.

## Ausführbarer Arbeitsplan

Der [Konnektorablauf](../operations/GITHUB_CONNECTOR_RUNBOOK.md) beschreibt Gitobjekte, expected_sha, Artefakttransport, Manifest, Bootstrap, Liveprüfung und Rückkehr. Der [Gesamtausbauplan](../IMPLEMENTATION_PLAN.md) zerlegt den Weg zum Webbuild und alle Folgephasen in abnehmbare Pakete. Der Webbuild und Manifestgenerator sind inzwischen implementiert; der Transport erfolgt über die vorhandenen Konnektor-Gitobjekte.

### Bestätigte Erstveröffentlichung

27.10.2026: Öffentlicher Pages-Betrieb mit Quelle gh-pages / root und HTTPS im Browser bestätigt. Erstes Deployment und nachfolgende Updates wurden über Konnektor-Gitobjekte ausgelöst. GitHubs interner Pages-Lauf erfolgreich; kein eigener Buildworkflow. CDN-/Browsercache kann kurzzeitig alte index.html liefern: Für den Vergleich Quell-SHA aus deployment.json und tatsächliche Skript-URLs prüfen, nicht nur einen grünen Deploymentlauf.

## Veröffentlichungsskript

Seit 27.10.2026 führt `scripts/publish_pages.sh` Schritt 1–5 aus: Abbruch, wenn HEAD nicht `origin/main` oder der Arbeitsbaum unsauber ist; Build mit Quellcommit im Manifest; Artefakttest; Commit ausschließlich von `dist-web` auf den bisherigen gh-pages-Head; Push ohne Force mit Wiederholung; Abbruch, wenn gh-pages bereits einen neueren Main-Stand enthält. Die Liveprüfung über `deployment.json` bleibt ein eigener Schritt.

## Maßgeblicher Hostingstand · 31.10.2026

Die tatsächlichen GitHub-internen Pages-Buildlogs (Run 41201874786, Buildjob 124539104569) bestätigen Checkout `ref: main` und `source: .`. Damit ist Pages bereits auf main / Repositorywurzel gestellt; ältere Angaben zu gh-pages sind historisch überholt. Der bisher fehlende Root-Webbuild erklärt die 404-Antwort für deployment.json.

Aktiver Einstieg ist nun `scripts/publish_pages.sh`, der an `publish_main_pages.sh` delegiert. Geprüften Quellcommit bauen, Artefakte manifestgeprüft in den vollständigen Main-Tree übernehmen, als normalen Artefakt-Kindcommit auf main veröffentlichen und live prüfen. Das Manifest nennt den Quell-Elterncommit (keine selbstreferenzielle Commit-SHA). gh-pages wird nicht mehr benötigt, darf nach bestätigter Liveauslieferung gelöscht werden. Alte Arbeitsbranches bleiben bis zu einer verfügbaren Löschfunktion bestehen; alle Inhalte und auch die zuvor gesquashte WIP-Historie sind in main enthalten.
