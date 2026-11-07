# Hosting: GitHub Pages

Der Planer ist eine rein statische Web-App. Er läuft ohne eigenen Server auf GitHub Pages, gespiegelt auf Cloudflare Pages. Ablauf der Veröffentlichung: [VEROEFFENTLICHUNG](../../operations/VEROEFFENTLICHUNG.md).

## Grundsätze

- Statische HTML/CSS/JS-Anwendung; der gemeinsame TypeScript-Kern hat im Browserpfad keine Node-Laufzeitimporte.
- Import, Export und schwere Berechnungen laufen in Web-Workern. Lokale Dateien werden nur nach Auswahl durch den Nutzer gelesen; kein automatischer Welt-Upload.
- Projekte liegen in IndexedDB; Sicherungen sind ausdrücklich exportierbar. Browserdaten allein gelten nicht als zugesicherte dauerhafte Speicherung.
- Alle Assets, Module und Worker liegen unter dem Projektpfad `/Minecraft-Bauplaner/`. Hash-Routing (`#/bibliothek`, `#/karte` …), damit ein Neuladen keine Serverroute braucht.
- Ein Service Worker hält die Programmdateien offline bereit ([OFFLINE](OFFLINE.md)).
- Keine eigenen GitHub-Actions-Workflows. Gebaut und geprüft wird lokal; GitHub Pages liefert nur aus.
- Zugangsdaten und private Weltdaten gehören nie in das öffentliche Artefakt.

## Auslieferung

| Adresse | Quelle |
|---|---|
| `https://freadeax.github.io/Minecraft-Bauplaner/` | GitHub Pages, Branch `main`, Repository-Wurzel |
| `https://bauplaner.pages.dev/Minecraft-Bauplaner/` | Cloudflare Pages (kostenloser Tarif), dasselbe geprüfte Artefakt |

GitHub Pages liefert `main` aus der Wurzel aus. Damit Quellcode und Website im selben Branch leben, schreibt `scripts/publish_pages.sh` den Build als eigenen Artefakt-Kindcommit über den geprüften Quellcommit. Das Manifest `deployment.json` nennt den Quellcommit und Größe und SHA-256 jeder ausgelieferten Datei; es ist der Nachweis für den Live-Stand. CDN- und Browser-Caches können kurz eine ältere `index.html` liefern, deshalb wird immer das Manifest verglichen und nicht nur ein grüner Pages-Lauf.

## Dienste außerhalb von Pages

Live-Zusammenarbeit läuft über den [Team-Raum](../team/TEAM_LIVE.md), einen Cloudflare Worker mit Durable Objects im kostenlosen Tarif. Der lokale Kern hängt nicht von ihm ab: Ohne Team-Raum bleibt der Planer vollständig nutzbar.

## Primärquellen

- [GitHub Pages: Publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pages: Creating a site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
