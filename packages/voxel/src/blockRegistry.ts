import { PROFILE_VERSION } from './profileData.js';
import { blockFacts, factBlockIds } from './blocklogic/facts.js';

/**
 * Block registry of the version profile (VIEW-02, bound to PROFILE-01). Until 03.11.2026 this was a
 * separate list from the client blockstate files plus a Litematica sample palette, which missed
 * values the files never show (leaves `distance=1…6`, sapling `stage=0`, `waterlogged` of wall
 * signs …) and listed the item frames as blocks. Now ids and every property value come from the
 * server block report behind `blockFacts.ts` – the same source as the block logic and the profile
 * (`profile.ts`). One block list, no second source.
 */
export const BLOCK_REGISTRY_VERSION = `java-${PROFILE_VERSION}`;

let ids: readonly string[] | null = null;
/** All vanilla block ids of the profile version (namespaced, sorted). */
export function vanillaBlockIds(): readonly string[] { return ids ??= Object.freeze([...factBlockIds()].sort()); }
/** Every property and value of a vanilla block in game order; undefined for unknown ids. */
export function vanillaBlockProperties(id: string): Readonly<Record<string, readonly string[]>> | undefined { return id.startsWith('minecraft:') ? blockFacts(id)?.properties : undefined; }
export function isVanillaBlock(id: string): boolean { return id.startsWith('minecraft:') && blockFacts(id) !== undefined; }
