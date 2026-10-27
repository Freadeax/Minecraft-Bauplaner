export const blockColors = ['#c7d4d5','#b58452','#895e39','#7cc3b4','#8e9ca9'];

/** Approximate preview colours; not Minecraft textures. Unknown ids get a stable hashed colour. */
const known: Record<string, string> = {
  'minecraft:stone': '#9a9d9f', 'minecraft:cobblestone': '#7d7f80', 'minecraft:stone_bricks': '#a3a6a8', 'minecraft:mossy_stone_bricks': '#7f9670',
  'minecraft:oak_planks': '#b58452', 'minecraft:oak_log': '#895e39', 'minecraft:oak_fence': '#a77a4b', 'minecraft:oak_stairs': '#b07d4c',
  'minecraft:spruce_planks': '#7a5a36', 'minecraft:glass': '#bfe3ea', 'minecraft:water': '#3f76e4', 'minecraft:lava': '#e4682a',
  'minecraft:sand': '#dbcf9c', 'minecraft:dirt': '#87623f', 'minecraft:grass_block': '#6d9b45', 'minecraft:barrel': '#8a6340',
};
export function stateColor(id: string): string {
  const hit = known[id];
  if (hit) return hit;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360, s = 0.35, l = 0.58;
  const f = (n: number) => { const k = (n + hue / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Mixes a hex colour towards another (t=0 → a, t=1 → b). */
export function mix(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16), pb = Number.parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
