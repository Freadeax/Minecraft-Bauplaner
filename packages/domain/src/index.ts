export type * from './types.js';
export { DomainError, DOMAIN_SCHEMA_VERSION } from './types.js';
export { canonicalJson, sha256Hex, quickHash, newId } from './hash.js';
export { createAsset, addAssetVersion, verifyAssetVersion, updateAssetMeta, cropPayload, searchAssets, payloadHash, checkConnectorShape, deepFreeze } from './library.js';
export type { NewAssetInput, NewVersionInput, AssetQuery } from './library.js';
export { createProject, applyOperation, execute, undo, redo, newInstance, freezeRevision, describeOperation, rotateInPlace, checkTransform, EMPTY_HISTORY } from './project.js';
export type { Operation, History, HistoryEntry } from './project.js';
export { resolveProject, positionKey } from './compose.js';
export type { Resolution, PlacedInstance, VoxelConflict, ConflictKind, CompositionIssue } from './compose.js';
export { createSampleLibrary, sampleTowerPayload, sampleWallPayload, sampleGatePayload, SAMPLE_PROFILE, SAMPLE_FACETS } from './samples.js';
export type { SampleLibrary } from './samples.js';
export { buildGuide, evaluateProgress, tickStep, untickStep, tickSteps, untickSteps, assertGuideAcyclic, phaseOf, hangsOnly, PHASE_ORDER, PHASE_LABEL } from './guide.js';
export type { Guide, GuideStep, GuideProgress, StepMaterial, StepPhase, StepStatus } from './guide.js';
export { revisionForExport, resolveRevision, suggestDataVersion, dataVersionFromProfile } from './revisionExport.js';
export { computeMaterials, materialsForResolution, materialsForParts, itemsForCell, stackSizeOf, formatStacks, materialsToCsv, MATERIAL_CATALOG_VERSION, SHULKER_SLOTS } from './materials.js';
export type { MaterialReport, MaterialScope, ItemLine, ItemSource, ItemRule, UnresolvedLine, UnresolvedReason, StateCount, MaterialTotals, Confidence, MaterialOptions } from './materials.js';
export { createBackup, readBackup, planRestore, buildRestore, backupFileName, checkSchemaVersion, checkProjectRecord, checkAssetRecord, referencedVersionIds, toBase64, fromBase64, BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_FORMAT_VERSION_LIBRARY, BACKUP_FORMAT_VERSION_PACKED, serializeBackup, MAX_BACKUP_BYTES } from './backup.js';
export type { OriginalFile, Backup, BackupFile, BackupSource, RestoreTarget, RestorePlan, ProjectPlan, AssetPlan, ProjectChoice, RestoreWrite, LibraryRecordPlan } from './backup.js';
export { FACES, faceOf, anchorCells, capacityOf, validateConnectors, transformConnector, placedConnectors, connectorsMate, handednessFits, linkUsage, checkLinks, findSnapCandidates, snapOperation, linkOperation, unlinkedMates, suggestConnector, placementBounds, nearestSnap, DRAG_SNAP_RADIUS } from './connectors.js';
export type { FaceName, ConnectorIssue, PlacedConnector, LinkState, LinkStatus, SnapCandidate, SnapQuery } from './connectors.js';
export { inspectCell } from './inspect.js';
export type { CellInspection, CellSource } from './inspect.js';
export { checkScan, compareBlock, ignoredProperties, scanTarget, confirmedUnticked, tickedButNotBuilt, tickConfirmed, GAME_STATUS_LABEL, VERDICT_LABEL } from './gameCheck.js';
export type { GameCheck, StepCheck, CellDeviation, CellVerdict, GameStepStatus, ScanTarget, VerdictCounts } from './gameCheck.js';
export { FACETS, CATALOG_VERSION, BUILD_TIME_MODEL, MATERIAL_GROUP_LABEL, SIZE_CLASS_LABEL, BLOCK_CLASS_LABEL, blockClassOf, SORT_LABEL, facetLabel, facetTags, facetsOf, plainTags, withFacets, FAMILY_PREFIX, familyOf, familyMembers, BASIS_PREFIX, basisOf, variantGroup, STAGES, STAGE_LABEL, STAGE_HINT, STAGE_RULES, stageOf, stageIndex, progressionOf, materialGroupOf, sizeClassOf, needsOrientation, analyzeVersion, buildCatalog, queryCatalog, facetCounts, fitsPlot, materialOverlap, projectContext, suggestForProject, similarEntries } from './catalog.js';
export type { Stage, FacetKey, BuildingFacets, FacetDefinition, BlockClass, MaterialGroup, Factor, BuildingMetrics, CatalogEntry, CatalogQuery, SortKey, Plot, ProjectContext, Suggestion, Similar } from './catalog.js';
export { createBuildingLibrary, BUILDING_SPECS, PATH_PROFILE, specTags, familyLabel, buildingInfo } from './buildings.js';
export type { BuildingSpec, BuildingLibrary, BuildingInfo, Inspiration } from './buildings.js';
export { resolveRecipes, recipesForMaterials, chooseRecipe, recipesFor, rawSource, assertRecipeCatalog, recipesToCsv, RECIPES, RECIPE_TAGS, RECIPE_CATALOG_VERSION } from './recipes.js';
export type { Recipe, Ingredient, Station, RecipeMethod, RecipeOptions, RecipeReport, RecipeStep, BaseLine, BaseKind, TagChoice, TagDefinition } from './recipes.js';
export { ENSEMBLES, memberTransform, latestVersions, missingMembers, createEnsembleProject, ensemblesWith } from './ensembles.js';
export type { Ensemble, EnsembleMember } from './ensembles.js';
export { MATERIAL_SETS, MATERIAL_KIND_LABEL, materialSet, materialOf, detectMaterials, swapMaterials, swapLabel } from './variants.js';
export type { MaterialSet, MaterialKind, MaterialUse, MaterialSwap, SwapResult } from './variants.js';
export { SITE_SCHEMA_VERSION, DEFAULT_RESERVATION_DEPTH, MAX_RESERVATION_DEPTH, emptySite, siteOf, checkSite, siteOperation, addSection, updateSection, removeSection, moveSection, setStock, toggleResolvedStock, setPace, reservationKey, setReservation, pruneSite, sectionOfStep, SECTION_PRESET_LABEL, suggestSections, checkSections, gatherRuleFor, GATHER_BUILDING_IDS, planSite, RESERVATION_STATE_LABEL, profileSize, reservationCells, reservationsFor } from './site.js';
export type { SitePlan, SiteSection, SectionMember, ReservationSetting, SectionPreset, SectionIssue, GatherRule, GatherLine, BuildItemLine, SectionPlan, SiteOverview, ReservationState, Reservation } from './site.js';
export { checkIntegrity, INTEGRITY_SEVERITY_LABEL } from './integrity.js';
export type { IntegrityReport, IntegrityFinding, IntegritySeverity, IntegrityCode, IntegritySource } from './integrity.js';
export { GENERATORS, GENERATOR_TAG, GENERATOR_TAG_PREFIX, GENERATOR_PROVENANCE, generatorById, runGenerator, presetValues, createGeneratedAsset, addGeneratedVersion, generatorSourceOf, checkReproducible,
  createCompoundProject, COMPOUNDS, compoundById, normalizeParams, defaultsOf, describeParams, rollParams, visible, STYLES, styleOf } from './generators/index.js';
