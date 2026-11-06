import { Plot, axis, barrel, button, chest, furnace, grass, hopper, lamp, lantern, lever, repeater, slab, stairs, water, F } from '../plot.js';
import { chair, daylight } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import type { H, Props } from '../plot.js';

/**
 * Technik (Katalog v3): kleine Redstone- und Trichtermodule nach Java-Regeln.
 * Verwendete Regeln: Verstärker-`facing` ist die Eingangsseite; ein Knopf oder
 * Hebel versorgt den Block, an dem er hängt, stark und direkt angrenzende
 * Mechanik; Redstone-Staub versorgt den Block, auf den er zeigt; ein Trichter
 * zieht aus dem Behälter direkt über sich und gibt in Blickrichtung ab; eine
 * Truhe öffnet nur, wenn über ihr kein leitender Vollblock liegt.
 * Keines der Module ist im Spiel abgenommen.
 */

const UNTESTED = 'Nach Java-Regeln gesetzt, aber nicht im Spiel abgenommen – vor dem Nachbau einmal in einer Testwelt prüfen.';

/** Redstone dust with explicit side shapes ('side', 'up' or 'none'). */
const dust = (sides: Partial<Record<H, 'side' | 'up'>>, power = 0): Props => ({
  east: sides.east ?? 'none', north: sides.north ?? 'none', power: String(power), south: sides.south ?? 'none', west: sides.west ?? 'none',
});
const trapdoorOpen = (f: H): Props => ({ facing: f, half: 'bottom', open: 'true', powered: F, waterlogged: F });

/** Doorbell: a button on a note block in the gate pillar; the gold block below gives the bell sound. */
function tuerklingel() {
  const p = new Plot([9, 5, 6]);
  for (let x = 0; x < 9; x++) for (let z = 0; z < 6; z++) p.set(x, 0, z, x === 4 ? 'gravel' : 'grass_block', x === 4 ? {} : grass());
  for (let x = 0; x < 9; x++) if (x < 3 || x > 5) p.set(x, 1, 2, 'oak_fence');
  p.set(4, 1, 2, 'oak_fence_gate', { facing: 'south', in_wall: F, open: F, powered: F });
  p.set(3, 1, 2, 'gold_block'); p.set(3, 2, 2, 'note_block', { instrument: 'bell', note: '0', powered: F }); p.air(3, 3, 2);
  p.set(3, 2, 3, 'stone_button', button('south'));
  p.fill(5, 1, 2, 5, 2, 2, 'stone_bricks'); p.set(5, 3, 2, 'lantern', lantern());
  p.set(6, 2, 2, 'barrel', barrel('south'));
  for (const [x, z, f] of [[1, 0, 'poppy'], [2, 1, 'dandelion'], [6, 0, 'cornflower'], [7, 1, 'poppy'], [1, 4, 'azure_bluet'], [7, 4, 'dandelion']] as const) p.set(x, 1, z, f);
  return p.payload();
}

/**
 * Dusk lamp: an inverted daylight sensor gives power at night; the dust climbs
 * a stepped wall (air above every lower dust) and ends pointing into the lamp.
 */
function daemmerungslaterne() {
  const p = new Plot([8, 7, 3]);
  for (let x = 0; x < 8; x++) for (let z = 0; z < 3; z++) p.set(x, 0, z, 'grass_block', grass());
  p.set(0, 1, 1, 'daylight_detector', daylight(true));
  p.set(1, 1, 1, 'redstone_wire', dust({ west: 'side', east: 'up' })); p.air(1, 2, 1);
  p.set(2, 1, 1, 'stone_bricks'); p.set(2, 2, 1, 'redstone_wire', dust({ west: 'side', east: 'up' })); p.air(2, 3, 1);
  p.fill(3, 1, 1, 3, 2, 1, 'stone_bricks'); p.set(3, 3, 1, 'redstone_wire', dust({ west: 'side', east: 'up' })); p.air(3, 4, 1);
  p.fill(4, 1, 1, 4, 3, 1, 'stone_bricks'); p.set(4, 4, 1, 'redstone_wire', dust({ west: 'side', east: 'side' })); p.air(4, 5, 1);
  // lamp head on a wall post, framed by open trapdoors
  p.fill(5, 1, 1, 5, 3, 1, 'stone_brick_wall');
  p.set(5, 4, 1, 'redstone_lamp', lamp(false));
  p.set(5, 4, 0, 'dark_oak_trapdoor', trapdoorOpen('north')); p.set(5, 4, 2, 'dark_oak_trapdoor', trapdoorOpen('south'));
  p.set(6, 4, 1, 'dark_oak_trapdoor', trapdoorOpen('east'));
  p.set(5, 5, 1, 'stone_brick_slab', slab());
  for (const z of [0, 2]) { p.set(2, 1, z, 'stone_brick_stairs', stairs(z === 0 ? 'south' : 'north')); }
  p.set(7, 1, 0, 'fern'); p.set(7, 1, 2, 'fern');
  return p.payload();
}

