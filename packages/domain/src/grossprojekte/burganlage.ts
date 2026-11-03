import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

export const GP_BURGANLAGE: Grossprojekt = {
  id: 'gp_burganlage', name: 'Große Burganlage', themeId: 'mittelalter', tags: ['burg', 'festung', 'mittelalter', 'vorburg'],
  description: 'Kernburg mit Zwinger und Zugbrückentor, Kaserne mit Waffenschmieden, Wirtschaftshof der Vorburg, Burgkapelle, Wachposten am Hang und Felder vor der Mauer. Kieswege verbinden die Höfe.',
  streets: { style: 'kies', width: 3, lamps: true }, spacing: 3,
  quartiere: [
    q('kern', 'Kernburg', [1, 0], 'Torhaus, Bergfried, Rundtürme, Kapelle, Schmiede und Brunnen.', [e('burg', 'burg')]),
    q('zwinger', 'Zwinger & Tor', [1, 1], 'Zugbrückentor und zwei Rundtürme sichern den Zugang zur Kernburg.', [s('t1', 'rundturm', 'Rundturm'), s('tor', 'epoche_zugbrueckentor', 'Zugbrückentor'), s('t2', 'rundturm', 'Rundturm')], { gap: 1, rowWidth: 56 }),
    q('kaserne', 'Kaserne', [0, 0], 'Kaserne, Schießstand und die Schmieden der Garnison.', [s('kaserne', 'epoche_kaserne', 'Kaserne'), s('schiess', 'schiessstand', 'Schießstand'), s('waffen', 'werkstatt_waffenschmied', 'Waffenschmied'), s('ruestung', 'werkstatt_ruestungsschmied', 'Rüstungsschmied')], { rowWidth: 48 }),
    q('hof', 'Wirtschaftshof', [2, 0], 'Scheune, Pferdestall, Lager und Schmiede der Vorburg.', [s('scheune', 'scheune', 'Scheune'), s('pferde', 'hof_pferdestall', 'Pferdestall'), s('lager', 'lagerhaus', 'Lagerhaus'), s('schmiede', 'schmiede', 'Schmiede')], { rowWidth: 48 }),
    q('kapelle', 'Burgkapelle', [0, 1], 'Kapelle und Friedhof der Burgleute.', [s('kap', 'kapelle', 'Kapelle'), s('friedhof', 'friedhof', 'Friedhof')], { rowWidth: 40 }),
    q('wache', 'Wachposten', [2, 1], 'Wachturm, Turmruine und Außenposten überblicken das Land.', [s('wach', 'wachturm', 'Wachturm'), s('ruine', 'epoche_turmruine', 'Turmruine'), s('posten', 'aussenposten', 'Außenposten')], { rowWidth: 48 }),
    q('felder', 'Felder vor der Mauer', [0, 2], 'Drei Äcker und eine Windmühle ernähren die Burg.', [s('a1', 'acker_weizen', 'Weizenfeld'), s('a2', 'acker_kartoffeln', 'Kartoffelfeld'), s('a3', 'acker_rote_bete', 'Rote-Bete-Feld'), s('muehle', 'windmuehle', 'Windmühle')], { span: [3, 1], gap: 2, rowWidth: 80 }),
  ],
  phasen: [
    ph('p1', 'Kernburg', 'Der befestigte Kern zuerst.', ['kern']),
    ph('p2', 'Zwinger & Garnison', 'Tor, Türme und Kaserne.', ['zwinger', 'kaserne']),
    ph('p3', 'Vorburg', 'Wirtschaftshof, Kapelle und Wachposten.', ['hof', 'kapelle', 'wache']),
    ph('p4', 'Felder', 'Versorgung vor der Mauer.', ['felder']),
  ],
};
