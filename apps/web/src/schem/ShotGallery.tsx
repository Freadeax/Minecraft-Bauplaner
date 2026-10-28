import { useMemo, useState } from 'react';
import type { VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { Thumb, shotUrl } from '../thumbnail/Thumb';
import { SHOTS, shotFileName } from '../thumbnail/views';
import type { ShotView } from '../thumbnail/views';
import { layerIndex } from './layers';

/**
 * Bildergalerie (B12): one large still image plus a strip of all nine views
 * (four isometric corners, top view, four façades). The cutaway slider keeps
 * only layers up to a chosen Y, so interiors become visible in every view.
 * "Bild speichern" downloads the current view as PNG in high resolution.
 */
export function ShotGallery({ payload, cacheKey, name }: { payload: VoxelPayload; cacheKey: string; name: string }) {
  const [view, setView] = useState<ShotView>('so');
  const index = useMemo(() => layerIndex(payload), [payload]);
  const built = index.ys.filter(v => (index.byY.get(v)?.length ?? 0) > 0);
  const top = built.at(-1) ?? 0, bottom = built[0] ?? 0;
  const [cut, setCut] = useState<number | null>(null);
  const cutY = cut === null ? undefined : Math.max(bottom, Math.min(top, cut));
  const info = SHOTS.find(s => s.id === view)!;
  const save = () => {
    const url = shotUrl(cacheKey, payload, 1600, 1100, { view, ...(cutY !== undefined && { cutY }), padding: 0.05 });
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = shotFileName(name, view, cutY); document.body.append(a); a.click(); a.remove();
  };
  return <div className="shot-gallery">
    <figure className="shot-main">
      <Thumb cacheKey={cacheKey} payload={() => payload} view={view} cutY={cutY} eager alt={`${name}: ${info.title}${cutY !== undefined ? `, Schnitt bei Y ${cutY}` : ''}`} width={760} height={500} className="thumb shot-big" />
      <figcaption>{info.title}{cutY !== undefined && <> · Schnitt bei Y {cutY}</>}</figcaption>
    </figure>
    <div className="shot-strip" role="group" aria-label="Blickwinkel">
      {SHOTS.map(s => <button key={s.id} type="button" aria-pressed={view === s.id} title={s.title} aria-label={s.title} onClick={() => setView(s.id)}>
        <Thumb cacheKey={cacheKey} payload={() => payload} view={s.id} cutY={cutY} eager alt="" width={104} height={72} className="thumb mini" />
        <span>{s.label}</span></button>)}
    </div>
    <div className="shot-tools">
      <label className="check"><input type="checkbox" checked={cut !== null} onChange={e => setCut(e.target.checked ? Math.max(bottom, top - 1) : null)} /> Schnitt</label>
      {cut !== null && <label className="layer-slider">bis Y {cutY}<input type="range" min={bottom} max={top} value={cutY} aria-label="Schnitthöhe (Y)" onChange={e => setCut(Number(e.target.value))} /></label>}
      <button type="button" onClick={save}>⤓ Bild speichern</button>
    </div>
  </div>;
}