/**
 * Item elevator: items thrown through the sign enter a bubble column over soul
 * sand; at the top the source block spills a short stream over a hopper line
 * that fills the chest on the platform.
 */
function itemAufzug() {
  const p = new Plot([8, 12, 4]);
  p.fill(0, 0, 0, 7, 0, 3, 'stone_bricks'); p.set(2, 0, 1, 'soul_sand');
  for (let y = 1; y <= 9; y++) { p.ring(1, 0, 3, 2, y, 'glass'); p.set(2, y, 1, 'water', water()); }
  p.set(1, 1, 1, 'oak_sign', { rotation: '4', waterlogged: F });
  // top: spill stream over hoppers
  p.set(3, 9, 1, 'water', { level: '1' }); p.set(4, 9, 1, 'water', { level: '2' }); p.set(5, 9, 1, 'water', { level: '3' });
  for (const x of [4, 5]) { p.set(x, 9, 0, 'glass'); p.set(x, 9, 2, 'glass'); }
  p.set(6, 9, 1, 'glass');
  p.fill(2, 10, 1, 5, 10, 1, 'glass');
  p.set(3, 8, 1, 'hopper', hopper('east')); p.set(4, 8, 1, 'hopper', hopper('east')); p.set(5, 8, 1, 'hopper', hopper('down'));
  // platform with collector chest and ladder
  p.fill(4, 6, 0, 7, 6, 3, 'stone_bricks');
  p.set(5, 7, 1, 'chest', chest('south'));
  for (const z of [0, 3]) for (const x of [4, 7]) p.fill(x, 1, z, x, 5, z, 'stone_bricks');
  p.fill(6, 1, 3, 6, 6, 3, 'ladder', { facing: 'west', waterlogged: F });
  for (const [x, z] of [[4, 3], [5, 3], [7, 3], [7, 2], [7, 0]] as const) p.set(x, 7, z, 'oak_fence');
  p.set(7, 8, 0, 'lantern', lantern());
  return p.payload();
}

/** Storage wall: input chest → hopper line; each column's hopper pulls from the line and fills its chest (overflow runs on). */
function lagerwand() {
  const p = new Plot([9, 7, 4]);
  p.fill(0, 0, 0, 8, 0, 3, 'spruce_planks');
  p.fill(0, 1, 0, 8, 5, 0, 'spruce_planks');
  for (const x of [0, 2, 4, 6, 8]) p.fill(x, 1, 1, x, 2, 1, 'spruce_log', axis('y'));
  for (const x of [0, 8]) p.fill(x, 3, 1, x, 4, 1, 'spruce_log', axis('y'));
  for (const x of [1, 3, 5, 7]) { p.set(x, 1, 1, 'chest', chest('south')); p.set(x, 2, 1, 'hopper', hopper('down')); }
  for (let x = 1; x <= 7; x++) p.set(x, 3, 1, 'hopper', hopper(x === 7 ? 'down' : 'east'));
  p.set(1, 4, 1, 'chest', chest('south'));
  p.fill(0, 5, 1, 8, 5, 1, 'spruce_slab', slab('top'));
  p.fill(0, 5, 2, 8, 5, 2, 'spruce_stairs', stairs('north'));
  for (const x of [2, 6]) p.set(x, 4, 2, 'lantern', lantern(true));
  return p.payload();
}

