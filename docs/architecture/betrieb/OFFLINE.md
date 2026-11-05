# Offline-Speicher und zweite Adresse (PERF-06)

Stand: 05.11.2026. Anlass: Philipp, „Einfachste Methode die Seite besser auszubauen und mehr Leistung zu bekommen, aber kein Server über eigenen PC oder Port am eigenen Router“; danach „wenn Cloudflare komplett kostenlos gebaut werden kann: Offline-Speicher und Cloudflare-Anbindung“.

## Befund: wo die Leistung herkommt

Der Planer rechnet vollständig im Browser: Katalog, Import, 3D-Netz mit Licht, Export und Vergleich laufen im Web Worker (PERF-04), Seiten werden bei Bedarf geladen und der Katalog kommt fertig als Datei (PERF-05). Das Hosting liefert nur Dateien aus: rund 1,5 MB JavaScript beim Start (etwa 0,46 MB gepackt) und die Katalogdatei (3,2 MB, 0,47 MB gepackt). Ein Server in der Cloud würde 3D, Werkstatt und Projektberechnung nicht beschleunigen, weil das Bild ohnehin auf dem Gerät entstehen muss und große Modelle sonst erst hoch- und wieder heruntergeladen würden. Verbesserbar sind deshalb vor allem Ladeweg und Zwischenspeicher.

## Offline-Speicher (S01)

`scripts/pages/build_service_worker.mjs` schreibt beim Bauen `sw.js` aus `scripts/pages/service_worker.template.js`. Das eingebettete Manifest nennt alle Programmdateien unter `assets/` (Dateinamen mit Inhalts-Hash) außer der Katalogdatei; die Version ist ein Hash über Namen und Inhalte. `apps/web/src/app/offline.ts` meldet ihn nach dem Laden an.

| Anfrage | Regel |
|---|---|
| Startseite (`/Minecraft-Bauplaner/`, `index.html`) | erst Netz, höchstens 3 s; sonst gespeicherte Fassung. So kommt ein neuer Stand beim nächsten Laden an. |
| `assets/*` aus dem Manifest | erst Speicher, sonst Netz. Beim Installieren werden nur fehlende Dateien geholt (4 gleichzeitig). |
| alles andere | unverändert ans Netz: `deployment.json`, Katalogdatei (liegt ohnehin in IndexedDB), Mod-Downloads, Team-Raum, Mod auf 127.0.0.1, fremde Adressen, Range-Anfragen. |

- **Update:** Jede Veröffentlichung ergibt eine neue `sw.js`. Der Browser bemerkt sie beim nächsten Laden, holt nur neue Dateien und entfernt beim Aktivieren die Dateien älterer Stände. Ein noch offener alter Tab verhält sich wie bisher (lazyPage lädt einmal neu).
- **Systemcheck:** Karte „Offline-Speicher“ mit Zustand, Programmstand, Dateien und Größe; „leeren und ausschalten“ entfernt Service Worker und Speicher und merkt sich das (`bauplaner.offline` = `aus`).
- **Notbremse:** `node scripts/pages/build_service_worker.mjs dist-web --off` erzeugt eine `sw.js`, die bei jedem Nutzer den Speicher leert und sich abmeldet. Danach wie gewohnt veröffentlichen.
- **Tests:** In automatisierten Browsern (`navigator.webdriver`) bleibt er aus, damit abgefangene Anfragen in den übrigen Browsertests unverändert wirken. `tests/e2e/offline.e2e.mjs` schaltet ihn über `bauplaner.offline.test` ein.
- **Grenzen:** Nur über HTTPS oder localhost. Geprüft in Chromium; Safari/iPad und Firefox stehen aus. Projekte und Sicherungen bleiben unabhängig davon in IndexedDB.

## Zweite Adresse auf Cloudflare Pages (S02, S03)

Gratis-Tarif: unbegrenzter Datenverkehr, 500 Veröffentlichungen im Monat, bis 20 000 Dateien und 25 MiB je Datei. Der Planer passt darin.

- Dasselbe Pages-Artefakt (`dist-web`) wird unter `Minecraft-Bauplaner/` hochgeladen, damit Pfade, Katalogschlüssel und `sw.js` identisch bleiben; die Wurzel leitet weiter. Eigene Cache-Regeln: `assets/*` ein Jahr unveränderlich.
- **Live seit 05.11.2026:** <https://bauplaner.pages.dev/Minecraft-Bauplaner/> (Projekt `bauplaner`, Brotli). `scripts/publish_pages.sh` lädt nach jeder GitHub-Pages-Veröffentlichung dasselbe Artefakt mit hoch, wenn `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` gesetzt sind; ein Fehler dort lässt GitHub Pages unberührt. Von Hand: `npm run publish:cloudflare` (nach `npm run build`). Skript: `scripts/pages/publish_cloudflare.mjs` (wrangler fest auf 4.151.2).
- GitHub Pages bleibt die Hauptadresse und der Rückfall.
- **Wichtig für Nutzer:** Browserdaten gehören zur Adresse. Projekte auf `freadeax.github.io` erscheinen auf der Cloudflare-Adresse nicht von selbst; Umzug über „Alles sichern“ und Wiederherstellen.
- Team-Raum: `https://bauplaner.pages.dev` steht seit PERF-06 in `services/team-room/src/index.js`; wirksam mit dem nächsten Raum-Deploy (zusammen mit dem offenen LINK-10-Deploy). Mod (`LiveLinkServer.ALLOWED_ORIGINS`, `LIVE_ALLOWED_ORIGINS`) erlaubt die Adresse ab der nächsten Mod-Version (S03). Bis dahin Mod und Team-Raum über `freadeax.github.io` nutzen.
- Mehrkern-Rechnen (SharedArrayBuffer) bräuchte zusätzlich COOP/COEP-Kopfzeilen; das würde Anfragen an Mod und Team-Raum ohne CORP-Kopfzeile sperren und ist deshalb nicht eingeschaltet.
