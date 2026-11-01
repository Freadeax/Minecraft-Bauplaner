import { useSyncExternalStore } from 'react';
import type { Atlas } from './atlas.ts';
import type { BlockRenderer } from './mesh.ts';
import type { PackMeta, PackSourceInfo, TexturePack } from './pack.ts';
import { fallbackRenderer } from './renderers.ts';

export const DEFAULT_VERSION = '26.3';
const packKit = () => import('./packKit.ts');

/**
 * Current block look of the whole app: own shapes in average colours, or real
 * models and textures once the user loaded a texture source. Views subscribe
 * and redraw when it changes; still images use `kit.key` in their cache keys.
 */
export interface RenderKit {
  readonly renderer: BlockRenderer;
  readonly atlas: Atlas;
  readonly key: string;
  readonly textured: boolean;
}
export type PackStatus =
  | { readonly state: 'none' }
  | { readonly state: 'loading'; readonly step: string; readonly fraction?: number | undefined }
  | { readonly state: 'ready'; readonly meta: PackMeta }
  | { readonly state: 'error'; readonly message: string; readonly meta?: PackMeta };

let plainKit: RenderKit | null = null;
let kit: RenderKit | null = null;
let pack: TexturePack | null = null;
let status: PackStatus = { state: 'none' };
let atlasPending: Promise<RenderKit> | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function plain(): RenderKit {
  if (!plainKit) {
    const renderer = fallbackRenderer();
    // The plain atlas only holds the neutral tile; building it never waits on image decoding.
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d')!, img = ctx.createImageData(16, 16);
    let seed = 7;
    for (let i = 0; i < 256; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const edge = (i % 16 === 0 || i % 16 === 15 || i < 16 || i >= 240) ? 18 : 0, v = 238 - (seed % 22) - edge;
      img.data.set([v, v, v, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    const slot = { rect: [0.001, 0.001, 0.999, 0.999] as const, layer: 0 as const };
    plainKit = { renderer, key: renderer.key, textured: false, atlas: { canvas, sprites: 0, lookup: () => slot } };
  }
  return plainKit;
}

/** The kit to draw with right now (own shapes until a texture source is ready). */
export function currentKit(): RenderKit { return kit ?? plain(); }
/** Mojang's release versions (newest first); loads the pack module on demand. */
export async function releaseVersions(): Promise<string[]> { return (await (await packKit()).mojangReleases()).map(v => v.id); }

/** Resolves once a stored or freshly loaded source has its atlas; immediately with the current kit otherwise. */
export function readyKit(): Promise<RenderKit> { return atlasPending ?? Promise.resolve(currentKit()); }
export function packStatus(): PackStatus { return status; }

export function useRenderKit(): RenderKit { return useSyncExternalStore(subscribe, currentKit); }
export function usePackStatus(): PackStatus { return useSyncExternalStore(subscribe, packStatus); }

async function activate(next: TexturePack): Promise<void> {
  const build = packKit().then(m => m.buildPackKit(next));
  atlasPending = build;
  try {
    const built = await build;
    pack = next; kit = built;
    status = { state: 'ready', meta: next.meta };
  } finally { atlasPending = null; emit(); }
}

const setStatus = (s: PackStatus) => { status = s; emit(); };
const failure = (e: unknown) => setStatus({ state: 'error', message: e instanceof Error ? e.message : String(e), ...(pack && { meta: pack.meta }) });

let started = false;
/** Restores the texture source stored in this browser, if any. */
export function initTextures(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  packKit().then(m => m.loadStoredPack()).then(stored => stored ? activate(stored) : undefined).catch(() => { /* no stored source: own shapes stay */ });
}

async function install(files: Map<string, Uint8Array>, sources: readonly PackSourceInfo[]): Promise<void> {
  if (![...files.keys()].some(k => k.includes('/blockstates/'))) throw new Error('Keine Blockzustände gefunden: zuerst die Minecraft-Client-Jar laden, Ressourcenpakete ergänzen nur Texturen.');
  setStatus({ state: 'loading', step: 'Texturatlas erstellen' });
  const m = await packKit();
  const next: TexturePack = { meta: m.makeMeta(sources, files), files };
  await activate(next);
  setStatus({ state: 'loading', step: 'Im Browser speichern' });
  try { await m.savePack(next); } catch { /* still usable for this session */ }
  setStatus({ state: 'ready', meta: next.meta });
}

/** Downloads the client jar of `version` from Mojang into this browser. */
export async function installFromMojang(version: string): Promise<void> {
  try {
    setStatus({ state: 'loading', step: 'Verbindung zu Mojang' });
    const { files, info } = await (await packKit()).loadFromMojang(version, (step, fraction) => setStatus({ state: 'loading', step, fraction }));
    await install(files, [info]);
  } catch (e) { failure(e); }
}

/** Adds user files (client jar, resource packs, mod jars); `add` keeps the current source underneath. */
export async function installFromFiles(list: readonly File[], add: boolean): Promise<void> {
  try {
    setStatus({ state: 'loading', step: 'Dateien lesen' });
    const base = add && pack ? new Map(pack.files) : new Map<string, Uint8Array>();
    const { files, infos } = await (await packKit()).loadFromFiles(list, base, (step, fraction) => setStatus({ state: 'loading', step, fraction }));
    await install(files, [...(add && pack ? pack.meta.sources : []), ...infos]);
  } catch (e) { failure(e); }
}

export async function removeTextures(): Promise<void> {
  pack = null; kit = null;
  setStatus({ state: 'none' });
  try { await (await packKit()).deleteStoredPack(); } catch { /* nothing stored */ }
}
