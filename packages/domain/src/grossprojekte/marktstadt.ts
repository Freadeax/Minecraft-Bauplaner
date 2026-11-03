import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

/** Mittelalterliche Stadt um Markt und Dom, mit Burg, Gilden, Handwerk, Mühlen und Stadtgarten. */
export const GP_MARKTSTADT: Grossprojekt = {
  id: 'gp_marktstadt', name: 'Freie Marktstadt', themeId: 'mittelalter', tags: ['mittelalter', 'stadt', 'markt', 'dom', 'burg'],
  description: 'Eine ganze mittelalterliche Stadt: Burg und Dom als Wahrzeichen, Marktdorf in der Mitte, Gilden, Handwerkergasse und Wohngassen an gepflasterten Straßen, Mühlenviertel und Felder am Rand. Vier Bauphasen vom Markt bis zur Stadtmauer.',
  streets: { style: 'stein', width: 4, lamps: true }, spacing: 3,
  quartiere: [
    q('markt', 'Marktdorf', [1, 1], 'Herz der Stadt: Brunnenplatz, Rathaus, Taverne, Werkstätten und Marktbuden.', [e('markt', 'marktdorf')]),
    q('burg', 'Burg', [0, 0], 'Befestigter Sitz des Stadtherrn mit Torhaus, Bergfried und Kapelle.', [e('burg', 'burg')]),
    q('dom', 'Dombezirk', [2, 0], 'Kathedrale mit Glockenturm, Kreuzgang und Friedhof als Wahrzeichen über den Dächern.', [s('dom', 'kathedrale', 'Kathedrale'), s('glocke', 'epoche_glockenturm', 'Glockenturm'), s('kreuzgang', 'epoche_kreuzgang', 'Kreuzgang'), s('friedhof', 'friedhof', 'Friedhof')], { rowWidth: 56 }),
    q('gilden', 'Gildenviertel', [1, 0], 'Handel im großen Maßstab: Gildehaus, Markthalle, Handelshalle und Lager.', [s('gilde', 'meister_gildehaus', 'Gildehaus'), s('halle', 'meister_markthalle', 'Markthalle'), s('handel', 'handelshalle', 'Handelshalle'), s('lager', 'lagerhaus', 'Lagerhaus')], { rowWidth: 60 }),
    q('handwerk', 'Handwerkergasse', [0, 1], 'Sechs Werkstätten dicht an dicht, wie in einer echten Zunftgasse.', [s('w1', 'werkstatt_steinmetz', 'Steinmetz'), s('w2', 'werkstatt_werkzeugschmied', 'Werkzeugschmied'), s('w3', 'werkstatt_gerber', 'Gerber'), s('w4', 'werkstatt_metzger', 'Metzger'), s('w5', 'werkstatt_kartograf', 'Kartograf'), s('w6', 'werkstatt_pfeilmacher', 'Pfeilmacher')], { gap: 1, rowWidth: 32 }),
    q('wohnen', 'Wohngassen', [2, 1], 'Stadthäuser und Fachwerk für die Bürger, eine Taverne an der Ecke.', [s('h1', 'stadthaus', 'Stadthaus'), s('h2', 'stadthaus_tiefenschiefer', 'Stadthaus'), s('h3', 'fachwerkhaus', 'Fachwerkhaus'), s('h4', 'stadthaus', 'Stadthaus'), s('h5', 'fachwerkhaus', 'Fachwerkhaus'), s('taverne', 'taverne', 'Taverne')], { gap: 2, rowWidth: 44 }),
    q('tor', 'Stadttor & Kaserne', [0, 2], 'Südliches Tor mit Wachtürmen und Kaserne der Stadtwache.', [s('wach1', 'wachturm', 'Wachturm'), s('torhaus', 'torhaus', 'Torhaus'), s('wach2', 'wachturm', 'Wachturm'), s('kaserne', 'epoche_kaserne', 'Kaserne')], { gap: 1, rowWidth: 40 }),
    q('muehlen', 'Mühlenviertel', [1, 2], 'Wassermühle, Windmühle, Scheune und Felder versorgen die Stadt.', [s('wasser', 'meister_wassermuehle', 'Wassermühle'), s('wind', 'windmuehle', 'Windmühle'), s('scheune', 'scheune', 'Scheune'), s('acker1', 'acker_weizen', 'Weizenfeld'), s('acker2', 'acker_karotten', 'Karottenfeld')], { rowWidth: 60 }),
    q('garten', 'Stadtgarten', [2, 2], 'Grün zwischen Wohnen und Dom: Labyrinth, Springbrunnen, Pavillon und Rosenbogen.', [s('lab', 'garten_labyrinth', 'Labyrinth'), s('brunnen', 'springbrunnen', 'Springbrunnen'), s('pav', 'pavillon', 'Pavillon'), s('rosen', 'garten_rosenbogen', 'Rosenbogen')], { kind: 'gruen', rowWidth: 40 }),
    q('erweiterung', 'Erweiterungsfläche', [3, 1], 'Freigehaltener Bauplatz für ein weiteres Viertel (z. B. aus eigenen Sammlungen).', [], { kind: 'frei', reserve: [28, 28] }),
  ],
  phasen: [
    ph('p1', 'Markt & Straßen', 'Zuerst der Marktplatz als Bezugspunkt, dann Handwerk und Wohnen daran.', ['markt', 'handwerk', 'wohnen']),
    ph('p2', 'Burg & Dom', 'Die beiden Wahrzeichen prägen die Silhouette; Gilden folgen am Markt.', ['burg', 'dom', 'gilden']),
    ph('p3', 'Versorgung & Grün', 'Mühlen, Felder und der Stadtgarten.', ['muehlen', 'garten']),
    ph('p4', 'Mauer & Erweiterung', 'Tor und Kaserne schließen die Stadt; die Erweiterungsfläche bleibt frei.', ['tor', 'erweiterung']),
  ],
};