/** Furnace street: one ore chest, one fuel chest and one result chest serve six furnaces over hopper lines. */
function ofenstrasse() {
  const p = new Plot([9, 7, 5]);
  p.fill(0, 0, 0, 8, 0, 4, 'stone_bricks');
  p.fill(0, 1, 0, 8, 5, 0, 'stone_bricks'); p.fill(0, 1, 1, 0, 5, 2, 'stone_bricks'); p.fill(8, 1, 1, 8, 5, 2, 'stone_bricks');
  for (let x = 1; x <= 6; x++) {
    p.set(x, 1, 1, 'stone_bricks');
    p.set(x, 2, 1, 'hopper', hopper('south'));            // fuel into the side
    p.set(x, 3, 1, 'hopper', hopper(x === 6 ? 'down' : 'east'));
    p.set(x, 1, 2, 'hopper', hopper('east'));             // results out of the bottom
    p.set(x, 2, 2, 'furnace', furnace('south'));
    p.set(x, 3, 2, 'hopper', hopper('down'));             // ore into the top
    p.set(x, 4, 2, 'hopper', hopper(x === 6 ? 'down' : 'east'));
  }
  p.set(1, 4, 1, 'chest', chest('south'));   // fuel
  p.set(1, 5, 2, 'chest', chest('south'));   // ore
  p.set(7, 1, 2, 'chest', chest('south'));   // results
  p.set(7, 2, 2, 'lantern', lantern());
  p.fill(7, 1, 1, 7, 5, 1, 'stone_bricks');
  p.fill(0, 6, 0, 8, 6, 3, 'stone_brick_slab', slab());
  for (const x of [3, 5]) p.set(x, 5, 3, 'lantern', lantern(true));
  return p.payload();
}

const MELODY = [6, 10, 13, 18, 13, 10] as const;

/** Note melody: lever → repeater → note block → repeater …; each strongly powered note block feeds the next repeater. */
function notenMelodie() {
  const p = new Plot([13, 3, 3]);
  p.fill(0, 0, 0, 12, 0, 2, 'smooth_stone');
  p.set(0, 1, 1, 'lever', lever('east', 'floor'));
  MELODY.forEach((note, i) => {
    const x = 1 + 2 * i;
    p.set(x, 1, 1, 'repeater', repeater('west', 2));
    p.set(x + 1, 0, 1, 'clay'); p.set(x + 1, 1, 1, 'note_block', { instrument: 'flute', note: String(note), powered: F }); p.air(x + 1, 2, 1);
  });
  for (let x = 0; x <= 12; x++) for (const z of [0, 2]) p.set(x, 1, z, 'smooth_stone_slab', slab());
  return p.payload();
}

/** Lamp desk: each wall lever strongly powers its block; the lamps above and below it light. */
function lampenpult() {
  const p = new Plot([11, 6, 5]);
  p.fill(0, 0, 0, 10, 0, 4, 'polished_andesite');
  p.fill(0, 1, 0, 10, 5, 0, 'gray_concrete');
  for (const x of [2, 4, 6, 8]) {
    p.set(x, 2, 0, 'redstone_lamp', lamp()); p.set(x, 3, 0, 'polished_blackstone'); p.set(x, 4, 0, 'redstone_lamp', lamp());
    p.set(x, 3, 1, 'lever', lever('south'));
  }
  p.fill(1, 1, 1, 9, 1, 1, 'smooth_stone_slab', slab('top'));
  for (const x of [0, 10]) p.fill(x, 1, 1, x, 4, 1, 'gray_concrete');
  chair(p, 3, 1, 3, 'dark_oak', 'south'); chair(p, 7, 1, 3, 'dark_oak', 'south');
  p.fill(0, 6, 0, 10, 6, 1, 'smooth_stone_slab', slab());
  return p.payload();
}

