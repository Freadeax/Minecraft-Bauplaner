import type { Layer, SpriteLookup, SpriteSlot } from './mesh.ts';
import { spriteFile } from './model.ts';

/**
 * Texture atlas on a canvas: one 16×16 tile per sprite (first animation frame,
 * larger textures scaled down), plus a neutral tile for colour sprites and a
 * missing-texture tile. Each tile is classified opaque / cutout / translucent
 * from its alpha channel. Lives only in the browser.
 */
export interface Atlas {
  readonly canvas: HTMLCanvasElement;
  readonly lookup: SpriteLookup;
  readonly sprites: number;
}

const TILE = 16;

function noiseTile(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Neutral light tile with a faint pixel pattern so plain colours still read as blocks.
  const img = ctx.createImageData(TILE, TILE);
  let seed = 7;
  for (let i = 0; i < TILE * TILE; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const edge = (i % TILE === 0 || i % TILE === TILE - 1 || i < TILE || i >= TILE * (TILE - 1)) ? 18 : 0;
    const v = 238 - (seed % 22) - edge;
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, x, y);
}
function missingTile(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#f800f8'; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#000000'; ctx.fillRect(x, y, 8, 8); ctx.fillRect(x + 8, y + 8, 8, 8);
}

function classify(data: Uint8ClampedArray): Layer {
  let clear = false;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i]!;
    if (a === 255) continue;
    if (a > 10 && a < 245) return 2;
    clear = true;
  }
  return clear ? 1 : 0;
}

async function decode(bytes: Uint8Array): Promise<ImageBitmap | null> {
  try { return await createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/png' })); } catch { return null; }
}

/** Builds the atlas for the given sprite ids from pack files; without files only the neutral and missing tiles exist. */
export async function buildAtlas(sprites: readonly string[], files: ReadonlyMap<string, Uint8Array> | null): Promise<Atlas> {
  const list = files ? sprites.filter(s => files.has(spriteFile(s))) : [];
  const count = list.length + 2, cols = Math.ceil(Math.sqrt(count));
  const size = Math.max(64, 2 ** Math.ceil(Math.log2(cols * TILE)));
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  const slots = new Map<string, SpriteSlot>();
  // Tiny inset keeps nearest sampling inside the tile.
  const rect = (i: number): [number, number, number, number] => {
    const x = (i % cols) * TILE, y = Math.floor(i / cols) * TILE, e = 0.02;
    return [(x + e) / size, (y + e) / size, (x + TILE - e) / size, (y + TILE - e) / size];
  };
  noiseTile(ctx, 0, 0);
  slots.set('#', { rect: rect(0), layer: 0 });
  missingTile(ctx, (1 % cols) * TILE, Math.floor(1 / cols) * TILE);
  const missing: SpriteSlot = { rect: rect(1), layer: 0 };
  const images = await Promise.all(list.map(s => decode(files!.get(spriteFile(s))!)));
  list.forEach((sprite, k) => {
    const img = images[k], i = k + 2;
    if (!img) { slots.set(sprite, missing); return; }
    const x = (i % cols) * TILE, y = Math.floor(i / cols) * TILE, w = img.width;
    ctx.clearRect(x, y, TILE, TILE);
    // Animated textures are vertical strips of square frames: draw the first frame.
    ctx.drawImage(img, 0, 0, w, Math.min(w, img.height), x, y, TILE, TILE);
    img.close();
    slots.set(sprite, { rect: rect(i), layer: classify(ctx.getImageData(x, y, TILE, TILE).data) });
  });
  return { canvas, sprites: list.length, lookup: sprite => slots.get(sprite) ?? missing };
}