export type { Generator, GeneratedBuilding, Preset, GeneratorRun, ReproCheck, ReproStatus, Compound, CompoundPart, CompoundBuild, ParamDef, ParamValue, ParamValues, ParamIssue, IntParam, ChoiceParam, BoolParam, Style } from './generators/index.js';
export { buildLiveMapUrl, checkLiveMapTarget, checkLiveMapPosition, createLiveMapMarkerFile, readLiveMapMarkerFile } from './livemap.js';
export type { LiveMapTarget, LiveMapPosition, LiveMapMarker, LiveMapMarkerFile } from './livemap.js';
export { WORLD_SCHEMA_VERSION, WORLD_XZ_LIMIT, WORLD_Y_MIN, WORLD_Y_MAX, DEFAULT_WORLD_Y, PLACEMENT_GAP, MAP_MAX_CELLS, DIMENSIONS, dimensionLabel, checkWorldPlacement, createPlacement, worldOf, worldOperation,
  toWorld, translateBounds, chunkOf, regionOf, suggestPlacement, MAP_SKIP_LABEL, buildWorldMap, footprintNeighbours, topViews, placementsJson, mapMarkers, liveMapPositionOf, liveMapTemplateFromLink, TERRAIN_NOTE } from './worldmap.js';
export type { Dimension, WorldPlacement, CellProgress, MapSkip, MapEntry, MapCollision, WorldMapView, WorldMapOptions, TopView, LiveMapLinkKind, LiveMapLinkTemplate } from './worldmap.js';
export { LIBRARY_RECORD_SCHEMA, MAX_COLLECTION_DEPTH, MAX_COLLECTION_ITEMS, MAX_TEMPLATE_MEMBERS, MAX_TEMPLATE_HISTORY, createCollection, updateCollection, itemKey, hasItem, addToCollection, removeFromCollection, moveCollectionItem, setItemNote, pinItemVersion,
  ancestorsOf, moveProblem, moveCollection, collectionDeletion, collectionTree, flattenTree, groupByCategory, collectionCategories, resolveCollection, collectionsWith, assetIdsIn, pinnedVersionIds,
  createTemplate, editTemplate, restoreTemplateSnapshot, archiveTemplate, duplicateTemplate, templateVersionIds, missingTemplateVersions, templateBodyFromProject, templateFromProject, templateFromEnsemble, templateFromGenerator, createTemplateProject, describeTemplate,
  checkCollectionRecord, checkTemplateRecord, LibraryRecordConflictError, nextLibraryRevision, checkLibraryBatch, sameLibraryRecord } from './collections.js';
