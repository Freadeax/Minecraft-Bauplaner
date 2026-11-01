# UI-01 Theme-Kern und Oberfläche

Implementiert: fünf rein visuelle Themen (Modern, Mittelalter, Industrie, Fantasy, Nether), jeweils eigene helle und dunkle Paletten. Drei Erscheinungsmodi: dunkel, hell, Geräteeinstellung. Die Komponente `ThemeControl` bietet die Auswahl über „Darstellung“ in der Hauptnavigation. Änderungen der Geräteeinstellung werden im Systemmodus direkt übernommen.

Die Auswahl liegt unter `lmnt:appearance:v1` im bestehenden robusten Preference-Store. Gesperrter oder voller localStorage erhält Änderungen während der laufenden Sitzung; ein Neustart ohne erfolgreichen Schreibzugriff kann diese Auswahl nicht erhalten. Änderungen, Löschen und Leeren aus anderen Tabs werden berücksichtigt. Beschädigte oder unbekannte Werte fallen auf Modern/System zurück.

`themeTokens.mjs` bleibt unabhängig von Browser-APIs. `themePreferences.ts` enthält den Speicheradapter, `ThemeControl.tsx` verbindet React, Systemereignisse und CSS. Die nach den bestehenden Styles geladene `theme.css` bindet semantische Tokens an vorhandene Panels und Aktionen; dunkle Grafikflächen besitzen eigene lesbare Vordergrundfarben. Die Darstellung ändert keine Blockfarben, Voxel, Materialpaletten oder gespeicherten Projekte. Keine zusätzlichen Abhängigkeiten, keine Registry und kein produktiver Login.

Prüfung: `tests/theme-tokens.test.mjs` prüft sichere Rückfallwerte, unveränderliche Tokens, Systemauflösung sowie Text-, Akzent- und Schaltflächenkontrast von mindestens 4,5:1 für alle zehn Paletten. `tests/theme-preferences.test.mjs` prüft beschädigte Werte, gesperrten Speicher, Quota-Fehler, Reload und Tab-Invalidierung. CSS-Kontrast und Touchbedienung der vollständigen Oberfläche benötigen zusätzlich Browser-/Geräteprüfung; Tokenkontrast allein belegt keine vollständige Barrierefreiheit.

Browserregression `tests/e2e/theme.e2e.mjs`: tatsächliche Theme-Auswahl, Reload, Wechsel Hell/Dunkel/System und in den Bildschirm passende Steuerung bei 1400 und 390 px. Ausführung erfordert vorhandenes Playwright-Chromium; der reine Quelltext des Tests ist kein Browsernachweis.
