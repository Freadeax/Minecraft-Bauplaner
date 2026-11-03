import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

export const GP_MAGIERSTADT: Grossprojekt = {
  id: 'gp_magierstadt', name: 'Stadt der Magier', themeId: 'fantasy', tags: ['fantasy', 'magie', 'türme', 'pilzdorf'],
  description: 'Fantasy-Stadt um die Magierakademie: Turmviertel mit Zauberer-, Alchemisten- und Kristallturm, Pilzdorf, Wahrzeichen-Allee mit Märchenturm und Drachenstatue, Naturkulisse mit Wasserfall und schwebender Insel, Markt der Tränke.',
  streets: { style: 'stein', width: 4, lamps: true }, spacing: 4,
  quartiere: [
    q('akademie', 'Zauberwald & Akademie', [1, 1], 'Magierakademie, Kristallturm, Elfen-Baumhaus, Hexenhütte, Feenring und Portalruine.', [e('wald', 'zauberwald')], { span: [2, 1] }),
    q('tuerme', 'Turmviertel', [0, 0], 'Zaubererturm, Alchemistenturm und Spiralturm.', [s('zt', 'zaubererturm', 'Zaubererturm'), s('at', 'meister_alchemistenturm', 'Alchemistenturm'), s('st', 'spiralturm', 'Spiralturm')], { gap: 3, rowWidth: 52 }),
    q('pilzdorf', 'Pilzdorf', [0, 1], 'Pilzhäuser, Erdhaus und großes Baumhaus zwischen Riesenpilzen.', [s('p1', 'pilzhaus', 'Pilzhaus'), s('p2', 'erdhaus', 'Erdhaus'), s('p3', 'baumhaus_gross', 'Baumhaus'), s('p4', 'pilzhaus', 'Pilzhaus'), s('r1', 'riesenpilz_rot', 'Riesenpilz'), s('r2', 'riesenpilz_braun', 'Riesenpilz')], { gap: 2, rowWidth: 44 }),
    q('allee', 'Wahrzeichen-Allee', [1, 0], 'Märchenturm, Drachenstatue, Schwert im Stein und Steinkreis.', [s('turm', 'fantasy_maerchenturm', 'Märchenturm'), s('drache', 'fantasy_drachenstatue', 'Drachenstatue'), s('schwert', 'schwert_im_stein', 'Schwert im Stein'), s('kreis', 'steinkreis', 'Steinkreis')], { kind: 'platz', rowWidth: 60 }),
    q('natur', 'Naturkulisse', [2, 0], 'Wasserfall, Trauerweide, schwebende Insel und Felsbogen.', [s('fall', 'natur_wasserfall', 'Wasserfall'), s('weide', 'natur_trauerweide', 'Trauerweide'), s('insel', 'fantasy_schwebende_insel', 'Schwebende Insel'), s('bogen', 'natur_felsbogen', 'Felsbogen')], { kind: 'gruen', rowWidth: 60 }),
    q('markt', 'Markt der Tränke', [0, 2], 'Braustube, Verzauberungsraum, Handelshalle und Buden.', [s('brau', 'braustube', 'Braustube'), s('zauber', 'verzauberungsraum', 'Verzauberungsraum'), s('halle', 'handelshalle', 'Handelshalle'), s('b1', 'marktbude_blue', 'Marktbude'), s('b2', 'marktbude_red', 'Marktbude')], { gap: 2, rowWidth: 44 }),
    q('schaedel', 'Schädelhöhle & Vulkan', [1, 2], 'Düstere Ecke der Stadt: Schädelhöhle und Vulkan.', [s('hoehle', 'fantasy_schaedelhoehle', 'Schädelhöhle'), s('vulkan', 'natur_vulkan', 'Vulkan')], { kind: 'gruen', rowWidth: 44 }),
    q('luft', 'Luftschiffhafen', [2, 2], 'Luftschiff und Heißluftballon am Stadtrand.', [s('schiff', 'fahrzeug_luftschiff', 'Luftschiff'), s('ballon', 'heissluftballon', 'Heißluftballon')], { rowWidth: 48 }),
  ],
  phasen: [
    ph('p1', 'Akademie', 'Zauberwald und Akademie als Mitte.', ['akademie']),
    ph('p2', 'Türme & Allee', 'Turmviertel und Wahrzeichen-Allee.', ['tuerme', 'allee']),
    ph('p3', 'Dorf & Markt', 'Pilzdorf und Markt der Tränke.', ['pilzdorf', 'markt']),
    ph('p4', 'Kulisse & Hafen', 'Naturkulisse, Schädelhöhle und Luftschiffhafen.', ['natur', 'schaedel', 'luft']),
  ],
};
