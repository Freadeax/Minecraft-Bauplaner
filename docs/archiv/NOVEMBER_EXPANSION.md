# Ausbauplanung November 2026

Status: teilweise implementiert (01.11.2026); die nachstehenden Ziele sind kein pauschaler Fertigstellungsnachweis. Bestehende Dateireservierungen B15, B16, B17 und S4 respektieren.

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

## Fortschreibung der Arbeitsblöcke · 01.11.2026

| Block | Ergebnis / nächster prüfbarer Schritt | Stand |
|---|---|---|
| UI-01 | Fünf Oberflächenthemen, Hell/Dunkel/System, Speicherung | Implementiert; visuelle Geräteprüfung offen |
| MAT-02 | Projektmaterialien nach Familien, Suche, Zuordnung und Herkunft | Implementiert; kein zweites Lager |
| WORLD-01 | Acht Bauwelten als strukturierte Zugänge zur vorhandenen Bibliothek, berechnete Treffer und teilbare Filterlinks | In dieser Fortsetzung implementiert; keine neuen Gebäude behauptet |
| MAT-03 | Getrennte Glas-/Beton-/Terrakotta-Farben und kontrollierter Materialtausch | In dieser Fortsetzung; genaue Abnahme in TESTING |
| WORLD-02 | Fernöstliche Gärten, Wüstenhandel und End-Bauten als weitere Themen; erst nach Prüfung der echten Katalogabdeckung ergänzen | In dieser Fortsetzung implementiert: drei Welten aus tatsächlichen Katalogeinträgen, Kernprüfung bestanden |
| BUILD-05 | Bauwelt als eigene Anlage zusammenstellen; konkrete AssetVersion-Referenzen, Abstands-/Konfliktvorschau, explizite Projektübernahme | Geplant; keine automatische Platzierung aus Themenklick |
| MAT-04 | Kupfer mit Oxidation und Wachsstatus; Profilnachweis sowie vollständige Zustandsregeln vor Tausch | Geplant |
| UI-02 | Echte Desktop-/iPhone-Abnahme für Themen, Filterwechsel und helle Panels | Offen; Browserlaufzeit in dieser Umgebung fehlt |

Neue Themen bündeln kuratierte Aufbauideen und vorhandene Bauteile. Trefferzahlen entstehen aus demselben Katalogfilter wie die verlinkte Suche; Varianten, Archivzustand und eigene Bauteile werden konsistent behandelt. Die Themenauswahl ist kein Minecraft-Kompatibilitätsnachweis. Weitere Gebäudesätze bleiben eigene vollständige Ausbauschritte mit Geometrie-, Material- und Exportprüfung.
