export type * from './core/types.js';
export { DomainError, DOMAIN_SCHEMA_VERSION } from './core/types.js';
export { canonicalJson, sha256Hex, quickHash, newId } from './core/hash.js';
export { createAsset, addAssetVersion, verifyAssetVersion, updateAssetMeta, cropPayload, searchAssets, payloadHash, rememberPayloadHash, checkConnectorShape, deepFreeze } from './catalog/library.js';
export type { NewAssetInput, NewVersionInput, AssetQuery } from './catalog/library.js';
export { createProject, applyOperation, execute, undo, redo, undoKeepingTeam, redoKeepingTeam, newInstance, freezeRevision, describeOperation, rotateInPlace, checkTransform, EMPTY_HISTORY } from './core/project.js';
export type { Operation, History, HistoryEntry } from './core/project.js';
export { resolveProject, positionKey } from './core/compose.js';
export type { Resolution, PlacedInstance, VoxelConflict, ConflictKind, CompositionIssue } from './core/compose.js';
export { createSampleLibrary, sampleTowerPayload, sampleWallPayload, sampleGatePayload, SAMPLE_PROFILE, SAMPLE_FACETS } from './core/samples.js';
export type { SampleLibrary } from './core/samples.js';
export { buildGuide, evaluateProgress, tickStep, untickStep, tickSteps, untickSteps, assertGuideAcyclic, phaseOf, hangsOnly, PHASE_ORDER, PHASE_LABEL } from './building/guide.js';
export type { Guide, GuideStep, GuideProgress, StepMaterial, StepPhase, StepStatus, FurnishItem } from './building/guide.js';
export { revisionForExport, resolveRevision, suggestDataVersion, dataVersionFromProfile } from './versions/revisionExport.js';
export { computeMaterials, materialsForResolution, materialsForParts, itemsForCell, stackSizeOf, formatStacks, materialsToCsv, MATERIAL_CATALOG_VERSION, SHULKER_SLOTS, containerLabel } from './materials/materials.js';
export type { MaterialReport, MaterialScope, ItemLine, ItemSource, ItemRule, UnresolvedLine, UnresolvedReason, StateCount, MaterialTotals, Confidence, MaterialOptions, ContentLine } from './materials/materials.js';
export { createBackup, readBackup, planRestore, buildRestore, backupFileName, checkSchemaVersion, checkProjectRecord, checkAssetRecord, referencedVersionIds, toBase64, fromBase64, BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_FORMAT_VERSION_LIBRARY, BACKUP_FORMAT_VERSION_PACKED, serializeBackup, MAX_BACKUP_BYTES } from './data/backup.js';
export type { OriginalFile, Backup, BackupFile, BackupSource, RestoreTarget, RestorePlan, ProjectPlan, AssetPlan, ProjectChoice, RestoreWrite, LibraryRecordPlan } from './data/backup.js';
export { FACES, faceOf, anchorCells, capacityOf, validateConnectors, transformConnector, placedConnectors, connectorsMate, handednessFits, linkUsage, checkLinks, findSnapCandidates, snapOperation, linkOperation, unlinkedMates, suggestConnector, placementBounds, nearestSnap, DRAG_SNAP_RADIUS } from './core/connectors.js';
export type { FaceName, ConnectorIssue, PlacedConnector, LinkState, LinkStatus, SnapCandidate, SnapQuery } from './core/connectors.js';
export { inspectCell } from './core/inspect.js';
export type { CellInspection, CellSource } from './core/inspect.js';
export { checkScan, compareBlock, ignoredProperties, scanTarget, confirmedUnticked, tickedButNotBuilt, tickConfirmed, GAME_STATUS_LABEL, VERDICT_LABEL, layerProgress, stepStatusCounts, deviationColumns } from './building/gameCheck.js';
export type { GameCheck, StepCheck, CellDeviation, CellVerdict, GameStepStatus, ScanTarget, VerdictCounts, LayerProgress, DeviationColumn } from './building/gameCheck.js';
export { FACETS, CATALOG_VERSION, BUILD_TIME_MODEL, MATERIAL_GROUP_LABEL, SIZE_CLASS_LABEL, BLOCK_CLASS_LABEL, blockClassOf, SORT_LABEL, facetLabel, facetTags, facetsOf, plainTags, withFacets, FAMILY_PREFIX, familyOf, familyMembers, BASIS_PREFIX, basisOf, variantGroup, STAGES, STAGE_LABEL, STAGE_HINT, STAGE_RULES, stageOf, stageIndex, progressionOf, materialGroupOf, sizeClassOf, needsOrientation, analyzeVersion, buildCatalog, queryCatalog, facetCounts, fitsPlot, materialOverlap, projectContext, suggestForProject, similarEntries } from './catalog/catalog.js';
export type { Stage, FacetKey, BuildingFacets, FacetDefinition, BlockClass, MaterialGroup, Factor, BuildingMetrics, CatalogEntry, CatalogQuery, SortKey, Plot, ProjectContext, Suggestion, Similar } from './catalog/catalog.js';
export { createBuildingLibrary, BUILDING_SPECS, PATH_PROFILE, specTags, familyLabel, buildingInfo } from './catalog/buildings.js';
export type { BuildingSpec, BuildingLibrary, BuildingInfo, Inspiration } from './catalog/buildings.js';
export { CONTRIBUTION_FORMAT, CONTRIBUTION_FORMAT_VERSION, CONTRIBUTION_PREFIX, CONTRIBUTION_TAG, CONTRIBUTION_FILE_SUFFIX, CONTRIBUTION_LICENSES, CONTRIBUTION_ID_PATTERN, CONTRIBUTION_LABEL,
  MAX_CONTRIBUTION_CELLS, MAX_CONTRIBUTION_BYTES, LARGE_CONTRIBUTION_BYTES, MAX_PREVIEW_BYTES,
  contributionIdFor, isContributionId, checkContributionMeta, contributionWarnings, createContribution, readContribution, contributionTags, contributionAsset } from './catalog/contribution.js';
