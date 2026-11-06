import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import './more.css';

/**
 * UX-01: eingeklappter Bereich für Experten-Optionen, Hintergrundwissen und Datei-Notfallwege.
 * Die Hauptaktion einer Seite bleibt sichtbar, alles Weitere steht hier mit einem kurzen Satz,
 * was man darin findet. `open` klappt den Bereich auf, sobald es wahr wird (z. B. Sicherung fällig),
 * schließt ihn aber nie von selbst – sonst verschwände er mitten in der Benutzung.
 */
export function More({ title, hint, children, className, open }: { title: string; hint?: string | undefined; children: ReactNode; className?: string; open?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (open && ref.current) ref.current.open = true; }, [open]);
  return <details ref={ref} className={`more${className ? ` ${className}` : ''}`}>
    <summary><span className="more-title">{title}</span>{hint && <span className="more-hint">{hint}</span>}</summary>
    <div className="more-body">{children}</div>
  </details>;
}
