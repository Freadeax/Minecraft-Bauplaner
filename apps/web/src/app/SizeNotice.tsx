import { assessSize } from '../../../../packages/voxel/src/index.js';

/**
 * Hinweis für große Modelle (SIZE-01): ab „groß“ ein ruhiger Hinweis, ab „sehr groß“ eine Warnung,
 * über der harten Grenze ein Fehlerhinweis. Unter „groß“ erscheint nichts. Bricht selbst nie etwas ab –
 * die harte Grenze prüft der jeweilige Vorgang.
 */
export function SizeNotice({ cells, volume, context }: { cells: number; volume?: number; context?: string }) {
  const a = assessSize(cells, volume ?? cells);
  if (a.level === 'normal') return null;
  return <p className={a.level === 'gross' ? 'notice size-notice' : 'notice warning size-notice'} role="status" data-size-level={a.level}>
    {context && <b>{context}: </b>}{a.message}
  </p>;
}
