# Änderungen der Bauplaner-Brücke

Je Version ein Abschnitt `## <Version> – <Datum>`. `scripts/modrinth_publish.mjs release` übernimmt den Abschnitt der Version unverändert als Änderungsliste auf Modrinth und bricht ab, wenn er fehlt. Englisch zuerst, Deutsch danach.

## 0.10.0 – 2026-11-03

**Team building / Teambau**

- Team building with the Bauplaner Paper plugin: section frames in the owner's colour, “My task” in the HUD, `/bauplaner team` to claim, finish and hand back sections, notes and deliveries, storage chests of the team.
- The mod only talks to the server's team channel after the server announces it and you run `/bauplaner team erlauben` once on that server.
- Website link: “Sync with game” exchanges the team state with the planner on the same PC.
- NeoForge: fixed a crash at load time caused by the team channel.
- Paper plugin: team hub for the channel above and protected team storage chests that count deliveries.

- Teambau mit dem Paper-Plugin: Abschnittsrahmen in der Farbe des Bauenden, „Mein Auftrag“ im HUD, `/bauplaner team` zum Nehmen, Fertigmelden und Zurückgeben, Notizen, Lieferungen und Lagerkisten.
- Der Teamkanal zum Server wird erst benutzt, wenn der Server ihn anbietet und du einmal je Server `/bauplaner team erlauben` eingibst.
- Website-Verbindung: „Mit Spiel abgleichen“ tauscht den Teamstand mit dem Planer auf demselben PC aus.
- NeoForge: Absturz beim Laden durch den Teamkanal behoben.
- Paper-Plugin: Teamknoten für den Kanal und geschützte Lagerkisten des Teams, die Lieferungen mitzählen.

## 0.9.0 – 2026-11-03

- Large plans up to 4 million blocks: loading and moving in the background, build state checked in slices, `/bauplaner leistung` adjusts the render budget. / Große Pläne bis 4 Mio. Blöcke, Laden im Hintergrund, `/bauplaner leistung`.

## 0.8.0 – 2026-11-02

- Live protocol 2: zones, layers and colours for map markers, new point types, nearby players for the website. / Zonen, Ebenen, Farben, neue Punktarten, Mitspieler für die Website.

## 0.7.2 – 2026-11-02

- `/bauplaner diagnose` writes a report for bug reports; crash guard for the hologram. / Diagnosebericht und Absturzschutz.

## 0.7.1 – 2026-11-02

- The website can read the build state from the game (`/v1/scan`). / Baustand für die Live-Karte.

## 0.7.0 – 2026-11-02

- Build sections, x-ray view, shulker boxes and bundles in the material list. / Bauabschnitte, Röntgensicht, Shulkerkisten.

## 0.6.0 – 2026-11-02

- NeoForge gets the full client mod; works with shaders. / NeoForge mit vollem Funktionsumfang, Shader-tauglich.

## 0.5.0 – 2026-11-02

- Optional local link to the planner website and map markers. / Website-Verbindung und Weltplan-Markierungen.

## 0.4.0 – 2026-11-02

- Placement helper. / Platzierhilfe.

## 0.3.0 – 2026-11-02

- Textures, material list and layers. / Texturen, Materialliste, Ebenen.

## 0.2.0 – 2026-11-02

- Hologram with live progress. / Hologramm mit Live-Abgleich.

## 0.1.0

- First version: record a build area for the planner. / Erste Version: Aufnahme für den Planer.
