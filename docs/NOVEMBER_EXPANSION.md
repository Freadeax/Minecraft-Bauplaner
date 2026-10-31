# Ausbauplanung November 2026

Status: Planung, nicht implementiert. Bestehende Dateireservierungen B15, B16, B17 und S4 respektieren.

## Aktiver Umfang

1. UI: einheitliche Design-Tokens, Dark/Light/System, Themen Medieval/Modern/Industrial/Fantasy/Nether, barrierearme Navigation, Desktop-Panels und mobile Detailansicht. Themes verändern nur Darstellung, nicht Voxel-/Materialdaten.
2. Viewer: zustandsabhängige Treppen, Slabs, Zäune, Mauern, Glas; klare Fallbacks für unbekannte Modblöcke, korrekte Layer und Picking, Performance- und Touchprüfung.
3. Bibliothek: Gebäude, Ensembles, eigene Sammlungen, Stil-/Versions-/Größenfilter, Autoren-/Lizenzangaben und unveränderliche AssetVersion-Referenzen. Keine fremden Inhalte ohne Rechte.
4. Materiallabor **im bestehenden Repository**: Blockpaletten, Materialfamilien, Bauitems, Rohstoff- und Lagerplanung. Rezeptdaten nur mit explizitem Versionsprofil; unbekannte Zuordnung kennzeichnen. Offline-Speicherung und Backup über bestehende Schnittstellen.
5. Architekturstudio: diskrete Generatoren, Anschlüsse, Voxel-Konflikte, Variantenvergleich, Bauphasen und konsistente Vorschau/Materialzählung/Export.
6. Optionaler Login: zunächst nur UX-/Sicherheitskonzept für später; Gastmodus und lokale Projekte bleiben vollständig nutzbar. Keine produktive Anmeldung ohne gesicherten Backend-Vertrag.

## Bewusst zurückgestellt

- **Kein zusätzliches GitHub-Repository für Materialien oder Assets.**
- **Keine externe oder repositoryübergreifende Registry.**
- Kein produktiver Team-/Cloud-Speicherdienst und keine GitHub-OAuth-Implementierung in dieser Phase.

## Arbeitsaufteilung

- UI-01: neue isolierte Theme-Komponenten und Tests, keine B15/B16-Dateien.
- LIB-02: Material- und Katalogschema innerhalb bestehender Pakete, B17-Reservierung vorher abstimmen.
- VIEW-03: nur nach Abstimmung mit B16.
- BUILD-04: Composer-/Generator-Verbesserungen nach S4-Revisionsschutz.

Je Block vor Bearbeitung Kommunikation prüfen und Dateibesitz anmelden; lokal Tests, Typecheck, Build und Dokumentationsprüfung durchführen, in TESTING protokollieren, STATUS/ROADMAP aktualisieren. Geprüfte Änderungen regulär auf main integrieren und Pages main/root mit Hashmanifest aktualisieren. Keine GitHub Actions.
