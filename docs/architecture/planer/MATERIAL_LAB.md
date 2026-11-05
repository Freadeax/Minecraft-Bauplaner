# MAT-02 · Materiallabor

Stand: 01.11.2026. Im Tab „Material“ ergänzt das Materiallabor die Bauitemtabelle um durchsuchbare Karten, Familien, Herkunft und Sortierung. Es verwendet denselben `MaterialReport` und denselben Projekt-/Instanzumfang wie die Tabelle. Es verändert weder Bauteile noch Paletten, Lager oder Rezepte.

Die Anzeigefamilien Holz, Stein und Farbmaterial werden aus dem vorhandenen expliziten Materialvarianten-Katalog (`variants.ts`) gelesen; nicht zugeordnete IDs bleiben „Weitere Materialien“. Andere Namensräume erben niemals Vanilla-Familien. Die Gruppen sind keine Aussage über Austauschbarkeit oder herstellbare Rezepte. Mengen, Stapelgrößen, Mehrblockregeln, Quellen und Annahmen stammen unverändert aus `materials.ts`. Ungelöste Zustände fehlen ausdrücklich in den Bauitems und bleiben im separaten Fehlerabschnitt sichtbar.

Suche umfasst Item-ID, Quellblock-ID, deutschen Materialsatz und Familiennamen; mehrere Suchwörter werden gemeinsam gefordert. Familienzahlen beschreiben den gesamten gewählten Umfang, Trefferzahlen und Inventarplätze die gefilterte Auswahl. Höchster Bedarf zuerst oder Item-ID A–Z; zunächst sechs Karten, weitere jeweils zwölf. Herkunft zeigt vollständige Quellzustände und die Umrechnung von Zellen in Items. Vorschaufarben sind eigene schematische Farbcodes, keine Minecraft-Texturen.

Das bestehende Lager und der verbleibende Sammelbedarf werden weiterhin ausschließlich von der Baustelle verwaltet. Es gibt kein paralleles Laborinventar, keine externe Registry und kein zusätzliches Repository. Die Anzeige „Katalogregel“ ersetzt keine exakte Spielprofil-Abnahme.

Prüfung: `tests/unit/materials/material-lab.test.mjs` mit handgezählten Doppelstufen, Türhälften, Modblock, Annahmen, Filterkombinationen und Nichtmutation. UI-Regressionsfall im bestehenden Material-E2E-Test; tatsächliche Browserausführung getrennt in `docs/TESTING.md` dokumentieren.


## MAT-03 · Spezifische Familien · 01.11.2026

Das Labor erkennt Glas, Beton und Terrakotta jetzt getrennt über denselben additiven Familienvertrag wie die Variantenoberfläche. Beispielsweise wird rotes Buntglas als „Glas · Rot“ gefunden und kann über die Familie „Glas“ isoliert angezeigt werden. Wolle, Bett und Banner bleiben im bisherigen Farbmaterialbereich. Klar-/Buntglasscheiben, normaler Beton/Trockenbeton und normale/glasierte Terrakotta bleiben verschiedene Bauitems mit ihren unveränderten Mengen und Quellzuständen. Die Anzeige kann weder Rezepte noch Eigenschaften oder Items ersetzen.

Kernregression: drei zuvor gemeinsam als Farbmaterial eingeordnete Bauitems werden jetzt den exakten drei Familien zugeordnet; deutsche Suche und Gruppenmengen bleiben nachvollziehbar. Das Labor ändert keine alten Versionsreferenzen. BlockEntity-Sicherheit und Kompatibilität des Materialtauschs sind im [Variantenvertrag](SCHEM_VIEWS.md) dokumentiert.
