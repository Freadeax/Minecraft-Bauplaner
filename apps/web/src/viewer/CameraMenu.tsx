import { useEffect, useRef, useState } from 'react';
import { loadCameras, nextCameraName, storeCameras, withCamera } from './viewTools';
import type { SavedCamera } from './viewTools';

/**
 * „Kameras“ in der Werkzeugleiste der 3D-Ansicht (UX-02): aktuelle Ansicht unter einem Namen merken und
 * später mit einem Klick wieder einnehmen. Gespeichert je Ziel (`cameraKey`, z. B. Projekt) in diesem Browser.
 */
export function CameraMenu({ cameraKey, pose, apply }: {
  cameraKey: string;
  pose: () => Omit<SavedCamera, 'name'> | null;
  apply: (cam: SavedCamera) => void;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(() => loadCameras(cameraKey));
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { setList(loadCameras(cameraKey)); }, [cameraKey]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', close); const el = box.current; el?.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', close); el?.removeEventListener('keydown', key); };
  }, [open]);
  const save = () => {
    const p = pose();
    if (!p) { setNote('Im Flug oder vor dem ersten Bild lässt sich keine Ansicht merken.'); return; }
    const next = withCamera(list, { ...p, name: name.trim().slice(0, 60) || nextCameraName(list) });
    setList(next); setName('');
    setNote(storeCameras(cameraKey, next) ? '' : 'Dieser Browser speichert nichts – die Ansicht gilt nur bis zum Neuladen.');
  };
  const remove = (cam: SavedCamera) => { const next = list.filter(c => c.name !== cam.name); setList(next); storeCameras(cameraKey, next); };
  return <div className="gfx-menu camera-menu" ref={box}>
    <button type="button" aria-expanded={open} aria-haspopup="dialog" title="Gespeicherte Kameras" onClick={() => setOpen(!open)}>⌖ <span>Kameras{list.length ? ` (${list.length})` : ''}</span></button>
    {open && <div className="gfx-panel camera-panel" role="dialog" aria-label="Gespeicherte Kameras">
      {list.length ? <ul className="camera-list">{list.map(c => <li key={c.name}>
        <button type="button" onClick={() => { apply(c); setOpen(false); }} title={`Blick von ${c.eye.map(Math.round).join(' / ')}`}>{c.name}</button>
        <button type="button" className="camera-remove" aria-label={`${c.name} löschen`} onClick={() => remove(c)}>✕</button></li>)}</ul>
        : <p className="gfx-note">Noch keine Ansicht gemerkt.</p>}
      <form className="camera-save" onSubmit={e => { e.preventDefault(); save(); }}>
        <input value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder={nextCameraName(list)} aria-label="Name der Ansicht" />
        <button type="submit">Aktuelle Ansicht merken</button>
      </form>
      {note && <p className="gfx-note" role="status">{note}</p>}
    </div>}
  </div>;
}
