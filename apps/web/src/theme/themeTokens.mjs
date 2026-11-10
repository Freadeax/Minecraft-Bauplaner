// UI-04: „LMNT“ ist das Standardthema – Tinte, Signalrot und Papier wie auf lmnt-gaming.net.
// „Werkbank“ (UI-03, Grasgrün auf Tiefenschiefer) und die übrigen Themen bleiben wählbar.
// accent2 ist die Zweitfarbe für Hinweise, Fortschritt und kleine Akzente.
const palettes = {
  lmnt: { accent: '#ff3131', accent2: '#f2efe8', surface: '#111018', canvas: '#08070c', text: '#fffdf8' },
  werkbank: { accent: '#7fd494', accent2: '#e9c46a', surface: '#1a2220', canvas: '#111715', text: '#edf3ee' },
  modern: { accent: '#70b8f0', accent2: '#f2c879', surface: '#182331', canvas: '#101820', text: '#f1f6fc' },
  medieval: { accent: '#e7b86e', accent2: '#9fd3a8', surface: '#29231d', canvas: '#191713', text: '#fff2d9' },
  industrial: { accent: '#f6b26b', accent2: '#8fc6e8', surface: '#24272b', canvas: '#16191c', text: '#f4f4f2' },
  fantasy: { accent: '#d3a6fa', accent2: '#f4c27a', surface: '#28203b', canvas: '#171426', text: '#faf1ff' },
  nether: { accent: '#ff938a', accent2: '#f2c46b', surface: '#301d25', canvas: '#1c1118', text: '#fff1ed' }
};
const lightPalettes = {
  lmnt: {accent:'#c20d1f',accent2:'#08070c',surface:'#fffdf8',canvas:'#f2efe8',text:'#08070c'},
  werkbank: {accent:'#2d6c3c',accent2:'#8a5a00',surface:'#ffffff',canvas:'#f1efe7',text:'#1c2621'},
  modern: {accent:'#234c77',accent2:'#8a5300',surface:'#ffffff',canvas:'#f1f3f6',text:'#172331'},
  medieval: {accent:'#775018',accent2:'#2d6a3a',surface:'#fffaf0',canvas:'#f3ebdc',text:'#332719'},
  industrial: {accent:'#854209',accent2:'#245f86',surface:'#fafafa',canvas:'#e9ecef',text:'#24272b'},
  fantasy: {accent:'#694096',accent2:'#8a5300',surface:'#fdf9ff',canvas:'#efe8f6',text:'#30213f'},
  nether: {accent:'#a0322b',accent2:'#7a5200',surface:'#fff9f7',canvas:'#f5e7e4',text:'#3c2428'}
};
export const THEME_IDS = Object.freeze(Object.keys(palettes));
export const APPEARANCES = Object.freeze(['dark', 'light', 'system']);
export const DEFAULT_THEME = 'lmnt';
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