export type { Collection, CollectionItem, CollectionItemKind, CollectionNode, ItemState, ResolvedItem, LibraryLookup, LibraryTemplate, TemplateBody, TemplateKind, TemplateMember, TemplateOrigin, TemplateSnapshot } from './collections.js';
export * from './editor/index.js';
export { groupOperation } from './project.js';
export type { GroupAction } from './project.js';
export { ANLAGEN, ANLAGE_SCHEMA_VERSION, SHIPPED_LABEL, MIN_SPACING, MAX_SPACING, MAX_SHIFT, DEFAULT_ROW_WIDTH, PATH_MODULES, anlageById, anlageForTheme, themeOfAnlage, normalizeChoices, planAnlage, draftAnlage, previewAnlage,
  createAnlageProject, anlageIntoProject, besideOffset, swapCandidates, pinnedVersionIdsOf } from './anlagen.js';
export type { Anlage, AnlageDistrict, AnlageSlot, AnlageSide, AnlagePathKind, AnlageChoices, AnlageLibrary, SlotStatus, SlotState, Footprint, AnlagePlacement, DistrictLayout, AnlagePlan, AnlageDraft, SpacingIssue, AnlagePreview, SwapCandidate } from './anlagen.js';
export { checkTerrain, terrainBox, REPLACEABLE_IDS, FLUID_IDS, NATURAL_TERRAIN_IDS, TERRAIN_VERDICT_LABEL, FOOT_VERDICT_LABEL, TERRAIN_DEPTH } from './terrain.js';
export type { TerrainGrid, TerrainCheck, TerrainOptions, TerrainVerdict, FootVerdict } from './terrain.js';
export { MAX_SNAPSHOTS, snapshotFingerprint, checkSnapshots, snapshotsOf, latestSnapshot, freezeSection, deleteSnapshot, compareSnapshot, planSnapshotRestore, snapshotProjectContent } from './sectionSnapshots.js';
export type { SectionSnapshot, SnapshotStep, FreezeInput, SnapshotChange, SnapshotChangeKind, SnapshotComparison, SnapshotRestorePlan } from './sectionSnapshots.js';
export { BACKUP_LEDGER_SCHEMA, MAX_BACKUP_RECEIPTS, BACKUP_REMIND_AFTER_DAYS, BACKUP_DISCLAIMER, emptyLedger, checkBackupLedger, recordFingerprint, receiptForBackup, addReceipt, compareWithBackups, receiptForHash } from './backupStatus.js';
export type { BackupLedger, BackupReceipt, BackupReceiptKind, ReceiptEntry, CoverageState, CoverageLine, BackupStatus, CurrentData } from './backupStatus.js';
export { UPDATES_SCHEMA_VERSION, MAX_UPDATE_LOG, UPDATE_KIND_LABEL, UPDATE_STATUS_LABEL, PATCH_POLICY_LABEL, CONNECTOR_CHANGE_LABEL, emptyUpdates, updatesOf, checkUpdates, updateLogVersionIds, pruneUpdates, updatesOperation,
  latestReleaseId, isLocalPatch, patchBase, findUpdates, summarizeUpdates, rebasePatch, localLabel, diffVersions, pivotAligned, diffConnectors, prepareUpdate, freezeOperation, unfreezeOperation, returnChoice } from './updates.js';
