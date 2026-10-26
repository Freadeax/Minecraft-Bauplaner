/** JSON-safe canonical interchange contract. All coordinates are cell boundaries. */
export type Vec3 = readonly [number, number, number];
export interface Bounds { readonly min: Vec3; readonly maxExclusive: Vec3 }
export interface BlockState {
  readonly id: string;
  readonly properties: Readonly<Record<string, string>>;
}
export type NbtType = 'byte' | 'short' | 'int' | 'long' | 'float' | 'double' |
  'string' | 'byteArray' | 'intArray' | 'longArray' | 'list' | 'compound';
export type NbtTag =
  | { readonly type: 'byte' | 'short' | 'int' | 'float' | 'double'; readonly value: number }
  | { readonly type: 'long' | 'string'; readonly value: string }
  | { readonly type: 'byteArray' | 'intArray'; readonly value: readonly number[] }
  | { readonly type: 'longArray'; readonly value: readonly string[] }
  | { readonly type: 'list'; readonly elementType: NbtType | 'end'; readonly value: readonly NbtTag[] }
  | { readonly type: 'compound'; readonly value: Readonly<Record<string, NbtTag>> };
export type Cell =
  | { readonly position: Vec3; readonly kind: 'block' | 'air'; readonly paletteIndex: number }
  | { readonly position: Vec3; readonly kind: 'erase' };
export interface BlockEntity { readonly position: Vec3; readonly data: NbtTag }
export interface VoxelPayload {
  readonly schemaVersion: 1;
  /** Explicit application profile identifier, not a compatibility claim. */
  readonly profileId: string;
  readonly bounds: Bounds;
  readonly pivot: Vec3;
  readonly sourceOrigin: Vec3;
  readonly palette: readonly BlockState[];
  /** Sparse selected cells. Missing cells are unselected, never implicitly air. */
  readonly cells: readonly Cell[];
  readonly blockEntities: readonly BlockEntity[];
}
export interface Transform {
  readonly position: Vec3;
  readonly quarterTurns: 0 | 1 | 2 | 3;
  readonly mirrorX: boolean;
}
export interface Limits {
  readonly maxCells: number;
  readonly maxPalette: number;
  readonly maxVolume: number;
  readonly maxNbtDepth: number;
  readonly maxNbtNodes: number;
  readonly maxStringLength: number;
}
