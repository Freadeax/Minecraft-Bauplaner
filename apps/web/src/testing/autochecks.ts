/**
 * Automatische Abnahmen der Testphase (Roadmap-Runde 06.11.2026, Regel aller Blöcke): ein Testfall gilt als
 * „automatisch geprüft“, wenn ein reproduzierbarer Test im Repository (Skript + Eintrag in docs/TESTING.md)
 * genau das beobachtbare Ergebnis des Falls nachweist. Die Seite #/testphase zeigt den Nachweis am Fall,
 * docs/testing/TESTPLAN.md listet alle Einträge (render_testplan.mjs prüft, dass die Fall-IDs existieren).
 *
 * `scope: 'voll'` nur, wenn der Test den beschriebenen Umfang des Falls wirklich abdeckt. Was nur ein Mensch
 * beurteilen kann (eigener Launcher, Gefühl beim Spielen, Philipps echter Server, Geräte), steht in `remaining`
 * und der Fall bleibt mit `scope: 'teil'` in der Handliste. Jeder Block trägt seine Fälle hier ein; ein Fall
 * hat höchstens einen Eintrag (mehrere Tests gehören in `command`/`covers`).
 */
export type AutoScope = 'voll' | 'teil';

export interface AutoCheck {
  /** Testfall-ID aus testplan.ts. */
  readonly caseId: string;
  readonly scope: AutoScope;
  /** Was der Test im echten Ablauf nachweist (beobachtbar, in Worten des Falls). */
  readonly covers: string;
  /** Was nur ein Mensch prüfen kann; Pflicht bei scope 'teil'. */
  readonly remaining?: string;
  /** Befehl, der den Nachweis wiederholt (steht auch in docs/TESTING.md). */
  readonly command: string;
  /** Letzter bestandener Lauf: Datum, geprüfter Stand (Commit/Mod-Version), Umgebung. */
  readonly evidence: string;
}

export const AUTO_SCOPE_LABEL: Readonly<Record<AutoScope, string>> = { voll: 'automatisch geprüft', teil: 'teilweise automatisch geprüft' };

