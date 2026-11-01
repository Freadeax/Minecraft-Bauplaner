export const THEME_IDS = Object.freeze(['modern', 'medieval', 'industrial', 'fantasy', 'nether']);
export const normalizeTheme = value => THEME_IDS.includes(value) ? value : 'modern';
