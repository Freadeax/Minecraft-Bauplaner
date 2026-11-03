import { PROFILE_RECIPES } from './profileRecipes.js';
import { isProfileItem, profileItemTag, JAVA_PROFILE_ID } from '../../voxel/src/profile.js';
import type { Recipe } from './recipes.js';

/**
 * Rezepte des Versionsprofils (MAT-02, PROFILE-01): every recipe of the official 26.3 server that turns
 * items into building items, parsed from `profileRecipes.ts`. The planner's own catalogue in
 * `recipes.ts` chooses one path per item; this module proves each of its recipes against the profile
 * and lists the alternatives the game also accepts.
 */
export type ProfileStation = 'crafting' | 'stonecutter' | 'smelting' | 'blasting' | 'smoking' | 'campfire' | 'smithing';
export interface ProfileIngredient {
  /** Accepted items (namespaced) – one of them per unit. Tags are expanded; `tag` names the tag. */
  readonly alternatives: readonly string[];
  readonly tag?: string;
  readonly count: number;
}
export interface ProfileRecipe {
  /** Recipe file name in the jar (e.g. `oak_planks`, `stone_bricks_from_stone_stonecutting`). */
  readonly file: string;
  readonly station: ProfileStation;
  readonly output: string;
  readonly count: number;
  /** Cooking time in ticks (cooking stations only). */
  readonly cookTicks?: number;
  readonly inputs: readonly ProfileIngredient[];
}

const ns = (id: string): string => id.includes(':') ? id : `minecraft:${id}`;
let parsed: { list: readonly ProfileRecipe[]; byOutput: ReadonlyMap<string, readonly ProfileRecipe[]> } | null = null;
function table(): { list: readonly ProfileRecipe[]; byOutput: ReadonlyMap<string, readonly ProfileRecipe[]> } {
  if (parsed) return parsed;
  const list: ProfileRecipe[] = [], byOutput = new Map<string, ProfileRecipe[]>();
  for (const line of PROFILE_RECIPES.split('\n')) {
    const [file, station, output, count, cook, inputs] = line.split('|') as [string, ProfileStation, string, string, string, string];
    const ing = inputs.split(';').map(part => {
      const star = part.indexOf('*'), n = Number(part.slice(0, star)), spec = part.slice(star + 1);
      const alternatives: string[] = []; let tag: string | undefined;
      for (const alt of spec.split('/')) {
        if (alt.startsWith('#')) { tag = `#${alt.slice(1)}`; alternatives.push(...(profileItemTag(alt) ?? [])); } else alternatives.push(ns(alt));
      }
      return Object.freeze({ alternatives: Object.freeze([...new Set(alternatives)]), count: n, ...(tag !== undefined && spec.split('/').length === 1 && { tag }) });
    });
    const r: ProfileRecipe = Object.freeze({ file, station, output: ns(output), count: Number(count), ...(cook && { cookTicks: Number(cook) }), inputs: Object.freeze(ing) });
    list.push(r);
    const l = byOutput.get(r.output); if (l) l.push(r); else byOutput.set(r.output, [r]);
  }
  return parsed = { list: Object.freeze(list), byOutput };
}

export const PROFILE_RECIPE_SOURCE = JAVA_PROFILE_ID;
export const profileRecipes = (): readonly ProfileRecipe[] => table().list;
/** Every profile recipe producing an item (namespaced or bare). */
export const profileRecipesFor = (itemId: string): readonly ProfileRecipe[] => table().byOutput.get(ns(itemId)) ?? [];

const STATIONS: Readonly<Record<string, readonly ProfileStation[]>> = { crafting: ['crafting'], stonecutter: ['stonecutter'], smelting: ['smelting', 'blasting', 'smoking'] };

/**
 * Profile recipe that a catalogue recipe follows exactly: same output, count and station, and each
 * catalogue ingredient (item or catalogue tag, resolved by `tagMembers`) is accepted by one profile
 * ingredient with the same count. Null when the profile has no such recipe.
 */
export function matchProfileRecipe(recipe: Recipe, tagMembers: (tag: string) => readonly string[] | undefined): ProfileRecipe | null {
  const stations = STATIONS[recipe.station];
  if (!stations) return null;
  for (const p of profileRecipesFor(recipe.output)) {
    if (!stations.includes(p.station) || p.count !== recipe.count || p.inputs.length !== recipe.inputs.length) continue;
    const free = [...p.inputs];
    const ok = recipe.inputs.every(i => {
      const members = i.item.startsWith('#') ? tagMembers(i.item) ?? [] : [i.item];
      const k = free.findIndex(f => f.count === i.count && members.length > 0 && members.every(m => f.alternatives.includes(m)));
      if (k < 0) return false;
      free.splice(k, 1); return true;
    });
    if (ok) return p;
  }
  return null;
}

/** Item ids in a catalogue recipe (outputs and plain inputs) that the profile does not know. */
export function unknownRecipeItems(recipe: Recipe): string[] {
  return [recipe.output, ...recipe.inputs.map(i => i.item).filter(i => !i.startsWith('#'))].filter(id => !isProfileItem(id));
}