export type { FrozenPin, UpdateKind, UpdateRecord, UpdateState, PatchPolicy, UpdateLibrary, InstanceUpdateStatus, InstanceUpdateInfo, UpdateSummary, PatchCell, PatchConflict, RebaseResult,
  ConnectorChange, ConnectorChangeKind, UpdateChoice, InstanceUpdatePlan, LinkChange, StepChange, MaterialChange, UpdatePlan, PreparedUpdate, PrepareOptions } from './updates.js';
export { anchorOf, anchorFromScan, sameAnchor, worldPos, cellLookup, stepRuns, stepRunsIn, runLabel, runCoords, stepText, packSteps, stockMap, packText, DEFAULT_PACE, PACE_LIMITS, checkPace, paceOf, stepWork, planSessions, progressByDay, sessionText, reworkList, REWORK_ACTION, gameCounts } from './buildRun.js';
export type { BuildAnchor, CellLookup, RunKind, StepRun, PackLine, PackSlot, PackBox, PackPlan, PaceSetting, BuildSession, SessionPlan, DayProgress, ReworkItem, ReworkGroup, GameCounts } from './buildRun.js';
export { SURVEY_SCHEMA_VERSION, SURVEY_UNKNOWN, SURVEY_MAX_SIDE, SURVEY_MAX_COLUMNS, SURVEY_MEDIA_TYPE, EARTHWORK_NOTE, checkSurveyArea, checkTerrainReference, createSurvey, encodeSurvey, decodeSurvey,
  surveyStats, surveyFile, columnAt, surveyCovers, estimateEarthwork, columnBases, surveyDisplayCells } from './terrainSurvey.js';
export type { SurveyArea, TerrainSurvey, ProjectTerrainReference, SurveyColumnsInput, SurveyColumn, ColumnBase, EarthworkEstimate, SurveyDisplay } from './terrainSurvey.js';
export { DESIGN_SCHEMA_VERSION, DESIGN_MEDIA_TYPE, NO_WATER, SURFACE_STYLES, BRUSH_LABEL, DEFAULT_AUTO_PAINT, DESIGN_MAX_CELLS, DESIGN_NOTE, styleById, fillerFor, columnHash, valueNoise,
  checkTerrainDesignReference, heightLimits, flatSurvey, designFromSurvey, cloneDesign, encodeDesign, decodeDesign, designFile, designMatchesBase, brushWeight, slopeAt, paintColumn,
  applyBrush, strokePoints, floodWater, pathLine, layPath, autoPaint, gradeFootprints, resetToBase, compareDesign, designPayload, designedSurvey } from './terrainDesign.js';