export const TECHNIK_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_technik_tuerklingel', name: 'Türklingel', payload: tuerklingel, tags: ['notenblock', 'knopf', 'gartentor'],
    description: 'Gartentor mit Klingelpfeiler: Steinknopf direkt auf einem Notenblock über einem Goldblock (Glockenklang), daneben Laternenpfeiler und Briefkasten-Fass.',
    facets: { kategorie: ['redstone'], stil: ['technisch'], biom: ['ueberall'], funktion: ['deko', 'unterhaltung'] },
    tips: [UNTESTED, 'Über dem Notenblock muss Luft bleiben, sonst bleibt er stumm; der Block darunter bestimmt das Instrument.'],
    inspiration: [WIKI('Note_Block', 'Notenblock')] },
  { id: 'bld_technik_daemmerungslaterne', name: 'Dämmerungslaterne', payload: daemmerungslaterne, tags: ['tageslichtsensor', 'lampe', 'automatisch'],
    description: 'Invertierter Tageslichtsensor, dessen Leitung eine Stufenmauer hinaufläuft und eine Redstone-Lampe mit Falltürrahmen nachts einschaltet.',
    facets: { kategorie: ['redstone'], stil: ['technisch'], biom: ['ueberall'], funktion: ['beleuchtung'] },
    tips: [UNTESTED, 'Staub läuft nur eine Stufe hinauf, wenn direkt über dem unteren Staub Luft ist.'],
    inspiration: [WIKI('Daylight_Detector', 'Tageslichtsensor')] },
  { id: 'bld_technik_item_aufzug', name: 'Item-Aufzug', payload: itemAufzug, tags: ['blasensäule', 'seelensand', 'trichter'],
    description: 'Gläserne Blasensäule über Seelensand hebt durch ein Schild geworfene Gegenstände neun Blöcke hoch; oben spült ein kurzer Wasserlauf sie über Trichter in die Truhe auf der Plattform.',
    facets: { kategorie: ['redstone'], stil: ['technisch'], biom: ['ueberall'], funktion: ['transport', 'lagern'] },
    gaps: ['minecraft:water'],
    tips: [UNTESTED, 'Alle Säulenblöcke müssen Wasserquellen sein; das Schild unten hält das Wasser zurück, Gegenstände fliegen hindurch.'],
    inspiration: [WIKI('Bubble_Column', 'Blasensäule')] },
  { id: 'bld_technik_lagerwand', name: 'Trichter-Lagerwand', payload: lagerwand, tags: ['trichter', 'truhen', 'lager'],
    description: 'Lagerwand aus vier Truhen: eine Eingangstruhe speist eine Trichterkette, aus der jede Spalte über einen eigenen Trichter ihre Truhe füllt.',
    facets: { kategorie: ['redstone'], stil: ['technisch', 'rustikal'], biom: ['ueberall'], funktion: ['lagern'] },
    tips: [UNTESTED, 'Ein Trichter zieht aus jedem Behälter direkt über sich – auch aus einem anderen Trichter.'],
    inspiration: [WIKI('Hopper', 'Trichter')] },
  { id: 'bld_technik_ofenstrasse', name: 'Ofenstraße', payload: ofenstrasse, tags: ['öfen', 'trichter', 'schmelzen'],
    description: 'Sechs Öfen in einer Reihe mit je einer Trichterkette für Erz (oben), Brennstoff (hinten) und Ergebnisse (unten) – nur drei Truhen zu bedienen.',
    facets: { kategorie: ['redstone'], stil: ['technisch', 'industriell'], biom: ['ueberall'], funktion: ['schmelzen'] },
    tips: [UNTESTED, 'Trichter von oben füllen den Erzplatz, Trichter von der Seite den Brennstoffplatz, der Trichter darunter holt das Ergebnis.'],
    inspiration: [WIKI('Tutorials/Furnace_array', 'Ofenreihen')] },
  { id: 'bld_technik_notenmelodie', name: 'Notenblock-Melodie', payload: notenMelodie, tags: ['notenblock', 'verstärker', 'musik'],
    description: 'Hebel und Verstärkerkette spielen sechs Flötentöne (Notenblöcke auf Ton) nacheinander ab; jeder Notenblock gibt den Impuls an den nächsten Verstärker weiter.',
    facets: { kategorie: ['redstone'], stil: ['technisch'], biom: ['ueberall'], funktion: ['unterhaltung'] },
    tips: [UNTESTED, 'Hebel aus- und wieder einschalten spielt die Melodie erneut; die Verstärkerverzögerung bestimmt das Tempo.', 'Töne von links nach rechts mit Rechtsklick stimmen: 6, 10, 13, 18, 13, 10 Klicks (der Plan speichert die Tonhöhe nicht).'],
    inspiration: [WIKI('Note_Block', 'Notenblock')] },
  { id: 'bld_technik_lampenpult', name: 'Lampenpult', payload: lampenpult, tags: ['hebel', 'lampen', 'schaltpult'],
    description: 'Schaltwand mit vier Hebeln: jeder Hebel versorgt seinen Schwarzsteinblock und schaltet die Redstone-Lampen darüber und darunter, davor Pult und zwei Stühle.',
    facets: { kategorie: ['redstone'], stil: ['technisch', 'modern'], biom: ['ueberall'], funktion: ['beleuchtung'] },
    tips: [UNTESTED, 'Ein Hebel versorgt den Block, an dem er hängt, stark – alle angrenzenden Lampen gehen mit an.'],
    inspiration: [WIKI('Lever', 'Hebel')] },
];
