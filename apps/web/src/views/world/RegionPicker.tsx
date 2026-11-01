import { useRef } from 'react';
import { DIMENSIONS } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import type { RegionInfo } from './protocol';

/** Where the region files of a dimension lie inside a world folder (26.x layout first, older layout second). */
export const REGION_FOLDER: Readonly<Record<string, string>> = {
  'minecraft:overworld': 'dimensions/minecraft/overworld/region  ·  ältere Versionen: region',
  'minecraft:the_nether': 'dimensions/minecraft/the_nether/region  ·  ältere Versionen: DIM-1/region',
  'minecraft:the_end': 'dimensions/minecraft/the_end/region  ·  ältere Versionen: DIM1/region',
};

export interface PickedWorld {
  readonly regions: readonly RegionInfo[];
  readonly ignored: readonly string[];
  readonly duplicates: readonly string[];
}

const dateText = (s: number) => s ? new Date(s * 1000).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '–';
const sizeText = (b: number) => b >= 1_048_576 ? `${(b / 1_048_576).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB` : `${Math.ceil(b / 1024)} KB`;

/**
 * File and folder picker for region files. Files stay in the browser: the
 * worker reads only the headers now and single chunks later.
 */
export function RegionPicker({ dimension, onDimension, picked, busy, onFiles }: {
  dimension: string; onDimension?: (d: string) => void; picked: PickedWorld | null; busy: boolean; onFiles: (files: File[]) => void;
}) {
  const files = useRef<HTMLInputElement>(null), folder = useRef<HTMLInputElement>(null);
  const take = (list: FileList | null) => { if (list?.length) onFiles([...list].filter(f => /\.(mca|mcc)$/i.test(f.name) || list.length < 50)); };
  const newest = picked ? Math.max(0, ...picked.regions.map(r => r.newest)) : 0;
  const errors = picked?.regions.filter(r => r.error) ?? [];
  return <section className="world-pick" aria-label="Weltdateien">
    <div className="world-pick-row">
      {onDimension && <label>Dimension <select value={dimension} onChange={e => onDimension(e.target.value)}>
        {DIMENSIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>}
      <div className="button-row">
        <button className="primary" disabled={busy} onClick={() => files.current?.click()}>Regionsdateien wählen (.mca)</button>
        <button disabled={busy} onClick={() => folder.current?.click()}>Ordner „region“ wählen</button>
      </div>
      <input ref={files} className="file-input" type="file" multiple accept=".mca,.mcc" aria-label="Regionsdateien"
        onChange={e => { take(e.target.files); e.target.value = ''; }} />
      <input ref={folder} className="file-input" type="file" aria-label="Regionsordner" {...{ webkitdirectory: '', directory: '' }}
        onChange={e => { take(e.target.files); e.target.value = ''; }} />
    </div>
    <p className="world-hint">Ordner im Weltordner: <code>{REGION_FOLDER[dimension] ?? 'region'}</code>. Am sichersten ist eine Kopie, die entsteht, während die Welt geschlossen ist (Einzelspieler: Welt verlassen; Server: Sicherung oder nach <code>/save-all flush</code>). Die Dateien bleiben in deinem Browser und werden nicht hochgeladen.</p>
    {picked && <div className="world-files">
      <p role="status"><b>{picked.regions.length} Regionsdateien</b> · {formatNumber(picked.regions.reduce((a, r) => a + r.chunks, 0))} gespeicherte Chunks · zuletzt gespeichert {dateText(newest)}
        {picked.ignored.length > 0 && <> · {picked.ignored.length} andere Dateien ignoriert</>}</p>
      {errors.length > 0 && <div className="notice warning" role="alert"><strong>{errors.length} Regionsdateien unlesbar</strong><ul>{errors.map(r => <li key={r.name}>{r.error}</li>)}</ul></div>}
      {picked.duplicates.length > 0 && <div className="notice warning" role="alert">Doppelt gewählt und ignoriert: {picked.duplicates.join(', ')}</div>}
      <details><summary>Dateien</summary><ul className="world-file-list">{picked.regions.map(r => <li key={r.name}>
        <code>{r.name}</code> <span>X {r.rx * 512} … {r.rx * 512 + 511}, Z {r.rz * 512} … {r.rz * 512 + 511}</span>
        <small>{r.chunks} Chunks · {sizeText(r.size)} · {dateText(r.newest)}</small></li>)}</ul></details>
    </div>}
  </section>;
}
