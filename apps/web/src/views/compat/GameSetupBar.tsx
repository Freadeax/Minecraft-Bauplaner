import { GAME_LOADER_LABEL, GAME_VERSIONS, PASTE_TOOL_LABEL } from '../../../../../packages/voxel/src/versionCompat.js';
import type { CompatReport, GameLoader, GameSetup, PasteTool } from '../../../../../packages/voxel/src/versionCompat.js';
import './compat.css';

const LEVEL_ICON: Record<CompatReport['level'], string> = { ok: '✓', warn: '!', loss: '✕' };
const LEVEL_TEXT: Record<CompatReport['level'], string> = { ok: 'Passt', warn: 'Mit Hinweisen', loss: 'Verluste' };

/** Selectors for „Mein Spiel“ (COMPAT-01). */
export function GameSetupFields({ setup, onChange, tool = true }: { setup: GameSetup; onChange(next: Partial<GameSetup>): void; tool?: boolean }) {
  return <div className="game-setup-fields">
    <label>Spielversion
      <select value={setup.version} onChange={e => onChange({ version: e.target.value })} aria-label="Version deines Spiels">
        {GAME_VERSIONS.map(v => <option key={v.version} value={v.version}>{`Java ${v.version}`}</option>)}
      </select></label>
    <label>Loader / Server
      <select value={setup.loader} onChange={e => onChange({ loader: e.target.value as GameLoader })} aria-label="Loader deines Spiels">
        {(Object.keys(GAME_LOADER_LABEL) as GameLoader[]).map(l => <option key={l} value={l}>{GAME_LOADER_LABEL[l]}</option>)}
      </select></label>
    {tool && <label>Einfügen mit
      <select value={setup.tool} onChange={e => onChange({ tool: e.target.value as PasteTool })} aria-label="Einfügewerkzeug">
        {(Object.keys(PASTE_TOOL_LABEL) as PasteTool[]).map(t => <option key={t} value={t}>{PASTE_TOOL_LABEL[t]}</option>)}
      </select></label>}
  </div>;
}

/** One status line plus the details: what reaches the chosen game, what is lost and what needs mods. */
export function CompatStatus({ report, compact = false }: { report: Pick<CompatReport, 'level' | 'headline' | 'issues'>; compact?: boolean }) {
  const shown = report.issues.filter(i => !compact || i.severity !== 'info');
  return <div className={`compat-status level-${report.level}`} data-compat={report.level} role="status" aria-label="Kompatibilität mit deinem Spiel">
    <p className="compat-headline"><span className="compat-icon" aria-hidden="true">{LEVEL_ICON[report.level]}</span>
      <strong>{LEVEL_TEXT[report.level]}</strong> <span>{report.headline}</span></p>
    {shown.length > 0 && (compact
      ? <details className="compat-details"><summary>Was genau?</summary><IssueList report={report} compact /></details>
      : <IssueList report={report} />)}
  </div>;
}

function IssueList({ report, compact = false }: { report: Pick<CompatReport, 'issues'>; compact?: boolean }) {
  return <ul className="compat-issues">{report.issues.filter(i => !compact || i.severity !== 'info').map((i, n) =>
    <li key={n} data-kind={i.kind} data-severity={i.severity}>{i.message}</li>)}</ul>;
}
