import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { errorReport, logError } from './errorLog';
import type { LoggedError } from './errorLog';

interface State { readonly error: LoggedError | null; readonly copied: boolean }

/**
 * Catches a crashing page (S-01) so one broken view never blanks the whole
 * app. Stored data is untouched: IndexedDB writes are atomic, so a render
 * crash cannot leave half-written records.
 */
interface Props {
  readonly children: ReactNode;
  /** Changing it (e.g. navigating) clears the error without remounting healthy pages, so their state survives. */
  readonly resetKey: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copied: false };

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null, copied: false });
  }

  static getDerivedStateFromError(): Partial<State> { return {}; }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const detail = [error.stack?.split('\n').slice(0, 6).join('\n'), info.componentStack?.trim().split('\n').slice(0, 6).join('\n')].filter(Boolean).join('\n');
    this.setState({ error: logError('render', error, detail), copied: false });
  }

  private copy = async () => {
    if (!this.state.error) return;
    try { await navigator.clipboard.writeText(errorReport([this.state.error])); this.setState({ copied: true }); }
    catch { this.setState({ copied: false }); }
  };

  render(): ReactNode {
    const { error, copied } = this.state;
    if (!error) return this.props.children;
    return <div className="page"><section className="notice warning crash" role="alert">
      <strong>Diese Seite ist auf einen Fehler gestoßen.</strong>
      <p>Deine gespeicherten Projekte und Bauteile sind nicht betroffen – Speichervorgänge laufen vollständig oder gar nicht.</p>
      <p className="crash-message"><code>{error.message}</code></p>
      <div className="crash-actions">
        <button className="primary" onClick={() => this.setState({ error: null, copied: false })}>Erneut versuchen</button>
        <button onClick={() => location.reload()}>Seite neu laden</button>
        <a className="button" href="#/">Zur Projektzentrale</a>
        <button onClick={() => void this.copy()}>{copied ? 'Bericht kopiert ✓' : 'Fehlerbericht kopieren'}</button>
        <a className="button" href="#/system">Systemcheck</a>
      </div>
    </section></div>;
  }
}