export type { ContributionMeta, ContributionFile, ContributionInput, ContributionLicense, CheckedContribution } from './catalog/contribution.js';
export { createCommunityLibrary, communityEntry } from './catalog/community/library.js';
export type { CommunityLibrary } from './catalog/community/library.js';
export { COMMUNITY_ENTRIES } from './catalog/community/registry.js';
export type { CommunityEntry } from './catalog/community/types.js';
export { resolveRecipes, recipesForMaterials, chooseRecipe, recipesFor, rawSource, assertRecipeCatalog, recipesToCsv, RECIPES, RECIPE_TAGS, RECIPE_CATALOG_VERSION, recipeAlternatives, fuelBalance, BALANCE_FUELS } from './materials/recipes.js';
export { profileRecipes, profileRecipesFor, matchProfileRecipe, unknownRecipeItems, PROFILE_RECIPE_SOURCE } from './materials/recipeProfile.js';
export type { ProfileRecipe, ProfileIngredient, ProfileStation } from './materials/recipeProfile.js';
export type { Recipe, Ingredient, Station, RecipeMethod, RecipeOptions, RecipeReport, RecipeStep, BaseLine, BaseKind, TagChoice, TagDefinition, FuelBalance, RecipePrefs } from './materials/recipes.js';
export { ENSEMBLES, memberTransform, latestVersions, missingMembers, createEnsembleProject, ensemblesWith } from './catalog/ensembles.js';
export type { Ensemble, EnsembleMember } from './catalog/ensembles.js';
export { MATERIAL_SETS, MATERIAL_KIND_LABEL, materialSet, materialOf, detectMaterials, swapMaterials, swapLabel } from './materials/variants.js';
export type { MaterialSet, MaterialKind, MaterialUse, MaterialSwap, SwapResult } from './materials/variants.js';
export { SITE_SCHEMA_VERSION, DEFAULT_RESERVATION_DEPTH, MAX_RESERVATION_DEPTH, emptySite, siteOf, checkSite, siteOperation, recipeOptionsOf, setRecipePrefs, addSection, updateSection, removeSection, moveSection, setStock, toggleResolvedStock, setPace, reservationKey, setReservation, pruneSite, sectionOfStep, SECTION_PRESET_LABEL, suggestSections, checkSections, gatherRuleFor, GATHER_BUILDING_IDS, planSite, RESERVATION_STATE_LABEL, profileSize, reservationCells, reservationsFor } from './building/site.js';
export type { SitePlan, SiteSection, SectionMember, ReservationSetting, SectionPreset, SectionIssue, GatherRule, GatherLine, BuildItemLine, SectionPlan, SiteOverview, ReservationState, Reservation } from './building/site.js';
export { checkIntegrity, INTEGRITY_SEVERITY_LABEL } from './data/integrity.js';
export type { IntegrityReport, IntegrityFinding, IntegritySeverity, IntegrityCode, IntegritySource } from './data/integrity.js';
export { GENERATORS, GENERATOR_TAG, GENERATOR_TAG_PREFIX, GENERATOR_PROVENANCE, generatorById, runGenerator, presetValues, createGeneratedAsset, addGeneratedVersion, generatorSourceOf, checkReproducible,
  createCompoundProject, COMPOUNDS, compoundById, normalizeParams, defaultsOf, describeParams, rollParams, visible, STYLES, styleOf } from './catalog/generators/index.js';
export type { Generator, GeneratedBuilding, Preset, GeneratorRun, ReproCheck, ReproStatus, Compound, CompoundPart, CompoundBuild, ParamDef, ParamValue, ParamValues, ParamIssue, IntParam, ChoiceParam, BoolParam, Style } from './catalog/generators/index.js';
export { buildLiveMapUrl, checkLiveMapTarget, checkLiveMapPosition, createLiveMapMarkerFile, readLiveMapMarkerFile } from './world/livemap.js';
export type { LiveMapTarget, LiveMapPosition, LiveMapMarker, LiveMapMarkerFile } from './world/livemap.js';
export { WORLD_SCHEMA_VERSION, WORLD_XZ_LIMIT, WORLD_Y_MIN, WORLD_Y_MAX, DEFAULT_WORLD_Y, PLACEMENT_GAP, MAP_MAX_CELLS, DIMENSIONS, dimensionLabel, checkWorldPlacement, createPlacement, worldOf, worldOperation,
  toWorld, translateBounds, turnOf, isTurned, sameTurn, turnLabel, TURN_LABEL, turnVector, unturnVector, placeToWorld, worldToProject, turnBounds, placedBounds, turnState, turnPayload, withTurn, turnInPlace, chunkOf, regionOf, suggestPlacement, MAP_SKIP_LABEL, buildWorldMap, footprintNeighbours, topViews, placementsJson, mapMarkers, liveMapPositionOf, liveMapTemplateFromLink, TERRAIN_NOTE } from './world/worldmap.js';
