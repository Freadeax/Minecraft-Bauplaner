# Veröffentlichung

Wie Website, Mod und Team-Raum ausgeliefert werden. Ergänzt [Hosting](../architecture/betrieb/HOSTING.md), [Offline-Speicher und zweite Adresse](../architecture/betrieb/OFFLINE.md) und [Team-Raum betreiben](../architecture/team/TEAM_BACKUP.md).

## Übersicht

| Was | Ziel | Befehl | Nachweis |
|---|---|---|---|
| Website | GitHub Pages aus `main` / Repository-Wurzel | `scripts/publish_pages.sh` | [deployment.json](https://freadeax.github.io/Minecraft-Bauplaner/deployment.json): `sourceCommit` und Dateihashes |
| Website (Spiegel) | Cloudflare Pages `bauplaner.pages.dev` | läuft im selben Skript mit, einzeln `npm run publish:cloudflare` | `https://bauplaner.pages.dev/Minecraft-Bauplaner/deployment.json` |
| Mod und Plugin (Download) | `downloads/mod/` + Seite `#/mod` | `node scripts/mod/release_mod.mjs <adapter> "<geprüft>"` | Eintrag in `apps/web/src/views/mod/releases.json` |
| Mod und Plugin (Modrinth) | Projekt `bauplaner-bridge` | `node scripts/mod/modrinth_publish.mjs release` | Versionsliste auf Modrinth |
| Team-Raum | Cloudflare Worker | `cd services/team-room && npx wrangler deploy` | `node scripts/team/team_room_smoke.mjs <adresse>` |

Zugangsdaten (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `MODRINTH_TOKEN`) kommen nur aus Umgebungsvariablen und liegen nie im Repository. GitHub Actions werden nicht verwendet.

## Website

GitHub Pages liefert `main` aus der Repository-Wurzel aus. Damit der Quellcode erhalten bleibt, veröffentlicht `scripts/publish_pages.sh` den Build als eigenen **Artefakt-Kindcommit**:

1. Voraussetzungen prüfen: `main` ausgecheckt, Arbeitsbaum sauber, `HEAD` gleich `origin/main`.
2. `check:roadmap-change` für den Quellcommit und vollständiges `npm run check`.
3. Webbuild nach `dist-web/`, Manifest `deployment.json` mit Quellcommit, Größe und SHA-256 jeder Datei.
4. `prepare_main_pages.mjs` setzt die Artefakte in den vollständigen Baum von `main` (nur Pfade auf der Pages-Allowlist, nie Quelldateien).
5. Commit `deploy: main <sha> in repository root` mit dem Quellcommit als Eltern, normaler Push ohne Force. Hat sich `main` zwischenzeitlich bewegt, bricht das Skript ab.
6. Sind die Cloudflare-Zugangsdaten gesetzt, wird dasselbe Artefakt nach Cloudflare Pages geladen.

Danach den Live-Stand prüfen: `deployment.json` muss den Quellcommit nennen. Die Dateien `index.html`, `assets/`, `deployment.json`, `examples/`, `sw.js`, `favicon.svg`, `.nojekyll` und `THIRD_PARTY_NOTICES.txt` in der Wurzel werden ausschließlich so geschrieben.

Artefakt-Commits brauchen keinen neuen Roadmap-Eintrag; jede Quelländerung dagegen schon (siehe [CONTRIBUTING](../../CONTRIBUTING.md)).

### Rückkehr auf einen früheren Stand

Ein fehlerhafter Stand wird nicht per Force-Push entfernt, sondern durch einen neuen, korrigierten Quellcommit mit anschließender Veröffentlichung ersetzt. Wie sich bekannte Artefakte in einem Wegwerf-Clone wiederherstellen lassen, beschreibt die [Wiederherstellungsprobe](PAGES_RESTORE_PROBE.md).

## Mod und Plugin

1. Version in `mods/bauplaner-bridge/VERSION` erhöhen und Abschnitt in `mods/bauplaner-bridge/CHANGELOG.md` schreiben.
2. Bauen und im echten Spiel prüfen (Gametest, Spielprüfstand), siehe [mods/bauplaner-bridge](../../mods/bauplaner-bridge/README.md).
3. `release_mod.mjs` je Adapter (`fabric-26.3`, `neoforge-26.3`, `paper`) kopiert die .jar nach `downloads/mod/` und trägt sie auf der Download-Seite ein.
4. Quellen pushen und Website veröffentlichen.
5. `modrinth_publish.mjs release` lädt fehlende Versionen hoch und gleicht Beschreibung, Galerie und Offenlegungen ab. `modrinth_publish.mjs check` prüft das vorher offline und läuft in `npm test` mit.

## Team-Raum

Protokolländerungen sind nur abwärtsverträglich erlaubt. Vor dem Ausrollen laufen die Team-Raum-Tests unter `tests/unit/team/`, danach die Rauchprobe gegen den echten Dienst. Sicherung, Wiederherstellung und Aufbewahrung: [TEAM_BACKUP](../architecture/team/TEAM_BACKUP.md).
