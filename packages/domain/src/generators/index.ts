import { addAssetVersion, createAsset, payloadHash } from '../library.js';
import { canonicalJson } from '../hash.js';
import { withFacets } from '../catalog.js';
import { DomainError } from '../types.js';
import type { Asset, AssetVersion, GeneratorSource } from '../types.js';
import { Args, defaultsOf, describeParams, normalizeParams } from './params.js';
import type { ParamIssue, ParamValues } from './params.js';
import type { GeneratedBuilding, Generator } from './types.js';
import { TOWER_GENERATOR } from './tower.js';
import { WALL_GENERATOR } from './wall.js';
import { BRIDGE_GENERATOR } from './bridge.js';
import { ROOF_GENERATOR } from './roof.js';
import { HOUSE_GENERATOR } from './house.js';
import { buildCompound } from './compound.js';
import type { CompoundBuild } from './compound.js';

/**
 * Parametrische Generatoren (B13): declared generators turn validated
 * parameters into ordinary, immutable AssetVersions. The normalised
 * parameters and the algorithm version are stored in `source.generator`, so a
 * version can always be rebuilt and checked; changing parameters creates a new
 * version of the same asset and existing projects keep theirs.
 */
export const GENERATORS: readonly Generator[] = [HOUSE_GENERATOR, TOWER_GENERATOR, WALL_GENERATOR, BRIDGE_GENERATOR, ROOF_GENERATOR];
/** Plain tag on generated assets; the generator id follows as `generator:<id>`. */
export const GENERATOR_TAG = 'generiert';
export const GENERATOR_TAG_PREFIX = 'generator:';
export const GENERATOR_PROVENANCE = { author: 'Minecraft-Bauplaner', source: 'Parametrischer Generator (eigener Entwurf)', license: 'frei für dieses Projekt' } as const;

export function generatorById(id: string): Generator | undefined { return GENERATORS.find(g => g.id === id); }
function need(id: string): Generator {
  const g = generatorById(id);
  if (!g) throw new DomainError('GENERATOR', `Generator „${id}“ unbekannt`);
  return g;
}

export interface GeneratorRun extends GeneratedBuilding {
  readonly generator: Generator;
  /** Normalised parameters actually used. */
  readonly values: ParamValues;
  /** Corrections applied to the input (clamped, unknown keys). */
  readonly issues: readonly ParamIssue[];
  readonly source: GeneratorSource;
}

/** Normalises the input and builds; pure and deterministic. */
export function runGenerator(id: string, raw: Readonly<Record<string, unknown>> = {}): GeneratorRun {
  const generator = need(id);
  const { values, issues } = normalizeParams(generator.params, raw);
  const built = generator.build(new Args(values), values);
  return { ...built, generator, values, issues, source: { id, version: generator.version, params: values } };
}

export const presetValues = (id: string, presetId: string): ParamValues => {
  const g = need(id), preset = g.presets.find(p => p.id === presetId);
  if (!preset) throw new DomainError('GENERATOR', `Vorlage „${presetId}“ unbekannt`);
  return normalizeParams(g.params, { ...defaultsOf(g.params), ...preset.values }).values;
};

const tagsOf = (run: GeneratorRun, extra: readonly string[] = []): string[] =>
  withFacets([...extra, GENERATOR_TAG, `${GENERATOR_TAG_PREFIX}${run.generator.id}`], run.facets);

const describe = (run: GeneratorRun): string =>
  `${run.description} Parameter: ${describeParams(run.generator.params, run.values)}. Erzeugt mit „${run.generator.name}“ v${run.generator.version}; jederzeit mit denselben Werten reproduzierbar.`;