export type { DesignBase, TerrainDesign, ProjectTerrainDesignReference, SurfaceStyle, BrushTool, Falloff, Brush, PaintFilter, FloodResult, PathOptions, PathReport, AutoPaintRules,
  GradeResult, DesignStats, DesignBlocks } from './terrainDesign.js';
export { isGroundId, isTreePartId, SURFACE_SKIP_IDS } from './terrain.js';
export { entranceOf, turnedSide, turnsToFace, facesSide, SIDE_LABEL } from './entrance.js';
export type { Entrance, Side } from './entrance.js';
export { fitAnlageToTerrain, findTerrainSpot, placementColumns, TERRAIN_MODE_LABEL, STEP_LIMIT, SLOPE_LIMIT } from './anlagenTerrain.js';
export type { TerrainMode, AnlageTerrainInput, UnitTerrain, AnlageTerrainFit, TerrainSpot } from './anlagenTerrain.js';
export { checkPlacement, settlePayload, payloadLookup, needText, changedKeys, PLACEMENT_LABEL } from './placement.js';
export type { PlacementKind, PlacementIssue, PlacementAid, PlacementReport, PlacementOptions, SettleResult } from './placement.js';
export { packVersion, unpackVersion, unpackVersionOrDamaged, packVersionForFile, unpackVersionFromFile, isPackedVersionRecord, cellStorageEstimate } from './versionStorage.js';
export type { StoredPayload, PackedVersionRecord, PackedVersionFileRecord, StoredVersionRecord } from './versionStorage.js';
export { buildPlanGraph, whereUsed, projectEdges, assetEdges, versionEdges, collectionEdges, templateEdges, projectVersionIds, PLAN_ROLE_LABEL, PLAN_KIND_LABEL } from './planGraph.js';
export type { PlanGraph, PlanEdge, PlanNodeKind, PlanNodeRef, PlanRole, PlanSource, UsageGroup } from './planGraph.js';
export { WORLD_PLAN_SCHEMA_VERSION, WORLD_PLAN_MAX_ITEMS, WORLD_PATH_MAX_POINTS, WORLD_SITE_MAX_SIDE, WORLD_POINT_TYPES, WORLD_PATH_STYLES, emptyWorldPlan, checkWorldItem, checkWorldPlan,
  describeWorldPlanOp, applyWorldPlanOp, pointTypeLabel, pathStyleOf, newWorldItemId, itemsOf, siteFromCorners, snapSiteToChunks, pathColumns, pathLength, itemBounds, itemAt, moveItem,
  sitesTouching, worldPlanSummary } from './worldPlan.js';
export type { WorldPlan, WorldItem, WorldSite, WorldPath, WorldPoint, WorldPointType, WorldPathStyle, WorldPlanOp } from './worldPlan.js';
export { LIVE_PROTOCOL, LIVE_DEFAULT_PORT, LIVE_TOKEN_HEADER, LIVE_MAX_CHUNKS_PER_REQUEST, LIVE_MAX_RUNS, LIVE_MAX_MARKS, LIVE_MAX_PLAN_BYTES, LIVE_ALLOWED_ORIGINS, readLiveHello, readLivePairing,
  readLiveStatus, readLiveChunks, classifyRuns, chunkColumns, wantedChunks, chunkQuery, liveSurvey, HOLOGRAM_MATCH_LABEL, hologramProject, compareHologram, liveShare, playerBlock,
  originFromPlayer, planUploadQuery, marksBody, liveBaseUrl, originAllowed } from './liveLink.js';
export type { LiveHello, LivePlayer, LiveWorld, LiveCounts, LivePlacement, LiveHologram, LiveStatus, LiveChunk, LiveChunks, LiveColumn, LiveChunkColumns, HologramMatch } from './liveLink.js';
