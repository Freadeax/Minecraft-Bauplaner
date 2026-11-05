import { ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

/** Residenzstadt: Schloss mit großem Park, Universität, Kloster und Bürgerstadt hinter einem Stadttor. */
export const GP_RESIDENZSTADT: Grossprojekt = {
  id: 'gp_residenzstadt', name: 'Residenzstadt mit Schlosspark', themeId: 'mittelalter', tags: ['residenz', 'schloss', 'park', 'universität', 'kloster', 'stadt'],
  description: 'Eine Fürstenresidenz als Stadt: das Schloss mit Innenhof liegt am Kopf eines großen Parks mit Labyrinth, Formschnitt, Seerosenteich und Rosenbögen. Davor die Bürgerstadt mit Großem Marktplatz, Gildehaus und Stadthäusern, im Osten Universität und Klosteranlage, im Süden das Stadttor mit Wachtürmen.',
  streets: { style: 'stein', width: 5, lamps: true }, spacing: 3,
  quartiere: [
    q('schloss', 'Schloss', [1, 0], 'Schloss mit Innenhof, Kupferkuppeln und Thronsaal als Sitz des Fürsten.', [s('schloss', 'gross_schloss', 'Schloss')]),
    q('park', 'Schlosspark', [0, 0], 'Labyrinth, Formschnittgarten, Seerosenteich, Rosenbogen, Pergola und Springbrunnen.', [s('labyrinth', 'garten_labyrinth', 'Labyrinth'), s('formschnitt', 'garten_formschnitt', 'Formschnittgarten'), s('teich', 'garten_seerosenteich', 'Seerosenteich'), s('rosen', 'garten_rosenbogen', 'Rosenbogen'), s('pergola', 'garten_pergola', 'Pergola'), s('brunnen', 'springbrunnen', 'Springbrunnen'), s('pavillon', 'pavillon', 'Pavillon')], { kind: 'gruen', gap: 2, rowWidth: 44 }),
    q('markt', 'Großer Markt', [1, 1], 'Großer Marktplatz mit Brunnen und Ständen, daneben das Gildehaus.', [s('markt', 'gross_marktplatz', 'Marktplatz'), s('gilde', 'meister_gildehaus', 'Gildehaus')], { kind: 'platz', gap: 3, rowWidth: 60 }),
    q('buerger', 'Bürgerstadt', [0, 1], 'Stadtvilla, Stadthäuser, Taverne und Werkstätten der Bürger.', [s('villa', 'meister_stadtvilla', 'Stadtvilla'), s('h1', 'stadthaus', 'Stadthaus'), s('h2', 'stadthaus_tiefenschiefer', 'Stadthaus'), s('h3', 'fachwerkhaus', 'Fachwerkhaus'), s('taverne', 'taverne', 'Taverne'), s('kartograf', 'werkstatt_kartograf', 'Kartograf'), s('steinmetz', 'werkstatt_steinmetz', 'Steinmetz')], { gap: 2, rowWidth: 48 }),
    q('uni', 'Universität', [2, 0], 'Universität mit Sternwarte, Hörsaal, Bibliothek und Labor.', [s('uni', 'gross_universitaet', 'Universität')]),
    q('kloster', 'Kloster', [2, 1], 'Klosteranlage mit Kirche, Glockenturm und Kreuzgang; davor der Friedhof.', [s('kloster', 'gross_kloster', 'Klosteranlage'), s('friedhof', 'friedhof', 'Friedhof')], { gap: 3, rowWidth: 60 }),
    q('tor', 'Stadttor', [1, 2], 'Stadttor mit Rundtürmen und Wehrgang, flankiert von Wachtürmen und der Kaserne.', [s('w1', 'wachturm', 'Wachturm'), s('tor', 'gross_stadttor', 'Stadttor'), s('w2', 'wachturm', 'Wachturm'), s('kaserne', 'epoche_kaserne', 'Kaserne')], { gap: 2, rowWidth: 72 }),
    q('erweiterung', 'Bauland', [0, 2], 'Freie Fläche für eigene Häuser oder ein weiteres Viertel.', [], { kind: 'frei', reserve: [32, 32] }),
    q('felder', 'Felder', [2, 2], 'Äcker und Windmühle vor der Stadt.', [s('a1', 'acker_weizen', 'Weizenfeld'), s('a2', 'acker_kartoffeln', 'Kartoffelfeld'), s('muehle', 'windmuehle', 'Windmühle')], { gap: 2, rowWidth: 48 }),
  ],
  phasen: [
    ph('p1', 'Schloss & Park', 'Zuerst die Residenz: Schloss, danach der Park Stück für Stück.', ['schloss', 'park']),
    ph('p2', 'Markt & Bürgerstadt', 'Großer Markt und die Häuser der Bürger.', ['markt', 'buerger']),
    ph('p3', 'Universität & Kloster', 'Die beiden Großbauten im Osten.', ['uni', 'kloster']),
    ph('p4', 'Tor, Felder & Bauland', 'Stadttor mit Wache, Felder vor der Stadt, freies Bauland für später.', ['tor', 'felder', 'erweiterung']),
  ],
};
