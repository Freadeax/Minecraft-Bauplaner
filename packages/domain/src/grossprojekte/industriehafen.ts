import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

export const GP_INDUSTRIEHAFEN: Grossprojekt = {
  id: 'gp_industriehafen', name: 'Industriehafen', themeId: 'technik', tags: ['technik', 'industrie', 'redstone', 'hafen', 'bahn'],
  description: 'Industrieanlage am Wasser: Technikhof mit Schmelz- und Sortiermodulen, Güterbahnhof, Werft mit U-Boot und Kran, Lagerzeile mit Bunker, Farmzeile und Werkswohnungen. Asphaltstraßen; die Werft gehört an die Wasserkante im Süden.',
  streets: { style: 'asphalt', width: 5, lamps: true }, spacing: 3,
  quartiere: [
    q('technik', 'Technikhof', [1, 0], 'Schmelzmodule, Sortierer, Lampenreihe, Taktgeber, Wasseraufzug, Eisenfarm und Zuckerrohr.', [e('technik', 'technikhof')], { span: [2, 1] }),
    q('bahn', 'Güterbahnhof', [0, 0], 'Großer Bahnhof mit drei Gleisen und Dampflok.', [s('bhf', 'meister_bahnhof', 'Bahnhof'), s('g1', 'gleis_gerade', 'Gleis'), s('g2', 'gleis_gerade', 'Gleis'), s('g3', 'gleis_gerade', 'Gleis'), s('lok', 'fahrzeug_dampflok', 'Dampflok')], { gap: 1, rowWidth: 48 }),
    q('werft', 'Werft', [1, 2], 'Werft, U-Boot, Hafenkran und Bootshaus an der Wasserkante.', [s('werft', 'kueste_werft', 'Werft'), s('uboot', 'fahrzeug_uboot', 'U-Boot'), s('kran', 'hafenkran', 'Hafenkran'), s('boot', 'kueste_bootshaus', 'Bootshaus')], { span: [2, 1], gap: 2, rowWidth: 80 }),
    q('lager', 'Lagerzeile', [0, 1], 'Lagerhäuser, Lagerwand und Bunker.', [s('l1', 'lagerhaus', 'Lagerhaus'), s('l2', 'lagerhaus', 'Lagerhaus'), s('wand', 'technik_lagerwand', 'Lagerwand'), s('bunker', 'bunker', 'Bunker')], { gap: 2, rowWidth: 48 }),
    q('farmen', 'Farmzeile', [1, 1], 'Kürbis, Melonen, Hühner und Item-Aufzug in Reihe.', [s('k', 'kuerbis_modul', 'Kürbisfarm'), s('m', 'melonen_modul', 'Melonenfarm'), s('h', 'huehnerfarm', 'Hühnerfarm'), s('aufzug', 'technik_item_aufzug', 'Item-Aufzug'), s('klingel', 'technik_tuerklingel', 'Türklingel')], { gap: 1, rowWidth: 40 }),
    q('wohnen', 'Werkswohnungen', [2, 1], 'Würfelhäuser und ein Wohnblock für die Belegschaft.', [s('w1', 'wuerfelhaus', 'Würfelhaus'), s('w2', 'wuerfelhaus', 'Würfelhaus'), s('block', 'stadt_wohnblock', 'Wohnblock')], { gap: 2, rowWidth: 48 }),
    q('leucht', 'Leuchtfeuer & Tunnel', [0, 2], 'Leuchtfeuer und Tunnelportal als Landmarke der Anlage.', [s('feuer', 'leuchtfeuer', 'Leuchtfeuer'), s('tunnel', 'tunnelportal', 'Tunnelportal'), s('daemmer', 'technik_daemmerungslaterne', 'Dämmerungslaterne')], { rowWidth: 40 }),
  ],
  phasen: [
    ph('p1', 'Technikhof', 'Die Module zuerst: alles Weitere liefert und lagert für sie.', ['technik']),
    ph('p2', 'Bahn & Lager', 'Güterbahnhof und Lagerzeile.', ['bahn', 'lager']),
    ph('p3', 'Farmen & Wohnen', 'Farmzeile und Werkswohnungen.', ['farmen', 'wohnen']),
    ph('p4', 'Werft & Landmarke', 'Werft am Wasser, Leuchtfeuer und Tunnel.', ['werft', 'leucht']),
  ],
};
