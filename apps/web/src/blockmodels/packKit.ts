import type { RenderKit } from './assets.ts';
import { buildAtlas } from './atlas.ts';
import { packSource, referencedSprites } from './pack.ts';
import type { TexturePack } from './pack.ts';
import { packRenderer } from './renderers.ts';

/** Loading, storing and atlas building of texture sources; loaded on demand so the main bundle stays small. */
export { deleteStoredPack, loadFromFiles, loadFromMojang, loadStoredPack, makeMeta, mojangReleases, savePack } from './pack.ts';

export async function buildPackKit(pack: TexturePack): Promise<RenderKit> {
  const atlas = await buildAtlas([...referencedSprites(pack.files)], pack.files);
  const renderer = packRenderer(packSource(pack.files), `pack:${pack.meta.id}`);
  return { renderer, atlas, key: renderer.key, textured: true };
}
