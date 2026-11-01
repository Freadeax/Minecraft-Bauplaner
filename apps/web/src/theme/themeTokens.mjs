const palettes = {
  modern: { accent: '#70b8f0', surface: '#182331', canvas: '#101820', text: '#f1f6fc' },
  medieval: { accent: '#e7b86e', surface: '#29231d', canvas: '#191713', text: '#fff2d9' },
  industrial: { accent: '#f6b26b', surface: '#24272b', canvas: '#16191c', text: '#f4f4f2' },
  fantasy: { accent: '#d3a6fa', surface: '#28203b', canvas: '#171426', text: '#faf1ff' },
  nether: { accent: '#ff938a', surface: '#301d25', canvas: '#1c1118', text: '#fff1ed' }
};
const lightPalettes = {
  modern: {accent:'#234c77',surface:'#ffffff',canvas:'#f1f3f6',text:'#172331'},
  medieval: {accent:'#775018',surface:'#fffaf0',canvas:'#f3ebdc',text:'#332719'},
  industrial: {accent:'#854209',surface:'#fafafa',canvas:'#e9ecef',text:'#24272b'},
  fantasy: {accent:'#694096',surface:'#fdf9ff',canvas:'#efe8f6',text:'#30213f'},
  nether: {accent:'#a0322b',surface:'#fff9f7',canvas:'#f5e7e4',text:'#3c2428'}
};
export const THEME_IDS = Object.freeze(Object.keys(palettes));
export const APPEARANCES = Object.freeze(['dark', 'light', 'system']);
export const DEFAULT_THEME = 'modern';
export function normalizeTheme(value) { return typeof value === 'string' && Object.hasOwn(palettes, value) ? value : DEFAULT_THEME; }
export function normalizeAppearance(value) { return APPEARANCES.includes(value) ? value : 'system'; }
export function resolveAppearance(value, prefersDark = true) { const v = normalizeAppearance(value); return v === 'system' ? (prefersDark ? 'dark' : 'light') : v; }
function rgb(hex) { return hex.slice(1).match(/.{2}/g).map(v => { const x = parseInt(v, 16) / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); }
function luminance(hex) { const [r,g,b] = rgb(hex); return .2126*r + .7152*g + .0722*b; }
export function contrastRatio(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
export function themeTokens(theme, appearance='dark') {
  const id=normalizeTheme(theme), mode=resolveAppearance(appearance);
  const tokens=mode === 'light' ? lightPalettes[id] : palettes[id];
  return Object.freeze({id,appearance:mode,colors:Object.freeze({...tokens}),spacing:Object.freeze({xs:4,sm:8,md:16,lg:24,xl:32}),radius:Object.freeze({sm:6,md:10,lg:16})});
}
