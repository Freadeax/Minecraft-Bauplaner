# Browser-Schutz und Release-Check (RELEASE-01)

Wie die ausgelieferte Seite vor fremder Einbettung, eingeschleustem Code und unnötigen Browser-Rechten geschützt ist, was davon auf welcher Adresse möglich ist und wie eine Veröffentlichung geprüft wird. Die Werte stehen an genau einer Stelle: [`scripts/pages/security_headers.mjs`](../../../scripts/pages/security_headers.mjs).

## Header auf Cloudflare Pages

`scripts/pages/publish_cloudflare.mjs` schreibt sie in `_headers` für jede Antwort (`/*`):

| Header | Wert | Wirkung |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Browser verwenden ein Jahr lang nur HTTPS. Kein `preload`, damit die Entscheidung umkehrbar bleibt. |
| `Content-Security-Policy` | vollständige Richtlinie, siehe unten | **Durchgesetzt** seit 10.11.2026. Keine fremde Seite darf den Planer einbetten, kein fremdes Skript, keine Plugins, Verbindungen nur zu den genannten Zielen. |
| `X-Frame-Options` | `DENY` | Einbettungsschutz auch für ältere Browser. |
| `Permissions-Policy` | Kamera, Mikrofon, Standort, Sensoren, USB, Bluetooth, Zahlungen … gesperrt, Vollbild nur für die Seite selbst | Auch eine eingebettete Live-Karte bekommt diese Rechte nicht. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Fremde Fenster, die aus dem Planer geöffnet werden, erhalten keinen Zugriff zurück. |
| `X-Content-Type-Options`, `Referrer-Policy` | `nosniff`, `strict-origin-when-cross-origin` | wie bisher |

### Vollständige Richtlinie

- `script-src 'self'`: nur die eigenen Programmdateien, kein Inline-Skript, kein `eval`. Der Build enthält keine Inline-Skripte.
- `style-src 'self' 'unsafe-inline'`: React setzt Farben und Positionen als `style`-Attribut; ohne `'unsafe-inline'` fiele die Darstellung aus.
- `connect-src`: eigener Ursprung, **nur** der Team-Raum des Projekts `https://bauplaner-team.team-room.workers.dev` (HTTPS und WebSocket), die Mod auf diesem Rechner (`127.0.0.1`/`localhost`, jeder Port), Mojang (`piston-meta`, `piston-data`) für das optionale Original-Texturpaket.
- `worker-src 'self' blob:`, `img-src 'self' data: blob:`, `media-src 'self' blob:`: Hintergrundarbeiten, Vorschaubilder und Downloads.
- `frame-src https:`: Live-Karten (BlueMap, Dynmap, Pl3xMap) liegen auf dem Server der Spieler und werden von ihnen eingetragen; eingebettet wird nur HTTPS (HTTP-Karten blockiert der Browser ohnehin als gemischte Inhalte).
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.

### Durchsetzen (10.11.2026)

1. **07.–10.11.:** Report-Only. Der Browsertest [`tests/e2e/security-headers.e2e.mjs`](../../../tests/e2e/security-headers.e2e.mjs) liefert `dist-web` mit genau diesen Headern aus und läuft Start, Beispielprojekt, Editor mit 3D-Ansicht, Material, Bauanleitung, Export mit Download, Bibliothek, Weltkarte, Mod-Seite, Systemcheck, Anleitung, Weltimport und Werkstatt ab. Er verlangt **null** Verstöße.
2. **Entscheidung Philipp (10.11.):** nur der Projekt-Raum. Eigene Team-Raum-Adressen sind gesperrt, und zwar an zwei Stellen: die CSP blockiert sie im Browser, und der Planer lehnt sie schon vorher mit einer verständlichen Meldung ab ([`roomAddress.ts`](../../../apps/web/src/views/project/team/roomAddress.ts), gilt für Live schalten, Einladungen, Zugangsdateien, geteilte Weltkarte und Server-Kopplung). Lokale Räume auf `127.0.0.1`/`localhost` bleiben für Entwicklung und Browsertests erlaubt.
3. **Jetzt:** volle Richtlinie als `Content-Security-Policy`. Der Browsertest prüft als Gegenprobe, dass ein fremdes Verbindungsziel blockiert wird. Ein neues Verbindungsziel braucht einen Eintrag in `CONNECT_SRC` (und, falls es ein Team-Raum ist, in `roomAddress.ts`).

## Grenzen von GitHub Pages

GitHub Pages erlaubt **keine eigenen Header**. Dort gilt:

- HSTS setzt GitHub selbst (`max-age=31556952`), HTTP leitet auf HTTPS um.
- Die CSP steht nur als `<meta http-equiv>` in `index.html`: `object-src 'none'; base-uri 'self'`. `frame-ancestors`, `X-Frame-Options`, `Permissions-Policy` und `Cross-Origin-Opener-Policy` wirken als Meta-Angabe nicht.
- **Einbettungsschutz im Programm** ([`apps/web/src/app/frameGuard.ts`](../../../apps/web/src/app/frameGuard.ts)): Läuft der Planer im Rahmen einer fremden Adresse, startet er nicht, sondern zeigt nur „Im eigenen Tab öffnen“. So kann keine fremde Seite Klicks auf Freigaben oder Team-Aktionen unterschieben. Der Browsertest prüft beide Fälle (mit Headern blockiert der Browser, ohne Header greift der Programmschutz).

