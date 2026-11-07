// PERF-07: Fachfunktionen der Projektzentrale, die erst nach dem Start gebraucht werden (Sicherung,
// Wiederherstellung, Teampaket, Projektvorschau, Vorlagen, Termine, Updates). Die Projektzentrale lädt
// dieses Modul im Hintergrund nach; so bleibt ihr Code (Sicherung, Planung, Gelände, Team) aus dem Startpaket.
export {
  applyOperation, applyWorldPlanOp, backupFileName, buildRestore, cellCount, createBackup, createEnsembleProject, createProject,
  ENSEMBLES, findUpdates, hasTeamAccess, latestReleaseId, latestVersions, mergeTeam, missingMembers, newInstance, planRestore, programSummary,
  projectRemoval, readBackup, readTeamPackage, resolveProject, serializeBackup, siteOf, summarizeUpdates,
} from '../../../../packages/domain/src/index.js';

