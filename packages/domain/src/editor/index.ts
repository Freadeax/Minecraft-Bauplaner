export { AIR_VALUE, ERASE_VALUE, MAX_EDIT_CELLS, MAX_DRAFT_CELLS, EMPTY_DRAFT_HISTORY, posKey, keyPos, blockValue, sameSlot, payloadCells, createDraft, cellAt, draftCellCount,
  applyEdit, executeEdit, undoEdit, redoEdit, draftEntries, summarizeDraft, materializeDraft } from './draft.js';
export type { CellValue, CellSlot, CellChange, Edit, Draft, DraftHistory, DraftSummary } from './draft.js';
export { BOX_SHAPE_LABEL, boxBounds, boxSize, boxVolume, inBox, setCells, boxEdit, sphereEdit, cylinderEdit, lineEdit, carryProperties, replaceEdit, countMatches, floodEdit,
  rotateCellEdit, copyBox, entitiesRelative, transformClipboard, pasteEdit, moveBoxEdit, draftBounds } from './tools.js';
export type { Box, Corner, BoxShape, PropertySchema, SchemaLookup, ReplaceQuery, ClipCell, Clipboard, ClipTransformResult } from './tools.js';
export { EDITOR_PROVENANCE, commitDraftAsVersion, commitDraftAsNewAsset, inverseRotation, localCell, planProjectEdit, commitProjectEdit } from './commit.js';
export type { CommitWarning, VersionCommit, ProjectEditTarget, InstanceEditPlan, ProjectEditPlan, ProjectCommit } from './commit.js';
export { BLOCK_PALETTE_VERSION, BLOCK_CATEGORY_LABEL, blockSchema, defaultProperties, defaultState, checkProperties, blockLabel, blockCategory, paletteEntries, searchPalette } from './blocks.js';
export type { BlockCategory, PaletteEntry } from './blocks.js';
export { PATTERN_KIND_LABEL, GRADIENT_AXIS_LABEL, PATTERN_PRESETS, cellNoise, editExtent, validatePattern, patternAt, paintEdit, replacePatternEdit, patternShares } from './patterns.js';
export type { Pattern, PatternKind, PatternValue, PatternEntry, PatternAxis, GradientAxis, PatternExtent, PatternPreset } from './patterns.js';
export { ARCH_STYLE_LABEL, archEdit, pyramidEdit, coneEdit, wallLineEdit } from './shapes.js';
export type { ArchStyle, ArchOptions } from './shapes.js';
export { settleEdit } from './settle.js';
export { STENCIL_TAG, BUILTIN_STENCILS, clipboardFromPayload, draftFromClipboard } from './stencils.js';
export type { Stencil } from './stencils.js';
export { NO_SYMMETRY, symmetryActive, validateSymmetry, symmetryGroup, symmetryImage, symmetricEdit, centreOf, symmetryLabel } from './symmetry.js';
export type { Symmetry, SymmetricResult } from './symmetry.js';
export { CURVE_PROFILE_LABEL, curveSamples, curveCells, curveEdit, curveLength } from './curves.js';
export type { CurveProfile, CurveOptions } from './curves.js';
export { NATURAL_GROUND, SURFACE_FACES_LABEL, erodeEdit, dilateEdit, smoothEdit, overlayEdit, naturalizeEdit, surfaceCells, paintSurfaceEdit } from './sculpt.js';
export type { ErodeOptions, DilateOptions, SmoothOptions, OverlayOptions, NaturalizeOptions, SurfaceFaces } from './sculpt.js';
export { IMAGE_ORIENTATION_LABEL, MAX_IMAGE_SIDE, hexToRgb, rgbToHex, rgbToLab, deltaE, similarBlocks, colorGradient, imageToBlocks, valueOf as colorCandidateValue } from './colorMatch.js';
export type { Rgb, Lab, ColorCandidate, Face, PixelImage, ImageOrientation, ImageOptions } from './colorMatch.js';
export { MAGIC_MODE_LABEL, FACE_DIRECTION_LABEL, FACE_DIRECTION_VECTOR, blockFamily, magicSelect, sortKeys, regionBounds, boxRegion, growRegion, shrinkRegion, fitBox, resizeBox, clipEdit,
  copyRegion, clearRegionEdit, clearBoxEdit, fillRegionEdit, moveRegionEdit, stackEdit, extrudeEdit } from './region.js';
export type { Region, MagicMode, MagicOptions, StackOptions, FaceDirection } from './region.js';
export { TORUS_AXIS_LABEL, ellipsoidEdit, torusEdit, helixEdit } from './forms.js';
export type { TorusAxis, HelixOptions } from './forms.js';
