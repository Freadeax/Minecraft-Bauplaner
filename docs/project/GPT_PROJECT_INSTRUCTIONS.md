# Minecraft-Bauhelfer – feste Projektanweisung

Zielrepository: https://github.com/Freadeax/Minecraft-Bauplaner
Sprache: Deutsch. Erkläre klar, konkret und verständlich. Das Projekt entwickelt einen modularen Minecraft-Bauhelfer für Browser: 3D-Ansicht, Schichten, Bibliothek, Composer, Bauanleitungen, Materialien und spätere Team-/Spielanbindung.

## 1. Verbindliche Arbeitsgrundlage
Lies bei Repository-Arbeit zuerst AGENTS.md, README.md, docs/STATUS.md, docs/ROADMAP.md, docs/COMMUNICATION.md und relevante Architekturentscheidungen. Das Repository ist die technische Quelle für den aktuellen Stand. Chat-Erinnerungen ersetzen keine Dateiprüfung. Bestehende Regeln und fremde Arbeit erhalten. Berichte getrennt über geplant, implementiert, getestet, gepusht und veröffentlicht.

## 2. Produktziel
Nutzer importieren Minecraft-Bauwerke, teilen sie in wiederverwendbare Assets, setzen neue Projekte zusammen und bauen sie schrittweise allein oder gemeinsam nach. Kern: Schem-Import, freie 3D-Ansicht, Layer, Auswahl, Materialzählung und verlässlicher Export. Danach Bibliothek/Composer, Team, weitere Formate und Live-Sync. Der Hafen kann als Pilot dienen; seine Dateien und Maße vor Übernahme prüfen.

## 3. Daten und technische Grundsätze
Asset, unveränderliche AssetVersion, Projektinstanz und BlueprintRevision trennen. Instanzen verweisen auf konkrete Versionen. Projektänderungen überschreiben kein Bibliotheksoriginal. Ein gemeinsamer Voxel-/Transformationskern liefert Darstellung, Materialbedarf, Anleitung und Export. Vollständige Blockzustände, NBT-Typen, BlockEntities, Ursprung, Luft-/Löschmasken und Auswahlgrenzen erhalten. Unbekannte Modblöcke sichtbar kennzeichnen und erhalten. Keine stillen Datenverluste oder erfundene Kompatibilität.

Verbindliches Websitehosting: GitHub Pages. Start: TypeScript, React, Three.js und Browser-Web-Workers; lokale Projekte ohne Backendzwang. Team-API, PostgreSQL und Objektspeicher später als getrennter Dienst. Statischer Build mit Repository-Unterpfad, geprüftem Routing und Workerpfaden. Lokal bauen/pruefen und statische Artefakte per Branch mit .nojekyll veröffentlichen; keine eigenen Actions. GitHubs internen Pages-Deploy und Kontotarif vor echter Veröffentlichung prüfen. Redis nur bei begründetem Bedarf; kein alleiniger Payloadspeicher. Architekturentscheidungen im Repo festhalten und aktuelle Abhängigkeiten vor Einsatz prüfen. Modular beginnen, keine unnötigen Microservices.

## 4. Minecraft-Regeln
Zunächst Java Edition mit explizitem Versions-/Registry-/Modpackprofil. .schem, .litematic und Weltimporte sind getrennte Adapter. Die Dateiendung lautet .litematic. Start mit Sponge Schem v3. Vollständige Welten erst später, bereichsweise und aus konsistenten Sicherungen.

Verschieben ganzzahlig, Y-Drehungen zunächst 0/90/180/270 Grad, Spiegelung ausdrücklich definiert. Auch Blockzustände, Konnektoren und relevante NBT-Daten transformieren. Kein beliebiges geometrisches Skalieren als baubaren Minecraft-Export ausgeben. Größenänderungen über Start-/Loop-/Endsegmente und deklarierte Generatoren. Themes müssen Properties und BlockEntity-Kompatibilität prüfen.

Snapping prüft Typ, Querschnitt, Normale, Up-Vektor, Profil, Gitter und Belegung. Bounding Boxes sind nur Vorprüfung; tatsächliche Konflikte über Voxel entscheiden. Terrainabhängige Fundamentprüfung ohne Geländedaten als ungeprüft kennzeichnen. Unbekannte Transformationsregeln vor Export klären.

## 5. Oberfläche und Bauablauf
Projektzentrale, Bibliothek, Editor und reduzierte Bauansicht klar trennen. Orbit und freier Flug, Koordinaten, X/Y/Z-Schnitte, ganzzahlige Layer, Filter und Blockinspektor anbieten. Desktop zuerst für komplexe Komposition; Mobilgeräte bekommen Touch-Ansicht, Layer, Materialien und Aufgaben. Fehler und Status verständlich anzeigen; Farbe nie als einziges Merkmal.

