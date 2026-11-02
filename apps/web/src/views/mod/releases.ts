/**
 * Downloadable builds of the Bauplaner-Brücke (GAME-02). The list lives in releases.json and is
 * written by scripts/release_mod.mjs; the jars lie in downloads/mod/ and Pages serves them from main.
 */
export interface ModRelease {
  readonly file: string;
  readonly modVersion: string;
  readonly loader: string;
  /** Newest Minecraft version of the build (file name, default selection). */
  readonly minecraft: string;
  /**
   * Every Minecraft version one jar runs on, for builds that are not tied to one version (Paper plugin,
   * Bukkit API). Missing for per-version builds such as the Fabric mod.
   */
  readonly minecraftVersions?: readonly string[];
  readonly loaderMin: string;
  readonly fabricApi?: string;
  readonly java: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly releasedAt: string;
  readonly sourceCommit: string;
  readonly tested: string;
}

export const LOADER_LABEL: Readonly<Record<string, string>> = { fabric: 'Fabric', neoforge: 'NeoForge', forge: 'Forge', paper: 'Paper' };
/** Where the jar goes, per loader (first install step on the download page). */
export const INSTALL_HINT: Readonly<Record<string, string>> = {
  fabric: 'Die .jar in den Ordner mods deiner Fabric-Instanz legen (Modrinth App, Prism, CurseForge oder offizieller Launcher mit Fabric-Profil). Fabric API muss installiert sein.',
  neoforge: 'Die .jar in den Ordner mods deiner NeoForge-Instanz legen (Modrinth App, Prism, CurseForge, ATLauncher oder offizieller Launcher mit NeoForge-Profil). Weitere Mods sind nicht nötig.',
  forge: 'Die .jar in den Ordner mods deiner Forge-Instanz legen (CurseForge, Prism, Modrinth App oder offizieller Launcher mit Forge-Profil). Weitere Mods sind nicht nötig.',
};
/** Loaders that are planned but have no build yet (GAME-04); shown as not yet available. */
export const PLANNED_LOADERS: readonly string[] = ['forge'];
/** Server plugins (installed on the server, not in the game client). */
export const SERVER_LOADERS: readonly string[] = ['paper'];

/** Minecraft versions a build runs on. */
export function versionsOf(r: ModRelease): readonly string[] {
  return r.minecraftVersions?.length ? r.minecraftVersions : [r.minecraft];
}
const supports = (r: ModRelease, minecraft: string) => versionsOf(r).includes(minecraft);

/** Numeric comparison of dotted versions ("26.10" > "26.3"), suffixes after "+"/"-" ignored. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => v.split(/[+-]/)[0]!.split('.').map(n => Number.parseInt(n, 10) || 0);
  const x = parts(a), y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

const unique = (values: readonly string[]) => [...new Set(values)];

/** Minecraft versions with at least one build, newest first. */
export function minecraftVersions(releases: readonly ModRelease[]): string[] {
  return unique(releases.flatMap(r => versionsOf(r))).sort((a, b) => compareVersions(b, a));
}

/** Loaders with a build for this Minecraft version. */
export function loadersFor(releases: readonly ModRelease[], minecraft: string): string[] {
  return unique(releases.filter(r => supports(r, minecraft)).map(r => r.loader)).sort();
}

/** Builds for this Minecraft version and loader, newest mod version first. */
export function buildsFor(releases: readonly ModRelease[], minecraft: string, loader: string): ModRelease[] {
  return releases.filter(r => supports(r, minecraft) && r.loader === loader).sort((a, b) => compareVersions(b.modVersion, a.modVersion));
}

export interface Selection { readonly minecraft: string; readonly loader: string; readonly modVersion: string }

/**
 * Completes a (possibly partial or outdated) wish to a selection that exists: an unknown Minecraft
 * version falls back to the newest, an unavailable loader to the first one, an unknown mod version
 * to the newest build. Returns null when there are no builds at all.
 */
export function resolveSelection(releases: readonly ModRelease[], wish: Partial<Selection>): Selection | null {
  const versions = minecraftVersions(releases);
  if (!versions.length) return null;
  const minecraft = wish.minecraft && versions.includes(wish.minecraft) ? wish.minecraft : versions[0]!;
  const loaders = loadersFor(releases, minecraft);
  const loader = wish.loader && loaders.includes(wish.loader) ? wish.loader : loaders[0]!;
  const builds = buildsFor(releases, minecraft, loader);
  const modVersion = wish.modVersion && builds.some(b => b.modVersion === wish.modVersion) ? wish.modVersion : builds[0]!.modVersion;
  return { minecraft, loader, modVersion };
}

/** Shareable query of a selection (`#/mod?minecraft=26.3&loader=fabric&version=0.1.0`). */
export function selectionSearch(s: Selection): string {
  return new URLSearchParams({ minecraft: s.minecraft, loader: s.loader, version: s.modVersion }).toString();
}

export function parseSelectionSearch(search: string | undefined): Partial<Selection> {
  const q = new URLSearchParams(search ?? '');
  return { ...(q.get('minecraft') && { minecraft: q.get('minecraft')! }), ...(q.get('loader') && { loader: q.get('loader')! }), ...(q.get('version') && { modVersion: q.get('version')! }) };
}

/** Metadata file each loader needs inside the jar (what a launcher like the Modrinth App reads). */
export const LOADER_METADATA: Readonly<Record<string, string>> = {
  fabric: 'fabric.mod.json', neoforge: 'META-INF/neoforge.mods.toml', forge: 'META-INF/mods.toml', paper: 'plugin.yml',
};

/**
 * Checks a downloaded jar like a mod launcher opens it: exact size, an intact ZIP end record (EOCD)
 * whose central directory fits the file, and the loader's metadata file in it. Returns problems in
 * plain words; empty means the file is complete. The SHA-256 is compared separately (async in the browser).
 */
export function checkJarBytes(bytes: Uint8Array, release: Pick<ModRelease, 'bytes' | 'loader'>): string[] {
  const problems: string[] = [];
  if (bytes.length !== release.bytes) problems.push(`Größe ${bytes.length} Bytes statt ${release.bytes} Bytes (Download unvollständig oder falsche Datei).`);
  if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    problems.push(bytes[0] === 0x3c ? 'Statt der .jar kam eine Webseite an.' : 'Die Datei ist keine .jar (kein ZIP-Anfang).');
    return problems;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) { problems.push('Das ZIP-Ende (EOCD) fehlt: die Datei ist abgeschnitten.'); return problems; }
  const entries = view.getUint16(eocd + 10, true), cdSize = view.getUint32(eocd + 12, true), cdOffset = view.getUint32(eocd + 16, true);
  if (cdOffset + cdSize !== eocd) { problems.push('Das Inhaltsverzeichnis der .jar passt nicht zur Dateigröße.'); return problems; }
  const names: string[] = [];
  const decoder = new TextDecoder();
  for (let p = cdOffset, n = 0; n < entries; n++) {
    if (p + 46 > eocd || view.getUint32(p, true) !== 0x02014b50) { problems.push('Das Inhaltsverzeichnis der .jar ist beschädigt.'); return problems; }
    const nameLen = view.getUint16(p + 28, true), extraLen = view.getUint16(p + 30, true), commentLen = view.getUint16(p + 32, true);
    names.push(decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen)));
    p += 46 + nameLen + extraLen + commentLen;
  }
  const meta = LOADER_METADATA[release.loader];
  if (meta && !names.includes(meta)) problems.push(`${meta} fehlt in der .jar.`);
  return problems;
}