export type { Dimension, WorldPlacement, PlacementTurns, PlacementTurn, CellProgress, MapSkip, MapEntry, MapCollision, WorldMapView, WorldMapOptions, TopView, LiveMapLinkKind, LiveMapLinkTemplate } from './world/worldmap.js';
export { LIBRARY_RECORD_SCHEMA, MAX_COLLECTION_DEPTH, MAX_COLLECTION_ITEMS, MAX_TEMPLATE_MEMBERS, MAX_TEMPLATE_HISTORY, createCollection, updateCollection, itemKey, hasItem, addToCollection, removeFromCollection, moveCollectionItem, setItemNote, pinItemVersion,
  ancestorsOf, moveProblem, moveCollection, collectionDeletion, collectionTree, flattenTree, groupByCategory, collectionCategories, resolveCollection, collectionsWith, assetIdsIn, pinnedVersionIds,
  createTemplate, editTemplate, restoreTemplateSnapshot, archiveTemplate, duplicateTemplate, templateVersionIds, missingTemplateVersions, templateBodyFromProject, templateFromProject, templateFromEnsemble, templateFromGenerator, createTemplateProject, describeTemplate,
  checkCollectionRecord, checkTemplateRecord, LibraryRecordConflictError, nextLibraryRevision, checkLibraryBatch, sameLibraryRecord } from './catalog/collections.js';
export type { Collection, CollectionItem, CollectionItemKind, CollectionNode, ItemState, ResolvedItem, LibraryLookup, LibraryTemplate, TemplateBody, TemplateKind, TemplateMember, TemplateOrigin, TemplateSnapshot } from './catalog/collections.js';
export * from './editor/index.js';
export { groupOperation } from './core/project.js';
export type { GroupAction } from './core/project.js';
export { ANLAGEN, ANLAGE_SCHEMA_VERSION, SHIPPED_LABEL, MIN_SPACING, MAX_SPACING, MAX_SHIFT, DEFAULT_ROW_WIDTH, PATH_MODULES, anlageById, anlageForTheme, themeOfAnlage, normalizeChoices, planAnlage, draftAnlage, previewAnlage,
  createAnlageProject, anlageIntoProject, besideOffset, swapCandidates, pinnedVersionIdsOf } from './base/anlagen.js';
export type { Anlage, AnlageDistrict, AnlageSlot, AnlageSide, AnlagePathKind, AnlageChoices, AnlageLibrary, SlotStatus, SlotState, Footprint, AnlagePlacement, DistrictLayout, AnlagePlan, AnlageDraft, SpacingIssue, AnlagePreview, SwapCandidate } from './base/anlagen.js';
export { checkTerrain, terrainBox, REPLACEABLE_IDS, FLUID_IDS, NATURAL_TERRAIN_IDS, TERRAIN_VERDICT_LABEL, FOOT_VERDICT_LABEL, TERRAIN_DEPTH } from './world/terrain.js';
export type { TerrainGrid, TerrainCheck, TerrainOptions, TerrainVerdict, FootVerdict } from './world/terrain.js';
export { MAX_SNAPSHOTS, snapshotFingerprint, checkSnapshots, snapshotsOf, latestSnapshot, freezeSection, deleteSnapshot, compareSnapshot, planSnapshotRestore, snapshotProjectContent } from './building/sectionSnapshots.js';
export type { SectionSnapshot, SnapshotStep, FreezeInput, SnapshotChange, SnapshotChangeKind, SnapshotComparison, SnapshotRestorePlan } from './building/sectionSnapshots.js';
export { BACKUP_LEDGER_SCHEMA, MAX_BACKUP_RECEIPTS, BACKUP_REMIND_AFTER_DAYS, BACKUP_DISCLAIMER, emptyLedger, checkBackupLedger, recordFingerprint, receiptForBackup, addReceipt, compareWithBackups, receiptForHash } from './data/backupStatus.js';
export type { BackupLedger, BackupReceipt, BackupReceiptKind, ReceiptEntry, CoverageState, CoverageLine, BackupStatus, CurrentData } from './data/backupStatus.js';
export { UPDATES_SCHEMA_VERSION, MAX_UPDATE_LOG, UPDATE_KIND_LABEL, UPDATE_STATUS_LABEL, PATCH_POLICY_LABEL, CONNECTOR_CHANGE_LABEL, emptyUpdates, updatesOf, checkUpdates, updateLogVersionIds, pruneUpdates, updatesOperation,
  latestReleaseId, isLocalPatch, patchBase, findUpdates, summarizeUpdates, rebasePatch, localLabel, diffVersions, pivotAligned, diffConnectors, prepareUpdate, freezeOperation, unfreezeOperation, returnChoice } from './versions/updates.js';
