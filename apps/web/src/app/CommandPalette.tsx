import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project } from '../../../../packages/domain/src/index.js';
import { useApp } from './context';
import { Icon, tabIcon } from './icons';
import type { IconName } from './icons';
import { mainNav } from './nav';
import { parseRoute } from './router';
import { projectTabs } from '../views/project/tabs';

/** Öffnet die Schnellsuche von außerhalb (Kopfzeile, untere Leiste). */
export const PALETTE_EVENT = 'bauplaner:schnellsuche';
export const openPalette = (): void => { window.dispatchEvent(new Event(PALETTE_EVENT)); };

interface Entry { readonly key: string; readonly group: string; readonly label: string; readonly hint: string; readonly href: string; readonly icon: IconName }

const PAGES: readonly Omit<Entry, 'key' | 'group'>[] = [
  ...mainNav.map(n => ({ label: n.label, hint: n.hint, href: n.href, icon: n.icon })),
  { label: 'Ensembles', hint: 'Fertige Gebäudegruppen als Vorlage', href: '#/bibliothek/ensembles', icon: 'library' },
  { label: 'Generatoren', hint: 'Haus, Turm, Mauer, Brücke, Dach nach Maß', href: '#/bibliothek/generatoren', icon: 'library' },
  { label: 'Mod herunterladen', hint: 'Bauplaner-Brücke für Minecraft: Version wählen und .jar laden', href: '#/mod', icon: 'export' },
  { label: 'Werkstatt', hint: 'Blockeditor: neues Bauteil Block für Block bauen', href: '#/werkstatt/neu', icon: 'editor' },
  { label: 'Systemcheck', hint: 'Auslieferung, Speicher, Datencheck, Fehlerprotokoll', href: '#/system', icon: 'system' },
];

/** Klein, ohne Akzente: „Brücke“ findet man auch mit „brucke“. */
const fold = (s: string): string => s.toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

function score(entry: Entry, words: readonly string[]): number {
  if (words.length === 0) return 1;
  const label = fold(entry.label), all = `${label} ${fold(entry.hint)}`;
  if (!words.every(w => all.includes(w))) return 0;
  return label.startsWith(words[0]!) ? 3 : words.every(w => label.includes(w)) ? 2 : 1;
}

const LIMIT: Readonly<Record<string, number>> = { Seiten: 8, 'Dieses Projekt': 10, Projekte: 6, Gebäude: 8 };

/**
 * Schnellsuche (Strg+K / ⌘K): springt zu Seiten, Projekten, Bereichen des
 * offenen Projekts und Bibliotheksgebäuden. Rein lokal, nur Navigation.
 */
export function CommandPalette() {
  const { repo, library } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<readonly Project[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<Element | null>(null);

  useEffect(() => {
    const show = () => { returnFocus.current = document.activeElement; setQuery(''); setActive(0); setOpen(true); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); show(); }
    };
    window.addEventListener(PALETTE_EVENT, show);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener(PALETTE_EVENT, show); window.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    repo.listProjects().then(list => { if (alive) setProjects([...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); }).catch(() => {});
    input.current?.focus();
    return () => { alive = false; };
  }, [open, repo]);

  const entries = useMemo(() => {
    if (!open) return [];
    const route = parseRoute(window.location.hash);
    const current = route.view === 'project' ? projects.find(p => p.id === route.projectId) : undefined;
    const all: Entry[] = [
      ...PAGES.map(p => ({ ...p, key: `seite:${p.href}`, group: 'Seiten' })),
      ...(route.view === 'project' ? projectTabs.map(t => ({
        key: `bereich:${t.id}`, group: 'Dieses Projekt', label: t.label, hint: current?.name ?? 'Projektbereich', icon: tabIcon(t.id),
        href: `#/projekt/${encodeURIComponent(route.projectId)}${t.id === 'editor' ? '' : `/${t.id}`}`,
      })) : []),
      ...projects.map(p => ({ key: `projekt:${p.id}`, group: 'Projekte', label: p.name, hint: `${p.instances.length} Bauteile`, href: `#/projekt/${encodeURIComponent(p.id)}`, icon: 'projects' as const })),
      ...library.assets.filter(a => !a.archived).map(a => ({
        key: `gebaeude:${a.id}`, group: 'Gebäude', label: a.name, hint: a.tags.filter(t => /^(kategorie|stil|biom):/.test(t)).map(t => t.split(':')[1]).join(' · '),
        href: `#/bibliothek/gebaeude/${encodeURIComponent(a.id)}`, icon: 'building' as const,
      })),
    ];
    const words = fold(query).split(/\s+/).filter(Boolean);
    const groups = new Map<string, { entry: Entry; s: number }[]>();
    for (const entry of all) {
      const s = score(entry, words);
      if (s > 0) groups.set(entry.group, [...(groups.get(entry.group) ?? []), { entry, s }]);
    }
    // Ohne Eingabe nur Seiten, Bereiche und zuletzt geänderte Projekte; Gebäude erst beim Tippen.
    if (words.length === 0) groups.delete('Gebäude');
    return [...groups.entries()].flatMap(([group, list]) =>
      list.sort((a, b) => b.s - a.s || a.entry.label.localeCompare(b.entry.label, 'de')).slice(0, LIMIT[group] ?? 6).map(x => x.entry));
  }, [open, query, projects, library]);

  if (!open) return null;
  const close = () => { setOpen(false); (returnFocus.current as HTMLElement | null)?.focus?.(); };
  const go = (entry: Entry | undefined) => { if (!entry) return; setOpen(false); window.location.hash = entry.href; };
  const pick = Math.min(active, Math.max(0, entries.length - 1));
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((pick + 1) % Math.max(1, entries.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((pick - 1 + entries.length) % Math.max(1, entries.length)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(entries[pick]); }
    else if (e.key === 'Tab') e.preventDefault();
  };
  let lastGroup = '';
  return <div className="palette-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="palette" role="dialog" aria-modal="true" aria-label="Schnellsuche" onKeyDown={onKeyDown}>
      <div className="palette-input"><Icon name="search" />
        <input ref={input} value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} placeholder="Seite, Projekt oder Gebäude suchen …"
          role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list"
          aria-activedescendant={entries[pick] ? `palette-${pick}` : undefined} aria-label="Schnellsuche" />
        <kbd>Esc</kbd></div>
      <ul id="palette-list" role="listbox" aria-label="Treffer" className="palette-list">
        {entries.map((entry, i) => {
          const head = entry.group !== lastGroup ? entry.group : '';
          lastGroup = entry.group;
          return <li key={entry.key} role="presentation">
            {head && <span className="palette-group" aria-hidden="true">{head}</span>}
            <div id={`palette-${i}`} role="option" aria-selected={i === pick} className="palette-item"
              onMouseMove={() => { if (i !== pick) setActive(i); }} onClick={() => go(entry)}>
              <Icon name={entry.icon} /><span><strong>{entry.label}</strong>{entry.hint && <small>{entry.hint}</small>}</span>
              <span className="palette-kind">{entry.group === 'Gebäude' ? 'Gebäude' : entry.group === 'Projekte' ? 'Projekt' : ''}</span>
            </div></li>;
        })}
      </ul>
      {entries.length === 0 && <p className="palette-empty">Nichts gefunden für „{query.trim()}“.</p>}
      <p className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> wählen</span><span><kbd>Enter</kbd> öffnen</span><span><kbd>Strg</kbd>+<kbd>K</kbd> jederzeit</span></p>
    </div>
  </div>;
}
