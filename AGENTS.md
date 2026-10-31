# Verbindliche Arbeitsregeln für Minecraft-Bauplaner

Geltung: gesamtes Repository. Explizite aktuelle Nutzeraufträge und übergeordnete Systemregeln haben Vorrang. Spezifischere Unterverzeichnisregeln gelten zusätzlich, soweit sie nicht widersprechen.

## Vor Arbeitsbeginn

1. README, diese Datei, docs/STATUS.md, docs/ROADMAP.md, docs/COMMUNICATION.md und relevante Architekturentscheidungen lesen.
2. Arbeitsbaum, Branch und aktuellen Remote-Stand prüfen. Vorhandene oder fremde Änderungen weder löschen noch ungefragt überschreiben.
3. Neueste Kommunikation lesen und betroffene Aufgaben mit stabilen IDs identifizieren. Planungsstand, implementierten Stand und tatsächlich geprüften Stand unterscheiden.
4. Ziel, betroffene Dateien, Abhängigkeiten und Prüfmethode kurz festhalten. Bestehende Architektur erweitern; keine parallele Ersatzanwendung anlegen.

## Produkt und Architektur

- Primär Minecraft Java Edition; jedes unterstützte Versions-/Modpackprofil explizit dokumentieren.
- Asset, unveränderliche AssetVersion, platzierte Instanz und BlueprintRevision getrennt halten.
- Gemeinsamer Voxel-/Transformationskern für Vorschau, Materialzählung und Export. Keine voneinander abweichenden Koordinatenregeln.
- Block-ID, vollständige Properties, NBT-Typen, Ursprung, explizite Luft und Auswahlgrenzen erhalten.
- Exportierbare Transformationen diskret halten. Größenänderung durch deklarierte Generatoren; kein beliebiges Mesh-Skalieren als korrekten Bauplan ausgeben.
- Konflikte auf Voxelbasis prüfen. AABB ist ein Vorfilter. Fehlendes Gelände bedeutet ungeprüftes Fundament.
- Binäre Originale und normalisierte Payloads dauerhaft speichern. Redis und Vorschau-Meshes sind keine Originaldatenbank.
- Versionsupdates nur gezielt, mit Vorschau der Folgen. Verwendete Versionen bleiben reproduzierbar.
- Keine produktive externe Infrastruktur, Konten oder Geheimnisse voraussetzen oder erfinden.

## Umsetzung

- Kleine, vollständige vertikale Arbeitspakete liefern. Neue Abhängigkeiten begründen und Versionen fixieren.
- Geschäftliche Regeln in gemeinsamen Paketen halten; UI und Parseradapter bleiben austauschbar.
- Unbekannte Blöcke sichtbar erhalten. Unbekannte Zustandsumwandlung beim Export als ungelöst behandeln.
- Fehler verständlich anzeigen; keine leeren Erfolgszustände. Abgebrochene Jobs dürfen keine halbfertige Veröffentlichung hinterlassen.
- Demo-Daten, Platzhalter, manuelle und automatisch gemessene Ergebnisse sichtbar kennzeichnen.
- Keine automatische Weltveränderung als Nebeneffekt von Import, Vorschau oder Live-Sync.
- Öffentliche Assets benötigen Autor, Herkunft und geklärte Nutzung. Keine Minecraft-Texturen ohne entsprechende Rechte beilegen.

## Zusammenarbeit

- Vor jedem abgeschlossenen Arbeitsblock, vor Commit/Push und nach längeren Prüfungen neue Kommunikation prüfen.
- Betroffene Dateien und Aufgaben in docs/COMMUNICATION.md anmelden. Überschneidungen vor Änderungen abstimmen.
- Protokoll ist kein Hintergrundprozess: keine ständige Überwachung behaupten. Wartezeiten, Blocker und Ende des eigenen Auftrags ausdrücklich notieren.
- Reaktionen auf andere Agenten mit Nachrichten-ID und konkretem Ergebnis dokumentieren. Keine bloßen Empfangsbestätigungen ohne notwendigen Inhalt.
- Niemandem außerhalb des Repositorys automatisch Nachrichten senden. Discord und Webhooks nur im ausdrücklich beauftragten Funktionsumfang verwenden.

## Git und Veröffentlichung

Ausführungsplan: [GitHub-Konnektor und Pages](docs/operations/GITHUB_CONNECTOR_RUNBOOK.md). Unterstützte Operationen selbst ausführen; Capabilitygrenzen nicht als fehlende Nutzerfreigabe darstellen.

