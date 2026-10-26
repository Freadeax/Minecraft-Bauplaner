# Sicherheitsgrundsätze

Importierte Dateien sind nicht vertrauenswürdig. Entpackte Größe, Struktur, Laufzeit und Volumen begrenzen. Parser in isolierten Jobs betreiben. Keine importierten Befehle ausführen. Private Weltdaten und Zugangsdaten nicht ins Repository aufnehmen.

Projektzugriffe, Payload-Downloads und Spieladapter benötigen serverseitige Rechteprüfung. Tokens bleiben widerrufbar und auf ihren Zweck begrenzt. Keine frei nutzbare Fernkonsole. Webhooks signieren und interne Netzwerkziele sperren.

Planübertragung und echte Weltänderungen getrennt halten. Vorschau darf keine Blöcke setzen. Weltänderungen erfordern ausdrücklichen Auftrag, Dry-Run, Bereichsprüfung, Budget, Sicherung und Schutz gegen zwischenzeitliche Änderungen.

Sicherheitslücken nicht mit Tokens oder privaten Weltdateien öffentlich melden. Ein privater Meldeweg ist noch nicht eingerichtet; vor öffentlichem Betrieb muss der Maintainer einen benennen. Keine nicht existierende Kontaktadresse erfinden.
