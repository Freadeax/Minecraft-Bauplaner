import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

export const GP_TEMPELSTADT: Grossprojekt = {
  id: 'gp_tempelstadt', name: 'Tempelstadt am Kirschhain', themeId: 'fernost', tags: ['fernöstlich', 'tempel', 'garten', 'kirschhain'],
  description: 'Fernöstliche Stadt mit Tempelbezirk um die Pagode, Kirschblütengarten, Wohnhöfen aus Japanhäusern, Teehausplatz mit Torii und Schrein und einem stillen Wassergarten. Gepflasterte Wege, bewusst viel freier Raum.',
  streets: { style: 'stein', width: 3, lamps: true }, spacing: 4,
  quartiere: [
    q('tempel', 'Tempelbezirk', [1, 0], 'Pagode, Teehaus, Bogengang, Seerosenteich und Steingarten.', [e('tempel', 'tempelbezirk')], { span: [2, 1] }),
    q('garten', 'Kirschblütengarten', [0, 1], 'Japanhaus, Zen-Garten, Torii, Schrein, Teich, Pavillon und Kirschbäume.', [e('garten', 'japangarten')]),
    q('wohnen', 'Wohnhöfe', [1, 1], 'Japanhäuser um einen gemeinsamen Hof.', [s('j1', 'japanhaus', 'Japanhaus'), s('j2', 'japanhaus', 'Japanhaus'), s('j3', 'japanhaus', 'Japanhaus'), s('j4', 'japanhaus', 'Japanhaus')], { gap: 3, rowWidth: 36 }),
    q('platz', 'Teehausplatz', [2, 1], 'Torii, Schrein und Taverne am Platz unter Kirschbäumen.', [s('torii', 'torii', 'Torii'), s('schrein', 'schrein', 'Schrein'), s('taverne', 'taverne_kirschhain', 'Taverne'), s('k1', 'baum_cherry', 'Kirschbaum'), s('k2', 'baum_cherry', 'Kirschbaum')], { kind: 'platz', gap: 2, rowWidth: 44 }),
    q('wasser', 'Wassergarten', [0, 0], 'Seerosenteich, Vogeltränke und Trauerweide als ruhiger Abschluss.', [s('teich', 'garten_seerosenteich', 'Seerosenteich'), s('traenke', 'garten_vogeltraenke', 'Vogeltränke'), s('weide', 'natur_trauerweide', 'Trauerweide')], { kind: 'gruen', rowWidth: 44 }),
    q('markt', 'Marktgasse', [1, 2], 'Marktbuden und Handelshalle für Pilger.', [s('b1', 'marktbude_red', 'Marktbude'), s('b2', 'marktbude_yellow', 'Marktbude'), s('b3', 'marktbude_green', 'Marktbude'), s('halle', 'handelshalle', 'Handelshalle')], { gap: 2, rowWidth: 40 }),
    q('bogen', 'Kirschbogengang', [2, 2], 'Blütenbogengang als Weg aus der Stadt.', [s('gang', 'garten_kirschbogengang', 'Bogengang'), s('k3', 'baum_cherry', 'Kirschbaum')], { kind: 'gruen', rowWidth: 40 }),
    q('pilger', 'Pilgerherberge', [0, 2], 'Herberge und Unterkünfte für Besucher.', [s('herb', 'epoche_teehaus', 'Herberge'), s('j5', 'japanhaus', 'Japanhaus')], { rowWidth: 40 }),
  ],
  phasen: [
    ph('p1', 'Tempel', 'Pagode und Tempelbezirk als Mitte.', ['tempel']),
    ph('p2', 'Gärten', 'Kirschblütengarten und Wassergarten.', ['garten', 'wasser']),
    ph('p3', 'Wohnen & Platz', 'Wohnhöfe und Teehausplatz.', ['wohnen', 'platz']),
    ph('p4', 'Pilgerweg', 'Marktgasse, Herberge und Bogengang.', ['markt', 'pilger', 'bogen']),
  ],
};
