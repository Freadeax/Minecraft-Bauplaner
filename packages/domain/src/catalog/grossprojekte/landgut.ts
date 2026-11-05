import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

export const GP_LANDGUT: Grossprojekt = {
  id: 'gp_landgut', name: 'Großes Landgut', themeId: 'landleben', tags: ['landleben', 'bauernhof', 'felder', 'mühle', 'dorf'],
  description: 'Ein ganzes Landgut: Bauernhof und Großer Tierhof, Dorfkern mit Brunnen und Taverne, weite Felder mit Hochbeeten und Obstgarten, Mühlenhof mit Wassermühle und Handelsscheune. Erdwege, Platz für ein weiteres Gehöft bleibt frei.',
  streets: { style: 'dorf', width: 3, lamps: true }, spacing: 3,
  quartiere: [
    q('hof', 'Bauernhof', [0, 0], 'Bauernhaus, Scheune, Weide, Bienenhaus, Äcker und Windmühle.', [e('hof', 'bauernhof')], { span: [2, 1] }),
    q('tierhof', 'Großer Tierhof', [0, 2], 'Kuh-, Pferde- und Schweinestall, Schafweide, Kaninchen, Imkerei, Fischteich und Beeren.', [e('tiere', 'grosshof')], { span: [2, 1] }),
    q('dorf', 'Dorfkern', [0, 1], 'Bauernhäuser, Rundhütte, Brunnen, Taverne und Lager.', [s('b1', 'bauernhaus', 'Bauernhaus'), s('b2', 'bauernhaus_schwarzeiche', 'Bauernhaus'), s('rund', 'rundhuette', 'Rundhütte'), s('brunnen', 'dorfbrunnen', 'Brunnen'), s('taverne', 'taverne_sumpf', 'Taverne'), s('lager', 'lagerhaus', 'Lagerhaus')], { gap: 2, rowWidth: 52 }),
    q('felder', 'Felder', [1, 1], 'Vier Äcker, Hochbeete, Obstgarten und Baumfarm.', [s('a1', 'acker_weizen', 'Weizenfeld'), s('a2', 'acker_karotten', 'Karottenfeld'), s('a3', 'acker_kartoffeln', 'Kartoffelfeld'), s('a4', 'acker_rote_bete', 'Rote-Bete-Feld'), s('beete', 'garten_hochbeete', 'Hochbeete'), s('obst', 'obstgarten', 'Obstgarten'), s('baum', 'baumfarm', 'Baumfarm')], { gap: 2, rowWidth: 52 }),
    q('muehle', 'Mühlenhof', [2, 0], 'Wassermühle, Handelsscheune und Kutsche.', [s('wasser', 'meister_wassermuehle', 'Wassermühle'), s('scheune', 'hof_handelsscheune', 'Handelsscheune'), s('kutsche', 'fahrzeug_kutsche', 'Kutsche')], { rowWidth: 48 }),
    q('zucht', 'Zucht & Pilze', [2, 1], 'Zuchthaus, Pilzfarm und Kräuterspirale.', [s('zucht', 'hof_zuchthaus', 'Zuchthaus'), s('pilz', 'pilzfarm', 'Pilzfarm'), s('kraut', 'garten_kraeuterspirale', 'Kräuterspirale')], { rowWidth: 44 }),
    q('neu', 'Zweites Gehöft', [2, 2], 'Freigehaltener Bauplatz für ein weiteres Gehöft.', [], { kind: 'frei', reserve: [32, 24] }),
  ],
  phasen: [
    ph('p1', 'Hof & Dorf', 'Bauernhof zuerst, dann der Dorfkern.', ['hof', 'dorf']),
    ph('p2', 'Felder', 'Äcker, Hochbeete und Obstgarten.', ['felder']),
    ph('p3', 'Tiere & Mühle', 'Großer Tierhof, Mühlenhof, Zucht und Pilze.', ['tierhof', 'muehle', 'zucht']),
    ph('p4', 'Erweiterung', 'Das zweite Gehöft bleibt frei.', ['neu']),
  ],
};
