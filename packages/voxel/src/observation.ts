import type { BlockState, Vec3 } from './types.js';

/** Cells the recorder could not read (chunk not loaded). Never treated as air. */
export const UNLOADED_STATE = 'bauplaner:unloaded';

/** `Metadata.Bauplaner` of a recording written by the game bridge (format `bauplaner-scan` v1). */
export interface ScanMeta {
  readonly projectId: string;
  readonly revisionId: string;
  readonly revisionNumber: number;
  /** Project coordinate of the recording's local 0/0/0 cell. */
  readonly projectMin: Vec3;
  readonly planSha256?: string;
  readonly worldAnchor?: Vec3;
  readonly dimension?: string;
  readonly scannedAt?: string;
  readonly source?: 'client' | 'server';
  readonly unloaded?: number;
  readonly gameVersion?: string;
  readonly modVersion?: string;
  readonly loader?: string;
}

export interface WorldScan {
  readonly dataVersion: number;
  /** Width (X), Height (Y), Length (Z). */
  readonly size: Vec3;
  /** Schem `Offset` as written; informational, the comparison uses `meta.projectMin` or an explicit alignment. */
  readonly offset: Vec3;
  readonly palette: readonly BlockState[];
  /** Palette index per cell, index `x + z·W + y·W·L`. */
  readonly data: Uint32Array;
  readonly blockEntities: number;
  /** null for foreign recordings without bridge metadata (e.g. WorldEdit `//schem save`). */
  readonly meta: ScanMeta | null;
  readonly warnings: readonly string[];
}

