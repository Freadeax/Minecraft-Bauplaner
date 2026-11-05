import { validatePayload } from '../../../voxel/src/validation.js';
import type { VoxelPayload } from '../../../voxel/src/types.js';
import { canonicalJson, sha256Hex } from '../core/hash.js';
import { addAssetVersion, checkConnectorShape, createAsset, payloadHash } from './library.js';
import { FACETS, facetTags } from './catalog.js';
import type { BuildingFacets, FacetKey } from './catalog.js';
import { fromBase64, toBase64 } from '../data/backup.js';
import { packVersionForFile, unpackVersionFromFile } from '../data/versionStorage.js';
import type { Asset, AssetVersion, AssetVersionSource, Connector } from '../core/types.js';
import { DomainError } from '../core/types.js';

/**
 * Bibliotheksbeiträge (LIB-06): an own building (import, workshop, generator,
 * world excerpt …) becomes a fixed catalogue entry that every visitor of the
 * published site gets, like the shipped designs.
 *
 * The site is static, so nothing is uploaded from the browser. The way in:
 * 1. Gebäudeblatt → „In Bibliothek einreichen“ builds a contribution package
 *    (`createContribution`): metadata, the chosen immutable version with packed
 *    cells and checksum, plus a plain preview image (colours only, no textures).
 * 2. The package reaches the repository (GitHub issue form with the file
 *    attached, or handed to the maintainer).
 * 3. `npm run library:add -- <datei>` checks it with `readContribution` and writes
 *    it as a module under `packages/domain/src/catalog/community/`; the next build ships it.
 * 4. On start `createCommunityLibrary` (community/library.ts) turns every entry
 *    into a shipped (demo) asset with one version "1.0"; seeding, catalogue
 *    delivery (UPDATE-01) and the catalogue cache work unchanged.
 *
 * Contributions keep their geometry exactly as built: no style refinement
 * (build/refine.ts), no game-ready pass. The checks are about data integrity,
 * rights and size, not about taste.
 */
export const CONTRIBUTION_FORMAT = 'minecraft-bauplaner/bibliotheksbeitrag';
export const CONTRIBUTION_FORMAT_VERSION = 1;
/** Asset ids of contributions start with this prefix; never used by code-built designs. */
export const CONTRIBUTION_PREFIX = 'beitrag_';
/** Plain tag every contribution carries (search „beitrag“, chip in the sheet). */
export const CONTRIBUTION_TAG = 'beitrag';
/** File name ending of a package. */
export const CONTRIBUTION_FILE_SUFFIX = '.bauplaner-beitrag.json';

/** Same ceiling as the file import (1 Mio. cells). */
export const MAX_CONTRIBUTION_CELLS = 1_000_000;
/** Packed Base64 size above which the site loads noticeably more on a catalogue rebuild. */
export const LARGE_CONTRIBUTION_BYTES = 1_500_000;
/** Hard ceiling of the packed Base64 cells (one lazily loaded chunk per contribution). */
export const MAX_CONTRIBUTION_BYTES = 8_000_000;
/** Preview image (data URL) ceiling. */
export const MAX_PREVIEW_BYTES = 600_000;

export const CONTRIBUTION_LICENSES = {
  'frei-projekt': 'frei für dieses Projekt (Nutzung im Bauplaner und im Spiel)',
  'cc-by-4.0': 'CC BY 4.0 (Namensnennung)',
  'cc0': 'CC0 (gemeinfrei)',
} as const;
export type ContributionLicense = keyof typeof CONTRIBUTION_LICENSES;

export interface ContributionMeta {
  /** Asset id: `beitrag_<kennung>`, lower case a–z, 0–9 and `_`. */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly facets: BuildingFacets;
  /** Plain tags (no facet or family prefixes). */
  readonly tags: readonly string[];
  /** Short build tips, shown on the building sheet. */
  readonly tips: readonly string[];
  readonly author: string;
  /** Where the geometry comes from, e.g. „eigener Entwurf, Survival-Welt“. */
  readonly source: string;
  readonly license: ContributionLicense;
  /** The contributor confirmed: own work or permission, no third-party schematic without consent. */
  readonly rightsConfirmed: true;
}

export interface ContributionFile {
  readonly format: typeof CONTRIBUTION_FORMAT;
  readonly formatVersion: typeof CONTRIBUTION_FORMAT_VERSION;
  readonly createdAt: string;
  readonly meta: ContributionMeta;
  /** The contributed version in backup form (packed cells as Base64 when exact). */
  readonly version: unknown;
  /** Plain isometric preview (PNG data URL, block colours only). */
  readonly preview?: string;
  /** Where it came from in the contributor's library (information only). */
  readonly origin?: { readonly assetId: string; readonly versionId: string; readonly label: string; readonly sourceFormat: string };
  /** SHA-256 over the canonical JSON of every other field. */
  readonly checksum: string;
}

