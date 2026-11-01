import { queryCatalog } from './catalog.js';
import type { BuildingFacets, CatalogEntry, CatalogQuery } from './catalog.js';

/** Editorial routes into the existing catalogue. Facets are author declarations, not compatibility claims. */
export interface BuildTheme {
  readonly id: string;
  readonly name: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly facets: BuildingFacets;
  readonly tasks: readonly [string, string, string];
}
export const BUILD_THEMES: readonly BuildTheme[] = [
  { id: 'kueste', name: 'Hafen & Küste', eyebrow: 'VOM STEG ZUR HAFENSTADT',
    description: 'Baue vom Wasser aus: kurze Wege zwischen Anlegen, Lagern und Wohnen verbinden einzelne Gebäude zu einer lebendigen Küste.',
    facets: { stil: ['kuestenstil'] }, tasks: ['Beginne mit einem kleinen Anleger und prüfe die Wasserlinie.', 'Ordne Lager und Wohnhäuser entlang einer Promenade an.', 'Setze einen sichtbaren Orientierungspunkt für die Hafeneinfahrt.'] },
  { id: 'mittelalter', name: 'Burg & Marktstadt', eyebrow: 'GASSEN, HANDEL UND MAUERN',
    description: 'Eine Stadt wächst um ihren Treffpunkt. Verbinde Fachwerk, Handwerk und Befestigung mit Straßen und bewusst gesetzten Freiflächen.',
    facets: { stil: ['mittelalterlich'] }, tasks: ['Lege zuerst Markt und Hauptgasse als Bezugspunkte fest.', 'Ergänze Wohnhäuser und Werkstätten in mehreren Bauabschnitten.', 'Plane Tore und Mauern erst um die nutzbare Stadtfläche herum.'] },
  { id: 'moderne', name: 'Moderne Stadt', eyebrow: 'KLARE FORMEN UND RAUM',
    description: 'Arbeite mit klaren Baukörpern und wiederkehrenden Abständen. Wohnbereiche, Grün und Wege bekommen jeweils ihren eigenen Platz.',
    facets: { stil: ['modern'] }, tasks: ['Wähle einen Baukörper als Ausgangspunkt für ein Quartier.', 'Plane Straßenbreite und Abstände vor dem Vervielfältigen.', 'Ergänze einen ruhigen Grünbereich zwischen den Gebäuden.'] },
  { id: 'gebirge', name: 'Nordische Bergsiedlung', eyebrow: 'HOLZ, STEIN UND HÖHE',
    description: 'Nordische Entwürfe bilden den Ausgangspunkt für eine Siedlung am Hang. Das Gelände prüfst du selbst; der Stilfilter ersetzt keine Fundamentprüfung.',
    facets: { stil: ['nordisch'] }, tasks: ['Bestimme zuerst nutzbare Terrassen und Höhenunterschiede.', 'Verbinde die Ebenen über kurze Wege und Zwischenplätze.', 'Prüfe jedes Fundament im eigenen Gelände vor dem Baubeginn.'] },
  { id: 'fantasy', name: 'Magische Bauwelt', eyebrow: 'FANTASY MIT EIGENEM CHARAKTER',
    description: 'Ein auffälliges Wahrzeichen gibt deiner Fantasiewelt eine Richtung. Kleine Begleitbauten und Landschaft machen daraus einen zusammenhängenden Ort.',
    facets: { stil: ['fantasy'] }, tasks: ['Suche ein Hauptmotiv aus den vorhandenen Fantasy-Entwürfen.', 'Wiederhole einzelne Formen oder Materialien in Begleitbauten.', 'Verbinde die Baugruppen mit Wegen und bewusst freien Blickachsen.'] },
  { id: 'nether', name: 'Nether-Expedition', eyebrow: 'STÜTZPUNKT ZWISCHEN DEN WELTEN',
    description: 'Nether-Stil ist der thematische Ausgangspunkt für Reisewege und einen eigenen Außenposten. Sichere Wege und Spielmechanik prüfst du in deiner Zielwelt.',
    facets: { stil: ['nether'] }, tasks: ['Plane den Ankunftsbereich mit freiem Zugang.', 'Trenne Reiseweg, Lager und Aufenthaltsbereich sichtbar.', 'Prüfe Schutz, Umgebung und Blockfunktionen im Spiel.'] },
  { id: 'landleben', name: 'Dorf & Landleben', eyebrow: 'WOHNEN, FELDER UND HANDWERK',
    description: 'Rustikale Wohnhäuser und landwirtschaftliche Bauten werden zu einer überschaubaren Siedlung. Die kurzen Wege zwischen Haus, Feld und Lager bestimmen den Aufbau.',
    facets: { stil: ['rustikal'], kategorie: ['wohnhaus', 'landwirtschaft', 'farm', 'handwerk'] },
    tasks: ['Ordne ein Wohnhaus und die erste Nutzfläche nebeneinander an.', 'Lasse Platz für spätere Felder, Tierhaltung oder Werkstätten.', 'Gliedere die Erweiterung in kleine, einzeln baubare Abschnitte.'] },
  { id: 'technik', name: 'Technik & Industrie', eyebrow: 'FUNKTIONEN MODULAR VERBINDEN',
    description: 'Technische und industrielle Entwürfe liefern Bausteine für einen Funktionshof. Zugänge und Erweiterungsflächen gehören genauso zur Planung wie die Module selbst.',
    facets: { stil: ['technisch', 'industriell'] }, tasks: ['Wähle zuerst eine konkrete Aufgabe wie Transport oder Schmelzen.', 'Prüfe verfügbare Anschlüsse und halte Wartungszugänge frei.', 'Teste technische Module in deiner Spielversion vor der Serienerweiterung.'] },
  { id: 'fernost', name: 'Fernöstlicher Garten', eyebrow: 'RUHE, WASSER UND KLARE WEGE',
    description: 'Schrein, Tor und Zen-Garten bilden einen ruhigen Ort. Die Wegeführung und bewusst freie Flächen tragen die Wirkung; die Geländehöhe prüfst du selbst.',
    facets: { stil: ['fernoestlich'], kategorie: ['garten', 'sakral', 'dekoration'] },
    tasks: ['Lege Weg und Wasserlauf fest, bevor du Gebäude stellst.', 'Setze Schrein oder Tor als sichtbaren Orientierungspunkt.', 'Halte eine freie Fläche für Blicke und späteres Wachstum frei.'] },
  { id: 'wuestenhandel', name: 'Wüstenhandel & Oasenweg', eyebrow: 'WEG, LAGER UND HANDEL',
    description: 'Wüstenstil-Bauten werden zu Stationen eines Handelswegs: Unterkunft, Lager und sichtbare Wegemarken. Die Wüstenstil-Angabe ist eine Gestaltungsrichtung, keine geprüfte Umgebung.',
    facets: { stil: ['wuestenstil'], kategorie: ['wohnhaus', 'befestigung', 'wahrzeichen'] },
    tasks: ['Markiere Anfang und Ende des Wegs mit einem sichtbaren Bauwerk.', 'Ordne Unterkunft und Lager in kurzen Abständen dazwischen an.', 'Prüfe Fundamente und Schattenplätze im eigenen Gelände.'] },
  { id: 'endposten', name: 'End-Außenposten', eyebrow: 'STÜTZPUNKT AM RAND DER WELT',
    description: 'Endstein-Bauten und ein Startplatz ergeben einen abgelegenen Stützpunkt. Schutz, Fortbewegung und Rückweg planst du für deine Zielwelt selbst.',
    facets: { stil: ['end'] },
    tasks: ['Plane den Ankunftsplatz mit freiem Zugang und Rückweg.', 'Trenne Unterkunft, Lager und Befestigung sichtbar.', 'Prüfe Schutz und Blockfunktionen in deiner Zielwelt vor dem Ausbau.'] },
];

export function buildThemeQuery(theme: BuildTheme): CatalogQuery {
  return { facets: theme.facets, sort: 'name', collapseFamilies: false };
}
export function selectBuildTheme(entries: readonly CatalogEntry[], theme: BuildTheme) {
  const matches = queryCatalog(entries, buildThemeQuery(theme));
  return { theme, count: matches.length, previews: matches.slice(0, 3) };
}