export const AUTO_CHECKS: readonly AutoCheck[] = [
  {
    caseId: 'KARTE-07', scope: 'teil',
    covers: 'Auf einem echten Paper-26.3-Server setzt das Spiel selbst (/place template) einen Probebau mit Treppen, Tür, Doppelkiste, Bett, Schienen, Zaun, Mauer, Schild, Banner, Stamm, Kolben, Leiter, Hebel, Falltür, Verbundblock und Verstärker in allen 8 Lagen (4 Drehungen, je ungespiegelt und gespiegelt). Alle 1512 Zellen stimmen Block für Block mit der Regel der Mod (Placement.java) und der des Planers (placeToWorld/turnState) überein – Weltkoordinaten und Blockzustände; die gespiegelte Doppelkiste teilt das Spiel beim Spiegeln, die Regel hält sie als Doppelkiste zusammen (vom Spiel bestätigt). Das Server-Plugin bekommt eine gedrehte + gespiegelte und eine gedrehte Lage über den Team-Raum und legt die Abschnitte genau über die vom Spiel gesetzten Blöcke.',
    remaining: 'Im eigenen Spiel: Projekt auf der Karte mit R drehen, „Ins Spiel senden“, im Spiel weiterdrehen/spiegeln und „Lage aus dem Spiel übernehmen“; Hologramm steht auf dem Grundriss, F3-Koordinate passt zur Bauanleitung.',
    command: 'scripts/mod/test_bridge_paper_placement.sh',
    evidence: '06.11.2026, Paper 26.3 Build 244, Plugin 0.23.0 aus dem Quellstand, Team-Raum per wrangler dev: 8 Lagen × 189 Zellen grün, Plugin-Abschnitte bei 90° + gespiegelt und 270° richtig.',
  },
  {
    caseId: 'KARTE-08', scope: 'teil',
    covers: 'Plugin-Weg: Paper 26.3 + BlueMap 5.29 und Paper 1.21.4 + Dynmap 3.7-beta-8 holen den Weltplan aus dem Team-Raum, die Sets „Bauplaner: …“ erscheinen ohne .conf und Konsolenbefehle, eine Änderung ersetzt die Marker per Push ohne Doppelte, nach dem Neustart sind sie sofort da. Notfallweg ohne Plugin: der BlueMap-Block in maps/world.conf und die Dynmap-Befehle in der Konsole bringen alle Sets an die richtige Stelle und Höhe; ein zweiter, kleinerer Export ersetzt die alten Marker. Dabei behoben: der BlueMap-Block ließ die ganze Karte scheitern (Formen ohne Komma), ein im Planer gelöschter letzter Punkt blieb auf Dynmap und BlueMap stehen.',
    remaining: 'Auf Philipps Server-Karte: Link aus BlueMap/Dynmap einfügen, „Aktuelle Karte speichern“; dort die Sets ansehen und eine Markerdatei (JSON) als Punkte laden.',
    command: 'scripts/mod/test_bridge_paper_world.sh && scripts/mod/test_bridge_paper_mapfallback.sh',
    evidence: '06.11.2026, Paper 26.3 Build 244 + BlueMap 5.29, Paper 1.21.4 Build 232 + Dynmap 3.7-beta-8, Plugin 0.23.0 aus dem Quellstand, Team-Raum per wrangler dev: beide Wege grün nach den Korrekturen in liveMapExport.ts.',
  },
  // ── Block 4: Mehrspieler und Server (echter Paper-Server, echte Spieler als Bots, echter 26.3-Client, Team-Raum)
  {
    caseId: 'TEAMBAU-06', scope: 'teil',
    covers: 'Server bekommt das Team über den Team-Raum ohne Datei; Mitspieler mit /bp abschnitte, nehmen, zeigen (Partikelumriss), fertig, notiz; Aktionsleiste „Abschnitt 2 · Rohbau · in Arbeit · Anna“; Hinweis bzw. Sperre im fremden Abschnitt; Baunachweis zählt nur in Teamabschnitten, „nachweis aus“ blendet aus; Teamkiste markiert, Einlegen mit gefüllter Shulkerkiste und Entnehmen gebucht; Planer-Faltung des Raums = Serverstand. Mit echtem 26.3-Client: /bauplaner team nehmen über den Teamkanal, Stand vom Server in der Mod.',
    remaining: '/bauplaner team mein und material mit eingeblendetem Teamplan im Hologramm; „Bestand ins Baustellen-Lager übernehmen“ (Strg+Z) im Planer; Stichprobe mit echten Mitspielern auf Philipps Server.',
    command: 'scripts/mod/test_multiplayer.sh && scripts/mod/test_multiplayer_client.sh',
    evidence: '06.11.2026, Plugin/Mod 0.23.0: Paper 1.21.11 (Build 132) und 26.1.2 (Build 74) mit drei Bot-Spielern, Paper 26.3 (Build 244) mit echtem Fabric-Client, Team-Raum wrangler dev.',
  },
  {
    caseId: 'LINK-12', scope: 'teil',
    covers: 'Paper-Server ohne Team-Raum; Bauleitung verbindet ihr Spiel („Mein Spiel verbinden“ über 127.0.0.1 mit Serverschlüssel), erlaubt den Teamkanal, die Mod übergibt den Raum: „Server-Plugin: Mit dem Team-Raum … verbunden“ ohne Herunterladen, Kopieren oder Eintippen; ein Spieler ohne OP kann den Raum nicht übergeben; Abschnittsschutz und Lagerkisten greifen danach; Neustart verbindet sich selbst wieder.',
    remaining: 'Zeile „Server-Plugin: ● im Team-Raum“ im Planer und Umbenennen/Verschieben eines Abschnitts im echten Planer (Browsertest team-room.e2e deckt die Planerseite gegen den Mod-Ersatz).',
    command: 'scripts/mod/test_multiplayer_client.sh && scripts/mod/test_multiplayer.sh',
    evidence: '06.11.2026, Mod/Plugin 0.23.0: echter Minecraft-26.3-Client (Fabric, weston) auf Paper 26.3 (Build 244); Bots auf Paper 1.21.11 und 26.1.2; Team-Raum wrangler dev.',
  },
  {
    caseId: 'LINK-01', scope: 'voll',
    covers: 'Plugin richtet sich selbst ein; Bauleitung als OP koppelt per Klick (link.claim), Nicht-OP abgewiesen; „Bauen in fremden Abschnitten: sperren“ als signierte Steuernachricht übernommen, config.yml geändert, das Setzen und Abbauen eines Mitspielers im fremden Abschnitt wird danach verhindert.',
    command: 'scripts/mod/test_multiplayer.sh && scripts/mod/test_bridge_paper_link.sh',
    evidence: '06.11.2026, Plugin 0.23.0: Paper 1.21.11 und 26.1.2 mit echten Spielern (Bots), Team-Raum wrangler dev; Planer-Oberfläche „Server koppeln“ per Browsertest server-link.e2e.',
  },
  {
    caseId: 'LINK-04', scope: 'teil',
    covers: 'Steuernachricht über den Team-Raum ohne Mod (der iPad-Weg, POST /control): Einstellung geändert, Wirkung auf echte Spieler im Spiel; Wiederholung und falscher Schlüssel abgewiesen.',
    remaining: 'Freigabe-Link auf einem echten iPad öffnen und das Gerät am PC entfernen (Browsertest server-link.e2e emuliert iPad 820 px).',
    command: 'scripts/mod/test_multiplayer.sh && BAUPLANER_ROOM=http://127.0.0.1:8787 scripts/mod/test_bridge_paper_link.sh',
    evidence: '06.11.2026, Plugin 0.23.0: Paper 1.21.11 und 26.1.2, Team-Raum wrangler dev.',
  },
  // Block 7 „Projekt, Produktion und Weltkarte vertiefen“ (06.11.2026)
  { caseId: 'PROJ-03', scope: 'teil', covers: 'Bauabschnitte anlegen, Schritte abhaken, Neuladen, Druckansicht (Druckmedium) und Handy-Baumodus in Chromium.', remaining: 'Echter Drucker und echtes Telefon (GERAET-06).',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/site.e2e.mjs tests/e2e/build-run.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-07', scope: 'voll', covers: 'Bauteil in der Werkstatt ändern, Updates-Reiter mit Vergleich, Übernehmen nur des Gezeigten, Rückgängig, Zurückkehren, Einfrieren, Neuladen, Telefonbreite.',
    command: 'npm run build && node --test tests/unit/core/updates.test.mjs && node --test tests/e2e/updates.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-09', scope: 'voll', covers: 'Vorschlag „Fundament · Rohbau · Dach“, Abhängigkeiten aus Geometrie, Kreis abgewiesen, Meilenstein mit Termin, Neuladen, Projektkarte; Großprojekt „Große Burganlage“: Meilensteine aus Abschnittsnamen je Phase, Straßen zuerst, kritischer Pfad durch alle Phasen.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/program.e2e.mjs tests/e2e/scenario-project.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-10', scope: 'teil', covers: 'Zwei Bauleute mit eigenem Tempo und gemeinsamem Abschnitt, 5 Bautage je Woche, Bauzettel, Abwesenheit mit Grund, „abwesend bis“ aus dem Team übernehmen, Team als Bauleute übernehmen mit Rückgängig, Konto je Bauleute.', remaining: 'Ein echter Mitspieler live im Team-Raum (zwei Geräte).',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/program.e2e.mjs tests/e2e/program-absence.e2e.mjs tests/e2e/team.e2e.mjs tests/e2e/builder-account.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-12', scope: 'voll', covers: 'Bruchsteingenerator läuft („mit Farm“), echte Ernte ins Baustellen-Lager, Rate „gemessen“, Restbedarf sinkt, Neuladen, Öfen je Zielzeit; dazu Ofenstraße aus dem Katalog als Bauabschnitt und in der Planung, Rückgängig, Telefonbreite.',
    command: 'npm run build && node --test tests/unit/materials/furnace-line.test.mjs && node --test --test-concurrency=1 tests/e2e/production.e2e.mjs tests/e2e/scenario-project.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-13', scope: 'voll', covers: 'Großprojekt mit Bauleuten und Start: wenig Sammelzeit gibt Engpass und gefährdeten Baubeginn, vorgeschlagene Farm „Als geplant anlegen“, „Auf Material warten“ schraffiert, „Die Planung wartet auf das Material“, laufende Farm ändert die Wartezeit, AFK-Platz nennt erreichte und verfehlte Farm mit Grund.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/scenario-project.e2e.mjs tests/e2e/program-depth.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-16', scope: 'voll', covers: 'Basisplan mit Namen (± 0), Anteil 25 % gibt Verzug und Basisplan-Linie, zweiter Basisplan und Vergleich, Start in der Vergangenheit läuft ab heute, Neuladen, Verwerfen.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/program-depth.e2e.mjs tests/e2e/program-absence.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-21', scope: 'voll', covers: '„Erst nach“ A, zu früher Start mit einem Klick korrigiert, Kreis abgewiesen, Pfeil auf der Weltkarte; A mit Bauplatz löschen: Rückfrage nennt Nachfolger und Bauplatz, danach wartet B auf nichts.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/project-order.e2e.mjs tests/e2e/scenario-project.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  // Block 6 (MODEL-01, ARCH-02)
  { caseId: 'PROJ-05', scope: 'teil',
    covers: 'OBJ, GLB, STL und 3MF werden erzeugt; Khronos glTF-Validator ohne Fehler und Warnungen; eigener STL/3MF-Prüfer und lib3mf: dicht, mannigfaltig, Verweise gültig; Blender 5.2 öffnet GLB mit Textur, OBJ+MTL und STL; PrusaSlicer 2.7 meldet „manifold“ und schneidet STL/3MF zu G-Code (auch Kolosseum 120 mm).',
    remaining: 'Echter Druck auf einem Drucker; Bambu Studio oder Cura; Export in Firefox/Safari am iPad.',
    command: 'node --test tests/unit/formats/model3d-files.test.mjs tests/unit/formats/model3d-external.test.mjs tests/e2e/model3d.e2e.mjs (BLENDER_PYTHON, PRUSA_SLICER)',
    evidence: '06.11.2026, Block 6, Chromium und Linux-Container: 6/6, 2/2, 2/2' },
  { caseId: 'GERAET-03', scope: 'teil',
    covers: 'Browserdaten, die echte alte Stände geschrieben haben (28.10. Datenbank v1, 02.11. v3, 04.11. v4: Katalog, eigenes Gebäude mit Versionen, Projekt mit Baustelle und Haken, Sammlung, Vorlage, Sicherung), öffnet die aktuelle App: alles ist noch da und unverändert, Datencheck ohne Fehler, altes Projekt öffnet, alte Sicherung lesbar.',
    remaining: 'Stichprobe mit deinen eigenen, lange gewachsenen Daten auf PC und iPad; „Dauerhaft speichern“ im echten Browser.',
    command: 'npm run build && node --test tests/e2e/aged-browserdata.e2e.mjs',
    evidence: '06.11.2026, Block 6, Chromium: 3/3' },
  // Block 5 Werkstatt und Weltkarte (EDIT-01/02/03/05/06, MAP-01, MAP-04) auf iPad/iPhone-Profilen und Firefox.
  {
    caseId: 'WERK-01', scope: 'teil',
    covers: 'Neues Bauteil: Blöcke setzen (Raster und 3D, auch per Finger), Quader und Treppenlinie, viele Schritte rückgängig/wiederholen, Tastenkürzel-Übersicht (?), Speichern als Bauteil und neue Version; iPad/iPhone ohne waagrechtes Scrollen.',
    remaining: 'Rückfrage beim Verlassen ohne Speichern („Abbrechen“ behält den Entwurf) und Drehen einzelner Blöcke nur von Hand; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/editor.e2e.mjs tests/e2e/workshop-tools.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'WERK-02', scope: 'teil',
    covers: 'Linie, Quader, Bogen, Ellipsoid, Torus, Wendel und Musterpinsel (Mischung, Verlauf) erzeugen die eingestellten Maße und Verteilungen; Schablone mit Vorschau.',
    remaining: 'Pyramide und Kegel nur im Einheitstest (editor-patterns.test.mjs), nicht im Browser gezogen; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/workshop-tools.e2e.mjs tests/e2e/workshop-region.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'WERK-03', scope: 'teil',
    covers: 'Zauberauswahl, Stapeln, Extrudieren, Auswahl verschieben/drehen, Symmetrie, Kurve, Naturwerkzeuge, Oberfläche, Farbverlauf und Bild → Blöcke wirken nur auf die Auswahl; am Handy ohne waagrechtes Scrollen.',
    remaining: 'Ob die Ergebnisse optisch „wie in der Vorschau“ aussehen und Bild → Blöcke passende Farben trifft, beurteilt ein Mensch; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/workshop-region.e2e.mjs tests/e2e/workshop-creative.e2e.mjs tests/e2e/editor.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'WERK-08', scope: 'teil',
    covers: 'Im 3D-Bild setzen und abbauen, Boden und senkrechte Wand mit dem Quader aufziehen, Gruppe per Shift-Ziehen wählen und verschieben, Rückgängig; auf iPad Pro 11 und iPhone 15 setzt ein Finger genau einen Block, zwei Finger zoomen ohne zu bauen.',
    remaining: 'Rechte Maustaste dreht (Maus) und echte Zwei-Finger-Geste auf dem iPad; Test nutzt Zeiger-Ereignisse vom Typ touch. Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/workshop-build3d.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'KARTE-01', scope: 'teil',
    covers: 'Projekt platzieren (auch per Finger auf iPad/iPhone), über die Weltlage verschieben, drehen und spiegeln; Lage und Weltkoordinaten bleiben nach dem Neuladen.',
    remaining: 'Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/worldmap.e2e.mjs tests/e2e/world-turn.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'KARTE-02', scope: 'teil',
    covers: 'Bauplatz, Weg und Punkt anlegen (Maus und Finger), duplizieren, drehen, Wegecken ziehen, Rahmen-Auswahl, Kontextmenü per Rechtsklick und per langem Drücken (iPad/iPhone), Löschen mit Entf/Menü/Liste, Strg+Z/Strg+Y; Objektliste stimmt mit der Karte.',
    remaining: 'Langdruck im Test als touch-Zeiger ausgelöst; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/worldbuilder.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'KARTE-05', scope: 'teil',
    covers: 'Ebenen und Gruppen zuweisen, ganze Gruppe/Einzeleintrag wählen, Sperren verhindert Verschieben und Löschen, Rückgängig nimmt Sperren und Zuweisen zurück, Neuladen behält alles; Sperren/Entsperren über das Langdruck-Menü am iPad.',
    remaining: 'Zone mit drei Ecken und Fläche in Blöcken² nur am Desktop geprüft; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/world-groups.e2e.mjs tests/e2e/worldbuilder.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
];

export function autoCheckOf(caseId: string): AutoCheck | undefined {
  return AUTO_CHECKS.find(a => a.caseId === caseId);
}
