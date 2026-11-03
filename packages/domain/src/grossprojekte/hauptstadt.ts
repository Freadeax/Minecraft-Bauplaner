import { a, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

/** Größte Stufe: ganze Anlagen als Stadtteile. */
export const GP_HAUPTSTADT: Grossprojekt = {
  id: 'gp_hauptstadt', name: 'Hauptstadt mit Altstadt und Hafen', themeId: 'mittelalter', tags: ['stadt', 'hauptstadt', 'altstadt', 'hafen', 'mittelalter', 'küste'],
  description: 'Die größte Stufe der Bibliothek: Zwei ganze Bauwelt-Anlagen – „Marktstadt mit Burg“ als Altstadt und „Hafenstadt an der Küste“ als Hafenviertel – werden mit Dombezirk, Gildenviertel, Kasernen und Feldern zu einer Hauptstadt mit über 60 Gebäuden verbunden. Jede Anlage behält ihren eigenen Hauptweg; die Stadtstraßen verbinden die Viertel.',
  streets: { style: 'stein', width: 5, lamps: true }, spacing: 3,
  quartiere: [
    q('altstadt', 'Altstadt', [0, 0], 'Marktdorf, Burghof, Stadthäuser und Kirchbezirk an der Hauptgasse.', [a('alt', 'mittelalter')], { span: [2, 1] }),
    q('hafen', 'Hafenviertel', [0, 2], 'Küstendorf, Hafenbetrieb, Fischmarkt und Wohnen am Wasser an der Promenade.', [a('hafen', 'kueste')], { span: [2, 1] }),
    q('dom', 'Dombezirk', [0, 1], 'Kathedrale, Kreuzgang und Glockenturm zwischen Altstadt und Hafen.', [s('dom', 'kathedrale', 'Kathedrale'), s('kreuzgang', 'epoche_kreuzgang', 'Kreuzgang'), s('glocke', 'epoche_glockenturm', 'Glockenturm')], { rowWidth: 60 }),
    q('gilden', 'Gildenviertel', [1, 1], 'Gildehaus, Markthalle, Handelshalle und Lager.', [s('gilde', 'meister_gildehaus', 'Gildehaus'), s('halle', 'meister_markthalle', 'Markthalle'), s('handel', 'handelshalle', 'Handelshalle'), s('lager', 'lagerhaus', 'Lagerhaus')], { rowWidth: 60 }),
    q('kaserne', 'Kasernen', [2, 0], 'Kaserne, Zugbrückentor und Wachtürme der Stadtwache.', [s('kaserne', 'epoche_kaserne', 'Kaserne'), s('tor', 'epoche_zugbrueckentor', 'Zugbrückentor'), s('w1', 'wachturm', 'Wachturm'), s('w2', 'wachturm', 'Wachturm')], { gap: 2, rowWidth: 48 }),
    q('villen', 'Stadtvillen', [2, 1], 'Stadtvilla, Villa und Taverne für die Kaufleute.', [s('v1', 'meister_stadtvilla', 'Stadtvilla'), s('v2', 'stadthaus_tiefenschiefer', 'Stadthaus'), s('taverne', 'taverne_savanne', 'Taverne')], { gap: 2, rowWidth: 48 }),
    q('felder', 'Felder & Mühle', [2, 2], 'Äcker und Wassermühle am Fluss.', [s('a1', 'acker_weizen', 'Weizenfeld'), s('a2', 'acker_karotten', 'Karottenfeld'), s('muehle', 'meister_wassermuehle', 'Wassermühle')], { gap: 2, rowWidth: 48 }),
  ],
  phasen: [
    ph('p1', 'Altstadt', 'Die Altstadt-Anlage mit ihrer Hauptgasse zuerst.', ['altstadt']),
    ph('p2', 'Dom & Gilden', 'Dombezirk und Gildenviertel verbinden Altstadt und Hafen.', ['dom', 'gilden']),
    ph('p3', 'Hafen', 'Das Hafenviertel an der Küste.', ['hafen']),
    ph('p4', 'Wache, Villen & Felder', 'Kasernen, Stadtvillen und Felder am Rand.', ['kaserne', 'villen', 'felder']),
  ],
};
