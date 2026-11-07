import { useEffect, useRef, useState } from 'react';
import { navigate } from '../../app/router';
import type { ProjectTabId } from './tabNames';
import './tour.css';

/**
 * UX-02: kurze geführte Tour durch das Beispielprojekt „Burgmauer“. Acht Schritte vom Entwurf bis zum
 * nächsten Bauabschnitt; jeder Schritt öffnet seinen Reiter, hebt die gemeinte Fläche hervor und sagt in
 * einem Satz, was man dort tut. Die Tour blockiert nichts (kein modaler Dialog), merkt sich den Schritt im
 * Browser und lässt sich jederzeit mit „Tour beenden“ oder Esc schließen.
 */
export interface TourStep { readonly tab: ProjectTabId; readonly targets: readonly string[]; readonly title: string; readonly text: string }

export const TOUR_STEPS: readonly TourStep[] = [
  { tab: 'editor', targets: ['.editor-tree'], title: 'Bauteile', text: 'Links stehen die Bauteile deines Projekts; darunter fügst du neue aus der Bibliothek ein.' },
  { tab: 'editor', targets: ['.viewport'], title: '3D-Bild', text: 'Ziehen dreht, Scrollen zoomt; oben findest du Schnitt, Geistermodus, Kameras und Vollbild.' },
  { tab: 'editor', targets: ['.inspector'], title: 'Inspektor', text: 'Wähle ein Bauteil: Position, Ausrichtung und Anschlüsse stehen dann gebündelt rechts.' },
  { tab: 'editor', targets: ['section.report'], title: 'Konflikte', text: 'Der Bericht unter dem Bild zeigt, ob sich Blöcke überschneiden, und führt mit einem Klick hin.' },
  { tab: 'bauen', targets: ['section.build', '.project-page > section:not(.notice)'], title: 'Bauen', text: 'Hier baust du Schicht für Schicht nach und hakst ab, was im Spiel steht.' },
  { tab: 'material', targets: ['section.materials', '.project-page > section:not(.notice)'], title: 'Material', text: 'Die Materialliste zählt Blöcke, Stacks, Kisten und Rohstoffe für das ganze Projekt.' },
  { tab: 'uebersicht', targets: ['.overview'], title: 'Übersicht', text: 'Die Übersicht zeigt den letzten Stand, alles Offene und den nächsten Bauabschnitt.' },
  { tab: 'uebersicht', targets: ['.view-group[data-group=verwalten]'], title: 'Verwalten', text: 'Unter „Verwalten“ lädst du Freunde ein, planst Termine und exportierst – viel Spaß beim Bauen!' },
];

const KEY = 'bauplaner.tour.v1';
interface TourState { readonly projectId: string; readonly step: number }
function readTour(): TourState | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TourState | null; return v && typeof v.projectId === 'string' && Number.isInteger(v.step) ? v : null; } catch { return null; }
}
function writeTour(state: TourState | null): void {
  try { if (state) localStorage.setItem(KEY, JSON.stringify(state)); else localStorage.removeItem(KEY); } catch { /* ohne Speicher endet die Tour mit dem Neuladen */ }
  window.dispatchEvent(new Event('bauplaner-tour'));
}
/** Startet die Tour für ein Projekt (Startseite: „Beispiel mit Tour“). */
export function startTour(projectId: string): void { writeTour({ projectId, step: 0 }); }

export function Tour({ projectId, tab }: { projectId: string; tab: string }) {
  const [state, setState] = useState(readTour);
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => { const on = () => setState(readTour()); window.addEventListener('bauplaner-tour', on); return () => window.removeEventListener('bauplaner-tour', on); }, []);
  const step = state && state.projectId === projectId ? TOUR_STEPS[state.step] : undefined;
  const index = state?.step ?? 0;
  // Ziel hervorheben, sobald der (nachgeladene) Reiter es zeigt.
  useEffect(() => {
    if (!step || step.tab !== tab) return;
    let el: Element | null = null, tries = 0, timer = 0;
    const find = () => {
      el = step.targets.map(t => document.querySelector(t)).find(Boolean) ?? null;
      if (el) { el.classList.add('tour-spot'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      else if (tries++ < 40) timer = window.setTimeout(find, 100);
    };
    find();
    return () => { window.clearTimeout(timer); el?.classList.remove('tour-spot'); };
  }, [step, tab]);
  useEffect(() => { if (step) card.current?.focus({ preventScroll: true }); }, [index, !!step]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!step) return null;
  const go = (n: number) => {
    if (n < 0 || n >= TOUR_STEPS.length) { writeTour(null); return; }
    writeTour({ projectId, step: n });
    if (TOUR_STEPS[n]!.tab !== tab) navigate({ view: 'project', projectId, tab: TOUR_STEPS[n]!.tab });
  };
  const wrongTab = step.tab !== tab;
  return <div className="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-title" tabIndex={-1} ref={card} data-tour-step={index + 1}
    onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); go(-1); } }}>
    <span className="panel-kicker">TOUR · {index + 1} / {TOUR_STEPS.length}</span>
    <strong id="tour-title">{step.title}</strong>
    <p>{step.text}</p>
    <div className="button-row">
      {wrongTab ? <button className="primary" onClick={() => go(index)}>Hierher zurück</button> : <>
        <button onClick={() => go(index - 1)} disabled={index === 0}>Zurück</button>
        <button className="primary" onClick={() => go(index + 1)}>{index + 1 === TOUR_STEPS.length ? 'Fertig' : 'Weiter'}</button></>}
      <button className="text-button" onClick={() => go(-1)}>Tour beenden</button>
    </div>
  </div>;
}