export interface CheckedContribution {
  readonly meta: ContributionMeta;
  readonly payload: VoxelPayload;
  readonly payloadHash: string;
  readonly connectors: readonly Connector[];
  /** Source facts kept from the original version (file name, DataVersion). */
  readonly source: Pick<AssetVersionSource, 'fileName' | 'dataVersion'>;
  readonly preview?: string;
  readonly origin?: ContributionFile['origin'];
  readonly createdAt: string;
  readonly checksum: string;
  /** Hints that do not block the intake (size, mod blocks, missing facets). */
  readonly warnings: readonly string[];
  /** Size of the packed cells in the package (Base64 characters; plain JSON length when not packable). */
  readonly dataBytes: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (message: string): never => { throw new DomainError('CONTRIBUTION', message); };

function str(v: unknown, label: string, max: number, required = false): string {
  if (typeof v !== 'string') return fail(`${label}: Text erwartet`);
  const t = v.trim();
  if (required && !t) fail(`${label} fehlt`);
  if (t.length > max) fail(`${label}: höchstens ${max} Zeichen`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(t)) fail(`${label}: Steuerzeichen sind nicht erlaubt`);
  return t;
}
function strList(v: unknown, label: string, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return fail(`${label}: Liste erwartet`);
  if (v.length > maxItems) fail(`${label}: höchstens ${maxItems} Einträge`);
  return v.map((x, i) => str(x, `${label}[${i + 1}]`, maxLen)).filter(Boolean);
}

const UMLAUT: Readonly<Record<string, string>> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
/** Stable id proposal from a name: `beitrag_<name in a–z, 0–9, _>` (at most 48 characters after the prefix). */
export function contributionIdFor(name: string): string {
  const slug = name.toLowerCase().replace(/[äöüß]/g, c => UMLAUT[c]!).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48).replace(/_+$/, '');
  return `${CONTRIBUTION_PREFIX}${slug || 'bauwerk'}`;
}
export const CONTRIBUTION_ID_PATTERN = /^beitrag_[a-z0-9](?:[a-z0-9_]{0,46}[a-z0-9])?$/;
export const isContributionId = (assetId: string): boolean => assetId.startsWith(CONTRIBUTION_PREFIX);

/** Checks and normalises contribution metadata; throws DomainError('CONTRIBUTION') with a German message. */
export function checkContributionMeta(raw: unknown): ContributionMeta {
  if (!isObj(raw)) return fail('Angaben fehlen');
  const id = str(raw.id, 'Kennung', 60, true);
  if (!CONTRIBUTION_ID_PATTERN.test(id)) fail(`Kennung „${id}“: erlaubt sind „beitrag_“ und danach a–z, 0–9, _ (nicht am Ende)`);
  const facetsRaw = raw.facets ?? {};
  if (!isObj(facetsRaw)) fail('Angaben (Kategorie, Stil …): Objekt erwartet');
  const facets: Partial<Record<FacetKey, string[]>> = {};
  for (const [key, value] of Object.entries(facetsRaw as Record<string, unknown>)) {
    const def = FACETS.find(f => f.key === key);
    if (!def) fail(`Unbekannte Angabe „${key}“`);
    const values = [...new Set(strList(value, def!.label, 12, 40).map(v => v.toLowerCase()))];
    if (def!.single && values.length > 1) fail(`${def!.label}: nur ein Wert erlaubt`);
    if (values.length) facets[key as FacetKey] = values;
  }
  const tags = [...new Set(strList(raw.tags ?? [], 'Tags', 20, 40).map(t => t.toLowerCase()))].filter(t => !t.includes(':') && t !== CONTRIBUTION_TAG);
  const license = raw.license;
  if (typeof license !== 'string' || !Object.hasOwn(CONTRIBUTION_LICENSES, license)) fail(`Nutzungsrechte: eine von ${Object.keys(CONTRIBUTION_LICENSES).join(', ')} erwartet`);
  if (raw.rightsConfirmed !== true) fail('Die Bestätigung der Rechte fehlt (eigenes Bauwerk oder Erlaubnis des Erbauers)');
  return {
    id, name: str(raw.name, 'Name', 120, true), description: str(raw.description ?? '', 'Beschreibung', 2000),
    facets, tags, tips: strList(raw.tips ?? [], 'Bautipps', 8, 300),
    author: str(raw.author, 'Autor', 120, true), source: str(raw.source ?? '', 'Herkunft', 300) || 'eigener Entwurf',
    license: license as ContributionLicense, rightsConfirmed: true,
  };
}

