import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

/**
 * Kolosseum-Viertel: Philipps Kolosseum-Bauplan (81 × 61, vier Etagen,
 * Hypogäum) als Mitte eines römischen Stadtviertels. Die Lage folgt grob dem
 * Vorbild: Gladiatorenschule im Osten, Thermen im Nordosten, Forum und Markt
 * im Norden, Theater und Wohnvillen im Westen und Süden, Wasser über das
 * Aquädukt.
 */
export const GP_KOLOSSEUM: Grossprojekt = {
  id: 'gp_kolosseum', name: 'Kolosseum-Viertel', tags: ['antike', 'rom', 'kolosseum', 'arena', 'forum', 'thermen'],
  description: 'Römisches Stadtviertel um das Kolosseum aus Philipps Bauplan (81 × 61 Blöcke, vier Etagen aus Rundbögen, Arena 41 × 21, Hypogäum): Vorplatz mit Ehrenbogen und Ehrensäulen, Gladiatorenschule mit Kaserne, Forum mit Tempel und Obelisk, Ladenzeile, Thermen mit Garten, Theater, Wohnvillen, Gärten und Aquädukt. Gepflasterte Straßen in der Breite der Kolosseumstore.',
  streets: { style: 'stein', width: 5, lamps: true }, spacing: 3,
  quartiere: [
    q('arena', 'Kolosseum', [1, 1], 'Das Amphitheater mit Vorplatz, Ehrenbogen und zwei Ehrensäulen; die vier Tore öffnen sich zu den Straßen.', [e('platz', 'kolosseumsplatz')]),
    q('ludus', 'Gladiatorenschule', [2, 1], 'Ludus mit Übungsplatz und Zellen, daneben die Kaserne der Wache; kurzer Weg zum Osttor der Arena.', [s('ludus', 'antike_ludus', 'Gladiatorenschule'), s('kaserne', 'epoche_kaserne', 'Kaserne')], { gap: 3, rowWidth: 40 }),
    q('forum', 'Forum', [0, 0], 'Tempel, Obelisk und Springbrunnen auf dem Versammlungsplatz.', [s('tempel', 'antiker_tempel', 'Tempel'), s('obelisk', 'obelisk', 'Obelisk'), s('brunnen', 'springbrunnen', 'Springbrunnen')], { kind: 'platz', gap: 3, rowWidth: 44 }),
    q('markt', 'Ladenzeile', [1, 0], 'Zwei Tabernae-Zeilen mit Garküche, Bäckerei, Töpferei und Tuchhandel, dazu Marktbuden.', [s('t1', 'antike_tabernae', 'Tabernae'), s('t2', 'antike_tabernae', 'Tabernae'), s('b1', 'marktbude_red', 'Marktbude'), s('b2', 'marktbude_yellow', 'Marktbude')], { gap: 2, rowWidth: 48 }),
    q('thermen', 'Thermen', [2, 0], 'Bad mit Heiß-, Warm- und Kaltbad, davor ein Formschnittgarten.', [s('thermen', 'antike_thermen', 'Thermen'), s('garten', 'garten_formschnitt', 'Formschnittgarten')], { gap: 3, rowWidth: 44 }),
    q('theater', 'Theater', [0, 1], 'Römisches Theater mit Gartenpavillon und Bänken.', [s('theater', 'epoche_amphitheater', 'Römisches Theater'), s('pavillon', 'pavillon', 'Gartenpavillon'), s('bank1', 'sitzbank', 'Parkbank'), s('bank2', 'sitzbank', 'Parkbank')], { gap: 3, rowWidth: 40 }),
    q('villen', 'Wohnvillen', [0, 2], 'Drei Atriumhäuser für die Bürger des Viertels.', [s('v1', 'epoche_roemische_villa', 'Römische Villa'), s('v2', 'epoche_roemische_villa', 'Römische Villa'), s('v3', 'epoche_roemische_villa', 'Römische Villa')], { gap: 3, rowWidth: 60 }),
    q('gaerten', 'Gärten', [1, 2], 'Öffentliche Gärten mit Springbrunnen, Pergola, Kräuterspirale und Gemüsebeeten.', [s('brunnen2', 'springbrunnen', 'Springbrunnen'), s('pergola', 'garten_pergola', 'Pergola'), s('kraeuter', 'garten_kraeuterspirale', 'Kräuterspirale'), s('beete', 'garten_hochbeete', 'Gemüsegarten')], { kind: 'gruen', gap: 3, rowWidth: 48 }),
    q('wasser', 'Aquädukt', [2, 2], 'Drei Aquäduktbögen bringen Wasser ins Viertel, am Ende ein Brunnen.', [s('aq1', 'aquaedukt', 'Aquädukt'), s('aq2', 'aquaedukt', 'Aquädukt'), s('aq3', 'aquaedukt', 'Aquädukt'), s('brunnen3', 'dorfbrunnen', 'Brunnen')], { gap: 0, rowWidth: 48 }),
  ],
  phasen: [
    ph('p1', 'Kolosseum', 'Nach Philipps Bauplan: Hypogäum ausheben, ovales Fundament, Arena und Podium, Sitzreihen, dann Etage für Etage die Bogenfassade; zuletzt Velarium, Banner und Laternen. Ehrenbogen und Säulen auf dem Vorplatz.', ['arena']),
    ph('p2', 'Gladiatoren & Wasser', 'Gladiatorenschule und Kaserne am Osttor, das Aquädukt für die Wasserversorgung.', ['ludus', 'wasser']),
    ph('p3', 'Forum & Markt', 'Forum mit Tempel und die Ladenzeile nördlich der Arena.', ['forum', 'markt']),
    ph('p4', 'Thermen, Theater & Wohnen', 'Thermen, Theater, Wohnvillen und Gärten machen das Viertel lebendig.', ['thermen', 'theater', 'villen', 'gaerten']),
  ],
};
