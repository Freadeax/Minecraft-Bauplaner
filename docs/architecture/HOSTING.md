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

## Veröffentlichung und Abnahme

Derzeit ist das Repository privat und es gibt noch keinen Webbuild. GitHub Pages für private Repositories hängt vom Kontotarif ab; dieser ist noch nicht geprüft. Die Sichtbarkeit des Repositorys wird nicht automatisch geändert. Beabsichtigte Projekt-URL: `https://freadeax.github.io/Minecraft-Bauplaner/`, noch nicht eingerichtet oder als erreichbar bestätigt.

Vor Veröffentlichung: funktionsfähiger statischer Build, keine Quell-/Privatdateien im Artefakt, Pfad-/Reload-/Workerprüfung unter dem Repository-Unterpfad, vollständiger lokaler Prüflauf, aktuelle Kommunikation und Remote-Integration. Danach Pages-Einstellung `Deploy from a branch`, `gh-pages`, `/` prüfen und echte ausgelieferte Dateien testen. Lokaler Build, Branchpush und erfolgreiches Pages-Deployment werden separat berichtet.

## Geprüfte Primärquellen

GitHub Docs, am 27.10.2026 geprüft:

- [Publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site): Branchpublishing und interner Deployment-Workflow.
- [Creating a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site): statische Dateien, `.nojekyll`, Tarif-/Sichtbarkeitsgrenzen.