Wer den vollen Schutz will, nutzt `https://bauplaner.pages.dev/Minecraft-Bauplaner/`. Projekte liegen je Adresse getrennt im Browser ([OFFLINE.md](OFFLINE.md)).

## Release-Check

`npm run check:release` prüft, was kein Code-Test abdeckt (`scripts/checks/release_check.mjs`). Ergebnis als Tabelle mit ✓ / ⚠ / ✗, Exitcode 1 bei einem ✗.

| Bereich | Prüfung |
|---|---|
| npm audit | keine hohen oder kritischen Lücken; mittlere und niedrige als Hinweis |
| Gradle | `gradle-wrapper.jar` ist ein offizielles Gradle-Wrapper-JAR (Abgleich mit den Prüfsummen aller Gradle-Versionen auf services.gradle.org), Distribution per HTTPS, `validateDistributionUrl=true`, `distributionSha256Sum` gesetzt und gleich der offiziellen Angabe |
| Mod-JARs | jede Datei in `downloads/mod/` stimmt in Größe und SHA-256 mit `releases.json` überein, keine fremde Datei; die JARs der aktuellen Version sind auf GitHub Pages, Cloudflare Pages und Modrinth (SHA-512) byte-gleich |
| HTTPS / Live-Header | HTTP leitet auf HTTPS um; Cloudflare liefert alle Header genau mit den Werten aus `security_headers.mjs`; GitHub Pages HSTS und Meta-CSP, fehlende Header als Hinweis mit Begründung |
| Live-Stand | `deployment.json` beider Adressen; mit `--commit <sha>` muss es dieser Quellcommit sein |
| Geheimnisse | keine Token, privaten Schlüssel oder Werte von Zugangs-Umgebungsvariablen in `dist-web` |

- **Vor der Veröffentlichung** läuft `npm run check:release -- --offline` in `scripts/publish_pages.sh` mit (JARs, Gradle-Einstellungen, Geheimnisse) und bricht bei einem Fehler ab.
- **Nach der Veröffentlichung:** `npm run check:release -- --commit <quellcommit>`. GitHub Pages braucht nach dem Push meist ein bis zwei Minuten.
- `MODRINTH_TOKEN` ist optional und macht auch nicht gelistete Versionen sichtbar.

## Sicherer Exportmodus für Schem und Litematic

Der Export-Reiter meldet **immer**, was ein Plan beim Einfügen in eine Welt mehr tut als Blöcke zu setzen ([`packages/voxel/src/exportSafety.ts`](../../../packages/voxel/src/exportSafety.ts)):

- Befehlsblöcke (alle drei Arten) mit ihrem Befehl, Befehls-Minecarts,
- Klickbefehle (`run_command`) in Schildern, Büchern, Gegenstandsnamen und Texten, alte JSON- und neue NBT-Form,
- Befehlsblöcke oder Befehls-Minecarts als Gegenstand in Kisten oder als Entity-Daten,
- Spawner mit eigener Kreatur, Struktur- und Verbundblöcke.

Mit **„Sicherer Modus“** entfallen diese Stellen in der Datei; Schildtext, andere Gegenstände und Entities bleiben. Entfernte Blockzellen werden wie nicht ausgewählte Zellen geschrieben (Luft oder Strukturleere). Der Exportbericht nennt, was entfernt wurde. Der Planer führt importierte Befehle nie aus; beim Einfügen in Minecraft gelten die Regeln des Zielservers und des Einfügewerkzeugs.

## Wer Zugriff auf das Spiel hat (Mod)

Die lokale Mod-Verbindung bindet nur an `127.0.0.1`, prüft Host und Website-Herkunft und gibt erst nach „Zulassen“ im Spiel einen widerrufbaren Schlüssel aus. Zusätzlich (unveröffentlichte Mod-Version nach 0.27.1):

- Die Kopplungsfrage nennt Gerät **und Website** und sagt, was der Planer danach darf.
- `/bauplaner verbinden status` und der Status-Reiter im Menü listen jeden gekoppelten Browser: Kennung, Gerät, Website, Kopplungszeit, letzte Nutzung und genutzte Zwecke seit Spielstart (Spielerposition, Welt und Gelände, Pläne, Markierungen, Teambau, Server-Kopplung).
- `/bauplaner verbinden trennen <Kennung>` trennt einen einzelnen Browser; `/bauplaner verbinden aus` weiterhin alle.
- Gespeichert werden nur Kennung (Kurzform eines SHA-256 des Schlüssels), Gerät, Website und Kopplungszeit (`geraete` in der Verbindungsdatei), nie der Schlüssel ein zweites Mal.