export type { FrozenPin, UpdateKind, UpdateRecord, UpdateState, PatchPolicy, UpdateLibrary, InstanceUpdateStatus, InstanceUpdateInfo, UpdateSummary, PatchCell, PatchConflict, RebaseResult,
  ConnectorChange, ConnectorChangeKind, UpdateChoice, InstanceUpdatePlan, LinkChange, StepChange, MaterialChange, UpdatePlan, PreparedUpdate, PrepareOptions } from './versions/updates.js';
export { anchorOf, anchorFromScan, sameAnchor, worldPos, cellLookup, stepRuns, stepRunsIn, runLabel, runCoords, stepText, packSteps, stockMap, packText, DEFAULT_PACE, PACE_LIMITS, checkPace, paceOf, stepWork, planSessions, progressByDay, sessionText, reworkList, REWORK_ACTION, gameCounts } from './building/buildRun.js';
export type { BuildAnchor, CellLookup, RunKind, StepRun, PackLine, PackSlot, PackBox, PackPlan, PaceSetting, BuildSession, SessionPlan, DayProgress, ReworkItem, ReworkGroup, GameCounts } from './building/buildRun.js';
export { SURVEY_SCHEMA_VERSION, SURVEY_UNKNOWN, SURVEY_MAX_SIDE, SURVEY_MAX_COLUMNS, SURVEY_MEDIA_TYPE, EARTHWORK_NOTE, checkSurveyArea, checkTerrainReference, createSurvey, encodeSurvey, decodeSurvey,
  surveyStats, surveyFile, columnAt, surveyCovers, estimateEarthwork, columnBases, surveyDisplayCells, biomeAt, biomeShares } from './world/terrainSurvey.js';
export type { SurveyArea, TerrainSurvey, ProjectTerrainReference, SurveyColumnsInput, SurveyColumn, ColumnBase, EarthworkEstimate, SurveyDisplay, SurveySource, SurveyBiomes } from './world/terrainSurvey.js';
export { LIVE_BOX_MAX_CELLS, LIVE_KNOWN_MAX_CHUNKS, readLiveTerrain, areaChunks, chunkBatches, readLiveKnown, knownQuery, terrainCoverage, surveyFromLiveTerrain, boxQuery, readLiveBox,
  styleForBiome, BIOME_LABEL, biomeLabel, paintByBiome } from './world/liveTerrain.js';
export type { LiveTerrainChunk, LiveTerrain, LiveKnown, TerrainCoverage, LiveBox } from './world/liveTerrain.js';
export { DESIGN_SCHEMA_VERSION, DESIGN_MEDIA_TYPE, NO_WATER, SURFACE_STYLES, BRUSH_LABEL, DEFAULT_AUTO_PAINT, DESIGN_MAX_CELLS, DESIGN_NOTE, styleById, fillerFor, columnHash, valueNoise,
  checkTerrainDesignReference, heightLimits, flatSurvey, designFromSurvey, cloneDesign, encodeDesign, decodeDesign, designFile, designMatchesBase, brushWeight, slopeAt, paintColumn,
  applyBrush, strokePoints, floodWater, pathLine, layPath, autoPaint, gradeFootprints, resetToBase, compareDesign, designPayload, designedSurvey,
  PATH_PLAIN, PATH_STAIR, PATH_SLAB, PATH_DECK, PATH_DECK_RAIL, PATH_DIRS, PATH_MATERIALS, PATH_STYLE_MATERIAL, pathMaterialById, hasPieces, risingDirs, pathPieceCells, layRamp, layPathCells, fortifyShore } from './world/terrainDesign.js';
export type { DesignBase, TerrainDesign, ProjectTerrainDesignReference, SurfaceStyle, BrushTool, Falloff, Brush, PaintFilter, FloodResult, PathOptions, PathReport, AutoPaintRules,
  GradeResult, DesignStats, DesignBlocks, DesignCell, PathMaterial, PathSteps, PathWater, RampOptions, RampReport, NetworkOptions } from './world/terrainDesign.js';
export { RAIN_LABEL, STAMP_LABEL, RIVER_BED_LABEL, erodeTerrain, stampShape, carveRiver, footprintMask, maskCount } from './world/terrainSculpt.js';
export type { SculptRegion, SculptMask, RainAmount, ErodeOptions, ErodeReport, StampShape, StampOptions, StampReport, RiverBed, RiverOptions, RiverReport } from './world/terrainSculpt.js';
export { MAX_SCATTER_LAYERS, MAX_SCATTER_ITEMS, EMPTY_SCATTER, checkScatterLayer, checkScatterPlan } from './world/terrainScatterPlan.js';
export type { ScatterPartRef, ScatterLayer, ScatterItem, ScatterPlan } from './world/terrainScatterPlan.js';
export { SCATTER_NEED_LABEL, SCATTER_GROUP_LABEL, SCATTER_MISS_LABEL, BUILTIN_SCATTER_PARTS, SCATTER_PRESETS, builtinScatterPart, stencilScatterPart, builtinResolver, newScatterLayer,
  addScatterPreset, groundFits, scatterLayers, clearScatterLayer, putScatterLayer, removeScatterLayer, addScatterItem, removeScatterItems, scatterCells, plannedSurvey, cloneScatter } from './world/terrainScatter.js';