- Der vorhandene Repository-Workflow gilt. Im unklaren Fall keine Branch-/Schutzregeln eigenmächtig ändern.
- Wunschgrundsatz für dieses Projekt: main ist die zentrale Integrationslinie; keine dauerhaften konkurrierenden Entwicklungsstände. Direkter Push nur mit bestehender Autorisierung, bestandenen Prüfungen und sofern Schutzregeln ihn erlauben. Sonst PR verwenden.
- Explizite Nutzerfreigabe vom 27.10.2026: geprüfte Änderungen in diesem Repository dürfen ohne erneute Rückfrage auf main gemergt bzw. regulär integriert werden. Bestehende Schutzregeln und Prüfpflichten gelten weiter.
- Nutzerregel vom 27.10.2026: Nach jedem erfolgreichen Merge/Push auf main unverzüglich den passenden lokal geprüften statischen Website-Build über GitHub Pages veröffentlichen, ohne erneute Freigabe. Keine eigenen Actions. Quellcommit, Deploymentstand und echte URL prüfen; Blocker ausdrücklich melden. Ohne Webbuild keine Veröffentlichung vortäuschen.
- Keine Force-Pushes, kein Reset fremder Arbeit, kein Umschreiben veröffentlichter Historie.
- Vor Push aktuellen Remote-Stand prüfen und Änderungen sauber integrieren. Konflikte fachlich lösen, nicht pauschal eine Seite wählen.
- Commit nur die eigenen geprüften Änderungen. Commit, Push, Deployment und Release sind getrennte Aktionen und getrennt zu berichten.

## Parallele Blöcke

Bei paralleler Arbeit gelten Dateizuständigkeiten und Regeln aus docs/BLOCKS.md. Vor jedem Push `git pull --rebase origin main`, vollständige Prüfung, danach `scripts/publish_pages.sh`.

## Prüfungen ohne GitHub Actions

- GitHub Actions werden nicht verwendet. Keine Workflows unter `.github/workflows` anlegen oder aktivieren.
- Der bearbeitende Agent führt benötigte Tests, Builds, Lint-/Typprüfungen und relevante Funktionsprüfungen selbst in seiner verfügbaren Arbeitsumgebung aus und behebt Fehler im Auftragsumfang.
- Nicht auf externe CI warten und keine grünen CI-Checks als Voraussetzung verlangen. Qualitätsanforderungen bleiben vollständig bestehen.
- Prüfprotokoll vor Commit/Push aktualisieren: Befehl, Ergebnis, geprüfter Stand und Grenzen. Nicht ausführbare Prüfungen als offen melden, niemals als bestanden behandeln.
- Details: docs/TESTING.md. Deployment und Releases innerhalb des ausdrücklich autorisierten Umfangs ebenfalls selbst vorbereiten und prüfen.

## Prüfung und Abschluss

- Format-/Parseränderungen: unabhängige Fixtures und semantische Roundtrips.
- Transformationen: konkrete Zustandsausrichtungen sowie vier Vierteldrehungen und doppelte Spiegelung.
- Materialien: Instanzüberschneidungen, Themes, Mehrblockobjekte und Item-Mappings.
- Teamänderungen: parallele Operationen, Berechtigungen, Wiederholung und Wiederverbindung.
- Oberfläche: angemessene Desktop-/Touch-Prüfung; keine umfassende Funktion behaupten, die nur statisch geprüft wurde.
- Erforderliche Checks aus Projektkonfiguration ausführen. Unveränderte fremde Fehler gesondert melden; keine Tests zum Erreichen eines grünen Ergebnisses abschwächen.
- STATUS, ROADMAP und gegebenenfalls Entscheidungen aktualisieren. Ergebnis, Prüfungen, Grenzen, Commit-/Push-Stand und nächste konkrete Aufgabe nennen.
- Eine Aufgabe ist erst fertig, wenn Verhalten, passende Prüfungen und Dokumentation übereinstimmen.

## Nutzerpräzisierung · 31.10.2026

Fertige Änderungen immer regulär auf main pushen und unmittelbar als aktuelle GitHub Page veröffentlichen. Nicht ausführbare Browserprüfungen wegen fehlender Testinfrastruktur ausdrücklich dokumentieren; sie allein halten die Veröffentlichung nach dieser Nutzerpräzisierung nicht auf. Ausführbare Prüfungen bleiben erforderlich; bekannte Produktfehler sind zu beheben. Kein Force-Push, keine eigenen Actions.