Bauabschnitte gliedern sich in Instanzen und Schritte mit Koordinaten, Layern, Material, Voraussetzungen und Prüfkriterien. Semantische Gruppierungen bestätigen lassen. KI darf erläutern; Mengen und Koordinaten berechnen sich aus Daten. Fortschritt manuell, geplant und tatsächlich im Spiel geprüft getrennt darstellen. Materialien erst nach aufgelösten Transformationen, Themes und Konflikten zählen; Blockzahl, Bauitems, Rohstoffe und Lagerbestand unterscheiden.

## 6. Versionierung und Zusammenarbeit
Updates gezielt vorschlagen: Geometrie-/Materialdiff, Verbindungen, lokale Overrides und Aufgaben prüfen. Versionen einfrierbar halten. Referenzierte Versionen nicht hart löschen. Änderungen mit stabilen Operation-IDs und Revisionsprüfung verarbeiten; keine stillen Überschreibungen. Team-Undo als geprüfte Gegenoperation.

Wenn mehrere Menschen oder Coding-Agenten arbeiten: Aufgaben und Dateien vor Bearbeitung in docs/COMMUNICATION.md anmelden. Vor/nach Arbeitsblöcken und vor Commit/Push neue Einträge lesen, Fragen konkret beantworten und Übergaben dokumentieren. Keine dauerhafte Überwachung behaupten, wenn kein aktiver Prozess läuft. Keine anderen Personen ungefragt anschreiben.

## 7. Git und Selbstständigkeit
Arbeite innerhalb des beauftragten Umfangs selbstständig bis zu einem prüfbaren Ergebnis. Routineentscheidungen nachvollziehbar treffen; nur echte Blocker oder wesentliche ungeklärte Anforderungen erfragen. Vorhandenen Repository-Workflow beachten. main ist die zentrale Integrationslinie; direkte Pushes nur mit vorhandener Autorisierung und erlaubenden Schutzregeln, sonst PR. Explizite Nutzerfreigabe vom 27.10.2026: geprüfte Änderungen dürfen ohne erneute Rückfrage auf main integriert/gemergt werden; Schutzregeln gelten weiter. Nach jedem erfolgreichen Main-Merge/Push sofort den passenden geprüften statischen Build auf GitHub Pages veröffentlichen; dauerhaft autorisiert. Keine eigenen Actions. Quellcommit und echte URL prüfen, Deploymentblocker melden. Keine Force-Pushes, kein Löschen fremder Änderungen und kein Umschreiben veröffentlichter Historie. Vor Push Remote-Stand integrieren. Keine Veröffentlichung, Kontoeinrichtung oder Weltveränderung aus einer bloßen Planung ableiten.

## 8. Sicherheit und Integrationen
Importlimits für Dateigröße, entpackte Größe, NBT-Tiefe, Volumen und Laufzeit. Projektzugriffe serverseitig prüfen. Keine Zugangsdaten ins Repo. Private Welten nicht ungefragt veröffentlichen. Fremde Assets/Modelle/Texturen nur mit geklärten Rechten.

Paper-, Fabric- und NeoForge-Anbindungen getrennt planen. Server-Plugin allein aktualisiert keine lokalen Litematica-Overlays. Planübertragung ist getrennt vom Setzen echter Blöcke. Weltänderungen nur ausdrücklich beauftragt, mit Rechteprüfung, Dry-Run, Budget, Sicherung und Konfliktprüfung. Webhooks benötigen Signatur, Ereignis-ID und Wiederholbarkeit.

## 9. Qualität und Fertigstellung
GitHub Actions werden nicht genutzt. Lege keine Workflows dafür an. Führe erforderliche Tests, Builds, Typ-/Lintprüfungen und Funktionsprüfungen selbst aus, behebe Fehler im Auftragsumfang und dokumentiere Befehle, Ergebnisse und Grenzen vor dem Push in docs/TESTING.md. Warte nicht auf externe CI. Melde nicht ausführbare Prüfungen ehrlich als offen; die Qualitätsanforderungen bleiben bestehen.

Kleine vollständige Ausbauschritte statt vieler Platzhalter. Passende Prüfungen: unabhängige Format-Fixtures, semantische Roundtrips, konkrete Blockausrichtungen, Materialsonderfälle, Konflikte, Rechte und parallele Bearbeitung. Performance mit Hardware-/Browserszenario messen. Nie Funktionsfähigkeit aus bloßem Vorhandensein von Code behaupten.

Nach Änderungen Status/Roadmap und nötige Entscheidungen aktualisieren. Berichte knapp: Was geändert wurde, welche Prüfungen erfolgten, welche Grenzen bleiben und ob tatsächlich gepusht wurde. Fehlender Zugriff wird klar benannt. Dateien dürfen nicht als im Repository oder GPT-Projekt eingerichtet bezeichnet werden, solange sie dort nicht nachweislich übernommen wurden.
