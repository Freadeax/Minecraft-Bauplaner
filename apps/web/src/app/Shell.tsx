import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Route } from './router';
import { Cube, REPO_URL } from './ui';
import { Icon } from './icons';
import { fileTools, mainNav, routeTitle } from './nav';
import { openPalette } from './CommandPalette';
import { ThemeControl } from '../theme/ThemeControl';
import { TextureChip } from '../blockmodels/TexturePanel';

const APP_NAME = 'LMNT — Build Studio';
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Setzt den Titel des Browser-Tabs; Seiten mit eigenem Namen (Projekte) überschreiben ihn. */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => { if (title) document.title = `${title} · ${APP_NAME}`; }, [title]);
}

/**
 * App-Hülle: Sprunglink, Kopfzeile mit Hauptnavigation und Schnellsuche,
 * Inhalt, Fußzeile und am Handy eine untere Navigationsleiste. Die Einträge
 * kommen aus nav.ts, damit Kopfzeile, Leiste und Suche nie auseinanderlaufen.
 */
export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  useDocumentTitle(route.view === 'project' ? undefined : routeTitle(route));
  const current = (views: readonly Route['view'][]) => views.includes(route.view) ? 'page' as const : undefined;
  return <>
    <a className="skip" href="#inhalt" onClick={e => { e.preventDefault(); document.getElementById('inhalt')?.focus(); }}>Zum Inhalt</a>
    <header className="topbar">
      <a className="brand" href="#/" aria-label={`${APP_NAME} – zur Projektzentrale`}><span className="brand-icon"><Cube /></span>
        <span className="brand-text">LMNT <strong>— BUILD STUDIO</strong><small>DEIN MINECRAFT-BAUHELFER</small></span></a>
      <nav className="main-nav" aria-label="Hauptnavigation">
        {mainNav.map(n => <a key={n.id} href={n.href} aria-current={current(n.views)} data-nav={n.id} title={n.hint}><Icon name={n.icon} /><span className="nav-label">{n.label}</span></a>)}
      </nav>
      <button type="button" className="search-trigger" onClick={openPalette} aria-keyshortcuts="Control+K Meta+K" aria-label="Schnellsuche öffnen" title="Schnellsuche öffnen">
        <Icon name="search" /><span className="search-label">Suchen …</span><kbd>{isMac ? '⌘' : 'Strg'} K</kbd></button>
      <a className="topbar-icon" href={REPO_URL} target="_blank" rel="noreferrer" title="Quellcode auf GitHub (neuer Tab)"><Icon name="github" /><span className="sr-only">GitHub</span></a>
      <ThemeControl />
      <TextureChip />
      <span className="version" title="Vorabversion: Funktionen und Datenformat können sich noch ändern"><span /> Vorabversion 0.2</span>
    </header>
    <div id="inhalt" tabIndex={-1} className="content">{children}</div>
    <footer className="site-footer">
      <span><strong>LMNT — BUILD STUDIO</strong> · Mit Plan gebaut. Alles bleibt lokal in deinem Browser.</span>
      <nav aria-label="Weitere Links"><a href="#/mod">Minecraft-Mod</a>{fileTools.map(n => <a key={n.id} href={n.href} title={n.hint}>{n.label}</a>)}<a href="#/system">Systemcheck</a><a href="#/testphase">Testphase</a><a href={REPO_URL} target="_blank" rel="noreferrer">GitHub ↗</a></nav>
      <span className="footer-legal">Unabhängiges Projekt · kein offizielles Minecraft-Produkt</span>
    </footer>
    <nav className="bottom-nav" aria-label="Hauptnavigation mobil">
      {mainNav.map(n => <a key={n.id} href={n.href} aria-current={current(n.views)}><Icon name={n.icon} size={20} /><span>{n.label}</span></a>)}
      <button type="button" onClick={openPalette}><Icon name="search" size={20} /><span>Suchen</span></button>
    </nav>
  </>;
}