function withoutChecksum(file: Record<string, unknown>): Record<string, unknown> {
  const { checksum: _c, ...rest } = file;
  return rest;
}

/** Non-blocking hints for a payload about to be contributed. */
export function contributionWarnings(payload: VoxelPayload, meta: Pick<ContributionMeta, 'facets' | 'description'>, dataBytes: number): string[] {
  const out: string[] = [];
  const namespaces = new Set(payload.palette.map(s => s.id.split(':')[0]).filter(ns => ns && ns !== 'minecraft'));
  if (namespaces.size) out.push(`Enthält Mod-Blöcke (${[...namespaces].sort().join(', ')}): ohne diese Mods fehlen sie im Spiel.`);
  const blocks = payload.cells.reduce((n, c) => n + (c.kind === 'block' ? 1 : 0), 0);
  if (!blocks) out.push('Das Bauwerk enthält keine Blöcke.');
  if (dataBytes > LARGE_CONTRIBUTION_BYTES) out.push(`Große Blockdaten (${(dataBytes / 1e6).toFixed(1)} MB): der Katalog lädt beim ersten Start nach einem Update entsprechend länger.`);
  if (!meta.facets.kategorie?.length) out.push('Keine Kategorie angegeben: im Katalogfilter nur unter „alle“ zu finden.');
  if (!meta.description) out.push('Keine Beschreibung: ein Satz zu Zweck und Besonderheiten hilft beim Finden.');
  if (payload.bounds.maxExclusive.some((v, i) => v - payload.bounds.min[i]! > 256)) out.push('Eine Kante ist länger als 256 Blöcke.');
  return out;
}

export interface ContributionInput {
  readonly meta: Omit<ContributionMeta, 'rightsConfirmed'> & { readonly rightsConfirmed: boolean };
  /** PNG data URL of a plain preview (colours only). */
  readonly preview?: string;
}

/** Builds the package for one immutable version of an own asset. */
export async function createContribution(asset: Asset, version: AssetVersion, input: ContributionInput): Promise<ContributionFile> {
  if (asset.demo) fail('Mitgelieferte Gebäude sind schon fester Teil der Bibliothek');
  if (version.assetId !== asset.id) fail('Version gehört nicht zu diesem Bauteil');
  if (version.source.localTo) fail('Diese Version ist eine lokale Änderung in einem Projekt; bitte zuerst als Bauteilversion speichern');
  const meta = checkContributionMeta(input.meta);
  const blocks = version.payload.cells.length;
  if (blocks > MAX_CONTRIBUTION_CELLS) fail(`Zu groß: ${blocks.toLocaleString('de-DE')} Zellen (höchstens ${MAX_CONTRIBUTION_CELLS.toLocaleString('de-DE')})`);
  if (input.preview !== undefined && (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(input.preview) || input.preview.length > MAX_PREVIEW_BYTES)) fail('Vorschaubild ungültig oder zu groß');
  const fileVersion = packVersionForFile(version, toBase64);
  if (dataSize(fileVersion) > MAX_CONTRIBUTION_BYTES) fail(`Blockdaten zu groß für einen festen Katalogeintrag (höchstens ${MAX_CONTRIBUTION_BYTES / 1e6} MB gepackt)`);
  const body = {
    format: CONTRIBUTION_FORMAT, formatVersion: CONTRIBUTION_FORMAT_VERSION, createdAt: new Date().toISOString(), meta,
    version: fileVersion, ...(input.preview && { preview: input.preview }),
    origin: { assetId: asset.id, versionId: version.id, label: version.label, sourceFormat: version.source.format },
  };
  return { ...body, checksum: await sha256Hex(canonicalJson(body)) } as ContributionFile;
}

function dataSize(fileVersion: unknown): number {
  if (isObj(fileVersion) && isObj(fileVersion.packedCells) && typeof fileVersion.packedCells.base64 === 'string') return fileVersion.packedCells.base64.length;
  return JSON.stringify(isObj(fileVersion) && isObj(fileVersion.payload) ? fileVersion.payload.cells ?? [] : []).length;
}

/**
 * Reads and checks a package: format, checksum, metadata, block data (decoded
 * cells, payload validation, payload hash against the recorded one) and
 * connectors. Throws DomainError('CONTRIBUTION') with a German message.
 */
