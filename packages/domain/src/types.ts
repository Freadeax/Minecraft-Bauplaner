import type { Transform, Vec3, VoxelPayload } from '../../voxel/src/types.js';

/**
 * Shared domain contract (P2-01). All records are JSON-safe and versioned so
 * persistence, backup and later team services can store them unchanged.
 * Identities stay separate: Asset (durable name) → AssetVersion (immutable
 * geometry) → Instance (placement in one project) → BlueprintRevision (frozen).
 */
export const DOMAIN_SCHEMA_VERSION = 1;

export interface Provenance {
  /** Free text author name as entered by the user. */
  readonly author: string;
  /** Where the geometry came from: file name, URL or "eigener Entwurf". */
  readonly source: string;
  /** Usage terms; "ungeklärt" is valid and must stay visible. */
  readonly license: string;
}

export interface Asset {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly provenance: Provenance;
  readonly archived: boolean;
  /** Synthetic sample content shipped with the app. */
  readonly demo: boolean;
  /** Ordered version ids, oldest first. Versions are never removed while referenced. */
  readonly versionIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Connector on the boundary of an asset, in local boundary coordinates.
 * Validation and snapping live in connectors.ts (block "Anschlüsse/Snap").
 */
export interface Connector {
  readonly id: string;
  /** Boundary point on a face of the asset bounds (not a cell minimum). */
  readonly position: Vec3;
  /** Outward unit axis vector of the face. */
  readonly normal: Vec3;
  /** Unit axis vector orthogonal to normal; usually [0,1,0]. */
  readonly up: Vec3;
  /** Semantic kind, e.g. "wall_joint". Only equal types connect. */
  readonly type: string;
  /** Cross-section profile, e.g. "wall_2x9". Only equal profiles connect. */
  readonly profile: string;
  /** Maximum simultaneous links; default 1. */
  readonly maxLinks?: number;
}

export type AssetSourceFormat = 'schem-v3' | 'voxel-json' | 'demo' | 'crop' | 'composition';

export interface AssetVersionSource {
  readonly format: AssetSourceFormat;
  readonly fileName?: string;
  /** SHA-256 of the original file bytes when a file was imported. */
  readonly originalSha256?: string;
  readonly dataVersion?: number;
}

export interface AssetVersion {
  readonly schemaVersion: 1;
  /** Content address: "av_" + SHA-256 over assetId, label, payloadHash and connectors. */
  readonly id: string;
  readonly assetId: string;
  readonly label: string;
  /** SHA-256 of the canonical payload JSON. Recomputed on restore. */
  readonly payloadHash: string;
  readonly payload: VoxelPayload;
  readonly connectors: readonly Connector[];
  readonly source: AssetVersionSource;
  readonly createdAt: string;
}

export interface Instance {
  readonly id: string;
  readonly name: string;
  /** Fixed version; never "latest". Updating is an explicit operation. */
  readonly assetVersionId: string;
  /** Discrete placement relative to the version payload pivot. */
  readonly transform: Transform;
  /**
   * Explicit, user chosen local override: this instance wins voxel conflicts
   * against non-override instances. Two override instances still conflict.
   */
  readonly override: boolean;
}

export interface ConnectorRef { readonly instanceId: string; readonly connectorId: string }
export interface ConnectorLink { readonly id: string; readonly a: ConnectorRef; readonly b: ConnectorRef }

/** Manual progress only; never an in-game measurement. Written by the guide block. */
export interface StepProgress {
  readonly status: 'done';
  /** Geometry hash of the step when it was ticked; mismatch ⇒ "prüfbedürftig". */
  readonly geometryHash: string;
  readonly at: string;
}

export interface BlueprintRevision {
  readonly id: string;
  readonly number: number;
  readonly comment: string;
  readonly createdAt: string;
  readonly instances: readonly Instance[];
  readonly links: readonly ConnectorLink[];
}

export interface Project {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Explicit target profile id; instances with other profiles are reported. */
  readonly profileId: string;
  /** Monotonic storage revision used for optimistic concurrency (baseRevision). */
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly instances: readonly Instance[];
  readonly links: readonly ConnectorLink[];
  readonly progress: Readonly<Record<string, StepProgress>>;
  /** Frozen revisions, oldest first. */
  readonly revisions: readonly BlueprintRevision[];
}

export class DomainError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = 'DomainError'; }
}
