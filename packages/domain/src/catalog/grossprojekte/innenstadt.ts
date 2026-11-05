import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

export const GP_INNENSTADT: Grossprojekt = {
  id: 'gp_innenstadt', name: 'Moderne Innenstadt', themeId: 'moderne', tags: ['modern', 'stadt', 'hochhaus', 'bahnhof', 'park'],
  description: 'Innenstadt mit Ringstraße: Stadtviertel-Zentrum, Hochhausviertel, öffentliche Gebäude, Einkaufsstraße, Bahnhofsviertel, Stadtpark und Villenviertel. Asphaltstraßen mit Gehwegen und Laternen.',
  streets: { style: 'asphalt', width: 6, lamps: true, ring: true }, spacing: 3,
  quartiere: [
    q('zentrum', 'Zentrum', [1, 1], 'Reihenhauszeile, Café, Bäckerei, Stadtplatz, Hochhaus und Ärztehaus.', [e('zentrum', 'stadtviertel')], { span: [2, 1] }),
    q('hochhaus', 'Hochhausviertel', [0, 0], 'Drei Hochhäuser und zwei Wohnblocks für viele Bewohner.', [s('hh1', 'stadt_hochhaus', 'Hochhaus'), s('hh2', 'stadt_hochhaus', 'Hochhaus'), s('hh3', 'stadt_hochhaus', 'Hochhaus'), s('wb1', 'stadt_wohnblock', 'Wohnblock'), s('wb2', 'stadt_wohnblock', 'Wohnblock')], { gap: 3, rowWidth: 48 }),
    q('amt', 'Öffentliche Gebäude', [1, 0], 'Schule, Bibliothek, Feuerwache, Polizei und Ärztehaus.', [s('schule', 'stadt_schule', 'Schule'), s('bib', 'stadt_bibliothek', 'Bibliothek'), s('feuer', 'stadt_feuerwache', 'Feuerwache'), s('polizei', 'stadt_polizeiwache', 'Polizeiwache')], { rowWidth: 56 }),
    q('einkauf', 'Einkaufsstraße', [2, 0], 'Supermarkt, Kiosk, Parkplatz und Bushaltestelle.', [s('markt', 'stadt_supermarkt', 'Supermarkt'), s('kiosk', 'stadt_kiosk', 'Kiosk'), s('park', 'stadt_parkplatz', 'Parkplatz'), s('bus', 'stadt_bushaltestelle', 'Bushaltestelle')], { gap: 2, rowWidth: 48 }),
    q('bahnhof', 'Bahnhofsviertel', [0, 1], 'Großer Bahnhof mit Gleisen, Dampflok und Personenwagen.', [s('bhf', 'meister_bahnhof', 'Bahnhof'), s('g1', 'gleis_gerade', 'Gleis'), s('g2', 'gleis_gerade', 'Gleis'), s('lok', 'fahrzeug_dampflok', 'Dampflok'), s('wagen', 'fahrzeug_personenwagen', 'Personenwagen')], { gap: 1, rowWidth: 44 }),
    q('park', 'Stadtpark', [0, 2], 'Spielplatz, Seerosenteich, Bäume und Bänke.', [s('spiel', 'garten_spielplatz', 'Spielplatz'), s('teich', 'garten_seerosenteich', 'Seerosenteich'), s('b1', 'baum_oak', 'Eiche'), s('b2', 'baum_birch', 'Birke'), s('bank1', 'sitzbank', 'Bank'), s('bank2', 'sitzbank', 'Bank')], { kind: 'gruen', gap: 2, rowWidth: 48 }),
    q('villen', 'Villenviertel', [1, 2], 'Villen und Würfelhäuser mit Garten.', [s('v1', 'villa', 'Villa'), s('v2', 'meister_stadtvilla', 'Stadtvilla'), s('v3', 'wuerfelhaus', 'Würfelhaus'), s('v4', 'villa', 'Villa'), s('v5', 'wuerfelhaus', 'Würfelhaus')], { gap: 3, rowWidth: 60 }),
    q('kultur', 'Kulturplatz', [2, 2], 'Platz mit Uhrturm, Triumphbogen und Lampenpult-Bühne.', [s('platz', 'stadt_platz', 'Stadtplatz'), s('uhr', 'uhrturm_tiefenschiefer', 'Uhrturm'), s('bogen', 'triumphbogen', 'Triumphbogen'), s('pult', 'technik_lampenpult', 'Lichtpult')], { kind: 'platz', gap: 2, rowWidth: 48 }),
  ],
  phasen: [
    ph('p1', 'Ring & Zentrum', 'Ringstraße und Zentrum legen Maßstab und Abstände fest.', ['zentrum']),
    ph('p2', 'Wohnen', 'Hochhausviertel und Villen.', ['hochhaus', 'villen']),
    ph('p3', 'Öffentlich & Einkauf', 'Schule, Wachen, Supermarkt und Haltestelle.', ['amt', 'einkauf']),
    ph('p4', 'Bahnhof, Park & Kultur', 'Bahnhofsviertel, Stadtpark und Kulturplatz.', ['bahnhof', 'park', 'kultur']),
  ],
};