export type { ScatterNeed, ScatterGroup, PartCell, ScatterPart, ScatterPartResolver, ScatterLayerInput, ScatterPreset, ScatterMiss, ScatterContext, ScatterRun, ScatterCells } from './world/terrainScatter.js';
export { isGroundId, isTreePartId, SURFACE_SKIP_IDS } from './world/terrain.js';
export { entranceOf, turnedSide, turnsToFace, facesSide, SIDE_LABEL } from './base/entrance.js';
export type { Entrance, Side } from './base/entrance.js';
export { fitAnlageToTerrain, findTerrainSpot, placementColumns, TERRAIN_MODE_LABEL, STEP_LIMIT, SLOPE_LIMIT } from './base/anlagenTerrain.js';
export type { TerrainMode, AnlageTerrainInput, UnitTerrain, AnlageTerrainFit, TerrainSpot } from './base/anlagenTerrain.js';
export { checkPlacement, settlePayload, payloadLookup, needText, changedKeys, PLACEMENT_LABEL } from './core/placement.js';
export type { PlacementKind, PlacementIssue, PlacementAid, PlacementReport, PlacementOptions, SettleResult } from './core/placement.js';
export { gameReady, hangLanterns, MAX_CHAIN } from './catalog/build/gameReady.js';
export { packVersion, unpackVersion, unpackVersionOrDamaged, unpackVersionLazily, cellCount, packVersionForFile, unpackVersionFromFile, isPackedVersionRecord, cellStorageEstimate, rememberPackedCells } from './data/versionStorage.js';
export type { StoredPayload, PackedVersionRecord, PackedVersionFileRecord, StoredVersionRecord } from './data/versionStorage.js';
export { buildPlanGraph, whereUsed, projectEdges, assetEdges, versionEdges, collectionEdges, templateEdges, projectVersionIds, PLAN_ROLE_LABEL, PLAN_KIND_LABEL } from './data/planGraph.js';
export type { PlanGraph, PlanEdge, PlanNodeKind, PlanNodeRef, PlanRole, PlanSource, UsageGroup } from './data/planGraph.js';
export { WORLD_PLAN_SCHEMA_VERSION, WORLD_PLAN_SCHEMA_VERSIONS, WORLD_PLAN_MAX_ITEMS, WORLD_PATH_MAX_POINTS, WORLD_ZONE_MAX_POINTS, WORLD_LAYER_MAX, WORLD_GROUP_MAX, WORLD_SITE_MAX_SIDE, WORLD_POINT_TYPES, WORLD_PATH_STYLES,
  WORLD_ZONE_CATEGORIES, WORLD_KIND_LABEL, emptyWorldPlan, checkWorldItem, checkWorldPlan,
  describeWorldPlanOp, applyWorldPlanOp, pointTypeLabel, pathStyleOf, zoneCategoryOf, itemKindLabel, itemColor, layerNames, groupNames, newWorldItemId, itemsOf, siteFromCorners, snapSiteToChunks, pathColumns, pathLength, itemBounds, itemAt, moveItem,
  sitesTouching, worldPlanSummary, insideZone, zoneArea, zonesAt } from './world/worldPlan.js';
export type { WorldPlan, WorldItem, WorldItemKind, WorldSite, WorldPath, WorldPoint, WorldZone, WorldPointType, WorldPathStyle, WorldZoneCategory, WorldPlanOp } from './world/worldPlan.js';
export { measureSummary, measureText, lineColumns, pathProfile, routeOverTerrain, routePath, simplifyLine, trailToPath } from './world/worldRoute.js';
export type { MeasureSummary, PathProfile, RouteOptions, RouteResult } from './world/worldRoute.js';
export { LIVE_PROTOCOL, LIVE_DEFAULT_PORT, LIVE_TOKEN_HEADER, LIVE_MAX_CHUNKS_PER_REQUEST, LIVE_MAX_RUNS, LIVE_MAX_MARKS, LIVE_MAX_PLAN_BYTES, LIVE_ALLOWED_ORIGINS, LIVE_PLAN_EXPORT, readLiveHello, readLivePairing,
  readLiveStatus, readLiveChunks, classifyRuns, chunkColumns, wantedChunks, chunkQuery, liveSurvey, HOLOGRAM_MATCH_LABEL, hologramProject, compareHologram, liveShare, playerBlock,
  originFromPlayer, livePlacementOf, planUploadQuery, marksBody, marksForMod, readLivePlayers, liveBaseUrl, originAllowed, liveCan, LIVE_FEATURE_SCAN, LIVE_FEATURE_MARKS2, LIVE_FEATURE_PLAYERS, LIVE_FEATURE_LABELS, LIVE_PROTOCOLS, LIVE_FEATURE_BIGPLANS, LIVE_LEGACY_PLAN_BYTES, checkPlanForMod, LIVE_FEATURE_MARKS3, LIVE_FEATURE_GROUPS, LIVE_FEATURE_TERRAIN, LIVE_FEATURE_BOX, groupBody, GAME_MARKS_LAYER, readLiveGameMarks, gameMarksToItems } from './team/liveLink.js';