export async function readContribution(raw: unknown): Promise<CheckedContribution> {
  if (!isObj(raw)) return fail('Keine Beitragsdatei (JSON-Objekt erwartet)');
  if (raw.format !== CONTRIBUTION_FORMAT) fail('Keine Beitragsdatei des Bauplaners (Formatkennung fehlt)');
  if (raw.formatVersion !== CONTRIBUTION_FORMAT_VERSION) fail(`Beitragsformat ${String(raw.formatVersion)} wird nicht unterstützt (erwartet ${CONTRIBUTION_FORMAT_VERSION})`);
  if (typeof raw.checksum !== 'string' || await sha256Hex(canonicalJson(withoutChecksum(raw))) !== raw.checksum) fail('Prüfsumme stimmt nicht: Datei beschädigt oder nachträglich verändert');
  const meta = checkContributionMeta(raw.meta);
  const createdAt = str(raw.createdAt, 'Erstellt am', 40, true);
  if (!Number.isFinite(Date.parse(createdAt))) fail('Erstellt am: Datum ungültig');
  let version: AssetVersion;
  try { version = unpackVersionFromFile(raw.version, fromBase64); }
  catch (e) { return fail(`Blockdaten nicht lesbar: ${e instanceof Error ? e.message : String(e)}`); }
  if (!isObj(version) || !isObj(version.payload)) fail('Blockdaten fehlen');
  try { validatePayload(version.payload); }
  catch (e) { fail(`Blockdaten ungültig: ${e instanceof Error ? e.message : String(e)}`); }
  if (version.payload.cells.length > MAX_CONTRIBUTION_CELLS) fail(`Zu groß: ${version.payload.cells.length} Zellen`);
  const hash = await payloadHash(version.payload);
  if (hash !== version.payloadHash) fail('Blockdaten passen nicht zum aufgezeichneten Inhalts-Hash');
  const connectors = Array.isArray(version.connectors) ? version.connectors : fail('Anschlüsse: Liste erwartet');
  try { checkConnectorShape(connectors); } catch (e) { fail(`Anschlüsse ungültig: ${e instanceof Error ? e.message : String(e)}`); }
  const preview = raw.preview;
  if (preview !== undefined && (typeof preview !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(preview) || preview.length > MAX_PREVIEW_BYTES)) fail('Vorschaubild ungültig oder zu groß');
  const src: Record<string, unknown> = isObj(version.source) ? version.source as unknown as Record<string, unknown> : {};
  const source: { fileName?: string; dataVersion?: number } = {};
  if (typeof src.fileName === 'string' && src.fileName.length <= 200) source.fileName = src.fileName;
  if (typeof src.dataVersion === 'number' && Number.isSafeInteger(src.dataVersion)) source.dataVersion = src.dataVersion;
  const o = raw.origin;
  const origin = isObj(o) && typeof o.assetId === 'string' && typeof o.versionId === 'string' && typeof o.label === 'string' && typeof o.sourceFormat === 'string'
    ? { assetId: o.assetId.slice(0, 80), versionId: o.versionId.slice(0, 80), label: o.label.slice(0, 40), sourceFormat: o.sourceFormat.slice(0, 40) } : undefined;
  const dataBytes = dataSize(raw.version);
  if (dataBytes > MAX_CONTRIBUTION_BYTES) fail(`Blockdaten zu groß (höchstens ${MAX_CONTRIBUTION_BYTES / 1e6} MB gepackt)`);
  return {
    meta, payload: version.payload, payloadHash: hash, connectors, source, createdAt, checksum: raw.checksum as string, dataBytes,
    warnings: contributionWarnings(version.payload, meta, dataBytes),
    ...(typeof preview === 'string' && { preview }), ...(origin && { origin }),
  };
}

export const CONTRIBUTION_LABEL = '1.0';

/** Tags of the shipped asset: plain tags, the contribution tag and the facet tags. */
export function contributionTags(meta: ContributionMeta): string[] {
  return [...meta.tags, CONTRIBUTION_TAG, ...facetTags(meta.facets)];
}

/** The shipped (demo) asset with its one version "1.0" for a checked contribution. */
export async function contributionAsset(c: CheckedContribution): Promise<{ asset: Asset; version: AssetVersion }> {
  const { meta } = c;
  const asset = createAsset({
    id: meta.id, name: meta.name, description: meta.description, tags: contributionTags(meta), demo: true,
    provenance: { author: meta.author, source: `Bibliotheksbeitrag: ${meta.source}`, license: CONTRIBUTION_LICENSES[meta.license] },
  });
  return addAssetVersion(asset, { payload: c.payload, label: CONTRIBUTION_LABEL, connectors: c.connectors, source: { format: 'demo', ...c.source } });
}
