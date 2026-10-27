# Projektstand

Stand: 27.10.2026. Erste bedienbare Browser-Kernansicht auf GitHub Pages veröffentlicht.

| Bereich | Bestätigter Stand |
|---|---|
| Nutzerziel | Modularer Minecraft-Bauhelfer für Browser und spätere Team-/Spielanbindung |
| Repository | Freadeax/Minecraft-Bauplaner als Ziel benannt |
| Remote-Prüfung | Authentifiziert geprüft: initial nur README, main ungeschützt |
| Websitehosting | GitHub Pages verbindlich; nach jedem Main-Merge/Push unmittelbar passenden geprüften Webbuild veröffentlichen. Webbuild mit Manifest vorhanden; Pages-Quelle gh-pages / root im Browser bestätigt, Website öffentlich erreichbar; Live-Canvas, Picking, Schichten und Rotation geprüft |
| Planung | Gesamtspezifikation, Regeln, Roadmap und Anforderungen ausgearbeitet |
| Kern | TypeScript-Typen, Laufzeitvalidierung, unveränderliche Snapshots, Geometrie-/begrenzte Zustandstransformation, X/Y/Z-Auswahl und Blockzustandszählung implementiert |
| Anwendung | React-/Three.js-Vorabansicht: Orbit/Zoom, Blockpicking, X/Y/Z-Schnitte, Gesamtmengen, Voxel-JSON-Import per Worker, JSON-Sicherung. Kein Schem-Parser, freier Flug, Composer oder Minecraft-Export |
| Prüfung | 45 Node-Tests, strenge Kern-/Webtypprüfung, Kern-/Webbuild und Dokumentationsprüfung lokal bestanden; Details in TESTING.md |
| Automatisierung | GitHub Actions werden auf Nutzeranweisung nicht genutzt; Workflow entfernt. Prüfungen werden eigenständig ausgeführt und in docs/TESTING.md dokumentiert. |
| Integration | PR #1 in main gemergt: e791d68dda1b982e4e3e99536ba23ed80a61e749; explizite Main-Freigabe des Nutzers dokumentiert |
| GPT-Projekteinstellungen | Anweisung vorbereitet, nicht automatisch eingetragen |

## Nächster Arbeitsschritt

P0-02/P0-03 sind als interner Vertrag und unabhängig handberechnete Testfixtures abgeschlossen. P1-02/P1-04 sind begonnen; die Teilabnahme umfasst keine allgemeine Zustands-/NBT- oder Registrykompatibilität. Als Nächstes P1-01: begrenzter Schem-v3-Reader mit unabhängigen binären Referenzfixtures. Erste Live-Browserprüfung im Anschluss an Bootstrap vorgesehen; keine Spielprüfung erfolgt.

## Vor Integration klären

Zielprofil für Minecraft und Modpack aus dem tatsächlichen Projektstand ableiten; falls dort ungeklärt, gezielt erfragen. Frontendhosting ist durch den Nutzerzusatz festgelegt: GitHub Pages. Backendanbieter, Lizenz und erster Serveradapter sind noch keine angenommenen Nutzerentscheidungen. Diese Punkte blockieren die Bearbeitung der allgemeinen Grundregeln nicht.

## Integration dieses Arbeitspakets

Nach ausdrücklicher Nutzerfreigabe wurde [PR #1](https://github.com/Freadeax/Minecraft-Bauplaner/pull/1) am 27.10.2026 in main gemergt: `e791d68dda1b982e4e3e99536ba23ed80a61e749`. Der Merge-Tree entspricht exakt dem geprüften PR-Head. Die frühere Freigabeblockade ist damit aufgelöst. Kein Deployment oder Release.

## Ausgearbeitete Folgeplanung

Der [Gesamtplan](IMPLEMENTATION_PLAN.md) deckt Parser, Worker, Pages-Frontend, Bibliothek/Composer, Speicherung, Export/Guide, Team, Formate und Spielanbindung mit Abhängigkeiten und Abnahme ab. Das [Konnektor-Runbook](operations/GITHUB_CONNECTOR_RUNBOOK.md) macht den bestätigten Git-Zugriff zum regulären Transportweg, einschließlich binärer Artefakte und erwarteter Ref-SHAs. Webbuild und Manifestgenerator implementiert. Artefakttransport über Konnektor vorgesehen; Pages-Einstellungen sind jetzt im authentifizierten Browser zugänglich. Kein aktueller Konnektor-Endpunkt für Pages nötig; UI kann Bootstrap übernehmen.

## P1-03a / HP-01–03 · erster Webbuild

Repositoryöffentlichkeit erneut bestätigt. Build-Artefakt enthält nur statische Website, Browserworker, eigenes Icon, Runtime-Lizenzen und Hashmanifest. Lokaler Browserzugriff war wegen getrennter Laufzeit nicht möglich; Browserbedienung wird nach Erstveröffentlichung auf der echten URL geprüft. Pages war zunächst deaktiviert; nach Anlage von gh-pages zeigt die Oberfläche diese Quelle und einen laufenden Build. Die echte Website lädt inzwischen. Erste Schicht-/Rotationsprüfung bestanden; Software-Isometrie sichtbar, Picking zeigt konkrete Blockkoordinaten, Schichtfilter korrekt. Der im Live-Manifest ausgewiesene Quellstand wird bei Veröffentlichung abgeglichen.

## Bestätigter Livebetrieb

Website: https://freadeax.github.io/Minecraft-Bauplaner/ · Quelle: gh-pages / root, HTTPS. Implementierter Codequellstand: 6d9d2b63a369804409a8e014e263ae4040cb85be; Pages-Deployment c8573e23bbdfdc5d1c7bb83bac63b448254dbea6 erfolgreich. Nachfolgende Dokumentationscommits ändern den Anwendungscode nicht; der exakte aktuelle Quellstand steht in deployment.json.

Live geprüft: sichtbares Hafenhaus mit 425 Blöcken, Einzelschicht Y=10 mit 26 Blöcken, X-Schnitt, Vierteldrehung, konkrete Blockauswahl X=2/Y=7/Z=4. Ohne WebGL greift die gekennzeichnete Softwareansicht. Hardware-WebGL, echter iPhone-/Touchtest und Dateiimport per Browser-Dateidialog bleiben nicht geprüft. Kein Schem-Import, kein freier Flug, kein Composer oder Minecraft-Export.
