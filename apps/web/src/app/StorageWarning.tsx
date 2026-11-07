import { useEffect, useState } from 'react';
import { useApp } from './context';
import type { StorageInfo } from './repository';
import '../styles/privacy.css';

const HIDE_KEY = 'bauplaner.speicherwarnung.aus';
/** Anteil des Kontingents, ab dem der Speicher als knapp gilt. */
export const FULL_SHARE = 0.8;

/** PRIV-01: was am Speicher dieses Browsers riskant ist (leer: nichts zu melden). */
export function storageRisk(info: StorageInfo, kind: 'indexeddb' | 'memory'): { level: 'full' | 'evictable' | 'session'; text: string } | null {
  if (kind === 'memory') return { level: 'session', text: 'Dieser Browser erlaubt keinen dauerhaften Speicher (z. B. privates Fenster). Alles ist nach dem Schließen weg – bitte Sicherungsdateien herunterladen.' };
  if (info.usage !== undefined && info.quota && info.usage / info.quota >= FULL_SHARE)
    return { level: 'full', text: `Speicher fast voll: ${Math.round(100 * info.usage / info.quota)} % des Platzes für diese Seite belegt. Neue Änderungen können scheitern – jetzt eine Sicherungsdatei herunterladen und Unbenutztes löschen.` };
  if (info.persisted === false) return { level: 'evictable', text: 'Der Browser darf diese Daten bei Platzmangel löschen. „Dauerhaft speichern“ verhindert das; eine Sicherungsdatei schützt zusätzlich vor Geräteverlust.' };
  return null;
}

const SHORT = { full: 'Speicher fast voll', evictable: 'Speicher nicht geschützt', session: 'nur in dieser Sitzung' } as const;

/**
 * Speicherwarnung direkt am Projekt: nicht dauerhaft geschützt, fast voll oder nur Sitzungsspeicher. Ein kleiner
 * Knopf im Projektkopf (kein Block über der Arbeitsfläche); aufgeklappt Erklärung und „Dauerhaft speichern anfragen“
 * (navigator.storage.persist). Die schwächste Stufe lässt sich für die Sitzung ausblenden.
 */
export function StorageWarning() {
  const { repo } = useApp();
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(HIDE_KEY) === '1'; } catch { return false; } });
  const [note, setNote] = useState('');
  useEffect(() => { let on = true; void repo.storageInfo().then(i => { if (on) setInfo(i); }).catch(() => undefined); return () => { on = false; }; }, [repo]);
  const risk = info ? storageRisk(info, repo.kind) : null;
  if (!risk || (hidden && risk.level === 'evictable')) return null;
  const persist = async () => {
    const granted = await repo.requestPersistence();
    const next = await repo.storageInfo().catch(() => ({}));
    setNote(granted ? 'Der Browser hält die Daten jetzt dauerhaft vor.' : 'Der Browser hat dauerhaftes Speichern nicht gewährt (Chrome entscheidet nach Nutzung, Lesezeichen oder installierter App). Sicherungsdateien bleiben wichtig.');
    if (granted) setInfo(next);
  };
  return <details className={`storage-warning ${risk.level}`} data-storage-risk={risk.level}>
    <summary title={risk.text}>⚠ {SHORT[risk.level]}</summary>
    <div className="storage-warning-body" role="note">
      <p>{risk.text}</p>
      {note && <p className="muted" role="status">{note}</p>}
      <div className="button-row">
        {risk.level === 'evictable' && <button type="button" className="secondary" onClick={() => void persist()}>Dauerhaft speichern anfragen</button>}
        <a className="secondary button-link" href="#/">Zur Sicherung</a>
        <a href="#/datenschutz">Mehr zum Speicher</a>
        {risk.level === 'evictable' && <button type="button" className="text-button" onClick={() => { setHidden(true); try { sessionStorage.setItem(HIDE_KEY, '1'); } catch { /* ignore */ } }}>Ausblenden</button>}
      </div>
    </div>
  </details>;
}
