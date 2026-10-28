/**
 * Delivery check (S-03): compares the files the browser actually receives
 * with the hash manifest `deployment.json` written by prepare_pages.mjs.
 * Finds stale caches and half-finished Pages deployments. Plain TypeScript
 * without runtime imports so Node tests can load it directly.
 */
export interface DeploymentManifest {
  readonly schemaVersion: number;
  readonly sourceCommit: string;
  readonly builtAt: string;
  readonly files: readonly { readonly path: string; readonly bytes: number; readonly sha256: string }[];
}

export type FileVerdict = 'ok' | 'changed' | 'missing';
export interface DeliveryResult {
  readonly checked: number;
  readonly ok: number;
  readonly problems: readonly { readonly path: string; readonly verdict: Exclude<FileVerdict, 'ok'>; readonly detail: string }[];
}

/** Rejects anything that is not a manifest of this app, so a wrong file never reads as "all fine". */
export function parseManifest(raw: unknown): DeploymentManifest {
  const m = raw as Partial<DeploymentManifest> | null;
  if (!m || typeof m !== 'object' || m.schemaVersion !== 1 || typeof m.sourceCommit !== 'string' || !/^[0-9a-f]{7,40}$/.test(m.sourceCommit) || !Array.isArray(m.files))
    throw new Error('deployment.json hat ein unbekanntes Format');
  for (const f of m.files) if (typeof f?.path !== 'string' || typeof f.sha256 !== 'string' || typeof f.bytes !== 'number') throw new Error('deployment.json enthält ungültige Dateieinträge');
  return m as DeploymentManifest;
}

/** Code and style files decide what runs; examples and notices are skipped to keep the check quick. */
export const shouldVerify = (path: string): boolean => /\.(js|css|html|svg)$/.test(path);

export async function verifyDelivery(
  manifest: DeploymentManifest,
  fetchBytes: (path: string) => Promise<Uint8Array | null>,
  sha256: (bytes: Uint8Array) => Promise<string>,
): Promise<DeliveryResult> {
  const files = manifest.files.filter(f => shouldVerify(f.path));
  const problems: DeliveryResult['problems'][number][] = [];
  await Promise.all(files.map(async f => {
    let bytes: Uint8Array | null;
    try { bytes = await fetchBytes(f.path); } catch (e) { bytes = null; problems.push({ path: f.path, verdict: 'missing', detail: e instanceof Error ? e.message : String(e) }); return; }
    if (!bytes) { problems.push({ path: f.path, verdict: 'missing', detail: 'nicht abrufbar' }); return; }
    const hash = await sha256(bytes);
    if (hash !== f.sha256) problems.push({ path: f.path, verdict: 'changed', detail: `${bytes.length} statt ${f.bytes} Bytes, Prüfsumme abweichend` });
  }));
  problems.sort((a, b) => a.path.localeCompare(b.path));
  return { checked: files.length, ok: files.length - problems.length, problems };
}
