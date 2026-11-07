import { dataFlow } from './dataFlows';
import type { DataFlowId } from './dataFlows';
import '../styles/privacy.css';

/**
 * PRIV-01: an jeder Freigabe steht, was übertragen wird, wohin und wer es sehen kann. Die Texte kommen aus
 * dataFlows.ts, damit Hinweis und Seite „Datenschutz und Freigaben“ nie auseinanderlaufen.
 * `extra` ergänzt eine Zeile für den konkreten Fall (z. B. die eingetragene Raumadresse).
 */
export function ShareNote({ flow, extra, open }: { flow: DataFlowId; extra?: string | undefined; open?: boolean }) {
  const f = dataFlow(flow);
  return <details className="share-note" data-flow={flow} open={open}>
    <summary><span className="share-note-icon" aria-hidden="true">{f.online ? '⇅' : '⌂'}</span> {f.online ? 'Geht ins Internet' : 'Bleibt auf diesem Gerät'}: {f.title} – was, wohin, wer sieht es?</summary>
    <dl>
      <div><dt>Was</dt><dd>{f.what}</dd></div>
      <div><dt>Wohin</dt><dd>{f.where}{extra ? ` ${extra}` : ''}</dd></div>
      <div><dt>Wer sieht es</dt><dd>{f.who}</dd></div>
      <div><dt>Wie lange</dt><dd>{f.keep}</dd></div>
      <div><dt>Zurücknehmen</dt><dd>{f.stop}</dd></div>
    </dl>
    <a href={`#/datenschutz`} className="small">Alle Datenwege ansehen</a>
  </details>;
}
