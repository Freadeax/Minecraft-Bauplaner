/** One fixed contribution in the shipped catalogue (LIB-06). Written by `npm run library:add`. */
export interface CommunityEntry {
  /** Asset id (`beitrag_…`). */
  readonly id: string;
  readonly name: string;
  readonly author: string;
  /** Day the maintainer took it in (ISO date). */
  readonly addedAt: string;
  /** Checksum of the package, so a replaced file is visible in the diff. */
  readonly checksum: string;
  readonly tips: readonly string[];
  /** Loads the package (one lazily loaded module per contribution, so the start bundle stays small). */
  load(): Promise<{ readonly default: unknown }>;
}
