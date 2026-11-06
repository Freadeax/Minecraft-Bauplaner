import { useMemo, useState } from 'react';
import { MOD_COMMANDS, MOD_COMMAND_GROUPS, searchCommands } from './modCommands';
import type { Lang } from './modCommands';

/** GAME-12 (Mod 0.23.0): command list on #/mod in German and English, with search and groups. */
const LANG_KEY = 'bauplaner.mod.commandLang';
const readLang = (): Lang => { try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'de'; } catch { return 'de'; } };

export function ModCommands() {
  const [lang, setLang] = useState<Lang>(readLang);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const pick = (l: Lang) => { setLang(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode */ } };
  const shown = useMemo(() => searchCommands(MOD_COMMANDS, query, group), [query, group]);
  const en = lang === 'en';
  return <section className="system-card system-wide mod-commands" aria-labelledby="mod-commands">
    <h2 id="mod-commands">{en ? 'Commands (German and English)' : 'Befehle (Deutsch und Englisch)'}</h2>
    <p className="muted">{en
      ? <>Every command works as <code>/bauplaner …</code> with German words and as <code>/buildplanner …</code> with English words. Tab completion follows the game language; <code>/buildplanner language english|german|auto</code> switches it. Easiest without typing: press <b>J</b> in the game → “Commands &amp; status”.</>
      : <>Jeder Befehl geht als <code>/bauplaner …</code> mit deutschen und als <code>/buildplanner …</code> mit englischen Wörtern. Die Tab-Vervollständigung folgt der Spielsprache; <code>/bauplaner sprache deutsch|englisch|auto</code> stellt sie um. Am einfachsten ohne Tippen: im Spiel <b>J</b> → „Befehle &amp; Status“.</>}</p>
    <div className="mod-commands-bar">
      <div className="seg" role="group" aria-label={en ? 'Language' : 'Sprache'}>
        <button type="button" aria-pressed={!en} onClick={() => pick('de')}>Deutsch</button>
        <button type="button" aria-pressed={en} onClick={() => pick('en')}>English</button>
      </div>
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={en ? 'Search, e.g. section, scan, chest' : 'Suchen, z. B. Abschnitt, Aufnahme, Kiste'} aria-label={en ? 'Search commands' : 'Befehle suchen'} />
    </div>
    <div className="chips" role="group" aria-label={en ? 'Group' : 'Gruppe'}>
      <button type="button" aria-pressed={group === null} onClick={() => setGroup(null)}>{en ? 'All' : 'Alle'}</button>
      {MOD_COMMAND_GROUPS.map(g => <button key={g.de} type="button" aria-pressed={group === g.de} onClick={() => setGroup(group === g.de ? null : g.de)}>{en ? g.en : g.de}</button>)}
    </div>
    <p className="muted" role="status">{shown.length} {en ? (shown.length === 1 ? 'command' : 'commands') : (shown.length === 1 ? 'Befehl' : 'Befehle')}</p>
    <ul className="mod-command-list">
      {shown.map(c => { const t = en ? c.en : c.de; return <li key={c.id}>
        <div><b>{t.label}</b>{c.side === 'plugin' && <span className="badge">{en ? 'server plugin' : 'Server-Plugin'}</span>}</div>
        <code>{t.command}</code>
        <small>{t.help}</small>
      </li>; })}
    </ul>
  </section>;
}
