# Sicherheit

## Grundsätze

- **Importierte Dateien sind nicht vertrauenswürdig.** Entpackte Größe, Struktur, Laufzeit und Volumen sind begrenzt; Parser laufen in isolierten Web-Workern; importierte Befehle werden nie ausgeführt.
- **Keine Weltveränderung ohne Auftrag.** Vorschau, Import und Live-Abgleich setzen keine Blöcke. Planübertragung und echte Weltänderungen bleiben getrennt.
- **Rechte auf dem Server.** Das Paper-Plugin übernimmt Rollen und Abschnittsschutz aus dem Team-Raum nur mit Unterschrift der Bauleitung ([SIGNED_EVENTS](docs/architecture/team/SIGNED_EVENTS.md)). Raumschlüssel sind zweckgebunden; das Server-Plugin erhält nie den Verwaltungsschlüssel eines Raums.
- **Lokale Verbindung.** Die direkte Verbindung zwischen Planer und Mod läuft nur über `127.0.0.1` und erst nach Freigabe im Spiel. Ab der nächsten Mod-Version zeigt sie jeden gekoppelten Browser mit Website und genutzten Zwecken und trennt ihn einzeln.
- **Browser-Schutz.** Auf Cloudflare Pages verbieten Header das Einbetten in fremde Seiten, sperren ungenutzte Browser-Rechte und erzwingen HTTPS; eine vollständige Content-Security-Policy läuft zunächst im Meldemodus. GitHub Pages erlaubt keine eigenen Header, dort startet der Planer in fremden Rahmen nicht ([Browser-Schutz und Release-Check](docs/architecture/betrieb/SICHERHEITSHEADER.md)).
- **Exporte mit Befehlen.** Der Export meldet Befehlsblöcke, Befehls-Minecarts, Klickbefehle, Spawner sowie Struktur- und Verbundblöcke; der sichere Modus lässt sie weg.
- **Keine Geheimnisse im Repository.** Zugangsdaten für Veröffentlichung und Dienste kommen nur aus Umgebungsvariablen; private Weltdaten werden nicht eingecheckt.

## Meldungen

Sicherheitslücken bitte nicht als öffentliches Issue mit Tokens, Raumschlüsseln oder privaten Weltdateien melden. Bitte wende dich zuerst direkt an den Maintainer [@Freadeax](https://github.com/Freadeax) und beschreibe das Problem ohne vertrauliche Daten.