export type { LiveHello, LivePlayer, LiveWorld, LiveCounts, LivePlacement, LiveHologram, LiveStatus, LiveChunk, LiveChunks, LiveColumn, LiveChunkColumns, HologramMatch, LiveOtherPlayer, LivePlayers, PlanSendCheck, LiveGameMark } from './team/liveLink.js';
export { removeItemsOp, selectionBounds, selectionPivot, itemsInRect, rotateColumn, mirrorColumn, rotateItem, mirrorItem, updateItemsOp, duplicateItems,
  pathVertexAt, movePathVertex, insertPathVertex, removePathVertex, reversePath, splitPath, joinPaths, groundHeight, alignToGround, setLayerOp,
  setGroupOp, setLockedOp, renameGroupOp, withGroupMates, splitLocked, groupSummary } from './world/worldPlanEdit.js';
export type { GroundAt, Polyline } from './world/worldPlanEdit.js';
export { BASE_FUNCTIONS, BASE_PHASES, baseFunctionById, affinity, checkRequirements, detectFunction, blockCounts, entityCounts, enchantingPower, farmlandHydration } from './base/baseFunctions.js';
export type { BaseFunction, BaseFunctionId, BasePhase, BaseMember, Requirement, RequirementStatus, RequirementInput, FunctionGuess } from './base/baseFunctions.js';
export { BASE_TEMPLATES, baseTemplateById, defaultZones, zoneKeyFor, normalizeBaseChoices, layoutBase, buildBasePlan, previewBase, createBaseProject, baseIntoProject, pathNetworkPayload, mainCandidates, isWaterCell,
  WATER_SIDE_LABEL, PATH_STYLE_LABEL, PATH_WIDTH, BASE_SPACING, MAX_ZONES, RESERVE_ID } from './base/base.js';
export type { BaseTemplate, BaseZoneChoice, BaseChoices, NormalizedBaseChoices, WaterSide, PathStyle, BaseMemberPlan, BaseZonePlan, BaseLayout, BasePlan } from './base/base.js';
export { fitBaseShore, shoreSides, suggestWaterSide, realShoreMap, SHORE_WIDE, SHORE_COAST_SHARE, SHORE_INLAND_SHARE, SHORE_SEARCH, SHORE_MAX_SHIFT } from './base/baseShore.js';
export type { ShoreSide, ShoreFit, ShoreClash, ShoreInput, ShoreMap } from './base/baseShore.js';
export { NETWORK_MODE_LABEL, NETWORK_SURFACE, isNetworkPlacement, withoutNetwork, wetPlacements, applyPlanLandscape, lampPostPart } from './base/planLandscape.js';
export type { NetworkMode, PlanNetwork, PlanLandscapeInput, PlanLandscapeResult, WetPlacement } from './base/planLandscape.js';
export { analyzeSplit, extractParts, extractRest, splitProject, blockClass, SPLIT_DEFAULTS, SPLIT_MAX_COLUMNS, NO_GROUND } from './core/split.js';
export type { SplitOptions, SplitPart, SplitAnalysis, ExtractOptions, ExtractedPart, GroundMode, SplitProjectPart, BlockClass as SplitBlockClass } from './core/split.js';
export { GROSSPROJEKT_SCHEMA_VERSION, MIN_STREET_WIDTH, MAX_STREET_WIDTH, MAX_GP_SPACING, DEFAULT_QUARTER_ROW, LAMP_STEP, QUARTIER_KIND_LABEL, STREET_STYLE_LABEL, SCALE_LABEL, scaleOf,
  normalizeGpChoices, validateGrossprojekt, planGrossprojekt, streetPayload, buildGrossprojektPlan, previewGrossprojekt, grossprojektSections, createGrossprojektProject, grossprojektIntoProject,
  summarizeGrossprojekt, themeOfGrossprojekt, grossprojektAssetIds } from './catalog/grossprojekte.js';
