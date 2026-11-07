import { useState } from 'react';
import type { ReactNode } from 'react';

const KEY = 'bauplaner.inspektor.zu.v1';
const closedSet = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]); } catch { return new Set(); } };

/**
 * Abschnitt im Inspektor (UX-02): Bauteil, Koordinaten, Ausrichtung und Anschlüsse stehen gebündelt
 * untereinander und lassen sich einzeln zuklappen; zugeklappte Abschnitte merkt sich der Browser.
 */
export function InspectorSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(() => !closedSet().has(id));
  return <details className="inspector-section" data-section={id} open={open}
    onToggle={e => {
      const now = (e.currentTarget as HTMLDetailsElement).open; if (now === open) return;
      setOpen(now);
      const set = closedSet(); if (now) set.delete(id); else set.add(id);
      try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* ohne Speicher */ }
    }}>
    <summary>{title}</summary>
    <div className="inspector-section-body">{children}</div>
  </details>;
}