/** A new own asset (not demo) with the generated geometry as version 1.0. */
export async function createGeneratedAsset(run: GeneratorRun, input: { name?: string; author?: string; tags?: readonly string[] } = {}): Promise<{ asset: Asset; version: AssetVersion }> {
  const asset = createAsset({ name: input.name?.trim() || run.name, description: describe(run), tags: tagsOf(run, input.tags),
    provenance: { ...GENERATOR_PROVENANCE, ...(input.author?.trim() && { author: input.author.trim() }) } });
  return addAssetVersion(asset, { payload: run.payload, label: '1.0', connectors: run.connectors, source: { format: 'generator', generator: run.source } });
}

/**
 * Next version of a generated asset with new parameters. Projects keep their
 * pinned versions; updating an instance stays an explicit editor step.
 * Throws DUPLICATE when the result equals an existing version.
 */
export async function addGeneratedVersion(asset: Asset, run: GeneratorRun, label = `${asset.versionIds.length + 1}.0`): Promise<{ asset: Asset; version: AssetVersion }> {
  return addAssetVersion(asset, { payload: run.payload, label, connectors: run.connectors, source: { format: 'generator', generator: run.source } });
}

export function generatorSourceOf(version: Pick<AssetVersion, 'source'>): GeneratorSource | null {
  const g = version.source.generator;
  return version.source.format === 'generator' && g && typeof g.id === 'string' && typeof g.version === 'number' && g.params && typeof g.params === 'object' ? g : null;
}

/** A compound (castle, street) as a new project with its generated parts. */
export function createCompoundProject(id: string, raw: Readonly<Record<string, unknown>> = {}): Promise<CompoundBuild> {
  return buildCompound(id, raw, (generatorId, values, name) => createGeneratedAsset(runGenerator(generatorId, values), { name }));
}

export type ReproStatus = 'gleich' | 'abweichend' | 'aeltere-version' | 'unbekannt' | 'kein-generator';
export interface ReproCheck {
  readonly status: ReproStatus;
  readonly message: string;
  /** Connectors differ from the generator's (edited in the connector editor). */
  readonly connectorsEdited?: boolean;
}

/** Rebuilds a stored generated version from its parameters and compares the geometry hash. */
export async function checkReproducible(version: AssetVersion): Promise<ReproCheck> {
  const src = generatorSourceOf(version);
  if (!src) return { status: 'kein-generator', message: 'Nicht mit einem Generator erzeugt.' };
  const g = generatorById(src.id);
  if (!g) return { status: 'unbekannt', message: `Generator „${src.id}“ gibt es in dieser App-Version nicht.` };
  if (g.version !== src.version) return { status: 'aeltere-version', message: `Mit „${g.name}“ v${src.version} erzeugt, aktuell ist v${g.version}: eine neue Version mit denselben Werten kann anders aussehen.` };
  const run = runGenerator(src.id, src.params);
  if (canonicalJson(run.values) !== canonicalJson(src.params)) return { status: 'abweichend', message: 'Gespeicherte Parameter sind nicht normalisiert.' };
  const same = await payloadHash(run.payload) === version.payloadHash;
  const connectorsEdited = canonicalJson(run.connectors) !== canonicalJson(version.connectors);
  return same
    ? { status: 'gleich', message: `Geometrie aus den gespeicherten Parametern nachgerechnet: identisch (${g.name} v${g.version}).${connectorsEdited ? ' Anschlüsse wurden nachträglich bearbeitet.' : ''}`, connectorsEdited }
    : { status: 'abweichend', message: 'Nachgerechnete Geometrie weicht ab – Generator geändert, ohne die Version zu erhöhen.', connectorsEdited };
}

export type { Generator, GeneratedBuilding, Preset } from './types.js';
export type { ParamDef, ParamValue, ParamValues, ParamIssue, IntParam, ChoiceParam, BoolParam } from './params.js';
export { normalizeParams, defaultsOf, describeParams, rollParams, visible } from './params.js';
export { STYLES, styleOf } from './styles.js';
export { COMPOUNDS, compoundById } from './compound.js';
export type { Compound, CompoundPart, CompoundBuild } from './compound.js';
export type { Style } from './styles.js';
