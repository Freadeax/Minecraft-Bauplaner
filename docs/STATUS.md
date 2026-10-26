# Projektstand

Stand: 27.10.2026. Erster implementierter Voxel-Kern auf Planungsgrundlage.

| Bereich | Bestätigter Stand |
|---|---|
| Nutzerziel | Modularer Minecraft-Bauhelfer für Browser und spätere Team-/Spielanbindung |
| Repository | Freadeax/Minecraft-Bauplaner als Ziel benannt |
| Remote-Prüfung | Authentifiziert geprüft: initial nur README, main ungeschützt |
| Websitehosting | GitHub Pages verbindlich; Browser-Worker/lokale Projekte zuerst. Pages-Konfiguration, Tarif und Deployment noch offen |
| Planung | Gesamtspezifikation, Regeln, Roadmap und Anforderungen ausgearbeitet |
| Kern | TypeScript-Typen, Laufzeitvalidierung, unveränderliche Snapshots, Geometrie-/begrenzte Zustandstransformation, X/Y/Z-Auswahl und Blockzustandszählung implementiert |
| Anwendung | Browser-UI, Dateiparser, Persistenz, API und Export noch nicht implementiert |
| Prüfung | 43 Node-Tests, strenge Typprüfung, Bibliotheksbuild und Dokumentationsprüfung lokal bestanden; Details in TESTING.md |
| Automatisierung | GitHub Actions werden auf Nutzeranweisung nicht genutzt; Workflow entfernt. Prüfungen werden eigenständig ausgeführt und in docs/TESTING.md dokumentiert. |
| Integration | Basis auf main: 7dbd12e3fcb2cb71e5bfaa846a6398c9394b3317; Kernpaket für codex/voxel-core vorbereitet, main nicht aktualisiert |
| GPT-Projekteinstellungen | Anweisung vorbereitet, nicht automatisch eingetragen |

## Nächster Arbeitsschritt

P0-02/P0-03 sind als interner Vertrag und unabhängig handberechnete Testfixtures abgeschlossen. P1-02/P1-04 sind begonnen; die Teilabnahme umfasst keine allgemeine Zustands-/NBT- oder Registrykompatibilität. Als Nächstes P1-01: begrenzter Schem-v3-Reader mit unabhängigen binären Referenzfixtures. Keine Browser-/Spielprüfung erfolgt.

## Vor Integration klären

Zielprofil für Minecraft und Modpack aus dem tatsächlichen Projektstand ableiten; falls dort ungeklärt, gezielt erfragen. Frontendhosting ist durch den Nutzerzusatz festgelegt: GitHub Pages. Backendanbieter, Lizenz und erster Serveradapter sind noch keine angenommenen Nutzerentscheidungen. Diese Punkte blockieren die Bearbeitung der allgemeinen Grundregeln nicht.

## Integration dieses Arbeitspakets

Geprüfter lokaler Stand auf Basis von main `7dbd12e3fcb2cb71e5bfaa846a6398c9394b3317`. Direktes main-Update wurde durch die automatische Freigabeprüfung abgelehnt. Geprüfte Änderungen werden zur Reviewintegration vorbereitet; kein Deployment oder Release. Der Integrationsstand wird im Abschluss mit tatsächlichem Link angegeben.
