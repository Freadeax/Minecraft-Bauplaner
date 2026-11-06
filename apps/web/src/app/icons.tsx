/**
 * Einheitliche Liniensymbole (24er-Raster, currentColor) für Navigation,
 * Projektbereiche und Schnellsuche. Immer dekorativ: die Beschriftung trägt
 * der Text daneben, daher aria-hidden.
 */
const PATHS = {
  projects: 'M3 7.5 12 3l9 4.5-9 4.5zM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5',
  library: 'M4 4h5v16H4zM10 4h4v16h-4zM15.5 4.6l3.9-1 3.6 15.5-3.9.9z',
  viewer: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  terrain: 'M3 19l5-8 3.5 4.5L14 12l7 7zM3 21h18M15.5 6.5a2 2 0 1 0 0 .1',
  map: 'M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7zM9 4v13M15 7v13',
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20',
  editor: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  build: 'M4 6h3M4 12h3M4 18h3M10 6h10M10 12h10M10 18h6',
  export: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  material: 'M4 7h16v13H4zM4 7l2-3h12l2 3M10 11h4',
  site: 'M3 20h18M5 20V10l5-3v13M10 20V4l9 5v11M13 12h3M13 16h3',
  system: 'M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6zM8.5 12l2.5 2.5 4.5-5',
  github: 'M9 19c-4 1.3-4-2-6-2.5m12 4.5v-3.2c0-.9.1-1.5-.5-2.1 2.6-.3 5.5-1.3 5.5-5.9A4.6 4.6 0 0 0 18.8 6.5 4.3 4.3 0 0 0 18.7 3.3S17.6 3 15 4.7a12.6 12.6 0 0 0-6 0C6.4 3 5.3 3.3 5.3 3.3a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.8c0 4.6 2.9 5.6 5.5 5.9-.6.6-.6 1.2-.5 2.1V21',
  building: 'M4 21V10l8-6 8 6v11zM9.5 21v-6h5v6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  page: 'M6 3h9l4 4v14H6zM14 3v5h5',
  game: 'M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6h-6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4zM7 11v3M5.5 12.5h3M15.5 11.5h.01M18 13.5h.01',
  team: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6.5 6.5 0 0 1 3.5 5.5',
  update: 'M20 11a8 8 0 0 0-14.6-4.5M4 3.5v3.5h3.5M4 13a8 8 0 0 0 14.6 4.5M20 20.5V17h-3.5',
  guide: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2.2-2.5 3.8M12 17h.01',
  link: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1',
  check: 'M4 12.5 9.5 18 20 6',
  hologram: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9M8 5.2v9M16 5.2v9',
} as const;

/** Pfad eines Symbols, für Grafiken, die das Symbol selbst in ein größeres SVG setzen (Anleitung). */
export const iconPath = (name: IconName): string => PATHS[name];

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={PATHS[name]} /></svg>;
}

/** Symbol je Projektbereich (tabs.ts); unbekannte Bereiche bekommen ein neutrales Blatt. */
export function tabIcon(id: string): IconName {
  const known: Record<string, IconName> = { editor: 'editor', bauen: 'build', export: 'export', material: 'material', baustelle: 'site', planung: 'site', karte: 'map', bloecke: 'building', gelaende: 'terrain', landschaft: 'terrain', updates: 'update', team: 'team' };
  return known[id] ?? 'page';
}
