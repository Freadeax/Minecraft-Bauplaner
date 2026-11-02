import { useMemo, useState } from 'react';
import { BUILTIN_STENCILS, STENCIL_TAG, clipboardFromPayload, commitDraftAsNewAsset, draftFromClipboard } from '../../../../packages/domain/src/index.js';
import type { Clipboard } from '../../../../packages/domain/src/index.js';
import { useApp } from '../app/context';
import { errorText, formatNumber } from '../app/ui';

const LIST_LIMIT = 30;

/**
 * Schablonen (EDIT-03): built-in detail parts, the user's own stencils
 * (library modules tagged „schablone“, so they are stored, versioned and in
 * backups like every asset) and any library part. Choosing one fills the
 * clipboard and switches to „Einfügen“; R turns it before placing.
 */
export function StencilPanel({ profileId, onClip, selectionClip, onMessage }: {
  profileId: string;
  onClip: (clip: Clipboard, label: string) => void;
  /** Content of the current selection, null without selection. */
  selectionClip: () => Clipboard | null;
  onMessage: (text: string) => void;
}) {
  const { repo, library, reloadLibrary } = useApp();
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const latest = (versionIds: readonly string[]) => library.versions.get(versionIds.at(-1) ?? '');
  const own = useMemo(() => library.assets.filter(a => !a.archived && a.tags.includes(STENCIL_TAG)), [library.assets]);
  const hits = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('de-DE');
    if (!q) return [];
    return library.assets.filter(a => !a.archived && !a.tags.includes(STENCIL_TAG) && (a.name.toLocaleLowerCase('de-DE').includes(q) || a.tags.some(t => t.toLocaleLowerCase('de-DE').includes(q))));
  }, [library.assets, query]);

  const load = (assetName: string, versionIds: readonly string[]) => {
    const v = latest(versionIds);
    if (!v) { onMessage(`„${assetName}“: Version nicht geladen.`); return; }
    try { onClip(clipboardFromPayload(v.payload), `„${assetName}“ v${v.label}`); } catch (e) { onMessage(errorText(e)); }
  };
  const saveSelection = async () => {
    const clip = selectionClip();
    if (!clip || !clip.cells.length) { onMessage('Erst einen Bereich mit Blöcken auswählen.'); return; }
    setBusy(true);
    try {
      const label = name.trim() || `Schablone ${own.length + 1}`;
      const r = await commitDraftAsNewAsset(draftFromClipboard(clip, profileId), { name: label, description: 'Im Blockeditor als Schablone gespeichert.', tags: [STENCIL_TAG] });
      await repo.applyBatch({ assets: [r.asset], versions: [r.version] });
      await reloadLibrary();
      setName('');
      onMessage(`Schablone „${label}“ gespeichert (${formatNumber(clip.cells.length)} Zellen). Sie liegt auch in der Bibliothek.`);
    } catch (e) { onMessage(errorText(e)); } finally { setBusy(false); }
  };

  return <section className="panel-lite stencil-panel" aria-label="Schablonen">
    <span className="panel-kicker">SCHABLONEN</span>
    <div className="stencil-list" role="group" aria-label="Fertige Schablonen">
      {BUILTIN_STENCILS.map(s => <button key={s.id} title={s.hint} onClick={() => onClip(s.clip, s.label)}>{s.label}</button>)}
    </div>
    {own.length > 0 && <>
      <span className="muted small">Meine Schablonen</span>
      <div className="stencil-list" role="group" aria-label="Meine Schablonen">
        {own.map(a => <button key={a.id} onClick={() => load(a.name, a.versionIds)}>{a.name}</button>)}
      </div>
    </>}
    <div className="stencil-save">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name der Schablone" maxLength={120} aria-label="Name der Schablone" />
      <button disabled={busy} onClick={() => void saveSelection()} title="Inhalt der Auswahl als eigene Schablone (Bauteil mit Schlagwort „schablone“) speichern">Auswahl speichern</button>
    </div>
    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Bauteil aus der Bibliothek …" aria-label="Bauteil als Schablone suchen" />
    {hits.length > 0 && <div className="stencil-list" role="group" aria-label="Bauteile aus der Bibliothek">
      {hits.slice(0, LIST_LIMIT).map(a => <button key={a.id} onClick={() => load(a.name, a.versionIds)}>{a.name}</button>)}
      {hits.length > LIST_LIMIT && <span className="muted small">{hits.length - LIST_LIMIT} weitere – Suche verfeinern.</span>}
    </div>}
    {query && !hits.length && <span className="muted small">Kein Bauteil gefunden.</span>}
  </section>;
}
