import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

export const GP_HAFENSTADT: Grossprojekt = {
  id: 'gp_hafenstadt', name: 'Große Hafenstadt', themeId: 'kueste', tags: ['küste', 'hafen', 'stadt', 'speicherstadt'],
  description: 'Hafenstadt mit Küstendorf, Promenade, Speicherstadt, Fischerviertel, Fischmarkt und Leuchtturmspitze. Die Wasserlinie liegt an der Südkante: Seebrücke, Stege und Werft gehören in die unterste Reihe; die Wassertiefe prüfst du im Gelände.',
  streets: { style: 'stein', width: 4, lamps: true }, spacing: 3,
  quartiere: [
    q('dorf', 'Küstendorf', [0, 2], 'Erster Anlaufpunkt: Leuchtturm, Fischerhütte, Steg und Schiff.', [e('dorf', 'kuestendorf')]),
    q('promenade', 'Promenade', [1, 2], 'Bootshaus, Fischmarkt, Speicher, Werft, Strandbar und Seebrücke am Wasser.', [e('prom', 'hafenpromenade')], { span: [2, 1] }),
    q('speicher', 'Speicherstadt', [1, 1], 'Lager und Verarbeitung hinter den Kais.', [s('sp1', 'kueste_hafenspeicher', 'Hafenspeicher'), s('sp2', 'kueste_hafenspeicher', 'Hafenspeicher'), s('lager', 'lagerhaus', 'Lagerhaus'), s('kran', 'hafenkran', 'Hafenkran')], { gap: 2, rowWidth: 56 }),
    q('fischer', 'Fischerviertel', [0, 1], 'Kleine Häuser der Fischerfamilien in zweiter Reihe.', [s('f1', 'fischerhuette', 'Fischerhütte'), s('f2', 'strandhaus', 'Strandhaus'), s('f3', 'fischerhuette', 'Fischerhütte'), s('f4', 'meister_fischerkate', 'Fischerkate'), s('f5', 'strandhaus', 'Strandhaus')], { gap: 2, rowWidth: 48 }),
    q('markt', 'Marktplatz', [2, 1], 'Fischmarkt, Buden und Brunnen – der Treffpunkt der Stadt.', [s('fm', 'kueste_fischmarkt', 'Fischmarkt'), s('b1', 'marktbude_blue', 'Marktbude'), s('b2', 'marktbude_green', 'Marktbude'), s('b3', 'marktbude_red', 'Marktbude'), s('brunnen', 'dorfbrunnen', 'Brunnen')], { kind: 'platz', gap: 2, rowWidth: 44 }),
    q('wohnen', 'Wohnen am Hügel', [0, 0], 'Wohnhäuser mit Blick über den Hafen.', [s('h1', 'strandhaus', 'Strandhaus'), s('h2', 'villa', 'Villa'), s('h3', 'stadthaus', 'Stadthaus'), s('h4', 'strandhaus', 'Strandhaus')], { gap: 2, rowWidth: 48 }),
    q('rettung', 'Rettungsstation & Garten', [1, 0], 'Rettungsturm, Pergola und Seerosenteich über der Speicherstadt.', [s('turm', 'kueste_rettungsturm', 'Rettungsturm'), s('pergola', 'garten_pergola', 'Pergola'), s('teich', 'garten_seerosenteich', 'Seerosenteich'), s('palme', 'baum_palme', 'Palme')], { kind: 'gruen', rowWidth: 48 }),
    q('kapelle', 'Seemannskapelle', [2, 0], 'Kapelle und Uhrturm als Landmarke von der See.', [s('kap', 'kapelle', 'Kapelle'), s('uhr', 'uhrturm', 'Uhrturm'), s('friedhof', 'friedhof', 'Friedhof')], { rowWidth: 40 }),
  ],
  phasen: [
    ph('p1', 'Hafen', 'Vom Wasser aus: Küstendorf und Promenade zuerst.', ['dorf', 'promenade']),
    ph('p2', 'Speicher & Markt', 'Lager, Kran und der Marktplatz dahinter.', ['speicher', 'markt']),
    ph('p3', 'Wohnen', 'Fischerviertel und Wohnen am Hügel.', ['fischer', 'wohnen']),
    ph('p4', 'Landmarken', 'Rettungsstation, Garten und Seemannskapelle.', ['rettung', 'kapelle']),
  ],
};
