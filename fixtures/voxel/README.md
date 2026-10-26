# Handberechnete Voxel-Fixture

Eigene synthetische Testdaten, keine importierte Minecraft-Datei und keine bestätigte Versionskompatibilität. Die Kennung `fixture:java-state-contract-v1-unverified` ist ausschließlich ein Testprofil.

`asymmetric.json` enthält 9 ausgewählte Zellen in einem 4×2×3-Bereich: 7 Blöcke, 1 explizite Höhlenluft und 1 Löschzelle. Die übrigen 15 Zellen sind nicht ausgewählt. Zwei Steinblöcke zählen getrennt; keine automatische Item- oder Stackumrechnung. Der BlockEntity-Inhalt ist synthetisch und kein Nachweis für ein gültiges Spielobjekt.

`expected.json` wurde von Hand berechnet und wird weder aus dem Transformationscode noch aus einem Exporter generiert. Bei einer Vierteldrehung und Zielpivot (10,64,-20) gilt für Zellminima: x′=9−z, y′=64+y, z′=−20+x. Für Grenzpunkte gilt x′=10−z. Beispiel: Zelle (−2,0,−1) wird (10,64,−22). Die Grenzbox wird [8,64,−22] bis exklusiv [11,66,−18].

Bekannte Erwartungen: Nord wird Ost; X-Stammachse wird Z; Spiegelung an lokal X vertauscht bei Treppen links/rechts. Im Layer Y=1 liegen zwei Blöcke, eine Luftzelle und eine Löschzelle. Unbekannte Maschine und BlockEntity melden bei Transformation ungelöste Semantik.

Dies sind unabhängige interne Vertragsfixtures für P0-03. Echte binäre Schem-Fixtures aus einem Referenzwerkzeug bleiben für P1-01 offen.
