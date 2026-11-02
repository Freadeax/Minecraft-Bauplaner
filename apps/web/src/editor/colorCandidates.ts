import { defaultState, hexToRgb, paletteEntries } from '../../../../packages/domain/src/index.js';
import type { ColorCandidate } from '../../../../packages/domain/src/index.js';
import { blockLook } from '../blockmodels/colors26';

/**
 * Blocks that may stand in for a colour (EDIT-04): full cubes of the 26.3
 * register with their average face colours from the generated colour table.
 * Left out: shaped blocks (stairs, slabs …), see-through or unstable blocks,
 * blocks that fall (sand, gravel, concrete powder), technical and light blocks.
 */
export type ColorGroup = 'alle' | 'wolle' | 'beton' | 'terrakotta' | 'stein' | 'holz';
export const COLOR_GROUP_LABEL: Readonly<Record<ColorGroup, string>> = {
  alle: 'Alle vollen Blöcke', wolle: 'Wolle', beton: 'Beton', terrakotta: 'Terrakotta (auch glasiert)', stein: 'Stein, Ziegel, Erde', holz: 'Holz und Stämme',
};

const SHAPED = /(_stairs|_slab|_wall|_fence|_fence_gate|_door|_trapdoor|_pane|_button|_pressure_plate|_sign|_banner|_carpet|_bed|_head|_skull|_rail|rail|torch|lantern|candle|chain|_bars|_leaves|glass|_sapling|_bush|_coral|_fan|_shelf|_plate|_stem|_vine|vines|_roots|_sprouts|_flower|_tulip|_mushroom$|_pot$)$/;
const EXCLUDED = /^(sand|red_sand|gravel|suspicious_.*|.*_concrete_powder|ice|frosted_ice|packed_ice|blue_ice|slime_block|honey_block|tnt|barrier|light|structure_block|structure_void|jigsaw|command_block|chain_command_block|repeating_command_block|spawner|trial_spawner|vault|bedrock|end_portal_frame|budding_amethyst|reinforced_deepslate|.*_ore|infested_.*|sculk_.*|sculk|beacon|conduit|farmland|dirt_path|snow|powder_snow|water|lava|air|cave_air|void_air|.*_shulker_box|shulker_box|cake|.*_cake|scaffolding|barrel|bee_nest|beehive|blast_furnace|furnace|smoker|bubble_column|cactus|.*cauldron|.*chest|composter|.*copper_golem_statue|.*copper_grate|.*copper_bulb|crafter|creaking_heart|dispenser|dropper|hopper|observer|piston|sticky_piston|moving_piston|end_gateway|end_portal|fire|soul_fire|jukebox|lectern|lodestone|loom|respawn_anchor|seagrass|tall_seagrass|test_block|test_instance_block|azalea|flowering_azalea|chiseled_bookshelf|stonecutter|(brain|bubble|fire|horn|tube)_coral_block)$/;
const groupOf = (name: string): ColorGroup[] => {
  const g: ColorGroup[] = ['alle'];
  if (name.endsWith('_wool')) g.push('wolle');
  if (name.endsWith('_concrete')) g.push('beton');
  if (name.includes('terracotta')) g.push('terrakotta');
  if (/(_planks|_log|_wood|_stem|_hyphae|bamboo_block|bamboo_mosaic)$/.test(name)) g.push('holz');
  if (/(stone|brick|cobble|deepslate|andesite|diorite|granite|tuff|basalt|blackstone|calcite|dripstone|mud|dirt|clay|prismarine|purpur|quartz|sandstone|netherrack|end_stone|obsidian|moss_block|podzol|mycelium|grass_block)/.test(name) && !g.includes('holz')) g.push('stein');
  return g;
};

let CACHE: { candidate: ColorCandidate; groups: ColorGroup[] }[] | null = null;
function all(): { candidate: ColorCandidate; groups: ColorGroup[] }[] {
  if (CACHE) return CACHE;
  const out: { candidate: ColorCandidate; groups: ColorGroup[] }[] = [];
  for (const e of paletteEntries()) {
    const name = e.id.replace(/^minecraft:/, '');
    const stemBlock = /^(stripped_)?(crimson|warped)_stem$/.test(name);
    if ((SHAPED.test(name) && !stemBlock) || EXCLUDED.test(name)) continue;
    const look = blockLook(name);
    if (!look || look.shape !== '') continue;
    out.push({ candidate: { id: e.id, side: hexToRgb(look.side), top: hexToRgb(look.top), value: { kind: 'block', state: defaultState(e.id) } }, groups: groupOf(name) });
  }
  CACHE = out;
  return out;
}

/** Candidates of a group (stable order by id). */
export function colorCandidates(group: ColorGroup = 'alle'): ColorCandidate[] {
  return all().filter(c => c.groups.includes(group)).map(c => c.candidate);
}
export function candidateFor(id: string): ColorCandidate | undefined { return all().find(c => c.candidate.id === id)?.candidate; }
