import { e, ph, q, s } from './helpers.js';
import type { Grossprojekt } from './helpers.js';

export const GP_BERGBAUSTADT: Grossprojekt = {
  id: 'gp_bergbaustadt', name: 'Bergbaustadt der Zwerge', themeId: 'gebirge', tags: ['bergbau', 'untergrund', 'zwerge', 'bahn', 'nordisch'],
  description: 'Bergwerk mit Förderturm, Schmelzwerk mit Ofenstraße und Sortierern, Grubenbahnhof mit Gleisen, nordische Wohnhütten und Versorgung mit Weiden. Kieswege; die Hanglage planst du im Gelände.',
  streets: { style: 'kies', width: 3, lamps: true }, spacing: 3,
  quartiere: [
    q('bergwerk', 'Bergwerk', [1, 0], 'Mineneingang, Lager, Erzgießerei, Zwergenhalle, Minengänge und Untergrund-Bahnhof.', [e('mine', 'bergwerk')], { span: [2, 1] }),
    q('schmelze', 'Schmelzwerk', [0, 0], 'Ofenstraße, drei Schmelzmodule und zwei Sortierer verarbeiten das Erz.', [s('ofen', 'technik_ofenstrasse', 'Ofenstraße'), s('s1', 'schmelz_modul', 'Schmelzmodul'), s('s2', 'schmelz_modul', 'Schmelzmodul'), s('s3', 'schmelz_modul', 'Schmelzmodul'), s('so1', 'sortier_modul', 'Sortierer'), s('so2', 'sortier_modul', 'Sortierer'), s('lagerwand', 'technik_lagerwand', 'Lagerwand')], { gap: 1, rowWidth: 32 }),
    q('bahn', 'Grubenbahnhof', [0, 1], 'Bahnhof mit Gleisen, Kurve und Dampflok für den Erztransport.', [s('bhf', 'bahnhof', 'Bahnhof'), s('g1', 'gleis_gerade', 'Gleis'), s('g2', 'gleis_gerade', 'Gleis'), s('kurve', 'gleis_kurve', 'Gleiskurve'), s('lok', 'fahrzeug_dampflok', 'Dampflok')], { gap: 1, rowWidth: 40 }),
    q('wohnen', 'Wohnhütten', [1, 1], 'Blockhütten, Chalets und ein Langhaus für die Bergleute.', [s('h1', 'blockhuette', 'Blockhütte'), s('h2', 'chalet', 'Chalet'), s('h3', 'blockhuette', 'Blockhütte'), s('h4', 'langhaus', 'Langhaus'), s('h5', 'chalet_dunkelwald', 'Chalet')], { gap: 2, rowWidth: 52 }),
    q('versorgung', 'Versorgung', [2, 1], 'Schafweide, Süßbeeren und Zuchthaus.', [s('schafe', 'hof_schafweide', 'Schafweide'), s('beeren', 'hof_suessbeeren', 'Süßbeeren'), s('zucht', 'hof_zuchthaus', 'Zuchthaus')], { rowWidth: 52 }),
    q('tor', 'Palisadentor', [1, 2], 'Tor und Türme schließen die Siedlung zum Tal.', [s('t1', 'palisade_turm', 'Palisadenturm'), s('tor', 'palisade_tor', 'Palisadentor'), s('t2', 'palisade_turm', 'Palisadenturm')], { gap: 1, rowWidth: 40 }),
    q('kulisse', 'Riesenfichte & Findling', [0, 2], 'Naturkulisse am Ortsrand.', [s('fichte', 'natur_riesenfichte', 'Riesenfichte'), s('findling', 'findling', 'Findling')], { kind: 'gruen', rowWidth: 40 }),
  ],
  phasen: [
    ph('p1', 'Bergwerk', 'Der Mineneingang mit Förderturm als Ausgangspunkt.', ['bergwerk']),
    ph('p2', 'Schmelze & Bahn', 'Verarbeitung und Transport.', ['schmelze', 'bahn']),
    ph('p3', 'Wohnen & Versorgung', 'Hütten, Weiden und Zucht.', ['wohnen', 'versorgung']),
    ph('p4', 'Tor & Kulisse', 'Palisadentor und Natur am Rand.', ['tor', 'kulisse']),
  ],
};
