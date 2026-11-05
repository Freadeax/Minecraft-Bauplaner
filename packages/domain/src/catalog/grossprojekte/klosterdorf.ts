import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

/** Klosterdorf: Klosteranlage über einem Bauerndorf mit Feldern, Mühle und Obstgärten. */
export const GP_KLOSTERDORF: Grossprojekt = {
  id: 'gp_klosterdorf', name: 'Klosterdorf im Tal', themeId: 'landleben', tags: ['kloster', 'dorf', 'land', 'felder', 'mühle', 'mittelalter'],
  description: 'Ein ruhiges Tal mit der Klosteranlage als Mittelpunkt: Kirche, Glockenturm und Kreuzgang mit Kräutergarten. Darunter ein Bauerndorf mit Brunnen, Schmiede und Taverne, ein Bauernhof als Ensemble, Felder, Wassermühle, Obstgärten und Bienenweide. Feldwege statt Pflaster.',
  streets: { style: 'dorf', width: 3, lamps: false }, spacing: 3,
  quartiere: [
    q('kloster', 'Kloster', [1, 0], 'Klosteranlage mit Kirche, Kreuzgang, Refektorium und Schlafsaal; daneben Friedhof und Kapelle.', [s('kloster', 'gross_kloster', 'Klosteranlage'), s('friedhof', 'friedhof', 'Friedhof')], { gap: 3, rowWidth: 60 }),
    q('garten', 'Klostergärten', [0, 0], 'Kräuterspirale, Hochbeete, Obstgarten und Gerätschuppen der Mönche.', [s('kraeuter', 'garten_kraeuterspirale', 'Kräuterspirale'), s('beete', 'garten_hochbeete', 'Hochbeete'), s('obst', 'obstgarten', 'Obstgarten'), s('schuppen', 'garten_geraeteschuppen', 'Geräteschuppen')], { kind: 'gruen', gap: 2, rowWidth: 40 }),
    q('dorf', 'Dorf', [1, 1], 'Brunnen, Bauernhäuser, Schmiede und Taverne an der Dorfstraße.', [s('brunnen', 'dorfbrunnen', 'Brunnen'), s('h1', 'bauernhaus', 'Bauernhaus'), s('h2', 'bauernhaus_schwarzeiche', 'Bauernhaus'), s('h3', 'fachwerkhaus', 'Fachwerkhaus'), s('schmiede', 'schmiede', 'Schmiede'), s('taverne', 'taverne', 'Taverne')], { gap: 2, rowWidth: 44 }),
    q('hof', 'Bauernhof', [0, 1], 'Der Bauernhof als Ensemble mit Stall, Scheune und Feldern.', [e('hof', 'bauernhof')]),
    q('muehle', 'Mühlbach', [2, 0], 'Wassermühle und Windmühle mahlen das Korn für Dorf und Kloster.', [s('wasser', 'meister_wassermuehle', 'Wassermühle'), s('wind', 'windmuehle', 'Windmühle')], { gap: 3, rowWidth: 48 }),
    q('felder', 'Felder', [2, 1], 'Weizen, Karotten, Kartoffeln und Rote Bete.', [s('a1', 'acker_weizen', 'Weizenfeld'), s('a2', 'acker_karotten', 'Karottenfeld'), s('a3', 'acker_kartoffeln', 'Kartoffelfeld'), s('a4', 'acker_rote_bete', 'Rote-Bete-Feld')], { gap: 2, rowWidth: 44 }),
  ],
  phasen: [
    ph('p1', 'Dorf & Felder', 'Erst das Dorf mit Brunnen und Feldern, damit Nahrung da ist.', ['dorf', 'felder', 'hof']),
    ph('p2', 'Mühlen', 'Wasser- und Windmühle am Bach.', ['muehle']),
    ph('p3', 'Kloster', 'Die Klosteranlage mit Gärten als Krönung des Tals.', ['kloster', 'garten']),
  ],
};
