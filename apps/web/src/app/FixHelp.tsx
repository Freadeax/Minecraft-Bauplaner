import './fixHelp.css';
import { FIX_HELP } from './fixHelpText';
import type { FixTopic } from './fixHelpText';
export type { FixTopic } from './fixHelpText';

/**
 * UX-02: Hilfe direkt am Fehler. Statt nur zu melden, was schiefging, sagt ein kurzer Aufklapper „Was tun?“
 * in zwei, drei Sätzen, wie man weiterkommt, und verlinkt bei Bedarf den passenden Teil der Anleitung.
 * Texte liegen hier zentral, damit dieselbe Meldung überall gleich erklärt wird.
 */

export function FixHelp({ topic }: { topic: FixTopic }) {
  const h: { title: string; steps: readonly string[]; guide?: string } = FIX_HELP[topic];
  return <details className="fix-help" data-fix={topic}>
    <summary>Was tun?</summary>
    <div><strong>{h.title}</strong><ol>{h.steps.map(s => <li key={s}>{s}</li>)}</ol>
      {h.guide && <a href={h.guide}>In der Anleitung zeigen →</a>}</div>
  </details>;
}