export type { QuartierKind, StreetStyle, GrossprojektUnit, Quartier, GrossprojektPhase, GrossprojektStreets, Grossprojekt, ProjectScale, GrossprojektChoices, NormalizedGpChoices, QuartierLayout, StreetLayout, GrossprojektLayout, GrossprojektPlan, GrossprojektSummary } from './catalog/grossprojekte.js';
export { GROSSPROJEKTE, grossprojektById, grossprojekteForTheme } from './catalog/grossprojekte/index.js';
export { OWN_GP_ROUTE_PREFIX, QUARTER_SLOTS, MAX_OWN_QUARTERS, grossprojektFromCollection, ownGrossprojektRoute } from './catalog/ownGrossprojekt.js';
export type { OwnGrossprojektInput, OwnGrossprojekt } from './catalog/ownGrossprojekt.js';
export { TEAM_SCHEMA_VERSION, MAX_TEAM_EVENTS, TEAM_ROLES, TEAM_ROLE_LABEL, TEAM_ROLE_TEXT, NOTE_TAGS, NOTE_TAG_LABEL, PLAYER_NAME, isKnownEvent, checkTeamEvent, compareEvents, checkTeam,
  createTeam, teamEvent, appendEvents, mergeTeam, SECTION_TEAM_STATUS_LABEL, canTeam, teamView, eventLabel, describeEvent, authorize, laterThan, teamAssignments,
  REPORT_CODE_PREFIX, MAX_REPORT_CODE, encodeReportCode, decodeReportCode, TEAM_PACKAGE_FORMAT, TEAM_PACKAGE_VERSION, buildTeamPackage, teamPackageFileName, readTeamPackage,
  teamStatusText, TEAM_SERVER_FORMAT, teamServerFile, teamServerFileName, headerFingerprint, readTeamServerFile, programBuilders, teamContextOf, takeOverPlan, joinedOnly, STORE_PURPOSES, STORE_PROTECTIONS, teamIntoProgram, SERVER_ONLY_KINDS, whereInPlan, digestInfo, coveredByDigest, effectiveEvents, foldTeam, MAX_CREW } from './team/team.js';
export { compactTeam, compactBefore, digestProjection, DIGEST_PART_CHARS } from './team/teamDigest.js';
export type { CompactionPlan, CompactionOptions } from './team/teamDigest.js';
export { LIVE_FEATURE_TEAM, teamLinkState, TEAM_LINK_WAY_TEXT, readLiveTeam, readLiveTeamPull, teamLinkProblem, teamLinkText } from './team/teamLink.js';
export type { TeamLinkState, TeamLinkSection, TeamLinkMember, TeamLinkNote, TeamLinkWay, LiveTeam, LiveTeamPull } from './team/teamLink.js';
export { ROOM_PROTOCOL, ROOM_PROTOCOL_VERSION, MAX_BATCH, checkLive, shareable, goLive, joinLive, leaveLive, appendLocal, trackOutbox, nextBatch, confirm, ingest, roomStatus, retryDelay, reconnectDelay, LINK_TIMING, linkDead, GUARDED_KINDS, subjectsOf, inviteLink, serverLink, readInvite } from './team/teamSync.js';
export { teamUndo, undoableSteps } from './team/teamUndo.js';
export type { TeamUndo } from './team/teamUndo.js';
export type { TeamLive, RoomTeam, Batch, AppendAnswer, FeedAnswer, RoomStatus, Invite, StaleStep } from './team/teamSync.js';
export type { TeamRole, NoteTag, ItemCount, TeamEventBody, KnownTeamEvent, UnknownTeamEvent, TeamEvent, TeamEventKind, TeamState, TeamMerge, SectionTeamStatus, SectionSeen, TeamMember,
  SectionTeamState, TeamNote, TeamRejection, TeamConflict, GatherClaim, PlanRelease, TeamView, TeamContext, TeamAction, TeamPackage, TeamServerFile, StoreChest, StorePurpose, StoreProtection, StoreStatus, StoreYield, DigestInfo, DigestBody, DigestTally, DigestMember, DigestChest, DigestYield, ItemDelta, FoldRaw, TeamBooking } from './team/team.js';
export { PROGRAM_SCHEMA_VERSION, MAX_BUILDERS, MAX_MILESTONES, MAX_DEPENDENCIES, DEFAULT_SESSIONS_PER_WEEK, UNASSIGNED, emptyProgram, programOf, parseDay, dayText, dependencyCycle, checkProgram, setProgram, addBuilder, updateBuilder, removeBuilder, assignSection, addMilestone, updateMilestone, removeMilestone, moveMilestone, addDependency, removeDependency, setProgramSettings, pruneProgram, programIssues, suggestDependencies, PROGRAM_PRESET_LABEL, suggestProgram, SECTION_STATE_LABEL, MILESTONE_STATUS_LABEL, sessionCalendar, sectionOrder, planProgram, programText, builderText, programSummary, buildingDaysBetween, setBaseline, clearBaseline, MAX_ABSENCES, MAX_BASELINES, addAbsence, removeAbsence, absentOn, activateBaseline, removeBaseline, renameBaseline, addProjectAfter, removeProjectAfter, MAX_PROJECT_AFTER } from './planning/program.js';
export type { Builder, Milestone, Dependency, BuildProgram, ProgramIssue, DependencySuggestion, ProgramPreset, SectionState, ScheduledSection, BuilderLoad, MilestoneStatus, MilestoneState, ProgramPlan, ProgramOptions, Baseline, Absence, ProjectAfter } from './planning/program.js';
export { builderAccounts, accountText } from './planning/builderAccount.js';
export type { AccountLine, BuilderAccount, BuilderPresence, AccountCandidate, AccountReport, RoomPresence } from './planning/builderAccount.js';
export { materialDaysOf, planProgramWithMaterial } from './planning/programMaterial.js';
export type { MaterialSchedule } from './planning/programMaterial.js';
export { SPLIT_MODE_LABEL, splitSection, sectionWork, isAway, suggestTeamAssignment, calendarAfter, teamSchedule, teamMaterials, sectionNeeds, packingText, teamProgress,
  teamIssues, releaseChanges, rightsMatrix } from './team/teamPlan.js';
