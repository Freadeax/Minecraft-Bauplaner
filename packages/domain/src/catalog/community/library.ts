import { contributionAsset, readContribution } from '../contribution.js';
import type { Asset, AssetVersion } from '../../core/types.js';
import { COMMUNITY_ENTRIES } from './registry.js';
import type { CommunityEntry } from './types.js';

export interface CommunityLibrary {
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  /** Entries that could not be read (should never happen after the intake check); the rest still ships. */
  readonly failed: readonly { readonly id: string; readonly reason: string }[];
}

/**
 * Fixed contributions as shipped (demo) assets with one version "1.0" (LIB-06).
 * Same shape as `createBuildingLibrary`, so seeding, delivery of changed
 * geometry (UPDATE-01) and the catalogue cache treat them like shipped designs.
 * A broken entry never stops the app start; it is reported in `failed`.
 */
export async function createCommunityLibrary(entries: readonly CommunityEntry[] = COMMUNITY_ENTRIES, onProgress?: (done: number, total: number) => void): Promise<CommunityLibrary> {
  const assets: Asset[] = [], versions: AssetVersion[] = [], failed: { id: string; reason: string }[] = [];
  let done = 0;
  for (const entry of entries) {
    try {
      const checked = await readContribution((await entry.load()).default);
      if (checked.meta.id !== entry.id) throw new Error(`Kennung im Paket (${checked.meta.id}) passt nicht zum Register`);
      const r = await contributionAsset(checked);
      assets.push(r.asset); versions.push(r.version);
    } catch (e) {
      failed.push({ id: entry.id, reason: e instanceof Error ? e.message : String(e) });
    }
    onProgress?.(++done, entries.length);
  }
  return { assets, versions, failed };
}

/** Static information of a contribution (undefined for every other asset). */
export function communityEntry(assetId: string): CommunityEntry | undefined {
  return COMMUNITY_ENTRIES.find(e => e.id === assetId);
}