export type { SplitMode, WorkPackage, SplitResult, SectionWork, AssignmentProposal, ScheduleItem, ScheduleLane, TeamSchedule, TeamItemLine, MemberMaterial, TeamMaterials,
  TeamAttention, MemberProgress, TeamProgress, TeamFix, TeamIssue, SectionChange, RightRow } from './team/teamPlan.js';
export { PRODUCTION_SCHEMA_VERSION, MAX_FARMS, MAX_HARVESTS, MAX_UNITS, DEFAULT_GATHER_HOURS_PER_DAY, DEFAULT_AFK_HOURS_PER_DAY, DEFAULT_SIMULATION_DISTANCE, FARM_MODE_LABEL, FARM_RANGE_LABEL, FARM_TYPES, FARM_GROUPS, FARM_STATE_LABEL, farmType, farmTypesForBuilding, farmTypesFor, flowFor, emptyProduction, productionOf, serverFarms, checkProduction, addFarm, updateFarm, removeFarm, setProductionSettings, logHarvest, removeHarvest, pruneProduction } from './materials/production.js';
export type { FarmMode, FarmRange, FarmGroup, Dimension as FarmDimension, FarmFlow, FarmType, FarmState, FarmPlace, FarmEntry, HarvestEntry, ProductionPlan, FarmDraft } from './materials/production.js';
export { HOPPER_ITEMS_PER_HOUR, BUILD_BLOCKS_PER_HOUR, MIN_SAVED_HOURS, SUGGESTION_TARGET_DAYS, COVER_WAY_LABEL, inRange, afkCoverage, bestAfkSpot, farmStatuses, netFuelSmelts, farmCostOf, CHEST_GAP_MINUTES, teamChests, chestYield, suggestChests, analyzeProduction, detectFarms, guessFarmType, dimensionOf, worldDimensionOf, farmsOnMap, splitGathering, productionText } from './materials/productionPlan.js';
export type { RangeCheck, AfkSpot, FarmRate, FarmStatus, FarmLogistics, CoverWay, CoverageLine as ProductionCoverageLine, SectionReadiness, FarmCost, Verdict, FarmSuggestion, FurnacePlan, StorageLine, ProductionReport, ProductionInput, DetectedFarm, MapFarm, GatherJob, GatherAssignment, TeamChest, ChestYield, ChestSuggestion } from './materials/productionPlan.js';
export { SERVER_OPS, SERVER_WAY_TEXT, readServerInfo, readServerClaim, readServerStatus, nextSeq, controlBody, signControl, controlMessage, settingsProblem, readServerRoom, deviceInviteLink, readDeviceInvite, chooseServerAnchor, ANCHOR_LABEL } from './team/serverControl.js';
export type { ServerOp, ServerWay, ServerIdentity, ServerInfo, ServerPairing, ServerSetting, ServerStatus, ControlMessage, ServerRoom, ServerAnchor, AnchorSource } from './team/serverControl.js';
export { SCAN_ROUTE_LABEL, planScanRoutes, scanRouteSummary } from './world/scanRoutes.js';
export type { ScanRouteId, ScanRouteInput, ScanRoute } from './world/scanRoutes.js';
export { checkSavedLiveMap, checkSavedLiveMaps, upsertSavedLiveMap, createLiveMapTargetsFile, readLiveMapTargetsFile, mergeSavedLiveMaps, LIVE_MAP_SAVED_MAX } from './world/livemap.js';
export type { SavedLiveMap, LiveMapTargetsFile } from './world/livemap.js';
export { mapShapes, markersToPoints, pointMarkers, blueMapMarkerConfig, dynmapMarkerCommands, MAP_SHAPE_GROUPS, MAP_SHAPE_GROUP_LABEL, DEFAULT_SHAPE_Y } from './world/liveMapExport.js';
export type { MapShape, MapShapeGroup, MapShapeOptions } from './world/liveMapExport.js';
export { projectLinks, projectCycle, projectAfterProblem, projectLevels, projectStartCheck, projectSuccessors, projectRemoval } from './planning/projectOrder.js';
export type { OrderProject, ProjectLink, PredecessorState, ProjectStartCheck, ProjectRemoval } from './planning/projectOrder.js';
export { WORLD_SHARE_SCHEMA, WORLD_SHARE_FORMAT, MAP_LIST_FORMAT, WORLD_SHARE_MAX_BYTES, buildWorldShareDoc, readWorldShareDoc, worldItemKey, sameItems, mergeWorldItems, mergeShapes, buildMapListDoc, readMapListDoc, mergeMapLists } from './world/worldShare.js';
export type { WorldShareDoc, WorldMerge, MapListDoc } from './world/worldShare.js';
